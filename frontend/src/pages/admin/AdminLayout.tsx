import {
  Bell,
  BookOpen,
  Building2,
  CheckCircle,
  ChevronDown,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Tags,
  User,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ROLE_LABELS } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { useConfirm } from '../../components/ConfirmContext'
import { useTheme } from '../../theme/ThemeContext'

const NAV_GROUPS = [
  {
    label: 'Pilotage',
    items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Utilisateurs & Accès',
    items: [
      { to: '/admin/apprenants', label: 'Apprenants', icon: Users, end: false },
      { to: '/admin/formateurs', label: 'Formateurs', icon: GraduationCap, end: false },
    ],
  },
  {
    label: 'Pédagogie & Catalogue',
    items: [
      { to: '/admin/creer-formation', label: 'Créer une formation', icon: Plus, end: false },
      { to: '/admin/formations', label: 'Toutes les formations', icon: BookOpen, end: false },
      { to: '/admin/formations/moderation', label: 'Validation formateurs', icon: CheckCircle, end: false },
      { to: '/admin/categories', label: 'Catégories', icon: Tags, end: false },
      { to: '/admin/departements', label: 'Départements', icon: Building2, end: false },
      { to: '/admin/certifications', label: 'Référentiel certifications', icon: GraduationCap, end: false },
    ],
  },
  {
    label: 'Sécurité & Système',
    items: [
      { to: '/admin/logs', label: "Journaux d'activité", icon: FileText, end: false },
      { to: '/admin/settings', label: 'Paramètres globaux', icon: ShieldCheck, end: false },
    ],
  },
]

const PAGE_TITLES: Record<string, { category: string; title: string; subtitle: string }> = {
  '/admin': { category: 'Pilotage', title: 'Tableau de bord', subtitle: "Aperçu global de l'activité et des flux de la plateforme." },
  '/admin/apprenants': { category: 'Utilisateurs & Accès', title: 'Apprenants', subtitle: 'Comptes, statut et accès des apprenants.' },
  '/admin/formateurs': { category: 'Utilisateurs & Accès', title: 'Formateurs', subtitle: "Comptes formateurs — création réservée à l'administrateur." },
  '/admin/creer-formation': { category: 'Pédagogie & Catalogue', title: 'Créer une formation (Assistant Pas-à-Pas)', subtitle: 'Conception méthodique des modules, leçons, vidéos, supports et exercices.' },
  '/admin/formations': { category: 'Pédagogie & Catalogue', title: 'Catalogue des formations', subtitle: 'Suivi et gestion de l’ensemble des modules pédagogiques.' },
  '/admin/formations/moderation': { category: 'Pédagogie & Catalogue', title: 'Validation des formateurs', subtitle: 'Modération et validation des contenus soumis.' },
  '/admin/categories': { category: 'Pédagogie & Catalogue', title: 'Catégories', subtitle: 'Organisation et arborescence des thématiques de formation.' },
  '/admin/departements': { category: 'Pédagogie & Catalogue', title: 'Départements', subtitle: 'Un formateur ne peut publier que dans son propre département.' },
  '/admin/certifications': { category: 'Pédagogie & Catalogue', title: 'Référentiel certifications', subtitle: 'Gestion des diplômes et attestations délivrés.' },
  '/admin/logs': { category: 'Sécurité & Système', title: "Journaux d'activité", subtitle: 'Audit de sécurité et traçabilité des actions sensibles.' },
  '/admin/settings': { category: 'Sécurité & Système', title: 'Paramètres globaux', subtitle: 'Configuration générale et options de la plateforme.' },
}

