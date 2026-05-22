import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import PublicoLayout from '../../components/PublicoLayout'
import styles from './Comunicados.module.css'

export default function PublicoComunicados() {
  const [comunicados, setComunicados] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase
        .from('comunicados')
        .select('*')
        .eq('publico', true)
        .order('criado_em', { ascending: false })
      setComunicados(data ?? [])
      setCarregando(false)
    }
    carregar()
  }, [])

  function formatarData(iso) {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
    })
  }

  return (
    <PublicoLayout>
      <h1 className={styles.titulo}>Comunicados</h1>

      {carregando ? (
        <p className={styles.info}>Carregando...</p>
      ) : comunicados.length === 0 ? (
        <p className={styles.info}>Nenhum comunicado disponível no momento.</p>
      ) : (
        <div className={styles.lista}>
          {comunicados.map(c => (
            <div key={c.id} className={styles.card}>
              <h2 className={styles.cardTitulo}>{c.titulo}</h2>
              <p className={styles.cardConteudo}>{c.conteudo}</p>
              <span className={styles.cardData}>{formatarData(c.criado_em)}</span>
            </div>
          ))}
        </div>
      )}
    </PublicoLayout>
  )
}
