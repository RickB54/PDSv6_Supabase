import { 
  Home, 
  ClipboardCheck, 
  Search, 
  FileText, 
  Calculator, 
  BookOpen, 
  Users, 
  Settings,
  Package,
  FileBarChart,
  DollarSign,
  LayoutDashboard,
  Globe,
  TicketPercent,
  GraduationCap,
  Shield,
  CheckSquare
} from "lucide-react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  useSidebar,
} from "@/components/ui/sidebar";
import { getCurrentUser } from "@/lib/auth";
import logo from "@/assets/logo-3inch.png";
import { getAdminAlerts } from "@/lib/adminAlerts";
import api from "@/lib/api";
import { isViewed } from "@/lib/viewTracker";

export function AppSidebar() {
  const { open, setOpenMobile, setOpen } = useSidebar();
  const location = useLocation();
  const [user, setUser] = useState(getCurrentUser());
  const isAdmin = user?.role === 'admin';
  const isEmployee = user?.role === 'employee';
  const isCustomer = user?.role === 'customer';

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
    function onStorage() {
      // Any storage-driven change should cause sidebar counters to recompute.
      setTick((t) => t + 1);
    }
    window.addEventListener('storage', onStorage as any);
    const updateUser = () => setUser(getCurrentUser());
    window.addEventListener('auth-changed', updateUser as any);
    // Listen for proactive update events that fire in the same tab
    const bump = () => setTick(t => t + 1);
    window.addEventListener('admin_alerts_updated', bump as any);
    window.addEventListener('pdf_archive_updated', bump as any);
    return () => {
      window.removeEventListener('storage', onStorage as any);
      window.removeEventListener('auth-changed', updateUser as any);
    };
  }, []);

  // Auto-close the slide-out menu on any route change for more page space
  useEffect(() => {
    setOpenMobile(false);
  }, [location.pathname, setOpenMobile]);
  // Removed Bookings counters and store refresh logic
  // Red badge: number of unviewed PDFs (any type), reflects yellow bells in File Manager.
  const fileCount = (() => {
    try {
      const list = JSON.parse(localStorage.getItem('pdfArchive') || '[]');
      return list.filter((r: any) => !isViewed('file', String(r.id || r.fileName || r.timestamp || ''))).length;
    } catch { return 0; }
  })();
  const inventoryCount = (() => {
    try {
      const c = Number(localStorage.getItem('inventory_low_count') || '0');
      return isNaN(c) ? 0 : c;
    } catch { return 0; }
  })();
  const todoCount = (() => {
    try {
      const list = getAdminAlerts();
      return list.filter(a => a.type === 'todo_overdue' && !a.read).length;
    } catch { return 0; }
  })();
  const [payrollDueCount, setPayrollDueCount] = useState(0);
  useEffect(() => {
    (async () => {
      try {
        const res = await api('/api/payroll/due-count', { method: 'GET' });
        const count = Number(res?.count || 0);
        setPayrollDueCount(count);
      } catch { setPayrollDueCount(0); }
    })();
  }, [tick]);

  const handleNavClick = () => {
    setOpenMobile(false);
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 ${isActive ? 'text-blue-400' : ''}`;

  // Provider now controls open state; remove local role-based overrides
  // This prevents race conditions and ensures persistent visibility.

  // Make admin sidebar fixed (non-offcanvas) so it stays visible on scroll.
  // Keep employee as-is unless requested; customers remain offcanvas.
  // Make admin behave like employee: offcanvas with reserved layout gap.
  const collapsibleMode = "offcanvas";
  const sidebarClass = "border-r border-border";
  return (
    <Sidebar className={sidebarClass} collapsible={collapsibleMode as any}>
      <div className="p-4 border-b border-border">
        {open && (
          <div className="flex items-center gap-3 animate-fade-in">
            <img src={logo} alt="Prime Detail Solutions" className="w-10 h-10" />
            <div>
              <h2 className="font-bold text-foreground">Prime Detail</h2>
              <p className="text-xs text-muted-foreground">Solutions</p>
            </div>
          </div>
        )}
        {!open && (
          <img src={logo} alt="Prime Detail Solutions" className="w-8 h-8 mx-auto" />
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
              {isAdmin && !isHidden('admin-dashboard') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild onClick={handleNavClick}>
                    <NavLink to="/admin-dashboard" className={linkClass}>
                      <LayoutDashboard className="h-4 w-4" />
                      <span>Admin Dashboard</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild onClick={handleNavClick}>
                    <NavLink to="/admin/users" className={linkClass}>
                      <Users className="h-4 w-4" />
                      <span>Users & Roles</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {/* Cheat Sheet moved to Admin Dashboard; removing from slide-out menu */}
              {/* Removed redundant admin-only Todo under Admin Dashboard */}
              {/* Always-visible Website Administration entry (cannot be hidden) */}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild onClick={handleNavClick}>
                    <NavLink
                      to="/website-admin"
                      className={({ isActive }: { isActive: boolean }) =>
                        `flex items-center gap-2 ${isActive ? 'text-red-500 font-semibold' : 'text-red-600'} hover:text-red-700`}
                    >
                      <Shield className="h-4 w-4" />
                      <span>Website Administration</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {/* Removed Home (redundant) */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild onClick={handleNavClick}>
                  <Link to="/">
                    <Globe className="h-4 w-4" />
                    <span>Website</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {!isHidden('service-checklist') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild onClick={handleNavClick}>
                    <NavLink to="/service-checklist" className={linkClass}>
                      <ClipboardCheck className="h-4 w-4" />
                      <span>Service Checklist</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Todo module */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild onClick={handleNavClick}>
                  <NavLink to="/tasks" className={linkClass}>
                    <CheckSquare className="h-4 w-4" />
                    <span>Todo</span>
                  </NavLink>
                </SidebarMenuButton>
                {todoCount > 0 && (
                  <SidebarMenuBadge className="bg-red-600 text-white">{todoCount}</SidebarMenuBadge>
                )}
              </SidebarMenuItem>

              {!isHidden('search-customer') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild onClick={handleNavClick}>
                    <NavLink to="/search-customer" className={linkClass}>
                      <Users className="h-4 w-4" />
                      <span>Customer Profiles</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {isAdmin && !isHidden('package-pricing') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild onClick={handleNavClick}>
                    <NavLink to="/package-pricing" className={linkClass}>
                      <DollarSign className="h-4 w-4" />
                      <span>Package Pricing</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {!isHidden('training-manual') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild onClick={handleNavClick}>
                    <NavLink to="/training-manual" className={linkClass}>
                      <BookOpen className="h-4 w-4" />
                      <span>Quick Detailing Manual</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {!isHidden('employee-dashboard') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild onClick={handleNavClick}>
                    <NavLink to="/employee-dashboard" className={linkClass}>
                      <LayoutDashboard className="h-4 w-4" />
                      <span>Employee Dashboard</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {isAdmin && !isHidden('discount-coupons') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild onClick={handleNavClick}>
                    <NavLink to="/discount-coupons" className={linkClass}>
                      <TicketPercent className="h-4 w-4" />
                      <span>Discount Coupons</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {/* Bookings menu removed */}
              {isEmployee && !isHidden('employee-training') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild onClick={handleNavClick}>
                    <NavLink to="/employee-training" className={linkClass}>
                      <GraduationCap className="h-4 w-4" />
                      <span>Employee Training Course</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </>
          )}

          {isAdmin && (
            <>
              

              {!isHidden('invoicing') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild onClick={handleNavClick}>
                    <NavLink to="/invoicing" className={linkClass}>
                      <FileText className="h-4 w-4" />
                      <span>Invoicing</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {!isHidden('accounting') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild onClick={handleNavClick}>
                    <NavLink to="/accounting" className={linkClass}>
                      <Calculator className="h-4 w-4" />
                      <span>Accounting</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {!isHidden('payroll') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild onClick={handleNavClick}>
                    <NavLink to="/payroll" className={linkClass}>
                      <DollarSign className="h-4 w-4" />
                      <span>Payroll</span>
                    </NavLink>
                  </SidebarMenuButton>
                  {payrollDueCount > 0 && (
                    <SidebarMenuBadge className="bg-red-600 text-white">{payrollDueCount}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              )}

              {!isHidden('inventory-control') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild onClick={handleNavClick}>
                    <NavLink to="/inventory-control" className={linkClass}>
                      <Package className="h-4 w-4" />
                      <span>Inventory Control</span>
                    </NavLink>
                  </SidebarMenuButton>
                  {inventoryCount > 0 && (
                    <SidebarMenuBadge className="bg-red-600 text-white">{inventoryCount}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              )}

              {!isHidden('company-employees') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild onClick={handleNavClick}>
                    <NavLink to="/company-employees" className={linkClass}>
                      <Users className="h-4 w-4" />
                      <span>Company Employees</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {!isHidden('file-manager') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild onClick={handleNavClick}>
                    <NavLink to="/file-manager" className={linkClass}>
                      <FileText className="h-4 w-4" />
                      <span>File Manager</span>
                    </NavLink>
                  </SidebarMenuButton>
                  {fileCount > 0 && (
                    <SidebarMenuBadge className="bg-red-600 text-white">{fileCount}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              )}

              {/* Jobs Completed removed from slide-out menu per request (still available on Admin Dashboard) */}

              {!isHidden('reports') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild onClick={handleNavClick}>
                    <NavLink to="/reports" className={linkClass}>
                      <FileBarChart className="h-4 w-4" />
                      <span>Reports</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {!isHidden('settings') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild onClick={handleNavClick}>
                    <NavLink to="/settings" className={linkClass}>
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </>
          )}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
