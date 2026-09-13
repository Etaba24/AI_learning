import { Loader2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/client'
import type { MonAbonnement, OutilCode } from '../api/types'
import { PremiumOffersModal } from './PremiumOffersModal'

/** Verrou d'interface pour les pages réservées aux abonnés — ou, si `tool`
 * est fourni, aussi débloquées gratuitement via les catégories d'intérêt
 * choisies à l'inscription (voir MonAbonnement.outils_gratuits). Le vrai
 * contrôle est côté backend (HasActiveSubscription/HasToolAccess) — ici on
 * évite d'afficher un outil qui répondrait 403, et on présente les
 * formules dans un popup sur place (pas de redirection vers une autre page). */
export function PremiumGate({ children, tool }: { children: ReactNode; tool?: OutilCode }) {
  const navigate = useNavigate()
  const [abonnement, setAbonnement] = useState<MonAbonnement | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    apiFetch<MonAbonnement>('/mon-abonnement/')
      .then(setAbonnement)
      .catch(() => setError(true))
  }, [])

  if (error) {
    return <p className="text-red-600 dark:text-red-400">Impossible de vérifier votre abonnement.</p>
  }

  if (!abonnement) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-slate-400">
        <Loader2 size={18} className="mr-2 animate-spin" />
        Vérification de votre abonnement...
      </div>
    )
  }

  const hasFreeToolAccess = Boolean(tool && abonnement.outils_gratuits.includes(tool))

  if (abonnement.actif || hasFreeToolAccess) {
    return <>{children}</>
  }

  // Accès direct par URL à un outil premium : le popup s'ouvre sur un fond
  // vide et sa fermeture ramène à la page Outils.
  return <PremiumOffersModal open onClose={() => navigate('/apprenant/outils')} />
}
