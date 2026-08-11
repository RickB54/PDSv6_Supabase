import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, X, Plus, Minus, Search, Filter, CheckCircle, ChevronDown, ChevronUp, Info, HelpCircle, ArrowDownUp, Check, Download } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Chemical, Material, Tool as Equipment, saveChemical, saveMaterial, saveTool, saveUsageHistory } from '@/lib/inventory-data';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { getCurrentUser } from '@/lib/auth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InventoryAuditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chemicals: Chemical[];
  supplies: Material[];
  equipment: Equipment[];
  onRefresh: () => void;
}

type TabType = 'chemicals' | 'supplies' | 'equipment';

// State interfaces
interface SupplyEquipAuditState {
  counted: number;
}

interface JugEntry {
  fillLevel: number; // 1, 0.75, 0.5, 0.25, 0
  count: number;
}

interface BottleEntry {
  id: string; // unique local ID
  sizePreset: string; // '32', '24', '16', 'custom'
  sizeOz: number; // actual size
  fillLevel: number; // 1, 0.75, 0.5, 0.25, 0
  ratioParts: number; // For 4:1, parts = 4 (water). Chem = 1 part. Total parts = 5.
}

interface ChemicalAuditState {
  isConcentrate: boolean;
  // For 'Used as-is'
  usedAsIsJugs: JugEntry[]; // Array of { fillLevel, count }
  
  // For 'Concentrate'
  detailedMode: boolean;
  gallons: JugEntry[];
  bottles: BottleEntry[];
}

const FILL_LEVELS = [
  { label: 'Full', value: 1 },
  { label: '3/4', value: 0.75 },
  { label: '1/2', value: 0.5 },
  { label: '1/4', value: 0.25 },
  { label: 'Empty', value: 0 },
];

const RATIO_PRESETS = [
  { label: '4:1', parts: 4 },
  { label: '10:1', parts: 10 },
  { label: '20:1', parts: 20 },
  { label: '256:1', parts: 256 }, // e.g., 1/2 oz per gallon
];
const normalizeSize = (size?: string) => {
  if (!size) return '';
  const lower = size.toLowerCase().trim();
  if (lower.includes('gal')) return '1 Gallon';
  const ozMatch = lower.match(/(\d+)\s*oz/);
  if (ozMatch) return `${ozMatch[1]} oz`;
  const numMatch = lower.match(/^(\d+)$/);
  if (numMatch) return `${numMatch[1]} oz`;
  return size.trim();
};

