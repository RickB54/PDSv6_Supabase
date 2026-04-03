import Orientation from "./pages/Orientation";
import ContactSupport from "./pages/ContactSupport";
import ActiveJobs from "./pages/ActiveJobs";
import JobHistory from "./pages/JobHistory";
import PaymentsAndCart from "./pages/PaymentsAndCart";
import MyInvoices from "./pages/MyInvoices";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { GlobalRightSidebar } from "@/components/GlobalRightSidebar";
import { GlobalModals } from "@/components/GlobalModals";
import { getCurrentUser, initSupabaseAuth, setAuthMode, isSupabaseEnabled, finalizeSupabaseSession } from "@/lib/auth";
import supabase from "@/lib/supabase";
import "@/lib/storage-utils";
import { DemoProvider, useDemoMode, DemoBanner } from "@/contexts/DemoContext";
import { WalkthroughProvider } from "@/contexts/WalkthroughContext";
import { WalkthroughOverlay } from "./components/WalkthroughOverlay";

import Index from "./pages/Index";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import UpdatePassword from "./pages/UpdatePassword";
import CustomerPortal from "./pages/CustomerPortal";
import CustomerDashboard from "./pages/CustomerDashboard";
import ServiceChecklist from "./pages/ServiceChecklist";
import SearchCustomer from "./pages/SearchCustomer";
import InventoryControl from "./pages/InventoryControl";
import Invoicing from "./pages/Invoicing";
import Estimates from "./pages/Estimates";
import Accounting from "./pages/Accounting";
import CompanyBudget from "./pages/CompanyBudget";
import Reports from "./pages/Reports";
import TrainingManual from "./pages/TrainingManual";
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
import PersonalNotes from "./pages/PersonalNotes";
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
import PrimeBlog from "./pages/PrimeBlog";
import BlogReorder from "./pages/BlogReorder";
import ChemicalsLibrary from "./pages/ChemicalsLibrary";
import ChemicalTraining from "./pages/ChemicalTraining";
import AdminChemicals from "@/pages/AdminChemicals";
import DilutionCalculator from "./pages/DilutionCalculator";
import DilutionCalculatorHelp from "./pages/DilutionCalculatorHelp";
import VehicleGallery from "./pages/VehicleGallery";
import ErrorBoundary from "./components/ErrorBoundary";
import { initTaskWorkflowListeners } from "./store/tasks";
import { GlobalChatWidget } from "@/components/chat/GlobalChatWidget";
import { ChatAudioAlert } from "@/components/chat/ChatAudioAlert";
import { useLocation as useRouterLocation } from "react-router-dom";
import { CallAssistantModal } from "@/components/calling/CallAssistantModal";
import ScrollToTop from "./components/ScrollToTop";
import AvailabilityManager from "./pages/AvailabilityManager";
import Availability from "./pages/Availability";
import MileageTracking from "./pages/MileageTracking";
import Taxes from "./pages/Taxes";
import HelpModal from "@/components/help/HelpModal";
import FollowUpCenter from "./pages/FollowUpCenter";


const queryClient = new QueryClient();

function ConditionalGlobalChat() {
  const location = useRouterLocation();
  const isTeamChatPage = location.pathname === '/team-chat';
  if (isTeamChatPage) return null;
  return <GlobalChatWidget />;
}

const isAppRoute = (path: string) => {

  const websitePrefixes = [
    '/', '/about', '/contact', '/faq', '/services', '/book', '/availability', 
    '/blog', '/checkout', '/thank-you', '/login', '/signup', 
    '/forgot-password', '/update-password', '/portal', '/f150-setup', '/contact-support'
  ];
  if (websitePrefixes.includes(path)) return false;
  if (path.startsWith('/blog/')) return false;
  
  // The /demo path and its children are definitely App routes (for simulation)
  if (path.startsWith('/demo')) return true;

  return true;
};

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) => {
  const user = getCurrentUser();
  const { isDemoMode } = useDemoMode();

  // In demo mode, bypass standard auth checks for public routes
  if (isDemoMode) return <>{children}</>;

  if (!user && allowedRoles.length > 0) return <Navigate to="/login" replace />;
  if (user && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    if (user.role === 'admin') return <Navigate to="/dashboard/admin" replace />;
    if (user.role === 'employee') return <Navigate to="/dashboard/employee" replace />;
    return <Navigate to="/customer-dashboard" replace />;
  }
  return <>{children}</>;
};


const DefaultRedirect = ({ user }: { user: any }) => {
  if (!user) return <Navigate to="/" replace />;
  if (user.role === 'admin') return <Navigate to="/dashboard/admin" replace />;
  if (user.role === 'employee') return <Navigate to="/dashboard/employee" replace />;
  return <Navigate to="/customer-dashboard" replace />;
};

