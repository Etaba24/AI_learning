export type Role = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN'

export const ROLE_LABELS: Record<Role, string> = {
  STUDENT: 'Apprenant',
  INSTRUCTOR: 'Formateur',
  ADMIN: 'Administrateur',
}

export interface User {
  id: string // UUID, pas un entier auto-incrémenté (sécurité : non énumérable)
  email: string
  first_name: string
  last_name: string
  role: Role
  is_active: boolean
  departement: string | null
  departement_nom: string | null
  bio: string
  avatar_url: string
  date_joined: string
}

export interface Departement {
  id: string
  nom: string
  description: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type Niveau = 'DEBUTANT' | 'INTERMEDIAIRE' | 'AVANCE'

export const NIVEAU_LABELS: Record<Niveau, string> = {
  DEBUTANT: 'Débutant',
  INTERMEDIAIRE: 'Intermédiaire',
  AVANCE: 'Avancé',
}

export type FormationStatut = 'BROUILLON' | 'SOUMISE' | 'VALIDEE' | 'REFUSEE' | 'PUBLIEE' | 'DEPUBLIEE'

export const STATUT_LABELS: Record<FormationStatut, string> = {
  BROUILLON: 'Brouillon',
  SOUMISE: 'Soumise',
  VALIDEE: 'Validée',
  REFUSEE: 'Refusée',
  PUBLIEE: 'Publiée',
  DEPUBLIEE: 'Dépubliée',
}

export const STATUT_BADGE_STYLES: Record<FormationStatut, string> = {
  BROUILLON: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300',
  SOUMISE: 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400',
  VALIDEE: 'bg-sky-50 text-sky-800 dark:bg-sky-500/10 dark:text-sky-400',
  REFUSEE: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  PUBLIEE: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400',
  DEPUBLIEE: 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400',
}

export interface Category {
  id: string
  nom: string
  description: string
}

export interface Formation {
  id: string
  titre: string
  description: string
  objectifs: string
  prerequis: string
  niveau: Niveau
  duree_heures: number
  categorie: string
  categorie_nom: string
  departement: string
  departement_nom: string
  auteur?: string
  auteur_email: string
  statut: FormationStatut
  motif_refus: string
  created_at: string
}

// Catalogue public (apprenant) — jamais de statut/auteur, uniquement des
// formations déjà publiées (le backend ne renvoie que celles-là).
export interface PublicFormation {
  id: string
  titre: string
  description: string
  niveau: Niveau
  duree_heures: number
  categorie: string
  categorie_nom: string
}

export interface Ressource {
  id: string
  nom: string
  type: string
  url: string
}

export interface Exercice {
  id: string
  enonce: string
  correction: string
}

export interface PublicLecon {
  id: string
  titre: string
  contenu?: string
  video_url?: string
  ordre: number
  ressources?: Ressource[]
  exercices?: Exercice[]
}

export interface PublicModule {
  id: string
  titre: string
  description: string
  ordre: number
  lecons: PublicLecon[]
}

export interface PublicFormationDetail extends PublicFormation {
  objectifs: string
  prerequis: string
  modules: PublicModule[]
}

export interface Inscription {
  id: string
  formation: string
  formation_titre: string
  formation_niveau: Niveau
  statut: 'EN_COURS' | 'TERMINEE' | 'ABANDONNEE'
  progress_percent: number
  created_at: string
}

// Assistant IA pédagogique (section 8 du cahier des charges)
export interface ConversationIA {
  id: string
  lecon: string
  question: string
  reponse: string
  created_at: string
}
