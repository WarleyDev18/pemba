import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/AdminLayout'
import styles from './Usuarios.module.css'

const formVazio = { nome: '', email: '', senha: '', perfil: 'cliente' }

const ESTILO_PERFIL = {
  admin:       styles.perfilAdmin,
  filho_santo: styles.perfilFilhoSanto,
  cliente:     styles.perfilCliente,
}

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState(formVazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setCarregando(true)
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .order('nome', { ascending: true })
    setUsuarios(data ?? [])
    setCarregando(false)
  }

  function abrirNovo() {
    setForm(formVazio)
    setErro('')
    setSucesso('')
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setForm(formVazio)
    setErro('')
    setSucesso('')
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    setSucesso('')

    const { data, error } = await supabase.functions.invoke('criar-usuario', {
      body: {
        nome: form.nome,
        email: form.email,
        senha: form.senha,
        perfil: form.perfil,
      },
    })

    if (error || data?.error) {
      setErro(data?.error ?? 'Erro ao criar usuário.')
      setSalvando(false)
      return
    }

    setSucesso('Usuário criado com sucesso!')
    await carregar()
    setForm(formVazio)
    setSalvando(false)
  }

  async function alterarPerfil(id, novoPerfil) {
    await supabase.from('usuarios').update({ perfil: novoPerfil }).eq('id', id)
    setUsuarios(prev =>
      prev.map(u => u.id === id ? { ...u, perfil: novoPerfil } : u)
    )
  }

  function formatarData(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  }

  return (
    <AdminLayout>
      <div className={styles.header}>
        <h1 className={styles.titulo}>Usuários</h1>
        <button onClick={abrirNovo} className={styles.btnNovo}>+ Novo usuário</button>
      </div>

      {carregando ? (
        <p className={styles.info}>Carregando...</p>
      ) : usuarios.length === 0 ? (
        <p className={styles.info}>Nenhum usuário cadastrado.</p>
      ) : (
        <div className={styles.tabela}>
          <div className={styles.tabelaHeader}>
            <span>Nome</span>
            <span>E-mail</span>
            <span>Perfil</span>
            <span>Desde</span>
          </div>
          {usuarios.map(u => (
            <div key={u.id} className={styles.tabelaLinha}>
              <span className={styles.nome}>{u.nome}</span>
              <span className={styles.email}>{u.email}</span>
              <select
                value={u.perfil}
                onChange={e => alterarPerfil(u.id, e.target.value)}
                className={`${styles.perfilSelect} ${ESTILO_PERFIL[u.perfil] ?? ''}`}
              >
                <option value="cliente">Cliente</option>
                <option value="filho_santo">Filho de Santo</option>
                <option value="admin">Admin</option>
              </select>
              <span className={styles.data}>{formatarData(u.criado_em)}</span>
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <div className={styles.overlay} onClick={fecharModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitulo}>Novo usuário</h2>

            <form onSubmit={salvar} className={styles.form}>
              <label className={styles.label}>
                Nome
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  required
                  autoFocus
                  className={styles.input}
                  placeholder="Nome completo"
                />
              </label>

              <label className={styles.label}>
                E-mail
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  className={styles.input}
                  placeholder="email@exemplo.com"
                />
              </label>

              <label className={styles.label}>
                Senha
                <input
                  type="password"
                  value={form.senha}
                  onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                  required
                  minLength={6}
                  className={styles.input}
                  placeholder="Mínimo 6 caracteres"
                />
              </label>

              <label className={styles.label}>
                Perfil
                <select
                  value={form.perfil}
                  onChange={e => setForm(f => ({ ...f, perfil: e.target.value }))}
                  className={styles.input}
                >
                  <option value="cliente">Cliente</option>
                  <option value="filho_santo">Filho de Santo</option>
                  <option value="admin">Admin</option>
                </select>
              </label>

              {erro && <p className={styles.erro}>{erro}</p>}
              {sucesso && <p className={styles.sucesso}>{sucesso}</p>}

              <div className={styles.modalAcoes}>
                <button type="button" onClick={fecharModal} className={styles.btnCancelar}>
                  {sucesso ? 'Fechar' : 'Cancelar'}
                </button>
                {!sucesso && (
                  <button type="submit" disabled={salvando} className={styles.btnSalvar}>
                    {salvando ? 'Criando...' : 'Criar usuário'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
