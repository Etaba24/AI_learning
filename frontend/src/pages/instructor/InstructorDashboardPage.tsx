import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Layers,
  MessageSquare,
  Plus,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, ApiError } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import type { Formation, InstructorStats, PaginatedResponse } from '../../api/types'
import { Alert } from '../../components/Alert'
import { useRealtimeTopics } from '../../hooks/useRealtimeTopics'

export function InstructorDashboardPage() {
  const { user } = useAuth()
  const [formations, setFormations] = useState<Formation[]>([])
  const [stats, setStats] = useState<InstructorStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  const userName = user?.first_name || user?.email?.split('@')[0] || 'Formateur'

  function loadDashboardData() {
    setError(null)
    Promise.all([
      apiFetch<PaginatedResponse<Formation>>('/formations/'),
      apiFetch<InstructorStats>('/formateur/stats/'),
    ])
      .then(([formationsData, statsData]) => {
        setFormations(formationsData.results)
        setStats(statsData)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur lors du chargement des données.'))
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  useRealtimeTopics(['instructor_formations'], loadDashboardData)

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="error" title="Erreur du tableau de bord" message={error} />
        <button
          onClick={loadDashboardData}
          className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
        >
          <RefreshCw size={16} /> Réessayer
        </button>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <RefreshCw size={32} className="animate-spin text-indigo-500" />
        <p className="mt-4 text-sm font-medium">Préparation de votre espace formateur...</p>
      </div>
    )
  }

  const countByStatut = (statut: Formation['statut']) => formations.filter((f) => f.statut === statut).length

  const publishedPercent = stats.total_formations > 0
    ? Math.round((stats.published_formations / stats.total_formations) * 100)
    : 0

  const currentDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-[alert-slide-down_0.35s_cubic-bezier(0.16,1,0.3,1)]">
      {/* BANNIÈRE DE BIENVENUE & EN-TÊTE DU TABLEAU DE BORD */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl dark:border-slate-800">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-md">
                <Sparkles size={13} className="text-amber-400" />
                Espace pédagogique enseignant
              </span>
              <span className="text-xs text-slate-400 capitalize">• {currentDate}</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Bienvenue, <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-cyan-300 bg-clip-text text-transparent">{userName}</span>
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-300">
              Suivez les performances de vos cours, créez de nouveaux modules interactifs et consultez l'avancement de vos apprenants.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/formateur/creer-formation"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-600 hover:to-sky-700 active:scale-95"
            >
              <Plus size={15} />
              Nouvelle formation
            </Link>
          </div>
        </div>
      </div>

      {/* CARTE D'ALERTE : MODÉRATION EN ATTENTE */}
      {stats.pending_formations > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50 via-amber-100/60 to-orange-50 p-5 shadow-lg shadow-amber-500/5 dark:border-amber-900/50 dark:from-amber-950/40 dark:via-amber-900/20 dark:to-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-300 bg-amber-400/20 text-amber-700 shadow-inner dark:border-amber-800 dark:text-amber-300">
                <span className="absolute inset-0 rounded-2xl bg-amber-400/30 animate-ping" />
                <Clock size={24} className="relative" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-amber-950 dark:text-amber-200">Formations en attente de modération</h3>
                  <span className="rounded-full bg-amber-600 px-2.5 py-0.5 text-xs font-extrabold text-white shadow-sm">
                    {stats.pending_formations}
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-amber-800/90 dark:text-amber-300/80">
                  Ces formations ont été soumises et attendent la validation d'un administrateur (RG-002).
                </p>
              </div>
            </div>

            <Link
              to="/formateur/mes-formations"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-600/25 transition-all hover:from-amber-700 hover:to-orange-700 active:scale-95"
            >
              Consulter
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* GRILLE DES 4 CARTES KPI PRINCIPALES */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Mes formations
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 shadow-sm transition-transform group-hover:scale-110 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
              <BookOpen size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.total_formations}</span>
          </div>
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Toutes vos formations, tous statuts confondus
          </p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Apprenants inscrits
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-600 shadow-sm transition-transform group-hover:scale-110 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.total_students}</span>
            <span className="text-xs font-medium text-slate-400">apprenants distincts</span>
          </div>
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Sur l'ensemble de vos formations
          </p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Formations publiées
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-sm transition-transform group-hover:scale-110 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.published_formations}</span>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              {publishedPercent}% du total
            </span>
          </div>
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Visibles pour tous les apprenants
          </p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              En attente
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-600 shadow-sm transition-transform group-hover:scale-110 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.pending_formations}</span>
          </div>
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            En attente de modération administrateur
          </p>
        </div>
      </div>

      {/* SECTION CENTRALE : STATUT DE MES FORMATIONS ET ACTIVITÉ RÉCENTE */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* PANNEAU RÉPARTITION PAR STATUT (4 cols sur 7) */}
        <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700/80 dark:bg-slate-950/70 dark:shadow-[0_20px_45px_rgba(15,23,42,0.35)] lg:col-span-4">
          <div>
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                  <Layers size={20} className="text-indigo-600 dark:text-indigo-400" />
                  Répartition par statut de vos formations
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Cycle de vie de vos contenus pédagogiques (RF-015, RF-016)
                </p>
              </div>
              <Link
                to="/formateur/mes-formations"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                Voir tout →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700/80 dark:bg-slate-900/80 dark:hover:border-slate-600 dark:hover:bg-slate-800/90">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Brouillons</span>
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                  {countByStatut('BROUILLON')}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 transition-all hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:hover:bg-amber-500/15">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Soumises</span>
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse dark:bg-amber-400" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-amber-800 dark:text-amber-200">
                  {countByStatut('SOUMISE')}
                </p>
              </div>

              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 transition-all hover:bg-sky-100 dark:border-sky-500/40 dark:bg-sky-500/10 dark:hover:bg-sky-500/15">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-sky-700 dark:text-sky-300">Validées</span>
                  <span className="h-2 w-2 rounded-full bg-sky-500 dark:bg-sky-400" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-sky-800 dark:text-sky-200">
                  {countByStatut('VALIDEE')}
                </p>
              </div>

              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 transition-all hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:hover:bg-rose-500/15">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">Refusées</span>
                  <span className="h-2 w-2 rounded-full bg-rose-500 dark:bg-rose-400" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-rose-800 dark:text-rose-200">
                  {countByStatut('REFUSEE')}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 transition-all hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/15">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Publiées</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-emerald-800 dark:text-emerald-200">
                  {countByStatut('PUBLIEE')}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700/80 dark:bg-slate-900/80 dark:hover:border-slate-600 dark:hover:bg-slate-800/90">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Dépubliées</span>
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                  {countByStatut('DEPUBLIEE')}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/80 dark:bg-slate-900/80">
            <span className="text-xs text-slate-600 dark:text-slate-300">
              Disponibilité de vos cours pour les apprenants :
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {publishedPercent}% publié
            </span>
          </div>
        </div>

        {/* PANNEAU FLUX D'ACTIVITÉ RÉCENTE (3 cols sur 7) */}
        <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-3">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                <Activity size={20} className="text-indigo-600 dark:text-indigo-400" />
                Activité récente
              </h2>
              <span className="text-xs font-semibold text-slate-400">Temps réel</span>
            </div>

            <div className="space-y-2">
              {stats.recent_activity.length === 0 ? (
                <p className="py-2 text-xs text-slate-400">Aucune activité récente enregistrée pour vos cours.</p>
              ) : (
                stats.recent_activity.slice(0, 6).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 dark:border-slate-800/60 dark:bg-slate-800/30"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                        {item.apprenant_nom}
                        <span className="font-normal text-slate-400"> · {item.formation_titre}</span>
                      </p>
                      <p className="truncate text-[10px] text-slate-400">
                        {item.statut === 'TERMINEE' ? 'A terminé' : 'Progresse sur'} « {item.lecon_titre} »
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {new Date(item.updated_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3 text-right dark:border-slate-800">
            <Link
              to="/formateur/mes-formations"
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Gérer toutes mes formations <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* RACCOURCIS RAPIDES & RAPPELS PÉDAGOGIQUES */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">Accès rapide</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              to="/formateur/creer-formation"
              className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-800/80 dark:bg-slate-800/40 dark:hover:border-indigo-800 dark:hover:bg-indigo-500/10"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Plus size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Nouvelle formation</p>
                  <p className="text-[11px] text-slate-400">Créer un cours</p>
                </div>
              </div>
              <ArrowUpRight size={16} className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>

            <Link
              to="/formateur/mes-formations"
              className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:border-sky-300 hover:bg-sky-50 dark:border-slate-800/80 dark:bg-slate-800/40 dark:hover:border-sky-800 dark:hover:bg-sky-500/10"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <BookOpen size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Mes formations</p>
                  <p className="text-[11px] text-slate-400">Gérer et publier</p>
                </div>
              </div>
              <ArrowUpRight size={16} className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>

            <Link
              to="/formateur/messagerie"
              className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-800/80 dark:bg-slate-800/40 dark:hover:border-emerald-800 dark:hover:bg-emerald-500/10"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Messagerie</p>
                  <p className="text-[11px] text-slate-400">Échanger avec vos apprenants</p>
                </div>
              </div>
              <ArrowUpRight size={16} className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>

            <Link
              to="/formateur/bibliotheque"
              className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:border-amber-300 hover:bg-amber-50 dark:border-slate-800/80 dark:bg-slate-800/40 dark:hover:border-amber-800 dark:hover:bg-amber-500/10"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <FileText size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Bibliothèque</p>
                  <p className="text-[11px] text-slate-400">Documents partagés</p>
                </div>
              </div>
              <ArrowUpRight size={16} className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>

        {/* RAPPELS PÉDAGOGIQUES */}
        <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">Rappels avant publication</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800/60 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Au moins un module avec une leçon</p>
                    <p className="text-[11px] text-slate-400">Condition requise pour publier (RG-003)</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800/60 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Validation administrateur requise</p>
                    <p className="text-[11px] text-slate-400">Une formation soumise doit être validée avant publication (RG-002)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400 dark:border-slate-800">
            <span>Besoin d'aide pour publier ?</span>
            <Link to="/formateur/mes-formations" className="font-bold text-indigo-600 hover:underline dark:text-indigo-400">
              Voir mes formations →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
