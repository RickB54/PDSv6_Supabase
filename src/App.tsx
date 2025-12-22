import Orientation from "./pages/Orientation";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { getCurrentUser, initSupabaseAuth, setAuthMode, isSupabaseEnabled } from "@/lib/auth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import UpdatePassword from "./pages/UpdatePassword";
// Login page removed
import CustomerPortal from "./pages/CustomerPortal";
import CustomerDashboard from "./pages/CustomerDashboard";
import ServiceChecklist from "./pages/ServiceChecklist";
// Legacy EmployeeChecklist removed; redirect old route to ServiceChecklist
import SearchCustomer from "./pages/SearchCustomer";
import InventoryControl from "./pages/InventoryControl";
import Invoicing from "./pages/Invoicing";
import Estimates from "./pages/Estimates";
import Accounting from "./pages/Accounting";
import CompanyBudget from "./pages/CompanyBudget";
import Reports from "./pages/Reports";
import TrainingManual from "./pages/TrainingManual";
// import EmployeeTrainingCourse from "./pages/EmployeeTrainingCourse"; // Removed
import Certificate from "./pages/Certificate";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import CompanyEmployees from "./pages/CompanyEmployees";
import UserManagement from "./pages/UserManagement";
import StaffSchedule from "./pages/StaffSchedule";
import FileManager from "./pages/FileManager";
import MobileSetup from "./pages/MobileSetup";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import BookNow from "./pages/BookNow";
import ThankYou from "./pages/ThankYou";
import Checkout from "./pages/Checkout";
import CustomerAccount from "./pages/CustomerAccount";
import CustomerProfile from "./pages/CustomerProfile";
import Portal from "./pages/Portal";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import WebsiteAdministration from "./pages/WebsiteAdministration";
import BookingsPage from "./pages/BookingsPage";
import BookingsAnalyticsPage from "./pages/BookingsAnalyticsPage";
import DiscountCoupons from "./pages/DiscountCoupons";
import PackagePricing from "./pages/PackagePricing";
import Payroll from "./pages/Payroll";
import JobsCompleted from "./pages/JobsCompleted";
import ExamPage from "./pages/ExamPage";
import ExamAdmin from "./pages/ExamAdmin";
import CheatSheet from "./pages/CheatSheet";
import Tasks from "./pages/Tasks";
import VehicleClassification from "./pages/VehicleClassification";
import ClientEvaluation from "./pages/ClientEvaluation";
import AddonUpsellScript from "./pages/AddonUpsellScript";
import TeamChat from "./pages/TeamChat";
import PackageExplanationGuide from "./pages/PackageExplanationGuide";
import DetailingVendors from "./pages/DetailingVendors";
import PackageSelection from "./pages/PackageSelection";
import Prospects from "./pages/Prospects";
import AppManual from "./pages/AppManual";
import UserSettings from "./pages/UserSettings";
import SectionLanding from "./pages/SectionLanding";
import LearningLibrary from "./pages/LearningLibrary";
import ErrorBoundary from "./components/ErrorBoundary";
import { initTaskWorkflowListeners } from "./store/tasks";
import { GlobalChatWidget } from "@/components/chat/GlobalChatWidget";
import { ChatAudioAlert } from "@/components/chat/ChatAudioAlert";
import { useLocation as useRouterLocation } from "react-router-dom";

const queryClient = new QueryClient();

// Helper component to conditionally show GlobalChatWidget based on route
function ConditionalGlobalChat() {
  const location = useRouterLocation();
  const isTeamChatPage = location.pathname === '/team-chat';
  if (isTeamChatPage) return null;
  return <GlobalChatWidget />;
}


