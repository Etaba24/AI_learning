import {
  BookOpen,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Layers,
  Send,
  X,
  ShieldCheck,
  Info,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, ApiError } from '../../api/client'
import {
  NIVEAU_LABELS,
  STATUT_BADGE_STYLES,
  STATUT_LABELS,
  type Formation,
  type PaginatedResponse,
} from '../../api/types'
import { Alert } from '../../components/Alert'
import { useAuth } from '../../auth/AuthContext'
import { useConfirm } from '../../components/ConfirmContext'
import { useToast } from '../../components/ToastContext'

interface ModuleItem {
  id: string
  titre: string
  leconsCount: number
}

export function InstructorFormationsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const confirm = useConfirm()

  const [formations, setFormations] = useState<Formation[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatut, setSelectedStatut] = useState<string>('TOUS')

  // Modale de gestion des modules & leçons par le formateur
  const [selectedFormationForModules, setSelectedFormationForModules] = useState<Formation | null>(null)
  const [modulesList, setModulesList] = useState<ModuleItem[]>([])
  const [newModuleTitle, setNewModuleTitle] = useState('')

  function loadFormations() {
    apiFetch<PaginatedResponse<Formation>>('/formations/')
      .then((data) => setFormations(data.results))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur lors du chargement des cours.'))
  }

  useEffect(() => {
    loadFormations()
  }, [])

  // Action : Soumettre la formation pour vérification et validation par l'admin
  async function handleSubmitForValidation(formation: Formation) {
    const ok = await confirm({
      title: 'Soumettre la formation pour validation ?',
      message: `Souhaitez-vous transmettre la formation "${formation.titre}" à l'administrateur pour vérification et validation avant publication ?`,
      confirmLabel: 'Transmettre à l’Administrateur',
      variant: 'info',
    })

    if (ok) {
      try {
        await apiFetch(`/formations/${formation.id}/submit/`, { method: 'POST' })
        showToast(
          'success',
          `La formation "${formation.titre}" a été soumise avec succès à l'administrateur.`,
          'Soumission réussie !'
        )
        loadFormations()
      } catch (err) {
        showToast('error', err instanceof ApiError ? err.message : 'Erreur lors de la soumission de la formation.', 'Erreur')
      }
    }
  }

  function handleAddModule(e: React.FormEvent) {
    e.preventDefault()
    if (!newModuleTitle.trim()) return

    setModulesList([
      ...modulesList,
      { id: `mod-${Date.now()}`, titre: newModuleTitle, leconsCount: 1 },
    ])
    setNewModuleTitle('')
    showToast('success', 'Le nouveau module a été inséré dans le programme pédagogique.', 'Module ajouté')
  }

  if (error) {
    return <Alert variant="error" message={error} />
  }

  if (!formations) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="mt-4 text-xs font-semibold">Chargement de votre catalogue pédagogique...</p>
      </div>
    )
  }

  const filtered = formations.filter((f) => {
    // Un formateur ne voit strictement que les formations qu'il a créées
    if (user?.role === 'INSTRUCTOR' && f.auteur !== user.id && f.auteur_email !== user.email) {
      return false
    }
    const matchesSearch =
      f.titre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.categorie_nom.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatut = selectedStatut === 'TOUS' || f.statut === selectedStatut
    return matchesSearch && matchesStatut
  })

  return (
    <div className="space-y-6">
      {/* BANNIÈRE MES FORMATIONS */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-200/50 bg-gradient-to-br from-slate-900 via-indigo-950 to-sky-950 p-6 text-white shadow-xl shadow-indigo-500/10 sm:p-8 dark:border-indigo-500/20">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-indigo-100 backdrop-blur-md">
              <ShieldCheck size={14} className="text-emerald-300" />
              <span>Système de Validation & Modération Pédagogique</span>
            </div>

            <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Gestion de vos Formations & Cours
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-indigo-100/90 sm:text-sm">
              Rédigez vos programmes, structurez vos modules et leçons, puis soumettez vos formations pour la vérification obligatoire par l'administrateur.
            </p>
          </div>

          <div className="shrink-0">
            <Link
              to="/formateur/creer-formation"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-500 px-5 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-600 hover:to-sky-600 active:scale-95"
            >
              <Plus size={16} />
              <span>Créer un nouveau cours</span>
            </Link>
          </div>
        </div>
      </div>

      {/* RAPPEL SUR LA PROCÉDURE DE VALIDATION ADMINISTRATIVE */}
      <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50/80 p-4 text-xs text-sky-900 shadow-sm dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200">
        <Info size={20} className="text-sky-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-extrabold">Procédure de publication : Vérification obligatoire par l'Administrateur</p>
          <p className="text-[11px] leading-relaxed text-sky-800 dark:text-sky-300">
            Afin de garantir la qualité pédagogique de la plateforme, toute formation ou ressource créée par un formateur doit être <strong>soumise pour validation</strong>. L'administrateur examinera le contenu et publiera le cours s'il est conforme.
          </p>
        </div>
      </div>

      {/* FILTRES ET RECHERCHE */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par titre ou catégorie..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        {/* BADGES DE FILTRAGE PAR STATUT */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {['TOUS', 'BROUILLON', 'SOUMISE', 'PUBLIEE', 'REFUSEE'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatut(st)}
              className={`rounded-2xl px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${selectedStatut === st
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                }`}
            >
              {st === 'TOUS' ? 'Tous les statuts' : STATUT_LABELS[st as keyof typeof STATUT_LABELS] || st}
            </button>
          ))}
        </div>
      </div>

      {/* LISTE ET CARTE DES FORMATIONS */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <BookOpen size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
          <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-slate-100">Aucune formation trouvée</h3>
          <p className="mt-1 text-xs text-slate-400">Aucun cours ne correspond à vos critères de recherche.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((f) => (
            <div
              key={f.id}
              className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-md backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-indigo-500/40"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center rounded-xl bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                    {f.categorie_nom}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUT_BADGE_STYLES[f.statut]
                      }`}
                  >
                    {STATUT_LABELS[f.statut]}
                  </span>
                </div>

                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {f.titre}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500 line-clamp-2 dark:text-slate-400">
                  {f.description || 'Contenu pédagogique élaboré pour les étudiants.'}
                </p>

                {/* ALERTE EN CAS DE REFUS PAR L'ADMINISTRATEUR */}
                {f.statut === 'REFUSEE' && (
                  <div className="mt-3.5 rounded-2xl border border-red-200 bg-red-50/90 p-3 text-[11px] font-semibold text-red-900 dark:border-red-900/50 dark:bg-red-950/60 dark:text-red-200">
                    <div className="flex items-center gap-1.5 font-bold text-red-700 dark:text-red-400 mb-0.5">
                      <AlertCircle size={14} />
                      <span>Refusé par l'Administrateur</span>
                    </div>
                    <p className="text-[10px] leading-relaxed">
                      {f.motif_refus || 'Le contenu nécessite des révisions avant d’être validé.'}
                    </p>
                  </div>
                )}

                {/* INDICATION DE STATUT SOUMISE */}
                {f.statut === 'SOUMISE' && (
                  <div className="mt-3.5 rounded-2xl border border-amber-200 bg-amber-50/90 p-3 text-[11px] font-semibold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/60 dark:text-amber-200">
                    <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                      <Clock size={14} />
                      <span>⏳ Transmis pour vérification Admin</span>
                    </div>
                  </div>
                )}

                {/* INDICATION DE STATUT PUBLIÉE */}
                {f.statut === 'PUBLIEE' && (
                  <div className="mt-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-2.5 text-[11px] font-semibold text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/60 dark:text-emerald-200">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 size={14} />
                      <span>✅ Validé & En ligne pour les étudiants</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock size={13} /> {f.duree_heures} h
                  </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    Niveau {NIVEAU_LABELS[f.niveau]}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedFormationForModules(f)}
                    className="flex items-center justify-center gap-1.5 rounded-2xl border border-indigo-200 bg-indigo-50/60 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-300"
                  >
                    <Layers size={14} />
                    Gérer modules
                  </button>

                  <Link
                    to={`/apprenant/formations/${f.id}`}
                    className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200"
                  >
                    <Eye size={14} />
                    Vue élève
                  </Link>
                </div>

                {/* BOUTON SOUMETTRE À L'ADMIN (RÉSERVÉ SI BROUILLON OU REFUSÉE) */}
                {(f.statut === 'BROUILLON' || f.statut === 'REFUSEE') && (
                  <button
                    onClick={() => handleSubmitForValidation(f)}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 py-3 text-xs font-extrabold text-white shadow-md hover:from-sky-700 hover:to-indigo-700 active:scale-95 transition-all"
                  >
                    <Send size={14} />
                    <span>Soumettre pour validation Admin</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODALE DE GESTION DES MODULES ET LEÇONS PAR LE FORMATEUR */}
      {selectedFormationForModules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-[fade-in_0.2s_ease-out]">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            {/* HEADER MODALE */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-md shadow-indigo-500/20">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    Programme Pédagogique : {selectedFormationForModules.titre}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400">
                    Ajoutez et organisez les modules et leçons pour vos apprenants.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedFormationForModules(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* CONTENU */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* FORMULAIRE D'AJOUT RAPIDE DE MODULE */}
              <form onSubmit={handleAddModule} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  placeholder="Intitulé du nouveau module (ex: Module 4 - QCM Final)..."
                  className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 shrink-0"
                >
                  <Plus size={16} />
                  <span>Ajouter</span>
                </button>
              </form>

              {/* LISTE DES MODULES EXISTANTS */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Modules enregistrés ({modulesList.length}) :
                </h4>

                {modulesList.map((mod, idx) => (
                  <div
                    key={mod.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-100 text-xs font-extrabold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {idx + 1}
                      </span>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">{mod.titre}</h5>
                        <p className="text-[10px] text-slate-400 mt-0.5">{mod.leconsCount} leçons associées (vidéo, support, quiz)</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          showToast('info', `Édition des vidéos et QCM du "${mod.titre}" prête.`, 'Éditeur de leçon')
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        Gérer leçons
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PIED DE MODALE */}
            <div className="border-t border-slate-200 px-6 py-4 flex justify-end dark:border-slate-800">
              <button
                onClick={() => setSelectedFormationForModules(null)}
                className="rounded-2xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