const App = () => {
  const [user, setUser] = useState(getCurrentUser());
  const [callAssistantOpen, setCallAssistantOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpId, setHelpId] = useState<string | undefined>(undefined);
  const [helpRole, setHelpRole] = useState<'admin' | 'employee' | 'customer' | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    try {
      if (import.meta.env.VITE_AUTH_MODE === 'supabase') setAuthMode('supabase');
    } catch { }

    const initAuth = async () => {
      try {
        initSupabaseAuth();
        if (isSupabaseEnabled()) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user && mounted) {
            const { finalizeSupabaseSession } = await import('@/lib/auth');
            await finalizeSupabaseSession(data.session.user);
            setUser(getCurrentUser());
          }
        }
      } catch (e) {
        console.warn('Auth init failed', e);
      } finally {
        if (mounted) setAuthReady(true);
      }
    };

    initAuth();

    // SAFETY FALLBACK: Ensure the app loads even if Supabase/Finalize hangs
    const safetyTimer = setTimeout(() => {
      if (mounted) setAuthReady(true);
    }, 5000);

    const updateUser = () => mounted && setUser(getCurrentUser());
    window.addEventListener('auth-changed', updateUser);
    window.addEventListener('storage', updateUser);
    try { initTaskWorkflowListeners(); } catch { }

    // START BOOKINGS REALTIME SUBSCRIPTION
    let unsubscribeBookings: (() => void) | undefined;
    import("@/store/bookings").then(m => {
      const store = m.useBookingsStore.getState();
      store.refresh();
      unsubscribeBookings = store.subscribeRealtime();
    });

    const onOpenCallAssistant = () => setCallAssistantOpen(true);
    const onOpenHelp = (e: any) => {
      const currentUser = getCurrentUser();
      let topicId: string | undefined = undefined;
      let role: any = currentUser?.role || 'customer';

      if (typeof e.detail === 'string') {
        topicId = e.detail;
      } else if (e.detail && typeof e.detail === 'object') {
        topicId = e.detail.topicId;
        if (e.detail.role) role = e.detail.role;
      }
      
      setHelpRole(role);
      setHelpId(topicId);
      setHelpOpen(true);
    };

    window.addEventListener('open-call-assistant', onOpenCallAssistant);
    window.addEventListener('open-help', onOpenHelp);

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      window.removeEventListener('auth-changed', updateUser);
      window.removeEventListener('storage', updateUser);
      window.removeEventListener('open-call-assistant', onOpenCallAssistant);
      window.removeEventListener('open-help', onOpenHelp);
      if (unsubscribeBookings) unsubscribeBookings();
    };
  }, []);

  if (!authReady) return <div className="flex items-center justify-center min-h-screen bg-black text-white">Initializing...</div>;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider defaultOpen={true}>
          <BrowserRouter>
            <DemoProvider>
              <DemoBanner />
              <WalkthroughProvider>
                <Toaster />
                <Sonner />
                <GlobalModals />
                <ScrollToTop />
                <ConditionalGlobalChat />
                <ChatAudioAlert />
                <WalkthroughOverlay />
                <LayoutWrapper user={user} setCallAssistantOpen={setCallAssistantOpen} />
                <CallAssistantModal open={callAssistantOpen} onOpenChange={setCallAssistantOpen} />
                {(user || isAppRoute(window.location.pathname)) && <HelpModal open={helpOpen} onOpenChange={setHelpOpen} role={helpRole || (user?.role as any) || 'admin'} initialTopicId={helpId} />}
              </WalkthroughProvider>
            </DemoProvider>
          </BrowserRouter>
        </SidebarProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

