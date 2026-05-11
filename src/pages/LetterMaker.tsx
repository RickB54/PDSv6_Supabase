import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Printer, Save, Sparkles, Loader2, Users, Mail, Calendar } from "lucide-react";
import { getUnifiedCustomers } from "@/lib/customers";
import { Customer } from "@/lib/supa-data";
import { refineTextWithAI } from "@/lib/ai-refiner";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import logo from "@/assets/pds-final-logo.png";
import { cn } from "@/lib/utils";

const LetterMaker = () => {
    const { toast } = useToast();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [isRefining, setIsRefining] = useState(false);

    useEffect(() => {
        const loadCustomers = async () => {
            const custs = await getUnifiedCustomers();
            setCustomers(custs as Customer[]);
        };
        loadCustomers();
    }, []);

    const handleAIEnhance = async () => {
        if (!body.trim()) {
            toast({ title: "No text found", description: "Please enter some text to enhance.", variant: "destructive" });
            return;
        }
        setIsRefining(true);
        try {
            const refined = await refineTextWithAI(body);
            setBody(refined);
            toast({ title: "Text Polished", description: "Your letter has been professionally enhanced." });
        } catch (error) {
            toast({ title: "Error", description: "Failed to enhance text.", variant: "destructive" });
        } finally {
            setIsRefining(false);
        }
    };

    const generatePDF = (action: 'print' | 'download') => {
        const doc = new jsPDF();
        const customer = customers.find(c => c.id === selectedCustomer);
        
        // Standardized Header (from Estimates/Invoices)
        try {
            const logoWidth = 28;
            const logoHeight = 28;
            doc.addImage(logo, 'PNG', 20, 10, logoWidth, logoHeight);
            
            // Contact Info next to logo
            doc.setFontSize(13);
            doc.setTextColor(16, 185, 129); // Emerald color
            doc.setFont("helvetica", "bold");
            doc.text("Rick Berube", 52, 18);
            
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            doc.setFont("helvetica", "normal");
            doc.text("54 Boston Street, Methuen MA 01844", 52, 24);
            doc.text("Rick.PrimeAutoDetail@gmail.com", 52, 29);
            doc.text("978-566-1008", 52, 34);
            
            // Company Name on the Right
            doc.setFontSize(14);
            doc.setTextColor(16, 185, 129);
            doc.setFont("helvetica", "bold");
            doc.text("Prime Auto Detail", 190, 18, { align: "right" });
            
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(11);
            doc.text("Correspondence", 190, 24, { align: "right" });
        } catch (e) {
            console.warn("Header failed", e);
            doc.setFontSize(16);
            doc.text("Prime Auto Detail", 105, 15, { align: "center" });
        }

        const startY = 50;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);

        // Date
        doc.text(`Date: ${new Date(date).toLocaleDateString()}`, 20, startY);

        // Recipient
        if (customer) {
            doc.setFont("helvetica", "bold");
            doc.text("To:", 20, startY + 10);
            doc.setFont("helvetica", "normal");
            doc.text(customer.name, 30, startY + 10);
            if (customer.address) {
                doc.text(customer.address, 30, startY + 16);
            }
        } else {
            doc.text("To: Valued Customer", 20, startY + 10);
        }

        // Subject
        if (subject) {
            doc.setFont("helvetica", "bold");
            doc.text(`Subject: ${subject}`, 20, startY + 28);
            doc.line(20, startY + 30, 190, startY + 30);
        }

        // Body
        doc.setFont("helvetica", "normal");
        const splitText = doc.splitTextToSize(body, 170);
        doc.text(splitText, 20, startY + 40);

        // Footer
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text("Prime Auto Detail - Professional Mobile Detailing Services", 105, pageHeight - 15, { align: "center" });

        if (action === 'download') doc.save(`Letter_${customer?.name || 'Customer'}.pdf`);
        else window.open(doc.output('bloburl'), '_blank');
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <PageHeader title="Company Letter Maker" />
            <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
                <Card className="p-6 bg-zinc-950 border-zinc-800 shadow-xl">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-zinc-400 flex items-center gap-2">
                                    <Users className="h-4 w-4" /> Recipient (Customer/Prospect)
                                </Label>
                                <select 
                                    className="w-full bg-zinc-900 border-zinc-800 rounded-md p-2 text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                                    value={selectedCustomer}
                                    onChange={(e) => setSelectedCustomer(e.target.value)}
                                >
                                    <option value="">Select a Recipient...</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} {c.type ? `(${c.type})` : ''}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400 flex items-center gap-2">
                                    <Calendar className="h-4 w-4" /> Letter Date
                                </Label>
                                <Input 
                                    type="date" 
                                    value={date} 
                                    onChange={(e) => setDate(e.target.value)}
                                    className="bg-zinc-900 border-zinc-800 text-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-zinc-400 flex items-center gap-2">
                                <FileText className="h-4 w-4" /> Subject Line
                            </Label>
                            <Input 
                                placeholder="e.g., Thank You for Your Recent Inquiry" 
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="bg-zinc-900 border-zinc-800 text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label className="text-zinc-400 flex items-center gap-2">
                                    <Mail className="h-4 w-4" /> Letter Body
                                </Label>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={handleAIEnhance}
                                    disabled={isRefining || !body.trim()}
                                    className="h-8 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20"
                                >
                                    {isRefining ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Sparkles className="h-3 w-3 mr-2" />}
                                    AI Professional Refine
                                </Button>
                            </div>
                            <Textarea 
                                placeholder="Start writing your professional message here..."
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                className="min-h-[400px] bg-zinc-900 border-zinc-800 text-white leading-relaxed text-base p-4 focus:ring-1 focus:ring-emerald-500"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-zinc-800">
                            <Button 
                                onClick={() => generatePDF('print')}
                                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
                            >
                                <Printer className="h-4 w-4 mr-2" /> Preview & Print
                            </Button>
                            <Button 
                                onClick={() => generatePDF('download')}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                            >
                                <Save className="h-4 w-4 mr-2" /> Download PDF
                            </Button>
                        </div>
                    </div>
                </Card>

                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 flex gap-4 items-start">
                    <div className="p-2 rounded-full bg-emerald-500/20 text-emerald-500">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="text-emerald-500 font-bold text-sm uppercase tracking-wider">AI Writing Tip</h4>
                        <p className="text-zinc-400 text-sm mt-1">Write your basic thoughts or bullet points first, then use the **AI Professional Refine** button to transform them into a polished corporate letter.</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LetterMaker;
