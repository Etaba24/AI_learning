import { UserManagementPage } from '../../components/UserManagementPage'

export function ApprenantsPage() {
  return (
    <UserManagementPage
      role="STUDENT"
      title="Apprenants"
      createLabel="Nouvel apprenant"
      emptyMessage="Aucun apprenant pour l'instant."
    />
  )
}
