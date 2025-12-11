import {
  Home, ClipboardCheck, Search, FileText, Calculator, BookOpen, Users,
  Settings, Package, FileBarChart, DollarSign, LayoutDashboard, Globe,
  TicketPercent, GraduationCap, Shield, CheckSquare, CalendarDays,
  ChevronRight, ChevronsUp, ChevronsDown, UserPlus
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
import { getCurrentUser } from "@/lib/auth";
import logo from "@/assets/logo-3inch.png";
import { getAdminAlerts } from "@/lib/adminAlerts";
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

  // 5-click Admin Unlock Logic
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoClick = () => {
    clickCountRef.current += 1;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => { clickCountRef.current = 0; }, 1000);
    if (clickCountRef.current >= 5) {
      localStorage.setItem('adminMode', 'true');
      window.location.reload();
    }
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
    window.addEventListener('pdf_archive_updated', bump as any);
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

  // Menu Definition
  type MenuItem = { title: string; url: string; icon?: any; role?: string; key?: string; badge?: number; highlight?: 'red' | 'green' };

  // Standalone Top Items (Admin Dashboard)
  const TOP_ITEMS: MenuItem[] = [
    { title: "Admin Dashboard", url: "/admin-dashboard", role: "admin", key: "admin-dashboard", icon: LayoutDashboard },
  ];

  const MENU_GROUPS: { title: string; icon: any; items: MenuItem[] }[] = [
    {
      title: "Website Admin", icon: Shield,
      items: [
        { title: "Website Administration", url: "/website-admin", role: "admin", icon: Shield, highlight: "red" },
        { title: "Website", url: "/", role: "all", icon: Globe },
      ]
    },
    {
      title: "Customer Intake", icon: UserPlus,
      items: [
        { title: "Package Comparison", url: "/package-selection", role: "admin", icon: Package },
        { title: "Vehicle Classification", url: "/vehicle-classification", role: "admin", icon: FileText },
        { title: "Client Evaluation", url: "/client-evaluation", role: "admin", icon: ClipboardCheck },
        { title: "Addon Upsell Script", url: "/addon-upsell-script", role: "admin", icon: FileText },
      ]
    },
    {
      title: "Operations", icon: ClipboardCheck,
      items: [
        { title: "Bookings", url: "/bookings", key: "bookings", icon: CalendarDays },
        { title: "Service Checklist", url: "/service-checklist", key: "service-checklist", icon: ClipboardCheck },
        { title: "Tasks", url: "/tasks", badge: todoCount > 0 ? todoCount : undefined, icon: CheckSquare },
        { title: "Customer Profiles", url: "/search-customer", key: "search-customer", icon: Users },
        { title: "Prospects", url: "/prospects", key: "prospects", icon: Users }
      ]
    },
    {
      title: "Finance & Sales", icon: DollarSign,
      items: [
        { title: "Estimates", url: "/estimates", role: "admin", highlight: "green", icon: FileText },
        { title: "Invoicing", url: "/invoicing", role: "admin", key: "invoicing", icon: FileText },
        { title: "Accounting", url: "/accounting", role: "admin", key: "accounting", icon: Calculator },
        { title: "Payroll", url: "/payroll", role: "admin", key: "payroll", badge: payrollDueCount > 0 ? payrollDueCount : undefined, icon: DollarSign },
        { title: "Company Budget", url: "/company-budget", role: "admin", key: "company-budget", icon: DollarSign },
        { title: "Discount Coupons", url: "/discount-coupons", role: "admin", key: "discount-coupons", icon: TicketPercent },
        { title: "Package Pricing", url: "/package-pricing", role: "admin", key: "package-pricing", icon: DollarSign },
      ]
    },
    {
      title: "Inventory & Assets", icon: Package,
      items: [
        { title: "Inventory Control", url: "/inventory-control", role: "admin", key: "inventory-control", badge: inventoryCount > 0 ? inventoryCount : undefined, icon: Package },
        { title: "File Manager", url: "/file-manager", key: "file-manager", badge: fileCount > 0 ? fileCount : undefined, icon: FileText },
        { title: "Reports", url: "/reports", role: "admin", key: "reports", icon: FileBarChart }
      ]
    },
    {
      title: "Staff & Training", icon: Users,
      items: [
        { title: "Users & Roles", url: "/admin/users", role: "admin", icon: Users },
        { title: "Employee Dashboard", url: "/employee-dashboard", key: "employee-dashboard", icon: LayoutDashboard },
        { title: "Company Employees", url: "/company-employees", role: "admin", key: "company-employees", icon: Users },
        { title: "Quick Detailing Manual", url: "/training-manual", key: "training-manual", icon: BookOpen },
        { title: "App Manual", url: "/app-manual", key: "app-manual", icon: BookOpen },
      ]
    },
    {
      title: "System", icon: Settings,
      items: [
        { title: "Settings", url: "/settings", key: "settings", icon: Settings }
      ]
    }
  ];

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
      <div className="p-4 border-b border-border">
        {open && (
          <div className="flex items-center w-full">
            <div className="flex items-center gap-3 animate-fade-in flex-1" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
              <img src={logo} alt="Prime Detail Solutions" className="w-10 h-10" />
              <div>
                <h2 className="font-bold text-foreground">Prime Detail</h2>
                <p className="text-xs text-muted-foreground">Solutions</p>
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
            <img src={logo} alt="Prime Detail Solutions" className="w-8 h-8 mx-auto" onClick={handleLogoClick} style={{ cursor: 'pointer' }} />
          </div>
        )}
      </div>

      <SidebarContent>
        <SidebarMenu>
          {isCustomer && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild onClick={handleNavClick}>
                <Link to="/customer-dashboard">
                  <Home className="h-4 w-4" />
                  <span>My Account</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {(isAdmin || isEmployee) && (
            <>
              {/* Top Items (Admin Dashboard) */}
              {TOP_ITEMS.map((item) => {
                if (item.role === 'admin' && !isAdmin) return null;
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton asChild tooltip={item.title} onClick={handleNavClick}>
                      <NavLink to={item.url} className={({ isActive }) => (isActive ? 'font-semibold text-blue-400' : 'hover:text-white')}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
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

                return (
                  <Collapsible
                    key={group.title}
                    open={isOpen}
                    onOpenChange={(val) => toggleGroup(group.title, val)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={group.title}>
                          <group.icon className="h-4 w-4" />
                          <span>{group.title}</span>
                          <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {validItems.map((item) => (
                            <SidebarMenuSubItem key={item.url}>
                              <SidebarMenuSubButton asChild onClick={handleNavClick}>
                                <NavLink
                                  to={item.url}
                                  className={({ isActive }) => {
                                    let base = "flex items-center gap-2";
                                    if (item.highlight === 'red') base += isActive ? ' text-red-500 font-semibold' : ' text-red-600 hover:text-red-700';
                                    else if (item.highlight === 'green') base += isActive ? ' text-green-500 font-semibold' : ' text-green-600 hover:text-green-700';
                                    else base += isActive ? ' text-blue-400' : '';
                                    return base;
                                  }}
                                >
                                  {item.icon && <item.icon className="h-4 w-4 mr-2" />}
                                  <span>{item.title}</span>
                                  {item.badge !== undefined && (
                                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs text-white">
                                      {item.badge}
                                    </span>
                                  )}
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
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
    </Sidebar>
  );
}
