import {
  CheckCircle,
  Clock,
  Eye,
  Plus,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, ApiError } from '../../api/client'
import {
  STATUT_BADGE_STYLES,
  STATUT_LABELS,
  type Formation,
  type FormationStatut,
  type PaginatedResponse,
} from '../../api/types'
import { Alert } from '../../components/Alert'
import { useConfirm } from '../../components/ConfirmContext'
import { useToast } from '../../components/ToastContext'

const FILTERS: Array<{ label: string; value: FormationStatut | 'ALL' }> = [
  { label: 'Toutes les formations', value: 'ALL' },
  { label: '⏳ En attente de validation (Soumises)', value: 'SOUMISE' },
  { label: '✅ Validées', value: 'VALIDEE' },
  { label: '🚀 Publiées', value: 'PUBLIEE' },
  { label: '❌ Refusées', value: 'REFUSEE' },
  { label: '📝 Brouillons', value: 'BROUILLON' },
  { label: '🔒 Dépubliées', value: 'DEPUBLIEE' },
]

export function FormationsPage() {
  const { showToast } = useToast()
  const confirm = useConfirm()

  const [formations, setFormations] = useState<Formation[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FormationStatut | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [refusingId, setRefusingId] = useState<string | null>(null)
  const [motif, setMotif] = useState('')

  // Modale d'inspection / prévisualisation pour l'administrateur
  const [previewFormation, setPreviewFormation] = useState<Formation | null>(null)

  function loadFormations() {
    const query = filter === 'ALL' ? '' : `?statut=${filter}`
    apiFetch<PaginatedResponse<Formation>>(`/formations/${query}`)
      .then((data) => setFormations(data.results))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur inattendue lors du chargement.'))
  }

  useEffect(loadFormations, [filter])

  async function runAction(id: string, action: string, body?: unknown) {
    setActionError(null)
    try {
      await apiFetch(`/formations/${id}/${action}/`, { method: 'POST', body })
      showToast('success', 'Le statut de la formation a été mis à jour avec succès.', 'Modération enregistrée')
      loadFormations()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Impossible d'effectuer cette action."
      setActionError(msg)
      showToast('error', msg)
    }
  }

  async function handleValidateAndPublish(formation: Formation) {
    const ok = await confirm({
      title: 'Valider et Publier cette formation ?',
      message: `La formation "${formation.titre}" créée par ${formation.auteur_email} sera immédiatement publiée et accessible aux apprenants.`,
      confirmLabel: 'Valider & Publier',
      variant: 'info',
    })
    if (ok) {
      // Étape 1 : Valider puis Étape 2 : Publier
      try {
        await apiFetch(`/formations/${formation.id}/validate/`, { method: 'POST' })
        await apiFetch(`/formations/${formation.id}/publish/`, { method: 'POST' })
        showToast('success', `La formation "${formation.titre}" a été validée et publiée !`, 'Publication confirmée')
        loadFormations()
        if (previewFormation?.id === formation.id) {
          setPreviewFormation(null)
        }
      } catch (err) {
        showToast('error', err instanceof ApiError ? err.message : 'Erreur lors de la validation.', 'Erreur')
      }
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
    if (previewFormation?.id === id) {
      setPreviewFormation(null)
    }
  }

  if (error) {
    return <Alert variant="error" message={error} />
  }

  const pendingFormationsCount = formations ? formations.filter((f) => f.statut === 'SOUMISE').length : 0

  const filteredFormations = formations
    ? formations.filter(
        (f) =>
          f.titre.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.categorie_nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.auteur_email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  return (
    <div className="space-y-6">
      {/* BANNIÈRE DE MODÉRATION ET VALIDATION DES FORMATIONS */}
      <div className="relative overflow-hidden rounded-3xl border border-sky-200/50 bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 p-6 text-white shadow-xl shadow-sky-500/10 sm:p-8 dark:border-sky-500/20">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-sky-100 backdrop-blur-md">
              <ShieldCheck size={14} className="text-emerald-300" />
              <span>Panneau d'Administration & Modération Pédagogique</span>
            </div>

            <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Validation & Moderation des Formations 🛡️
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-sky-100/90 sm:text-sm">
              Examinez les contenus pédagogiques créés et soumis par les formateurs. Validez et publiez les cours conformes ou motivez le refus.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <Link
              to="/admin/formations/new"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 to-sky-500 px-5 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-sky-500/25 transition-all hover:from-sky-500 hover:to-sky-600 active:scale-95"
            >
              <Plus size={16} />
              <span>Créer une formation admin</span>
            </Link>
          </div>
        </div>
      </div>

      {/* RAPPEL SUR LES FORMATIONS EN ATTENTE DE VALIDATION */}
      {pendingFormationsCount > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-3xl border border-amber-300 bg-amber-50 p-5 text-xs font-bold text-amber-900 shadow-md dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-sm font-extrabold">
                {pendingFormationsCount} formation(s) en attente de validation par l'administrateur
              </p>
              <p className="text-[11px] font-normal text-amber-800 dark:text-amber-300">
                Cliquez sur le filtre "Soumises" pour inspecter et valider le travail des enseignants.
              </p>
            </div>
          </div>

          <button
            onClick={() => setFilter('SOUMISE')}
            className="shrink-0 rounded-2xl bg-amber-600 px-4 py-2 text-xs font-extrabold text-white shadow-md hover:bg-amber-700 active:scale-95"
          >
            Examiner la file ({pendingFormationsCount}) →
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

      {!formations ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          <p className="mt-3 text-xs font-medium">Chargement du registre des formations...</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-md shadow-slate-500/5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-slate-200/80 bg-slate-100/70 text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="py-4 px-6">Titre de la formation</th>
                  <th className="py-4 px-6">Catégorie</th>
                  <th className="py-4 px-6">Auteur / Formateur</th>
                  <th className="py-4 px-6">Statut de validation</th>
                  <th className="py-4 px-6 text-right">Actions de modération</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredFormations.map((formation) => (
                  <tr
                    key={formation.id}
                    className="group transition-colors duration-150 hover:bg-sky-50/50 dark:hover:bg-sky-950/20"
                  >
                    <td className="py-4 px-6">
                      <div>
                        <button
                          onClick={() => setPreviewFormation(formation)}
                          className="font-bold text-slate-900 text-left hover:text-sky-600 dark:text-slate-100 dark:hover:text-sky-400"
                        >
                          {formation.titre}
                        </button>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {formation.description || 'Formation pédagogique enregistrée.'}
                        </p>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className="inline-flex items-center rounded-xl bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                        {formation.categorie_nom}
                      </span>
                    </td>

                    <td className="py-4 px-6 font-medium text-slate-700 dark:text-slate-300">
                      {formation.auteur_email}
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
                          STATUT_BADGE_STYLES[formation.statut]
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {STATUT_LABELS[formation.statut]}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      {refusingId === formation.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <input
                            autoFocus
                            placeholder="Motif explicite du refus..."
                            value={motif}
                            onChange={(event) => setMotif(event.target.value)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-red-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          />
                          <button
                            onClick={() => confirmRefuse(formation.id)}
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
                          {/* BOUTON APERÇU / INSPECTION */}
                          <button
                            onClick={() => setPreviewFormation(formation)}
                            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                          >
                            <Eye size={13} />
                            <span>Inspecter</span>
                          </button>

                          {/* ACTION SOUMISE : VALIDER ET PUBLIER / REFUSER */}
                          {formation.statut === 'SOUMISE' && (
                            <>
                              <button
                                onClick={() => handleValidateAndPublish(formation)}
                                className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-md hover:bg-emerald-700 active:scale-95 transition-all"
                              >
                                <CheckCircle size={13} />
                                <span>Valider & Publier</span>
                              </button>

                              <button
                                onClick={() => {
                                  setRefusingId(formation.id)
                                  setMotif('')
                                }}
                                className="flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-md hover:bg-rose-700 active:scale-95 transition-all"
                              >
                                <XCircle size={13} />
                                <span>Refuser</span>
                              </button>
                            </>
                          )}

                          {/* ACTION DEPUBLIER SI PUBLIEE */}
                          {formation.statut === 'PUBLIEE' && (
                            <button
                              onClick={() => runAction(formation.id, 'unpublish')}
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

          {filteredFormations.length === 0 && (
            <div className="p-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
              Aucune formation dans cette catégorie de statut.
            </div>
          )}
        </div>
      )}

      {/* MODALE D'INSPECTION & PRÉVISUALISATION PÉDAGOGIQUE ADMIN */}
      {previewFormation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-[fade-in_0.2s_ease-out]">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            {/* EN-TÊTE MODALE */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-md shadow-sky-500/20">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    Examen de Modération : {previewFormation.titre}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400">
                    Auteur : {previewFormation.auteur_email} • Catégorie : {previewFormation.categorie_nom}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPreviewFormation(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* CONTENU */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400">Statut Actuel</span>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {STATUT_LABELS[previewFormation.statut]}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400">Durée Estimée</span>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {previewFormation.duree_heures} Heures
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Description Pédagogique :</h4>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/50 p-4 rounded-2xl border border-slate-100 dark:bg-slate-800/30 dark:border-slate-800">
                  {previewFormation.description || 'Aucune description saisie.'}
                </p>
              </div>

              {previewFormation.statut === 'REFUSEE' && previewFormation.motif_refus && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  ⚠️ Motif du refus précédent : {previewFormation.motif_refus}
                </div>
              )}
            </div>

            {/* PIED DE MODALE & ACTIONS DE MODÉRATION */}
            <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between dark:border-slate-800">
              <button
                onClick={() => setPreviewFormation(null)}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300"
              >
                Fermer
              </button>

              {previewFormation.statut === 'SOUMISE' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setRefusingId(previewFormation.id)
                      setMotif('')
                      setPreviewFormation(null)
                    }}
                    className="rounded-2xl bg-rose-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-rose-700 shadow-md"
                  >
                    Refuser la formation
                  </button>

                  <button
                    onClick={() => handleValidateAndPublish(previewFormation)}
                    className="rounded-2xl bg-emerald-600 px-5 py-2 text-xs font-extrabold text-white hover:bg-emerald-700 shadow-md"
                  >
                    Valider & Publier
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
