import {
  Home, ClipboardCheck, Search, FileText, Calculator, BookOpen, Users,
  Settings, Package, FileBarChart, DollarSign, LayoutDashboard, Globe,
  TicketPercent, GraduationCap, Shield, CheckSquare, CalendarDays,
  ChevronRight, ChevronsUp, ChevronsDown, UserPlus, Newspaper,
  MessageSquare, Clock, History, ShoppingCart
} from "lucide-react";
import { NavLink, Link, useLocation } from "react-router-dom";
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
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { getCurrentUser, finalizeSupabaseSession } from "@/lib/auth";
import supabase from "@/lib/supabase";
import logo from "@/assets/logo-primary.png";
import { getAdminAlerts } from "@/lib/adminAlerts";
import { getMenuGroups, TOP_ITEMS as CONFIGURED_TOP_ITEMS } from "@/components/menu-config";
import api from "@/lib/api";
import { isViewed } from "@/lib/viewTracker";
import localforage from "localforage"; // Using localforage for payroll check

export function AppSidebar() {
  const { open, setOpenMobile, setOpen } = useSidebar();
  const location = useLocation();
  const [user, setUser] = useState(getCurrentUser());
  const isAdmin = user?.role === 'admin';
  const isEmployee = user?.role === 'employee';
  const isCustomer = user?.role === 'customer';

  // 5-click Admin Unlock Logic REMOVED for safety
  // The system now strictly uses Supabase Auth via auth.ts
  const handleLogoClick = () => {
    // No-op or just simple navigation is handled by Link wrapper
  };

  const [tick, setTick] = useState(0);
  const getHiddenMenuItems = (): string[] => {
    try {
      const raw = localStorage.getItem('hiddenMenuItems');
      const arr = JSON.parse(raw || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  };
  const isHidden = (key: string) => getHiddenMenuItems().includes(key);

  useEffect(() => {
    function onStorage() { setTick((t) => t + 1); }
    window.addEventListener('storage', onStorage as any);
    const updateUser = () => setUser(getCurrentUser());
    window.addEventListener('auth-changed', updateUser as any);
    const bump = () => setTick(t => t + 1);
    window.addEventListener('admin_alerts_updated', bump as any);
    window.addEventListener('admin_alerts_updated', bump as any);
    window.addEventListener('pdf_archive_updated', bump as any);

    // Chat Alert Listener
    const handleChatAlert = () => {
      // You might want to persist this in localStorage or just keep ephemeral
      localStorage.setItem('has_unread_chat', 'true');
      setTick(t => t + 1);
    };
    window.addEventListener('new-chat-alert', handleChatAlert);

    // Force refresh role on mount to fix stale "customer" state
    const refreshRole = async () => {
      // 1. Standard Auth Check
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {

        // 2. AGGRESSIVE DB CHECK (Bypass Session)
        // We fetch the row directly to see the REAL role
        const { data: dbUser, error } = await supabase
          .from('app_users')
          .select('role, name')
          .eq('id', authData.user.id)
          .single();

        if (dbUser && !error) {
          console.log("AppSidebar Self-Heal: DB says", dbUser.role);
          // If DB role differs from current local role, FORCE UPDATE
          const currentUser = getCurrentUser();
          if (currentUser?.role !== dbUser.role) {
            console.warn(`Role Mismatch! Local: ${currentUser?.role}, DB: ${dbUser.role}. Forcing update.`);

            // Manually update the user object
            const fixedUser = { ...currentUser, role: dbUser.role, name: dbUser.name || currentUser.name };

            // Write to Auth System
            await finalizeSupabaseSession(authData.user);

            // Force local state update
            setUser(fixedUser as any);
            return; // Exit, we updated
          }
        } else {
          console.error("AppSidebar Self-Heal: Failed to read DB role", error);
        }

        // Standard Fallback
        await finalizeSupabaseSession(authData.user);
      }
    };
    refreshRole();

    return () => {
      window.removeEventListener('storage', onStorage as any);
      window.removeEventListener('auth-changed', updateUser as any);
      window.removeEventListener('admin_alerts_updated', bump as any);
      window.removeEventListener('pdf_archive_updated', bump as any);
    };
  }, []);

  // Auto-close mobile menu on route change
  useEffect(() => { setOpenMobile(false); }, [location.pathname, setOpenMobile]);

  // Counts
  const fileCount = useMemo(() => {
    try {
      const list = JSON.parse(localStorage.getItem('pdfArchive') || '[]');
      return list.filter((r: any) => !isViewed('file', String(r.id || r.fileName || r.timestamp || ''))).length;
    } catch { return 0; }
  }, [tick]);

  const inventoryCount = useMemo(() => {
    try {
      const c = Number(localStorage.getItem('inventory_low_count') || '0');
      return isNaN(c) ? 0 : c;
    } catch { return 0; }
  }, [tick]);

  const todoCount = useMemo(() => {
    try {
      const list = getAdminAlerts();
      return list.filter(a => a.type === 'todo_overdue' && !a.read).length;
    } catch { return 0; }
  }, [tick]);

  const [payrollDueCount, setPayrollDueCount] = useState(0);
  useEffect(() => {
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
  }, [tick]);

  const chatUnread = useMemo(() => {
    // Check ephemeral storage or global state
    return localStorage.getItem('has_unread_chat') === 'true';
  }, [tick]);

  const handleNavClick = () => setOpenMobile(false);

  // Group State Persistence
  // Default to Dashboards open if empty? Or empty.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('sidebar_groups');
      if (saved) return JSON.parse(saved);
    } catch { }
    return { 'Dashboards': true }; // Default
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
        return item.url === currentFull ||
          (!item.url.includes('?') && location.pathname === item.url);
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

  // Menu Definition
  type MenuItem = { title: string; url: string; icon?: any; role?: string; key?: string; badge?: number; badgeColor?: 'red' | 'blue'; highlight?: 'red' | 'green' };

  // Standalone Top Items (Use shared config)
  const TOP_ITEMS = [
    ...CONFIGURED_TOP_ITEMS,
    // Inject Personal Notes here if not in shared config yet, or add to shared config.
    // User asked for it "below Employee Dashboard" which is usually in TOP_ITEMS or a group. 
    // Usually Employee Dashboard is a top item.
    { title: 'Personal Notes', url: '/notes', icon: BookOpen, role: 'employee', highlight: 'yellow' as const, key: 'personal-notes' },
    { title: 'Reports', url: '/reports', icon: FileBarChart, role: 'admin', key: 'reports' }
  ];

  /* ---------------- CUSTOMER ITEMS ---------------- */
  const CUSTOMER_ITEMS: MenuItem[] = [
    { title: "Customer Dashboard", url: "/customer-dashboard", icon: LayoutDashboard },
    { title: "Contact Support", url: "/contact-support", icon: MessageSquare },
    { title: "Active Jobs", url: "/active-jobs", icon: Clock },
    { title: "Job History", url: "/job-history", icon: History },
    { title: "Payments & Cart", url: "/payments-cart", icon: ShoppingCart },
    { title: "My Invoices", url: "/my-invoices", icon: FileText },
    { title: "Personal Notes", url: "/notes", icon: BookOpen },
    { title: "User Settings", url: "/user-settings", icon: Settings },
  ];

  // --- MENU CONFIG ---
  // Using shared config to ensure Sidebar and Section Landing pages match
  const MENU_GROUPS = useMemo(() => getMenuGroups({
    todoCount,
    payrollDueCount,
    inventoryCount,
    fileCount
  }), [todoCount, payrollDueCount, inventoryCount, fileCount, tick]);

  // Helper: Are ANY groups open?
  const isAnyOpen = MENU_GROUPS.some(g => openGroups[g.title]);

  const toggleAllGroups = () => {
    if (isAnyOpen) {
      // Collapse all
      const next = MENU_GROUPS.reduce((acc, g) => ({ ...acc, [g.title]: false }), {});
      setOpenGroups(next);
      localStorage.setItem('sidebar_groups', JSON.stringify(next));
    } else {
      // Expand all
      const next = MENU_GROUPS.reduce((acc, g) => ({ ...acc, [g.title]: true }), {});
      setOpenGroups(next);
      localStorage.setItem('sidebar_groups', JSON.stringify(next));
    }
  };

  const collapsibleMode = "offcanvas";
  const sidebarClass = "border-r border-border";

  return (
    <Sidebar className={sidebarClass} collapsible={collapsibleMode as any}>
      <div className="p-4 border-b border-border pt-20">
        {open && (
          <div className="flex items-center w-full">
            <div className="flex items-center gap-3 animate-fade-in flex-1" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
              <img src={logo} alt="Prime Auto Detail" className="h-10 w-auto" />
              <div>
                <h2 className="font-bold text-foreground">Prime Auto</h2>
                <p className="text-xs text-muted-foreground">Detail</p>
              </div>
            </div>

            {/* Toggle Button in Header */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleAllGroups}
              className="h-8 w-8 text-muted-foreground hover:text-white ml-2"
              title={isAnyOpen ? "Collapse All" : "Expand All"}
            >
              {isAnyOpen ? <ChevronsUp className="h-4 w-4" /> : <ChevronsDown className="h-4 w-4" />}
            </Button>
          </div>
        )}
        {!open && (
          <div className="flex flex-col items-center gap-2">
            <img src={logo} alt="Prime Auto Detail" className="w-10 h-auto mx-auto" onClick={handleLogoClick} style={{ cursor: 'pointer' }} />
          </div>
        )}
      </div>

      <SidebarContent>
        <SidebarMenu>
          {isCustomer && (
            <>
              {CUSTOMER_ITEMS.map((item) => {
                const isActive = location.pathname === item.url || (item.url.includes('#') && location.pathname + location.hash === item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild onClick={handleNavClick}>
                      {/* Use standard Link. Hash navigation might require simple anchor if router link doesn't scroll.
                           However, Link is usually preferred for client-side routing.
                           We might need a small click handler to force scroll if hash is present.
                       */}
                      <Link to={item.url}
                        className={isActive ? 'font-semibold text-blue-500' : 'text-zinc-400 hover:text-white'}
                        onClick={() => {
                          if (item.url.includes('#')) {
                            const id = item.url.split('#')[1];
                            setTimeout(() => {
                              const el = document.getElementById(id);
                              if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }, 100);
                          }
                        }}
                      >
                        {item.icon && <item.icon className="h-4 w-4" />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </>
          )}

          {(isAdmin || isEmployee) && (
            <>
              {/* Top Items (Admin Dashboard) */}
              {TOP_ITEMS.map((item) => {
                if (item.role === 'admin' && !isAdmin) return null;
                // Strict active check to prevent overlap
                const isActive = location.pathname === item.url || (item.url !== '/' && location.pathname.startsWith(item.url + '/'));
                const isChatAlert = item.url === '/team-chat' && chatUnread;

                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton asChild tooltip={item.title} onClick={handleNavClick} className="bg-transparent hover:bg-transparent data-[active=true]:bg-transparent ring-0 outline-none">
                      <Link to={item.url} className={isChatAlert ? 'font-bold text-red-500 animate-pulse flex items-center gap-2 px-2 py-1.5 rounded-md w-full transition-colors' : (isActive ? 'font-semibold !text-blue-500 bg-transparent flex items-center gap-2 px-2 py-1.5 rounded-md w-full transition-colors' : 'text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center gap-2 px-2 py-1.5 rounded-md w-full transition-colors')}>
                        <item.icon className={`h-4 w-4 mr-2 ${isChatAlert ? 'text-red-500' : ''}`} />
                        <span>{item.title}</span>
                        {isChatAlert && <span className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-ping" />}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {MENU_GROUPS.map((group) => {
                const validItems = group.items.filter(item => {
                  if (item.role === 'admin' && !isAdmin) return false;
                  if (item.role === 'employee' && !isEmployee && !isAdmin) return false;
                  if (item.key && isHidden(item.key)) return false;
                  return true;
                });
                if (validItems.length === 0) return null;

                // We use CONTROLLED open state
                const isOpen = !!openGroups[group.title];

                // Calculate group badge count for closed state
                const groupBadgeCount = validItems.reduce((acc, item) => acc + (item.badge || 0), 0);

                return (
                  <Collapsible
                    key={group.title}
                    open={isOpen}
                    onOpenChange={(val) => toggleGroup(group.title, val)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      {/* Header: Link + Trigger */}
                      <div className="flex items-center w-full group-data-[state=open]/collapsible:mb-1">
                        <SidebarMenuButton asChild tooltip={group.title} className="flex-1">
                          <Link
                            to={`/section/${group.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                            className={`flex items-center gap-2 ${validItems.some(item => location.pathname === item.url || (item.url !== '/' && location.pathname.startsWith(item.url + '/'))) ? 'text-blue-500 font-semibold' : 'text-zinc-400'}`}
                          >
                            <group.icon className="h-4 w-4" />
                            <span>{group.title}</span>
                            {/* Batch count on parent */}
                            {!isOpen && groupBadgeCount > 0 && (
                              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs text-white">
                                {groupBadgeCount}
                              </span>
                            )}
                          </Link>
                        </SidebarMenuButton>
                        <CollapsibleTrigger asChild>
                          <button className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-zinc-800 text-zinc-400 transition-colors">
                            <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </button>
                        </CollapsibleTrigger>
                      </div>

                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {validItems.map((item) => {
                            const currentFull = location.pathname + location.search;
                            // Strict match for exact links, or partial match if needed (usually exact is better for sidebar)
                            const isActive = item.url === location.pathname ||
                              item.url === currentFull ||
                              (item.url !== '/' && location.pathname.startsWith(item.url + '/'));

                            const isChatAlert = item.url === '/team-chat' && chatUnread;

                            let className = "flex items-center gap-2 px-2 py-1.5 rounded-md w-full transition-colors bg-transparent";

                            // Styling logic:
                            // Active: Blue text, font-semibold (User requested: "text only turning blue", no background)
                            // Inactive: Zinc text, hover white + dark bg
                            if (isActive) {
                              className += " text-blue-500 font-semibold";
                            } else {
                              className += " text-zinc-400 hover:text-white hover:bg-zinc-800";
                              if (item.highlight === 'red') className = className.replace('text-zinc-400', 'text-red-600 hover:text-red-500');
                              else if (item.highlight === 'green') className = className.replace('text-zinc-400', 'text-green-600 hover:text-green-500');
                            }

                            return (
                              <SidebarMenuSubItem key={item.title}>
                                <SidebarMenuSubButton asChild isActive={isActive} onClick={handleNavClick} className="ring-0 outline-none">
                                  <Link
                                    to={item.url}
                                    className={className}
                                  >
                                    {item.icon && <item.icon className={`h-4 w-4 mr-2 ${isChatAlert ? 'text-red-500' : ''}`} />}
                                    <span>{item.title}</span>
                                    {isChatAlert && <span className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-ping" />}
                                    {item.badge !== undefined && !isChatAlert && (
                                      <span className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full ${item.badgeColor === 'red' ? 'bg-red-600' : 'bg-blue-600'} px-1 text-xs text-white`}>
                                        {item.badge}
                                      </span>
                                    )}
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
      {/* DEBUG FOOTER */}
      <div className="p-2 border-t border-border mt-auto">
        <div className="text-[10px] text-zinc-500 font-mono text-center">
          {user ? (
            <>
              <span className={user.role === 'admin' ? 'text-red-500' : user.role === 'employee' ? 'text-blue-500' : 'text-emerald-500'}>
                {user.role?.toUpperCase() || 'UNKNOWN'}
              </span>
              <span className="block truncate px-1" title={user.email}>{user.email}</span>
            </>
          ) : "Logged Out"}
        </div>
      </div>
    </Sidebar >
  );
}
