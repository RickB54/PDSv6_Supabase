import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Home, ClipboardCheck, Search, Calculator, BookOpen, Users,
  Settings, Package, FileBarChart, DollarSign, LayoutDashboard, Globe,
  TicketPercent, GraduationCap, Shield, CalendarDays, Target as TargetIcon,
  ChevronRight, ChevronsUp, ChevronsDown, UserPlus, Newspaper,
  MessageSquare, Clock, History, ShoppingCart, Video, HelpCircle,
  FileText, CheckSquare, Sparkles, PanelLeft, X
} from "lucide-react";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarGroup,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { getCurrentUser, finalizeSupabaseSession } from "@/lib/auth";
import supabase from "@/lib/supabase";
import logo from "@/assets/logo-primary.png";
import { getAdminAlerts } from "@/lib/adminAlerts";
import AboutDialog from "@/components/AboutDialog";
import { getMenuGroups, TOP_ITEMS as CONFIGURED_TOP_ITEMS } from "@/components/menu-config";
import api from "@/lib/api";
import { isViewed } from "@/lib/viewTracker";
import localforage from "localforage";
import { useBookingsStore } from "@/store/bookings";
import { useDemoMode } from "@/contexts/DemoContext";
import { contentService } from "@/lib/content";

export type MenuItem = { 
  title: string; 
  url: string; 
  icon?: any; 
  role?: string; 
  key?: string; 
  badge?: number; 
  badgeColor?: 'red' | 'blue'; 
  highlight?: 'red' | 'green' | 'yellow';
  iconColor?: 'blue' | string;
  helpTopicId?: string;
};

