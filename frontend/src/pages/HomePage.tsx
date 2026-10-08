import { Moon, Sun, Globe, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, ApiError } from '../api/client'
import { ROLE_LABELS } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { useTheme } from '../theme/ThemeContext'

// Photos de personnes via pravatar.cc (placeholders libres, pas de compte requis) —
// à remplacer par de vraies photos/illustrations lors du travail de charte graphique (section 11).
const avatar = (id: number, size = 300) => `https://i.pravatar.cc/${size}?img=${id}`
const COMMUNITY_AVATARS = [5, 12, 23, 44, 61, 15]

const STEPS = [
  { title: 'Apprendre', text: 'Des formations structurées en modules et leçons : vidéos, textes, ressources.', bg: 'bg-sky-50', color: 'text-sky-700' },
  { title: 'Pratiquer', text: 'Des exercices et des quiz pour mettre en application chaque notion.', bg: 'bg-sky-50', color: 'text-sky-700' },
  { title: 'Être évalué', text: 'Un score et une progression suivie sur chaque leçon.', bg: 'bg-emerald-50', color: 'text-emerald-700' },
  { title: 'Progresser', text: "Comprendre ses erreurs et avancer, accompagné par un tuteur IA contextuel.", bg: 'bg-amber-50', color: 'text-amber-700' },
]

// NAV_LINKS moved inside component to support translations via `t()`

const TESTIMONIALS = [
  {
    name: 'Sophie Martin',
    role: 'Apprenante en Développement Web',
    avatarId: 32,
    rating: 5,
    comment:
      "La structuration des leçons avec la vidéo, le cours textuel et les exercices obligatoires à la fin change complètement la donne ! Le tuteur IA m'a débloquée en 2 minutes sur un blocage de code.",
    tag: 'Étudiante',
  },
  {
    name: 'Thomas Dubois',
    role: 'Formateur Senior en IA & Data',
    avatarId: 12,
    rating: 5,
    comment:
      "En tant que formateur, la plateforme me permet de concevoir des modules complets et de suivre la progression réelle de mes étudiants. L'interface est intuitive et très haute gamme.",
    tag: 'Formateur',
  },
  {
    name: 'Amadou Diallo',
    role: 'Apprenant en Développement Mobile',
    avatarId: 68,
    rating: 5,
    comment:
      "La clarté des modules et le système de validation des leçons obligent à vraiment pratiquer. J'ai énormément progressé en Flutter grâce à cette plateforme. Je recommande à 100% !",
    tag: 'Apprenant assidu',
  },
  {
    name: 'Claire Vance',
    role: 'Ingénieure DevOps & Apprenante',
    avatarId: 44,
    rating: 5,
    comment:
      "L'expérience utilisateur est tout simplement au top. Pas de fioritures inutiles, l'apprentissage est fluide, les exercices sont pertinents et l'assistance IA est vraiment impressionnante.",
    tag: 'Ingénieure',
  },
]

// lucide-react n'expose plus les icônes de marques (retirées pour des
// raisons de droits d'usage) -> petits glyphes SVG maison, même esprit que
// le globe dessiné à la main plus bas dans cette page.
function FacebookGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.91h-2.34v7.03C18.34 21.24 22 17.08 22 12.06Z" />
    </svg>
  )
}
function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}
function LinkedinGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M6.94 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM3.2 8.75h3.5V21H3.2V8.75Zm6.3 0h3.36v1.68h.05c.47-.88 1.6-1.8 3.3-1.8 3.53 0 4.18 2.33 4.18 5.35V21h-3.5v-5.5c0-1.31-.02-3-1.83-3-1.83 0-2.11 1.43-2.11 2.9V21H9.5V8.75Z" />
    </svg>
  )
}
function XGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.24 3h2.83l-6.19 7.07L22 21h-5.7l-4.47-5.85L6.7 21H3.86l6.62-7.57L2 3h5.85l4.04 5.34L18.24 3Zm-.99 16.2h1.57L7.33 4.72H5.64L17.25 19.2Z" />
    </svg>
  )
}
function YoutubeGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 5 12 5 12 5s-6 0-7.7.3a2.7 2.7 0 0 0-1.9 1.9A28 28 0 0 0 2 12a28 28 0 0 0 .4 4.8 2.7 2.7 0 0 0 1.9 1.9C6 19 12 19 12 19s6 0 7.7-.3a2.7 2.7 0 0 0 1.9-1.9A28 28 0 0 0 22 12a28 28 0 0 0-.4-4.8ZM10 15.3V8.7L15.8 12 10 15.3Z" />
    </svg>
  )
}

// Liens vers les réseaux sociaux de la plateforme (pied de page, section
// contact) — placeholders « # » en attendant les vraies URLs des comptes ;
// à remplacer avant mise en production, ne pointe nulle part pour l'instant.
const SOCIAL_LINKS = [
  { name: 'Facebook', href: '#', icon: FacebookGlyph },
  { name: 'Instagram', href: '#', icon: InstagramGlyph },
  { name: 'LinkedIn', href: '#', icon: LinkedinGlyph },
  { name: 'X (Twitter)', href: '#', icon: XGlyph },
  { name: 'YouTube', href: '#', icon: YoutubeGlyph },
]

