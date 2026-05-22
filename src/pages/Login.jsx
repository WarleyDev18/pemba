import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import styles from './Login.module.css'

const OpaxoroLogo = () => (
  <svg width="36" height="36" viewBox="0 0 30 30" aria-hidden="true">
    <rect x="11" y="1" width="8" height="26" rx="4" fill="#B8B8C0"/>
    <ellipse cx="15" cy="1" rx="11" ry="3.5" fill="#D0D0D8"/>
    <path d="M15,0 Q7,-4 3,0 Q8,3.5 11,3 Q15,3 15,0Z" fill="#D8D8E0"/>
    <path d="M15,0 Q23,-4 27,0 Q22,3.5 19,3 Q15,3 15,0Z" fill="#D8D8E0"/>
    <circle cx="15" cy="0" r="4" fill="#EBEBF4"/>
    <ellipse cx="15" cy="11" rx="7" ry="2.5" fill="#D0D0D8"/>
    <ellipse cx="15" cy="18" rx="9" ry="3" fill="#C8C8D0"/>
    <circle cx="15" cy="7" r="2.5" fill="#E0E0E8"/>
    <circle cx="15" cy="14.5" r="2.5" fill="#E0E0E8"/>
    <ellipse cx="15" cy="27" rx="11" ry="4" fill="#C0C0C8"/>
  </svg>
)

export default function Login() {
  const [aba, setAba] = useState('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [tipoCadastro, setTipoCadastro] = useState('cliente')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [carregando, setCarregando] = useState(false)
  const { login, user, perfil } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && perfil) {
      navigate(perfil === 'admin' ? '/admin' : '/dashboard', { replace: true })
    }
  }, [user, perfil, navigate])

  function trocarAba(novaAba) {
    setAba(novaAba)
    setErro('')
    setSucesso('')
    setEmail('')
    setSenha('')
    setNome('')
    setTipoCadastro('cliente')
    setConfirmarSenha('')
  }

  async function handleEntrar(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      await login(email, senha)
    } catch {
      setErro('Email ou senha inválidos.')
      setCarregando(false)
    }
  }

  async function handleCadastrar(e) {
    e.preventDefault()
    setErro('')
    setSucesso('')

    if (!nome.trim()) { setErro('Informe seu nome.'); return }
    if (senha.length < 6) { setErro('A senha deve ter no mínimo 6 caracteres.'); return }
    if (senha !== confirmarSenha) { setErro('As senhas não coincidem.'); return }

    setCarregando(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: senha,
        options: { data: { nome: nome.trim(), perfil: tipoCadastro } },
      })

      if (error) throw error

      if (data.session) {
        // Email confirmation desabilitado — usuário já está logado
      } else {
        // Email confirmation habilitado — aguardar confirmação
        setSucesso('Cadastro realizado! Verifique seu email para ativar a conta.')
        setCarregando(false)
      }
    } catch (err) {
      if (err.message?.includes('already registered')) {
        setErro('Este email já está cadastrado.')
      } else {
        setErro(err.message ?? 'Erro ao criar conta. Tente novamente.')
      }
      setCarregando(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logoBox}>
          <OpaxoroLogo />
        </div>
        <h1 className={styles.titulo}>Pemba</h1>
        <p className={styles.subtitulo}>Terreiro de Umbanda</p>

        <div className={styles.abas}>
          <button
            type="button"
            onClick={() => trocarAba('entrar')}
            className={`${styles.aba} ${aba === 'entrar' ? styles.abaAtiva : ''}`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => trocarAba('cadastrar')}
            className={`${styles.aba} ${aba === 'cadastrar' ? styles.abaAtiva : ''}`}
          >
            Cadastrar
          </button>
        </div>

        {aba === 'entrar' ? (
          <form onSubmit={handleEntrar} className={styles.form}>
            <label className={styles.label}>
              Email
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={styles.input}
              />
            </label>

            <label className={styles.label}>
              Senha
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                required
                autoComplete="current-password"
                className={styles.input}
              />
            </label>

            {erro && <p className={styles.erro}>{erro}</p>}

            <button type="submit" disabled={carregando} className={styles.botao}>
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCadastrar} className={styles.form}>
            <div className={styles.tipoGroup}>
              <button
                type="button"
                onClick={() => setTipoCadastro('cliente')}
                className={`${styles.tipoBotao} ${tipoCadastro === 'cliente' ? styles.tipoBotaoAtivo : ''}`}
              >
                <strong>Cliente</strong>
                <span>Busco serviços espirituais</span>
              </button>
              <button
                type="button"
                onClick={() => setTipoCadastro('filho_santo')}
                className={`${styles.tipoBotao} ${tipoCadastro === 'filho_santo' ? styles.tipoBotaoAtivo : ''}`}
              >
                <strong>Filho de Santo</strong>
                <span>Sou membro do terreiro</span>
              </button>
            </div>

            <label className={styles.label}>
              Nome completo
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                required
                autoFocus
                className={styles.input}
                placeholder="Seu nome"
              />
            </label>

            <label className={styles.label}>
              Email
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={styles.input}
              />
            </label>

            <label className={styles.label}>
              Senha
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className={styles.input}
                placeholder="Mínimo 6 caracteres"
              />
            </label>

            <label className={styles.label}>
              Confirmar senha
              <input
                type="password"
                value={confirmarSenha}
                onChange={e => setConfirmarSenha(e.target.value)}
                required
                autoComplete="new-password"
                className={styles.input}
              />
            </label>

            {erro && <p className={styles.erro}>{erro}</p>}
            {sucesso && <p className={styles.sucesso}>{sucesso}</p>}

            {!sucesso && (
              <button type="submit" disabled={carregando} className={styles.botao}>
                {carregando ? 'Criando conta...' : 'Criar conta'}
              </button>
            )}

            {sucesso && (
              <button
                type="button"
                onClick={() => trocarAba('entrar')}
                className={styles.botao}
              >
                Ir para o login
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