const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) => {
  const user = getCurrentUser();
  const [isChecking, setIsChecking] = useState(true);

  // In Supabase mode, we trust getCurrentUser() if it's populated by the auth listener.
  // However, on fresh load, there might be a split second where we are fetching session.
  // Ideally we should wait for onAuthStateChange to fire at least once or check localStorage 'session_user_id'.

  useEffect(() => {
    // A simple timeout or check to allow auth to settle if needed.
    // For now, if we have no user but a session_id in local storage, we might be loading.
    const sid = localStorage.getItem('session_user_id');
    if (!user && sid) {
      // potentially loading, stay checking?
      // But for simplicity in this migration, we'll let it pass through if it resolves quickly
      // or redirect if it takes too long.
      // Actually, initSupabaseAuth handles state sync.
    }
    setIsChecking(false);
  }, [user]);

  if (!user && allowedRoles.length > 0) {
    return <Navigate to="/login" replace />;
  }

  // SECURITY FIX: Actually check the role!
  if (user && allowedRoles.length > 0 && user.role) {
    if (!allowedRoles.includes(user.role)) {
      // User is logged in but doesn't have permission -> Send to Home or Dashboard
      return <Navigate to="/" replace />;
    }
  }

  if (user && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // If admin tries to access employee, or vice versa
    // Allow Admin to access Employee routes? usually yes, but code says !includes.
    // Let's strictly follow the RBAC request: Admin sees all (maybe?), Employee sees Employee.
    // For now, if role mismatch, redirect to their dashboard.
    if (user.role === 'admin') return <Navigate to="/dashboard/admin" replace />;
    if (user.role === 'employee') return <Navigate to="/dashboard/employee" replace />;
    return <Navigate to="/customer-portal" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  const [user, setUser] = useState(getCurrentUser());

  useEffect(() => {
    // Force Supabase mode if environment requests it
    try {
      const envMode = import.meta.env.VITE_AUTH_MODE;
      if (envMode === 'supabase') setAuthMode('supabase');
    } catch { }
    // Initialize Supabase auth listener so roles map correctly in Supabase mode
    try { initSupabaseAuth(); } catch { }
    const updateUser = () => setUser(getCurrentUser());
    window.addEventListener('auth-changed', updateUser as EventListener);
    window.addEventListener('storage', updateUser);
    try { initTaskWorkflowListeners(); } catch { }
    return () => {
      window.removeEventListener('auth-changed', updateUser as EventListener);
      window.removeEventListener('storage', updateUser);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ConditionalGlobalChat />
          <SidebarProvider defaultOpen={true}>
            <div className={`flex min-h-screen w-full ${user?.role === 'admin' || user?.role === 'employee' ? 'dark-theme bg-black' : ''}`}>
              <ChatAudioAlert />
              {user && <AppSidebar />}
              <div className="flex-1 overflow-x-hidden">
                <ErrorBoundary>
                  <Routes>
                    <Route path="/team-chat" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><TeamChat /></ProtectedRoute>} />
                    <Route path="/user-management" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
                    <Route path="/company-employees" element={<ProtectedRoute allowedRoles={['admin']}><CompanyEmployees /></ProtectedRoute>} />
                    <Route path="/staff-schedule" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><StaffSchedule /></ProtectedRoute>} />
                    <Route path="/section/:sectionId" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><SectionLanding /></ProtectedRoute>} />
                    <Route path="/learning-library" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><LearningLibrary /></ProtectedRoute>} />
                    {/* Login route removed */}
                    {/* QuickLogin removed: Supabase-only authentication */}
                    {/* Public homepage routes */}

                    // ... inside App component Routes
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<SignUp />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/update-password" element={<UpdatePassword />} />

                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/faq" element={<FAQ />} />
                    <Route path="/thank-you" element={<ThankYou />} />
                    <Route path="/payment-success" element={<ThankYou />} />
                    <Route path="/payment-canceled" element={<Checkout />} />
                    <Route path="/book" element={<BookNow />} />
                    <Route path="/book-now" element={<BookNow />} />
                    {/* Public services page */}
                    <Route path="/services" element={<CustomerPortal />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/portal" element={<Portal />} />
                    <Route path="/" element={<Index />} />
                    <Route
                      path="/dashboard"
                      element={
                        user?.role === 'admin' ? <Navigate to="/dashboard/admin" replace /> :
                          user?.role === 'employee' ? <Navigate to="/dashboard/employee" replace /> :
                            user?.role === 'customer' ? <Navigate to="/customer-portal" replace /> :
                              <Navigate to="/login" replace /> // Fallback to Login
                      }
                    />
                    <Route path="/customer-portal" element={
                      <ProtectedRoute allowedRoles={['customer']}>
                        <CustomerPortal />
                      </ProtectedRoute>
                    } />
                    <Route path="/customer-dashboard" element={
                      <ProtectedRoute allowedRoles={['customer']}>
                        <CustomerDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/customer-profile" element={
                      <ProtectedRoute allowedRoles={['customer']}>
                        <CustomerProfile />
                      </ProtectedRoute>
                    } />
                    <Route path="/customer-account" element={
                      <ProtectedRoute allowedRoles={['customer']}>
                        <CustomerAccount />
                      </ProtectedRoute>
                    } />
                    <Route path="/checklist" element={
                      <ProtectedRoute allowedRoles={['employee', 'admin']}>
                        <ServiceChecklist />
                      </ProtectedRoute>
                    } />
                    <Route path="/service-checklist" element={
                      <ProtectedRoute allowedRoles={['employee', 'admin']}>
                        <ServiceChecklist />
                      </ProtectedRoute>
                    } />
                    <Route path="/tasks" element={
                      <ProtectedRoute allowedRoles={['employee', 'admin']}>
                        <Tasks />
                      </ProtectedRoute>
                    } />
                    <Route path="/search-customer" element={
                      <ProtectedRoute allowedRoles={['employee', 'admin']}>
                        <SearchCustomer />
                      </ProtectedRoute>
                    } />
                    <Route path="/prospects" element={
                      <ProtectedRoute allowedRoles={['employee', 'admin']}>
                        <Prospects />
                      </ProtectedRoute>
                    } />
                    <Route path="/inventory-control" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <InventoryControl />
                      </ProtectedRoute>
                    } />
                    <Route path="/invoicing" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <Invoicing />
                      </ProtectedRoute>
                    } />
                    <Route path="/estimates" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <Estimates />
                      </ProtectedRoute>
                    } />
                    <Route path="/accounting" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <Accounting />
                      </ProtectedRoute>
                    } />
                    <Route path="/company-budget" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <CompanyBudget />
                      </ProtectedRoute>
                    } />
                    <Route path="/payroll" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <Payroll />
                      </ProtectedRoute>
                    } />
                    <Route path="/company-employees" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <CompanyEmployees />
                      </ProtectedRoute>
                    } />
                    <Route path="/file-manager" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <FileManager />
                      </ProtectedRoute>
                    } />
                    <Route path="/jobs-completed" element={
                      <ProtectedRoute allowedRoles={['admin', 'employee']}>
                        <JobsCompleted />
                      </ProtectedRoute>
                    } />
                    <Route path="/reports" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <Reports />
                      </ProtectedRoute>
                    } />
                    <Route path="/dashboard/admin" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <Navigate to="/admin-dashboard" replace />
                      </ProtectedRoute>
                    } />
                    <Route path="/admin-dashboard" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/user-management" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <UserManagement />
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/users" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminUsers />
                      </ProtectedRoute>
                    } />
                    <Route path="/website-admin" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <WebsiteAdministration />
                      </ProtectedRoute>
                    } />
                    <Route path="/bookings" element={
                      <ProtectedRoute allowedRoles={['admin', 'employee']}>
                        <BookingsPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/bookings-analytics" element={
                      <ProtectedRoute allowedRoles={['admin', 'employee']}>
                        <BookingsAnalyticsPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/discount-coupons" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <DiscountCoupons />
                      </ProtectedRoute>
                    } />
                    <Route path="/package-pricing" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <PackagePricing />
                      </ProtectedRoute>
                    } />
                    <Route path="/package-selection" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <PackageSelection />
                      </ProtectedRoute>
                    } />
                    <Route path="/training-manual" element={
                      <ProtectedRoute allowedRoles={['employee', 'admin']}>
                        <TrainingManual />
                      </ProtectedRoute>
                    } />
                    <Route path="/app-manual" element={
                      <ProtectedRoute allowedRoles={['employee', 'admin']}>
                        <AppManual />
                      </ProtectedRoute>
                    } />
                    <Route path="/certificate" element={
                      <ProtectedRoute allowedRoles={['employee', 'admin']}>
                        <Certificate />
                      </ProtectedRoute>
                    } />
                    <Route path="/exam" element={
                      <ProtectedRoute allowedRoles={['employee', 'admin']}>
                        <ExamPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/exam-admin" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <ExamAdmin />
                      </ProtectedRoute>
                    } />
                    <Route path="/cheat-sheet" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <CheatSheet />
                      </ProtectedRoute>
                    } />
                    <Route path="/dashboard/employee" element={
                      <ProtectedRoute allowedRoles={['employee', 'admin']}>
                        <EmployeeDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/employee-dashboard" element={
                      <ProtectedRoute allowedRoles={['employee', 'admin']}>
                        <EmployeeDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/mobile-setup" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <MobileSetup />
                      </ProtectedRoute>
                    } />
                    <Route path="/orientation" element={
                      <ProtectedRoute allowedRoles={['employee', 'admin']}>
                        <Orientation />
                      </ProtectedRoute>
                    } />
                    <Route path="/vehicle-classification" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <VehicleClassification />
                      </ProtectedRoute>
                    } />
                    <Route path="/client-evaluation" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <ClientEvaluation />
                      </ProtectedRoute>
                    } />
                    <Route path="/addon-upsell-script" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AddonUpsellScript />
                      </ProtectedRoute>
                    } />
                    <Route path="/package-explanation-guide" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <PackageExplanationGuide />
                      </ProtectedRoute>
                    } />
                    <Route path="/detailing-vendors" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <DetailingVendors />
                      </ProtectedRoute>
                    } />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<NotFound />} />
                    <Route path="/user-settings" element={
                      <ProtectedRoute allowedRoles={['admin', 'employee', 'customer']}>
                        <UserSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="/section/:sectionId" element={
                      <ProtectedRoute allowedRoles={['admin', 'employee']}>
                        <SectionLanding />
                      </ProtectedRoute>
                    } />
                  </Routes>
                </ErrorBoundary>
              </div>
            </div>
          </SidebarProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider >
  );
};

export default App;
