import { Ban, CheckCircle2, UploadCloud, Users } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { apiFetch, ApiError } from '../../api/client'
import {
  DEFAULT_PAGE_SIZE,
  type Classe,
  type EtablissementMembre,
  type ImportApprenantsResult,
  type PaginatedResponse,
  type Role,
} from '../../api/types'
import { Alert } from '../../components/Alert'
import { useConfirm } from '../../components/ConfirmContext'
import { Modal } from '../../components/Modal'
import { Pagination } from '../../components/Pagination'
import { useToast } from '../../components/ToastContext'
import { useRealtimeTopics } from '../../hooks/useRealtimeTopics'

interface EtablissementMembresPageProps {
  role: Extract<Role, 'STUDENT' | 'INSTRUCTOR'>
}

export function EtablissementMembresPage({ role }: EtablissementMembresPageProps) {
  const { t } = useTranslation()
  const confirm = useConfirm()
  const { showToast } = useToast()

  const [membres, setMembres] = useState<EtablissementMembre[] | null>(null)
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [classes, setClasses] = useState<Classe[]>([])
  const [classeFilter, setClasseFilter] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importClasse, setImportClasse] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<ImportApprenantsResult | null>(null)

  function load() {
    const base = classeFilter ? `role=${role}&classe=${classeFilter}` : `role=${role}`
    apiFetch<PaginatedResponse<EtablissementMembre>>(`/etablissement/membres/?${base}&page=${page}`)
      .then((data) => {
        setMembres(data.results)
        setCount(data.count)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }

  useEffect(load, [role, classeFilter, page])
  useEffect(() => setPage(1), [role, classeFilter])
  useRealtimeTopics(['etablissement_membres'], load)

  // La liste des classes n'a de sens que pour les apprenants — un formateur
  // n'est pas rattaché à une classe dans ce modèle.
  useEffect(() => {
    if (role !== 'STUDENT') return
    apiFetch<PaginatedResponse<Classe>>('/etablissement/classes/')
      .then((data) => setClasses(data.results))
      .catch(() => setClasses([]))
  }, [role])

  async function assignClasse(membre: EtablissementMembre, classeId: string) {
    setPendingId(membre.id)
    try {
      await apiFetch(`/etablissement/membres/${membre.id}/`, {
        method: 'PATCH',
        body: { classe: classeId || null },
      })
      showToast('success', t('etablissementAdmin.membresPage.classeUpdated'))
      load()
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('etablissementAdmin.membresPage.error'))
    } finally {
      setPendingId(null)
    }
  }

  async function toggleActive(membre: EtablissementMembre) {
    const name = `${membre.first_name} ${membre.last_name}`.trim() || membre.email
    const options = membre.is_active
      ? {
          title: t('etablissementAdmin.membresPage.blockConfirm.title'),
          message: t('etablissementAdmin.membresPage.blockConfirm.message', { name }),
          confirmLabel: t('etablissementAdmin.membresPage.blockConfirm.confirmLabel'),
          danger: true,
        }
      : {
          title: t('etablissementAdmin.membresPage.unblockConfirm.title'),
          message: t('etablissementAdmin.membresPage.unblockConfirm.message', { name }),
          confirmLabel: t('etablissementAdmin.membresPage.unblockConfirm.confirmLabel'),
        }

    const ok = await confirm(options)
    if (!ok) return

    setPendingId(membre.id)
    try {
      await apiFetch(`/etablissement/membres/${membre.id}/`, {
        method: 'PATCH',
        body: { is_active: !membre.is_active },
      })
      showToast(
        'success',
        membre.is_active
          ? t('etablissementAdmin.membresPage.blockSuccess')
          : t('etablissementAdmin.membresPage.unblockSuccess'),
      )
      load()
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('etablissementAdmin.membresPage.error'))
    } finally {
      setPendingId(null)
    }
  }

  function openImportModal() {
    setImportClasse(classeFilter || classes[0]?.id || '')
    setImportFile(null)
    setImportError(null)
    setImportResult(null)
    setIsImportModalOpen(true)
  }

  async function handleImport(event: FormEvent) {
    event.preventDefault()
    if (!importFile || !importClasse) return
    setImportError(null)
    setIsImporting(true)
    try {
      const formData = new FormData()
      formData.append('classe', importClasse)
      formData.append('file', importFile)
      const result = await apiFetch<ImportApprenantsResult>('/etablissement/apprenants/importer/', {
        method: 'POST',
        body: formData,
      })
      setImportResult(result)
      load()
    } catch (err) {
      setImportError(err instanceof ApiError ? err.message : t('etablissementAdmin.membresPage.importModal.error'))
    } finally {
      setIsImporting(false)
    }
  }

  if (error) {
    return <Alert variant="error" message={error} />
  }

  if (!membres) {
    return <p className="text-slate-500 dark:text-slate-400">{t('common.loading')}</p>
  }

  const showClasseColumn = role === 'STUDENT'

  return (
    <div className="space-y-4">
      {showClasseColumn && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {classes.length > 0 ? (
            <select
              value={classeFilter}
              onChange={(event) => setClasseFilter(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="">{t('etablissementAdmin.membresPage.filterAllClasses')}</option>
              {classes.map((classe) => (
                <option key={classe.id} value={classe.id}>
                  {classe.nom}
                </option>
              ))}
            </select>
          ) : (
            <span />
          )}
          <button
            onClick={openImportModal}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-emerald-700 active:scale-95"
          >
            <UploadCloud size={16} />
            {t('etablissementAdmin.membresPage.importButton')}
          </button>
        </div>
      )}

      {membres.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-14 text-center dark:border-slate-800">
          <Users size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('etablissementAdmin.membresPage.empty')}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('etablissementAdmin.membresPage.emptyHint')}</p>
        </div>
      ) : (
      <div className="overflow-x-auto rounded-3xl border border-slate-200/80 bg-white/90 shadow-md shadow-slate-500/5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
          <tr>
            <th className="px-5 py-3.5">{t('etablissementAdmin.membresPage.table.name')}</th>
            <th className="px-5 py-3.5">{t('etablissementAdmin.membresPage.table.email')}</th>
            <th className="px-5 py-3.5">{t('etablissementAdmin.membresPage.table.status')}</th>
            {showClasseColumn && <th className="px-5 py-3.5">{t('etablissementAdmin.membresPage.table.classe')}</th>}
            <th className="px-5 py-3.5">{t('etablissementAdmin.membresPage.table.since')}</th>
            <th className="px-5 py-3.5 text-right">{t('etablissementAdmin.membresPage.table.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {membres.map((membre) => (
            <tr key={membre.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
              <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-slate-100">
                {membre.first_name} {membre.last_name}
              </td>
              <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{membre.email}</td>
              <td className="px-5 py-3.5">
                {membre.is_active ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <CheckCircle2 size={11} />
                    {t('etablissementAdmin.membresPage.active')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600 dark:bg-red-500/10 dark:text-red-400">
                    <Ban size={11} />
                    {t('etablissementAdmin.membresPage.inactive')}
                  </span>
                )}
              </td>
              {showClasseColumn && (
                <td className="px-5 py-3.5">
                  <select
                    value={membre.classe ?? ''}
                    disabled={pendingId === membre.id}
                    onChange={(event) => assignClasse(membre, event.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="">{t('etablissementAdmin.membresPage.noClasse')}</option>
                    {classes.map((classe) => (
                      <option key={classe.id} value={classe.id}>
                        {classe.nom}
                      </option>
                    ))}
                  </select>
                </td>
              )}
              <td className="px-5 py-3.5 text-xs text-slate-400">
                {new Date(membre.date_joined).toLocaleDateString()}
              </td>
              <td className="px-5 py-3.5">
                <div className="flex justify-end">
                  <button
                    onClick={() => toggleActive(membre)}
                    disabled={pendingId === membre.id}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${
                      membre.is_active
                        ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
                        : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                    }`}
                  >
                    {membre.is_active ? t('etablissementAdmin.membresPage.block') : t('etablissementAdmin.membresPage.unblock')}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-5 py-4">
        <Pagination count={count} page={page} pageSize={DEFAULT_PAGE_SIZE} onPageChange={setPage} />
      </div>
      </div>
      )}

      <Modal
        open={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title={t('etablissementAdmin.membresPage.importModal.title')}
      >
        {importResult ? (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {t('etablissementAdmin.membresPage.importModal.resultCreated', { count: importResult.created.length })}
              {' · '}
              {t('etablissementAdmin.membresPage.importModal.resultUpdated', { count: importResult.updated.length })}
              {' · '}
              {t('etablissementAdmin.membresPage.importModal.resultSkipped', { count: importResult.skipped.length })}
            </p>

            {importResult.skipped.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  {t('etablissementAdmin.membresPage.importModal.skippedReasonsTitle')}
                </p>
                <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800">
                  {importResult.skipped.map((row, index) => (
                    <li key={index} className="text-slate-600 dark:text-slate-300">
                      <span className="font-semibold">{row.nom || row.email}</span> — {row.raison}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700"
              >
                {t('etablissementAdmin.membresPage.importModal.close')}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleImport} className="space-y-4">
            {importError && <Alert variant="error" message={importError} />}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('etablissementAdmin.membresPage.importModal.intro')}
            </p>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                {t('etablissementAdmin.membresPage.importModal.classeLabel')}
              </label>
              {classes.length === 0 ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {t('etablissementAdmin.membresPage.importModal.noClasses')}
                </p>
              ) : (
                <select
                  required
                  value={importClasse}
                  onChange={(event) => setImportClasse(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">{t('etablissementAdmin.membresPage.importModal.classePlaceholder')}</option>
                  {classes.map((classe) => (
                    <option key={classe.id} value={classe.id}>
                      {classe.nom}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                {t('etablissementAdmin.membresPage.importModal.fileLabel')}
              </label>
              <input
                required
                type="file"
                accept=".csv,.xlsx"
                onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-900 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:bg-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={isImporting || !importFile || !importClasse}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isImporting
                  ? t('etablissementAdmin.membresPage.importModal.submitting')
                  : t('etablissementAdmin.membresPage.importModal.submit')}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
