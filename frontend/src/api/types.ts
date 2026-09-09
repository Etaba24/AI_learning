export type Role = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN' | 'ETABLISSEMENT_ADMIN'

export const ROLE_LABELS: Record<Role, string> = {
  STUDENT: 'Apprenant',
  INSTRUCTOR: 'Formateur',
  ADMIN: 'Administrateur',
  ETABLISSEMENT_ADMIN: 'Administrateur établissement',
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

export interface AuditLogEntry {
  id: string
  utilisateur: string | null
  utilisateur_email: string | null
  action: string
  detail: string
  created_at: string
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

// PAGE_SIZE de rest_framework.pagination.PageNumberPagination côté serveur
// (config/settings.py) — utilisé par le composant Pagination pour calculer
// le nombre total de pages sans dépendre de son inférence côté client.
export const DEFAULT_PAGE_SIZE = 7

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
  // Présent sur la liste/détail admin (FormationSerializer) — permet à
  // l'admin de consulter le contenu réel avant de valider/publier, pas
  // seulement les métadonnées.
  modules?: PublicModule[]
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

// Abonnements (B2C individuel + B2B établissement)
export interface MonAbonnement {
  actif: boolean
  via: 'personnel' | 'etablissement' | null
  plan: string | null
  date_fin: string | null
  // Actionnable (rétrogradation) uniquement quand c'est un abonnement
  // personnel — jamais celui d'un établissement.
  abonnement_id: string | null
}

export type TypePlan = 'INDIVIDUEL' | 'ETABLISSEMENT'

export interface PlanAbonnement {
  id: string
  nom: string
  type: TypePlan
  prix_mensuel: string
  description: string
  avantages: string[]
  duree_mois: number
  max_membres: number | null
  actif: boolean
}

export interface Etablissement {
  id: string
  nom: string
  code_invitation: string
  actif: boolean
  nombre_membres: number
  abonnement_actif: { plan_nom: string; date_fin: string } | null
  created_at: string
}

export type StatutAbonnement = 'ACTIF' | 'EXPIRE' | 'ANNULE'

export interface Abonnement {
  id: string
  user: string | null
  user_email: string | null
  etablissement: string | null
  etablissement_nom: string | null
  plan: string
  plan_nom: string
  date_debut: string
  date_fin: string
  statut: StatutAbonnement
  est_actif: boolean
  created_at: string
}

// Vue combinée compte + statut d'abonnement, pour le tableau admin
// "qui est Free / qui est Premium" (remplace la gestion des formules).
export interface ApprenantAbonnement {
  id: string
  email: string
  first_name: string
  last_name: string
  etablissement_nom: string | null
  actif: boolean
  via: 'personnel' | 'etablissement' | null
  plan_nom: string | null
  date_fin: string | null
  // Non-null seulement si l'abonnement actif est personnel (annulable
  // depuis ce tableau) ; via établissement, il se gère sur sa fiche.
  abonnement_id: string | null
}

// Formateur/apprenant vu depuis l'espace établissement (ETABLISSEMENT_ADMIN) —
// toujours restreint côté serveur à son propre établissement.
export interface EtablissementMembre {
  id: string
  email: string
  first_name: string
  last_name: string
  role: Role
  is_active: boolean
  classe: string | null
  classe_nom: string | null
  date_joined: string
}

export interface Filiere {
  id: string
  nom: string
  nombre_classes: number
  created_at: string
}

export interface Classe {
  id: string
  nom: string
  filiere: string | null
  filiere_nom: string | null
  nombre_eleves: number
  created_at: string
}

interface ImportRowResult {
  nom: string
  email: string
}

interface ImportSkippedRow extends ImportRowResult {
  raison: string
}

export interface ImportApprenantsResult {
  created: ImportRowResult[]
  updated: ImportRowResult[]
  skipped: ImportSkippedRow[]
}

// Messagerie apprenant <-> formateur (premium + inscription requise côté
// apprenant, contrôlé côté serveur — jamais uniquement côté client).
export interface MessageChat {
  id: string
  conversation: string
  expediteur: string
  expediteur_nom: string
  contenu: string
  lu: boolean
  created_at: string
}

export interface ContactFormateur {
  formateur_id: string
  formateur_nom: string
  formateur_email: string
  conversation_id: string | null
  dernier_message: string | null
  dernier_message_date: string | null
  non_lus: number
}

export interface ContactApprenant {
  conversation_id: string
  apprenant_id: string
  apprenant_nom: string
  apprenant_email: string
  dernier_message: string | null
  dernier_message_date: string | null
  non_lus: number
  created_at: string
}

// Bibliothèque (PDF/EPUB déposés par les formateurs) — même cycle de
// modération qu'une formation, contrôlé côté serveur.
export type DocumentStatut = 'BROUILLON' | 'SOUMIS' | 'VALIDE' | 'REFUSE' | 'PUBLIE' | 'DEPUBLIE'

export const DOCUMENT_STATUT_LABELS: Record<DocumentStatut, string> = {
  BROUILLON: 'Brouillon',
  SOUMIS: 'Soumis',
  VALIDE: 'Validé',
  REFUSE: 'Refusé',
  PUBLIE: 'Publié',
  DEPUBLIE: 'Dépublié',
}

export const DOCUMENT_STATUT_BADGE_STYLES: Record<DocumentStatut, string> = {
  BROUILLON: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300',
  SOUMIS: 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400',
  VALIDE: 'bg-sky-50 text-sky-800 dark:bg-sky-500/10 dark:text-sky-400',
  REFUSE: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  PUBLIE: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400',
  DEPUBLIE: 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400',
}

export interface LibraryDocument {
  id: string
  titre: string
  description: string
  categorie: string
  categorie_nom: string
  format: 'PDF' | 'EPUB'
  fichier: string
  taille_octets: number
  auteur: string
  auteur_email: string
  auteur_nom: string
  statut: DocumentStatut
  motif_refus: string
  created_at: string
}
