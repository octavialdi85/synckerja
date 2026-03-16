import { Toaster } from "@/features/ui/toaster";
import { Toaster as Sonner } from "@/features/ui/sonner";
import { TooltipProvider } from "@/features/ui/tooltip";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/features/1-login";
import { CentralizedUserDataProvider } from "@/features/1-login/contexts/CentralizedUserDataContext";
import { CurrentOrgProvider } from "@/features/1-login/contexts/CurrentOrgContext";
import { LanguageProvider } from "@/features/share/i18n/LanguageProvider";
import { ProtectedRoute, PublicRoute } from "@/components/ProtectedRoute";
import { UniversalProtectedRoute } from "@/components/UniversalProtectedRoute";
import { HomeAccessGuard } from "@/components/HomeAccessGuard";
import { SubscriptionExpiryGuard } from "@/components/SubscriptionExpiryGuard";
import Inde from "./features/1-login/pages/Index";
import Login from "./features/1-login/pages/Login";
import Register from "./features/1-login/pages/Register";
import VerifyEmail from "./features/1-login/pages/VerifyEmail";
import EmailVerified from "./features/1-login/pages/EmailVerified";
import CreateOrganization from "./features/1-login/pages/CreateOrganization";
import MobileCreateOrganization from "./mobile/login/CreateOrganization";
import CreatePlan from "./features/1-login/pages/CreatePlan";
import EmployeeWelcome from "./features/1-login/pages/EmployeeWelcome";
import TermsAndConditions from "./features/1-login/pages/TermsAndConditions";
import { TermsOfServicePage, PrivacyPolicyPage } from "./features/policy";
import NotFound from "./features/1-login/pages/NotFound";
import { useDesktopLayout } from "./mobile/hooks/use-device-orientation";
import ModernHomePage from "./features/1_home/pages/ModernHomePage";
import MobileHome from "./mobile/pages/home/Absensi";
import MobileProfile from "./mobile/pages/home/Profile";
import MobileSchedule from "./mobile/pages/home/Schedule";
import MobileClientVisit from "./mobile/pages/home/ClientVisit";
import MobileReports from "./mobile/pages/home/Reports";
import PasswordManagerPage from "./features/8-PasswordManager/PasswordManagerPage";
import DesktopDailyTaskPage from "./features/8-2-DailyTask/DailyTaskPage";
import { DailyTaskProvider } from "./features/8-2-DailyTask/DailyTaskContext";
import MobileDailyTaskPage from "./mobile/pages/daily task/DailyTaskPage";
import DesktopMeetingNotesPage from "./features/8-1-meeting-notes/MeetingNotesPage";
import SocialMediaDashboardPage from "./features/6-1-dashboard/SocialMediaDashboardPage";
import ContentCalendarPage from "./features/6-1-ContentCalendar/ContentCalendarPage";
import ProductKnowledgePage from "./features/6-1-ProductKnowledge/ProductKnowledgePage";
import ScriptGeneratorPage from "./features/6-1-ScriptGenerator/ScriptGeneratorPage";
import SettingsPage from "./features/6-1-Settings/SettingsPage";
import { ReviewRouteGate } from "./features/6-1-dashboard/ReviewRouteGate";
import { KOLDashboardPage } from "./features/6_4_1_dashboard";
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
import { CompanyDashboardPage } from "./features/2-8-dashboard";
import DashboardOverview from "./features/2_2_dashboard/DashboardOverview";
import { JobOpeningsPage } from "./features/2_2_dashboard/JobOpeningsPage";
import { ApplicationsPageWrapper } from "./features/2_2_dashboard/ApplicationsPageWrapper";
import { IntervieweesPage } from "./features/2_2_Interviewees/IntervieweesPage";
import JobApplication from "./features/2_2_Applications/JobApplication";
import JobPreview from "./features/2_2_Applications/JobPreview";
import ApplicationThankYou from "./features/2_2_Applications/ApplicationThankYou";
import CandidateProfile from "./features/2_2_Applications/CandidateProfile";
import CandidateProfileThankYou from "./features/2_2_Applications/CandidateProfileThankYou";
import CandidateProfileInterviewees from "./features/2_2_Interviewees/CandidateProfile";
import { CompanyCompanyAssetsPage } from "@/features/2-8-company-assets";
import { CompanyFilesPage } from "@/features/2-8-files";
import { CompanyOrganizationPage } from "@/features/2-8-organization";
import { StandardLayout } from "@/features/1-layouts/StandardLayout";
// Removed legacy imports - using ProtectedRoute instead
// import { AccessPermissionsGuard } from "./features/2-9-PageAccess/guards/AccessPermissionsGuard";
// import { AccessPermissionsRedirector } from "./features/2-9-PageAccess/redirectors/AccessPermissionsRedirector";
import { useSecurityInterceptor } from "./hooks/useSecurityInterceptor";
import { PlaceholderPage } from "./features/2-9-PageAccess/PlaceholderPage";
import TransferOwnership from "./features/1-layouts/TransferOwnership/page/TransferOwnership";
import { Settings, Users, UserCheck, FileText, Briefcase } from "lucide-react";
import DesktopDailyTaskReportPage from "./features/8-2-DailyTaskReport/pages/DailyTaskReportPage";
import MobileDailyTaskReportPage from "./mobile/pages/daily task report/DailyTaskReportPage";
import HabitTrackerPage from "./features/8-2-HabitTracker/pages/HabitTrackerPage";
import MobileHabitTrackerPage from "./mobile/pages/habits/HabitTrackerMobilePage";
import MobileMeetingNotesPage from "./mobile/pages/meeting notes/MeetingNotesPage";
import MobileInitiativePage from "./mobile/pages/Initiative/InitiativePage";
import MobileLiveChatPage from "./mobile/pages/livechat/LiveChatPage";
import { NativeSafeAreaWrapper } from "./mobile/components/NativeSafeAreaWrapper";
import { useAppNotificationsFCM } from "./mobile/hooks/useAppNotificationsFCM";
import { usePushNotificationHandlers } from "./mobile/hooks/usePushNotificationHandlers";
import { useLiveChatFCM } from "./mobile/pages/livechat/hooks/useLiveChatFCM";
import { CalculatorServicesPage } from "./features/8-3-calculator/services";
import { CalculatorSalesPage } from "./features/8-3-calculator/Sales";
import { PPh21Calculator as PPh21CalculatorPage } from "./features/8-4-pph-21/pages";
import { PricingTools as PricingToolsPage } from "./features/8_2_pricing-tools/pages";
import { DefaultPricesPage } from "./features/8_2_1_default_prices/pages";
import { PromoSimulationPage } from "./features/8_2_2_promo-simulation/pages";
import { SalesOperationsPage } from "./features/5-2-activities/SalesOperationsPage";
import { ConsultantDashboardPage } from "./features/5-3-dashboard/ConsultantDashboardPage";
import { LeadsManagementPage } from "./mobile/pages/leads-management";
import { CRMDashboardPage } from "./features/5-3-dashboard/CRMDashboardPage";
import { WhatsAppConnectPage, WhatsAppInboxPage, InstagramConnectPage, EmailConnectPage, MetaOAuthCallbackPage } from "./features/5-3-whatsapp";
import { IncomeDashboard } from "./features/4-1-dashboard";
import { IncomeTransactionPage } from "./features/4-1-transaction";
import { ExpenseDashboard } from "./features/4_2_dashboard";
import { DebtPage } from "./features/4_2_debt";
import { ApprovalsPage } from "./features/4_2_approvals";
import { PaymentProcessPage } from "./features/4_2_payment-process/PaymentProcessPage";
import { ReminderBillsPage } from "./features/4_2_reminder-bills/ReminderBillsPage";
import Purchase from "./features/9_request-form/pages/Purchase/Purchase";
import Reimbursement from "./features/9_request-form/pages/Reimbursement/Reimbursement";
import CashAdvance from "./features/9_request-form/pages/CashAdvance/CashAdvance";
import Loan from "./features/9_request-form/pages/Loan/Loan";

