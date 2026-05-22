import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/AdminLayout'
import styles from './Doacoes.module.css'

const FILTROS_STATUS = ['todos', 'aprovado', 'pendente', 'cancelado']
const FILTROS_METODO = ['todos', 'pix', 'boleto', 'cartao']

const COR_STATUS = {
  aprovado:  { bg: '#EEF7EE', cor: '#1B5E20', label: 'Aprovado' },
  pendente:  { bg: '#FEF9EE', cor: '#8B6914', label: 'Pendente' },
  cancelado: { bg: '#FEF0EE', cor: '#8B1A1A', label: 'Cancelado' },
}

export default function AdminDoacoes() {
  const [doacoes, setDoacoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroMetodo, setFiltroMetodo] = useState('todos')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setCarregando(true)
    const { data } = await supabase
      .from('vw_doacoes_admin')
      .select('*')
      .order('criado_em', { ascending: false })
    setDoacoes(data ?? [])
    setCarregando(false)
  }

  function brl(v) {
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function formatarData(iso) {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const lista = doacoes.filter(d => {
    if (filtroStatus !== 'todos' && d.status !== filtroStatus) return false
    if (filtroMetodo !== 'todos' && d.metodo !== filtroMetodo) return false
    return true
  })

  // Resumo do mês
  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()
  const doMes = doacoes.filter(d => d.status === 'aprovado' && d.criado_em >= inicioMes)
  const totalMes = doMes.reduce((s, d) => s + Number(d.valor), 0)
  const qtdMes = doMes.length
  const ticketMedio = qtdMes > 0 ? totalMes / qtdMes : 0

  return (
    <AdminLayout>
      <h1 className={styles.titulo}>Doações</h1>

      {/* Resumo */}
      <div className={styles.resumo}>
        <div className={styles.resumoCard}>
          <span className={styles.resumoLabel}>Total no mês</span>
          <span className={styles.resumoValor}>{brl(totalMes)}</span>
        </div>
        <div className={styles.resumoCard}>
          <span className={styles.resumoLabel}>Doações aprovadas</span>
          <span className={styles.resumoValor}>{qtdMes}</span>
        </div>
        <div className={styles.resumoCard}>
          <span className={styles.resumoLabel}>Ticket médio</span>
          <span className={styles.resumoValor}>{brl(ticketMedio)}</span>
        </div>
      </div>

      {/* Filtros */}
      <div className={styles.filtrosLinha}>
        <div className={styles.filtros}>
          {FILTROS_STATUS.map(f => (
            <button
              key={f}
              onClick={() => setFiltroStatus(f)}
              className={`${styles.filtro} ${filtroStatus === f ? styles.filtroAtivo : ''}`}
            >
              {f === 'todos' ? 'Todos status' : COR_STATUS[f]?.label ?? f}
            </button>
          ))}
        </div>
        <div className={styles.filtros}>
          {FILTROS_METODO.map(f => (
            <button
              key={f}
              onClick={() => setFiltroMetodo(f)}
              className={`${styles.filtro} ${filtroMetodo === f ? styles.filtroAtivo : ''}`}
            >
              {f === 'todos' ? 'Todos métodos' : f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {carregando ? (
        <p className={styles.info}>Carregando...</p>
      ) : lista.length === 0 ? (
        <p className={styles.info}>Nenhuma doação encontrada.</p>
      ) : (
        <div className={styles.lista}>
          {lista.map(d => (
            <div key={d.id} className={styles.card}>
              <div className={styles.cardEsq}>
                <span className={styles.cardValor}>{brl(d.valor)}</span>
                <span className={styles.cardMetodo}>{d.metodo?.toUpperCase()}</span>
              </div>

              <div className={styles.cardCorpo}>
                <span className={styles.cardNome}>{d.nome ?? d.email ?? 'Anônimo'}</span>
                {d.email && d.nome && <span className={styles.cardEmail}>{d.email}</span>}
                {d.mensagem && <p className={styles.cardMsg}>"{d.mensagem}"</p>}
              </div>

              <div className={styles.cardDir}>
                <span
                  className={styles.statusBadge}
                  style={{ background: COR_STATUS[d.status]?.bg, color: COR_STATUS[d.status]?.cor }}
                >
                  {COR_STATUS[d.status]?.label ?? d.status}
                </span>
                <span className={styles.cardData}>{formatarData(d.criado_em)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}