export function AppSidebar({ user: userProp, businessStatus: businessStatusProp }: { user?: any, businessStatus?: any }) {

  const { open, openMobile, setOpenMobile, setOpen, isMobile, toggleSidebar } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(userProp || getCurrentUser());
  const { items: allBookings } = useBookingsStore();
  const { isDemoMode, isAdminPreview, setAdminPreview, canAccess, visibleSections } = useDemoMode();
  const [searchQuery, setSearchQuery] = useState("");
  const [businessStatus, setBusinessStatus] = useState<any>(() => {
    if (businessStatusProp) return businessStatusProp;
    const cached = contentService.getServiceMetaSync("global_settings");
    return cached?.meta?.businessStatus || null;
  });

  const isAdmin = user?.role === 'admin' || user?.email === 'rberube54@gmail.com' || user?.email === 'Rick.PrimeAutoDetail@gmail.com';
  const isEmployee = user?.role === 'employee';
  const isCustomer = user?.role === 'customer';

  const isViewingAsCustomer = (isAdmin && localStorage.getItem('view_as_mode') === 'customer') || location.pathname.startsWith('/customer-dashboard') || location.pathname.startsWith('/portal') || location.pathname.startsWith('/active-jobs');
  const isViewingAsEmployee = (isAdmin && localStorage.getItem('view_as_mode') === 'employee') || location.pathname.startsWith('/dashboard/employee');

  useEffect(() => {
    if (isAdmin) {
      if (location.pathname === '/dashboard/employee') {
        localStorage.setItem('view_as_mode', 'employee');
      } else if (location.pathname === '/customer-dashboard') {
        localStorage.setItem('view_as_mode', 'customer');
      } else if (location.pathname === '/dashboard/admin') {
        localStorage.removeItem('view_as_mode');
      }
    }
  }, [location.pathname, isAdmin]);

  useEffect(() => {
    if (businessStatusProp) {
      setBusinessStatus(businessStatusProp);
      return;
    }
    (async () => {
      try {
        const meta = await contentService.getServiceMeta("global_settings");
        if (meta && meta.meta && meta.meta.businessStatus) {
           setBusinessStatus(meta.meta.businessStatus);
        }
      } catch {}
    })();
  }, [businessStatusProp]);

  const bannerOffset = useMemo(() => {
    let offset = 0;
    if (isDemoMode) offset += 40;
    if (isViewingAsCustomer || isViewingAsEmployee) offset += 40;
    if (businessStatus?.isTopBannerActive) {
      offset += 40; 
    }
    return offset;
  }, [isDemoMode, businessStatus, isViewingAsCustomer, isViewingAsEmployee]);

  const topOffset = isMobile ? '0px' : `${bannerOffset}px`;

  // Helper to get correct URL for demo mode
  const getUrl = (url: string) => {
    // If not in demo mode path, return as is
    if (!location.pathname.startsWith('/demo')) return url;
    
    // If it's already a demo path, return as is
    if (url.startsWith('/demo')) return url;

    // Mapping for major demo sections to /demo equivalents
    if (url === '/dashboard/admin') return '/demo/dashboard';
    if (url === '/search-customer') return '/demo/search-customer';
    if (url === '/prospects') return '/demo/prospects';
    if (url === '/inventory-control') return '/demo/inventory-control';
    if (url === '/invoicing') return '/demo/invoicing';
    if (url === '/vehicle-gallery') return '/demo/vehicle-gallery';
    if (url === '/reports') return '/demo/reports';
    if (url === '/bookings') return '/demo/bookings';
    if (url === '/bookings-analytics') return '/demo/bookings-analytics';
    if (url === '/tasks') return '/demo/tasks';
    if (url === '/estimates') return '/demo/estimates';
    if (url === '/accounting') return '/demo/accounting';
    if (url === '/payroll') return '/demo/payroll';
    if (url === '/company-budget') return '/demo/company-budget';
    if (url === '/sticker-maker') return '/demo/sticker-maker';

    return url;
  };

  useEffect(() => {
    const handleForceOpen = () => {
      console.log("[AppSidebar] Force opening sidebar...");
      setOpen(true);
      if (isMobile) setOpenMobile(true);
    };
    window.addEventListener('force-sidebar-open', handleForceOpen);
    return () => window.removeEventListener('force-sidebar-open', handleForceOpen);
  }, [setOpen, setOpenMobile, isMobile]);

  // Keep local user in sync with prop
  useEffect(() => {
    if (userProp) {
      setUser(userProp);
    }
  }, [userProp]);


  const [showAbout, setShowAbout] = useState(false);
  const handleLogoClick = () => {
    setShowAbout(true);
  };

  const [tick, setTick] = useState(0);
  const getHiddenMenuItems = (): string[] => {
    try {
      const raw = localStorage.getItem('hiddenMenuItems');
      const arr = JSON.parse(raw || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  };
  const isHidden = (key: string) => {
    if (isDemoMode && key && !canAccess(key)) return true;
    return getHiddenMenuItems().includes(key);
  };

  useEffect(() => {
    function onStorage() { setTick((t) => t + 1); }
    window.addEventListener('storage', onStorage as any);
    const bump = () => setTick(t => t + 1);
    window.addEventListener('admin_alerts_updated', bump as any);
    window.addEventListener('pdf_archive_updated', bump as any);

    // Chat Alert Listener
    const handleChatAlert = () => {
      localStorage.setItem('has_unread_chat', 'true');
      setTick(t => t + 1);
    };
    window.addEventListener('new-chat-alert', handleChatAlert);

    // Force refresh role on mount to fix stale "customer" state
    const refreshRole = async () => {
      if (isDemoMode) return; // Skip in demo mode
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: dbUser } = await supabase
        .from('app_users')
        .select('role, name')
        .eq('id', authUser.id)
        .maybeSingle();

      if (dbUser) {
        const currentUser = getCurrentUser();
        const isSimulated = !!localStorage.getItem('view_as_mode');
        
        if (!isSimulated && currentUser?.role !== dbUser.role) {
          const { finalizeSupabaseSession } = await import('@/lib/auth');
          await finalizeSupabaseSession(authUser);
          setUser(getCurrentUser());
        }
      }
    };

    refreshRole();

    // Aggressive retry for the first 10 seconds after mount
    const interval = setInterval(refreshRole, 2000);
    const timeout = setTimeout(() => clearInterval(interval), 10000);

    return () => {
      window.removeEventListener('storage', onStorage as any);
      window.removeEventListener('admin_alerts_updated', bump as any);
      window.removeEventListener('pdf_archive_updated', bump as any);
      window.removeEventListener('new-chat-alert', handleChatAlert);
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isDemoMode]);

  // Auto-close mobile menu on route change
  useEffect(() => { setOpenMobile(false); }, [location.pathname, setOpenMobile]);

  // Mobile Swipe-to-Open Logic
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const dX = Math.abs(currentX - touchStartX);
      const dY = Math.abs(currentY - touchStartY);

      // AGGRESSIVE: If the touch started in the edge zone, we block horizontal browser movement
      if (touchStartX <= 120) {
        if (dX > dY && dX > 5) { // If swiping horizontally from the edge
          if (e.cancelable) e.preventDefault();
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = Math.abs(touchEndY - touchStartY);

      if (
        touchStartX <= 120 && 
        deltaX > 50 && // Slightly higher threshold to ensure it's intentional
        deltaY < 80 
      ) {
        if (!openMobile) {
          setOpenMobile(true);
          // Vibrational feedback if supported
          try { window.navigator.vibrate(10); } catch {}
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [openMobile, setOpenMobile]);

  // Counts
  const fileCount = useMemo(() => {
    if (isDemoMode) return 3;
    try {
      const list = JSON.parse(localStorage.getItem('pdfArchive') || '[]');
      return list.filter((r: any) => !isViewed('file', String(r.id || r.fileName || r.timestamp || ''))).length;
    } catch { return 0; }
  }, [isDemoMode, tick]);

  const inventoryCount = useMemo(() => {
    if (isDemoMode) return 5;
    try {
      const c = Number(localStorage.getItem('inventory_low_count') || '0');
      return isNaN(c) ? 0 : c;
    } catch { return 0; }
  }, [isDemoMode, tick]);

  const todoCount = useMemo(() => {
    if (isDemoMode) return 2;
    try {
      const list = getAdminAlerts();
      return list.filter(a => a.type === 'todo_overdue' && !a.read).length;
    } catch { return 0; }
  }, [isDemoMode, tick]);

  const [payrollDueCount, setPayrollDueCount] = useState(0);
  useEffect(() => {
    if (isDemoMode) {
      setPayrollDueCount(1);
      return;
    }
    (async () => {
      try {
        const payrollHistory = (await localforage.getItem<any[]>('payroll-history'));
        const entries = payrollHistory || [];
        const pendingCount = entries.filter((entry: any) => {
          const status = String(entry.status || '').toLowerCase();
          return status === 'pending' || status === 'unpaid' || !entry.status;
        }).length;
        setPayrollDueCount(pendingCount);
      } catch (error) { setPayrollDueCount(0); }
    })();
  }, [isDemoMode, tick]);

  const chatUnread = useMemo(() => {
    if (isDemoMode) return false;
    return localStorage.getItem('has_unread_chat') === 'true';
  }, [isDemoMode, tick]);

  // Group State Persistence
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('sidebar_groups');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });


  const toggleGroup = (title: string, isOpen: boolean) => {
    const next = { ...openGroups, [title]: isOpen };
    setOpenGroups(next);
    localStorage.setItem('sidebar_groups', JSON.stringify(next));
  };

  // Auto-expand groups based on active route (Exclusive)
  useEffect(() => {
    let activeGroupTitle = "";
    MENU_GROUPS.forEach(group => {
      // 1. Check if any sub-item is active
      const hasSubMatch = group.items.find(item => {
        const currentFull = location.pathname + location.search;
        const targetUrl = getUrl(item.url);
        return targetUrl === currentFull ||
          (!targetUrl.includes('?') && location.pathname === targetUrl);
      });
      
      // 2. Check if the section landing page for this group is active
      const sectionId = group.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const isLandingPage = location.pathname === `/section/${sectionId}`;

      if (hasSubMatch || isLandingPage) {
        activeGroupTitle = group.title;
      }
    });

    // If we are on a page that belongs to a group, ensure only that group is open.
    // If we are on a top-level page (no activeGroupTitle), close all groups to keep it clean.
    const next: Record<string, boolean> = activeGroupTitle ? { [activeGroupTitle]: true } : {};
    
    // Only update if it actually changed to avoid loop
    if (JSON.stringify(next) !== JSON.stringify(openGroups)) {
      setOpenGroups(next);
      localStorage.setItem('sidebar_groups', JSON.stringify(next));
    }
  }, [location.pathname, location.search]);


  // Standalone Top Items
  const TOP_ITEMS = [
    ...CONFIGURED_TOP_ITEMS,
    { title: 'Personal Notes', url: '/notes', icon: BookOpen, role: 'employee', highlight: 'yellow' as const, key: 'personal-notes', iconColor: 'text-yellow-500', helpTopicId: 'personal-notes' },
    { title: 'Analytics', url: '/bookings-analytics', icon: FileBarChart, key: 'bookings-analytics', iconColor: 'text-amber-500', helpTopicId: 'bookings-analytics' },
    { title: 'Business Goals', url: '/goals', icon: TargetIcon, key: 'goals', iconColor: 'text-emerald-400', helpTopicId: 'business-goals' },
    { title: 'Vehicle Gallery', url: '/vehicle-gallery', icon: Video, role: 'employee', key: 'vehicle-gallery', iconColor: 'text-purple-500', helpTopicId: 'media-library' },
    { title: 'App Manual', url: '/app-manual', icon: Shield, role: 'employee', key: 'app-manual', iconColor: 'text-blue-400', helpTopicId: 'app-manual' },
    { title: 'File Manager', url: '/file-manager', icon: FileText, role: 'admin', key: 'file-manager', badge: fileCount > 0 ? fileCount : undefined, iconColor: 'text-emerald-500', helpTopicId: 'file-manager' }

  ].filter(item => {
    if (isDemoMode && item.key && !canAccess(item.key)) return false;
    
    // Role check for top items
    const isStrictView = isViewingAsCustomer || isViewingAsEmployee;
    if (item.role === 'admin' && (!isAdmin || isStrictView)) return false;
    if (item.role === 'employee' && !isAdmin && !isStrictView) return false;

    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const CUSTOMER_ITEMS: MenuItem[] = [
    { title: "Customer Dashboard", url: "/customer-dashboard", icon: LayoutDashboard },
    { title: "Book A Job", url: "/services", icon: CalendarDays },
    { title: "Contact Support", url: "/contact-support", icon: MessageSquare },
    { title: "Active Jobs", url: "/active-jobs", icon: Clock },
    { title: "Job History", url: "/job-history", icon: History },
    { title: "Payments & Cart", url: "/payments-cart", icon: ShoppingCart },
    { title: "My Invoices", url: "/my-invoices", icon: FileText },
    { title: "Personal Notes", url: "/notes", icon: BookOpen },
    { title: "Prime Blog", url: "/blog", icon: Newspaper },
    { title: "User Settings", url: "/user-settings", icon: Settings },
    { title: "Prime Website", url: "/", icon: Globe },
  ].filter(item => {
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const realUser = useMemo(() => getCurrentUser(), []);
  const isRealAdminOrEmployee = realUser?.role === "admin" || realUser?.role === "employee";

  const MENU_GROUPS = useMemo(() => {
    const activeBookings = allBookings.filter(b => {
      if (b.isArchived) return false;
      const status = (b.status || '').toLowerCase().trim();
      return status === 'confirmed' || status === 'tentative' || status === 'pending' || status === 'in_progress' || status === 'in-progress';
    });

    // Determine the badge simply from active bookings
    let badgeCount = isDemoMode ? 3 : (activeBookings || []).length;
    let badgeColor: 'red' | 'blue' = (isDemoMode) ? 'red' : 'blue';

    return getMenuGroups({
      todoCount: todoCount || 0,
      payrollDueCount: payrollDueCount || 0,
      inventoryCount: inventoryCount || 0,
      fileCount: fileCount || 0,
      tentativeBookingsCount: badgeCount,
      bookingsBadgeColor: badgeColor
    }).filter(group => {
      // Check if group title matches search
      const groupMatches = searchQuery && group.title.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filter items within the group
      group.items = group.items.filter(item => {
        if (isDemoMode && item.key && !canAccess(item.key)) return false;
        
        // Strict role filtering based on current view mode
        const isStrictEmployeeView = isViewingAsEmployee;
        const isAdminCheck = isAdmin || isDemoMode;
        
        if (item.role === 'admin' && (!isAdminCheck || isStrictEmployeeView)) return false;
        if (item.role === 'employee' && !isStrictEmployeeView && !isAdminCheck) return false;
        
        // Match item if it contains search OR if its group matches
        if (searchQuery && !groupMatches && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        
        return true;
      });
      
      return group.items.length > 0 || groupMatches;
    });
  }, [todoCount, payrollDueCount, inventoryCount, fileCount, allBookings.length, tick, isDemoMode, visibleSections, searchQuery, isViewingAsEmployee, isViewingAsCustomer]);

  const isAnyOpen = MENU_GROUPS.some(g => openGroups[g.title]);

  const handleNavClick = (e: React.MouseEvent, url: string, topicId?: string) => {
    if (openMobile) setOpenMobile(false);
    
    if (url === '/letter-maker' || url.startsWith('/letter-maker') || url.includes('/letter-maker')) {
      e.preventDefault();
      window.location.href = url;
      return;
    }
    
    if (url.startsWith('#')) {
      e.preventDefault();
      if (url === '#call-assistant') {
        window.dispatchEvent(new Event('open-call-assistant'));
      } else if (url === '#quick-pay') {
        window.dispatchEvent(new Event('open-quick-pay'));
      } else if (url.startsWith('#help')) {
        const role = url === '#help-admin' ? 'admin' : (url === '#help-employee' ? 'employee' : (isAdmin ? 'admin' : 'employee'));
        window.dispatchEvent(new CustomEvent('open-help', { detail: { role, topicId } }));
      }
    }
  };

  const toggleAllGroups = () => {
    if (isAnyOpen) {
      const next = MENU_GROUPS.reduce((acc, g) => ({ ...acc, [g.title]: false }), {});
      setOpenGroups(next);
      localStorage.setItem('sidebar_groups', JSON.stringify(next));
    } else {
      const next = MENU_GROUPS.reduce((acc, g) => ({ ...acc, [g.title]: true }), {});
      setOpenGroups(next);
      localStorage.setItem('sidebar_groups', JSON.stringify(next));
    }
  };


  return (
    <Sidebar 
      className="border-r border-border" 
      collapsible="icon"
      style={{ top: topOffset }}
    >
      <div 
        className={cn("flex flex-col border-b border-white/5")}
        style={{ paddingTop: `${bannerOffset + 64}px` }}
      >
        <div className="p-3 flex items-center justify-between group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:h-12">
          {/* Logo Section */}
          <div 
            className={cn(
              "flex items-center gap-3 overflow-hidden transition-all duration-300 cursor-pointer",
              (open || openMobile) ? "flex-1" : "w-0 opacity-0"
            )} 
            onClick={handleLogoClick}
          >
            <img src={logo} alt="Prime Auto Detail" className="h-9 w-9 aspect-square object-contain" />
            {(open || openMobile) && (
              <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                <h2 className="font-extrabold text-white text-[13px] tracking-tight whitespace-nowrap uppercase">Prime Auto</h2>
                <p className="text-[9px] text-zinc-500 uppercase font-black tracking-tighter">Detailing Systems</p>
              </div>
            )}
          </div>
          
          {/* Icons Section */}
          <div className={cn(
            "flex items-center gap-1 transition-all duration-300",
            !(open || openMobile) && "absolute inset-0 justify-center w-full"
          )}>
            {(open || openMobile) && (
              <>
                <Button variant="ghost" size="icon" onClick={toggleAllGroups} className="h-8 w-8 text-zinc-500 hover:text-white transition-colors" title="Toggle Groups">
                  {isAnyOpen ? <ChevronsUp className="h-4 w-4" /> : <ChevronsDown className="h-4 w-4" />}
                </Button>
              </>
            )}
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => window.dispatchEvent(new CustomEvent('open-help', { 
                  detail: { 
                    topicId: location.pathname === '/chemicals' ? 'chemical-cards' : 
                         location.pathname === '/chemical-training' ? 'chemical-decision-system' : 
                         location.pathname === '/inventory-control' ? 'inventory-control' : 
                         location.pathname === '/reports' ? 'reports-global-summary' :
                         location.pathname === '/bookings-analytics' ? 'bookings-analytics' :
                         location.pathname === '/notes' ? 'personal-notes' :
                         location.pathname === '/vehicle-gallery' ? 'media-library' :
                         location.pathname === '/file-manager' ? 'file-manager' :
                         location.pathname === '/dashboard/admin' ? 'admin-dashboard' :
                         location.pathname === '/website-admin' ? 'website-admin' : undefined,
                    role: isAdmin ? 'admin' : (isEmployee ? 'employee' : 'customer')
                  } 
                }))}
                className="h-8 w-8 text-zinc-500 hover:text-emerald-400 mr-2 transition-colors relative z-[100]" 
                title="Contextual Help Guide"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleSidebar}
                className={cn(
                  "text-white hover:text-blue-400 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center transition-all relative z-[110]",
                  (open || openMobile) ? "h-8 w-8" : "h-10 w-10"
                )}
                title={open || openMobile ? "Collapse Sidebar" : "Expand Sidebar"}
              >
                <PanelLeft className={cn("transition-transform duration-300", (open || openMobile) ? "h-4 w-4" : "h-6 w-6 rotate-180")} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <SidebarContent>
        {isAdmin && isAdminPreview && (
          <div className="px-2 py-2">
            <Button 
              variant="destructive" 
              className="w-full text-[10px] font-black uppercase tracking-wider h-8 bg-amber-900/40 hover:bg-amber-700 text-amber-200 border border-amber-800"
              onClick={() => setAdminPreview(false)}
            >
               Exit Demo Preview
            </Button>
          </div>
        )}

        {(open || openMobile) && (
          <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 bg-zinc-900/50 border border-zinc-800 rounded-lg pl-9 pr-9 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-medium"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        <SidebarMenu>
          {(isCustomer || (isAdmin && isViewingAsCustomer)) && (
            <>
              {(CUSTOMER_ITEMS || []).map((item) => {
                const isActive = location.pathname === item.url;
                const className = isActive ? 'font-semibold !text-blue-500 bg-transparent flex items-center gap-2 px-2 py-1.5 rounded-md w-full' : 'text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center gap-2 px-2 py-1.5 rounded-md w-full';
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title} className="bg-transparent hover:bg-transparent">
                      <Link to={item.url} className={className} onClick={(e) => handleNavClick(e, item.url, item.helpTopicId)}>
                        {item.icon && <item.icon className="h-4 w-4" />}
                        {(open || openMobile) && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </>
          )}

          {(isAdmin || isEmployee) && !isViewingAsCustomer && (
            <>
              {(TOP_ITEMS || []).map((item: any) => {
                if (item.role === 'admin' && !isAdmin) return null;
                const targetUrl = getUrl(item.url);
                const isActive = location.pathname === targetUrl;
                const isChatAlert = item.url === '/team-chat' && chatUnread;

                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      {targetUrl.startsWith('#') ? (
                        <button onClick={(e) => handleNavClick(e, targetUrl, item.helpTopicId)} className={cn('group', isChatAlert ? 'font-bold text-red-500 animate-pulse flex items-center gap-2 px-2 py-1.5 rounded-md w-full' : (isActive ? 'font-black !text-[#2563eb] bg-transparent flex items-center gap-2 px-2 py-1.5 rounded-md w-full' : 'text-zinc-100 font-bold hover:text-white hover:bg-zinc-800 flex items-center gap-2 px-2 py-1.5 rounded-md w-full'))}>
                          <item.icon className={cn(`h-4 w-4 shrink-0`, { 'mr-0': open, 'text-red-500': isChatAlert }, item.iconColor)} />
                          {(open || openMobile) && (
                            <div className="flex items-center justify-between flex-1 min-w-0">
                              <div className="flex items-center gap-2 truncate">
                                <span className="truncate">{item.title}</span>
                                {item.badge !== undefined && item.badge > 0 && (
                                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-black text-white animate-in zoom-in duration-300">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              {item.helpTopicId && (
                                <div 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    window.dispatchEvent(new CustomEvent('open-help', { 
                                      detail: { 
                                        topicId: item.helpTopicId,
                                        role: (user?.role === 'admin' || isDemoMode) ? 'admin' : (user?.role === 'employee' ? 'employee' : 'customer')
                                      } 
                                    }));
                                  }}
                                  className="p-1 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all cursor-help"
                                  title={`Help for ${item.title}`}
                                >
                                  <HelpCircle className="w-3.5 h-3.5" />
                                </div>
                              )}
                            </div>
                          )}
                        </button>
                      ) : (
                        <Link to={targetUrl} onClick={(e) => handleNavClick(e, targetUrl, item.helpTopicId)} style={{ color: isActive ? '#2563eb' : undefined }} className={cn('group', isChatAlert ? 'font-bold text-red-500 animate-pulse flex items-center gap-2 px-2 py-1.5 rounded-md w-full' : (isActive ? 'font-black !text-[#2563eb] bg-transparent flex items-center gap-2 px-2 py-1.5 rounded-md w-full' : 'text-zinc-100 font-bold hover:text-white hover:bg-zinc-800 flex items-center gap-2 px-2 py-1.5 rounded-md w-full'))}>
                          <item.icon className={cn(`h-4 w-4 shrink-0`, { 'mr-0': open, 'text-red-500': isChatAlert }, item.iconColor)} />
                          {(open || openMobile) && (
                            <div className="flex items-center justify-between flex-1 min-w-0">
                              <div className="flex items-center gap-2 truncate">
                                <span className="truncate">{item.title}</span>
                                {item.badge !== undefined && item.badge > 0 && (
                                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-black text-white animate-in zoom-in duration-300">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              {item.helpTopicId && (
                                <div 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    window.dispatchEvent(new CustomEvent('open-help', { 
                                      detail: { 
                                        topicId: item.helpTopicId,
                                        role: (user?.role === 'admin' || isDemoMode) ? 'admin' : (user?.role === 'employee' ? 'employee' : 'customer')
                                      } 
                                    }));
                                  }}
                                  className="p-1 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all cursor-help"
                                  title={`Help for ${item.title}`}
                                >
                                  <HelpCircle className="w-3.5 h-3.5" />
                                </div>
                              )}
                            </div>
                          )}
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {(MENU_GROUPS || []).map((group) => {
                const isOpen = openGroups[group.title];
                const groupBadgeCount = (group.items || []).reduce((acc: number, item: any) => acc + (item.badge || 0), 0);
                const isGroupActive = (group.items || []).some((item: any) => location.pathname === getUrl(item.url));
                
                return (
                  <Collapsible
                    key={group.title}
                    open={isOpen}
                    onOpenChange={(v) => {
                      // Exclusive toggle: only one group open at a time
                      const next = v ? { [group.title]: true } : {};
                      setOpenGroups(next);
                      localStorage.setItem('sidebar_groups', JSON.stringify(next));
                    }}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <div className="flex items-center w-full group/menu-item">
                        <SidebarMenuButton 
                          tooltip={group.title} 
                          style={{ color: isGroupActive ? '#2563eb' : undefined }}
                          className={cn(
                            "hover:text-white hover:bg-zinc-800 font-bold uppercase tracking-wider text-[10px] flex-1",
                            isGroupActive ? "text-[#2563eb] font-black" : "text-zinc-400"
                          )}
                          onClick={() => {
                            const sectionId = group.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                            navigate(`/section/${sectionId}`);
                          }}
                        >
                          <group.icon className={cn("h-4 w-4 mr-2", isGroupActive ? "text-[#2563eb]" : (group.iconColor || ""))} />
                          {(open || openMobile) && (
                            <>
                              <span className="flex-1 text-left">{group.title}</span>
                              {!isOpen && groupBadgeCount > 0 && (
                                <span className="ml-auto mr-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] text-white">
                                  {groupBadgeCount}
                                </span>
                              )}
                            </>
                          )}
                        </SidebarMenuButton>
                        {(open || openMobile) && (
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-transform duration-200",
                                isOpen && "rotate-90"
                              )}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </CollapsibleTrigger>
                        )}
                      </div>
                      <CollapsibleContent>
                        <SidebarMenuSub className="border-l border-zinc-800/50 ml-4 pl-2 mb-2">
                          {(group.items || []).map((item: any) => {
                            const targetUrl = getUrl(item.url);
                            const isActive = location.pathname === targetUrl;
                            const isHiddenItem = isHidden(item.key || '');
                            if (isHiddenItem && !searchQuery) return null;

                            return (
                              <SidebarMenuSubItem key={item.title}>
                                <SidebarMenuSubButton asChild isActive={isActive}>
                                  {targetUrl.startsWith('#') ? (
                                    <button
                                      className={cn(
                                        "flex items-center gap-2 py-2 h-auto text-[11px] w-full text-left",
                                        isActive ? "!text-[#2563eb] font-black" : "text-zinc-400 font-bold hover:text-white transition-colors"
                                      )} 
                                      onClick={(e) => handleNavClick(e, targetUrl, item.helpTopicId)}
                                    >
                                      <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
                                        {item.icon && <item.icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-blue-500" : (item.iconColor ? item.iconColor : "text-zinc-500"))} />}
                                        <span className={cn("truncate", item.iconColor && !isActive && item.iconColor)}>{item.title}</span>
                                        {item.helpTopicId && (
                                          <div
                                            role="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              window.dispatchEvent(new CustomEvent('open-help', { 
                                                detail: { 
                                                  topicId: item.helpTopicId,
                                                  role: (isAdmin || isDemoMode) ? 'admin' : (user?.role === 'employee' ? 'employee' : 'customer')
                                                } 
                                              }));
                                            }}
                                            className="ml-auto opacity-0 group-hover:opacity-100 hover:text-emerald-400 transition-all p-0.5 cursor-pointer"
                                            title={`Help for ${item.title}`}
                                          >
                                            <HelpCircle className="w-3 h-3" />
                                          </div>
                                        )}
                                      </div>
                                      {item.badge !== undefined && item.badge > 0 && (
                                        <span className="ml-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] text-white font-black">
                                          {item.badge}
                                        </span>
                                      )}
                                    </button>
                                  ) : (
                                    <Link 
                                      to={targetUrl} 
                                      style={{ color: isActive ? '#2563eb' : undefined }}
                                      className={cn(
                                        "flex items-center gap-2 py-2 h-auto text-[11px] group",
                                        isActive ? "!text-[#2563eb] font-black" : "text-zinc-400 font-bold hover:text-white transition-colors"
                                      )} 
                                      onClick={(e) => handleNavClick(e, targetUrl, item.helpTopicId)}
                                    >
                                      <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
                                        {item.icon && <item.icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-blue-500" : (item.iconColor ? item.iconColor : "text-zinc-500"))} />}
                                        <span className={cn("truncate", item.iconColor && !isActive && item.iconColor)}>{item.title}</span>
                                        {item.helpTopicId && (
                                          <div
                                            role="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              window.dispatchEvent(new CustomEvent('open-help', { 
                                                detail: { 
                                                  topicId: item.helpTopicId,
                                                  role: (isAdmin || isDemoMode) ? 'admin' : (user?.role === 'employee' ? 'employee' : 'customer')
                                                } 
                                              }));
                                            }}
                                            className="ml-auto opacity-0 group-hover:opacity-100 hover:text-emerald-400 transition-all p-0.5 cursor-pointer"
                                            title={`Help for ${item.title}`}
                                          >
                                            <HelpCircle className="w-3 h-3" />
                                          </div>
                                        )}
                                      </div>
                                      {isActive && !item.helpTopicId && <div className="ml-auto w-1 h-1 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]" />}
                                      {item.badge !== undefined && item.badge > 0 && (
                                        <span className="ml-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] text-white font-black">
                                          {item.badge}
                                        </span>
                                      )}
                                    </Link>
                                  )}
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </>
          )}
        </SidebarMenu>
      </SidebarContent>
      <div className="p-2 border-t border-white/5 mt-auto bg-black/40">
        <div className="text-[9px] text-zinc-600 font-black text-center uppercase tracking-widest">
          {isDemoMode ? <span className="text-amber-500">Live Simulation</span> : (user ? <span>{user?.role} Portal</span> : "Offline")}
        </div>
      </div>
      <SidebarRail />
      <AboutDialog open={showAbout} onOpenChange={setShowAbout} />
    </Sidebar>
  );
}

