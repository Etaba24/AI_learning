import { Atom, Beaker, Loader2, Search, Table2 } from 'lucide-react'
import { Suspense, lazy, useState, type FormEvent } from 'react'
import { apiFetch, ApiError } from '../../api/client'
import { COULEUR_CATEGORIE, ELEMENTS, type ElementChimique } from '../../data/periodicTable'
import { REACTIFS_DISPONIBLES, trouverReaction, type ReactionChimie } from '../../data/reactionsChimie'
import { BackToToolsLink } from '../../components/BackToToolsLink'
import type { AtomeMolecule, LiaisonMolecule } from '../../components/MoleculeViewer3D'

// three.js pèse lourd : chargé uniquement une fois une molécule affichée
// (même convention que Studio3D pour la Modélisation 3D).
const MoleculeViewer3D = lazy(() =>
  import('../../components/MoleculeViewer3D').then((m) => ({ default: m.MoleculeViewer3D })),
)
const BeakerReaction3D = lazy(() =>
  import('../../components/BeakerReaction3D').then((m) => ({ default: m.BeakerReaction3D })),
)

interface MoleculeResultat {
  recherche: string
  dimension: '3d' | '2d'
  atomes: AtomeMolecule[]
  liaisons: LiaisonMolecule[]
}

type ModeRecherche = 'nom' | 'formule'

function ElementDetail({ element, onClose }: { element: ElementChimique; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`inline-flex items-center justify-center rounded-2xl border px-4 py-3 text-3xl font-black ${COULEUR_CATEGORIE[element.categorie]}`}>
          {element.symbole}
        </div>
        <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-100">{element.nom}</h3>
        <dl className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex justify-between">
            <dt className="font-semibold text-slate-400">Numéro atomique</dt>
            <dd>{element.numero}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="font-semibold text-slate-400">Masse atomique</dt>
            <dd>{element.masse} u</dd>
          </div>
          <div className="flex justify-between">
            <dt className="font-semibold text-slate-400">Catégorie</dt>
            <dd className="capitalize">{element.categorie}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

function TablePeriodique() {
  const [elementSelectionne, setElementSelectionne] = useState<ElementChimique | null>(null)

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="grid min-w-[900px] gap-1" style={{ gridTemplateColumns: 'repeat(18, minmax(0, 1fr))' }}>
        {ELEMENTS.map((element) => (
          <button
            key={element.numero}
            type="button"
            onClick={() => setElementSelectionne(element)}
            style={{ gridColumn: element.groupe, gridRow: element.periode }}
            className={`flex aspect-square flex-col items-center justify-center rounded-lg border text-[10px] font-bold transition-transform hover:z-10 hover:scale-110 ${COULEUR_CATEGORIE[element.categorie]}`}
            title={element.nom}
          >
            <span className="text-[7px] font-medium opacity-70">{element.numero}</span>
            <span>{element.symbole}</span>
          </button>
        ))}
      </div>

      {elementSelectionne && (
        <ElementDetail element={elementSelectionne} onClose={() => setElementSelectionne(null)} />
      )}
    </div>
  )
}

const BADGES_TYPE: Record<ReactionChimie['type'], string> = {
  'acide-base': 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  'précipitation': 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
  'combustion': 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300',
  'oxydo-réduction': 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  'décomposition': 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300',
}

