import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiFetch, clearTokens, getAccessToken, getRefreshToken, onSessionExpired, setTokens } from '../api/client'
import type { MonAbonnement, User } from '../api/types'
import { useToast } from '../components/ToastContext'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<User>
  // Pour les connexions qui obtiennent déjà des jetons autrement qu'avec un
  // mot de passe (Google) : on stocke les jetons reçus et on récupère le
  // profil, sans repasser par /auth/login/.
  loginWithTokens: (tokens: { access: string; refresh: string }) => Promise<User>
  logout: () => Promise<void>
  // Recharge le profil depuis le serveur (ex: après modification dans la
  // page Paramètres) pour que le nom/avatar affichés dans la sidebar et le
  // menu profil se mettent à jour sans recharger la page.
  refreshUser: () => Promise<void>
  // Statut d'abonnement centralisé ici (et pas re-fetché localement dans
  // chaque page) : sans ça, le bandeau du pied de sidebar — qui ne
  // remonte jamais entre deux pages de l'espace apprenant — reste bloqué
  // sur l'ancien statut après une rétrogradation/réabonnement ailleurs.
  abonnement: MonAbonnement | null
  refreshAbonnement: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  // Tant qu'on n'a pas vérifié s'il y a un token valide en sessionStorage, on
  // ne sait pas encore si l'utilisateur est connecté -> évite un flash vers
  // /login au rechargement de page alors qu'une session existe déjà.
  const [isLoading, setIsLoading] = useState(true)
  const [abonnement, setAbonnement] = useState<MonAbonnement | null>(null)

  // Point d'ancrage utilisé par api/client.ts (qui n'a pas accès au contexte
  // React) : dès qu'une requête authentifiée constate que la session est
  // morte (jeton invalide + rafraîchissement impossible), on vide `user`
  // immédiatement — ProtectedRoute redirige alors vers /login avant que la
  // page en cours ne continue à tourner avec des données qu'elle ne peut
  // plus charger.
  useEffect(() => {
    onSessionExpired(() => {
      setUser(null)
      setAbonnement(null)
      showToast('error', 'Votre session a expiré, merci de vous reconnecter.')
    })
  }, [showToast])

  async function loadAbonnement() {
    try {
      setAbonnement(await apiFetch<MonAbonnement>('/mon-abonnement/'))
    } catch {
      setAbonnement(null)
    }
  }

  useEffect(() => {
    async function loadCurrentUser() {
      if (!getAccessToken()) {
        setIsLoading(false)
        return
      }
      try {
        const me = await apiFetch<User>('/users/me/')
        setUser(me)
        await loadAbonnement()
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
    await loadAbonnement()
    return me
  }

  async function loginWithTokens(tokens: { access: string; refresh: string }): Promise<User> {
    setTokens(tokens)
    const me = await apiFetch<User>('/users/me/')
    setUser(me)
    await loadAbonnement()
    return me
  }

  async function logout(): Promise<void> {
    try {
      const refresh = getRefreshToken()
      if (refresh) {
        await apiFetch('/auth/logout/', {
          method: 'POST',
          body: { refresh },
        })
      }
    } catch {
      // On ne bloque jamais la déconnexion locale si le backend refuse la
      // revocation du refresh token (token déjà expiré/blacklisté).
    } finally {
      clearTokens()
      setUser(null)
      setAbonnement(null)
    }
  }

  async function refreshUser() {
    const me = await apiFetch<User>('/users/me/')
    setUser(me)
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, loginWithTokens, logout, refreshUser, abonnement, refreshAbonnement: loadAbonnement }}
    >
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