// Réseau "international" superposé au globe (section À propos) : 7 points
// répartis uniformément autour du hub central (128,128 dans un viewBox 256).
const HUB = { x: 128, y: 128 }
const NETWORK_POINTS = [
  [128, 33],
  [202, 69],
  [221, 149],
  [169, 214],
  [87, 214],
  [35, 149],
  [54, 69],
]

/** Chemin courbe (quadratique) du hub vers un point, avec un contrôle décalé
 * perpendiculairement -> arcs de "route aérienne" plutôt que des traits droits. */
function arcPath(x2: number, y2: number): string {
  const mx = (HUB.x + x2) / 2
  const my = (HUB.y + y2) / 2
  const dx = x2 - HUB.x
  const dy = y2 - HUB.y
  const len = Math.hypot(dx, dy) || 1
  const offset = 22
  const cx = mx + (-dy / len) * offset
  const cy = my + (dx / len) * offset
  return `M ${HUB.x} ${HUB.y} Q ${cx} ${cy} ${x2} ${y2}`
}

export function HomePage() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme, setTheme } = useTheme()
  const { i18n, t } = useTranslation()

  const NAV_LINKS = [
    { href: '#apropos', label: t('home.nav.apropos') },
    { href: '#formations', label: t('home.nav.formations') },
    { href: '#services', label: t('home.nav.services') },
    { href: '/abonnements', label: t('home.nav.abonnements') },
    { href: '#roles', label: t('home.nav.roles') },
    { href: '#temoignages', label: t('home.nav.temoignages') },
    { href: '#contact', label: t('home.nav.contact') },
  ]

  function toggleLanguage() {
    const next = i18n.language === 'fr' ? 'en' : 'fr'
    i18n.changeLanguage(next)
  }

  const [activeTestimonial, setActiveTestimonial] = useState<number | null>(null)
  const [likedTestimonials, setLikedTestimonials] = useState<Record<number, boolean>>({})

  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [contactStatus, setContactStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [contactError, setContactError] = useState<string | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  async function handleContactSubmit(event: FormEvent) {
    event.preventDefault()
    setContactStatus('sending')
    setContactError(null)
    try {
      await apiFetch('/contact/', {
        method: 'POST',
        skipAuth: true,
        body: { name: contactName, email: contactEmail, message: contactMessage },
      })
      setContactStatus('sent')
      setContactName('')
      setContactEmail('')
      setContactMessage('')
    } catch (err) {
      setContactStatus('error')
      setContactError(err instanceof ApiError ? err.message : 'Impossible d\'envoyer le message.')
    }
  }

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (href.startsWith('#')) {
      e.preventDefault()
      const targetId = href.replace('#', '')
      const elem = document.getElementById(targetId)
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      setIsMenuOpen(false)
    }
  }

  // Utilisateur déjà connecté qui revient sur "/" : pas de sens de lui remontrer
  // la page vitrine + les liens de connexion/inscription.
  if (user) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden bg-sky-50 px-4 text-center dark:bg-slate-950 dark:text-slate-100">
        <div className="pointer-events-none absolute -top-10 -left-10 h-72 w-72 rounded-full bg-sky-200/60 blur-3xl dark:bg-sky-500/10"></div>
        <div className="pointer-events-none absolute -bottom-10 -right-10 h-72 w-72 rounded-full bg-amber-200/50 blur-3xl dark:bg-amber-500/10"></div>
        <img
          src={avatar(32, 160)}
          alt=""
          className="relative h-24 w-24 rounded-full border-4 border-white/80 object-cover shadow-lg backdrop-blur-sm backdrop-saturate-150"
        />
        <div className="relative max-w-lg rounded-3xl border border-white/60 bg-white/50 p-8 shadow-[0_8px_32px_rgba(31,38,135,0.1)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-slate-900/22">
          <h1 className="mb-3 text-2xl font-bold text-sky-700 dark:text-sky-400">
            Bienvenue, {user.first_name || user.email}
          </h1>
          <p className="mb-8 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Votre compte <span className="font-semibold text-sky-700 dark:text-sky-400">{ROLE_LABELS[user.role] ?? user.role}</span>{' '}
            est bien actif. L'espace complet dédié ({ROLE_LABELS[user.role] ?? ''} : formations,
            progression, assistant IA...) arrive dans un prochain incrément.
          </p>
          <button
            onClick={logout}
            className="w-full rounded-xl border border-white/60 bg-white/40 px-5 py-3 text-sm font-semibold text-slate-700 backdrop-blur-sm backdrop-saturate-150 transition-all hover:bg-white/70 dark:border-white/10 dark:bg-slate-800/25 dark:text-slate-200 dark:hover:bg-slate-700/70"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    )
  }

  return (
    // `isolate` : sans ça, le calque de halo (position fixed + z-index
    // négatif) s'échappe du contexte d'empilement de ce conteneur et finit
    // peint SOUS le fond de n'importe quel élément non positionné plus loin
    // dans la page (y compris ce <div> bg-white lui-même) — c'est ce qui le
    // rendait invisible malgré un CSS par ailleurs correct.
    <div className="isolate min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* ================= FOND "VERRE LIQUIDE" UNIQUE ET CONTINU =================
          Un seul calque de halos, fixe (pas re-décalé/coupé à chaque section) —
          les panneaux translucides défilent par-dessus, la couleur qu'ils
          laissent transparaître reste cohérente du haut en bas de la page. */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-white dark:bg-slate-950">
        <div className="absolute -top-10 -left-10 h-[30rem] w-[30rem] rounded-full bg-sky-400/70 blur-2xl dark:bg-sky-400/60"></div>
        <div className="absolute top-10 right-0 h-[26rem] w-[26rem] rounded-full bg-amber-400/60 blur-2xl dark:bg-amber-400/55"></div>
        <div className="absolute bottom-0 left-10 h-[26rem] w-[26rem] rounded-full bg-emerald-400/60 blur-2xl dark:bg-emerald-400/55"></div>
        <div className="absolute right-10 bottom-0 h-[30rem] w-[30rem] rounded-full bg-fuchsia-400/55 blur-2xl dark:bg-fuchsia-400/55"></div>
      </div>

      {/* ================= BANDEAU D'ANNONCE ================= */}
      <div className="overflow-hidden border-b border-sky-100 bg-sky-50 py-2.5 text-xs whitespace-nowrap text-sky-900 dark:border-sky-900/60 dark:bg-slate-900 dark:text-sky-200">
        <div className="inline-flex animate-[marquee_25s_linear_infinite] space-x-12">
          <span>✦ {t('home.banner.item1')}</span>
          <span>✦ {t('home.banner.item2')}</span>
          <span>✦ {t('home.banner.item3')}</span>
        </div>
      </div>

      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-md backdrop-saturate-150 dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-lg font-bold text-white">
              AI
            </div>
            <span className="text-xl font-extrabold tracking-tight text-sky-700 dark:text-sky-400">AI Learning</span>
          </div>
          <nav className="hidden items-center space-x-8 text-sm font-medium text-slate-500 md:flex dark:text-slate-300">
            {NAV_LINKS.map((link) =>
              link.href.startsWith('/') ? (
                <Link
                  key={link.href}
                  to={link.href}
                  className="transition-colors hover:text-sky-900 cursor-pointer"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="transition-colors hover:text-sky-900 cursor-pointer"
                >
                  {link.label}
                </a>
              )
            )}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/40 text-slate-600 backdrop-blur-md backdrop-saturate-150 transition-colors hover:border-sky-200 hover:bg-white/70 hover:text-sky-700 dark:border-white/10 dark:bg-slate-900/22 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:bg-slate-800/60 dark:hover:text-sky-400"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setTheme('light')}
              title="Réinitialiser le thème"
              aria-label="Réinitialiser le thème"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/40 text-slate-600 backdrop-blur-md backdrop-saturate-150 transition-colors hover:border-sky-200 hover:bg-white/70 hover:text-sky-700 dark:border-white/10 dark:bg-slate-900/22 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:bg-slate-800/60 dark:hover:text-sky-400"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={toggleLanguage}
              aria-label={t ? t('lang.toggle') : 'Toggle language'}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/40 text-slate-600 backdrop-blur-md backdrop-saturate-150 transition-colors hover:border-sky-200 hover:bg-white/70 hover:text-sky-700 dark:border-white/10 dark:bg-slate-900/22 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:bg-slate-800/60 dark:hover:text-sky-400"
            >
              <Globe className="h-4 w-4" />
            </button>
            <Link
              to="/login"
              className="px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:text-sky-700 sm:px-4 dark:text-slate-300 dark:hover:text-sky-400"
            >
              {t('auth.loginPanel.cta')}
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sky-600 sm:px-5"
            >
              {t('auth.registerPanel.cta')}
            </Link>
            <button
              onClick={() => setIsMenuOpen((open) => !open)}
              className="ml-1 text-xl text-slate-500 hover:text-slate-700 md:hidden dark:text-slate-300 dark:hover:text-slate-100"
              aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {isMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <nav className="flex flex-col gap-1 border-t border-white/60 bg-white/80 px-4 py-3 text-sm font-medium text-slate-600 backdrop-blur-xl backdrop-saturate-150 md:hidden dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-300">
            {NAV_LINKS.map((link) =>
              link.href.startsWith('/') ? (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded px-2 py-2 transition-colors hover:bg-slate-50 hover:text-sky-900 cursor-pointer dark:hover:bg-slate-800 dark:hover:text-sky-400"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="rounded px-2 py-2 transition-colors hover:bg-slate-50 hover:text-sky-900 cursor-pointer dark:hover:bg-slate-800 dark:hover:text-sky-400"
                >
                  {link.label}
                </a>
              )
            )}
          </nav>
        )}
      </header>

      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-24">
          <div className="text-center lg:col-span-6 lg:text-left">
            <div className="mb-6 inline-flex items-center rounded-full border border-white/60 bg-white/50 px-4 py-1.5 text-xs font-semibold text-sky-800 shadow-[0_4px_16px_rgba(2,132,199,0.1)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-slate-900/22 dark:text-sky-300">
              {t('home.hero.badge')}
            </div>
            <h1 className="mb-6 text-4xl leading-[1.15] font-extrabold tracking-tight text-sky-700 sm:text-5xl dark:text-sky-400">
              {t('home.hero.title')}
            </h1>
            <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-slate-600 lg:mx-0 dark:text-slate-300">
              {t('home.hero.subtitle')}
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
              <Link
                to="/register"
                className="rounded-full bg-sky-500 px-8 py-4 text-center font-semibold text-white shadow-lg shadow-sky-950/10 transition-all hover:bg-sky-600"
              >
                {t('home.hero.ctaPrimary')}
              </Link>
              <a
                href="#parcours"
                className="rounded-full border border-slate-200 bg-white px-8 py-4 text-center font-semibold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {t('home.hero.ctaSecondary')}
              </a>
            </div>
          </div>

          <div className="relative lg:col-span-6">
            <div className="relative mx-auto max-w-md">
              <div className="absolute -top-10 -right-10 -z-10 h-40 w-40 rounded-full bg-amber-200/60 blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 -z-10 h-48 w-48 rounded-full bg-sky-300/50 blur-3xl"></div>
              <div className="absolute top-1/3 -left-6 -z-10 h-32 w-32 rounded-full bg-emerald-200/50 blur-3xl"></div>

              {/* Ligne de temps + point lumineux qui voyage de carte en carte */}
              <div className="absolute top-10 bottom-10 left-6 w-px bg-slate-200"></div>
              <div className="absolute left-6 z-20 h-3 w-3 -translate-x-1/2 animate-[travel-dot_8s_ease-in-out_infinite] rounded-full bg-sky-600 shadow-[0_0_0_5px_rgba(2,132,199,0.15)]"></div>

              {/* Cartes "verre liquide" : fond translucide + flou laissant
                  passer la couleur des halos ci-dessus, liseré clair en haut
                  (reflet) façon verre dépoli — pas de bg-white opaque. */}
              <div className="space-y-5">
                <div className="relative ml-4 flex animate-[card-glow-1_8s_ease-in-out_infinite] items-start gap-4 overflow-hidden rounded-2xl border border-white/60 bg-white/40 p-5 shadow-[0_8px_32px_rgba(31,38,135,0.12)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-slate-900/22">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/20" />
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-50/80 text-xs font-bold text-sky-700 backdrop-blur-sm backdrop-saturate-150 dark:bg-sky-950/50 dark:text-sky-300">
                    1
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-sky-700 dark:text-sky-400">Vous posez une question</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      "Je ne comprends pas cette notion dans la leçon en cours."
                    </p>
                  </div>
                </div>

                <div className="relative ml-4 flex animate-[card-glow-2_8s_ease-in-out_infinite] items-start gap-4 overflow-hidden rounded-2xl border border-white/60 bg-white/40 p-5 shadow-[0_8px_32px_rgba(31,38,135,0.12)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-slate-900/22">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/20" />
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-50/80 text-xs font-bold text-sky-700 backdrop-blur-sm backdrop-saturate-150 dark:bg-sky-950/50 dark:text-sky-300">
                    2
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-sky-700 dark:text-sky-400">L'IA analyse le contexte</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Formation, module, leçon et niveau de progression.
                    </p>
                  </div>
                </div>

                <div className="relative ml-4 flex animate-[card-glow-3_8s_ease-in-out_infinite] items-start gap-4 overflow-hidden rounded-2xl border border-white/60 bg-white/40 p-5 shadow-[0_8px_32px_rgba(31,38,135,0.12)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-slate-900/22">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/20" />
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50/80 text-xs font-bold text-emerald-700 backdrop-blur-sm backdrop-saturate-150 dark:bg-emerald-950/40 dark:text-emerald-300">
                    3
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-sky-700 dark:text-sky-400">Vous recevez une réponse claire</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Une explication adaptée à votre leçon, pas générique.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= À PROPOS ================= */}
      <section id="apropos" className="py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <span className="mb-4 inline-block text-xs font-semibold tracking-wide text-sky-700 uppercase dark:text-sky-400">
              À propos
            </span>
            <h2 className="mb-6 text-3xl font-extrabold text-sky-700 dark:text-sky-400">
              Pas un simple catalogue de cours
            </h2>
            <p className="mb-4 leading-relaxed text-slate-600 dark:text-slate-300">
              AI Learning couvre tout le cycle d'apprentissage : apprendre, pratiquer, être
              évalué, comprendre ses erreurs et progresser. L'objectif n'est pas d'empiler des
              vidéos, mais de construire un accompagnement complet.
            </p>
            <p className="leading-relaxed text-slate-600 dark:text-slate-300">
              Au centre de cet accompagnement, un tuteur IA pédagogique contextuel — pas un
              chatbot généraliste. Il comprend la formation suivie, le module et la leçon en
              cours, votre niveau et votre progression, pour rester toujours pertinent et
              jamais hors sujet.
            </p>
          </div>
          <div>
          <div className="relative mx-auto flex h-72 w-72 items-center justify-center">
            <div className="absolute -top-6 -right-6 -z-10 h-32 w-32 rounded-full bg-amber-100/70 blur-2xl"></div>

            {/* Anneau pointillé qui tourne lentement autour du globe -> renforce
                l'impression de réseau actif, indépendamment de la rotation du globe. */}
            <div
              className="absolute inset-0 animate-spin rounded-full border-2 border-dashed border-sky-200"
              style={{ animationDuration: '40s' }}
            ></div>
            <div
              className="absolute inset-3 animate-spin rounded-full border border-dotted border-amber-200"
              style={{ animationDuration: '28s', animationDirection: 'reverse' }}
            ></div>

            {/* Globe tournant : une vraie carte du monde (projection équirectangulaire,
                se raccorde parfaitement à l'horizontale) qui défile en boucle, teintée
                en bleu pour matcher le thème, avec un éclairage superposé pour l'effet
                de sphère. */}
            <div className="relative h-64 w-64 overflow-hidden rounded-full bg-sky-800 shadow-xl">
              <div
                className="absolute inset-0 animate-[globe-spin_18s_linear_infinite]"
                style={{
                  backgroundImage:
                    'url(https://upload.wikimedia.org/wikipedia/commons/8/83/Equirectangular_projection_SW.jpg)',
                  backgroundRepeat: 'repeat-x',
                  backgroundSize: '480px 100%',
                }}
              ></div>
              {/* Teinte bleue + volume de sphère, superposés (ne tournent pas) */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'radial-gradient(circle at 35% 30%, rgba(56,189,248,0.15), rgba(8,47,73,0.8) 100%)',
                  mixBlendMode: 'multiply',
                }}
              ></div>
              {/* Ombrage interne pour le volume de la sphère */}
              <div className="absolute inset-0 rounded-full shadow-[inset_0_0_45px_rgba(0,0,0,0.5)]"></div>
              {/* Reflet */}
              <div className="absolute top-6 left-8 h-14 w-14 rounded-full bg-white/30 blur-xl"></div>

              {/* Réseau international : le globe tourne dessous, ce calque reste fixe
                  par-dessus -> apprenants/formateurs connectés partout dans le monde,
                  reliés au "hub" central (AI Learning) par des arcs, avec un point
                  lumineux qui voyage le long de chaque trajet. */}
              <svg viewBox="0 0 256 256" className="absolute inset-0 h-full w-full">
                <defs>
                  <filter id="glow" x="-75%" y="-75%" width="250%" height="250%">
                    <feGaussianBlur stdDeviation="2.2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {NETWORK_POINTS.map(([x, y]) => (
                  <path
                    key={`arc-${x}-${y}`}
                    d={arcPath(x, y)}
                    fill="none"
                    stroke="white"
                    strokeWidth={1}
                    strokeOpacity={0.35}
                    strokeDasharray="3 5"
                  />
                ))}

                {NETWORK_POINTS.map(([x, y], index) => (
                  <circle key={`traveler-${x}-${y}`} r={3} fill="#fde68a" filter="url(#glow)">
                    <animateMotion
                      dur={`${2.6 + (index % 3) * 0.4}s`}
                      begin={`${index * 0.35}s`}
                      repeatCount="indefinite"
                      path={arcPath(x, y)}
                    />
                  </circle>
                ))}

                {NETWORK_POINTS.map(([x, y], index) => (
                  <g key={`dot-${x}-${y}`}>
                    <circle
                      cx={x}
                      cy={y}
                      r={8}
                      fill="white"
                      opacity={0.3}
                      className="animate-ping"
                      style={{ animationDelay: `${index * 0.35}s`, transformOrigin: `${x}px ${y}px` }}
                    />
                    <circle cx={x} cy={y} r={3.5} fill="white" filter="url(#glow)" />
                  </g>
                ))}

                {/* Hub central, avec son propre halo pulsant */}
                <circle cx={HUB.x} cy={HUB.y} r={12} fill="#fde68a" opacity={0.25} className="animate-ping" style={{ transformOrigin: `${HUB.x}px ${HUB.y}px` }} />
                <circle cx={HUB.x} cy={HUB.y} r={6} fill="#fde68a" filter="url(#glow)" />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-center text-xs font-medium text-slate-500">
            Formateurs et apprenants connectés partout dans le monde
          </p>
          </div>
        </div>
      </section>

      {/* ================= BANDE COMMUNAUTÉ ================= */}
      <section className="py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 rounded-full border border-white/60 bg-white/50 px-6 py-5 text-center shadow-[0_8px_32px_rgba(31,38,135,0.06)] backdrop-blur-xl backdrop-saturate-150 sm:flex-row sm:justify-center sm:gap-6 dark:border-white/10 dark:bg-slate-900/22">
          <div className="flex -space-x-3">
            {COMMUNITY_AVATARS.map((id) => (
              <img
                key={id}
                src={avatar(id, 100)}
                alt=""
                className="h-11 w-11 rounded-full border-2 border-white/80 object-cover shadow-sm"
              />
            ))}
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Apprenants et formateurs apprennent et enseignent ensemble sur AI Learning
          </p>
        </div>
      </section>

      {/* ================= NOS FORMATIONS ================= */}
      <section id="formations" className="py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/60 bg-white/40 p-10 shadow-[0_8px_32px_rgba(31,38,135,0.08)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-slate-900/18">
            <span className="mb-4 inline-block text-xs font-semibold tracking-wide text-sky-700 uppercase dark:text-sky-400">
              Nos formations
            </span>
            <h2 className="mb-6 text-3xl font-extrabold text-sky-700 dark:text-sky-400">Un catalogue en construction</h2>
            <p className="mb-10 leading-relaxed text-slate-600 dark:text-slate-300">
              Chaque formation est structurée en modules et leçons — vidéos, supports, exercices et
              quiz — classée par catégorie et par niveau. Le catalogue s'ouvrira au fur et à mesure
              de la publication des premières formations par nos formateurs.
            </p>
            <Link
              to="/register"
              className="inline-block rounded-full bg-sky-500 px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sky-600"
            >
              Être averti(e) à l'ouverture
            </Link>
          </div>
        </div>
      </section>

      {/* ================= NOS SERVICES ================= */}
      <section id="services" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-extrabold text-sky-700 dark:text-sky-400">
              Un cycle complet pour progresser sans limites
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              Bien plus qu'un catalogue de cours statique, un environnement pédagogique complet.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            {STEPS.map((step, index) => (
              <div
                key={step.title}
                className="rounded-2xl border border-white/60 bg-white/50 p-8 shadow-[0_8px_32px_rgba(31,38,135,0.08)] backdrop-blur-xl backdrop-saturate-150 transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(31,38,135,0.14)] dark:border-white/10 dark:bg-slate-900/22"
              >
                <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold ${step.bg} ${step.color}`}>
                  {String(index + 1).padStart(2, '0')}
                </div>
                <h3 className="mb-2 text-lg font-bold text-sky-700 dark:text-sky-400">{step.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= ESPACES & RÔLES ================= */}
      <section id="roles" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-extrabold text-sky-700 dark:text-sky-400">
              Des espaces dédiés à chaque profil
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              Une organisation sur-mesure pour les apprenants, les formateurs et les administrateurs.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col justify-between rounded-3xl border border-white/60 bg-white/50 p-8 shadow-[0_8px_32px_rgba(31,38,135,0.08)] backdrop-blur-xl backdrop-saturate-150 transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(31,38,135,0.14)] dark:border-white/10 dark:bg-slate-950/22">
              <div>
                <img src={avatar(20, 160)} alt="" className="mb-4 h-14 w-14 rounded-full object-cover" />
                <h3 className="mb-3 text-xl font-bold text-sky-700">Espace Apprenant</h3>
                <ul className="mb-8 space-y-2.5 text-sm text-slate-600">
                  <li>• Recherche et filtres de formations</li>
                  <li>• Suivi de progression en temps réel</li>
                  <li>• Assistant IA contextuel illimité</li>
                </ul>
              </div>
              <Link
                to="/register"
                className="block w-full rounded-xl bg-sky-50 py-3 text-center text-sm font-semibold text-sky-900 transition-all hover:bg-sky-100 dark:bg-sky-950/60 dark:text-sky-300 dark:hover:bg-sky-900"
              >
                Rejoindre comme apprenant
              </Link>
            </div>

            <div className="flex flex-col justify-between rounded-3xl border border-white/60 bg-white/50 p-8 shadow-[0_8px_32px_rgba(31,38,135,0.08)] backdrop-blur-xl backdrop-saturate-150 transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(31,38,135,0.14)] dark:border-white/10 dark:bg-slate-950/22">
              <div>
                <img src={avatar(54, 160)} alt="" className="mb-4 h-14 w-14 rounded-full object-cover" />
                <h3 className="mb-3 text-xl font-bold text-sky-700">Espace Formateur</h3>
                <ul className="mb-8 space-y-2.5 text-sm text-slate-600">
                  <li>• Création de formations modulaires</li>
                  <li>• Ajout de vidéos et ressources</li>
                  <li>• Conception de quiz et exercices</li>
                  <li>• Statistiques de complétion</li>
                </ul>
              </div>
              {/* Inscription formateur pas encore auto-service : passera par un
                  autre canal (validation admin) dans un prochain incrément. */}
              <div className="w-full cursor-not-allowed rounded-xl bg-slate-50 py-3 text-center text-sm font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-300">
                Inscription formateur bientôt disponible
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-3xl border border-white/60 bg-white/50 p-8 shadow-[0_8px_32px_rgba(31,38,135,0.08)] backdrop-blur-xl backdrop-saturate-150 transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(31,38,135,0.14)] dark:border-white/10 dark:bg-slate-950/22">
              <div>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100/80 text-xl backdrop-blur-sm backdrop-saturate-150 dark:bg-slate-800/60">
                  ⚙
                </div>
                <h3 className="mb-3 text-xl font-bold text-sky-700">Supervision Globale</h3>
                <ul className="mb-8 space-y-2.5 text-sm text-slate-600">
                  <li>• Validation des formations soumises</li>
                  <li>• Gestion des rôles et utilisateurs</li>
                  <li>• Pilotage des statistiques globales</li>
                  <li>• Gestion des abonnements et établissements</li>
                </ul>
              </div>
              <div className="w-full cursor-not-allowed rounded-xl bg-slate-50 py-3 text-center text-sm font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-300">
                Accès interne restreint
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION TÉMOIGNAGES & AVIS (DISPOSITION UN PAR UN EN 1 SEULE COLONNE) ================= */}
      <section id="temoignages" className="py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-20">

          {/* EN-TÊTE GRAND FORMAT */}
          <div className="mx-auto max-w-4xl text-center space-y-4">
            <span className="inline-block rounded-full border border-white/60 bg-white/50 px-4 py-1 text-xs font-bold uppercase tracking-wider text-sky-700 backdrop-blur-md backdrop-saturate-150 dark:border-white/10 dark:bg-slate-900/22 dark:text-sky-300">
              Avis & Témoignages
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl leading-tight dark:text-slate-100">
              Ce que dit notre communauté
            </h2>
            <p className="text-base text-slate-600 sm:text-lg max-w-2xl mx-auto dark:text-slate-300">
              Découvrez l'impact d'AI Learning à travers les retours authentiques de nos apprenants et enseignants.
            </p>
            
            <div className="pt-2 flex items-center justify-center gap-3 text-sm font-extrabold text-slate-700 dark:text-slate-200">
              <span className="text-amber-400 text-lg">★★★★★</span>
              <span>Note moyenne de <strong className="text-sky-600">4.9 / 5</strong> basée sur plus de 1 200+ avis</span>
            </div>
          </div>

          {/* LISTE UN PAR UN (AVEC ANIMATION AU CLIC) */}
          <div className="space-y-12">
            {TESTIMONIALS.map((item, idx) => {
              const isActive = activeTestimonial === idx
              const isLiked = !!likedTestimonials[idx]
              return (
                <div
                  key={idx}
                  onClick={() => setActiveTestimonial(idx)}
                  className={`group relative space-y-6 rounded-3xl p-6 sm:p-8 transition-all duration-300 transform active:scale-[0.98] cursor-pointer border backdrop-blur-xl backdrop-saturate-150 ${
                    isActive
                      ? 'bg-sky-50/60 border-sky-200/80 ring-4 ring-sky-100/80 shadow-[0_8px_32px_rgba(31,38,135,0.14)] scale-[1.01] dark:bg-slate-900/60 dark:border-sky-900/60 dark:ring-sky-950/40'
                      : 'border-white/40 bg-white/20 hover:bg-white/50 hover:border-white/60 dark:border-white/5 dark:bg-slate-900/20 dark:hover:bg-slate-900/50 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5 text-amber-400 text-lg">
                      {Array.from({ length: item.rating }).map((_, i) => (
                        <span key={i} className="transition-transform group-hover:scale-110">★</span>
                      ))}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setLikedTestimonials((prev) => ({ ...prev, [idx]: !prev[idx] }))
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold transition-all duration-300 active:scale-125 ${
                          isLiked
                            ? 'bg-rose-100 text-rose-600 scale-105 shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span className={`transition-transform duration-300 ${isLiked ? 'scale-125' : ''}`}>
                          {isLiked ? '❤️' : '🤍'}
                        </span>
                        <span>{isLiked ? 'Avis utile (1)' : 'Utile'}</span>
                      </button>

                      <span className="rounded-full bg-sky-100/80 px-4 py-1 text-xs font-extrabold text-sky-700 tracking-wider">
                        {item.tag}
                      </span>
                    </div>
                  </div>

                  <blockquote className="text-base sm:text-lg lg:text-xl font-normal leading-relaxed text-slate-700 tracking-wide transition-colors group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-100">
                    « {item.comment} »
                  </blockquote>

                  <div className="flex items-center gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <img
                      src={avatar(item.avatarId, 140)}
                      alt={item.name}
                      className="h-16 w-16 rounded-full object-cover shadow-md ring-4 ring-sky-100 transition-transform duration-300 group-hover:scale-105"
                    />
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{item.name}</h3>
                      <p className="text-sm text-slate-500 font-medium dark:text-slate-300">{item.role}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </section>

      {/* ================= CTA FINAL ================= */}
      <section className="py-24 text-center">
        <div className="mx-auto max-w-3xl px-4">
          <div className="mx-auto max-w-2xl rounded-3xl border border-white/60 bg-white/40 p-10 shadow-[0_8px_32px_rgba(31,38,135,0.1)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-slate-900/22">
            <div className="mb-6 flex justify-center -space-x-3">
              {COMMUNITY_AVATARS.slice(0, 4).map((id) => (
                <img
                  key={id}
                  src={avatar(id, 100)}
                  alt=""
                  className="h-12 w-12 rounded-full border-2 border-white/80 object-cover shadow-sm"
                />
              ))}
            </div>
            <h2 className="mb-6 text-3xl font-extrabold text-sky-700 sm:text-4xl dark:text-sky-400">
              Prêt à transformer votre manière d'apprendre ?
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              Créez votre compte en quelques secondes et profitez de l'accompagnement d'un tuteur
              intelligent contextualisé.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                to="/register"
                className="rounded-full bg-sky-500 px-8 py-4 font-semibold text-white shadow-lg shadow-sky-950/10 transition-all hover:bg-sky-600"
              >
                Créer un compte gratuit
              </Link>
              <Link
                to="/login"
                className="rounded-full border border-white/60 bg-white/40 px-8 py-4 font-semibold text-slate-700 backdrop-blur-sm backdrop-saturate-150 transition-all hover:bg-white/70 dark:border-white/10 dark:bg-slate-800/20 dark:text-slate-200 dark:hover:bg-slate-700/60"
              >
                Se connecter
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER + CONTACT ================= */}
      <footer id="contact" className="border-t border-slate-100 pt-20 pb-10 text-sm dark:border-slate-800">
        <div className="mx-auto max-w-xl px-4 text-center sm:px-6 lg:px-8">
          <span className="mb-4 inline-block text-xs font-semibold tracking-wide text-sky-700 uppercase dark:text-sky-400">
            Nous contacter
          </span>
          <h2 className="mb-4 text-3xl font-extrabold text-sky-700 dark:text-sky-400">Une question ?</h2>
          <p className="mb-8 text-slate-600 dark:text-slate-300">
            Écrivez-nous et on vous répond par email.
          </p>

          <div className="rounded-3xl border border-white/60 bg-white/50 p-6 shadow-[0_8px_32px_rgba(31,38,135,0.08)] backdrop-blur-xl backdrop-saturate-150 sm:p-8 dark:border-white/10 dark:bg-slate-900/22">
            {contactStatus === 'sent' ? (
              <p className="rounded-xl border border-emerald-200/60 bg-emerald-50/70 px-4 py-3 text-emerald-700 backdrop-blur-sm backdrop-saturate-150 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                Message envoyé, merci ! On revient vers vous par email.
              </p>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4 text-left">
                {contactStatus === 'error' && (
                  <p className="rounded-xl border border-red-200/60 bg-red-50/70 px-4 py-2 text-red-700 backdrop-blur-sm backdrop-saturate-150 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                    {contactError}
                  </p>
                )}
                <div>
                  <label htmlFor="contact-name" className="mb-1 block text-xs font-semibold text-slate-500 uppercase">
                    Nom
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={contactName}
                    onChange={(event) => setContactName(event.target.value)}
                    className="w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-slate-900 backdrop-blur-sm backdrop-saturate-150 transition-colors focus:border-sky-500 focus:bg-white/80 focus:outline-none dark:border-white/10 dark:bg-slate-800/20 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="mb-1 block text-xs font-semibold text-slate-500 uppercase">
                    Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    className="w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-slate-900 backdrop-blur-sm backdrop-saturate-150 transition-colors focus:border-sky-500 focus:bg-white/80 focus:outline-none dark:border-white/10 dark:bg-slate-800/20 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label htmlFor="contact-message" className="mb-1 block text-xs font-semibold text-slate-500 uppercase">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    rows={4}
                    value={contactMessage}
                    onChange={(event) => setContactMessage(event.target.value)}
                    className="w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-slate-900 backdrop-blur-sm backdrop-saturate-150 transition-colors focus:border-sky-500 focus:bg-white/80 focus:outline-none dark:border-white/10 dark:bg-slate-800/20 dark:text-slate-100"
                  />
                </div>
                <button
                  type="submit"
                  disabled={contactStatus === 'sending'}
                  className="w-full rounded-full bg-sky-500 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sky-600 disabled:opacity-50"
                >
                  {contactStatus === 'sending' ? 'Envoi...' : 'Envoyer le message'}
                </button>
              </form>
            )}
          </div>

          {/* RÉSEAUX SOCIAUX */}
          <div className="mt-8">
            <p className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              Suivez-nous
            </p>
            <div className="flex justify-center gap-3">
              {SOCIAL_LINKS.map((social) => {
                const Icon = social.icon
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.name}
                    title={social.name}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/40 text-slate-600 backdrop-blur-md backdrop-saturate-150 transition-colors hover:border-sky-200 hover:bg-white/70 hover:text-sky-700 dark:border-white/10 dark:bg-slate-900/22 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:bg-slate-800/40 dark:hover:text-sky-400"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mx-auto mt-16 flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-slate-200 px-4 pt-8 text-slate-400 sm:px-6 lg:flex-row lg:px-8">
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-sm font-bold text-white">
              AI
            </div>
            <span className="font-bold text-slate-600">AI Learning</span>
          </div>
          <p>© 2026 AI Learning — Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  )
}
