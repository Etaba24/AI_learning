import { useEffect, useRef } from 'react'
import { apiFetch, getAccessToken, getWebSocketUrl } from '../api/client'

const RECONNECT_DELAY_MS = 3000

/** Connexion temps réel à la messagerie (apprenant <-> formateur) : un seul
 * canal WebSocket qui pousse un événement à chaque nouveau message
 * concernant l'utilisateur connecté — remplace le polling (setInterval)
 * précédemment utilisé pour rafraîchir la liste de contacts et le fil ouvert.
 *
 * Authentifié par un TICKET à usage unique (minté via /auth/ws-ticket/,
 * un appel REST classique donc protégé par le header Authorization), plutôt
 * que le jeton JWT complet placé en clair dans l'URL — celui-ci resterait
 * exploitable jusqu'à 30 min s'il fuitait dans un log d'accès/proxy.
 *
 * Le canal est en écoute seule côté client : l'envoi de messages continue
 * de passer par l'API REST existante, qui applique déjà toute la règle
 * métier (premium + inscription). `onMessage` est juste rappelé pour
 * déclencher un re-fetch ciblé (liste de contacts, fil ouvert). */
export function useChatSocket(onMessage: () => void) {
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  useEffect(() => {
    let socket: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    async function connect() {
      if (!getAccessToken() || cancelled) return

      let ticket: string
      try {
        const result = await apiFetch<{ ticket: string }>('/auth/ws-ticket/', { method: 'POST' })
        ticket = result.ticket
      } catch {
        if (!cancelled) reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS)
        return
      }
      if (cancelled) return

      socket = new WebSocket(`${getWebSocketUrl('/ws/messagerie/')}?ticket=${encodeURIComponent(ticket)}`)

      socket.onmessage = () => onMessageRef.current()

      socket.onclose = () => {
        if (!cancelled) {
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS)
        }
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [])
}
