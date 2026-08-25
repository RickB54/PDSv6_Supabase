import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Printer, Download, RotateCcw, Loader2, History as HistoryIcon, HelpCircle, X, Check, Edit2, Trash2, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, Plus, Minus, Settings2, ArrowLeft, Bookmark } from 'lucide-react';
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
    description?: string;
}

export interface CustomCaddy {
    id: string;
    title: string;
    colorClass: string;
    visible: boolean;
    slots: CaddySlot[];
    collapsed?: boolean;
}

interface CaddyData {
    interior: CaddySlot[];
    exterior: CaddySlot[];
    custom_caddies: CustomCaddy[];
}

export const isChemicalCaddy = (caddyId: string) => {
    return caddyId === 'interior' || caddyId === 'exterior' || caddyId === 'specialty-chemicals';
};

const DEFAULT_INTERIOR: CaddySlot[] = [
    { slot: 1, name: "Pink Perfection", ratio: "10:1", purpose: "Standard Interior Plastics/Vinyl" },
    { slot: 2, name: "Pink Perfection", ratio: "4:1", purpose: "Heavy Interior Cleaner" },
    { slot: 3, name: "Carpet Bomber", ratio: "7:1", purpose: "Standard Fabric/Carpet/Seats" },
    { slot: 4, name: "Carpet Bomber", ratio: "5:1", purpose: "Heavy Fabric/Carpet" },
    { slot: 5, name: "P&S Xpress", ratio: "3:1", purpose: "Light Satin Finish" },
    { slot: 6, name: "P&S Xpress", ratio: "1:1", purpose: "Strong Satin Finish" },
    { slot: 7, name: "Terminator", ratio: "RTU", purpose: "Odors & Stains" },
    { slot: 8, name: "Dirt Buster", ratio: "10:1", purpose: "General Interior Cleaner" },
    { slot: 'E1', name: "", ratio: "", purpose: "" },
    { slot: 'E2', name: "", ratio: "", purpose: "" }
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
    { slot: 'E1', name: "", ratio: "", purpose: "" },
    { slot: 'E2', name: "", ratio: "", purpose: "" }
];

