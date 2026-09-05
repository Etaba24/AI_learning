import { useEffect, useRef } from 'react'
import { getAccessToken, getWebSocketUrl } from '../api/client'

const RECONNECT_DELAY_MS = 3000

/** Abonnement temps réel générique à un ou plusieurs "topics" (ex:
 * `admin_dashboard`, `catalogue`...) : le serveur pousse un événement à
 * chaque fois que les données concernées changent, peu importe qui les a
 * modifiées ou par quel chemin (vue, import en masse, admin Django...).
 * Ce canal ne transporte jamais la donnée elle-même — juste le signal —
 * `onEvent` est donc rappelé pour déclencher un re-fetch ciblé via l'API
 * REST habituelle, qui reste l'unique source de vérité.
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

    function connect() {
      const token = getAccessToken()
      if (!token || cancelled) return

      socket = new WebSocket(
        `${getWebSocketUrl('/ws/temps-reel/')}?token=${encodeURIComponent(token)}&topics=${encodeURIComponent(topicsKey)}`,
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
