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
    DollarSign
} from "lucide-react";
import { useDemoMode } from "@/contexts/DemoContext";
import { getCurrentUser } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { contentService } from "@/lib/content";

const renderSidebarContent = (collapsed: boolean, navigate: any, isAdmin: boolean) => (
    <>
        {/* Top Priority Action */}
        <Button
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            onClick={() => window.dispatchEvent(new Event('open-call-assistant'))}
            title="Phone Assistant"
            className={`group relative ${collapsed ? "" : "w-full justify-start gap-2"} hover:bg-primary/20 hover:text-primary transition-all`}
        >
            <Phone className="w-5 h-5 text-primary animate-pulse" />
            {!collapsed && <span className="font-bold uppercase tracking-tight">Phone Assistant</span>}
        </Button>

        {/* Quick Pay Shortcut - Admin Only */}
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

        {/* Pricing Scenario Shortcut - Admin Only */}
        {isAdmin && (
            <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/package-pricing?mode=scenario')} title="Pricing Scenario Builder" className={collapsed ? "" : "w-full justify-start gap-2"}>
                <Calculator className="w-5 h-5 text-red-500" />
                {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase truncate">Scenario Builder</span>}
            </Button>
        )}

        {/* Hybrid Availability System - Admin Only */}
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

        <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/staff-schedule')} title="Staff Schedule" className={collapsed ? "" : "w-full justify-start gap-2"}>
            <CalendarDays className="w-5 h-5 text-emerald-500" />
            {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase truncate">Staff Schedule</span>}
        </Button>
        <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/tasks')} title="Tasks" className={collapsed ? "" : "w-full justify-start gap-2"}>
            <CheckSquare className="w-5 h-5 text-blue-500" />
            {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Tasks</span>}
        </Button>
        <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/vehicle-gallery')} title="Vehicle Gallery" className={collapsed ? "" : "w-full justify-start gap-2"}>
            <Video className="w-5 h-5 text-pink-500" />
            {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Gallery</span>}
        </Button>

        <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/bookings')} title="Bookings" className={collapsed ? "" : "w-full justify-start gap-2"}>
            <Calendar className="w-5 h-5 text-purple-500" />
            {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase text-left">Bookings</span>}
        </Button>
        <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/service-checklist')} title="Checklist" className={collapsed ? "" : "w-full justify-start gap-2"}>
            <ClipboardList className="w-5 h-5 text-orange-500" />
            {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase truncate">Checklist</span>}
        </Button>

        <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/notes')} title="Personal Notes" className={collapsed ? "" : "w-full justify-start gap-2"}>
            <Book className="w-5 h-5 text-amber-200" />
            {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Notes</span>}
        </Button>

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
    const [openMobile, setOpenMobile] = useState(false);
    const [collapsed, setCollapsed] = useState(true);
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

    // Swipe Gesture Logic for Mobile
    useEffect(() => {
        if (!isMobile) return;

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

            // RELAXED: Only intercept if starting from the VERY edge AND no dialog is open
            if (touchStartX > window.innerWidth - 40 && !document.querySelector('[role="dialog"]')) {
                if (dX > dY && dX > 5) {
                    if (e.cancelable) e.preventDefault();
                }
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            
            const deltaX = touchStartX - touchEndX;
            const deltaY = Math.abs(touchStartY - touchEndY);

            // Right-to-Left swipe (deltaX > 0)
            if (
                touchStartX > window.innerWidth - 40 && 
                !document.querySelector('[role="dialog"]') &&
                deltaX > 60 && 
                deltaY < 80 
            ) {
                if (!openMobile) {
                    setOpenMobile(true);
                    try { window.navigator.vibrate(10); } catch {}
                }
            }
            
            // Left-to-Right swipe to close
            if (deltaX < -50 && deltaY < 80 && openMobile) {
                setOpenMobile(false);
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
    }, [isMobile, openMobile]);

    // Hide mobile sidebar on location change
    useEffect(() => {
        setOpenMobile(false);
    }, [location.pathname]);

    // Hide completely on login/auth pages
    const publicPaths = ['/login', '/signup'];
    if (publicPaths.includes(location.pathname)) return null;

    // Mobile style logic
    const isAdmin = user?.role === 'admin';

    if (isMobile) {
        return (
            <>
                {/* Mobile Drawer Overlay */}
                {openMobile && (
                    <div 
                        className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-300" 
                        onClick={() => setOpenMobile(false)}
                    />
                )}
                <div 
                    className={`fixed right-0 top-0 h-screen w-48 bg-zinc-950 border-l border-zinc-800 z-[100] transition-transform duration-300 transform flex flex-col items-start px-2 pt-16 pb-24 gap-3 overflow-y-auto no-scrollbar ${
                        openMobile ? 'translate-x-0' : 'translate-x-full'
                    }`}
                >
                    <div className="flex w-full items-center justify-between mb-4 border-b border-zinc-800 pb-2 flex-shrink-0">
                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">Quick Access</span>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setOpenMobile(false)}
                            className="h-8 w-8 text-zinc-500"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    </div>
                    {renderSidebarContent(false, navigate, isAdmin)}
                </div>
            </>
        );
    }

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
          className={`sticky border-l border-zinc-800 bg-zinc-950 flex flex-col items-center pt-2 pb-24 gap-1.5 z-40 shrink-0 transition-all duration-300 ${collapsed ? 'w-12' : 'w-48 items-start px-2'}`}
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
            {renderSidebarContent(collapsed, navigate, isAdmin)}
        </div>
    );
}
