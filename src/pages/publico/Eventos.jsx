import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import PublicoLayout from '../../components/PublicoLayout'
import styles from './Eventos.module.css'

const CORES_TIPO = {
  'Gira':        { bg: '#1e3a5f', cor: '#93c5fd' },
  'Festividade': { bg: '#3b1f2b', cor: '#f9a8d4' },
  'Reunião':     { bg: '#1c3028', cor: '#6ee7b7' },
  'Trabalho':    { bg: '#2d1b00', cor: '#fcd34d' },
  'Outro':       { bg: '#1f1f1f', cor: '#d1d5db' },
}

export default function PublicoEventos() {
  const [eventos, setEventos] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase
        .from('eventos')
        .select('*')
        .eq('publico', true)
        .order('data', { ascending: true })
      setEventos(data ?? [])
      setCarregando(false)
    }
    carregar()
  }, [])

  const hoje = new Date().toISOString().split('T')[0]
  const proximos = eventos.filter(e => e.data >= hoje)
  const passados = eventos.filter(e => e.data < hoje)

  function formatarData(data) {
    const [ano, mes, dia] = data.split('-')
    const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
    return { dia, mes: meses[parseInt(mes) - 1], ano }
  }

  function formatarHorario(h) {
    return h ? h.slice(0, 5) : null
  }

  return (
    <PublicoLayout>
      <h1 className={styles.titulo}>Calendário</h1>

      {carregando ? (
        <p className={styles.info}>Carregando...</p>
      ) : eventos.length === 0 ? (
        <p className={styles.info}>Nenhum evento disponível no momento.</p>
      ) : (
        <>
          {proximos.length > 0 && (
            <section className={styles.secao}>
              <h2 className={styles.secaoTitulo}>Próximos eventos</h2>
              <div className={styles.lista}>
                {proximos.map(ev => <CardEvento key={ev.id} ev={ev} formatarData={formatarData} formatarHorario={formatarHorario} />)}
              </div>
            </section>
          )}

          {passados.length > 0 && (
            <section className={styles.secao}>
              <h2 className={styles.secaoTitulo}>Eventos anteriores</h2>
              <div className={styles.lista}>
                {[...passados].reverse().map(ev => <CardEvento key={ev.id} ev={ev} formatarData={formatarData} formatarHorario={formatarHorario} passado />)}
              </div>
            </section>
          )}
        </>
      )}
    </PublicoLayout>
  )
}

function CardEvento({ ev, formatarData, formatarHorario, passado }) {
  const { dia, mes, ano } = formatarData(ev.data)
  const horario = formatarHorario(ev.horario)
  const cores = CORES_TIPO[ev.tipo] ?? CORES_TIPO['Outro']

  return (
    <div className={`${styles.card} ${passado ? styles.cardPassado : ''}`}>
      {ev.foto_url && (
        <img src={ev.foto_url} alt={ev.titulo} className={styles.cardFoto} />
      )}
      <div className={styles.cardInfo}>
        <div className={styles.dataBox}>
          <span className={styles.dataDia}>{dia}</span>
          <span className={styles.dataMes}>{mes}</span>
          <span className={styles.dataAno}>{ano}</span>
        </div>

        <div className={styles.corpo}>
          <div className={styles.topo}>
            <span className={styles.cardTitulo}>{ev.titulo}</span>
            <span
              className={styles.badge}
              style={{ background: cores.bg, color: cores.cor }}
            >
              {ev.tipo}
            </span>
          </div>
          {horario && <span className={styles.horario}>às {horario}</span>}
          {ev.descricao && <p className={styles.desc}>{ev.descricao}</p>}
        </div>
      </div>
    </div>
  )
}
