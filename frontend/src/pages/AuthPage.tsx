import { Eye, EyeOff } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Alert } from '../components/Alert'

type Mode = 'login' | 'register'

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
  const { login } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>(initialMode)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      if (mode === 'register') {
        const { firstName, lastName } = splitFullName(fullName)
        await apiFetch('/auth/register/', {
          method: 'POST',
          skipAuth: true,
          body: { email, password, first_name: firstName, last_name: lastName, role: 'STUDENT' },
        })
      }
      const user = await login(email, password)
      if (user.role === 'ADMIN') {
        navigate('/admin')
      } else if (user.role === 'INSTRUCTOR') {
        navigate('/formateur')
      } else if (user.role === 'STUDENT') {
        navigate('/apprenant')
      } else {
        navigate('/welcome')
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible de contacter le serveur.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-sky-50 px-4 py-12">
      {/* Formes décoratives en fond */}
      <div className="absolute -top-16 -right-16 h-64 w-64 rotate-12 rounded-[3rem] bg-amber-100/70 blur-2xl"></div>
      <div className="absolute -bottom-16 -left-16 h-72 w-72 rounded-full bg-sky-100/70 blur-2xl"></div>

      <Link
        to="/"
        className="absolute top-6 left-6 z-20 text-sm font-semibold text-sky-900 hover:underline"
      >
        ← AI Learning
      </Link>

      <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-xl sm:min-h-[560px]">
        {/* ================= PANNEAU COLORÉ ================= */}
        <div
          className={`flex w-full flex-col items-center justify-center gap-5 bg-gradient-to-br from-sky-400 to-sky-600 px-8 py-12 text-center text-white transition-transform duration-700 ease-in-out sm:absolute sm:inset-y-0 sm:left-0 sm:w-1/2 ${
            mode === 'register' ? 'sm:translate-x-0' : 'sm:translate-x-full'
          }`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold">
            AI
          </div>
          {mode === 'register' ? (
            <>
              <h2 className="text-2xl font-bold">Bon retour !</h2>
              <p className="text-sm text-sky-100">
                Vous avez déjà un compte ? Connectez-vous pour reprendre votre parcours.
              </p>
              <button
                onClick={() => switchMode('login')}
                className="mt-2 rounded-full border-2 border-white px-8 py-2.5 text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-white hover:text-sky-900"
              >
                Se connecter
              </button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold">Bienvenue !</h2>
              <p className="text-sm text-sky-100">
                Nouveau sur AI Learning ? Créez votre compte apprenant en quelques secondes.
              </p>
              <button
                onClick={() => switchMode('register')}
                className="mt-2 rounded-full border-2 border-white px-8 py-2.5 text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-white hover:text-sky-900"
              >
                S'inscrire
              </button>
            </>
          )}
        </div>

        {/* ================= PANNEAU FORMULAIRE ================= */}
        <div
          className={`w-full px-8 py-12 transition-transform duration-700 ease-in-out sm:absolute sm:inset-y-0 sm:left-0 sm:w-1/2 ${
            mode === 'register' ? 'sm:translate-x-full' : 'sm:translate-x-0'
          }`}
        >
          <h1 className="mb-6 text-center text-2xl font-bold text-sky-700">
            {mode === 'register' ? 'Créer un compte' : 'Connexion'}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="error" message={error} onClose={() => setError(null)} />
            )}

            {mode === 'register' && (
              <div>
                <label htmlFor="fullName" className="mb-1 block text-xs font-semibold text-slate-500 uppercase">
                  Nom complet
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  placeholder="ex : Jean Dupont"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="w-full rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:bg-white focus:outline-none"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1 block text-xs font-semibold text-slate-500 uppercase">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="nom@exemple.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-xs font-semibold text-slate-500 uppercase">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-full border border-slate-200 bg-slate-50 py-3 pl-5 pr-12 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-4 w-full rounded-full bg-sky-500 py-3 text-sm font-semibold tracking-wide text-white uppercase shadow-sm transition-all hover:bg-sky-600 disabled:opacity-50"
            >
              {isSubmitting ? 'Un instant...' : mode === 'register' ? "S'inscrire" : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
