import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/AdminLayout'
import styles from './Ebos.module.css'

const STATUS = ['pendente', 'em_preparo', 'realizado']
const FILTROS = ['todos', 'pendente', 'em_preparo', 'realizado']

const COR_STATUS = {
  pendente:   { bg: '#FEF9EE', cor: '#8B6914', label: 'Pendente' },
  em_preparo: { bg: '#E8F0FE', cor: '#1A56DB', label: 'Em Preparo' },
  realizado:  { bg: '#FDF5DC', cor: '#5C4800', label: 'Realizado' },
}

const vazio = { usuario_id: '', descricao: '', materiais: '', data_realizacao: '', valor: '' }

export default function AdminEbos() {
  const [ebos, setEbos] = useState([])
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
      .from('ebos')
      .select('*, usuarios(id, nome, email)')
      .order('criado_em', { ascending: false })
    setEbos(data ?? [])
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

  function abrirEditar(eb) {
    setForm({
      usuario_id: eb.usuario_id ?? '',
      descricao: eb.descricao,
      materiais: eb.materiais ?? '',
      data_realizacao: eb.data_realizacao ?? '',
      valor: eb.valor ?? '',
    })
    setEditandoId(eb.id)
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
      descricao: form.descricao.trim(),
      materiais: form.materiais.trim() || null,
      data_realizacao: form.data_realizacao || null,
      valor: form.valor ? parseFloat(form.valor) : null,
    }

    const { error } = editandoId
      ? await supabase.from('ebos').update(payload).eq('id', editandoId)
      : await supabase.from('ebos').insert(payload)

    if (error) {
      setErro('Erro ao salvar. Tente novamente.')
      setSalvando(false)
      return
    }

    await carregar()
    fecharModal()
    setSalvando(false)
  }

  async function mudarStatus(eb, novoStatus) {
    await supabase.from('ebos').update({ status: novoStatus }).eq('id', eb.id)

    if (novoStatus === 'realizado' && eb.valor) {
      const hoje = new Date().toISOString().split('T')[0]
      await supabase.from('financeiro').insert({
        usuario_id: eb.usuario_id,
        ebo_id: eb.id,
        descricao: `Ebó — ${eb.descricao}`,
        valor: eb.valor,
        tipo: 'entrada',
        status: 'pago',
        data: hoje,
      })
    }

    await carregar()
  }

  async function excluir(id) {
    if (!confirm('Excluir este ebó?')) return
    await supabase.from('ebos').delete().eq('id', id)
    await carregar()
  }

  function formatarData(data) {
    if (!data) return null
    const [ano, mes, dia] = data.split('-')
    return `${dia}/${mes}/${ano}`
  }

  function formatarValor(v) {
    if (!v) return null
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const lista = filtro === 'todos' ? ebos : ebos.filter(e => e.status === filtro)

  const contagens = FILTROS.reduce((acc, f) => {
    acc[f] = f === 'todos' ? ebos.length : ebos.filter(e => e.status === f).length
    return acc
  }, {})

  return (
    <AdminLayout>
      <div className={styles.header}>
        <h1 className={styles.titulo}>Ebós</h1>
        <button onClick={abrirNovo} className={styles.btnNovo}>+ Novo ebó</button>
      </div>

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
        <p className={styles.info}>Nenhum ebó encontrado.</p>
      ) : (
        <div className={styles.lista}>
          {lista.map(eb => (
            <div key={eb.id} className={styles.card}>
              <div className={styles.cardTopo}>
                <div className={styles.cardInfo}>
                  <span className={styles.cardDesc}>{eb.descricao}</span>
                  <span className={styles.cardNome}>
                    {eb.usuarios?.nome ?? 'Sem usuário'}
                    {eb.usuarios?.email ? ` · ${eb.usuarios.email}` : ''}
                  </span>
                </div>
                <span
                  className={styles.statusBadge}
                  style={{ background: COR_STATUS[eb.status].bg, color: COR_STATUS[eb.status].cor }}
                >
                  {COR_STATUS[eb.status].label}
                </span>
              </div>

              <div className={styles.cardMeta}>
                {eb.data_realizacao && (
                  <span>Data prevista: <strong>{formatarData(eb.data_realizacao)}</strong></span>
                )}
                {eb.valor && (
                  <span className={styles.valor}>{formatarValor(eb.valor)}</span>
                )}
              </div>

              {eb.materiais && (
                <p className={styles.materiais}>
                  <span className={styles.materiaisLabel}>Materiais:</span> {eb.materiais}
                </p>
              )}

              <div className={styles.cardAcoes}>
                <div className={styles.statusAcoes}>
                  {eb.status === 'pendente' && (
                    <button onClick={() => mudarStatus(eb, 'em_preparo')} className={`${styles.btnStatus} ${styles.btnPreparo}`}>
                      Iniciar preparo
                    </button>
                  )}
                  {eb.status === 'em_preparo' && (
                    <button onClick={() => mudarStatus(eb, 'realizado')} className={`${styles.btnStatus} ${styles.btnRealizado}`}>
                      Marcar realizado
                    </button>
                  )}
                  {eb.status !== 'realizado' && (
                    <button onClick={() => mudarStatus(eb, 'pendente')} className={`${styles.btnStatus} ${styles.btnPendente}`}
                      style={{ display: eb.status === 'pendente' ? 'none' : '' }}>
                      Voltar a pendente
                    </button>
                  )}
                </div>
                <div className={styles.editAcoes}>
                  <button onClick={() => abrirEditar(eb)} className={styles.btnEditar}>Editar</button>
                  <button onClick={() => excluir(eb.id)} className={styles.btnExcluir}>Excluir</button>
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
              {editandoId ? 'Editar ebó' : 'Novo ebó'}
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

              <label className={styles.label}>
                Descrição
                <input
                  type="text"
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  required
                  className={styles.input}
                  autoFocus
                  placeholder="Ex: Ebó de limpeza, despacho na encruzilhada..."
                />
              </label>

              <label className={styles.label}>
                Materiais necessários
                <textarea
                  value={form.materiais}
                  onChange={e => setForm(f => ({ ...f, materiais: e.target.value }))}
                  rows={3}
                  className={styles.textarea}
                  placeholder="Liste os materiais necessários..."
                />
              </label>

              <div className={styles.linha}>
                <label className={styles.label}>
                  Data de realização
                  <input
                    type="date"
                    value={form.data_realizacao}
                    onChange={e => setForm(f => ({ ...f, data_realizacao: e.target.value }))}
                    className={styles.input}
                  />
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