export default function InventoryAuditModal({ open, onOpenChange, chemicals, supplies, equipment, onRefresh }: InventoryAuditModalProps) {
  const { toast } = useToast();
  
  const normalizedChemicals = useMemo(() => chemicals.map(c => ({
    ...c,
    bottleSize: normalizeSize(c.bottleSize)
  })), [chemicals]);

  const [activeTab, setActiveTab] = useState<TabType>('chemicals');
  const [search, setSearch] = useState('');
  const [hideCounted, setHideCounted] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters & Sorting
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterBrands, setFilterBrands] = useState<string[]>([]);
  const [filterShelves, setFilterShelves] = useState<string[]>([]);
  const [filterSizes, setFilterSizes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string[]>(['shelfLocation', 'brand']); // Multiple sort criteria
  const [filterOpen, setFilterOpen] = useState(false);

  // Expanded items in accordion
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Audit state per item ID
  const [supplyAudit, setSupplyAudit] = useState<Record<string, SupplyEquipAuditState>>({});
  const [equipAudit, setEquipAudit] = useState<Record<string, SupplyEquipAuditState>>({});
  const [chemAudit, setChemAudit] = useState<Record<string, ChemicalAuditState>>({});

  // Initialize chemical state
  useEffect(() => {
    if (open) {
      setSupplyAudit({});
      setEquipAudit({});
      const initialChem: Record<string, ChemicalAuditState> = {};
      normalizedChemicals.forEach(c => {
        initialChem[c.id] = {
          isConcentrate: c.isConcentrate !== false, // default true
          usedAsIsJugs: FILL_LEVELS.map(f => ({ fillLevel: f.value, count: 0 })),
          detailedMode: false,
          gallons: FILL_LEVELS.map(f => ({ fillLevel: f.value, count: 0 })),
          bottles: []
        };
      });
      setChemAudit(initialChem);
      setReviewMode(false);
      setActiveTab('chemicals');
      setHideCounted(false);
    }
  }, [open, chemicals]);

  const toggleExpand = (id: string) => setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));

  // Handlers for Supplies & Equipment
  const updateSupplyCount = (id: string, delta: number) => {
    setSupplyAudit(prev => {
      const curr = prev[id]?.counted || 0;
      return { ...prev, [id]: { counted: Math.max(0, curr + delta) } };
    });
  };
  
  const updateEquipCount = (id: string, delta: number) => {
    setEquipAudit(prev => {
      const curr = prev[id]?.counted || 0;
      return { ...prev, [id]: { counted: Math.max(0, curr + delta) } };
    });
  };

  // Handlers for Chemicals
  const toggleChemMode = (id: string, field: 'isConcentrate' | 'detailedMode') => {
    setChemAudit(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: !prev[id][field] }
    }));
  };

  const updateChemJugCount = (id: string, type: 'usedAsIsJugs' | 'gallons', fillLevel: number, delta: number) => {
    setChemAudit(prev => {
      const state = prev[id];
      const arr = [...state[type]];
      const idx = arr.findIndex(x => x.fillLevel === fillLevel);
      if (idx >= 0) {
        arr[idx].count = Math.max(0, arr[idx].count + delta);
      }
      return { ...prev, [id]: { ...state, [type]: arr } };
    });
  };

  const addBottle = (id: string) => {
    setChemAudit(prev => {
      const state = prev[id];
      return {
        ...prev,
        [id]: {
          ...state,
          bottles: [...state.bottles, { id: crypto.randomUUID(), sizePreset: '32', sizeOz: 32, fillLevel: 1, ratioParts: 10 }]
        }
      };
    });
  };

  const updateBottle = (id: string, bottleId: string, updates: Partial<BottleEntry>) => {
    setChemAudit(prev => {
      const state = prev[id];
      return {
        ...prev,
        [id]: {
          ...state,
          bottles: state.bottles.map(b => b.id === bottleId ? { ...b, ...updates } : b)
        }
      };
    });
  };

  const removeBottle = (id: string, bottleId: string) => {
    setChemAudit(prev => {
      const state = prev[id];
      return {
        ...prev,
        [id]: {
          ...state,
          bottles: state.bottles.filter(b => b.id !== bottleId)
        }
      };
    });
  };

  // Computed totals
  const getChemTotalStock = (id: string, chem: Chemical) => {
    const state = chemAudit[id];
    if (!state) return 0;
    
    if (!state.isConcentrate) {
      // Used as-is: return total fractional containers
      const totalFractional = state.usedAsIsJugs.reduce((acc, j) => acc + (j.count * j.fillLevel), 0);
      return totalFractional;
    } else {
      let totalOz = 0;
      // Add gallons (128 oz)
      totalOz += state.gallons.reduce((acc, j) => acc + (j.count * j.fillLevel * 128), 0);
      
      // Add bottles if detailed mode
      if (state.detailedMode) {
        state.bottles.forEach(b => {
          // If ratio is 10:1, there are 10 parts water, 1 part chem. Total 11 parts.
          const actualVol = b.sizeOz * b.fillLevel;
          const chemOz = actualVol / (b.ratioParts + 1);
          totalOz += chemOz;
        });
      }
      
      // Convert to units
      let sizeInOz = 128; // Default to gallon
      const sizeMatch = chem.bottleSize?.match(/(\d+)\s*oz/i);
      if (sizeMatch) sizeInOz = parseInt(sizeMatch[1]);
      else if (chem.bottleSize?.toLowerCase().includes('gallon') || chem.bottleSize?.toLowerCase().includes('gal')) sizeInOz = 128;
      
      return totalOz / sizeInOz;
    }
  };

  const isChemCounted = (id: string) => {
    const s = chemAudit[id];
    if (!s) return false;
    if (!s.isConcentrate) return s.usedAsIsJugs.some(j => j.count > 0);
    return s.gallons.some(j => j.count > 0) || (s.detailedMode && s.bottles.length > 0);
  };

  const getFilteredItems = <T extends { id: string; name: string; brand?: string; category?: string }>(items: T[], auditState: Record<string, any>, checkCounted: (id: string) => boolean) => {
    return items.filter(item => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !(item.brand && item.brand.toLowerCase().includes(search.toLowerCase())) && !(item.category && item.category.toLowerCase().includes(search.toLowerCase()))) {
        return false;
      }
      if (hideCounted && checkCounted(item.id)) return false;
      return true;
    });
  };

  const filteredChemicals = getFilteredItems(normalizedChemicals, chemAudit, isChemCounted).filter(c => {
    if (filterTags.length > 0 && !filterTags.some(t => c.tags?.includes(t))) return false;
    if (filterBrands.length > 0 && (!c.brand || !filterBrands.includes(c.brand))) return false;
    if (filterShelves.length > 0 && (!c.shelfLocation || !filterShelves.includes(c.shelfLocation))) return false;
    if (filterSizes.length > 0 && (!c.bottleSize || !filterSizes.includes(c.bottleSize))) return false;
    return true;
  }).sort((a, b) => {
    for (const field of sortBy) {
      let valA = (a as any)[field] || '';
      let valB = (b as any)[field] || '';
      // tags is an array, let's join it for sorting
      if (field === 'tags') {
        valA = (a.tags || []).join(',');
        valB = (b.tags || []).join(',');
      }
      if (valA < valB) return -1;
      if (valA > valB) return 1;
    }
    // Fallback to name
    return a.name.localeCompare(b.name);
  });

  const groupedChemicals = useMemo(() => {
    const groups: Record<string, typeof filteredChemicals> = {};
    const primarySort = sortBy[0] || 'name';
    
    filteredChemicals.forEach(c => {
      let key = (c as any)[primarySort] || 'Uncategorized';
      if (primarySort === 'tags') {
        key = c.tags && c.tags.length > 0 ? c.tags.join(', ') : 'Untagged';
      } else if (primarySort === 'name') {
        key = 'All Chemicals';
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredChemicals, sortBy]);

  const filteredSupplies = getFilteredItems(supplies, supplyAudit, id => (supplyAudit[id]?.counted ?? 0) > 0);
  const filteredEquip = getFilteredItems(equipment, equipAudit, id => (equipAudit[id]?.counted ?? 0) > 0);

  const numCountedChems = normalizedChemicals.filter(c => isChemCounted(c.id)).length;
  const numCountedSupplies = supplies.filter(s => (supplyAudit[s.id]?.counted ?? 0) > 0).length;
  const numCountedEquip = equipment.filter(e => (equipAudit[e.id]?.counted ?? 0) > 0).length;

  const allTags = useMemo(() => Array.from(new Set(normalizedChemicals.flatMap(c => c.tags || []))).sort(), [normalizedChemicals]);
  const allBrands = useMemo(() => Array.from(new Set(normalizedChemicals.map(c => c.brand).filter(Boolean) as string[])).sort(), [normalizedChemicals]);
  const allShelves = useMemo(() => Array.from(new Set(normalizedChemicals.map(c => c.shelfLocation).filter(Boolean) as string[])).sort(), [normalizedChemicals]);
  const allSizes = useMemo(() => Array.from(new Set(normalizedChemicals.map(c => c.bottleSize).filter(Boolean) as string[])).sort(), [normalizedChemicals]);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Inventory Audit Checklist', 14, 22);
    doc.setFontSize(10);
    doc.text(`Date: ______________`, 150, 22);

    let currentY = 30;

    if (activeTab === 'chemicals') {
      const shelfOrder = ["Top Shelf", "2nd Shelf", "3rd Shelf", "Bottom Shelf", "Unassigned"];
      const sectionOrder = ["Left Side", "Middle", "Right Side", "Unassigned"];

      const pdfGroups: Record<string, Chemical[]> = {};
      filteredChemicals.forEach(chem => {
        const shelf = (chem as any).shelf || 'Unassigned';
        const section = (chem as any).section || 'Unassigned';
        const key = `${shelf} - ${section}`;
        if (!pdfGroups[key]) pdfGroups[key] = [];
        pdfGroups[key].push(chem as Chemical);
      });

      // Sort groups logically by shelf then section
      const sortedGroupKeys = Object.keys(pdfGroups).sort((a, b) => {
        const [shelfA, sectionA] = a.split(' - ');
        const [shelfB, sectionB] = b.split(' - ');
        
        const shelfDiff = shelfOrder.indexOf(shelfA) - shelfOrder.indexOf(shelfB);
        if (shelfDiff !== 0) return shelfDiff;
        
        return sectionOrder.indexOf(sectionA) - sectionOrder.indexOf(sectionB);
      });

      sortedGroupKeys.forEach(groupName => {
        const groupItems = pdfGroups[groupName].sort((a, b) => a.name.localeCompare(b.name));
        if (groupItems.length === 0) return;
        
        autoTable(doc, {
          startY: currentY,
          head: [[groupName, 'DB Qty', 'Actual Count']],
          body: groupItems.map(c => [
            `${c.brand ? c.brand + ' / ' : ''}${c.name} (${c.bottleSize || 'N/A'})`,
            c.currentStock,
            ''
          ]),
          theme: 'grid',
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
          styles: { textColor: [0, 0, 0] },
          columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 30, halign: 'center' },
            2: { cellWidth: 40 }
          },
          margin: { top: 10 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
      });
    } else {
      const items = activeTab === 'supplies' ? filteredSupplies : filteredEquip;
      autoTable(doc, {
        startY: currentY,
        head: [[activeTab === 'supplies' ? 'Supplies' : 'Equipment', 'DB Qty', 'Actual Count']],
        body: items.map((item: any) => [
          item.name,
          item.quantity || 1,
          ''
        ]),
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { textColor: [0, 0, 0] },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 40 }
        }
      });
    }

    doc.save(`Inventory_Audit_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleConfirmUpdate = async () => {
    setIsSubmitting(true);
    const user = getCurrentUser();
    try {
      // 1. Process Chemicals
      for (const chem of normalizedChemicals) {
        if (!isChemCounted(chem.id)) continue;
        const newStock = Number(getChemTotalStock(chem.id, chem).toFixed(2));
        if (newStock !== chem.currentStock || chem.isConcentrate !== chemAudit[chem.id].isConcentrate) {
          await saveChemical({ ...chem, currentStock: newStock, isConcentrate: chemAudit[chem.id].isConcentrate }, false, true);
          await saveUsageHistory({
            id: crypto.randomUUID(),
            chemicalId: chem.id,
            serviceName: 'Inventory Audit',
            date: new Date().toISOString(),
            notes: `Audit adjusted stock from ${chem.currentStock} to ${newStock}`,
            amountUsed: chem.currentStock - newStock,
            remainingStock: newStock
          });
        }
      }

      // 2. Process Supplies
      for (const supply of supplies) {
        if ((supplyAudit[supply.id]?.counted ?? 0) === 0) continue;
        const counted = supplyAudit[supply.id].counted;
        if (counted !== supply.quantity) {
          await saveMaterial({ ...supply, quantity: counted });
          await saveUsageHistory({
            id: crypto.randomUUID(),
            materialId: supply.id,
            serviceName: 'Inventory Audit',
            date: new Date().toISOString(),
            notes: `Audit adjusted qty from ${supply.quantity} to ${counted}`,
            amountUsed: supply.quantity - counted,
            remainingStock: counted
          });
        }
      }

      // 3. Process Equipment
      for (const equip of equipment) {
        if ((equipAudit[equip.id]?.counted ?? 0) === 0) continue;
        const counted = equipAudit[equip.id].counted;
        if (counted !== (equip.quantity || 1)) {
          await saveTool({ ...equip, quantity: counted });
          await saveUsageHistory({
            id: crypto.randomUUID(),
            toolId: equip.id,
            serviceName: 'Inventory Audit',
            date: new Date().toISOString(),
            notes: `Audit adjusted qty from ${equip.quantity || 1} to ${counted}`,
            amountUsed: (equip.quantity || 1) - counted,
            remainingStock: counted
          });
        }
      }

      toast({ title: 'Audit Complete', description: 'Inventory updated successfully.' });
      onRefresh();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderJugTallyRow = (fillLevel: number, count: number, onDelta: (delta: number) => void) => (
    <div key={fillLevel} className="flex items-center justify-between p-2 bg-zinc-950/50 rounded border border-zinc-800">
      <div className="text-sm font-medium w-16">{FILL_LEVELS.find(f => f.value === fillLevel)?.label}</div>
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-purple-500/30 text-purple-400" onClick={() => onDelta(-1)} disabled={count === 0}><Minus className="h-4 w-4" /></Button>
        <span className="w-8 text-center font-bold text-lg">{count}</span>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-purple-500/30 text-purple-400 bg-purple-500/10 hover:bg-purple-500 hover:text-white" onClick={() => onDelta(1)}><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[90vh] print:!block print:!static print:!transform-none print:!w-full print:!max-w-none print:!h-auto print:!min-h-0 print:!m-0 print:!p-0 print:!border-none print:!shadow-none flex flex-col p-0 bg-zinc-950 print:bg-white border-purple-500/30 shadow-2xl overflow-hidden print:!overflow-visible">
        <DialogHeader className="p-4 border-b border-purple-500/20 bg-zinc-900 shrink-0 print:hidden">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-purple-500" /> 
              {reviewMode ? 'Review Audit Changes' : 'Inventory Audit Checklist'}
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <button className="ml-2 text-zinc-400 hover:text-purple-400 transition-colors focus:outline-none">
                      <HelpCircle className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="z-[99999] max-w-sm bg-zinc-900 border-zinc-700 text-zinc-300 p-4 space-y-2 shadow-2xl">
                    <p className="font-bold text-white mb-2">How to perform an Audit:</p>
                    <ul className="list-disc pl-4 space-y-1 text-sm">
                      <li><strong>Count:</strong> For liquids, enter the exact remaining amount (e.g., 0.5 for half a jug).</li>
                      <li><strong>Detailed vs Quick:</strong> Use &quot;Detailed View&quot; to set exact fill levels, or use the + / - buttons.</li>
                      <li><strong>Organization:</strong> Chemicals are displayed by Shelf and Section. You can also group by Brand or Category.</li>
                      <li><strong>Review:</strong> Click &quot;Review Changes&quot; to see a summary of your counts before saving.</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DialogTitle>
          </div>
        </DialogHeader>

        {reviewMode ? (
          <div className="flex-1 overflow-auto p-4 space-y-6">
            {['Chemicals', 'Supplies', 'Equipment'].map(category => {
              const items = category === 'Chemicals' ? chemicals : category === 'Supplies' ? supplies : equipment;
              const hasChanges = items.some(item => {
                if (category === 'Chemicals') return isChemCounted(item.id) && getChemTotalStock(item.id, item as Chemical) !== (item as Chemical).currentStock;
                if (category === 'Supplies') return (supplyAudit[item.id]?.counted ?? 0) > 0 && supplyAudit[item.id].counted !== (item as Material).quantity;
                if (category === 'Equipment') return (equipAudit[item.id]?.counted ?? 0) > 0 && equipAudit[item.id].counted !== ((item as Equipment).quantity || 1);
                return false;
              });

              if (!hasChanges) return null;

              return (
                <div key={category} className="space-y-3">
                  <h3 className="text-lg font-bold text-purple-300 border-b border-purple-500/20 pb-1">{category} Updates</h3>
                  <div className="space-y-2">
                    {items.map(item => {
                      let dbQty = 0;
                      let newQty = 0;
                      let counted = false;

                      if (category === 'Chemicals') {
                        counted = isChemCounted(item.id);
                        if (!counted) return null;
                        dbQty = (item as Chemical).currentStock || 0;
                        newQty = getChemTotalStock(item.id, item as Chemical);
                      } else if (category === 'Supplies') {
                        counted = (supplyAudit[item.id]?.counted ?? 0) > 0;
                        if (!counted) return null;
                        dbQty = (item as Material).quantity || 0;
                        newQty = supplyAudit[item.id].counted;
                      } else {
                        counted = (equipAudit[item.id]?.counted ?? 0) > 0;
                        if (!counted) return null;
                        dbQty = (item as Equipment).quantity || 1;
                        newQty = equipAudit[item.id].counted;
                      }

                      if (dbQty === newQty) return null; // Only show actual diffs

                      const delta = newQty - dbQty;
                      const isMatch = delta === 0;
                      const isUp = delta > 0;
                      const colorClass = isMatch ? 'text-zinc-500' : isUp ? 'text-emerald-400' : 'text-red-400';

                      return (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-zinc-900 border border-zinc-800 rounded">
                          <span className="font-bold text-zinc-300">{(item as any).brand ? `${(item as any).brand} / ` : ''}{item.name}</span>
                          <div className="flex items-center gap-4 font-mono text-sm">
                            <span className="text-zinc-500">{dbQty.toFixed(2).replace(/\.00$/, '')}</span>
                            <span className="text-zinc-600">→</span>
                            <span className="text-white font-bold">{newQty.toFixed(2).replace(/\.00$/, '')}</span>
                            <span className={`w-16 text-right ${colorClass}`}>{isUp ? '+' : ''}{delta.toFixed(2).replace(/\.00$/, '')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 bg-zinc-900 border-b border-zinc-800 shrink-0">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full">
                <TabsList className="w-full grid grid-cols-3 bg-zinc-950 border border-purple-500/20">
                  <TabsTrigger value="chemicals" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300">Chemicals</TabsTrigger>
                  <TabsTrigger value="supplies" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300">Supplies</TabsTrigger>
                  <TabsTrigger value="equipment" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300">Equipment</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
                <div className="flex items-center gap-4">
                  <div className="text-sm font-bold text-zinc-400">
                    {activeTab === 'chemicals' && `${numCountedChems} of ${chemicals.length} counted`}
                    {activeTab === 'supplies' && `${numCountedSupplies} of ${supplies.length} counted`}
                    {activeTab === 'equipment' && `${numCountedEquip} of ${equipment.length} counted`}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="hide-counted" checked={hideCounted} onCheckedChange={setHideCounted} className="data-[state=checked]:bg-purple-500" />
                    <Label htmlFor="hide-counted" className="text-xs text-zinc-400">Hide Counted</Label>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 bg-zinc-950 border-zinc-800 text-sm h-9 text-white" />
                  </div>
                  {activeTab === 'chemicals' && (
                    <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 border-zinc-800 bg-zinc-950 text-zinc-300 relative">
                          <Filter className="h-4 w-4 mr-2" />
                          Filters
                          {(filterTags.length + filterBrands.length + filterShelves.length + filterSizes.length) > 0 && (
                            <Badge className="ml-2 bg-purple-500 hover:bg-purple-600 px-1 py-0 h-4 text-[10px]">
                              {filterTags.length + filterBrands.length + filterShelves.length + filterSizes.length}
                            </Badge>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 bg-zinc-950 border-zinc-800 text-white p-4" align="end">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                            <h4 className="font-bold">Filter & Sort</h4>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-xs text-zinc-400" 
                              onClick={() => { setFilterTags([]); setFilterBrands([]); setFilterShelves([]); setFilterSizes([]); setSortBy(['shelfLocation', 'brand']); }}
                            >
                              Reset
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-xs text-zinc-500 uppercase">Sort Order</Label>
                            <Select value={sortBy.join(',')} onValueChange={(v) => setSortBy(v.split(','))}>
                              <SelectTrigger className="h-8 bg-zinc-900 border-zinc-800"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="shelfLocation,brand">Shelf → Brand</SelectItem>
                                <SelectItem value="brand,name">Brand → Name</SelectItem>
                                <SelectItem value="tags,name">Group/Tag → Name</SelectItem>
                                <SelectItem value="bottleSize,name">Size → Name</SelectItem>
                                <SelectItem value="name">Name Only</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2 max-h-[40vh] overflow-auto pr-2">
                            <Label className="text-xs text-zinc-500 uppercase block mb-1">Tags (Groups)</Label>
                            <div className="flex flex-wrap gap-1 mb-3">
                              {allTags.map(t => (
                                <Badge 
                                  key={t} 
                                  variant="outline" 
                                  className={`cursor-pointer ${filterTags.includes(t) ? 'bg-purple-500/20 text-purple-300 border-purple-500/50' : 'text-zinc-400 border-zinc-700'}`}
                                  onClick={() => setFilterTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                                >
                                  {t}
                                </Badge>
                              ))}
                            </div>

                            <Label className="text-xs text-zinc-500 uppercase block mb-1">Shelf Location</Label>
                            <div className="flex flex-wrap gap-1 mb-3">
                              {allShelves.map(s => (
                                <Badge 
                                  key={s} 
                                  variant="outline" 
                                  className={`cursor-pointer ${filterShelves.includes(s) ? 'bg-purple-500/20 text-purple-300 border-purple-500/50' : 'text-zinc-400 border-zinc-700'}`}
                                  onClick={() => setFilterShelves(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                                >
                                  {s}
                                </Badge>
                              ))}
                            </div>

                            <Label className="text-xs text-zinc-500 uppercase block mb-1">Brand</Label>
                            <div className="flex flex-wrap gap-1 mb-3">
                              {allBrands.map(b => (
                                <Badge 
                                  key={b} 
                                  variant="outline" 
                                  className={`cursor-pointer ${filterBrands.includes(b) ? 'bg-purple-500/20 text-purple-300 border-purple-500/50' : 'text-zinc-400 border-zinc-700'}`}
                                  onClick={() => setFilterBrands(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b])}
                                >
                                  {b}
                                </Badge>
                              ))}
                            </div>
                            
                            <Label className="text-xs text-zinc-500 uppercase block mb-1">Size</Label>
                            <div className="flex flex-wrap gap-1">
                              {allSizes.map(s => (
                                <Badge 
                                  key={s} 
                                  variant="outline" 
                                  className={`cursor-pointer ${filterSizes.includes(s) ? 'bg-purple-500/20 text-purple-300 border-purple-500/50' : 'text-zinc-400 border-zinc-700'}`}
                                  onClick={() => setFilterSizes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                                >
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                  <Button variant="outline" size="sm" className="h-9 border-zinc-800 bg-zinc-950 text-zinc-300" onClick={() => window.print()}>
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4 print:hidden">
              {activeTab === 'chemicals' && groupedChemicals.map(([groupName, groupItems]) => (
                <div key={groupName} className="space-y-4">
                  {groupName !== 'All Chemicals' && (
                    <h3 className="text-sm font-black text-purple-400 uppercase tracking-widest border-b border-purple-500/20 pb-1 mt-4">
                      {groupName}
                    </h3>
                  )}
                  {groupItems.map(c => {
                    const s = chemAudit[c.id];
                    if (!s) return null;
                    const isCounted = isChemCounted(c.id);
                    const isExpanded = expandedItems[c.id];
                    
                    return (
                      <div key={c.id} className={`border rounded-lg overflow-hidden transition-colors ${isCounted ? 'bg-purple-950/20 border-purple-500/50' : 'bg-zinc-900 border-zinc-800'}`}>
                    <div className="flex items-center justify-between p-3 cursor-pointer select-none" onClick={() => toggleExpand(c.id)}>
                      <div className="flex items-center gap-3">
                        {isCounted ? <CheckCircle className="h-5 w-5 text-purple-400" /> : <div className="h-5 w-5 rounded-full border border-zinc-600" />}
                        <div>
                          <div className="font-bold text-zinc-200">{c.brand ? `${c.brand} / ` : ''}{c.name}</div>
                          <div className="text-xs text-zinc-500 flex items-center gap-2">
                            <span>DB: {c.currentStock} {c.bottleSize}</span>
                            {(c.shelf || c.section) && (
                              <>
                                <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                                <span className="text-purple-400/80">
                                  {c.shelf || 'No Shelf'} / {c.section || 'No Section'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {isCounted && <div className="text-sm font-bold text-emerald-400">{getChemTotalStock(c.id, c).toFixed(2).replace(/\.00$/, '')} Units</div>}
                        {isExpanded ? <ChevronUp className="h-5 w-5 text-zinc-500" /> : <ChevronDown className="h-5 w-5 text-zinc-500" />}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-4">
                        <div className="flex items-center gap-4 p-2 bg-zinc-900 rounded border border-zinc-800">
                          <span className="text-sm font-bold text-zinc-300">Product Type:</span>
                          <div className="flex items-center gap-2">
                            <span className={!s.isConcentrate ? 'text-white' : 'text-zinc-500'}>Used As-Is</span>
                            <Switch checked={s.isConcentrate} onCheckedChange={() => toggleChemMode(c.id, 'isConcentrate')} className="data-[state=checked]:bg-purple-500" />
                            <span className={s.isConcentrate ? 'text-white font-bold' : 'text-zinc-500'}>Concentrate</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-help inline-flex"><Info className="h-4 w-4 text-zinc-500 ml-2" /></span>
                                </TooltipTrigger>
                                <TooltipContent className="z-[99999] bg-zinc-800 text-white border-zinc-700">
                                  <p>Is this diluted with water (Concentrate) or used directly from the bottle (Used As-Is)?</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>

                        {!s.isConcentrate ? (
                          <div className="space-y-2">
                            <Label className="text-xs text-zinc-400 uppercase">Tally Containers by Fill Level</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {FILL_LEVELS.map(f => renderJugTallyRow(f.value, s.usedAsIsJugs.find(j => j.fillLevel === f.value)?.count || 0, (delta) => updateChemJugCount(c.id, 'usedAsIsJugs', f.value, delta)))}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-center gap-4 p-2 bg-purple-950/20 rounded border border-purple-500/20">
                              <span className="text-sm font-bold text-zinc-300">Counting Mode:</span>
                              <div className="flex items-center gap-2">
                                <span className={!s.detailedMode ? 'text-white font-bold' : 'text-zinc-500'}>Quick (Gallons)</span>
                                <Switch checked={s.detailedMode} onCheckedChange={() => toggleChemMode(c.id, 'detailedMode')} className="data-[state=checked]:bg-purple-500" />
                                <span className={s.detailedMode ? 'text-white font-bold' : 'text-zinc-500'}>Detailed (w/ Bottles)</span>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="cursor-help inline-flex"><Info className="h-4 w-4 text-zinc-500 ml-2" /></span>
                                    </TooltipTrigger>
                                    <TooltipContent className="z-[99999] bg-zinc-800 text-white border-zinc-700 max-w-xs text-center">
                                      <p>Quick ignores spray bottles (fast reserve check). Detailed adds individual spray bottles converted back to concentrate oz.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs text-zinc-400 uppercase">Gallons on Hand</Label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {FILL_LEVELS.map(f => renderJugTallyRow(f.value, s.gallons.find(j => j.fillLevel === f.value)?.count || 0, (delta) => updateChemJugCount(c.id, 'gallons', f.value, delta)))}
                              </div>
                            </div>

                            {s.detailedMode && (
                              <div className="space-y-2 pt-4 border-t border-zinc-800">
                                <div className="flex justify-between items-center">
                                  <Label className="text-xs text-zinc-400 uppercase">Diluted Spray Bottles</Label>
                                  <Button size="sm" variant="outline" className="h-7 text-xs border-purple-500/50 text-purple-400 hover:bg-purple-500 hover:text-white" onClick={() => addBottle(c.id)}><Plus className="h-3 w-3 mr-1" /> Add Bottle</Button>
                                </div>
                                {s.bottles.length === 0 ? (
                                  <div className="text-sm text-zinc-600 italic">No spray bottles added yet.</div>
                                ) : (
                                  <div className="space-y-2">
                                    {s.bottles.map((b, idx) => (
                                      <div key={b.id} className="flex flex-wrap items-center gap-3 p-3 bg-zinc-900 border border-zinc-700 rounded relative">
                                        <div className="flex-1 min-w-[120px]">
                                          <Label className="text-[10px] text-zinc-500">Size</Label>
                                          <Select value={b.sizePreset} onValueChange={v => {
                                            if (v === 'custom') {
                                              updateBottle(c.id, b.id, { sizePreset: v });
                                            } else {
                                              updateBottle(c.id, b.id, { sizePreset: v, sizeOz: parseInt(v) });
                                            }
                                          }}>
                                            <SelectTrigger className="h-8 bg-zinc-950 text-white"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="32">32 oz</SelectItem>
                                              <SelectItem value="24">24 oz</SelectItem>
                                              <SelectItem value="16">16 oz</SelectItem>
                                              <SelectItem value="custom">Custom (oz)</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          {b.sizePreset === 'custom' && (
                                            <Input
                                              type="number"
                                              min="1"
                                              className="h-8 mt-2 bg-zinc-950 text-white"
                                              placeholder="oz"
                                              value={b.sizeOz || ''}
                                              onChange={(e) => updateBottle(c.id, b.id, { sizeOz: parseInt(e.target.value) || 0 })}
                                            />
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-[120px]">
                                          <Label className="text-[10px] text-zinc-500">Fill Level</Label>
                                          <Select value={b.fillLevel.toString()} onValueChange={v => updateBottle(c.id, b.id, { fillLevel: parseFloat(v) })}>
                                            <SelectTrigger className="h-8 bg-zinc-950 text-white"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                              {FILL_LEVELS.map(f => <SelectItem key={f.value} value={f.value.toString()}>{f.label}</SelectItem>)}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="flex-1 min-w-[120px]">
                                          <Label className="text-[10px] text-zinc-500">Dilution Ratio</Label>
                                          <Select value={b.ratioParts.toString()} onValueChange={v => updateBottle(c.id, b.id, { ratioParts: parseInt(v) })}>
                                            <SelectTrigger className="h-8 bg-zinc-950 text-white"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                              {RATIO_PRESETS.map(r => <SelectItem key={r.parts} value={r.parts.toString()}>{r.label}</SelectItem>)}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 self-end mb-0.5 hover:bg-red-500/10" onClick={() => removeBottle(c.id, b.id)}><X className="h-4 w-4" /></Button>
                                        
                                        <div className="w-full text-right text-[10px] text-zinc-500 mt-1">
                                          Adds {((b.sizeOz * b.fillLevel) / (b.ratioParts + 1)).toFixed(2)} oz concentrate
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="pt-2 border-t border-purple-500/20 text-right">
                          <span className="text-sm text-zinc-400 mr-2">Calculated Stock:</span>
                          <span className="text-lg font-black text-purple-400">{getChemTotalStock(c.id, c).toFixed(2).replace(/\.00$/, '')}</span>
                          <span className="text-xs text-zinc-500 ml-1">{s.isConcentrate ? 'Gallons' : 'Units'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            ))}

              {/* Supplies & Equipment Generic Tally */}
              {(activeTab === 'supplies' ? filteredSupplies : activeTab === 'equipment' ? filteredEquip : []).map((item: any) => {
                const auditMap = activeTab === 'supplies' ? supplyAudit : equipAudit;
                const updateCount = activeTab === 'supplies' ? updateSupplyCount : updateEquipCount;
                const counted = auditMap[item.id]?.counted || 0;
                const isCounted = counted > 0;

                return (
                  <div key={item.id} className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${isCounted ? 'bg-blue-950/20 border-blue-500/50' : 'bg-zinc-900 border-zinc-800'}`}>
                    <div className="flex items-center gap-3">
                      {isCounted ? <CheckCircle className="h-5 w-5 text-blue-400" /> : <div className="h-5 w-5 rounded-full border border-zinc-600" />}
                      <div>
                        <div className="font-bold text-zinc-200">{item.name}</div>
                        <div className="text-xs text-zinc-500">DB Qty: {item.quantity || 1}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Button variant="outline" size="sm" className="h-10 w-10 p-0 border-blue-500/30 text-blue-400" onClick={() => updateCount(item.id, -1)} disabled={counted === 0}><Minus className="h-5 w-5" /></Button>
                      <div className="w-12 text-center">
                        <div className="font-black text-2xl text-white">{counted}</div>
                      </div>
                      <Button variant="outline" size="sm" className="h-10 w-10 p-0 border-blue-500/30 text-blue-400 bg-blue-500/10 hover:bg-blue-500 hover:text-white" onClick={() => updateCount(item.id, 1)}><Plus className="h-5 w-5" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="p-4 border-t border-purple-500/20 bg-zinc-900 shrink-0 flex justify-between print:hidden">
          <Button variant="ghost" onClick={() => reviewMode ? setReviewMode(false) : onOpenChange(false)}>
            {reviewMode ? 'Back to Audit' : 'Cancel'}
          </Button>
          {!reviewMode ? (
            <Button className="bg-purple-600 hover:bg-purple-500 text-white font-bold" onClick={() => setReviewMode(true)}>
              Review Changes
            </Button>
          ) : (
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold" onClick={handleConfirmUpdate} disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Confirm & Update Inventory'}
            </Button>
          )}
        </DialogFooter>

        {/* PRINT LAYOUT */}
        <div className="hidden print:block bg-white text-black print:absolute print:left-0 print:top-0 print:w-full print:bg-white print:p-8 print:m-0" style={{ zIndex: 99999 }}>
          <h1 className="text-2xl font-bold mb-6 text-center border-b border-black pb-4">Inventory Audit Checklist</h1>
          <div className="text-right text-sm text-gray-500 mb-6">Date: ______________</div>
          
          {activeTab === 'chemicals' && groupedChemicals.map(([groupName, groupItems]) => (
            <div key={groupName} className="mb-8 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
              <h2 className="text-xl font-bold bg-gray-200 p-2 mb-4 border border-black">{groupName}</h2>
              <table className="w-full border-collapse border border-black text-left text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b border-black">
                    <th className="p-2 border border-black w-8 text-center">✓</th>
                    <th className="p-2 border border-black">Item</th>
                    <th className="p-2 border border-black w-24 text-center">DB Qty</th>
                    <th className="p-2 border border-black w-40 text-center">Actual Count</th>
                  </tr>
                </thead>
                <tbody>
                  {groupItems.map(c => (
                    <tr key={c.id} className="border-b border-black break-inside-avoid">
                      <td className="p-2 border border-black text-center"><div className="w-4 h-4 border border-black mx-auto"></div></td>
                      <td className="p-2 border border-black">
                        <div className="font-bold">{c.brand ? `${c.brand} / ` : ''}{c.name}</div>
                        <div className="text-xs text-gray-600">{c.bottleSize}</div>
                      </td>
                      <td className="p-2 border border-black text-center font-bold text-lg">{c.currentStock}</td>
                      <td className="p-2 border border-black"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          
          {activeTab !== 'chemicals' && (
            <div className="mb-8 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
              <h2 className="text-xl font-bold bg-gray-200 p-2 mb-4 border border-black">{activeTab === 'supplies' ? 'Supplies' : 'Equipment'}</h2>
              <table className="w-full border-collapse border border-black text-left text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b border-black">
                    <th className="p-2 border border-black w-8 text-center">✓</th>
                    <th className="p-2 border border-black">Item</th>
                    <th className="p-2 border border-black w-24 text-center">DB Qty</th>
                    <th className="p-2 border border-black w-40 text-center">Actual Count</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeTab === 'supplies' ? filteredSupplies : filteredEquip).map((item: any) => (
                    <tr key={item.id} className="border-b border-black break-inside-avoid">
                      <td className="p-2 border border-black text-center"><div className="w-4 h-4 border border-black mx-auto"></div></td>
                      <td className="p-2 border border-black font-bold">{item.name}</td>
                      <td className="p-2 border border-black text-center font-bold text-lg">{item.quantity || 1}</td>
                      <td className="p-2 border border-black"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
