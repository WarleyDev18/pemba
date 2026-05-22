import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/AdminLayout'
import styles from './Comunicados.module.css'

const vazio = { titulo: '', conteudo: '', destinatario: 'filho_santo' }

const DESTINATARIO = {
  filho_santo: { label: 'Filhos de Santo', classe: styles.badgeFilhoSanto },
  cliente:     { label: 'Clientes',        classe: styles.badgeCliente },
  todos:       { label: 'Todos',           classe: styles.badgeTodos },
}

export default function AdminComunicados() {
  const [comunicados, setComunicados] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [form, setForm] = useState(vazio)
  const [editandoId, setEditandoId] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setCarregando(true)
    const { data } = await supabase
      .from('comunicados')
      .select('*')
      .order('criado_em', { ascending: false })
    setComunicados(data ?? [])
    setCarregando(false)
  }

  function abrirNovo() {
    setForm(vazio)
    setEditandoId(null)
    setErro('')
    setModalAberto(true)
  }

  function abrirEditar(c) {
    setForm({ titulo: c.titulo, conteudo: c.conteudo, destinatario: c.destinatario })
    setEditandoId(c.id)
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
      titulo: form.titulo.trim(),
      conteudo: form.conteudo.trim(),
      destinatario: form.destinatario,
    }

    const { error } = editandoId
      ? await supabase.from('comunicados').update(payload).eq('id', editandoId)
      : await supabase.from('comunicados').insert(payload)

    if (error) {
      setErro('Erro ao salvar. Tente novamente.')
      setSalvando(false)
      return
    }

    await carregar()
    fecharModal()
    setSalvando(false)
  }

  async function excluir(id) {
    if (!confirm('Excluir este comunicado?')) return
    await supabase.from('comunicados').delete().eq('id', id)
    await carregar()
  }

  function formatarData(iso) {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  }

  return (
    <AdminLayout>
      <div className={styles.header}>
        <h1 className={styles.titulo}>Comunicados</h1>
        <button onClick={abrirNovo} className={styles.btnNovo}>+ Novo comunicado</button>
      </div>

      {carregando ? (
        <p className={styles.info}>Carregando...</p>
      ) : comunicados.length === 0 ? (
        <p className={styles.info}>Nenhum comunicado ainda.</p>
      ) : (
        <div className={styles.lista}>
          {comunicados.map(c => (
            <div key={c.id} className={styles.card}>
              <div className={styles.cardTopo}>
                <span className={styles.cardTitulo}>{c.titulo}</span>
                <span className={`${styles.badge} ${DESTINATARIO[c.destinatario]?.classe ?? ''}`}>
                  {DESTINATARIO[c.destinatario]?.label ?? c.destinatario}
                </span>
              </div>
              <p className={styles.cardConteudo}>{c.conteudo}</p>
              <div className={styles.cardRodape}>
                <span className={styles.cardData}>{formatarData(c.criado_em)}</span>
                <div className={styles.acoes}>
                  <button onClick={() => abrirEditar(c)} className={styles.btnEditar}>Editar</button>
                  <button onClick={() => excluir(c.id)} className={styles.btnExcluir}>Excluir</button>
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
              {editandoId ? 'Editar comunicado' : 'Novo comunicado'}
            </h2>

            <form onSubmit={salvar} className={styles.form}>
              <label className={styles.label}>
                Título
                <input
                  type="text"
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  required
                  className={styles.input}
                  autoFocus
                />
              </label>

              <label className={styles.label}>
                Conteúdo
                <textarea
                  value={form.conteudo}
                  onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
                  required
                  rows={5}
                  className={styles.textarea}
                />
              </label>

              <label className={styles.label}>
                Enviar para
                <div className={styles.destinatarioGroup}>
                  {Object.entries(DESTINATARIO).map(([valor, { label }]) => (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, destinatario: valor }))}
                      className={`${styles.destinatarioBotao} ${form.destinatario === valor ? styles.destinatarioBotaoAtivo : ''}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </label>

              {erro && <p className={styles.erro}>{erro}</p>}

              <div className={styles.modalAcoes}>
                <button type="button" onClick={fecharModal} className={styles.btnCancelar}>
                  Cancelar
                </button>
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
