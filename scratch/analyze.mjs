import fs from 'fs';

const topItems = [
    { title: "Analytics", url: "/bookings-analytics", key: "admin-dashboard" },
    { title: "Time & Profitability", url: "/time-profitability", key: "time-profitability" },
    { title: "Business Goals", url: "/goals", key: "goals" },
    { title: "Website Administration", url: "/website-admin", key: "website-admin" },
    { title: "Vehicle Gallery", url: "/vehicle-gallery", key: "vehicle-gallery" },
    { title: "App Manual", url: "/app-manual", key: "app-manual" },
    { title: "File Manager", url: "/file-manager", key: "file-manager" },
    { title: "Sticky Notes", url: "/sticky-notes", key: "sticky_notes" },
];

const menuGroups = [
    {
        title: "View As",
        items: [
            { title: "View As Customer", url: "/customer-dashboard", key: "customer-view-dashboard" },
            { title: "View As Employee", url: "/dashboard/employee", key: "employee-view-dashboard" }
        ]
    },
    {
        title: "Customer Intake",
        items: [
            { title: "Phone Assistant", url: "#call-assistant", key: "phone-assistant" },
            { title: "Package Comparison", url: "/package-selection", key: "package-selection" },
            { title: "Vehicle Classification", url: "/vehicle-classification", key: "vehicle-classification" },
            { title: "Client Evaluation", url: "/client-evaluation", key: "client-evaluation" },
            { title: "Addon Upsell Script", url: "/addon-upsell-script", key: "addon-upsell-script" }
        ]
    },
    {
        title: "Operations",
        items: [
            { title: "Staff Schedule", url: "/staff-schedule", key: "employee-schedule" },
            { title: "Bookings", url: "/bookings", key: "bookings" },
            { title: "Hybrid Availability System", url: "/availability-manager", key: "availability-manager" },
            { title: "Service Checklist", url: "/service-checklist", key: "service-checklist" },
            { title: "Tasks", url: "/tasks", key: "tasks" },
            { title: "Customer Profiles", url: "/search-customer", key: "search-customer" },
            { title: "Prospects", url: "/prospects", key: "prospects" },
            { title: "Users & Roles", url: "/user-management", key: "user-mgmt" }
        ]
    },
    {
        title: "Finance & Sales",
        items: [
            { title: "Quick Pay", url: "#quick-pay", key: "quick-pay" },
            { title: "Estimates", url: "/estimates", key: "estimates" },
            { title: "Invoicing", url: "/invoicing", key: "invoicing" },
            { title: "Time & Profitability", url: "/time-profitability", key: "time-profitability" },
            { title: "Market Pricing Analysis", url: "/bookings-analytics?tab=profitability&scroll=market", key: "market-analysis" },
            { title: "Payments", url: "/payments", key: "payments" },
            { title: "Accounting", url: "/accounting", key: "accounting" },
            { title: "Mileage", url: "/mileage", key: "mileage" },
            { title: "Payroll", url: "/payroll", key: "payroll" },
            { title: "Company Budget", url: "/company-budget", key: "company-budget" },
            { title: "Taxes", url: "/taxes", key: "taxes" },
            { title: "Package Pricing", url: "/package-pricing", key: "package-pricing" }
        ]
    },
    {
        title: "Reports",
        items: [
            { title: "Reports Dashboard", url: "/reports", key: "reports" },
            { title: "Customers", url: "/reports?tab=customers", key: "reports-customers" },
            { title: "Invoices", url: "/reports?tab=invoices", key: "reports-invoices" },
            { title: "Inventory", url: "/reports?tab=inventory", key: "reports-inventory" },
            { title: "Employee", url: "/reports?tab=employee", key: "reports-employee" },
            { title: "Estimates", url: "/reports?tab=estimates", key: "reports-estimates" },
            { title: "Accounting", url: "/reports?tab=accounting", key: "reports-accounting" },
            { title: "Tax Report", url: "/reports?tab=tax-report", key: "reports-tax" }
        ]
    },
    {
        title: "Chemicals",
        items: [
            { title: "Chemical Cards", url: "/chemicals", key: "chemical-cards" },
            { title: "Dilution Ratio Chart", url: "/inventory-control?chart=reference", key: "dilution-chart-reference" },
            { title: "Chemical Workflow", url: "/chemical-training", key: "chem-train" },
            { title: "Rick's Tips", url: "/chemical-training?tips=open", key: "ricks-tips" },
            { title: "Prime Dilution Calculator", url: "/dilution-calculator", key: "dilution-calc-chem" },
            { title: "Dilution Reference Chart", url: "/inventory-control?chart=modal", key: "dilution-chart-modal" }
        ]
    },
    {
        title: "Label System",
        items: [
            { title: "Chemical Labels", url: "/chemicals?labels=open", key: "chemical-labels" },
            { title: "Mixed Labels", url: "/chemicals?mixed=open", key: "mixed-labels" },
            { title: "PDF All Cards", url: "/chemicals?pdf=all", key: "pdf-all-cards" }
        ]
    },
    {
        title: "Inventory & Assets",
        items: [
            { title: "Inventory Control", url: "/inventory-control", key: "inventory-control" },
            { title: "Prime Dilution Chart", url: "/inventory-control?chart=interactive", key: "dilution-chart-interactive" },
            { title: "Mobile Setup", url: "/mobile-setup", key: "mobile-setup" },
            { title: "Shop Setup", url: "/shop-setup", key: "shop-setup" },
            { title: "Detailing Vendors", url: "/detailing-vendors", key: "detailing-vendors" }
        ]
    },
    {
        title: "Prime Learning Center",
        items: [
            { title: "Employee Certification", url: "/training-manual?tab=videos", key: "cert-prog" },
            { title: "Learning Library", url: "/learning-library", key: "learn-lib" },
            { title: "Orientation", url: "/orientation", key: "orientation" },
            { title: "Exam Administration", url: "/exam-admin", key: "exam-admin" }
        ]
    },
    {
        title: "Staff Management",
        items: [
            { title: "Staff Schedule", url: "/staff-schedule", key: "staff-schedule" },
            { title: "Company Employees", url: "/company-employees", key: "company-employees" },
            { title: "Compensation Calculator", url: "/compensation-payroll", key: "compensation-payroll" },
            { title: "App Team Chat", url: "/team-chat", key: "team-chat" }
        ]
    },
    {
        title: "Marketing & Retention",
        items: [
            { title: "Follow-up Center", url: "/follow-up-center", key: "follow-up-center" },
            { title: "Discount Coupons", url: "/discount-coupons", key: "discount-coupons" },
            { title: "Business Card Stickers", url: "/sticker-maker", key: "sticker-maker" },
            { title: "Prime Blog", url: "/blog", key: "blog" },
            { title: "Elite Story Master", url: "/elite-master", key: "elite-master" }
        ]
    },
    {
        title: "Help",
        items: [
            { title: "Employee Help Center", url: "#help-employee", key: "help-center-employee" },
            { title: "Contextual Help Guide", url: "#help-admin", key: "help-center-admin" }
        ]
    },
    {
        title: "Settings",
        items: [
            { title: "Application Settings", url: "/settings", key: "settings" },
            { title: "My Profile", url: "/user-settings", key: "user-settings" }
        ]
    }
];

