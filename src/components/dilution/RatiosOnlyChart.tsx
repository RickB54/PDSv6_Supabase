import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
    Eye, 
    Smartphone, 
    Printer, 
    Download, 
    Calculator, 
    Table as TableIcon, 
    Plus, 
    Trash2, 
    X,
    ChevronDown,
    Settings2,
    MonitorSmartphone
} from "lucide-react";
import { generateTemplate } from "@/lib/chemical-ai";
import { Input } from "@/components/ui/input";
import localforage from "localforage";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { getReferenceRatios, upsertReferenceRatio, deleteReferenceRatio } from "@/lib/dilution-ratios";

interface RatiosOnlyChartProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    chemicals: any[];
}

const GALLON_KEY = "pds_custom_gallon_v1";

const normalizeRatio = (r: string) => {
    if (!r) return "";
    let normalized = r.trim().toLowerCase();
    if (normalized === 'rtu' || normalized.includes('direct')) return "RTU";
    
    const match = normalized.match(/(\d+)[:/](\d+)/);
    if (match) {
        const p1 = parseInt(match[1]);
        const p2 = parseInt(match[2]);
        if (p1 === 1) return `${p2}:1`;
        if (p2 === 1) return `${p1}:1`;
        return `${p1}:1`;
    }
    return normalized.toUpperCase();
};

const transformRatio = (r: string) => {
    if (!r) return r;
    const normalized = r.trim();
    if (normalized.toLowerCase() === 'rtu' || normalized.toLowerCase().includes('direct')) return normalized;
    const match = normalized.match(/^1[:/](\d+)$/);
    if (match) return `${match[1]}:1`;
    return normalized;
};

const calculateAmounts = (ratioStr: string, bottleOz: number) => {
    const normalized = ratioStr?.toLowerCase().trim();
    if (!normalized) return null;
    let parts = 0;
    if (normalized === 'rtu' || normalized.includes('direct') || normalized === '1:0' || normalized === '0:1' || normalized === '1/0' || normalized === '0/1') {
        const chem = bottleOz;
        const water = 0;
        return { 
            chem: chem.toFixed(1).replace(/\.0$/, ''), 
            water: "0.0",
            mlChem: Math.round(chem * 29.5735),
            mlWater: 0
        };
    } else {
        const match = normalized.match(/(\d+)[:\/]1/);
        if (match) {
            parts = parseInt(match[1]);
        } else {
            const matchReverse = normalized.match(/1[:\/](\d+)/);
            if (matchReverse) parts = parseInt(matchReverse[1]);
            else return null;
        }
    }
    const totalParts = parts + 1;
    const chemValue = bottleOz / totalParts;
    const waterValue = bottleOz - chemValue;
    
    return {
        chem: chemValue.toFixed(1).replace(/\.0$/, ''),
        water: waterValue.toFixed(1).replace(/\.0$/, ''),
        mlChem: Math.round(chemValue * 29.5735),
        mlWater: Math.round(waterValue * 29.5735)
    };
};

