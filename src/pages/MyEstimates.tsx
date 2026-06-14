import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSupabaseEstimates } from "@/lib/supa-data";
import { FileBarChart, Eye, Download } from "lucide-react";
import jsPDF from "jspdf";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import logo from "@/assets/pds-final-logo.png";
import type { Estimate } from "@/types/estimate";

const MyEstimates = () => {
    const [estimates, setEstimates] = useState<Estimate[]>([]);
    const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const userEstimates = await getSupabaseEstimates(true);
            setEstimates(userEstimates);
        } catch (error) {
            console.error('Error loading estimates:', error);
            toast({
                title: "Error loading data",
                description: "Problem loading estimates.",
                variant: "destructive"
            });
        }
    };

    const downloadEstimate = (estimate: Estimate) => {
        const doc = new jsPDF();
        
        try {
            doc.addImage(logo, 'PNG', 15, 10, 35, 35);
        } catch (e) {
            console.warn("Logo failed to load for PDF", e);
        }

        doc.setFontSize(18);
        doc.text("Prime Auto Detail", 105, 25, { align: "center" });
        doc.setFontSize(12);
        doc.text(`Estimate #${estimate.id ? estimate.id.substring(0, 8) : 'N/A'}`, 105, 30, { align: "center" });
        doc.text(`Date: ${estimate.date}`, 20, 50);
        doc.text(`Customer: ${estimate.customerName}`, 20, 60);
        doc.text(`Vehicle: ${estimate.vehicle}`, 20, 70);

        let y = 85;
        doc.text("Services:", 20, y);
        y += 10;
        estimate.services.forEach((s) => {
            doc.text(`${s.name}: $${s.price.toFixed(2)}`, 30, y);
            y += 8;
        });

        y += 5;
        doc.setFontSize(14);
        doc.text(`Total Estimate: $${estimate.total.toFixed(2)}`, 20, y);

        doc.save(`Estimate_${estimate.date}.pdf`);
    };

    return (
        <div className="min-h-screen bg-background">
            <PageHeader title="My Estimates" />
            <main className="container mx-auto px-4 py-8 max-w-4xl animate-fade-in">
                <Card className="p-6 border-border relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 pointer-events-none" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-full bg-blue-500/10">
                                <FileBarChart className="h-6 w-6 text-blue-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-foreground">All Estimates</h2>
                        </div>
                        {estimates.length === 0 ? (
                            <p className="text-muted-foreground p-4 text-center border rounded-md border-dashed">No estimates available.</p>
                        ) : (
                            <div className="space-y-3">
                                {estimates.map(est => (
                                    <div key={est.id} className="p-4 bg-background/50 rounded border border-border">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-semibold text-foreground">Estimate on {est.date}</h3>
                                                <p className="text-sm text-muted-foreground">{est.vehicle}</p>
                                                <p className="text-lg font-bold text-primary mt-1">${est.total.toFixed(2)}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="icon" variant="outline" onClick={() => setSelectedEstimate(est)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="outline" onClick={() => downloadEstimate(est)}>
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

            {/* Estimate Detail Dialog */}
            <Dialog open={!!selectedEstimate} onOpenChange={() => setSelectedEstimate(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Estimate Details</DialogTitle>
                    </DialogHeader>
                    {selectedEstimate && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Date</p>
                                    <p className="font-medium">{selectedEstimate.date}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Vehicle</p>
                                    <p className="font-medium">{selectedEstimate.vehicle}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-2">Estimated Services</p>
                                <div className="space-y-2">
                                    {selectedEstimate.services.map((s, idx) => (
                                        <div key={idx} className="flex justify-between p-2 bg-background/50 rounded">
                                            <span>{s.name}</span>
                                            <span className="font-semibold">${s.price.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="border-t pt-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-bold">Estimated Total</span>
                                    <span className="text-2xl font-bold text-primary">${selectedEstimate.total.toFixed(2)}</span>
                                </div>
                            </div>
                            <Button onClick={() => downloadEstimate(selectedEstimate)} className="w-full">
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

export default MyEstimates;