const defaultSections = [
    "admin-dashboard", "search-customer", "prospects", "inventory-control", 
    "invoicing", "vehicle-gallery", "reports", "settings", "payroll", 
    "accounting", "company-budget", "estimates", "chemical-cards", 
    "dilution-calc", "dilution-chart-interactive", "dilution-chart-reference", 
    "dilution-chart-modal", "help-admin", "help-employee", "learn-lib", 
    "orientation", "tasks", "service-checklist", "website-admin",
    "phone-assistant", "availability-manager", "package-selection",
    "vehicle-classification", "client-evaluation", "addon-upsell-script",
    "employee-schedule", "bookings", "user-mgmt", "mileage", "taxes",
    "package-pricing", "reports-customers", "reports-invoices",
    "reports-inventory", "reports-employee", "reports-estimates",
    "reports-accounting", "reports-tax", "chem-train", "cert-prog",
    "interactive-demo", "staff-schedule", "company-employees",
    "team-chat", "follow-up-center", "discount-coupons", "blog",
    "blog-reorder", "user-settings", "vehicle-types", "mobile-setup",
    "detailing-vendors", "active-jobs", "job-history", "payments-cart",
    "my-invoices", "personal-notes", "bookings-analytics", "file-manager", "letter-maker"
];

console.log("=== REAL ADMIN MENU ITEM KEYS ===");
let allRealKeys = [];
topItems.forEach(i => allRealKeys.push(i));
menuGroups.forEach(g => g.items.forEach(i => allRealKeys.push(i)));
console.log(`Total Real Items: ${allRealKeys.length}`);

console.log("\n=== MISSING FROM DEMO (Filtered Out) ===");
let missing = [];
allRealKeys.forEach(item => {
    if (!defaultSections.includes(item.key)) {
        missing.push(item);
    }
});
console.log(missing.map(m => `- ${m.title} (${m.key})`).join("\n"));

console.log("\n=== ORPHANED DEMO SECTIONS (Keys in Demo but not in Menu) ===");
let orphaned = [];
defaultSections.forEach(key => {
    if (!allRealKeys.map(i => i.key).includes(key)) {
        orphaned.push(key);
    }
});
console.log(orphaned.join("\n"));
