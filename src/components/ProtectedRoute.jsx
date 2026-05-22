import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children, perfilRequerido }) {
  const { user, perfil, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafaf7', color: '#8B6914' }}>
        Carregando...
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (perfilRequerido) {
    const allowed = Array.isArray(perfilRequerido) ? perfilRequerido : [perfilRequerido]
    if (!allowed.includes(perfil)) {
      return <Navigate to={perfil === 'admin' ? '/admin' : '/dashboard'} replace />
    }
  }

  return children
}
