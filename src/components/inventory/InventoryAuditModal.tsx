import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, X, Plus, Minus, Search, Filter, CheckCircle, ChevronDown, ChevronUp, Info, HelpCircle, ArrowDownUp, Check, Download, Save, History, RotateCcw, Trash2, AlertTriangle, Edit, Eye, Archive } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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
import { getInventoryAuditHistory, upsertInventoryAuditHistory, deleteInventoryAuditHistory } from '@/lib/supa-data';

interface InventoryAuditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chemicals: Chemical[];
  supplies: Material[];
  equipment: Equipment[];
  onRefresh: () => void;
  onEditItem?: (item: any, type: 'chemical' | 'supply' | 'equipment') => void;
}

type TabType = 'chemicals' | 'supplies' | 'equipment';

// Audit snapshot for save-progress / history
interface AuditSnapshot {
  id: string;
  timestamp: string; // ISO
  status: 'in-progress' | 'completed';
  note?: string;
  chemAudit: Record<string, ChemicalAuditState>;
  supplyAudit: Record<string, SupplyEquipAuditState>;
  equipAudit: Record<string, SupplyEquipAuditState>;
  activeTab: TabType;
  totalCounted: number;
  archived?: boolean;
}

// Legacy fallback for offline/cache if needed
const HISTORY_KEY = 'inventory_audit_history';
const getLocalHistory = (): AuditSnapshot[] => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
};
const saveLocalHistory = (history: AuditSnapshot[]) => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
};

