import {
  CheckCircle,
  Clock,
  Eye,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  X,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiFetch, ApiError } from '../../api/client'
import {
  DEFAULT_PAGE_SIZE,
  STATUT_BADGE_STYLES,
  STATUT_LABELS,
  type Formation,
  type FormationStatut,
  type PaginatedResponse,
  type User,
} from '../../api/types'
import { Alert } from '../../components/Alert'
import { useConfirm } from '../../components/ConfirmContext'
import { Pagination } from '../../components/Pagination'
import { useToast } from '../../components/ToastContext'
import { useRealtimeTopics } from '../../hooks/useRealtimeTopics'

const FILTERS: Array<{ label: string; value: FormationStatut | 'ALL' }> = [
  { label: 'Toutes les formations', value: 'ALL' },
  { label: 'En attente de validation (Soumises)', value: 'SOUMISE' },
  { label: 'Validées', value: 'VALIDEE' },
  { label: 'Publiées', value: 'PUBLIEE' },
  { label: 'Refusées', value: 'REFUSEE' },
  { label: 'Brouillons', value: 'BROUILLON' },
  { label: 'Dépubliées', value: 'DEPUBLIEE' },
]

export function FormationsPage() {
  const { showToast } = useToast()
  const confirm = useConfirm()

  const [formations, setFormations] = useState<Formation[] | null>(null)
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pendingCount, setPendingCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FormationStatut | 'ALL'>('ALL')
  // Pré-rempli depuis la barre de recherche globale du header (?q=...) —
  // celle-ci redirige ici plutôt que de dupliquer une recherche à part.
  const [searchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '')
  const [actionError, setActionError] = useState<string | null>(null)
  const [refusingId, setRefusingId] = useState<string | null>(null)
  const [motif, setMotif] = useState('')
  const [instructors, setInstructors] = useState<User[]>([])
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [selectedFormateurId, setSelectedFormateurId] = useState('')

  // Modale d'inspection / prévisualisation pour l'administrateur
  const [previewFormation, setPreviewFormation] = useState<Formation | null>(null)

  function loadFormations() {
    const params = new URLSearchParams()
    if (filter !== 'ALL') params.set('statut', filter)
    if (searchQuery.trim()) params.set('q', searchQuery.trim())
    params.set('page', String(page))
    apiFetch<PaginatedResponse<Formation>>(`/formations/?${params.toString()}`)
      .then((data) => {
        setFormations(data.results)
        setCount(data.count)
      })
      .catch((err) => {
        // Une suppression peut vider la dernière page affichée : la page
        // demandée n'existe alors plus (l'API renvoie 404 "Invalid page"),
        // jamais une vraie erreur — on retombe simplement sur la page
        // précédente plutôt que d'afficher un écran d'erreur.
        if (err instanceof ApiError && err.status === 404 && page > 1) {
          setPage((p) => Math.max(1, p - 1))
          return
        }
        setError(err instanceof ApiError ? err.message : 'Erreur inattendue lors du chargement.')
      })
  }

  // Compte global (toutes pages confondues) des formations en attente de
  // validation, indépendant du filtre/de la page affichés — sinon la
  // bannière ne compterait que celles de la page actuellement visible.
  function loadPendingCount() {
    apiFetch<PaginatedResponse<Formation>>('/formations/?statut=SOUMISE')
      .then((data) => setPendingCount(data.count))
      .catch(() => {})
  }

  useEffect(() => {
    const timeout = setTimeout(loadFormations, 250)
    return () => clearTimeout(timeout)
  }, [filter, searchQuery, page])
  useEffect(() => setPage(1), [filter, searchQuery])
  useEffect(loadPendingCount, [])
  useRealtimeTopics(['admin_formations'], () => {
    loadFormations()
    loadPendingCount()
  })

  useEffect(() => {
    apiFetch<PaginatedResponse<User>>('/users/?role=INSTRUCTOR')
      .then((data) => setInstructors(data.results))
      .catch(() => setInstructors([]))
  }, [])

  function openAssignFor(formation: Formation) {
    setRefusingId(null)
    setAssigningId(formation.id)
    setSelectedFormateurId(formation.auteur ?? '')
  }

  async function confirmAssign(formation: Formation) {
    if (!selectedFormateurId) return
    try {
      await apiFetch(`/formations/${formation.id}/assigner/`, {
        method: 'POST',
        body: { formateur_id: selectedFormateurId },
      })
      const formateur = instructors.find((i) => i.id === selectedFormateurId)
      showToast('success', `"${formation.titre}" a été assignée à ${formateur?.email ?? 'ce formateur'}.`)
      setAssigningId(null)
      loadFormations()
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : "Impossible d'assigner cette formation.")
    }
  }

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

  async function handleDelete(formation: Formation) {
    const ok = await confirm({
      title: 'Supprimer cette formation ?',
      message: `"${formation.titre}" sera définitivement supprimée, avec tous ses modules, leçons et supports. Si des apprenants y sont inscrits, leur inscription et leur progression seront elles aussi définitivement effacées. Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (!ok) return

    try {
      await apiFetch(`/formations/${formation.id}/`, { method: 'DELETE' })
      showToast('success', `"${formation.titre}" a été supprimée.`)
      if (previewFormation?.id === formation.id) setPreviewFormation(null)
      loadFormations()
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Impossible de supprimer cette formation.')
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
              Validation & Moderation des Formations
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-sky-100/90 sm:text-sm">
              Examinez les contenus pédagogiques créés et soumis par les formateurs. Validez et publiez les cours conformes ou motivez le refus.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <Link
              to="/admin/creer-formation"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 to-sky-500 px-5 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-sky-500/25 transition-all hover:from-sky-500 hover:to-sky-600 active:scale-95"
            >
              <Plus size={16} />
              <span>Créer une formation admin</span>
            </Link>
          </div>
        </div>
      </div>

      {/* RAPPEL SUR LES FORMATIONS EN ATTENTE DE VALIDATION */}
      {pendingCount > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-3xl border border-amber-300 bg-amber-50 p-5 text-xs font-bold text-amber-900 shadow-md dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-sm font-extrabold">
                {pendingCount} formation(s) en attente de validation par l'administrateur
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
                {formations.map((formation) => (
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
                      ) : assigningId === formation.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <select
                            autoFocus
                            value={selectedFormateurId}
                            onChange={(event) => setSelectedFormateurId(event.target.value)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          >
                            <option value="">Choisir un formateur...</option>
                            {instructors.map((instructor) => (
                              <option key={instructor.id} value={instructor.id}>
                                {instructor.email}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => confirmAssign(formation)}
                            disabled={!selectedFormateurId}
                            className="rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
                          >
                            Confirmer
                          </button>
                          <button
                            onClick={() => setAssigningId(null)}
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

                          {/* ASSIGNER À UN FORMATEUR */}
                          <button
                            onClick={() => openAssignFor(formation)}
                            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                            title="Assigner cette formation à un formateur"
                          >
                            <UserCog size={13} />
                            <span>Assigner</span>
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

                          {/* ACTION REPUBLIER SI DEPUBLIEE */}
                          {formation.statut === 'DEPUBLIEE' && (
                            <button
                              onClick={() => runAction(formation.id, 'publish')}
                              className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-md hover:bg-emerald-700 active:scale-95 transition-all"
                            >
                              <CheckCircle size={13} />
                              <span>Republier</span>
                            </button>
                          )}

                          {/* SUPPRESSION DÉFINITIVE */}
                          <button
                            onClick={() => handleDelete(formation)}
                            className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-400"
                            title="Supprimer définitivement cette formation"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {formations.length === 0 && (
            <div className="p-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
              Aucune formation dans cette catégorie de statut.
            </div>
          )}
          {formations.length > 0 && (
            <div className="px-6 py-4">
              <Pagination count={count} page={page} pageSize={DEFAULT_PAGE_SIZE} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      {/* MODALE D'INSPECTION & PRÉVISUALISATION PÉDAGOGIQUE ADMIN */}
      {previewFormation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-[fade-in_0.2s_ease-out]">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
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

              {/* PROGRAMME COMPLET : ce que l'admin doit réellement examiner
                  avant de valider/publier, pas seulement les métadonnées. */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Programme pédagogique ({previewFormation.modules?.length ?? 0} module
                  {(previewFormation.modules?.length ?? 0) > 1 ? 's' : ''}) :
                </h4>

                {!previewFormation.modules || previewFormation.modules.length === 0 ? (
                  <p className="mt-2 rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-800">
                    Aucun module créé — cette formation ne pourra pas être publiée (RG-003).
                  </p>
                ) : (
                  <div className="mt-2 space-y-3">
                    {previewFormation.modules.map((module, mIdx) => (
                      <div
                        key={module.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                      >
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          Module {mIdx + 1} : {module.titre}
                        </p>
                        {module.lecons.length === 0 ? (
                          <p className="mt-1.5 text-[11px] italic text-slate-400">Aucune leçon dans ce module.</p>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {module.lecons.map((lecon, lIdx) => (
                              <div
                                key={lecon.id}
                                className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                              >
                                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                                  Leçon {lIdx + 1} : {lecon.titre}
                                </p>
                                {lecon.contenu && (
                                  <p className="mt-1 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                                    {lecon.contenu}
                                  </p>
                                )}
                                {lecon.video_url ? (
                                  /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(lecon.video_url) ? (
                                    <video
                                      src={lecon.video_url}
                                      controls
                                      className="mt-2 w-full max-h-40 rounded-lg bg-black"
                                    />
                                  ) : (
                                    <a
                                      href={lecon.video_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="mt-1.5 inline-block text-[11px] font-bold text-sky-600 hover:underline dark:text-sky-400"
                                    >
                                      ▶ Voir la vidéo
                                    </a>
                                  )
                                ) : (
                                  <p className="mt-1.5 text-[10px] text-slate-400">Aucune vidéo.</p>
                                )}
                                <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] font-semibold">
                                  {lecon.ressources && lecon.ressources.length > 0 && (
                                    <a
                                      href={lecon.ressources[0].url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="rounded-lg bg-emerald-50 px-2 py-0.5 text-emerald-700 hover:underline dark:bg-emerald-500/10 dark:text-emerald-300"
                                    >
                                      📄 {lecon.ressources[0].nom}
                                    </a>
                                  )}
                                  {lecon.exercices && lecon.exercices.length > 0 && (
                                    <span className="rounded-lg bg-amber-50 px-2 py-0.5 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                                      {lecon.exercices.length} exercice{lecon.exercices.length > 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
