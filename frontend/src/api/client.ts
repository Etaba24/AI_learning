// Vite n'expose au code client que les variables préfixées VITE_ (sécurité :
// évite d'embarquer accidentellement un secret serveur dans le bundle JS).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const ACCESS_KEY = 'ai_learning_access'
const REFRESH_KEY = 'ai_learning_refresh'

// sessionStorage (pas localStorage) : la session ne doit jamais survivre à
// la fermeture du navigateur, quel que soit le rôle — un onglet rouvert
// après coup doit repasser par /login, pas hériter d'une session active
// (particulièrement sensible pour un compte admin sur un poste partagé).
// Reste disponible entre un rechargement de page et une navigation dans le
// même onglet, contrairement à une variable en mémoire.
export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_KEY)
}

/** Construit une URL ws(s):// vers le même serveur que l'API REST — même
 * host/port, même bascule http->ws / https->wss, mais sans le suffixe
 * `/api` (les routes WebSocket vivent à la racine, sous `/ws/`). */
export function getWebSocketUrl(path: string): string {
  const apiUrl = new URL(API_BASE_URL)
  const wsProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${wsProtocol}//${apiUrl.host}${path}`
}

export function getRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_KEY)
}

export function setTokens(tokens: { access: string; refresh?: string }): void {
  sessionStorage.setItem(ACCESS_KEY, tokens.access)
  if (tokens.refresh) {
    sessionStorage.setItem(REFRESH_KEY, tokens.refresh)
  }
}

export function clearTokens(): void {
  sessionStorage.removeItem(ACCESS_KEY)
  sessionStorage.removeItem(REFRESH_KEY)
}

type SessionExpiredHandler = () => void
let sessionExpiredHandler: SessionExpiredHandler | null = null

/** Point d'ancrage pour AuthContext (ce module n'a pas accès au contexte
 * React) : appelé une fois la session définitivement morte (jeton invalide
 * ET rafraîchissement impossible), pour qu'il vide son état `user` — ce qui
 * fait immédiatement rediriger ProtectedRoute vers /login, avant que la
 * page en cours ne continue à tourner avec des données qu'elle ne peut
 * plus charger. */
export function onSessionExpired(handler: SessionExpiredHandler): void {
  sessionExpiredHandler = handler
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** DRF renvoie les erreurs sous des formes différentes selon le cas :
 * { detail: "..." } (permissions, 404...) ou { champ: ["message", ...] } /
 * { non_field_errors: [...] } (erreurs de validation de serializer, le cas
 * le plus fréquent). Sans ce mapping, toute erreur de validation retombait
 * sur un message générique inutile ("Une erreur est survenue"). */
function extractErrorMessage(body: unknown): string {
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>

    if (typeof obj.detail === 'string') {
      return obj.detail
    }

    const messages = Object.values(obj)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value): value is string => typeof value === 'string')

    if (messages.length > 0) {
      return messages.join(' ')
    }
  }
  return 'Une erreur est survenue.'
}

async function refreshAccessToken(): Promise<string> {
  const refresh = getRefreshToken()
  if (!refresh) {
    throw new ApiError(401, 'Aucune session active.')
  }

  const res = await fetch(`${API_BASE_URL}/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })

  if (!res.ok) {
    clearTokens()
    throw new ApiError(res.status, 'Session expirée, merci de vous reconnecter.')
  }

  // Le backend fait tourner (rotate) les refresh tokens à chaque appel :
  // il faut sauvegarder le NOUVEAU refresh token renvoyé ici, sinon le
  // prochain rafraîchissement échouera (ancien token déjà blacklisté).
  const data: { access: string; refresh?: string } = await res.json()
  setTokens(data)
  return data.access
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  skipAuth?: boolean
  body?: unknown
}

/** Petit wrapper autour de fetch : ajoute le token, réessaie une fois après
 * un refresh si le token a expiré (401), et parse le JSON. */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { skipAuth, headers, body, ...rest } = options
  // Upload de fichier (FormData) : ne JAMAIS fixer Content-Type nous-mêmes —
  // le navigateur doit y ajouter la "boundary" multipart lui-même. Tout le
  // reste (JSON) garde le comportement existant, inchangé.
  const isFormData = body instanceof FormData

  const doFetch = (accessToken: string | null) =>
    fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    })

  let response = await doFetch(skipAuth ? null : getAccessToken())
  let sessionDead = false

  if (response.status === 401 && !skipAuth) {
    if (getRefreshToken()) {
      try {
        const newAccessToken = await refreshAccessToken()
        response = await doFetch(newAccessToken)
        sessionDead = response.status === 401
      } catch {
        sessionDead = true
      }
    } else {
      sessionDead = true
    }
  }

  // Jeton invalide ET rafraîchissement impossible/refusé : la session est
  // bel et bien morte. On coupe court ici plutôt que de laisser l'appelant
  // recevoir une simple erreur 401 qu'il afficherait comme un message
  // d'échec ordinaire — la priorité absolue est de renvoyer vers /login.
  if (sessionDead) {
    clearTokens()
    sessionExpiredHandler?.()
    throw new ApiError(401, 'Session expirée, merci de vous reconnecter.')
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new ApiError(response.status, extractErrorMessage(errorBody))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
