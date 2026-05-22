import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/AdminLayout'
import styles from './ChatLista.module.css'

export default function AdminChatLista() {
  const [conversas, setConversas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    carregar()

    const channel = supabase
      .channel('admin-chat-lista')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversas' }, carregar)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function carregar() {
    const { data } = await supabase
      .from('vw_conversas_admin')
      .select('*')
      .order('ultima_at', { ascending: false, nullsFirst: false })
    setConversas(data ?? [])
    setCarregando(false)
  }

  function formatarData(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    const hoje = new Date()
    const mesmodia = d.toDateString() === hoje.toDateString()
    if (mesmodia) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  return (
    <AdminLayout>
      <h1 className={styles.titulo}>Chat</h1>

      {carregando ? (
        <p className={styles.info}>Carregando...</p>
      ) : conversas.length === 0 ? (
        <p className={styles.info}>Nenhuma conversa ainda.</p>
      ) : (
        <div className={styles.lista}>
          {conversas.map(c => (
            <button
              key={c.id}
              onClick={() => navigate(`/admin/chat/${c.id}`)}
              className={`${styles.card} ${c.nao_lidas_admin > 0 ? styles.cardNaoLido : ''}`}
            >
              <div className={styles.avatar}>
                {(c.nome ?? c.email ?? '?')[0].toUpperCase()}
              </div>

              <div className={styles.cardCorpo}>
                <div className={styles.cardTopo}>
                  <span className={styles.cardNome}>{c.nome ?? c.email}</span>
                  <span className={styles.cardHora}>{formatarData(c.ultima_at)}</span>
                </div>
                <div className={styles.cardRodape}>
                  <span className={styles.cardPreview}>
                    {c.ultima_mensagem ?? 'Nenhuma mensagem ainda'}
                  </span>
                  {c.nao_lidas_admin > 0 && (
                    <span className={styles.badge}>{c.nao_lidas_admin}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}
