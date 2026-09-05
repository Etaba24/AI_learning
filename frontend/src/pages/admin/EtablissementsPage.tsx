import { Building2, Check, Copy, KeyRound, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { apiFetch, ApiError } from '../../api/client'
import { DEFAULT_PAGE_SIZE, type Etablissement, type PaginatedResponse } from '../../api/types'
import { Alert } from '../../components/Alert'
import { useConfirm } from '../../components/ConfirmContext'
import { Modal } from '../../components/Modal'
import { Pagination } from '../../components/Pagination'
import { useToast } from '../../components/ToastContext'
import { useRealtimeTopics } from '../../hooks/useRealtimeTopics'

interface FormState {
  id: string | null
  nom: string
  actif: boolean
}

interface ResponsableCode {
  code: string
  utilise: boolean
  utilise_le: string | null
  created_at: string
}

const EMPTY_FORM: FormState = { id: null, nom: '', actif: true }

export function EtablissementsPage() {
  const { showToast } = useToast()
  const confirm = useConfirm()

  const [etablissements, setEtablissements] = useState<Etablissement[] | null>(null)
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false)
  const [codeModalEtab, setCodeModalEtab] = useState<Etablissement | null>(null)
  const [responsableCode, setResponsableCode] = useState<ResponsableCode | null>(null)
  const [responsableCodeCopied, setResponsableCodeCopied] = useState(false)
  const [isLoadingCode, setIsLoadingCode] = useState(false)
  const [isGeneratingCode, setIsGeneratingCode] = useState(false)

  function loadEtablissements() {
    apiFetch<PaginatedResponse<Etablissement>>(`/etablissements/?page=${page}`)
      .then((data) => {
        setEtablissements(data.results)
        setCount(data.count)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }

  useEffect(loadEtablissements, [page])
  useRealtimeTopics(['admin_etablissements'], loadEtablissements)

  function openCreateModal() {
    setForm(EMPTY_FORM)
    setFormError(null)
    setIsModalOpen(true)
  }

  function openEditModal(etablissement: Etablissement) {
    setForm({ id: etablissement.id, nom: etablissement.nom, actif: etablissement.actif })
    setFormError(null)
    setIsModalOpen(true)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    setIsSubmitting(true)
    try {
      if (form.id) {
        await apiFetch(`/etablissements/${form.id}/`, {
          method: 'PATCH',
          body: { nom: form.nom, actif: form.actif },
        })
        showToast('success', 'Établissement modifié avec succès.')
      } else {
        await apiFetch('/etablissements/', { method: 'POST', body: { nom: form.nom } })
        showToast('success', 'Établissement créé — partagez son code d\'invitation à ses membres.')
      }
      setIsModalOpen(false)
      loadEtablissements()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Une erreur est survenue.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(etablissement: Etablissement) {
    const ok = await confirm({
      title: 'Supprimer cet établissement ?',
      message: `"${etablissement.nom}" sera définitivement supprimé. Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (!ok) return
    try {
      await apiFetch(`/etablissements/${etablissement.id}/`, { method: 'DELETE' })
      showToast('success', 'Établissement supprimé avec succès.')
      loadEtablissements()
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Impossible de supprimer cet établissement.')
    }
  }

  function copyCode(etablissement: Etablissement) {
    navigator.clipboard.writeText(etablissement.code_invitation).then(() => {
      setCopiedId(etablissement.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  function copyResponsableCode() {
    if (!responsableCode) return
    navigator.clipboard.writeText(responsableCode.code).then(() => {
      setResponsableCodeCopied(true)
      setTimeout(() => setResponsableCodeCopied(false), 2000)
    })
  }

  function openCodeModal(etablissement: Etablissement) {
    setCodeModalEtab(etablissement)
    setResponsableCode(null)
    setIsCodeModalOpen(true)
    setIsLoadingCode(true)
    apiFetch<ResponsableCode | undefined>(`/etablissements/${etablissement.id}/code-responsable/`)
      .then((data) => setResponsableCode(data ?? null))
      .catch((err) => showToast('error', err instanceof ApiError ? err.message : 'Erreur inattendue.'))
      .finally(() => setIsLoadingCode(false))
  }

  async function handleGenerateResponsableCode() {
    if (!codeModalEtab) return
    setIsGeneratingCode(true)
    try {
      const data = await apiFetch<ResponsableCode>(`/etablissements/${codeModalEtab.id}/code-responsable/`, {
        method: 'POST',
      })
      setResponsableCode(data)
      showToast('success', 'Code responsable généré — communiquez-le au responsable de cet établissement.')
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Une erreur est survenue.')
    } finally {
      setIsGeneratingCode(false)
    }
  }

  if (error) {
    return <Alert variant="error" message={error} />
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Établissements {etablissements ? `(${count})` : ''}
        </h1>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
        >
          <Plus size={16} />
          Nouvel établissement
        </button>
      </div>

      {!etablissements ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          <p className="mt-3 text-xs font-medium">Chargement des établissements...</p>
        </div>
      ) : etablissements.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-14 text-center dark:border-slate-800">
          <Building2 size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Aucun établissement client.</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Créez un établissement pour générer son code d'invitation.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-slate-200/80 bg-white/90 shadow-md shadow-slate-500/5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Nom</th>
                <th className="px-5 py-3.5">Code d'invitation</th>
                <th className="px-5 py-3.5">Membres</th>
                <th className="px-5 py-3.5">Abonnement</th>
                <th className="px-5 py-3.5">Statut</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {etablissements.map((etablissement) => (
                <tr key={etablissement.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-slate-100">
                    {etablissement.nom}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => copyCode(etablissement)}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      title="Copier le code"
                    >
                      {etablissement.code_invitation}
                      {copiedId === etablissement.id ? (
                        <Check size={13} className="text-emerald-500" />
                      ) : (
                        <Copy size={13} className="text-slate-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{etablissement.nombre_membres}</td>
                  <td className="px-5 py-3.5">
                    {etablissement.abonnement_actif ? (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {etablissement.abonnement_actif.plan_nom} · jusqu'au{' '}
                        {new Date(etablissement.abonnement_actif.date_fin).toLocaleDateString('fr-FR')}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">Aucun abonnement actif</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        etablissement.actif
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {etablissement.actif ? 'Actif' : 'Désactivé'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openCodeModal(etablissement)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10"
                        title="Code responsable"
                      >
                        <KeyRound size={15} />
                      </button>
                      <button
                        onClick={() => openEditModal(etablissement)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-500/10"
                        title="Modifier"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(etablissement)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                        title="Supprimer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-6 py-4">
            <Pagination count={count} page={page} pageSize={DEFAULT_PAGE_SIZE} onPageChange={setPage} />
          </div>
        </div>
      )}

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={form.id ? "Modifier l'établissement" : 'Nouvel établissement'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <Alert variant="error" message={formError} />}

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              Nom de l'établissement *
            </label>
            <input
              type="text"
              required
              value={form.nom}
              onChange={(event) => setForm({ ...form, nom: event.target.value })}
              placeholder="ex : Lycée Bilingue de Yaoundé"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          {form.id && (
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.actif}
                onChange={(event) => setForm({ ...form, actif: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              Établissement actif (ses membres peuvent s'inscrire avec le code)
            </label>
          )}

          {!form.id && (
            <p className="text-xs text-slate-400">
              Le code d'invitation est généré automatiquement à la création.
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-sky-600 px-5 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Enregistrement...' : form.id ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        title={`Code responsable — ${codeModalEtab?.nom ?? ''}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ce code à usage unique permet à la personne responsable de cet établissement de créer son compte
            administrateur établissement. Communiquez-le-lui par un canal sûr (email, téléphone) — pas ici,
            cette fenêtre n'est visible que par vous.
          </p>

          {isLoadingCode ? (
            <p className="text-sm text-slate-400">Chargement...</p>
          ) : responsableCode ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={copyResponsableCode}
                  disabled={responsableCode.utilise}
                  className="inline-flex items-center gap-2 font-mono text-lg font-black text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-100"
                >
                  {responsableCode.code}
                  {responsableCodeCopied ? (
                    <Check size={16} className="text-emerald-500" />
                  ) : (
                    <Copy size={16} className="text-slate-400" />
                  )}
                </button>
                {responsableCode.utilise ? (
                  <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    Déjà utilisé
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    Disponible
                  </span>
                )}
              </div>
              {responsableCode.utilise_le && (
                <p className="mt-2 text-[11px] text-slate-400">
                  Utilisé le {new Date(responsableCode.utilise_le).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Aucun code généré pour l'instant.</p>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCodeModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={handleGenerateResponsableCode}
              disabled={isGeneratingCode}
              className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {isGeneratingCode
                ? 'Génération...'
                : responsableCode
                  ? 'Générer un nouveau code (invalide l\'ancien)'
                  : 'Générer un code'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
