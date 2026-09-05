import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  FileText,
  HelpCircle,
  Layers,
  Plus,
  Rocket,
  ShieldCheck,
  Sparkles,
  Trash2,
  Video,
  AlertCircle,
  Check,
  Eye,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch, ApiError } from '../../api/client'
import {
  NIVEAU_LABELS,
  type Category,
  type Departement,
  type Formation,
  type Niveau,
  type PaginatedResponse,
} from '../../api/types'
import { Alert } from '../../components/Alert'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../components/ToastContext'

// STRUCTURE PÉDAGOGIQUE COMPLÈTE
interface QuestionQuiz {
  id: string
  question: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctOption: 'A' | 'B' | 'C' | 'D'
  explication: string
}

interface SupportDocument {
  id: string
  nom: string
  type: 'PDF' | 'IMAGE' | 'DOCUMENT'
  url: string
}

interface LeconWizard {
  id: string
  titre: string
  videoUrl: string
  videoDureeMin: number
  contenuTextuel: string
  support: SupportDocument | null
  exercices: QuestionQuiz[]
}

interface ModuleWizard {
  id: string
  titre: string
  description: string
  ordre: number
  lecons: LeconWizard[]
}

// Brouillon persistant localement (localStorage) — permet de reprendre
// l'assistant exactement là où il a été laissé après une déconnexion
// involontaire, sans dépendre d'une sauvegarde manuelle. Limite assumée :
// ne survit que dans ce navigateur précis (pas de persistance serveur tant
// que la formation n'a pas été réellement créée via handleFinalSubmit).
interface WizardDraft {
  titre: string
  description: string
  objectifs: string
  prerequis: string
  niveau: Niveau
  dureeHeures: string
  categorieId: string
  departementId: string
  modules: ModuleWizard[]
  currentStep: 1 | 2 | 3 | 4
  savedAt: string
}

const DRAFT_KEY_PREFIX = 'ai-learning:wizard-formation-draft:'