// State interfaces
interface SupplyEquipAuditState {
  counted: number;
  isCounted: boolean;
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

export default function InventoryAuditModal({ open, onOpenChange, chemicals, supplies, equipment, onRefresh, onEditItem }: InventoryAuditModalProps) {
  const { toast } = useToast();
  
  const normalizedChemicals = useMemo(() => chemicals.map(c => ({
    ...c,
    shelfLocation: c.shelfLocation || ((c.shelf || c.section) ? `${c.shelf || 'Unassigned'} / ${c.section || 'Unassigned'}` : undefined),
    bottleSize: normalizeSize(c.bottleSize)
  })), [chemicals]);

  const [activeTab, setActiveTab] = useState<TabType>('chemicals');
  const [search, setSearch] = useState('');
  const [hideCounted, setHideCounted] = useState(false);
  const [globalDetailedMode, setGlobalDetailedMode] = useState(false);
  
  const handleGlobalDetailedModeToggle = (checked: boolean) => {
    setGlobalDetailedMode(checked);
    setChemAudit(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        next[id] = { ...next[id], detailedMode: checked };
      });
      return next;
    });
  };
  const [reviewMode, setReviewMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'in-progress' | 'completed' | 'archived'>('all');
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  
  const [historySnapshots, setHistorySnapshots] = useState<AuditSnapshot[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [cancelWarningOpen, setCancelWarningOpen] = useState(false);
  const [viewingSnapshot, setViewingSnapshot] = useState<AuditSnapshot | null>(null);
  const [historyDeleteId, setHistoryDeleteId] = useState<string | null>(null);
  
  const handleCloseAttempt = () => {
    const hasChemChanges = Object.keys(chemAudit).some(id => {
      if (isChemCounted(id)) return true;
      const c = chemicals.find(chem => chem.id === id);
      if (c && chemAudit[id].isConcentrate !== !!c.isConcentrate) return true;
      return false;
    });
    const hasSupplyChanges = Object.values(supplyAudit).some(s => s.isCounted);
    const hasEquipChanges = Object.values(equipAudit).some(e => e.isCounted);

    if (hasChemChanges || hasSupplyChanges || hasEquipChanges) {
      setCancelWarningOpen(true);
    } else {
      onOpenChange(false);
    }
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await getInventoryAuditHistory();
      if (data && data.length > 0) {
        setHistorySnapshots(data as AuditSnapshot[]);
        saveLocalHistory(data as AuditSnapshot[]); // cache
      } else {
        setHistorySnapshots(getLocalHistory());
      }
    } catch (err) {
      console.error(err);
      setHistorySnapshots(getLocalHistory());
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Filters & Sorting
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterBrands, setFilterBrands] = useState<string[]>([]);
  const [filterShelves, setFilterShelves] = useState<string[]>([]);
  const [filterSections, setFilterSections] = useState<string[]>([]);
  const [filterSizes, setFilterSizes] = useState<string[]>([]);
  const [filterLocations, setFilterLocations] = useState<string[]>([]);
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
      setShowHistory(false);
      setActiveTab('chemicals');
      setHideCounted(false);
      setFilterLocations([]);
      fetchHistory();
    }
  }, [open]);

  const toggleExpand = (id: string) => setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));

  // Handlers for Supplies & Equipment
  const updateSupplyCount = (id: string, delta: number, explicitIsCounted?: boolean) => {
    setSupplyAudit(prev => {
      const curr = prev[id]?.counted || 0;
      const newCount = Math.max(0, curr + delta);
      return { ...prev, [id]: { counted: newCount, isCounted: explicitIsCounted ?? true } };
    });
  };
  
  const updateEquipCount = (id: string, delta: number, explicitIsCounted?: boolean) => {
    setEquipAudit(prev => {
      const curr = prev[id]?.counted || 0;
      const newCount = Math.max(0, curr + delta);
      return { ...prev, [id]: { counted: newCount, isCounted: explicitIsCounted ?? true } };
    });
  };

  // Handlers for Chemicals
  const getChemState = (id: string, customState?: Record<string, ChemicalAuditState>): ChemicalAuditState => {
    const s = (customState || chemAudit)[id];
    if (s) return s;
    return {
      isConcentrate: true, // safe default for fallback
      usedAsIsJugs: FILL_LEVELS.map(f => ({ fillLevel: f.value, count: 0 })),
      detailedMode: globalDetailedMode,
      gallons: FILL_LEVELS.map(f => ({ fillLevel: f.value, count: 0 })),
      bottles: []
    };
  };

  const toggleChemMode = (id: string, field: 'isConcentrate' | 'detailedMode') => {
    setChemAudit(prev => {
      const state = getChemState(id, prev);
      return {
        ...prev,
        [id]: { ...state, [field]: !state[field] }
      };
    });
  };

  const updateChemJugCount = (id: string, type: 'usedAsIsJugs' | 'gallons', fillLevel: number, delta: number) => {
    setChemAudit(prev => {
      const state = getChemState(id, prev);
      const arr = [...state[type]];
      const idx = arr.findIndex(x => x.fillLevel === fillLevel);
      if (idx >= 0) {
        arr[idx].count = Math.max(0, arr[idx].count + delta);
      }
      return { ...prev, [id]: { ...state, [type]: arr } };
    });
  };

  const setQuickPartialGallon = (id: string, fillLevel: number) => {
    setChemAudit(prev => {
      const state = getChemState(id, prev);
      const type = state.isConcentrate ? 'gallons' : 'usedAsIsJugs';
      const arr = state[type].map(j => {
        if (j.fillLevel === 1) return j; // keep full gallons as is
        if (j.fillLevel === fillLevel) return { ...j, count: 1 };
        return { ...j, count: 0 };
      });
      return { ...prev, [id]: { ...state, [type]: arr } };
    });
  };

  const resetCategoryAudit = () => {
    if (activeTab === 'chemicals') {
      const initialChem: Record<string, ChemicalAuditState> = {};
      normalizedChemicals.forEach(c => {
        initialChem[c.id] = {
          isConcentrate: c.isConcentrate !== false,
          usedAsIsJugs: FILL_LEVELS.map(f => ({ fillLevel: f.value, count: 0 })),
          detailedMode: globalDetailedMode,
          gallons: FILL_LEVELS.map(f => ({ fillLevel: f.value, count: 0 })),
          bottles: []
        };
      });
      setChemAudit(initialChem);
    } else if (activeTab === 'supplies') {
      setSupplyAudit({});
    } else if (activeTab === 'equipment') {
      setEquipAudit({});
    }
  };

  const addBottle = (id: string) => {
    setChemAudit(prev => {
      const state = getChemState(id, prev);
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
      const state = getChemState(id, prev);
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
      const state = getChemState(id, prev);
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
  const getChemTotalStock = (id: string, chem: Chemical, customState?: Record<string, ChemicalAuditState>) => {
    const state = getChemState(id, customState);
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

  const isChemCounted = (id: string, customState?: Record<string, ChemicalAuditState>) => {
    const s = getChemState(id, customState);
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
    if (filterShelves.length > 0 && (!c.shelf || !filterShelves.includes(c.shelf))) return false;
    if (filterSections.length > 0 && (!c.section || !filterSections.includes(c.section))) return false;
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

  const filteredSupplies = getFilteredItems(supplies, supplyAudit, id => supplyAudit[id]?.isCounted).filter(s => {
    if (filterLocations.length > 0 && (!s.location || !filterLocations.includes(s.location))) return false;
    return true;
  });
  const filteredEquip = getFilteredItems(equipment, equipAudit, id => equipAudit[id]?.isCounted).filter(e => {
    if (filterLocations.length > 0 && (!e.location || !filterLocations.includes(e.location))) return false;
    return true;
  });

  const groupedNonChemicals = useMemo(() => {
    const items = activeTab === 'supplies' ? filteredSupplies : filteredEquip;
    const groups: Record<string, any[]> = {};
    const primarySort = sortBy[0] || 'location';
    
    items.forEach(item => {
      let loc = (item as any).location || 'Unassigned';
      if (primarySort === 'name' || primarySort === 'updated_at') loc = 'All Items';
      else if (primarySort === 'category') loc = (item as any).category || 'Unassigned';
      else {
        const containerLoc = (item as any).containerLocation || '';
        if (containerLoc) loc = `${loc} - ${containerLoc}`;
      }
      
      if (!groups[loc]) groups[loc] = [];
      groups[loc].push(item);
    });
    
    const sortedGroups = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
    
    sortedGroups.forEach(([_, groupItems]) => {
      groupItems.sort((a, b) => {
        if (primarySort === 'name') return (a.name || '').localeCompare(b.name || '');
        if (primarySort === 'updated_at') {
           const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
           const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
           return dateB - dateA;
        }
        return (a.name || '').localeCompare(b.name || '');
      });
    });

    return sortedGroups;
  }, [activeTab, filteredSupplies, filteredEquip, sortBy]);

  const numCountedChems = filteredChemicals.filter(c => isChemCounted(c.id)).length;
  const numCountedSupplies = filteredSupplies.filter(s => supplyAudit[s.id]?.isCounted).length;
  const numCountedEquip = filteredEquip.filter(e => equipAudit[e.id]?.isCounted).length;

  const allTags = useMemo(() => Array.from(new Set(normalizedChemicals.flatMap(c => c.tags || []))).sort(), [normalizedChemicals]);
  const allBrands = useMemo(() => Array.from(new Set(normalizedChemicals.map(c => c.brand).filter(Boolean) as string[])).sort(), [normalizedChemicals]);
  const allShelves = useMemo(() => Array.from(new Set(normalizedChemicals.map(c => c.shelf).filter(Boolean) as string[])).sort(), [normalizedChemicals]);
  const allSections = useMemo(() => Array.from(new Set(normalizedChemicals.map(c => c.section).filter(Boolean) as string[])).sort(), [normalizedChemicals]);
  const allSizes = useMemo(() => Array.from(new Set(normalizedChemicals.map(c => c.bottleSize).filter(Boolean) as string[])).sort(), [normalizedChemicals]);
  const allLocations = useMemo(() => {
    const locs = new Set<string>();
    supplies.forEach(s => s.location && locs.add(s.location));
    equipment.forEach(e => e.location && locs.add(e.location));
    return Array.from(locs).sort();
  }, [supplies, equipment]);

  const handleExportPDF = (snapshot?: AuditSnapshot) => {
    const targetChemAudit = snapshot ? snapshot.chemAudit : chemAudit;
    const targetSupplyAudit = snapshot ? snapshot.supplyAudit : supplyAudit;
    const targetEquipAudit = snapshot ? snapshot.equipAudit : equipAudit;
    const targetTab = snapshot ? snapshot.activeTab : activeTab;
    const dateTitle = snapshot 
      ? new Date(snapshot.timestamp).toLocaleString()
      : new Date().toLocaleDateString();

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Inventory Audit Checklist', 14, 22);
    doc.setFontSize(10);
    doc.text(`Date: ${dateTitle}`, 140, 22);

    let currentY = 30;

    if (targetTab === 'chemicals') {
      const shelfOrder = ["Top Shelf", "2nd Shelf", "3rd Shelf", "Bottom Shelf", "Unassigned"];
      const sectionOrder = ["Left Side", "Middle", "Right Side", "Unassigned"];

      const pdfGroups: Record<string, Chemical[]> = {};
      
      // If snapshot, we only show items that were counted in that snapshot, 
      // or if live, show all filtered items
      const itemsToPrint = snapshot 
        ? normalizedChemicals.filter(c => isChemCounted(c.id, targetChemAudit))
        : filteredChemicals;

      itemsToPrint.forEach(chem => {
        const rawShelf = (chem as any).shelf;
        const rawSection = (chem as any).section;
        const shelf = (typeof rawShelf === 'string' && rawShelf.trim()) ? rawShelf.trim() : 'Unassigned';
        const section = (typeof rawSection === 'string' && rawSection.trim()) ? rawSection.trim() : 'Unassigned';
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
          head: [[groupName, 'Container Type', 'DB Qty', 'Actual Count']],
          body: groupItems.map(c => {
            const countedStr = isChemCounted(c.id, targetChemAudit) ? getChemTotalStock(c.id, c, targetChemAudit).toFixed(2) : '';
            const containerType = (c as any).containerType || '';
            return [
              `${c.brand ? c.brand + ' / ' : ''}${c.name} (${c.bottleSize || 'N/A'})`,
              containerType,
              c.currentStock,
              countedStr || (snapshot ? '0' : '')
            ]
          }),
          theme: 'grid',
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
          styles: { textColor: [0, 0, 0] },
          columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 35 },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 30 }
          },
          margin: { top: 10 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
      });
    } else {
      const allItems = targetTab === 'supplies' ? supplies : equipment;
      const targetAudit = targetTab === 'supplies' ? targetSupplyAudit : targetEquipAudit;
      
      const itemsToPrint = snapshot
        ? allItems.filter(i => (targetAudit[i.id]?.counted ?? 0) > 0)
        : (targetTab === 'supplies' ? filteredSupplies : filteredEquip);
      
      const pdfGroups: Record<string, any[]> = {};
      itemsToPrint.forEach(item => {
        const baseLoc = (item as any).location || 'Unassigned';
        const containerLoc = (item as any).containerLocation || '';
        const loc = containerLoc ? `${baseLoc} - ${containerLoc}` : baseLoc;
        if (!pdfGroups[loc]) pdfGroups[loc] = [];
        pdfGroups[loc].push(item);
      });

      const sortedLocs = Object.keys(pdfGroups).sort();

      sortedLocs.forEach(loc => {
        const groupItems = pdfGroups[loc].sort((a, b) => a.name.localeCompare(b.name));
        if (groupItems.length === 0) return;

        autoTable(doc, {
          startY: currentY,
          head: [[`Location: ${loc}`, 'DB Qty', 'Actual Count']],
          body: groupItems.map((item: any) => {
            const counted = targetAudit[item.id]?.counted;
            return [
              item.name,
              item.quantity || 1,
              counted !== undefined ? String(counted) : (snapshot ? '0' : '')
            ];
          }),
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
    }

    doc.save(`Inventory_Audit_${targetTab}_${new Date().toISOString().split('T')[0]}.pdf`);
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
        if (!supplyAudit[supply.id]?.isCounted) continue;
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
        if (!equipAudit[equip.id]?.isCounted) continue;
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

      // Save completed snapshot to history
      const completedSnapshot: AuditSnapshot = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        status: 'completed',
        chemAudit,
        supplyAudit,
        equipAudit,
        activeTab,
        totalCounted: Object.keys(chemAudit || {}).filter(id => isChemCounted(id)).length +
          Object.values(supplyAudit || {}).filter(s => s?.isCounted).length +
          Object.values(equipAudit || {}).filter(e => e?.isCounted).length
      };
      
      await upsertInventoryAuditHistory(completedSnapshot as any);
      const updatedHistory = [completedSnapshot, ...historySnapshots.filter(s => s.id !== completedSnapshot.id)].slice(0, 50);
      setHistorySnapshots(updatedHistory);
      saveLocalHistory(updatedHistory);

      onRefresh();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Progress handler
  const handleSaveProgress = async () => {
    const totalCounted =
      Object.keys(chemAudit || {}).filter(id => isChemCounted(id)).length +
      Object.values(supplyAudit || {}).filter(s => s?.isCounted).length +
      Object.values(equipAudit || {}).filter(e => e?.isCounted).length;

    if (totalCounted === 0) {
      toast({ title: 'Nothing to Save', description: 'Count at least one item before saving progress.', variant: 'destructive' });
      return;
    }

    const snapshot: AuditSnapshot = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      status: 'in-progress',
      chemAudit,
      supplyAudit,
      equipAudit,
      activeTab,
      totalCounted
    };
    
    setIsSubmitting(true);
    try {
      await upsertInventoryAuditHistory(snapshot as any);
      const updatedHistory = [snapshot, ...historySnapshots.filter(s => s.id !== snapshot.id)].slice(0, 50);
      setHistorySnapshots(updatedHistory);
      saveLocalHistory(updatedHistory);
      toast({ title: 'Progress Saved', description: `${totalCounted} item${totalCounted !== 1 ? 's' : ''} saved. Resume anytime from History.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save progress', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resume from snapshot
  const handleResume = (snapshot: AuditSnapshot) => {
    // Merge snapshot chem audit with any newly added chemicals
    const mergedChem: Record<string, ChemicalAuditState> = { ...chemAudit };
    Object.entries(snapshot.chemAudit || {}).forEach(([id, state]) => {
      if (mergedChem[id]) mergedChem[id] = state as ChemicalAuditState;
    });
    setChemAudit(mergedChem);
    setSupplyAudit(snapshot.supplyAudit || {});
    setEquipAudit(snapshot.equipAudit || {});
    setActiveTab(snapshot.activeTab || 'chemicals');
    setShowHistory(false);
    toast({ title: 'Resumed', description: `Audit from ${new Date(snapshot.timestamp).toLocaleString()} loaded.` });
  };

  // Delete snapshot from history
  const handleDeleteSnapshot = async (id: string) => {
    try {
      await deleteInventoryAuditHistory(id);
      const updated = historySnapshots.filter(s => s.id !== id);
      setHistorySnapshots(updated);
      saveLocalHistory(updated);
      toast({ title: 'Deleted', description: 'Audit record removed from history.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete snapshot', variant: 'destructive' });
    }
  };

  const toggleArchiveSnapshot = (id: string) => {
    setHistorySnapshots(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, archived: !s.archived } : s);
      saveLocalHistory(updated);
      return updated;
    });
  };

  const confirmDeleteSnapshot = (id: string) => {
    setHistoryDeleteId(id);
  };

  const executeDeleteSnapshot = () => {
    if (!historyDeleteId) return;
    handleDeleteSnapshot(historyDeleteId);
    setHistoryDeleteId(null);
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
    <>
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleCloseAttempt(); else onOpenChange(val); }}>
      <DialogContent className="max-w-5xl w-full h-[90vh] print:!block print:!static print:!transform-none print:!w-full print:!max-w-none print:!h-auto print:!min-h-0 print:!m-0 print:!p-0 print:!border-none print:!shadow-none flex flex-col p-0 bg-zinc-950 print:bg-white border-purple-500/30 shadow-2xl overflow-hidden print:!overflow-visible">
        <DialogHeader className="p-4 border-b border-purple-500/20 bg-zinc-900 shrink-0 print:hidden">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-purple-500" /> 
              {showHistory ? 'Audit History' : reviewMode ? 'Review Audit Changes' : 'Inventory Audit Checklist'}
              {!showHistory && !reviewMode && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="ml-2 text-zinc-400 hover:text-purple-400 transition-colors focus:outline-none">
                      <HelpCircle className="h-5 w-5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="z-[99999] max-w-sm bg-zinc-900 border-zinc-700 text-zinc-300 p-4 space-y-2 shadow-2xl" side="bottom" align="start">
                    <p className="font-bold text-white mb-2">How to perform an Audit:</p>
                    <ul className="list-disc pl-4 space-y-1 text-sm">
                      <li><strong>Count:</strong> For liquids, enter the exact remaining amount (e.g., 0.5 for half a jug).</li>
                      <li><strong>Detailed vs Quick:</strong> Use &quot;Detailed View&quot; to set exact fill levels, or use the + / - buttons.</li>
                      <li><strong>Organization:</strong> Chemicals are displayed by Shelf and Section. You can also group by Brand or Category.</li>
                      <li><strong>Review:</strong> Click &quot;Review Changes&quot; to see a summary of your counts before saving.</li>
                      <li><strong>Save Progress:</strong> Use &quot;Save Progress&quot; to pause and resume later from History.</li>
                    </ul>
                  </PopoverContent>
                </Popover>
              )}
              {reviewMode && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="ml-2 text-zinc-400 hover:text-purple-400 transition-colors focus:outline-none">
                      <HelpCircle className="h-5 w-5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="z-[99999] max-w-sm bg-zinc-900 border-zinc-700 text-zinc-300 p-4 space-y-3 shadow-2xl" side="bottom" align="start">
                    <p className="font-bold text-white border-b border-zinc-800 pb-2">Understanding the Data Format</p>
                    <div className="bg-zinc-950 p-3 rounded border border-zinc-800 font-mono text-xs flex justify-between items-center text-center">
                      <div className="flex-1">
                        <div className="text-zinc-500 mb-1 text-[10px] uppercase">Old Qty</div>
                        <span className="text-zinc-400">1.00</span>
                      </div>
                      <span className="text-zinc-600 px-2">→</span>
                      <div className="flex-1">
                        <div className="text-emerald-400 mb-1 text-[10px] uppercase">New Qty</div>
                        <span className="text-white font-bold">5.00</span>
                      </div>
                      <div className="flex-1 text-right">
                        <div className="text-zinc-500 mb-1 text-[10px] uppercase">Diff</div>
                        <span className="text-emerald-400 font-bold">+4.00</span>
                      </div>
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-xs mt-3">
                      <li><strong className="text-zinc-200">Old Qty:</strong> The amount currently recorded in your database.</li>
                      <li><strong className="text-zinc-200">New Qty:</strong> The new amount you just entered.</li>
                      <li><strong className="text-zinc-200">Diff:</strong> Shows exactly how much stock was used or added. (<span className="text-red-400">Red</span> = Used, <span className="text-emerald-400">Green</span> = Added, <span className="text-zinc-500">Gray</span> = No Change).</li>
                    </ul>
                  </PopoverContent>
                </Popover>
              )}
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              className={`h-8 text-xs flex items-center gap-1.5 border-zinc-700 ${showHistory ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
              onClick={() => { 
                if (viewingSnapshot) {
                  setViewingSnapshot(null);
                } else {
                  setShowHistory(h => !h); 
                  setReviewMode(false); 
                }
              }}
            >
              <History className="h-3.5 w-3.5" />
              {showHistory && !viewingSnapshot ? 'Back to Audit' : viewingSnapshot ? 'Back to History' : 'History'}
            </Button>
          </div>
        </DialogHeader>

        {reviewMode || viewingSnapshot ? (
          <div className="flex-1 overflow-auto p-4 space-y-6">
            {(() => {
              const targetChemAudit = viewingSnapshot ? viewingSnapshot.chemAudit : chemAudit;
              const targetSupplyAudit = viewingSnapshot ? viewingSnapshot.supplyAudit : supplyAudit;
              const targetEquipAudit = viewingSnapshot ? viewingSnapshot.equipAudit : equipAudit;
              
              return ['Chemicals', 'Supplies', 'Equipment'].map(category => {
                const items = category === 'Chemicals' ? chemicals : category === 'Supplies' ? supplies : equipment;
                const hasChanges = items.some(item => {
                  if (category === 'Chemicals') return isChemCounted(item.id, targetChemAudit);
                  if (category === 'Supplies') return targetSupplyAudit[item.id]?.isCounted;
                  if (category === 'Equipment') return targetEquipAudit[item.id]?.isCounted;
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
                        counted = isChemCounted(item.id, targetChemAudit);
                        if (!counted) return null;
                        dbQty = (item as Chemical).currentStock || 0;
                        newQty = getChemTotalStock(item.id, item as Chemical, targetChemAudit);
                      } else if (category === 'Supplies') {
                        counted = !!targetSupplyAudit[item.id]?.isCounted;
                        if (!counted) return null;
                        dbQty = (item as Material).quantity || 0;
                        newQty = targetSupplyAudit[item.id].counted;
                      } else {
                        counted = !!targetEquipAudit[item.id]?.isCounted;
                        if (!counted) return null;
                        dbQty = (item as Equipment).quantity || 1;
                        newQty = targetEquipAudit[item.id].counted;
                      }



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
            });
            })()}
          </div>
        ) : !showHistory ? (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 bg-zinc-900 border-b border-zinc-800 shrink-0">
              <Tabs value={activeTab} onValueChange={(v) => {
                setActiveTab(v as TabType);
                if (v === 'chemicals') {
                  setSortBy(['shelfLocation', 'brand']);
                } else {
                  setSortBy(['location']);
                }
              }} className="w-full">
                <TabsList className="w-full grid grid-cols-3 bg-zinc-950 border border-purple-500/20">
                  <TabsTrigger value="chemicals" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300">Chemicals</TabsTrigger>
                  <TabsTrigger value="supplies" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300">Supplies</TabsTrigger>
                  <TabsTrigger value="equipment" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300">Equipment</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
                <div className="flex items-center gap-4">
                  <div className="text-sm font-bold text-zinc-400">
                    {activeTab === 'chemicals' && `${numCountedChems} of ${filteredChemicals.length} counted`}
                    {activeTab === 'supplies' && `${numCountedSupplies} of ${filteredSupplies.length} counted`}
                    {activeTab === 'equipment' && `${numCountedEquip} of ${filteredEquip.length} counted`}
                  </div>
                  <div className="flex items-center gap-4">
                    {activeTab === 'chemicals' && (
                      <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-md border border-zinc-800">
                        <Label htmlFor="global-mode" className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider cursor-pointer select-none">Quick</Label>
                        <Switch 
                          id="global-mode" 
                          checked={globalDetailedMode} 
                          onCheckedChange={handleGlobalDetailedModeToggle} 
                          className="data-[state=checked]:bg-purple-500 data-[state=unchecked]:bg-zinc-600 scale-75 origin-center" 
                        />
                        <Label htmlFor="global-mode" className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1 cursor-pointer select-none">
                          Detailed
                        </Label>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Switch id="hide-counted" checked={hideCounted} onCheckedChange={setHideCounted} className="data-[state=checked]:bg-purple-500 data-[state=unchecked]:bg-zinc-600" />
                      <Label htmlFor="hide-counted" className="text-xs text-zinc-400">Hide Counted</Label>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-2" 
                      onClick={() => {
                        if (Object.values(expandedItems).some(Boolean)) {
                          setExpandedItems({});
                        } else {
                          const allExpanded: Record<string, boolean> = {};
                          if (activeTab === 'chemicals') filteredChemicals.forEach(c => allExpanded[c.id] = true);
                          else if (activeTab === 'supplies') filteredSupplies.forEach(s => allExpanded[s.id] = true);
                          else filteredEquip.forEach(e => allExpanded[e.id] = true);
                          setExpandedItems(allExpanded);
                        }
                      }}
                    >
                      {Object.values(expandedItems).some(Boolean) ? 'Collapse All' : 'Expand All'}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 pr-8 bg-zinc-950 border-zinc-800 text-sm h-9 text-white" />
                    {search && (
                      <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-white transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 border-zinc-800 bg-zinc-950 text-zinc-300 relative">
                        <Filter className="h-4 w-4 mr-2" />
                        Filters
                        {(activeTab === 'chemicals' ? (filterTags.length + filterBrands.length + filterShelves.length + filterSections.length + filterSizes.length) : filterLocations.length) > 0 && (
                          <Badge className="ml-2 bg-purple-500 hover:bg-purple-600 px-1 py-0 h-4 text-[10px]">
                            {activeTab === 'chemicals' ? (filterTags.length + filterBrands.length + filterShelves.length + filterSections.length + filterSizes.length) : filterLocations.length}
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
                              onClick={() => { 
                                if (activeTab === 'chemicals') {
                                  setFilterTags([]); setFilterBrands([]); setFilterShelves([]); setFilterSizes([]); setSortBy(['shelfLocation', 'brand']); 
                                } else {
                                  setFilterLocations([]);
                                }
                              }}
                            >
                              Reset
                            </Button>
                          </div>

                          <div className="space-y-2 max-h-[40vh] overflow-auto pr-2">
                            {activeTab === 'chemicals' ? (
                              <>
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

                                <Label className="text-xs text-zinc-500 uppercase block mb-1">Shelf</Label>
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

                                <Label className="text-xs text-zinc-500 uppercase block mb-1">Section</Label>
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {allSections.map(s => (
                                    <Badge 
                                      key={s} 
                                      variant="outline" 
                                      className={`cursor-pointer ${filterSections.includes(s) ? 'bg-purple-500/20 text-purple-300 border-purple-500/50' : 'text-zinc-400 border-zinc-700'}`}
                                      onClick={() => setFilterSections(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
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
                              </>
                            ) : (
                              <>
                                <Label className="text-xs text-zinc-500 uppercase block mb-1">Location</Label>
                                <div className="flex flex-wrap gap-1">
                                  {allLocations.map(loc => {
                                    const items = activeTab === 'supplies' ? supplies : equipment;
                                    const count = items.filter((item: any) => item.location === loc).length;
                                    if (count === 0) return null;
                                    return (
                                      <Badge 
                                        key={loc} 
                                        variant="outline" 
                                        className={`cursor-pointer ${filterLocations.includes(loc) ? (activeTab === 'supplies' ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' : 'bg-amber-500/20 text-amber-300 border-amber-500/50') : 'text-zinc-400 border-zinc-700'}`}
                                        onClick={() => setFilterLocations(prev => prev.includes(loc) ? prev.filter(x => x !== loc) : [...prev, loc])}
                                      >
                                        {loc} ({count})
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  <Button variant="outline" size="sm" className="h-9 border-zinc-800 bg-zinc-950 text-zinc-300" onClick={() => window.print()} title="Print">
                    <Printer className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 w-9 p-0 border-orange-500/50 bg-orange-950/20 text-orange-400 hover:bg-orange-900/40" title={`Reset ${activeTab === 'chemicals' ? 'Chemicals' : activeTab === 'supplies' ? 'Supplies' : 'Equipment'}`}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-orange-400">
                          <AlertTriangle className="h-5 w-5" /> Reset Audit Data?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                          This will clear all your current session counted inventory for the <strong className="text-white capitalize">{activeTab}</strong> category. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:text-white">Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-orange-600 text-white hover:bg-orange-700" onClick={resetCategoryAudit}>
                          Yes, Reset
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <div className="flex items-center gap-2">
                    <Select value={sortBy.join(',')} onValueChange={(v) => setSortBy(v.split(','))}>
                      <SelectTrigger className="h-9 bg-zinc-900 border-zinc-700 text-xs w-[130px] text-zinc-100 font-medium">
                        <SelectValue placeholder="Sort..." />
                      </SelectTrigger>
                      <SelectContent>
                        {activeTab === 'chemicals' ? (
                          <>
                            <SelectItem value="shelfLocation,brand">Shelf / Brand</SelectItem>
                            <SelectItem value="brand,name">Brand / Name</SelectItem>
                            <SelectItem value="tags,name">Group / Name</SelectItem>
                            <SelectItem value="bottleSize,name">Size / Name</SelectItem>
                            <SelectItem value="name">A-Z Name Only</SelectItem>
                          </>
                        ) : activeTab === 'supplies' ? (
                          <>
                            <SelectItem value="location">By Location</SelectItem>
                            <SelectItem value="name">A-Z Name Only</SelectItem>
                            <SelectItem value="category">Category</SelectItem>
                            <SelectItem value="updated_at">Last Updated</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="location">By Location</SelectItem>
                            <SelectItem value="name">A-Z Name Only</SelectItem>
                            <SelectItem value="category">Category</SelectItem>
                            <SelectItem value="updated_at">Last Updated</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>

                    <Button variant="outline" size="sm" className="h-9 w-9 px-0 border-purple-500/50 bg-purple-950/20 text-purple-300 hover:bg-purple-900/40 shrink-0" onClick={() => handleExportPDF()} title="Save PDF">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {activeTab === 'chemicals' && (filterTags.length > 0 || filterBrands.length > 0 || filterShelves.length > 0 || filterSections.length > 0 || filterSizes.length > 0) && (
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-zinc-800/50">
                  <span className="text-xs font-bold text-zinc-500 uppercase mr-2 flex items-center gap-1">
                    <Filter className="h-3 w-3" /> Active Filters:
                  </span>
                  
                  {filterBrands.map(brand => (
                    <Badge key={`brand-${brand}`} className="bg-blue-500/10 text-blue-300 border-blue-500/30 flex items-center gap-1 cursor-pointer hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-colors py-0.5" onClick={() => setFilterBrands(prev => prev.filter(b => b !== brand))}>
                      <span className="text-[10px] text-zinc-500 mr-1">Brand:</span> {brand} <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                  
                  {filterShelves.map(shelf => (
                    <Badge key={`shelf-${shelf}`} className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 flex items-center gap-1 cursor-pointer hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-colors py-0.5" onClick={() => setFilterShelves(prev => prev.filter(s => s !== shelf))}>
                      <span className="text-[10px] text-zinc-500 mr-1">Shelf:</span> {shelf} <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                  
                  {filterSections.map(section => (
                    <Badge key={`section-${section}`} className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 flex items-center gap-1 cursor-pointer hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-colors py-0.5" onClick={() => setFilterSections(prev => prev.filter(s => s !== section))}>
                      <span className="text-[10px] text-zinc-500 mr-1">Section:</span> {section} <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                  
                  {filterSizes.map(size => (
                    <Badge key={`size-${size}`} className="bg-amber-500/10 text-amber-300 border-amber-500/30 flex items-center gap-1 cursor-pointer hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-colors py-0.5" onClick={() => setFilterSizes(prev => prev.filter(s => s !== size))}>
                      <span className="text-[10px] text-zinc-500 mr-1">Size:</span> {size} <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}

                  {filterTags.map(tag => (
                    <Badge key={`tag-${tag}`} className="bg-purple-500/10 text-purple-300 border-purple-500/30 flex items-center gap-1 cursor-pointer hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-colors py-0.5" onClick={() => setFilterTags(prev => prev.filter(t => t !== tag))}>
                      <span className="text-[10px] text-zinc-500 mr-1">Tag:</span> {tag} <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}

                  <Button variant="ghost" size="sm" className="h-6 text-xs text-zinc-400 hover:text-white px-2 ml-auto" onClick={() => { setFilterTags([]); setFilterBrands([]); setFilterShelves([]); setFilterSections([]); setFilterSizes([]); }}>
                    Clear All
                  </Button>
                </div>
              )}
              {activeTab !== 'chemicals' && filterLocations.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-zinc-800/50">
                  <span className="text-xs font-bold text-zinc-500 uppercase mr-2 flex items-center gap-1">
                    <Filter className="h-3 w-3" /> Active Filters:
                  </span>
                  
                  {filterLocations.map(loc => (
                    <Badge key={`loc-${loc}`} className="bg-blue-500/10 text-blue-300 border-blue-500/30 flex items-center gap-1 cursor-pointer hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-colors py-0.5" onClick={() => setFilterLocations(prev => prev.filter(l => l !== loc))}>
                      <span className="text-[10px] text-zinc-500 mr-1">Location:</span> {loc} <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                  <Button variant="ghost" size="sm" className="h-6 text-xs text-zinc-400 hover:text-white px-2 ml-auto" onClick={() => setFilterLocations([])}>
                    Clear All
                  </Button>
                </div>
              )}
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
                    const s = getChemState(c.id);
                    const isCounted = isChemCounted(c.id);
                    const isExpanded = expandedItems[c.id];
                    
                    return (
                      <div key={c.id} className={`border rounded-lg overflow-hidden transition-colors ${isCounted ? 'bg-purple-950/20 border-purple-500/50' : 'bg-zinc-900 border-zinc-800'}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between p-3 cursor-pointer select-none gap-3" onClick={() => toggleExpand(c.id)}>
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {isCounted ? <CheckCircle className="h-5 w-5 text-purple-400 shrink-0" /> : <div className="h-5 w-5 rounded-full border border-zinc-600 shrink-0" />}
                        <div className="min-w-0">
                          <div className="font-bold text-zinc-200 leading-tight">
                            {c.brand ? `${c.brand === 'Superior Products' ? 'SP' : c.brand} / ` : ''}{c.name}
                          </div>
                          <div className="text-xs text-zinc-500 flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                            <span>DB: {c.currentStock} {c.bottleSize} {(c as any).containerType ? `(${(c as any).containerType})` : ''}</span>
                            {(c.shelf || c.section) && (
                              <>
                                <span className="w-1 h-1 bg-zinc-700 rounded-full shrink-0" />
                                <span className="text-purple-400/80 break-words">
                                  {c.shelf || 'No Shelf'} / {c.section || 'No Section'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between lg:justify-end gap-2 md:gap-4 shrink-0 w-full lg:w-auto">
                        <div className="flex items-center gap-2 shrink-0 print:hidden" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 w-8 p-0 border-purple-500/30 text-purple-400 rounded-r-none" 
                              onClick={() => updateChemJugCount(c.id, s.isConcentrate ? 'gallons' : 'usedAsIsJugs', 1, -1)}
                              disabled={(s.isConcentrate ? s.gallons : s.usedAsIsJugs).find(j => j.fillLevel === 1)?.count === 0}
                              title="-1 Full Gallon"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <div className="h-8 px-3 flex items-center justify-center bg-zinc-950 border-y border-purple-500/30 text-sm font-bold text-white min-w-[2.5rem]" title="Full Gallons Count">
                              {(s.isConcentrate ? s.gallons : s.usedAsIsJugs).find(j => j.fillLevel === 1)?.count || 0}
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 w-8 p-0 border-purple-500/30 text-purple-400 rounded-l-none bg-purple-500/10 hover:bg-purple-500 hover:text-white" 
                              onClick={() => updateChemJugCount(c.id, s.isConcentrate ? 'gallons' : 'usedAsIsJugs', 1, 1)}
                              title="+1 Full Gallon"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <Select 
                            value={String((s.isConcentrate ? s.gallons : s.usedAsIsJugs).find(j => j.fillLevel < 1 && j.count > 0)?.fillLevel || 0)}
                            onValueChange={(v) => setQuickPartialGallon(c.id, parseFloat(v))}
                          >
                            <SelectTrigger className="h-8 w-24 text-xs border-purple-500/30 bg-zinc-950 text-white">
                              <SelectValue placeholder="Partial" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                              <SelectItem value="0">No Partial</SelectItem>
                              <SelectItem value="0.75">3/4 Gal</SelectItem>
                              <SelectItem value="0.5">1/2 Gal</SelectItem>
                              <SelectItem value="0.25">1/4 Gal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2 md:gap-4 shrink-0">
                          <div className={`text-sm font-bold min-w-[4.5rem] text-right ${isCounted ? 'text-emerald-400' : 'invisible'}`}>
                            {getChemTotalStock(c.id, c).toFixed(2).replace(/\.00$/, '')} Units
                          </div>
                          {onEditItem && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-zinc-400 hover:text-white shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditItem(c, 'chemical');
                              }}
                              title="Edit Item"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {isExpanded ? <ChevronUp className="h-5 w-5 text-zinc-500 shrink-0" /> : <ChevronDown className="h-5 w-5 text-zinc-500 shrink-0" />}
                        </div>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-4">
                        <div className="flex items-center gap-4 p-2 bg-zinc-900 rounded border border-zinc-800">
                          <span className="text-sm font-bold text-zinc-300">Product Type:</span>
                          <div className="flex items-center gap-2">
                            <span className={!s.isConcentrate ? 'text-white' : 'text-zinc-500'}>Used As-Is</span>
                            <Switch checked={s.isConcentrate} onCheckedChange={() => toggleChemMode(c.id, 'isConcentrate')} className="data-[state=checked]:bg-purple-500 data-[state=unchecked]:bg-zinc-600" />
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
                                <Switch checked={s.detailedMode} onCheckedChange={() => toggleChemMode(c.id, 'detailedMode')} className="data-[state=checked]:bg-purple-500 data-[state=unchecked]:bg-zinc-600" />
                                <span className={s.detailedMode ? 'text-white font-bold' : 'text-zinc-500'}>Detailed (w/ Bottles)</span>
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
              {activeTab !== 'chemicals' && groupedNonChemicals.map(([loc, items]) => (
                <div key={loc} className="mb-6">
                  <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest border-b border-blue-500/20 pb-1 mt-4 mb-2">
                    {loc}
                  </h3>
                  <div className="space-y-3">
                    {items.map((item: any) => {
                      const auditMap = activeTab === 'supplies' ? supplyAudit : equipAudit;
                      const updateCount = activeTab === 'supplies' ? updateSupplyCount : updateEquipCount;
                      const state = auditMap[item.id] || { counted: 0, isCounted: false };
                      const counted = state.counted;
                      const isCounted = state.isCounted;

                      return (
                        <div key={item.id} className={`group flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg transition-colors gap-3 ${isCounted ? 'bg-blue-950/20 border-blue-500/50' : 'bg-zinc-900 border-zinc-800'}`}>
                          <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => updateCount(item.id, 0, !isCounted)}>
                            {isCounted ? <CheckCircle className="h-5 w-5 text-blue-400 shrink-0" /> : <div className="h-5 w-5 rounded-full border border-zinc-600 shrink-0" />}
                            <div className="min-w-0">
                              <div className="font-bold text-zinc-200 truncate">{item.name}</div>
                              <div className="text-xs text-zinc-500 flex items-center gap-2">
                                <span>DB Qty: {item.quantity || 1}</span>
                                {((item as any).location || (item as any).containerLocation) && (
                                  <>
                                    <span className="w-1 h-1 bg-zinc-700 rounded-full shrink-0" />
                                    <span className={`truncate ${activeTab === 'supplies' ? 'text-blue-400/80' : 'text-amber-400/80'}`}>
                                      {(item as any).location || 'No Location'} / {(item as any).containerLocation || 'No Container'}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {onEditItem && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-10 w-10 text-zinc-400 hover:text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditItem(item, activeTab === 'equipment' ? 'equipment' : 'supply');
                                }}
                                title="Edit Item"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-10 w-10 p-0 border-blue-500/30 text-blue-400" 
                              onClick={() => updateCount(item.id, -1, true)} 
                              disabled={counted === 0}
                            >
                              <Minus className="h-5 w-5" />
                            </Button>
                            <div className="w-12 text-center">
                              <div className="font-black text-2xl text-white">{isCounted ? counted : '-'}</div>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-10 w-10 p-0 border-blue-500/30 text-blue-400 bg-blue-500/10 hover:bg-blue-500 hover:text-white" 
                              onClick={() => updateCount(item.id, 1, true)}
                            >
                              <Plus className="h-5 w-5" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-10 w-10 p-0 border-orange-500/30 text-orange-400 bg-orange-500/10 hover:bg-orange-500 hover:text-white ml-2 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100" 
                              onClick={() => {
                                if (activeTab === 'supplies') {
                                  setSupplyAudit(prev => { const n = {...prev}; delete n[item.id]; return n; });
                                } else {
                                  setEquipAudit(prev => { const n = {...prev}; delete n[item.id]; return n; });
                                }
                              }}
                              title="Reset item"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* HISTORY VIEW */}
        {showHistory && !reviewMode && !viewingSnapshot && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Filters */}
            <div className="p-4 bg-zinc-900 border-b border-zinc-800 shrink-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-zinc-500 uppercase">Filter:</span>
                {(['all', 'in-progress', 'completed', 'archived'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setHistoryFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                      historyFilter === f
                        ? f === 'in-progress' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : f === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                    }`}
                  >
                    {f === 'all' ? 'All' : f === 'in-progress' ? 'In Progress' : f === 'completed' ? 'Completed' : 'Archived'}
                  </button>
                ))}
                <div className="flex items-center ml-auto">
                  <input
                    type="month"
                    value={historyDateFilter}
                    onChange={(e) => setHistoryDateFilter(e.target.value)}
                    className="h-8 px-2 text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 rounded"
                    title="Filter by month"
                  />
                  {historyDateFilter && (
                    <button onClick={() => setHistoryDateFilter('')} className="text-zinc-500 hover:text-zinc-300 ml-1">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* History list */}
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {(() => {
                let entries = historySnapshots;
                if (historyFilter === 'archived') {
                  entries = entries.filter(e => e.archived);
                } else {
                  entries = entries.filter(e => !e.archived);
                  if (historyFilter !== 'all') entries = entries.filter(e => e.status === historyFilter);
                }
                if (historyDateFilter) entries = entries.filter(e => e.timestamp.startsWith(historyDateFilter));

                if (entries.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-40 text-zinc-500 gap-3">
                      <History className="h-10 w-10 opacity-30" />
                      <p className="text-sm">No audit records found</p>
                      <p className="text-xs text-zinc-600">Use &quot;Save Progress&quot; during an audit to build your history.</p>
                    </div>
                  );
                }

                return entries.map(entry => {
                  const d = new Date(entry.timestamp);
                  const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                  const timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                  const isCompleted = entry.status === 'completed';

                  return (
                    <div key={entry.id} className={`flex items-start justify-between p-4 rounded-lg border gap-4 ${
                      isCompleted ? 'bg-emerald-950/20 border-emerald-700/30' : 'bg-amber-950/20 border-amber-700/30'
                    }`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                            isCompleted ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {isCompleted ? '✓ Completed' : '⏸ In Progress'}
                          </span>
                          <span className="text-sm font-bold text-zinc-200">{dateStr}</span>
                          <span className="text-xs text-zinc-500">{timeStr}</span>
                        </div>
                        <div className="mt-1.5 text-xs text-zinc-400 flex flex-wrap gap-3">
                          <span><strong className="text-zinc-300">{entry.totalCounted}</strong> item{entry.totalCounted !== 1 ? 's' : ''} counted</span>
                          <span className="capitalize">Started on: {['chemicals', 'supplies', 'equipment'].includes(entry.activeTab) ? entry.activeTab : 'chemicals'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 gap-1"
                          onClick={() => setViewingSnapshot(entry)}
                          title="View Data"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 gap-1"
                          onClick={() => handleExportPDF(entry)}
                          title="Save PDF"
                        >
                          <Download className="h-3.5 w-3.5" /> PDF
                        </Button>
                        {!isCompleted && (
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-white border border-amber-500/40 gap-1"
                            onClick={() => handleResume(entry)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Resume
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-8 w-8 p-0 ${entry.archived ? 'text-amber-400 hover:text-amber-300' : 'text-zinc-500 hover:text-zinc-300'}`}
                          onClick={() => toggleArchiveSnapshot(entry.id)}
                          title={entry.archived ? "Unarchive" : "Archive"}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-zinc-600 hover:text-red-400"
                          onClick={() => confirmDeleteSnapshot(entry.id)}
                          title="Delete this record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
        <DialogFooter className="p-3 sm:p-4 border-t border-purple-500/20 bg-zinc-900 shrink-0 flex flex-row items-center justify-between gap-2 print:hidden w-full !space-x-0">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="border-cyan-500/40 text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/50 hover:text-cyan-300 px-3 sm:px-4" 
              onClick={() => viewingSnapshot ? setViewingSnapshot(null) : showHistory ? setShowHistory(false) : reviewMode ? setReviewMode(false) : handleCloseAttempt()}
            >
              {showHistory || reviewMode || viewingSnapshot ? 'Back' : 'Cancel'}
            </Button>
            
            {(reviewMode || viewingSnapshot) && (
              <Button
                variant="outline"
                className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white px-3 sm:px-4"
                onClick={() => handleExportPDF(viewingSnapshot || undefined)}
                title="Save PDF"
              >
                <Download className="h-4 w-4 sm:mr-1.5" /> <span className="hidden sm:inline">PDF</span>
              </Button>
            )}
          </div>
          
          {!showHistory && !viewingSnapshot && !reviewMode && (
            <Button
              variant="outline"
              className="border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500 hover:text-white px-3 sm:px-4 flex-1 sm:flex-none justify-center gap-1.5"
              onClick={handleSaveProgress}
            >
              <Save className="h-4 w-4" /> 
              <span className="hidden sm:inline">Save Progress</span>
              <span className="sm:hidden">Save</span>
            </Button>
          )}

          {!showHistory && !viewingSnapshot && (
            !reviewMode ? (
              <Button 
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 sm:px-4 flex-1 sm:flex-none justify-center whitespace-nowrap" 
                onClick={() => setReviewMode(true)}
              >
                Review Changes
              </Button>
            ) : (
              <Button 
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 sm:px-4 flex-1 sm:flex-none justify-center whitespace-nowrap" 
                onClick={handleConfirmUpdate} 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating...' : 'Confirm Update'}
              </Button>
            )
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
                        <div className="text-xs text-gray-600">{c.bottleSize} {(c as any).containerType ? ` - ${(c as any).containerType}` : ''}</div>
                      </td>
                      <td className="p-2 border border-black text-center font-bold text-lg">{c.currentStock}</td>
                      <td className="p-2 border border-black"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          
          {activeTab !== 'chemicals' && groupedNonChemicals.map(([groupName, groupItems]) => (
            <div key={groupName} className="mb-8 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
              <h2 className="text-xl font-bold bg-gray-200 p-2 mb-4 border border-black">
                {activeTab === 'supplies' ? 'Supplies' : 'Equipment'} - Location: {groupName}
              </h2>
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
                  {groupItems.map((item: any) => (
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
          ))}
        </div>
      </DialogContent>
    </Dialog>

      <AlertDialog open={cancelWarningOpen} onOpenChange={setCancelWarningOpen}>
        <AlertDialogContent className="bg-zinc-950 border-purple-500/30 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Unsaved Changes Warning
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              You have unsaved counted inventory. If you cancel now, all changes from this session will be lost. If you wish to keep them, click "Cancel" to go back, and then use the "Save Progress" button instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:text-white">Back to Audit</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 text-white hover:bg-red-700 font-bold" 
              onClick={() => {
                setCancelWarningOpen(false);
                onOpenChange(false);
              }}
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!historyDeleteId} onOpenChange={(val) => { if (!val) setHistoryDeleteId(null); }}>
        <AlertDialogContent className="bg-zinc-950 border-purple-500/30 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete History Record?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to permanently delete this audit snapshot? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 text-white hover:bg-red-700 font-bold" 
              onClick={executeDeleteSnapshot}
            >
              Delete Record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
