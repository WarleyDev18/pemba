import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import PublicoLayout from '../../components/PublicoLayout'
import styles from './Agendamentos.module.css'

const TIPOS = ['Consulta', 'Atendimento', 'Limpeza Espiritual', 'Trabalho Espiritual', 'Despacho', 'Outro']

const COR_STATUS = {
  pendente:   { bg: '#FEF9EE', cor: '#8B6914', label: 'Pendente' },
  confirmado: { bg: '#EEF7EE', cor: '#1B5E20', label: 'Confirmado' },
  realizado:  { bg: '#FDF5DC', cor: '#5C4800', label: 'Realizado' },
  cancelado:  { bg: '#FEF0EE', cor: '#8B1A1A', label: 'Cancelado' },
}

const vazio = { data: '', horario: '', tipo: 'Consulta', observacoes: '' }

export default function PublicoAgendamentos() {
  const { user } = useAuth()
  const [agendamentos, setAgendamentos] = useState([])
  const [usuarioId, setUsuarioId] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [form, setForm] = useState(vazio)
  const [formAberto, setFormAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (user) buscarUsuarioEAgendamentos()
  }, [user])

  async function buscarUsuarioEAgendamentos() {
    setCarregando(true)
    const { data: u } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', user.email)
      .single()

    if (u) {
      setUsuarioId(u.id)
      const { data } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('usuario_id', u.id)
        .order('data', { ascending: false })
      setAgendamentos(data ?? [])
    }
    setCarregando(false)
  }

  async function salvar(e) {
    e.preventDefault()
    if (!usuarioId) return
    setSalvando(true)
    setErro('')

    const hoje = new Date().toISOString().split('T')[0]
    if (form.data < hoje) {
      setErro('A data deve ser a partir de hoje.')
      setSalvando(false)
      return
    }

    const { error } = await supabase.from('agendamentos').insert({
      usuario_id: usuarioId,
      data: form.data,
      horario: form.horario,
      tipo: form.tipo,
      observacoes: form.observacoes.trim() || null,
    })

    if (error) {
      setErro('Erro ao agendar. Tente novamente.')
      setSalvando(false)
      return
    }

    await buscarUsuarioEAgendamentos()
    setForm(vazio)
    setFormAberto(false)
    setSalvando(false)
  }

  async function cancelar(id) {
    if (!confirm('Cancelar este agendamento?')) return
    await supabase.from('agendamentos').update({ status: 'cancelado' }).eq('id', id)
    await buscarUsuarioEAgendamentos()
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

  const proximos = agendamentos.filter(a => a.status !== 'cancelado' && a.status !== 'realizado')
  const historico = agendamentos.filter(a => a.status === 'realizado' || a.status === 'cancelado')

  return (
    <PublicoLayout>
      <div className={styles.header}>
        <h1 className={styles.titulo}>Meus Agendamentos</h1>
        <button onClick={() => setFormAberto(v => !v)} className={styles.btnNovo}>
          {formAberto ? 'Cancelar' : '+ Novo agendamento'}
        </button>
      </div>

      {formAberto && (
        <div className={styles.formCard}>
          <h2 className={styles.formTitulo}>Solicitar agendamento</h2>
          <form onSubmit={salvar} className={styles.form}>
            <div className={styles.linha}>
              <label className={styles.label}>
                Data
                <input
                  type="date"
                  value={form.data}
                  onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className={styles.input}
                  autoFocus
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

            <label className={styles.label}>
              Tipo de atendimento
              <select
                value={form.tipo}
                onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                className={styles.input}
              >
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>

            <label className={styles.label}>
              Observações
              <textarea
                value={form.observacoes}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                rows={3}
                placeholder="Descreva brevemente o que precisa..."
                className={styles.textarea}
              />
            </label>

            {erro && <p className={styles.erro}>{erro}</p>}

            <button type="submit" disabled={salvando} className={styles.btnSalvar}>
              {salvando ? 'Enviando...' : 'Solicitar agendamento'}
            </button>
          </form>
        </div>
      )}

      {carregando ? (
        <p className={styles.info}>Carregando...</p>
      ) : agendamentos.length === 0 && !formAberto ? (
        <p className={styles.info}>Você ainda não tem agendamentos.</p>
      ) : (
        <>
          {proximos.length > 0 && (
            <section className={styles.secao}>
              <h2 className={styles.secaoTitulo}>Próximos</h2>
              <div className={styles.lista}>
                {proximos.map(ag => (
                  <div key={ag.id} className={styles.card}>
                    <div className={styles.cardTopo}>
                      <div>
                        <span className={styles.cardTipo}>{ag.tipo}</span>
                        <span className={styles.cardDataHora}>
                          {formatarData(ag.data)} às {formatarHorario(ag.horario)}
                        </span>
                      </div>
                      <span
                        className={styles.statusBadge}
                        style={{ background: COR_STATUS[ag.status].bg, color: COR_STATUS[ag.status].cor }}
                      >
                        {COR_STATUS[ag.status].label}
                      </span>
                    </div>
                    {ag.valor && <span className={styles.valor}>{formatarValor(ag.valor)}</span>}
                    {ag.observacoes && <p className={styles.obs}>{ag.observacoes}</p>}
                    {ag.status === 'pendente' && (
                      <button onClick={() => cancelar(ag.id)} className={styles.btnCancelar}>
                        Cancelar agendamento
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {historico.length > 0 && (
            <section className={styles.secao}>
              <h2 className={styles.secaoTitulo}>Histórico</h2>
              <div className={styles.lista}>
                {historico.map(ag => (
                  <div key={ag.id} className={`${styles.card} ${styles.cardHistorico}`}>
                    <div className={styles.cardTopo}>
                      <div>
                        <span className={styles.cardTipo}>{ag.tipo}</span>
                        <span className={styles.cardDataHora}>
                          {formatarData(ag.data)} às {formatarHorario(ag.horario)}
                        </span>
                      </div>
                      <span
                        className={styles.statusBadge}
                        style={{ background: COR_STATUS[ag.status].bg, color: COR_STATUS[ag.status].cor }}
                      >
                        {COR_STATUS[ag.status].label}
                      </span>
                    </div>
                    {ag.valor && <span className={styles.valor}>{formatarValor(ag.valor)}</span>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </PublicoLayout>
  )
}
