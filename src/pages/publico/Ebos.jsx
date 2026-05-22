import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import PublicoLayout from '../../components/PublicoLayout'
import styles from './Ebos.module.css'

const COR_STATUS = {
  pendente:   { bg: '#FEF9EE', cor: '#8B6914', label: 'Pendente' },
  em_preparo: { bg: '#E8F0FE', cor: '#1A56DB', label: 'Em Preparo' },
  realizado:  { bg: '#FDF5DC', cor: '#5C4800', label: 'Realizado' },
}

const vazio = { descricao: '', materiais: '', data_realizacao: '' }

export default function PublicoEbos() {
  const { user } = useAuth()
  const [ebos, setEbos] = useState([])
  const [usuarioId, setUsuarioId] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [form, setForm] = useState(vazio)
  const [formAberto, setFormAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (user) buscarUsuarioEEbos()
  }, [user])

  async function buscarUsuarioEEbos() {
    setCarregando(true)
    const { data: u } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', user.email)
      .single()

    if (u) {
      setUsuarioId(u.id)
      const { data } = await supabase
        .from('ebos')
        .select('*')
        .eq('usuario_id', u.id)
        .order('criado_em', { ascending: false })
      setEbos(data ?? [])
    }
    setCarregando(false)
  }

  async function salvar(e) {
    e.preventDefault()
    if (!usuarioId) return
    setSalvando(true)
    setErro('')

    const { error } = await supabase.from('ebos').insert({
      usuario_id: usuarioId,
      descricao: form.descricao.trim(),
      materiais: form.materiais.trim() || null,
      data_realizacao: form.data_realizacao || null,
    })

    if (error) {
      setErro('Erro ao solicitar. Tente novamente.')
      setSalvando(false)
      return
    }

    await buscarUsuarioEEbos()
    setForm(vazio)
    setFormAberto(false)
    setSalvando(false)
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

  function formatarDataRelativa(iso) {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  }

  const ativos = ebos.filter(e => e.status !== 'realizado')
  const realizados = ebos.filter(e => e.status === 'realizado')

  return (
    <PublicoLayout>
      <div className={styles.header}>
        <h1 className={styles.titulo}>Meus Ebós</h1>
        <button onClick={() => setFormAberto(v => !v)} className={styles.btnNovo}>
          {formAberto ? 'Cancelar' : '+ Solicitar ebó'}
        </button>
      </div>

      {formAberto && (
        <div className={styles.formCard}>
          <h2 className={styles.formTitulo}>Solicitar ebó</h2>
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
                placeholder="Ex: Ebó de limpeza, despacho..."
              />
            </label>

            <label className={styles.label}>
              Materiais que você já tem (opcional)
              <textarea
                value={form.materiais}
                onChange={e => setForm(f => ({ ...f, materiais: e.target.value }))}
                rows={3}
                className={styles.textarea}
                placeholder="Liste os materiais que você já tem disponíveis..."
              />
            </label>

            <label className={styles.label}>
              Data preferida de realização (opcional)
              <input
                type="date"
                value={form.data_realizacao}
                onChange={e => setForm(f => ({ ...f, data_realizacao: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className={styles.input}
              />
            </label>

            {erro && <p className={styles.erro}>{erro}</p>}

            <button type="submit" disabled={salvando} className={styles.btnSalvar}>
              {salvando ? 'Enviando...' : 'Solicitar'}
            </button>
          </form>
        </div>
      )}

      {carregando ? (
        <p className={styles.info}>Carregando...</p>
      ) : ebos.length === 0 && !formAberto ? (
        <p className={styles.info}>Você ainda não tem ebós solicitados.</p>
      ) : (
        <>
          {ativos.length > 0 && (
            <section className={styles.secao}>
              <h2 className={styles.secaoTitulo}>Em andamento</h2>
              <div className={styles.lista}>
                {ativos.map(eb => <CardEbo key={eb.id} eb={eb} formatarData={formatarData} formatarValor={formatarValor} formatarDataRelativa={formatarDataRelativa} />)}
              </div>
            </section>
          )}

          {realizados.length > 0 && (
            <section className={styles.secao}>
              <h2 className={styles.secaoTitulo}>Realizados</h2>
              <div className={styles.lista}>
                {realizados.map(eb => <CardEbo key={eb.id} eb={eb} formatarData={formatarData} formatarValor={formatarValor} formatarDataRelativa={formatarDataRelativa} dimmed />)}
              </div>
            </section>
          )}
        </>
      )}
    </PublicoLayout>
  )
}

function CardEbo({ eb, formatarData, formatarValor, formatarDataRelativa, dimmed }) {
  const cor = COR_STATUS[eb.status]
  return (
    <div className={`${styles.card} ${dimmed ? styles.cardDimmed : ''}`}>
      <div className={styles.cardTopo}>
        <span className={styles.cardDesc}>{eb.descricao}</span>
        <span className={styles.statusBadge} style={{ background: cor.bg, color: cor.cor }}>
          {cor.label}
        </span>
      </div>

      <div className={styles.cardMeta}>
        <span>Solicitado em {formatarDataRelativa(eb.criado_em)}</span>
        {eb.data_realizacao && <span>Previsto: {formatarData(eb.data_realizacao)}</span>}
        {eb.valor && <span className={styles.valor}>{formatarValor(eb.valor)}</span>}
      </div>

      {eb.materiais && (
        <p className={styles.materiais}>
          <span className={styles.materiaisLabel}>Materiais:</span> {eb.materiais}
        </p>
      )}
    </div>
  )
}
