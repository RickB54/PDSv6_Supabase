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
    AlertCircle,
    FlaskConical,
    LayoutGrid
} from "lucide-react";
import { generateTemplate } from "@/lib/chemical-ai";
import { Input } from "@/components/ui/input";
import localforage from "localforage";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { getReferenceRatios, upsertReferenceRatio, deleteReferenceRatio } from "@/lib/dilution-ratios";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RatiosOnlyChartProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    chemicals: any[];
    onOpenCalculator?: () => void;
}

const GALLON_KEY = "pds_custom_gallon_v1";
const LOCAL_CUSTOM_KEY = "pds_custom_ratios_v1";
const LOCAL_HIDDEN_KEY = "pds_hidden_ratios_v1";
const LOCAL_UNIT_KEY = "pds_unit_mode_v1";

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

type UnitMode = 'oz' | 'ml' | 'both';

export const RatiosOnlyChart = ({ open, onOpenChange, chemicals, onOpenCalculator }: RatiosOnlyChartProps) => {
    const { toast } = useToast();
    const [customRatios, setCustomRatios] = useState<string[]>([]);
    const [hiddenRatios, setHiddenRatios] = useState<string[]>([]);
    const [gallonSize, setGallonSize] = useState<number>(128);
    const [unitMode, setUnitMode] = useState<UnitMode>('both');
    const [newRatio, setNewRatio] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [dbError, setDbError] = useState(false);

    // Persistence & Hybrid Sync
    useEffect(() => {
        const load = async () => {
            try {
                // 1. Load Local
                const localSaved = await localforage.getItem<string[]>(LOCAL_CUSTOM_KEY);
                if (localSaved) setCustomRatios(localSaved);
                const localHidden = await localforage.getItem<string[]>(LOCAL_HIDDEN_KEY);
                if (localHidden) setHiddenRatios(localHidden);
                const localUnit = await localforage.getItem<UnitMode>(LOCAL_UNIT_KEY);
                if (localUnit) setUnitMode(localUnit);

                // 2. Try Supabase
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

    const handleUnitChange = async (val: string) => {
        if (val) {
            setUnitMode(val as UnitMode);
            await localforage.setItem(LOCAL_UNIT_KEY, val);
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
        
        // Hide elements based on mode
        if (unitMode === 'oz') tableClone.querySelectorAll('.val-ml-box').forEach(el => el.remove());
        if (unitMode === 'ml') tableClone.querySelectorAll('.val-oz-box').forEach(el => el.remove());

        const style = `
            <style>
                @page { size: portrait; margin: 0.25in; }
                body { font-family: -apple-system, system-ui, sans-serif; padding: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                table { width: 100%; border-collapse: collapse; border: 3px solid #000; table-layout: fixed; }
                th, td { border: 1.5px solid #ccc; padding: 12px 8px; text-align: center; position: relative; }
                th { background-color: #f1f5f9 !important; font-weight: 950; text-transform: uppercase; font-size: 14px; border: 2px solid #000; }
                .ratio-cell { 
                    font-weight: 950 !important; 
                    font-size: 38px !important; 
                    text-align: left !important; 
                    background-color: #f8fafc !important; 
                    border-right: 3px solid #000 !important; 
                    padding: 10px !important;
                    font-style: italic !important;
                    letter-spacing: -2px !important;
                }
                .label-stack { position: absolute; right: 8px; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: space-around; font-size: 8px; font-weight: 950; color: #94a3b8; }
                .indicator-c::after { content: 'C'; font-size: 10px; font-weight: 950; color: #cbd5e1; position: absolute; top: 2px; right: 4px; }
                .indicator-w::after { content: 'W'; font-size: 10px; font-weight: 950; color: #cbd5e1; position: absolute; bottom: 2px; right: 4px; }
                .val-oz { font-weight: 950; font-size: 20px; }
                .val-ml { font-size: 11px; color: #64748b; margin-left: 6px; font-weight: 700; background: #eee; padding: 1px 4px; border-radius: 4px; }
                
                .text-emerald { color: #059669 !important; }
                .text-blue { color: #2563eb !important; }
                .text-purple { color: #7c3aed !important; }
                .text-amber { color: #d97706 !important; }
                
                .header-title { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #000; padding-bottom: 15px; }
                .header-title h1 { margin: 0; font-size: 32px; font-weight: 950; text-transform: uppercase; font-style: italic; letter-spacing: -1.5px; }
                .header-title p { margin: 4px 0; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 2px; }
                
                .footer { margin-top: 20px; font-size: 9px; font-weight: 950; text-transform: uppercase; color: #94a3b8; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 15px; }
            </style>
        `;

        printWindow.document.write(`
            <html>
                <head><title>Prime Dilution Chart (${unitMode.toUpperCase()})</title>${style}</head>
                <body>
                    <div class="header-title">
                        <h1>Prime Dilution Master Reference</h1>
                        <p>Professional Bottle Breakdown • Units: ${unitMode.toUpperCase()}</p>
                    </div>
                    ${tableClone.outerHTML}
                    <div class="footer">
                        <span>C = Chemical Part | W = Water Part</span>
                        <span>Prime Detailing Professional Systems</span>
                    </div>
                </body>
            </html>
        `);
        
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 800);
    };

    const downloadPDF = () => {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        pdf.setFillColor(15, 23, 42); // Dark slate
        pdf.rect(0, 0, pageWidth, 28, 'F');
        pdf.setFontSize(22);
        pdf.setFont('helvetica', 'bolditalic');
        pdf.setTextColor(255, 255, 255);
        pdf.text("PRIME DILUTION MASTER REFERENCE", pageWidth / 2, 13, { align: 'center' });
        
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(200, 200, 200);
        pdf.text(`PROFESSIONAL BOTTLE BREAKDOWN • UNITS: ${unitMode.toUpperCase()}`, pageWidth / 2, 20, { align: 'center' });

        const headers = [['Ratio', '16oz', '24oz', '32oz', `${gallonSize}oz`]];
        const body = sortedRatios.map(ratioStr => [
            transformRatio(ratioStr),
            ...[...standardSizes, gallonSize].map(size => {
                const amts = calculateAmounts(ratioStr, size);
                const ozPart = `${amts?.chem}oz / ${amts?.water}oz`;
                const mlPart = `${amts?.mlChem}ml / ${amts?.mlWater}ml`;
                if (unitMode === 'oz') return ozPart;
                if (unitMode === 'ml') return mlPart;
                return `OZ: ${ozPart}\nML: ${mlPart}`;
            })
        ]);

        autoTable(pdf, {
            startY: 28,
            head: headers,
            body: body,
            theme: 'grid',
            styles: { fontSize: 8, halign: 'center', valign: 'middle', cellPadding: 3, textColor: [15, 23, 42], lineWidth: 0.1 },
            headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
            columnStyles: { 
                0: { fontStyle: 'bolditalic', fontSize: 18, cellWidth: 35, fillColor: [248, 250, 252] } 
            },
            didParseCell: (data) => {
                if (data.section === 'head' && data.column.index > 0) {
                    if (data.column.index === 1) data.cell.styles.textColor = [5, 150, 105];
                    if (data.column.index === 2) data.cell.styles.textColor = [37, 99, 235];
                    if (data.column.index === 3) data.cell.styles.textColor = [124, 58, 237];
                    if (data.column.index === 4) data.cell.styles.textColor = [217, 119, 6];
                }
            }
        });

        pdf.save(`Prime_Dilution_${unitMode.toUpperCase()}.pdf`);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[98vw] 2xl:max-w-[1240px] w-full h-[98vh] flex flex-col p-0 overflow-hidden bg-zinc-950 border-none shadow-2xl rounded-2xl">
                {/* Responsive Header - Compact */}
                <div className="flex flex-col sm:flex-row items-center justify-between p-3 sm:p-4 bg-zinc-900 border-b border-zinc-800 gap-3 shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0 overflow-hidden">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center border border-white/10 shadow-lg shrink-0">
                            <TableIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <DialogTitle className="text-sm sm:text-xl font-black text-white italic uppercase tracking-tighter leading-none mb-0.5 sm:mb-1 truncate">Prime Dilution</DialogTitle>
                            <span className="text-[7px] sm:text-[10px] text-zinc-500 font-bold uppercase tracking-[0.1em] sm:tracking-[0.2em] leading-none truncate">Reference Chart</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        {/* Units Toggle - Compact icons */}
                        <div className="flex flex-col items-center gap-1 no-print shrink-0">
                            <span className="text-[7px] font-black uppercase text-zinc-400 tracking-widest hidden sm:block">Units</span>
                            <ToggleGroup type="single" value={unitMode} onValueChange={handleUnitChange} className="bg-zinc-800/80 p-0.5 rounded-lg border border-zinc-700">
                                <ToggleGroupItem value="oz" className="h-6 px-2 text-[9px] font-black data-[state=on]:bg-indigo-500 data-[state=on]:text-white">OZ</ToggleGroupItem>
                                <ToggleGroupItem value="ml" className="h-6 px-2 text-[9px] font-black data-[state=on]:bg-indigo-500 data-[state=on]:text-white">ML</ToggleGroupItem>
                                <ToggleGroupItem value="both" className="h-6 px-2 text-[9px] font-black data-[state=on]:bg-indigo-500 data-[state=on]:text-white">ALL</ToggleGroupItem>
                            </ToggleGroup>
                        </div>

                        {/* Action Buttons - ICON ONLY as requested */}
                        <TooltipProvider>
                            <div className="flex items-center gap-1 bg-zinc-800/80 p-1 rounded-xl border border-zinc-700">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => setIsAddOpen(true)} className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Add Custom Ratio</TooltipContent>
                                </Tooltip>

                                <div className="w-px h-4 bg-zinc-700 mx-1" />

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={handlePrint} className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-700">
                                            <Printer className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Print Portrait Map</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={downloadPDF} className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-700">
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Export PDF</TooltipContent>
                                </Tooltip>

                                <div className="w-px h-4 bg-zinc-700 mx-1" />

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={onOpenCalculator} className="h-8 w-8 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10">
                                            <Calculator className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Open Dilution Calculator</TooltipContent>
                                </Tooltip>
                            </div>
                        </TooltipProvider>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-white p-2">
                    <div className="min-w-full lg:max-w-4xl lg:mx-auto shadow-2xl rounded-xl overflow-x-auto border-2 border-slate-200">
                        <table id="dilution-reference-table" className="w-full border-collapse border-b-2 border-slate-400 min-w-[500px]">
                            <thead>
                                <tr className="bg-slate-100 border-b-2 border-slate-400 uppercase font-black tracking-tighter text-slate-700">
                                    <th className="p-3 sm:p-4 border-2 border-slate-300 text-left bg-slate-100 text-base sm:text-lg w-[80px] sm:w-[120px] sticky left-0 z-30 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Ratio</th>
                                    <th className="p-3 sm:p-4 border-2 border-slate-300 text-center text-emerald-600 font-black">16oz</th>
                                    <th className="p-3 sm:p-4 border-2 border-slate-300 text-center text-blue-600 font-black">24oz</th>
                                    <th className="p-3 sm:p-4 border-2 border-slate-300 text-center text-purple-600 font-black">32oz</th>
                                    <th className="p-4 border-2 border-slate-300 text-center bg-amber-500/10 w-[100px] sm:w-[120px] relative">
                                        <div className="flex flex-col items-center">
                                            <Input 
                                                type="number" 
                                                value={gallonSize}
                                                onChange={(e) => handleGallonChange(e.target.value)}
                                                className="h-6 w-14 text-center font-black border-none bg-transparent text-amber-900 focus-visible:ring-0 text-sm sm:text-base p-0 no-print"
                                            />
                                            <span className="hidden print:block font-black text-amber-900">{gallonSize}</span>
                                            <span className="text-[7px] font-black text-amber-700/50 uppercase leading-none">Custom</span>
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedRatios.map((ratioStr, idx) => (
                                    <tr key={ratioStr} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-indigo-50/50 transition-colors group border-b border-slate-200`}>
                                        <td className="p-3 sm:p-4 border-2 border-slate-300 font-black text-slate-900 text-xl sm:text-4xl italic tracking-tighter sticky left-0 z-30 bg-white group/ratio relative ratio-cell shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                                            {transformRatio(ratioStr)}
                                            <div className="absolute right-1 top-0 bottom-0 flex flex-col justify-center gap-3 text-[7px] sm:text-[8px] font-black text-slate-400 pointer-events-none uppercase label-stack">
                                                <span>C</span>
                                                <span>W</span>
                                            </div>
                                            <button 
                                                onClick={() => handleDeleteRatio(ratioStr)}
                                                className="absolute top-1 right-1 opacity-0 group-hover/ratio:opacity-100 text-red-500/30 hover:text-red-600 transition-all no-print sm:hidden"
                                            ><Trash2 className="h-3 w-3" /></button>
                                            <button 
                                                onClick={() => handleDeleteRatio(ratioStr)}
                                                className="absolute top-1 right-8 opacity-0 group-hover/ratio:opacity-100 text-red-500/30 hover:text-red-600 transition-all no-print hidden sm:block"
                                            ><X className="h-4 w-4" /></button>
                                        </td>
                                        {[...standardSizes, gallonSize].map((size, sIdx) => {
                                            const amts = calculateAmounts(ratioStr, size);
                                            const isCustom = sIdx === 3;
                                            const colorClass = size === 16 ? 'text-emerald-700' : size === 24 ? 'text-blue-700' : size === 32 ? 'text-purple-700' : 'text-amber-800';
                                            
                                            return (
                                                <td key={`${ratioStr}-${size}`} className={`p-1.5 sm:p-2 border border-slate-200 text-center relative ${isCustom ? 'bg-amber-500/5 border-l-2 border-slate-300' : ''}`}>
                                                    <div className="flex flex-col gap-0.5 sm:gap-1 py-0.5 sm:py-1 relative">
                                                        <div className="flex flex-col items-center justify-center border-b border-slate-100 py-0.5 relative indicator-c min-h-[1.5rem] sm:min-h-[2rem]">
                                                            {unitMode !== 'ml' && (
                                                                <div className="val-oz-box">
                                                                    <span className={`text-[12px] sm:text-base font-black ${colorClass} val-oz`}>{amts?.chem}oz</span>
                                                                </div>
                                                            )}
                                                            {unitMode !== 'oz' && (
                                                                <div className="val-ml-box">
                                                                    <span className="text-[7px] sm:text-[9px] text-slate-400 font-bold val-ml">{amts?.mlChem}ml</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col items-center justify-center py-0.5 opacity-70 relative indicator-w min-h-[1.5rem] sm:min-h-[2rem]">
                                                            {unitMode !== 'ml' && (
                                                                <div className="val-oz-box">
                                                                    <span className={`text-[10px] sm:text-[12px] font-bold ${colorClass} val-oz`}>{amts?.water}oz</span>
                                                                </div>
                                                            )}
                                                            {unitMode !== 'oz' && (
                                                                <div className="val-ml-box">
                                                                    <span className="text-[7px] sm:text-[9px] text-slate-400 font-bold val-ml">{amts?.mlWater}ml</span>
                                                                </div>
                                                            )}
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

                <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between no-print shrink-0 gap-2 sm:gap-4">
                    <div className="flex flex-wrap justify-center gap-3 sm:gap-8 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.1em] sm:tracking-[0.15em]">
                        <div className="flex items-center gap-1.5 text-emerald-500">16oz</div>
                        <div className="flex items-center gap-1.5 text-blue-500">24oz</div>
                        <div className="flex items-center gap-2 text-purple-500">32oz</div>
                        <div className="flex items-center gap-2 text-amber-500">{gallonSize}oz</div>
                    </div>
                    <div className="flex items-center gap-4 text-[8px] sm:text-[9px] text-zinc-400 font-black uppercase tracking-widest hidden sm:flex">
                        <span className="flex items-center gap-1.5">
                            <span className="text-indigo-400 font-black italic">C</span> = Chemical
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="text-zinc-500 font-black italic">W</span> = Water
                        </span>
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
