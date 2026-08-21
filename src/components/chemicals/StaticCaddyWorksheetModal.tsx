import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Printer, Download, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CaddySlot {
    slot: number | string;
    name: string;
    ratio: string;
    purpose: string;
}

interface CaddyData {
    interior: CaddySlot[];
    exterior: CaddySlot[];
}

const DEFAULT_INTERIOR: CaddySlot[] = [
    { slot: 1, name: "Pink Perfection", ratio: "10:1", purpose: "Standard Interior Plastics/Vinyl" },
    { slot: 2, name: "Pink Perfection", ratio: "4:1", purpose: "Heavy Interior Cleaner" },
    { slot: 3, name: "Carpet Bomber", ratio: "7:1", purpose: "Standard Fabric/Carpet/Seats" },
    { slot: 4, name: "Carpet Bomber", ratio: "5:1", purpose: "Heavy Fabric/Carpet" },
    { slot: 5, name: "P&S Xpress", ratio: "3:1", purpose: "Light Satin Finish" },
    { slot: 6, name: "P&S Xpress", ratio: "1:1", purpose: "Strong Satin Finish" },
    { slot: 7, name: "Terminator", ratio: "RTU", purpose: "Odors & Stains" },
    { slot: 8, name: "Dirt Buster", ratio: "10:1", purpose: "General Interior Cleaner" },
    { slot: 'Extra 1', name: "", ratio: "", purpose: "" },
    { slot: 'Extra 2', name: "", ratio: "", purpose: "" }
];

const DEFAULT_EXTERIOR: CaddySlot[] = [
    { slot: 1, name: "Dark Fury", ratio: "4:1", purpose: "Wheels & Tires Cleaner (All Levels)" },
    { slot: 2, name: "Road Warrior", ratio: "4:1", purpose: "Bug & Grime Pre-Treat" },
    { slot: 3, name: "Formula 4", ratio: "20:1", purpose: "Drying Aid" },
    { slot: 4, name: "Spray Wax", ratio: "RTU", purpose: "Paint Protection & Shine" },
    { slot: 5, name: "Aqua Gloss", ratio: "4:1", purpose: "Standard Tire Dressing" },
    { slot: 6, name: "Meguiar's APC", ratio: "4:1", purpose: "Heavy Degreaser (Engine Bay)" },
    { slot: 7, name: "Dirt Buster", ratio: "7:1", purpose: "Exterior General Cleaner" },
    { slot: 8, name: "Cover All", ratio: "RTU", purpose: "Tire Dressing (Aerosol)" },
    { slot: 'Extra 1', name: "", ratio: "", purpose: "" },
    { slot: 'Extra 2', name: "", ratio: "", purpose: "" }
];

const DEFAULT_DATA: CaddyData = {
    interior: DEFAULT_INTERIOR,
    exterior: DEFAULT_EXTERIOR
};

