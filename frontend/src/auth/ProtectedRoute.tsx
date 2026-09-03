import { Navigate, Outlet } from 'react-router-dom'
import type { Role } from '../api/types'
import { useAuth } from './AuthContext'

interface ProtectedRouteProps {
  allowedRoles?: Role[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <p className="p-8 text-center text-slate-500">Chargement...</p>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <p className="p-8 text-center text-red-600">
        Accès refusé : votre rôle ({user.role}) n'a pas les droits nécessaires pour cette page.
      </p>
    )
  }

  return <Outlet />
}
