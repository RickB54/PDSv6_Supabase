import { useState, useRef } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Printer, FileText, ChevronRight, BookOpen } from "lucide-react";

export default function AppManual() {
    const contentRef = useRef<HTMLDivElement>(null);

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
                                    { id: "admin-workflow", label: "Admin Workflows" },
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
                                    { id: "admin-workflow", label: "Admin" },
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
                        <h1 className="text-3xl font-bold mb-2">PDS App Manual</h1>
                        <p className="text-zinc-400 print:text-zinc-600">Comprehensive Workflow Guide & Standard Operating Procedures</p>
                    </div>

                    <section id="intro" className="scroll-mt-20">
                        <h2 className="text-2xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                            <FileText className="h-6 w-6" /> 1. Introduction
                        </h2>
                        <Card className="bg-zinc-900/50 border-zinc-800 p-6 print:border print:bg-transparent print:shadow-none">
                            <p className="mb-4 text-zinc-300 print:text-black">
                                Welcome to the Prime Detail Solutions (PDS) Application Manual. This guide serves as the definitive reference for utilizing the PDS application to manage daily operations, finance, inventory, and staff training.
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

                    <section id="admin-workflow" className="scroll-mt-20">
                        <h2 className="text-2xl font-bold text-red-400 mb-4 flex items-center gap-2">
                            <FileText className="h-6 w-6" /> 7. Admin Workflows
                        </h2>
                        <Card className="bg-zinc-900/50 border-zinc-800 p-6 print:border print:bg-transparent print:shadow-none">
                            <h3 className="text-xl font-semibold text-white mb-2 print:text-black">Danger Zone & Settings</h3>
                            <p className="text-zinc-300 mb-4 print:text-black">Navigate to <strong>Settings</strong> to manage:</p>
                            <ul className="list-disc pl-5 space-y-2 text-zinc-300 print:text-black">
                                <li><strong>Data Reset:</strong> "Danger Zone" allows clearing mock data or factory resetting the app (Password Protected).</li>
                                <li><strong>Mock Data:</strong> Use the "Mock Data System" in Admin Dashboard to seed test jobs/employees for training purposes.</li>
                            </ul>
                        </Card>
                    </section>

                    <section id="tips" className="scroll-mt-20">
                        <h2 className="text-2xl font-bold text-pink-400 mb-4 flex items-center gap-2">
                            <FileText className="h-6 w-6" /> 8. Best Practices
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
