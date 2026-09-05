import {
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Filter,
  Library,
  Plus,
  Search,
  Send,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react'
import { apiFetch, ApiError } from '../../api/client'
import {
  DOCUMENT_STATUT_BADGE_STYLES,
  DOCUMENT_STATUT_LABELS,
  type Category,
  type LibraryDocument,
  type PaginatedResponse,
} from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { Alert } from '../../components/Alert'
import { useConfirm } from '../../components/ConfirmContext'
import { Modal } from '../../components/Modal'
import { Pagination } from '../../components/Pagination'
import { useToast } from '../../components/ToastContext'

// pdf.js pèse lourd : chargé uniquement quand une carte doit réellement
// afficher un aperçu PDF, pas au démarrage de l'application.
const PdfThumbnail = lazy(() =>
  import('../../components/PdfThumbnail').then((module) => ({ default: module.PdfThumbnail })),
)
import { useRealtimeTopics } from '../../hooks/useRealtimeTopics'

const PAGE_SIZE = 7

function formatTaille(octets: number) {
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`
}

export function LibraryPage() {
  const { user } = useAuth()
  const confirm = useConfirm()
  const { showToast } = useToast()
  const canUpload = user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR'

  // ---- Bibliothèque publiée (consultable par tous) ----
  const [documents, setDocuments] = useState<LibraryDocument[] | null>(null)
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [categorieFilter, setCategorieFilter] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])

  function loadDocuments() {
    const params = new URLSearchParams()
    if (search.trim()) params.set('q', search.trim())
    if (categorieFilter) params.set('categorie', categorieFilter)
    params.set('page', String(page))
    apiFetch<PaginatedResponse<LibraryDocument>>(`/bibliotheque/documents/?${params.toString()}`)
      .then((data) => {
        setDocuments(data.results)
        setCount(data.count)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }

  useEffect(() => {
    const timeout = setTimeout(loadDocuments, 250)
    return () => clearTimeout(timeout)
  }, [search, categorieFilter, page])
  useEffect(() => setPage(1), [search, categorieFilter])
  useRealtimeTopics(['bibliotheque'], loadDocuments)

  useEffect(() => {
    apiFetch<PaginatedResponse<Category>>('/categories/')
      .then((data) => setCategories(data.results))
      .catch(() => setCategories([]))
  }, [])

  // ---- Mes dépôts (formateur/admin uniquement) ----
  const [mesDocuments, setMesDocuments] = useState<LibraryDocument[] | null>(null)

  function loadMesDocuments() {
    if (!canUpload) return
    apiFetch<PaginatedResponse<LibraryDocument>>('/documents/')
      .then((data) => setMesDocuments(data.results))
      .catch(() => setMesDocuments([]))
  }

  useEffect(loadMesDocuments, [canUpload])
  useRealtimeTopics(canUpload ? ['instructor_documents'] : [], loadMesDocuments)

  // ---- Dépôt d'un nouveau document ----
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [newTitre, setNewTitre] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newCategorie, setNewCategorie] = useState('')
  const [newFormat, setNewFormat] = useState<'PDF' | 'EPUB'>('PDF')
  const [newFile, setNewFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  // Le titre se pré-remplit avec le nom du fichier choisi, mais ne doit
  // plus être écrasé une fois que l'utilisateur y a touché lui-même.
  const [titreTouche, setTitreTouche] = useState(false)

  function openUploadModal() {
    setNewTitre('')
    setNewDescription('')
    setNewCategorie(categories[0]?.id ?? '')
    setNewFormat('PDF')
    setNewFile(null)
    setTitreTouche(false)
    setUploadError(null)
    setIsUploadOpen(true)
  }

  function handleFileChange(file: File | null) {
    setNewFile(file)
    if (file && !titreTouche) {
      const sansExtension = file.name.replace(/\.[^./]+$/, '')
      setNewTitre(sansExtension.replace(/[_-]+/g, ' ').trim())
    }
  }

  async function handleUpload(event: FormEvent) {
    event.preventDefault()
    if (!newFile || !newCategorie || !newTitre.trim()) return
    setIsUploading(true)
    setUploadError(null)
    try {
      const formData = new FormData()
      formData.append('titre', newTitre.trim())
      formData.append('description', newDescription.trim())
      formData.append('categorie', newCategorie)
      formData.append('format', newFormat)
      formData.append('fichier', newFile)
      await apiFetch('/documents/', { method: 'POST', body: formData })
      showToast('success', "Document déposé. Pensez à le soumettre pour qu'un administrateur le valide.")
      setIsUploadOpen(false)
      loadMesDocuments()
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Impossible de déposer ce document.')
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSubmitForReview(document: LibraryDocument) {
    try {
      await apiFetch(`/documents/${document.id}/submit/`, { method: 'POST' })
      showToast('success', "Document soumis pour validation à l'administrateur.")
      loadMesDocuments()
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Impossible de soumettre ce document.')
    }
  }

  async function handleUnpublish(document: LibraryDocument) {
    try {
      await apiFetch(`/documents/${document.id}/unpublish/`, { method: 'POST' })
      showToast('success', 'Document dépublié.')
      loadMesDocuments()
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Impossible de dépublier ce document.')
    }
  }

  async function handleDeleteDocument(document: LibraryDocument) {
    const ok = await confirm({
      title: 'Supprimer ce document ?',
      message: `"${document.titre}" sera définitivement supprimé. Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (!ok) return
    try {
      await apiFetch(`/documents/${document.id}/`, { method: 'DELETE' })
      showToast('success', 'Document supprimé.')
      loadMesDocuments()
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Impossible de supprimer ce document.')
    }
  }

  return (
    <div className="space-y-8">
      {/* BANNIÈRE */}
      <div className="relative overflow-hidden rounded-3xl border border-sky-200/50 bg-gradient-to-br from-indigo-900 via-sky-800 to-slate-900 p-6 text-white shadow-xl shadow-sky-500/10 sm:p-8 dark:border-sky-500/20">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-sky-400/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-sky-100 backdrop-blur-md">
              <Library size={14} className="text-amber-300" />
              <span>Bibliothèque & Supports</span>
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Documents PDF/EPUB de la plateforme
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-sky-100/90 sm:text-sm">
              Consultez les supports validés et publiés par l'administration.
            </p>
          </div>
          {canUpload && (
            <button
              onClick={openUploadModal}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-extrabold text-slate-900 shadow-lg transition-all hover:bg-sky-50 active:scale-95"
            >
              <UploadCloud size={16} />
              Déposer un document
            </button>
          )}
        </div>
      </div>

      {/* RECHERCHE ET FILTRE CATÉGORIE */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un document..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder-slate-400 shadow-sm focus:border-sky-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="relative">
          <Filter size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={categorieFilter}
            onChange={(event) => setCategorieFilter(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-xs font-medium text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">Toutes les catégories</option>
            {categories.map((categorie) => (
              <option key={categorie.id} value={categorie.id}>
                {categorie.nom}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <Alert variant="error" message={error} />}

      {!error && !documents && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          <p className="mt-3 text-xs font-medium">Chargement de la bibliothèque...</p>
        </div>
      )}

      {documents && documents.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-14 text-center dark:border-slate-800">
          <FileText size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Aucun document publié pour le moment.</p>
        </div>
      )}

      {documents && documents.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((document) => (
              <div
                key={document.id}
                className="flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-md shadow-slate-500/5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-sky-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-sky-500/30"
              >
                {/* APERÇU RÉEL DU DOCUMENT (première page) */}
                <div className="relative h-40 shrink-0 overflow-hidden border-b border-slate-100 bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60">
                  {document.format === 'PDF' ? (
                    <Suspense
                      fallback={
                        <div className="flex h-full items-center justify-center">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                        </div>
                      }
                    >
                      <PdfThumbnail url={document.fichier} />
                    </Suspense>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-1.5 text-slate-300 dark:text-slate-600">
                      <BookOpen size={28} />
                      <span className="text-[10px] font-bold uppercase tracking-wide">Aperçu indisponible</span>
                    </div>
                  )}
                  <span className="absolute right-2 top-2 rounded-lg bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {document.format}
                  </span>
                </div>

                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <span className="inline-flex items-center rounded-xl bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                      {document.categorie_nom}
                    </span>
                    <h3 className="mt-3 text-sm font-extrabold text-slate-900 dark:text-slate-100">{document.titre}</h3>
                    <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      {document.description || 'Aucune description fournie.'}
                    </p>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400">
                      {document.auteur_nom} · {formatTaille(document.taille_octets)}
                    </span>
                    <a
                      href={document.fichier}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-600 dark:bg-slate-800 dark:hover:bg-sky-600"
                    >
                      <Download size={13} />
                      Ouvrir
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination count={count} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}

      {/* MES DÉPÔTS — FORMATEUR / ADMIN */}
      {canUpload && (
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
            <BookOpen size={18} className="text-indigo-500" />
            Mes dépôts
          </h2>

          {!mesDocuments ? (
            <p className="text-sm text-slate-400">Chargement...</p>
          ) : mesDocuments.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-10 text-center dark:border-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Vous n'avez encore rien déposé dans la bibliothèque.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-slate-200/80 bg-white/90 shadow-md shadow-slate-500/5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
              <table className="w-full min-w-[600px] text-left text-xs">
                <thead className="border-b border-slate-200/80 bg-slate-100/70 text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                  <tr>
                    <th className="py-3 px-5">Document</th>
                    <th className="py-3 px-5">Statut</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {mesDocuments.map((document) => (
                    <tr key={document.id}>
                      <td className="py-3 px-5">
                        <p className="font-bold text-slate-900 dark:text-slate-100">{document.titre}</p>
                        <p className="text-[11px] text-slate-400">
                          {document.categorie_nom} · {document.format}
                        </p>
                        {document.statut === 'REFUSE' && document.motif_refus && (
                          <p className="mt-1 text-[11px] text-red-500 dark:text-red-400">{document.motif_refus}</p>
                        )}
                      </td>
                      <td className="py-3 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${DOCUMENT_STATUT_BADGE_STYLES[document.statut]}`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {DOCUMENT_STATUT_LABELS[document.statut]}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex items-center justify-end gap-1.5">
                          {document.statut === 'BROUILLON' && (
                            <button
                              onClick={() => handleSubmitForReview(document)}
                              className="flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-sky-700"
                            >
                              <Send size={12} />
                              Soumettre
                            </button>
                          )}
                          {document.statut === 'SOUMIS' && (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                              <Clock size={12} />
                              En attente
                            </span>
                          )}
                          {document.statut === 'PUBLIE' && (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 size={12} />
                              En ligne
                            </span>
                          )}
                          {document.statut === 'PUBLIE' && (
                            <button
                              onClick={() => handleUnpublish(document)}
                              className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-300"
                            >
                              Dépublier
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteDocument(document)}
                            className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-500/10"
                            title="Supprimer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODALE DE DÉPÔT */}
      <Modal open={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Déposer un document">
        <form onSubmit={handleUpload} className="space-y-4">
          {uploadError && <Alert variant="error" message={uploadError} />}

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Fichier</label>
            <input
              required
              type="file"
              accept=".pdf,.epub"
              onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-900 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:bg-sky-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Titre</label>
            <input
              required
              value={newTitre}
              onChange={(event) => {
                setTitreTouche(true)
                setNewTitre(event.target.value)
              }}
              placeholder="Repris automatiquement du nom du fichier"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Description</label>
            <textarea
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Catégorie</label>
              {categories.length === 0 ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">Aucune catégorie disponible.</p>
              ) : (
                <select
                  required
                  value={newCategorie}
                  onChange={(event) => setNewCategorie(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {categories.map((categorie) => (
                    <option key={categorie.id} value={categorie.id}>
                      {categorie.nom}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Format</label>
              <select
                value={newFormat}
                onChange={(event) => setNewFormat(event.target.value as 'PDF' | 'EPUB')}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="PDF">PDF</option>
                <option value="EPUB">EPUB</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsUploadOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isUploading || !newFile || !newCategorie || !newTitre.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50"
            >
              <Plus size={15} />
              {isUploading ? 'Envoi...' : 'Déposer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
