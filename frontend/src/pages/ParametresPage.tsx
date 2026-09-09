import { Check, Copy, Crown, Globe, KeyRound, Loader2, Moon, Save, Sun, Trash2, User as UserIcon } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { apiFetch, ApiError } from '../api/client'
import { ROLE_LABELS, type MonAbonnement, type User } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Alert } from '../components/Alert'
import { useConfirm } from '../components/ConfirmContext'
import { useToast } from '../components/ToastContext'
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n'
import { useTheme } from '../theme/ThemeContext'

function PremiumBadge() {
  const { t } = useTranslation()
  const [abonnement, setAbonnement] = useState<MonAbonnement | null>(null)

  useEffect(() => {
    apiFetch<MonAbonnement>('/mon-abonnement/')
      .then(setAbonnement)
      .catch(() => setAbonnement(null))
  }, [])

  if (!abonnement) return null

  return abonnement.actif ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
      <Crown size={11} />
      {t('settings.premium')}
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      {t('settings.free')}
    </span>
  )
}

export function ParametresPage() {
  const { t, i18n } = useTranslation()
  const { user, refreshUser, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { showToast } = useToast()
  const confirm = useConfirm()
  const navigate = useNavigate()

  const [firstName, setFirstName] = useState(user?.first_name ?? '')
  const [lastName, setLastName] = useState(user?.last_name ?? '')
  const [profileError, setProfileError] = useState<string | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  const [copiedId, setCopiedId] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)

  if (!user) {
    return <p className="text-slate-500 dark:text-slate-400">{t('common.loading')}</p>
  }

  const initial = (user.first_name || user.email)[0]?.toUpperCase()
  const isProfileDirty = firstName !== user.first_name || lastName !== user.last_name

  async function handleSaveProfile(event: FormEvent) {
    event.preventDefault()
    setProfileError(null)
    setIsSavingProfile(true)
    try {
      await apiFetch<User>('/users/me/', {
        method: 'PATCH',
        body: { first_name: firstName.trim(), last_name: lastName.trim() },
      })
      await refreshUser()
      showToast('success', t('settings.profile.saved'))
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : t('settings.profile.error'))
    } finally {
      setIsSavingProfile(false)
    }
  }

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault()
    setPasswordError(null)

    if (newPassword !== confirmPassword) {
      setPasswordError(t('settings.security.mismatch'))
      return
    }

    setIsSavingPassword(true)
    try {
      await apiFetch('/auth/password-change/', {
        method: 'POST',
        body: { current_password: currentPassword, new_password: newPassword },
      })
      showToast('success', t('settings.security.success'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : t('settings.security.error'))
    } finally {
      setIsSavingPassword(false)
    }
  }

  async function handleDeleteAccount() {
    const ok = await confirm({
      title: t('settings.dangerZone.confirmTitle'),
      message: t('settings.dangerZone.confirmMessage'),
      confirmLabel: t('settings.dangerZone.confirmLabel'),
      variant: 'danger',
    })
    if (!ok) return

    setIsDeletingAccount(true)
    try {
      await apiFetch('/users/me/', { method: 'DELETE' })
      showToast('success', t('settings.dangerZone.success'))
      logout()
      navigate('/', { replace: true })
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('settings.dangerZone.error'))
      setIsDeletingAccount(false)
    }
  }

  function copyId() {
    navigator.clipboard.writeText(user!.id).then(() => {
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    })
  }

  function changeLanguage(lang: SupportedLanguage) {
    i18n.changeLanguage(lang)
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
  const labelClass = 'mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300'
  const cardClass = 'rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('settings.subtitle')}</p>
      </div>

      {/* ---- Profil ---- */}
      <div className={cardClass}>
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
          <UserIcon size={16} className="text-sky-500" />
          {t('settings.profile.heading')}
        </h2>
        <p className="mt-0.5 text-xs text-slate-400">{t('settings.profile.subtitle')}</p>

        <div className="mt-5 flex flex-col gap-6 sm:flex-row">
          <div className="flex shrink-0 flex-col items-center gap-3 sm:w-40">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 text-2xl font-bold text-white shadow-md">
              {initial}
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {user.first_name} {user.last_name}
              </p>
              <div className="mt-1.5 flex items-center justify-center gap-1.5">
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-500/10 dark:text-sky-400">
                  {ROLE_LABELS[user.role]}
                </span>
                {user.role === 'STUDENT' && <PremiumBadge />}
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="flex-1 space-y-4">
            {profileError && <Alert variant="error" message={profileError} />}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>{t('settings.profile.firstName')}</label>
                <input value={firstName} onChange={(event) => setFirstName(event.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t('settings.profile.lastName')}</label>
                <input value={lastName} onChange={(event) => setLastName(event.target.value)} className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>{t('settings.profile.email')}</label>
              <input value={user.email} disabled className={`${inputClass} cursor-not-allowed opacity-60`} />
              <p className="mt-1 text-[11px] text-slate-400">{t('settings.profile.emailNote')}</p>
            </div>

            {user.departement_nom && (
              <div>
                <label className={labelClass}>{t('settings.profile.departement')}</label>
                <input value={user.departement_nom} disabled className={`${inputClass} cursor-not-allowed opacity-60`} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400">
              <div>
                <p className="font-bold text-slate-400">{t('settings.profile.memberSince')}</p>
                <p>
                  {new Date(user.date_joined).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
                    year: 'numeric',
                    month: 'long',
                  })}
                </p>
              </div>
              <div>
                <p className="font-bold text-slate-400">{t('settings.profile.id')}</p>
                <button
                  type="button"
                  onClick={copyId}
                  className="inline-flex items-center gap-1 font-mono text-[11px] hover:text-sky-600 dark:hover:text-sky-400"
                  title={t('common.confirm')}
                >
                  {user.id.slice(0, 13)}...
                  {copiedId ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="submit"
                disabled={!isProfileDirty || isSavingProfile}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50"
              >
                {isSavingProfile ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {t('settings.profile.save')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ---- Sécurité ---- */}
      <div className={cardClass}>
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
          <KeyRound size={16} className="text-sky-500" />
          {t('settings.security.heading')}
        </h2>
        <p className="mt-0.5 text-xs text-slate-400">{t('settings.security.subtitle')}</p>

        <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
          {passwordError && <Alert variant="error" message={passwordError} />}

          <div>
            <label className={labelClass}>{t('settings.security.currentPassword')}</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{t('settings.security.newPassword')}</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('settings.security.confirmPassword')}</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="submit"
              disabled={isSavingPassword || !currentPassword || !newPassword}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {isSavingPassword ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
              {t('settings.security.submit')}
            </button>
          </div>
        </form>
      </div>

      {/* ---- Apparence ---- */}
      <div className={cardClass}>
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t('settings.appearance.heading')}</h2>
        <p className="mt-0.5 text-xs text-slate-400">{t('settings.appearance.subtitle')}</p>

        <div className="mt-5 flex gap-3">
          <button
            onClick={() => theme === 'dark' && toggleTheme()}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-bold transition-colors ${
              theme === 'light'
                ? 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <Sun size={16} />
            {t('settings.appearance.light')}
          </button>
          <button
            onClick={() => theme === 'light' && toggleTheme()}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-bold transition-colors ${
              theme === 'dark'
                ? 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <Moon size={16} />
            {t('settings.appearance.dark')}
          </button>
        </div>
      </div>

      {/* ---- Langue ---- */}
      <div className={cardClass}>
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
          <Globe size={16} className="text-sky-500" />
          {t('settings.language.heading')}
        </h2>
        <p className="mt-0.5 text-xs text-slate-400">{t('settings.language.subtitle')}</p>

        <div className="mt-5 flex gap-3">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => changeLanguage(lang)}
              className={`flex-1 rounded-xl border-2 py-3 text-sm font-bold transition-colors ${
                i18n.language === lang
                  ? 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {t(`settings.language.${lang}`)}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Zone de danger ---- */}
      {(user.role === 'STUDENT' || user.role === 'INSTRUCTOR') && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50/60 p-6 dark:border-rose-500/20 dark:bg-rose-500/5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-rose-700 dark:text-rose-400">
            <Trash2 size={16} />
            {t('settings.dangerZone.heading')}
          </h2>
          <p className="mt-0.5 text-xs text-rose-600/80 dark:text-rose-400/70">{t('settings.dangerZone.subtitle')}</p>

          <div className="mt-5 flex justify-end border-t border-rose-200/60 pt-4 dark:border-rose-500/20">
            <button
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {isDeletingAccount ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              {t('settings.dangerZone.deleteButton')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
