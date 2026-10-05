import { GoogleOAuthProvider } from '@react-oauth/google'
import { useTranslation } from 'react-i18next'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { ConfirmProvider } from './components/ConfirmContext'
import { ToastProvider } from './components/ToastContext'
import { AdminLayout } from './pages/admin/AdminLayout'
import { AdminLogsPage } from './pages/admin/AdminLogsPage'
import { ApprenantsPage } from './pages/admin/ApprenantsPage'
import { AnnoncesPage } from './pages/admin/AnnoncesPage'
import { CategoriesPage } from './pages/admin/CategoriesPage'
import { DashboardPage } from './pages/admin/DashboardPage'
import { DepartementsPage } from './pages/admin/DepartementsPage'
import { DocumentsPage } from './pages/admin/DocumentsPage'
import { FormateursPage } from './pages/admin/FormateursPage'
import { FormationFormPage } from './pages/admin/FormationFormPage'
import { FormationsPage } from './pages/admin/FormationsPage'
import { AuthPage } from './pages/AuthPage'
import { HomePage } from './pages/HomePage'
import { PublicAbonnementsPage } from './pages/PublicAbonnementsPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { InstructorDashboardPage } from './pages/instructor/InstructorDashboardPage'
import { InstructorEvaluationsPage } from './pages/instructor/InstructorEvaluationsPage'
import { InstructorFormationsPage } from './pages/instructor/InstructorFormationsPage'
import { InstructorLayout } from './pages/instructor/InstructorLayout'
import { InstructorMessagerieChatPage } from './pages/instructor/InstructorMessagerieChatPage'
import { InstructorStudentsPage } from './pages/instructor/InstructorStudentsPage'
import { PremiumGate } from './components/PremiumGate'
import { ParametresPage } from './pages/ParametresPage'
import { EtablissementLayout } from './pages/etablissement/EtablissementLayout'
import { EtablissementDashboardPage } from './pages/etablissement/EtablissementDashboardPage'
import { EtablissementMembresPage } from './pages/etablissement/EtablissementMembresPage'
import { EtablissementClassesPage } from './pages/etablissement/EtablissementClassesPage'
import { AbonnementsPage } from './pages/admin/AbonnementsPage'
import { EtablissementsPage } from './pages/admin/EtablissementsPage'
import { AbonnementPage } from './pages/student/AbonnementPage'
import { CalculatricePage } from './pages/student/CalculatricePage'
import { CataloguePage } from './pages/student/CataloguePage'
import { CoachIAPage } from './pages/student/CoachIAPage'
import { FormationDetailPage } from './pages/student/FormationDetailPage'
import { IdePage } from './pages/student/IdePage'
import { LibraryPage } from './pages/student/LibraryPage'
import { MessagerieChatPage } from './pages/student/MessagerieChatPage'
import { ArduinoPage } from './pages/student/ArduinoPage'
import { CartographiePage } from './pages/student/CartographiePage'
import { ChimiePage } from './pages/student/ChimiePage'
import { Modelisation3DPage } from './pages/student/Modelisation3DPage'
import { MyCoursesPage } from './pages/student/MyCoursesPage'
import { ProgressionPage } from './pages/student/ProgressionPage'
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

// Chaîne vide acceptée par GoogleOAuthProvider sans planter : tant que la
// clé n'est pas fournie dans .env, le bouton Google reste juste inopérant
// (géré explicitement par GoogleAuthButton) plutôt que de faire planter l'app.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

