import { ArrowLeft, Cpu, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { apiFetch, ApiError } from '../../api/client'
import { DEFAULT_PAGE_SIZE } from '../../api/types'
import { BackToToolsLink } from '../../components/BackToToolsLink'
import { useConfirm } from '../../components/ConfirmContext'
import { Pagination } from '../../components/Pagination'
import { useToast } from '../../components/ToastContext'
import { emptyCircuit, type CircuitData } from './arduinoCircuit'

// Monaco pèse lourd : chargé uniquement à l'ouverture d'un croquis, même
// principe que Studio3D/CartographieCanvas pour leurs outils respectifs.
const ArduinoSimulator = lazy(() => import('./ArduinoSimulator'))

interface SketchSummary {
  id: string
  nom: string
  created_at: string
  updated_at: string
}

interface SketchDetail extends SketchSummary {
  code: string
  circuit: CircuitData
}

interface PaginatedResponse<T> {
  count: number
  results: T[]
}

export function ArduinoPage() {
  const confirm = useConfirm()
  const { showToast } = useToast()

  const [sketches, setSketches] = useState<SketchSummary[] | null>(null)
  const [sketchesCount, setSketchesCount] = useState(0)
  const [sketchesPage, setSketchesPage] = useState(1)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [openSketch, setOpenSketch] = useState<SketchDetail | null>(null)
  const [nom, setNom] = useState('')
  const [code, setCode] = useState('')
  const [circuit, setCircuit] = useState<CircuitData>(emptyCircuit())
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(refreshList, [sketchesPage])

  function refreshList() {
    apiFetch<PaginatedResponse<SketchSummary>>(`/sketches/?page=${sketchesPage}`)
      .then((res) => {
        setSketches(res.results)
        setSketchesCount(res.count)
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }

  function openEditor(detail: SketchDetail) {
    setOpenSketch(detail)
    setNom(detail.nom)
    setCode(detail.code)
    setCircuit(detail.circuit?.components ? detail.circuit : emptyCircuit())
    setIsDirty(false)
  }

  async function handleCreate() {
    setIsCreating(true)
    try {
      const created = await apiFetch<SketchDetail>('/sketches/', {
        method: 'POST',
        body: { nom: 'Nouveau croquis' },
      })
      openEditor(created)
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Impossible de créer le croquis.')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleOpen(id: string) {
    try {
      const detail = await apiFetch<SketchDetail>(`/sketches/${id}/`)
      openEditor(detail)
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : "Impossible d'ouvrir le croquis.")
    }
  }

  async function handleSave(options?: { silent?: boolean }) {
    if (!openSketch) return
    setIsSaving(true)
    try {
      await apiFetch<SketchDetail>(`/sketches/${openSketch.id}/`, {
        method: 'PATCH',
        body: { nom: nom.trim() || 'Sans titre', code, circuit },
      })
      setIsDirty(false)
      if (!options?.silent) showToast('success', 'Croquis enregistré.')
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : "Impossible d'enregistrer.")
    } finally {
      setIsSaving(false)
    }
  }

  // Sauvegarde automatique 2,5 s après la dernière modification — même
  // logique que Modélisation 3D et Cartographie.
  useEffect(() => {
    if (!isDirty || !openSketch || isSaving) return
    const timer = setTimeout(() => handleSave({ silent: true }), 2500)
    return () => clearTimeout(timer)
  }, [isDirty, code, circuit, nom, openSketch])

  async function handleBack() {
    if (isDirty) {
      const leave = await confirm({
        title: 'Modifications non enregistrées',
        message: 'Ce croquis contient des modifications non enregistrées. Quitter sans sauvegarder ?',
        confirmLabel: 'Quitter sans sauvegarder',
        cancelLabel: 'Rester',
        danger: true,
      })
      if (!leave) return
    }
    setOpenSketch(null)
    refreshList()
  }

  async function handleDelete(sketch: SketchSummary) {
    const ok = await confirm({
      title: 'Supprimer ce croquis',
      message: `Le croquis « ${sketch.nom} » sera définitivement supprimé. Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (!ok) return
    try {
      await apiFetch(`/sketches/${sketch.id}/`, { method: 'DELETE' })
      showToast('success', `Le croquis « ${sketch.nom} » a été supprimé.`)
      refreshList()
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Impossible de supprimer.')
    }
  }

  if (loadError) {
    return <p className="text-red-600 dark:text-red-400">{loadError}</p>
  }

  if (!sketches) {
    return <p className="text-slate-500 dark:text-slate-400">Chargement...</p>
  }

  // ---- Vue éditeur ----
  if (openSketch) {
    return (
      <div className="flex h-full min-h-[70vh] flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              title="Retour à mes croquis"
            >
              <ArrowLeft size={16} />
            </button>
            <input
              value={nom}
              onChange={(event) => {
                setNom(event.target.value)
                setIsDirty(true)
              }}
              className="w-full rounded-lg border border-transparent px-2 py-1.5 text-sm font-bold text-slate-900 hover:border-slate-200 focus:border-sky-500 focus:outline-none sm:w-64 dark:bg-transparent dark:text-slate-100 dark:hover:border-slate-700"
            />
          </div>

          <button
            onClick={() => handleSave()}
            disabled={isSaving || !isDirty}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-5 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-sky-700 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? 'Enregistrement...' : isDirty ? 'Enregistrer' : 'Enregistré'}
          </button>
        </div>

        <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 p-3 shadow-sm dark:border-slate-800">
          <Suspense
            fallback={
              <div className="flex h-full min-h-[60vh] items-center justify-center text-sm text-slate-400">
                <Loader2 size={18} className="mr-2 animate-spin" />
                Chargement du simulateur...
              </div>
            }
          >
            <div className="h-full min-h-[60vh]">
              <ArduinoSimulator
                code={code}
                onChange={(next) => {
                  setCode(next)
                  setIsDirty(true)
                }}
                circuit={circuit}
                onCircuitChange={(next) => {
                  setCircuit(next)
                  setIsDirty(true)
                }}
              />
            </div>
          </Suspense>
        </div>

        <p className="text-center text-[10px] text-slate-400 dark:text-slate-500">
          API disponible : pinMode, digitalWrite, digitalRead, analogRead, delay, millis, Serial.print/println —
          ajoutez des composants sur le canevas et reliez leurs bornes aux broches de l'Arduino pour construire votre
          propre montage.
        </p>
      </div>
    )
  }

  // ---- Vue liste ----
  return (
    <div className="space-y-6">
      <BackToToolsLink />

      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
          <Cpu size={18} className="text-sky-500" />
          Mes croquis ({sketchesCount})
        </h2>
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-sky-700 active:scale-95 disabled:opacity-50"
        >
          {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Nouveau croquis
        </button>
      </div>

      {sketches.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-14 text-center dark:border-slate-800">
          <Cpu size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Aucun croquis pour l'instant.</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Créez un croquis pour programmer et tester une carte Arduino virtuelle (LED, bouton, buzzer, capteur).
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sketches.map((sketch) => (
            <div
              key={sketch.id}
              className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-500/30"
            >
              <button onClick={() => handleOpen(sketch.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400">
                  <Cpu size={18} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{sketch.nom}</p>
                  <p className="text-xs text-slate-400">
                    Modifié le {new Date(sketch.updated_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </button>
              <button
                onClick={() => handleDelete(sketch)}
                className="shrink-0 rounded-lg p-2 text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-500/10"
                title="Supprimer"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {sketches.length > 0 && (
        <Pagination count={sketchesCount} page={sketchesPage} pageSize={DEFAULT_PAGE_SIZE} onPageChange={setSketchesPage} />
      )}
    </div>
  )
}
