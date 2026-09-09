import {
  Bell,
  ChevronDown,
  Compass,
  Crown,
  GraduationCap,
  LayoutDashboard,
  Library,
  LogOut,
  Settings,
  Menu,
  MessageCircle,
  MessageSquare,
  Moon,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sparkles,
  Sun,
  User,
  Wrench,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { apiFetch } from '../../api/client'
import { ROLE_LABELS, type Inscription, type PaginatedResponse } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { useConfirm } from '../../components/ConfirmContext'
import { useTheme } from '../../theme/ThemeContext'

export function StudentLayout() {
  const { t } = useTranslation()
  const { user, logout, abonnement } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const confirm = useConfirm()

  const NAV_GROUPS = [
    {
      label: t('student.nav.apprentissage'),
      items: [
        { to: '/apprenant', label: t('student.nav.dashboard'), icon: LayoutDashboard, end: true },
        { to: '/apprenant/catalogue', label: t('student.nav.catalogue'), icon: Compass, end: false },
        { to: '/apprenant/mes-formations', label: t('student.nav.mesFormations'), icon: GraduationCap, end: false },
        { to: '/apprenant/coach-ia', label: t('student.nav.coachIa'), icon: MessageCircle, end: false },
        { to: '/apprenant/messagerie', label: t('student.nav.messagerie'), icon: MessageSquare, end: false },
      ],
    },
    {
      label: t('student.nav.ressources'),
      items: [
        { to: '/apprenant/actualites', label: t('student.nav.actualites'), icon: Newspaper, end: false },
        { to: '/apprenant/bibliotheque', label: t('student.nav.bibliotheque'), icon: Library, end: false },
        { to: '/apprenant/outils', label: t('student.nav.outils'), icon: Wrench, end: false },
        { to: '/apprenant/abonnement', label: t('student.nav.abonnement'), icon: Crown, end: false },
      ],
    },
  ]

  const PAGE_TITLES: Record<string, { category: string; title: string; subtitle: string }> = {
    '/apprenant': (t('student.pageTitles.dashboard', { returnObjects: true }) as { category: string; title: string; subtitle: string }),
    '/apprenant/catalogue': (t('student.pageTitles.catalogue', { returnObjects: true }) as { category: string; title: string; subtitle: string }),
    '/apprenant/mes-formations': (t('student.pageTitles.mesFormations', { returnObjects: true }) as { category: string; title: string; subtitle: string }),
    '/apprenant/coach-ia': (t('student.pageTitles.coachIa', { returnObjects: true }) as { category: string; title: string; subtitle: string }),
    '/apprenant/messagerie': (t('student.pageTitles.messagerie', { returnObjects: true }) as { category: string; title: string; subtitle: string }),
    '/apprenant/actualites': (t('student.pageTitles.actualites', { returnObjects: true }) as { category: string; title: string; subtitle: string }),
    '/apprenant/bibliotheque': (t('student.pageTitles.bibliotheque', { returnObjects: true }) as { category: string; title: string; subtitle: string }),
    '/apprenant/outils': (t('student.pageTitles.outils', { returnObjects: true }) as { category: string; title: string; subtitle: string }),
    '/apprenant/outils/ide': (t('student.pageTitles.outilsIde', { returnObjects: true }) as { category: string; title: string; subtitle: string }),
    '/apprenant/outils/tableur': (t('student.pageTitles.outilsTableur', { returnObjects: true }) as { category: string; title: string; subtitle: string }),
    '/apprenant/outils/notes': (t('student.pageTitles.outilsNotes', { returnObjects: true }) as { category: string; title: string; subtitle: string }),
    '/apprenant/outils/calculatrice': (t('student.pageTitles.outilsCalculatrice', { returnObjects: true }) as { category: string; title: string; subtitle: string }),
    '/apprenant/outils/tableau-blanc': (t('student.pageTitles.outilsTableauBlanc', { returnObjects: true }) as { category: string; title: string; subtitle: string }),
    '/apprenant/outils/modelisation-3d': (t('student.pageTitles.outilsModelisation3d', { returnObjects: true }) as { category: string; title: string; subtitle: string }),
    '/apprenant/abonnement': (t('student.pageTitles.abonnement', { returnObjects: true }) as { category: string; title: string; subtitle: string }),
    '/apprenant/parametres': (t('student.pageTitles.parametres', { returnObjects: true }) as { category: string; title: string; subtitle: string }),
  }

  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [notifications, setNotifications] = useState([
    {
      id: 'student-1',
      title: 'Nouveau cours disponible',
      message: 'La formation avancée est désormais visible dans le catalogue.',
      time: 'Il y a 12 min',
      read: false,
      path: '/apprenant/catalogue',
      tone: 'sky',
    },
    {
      id: 'student-2',
      title: 'Rappel d’inscription',
      message: 'Vous avez une formation en cours qui demande votre attention.',
      time: 'Hier',
      read: false,
      path: '/apprenant/mes-formations',
      tone: 'emerald',
    },
  ])

  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const unreadNotifications = notifications.filter((item) => !item.read).length

  function handleOpenNotifications() {
    const next = !showNotifications
    setShowNotifications(next)
    if (next) {
      setNotifications((current) => current.map((item) => ({ ...item, read: true })))
    }
  }

  function handleNotificationClick(path: string) {
    setNotifications((current) => current.map((item) => (item.path === path ? { ...item, read: true } : item)))
    setShowNotifications(false)
    navigate(path)
  }

  // Pied de sidebar : formation en cours. Données réelles uniquement — en
  // cas d'échec on masque simplement le bloc concerné, jamais de contenu
  // inventé pour combler l'espace. L'abonnement, lui, vient d'AuthContext
  // (partagé avec les autres pages) : ce layout reste monté d'une page à
  // l'autre de l'espace apprenant, donc un fetch local ici ne se
  // rafraîchirait jamais après une rétrogradation faite ailleurs.
  const [formationEnCours, setFormationEnCours] = useState<Inscription | null>(null)

  useEffect(() => {
    apiFetch<PaginatedResponse<Inscription>>('/inscriptions/')
      .then((data) => setFormationEnCours(data.results.find((i) => i.statut === 'EN_COURS') ?? null))
      .catch(() => {})
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initial = (user?.first_name || user?.email || '?').charAt(0).toUpperCase()
  const userName = user?.first_name || user?.email?.split('@')[0] || t('student.roleFallback')
  const userFullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || userName
  const currentPageInfo = PAGE_TITLES[location.pathname] || (t('student.fallbackPage', { returnObjects: true }) as { category: string; title: string; subtitle: string })

  async function handleLogoutClick() {
    const ok = await confirm({
      title: t('student.logoutConfirm.title'),
      message: t('student.logoutConfirm.message'),
      confirmLabel: t('student.logoutConfirm.confirmLabel'),
      variant: 'warning',
    })
    if (ok) {
      logout()
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Overlay Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* BARRE LATÉRALE (SIDEBAR) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-300 md:static md:translate-x-0 dark:border-slate-800 dark:bg-slate-900 ${
          isSidebarCollapsed ? 'md:w-20' : 'md:w-64'
        } ${isSidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full'}`}
      >
        {/* LOGO */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 text-sm font-extrabold text-white shadow-md shadow-sky-500/20">
              AI
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <span className="block truncate text-base font-extrabold text-slate-900 dark:text-white">
                  AI Learning
                </span>
                <span className="block text-[10px] font-bold tracking-wider text-sky-600 uppercase dark:text-sky-400">
                  {t('student.workspaceLabel')}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 md:hidden dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label={t('student.closeMenuAria')}
          >
            <X size={20} />
          </button>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 space-y-6 overflow-y-auto p-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!isSidebarCollapsed && (
                <p className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                  {group.label}
                </p>
              )}
              <div className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setIsSidebarOpen(false)}
                      title={isSidebarCollapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                          isActive
                            ? 'bg-sky-50 text-sky-900 shadow-sm dark:bg-sky-500/15 dark:text-sky-300'
                            : 'text-slate-600 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
                        } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`
                      }
                    >
                      <Icon size={18} className="shrink-0" />
                      {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* PIED DE SIDEBAR : formation en cours, abonnement, profil */}
        <div className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-800">
          {!isSidebarCollapsed && formationEnCours && (
            <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-3 dark:border-sky-500/20 dark:from-sky-500/10 dark:to-slate-900">
              <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-sky-600 uppercase dark:text-sky-400">
                <GraduationCap size={12} />
                {t('student.sidebarFooter.currentCourseLabel')}
              </div>
              <p className="mt-1 truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                {formationEnCours.formation_titre}
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-sky-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all"
                  style={{ width: `${formationEnCours.progress_percent}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] font-semibold text-slate-400">
                {t('student.sidebarFooter.progressLabel', { percent: formationEnCours.progress_percent })}
              </p>
            </div>
          )}

          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
              <Crown size={14} className={`shrink-0 ${abonnement?.actif ? 'text-amber-500' : 'text-slate-400'}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold text-slate-700 dark:text-slate-200">
                  {t('student.nav.abonnement')}
                </p>
                <p className="truncate text-[10px] text-slate-400">
                  {abonnement?.actif
                    ? t('student.sidebarFooter.premiumUntil', {
                        date: new Date(abonnement.date_fin!).toLocaleDateString('fr-FR'),
                      })
                    : t('student.sidebarFooter.freeBadge')}
                </p>
              </div>
            </div>
          )}

          <div className={`flex items-center gap-2.5 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 text-xs font-bold text-white">
              {initial}
            </div>
            {!isSidebarCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">{userName}</p>
                  <p className="truncate text-[10px] text-slate-400">{user?.email}</p>
                </div>
                <NavLink
                  to="/apprenant/parametres"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  aria-label={t('student.sidebarFooter.settingsAria')}
                >
                  <Settings size={14} />
                </NavLink>
                <button
                  onClick={handleLogoutClick}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                  aria-label={t('student.sidebarFooter.logoutAria')}
                >
                  <LogOut size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL & HEADER ERGONOMIQUE */}
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        {/* EN-TÊTE ERGONOMIQUE */}
        <header className="shrink-0 z-20 flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6 dark:border-slate-800/80 dark:bg-slate-900/80">
          {/* GAUCHE : TOGGLE SIDEBAR + BREADCRUMB & TITRE */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 md:hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              aria-label={t('student.openMenuAria')}
            >
              <Menu size={20} />
            </button>

            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400 dark:hover:bg-slate-800"
              title={isSidebarCollapsed ? t('student.header.expandTitle') : t('student.header.collapseTitle')}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                <span>{t('student.breadcrumbRoot')}</span>
                <span>/</span>
                <span className="text-sky-600 dark:text-sky-400">{currentPageInfo.category}</span>
              </div>
              <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg dark:text-slate-100">
                {currentPageInfo.title}
              </h1>
            </div>
          </div>

          {/* CENTRE : RECHERCHE DE COURS */}
          <div className="relative hidden max-w-xs flex-1 px-4 lg:block">
            <div className="relative flex items-center">
              <Search size={16} className="absolute left-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('student.searchPlaceholder')}
                className="w-full rounded-2xl border border-slate-200/90 bg-slate-50/90 py-2 pl-9 pr-12 text-xs font-medium text-slate-900 placeholder-slate-400 transition-all focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-sky-400 dark:focus:bg-slate-900"
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={14} />
                </button>
              ) : (
                <kbd className="absolute right-2.5 rounded-lg border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                  ⌘K
                </kbd>
              )}
            </div>
          </div>

          {/* DROITE : BASCIULE DE THÈME + NOTIFICATIONS + MENU PROFIL */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 1. THEME SWITCHER */}
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-600 shadow-2xs transition-all hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              title={theme === 'dark' ? t('student.themeLight') : t('student.themeDark')}
            >
              {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-600" />}
            </button>

            {/* 2. NOTIFICATIONS */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={handleOpenNotifications}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-600 shadow-2xs transition-all hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label={t('student.notificationsAria')}
              >
                <Bell size={18} />
                {unreadNotifications > 0 && (
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl animate-[popup-in_0.25s_cubic-bezier(0.16,1,0.3,1)] dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-slate-900 uppercase dark:text-slate-100">{t('student.notifTitle')}</h3>
                      {unreadNotifications > 0 && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-500/10 dark:text-red-400">
                          {unreadNotifications}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifications((current) => current.map((item) => ({ ...item, read: true })))}
                      className="text-[11px] font-medium text-sky-600 hover:underline dark:text-sky-400"
                    >
                      {t('student.notifEmpty')}
                    </button>
                  </div>

                  <div className="space-y-2 py-3">
                    {notifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNotificationClick(item.path)}
                        className={`block w-full rounded-xl border p-3 text-left ${
                          item.tone === 'sky'
                            ? 'border-sky-100 bg-sky-50/70 dark:border-sky-900/30 dark:bg-sky-500/10'
                            : 'border-emerald-100 bg-emerald-50/70 dark:border-emerald-900/30 dark:bg-emerald-500/10'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${item.read ? 'bg-slate-300 dark:bg-slate-600' : item.tone === 'sky' ? 'bg-sky-500' : 'bg-emerald-500'}`} />
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-bold ${item.read ? 'text-slate-700 dark:text-slate-200' : item.tone === 'sky' ? 'text-sky-900 dark:text-sky-200' : 'text-emerald-900 dark:text-emerald-200'}`}>
                              {item.title}
                            </p>
                            <p className={`mt-0.5 text-[11px] ${item.read ? 'text-slate-500 dark:text-slate-400' : item.tone === 'sky' ? 'text-sky-800/80 dark:text-sky-300/80' : 'text-emerald-800/80 dark:text-emerald-300/80'}`}>
                              {item.message}
                            </p>
                            <span className={`mt-1 block text-[10px] font-medium ${item.read ? 'text-slate-500 dark:text-slate-400' : item.tone === 'sky' ? 'text-sky-600 dark:text-sky-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {item.time}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

            {/* 3. MENU PROFIL ERGONOMIQUE */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white p-1 pr-2.5 shadow-2xs transition-all hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 text-xs font-bold text-white shadow-sm">
                  {initial}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-xs font-bold leading-tight text-slate-900 dark:text-slate-100">{userName}</p>
                  <p className="text-[10px] font-medium leading-none text-slate-400">
                    {user ? ROLE_LABELS[user.role] : t('student.roleFallback')}
                  </p>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl animate-[popup-in_0.25s_cubic-bezier(0.16,1,0.3,1)] dark:border-slate-800 dark:bg-slate-900">
                  <div className="border-b border-slate-100 px-2 pb-3 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 text-sm font-bold text-white">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">{userFullName}</p>
                        <p className="truncate text-[11px] text-slate-400">{user?.email}</p>
                      </div>
                    </div>
                    <div className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                      <Sparkles size={11} />
                      {user ? ROLE_LABELS[user.role] : t('student.roleFallback')}
                    </div>
                  </div>

                  <div className="py-2 space-y-1">
                    <NavLink
                      to="/apprenant/mes-formations"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <User size={15} className="text-slate-400" />
                      {t('student.profileMenuLink1')}
                    </NavLink>
                    <NavLink
                      to="/apprenant/parametres"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Settings size={15} className="text-slate-400" />
                      {t('student.profileMenuLink2')}
                    </NavLink>
                  </div>

                  <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setShowProfileMenu(false)
                        handleLogoutClick()
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                    >
                      <LogOut size={15} />
                      {t('student.logout')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* CONTENU DE LA PAGE INJECTÉ VIA OUTLET */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
