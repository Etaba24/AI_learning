import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Award,
  PlayCircle,
  TrendingUp,
  MapPin,
  ChevronDown,
  ChevronUp,
  Circle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch, ApiError } from '../../api/client'
import { NIVEAU_LABELS, type Inscription, type PaginatedResponse, type PublicFormationDetail } from '../../api/types'
import { Alert } from '../../components/Alert'
import { useRealtimeTopics } from '../../hooks/useRealtimeTopics'
import { RecommendedPathStepper } from '../../components/RecommendedPathStepper'

// Ancien contenu du tableau de bord apprenant (stats + détail de la
// formation en cours) — déplacé ici dans sa propre rubrique « Progression »
// pour que le tableau de bord redevienne un point d'entrée léger, pendant
// que le suivi détaillé vit à un seul endroit dédié.
export function ProgressionPage() {
  const navigate = useNavigate()

  const [inscriptions, setInscriptions] = useState<Inscription[] | null>(null)
  const [activeCourseDetail, setActiveCourseDetail] = useState<PublicFormationDetail | null>(null)
  const [showLessonBreakdown, setShowLessonBreakdown] = useState(true)
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
        <p className="mt-4 text-xs font-semibold">Préparation de votre progression...</p>
      </div>
    )
  }

  const enCoursList = inscriptions.filter((i) => i.statut === 'EN_COURS')
  const termineesList = inscriptions.filter((i) => i.statut === 'TERMINEE')
  const currentCourse = enCoursList.length > 0 ? enCoursList[0] : null

  const avgProgress = inscriptions.length
    ? Math.round(inscriptions.reduce((acc, i) => acc + i.progress_percent, 0) / inscriptions.length)
    : 0

  let flatLessons: { id: string; titre: string; moduleIndex: number; moduleTitle: string; leconIndex: number; globalIndex: number }[] = []
  let activeModuleTitle = ''
  let activeLessonTitle = ''
  let activeModuleIndex = 1
  let activeLessonIndex = 1
  let activeLessonId = ''

  if (activeCourseDetail && activeCourseDetail.modules) {
    let indexCount = 0
    activeCourseDetail.modules.forEach((mod, mIdx) => {
      mod.lecons.forEach((lec, lIdx) => {
        flatLessons.push({
          id: lec.id,
          titre: lec.titre,
          moduleIndex: mIdx + 1,
          moduleTitle: mod.titre,
          leconIndex: lIdx + 1,
          globalIndex: indexCount,
        })
        indexCount++
      })
    })

    if (flatLessons.length > 0 && currentCourse) {
      const completedCount = Math.floor((currentCourse.progress_percent / 100) * flatLessons.length)
      const currentIndex = Math.min(completedCount, flatLessons.length - 1)
      const currentLoc = flatLessons[currentIndex]

      if (currentLoc) {
        activeModuleTitle = currentLoc.moduleTitle
        activeLessonTitle = currentLoc.titre
        activeModuleIndex = currentLoc.moduleIndex
        activeLessonIndex = currentLoc.leconIndex
        activeLessonId = currentLoc.id
      }
    }
  }

  if (inscriptions.length === 0) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200/80 bg-white/90 p-12 text-center shadow-md backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
          <TrendingUp size={26} />
        </div>
        <h2 className="mt-4 text-base font-bold text-slate-900 dark:text-slate-100">
          Aucune progression à afficher pour l'instant
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-xs text-slate-500 dark:text-slate-400">
          Inscrivez-vous à une formation pour commencer à suivre votre avancement ici.
        </p>
        <Link
          to="/apprenant/catalogue"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-700 active:scale-95 transition-all"
        >
          Découvrir le catalogue
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* STATISTIQUES APPRENANT */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-md shadow-slate-500/5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
            <BookOpen size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Formations en cours</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{enCoursList.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-md shadow-slate-500/5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Formations terminées</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{termineesList.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-md shadow-slate-500/5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avancement moyen</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{avgProgress}%</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-md shadow-slate-500/5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
            <Award size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Niveau Apprenant</p>
            <p className="text-sm font-black text-slate-900 dark:text-slate-100">
              {termineesList.length > 3 ? 'Expert' : termineesList.length > 0 ? 'Intermédiaire' : 'Débutant'}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION REPRENDRE L'APPRENTISSAGE (AVEC DETAIL DES MODULES ET LEÇONS) */}
      {currentCourse ? (
        <div className="overflow-hidden rounded-3xl border border-sky-200/80 bg-gradient-to-r from-sky-50/80 via-white to-indigo-50/50 p-6 shadow-xl shadow-sky-500/5 backdrop-blur-md dark:border-sky-900/40 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/20 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-3 py-1 text-[11px] font-extrabold text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
              <PlayCircle size={14} className="animate-pulse text-sky-500" />
              Reprendre l'apprentissage
            </span>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-800 dark:bg-sky-950 dark:text-sky-300">
              {currentCourse.progress_percent}% de la formation complété
            </span>
          </div>

          {/* TITRE ET ACTION CONTINUER */}
          <div className="mt-4 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                {currentCourse.formation_titre}
              </h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Niveau : {NIVEAU_LABELS[currentCourse.formation_niveau]}
              </p>
            </div>

            <Link
              to={`/apprenant/formations/${currentCourse.formation}${activeLessonId ? `?lecon=${activeLessonId}` : ''}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-sky-500/25 transition-all hover:from-sky-700 hover:to-indigo-700 active:scale-95 shrink-0"
            >
              <span>Continuer la leçon</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* BARRE DE PROGRESSION GLOBALE LUMINEUSE */}
          <div className="mt-6">
            <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1.5 dark:text-slate-400">
              <span>Progression globale</span>
              <span>{currentCourse.progress_percent}%</span>
            </div>
            <div className="h-3.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-600 transition-all duration-500 shadow-sm"
                style={{ width: `${currentCourse.progress_percent}%` }}
              />
            </div>
          </div>

          {/* OÙ VOUS VOUS ÊTES ARRÊTÉ (ENCADRÉ SPÉCIFIQUE LEÇON / MODULE) */}
          {activeLessonTitle && (
            <div className="mt-6 rounded-2xl border border-sky-200 bg-white/80 p-4 shadow-sm dark:border-sky-800/60 dark:bg-slate-800/80">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow-md shadow-sky-500/30">
                  <MapPin size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">
                      Vous vous êtes arrêté ici :
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 mt-0.5">
                    Module {activeModuleIndex} — {activeModuleTitle}
                  </h4>
                  <p className="text-xs font-bold text-sky-700 dark:text-sky-300 mt-0.5 flex items-center gap-1.5">
                    <PlayCircle size={13} className="shrink-0" />
                    Leçon {activeLessonIndex} : {activeLessonTitle}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEPPER HORIZONTAL - PARCOURS RECOMMANDÉ */}
          {activeCourseDetail && activeCourseDetail.modules.length > 0 && (
            <div className="mt-6 border-t border-slate-200/60 pt-6 dark:border-slate-800">
              <RecommendedPathStepper
                courseTitle={currentCourse.formation_titre}
                modules={activeCourseDetail.modules}
                completedLessonIds={flatLessons
                  .filter((f) => f.globalIndex < Math.floor((currentCourse.progress_percent / 100) * flatLessons.length))
                  .map((f) => f.id)}
                activeModuleIndex={Math.max(0, activeModuleIndex - 1)}
                onSelectModule={(_modIdx, firstLecId) => {
                  navigate(`/apprenant/formations/${currentCourse.formation}${firstLecId ? `?lecon=${firstLecId}` : ''}`)
                }}
              />
            </div>
          )}

          {/* DÉTAIL ET PROGRESSION PAR MODULE & LEÇON */}
          {activeCourseDetail && activeCourseDetail.modules.length > 0 && (
            <div className="mt-6 border-t border-slate-200/60 pt-4 dark:border-slate-800">
              <button
                onClick={() => setShowLessonBreakdown(!showLessonBreakdown)}
                className="flex items-center justify-between w-full text-xs font-bold text-slate-700 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <BookOpen size={15} className="text-sky-500" />
                  Progression détaillée du contenu ({activeCourseDetail.modules.length} modules, {flatLessons.length} leçons)
                </span>
                {showLessonBreakdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showLessonBreakdown && (
                <div className="mt-4 space-y-4">
                  {activeCourseDetail.modules.map((module, mIdx) => {
                    const moduleLessons = module.lecons
                    const totalModLecons = moduleLessons.length

                    return (
                      <div
                        key={module.id}
                        className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-800/80 dark:bg-slate-900/60"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-black text-slate-900 dark:text-slate-100">
                            Module {mIdx + 1} — {module.titre}
                          </h3>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-md">
                            {totalModLecons} leçon{totalModLecons > 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* LISTE DES LEÇONS ET STATUT DE PROGRESSION */}
                        <div className="space-y-2">
                          {moduleLessons.map((lecon, lIdx) => {
                            const flatItem = flatLessons.find((f) => f.id === lecon.id)
                            const completedCount = Math.floor((currentCourse.progress_percent / 100) * flatLessons.length)
                            const isCompleted = flatItem ? flatItem.globalIndex < completedCount : false
                            const isCurrent = flatItem ? flatItem.globalIndex === Math.min(completedCount, flatLessons.length - 1) : false

                            return (
                              <Link
                                key={lecon.id}
                                to={`/apprenant/formations/${currentCourse.formation}?lecon=${lecon.id}`}
                                className={`group flex items-center justify-between rounded-xl p-2.5 transition-all text-xs ${isCurrent
                                    ? 'bg-sky-50 border border-sky-300/80 font-bold text-sky-900 shadow-sm dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-200'
                                    : isCompleted
                                      ? 'bg-slate-50/80 text-slate-700 dark:bg-slate-800/30 dark:text-slate-300 hover:bg-sky-50/50'
                                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                                  }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {isCompleted ? (
                                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                  ) : isCurrent ? (
                                    <PlayCircle size={16} className="text-sky-600 animate-pulse shrink-0" />
                                  ) : (
                                    <Circle size={16} className="text-slate-300 dark:text-slate-600 shrink-0" />
                                  )}

                                  <span className="truncate">
                                    Leçon {lIdx + 1} : {lecon.titre}
                                  </span>
                                </div>

                                <div className="shrink-0 flex items-center gap-2 ml-2">
                                  {isCurrent && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-500 px-2 py-0.5 text-[9px] font-black text-white shadow-xs">
                                      En cours
                                    </span>
                                  )}
                                  {isCompleted && (
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                      Terminée
                                    </span>
                                  )}
                                  {!isCompleted && !isCurrent && (
                                    <span className="text-[10px] font-semibold text-slate-400">
                                      À venir
                                    </span>
                                  )}
                                  <ArrowRight size={13} className="text-slate-400 group-hover:translate-x-0.5 transition-transform group-hover:text-sky-600" />
                                </div>
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-8 text-center shadow-md backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
            <BookOpen size={24} />
          </div>
          <h2 className="mt-3 text-base font-bold text-slate-900 dark:text-slate-100">
            Vous n'avez pas de formation en cours
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Inscrivez-vous à une formation dans le catalogue pour lancer votre apprentissage.
          </p>
          <Link
            to="/apprenant/catalogue"
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-sky-700"
          >
            Découvrir le catalogue
          </Link>
        </div>
      )}
    </div>
  )
}
