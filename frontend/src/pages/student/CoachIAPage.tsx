import { Bot, Send, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { apiFetch, ApiError } from '../../api/client'
import type { ConversationIA, Inscription, PaginatedResponse, PublicFormationDetail, PublicModule } from '../../api/types'

interface LeconOption {
  id: string
  titre: string
}

interface ModuleOption {
  id: string
  titre: string
  lecons: LeconOption[]
}

export function CoachIAPage() {
  const [inscriptions, setInscriptions] = useState<Inscription[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [formationId, setFormationId] = useState('')
  // Sommaire complet (avant filtrage des leçons verrouillées) — nécessaire
  // pour recalculer le déverrouillage séquentiel dès que la progression
  // change, sans devoir tout re-fetch.
  const [rawModules, setRawModules] = useState<PublicModule[]>([])
  const [moduleId, setModuleId] = useState('')
  const [leconId, setLeconId] = useState('')
  // Multi-choix optionnel : d'autres leçons du MÊME module, liées à la
  // leçon principale, à inclure dans le contexte envoyé à l'IA.
  const [leconsAssociees, setLeconsAssociees] = useState<string[]>([])

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
  // modules/leçons seulement — le contenu reste côté serveur, RG-009) pour
  // peupler le sélecteur de module, puis celui de leçon une fois le module choisi.
  useEffect(() => {
    setModuleId('')
    setLeconId('')
    setRawModules([])
    if (!formationId) return

    apiFetch<PublicFormationDetail>(`/catalogue/formations/${formationId}/`)
      .then((data) => setRawModules(data.modules))
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }, [formationId])

  const existingInscription = inscriptions?.find((inscription) => inscription.formation === formationId)

  // Même règle de déverrouillage séquentiel que FormationDetailPage (leçon
  // débloquée si première du module ou précédente terminée) : sans ce
  // filtre, le sélecteur laissait choisir n'importe quelle leçon plus loin
  // dans le programme, et le backend répondait simplement par un 403 — le
  // Coach IA ne doit même pas proposer une leçon pas encore accessible.
  const completedLessonIds = useMemo(() => {
    if (!existingInscription) return []
    const allLessons = rawModules.flatMap((mod) => mod.lecons.map((lec) => lec.id))
    const completedCount = Math.floor((existingInscription.progress_percent / 100) * allLessons.length)
    return allLessons.slice(0, completedCount)
  }, [rawModules, existingInscription])

  const modules: ModuleOption[] = useMemo(() => {
    return rawModules
      .map((module, mIdx) => {
        const prevModule = mIdx > 0 ? rawModules[mIdx - 1] : null
        const isModuleUnlocked =
          mIdx === 0 || !prevModule || (prevModule.lecons.length > 0 && prevModule.lecons.every((l) => completedLessonIds.includes(l.id)))

        const lecons: LeconOption[] = !isModuleUnlocked
          ? []
          : module.lecons
              .filter((_lecon, lIdx) => lIdx === 0 || completedLessonIds.includes(module.lecons[lIdx - 1].id))
              .map((lecon) => ({ id: lecon.id, titre: lecon.titre }))

        return { id: module.id, titre: module.titre, lecons }
      })
      .filter((module) => module.lecons.length > 0)
  }, [rawModules, completedLessonIds])

  const currentModule = modules.find((m) => m.id === moduleId) || null
  const lecons = useMemo(() => currentModule?.lecons ?? [], [currentModule])

  // Changer de module invalide la leçon choisie dans l'ancien module.
  useEffect(() => {
    setLeconId('')
  }, [moduleId])

  // Charge l'historique de conversation propre à la leçon choisie.
  useEffect(() => {
    setLeconsAssociees([])
    if (!leconId) {
      setHistory(null)
      return
    }
    apiFetch<PaginatedResponse<ConversationIA>>(`/assistant/history/?lecon=${leconId}`)
      .then((data) => setHistory([...data.results].reverse()))
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }, [leconId])

  function toggleLeconAssociee(id: string) {
    setLeconsAssociees((current) =>
      current.includes(id) ? current.filter((l) => l !== id) : [...current, id],
    )
  }

  async function handleAsk(event: FormEvent) {
    event.preventDefault()
    if (!question.trim() || !leconId) return
    setAskError(null)
    setIsAsking(true)
    try {
      const conversation = await apiFetch<ConversationIA>('/assistant/ask/', {
        method: 'POST',
        body: { lecon: leconId, question, lecons_associees: leconsAssociees },
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
          value={moduleId}
          onChange={(event) => setModuleId(event.target.value)}
          disabled={modules.length === 0}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">
            {formationId ? 'Choisir un module...' : "Sélectionnez d'abord une formation"}
          </option>
          {modules.map((module) => (
            <option key={module.id} value={module.id}>
              {module.titre}
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
            {moduleId ? 'Choisir une leçon...' : "Sélectionnez d'abord un module"}
          </option>
          {lecons.map((lecon) => (
            <option key={lecon.id} value={lecon.id}>
              {lecon.titre}
            </option>
          ))}
        </select>
      </div>

      {leconId && lecons.length > 1 && (
        <div className="mb-4 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Autres leçons du module "{currentModule?.titre}" à inclure dans le contexte (optionnel) — utile si
            plusieurs leçons se complètent pour comprendre le sujet :
          </p>
          <div className="flex flex-wrap gap-2">
            {lecons
              .filter((lecon) => lecon.id !== leconId)
              .map((lecon) => {
                const isChecked = leconsAssociees.includes(lecon.id)
                return (
                  <label
                    key={lecon.id}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      isChecked
                        ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-500 dark:bg-sky-500/10 dark:text-sky-300'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleLeconAssociee(lecon.id)}
                      className="sr-only"
                    />
                    {lecon.titre}
                  </label>
                )
              })}
          </div>
        </div>
      )}

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
                  {conversation.lecons_associees.length > 0 && (
                    <p className="ml-auto max-w-[85%] text-right text-[11px] text-slate-400 dark:text-slate-500">
                      + {conversation.lecons_associees.length} leçon
                      {conversation.lecons_associees.length > 1 ? 's' : ''} liée
                      {conversation.lecons_associees.length > 1 ? 's' : ''} incluse
                      {conversation.lecons_associees.length > 1 ? 's' : ''}
                    </p>
                  )}
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
