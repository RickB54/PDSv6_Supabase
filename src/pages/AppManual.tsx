import { useState, useRef, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
    Search, 
    Printer, 
    FileText, 
    ChevronRight, 
    BookOpen, 
    Sparkles, 
    Info, 
    Rocket, 
    Facebook, 
    Instagram, 
    Music, 
    Newspaper, 
    GripVertical, 
    Edit2, 
    History as HistoryIcon, 
    Zap, 
    ExternalLink, 
    X,
    LayoutDashboard,
    Shield,
    UserPlus,
    ClipboardCheck,
    CalendarDays,
    DollarSign,
    FileBarChart,
    Beaker,
    Tag,
    Package,
    GraduationCap,
    Users,
    TicketPercent,
    Settings,
    Mail,
    Truck,
    Calculator,
    Globe,
    Phone,
    FlaskConical,
    Bell
} from "lucide-react";
import { 
    adminMenuTopics, 
    employeeMenuTopics, 
    employeeDashboardTopics, 
    customerTopics,
    HelpTopic 
} from "@/components/help/helpData";

export default function AppManual() {
    const contentRef = useRef<HTMLDivElement>(null);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Flatten all topics from helpData for the search/reference section
    const allTopics: HelpTopic[] = [
        ...adminMenuTopics,
        ...employeeMenuTopics,
        ...employeeDashboardTopics,
        ...customerTopics
    ];

    // Remove duplicates by ID
    const uniqueTopics = allTopics.filter((topic, index, self) =>
        index === self.findIndex((t) => t.id === topic.id)
    );

    const filteredTopics = uniqueTopics.filter(t => 
        (t.title + ' ' + t.summary + ' ' + t.content.join(' ')).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handlePrint = () => {
        window.print();
    };

    // Auto-trigger print if requested via query param
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('print') === 'true') {
            // Short delay to allow content to render
            const timer = setTimeout(() => {
                handlePrint();
                // Clean up URL
                window.history.replaceState({}, '', window.location.pathname);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const scrollTo = (id: string) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    const chapters = [
        { id: "ch1", title: "01: The Administrative Core", icon: LayoutDashboard, color: "text-blue-400" },
        { id: "ch2", title: "02: Customer Intake & Sales", icon: UserPlus, color: "text-cyan-400" },
        { id: "ch3", title: "03: Operations & Scheduling", icon: ClipboardCheck, color: "text-emerald-400" },
        { id: "ch4", title: "04: Financial Intelligence", icon: DollarSign, color: "text-green-400" },
        { id: "ch5", title: "05: Reporting & Analytics", icon: FileBarChart, color: "text-amber-400" },
        { id: "ch6", title: "06: Chemical Science & Lab", icon: Beaker, color: "text-purple-400" },
        { id: "ch7", title: "07: Inventory & Asset Management", icon: Package, color: "text-sky-400" },
        { id: "ch8", title: "08: Staff & Learning Center", icon: GraduationCap, color: "text-indigo-400" },
        { id: "ch9", title: "09: Marketing & Retention", icon: TicketPercent, color: "text-pink-400" },
        { id: "ch10", title: "10: System Settings & Security", icon: Settings, color: "text-zinc-400" },
        { id: "ch11", title: "11: Technical Reference SOPs", icon: BookOpen, color: "text-white" },
    ];

    return (
        <div className="min-h-screen bg-black text-white pb-20 print:bg-white print:text-black">
            <div className="print:hidden">
                <PageHeader title="Prime Auto Detail App Manual" />
            </div>

            <div className="max-w-screen-xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 relative">

                {/* TOC Sidebar - Desktop */}
                <div className="hidden lg:block col-span-1 print:hidden">
                    <div className="sticky top-6">
                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <BookOpen className="h-5 w-5 text-blue-400" />
                                    Table of Contents
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                {chapters.map((ch) => (
                                    <Button
                                        key={ch.id}
                                        variant="ghost"
                                        className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800 text-sm whitespace-normal h-auto py-2 text-left"
                                        onClick={() => scrollTo(ch.id)}
                                    >
                                        <ch.icon className={`h-4 w-4 mr-2 shrink-0 ${ch.color}`} />
                                        {ch.title}
                                    </Button>
                                ))}
                                <Separator className="my-2 bg-zinc-800" />
                                <Button onClick={handlePrint} className="w-full bg-blue-600 hover:bg-blue-500">
                                    <Printer className="h-4 w-4 mr-2" /> PDF / PRINT MANUAL
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Main Content */}
                <div className="col-span-1 lg:col-span-3 space-y-12 min-w-0" ref={contentRef}>

                    {/* Mobile TOC */}
                    <div className="lg:hidden print:hidden mb-6">
                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">Table of Contents</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {chapters.map((ch) => (
                                    <Button key={ch.id} variant="outline" size="sm" className="justify-start border-zinc-700 text-zinc-300" onClick={() => scrollTo(ch.id)}>
                                        <ch.icon className={`h-4 w-4 mr-2 ${ch.color}`} />
                                        {ch.title.split(":")[1].trim()}
                                    </Button>
                                ))}
                                <Button onClick={handlePrint} className="w-full bg-blue-600 col-span-full mt-2"><Printer className="h-4 w-4 mr-2" /> Print Manual</Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Manual Title Section */}
                    <div className="mb-12 border-b border-zinc-800 pb-8 print:border-black">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600 rounded-2xl print:bg-black">
                                    <Shield className="h-10 w-10 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-4xl font-black tracking-tighter uppercase print:text-black">Prime Procedures Manual</h1>
                                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm print:text-zinc-700">Version 6.0 • Operational Excellence</p>
                                </div>
                            </div>
                            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-500 font-black uppercase tracking-tighter px-6 py-6 h-auto text-lg print:hidden shrink-0">
                                <Printer className="h-6 w-6 mr-2" /> PDF / PRINT MANUAL
                            </Button>
                        </div>
                        <p className="text-zinc-400 leading-relaxed max-w-2xl print:text-black">
                            This document serves as the official Standard Operating Procedure (SOP) manual for Prime Auto Detail. 
                            It covers every menu, sub-menu, and feature within the application to ensure consistency, 
                            efficiency, and professional-grade results across the entire shop and mobile units.
                        </p>
                    </div>

                    {/* Chapter 1: Administrative Core */}
                    <section id="ch1" className="scroll-mt-20 print:break-before-page">
                        <ChapterHeader title="01: The Administrative Core" subtitle="Managing the nerve center of Prime Auto Detail." icon={LayoutDashboard} color="bg-blue-600" />
                        <div className="space-y-6">
                            <ManualEntry 
                                title="Prime Central Hub" 
                                description="The master dashboard for administrators. Provides real-time metrics on revenue, active jobs, pending bookings, and system alerts."
                                features={["Live Revenue Tracking", "Critical Business Alerts", "Daily Appointment Summary"]}
                            />
                            <ManualEntry 
                                title="Website Administration" 
                                description="Control your public-facing storefront. Toggle booking availability, manage SEO metadata, and update service descriptions."
                                features={["Business Launch Manager", "Winter Mode Controls", "Public Banner Management"]}
                            />
                            <ManualEntry 
                                title="View As (Impersonation)" 
                                description="Allows administrators to view the application through the eyes of a customer or an employee for verification and training."
                                features={["Customer Portal Preview", "Employee Dashboard View", "Role Testing"]}
                            />
                            <ManualEntry 
                                title="Application Settings" 
                                description="Global configuration for the entire software suite. Manage security tokens, module visibility, and database sync status."
                                features={["Module Toggles", "Security Kill-Switch", "Data Persistence Tools"]}
                            />
                        </div>
                    </section>

                    {/* Chapter 2: Customer Intake & Sales */}
                    <section id="ch2" className="scroll-mt-20 print:break-before-page">
                        <ChapterHeader title="02: Customer Intake & Sales" subtitle="The gateway to professional client management." icon={UserPlus} color="bg-cyan-600" />
                        <div className="space-y-6">
                            <ManualEntry 
                                title="Phone Assistant" 
                                description="A floating utility designed for handling customer inquiries. Includes professional scripts and lead capture tools."
                                features={["Inquiry Scripts", "Instant Lead Recording", "Package Quick-View"]}
                            />
                            <ManualEntry 
                                title="Package Comparison" 
                                description="Visual side-by-side comparison tool to help customers understand the value of different service tiers."
                                features={["Essential vs Elite Comparison", "Feature Highlighting", "Up-sell Integration"]}
                            />
                            <ManualEntry 
                                title="Vehicle Classification" 
                                description="Standardized sizing database. Ensures every vehicle is priced correctly based on its physical size and complexity."
                                features={["Size Multipliers", "Vehicle Type Database", "Automated Pricing Logic"]}
                            />
                            <ManualEntry 
                                title="Client Evaluation" 
                                description="Pre-service diagnostic tool. Grade vehicle condition to justify surcharges and manage client expectations."
                                features={["Condition Scoring", "Risk Factor ID", "Evaluation Summaries"]}
                            />
                            <ManualEntry 
                                title="Addon Upsell Script" 
                                description="Professional communication paths for suggesting add-on services during the booking process."
                                features={["Service Benefit Scripts", "Common Objection Handling", "Profit Maximization"]}
                            />
                        </div>
                    </section>

                    {/* Chapter 3: Operations & Scheduling */}
                    <section id="ch3" className="scroll-mt-20 print:break-before-page">
                        <ChapterHeader title="03: Operations & Scheduling" subtitle="Maintaining the shop's pulse and workflow." icon={ClipboardCheck} color="bg-emerald-600" />
                        <div className="space-y-6">
                            <ManualEntry 
                                title="Bookings Manager" 
                                description="The primary calendar and appointment engine. Links customer records to specific service times and technicians."
                                features={["Drag-and-Drop Scheduling", "Conflict Detection", "Status Lifecycle (Confirmed/In Progress/Done)"]}
                            />
                            <ManualEntry 
                                title="Hybrid Availability System" 
                                description="Combines manual scheduling blocks with real-time Google Calendar synchronization for total schedule protection."
                                features={["Bidirectional Sync", "Recurring Shop Closures", "Lead-Time Protection"]}
                            />
                            <ManualEntry 
                                title="Service Checklist" 
                                description="The 'Prime Standard' SOP execution engine. Tracks time, material usage, and step-by-step completion."
                                features={["Job Timer", "Material Tracking", "Digital Inspection Tools"]}
                            />
                            <ManualEntry 
                                title="Customer Profiles & Prospects" 
                                description="The master CRM. Distinguishes between potential leads (Prospects) and active clients (Customers)."
                                features={["Full Service History", "Vehicle Garage Management", "Lead Conversion Tracking"]}
                            />
                            <ManualEntry 
                                title="Shop Tasks" 
                                description="Internal to-do list for non-customer activities like shop maintenance, restocking, and administrative follow-ups."
                                features={["Task Due Dates", "Category Grouping", "Reminder Alerts"]}
                            />
                        </div>
                    </section>

                    {/* Chapter 4: Financial Intelligence */}
                    <section id="ch4" className="scroll-mt-20 print:break-before-page">
                        <ChapterHeader title="04: Financial Intelligence" subtitle="Tracking every dollar from invoice to ledger." icon={DollarSign} color="bg-green-600" />
                        <div className="space-y-6">
                            <ManualEntry 
                                title="Accounting Ledger" 
                                description="Comprehensive financial tracking. Includes revenue, expenses, and net profit calculations based on inventory valuation."
                                features={["Net Profit Formula", "Expense Categorization", "Break-Even Analysis"]}
                            />
                            <ManualEntry 
                                title="Invoicing & Quick Pay" 
                                description="Professional billing system. Generate PDFs, track unpaid balances, and process mobile payments instantly."
                                features={["PDF Invoice Generation", "Multi-Method Payment Logs", "Pending Balance Alerts"]}
                            />
                            <ManualEntry 
                                title="Estimates & Letter Maker" 
                                description="Tools for professional communication. Create quotes and formal business letters for clients and vendors."
                                features={["PDF Quotes", "Branded Letterheads", "Conversion to Invoices"]}
                            />
                            <ManualEntry 
                                title="Payroll & Mileage" 
                                description="Manage technician compensation and travel tracking. Supports commission, hourly pay, and IRS-compliant mileage logs."
                                features={["Pay Stub Generation", "Odometer Tracking", "Disbursement History"]}
                            />
                            <ManualEntry 
                                title="Package Pricing Manager" 
                                description="Central command for all service rates. Manage base prices, size multipliers, and percentage-based adjustments, featuring human-readable logs and smart sync comparison logic."
                                features={["Bulk Price Adjustments", "Human-Readable Audit Trail", "Smart Sync Comparison", "Backup/Restore Pricing"]}
                            />
                            <ManualEntry 
                                title="Taxes & Budgeting" 
                                description="Financial planning and compliance. Track deductible expenses and set monthly spending targets."
                                features={["Tax Ready Exports", "Actual vs. Planned Budgeting", "Sales Tax Tracking"]}
                            />
                        </div>
                    </section>

                    {/* Chapter 5: Reporting & Analytics */}
                    <section id="ch5" className="scroll-mt-20 print:break-before-page">
                        <ChapterHeader title="05: Reporting & Analytics" subtitle="Data-driven decisions for business growth." icon={FileBarChart} color="bg-amber-600" />
                        <div className="space-y-6">
                            <ManualEntry 
                                title="Reports Dashboard" 
                                description="The business intelligence hub. Aggregates data from across the app into readable charts and summaries."
                                features={["Temporal Scans (Date Filtering)", "Intelligent Logic Grouping", "Cross-Module Data Audits"]}
                            />
                            <ManualEntry 
                                title="Detailed Analysis Tabs" 
                                description="Granular reporting for every department. Drill down into specific metrics for targeted business improvement."
                                features={["Customer Retention Stats", "Invoice/Revenue Audits", "Inventory Consumption", "Employee Performance", "Tax Liability Reports"]}
                            />
                        </div>
                    </section>

                    {/* Chapter 6: Chemical Science & Lab */}
                    <section id="ch6" className="scroll-mt-20 print:break-before-page">
                        <ChapterHeader title="06: Chemical Science & Lab" subtitle="The precision chemistry of professional detailing." icon={Beaker} color="bg-purple-600" />
                        <div className="space-y-6">
                            <ManualEntry 
                                title="Chemical Knowledge Base" 
                                description="Digital encyclopedia of all shop products. Includes safety data, mix ratios, and professional application guides."
                                features={["Chemical Cards", "Rick's Tips Integration", "Safety Protocol Integration"]}
                            />
                            <ManualEntry 
                                title="Dilution Reference Charts" 
                                description="Printable guides for the mix station. Provides exact product and water amounts for 16oz, 24oz, and 32oz bottles."
                                features={["Standard/Heavy/Maintenance Ratios", "Color-Coded Oz Markers", "Interactive Shop Guide"]}
                            />
                            <ManualEntry 
                                title="Label System" 
                                description="Design and print professional high-contrast labels for shop bottles. Ensures safety compliance and brand consistency."
                                features={["Chemical Labels", "Mixed Labels", "Bulk PDF Card Generation"]}
                            />
                            <ManualEntry 
                                title="Chemical Decision System" 
                                description="Logic engine that guides detailers from substrate assessment to final chemical selection based on contamination type."
                                features={["Severity Assessment", "Contamination Matching", "Inventory Aware Recommendations"]}
                            />
                        </div>
                    </section>

                    {/* Chapter 7: Inventory & Asset Management */}
                    <section id="ch7" className="scroll-mt-20 print:break-before-page">
                        <ChapterHeader title="07: Inventory & Asset Management" subtitle="Securing the physical foundation of the business." icon={Package} color="bg-sky-600" />
                        <div className="space-y-6">
                            <ManualEntry 
                                title="Inventory Control" 
                                description="Real-time tracking of chemicals, towels, and equipment. Prevents job delays with automated low-stock warnings."
                                features={["Material Updates (Restock)", "Usage History Audits", "Smart Sync Deduplication"]}
                            />
                            <ManualEntry 
                                title="Prime Dilution Chart (Interactive)" 
                                description="Live interface for managing shop-wide dilution standards and identifying inventory shortages."
                                features={["One-Click Ratio Edits", "Brand Grouping", "Visual Stock Indicators"]}
                            />
                            <ManualEntry 
                                title="Mobile & Shop Setup" 
                                description="Configuration for physical shop locations and mobile rig setups. Includes specialized tracking for equipment pools."
                                features={["Mobile Rig Gallery", "Equipment Assignment", "Setup Orientation"]}
                            />
                            <ManualEntry 
                                title="Detailing Vendors" 
                                description="Centralized directory of suppliers and restock links to maintain a professional and reliable supply chain."
                                features={["Vendor Quick-Links", "Supplier Contact Logs", "Preferred Pricing Notes"]}
                            />
                            <ManualEntry 
                                title="Business Drive & File Manager" 
                                description="Visual cloud-integrated digital storage system inside the File Manager. Organize media, PDFs, and invoices into unified operational folders. Features Gemini AI for instant folder summaries."
                                features={["Gemini Folder Summaries", "Automatic Estimates/Invoices Folders", "Supabase Cloud Sync"]}
                            />
                            <ManualEntry 
                                title="Unified Chemical Modal" 
                                description="Centralized interface for managing a chemical's basic information alongside its varying bottle sizes, custom costs, and stock levels. Use this to prevent redundant entries and harness AI generated templates."
                                features={["Multi-Bottle Management", "AI Knowledge Sync", "Cost Calculations"]}
                            />
                        </div>
                    </section>

                    {/* Chapter 8: Staff & Learning Center */}
                    <section id="ch8" className="scroll-mt-20 print:break-before-page">
                        <ChapterHeader title="08: Staff & Learning Center" subtitle="Building a team of detailing professionals." icon={GraduationCap} color="bg-indigo-600" />
                        <div className="space-y-6">
                            <ManualEntry 
                                title="Learning Library" 
                                description="Comprehensive repository of detailing techniques, equipment guides, and standard operating procedures."
                                features={["Video Masterclasses", "Technique Breakdowns", "Equipment Manuals"]}
                            />
                            <ManualEntry 
                                title="Certification & Orientation" 
                                description="Structured onboarding and testing program to ensure all staff meet the 'Prime Standard'."
                                features={["Knowledge Exams", "Certification PDF Generation", "Orientation Checklists"]}
                            />
                            <ManualEntry 
                                title="Staff Management Hub" 
                                description="Administrative control over employee records, pay rates, and work assignments."
                                features={["Company Employee Records", "Staff Scheduling", "Performance History"]}
                            />
                            <ManualEntry 
                                title="App Team Chat" 
                                description="Secure internal communication channel for shop-to-field coordination and technical support."
                                features={["Real-time Messaging", "Photo Sharing", "Staff-Only Access"]}
                            />
                        </div>
                    </section>

                    {/* Chapter 9: Marketing & Retention */}
                    <section id="ch9" className="scroll-mt-20 print:break-before-page">
                        <ChapterHeader title="09: Marketing & Retention" subtitle="Fueling growth and maintaining client loyalty." icon={TicketPercent} color="bg-pink-600" />
                        <div className="space-y-6">
                            <ManualEntry 
                                title="Follow-up Center & Retention Engine" 
                                description="The retention engine. Automatically identifies clients due for maintenance based on their service cycle, with dynamic customer / prospect segmentation."
                                features={["Maintenance Cycle Tracking", "Nurturing Templates", "Engagement Logs"]}
                            />
                            <ManualEntry 
                                title="Outreach Campaigns & Custom Domains" 
                                description="Configure Resend custom domain integration and load preset high-converting client/prospect outreach campaigns, featuring dynamic SENDER_EMAIL Supabase secrets and BCC delivery verification copies."
                                features={["Outreach Presets", "Resend Domain Sync", "BCC Verification", "SENDER_EMAIL Secret"]}
                            />
                            <ManualEntry 
                                title="Prime Blog & Elite Story Master" 
                                description="Content marketing hub. Create engaging stories about your work and manage their publication sequence."
                                features={["AI Blog Strategist", "Visual Story Reordering", "SEO Content Tools"]}
                            />
                            <ManualEntry 
                                title="Social Blast Engine" 
                                description="Directly push blog content to Facebook, Instagram, and TikTok to drive traffic and bookings."
                                features={["Facebook Draft Integration", "Clipboard Automation", "Multi-Platform Support"]}
                            />
                            <ManualEntry 
                                title="Marketing Assets" 
                                description="Tools for physical networking and brand awareness. Generate coupons and QR codes for customer acquisition."
                                features={["Discount Coupons", "Business Card Stickers", "QR Code Generator"]}
                            />
                        </div>
                    </section>

                    {/* Chapter 10: System Settings & Security */}
                    <section id="ch10" className="scroll-mt-20 print:break-before-page">
                        <ChapterHeader title="10: System Settings & Security" subtitle="Protecting data and configuring the environment." icon={Settings} color="bg-zinc-600" />
                        <div className="space-y-6">
                            <ManualEntry 
                                title="User Management & Roles" 
                                description="Administrative control over who can access the app and what actions they can perform."
                                features={["Admin vs Employee Roles", "Account Disabling", "Permission Audits"]}
                            />
                            <ManualEntry 
                                title="Profile & Notification Settings" 
                                description="Personal account management. Update contact details, passwords, and system alert preferences."
                                features={["Individual Profile Sync", "Password Management", "Notification Toggles"]}
                            />
                            <ManualEntry 
                                title="Data Deletion & Deletion Safety" 
                                description="Procedures for safely removing test data or archiving inactive clients without losing history, protected by cascading DB rules."
                                features={["Permanent Deletion Safety", "Customer Archiving", "Virtual Profile Cleanup", "Cascading DB Cleanup"]}
                            />
                            <ManualEntry 
                                title="Master Backups & Sync" 
                                description="Tools for ensuring your data is synced with Supabase and backed up locally in the browser."
                                features={["Manual Cloud Sync", "JSON Pricing Backups", "Browser Storage Reset"]}
                            />
                        </div>
                    </section>

                    {/* Chapter 11: Technical Reference SOPs */}
                    <section id="ch11" className="scroll-mt-20 print:break-before-page">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <ChapterHeader title="11: Technical Reference SOPs" subtitle="Deep-dive technical guides for every feature." icon={BookOpen} color="bg-zinc-800" />
                            <div className="relative group flex-1 max-w-md print:hidden">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-sky-400 transition-colors" />
                                <Input 
                                    placeholder="Search all technical topics..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-zinc-900 border-zinc-700 pl-10 pr-10 focus:ring-sky-500/50"
                                />
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        <div className="space-y-8">
                            {filteredTopics.map((topic, idx) => (
                                <div key={topic.id} className="print:break-inside-avoid border-b border-zinc-800 pb-8 mb-8 last:border-0">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center border border-sky-500/20 text-sky-400 font-black text-xs print:bg-black print:text-white">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black uppercase text-white print:text-black">{topic.title}</h3>
                                            <p className="text-xs text-zinc-500 font-bold uppercase print:text-zinc-600">{topic.summary}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4 text-zinc-300 print:text-black pl-11">
                                        {topic.content.map((p, i) => (
                                            <p key={i} className="text-sm leading-relaxed">
                                                {p}
                                            </p>
                                        ))}
                                        {topic.route && (
                                            <div className="pt-4 flex items-center gap-2 opacity-50 print:opacity-100">
                                                <Badge variant="outline" className="text-[10px] font-mono border-zinc-700 text-zinc-500 print:border-black print:text-black">
                                                    APP ROUTE: {topic.route}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {filteredTopics.length === 0 && (
                                <div className="py-20 text-center border-2 border-dashed border-zinc-800 rounded-3xl">
                                    <Search className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">No matching technical topics found</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Best Practices Section */}
                    <section id="tips" className="scroll-mt-20 print:break-before-page">
                        <ChapterHeader title="Best Practices & Tips" subtitle="Expert advice for running a smooth shop." icon={Zap} color="bg-pink-600" />
                        <Card className="bg-zinc-900/50 border-zinc-800 p-8 print:border-black print:bg-transparent">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h4 className="text-white font-black uppercase text-sm mb-4 print:text-black flex items-center gap-2">
                                        <Zap className="h-4 w-4 text-pink-400" /> Operational Efficiency
                                    </h4>
                                    <ul className="space-y-3 text-sm text-zinc-400 print:text-black list-disc pl-4">
                                        <li>Always open the <strong>Prep Summary</strong> before starting a job to ensure all materials are at your station.</li>
                                        <li>Use the <strong>Job Timer</strong> for every service; the data accumulated will help you optimize your pricing over time.</li>
                                        <li>Perform a <strong>Digital Inspection</strong> with photos for every vehicle to protect against false damage claims.</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="text-white font-black uppercase text-sm mb-4 print:text-black flex items-center gap-2">
                                        <Info className="h-4 w-4 text-blue-400" /> Data Integrity
                                    </h4>
                                    <ul className="space-y-3 text-sm text-zinc-400 print:text-black list-disc pl-4">
                                        <li>Search the CRM before creating a new customer to prevent duplicate records and fragmented history.</li>
                                        <li>Ensure <strong>Vehicle Size</strong> is selected correctly, as this is the primary driver for automated pricing.</li>
                                        <li>Sync your personal calendar to the <strong>Hybrid Availability</strong> system to avoid scheduling conflicts automatically.</li>
                                    </ul>
                                </div>
                            </div>
                        </Card>
                    </section>

                    <div className="h-20 print:hidden"></div>
                    <div className="hidden print:block text-center pt-10 text-xs text-zinc-500">
                        © 2026 Prime Auto Detail • Operational Excellence Manual • Confidental & Proprietary
                    </div>
                </div>
            </div>
        </div>
    );
}

function ChapterHeader({ title, subtitle, icon: Icon, color }: { title: string, subtitle: string, icon: any, color: string }) {
    return (
        <div className="mb-10">
            <div className="flex items-center gap-4 mb-2">
                <div className={`p-2 rounded-xl ${color} print:bg-black`}>
                    <Icon className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-black tracking-tight uppercase text-white print:text-black">{title}</h2>
            </div>
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] print:text-zinc-600 pl-12">{subtitle}</p>
        </div>
    );
}

function ManualEntry({ title, description, features }: { title: string, description: string, features: string[] }) {
    return (
        <div className="pl-12 print:break-inside-avoid">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2 print:text-black">
                <ChevronRight className="h-4 w-4 text-blue-500" /> {title}
            </h3>
            <p className="text-zinc-400 text-sm mb-4 leading-relaxed print:text-black">{description}</p>
            <div className="flex flex-wrap gap-2">
                {features.map((f) => (
                    <Badge key={f} variant="outline" className="text-[9px] uppercase font-black border-zinc-800 text-zinc-500 print:border-zinc-300 print:text-black">
                        {f}
                    </Badge>
                ))}
            </div>
            <Separator className="mt-8 bg-zinc-900 print:bg-zinc-200" />
        </div>
    );
}
