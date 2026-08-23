import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Printer, Download, RotateCcw, Loader2, History as HistoryIcon, HelpCircle, X, Check, Edit2, Trash2, ChevronUp, ChevronDown, Plus, Settings2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/lib/supabase';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface CaddyHistoryEntry {
    id: string;
    name: string;
    timestamp: string;
    data: CaddyData;
}

interface CaddySlot {
    slot: number | string;
    name: string;
    ratio: string;
    purpose: string;
}

export interface CustomCaddy {
    id: string;
    title: string;
    colorClass: string;
    visible: boolean;
    slots: CaddySlot[];
}

interface CaddyData {
    interior: CaddySlot[];
    exterior: CaddySlot[];
    custom_caddies: CustomCaddy[];
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

const DEFAULT_SPECIALTY: CustomCaddy = {
    id: 'specialty-chemicals',
    title: 'Specialty Chemicals',
    colorClass: 'text-purple-400',
    visible: true,
    slots: Array(8).fill(null).map((_, i) => ({ slot: i + 1, name: '', ratio: '', purpose: '' })).concat([
        { slot: 'Extra 1', name: '', ratio: '', purpose: '' },
        { slot: 'Extra 2', name: '', ratio: '', purpose: '' }
    ])
};

const DEFAULT_DATA: CaddyData = {
    interior: DEFAULT_INTERIOR,
    exterior: DEFAULT_EXTERIOR,
    custom_caddies: [DEFAULT_SPECIALTY]
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
    const [isLoading, setIsLoading] = useState(true);
    const [showExtraSlots, setShowExtraSlots] = useState(false);
    const [isRealMobile, setIsRealMobile] = useState(false);
    
    // History State
    const [history, setHistory] = useState<CaddyHistoryEntry[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [showManageCaddies, setShowManageCaddies] = useState(false);
    const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
    const [editingHistoryName, setEditingHistoryName] = useState("");

    useEffect(() => {
        if (open) {
            loadData();
            const savedHistory = localStorage.getItem('static_caddy_history');
            if (savedHistory) {
                try { setHistory(JSON.parse(savedHistory)); } catch (e) { }
            }
        }
    }, [open]);

    useEffect(() => {
        const mql = window.matchMedia('(pointer: coarse) and (max-width: 768px)');
        setIsRealMobile(mql.matches);
        const handler = (e: MediaQueryListEvent) => setIsRealMobile(e.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            console.log("Attempting load from Supabase...");
            const { data: dbData, error } = await supabase
                .from('static_caddy_worksheet')
                .select('*')
                .eq('id', 1)
                .maybeSingle();

            console.log("Load response:", { dbData, error });
            if (error) {
                console.error("Supabase Load Error:", error);
                throw error;
            }

            if (dbData) {
                const parsed = {
                    interior: dbData.interior || DEFAULT_INTERIOR,
                    exterior: dbData.exterior || DEFAULT_EXTERIOR,
                    custom_caddies: dbData.custom_caddies || DEFAULT_DATA.custom_caddies
                };
                
                // Legacy migration
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
                setShowExtraSlots(dbData.show_extra_slots || false);
            } else {
                setData(DEFAULT_DATA);
                setShowExtraSlots(false);
            }
        } catch (e) {
            console.error("Failed to fetch caddy worksheet data:", e);
            setData(DEFAULT_DATA);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            console.log("Attempting save to Supabase with data:", { interior: data.interior.length, exterior: data.exterior.length });
            const { data: savedData, error } = await supabase
                .from('static_caddy_worksheet')
                .upsert({
                    id: 1,
                    interior: data.interior,
                    exterior: data.exterior,
                    custom_caddies: data.custom_caddies,
                    show_extra_slots: showExtraSlots,
                    updated_at: new Date().toISOString()
                }).select();

            console.log("Save response:", { savedData, error });
            if (error) {
                console.error("Supabase Save Error:", error);
                throw error;
            }

            const newHistoryEntry: CaddyHistoryEntry = {
                id: Date.now().toString(),
                name: `Save ${new Date().toLocaleString()}`,
                timestamp: new Date().toISOString(),
                data: { interior: [...data.interior], exterior: [...data.exterior], custom_caddies: data.custom_caddies.map(c => ({...c, slots: [...c.slots]})) }
            };
            const newHistory = [newHistoryEntry, ...history].slice(0, 50);
            setHistory(newHistory);
            localStorage.setItem('static_caddy_history', JSON.stringify(newHistory));

            toast({
                title: "Worksheet Saved",
                description: "Your caddy worksheet has been securely saved to the database.",
                className: "bg-green-600 text-white"
            });
        } catch (e) {
            console.error("Failed to save:", e);
            toast({
                title: "Save Failed",
                description: "Failed to save the worksheet data to the database.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddCustomCaddy = () => {
        const newId = `custom-${Date.now()}`;
        const newData = { ...data };
        newData.custom_caddies.push({
            id: newId,
            title: `New Caddy ${newData.custom_caddies.length + 1}`,
            colorClass: 'text-fuchsia-400',
            visible: true,
            slots: Array(8).fill(null).map((_, i) => ({ slot: i + 1, name: '', ratio: '', purpose: '' })).concat([
                { slot: 'Extra 1', name: '', ratio: '', purpose: '' },
                { slot: 'Extra 2', name: '', ratio: '', purpose: '' }
            ])
        });
        setData(newData);
    };

    const toggleCaddyVisibility = (id: string) => {
        const newData = { ...data };
        const c = newData.custom_caddies.find(c => c.id === id);
        if (c) c.visible = !c.visible;
        setData(newData);
    };

    const handleReset = async () => {
        if (window.confirm("Are you sure you want to discard your unsaved changes and reload your last saved data?")) {
            await loadData();
            toast({
                title: "Changes Discarded",
                description: "Worksheet has been restored to your last saved values.",
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
            startY: currentY + 3,
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
                2: { cellWidth: 20, halign: 'center' },
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
                finalY += 5;
                doc.setFontSize(10);
                doc.setTextColor(100, 100, 100);
                doc.text(`* Additional Items: ${parts.join('  |  ')}`, 14, finalY);
            }
        }

        // Exterior Caddy on the same page
        currentY = finalY + 12;

        doc.setFontSize(13);
        doc.setTextColor(59, 130, 246);
        doc.text("Exterior Caddy", 14, currentY);

        const exteriorDataToPrint = data.exterior.slice(0, 8);

        autoTable(doc, {
            startY: currentY + 3,
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
                2: { cellWidth: 20, halign: 'center' },
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
                extFinalY += 5;
                doc.setFontSize(10);
                doc.setTextColor(100, 100, 100);
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

    const handleRestoreHistory = (entry: CaddyHistoryEntry) => {
        if (window.confirm("Restore this version? This will overwrite your current unsaved changes.")) {
            setData(entry.data);
            setShowHistory(false);
            toast({ title: "Version Restored", description: "You are now viewing a past version. Remember to save if you want to keep it." });
        }
    };

    const handleDeleteHistory = (id: string) => {
        if (window.confirm("Are you sure you want to delete this history record?")) {
            const newHistory = history.filter(h => h.id !== id);
            setHistory(newHistory);
            localStorage.setItem('static_caddy_history', JSON.stringify(newHistory));
            toast({ title: "Record Deleted" });
        }
    };

    const saveHistoryName = (id: string) => {
        if (!editingHistoryName.trim()) return;
        const newHistory = history.map(h => h.id === id ? { ...h, name: editingHistoryName } : h);
        setHistory(newHistory);
        localStorage.setItem('static_caddy_history', JSON.stringify(newHistory));
        setEditingHistoryId(null);
    };

    const updateSlot = (caddy: string, index: number, field: keyof CaddySlot, value: string) => {
        setData(prev => {
            if (caddy === 'interior' || caddy === 'exterior') {
                const arr = [...prev[caddy]];
                arr[index] = { ...arr[index], [field]: value };
                return { ...prev, [caddy]: arr };
            } else {
                const newCustom = prev.custom_caddies.map(c => {
                    if (c.id === caddy) {
                        const newSlots = [...c.slots];
                        newSlots[index] = { ...newSlots[index], [field]: value };
                        return { ...c, slots: newSlots };
                    }
                    return c;
                });
                return { ...prev, custom_caddies: newCustom };
            }
        });
    };

    const moveSlot = (caddy: string, index: number, direction: 'up' | 'down') => {
        setData(prev => {
            const isBase = caddy === 'interior' || caddy === 'exterior';
            const targetArray = isBase ? prev[caddy as 'interior'|'exterior'] : prev.custom_caddies.find(c => c.id === caddy)?.slots;
            if (!targetArray) return prev;
            
            const arr = [...targetArray];
            const newIndex = direction === 'up' ? index - 1 : index + 1;
            
            const maxIndex = showExtraSlots ? arr.length - 1 : 7;
            if (newIndex < 0 || newIndex > maxIndex) return prev;

            const currentItem = arr[index];
            const targetItem = arr[newIndex];

            arr[index] = {
                ...currentItem,
                name: targetItem.name,
                ratio: targetItem.ratio,
                purpose: targetItem.purpose
            };

            arr[newIndex] = {
                ...targetItem,
                name: currentItem.name,
                ratio: currentItem.ratio,
                purpose: currentItem.purpose
            };

            if (isBase) {
                return { ...prev, [caddy]: arr };
            } else {
                const newCustom = prev.custom_caddies.map(c => c.id === caddy ? { ...c, slots: arr } : c);
                return { ...prev, custom_caddies: newCustom };
            }
        });
    };

    const renderMobileTable = (caddy: string, title: string, colorClass: string) => {
        const sourceSlots = (caddy === 'interior' || caddy === 'exterior') ? data[caddy as 'interior'|'exterior'] : data.custom_caddies.find(c => c.id === caddy)?.slots;
        if (!sourceSlots) return null;
        const items = showExtraSlots ? sourceSlots : sourceSlots.slice(0, 8);
        return (
            <div className="space-y-3">
                <h3 className={`text-lg font-bold ${colorClass} flex items-center gap-2 sticky top-0 bg-zinc-950 z-20 py-2`}>
                    {title}
                </h3>
                <div className="rounded-md border border-zinc-800 bg-zinc-950 flex flex-col w-full text-xs overflow-hidden">
                    {/* Header Row */}
                    <div className="flex w-full bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-medium py-2 sticky top-10 z-10">
                        <div className="w-[45px] shrink-0 text-center px-1">Slot</div>
                        <div className="flex-[4] min-w-0 px-1 truncate">Chemical Name</div>
                        <div className="flex-[1] min-w-0 px-1 text-center truncate">Ratio</div>
                        <div className="flex-[4] min-w-0 px-1 truncate">Purpose</div>
                    </div>
                    {/* Body Rows */}
                    <div className="flex flex-col w-full divide-y divide-zinc-800">
                        {items.map((item, idx) => (
                            <div key={idx} className="flex w-full items-center hover:bg-zinc-900/50 transition-colors py-1.5">
                                <div className="w-[45px] shrink-0 flex items-center justify-center gap-1 font-bold text-zinc-500 px-1">
                                    <div className="flex flex-col gap-0.5 bg-zinc-900/80 p-0.5 rounded border border-zinc-700/50 shrink-0">
                                        <button 
                                            onClick={() => moveSlot(caddy, idx, 'up')}
                                            disabled={idx === 0}
                                            className="text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-sm disabled:opacity-20 disabled:hover:bg-transparent transition-all"
                                        >
                                            <ChevronUp className="w-3 h-3" />
                                        </button>
                                        <button 
                                            onClick={() => moveSlot(caddy, idx, 'down')}
                                            disabled={idx === (showExtraSlots ? (caddy === 'interior' || caddy === 'exterior' ? data[caddy as 'interior'|'exterior'].length : data.custom_caddies.find(c=>c.id===caddy)?.slots.length || 0) - 1 : 7)}
                                            className="text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-sm disabled:opacity-20 disabled:hover:bg-transparent transition-all"
                                        >
                                            <ChevronDown className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <span className="text-[10px] w-3 text-center">{item.slot}</span>
                                </div>
                                <div className="flex-[4] min-w-0 px-1">
                                    <Input
                                        value={item.name}
                                        onChange={(e) => updateSlot(caddy, idx, 'name', e.target.value)}
                                        className="h-8 bg-zinc-900/50 border-zinc-700/50 text-white w-full min-w-0 px-1.5 text-xs shadow-sm"
                                    />
                                </div>
                                <div className="flex-[1] min-w-0 px-1">
                                    <Input
                                        value={item.ratio}
                                        maxLength={5}
                                        onChange={(e) => updateSlot(caddy, idx, 'ratio', e.target.value)}
                                        className="h-8 bg-zinc-900/50 border-zinc-700/50 text-white w-full min-w-0 px-1 text-center text-xs shadow-sm"
                                    />
                                </div>
                                <div className="flex-[4] min-w-0 px-1">
                                    <Input
                                        value={item.purpose}
                                        onChange={(e) => updateSlot(caddy, idx, 'purpose', e.target.value)}
                                        className="h-8 bg-zinc-900/50 border-zinc-700/50 text-white w-full min-w-0 px-1.5 text-xs shadow-sm"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderTable = (caddy: string, title: string, colorClass: string) => {
        if (isRealMobile) {
            return renderMobileTable(caddy, title, colorClass);
        }

        const sourceSlots = (caddy === 'interior' || caddy === 'exterior') ? data[caddy as 'interior'|'exterior'] : data.custom_caddies.find(c => c.id === caddy)?.slots;
        if (!sourceSlots) return null;
        const items = showExtraSlots ? sourceSlots : sourceSlots.slice(0, 8);
        return (
            <div className="space-y-3">
                <h3 className={`text-lg font-bold ${colorClass} flex items-center gap-2`}>
                    {title}
                </h3>
                <div className="rounded-md border border-zinc-800 overflow-hidden">
                    <div className="flex flex-col w-full text-sm overflow-hidden">
                        <div className="flex w-full bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-medium py-3">
                            <div className="w-24 shrink-0 text-center px-4">Slot</div>
                            <div className="flex-[4] min-w-0 px-2 truncate">Chemical Name</div>
                            <div className="flex-[1] min-w-0 px-2 text-center truncate">Dilution Ratio</div>
                            <div className="flex-[4] min-w-0 px-2 truncate">Purpose</div>
                        </div>
                        <div className="flex flex-col w-full divide-y divide-zinc-800 bg-zinc-950/50">
                            {items.map((item, idx) => (
                                <div key={idx} className="flex w-full items-center hover:bg-zinc-900/50 transition-colors py-2">
                                    <div className="w-24 shrink-0 flex items-center justify-center gap-3 font-bold text-zinc-500 px-4">
                                        <div className="flex flex-col gap-0.5 bg-zinc-900/80 p-0.5 rounded border border-zinc-700/50 shrink-0">
                                            <button 
                                                onClick={() => moveSlot(caddy, idx, 'up')}
                                                disabled={idx === 0}
                                                className="text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-sm disabled:opacity-20 disabled:hover:bg-transparent transition-all"
                                            >
                                                <ChevronUp className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                                onClick={() => moveSlot(caddy, idx, 'down')}
                                                disabled={idx === (showExtraSlots ? (caddy === 'interior' || caddy === 'exterior' ? data[caddy as 'interior'|'exterior'].length : data.custom_caddies.find(c=>c.id===caddy)?.slots.length || 0) - 1 : 7)}
                                                className="text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-sm disabled:opacity-20 disabled:hover:bg-transparent transition-all"
                                            >
                                                <ChevronDown className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <span className="w-10 text-left truncate">{item.slot}</span>
                                    </div>
                                    <div className="flex-[4] min-w-0 px-2">
                                        <Input
                                            value={item.name}
                                            onChange={(e) => updateSlot(caddy, idx, 'name', e.target.value)}
                                            className="h-9 bg-zinc-900/50 border-zinc-800 text-white w-full shadow-sm"
                                        />
                                    </div>
                                    <div className="flex-[1] min-w-0 px-2">
                                        <Input
                                            value={item.ratio}
                                            maxLength={5}
                                            onChange={(e) => updateSlot(caddy, idx, 'ratio', e.target.value)}
                                            className="h-9 bg-zinc-900/50 border-zinc-800 text-white w-full text-center shadow-sm"
                                        />
                                    </div>
                                    <div className="flex-[4] min-w-0 px-2">
                                        <Input
                                            value={item.purpose}
                                            onChange={(e) => updateSlot(caddy, idx, 'purpose', e.target.value)}
                                            className="h-9 bg-zinc-900/50 border-zinc-800 text-white w-full shadow-sm"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
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
                            <div className="flex items-center gap-2">
                                <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">
                                    Static Caddy Worksheet
                                </DialogTitle>
                                <Button
                                variant="outline"
                                onClick={() => setShowManageCaddies(!showManageCaddies)}
                                className={`h-9 px-3 border-zinc-700 ${showManageCaddies ? 'bg-fuchsia-600/20 text-fuchsia-300 border-fuchsia-500/40' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
                                title="Manage Caddies"
                            >
                                {showManageCaddies ? 'Back to Worksheet' : 'Manage Caddies'}
                            </Button>
                            </div>
                            <p className="text-sm text-zinc-400 mt-1">
                                Independent fallback reference sheet. These edits are isolated from the main inventory.
                            </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <Button
                                variant="outline"
                                onClick={() => setShowHistory(!showHistory)}
                                title={showHistory ? 'Back' : 'History'}
                                className={`h-9 w-9 p-0 border-zinc-700 flex items-center justify-center ${showHistory ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
                            >
                                <HistoryIcon className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setShowExtraSlots(!showExtraSlots)}
                                className={`h-9 px-3 border-zinc-700 ${showExtraSlots ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
                            >
                                {showExtraSlots ? 'Hide Extra Slots' : 'Show Extra Slots'}
                            </Button>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" title="Manage Caddies" className="h-9 px-3 border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white">
                                        Manage Caddies
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-80 bg-zinc-950 border-zinc-800 text-white p-4">
                                    <h4 className="font-bold text-sm mb-3 text-fuchsia-400">Manage Caddies</h4>
                                    <div className="space-y-3 max-h-64 overflow-y-auto styled-scrollbar pr-1">
                                        <div className="flex items-center justify-between p-2 rounded bg-zinc-900/50 border border-zinc-800">
                                            <span className="text-sm font-medium text-purple-400">Interior Caddy</span>
                                            <span className="text-xs text-zinc-500">Always Visible</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2 rounded bg-zinc-900/50 border border-zinc-800">
                                            <span className="text-sm font-medium text-blue-400">Exterior Caddy</span>
                                            <span className="text-xs text-zinc-500">Always Visible</span>
                                        </div>
                                        {data.custom_caddies.map(caddy => (
                                            <div key={caddy.id} className="flex flex-col gap-2 p-2 rounded bg-zinc-900 border border-zinc-800">
                                                <div className="flex items-center gap-2">
                                                    <Input 
                                                        value={caddy.title}
                                                        onChange={(e) => {
                                                            const newData = { ...data };
                                                            const cIdx = newData.custom_caddies.findIndex(c => c.id === caddy.id);
                                                            if (cIdx > -1) {
                                                                newData.custom_caddies[cIdx].title = e.target.value;
                                                                setData(newData);
                                                            }
                                                        }}
                                                        className="h-8 bg-zinc-950 border-zinc-700 text-white flex-1 text-sm shadow-sm"
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggleCaddyVisibility(caddy.id)}
                                                        className={`h-8 px-2 ${caddy.visible ? 'text-green-400 bg-green-400/10' : 'text-zinc-500 bg-zinc-800'}`}
                                                        title={caddy.visible ? "Visible" : "Hidden"}
                                                    >
                                                        {caddy.visible ? 'Show' : 'Hide'}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            if (confirm('Are you sure you want to delete this custom caddy?')) {
                                                                const newData = { ...data };
                                                                newData.custom_caddies = newData.custom_caddies.filter(c => c.id !== caddy.id);
                                                                setData(newData);
                                                            }
                                                        }}
                                                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                                        title="Delete Caddy"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <Button onClick={handleAddCustomCaddy} className="w-full mt-4 h-8 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs">
                                        <Plus className="h-3 w-3 mr-2" /> Add Custom Caddy
                                    </Button>
                                </PopoverContent>
                            </Popover>
                            <Button
                                variant="outline"
                                onClick={handleReset}
                                title="Reset"
                                className="h-9 w-9 p-0 border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleGeneratePdf}
                                className="h-9 px-3 border-fuchsia-500/30 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400"
                            >
                                <Printer className="w-4 h-4 mr-2" /> PDF
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleAddCustomCaddy}
                                title="Add Custom Caddy"
                                className="h-9 w-9 p-0 border-fuchsia-500/30 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center shrink-0"
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                            <Button onClick={handleSave}
                                disabled={isSaving}
                                title="Save"
                                className="h-9 w-9 p-0 bg-green-600 hover:bg-green-500 text-white flex items-center justify-center shrink-0"
                            >
                                <Save className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 overflow-y-auto">
                    {showManageCaddies ? (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-fuchsia-400 border-b border-fuchsia-500/20 pb-2">Manage Caddies</h3>
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between p-3 rounded bg-zinc-900 border border-zinc-800">
                                    <span className="text-sm font-bold text-purple-400">Interior Caddy</span>
                                    <span className="text-xs text-zinc-500 bg-zinc-950 px-2 py-1 rounded">Always Visible</span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded bg-zinc-900 border border-zinc-800">
                                    <span className="text-sm font-bold text-blue-400">Exterior Caddy</span>
                                    <span className="text-xs text-zinc-500 bg-zinc-950 px-2 py-1 rounded">Always Visible</span>
                                </div>
                                {data.custom_caddies.map(caddy => (
                                    <div key={caddy.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded bg-zinc-900 border border-zinc-700">
                                        <div className="flex-1 w-full">
                                            <Input 
                                                value={caddy.title}
                                                onChange={(e) => {
                                                    const newData = { ...data };
                                                    const cIdx = newData.custom_caddies.findIndex(c => c.id === caddy.id);
                                                    if (cIdx > -1) {
                                                        newData.custom_caddies[cIdx].title = e.target.value;
                                                        setData(newData);
                                                    }
                                                }}
                                                className="h-10 bg-zinc-950 border-zinc-600 text-white w-full font-bold shadow-sm"
                                                placeholder="Caddy Name"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            <Button
                                                variant="outline"
                                                onClick={() => toggleCaddyVisibility(caddy.id)}
                                                className={`h-10 px-4 flex-1 sm:flex-none ${caddy.visible ? 'text-green-400 border-green-500/30 bg-green-500/10 hover:bg-green-500/20' : 'text-zinc-500 border-zinc-700 bg-zinc-800 hover:bg-zinc-700'}`}
                                            >
                                                {caddy.visible ? 'Visible' : 'Hidden'}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    if (window.confirm('Are you sure you want to delete this custom caddy?')) {
                                                        const newData = { ...data };
                                                        newData.custom_caddies = newData.custom_caddies.filter(c => c.id !== caddy.id);
                                                        setData(newData);
                                                    }
                                                }}
                                                className="h-10 w-10 p-0 border-red-900/50 text-red-400 hover:text-red-300 hover:bg-red-900/30 shrink-0"
                                                title="Delete Caddy"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                <Button 
                                    onClick={handleAddCustomCaddy} 
                                    className="w-full mt-4 h-12 bg-fuchsia-600/20 hover:bg-fuchsia-600/30 border border-fuchsia-500/30 text-fuchsia-300"
                                >
                                    <Plus className="h-4 w-4 mr-2" /> Add New Custom Caddy
                                </Button>
                            </div>
                        </div>
                    ) : showHistory ? (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-amber-400 border-b border-amber-500/20 pb-2">Worksheet History</h3>
                            {history.length === 0 ? (
                                <p className="text-zinc-500 italic">No history records found. Save your worksheet to create a snapshot.</p>
                            ) : (
                                <div className="space-y-3">
                                    {history.map(entry => (
                                        <div key={entry.id} className="bg-zinc-900 border border-zinc-800 rounded p-4 flex items-center justify-between">
                                            <div className="flex-1">
                                                {editingHistoryId === entry.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <Input 
                                                            value={editingHistoryName}
                                                            onChange={e => setEditingHistoryName(e.target.value)}
                                                            className="h-8 bg-zinc-950 border-zinc-700 text-white w-64 text-sm"
                                                            autoFocus
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') saveHistoryName(entry.id);
                                                                if (e.key === 'Escape') setEditingHistoryId(null);
                                                            }}
                                                        />
                                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-400 hover:text-green-300" onClick={() => saveHistoryName(entry.id)}>
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-zinc-400" onClick={() => setEditingHistoryId(null)}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-zinc-200">{entry.name}</h4>
                                                        <button 
                                                            onClick={() => { setEditingHistoryId(entry.id); setEditingHistoryName(entry.name); }}
                                                            className="text-zinc-500 hover:text-blue-400 transition-colors"
                                                            title="Edit Name"
                                                        >
                                                            <Edit2 className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                )}
                                                <p className="text-xs text-zinc-500 mt-1">{new Date(entry.timestamp).toLocaleString()}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="bg-zinc-800 border-zinc-700 text-blue-400 hover:bg-zinc-700 hover:text-blue-300"
                                                    onClick={() => handleRestoreHistory(entry)}
                                                >
                                                    Restore
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="bg-zinc-800 border-zinc-700 text-red-400 hover:bg-zinc-700 hover:text-red-300"
                                                    onClick={() => handleDeleteHistory(entry.id)}
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {renderTable('interior', 'Interior Caddy', 'text-purple-400')}
                            {renderTable('exterior', 'Exterior Caddy', 'text-blue-400')}
                            {data.custom_caddies.filter(c => c.visible).map(c => (
                                <div key={c.id}>
                                    {renderTable(c.id, c.title, c.colorClass)}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
