import { CheckCircle, Clock, Eye, FileText, Search, ShieldCheck, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch, ApiError } from '../../api/client'
import {
  DEFAULT_PAGE_SIZE,
  DOCUMENT_STATUT_BADGE_STYLES,
  DOCUMENT_STATUT_LABELS,
  type DocumentStatut,
  type LibraryDocument,
  type PaginatedResponse,
} from '../../api/types'
import { Alert } from '../../components/Alert'
import { Pagination } from '../../components/Pagination'
import { useToast } from '../../components/ToastContext'
import { useRealtimeTopics } from '../../hooks/useRealtimeTopics'

const FILTERS: Array<{ label: string; value: DocumentStatut | 'ALL' }> = [
  { label: 'Tous les documents', value: 'ALL' },
  { label: 'En attente de validation (Soumis)', value: 'SOUMIS' },
  { label: 'Validés', value: 'VALIDE' },
  { label: 'Publiés', value: 'PUBLIE' },
  { label: 'Refusés', value: 'REFUSE' },
  { label: 'Brouillons', value: 'BROUILLON' },
]

export function DocumentsPage() {
  const { showToast } = useToast()

  const [documents, setDocuments] = useState<LibraryDocument[] | null>(null)
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pendingCount, setPendingCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<DocumentStatut | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [refusingId, setRefusingId] = useState<string | null>(null)
  const [motif, setMotif] = useState('')

  function loadDocuments() {
    const params = new URLSearchParams()
    if (filter !== 'ALL') params.set('statut', filter)
    if (searchQuery.trim()) params.set('q', searchQuery.trim())
    params.set('page', String(page))
    apiFetch<PaginatedResponse<LibraryDocument>>(`/documents/?${params.toString()}`)
      .then((data) => {
        setDocuments(data.results)
        setCount(data.count)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur inattendue lors du chargement.'))
  }

  function loadPendingCount() {
    apiFetch<PaginatedResponse<LibraryDocument>>('/documents/?statut=SOUMIS')
      .then((data) => setPendingCount(data.count))
      .catch(() => {})
  }

  useEffect(() => {
    const timeout = setTimeout(loadDocuments, 250)
    return () => clearTimeout(timeout)
  }, [filter, searchQuery, page])
  useEffect(() => setPage(1), [filter, searchQuery])
  useEffect(loadPendingCount, [])
  useRealtimeTopics(['admin_documents'], () => {
    loadDocuments()
    loadPendingCount()
  })

  async function runAction(id: string, action: string, body?: unknown) {
    setActionError(null)
    try {
      await apiFetch(`/documents/${id}/${action}/`, { method: 'POST', body })
      showToast('success', 'Le statut du document a été mis à jour avec succès.', 'Modération enregistrée')
      loadDocuments()
      loadPendingCount()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Impossible d'effectuer cette action."
      setActionError(msg)
      showToast('error', msg)
    }
  }

  async function handleValidateAndPublish(document: LibraryDocument) {
    try {
      await apiFetch(`/documents/${document.id}/validate/`, { method: 'POST' })
      await apiFetch(`/documents/${document.id}/publish/`, { method: 'POST' })
      showToast('success', `Le document "${document.titre}" a été validé et publié !`, 'Publication confirmée')
      loadDocuments()
      loadPendingCount()
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Erreur lors de la validation.', 'Erreur')
    }
  }

  async function confirmRefuse(id: string) {
    if (!motif.trim()) {
      showToast('error', 'Un motif de refus explicite est requis pour guider le formateur.', 'Motif requis')
      return
    }
    await runAction(id, 'refuse', { motif })
    setRefusingId(null)
    setMotif('')
  }

  if (error) {
    return <Alert variant="error" message={error} />
  }

  return (
    <div className="space-y-6">
      {/* BANNIÈRE DE MODÉRATION DE LA BIBLIOTHÈQUE */}
      <div className="relative overflow-hidden rounded-3xl border border-sky-200/50 bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 p-6 text-white shadow-xl shadow-sky-500/10 sm:p-8 dark:border-sky-500/20">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-sky-100 backdrop-blur-md">
            <ShieldCheck size={14} className="text-emerald-300" />
            <span>Modération de la bibliothèque</span>
          </div>

          <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Validation des supports PDF/EPUB
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-sky-100/90 sm:text-sm">
            Examinez les documents déposés par les formateurs. Validez et publiez les supports conformes ou motivez
            le refus — les apprenants ne voient jamais un document tant qu'il n'est pas publié.
          </p>
        </div>
      </div>

      {/* RAPPEL SUR LES DOCUMENTS EN ATTENTE DE VALIDATION */}
      {pendingCount > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-3xl border border-amber-300 bg-amber-50 p-5 text-xs font-bold text-amber-900 shadow-md dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-sm font-extrabold">{pendingCount} document(s) en attente de validation</p>
              <p className="mt-0.5 text-[11px] font-normal text-amber-800/90 dark:text-amber-300/80">
                Des supports ont été soumis par les formateurs et nécessitent votre validation.
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilter('SOUMIS')}
            className="shrink-0 rounded-2xl bg-amber-600 px-4 py-2 text-xs font-extrabold text-white shadow-md hover:bg-amber-700 active:scale-95"
          >
            Examiner la file ({pendingCount}) →
          </button>
        </div>
      )}

      {/* BARRE DE RECHERCHE ET BADGES DE FILTRE */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par titre, catégorie ou auteur..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder-slate-400 shadow-sm focus:border-sky-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value)}
              className={`rounded-2xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
                filter === item.value
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {actionError && <Alert variant="error" message={actionError} onClose={() => setActionError(null)} />}

      {!documents ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          <p className="mt-3 text-xs font-medium">Chargement des documents...</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-md shadow-slate-500/5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-slate-200/80 bg-slate-100/70 text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="py-4 px-6">Document</th>
                  <th className="py-4 px-6">Catégorie</th>
                  <th className="py-4 px-6">Auteur / Formateur</th>
                  <th className="py-4 px-6">Statut de validation</th>
                  <th className="py-4 px-6 text-right">Actions de modération</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {documents.map((document) => (
                  <tr
                    key={document.id}
                    className="group transition-colors duration-150 hover:bg-sky-50/50 dark:hover:bg-sky-950/20"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="shrink-0 text-slate-400" />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{document.titre}</p>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {document.format} · {(document.taille_octets / 1024).toFixed(0)} Ko
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className="inline-flex items-center rounded-xl bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                        {document.categorie_nom}
                      </span>
                    </td>

                    <td className="py-4 px-6 font-medium text-slate-700 dark:text-slate-300">
                      {document.auteur_email}
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
                          DOCUMENT_STATUT_BADGE_STYLES[document.statut]
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {DOCUMENT_STATUT_LABELS[document.statut]}
                      </span>
                      {document.statut === 'REFUSE' && document.motif_refus && (
                        <p className="mt-1 max-w-xs text-[10px] text-red-500 dark:text-red-400">
                          {document.motif_refus}
                        </p>
                      )}
                    </td>

                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      {refusingId === document.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <input
                            autoFocus
                            placeholder="Motif explicite du refus..."
                            value={motif}
                            onChange={(event) => setMotif(event.target.value)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-red-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          />
                          <button
                            onClick={() => confirmRefuse(document.id)}
                            className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-rose-700"
                          >
                            Confirmer
                          </button>
                          <button
                            onClick={() => setRefusingId(null)}
                            className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={document.fichier}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                          >
                            <Eye size={13} />
                            <span>Consulter</span>
                          </a>

                          {document.statut === 'SOUMIS' && (
                            <>
                              <button
                                onClick={() => handleValidateAndPublish(document)}
                                className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-md hover:bg-emerald-700 active:scale-95 transition-all"
                              >
                                <CheckCircle size={13} />
                                <span>Valider & Publier</span>
                              </button>

                              <button
                                onClick={() => {
                                  setRefusingId(document.id)
                                  setMotif('')
                                }}
                                className="flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-md hover:bg-rose-700 active:scale-95 transition-all"
                              >
                                <XCircle size={13} />
                                <span>Refuser</span>
                              </button>
                            </>
                          )}

                          {document.statut === 'PUBLIE' && (
                            <button
                              onClick={() => runAction(document.id, 'unpublish')}
                              className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-300"
                            >
                              Dépublier
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {documents.length === 0 && (
            <div className="p-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
              Aucun document dans cette catégorie de statut.
            </div>
          )}
          {documents.length > 0 && (
            <div className="px-6 py-4">
              <Pagination count={count} page={page} pageSize={DEFAULT_PAGE_SIZE} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
