import { BarChart2, BookOpen, Clock, ArrowRight, Search, Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, ApiError } from '../../api/client'
import { DEFAULT_PAGE_SIZE, NIVEAU_LABELS, type Niveau, type PaginatedResponse, type PublicFormation } from '../../api/types'
import { Alert } from '../../components/Alert'
import { Pagination } from '../../components/Pagination'
import { useRealtimeTopics } from '../../hooks/useRealtimeTopics'

const NIVEAUX: Array<{ label: string; value: Niveau | 'ALL' }> = [
  { label: 'Tous les niveaux', value: 'ALL' },
  { label: 'Débutant', value: 'DEBUTANT' },
  { label: 'Intermédiaire', value: 'INTERMEDIAIRE' },
  { label: 'Avancé', value: 'AVANCE' },
]

export function CataloguePage() {
  const [formations, setFormations] = useState<PublicFormation[] | null>(null)
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [niveau, setNiveau] = useState<Niveau | 'ALL'>('ALL')

  function loadFormations() {
    const params = new URLSearchParams()
    if (search.trim()) params.set('q', search.trim())
    if (niveau !== 'ALL') params.set('niveau', niveau)
    params.set('page', String(page))

    apiFetch<PaginatedResponse<PublicFormation>>(`/catalogue/formations/?${params.toString()}`)
      .then((data) => {
        setFormations(data.results)
        setCount(data.count)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }

  useEffect(() => {
    const timeout = setTimeout(loadFormations, 250)
    return () => clearTimeout(timeout)
  }, [search, niveau, page])
  useEffect(() => setPage(1), [search, niveau])

  // Une formation publiée/dépubliée/modifiée ailleurs (admin, formateur)
  // met à jour ce catalogue sans que l'apprenant ait à relancer sa recherche.
  useRealtimeTopics(['catalogue'], loadFormations)

  return (
    <div className="space-y-6">
      {/* BANNIÈRE D'ACCUEIL CATALOGUE */}
      <div className="relative overflow-hidden rounded-3xl border border-sky-200/50 bg-gradient-to-br from-sky-600 via-sky-700 to-indigo-800 p-6 text-white shadow-xl shadow-sky-500/10 sm:p-8 dark:border-sky-500/20">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-sky-100 backdrop-blur-md">
            <Sparkles size={14} className="text-amber-300" />
            <span>Catalogue d'apprentissage IA</span>
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl text-white">
            Développez vos compétences avec nos parcours interactifs
          </h1>
          <p className="mt-2 text-sm text-sky-100/90 leading-relaxed">
            Explorez des cours rédigés par nos experts, formez-vous à votre rythme et validez vos compétences clés.
          </p>

          {/* BARRE DE RECHERCHE INTEGRÉE DANS LA BANNIÈRE */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher une formation par titre, mots-clés..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-2xl border border-white/20 bg-white/95 py-3 pl-11 pr-10 text-xs font-medium text-slate-900 placeholder-slate-400 shadow-md backdrop-blur-md transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 dark:bg-slate-900/95 dark:text-slate-100 dark:placeholder-slate-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FILTRES PAR NIVEAU */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <span className="mr-2 text-xs font-bold text-slate-400 uppercase dark:text-slate-500">Filtrer par niveau :</span>
        {NIVEAUX.map((item) => (
          <button
            key={item.value}
            onClick={() => setNiveau(item.value)}
            className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all active:scale-95 ${
              niveau === item.value
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20 dark:bg-sky-600'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <Alert variant="error" message={error} />}

      {/* LOADER */}
      {!error && !formations && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          <p className="mt-4 text-xs font-semibold">Chargement des cours...</p>
        </div>
      )}

      {/* ÉTAT VIDE */}
      {formations && formations.length === 0 && (
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-12 text-center shadow-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
            <BookOpen size={28} />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-slate-100">Aucune formation trouvée</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Essayez d'ajuster vos critères de recherche ou de changer de niveau.
          </p>
          <button
            onClick={() => {
              setSearch('')
              setNiveau('ALL')
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-50 px-4 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-400 dark:hover:bg-sky-500/20"
          >
            Réinitialiser la recherche
          </button>
        </div>
      )}

      {/* GRILLE DE CARTES FORMATIONS */}
      {formations && formations.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {formations.map((formation) => (
            <Link
              key={formation.id}
              to={`/apprenant/formations/${formation.id}`}
              className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-md shadow-slate-500/5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-sky-300 hover:shadow-xl hover:shadow-sky-500/10 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-sky-500/30"
            >
              <div>
                {/* CATEGORIE BADGE */}
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center rounded-xl bg-sky-50 px-3 py-1 text-[11px] font-bold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                    {formation.categorie_nom}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                    <BarChart2 size={13} className="text-sky-500" />
                    {NIVEAU_LABELS[formation.niveau]}
                  </span>
                </div>

                {/* TITRE & DESCRIPTION */}
                <h2 className="font-formation-title text-base font-semibold uppercase tracking-wider text-slate-900 transition-colors group-hover:text-sky-600 dark:text-slate-100 dark:group-hover:text-sky-400">
                  {formation.titre}
                </h2>
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {formation.description || 'Découvrez ce module pédagogique complet pour monter en compétences.'}
                </p>
              </div>

              {/* FOOTER CARTE */}
              <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between dark:border-slate-800/80">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <Clock size={14} className="text-slate-400" />
                  <span>{formation.duree_heures} h de cours</span>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 transition-transform group-hover:translate-x-1 dark:text-sky-400">
                  Découvrir
                  <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {formations && formations.length > 0 && (
        <Pagination count={count} page={page} pageSize={DEFAULT_PAGE_SIZE} onPageChange={setPage} />
      )}
    </div>
  )
}
