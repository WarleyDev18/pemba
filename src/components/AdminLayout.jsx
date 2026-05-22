import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import styles from './AdminLayout.module.css'

const links = [
  { to: '/admin', label: 'Início', exact: true },
  { to: '/admin/comunicados', label: 'Comunicados' },
  { to: '/admin/eventos', label: 'Eventos' },
  { to: '/admin/agendamentos', label: 'Agendamentos' },
  { to: '/admin/financeiro', label: 'Financeiro' },
  { to: '/admin/chat', label: 'Chat', badge: true },
  { to: '/admin/doacoes', label: 'Doações' },
  { to: '/admin/usuarios', label: 'Usuários' },
]

function dataAmanha() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [badgeChat, setBadgeChat] = useState(0)
  const [ebosAmanha, setEbosAmanha] = useState([])
  const [alertaDispensado, setAlertaDispensado] = useState(() => {
    return localStorage.getItem('alerta-ebo-data') === new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchBadge()
    fetchEbosAmanha()

    const channel = supabase
      .channel('admin-badge-conversas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversas' }, fetchBadge)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agendamentos' }, fetchEbosAmanha)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchBadge() {
    const { data } = await supabase.from('conversas').select('nao_lidas_admin')
    const total = data?.reduce((s, c) => s + (c.nao_lidas_admin ?? 0), 0) ?? 0
    setBadgeChat(total)
  }

  async function fetchEbosAmanha() {
    const { data } = await supabase
      .from('agendamentos')
      .select('id, horario, usuarios(nome)')
      .eq('tipo', 'Limpeza Espiritual')
      .eq('data', dataAmanha())
      .neq('status', 'cancelado')
      .neq('status', 'realizado')
      .order('horario')
    setEbosAmanha(data ?? [])
  }

  function dispensarAlerta() {
    const hoje = new Date().toISOString().split('T')[0]
    localStorage.setItem('alerta-ebo-data', hoje)
    setAlertaDispensado(true)
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className={styles.wrapper}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>
            <svg width="20" height="20" viewBox="0 0 30 30" aria-hidden="true">
              <rect x="11" y="1" width="8" height="26" rx="4" fill="#B8B8C0"/>
              <ellipse cx="15" cy="1" rx="11" ry="3.5" fill="#D0D0D8"/>
              <path d="M15,0 Q7,-4 3,0 Q8,3.5 11,3 Q15,3 15,0Z" fill="#D8D8E0"/>
              <path d="M15,0 Q23,-4 27,0 Q22,3.5 19,3 Q15,3 15,0Z" fill="#D8D8E0"/>
              <circle cx="15" cy="0" r="4" fill="#EBEBF4"/>
              <ellipse cx="15" cy="11" rx="7" ry="2.5" fill="#D0D0D8"/>
              <ellipse cx="15" cy="18" rx="9" ry="3" fill="#C8C8D0"/>
              <circle cx="15" cy="7" r="2.5" fill="#E0E0E8"/>
              <circle cx="15" cy="14.5" r="2.5" fill="#E0E0E8"/>
              <ellipse cx="15" cy="27" rx="11" ry="4" fill="#C0C0C8"/>
            </svg>
          </div>
          <div className={styles.brandText}>
            <span className={styles.brandName}>Pemba</span>
            <span className={styles.brandSub}>painel admin</span>
          </div>
        </div>

        <nav className={styles.nav}>
          {links.map(({ to, label, exact, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `${styles.link} ${isActive ? styles.linkActive : ''}`
              }
            >
              {label}
              {badge && badgeChat > 0 && (
                <span className={styles.chatBadge}>{badgeChat}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {!alertaDispensado && ebosAmanha.length > 0 && (
          <div className={styles.alerta}>
            <div className={styles.alertaHeader}>
              <span className={styles.alertaTitulo}>Limpeza Espiritual amanhã</span>
              <button onClick={dispensarAlerta} className={styles.alertaFechar} title="Dispensar">×</button>
            </div>
            {ebosAmanha.map(a => (
              <div key={a.id} className={styles.alertaItem}>
                {a.horario?.slice(0, 5)} — {a.usuarios?.nome ?? 'Cliente'}
              </div>
            ))}
          </div>
        )}

        <div className={styles.footer}>
          <span className={styles.email}>{user?.email}</span>
          <button onClick={handleLogout} className={styles.sair}>Sair</button>
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  )
}
