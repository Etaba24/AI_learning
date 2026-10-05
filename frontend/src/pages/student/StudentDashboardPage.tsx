import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Compass,
  GraduationCap,
  Library,
  MessageCircle,
  Play,
  TrendingUp,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, ApiError } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { type Inscription, type PaginatedResponse, type PublicFormationDetail } from '../../api/types'
import { Alert } from '../../components/Alert'
import { useRealtimeTopics } from '../../hooks/useRealtimeTopics'

// Point d'entrée volontairement minimal de l'espace apprenant : un coup
// d'œil sur les chiffres clés, le cours à reprendre, des raccourcis vers le
// reste de l'espace, et l'activité récente — le détail complet (parcours,
// modules/leçons) vit dans la rubrique « Progression » (ProgressionPage).
export function StudentDashboardPage() {
  const { user } = useAuth()
  const [inscriptions, setInscriptions] = useState<Inscription[] | null>(null)
  const [activeCourseDetail, setActiveCourseDetail] = useState<PublicFormationDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  function loadInscriptions() {
    apiFetch<PaginatedResponse<Inscription>>('/inscriptions/')
      .then((data) => {
        setInscriptions(data.results)
        const enCours = data.results.find((i) => i.statut === 'EN_COURS')
        if (enCours) {
          apiFetch<PublicFormationDetail>(`/catalogue/formations/${enCours.formation}/`)
            .then(setActiveCourseDetail)
            .catch(() => setActiveCourseDetail(null))
        }
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur lors du chargement des cours.'))
  }

  useEffect(loadInscriptions, [])
  useRealtimeTopics(['mes_formations'], loadInscriptions)

  if (error) {
    return <Alert variant="error" message={error} />
  }

  if (!inscriptions) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
        <p className="mt-4 text-xs font-semibold">Préparation de votre tableau de bord...</p>
      </div>
    )
  }

  const studentName = user?.first_name || (user?.email ? user.email.split('@')[0] : 'Apprenant')
  const enCoursList = inscriptions.filter((i) => i.statut === 'EN_COURS')
  const termineesCount = inscriptions.filter((i) => i.statut === 'TERMINEE').length
  const currentCourse = enCoursList[0] ?? null
  const avgProgress = inscriptions.length
    ? Math.round(inscriptions.reduce((acc, i) => acc + i.progress_percent, 0) / inscriptions.length)
    : 0

  const totalLecons = activeCourseDetail?.modules.reduce((sum, m) => sum + m.lecons.length, 0) ?? 0
  const completedLecons = currentCourse && totalLecons ? Math.floor((currentCourse.progress_percent / 100) * totalLecons) : 0

  const STATS = [
    { icon: BookOpen, tone: 'sky', label: 'Formations en cours', value: enCoursList.length },
    { icon: CheckCircle2, tone: 'emerald', label: 'Formations terminées', value: termineesCount },
    { icon: TrendingUp, tone: 'indigo', label: 'Avancement moyen', value: `${avgProgress}%` },
    {
      icon: Award,
      tone: 'amber',
      label: 'Niveau Apprenant',
      value: termineesCount > 3 ? 'Expert' : termineesCount > 0 ? 'Intermédiaire' : 'Débutant',
    },
  ] as const

  const TONE_CLASSES: Record<(typeof STATS)[number]['tone'], string> = {
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  }

  const QUICK_LINKS = [
    { to: '/apprenant/catalogue', icon: Compass, label: 'Catalogue', description: 'Découvrir de nouvelles formations' },
    { to: '/apprenant/mes-formations', icon: GraduationCap, label: 'Mes formations', description: 'Toutes vos inscriptions' },
    { to: '/apprenant/progression', icon: TrendingUp, label: 'Progression', description: 'Le détail de votre avancement' },
    { to: '/apprenant/coach-ia', icon: MessageCircle, label: 'Coach IA', description: "Poser une question sur une leçon" },
    { to: '/apprenant/bibliotheque', icon: Library, label: 'Bibliothèque', description: 'Documents et supports de cours' },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* EN-TÊTE SOBRE */}
      <div className="text-center">
        <h1 className="text-lg font-black text-slate-900 dark:text-slate-100">Bienvenue, {studentName} !</h1>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Voici un aperçu de votre parcours d'apprentissage.</p>
      </div>

      {/* STATISTIQUES APPRENANT — largeur fixe, jamais étirées pour remplir la ligne */}
      <div>
        <p className="mb-3 text-center text-[11px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
          Statistiques
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {STATS.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="w-[calc(50%-0.5rem)] shrink-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:w-44 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${TONE_CLASSES[stat.tone]}`}>
                  <Icon size={18} />
                </div>
                <p className="mt-3 text-xl font-black text-slate-900 dark:text-slate-100">{stat.value}</p>
                <p className="text-[11px] font-medium text-slate-400">{stat.label}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* CONTINUER L'APPRENTISSAGE */}
      {currentCourse && (
        <div className="mx-auto w-full rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-3 text-center text-[11px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
            Reprendre l'apprentissage
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                <BookOpen size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                  {currentCourse.formation_titre}
                </p>
                <p className="text-[11px] text-slate-400">
                  {totalLecons > 0 ? `${completedLecons} / ${totalLecons} leçons` : `${currentCourse.progress_percent}% complété`}
                </p>
                <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-sky-500 transition-all duration-500"
                    style={{ width: `${currentCourse.progress_percent}%` }}
                  />
                </div>
              </div>
            </div>

            <Link
              to={`/apprenant/formations/${currentCourse.formation}`}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-sky-700"
            >
              <Play size={13} fill="currentColor" />
              Continuer
            </Link>
          </div>
        </div>
      )}

      {/* RACCOURCIS RAPIDES */}
      <div>
        <p className="mb-3 text-center text-[11px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
          Raccourcis
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.to}
                to={link.to}
                className="group flex w-full shrink-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 transition-colors hover:border-sky-300 sm:w-72 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-500/40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 transition-colors group-hover:bg-sky-500 group-hover:text-white dark:bg-sky-500/10 dark:text-sky-400">
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{link.label}</p>
                  <p className="truncate text-[11px] text-slate-400">{link.description}</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-500" />
              </Link>
            )
          })}
        </div>
      </div>

      {/* ACTIVITÉ RÉCENTE */}
      {inscriptions.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-4 text-center text-[11px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
            Activité récente
          </p>
          <div className="space-y-4">
            {inscriptions.slice(0, 5).map((inscription) => (
              <Link
                key={inscription.id}
                to={`/apprenant/formations/${inscription.formation}`}
                className="group flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-700 group-hover:text-sky-600 dark:text-slate-300 dark:group-hover:text-sky-400">
                    {inscription.formation_titre}
                  </p>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        inscription.statut === 'TERMINEE' ? 'bg-emerald-500' : 'bg-sky-500'
                      }`}
                      style={{ width: `${inscription.progress_percent}%` }}
                    />
                  </div>
                </div>
                <span
                  className={`shrink-0 text-xs font-bold ${
                    inscription.statut === 'TERMINEE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-sky-600 dark:text-sky-400'
                  }`}
                >
                  {inscription.progress_percent}%
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