// Import debug utilities in development (non-blocking so server restart doesn't break the app)
if (import.meta.env.DEV) {
  import('./utils/debugPermissions').catch(() => {});
  import('./utils/testRouteProtection').catch(() => {});
}

// HILANGKAN refetch/reload saat pindah window/tab: nonaktifkan focusManager sepenuhnya
// TanStack Query v5 memakai visibilitychange; dengan tidak memanggil handleFocus(), refetch tidak pernah terjadi
focusManager.setEventListener((handleFocus) => {
  // Jangan pasang listener apa pun dan jangan panggil handleFocus() — refetch on window focus dihilangkan
  return () => {};
});

// Opsi: kunci state "focused" agar tidak ada transisi yang memicu refetch
focusManager.setFocused(true);

// Konfigurasi QueryClient: refetch on window focus dihilangkan secara global
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Dihilangkan: tidak refetch saat pindah window/tab
      refetchOnMount: false,
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Security Wrapper Component
const SecurityWrapper = ({ children }: { children: React.ReactNode }) => {
  // ACTIVATE GLOBAL SECURITY INTERCEPTOR
  useSecurityInterceptor();
  return <>{children}</>;
};

// Native FCM: register token for app notifications (general) + livechat and handle push taps
const NativePushSetup = () => {
  useAppNotificationsFCM();
  useLiveChatFCM();
  usePushNotificationHandlers();
  return null;
};

