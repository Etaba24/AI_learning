import { UserManagementPage } from '../../components/UserManagementPage'

export function FormateursPage() {
  return (
    <div>
      <p className="mb-4 rounded-xl border border-sky-100 bg-sky-50 px-4 py-2.5 text-sm text-sky-800 dark:border-sky-900 dark:bg-sky-500/10 dark:text-sky-300">
        L'inscription publique ne propose que le rôle Apprenant — seul un administrateur peut créer un compte
        Formateur, depuis cette page.
      </p>
      <UserManagementPage
        role="INSTRUCTOR"
        title="Formateurs"
        createLabel="Nouveau formateur"
        emptyMessage="Aucun formateur pour l'instant."
        requireDepartement
      />
    </div>
  )
}
