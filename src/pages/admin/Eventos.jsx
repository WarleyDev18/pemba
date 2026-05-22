import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/AdminLayout'
import styles from './Eventos.module.css'

const TIPOS = ['Gira', 'Festividade', 'Reunião', 'Trabalho', 'Outro']

const vazio = { titulo: '', descricao: '', data: '', horario: '', tipo: 'Gira', publico: true }

export default function AdminEventos() {
  const [eventos, setEventos] = useState([])
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
      .from('eventos')
      .select('*')
      .order('data', { ascending: true })
    setEventos(data ?? [])
    setCarregando(false)
  }

  function abrirNovo() {
    setForm(vazio)
    setEditandoId(null)
    setErro('')
    setModalAberto(true)
  }

  function abrirEditar(ev) {
    setForm({
      titulo: ev.titulo,
      descricao: ev.descricao ?? '',
      data: ev.data,
      horario: ev.horario ?? '',
      tipo: ev.tipo,
      publico: ev.publico,
    })
    setEditandoId(ev.id)
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
      descricao: form.descricao.trim() || null,
      data: form.data,
      horario: form.horario || null,
      tipo: form.tipo,
      publico: form.publico,
    }

    const { error } = editandoId
      ? await supabase.from('eventos').update(payload).eq('id', editandoId)
      : await supabase.from('eventos').insert(payload)

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
    if (!confirm('Excluir este evento?')) return
    await supabase.from('eventos').delete().eq('id', id)
    await carregar()
  }

  function formatarData(data) {
    const [ano, mes, dia] = data.split('-')
    return `${dia}/${mes}/${ano}`
  }

  function formatarHorario(h) {
    if (!h) return ''
    return h.slice(0, 5)
  }

  const hoje = new Date().toISOString().split('T')[0]
  const proximos = eventos.filter(e => e.data >= hoje)
  const passados = eventos.filter(e => e.data < hoje)

  return (
    <AdminLayout>
      <div className={styles.header}>
        <h1 className={styles.titulo}>Eventos</h1>
        <button onClick={abrirNovo} className={styles.btnNovo}>+ Novo evento</button>
      </div>

      {carregando ? (
        <p className={styles.info}>Carregando...</p>
      ) : eventos.length === 0 ? (
        <p className={styles.info}>Nenhum evento cadastrado ainda.</p>
      ) : (
        <>
          {proximos.length > 0 && (
            <section className={styles.secao}>
              <h2 className={styles.secaoTitulo}>Próximos</h2>
              <div className={styles.lista}>
                {proximos.map(ev => <CardEvento key={ev.id} ev={ev} onEditar={abrirEditar} onExcluir={excluir} formatarData={formatarData} formatarHorario={formatarHorario} />)}
              </div>
            </section>
          )}
          {passados.length > 0 && (
            <section className={styles.secao}>
              <h2 className={styles.secaoTitulo}>Anteriores</h2>
              <div className={styles.lista}>
                {[...passados].reverse().map(ev => <CardEvento key={ev.id} ev={ev} onEditar={abrirEditar} onExcluir={excluir} formatarData={formatarData} formatarHorario={formatarHorario} passado />)}
              </div>
            </section>
          )}
        </>
      )}

      {modalAberto && (
        <div className={styles.overlay} onClick={fecharModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitulo}>
              {editandoId ? 'Editar evento' : 'Novo evento'}
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
                    className={styles.input}
                  />
                </label>
              </div>

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
                Descrição
                <textarea
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  rows={3}
                  className={styles.textarea}
                />
              </label>

              <label className={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={form.publico}
                  onChange={e => setForm(f => ({ ...f, publico: e.target.checked }))}
                  className={styles.checkbox}
                />
                Visível para todos
              </label>

              {erro && <p className={styles.erro}>{erro}</p>}

              <div className={styles.modalAcoes}>
                <button type="button" onClick={fecharModal} className={styles.btnCancelar}>Cancelar</button>
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

function CardEvento({ ev, onEditar, onExcluir, formatarData, formatarHorario, passado }) {
  return (
    <div className={`${styles.card} ${passado ? styles.cardPassado : ''}`}>
      <div className={styles.cardEsquerda}>
        <span className={styles.cardData}>{formatarData(ev.data)}</span>
        {ev.horario && <span className={styles.cardHorario}>{formatarHorario(ev.horario)}</span>}
      </div>
      <div className={styles.cardCorpo}>
        <div className={styles.cardTopo}>
          <span className={styles.cardTitulo}>{ev.titulo}</span>
          <div className={styles.badges}>
            <span className={`${styles.badge} ${styles[`tipo${ev.tipo.replace(/\s/g,'')}`] ?? styles.tipoOutro}`}>{ev.tipo}</span>
            {!ev.publico && <span className={`${styles.badge} ${styles.badgePrivado}`}>Privado</span>}
          </div>
        </div>
        {ev.descricao && <p className={styles.cardDesc}>{ev.descricao}</p>}
      </div>
      <div className={styles.acoes}>
        <button onClick={() => onEditar(ev)} className={styles.btnEditar}>Editar</button>
        <button onClick={() => onExcluir(ev.id)} className={styles.btnExcluir}>Excluir</button>
      </div>
    </div>
  )
}
