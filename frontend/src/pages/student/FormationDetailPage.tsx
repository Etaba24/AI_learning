import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Award,
  Lock,
  Play,
  PlayCircle,
  ChevronRight,
  FolderOpen,
  Layers,
  Sparkles,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { apiFetch, ApiError } from '../../api/client'
import { NIVEAU_LABELS, type Inscription, type PaginatedResponse, type PublicFormationDetail } from '../../api/types'
import { Alert } from '../../components/Alert'
import { InteractiveLessonViewer } from '../../components/InteractiveLessonViewer'

export function FormationDetailPage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const targetModuleId = searchParams.get('module')
  const targetLeconId = searchParams.get('lecon')

  const [formation, setFormation] = useState<PublicFormationDetail | null>(null)
  const [inscriptions, setInscriptions] = useState<Inscription[] | null>(null)
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(targetModuleId)
  const [activeLeconId, setActiveLeconId] = useState<string | null>(targetLeconId)
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [enrollError, setEnrollError] = useState<string | null>(null)
  const [isEnrolling, setIsEnrolling] = useState(false)

  useEffect(() => {
    apiFetch<PublicFormationDetail>(`/catalogue/formations/${id}/`)
      .then((data) => {
        setFormation(data)
        if (targetLeconId) {
          setActiveLeconId(targetLeconId)
          const parentMod = data.modules.find((m) => m.lecons.some((l) => l.id === targetLeconId))
          if (parentMod) setSelectedModuleId(parentMod.id)
        } else if (targetModuleId) {
          setSelectedModuleId(targetModuleId)
        }
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))

    apiFetch<PaginatedResponse<Inscription>>('/inscriptions/')
      .then((data) => setInscriptions(data.results))
      .catch(() => setInscriptions([]))
  }, [id, targetLeconId, targetModuleId])

  const existingInscription = inscriptions?.find((inscription) => inscription.formation === id)

  useEffect(() => {
    if (formation && existingInscription) {
      const allLessons: string[] = []
      formation.modules.forEach((mod) => mod.lecons.forEach((lec) => allLessons.push(lec.id)))

      const completedCount = Math.floor((existingInscription.progress_percent / 100) * allLessons.length)
      setCompletedLessonIds(allLessons.slice(0, completedCount))
    }
  }, [formation, existingInscription])

  async function handleEnroll() {
    setEnrollError(null)
    setIsEnrolling(true)
    try {
      await apiFetch('/inscriptions/', { method: 'POST', body: { formation: id } })
      const data = await apiFetch<PaginatedResponse<Inscription>>('/inscriptions/')
      setInscriptions(data.results)
    } catch (err) {
      setEnrollError(err instanceof ApiError ? err.message : "Impossible de s'inscrire pour l'instant.")
    } finally {
      setIsEnrolling(false)
    }
  }

  if (error) {
    return <Alert variant="error" message={error} />
  }

  if (!formation) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
        <p className="mt-4 text-xs font-semibold">Chargement du détail de la formation...</p>
      </div>
    )
  }

  const totalLecons = formation.modules.reduce((sum, module) => sum + module.lecons.length, 0)
  const totalMinutes = formation.duree_heures * 60
  const progressPercent = totalLecons > 0 ? Math.round((completedLessonIds.length / totalLecons) * 100) : 0

  // Trouver le module et la leçon sélectionnés
  const currentModule = formation.modules.find((m) => m.id === selectedModuleId) || null
  const currentLecon = currentModule?.lecons.find((l) => l.id === activeLeconId) || null

  const currentModuleIndex = currentModule
    ? formation.modules.findIndex((m) => m.id === currentModule.id)
    : 0
  const currentLeconIndex = currentModule && currentLecon
    ? currentModule.lecons.findIndex((l) => l.id === currentLecon.id)
    : 0

  function handleCompleteAndNextLesson() {
    if (!currentLecon || !formation) return

    if (!completedLessonIds.includes(currentLecon.id)) {
      setCompletedLessonIds((prev) => [...prev, currentLecon.id])
    }

    const flatLessons: { id: string; moduleId: string }[] = []
    formation.modules.forEach((mod) => {
      mod.lecons.forEach((lec) => flatLessons.push({ id: lec.id, moduleId: mod.id }))
    })

    const currIdx = flatLessons.findIndex((l) => l.id === currentLecon.id)
    if (currIdx !== -1 && currIdx + 1 < flatLessons.length) {
      const nextLecon = flatLessons[currIdx + 1]
      setSelectedModuleId(nextLecon.moduleId)
      setActiveLeconId(nextLecon.id)
      setSearchParams({ module: nextLecon.moduleId, lecon: nextLecon.id })
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12 font-sans">
      {/* BREADCRUMB À 3 NIVEAUX (Cours / Formation / Module / Leçon) */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/apprenant/catalogue" className="hover:text-sky-600 dark:hover:text-sky-400">
            Cours
          </Link>
          <span>/</span>
          <button
            onClick={() => {
              setSelectedModuleId(null)
              setActiveLeconId(null)
              setSearchParams({})
            }}
            className="font-bold text-slate-800 hover:text-sky-600 dark:text-slate-200 dark:hover:text-sky-400"
          >
            {formation.titre}
          </button>

          {currentModule && (
            <>
              <span>/</span>
              <button
                onClick={() => {
                  setActiveLeconId(null)
                  setSearchParams({ module: currentModule.id })
                }}
                className="font-bold text-sky-600 hover:underline dark:text-sky-400"
              >
                Module {currentModuleIndex + 1} : {currentModule.titre}
              </button>
            </>
          )}

          {currentLecon && (
            <>
              <span>/</span>
              <span className="font-extrabold uppercase text-slate-900 dark:text-slate-100">
                Leçon {currentLeconIndex + 1}
              </span>
            </>
          )}
        </div>

        <Link
          to="/apprenant/catalogue"
          className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:underline dark:text-sky-400 shrink-0"
        >
          <ArrowLeft size={14} />
          Retour au catalogue
        </Link>
      </div>

      {/* GRANDE ZONE BLEUE EN HAUT (INFORMATIONS ET PROGRESSION CONSOLIDÉES SANS SIDEBAR) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 p-6 text-white shadow-xl sm:p-8">
        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-amber-500/20 px-3 py-1 text-xs font-extrabold text-amber-300 border border-amber-500/30">
                {NIVEAU_LABELS[formation.niveau]}
              </span>
              <span className="rounded-lg bg-sky-500/20 px-3 py-1 text-xs font-extrabold text-sky-300 border border-sky-500/30">
                {formation.categorie_nom}
              </span>
            </div>

            {/* JAUGE DE PROGRESSION DANS LE BANDEAU BLEU */}
            {existingInscription && (
              <div className="flex items-center gap-4 rounded-2xl bg-white/10 px-4 py-2 backdrop-blur-md border border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-[11px] font-bold text-slate-200">
                    <span>Progression</span>
                    <span className="text-sky-400 font-extrabold">{progressPercent}%</span>
                  </div>
                  <div className="h-2 w-36 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-sky-400 transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-300 border-l border-white/20 pl-3">
                  {completedLessonIds.length}/{totalLecons} leçons
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h1 className="font-formation-title text-2xl font-semibold uppercase tracking-wider text-white sm:text-3xl lg:text-4xl">
              {formation.titre}
            </h1>

            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              {formation.description || 'Passez au niveau supérieur. Maîtrisez les concepts clés indispensables pour cette formation.'}
            </p>
          </div>

          {/* MÉTADONNÉES & ACTION PRINCIPALE */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
            <div className="flex flex-wrap items-center gap-6 text-xs font-bold text-slate-300">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-sky-400" />
                <span>{formation.modules.length} modules ({totalLecons} leçons)</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-sky-400" />
                <span>{totalMinutes} min au total</span>
              </div>
              {existingInscription && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span>Statut : En cours d'apprentissage</span>
                </div>
              )}
            </div>

            {existingInscription ? (
              <button
                onClick={() => {
                  if (formation.modules.length > 0) {
                    const firstMod = formation.modules[0]
                    setSelectedModuleId(firstMod.id)
                    if (firstMod.lecons.length > 0) {
                      setActiveLeconId(firstMod.lecons[0].id)
                    }
                  }
                  window.scrollTo({ top: 350, behavior: 'smooth' })
                }}
                className="flex items-center gap-2 rounded-2xl bg-sky-400 px-6 py-3 text-xs font-extrabold text-white shadow-lg shadow-sky-400/30 hover:bg-sky-500 active:scale-95 transition-all"
              >
                <Play size={16} fill="currentColor" />
                <span>Continuer le cours</span>
              </button>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={isEnrolling}
                className="flex items-center gap-2 rounded-2xl bg-sky-500 px-6 py-3 text-xs font-extrabold uppercase tracking-wide text-white shadow-lg shadow-sky-500/25 hover:bg-sky-600 active:scale-95 disabled:opacity-50 transition-all"
              >
                {isEnrolling ? (
                  <span>Inscription...</span>
                ) : (
                  <>
                    <Award size={16} />
                    <span>S'inscrire gratuitement</span>
                  </>
                )}
              </button>
            )}
          </div>

          {enrollError && <Alert variant="error" message={enrollError} onClose={() => setEnrollError(null)} />}
        </div>
      </div>

      {/* ZONE DE CONTENU PRINCIPAL PLEINE LARGEUR */}
      <div className="w-full space-y-6">
        {/* NIVEAU 3 : APPRÉNANT A CLIQUÉ SUR UNE LEÇON -> APPAREIL CONTINU (VIDÉO -> COURS -> PDF -> EXERCICES) */}
        {existingInscription && currentLecon ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setActiveLeconId(null)
                  setSearchParams({ module: currentModule?.id || '' })
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ArrowLeft size={16} />
                <span>Retour aux leçons du module "{currentModule?.titre}"</span>
              </button>

              <button
                onClick={() => {
                  setSelectedModuleId(null)
                  setActiveLeconId(null)
                  setSearchParams({})
                }}
                className="text-xs font-bold text-sky-600 hover:underline dark:text-sky-400"
              >
                Voir tous les modules
              </button>
            </div>

            <InteractiveLessonViewer
              formationTitle={formation.titre}
              moduleTitle={currentModule?.titre || ''}
              moduleIndex={currentModuleIndex + 1}
              lecon={currentLecon}
              leconIndex={currentLeconIndex + 1}
              totalLeconsInModule={currentModule?.lecons.length || 0}
              isCompleted={completedLessonIds.includes(currentLecon.id)}
              onCompleteAndNext={handleCompleteAndNextLesson}
            />
          </div>
        ) : /* NIVEAU 2 : APPRÉNANT A CLIQUÉ SUR UN MODULE -> LISTE DES LEÇONS SELON LE MODÈLE EXACT DE LA CAPTURE D'ÉCRAN */
        existingInscription && currentModule ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedModuleId(null)
                  setActiveLeconId(null)
                  setSearchParams({})
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ArrowLeft size={16} />
                <span>Retour à la liste des modules</span>
              </button>

              <span className="text-xs font-extrabold uppercase tracking-wide text-sky-600 dark:text-sky-400">
                MODULE {currentModuleIndex + 1} / {formation.modules.length} : {currentModule.titre}
              </span>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900 space-y-6">
              <h2 className="text-base font-extrabold uppercase tracking-wide text-slate-900 dark:text-slate-100">
                Programme des leçons du module "{currentModule.titre}"
              </h2>

              {currentModule.lecons.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Aucune leçon n'a encore été ajoutée à ce module.</p>
              ) : (
                /* STEPPER VERTICAL EXACT DE LA CAPTURE D'ÉCRAN DE L'UTILISATEUR (IMAGE 1 & 2) */
                <div className="relative pl-6 space-y-6 border-l-2 border-slate-200 dark:border-slate-800 ml-4">
                  {currentModule.lecons.map((lecon, lIdx) => {
                    const isDone = completedLessonIds.includes(lecon.id)
                    const isSelected = lecon.id === activeLeconId
                    const isPreviousDone = lIdx === 0 || completedLessonIds.includes(currentModule.lecons[lIdx - 1].id)
                    const isUnlocked = isDone || isSelected || isPreviousDone

                    return (
                      <div key={lecon.id} className="relative group">
                        {/* BULLE STEPPER SUR LA LIGNE VERTICALE (IMAGE DE L'UTILISATEUR) */}
                        <div
                          className={`absolute -left-[37px] top-4 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                            isDone
                              ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm'
                              : isSelected
                              ? 'border-sky-400 bg-white text-sky-500 font-extrabold shadow-md dark:bg-slate-900 dark:text-sky-400'
                              : isUnlocked
                              ? 'border-sky-400 bg-white text-sky-500 font-bold dark:bg-slate-900'
                              : 'border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800'
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 size={18} />
                          ) : isSelected ? (
                            <PlayCircle size={18} className="animate-pulse" />
                          ) : isUnlocked ? (
                            <span className="text-xs font-bold">{lIdx + 1}</span>
                          ) : (
                            <Lock size={14} />
                          )}
                        </div>

                        {/* CARTE EXACTE DE LA CAPTURE D'ÉCRAN (IMAGE 1 & 2) */}
                        <div
                          onClick={() => {
                            if (isUnlocked) {
                              setActiveLeconId(lecon.id)
                              setSearchParams({ module: currentModule.id, lecon: lecon.id })
                            }
                          }}
                          className={`flex items-center justify-between rounded-2xl border p-4 transition-all ${
                            isSelected
                              ? 'border-2 border-sky-400 bg-white shadow-md dark:border-sky-500 dark:bg-slate-900'
                              : isDone
                              ? 'border border-emerald-300/80 bg-emerald-50/50 dark:border-emerald-950/60 dark:bg-emerald-950/20'
                              : isUnlocked
                              ? 'border border-slate-200 bg-white hover:border-sky-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-800 cursor-pointer'
                              : 'border border-slate-200 bg-slate-100/60 opacity-60 dark:border-slate-800 dark:bg-slate-800/40 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-sky-600 dark:bg-slate-800 dark:text-sky-400">
                              {isDone ? (
                                <CheckCircle2 size={16} className="text-emerald-500" />
                              ) : isSelected ? (
                                <Play size={16} className="fill-sky-500 text-sky-500" />
                              ) : (
                                <Lock size={14} className="text-slate-400" />
                              )}
                            </div>

                            <div>
                              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {lecon.titre}
                              </h3>
                              <div className="mt-1 flex items-center gap-2 text-[10px] font-semibold text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Clock size={12} /> 20 min
                                </span>
                                <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-extrabold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                  Gratuit
                                </span>
                                {isDone && (
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                    Terminé
                                  </span>
                                )}
                                {!isUnlocked && (
                                  <span>Terminez la leçon précédente</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {isDone ? (
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              Validée
                            </span>
                          ) : isUnlocked ? (
                            <span className="inline-flex items-center gap-1 rounded-xl bg-sky-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-sky-700">
                              Accéder <ChevronRight size={14} />
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Lock size={14} /> Verrouillée
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* NIVEAU 1 (PAR DÉFAUT A L'ENTRÉE) : LISTE DES MODULES SUIVANT LE MODÈLE EXACT DE LA CAPTURE D'ÉCRAN */
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div className="border-b border-slate-100 pb-4 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-base font-extrabold uppercase tracking-wide text-slate-900 dark:text-slate-100">
                  <FolderOpen size={20} className="text-sky-500" />
                  Programme des modules ({formation.modules.length})
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Sélectionnez un module ci-dessous pour ouvrir et consulter ses leçons.
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3.5 py-1 text-xs font-extrabold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                <Sparkles size={14} className="text-amber-500" />
                {formation.modules.length} modules au total
              </span>
            </div>

            {formation.modules.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Aucun module n'a été créé pour cette formation.</p>
            ) : (
              /* STEPPER VERTICAL EXACT DE LA CAPTURE D'ÉCRAN POUR LES MODULES (IMAGE 1 & 2) */
              <div className="relative pl-6 space-y-6 border-l-2 border-slate-200 dark:border-slate-800 ml-4">
                {formation.modules.map((module, mIdx) => {
                  const completedCountInMod = module.lecons.filter((l) => completedLessonIds.includes(l.id)).length
                  const isModCompleted = module.lecons.length > 0 && completedCountInMod === module.lecons.length
                  const isPreviousModCompleted = mIdx === 0 || (formation.modules[mIdx - 1].lecons.length > 0 && formation.modules[mIdx - 1].lecons.every((l) => completedLessonIds.includes(l.id)))
                  const isModUnlocked = !existingInscription || mIdx === 0 || isModCompleted || isPreviousModCompleted

                  return (
                    <div key={module.id} className="relative group">
                      {/* BULLE STEPPER SUR LA LIGNE VERTICALE DE GAUCHE (MODÈLE EXACT DE LA CAPTURE D'ÉCRAN) */}
                      <div
                        className={`absolute -left-[37px] top-4 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                          isModCompleted
                            ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm'
                            : isModUnlocked
                            ? 'border-sky-400 bg-white text-sky-500 font-extrabold shadow-md dark:bg-slate-900 dark:text-sky-400'
                            : 'border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800'
                        }`}
                      >
                        {isModCompleted ? (
                          <CheckCircle2 size={18} />
                        ) : isModUnlocked ? (
                          <span className="text-xs font-bold">{mIdx + 1}</span>
                        ) : (
                          <Lock size={14} />
                        )}
                      </div>

                      {/* CARTE DE MODULE CONFORME AU MODÈLE DE LA CAPTURE D'ÉCRAN */}
                      <div
                        onClick={() => {
                          if (existingInscription && isModUnlocked) {
                            setSelectedModuleId(module.id)
                            setActiveLeconId(null)
                            setSearchParams({ module: module.id })
                          }
                        }}
                        className={`flex items-center justify-between rounded-2xl border p-4 transition-all ${
                          isModCompleted
                            ? 'border border-emerald-300/80 bg-emerald-50/50 dark:border-emerald-950/60 dark:bg-emerald-950/20'
                            : isModUnlocked
                            ? 'border border-slate-200 bg-white hover:border-sky-400 dark:border-slate-800 dark:bg-slate-900 cursor-pointer shadow-xs hover:shadow-md'
                            : 'border border-slate-200 bg-slate-100/60 opacity-60 dark:border-slate-800 dark:bg-slate-800/40 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sky-600 dark:bg-slate-800 dark:text-sky-400">
                            {isModCompleted ? (
                              <CheckCircle2 size={18} className="text-emerald-500" />
                            ) : (
                              <FolderOpen size={18} />
                            )}
                          </div>

                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                              MODULE {mIdx + 1}
                            </span>
                            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-900 dark:text-slate-100">
                              {module.titre}
                            </h3>
                            <div className="mt-1 flex items-center gap-2 text-[10px] font-semibold text-slate-400">
                              <span className="flex items-center gap-1">
                                <Clock size={12} /> {module.lecons.length} leçon{module.lecons.length > 1 ? 's' : ''}
                              </span>
                              <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-extrabold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                Gratuit
                              </span>
                              {isModCompleted ? (
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  Module Terminé ({completedCountInMod}/{module.lecons.length})
                                </span>
                              ) : (
                                <span>
                                  {completedCountInMod}/{module.lecons.length} leçons validées
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {existingInscription && isModUnlocked ? (
                            <button className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-700">
                              <span>Voir les leçons</span>
                              <ChevronRight size={16} />
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400">
                              <Lock size={14} /> Inscrivez-vous
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
