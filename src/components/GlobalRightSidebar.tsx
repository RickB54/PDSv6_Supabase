import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";
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
    CalendarDays // Added for Staff Schedule
} from "lucide-react";
import { useDemoMode } from "@/contexts/DemoContext";

import { getCurrentUser } from "@/lib/auth";

export function GlobalRightSidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(true);
    const { isDemoMode } = useDemoMode();
    const user = getCurrentUser();

    // Hide on login/public pages if necessary
    if (['/login', '/signup', '/'].includes(location.pathname)) return null;

    return (
        <div 
          className={`sticky h-screen border-l border-zinc-800 bg-zinc-950 flex flex-col items-center pt-2 pb-24 gap-1.5 z-40 shrink-0 transition-all duration-300 ${collapsed ? 'w-12' : 'w-48 items-start px-2'}`}
          style={{ top: isDemoMode ? '120px' : '32px' }}
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

            {/* Pricing Scenario Shortcut - MOVED TO TOP */}
            <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/package-pricing?mode=scenario')} title="Pricing Scenario Builder" className={collapsed ? "" : "w-full justify-start gap-2"}>
                <Calculator className="w-5 h-5 text-red-500" />
                {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Scenario Builder</span>}
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

            {/* Existing Icons */}
            <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/staff-schedule')} title="Staff Schedule" className={collapsed ? "" : "w-full justify-start gap-2"}>
                <CalendarDays className="w-5 h-5 text-emerald-500" />
                {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Staff Schedule</span>}
            </Button>
            <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/tasks')} title="Tasks" className={collapsed ? "" : "w-full justify-start gap-2"}>
                <CheckSquare className="w-5 h-5 text-blue-500" />
                {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Tasks</span>}
            </Button>
            <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/vehicle-gallery')} title="Vehicle Gallery" className={collapsed ? "" : "w-full justify-start gap-2"}>
                <Video className="w-5 h-5 text-pink-500" />
                {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Gallery</span>}
            </Button>

            {/* Separator - Removed */}

            {/* Quick Access Icons */}
            <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/bookings')} title="Bookings" className={collapsed ? "" : "w-full justify-start gap-2"}>
                <Calendar className="w-5 h-5 text-purple-500" />
                {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Bookings</span>}
            </Button>
            <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/service-checklist')} title="Checklist" className={collapsed ? "" : "w-full justify-start gap-2"}>
                <ClipboardList className="w-5 h-5 text-orange-500" />
                {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Checklist</span>}
            </Button>

            {/* Additional High Value */}
            {/* Personal Notes (Replaces previous 'Quick Ref') */}
            <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/notes')} title="Personal Notes" className={collapsed ? "" : "w-full justify-start gap-2"}>
                <Book className="w-5 h-5 text-amber-200" />
                {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Notes</span>}
            </Button>

            {/* Inventory Shortcut - Added */}
            <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/inventory-control')} title="Inventory" className={collapsed ? "" : "w-full justify-start gap-2"}>
                <Package className="w-5 h-5 text-cyan-500" />
                {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Inventory</span>}
            </Button>

            {/* Chemicals Shortcut */}
            <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/chemicals')} title="Chemicals" className={collapsed ? "" : "w-full justify-start gap-2"}>
                <FlaskConical className="w-5 h-5 text-teal-400" />
                {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Chemicals</span>}
            </Button>

            {/* Dilution Calculator Shortcut */}
            <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/dilution-calculator')} title="Dilution Calculator" className={collapsed ? "" : "w-full justify-start gap-2"}>
                <Beaker className="w-5 h-5 text-green-400" />
                {!collapsed && <span className="text-white font-black text-[10px] tracking-widest uppercase">Calc</span>}
            </Button>

        </div>
    );
}
