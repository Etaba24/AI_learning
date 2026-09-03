// Vite n'expose au code client que les variables préfixées VITE_ (sécurité :
// évite d'embarquer accidentellement un secret serveur dans le bundle JS).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const ACCESS_KEY = 'ai_learning_access'
const REFRESH_KEY = 'ai_learning_refresh'

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function setTokens(tokens: { access: string; refresh?: string }): void {
  localStorage.setItem(ACCESS_KEY, tokens.access)
  if (tokens.refresh) {
    localStorage.setItem(REFRESH_KEY, tokens.refresh)
  }
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
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

  const doFetch = (accessToken: string | null) =>
    fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

  let response = await doFetch(skipAuth ? null : getAccessToken())

  if (response.status === 401 && !skipAuth && getRefreshToken()) {
    const newAccessToken = await refreshAccessToken()
    response = await doFetch(newAccessToken)
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
