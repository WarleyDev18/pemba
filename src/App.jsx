import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import Login from './pages/Login'

import AdminDashboard from './pages/admin/Dashboard'
import AdminComunicados from './pages/admin/Comunicados'
import AdminEventos from './pages/admin/Eventos'
import AdminAgendamentos from './pages/admin/Agendamentos'
import AdminEbos from './pages/admin/Ebos'
import AdminFinanceiro from './pages/admin/Financeiro'
import AdminChatLista from './pages/admin/ChatLista'
import AdminChatConversa from './pages/admin/ChatConversa'
import AdminDoacoes from './pages/admin/Doacoes'
import AdminUsuarios from './pages/admin/Usuarios'

import PublicoDashboard from './pages/publico/Dashboard'
import PublicoComunicados from './pages/publico/Comunicados'
import PublicoEventos from './pages/publico/Eventos'
import PublicoAgendamentos from './pages/publico/Agendamentos'
import PublicoEbos from './pages/publico/Ebos'
import PublicoChat from './pages/publico/Chat'
import PublicoDoacao from './pages/publico/Doacao'

function RedirectByPerfil() {
  const { user, perfil, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (perfil === 'admin') return <Navigate to="/admin" replace />
  return <Navigate to="/dashboard" replace />
}

function AdminRoute({ children }) {
  return <ProtectedRoute perfilRequerido="admin">{children}</ProtectedRoute>
}

function PublicoRoute({ children }) {
  return <ProtectedRoute perfilRequerido={['filho_santo', 'cliente']}>{children}</ProtectedRoute>
}

function FilhoSantoRoute({ children }) {
  return <ProtectedRoute perfilRequerido="filho_santo">{children}</ProtectedRoute>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Rotas admin */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/comunicados" element={<AdminRoute><AdminComunicados /></AdminRoute>} />
          <Route path="/admin/eventos" element={<AdminRoute><AdminEventos /></AdminRoute>} />
          <Route path="/admin/agendamentos" element={<AdminRoute><AdminAgendamentos /></AdminRoute>} />
          <Route path="/admin/ebos" element={<AdminRoute><AdminEbos /></AdminRoute>} />
          <Route path="/admin/financeiro" element={<AdminRoute><AdminFinanceiro /></AdminRoute>} />
          <Route path="/admin/chat" element={<AdminRoute><AdminChatLista /></AdminRoute>} />
          <Route path="/admin/chat/:conversa_id" element={<AdminRoute><AdminChatConversa /></AdminRoute>} />
          <Route path="/admin/doacoes" element={<AdminRoute><AdminDoacoes /></AdminRoute>} />
          <Route path="/admin/usuarios" element={<AdminRoute><AdminUsuarios /></AdminRoute>} />

          {/* Rotas público */}
          <Route path="/dashboard" element={<PublicoRoute><PublicoDashboard /></PublicoRoute>} />
          <Route path="/dashboard/comunicados" element={<PublicoRoute><PublicoComunicados /></PublicoRoute>} />
          <Route path="/dashboard/eventos" element={<PublicoRoute><PublicoEventos /></PublicoRoute>} />
          <Route path="/dashboard/agendamentos" element={<PublicoRoute><PublicoAgendamentos /></PublicoRoute>} />
          <Route path="/dashboard/ebos" element={<PublicoRoute><PublicoEbos /></PublicoRoute>} />
          <Route path="/dashboard/chat" element={<PublicoRoute><PublicoChat /></PublicoRoute>} />
          <Route path="/dashboard/doacao" element={<PublicoRoute><PublicoDoacao /></PublicoRoute>} />

          <Route path="*" element={<RedirectByPerfil />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
