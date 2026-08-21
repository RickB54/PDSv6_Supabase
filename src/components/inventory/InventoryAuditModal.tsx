import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, X, Plus, Minus, Search, Filter, CheckCircle, ChevronDown, ChevronUp, Info, HelpCircle, ArrowDownUp, Check, Download, Save, History, RotateCcw, Trash2, AlertTriangle, Edit, Eye, Archive, FileText, Calendar, Heart, Link2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Chemical, Material, Tool as Equipment, saveChemical, saveMaterial, saveTool, saveUsageHistory } from '@/lib/inventory-data';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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

const LOCATION_RANK_ORDER = [
  "Detail Cart", "Mobile Detail Bag", "Small Extractor Bag", "Medium Steamer/Drill Bag", "Large Buffer Bag",
  "D1", "D2", "D3", "D4",
  "B-Top", "B3", "B2", "B1",
  "Wall Shelf (Top)", "Wall Shelf (Bottom)",
  "Truck 1", "Truck 2", "Warehouse", "Detail Bay", "Office", "Storage Cabinet", "Unassigned"
];

const SHELF_RANK_ORDER = [
  "Top Shelf", "2nd Shelf", "3rd Shelf", "Bottom Shelf", "Small Rack - Shelf 3", "Specialty Caddy", "Interior Caddy", "Exterior Caddy", "Unassigned"
];

const SECTION_RANK_ORDER = [
  "Left Side", "Middle", "Right Side", "Unassigned"
];

const sortChemicalGroups = (a: string, b: string) => {
  const [shelfA = 'Unassigned', sectionA = 'Unassigned'] = a.split(' / ').map(s => s.trim());
  const [shelfB = 'Unassigned', sectionB = 'Unassigned'] = b.split(' / ').map(s => s.trim());
  
  let rankShelfA = SHELF_RANK_ORDER.indexOf(shelfA);
  let rankShelfB = SHELF_RANK_ORDER.indexOf(shelfB);
  if (rankShelfA === -1) rankShelfA = 999;
  if (rankShelfB === -1) rankShelfB = 999;
  
  if (rankShelfA !== rankShelfB) return rankShelfA - rankShelfB;
  
  let rankSectionA = SECTION_RANK_ORDER.indexOf(sectionA);
  let rankSectionB = SECTION_RANK_ORDER.indexOf(sectionB);
  if (rankSectionA === -1) rankSectionA = 999;
  if (rankSectionB === -1) rankSectionB = 999;
  
  if (rankSectionA !== rankSectionB) return rankSectionA - rankSectionB;
  
  return a.localeCompare(b);
};

const sortLocationGroups = (a: string, b: string) => {
  let rankA = LOCATION_RANK_ORDER.indexOf(a.split(' - ')[0] || a);
  let rankB = LOCATION_RANK_ORDER.indexOf(b.split(' - ')[0] || b);
  if (rankA === -1) rankA = 999;
  if (rankB === -1) rankB = 999;
  if (rankA !== rankB) return rankA - rankB;
  return a.localeCompare(b);
};

function LazyItemList<T>({ items, renderItem, batchSize = 15 }: { items: T[], renderItem: (item: T) => React.ReactNode, batchSize?: number }) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(batchSize);
  }, [items, batchSize]);

  useEffect(() => {
    if (visibleCount >= items.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          requestAnimationFrame(() => {
            setVisibleCount(prev => Math.min(prev + batchSize, items.length));
          });
        }
      },
      { rootMargin: '400px' }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [visibleCount, items.length, batchSize]);

  return (
    <>
      {items.slice(0, visibleCount).map(renderItem)}
      {visibleCount < items.length && (
        <div ref={observerRef} className="h-10 flex items-center justify-center opacity-50 py-4">
           <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
        </div>
      )}
    </>
  );
}

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

// Per-item supply metadata (stored in localStorage, not DB)
interface SupplyItemMeta {
  conditionStatus?: 'new' | 'good' | 'worn' | 'needs_replacement';
  conditionNote?: string;
  lastUsedDate?: string; // YYYY-MM-DD
  companionItems?: string[]; // item IDs
}

