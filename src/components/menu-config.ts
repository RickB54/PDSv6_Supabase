import {
    LayoutDashboard,
    Shield,
    UserPlus,
    ClipboardCheck,
    CalendarDays,
    CalendarCheck,
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
    Book,
    Phone,
    HelpCircle,
    ListOrdered,
    Beaker,
    Printer
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
    iconColor?: string; // Custom icon color class (e.g., "text-blue-600")
};

export type MenuGroup = {
    title: string;
    icon: any;
    items: MenuItem[];
};

export const TOP_ITEMS: MenuItem[] = [
    { title: "Prime Central Hub", url: "/dashboard/admin", role: "admin", key: "admin-dashboard", icon: LayoutDashboard },
    { title: "Website Administration", url: "/website-admin", role: "admin", icon: Shield, highlight: "red" },
    { title: "Employee Dashboard", url: "/dashboard/employee", role: "employee", key: "employee-dashboard", icon: LayoutDashboard },
    { title: "View As Customer", url: "/customer-dashboard", role: "admin", key: "customer-view-dashboard", icon: LayoutDashboard },
];

// Note: Badge counts like todoCount, payrollDueCount, etc. are dynamic and passed from the component.
// We will define the static structure here, and the component will merge/override with dynamic data.
// OR we export a function that takes the counts.

export const getMenuGroups = (counts: {
    todoCount: number;
    payrollDueCount: number;
    inventoryCount: number;
    fileCount: number;
    bookingsBadgeColor: 'red' | 'blue';
    tentativeBookingsCount: number;
}): MenuGroup[] => [

        {
            title: "Customer Intake", icon: UserPlus,
            items: [
                { title: "Phone Assistant", url: "#call-assistant", icon: Phone },
                { title: "Availability Manager", url: "/availability-manager", role: "admin", icon: CalendarCheck, highlight: "green", iconColor: "blue" },
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
                { title: "Bookings", url: "/bookings", key: "bookings", icon: CalendarDays, badge: counts.tentativeBookingsCount, badgeColor: counts.bookingsBadgeColor },
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
                { title: "Mileage", url: "/mileage", icon: Truck },
                { title: "Payroll", url: "/payroll", role: "admin", key: "payroll", badge: counts.payrollDueCount > 0 ? counts.payrollDueCount : undefined, icon: DollarSign },

                { title: "Company Budget", url: "/company-budget", role: "admin", key: "company-budget", icon: DollarSign },
                { title: "Taxes", url: "/taxes", role: "admin", key: "taxes", icon: FileText },
                { title: "Discount Coupons", url: "/discount-coupons", role: "admin", key: "discount-coupons", icon: TicketPercent },
                { title: "Package Pricing", url: "/package-pricing", role: "admin", key: "package-pricing", icon: DollarSign },
            ]
        },
        {
            title: "Reports", icon: FileBarChart,
            items: [
                { title: "Reports Dashboard", url: "/reports", role: "admin", key: "reports", icon: FileBarChart },
                { title: "Customers", url: "/reports?tab=customers", role: "admin", key: "reports-customers", icon: Users },
                { title: "Invoices", url: "/reports?tab=invoices", role: "admin", key: "reports-invoices", icon: FileText },
                { title: "Inventory", url: "/reports?tab=inventory", role: "admin", key: "reports-inventory", icon: Package },
                { title: "Employee", url: "/reports?tab=employee", role: "admin", key: "reports-employee", icon: GraduationCap },
                { title: "Estimates", url: "/reports?tab=estimates", role: "admin", key: "reports-estimates", icon: FileText },
                { title: "Accounting", url: "/reports?tab=accounting", role: "admin", key: "reports-accounting", icon: Calculator },
                { title: "Tax Report", url: "/reports?tab=tax-report", role: "admin", key: "reports-tax", icon: FileText },
            ]
        },
        {
            title: "Inventory & Assets", icon: Package,
            items: [
                { title: "Inventory Control", url: "/inventory-control", role: "admin", key: "inventory-control", badge: counts.inventoryCount, badgeColor: counts.inventoryCount > 0 ? 'red' : 'blue', icon: Package },
                { title: "Mobile Setup", url: "/mobile-setup", role: "admin", key: "mobile-setup", icon: Package },
                { title: "Detailing Vendors", url: "/detailing-vendors", role: "admin", key: "detailing-vendors", icon: Users },
            ]
        },
        {
            title: "Prime Training Center", icon: GraduationCap,
            items: [
                { title: "Employee Certification", url: "/training-manual?tab=videos", key: "cert-prog", icon: Shield },
                { title: "Chemical Workflow", url: "/chemical-training", key: "chem-train", icon: Beaker },
                { title: "Prime Dilution Calculator", url: "/dilution-calculator", key: "dilution-calc", icon: Calculator },
                { title: "Learning Library", url: "/learning-library", key: "learn-lib", icon: BookOpen },
                { title: "Chemical Cards", url: "/chemicals", key: "chemical-cards", icon: Package },
                { title: "Dilution Ref Chart", url: "/inventory-control?chart=modal", key: "dilution-chart-modal", icon: Printer },
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
                { title: "Prime Blog", url: "/blog", key: "blog", icon: Newspaper },
                { title: "Blog Layout Architect", url: "/blog-reorder", role: "admin", key: "blog-reorder", icon: ListOrdered },
            ]
        },
        {
            title: "Help", icon: HelpCircle,
            items: [
                { title: "Admin Help Guide", url: "#help-admin", role: "admin", key: "help-admin", icon: HelpCircle, iconColor: "text-sky-500" },
                { title: "Employee Help Guide", url: "#help-employee", role: "employee", key: "help-employee", icon: HelpCircle, iconColor: "text-emerald-500" },
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
