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
    CalendarDays // Added for Staff Schedule
} from "lucide-react";

export function GlobalRightSidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(true);

    // Hide on login/public pages if necessary
    if (['/login', '/signup', '/'].includes(location.pathname)) return null;

    return (
        <div className={`
            sticky top-0 h-screen border-l border-zinc-800 bg-zinc-950 flex flex-col items-center pt-20 pb-4 gap-4 z-40 shrink-0 transition-all duration-300
            ${collapsed ? 'w-12' : 'w-48 items-start px-2'}
        `}>
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

            {/* Availability Manager - Admin Only */}
            <Button
                variant="ghost"
                size={collapsed ? "icon" : "default"}
                onClick={() => navigate('/availability-manager')}
                title="Availability Manager"
                className={collapsed ? "" : "w-full justify-start gap-2"}
            >
                <CalendarCheck className="w-5 h-5 text-blue-600" />
                {!collapsed && <span>Availability</span>}
            </Button>

            {/* Existing Icons */}
            <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/staff-schedule')} title="Staff Schedule" className={collapsed ? "" : "w-full justify-start gap-2"}>
                <CalendarDays className="w-5 h-5 text-emerald-500" />
                {!collapsed && <span>Staff Schedule</span>}
            </Button>
            <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/tasks')} title="Tasks" className={collapsed ? "" : "w-full justify-start gap-2"}>
                <CheckSquare className="w-5 h-5 text-blue-500" />
                {!collapsed && <span>Tasks</span>}
            </Button>
            <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/vehicle-gallery')} title="Vehicle Gallery" className={collapsed ? "" : "w-full justify-start gap-2"}>
                <Video className="w-5 h-5 text-pink-500" />
                {!collapsed && <span>Gallery</span>}
            </Button>

            {/* Separator */}
            <div className="w-6 h-[1px] bg-zinc-800/50 my-1" />

            {/* Quick Access Icons */}
            <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/bookings')} title="Bookings" className={collapsed ? "" : "w-full justify-start gap-2"}>
                <Calendar className="w-5 h-5 text-purple-500" />
                {!collapsed && <span>Bookings</span>}
            </Button>
            <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/service-checklist')} title="Checklist" className={collapsed ? "" : "w-full justify-start gap-2"}>
                <ClipboardList className="w-5 h-5 text-orange-500" />
                {!collapsed && <span>Checklist</span>}
            </Button>

            {/* Additional High Value */}
            {/* User requested 'Person' icon to go to Customers Page, assuming /search-customer for Admin/Employee */}
            <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/search-customer')} title="Customer Profiles" className={collapsed ? "" : "w-full justify-start gap-2"}>
                <Users className="w-5 h-5 text-indigo-400" />
                {!collapsed && <span>Customers</span>}
            </Button>

            {/* Personal Notes (Replaces previous 'Quick Ref') */}
            <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/notes')} title="Personal Notes" className={collapsed ? "" : "w-full justify-start gap-2"}>
                <Book className="w-5 h-5 text-amber-200" />
                {!collapsed && <span>Notes</span>}
            </Button>

            {/* Inventory Shortcut - Added */}
            <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/inventory-control')} title="Inventory" className={collapsed ? "" : "w-full justify-start gap-2"}>
                <Package className="w-5 h-5 text-cyan-500" />
                {!collapsed && <span>Inventory</span>}
            </Button>

            {/* Chemicals Shortcut */}
            <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/chemicals')} title="Chemicals" className={collapsed ? "" : "w-full justify-start gap-2"}>
                <FlaskConical className="w-5 h-5 text-teal-400" />
                {!collapsed && <span>Chemicals</span>}
            </Button>

            {/* Pricing Scenario Shortcut */}
            <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={() => navigate('/package-pricing?mode=scenario')} title="Pricing Scenario Builder" className={collapsed ? "" : "w-full justify-start gap-2"}>
                <Calculator className="w-5 h-5 text-red-500" />
                {!collapsed && <span>Scenario Builder</span>}
            </Button>

        </div>
    );
}
