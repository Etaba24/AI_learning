import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import type { ReactNode } from 'react'

export type AlertVariant = 'error' | 'success' | 'warning' | 'info'

interface AlertProps {
  variant?: AlertVariant
  title?: string
  message?: string
  children?: ReactNode
  onClose?: () => void
  className?: string
}

const VARIANT_STYLES: Record<
  AlertVariant,
  {
    icon: typeof AlertCircle
    container: string
    iconColor: string
    titleColor: string
    textColor: string
  }
> = {
  error: {
    icon: AlertCircle,
    container:
      'border-rose-200 bg-rose-50/90 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-200',
    iconColor: 'text-rose-600 dark:text-rose-400',
    titleColor: 'text-rose-900 dark:text-rose-100',
    textColor: 'text-rose-700 dark:text-rose-300',
  },
  success: {
    icon: CheckCircle2,
    container:
      'border-emerald-200 bg-emerald-50/90 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-200',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    titleColor: 'text-emerald-900 dark:text-emerald-100',
    textColor: 'text-emerald-700 dark:text-emerald-300',
  },
  warning: {
    icon: AlertTriangle,
    container:
      'border-amber-200 bg-amber-50/90 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-200',
    iconColor: 'text-amber-600 dark:text-amber-400',
    titleColor: 'text-amber-900 dark:text-amber-100',
    textColor: 'text-amber-700 dark:text-amber-300',
  },
  info: {
    icon: Info,
    container:
      'border-sky-200 bg-sky-50/90 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/50 dark:text-sky-200',
    iconColor: 'text-sky-600 dark:text-sky-400',
    titleColor: 'text-sky-900 dark:text-sky-100',
    textColor: 'text-sky-700 dark:text-sky-300',
  },
}

/** Composant d'alerte contextuelle (bandeau d'erreur de formulaire, notification d'état...)
 * avec icône animée, bordure teintée et prise en charge du mode sombre. */
export function Alert({
  variant = 'error',
  title,
  message,
  children,
  onClose,
  className = '',
}: AlertProps) {
  const style = VARIANT_STYLES[variant]
  const Icon = style.icon

  return (
    <div
      className={`relative flex items-start gap-3 rounded-2xl border p-4 text-sm shadow-sm backdrop-blur-sm transition-all ${
        style.container
      } ${
        variant === 'error'
          ? 'animate-[alert-slide-down_0.3s_ease-out,alert-shake_0.4s_ease-in-out]'
          : 'animate-[alert-slide-down_0.3s_ease-out]'
      } ${className}`}
    >
      <div className={`mt-0.5 shrink-0 ${style.iconColor}`}>
        <Icon size={20} className="animate-[icon-pop_0.35s_cubic-bezier(0.175,0.885,0.32,1.275)]" />
      </div>

      <div className="min-w-0 flex-1">
        {title && <h5 className={`font-bold ${style.titleColor}`}>{title}</h5>}
        <div className={`leading-relaxed ${style.textColor}`}>{children ?? message}</div>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="-mr-1 -mt-1 rounded-lg p-1 text-slate-400 opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label="Fermer l'alerte"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