export function CreateFormationWizardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)
  const { showToast } = useToast()

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)

  // Données des catégories et départements
  const [categories, setCategories] = useState<Category[]>([])
  const [departements, setDepartements] = useState<Departement[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  // ÉTAPE 1 : Informations Générales de la Formation
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [objectifs, setObjectifs] = useState('')
  const [prerequis, setPrerequis] = useState('')
  const [niveau, setNiveau] = useState<Niveau>('DEBUTANT')
  const [dureeHeures, setDureeHeures] = useState('10')
  const [categorieId, setCategorieId] = useState('')
  const [departementId, setDepartementId] = useState('')

  // ÉTAPE 2 : Structure des Modules
  const [modules, setModules] = useState<ModuleWizard[]>([])

  // Formulaire d'ajout rapide de module (Step 2)
  const [newModuleTitle, setNewModuleTitle] = useState('')
  const [newModuleDesc, setNewModuleDesc] = useState('')

  // Sélection du module actif (Step 3)
  const [selectedModuleIdIndex, setSelectedModuleIdIndex] = useState<number>(0)

  // Modale d'ajout de leçon (Step 3) - support vidéo & document via Fichier ou URL
  const [isAddLessonOpen, setIsAddLessonOpen] = useState(false)
  const [newLessonTitle, setNewLessonTitle] = useState('')
  const [newLessonVideoUrl, setNewLessonVideoUrl] = useState('')
  const [newLessonVideoDuree, setNewLessonVideoDuree] = useState(12)
  const [newLessonContent, setNewLessonContent] = useState('')
  const [newLessonDocName, setNewLessonDocName] = useState('')
  const [newLessonDocUrl, setNewLessonDocUrl] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [docFile, setDocFile] = useState<File | null>(null)
  const [videoSourceMode, setVideoSourceMode] = useState<'FILE' | 'URL'>('FILE')
  const [docSourceMode, setDocSourceMode] = useState<'FILE' | 'URL'>('FILE')

  // Modale de consultation / prévisualisation de leçon (Step 3)
  const [selectedLessonToView, setSelectedLessonToView] = useState<LeconWizard | null>(null)

  // Modale d'ajout d'exercice QCM
  const [isAddQuizOpen, setIsAddQuizOpen] = useState(false)
  const [targetLessonIdForQuiz, setTargetLessonIdForQuiz] = useState<string | null>(null)
  const [quizQuestion, setQuizQuestion] = useState('')
  const [quizOptA, setQuizOptA] = useState('')
  const [quizOptB, setQuizOptB] = useState('')
  const [quizOptC, setQuizOptC] = useState('')
  const [quizOptD, setQuizOptD] = useState('')
  const [quizCorrect, setQuizCorrect] = useState<'A' | 'B' | 'C' | 'D'>('A')
  const [quizExplication, setQuizExplication] = useState('')

  // État de sauvegarde & publication API
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingLessonMedia, setIsUploadingLessonMedia] = useState(false)

  // BROUILLON AUTOMATIQUE — clé isolée par utilisateur (poste partagé)
  const draftKey = `${DRAFT_KEY_PREFIX}${user?.id ?? 'anon'}`
  const [isDraftHydrated, setIsDraftHydrated] = useState(false)
  const [restoredDraftAt, setRestoredDraftAt] = useState<string | null>(null)

  // Restauration du brouillon au montage (une seule fois, avant l'autosave).
  // En mode édition, la formation serveur prime sur le brouillon local :
  // l’utilisateur doit reprendre directement l’édition du cours existant.
  useEffect(() => {
    if (isEditing) {
      setIsDraftHydrated(true)
      return
    }

    try {
      const raw = localStorage.getItem(draftKey)
      if (raw) {
        const draft = JSON.parse(raw) as WizardDraft
        if (draft && (draft.titre?.trim() || (draft.modules?.length ?? 0) > 0)) {
          setTitre(draft.titre || '')
          setDescription(draft.description || '')
          setObjectifs(draft.objectifs || '')
          setPrerequis(draft.prerequis || '')
          setNiveau(draft.niveau || 'DEBUTANT')
          setDureeHeures(draft.dureeHeures || '10')
          setCategorieId(draft.categorieId || '')
          setDepartementId(draft.departementId || '')
          setModules(draft.modules || [])
          setCurrentStep(draft.currentStep || 1)
          setRestoredDraftAt(draft.savedAt || null)
        }
      }
    } catch {
      // Brouillon corrompu ou localStorage indisponible : on repart d'un
      // formulaire vierge plutôt que de bloquer l'assistant.
    } finally {
      setIsDraftHydrated(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing])

  useEffect(() => {
    if (!isEditing || !id) return

    let cancelled = false

    apiFetch<Formation>(`/formations/${id}/`)
      .then((data) => {
        if (cancelled) return

        setTitre(data.titre || '')
        setDescription(data.description || '')
        setObjectifs(data.objectifs || '')
        setPrerequis(data.prerequis || '')
        setNiveau(data.niveau || 'DEBUTANT')
        setDureeHeures(String(data.duree_heures || 10))
        setCategorieId(data.categorie || '')
        setDepartementId(data.departement || '')
        setModules(
          (data.modules || []).map((module, moduleIndex) => ({
            id: module.id,
            titre: module.titre,
            description: module.description || '',
            ordre: Number(module.ordre ?? moduleIndex + 1),
            lecons: (module.lecons || []).map((lecon) => ({
              id: lecon.id,
              titre: lecon.titre || '',
              videoUrl: lecon.video_url || '',
              videoDureeMin: 12,
              contenuTextuel: lecon.contenu || '',
              support: lecon.ressources && lecon.ressources[0]
                ? {
                    id: lecon.ressources[0].id,
                    nom: lecon.ressources[0].nom,
                    type: lecon.ressources[0].type === 'PDF' ? 'PDF' : 'DOCUMENT',
                    url: lecon.ressources[0].url,
                  }
                : null,
              exercices: (lecon.exercices || []).map((exercise) => ({
                id: exercise.id,
                question: exercise.enonce || '',
                optionA: 'Option A',
                optionB: 'Option B',
                optionC: 'Option C',
                optionD: 'Option D',
                correctOption: 'A',
                explication: exercise.correction || '',
              })),
            })),
          }))
        )
        setSelectedModuleIdIndex(0)
        setCurrentStep(1)
        setRestoredDraftAt(null)
      })
      .catch((err) => {
        showToast('error', err instanceof ApiError ? err.message : 'Impossible de charger la formation à modifier.', 'Erreur de chargement')
      })
      .finally(() => {
        if (!cancelled) setIsDraftHydrated(true)
      })

    return () => {
      cancelled = true
    }
  }, [id, isEditing, showToast])

  // Sauvegarde automatique et debouncée du brouillon — aucune action
  // manuelle requise, se déclenche à chaque modification significative.
  useEffect(() => {
    if (!isDraftHydrated || isEditing) return

    const hasContent = titre.trim().length > 0 || modules.length > 0
    if (!hasContent) {
      try {
        localStorage.removeItem(draftKey)
      } catch {
        // ignoré
      }
      return
    }

    const timer = setTimeout(() => {
      const draft: WizardDraft = {
        titre,
        description,
        objectifs,
        prerequis,
        niveau,
        dureeHeures,
        categorieId,
        departementId,
        modules,
        currentStep,
        savedAt: new Date().toISOString(),
      }
      try {
        localStorage.setItem(draftKey, JSON.stringify(draft))
      } catch {
        // Stockage plein/indisponible : l'assistant reste utilisable, seule
        // la reprise automatique après déconnexion est perdue.
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [
    isDraftHydrated,
    isEditing,
    draftKey,
    titre,
    description,
    objectifs,
    prerequis,
    niveau,
    dureeHeures,
    categorieId,
    departementId,
    modules,
    currentStep,
  ])

  function discardDraft() {
    try {
      localStorage.removeItem(draftKey)
    } catch {
      // ignoré
    }
    setTitre('')
    setDescription('')
    setObjectifs('')
    setPrerequis('')
    setNiveau('DEBUTANT')
    setDureeHeures('10')
    setModules([])
    setCurrentStep(1)
    setRestoredDraftAt(null)
    if (categories.length > 0) setCategorieId(categories[0].id)
    if (departements.length > 0) setDepartementId(departements[0].id)
  }

  // Chargement des données
  useEffect(() => {
    apiFetch<PaginatedResponse<Category> | Category[]>('/categories/')
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.results || [])
        setCategories(list)
        if (list.length > 0) setCategorieId((prev) => prev || list[0].id)
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Erreur chargement catégories.'))

    apiFetch<PaginatedResponse<Departement> | Departement[]>('/departements/')
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.results || [])
        setDepartements(list)
        if (list.length > 0) setDepartementId((prev) => prev || list[0].id)
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Erreur chargement départements.'))
  }, [])

  // VALIDATIONS MÉTHODIQUES POUR CHAQUE ÉTAPE
  const isStep1Valid =
    titre.trim().length >= 2 &&
    description.trim().length >= 2 &&
    Boolean(categorieId) &&
    Boolean(departementId)

  const isStep2Valid =
    modules.length >= 1 && modules.every((m) => m.titre.trim().length >= 3)

  const isStep3Valid =
    modules.length >= 1 &&
    modules.every((m) => {
      if (m.lecons.length === 0) return false
      return m.lecons.every((l) => {
        const hasVideo = l.videoUrl.trim().length > 0
        const hasContent = l.contenuTextuel.trim().length > 0
        const hasSupport = l.support && l.support.nom.trim().length > 0
        const hasExercice = l.exercices.length >= 1
        return hasVideo && hasContent && hasSupport && hasExercice
      })
    })

  // CALCUL DU TAUX DE COMPLÉTION GLOBAL
  let completionRate = 0
  if (isStep1Valid) completionRate += 25
  if (isStep2Valid) completionRate += 25
  if (isStep3Valid) completionRate += 50

  const canPublish = isStep1Valid && isStep2Valid && isStep3Valid

  // GESTION DES MODULES
  function handleAddModule(e: React.FormEvent) {
    e.preventDefault()
    if (!newModuleTitle.trim()) return

    const newMod: ModuleWizard = {
      id: `mod-${Date.now()}`,
      titre: newModuleTitle,
      description: newModuleDesc || 'Module de formation pratique.',
      ordre: modules.length + 1,
      lecons: [],
    }

    setModules([...modules, newMod])
    setNewModuleTitle('')
    setNewModuleDesc('')
    showToast('success', `Le module "${newMod.titre}" a été inséré dans le programme.`, 'Module ajouté')
  }

  function handleRemoveModule(modId: string) {
    const updated = modules.filter((m) => m.id !== modId)
    setModules(updated)
    if (selectedModuleIdIndex >= updated.length) {
      setSelectedModuleIdIndex(Math.max(0, updated.length - 1))
    }
  }

  // Envoie réellement le fichier au serveur (stockage disque réel) et
  // renvoie l'URL permanente qui en résulte — jamais un URL.createObjectURL,
  // qui ne serait valide que dans cet onglet précis et disparaîtrait au
  // moindre rechargement (c'est ce qui rendait vidéos/supports illisibles).
  async function uploadFichierLecon(file: File, endpoint: string): Promise<string> {
    const formData = new FormData()
    formData.append('fichier', file)
    const result = await apiFetch<{ video_url?: string; url?: string }>(endpoint, {
      method: 'POST',
      body: formData,
    })
    return result.video_url ?? result.url ?? ''
  }

  // GESTION DES LEÇONS
  async function handleAddLesson(e: React.FormEvent) {
    e.preventDefault()
    if (!newLessonTitle.trim()) return

    const currentMod = modules[selectedModuleIdIndex]
    if (!currentMod) return

    setIsUploadingLessonMedia(true)
    try {
      // Vidéo et support sont deux enrichissements optionnels — s'ils ne
      // sont pas fournis, la leçon reste valide sans eux plutôt que de
      // recevoir un contenu inventé (fausse vidéo YouTube, faux PDF...).
      let finalVideoUrl = ''
      if (videoSourceMode === 'FILE' && videoFile) {
        finalVideoUrl = await uploadFichierLecon(videoFile, '/lecons/videos/upload/')
      } else if (videoSourceMode === 'URL' && newLessonVideoUrl.trim()) {
        finalVideoUrl = newLessonVideoUrl.trim()
      }

      let finalSupport: SupportDocument | null = null
      if (docSourceMode === 'FILE' && docFile) {
        const url = await uploadFichierLecon(docFile, '/lecons/ressources/upload/')
        finalSupport = { id: `doc-${Date.now()}`, nom: docFile.name, type: 'PDF', url }
      } else if (docSourceMode === 'URL' && newLessonDocUrl.trim()) {
        finalSupport = {
          id: `doc-${Date.now()}`,
          nom: newLessonDocName.trim() || `${newLessonTitle.replace(/\s+/g, '_')}_Support.pdf`,
          type: 'PDF',
          url: newLessonDocUrl.trim(),
        }
      }

      const newLec: LeconWizard = {
        id: `lec-${Date.now()}`,
        titre: newLessonTitle,
        videoUrl: finalVideoUrl,
        videoDureeMin: Number(newLessonVideoDuree) || 10,
        contenuTextuel: newLessonContent,
        support: finalSupport,
        exercices: [],
      }

      const updatedModules = [...modules]
      updatedModules[selectedModuleIdIndex].lecons.push(newLec)
      setModules(updatedModules)

      setIsAddLessonOpen(false)
      setNewLessonTitle('')
      setNewLessonVideoUrl('')
      setNewLessonContent('')
      setNewLessonDocName('')
      setNewLessonDocUrl('')
      setVideoFile(null)
      setDocFile(null)
      showToast('success', `La leçon "${newLec.titre}" a été ajoutée au module.`, 'Leçon créée')
    } catch (err) {
      showToast(
        'error',
        err instanceof ApiError ? err.message : "Impossible d'importer le fichier.",
        "Échec de l'envoi",
      )
    } finally {
      setIsUploadingLessonMedia(false)
    }
  }

  function handleRemoveLesson(modIndex: number, lecId: string) {
    const updated = [...modules]
    updated[modIndex].lecons = updated[modIndex].lecons.filter((l) => l.id !== lecId)
    setModules(updated)
  }

  // GESTION DES QUIZ / EXERCICES
  function handleAddQuiz(e: React.FormEvent) {
    e.preventDefault()
    if (!quizQuestion.trim() || !targetLessonIdForQuiz) return

    const newQuiz: QuestionQuiz = {
      id: `q-${Date.now()}`,
      question: quizQuestion,
      optionA: quizOptA || 'Option A',
      optionB: quizOptB || 'Option B',
      optionC: quizOptC || 'Option C',
      optionD: quizOptD || 'Option D',
      correctOption: quizCorrect,
      explication: quizExplication || 'Explication détaillée de la réponse.',
    }

    const updated = [...modules]
    for (const mod of updated) {
      const lec = mod.lecons.find((l) => l.id === targetLessonIdForQuiz)
      if (lec) {
        lec.exercices.push(newQuiz)
        break
      }
    }

    setModules(updated)
    setIsAddQuizOpen(false)
    setQuizQuestion('')
    setQuizOptA('')
    setQuizOptB('')
    setQuizOptC('')
    setQuizOptD('')
    setQuizExplication('')
    showToast('success', 'L’exercice QCM a été attaché à la leçon avec succès.', 'Exercice ajouté')
  }

  // SOUMISSION FINALE DE LA FORMATION (PERSISTANCE COMPLETE PYTHON BACKEND)
  async function handleFinalSubmit(targetStatut: 'PUBLIEE' | 'BROUILLON' | 'SOUMISE') {
    if (targetStatut === 'PUBLIEE' && !canPublish) {
      showToast('error', 'Veuillez remplir 100% des étapes requises avant de publier la formation.', 'Validation requise')
      return
    }

    setIsSaving(true)

    const finalCatId = categorieId || (categories.length > 0 ? categories[0].id : '')
    const finalDepId = departementId || (departements.length > 0 ? departements[0].id : '')

    if (!finalCatId || !finalDepId) {
      showToast('error', 'Veuillez sélectionner une catégorie et un département valides.', 'Champs requis')
      setIsSaving(false)
      return
    }

    const payload = {
      titre,
      description,
      objectifs,
      prerequis,
      niveau,
      duree_heures: Number(dureeHeures),
      categorie: finalCatId,
      departement: finalDepId,
    }

    try {
      let formationId = id ?? ''

      if (isEditing && id) {
        await apiFetch<Formation>(`/formations/${id}/`, {
          method: 'PATCH',
          body: payload,
        })

        const existingModules = await apiFetch<Array<{ id: string }>>(`/formations/${id}/modules/`)
        for (const module of existingModules) {
          const lecons = await apiFetch<Array<{ id: string }>>(`/modules/${module.id}/lecons/`)
          for (const lecon of lecons) {
            await apiFetch(`/modules/${module.id}/lecons/${lecon.id}/`, { method: 'DELETE' })
          }
          await apiFetch(`/formations/${id}/modules/${module.id}/`, { method: 'DELETE' })
        }
      } else {
        const createdFormation = await apiFetch<Formation>('/formations/', {
          method: 'POST',
          body: payload,
        })
        formationId = createdFormation.id
      }

      for (const modItem of modules) {
        const createdModule = await apiFetch<{ id: string }>(`/formations/${formationId}/modules/`, {
          method: 'POST',
          body: {
            titre: modItem.titre,
            description: modItem.description,
            ordre: modItem.ordre,
          },
        })

        for (const lecItem of modItem.lecons) {
          const createdLecon = await apiFetch<{ id: string }>(`/modules/${createdModule.id}/lecons/`, {
            method: 'POST',
            body: {
              titre: lecItem.titre,
              contenu: lecItem.contenuTextuel,
              video_url: lecItem.videoUrl,
              ordre: 1,
            },
          })

          if (lecItem.support && lecItem.support.url) {
            await apiFetch(`/lecons/${createdLecon.id}/ressources/`, {
              method: 'POST',
              body: {
                nom: lecItem.support.nom,
                type: lecItem.support.type,
                url: lecItem.support.url,
              },
            })
          }

          for (const qItem of lecItem.exercices) {
            await apiFetch(`/lecons/${createdLecon.id}/exercices/`, {
              method: 'POST',
              body: {
                enonce: qItem.question,
                correction: `Option correcte: ${qItem.correctOption}. ${qItem.explication}`,
              },
            })
          }
        }
      }

      if (targetStatut === 'PUBLIEE') {
        if (user?.role === 'ADMIN') {
          await apiFetch(`/formations/${formationId}/publish/`, { method: 'POST' })
        } else {
          await apiFetch(`/formations/${formationId}/submit/`, { method: 'POST' })
        }
      } else if (targetStatut === 'SOUMISE') {
        await apiFetch(`/formations/${formationId}/submit/`, { method: 'POST' })
      }

      const successMsg = isEditing
        ? targetStatut === 'PUBLIEE'
          ? user?.role === 'ADMIN'
            ? `La formation "${titre}" a été mise à jour et publiée avec succès !`
            : `La formation "${titre}" a été mise à jour et soumise à l'Administrateur pour validation !`
          : `La formation "${titre}" a été mise à jour avec succès.`
        : targetStatut === 'PUBLIEE'
          ? user?.role === 'ADMIN'
            ? `La formation "${titre}" a été créée et publiée avec succès !`
            : `La formation "${titre}" a été enregistrée et soumise à l'Administrateur pour validation !`
          : `La formation "${titre}" a été enregistrée en brouillon.`

      showToast('success', successMsg, 'Succès Pédagogique')

      try {
        localStorage.removeItem(draftKey)
      } catch {
        // ignoré
      }

      if (user?.role === 'ADMIN') {
        navigate('/admin/formations')
      } else {
        navigate('/formateur/mes-formations')
      }
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Erreur lors de la persistance backend Python.', 'Erreur API Backend')
    } finally {
      setIsSaving(false)
    }
  }

  if (loadError) return <Alert variant="error" message={loadError} />

  const currentMod = modules[selectedModuleIdIndex]

  return (
    <div className="space-y-8">
      {/* BANNIÈRE DE L'ASSISTANT PAS-À-PAS */}
      <div className="relative overflow-hidden rounded-3xl border border-sky-200/50 bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 p-6 text-white shadow-xl shadow-sky-500/10 sm:p-8 dark:border-sky-500/20">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-sky-100 backdrop-blur-md">
              <Sparkles size={14} className="text-amber-300" />
              <span>Conception & Publication Méthodique de Formation</span>
            </div>

            <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Assistant de Création de Cours
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-sky-100/90 sm:text-sm">
              Suivez les 4 étapes dépendantes pour concevoir vos modules, leçons, vidéos, supports numériques et exercices interactifs.
            </p>
          </div>

          {/* JAUGE DYNAMIQUE DE COMPLÉTION DE LA FORMATION */}
          <div className="shrink-0 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md text-right">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-200">Taux de Complétion</span>
            <div className="flex items-center gap-3 mt-1">
              <div className="h-3 w-36 overflow-hidden rounded-full bg-slate-800/80 p-0.5 border border-white/20">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 via-indigo-400 to-emerald-400 transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <span className="text-lg font-black text-white">{completionRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* BANNIÈRE DE REPRISE DE BROUILLON AUTOMATIQUE */}
      {restoredDraftAt && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <span>
            Brouillon restauré automatiquement (dernière sauvegarde le{' '}
            {new Date(restoredDraftAt).toLocaleString('fr-FR')}) — vous reprenez exactement là où vous vous étiez arrêté.
          </span>
          <button
            type="button"
            onClick={discardDraft}
            className="shrink-0 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-[11px] font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-transparent dark:text-amber-300 dark:hover:bg-amber-500/10"
          >
            Ignorer et repartir de zéro
          </button>
        </div>
      )}

      {/* BARRE D'ÉTAPES SÉQUENTIELLES (STEPPER) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { num: 1, title: '1. Informations General', valid: isStep1Valid, desc: 'Titre, niveau, durée' },
          { num: 2, title: '2. Modules & Programme', valid: isStep2Valid, desc: `${modules.length} module(s)` },
          { num: 3, title: '3. Leçons & Exercices', valid: isStep3Valid, desc: 'Vidéos, PDFs & Quiz' },
          { num: 4, title: '4. Bilan & Publication', valid: canPublish, desc: 'Vérification finale' },
        ].map((st) => {
          const isActive = currentStep === st.num
          return (
            <button
              key={st.num}
              onClick={() => setCurrentStep(st.num as any)}
              className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${isActive
                  ? 'border-sky-500 bg-sky-50/80 shadow-md ring-2 ring-sky-500/20 dark:bg-sky-950/40'
                  : st.valid
                    ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-black ${isActive
                      ? 'bg-sky-600 text-white'
                      : st.valid
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                >
                  {st.valid && !isActive ? <Check size={14} /> : st.num}
                </span>

                {st.valid ? (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Valide</span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-400">Incomplet</span>
                )}
              </div>

              <div className="mt-3">
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">{st.title}</h3>
                <p className="text-[10px] font-medium text-slate-400 mt-0.5">{st.desc}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* CONTENU DE L'ÉTAPE ACTIVES */}

      {/* ========================================================================= */}
      {/* ÉTAPE 1 : INFORMATIONS GÉNÉRALES DE LA FORMATION */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BookOpen size={20} className="text-sky-500" />
              Étape 1 : Présentation Générale de la Formation
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Renseignez le titre, la catégorie, la durée estimée et la description synthétique de la formation.
            </p>
          </div>

          {!isStep1Valid && (
            <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
              <AlertCircle size={16} className="text-amber-600 shrink-0" />
              <span>Veuillez compléter au moins le <strong>Titre</strong> et la <strong>Description</strong> pour débloquer l'Étape 2.</span>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            {/* TITRE */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Titre de la Formation <span className="text-rose-500 font-extrabold ml-0.5">* Obligatoire</span>
              </label>
              <input
                type="text"
                required
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                placeholder="ex: Masterclass Intelligence Artificielle & Generative AI 2026..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs font-semibold text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            {/* CATÉGORIE */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Catégorie Pédagogique <span className="text-rose-500 font-extrabold ml-0.5">* Obligatoire</span>
              </label>
              <select
                value={categorieId}
                onChange={(e) => setCategorieId(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs font-semibold text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </div>

            {/* DÉPARTEMENT */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Département d'Enseignement <span className="text-rose-500 font-extrabold ml-0.5">* Obligatoire</span>
              </label>
              <select
                value={departementId}
                onChange={(e) => setDepartementId(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs font-semibold text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
              >
                {departements.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nom}
                  </option>
                ))}
              </select>
            </div>

            {/* NIVEAU */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Niveau Requis <span className="text-rose-500 font-extrabold ml-0.5">* Obligatoire</span>
              </label>
              <select
                value={niveau}
                onChange={(e) => setNiveau(e.target.value as Niveau)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs font-semibold text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="DEBUTANT">Débutant (Aucun prérequis)</option>
                <option value="INTERMEDIAIRE">Intermédiaire</option>
                <option value="AVANCE">Avancé / Expert</option>
              </select>
            </div>

            {/* DURÉE */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Durée estimée (en heures) <span className="text-rose-500 font-extrabold ml-0.5">* Obligatoire</span>
              </label>
              <input
                type="number"
                min={1}
                value={dureeHeures}
                onChange={(e) => setDureeHeures(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs font-semibold text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            {/* DESCRIPTION */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Description synthétique de la formation <span className="text-rose-500 font-extrabold ml-0.5">* Obligatoire</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Présentez le programme global et les compétences clés qui seront acquises..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs font-semibold text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            {/* OBJECTIFS */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Objectifs Pédagogiques
              </label>
              <textarea
                rows={2}
                value={objectifs}
                onChange={(e) => setObjectifs(e.target.value)}
                placeholder="ex: Maîtriser les réseaux de neurones et créer des pipelines..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            {/* PRÉREQUIS */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Prérequis d'admission
              </label>
              <textarea
                rows={2}
                value={prerequis}
                onChange={(e) => setPrerequis(e.target.value)}
                placeholder="ex: Notions basiques de programmation Python..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => {
                if (!isStep1Valid) {
                  showToast('error', 'Veuillez saisir le Titre et la Description pour passer à l’étape suivante.', 'Information incomplète')
                  return
                }
                setCurrentStep(2)
              }}
              disabled={!isStep1Valid}
              className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-6 py-3 text-xs font-extrabold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-700 disabled:opacity-40 transition-all"
            >
              <span>Passer à l'Étape 2 : Modules</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ÉTAPE 2 : ARBORESCENCE & CRÉATION DES MODULES */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers size={20} className="text-sky-500" />
              Étape 2 : Programme & Arborescence des Modules ({modules.length})
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Une formation est constituée de plusieurs modules ordonnés. Ajoutez vos modules ci-dessous.
            </p>
          </div>

          {/* FORMULAIRE D'AJOUT RAPIDE DE MODULE */}
          <form onSubmit={handleAddModule} className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4 space-y-3 dark:border-sky-900/50 dark:bg-sky-950/20">
            <h3 className="text-xs font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
              <Plus size={16} />
              Ajouter un nouveau module au programme
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                required
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                placeholder="Intitulé du module (ex: Module 2 - Algorithmes & QCM)..."
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
              />

              <input
                type="text"
                value={newModuleDesc}
                onChange={(e) => setNewModuleDesc(e.target.value)}
                placeholder="Description courte du module..."
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-sky-700 active:scale-95"
              >
                <Plus size={14} />
                <span>Insérer ce module</span>
              </button>
            </div>
          </form>

          {/* LISTE DES MODULES ENREGISTRÉS */}
          <div className="space-y-3">
            {modules.map((mod, idx) => (
              <div
                key={mod.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50 p-4 transition-all dark:border-slate-800 dark:bg-slate-800/50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-600 text-xs font-extrabold text-white shadow-md shadow-sky-500/20">
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{mod.titre}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">{mod.description}</p>
                    <span className="inline-block mt-1 text-[10px] font-bold text-sky-600 dark:text-sky-400">
                      {mod.lecons.length} leçon(s) configurée(s)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRemoveModule(mod.id)}
                    className="rounded-xl p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="Supprimer le module"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300"
            >
              <ChevronLeft size={16} />
              <span>Précédent</span>
            </button>

            <button
              onClick={() => setCurrentStep(3)}
              disabled={!isStep2Valid}
              className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-6 py-3 text-xs font-extrabold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-700 disabled:opacity-40 transition-all"
            >
              <span>Passer à l'Étape 3 : Leçons & Exercices</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ÉTAPE 3 : CONCEPTION DES LEÇONS (VIDÉO + DÉTAILS + SUPPORT + EXERCICE) */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="space-y-6">
          {modules.length === 0 ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-8 text-center dark:border-amber-900/40 dark:bg-amber-950/30 space-y-3">
              <Layers size={36} className="mx-auto text-amber-600" />
              <h3 className="text-sm font-extrabold text-amber-900 dark:text-amber-200">Aucun module disponible</h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 max-w-md mx-auto">
                Vous n'avez pas encore créé de module pour cette formation. Veuillez d'abord créer au moins un module à l'Étape 2.
              </p>
              <button
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-sky-700"
              >
                <ChevronLeft size={16} />
                <span>Retourner à l'Étape 2 : Ajouter des modules</span>
              </button>
            </div>
          ) : (
            <>
              {/* SÉLECTEUR DE MODULES SOUS FORME D'ONGLETS */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {modules.map((mod, idx) => (
                  <button
                    key={mod.id}
                    onClick={() => setSelectedModuleIdIndex(idx)}
                    className={`rounded-2xl px-4 py-3 text-xs font-extrabold transition-all shrink-0 ${(selectedModuleIdIndex === idx || (selectedModuleIdIndex >= modules.length && idx === 0))
                        ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/20'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                      }`}
                  >
                    Module {idx + 1} : {mod.titre}
                  </button>
                ))}
              </div>

              {currentMod && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        Leçons du {currentMod.titre} ({currentMod.lecons.length})
                      </h3>
                      <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                        Chaque leçon doit impérativement comporter une Vidéo, du Contenu textuel, un Support PDF et un Exercice QCM.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsAddLessonOpen(true)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-sky-700 active:scale-95 shrink-0"
                    >
                      <Plus size={16} />
                      <span>Ajouter une leçon</span>
                    </button>
                  </div>

                  {/* LISTE DES LEÇONS DU MODULE ACTIF */}
                  {currentMod.lecons.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-800 space-y-2">
                      <FileText size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Aucune leçon dans ce module pour le moment.
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Cliquez sur "Ajouter une leçon" ci-dessus pour insérer une vidéo, un support et un exercice.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {currentMod.lecons.map((lec) => (
                        <div
                          key={lec.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-800/40 space-y-4 hover:border-sky-200 transition-all"
                        >
                          <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 dark:border-slate-700/60">
                            <div className="flex items-center gap-3">
                              <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">{lec.titre}</h4>
                              <button
                                onClick={() => setSelectedLessonToView(lec)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-100 px-3 py-1 text-[10px] font-extrabold text-sky-700 hover:bg-sky-200 dark:bg-sky-950/60 dark:text-sky-300 transition-all"
                              >
                                <Eye size={13} />
                                <span>Consulter la leçon</span>
                              </button>
                            </div>

                            <button
                              onClick={() => handleRemoveLesson(selectedModuleIdIndex, lec.id)}
                              className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/40"
                              title="Supprimer la leçon"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {/* LES 4 VOLETS EXIGÉS POUR LA LEÇON */}
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {/* 1. VIDÉO */}
                            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                              <div className="flex items-center gap-2 font-bold text-xs text-sky-600 dark:text-sky-400 mb-1">
                                <Video size={14} />
                                <span>1. Vidéo de cours</span>
                              </div>
                              <p className="text-[10px] font-mono text-slate-600 dark:text-slate-300 truncate">
                                {lec.videoUrl || 'Aucune vidéo'}
                              </p>
                              <span className="block mt-1 text-[9px] font-semibold text-slate-400">
                                Durée : {lec.videoDureeMin} min
                              </span>
                            </div>

                            {/* 2. DÉTAILS / CONTENU */}
                            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                              <div className="flex items-center gap-2 font-bold text-xs text-indigo-600 dark:text-indigo-400 mb-1">
                                <FileText size={14} />
                                <span>2. Détails / Texte</span>
                              </div>
                              <p className="text-[10px] text-slate-600 dark:text-slate-300 line-clamp-2">
                                {lec.contenuTextuel}
                              </p>
                            </div>

                            {/* 3. SUPPORT NUMÉRIQUE */}
                            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                              <div className="flex items-center gap-2 font-bold text-xs text-emerald-600 dark:text-emerald-400 mb-1">
                                <BookOpen size={14} />
                                <span>3. Support PDF</span>
                              </div>
                              <p className="text-[10px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {lec.support ? lec.support.nom : 'Aucun document'}
                              </p>
                            </div>

                            {/* 4. EXERCICE / QCM */}
                            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center gap-2 font-bold text-xs text-amber-600 dark:text-amber-400 mb-1">
                                  <HelpCircle size={14} />
                                  <span>4. Exercices ({lec.exercices.length})</span>
                                </div>
                                {lec.exercices.length > 0 ? (
                                  <p className="text-[10px] text-slate-600 dark:text-slate-300 line-clamp-1">
                                    Q: {lec.exercices[0].question}
                                  </p>
                                ) : (
                                  <p className="text-[10px] font-semibold text-rose-500">❌ Aucun exercice configuré</p>
                                )}
                              </div>

                              <button
                                onClick={() => {
                                  setTargetLessonIdForQuiz(lec.id)
                                  setIsAddQuizOpen(true)
                                }}
                                className="mt-2 w-full rounded-lg bg-amber-50 py-1 text-[10px] font-bold text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
                              >
                                + Ajouter exercice QCM
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300"
                    >
                      <ChevronLeft size={16} />
                      <span>Précédent</span>
                    </button>

                    <button
                      onClick={() => setCurrentStep(4)}
                      disabled={!isStep3Valid}
                      className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-6 py-3 text-xs font-extrabold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-700 disabled:opacity-40 transition-all"
                    >
                      <span>Passer à l'Étape 4 : Récapitulatif & Publication</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ÉTAPE 4 : BILAN GLOBAL, CONTRÔLE QUALITÉ & PUBLICATION */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck size={20} className="text-emerald-500" />
              {user?.role === 'ADMIN'
                ? 'Étape 4 : Récapitulatif Pédagogique & Publication Finale'
                : 'Étape 4 : Récapitulatif Pédagogique & Soumission pour Validation'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {user?.role === 'ADMIN'
                ? 'Vérifiez la structure de la formation avant sa mise en ligne publique.'
                : 'Vérifiez la structure de votre formation avant de la soumettre à l\'administrateur.'}
            </p>
          </div>

          {/* CONTRÔLE QUALITÉ */}
          {!canPublish ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <div className="flex items-center gap-2 font-extrabold text-xs text-amber-800 dark:text-amber-300">
                <AlertCircle size={18} />
                <span>Conditions de Validation Non Remplies (Taux actuel : {completionRate}%)</span>
              </div>
              <ul className="mt-2 space-y-1 text-xs list-disc list-inside font-medium">
                {!isStep1Valid && <li>Informations générales incomplètes à l'étape 1.</li>}
                {!isStep2Valid && <li>Au moins 1 module obligatoire à l'étape 2.</li>}
                {!isStep3Valid && <li>Chaque module doit avoir au moins 1 leçon complète avec Vidéo, Texte, Support PDF et Exercice.</li>}
              </ul>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200 flex items-center gap-3">
              <CheckCircle2 size={24} className="text-emerald-500 shrink-0" />
              <div>
                <p className="text-xs font-extrabold">100% des conditions de validation sont remplies !</p>
                <p className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 mt-0.5">
                  {user?.role === 'ADMIN'
                    ? 'La formation contient tous ses modules, leçons, vidéos, supports numériques et exercices et peut être publiée.'
                    : 'Votre cours est complet et prêt à être transmis à l\'administrateur pour contrôle et publication.'}
                </p>
              </div>
            </div>
          )}

          {/* ARBORESCENCE COMPLÈTE DE LA FORMATION */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/40 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  Vue d'ensemble du cours
                </span>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">{titre || 'Titre de la formation'}</h3>
              </div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                Niveau {NIVEAU_LABELS[niveau]} • {dureeHeures} h
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {description || 'Aucune description saisie.'}
            </p>

            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Structure du programme ({modules.length} modules) :
              </h4>

              {modules.map((m, idx) => (
                <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <h5 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                    Module {idx + 1} : {m.titre}
                  </h5>

                  <div className="mt-2 space-y-1.5 pl-4 border-l-2 border-sky-400">
                    {m.lecons.map((l) => (
                      <div key={l.id} className="flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-300">
                        <span>• {l.titre}</span>
                        <div className="flex items-center gap-2 text-[10px] font-bold">
                          <span className="text-sky-600">Vidéo</span>
                          <span className="text-emerald-600">PDF</span>
                          <span className="text-amber-600">{l.exercices.length} Quiz</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ACTIONS D'ENREGISTREMENT & PUBLICATION */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300"
            >
              <ChevronLeft size={16} />
              <span>Précédent</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleFinalSubmit('BROUILLON')}
                disabled={isSaving}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
              >
                Enregistrer comme Brouillon
              </button>

              <button
                onClick={() => handleFinalSubmit(user?.role === 'ADMIN' ? 'PUBLIEE' : 'SOUMISE')}
                disabled={!canPublish || isSaving}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-xs font-extrabold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-700 hover:to-teal-700 active:scale-95 disabled:opacity-40 transition-all"
              >
                <Rocket size={16} />
                <span>
                  {user?.role === 'ADMIN' ? 'Publier la Formation' : 'Soumettre à l\'Administrateur'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE D'AJOUT DE LEÇON (AVEC SES 4 VOLETS) */}
      {/* ========================================================================= */}
      {isAddLessonOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
          <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                Créer une nouvelle leçon avec tous ses supports
              </h3>
              <button onClick={() => setIsAddLessonOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddLesson} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Titre de la leçon *
                </label>
                <input
                  type="text"
                  required
                  value={newLessonTitle}
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                  placeholder="ex: Leçon 2.1 - Algorithmes et Réseaux de Neurones..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* VOLET 1 : VIDÉO */}
              <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 space-y-3 dark:border-sky-900/40 dark:bg-sky-950/20">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
                    <Video size={15} /> 1. Vidéo de cours
                  </h4>
                  <div className="flex items-center gap-1 rounded-xl bg-white/80 p-1 text-[10px] font-bold border border-sky-100 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => setVideoSourceMode('FILE')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${videoSourceMode === 'FILE' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-500'}`}
                    >
                      Fichier Vidéo
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoSourceMode('URL')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${videoSourceMode === 'URL' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-500'}`}
                    >
                      🔗 Lien Web
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    {videoSourceMode === 'FILE' ? (
                      <div>
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setVideoFile(e.target.files[0])
                            }
                          }}
                          className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-sky-600 file:text-white hover:file:bg-sky-700 cursor-pointer"
                        />
                        {videoFile && (
                          <span className="text-[10px] font-bold text-emerald-600 mt-1 block truncate">
                            ✓ {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)
                          </span>
                        )}
                      </div>
                    ) : (
                      <input
                        type="url"
                        value={newLessonVideoUrl}
                        onChange={(e) => setNewLessonVideoUrl(e.target.value)}
                        placeholder="URL vidéo (ex: https://youtube.com/...)..."
                        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                      />
                    )}
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={newLessonVideoDuree}
                    onChange={(e) => setNewLessonVideoDuree(Number(e.target.value))}
                    placeholder="Durée (min)"
                    className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* VOLET 2 : DÉTAILS / TEXTE */}
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-2 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                  <FileText size={15} /> 2. Détails & Contenu du cours
                </h4>
                <textarea
                  rows={3}
                  required
                  value={newLessonContent}
                  onChange={(e) => setNewLessonContent(e.target.value)}
                  placeholder="Texte théorique, synthèse et explications du cours..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* VOLET 3 : SUPPORT NUMÉRIQUE */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <BookOpen size={15} /> 3. Support numérique (PDF / Document)
                  </h4>
                  <div className="flex items-center gap-1 rounded-xl bg-white/80 p-1 text-[10px] font-bold border border-emerald-100 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => setDocSourceMode('FILE')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${docSourceMode === 'FILE' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500'}`}
                    >
                      Importer Document
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocSourceMode('URL')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${docSourceMode === 'URL' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500'}`}
                    >
                      🔗 Lien PDF
                    </button>
                  </div>
                </div>

                {docSourceMode === 'FILE' ? (
                  <div>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setDocFile(e.target.files[0])
                          setNewLessonDocName(e.target.files[0].name)
                        }
                      }}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                    />
                    {docFile && (
                      <span className="text-[10px] font-bold text-emerald-600 mt-1 block truncate">
                        ✓ Support sélectionné : {docFile.name}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newLessonDocName}
                      onChange={(e) => setNewLessonDocName(e.target.value)}
                      placeholder="Nom du document (ex: Guide_Module2.pdf)..."
                      className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <input
                      type="url"
                      value={newLessonDocUrl}
                      onChange={(e) => setNewLessonDocUrl(e.target.value)}
                      placeholder="URL du PDF..."
                      className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddLessonOpen(false)}
                  disabled={isUploadingLessonMedia}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isUploadingLessonMedia}
                  className="rounded-2xl bg-sky-600 px-5 py-2 text-xs font-extrabold text-white hover:bg-sky-700 shadow-md disabled:opacity-50"
                >
                  {isUploadingLessonMedia ? 'Envoi des fichiers...' : 'Enregistrer la leçon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE D'AJOUT DE QUIZ / EXERCICE */}
      {/* ========================================================================= */}
      {isAddQuizOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
          <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                Ajouter un exercice QCM à la leçon
              </h3>
              <button onClick={() => setIsAddQuizOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddQuiz} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Question de l'exercice *
                </label>
                <input
                  type="text"
                  required
                  value={quizQuestion}
                  onChange={(e) => setQuizQuestion(e.target.value)}
                  placeholder="ex: Quelle est la différence entre apprentissage supervisé et non supervisé ?"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={quizOptA}
                  onChange={(e) => setQuizOptA(e.target.value)}
                  placeholder="Option A"
                  className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs dark:bg-slate-800"
                />
                <input
                  type="text"
                  required
                  value={quizOptB}
                  onChange={(e) => setQuizOptB(e.target.value)}
                  placeholder="Option B"
                  className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs dark:bg-slate-800"
                />
                <input
                  type="text"
                  required
                  value={quizOptC}
                  onChange={(e) => setQuizOptC(e.target.value)}
                  placeholder="Option C"
                  className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs dark:bg-slate-800"
                />
                <input
                  type="text"
                  required
                  value={quizOptD}
                  onChange={(e) => setQuizOptD(e.target.value)}
                  placeholder="Option D"
                  className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bonne réponse *
                  </label>
                  <select
                    value={quizCorrect}
                    onChange={(e) => setQuizCorrect(e.target.value as any)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-900 dark:bg-slate-800"
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Explication de la réponse
                  </label>
                  <input
                    type="text"
                    value={quizExplication}
                    onChange={(e) => setQuizExplication(e.target.value)}
                    placeholder="Justification pédagogique..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-900 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddQuizOpen(false)}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-amber-600 px-5 py-2 text-xs font-extrabold text-white hover:bg-amber-700 shadow-md"
                >
                  Enregistrer l'exercice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE DE PRÉVISUALISATION & CONSULTATION DE LEÇON */}
      {/* ========================================================================= */}
      {selectedLessonToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-extrabold tracking-wider text-sky-600 uppercase">Consultation Pédagogique</span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  {selectedLessonToView.titre}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLessonToView(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* VOLET 1 : VIDÉO DE COURS */}
              <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 space-y-2 dark:border-sky-900/40 dark:bg-sky-950/20">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
                    <Video size={16} /> 1. Support Vidéo ({selectedLessonToView.videoDureeMin} min)
                  </h4>
                  <span className="text-[10px] font-mono text-slate-500 truncate max-w-[220px]">
                    {selectedLessonToView.videoUrl || 'Aucune vidéo'}
                  </span>
                </div>
                {!selectedLessonToView.videoUrl ? (
                  <p className="rounded-xl bg-slate-100 p-4 text-center text-xs text-slate-400 dark:bg-slate-800">
                    Aucune vidéo n'a été ajoutée à cette leçon.
                  </p>
                ) : /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(selectedLessonToView.videoUrl) ? (
                  <video src={selectedLessonToView.videoUrl} controls className="w-full rounded-xl max-h-56 bg-black" />
                ) : (
                  <div className="rounded-xl bg-slate-900 p-4 text-center text-xs text-sky-300 font-mono overflow-x-auto">
                    <a href={selectedLessonToView.videoUrl} target="_blank" rel="noreferrer" className="underline hover:text-sky-200">
                      ▶ Voir / Ouvrir la vidéo : {selectedLessonToView.videoUrl}
                    </a>
                  </div>
                )}
              </div>

              {/* VOLET 2 : CONTENU TEXTUEL DE LA LEÇON */}
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-2 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                  <FileText size={16} /> 2. Détails & Contenu Théorique du Cours
                </h4>
                <div className="rounded-xl bg-white p-3.5 text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                  {selectedLessonToView.contenuTextuel}
                </div>
              </div>

              {/* VOLET 3 : SUPPORT PDF / DOCUMENT */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <BookOpen size={16} /> 3. Document de Support Pédagogique
                </h4>
                {selectedLessonToView.support ? (
                  <div className="flex items-center justify-between rounded-xl bg-white p-3 dark:bg-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xl"></span>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {selectedLessonToView.support.nom}
                        </p>
                        <p className="text-[10px] text-slate-400">Format PDF / Fiche de révision</p>
                      </div>
                    </div>
                    <a
                      href={selectedLessonToView.support.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
                    >
                      Télécharger
                    </a>
                  </div>
                ) : (
                  <p className="rounded-xl bg-slate-100 p-3 text-center text-xs text-slate-400 dark:bg-slate-800">
                    Aucun document n'a été ajouté à cette leçon.
                  </p>
                )}
              </div>

              {/* VOLET 4 : EXERCICE & QUESTIONS QCM */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <HelpCircle size={16} /> 4. Exercices QCM ({selectedLessonToView.exercices.length})
                </h4>

                {selectedLessonToView.exercices.length === 0 ? (
                  <p className="text-xs text-rose-600 font-semibold">Aucun exercice n'a encore été rattaché à cette leçon.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedLessonToView.exercices.map((ex, i) => (
                      <div key={ex.id || i} className="rounded-xl bg-white p-3.5 space-y-2 dark:bg-slate-800 border border-amber-100 dark:border-amber-900/30">
                        <p className="text-xs font-black text-slate-900 dark:text-slate-100">
                          Q{i + 1}. {ex.question}
                        </p>
                        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                          <span className={`p-2 rounded-lg ${ex.correctOption === 'A' ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300' : 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>
                            A) {ex.optionA} {ex.correctOption === 'A' && '✓'}
                          </span>
                          <span className={`p-2 rounded-lg ${ex.correctOption === 'B' ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300' : 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>
                            B) {ex.optionB} {ex.correctOption === 'B' && '✓'}
                          </span>
                          <span className={`p-2 rounded-lg ${ex.correctOption === 'C' ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300' : 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>
                            C) {ex.optionC} {ex.correctOption === 'C' && '✓'}
                          </span>
                          <span className={`p-2 rounded-lg ${ex.correctOption === 'D' ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300' : 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>
                            D) {ex.optionD} {ex.correctOption === 'D' && '✓'}
                          </span>
                        </div>
                        {ex.explication && (
                          <p className="text-[10px] italic text-slate-500 bg-slate-50 p-2 rounded-lg dark:bg-slate-900">
                            Explication : {ex.explication}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 p-4 dark:border-slate-800">
              <button
                onClick={() => setSelectedLessonToView(null)}
                className="rounded-2xl bg-sky-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-sky-700"
              >
                Fermer l'aperçu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
