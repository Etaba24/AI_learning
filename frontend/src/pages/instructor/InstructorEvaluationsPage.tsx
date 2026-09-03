import {
  Award,
  CheckCircle2,
  Plus,
  FileQuestion,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../../components/ToastContext'

interface QuizItem {
  id: string
  courseTitle: string
  moduleTitle: string
  questionsCount: number
  avgScore: number
  participants: number
}

const INITIAL_QUIZZES: QuizItem[] = []

export function InstructorEvaluationsPage() {
  const { showToast } = useToast()
  const [quizzes] = useState<QuizItem[]>(INITIAL_QUIZZES)

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Award size={22} className="text-indigo-500" />
            Quiz & Évaluations des Leçons
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Consultez les résultats de vos apprenants aux QCM et gérez les banques de questions par module.
          </p>
        </div>

        <button
          onClick={() =>
            showToast('info', 'L\'éditeur de questions QCM s\'ouvre dans le gestionnaire de leçons.', 'Création de Quiz')
          }
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 active:scale-95 shrink-0"
        >
          <Plus size={16} />
          <span>Créer un nouveau QCM</span>
        </button>
      </div>

      {/* STATISTIQUES MOYENNES DES ÉVALUATIONS */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-md backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <FileQuestion size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Quiz Actifs</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{quizzes.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-md backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Moyenne Générale</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">-</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-md backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Évaluations Réussies</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">0</p>
          </div>
        </div>
      </div>

      {/* LISTE DES QUIZ */}
      {quizzes.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <FileQuestion size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
          <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-slate-100">Aucun QCM créé pour le moment</h3>
          <p className="mt-1 text-xs text-slate-400">Ajoutez des questions et évaluations lors de la création de vos leçons.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {quizzes.map((q) => (
            <div
              key={q.id}
              className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-md backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90"
            >
              <div>
                <span className="inline-flex items-center rounded-xl bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 mb-2">
                  {q.courseTitle}
                </span>

                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                  {q.moduleTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {q.questionsCount} questions à choix multiples avec explications instantanées.
                </p>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500 dark:text-slate-400">
                  {q.participants} participants
                </span>

                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  Score moyen : {q.avgScore}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
