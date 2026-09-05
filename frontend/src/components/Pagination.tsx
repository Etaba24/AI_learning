import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface PaginationProps {
  count: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
}

/** Pagination générique pour toute liste paginée par l'API (DRF
 * PageNumberPagination, PAGE_SIZE=20 côté serveur — voir `count`). Ne
 * s'affiche pas s'il n'y a qu'une seule page : pas de contrôle inutile
 * pour une liste courte. */
export function Pagination({ count, page, pageSize, onPageChange }: PaginationProps) {
  const { t } = useTranslation()
  const totalPages = Math.max(1, Math.ceil(count / pageSize))
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, count)

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row dark:border-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">{t('common.pagination.range', { from, to, count })}</p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label={t('common.pagination.previousAria')}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="px-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          {t('common.pagination.pageIndicator', { page, totalPages })}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label={t('common.pagination.nextAria')}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
