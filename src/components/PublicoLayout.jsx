import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import styles from './PublicoLayout.module.css'

const LINKS_BASE = [
  { to: '/dashboard', label: 'Início', exact: true },
  { to: '/dashboard/agendamentos', label: 'Agendamentos' },
  { to: '/dashboard/ebos', label: 'Ebós' },
  { to: '/dashboard/eventos', label: 'Calendário' },
  { to: '/dashboard/comunicados', label: 'Comunicados' },
  { to: '/dashboard/chat', label: 'Chat' },
  { to: '/dashboard/doacao', label: 'Doações' },
]

const OpaxoroLogo = () => (
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
)

export default function PublicoLayout({ children }) {
  const { user, perfil, logout } = useAuth()
  const links = LINKS_BASE.filter(l => !l.somente || l.somente === perfil)
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className={styles.wrapper}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>
            <OpaxoroLogo />
          </div>
          <div className={styles.brandText}>
            <span className={styles.brandName}>Pemba</span>
            <span className={styles.brandSub}>terreiro</span>
          </div>
        </div>

        <nav className={styles.nav}>
          {links.map(({ to, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `${styles.link} ${isActive ? styles.linkActive : ''}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.footer}>
          <span className={styles.email}>{user?.email}</span>
          <button onClick={handleLogout} className={styles.sair}>Sair</button>
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  )
}
