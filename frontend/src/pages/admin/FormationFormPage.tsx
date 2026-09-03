import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch, ApiError } from '../../api/client'
import {
  STATUT_BADGE_STYLES,
  STATUT_LABELS,
  type Category,
  type Departement,
  type Formation,
  type FormationStatut,
  type Niveau,
  type PaginatedResponse,
} from '../../api/types'
import { Alert } from '../../components/Alert'
import { useAuth } from '../../auth/AuthContext'
import { useConfirm } from '../../components/ConfirmContext'
import { useToast } from '../../components/ToastContext'

const ACTIONS_BY_STATUT: Record<FormationStatut, Array<{ action: string; label: string }>> = {
  BROUILLON: [
    { action: 'submit', label: 'Soumettre pour validation' },
    { action: 'publish', label: 'Publier directement' },
  ],
  SOUMISE: [
    { action: 'validate', label: 'Valider' },
    { action: 'publish', label: 'Publier' },
    { action: 'refuse', label: 'Refuser' },
  ],
  VALIDEE: [{ action: 'publish', label: 'Publier' }],
  REFUSEE: [{ action: 'submit', label: 'Resoumettre' }],
  PUBLIEE: [{ action: 'unpublish', label: 'Dépublier' }],
  DEPUBLIEE: [{ action: 'publish', label: 'Republier' }],
}

