import { Eye, EyeOff } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { apiFetch, ApiError } from '../api/client'
import { Alert } from '../components/Alert'

/** Page atteinte via le lien envoyé par /auth/password-reset/ — uid et
 * token viennent de l'URL, jamais ressaisis à la main. */
export function ResetPasswordPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const uid = searchParams.get('uid') ?? ''
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const linkMissing = !uid || !token

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError(t('resetPassword.mismatch'))
      return
    }

    setIsSubmitting(true)
    try {
      await apiFetch('/auth/password-reset-confirm/', {
        method: 'POST',
        skipAuth: true,
        body: { uid, token, new_password: newPassword },
      })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('resetPassword.genericError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-sky-50 px-4 py-12">
      <div className="absolute -top-16 -right-16 h-64 w-64 rotate-12 rounded-[3rem] bg-amber-100/70 blur-2xl"></div>
      <div className="absolute -bottom-16 -left-16 h-72 w-72 rounded-full bg-sky-100/70 blur-2xl"></div>

      <div className="relative z-10 w-full max-w-md rounded-[2rem] bg-white p-8 shadow-xl sm:p-10">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 text-lg font-bold text-white">
          AI
        </div>
        <h1 className="mb-2 text-center text-2xl font-bold text-sky-700">{t('resetPassword.title')}</h1>
        <p className="mb-6 text-center text-sm text-slate-500">{t('resetPassword.subtitle')}</p>

        {linkMissing ? (
          <Alert variant="error" message={t('resetPassword.invalidLink')} />
        ) : success ? (
          <div className="space-y-4">
            <Alert variant="success" message={t('resetPassword.success')} />
            <Link
              to="/login"
              className="block w-full rounded-full bg-sky-500 py-3 text-center text-sm font-semibold tracking-wide text-white uppercase shadow-sm transition-all hover:bg-sky-600"
            >
              {t('resetPassword.backToLogin')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}

            <div>
              <label htmlFor="newPassword" className="mb-1 block text-xs font-semibold text-slate-500 uppercase">
                {t('resetPassword.newPasswordLabel')}
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-full border border-slate-200 bg-slate-50 py-3 pl-5 pr-12 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1 block text-xs font-semibold text-slate-500 uppercase">
                {t('resetPassword.confirmPasswordLabel')}
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-4 w-full rounded-full bg-sky-500 py-3 text-sm font-semibold tracking-wide text-white uppercase shadow-sm transition-all hover:bg-sky-600 disabled:opacity-50"
            >
              {isSubmitting ? t('auth.submitting') : t('resetPassword.submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
