import {
  Bell,
  BookOpen,
  ChevronDown,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
  Menu,
  MessageSquare,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PlusCircle,
  Search,
  Sparkles,
  Sun,
  UploadCloud,
  User,
  Users,
  Award,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ROLE_LABELS } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { useConfirm } from '../../components/ConfirmContext'
import { useTheme } from '../../theme/ThemeContext'

export function InstructorLayout() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const confirm = useConfirm()

  const INSTRUCTOR_NAV_GROUPS = [
    {
      label: t('instructor.nav.dashboardGroup'),
      items: [{ to: '/formateur', label: t('instructor.nav.dashboard'), icon: LayoutDashboard, end: true }],
    },
    {
      label: t('instructor.nav.pedagogy'),
      items: [
        { to: '/formateur/mes-formations', label: t('instructor.nav.mesFormations'), icon: BookOpen, end: false },
        { to: '/formateur/creer-formation', label: t('instructor.nav.creerFormation'), icon: PlusCircle, end: false },
        { to: '/formateur/evaluations', label: t('instructor.nav.evaluations'), icon: Award, end: false },
      ],
    },
    {
      label: t('instructor.nav.suivi'),
      items: [
        { to: '/formateur/apprenants', label: t('instructor.nav.apprenants'), icon: Users, end: false },
        { to: '/formateur/messagerie', label: t('instructor.nav.messagerie'), icon: MessageSquare, end: false },
        { to: '/formateur/bibliotheque', label: t('instructor.nav.bibliotheque'), icon: UploadCloud, end: false },
      ],
    },
  ]

  const INSTRUCTOR_PAGE_TITLES: Record<string, { category: string; title: string; subtitle: string }> = {
    '/formateur': { category: t('instructor.nav.dashboardGroup'), ...(t('instructor.pageTitles.dashboard', { returnObjects: true }) as { title: string; subtitle: string }) },
    '/formateur/mes-formations': { category: t('instructor.nav.pedagogy'), ...(t('instructor.pageTitles.mesFormations', { returnObjects: true }) as { title: string; subtitle: string }) },
    '/formateur/creer-formation': { category: t('instructor.nav.pedagogy'), ...(t('instructor.pageTitles.creerFormation', { returnObjects: true }) as { title: string; subtitle: string }) },
    '/formateur/evaluations': { category: t('instructor.nav.pedagogy'), ...(t('instructor.pageTitles.evaluations', { returnObjects: true }) as { title: string; subtitle: string }) },
    '/formateur/apprenants': { category: t('instructor.nav.suivi'), ...(t('instructor.pageTitles.apprenants', { returnObjects: true }) as { title: string; subtitle: string }) },
    '/formateur/messagerie': { category: t('instructor.nav.suivi'), ...(t('instructor.pageTitles.messagerie', { returnObjects: true }) as { title: string; subtitle: string }) },
    '/formateur/bibliotheque': { category: t('instructor.nav.suivi'), ...(t('instructor.pageTitles.bibliotheque', { returnObjects: true }) as { title: string; subtitle: string }) },
    '/formateur/parametres': { category: t('instructor.accountCategory'), ...(t('instructor.pageTitles.parametres', { returnObjects: true }) as { title: string; subtitle: string }) },
  }

  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [notifications, setNotifications] = useState([
    {
      id: 'instructor-1',
      title: 'Nouvelle soumission',
      message: 'Une formation de votre catalogue a été envoyée pour validation.',
      time: 'Il y a 8 min',
      read: false,
      path: '/formateur/mes-formations',
      tone: 'indigo',
    },
    {
      id: 'instructor-2',
      title: 'Message reçu',
      message: 'Votre messagerie contient un nouveau message de l’équipe.',
      time: 'Il y a 2 h',
      read: false,
      path: '/formateur/messagerie',
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
  const userName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email.split('@')[0] : t('instructor.roleFallback')
  const userFullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || userName

  const currentPageInfo = INSTRUCTOR_PAGE_TITLES[location.pathname] || (t('instructor.fallbackPage', { returnObjects: true }) as { category: string; title: string; subtitle: string })

  async function handleLogoutClick() {
    const ok = await confirm({
      title: t('instructor.logoutConfirm.title'),
      message: t('instructor.logoutConfirm.message'),
      confirmLabel: t('instructor.logoutConfirm.confirmLabel'),
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

      {/* BARRE LATÉRALE (SIDEBAR FORMATEUR) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-300 md:static md:translate-x-0 dark:border-slate-800 dark:bg-slate-900 ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'
          } ${isSidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full'}`}
      >
        {/* LOGO PLATEFORME & BADGE FORMATEUR */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-sky-600 to-indigo-700 text-sm font-extrabold text-white shadow-md shadow-indigo-500/20">
              <GraduationCap size={20} />
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <span className="block truncate text-base font-extrabold text-slate-900 dark:text-white">
                  AI Learning
                </span>
                <span className="block text-[10px] font-bold tracking-wider text-indigo-600 uppercase dark:text-indigo-400">
                  {t('instructor.workspaceLabel')}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 md:hidden dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* NAVIGATION PAR GROUPES */}
        <nav className="flex-1 space-y-6 overflow-y-auto p-3">
          {INSTRUCTOR_NAV_GROUPS.map((group) => (
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
                        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${isActive
                          ? 'bg-indigo-50 text-indigo-900 shadow-sm dark:bg-indigo-500/15 dark:text-indigo-300 font-bold'
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

        {/* PIED DE SIDEBAR : PROFIL */}
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
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
                  to="/formateur/parametres"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  aria-label={t('instructor.sidebarFooter.settingsAria')}
                >
                  <Settings size={14} />
                </NavLink>
                <button
                  onClick={handleLogoutClick}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                  aria-label={t('instructor.sidebarFooter.logoutAria')}
                >
                  <LogOut size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* CONTENU ET HEADER ERGONOMIQUE */}
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        {/* HEADER */}
        <header className="shrink-0 z-20 flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6 dark:border-slate-800/80 dark:bg-slate-900/80">
          {/* GAUCHE : TOGGLE + TITRE */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 md:hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <Menu size={20} />
            </button>

            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                <span>Formateur</span>
                <span>/</span>
                <span className="text-indigo-600 dark:text-indigo-400">{currentPageInfo.category}</span>
              </div>
              <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg dark:text-slate-100">
                {currentPageInfo.title}
              </h1>
            </div>
          </div>

          {/* CENTRE : RECHERCHE */}
          <div className="relative hidden max-w-xs flex-1 px-4 lg:block">
            <div className="relative flex items-center">
              <Search size={16} className="absolute left-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('instructor.searchPlaceholder')}
                className="w-full rounded-2xl border border-slate-200/90 bg-slate-50/90 py-2 pl-9 pr-10 text-xs font-medium text-slate-900 placeholder-slate-400 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-100 dark:placeholder-slate-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* DROITE : THEME + NOTIFS + PROFIL */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-600 shadow-2xs transition-all hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              title={theme === 'dark' ? t('instructor.themeLight') : t('instructor.themeDark')}
            >
              {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-600" />}
            </button>

            {/* NOTIFICATIONS */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={handleOpenNotifications}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-600 shadow-2xs transition-all hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Bell size={18} />
                {unreadNotifications > 0 && (
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl animate-[popup-in_0.25s_cubic-bezier(0.16,1,0.3,1)] dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-slate-900 uppercase dark:text-slate-100">{t('instructor.notifTitle')}</h3>
                      {unreadNotifications > 0 && (
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                          {unreadNotifications}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifications((current) => current.map((item) => ({ ...item, read: true })))}
                      className="text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      {t('instructor.notif2Recent')}
                    </button>
                  </div>

                  <div className="space-y-2 py-3">
                    {notifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNotificationClick(item.path)}
                        className={`block w-full rounded-xl border p-3 text-left ${
                          item.tone === 'indigo'
                            ? 'border-indigo-100 bg-indigo-50/70 dark:border-indigo-900/30 dark:bg-indigo-500/10'
                            : 'border-emerald-100 bg-emerald-50/70 dark:border-emerald-900/30 dark:bg-emerald-500/10'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${item.read ? 'bg-slate-300 dark:bg-slate-600' : item.tone === 'indigo' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-bold ${item.read ? 'text-slate-700 dark:text-slate-200' : item.tone === 'indigo' ? 'text-indigo-900 dark:text-indigo-200' : 'text-emerald-900 dark:text-emerald-200'}`}>
                              {item.title}
                            </p>
                            <p className={`mt-0.5 text-[11px] ${item.read ? 'text-slate-500 dark:text-slate-400' : item.tone === 'indigo' ? 'text-indigo-800/80 dark:text-indigo-300/80' : 'text-emerald-800/80 dark:text-emerald-300/80'}`}>
                              {item.message}
                            </p>
                            <span className={`mt-1 block text-[10px] font-medium ${item.read ? 'text-slate-500 dark:text-slate-400' : item.tone === 'indigo' ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
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

            {/* PROFIL MENU */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white p-1 pr-2.5 shadow-2xs transition-all hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-bold text-white shadow-sm">
                  {initial}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-xs font-bold leading-tight text-slate-900 dark:text-slate-100">{userName}</p>
                  <p className="text-[10px] font-medium leading-none text-slate-400">
                    {user ? ROLE_LABELS[user.role] : t('instructor.roleFallback')}
                  </p>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl animate-[popup-in_0.25s_cubic-bezier(0.16,1,0.3,1)] dark:border-slate-800 dark:bg-slate-900">
                  <div className="border-b border-slate-100 px-2 pb-3 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-sm font-bold text-white">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">{userFullName}</p>
                        <p className="truncate text-[11px] text-slate-400">{user?.email}</p>
                      </div>
                    </div>
                    <div className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                      <Sparkles size={11} />
                      {t('instructor.profileBadge')}
                    </div>
                  </div>

                  <div className="py-2 space-y-1">
                    <NavLink
                      to="/formateur/mes-formations"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <User size={15} className="text-slate-400" />
                      {t('instructor.profileMenuLink1')}
                    </NavLink>
                    <NavLink
                      to="/formateur/parametres"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Settings size={15} className="text-slate-400" />
                      {t('instructor.profileMenuLink2')}
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
                      {t('instructor.logout')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* CONTENU DE LA PAGE */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