export function AdminLayout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const confirm = useConfirm()

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  // Fermer les popups lors d'un clic à l'extérieur
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
  const userName = user?.first_name || user?.email?.split('@')[0] || 'Administrateur'
  const userFullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || userName
  const currentPageInfo = PAGE_TITLES[location.pathname] || {
    category: 'Console',
    title: 'Administration',
    subtitle: 'Gestion de la plateforme AI Learning.',
  }

  async function handleLogoutClick() {
    const ok = await confirm({
      title: 'Se déconnecter ?',
      message: 'Êtes-vous sûr de vouloir fermer votre session administrateur ?',
      confirmLabel: 'Déconnexion',
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
        {/* LOGO PLATEFORME */}
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
                  Admin Workspace
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

        {/* NAVIGATION EN GROUPES */}
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

        {/* PIED DE SIDEBAR : RACCORDS SECONDAIRES ET COLLAPSE */}
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 md:flex dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800"
            title={isSidebarCollapsed ? 'Agrandir le menu' : 'Réduire le menu'}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            {!isSidebarCollapsed && <span>Réduire la barre</span>}
          </button>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL & HEADER ERGONOMIQUE */}
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        {/* EN-TÊTE SUPÉRIEUR ERGONOMIQUE (HEADER) */}
        <header className="shrink-0 z-20 flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6 dark:border-slate-800/80 dark:bg-slate-900/80">
          {/* GAUCHE : TOGGLE SIDEBAR + BREADCRUMB & TITRE */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Bouton mobile menu */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 md:hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              aria-label="Ouvrir le menu"
            >
              <Menu size={20} />
            </button>

            {/* Toggle collapse desktop */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400 dark:hover:bg-slate-800"
              title={isSidebarCollapsed ? 'Agrandir la barre latérale' : 'Réduire la barre latérale'}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>

            {/* Fil d'ariane & Titre de la page */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                <span>Console</span>
                <span>/</span>
                <span className="text-sky-600 dark:text-sky-400">{currentPageInfo.category}</span>
              </div>
              <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg dark:text-slate-100">
                {currentPageInfo.title}
              </h1>
            </div>
          </div>

          {/* CENTRE : RECHERCHE GLOBALE AVEC RACCOURCI (CTRL+K) */}
          <div className="relative hidden max-w-xs flex-1 px-4 lg:block">
            <div className="relative flex items-center">
              <Search size={16} className="absolute left-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une formation, un utilisateur..."
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
            {/* 1. TOOGLE THÈME CLAIR / SOMBRE */}
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-600 shadow-2xs transition-all hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              title={theme === 'dark' ? 'Passer au mode clair' : 'Passer au mode sombre'}
            >
              {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-600" />}
            </button>

            {/* 2. CENTRE DE NOTIFICATIONS */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-600 shadow-2xs transition-all hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Notifications"
              >
                <Bell size={18} />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              </button>

              {/* DROPDOWN NOTIFICATIONS */}
              {showNotifications && (
                <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl animate-[popup-in_0.25s_cubic-bezier(0.16,1,0.3,1)] dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-slate-900 uppercase dark:text-slate-100">Notifications</h3>
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-500/10 dark:text-red-400">
                        1 nouvelle
                      </span>
                    </div>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-[11px] font-semibold text-sky-600 hover:underline dark:text-sky-400"
                    >
                      Tout marquer lu
                    </button>
                  </div>

                  <div className="space-y-2 py-3">
                    <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3 transition-colors dark:border-amber-900/30 dark:bg-amber-500/10">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                        <div>
                          <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                            Formation en attente de modération
                          </p>
                          <p className="mt-0.5 text-[11px] text-amber-800/80 dark:text-amber-300/80">
                            Un formateur a soumis un nouveau module pédagogique.
                          </p>
                          <span className="mt-1 block text-[10px] font-medium text-amber-600 dark:text-amber-400">Il y a 10 min</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-2 text-center dark:border-slate-800">
                    <NavLink
                      to="/admin/formations"
                      onClick={() => setShowNotifications(false)}
                      className="text-[11px] font-bold text-slate-500 hover:text-sky-600 dark:hover:text-sky-400"
                    >
                      Voir le centre de modération →
                    </NavLink>
                  </div>
                </div>
              )}
            </div>

            {/* SEPARATEUR VERTICAL */}
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

            {/* 3. MENU PROFIL ERGONOMIQUE DANS LE HEADER */}
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
                    {user ? ROLE_LABELS[user.role] : 'Admin'}
                  </p>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {/* DROPDOWN MENU PROFIL */}
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
                    <div className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                      <Sparkles size={11} />
                      {user ? ROLE_LABELS[user.role] : 'Administrateur'}
                    </div>
                  </div>

                  <div className="py-2 space-y-1">
                    <NavLink
                      to="/admin/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <User size={15} className="text-slate-400" />
                      Mon profil & Paramètres
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
                      Se déconnecter
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* CONTENU DE LA PAGE INJECTÉ VIA OUTLET */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}