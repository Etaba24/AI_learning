import { Bot, Send, Sparkles } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { apiFetch, ApiError } from '../../api/client'
import type { ConversationIA, Inscription, PaginatedResponse, PublicFormationDetail } from '../../api/types'

interface LeconOption {
  id: string
  titre: string
  moduleTitle: string
}

export function CoachIAPage() {
  const [inscriptions, setInscriptions] = useState<Inscription[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [formationId, setFormationId] = useState('')
  const [lecons, setLecons] = useState<LeconOption[]>([])
  const [leconId, setLeconId] = useState('')

  const [history, setHistory] = useState<ConversationIA[] | null>(null)
  const [question, setQuestion] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [askError, setAskError] = useState<string | null>(null)

  // Mes formations en cours -> première étape : choisir de quoi on parle.
  useEffect(() => {
    apiFetch<PaginatedResponse<Inscription>>('/inscriptions/')
      .then((data) => setInscriptions(data.results))
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }, [])

  // Une fois une formation choisie, on va chercher son sommaire (titres des
  // leçons seulement — le contenu reste côté serveur, RG-009) pour peupler
  // le sélecteur de leçon.
  useEffect(() => {
    setLeconId('')
    setLecons([])
    if (!formationId) return

    apiFetch<PublicFormationDetail>(`/catalogue/formations/${formationId}/`)
      .then((data) => {
        const options: LeconOption[] = data.modules.flatMap((module) =>
          module.lecons.map((lecon) => ({ id: lecon.id, titre: lecon.titre, moduleTitle: module.titre })),
        )
        setLecons(options)
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }, [formationId])

  // Charge l'historique de conversation propre à la leçon choisie.
  useEffect(() => {
    if (!leconId) {
      setHistory(null)
      return
    }
    apiFetch<PaginatedResponse<ConversationIA>>(`/assistant/history/?lecon=${leconId}`)
      .then((data) => setHistory([...data.results].reverse()))
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }, [leconId])

  async function handleAsk(event: FormEvent) {
    event.preventDefault()
    if (!question.trim() || !leconId) return
    setAskError(null)
    setIsAsking(true)
    try {
      const conversation = await apiFetch<ConversationIA>('/assistant/ask/', {
        method: 'POST',
        body: { lecon: leconId, question },
      })
      setHistory((current) => [...(current ?? []), conversation])
      setQuestion('')
    } catch (err) {
      setAskError(err instanceof ApiError ? err.message : "Impossible de contacter l'assistant.")
    } finally {
      setIsAsking(false)
    }
  }

  if (loadError) {
    return <p className="text-red-600 dark:text-red-400">{loadError}</p>
  }

  if (!inscriptions) {
    return <p className="text-slate-500 dark:text-slate-400">Chargement...</p>
  }

  if (inscriptions.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          Le Coach IA s'active une fois inscrit à une formation.
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Il ne répond que sur le contenu des leçons auxquelles vous êtes inscrit.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <select
          value={formationId}
          onChange={(event) => setFormationId(event.target.value)}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">Choisir une formation...</option>
          {inscriptions.map((inscription) => (
            <option key={inscription.formation} value={inscription.formation}>
              {inscription.formation_titre}
            </option>
          ))}
        </select>

        <select
          value={leconId}
          onChange={(event) => setLeconId(event.target.value)}
          disabled={lecons.length === 0}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">
            {formationId ? 'Choisir une leçon...' : 'Sélectionnez d\'abord une formation'}
          </option>
          {lecons.map((lecon) => (
            <option key={lecon.id} value={lecon.id}>
              {lecon.moduleTitle} — {lecon.titre}
            </option>
          ))}
        </select>
      </div>

      {!leconId ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center dark:border-slate-800">
          <Bot size={32} className="mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Choisissez une leçon pour démarrer une conversation avec le Coach IA.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex-1 space-y-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            {!history ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Chargement de la conversation...</p>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Sparkles size={24} className="mb-2 text-sky-400" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Posez votre première question sur cette leçon.
                </p>
              </div>
            ) : (
              history.map((conversation) => (
                <div key={conversation.id} className="space-y-2">
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-sky-600 px-4 py-2.5 text-sm text-white">
                    {conversation.question}
                  </div>
                  <div className="flex max-w-[85%] items-start gap-2">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                      <Bot size={14} />
                    </div>
                    <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2.5 text-sm whitespace-pre-wrap text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {conversation.reponse}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {askError && (
            <p className="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
              {askError}
            </p>
          )}

          <form onSubmit={handleAsk} className="flex gap-2">
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Posez votre question sur cette leçon..."
              disabled={isAsking}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={isAsking || !question.trim()}
              className="flex items-center justify-center rounded-lg bg-sky-600 px-4 text-white hover:bg-sky-700 disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </form>
        </>
      )}
    </div>
  )
}
