import { useNavigate } from 'react-router-dom'
import PublicoLayout from '../../components/PublicoLayout'
import styles from './Dashboard.module.css'

const modulos = [
  { label: 'Agendamentos', desc: 'Agende uma consulta ou atendimento.', rota: '/dashboard/agendamentos' },
  { label: 'Ebós', desc: 'Solicite e acompanhe seus ebós.', rota: '/dashboard/ebos' },
  { label: 'Calendário', desc: 'Veja as próximas giras e festividades.', rota: '/dashboard/eventos' },
  { label: 'Comunicados', desc: 'Avisos e recados do Pai de Santo.', rota: '/dashboard/comunicados' },
  { label: 'Chat', desc: 'Fale diretamente com o Pai de Santo.', rota: '/dashboard/chat' },
  { label: 'Doações', desc: 'Contribua com o terreiro via PIX ou cartão.', rota: '/dashboard/doacao' },
]

export default function PublicoDashboard() {
  const navigate = useNavigate()

  return (
    <PublicoLayout>
      <h1 className={styles.titulo}>Bem-vindo ao Terreiro</h1>
      <div className={styles.grid}>
        {modulos.map(m => (
          <button key={m.rota} onClick={() => navigate(m.rota)} className={styles.card}>
            <h3>{m.label}</h3>
            <p>{m.desc}</p>
          </button>
        ))}
      </div>
    </PublicoLayout>
  )
}
