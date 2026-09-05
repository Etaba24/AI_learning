import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { apiFetch, ApiError } from '../../api/client'
import { DEFAULT_PAGE_SIZE, type Category, type PaginatedResponse } from '../../api/types'
import { Alert } from '../../components/Alert'
import { useConfirm } from '../../components/ConfirmContext'
import { Modal } from '../../components/Modal'
import { Pagination } from '../../components/Pagination'
import { useToast } from '../../components/ToastContext'
import { useRealtimeTopics } from '../../hooks/useRealtimeTopics'

interface FormState {
  id: string | null
  nom: string
  description: string
}

const EMPTY_FORM: FormState = { id: null, nom: '', description: '' }

export function CategoriesPage() {
  const { showToast } = useToast()
  const confirm = useConfirm()

  const [categories, setCategories] = useState<Category[] | null>(null)
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function loadCategories() {
    apiFetch<PaginatedResponse<Category>>(`/categories/?page=${page}`)
      .then((data) => {
        setCategories(data.results)
        setCount(data.count)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }

  useEffect(loadCategories, [page])
  useRealtimeTopics(['admin_categories'], loadCategories)

  function openCreateModal() {
    setForm(EMPTY_FORM)
    setFormError(null)
    setIsModalOpen(true)
  }

  function openEditModal(category: Category) {
    setForm({ id: category.id, nom: category.nom, description: category.description })
    setFormError(null)
    setIsModalOpen(true)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    setIsSubmitting(true)
    try {
      if (form.id) {
        await apiFetch(`/categories/${form.id}/`, {
          method: 'PATCH',
          body: { nom: form.nom, description: form.description },
        })
        showToast('success', 'Catégorie modifiée avec succès.')
      } else {
        await apiFetch('/categories/', {
          method: 'POST',
          body: { nom: form.nom, description: form.description },
        })
        showToast('success', 'Catégorie créée avec succès.')
      }
      setIsModalOpen(false)
      loadCategories()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Une erreur est survenue.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(category: Category) {
    const ok = await confirm({
      title: 'Supprimer cette catégorie ?',
      message: `"${category.nom}" sera définitivement supprimée. Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (!ok) return

    try {
      await apiFetch(`/categories/${category.id}/`, { method: 'DELETE' })
      showToast('success', 'Catégorie supprimée avec succès.')
      loadCategories()
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Impossible de supprimer la catégorie.')
    }
  }

  if (error) {
    return <Alert variant="error" message={error} />
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Catégories {categories ? `(${count})` : ''}
        </h1>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
        >
          <Plus size={16} />
          Nouvelle catégorie
        </button>
      </div>

      {!categories ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          <p className="mt-3 text-xs font-medium">Chargement des catégories...</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-md shadow-slate-500/5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="border-b border-slate-200/80 bg-slate-100/70 text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="py-4 px-6">Nom de la catégorie</th>
                  <th className="py-4 px-6">Description</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {categories.map((category) => (
                  <tr
                    key={category.id}
                    className="group transition-colors duration-150 hover:bg-sky-50/50 dark:hover:bg-sky-950/20"
                  >
                    <td className="py-4 px-6 font-bold text-slate-900 group-hover:text-sky-600 dark:text-slate-100 dark:group-hover:text-sky-400">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-xs font-extrabold text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                          {category.nom.charAt(0).toUpperCase()}
                        </span>
                        <span>{category.nom}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-500 dark:text-slate-400">
                      {category.description || <span className="text-slate-400 italic">Aucune description</span>}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(category)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-sky-500/20 dark:hover:text-sky-400"
                          title="Modifier la catégorie"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(category)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-500/20 dark:hover:text-rose-400"
                          title="Supprimer la catégorie"
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

          {categories.length === 0 && (
            <div className="p-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
              Aucune catégorie pour l'instant. Cliquez sur "Nouvelle catégorie" pour en créer une.
            </div>
          )}
          <div className="px-6 py-4">
            <Pagination count={count} page={page} pageSize={DEFAULT_PAGE_SIZE} onPageChange={setPage} />
          </div>
        </div>
      )}

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title={form.id ? 'Modifier la catégorie' : 'Nouvelle catégorie'}>
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
