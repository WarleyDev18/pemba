import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/AdminLayout'
import styles from './Dashboard.module.css'

const MODULOS = [
  { label: 'Comunicados', desc: 'Publique avisos para os filhos de santo.', rota: '/admin/comunicados' },
  { label: 'Eventos', desc: 'Giras e festividades do terreiro.', rota: '/admin/eventos' },
  { label: 'Agendamentos', desc: 'Gerencie os agendamentos.', rota: '/admin/agendamentos' },
  { label: 'Financeiro', desc: 'Acompanhe pagamentos e confirmações.', rota: '/admin/financeiro' },
  { label: 'Chat', desc: 'Converse com os filhos de santo.', rota: '/admin/chat' },
  { label: 'Doações', desc: 'Acompanhe as doações recebidas.', rota: '/admin/doacoes' },
  { label: 'Usuários', desc: 'Gerencie perfis de acesso.', rota: '/admin/usuarios' },
]

const COR_STATUS = {
  pendente:   { bg: '#FEF9EE', cor: '#8B6914', label: 'Pendente' },
  confirmado: { bg: '#EEF7EE', cor: '#1B5E20', label: 'Confirmado' },
  realizado:  { bg: '#FDF5DC', cor: '#5C4800', label: 'Realizado' },
  cancelado:  { bg: '#FEF0EE', cor: '#8B1A1A', label: 'Cancelado' },
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [carregando, setCarregando] = useState(true)
  const [stats, setStats] = useState({ pendentes: 0, hoje: 0, chat: 0 })
  const [agendamentosHoje, setAgendamentosHoje] = useState([])
  const [ebosAmanha, setEbosAmanha] = useState([])

  const hoje = new Date().toISOString().split('T')[0]
  const amanha = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] })()

  useEffect(() => {
    Promise.all([
      supabase.from('agendamentos').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
      supabase.from('agendamentos').select('*', { count: 'exact', head: true }).eq('data', hoje),
      supabase.from('conversas').select('nao_lidas_admin'),
      supabase.from('agendamentos').select('id, horario, tipo, status, usuarios(nome)')
        .eq('data', hoje).neq('status', 'cancelado').order('horario'),
      supabase.from('agendamentos').select('id, horario, usuarios(nome)')
        .eq('tipo', 'Limpeza Espiritual').eq('data', amanha)
        .neq('status', 'cancelado').neq('status', 'realizado').order('horario'),
    ]).then(([p, h, c, ag, eb]) => {
      const chatTotal = c.data?.reduce((s, x) => s + (x.nao_lidas_admin ?? 0), 0) ?? 0
      setStats({ pendentes: p.count ?? 0, hoje: h.count ?? 0, chat: chatTotal })
      setAgendamentosHoje(ag.data ?? [])
      setEbosAmanha(eb.data ?? [])
      setCarregando(false)
    })
  }, [])

  const dataExtenso = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <AdminLayout>
      <div className={styles.header}>
        <h1 className={styles.titulo}>Início</h1>
        <span className={styles.data}>{dataExtenso}</span>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <button onClick={() => navigate('/admin/agendamentos')} className={styles.stat}>
          <span className={styles.statNum}>{carregando ? '—' : stats.pendentes}</span>
          <span className={styles.statLabel}>Agendamentos pendentes</span>
        </button>
        <button onClick={() => navigate('/admin/agendamentos')} className={styles.stat}>
          <span className={styles.statNum}>{carregando ? '—' : stats.hoje}</span>
          <span className={styles.statLabel}>Agendamentos hoje</span>
        </button>
        <button onClick={() => navigate('/admin/chat')} className={`${styles.stat} ${!carregando && stats.chat > 0 ? styles.statAlerta : ''}`}>
          <span className={styles.statNum}>{carregando ? '—' : stats.chat}</span>
          <span className={styles.statLabel}>Mensagens não lidas</span>
        </button>
      </div>

      {/* Agenda de hoje */}
      {!carregando && (
        <div className={styles.secao}>
          <h2 className={styles.secaoTitulo}>Agenda de hoje</h2>
          {agendamentosHoje.length === 0 ? (
            <p className={styles.vazio}>Nenhum agendamento para hoje.</p>
          ) : (
            <div className={styles.agendaLista}>
              {agendamentosHoje.map(ag => (
                <div key={ag.id} className={styles.agendaItem}>
                  <span className={styles.agendaHora}>{ag.horario?.slice(0, 5) ?? '--:--'}</span>
                  <div className={styles.agendaInfo}>
                    <span className={styles.agendaNome}>{ag.usuarios?.nome ?? 'Cliente'}</span>
                    <span className={styles.agendaTipo}>{ag.tipo}</span>
                  </div>
                  <span
                    className={styles.agendaStatus}
                    style={{ background: COR_STATUS[ag.status]?.bg, color: COR_STATUS[ag.status]?.cor }}
                  >
                    {COR_STATUS[ag.status]?.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Limpeza Espiritual amanhã */}
      {!carregando && ebosAmanha.length > 0 && (
        <div className={styles.secao}>
          <h2 className={`${styles.secaoTitulo} ${styles.secaoAlerta}`}>Limpeza Espiritual amanhã</h2>
          <div className={styles.agendaLista}>
            {ebosAmanha.map(ag => (
              <div key={ag.id} className={`${styles.agendaItem} ${styles.agendaItemAlerta}`}>
                <span className={styles.agendaHora}>{ag.horario?.slice(0, 5) ?? '--:--'}</span>
                <span className={styles.agendaNome}>{ag.usuarios?.nome ?? 'Cliente'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acesso rápido */}
      <div className={styles.secao}>
        <h2 className={styles.secaoTitulo}>Acesso rápido</h2>
        <div className={styles.grid}>
          {MODULOS.map(m => (
            <button key={m.rota} onClick={() => navigate(m.rota)} className={styles.card}>
              <h3>{m.label}</h3>
              <p>{m.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}
