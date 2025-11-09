import { Toaster } from "@/features/ui/toaster";
import { Toaster as Sonner } from "@/features/ui/sonner";
import { TooltipProvider } from "@/features/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/features/1-login";
import { CentralizedUserDataProvider } from "@/features/1-login/contexts/CentralizedUserDataContext";
import { ProtectedRoute, PublicRoute } from "@/components/ProtectedRoute";
import { UniversalProtectedRoute } from "@/components/UniversalProtectedRoute";
import { HomeAccessGuard } from "@/components/HomeAccessGuard";
import { SubscriptionExpiryGuard } from "@/components/SubscriptionExpiryGuard";
import Index from "./features/1-login/pages/Index";
import Login from "./features/1-login/pages/Login";
import Register from "./features/1-login/pages/Register";
import VerifyEmail from "./features/1-login/pages/VerifyEmail";
import EmailVerified from "./features/1-login/pages/EmailVerified";
import CreateOrganization from "./features/1-login/pages/CreateOrganization";
import MobileCreateOrganization from "./mobile/login/CreateOrganization";
import CreatePlan from "./features/1-login/pages/CreatePlan";
import EmployeeWelcome from "./features/1-login/pages/EmployeeWelcome";
import TermsAndConditions from "./features/1-login/pages/TermsAndConditions";
import NotFound from "./features/1-login/pages/NotFound";
import { useIsMobile } from "./mobile/hooks/use-mobile";
import ModernHomePage from "./features/1_home/pages/ModernHomePage";
import MobileHome from "./mobile/pages/home/Absensi";
import MobileProfile from "./mobile/pages/home/Profile";
import MobileSchedule from "./mobile/pages/home/Schedule";
import MobileClientVisit from "./mobile/pages/home/ClientVisit";
import MobileReports from "./mobile/pages/home/Reports";
import PasswordManagerPage from "./features/8-PaswordManager/PasswordManagerPage";
import DesktopDailyTaskPage from "./features/8-2-DailyTask/DailyTaskPage";
import MobileDailyTaskPage from "./mobile/pages/daily task/DailyTaskPage";
import DesktopMeetingNotesPage from "./features/8-1-meeting-notes/MeetingNotesPage";
import SocialMediaDashboardPage from "./features/6-1-dashboard/SocialMediaDashboardPage";
import ContentCalendarPage from "./features/6-1-ContentCalendar/ContentCalendarPage";
import SettingsPage from "./features/6-1-Settings/SettingsPage";
import UserSettingsPage from "./features/Settings/SettingsPage";
import ManagementTabPageDesktop from "./features/10-management/pages/ManagementTabPage";
import OverviewTabPageDesktop from "./features/10-overview/OverviewTabPage";
import PlansTabPageDesktop from "./features/10-Plans/PlansTabPage";
import ManagementTabPageMobile from "./mobile/pages/subscription/ManagementTabPage";
import OverviewTabPageMobile from "./mobile/pages/subscription/OverviewTabPage";
import PlansTabPageMobile from "./mobile/pages/subscription/PlansTabPage";
import EmployeePage from "./features/2-1-employees/EmployeePage";
import AddEmployeePage from "./features/2-1-employees/add-employee/AddEmployeePage";
import FirstLogin from "./features/2-1-employees/employee-invitation/FirstLogin";
import OKRPage from "./features/1-okr/OKRPage";
import EmployeePersonalInfo from "./features/2-1-employees/MyInfo/PersonalInformation/pages/EmployeePersonalInfo";
import EmployeeAddressInfo from "./features/2-1-employees/MyInfo/AddressInformation/pages/EmployeeAddressInfo";
import EmployeeEmploymentInfo from "./features/2-1-employees/MyInfo/Employment/pages/EmployeeEmploymentInfo";
import EmployeeEducationFormal from "./features/2-1-employees/MyInfo/Education/pages/EmployeeEducationFormal";
import EmployeeEducationInformal from "./features/2-1-employees/MyInfo/InformalEducation/pages/EmployeeEducationInformal";
import EmployeeWork from "./features/2-1-employees/MyInfo/WorkExperience/pages/EmployeeWork";
import EmployeeFamily from "./features/2-1-employees/MyInfo/FamilyMembers/pages/EmployeeFamily";
import EmployeeAttendance from "./features/2-1-employees/MyInfo/Attendance/pages/EmployeeAttendance";
import EmployeeLeavePermit from "./features/2-1-employees/MyInfo/LeavePermit/pages/EmployeeLeavePermit";
import EmployeeDocuments from "./features/2-1-employees/MyInfo/Documents/pages/EmployeeDocuments";
import EmployeePayroll from "./features/2-1-employees/MyInfo/Payroll/pages/EmployeePayroll";
import { ReprimandManagementPage } from "./features/2-1-reprimand";
import { PageAccessTab } from "./features/2-9-PageAccess/PageAccessTab";
import { AccessPermissionsConfig } from "./features/2-9-PageAccess/component/AccessPermissionsPage";
import AttendancePage from "./features/2-3-attendance/AttendancePage";
// Removed legacy imports - using ProtectedRoute instead
// import { AccessPermissionsGuard } from "./features/2-9-PageAccess/guards/AccessPermissionsGuard";
// import { AccessPermissionsRedirector } from "./features/2-9-PageAccess/redirectors/AccessPermissionsRedirector";
import { useSecurityInterceptor } from "./hooks/useSecurityInterceptor";
import { PlaceholderPage } from "./features/2-9-PageAccess/PlaceholderPage";
import TransferOwnership from "./features/1-layouts/TransferOwnership/page/TransferOwnership";
import { Settings, Users, UserCheck, FileText, Briefcase } from "lucide-react";
import DesktopDailyTaskReportPage from "./features/8-2-DailyTaskReport/pages/DailyTaskReportPage";
import CampaignCalculator from "./features/8-3-campaign-calculator/pages/CampaignCalculator";
import MobileDailyTaskReportPage from "./mobile/pages/daily task report/DailyTaskReportPage";
import MobileMeetingNotesPage from "./mobile/pages/meeting notes/MeetingNotesPage";

