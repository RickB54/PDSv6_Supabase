import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import {
    MessageSquare,
    CheckSquare,
    Calendar,
    CalendarCheck,
    ClipboardList,
    User,
    FileText,
    Book,
    ChevronLeft,
    ChevronRight,
    Users,
    FlaskConical,
    Video,
    Phone,
    Package,
    Calculator,
    Beaker,
    CalendarDays,
    DollarSign,
    BookOpen,
    Banknote,
    Receipt
} from "lucide-react";
import { useDemoMode } from "@/contexts/DemoContext";
import { getCurrentUser } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { contentService } from "@/lib/content";

const renderSidebarContent = (collapsed: boolean, navigate: any, isAdmin: boolean, pendingPayrollCount: number = 0) => (
    <>
        {/* GROUP 1: Quick Helpful Items */}
        <Button
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            onClick={() => window.dispatchEvent(new Event('open-call-assistant'))}
            title="Phone Assistant"
            className={`group relative ${collapsed ? "" : "w-full justify-start gap-2"} hover:bg-primary/20 hover:text-primary transition-all`}
        >
            <Phone className="w-5 h-5 text-primary animate-pulse" />
            {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Phone Assistant</span>}
        </Button>

        {isAdmin && (
            <Button
                variant="ghost"
                size={collapsed ? "icon" : "default"}
                onClick={() => window.dispatchEvent(new Event('open-quick-pay'))}
                title="Collect Payment (Quick Pay)"
                className={`group relative ${collapsed ? "" : "w-full justify-start gap-2"} hover:bg-emerald-500/20 transition-all`}
            >
                <DollarSign className="w-5 h-5 text-emerald-500" />
                {!collapsed && <span className="font-bold uppercase tracking-tight text-white group-hover:text-emerald-400">Quick Pay</span>}
            </Button>
        )}

        {isAdmin && (
            <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/package-pricing?mode=scenario')} title="Pricing Scenario Builder" className={collapsed ? "" : "w-full justify-start gap-2"}>
                <Calculator className="w-5 h-5 text-red-500" />
                {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase truncate">Scenario Builder</span>}
            </Button>
        )}

        <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/sticky-notes')} title="Sticky Notes" className={collapsed ? "" : "w-full justify-start gap-2"}>
            <CheckSquare className="w-5 h-5 text-yellow-400" />
            {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase truncate">Sticky Notes</span>}
        </Button>

        <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/tasks')} title="Tasks" className={collapsed ? "" : "w-full justify-start gap-2"}>
            <CheckSquare className="w-5 h-5 text-blue-500" />
            {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Tasks</span>}
        </Button>

        <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/vehicle-gallery')} title="Vehicle Gallery" className={collapsed ? "" : "w-full justify-start gap-2"}>
            <Video className="w-5 h-5 text-pink-500" />
            {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Gallery</span>}
        </Button>

        <div className="w-[70%] h-[1px] bg-zinc-600/80 self-center shrink-0" style={{ margin: '-2.5px 0' }} />

        {/* GROUP 2: Scheduling Workflow */}
        {/* Sub-section A: Active scheduling/calendars */}
        {isAdmin && (
            <Button
                variant="ghost"
                size={collapsed ? "icon" : "default"}
                onClick={() => navigate('/availability-manager')}
                title="Hybrid Availability System"
                className={collapsed ? "" : "w-full justify-start gap-2"}
            >
                <CalendarCheck className="w-5 h-5 text-blue-600" />
                {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Hybrid Availability</span>}
            </Button>
        )}

        <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/bookings')} title="Bookings" className={collapsed ? "" : "w-full justify-start gap-2"}>
            <Calendar className="w-5 h-5 text-purple-500" />
            {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase text-left">Bookings</span>}
        </Button>

        <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/staff-schedule')} title="Staff Schedule" className={collapsed ? "" : "w-full justify-start gap-2"}>
            <CalendarDays className="w-5 h-5 text-emerald-500" />
            {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase truncate">Staff Schedule</span>}
        </Button>

        <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/service-checklist')} title="Checklist" className={collapsed ? "" : "w-full justify-start gap-2"}>
            <ClipboardList className="w-5 h-5 text-orange-500" />
            {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase truncate">Checklist</span>}
        </Button>

        <div className="w-[70%] h-[1px] bg-zinc-600/80 self-center shrink-0" style={{ margin: '-2.5px 0' }} />

        {/* Sub-section: Financial / Billing */}
        {isAdmin && (
            <>
                <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/payroll')} title="Payroll" className={`group relative ${collapsed ? "" : "w-full justify-start gap-2"} hover:bg-green-500/10`}>
                    <div className="relative">
                        <Banknote className="w-5 h-5 text-green-500" />
                        {pendingPayrollCount > 0 && (
                            <div className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-red-500 rounded-full flex items-center justify-center text-[9px] font-black text-white px-0.5 border border-[#18181b]">
                                {pendingPayrollCount}
                            </div>
                        )}
                    </div>
                    {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Payroll</span>}
                </Button>

                <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/invoicing')} title="Invoices" className={collapsed ? "" : "w-full justify-start gap-2"}>
                    <Receipt className="w-5 h-5 text-blue-400" />
                    {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Invoices</span>}
                </Button>
                
                <div className="w-[70%] h-[1px] bg-zinc-600/80 self-center shrink-0" style={{ margin: '-2.5px 0' }} />
            </>
        )}

        {/* Sub-section B: Reference/people */}

        <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/search-customer')} title="Customer Database" className={collapsed ? "" : "w-full justify-start gap-2"}>
            <Users className="w-5 h-5 text-blue-500" />
            {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Customers</span>}
        </Button>

        {isAdmin && (
            <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/prospects')} title="Prospects Overview" className={collapsed ? "" : "w-full justify-start gap-2"}>
                <Users className="w-5 h-5 text-purple-500" />
                {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Prospects</span>}
            </Button>
        )}

        {isAdmin && (
            <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/company-employees')} title="Company Employees" className={collapsed ? "" : "w-full justify-start gap-2"}>
                <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
                    <User className="w-5 h-5 text-red-500" />
                    <DollarSign className="w-3 h-3 text-red-500 absolute -bottom-1 -right-1 bg-[#18181b] rounded-full stroke-[3]" />
                </div>
                {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Employees</span>}
            </Button>
        )}

        <div className="w-[70%] h-[1px] bg-zinc-600/80 self-center shrink-0" style={{ margin: '-2.5px 0' }} />

        {/* GROUP 3: Chemicals & Inventory */}
        {isAdmin && (
            <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/inventory-control')} title="Inventory" className={collapsed ? "" : "w-full justify-start gap-2"}>
                <Package className="w-5 h-5 text-cyan-500" />
                {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Inventory</span>}
            </Button>
        )}

        <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/chemicals')} title="Chemicals" className={collapsed ? "" : "w-full justify-start gap-2"}>
            <FlaskConical className="w-5 h-5 text-teal-400" />
            {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Chemicals</span>}
        </Button>

        <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => window.dispatchEvent(new CustomEvent('open-ricks-tips', { detail: { tab: 'description' } }))} title="Chemical Description" className={collapsed ? "" : "w-full justify-start gap-2"}>
            <BookOpen className="w-5 h-5 text-purple-400" />
            {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Chem Desc</span>}
        </Button>

        <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/dilution-calculator')} title="Dilution Calculator" className={collapsed ? "" : "w-full justify-start gap-2"}>
            <Beaker className="w-5 h-5 text-green-400" />
            {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Calc</span>}
        </Button>
    </>
);

export function GlobalRightSidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useIsMobile();
    const [collapsed, setCollapsed] = useState(true);
    const [pendingPayroll, setPendingPayroll] = useState(0);
    const { isDemoMode } = useDemoMode();
    const user = getCurrentUser();
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

    useEffect(() => {
        if (!user || user.role !== 'admin') return;
        
        const fetchPayroll = async () => {
            try {
                const { getSupabasePayrollRecords } = await import("@/lib/supa-data");
                const records = await getSupabasePayrollRecords('pending');
                setPendingPayroll(records.length);
            } catch {}
        };
        fetchPayroll();

        // Listen for payroll updates
        const handleUpdate = () => fetchPayroll();
        window.addEventListener('payroll-updated', handleUpdate);
        return () => window.removeEventListener('payroll-updated', handleUpdate);
    }, [user?.role]);


    // Hide completely on login/auth pages
    const publicPaths = ['/login', '/signup'];
    if (publicPaths.includes(location.pathname)) return null;

    // Mobile style logic
    const isAdmin = user?.role === 'admin';



    // Calculate dynamic top offset based on active banners
    const isPerspectiveMode = user?.role === 'admin' && (
        localStorage.getItem('view_as_mode') === 'customer' ||
        localStorage.getItem('view_as_mode') === 'employee' ||
        location.pathname.startsWith('/customer-dashboard') || 
        location.pathname.startsWith('/portal') || 
        location.pathname.startsWith('/dashboard/employee')
    );

    // Header (64) + Demo Banner (40) + Perspective Banner (40) + Business Banner (40)
    let dynamicTop = 64;
    if (isDemoMode) dynamicTop += 40;
    if (isPerspectiveMode) dynamicTop += 40;
    if (businessStatus?.isTopBannerActive) dynamicTop += 40;


    return (
        <div 
          className={`sticky z-40 border-l border-zinc-800 bg-zinc-950 flex flex-col items-center pt-2 pb-24 gap-1.5 shrink-0 transition-all duration-300 ${collapsed ? 'w-12' : 'w-48 items-start px-2'}`}
          style={{ 
            top: `${dynamicTop}px`,
            height: `calc(100vh - ${dynamicTop}px)`,
            marginTop: `${dynamicTop}px`
          }}
        >
            {/* Toggle */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed(!collapsed)}
                className="mb-2 self-center hover:bg-zinc-800 text-zinc-500"
                title={collapsed ? "Expand" : "Collapse"}
            >
                {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
            
            {renderSidebarContent(collapsed, navigate, isAdmin, pendingPayroll)}
        </div>
    );
}
