import { Ban, Building2, Crown, Search, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch, ApiError } from '../../api/client'
import { DEFAULT_PAGE_SIZE, type ApprenantAbonnement, type PaginatedResponse } from '../../api/types'
import { Alert } from '../../components/Alert'
import { useConfirm } from '../../components/ConfirmContext'
import { Pagination } from '../../components/Pagination'
import { useToast } from '../../components/ToastContext'
import { useRealtimeTopics } from '../../hooks/useRealtimeTopics'

type StatusFilter = 'TOUS' | 'PREMIUM' | 'FREE'

export function AbonnementsPage() {
  const { showToast } = useToast()
  const confirm = useConfirm()

  const [apprenants, setApprenants] = useState<ApprenantAbonnement[] | null>(null)
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [premiumCount, setPremiumCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('TOUS')
  const [pendingId, setPendingId] = useState<string | null>(null)

  function loadApprenants() {
    const params = new URLSearchParams()
    if (statusFilter !== 'TOUS') params.set('statut', statusFilter)
    if (search.trim()) params.set('q', search.trim())
    params.set('page', String(page))
    apiFetch<PaginatedResponse<ApprenantAbonnement>>(`/abonnements/apprenants/?${params.toString()}`)
      .then((data) => {
        setApprenants(data.results)
        setCount(data.count)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }

  // Compte global (tous apprenants, indépendant du filtre/de la page
  // affichés) pour la légende "X Premium sur Y apprenants" — sinon elle
  // refléterait juste la page/le filtre courant.
  function loadStats() {
    Promise.all([
      apiFetch<PaginatedResponse<ApprenantAbonnement>>('/abonnements/apprenants/?statut=PREMIUM'),
      apiFetch<PaginatedResponse<ApprenantAbonnement>>('/abonnements/apprenants/'),
    ])
      .then(([premium, tous]) => {
        setPremiumCount(premium.count)
        setTotalCount(tous.count)
      })
      .catch(() => {})
  }

  useEffect(() => {
    const timeout = setTimeout(loadApprenants, 250)
    return () => clearTimeout(timeout)
  }, [statusFilter, search, page])
  useEffect(() => setPage(1), [statusFilter, search])
  useEffect(loadStats, [])
  useRealtimeTopics(['admin_abonnements'], () => {
    loadApprenants()
    loadStats()
  })

  async function handleActiver(apprenant: ApprenantAbonnement) {
    const ok = await confirm({
      title: 'Activer le Premium ?',
      message: `Confirmez-vous avoir reçu le paiement de "${apprenant.first_name} ${apprenant.last_name}" ? Son compte sera immédiatement marqué Premium.`,
      confirmLabel: 'Activer le Premium',
    })
    if (!ok) return

    setPendingId(apprenant.id)
    try {
      await apiFetch(`/abonnements/apprenants/${apprenant.id}/activer/`, { method: 'POST' })
      showToast('success', `${apprenant.first_name} ${apprenant.last_name} est maintenant Premium.`)
      loadApprenants()
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : "Impossible d'activer cet abonnement.")
    } finally {
      setPendingId(null)
    }
  }

  async function handleAnnuler(apprenant: ApprenantAbonnement) {
    if (!apprenant.abonnement_id) return
    const ok = await confirm({
      title: 'Annuler le Premium ?',
      message: `L'accès Premium de "${apprenant.first_name} ${apprenant.last_name}" sera coupé immédiatement.`,
      confirmLabel: 'Annuler le Premium',
      danger: true,
    })
    if (!ok) return

    setPendingId(apprenant.id)
    try {
      await apiFetch(`/abonnements/${apprenant.abonnement_id}/annuler/`, { method: 'POST' })
      showToast('success', `L'accès Premium de ${apprenant.first_name} ${apprenant.last_name} a été annulé.`)
      loadApprenants()
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : "Impossible d'annuler cet abonnement.")
    } finally {
      setPendingId(null)
    }
  }

  if (error) {
    return <Alert variant="error" message={error} />
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Abonnements</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {apprenants ? `${premiumCount} Premium sur ${totalCount} apprenants` : 'Chargement...'}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un apprenant..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none sm:w-64 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex rounded-xl border border-slate-200 p-1 dark:border-slate-700">
            {(['TOUS', 'FREE', 'PREMIUM'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setStatusFilter(option)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  statusFilter === option
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {option === 'TOUS' ? 'Tous' : option === 'FREE' ? 'Gratuit' : 'Premium'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!apprenants ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          <p className="mt-3 text-xs font-medium">Chargement des comptes...</p>
        </div>
      ) : apprenants.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-14 text-center dark:border-slate-800">
          <Sparkles size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Aucun apprenant ne correspond.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-slate-200/80 bg-white/90 shadow-md shadow-slate-500/5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Apprenant</th>
                <th className="px-5 py-3.5">Statut</th>
                <th className="px-5 py-3.5">Via / jusqu'au</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {apprenants.map((apprenant) => (
                <tr key={apprenant.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {apprenant.first_name} {apprenant.last_name}
                    </p>
                    <p className="text-xs text-slate-400">{apprenant.email}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    {apprenant.actif ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                        <Crown size={11} />
                        Premium
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        Gratuit
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                    {apprenant.actif ? (
                      apprenant.via === 'etablissement' ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 size={12} className="text-sky-500" />
                          {apprenant.etablissement_nom}
                        </span>
                      ) : (
                        <span>
                          Personnel · jusqu'au{' '}
                          {apprenant.date_fin && new Date(apprenant.date_fin).toLocaleDateString('fr-FR')}
                        </span>
                      )
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end">
                      {!apprenant.actif ? (
                        <button
                          onClick={() => handleActiver(apprenant)}
                          disabled={pendingId === apprenant.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-50"
                        >
                          <Crown size={13} />
                          {pendingId === apprenant.id ? 'Activation...' : 'Activer le Premium'}
                        </button>
                      ) : apprenant.via === 'personnel' ? (
                        <button
                          onClick={() => handleAnnuler(apprenant)}
                          disabled={pendingId === apprenant.id}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
                        >
                          <Ban size={13} />
                          Annuler
                        </button>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400" title="Géré depuis la fiche établissement">
                          Géré via l'établissement
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-4">
            <Pagination count={count} page={page} pageSize={DEFAULT_PAGE_SIZE} onPageChange={setPage} />
          </div>
        </div>
      )}
    </div>
  )
}