// Import debug utilities in development
if (process.env.NODE_ENV === 'development') {
  import('./utils/debugPermissions');
  import('./utils/testRouteProtection');
}

const queryClient = new QueryClient();

// Security Wrapper Component
const SecurityWrapper = ({ children }: { children: React.ReactNode }) => {
  // ACTIVATE GLOBAL SECURITY INTERCEPTOR
  useSecurityInterceptor();
  return <>{children}</>;
};

// Route element selector for Login: uses viewport hook + UA heuristics
// Always use the feature-based Login.tsx for all devices (mobile and desktop)
const LoginRouteElement = () => {
  return <Login />;
};

// Route element selector for Home: uses viewport hook + UA heuristics
const HomeRouteElement = () => {
  const isViewportMobile = useIsMobile();
  const isMobileUserAgent = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
  const isMobile = isViewportMobile || isMobileUserAgent;
  return isMobile ? <MobileHome /> : <ModernHomePage />;
};

// Route element selector for EmployeeWelcome
// Always use the feature-based EmployeeWelcome.tsx for all devices (mobile and desktop)
const EmployeeWelcomeRouteElement = () => {
  return <EmployeeWelcome />;
};
// Route element selector for Create Organization
// Use mobile version if detected on smartphone, otherwise use desktop version
const CreateOrganizationRouteElement = () => {
  const isViewportMobile = useIsMobile();
  const isMobileUserAgent = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
  const isMobile = isViewportMobile || isMobileUserAgent;
  return isMobile ? <MobileCreateOrganization /> : <CreateOrganization />;
};

// Route element selector for Profile
const useMobileDetection = () => {
  const isViewportMobile = useIsMobile();
  const isMobileUserAgent = typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
  return isViewportMobile || isMobileUserAgent;
};

const DailyTaskRouteElement = () => {
  const isMobile = useMobileDetection();
  return isMobile ? <MobileDailyTaskPage /> : <DesktopDailyTaskPage />;
};

const DailyTaskReportRouteElement = () => {
  const isMobile = useMobileDetection();
  return isMobile ? <MobileDailyTaskReportPage /> : <DesktopDailyTaskReportPage />;
};

const MeetingNotesRouteElement = () => {
  const isMobile = useMobileDetection();
  return isMobile ? <MobileMeetingNotesPage /> : <DesktopMeetingNotesPage />;
};

const ProfileRouteElement = () => {
  return <MobileProfile />;
};

const SubscriptionOverviewRouteElement = () => {
  const isMobile = useMobileDetection();
  return isMobile ? <OverviewTabPageMobile /> : <OverviewTabPageDesktop />;
};

const SubscriptionPlansRouteElement = () => {
  const isMobile = useMobileDetection();
  return isMobile ? <PlansTabPageMobile /> : <PlansTabPageDesktop />;
};

