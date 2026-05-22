import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import PublicoLayout from '../../components/PublicoLayout'
import styles from './Dashboard.module.css'

const MODULOS = [
  { label: 'Agendamentos', desc: 'Agende uma consulta, jogo ou limpeza espiritual.', rota: '/dashboard/agendamentos' },
  { label: 'Calendário', desc: 'Veja as próximas giras e festividades.', rota: '/dashboard/eventos' },
  { label: 'Comunicados', desc: 'Avisos e recados do Pai de Santo.', rota: '/dashboard/comunicados' },
  { label: 'Chat', desc: 'Fale diretamente com o Pai de Santo.', rota: '/dashboard/chat' },
  { label: 'Doações', desc: 'Contribua com o terreiro via PIX ou cartão.', rota: '/dashboard/doacao' },
]

const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

const STATUS_COR = {
  pendente:   '#8B6914',
  confirmado: '#1B5E20',
  realizado:  '#5C4800',
}

function formatarData(data) {
  const [, mes, dia] = data.split('-')
  return `${dia} de ${MESES[parseInt(mes) - 1]}`
}

export default function PublicoDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [proximoAg, setProximoAg] = useState(null)
  const [proximoEv, setProximoEv] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!user) return
    const hoje = new Date().toISOString().split('T')[0]
    Promise.all([
      supabase.from('usuarios').select('nome').eq('id', user.id).single(),
      supabase.from('agendamentos').select('data, horario, tipo, status')
        .eq('usuario_id', user.id).gte('data', hoje)
        .neq('status', 'cancelado').neq('status', 'realizado')
        .order('data').order('horario').limit(1).maybeSingle(),
      supabase.from('eventos').select('data, titulo, tipo, horario')
        .eq('publico', true).gte('data', hoje)
        .order('data').limit(1).maybeSingle(),
    ]).then(([u, ag, ev]) => {
      setNome(u.data?.nome ?? user.email.split('@')[0])
      setProximoAg(ag.data ?? null)
      setProximoEv(ev.data ?? null)
      setCarregando(false)
    })
  }, [user])

  const primeiroNome = nome.split(' ')[0]

  return (
    <PublicoLayout>
      <div className={styles.saudacao}>
        <h1 className={styles.titulo}>
          {carregando ? 'Carregando...' : `Olá, ${primeiroNome}!`}
        </h1>
        <span className={styles.subtitulo}>Bem-vindo ao Terreiro Pemba</span>
      </div>

      {!carregando && (proximoAg || proximoEv) && (
        <div className={styles.widgets}>
          {proximoAg && (
            <button onClick={() => navigate('/dashboard/agendamentos')} className={styles.widget}>
              <span className={styles.widgetLabel}>Próximo agendamento</span>
              <span className={styles.widgetValor}>{proximoAg.tipo}</span>
              <span className={styles.widgetSub}>
                {formatarData(proximoAg.data)}
                {proximoAg.horario && ` às ${proximoAg.horario.slice(0, 5)}`}
                <span
                  className={styles.widgetStatus}
                  style={{ color: STATUS_COR[proximoAg.status] ?? '#8B6914' }}
                >
                  {proximoAg.status}
                </span>
              </span>
            </button>
          )}
          {proximoEv && (
            <button onClick={() => navigate('/dashboard/eventos')} className={styles.widget}>
              <span className={styles.widgetLabel}>Próximo evento</span>
              <span className={styles.widgetValor}>{proximoEv.titulo}</span>
              <span className={styles.widgetSub}>
                {formatarData(proximoEv.data)}
                {proximoEv.horario && ` às ${proximoEv.horario.slice(0, 5)}`}
                <span className={styles.widgetTipo}>{proximoEv.tipo}</span>
              </span>
            </button>
          )}
        </div>
      )}

      <h2 className={styles.secaoTitulo}>Acesso rápido</h2>
      <div className={styles.grid}>
        {MODULOS.map(m => (
          <button key={m.rota} onClick={() => navigate(m.rota)} className={styles.card}>
            <h3>{m.label}</h3>
            <p>{m.desc}</p>
          </button>
        ))}
      </div>
    </PublicoLayout>
  )
}
