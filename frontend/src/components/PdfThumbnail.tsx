import { FileWarning } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

/** Aperçu réel de la première page d'un PDF, rendue sur un <canvas> — pas
 * un <iframe> vers le visualiseur du navigateur, dont le fond/la barre
 * d'outils varie selon le navigateur (et peut apparaître noir). Rendu
 * entièrement côté client, aucune donnée inventée : en cas d'échec (fichier
 * corrompu, réseau...) on l'affiche honnêtement plutôt que de simuler un
 * aperçu. */
export function PdfThumbnail({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    setStatus('loading')

    const loadingTask = pdfjsLib.getDocument({ url })

    loadingTask.promise
      .then((pdf) => pdf.getPage(1))
      .then((page) => {
        if (cancelled) return
        const canvas = canvasRef.current
        if (!canvas) return

        const unscaledViewport = page.getViewport({ scale: 1 })
        const scale = canvas.clientWidth / unscaledViewport.width
        const viewport = page.getViewport({ scale })
        const ratio = window.devicePixelRatio || 1

        canvas.width = viewport.width * ratio
        canvas.height = viewport.height * ratio
        canvas.style.height = `${viewport.height}px`

        const context = canvas.getContext('2d')
        if (!context) throw new Error('canvas 2d context indisponible')
        context.setTransform(ratio, 0, 0, ratio, 0, 0)

        return page.render({ canvas, canvasContext: context, viewport }).promise
      })
      .then(() => {
        if (!cancelled) setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
      loadingTask.destroy()
    }
  }, [url])

  if (status === 'error') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1.5 text-slate-300 dark:text-slate-600">
        <FileWarning size={28} />
        <span className="text-[10px] font-bold uppercase tracking-wide">Aperçu indisponible</span>
      </div>
    )
  }

  return (
    <div className="relative flex h-full items-start justify-center overflow-hidden bg-white dark:bg-slate-950">
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
        </div>
      )}
      <canvas ref={canvasRef} className={`w-full ${status === 'ready' ? 'block' : 'invisible'}`} />
    </div>
  )
}
