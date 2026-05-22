import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/AdminLayout'
import styles from './Agendamentos.module.css'

const TIPOS = ['Consulta', 'Atendimento', 'Limpeza Espiritual', 'Trabalho Espiritual', 'Despacho', 'Outro']
const STATUS = ['pendente', 'confirmado', 'realizado', 'cancelado']
const FILTROS = ['todos', 'pendente', 'confirmado', 'realizado', 'cancelado']

const COR_STATUS = {
  pendente:   { bg: '#FEF9EE', cor: '#8B6914', label: 'Pendente' },
  confirmado: { bg: '#EEF7EE', cor: '#1B5E20', label: 'Confirmado' },
  realizado:  { bg: '#FDF5DC', cor: '#5C4800', label: 'Realizado' },
  cancelado:  { bg: '#FEF0EE', cor: '#8B1A1A', label: 'Cancelado' },
}

const vazio = { usuario_id: '', data: '', horario: '', tipo: 'Consulta', valor: '', observacoes: '' }

export default function AdminAgendamentos() {
  const [agendamentos, setAgendamentos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [filtro, setFiltro] = useState('todos')
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
      .from('agendamentos')
      .select('*, usuarios(id, nome, email)')
      .order('data', { ascending: true })
      .order('horario', { ascending: true })
    setAgendamentos(data ?? [])
    setCarregando(false)
  }

  async function carregarUsuarios() {
    const { data } = await supabase
      .from('usuarios')
      .select('id, nome, email')
      .in('perfil', ['filho_santo', 'cliente'])
      .order('nome')
    setUsuarios(data ?? [])
  }

  function abrirNovo() {
    setForm(vazio)
    setEditandoId(null)
    setErro('')
    setModalAberto(true)
  }

  function abrirEditar(ag) {
    setForm({
      usuario_id: ag.usuario_id ?? '',
      data: ag.data,
      horario: ag.horario,
      tipo: ag.tipo,
      valor: ag.valor ?? '',
      observacoes: ag.observacoes ?? '',
    })
    setEditandoId(ag.id)
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
      usuario_id: form.usuario_id || null,
      data: form.data,
      horario: form.horario,
      tipo: form.tipo,
      valor: form.valor ? parseFloat(form.valor) : null,
      observacoes: form.observacoes.trim() || null,
    }

    const { error } = editandoId
      ? await supabase.from('agendamentos').update(payload).eq('id', editandoId)
      : await supabase.from('agendamentos').insert(payload)

    if (error) {
      setErro('Erro ao salvar. Tente novamente.')
      setSalvando(false)
      return
    }

    await carregar()
    fecharModal()
    setSalvando(false)
  }

  async function mudarStatus(ag, novoStatus) {
    await supabase.from('agendamentos').update({ status: novoStatus }).eq('id', ag.id)

    // Gera registro financeiro ao marcar como realizado com valor
    if (novoStatus === 'realizado' && ag.valor) {
      const hoje = new Date().toISOString().split('T')[0]
      await supabase.from('financeiro').insert({
        usuario_id: ag.usuario_id,
        agendamento_id: ag.id,
        descricao: `Agendamento — ${ag.tipo}`,
        valor: ag.valor,
        tipo: 'entrada',
        status: 'pago',
        data: hoje,
      })
    }

    await carregar()
  }

  async function excluir(id) {
    if (!confirm('Excluir este agendamento?')) return
    await supabase.from('agendamentos').delete().eq('id', id)
    await carregar()
  }

  function formatarData(data) {
    const [ano, mes, dia] = data.split('-')
    return `${dia}/${mes}/${ano}`
  }

  function formatarHorario(h) {
    return h?.slice(0, 5) ?? ''
  }

  function formatarValor(v) {
    if (!v) return null
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const lista = filtro === 'todos'
    ? agendamentos
    : agendamentos.filter(a => a.status === filtro)

  const contagens = FILTROS.reduce((acc, f) => {
    acc[f] = f === 'todos' ? agendamentos.length : agendamentos.filter(a => a.status === f).length
    return acc
  }, {})

  return (
    <AdminLayout>
      <div className={styles.header}>
        <h1 className={styles.titulo}>Agendamentos</h1>
        <button onClick={abrirNovo} className={styles.btnNovo}>+ Novo agendamento</button>
      </div>

      {/* Filtros */}
      <div className={styles.filtros}>
        {FILTROS.map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`${styles.filtro} ${filtro === f ? styles.filtroAtivo : ''}`}
          >
            {f === 'todos' ? 'Todos' : COR_STATUS[f].label}
            <span className={styles.filtroCount}>{contagens[f]}</span>
          </button>
        ))}
      </div>

      {carregando ? (
        <p className={styles.info}>Carregando...</p>
      ) : lista.length === 0 ? (
        <p className={styles.info}>Nenhum agendamento encontrado.</p>
      ) : (
        <div className={styles.lista}>
          {lista.map(ag => (
            <div key={ag.id} className={styles.card}>
              <div className={styles.cardTopo}>
                <div className={styles.cardInfo}>
                  <span className={styles.cardNome}>{ag.usuarios?.nome ?? 'Sem usuário'}</span>
                  <span className={styles.cardEmail}>{ag.usuarios?.email ?? ''}</span>
                </div>
                <span
                  className={styles.statusBadge}
                  style={{ background: COR_STATUS[ag.status].bg, color: COR_STATUS[ag.status].cor }}
                >
                  {COR_STATUS[ag.status].label}
                </span>
              </div>

              <div className={styles.cardDetalhes}>
                <span>{formatarData(ag.data)} às {formatarHorario(ag.horario)}</span>
                <span>{ag.tipo}</span>
                {ag.valor && <span className={styles.valor}>{formatarValor(ag.valor)}</span>}
              </div>

              {ag.observacoes && <p className={styles.obs}>{ag.observacoes}</p>}

              <div className={styles.cardAcoes}>
                <div className={styles.statusAcoes}>
                  {ag.status === 'pendente' && <>
                    <button onClick={() => mudarStatus(ag, 'confirmado')} className={`${styles.btnStatus} ${styles.btnConfirmar}`}>Confirmar</button>
                    <button onClick={() => mudarStatus(ag, 'cancelado')} className={`${styles.btnStatus} ${styles.btnCancelar}`}>Cancelar</button>
                  </>}
                  {ag.status === 'confirmado' && <>
                    <button onClick={() => mudarStatus(ag, 'realizado')} className={`${styles.btnStatus} ${styles.btnRealizado}`}>Marcar realizado</button>
                    <button onClick={() => mudarStatus(ag, 'cancelado')} className={`${styles.btnStatus} ${styles.btnCancelar}`}>Cancelar</button>
                  </>}
                  {ag.status === 'cancelado' && (
                    <button onClick={() => mudarStatus(ag, 'pendente')} className={`${styles.btnStatus} ${styles.btnReativar}`}>Reativar</button>
                  )}
                </div>
                <div className={styles.editAcoes}>
                  <button onClick={() => abrirEditar(ag)} className={styles.btnEditar}>Editar</button>
                  <button onClick={() => excluir(ag.id)} className={styles.btnExcluir}>Excluir</button>
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
              {editandoId ? 'Editar agendamento' : 'Novo agendamento'}
            </h2>

            <form onSubmit={salvar} className={styles.form}>
              <label className={styles.label}>
                Usuário
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

              <div className={styles.linha}>
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
                <label className={styles.label}>
                  Horário
                  <input
                    type="time"
                    value={form.horario}
                    onChange={e => setForm(f => ({ ...f, horario: e.target.value }))}
                    required
                    className={styles.input}
                  />
                </label>
              </div>

              <div className={styles.linha}>
                <label className={styles.label}>
                  Tipo
                  <select
                    value={form.tipo}
                    onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                    className={styles.input}
                  >
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label className={styles.label}>
                  Valor (R$)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.valor}
                    onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                    placeholder="0,00"
                    className={styles.input}
                  />
                </label>
              </div>

              <label className={styles.label}>
                Observações
                <textarea
                  value={form.observacoes}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  rows={3}
                  className={styles.textarea}
                />
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