export function FormationFormPage() {
  const { user } = useAuth()
  const { id } = useParams()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const { showToast } = useToast()
  const confirm = useConfirm()

  const [categories, setCategories] = useState<Category[]>([])
  const [departements, setDepartements] = useState<Departement[]>([])
  const [formation, setFormation] = useState<Formation | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [objectifs, setObjectifs] = useState('')
  const [prerequis, setPrerequis] = useState('')
  const [niveau, setNiveau] = useState<Niveau>('DEBUTANT')
  const [dureeHeures, setDureeHeures] = useState('1')
  const [categorieId, setCategorieId] = useState('')
  const [departementId, setDepartementId] = useState('')

  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showRefuseInput, setShowRefuseInput] = useState(false)
  const [motif, setMotif] = useState('')

  useEffect(() => {
    apiFetch<PaginatedResponse<Category>>('/categories/')
      .then((data) => {
        setCategories(data.results)
        if (!isEditing && data.results.length > 0) {
          setCategorieId(data.results[0].id)
        }
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))

    apiFetch<PaginatedResponse<Departement>>('/departements/')
      .then((data) => {
        setDepartements(data.results)
        if (!isEditing && data.results.length > 0) {
          setDepartementId(data.results[0].id)
        }
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }, [isEditing])

  useEffect(() => {
    if (!id) return
    apiFetch<Formation>(`/formations/${id}/`)
      .then((data) => {
        setFormation(data)
        setTitre(data.titre)
        setDescription(data.description)
        setObjectifs(data.objectifs)
        setPrerequis(data.prerequis)
        setNiveau(data.niveau)
        setDureeHeures(String(data.duree_heures))
        setCategorieId(data.categorie)
        setDepartementId(data.departement)
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }, [id])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaveError(null)
    setIsSaving(true)
    const body = {
      titre,
      description,
      objectifs,
      prerequis,
      niveau,
      duree_heures: Number(dureeHeures),
      categorie: categorieId,
      departement: departementId,
    }
    try {
      if (isEditing && id) {
        const updated = await apiFetch<Formation>(`/formations/${id}/`, { method: 'PATCH', body })
        setFormation(updated)
        showToast('success', 'Formation modifiée avec succès.')
      } else {
        const created = await apiFetch<Formation>('/formations/', { method: 'POST', body })
        showToast('success', 'Formation créée avec succès.')
        if (user?.role === 'INSTRUCTOR') {
          navigate('/formateur/mes-formations', { replace: true })
        } else {
          navigate(`/admin/formations/${created.id}`, { replace: true })
        }
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Impossible d\'enregistrer la formation.'
      setSaveError(msg)
      showToast('error', msg)
    } finally {
      setIsSaving(false)
    }
  }

  async function runAction(action: string, actionBody?: unknown) {
    if (!id) return
    setActionError(null)
    try {
      const updated = await apiFetch<Formation>(`/formations/${id}/${action}/`, {
        method: 'POST',
        body: actionBody,
      })
      setFormation(updated)
      setShowRefuseInput(false)
      showToast('success', 'Statut mis à jour.')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Impossible d'effectuer cette action."
      setActionError(msg)
      showToast('error', msg)
    }
  }

  async function handleActionClick(action: string) {
    if (action === 'refuse') {
      setMotif('')
      setShowRefuseInput(true)
      return
    }
    if (action === 'unpublish') {
      const ok = await confirm({
        title: 'Dépublier la formation ?',
        message: 'Cette formation ne sera plus accessible aux apprenants.',
        confirmLabel: 'Dépublier',
        variant: 'warning',
      })
      if (!ok) return
    }
    runAction(action)
  }

  if (loadError) {
    return <Alert variant="error" message={loadError} />
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">
        {isEditing ? 'Modifier la formation' : 'Nouvelle formation'}
      </h1>

      {isEditing && formation && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-3">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Statut :</span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUT_BADGE_STYLES[formation.statut]}`}>
              {STATUT_LABELS[formation.statut]}
            </span>
          </div>

          {formation.statut === 'REFUSEE' && formation.motif_refus && (
            <div className="mb-3">
              <Alert variant="warning" title="Motif du refus" message={formation.motif_refus} />
            </div>
          )}

          {actionError && (
            <div className="mb-3">
              <Alert variant="error" message={actionError} onClose={() => setActionError(null)} />
            </div>
          )}

          {showRefuseInput ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                placeholder="Motif du refus..."
                value={motif}
                onChange={(event) => setMotif(event.target.value)}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <button
                onClick={() => runAction('refuse', { motif })}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Confirmer
              </button>
              <button
                onClick={() => setShowRefuseInput(false)}
                className="text-sm text-slate-500 hover:underline dark:text-slate-400"
              >
                Annuler
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ACTIONS_BY_STATUT[formation.statut].map((item) => (
                <button
                  key={item.action}
                  onClick={() => handleActionClick(item.action)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {item.label}
                </button>
              ))}
              {ACTIONS_BY_STATUT[formation.statut].length === 0 && (
                <p className="text-sm text-slate-400 dark:text-slate-500">Aucune action disponible depuis ce statut.</p>
              )}
            </div>
          )}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
      >
        {saveError && (
          <Alert variant="error" message={saveError} onClose={() => setSaveError(null)} />
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
            Titre
          </label>
          <input
            required
            value={titre}
            onChange={(event) => setTitre(event.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
            Objectifs
          </label>
          <textarea
            rows={2}
            value={objectifs}
            onChange={(event) => setObjectifs(event.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
            Prérequis
          </label>
          <textarea
            rows={2}
            value={prerequis}
            onChange={(event) => setPrerequis(event.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
              Niveau
            </label>
            <select
              value={niveau}
              onChange={(event) => setNiveau(event.target.value as Niveau)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="DEBUTANT">Débutant</option>
              <option value="INTERMEDIAIRE">Intermédiaire</option>
              <option value="AVANCE">Avancé</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
              Durée (heures)
            </label>
            <input
              type="number"
              min={1}
              required
              value={dureeHeures}
              onChange={(event) => setDureeHeures(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
              Catégorie
            </label>
            <select
              required
              value={categorieId}
              onChange={(event) => setCategorieId(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {categories.length === 0 && <option value="">Aucune catégorie — créez-en une d'abord</option>}
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
              Département
            </label>
            <select
              required
              value={departementId}
              onChange={(event) => setDepartementId(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {departements.length === 0 && <option value="">Aucun département — créez-en un d'abord</option>}
              {departements.map((departement) => (
                <option key={departement.id} value={departement.id}>
                  {departement.nom}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving || categories.length === 0 || departements.length === 0}
          className="rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
        >
          {isSaving ? 'Enregistrement...' : isEditing ? 'Enregistrer' : 'Créer la formation'}
        </button>
      </form>
    </div>
  )
}
