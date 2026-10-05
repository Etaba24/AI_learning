import { ArrowRight, BookOpen, CheckCircle2, GraduationCap, LogOut, PlayCircle, Sparkles } from 'lucide-react'
import { useEffect, useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, ApiError } from '../../api/client'
import { DEFAULT_PAGE_SIZE, NIVEAU_LABELS, type Inscription, type PaginatedResponse } from '../../api/types'
import { Alert } from '../../components/Alert'
import { useConfirm } from '../../components/ConfirmContext'
import { Pagination } from '../../components/Pagination'
import { useToast } from '../../components/ToastContext'
import { useRealtimeTopics } from '../../hooks/useRealtimeTopics'

const STATUT_LABELS: Record<Inscription['statut'], string> = {
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
  ABANDONNEE: 'Abandonnée',
}

const STATUT_STYLES: Record<Inscription['statut'], string> = {
  EN_COURS: 'bg-sky-50 text-sky-700 border border-sky-200/80 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-900/40',
  TERMINEE: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-900/40',
  ABANDONNEE: 'bg-slate-100 text-slate-500 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/50',
}

export function MyCoursesPage() {
  const { showToast } = useToast()
  const confirm = useConfirm()
  const [inscriptions, setInscriptions] = useState<Inscription[] | null>(null)
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  function loadInscriptions() {
    apiFetch<PaginatedResponse<Inscription>>(`/inscriptions/?page=${page}`)
      .then((data) => {
        setInscriptions(data.results)
        setCount(data.count)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }

  useEffect(loadInscriptions, [page])
  useRealtimeTopics(['mes_formations'], loadInscriptions)

  async function handleUnsubscribe(event: MouseEvent, inscription: Inscription) {
    event.preventDefault()
    event.stopPropagation()

    const ok = await confirm({
      title: 'Se désinscrire de cette formation ?',
      message: `Vous perdrez votre progression sur « ${inscription.formation_titre} ». Cette action est irréversible.`,
      confirmLabel: 'Se désinscrire',
      danger: true,
    })
    if (!ok) return

    try {
      await apiFetch(`/inscriptions/${inscription.id}/`, { method: 'DELETE' })
      showToast('success', 'Vous avez été désinscrit de cette formation.')
      loadInscriptions()
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Impossible de vous désinscrire.')
    }
  }

  if (error) {
    return <Alert variant="error" message={error} />
  }

  if (!inscriptions) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
        <p className="mt-4 text-xs font-semibold">Chargement de vos formations...</p>
      </div>
    )
  }

  const enCoursCount = inscriptions.filter((i) => i.statut === 'EN_COURS').length
  const termineesCount = inscriptions.filter((i) => i.statut === 'TERMINEE').length
  const avgProgress = inscriptions.length
    ? Math.round(inscriptions.reduce((acc, i) => acc + i.progress_percent, 0) / inscriptions.length)
    : 0

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* STATISTIQUES APPRENANT */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-md shadow-slate-500/5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
            <BookOpen size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Formations en cours</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{enCoursCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-md shadow-slate-500/5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Formations terminées</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{termineesCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-md shadow-slate-500/5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Sparkles size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Progression moyenne</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{avgProgress}%</p>
          </div>
        </div>
      </div>

      {/* LISTE DES FORMATIONS */}
      {inscriptions.length === 0 ? (
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-12 text-center shadow-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
            <GraduationCap size={32} />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">
            Aucune inscription enregistrée
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            Vous n'êtes inscrit à aucune formation pour l'instant. Explorez notre catalogue interactif pour commencer !
          </p>
          <Link
            to="/apprenant"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-700 active:scale-95 transition-all"
          >
            <BookOpen size={16} />
            Parcourir le catalogue
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {inscriptions.map((inscription) => (
            <Link
              key={inscription.id}
              to={`/apprenant/formations/${inscription.formation}`}
              className="group flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-md shadow-slate-500/5 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-sky-500/30 sm:flex-row sm:items-center"
            >
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${STATUT_STYLES[inscription.statut]}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {STATUT_LABELS[inscription.statut]}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    {NIVEAU_LABELS[inscription.formation_niveau]}
                  </span>
                </div>

                <h2 className="mt-2 text-base font-bold text-slate-900 group-hover:text-sky-600 dark:text-slate-100 dark:group-hover:text-sky-400">
                  {inscription.formation_titre}
                </h2>

                {/* BARRE DE PROGRESSION */}
                <div className="mt-4 max-w-md">
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-500 dark:text-slate-400">Avancement</span>
                    <span className="text-sky-600 dark:text-sky-400">{inscription.progress_percent}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-600 transition-all duration-500"
                      style={{ width: `${inscription.progress_percent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex shrink-0 items-center gap-2 sm:mt-0">
                <button
                  type="button"
                  onClick={(event) => handleUnsubscribe(event, inscription)}
                  title="Se désinscrire de cette formation"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-400 transition-all hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                >
                  <LogOut size={16} />
                </button>
                <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-xs font-bold text-slate-700 transition-all group-hover:border-sky-500 group-hover:bg-sky-500 group-hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:group-hover:bg-sky-600">
                  <PlayCircle size={16} />
                  Continuer le cours
                  <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {inscriptions.length > 0 && (
        <Pagination count={count} page={page} pageSize={DEFAULT_PAGE_SIZE} onPageChange={setPage} />
      )}
    </div>
  )
}
