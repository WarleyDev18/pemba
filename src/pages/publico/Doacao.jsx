import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import PublicoLayout from '../../components/PublicoLayout'
import styles from './Doacao.module.css'

const VALORES_SUGERIDOS = [10, 20, 50, 100]
const METODOS = [
  { id: 'pix', label: 'PIX', desc: 'Aprovação imediata' },
  { id: 'boleto', label: 'Boleto', desc: 'Vence em 3 dias úteis' },
  { id: 'cartao', label: 'Cartão de Crédito', desc: 'Aprovação em instantes' },
]

export default function PublicoDoacao() {
  const { user } = useAuth()
  const [passo, setPasso] = useState(1)
  const [valor, setValor] = useState('')
  const [valorCustom, setValorCustom] = useState('')
  const [metodo, setMetodo] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [processando, setProcessando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState('')
  const [historico, setHistorico] = useState([])
  const [carregandoHist, setCarregandoHist] = useState(true)

  useEffect(() => { carregarHistorico() }, [user])

  async function carregarHistorico() {
    if (!user) return
    const { data } = await supabase
      .from('doacoes')
      .select('*')
      .eq('usuario_id', user.id)
      .order('criado_em', { ascending: false })
      .limit(10)
    setHistorico(data ?? [])
    setCarregandoHist(false)
  }

  const valorFinal = valor === 'custom' ? parseFloat(valorCustom) : parseFloat(valor)

  function irParaPasso2() {
    if (!valorFinal || valorFinal < 5) {
      setErro('Valor mínimo: R$ 5,00')
      return
    }
    setErro('')
    setPasso(2)
  }

  function irParaPasso3() {
    if (!metodo) {
      setErro('Escolha um método de pagamento.')
      return
    }
    setErro('')
    setPasso(3)
  }

  async function processar() {
    setProcessando(true)
    setErro('')

    try {
      const { data, error } = await supabase.functions.invoke('processar-doacao', {
        body: {
          usuario_id: user.id,
          valor: valorFinal,
          metodo,
          descricao: mensagem || 'Doação ao Terreiro Pemba',
        },
      })

      if (error) throw error

      setResultado(data)

      if (data.link && metodo !== 'pix') {
        window.open(data.link, '_blank')
      }
    } catch (e) {
      setErro('Erro ao processar doação. Tente novamente.')
    } finally {
      setProcessando(false)
    }
  }

  async function verificarStatus() {
    if (!resultado?.doacao_id) return
    const { data } = await supabase
      .from('doacoes')
      .select('status')
      .eq('id', resultado.doacao_id)
      .single()

    if (data?.status === 'aprovado') {
      alert('Doação confirmada! Axé e muito obrigado! 🙏')
      setPasso(1)
      setResultado(null)
      setValor('')
      setMetodo('')
      setMensagem('')
      carregarHistorico()
    } else {
      alert('Pagamento ainda não confirmado. Aguarde alguns instantes.')
    }
  }

  function reiniciar() {
    setPasso(1)
    setResultado(null)
    setValor('')
    setValorCustom('')
    setMetodo('')
    setMensagem('')
    setErro('')
  }

  function brl(v) {
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function formatarData(iso) {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const COR_STATUS = {
    pendente:  { bg: '#FEF9EE', cor: '#8B6914', label: 'Pendente' },
    aprovado:  { bg: '#EEF7EE', cor: '#1B5E20', label: 'Aprovado' },
    cancelado: { bg: '#FEF0EE', cor: '#8B1A1A', label: 'Cancelado' },
  }

  return (
    <PublicoLayout>
      <h1 className={styles.titulo}>Fazer uma Doação</h1>

      {/* Indicador de passos */}
      <div className={styles.passos}>
        {[1, 2, 3].map(p => (
          <div key={p} className={`${styles.passo} ${passo >= p ? styles.passoAtivo : ''}`}>
            <div className={styles.passoBola}>{p}</div>
            <span>{p === 1 ? 'Valor' : p === 2 ? 'Método' : 'Pagamento'}</span>
          </div>
        ))}
      </div>

      <div className={styles.card}>
        {/* PASSO 1 — Valor */}
        {passo === 1 && !resultado && (
          <div className={styles.formSection}>
            <h2 className={styles.secaoTitulo}>Escolha o valor</h2>
            <div className={styles.valoresGrid}>
              {VALORES_SUGERIDOS.map(v => (
                <button
                  key={v}
                  onClick={() => { setValor(String(v)); setValorCustom('') }}
                  className={`${styles.valorBtn} ${valor === String(v) ? styles.valorBtnAtivo : ''}`}
                >
                  {brl(v)}
                </button>
              ))}
            </div>

            <label className={styles.label}>
              Outro valor
              <div className={styles.inputPrefix}>
                <span className={styles.prefix}>R$</span>
                <input
                  type="number"
                  min="5"
                  step="1"
                  value={valorCustom}
                  onChange={e => { setValorCustom(e.target.value); setValor('custom') }}
                  placeholder="0,00"
                  className={styles.input}
                />
              </div>
            </label>

            <label className={styles.label}>
              Mensagem / Intenção (opcional)
              <textarea
                value={mensagem}
                onChange={e => setMensagem(e.target.value)}
                rows={2}
                placeholder="Ex: Para saúde da família, em gratidão..."
                className={styles.textarea}
              />
            </label>

            {erro && <p className={styles.erro}>{erro}</p>}

            <button onClick={irParaPasso2} className={styles.btnPrimario}>
              Continuar →
            </button>
          </div>
        )}

        {/* PASSO 2 — Método */}
        {passo === 2 && !resultado && (
          <div className={styles.formSection}>
            <h2 className={styles.secaoTitulo}>Escolha o método</h2>
            <p className={styles.resumoValor}>Valor: <strong>{brl(valorFinal)}</strong></p>

            <div className={styles.metodosList}>
              {METODOS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMetodo(m.id)}
                  className={`${styles.metodoBtn} ${metodo === m.id ? styles.metodoBtnAtivo : ''}`}
                >
                  <span className={styles.metodoLabel}>{m.label}</span>
                  <span className={styles.metodoDesc}>{m.desc}</span>
                </button>
              ))}
            </div>

            {erro && <p className={styles.erro}>{erro}</p>}

            <div className={styles.btnRow}>
              <button onClick={() => setPasso(1)} className={styles.btnSecundario}>← Voltar</button>
              <button onClick={irParaPasso3} className={styles.btnPrimario}>Continuar →</button>
            </div>
          </div>
        )}

        {/* PASSO 3 — Pagamento */}
        {passo === 3 && !resultado && (
          <div className={styles.formSection}>
            <h2 className={styles.secaoTitulo}>Confirmar doação</h2>
            <div className={styles.resumo}>
              <div className={styles.resumoLinha}>
                <span>Valor</span><strong>{brl(valorFinal)}</strong>
              </div>
              <div className={styles.resumoLinha}>
                <span>Método</span><strong>{METODOS.find(m => m.id === metodo)?.label}</strong>
              </div>
              {mensagem && (
                <div className={styles.resumoLinha}>
                  <span>Intenção</span><em className={styles.resumoMsg}>"{mensagem}"</em>
                </div>
              )}
            </div>

            {erro && <p className={styles.erro}>{erro}</p>}

            <div className={styles.btnRow}>
              <button onClick={() => setPasso(2)} className={styles.btnSecundario}>← Voltar</button>
              <button onClick={processar} disabled={processando} className={styles.btnPrimario}>
                {processando ? 'Processando...' : 'Doar agora'}
              </button>
            </div>
          </div>
        )}

        {/* RESULTADO */}
        {resultado && (
          <div className={styles.formSection}>
            <h2 className={styles.secaoTitulo}>
              {resultado.metodo === 'pix' ? 'Pague via PIX' : 'Finalize o pagamento'}
            </h2>

            {resultado.metodo === 'pix' && resultado.qr_code && (
              <div className={styles.pixContainer}>
                <img
                  src={`data:image/png;base64,${resultado.qr_code}`}
                  alt="QR Code PIX"
                  className={styles.qrCode}
                />
                {resultado.qr_texto && (
                  <div className={styles.pixCopiaCola}>
                    <p className={styles.pixLabel}>Copia e Cola:</p>
                    <div className={styles.pixCodigo}>
                      <code>{resultado.qr_texto}</code>
                      <button
                        onClick={() => navigator.clipboard.writeText(resultado.qr_texto)}
                        className={styles.btnCopiar}
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {resultado.metodo !== 'pix' && resultado.link && (
              <div className={styles.linkContainer}>
                <p className={styles.linkMsg}>Uma nova aba foi aberta com o link de pagamento.</p>
                <a href={resultado.link} target="_blank" rel="noopener noreferrer" className={styles.btnLink}>
                  Abrir link de pagamento
                </a>
              </div>
            )}

            <div className={styles.aguardando}>
              <button onClick={verificarStatus} className={styles.btnVerificar}>
                Já paguei — verificar status
              </button>
              <button onClick={reiniciar} className={styles.btnSecundario}>Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {/* Histórico */}
      <div className={styles.historico}>
        <h2 className={styles.historicoTitulo}>Minhas doações</h2>
        {carregandoHist ? (
          <p className={styles.info}>Carregando...</p>
        ) : historico.length === 0 ? (
          <p className={styles.info}>Nenhuma doação realizada ainda.</p>
        ) : (
          <div className={styles.historicoLista}>
            {historico.map(d => (
              <div key={d.id} className={styles.historicoItem}>
                <div className={styles.historicoEsq}>
                  <span className={styles.historicoValor}>{brl(d.valor)}</span>
                  <span className={styles.historicoMet}>{d.metodo?.toUpperCase()}</span>
                </div>
                <div className={styles.historicoDir}>
                  <span
                    className={styles.statusBadge}
                    style={{ background: COR_STATUS[d.status]?.bg, color: COR_STATUS[d.status]?.cor }}
                  >
                    {COR_STATUS[d.status]?.label ?? d.status}
                  </span>
                  <span className={styles.historicoData}>{formatarData(d.criado_em)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PublicoLayout>
  )
}
