import {
  BookOpen,
  Users,
  Award,
  TrendingUp,
  Plus,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit3,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, ApiError } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { NIVEAU_LABELS, STATUT_BADGE_STYLES, STATUT_LABELS, type Formation, type PaginatedResponse } from '../../api/types'
import { Alert } from '../../components/Alert'
import { useRealtimeTopics } from '../../hooks/useRealtimeTopics'

export function InstructorDashboardPage() {
  const { user } = useAuth()
  const [formations, setFormations] = useState<Formation[] | null>(null)
  const [selectedFormationForPreview, setSelectedFormationForPreview] = useState<Formation | null>(null)
  const [error, setError] = useState<string | null>(null)

  function loadFormations() {
    apiFetch<PaginatedResponse<Formation>>('/formations/')
      .then((data) => setFormations(data.results))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur lors du chargement de vos formations.'))
  }

  useEffect(loadFormations, [])
  useRealtimeTopics(['instructor_formations'], loadFormations)

  if (error) {
    return <Alert variant="error" message={error} />
  }

  if (!formations) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="mt-4 text-xs font-semibold">Préparation de votre espace formateur...</p>
      </div>
    )
  }

  const instructorName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email : 'Formateur'

  // Calculs d'indicateurs
  const publishedCount = formations.filter((f) => f.statut === 'PUBLIEE').length
  const pendingCount = formations.filter((f) => f.statut === 'SOUMISE').length
  const totalStudentsEnrolled = 0
  const avgSatisfaction = '-'

  return (
    <div className="space-y-8">
      {/* BANNIÈRE BIENVENUE FORMATEUR */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-200/50 bg-gradient-to-br from-indigo-900 via-sky-900 to-slate-900 p-6 text-white shadow-xl shadow-indigo-500/10 sm:p-8 dark:border-indigo-500/20">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-indigo-100 backdrop-blur-md">
              <Sparkles size={14} className="text-amber-300" />
              <span>Espace Pédagogique Enseignant</span>
            </div>

            <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Bienvenue, Professeur {instructorName}
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-indigo-100/90 sm:text-sm">
              Suivez les performances de vos cours, créez de nouveaux modules interactifs et consultez l'avancement de vos apprenants.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <Link
              to="/formateur/creer-formation"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-500 px-5 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-600 hover:to-sky-600 active:scale-95"
            >
              <Plus size={16} />
              <span>Créer une nouvelle formation</span>
            </Link>
          </div>
        </div>
      </div>

      {/* CARTES STATISTIQUES PÉDAGOGIQUES */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-md shadow-slate-500/5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <BookOpen size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mes Formations</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{formations.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-md shadow-slate-500/5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
            <Users size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Apprenants Inscrits</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalStudentsEnrolled}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-md shadow-slate-500/5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cours Publiés</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{publishedCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-md shadow-slate-500/5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
            <Award size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Note Satisf. Moyenne</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">⭐ {avgSatisfaction} / 5</p>
          </div>
        </div>
      </div>

      {/* RAPPEL SUR LES STATUTS DE SOUMISSION */}
      {pendingCount > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs font-bold text-amber-900 shadow-sm dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-amber-500 shrink-0" />
            <span>Vous avez {pendingCount} formation(s) en attente de modération par l'administrateur.</span>
          </div>
          <Link
            to="/formateur/mes-formations"
            className="shrink-0 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs text-white hover:bg-amber-700"
          >
            Voir les détails →
          </Link>
        </div>
      )}

      {/* LISTE DES FORMATIONS DU FORMATEUR */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen size={18} className="text-indigo-500" />
            Vos Formations et Programmes ({formations.length})
          </h2>
          <Link
            to="/formateur/mes-formations"
            className="text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Gérer tout →
          </Link>
        </div>

        {formations.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <BookOpen size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
            <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-slate-100">Aucune formation créée pour l'instant</h3>
            <p className="mt-1 text-xs text-slate-400">Commencez par concevoir votre première formation pour vos étudiants.</p>
            <Link
              to="/formateur/creer-formation"
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
            >
              <Plus size={16} />
              Créer une formation
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {formations.map((f) => (
              <div
                key={f.id}
                className="group flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-md shadow-slate-500/5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-indigo-500/40"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center rounded-xl bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                      {f.categorie_nom}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUT_BADGE_STYLES[f.statut]
                        }`}
                    >
                      {STATUT_LABELS[f.statut]}
                    </span>
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400 line-clamp-1">
                    {f.titre}
                  </h3>

                  <p className="mt-2 text-xs leading-relaxed text-slate-500 line-clamp-2 dark:text-slate-400">
                    {f.description || 'Formation pédagogique enregistrée dans votre catalogue.'}
                  </p>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-4">
                    <span className="flex items-center gap-1">
                      <Clock size={13} /> {f.duree_heures} h
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      Niveau {NIVEAU_LABELS[f.niveau]}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedFormationForPreview(f)}
                      className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 py-2 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200"
                    >
                      <Eye size={14} />
                      Aperçu
                    </button>
                    <Link
                      to={`/formateur/creer-formation/${f.id}`}
                      className="flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-indigo-700 active:scale-95"
                    >
                      <Edit3 size={14} />
                      Éditer
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedFormationForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-[fade-in_0.2s_ease-out]">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
                  Aperçu formateur
                </p>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {selectedFormationForPreview.titre}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFormationForPreview(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex items-center rounded-xl bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                    {selectedFormationForPreview.categorie_nom}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUT_BADGE_STYLES[selectedFormationForPreview.statut]}`}>
                    {STATUT_LABELS[selectedFormationForPreview.statut]}
                  </span>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {selectedFormationForPreview.description || 'Aucune description disponible.'}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                    <span className="block text-[9px] uppercase tracking-[0.18em] text-slate-400">Niveau</span>
                    {NIVEAU_LABELS[selectedFormationForPreview.niveau]}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                    <span className="block text-[9px] uppercase tracking-[0.18em] text-slate-400">Durée</span>
                    {selectedFormationForPreview.duree_heures} h
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                    <span className="block text-[9px] uppercase tracking-[0.18em] text-slate-400">Département</span>
                    {selectedFormationForPreview.departement_nom || 'Non renseigné'}
                  </div>
                </div>
              </div>

              {(selectedFormationForPreview.modules?.length ?? 0) > 0 ? (
                <div className="space-y-4">
                  {selectedFormationForPreview.modules?.map((module, index) => (
                    <div key={module.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                        Module {index + 1} : {module.titre}
                      </h4>
                      {module.description && (
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{module.description}</p>
                      )}

                      {module.lecons?.length ? (
                        <ul className="mt-3 space-y-2 pl-4 text-[11px] text-slate-600 dark:text-slate-300">
                          {module.lecons.map((lecon) => (
                            <li key={lecon.id} className="list-disc">
                              {lecon.titre}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-[11px] text-slate-400">Aucune leçon renseignée dans ce module.</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Aucun module détaillé n’est disponible pour cet aperçu.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FLUX D'ACTIVITÉ RÉCENTE DES APPRENANTS */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-md shadow-slate-500/5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-indigo-500" />
          Activité récente de vos apprenants
        </h2>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-6 text-center text-xs font-semibold text-slate-400 dark:border-slate-800/80 dark:bg-slate-800/40">
          Aucune activité récente enregistrée pour vos cours.
        </div>
      </div>
    </div>
  )
}
