import { AlertTriangle, CheckCircle2, HelpCircle, ShieldAlert, Trash2, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success'

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  variant?: ConfirmVariant
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined)

interface PendingConfirm {
  options: ConfirmOptions
  resolve: (value: boolean) => void
}

/** Remplace window.confirm() par un dialog modal ultra-soigné et animé,
 * conçu spécialement pour les suppressions, désactivations et confirmations.
 * Usage : `const confirm = useConfirm(); const ok = await confirm({ title, message, danger: true })` */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const [isClosing, setIsClosing] = useState(false)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setPending({ options, resolve })
      setIsClosing(false)
    })
  }, [])

  const handleChoice = useCallback((result: boolean) => {
    if (!pending || isClosing) return
    setIsClosing(true)
    setTimeout(() => {
      pending.resolve(result)
      setPending(null)
      setIsClosing(false)
    }, 200) // Durée de l'animation popup-out
  }, [pending, isClosing])

  // Fermeture à la touche Échap & Confirmation à la touche Entrée
  useEffect(() => {
    if (!pending) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleChoice(false)
      } else if (e.key === 'Enter') {
        // Empêche la soumission accidentelle si le focus est sur un autre élément
        e.preventDefault()
        handleChoice(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pending, handleChoice])

  const options = pending?.options
  const variant: ConfirmVariant = options
    ? options.variant ?? (options.danger ? 'danger' : 'info')
    : 'info'

  // Styles visuels riches selon la variante de confirmation
  const variantStyles = {
    danger: {
      accentGradient: 'from-rose-500 via-red-500 to-amber-500',
      iconContainer: 'bg-rose-50 text-rose-600 border-rose-200/80 shadow-rose-500/10 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
      pulseRing: 'bg-rose-500/20 dark:bg-rose-500/30',
      Icon: Trash2,
      badgeText: t('confirm.badge.danger'),
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-800/40',
      confirmButton: 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-lg shadow-rose-500/25 focus:ring-rose-500/50',
    },
    warning: {
      accentGradient: 'from-amber-400 via-amber-500 to-orange-500',
      iconContainer: 'bg-amber-50 text-amber-600 border-amber-200/80 shadow-amber-500/10 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
      pulseRing: 'bg-amber-500/20 dark:bg-amber-500/30',
      Icon: AlertTriangle,
      badgeText: t('confirm.badge.warning'),
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-800/40',
      confirmButton: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25 focus:ring-amber-500/50',
    },
    info: {
      accentGradient: 'from-sky-400 via-sky-500 to-indigo-500',
      iconContainer: 'bg-sky-50 text-sky-600 border-sky-200/80 shadow-sky-500/10 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20',
      pulseRing: 'bg-sky-500/20 dark:bg-sky-500/30',
      Icon: HelpCircle,
      badgeText: t('confirm.badge.info'),
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-800/40',
      confirmButton: 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-lg shadow-sky-500/25 focus:ring-sky-500/50',
    },
    success: {
      accentGradient: 'from-emerald-400 via-emerald-500 to-teal-500',
      iconContainer: 'bg-emerald-50 text-emerald-600 border-emerald-200/80 shadow-emerald-500/10 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
      pulseRing: 'bg-emerald-500/20 dark:bg-emerald-500/30',
      Icon: CheckCircle2,
      badgeText: t('confirm.badge.success'),
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-800/40',
      confirmButton: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 focus:ring-emerald-500/50',
    },
  }[variant]

  const IconComponent = variantStyles.Icon

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className={`fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-md transition-opacity duration-200 ${
            isClosing ? 'animate-[backdrop-out_0.2s_ease-in_forwards]' : 'animate-[backdrop-in_0.25s_ease-out]'
          }`}
          onClick={() => handleChoice(false)}
        >
          <div
            className={`relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 ${
              isClosing
                ? 'animate-[popup-out_0.2s_ease-in_forwards]'
                : variant === 'danger'
                ? 'animate-[popup-in_0.3s_cubic-bezier(0.16,1,0.3,1),alert-shake_0.4s_ease-in-out]'
                : 'animate-[popup-in_0.3s_cubic-bezier(0.16,1,0.3,1)]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ligne d'accent supérieure dégradée */}
            <div className={`h-1.5 w-full bg-gradient-to-r ${variantStyles.accentGradient}`} />

            {/* Bouton de fermeture rapide */}
            <button
              onClick={() => handleChoice(false)}
              className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label={t('confirm.closeAria')}
            >
              <X size={18} />
            </button>

            <div className="p-7 text-center">
              {/* Conteneur d'icône avec halo et animation de pulsation */}
              <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
                {/* Anneau extérieur palpitant */}
                <div className={`absolute inset-0 rounded-full ${variantStyles.pulseRing} animate-[pulse-ring_2s_cubic-bezier(0.45,0,0.55,1)_infinite]`} />
                {/* Icône principale avec animation d'apparition */}
                <div className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border shadow-md ${variantStyles.iconContainer}`}>
                  <IconComponent size={32} className="animate-[icon-pop_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)]" />
                </div>
              </div>

              {/* Badge d'avertissement facultatif */}
              <div className="mb-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold uppercase tracking-wider ${variantStyles.badgeClass}`}>
                  <ShieldAlert size={12} />
                  {variantStyles.badgeText}
                </span>
              </div>

              {/* Titre */}
              <h2 className="mb-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {pending.options.title}
              </h2>

              {/* Message descriptif */}
              <div className="mb-7 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-sm leading-relaxed text-slate-600 dark:border-slate-800/60 dark:bg-slate-800/40 dark:text-slate-300">
                {pending.options.message}
              </div>

              {/* Actions de confirmation */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleChoice(false)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80"
                >
                  {pending.options.cancelLabel ?? t('confirm.cancelLabel')}
                </button>
                <button
                  type="button"
                  autoFocus
                  onClick={() => handleChoice(true)}
                  className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${variantStyles.confirmButton}`}
                >
                  {pending.options.confirmLabel ?? (variant === 'danger' ? t('confirm.deleteLabel') : t('confirm.confirmLabel'))}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm doit être utilisé à l\'intérieur de <ConfirmProvider>.')
  }
  return ctx
}
