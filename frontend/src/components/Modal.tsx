import { X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/** Popup modal générique sublimé, réutilisé pour tous les formulaires du projet
 * (Apprenants, Formateurs, Catégories...) — supporte la fermeture par la touche Échap,
 * animations d'entrée/sortie fluides et voile avec flou d'arrière-plan. */
export function Modal({ open, onClose, title, children }: ModalProps) {
  const [shouldRender, setShouldRender] = useState(open)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setShouldRender(true)
      setIsClosing(false)
    } else if (shouldRender) {
      setIsClosing(true)
      const timer = setTimeout(() => {
        setShouldRender(false)
        setIsClosing(false)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [open, shouldRender])

  // Fermeture par touche Échap
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!shouldRender) return null

  return (
    <div
      className={`fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-md transition-opacity duration-200 ${
        isClosing ? 'animate-[backdrop-out_0.2s_ease-in_forwards]' : 'animate-[backdrop-in_0.25s_ease-out]'
      }`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 ${
          isClosing
            ? 'animate-[popup-out_0.2s_ease-in_forwards]'
            : 'animate-[popup-in_0.3s_cubic-bezier(0.16,1,0.3,1)]'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-600" />
        <div className="p-6 sm:p-7">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
