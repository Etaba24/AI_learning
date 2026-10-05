import { Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'

interface CourseCompletionModalProps {
  formationTitle: string
  onClose: () => void
}

const CONFETTI_COLORS = ['#38bdf8', '#fbbf24', '#34d399', '#f472b6', '#a78bfa', '#fb923c']

// 16 confettis à positions/délais/couleurs fixes (pas de Math.random() dans
// le rendu : mêmes valeurs à chaque re-render, pas de re-tirage intempestif).
const CONFETTI_PIECES = Array.from({ length: 16 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 8) * 0.12,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}))

/** Affiché une fois toutes les leçons d'une formation validées (dernière
 * leçon du dernier module) — jusque-là, cliquer sur « Terminer le module »
 * à cet instant précis ne déclenchait rien de visible. */
export function CourseCompletionModal({ formationTitle, onClose }: CourseCompletionModalProps) {
  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-md animate-[backdrop-in_0.25s_ease-out]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-[popup-in_0.35s_cubic-bezier(0.16,1,0.3,1)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-600 px-6 pt-10 pb-16 text-center">
          {CONFETTI_PIECES.map((piece, i) => (
            <span
              key={i}
              className="pointer-events-none absolute top-0 h-2 w-2 rounded-sm"
              style={{
                left: `${piece.left}%`,
                backgroundColor: piece.color,
                animation: `confetti-fall 1.8s ease-in ${piece.delay}s infinite`,
              }}
            />
          ))}

          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-white animate-[icon-pop_0.5s_cubic-bezier(0.16,1,0.3,1)_0.15s_both]">
            <Trophy size={32} />
          </div>
          <h2 className="relative mt-4 text-xl font-black text-white">Formation terminée !</h2>
          <p className="relative mt-1 text-xs font-semibold text-white/90">Bravo, vous avez validé toutes les leçons de</p>
          <p className="relative mt-0.5 text-sm font-black text-white">{formationTitle}</p>
        </div>

        <div className="flex flex-col gap-2 p-6">
          <Link
            to="/apprenant/progression"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-xs font-extrabold text-white shadow-md hover:bg-sky-700"
          >
            Voir ma progression
          </Link>
          <Link
            to="/apprenant/catalogue"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-xs font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Découvrir une nouvelle formation
          </Link>
        </div>
      </div>
    </div>
  )
}
