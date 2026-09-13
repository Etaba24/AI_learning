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
} from 'lucide-react'
import { useState } from 'react'
import type { PublicLecon, Ressource, Exercice } from '../api/types'

interface InteractiveLessonViewerProps {
  formationTitle?: string
  moduleTitle: string
  moduleIndex: number
  lecon: PublicLecon
  leconIndex: number
  totalLeconsInModule: number
  isCompleted?: boolean
  onCompleteAndNext?: () => void
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
}: InteractiveLessonViewerProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [hasSubmittedQuiz, setHasSubmittedQuiz] = useState(false)
  const [showCorrectionIndex, setShowCorrectionIndex] = useState<number | null>(null)
  const [userAttemptedExercise, setUserAttemptedExercise] = useState<boolean>(isCompleted)

  const youtubeEmbedUrl = lecon.video_url ? getYouTubeEmbedUrl(lecon.video_url) : null

  function handleAnswerExercise() {
    setHasSubmittedQuiz(true)
    setUserAttemptedExercise(true)
  }

  const isValidationAllowed = isCompleted || userAttemptedExercise

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-8 pb-8">
      {/* HEADER DE LA LEÇON : EN-TÊTE & HIÉRARCHIE DES TITRES (Image 2) */}
      <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-6 dark:border-slate-800 dark:bg-slate-800/40">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            {formationTitle && (
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-formation-title">
                {formationTitle}
              </p>
            )}
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              MODULE {moduleIndex} : {moduleTitle}
            </span>
            <h2 className="text-xl font-bold uppercase tracking-normal text-slate-900 sm:text-2xl dark:text-slate-100">
              LEÇON {leconIndex} / {totalLeconsInModule} — {lecon.titre}
            </h2>
          </div>

          {isCompleted && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 size={15} />
              LEÇON VALIDÉE
            </span>
          )}
        </div>
      </div>

      <div className="px-6 sm:px-8 space-y-10">
        {/* VIDÉO DE COURS (RÉDUITE ET CENTRÉE) */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300">
            <Video size={16} className="text-sky-500" />
            <span>Vidéo du cours</span>
          </div>

          <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-black shadow-xl aspect-video flex items-center justify-center dark:border-slate-800">
            {youtubeEmbedUrl ? (
              <iframe
                src={youtubeEmbedUrl}
                title={lecon.titre}
                className="h-full w-full rounded-3xl border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : lecon.video_url ? (
              <video
                key={lecon.video_url}
                controls
                src={lecon.video_url}
                className="h-full w-full rounded-3xl object-contain bg-black"
              >
                Votre navigateur ne supporte pas la lecture vidéo HTML5.
              </video>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center text-white">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-500/20 text-sky-400 mb-3">
                  <Video size={36} />
                </div>
                <h4 className="text-sm font-bold uppercase tracking-wide">Vidéo de la leçon</h4>
                <p className="mt-1 text-xs text-slate-400 max-w-md">
                  Poursuivez la lecture des explications écrites et des supports ci-dessous.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* CONTENU DU COURS */}
        <section className="space-y-3 border-t border-slate-100 pt-8 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300">
            <FileText size={16} className="text-sky-500" />
            <span>Contenu & Transcription du cours</span>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-800/20 space-y-4">
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
                <strong>À retenir :</strong> Lisez attentivement la leçon et téléchargez les supports de cours PDF ci-dessous pour approfondir vos connaissances avant de procéder aux exercices.
              </p>
            </div>
          </div>
        </section>

        {/* SUPPORTS PDF */}
        <section className="space-y-3 border-t border-slate-100 pt-8 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300">
              <Download size={16} className="text-sky-500" />
              <span>Supports PDF (pour approfondissement)</span>
            </div>
            <span className="rounded-full bg-sky-100 px-3 py-0.5 text-[10px] font-extrabold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              Approfondissement
            </span>
          </div>

          {lecon.ressources && lecon.ressources.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {lecon.ressources.map((res: Ressource, idx: number) => (
                <div
                  key={res.id || idx}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-sky-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
                      <FileDown size={22} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wide text-slate-900 dark:text-slate-100">
                        {res.nom}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Support PDF de cours</p>
                    </div>
                  </div>

                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-700 active:scale-95 transition-all"
                  >
                    <ExternalLink size={14} />
                    Télécharger
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-800 dark:bg-slate-800/20">
              <FileText size={28} className="mx-auto text-slate-400 mb-2" />
              <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                Supports de cours (pour approfondissement)
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Aucun fichier PDF supplémentaire n'a été rattaché à cette leçon.
              </p>
            </div>
          )}
        </section>

        {/* EXERCICES PRATIQUES */}
        <section className="space-y-4 border-t border-slate-100 pt-8 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300">
            <ListChecks size={16} className="text-amber-500" />
            <span>Exercices pratiques (Obligatoire)</span>
          </div>

          {/* MESSAGE D'ALERTE D'OBLIGATION */}
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold uppercase tracking-wide">Validation Obligatoire :</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                Vous devez obligatoirement effectuer et valider les exercices ci-dessous avant de pouvoir marquer cette leçon comme terminée et passer à la suivante !
              </p>
            </div>
          </div>

          {lecon.exercices && lecon.exercices.length > 0 ? (
            <div className="space-y-4">
              {lecon.exercices.map((ex: Exercice, idx: number) => {
                const isCorrectionShown = showCorrectionIndex === idx
                return (
                  <div
                    key={ex.id || idx}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        <HelpCircle size={13} />
                        EXERCICE N°{idx + 1}
                      </span>
                    </div>

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
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                Question de compréhension : Selon les principes abordés dans la leçon "{lecon.titre.toUpperCase()}", quelle est la bonne pratique à adopter ?
              </h3>

              <div className="space-y-2">
                {[
                  'Appliquer rigoureusement la méthodologie présentée dans le cours.',
                  'Passer à la suite sans effectuer de validation.',
                ].map((opt, idx) => {
                  const isSelected = selectedOption === idx
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedOption(idx)}
                      className={`flex w-full items-center justify-between rounded-2xl border p-4 text-xs text-left transition-all ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50 font-bold text-sky-900 dark:bg-sky-950/50 dark:text-sky-200'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <span>{opt}</span>
                      {hasSubmittedQuiz && idx === 0 && <CheckCircle2 size={18} className="text-emerald-500" />}
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  onClick={handleAnswerExercise}
                  disabled={selectedOption === null}
                  className="rounded-2xl bg-sky-600 px-5 py-2 text-xs font-extrabold uppercase tracking-wide text-white hover:bg-sky-700 disabled:opacity-40 shadow-xs"
                >
                  Soumettre ma réponse
                </button>

                {hasSubmittedQuiz && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check size={16} /> Exercice validé !
                  </span>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* FOOTER : BOUTON VALIDER ET PASSER À LA SUIVANTE (DÉBLOQUÉ APRÈS L'EXERCICE) */}
      <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/40 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {!isValidationAllowed ? (
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
              <Lock size={15} />
              Effectuez l'exercice ci-dessus pour débloquer la validation de la leçon.
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
              <CheckCircle2 size={15} />
              Exercice accompli. Vous pouvez valider cette leçon !
            </span>
          )}
        </div>

        {onCompleteAndNext && (
          <button
            onClick={onCompleteAndNext}
            disabled={!isValidationAllowed}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-xs font-extrabold uppercase tracking-wide text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
          >
            {/* Dernière leçon du module : plus aucune leçon suivante DANS ce
                module, donc on valide/termine le module plutôt que de
                promettre une "leçon suivante" qui n'existe pas ici. */}
            <span>{leconIndex >= totalLeconsInModule ? 'Terminer le module' : 'Valider et leçon suivante'}</span>
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
