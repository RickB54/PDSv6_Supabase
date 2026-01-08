import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSupabaseInvoices } from "@/lib/supa-data";
import { FileText, Eye, Download } from "lucide-react";
import jsPDF from "jspdf";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";

interface Invoice {
    id?: string;
    invoiceNumber?: number;
    customerId: string;
    customerName: string;
    vehicle: string;
    services: { name: string; price: number }[];
    total: number;
    date: string;
    paymentStatus?: "unpaid" | "partially-paid" | "paid";
}

const MyInvoices = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const userInvoices = await getSupabaseInvoices(true);
            setInvoices(userInvoices);
        } catch (error) {
            console.error('Error loading invoices:', error);
            toast({
                title: "Error loading data",
                description: "Problem loading invoices.",
                variant: "destructive"
            });
        }
    };

    const downloadInvoice = (invoice: Invoice) => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Prime Auto Detail", 105, 20, { align: "center" });
        doc.setFontSize(12);
        doc.text(`Invoice #${invoice.invoiceNumber || 'N/A'}`, 105, 30, { align: "center" });
        doc.text(`Date: ${invoice.date}`, 20, 50);
        doc.text(`Customer: ${invoice.customerName}`, 20, 60);
        doc.text(`Vehicle: ${invoice.vehicle}`, 20, 70);

        let y = 85;
        doc.text("Services:", 20, y);
        y += 10;
        invoice.services.forEach((s) => {
            doc.text(`${s.name}: $${s.price.toFixed(2)}`, 30, y);
            y += 8;
        });

        y += 5;
        doc.setFontSize(14);
        doc.text(`Total: $${invoice.total.toFixed(2)}`, 20, y);

        doc.save(`Invoice_${invoice.invoiceNumber}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="min-h-screen bg-background">
            <PageHeader title="My Invoices" />
            <main className="container mx-auto px-4 py-8 max-w-4xl animate-fade-in">
                <Card className="p-6 border-border relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 pointer-events-none" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-full bg-purple-500/10">
                                <FileText className="h-6 w-6 text-purple-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-foreground">All Invoices</h2>
                        </div>
                        {invoices.length === 0 ? (
                            <p className="text-muted-foreground p-4 text-center border rounded-md border-dashed">No invoices available.</p>
                        ) : (
                            <div className="space-y-3">
                                {invoices.map(inv => (
                                    <div key={inv.id} className="p-4 bg-background/50 rounded border border-border">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-semibold text-foreground">Invoice #{inv.invoiceNumber}</h3>
                                                <p className="text-sm text-muted-foreground">{inv.date}</p>
                                                <p className="text-lg font-bold text-primary mt-1">${inv.total.toFixed(2)}</p>
                                                <p className={`text-sm font-medium ${(inv.paymentStatus || "unpaid") === "paid" ? "text-success" :
                                                    (inv.paymentStatus || "unpaid") === "partially-paid" ? "text-yellow-500" :
                                                        "text-destructive"
                                                    }`}>
                                                    {(inv.paymentStatus || "unpaid").replace("-", " ").toUpperCase()}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="icon" variant="outline" onClick={() => setSelectedInvoice(inv)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="outline" onClick={() => downloadInvoice(inv)}>
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            </main>

            {/* Invoice Detail Dialog */}
            <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Invoice #{selectedInvoice?.invoiceNumber}</DialogTitle>
                    </DialogHeader>
                    {selectedInvoice && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Date</p>
                                    <p className="font-medium">{selectedInvoice.date}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Vehicle</p>
                                    <p className="font-medium">{selectedInvoice.vehicle}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-2">Services</p>
                                <div className="space-y-2">
                                    {selectedInvoice.services.map((s, idx) => (
                                        <div key={idx} className="flex justify-between p-2 bg-background/50 rounded">
                                            <span>{s.name}</span>
                                            <span className="font-semibold">${s.price.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="border-t pt-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-bold">Total</span>
                                    <span className="text-2xl font-bold text-primary">${selectedInvoice.total.toFixed(2)}</span>
                                </div>
                            </div>
                            <Button onClick={() => downloadInvoice(selectedInvoice)} className="w-full">
                                <Download className="h-4 w-4 mr-2" />
                                Download PDF
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MyInvoices;
