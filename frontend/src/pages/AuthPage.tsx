import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch, ApiError } from '../api/client'
import type { Category } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Alert } from '../components/Alert'
import { GoogleAuthButton } from '../components/GoogleAuthButton'
import { useTheme } from '../theme/ThemeContext'

type Mode = 'login' | 'register'
type Step = 'form' | 'verify' | 'forgot'

interface GoogleAuthResult {
  status: 'logged_in' | 'verification_required'
  access?: string
  refresh?: string
  email?: string
}

interface AuthPageProps {
  initialMode: Mode
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim()
  const spaceIndex = trimmed.indexOf(' ')
  if (spaceIndex === -1) {
    return { firstName: trimmed, lastName: '' }
  }
  return { firstName: trimmed.slice(0, spaceIndex), lastName: trimmed.slice(spaceIndex + 1) }
}

export function AuthPage({ initialMode }: AuthPageProps) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { login, loginWithTokens } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>(initialMode)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Centres d'intérêt (optionnel) : débloquent gratuitement les outils
  // premium associés à chaque catégorie choisie, une fois le compte créé.
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  useEffect(() => {
    if (mode !== 'register') return
    // Endpoint volontairement non paginé (liste de référence à cocher en
    // entier, pas un catalogue à parcourir) : renvoie un tableau brut.
    apiFetch<Category[]>('/catalogue/categories/', { skipAuth: true })
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [mode])

  function toggleCategory(id: string) {
    setSelectedCategories((current) =>
      current.includes(id) ? current.filter((c) => c !== id) : [...current, id],
    )
  }

  // Étape "vérification" : Google a confirmé un email encore inconnu de la
  // plateforme -> un code à 4 chiffres part par email avant toute création
  // de compte (RG explicitement demandée : Google seul ne suffit pas).
  const [step, setStep] = useState<Step>('form')
  const [pendingEmail, setPendingEmail] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  // Mot de passe oublié : un simple email suffit, la réponse est toujours
  // la même que le compte existe ou non (RF-003, sécurité).
  const [forgotEmail, setForgotEmail] = useState('')
  const [isRequestingReset, setIsRequestingReset] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    // Whenever we switch mode, reset the step to the main form so that
    // if the user came from "forgot password" we don't stay on that
    // screen when they want to register/login.
    setStep('form')
    setForgotSuccess(false)
    setForgotEmail('')
    setVerifyCode('')
  }

  function goToDashboard(role: string) {
    if (role === 'ADMIN') navigate('/admin')
    else if (role === 'INSTRUCTOR') navigate('/formateur')
    else if (role === 'STUDENT') navigate('/apprenant')
    else if (role === 'ETABLISSEMENT_ADMIN') navigate('/etablissement')
    else navigate('/welcome')
  }

  async function handleGoogleSuccess(credential: string) {
    setError(null)
    try {
      const result = await apiFetch<GoogleAuthResult>('/auth/google/', {
        method: 'POST',
        skipAuth: true,
        body: { credential },
      })
      if (result.status === 'logged_in' && result.access && result.refresh) {
        const user = await loginWithTokens({ access: result.access, refresh: result.refresh })
        goToDashboard(user.role)
      } else if (result.status === 'verification_required' && result.email) {
        setPendingEmail(result.email)
        setStep('verify')
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.googleError'))
    }
  }

  async function handleConfirmVerification(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsVerifying(true)
    try {
      const tokens = await apiFetch<{ access: string; refresh: string }>('/auth/google/confirm/', {
        method: 'POST',
        skipAuth: true,
        body: { email: pendingEmail, code: verifyCode.trim() },
      })
      const user = await loginWithTokens(tokens)
      goToDashboard(user.role)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.verify.genericError'))
    } finally {
      setIsVerifying(false)
    }
  }

  function openForgotPassword() {
    setForgotEmail(email.trim())
    setForgotSuccess(false)
    setError(null)
    setStep('forgot')
  }

  async function handleForgotSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsRequestingReset(true)
    try {
      await apiFetch('/auth/password-reset/', {
        method: 'POST',
        skipAuth: true,
        body: { email: forgotEmail.trim() },
      })
      setForgotSuccess(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.forgot.genericError'))
    } finally {
      setIsRequestingReset(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    // Un espace involontaire (autofill, copier-coller) dans l'email rend
    // les identifiants invalides sans que rien ne le laisse deviner à
    // l'écran — on le retire avant l'envoi, jamais côté mot de passe.
    const trimmedEmail = email.trim()
    try {
      if (mode === 'register') {
        const { firstName, lastName } = splitFullName(fullName)
        await apiFetch('/auth/register/', {
          method: 'POST',
          skipAuth: true,
          body: {
            email: trimmedEmail,
            password,
            first_name: firstName,
            last_name: lastName,
            role: 'STUDENT',
            categories_interet: selectedCategories,
          },
        })
      }
      const user = await login(trimmedEmail, password)
      goToDashboard(user.role)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.genericError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className={`relative flex min-h-screen items-center justify-center overflow-x-hidden overflow-y-auto px-4 py-12 transition-colors duration-200 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-sky-50 text-slate-900'
      }`}
    >
      {/* Formes décoratives en fond */}
      <div className={`absolute -top-16 -right-16 h-64 w-64 rotate-12 rounded-[3rem] blur-2xl ${theme === 'dark' ? 'bg-sky-900/40' : 'bg-amber-100/70'}`} />
      <div className={`absolute -bottom-16 -left-16 h-72 w-72 rounded-full blur-2xl ${theme === 'dark' ? 'bg-slate-800/80' : 'bg-sky-100/70'}`} />

      <Link
        to="/"
        className={`absolute top-6 left-6 z-20 text-sm font-semibold hover:underline ${theme === 'dark' ? 'text-sky-300 hover:text-sky-200' : 'text-sky-900'}`}
      >
        {t('auth.backHome')}
      </Link>

      <div className={`relative z-10 w-full max-w-3xl overflow-hidden rounded-[2rem] border shadow-xl sm:min-h-[560px] ${theme === 'dark' ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
        {/* ================= PANNEAU COLORÉ ================= */}
        <div
          className={`flex w-full flex-col items-center justify-center gap-5 bg-gradient-to-br px-8 py-12 text-center text-white transition-transform duration-700 ease-in-out sm:absolute sm:inset-y-0 sm:left-0 sm:w-1/2 ${
            theme === 'dark' ? 'from-slate-900 to-sky-950' : 'from-sky-400 to-sky-600'
          } ${mode === 'register' ? 'sm:translate-x-0' : 'sm:translate-x-full'}`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold">
            AI
          </div>
          {mode === 'register' ? (
            <>
              <h2 className="text-2xl font-bold">{t('auth.loginPanel.title')}</h2>
              <p className="text-sm text-sky-100">{t('auth.loginPanel.subtitle')}</p>
              <button
                onClick={() => switchMode('login')}
                className="mt-2 rounded-full border-2 border-white px-8 py-2.5 text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-white hover:text-sky-900"
              >
                {t('auth.loginPanel.cta')}
              </button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold">{t('auth.registerPanel.title')}</h2>
              <p className="text-sm text-sky-100">{t('auth.registerPanel.subtitle')}</p>
              <button
                onClick={() => switchMode('register')}
                className="mt-2 rounded-full border-2 border-white px-8 py-2.5 text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-white hover:text-sky-900"
              >
                {t('auth.registerPanel.cta')}
              </button>
            </>
          )}
        </div>

        {/* ================= PANNEAU FORMULAIRE ================= */}
        {/* sm:inset-y-0 fixe la hauteur de ce panneau à celle de la carte
            (les éléments en absolute ne contribuent pas à la hauteur du
            parent) : sans overflow-y-auto ici, un formulaire plus haut que
            la carte (ex: la liste de catégories à l'inscription) est
            simplement coupé, sans aucun moyen de le faire défiler. */}
        <div
          className={`w-full overflow-y-auto px-8 py-12 transition-transform duration-700 ease-in-out sm:absolute sm:inset-y-0 sm:left-0 sm:w-1/2 ${
            theme === 'dark' ? 'bg-slate-900' : 'bg-white'
          } ${mode === 'register' ? 'sm:translate-x-full' : 'sm:translate-x-0'}`}
        >
          {step === 'verify' ? (
            <>
              <h1 className={`mb-2 text-center text-2xl font-bold ${theme === 'dark' ? 'text-sky-400' : 'text-sky-700'}`}>{t('auth.verify.title')}</h1>
              <p className={`mb-6 text-center text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('auth.verify.subtitle', { email: pendingEmail })}
              </p>

              <form onSubmit={handleConfirmVerification} className="space-y-4">
                {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}

                <div>
                  <label htmlFor="verifyCode" className={`mb-1 block text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t('auth.verify.codeLabel')}
                  </label>
                  <input
                    id="verifyCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    required
                    autoFocus
                    value={verifyCode}
                    onChange={(event) => setVerifyCode(event.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="0000"
                    className={`w-full rounded-full border px-5 py-3 text-center text-lg font-bold tracking-[0.5em] transition-colors focus:outline-none ${theme === 'dark' ? 'border-slate-700 bg-slate-800 text-slate-100 focus:border-sky-400 focus:bg-slate-700' : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-sky-500 focus:bg-white'}`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isVerifying || verifyCode.length !== 4}
                  className="mt-4 w-full rounded-full bg-sky-500 py-3 text-sm font-semibold tracking-wide text-white uppercase shadow-sm transition-all hover:bg-sky-600 disabled:opacity-50"
                >
                  {isVerifying ? t('auth.submitting') : t('auth.verify.submit')}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('form')
                    setVerifyCode('')
                    setError(null)
                  }}
                  className={`w-full text-center text-xs font-semibold hover:text-sky-600 ${theme === 'dark' ? 'text-slate-400 hover:text-sky-400' : 'text-slate-400 hover:text-sky-600'}`}
                >
                  {t('auth.verify.back')}
                </button>
              </form>
            </>
          ) : step === 'forgot' ? (
            <>
              <h1 className={`mb-2 text-center text-2xl font-bold ${theme === 'dark' ? 'text-sky-400' : 'text-sky-700'}`}>{t('auth.forgot.title')}</h1>
              <p className={`mb-6 text-center text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{t('auth.forgot.subtitle')}</p>

              {forgotSuccess ? (
                <div className="space-y-4">
                  <Alert variant="success" message={t('auth.forgot.success')} />
                  <button
                    type="button"
                    onClick={() => setStep('form')}
                    className={`w-full text-center text-xs font-semibold hover:text-sky-600 ${theme === 'dark' ? 'text-slate-400 hover:text-sky-400' : 'text-slate-400 hover:text-sky-600'}`}
                  >
                    {t('auth.forgot.back')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}

                  <div>
                    <label htmlFor="forgotEmail" className="mb-1 block text-xs font-semibold text-slate-500 uppercase">
                      {t('auth.emailLabel')}
                    </label>
                    <input
                      id="forgotEmail"
                      type="email"
                      required
                      autoFocus
                      placeholder={t('auth.emailPlaceholder')}
                      value={forgotEmail}
                      onChange={(event) => setForgotEmail(event.target.value)}
                      className={`w-full rounded-full border px-5 py-3 text-sm transition-colors focus:outline-none ${theme === 'dark' ? 'border-slate-700 bg-slate-800 text-slate-100 focus:border-sky-400 focus:bg-slate-700' : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-sky-500 focus:bg-white'}`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isRequestingReset}
                    className="mt-4 w-full rounded-full bg-sky-500 py-3 text-sm font-semibold tracking-wide text-white uppercase shadow-sm transition-all hover:bg-sky-600 disabled:opacity-50"
                  >
                    {isRequestingReset ? t('auth.submitting') : t('auth.forgot.submit')}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep('form')
                      setError(null)
                    }}
                    className={`w-full text-center text-xs font-semibold hover:text-sky-600 ${theme === 'dark' ? 'text-slate-400 hover:text-sky-400' : 'text-slate-400 hover:text-sky-600'}`}
                  >
                    {t('auth.forgot.back')}
                  </button>
                </form>
              )}
            </>
          ) : (
          <>
          <h1 className={`mb-6 text-center text-2xl font-bold ${theme === 'dark' ? 'text-sky-400' : 'text-sky-700'}`}>
            {mode === 'register' ? t('auth.formTitle.register') : t('auth.formTitle.login')}
          </h1>

          <div className="mb-5">
            <GoogleAuthButton onSuccess={handleGoogleSuccess} onError={() => setError(t('auth.googleError'))} />
          </div>

          <div className="mb-5 flex items-center gap-3">
            <div className={`h-px flex-1 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`} />
            <span className={`text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-400'}`}>{t('auth.orDivider')}</span>
            <div className={`h-px flex-1 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="error" message={error} onClose={() => setError(null)} />
            )}

            {mode === 'register' && (
              <div>
                <label htmlFor="fullName" className={`mb-1 block text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('auth.fullNameLabel')}
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  placeholder={t('auth.fullNamePlaceholder')}
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className={`w-full rounded-full border px-5 py-3 text-sm transition-colors focus:outline-none ${theme === 'dark' ? 'border-slate-700 bg-slate-800 text-slate-100 focus:border-sky-400 focus:bg-slate-700' : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-sky-500 focus:bg-white'}`}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className={`mb-1 block text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('auth.emailLabel')}
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={`w-full rounded-full border px-5 py-3 text-sm transition-colors focus:outline-none ${theme === 'dark' ? 'border-slate-700 bg-slate-800 text-slate-100 focus:border-sky-400 focus:bg-slate-700' : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-sky-500 focus:bg-white'}`}
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label htmlFor="password" className={`block text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('auth.passwordLabel')}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={openForgotPassword}
                    className="text-xs font-semibold text-sky-600 hover:underline"
                  >
                    {t('auth.forgotLink')}
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`w-full rounded-full border py-3 pl-5 pr-12 text-sm transition-colors focus:outline-none ${theme === 'dark' ? 'border-slate-700 bg-slate-800 text-slate-100 focus:border-sky-400 focus:bg-slate-700' : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-sky-500 focus:bg-white'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {mode === 'register' && categories.length > 0 && (
              <div>
                <label className={`mb-1 block text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('auth.categoriesInteretLabel')}
                </label>
                <p className={`mb-2 text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {t('auth.categoriesInteretHint')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => {
                    const isChecked = selectedCategories.includes(category.id)
                    return (
                      <label
                        key={category.id}
                        className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          isChecked
                            ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-500 dark:bg-sky-500/10 dark:text-sky-300'
                            : theme === 'dark'
                              ? 'border-slate-700 text-slate-300 hover:border-slate-600'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCategory(category.id)}
                          className="sr-only"
                        />
                        {category.nom}
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-4 w-full rounded-full bg-sky-500 py-3 text-sm font-semibold tracking-wide text-white uppercase shadow-sm transition-all hover:bg-sky-600 disabled:opacity-50"
            >
              {isSubmitting ? t('auth.submitting') : mode === 'register' ? t('auth.submit.register') : t('auth.submit.login')}
            </button>
          </form>
          </>
          )}
        </div>
      </div>
    </div>
  )
}
