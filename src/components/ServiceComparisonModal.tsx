import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Download, Printer, Info, X, Shield } from "lucide-react";
import { toast } from "sonner";
import { servicePackages, getServiceInstructions, ServicePackage } from "@/lib/services";
import jsPDF from "jspdf";
import { autoTable } from "jspdf-autotable";
import { AddOnsModal } from "./AddOnsModal";

interface ServiceComparisonModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const ServiceComparisonModal: React.FC<ServiceComparisonModalProps> = ({
    open,
    onOpenChange,
}) => {
    const [addOnsOpen, setAddOnsOpen] = React.useState(false);
    // Group packages
    const groups = [
        {
            title: "Exterior Comparisons",
            packages: servicePackages.filter(p => p.id.includes("exterior"))
        },
        {
            title: "Interior Comparisons",
            packages: servicePackages.filter(p => p.id.includes("interior"))
        },
        {
            title: "Full Detail Comparisons",
            packages: [
                servicePackages.find(p => p.id === "prime-essential-full")!,
                servicePackages.find(p => p.id === "prime-elite-full")!
            ].filter(Boolean)
        }
    ];

    const generatePDF = () => {
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const timestamp = new Date().toLocaleString();

            doc.setFontSize(22);
            doc.setTextColor(220, 38, 38); // Prime Red
            doc.setFont("helvetica", "bold");
            doc.text("PRIME AUTO DETAIL", 105, 15, { align: 'center' });

            doc.setFontSize(14);
            doc.setTextColor(30, 58, 138); // Blue
            doc.text("SERVICE FEATURE COMPARISON MATRIX", 105, 23, { align: 'center' });

            doc.setFontSize(8);
            doc.setTextColor(120, 120, 120);
            doc.setFont("helvetica", "normal");
            doc.text(`Generated on ${timestamp}`, 200, 10, { align: 'right' });

            let currentY = 32;

            groups.forEach((group, index) => {
                // Category Header
                doc.setFontSize(12);
                doc.setTextColor(220, 38, 38);
                doc.setFont("helvetica", "bold");
                doc.text(`${index + 1}. ${group.title.toUpperCase()}`, 14, currentY);
                currentY += 6;

                const allStepNames = Array.from(new Set(
                    group.packages.flatMap(p => p.steps.map(s => s.name))
                ));

                const tableData = allStepNames.flatMap(stepName => {
                    const pkgStep = group.packages.map(p => p.steps.find(s => s.name === stepName)).find(Boolean);
                    const instructions = pkgStep?.instructions || getServiceInstructions(stepName, pkgStep?.id);

                    const mainRow = [stepName];
                    group.packages.forEach((pkg) => {
                        const hasStep = pkg.steps.some(s => s.name === stepName);
                        mainRow.push(hasStep ? "YES" : "-");
                    });

                    // Sub-row for instructions
                    const instructionRow = [`  > ${instructions}`, ...group.packages.map(() => "")];

                    return [mainRow, instructionRow];
                });

                const head = [["SERVICE FEATURE / STEP", ...group.packages.map(p => p.name.replace('Prime ', ''))]];

                autoTable(doc, {
                    startY: currentY,
                    head: head,
                    body: tableData,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [30, 58, 138],
                        textColor: [255, 255, 255],
                        fontSize: 8,
                        fontStyle: 'bold',
                        halign: 'center'
                    },
                    styles: { fontSize: 7, cellPadding: 2 },
                    columnStyles: {
                        0: { cellWidth: 120 },
                        1: { halign: 'center', fontStyle: 'bold' },
                        2: { halign: 'center', fontStyle: 'bold' }
                    },
                    didParseCell: (data: any) => {
                        // Style instruction rows differently
                        if (data.row.index % 2 !== 0) {
                            data.cell.styles.fontStyle = 'italic';
                            data.cell.styles.textColor = [100, 100, 100];
                            data.cell.styles.fontSize = 6;
                        }
                        // Highlight YES in Emerald
                        if (data.cell.text[0] === 'YES') {
                            data.cell.styles.textColor = [5, 150, 105];
                        }
                    }
                });

                currentY = (doc as any).lastAutoTable.finalY + 15;

                // Prevent category title from being orphaned at bottom
                if (currentY > 250 && index < groups.length - 1) {
                    doc.addPage();
                    currentY = 20;
                }
            });

            doc.save(`Prime_Comparison_Matrix_${new Date().toISOString().split('T')[0]}.pdf`);
            toast.success("Comparison PDF generated successfully");
        } catch (err) {
            console.error("PDF generation error:", err);
            toast.error("Failed to generate PDF. Please try again.");
        }
    };

    const handlePrint = () => {
        const win = window.open('', '_blank');
        if (!win) return;

        let sectionsHtml = "";
        groups.forEach((group, gIdx) => {
            const allStepNames = Array.from(new Set(
                group.packages.flatMap(p => p.steps.map(s => s.name))
            ));

            let tableRows = "";
            allStepNames.forEach(stepName => {
                const pkgStep = group.packages.map(p => p.steps.find(s => s.name === stepName)).find(Boolean);
                const instructions = pkgStep?.instructions || getServiceInstructions(stepName, pkgStep?.id);

                let cellsHtml = "";
                group.packages.forEach(pkg => {
                    const hasStep = pkg.steps.some(s => s.name === stepName);
                    cellsHtml += `<td style="padding:10px;text-align:center;border:1px solid #eee;">${hasStep ? '<span style="color:#059669;font-weight:bold;">YES</span>' : '<span style="color:#e5e7eb;">/</span>'}</td>`;
                });

                tableRows += `
                    <tr style="border-bottom:1px solid #eee;">
                        <td style="padding:10px;border:1px solid #eee;">
                            <div style="font-weight:bold;font-size:13px;color:#1e3a8a;">${stepName}</div>
                            <div style="font-size:10px;color:#666;font-style:italic;margin-top:4px;">&gt; ${instructions}</div>
                        </td>
                        ${cellsHtml}
                    </tr>
                `;
            });

            sectionsHtml += `
                <div style="margin-bottom:40px;page-break-inside:avoid;">
                    <h3 style="color:#dc2626;text-transform:uppercase;font-size:16px;border-bottom:2px solid #dc2626;padding-bottom:5px;margin-bottom:15px;">
                        ${gIdx + 1}. ${group.title}
                    </h3>
                    <table style="width:100%;border-collapse:collapse;border:1px solid #ddd;">
                        <thead>
                            <tr style="background:#1e3a8a;color:white;">
                                <th style="padding:12px;text-align:left;font-size:11px;">SERVICE FEATURE / STEP</th>
                                ${group.packages.map(pkg => `<th style="padding:12px;font-size:11px;">${pkg.name.replace('Prime ', '')}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
            `;
        });

        win.document.write(`
            <html>
                <head>
                    <title>Prime Service Comparisons</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; max-width: 1000px; margin: 0 auto; color: #333; }
                        h1 { color: #dc2626; margin-bottom: 5px; }
                        .subtitle { color: #666; font-size: 14px; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 1px; }
                    </style>
                </head>
                <body>
                    <h1>PRIME AUTO DETAIL</h1>
                    <div class="subtitle">Service Comparison Matrix - Essential vs Elite</div>
                    <div style="font-size:11px;color:#999;margin-bottom:20px;">Generated: ${new Date().toLocaleString()}</div>
                    ${sectionsHtml}
                    <script>window.onload = function(){ window.print(); window.close(); }</script>
                </body>
            </html>
        `);
        win.document.close();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl w-[98vw] h-[95vh] overflow-hidden flex flex-col p-0 bg-zinc-50 border-zinc-200 shadow-2xl rounded-2xl">
                <DialogHeader className="p-6 bg-white border-b border-zinc-200 shrink-0">
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <DialogTitle className="text-3xl font-black text-blue-900 uppercase tracking-tight">
                                Service Comparisons
                            </DialogTitle>
                            <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest">
                                Side-by-side details for Essential vs Elite tiers
                            </p>
                        </div>
                        <div className="flex gap-3 no-print">
                            <Button variant="outline" onClick={() => setAddOnsOpen(true)} className="font-bold uppercase tracking-widest text-xs border-blue-200 text-blue-700 hover:bg-blue-50">
                                <Info className="w-4 h-4 mr-2" /> Show Add-ons
                            </Button>
                            <Button variant="outline" onClick={handlePrint} className="font-bold uppercase tracking-widest text-xs border-zinc-300">
                                <Printer className="w-4 h-4 mr-2" /> Print List
                            </Button>
                            <Button onClick={generatePDF} className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest text-xs shadow-lg ring-offset-2 focus:ring-2 focus:ring-red-500">
                                <Download className="w-4 h-4 mr-2" /> Save to PDF
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-auto p-6 space-y-12 bg-zinc-50 print:p-0 print:space-y-8">
                    {groups.map((group, gIdx) => (
                        <div key={gIdx} className="space-y-4">
                            <h3 className="text-xl font-black text-red-600 uppercase tracking-tighter flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-sm">{gIdx + 1}</span>
                                {group.title}
                            </h3>

                            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm ring-1 ring-zinc-950/5">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-zinc-900 text-white">
                                            <th className="p-4 text-[10px] font-black uppercase tracking-widest">Service Feature / Step</th>
                                            {group.packages.map(pkg => (
                                                <th key={pkg.id} className="p-4 text-[10px] font-black uppercase tracking-widest text-center border-l border-zinc-800">
                                                    {pkg.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100">
                                        {Array.from(new Set(group.packages.flatMap(p => p.steps.map(s => s.name)))).map((stepName, sIdx) => {
                                            const stepObj = group.packages.flatMap(p => p.steps).find(s => s.name === stepName);
                                            return (
                                                <React.Fragment key={sIdx}>
                                                    <tr className="hover:bg-zinc-50 transition-colors">
                                                        <td className="p-4 text-xs font-bold text-zinc-700 leading-tight">
                                                            {stepName}
                                                        </td>
                                                        {group.packages.map(pkg => {
                                                            const hasStep = pkg.steps.some(s => s.name === stepName);
                                                            return (
                                                                <td key={pkg.id} className="p-4 text-center border-l border-zinc-50">
                                                                    {hasStep ? (
                                                                        <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600">
                                                                            <Check className="w-4 h-4 stroke-[3]" />
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-zinc-200">/</span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                    {(stepObj?.instructions || getServiceInstructions(stepName, stepObj?.id)) && (
                                                        <tr className="bg-zinc-50/50">
                                                            <td colSpan={group.packages.length + 1} className="p-4 py-2 text-[10px] text-zinc-500 italic font-medium">
                                                                <div className="flex items-start gap-2 max-w-2xl">
                                                                    <Info className="w-3 h-3 mt-0.5 text-blue-500 shrink-0" />
                                                                    <span>{stepObj?.instructions || getServiceInstructions(stepName, stepObj?.id)}</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 bg-white border-t border-zinc-200 flex justify-end gap-3 shrink-0 no-print">
                    <Button variant="ghost" className="font-bold text-zinc-500" onClick={() => onOpenChange(false)}>
                        <X className="w-4 h-4 mr-2" /> Close Matrix
                    </Button>
                </div>

                <style>{`
                    @media print {
                        .no-print { display: none !important; }
                        body { background: white !important; }
                        * { 
                            -webkit-print-color-adjust: exact !important; 
                            print-color-adjust: exact !important; 
                        }
                    }
                `}</style>
            </DialogContent>
            <AddOnsModal open={addOnsOpen} onOpenChange={setAddOnsOpen} />
        </Dialog>
    );
};
