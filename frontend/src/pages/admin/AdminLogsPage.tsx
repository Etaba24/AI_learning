import { AlertTriangle, ShieldCheck, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch } from '../../api/client'
import type { AuditLogEntry, PaginatedResponse } from '../../api/types'

function formatDate(value: string) {
  return new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function AdminLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadLogs() {
      try {
        setLoading(true)
        const data = await apiFetch<PaginatedResponse<AuditLogEntry>>('/admin/logs/')
        setLogs(data.results)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Impossible de charger le journal d’activité.')
      } finally {
        setLoading(false)
      }
    }

    loadLogs()
  }, [])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-400">Sécurité</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Journal d’activité</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            <ShieldCheck size={14} />
            Audit actif
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/10 dark:text-red-300">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Chargement du journal d’activité...
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
          Aucune activité enregistrée pour le moment.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 bg-white text-left text-sm dark:divide-slate-800 dark:bg-slate-900">
              <thead className="bg-slate-50 dark:bg-slate-950/60">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Date</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Utilisateur</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Action</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Détail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {logs.map((log) => (
                  <tr key={log.id} className="align-top hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(log.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        <UserRound size={14} className="text-sky-600 dark:text-sky-400" />
                        <span>{log.utilisateur_email || 'Compte supprimé'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{log.detail || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
