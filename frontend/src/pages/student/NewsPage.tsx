import { Newspaper, Sparkles, Clock, ArrowRight, Compass, Calendar, UserCheck, Flame, Bell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, ApiError } from '../../api/client'
import { NIVEAU_LABELS, type PaginatedResponse, type PublicFormation } from '../../api/types'
import { Alert } from '../../components/Alert'

interface NewsAnnouncement {
  id: string
  title: string
  category: string
  date: string
  content: string
  author: string
  isHot?: boolean
}

const PLATFORM_ANNOUNCEMENTS: NewsAnnouncement[] = [
  {
    id: 'ann-1',
    title: 'Mise à jour majeure du catalogue de cours IA & Data Science',
    category: 'Annonce Plateforme',
    date: 'Aujourd’hui',
    content: 'De nouvelles formations axées sur les grands modèles de langage (LLM) et le Machine Learning appliqué ont été ajoutées pour tous les apprenants.',
    author: 'Équipe Pédagogique',
    isHot: true,
  },
  {
    id: 'ann-2',
    title: 'Lancement du nouveau système de suivi d’apprentissage',
    category: 'Fonctionnalité',
    date: 'Hier',
    content: 'Vous pouvez désormais suivre l’état précis de vos leçons directement depuis votre tableau de bord interactif.',
    author: 'Support Technique',
  },
  {
    id: 'ann-3',
    title: 'Webinaire gratuit : Réussir sa reconversion dans le développement Web',
    category: 'Événement',
    date: 'Il y a 3 jours',
    content: 'Rejoignez nos experts formateurs ce vendredi à 18h pour une session de questions/réponses en direct.',
    author: 'Communauté AI Learning',
  },
]

export function NewsPage() {
  const [recentFormations, setRecentFormations] = useState<PublicFormation[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<PaginatedResponse<PublicFormation>>('/catalogue/formations/')
      .then((data) => setRecentFormations(data.results))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur lors du chargement des actualités.'))
  }, [])

  if (error) {
    return <Alert variant="error" message={error} />
  }

  if (!recentFormations) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
        <p className="mt-4 text-xs font-semibold">Chargement des actualités et nouveautés...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* BANNIÈRE EN-TÊTE ACTUALITÉS */}
      <div className="relative overflow-hidden rounded-3xl border border-sky-200/50 bg-gradient-to-br from-indigo-900 via-sky-800 to-slate-900 p-6 text-white shadow-xl shadow-sky-500/10 sm:p-8 dark:border-sky-500/20">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-sky-400/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-sky-100 backdrop-blur-md">
            <Newspaper size={14} className="text-amber-300" />
            <span>Fil d'actualités et nouveautés</span>
          </div>

          <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Formations récemment partagées 🚀
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-sky-100/90 sm:text-sm">
            Restez informé des nouveaux cours publiés, des mises à jour pédagogiques et des annonces exclusives de la plateforme AI Learning.
          </p>
        </div>
      </div>

      {/* SECTION 1 : FORMATIONS NOUVELLEMENT PARTAGÉES */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Flame size={20} className="text-amber-500 animate-bounce" />
            Nouveautés du catalogue
          </h2>
          <span className="text-xs font-bold text-slate-400">
            {recentFormations.length} formation{recentFormations.length > 1 ? 's' : ''} disponible{recentFormations.length > 1 ? 's' : ''}
          </span>
        </div>

        {recentFormations.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-bold text-slate-400">Aucune nouvelle formation partagée pour le moment.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recentFormations.map((formation, idx) => (
              <div
                key={formation.id}
                className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-md shadow-slate-500/5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-sky-400 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-sky-500/40"
              >
                {idx < 2 && (
                  <span className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-2.5 py-0.5 text-[10px] font-black text-white shadow-sm">
                    <Sparkles size={11} />
                    Nouveau
                  </span>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center rounded-xl bg-sky-50 px-2.5 py-1 text-[10px] font-bold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                      {formation.categorie_nom}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      • {NIVEAU_LABELS[formation.niveau]}
                    </span>
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-sky-600 dark:text-slate-100 dark:group-hover:text-sky-400 line-clamp-1">
                    {formation.titre}
                  </h3>

                  <p className="mt-2 text-xs leading-relaxed text-slate-500 line-clamp-3 dark:text-slate-400">
                    {formation.description || 'Formation complète ajoutée récemment au catalogue d’apprentissage.'}
                  </p>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4">
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} className="text-sky-500" />
                      {formation.duree_heures} h de cours
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                      <UserCheck size={14} />
                      Accès immédiat
                    </span>
                  </div>

                  <Link
                    to={`/apprenant/formations/${formation.id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 text-xs font-extrabold text-white shadow-md transition-all hover:bg-sky-600 active:scale-95 dark:bg-slate-800 dark:hover:bg-sky-600"
                  >
                    <span>Découvrir la formation</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2 : ANNONCES & MISES À JOUR PLATAFORME */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bell size={18} className="text-sky-500" />
            Annonces de la communauté
          </h2>
        </div>

        <div className="space-y-4">
          {PLATFORM_ANNOUNCEMENTS.map((ann) => (
            <div
              key={ann.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90"
            >
              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                  <Compass size={20} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {ann.category}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                      <Calendar size={12} /> {ann.date}
                    </span>
                    {ann.isHot && (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                        Important
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">{ann.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{ann.content}</p>
                </div>
              </div>

              <div className="shrink-0 text-right sm:border-l sm:border-slate-100 sm:pl-4 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block">Publié par</span>
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400">{ann.author}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
