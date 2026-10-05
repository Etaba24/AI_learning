import { ArrowLeft, Loader2, PenTool, Plus, Save, Trash2 } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { apiFetch, ApiError } from '../../api/client'
import { DEFAULT_PAGE_SIZE } from '../../api/types'
import { BackToToolsLink } from '../../components/BackToToolsLink'
import { useConfirm } from '../../components/ConfirmContext'
import { Pagination } from '../../components/Pagination'
import { useToast } from '../../components/ToastContext'
import { useTheme } from '../../theme/ThemeContext'
import '@excalidraw/excalidraw/index.css'

// Excalidraw pèse lourd : chargé uniquement à l'ouverture d'un tableau,
// pas au démarrage de l'application.
const Excalidraw = lazy(() =>
  import('@excalidraw/excalidraw').then((module) => ({ default: module.Excalidraw })),
)

interface TableauSummary {
  id: string
  nom: string
  created_at: string
  updated_at: string
}

interface TableauDetail extends TableauSummary {
  scene: readonly object[]
}

interface PaginatedResponse<T> {
  count: number
  results: T[]
}

export function TableauBlancPage() {
  const { theme } = useTheme()
  const confirm = useConfirm()
  const { showToast } = useToast()

  const [tableaux, setTableaux] = useState<TableauSummary[] | null>(null)
  const [tableauxCount, setTableauxCount] = useState(0)
  const [tableauxPage, setTableauxPage] = useState(1)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [openTableau, setOpenTableau] = useState<TableauDetail | null>(null)
  const [nom, setNom] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Derniers éléments dessinés, mis à jour à chaque coup de crayon —
  // dans une ref pour ne pas re-rendre Excalidraw à chaque trait.
  const elementsRef = useRef<readonly object[]>([])
  const isReadyRef = useRef(false)

  useEffect(refreshList, [tableauxPage])

  function refreshList() {
    apiFetch<PaginatedResponse<TableauSummary>>(`/tableaux/?page=${tableauxPage}`)
      .then((res) => {
        setTableaux(res.results)
        setTableauxCount(res.count)
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }

  function openEditor(detail: TableauDetail) {
    elementsRef.current = detail.scene ?? []
    isReadyRef.current = false
    setOpenTableau(detail)
    setNom(detail.nom)
    setIsDirty(false)
  }

  async function handleCreate() {
    setIsCreating(true)
    try {
      const created = await apiFetch<TableauDetail>('/tableaux/', {
        method: 'POST',
        body: { nom: 'Nouveau tableau', scene: [] },
      })
      openEditor(created)
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Impossible de créer le tableau.')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleOpen(id: string) {
    try {
      const detail = await apiFetch<TableauDetail>(`/tableaux/${id}/`)
      openEditor(detail)
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : "Impossible d'ouvrir le tableau.")
    }
  }

  async function handleSave(options?: { silent?: boolean }) {
    if (!openTableau) return
    setIsSaving(true)
    try {
      // Les éléments supprimés restent dans la scène avec isDeleted:true —
      // on ne persiste que les vivants.
      const elements = elementsRef.current.filter(
        (element) => !(element as { isDeleted?: boolean }).isDeleted,
      )
      await apiFetch<TableauDetail>(`/tableaux/${openTableau.id}/`, {
        method: 'PATCH',
        body: { nom: nom.trim() || 'Sans titre', scene: elements },
      })
      setIsDirty(false)
      if (!options?.silent) showToast('success', 'Tableau enregistré.')
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : "Impossible d'enregistrer.")
    } finally {
      setIsSaving(false)
    }
  }

  // Sauvegarde automatique 2,5 s après la dernière modification : un
  // brouillon survit à une navigation via la sidebar ou un rechargement.
  useEffect(() => {
    if (!isDirty || !openTableau || isSaving) return
    const timer = setTimeout(() => handleSave({ silent: true }), 2500)
    return () => clearTimeout(timer)
  }, [isDirty, nom, openTableau])

  async function handleBack() {
    if (isDirty) {
      const leave = await confirm({
        title: 'Modifications non enregistrées',
        message: 'Ce tableau contient des modifications non enregistrées. Quitter sans sauvegarder ?',
        confirmLabel: 'Quitter sans sauvegarder',
        cancelLabel: 'Rester',
        danger: true,
      })
      if (!leave) return
    }
    setOpenTableau(null)
    refreshList()
  }

  async function handleDelete(tableau: TableauSummary) {
    const ok = await confirm({
      title: 'Supprimer ce tableau',
      message: `Le tableau « ${tableau.nom} » sera définitivement supprimé. Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (!ok) return
    try {
      await apiFetch(`/tableaux/${tableau.id}/`, { method: 'DELETE' })
      showToast('success', `Le tableau « ${tableau.nom} » a été supprimé.`)
      refreshList()
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Impossible de supprimer.')
    }
  }

  if (loadError) {
    return <p className="text-red-600 dark:text-red-400">{loadError}</p>
  }

  if (!tableaux) {
    return <p className="text-slate-500 dark:text-slate-400">Chargement...</p>
  }

  // ---- Vue éditeur ----
  if (openTableau) {
    return (
      <div className="flex h-full min-h-[70vh] flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              title="Retour à mes tableaux"
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

        <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-800">
          <Suspense
            fallback={
              <div className="flex h-full min-h-[60vh] items-center justify-center text-sm text-slate-400">
                <Loader2 size={18} className="mr-2 animate-spin" />
                Chargement du tableau blanc...
              </div>
            }
          >
            <div className="h-full min-h-[60vh]">
              <Excalidraw
                initialData={{ elements: openTableau.scene as never }}
                theme={theme === 'dark' ? 'dark' : 'light'}
                langCode="fr-FR"
                onChange={(elements) => {
                  elementsRef.current = elements
                  // Le premier onChange correspond au chargement initial de
                  // la scène, pas à une modification de l'utilisateur.
                  if (!isReadyRef.current) {
                    isReadyRef.current = true
                    return
                  }
                  setIsDirty(true)
                }}
              />
            </div>
          </Suspense>
        </div>
      </div>
    )
  }

  // ---- Vue liste ----
  return (
    <div className="space-y-6">
      <BackToToolsLink />

      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
          <PenTool size={18} className="text-sky-500" />
          Mes tableaux ({tableauxCount})
        </h2>
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-sky-700 active:scale-95 disabled:opacity-50"
        >
          {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Nouveau tableau
        </button>
      </div>

      {tableaux.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-14 text-center dark:border-slate-800">
          <PenTool size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Aucun tableau pour l'instant.</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Créez un tableau pour dessiner un schéma, une mind-map ou illustrer une notion.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tableaux.map((tableau) => (
            <div
              key={tableau.id}
              className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-500/30"
            >
              <button onClick={() => handleOpen(tableau.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                  <PenTool size={18} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{tableau.nom}</p>
                  <p className="text-xs text-slate-400">
                    Modifié le {new Date(tableau.updated_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </button>
              <button
                onClick={() => handleDelete(tableau)}
                className="shrink-0 rounded-lg p-2 text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-500/10"
                title="Supprimer"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {tableaux.length > 0 && (
        <Pagination count={tableauxCount} page={tableauxPage} pageSize={DEFAULT_PAGE_SIZE} onPageChange={setTableauxPage} />
      )}
    </div>
  )
}
