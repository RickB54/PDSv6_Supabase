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
    ListChecks,
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
    Printer,
    Bell,
        Tag,
    FlaskConical,
    Zap,
    Mail,
    Target
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
    helpTopicId?: string; // ID of the help topic to access
};

export type MenuGroup = {
    title: string;
    icon: any;
    iconColor?: string;
    items: MenuItem[];
};

export const TOP_ITEMS: MenuItem[] = [
    { title: "Analytics", url: "/bookings-analytics", role: "admin", key: "admin-dashboard", icon: LayoutDashboard, iconColor: "text-blue-500", helpTopicId: 'analytics' },
    { title: "Time & Profitability", url: "/time-profitability", role: "admin", key: "time-profitability", icon: DollarSign, iconColor: "text-emerald-500", helpTopicId: 'time-profitability' },
    { title: "Business Goals", url: "/goals", role: "admin", key: "goals", icon: Target, iconColor: "text-emerald-400", helpTopicId: 'business-goals' },
    { title: "Website Administration", url: "/website-admin", role: "admin", key: "website-admin", icon: Shield, highlight: "red", iconColor: "text-red-500", helpTopicId: 'website-admin' },
    { title: "Employee Dashboard", url: "/dashboard/employee", role: "employee", key: "employee-dashboard", icon: LayoutDashboard, iconColor: "text-blue-500", helpTopicId: 'employee-dashboard' },
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
            title: "View As", icon: Globe, iconColor: "text-zinc-400",
            items: [
                { title: "View As Customer", url: "/customer-dashboard", role: "admin", key: "customer-view-dashboard", icon: LayoutDashboard, helpTopicId: 'customer-view' },
                { title: "View As Employee", url: "/dashboard/employee", role: "admin", key: "employee-view-dashboard", icon: GraduationCap, helpTopicId: 'employee-dashboard' },
            ]
        },
        {
            title: "Customer Intake", icon: UserPlus, iconColor: "text-blue-400",
            items: [
                { title: "Phone Assistant", url: "#call-assistant", key: "phone-assistant", icon: Phone, helpTopicId: 'phone-assistant' },
                { title: "Pre-Vehicle Walkaround", url: "#pre-vehicle-checklist", key: "pre-vehicle-checklist", icon: ClipboardCheck, helpTopicId: 'service-checklist' },
                { title: "Package Comparison", url: "/package-selection", key: "package-selection", icon: Package, helpTopicId: 'package-selection' },
                { title: "Vehicle Classification", url: "/vehicle-classification", key: "vehicle-classification", icon: FileText, helpTopicId: 'vehicle-classification' },
                { title: "Client Evaluation", url: "/client-evaluation", key: "client-evaluation", icon: ClipboardCheck, helpTopicId: 'client-evaluation' },
                { title: "Addon Upsell Script", url: "/addon-upsell-script", key: "addon-upsell-script", icon: FileText, helpTopicId: 'addon-upsell-script' }
            ]
        },
        {
            title: "Operations", icon: ClipboardCheck, iconColor: "text-emerald-400",
            items: [
                { title: "Staff Schedule", url: "/staff-schedule", role: "employee", key: "employee-schedule", icon: CalendarDays, helpTopicId: 'staff-schedule' },
                { title: "Bookings", url: "/bookings", key: "bookings", icon: CalendarDays, badge: counts.tentativeBookingsCount, badgeColor: counts.bookingsBadgeColor, helpTopicId: 'bookings' },
                { title: "Hybrid Availability System", url: "/availability-manager", role: "admin", key: "availability-manager", icon: CalendarCheck, highlight: "green", iconColor: "blue", helpTopicId: 'availability-manager' },
                { title: "Service Checklist", url: "/service-checklist", key: "service-checklist", icon: ClipboardCheck, helpTopicId: 'service-checklist' },
                { title: "Tasks", url: "/tasks", key: "tasks", badge: counts.todoCount > 0 ? counts.todoCount : undefined, icon: CheckSquare, helpTopicId: 'tasks' },
                { title: "Customer Profiles", url: "/search-customer", role: "admin", key: "search-customer", icon: Users, helpTopicId: 'search-customer' },
                { title: "Prospects", url: "/prospects", role: "admin", key: "prospects", icon: Users, helpTopicId: 'prospects' },
                { title: "Users & Roles", url: "/user-management", role: "admin", key: "user-mgmt", icon: Users, helpTopicId: 'user-mgmt' }
            ]
        },
        {
            title: "Finance & Sales", icon: DollarSign, iconColor: "text-green-400",
            items: [
                { title: "Quick Pay", url: "#quick-pay", key: "quick-pay", icon: DollarSign, highlight: "green", iconColor: "text-emerald-500", helpTopicId: "quick-pay" },
                { title: "Estimates", url: "/estimates", role: "admin", key: "estimates", highlight: "green", icon: FileText, helpTopicId: 'estimates' },
                { title: "Invoicing", url: "/invoicing", role: "admin", key: "invoicing", icon: FileText, helpTopicId: 'invoicing' },
                { title: "Time & Profitability", url: "/time-profitability", role: "admin", key: "time-profitability", icon: DollarSign, iconColor: "text-emerald-500", helpTopicId: 'time-profitability' },
                { title: "Market Pricing Analysis", url: "/bookings-analytics?tab=profitability&scroll=market", role: "admin", key: "market-analysis", icon: Target, helpTopicId: 'analytics' },
                { title: "Payments", url: "/payments", role: "admin", key: "payments", icon: DollarSign, helpTopicId: 'payments' },
                { title: "Accounting", url: "/accounting", role: "admin", key: "accounting", icon: Calculator, helpTopicId: 'accounting' },
                { title: "Mileage", url: "/mileage", key: "mileage", icon: Truck, helpTopicId: 'mileage' },
                { title: "Payroll", url: "/payroll", role: "admin", key: "payroll", badge: counts.payrollDueCount > 0 ? counts.payrollDueCount : undefined, icon: DollarSign, helpTopicId: 'payroll' },
                { title: "Company Budget", url: "/company-budget", role: "admin", key: "company-budget", icon: DollarSign, helpTopicId: 'company-budget' },
                { title: "Taxes", url: "/taxes", role: "admin", key: "taxes", icon: FileText, helpTopicId: 'taxes' },
                { title: "Package Pricing", url: "/package-pricing", role: "admin", key: "package-pricing", icon: DollarSign, helpTopicId: 'package-pricing' },
            ]
        },
        {
            title: "Reports", icon: FileBarChart, iconColor: "text-amber-400",
            items: [
                { title: "Reports Dashboard", url: "/reports", role: "admin", key: "reports", icon: FileBarChart, helpTopicId: 'reports-global-summary' },
                { title: "Customers", url: "/reports?tab=customers", role: "admin", key: "reports-customers", icon: Users, helpTopicId: 'reports-customers' },
                { title: "Invoices", url: "/reports?tab=invoices", role: "admin", key: "reports-invoices", icon: FileText, helpTopicId: 'reports-invoices' },
                { title: "Inventory", url: "/reports?tab=inventory", role: "admin", key: "reports-inventory", icon: Package, helpTopicId: 'reports-inventory' },
                { title: "Employee", url: "/reports?tab=employee", role: "admin", key: "reports-employee", icon: GraduationCap, helpTopicId: 'reports-employee' },
                { title: "Estimates", url: "/reports?tab=estimates", role: "admin", key: "reports-estimates", icon: FileText, helpTopicId: 'reports-estimates' },
                { title: "Accounting", url: "/reports?tab=accounting", role: "admin", key: "reports-accounting", icon: Calculator, helpTopicId: 'reports-accounting' },
                { title: "Tax Report", url: "/reports?tab=tax-report", role: "admin", key: "reports-tax", icon: FileText, helpTopicId: 'reports-tax' },
            ]
        },
        {
            title: "Chemicals", icon: Beaker, iconColor: "text-purple-400",
            items: [
                { title: "Chemical Cards", url: "/chemicals", key: "chemical-cards", icon: Package, helpTopicId: 'chemical-cards' },
                { title: "Dilution Ratio Chart", url: "/inventory-control?chart=reference", key: "dilution-chart-reference", icon: Printer, helpTopicId: 'dilution-chart-reference' },
                { title: "Chemical Workflow", url: "/chemical-training", key: "chem-train", icon: Beaker, helpTopicId: 'chemical-workflow' },
                { title: "Rick's Tips", url: "/chemical-training?tips=open", key: "ricks-tips", icon: Zap, helpTopicId: 'ricks-tips' },
                { title: "Prime Dilution Calculator", url: "/dilution-calculator", key: "dilution-calc-chem", icon: Calculator, helpTopicId: 'dilution-calc' },
                { title: "Dilution Reference Chart", url: "/inventory-control?chart=modal", key: "dilution-chart-modal", icon: Printer, helpTopicId: 'dilution-chart-modal' },
            ]
        },
        {
            title: "Label System", icon: Tag, iconColor: "text-rose-400",
            items: [
                { title: "Chemical Labels", url: "/chemicals?labels=open", key: "chemical-labels", icon: Tag, helpTopicId: 'chemical-cards' },
                { title: "Mixed Labels", url: "/chemicals?mixed=open", key: "mixed-labels", icon: FlaskConical, helpTopicId: 'chemical-cards' },
                { title: "PDF All Cards", url: "/chemicals?pdf=all", key: "pdf-all-cards", icon: Printer, helpTopicId: 'chemical-cards' },
            ]
        },
        {
            title: "Inventory & Assets", icon: Package, iconColor: "text-cyan-400",
            items: [
                { title: "Inventory Control", url: "/inventory-control", role: "admin", key: "inventory-control", badge: counts.inventoryCount, badgeColor: counts.inventoryCount > 0 ? 'red' : 'blue', icon: Package, helpTopicId: 'inventory-control' },
                { title: "Prime Dilution Chart", url: "/inventory-control?chart=interactive", role: "admin", key: "dilution-chart-interactive", icon: Printer, helpTopicId: 'dilution-chart-interactive' },
                { title: "Mobile Setup", url: "/mobile-setup", key: "mobile-setup", icon: Package, helpTopicId: 'mobile-setup' },
                { title: "Shop Setup", url: "/shop-setup", key: "shop-setup", icon: Package, helpTopicId: 'shop-setup' },
                { title: "Detailing Vendors", url: "/detailing-vendors", role: "admin", key: "detailing-vendors", icon: Users, helpTopicId: 'detailing-vendors' },
            ]
        },
        {
            title: "Prime Learning Center", icon: GraduationCap, iconColor: "text-indigo-400",
            items: [
                { title: "Standard Operating Procedures (SOPs)", url: "/training-manual?tab=process", key: "sops-process", icon: ListChecks, helpTopicId: 'sops-process' },
                { title: "Employee Certification", url: "/training-manual?tab=videos", key: "cert-prog", icon: Shield, helpTopicId: 'employee-certification' },
                { title: "Learning Library", url: "/learning-library", key: "learn-lib", icon: BookOpen, helpTopicId: 'learn-lib' },
                { title: "Orientation", url: "/orientation", key: "orientation", icon: UserPlus, helpTopicId: 'orientation' },
                { title: "Exam Administration", url: "/exam-admin", role: "admin", key: "exam-admin", icon: Settings, helpTopicId: 'exam-admin' },
            ]
        },
        {
            title: "Staff Management", icon: Users, iconColor: "text-orange-400",
            items: [
                { title: "Staff Schedule", url: "/staff-schedule", role: "admin", key: "staff-schedule", icon: CalendarDays, helpTopicId: 'staff-schedule' },
                { title: "Company Employees", url: "/company-employees", role: "admin", key: "company-employees", icon: Users, helpTopicId: 'company-employees' },
                { title: "Compensation Calculator", url: "/compensation-payroll", role: "admin", key: "compensation-payroll", icon: DollarSign, helpTopicId: 'compensation-payroll' },
                { title: "App Team Chat", url: "/team-chat", role: "admin", key: "team-chat", icon: Users, helpTopicId: 'team-chat' },
            ]
        },
        {
            title: "Marketing & Retention", icon: TicketPercent, iconColor: "text-pink-400",
            items: [
                { title: "Follow-up Center", url: "/follow-up-center", role: "admin", key: "follow-up-center", icon: Bell, highlight: "green", helpTopicId: "retention-hub" },

                { title: "Discount Coupons", url: "/discount-coupons", role: "admin", key: "discount-coupons", icon: TicketPercent, helpTopicId: 'discount-coupons' },
                { title: "Business Card Stickers", url: `/sticker-maker`, key: "sticker-maker", icon: Printer, helpTopicId: 'sticker-maker' },
                { title: "Prime Blog", url: "/blog", key: "blog", icon: Newspaper, helpTopicId: 'blog' },
                { title: "Elite Story Master", url: "/elite-master", role: "admin", key: "elite-master", icon: ListOrdered, helpTopicId: 'blog-reorder' },
            ]
        },
        {
            title: "Help", icon: HelpCircle, iconColor: "text-blue-400",
            items: [
                { title: "Employee Help Center", url: "#help-employee", role: "employee", key: "help-center-employee", icon: HelpCircle, helpTopicId: 'show-help' },
                { title: "Contextual Help Guide", url: "#help-admin", role: "admin", key: "help-center-admin", icon: HelpCircle, helpTopicId: 'show-help' },
            ]
        },
        {
            title: "Settings", icon: Settings, iconColor: "text-zinc-500",
            items: [
                { title: "Application Settings", url: "/settings", role: "admin", key: "settings", icon: Settings, helpTopicId: 'application-settings' },
                { title: "My Profile", url: "/user-settings", key: "user-settings", icon: UserCircle, helpTopicId: 'user-profile' },
            ]
        }
    ];


// End of file