// Route element selector for Login: uses viewport hook + UA heuristics
// Always use the feature-based Login.ts for all devices (mobile and desktop)
const LoginRouteElement = () => {
  return <Login />;
};

// Route element selector for Home: desktop/tablet landscape = desktop version; handphone/tablet portrait = mobile
const HomeRouteElement = () => {
  const location = useLocation();
  const useDesktop = useDesktopLayout();
  return useDesktop ? <ModernHomePage key={location.pathname} /> : <MobileHome key={location.pathname} />;
};

// Route element selector for EmployeeWelcome
// Always use the feature-based EmployeeWelcome.ts for all devices (mobile and desktop)
const EmployeeWelcomeRouteElement = () => {
  return <EmployeeWelcome />;
};
// Route element selector for Create Organization: desktop/tablet landscape = desktop; handphone/tablet portrait = mobile
const CreateOrganizationRouteElement = () => {
  const useDesktop = useDesktopLayout();
  return useDesktop ? <CreateOrganization /> : <MobileCreateOrganization />;
};

// Mobile = handphone or tablet portrait; Desktop = desktop or tablet landscape
const useMobileDetection = () => {
  return !useDesktopLayout();
};

const DailyTaskRouteElement = () => {
  const isMobile = useMobileDetection();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const view = searchParams.get('view');
  
  // If mobile and view=initiative, show Initiative page
  if (isMobile && view === 'initiative') {
    return <MobileInitiativePage />;
  }
  
  return isMobile ? <MobileDailyTaskPage /> : <DesktopDailyTaskPage />;
};

