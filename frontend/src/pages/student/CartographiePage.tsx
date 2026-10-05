import { ArrowLeft, Loader2, Map, Plus, Save, Trash2 } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { apiFetch, ApiError } from '../../api/client'
import { DEFAULT_PAGE_SIZE } from '../../api/types'
import { BackToToolsLink } from '../../components/BackToToolsLink'
import { useConfirm } from '../../components/ConfirmContext'
import { Pagination } from '../../components/Pagination'
import { useToast } from '../../components/ToastContext'
import type { CarteElement } from './CartographieCanvas'

// Leaflet + react-leaflet pèsent lourd : chargés uniquement à l'ouverture
// d'une carte, même principe que Studio3D pour la Modélisation 3D.
const CartographieCanvas = lazy(() => import('./CartographieCanvas'))

interface CarteSummary {
  id: string
  nom: string
  created_at: string
  updated_at: string
}

interface CarteDetail extends CarteSummary {
  elements: CarteElement[]
  centre_lat: number
  centre_lng: number
  zoom: number
}

interface PaginatedResponse<T> {
  count: number
  results: T[]
}

export function CartographiePage() {
  const confirm = useConfirm()
  const { showToast } = useToast()

  const [cartes, setCartes] = useState<CarteSummary[] | null>(null)
  const [cartesCount, setCartesCount] = useState(0)
  const [cartesPage, setCartesPage] = useState(1)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [openCarte, setOpenCarte] = useState<CarteDetail | null>(null)
  const [nom, setNom] = useState('')
  const [elements, setElements] = useState<CarteElement[]>([])
  const [centre, setCentre] = useState<[number, number]>([48.8566, 2.3522])
  const [zoom, setZoom] = useState(5)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(refreshList, [cartesPage])

  function refreshList() {
    apiFetch<PaginatedResponse<CarteSummary>>(`/cartes/?page=${cartesPage}`)
      .then((res) => {
        setCartes(res.results)
        setCartesCount(res.count)
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }

  function openEditor(detail: CarteDetail) {
    setOpenCarte(detail)
    setNom(detail.nom)
    setElements(detail.elements ?? [])
    setCentre([detail.centre_lat, detail.centre_lng])
    setZoom(detail.zoom)
    setIsDirty(false)
  }

  async function handleCreate() {
    setIsCreating(true)
    try {
      const created = await apiFetch<CarteDetail>('/cartes/', {
        method: 'POST',
        body: { nom: 'Nouvelle carte', elements: [] },
      })
      openEditor(created)
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Impossible de créer la carte.')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleOpen(id: string) {
    try {
      const detail = await apiFetch<CarteDetail>(`/cartes/${id}/`)
      openEditor(detail)
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : "Impossible d'ouvrir la carte.")
    }
  }

  async function handleSave(options?: { silent?: boolean }) {
    if (!openCarte) return
    setIsSaving(true)
    try {
      await apiFetch<CarteDetail>(`/cartes/${openCarte.id}/`, {
        method: 'PATCH',
        body: { nom: nom.trim() || 'Sans titre', elements, centre_lat: centre[0], centre_lng: centre[1], zoom },
      })
      setIsDirty(false)
      if (!options?.silent) showToast('success', 'Carte enregistrée.')
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : "Impossible d'enregistrer.")
    } finally {
      setIsSaving(false)
    }
  }

  // Sauvegarde automatique 2,5 s après la dernière modification — même
  // logique que Modélisation 3D : un brouillon survit à une navigation via
  // la sidebar ou un rechargement.
  useEffect(() => {
    if (!isDirty || !openCarte || isSaving) return
    const timer = setTimeout(() => handleSave({ silent: true }), 2500)
    return () => clearTimeout(timer)
  }, [isDirty, elements, nom, centre, zoom, openCarte])

  async function handleBack() {
    if (isDirty) {
      const leave = await confirm({
        title: 'Modifications non enregistrées',
        message: 'Cette carte contient des modifications non enregistrées. Quitter sans sauvegarder ?',
        confirmLabel: 'Quitter sans sauvegarder',
        cancelLabel: 'Rester',
        danger: true,
      })
      if (!leave) return
    }
    setOpenCarte(null)
    refreshList()
  }

  async function handleDelete(carte: CarteSummary) {
    const ok = await confirm({
      title: 'Supprimer cette carte',
      message: `La carte « ${carte.nom} » sera définitivement supprimée. Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (!ok) return
    try {
      await apiFetch(`/cartes/${carte.id}/`, { method: 'DELETE' })
      showToast('success', `La carte « ${carte.nom} » a été supprimée.`)
      refreshList()
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Impossible de supprimer.')
    }
  }

  if (loadError) {
    return <p className="text-red-600 dark:text-red-400">{loadError}</p>
  }

  if (!cartes) {
    return <p className="text-slate-500 dark:text-slate-400">Chargement...</p>
  }

  // ---- Vue éditeur ----
  if (openCarte) {
    return (
      <div className="flex h-full min-h-[70vh] flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              title="Retour à mes cartes"
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
                Chargement de la carte...
              </div>
            }
          >
            <div className="h-full min-h-[60vh]">
              <CartographieCanvas
                elements={elements}
                center={centre}
                zoom={zoom}
                onChange={(next) => {
                  setElements(next)
                  setIsDirty(true)
                }}
                onViewChange={(nextCentre, nextZoom) => {
                  setCentre(nextCentre)
                  setZoom(nextZoom)
                }}
              />
            </div>
          </Suspense>
        </div>

        <p className="text-center text-[10px] text-slate-400 dark:text-slate-500">
          Placez des repères, tracez des distances ou des zones, puis cliquez sur « Terminer » pour valider un tracé.
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
          <Map size={18} className="text-sky-500" />
          Mes cartes ({cartesCount})
        </h2>
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-sky-700 active:scale-95 disabled:opacity-50"
        >
          {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Nouvelle carte
        </button>
      </div>

      {cartes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-14 text-center dark:border-slate-800">
          <Map size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Aucune carte pour l'instant.</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Créez une carte pour placer des repères, mesurer des distances ou délimiter des zones.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cartes.map((carte) => (
            <div
              key={carte.id}
              className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-500/30"
            >
              <button onClick={() => handleOpen(carte.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <Map size={18} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{carte.nom}</p>
                  <p className="text-xs text-slate-400">
                    Modifiée le {new Date(carte.updated_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </button>
              <button
                onClick={() => handleDelete(carte)}
                className="shrink-0 rounded-lg p-2 text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-500/10"
                title="Supprimer"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {cartes.length > 0 && (
        <Pagination count={cartesCount} page={cartesPage} pageSize={DEFAULT_PAGE_SIZE} onPageChange={setCartesPage} />
      )}
    </div>
  )
}
