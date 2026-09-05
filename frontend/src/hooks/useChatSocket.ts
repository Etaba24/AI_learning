import { useEffect, useRef } from 'react'
import { getAccessToken, getWebSocketUrl } from '../api/client'

const RECONNECT_DELAY_MS = 3000

/** Connexion temps réel à la messagerie (apprenant <-> formateur) : un seul
 * canal WebSocket authentifié par le même jeton JWT que l'API REST, qui
 * pousse un événement à chaque nouveau message concernant l'utilisateur
 * connecté — remplace le polling (setInterval) précédemment utilisé pour
 * rafraîchir la liste de contacts et le fil ouvert.
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

    function connect() {
      const token = getAccessToken()
      if (!token || cancelled) return

      socket = new WebSocket(`${getWebSocketUrl('/ws/messagerie/')}?token=${encodeURIComponent(token)}`)

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
