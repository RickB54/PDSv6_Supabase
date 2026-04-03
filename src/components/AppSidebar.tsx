import {
  Home, ClipboardCheck, Search, Calculator, BookOpen, Users,
  Settings, Package, FileBarChart, DollarSign, LayoutDashboard, Globe,
  TicketPercent, GraduationCap, Shield, CalendarDays,
  ChevronRight, ChevronsUp, ChevronsDown, UserPlus, Newspaper,
  MessageSquare, Clock, History, ShoppingCart, Video, HelpCircle
} from "lucide-react";
import { FileText, CheckSquare } from "lucide-react";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useMemo } from "react";
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

export function AppSidebar({ user: userProp }: { user?: any }) {

  const { open, openMobile, setOpenMobile, setOpen } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(userProp || getCurrentUser());
  const { items: allBookings } = useBookingsStore();
  const { isDemoMode, isAdminPreview, setAdminPreview, canAccess, visibleSections } = useDemoMode();

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

    return url;
  };

  // Keep local user in sync with prop
  useEffect(() => {
    if (userProp) {
      setUser(userProp);
    }
  }, [userProp]);

  const isAdmin = user?.role === 'admin';
  const isEmployee = user?.role === 'employee';
  const isCustomer = user?.role === 'customer';

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
        if (currentUser?.role !== dbUser.role) {
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

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = Math.abs(touchEndY - touchStartY);

      if (
        touchStartX >= 20 && touchStartX <= 80 && 
        deltaX > 60 && 
        deltaY < 50 && 
        !openMobile // Only if currently closed
      ) {
        setOpenMobile(true);
      }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
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

  const handleNavClick = () => {
    setOpenMobile(false);
  };

  // Group State Persistence
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('sidebar_groups');
      if (saved) return JSON.parse(saved);
    } catch { }
    return isDemoMode 
      ? { 'Customer Intake': true, 'Operations': true, 'Finance & Sales': true, 'Reports': true, 'Chemicals': true, 'Inventory & Assets': true, 'Prime Learning Center': true, 'Staff Management': true, 'Marketing & Retention': true, 'Settings': true }
      : { 'Customer Intake': true, 'Operations': true }; // Default for demo look
  });

  const toggleGroup = (title: string, isOpen: boolean) => {
    const next = { ...openGroups, [title]: isOpen };
    setOpenGroups(next);
    localStorage.setItem('sidebar_groups', JSON.stringify(next));
  };

  // Auto-expand groups based on active route
  useEffect(() => {
    const updatedGroups = { ...openGroups };
    let changed = false;

    MENU_GROUPS.forEach(group => {
      const match = group.items.find(item => {
        const currentFull = location.pathname + location.search;
        const targetUrl = getUrl(item.url);
        return targetUrl === currentFull ||
          (!targetUrl.includes('?') && location.pathname === targetUrl);
      });

      if (match && !updatedGroups[group.title]) {
        updatedGroups[group.title] = true;
        changed = true;
      }
    });

    if (changed) {
      setOpenGroups(updatedGroups);
      localStorage.setItem('sidebar_groups', JSON.stringify(updatedGroups));
    }
  }, [location.pathname, location.search]);

  // Standalone Top Items
  const TOP_ITEMS = [
    ...CONFIGURED_TOP_ITEMS,
    { title: 'Personal Notes', url: '/notes', icon: BookOpen, role: 'employee', highlight: 'yellow' as const, key: 'personal-notes' },
    { title: 'Analytics', url: '/bookings-analytics', icon: FileBarChart, key: 'bookings-analytics' },
    { title: 'Vehicle Gallery', url: '/vehicle-gallery', icon: Video, role: 'employee', key: 'vehicle-gallery' },
    { title: 'File Manager', url: '/file-manager', icon: FileText, role: 'admin', key: 'file-manager', badge: fileCount > 0 ? fileCount : undefined }
  ].filter(item => {
    if (isDemoMode && item.key && !canAccess(item.key)) return false;
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
  ];

  const realUser = useMemo(() => getCurrentUser(), []);
  const isRealAdminOrEmployee = realUser?.role === "admin" || realUser?.role === "employee";

  const MENU_GROUPS = useMemo(() => {
    const tentativeBookings = allBookings.filter(b => b.status === 'tentative');
    const bookingAlerts = getAdminAlerts().filter(a => a.type === 'booking_created' && !a.read);

    let badgeCount = isDemoMode ? 3 : (bookingAlerts.length > 0 ? bookingAlerts.length : tentativeBookings.length);
    let badgeColor: 'red' | 'blue' = (isDemoMode || bookingAlerts.length > 0) ? 'red' : 'blue';

    return getMenuGroups({
      todoCount,
      payrollDueCount,
      inventoryCount,
      fileCount,
      tentativeBookingsCount: badgeCount,
      bookingsBadgeColor: badgeColor
    }).filter(group => {
      group.items = group.items.filter(item => {
        if (isDemoMode && item.key && !canAccess(item.key)) return false;
        if (item.role === 'admin' && !isAdmin && !isDemoMode) return false;
        
        return true;
      });
      return group.items.length > 0;
    });
  }, [todoCount, payrollDueCount, inventoryCount, fileCount, allBookings.length, tick, isDemoMode, visibleSections]);

  const isAnyOpen = MENU_GROUPS.some(g => openGroups[g.title]);

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

  const isViewingAsCustomer = location.pathname.startsWith('/customer-dashboard') || location.pathname.startsWith('/portal') || location.pathname.startsWith('/active-jobs');

  return (
    <Sidebar 
      className="border-r border-border" 
      collapsible="icon"
      style={{ top: isDemoMode ? '40px' : '0' }}
    >
      <div className="p-4 border-b border-border pt-24">
        {open && (
          <div className="flex items-center w-full">
            <div className="flex items-center gap-3 animate-fade-in flex-1 cursor-pointer" onClick={handleLogoClick}>
              <img src={logo} alt="Prime Auto Detail" className="h-12 w-auto" />
              <div>
                <h2 className="font-bold text-foreground">Prime Auto</h2>
                <p className="text-xs text-muted-foreground">Detail</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={toggleAllGroups} className="h-8 w-8 text-muted-foreground hover:text-white ml-2">
              {isAnyOpen ? <ChevronsUp className="h-4 w-4" /> : <ChevronsDown className="h-4 w-4" />}
            </Button>
          </div>
        )}
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

        <SidebarMenu>
          {(isCustomer || (isAdmin && isViewingAsCustomer)) && (
            <>
              {CUSTOMER_ITEMS.map((item) => {
                const isActive = location.pathname === item.url;
                const className = isActive ? 'font-semibold !text-blue-500 bg-transparent flex items-center gap-2 px-2 py-1.5 rounded-md w-full' : 'text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center gap-2 px-2 py-1.5 rounded-md w-full';
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title} className="bg-transparent hover:bg-transparent">
                      <Link to={item.url} className={className} onClick={handleNavClick}>
                        {item.icon && <item.icon className="h-4 w-4" />}
                        {open && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </>
          )}

          {(isAdmin || isEmployee) && !isViewingAsCustomer && (
            <>
              {TOP_ITEMS.map((item) => {
                if (item.role === 'admin' && !isAdmin && !isDemoMode) return null;
                const targetUrl = getUrl(item.url);
                const isActive = location.pathname === targetUrl;
                const isChatAlert = item.url === '/team-chat' && chatUnread;

                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton asChild tooltip={item.title} onClick={handleNavClick}>
                      <Link to={targetUrl} className={isChatAlert ? 'font-bold text-red-500 animate-pulse flex items-center gap-2 px-2 py-1.5 rounded-md w-full' : (isActive ? 'font-semibold !text-blue-500 bg-transparent flex items-center gap-2 px-2 py-1.5 rounded-md w-full' : 'text-zinc-100 font-bold hover:text-white hover:bg-zinc-800 flex items-center gap-2 px-2 py-1.5 rounded-md w-full')}>
                        <item.icon className={`h-4 w-4 ${open ? 'mr-2' : ''} ${isChatAlert ? 'text-red-500' : ''}`} />
                        {open && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {MENU_GROUPS.map((group) => {
                const isOpen = !!openGroups[group.title];
                const groupBadgeCount = group.items.reduce((acc, item) => acc + (item.badge || 0), 0);

                return (
                  <Collapsible key={group.title} open={isOpen} onOpenChange={(val) => toggleGroup(group.title, val)} className="group/collapsible">
                    <SidebarMenuItem>
                      <div className="flex items-center w-full group-data-[state=open]/collapsible:mb-1">
                        <SidebarMenuButton asChild tooltip={group.title} className="flex-1">
                          <Link to={`/section/${group.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className={`flex items-center gap-2 ${group.items.some(item => location.pathname === getUrl(item.url)) ? 'text-blue-500 font-bold' : 'text-zinc-300 font-bold hover:text-white'}`}>
                            <group.icon className="h-4 w-4" />
                            {open && <span>{group.title}</span>}
                            {open && !isOpen && groupBadgeCount > 0 && <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs text-white">{groupBadgeCount}</span>}
                          </Link>
                        </SidebarMenuButton>
                        {open && (
                          <CollapsibleTrigger asChild>
                            <button className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-zinc-800 text-zinc-400">
                              <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                            </button>
                          </CollapsibleTrigger>
                        )}
                      </div>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {group.items.map((item) => {
                            const targetUrl = getUrl(item.url);
                            const isActive = location.pathname === targetUrl;
                            const isChatAlert = item.url === '/team-chat' && chatUnread;
                            let className = "flex items-center gap-2 px-2 py-1.5 rounded-md w-full transition-colors bg-transparent " + (isActive ? "text-blue-500 font-semibold" : "text-zinc-100 font-bold hover:text-white hover:bg-zinc-800");

                            return (
                              <SidebarMenuSubItem key={`${item.title}-${item.url}`}>
                                <SidebarMenuSubButton asChild isActive={isActive}>
                                    <Link to={targetUrl} onClick={handleNavClick} className={className}>
                                      {item.icon && <item.icon className="h-4 w-4 mr-2" />}
                                      {open && <span className="flex-1">{item.title}</span>}
                                      {open && item.helpTopicId && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            window.dispatchEvent(new CustomEvent('open-help', { 
                                              detail: { 
                                                topicId: item.helpTopicId,
                                                role: isAdmin ? 'admin' : (isEmployee ? 'employee' : 'customer')
                                              } 
                                            }));
                                          }}
                                          className="text-muted-foreground hover:text-white transition-colors p-1"
                                        >
                                          <HelpCircle className="h-3 w-3" />
                                        </button>
                                      )}
                                      {open && item.badge !== undefined && <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-xs text-white">{item.badge}</span>}
                                    </Link>
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
      <div className="p-2 border-t border-border mt-auto">
        <div className="text-[10px] text-zinc-500 font-mono text-center">
          {isDemoMode ? <span className="text-amber-500 font-black">DEMO VISITOR</span> : (user ? <span className={user?.role === 'admin' ? 'text-red-500' : 'text-blue-500'}>{user?.role?.toUpperCase()}</span> : "Logged Out")}
        </div>
      </div>
      <SidebarRail />
      <AboutDialog open={showAbout} onOpenChange={setShowAbout} />
    </Sidebar>
  );
}