const SubscriptionManagementRouteElement = () => {
  const isMobile = useMobileDetection();
  return isMobile ? <ManagementTabPageMobile /> : <ManagementTabPageDesktop />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CentralizedUserDataProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <SecurityWrapper>
              <SubscriptionExpiryGuard>
                <Routes>
                {/* ======= PROTECTED ROUTES ======= */}
                {/* PROTECTION SYSTEM */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <HomeAccessGuard>
                      <HomeRouteElement />
                    </HomeAccessGuard>
                  </ProtectedRoute>
                } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <HomeAccessGuard>
                    <HomeRouteElement />
                  </HomeAccessGuard>
                </ProtectedRoute>
              } />
              
              {/* Public Routes - Only accessible when NOT logged in */}
              <Route path="/login" element={
                <PublicRoute>
                  <LoginRouteElement />
                </PublicRoute>
              } />
              <Route path="/register" element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              } />
              <Route path="/verify-email" element={
                <VerifyEmail />
              } />
              <Route path="/email-verified" element={
                <EmailVerified />
              } />
              
              {/* Semi-Protected Routes - Have their own authentication logic */}
              <Route path="/create-organization" element={
                <ProtectedRoute requiresPermissions={false}>
                  <CreateOrganizationRouteElement />
                </ProtectedRoute>
              } />
              <Route path="/create-plan" element={
                <ProtectedRoute requiresPermissions={false}>
                  <CreatePlan />
                </ProtectedRoute>
              } />
              <Route path="/employee-welcome" element={
                <ProtectedRoute requiresPermissions={false}>
                  <EmployeeWelcomeRouteElement />
                </ProtectedRoute>
              } />
              <Route path="/first-login" element={
                <ProtectedRoute requiresAuth={false} requiresPermissions={false}>
                  <FirstLogin />
                </ProtectedRoute>
              } />
              
              {/* Public Terms Page */}
              <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
              
              {/* ======= UNIVERSAL PROTECTED APPLICATION ROUTES ======= */}
              {/* ALL ROUTES CONTROLLED BY PAGE ACCESS CONFIGURATION DATABASE */}
              <Route path="/password-manager" element={
                <UniversalProtectedRoute>
                  <PasswordManagerPage />
                </UniversalProtectedRoute>
              } />
              <Route path="/daily-task" element={
                <UniversalProtectedRoute>
                  <DesktopDailyTaskPage />
                </UniversalProtectedRoute>
              } />
              <Route path="/tools/daily-task" element={
                <UniversalProtectedRoute>
                  <DailyTaskRouteElement />
                </UniversalProtectedRoute>
              } />
              <Route path="/tools/meeting-notes" element={
                <UniversalProtectedRoute>
                  <MeetingNotesRouteElement />
                </UniversalProtectedRoute>
              } />
              <Route path="/tools/campaign-calculator" element={
                <UniversalProtectedRoute>
                  <CampaignCalculator />
                </UniversalProtectedRoute>
              } />
              <Route path="/tools/daily-task-report" element={
                <UniversalProtectedRoute>
                  <DailyTaskReportRouteElement />
                </UniversalProtectedRoute>
              } />
              
              {/* Digital Marketing Routes - BASIC PROTECTION (Reduce Emergency Bypass) */}
              <Route path="/digital-marketing/social-media" element={
                <ProtectedRoute>
                  <SocialMediaDashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/digital-marketing/social-media/dashboard" element={
                <ProtectedRoute>
                  <SocialMediaDashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/digital-marketing/social-media/content-calendar" element={
                <ProtectedRoute>
                  <ContentCalendarPage />
                </ProtectedRoute>
              } />
              <Route path="/digital-marketing/social-media/settings" element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              } />
              
              {/* Subscription Routes - BASIC PROTECTION (Reduce Emergency Bypass) */}
              <Route path="/subscription" element={
                <ProtectedRoute>
                  <Navigate to="/subscription/overview" replace />
                </ProtectedRoute>
              } />
              <Route path="/subscription/overview" element={
                <ProtectedRoute>
                  <SubscriptionOverviewRouteElement />
                </ProtectedRoute>
              } />
              <Route path="/subscription/plans" element={
                <ProtectedRoute>
                  <SubscriptionPlansRouteElement />
                </ProtectedRoute>
              } />
              <Route path="/subscription/management" element={
                <ProtectedRoute>
                  <SubscriptionManagementRouteElement />
                </ProtectedRoute>
              } />
              
              {/* Employee Management Routes - PROTECTED */}
              <Route path="/employees" element={
                <ProtectedRoute>
                  <EmployeePage />
                </ProtectedRoute>
              } />
              <Route path="/employees/add" element={
                <ProtectedRoute>
                  <AddEmployeePage />
                </ProtectedRoute>
              } />
              <Route path="/employees/reprimand" element={
                <ProtectedRoute>
                  <ReprimandManagementPage />
                </ProtectedRoute>
              } />
              
              {/* Attendance Routes - PROTECTED */}
              <Route path="/attendance" element={
                <ProtectedRoute>
                  <AttendancePage />
                </ProtectedRoute>
              } />
              <Route path="/attendance/attendance" element={
                <ProtectedRoute>
                  <AttendancePage />
                </ProtectedRoute>
              } />
              <Route path="/attendance/settings" element={
                <ProtectedRoute>
                  <AttendancePage />
                </ProtectedRoute>
              } />
              
              {/* OKR Routes - PROTECTED */}
              <Route path="/okr/company-objective" element={
                <ProtectedRoute>
                  <OKRPage />
                </ProtectedRoute>
              } />
              <Route path="/okr/department-objective" element={
                <ProtectedRoute>
                  <OKRPage />
                </ProtectedRoute>
              } />
              <Route path="/okr/individual-objective" element={
                <ProtectedRoute>
                  <OKRPage />
                </ProtectedRoute>
              } />
              
              {/* ======= ACCESS PERMISSIONS - BASIC PROTECTED (Database-Only Control) ======= */}
              {/* Using ProtectedRoute to allow database-only access control */}
              <Route path="/access-permissions" element={
                <ProtectedRoute requiresPermissions={false}>
                  <AccessPermissionsConfig />
                </ProtectedRoute>
              } />
              
              {/* Page Access Tab - BASIC PROTECTED (Database-Only Access Control) */}
              <Route path="/access-permissions/page-access" element={
                <ProtectedRoute requiresPermissions={false}>
                  <PageAccessTab />
                </ProtectedRoute>
              } />
              
              {/* Overview Tab - BASIC PROTECTED (Database-Only Control) */}
              <Route path="/access-permissions/overview" element={
                <ProtectedRoute requiresPermissions={false}>
                  <AccessPermissionsConfig />
                </ProtectedRoute>
              } />
              
              {/* Roles Tab - BASIC PROTECTED (Database-Only Control) */}
              <Route path="/access-permissions/roles" element={
                <ProtectedRoute requiresPermissions={false}>
                  <AccessPermissionsConfig />
                </ProtectedRoute>
              } />
              
              {/* Pages Tab - BASIC PROTECTED (Database-Only Control) */}
              <Route path="/access-permissions/pages" element={
                <ProtectedRoute requiresPermissions={false}>
                  <AccessPermissionsConfig />
                </ProtectedRoute>
              } />
              
              {/* Admin Routes - PROTECTED */}
              <Route path="/admin" element={
                <ProtectedRoute>
                  <PlaceholderPage 
                    title="Admin Panel" 
                    description="Panel administrasi sistem akan segera tersedia"
                    icon={<Settings className="h-8 w-8 text-gray-500" />}
                  />
                </ProtectedRoute>
              } />
              <Route path="/admin/settings" element={
                <ProtectedRoute>
                  <PlaceholderPage 
                    title="Admin Settings" 
                    description="Pengaturan administrasi sistem akan segera tersedia"
                    icon={<Settings className="h-8 w-8 text-gray-500" />}
                  />
                </ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute>
                  <PlaceholderPage 
                    title="Admin Users" 
                    description="Manajemen pengguna admin akan segera tersedia"
                    icon={<Users className="h-8 w-8 text-gray-500" />}
                  />
                </ProtectedRoute>
              } />
              
              {/* User Management Routes - PROTECTED */}
              <Route path="/users/permissions" element={
                <ProtectedRoute>
                  <PlaceholderPage 
                    title="User Permissions" 
                    description="Manajemen izin pengguna akan segera tersedia"
                    icon={<UserCheck className="h-8 w-8 text-gray-500" />}
                  />
                </ProtectedRoute>
              } />
              <Route path="/users/roles" element={
                <ProtectedRoute>
                  <PlaceholderPage 
                    title="User Roles Management" 
                    description="Manajemen peran pengguna akan segera tersedia"
                    icon={<Users className="h-8 w-8 text-gray-500" />}
                  />
                </ProtectedRoute>
              } />
              
              {/* Recruitment Routes - PROTECTED */}
              <Route path="/recruitment" element={
                <ProtectedRoute>
                  <PlaceholderPage 
                    title="Recruitment" 
                    description="Sistem rekrutmen akan segera tersedia"
                    icon={<Briefcase className="h-8 w-8 text-gray-500" />}
                  />
                </ProtectedRoute>
              } />
              <Route path="/recruitment/interviewees" element={
                <ProtectedRoute>
                  <PlaceholderPage 
                    title="Interviewees" 
                    description="Manajemen kandidat interview akan segera tersedia"
                    icon={<Users className="h-8 w-8 text-gray-500" />}
                  />
                </ProtectedRoute>
              } />
              
              
              {/* Transfer Ownership Route - PROTECTED */}
              <Route path="/transfer-ownership" element={
                <ProtectedRoute>
                  <TransferOwnership />
                </ProtectedRoute>
              } />
              
              {/* Employee Profile Routes */}
              <Route path="/my-info/personal" element={
                <ProtectedRoute requiresPermissions={false}>
                  <EmployeePersonalInfo />
                </ProtectedRoute>
              } />
              <Route path="/my-info/address" element={
                <ProtectedRoute requiresPermissions={false}>
                  <EmployeeAddressInfo />
                </ProtectedRoute>
              } />
              <Route path="/my-info/employment" element={
                <ProtectedRoute requiresPermissions={false}>
                  <EmployeeEmploymentInfo />
                </ProtectedRoute>
              } />
              <Route path="/my-info/education/formal" element={
                <ProtectedRoute requiresPermissions={false}>
                  <EmployeeEducationFormal />
                </ProtectedRoute>
              } />
              <Route path="/my-info/education/informal" element={
                <ProtectedRoute requiresPermissions={false}>
                  <EmployeeEducationInformal />
                </ProtectedRoute>
              } />
              <Route path="/my-info/work" element={
                <ProtectedRoute requiresPermissions={false}>
                  <EmployeeWork />
                </ProtectedRoute>
              } />
              <Route path="/my-info/family" element={
                <ProtectedRoute requiresPermissions={false}>
                  <EmployeeFamily />
                </ProtectedRoute>
              } />
              <Route path="/my-info/attendance" element={
                <ProtectedRoute requiresPermissions={false}>
                  <EmployeeAttendance />
                </ProtectedRoute>
              } />
              <Route path="/my-info/leave-permit" element={
                <ProtectedRoute requiresPermissions={false}>
                  <EmployeeLeavePermit />
                </ProtectedRoute>
              } />
              <Route path="/my-info/documents" element={
                <ProtectedRoute requiresPermissions={false}>
                  <EmployeeDocuments />
                </ProtectedRoute>
              } />
              <Route path="/my-info/payroll" element={
                <ProtectedRoute requiresPermissions={false}>
                  <EmployeePayroll />
                </ProtectedRoute>
              } />

              {/* Mobile Profile Route */}
              <Route path="/profile" element={
                <ProtectedRoute>
                  <ProfileRouteElement />
                </ProtectedRoute>
              } />

              {/* Mobile Schedule Route */}
              <Route path="/schedule" element={
                <ProtectedRoute>
                  <MobileSchedule />
                </ProtectedRoute>
              } />

              {/* Mobile Client Visit Route */}
              <Route path="/client-visit" element={
                <ProtectedRoute>
                  <MobileClientVisit />
                </ProtectedRoute>
              } />

              {/* Mobile Reports Route */}
              <Route path="/reports" element={
                <ProtectedRoute>
                  <MobileReports />
                </ProtectedRoute>
              } />

              {/* User Settings Route */}
              <Route path="/settings/*" element={
                <ProtectedRoute>
                  <UserSettingsPage />
                </ProtectedRoute>
              } />
              
              {/* ======= SECURITY: Access Permissions Catch-All ======= */}
              {/* Catch any unregistered /access-permissions/* paths - redirect to main page-access */}
              <Route path="/access-permissions/*" element={
                <ProtectedRoute>
                  <PlaceholderPage />
                </ProtectedRoute>
              } />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
                </Routes>
              </SubscriptionExpiryGuard>
            </SecurityWrapper>
          </BrowserRouter>
        </CentralizedUserDataProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
