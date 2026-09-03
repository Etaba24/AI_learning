import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { apiFetch, ApiError } from '../../api/client'
import type { Departement, PaginatedResponse } from '../../api/types'
import { Alert } from '../../components/Alert'
import { useConfirm } from '../../components/ConfirmContext'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/ToastContext'

interface FormState {
  id: string | null
  nom: string
  description: string
}

const EMPTY_FORM: FormState = { id: null, nom: '', description: '' }

export function DepartementsPage() {
  const { showToast } = useToast()
  const confirm = useConfirm()

  const [departements, setDepartements] = useState<Departement[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function loadDepartements() {
    apiFetch<PaginatedResponse<Departement>>('/departements/')
      .then((data) => setDepartements(data.results))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }

  useEffect(loadDepartements, [])

  function openCreateModal() {
    setForm(EMPTY_FORM)
    setFormError(null)
    setIsModalOpen(true)
  }

  function openEditModal(departement: Departement) {
    setForm({ id: departement.id, nom: departement.nom, description: departement.description })
    setFormError(null)
    setIsModalOpen(true)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    setIsSubmitting(true)
    try {
      if (form.id) {
        await apiFetch(`/departements/${form.id}/`, {
          method: 'PATCH',
          body: { nom: form.nom, description: form.description },
        })
        showToast('success', 'Département modifié avec succès.')
      } else {
        await apiFetch('/departements/', {
          method: 'POST',
          body: { nom: form.nom, description: form.description },
        })
        showToast('success', 'Département créé avec succès.')
      }
      setIsModalOpen(false)
      loadDepartements()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Une erreur est survenue.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(departement: Departement) {
    const ok = await confirm({
      title: 'Supprimer ce département ?',
      message: `"${departement.nom}" sera définitivement supprimé. Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (!ok) return

    try {
      await apiFetch(`/departements/${departement.id}/`, { method: 'DELETE' })
      showToast('success', 'Département supprimé avec succès.')
      loadDepartements()
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Impossible de supprimer ce département.')
    }
  }

  if (error) {
    return <Alert variant="error" message={error} />
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Départements {departements ? `(${departements.length})` : ''}
        </h1>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
        >
          <Plus size={16} />
          Nouveau département
        </button>
      </div>

      {!departements ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          <p className="mt-3 text-xs font-medium">Chargement des départements...</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-md shadow-slate-500/5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="border-b border-slate-200/80 bg-slate-100/70 text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="py-4 px-6">Département</th>
                  <th className="py-4 px-6">Description</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {departements.map((departement) => (
                  <tr
                    key={departement.id}
                    className="group transition-colors duration-150 hover:bg-sky-50/50 dark:hover:bg-sky-950/20"
                  >
                    <td className="py-4 px-6 font-bold text-slate-900 group-hover:text-sky-600 dark:text-slate-100 dark:group-hover:text-sky-400">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-xs font-extrabold text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                          {departement.nom.charAt(0).toUpperCase()}
                        </span>
                        <span>{departement.nom}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-500 dark:text-slate-400">
                      {departement.description || <span className="text-slate-400 italic">Aucune description</span>}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(departement)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-sky-500/20 dark:hover:text-sky-400"
                          title="Modifier le département"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(departement)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-500/20 dark:hover:text-rose-400"
                          title="Supprimer le département"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {departements.length === 0 && (
            <div className="p-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
              Aucun département pour l'instant. Cliquez sur "Nouveau département" pour en créer un.
            </div>
          )}
        </div>
      )}

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={form.id ? 'Modifier le département' : 'Nouveau département'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <Alert variant="error" message={formError} onClose={() => setFormError(null)} />
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
              Nom
            </label>
            <input
              required
              value={form.nom}
              onChange={(event) => setForm((f) => ({ ...f, nom: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
              Description
            </label>
            <input
              value={form.description}
              onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Enregistrement...' : form.id ? 'Enregistrer' : 'Créer'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
