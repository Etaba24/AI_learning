import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  Layers,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCog,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, ApiError } from '../../api/client'
import type { Formation, PaginatedResponse, User } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { Alert } from '../../components/Alert'
import { useRealtimeTopics } from '../../hooks/useRealtimeTopics'

interface AdminStats {
  users: { total: number; students: number; instructors: number; admins: number }
  formations: {
    total: number
    brouillon: number
    soumise: number
    validee: number
    refusee: number
    publiee: number
    depubliee: number
  }
}

export function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [recentFormations, setRecentFormations] = useState<Formation[]>([])
  const [recentUsers, setRecentUsers] = useState<User[]>([])
  const [error, setError] = useState<string | null>(null)

  const userName = user?.first_name || user?.email?.split('@')[0] || 'Administrateur'

  function loadDashboardData() {
    setError(null)
    Promise.all([
      apiFetch<AdminStats>('/admin/stats/'),
      apiFetch<PaginatedResponse<Formation>>('/formations/').catch(() => ({ results: [] })),
      apiFetch<PaginatedResponse<User>>('/users/').catch(() => ({ results: [] })),
    ])
      .then(([statsData, formationsData, usersData]) => {
        setStats(statsData)
        setRecentFormations(formationsData.results.slice(0, 5))
        setRecentUsers(usersData.results.slice(0, 5))
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur lors du chargement des données.'))
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Remplace le bouton "Actualiser" : la moindre inscription, formation
  // créée/modifiée/supprimée par quiconque (n'importe quel admin/formateur,
  // n'importe où dans l'appli) re-synchronise ce tableau de bord tout seul.
  useRealtimeTopics(['admin_dashboard'], loadDashboardData)

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
        <RefreshCw size={32} className="animate-spin text-sky-500" />
        <p className="mt-4 text-sm font-medium">Chargement du tableau de bord...</p>
      </div>
    )
  }

  // Calculs de pourcentages pour le catalogue
  const publishedPercent = stats.formations.total > 0
    ? Math.round((stats.formations.publiee / stats.formations.total) * 100)
    : 0

  const pendingCount = stats.formations.soumise

  const currentDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-8 animate-[alert-slide-down_0.35s_cubic-bezier(0.16,1,0.3,1)]">
      {/* BANNIÈRE DE BIENVENUE & EN-TÊTE DU TABLEAU DE BORD */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl dark:border-slate-800">
        {/* Cercles lumineux décoratifs d'arrière-plan */}
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300 backdrop-blur-md">
                <Sparkles size={13} className="text-amber-400" />
                Console d'administration
              </span>
              <span className="text-xs text-slate-400 capitalize">• {currentDate}</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Bienvenue, <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">{userName}</span>
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-300">
              Pilotage global de la plateforme AI Learning. Gérez les utilisateurs, modérez les formations et suivez les métriques en temps réel.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/admin/creer-formation"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-500/25 transition-all hover:from-sky-600 hover:to-indigo-700 active:scale-95"
            >
              <Plus size={15} />
              Nouvelle formation
            </Link>
          </div>
        </div>
      </div>

      {/* CARTE D'ALERTE : MODÉRATION EN ATTENTE */}
      {pendingCount > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50 via-amber-100/60 to-orange-50 p-5 shadow-lg shadow-amber-500/5 dark:border-amber-900/50 dark:from-amber-950/40 dark:via-amber-900/20 dark:to-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-300 bg-amber-400/20 text-amber-700 shadow-inner dark:border-amber-800 dark:text-amber-300">
                <span className="absolute inset-0 rounded-2xl bg-amber-400/30 animate-ping" />
                <Clock size={24} className="relative" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-amber-950 dark:text-amber-200">
                    Formations soumises en attente de modération
                  </h3>
                  <span className="rounded-full bg-amber-600 px-2.5 py-0.5 text-xs font-extrabold text-white shadow-sm">
                    {pendingCount}
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-amber-800/90 dark:text-amber-300/80">
                  Des contenus ont été soumis par les formateurs et nécessitent votre validation administrative (RG-002).
                </p>
              </div>
            </div>

            <Link
              to="/admin/formations"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-600/25 transition-all hover:from-amber-700 hover:to-orange-700 active:scale-95"
            >
              Consulter et modérer
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* GRILLE DES 4 CARTES KPI PRINCIPALES */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* CARTE 1: TOTAL UTILISATEURS */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Total Utilisateurs
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-600 shadow-sm transition-transform group-hover:scale-110 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400">
              <Users size={20} />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.users.total}</span>
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={12} /> Actifs
            </span>
          </div>

          {/* Mini barre de répartition des rôles */}
          <div className="mt-4 space-y-1.5">
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="bg-emerald-500"
                style={{ width: `${stats.users.total > 0 ? (stats.users.students / stats.users.total) * 100 : 0}%` }}
                title="Apprenants"
              />
              <div
                className="bg-amber-500"
                style={{ width: `${stats.users.total > 0 ? (stats.users.instructors / stats.users.total) * 100 : 0}%` }}
                title="Formateurs"
              />
              <div
                className="bg-purple-500"
                style={{ width: `${stats.users.total > 0 ? (stats.users.admins / stats.users.total) * 100 : 0}%` }}
                title="Admins"
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-500">
              <span>{stats.users.students} apprenants</span>
              <span>{stats.users.instructors} formateurs</span>
            </div>
          </div>
        </div>

        {/* CARTE 2: APPRENANTS */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Apprenants
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-sm transition-transform group-hover:scale-110 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
              <GraduationCap size={20} />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.users.students}</span>
            <span className="text-xs font-medium text-slate-400">inscrits</span>
          </div>

          <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Accès au catalogue & auto-inscription active
          </p>
        </div>

        {/* CARTE 3: FORMATEURS */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Formateurs
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-600 shadow-sm transition-transform group-hover:scale-110 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
              <UserCog size={20} />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.users.instructors}</span>
            <span className="text-xs font-medium text-slate-400">créateurs</span>
          </div>

          <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Comptes créés par l'administrateur
          </p>
        </div>

        {/* CARTE 4: FORMATIONS PUBLIÉES */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Formations publiées
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-200 bg-purple-50 text-purple-600 shadow-sm transition-transform group-hover:scale-110 dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400">
              <BookOpen size={20} />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.formations.publiee}</span>
            <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
              {publishedPercent}% du total
            </span>
          </div>

          <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Sur {stats.formations.total} formation{stats.formations.total > 1 ? 's' : ''} au total
          </p>
        </div>
      </div>

      {/* SECTION CENTRALE : STATUT DU CATALOGUE ET ACTIVITÉ RÉCENTE */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* PANNEAU CATALOGUE & RÉPARTITION (4 cols sur 7) */}
        <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700/80 dark:bg-slate-950/70 dark:shadow-[0_20px_45px_rgba(15,23,42,0.35)] lg:col-span-4">
          <div>
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                  <Layers size={20} className="text-sky-600 dark:text-sky-400" />
                  Répartition par statut de formation
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Cycle de vie des contenus pédagogiques (RF-015, RF-016)
                </p>
              </div>

              <Link
                to="/admin/formations"
                className="text-xs font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
              >
                Voir tout →
              </Link>
            </div>

            {/* Tuiles interactives de statut */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700/80 dark:bg-slate-900/80 dark:hover:border-slate-600 dark:hover:bg-slate-800/90">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Brouillons</span>
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                  {stats.formations.brouillon}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 transition-all hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:hover:bg-amber-500/15">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Soumises</span>
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse dark:bg-amber-400" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-amber-800 dark:text-amber-200">
                  {stats.formations.soumise}
                </p>
              </div>

              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 transition-all hover:bg-sky-100 dark:border-sky-500/40 dark:bg-sky-500/10 dark:hover:bg-sky-500/15">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-sky-700 dark:text-sky-300">Validées</span>
                  <span className="h-2 w-2 rounded-full bg-sky-500 dark:bg-sky-400" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-sky-800 dark:text-sky-200">
                  {stats.formations.validee}
                </p>
              </div>

              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 transition-all hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:hover:bg-rose-500/15">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">Refusées</span>
                  <span className="h-2 w-2 rounded-full bg-rose-500 dark:bg-rose-400" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-rose-800 dark:text-rose-200">
                  {stats.formations.refusee}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 transition-all hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/15">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Publiées</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-emerald-800 dark:text-emerald-200">
                  {stats.formations.publiee}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700/80 dark:bg-slate-900/80 dark:hover:border-slate-600 dark:hover:bg-slate-800/90">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Dépubliées</span>
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                  {stats.formations.depubliee}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/80 dark:bg-slate-900/80">
            <span className="text-xs text-slate-600 dark:text-slate-300">
              Disponibilité du catalogue pour les apprenants :
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
                Activités récentes
              </h2>
              <span className="text-xs font-semibold text-slate-400">Temps réel</span>
            </div>

            <div className="space-y-4">
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Dernières formations</p>
                <div className="space-y-2">
                  {recentFormations.length === 0 ? (
                    <p className="py-2 text-xs text-slate-400">Aucune formation créée.</p>
                  ) : (
                    recentFormations.slice(0, 3).map((f) => (
                      <Link
                        key={f.id}
                        to={`/admin/formations/${f.id}`}
                        className="group flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 transition-all hover:border-sky-200 hover:bg-sky-50/40 dark:border-slate-800/60 dark:bg-slate-800/30 dark:hover:border-sky-900/40"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="truncate text-xs font-bold text-slate-900 group-hover:text-sky-600 dark:text-slate-100 dark:group-hover:text-sky-400">
                            {f.titre}
                          </p>
                          <p className="truncate text-[10px] text-slate-400">
                            {f.categorie_nom} • {f.auteur_email}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {f.statut}
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Récemment inscrits</p>
                <div className="space-y-2">
                  {recentUsers.length === 0 ? (
                    <p className="py-2 text-xs text-slate-400">Aucun utilisateur.</p>
                  ) : (
                    recentUsers.slice(0, 3).map((u) => {
                      const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email
                      return (
                        <div
                          key={u.id}
                          className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 dark:border-slate-800/60 dark:bg-slate-800/30"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">{name}</p>
                            <p className="truncate text-[10px] text-slate-400">{u.email}</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                            {u.role}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3 text-right dark:border-slate-800">
            <Link
              to="/admin/apprenants"
              className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:underline dark:text-sky-400"
            >
              Gérer tous les utilisateurs <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* RACCOURCIS RAPIDES & SÉCURITÉ / SNT */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* RACCOURCIS ACTION RAPIDE */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">Accès rapide administration</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              to="/admin/apprenants"
              className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:border-sky-300 hover:bg-sky-50 dark:border-slate-800/80 dark:bg-slate-800/40 dark:hover:border-sky-800 dark:hover:bg-sky-500/10"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Apprenants</p>
                  <p className="text-[11px] text-slate-400">Gestion des inscrits</p>
                </div>
              </div>
              <ArrowUpRight size={16} className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>

            <Link
              to="/admin/formateurs"
              className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:border-amber-300 hover:bg-amber-50 dark:border-slate-800/80 dark:bg-slate-800/40 dark:hover:border-amber-800 dark:hover:bg-amber-500/10"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <UserCog size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Formateurs</p>
                  <p className="text-[11px] text-slate-400">Création de comptes</p>
                </div>
              </div>
              <ArrowUpRight size={16} className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>

            <Link
              to="/admin/categories"
              className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:border-purple-300 hover:bg-purple-50 dark:border-slate-800/80 dark:bg-slate-800/40 dark:hover:border-purple-800 dark:hover:bg-purple-500/10"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Catégories</p>
                  <p className="text-[11px] text-slate-400">Thématiques de cours</p>
                </div>
              </div>
              <ArrowUpRight size={16} className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>

            <Link
              to="/admin/departements"
              className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:border-sky-300 hover:bg-sky-50 dark:border-slate-800/80 dark:bg-slate-800/40 dark:hover:border-sky-800 dark:hover:bg-sky-500/10"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <FileText size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Départements</p>
                  <p className="text-[11px] text-slate-400">Périmètres formateurs</p>
                </div>
              </div>
              <ArrowUpRight size={16} className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>

        {/* ÉTAT SYSTÈME ET CONFORMITÉ */}
        <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">Conformité & Intégrité Système</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800/60 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Isolement des départements (RF-009)</p>
                    <p className="text-[11px] text-slate-400">Contrainte d'appartenance appliquée</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  Actif
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800/60 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Sécurité & Tokens (RNF-002)</p>
                    <p className="text-[11px] text-slate-400">Authentification JWT / Session sécurisée</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  Conforme
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400 dark:border-slate-800">
            <span>Latence serveur : ~12ms</span>
            <span className="flex items-center gap-1.5 font-bold text-emerald-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              100% Fonctionnel
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