export function StaticCaddyWorksheetModal({
    open,
    onOpenChange
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [data, setData] = useState<CaddyData>(DEFAULT_DATA);
    const [isSaving, setIsSaving] = useState(false);
    const [showExtraSlots, setShowExtraSlots] = useState(false);

    useEffect(() => {
        if (open) {
            const saved = localStorage.getItem('static-caddy-worksheet-data');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    // Legacy migration: if they have 8 slots, add the 2 extra blanks
                    if (parsed.interior.length === 8) {
                        parsed.interior.push(
                            { slot: 'Extra 1', name: "", ratio: "", purpose: "" },
                            { slot: 'Extra 2', name: "", ratio: "", purpose: "" }
                        );
                    }
                    if (parsed.exterior.length === 8) {
                        parsed.exterior.push(
                            { slot: 'Extra 1', name: "", ratio: "", purpose: "" },
                            { slot: 'Extra 2', name: "", ratio: "", purpose: "" }
                        );
                    }
                    setData(parsed);
                } catch (e) {
                    console.error("Failed to parse saved caddy worksheet data:", e);
                    setData(DEFAULT_DATA);
                }
            } else {
                setData(DEFAULT_DATA);
            }
        }
    }, [open]);

    const handleSave = () => {
        setIsSaving(true);
        try {
            localStorage.setItem('static-caddy-worksheet-data', JSON.stringify(data));
            toast({
                title: "Worksheet Saved",
                description: "Your caddy worksheet has been saved successfully.",
                className: "bg-green-600 text-white"
            });
        } catch (e) {
            console.error("Failed to save:", e);
            toast({
                title: "Save Failed",
                description: "Failed to save the worksheet data.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        if (window.confirm("Are you sure you want to reset to the default seed data? All custom edits will be lost.")) {
            setData(DEFAULT_DATA);
            localStorage.setItem('static-caddy-worksheet-data', JSON.stringify(DEFAULT_DATA));
            toast({
                title: "Reset Complete",
                description: "Worksheet has been restored to default values.",
            });
        }
    };

    const handleGeneratePdf = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Caddy Quick-Reference Worksheet", 14, 22);
        doc.setFontSize(10);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 22);

        let currentY = 35;

        // Interior Caddy
        doc.setFontSize(13);
        doc.setTextColor(147, 51, 234);
        doc.text("Interior Caddy", 14, currentY);
        
        const interiorDataToPrint = data.interior.slice(0, 8);

        autoTable(doc, {
            startY: currentY + 5,
            head: [['Slot #', 'Chemical Name', 'Dilution Ratio', 'Purpose']],
            body: interiorDataToPrint.map(item => [
                item.slot.toString(),
                item.name,
                item.ratio,
                item.purpose
            ]),
            theme: 'grid',
            headStyles: { fillColor: [147, 51, 234], textColor: [255, 255, 255], fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 20, halign: 'center' },
                1: { cellWidth: 70 },
                2: { cellWidth: 35 },
                3: { cellWidth: 'auto' }
            },
            styles: { fontSize: 9, cellPadding: 4, textColor: [30, 30, 30] },
            alternateRowStyles: { fillColor: [249, 250, 251] },
        });

        let finalY = (doc as any).lastAutoTable.finalY;
        if (showExtraSlots) {
            const ex1 = data.interior[8];
            const ex2 = data.interior[9];
            const parts = [];
            if (ex1.name) parts.push(`[Extra 1] ${ex1.name} ${ex1.ratio ? `(${ex1.ratio})` : ''} ${ex1.purpose ? `- ${ex1.purpose}` : ''}`);
            if (ex2.name) parts.push(`[Extra 2] ${ex2.name} ${ex2.ratio ? `(${ex2.ratio})` : ''} ${ex2.purpose ? `- ${ex2.purpose}` : ''}`);
            
            if (parts.length > 0) {
                finalY += 6;
                doc.setFontSize(8);
                doc.setTextColor(120, 120, 120);
                doc.text(`* Additional Items: ${parts.join('  |  ')}`, 14, finalY);
            }
        }

        // Exterior Caddy on the same page
        currentY = finalY + 15;

        doc.setFontSize(13);
        doc.setTextColor(59, 130, 246);
        doc.text("Exterior Caddy", 14, currentY);

        const exteriorDataToPrint = data.exterior.slice(0, 8);

        autoTable(doc, {
            startY: currentY + 5,
            head: [['Slot #', 'Chemical Name', 'Dilution Ratio', 'Purpose']],
            body: exteriorDataToPrint.map(item => [
                item.slot.toString(),
                item.name,
                item.ratio,
                item.purpose
            ]),
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 20, halign: 'center' },
                1: { cellWidth: 70 },
                2: { cellWidth: 35 },
                3: { cellWidth: 'auto' }
            },
            styles: { fontSize: 9, cellPadding: 4, textColor: [30, 30, 30] },
            alternateRowStyles: { fillColor: [249, 250, 251] },
        });

        let extFinalY = (doc as any).lastAutoTable.finalY;
        if (showExtraSlots) {
            const ex1 = data.exterior[8];
            const ex2 = data.exterior[9];
            const parts = [];
            if (ex1.name) parts.push(`[Extra 1] ${ex1.name} ${ex1.ratio ? `(${ex1.ratio})` : ''} ${ex1.purpose ? `- ${ex1.purpose}` : ''}`);
            if (ex2.name) parts.push(`[Extra 2] ${ex2.name} ${ex2.ratio ? `(${ex2.ratio})` : ''} ${ex2.purpose ? `- ${ex2.purpose}` : ''}`);
            
            if (parts.length > 0) {
                extFinalY += 6;
                doc.setFontSize(8);
                doc.setTextColor(120, 120, 120);
                doc.text(`* Additional Items: ${parts.join('  |  ')}`, 14, extFinalY);
            }
        }

        doc.save(`Static_Caddy_Worksheet_${new Date().toISOString().split('T')[0]}.pdf`);
        toast({
            title: "PDF Generated",
            description: "Your printable Caddy Worksheet is ready.",
            className: "bg-fuchsia-600 text-white"
        });
    };

    const updateSlot = (caddy: 'interior' | 'exterior', index: number, field: keyof CaddySlot, value: string) => {
        setData(prev => {
            const arr = [...prev[caddy]];
            arr[index] = { ...arr[index], [field]: value };
            return { ...prev, [caddy]: arr };
        });
    };

    const renderTable = (caddy: 'interior' | 'exterior', title: string, colorClass: string) => {
        const items = showExtraSlots ? data[caddy] : data[caddy].slice(0, 8);
        return (
            <div className="space-y-3">
                <h3 className={`text-lg font-bold ${colorClass} flex items-center gap-2`}>
                    {title}
                </h3>
                <div className="rounded-md border border-zinc-800 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
                            <tr>
                                <th className="px-4 py-2 font-medium w-16 text-center">Slot</th>
                                <th className="px-4 py-2 font-medium w-[30%]">Chemical Name</th>
                                <th className="px-4 py-2 font-medium w-[20%]">Dilution Ratio</th>
                                <th className="px-4 py-2 font-medium">Purpose</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800 bg-zinc-950/50">
                            {items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-zinc-900/50 transition-colors">
                                    <td className="px-4 py-2 text-center font-bold text-zinc-500">
                                        {item.slot}
                                    </td>
                                    <td className="px-2 py-1">
                                        <Input
                                            value={item.name}
                                            onChange={(e) => updateSlot(caddy, idx, 'name', e.target.value)}
                                            className="h-8 bg-zinc-900/50 border-zinc-800 text-white"
                                        />
                                    </td>
                                    <td className="px-2 py-1">
                                        <Input
                                            value={item.ratio}
                                            onChange={(e) => updateSlot(caddy, idx, 'ratio', e.target.value)}
                                            className="h-8 bg-zinc-900/50 border-zinc-800 text-white"
                                        />
                                    </td>
                                    <td className="px-2 py-1">
                                        <Input
                                            value={item.purpose}
                                            onChange={(e) => updateSlot(caddy, idx, 'purpose', e.target.value)}
                                            className="h-8 bg-zinc-900/50 border-zinc-800 text-white"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-zinc-950 border-zinc-800 text-white p-0">
                <DialogHeader className="p-6 pb-4 border-b border-zinc-800 shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">
                                Static Caddy Worksheet
                            </DialogTitle>
                            <p className="text-sm text-zinc-400 mt-1">
                                Independent fallback reference sheet. These edits are isolated from the main inventory.
                            </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <Button
                                variant="outline"
                                onClick={() => setShowExtraSlots(!showExtraSlots)}
                                className={`h-9 px-3 border-zinc-700 ${showExtraSlots ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
                            >
                                {showExtraSlots ? 'Hide Extra Slots' : 'Show Extra Slots'}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleReset}
                                className="h-9 px-3 border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                            >
                                <RotateCcw className="w-4 h-4 mr-2" /> Reset
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleGeneratePdf}
                                className="h-9 px-3 border-fuchsia-500/30 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400"
                            >
                                <Printer className="w-4 h-4 mr-2" /> PDF
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="h-9 px-4 bg-green-600 hover:bg-green-500 text-white"
                            >
                                <Save className="w-4 h-4 mr-2" /> Save
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 overflow-y-auto space-y-8">
                    {renderTable('interior', 'Interior Caddy', 'text-purple-400')}
                    {renderTable('exterior', 'Exterior Caddy', 'text-blue-400')}
                </div>
            </DialogContent>
        </Dialog>
    );
}
