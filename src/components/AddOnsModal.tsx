import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, X, PlusCircle, CheckCircle2 } from "lucide-react";
import { addOns } from "@/lib/services";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface AddOnsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const AddOnsModal: React.FC<AddOnsModalProps> = ({
    open,
    onOpenChange,
}) => {
    const generatePDF = () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const timestamp = new Date().toLocaleString();

        doc.setFontSize(22);
        doc.setTextColor(220, 38, 38); // Prime Red
        doc.text("PRIME AUTO DETAIL", 105, 20, { align: 'center' });

        doc.setFontSize(16);
        doc.setTextColor(30, 58, 138); // Blue
        doc.text("SERVICE ADD-ONS GUIDE", 105, 30, { align: 'center' });

        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text(`Generated on ${timestamp}`, 200, 10, { align: 'right' });

        let currentY = 45;

        const tableData = addOns.map(addon => [
            addon.name,
            addon.description || "No description provided.",
            `$${addon.basePrice}+`
        ]);

        autoTable(doc, {
            startY: currentY,
            head: [["ADD-ON SERVICE", "DETAILED EXPLANATION", "STARTING PRICE"]],
            body: tableData,
            theme: 'striped',
            headStyles: {
                fillColor: [30, 58, 138],
                textColor: [255, 255, 255],
                fontSize: 10,
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: {
                fontSize: 9,
                cellPadding: 5,
                valign: 'middle'
            },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 45 },
                1: { cellWidth: 110 },
                2: { halign: 'center', cellWidth: 35 }
            },
        });

        doc.save(`Prime_AddOns_Guide_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0 bg-white border-zinc-200 shadow-2xl rounded-3xl">
                <DialogHeader className="p-8 bg-gradient-to-r from-blue-900 to-indigo-950 text-white shrink-0">
                    <div className="flex justify-between items-center">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <PlusCircle className="w-8 h-8 text-blue-400" />
                                <DialogTitle className="text-3xl font-black uppercase tracking-tight">
                                    Service Add-ons
                                </DialogTitle>
                            </div>
                            <p className="text-blue-200 text-sm font-medium uppercase tracking-widest opacity-80">
                                Enhance your detail with professional upgrades
                            </p>
                        </div>
                        <div className="flex gap-3 no-print">
                            <Button variant="outline" onClick={handlePrint} className="bg-white/10 hover:bg-white/20 border-white/20 text-white font-bold uppercase tracking-widest text-[10px] h-10 px-4">
                                <Printer className="w-4 h-4 mr-2" /> Print
                            </Button>
                            <Button onClick={generatePDF} className="bg-red-600 hover:bg-red-500 text-white border-none font-bold uppercase tracking-widest text-[10px] h-10 px-4 shadow-xl">
                                <Download className="w-4 h-4 mr-2" /> PDF
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-auto p-8 space-y-6 bg-zinc-50/50 print:bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {addOns.map((addon) => (
                            <div key={addon.id} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 group">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-lg font-black text-blue-900 uppercase tracking-tight group-hover:text-red-600 transition-colors">
                                        {addon.name}
                                    </h3>
                                    <div className="px-3 py-1 bg-green-50 text-green-700 text-xs font-black rounded-full border border-green-100">
                                        Starting ${addon.basePrice}
                                    </div>
                                </div>
                                <p className="text-zinc-500 text-sm leading-relaxed font-medium">
                                    {addon.description}
                                </p>
                                <div className="mt-auto pt-4 flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Professional Grade Only
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter className="p-6 bg-white border-t border-zinc-100 shrink-0 no-print">
                    <Button variant="ghost" className="font-bold text-zinc-500 hover:text-red-600 uppercase tracking-widest text-xs" onClick={() => onOpenChange(false)}>
                        <X className="w-4 h-4 mr-2" /> Close Guide
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
