import React, { useEffect, useState } from "react";
import Orientation from "./pages/Orientation";
import ContactSupport from "./pages/ContactSupport";
import ActiveJobs from "./pages/ActiveJobs";
import JobHistory from "./pages/JobHistory";
import PaymentsAndCart from "./pages/PaymentsAndCart";
import MyInvoices from "./pages/MyInvoices";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner, toast as sonnerToast } from "@/components/ui/sonner";
import { useToast } from "@/hooks/use-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import { contentService } from "@/lib/content";

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
import ShopSetup from "./pages/ShopSetup";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import BookNow from "./pages/BookNow";
import ThankYou from "./pages/ThankYou";
import Checkout from "./pages/Checkout";
import PaymentSuccess from "./pages/PaymentSuccess";
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
import EliteMaster from "./pages/EliteMaster";
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
import QuickPayModal from "@/components/QuickPayModal";
import ScrollToTop from "./components/ScrollToTop";
import AvailabilityManager from "./pages/AvailabilityManager";
import Availability from "./pages/Availability";
import MileageTracking from "./pages/MileageTracking";
import Taxes from "./pages/Taxes";
import HelpModal from "@/components/help/HelpModal";
import FollowUpCenter from "./pages/FollowUpCenter";
import StickerMaker from "./pages/StickerMaker";
import { PerspectiveBanner } from "./components/PerspectiveBanner";

const queryClient = new QueryClient();

function ConditionalGlobalChat() {
  const location = useRouterLocation();
  const [hidden, setHidden] = React.useState(() => localStorage.getItem('hide_chat_bot') === 'true');

  React.useEffect(() => {
    const handleUpdate = () => {
      setHidden(localStorage.getItem('hide_chat_bot') === 'true');
    };
    window.addEventListener('hide-chat-bot-updated', handleUpdate);
    return () => window.removeEventListener('hide-chat-bot-updated', handleUpdate);
  }, []);

  if (hidden) return null;

  const isTeamChatPage = location.pathname === '/team-chat';
  if (isTeamChatPage) return null;
  return <GlobalChatWidget />;
}

const isAppRoute = (path: string) => {
  // Normalize path for robust matching (handle double slashes and case)
  const normalizedPath = path.toLowerCase().replace(/\/+/g, '/');
  
  const websitePrefixes = [
    '/', '/about', '/contact', '/faq', '/services', '/book', '/availability', 
    '/blog', '/checkout', '/payment-success', '/thank-you', '/login', '/signup', 
    '/forgot-password', '/update-password', '/portal', '/f150-setup', '/contact-support'
  ];
  
  if (websitePrefixes.includes(normalizedPath)) return false;
  if (normalizedPath.startsWith('/blog/')) return false;
  if (normalizedPath.startsWith('/demo')) return true;
  return true;
};

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) => {
  const user = getCurrentUser();
  const { isDemoMode } = useDemoMode();

  // Redirect to login if NO user and no simulation
  if (!user && allowedRoles.length > 0) return <Navigate to="/login" replace />;

  // Enforce roles strictly
  if (user && allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    if (user?.role === 'admin') return <Navigate to="/dashboard/admin" replace />;
    if (user?.role === 'employee') return <Navigate to="/dashboard/employee" replace />;
    return <Navigate to="/customer-dashboard" replace />;
  }
  return <>{children}</>;
};

const DefaultRedirect = ({ user }: { user: any }) => {
  const simUser = getCurrentUser();
  const effectiveUser = simUser || user;
  
  if (!effectiveUser) return <Navigate to="/" replace />;
  if (effectiveUser?.role === 'admin') return <Navigate to="/dashboard/admin" replace />;
  if (effectiveUser?.role === 'employee') return <Navigate to="/dashboard/employee" replace />;
  return <Navigate to="/customer-dashboard" replace />;
};

