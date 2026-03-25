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
    MonitorSmartphone,
    AlertCircle
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
const LOCAL_CUSTOM_KEY = "pds_custom_ratios_v1";
const LOCAL_HIDDEN_KEY = "pds_hidden_ratios_v1";

const normalizeRatio = (r: string) => {
    if (!r) return "";
    let normalized = r.trim().toLowerCase();
    if (normalized === 'rtu' || normalized.includes('direct')) return "RTU";
    
    // Support formats like 10:1, 1/10, etc.
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
    const [dbError, setDbError] = useState(false);

    // Persistence & Hybrid Sync
    useEffect(() => {
        const load = async () => {
            try {
                // 1. Load Local Fallbacks first for fast UI
                const localSaved = await localforage.getItem<string[]>(LOCAL_CUSTOM_KEY);
                if (localSaved) setCustomRatios(localSaved);
                const localHidden = await localforage.getItem<string[]>(LOCAL_HIDDEN_KEY);
                if (localHidden) setHiddenRatios(localHidden);

                // 2. Try loading from Supabase
                const supaRatios = await getReferenceRatios();
                if (supaRatios.length > 0) {
                    setCustomRatios(supaRatios.filter(r => !r.is_hidden).map(r => normalizeRatio(r.ratio)));
                    setHiddenRatios(supaRatios.filter(r => r.is_hidden).map(r => normalizeRatio(r.ratio)));
                }
                setDbError(false);
            } catch (err) {
                console.warn("Supabase load failed, using local mode:", err);
                setDbError(true);
            }

            const gSize = await localforage.getItem<number>(GALLON_KEY);
            if (gSize) setGallonSize(gSize);
        };
        if (open) load();
    }, [open]);

    const handleAddRatio = async () => {
        if (!newRatio) return;
        const normalized = normalizeRatio(newRatio);
        
        // Check effective presence
        if (sortedRatios.includes(normalized)) {
            toast({ title: "Ratio Present", description: `${normalized} is already in the chart.` });
            setNewRatio("");
            setIsAddOpen(false);
            return;
        }

        const updated = [...customRatios, normalized];
        setCustomRatios(updated);
        await localforage.setItem(LOCAL_CUSTOM_KEY, updated);

        try {
            await upsertReferenceRatio(normalized, false);
            setDbError(false);
        } catch (err) {
            setDbError(true);
            toast({ 
                title: "Local Save Only", 
                description: "Could not sync to Supabase. Make sure to run the SQL migration.",
                variant: "destructive"
            });
        }
        
        setNewRatio("");
        setIsAddOpen(false);
    };

    const handleDeleteRatio = async (ratioStr: string) => {
        if (!window.confirm(`Are you sure you want to remove ${ratioStr}?`)) return;

        const norm = normalizeRatio(ratioStr);
        const fromInventory = chemicals.some(c => {
            const rs = (c.dilution_ratios && c.dilution_ratios.length > 0) ? c.dilution_ratios : (c.dilutionRatios || []);
            return rs.some((rr: any) => normalizeRatio(rr.ratio) === norm);
        });

        if (fromInventory) {
            const nextHidden = [...hiddenRatios, norm];
            setHiddenRatios(nextHidden);
            await localforage.setItem(LOCAL_HIDDEN_KEY, nextHidden);
            try { await upsertReferenceRatio(norm, true); } catch {}
        } else {
            const nextCustom = customRatios.filter(r => r !== norm);
            setCustomRatios(nextCustom);
            await localforage.setItem(LOCAL_CUSTOM_KEY, nextCustom);
            try { await deleteReferenceRatio(norm); } catch {}
        }
    };

    const handleGallonChange = async (val: string) => {
        const num = parseFloat(val);
        if (!isNaN(num) && num > 0) {
            setGallonSize(num);
            await localforage.setItem(GALLON_KEY, num);
        }
    };

    // Calculate unique sorted ratios with AI Suggestion Fallback
    const sortedRatios = useMemo(() => {
        const allSet = new Set<string>();
        
        chemicals.forEach(c => {
            const ratios = (c.dilution_ratios && c.dilution_ratios.length > 0) 
                ? c.dilution_ratios 
                : (c.dilutionRatios && c.dilutionRatios.length > 0) 
                    ? c.dilutionRatios 
                    : (generateTemplate(c.name, 'Exterior').dilution_ratios || []);

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

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const originalTable = document.getElementById('dilution-reference-table');
        if (!originalTable) return;

        // Clone and clean for printing
        const tableClone = originalTable.cloneNode(true) as HTMLElement;
        tableClone.querySelectorAll('.no-print').forEach(el => el.remove());
        tableClone.querySelectorAll('button').forEach(el => el.remove());
        
        const style = `
            <style>
                @page { size: landscape; margin: 0.5in; }
                body { font-family: sans-serif; padding: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                table { width: 100%; border-collapse: collapse; border: 2px solid #333; }
                th, td { border: 1px solid #ccc; padding: 12px 8px; text-align: center; font-size: 11px; position: relative; }
                th { background-color: #f4f4f4 !important; font-weight: 900; text-transform: uppercase; }
                .ratio-cell { font-weight: 900; font-size: 32px; text-align: left; background-color: #eee !important; border-right: 2px solid #333; }
                .indicator-c::after { content: 'C'; font-size: 7px; font-weight: 900; color: #999; position: absolute; top: 2px; right: 4px; }
                .indicator-w::after { content: 'W'; font-size: 7px; font-weight: 900; color: #999; position: absolute; bottom: 2px; right: 4px; }
                .val-oz { font-weight: 900; font-size: 14px; }
                .val-ml { font-size: 10px; color: #666; margin-left: 4px; }
                .header-title { text-align: center; margin-bottom: 20px; }
            </style>
        `;

        printWindow.document.write(`
            <html>
                <head><title>Prime Dilution Master Reference</title>${style}</head>
                <body>
                    <div class="header-title">
                        <h1 style="margin:0; font-weight:900;">Prime Dilution Master Reference</h1>
                        <p style="margin:5px 0;">Professional Bottle Breakdown • Oz & ML Reference Chart</p>
                    </div>
                    ${tableClone.outerHTML}
                </body>
            </html>
        `);
        
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    };

    const downloadPDF = () => {
        const pdf = new jsPDF('l', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        pdf.setFillColor(30, 30, 30);
        pdf.rect(0, 0, pageWidth, 22, 'F');
        pdf.setFontSize(22);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text("PRIME DILUTION MASTER REFERENCE", pageWidth / 2, 12, { align: 'center' });
        
        pdf.setFontSize(8);
        pdf.setTextColor(180, 180, 180);
        pdf.text("PROFESSIONAL BOTTLE BREAKDOWN • OZ & ML REFERENCE CHART", pageWidth / 2, 18, { align: 'center' });

        const headers = [['Ratio', '16oz Bottle', '24oz Bottle', '32oz Bottle', `${gallonSize}oz Custom`]];
        const body = sortedRatios.map(ratioStr => [
            transformRatio(ratioStr),
            ...[...standardSizes, gallonSize].map(size => {
                const amts = calculateAmounts(ratioStr, size);
                return `C: ${amts?.chem}oz (${amts?.mlChem}ml)\nW: ${amts?.water}oz (${amts?.mlWater}ml)`;
            })
        ]);

        autoTable(pdf, {
            startY: 22,
            head: headers,
            body: body,
            theme: 'grid',
            styles: { fontSize: 8, halign: 'center', valign: 'middle', cellPadding: 2 },
            headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
            columnStyles: { 0: { fontStyle: 'bold', fontSize: 16, cellWidth: 35, fillColor: [245, 245, 245] } },
            didParseCell: (data) => {
                if (data.section === 'head' && data.column.index > 0) {
                    if (data.column.index === 1) data.cell.styles.textColor = [16, 185, 129];
                    if (data.column.index === 2) data.cell.styles.textColor = [59, 130, 246];
                    if (data.column.index === 3) data.cell.styles.textColor = [139, 92, 246];
                    if (data.column.index === 4) data.cell.styles.textColor = [245, 158, 11];
                }
            }
        });

        pdf.setFontSize(7);
        pdf.setTextColor(150, 150, 150);
        pdf.text("LEGEND: C = CHEMICAL PART | W = WATER PART. ALL CALCULATIONS BASED ON VOLUMETRIC TOTALS.", 14, pageHeight - 10);
        pdf.save(`Prime_Dilution_Ratios.pdf`);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] 2xl:max-w-[1400px] w-full h-[90vh] flex flex-col p-0 overflow-hidden bg-zinc-950 border-none shadow-2xl rounded-2xl">
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-zinc-900 border-b border-zinc-800 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center border border-white/10 shadow-lg">
                            <TableIcon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <DialogTitle className="text-xl font-black text-white italic uppercase tracking-tighter leading-none mb-1">Prime Dilution Master Reference</DialogTitle>
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] leading-none text-left">Professional Bottle Breakdown • Oz & ML Reference Chart</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-zinc-800/50 p-1.5 rounded-xl border border-zinc-700/50">
                        {dbError && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] font-black uppercase text-amber-500 animate-pulse">
                                <AlertCircle className="h-3 w-3" /> SQL Sync Off
                            </div>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setIsAddOpen(true)} className="h-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 text-[10px] font-bold uppercase tracking-widest px-3">
                            <Plus className="h-3.5 w-3.5 mr-1" /> Add Ratio
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handlePrint} className="h-8 text-zinc-300 hover:text-white hover:bg-zinc-700 px-3">
                            <Printer className="h-4 w-4 mr-2" /> Print Map
                        </Button>
                        <Button variant="ghost" size="sm" onClick={downloadPDF} className="h-8 text-zinc-300 hover:text-white hover:bg-zinc-700 px-3">
                            <Download className="h-4 w-4 mr-2" /> Export PDF
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-white p-4">
                    <div className="max-w-6xl mx-auto shadow-2xl rounded-xl overflow-hidden border-2 border-zinc-200">
                        <table id="dilution-reference-table" className="w-full border-collapse border-b-2 border-zinc-400">
                            <thead>
                                <tr className="bg-zinc-100 border-b-2 border-zinc-400 uppercase font-black tracking-tighter text-zinc-700">
                                    <th className="p-4 border-2 border-zinc-400 text-left bg-zinc-200 text-lg w-[120px]">Ratio</th>
                                    <th className="p-4 border-2 border-zinc-400 text-center text-emerald-600">16oz</th>
                                    <th className="p-4 border-2 border-zinc-400 text-center text-blue-600">24oz</th>
                                    <th className="p-4 border-2 border-zinc-400 text-center text-purple-600">32oz</th>
                                    <th className="p-4 border-2 border-zinc-400 text-center bg-amber-500/10 w-[140px] relative">
                                        <div className="flex flex-col items-center">
                                            <Input 
                                                type="number" 
                                                defaultValue={gallonSize}
                                                onChange={(e) => handleGallonChange(e.target.value)}
                                                className="h-8 w-16 text-center font-black border-none bg-transparent text-amber-900 focus-visible:ring-0 text-lg p-0 no-print"
                                            />
                                            <span className="hidden print:block font-black text-amber-900">{gallonSize}oz</span>
                                            <span className="text-[8px] font-black text-amber-700/50 uppercase leading-none">Custom Oz</span>
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedRatios.map((ratioStr, idx) => (
                                    <tr key={ratioStr} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50'} hover:bg-indigo-50/50 transition-colors group border-b border-zinc-300`}>
                                        <td className="p-4 border-2 border-zinc-400 font-black text-zinc-900 text-4xl italic tracking-tighter sticky left-0 z-20 bg-inherit shadow-[3px_0_10px_rgba(0,0,0,0.1)] group/ratio relative">
                                            {transformRatio(ratioStr)}
                                            <div className="absolute right-2 top-0 bottom-0 flex flex-col justify-center gap-4 text-[8px] font-black text-zinc-300 pointer-events-none uppercase">
                                                <span>C</span>
                                                <span>W</span>
                                            </div>
                                            <button 
                                                onClick={() => handleDeleteRatio(ratioStr)}
                                                className="absolute top-1 right-8 opacity-0 group-hover/ratio:opacity-100 text-red-500/30 hover:text-red-600 transition-all no-print"
                                            ><X className="h-4 w-4" /></button>
                                        </td>
                                        {[...standardSizes, gallonSize].map((size, sIdx) => {
                                            const amts = calculateAmounts(ratioStr, size);
                                            const isCustom = sIdx === 3;
                                            const colorClass = size === 16 ? 'text-emerald-700' : size === 24 ? 'text-blue-700' : size === 32 ? 'text-purple-700' : 'text-amber-800';
                                            
                                            return (
                                                <td key={`${ratioStr}-${size}`} className={`p-2 border border-zinc-200 text-center relative ${isCustom ? 'bg-amber-500/5 border-l-2 border-zinc-400' : ''}`}>
                                                    <div className="flex flex-col gap-1 py-1 relative">
                                                        <div className="flex items-center justify-center gap-1 border-b border-zinc-100 py-1 relative indicator-c">
                                                            <span className={`text-base font-black ${colorClass}`}>{amts?.chem}oz</span>
                                                            <span className="text-[9px] text-zinc-400 font-bold ml-1">{amts?.mlChem}ml</span>
                                                            <span className="absolute top-0 right-0 text-[8px] font-black text-zinc-200 pointer-events-none">C</span>
                                                        </div>
                                                        <div className="flex items-center justify-center gap-1 py-1 opacity-70 relative indicator-w">
                                                            <span className={`text-[12px] font-black ${colorClass}`}>{amts?.water}oz</span>
                                                            <span className="text-[9px] text-zinc-400 font-bold ml-1">{amts?.mlWater}ml</span>
                                                            <span className="absolute bottom-0 right-0 text-[8px] font-black text-zinc-200 pointer-events-none">W</span>
                                                        </div>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between no-print shrink-0">
                    <div className="flex gap-8 text-[10px] font-black uppercase tracking-[0.2em]">
                        <div className="flex items-center gap-2 text-emerald-500"><div className="w-3 h-3 rounded-full bg-emerald-500" /> 16oz</div>
                        <div className="flex items-center gap-2 text-blue-500"><div className="w-3 h-3 rounded-full bg-blue-500" /> 24oz</div>
                        <div className="flex items-center gap-2 text-purple-500"><div className="w-3 h-3 rounded-full bg-purple-500" /> 32oz</div>
                        <div className="flex items-center gap-2 text-amber-500"><div className="w-3 h-3 rounded-full bg-amber-500" /> {gallonSize}oz</div>
                    </div>
                    <div className="flex items-center gap-6 text-[10px] text-zinc-400 font-black uppercase tracking-widest">
                        <span>C = Chemical</span>
                        <div className="w-1 h-1 bg-zinc-700 rounded-full" />
                        <span>W = Water</span>
                    </div>
                </div>
            </DialogContent>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-emerald-500">Add Custom Ratio</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Ratio Format (e.g. 10:1)</label>
                            <Input 
                                value={newRatio}
                                onChange={(e) => setNewRatio(e.target.value)}
                                placeholder="10:1"
                                className="bg-zinc-900 border-zinc-800 text-white font-bold h-12 text-lg"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddRatio()}
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddRatio} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest px-8">
                            Add Ratio
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
};