function LaboratoireReactions() {
  const [reactifAId, setReactifAId] = useState('')
  const [reactifBId, setReactifBId] = useState('')
  const [reaction, setReaction] = useState<ReactionChimie | null>(null)
  const [enReaction, setEnReaction] = useState(false)
  const [aucuneReaction, setAucuneReaction] = useState(false)

  const reactifA = REACTIFS_DISPONIBLES.find((r) => r.formule === reactifAId) ?? null

  function reinitialiserResultat() {
    setReaction(null)
    setEnReaction(false)
    setAucuneReaction(false)
  }

  function handleMelanger() {
    if (!reactifAId || !reactifBId) return
    const trouvee = trouverReaction(reactifAId, reactifBId)
    setReaction(trouvee)
    setAucuneReaction(!trouvee)
    setEnReaction(Boolean(trouvee))
  }

  const couleurDepart = reactifA?.couleur ?? '#f8fafc'

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Choisissez deux réactifs parmi cette liste de référence — seules les combinaisons réellement
        répertoriées ci-dessous déclenchent une réaction ; les autres restent honnêtement « sans réaction
        connue » plutôt que d'inventer un résultat.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <select
          value={reactifAId}
          onChange={(e) => {
            setReactifAId(e.target.value)
            reinitialiserResultat()
          }}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">Réactif A...</option>
          {REACTIFS_DISPONIBLES.map((r) => (
            <option key={r.formule} value={r.formule}>
              {r.nom} ({r.formule})
            </option>
          ))}
        </select>
        <select
          value={reactifBId}
          onChange={(e) => {
            setReactifBId(e.target.value)
            reinitialiserResultat()
          }}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">Réactif B...</option>
          {REACTIFS_DISPONIBLES.map((r) => (
            <option key={r.formule} value={r.formule}>
              {r.nom} ({r.formule})
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={handleMelanger}
        disabled={!reactifAId || !reactifBId || reactifAId === reactifBId}
        className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        Mélanger
      </button>

      {reactifAId && reactifAId === reactifBId && (
        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
          Choisissez deux réactifs différents.
        </p>
      )}

      {aucuneReaction && (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          Aucune réaction connue enregistrée pour cette combinaison dans le catalogue de référence.
        </p>
      )}

      <div className="h-[420px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-slate-400">
              <Loader2 size={24} className="animate-spin" />
            </div>
          }
        >
          <BeakerReaction3D
            couleurDepart={couleurDepart}
            couleurResultat={reaction?.couleurResultat ?? couleurDepart}
            enReaction={enReaction}
            degageGaz={reaction?.degageGaz ?? false}
            formePrecipite={reaction?.formePrecipite ?? false}
          />
        </Suspense>
      </div>

      {reaction && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{reaction.nom}</h3>
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${BADGES_TYPE[reaction.type]}`}>
              {reaction.type}
            </span>
          </div>
          <p className="mt-2 font-mono text-xs text-slate-700 dark:text-slate-300">{reaction.equation}</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{reaction.observations}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold">
            {reaction.exothermique && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700 dark:bg-red-500/10 dark:text-red-400">
                Exothermique
              </span>
            )}
            {reaction.degageGaz && (
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400">
                Dégagement gazeux
              </span>
            )}
            {reaction.formePrecipite && (
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400">
                Formation d'un précipité
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function ChimiePage() {
  const [vue, setVue] = useState<'table' | 'molecule' | 'laboratoire'>('molecule')
  const [recherche, setRecherche] = useState('')
  const [mode, setMode] = useState<ModeRecherche>('nom')
  const [resultat, setResultat] = useState<MoleculeResultat | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch(event: FormEvent) {
    event.preventDefault()
    const q = recherche.trim()
    if (!q) return

    setIsSearching(true)
    setError(null)
    try {
      const data = await apiFetch<MoleculeResultat>(
        `/chimie/molecule/?q=${encodeURIComponent(q)}&mode=${mode}`,
      )
      setResultat(data)
    } catch (err) {
      setResultat(null)
      setError(err instanceof ApiError ? err.message : 'Impossible de contacter le service de structures chimiques.')
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="space-y-6">
      <BackToToolsLink />

      <div className="relative overflow-hidden rounded-3xl border border-emerald-200/50 bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-950 p-6 text-white shadow-xl sm:p-8 dark:border-emerald-500/20">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Laboratoire de chimie 3D</h1>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-emerald-100/90 sm:text-sm">
          Table périodique interactive et rendu 3D ball-and-stick de vraies structures moléculaires (base
          publique PubChem) — recherchez par nom ou par formule brute.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setVue('molecule')}
          className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-bold transition-colors ${
            vue === 'molecule'
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300'
          }`}
        >
          <Atom size={15} />
          Molécule
        </button>
        <button
          type="button"
          onClick={() => setVue('table')}
          className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-bold transition-colors ${
            vue === 'table'
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300'
          }`}
        >
          <Table2 size={15} />
          Table périodique
        </button>
        <button
          type="button"
          onClick={() => setVue('laboratoire')}
          className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-bold transition-colors ${
            vue === 'laboratoire'
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300'
          }`}
        >
          <Beaker size={15} />
          Laboratoire de réactions
        </button>
      </div>

      {vue === 'table' ? (
        <TablePeriodique />
      ) : vue === 'laboratoire' ? (
        <LaboratoireReactions />
      ) : (
        <div className="space-y-4">
          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
            <div className="flex overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              {(['nom', 'formule'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`px-3 py-2 text-xs font-bold transition-colors ${
                    mode === m
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {m === 'nom' ? 'Par nom' : 'Par formule'}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder={mode === 'nom' ? 'ex : caffeine, ethanol, benzene...' : 'ex : H2O, CH4, C6H12O6...'}
                className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !recherche.trim()}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSearching ? 'Recherche...' : 'Rechercher'}
            </button>
          </form>

          {error && (
            <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="h-[480px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            {!resultat ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                <Atom size={32} />
                <p className="text-sm font-medium">Recherchez une molécule pour l'afficher en 3D.</p>
              </div>
            ) : (
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-slate-400">
                    <Loader2 size={24} className="animate-spin" />
                  </div>
                }
              >
                <MoleculeViewer3D atomes={resultat.atomes} liaisons={resultat.liaisons} />
              </Suspense>
            )}
          </div>

          {resultat && resultat.dimension === '2d' && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              Aucun conformère 3D disponible pour cette molécule — structure 2D affichée à plat.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
