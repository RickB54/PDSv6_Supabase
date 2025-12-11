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
import EmployeeTrainingCourse from "./pages/EmployeeTrainingCourse";
import Certificate from "./pages/Certificate";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import CompanyEmployees from "./pages/CompanyEmployees";
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
import UserManagement from "./pages/UserManagement";
import AdminUsers from "./pages/AdminUsers";
import WebsiteAdministration from "./pages/WebsiteAdministration";
import BookingsPage from "./pages/BookingsPage";
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
import PackageExplanationGuide from "./pages/PackageExplanationGuide";
import ManageSubContractors from "./pages/ManageSubContractors";
import DetailingVendors from "./pages/DetailingVendors";
import PackageSelection from "./pages/PackageSelection";
import Prospects from "./pages/Prospects";
import AppManual from "./pages/AppManual";
import ErrorBoundary from "./components/ErrorBoundary";
import { initTaskWorkflowListeners } from "./store/tasks";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) => {
  const user = getCurrentUser();
  // In Supabase mode, require an active session regardless of cached user
  if (isSupabaseEnabled()) {
    try {
      const sid = localStorage.getItem('session_user_id');
      // if (!sid) return <Navigate to="/login" replace />; // Login removed
    } catch { } // return <Navigate to="/login" replace />;
  }

  if (!user && allowedRoles.length > 0) {
    // return <Navigate to="/login" replace />;
    // In local mode, we allow access or show a placeholder if needed, but for now just render children or null
    // The user said: "For local mode: allow; for production you can implement role checks later"
    // But if we allow, we might crash if user is null.
    // However, the user instruction is explicit.
    // Let's check if we are in local mode.
    const mode = (import.meta.env.VITE_AUTH_MODE || 'local').toLowerCase();
    if (mode === 'local') {
      // Allow access, components might handle null user gracefully or we rely on 5-tap to become admin
    } else {
      // return <Navigate to="/login" replace />;
    }
  }

  if (user && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // return <Navigate to="/login" replace />;
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
          <SidebarProvider open={!!(user && (user.role === 'admin' || user.role === 'employee'))} defaultOpen={true}>
            <div className={`flex min-h-screen w-full ${user?.role === 'admin' || user?.role === 'employee' ? 'dark-theme bg-black' : ''}`}>
              {user && <AppSidebar />}
              <div className="flex-1">
                <ErrorBoundary>
                  <Routes>
                    {/* Login route removed */}
                    {/* QuickLogin removed: Supabase-only authentication */}
                    {/* Public homepage routes */}
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/faq" element={<FAQ />} />
                    <Route path="/thank-you" element={<ThankYou />} />
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
                              <Index /> // Fallback to Index instead of Login
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
                    <Route path="/employee-training" element={
                      <ProtectedRoute allowedRoles={['employee', 'admin']}>
                        <EmployeeTrainingCourse />
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
                    <Route path="/training-progress" element={
                      <ProtectedRoute allowedRoles={['employee', 'admin']}>
                        <EmployeeTrainingCourse />
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
                    <Route path="/manage-sub-contractors" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <ManageSubContractors />
                      </ProtectedRoute>
                    } />
                    <Route path="/detailing-vendors" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <DetailingVendors />
                      </ProtectedRoute>
                    } />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </ErrorBoundary>
              </div>
            </div>
          </SidebarProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
