import { useState, useRef } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, Printer, FileText, ChevronRight, BookOpen, Sparkles, Info, Rocket, Facebook, Instagram, Music, Newspaper, GripVertical, Edit2, History as HistoryIcon, Zap, ExternalLink, X } from "lucide-react";
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
    
    // Flatten all topics from helpData
    const allTopics: HelpTopic[] = [
        ...adminMenuTopics,
        ...employeeMenuTopics,
        ...employeeDashboardTopics,
        ...customerTopics
    ];

    // Remove duplicates by ID (just in case)
    const uniqueTopics = allTopics.filter((topic, index, self) =>
        index === self.findIndex((t) => t.id === topic.id)
    );

    const filteredTopics = uniqueTopics.filter(t => 
        (t.title + ' ' + t.summary + ' ' + t.content.join(' ')).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handlePrint = () => {
        window.print();
    };

    const scrollTo = (id: string) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-black text-white pb-20 print:bg-white print:text-black">
            <div className="print:hidden">
                <PageHeader title="App Manual & Workflow Guide" />
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
                                {[
                                    { id: "intro", label: "Introduction" },
                                    { id: "scenario-new-job", label: "Scenario: New Customer Job" },
                                    { id: "scenario-inventory", label: "Scenario: Inventory Management" },
                                    { id: "scenario-payroll", label: "Scenario: Payroll & Paychecks" },
                                    { id: "scenario-estimate", label: "Scenario: Creating Estimates" },
                                    { id: "scenario-employee", label: "Scenario: Employee Training" },
                                    { id: "ai-assistant", label: "Scenario: Chemical AI Consultant" },
                                    { id: "blog-ai", label: "✨ Blog AI Content Strategist" },
                                    { id: "social-blast", label: "🚀 Social Blast Engine" },
                                    { id: "visual-architect", label: "🛠️ Visual Architect & Activity Log" },
                                    { id: "admin-workflow", label: "Admin Workflows" },
                                    { id: "technical-reference", label: "📚 Technical Reference Guide" },
                                    { id: "tips", label: "Best Practices" },
                                ].map((item) => (
                                    <Button
                                        key={item.id}
                                        variant="ghost"
                                        className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800 text-sm whitespace-normal h-auto py-2 text-left"
                                        onClick={() => scrollTo(item.id)}
                                    >
                                        <ChevronRight className="h-4 w-4 mr-2 shrink-0" />
                                        {item.label}
                                    </Button>
                                ))}
                                <Separator className="my-2 bg-zinc-800" />
                                <Button onClick={handlePrint} className="w-full bg-blue-600 hover:bg-blue-500">
                                    <Printer className="h-4 w-4 mr-2" /> Print / Save as PDF
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Main Content */}
                <div className="col-span-1 lg:col-span-3 space-y-8 min-w-0" ref={contentRef}>

                    {/* Mobile TOC */}
                    <div className="lg:hidden print:hidden mb-6">
                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">Table of Contents</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {[
                                    { id: "intro", label: "Introduction" },
                                    { id: "scenario-new-job", label: "New Job" },
                                    { id: "scenario-inventory", label: "Inventory" },
                                    { id: "scenario-payroll", label: "Payroll" },
                                    { id: "scenario-estimate", label: "Estimates" },
                                    { id: "scenario-employee", label: "Training" },
                                    { id: "ai-assistant", label: "AI Consultant" },
                                    { id: "blog-ai", label: "✨ Blog AI" },
                                    { id: "social-blast", label: "🚀 Social Blast" },
                                    { id: "visual-architect", label: "🛠️ Visual Architect" },
                                    { id: "admin-workflow", label: "Admin" },
                                    { id: "technical-reference", label: "Reference" },
                                    { id: "tips", label: "Tips" },
                                ].map((item) => (
                                    <Button key={item.id} variant="outline" size="sm" className="justify-start border-zinc-700 text-zinc-300" onClick={() => scrollTo(item.id)}>{item.label}</Button>
                                ))}
                                <Button onClick={handlePrint} className="w-full bg-blue-600 col-span-full mt-2"><Printer className="h-4 w-4 mr-2" /> Print Manual</Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Mobile TOC / Print Header */}
                    <div className="md:hidden print:block mb-8 border-b pb-4">
                        <h1 className="text-3xl font-bold mb-2">Prime Auto Detail App Manual</h1>
                        <p className="text-zinc-400 print:text-zinc-600">Comprehensive Workflow Guide & Standard Operating Procedures</p>
                    </div>

                    <section id="intro" className="scroll-mt-20">
                        <h2 className="text-2xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                            <FileText className="h-6 w-6" /> 1. Introduction
                        </h2>
                        <Card className="bg-zinc-900/50 border-zinc-800 p-6 print:border print:bg-transparent print:shadow-none">
                            <p className="mb-4 text-zinc-300 print:text-black">
                                Welcome to the Prime Auto Detail Application Manual. This guide serves as the definitive reference for utilizing the Prime Auto Detail application to manage daily operations, finance, inventory, and staff training.
                            </p>
                            <p className="text-zinc-300 print:text-black">
                                Use the "Print / Save as PDF" button to save a local copy of this manual for offline reference or employee onboarding.
                            </p>
                        </Card>
                    </section>

                    <section id="scenario-new-job" className="scroll-mt-20">
                        <h2 className="text-2xl font-bold text-green-400 mb-4 flex items-center gap-2">
                            <FileText className="h-6 w-6" /> 2. Scenario: Performing a New Job
                        </h2>
                        <Card className="bg-zinc-900/50 border-zinc-800 p-6 print:border print:bg-transparent print:shadow-none">
                            <h3 className="text-xl font-semibold text-white mb-2 print:text-black">Step 1: Booking</h3>
                            <ul className="list-disc pl-5 space-y-2 text-zinc-300 mb-6 print:text-black">
                                <li>Navigate to <strong>Operations &gt; Bookings</strong> or click "Book A New Job" on the Dashboard.</li>
                                <li>Enter customer details (Name, Vehicle). Use the search to link existing profiles.</li>
                                <li>Select the service package and scheduled date.</li>
                                <li><strong>Result:</strong> Although the Booking creates the appointment, the "Work" begins in the Service Checklist.</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-white mb-2 print:text-black">Step 2: Execution (Service Checklist)</h3>
                            <ul className="list-disc pl-5 space-y-2 text-zinc-300 mb-6 print:text-black">
                                <li>Navigate to <strong>Operations &gt; Service Checklist</strong>.</li>
                                <li><strong>Select Service & Vehicle:</strong> Choose the package (e.g., Full Detail) and Vehicle Type to load the checklist items.</li>
                                <li><strong>Perform Work:</strong> As you work, verify each step (Preparation, Exterior, Interior).</li>
                                <li><strong>Track Usage:</strong> Open the "Materials Used" section. Click "Add Row" for Chemicals (e.g., 1/2 bottle of Shine) or Materials (e.g., 2 rags). This deducts from Inventory automatically.</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-white mb-2 print:text-black">Step 3: Completion & Payment</h3>
                            <ul className="list-disc pl-5 space-y-2 text-zinc-300 print:text-black">
                                <li>Once work is done, expand "Totals & Payment".</li>
                                <li>Review the Subtotal. Add a Discount (dollar or %) or Destination Fee if applicable.</li>
                                <li>Click <strong>"Finish Job"</strong> to mark it complete.</li>
                                <li>Click <strong>"Save & Create Invoice"</strong>. This generates a PDF invoice and logs the revenue.</li>
                                <li><strong>Optional:</strong> Link the checklist to a specific Customer Profile for history tracking.</li>
                            </ul>
                        </Card>
                    </section>

                    <section id="scenario-inventory" className="scroll-mt-20">
                        <h2 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
                            <FileText className="h-6 w-6" /> 3. Scenario: Inventory Management
                        </h2>
                        <Card className="bg-zinc-900/50 border-zinc-800 p-6 print:border print:bg-transparent print:shadow-none">
                            <p className="mb-4 text-zinc-300 print:text-black">
                                Proper inventory tracking prevents shortages. The app tracks Chemicals (liquids), Materials (consumables), and Tools (assets).
                            </p>

                            <h3 className="text-xl font-semibold text-white mb-2 print:text-black">Routine Checks</h3>
                            <ul className="list-disc pl-5 space-y-2 text-zinc-300 mb-6 print:text-black">
                                <li>Go to <strong>Inventory & Assets &gt; Inventory Control</strong>.</li>
                                <li><strong>Low Stock Alerts:</strong> Look for the "Low Stock" indicators or check the Admin Dashboard "Real-time Alerts".</li>
                                <li>Use the search bar to find specific items.</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-white mb-2 print:text-black">Restocking & Updates</h3>
                            <ul className="list-disc pl-5 space-y-2 text-zinc-300 print:text-black">
                                <li>Click the <strong>"Material Updates"</strong> button (top right of Inventory page).</li>
                                <li>Select "Stock" mode.</li>
                                <li>Find the item (e.g., "Car Soap") and enter the added quantity (e.g., +5 gallons).</li>
                                <li>Save. This updates the "Current Stock" and logs a history entry.</li>
                                <li><strong>Pro Tip:</strong> Use the "Usage History" tab to see consumption trends over time.</li>
                            </ul>
                        </Card>
                    </section>

                    <section id="scenario-payroll" className="scroll-mt-20">
                        <h2 className="text-2xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                            <FileText className="h-6 w-6" /> 4. Scenario: Payroll & Paychecks
                        </h2>
                        <Card className="bg-zinc-900/50 border-zinc-800 p-6 print:border print:bg-transparent print:shadow-none">
                            <h3 className="text-xl font-semibold text-white mb-2 print:text-black">Tracking Pay</h3>
                            <ul className="list-disc pl-5 space-y-2 text-zinc-300 mb-6 print:text-black">
                                <li><strong>Completed Jobs:</strong> When a job is marked "Finished" in the Service Checklist, it appears in Payroll as an "Unpaid Job".</li>
                                <li>Go to <strong>Finance & Sales &gt; Payroll</strong>.</li>
                                <li>Expand <strong>"Unpaid Completed Jobs"</strong> to see pending revenue. Click "Add" to move a job to the current Pay Worksheet.</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-white mb-2 print:text-black">Writing Checks</h3>
                            <ul className="list-disc pl-5 space-y-2 text-zinc-300 print:text-black">
                                <li>In the <strong>Payroll Worksheet</strong>, you can also add manual "Hours" (hourly pay) or "Custom" payments (bonuses).</li>
                                <li>Once the worksheet lists all items for an employee, verify the Total.</li>
                                <li>Click <strong>"Write Check"</strong>.</li>
                                <li>This generates a PDF Pay Stub/Check, marks the items as "Paid", and moves them to History.</li>
                                <li>Review past payments in the <strong>"History & Reports"</strong> tab.</li>
                            </ul>
                        </Card>
                    </section>

                    <section id="scenario-estimate" className="scroll-mt-20">
                        <h2 className="text-2xl font-bold text-orange-400 mb-4 flex items-center gap-2">
                            <FileText className="h-6 w-6" /> 5. Scenario: Creating Estimates
                        </h2>
                        <Card className="bg-zinc-900/50 border-zinc-800 p-6 print:border print:bg-transparent print:shadow-none">
                            <ul className="list-disc pl-5 space-y-2 text-zinc-300 print:text-black">
                                <li>Navigate to <strong>Finance & Sales &gt; Estimates</strong>.</li>
                                <li>Click "New Estimate".</li>
                                <li>Enter Customer Info and Add Line Items (Services).</li>
                                <li>Save. You can now:
                                    <ul className="list-disc pl-5 mt-1">
                                        <li><strong>Generate PDF:</strong> Send to client.</li>
                                        <li><strong>Convert to Invoice:</strong> If the client accepts, click "Convert" to move it to Invoicing/Jobs immediately.</li>
                                    </ul>
                                </li>
                            </ul>
                        </Card>
                    </section>

                    <section id="scenario-employee" className="scroll-mt-20">
                        <h2 className="text-2xl font-bold text-indigo-400 mb-4 flex items-center gap-2">
                            <FileText className="h-6 w-6" /> 6. Scenario: Employee Training
                        </h2>
                        <Card className="bg-zinc-900/50 border-zinc-800 p-6 print:border print:bg-transparent print:shadow-none">
                            <ul className="list-disc pl-5 space-y-2 text-zinc-300 print:text-black">
                                <li><strong>New Hires:</strong> Direct them to the "Staff Portal" or "Employee Dashboard".</li>
                                <li><strong>Employee Handbook:</strong> Available in the Training Hub. Covers policies and safety.</li>
                                <li><strong>Training Manual & Exam:</strong> Employees should study the "Quick Detailing Manual" and then take the "Exam".</li>
                                <li><strong>Certification:</strong> Upon passing, a decorative Certificate is generated. Admins can track progress in "Company Employees".</li>
                            </ul>
                        </Card>
                    </section>

                    <section id="ai-assistant" className="scroll-mt-20">
                        <h2 className="text-2xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                            <Sparkles className="h-6 w-6" /> 7. Scenario: Chemical AI Consultant
                        </h2>
                        <Card className="bg-zinc-900/50 border-zinc-800 p-6 print:border print:bg-transparent print:shadow-none">
                            <p className="mb-4 text-zinc-300 print:text-black">
                                The Chemical AI is more than a chatbot; it is a logic engine that understands substrate chemistry and surfactant profiles. It is designed to act as a technical guide during complex cleaning tasks.
                            </p>
                            <h3 className="text-xl font-semibold text-white mb-2 print:text-black">Technical Query Patterns:</h3>
                            <ul className="list-disc pl-5 space-y-2 text-zinc-300 mb-6 print:text-black">
                                <li><strong>Comparisons:</strong> "Can I use [X] instead of [Y] for [Task]?" (Analyzes Ph-levels and safety).</li>
                                <li><strong>Safety:</strong> "Is it safe to use [Product] on [Paint/Metal/Leather]?" (Triggers substrate-specific warnings).</li>
                                <li><strong>Assessment:</strong> "Explain how to assess [Severity]?" (Teaches the Baggie Test and Traffic Film diagnostics).</li>
                                <li><strong>Direct Mapping:</strong> "Show me the best chemical from my stock for [Contaminant]." (Returns instant inventory matches).</li>
                            </ul>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase border-t border-zinc-800 pt-4">
                                <Info className="h-3 w-3 text-purple-400" /> Pattern Tip: Always mention the Substrate and Contaminant for 100% accurate reasoning.
                            </div>
                        </Card>
                    </section>

                    <section id="blog-ai" className="scroll-mt-20">
                        <h2 className="text-2xl font-bold text-indigo-400 mb-4 flex items-center gap-2">
                            <Sparkles className="h-6 w-6" /> 8. ✨ Blog AI Content Strategist (Admin Only)
                        </h2>
                        <Card className="bg-zinc-900/50 border-zinc-800 p-6 print:border print:bg-transparent print:shadow-none">
                            <p className="mb-4 text-zinc-300 print:text-black">
                                The <strong>AI Content Strategist</strong> is a built-in writing assistant inside the Prime Blog. It helps you generate viral titles, engaging story drafts, and social media hooks for any detailing job — directly from the Elite Story Master.
                            </p>
                            <h3 className="text-xl font-semibold text-white mb-2 print:text-black">How to Access</h3>
                            <ul className="list-disc pl-5 space-y-2 text-zinc-300 mb-4 print:text-black">
                                <li>Navigate to <strong>Prime Blog</strong> (the Elite Story Master page).</li>
                                <li>Click the <strong>✨ Sparkles button</strong> in the top-right toolbar (admin only).</li>
                                <li>The AI Content Strategist modal opens.</li>
                            </ul>
                            <h3 className="text-xl font-semibold text-white mb-2 print:text-black">Step-by-Step Workflow</h3>
                            <ul className="list-disc pl-5 space-y-2 text-zinc-300 mb-4 print:text-black">
                                <li><strong>Step 1:</strong> Open or create a blog post first — click "SHARE YOUR WORK".</li>
                                <li><strong>Step 2:</strong> Click the ✨ AI button while the post editor is open.</li>
                                <li><strong>Step 3:</strong> Choose a generation type:
                                    <ul className="list-disc pl-5 mt-1">
                                        <li><strong>💡 Viral Titles</strong> — Generates an attention-grabbing headline.</li>
                                        <li><strong>📄 Story Draft</strong> — Writes a full engaging post description.</li>
                                        <li><strong>⭐ Social Hook</strong> — Creates a punchy caption for Facebook/Instagram.</li>
                                    </ul>
                                </li>
                                <li><strong>Step 4:</strong> Or type a custom job description in the "Custom Request" field (e.g. "Black BMW M5, paint correction, heavy overspray") and hit Send.</li>
                                <li><strong>Step 5:</strong> Review the AI suggestion in the output box.</li>
                                <li><strong>Step 6:</strong> Click <strong>"APPLY TO POST"</strong> — it fills the Description field in your open post editor.</li>
                                <li><strong>Step 7:</strong> Save/Publish your post to make it live.</li>
                            </ul>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase border-t border-zinc-800 pt-4">
                                <Info className="h-3 w-3 text-indigo-400" /> TIP: The AI suggestion is NOT saved until you Apply it and then Save your post.
                            </div>
                        </Card>
                    </section>

                    <section id="social-blast" className="scroll-mt-20">
                        <h2 className="text-2xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                            <Rocket className="h-6 w-6" /> 9. 🚀 Social Blast Engine (Admin Only)
                        </h2>
                        <Card className="bg-zinc-900/50 border-zinc-800 p-6 print:border print:bg-transparent print:shadow-none space-y-6">
                            <p className="text-zinc-300 print:text-black">
                                The <strong>Social Blast Engine</strong> lets you push any blog post directly to your social media accounts — Facebook Business Page, Instagram, TikTok, or any custom platform — without leaving the Prime Blog.
                            </p>

                            <div>
                                <h3 className="text-xl font-semibold text-white mb-2 print:text-black flex items-center gap-2"><Facebook className="w-5 h-5 text-[#1877F2]" /> Facebook Business Page (Real Posting)</h3>
                                <ul className="list-disc pl-5 space-y-2 text-zinc-300 print:text-black">
                                    <li>Click the <strong>🚀 Rocket button</strong> on any blog post card (admin only).</li>
                                    <li>Select the <strong>Facebook</strong> tab.</li>
                                    <li>First-time only: Click <strong>⚙️ Settings</strong> and enter:
                                        <ul className="list-disc pl-5 mt-1">
                                            <li><strong>Page ID:</strong> Facebook Business Page → About → Page ID</li>
                                            <li><strong>Access Token:</strong> Go to <strong>developers.facebook.com/tools/explorer</strong> → Select your App → Select your Page → Generate Token → grant <em>pages_manage_posts</em> permission</li>
                                            <li><strong>Page Name:</strong> Display name for your reference</li>
                                        </ul>
                                    </li>
                                    <li>The <strong>"Save as Draft" toggle is ON by default</strong> — your post goes to Facebook as a Draft. Nothing is published until YOU decide in Facebook Business Suite.</li>
                                    <li>Edit the post message (pre-filled with your blog title, description, link, and hashtags).</li>
                                    <li>Click <strong>"SAVE TO FACEBOOK DRAFTS"</strong>.</li>
                                    <li>Go to <strong>Facebook Business Suite → Content → Drafts</strong> to review, edit, and publish when ready.</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-xl font-semibold text-white mb-2 print:text-black flex items-center gap-2"><Instagram className="w-5 h-5 text-[#E4405F]" /> Instagram & <Music className="w-5 h-5" /> TikTok</h3>
                                <ul className="list-disc pl-5 space-y-2 text-zinc-300 print:text-black">
                                    <li>Select the <strong>Instagram</strong> or <strong>TikTok</strong> tab.</li>
                                    <li>Edit the post message if needed.</li>
                                    <li>Click the platform button — your message is <strong>automatically copied to clipboard</strong> and the platform opens in a new tab.</li>
                                    <li>Paste the caption into your post on Instagram/TikTok and publish when ready.</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-xl font-semibold text-white mb-2 print:text-black">Adding Custom Platforms (Twitter, Pinterest, etc.)</h3>
                                <ul className="list-disc pl-5 space-y-2 text-zinc-300 print:text-black">
                                    <li>In the Social Blast modal, click <strong>"+ Add Platform"</strong>.</li>
                                    <li>Enter the platform name and its compose/upload URL.</li>
                                    <li>Hit Add — it saves permanently and works like Instagram/TikTok.</li>
                                </ul>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase border-t border-zinc-800 pt-4">
                                <Info className="h-3 w-3 text-blue-400" /> TIP: Click the ❓ help icon inside the Social Blast modal for quick step-by-step instructions at any time.
                            </div>
                        </Card>
                    </section>

                    <section id="visual-architect" className="scroll-mt-20">
                        <h2 className="text-2xl font-bold text-amber-400 mb-4 flex items-center gap-2">
                            <Newspaper className="h-6 w-6" /> 11. 🛠️ Visual Architect & Activity Log
                        </h2>
                        <Card className="bg-zinc-900/50 border-zinc-800 p-6 print:border print:bg-transparent print:shadow-none space-y-6">
                            <p className="text-zinc-300 print:text-black">
                                The <strong>Visual Architect</strong> is your command center for managing the Prime Blog. It allows you to reorder posts, use AI for quick edits, push posts to social media, and track every single action taken on your content.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <h3 className="text-sm font-black uppercase text-white flex items-center gap-2 mb-2">
                                        <GripVertical className="w-4 h-4 text-zinc-500" /> Reordering Posts
                                    </h3>
                                    <p className="text-xs text-zinc-400 leading-relaxed">
                                        Simply grab the drag handle (vertical dots) and move any post to change its front-page position. Click <strong>"SAVE ORDER"</strong> to apply changes.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-sm font-black uppercase text-white flex items-center gap-2 mb-2">
                                        <HistoryIcon className="w-4 h-4 text-amber-400" /> Activity History
                                    </h3>
                                    <p className="text-xs text-zinc-400 leading-relaxed">
                                        Click the <strong>HISTORY</strong> button to see a full log of every edit, social blast, publication, and pin. Filter by action type to find exactly what you're looking for.
                                    </p>
                                </div>
                            </div>

                            <Separator className="bg-zinc-800" />

                            <div>
                                <h3 className="text-sm font-black uppercase text-white flex items-center gap-2 mb-4">
                                    Icon Actions (On Each Post)
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex gap-4 items-start">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                                            <Sparkles className="w-4 h-4 text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-white">AI WRITING ASSISTANT</p>
                                            <p className="text-[10px] text-zinc-500">Opens the AI Strategist for this specific post to generate titles or descriptions.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 items-start">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                                            <Rocket className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-white">SOCIAL BLAST</p>
                                            <p className="text-[10px] text-zinc-500">Push this post directly to Facebook, Instagram, or TikTok.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 items-start">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700">
                                            <Edit2 className="w-4 h-4 text-zinc-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-white">QUICK EDIT</p>
                                            <p className="text-[10px] text-zinc-500">Modify the post title, category, and content without leaving the page.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase border-t border-zinc-800 pt-4">
                                <Info className="h-3 w-3 text-amber-400" /> TIP: Pin posts to keep them at the top of your feed regardless of the sort order.
                            </div>
                        </Card>
                    </section>

                    <section id="admin-workflow" className="scroll-mt-20">
                        <h2 className="text-2xl font-bold text-red-400 mb-4 flex items-center gap-2">
                            <FileText className="h-6 w-6" /> 10. Admin Workflows
                        </h2>
                        <Card className="bg-zinc-900/50 border-zinc-800 p-6 print:border print:bg-transparent print:shadow-none">
                            <h3 className="text-xl font-semibold text-white mb-2 print:text-black">Danger Zone & Settings</h3>
                            <p className="text-zinc-300 mb-4 print:text-black">Navigate to <strong>Settings</strong> to manage:</p>
                            <ul className="list-disc pl-5 space-y-2 text-zinc-300 print:text-black">
                                <li><strong>Data Reset:</strong> "Danger Zone" allows clearing local app snapshots or factory resetting the browser's persistent storage (Password Protected).</li>
                            </ul>
                        </Card>
                    </section>

                    <section id="technical-reference" className="scroll-mt-20">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <h2 className="text-2xl font-bold text-sky-400 flex items-center gap-2">
                                <BookOpen className="h-6 w-6" /> 12. 📚 Technical Reference Guide
                            </h2>
                            <div className="relative group flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-sky-400 transition-colors" />
                                <Input 
                                    placeholder="Search 50+ technical topics..." 
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
                        
                        <Card className="bg-zinc-900/50 border-zinc-800 p-6 print:border print:bg-transparent print:shadow-none space-y-6">
                            <p className="text-zinc-400 text-sm italic">
                                This section contains the complete "Source of Truth" technical documentation from the main help guide. Use the search bar above to drill down into specific details.
                            </p>

                            <Accordion type="single" collapsible className="space-y-3">
                                {filteredTopics.map((topic, idx) => (
                                    <AccordionItem key={topic.id} value={topic.id} className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/30">
                                        <AccordionTrigger className="px-5 py-4 hover:bg-zinc-800/50 hover:no-underline text-left">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center border border-sky-500/20 text-sky-400 font-black text-xs">
                                                    {idx + 1}
                                                </div>
                                                <div className="space-y-0.5">
                                                    <div className="text-sm font-black uppercase tracking-tight text-white">{topic.title}</div>
                                                    <div className="text-[10px] text-zinc-500 font-medium line-clamp-1">{topic.summary}</div>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-5 pb-5 pt-2 text-zinc-300 leading-relaxed space-y-4">
                                            <div className="text-xs font-black text-sky-500/70 mb-2 flex items-center gap-2">
                                                <Info className="w-3 h-3" /> TECHNICAL BRIEFING
                                            </div>
                                            {topic.content.map((p, i) => (
                                                <p key={i} className="text-sm">{p}</p>
                                            ))}
                                            {topic.route && (
                                                <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                                                    <Badge variant="outline" className="text-[9px] border-zinc-700 text-zinc-500 font-mono">
                                                        Ref: {topic.route}
                                                    </Badge>
                                                    <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black text-sky-400 hover:text-white hover:bg-sky-500 mr-1">
                                                        <ExternalLink className="w-3 h-3 mr-1" /> JUMP TO SECTION
                                                    </Button>
                                                </div>
                                            )}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>

                            {filteredTopics.length === 0 && (
                                <div className="py-20 text-center border-2 border-dashed border-zinc-800 rounded-3xl">
                                    <Search className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">No matching technical topics found</p>
                                </div>
                            )}
                        </Card>
                    </section>

                    <section id="tips" className="scroll-mt-20">
                        <h2 className="text-2xl font-bold text-pink-400 mb-4 flex items-center gap-2">
                            <FileText className="h-6 w-6" /> 9. Best Practices
                        </h2>
                        <Card className="bg-zinc-900/50 border-zinc-800 p-6 print:border print:bg-transparent print:shadow-none">
                            <ul className="list-disc pl-5 space-y-2 text-zinc-300 print:text-black">
                                <li><strong>Sync:</strong> Always ensure you have internet connection for initial login, but the app works offline for Checklists using local storage.</li>
                                <li><strong>Daily Close:</strong> Check "Real-time Alerts" on the Dashboard at the end of the day to ensure no unpaid invoices or low stock warnings are missed.</li>
                                <li><strong>PDFs:</strong> All generated PDFs are saved to the "File Manager". Check there if you lose a document.</li>
                            </ul>
                        </Card>
                    </section>

                    <div className="h-20"></div>
                </div>
            </div>
        </div>
    );
}
