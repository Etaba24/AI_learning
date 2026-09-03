import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { ConfirmProvider } from './components/ConfirmContext'
import { ToastProvider } from './components/ToastContext'
import { AdminLayout } from './pages/admin/AdminLayout'
import { ApprenantsPage } from './pages/admin/ApprenantsPage'
import { CategoriesPage } from './pages/admin/CategoriesPage'
import { DashboardPage } from './pages/admin/DashboardPage'
import { DepartementsPage } from './pages/admin/DepartementsPage'
import { FormateursPage } from './pages/admin/FormateursPage'
import { FormationFormPage } from './pages/admin/FormationFormPage'
import { FormationsPage } from './pages/admin/FormationsPage'
import { AuthPage } from './pages/AuthPage'
import { HomePage } from './pages/HomePage'
import { InstructorDashboardPage } from './pages/instructor/InstructorDashboardPage'
import { InstructorEvaluationsPage } from './pages/instructor/InstructorEvaluationsPage'
import { InstructorFormationsPage } from './pages/instructor/InstructorFormationsPage'
import { InstructorLayout } from './pages/instructor/InstructorLayout'
import { InstructorStudentsPage } from './pages/instructor/InstructorStudentsPage'
import { CalculatricePage } from './pages/student/CalculatricePage'
import { CataloguePage } from './pages/student/CataloguePage'
import { CoachIAPage } from './pages/student/CoachIAPage'
import { FormationDetailPage } from './pages/student/FormationDetailPage'
import { IdePage } from './pages/student/IdePage'
import { LibraryPage } from './pages/student/LibraryPage'
import { Modelisation3DPage } from './pages/student/Modelisation3DPage'
import { MyCoursesPage } from './pages/student/MyCoursesPage'
import { NewsPage } from './pages/student/NewsPage'
import { NotesPage } from './pages/student/NotesPage'
import { StudentDashboardPage } from './pages/student/StudentDashboardPage'
import { StudentLayout } from './pages/student/StudentLayout'
import { TableauBlancPage } from './pages/student/TableauBlancPage'
import { TableurPage } from './pages/student/TableurPage'
import { ToolsPage } from './pages/student/ToolsPage'
import { WelcomePage } from './pages/WelcomePage'
import { ThemeProvider } from './theme/ThemeContext'

import { CreateFormationWizardPage } from './pages/admin/CreateFormationWizardPage'

function App() {
  return (
    <ThemeProvider>
    <ToastProvider>
    <ConfirmProvider>
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<AuthPage initialMode="login" />} />
        <Route path="/register" element={<AuthPage initialMode="register" />} />

        {/* N'importe quel rôle connecté */}
        <Route element={<ProtectedRoute />}>
          <Route path="/welcome" element={<WelcomePage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'INSTRUCTOR']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="apprenants" element={<ApprenantsPage />} />
            <Route path="formateurs" element={<FormateursPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="departements" element={<DepartementsPage />} />
            <Route path="formations" element={<FormationsPage />} />
            <Route path="creer-formation" element={<CreateFormationWizardPage />} />
            <Route path="formations/new" element={<CreateFormationWizardPage />} />
            <Route path="formations/:id" element={<FormationFormPage />} />
          </Route>
        </Route>

        {/* ESPACE FORMATEUR / ENSEIGNANT */}
        <Route element={<ProtectedRoute allowedRoles={['INSTRUCTOR', 'ADMIN']} />}>
          <Route path="/formateur" element={<InstructorLayout />}>
            <Route index element={<InstructorDashboardPage />} />
            <Route path="mes-formations" element={<InstructorFormationsPage />} />
            <Route path="creer-formation" element={<CreateFormationWizardPage />} />
            <Route path="apprenants" element={<InstructorStudentsPage />} />
            <Route path="bibliotheque" element={<LibraryPage />} />
            <Route path="evaluations" element={<InstructorEvaluationsPage />} />
          </Route>
        </Route>

        {/* ESPACE APPRENANT (ACCESSIBLE À TOUS LES RÔLES) */}
        <Route element={<ProtectedRoute allowedRoles={['STUDENT', 'INSTRUCTOR', 'ADMIN']} />}>
          <Route path="/apprenant" element={<StudentLayout />}>
            <Route index element={<StudentDashboardPage />} />
            <Route path="catalogue" element={<CataloguePage />} />
            <Route path="mes-formations" element={<MyCoursesPage />} />
            <Route path="coach-ia" element={<CoachIAPage />} />
            <Route path="actualites" element={<NewsPage />} />
            <Route path="bibliotheque" element={<LibraryPage />} />
            <Route path="outils" element={<ToolsPage />} />
            <Route path="outils/ide" element={<IdePage />} />
            <Route path="outils/tableur" element={<TableurPage />} />
            <Route path="outils/notes" element={<NotesPage />} />
            <Route path="outils/calculatrice" element={<CalculatricePage />} />
            <Route path="outils/tableau-blanc" element={<TableauBlancPage />} />
            <Route path="outils/modelisation-3d" element={<Modelisation3DPage />} />
            <Route path="formations/:id" element={<FormationDetailPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
    </ConfirmProvider>
    </ToastProvider>
    </ThemeProvider>
  )
}

export default App
