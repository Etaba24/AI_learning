import {
  Boxes,
  Calculator,
  Code2,
  Crown,
  FileSpreadsheet,
  NotebookPen,
  PenTool,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { useEffect, useState, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../../api/client'
import type { MonAbonnement } from '../../api/types'
import { PremiumOffersModal } from '../../components/PremiumOffersModal'

interface ToolItem {
  icon: ComponentType<{ size?: number; className?: string }>
  name: string
  description: string
  audience: string
  audienceStyle: string
  to?: string
}

// Roadmap honnête : aucun de ces outils n'est encore branché, la page ne
// fait qu'annoncer ce qui est prévu (pas de fausse interface cliquable).
const UNIVERSAL_TOOLS: ToolItem[] = [
  {
    icon: NotebookPen,
    name: 'Prise de notes',
    description: "Annotez chaque leçon pendant que vous la suivez, et retrouvez vos notes directement depuis « Mes formations ».",
    audience: 'Tous les apprenants',
    audienceStyle: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
    to: '/apprenant/outils/notes',
  },
  {
    icon: Calculator,
    name: 'Calculatrice scientifique',
    description: 'Trigonométrie, logarithmes, puissances, mémoire et historique — directement dans votre espace.',
    audience: 'Tous les apprenants',
    audienceStyle: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
    to: '/apprenant/outils/calculatrice',
  },
  {
    icon: PenTool,
    name: 'Tableau blanc',
    description: 'Un espace de dessin et de mind-mapping pour visualiser une notion ou suivre un cours en direct.',
    audience: 'Tous les apprenants',
    audienceStyle: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
    to: '/apprenant/outils/tableau-blanc',
  },
]

const SPECIALIZED_TOOLS: ToolItem[] = [
  {
    icon: Code2,
    name: 'IDE & bac à sable de code',
    description: 'Écrivez et exécutez du code directement dans le navigateur, sans rien installer.',
    audience: 'Formations développement',
    audienceStyle: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
    to: '/apprenant/outils/ide',
  },
  {
    icon: Boxes,
    name: 'Modélisation 3D',
    description: 'Assemblez des formes en 3D — déplacez, pivotez, redimensionnez et colorez vos objets dans une scène interactive.',
    audience: 'Design & sciences',
    audienceStyle: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    to: '/apprenant/outils/modelisation-3d',
  },
  {
    icon: FileSpreadsheet,
    name: 'Tableur & documents',
    description: 'Un éditeur simplifié pour pratiquer la bureautique et la gestion directement en ligne.',
    audience: 'Formations bureautique & gestion',
    audienceStyle: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    to: '/apprenant/outils/tableur',
  },
]

function ToolCard({
  tool,
  isSubscribed,
  onLockedClick,
}: {
  tool: ToolItem
  isSubscribed: boolean
  onLockedClick: () => void
}) {
  const Icon = tool.icon
  const isAvailable = Boolean(tool.to)

  const content = (
    <>
      <div>
        <div className="flex items-start justify-between">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isAvailable ? 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
            <Icon size={20} />
          </div>
          {isAvailable && !isSubscribed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              <Crown size={10} />
              Premium
            </span>
          ) : isAvailable ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              Disponible
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              Bientôt disponible
            </span>
          )}
        </div>

        <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-slate-100">{tool.name}</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{tool.description}</p>
      </div>

      <span className={`mt-4 inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[10px] font-bold ${tool.audienceStyle}`}>
        {tool.audience}
      </span>
    </>
  )

  const cardClasses =
    'flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-sky-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-sky-500/30'

  // Sans abonnement, le clic ouvre le popup des formules sur place —
  // aucune redirection vers une autre page.
  if (tool.to && !isSubscribed) {
    return (
      <button onClick={onLockedClick} className={`${cardClasses} text-left`}>
        {content}
      </button>
    )
  }
  if (tool.to) {
    return (
      <Link to={tool.to} className={cardClasses}>
        {content}
      </Link>
    )
  }
  return <div className={cardClasses}>{content}</div>
}

export function ToolsPage() {
  const [isSubscribed, setIsSubscribed] = useState(true)
  const [showOffers, setShowOffers] = useState(false)

  useEffect(() => {
    apiFetch<MonAbonnement>('/mon-abonnement/')
      .then((abonnement) => setIsSubscribed(abonnement.actif))
      .catch(() => setIsSubscribed(false))
  }, [])

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-sky-200/50 bg-gradient-to-br from-slate-900 via-sky-900 to-indigo-900 p-6 text-white shadow-xl shadow-sky-500/10 sm:p-8 dark:border-sky-500/20">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-sky-100 backdrop-blur-md">
            <Wrench size={14} className="text-sky-300" />
            <span>Outils d'apprentissage</span>
          </div>

          <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Les outils qui accompagneront vos formations
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-sky-100/90 sm:text-sm">
            AI Learning s'adresse à tous types d'apprenants, pas uniquement aux développeurs. Voici les outils
            prévus pour enrichir votre apprentissage, qu'ils soient utiles à tous ou spécifiques à un domaine.
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
          <Sparkles size={18} className="text-sky-500" />
          Outils universels — utiles à toutes les formations
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {UNIVERSAL_TOOLS.map((tool) => (
            <ToolCard key={tool.name} tool={tool} isSubscribed={isSubscribed} onLockedClick={() => setShowOffers(true)} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
          <Wrench size={18} className="text-sky-500" />
          Outils spécifiques — selon votre domaine de formation
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SPECIALIZED_TOOLS.map((tool) => (
            <ToolCard key={tool.name} tool={tool} isSubscribed={isSubscribed} onLockedClick={() => setShowOffers(true)} />
          ))}
        </div>
      </div>

      <PremiumOffersModal open={showOffers} onClose={() => setShowOffers(false)} />
    </div>
  )
}
