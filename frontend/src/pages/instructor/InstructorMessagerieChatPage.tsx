import { MessageSquare, Send, User as UserIcon } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { apiFetch, ApiError } from '../../api/client'
import type { ContactApprenant, MessageChat } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { useChatSocket } from '../../hooks/useChatSocket'

export function InstructorMessagerieChatPage() {
  const { user } = useAuth()
  const [contacts, setContacts] = useState<ContactApprenant[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageChat[] | null>(null)
  const [threadError, setThreadError] = useState<string | null>(null)

  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const selectedIdRef = useRef<string | null>(null)
  selectedIdRef.current = selectedId

  function refreshContacts() {
    apiFetch<ContactApprenant[]>('/messagerie/conversations/')
      .then(setContacts)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }

  function loadThread(conversationId: string) {
    apiFetch<MessageChat[]>(`/messagerie/conversations/${conversationId}/messages/`)
      .then(setMessages)
      .catch((err) => setThreadError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }

  useEffect(() => {
    refreshContacts()
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setMessages(null)
      return
    }
    setThreadError(null)
    loadThread(selectedId)
  }, [selectedId])

  // Poussé par le serveur à chaque nouveau message concernant ce
  // formateur (peu importe l'apprenant) — y compris une toute nouvelle
  // conversation, d'où le refreshContacts() systématique (une conversation
  // qui vient d'apparaître n'est pas encore dans la liste locale).
  useChatSocket(() => {
    refreshContacts()
    if (selectedIdRef.current) {
      loadThread(selectedIdRef.current)
    }
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(event: FormEvent) {
    event.preventDefault()
    if (!draft.trim() || !selectedId) return
    setIsSending(true)
    try {
      const message = await apiFetch<MessageChat>(`/messagerie/conversations/${selectedId}/messages/`, {
        method: 'POST',
        body: { contenu: draft },
      })
      setMessages((current) => [...(current ?? []), message])
      setDraft('')
      refreshContacts()
    } catch (err) {
      setThreadError(err instanceof ApiError ? err.message : "Impossible d'envoyer le message.")
    } finally {
      setIsSending(false)
    }
  }

  if (loadError) {
    return <p className="text-red-600 dark:text-red-400">{loadError}</p>
  }

  if (!contacts) {
    return <p className="text-slate-500 dark:text-slate-400">Chargement...</p>
  }

  if (contacts.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center dark:border-slate-800 dark:bg-slate-900">
        <MessageSquare size={28} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
        <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          Aucune conversation pour le moment.
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Les apprenants premium inscrits à l'une de vos formations peuvent vous écrire : les conversations
          apparaîtront ici dès leur premier message.
        </p>
      </div>
    )
  }

  const selectedContact = contacts.find((c) => c.conversation_id === selectedId) ?? null

  return (
    <div className="flex h-full gap-4">
      {/* LISTE DES APPRENANTS */}
      <div
        className={`w-full shrink-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white sm:w-72 dark:border-slate-800 dark:bg-slate-900 ${
          selectedId ? 'hidden sm:block' : 'block'
        }`}
      >
        {contacts.map((contact) => (
          <button
            key={contact.conversation_id}
            onClick={() => setSelectedId(contact.conversation_id)}
            className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60 ${
              contact.conversation_id === selectedId ? 'bg-sky-50 dark:bg-sky-500/10' : ''
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-sky-600 text-xs font-bold text-white">
              {contact.apprenant_nom.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                  {contact.apprenant_nom}
                </p>
                {contact.non_lus > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-sky-600 px-1.5 text-[10px] font-bold text-white">
                    {contact.non_lus}
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-slate-400">{contact.dernier_message || '—'}</p>
            </div>
          </button>
        ))}
      </div>

      {/* FIL DE DISCUSSION */}
      <div
        className={`flex min-w-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${
          selectedId ? 'flex' : 'hidden sm:flex'
        }`}
      >
        {!selectedContact ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <MessageSquare size={32} className="mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Choisissez un apprenant pour ouvrir la discussion.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <button
                onClick={() => setSelectedId(null)}
                className="text-sm font-semibold text-sky-600 sm:hidden"
              >
                ←
              </button>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-sky-600 text-xs font-bold text-white">
                {selectedContact.apprenant_nom.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {selectedContact.apprenant_nom}
                </p>
                <p className="text-[11px] text-slate-400">{selectedContact.apprenant_email}</p>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {!messages ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Chargement de la conversation...</p>
              ) : (
                messages.map((message) => {
                  const isMine = message.expediteur === user?.id
                  return (
                    <div key={message.id} className={`flex items-start gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
                      {!isMine && (
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                          <UserIcon size={13} />
                        </div>
                      )}
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                          isMine
                            ? 'rounded-br-sm bg-sky-600 text-white'
                            : 'rounded-bl-sm bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {message.contenu}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            {threadError && (
              <p className="mx-4 mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
                {threadError}
              </p>
            )}

            <form onSubmit={handleSend} className="flex gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Écrire un message..."
                disabled={isSending}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={isSending || !draft.trim()}
                className="flex items-center justify-center rounded-lg bg-sky-600 px-4 text-white hover:bg-sky-700 disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
