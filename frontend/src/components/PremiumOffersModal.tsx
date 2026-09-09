import { ArrowRight, Crown, Sparkles, X } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface PremiumOffersModalProps {
  open: boolean
  onClose: () => void
}

/** Popup d'information premium — s'affiche quand l'utilisateur
 * clique sur une fonctionnalité réservée aux abonnés. Redirige vers
 * la page "Mon abonnement" pour consulter les formules. */
export function PremiumOffersModal({ open, onClose }: PremiumOffersModalProps) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handleGoToAbonnement = () => {
    navigate('/apprenant/abonnement')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-[fade-in_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95"
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Fermer"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center p-8 text-center sm:p-10">
          <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-amber-500/20 via-amber-400/10 to-orange-500/20 text-amber-500 ring-1 ring-amber-500/30 dark:from-amber-500/30 dark:to-orange-500/30">
            <Crown size={40} className="text-amber-500 drop-shadow-md" />
            <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white shadow">
              <Sparkles size={12} />
            </div>
          </div>

          <span className="mb-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
            Fonctionnalité Premium
          </span>

          <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
            Cet outil nécessite un abonnement
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Accédez à l'ensemble des outils interactifs (IDE, tableur, modélisation 3D, calculatrice et tableau blanc) et profitez de l'intégralité de nos formations.
          </p>

          <div className="mt-6 w-full rounded-2xl border border-amber-200/60 bg-amber-50/50 p-4 text-left dark:border-amber-500/20 dark:bg-amber-500/5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
              Inclus avec Premium :
            </h4>
            <ul className="mt-2 space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Accès illimité à tous les outils d'apprentissage
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Catalogue complet de formations premium
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Accompagnement par Coach IA
              </li>
            </ul>
          </div>

          <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
            <button
              onClick={onClose}
              className="w-full rounded-2xl border border-slate-200 px-5 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 sm:w-1/2"
            >
              Plus tard
            </button>
            <button
              onClick={handleGoToAbonnement}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/30 active:scale-[0.98] sm:w-1/2"
            >
              <span>Voir les offres premium</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

