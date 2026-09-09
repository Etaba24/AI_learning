import { useEffect, useRef } from 'react'
import { apiFetch, getAccessToken, getWebSocketUrl } from '../api/client'

const RECONNECT_DELAY_MS = 3000

/** Abonnement temps réel générique à un ou plusieurs "topics" (ex:
 * `admin_dashboard`, `catalogue`...) : le serveur pousse un événement à
 * chaque fois que les données concernées changent, peu importe qui les a
 * modifiées ou par quel chemin (vue, import en masse, admin Django...).
 * Ce canal ne transporte jamais la donnée elle-même — juste le signal —
 * `onEvent` est donc rappelé pour déclencher un re-fetch ciblé via l'API
 * REST habituelle, qui reste l'unique source de vérité.
 *
 * Authentifié par un TICKET à usage unique (minté via /auth/ws-ticket/,
 * un appel REST classique donc protégé par le header Authorization), plutôt
 * que le jeton JWT complet placé en clair dans l'URL.
 *
 * Remplace le bouton "Actualiser"/le rechargement manuel : la page reste
 * synchronisée automatiquement tant qu'elle est ouverte. */
export function useRealtimeTopics(topics: string[], onEvent: () => void) {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const topicsKey = topics.join(',')

  useEffect(() => {
    if (!topicsKey) return

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

      socket = new WebSocket(
        `${getWebSocketUrl('/ws/temps-reel/')}?ticket=${encodeURIComponent(ticket)}&topics=${encodeURIComponent(topicsKey)}`,
      )

      socket.onmessage = () => onEventRef.current()

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
  }, [topicsKey])
}
