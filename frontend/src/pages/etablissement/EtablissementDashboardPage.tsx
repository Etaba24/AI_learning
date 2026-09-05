import { Check, Copy, GraduationCap, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiFetch, ApiError } from '../../api/client'
import type { Etablissement, PaginatedResponse } from '../../api/types'
import { Alert } from '../../components/Alert'
import { useRealtimeTopics } from '../../hooks/useRealtimeTopics'

export function EtablissementDashboardPage() {
  const { t } = useTranslation()
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null)
  const [studentsCount, setStudentsCount] = useState<number | null>(null)
  const [instructorsCount, setInstructorsCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function load() {
    Promise.all([
      apiFetch<Etablissement>('/etablissement/moi/'),
      apiFetch<PaginatedResponse<unknown>>('/etablissement/membres/?role=STUDENT'),
      apiFetch<PaginatedResponse<unknown>>('/etablissement/membres/?role=INSTRUCTOR'),
    ])
      .then(([etab, students, instructors]) => {
        setEtablissement(etab)
        setStudentsCount(students.count)
        setInstructorsCount(instructors.count)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }

  useEffect(load, [])
  useRealtimeTopics(['etablissement_membres'], load)

  function copyCode() {
    if (!etablissement) return
    navigator.clipboard.writeText(etablissement.code_invitation).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (error) {
    return <Alert variant="error" message={error} />
  }

  if (!etablissement) {
    return <p className="text-slate-500 dark:text-slate-400">{t('common.loading')}</p>
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-lg sm:p-8">
        <h1 className="text-xl font-black sm:text-2xl">{etablissement.nom}</h1>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
            {t('etablissementAdmin.dashboardPage.codeLabel')}
          </span>
          <button
            onClick={copyCode}
            className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-1.5 font-mono text-sm font-bold backdrop-blur-sm hover:bg-white/25"
          >
            {etablissement.code_invitation}
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
        <p className="mt-2 max-w-lg text-xs text-emerald-100/90">{t('etablissementAdmin.dashboardPage.codeHint')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 dark:border-slate-800 dark:bg-slate-900/90">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {t('etablissementAdmin.dashboardPage.planLabel')}
          </p>
          {etablissement.abonnement_actif ? (
            <>
              <p className="mt-2 text-lg font-black text-slate-900 dark:text-slate-100">
                {etablissement.abonnement_actif.plan_nom}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t('etablissementAdmin.dashboardPage.expiresLabel')}{' '}
                {new Date(etablissement.abonnement_actif.date_fin).toLocaleDateString()}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
              {t('etablissementAdmin.dashboardPage.noSubscription')}
            </p>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Users size={14} />
            {t('etablissementAdmin.dashboardPage.studentsCount')}
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">{studentsCount}</p>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <GraduationCap size={14} />
            {t('etablissementAdmin.dashboardPage.instructorsCount')}
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">{instructorsCount}</p>
        </div>
      </div>
    </div>
  )
}
