import {
  Video,
  FileText,
  Download,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  ArrowRight,
  FileDown,
  Check,
  ExternalLink,
  Eye,
  ListChecks,
  AlertTriangle,
  Lock,
  XCircle,
  Loader2,
} from 'lucide-react'
import { useState } from 'react'
import { apiFetch, ApiError } from '../api/client'
import type { PublicLecon, Ressource, Exercice, Quiz, QuizResult } from '../api/types'

interface InteractiveLessonViewerProps {
  formationTitle?: string
  moduleTitle: string
  moduleIndex: number
  lecon: PublicLecon
  leconIndex: number
  totalLeconsInModule: number
  isCompleted?: boolean
  onCompleteAndNext?: () => void
  // Appelé quand un QCM de cette leçon vient d'être réussi (score calculé
  // côté serveur) — permet au parent de rafraîchir la vraie progression.
  onQuizPassed?: () => void
}

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null
}

export function InteractiveLessonViewer({
  formationTitle,
  moduleTitle,
  moduleIndex,
  lecon,
  leconIndex,
  totalLeconsInModule,
  isCompleted = false,
  onCompleteAndNext,
  onQuizPassed,
}: InteractiveLessonViewerProps) {
  const [showCorrectionIndex, setShowCorrectionIndex] = useState<number | null>(null)
  const [userAttemptedExercise, setUserAttemptedExercise] = useState<boolean>(isCompleted)

  // QCM réel : réponses choisies par question, résultat renvoyé par le
  // serveur une fois soumis (jamais calculé côté client — voir
  // QuizSubmitView, seule autorité sur ce qui est correct).
  const [answersByQuiz, setAnswersByQuiz] = useState<Record<string, Record<string, string>>>({})
  const [resultByQuiz, setResultByQuiz] = useState<Record<string, QuizResult>>({})
  const [submittingQuizId, setSubmittingQuizId] = useState<string | null>(null)
  const [quizError, setQuizError] = useState<string | null>(null)

  const youtubeEmbedUrl = lecon.video_url ? getYouTubeEmbedUrl(lecon.video_url) : null

  function handleAnswerExercise() {
    setUserAttemptedExercise(true)
  }

  function handleSelectAnswer(quizId: string, questionId: string, choiceId: string) {
    if (resultByQuiz[quizId]) return // déjà soumis : plus de modification possible
    setAnswersByQuiz((prev) => ({
      ...prev,
      [quizId]: { ...(prev[quizId] ?? {}), [questionId]: choiceId },
    }))
  }

  async function handleSubmitQuiz(quiz: Quiz) {
    const reponses = answersByQuiz[quiz.id] ?? {}
    if (Object.keys(reponses).length < quiz.questions.length) return

    setQuizError(null)
    setSubmittingQuizId(quiz.id)
    try {
      const result = await apiFetch<QuizResult>(`/quiz/${quiz.id}/soumettre/`, {
        method: 'POST',
        body: { reponses },
      })
      setResultByQuiz((prev) => ({ ...prev, [quiz.id]: result }))
      if (result.reussi) {
        onQuizPassed?.()
      }
    } catch (err) {
      setQuizError(err instanceof ApiError ? err.message : "Impossible d'envoyer vos réponses au serveur.")
    } finally {
      setSubmittingQuizId(null)
    }
  }

  function handleRetryQuiz(quizId: string) {
    setResultByQuiz((prev) => {
      const next = { ...prev }
      delete next[quizId]
      return next
    })
    setAnswersByQuiz((prev) => ({ ...prev, [quizId]: {} }))
  }

  const quizzes = lecon.quiz ?? []
  const allQuizzesPassed = quizzes.length > 0 && quizzes.every((q) => resultByQuiz[q.id]?.reussi)
  const hasExercicesOnly = quizzes.length === 0 && Boolean(lecon.exercices && lecon.exercices.length > 0)

  const isValidationAllowed =
    isCompleted ||
    (quizzes.length > 0
      ? allQuizzesPassed
      : hasExercicesOnly
      ? userAttemptedExercise
      : true)

  const resourceCount = lecon.ressources?.length ?? 0

  return (
    <div className="space-y-6">
      {/* EN-TÊTE COMPACT */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="min-w-0 space-y-1">
          {formationTitle && (
            <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-formation-title">
              {formationTitle}
            </p>
          )}
          <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            Module {moduleIndex} · {moduleTitle}
          </div>
          <h2 className="truncate text-lg font-bold text-slate-900 sm:text-xl dark:text-slate-100">
            {leconIndex}. {lecon.titre}
          </h2>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
            isCompleted
              ? 'border border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400'
          }`}
        >
          <CheckCircle2 size={14} />
          {isCompleted ? 'Validée' : `${leconIndex} / ${totalLeconsInModule}`}
        </span>
      </div>

      {/* GRILLE PRINCIPALE : CONTENU (2/3) + BARRE LATÉRALE (1/3) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        <div className="space-y-6 lg:col-span-2">
          {/* VIDÉO */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-black shadow-xl aspect-video dark:border-slate-800">
            {youtubeEmbedUrl ? (
              <iframe
                src={youtubeEmbedUrl}
                title={lecon.titre}
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : lecon.video_url ? (
              <video key={lecon.video_url} controls src={lecon.video_url} className="h-full w-full object-contain bg-black">
                Votre navigateur ne supporte pas la lecture vidéo HTML5.
              </video>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center text-white">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-sky-500/20 text-sky-400">
                  <Video size={36} />
                </div>
                <h4 className="text-sm font-bold uppercase tracking-wide">Pas de vidéo pour cette leçon</h4>
                <p className="mt-1 max-w-md text-xs text-slate-400">
                  Poursuivez avec les explications écrites et les supports ci-contre.
                </p>
              </div>
            )}
          </div>

          {/* CONTENU DU COURS */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300">
              <FileText size={16} className="text-sky-500" />
              <span>Contenu & transcription</span>
            </div>

            {lecon.contenu ? (
              <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans">
                {lecon.contenu}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Consultez les explications et les notions théoriques transmises par l'enseignant pour cette leçon.
              </p>
            )}

            <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4 dark:border-sky-900/40 dark:bg-sky-950/30 flex items-start gap-3">
              <Sparkles size={18} className="text-sky-600 shrink-0 mt-0.5" />
              <p className="text-xs text-sky-900 dark:text-sky-200">
                <strong>À retenir :</strong> lisez la leçon et téléchargez les supports avant de passer aux
                exercices.
              </p>
            </div>
          </div>

          {/* QCM RÉEL (validation calculée par le serveur, jamais en local) */}
          {quizzes.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                <ListChecks size={16} className="text-amber-500" />
                <span>QCM (Obligatoire)</span>
              </div>

              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold uppercase tracking-wide">Validation obligatoire :</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                    Répondez correctement à au moins {quizzes[0]?.seuil_reussite ?? 70}% des questions pour débloquer
                    la leçon suivante.
                  </p>
                </div>
              </div>

              {quizError && (
                <div className="rounded-2xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                  {quizError}
                </div>
              )}

              {quizzes.map((quiz) => {
                const result = resultByQuiz[quiz.id]
                const answers = answersByQuiz[quiz.id] ?? {}
                const allAnswered = quiz.questions.every((q) => Boolean(answers[q.id]))
                const isSubmitting = submittingQuizId === quiz.id

                return (
                  <div
                    key={quiz.id}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-5 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wide text-slate-900 dark:text-slate-100">
                        {quiz.titre}
                      </h4>
                      {result && (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase ${
                            result.reussi
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {result.reussi ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                          Score : {result.score}%
                        </span>
                      )}
                    </div>

                    {quiz.questions.map((question, qIdx) => {
                      const bonneChoixId = result?.correction[question.id]
                      return (
                        <div key={question.id} className="space-y-2">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {qIdx + 1}. {question.enonce}
                          </h5>
                          <div className="space-y-2">
                            {question.choix.map((choix) => {
                              const isSelected = answers[question.id] === choix.id
                              const isTheCorrectOne = result && bonneChoixId === choix.id
                              const isWrongSelected = result && isSelected && !isTheCorrectOne
                              return (
                                <button
                                  key={choix.id}
                                  type="button"
                                  disabled={Boolean(result)}
                                  onClick={() => handleSelectAnswer(quiz.id, question.id, choix.id)}
                                  className={`flex w-full items-center justify-between rounded-2xl border p-3.5 text-xs text-left transition-all ${
                                    result
                                      ? isTheCorrectOne
                                        ? 'border-emerald-400 bg-emerald-50 font-bold text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                                        : isWrongSelected
                                        ? 'border-rose-400 bg-rose-50 font-bold text-rose-900 dark:bg-rose-950/40 dark:text-rose-200'
                                        : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'
                                      : isSelected
                                      ? 'border-sky-500 bg-sky-50 font-bold text-sky-900 dark:bg-sky-950/50 dark:text-sky-200'
                                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50'
                                  }`}
                                >
                                  <span>{choix.texte}</span>
                                  {isTheCorrectOne && <CheckCircle2 size={16} className="text-emerald-500" />}
                                  {isWrongSelected && <XCircle size={16} className="text-rose-500" />}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}

                    <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                      {result ? (
                        result.reussi ? (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Check size={16} /> QCM réussi !
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRetryQuiz(quiz.id)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            Réessayer
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => handleSubmitQuiz(quiz)}
                          disabled={!allAnswered || isSubmitting}
                          className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-2 text-xs font-extrabold uppercase tracking-wide text-white hover:bg-sky-700 disabled:opacity-40 shadow-xs"
                        >
                          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                          Soumettre mes réponses
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* EXERCICES (texte libre, auto-évalués — en complément, jamais
              l'unique mécanisme de validation quand un vrai QCM existe) */}
          {hasExercicesOnly && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                <ListChecks size={16} className="text-amber-500" />
                <span>Exercices pratiques (Obligatoire)</span>
              </div>

              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold uppercase tracking-wide">Validation Obligatoire :</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                    Ces exercices sont auto-évalués (consultez la correction vous-même) — aucun QCM n'est rattaché à
                    cette leçon.
                  </p>
                </div>
              </div>

              {(lecon.exercices ?? []).map((ex: Exercice, idx: number) => {
                const isCorrectionShown = showCorrectionIndex === idx
                return (
                  <div
                    key={ex.id || idx}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      <HelpCircle size={13} />
                      EXERCICE N°{idx + 1}
                    </span>

                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                      {ex.enonce}
                    </h4>

                    <div className="border-t border-slate-100 pt-4 flex items-center justify-between dark:border-slate-800">
                      <button
                        onClick={() => {
                          setShowCorrectionIndex(isCorrectionShown ? null : idx)
                          handleAnswerExercise()
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-sky-700 active:scale-95 transition-all"
                      >
                        <Eye size={14} />
                        {isCorrectionShown ? 'Masquer la correction' : 'Vérifier & afficher la correction'}
                      </button>
                    </div>

                    {isCorrectionShown && (
                      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200 space-y-1">
                        <p className="font-extrabold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                          Correction officielle :
                        </p>
                        <p>{ex.correction}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* BARRE LATÉRALE : SUPPORTS + STATUT (collante sur grand écran) */}
        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                <Download size={15} className="text-sky-500" />
                <span>Supports PDF</span>
              </div>
              {resourceCount > 0 && (
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-extrabold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  {resourceCount}
                </span>
              )}
            </div>

            {resourceCount > 0 ? (
              <div className="mt-3 space-y-2">
                {(lecon.ressources ?? []).map((res: Ressource, idx: number) => (
                  <a
                    key={res.id || idx}
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 transition-all hover:border-sky-300 hover:bg-sky-50/50 dark:border-slate-800 dark:hover:border-sky-800 dark:hover:bg-sky-950/20"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
                      <FileDown size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold text-slate-900 dark:text-slate-100">{res.nom}</p>
                      <p className="text-[10px] text-slate-400">Télécharger</p>
                    </div>
                    <ExternalLink size={13} className="shrink-0 text-slate-400" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-[11px] text-slate-400 italic">Aucun support PDF pour cette leçon.</p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300">
              <ListChecks size={15} className="text-sky-500" />
              <span>Statut de la leçon</span>
            </div>
            {isValidationAllowed ? (
              <p className="flex items-start gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                Prête à être validée.
              </p>
            ) : (
              <p className="flex items-start gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <Lock size={16} className="shrink-0 mt-0.5" />
                {quizzes.length > 0
                  ? 'Réussissez le QCM ci-contre pour débloquer la suite.'
                  : "Faites l'exercice ci-contre pour débloquer la suite."}
              </p>
            )}

            {onCompleteAndNext && (
              <button
                onClick={onCompleteAndNext}
                disabled={!isValidationAllowed}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
              >
                {/* Dernière leçon du module : plus aucune leçon suivante DANS
                    ce module, donc on valide/termine le module plutôt que de
                    promettre une "leçon suivante" qui n'existe pas ici. */}
                <span>{leconIndex >= totalLeconsInModule ? 'Terminer le module' : 'Valider et continuer'}</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
