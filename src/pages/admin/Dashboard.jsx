import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import styles from './Dashboard.module.css'

const modulos = [
  { label: 'Comunicados', desc: 'Publique avisos para os filhos de santo.', rota: '/admin/comunicados' },
  { label: 'Eventos', desc: 'Giras e festividades do terreiro.', rota: '/admin/eventos' },
  { label: 'Agendamentos', desc: 'Gerencie os agendamentos.', rota: '/admin/agendamentos' },
  { label: 'Ebós', desc: 'Controle os ebós e suas cobranças.', rota: '/admin/ebos' },
  { label: 'Financeiro', desc: 'Acompanhe pagamentos e confirmações.', rota: '/admin/financeiro' },
  { label: 'Chat', desc: 'Converse com os filhos de santo.', rota: '/admin/chat' },
  { label: 'Doações', desc: 'Acompanhe as doações recebidas.', rota: '/admin/doacoes' },
  { label: 'Usuários', desc: 'Gerencie perfis de acesso.', rota: '/admin/usuarios' },
]

export default function AdminDashboard() {
  const navigate = useNavigate()

  return (
    <AdminLayout>
      <h1 className={styles.titulo}>Início</h1>
      <div className={styles.grid}>
        {modulos.map(m => (
          <button key={m.rota} onClick={() => navigate(m.rota)} className={styles.card}>
            <h3>{m.label}</h3>
            <p>{m.desc}</p>
          </button>
        ))}
      </div>
    </AdminLayout>
  )
}
