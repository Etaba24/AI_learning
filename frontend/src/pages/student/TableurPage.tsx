import { ArrowLeft, FileSpreadsheet, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import Spreadsheet, { createEmptyMatrix, type CellBase, type Matrix } from 'react-spreadsheet'
import { apiFetch, ApiError } from '../../api/client'
import { useConfirm } from '../../components/ConfirmContext'
import { useToast } from '../../components/ToastContext'
import { useTheme } from '../../theme/ThemeContext'

interface ClasseurSummary {
  id: string
  nom: string
  created_at: string
  updated_at: string
}

interface ClasseurDetail extends ClasseurSummary {
  donnees: (({ value: string | number } | null)[])[]
}

interface PaginatedResponse<T> {
  count: number
  results: T[]
}

// react-spreadsheet représente une cellule vide par `undefined`, mais le
// JSON stocké côté serveur ne connaît que `null` — conversion à la lecture
// (l'écriture est gérée par JSON.stringify qui transforme undefined en null).
function toMatrix(donnees: ClasseurDetail['donnees']): Matrix<CellBase> {
  if (!donnees || donnees.length === 0) return createEmptyMatrix(15, 8)
  return donnees.map((row) => row.map((cell) => (cell === null ? undefined : cell)))
}

export function TableurPage() {
  const { theme } = useTheme()
  const confirm = useConfirm()
  const { showToast } = useToast()

  const [classeurs, setClasseurs] = useState<ClasseurSummary[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Classeur ouvert dans l'éditeur (null = vue liste)
  const [openId, setOpenId] = useState<string | null>(null)
  const [nom, setNom] = useState('')
  const [data, setData] = useState<Matrix<CellBase>>([])
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    refreshList()
  }, [])

  function refreshList() {
    apiFetch<PaginatedResponse<ClasseurSummary>>('/classeurs/')
      .then((res) => setClasseurs(res.results))
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }

  async function handleCreate() {
    setIsCreating(true)
    try {
      const created = await apiFetch<ClasseurDetail>('/classeurs/', {
        method: 'POST',
        body: { nom: 'Nouveau classeur', donnees: [] },
      })
      setOpenId(created.id)
      setNom(created.nom)
      setData(toMatrix(created.donnees))
      setIsDirty(false)
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Impossible de créer le classeur.')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleOpen(id: string) {
    try {
      const detail = await apiFetch<ClasseurDetail>(`/classeurs/${id}/`)
      setOpenId(detail.id)
      setNom(detail.nom)
      setData(toMatrix(detail.donnees))
      setIsDirty(false)
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : "Impossible d'ouvrir le classeur.")
    }
  }

  async function handleSave(options?: { silent?: boolean }) {
    if (!openId) return
    setIsSaving(true)
    try {
      await apiFetch<ClasseurDetail>(`/classeurs/${openId}/`, {
        method: 'PATCH',
        body: { nom: nom.trim() || 'Sans titre', donnees: data },
      })
      setIsDirty(false)
      if (!options?.silent) showToast('success', 'Classeur enregistré.')
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : "Impossible d'enregistrer.")
    } finally {
      setIsSaving(false)
    }
  }

  // Sauvegarde automatique : 2,5 s après la dernière modification, pour
  // qu'un brouillon survive à une navigation via la sidebar ou un rechargement.
  useEffect(() => {
    if (!isDirty || !openId || isSaving) return
    const timer = setTimeout(() => handleSave({ silent: true }), 2500)
    return () => clearTimeout(timer)
  }, [isDirty, data, nom, openId])

  async function handleBack() {
    if (isDirty) {
      const leave = await confirm({
        title: 'Modifications non enregistrées',
        message: 'Ce classeur contient des modifications non enregistrées. Quitter sans sauvegarder ?',
        confirmLabel: 'Quitter sans sauvegarder',
        cancelLabel: 'Rester',
        danger: true,
      })
      if (!leave) return
    }
    setOpenId(null)
    refreshList()
  }

  async function handleDelete(classeur: ClasseurSummary) {
    const ok = await confirm({
      title: 'Supprimer ce classeur',
      message: `Le classeur « ${classeur.nom} » sera définitivement supprimé. Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (!ok) return
    try {
      await apiFetch(`/classeurs/${classeur.id}/`, { method: 'DELETE' })
      showToast('success', `Le classeur « ${classeur.nom} » a été supprimé.`)
      refreshList()
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Impossible de supprimer.')
    }
  }

  if (loadError) {
    return <p className="text-red-600 dark:text-red-400">{loadError}</p>
  }

  if (!classeurs) {
    return <p className="text-slate-500 dark:text-slate-400">Chargement...</p>
  }

  // ---- Vue éditeur ----
  if (openId) {
    return (
      <div className="flex h-full flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              title="Retour à mes classeurs"
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

        <p className="text-xs text-slate-400 dark:text-slate-500">
          Astuce : commencez une cellule par <code className="rounded bg-slate-100 px-1 py-0.5 font-mono dark:bg-slate-800">=</code> pour
          écrire une formule, par exemple <code className="rounded bg-slate-100 px-1 py-0.5 font-mono dark:bg-slate-800">=SUM(B2:B6)</code>.
        </p>

        <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Spreadsheet
            data={data}
            darkMode={theme === 'dark'}
            onChange={(next) => {
              setData(next)
              setIsDirty(true)
            }}
          />
        </div>
      </div>
    )
  }

  // ---- Vue liste ----
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
          <FileSpreadsheet size={18} className="text-sky-500" />
          Mes classeurs ({classeurs.length})
        </h2>
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-sky-700 active:scale-95 disabled:opacity-50"
        >
          {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Nouveau classeur
        </button>
      </div>

      {classeurs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-14 text-center dark:border-slate-800">
          <FileSpreadsheet size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Aucun classeur pour l'instant.</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Créez votre premier classeur pour pratiquer les formules et les calculs.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classeurs.map((classeur) => (
            <div
              key={classeur.id}
              className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-500/30"
            >
              <button onClick={() => handleOpen(classeur.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <FileSpreadsheet size={18} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{classeur.nom}</p>
                  <p className="text-xs text-slate-400">
                    Modifié le {new Date(classeur.updated_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </button>
              <button
                onClick={() => handleDelete(classeur)}
                className="rounded-lg p-2 text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-500/10"
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
