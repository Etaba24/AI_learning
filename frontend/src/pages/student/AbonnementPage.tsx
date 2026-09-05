import { CheckCircle2, Crown, Info, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch, ApiError } from '../../api/client'
import type { PaginatedResponse, PlanAbonnement } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { useConfirm } from '../../components/ConfirmContext'
import { FreePlanCard, PlanPricingCard } from '../../components/PlanPricingCard'
import { useToast } from '../../components/ToastContext'

export function AbonnementPage() {
  // L'abonnement vient d'AuthContext (partagé avec le bandeau du pied de
  // sidebar) : le rétrograder ici doit aussi le mettre à jour là-bas,
  // sans recharger la page — d'où refreshAbonnement() plutôt qu'un état
  // local propre à cette page.
  const { abonnement, refreshAbonnement } = useAuth()
  const [plans, setPlans] = useState<PlanAbonnement[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isDowngrading, setIsDowngrading] = useState(false)
  const confirm = useConfirm()
  const { showToast } = useToast()

  useEffect(() => {
    apiFetch<PaginatedResponse<PlanAbonnement>>('/plans/publics/')
      .then((publics) => setPlans(publics.results))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }, [])

  async function handleDowngrade() {
    const ok = await confirm({
      title: 'Rétrograder vers le plan Gratuit ?',
      message:
        "Vous perdrez immédiatement l'accès aux outils et formations premium. Vous pourrez vous réabonner à tout moment.",
      confirmLabel: 'Rétrograder',
      variant: 'warning',
    })
    if (!ok) return

    setIsDowngrading(true)
    try {
      await apiFetch('/mon-abonnement/retrograder/', { method: 'POST' })
      await refreshAbonnement()
      showToast('success', 'Vous êtes repassé au plan Gratuit.')
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Impossible de rétrograder votre abonnement.')
    } finally {
      setIsDowngrading(false)
    }
  }

  if (error) {
    return <p className="text-red-600 dark:text-red-400">{error}</p>
  }

  if (!abonnement) {
    return <p className="text-slate-500 dark:text-slate-400">Chargement...</p>
  }

  const plansIndividuels = plans.filter((plan) => plan.type === 'INDIVIDUEL')

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">Abonnement</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Choisissez le plan qui correspond à votre ambition.
        </p>
      </div>

      {/* Bandeau de situation actuelle */}
      {abonnement.actif ? (
        <div className="flex flex-col items-start gap-4 rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5 sm:flex-row sm:items-center dark:border-sky-500/25 dark:from-sky-500/5 dark:to-slate-900">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
            <CheckCircle2 size={22} />
          </div>
          <div className="flex-1">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-slate-100">
              {abonnement.plan}
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                Actif
              </span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Profitez de tout le contenu et des fonctionnalités sans restriction.{' '}
              {abonnement.via === 'etablissement' ? 'Pris en charge par votre établissement' : 'Abonnement personnel'}{' '}
              · jusqu'au {new Date(abonnement.date_fin!).toLocaleDateString('fr-FR')}
            </p>
          </div>
          {abonnement.abonnement_id && (
            <button
              onClick={handleDowngrade}
              disabled={isDowngrading}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {isDowngrading && <Loader2 size={13} className="animate-spin" />}
              Rétrograder vers Gratuit
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-4 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 sm:flex-row sm:items-center dark:border-amber-500/20 dark:from-amber-500/5 dark:to-slate-900">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
            <Crown size={22} />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">Vous êtes sur le plan Gratuit</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Les outils d'apprentissage et les formations premium sont réservés aux abonnés.
            </p>
          </div>
        </div>
      )}

      {/* Comparatif Gratuit / Premium */}
      <div className="grid gap-5 md:grid-cols-2">
        <FreePlanCard isCurrent={!abonnement.actif} />
        {plansIndividuels.map((plan) => (
          <PlanPricingCard key={plan.id} plan={plan} isCurrent={abonnement.actif && abonnement.plan === plan.nom} />
        ))}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-xs leading-relaxed text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/5 dark:text-sky-300">
        <Info size={16} className="mt-0.5 shrink-0" />
        <p>
          Le paiement en ligne (carte bancaire, Mobile Money) est en cours d'intégration. En attendant,
          contactez l'administration de la plateforme pour activer votre abonnement. Si votre école ou votre
          entreprise est partenaire, demandez-lui son <strong>code établissement</strong> et renseignez-le à
          l'inscription pour être couvert automatiquement.
        </p>
      </div>
    </div>
  )
}
