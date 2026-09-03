import { Link } from 'react-router-dom'
import { ROLE_LABELS } from '../api/types'
import { useAuth } from '../auth/AuthContext'

export function WelcomePage() {
  const { user, logout } = useAuth()
  const roleLabel = user ? ROLE_LABELS[user.role] : ''

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4 text-center dark:bg-slate-950">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-600 text-2xl font-black text-white shadow-xl shadow-indigo-500/20">
        AI
      </div>

      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
          Bienvenue, {user?.first_name || user?.email} 👋
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Votre compte <span className="font-bold text-indigo-600 dark:text-indigo-400">{roleLabel}</span> est actif. Accédez à vos espaces de travail ci-dessous.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {(user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN') && (
          <Link
            to="/formateur"
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 active:scale-95"
          >
            <span>Accéder à l'Espace Formateur 👨‍🏫</span>
          </Link>
        )}

        {(user?.role === 'STUDENT' || user?.role === 'ADMIN') && (
          <Link
            to="/apprenant"
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-6 py-3 text-xs font-extrabold text-white shadow-lg shadow-sky-500/25 hover:bg-sky-700 active:scale-95"
          >
            <span>Accéder à l'Espace Apprenant 🎓</span>
          </Link>
        )}

        {user?.role === 'ADMIN' && (
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-xs font-extrabold text-white shadow-lg hover:bg-slate-800 active:scale-95 dark:bg-slate-800"
          >
            <span>Console Admin ⚙️</span>
          </Link>
        )}
      </div>

      <button
        onClick={logout}
        className="mt-4 rounded-2xl border border-slate-200 px-5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
      >
        Se déconnecter
      </button>
    </div>
  )
}
