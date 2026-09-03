import { Check, Play, RotateCcw, BookOpen, ChevronRight } from 'lucide-react'
import type { PublicModule } from '../api/types'

interface RecommendedPathStepperProps {
  courseTitle: string
  modules: PublicModule[]
  completedLessonIds?: string[]
  activeModuleIndex: number
  activeLessonId?: string | null
  onSelectModule: (moduleIndex: number, firstLessonId?: string) => void
  onSelectLesson?: (lessonId: string) => void
}

export function RecommendedPathStepper({
  courseTitle,
  modules,
  completedLessonIds = [],
  activeModuleIndex,
  onSelectModule,
}: RecommendedPathStepperProps) {
  // Calculer le nombre total de leçons et le nombre de leçons terminées
  const totalLessons = modules.reduce((acc, m) => acc + m.lecons.length, 0)
  
  let finishedLessonsCount = 0
  modules.forEach((mod) => {
    mod.lecons.forEach((lec) => {
      if (completedLessonIds.includes(lec.id)) {
        finishedLessonsCount++
      }
    })
  })

  // Niveau dynamique par index de module
  function getModuleLevelBadge(index: number) {
    if (index === 0) {
      return (
        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          Débutant
        </span>
      )
    }
    if (index === 1 || index === 2) {
      return (
        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          Intermédiaire
        </span>
      )
    }
    return (
      <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-extrabold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
        Avancé
      </span>
    )
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl shadow-slate-500/5 dark:border-slate-800 dark:bg-slate-900 sm:p-8 space-y-6">
      {/* EN-TÊTE DU PARCOURS RECOMMANDÉ */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 dark:border-slate-800">
        <div>
          <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Parcours recommandé
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Suivez cette séquence pour maîtriser {courseTitle || 'la formation'} étape par étape
          </p>
        </div>

        <div className="shrink-0 text-right">
          <span className="text-base font-black text-sky-600 dark:text-sky-400">
            {finishedLessonsCount} / {totalLessons || 1}
          </span>
          <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            terminés
          </span>
        </div>
      </div>

      {/* LIGNE TEMPORELLE / STEPPER INTERACTIF */}
      <div className="overflow-x-auto pb-4 scrollbar-thin">
        <div className="min-w-[700px] space-y-6">
          {/* CERCLES NUMÉROTÉS ET LIGNES DE CONNEXION */}
          <div className="flex items-center justify-between px-4">
            {modules.map((mod, idx) => {
              const modLessonIds = mod.lecons.map((l) => l.id)
              const modCompletedCount = modLessonIds.filter((id) => completedLessonIds.includes(id)).length
              const isFinished = modLessonIds.length > 0 && modCompletedCount === modLessonIds.length
              const isActive = idx === activeModuleIndex

              return (
                <div key={mod.id || idx} className="flex flex-1 items-center">
                  {/* CERCLE NUMÉROTÉ */}
                  <button
                    onClick={() => onSelectModule(idx, mod.lecons[0]?.id)}
                    className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black transition-all shadow-md ${
                      isFinished
                        ? 'bg-emerald-500 text-white shadow-emerald-500/20 hover:scale-105'
                        : isActive
                        ? 'bg-sky-600 text-white ring-4 ring-sky-500/30 shadow-sky-500/30 animate-pulse'
                        : 'border-2 border-slate-300 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 hover:border-sky-400'
                    }`}
                  >
                    {isFinished ? <Check size={18} strokeWidth={3} /> : idx + 1}
                  </button>

                  {/* LIGNE DE LIEN (SAUF DERNIER ITEM) */}
                  {idx < modules.length - 1 && (
                    <div className="flex-1 px-2">
                      {isFinished ? (
                        <div className="h-1 w-full rounded-full bg-emerald-500 transition-all" />
                      ) : (
                        <div className="h-0.5 w-full border-t-2 border-dashed border-slate-300 dark:border-slate-700" />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* GRILLE DE CARTES MODULES DU STEPPER */}
          <div className="grid grid-cols-3 gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {modules.map((mod, idx) => {
              const modLessonIds = mod.lecons.map((l) => l.id)
              const modCompletedCount = modLessonIds.filter((id) => completedLessonIds.includes(id)).length
              const isFinished = modLessonIds.length > 0 && modCompletedCount === modLessonIds.length
              const isActive = idx === activeModuleIndex
              const progressPct = modLessonIds.length > 0 ? Math.round((modCompletedCount / modLessonIds.length) * 100) : 0

              return (
                <div
                  key={mod.id || idx}
                  onClick={() => onSelectModule(idx, mod.lecons[0]?.id)}
                  className={`group relative flex flex-col justify-between rounded-2xl p-4 cursor-pointer transition-all duration-300 border ${
                    isActive
                      ? 'border-sky-500 bg-sky-50/50 shadow-lg shadow-sky-500/10 ring-2 ring-sky-500/40 dark:border-sky-500 dark:bg-sky-950/30'
                      : isFinished
                      ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/20 hover:border-emerald-300'
                      : 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40 hover:border-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <div>
                    {/* HAUT DE CARTE : BADGE ET NBR LEÇONS */}
                    <div className="flex items-center justify-between mb-3">
                      {getModuleLevelBadge(idx)}
                      <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400 dark:text-slate-500">
                        <BookOpen size={12} />
                        {mod.lecons.length} leçons
                      </span>
                    </div>

                    {/* TITRE DU MODULE */}
                    <h4 className="text-xs font-black leading-snug text-slate-900 dark:text-slate-100 line-clamp-2 min-h-[2rem]">
                      {mod.titre}
                    </h4>

                    {/* BARRE DE PROGRESSION SI EN COURS OU FINI */}
                    {progressPct > 0 && !isFinished && (
                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] font-extrabold text-sky-700 dark:text-sky-300 mb-1">
                          <span>Progression</span>
                          <span>{progressPct}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full bg-sky-500 rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* BOUTON D'ACTION SELON LE STATUT */}
                  <div className="mt-4 pt-2">
                    {isFinished ? (
                      <button className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-100/80 py-2 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                        <RotateCcw size={13} />
                        <span>Revoir</span>
                      </button>
                    ) : isActive ? (
                      <button className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-600 py-2 text-xs font-black text-white shadow-md shadow-sky-500/20 transition-all hover:bg-sky-700 active:scale-95">
                        <Play size={12} fill="currentColor" />
                        <span>Continuer</span>
                      </button>
                    ) : (
                      <button className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <ChevronRight size={14} />
                        <span>Commencer</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
