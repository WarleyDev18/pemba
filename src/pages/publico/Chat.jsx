import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import PublicoLayout from '../../components/PublicoLayout'
import styles from './Chat.module.css'

export default function ChatPublico() {
  const { user } = useAuth()
  const [conversaId, setConversaId] = useState(null)
  const [mensagens, setMensagens] = useState([])
  const [texto, setTexto] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (user) iniciarChat()
  }, [user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function iniciarChat() {
    setCarregando(true)

    let { data: conversa } = await supabase
      .from('conversas')
      .select('id')
      .eq('usuario_id', user.id)
      .single()

    if (!conversa) {
      const { data: nova } = await supabase
        .from('conversas')
        .insert({ usuario_id: user.id })
        .select('id')
        .single()
      conversa = nova
    }

    if (!conversa) { setCarregando(false); return }

    setConversaId(conversa.id)

    const { data } = await supabase
      .from('mensagens')
      .select('*')
      .eq('conversa_id', conversa.id)
      .order('criado_em', { ascending: true })
    setMensagens(data ?? [])

    await supabase.rpc('fn_marcar_lidas_usuario', { p_conversa_id: conversa.id })

    setCarregando(false)
  }

  useEffect(() => {
    if (!conversaId || !user) return

    const channel = supabase
      .channel(`chat-publico-${conversaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `conversa_id=eq.${conversaId}` },
        (payload) => {
          setMensagens(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
          if (payload.new.remetente_id !== user.id) {
            supabase.rpc('fn_marcar_lidas_usuario', { p_conversa_id: conversaId })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversaId, user])

  async function enviar(e) {
    e.preventDefault()
    if (!texto.trim() || !conversaId || enviando) return

    const conteudo = texto.trim()
    setTexto('')
    setEnviando(true)

    await supabase.from('mensagens').insert({
      conversa_id: conversaId,
      remetente_id: user.id,
      conteudo,
    })

    setEnviando(false)
    textareaRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar(e)
    }
  }

  function formatarHora(iso) {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <PublicoLayout>
      <div className={styles.container}>
        <div className={styles.chatHeader}>
          <h1 className={styles.titulo}>Chat com o Pai de Santo</h1>
          <p className={styles.subtitulo}>Tire suas dúvidas e receba orientações</p>
        </div>

        <div className={styles.chatArea}>
          {carregando ? (
            <p className={styles.info}>Carregando...</p>
          ) : mensagens.length === 0 ? (
            <p className={styles.info}>Nenhuma mensagem ainda. Envie uma mensagem para começar.</p>
          ) : (
            mensagens.map(m => {
              const minha = m.remetente_id === user.id
              return (
                <div key={m.id} className={`${styles.msgRow} ${minha ? styles.msgRowMinha : ''}`}>
                  <div className={`${styles.bubble} ${minha ? styles.bubbleMinha : styles.bubbleAdmin}`}>
                    {!minha && <span className={styles.bubbleRemetente}>Pai de Santo</span>}
                    <p className={styles.bubbleTexto}>{m.conteudo}</p>
                    <span className={styles.bubbleHora}>{formatarHora(m.criado_em)}</span>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={enviar} className={styles.inputArea}>
          <textarea
            ref={textareaRef}
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem... (Enter para enviar)"
            rows={2}
            className={styles.input}
            disabled={carregando}
          />
          <button
            type="submit"
            disabled={!texto.trim() || enviando || carregando}
            className={styles.btnEnviar}
          >
            Enviar
          </button>
        </form>
      </div>
    </PublicoLayout>
  )
}