function App() {
  const { i18n } = useTranslation()
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID} locale={i18n.language}>
    <ThemeProvider>
    <ToastProvider>
    <ConfirmProvider>
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/abonnements" element={<PublicAbonnementsPage />} />
        <Route path="/login" element={<AuthPage initialMode="login" />} />
        <Route path="/register" element={<AuthPage initialMode="register" />} />
        <Route path="/reinitialiser-mot-de-passe" element={<ResetPasswordPage />} />

        {/* N'importe quel rôle connecté */}
        <Route element={<ProtectedRoute />}>
          <Route path="/welcome" element={<WelcomePage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="apprenants" element={<ApprenantsPage />} />
            <Route path="formateurs" element={<FormateursPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="annonces" element={<AnnoncesPage />} />
            <Route path="departements" element={<DepartementsPage />} />
            <Route path="etablissements" element={<EtablissementsPage />} />
            <Route path="abonnements" element={<AbonnementsPage />} />
            <Route path="formations" element={<FormationsPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="logs" element={<AdminLogsPage />} />
            <Route path="creer-formation" element={<CreateFormationWizardPage />} />
            <Route path="creer-formation/:id" element={<CreateFormationWizardPage />} />
            <Route path="formations/:id" element={<FormationFormPage />} />
            <Route path="settings" element={<ParametresPage />} />
          </Route>
        </Route>

        {/* ESPACE FORMATEUR / ENSEIGNANT */}
        <Route element={<ProtectedRoute allowedRoles={['INSTRUCTOR']} />}>
          <Route path="/formateur" element={<InstructorLayout />}>
            <Route index element={<InstructorDashboardPage />} />
            <Route path="mes-formations" element={<InstructorFormationsPage />} />
            <Route path="creer-formation" element={<CreateFormationWizardPage />} />
            <Route path="creer-formation/:id" element={<CreateFormationWizardPage />} />
            <Route path="apprenants" element={<InstructorStudentsPage />} />
            <Route path="messagerie" element={<InstructorMessagerieChatPage />} />
            <Route path="bibliotheque" element={<LibraryPage />} />
            <Route path="evaluations" element={<InstructorEvaluationsPage />} />
            <Route path="parametres" element={<ParametresPage />} />
          </Route>
        </Route>

        {/* ESPACE ÉTABLISSEMENT (RESPONSABLE B2B) */}
        <Route element={<ProtectedRoute allowedRoles={['ETABLISSEMENT_ADMIN']} />}>
          <Route path="/etablissement" element={<EtablissementLayout />}>
            <Route index element={<EtablissementDashboardPage />} />
            <Route path="apprenants" element={<EtablissementMembresPage role="STUDENT" />} />
            <Route path="formateurs" element={<EtablissementMembresPage role="INSTRUCTOR" />} />
            <Route path="classes" element={<EtablissementClassesPage />} />
            <Route path="parametres" element={<ParametresPage />} />
          </Route>
        </Route>

        {/* ESPACE APPRENANT (RÉSERVÉ AUX APPRENANTS) */}
        <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
          <Route path="/apprenant" element={<StudentLayout />}>
            <Route index element={<StudentDashboardPage />} />
            <Route path="catalogue" element={<CataloguePage />} />
            <Route path="mes-formations" element={<MyCoursesPage />} />
            <Route path="progression" element={<ProgressionPage />} />
            <Route path="coach-ia" element={<CoachIAPage />} />
            <Route path="messagerie" element={<PremiumGate><MessagerieChatPage /></PremiumGate>} />
            <Route path="actualites" element={<NewsPage />} />
            <Route path="bibliotheque" element={<LibraryPage />} />
            <Route path="abonnement" element={<AbonnementPage />} />
            <Route path="outils" element={<ToolsPage />} />
            <Route path="outils/ide" element={<PremiumGate tool="IDE"><IdePage /></PremiumGate>} />
            <Route path="outils/tableur" element={<PremiumGate tool="TABLEUR"><TableurPage /></PremiumGate>} />
            <Route path="outils/notes" element={<PremiumGate tool="NOTES"><NotesPage /></PremiumGate>} />
            <Route path="outils/calculatrice" element={<PremiumGate tool="CALCULATRICE"><CalculatricePage /></PremiumGate>} />
            <Route path="outils/tableau-blanc" element={<PremiumGate tool="TABLEAU_BLANC"><TableauBlancPage /></PremiumGate>} />
            <Route path="outils/modelisation-3d" element={<PremiumGate tool="MODELISATION_3D"><Modelisation3DPage /></PremiumGate>} />
            <Route path="outils/chimie-3d" element={<PremiumGate tool="CHIMIE_3D"><ChimiePage /></PremiumGate>} />
            <Route path="outils/cartographie" element={<PremiumGate tool="CARTOGRAPHIE"><CartographiePage /></PremiumGate>} />
            <Route path="outils/arduino" element={<PremiumGate tool="ARDUINO"><ArduinoPage /></PremiumGate>} />
            <Route path="parametres" element={<ParametresPage />} />
          </Route>
        </Route>

        {/* Un formateur/admin peut consulter l'intégralité d'une formation
            (la sienne, ou toute formation côté admin) sans avoir accès au
            reste de l'espace apprenant — seule cette page précise leur est
            ouverte, jamais le dashboard/catalogue/outils/messagerie apprenant. */}
        <Route element={<ProtectedRoute allowedRoles={['STUDENT', 'INSTRUCTOR', 'ADMIN']} />}>
          <Route path="/apprenant" element={<StudentLayout />}>
            <Route path="formations/:id" element={<FormationDetailPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
    </ConfirmProvider>
    </ToastProvider>
    </ThemeProvider>
    </GoogleOAuthProvider>
  )
}

export default App
