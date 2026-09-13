import { Plus, UserX, UserCheck, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { apiFetch, ApiError } from '../api/client'
import { DEFAULT_PAGE_SIZE, type Departement, type PaginatedResponse, type Role, type User } from '../api/types'
import { Alert } from './Alert'
import { useConfirm } from './ConfirmContext'
import { Modal } from './Modal'
import { Pagination } from './Pagination'
import { useToast } from './ToastContext'
import { useRealtimeTopics } from '../hooks/useRealtimeTopics'

interface UserManagementPageProps {
  role: Role
  title: string
  createLabel: string
  emptyMessage: string
  requireDepartement?: boolean
}

interface FormState {
  id: string | null
  first_name: string
  last_name: string
  email: string
  password: string
  departements: string[]
}

const EMPTY_FORM: FormState = { id: null, first_name: '', last_name: '', email: '', password: '', departements: [] }

/** CRUD complet réutilisé par ApprenantsPage et FormateursPage */
export function UserManagementPage({ role, title, createLabel, emptyMessage, requireDepartement }: UserManagementPageProps) {
  const { showToast } = useToast()
  const confirm = useConfirm()

  const [users, setUsers] = useState<User[] | null>(null)
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [departements, setDepartements] = useState<Departement[]>([])
  const [error, setError] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function loadUsers() {
    apiFetch<PaginatedResponse<User>>(`/users/?role=${role}&page=${page}`)
      .then((data) => {
        setUsers(data.results)
        setCount(data.count)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }

  useEffect(loadUsers, [role, page])
  useEffect(() => setPage(1), [role])
  useRealtimeTopics(['admin_users'], loadUsers)

  useEffect(() => {
    if (!requireDepartement) return
    apiFetch<PaginatedResponse<Departement>>('/departements/').then((data) => setDepartements(data.results))
  }, [requireDepartement])

  function openCreateModal() {
    setForm({ ...EMPTY_FORM })
    setFormError(null)
    setIsModalOpen(true)
  }

  function openEditModal(user: User) {
    setForm({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      password: '',
      departements: user.departements,
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  function toggleDepartement(id: string) {
    setForm((f) => ({
      ...f,
      departements: f.departements.includes(id)
        ? f.departements.filter((d) => d !== id)
        : [...f.departements, id],
    }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    setIsSubmitting(true)
    try {
      if (form.id) {
        await apiFetch(`/users/${form.id}/`, {
          method: 'PATCH',
          body: {
            first_name: form.first_name,
            last_name: form.last_name,
            email: form.email,
            ...(requireDepartement ? { departements: form.departements } : {}),
          },
        })
        showToast('success', 'Compte modifié avec succès.')
      } else {
        await apiFetch('/users/', {
          method: 'POST',
          body: {
            first_name: form.first_name,
            last_name: form.last_name,
            email: form.email,
            password: form.password,
            role,
            ...(requireDepartement ? { departements: form.departements } : {}),
          },
        })
        showToast('success', 'Compte créé avec succès.')
      }
      setIsModalOpen(false)
      loadUsers()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Une erreur est survenue.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function toggleActive(user: User) {
    const ok = await confirm({
      title: user.is_active ? 'Désactiver ce compte ?' : 'Réactiver ce compte ?',
      message: user.is_active
        ? `${user.email} perdra l'accès à la plateforme, mais son historique est conservé.`
        : `${user.email} retrouvera l'accès à la plateforme.`,
      confirmLabel: user.is_active ? 'Désactiver' : 'Réactiver',
      danger: user.is_active,
    })
    if (!ok) return

    try {
      await apiFetch(`/users/${user.id}/`, { method: 'PATCH', body: { is_active: !user.is_active } })
      showToast('success', user.is_active ? 'Compte désactivé.' : 'Compte réactivé.')
      loadUsers()
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Impossible de modifier ce compte.')
    }
  }

  async function handleDelete(user: User) {
    const ok = await confirm({
      title: 'Supprimer ce compte ?',
      message: `${user.email} sera définitivement supprimé. Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (!ok) return

    try {
      await apiFetch(`/users/${user.id}/`, { method: 'DELETE' })
      showToast('success', 'Compte supprimé avec succès.')
      loadUsers()
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Impossible de supprimer ce compte.')
    }
  }

  if (error) {
    return <Alert variant="error" message={error} />
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {title} {users ? `(${count})` : ''}
        </h1>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
        >
          <Plus size={16} />
          {createLabel}
        </button>
      </div>

      {!users ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          <p className="mt-3 text-xs font-medium">Chargement de la liste...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
            <UserX size={24} />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{emptyMessage}</p>
          <p className="mt-1 text-xs text-slate-400">Cliquez sur "{createLabel}" pour ajouter le premier compte.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-md shadow-slate-500/5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="border-b border-slate-200/80 bg-slate-100/70 text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="py-4 px-6">Utilisateur</th>
                  {requireDepartement && <th className="py-4 px-6">Département</th>}
                  <th className="py-4 px-6">Statut</th>
                  <th className="py-4 px-6">Date d'inscription</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {users.map((user) => {
                  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ')
                  const initial = (user.first_name || user.email).charAt(0).toUpperCase()
                  return (
                    <tr
                      key={user.id}
                      className="group transition-colors duration-150 hover:bg-sky-50/50 dark:hover:bg-sky-950/20"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-600 text-xs font-extrabold text-white shadow-md shadow-sky-500/20">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-slate-900 group-hover:text-sky-600 dark:text-slate-100 dark:group-hover:text-sky-400">
                              {fullName || 'Nom non spécifié'}
                            </p>
                            <p className="truncate text-[11px] font-medium text-slate-400">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {requireDepartement && (
                        <td className="py-4 px-6">
                          {user.departements_noms.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {user.departements_noms.map((nom) => (
                                <span
                                  key={nom}
                                  className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                >
                                  {nom}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>
                      )}

                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
                            user.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-900/40'
                              : 'bg-slate-100 text-slate-500 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/50'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              user.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {user.is_active ? 'Actif' : 'Désactivé'}
                        </span>
                      </td>

                      <td className="py-4 px-6 font-medium text-slate-500 dark:text-slate-400">
                        {new Date(user.date_joined).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(user)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-sky-500/20 dark:hover:text-sky-400"
                            title="Modifier le compte"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => toggleActive(user)}
                            className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                              user.is_active
                                ? 'text-slate-400 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-500/20 dark:hover:text-amber-400'
                                : 'text-slate-400 hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-400'
                            }`}
                            title={user.is_active ? 'Désactiver le compte' : 'Activer le compte'}
                          >
                            {user.is_active ? <UserX size={15} /> : <UserCheck size={15} />}
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-500/20 dark:hover:text-rose-400"
                            title="Supprimer le compte"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4">
            <Pagination count={count} page={page} pageSize={DEFAULT_PAGE_SIZE} onPageChange={setPage} />
          </div>
        </div>
      )}

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title={form.id ? 'Modifier le compte' : createLabel}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <Alert variant="error" message={formError} onClose={() => setFormError(null)} />
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
                Prénom
              </label>
              <input
                required
                value={form.first_name}
                onChange={(event) => setForm((f) => ({ ...f, first_name: event.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
                Nom
              </label>
              <input
                required
                value={form.last_name}
                onChange={(event) => setForm((f) => ({ ...f, last_name: event.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
              Email
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(event) => setForm((f) => ({ ...f, email: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          {requireDepartement && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
                Départements (au moins un)
              </label>
              {departements.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Aucun département — créez-en un d'abord.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {departements.map((departement) => {
                    const isChecked = form.departements.includes(departement.id)
                    return (
                      <label
                        key={departement.id}
                        className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          isChecked
                            ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-500 dark:bg-sky-500/10 dark:text-sky-300'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleDepartement(departement.id)}
                          className="sr-only"
                        />
                        {departement.nom}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {!form.id && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
                Mot de passe initial
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(event) => setForm((f) => ({ ...f, password: event.target.value }))}
                  className="w-full rounded-lg border border-slate-200 py-2 pl-3 pr-10 text-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || (requireDepartement && form.departements.length === 0)}
            className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Enregistrement...' : form.id ? 'Enregistrer' : 'Créer le compte'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
