import { ArrowLeft, Boxes, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { apiFetch, ApiError } from '../../api/client'
import { useConfirm } from '../../components/ConfirmContext'
import { useToast } from '../../components/ToastContext'
import { useTheme } from '../../theme/ThemeContext'
import type { SceneObject } from './Studio3D'

// three.js pèse lourd : chargé uniquement à l'ouverture d'une scène.
const Studio3D = lazy(() => import('./Studio3D'))

interface SceneSummary {
  id: string
  nom: string
  created_at: string
  updated_at: string
}

interface SceneDetail extends SceneSummary {
  objets: SceneObject[]
}

interface PaginatedResponse<T> {
  count: number
  results: T[]
}

export function Modelisation3DPage() {
  const { theme } = useTheme()
  const confirm = useConfirm()
  const { showToast } = useToast()

  const [scenes, setScenes] = useState<SceneSummary[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [openScene, setOpenScene] = useState<SceneDetail | null>(null)
  const [nom, setNom] = useState('')
  const [objects, setObjects] = useState<SceneObject[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    refreshList()
  }, [])

  function refreshList() {
    apiFetch<PaginatedResponse<SceneSummary>>('/scenes3d/')
      .then((res) => setScenes(res.results))
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }

  function openEditor(detail: SceneDetail) {
    setOpenScene(detail)
    setNom(detail.nom)
    setObjects(detail.objets ?? [])
    setIsDirty(false)
  }

  async function handleCreate() {
    setIsCreating(true)
    try {
      const created = await apiFetch<SceneDetail>('/scenes3d/', {
        method: 'POST',
        body: { nom: 'Nouvelle scène', objets: [] },
      })
      openEditor(created)
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Impossible de créer la scène.')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleOpen(id: string) {
    try {
      const detail = await apiFetch<SceneDetail>(`/scenes3d/${id}/`)
      openEditor(detail)
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : "Impossible d'ouvrir la scène.")
    }
  }

  async function handleSave(options?: { silent?: boolean }) {
    if (!openScene) return
    setIsSaving(true)
    try {
      await apiFetch<SceneDetail>(`/scenes3d/${openScene.id}/`, {
        method: 'PATCH',
        body: { nom: nom.trim() || 'Sans titre', objets: objects },
      })
      setIsDirty(false)
      if (!options?.silent) showToast('success', 'Scène enregistrée.')
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : "Impossible d'enregistrer.")
    } finally {
      setIsSaving(false)
    }
  }

  // Sauvegarde automatique 2,5 s après la dernière modification : un
  // brouillon survit à une navigation via la sidebar ou un rechargement.
  useEffect(() => {
    if (!isDirty || !openScene || isSaving) return
    const timer = setTimeout(() => handleSave({ silent: true }), 2500)
    return () => clearTimeout(timer)
  }, [isDirty, objects, nom, openScene])

  async function handleBack() {
    if (isDirty) {
      const leave = await confirm({
        title: 'Modifications non enregistrées',
        message: 'Cette scène contient des modifications non enregistrées. Quitter sans sauvegarder ?',
        confirmLabel: 'Quitter sans sauvegarder',
        cancelLabel: 'Rester',
        danger: true,
      })
      if (!leave) return
    }
    setOpenScene(null)
    refreshList()
  }

  async function handleDelete(scene: SceneSummary) {
    const ok = await confirm({
      title: 'Supprimer cette scène',
      message: `La scène « ${scene.nom} » sera définitivement supprimée. Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (!ok) return
    try {
      await apiFetch(`/scenes3d/${scene.id}/`, { method: 'DELETE' })
      showToast('success', `La scène « ${scene.nom} » a été supprimée.`)
      refreshList()
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Impossible de supprimer.')
    }
  }

  if (loadError) {
    return <p className="text-red-600 dark:text-red-400">{loadError}</p>
  }

  if (!scenes) {
    return <p className="text-slate-500 dark:text-slate-400">Chargement...</p>
  }

  // ---- Vue éditeur ----
  if (openScene) {
    return (
      <div className="flex h-full min-h-[70vh] flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              title="Retour à mes scènes"
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
                Chargement du studio 3D...
              </div>
            }
          >
            <div className="h-full min-h-[60vh]">
              <Studio3D
                objects={objects}
                isDark={theme === 'dark'}
                onChange={(next) => {
                  setObjects(next)
                  setIsDirty(true)
                }}
              />
            </div>
          </Suspense>
        </div>

        <p className="text-center text-[10px] text-slate-400 dark:text-slate-500">
          Clic gauche + glisser : tourner la caméra · Molette : zoom · Clic droit + glisser : déplacer la vue ·
          Cliquez sur un objet pour le sélectionner et le manipuler avec le gizmo.
        </p>
      </div>
    )
  }

  // ---- Vue liste ----
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
          <Boxes size={18} className="text-sky-500" />
          Mes scènes 3D ({scenes.length})
        </h2>
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-sky-700 active:scale-95 disabled:opacity-50"
        >
          {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Nouvelle scène
        </button>
      </div>

      {scenes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-14 text-center dark:border-slate-800">
          <Boxes size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Aucune scène pour l'instant.</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Créez une scène et assemblez des formes 3D pour visualiser un objet ou un concept.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scenes.map((scene) => (
            <div
              key={scene.id}
              className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-500/30"
            >
              <button onClick={() => handleOpen(scene.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <Boxes size={18} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{scene.nom}</p>
                  <p className="text-xs text-slate-400">
                    Modifiée le {new Date(scene.updated_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </button>
              <button
                onClick={() => handleDelete(scene)}
                className="shrink-0 rounded-lg p-2 text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-500/10"
                title="Supprimer"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