const LayoutWrapper = ({ user, setCallAssistantOpen, helpOpen, setHelpOpen, helpRole, helpId }: {
  user: any; 
  setCallAssistantOpen: (v: boolean) => void;
  helpOpen: boolean;
  setHelpOpen: (v: boolean) => void;
  helpRole: any;
  helpId: string | undefined;
}) => {
  const { isDemoMode, mockUser, isLoading } = useDemoMode();
  const location = useRouterLocation();
  const isApp = isAppRoute(location.pathname);
  const [businessStatus, setBusinessStatus] = useState<any>(() => {
    const cached = contentService.getServiceMetaSync("global_settings");
    return cached?.meta?.businessStatus || null;
  });

  useEffect(() => {
    (async () => {
      try {
        const meta = await contentService.getServiceMeta("global_settings");
        if (meta?.meta?.businessStatus) {
           setBusinessStatus(meta.meta.businessStatus);
        }
      } catch {}
    })();
  }, []);

  // ONLY block public/website routes if we are explicitly in demo mode paths.
  // Otherwise, we allow the main content to render while security config loads in background.
  if (isLoading && isApp) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white font-mono animate-in fade-in duration-300">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/20 border-t-white"></div>
          <div className="flex flex-col items-center">
            <p className="animate-pulse tracking-[0.2em] text-[10px] uppercase font-black">Verifying Security Posture</p>
            <p className="text-[8px] text-white/40 mt-1 uppercase tracking-widest">Global Sync Required</p>
          </div>
        </div>
      </div>
    );
  }
  
  const effectiveUser = isDemoMode 
    ? (user || mockUser || { id: 'demo-visitor', email: 'visitor@prime-demo', role: 'admin', name: 'Demo Visitor' }) 
    : user;

  const showDarkTheme = isApp && (isDemoMode || (user && (user?.role === 'admin' || user?.role === 'employee')));

  const publicRoutePaths = ['/', '/about', '/contact', '/faq', '/services', '/book', '/availability', '/blog', '/thank-you', '/checkout', '/payment-success', '/portal', '/f150-setup', '/contact-support'];
  const isPublicPage = publicRoutePaths.includes(location.pathname.toLowerCase().replace(/\/+/g, '/')) || location.pathname.startsWith('/blog/');

  const publicRoutes = (
    <>
      <Route path="/" element={<Index />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/book" element={<BookNow />} />
      <Route path="/availability" element={<Availability />} />
      <Route path="/services" element={<CustomerPortal />} />
      <Route path="/blog" element={<PrimeBlog />} />
      <Route path="/thank-you" element={<ThankYou />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/portal" element={<Portal />} />
      <Route path="/f150-setup" element={<MobileSetup />} />
      <Route path="/shop-setup-preview" element={<ShopSetup />} />
      <Route path="/contact-support" element={<ContactSupport />} />
    </>
  );

  // 1. PUBLIC LAYOUT: Clear, untrashed view for all visitors (and admins viewing the site)
  // We Wrap in SidebarProvider so admins can still use the sidebar toggle in the Navbar
  if (isPublicPage) {
    return (
      <SidebarProvider defaultOpen={false}>
        <div className="min-h-screen w-full bg-white text-zinc-900 selection:bg-blue-600 selection:text-white flex border-none">
          {effectiveUser && (effectiveUser.role === 'admin' || effectiveUser.role === 'employee') && (
            <div className="dark-theme">
              <AppSidebar key={effectiveUser.id} user={effectiveUser} businessStatus={businessStatus} />
            </div>
          )}
          <div className="flex-1 flex flex-col min-w-0">
            <Routes>
              {publicRoutes}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/update-password" element={<UpdatePassword />} />
              <Route path="*" element={<DefaultRedirect user={user} />} />
            </Routes>
            <HelpModal open={helpOpen} onOpenChange={setHelpOpen} role="customer" initialTopicId={helpId} />
          </div>
        </div>
      </SidebarProvider>
    );
  }

  // 2. UNAUTHENTICATED AUTH PAGES
  if (!effectiveUser) {
    return (
      <div className="min-h-screen w-full bg-white text-zinc-900">
        <Routes>
          {publicRoutes}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <HelpModal open={helpOpen} onOpenChange={setHelpOpen} role="customer" initialTopicId={helpId} />
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const isPerspectiveMode = isAdmin && (
     localStorage.getItem('view_as_mode') === 'customer' ||
     localStorage.getItem('view_as_mode') === 'employee' ||
     location.pathname.startsWith('/customer-dashboard') || 
     location.pathname.startsWith('/portal') || 
     location.pathname.startsWith('/dashboard/employee')
  );

  const isBusinessBanner = !!businessStatus?.isTopBannerActive;

  // Each banner is approx 40px
  let totalBanners = 0;
  if (isDemoMode) totalBanners++;
  if (isPerspectiveMode) totalBanners++;
  if (isBusinessBanner) totalBanners++;

  const ptMap: Record<number, string> = {
    0: 'pt-[64px]',
    1: 'pt-[104px]',
    2: 'pt-[144px]',
    3: 'pt-[184px]'
  };
  const paddingClass = ptMap[totalBanners] || 'pt-[64px]';

  // 3. INTERNAL APP LAYOUT: Flex with Sidebar for Dashboards/Admin
  return (
    <div className={`flex min-h-screen w-full ${showDarkTheme ? 'bg-black text-white' : 'bg-white text-black'}`}>
      <div className={`dark-theme min-h-screen ${paddingClass}`}>
        <AppSidebar key={effectiveUser.id} user={effectiveUser} businessStatus={businessStatus} />
      </div>
      <div className={`flex-1 ${paddingClass} ${showDarkTheme ? 'dark-theme bg-black' : 'bg-white'}`}>
        <Routes>
          {publicRoutes}
          <Route path="/dashboard/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/demo/dashboard" element={<ProtectedRoute allowedRoles={[]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/employee" element={<ProtectedRoute allowedRoles={['employee', 'admin']}><EmployeeDashboard /></ProtectedRoute>} />
          <Route path="/customer-dashboard" element={<ProtectedRoute allowedRoles={['customer', 'admin', 'employee']}><CustomerDashboard /></ProtectedRoute>} />
          <Route path="/bookings" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><BookingsPage /></ProtectedRoute>} />
          <Route path="/demo/bookings" element={<ProtectedRoute allowedRoles={[]}><BookingsPage /></ProtectedRoute>} />
          <Route path="/bookings-analytics" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><BookingsAnalyticsPage /></ProtectedRoute>} />
          <Route path="/demo/bookings-analytics" element={<ProtectedRoute allowedRoles={[]}><BookingsAnalyticsPage /></ProtectedRoute>} />
          <Route path="/search-customer" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><SearchCustomer /></ProtectedRoute>} />
          <Route path="/demo/search-customer" element={<ProtectedRoute allowedRoles={[]}><SearchCustomer /></ProtectedRoute>} />
          <Route path="/prospects" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><Prospects /></ProtectedRoute>} />
          <Route path="/demo/prospects" element={<ProtectedRoute allowedRoles={[]}><Prospects /></ProtectedRoute>} />
          <Route path="/service-checklist" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><ServiceChecklist /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><Tasks /></ProtectedRoute>} />
          <Route path="/demo/tasks" element={<ProtectedRoute allowedRoles={[]}><Tasks /></ProtectedRoute>} />
          <Route path="/team-chat" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><TeamChat /></ProtectedRoute>} />
          <Route path="/jobs-completed" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><JobsCompleted /></ProtectedRoute>} />
          <Route path="/invoicing" element={<ProtectedRoute allowedRoles={['admin']}><Invoicing /></ProtectedRoute>} />
          <Route path="/demo/invoicing" element={<ProtectedRoute allowedRoles={[]}><Invoicing /></ProtectedRoute>} />
          <Route path="/estimates" element={<ProtectedRoute allowedRoles={['admin']}><Estimates /></ProtectedRoute>} />
          <Route path="/demo/estimates" element={<ProtectedRoute allowedRoles={[]}><Estimates /></ProtectedRoute>} />
          <Route path="/accounting" element={<ProtectedRoute allowedRoles={['admin']}><Accounting /></ProtectedRoute>} />
          <Route path="/demo/accounting" element={<ProtectedRoute allowedRoles={[]}><Accounting /></ProtectedRoute>} />
          <Route path="/payroll" element={<ProtectedRoute allowedRoles={['admin']}><Payroll /></ProtectedRoute>} />
          <Route path="/demo/payroll" element={<ProtectedRoute allowedRoles={[]}><Payroll /></ProtectedRoute>} />
          <Route path="/company-budget" element={<ProtectedRoute allowedRoles={['admin']}><CompanyBudget /></ProtectedRoute>} />
          <Route path="/demo/company-budget" element={<ProtectedRoute allowedRoles={[]}><CompanyBudget /></ProtectedRoute>} />
          <Route path="/discount-coupons" element={<ProtectedRoute allowedRoles={['admin']}><DiscountCoupons /></ProtectedRoute>} />
          <Route path="/package-pricing" element={<ProtectedRoute allowedRoles={['admin']}><PackagePricing /></ProtectedRoute>} />
          <Route path="/mileage" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><MileageTracking /></ProtectedRoute>} />
          <Route path="/taxes" element={<ProtectedRoute allowedRoles={['admin']}><Taxes /></ProtectedRoute>} />
          <Route path="/inventory-control" element={<ProtectedRoute allowedRoles={['admin']}><InventoryControl /></ProtectedRoute>} />
          <Route path="/demo/inventory-control" element={<ProtectedRoute allowedRoles={[]}><InventoryControl /></ProtectedRoute>} />
          <Route path="/file-manager" element={<ProtectedRoute allowedRoles={['admin']}><FileManager /></ProtectedRoute>} />
          <Route path="/mobile-setup" element={<ProtectedRoute allowedRoles={['admin']}><MobileSetup /></ProtectedRoute>} />
          <Route path="/shop-setup" element={<ProtectedRoute allowedRoles={['admin']}><ShopSetup /></ProtectedRoute>} />
          <Route path="/detailing-vendors" element={<ProtectedRoute allowedRoles={['admin']}><DetailingVendors /></ProtectedRoute>} />
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
          <Route path="/package-selection" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><PackageSelection /></ProtectedRoute>} />
          <Route path="/vehicle-classification" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><VehicleClassification /></ProtectedRoute>} />
          <Route path="/client-evaluation" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><ClientEvaluation /></ProtectedRoute>} />
          <Route path="/addon-upsell-script" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><AddonUpsellScript /></ProtectedRoute>} />
          <Route path="/package-guide" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><PackageExplanationGuide /></ProtectedRoute>} />
          <Route path="/availability-manager" element={<ProtectedRoute allowedRoles={['admin']}><AvailabilityManager /></ProtectedRoute>} />
          <Route path="/website-admin" element={<ProtectedRoute allowedRoles={['admin']}><WebsiteAdministration /></ProtectedRoute>} />
          <Route path="/section/:sectionId" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><SectionLanding /></ProtectedRoute>} />
          <Route path="/notes" element={<ProtectedRoute allowedRoles={['admin', 'employee', 'customer']}><PersonalNotes /></ProtectedRoute>} />
          <Route path="/vehicle-gallery" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><VehicleGallery /></ProtectedRoute>} />
          <Route path="/demo/vehicle-gallery" element={<ProtectedRoute allowedRoles={[]}><VehicleGallery /></ProtectedRoute>} />
          <Route path="/app-manual" element={<ProtectedRoute allowedRoles={['admin', 'employee']}><AppManual /></ProtectedRoute>} />
          <Route path="/user-settings" element={<ProtectedRoute allowedRoles={['admin', 'employee', 'customer']}><UserSettings /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><Settings /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin']}><Reports /></ProtectedRoute>} />
          <Route path="/demo/reports" element={<ProtectedRoute allowedRoles={[]}><Reports /></ProtectedRoute>} />
          <Route path="/follow-up-center" element={<ProtectedRoute allowedRoles={['admin']}><FollowUpCenter /></ProtectedRoute>} />
          <Route path="/sticker-maker" element={<ProtectedRoute allowedRoles={['admin']}><StickerMaker /></ProtectedRoute>} />
          <Route path="/demo/sticker-maker" element={<ProtectedRoute allowedRoles={[]}><StickerMaker /></ProtectedRoute>} />
          <Route path="/elite-master" element={<ProtectedRoute allowedRoles={['admin']}><EliteMaster /></ProtectedRoute>} />
          <Route path="/blog-reorder" element={<Navigate to="/elite-master" replace />} />
          <Route path="/demo" element={<Navigate to="/demo/dashboard" replace />} />
          <Route path="/active-jobs" element={<ProtectedRoute allowedRoles={['customer', 'admin', 'employee']}><ActiveJobs /></ProtectedRoute>} />
          <Route path="/job-history" element={<ProtectedRoute allowedRoles={['customer', 'admin', 'employee']}><JobHistory /></ProtectedRoute>} />
          <Route path="/my-invoices" element={<ProtectedRoute allowedRoles={['customer', 'admin', 'employee']}><MyInvoices /></ProtectedRoute>} />
          <Route path="/payments-cart" element={<ProtectedRoute allowedRoles={['customer', 'admin', 'employee']}><PaymentsAndCart /></ProtectedRoute>} />
          <Route path="/customer-account" element={<ProtectedRoute allowedRoles={['customer']}><CustomerAccount /></ProtectedRoute>} />
          <Route path="/customer-profile" element={<ProtectedRoute allowedRoles={['customer']}><CustomerProfile /></ProtectedRoute>} />
          <Route path="/portal" element={<ProtectedRoute allowedRoles={['customer']}><Portal /></ProtectedRoute>} />
          <Route path="/contact-support" element={<ContactSupport />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<DefaultRedirect user={user} />} />
        </Routes>
        <HelpModal open={helpOpen} onOpenChange={setHelpOpen} role={helpRole || effectiveUser?.role || 'admin'} initialTopicId={helpId} />
      </div>
      {effectiveUser?.role !== 'customer' && (
        <div className="dark-theme min-h-screen">
          <GlobalRightSidebar />
        </div>
      )}
    </div>
  );
};

