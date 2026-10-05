import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { apiFetch, ApiError } from '../../api/client'
import {
  ANNONCE_CATEGORIE_LABELS,
  DEFAULT_PAGE_SIZE,
  type Annonce,
  type AnnonceCategorie,
  type PaginatedResponse,
} from '../../api/types'
import { Alert } from '../../components/Alert'
import { useConfirm } from '../../components/ConfirmContext'
import { Modal } from '../../components/Modal'
import { Pagination } from '../../components/Pagination'
import { useToast } from '../../components/ToastContext'
import { useRealtimeTopics } from '../../hooks/useRealtimeTopics'

interface FormState {
  id: string | null
  titre: string
  categorie: AnnonceCategorie
  contenu: string
  auteur_label: string
  important: boolean
}

const EMPTY_FORM: FormState = {
  id: null,
  titre: '',
  categorie: 'ANNONCE_PLATEFORME',
  contenu: '',
  auteur_label: 'Équipe Pédagogique',
  important: false,
}

const TOUTES_LES_CATEGORIES = Object.keys(ANNONCE_CATEGORIE_LABELS) as AnnonceCategorie[]

/** CRUD des annonces affichées sur la page « Actualités » de l'espace
 * apprenant (section « Annonces de la communauté »). Les « Nouveautés du
 * catalogue » de cette même page, elles, ne se gèrent pas ici — elles
 * viennent automatiquement des formations publiées. */
export function AnnoncesPage() {
  const { showToast } = useToast()
  const confirm = useConfirm()

  const [annonces, setAnnonces] = useState<Annonce[] | null>(null)
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function loadAnnonces() {
    apiFetch<PaginatedResponse<Annonce>>(`/annonces/?page=${page}`)
      .then((data) => {
        setAnnonces(data.results)
        setCount(data.count)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }

  useEffect(loadAnnonces, [page])
  useRealtimeTopics(['admin_annonces'], loadAnnonces)

  function openCreateModal() {
    setForm(EMPTY_FORM)
    setFormError(null)
    setIsModalOpen(true)
  }

  function openEditModal(annonce: Annonce) {
    setForm({
      id: annonce.id,
      titre: annonce.titre,
      categorie: annonce.categorie,
      contenu: annonce.contenu,
      auteur_label: annonce.auteur_label,
      important: annonce.important,
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    setIsSubmitting(true)
    try {
      const body = {
        titre: form.titre,
        categorie: form.categorie,
        contenu: form.contenu,
        auteur_label: form.auteur_label,
        important: form.important,
      }
      if (form.id) {
        await apiFetch(`/annonces/${form.id}/`, { method: 'PATCH', body })
        showToast('success', 'Annonce modifiée avec succès.')
      } else {
        await apiFetch('/annonces/', { method: 'POST', body })
        showToast('success', 'Annonce créée avec succès.')
      }
      setIsModalOpen(false)
      loadAnnonces()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Une erreur est survenue.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(annonce: Annonce) {
    const ok = await confirm({
      title: 'Supprimer cette annonce ?',
      message: `"${annonce.titre}" sera définitivement supprimée. Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (!ok) return

    try {
      await apiFetch(`/annonces/${annonce.id}/`, { method: 'DELETE' })
      showToast('success', 'Annonce supprimée avec succès.')
      loadAnnonces()
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : "Impossible de supprimer l'annonce.")
    }
  }

  if (error) {
    return <Alert variant="error" message={error} />
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Annonces {annonces ? `(${count})` : ''}
        </h1>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
        >
          <Plus size={16} />
          Nouvelle annonce
        </button>
      </div>

      {!annonces ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          <p className="mt-3 text-xs font-medium">Chargement des annonces...</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-md shadow-slate-500/5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="border-b border-slate-200/80 bg-slate-100/70 text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="py-4 px-6">Titre</th>
                  <th className="py-4 px-6">Catégorie</th>
                  <th className="py-4 px-6">Publié par</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {annonces.map((annonce) => (
                  <tr
                    key={annonce.id}
                    className="group transition-colors duration-150 hover:bg-sky-50/50 dark:hover:bg-sky-950/20"
                  >
                    <td className="py-4 px-6 font-bold text-slate-900 group-hover:text-sky-600 dark:text-slate-100 dark:group-hover:text-sky-400">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-xs">{annonce.titre}</span>
                        {annonce.important && (
                          <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                            Important
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-500 dark:text-slate-400">
                      {annonce.categorie_display}
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-500 dark:text-slate-400">{annonce.auteur_label}</td>
                    <td className="py-4 px-6 font-medium text-slate-500 dark:text-slate-400">
                      {new Date(annonce.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(annonce)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-sky-500/20 dark:hover:text-sky-400"
                          title="Modifier l'annonce"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(annonce)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-500/20 dark:hover:text-rose-400"
                          title="Supprimer l'annonce"
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

          {annonces.length === 0 && (
            <div className="p-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
              Aucune annonce pour l'instant. Cliquez sur "Nouvelle annonce" pour en créer une.
            </div>
          )}
          <div className="px-6 py-4">
            <Pagination count={count} page={page} pageSize={DEFAULT_PAGE_SIZE} onPageChange={setPage} />
          </div>
        </div>
      )}

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title={form.id ? "Modifier l'annonce" : 'Nouvelle annonce'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <Alert variant="error" message={formError} onClose={() => setFormError(null)} />}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
              Titre
            </label>
            <input
              required
              value={form.titre}
              onChange={(event) => setForm((f) => ({ ...f, titre: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
                Catégorie
              </label>
              <select
                value={form.categorie}
                onChange={(event) => setForm((f) => ({ ...f, categorie: event.target.value as AnnonceCategorie }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {TOUTES_LES_CATEGORIES.map((code) => (
                  <option key={code} value={code}>
                    {ANNONCE_CATEGORIE_LABELS[code]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
                Publié par
              </label>
              <input
                required
                value={form.auteur_label}
                onChange={(event) => setForm((f) => ({ ...f, auteur_label: event.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
              Contenu
            </label>
            <textarea
              required
              rows={4}
              value={form.contenu}
              onChange={(event) => setForm((f) => ({ ...f, contenu: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={form.important}
              onChange={(event) => setForm((f) => ({ ...f, important: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            Marquer comme importante (badge mis en avant)
          </label>

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
