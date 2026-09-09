import { Check, Clock, Crown, X } from 'lucide-react'
import type { PlanAbonnement } from '../api/types'

/** Carte tarifaire d'une formule payante (page Abonnement + popup Premium). */
export function PlanPricingCard({ plan, isCurrent = false }: { plan: PlanAbonnement; isCurrent?: boolean }) {
  return (
    <div
      className={`flex flex-col rounded-3xl border p-6 transition-all ${
        isCurrent
          ? 'border-sky-400 bg-sky-50/50 shadow-lg shadow-sky-500/10 dark:border-sky-500/50 dark:bg-sky-500/5'
          : 'border-slate-200 bg-white shadow-sm hover:-translate-y-1 hover:border-amber-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-amber-500/30'
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-slate-100">
          <Crown size={15} className="text-amber-500" />
          {plan.nom}
        </h3>
        {isCurrent && (
          <span className="rounded-full bg-sky-600 px-2.5 py-1 text-[10px] font-bold text-white">Plan actuel</span>
        )}
      </div>

      <p className="mt-4 text-3xl font-black text-slate-900 dark:text-white">
        {Number(plan.prix_mensuel).toLocaleString('fr-FR')}
        <span className="text-sm font-bold"> FCFA</span>
        <span className="text-xs font-semibold text-slate-400"> /mois</span>
      </p>

      <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
        <Clock size={12} className="text-sky-500" />
        Durée d'accès : {plan.duree_mois} mois{plan.duree_mois > 1 ? '' : ' renouvelable'}
      </p>

      {plan.description && (
        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{plan.description}</p>
      )}

      {plan.avantages.length > 0 && (
        <ul className="mt-4 space-y-2.5 border-t border-slate-100 pt-4 dark:border-slate-800">
          {plan.avantages.map((avantage) => (
            <li key={avantage} className="flex items-start gap-2 text-xs leading-snug text-slate-600 dark:text-slate-300">
              <Check size={14} className="mt-0.5 shrink-0 text-emerald-500" />
              {avantage}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const FREE_INCLUDED = [
  'Catalogue complet des formations',
  'Inscription aux formations gratuites',
  'Coach IA sur vos leçons',
  'Suivi de votre progression',
]

const FREE_EXCLUDED = [
  "Outils d'apprentissage (IDE, tableur, notes, tableau blanc, 3D, calculatrice)",
  'Formations premium',
]

/** Carte du niveau gratuit — pas un Plan en base : c'est simplement ce que
 * tout compte a sans payer, décrit honnêtement (coches vertes / croix grises). */
export function FreePlanCard({ isCurrent = false }: { isCurrent?: boolean }) {
  return (
    <div
      className={`flex flex-col rounded-3xl border p-6 ${
        isCurrent
          ? 'border-slate-300 bg-slate-50/70 dark:border-slate-600 dark:bg-slate-800/40'
          : 'border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Gratuit</h3>
        {isCurrent && (
          <span className="rounded-full bg-slate-600 px-2.5 py-1 text-[10px] font-bold text-white">Plan actuel</span>
        )}
      </div>

      <p className="mt-4 text-3xl font-black text-slate-900 dark:text-white">
        0<span className="text-sm font-bold"> FCFA</span>
        <span className="text-xs font-semibold text-slate-400"> /mois</span>
      </p>
      <p className="mt-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
        Commencez votre parcours gratuitement.
      </p>

      <ul className="mt-4 space-y-2.5 border-t border-slate-100 pt-4 dark:border-slate-800">
        {FREE_INCLUDED.map((item) => (
          <li key={item} className="flex items-start gap-2 text-xs leading-snug text-slate-600 dark:text-slate-300">
            <Check size={14} className="mt-0.5 shrink-0 text-emerald-500" />
            {item}
          </li>
        ))}
        {FREE_EXCLUDED.map((item) => (
          <li key={item} className="flex items-start gap-2 text-xs leading-snug text-slate-400 dark:text-slate-500">
            <X size={14} className="mt-0.5 shrink-0 text-slate-300 dark:text-slate-600" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