const HabitTrackerRouteElement = () => {
  const isMobile = useMobileDetection();
  return isMobile ? <MobileHabitTrackerPage /> : <HabitTrackerPage />;
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

const LivechatRouteElement = () => {
  const isMobile = useMobileDetection();
  return isMobile ? <MobileLiveChatPage /> : <WhatsAppInboxPage />;
};

const LeadsManagementRouteElement = () => {
  const isMobile = useMobileDetection();
  return isMobile ? <LeadsManagementPage /> : <ConsultantDashboardPage />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CentralizedUserDataProvider>
          <CurrentOrgProvider>
          <LanguageProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true
              }}
            >
              <NativePushSetup />
              <NativeSafeAreaWrapper>
                <SecurityWrapper>
                  <SubscriptionExpiryGuard>
                    <Routes>
                    {/* ======= PROTECTED ROUTES ======= */}
                    {/* PROTECTION SYSTEM */}
                    <Route 
                      path="/" 
                      element={
                        <ProtectedRoute>
                          <HomeAccessGuard>
                            <HomeRouteElement />
                          </HomeAccessGuard>
                        </ProtectedRoute>
                      }
                    />
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
              
              {/* OAuth callback (popup) - no auth required so popup can load */}
              <Route path="/auth/meta/callback" element={<MetaOAuthCallbackPage />} />
              {/* Public Terms Page */}
              <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
              <Route path="/policy/terms" element={<TermsOfServicePage />} />
              <Route path="/policy/privacy" element={<PrivacyPolicyPage />} />
              
              {/* Public Candidate Application Route */}
              <Route path="/candidate/apply" element={
                <PublicRoute>
                  <JobApplication />
                </PublicRoute>
              } />
              {/* Public Job Application Thank You (must be before /apply/preview/:token) */}
              <Route path="/apply/thank-you" element={
                <PublicRoute>
                  <ApplicationThankYou />
                </PublicRoute>
              } />
              {/* Public Candidate Application Preview Route */}
              <Route path="/apply/preview/:token" element={
                <PublicRoute>
                  <JobPreview />
                </PublicRoute>
              } />
              {/* Public content review (QC). Logged-in users redirect to dashboard preview modal via ReviewRouteGate (fast getSession). */}
              <Route path="/review/:token" element={<ReviewRouteGate />} />
              {/* Public Candidate Profile Thank You (must be before /candidate/profile) */}
              <Route path="/candidate/profile/thank-you" element={
                <PublicRoute>
                  <CandidateProfileThankYou />
                </PublicRoute>
              } />
              {/* Public Candidate Profile Route */}
              <Route path="/candidate/profile" element={
                <PublicRoute>
                  <CandidateProfile />
                </PublicRoute>
              } />
              
              {/* ======= UNIVERSAL PROTECTED APPLICATION ROUTES ======= */}
              {/* ALL ROUTES CONTROLLED BY PAGE ACCESS CONFIGURATION DATABASE */}
              
              {/* Finance Routes */}
              <Route path="/incomes/dashboard" element={
                <ProtectedRoute>
                  <StandardLayout>
                    <IncomeDashboard />
                  </StandardLayout>
                </ProtectedRoute>
              } />
              <Route path="/incomes/transaction" element={
                <ProtectedRoute>
                  <StandardLayout>
                    <IncomeTransactionPage />
                  </StandardLayout>
                </ProtectedRoute>
              } />
              <Route path="/expenses/dashboard" element={
                <ProtectedRoute>
                  <StandardLayout>
                    <ExpenseDashboard />
                  </StandardLayout>
                </ProtectedRoute>
              } />
              <Route path="/expenses/debt" element={
                <ProtectedRoute>
                  <StandardLayout>
                    <DebtPage />
                  </StandardLayout>
                </ProtectedRoute>
              } />
              <Route path="/expenses/approvals" element={
                <ProtectedRoute>
                  <StandardLayout>
                    <ApprovalsPage />
                  </StandardLayout>
                </ProtectedRoute>
              } />
              <Route path="/expenses/payment-process" element={
                <ProtectedRoute>
                  <StandardLayout>
                    <PaymentProcessPage />
                  </StandardLayout>
                </ProtectedRoute>
              } />
              <Route path="/expenses/reminder-bills" element={
                <ProtectedRoute>
                  <StandardLayout>
                    <ReminderBillsPage />
                  </StandardLayout>
                </ProtectedRoute>
              } />
              
              {/* Request Form Routes */}
              <Route path="/request-form/purchase" element={
                <ProtectedRoute>
                  <Purchase />
                </ProtectedRoute>
              } />
              <Route path="/request-form/reimbursement" element={
                <ProtectedRoute>
                  <Reimbursement />
                </ProtectedRoute>
              } />
              <Route path="/request-form/cash-advance" element={
                <ProtectedRoute>
                  <CashAdvance />
                </ProtectedRoute>
              } />
              <Route path="/request-form/loan" element={
                <ProtectedRoute>
                  <Loan />
                </ProtectedRoute>
              } />
              
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
              <Route path="/tools/daily-task-report" element={
                <UniversalProtectedRoute>
                  <DailyTaskReportRouteElement />
                </UniversalProtectedRoute>
              } />
              <Route path="/tools/habits-tracker" element={
                <UniversalProtectedRoute>
                  <HabitTrackerRouteElement />
                </UniversalProtectedRoute>
              } />
              <Route 
                path="/tools/calculator/services" 
                element={
                  <UniversalProtectedRoute>
                    <CalculatorServicesPage />
                  </UniversalProtectedRoute>
                }
              />
              <Route 
                path="/tools/calculator/sales" 
                element={
                  <UniversalProtectedRoute>
                    <CalculatorSalesPage />
                  </UniversalProtectedRoute>
                }
              />
              <Route 
                path="/tools/pph21-calculator"
                element={
                  <UniversalProtectedRoute>
                    <PPh21CalculatorPage />
                  </UniversalProtectedRoute>
                }
              />
              <Route 
                path="/tools/default-prices"
                element={
                  <UniversalProtectedRoute>
                    <DefaultPricesPage />
                  </UniversalProtectedRoute>
                }
              />
              <Route 
                path="/tools/pricing-tools"
                element={
                  <UniversalProtectedRoute>
                    <PricingToolsPage />
                  </UniversalProtectedRoute>
                }
              />
              <Route 
                path="/tools/promo-simulation"
                element={
                  <UniversalProtectedRoute>
                    <PromoSimulationPage />
                  </UniversalProtectedRoute>
                }
              />
              
              {/* Digital Marketing Routes - BASIC PROTECTION (Reduce Emergency Bypass) */}
              <Route path="/digital-marketing/social-media" element={
                <ProtectedRoute>
                  <SocialMediaDashboardPage />
                </ProtectedRoute>
              } />
              {/* Tab-switch reload prevented by usePermissionConfiguration (no loading on refetch) + query refetchOnWindowFocus: false in feature */}
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
              <Route path="/digital-marketing/social-media/product-knowledge" element={
                <ProtectedRoute>
                  <ProductKnowledgePage />
                </ProtectedRoute>
              } />
              {/* Tab-switch reload prevented by usePermissionConfiguration (no loading on refetch) + query refetchOnWindowFocus: false in feature */}
              <Route path="/digital-marketing/social-media/script-generator" element={
                <ProtectedRoute>
                  <ScriptGeneratorPage />
                </ProtectedRoute>
              } />
              <Route path="/digital-marketing/social-media/settings" element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              } />
              
              {/* KOL Management Routes - PROTECTED */}
              <Route path="/kol-management" element={
                <Navigate to="/kol-management/dashboard" replace />
              } />
              <Route path="/kol-management/dashboard" element={
                <ProtectedRoute>
                  <KOLDashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/kol-management/:tab" element={
                <ProtectedRoute>
                  <KOLDashboardPage />
                </ProtectedRoute>
              } />
              
              {/* Operations Routes - PROTECTED */}
              <Route path="/operations/customer-service/dashboard" element={<Navigate to="/operations/consultant/leads-management" replace />} />
              <Route path="/operations/customer-service/tickets" element={<Navigate to="/operations/consultant/leads-management" replace />} />
              <Route path="/operations/customer-service" element={<Navigate to="/operations/consultant/leads-management" replace />} />
              <Route path="/operations/sales" element={
                <ProtectedRoute>
                  <Navigate to="/operations/sales/activities" replace />
                </ProtectedRoute>
              } />
              <Route path="/operations/sales/activities" element={
                <ProtectedRoute>
                  <DailyTaskProvider>
                    <SalesOperationsPage />
                  </DailyTaskProvider>
                </ProtectedRoute>
              } />
              <Route path="/operations/sales/jadwal-kunjungan" element={
                <ProtectedRoute>
                  <SalesOperationsPage />
                </ProtectedRoute>
              } />
              <Route path="/operations/sales/client-visits" element={
                <ProtectedRoute>
                  <SalesOperationsPage />
                </ProtectedRoute>
              } />
              <Route path="/operations/consultant/dashboard" element={
                <ProtectedRoute>
                  <CRMDashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/operations/consultant/leads-management" element={
                <ProtectedRoute>
                  <LeadsManagementRouteElement />
                </ProtectedRoute>
              } />
              <Route path="/operations/consultant/whatsapp/connect" element={
                <ProtectedRoute>
                  <WhatsAppConnectPage />
                </ProtectedRoute>
              } />
              <Route path="/operations/consultant/instagram/connect" element={
                <ProtectedRoute>
                  <InstagramConnectPage />
                </ProtectedRoute>
              } />
              <Route path="/operations/consultant/email/connect" element={
                <ProtectedRoute>
                  <EmailConnectPage />
                </ProtectedRoute>
              } />
              <Route path="/operations/consultant/all/livechat" element={
                <ProtectedRoute>
                  <LivechatRouteElement />
                </ProtectedRoute>
              } />
              <Route path="/operations/consultant/sales-consultant" element={<Navigate to="/operations/consultant/leads-management" replace />} />
              
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

              {/* Company Management Routes - PROTECTED */}
              {/* Each route has its own main file */}
              <Route path="/company/dashboard" element={
                <ProtectedRoute>
                  <CompanyDashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/company/company-assets" element={
                <ProtectedRoute>
                  <CompanyCompanyAssetsPage />
                </ProtectedRoute>
              } />
              <Route path="/company/files" element={
                <ProtectedRoute>
                  <CompanyFilesPage />
                </ProtectedRoute>
              } />
              <Route path="/company/organization" element={
                <ProtectedRoute>
                  <StandardLayout>
                    <CompanyOrganizationPage />
                  </StandardLayout>
                </ProtectedRoute>
              } />
              
              {/* OKR - satu route agar header/sidebar tidak remount saat ganti tab */}
              <Route path="/okr" element={<Navigate to="/okr/company-objective" replace />} />
              <Route path="/okr/*" element={
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
                    icon={<Settings className="h-8 w-8 tet-gray-5" />}
                  />
                </ProtectedRoute>
              } />
              <Route path="/admin/settings" element={
                <ProtectedRoute>
                  <PlaceholderPage 
                    title="Admin Settings" 
                    description="Pengaturan administrasi sistem akan segera tersedia"
                    icon={<Settings className="h-8 w-8 tet-gray-5" />}
                  />
                </ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute>
                  <PlaceholderPage 
                    title="Admin Users" 
                    description="Manajemen pengguna admin akan segera tersedia"
                    icon={<Users className="h-8 w-8 tet-gray-5" />}
                  />
                </ProtectedRoute>
              } />
              
              {/* User Management Routes - PROTECTED */}
              <Route path="/users/permissions" element={
                <ProtectedRoute>
                  <PlaceholderPage 
                    title="User Permissions" 
                    description="Manajemen izin pengguna akan segera tersedia"
                    icon={<UserCheck className="h-8 w-8 tet-gray-5" />}
                  />
                </ProtectedRoute>
              } />
              <Route path="/users/roles" element={
                <ProtectedRoute>
                  <PlaceholderPage 
                    title="User Roles Management" 
                    description="Manajemen peran pengguna akan segera tersedia"
                    icon={<Users className="h-8 w-8 tet-gray-5" />}
                  />
                </ProtectedRoute>
              } />
              
              {/* Recruitment Routes - PROTECTED */}
              <Route path="/recruitment" element={
                <ProtectedRoute>
                  <DashboardOverview />
                </ProtectedRoute>
              } />
              <Route path="/recruitment/job-openings" element={
                <ProtectedRoute>
                  <JobOpeningsPage />
                </ProtectedRoute>
              } />
              <Route path="/recruitment/applications" element={
                <ProtectedRoute>
                  <ApplicationsPageWrapper />
                </ProtectedRoute>
              } />
              <Route path="/recruitment/interviewees" element={
                <ProtectedRoute>
                  <IntervieweesPage />
                </ProtectedRoute>
              } />
              <Route path="/recruitment/candidates/:id" element={
                <ProtectedRoute>
                  <CandidateProfileInterviewees />
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
                  <PlaceholderPage title="Akses Halaman" description="Halaman akses izin untuk path ini sedang dalam pengembangan." />
                </ProtectedRoute>
              } />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
                  </Routes>
                </SubscriptionExpiryGuard>
                </SecurityWrapper>
              </NativeSafeAreaWrapper>
            </BrowserRouter>
          </LanguageProvider>
          </CurrentOrgProvider>
        </CentralizedUserDataProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;