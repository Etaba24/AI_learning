import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: number
  type: ToastType
  message: string
  title?: string
  duration?: number
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, title?: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const DEFAULT_TITLES: Record<ToastType, string> = {
  success: 'Succès',
  error: 'Erreur',
  warning: 'Attention',
  info: 'Information',
}

const STYLES: Record<
  ToastType,
  {
    icon: typeof CheckCircle2
    border: string
    bg: string
    iconBg: string
    iconColor: string
    progressBg: string
    glowShadow: string
  }
> = {
  success: {
    icon: CheckCircle2,
    border: 'border-emerald-500/30 dark:border-emerald-500/40',
    bg: 'bg-white/95 dark:bg-slate-900/95',
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    progressBg: 'bg-emerald-500',
    glowShadow: 'shadow-emerald-500/10 dark:shadow-emerald-500/20',
  },
  error: {
    icon: AlertCircle,
    border: 'border-rose-500/30 dark:border-rose-500/40',
    bg: 'bg-white/95 dark:bg-slate-900/95',
    iconBg: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20',
    iconColor: 'text-rose-600 dark:text-rose-400',
    progressBg: 'bg-rose-500',
    glowShadow: 'shadow-rose-500/10 dark:shadow-rose-500/20',
  },
  warning: {
    icon: AlertTriangle,
    border: 'border-amber-500/30 dark:border-amber-500/40',
    bg: 'bg-white/95 dark:bg-slate-900/95',
    iconBg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
    progressBg: 'bg-amber-500',
    glowShadow: 'shadow-amber-500/10 dark:shadow-amber-500/20',
  },
  info: {
    icon: Info,
    border: 'border-sky-500/30 dark:border-sky-500/40',
    bg: 'bg-white/95 dark:bg-slate-900/95',
    iconBg: 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20',
    iconColor: 'text-sky-600 dark:text-sky-400',
    progressBg: 'bg-sky-500',
    glowShadow: 'shadow-sky-500/10 dark:shadow-sky-500/20',
  },
}

let nextId = 0

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem
  onDismiss: (id: number) => void
}) {
  const [isLeaving, setIsLeaving] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const duration = toast.duration ?? 4000

  const handleDismiss = useCallback(() => {
    setIsLeaving(true)
    setTimeout(() => onDismiss(toast.id), 250)
  }, [onDismiss, toast.id])

  useEffect(() => {
    if (isPaused) return
    const timer = setTimeout(handleDismiss, duration)
    return () => clearTimeout(timer)
  }, [duration, handleDismiss, isPaused])

  const style = STYLES[toast.type]
  const Icon = style.icon
  const displayTitle = toast.title ?? DEFAULT_TITLES[toast.type]

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`group relative min-w-[320px] max-w-md overflow-hidden rounded-2xl border p-4 shadow-xl backdrop-blur-xl transition-all duration-300 ${style.bg} ${style.border} ${style.glowShadow} ${
        isLeaving ? 'animate-[toast-out-right_0.25s_ease-in_forwards]' : 'animate-[toast-in-right_0.35s_cubic-bezier(0.16,1,0.3,1)]'
      }`}
    >
      <div className="flex items-start gap-3.5">
        {/* Conteneur d'icône animé */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${style.iconBg} ${style.iconColor}`}
        >
          <Icon size={20} className="animate-[icon-pop_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)]" />
        </div>

        {/* Message & Titre */}
        <div className="min-w-0 flex-1 pt-0.5">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{displayTitle}</h4>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{toast.message}</p>
        </div>

        {/* Bouton de fermeture */}
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-1 text-slate-400 opacity-70 transition-all hover:bg-slate-100 hover:opacity-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Fermer la notification"
        >
          <X size={16} />
        </button>
      </div>

      {/* Barre de progression du chronomètre de fermeture */}
      <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden bg-slate-100/50 dark:bg-slate-800/50">
        <div
          className={`h-full ${style.progressBg} transition-all`}
          style={{
            animation: `toast-progress ${duration}ms linear forwards`,
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        />
      </div>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((type: ToastType, message: string, title?: string) => {
    setToasts((prev) => [...prev, { id: nextId++, type, message, title }])
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Conteneur fixe en haut à droite avec empilement animé */}
      <div className="fixed top-5 right-5 z-[130] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastCard toast={toast} onDismiss={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast doit être utilisé à l\'intérieur de <ToastProvider>.')
  }
  return ctx
}