const LayoutWrapper = ({ user, setCallAssistantOpen }: { user: any; setCallAssistantOpen: (v: boolean) => void }) => {
  const location = useRouterLocation();
  const { isDemoMode } = useDemoMode();
  const isApp = isAppRoute(location.pathname);
  
  // In demo mode, use admin dark theme even if not logged in
  const showDarkTheme = isApp && (isDemoMode || (user && (user.role === 'admin' || user.role === 'employee')));

  // Use a mock admin user for layout purposes when in demo mode
  const effectiveUser = isDemoMode ? (user || { id: 'demo-visitor', email: 'visitor@prime-demo', role: 'admin', name: 'Demo Visitor' }) : user;

  if (!effectiveUser) {
    return (
      <div className="min-h-screen w-full bg-white">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/book" element={<BookNow />} />
          <Route path="/availability" element={<Availability />} />
          <Route path="/services" element={<CustomerPortal />} />
          <Route path="/blog" element={<PrimeBlog />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen w-full ${showDarkTheme ? 'bg-black text-white' : 'bg-white text-black'}`}>
      <div className="dark-theme">
        <AppSidebar key={effectiveUser.id} user={effectiveUser} />
      </div>
      <div className={`flex-1 overflow-x-hidden ${isDemoMode ? 'pt-10' : 'pt-0'} ${showDarkTheme ? 'dark-theme bg-black' : 'bg-white'}`}>
        <Routes>
          {/* Dashboard Routes */}
          {/* Dashboard Routes */}
          <Route path="/dashboard/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/demo/dashboard" element={<ProtectedRoute allowedRoles={[]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/employee" element={<ProtectedRoute allowedRoles={['employee', 'admin']}><EmployeeDashboard /></ProtectedRoute>} />
          <Route path="/customer-dashboard" element={<ProtectedRoute allowedRoles={['customer', 'admin', 'employee']}><CustomerDashboard /></ProtectedRoute>} />

          {/* Operations & Bookings */}
          <Route path="/bookings" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><BookingsPage /></ProtectedRoute>} />
          <Route path="/bookings-analytics" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><BookingsAnalyticsPage /></ProtectedRoute>} />
          <Route path="/search-customer" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><SearchCustomer /></ProtectedRoute>} />
          <Route path="/demo/search-customer" element={<ProtectedRoute allowedRoles={[]}><SearchCustomer /></ProtectedRoute>} />
          <Route path="/prospects" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><Prospects /></ProtectedRoute>} />
          <Route path="/demo/prospects" element={<ProtectedRoute allowedRoles={[]}><Prospects /></ProtectedRoute>} />
          <Route path="/service-checklist" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><ServiceChecklist /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><Tasks /></ProtectedRoute>} />
          <Route path="/team-chat" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><TeamChat /></ProtectedRoute>} />
          <Route path="/jobs-completed" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><JobsCompleted /></ProtectedRoute>} />

          {/* Finance & Sales */}
          <Route path="/invoicing" element={<ProtectedRoute allowedRoles={['admin']}><Invoicing /></ProtectedRoute>} />
          <Route path="/demo/invoicing" element={<ProtectedRoute allowedRoles={[]}><Invoicing /></ProtectedRoute>} />
          <Route path="/estimates" element={<ProtectedRoute allowedRoles={['admin']}><Estimates /></ProtectedRoute>} />
          <Route path="/accounting" element={<ProtectedRoute allowedRoles={['admin']}><Accounting /></ProtectedRoute>} />
          <Route path="/payroll" element={<ProtectedRoute allowedRoles={['admin']}><Payroll /></ProtectedRoute>} />
          <Route path="/company-budget" element={<ProtectedRoute allowedRoles={['admin']}><CompanyBudget /></ProtectedRoute>} />
          <Route path="/discount-coupons" element={<ProtectedRoute allowedRoles={['admin']}><DiscountCoupons /></ProtectedRoute>} />
          <Route path="/package-pricing" element={<ProtectedRoute allowedRoles={['admin']}><PackagePricing /></ProtectedRoute>} />
          <Route path="/mileage" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><MileageTracking /></ProtectedRoute>} />
          <Route path="/taxes" element={<ProtectedRoute allowedRoles={['admin']}><Taxes /></ProtectedRoute>} />

          {/* Inventory & Assets */}
          <Route path="/inventory-control" element={<ProtectedRoute allowedRoles={['admin']}><InventoryControl /></ProtectedRoute>} />
          <Route path="/demo/inventory-control" element={<ProtectedRoute allowedRoles={[]}><InventoryControl /></ProtectedRoute>} />
          <Route path="/file-manager" element={<ProtectedRoute allowedRoles={['admin']}><FileManager /></ProtectedRoute>} />
          <Route path="/mobile-setup" element={<ProtectedRoute allowedRoles={['admin']}><MobileSetup /></ProtectedRoute>} />
          <Route path="/detailing-vendors" element={<ProtectedRoute allowedRoles={['admin']}><DetailingVendors /></ProtectedRoute>} />

          {/* Training & Staff */}
          <Route path="/training-manual" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><TrainingManual /></ProtectedRoute>} />
          <Route path="/chemical-training" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><ChemicalTraining /></ProtectedRoute>} />
          <Route path="/learning-library" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><LearningLibrary /></ProtectedRoute>} />
          <Route path="/chemicals" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><ChemicalsLibrary /></ProtectedRoute>} />
          <Route path="/dilution-calculator" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><DilutionCalculator /></ProtectedRoute>} />
          <Route path="/dilution-calculator/help" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><DilutionCalculatorHelp /></ProtectedRoute>} />
          <Route path="/admin/chemicals" element={<ProtectedRoute allowedRoles={['admin']}><AdminChemicals /></ProtectedRoute>} />
          <Route path="/orientation" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><Orientation /></ProtectedRoute>} />
          <Route path="/staff-schedule" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><StaffSchedule /></ProtectedRoute>} />
          <Route path="/user-management" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
          <Route path="/admin-users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>} />
          <Route path="/company-employees" element={<ProtectedRoute allowedRoles={['admin']}><CompanyEmployees /></ProtectedRoute>} />
          <Route path="/exam/:examId" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><ExamPage /></ProtectedRoute>} />
          <Route path="/exam-admin" element={<ProtectedRoute allowedRoles={['admin']}><ExamAdmin /></ProtectedRoute>} />
          <Route path="/certificate/:id" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><Certificate /></ProtectedRoute>} />
          <Route path="/cheat-sheet" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><CheatSheet /></ProtectedRoute>} />

          {/* Intake & Assistance */}
          <Route path="/package-selection" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><PackageSelection /></ProtectedRoute>} />
          <Route path="/vehicle-classification" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><VehicleClassification /></ProtectedRoute>} />
          <Route path="/client-evaluation" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><ClientEvaluation /></ProtectedRoute>} />
          <Route path="/addon-upsell-script" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><AddonUpsellScript /></ProtectedRoute>} />
          <Route path="/package-guide" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><PackageExplanationGuide /></ProtectedRoute>} />
          <Route path="/availability-manager" element={<ProtectedRoute allowedRoles={['admin']}><AvailabilityManager /></ProtectedRoute>} />
          <Route path="/website-admin" element={<ProtectedRoute allowedRoles={['admin']}><WebsiteAdministration /></ProtectedRoute>} />

          {/* Common Shared Pages */}
          <Route path="/section/:sectionId" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><SectionLanding /></ProtectedRoute>} />
          <Route path="/notes" element={<ProtectedRoute allowedRoles={['admin', 'employee', 'customer']}><PersonalNotes /></ProtectedRoute>} />
          <Route path="/vehicle-gallery" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><VehicleGallery /></ProtectedRoute>} />
          <Route path="/demo/vehicle-gallery" element={<ProtectedRoute allowedRoles={[]}><VehicleGallery /></ProtectedRoute>} />
          <Route path="/app-manual" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><AppManual /></ProtectedRoute>} />
          <Route path="/user-settings" element={<ProtectedRoute allowedRoles={['admin', 'employee', 'customer']}><UserSettings /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><Settings /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin']}><Reports /></ProtectedRoute>} />
          <Route path="/demo/reports" element={<ProtectedRoute allowedRoles={[]}><Reports /></ProtectedRoute>} />
          <Route path="/blog" element={<PrimeBlog />} />
          <Route path="/follow-up-center" element={<ProtectedRoute allowedRoles={['admin']}><FollowUpCenter /></ProtectedRoute>} />
          <Route path="/blog-reorder" element={<ProtectedRoute allowedRoles={['admin']}><BlogReorder /></ProtectedRoute>} />
          <Route path="/f150-setup" element={<PrimeBlog />} />

          {/* Special Demo Root Redirects */}
          <Route path="/demo" element={<Navigate to="/demo/dashboard" replace />} />


          {/* Customer-Facing (when logged in) */}
          <Route path="/active-jobs" element={<ProtectedRoute allowedRoles={['customer', 'admin', 'employee']}><ActiveJobs /></ProtectedRoute>} />
          <Route path="/job-history" element={<ProtectedRoute allowedRoles={['customer', 'admin', 'employee']}><JobHistory /></ProtectedRoute>} />
          <Route path="/my-invoices" element={<ProtectedRoute allowedRoles={['customer', 'admin', 'employee']}><MyInvoices /></ProtectedRoute>} />
          <Route path="/payments-cart" element={<ProtectedRoute allowedRoles={['customer', 'admin', 'employee']}><PaymentsAndCart /></ProtectedRoute>} />
          <Route path="/customer-account" element={<ProtectedRoute allowedRoles={['customer']}><CustomerAccount /></ProtectedRoute>} />
          <Route path="/customer-profile" element={<ProtectedRoute allowedRoles={['customer']}><CustomerProfile /></ProtectedRoute>} />
          <Route path="/portal" element={<ProtectedRoute allowedRoles={['customer']}><Portal /></ProtectedRoute>} />
          <Route path="/contact-support" element={<ContactSupport />} />

          {/* Fallbacks */}
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/book" element={<BookNow />} />
          <Route path="/availability" element={<Availability />} />
          <Route path="/services" element={<CustomerPortal />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="*" element={<DefaultRedirect user={user} />} />
        </Routes>
      </div>
      {user.role !== 'customer' && (
        <div className="dark-theme">
          <GlobalRightSidebar />
        </div>
      )}
    </div>
  );
};

export default App;