const DEFAULT_SPECIALTY: CustomCaddy = {
    id: 'specialty-chemicals',
    title: 'Specialty Chemicals',
    colorClass: 'text-purple-400',
    visible: true,
    collapsed: true,
    slots: Array(8).fill(null).map((_, i) => ({ slot: i + 1, name: '', ratio: '', purpose: '', description: '' }))
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
    
    // Accordion collapse state (interior & exterior default expanded: false, custom caddies default collapsed: true)
    const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({
        interior: false,
        exterior: false,
        'specialty-chemicals': true
    });

    // History & PDF State
    const [history, setHistory] = useState<CaddyHistoryEntry[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [showManageCaddies, setShowManageCaddies] = useState(false);
    const [pdfSelection, setPdfSelection] = useState<string[]>(["interior", "exterior", "specialty-chemicals"]);
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
            console.log("Loading static caddy worksheet from Supabase...");
            const { data: dbData, error } = await supabase
                .from('static_caddy_worksheet')
                .select('*')
                .eq('id', 1)
                .maybeSingle();

            if (error) {
                console.error("Supabase Load Error:", error);
                throw error;
            }

            if (dbData) {
                const rawCustomList: any[] = dbData.custom_caddies || DEFAULT_DATA.custom_caddies;
                const metaItem = rawCustomList.find((c: any) => c.id === '__caddy_meta__');
                const validCustomCaddies = rawCustomList.filter((c: any) => c.id !== '__caddy_meta__');

                const normalizeSlotLabel = (s: number | string) => {
                    if (s === 'Extra 1') return 'E1';
                    if (s === 'Extra 2') return 'E2';
                    return s;
                };

                const parsed: CaddyData = {
                    interior: (dbData.interior || DEFAULT_INTERIOR).map((item: CaddySlot) => ({
                        ...item,
                        slot: normalizeSlotLabel(item.slot)
                    })),
                    exterior: (dbData.exterior || DEFAULT_EXTERIOR).map((item: CaddySlot) => ({
                        ...item,
                        slot: normalizeSlotLabel(item.slot)
                    })),
                    custom_caddies: validCustomCaddies
                };
                
                // Legacy slot migration fallback
                if (parsed.interior.length === 8) {
                    parsed.interior.push(
                        { slot: 'E1', name: "", ratio: "", purpose: "" },
                        { slot: 'E2', name: "", ratio: "", purpose: "" }
                    );
                }
                if (parsed.exterior.length === 8) {
                    parsed.exterior.push(
                        { slot: 'E1', name: "", ratio: "", purpose: "" },
                        { slot: 'E2', name: "", ratio: "", purpose: "" }
                    );
                }
                
                const restoredMap: Record<string, boolean> = {
                    interior: metaItem ? Boolean(metaItem.interiorCollapsed) : false,
                    exterior: metaItem ? Boolean(metaItem.exteriorCollapsed) : false,
                };

                validCustomCaddies.forEach((c: CustomCaddy & { collapsed?: boolean }) => {
                    restoredMap[c.id] = c.collapsed !== undefined ? Boolean(c.collapsed) : true;
                });

                setCollapsedMap(restoredMap);
                setData(parsed);
                setShowExtraSlots(dbData.show_extra_slots || false);

                const initialSelected = ['interior', 'exterior', ...validCustomCaddies.filter(c => c.visible).map(c => c.id)];
                setPdfSelection(initialSelected);
            } else {
                setData(DEFAULT_DATA);
                setShowExtraSlots(false);
                setCollapsedMap({
                    interior: false,
                    exterior: false,
                    'specialty-chemicals': true
                });
                setPdfSelection(['interior', 'exterior', 'specialty-chemicals']);
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
            const customCaddiesToSave = data.custom_caddies.map(c => ({
                ...c,
                collapsed: collapsedMap[c.id] !== undefined ? collapsedMap[c.id] : true
            }));

            const metaItem = {
                id: '__caddy_meta__',
                interiorCollapsed: Boolean(collapsedMap['interior']),
                exteriorCollapsed: Boolean(collapsedMap['exterior'])
            };

            const fullCustomList = [...customCaddiesToSave, metaItem];

            const { error } = await supabase
                .from('static_caddy_worksheet')
                .upsert({
                    id: 1,
                    interior: data.interior,
                    exterior: data.exterior,
                    custom_caddies: fullCustomList,
                    show_extra_slots: showExtraSlots,
                    updated_at: new Date().toISOString()
                });

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
                description: "Your caddy worksheet and settings have been saved to the database.",
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

    const toggleCollapse = async (caddyId: string) => {
        const isCurrentlyCollapsed = Boolean(collapsedMap[caddyId]);
        const nextMap = {
            ...collapsedMap,
            [caddyId]: !isCurrentlyCollapsed
        };
        setCollapsedMap(nextMap);

        // Auto-scroll to top of expanded caddy section
        if (isCurrentlyCollapsed) {
            setTimeout(() => {
                const el = document.getElementById(`caddy-section-${caddyId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 60);
        }

        // Auto-save collapse state to Supabase
        try {
            const customCaddiesToSave = data.custom_caddies.map(c => ({
                ...c,
                collapsed: nextMap[c.id] !== undefined ? nextMap[c.id] : true
            }));
            const metaItem = {
                id: '__caddy_meta__',
                interiorCollapsed: Boolean(nextMap['interior']),
                exteriorCollapsed: Boolean(nextMap['exterior'])
            };

            await supabase
                .from('static_caddy_worksheet')
                .upsert({
                    id: 1,
                    interior: data.interior,
                    exterior: data.exterior,
                    custom_caddies: [...customCaddiesToSave, metaItem],
                    show_extra_slots: showExtraSlots,
                    updated_at: new Date().toISOString()
                });
        } catch (e) {
            console.warn("Auto-save collapse state failed:", e);
        }
    };

    const activeCaddyIds = ['interior', 'exterior', ...data.custom_caddies.filter(c => c.visible).map(c => c.id)];
    const areAllCollapsed = activeCaddyIds.length > 0 && activeCaddyIds.every(id => Boolean(collapsedMap[id]));

    const toggleCollapseAll = async () => {
        const targetCollapsedState = !areAllCollapsed;
        const nextMap: Record<string, boolean> = {
            interior: targetCollapsedState,
            exterior: targetCollapsedState
        };
        data.custom_caddies.forEach(c => {
            nextMap[c.id] = targetCollapsedState;
        });
        setCollapsedMap(nextMap);

        try {
            const customCaddiesToSave = data.custom_caddies.map(c => ({
                ...c,
                collapsed: targetCollapsedState
            }));
            const metaItem = {
                id: '__caddy_meta__',
                interiorCollapsed: targetCollapsedState,
                exteriorCollapsed: targetCollapsedState
            };

            await supabase
                .from('static_caddy_worksheet')
                .upsert({
                    id: 1,
                    interior: data.interior,
                    exterior: data.exterior,
                    custom_caddies: [...customCaddiesToSave, metaItem],
                    show_extra_slots: showExtraSlots,
                    updated_at: new Date().toISOString()
                });

            toast({
                title: targetCollapsedState ? "All Accordions Collapsed" : "All Accordions Expanded",
                description: `Updated visibility state for all caddies.`,
            });
        } catch (e) {
            console.warn("Auto-save collapse all state failed:", e);
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
            collapsed: true,
            slots: Array(8).fill(null).map((_, i) => ({ slot: i + 1, name: '', ratio: '', purpose: '', description: '' })).concat([
                { slot: 'Extra 1', name: '', ratio: '', purpose: '', description: '' },
                { slot: 'Extra 2', name: '', ratio: '', purpose: '', description: '' }
            ])
        });
        setData(newData);
        setCollapsedMap(prev => ({ ...prev, [newId]: true }));
        setPdfSelection(prev => [...prev, newId]);
    };

    const handleDeleteSlot = (caddyId: string, index: number) => {
        if (window.confirm('Are you sure you want to delete this slot? This will permanently remove its contents.')) {
            setData(prev => {
                const newCustomCaddies = [...prev.custom_caddies];
                const cIdx = newCustomCaddies.findIndex(c => c.id === caddyId);
                if (cIdx > -1) {
                    const newSlots = [...newCustomCaddies[cIdx].slots];
                    newSlots.splice(index, 1);
                    newCustomCaddies[cIdx] = { ...newCustomCaddies[cIdx], slots: newSlots };
                }
                return { ...prev, custom_caddies: newCustomCaddies };
            });
        }
    };
    
    const handleRemoveLastSlot = (caddyId: string) => {
        setData(prev => {
            const newCustomCaddies = [...prev.custom_caddies];
            const cIdx = newCustomCaddies.findIndex(c => c.id === caddyId);
            if (cIdx > -1) {
                const newSlots = [...newCustomCaddies[cIdx].slots];
                if (newSlots.length > 1) {
                    newSlots.pop();
                    newCustomCaddies[cIdx] = { ...newCustomCaddies[cIdx], slots: newSlots };
                }
            }
            return { ...prev, custom_caddies: newCustomCaddies };
        });
    };
    
    const handleAddSlot = (caddyId: string) => {
        setData(prev => {
            const newData = { ...prev };
            const cIdx = newData.custom_caddies.findIndex(c => c.id === caddyId);
            if (cIdx > -1) {
                const currentSlots = newData.custom_caddies[cIdx].slots;
                let maxNumeric = 0;
                currentSlots.forEach(s => {
                    if (typeof s.slot === 'number') maxNumeric = Math.max(maxNumeric, s.slot);
                    else if (!isNaN(parseInt(s.slot as string))) maxNumeric = Math.max(maxNumeric, parseInt(s.slot as string));
                });
                currentSlots.push({
                    slot: maxNumeric + 1,
                    name: '',
                    ratio: '',
                    purpose: '',
                    description: ''
                });
            }
            return newData;
        });
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

    const handleGeneratePdf = (overrideSelection?: string[]) => {
        const targetSelection = overrideSelection || pdfSelection;
        const caddiesToPrint: Array<{ id: string; title: string; color: number[]; data: CaddySlot[] }> = [];

        if (targetSelection.includes('interior')) {
            caddiesToPrint.push({ id: 'interior', title: 'Interior Caddy', color: [147, 51, 234], data: data.interior });
        }
        if (targetSelection.includes('exterior')) {
            caddiesToPrint.push({ id: 'exterior', title: 'Exterior Caddy', color: [59, 130, 246], data: data.exterior });
        }

        data.custom_caddies.forEach(c => {
            if (c.visible && targetSelection.includes(c.id)) {
                caddiesToPrint.push({ id: c.id, title: c.title, color: [236, 72, 153], data: c.slots });
            }
        });

        if (caddiesToPrint.length === 0) {
            toast({
                title: "No Caddies Selected",
                description: "Please select at least one caddy to print.",
                variant: "destructive"
            });
            return;
        }

        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Caddy Quick-Reference Worksheet", 14, 22);
        doc.setFontSize(10);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 22);

        let currentY = 35;

        caddiesToPrint.forEach((caddy, idx) => {
            if (idx > 0 && currentY > 220) {
                doc.addPage();
                currentY = 20;
            } else if (idx > 0) {
                currentY += 12;
            }

            doc.setFontSize(13);
            doc.setTextColor(caddy.color[0], caddy.color[1], caddy.color[2]);
            doc.text(caddy.title, 14, currentY);

            const isBase = caddy.id === 'interior' || caddy.id === 'exterior';
            const isChemical = isChemicalCaddy(caddy.id);
            const slotsToPrint = (isBase && !showExtraSlots) ? caddy.data.slice(0, 8) : caddy.data;

            if (isChemical) {
                autoTable(doc, {
                    startY: currentY + 3,
                    head: [['Slot #', 'Chemical Name', 'Ratio', 'Purpose']],
                    body: slotsToPrint.map(item => [
                        item.slot.toString(),
                        item.name,
                        item.ratio,
                        item.purpose
                    ]),
                    theme: 'grid',
                    headStyles: { fillColor: caddy.color, textColor: [255, 255, 255], fontStyle: 'bold' },
                    columnStyles: {
                        0: { cellWidth: 20, halign: 'center' },
                        1: { cellWidth: 65 },
                        2: { cellWidth: 25, halign: 'center' },
                        3: { cellWidth: 'auto' }
                    },
                    styles: { fontSize: 9, cellPadding: 4, textColor: [30, 30, 30] },
                    alternateRowStyles: { fillColor: [249, 250, 251] },
                });
            } else {
                autoTable(doc, {
                    startY: currentY + 3,
                    head: [['Slot #', 'Item Name', 'Ratio / Qty', 'Purpose', 'Description']],
                    body: slotsToPrint.map(item => [
                        item.slot.toString(),
                        item.name,
                        item.ratio,
                        item.purpose,
                        item.description || ''
                    ]),
                    theme: 'grid',
                    headStyles: { fillColor: caddy.color, textColor: [255, 255, 255], fontStyle: 'bold' },
                    columnStyles: {
                        0: { cellWidth: 16, halign: 'center' },
                        1: { cellWidth: 45 },
                        2: { cellWidth: 24, halign: 'center' },
                        3: { cellWidth: 45 },
                        4: { cellWidth: 'auto' }
                    },
                    styles: { fontSize: 8.5, cellPadding: 3.5, textColor: [30, 30, 30] },
                    alternateRowStyles: { fillColor: [249, 250, 251] },
                });
            }

            currentY = (doc as any).lastAutoTable.finalY;
        });

        const filename = caddiesToPrint.length === 1 
            ? `${caddiesToPrint[0].title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
            : `Static_Caddy_Worksheet_${new Date().toISOString().split('T')[0]}.pdf`;

        doc.save(filename);
        toast({
            title: "PDF Generated",
            description: `Exported ${caddiesToPrint.length} caddy sheet${caddiesToPrint.length > 1 ? 's' : ''}.`,
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
                purpose: targetItem.purpose,
                description: targetItem.description
            };

            arr[newIndex] = {
                ...targetItem,
                name: currentItem.name,
                ratio: currentItem.ratio,
                purpose: currentItem.purpose,
                description: currentItem.description
            };

            if (isBase) {
                return { ...prev, [caddy]: arr };
            } else {
                const newCustom = prev.custom_caddies.map(c => c.id === caddy ? { ...c, slots: arr } : c);
                return { ...prev, custom_caddies: newCustom };
            }
        });
    };

    const renderMobileTableBody = (caddy: string) => {
        const sourceSlots = (caddy === 'interior' || caddy === 'exterior') ? data[caddy as 'interior'|'exterior'] : data.custom_caddies.find(c => c.id === caddy)?.slots;
        if (!sourceSlots) return null;
        const isBase = caddy === 'interior' || caddy === 'exterior';
        const isChem = isChemicalCaddy(caddy);
        const items = (isBase && !showExtraSlots) ? sourceSlots.slice(0, 8) : sourceSlots;
        return (
            <div className="rounded-md border border-zinc-800 bg-zinc-950 flex flex-col w-full text-xs overflow-hidden">
                <div className="flex w-full bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-medium py-2 sticky top-0 z-10">
                    <div className="w-[42px] shrink-0 text-center px-1">Slot</div>
                    <div className="flex-[5] min-w-0 px-1 truncate">{isChem ? 'Chemical Name' : 'Item Name'}</div>
                    <div className="w-16 shrink-0 text-center px-1 truncate">Ratio</div>
                    <div className="flex-[3.5] min-w-0 px-1 truncate">Purpose</div>
                    {!isBase && <div className="w-6 shrink-0"></div>}
                </div>
                <div className="flex flex-col w-full divide-y divide-zinc-800">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex flex-col w-full hover:bg-zinc-900/50 transition-colors py-1.5 px-1">
                            <div className="flex w-full items-center">
                                <div className="w-[42px] shrink-0 flex items-center justify-center gap-1 font-bold text-zinc-500 px-0.5">
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
                                <div className="flex-[5] min-w-0 px-1">
                                    <Input
                                        value={item.name}
                                        onChange={(e) => updateSlot(caddy, idx, 'name', e.target.value)}
                                        className="h-8 bg-zinc-900/50 border-zinc-700/50 text-white w-full min-w-0 px-1.5 text-xs shadow-sm"
                                        placeholder={isChem ? "Chemical Name" : "Item Name"}
                                    />
                                </div>
                                <div className="w-16 shrink-0 px-1">
                                    <Input
                                        value={item.ratio}
                                        maxLength={6}
                                        onChange={(e) => updateSlot(caddy, idx, 'ratio', e.target.value)}
                                        className="h-8 bg-zinc-900/50 border-zinc-700/50 text-white w-full px-1 text-center text-xs font-semibold shadow-sm"
                                        placeholder="Ratio"
                                    />
                                </div>
                                <div className="flex-[3.5] min-w-0 px-1">
                                    <Input
                                        value={item.purpose}
                                        onChange={(e) => updateSlot(caddy, idx, 'purpose', e.target.value)}
                                        className="h-8 bg-zinc-900/50 border-zinc-700/50 text-white w-full min-w-0 px-1.5 text-xs shadow-sm"
                                        placeholder="Purpose"
                                    />
                                </div>
                                {!isBase && (
                                    <div className="w-6 shrink-0 flex items-center justify-center">
                                        <button
                                            onClick={() => handleDeleteSlot(caddy, idx)}
                                            className="text-red-900/50 hover:text-red-400 p-0.5 rounded"
                                            title="Delete Slot"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            
                            {!isChem && (
                                <div className="w-full flex items-center gap-1.5 pt-1.5 pl-[42px] pr-1">
                                    <span className="text-[10px] font-semibold text-fuchsia-400 shrink-0">Desc:</span>
                                    <Input
                                        value={item.description || ''}
                                        onChange={(e) => updateSlot(caddy, idx, 'description', e.target.value)}
                                        placeholder="Description (clay bars, pads, brushes, left/right side details...)"
                                        className="h-7 text-xs bg-zinc-900/80 border-zinc-700/60 text-zinc-200 w-full"
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderTableBody = (caddy: string) => {
        if (isRealMobile) {
            return renderMobileTableBody(caddy);
        }

        const sourceSlots = (caddy === 'interior' || caddy === 'exterior') ? data[caddy as 'interior'|'exterior'] : data.custom_caddies.find(c => c.id === caddy)?.slots;
        if (!sourceSlots) return null;
        const isBase = caddy === 'interior' || caddy === 'exterior';
        const isChem = isChemicalCaddy(caddy);
        const items = (isBase && !showExtraSlots) ? sourceSlots.slice(0, 8) : sourceSlots;
        return (
            <div className="rounded-md border border-zinc-800 overflow-hidden">
                <div className="flex flex-col w-full text-sm overflow-hidden">
                    <div className="flex w-full bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-medium py-3">
                        <div className="w-16 shrink-0 text-center px-2">Slot</div>
                        <div className="flex-[5] min-w-0 px-2 truncate">{isChem ? 'Chemical Name' : 'Item Name'}</div>
                        <div className="w-20 shrink-0 text-center px-2 truncate">Ratio</div>
                        <div className="flex-[4] min-w-0 px-2 truncate">Purpose</div>
                        {!isBase && <div className="w-10 shrink-0"></div>}
                    </div>
                    <div className="flex flex-col w-full divide-y divide-zinc-800 bg-zinc-950/50">
                        {items.map((item, idx) => (
                            <div key={idx} className="flex flex-col w-full hover:bg-zinc-900/50 transition-colors py-2 px-2">
                                <div className="flex w-full items-center">
                                    <div className="w-16 shrink-0 flex items-center justify-center gap-1 font-bold text-zinc-500 px-1">
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
                                        <span className="w-6 text-center truncate">{item.slot}</span>
                                    </div>
                                    <div className="flex-[5] min-w-0 px-2">
                                        <Input
                                            value={item.name}
                                            onChange={(e) => updateSlot(caddy, idx, 'name', e.target.value)}
                                            className="h-9 bg-zinc-900/50 border-zinc-800 text-white w-full shadow-sm text-sm"
                                            placeholder={isChem ? "Chemical Name (e.g. Pink Perfection)" : "Item Name (e.g. Clay Bar / Microfiber)"}
                                        />
                                    </div>
                                    <div className="w-20 shrink-0 px-2">
                                        <Input
                                            value={item.ratio}
                                            maxLength={6}
                                            onChange={(e) => updateSlot(caddy, idx, 'ratio', e.target.value)}
                                            className="h-9 bg-zinc-900/50 border-zinc-800 text-white w-full text-center font-semibold shadow-sm text-sm"
                                            placeholder="Ratio"
                                        />
                                    </div>
                                    <div className="flex-[4] min-w-0 px-2">
                                        <Input
                                            value={item.purpose}
                                            onChange={(e) => updateSlot(caddy, idx, 'purpose', e.target.value)}
                                            className="h-9 bg-zinc-900/50 border-zinc-800 text-white w-full shadow-sm text-sm"
                                            placeholder="Purpose"
                                        />
                                    </div>
                                    {!isBase && (
                                        <div className="w-10 shrink-0 flex items-center justify-center">
                                            <button
                                                onClick={() => handleDeleteSlot(caddy, idx)}
                                                className="text-red-900/50 hover:text-red-400 p-1.5 rounded"
                                                title="Delete Slot"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {!isChem && (
                                    <div className="w-full flex items-center gap-2 pt-1.5 pl-16 pr-10">
                                        <span className="text-xs font-semibold text-fuchsia-400 shrink-0">Description:</span>
                                        <Input
                                            value={item.description || ''}
                                            onChange={(e) => updateSlot(caddy, idx, 'description', e.target.value)}
                                            placeholder="Description (e.g. clay bars, pads, brushes, left side/right side details...)"
                                            className="h-8 text-xs bg-zinc-900/80 border-zinc-700/60 text-zinc-200 w-full"
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderCaddySection = (caddyId: string, title: string, colorClass: string) => {
        const sourceSlots = (caddyId === 'interior' || caddyId === 'exterior') 
            ? data[caddyId as 'interior'|'exterior'] 
            : data.custom_caddies.find(c => c.id === caddyId)?.slots;
        if (!sourceSlots) return null;
        const isBase = caddyId === 'interior' || caddyId === 'exterior';
        const slotCount = (isBase && !showExtraSlots) ? 8 : sourceSlots.length;
        const isCollapsed = Boolean(collapsedMap[caddyId]);
        const isSelectedForPdf = pdfSelection.includes(caddyId);

        return (
            <div 
                id={`caddy-section-${caddyId}`}
                className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden shadow-sm scroll-mt-3"
            >
                <div className="flex items-center justify-between gap-2 p-3 bg-zinc-900/90 border-b border-zinc-800/80">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Checkbox
                            id={`pdf-select-${caddyId}`}
                            checked={isSelectedForPdf}
                            onCheckedChange={() => {
                                setPdfSelection(prev => 
                                    prev.includes(caddyId) ? prev.filter(p => p !== caddyId) : [...prev, caddyId]
                                );
                            }}
                            className="border-zinc-600 data-[state=checked]:bg-fuchsia-600 data-[state=checked]:border-fuchsia-600 shrink-0"
                            title={isSelectedForPdf ? "Included in PDF selection" : "Excluded from PDF selection"}
                        />
                        <div 
                            className="flex items-center gap-2 cursor-pointer select-none truncate"
                            onClick={() => toggleCollapse(caddyId)}
                        >
                            <h3 className={`text-base sm:text-lg font-bold ${colorClass} truncate`}>
                                {title}
                            </h3>
                            <span className="text-xs font-normal text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 shrink-0">
                                {slotCount} slots
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGeneratePdf([caddyId])}
                            title={`Print ${title} Only`}
                            className="h-8 px-2.5 border-fuchsia-500/30 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-300 text-xs flex items-center gap-1.5 shrink-0"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Print {title}</span>
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCollapse(caddyId)}
                            title={isCollapsed ? `Expand ${title}` : `Collapse ${title}`}
                            className="h-8 px-2 text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center gap-1 shrink-0"
                        >
                            <span className="text-[11px] font-medium text-zinc-400 hidden sm:inline">
                                {isCollapsed ? "Expand" : "Collapse"}
                            </span>
                            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>

                {!isCollapsed && (
                    <div className="p-3">
                        {renderTableBody(caddyId)}
                    </div>
                )}
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-zinc-950 border-zinc-800 text-white p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b border-zinc-800 shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <DialogTitle className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                                    Caddy Worksheet
                                </DialogTitle>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button className="text-zinc-400 hover:text-fuchsia-400 transition-colors focus:outline-none flex items-center justify-center">
                                            <HelpCircle className="h-5 w-5" />
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent 
                                        className="z-[99999] w-[90vw] max-w-lg p-4 bg-zinc-900 border border-zinc-700 shadow-2xl rounded-xl text-zinc-300 max-h-[80vh] overflow-y-auto" 
                                        side="bottom" 
                                        align="start"
                                        sideOffset={5}
                                    >
                                        <div className="text-zinc-300">
                                            <h3 className="font-bold text-white text-base mb-3 border-b border-zinc-800 pb-2">Caddy Worksheet Guide</h3>
                                            <ul className="space-y-3 text-xs sm:text-sm leading-relaxed">
                                                <li className="break-words"><strong className="text-fuchsia-400">🧰 1. Standalone & Cloud Sync:</strong> Runs independent of main inventory while automatically syncing collapse states and caddy setups to Supabase.</li>
                                                <li className="break-words"><strong className="text-blue-400">🗂️ 2. Accordions & Double-Arrow Toggle:</strong> Click any header or the header double-arrow icon button to expand or collapse all caddies. Expanding a caddy automatically scrolls its header to top of viewport.</li>
                                                <li className="break-words"><strong className="text-purple-400">🖨️ 3. Per-Caddy & Batch Printing:</strong> Click the dedicated Print button directly next to any caddy to print just that sheet, or check boxes and click Print Selected.</li>
                                                <li className="break-words"><strong className="text-amber-400">🧪 4. Ratio Field & E1/E2 Slots:</strong> Chemical caddies feature a dedicated 'Ratio' field. Extra slots 9 & 10 display cleanly as E1 and E2.</li>
                                                <li className="break-words"><strong className="text-pink-400">📝 5. Custom Caddies & Aligned Descriptions:</strong> Non-chemical caddies feature a full-width Description line aligned under Item Name for gear, pads, brushes, and side details.</li>
                                                <li className="break-words"><strong className="text-green-400">💾 6. Caddy Settings & History:</strong> Access Extra Slots toggle (8 vs 10 slots) and Reset to Saved Defaults inside Caddy Settings (gear icon).</li>
                                            </ul>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                                Independent fallback reference sheet. These edits are isolated from the main inventory.
                            </p>
                        </div>

                        {/* Main Action Bar */}
                        <div className="flex items-center gap-2 shrink-0">
                            {(showHistory || showManageCaddies) ? (
                                <>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowHistory(false);
                                        setShowManageCaddies(false);
                                    }}
                                    title="Back to Worksheet"
                                    className="h-9 w-9 p-0 border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 flex items-center justify-center shrink-0"
                                >
                                    <ArrowLeft className="w-5 h-5 text-zinc-300" />
                                </Button>
                                {showManageCaddies && (
                                    <Button onClick={handleSave}
                                        disabled={isSaving}
                                        title="Save"
                                        className="h-9 w-9 p-0 bg-green-600 hover:bg-green-500 text-white flex items-center justify-center shrink-0 ml-1"
                                    >
                                        <Save className="w-4 h-4" />
                                    </Button>
                                )}
                                </>
                            ) : (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowHistory(true)}
                                        title="History"
                                        className="h-9 w-9 p-0 border-zinc-700 flex items-center justify-center bg-zinc-900 text-zinc-400 hover:text-white shrink-0"
                                    >
                                        <HistoryIcon className="w-4 h-4" />
                                    </Button>
                                    
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowManageCaddies(true)}
                                        title="Caddy Settings"
                                        className="h-9 w-9 p-0 border-zinc-700 flex items-center justify-center shrink-0 bg-zinc-900 text-zinc-400 hover:text-white"
                                    >
                                        <Settings2 className="h-4 w-4" />
                                    </Button>

                                    {/* Icon-Only Double Arrow Expand/Collapse All Button (Exact 36px x 36px size) */}
                                    <Button
                                        variant="outline"
                                        onClick={toggleCollapseAll}
                                        title={areAllCollapsed ? "Expand All Accordions" : "Collapse All Accordions"}
                                        className="h-9 w-9 p-0 border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0"
                                    >
                                        {areAllCollapsed ? (
                                            <ChevronsDown className="w-4 h-4 text-fuchsia-400" />
                                        ) : (
                                            <ChevronsUp className="w-4 h-4 text-fuchsia-400" />
                                        )}
                                    </Button>

                                    <Button
                                        variant="outline"
                                        onClick={() => handleGeneratePdf(pdfSelection)}
                                        title="Print Selected Caddies"
                                        className="h-9 px-2.5 border-fuchsia-500/30 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center shrink-0 gap-1.5"
                                    >
                                        <Printer className="w-4 h-4" />
                                        <span className="text-xs font-bold hidden sm:inline">Print Selected ({pdfSelection.length})</span>
                                    </Button>
                                    
                                    <Button onClick={handleSave}
                                        disabled={isSaving}
                                        title="Save"
                                        className="h-9 w-9 p-0 bg-green-600 hover:bg-green-500 text-white flex items-center justify-center shrink-0"
                                    >
                                        <Save className="w-4 h-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 overflow-y-auto">
                    {showManageCaddies ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-fuchsia-500/20 pb-2">
                                <h3 className="text-lg font-bold text-fuchsia-400">Caddy Settings</h3>
                                <Button
                                    variant="outline"
                                    onClick={handleReset}
                                    title="Reset Worksheet to Saved Defaults"
                                    className="h-8 px-3 text-xs border-amber-500/40 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 flex items-center gap-1.5"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Reset to Saved Defaults
                                </Button>
                            </div>
                            
                            <div className="space-y-4 pt-2">
                                {/* Extra Slots Setting Card */}
                                <div className="flex items-center justify-between p-3.5 rounded-lg bg-zinc-900 border border-zinc-800">
                                    <div>
                                        <span className="text-sm font-bold text-white">Worksheet Extra Slots View</span>
                                        <p className="text-xs text-zinc-400 mt-0.5">Toggle display of Extra 1 & Extra 2 slots (slots 9 & 10) on base caddies.</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowExtraSlots(!showExtraSlots)}
                                        className={`h-9 px-3 border-zinc-700 text-xs font-semibold shrink-0 ${showExtraSlots ? 'bg-fuchsia-600/20 text-fuchsia-300 border-fuchsia-500/30' : 'bg-zinc-800 text-zinc-300'}`}
                                    >
                                        {showExtraSlots ? 'Extra Slots Shown (10 Slots)' : 'Extra Slots Hidden (8 Slots)'}
                                    </Button>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded bg-zinc-900 border border-zinc-800">
                                    <span className="text-sm font-bold text-purple-400">Interior Caddy</span>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => setPdfSelection(prev => prev.includes('interior') ? prev.filter(p => p !== 'interior') : [...prev, 'interior'])}
                                            className={`h-8 px-3 text-xs ${pdfSelection.includes('interior') ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}
                                        >
                                            {pdfSelection.includes('interior') ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />} {pdfSelection.includes('interior') ? 'Included in PDF' : 'Excluded from PDF'}
                                        </Button>
                                        <span className="text-xs text-zinc-500 bg-zinc-950 px-2 py-1 rounded hidden sm:inline-block">Always Visible</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded bg-zinc-900 border border-zinc-800">
                                    <span className="text-sm font-bold text-blue-400">Exterior Caddy</span>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => setPdfSelection(prev => prev.includes('exterior') ? prev.filter(p => p !== 'exterior') : [...prev, 'exterior'])}
                                            className={`h-8 px-3 text-xs ${pdfSelection.includes('exterior') ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}
                                        >
                                            {pdfSelection.includes('exterior') ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />} {pdfSelection.includes('exterior') ? 'Included in PDF' : 'Excluded from PDF'}
                                        </Button>
                                        <span className="text-xs text-zinc-500 bg-zinc-950 px-2 py-1 rounded hidden sm:inline-block">Always Visible</span>
                                    </div>
                                </div>
                                {data.custom_caddies.map(caddy => (
                                    <div key={caddy.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded bg-zinc-900 border border-zinc-700">
                                        <div className="flex-1 w-full flex flex-col gap-1">
                                            <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
                                                <span>Custom Caddy</span>
                                                <span className="font-medium text-fuchsia-400">{caddy.slots.length} slots</span>
                                            </div>
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
                                                onClick={() => setPdfSelection(prev => prev.includes(caddy.id) ? prev.filter(p => p !== caddy.id) : [...prev, caddy.id])}
                                                title={pdfSelection.includes(caddy.id) ? "Included in PDF" : "Excluded from PDF"}
                                                className={`h-10 px-3 shrink-0 flex items-center ${pdfSelection.includes(caddy.id) ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}
                                            >
                                                {pdfSelection.includes(caddy.id) ? <Check className="w-4 h-4 mr-1" /> : <X className="w-4 h-4 mr-1" />} <span className="hidden sm:inline text-xs">{pdfSelection.includes(caddy.id) ? 'Included in PDF' : 'Excluded from PDF'}</span>
                                            </Button>
                                            <div className="flex h-10 border border-zinc-700 rounded bg-zinc-800 overflow-hidden shrink-0">
                                                <button
                                                    onClick={() => handleRemoveLastSlot(caddy.id)}
                                                    title="Remove Last Slot"
                                                    disabled={caddy.slots.length <= 1}
                                                    className="px-3 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed border-r border-zinc-700 transition-colors"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <div className="px-3 flex items-center justify-center text-xs font-medium text-zinc-300">
                                                    Slot
                                                </div>
                                                <button
                                                    onClick={() => handleAddSlot(caddy.id)}
                                                    title="Add Extra Slot"
                                                    className="px-3 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 border-l border-zinc-700 transition-colors"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
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
                        <div className="space-y-6">
                            {renderCaddySection('interior', 'Interior Caddy', 'text-purple-400')}
                            {renderCaddySection('exterior', 'Exterior Caddy', 'text-blue-400')}
                            {data.custom_caddies.filter(c => c.visible).map(c => (
                                <div key={c.id}>
                                    {renderCaddySection(c.id, c.title, c.colorClass)}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
