import {
    LayoutDashboard,
    Shield,
    UserPlus,
    ClipboardCheck,
    CalendarDays,
    FileBarChart,
    CheckSquare,
    Users,
    DollarSign,
    FileText,
    Calculator,
    TicketPercent,
    Package,
    Globe,
    GraduationCap,
    Truck,
    Newspaper,
    BookOpen,
    Settings,
    UserCircle,
    Book
} from "lucide-react";

export type MenuItem = {
    title: string;
    url: string;
    icon?: any; // lucide icon
    role?: string;
    key?: string;
    badge?: number;
    badgeColor?: 'red' | 'blue'; // Color for the badge
    highlight?: 'red' | 'green';
};

export type MenuGroup = {
    title: string;
    icon: any;
    items: MenuItem[];
};

export const TOP_ITEMS: MenuItem[] = [
    { title: "Admin Dashboard", url: "/admin-dashboard", role: "admin", key: "admin-dashboard", icon: LayoutDashboard },
    { title: "Employee Dashboard", url: "/dashboard/employee", role: "employee", key: "employee-dashboard", icon: LayoutDashboard },
];

// Note: Badge counts like todoCount, payrollDueCount, etc. are dynamic and passed from the component.
// We will define the static structure here, and the component will merge/override with dynamic data.
// OR we export a function that takes the counts.

export const getMenuGroups = (counts: {
    todoCount: number;
    payrollDueCount: number;
    inventoryCount: number;
    fileCount: number;
}): MenuGroup[] => [
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
                { title: "Package Comparison", url: "/package-selection", icon: Package },
                { title: "Vehicle Classification", url: "/vehicle-classification", icon: FileText },
                { title: "Client Evaluation", url: "/client-evaluation", icon: ClipboardCheck },
                { title: "Addon Upsell Script", url: "/addon-upsell-script", icon: FileText }
            ]
        },
        {
            title: "Operations", icon: ClipboardCheck,
            items: [
                { title: "Staff Schedule", url: "/staff-schedule", role: "employee", icon: CalendarDays },
                { title: "Bookings", url: "/bookings", key: "bookings", icon: CalendarDays },
                { title: "Analytics", url: "/bookings-analytics", key: "bookings-analytics", icon: FileBarChart },
                { title: "Service Checklist", url: "/service-checklist", key: "service-checklist", icon: ClipboardCheck },
                { title: "Tasks", url: "/tasks", badge: counts.todoCount > 0 ? counts.todoCount : undefined, icon: CheckSquare },
                { title: "Customer Profiles", url: "/search-customer", key: "search-customer", icon: Users },
                { title: "Prospects", url: "/prospects", key: "prospects", icon: Users },
                { title: "Users & Roles", url: "/user-management", role: "admin", key: "user-mgmt", icon: Users }
            ]
        },
        {
            title: "Finance & Sales", icon: DollarSign,
            items: [
                { title: "Estimates", url: "/estimates", role: "admin", highlight: "green", icon: FileText },
                { title: "Invoicing", url: "/invoicing", role: "admin", key: "invoicing", icon: FileText },
                { title: "Accounting", url: "/accounting", role: "admin", key: "accounting", icon: Calculator },
                { title: "Payroll", url: "/payroll", role: "admin", key: "payroll", badge: counts.payrollDueCount > 0 ? counts.payrollDueCount : undefined, icon: DollarSign },
                { title: "Company Budget", url: "/company-budget", role: "admin", key: "company-budget", icon: DollarSign },
                { title: "Discount Coupons", url: "/discount-coupons", role: "admin", key: "discount-coupons", icon: TicketPercent },
                { title: "Package Pricing", url: "/package-pricing", role: "admin", key: "package-pricing", icon: DollarSign },
            ]
        },
        {
            title: "Inventory & Assets", icon: Package,
            items: [
                { title: "Inventory Control", url: "/inventory-control", role: "admin", key: "inventory-control", badge: counts.inventoryCount, badgeColor: counts.inventoryCount > 0 ? 'red' : 'blue', icon: Package },
                { title: "File Manager", url: "/file-manager", role: "admin", key: "file-manager", badge: counts.fileCount > 0 ? counts.fileCount : undefined, icon: FileText },
                { title: "Mobile Setup", url: "/mobile-setup", role: "admin", key: "mobile-setup", icon: Package },
                { title: "Detailing Vendors", url: "/detailing-vendors", role: "admin", key: "detailing-vendors", icon: Users },
            ]
        },
        {
            title: "Prime Training Center", icon: GraduationCap,
            items: [
                { title: "Employee Certification", url: "/training-manual?tab=videos", key: "cert-prog", icon: Shield },
                { title: "Learning Library", url: "/learning-library", key: "learn-lib", icon: BookOpen },
                { title: "Orientation", url: "/orientation", key: "orientation", icon: UserPlus },
            ]
        },
        {
            title: "Staff Management", icon: Users,
            items: [
                { title: "Staff Schedule", url: "/staff-schedule", role: "admin", key: "staff-schedule", icon: CalendarDays },
                { title: "Company Employees", url: "/company-employees", role: "admin", key: "company-employees", icon: Users },
                { title: "App Team Chat", url: "/team-chat", role: "admin", key: "team-chat", icon: Users },
            ]
        },
        {
            title: "Company Blog", icon: Newspaper,
            items: [
                { title: "Prime Blog", url: "/f150-setup", key: "blog", icon: Newspaper },
            ]
        },
        {
            title: "Settings", icon: Settings,
            items: [
                { title: "Application Settings", url: "/settings", key: "settings", icon: Settings },
                { title: "My Profile", url: "/user-settings", key: "user-settings", icon: UserCircle },
            ]
        }
    ];

// End of file