const SUPPLY_META_KEY = 'supply_item_meta';
const loadSupplyMeta = (): Record<string, SupplyItemMeta> => {
  try { return JSON.parse(localStorage.getItem(SUPPLY_META_KEY) || '{}'); } catch { return {}; }
};
const saveSupplyMetaToStorage = (meta: Record<string, SupplyItemMeta>) => {
  localStorage.setItem(SUPPLY_META_KEY, JSON.stringify(meta));
};

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
  
  const normalizedChemicals = useMemo(() => chemicals.filter(c => !c.hideFromIac).map(c => {
    const isCaddy = (c.shelf || '').toLowerCase().includes('caddy');
    const defaultShelfLoc = (c.shelf || c.section) ? `${c.shelf || 'Unassigned'} / ${c.section || 'Unassigned'}` : undefined;
    return {
      ...c,
      shelfLocation: c.shelfLocation || (isCaddy ? c.shelf : defaultShelfLoc),
      bottleSize: normalizeSize(c.bottleSize)
    };
  }), [chemicals]);

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

  // Collapsed sections (groups)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const toggleSectionCollapse = (sectionName: string) => {
    setCollapsedSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

  // Supply item metadata (condition, last used, companions)
  const [supplyMeta, setSupplyMeta] = useState<Record<string, SupplyItemMeta>>(loadSupplyMeta);

  const updateSupplyMeta = (id: string, updates: Partial<SupplyItemMeta>) => {
    setSupplyMeta(prev => {
      const next = { ...prev, [id]: { ...(prev[id] || {}), ...updates } };
      saveSupplyMetaToStorage(next);
      return next;
    });
  };

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

  const setNonGallonAmount = (id: string, fillLevel: number) => {
    setChemAudit(prev => {
      const state = getChemState(id, prev);
      const type = state.isConcentrate ? 'gallons' : 'usedAsIsJugs';
      const arr = state[type].map(j => {
        if (fillLevel > 0 && j.fillLevel === fillLevel) return { ...j, count: 1 };
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
      let sizeInOz = 128; // Default to gallon
      const sizeMatch = chem.bottleSize?.match(/(\d+)\s*oz/i);
      if (sizeMatch) sizeInOz = parseInt(sizeMatch[1]);
      else if (chem.bottleSize?.toLowerCase().includes('gallon') || chem.bottleSize?.toLowerCase().includes('gal')) sizeInOz = 128;
      
      // Add base containers
      totalOz += state.gallons.reduce((acc, j) => acc + (j.count * j.fillLevel * sizeInOz), 0);
      
      // Add bottles if detailed mode
      if (state.detailedMode) {
        state.bottles.forEach(b => {
          // If ratio is 10:1, there are 10 parts water, 1 part chem. Total 11 parts.
          const actualVol = b.sizeOz * b.fillLevel;
          const chemOz = actualVol / (b.ratioParts + 1);
          totalOz += chemOz;
        });
      }
      
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

  const filteredChemicals = useMemo(() => {
    return getFilteredItems(normalizedChemicals, chemAudit, isChemCounted).filter(c => {
      if (filterTags.length > 0 && !filterTags.some(t => c.tags?.includes(t))) return false;
      if (filterBrands.length > 0 && (!c.brand || !filterBrands.includes(c.brand))) return false;
      if (filterShelves.length > 0 && (!c.shelf || !filterShelves.includes(c.shelf))) return false;
      if (filterSections.length > 0 && (!c.section || !filterSections.includes(c.section))) return false;
      if (filterSizes.length > 0 && (!c.bottleSize || !filterSizes.includes(c.bottleSize))) return false;
      return true;
    }).sort((a, b) => {
      for (const field of sortBy) {
        if (field === 'updated_at') {
          const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          if (dateA !== dateB) return dateB - dateA; // Descending
          continue;
        }
        let valA = (a as any)[field] || '';
        let valB = (b as any)[field] || '';
        if (field === 'tags') {
          valA = (a.tags || []).join(',');
          valB = (b.tags || []).join(',');
        }
        if (valA < valB) return -1;
        if (valA > valB) return 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [normalizedChemicals, chemAudit, search, hideCounted, filterTags, filterBrands, filterShelves, filterSections, filterSizes, sortBy]);

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
    
    return Object.entries(groups).sort(([a], [b]) => {
      if (primarySort === 'shelfLocation') {
        return sortChemicalGroups(a, b);
      }
      return a.localeCompare(b);
    });
  }, [filteredChemicals, sortBy]);

  const filteredSupplies = useMemo(() => {
    return getFilteredItems(supplies, supplyAudit, id => supplyAudit[id]?.isCounted).filter(s => {
      if (s.hideFromIac) return false;
      if (filterLocations.length > 0 && (!s.location || !filterLocations.includes(s.location))) return false;
      return true;
    });
  }, [supplies, supplyAudit, search, hideCounted, filterLocations]);

  const filteredEquip = useMemo(() => {
    return getFilteredItems(equipment, equipAudit, id => equipAudit[id]?.isCounted).filter(e => {
      if (e.hideFromIac) return false;
      if (filterLocations.length > 0 && (!e.location || !filterLocations.includes(e.location))) return false;
      return true;
    });
  }, [equipment, equipAudit, search, hideCounted, filterLocations]);
  const groupItemsLogic = (items: any[]) => {
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
    
    const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
      if (primarySort === 'location') {
        return sortLocationGroups(a, b);
      }
      return a.localeCompare(b);
    });
    
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
  };

  const groupedSupplies = useMemo(() => groupItemsLogic(filteredSupplies), [filteredSupplies, sortBy]);
  const groupedEquip = useMemo(() => groupItemsLogic(filteredEquip), [filteredEquip, sortBy]);

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

  const exportCaddyReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Caddy Quick-Reference Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 22);

    let currentY = 35;

    // Filter for caddies
    const caddyChems = normalizedChemicals.filter(c => c.shelf?.toLowerCase().includes('caddy'));

    const caddies: Record<string, typeof caddyChems> = {};
    caddyChems.forEach(c => {
      const shelf = c.shelf || 'Unknown Caddy';
      if (!caddies[shelf]) caddies[shelf] = [];
      caddies[shelf].push(c);
    });

    const sortedCaddies = Object.keys(caddies).sort();

    sortedCaddies.forEach(caddyName => {
      const groupItems = caddies[caddyName].sort((a, b) => {
        // extract slot number if possible
        const slotA = parseInt((a.section || '').replace(/[^0-9]/g, '')) || 999;
        const slotB = parseInt((b.section || '').replace(/[^0-9]/g, '')) || 999;
        if (slotA !== slotB) return slotA - slotB;
        return a.name.localeCompare(b.name);
      });

      if (groupItems.length === 0) return;

      if (currentY > 260) {
        doc.addPage();
        currentY = 20;
      }

      autoTable(doc, {
        startY: currentY,
        head: [[caddyName, 'Slot #', 'Chemical Name', 'Dilution Ratio', 'Purpose']],
        body: groupItems.map(c => {
          const slotNum = (c.section || '').replace(/[^0-9]/g, '') || c.section || 'N/A';
          // Use DilutionRatio info for Ratio and Purpose
          let ratioStr = '';
          let purposeStr = '';
          
          if (c.dilutionRatios && c.dilutionRatios.length > 0) {
            const printableRatios = c.dilutionRatios.filter((d: any) => d.print_on_caddy_report);
            if (printableRatios.length > 0) {
              ratioStr = printableRatios.map((d: any) => d.ratio || 'RTU').join('\n');
              purposeStr = printableRatios.map((d: any) => d.notes || d.soil_level || d.method || 'General').join('\n');
            }
          }

          return [
            '', // Group column empty since it's in the header
            slotNum,
            `${c.brand ? c.brand + ' / ' : ''}${c.name}`,
            ratioStr,
            purposeStr
          ];
        }),
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { textColor: [0, 0, 0] },
        columnStyles: {
          0: { cellWidth: 0 }, // Hide group column content, handled by head
          1: { cellWidth: 15, halign: 'center' },
          2: { cellWidth: 60 },
          3: { cellWidth: 30 },
          4: { cellWidth: 'auto' }
        },
        margin: { top: 10 }
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 10;
    });

    if (sortedCaddies.length === 0) {
      doc.setFontSize(12);
      doc.text("No caddy locations found in the current inventory.", 14, 40);
    }

    doc.save(`Caddy_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

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
    const categoryName = targetTab.charAt(0).toUpperCase() + targetTab.slice(1);
    
    let mainTitle = `Inventory Audit Checklist for ${categoryName}`;
    if (targetTab === 'chemicals' && filterShelves.length > 0) {
      mainTitle = `IAC for ${categoryName}: ${filterShelves.join(', ')}`;
    } else if (targetTab !== 'chemicals' && filterLocations.length > 0) {
      mainTitle = `IAC for ${categoryName}: ${filterLocations.join(', ')}`;
    }
    
    doc.text(mainTitle, 14, 22);
    doc.setFontSize(10);
    doc.text(`Date: ${dateTitle}`, 140, 22);

    let currentY = 30;

    // Build descriptive subtitle based on filters/sort
    let subtitleParts: string[] = [];
    if (targetTab === 'chemicals') {
      if (filterShelves.length > 0) subtitleParts.push(`Shelves: ${filterShelves.join(', ')}`);
      if (filterBrands.length > 0) subtitleParts.push(`Brands: ${filterBrands.join(', ')}`);
      const sort = sortBy[0] || 'shelfLocation';
      if (sort.startsWith('shelfLocation')) subtitleParts.push('Sorted By Location');
      else if (sort.startsWith('brand')) subtitleParts.push('Sorted By Brand');
    } else {
      if (filterLocations.length > 0) subtitleParts.push(`Locations: ${filterLocations.join(', ')}`);
      const sort = sortBy[0] || 'location';
      if (sort.startsWith('location')) subtitleParts.push('Sorted By Location');
      else if (sort.startsWith('category')) subtitleParts.push('Sorted By Category');
    }
    
    if (subtitleParts.length > 0) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(subtitleParts.join('  •  '), 14, 28);
      doc.setTextColor(0, 0, 0); // reset
      currentY = 35;
    }

    if (targetTab === 'chemicals') {


      const pdfGroups: Record<string, Chemical[]> = {};
      
      // If snapshot or review mode, we only show items that were counted, 
      // or if live on main view, show all filtered items for checklist printing
      const itemsToPrint = (snapshot || reviewMode) 
        ? normalizedChemicals.filter(c => isChemCounted(c.id, targetChemAudit))
        : filteredChemicals;

      itemsToPrint.forEach(chem => {
        const key = chem.shelfLocation || 'Unassigned / Unassigned';
        if (!pdfGroups[key]) pdfGroups[key] = [];
        pdfGroups[key].push(chem as Chemical);
      });

      // Sort groups logically by shelf then section using the single source of truth
      const sortedGroupKeys = Object.keys(pdfGroups).sort(sortChemicalGroups);

      sortedGroupKeys.forEach(groupName => {
        const groupItems = pdfGroups[groupName].sort((a, b) => a.name.localeCompare(b.name));
        if (groupItems.length === 0) return;
        
        if (currentY > 260) {
          doc.addPage();
          currentY = 20;
        }

        autoTable(doc, {
          startY: currentY,
          head: [[groupName, 'Size', 'Container Type', 'DB Qty', 'Actual Count']],
          body: groupItems.map(c => {
            const countedStr = isChemCounted(c.id, targetChemAudit) ? getChemTotalStock(c.id, c, targetChemAudit).toFixed(2) : '';
            const containerType = (c as any).containerType || '';
            return [
              `${c.brand ? c.brand + ' / ' : ''}${c.name}`,
              c.bottleSize || 'N/A',
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
            1: { cellWidth: 25 },
            2: { cellWidth: 35 },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 30 }
          },
          margin: { top: 10 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
      });
    } else {
      const allItems = targetTab === 'supplies' ? supplies : equipment;
      const targetAudit = targetTab === 'supplies' ? targetSupplyAudit : targetEquipAudit;
      
      const itemsToPrint = (snapshot || reviewMode)
        ? allItems.filter(i => targetAudit[i.id]?.isCounted)
        : (targetTab === 'supplies' ? filteredSupplies : filteredEquip);
      
      const pdfGroups: Record<string, any[]> = {};
      itemsToPrint.forEach(item => {
        const baseLoc = (item as any).location || 'Unassigned';
        const containerLoc = (item as any).containerLocation || '';
        const loc = containerLoc ? `${baseLoc} - ${containerLoc}` : baseLoc;
        if (!pdfGroups[loc]) pdfGroups[loc] = [];
        pdfGroups[loc].push(item);
      });

      const sortedLocs = Object.keys(pdfGroups).sort(sortLocationGroups);

      sortedLocs.forEach(loc => {
        const groupItems = pdfGroups[loc].sort((a, b) => a.name.localeCompare(b.name));
        if (groupItems.length === 0) return;

        if (currentY > 260) {
          doc.addPage();
          currentY = 20;
        }

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

  const handleExportFullReport = (snapshot?: AuditSnapshot) => {
    const targetChemAudit = snapshot ? snapshot.chemAudit : chemAudit;
    const targetSupplyAudit = snapshot ? snapshot.supplyAudit : supplyAudit;
    const targetEquipAudit = snapshot ? snapshot.equipAudit : equipAudit;

    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(`Full Inventory Audit Report`, 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Date: ${new Date().toLocaleString()}`, 14, 28);
    doc.setTextColor(0, 0, 0);

    let currentY = 40;

    const renderCategory = (categoryName: string, items: any[], auditState: any) => {
      if (items.length === 0) return;
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(`${categoryName} Section`, 14, currentY);
      currentY += 10;

      const pdfGroups: Record<string, any[]> = {};
      items.forEach(item => {
        let loc = 'Unassigned';
        if (categoryName === 'Chemicals') {
          const rawShelf = (item as any).shelf;
          const rawSection = (item as any).section;
          const shelf = (typeof rawShelf === 'string' && rawShelf.trim()) ? rawShelf.trim() : 'Unassigned';
          const section = (typeof rawSection === 'string' && rawSection.trim()) ? rawSection.trim() : 'Unassigned';
          loc = `${shelf} - ${section}`;
        } else {
          const baseLoc = item.location || 'Unassigned';
          const containerLoc = item.containerLocation || '';
          loc = containerLoc ? `${baseLoc} - ${containerLoc}` : baseLoc;
        }
        if (!pdfGroups[loc]) pdfGroups[loc] = [];
        pdfGroups[loc].push(item);
      });

      const sortedLocs = Object.keys(pdfGroups).sort(sortLocationGroups);
      let totalItems = items.length;
      let totalCounted = 0;

      sortedLocs.forEach(loc => {
        const groupItems = pdfGroups[loc].sort((a, b) => a.name.localeCompare(b.name));
        if (groupItems.length === 0) return;

        if (currentY > 260) {
          doc.addPage();
          currentY = 20;
        }

        let head: string[][];
        let columnStyles: any;
        if (categoryName === 'Chemicals') {
          head = [[`Location: ${loc}`, 'Container Type', '% Remaining', 'DB Qty', 'Actual Count']];
          columnStyles = { 0: { cellWidth: 'auto' }, 1: { cellWidth: 35 }, 2: { cellWidth: 25 }, 3: { cellWidth: 20, halign: 'center' }, 4: { cellWidth: 25 } };
        } else if (categoryName === 'Supplies') {
          head = [[`Location: ${loc}`, 'Condition', 'Last Used', 'DB Qty', 'Actual Count']];
          columnStyles = { 0: { cellWidth: 'auto' }, 1: { cellWidth: 30 }, 2: { cellWidth: 25 }, 3: { cellWidth: 20, halign: 'center' }, 4: { cellWidth: 25 } };
        } else {
          head = [[`Location: ${loc}`, 'DB Qty', 'Actual Count']];
          columnStyles = { 0: { cellWidth: 'auto' }, 1: { cellWidth: 30, halign: 'center' }, 2: { cellWidth: 40 } };
        }

        autoTable(doc, {
          startY: currentY,
          head,
          body: groupItems.map(item => {
            if (categoryName === 'Chemicals') {
              const countedStr = isChemCounted(item.id, auditState) ? getChemTotalStock(item.id, item, auditState).toFixed(2) : '';
              if (isChemCounted(item.id, auditState)) totalCounted++;
              const containerType = item.containerType || '';
              const percent = auditState[item.id] ? `${auditState[item.id].percentRemaining || 0}%` : '';
              return [
                `${item.brand ? item.brand + ' / ' : ''}${item.name} (${item.bottleSize || 'N/A'})`,
                containerType,
                percent,
                item.currentStock?.toFixed(2) || '0',
                countedStr
              ];
            } else if (categoryName === 'Supplies') {
              const counted = auditState[item.id]?.counted;
              const isCounted = auditState[item.id]?.isCounted;
              if (isCounted) totalCounted++;
              const metaStr = localStorage.getItem(`supply_item_meta_${item.id}`);
              const meta = metaStr ? JSON.parse(metaStr) : {};
              const condition = meta.conditionStatus || 'N/A';
              const lastUsed = meta.lastUsedDate ? new Date(meta.lastUsedDate).toLocaleDateString() : 'N/A';
              return [
                item.name,
                condition,
                lastUsed,
                item.quantity || 1,
                isCounted ? String(counted) : ''
              ];
            } else {
              const counted = auditState[item.id]?.counted;
              const isCounted = auditState[item.id]?.isCounted;
              if (isCounted) totalCounted++;
              return [
                item.name,
                item.quantity || 1,
                isCounted ? String(counted) : ''
              ];
            }
          }),
          theme: 'grid',
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
          styles: { textColor: [0, 0, 0] },
          columnStyles,
          margin: { top: 10 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
      });

      if (currentY > 270) { doc.addPage(); currentY = 20; }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      doc.text(`${categoryName} Subtotal: ${totalCounted} of ${totalItems} items counted`, 14, currentY);
      doc.setFont('helvetica', 'normal');
      currentY += 20;
    };

    renderCategory('Chemicals', normalizedChemicals, targetChemAudit);
    renderCategory('Supplies', supplies, targetSupplyAudit);
    renderCategory('Equipment', equipment, targetEquipAudit);

    doc.save(`Full_IAC_Report_${new Date().toISOString().split('T')[0]}.pdf`);
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
                  <PopoverContent className="z-[99999] w-[95vw] sm:max-w-lg p-0 bg-zinc-900 border-zinc-700 shadow-2xl overflow-hidden pointer-events-auto" side="bottom" align="start">
                    <div className="max-h-[70vh] overflow-y-auto p-4 text-zinc-300 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }} onWheel={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
                      <div className="space-y-5 text-sm">
                      <div className="border-b border-zinc-800 pb-3">
                        <h3 className="font-bold text-white text-base">Inventory Audit Guide</h3>
                        <p className="text-xs text-zinc-400 mt-1">Everything you need to know to effectively audit your inventory.</p>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-semibold text-purple-400 flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Counting Controls</h4>
                        <ul className="list-disc pl-4 space-y-1.5 text-zinc-300">
                          <li><strong>Quick vs. Detailed Mode:</strong> Quick mode lets you count whole units (like Gallons). Detailed mode opens a dropdown to count partial amounts (e.g., 0.5 bottles).</li>
                          <li><strong>Quick Edit Inline:</strong> Use the + / - buttons on Chemical cards to quickly add or remove whole units, or use the Partial Dropdown for exact fill levels.</li>
                          <li><strong>Bottle Size Dropdown:</strong> Replaces the old Unit of Measure. Select standard sizes or add custom ones directly in the item's edit modal.</li>
                          <li><strong>Product Type Toggle:</strong> Switch between &quot;Used As-Is&quot; (direct from bottle) and &quot;Concentrate&quot; (diluted with water) to properly track liquid usage.</li>
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-semibold text-purple-400 flex items-center gap-2"><Filter className="h-4 w-4" /> Filtering & Visibility</h4>
                        <ul className="list-disc pl-4 space-y-1.5 text-zinc-300">
                          <li><strong>Filter & Sort Panel:</strong> Combine filters like Brand, Size, Shelf, Section, and Location to narrow down exactly what you are counting.</li>
                          <li><strong>&quot;X of Y counted&quot; Badge:</strong> Tracks your live progress. It updates dynamically to reflect only the items visible in your current filter.</li>
                          <li><strong>Global Sort Dropdown:</strong> Quickly sort the entire list by Name, Brand, Location, Last Updated, etc.</li>
                          <li><strong>Hide Counted & Collapse All:</strong> Toggle &quot;Hide Counted&quot; to make completed items disappear. Use &quot;Collapse All&quot; to shrink cards and save screen space.</li>
                          <li><strong>Note:</strong> The broken header Print button has been removed. Use the PDF and Full IAC Report buttons in the footer instead.</li>
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-semibold text-purple-400 flex items-center gap-2"><Edit className="h-4 w-4" /> Organization & Assignment</h4>
                        <ul className="list-disc pl-4 space-y-1.5 text-zinc-300">
                          <li><strong>Chemicals (Shelf, Section, Category):</strong> Assigned via the edit modal. You can filter the audit list by these values to count one section at a time.</li>
                          <li><strong>Supplies & Equipment (Location, Container Location):</strong> Uses a preset system to standardize where items live. For Supplies, the full set of locations (Detail Cart, bags, D1-D4 drawer towers, B1/B2/B3/B-Top, Wall Shelves) is available. You can filter the audit list by these locations.</li>
                          <li><strong>Supplies Details:</strong> Supplies feature expand-cards showing Condition/Wear Status, Last Used Date, and Compatible/Companion Items (which link bidirectionally to other items).</li>
                          <li><strong>hideFromIac:</strong> In any item's edit modal, check &quot;Do NOT Show in IAC&quot; to permanently exclude it from all audits and PDF reports.</li>
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-semibold text-purple-400 flex items-center gap-2"><History className="h-4 w-4" /> Saving, History, & Exports</h4>
                        <ul className="list-disc pl-4 space-y-1.5 text-zinc-300">
                          <li><strong>Save Progress:</strong> Pause your audit at any time without submitting. Resume later from the History tab.</li>
                          <li><strong>Audit History:</strong> View past snapshots of your inventory, archive old audits, or permanently delete them (with confirmation).</li>
                          <li><strong>Save PDF (Main Toolbar):</strong> Generates a printable PDF of your current live audit view and counts for a single tab.</li>
                          <li><strong>Full IAC Report (Footer):</strong> Generates one combined PDF across all 3 categories (Chemicals, Supplies, Equipment) as separate sections, available from any tab.</li>
                          <li><strong>PDF Save/Print (Review Modal):</strong> When finishing an audit, use this button on the final Review Changes modal to save or print a verified record of the actual updates being committed to the database.</li>
                        </ul>
                      </div>
                    </div>
                    </div>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-2" 
                          title="Expand/Collapse"
                        >
                          <ArrowDownUp className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56 bg-zinc-950 border-zinc-800 text-zinc-300 max-h-[60vh] overflow-y-auto z-[250]" align="end">
                        <div className="px-2 py-1.5 text-xs font-bold text-zinc-500 uppercase tracking-wider">Expand / Collapse</div>
                        <DropdownMenuItem
                          className="flex items-center justify-between hover:bg-zinc-800 cursor-pointer text-xs font-semibold text-blue-400 focus:bg-zinc-800 focus:text-blue-300"
                          onSelect={(e) => {
                            e.preventDefault();
                            let hasExpandedInCurrentTab = false;
                            if (activeTab === 'chemicals') {
                              hasExpandedInCurrentTab = filteredChemicals.some(c => expandedItems[c.id]);
                            } else if (activeTab === 'supplies') {
                              hasExpandedInCurrentTab = filteredSupplies.some(s => expandedItems[s.id]);
                            } else {
                              hasExpandedInCurrentTab = filteredEquip.some(e => expandedItems[e.id]);
                            }

                            setExpandedItems(prev => {
                              const next = { ...prev };
                              if (hasExpandedInCurrentTab) {
                                if (activeTab === 'chemicals') filteredChemicals.forEach(c => delete next[c.id]);
                                else if (activeTab === 'supplies') filteredSupplies.forEach(s => delete next[s.id]);
                                else filteredEquip.forEach(e => delete next[e.id]);
                              } else {
                                if (activeTab === 'chemicals') filteredChemicals.forEach(c => next[c.id] = true);
                                else if (activeTab === 'supplies') filteredSupplies.forEach(s => next[s.id] = true);
                                else filteredEquip.forEach(e => next[e.id] = true);
                              }
                              return next;
                            });
                          }}
                        >
                          <span>
                            {activeTab === 'chemicals' 
                              ? filteredChemicals.some(c => expandedItems[c.id]) ? 'Collapse All Items' : 'Expand All Items'
                              : activeTab === 'supplies'
                                ? filteredSupplies.some(s => expandedItems[s.id]) ? 'Collapse All Items' : 'Expand All Items'
                                : filteredEquip.some(e => expandedItems[e.id]) ? 'Collapse All Items' : 'Expand All Items'}
                          </span>
                        </DropdownMenuItem>
                        <div className="h-px bg-zinc-800 my-1" />
                        {(activeTab === 'chemicals' ? groupedChemicals : activeTab === 'supplies' ? groupedSupplies : groupedEquip).map(([groupName, groupItems]) => {
                          const isSomeExpanded = groupItems.some((item: any) => expandedItems[item.id]);
                          
                          return (
                            <DropdownMenuItem 
                              key={groupName}
                              className={`flex items-center justify-between hover:bg-zinc-800 cursor-pointer text-xs focus:bg-zinc-800 focus:text-white ${isSomeExpanded ? 'bg-zinc-900' : ''}`}
                              onSelect={(e) => {
                                 e.preventDefault();
                                 const currentTabItems = activeTab === 'chemicals' ? filteredChemicals : activeTab === 'supplies' ? filteredSupplies : filteredEquip;

                                 setExpandedItems(prev => {
                                    const next = { ...prev };
                                    currentTabItems.forEach((item: any) => delete next[item.id]);
                                    if (!isSomeExpanded) {
                                      groupItems.forEach((item: any) => next[item.id] = true);
                                    }
                                    return next;
                                 });
                                 
                                 if (!isSomeExpanded) {
                                    setTimeout(() => {
                                      const el = document.getElementById(`group-${groupName.replace(/\s+/g, '-')}`);
                                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }, 100);
                                 }
                              }}
                            >
                              <div className="flex items-center min-w-0 pr-2">
                                <span className="truncate flex-1">{groupName}</span>
                                {isSomeExpanded && <Check className="h-3.5 w-3.5 text-blue-400 ml-1.5 shrink-0" />}
                              </div>
                              <span className="text-zinc-500 text-[10px] whitespace-nowrap ml-2">({groupItems.length})</span>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64 min-w-[140px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 pr-8 bg-zinc-950 border-zinc-800 text-sm h-9 text-white w-full" />
                    {search && (
                      <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-white transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 w-9 p-0 shrink-0 border-zinc-800 bg-zinc-950 text-zinc-300 relative" title="Filters">
                        <Filter className="h-4 w-4" />
                        {(activeTab === 'chemicals' ? (filterTags.length + filterBrands.length + filterShelves.length + filterSections.length + filterSizes.length) : filterLocations.length) > 0 && (
                          <Badge className="absolute -top-2 -right-2 bg-purple-500 hover:bg-purple-600 px-1 py-0 h-4 min-w-[16px] flex items-center justify-center text-[10px]">
                            {activeTab === 'chemicals' ? (filterTags.length + filterBrands.length + filterShelves.length + filterSections.length + filterSizes.length) : filterLocations.length}
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 bg-zinc-950 border-zinc-800 text-white p-0 overflow-hidden pointer-events-auto" align="end">
                      <div className="max-h-[70vh] overflow-y-auto p-4 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }} onWheel={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
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
                      </div>
                    </PopoverContent>
                    </Popover>
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
                            <SelectItem value="updated_at">Last Updated</SelectItem>
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
              {activeTab === 'chemicals' && groupedChemicals.map(([groupName, groupItems]) => {
                const isGroupExpanded = groupItems.some(c => expandedItems[c.id]);
                const isSectionCollapsed = !!collapsedSections[groupName];
                return (
                <div key={groupName} id={`group-${groupName.replace(/\s+/g, '-')}`} className="space-y-4">
                  {groupName !== 'All Chemicals' && (
                    <h3 className={`text-sm font-black uppercase tracking-widest border-b pb-1 mt-4 flex items-center gap-2 ${isGroupExpanded ? 'text-purple-300 border-purple-400/50 bg-purple-500/10 px-2 pt-1 -mx-2 rounded-t' : 'text-purple-400/60 border-purple-500/20'}`}>
                      {groupName} <span className="text-xs font-normal opacity-70">({groupItems.length})</span>
                      <div className="ml-auto flex items-center gap-2">
                        {isGroupExpanded && <CheckCircle className="h-3.5 w-3.5 opacity-70" />}
                        <button onClick={() => toggleSectionCollapse(groupName)} className="flex items-center justify-center h-6 w-6 rounded hover:bg-purple-500/20 text-purple-400/70 hover:text-purple-300 transition-colors">
                          {isSectionCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                        </button>
                      </div>
                    </h3>
                  )}
                  {!isSectionCollapsed && (
                    <LazyItemList items={groupItems} renderItem={(c: any) => {
                    const s = getChemState(c.id);
                    const isCounted = isChemCounted(c.id);
                    const isExpanded = expandedItems[c.id];
                    
                    return (
                      <div key={c.id} className={`border rounded-lg overflow-hidden transition-colors ${isCounted ? 'bg-purple-950/20 border-purple-500/50' : 'bg-zinc-900 border-zinc-800'}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between p-3 cursor-pointer select-none gap-3" onClick={() => toggleExpand(c.id)}>
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {isCounted ? <CheckCircle className="h-5 w-5 text-purple-400 shrink-0" /> : <div className="h-5 w-5 rounded-full border border-zinc-600 shrink-0" />}
                        <div className="min-w-0">
                          <div className="font-bold text-zinc-200 leading-tight flex items-center flex-wrap gap-2">
                            <span>{c.brand ? `${c.brand === 'Superior Products' ? 'SP' : c.brand} / ` : ''}{c.name}</span>
                            {c.notes && (
                              <Popover modal={true}>
                                <PopoverTrigger asChild>
                                  <button onClick={e => e.stopPropagation()} className="cursor-pointer text-amber-500/70 hover:text-amber-400 focus:outline-none shrink-0" title="View Notes">
                                    <FileText className="h-4 w-4" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="z-[99999] bg-zinc-800 text-white border-zinc-700 p-4 max-w-[300px] sm:max-w-[400px] text-sm break-words whitespace-pre-wrap max-h-[50vh] overflow-y-auto" side="bottom" align="start">
                                  <div className="font-bold text-amber-500 mb-2 border-b border-zinc-700 pb-1">Notes for {c.name}</div>
                                  {c.notes}
                                </PopoverContent>
                              </Popover>
                            )}
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
                          {c.bottleSize?.toLowerCase().includes('gallon') ? (
                            <>
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
                            </>
                          ) : (
                            <Select 
                              value={String((s.isConcentrate ? s.gallons : s.usedAsIsJugs).find(j => j.count > 0)?.fillLevel || 0)}
                              onValueChange={(v) => setNonGallonAmount(c.id, parseFloat(v))}
                            >
                              <SelectTrigger className="h-8 w-32 text-xs border-purple-500/30 bg-zinc-950 text-white">
                                <SelectValue placeholder="Select Amount" />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                                <SelectItem value="0">Empty (0)</SelectItem>
                                <SelectItem value="0.25">1/4 {c.bottleSize || 'Bottle'}</SelectItem>
                                <SelectItem value="0.5">1/2 {c.bottleSize || 'Bottle'}</SelectItem>
                                <SelectItem value="0.75">3/4 {c.bottleSize || 'Bottle'}</SelectItem>
                                <SelectItem value="1">Full (1)</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
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
                            <Popover modal={true}>
                              <PopoverTrigger asChild>
                                <button className="cursor-help inline-flex focus:outline-none"><Info className="h-4 w-4 text-zinc-500 ml-2" /></button>
                              </PopoverTrigger>
                              <PopoverContent className="z-[99999] bg-zinc-800 text-white border-zinc-700 p-3 max-w-[250px] text-sm" side="top">
                                Is this diluted with water (Concentrate) or used directly from the bottle (Used As-Is)?
                              </PopoverContent>
                            </Popover>
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
                              <Label className="text-xs text-zinc-400 uppercase">
                                {c.bottleSize?.toLowerCase().includes('gallon') ? 'Gallons on Hand' : 'Containers on Hand'}
                              </Label>
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
              }} />
                  )}
                </div>
              );
            })}
            
            {activeTab === 'chemicals' && filteredChemicals.length === 0 && (
              <div className="p-8 text-center text-zinc-500 italic">No chemicals found.</div>
            )}
              
              {activeTab !== 'chemicals' && (activeTab === 'supplies' ? groupedSupplies : groupedEquip).map(([loc, items]) => {
                const isGroupExpanded = items.some((item: any) => expandedItems[item.id]);
                const isSectionCollapsed = !!collapsedSections[loc];
                return (
                  <div key={loc} id={`group-${loc.replace(/\s+/g, '-')}`} className="mb-6">
                    <h3 className={`text-sm font-black uppercase tracking-widest border-b pb-1 mt-4 mb-2 flex items-center gap-2 ${isGroupExpanded ? 'text-blue-300 border-blue-400/50 bg-blue-500/10 px-2 pt-1 -mx-2 rounded-t' : 'text-blue-400/60 border-blue-500/20'}`}>
                      {loc} <span className="text-xs font-normal opacity-70">({items.length})</span>
                      <div className="ml-auto flex items-center gap-2">
                        {isGroupExpanded && <CheckCircle className="h-3.5 w-3.5 opacity-70" />}
                        <button onClick={() => toggleSectionCollapse(loc)} className="flex items-center justify-center h-6 w-6 rounded hover:bg-blue-500/20 text-blue-400/70 hover:text-blue-300 transition-colors">
                          {isSectionCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                        </button>
                      </div>
                    </h3>
                    {!isSectionCollapsed && (
                      <div className="space-y-3">
                      <LazyItemList items={items} renderItem={(item: any) => {
                      const auditMap = activeTab === 'supplies' ? supplyAudit : equipAudit;
                      const updateCount = activeTab === 'supplies' ? updateSupplyCount : updateEquipCount;
                      const state = auditMap[item.id] || { counted: 0, isCounted: false };
                      const counted = state.counted;
                      const isCounted = state.isCounted;
                      const isExpanded = !!expandedItems[item.id];
                      const meta = supplyMeta[item.id] || {};

                      // Companion Items: reverse-lookup (who else links to this item?)
                      const allSupplyItems = supplies as Material[];
                      const linkedByOthers = activeTab === 'supplies'
                        ? allSupplyItems.filter(s => s.id !== item.id && (supplyMeta[s.id]?.companionItems || []).includes(item.id))
                        : [];

                      // All possible companion targets (supplies + chemicals shown by name)
                      const companionPool = [...supplies.map(s => ({ id: s.id, name: s.name, type: 'Supply' }))];

                      const conditionConfig = {
                        new: { label: 'New', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
                        good: { label: 'Good', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
                        worn: { label: 'Worn', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
                        needs_replacement: { label: 'Needs Replacement', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
                      };

                      return (
                        <div key={item.id} className={`border rounded-lg overflow-hidden transition-colors ${isCounted ? 'bg-blue-950/20 border-blue-500/50' : 'bg-zinc-900 border-zinc-800'}`}>
                          {/* Card Header Row */}
                          <div className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3">
                            {/* Left: checkbox + name info — clicking toggles expand for supplies */}
                            <div
                              className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer select-none"
                              onClick={() => activeTab === 'supplies' ? toggleExpand(item.id) : updateCount(item.id, 0, !isCounted)}
                            >
                              {isCounted ? <CheckCircle className="h-5 w-5 text-blue-400 shrink-0" /> : <div className="h-5 w-5 rounded-full border border-zinc-600 shrink-0" />}
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-zinc-200 flex items-center gap-2 flex-wrap">
                                  <span className="truncate">{item.name}</span>
                                  {item.notes && (
                                    <Popover modal={true}>
                                      <PopoverTrigger asChild>
                                        <button onClick={e => e.stopPropagation()} className="cursor-pointer text-amber-500/70 hover:text-amber-400 focus:outline-none shrink-0" title="View Notes">
                                          <FileText className="h-4 w-4" />
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent className="z-[99999] bg-zinc-800 text-white border-zinc-700 p-4 max-w-[300px] sm:max-w-[400px] text-sm break-words whitespace-pre-wrap max-h-[50vh] overflow-y-auto" side="bottom" align="start">
                                        <div className="font-bold text-amber-500 mb-2 border-b border-zinc-700 pb-1">Notes for {item.name}</div>
                                        {item.notes}
                                      </PopoverContent>
                                    </Popover>
                                  )}
                                  {/* Condition badge (collapsed preview) */}
                                  {activeTab === 'supplies' && meta.conditionStatus && (
                                    <span className={`text-[10px] font-black px-1.5 py-0 border rounded ${conditionConfig[meta.conditionStatus as keyof typeof conditionConfig]?.color || ''}`}>
                                      {conditionConfig[meta.conditionStatus as keyof typeof conditionConfig]?.label}
                                    </span>
                                  )}
                                  {activeTab === 'supplies' && (meta.companionItems?.length || 0) > 0 && (
                                    <span className="text-[10px] text-violet-400 flex items-center gap-0.5"><Link2 className="h-3 w-3" />{meta.companionItems!.length}</span>
                                  )}
                                </div>
                                <div className="text-xs text-zinc-500 flex items-center gap-2">
                                  <span>DB Qty: {item.quantity || 1}</span>
                                  {((item as any).location || (item as any).containerLocation) && (
                                    <>
                                      <span className="w-1 h-1 bg-zinc-700 rounded-full shrink-0" />
                                      <span className={`truncate ${activeTab === 'supplies' ? 'text-blue-400/80' : 'text-amber-400/80'}`}>
                                        {(item as any).location || 'No Location'}{(item as any).containerLocation ? ` / ${(item as any).containerLocation}` : ''}
                                      </span>
                                    </>
                                  )}
                                  {activeTab === 'supplies' && meta.lastUsedDate && (
                                    <span className="text-zinc-600 flex items-center gap-0.5"><Calendar className="h-3 w-3" /> {meta.lastUsedDate}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: controls */}
                            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                              {/* Checkbox toggle for supplies (clicking left area does expand; this does count-toggle) */}
                              {activeTab === 'supplies' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={`h-8 px-2 text-xs font-bold ${isCounted ? 'text-blue-400' : 'text-zinc-500 hover:text-blue-400'}`}
                                  onClick={() => updateCount(item.id, 0, !isCounted)}
                                  title={isCounted ? 'Mark uncounted' : 'Mark counted'}
                                >
                                  {isCounted ? <CheckCircle className="h-4 w-4" /> : <div className="h-4 w-4 rounded-full border border-zinc-600" />}
                                </Button>
                              )}
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
                                className="h-10 w-10 p-0 border-orange-500/30 text-orange-400 bg-orange-500/10 hover:bg-orange-500 hover:text-white ml-1 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
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
                              {/* Expand chevron for supplies only */}
                              {activeTab === 'supplies' && (
                                <button className="text-zinc-500 hover:text-zinc-300 ml-1" onClick={() => toggleExpand(item.id)}>
                                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Expand Card — Supplies only */}
                          {activeTab === 'supplies' && isExpanded && (
                            <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-4">

                              {/* Row 1: Condition / Wear Status */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-xs text-zinc-400 uppercase flex items-center gap-1.5">
                                    <Heart className="h-3.5 w-3.5 text-rose-400" /> Condition / Wear Status
                                  </Label>
                                  <Select
                                    value={meta.conditionStatus || ''}
                                    onValueChange={v => updateSupplyMeta(item.id, { conditionStatus: (v || undefined) as SupplyItemMeta['conditionStatus'] })}
                                  >
                                    <SelectTrigger className={`bg-zinc-900 border-zinc-700 text-zinc-100 h-9 text-sm ${
                                      meta.conditionStatus === 'new' ? 'border-emerald-500/40 text-emerald-400' :
                                      meta.conditionStatus === 'good' ? 'border-blue-500/40 text-blue-400' :
                                      meta.conditionStatus === 'worn' ? 'border-amber-500/40 text-amber-400' :
                                      meta.conditionStatus === 'needs_replacement' ? 'border-red-500/40 text-red-400' : ''
                                    }`}>
                                      <SelectValue placeholder="Select condition..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-800">
                                      <SelectItem value="new" className="text-emerald-400">New</SelectItem>
                                      <SelectItem value="good" className="text-blue-400">Good</SelectItem>
                                      <SelectItem value="worn" className="text-amber-400">Worn</SelectItem>
                                      <SelectItem value="needs_replacement" className="text-red-400">Needs Replacement</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Row 1b: Last Used Date */}
                                <div className="space-y-2">
                                  <Label className="text-xs text-zinc-400 uppercase flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5 text-blue-400" /> Last Used Date
                                  </Label>
                                  <Input
                                    type="date"
                                    value={meta.lastUsedDate || ''}
                                    onChange={e => updateSupplyMeta(item.id, { lastUsedDate: e.target.value || undefined })}
                                    className="bg-zinc-900 border-zinc-700 text-zinc-100 h-9 text-sm [color-scheme:dark]"
                                  />
                                </div>
                              </div>

                              {/* Condition Note */}
                              {meta.conditionStatus && meta.conditionStatus !== 'new' && (
                                <div className="space-y-2">
                                  <Label className="text-xs text-zinc-400 uppercase">Condition Note (optional)</Label>
                                  <Input
                                    placeholder={`E.g. ${meta.conditionStatus === 'worn' ? 'pad edges fraying' : meta.conditionStatus === 'needs_replacement' ? 'torn, unusable' : 'minor wear'}`}
                                    value={meta.conditionNote || ''}
                                    onChange={e => updateSupplyMeta(item.id, { conditionNote: e.target.value || undefined })}
                                    className="bg-zinc-900 border-zinc-700 text-zinc-100 h-9 text-sm"
                                  />
                                </div>
                              )}

                              {/* Companion Items */}
                              <div className="space-y-2 pt-2 border-t border-zinc-800">
                                <Label className="text-xs text-zinc-400 uppercase flex items-center gap-1.5">
                                  <Link2 className="h-3.5 w-3.5 text-violet-400" /> Compatible / Companion Items
                                </Label>
                                {/* Picker: select items to link */}
                                <Select
                                  value=""
                                  onValueChange={v => {
                                    if (!v) return;
                                    const current = meta.companionItems || [];
                                    if (!current.includes(v)) {
                                      updateSupplyMeta(item.id, { companionItems: [...current, v] });
                                    }
                                  }}
                                >
                                  <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-500 h-9 text-sm">
                                    <SelectValue placeholder="Link an item..." />
                                  </SelectTrigger>
                                  <SelectContent className="bg-zinc-900 border-zinc-800 max-h-60">
                                    {companionPool
                                      .filter(p => p.id !== item.id && !(meta.companionItems || []).includes(p.id))
                                      .sort((a, b) => a.name.localeCompare(b.name))
                                      .map(p => (
                                        <SelectItem key={p.id} value={p.id} className="text-zinc-300">
                                          {p.name} <span className="text-[10px] text-zinc-500 ml-1">({p.type})</span>
                                        </SelectItem>
                                      ))
                                    }
                                  </SelectContent>
                                </Select>

                                {/* Linked items display */}
                                {(meta.companionItems || []).length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-1">
                                    {(meta.companionItems || []).map(cid => {
                                      const linked = companionPool.find(p => p.id === cid);
                                      if (!linked) return null;
                                      return (
                                        <span key={cid} className="flex items-center gap-1 text-xs bg-violet-500/10 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full">
                                          {linked.name}
                                          <button
                                            className="text-violet-500 hover:text-red-400 ml-0.5"
                                            onClick={() => updateSupplyMeta(item.id, { companionItems: (meta.companionItems || []).filter(id => id !== cid) })}
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Reverse-lookup: who links to this item */}
                                {linkedByOthers.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-zinc-800/60">
                                    <p className="text-[10px] text-zinc-600 uppercase font-bold mb-1">Also linked from:</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {linkedByOthers.map(s => (
                                        <span key={s.id} className="text-xs bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded-full">
                                          {s.name}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                            </div>
                          )}
                        </div>
                      );
                    }} />
                  </div>
                  )}
                </div>
                );
              })}
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
        <DialogFooter className="p-3 sm:p-4 border-t border-purple-500/20 bg-zinc-900 shrink-0 flex flex-row flex-wrap items-center justify-between gap-y-3 gap-x-2 print:hidden w-full !space-x-0">
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              className="border-cyan-500/40 text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/50 hover:text-cyan-300 px-3 sm:px-4" 
              onClick={() => viewingSnapshot ? setViewingSnapshot(null) : showHistory ? setShowHistory(false) : reviewMode ? setReviewMode(false) : handleCloseAttempt()}
            >
              {showHistory || reviewMode || viewingSnapshot ? 'Back' : 'Cancel'}
            </Button>
            
            {!showHistory && (
              <>
                <Button
                  variant="outline"
                  className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white px-3 sm:px-4 flex-1 sm:flex-none justify-center"
                  onClick={() => handleExportPDF(viewingSnapshot || undefined)}
                  title="Save PDF"
                >
                  <Download className="h-4 w-4 sm:mr-1.5" /> <span className="hidden sm:inline">PDF</span>
                </Button>
                <Button
                  variant="outline"
                  className="border-blue-500/50 bg-blue-900/20 text-blue-300 hover:bg-blue-800/40 hover:text-white px-3 sm:px-4 flex-1 sm:flex-none justify-center gap-1.5"
                  onClick={() => handleExportFullReport(viewingSnapshot || undefined)}
                  title="Export Combined PDF Report"
                >
                  <FileText className="h-4 w-4" /> 
                  <span className="hidden sm:inline">Full IAC Report</span>
                </Button>
                {activeTab === 'chemicals' && (
                  <Button
                    variant="outline"
                    className="border-fuchsia-500/50 bg-fuchsia-900/20 text-fuchsia-300 hover:bg-fuchsia-800/40 hover:text-white px-3 sm:px-4 flex-1 sm:flex-none justify-center gap-1.5"
                    onClick={() => exportCaddyReport()}
                    title="Export Caddies PDF"
                  >
                    <Download className="h-4 w-4" /> 
                    <span className="hidden sm:inline">Caddy Report</span>
                  </Button>
                )}
              </>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2 ml-auto">
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
          </div>
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
          
          {activeTab !== 'chemicals' && (activeTab === 'supplies' ? groupedSupplies : groupedEquip).map(([groupName, groupItems]) => (
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
