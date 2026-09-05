import { GraduationCap, Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { apiFetch, ApiError } from '../../api/client'
import { DEFAULT_PAGE_SIZE, type Classe, type Filiere, type PaginatedResponse } from '../../api/types'
import { Alert } from '../../components/Alert'
import { useConfirm } from '../../components/ConfirmContext'
import { Modal } from '../../components/Modal'
import { Pagination } from '../../components/Pagination'
import { useToast } from '../../components/ToastContext'
import { useRealtimeTopics } from '../../hooks/useRealtimeTopics'

interface FiliereForm {
  id: string | null
  nom: string
}

interface ClasseForm {
  id: string | null
  nom: string
  filiere: string
}

const EMPTY_FILIERE: FiliereForm = { id: null, nom: '' }
const EMPTY_CLASSE: ClasseForm = { id: null, nom: '', filiere: '' }

export function EtablissementClassesPage() {
  const { t } = useTranslation()
  const confirm = useConfirm()
  const { showToast } = useToast()

  const [filieres, setFilieres] = useState<Filiere[] | null>(null)
  const [filieresCount, setFilieresCount] = useState(0)
  const [filieresPage, setFilieresPage] = useState(1)
  const [classes, setClasses] = useState<Classe[] | null>(null)
  const [classesCount, setClassesCount] = useState(0)
  const [classesPage, setClassesPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const [isFiliereModalOpen, setIsFiliereModalOpen] = useState(false)
  const [filiereForm, setFiliereForm] = useState<FiliereForm>(EMPTY_FILIERE)
  const [filiereError, setFiliereError] = useState<string | null>(null)

  const [isClasseModalOpen, setIsClasseModalOpen] = useState(false)
  const [classeForm, setClasseForm] = useState<ClasseForm>(EMPTY_CLASSE)
  const [classeError, setClasseError] = useState<string | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)

  function load() {
    Promise.all([
      apiFetch<PaginatedResponse<Filiere>>(`/etablissement/filieres/?page=${filieresPage}`),
      apiFetch<PaginatedResponse<Classe>>(`/etablissement/classes/?page=${classesPage}`),
    ])
      .then(([fil, cla]) => {
        setFilieres(fil.results)
        setFilieresCount(fil.count)
        setClasses(cla.results)
        setClassesCount(cla.count)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }

  useEffect(load, [filieresPage, classesPage])
  useRealtimeTopics(['etablissement_classes'], load)

  // ---- Filières ----
  function openCreateFiliere() {
    setFiliereForm(EMPTY_FILIERE)
    setFiliereError(null)
    setIsFiliereModalOpen(true)
  }

  function openEditFiliere(filiere: Filiere) {
    setFiliereForm({ id: filiere.id, nom: filiere.nom })
    setFiliereError(null)
    setIsFiliereModalOpen(true)
  }

  async function handleFiliereSubmit(event: FormEvent) {
    event.preventDefault()
    setFiliereError(null)
    setIsSubmitting(true)
    try {
      if (filiereForm.id) {
        await apiFetch(`/etablissement/filieres/${filiereForm.id}/`, { method: 'PATCH', body: { nom: filiereForm.nom } })
      } else {
        await apiFetch('/etablissement/filieres/', { method: 'POST', body: { nom: filiereForm.nom } })
      }
      showToast('success', t('etablissementAdmin.classesPage.filiereSaved'))
      setIsFiliereModalOpen(false)
      load()
    } catch (err) {
      setFiliereError(err instanceof ApiError ? err.message : t('etablissementAdmin.classesPage.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteFiliere(filiere: Filiere) {
    const ok = await confirm({
      title: t('etablissementAdmin.classesPage.deleteFiliereConfirm.title'),
      message: t('etablissementAdmin.classesPage.deleteFiliereConfirm.message', { nom: filiere.nom }),
      confirmLabel: t('etablissementAdmin.classesPage.deleteFiliereConfirm.confirmLabel'),
      danger: true,
    })
    if (!ok) return
    try {
      await apiFetch(`/etablissement/filieres/${filiere.id}/`, { method: 'DELETE' })
      showToast('success', t('etablissementAdmin.classesPage.filiereDeleted'))
      load()
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('etablissementAdmin.classesPage.error'))
    }
  }

  // ---- Classes ----
  function openCreateClasse() {
    setClasseForm(EMPTY_CLASSE)
    setClasseError(null)
    setIsClasseModalOpen(true)
  }

  function openEditClasse(classe: Classe) {
    setClasseForm({ id: classe.id, nom: classe.nom, filiere: classe.filiere ?? '' })
    setClasseError(null)
    setIsClasseModalOpen(true)
  }

  async function handleClasseSubmit(event: FormEvent) {
    event.preventDefault()
    setClasseError(null)
    setIsSubmitting(true)
    const body = { nom: classeForm.nom, filiere: classeForm.filiere || null }
    try {
      if (classeForm.id) {
        await apiFetch(`/etablissement/classes/${classeForm.id}/`, { method: 'PATCH', body })
      } else {
        await apiFetch('/etablissement/classes/', { method: 'POST', body })
      }
      showToast('success', t('etablissementAdmin.classesPage.classeSaved'))
      setIsClasseModalOpen(false)
      load()
    } catch (err) {
      setClasseError(err instanceof ApiError ? err.message : t('etablissementAdmin.classesPage.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteClasse(classe: Classe) {
    const ok = await confirm({
      title: t('etablissementAdmin.classesPage.deleteClasseConfirm.title'),
      message: t('etablissementAdmin.classesPage.deleteClasseConfirm.message', { nom: classe.nom }),
      confirmLabel: t('etablissementAdmin.classesPage.deleteClasseConfirm.confirmLabel'),
      danger: true,
    })
    if (!ok) return
    try {
      await apiFetch(`/etablissement/classes/${classe.id}/`, { method: 'DELETE' })
      showToast('success', t('etablissementAdmin.classesPage.classeDeleted'))
      load()
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('etablissementAdmin.classesPage.error'))
    }
  }

  if (error) {
    return <Alert variant="error" message={error} />
  }

  if (!filieres || !classes) {
    return <p className="text-slate-500 dark:text-slate-400">{t('common.loading')}</p>
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
  const labelClass = 'mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300'

  return (
    <div className="space-y-8">
      {/* ---- Filières ---- */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
            <Layers size={18} className="text-emerald-500" />
            {t('etablissementAdmin.classesPage.filieresHeading')} ({filieresCount})
          </h2>
          <button
            onClick={openCreateFiliere}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-emerald-700 active:scale-95"
          >
            <Plus size={16} />
            {t('etablissementAdmin.classesPage.newFiliere')}
          </button>
        </div>

        {filieres.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400 dark:border-slate-800">
            {t('etablissementAdmin.classesPage.noFilieres')}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filieres.map((filiere) => (
              <div
                key={filiere.id}
                className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{filiere.nom}</p>
                  <p className="text-xs text-slate-400">
                    {t('etablissementAdmin.classesPage.classesCount', { count: filiere.nombre_classes })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => openEditFiliere(filiere)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteFiliere(filiere)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">
          <Pagination count={filieresCount} page={filieresPage} pageSize={DEFAULT_PAGE_SIZE} onPageChange={setFilieresPage} />
        </div>
      </div>

      {/* ---- Classes ---- */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
            <GraduationCap size={18} className="text-emerald-500" />
            {t('etablissementAdmin.classesPage.classesHeading')} ({classesCount})
          </h2>
          <button
            onClick={openCreateClasse}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-emerald-700 active:scale-95"
          >
            <Plus size={16} />
            {t('etablissementAdmin.classesPage.newClasse')}
          </button>
        </div>

        {classes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400 dark:border-slate-800">
            {t('etablissementAdmin.classesPage.noClasses')}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((classe) => (
              <div
                key={classe.id}
                className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{classe.nom}</p>
                  <p className="truncate text-xs text-slate-400">
                    {classe.filiere_nom ? `${classe.filiere_nom} — ` : ''}
                    {t('etablissementAdmin.classesPage.elevesCount', { count: classe.nombre_eleves })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => openEditClasse(classe)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteClasse(classe)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">
          <Pagination count={classesCount} page={classesPage} pageSize={DEFAULT_PAGE_SIZE} onPageChange={setClassesPage} />
        </div>
      </div>

      {/* ---- Modal Filière ---- */}
      <Modal
        open={isFiliereModalOpen}
        onClose={() => setIsFiliereModalOpen(false)}
        title={filiereForm.id ? t('etablissementAdmin.classesPage.editFiliere') : t('etablissementAdmin.classesPage.newFiliere')}
      >
        <form onSubmit={handleFiliereSubmit} className="space-y-4">
          {filiereError && <Alert variant="error" message={filiereError} />}
          <div>
            <label className={labelClass}>{t('etablissementAdmin.classesPage.nomLabel')}</label>
            <input
              required
              value={filiereForm.nom}
              onChange={(event) => setFiliereForm({ ...filiereForm, nom: event.target.value })}
              placeholder="ex : Scientifique"
              className={inputClass}
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsFiliereModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {t('common.save')}
            </button>
          </div>
        </form>
      </Modal>

      {/* ---- Modal Classe ---- */}
      <Modal
        open={isClasseModalOpen}
        onClose={() => setIsClasseModalOpen(false)}
        title={classeForm.id ? t('etablissementAdmin.classesPage.editClasse') : t('etablissementAdmin.classesPage.newClasse')}
      >
        <form onSubmit={handleClasseSubmit} className="space-y-4">
          {classeError && <Alert variant="error" message={classeError} />}
          <div>
            <label className={labelClass}>{t('etablissementAdmin.classesPage.nomLabel')}</label>
            <input
              required
              value={classeForm.nom}
              onChange={(event) => setClasseForm({ ...classeForm, nom: event.target.value })}
              placeholder="ex : Tle D"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t('etablissementAdmin.classesPage.filiereLabel')}</label>
            <select
              value={classeForm.filiere}
              onChange={(event) => setClasseForm({ ...classeForm, filiere: event.target.value })}
              className={inputClass}
            >
              <option value="">{t('etablissementAdmin.classesPage.noFiliereOption')}</option>
              {filieres.map((filiere) => (
                <option key={filiere.id} value={filiere.id}>
                  {filiere.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsClasseModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {t('common.save')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
