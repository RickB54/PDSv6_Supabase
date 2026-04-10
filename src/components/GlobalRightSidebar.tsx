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
    CalendarDays
} from "lucide-react";
import { useDemoMode } from "@/contexts/DemoContext";
import { getCurrentUser } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";

const renderSidebarContent = (collapsed: boolean, navigate: any) => (
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

        {/* Pricing Scenario Shortcut */}
        <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/package-pricing?mode=scenario')} title="Pricing Scenario Builder" className={collapsed ? "" : "w-full justify-start gap-2"}>
            <Calculator className="w-5 h-5 text-red-500" />
            {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase truncate">Scenario Builder</span>}
        </Button>

        {/* Availability Manager - Admin Only */}
        <Button
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            onClick={() => navigate('/availability-manager')}
            title="Availability Manager"
            className={collapsed ? "" : "w-full justify-start gap-2"}
        >
            <CalendarCheck className="w-5 h-5 text-blue-600" />
            {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Availability</span>}
        </Button>

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

        <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/inventory-control')} title="Inventory" className={collapsed ? "" : "w-full justify-start gap-2"}>
            <Package className="w-5 h-5 text-cyan-500" />
            {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Inventory</span>}
        </Button>

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
            
            // For right sidebar swipe (Right-to-Left)
            const dX_rtl = touchStartX - currentX;
            const dY = Math.abs(currentY - touchStartY);

            if (touchStartX > window.innerWidth - 120 && dX_rtl > 10 && dY < 30) {
                if (e.cancelable) e.preventDefault();
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            
            const deltaX = touchStartX - touchEndX;
            const deltaY = Math.abs(touchStartY - touchEndY);

            // Right-to-Left swipe (deltaX > 0)
            if (
                touchStartX > window.innerWidth - 120 && 
                deltaX > 40 && 
                deltaY < 50 && 
                !openMobile
            ) {
                setOpenMobile(true);
            }
            
            // Left-to-Right swipe to close
            if (deltaX < -40 && deltaY < 50 && openMobile) {
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
    const publicPaths = ['/login', '/signup', '/'];
    if (publicPaths.includes(location.pathname)) return null;

    // Mobile style logic
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
                    className={`fixed right-0 top-0 h-screen w-48 bg-zinc-950 border-l border-zinc-800 z-[100] transition-transform duration-300 transform flex flex-col items-start px-2 pt-4 pb-24 gap-3 overflow-y-auto no-scrollbar ${
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
                    {renderSidebarContent(false, navigate)}
                </div>
            </>
        );
    }

    return (
        <div 
          className={`sticky top-0 h-screen border-l border-zinc-800 bg-zinc-950 flex flex-col items-center pt-2 pb-24 gap-1.5 z-40 shrink-0 transition-all duration-300 ${collapsed ? 'w-12' : 'w-48 items-start px-2'}`}
          style={{ marginTop: isDemoMode ? '104px' : '64px' }}
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
            {renderSidebarContent(collapsed, navigate)}
        </div>
    );
}
