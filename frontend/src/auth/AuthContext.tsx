import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiFetch, clearTokens, getAccessToken, setTokens } from '../api/client'
import type { User } from '../api/types'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  // Tant qu'on n'a pas vérifié s'il y a un token valide en localStorage, on
  // ne sait pas encore si l'utilisateur est connecté -> évite un flash vers
  // /login au rechargement de page alors qu'une session existe déjà.
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadCurrentUser() {
      if (!getAccessToken()) {
        setIsLoading(false)
        return
      }
      try {
        const me = await apiFetch<User>('/users/me/')
        setUser(me)
      } catch {
        clearTokens()
      } finally {
        setIsLoading(false)
      }
    }
    loadCurrentUser()
  }, [])

  async function login(email: string, password: string): Promise<User> {
    const tokens = await apiFetch<{ access: string; refresh: string }>('/auth/login/', {
      method: 'POST',
      skipAuth: true,
      body: { email, password },
    })
    setTokens(tokens)
    const me = await apiFetch<User>('/users/me/')
    setUser(me)
    return me
  }

  function logout() {
    clearTokens()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>.')
  }
  return ctx
}
