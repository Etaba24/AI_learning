import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PublicPricingSection } from '../components/PublicPricingSection'

export function PublicAbonnementsPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col justify-between">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-lg font-bold text-white shadow-md shadow-sky-500/20">
              AI
            </div>
            <span className="text-xl font-extrabold tracking-tight text-sky-700 dark:text-sky-400">AI Learning</span>
          </Link>

          <nav className="hidden items-center space-x-8 text-sm font-medium text-slate-500 md:flex dark:text-slate-400">
            <Link to="/#apropos" className="transition-colors hover:text-sky-600 dark:hover:text-sky-400">
              À propos
            </Link>
            <Link to="/#formations" className="transition-colors hover:text-sky-600 dark:hover:text-sky-400">
              Nos formations
            </Link>
            <Link to="/#services" className="transition-colors hover:text-sky-600 dark:hover:text-sky-400">
              Nos services
            </Link>
            <Link to="/abonnements" className="font-bold text-sky-600 dark:text-sky-400 border-b-2 border-sky-500 pb-0.5">
              Abonnements
            </Link>
            <Link to="/#roles" className="transition-colors hover:text-sky-600 dark:hover:text-sky-400">
              Espaces
            </Link>
            <Link to="/#temoignages" className="transition-colors hover:text-sky-600 dark:hover:text-sky-400">
              Témoignages
            </Link>
            <Link to="/#contact" className="transition-colors hover:text-sky-600 dark:hover:text-sky-400">
              Nous contacter
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:text-sky-700 sm:px-4 dark:text-slate-300 dark:hover:text-white"
            >
              Se connecter
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sky-600 sm:px-5"
            >
              Créer un compte
            </Link>
            <button
              onClick={() => setIsMenuOpen((open) => !open)}
              className="ml-1 text-xl text-slate-500 hover:text-slate-700 md:hidden dark:text-slate-400"
              aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {isMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <nav className="flex flex-col gap-1 border-t border-slate-100 bg-white px-4 py-3 text-sm font-medium text-slate-600 md:hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <Link to="/#apropos" className="rounded px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
              À propos
            </Link>
            <Link to="/#formations" className="rounded px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
              Nos formations
            </Link>
            <Link to="/#services" className="rounded px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
              Nos services
            </Link>
            <Link to="/abonnements" className="rounded px-2 py-2 font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40">
              Abonnements
            </Link>
            <Link to="/#roles" className="rounded px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
              Espaces
            </Link>
            <Link to="/#temoignages" className="rounded px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
              Témoignages
            </Link>
            <Link to="/#contact" className="rounded px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
              Nous contacter
            </Link>
          </nav>
        )}
      </header>

      {/* ================= SECTION TARIFS ================= */}
      <main className="flex-1">
        <PublicPricingSection />
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-slate-100 bg-slate-50 py-10 text-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:px-6 lg:flex-row lg:px-8">
          <Link to="/" className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-sm font-bold text-white">
              AI
            </div>
            <span className="font-bold text-slate-700 dark:text-slate-200">AI Learning</span>
          </Link>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            © {new Date().getFullYear()} AI Learning. Tous droits réservés.
          </p>
          <div className="flex items-center space-x-6 text-xs text-slate-500 dark:text-slate-400">
            <Link to="/" className="hover:text-sky-600 dark:hover:text-sky-400">
              Accueil
            </Link>
            <Link to="/abonnements" className="font-semibold text-sky-600 dark:text-sky-400">
              Abonnements
            </Link>
            <Link to="/#contact" className="hover:text-sky-600 dark:hover:text-sky-400">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