const App = () => {
  const { toast } = useToast();
  const [user, setUser] = useState(getCurrentUser());
  const [callAssistantOpen, setCallAssistantOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpId, setHelpId] = useState<string | undefined>(undefined);
  const [helpRole, setHelpRole] = useState<'admin' | 'employee' | 'customer' | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    // ENVIRONMENTAL AUDIT (Separation of Demo vs Real)
    const isDemoActive = localStorage.getItem("demo_mode_active") === "true";
    const modeStyle = isDemoActive 
      ? 'background: #b45309; color: #fff; font-weight: bold; padding: 4px 8px; border-radius: 4px;' 
      : 'background: #065f46; color: #fff; font-weight: bold; padding: 4px 8px; border-radius: 4px;';
    
    console.log(`%c PRIME SYSTEM STATUS %c ${isDemoActive ? 'TRAINING MODE ACTIVE' : 'PRODUCTION MODE ACTIVE'} `, 
      'background: #1e293b; color: #cbd5e1; font-weight: bold; padding: 4px 8px; border-radius: 4px 0 0 4px;',
      modeStyle
    );

    if (isDemoActive) {
      console.warn("[App] Training Mode is currently active. Persistent database writes across the inventory and CRM are disabled to protect production data integrity.");
    }
    
    console.log("[App] Mounting...");
    
    try {
      if (import.meta.env.VITE_AUTH_MODE === 'supabase') setAuthMode('supabase');
    } catch { }

    const initAuth = async () => {
      try {
        console.log("[App] Initializing Supabase Auth...");
        initSupabaseAuth();
        if (isSupabaseEnabled()) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user && mounted) {
            console.log("[App] Finalizing Supabase session for:", data.session.user.email);
            await finalizeSupabaseSession(data.session.user);
            setUser(getCurrentUser());
          }
        }
      } catch (e) {
        console.warn('[App] Auth init failed', e);
      } finally {
        if (mounted) {
          console.log("[App] Auth initialization complete.");
          setAuthReady(true);
        }
      }
    };

    initAuth();

    const safetyTimer = setTimeout(() => {
      if (mounted && !authReady) {
        console.log("[App] Safety timer triggered. Forcing authReady=true");
        setAuthReady(true);
      }
    }, 4000);

    const updateUser = () => {
      if (mounted) {
        const u = getCurrentUser();
        console.log("[App] Auth update detected. New user:", u?.email || "null");
        setUser(u);
      }
    };
    
    window.addEventListener('auth-changed', updateUser);
    window.addEventListener('storage', updateUser);
    try { initTaskWorkflowListeners(); } catch { }

    const onOpenCallAssistant = () => setCallAssistantOpen(true);
    const onOpenHelp = (e: any) => {
      const currentUser = getCurrentUser();
      const isDemoSession = localStorage.getItem("demo_mode_active") === "true";
      let topicId: string | undefined = undefined;
      let role: any = isDemoSession ? 'admin' : (currentUser?.role || 'customer');

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

    const onDemoBlocked = (e: any) => {
      const action = e.detail?.action || 'this action';
      toast({
        title: "Simulation Security Guard",
        description: `Persistent ${action} is disabled in Training Mode. Your session data remains local and will not affect live business records.`,
        variant: "destructive"
      });
      // Also show a sonner for extra visibility
      sonnerToast.error("Write Operation Blocked", {
        description: `Demo Mode ensures production data stays secure.`
      });
    };

    window.addEventListener('open-call-assistant', onOpenCallAssistant);
    window.addEventListener('open-help', onOpenHelp);
    window.addEventListener('demo-blocked-action', onDemoBlocked as EventListener);

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      window.removeEventListener('auth-changed', updateUser);
      window.removeEventListener('storage', updateUser);
      window.removeEventListener('open-call-assistant', onOpenCallAssistant);
      window.removeEventListener('open-help', onOpenHelp);
      window.removeEventListener('demo-blocked-action', onDemoBlocked as EventListener);
    };
  }, []);

  if (!authReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white font-mono">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p className="animate-pulse tracking-widest text-xs uppercase">Initializing System...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SidebarProvider defaultOpen={true}>
            <BrowserRouter>
              <DemoProvider>
                <DemoBanner />
                <PerspectiveBanner />
                <WalkthroughProvider>
                  <Toaster />
                  <Sonner />
                  <GlobalModals />
                  <ScrollToTop />
                  <ConditionalGlobalChat />
                  <ChatAudioAlert />
                  <WalkthroughOverlay />
                  <LayoutWrapper 
                    user={user} 
                    setCallAssistantOpen={setCallAssistantOpen} 
                    helpOpen={helpOpen}
                    setHelpOpen={setHelpOpen}
                    helpRole={helpRole}
                    helpId={helpId}
                  />
                  <CallAssistantModal open={callAssistantOpen} onOpenChange={setCallAssistantOpen} />
                  <QuickPayModal />
                </WalkthroughProvider>
              </DemoProvider>
            </BrowserRouter>
          </SidebarProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
