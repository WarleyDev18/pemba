import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import AdminLayout from '../../components/AdminLayout'
import styles from './ChatConversa.module.css'

export default function AdminChatConversa() {
  const { conversa_id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [info, setInfo] = useState(null)
  const [mensagens, setMensagens] = useState([])
  const [texto, setTexto] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (conversa_id) carregar()
  }, [conversa_id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function carregar() {
    setCarregando(true)

    const [{ data: conv }, { data: msgs }] = await Promise.all([
      supabase
        .from('vw_conversas_admin')
        .select('*')
        .eq('id', conversa_id)
        .single(),
      supabase
        .from('mensagens')
        .select('*')
        .eq('conversa_id', conversa_id)
        .order('criado_em', { ascending: true }),
    ])

    setInfo(conv)
    setMensagens(msgs ?? [])
    await supabase.rpc('fn_marcar_lidas_admin', { p_conversa_id: conversa_id })
    setCarregando(false)
  }

  useEffect(() => {
    if (!conversa_id) return

    const channel = supabase
      .channel(`admin-chat-${conversa_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `conversa_id=eq.${conversa_id}` },
        (payload) => {
          setMensagens(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
          supabase.rpc('fn_marcar_lidas_admin', { p_conversa_id: conversa_id })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversa_id])

  async function enviar(e) {
    e.preventDefault()
    if (!texto.trim() || enviando) return

    const conteudo = texto.trim()
    setTexto('')
    setEnviando(true)

    await supabase.from('mensagens').insert({
      conversa_id: conversa_id,
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
    <AdminLayout>
      <div className={styles.container}>
        <div className={styles.chatHeader}>
          <button onClick={() => navigate('/admin/chat')} className={styles.btnVoltar}>← Conversas</button>
          {info && (
            <div className={styles.headerInfo}>
              <span className={styles.headerNome}>{info.nome ?? info.email}</span>
              {info.email && info.nome && <span className={styles.headerEmail}>{info.email}</span>}
            </div>
          )}
        </div>

        <div className={styles.chatArea}>
          {carregando ? (
            <p className={styles.info}>Carregando...</p>
          ) : mensagens.length === 0 ? (
            <p className={styles.info}>Nenhuma mensagem ainda.</p>
          ) : (
            mensagens.map(m => {
              const minha = m.remetente_id === user.id
              return (
                <div key={m.id} className={`${styles.msgRow} ${minha ? styles.msgRowMinha : ''}`}>
                  <div className={`${styles.bubble} ${minha ? styles.bubbleMinha : styles.bubbleUser}`}>
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
            placeholder="Digite sua resposta... (Enter para enviar)"
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
    </AdminLayout>
  )
}
