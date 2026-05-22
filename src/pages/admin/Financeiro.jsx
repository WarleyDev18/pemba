import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/AdminLayout'
import styles from './Financeiro.module.css'

const FILTROS_TIPO = ['todos', 'entrada', 'saida']
const FILTROS_STATUS = ['todos', 'pago', 'pendente', 'cancelado']

const COR_STATUS = {
  pago:      { bg: '#EEF7EE', cor: '#1B5E20', label: 'Pago' },
  pendente:  { bg: '#FEF9EE', cor: '#8B6914', label: 'Pendente' },
  cancelado: { bg: '#FEF0EE', cor: '#8B1A1A', label: 'Cancelado' },
}

const vazio = {
  descricao: '',
  valor: '',
  tipo: 'saida',
  status: 'pago',
  data: new Date().toISOString().split('T')[0],
  usuario_id: '',
}

export default function AdminFinanceiro() {
  const [registros, setRegistros] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [carregando, setCarregando] = useState(true)
  const [form, setForm] = useState(vazio)
  const [editandoId, setEditandoId] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    carregar()
    carregarUsuarios()
  }, [])

  async function carregar() {
    setCarregando(true)
    const { data } = await supabase
      .from('financeiro')
      .select('*, usuarios(nome, email)')
      .order('data', { ascending: false })
      .order('criado_em', { ascending: false })
    setRegistros(data ?? [])
    setCarregando(false)
  }

  async function carregarUsuarios() {
    const { data } = await supabase
      .from('usuarios')
      .select('id, nome, email')
      .order('nome')
    setUsuarios(data ?? [])
  }

  function abrirNovo() {
    setForm(vazio)
    setEditandoId(null)
    setErro('')
    setModalAberto(true)
  }

  function abrirEditar(r) {
    setForm({
      descricao: r.descricao,
      valor: r.valor,
      tipo: r.tipo,
      status: r.status,
      data: r.data,
      usuario_id: r.usuario_id ?? '',
    })
    setEditandoId(r.id)
    setErro('')
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setForm(vazio)
    setEditandoId(null)
    setErro('')
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    setErro('')

    const payload = {
      descricao: form.descricao.trim(),
      valor: parseFloat(form.valor),
      tipo: form.tipo,
      status: form.status,
      data: form.data,
      usuario_id: form.usuario_id || null,
    }

    const { error } = editandoId
      ? await supabase.from('financeiro').update(payload).eq('id', editandoId)
      : await supabase.from('financeiro').insert(payload)

    if (error) {
      setErro('Erro ao salvar. Tente novamente.')
      setSalvando(false)
      return
    }

    await carregar()
    fecharModal()
    setSalvando(false)
  }

  async function mudarStatus(id, novoStatus) {
    await supabase.from('financeiro').update({ status: novoStatus }).eq('id', id)
    await carregar()
  }

  async function excluir(id) {
    if (!confirm('Excluir este lançamento?')) return
    await supabase.from('financeiro').delete().eq('id', id)
    await carregar()
  }

  function formatarData(data) {
    const [ano, mes, dia] = data.split('-')
    return `${dia}/${mes}/${ano}`
  }

  function brl(v) {
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  // Filtros
  const lista = registros.filter(r => {
    if (filtroTipo !== 'todos' && r.tipo !== filtroTipo) return false
    if (filtroStatus !== 'todos' && r.status !== filtroStatus) return false
    return true
  })

  // Resumo (somente pagos)
  const pagos = registros.filter(r => r.status === 'pago')
  const totalEntradas = pagos.filter(r => r.tipo === 'entrada').reduce((s, r) => s + Number(r.valor), 0)
  const totalSaidas = pagos.filter(r => r.tipo === 'saida').reduce((s, r) => s + Number(r.valor), 0)
  const saldo = totalEntradas - totalSaidas

  return (
    <AdminLayout>
      <div className={styles.header}>
        <h1 className={styles.titulo}>Financeiro</h1>
        <button onClick={abrirNovo} className={styles.btnNovo}>+ Novo lançamento</button>
      </div>

      {/* Resumo */}
      <div className={styles.resumo}>
        <div className={`${styles.resumoCard} ${styles.resumoEntrada}`}>
          <span className={styles.resumoLabel}>Entradas</span>
          <span className={styles.resumoValor}>{brl(totalEntradas)}</span>
        </div>
        <div className={`${styles.resumoCard} ${styles.resumoSaida}`}>
          <span className={styles.resumoLabel}>Saídas</span>
          <span className={styles.resumoValor}>{brl(totalSaidas)}</span>
        </div>
        <div className={`${styles.resumoCard} ${saldo >= 0 ? styles.resumoPositivo : styles.resumoNegativo}`}>
          <span className={styles.resumoLabel}>Saldo</span>
          <span className={styles.resumoValor}>{brl(saldo)}</span>
        </div>
      </div>

      {/* Filtros */}
      <div className={styles.filtrosLinha}>
        <div className={styles.filtros}>
          {FILTROS_TIPO.map(f => (
            <button
              key={f}
              onClick={() => setFiltroTipo(f)}
              className={`${styles.filtro} ${filtroTipo === f ? styles.filtroAtivo : ''}`}
            >
              {f === 'todos' ? 'Todos' : f === 'entrada' ? 'Entradas' : 'Saídas'}
            </button>
          ))}
        </div>
        <div className={styles.filtros}>
          {FILTROS_STATUS.map(f => (
            <button
              key={f}
              onClick={() => setFiltroStatus(f)}
              className={`${styles.filtro} ${filtroStatus === f ? styles.filtroAtivo : ''}`}
            >
              {f === 'todos' ? 'Todos status' : COR_STATUS[f].label}
            </button>
          ))}
        </div>
      </div>

      {carregando ? (
        <p className={styles.info}>Carregando...</p>
      ) : lista.length === 0 ? (
        <p className={styles.info}>Nenhum lançamento encontrado.</p>
      ) : (
        <div className={styles.lista}>
          {lista.map(r => (
            <div key={r.id} className={styles.card}>
              <div className={styles.cardEsq}>
                <span className={`${styles.tipoBadge} ${r.tipo === 'entrada' ? styles.tipoEntrada : styles.tipoSaida}`}>
                  {r.tipo === 'entrada' ? '↑' : '↓'}
                </span>
              </div>

              <div className={styles.cardCorpo}>
                <div className={styles.cardTopo}>
                  <span className={styles.cardDesc}>{r.descricao}</span>
                  <span
                    className={`${styles.statusBadge}`}
                    style={{ background: COR_STATUS[r.status].bg, color: COR_STATUS[r.status].cor }}
                  >
                    {COR_STATUS[r.status].label}
                  </span>
                </div>
                <div className={styles.cardMeta}>
                  <span>{formatarData(r.data)}</span>
                  {r.usuarios?.nome && <span>{r.usuarios.nome}</span>}
                  {r.agendamento_id && <span className={styles.origem}>Agendamento</span>}
                  {r.ebo_id && <span className={styles.origem}>Ebó</span>}
                </div>
              </div>

              <div className={styles.cardDir}>
                <span className={`${styles.valor} ${r.tipo === 'entrada' ? styles.valorEntrada : styles.valorSaida}`}>
                  {r.tipo === 'saida' ? '−' : '+'}{brl(r.valor)}
                </span>
                <div className={styles.acoes}>
                  {r.status === 'pendente' && (
                    <button onClick={() => mudarStatus(r.id, 'pago')} className={styles.btnPagar}>Pago</button>
                  )}
                  <button onClick={() => abrirEditar(r)} className={styles.btnEditar}>Editar</button>
                  <button onClick={() => excluir(r.id)} className={styles.btnExcluir}>Excluir</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <div className={styles.overlay} onClick={fecharModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitulo}>
              {editandoId ? 'Editar lançamento' : 'Novo lançamento'}
            </h2>

            <form onSubmit={salvar} className={styles.form}>
              <label className={styles.label}>
                Descrição
                <input
                  type="text"
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  required
                  className={styles.input}
                  autoFocus
                  placeholder="Ex: Velas e materiais, Agendamento consulta..."
                />
              </label>

              <div className={styles.linha}>
                <label className={styles.label}>
                  Tipo
                  <select
                    value={form.tipo}
                    onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                    className={styles.input}
                  >
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                  </select>
                </label>
                <label className={styles.label}>
                  Status
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className={styles.input}
                  >
                    <option value="pago">Pago</option>
                    <option value="pendente">Pendente</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </label>
              </div>

              <div className={styles.linha}>
                <label className={styles.label}>
                  Valor (R$)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.valor}
                    onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                    required
                    placeholder="0,00"
                    className={styles.input}
                  />
                </label>
                <label className={styles.label}>
                  Data
                  <input
                    type="date"
                    value={form.data}
                    onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                    required
                    className={styles.input}
                  />
                </label>
              </div>

              <label className={styles.label}>
                Usuário (opcional)
                <select
                  value={form.usuario_id}
                  onChange={e => setForm(f => ({ ...f, usuario_id: e.target.value }))}
                  className={styles.input}
                >
                  <option value="">— Sem usuário vinculado —</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.nome} ({u.email})</option>
                  ))}
                </select>
              </label>

              {erro && <p className={styles.erro}>{erro}</p>}

              <div className={styles.modalAcoes}>
                <button type="button" onClick={fecharModal} className={styles.btnCancelarModal}>Cancelar</button>
                <button type="submit" disabled={salvando} className={styles.btnSalvar}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