export const RatiosOnlyChart = ({ open, onOpenChange, chemicals }: RatiosOnlyChartProps) => {
    const { toast } = useToast();
    const [customRatios, setCustomRatios] = useState<string[]>([]);
    const [hiddenRatios, setHiddenRatios] = useState<string[]>([]);
    const [gallonSize, setGallonSize] = useState<number>(128);
    const [newRatio, setNewRatio] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'landscape' | 'portrait'>('landscape');
    const [isLoading, setIsLoading] = useState(true);

    // Persistence & Supabase sync
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                // 1. Load from Supabase (Source of Truth)
                const supaRatios = await getReferenceRatios();
                if (supaRatios.length > 0) {
                    setCustomRatios(supaRatios.filter(r => !r.is_hidden).map(r => normalizeRatio(r.ratio)));
                    setHiddenRatios(supaRatios.filter(r => r.is_hidden).map(r => normalizeRatio(r.ratio)));
                } else {
                    // Fallback to local if nothing in Supabase yet (first time sync)
                    const saved = await localforage.getItem<string[]>("pds_custom_ratios_v1");
                    if (saved) setCustomRatios(saved);
                    const hidden = await localforage.getItem<string[]>("pds_hidden_ratios_v1");
                    if (hidden) setHiddenRatios(hidden);
                }

                // Load Gallon Size local preference (doesn't need Supabase usually)
                const gSize = await localforage.getItem<number>(GALLON_KEY);
                if (gSize) setGallonSize(gSize);
            } catch (err) {
                console.error("Load Reference Error:", err);
            } finally {
                setIsLoading(false);
            }
        };
        if (open) load();
    }, [open]);

    const handleAddRatio = async () => {
        if (!newRatio) return;
        const normalized = normalizeRatio(newRatio);
        
        // Use a set of current active ratios to check for effective Presence
        const activeRatios = new Set([
            ...chemicals.flatMap(c => {
                const rs = (c.dilution_ratios && c.dilution_ratios.length > 0) ? c.dilution_ratios : (c.dilutionRatios || []);
                return rs.map((rr: any) => normalizeRatio(rr.ratio));
            }),
            ...customRatios
        ]);

        if (activeRatios.has(normalized)) {
            toast({ title: "Ratio Present", description: `${normalized} already exists in the chart.` });
            setNewRatio("");
            setIsAddOpen(false);
            return;
        }

        try {
            // Update Supabase
            await upsertReferenceRatio(normalized, false);
            
            // Update State
            setCustomRatios(prev => [...prev, normalized]);
            // If it was hidden, unhide it
            if (hiddenRatios.includes(normalized)) {
                setHiddenRatios(prev => prev.filter(r => r !== normalized));
            }
            
            setNewRatio("");
            setIsAddOpen(false);
            toast({ title: "Ratio Added", description: `${normalized} added to Supabase and permanent chart.` });
        } catch (err) {
            toast({ title: "Save Error", description: "Failed to save ratio to Supabase.", variant: "destructive" });
        }
    };

    const handleDeleteRatio = async (ratioStr: string) => {
        if (!window.confirm(`Are you sure you want to remove ${ratioStr} from the chart?`)) return;

        const norm = normalizeRatio(ratioStr);
        try {
            // Check if it's from inventory. If so, hide it. If it's custom, delete it.
            const fromInventory = chemicals.some(c => {
                const rs = (c.dilution_ratios && c.dilution_ratios.length > 0) ? c.dilution_ratios : (c.dilutionRatios || []);
                return rs.some((rr: any) => normalizeRatio(rr.ratio) === norm);
            });

            if (fromInventory) {
                await upsertReferenceRatio(norm, true);
                setHiddenRatios(prev => [...prev, norm]);
            } else {
                await deleteReferenceRatio(norm);
                setCustomRatios(prev => prev.filter(r => r !== norm));
            }
            toast({ title: "Ratio Removed", description: `${ratioStr} has been removed from the view.` });
        } catch (err) {
            toast({ title: "Delete Error", description: "Failed to update Supabase.", variant: "destructive" });
        }
    };

    const handleGallonChange = async (val: string) => {
        const num = parseFloat(val);
        if (!isNaN(num) && num > 0) {
            setGallonSize(num);
            await localforage.setItem(GALLON_KEY, num);
        }
    };

    // Calculate unique sorted ratios
    const sortedRatios = useMemo(() => {
        const allSet = new Set<string>();
        
        chemicals.forEach(c => {
            const ratios = (c.dilution_ratios && c.dilution_ratios.length > 0) 
                ? c.dilution_ratios : (c.dilutionRatios || []);
            ratios.forEach((r: any) => {
                const norm = normalizeRatio(r.ratio);
                if (norm) allSet.add(norm);
            });
        });

        customRatios.forEach(r => allSet.add(r));

        const filtered = Array.from(allSet).filter(r => !hiddenRatios.includes(r));

        return filtered.sort((a, b) => {
            if (a === 'RTU') return -1;
            if (b === 'RTU') return 1;
            const pA = parseInt((a.match(/(\d+)[:/]/) || ["", "9999"])[1]);
            const pB = parseInt((b.match(/(\d+)[:/]/) || ["", "9999"])[1]);
            return pA - pB;
        });
    }, [chemicals, customRatios, hiddenRatios]);

    const standardSizes = [16, 24, 32];
    const scenarios = ["Standard", "Heavy Duty", "Maintenance"];

    // Real Landscape Printing
    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const tableHtml = document.getElementById('dilution-reference-table')?.outerHTML;
        
        const style = `
            <style>
                @page { size: landscape; margin: 0.5in; }
                body { font-family: -apple-system, sans-serif; color: #111; padding: 20px; }
                table { width: 100%; border-collapse: collapse; border: 2px solid #333; }
                th, td { border: 1px solid #ccc; padding: 8px; text-align: center; font-size: 10px; }
                th { background: #f4f4f4; text-transform: uppercase; font-weight: bold; }
                .ratio-cell { font-weight: 900; font-size: 18px; text-align: left; background: #eee; border-right: 2px solid #333; }
                .size-header { font-weight: 900; color: #444; border-bottom: 2px solid #333; }
                .amount-box { line-height: 1.2; }
                .chem-line { font-weight: 900; border-bottom: 1px solid #eee; padding-bottom: 2px; }
                .water-line { font-weight: 700; opacity: 0.7; padding-top: 2px; }
                .ml-tag { font-size: 8px; color: #666; margin-left: 4px; }
                .header-title { text-align: center; margin-bottom: 20px; text-transform: uppercase; }
                .no-print { display: none !important; }
                .gallon-cell { background-color: #fffbeb !important; border-left: 2px solid #78350f !important; }
                .legend { margin-top: 20px; font-size: 10px; font-weight: bold; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
            </style>
        `;

        printWindow.document.write(`
            <html>
                <head><title>Prime Dilution Master Reference</title>${style}</head>
                <body>
                    <div class="header-title">
                        <h1 style="margin:0; font-size:24px; font-weight:900;">Prime Dilution Master Reference</h1>
                        <p style="margin:5px 0 20px; font-size:12px; font-weight:bold; color:#666;">Professional Soil Breakdown • Oz & ML Reference Chart</p>
                    </div>
                    ${tableHtml}
                    <div class="legend">Legend: ALL measurements follow chemical vs water rule. Top line (C) is amount of CHEMICAL in Oz/ML. Bottom line (W) is amount of WATER in Oz/ML.</div>
                </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    const downloadPDF = () => {
        const pdf = new jsPDF('l', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        pdf.setFontSize(22);
        pdf.setFont('helvetica', 'bold');
        pdf.text("PRIME DILUTION MASTER REFERENCE", pageWidth / 2, 15, { align: 'center' });
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(100, 100, 100);
        pdf.text("Professional Soil Breakdown • Oz & ML Reference Chart", pageWidth / 2, 22, { align: 'center' });

        const headers = [
            ['Ratio', ...scenarios.flatMap(s => [`${s}\n16oz`, `${s}\n24oz`, `${s}\n32oz`, `${s}\n${gallonSize}oz`])]
        ];

        const body = sortedRatios.map(ratioStr => {
            const row = [transformRatio(ratioStr)];
            scenarios.forEach(() => {
                [...standardSizes, gallonSize].forEach(size => {
                    const amts = calculateAmounts(ratioStr, size);
                    row.push(`C: ${amts?.chem}oz (${amts?.mlChem}ml)\n---\nW: ${amts?.water}oz (${amts?.mlWater}ml)`);
                });
            });
            return row;
        });

        autoTable(pdf, {
            startY: 28,
            head: headers,
            body: body,
            theme: 'grid',
            styles: { fontSize: 7, halign: 'center', valign: 'middle', cellPadding: 1, lineWidth: 0.1, lineColor: [200, 200, 200] },
            headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: 'bold' },
            columnStyles: { 0: { fontStyle: 'bold', fontSize: 11, cellWidth: 20, fillColor: [245, 245, 245] } },
            didParseCell: (data) => {
                if (data.section === 'head' && data.column.index > 0) {
                    const idxInS = (data.column.index - 1) % 4;
                    if (idxInS === 0) data.cell.styles.textColor = [16, 185, 129]; // Emerald (16oz)
                    if (idxInS === 1) data.cell.styles.textColor = [59, 130, 246]; // Blue (24oz)
                    if (idxInS === 2) data.cell.styles.textColor = [139, 92, 246]; // Purple (32oz)
                    if (idxInS === 3) data.cell.styles.textColor = [245, 158, 11]; // Amber (Gallon)
                }
                if (data.section === 'body' && data.column.index > 0) {
                    const idxInS = (data.column.index - 1) % 4;
                    if (idxInS === 3) data.cell.styles.fillColor = [255, 248, 230]; // Gallon column tint
                }
            }
        });

        // Add Legend at bottom
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text("LEGEND: (C) = Chemical Amount | (W) = Water Amount. All values calibrated to specific bottle sizes.", 10, pageHeight - 10);

        pdf.save(`Prime_Dilution_Ratios_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[98vw] 2xl:max-w-[1700px] w-full h-[95vh] flex flex-col p-0 overflow-hidden bg-zinc-950 border-none shadow-2xl rounded-2xl">
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-zinc-900 border-b border-zinc-800 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center border border-white/10 shadow-lg">
                            <TableIcon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <DialogTitle className="text-xl font-black text-white italic uppercase tracking-tighter leading-none mb-1">Prime Dilution Master Reference</DialogTitle>
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] leading-none text-left">Professional Soil Breakdown • Oz & ML Reference Chart</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-zinc-800/50 p-1.5 rounded-xl border border-zinc-700/50">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setViewMode(viewMode === 'landscape' ? 'portrait' : 'landscape')}
                            className={`h-8 px-3 text-[10px] font-bold uppercase tracking-widest ${viewMode === 'portrait' ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'text-zinc-400 hover:text-white hover:bg-zinc-700'}`}
                        >
                            <MonitorSmartphone className="h-3.5 w-3.5 mr-2" />
                            {viewMode}
                        </Button>
                        <div className="w-[1px] h-4 bg-zinc-700 mx-1" />
                        <Button variant="ghost" size="sm" onClick={() => setIsAddOpen(true)} className="h-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 text-[10px] font-bold uppercase tracking-widest">
                            <Plus className="h-3.5 w-3.5 mr-1" /> Add Ratio
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handlePrint} className="h-8 text-zinc-300 hover:text-white hover:bg-zinc-700 px-2" title="Print Landscape Table">
                            <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={downloadPDF} className="h-8 text-zinc-300 hover:text-white hover:bg-zinc-700 px-2" title="Download Landscape PDF">
                            <Download className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-white p-2">
                    <div className={`mx-auto ${viewMode === 'portrait' ? 'max-w-4xl' : 'w-full'}`}>
                        <table id="dilution-reference-table" className="w-full border-collapse border-2 border-zinc-400">
                            <thead className="sticky top-0 z-30 shadow-md">
                                <tr className="bg-zinc-100 border-b-2 border-zinc-400 uppercase font-black tracking-tighter text-zinc-700">
                                    <th rowSpan={2} className="p-4 border-2 border-zinc-400 text-left bg-zinc-200 sticky left-0 z-40 text-lg w-[120px]">Ratio</th>
                                    {scenarios.map(scenario => (
                                        <th key={scenario} colSpan={4} className="p-2 border-l-4 border-zinc-400 text-center text-xs tracking-widest bg-zinc-100/50">
                                            {scenario} Solutions
                                        </th>
                                    ))}
                                </tr>
                                <tr className="bg-zinc-50 border-b-2 border-zinc-400">
                                    {scenarios.map(scenario => (
                                        <React.Fragment key={`${scenario}-headers`}>
                                            <th className="p-2 border border-zinc-300 text-[11px] text-emerald-600 font-black tracking-tighter size-header">16oz</th>
                                            <th className="p-2 border border-zinc-300 text-[11px] text-blue-600 font-black tracking-tighter size-header">24oz</th>
                                            <th className="p-2 border border-zinc-300 text-[11px] text-purple-600 font-black tracking-tighter size-header">32oz</th>
                                            <th className="p-2 border-l-2 border-zinc-400 text-[11px] bg-amber-500/10 min-w-[70px] size-header gallon-cell">
                                                <div className="flex flex-col items-center">
                                                    <Input 
                                                        type="number" 
                                                        defaultValue={gallonSize}
                                                        onChange={(e) => handleGallonChange(e.target.value)}
                                                        className="h-6 w-14 text-[11px] p-0 text-center font-black border-none bg-transparent text-amber-900 focus-visible:ring-0 no-print"
                                                    />
                                                    <span className="text-[11px] font-black text-amber-900 print:block hidden">{gallonSize}oz</span>
                                                    <span className="text-[7px] font-black text-amber-700/50 uppercase leading-none">Custom Oz</span>
                                                </div>
                                            </th>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedRatios.map((ratioStr, idx) => (
                                    <tr key={ratioStr} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50'} hover:bg-indigo-50/50 transition-colors group border-b border-zinc-300`}>
                                        <td className="p-4 border-2 border-zinc-400 font-black text-zinc-900 text-3xl italic tracking-tighter sticky left-0 z-20 bg-inherit shadow-[3px_0_10px_rgba(0,0,0,0.1)] group/ratio ratio-cell">
                                            {transformRatio(ratioStr)}
                                            <button 
                                                onClick={() => handleDeleteRatio(ratioStr)}
                                                className="absolute top-1 right-1 opacity-0 group-hover/ratio:opacity-100 text-red-500/30 hover:text-red-600 transition-all no-print"
                                                title="Remove from chart"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </td>
                                        {scenarios.map(scenario => (
                                            <React.Fragment key={`${scenario}-${ratioStr}`}>
                                                {[...standardSizes, gallonSize].map((size, sIdx) => {
                                                    const amts = calculateAmounts(ratioStr, size);
                                                    const isCustom = sIdx === 3;
                                                    const colorClass = size === 16 ? 'text-emerald-700' : size === 24 ? 'text-blue-700' : size === 32 ? 'text-purple-700' : 'text-amber-800';
                                                    
                                                    return (
                                                        <td key={`${scenario}-${size}-${sIdx}`} className={`p-2 border border-zinc-200 text-center ${isCustom ? 'bg-amber-500/5 border-l-2 border-zinc-400 gallon-cell' : ''}`}>
                                                            <div className="flex flex-col gap-1 py-1 amount-box">
                                                                {/* Chemical Line */}
                                                                <div className="flex items-center justify-between gap-1 border-b border-zinc-100 pb-1 chem-line">
                                                                    <div className="flex items-baseline gap-0.5">
                                                                        <span className={`text-base font-black ${colorClass}`}>{amts?.chem}</span>
                                                                        <span className="text-[8px] text-zinc-400 font-black uppercase">oz</span>
                                                                    </div>
                                                                    <span className="text-[9px] text-zinc-400 font-bold bg-zinc-100 px-1 rounded-sm ml-tag print:bg-transparent">{amts?.mlChem}ml</span>
                                                                </div>
                                                                {/* Water Line */}
                                                                <div className="flex items-center justify-between gap-1 pt-1 opacity-70 water-line">
                                                                    <div className="flex items-baseline gap-0.5">
                                                                        <span className={`text-[12px] font-black ${colorClass}`}>{amts?.water}</span>
                                                                        <span className="text-[8px] text-zinc-400 font-black uppercase">oz</span>
                                                                    </div>
                                                                    <span className="text-[9px] text-zinc-400 font-bold ml-tag">{amts?.mlWater}ml</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </React.Fragment>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between no-print shrink-0">
                    <div className="flex gap-6 text-[9px] font-black uppercase tracking-[0.2em] no-print">
                        <div className="flex items-center gap-2 text-emerald-500"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" /> 16oz (C/W)</div>
                        <div className="flex items-center gap-2 text-blue-500"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]" /> 24oz (C/W)</div>
                        <div className="flex items-center gap-2 text-purple-500"><div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(147,51,234,0.3)]" /> 32oz (C/W)</div>
                        <div className="flex items-center gap-2 text-amber-500"><div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)] animate-pulse" /> {gallonSize}oz (C/W)</div>
                    </div>
                    <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.5em]">Prime Detailing Professional Systems • Laboratory Grade Reference Chart</p>
                </div>
            </DialogContent>

            {/* Add Ratio Modal */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-white shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-emerald-500">Add Custom Ratio</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Ratio Format (e.g. 10:1 or 1:1)</label>
                            <Input 
                                value={newRatio}
                                onChange={(e) => setNewRatio(e.target.value)}
                                placeholder="10:1"
                                className="bg-zinc-900 border-zinc-800 text-white font-bold h-12 text-lg focus:border-emerald-500"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddRatio()}
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="text-zinc-500 hover:text-white">Cancel</Button>
                        <Button onClick={handleAddRatio} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest px-8">
                            Add to Permanent Chart
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
};
