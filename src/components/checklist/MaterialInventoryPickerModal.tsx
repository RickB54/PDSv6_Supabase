import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Trash2, Check, Droplets, Package, Wrench, Sparkles, SlidersHorizontal, ShieldCheck, Flame, WrenchIcon, Info, HelpCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Chemical, Material, Tool as Equipment } from '@/lib/inventory-data';
import { isChemicalLowStock } from '@/lib/chemicals';
import { useToast } from '@/hooks/use-toast';

export interface LoggedChemicalUsage {
  id: string; // unique row id
  chemicalId: string;
  chemicalName: string;
  category: 'exterior' | 'interior' | 'both' | 'other';
  amountUsedOz: number;
  dilutionRatioStr: string; // e.g. "4:1", "10:1", "RTU"
  ratioParts: number; // e.g. 4 for 4:1, 0 for RTU
  concentrateDeductedOz: number;
  bottleSizeOz: number;
  currentStock: number;
  notes?: string;
}

export interface LoggedMaterialUsage {
  id: string; // unique row id
  materialId: string;
  materialName: string;
  quantityUsed: number;
  currentStock: number;
  notes?: string;
}

export interface LoggedToolUsage {
  id: string;
  toolId: string;
  toolName: string;
  notes?: string;
}

export interface EquipmentMaintenanceLog {
  equipmentId: string;
  equipmentName: string;
  gasLevel?: string; // "Full", "3/4", "1/2", "1/4", "Low/Empty"
  lastAirFilterChange?: string;
  lastOilChange?: string;
  lastFillUpDate?: string;
  winterStorageNotes?: string;
  lastServiceDate?: string;
  conditionNotes?: string;
}

interface MaterialInventoryPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chemicals: Chemical[];
  materials: Material[];
  tools: Equipment[];
  chemRows: LoggedChemicalUsage[];
  matRows: LoggedMaterialUsage[];
  toolRows: LoggedToolUsage[];
  equipLogs?: EquipmentMaintenanceLog[];
  onSaveRows: (
    chemRows: LoggedChemicalUsage[],
    matRows: LoggedMaterialUsage[],
    toolRows: LoggedToolUsage[],
    equipLogs?: EquipmentMaintenanceLog[]
  ) => void;
}

export default function MaterialInventoryPickerModal({
  open,
  onOpenChange,
  chemicals = [],
  materials = [],
  tools = [],
  chemRows = [],
  matRows = [],
  toolRows = [],
  equipLogs = [],
  onSaveRows,
}: MaterialInventoryPickerModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'exterior' | 'interior' | 'supplies' | 'tools' | 'maintenance'>('exterior');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sort State per Tab
  const [chemSortBy, setChemSortBy] = useState<string>('brand_asc');
  const [matSortBy, setMatSortBy] = useState<string>('last_updated');
  const [toolSortBy, setToolSortBy] = useState<string>('last_updated');

  const [localChemRows, setLocalChemRows] = useState<LoggedChemicalUsage[]>(chemRows);
  const [localMatRows, setLocalMatRows] = useState<LoggedMaterialUsage[]>(matRows);
  const [localToolRows, setLocalToolRows] = useState<LoggedToolUsage[]>(toolRows);

  // Equipment Maintenance State
  const [localEquipLogs, setLocalEquipLogs] = useState<EquipmentMaintenanceLog[]>(equipLogs);

  // Sync state when modal opens
  React.useEffect(() => {
    if (open) {
      setLocalChemRows(chemRows);
      setLocalMatRows(matRows);
      setLocalToolRows(toolRows);
      setLocalEquipLogs(equipLogs || []);
    }
  }, [open, chemRows, matRows, toolRows, equipLogs]);

  // Unique Brands & Vendors for Jump To filters
  const uniqueBrands = useMemo(() => {
    const brands = new Set<string>();
    chemicals.forEach(c => { if (c.brand?.trim()) brands.add(c.brand.trim()); });
    return Array.from(brands).sort();
  }, [chemicals]);

  const uniqueMatVendors = useMemo(() => {
    const vendors = new Set<string>();
    materials.forEach(m => { if ((m as any).vendor?.trim()) vendors.add((m as any).vendor.trim()); });
    return Array.from(vendors).sort();
  }, [materials]);

  const uniqueToolVendors = useMemo(() => {
    const vendors = new Set<string>();
    tools.forEach(t => { if ((t as any).vendor?.trim()) vendors.add((t as any).vendor.trim()); });
    return Array.from(vendors).sort();
  }, [tools]);

  // Helper to parse bottle size in oz
  const parseBottleSizeOz = (bs?: string, category: string = 'exterior'): number => {
    if (!bs) return category.toLowerCase().includes('interior') ? 24 : 32;
    const lower = bs.toLowerCase().trim().split('|__ct__|')[0];
    if (lower.includes('gal')) return 128;
    const match = lower.match(/(\d+(\.\d+)?)\s*oz/);
    if (match) return parseFloat(match[1]);
    const numMatch = lower.match(/^(\d+(\.\d+)?)$/);
    if (numMatch) return parseFloat(numMatch[1]);
    return category.toLowerCase().includes('interior') ? 24 : 32;
  };

  // Helper to calculate concentrate oz deducted (for reporting only)
  const calculateConcentrateOz = (amountOz: number, ratioParts: number): number => {
    if (ratioParts <= 0) return amountOz;
    return amountOz / (ratioParts + 1);
  };

  // Helper to count distinct chemicals by matching name and brand
  const countDistinctChemicals = (chems: Chemical[]) => {
    return new Set(chems.map(c => `${(c.name || '').trim().toLowerCase()}_${(c.brand || '').trim().toLowerCase()}`)).size;
  };

  // Category match checker: Handles Exterior, Interior, and 'Both'/'Dual-Use'
  const isChemicalCategoryMatch = (chem: Chemical, targetSection: 'exterior' | 'interior'): boolean => {
    const rawCat = (chem.category || chem.shelf || chem.section || '').toLowerCase().trim();
    // 'both' and 'dual-use' appear in BOTH sections
    if (rawCat === 'both' || rawCat.includes('both') || rawCat === 'dual-use' || rawCat.includes('dual')) return true;
    if (targetSection === 'exterior') {
      // Only exterior if explicitly exterior, or if no specific interior/both tag exists
      if (rawCat.includes('interior') || rawCat.includes(' int')) return false;
      return rawCat.includes('exterior') || rawCat.includes('ext') || rawCat === '';
    }
    if (targetSection === 'interior') {
      return rawCat.includes('interior') || rawCat.includes(' int');
    }
    return false;
  };

  // Add chemical to logged list
  const handleSelectChemical = (chem: Chemical) => {
    if (localChemRows.some(r => r.chemicalId === chem.id)) {
      toast({ title: 'Already Added', description: `${chem.name} is already in your logged list.` });
      return;
    }
    const categoryName = (chem.category || chem.shelf || '').toLowerCase();
    let cat: 'exterior' | 'interior' | 'both' | 'other' = 'exterior';
    if (categoryName.includes('both')) cat = 'both';
    else if (categoryName.includes('interior')) cat = 'interior';

    const bottleSizeOz = parseBottleSizeOz(chem.bottleSize, cat);

    // Get default dilution ratio if available
    let defaultRatioStr = 'RTU';
    let defaultRatioParts = 0;
    if (chem.dilutionRatios && chem.dilutionRatios.length > 0) {
      const r = chem.dilutionRatios[0];
      defaultRatioStr = r.ratio || 'RTU';
      const partsMatch = defaultRatioStr.match(/(\d+):1/);
      if (partsMatch) defaultRatioParts = parseInt(partsMatch[1]);
    }

    const newRow: LoggedChemicalUsage = {
      id: crypto.randomUUID(),
      chemicalId: chem.id,
      chemicalName: chem.name,
      category: cat,
      amountUsedOz: 2.0, // Granular default usage (2 oz)
      dilutionRatioStr: defaultRatioStr,
      ratioParts: defaultRatioParts,
      concentrateDeductedOz: calculateConcentrateOz(2.0, defaultRatioParts),
      bottleSizeOz,
      currentStock: chem.currentStock || 0,
    };

    setLocalChemRows(prev => [...prev, newRow]);
    toast({ title: 'Chemical Added', description: `Added ${chem.name} to job report.` });
  };

  // Add material/supply to logged list
  const handleSelectMaterial = (mat: Material) => {
    if (localMatRows.some(r => r.materialId === mat.id)) {
      toast({ title: 'Already Added', description: `${mat.name} is already in your logged list.` });
      return;
    }
    const newRow: LoggedMaterialUsage = {
      id: crypto.randomUUID(),
      materialId: mat.id,
      materialName: mat.name,
      quantityUsed: 1,
      currentStock: mat.quantity || 0,
    };
    setLocalMatRows(prev => [...prev, newRow]);
    toast({ title: 'Supply Added', description: `Added ${mat.name} to job report.` });
  };

  // Add tool to logged list
  const handleSelectTool = (tool: Equipment) => {
    if (localToolRows.some(r => r.toolId === tool.id)) return;
    const newRow: LoggedToolUsage = {
      id: crypto.randomUUID(),
      toolId: tool.id,
      toolName: tool.name,
      notes: ''
    };
    setLocalToolRows(prev => [...prev, newRow]);
  };

  // Filtered & Sorted Exterior Chemicals
  const filteredChemicalsExterior = useMemo(() => {
    let list = chemicals.filter(c => isChemicalCategoryMatch(c, 'exterior'));
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || (c.brand && c.brand.toLowerCase().includes(q)));
    }

    // Apply Sorting
    return [...list].sort((a, b) => {
      if (chemSortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (chemSortBy === 'low_threshold') {
        const aLow = isChemicalLowStock(a, chemicals);
        const bLow = isChemicalLowStock(b, chemicals);
        if (aLow !== bLow) return aLow ? -1 : 1;
        return (a.currentStock || 0) - (b.currentStock || 0);
      }
      if (chemSortBy === 'missing_cost') return (a.unitPrice ? 1 : -1) - (b.unitPrice ? 1 : -1);
      if (chemSortBy === 'last_updated') return (b.updatedAt || '').localeCompare(a.updatedAt || '');
      if (chemSortBy.startsWith('jump_brand:')) {
        const targetBrand = chemSortBy.replace('jump_brand:', '');
        const aMatch = (a.brand || '') === targetBrand;
        const bMatch = (b.brand || '') === targetBrand;
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
      }
      // Default: brand_asc
      const brandA = a.brand || 'ZZZ';
      const brandB = b.brand || 'ZZZ';
      const brandComp = brandA.localeCompare(brandB);
      if (brandComp !== 0) return brandComp;
      return a.name.localeCompare(b.name);
    });
  }, [chemicals, searchQuery, chemSortBy]);

  // Filtered & Sorted Interior Chemicals (Chemicals with 'both' also appear here!)
  const filteredChemicalsInterior = useMemo(() => {
    let list = chemicals.filter(c => isChemicalCategoryMatch(c, 'interior'));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || (c.brand && c.brand.toLowerCase().includes(q)));
    }

    // Apply Sorting
    return [...list].sort((a, b) => {
      if (chemSortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (chemSortBy === 'low_threshold') {
        const aLow = isChemicalLowStock(a, chemicals);
        const bLow = isChemicalLowStock(b, chemicals);
        if (aLow !== bLow) return aLow ? -1 : 1;
        return (a.currentStock || 0) - (b.currentStock || 0);
      }
      if (chemSortBy === 'missing_cost') return (a.unitPrice ? 1 : -1) - (b.unitPrice ? 1 : -1);
      if (chemSortBy === 'last_updated') return (b.updatedAt || '').localeCompare(a.updatedAt || '');
      if (chemSortBy.startsWith('jump_brand:')) {
        const targetBrand = chemSortBy.replace('jump_brand:', '');
        const aMatch = (a.brand || '') === targetBrand;
        const bMatch = (b.brand || '') === targetBrand;
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
      }
      const brandA = a.brand || 'ZZZ';
      const brandB = b.brand || 'ZZZ';
      const brandComp = brandA.localeCompare(brandB);
      if (brandComp !== 0) return brandComp;
      return a.name.localeCompare(b.name);
    });
  }, [chemicals, searchQuery, chemSortBy]);

  // Filtered & Sorted Supplies
  const filteredMaterials = useMemo(() => {
    let list = materials.filter(m => {
      if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase()) && !(m.category && m.category.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      if (matSortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (matSortBy === 'category') return (a.category || '').localeCompare(b.category || '');
      if (matSortBy === 'low_threshold') return (a.quantity || 0) - (b.quantity || 0);
      if (matSortBy === 'missing_cost') return (a.unitPrice ? 1 : -1) - (b.unitPrice ? 1 : -1);
      if (matSortBy.startsWith('vendor:')) {
        const vTarget = matSortBy.replace('vendor:', '');
        const aMatch = ((a as any).vendor || '') === vTarget;
        const bMatch = ((b as any).vendor || '') === vTarget;
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
      }
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });
  }, [materials, searchQuery, matSortBy]);

  // Filtered & Sorted Tools & Equipment
  const filteredTools = useMemo(() => {
    let list = tools.filter(t => {
      if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      if (toolSortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (toolSortBy === 'purchase_date') return ((b as any).purchaseDate || '').localeCompare((a as any).purchaseDate || '');
      if (toolSortBy === 'low_threshold') return (a.quantity || 0) - (b.quantity || 0);
      if (toolSortBy === 'missing_cost') return ((a as any).cost ? 1 : -1) - ((b as any).cost ? 1 : -1);
      if (toolSortBy.startsWith('vendor:')) {
        const vTarget = toolSortBy.replace('vendor:', '');
        const aMatch = ((a as any).vendor || '') === vTarget;
        const bMatch = ((b as any).vendor || '') === vTarget;
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
      }
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });
  }, [tools, searchQuery, toolSortBy]);

  // Helper to update Equipment Maintenance fields
  const updateEquipLog = (equipId: string, equipName: string, updates: Partial<EquipmentMaintenanceLog>) => {
    setLocalEquipLogs(prev => {
      const existingIdx = prev.findIndex(l => l.equipmentId === equipId);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = { ...next[existingIdx], ...updates };
        return next;
      }
      return [...prev, { equipmentId: equipId, equipmentName: equipName, ...updates }];
    });
  };

  const getEquipLog = (equipId: string): EquipmentMaintenanceLog => {
    return localEquipLogs.find(l => l.equipmentId === equipId) || { equipmentId: equipId, equipmentName: '' };
  };

  // Pure Report Save Handler (No IAC Stock Modification!)
  const handleSaveReportOnly = () => {
    onSaveRows(localChemRows, localMatRows, localToolRows, localEquipLogs);
    toast({
      title: 'Usage Log Saved',
      description: 'Materials & equipment usage logged for job report. IAC stock levels were not modified.'
    });
    onOpenChange(false);
  };

  // Generator Log helper
  const predatorGenerator = tools.find(t => t.name.toLowerCase().includes('generator') || t.name.toLowerCase().includes('predator')) || { id: 'predator-gen-1', name: 'Predator Gas Generator' };
  const genLog = getEquipLog(predatorGenerator.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-zinc-950 text-white border-zinc-800 p-0 overflow-hidden">
        <DialogHeader className="p-4 md:p-6 border-b border-zinc-800 bg-zinc-900/60 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
                <Droplets className="h-6 w-6 text-blue-400" />
                Materials & Equipment Usage Report Log
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-blue-400 ml-1 rounded-full bg-zinc-800/50" title="How to use this modal">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-4 bg-zinc-950 border-blue-900/50 text-sm shadow-2xl z-50">
                    <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                      <h4 className="font-bold text-blue-400 flex items-center gap-2 border-b border-blue-900/30 pb-2">
                        <Info className="w-4 h-4" /> Using the Usage Report Log
                      </h4>
                      
                      <div>
                        <strong className="text-zinc-300 block mb-1">1. Navigation Tabs</strong>
                        <p className="text-zinc-400 text-xs leading-relaxed">
                          Switch between <strong className="text-white">Exterior, Interior, Supplies, Tools,</strong> and <strong className="text-white">Equipment Maintenance</strong> to find the items you need to log for this job.
                        </p>
                      </div>

                      <div>
                        <strong className="text-zinc-300 block mb-1">2. Search & Sort</strong>
                        <p className="text-zinc-400 text-xs leading-relaxed">
                          Use the search bar to instantly find specific items. The sort dropdown helps you order the list by A-Z, Low Stock, or Brand.
                        </p>
                      </div>

                      <div>
                        <strong className="text-zinc-300 block mb-1">3. Granular Chemical Logging (1/8 oz)</strong>
                        <p className="text-zinc-400 text-xs leading-relaxed">
                          When you add a chemical, it appears in the bottom list. Use the <strong className="text-white">+/-</strong> buttons to quickly adjust the amount in <strong className="text-white">1/8 oz increments</strong> (e.g. 0.125, 0.25). The system automatically calculates how much pure concentrate was used based on the dilution ratio.
                        </p>
                      </div>

                      <div>
                        <strong className="text-zinc-300 block mb-1">4. Equipment Maintenance</strong>
                        <p className="text-zinc-400 text-xs leading-relaxed">
                          In the Equipment tab, record critical rig details like Gas Tank Levels (Full, 3/4, etc.), Last Oil/Filter Change dates, and specific condition notes for any tool (e.g. "Hose has a small leak").
                        </p>
                      </div>

                      <div>
                        <strong className="text-zinc-300 block mb-1">5. Safe Saving (Reporting Only)</strong>
                        <p className="text-zinc-400 text-xs leading-relaxed">
                          Click <strong className="text-white">Save Materials Usage Log</strong> to save these details to the customer's job report. This modal is <strong className="text-white">reporting only</strong>—it does NOT permanently deduct from your Master IAC (Inventory Audit Checklist) stock levels.
                        </p>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </DialogTitle>
              <p className="text-xs text-zinc-400">
                Search inventory to log granular chemical usage (in 1/8 oz increments), supplies, and equipment maintenance status for job reports.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-300 border-amber-500/30 whitespace-nowrap">
                Reporting Only • No IAC Stock Impact
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Top Picker Controls & Tabs */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={activeTab === 'exterior' ? 'default' : 'outline'}
                className={activeTab === 'exterior' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'border-zinc-800 text-zinc-400'}
                onClick={() => setActiveTab('exterior')}
              >
                <Sparkles className="h-4 w-4 mr-1.5 text-blue-400" />
                Exterior Chemicals ({countDistinctChemicals(filteredChemicalsExterior)})
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'interior' ? 'default' : 'outline'}
                className={activeTab === 'interior' ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'border-zinc-800 text-zinc-400'}
                onClick={() => setActiveTab('interior')}
              >
                <Droplets className="h-4 w-4 mr-1.5 text-amber-400" />
                Interior Chemicals ({countDistinctChemicals(filteredChemicalsInterior)})
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'supplies' ? 'default' : 'outline'}
                className={activeTab === 'supplies' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'border-zinc-800 text-zinc-400'}
                onClick={() => setActiveTab('supplies')}
              >
                <Package className="h-4 w-4 mr-1.5 text-emerald-400" />
                Supplies & Materials ({filteredMaterials.length})
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'tools' ? 'default' : 'outline'}
                className={activeTab === 'tools' ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'border-zinc-800 text-zinc-400'}
                onClick={() => setActiveTab('tools')}
              >
                <Wrench className="h-4 w-4 mr-1.5 text-purple-400" />
                Tools & Equipment ({filteredTools.length})
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'maintenance' ? 'default' : 'outline'}
                className={activeTab === 'maintenance' ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'border-zinc-800 text-zinc-400'}
                onClick={() => setActiveTab('maintenance')}
              >
                <Flame className="h-4 w-4 mr-1.5 text-amber-400" />
                Equipment Maintenance
              </Button>
            </div>

            {/* Search Bar & Tab-Specific Sort Options */}
            {activeTab !== 'maintenance' && (
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <Input
                    placeholder={`Search ${activeTab} items by name or brand...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-zinc-900 border-zinc-800 text-sm font-sans"
                  />
                </div>

                {/* Sort Dropdown matching IAC Modal */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <SlidersHorizontal className="h-4 w-4 text-amber-400" />
                  <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">SORT:</span>
                  {(activeTab === 'exterior' || activeTab === 'interior') && (
                    <select
                      value={chemSortBy}
                      onChange={(e) => setChemSortBy(e.target.value)}
                      className="h-9 rounded-md border border-zinc-800 bg-zinc-900 text-xs text-amber-300 font-bold px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="brand_asc">By Brand (All)</option>
                      <option value="name_asc">A-Z List</option>
                      <option value="low_threshold">Low Threshold</option>
                      <option value="missing_cost">⚠️ Missing Cost</option>
                      <option value="last_updated">Last Updated</option>
                      {uniqueBrands.length > 0 && (
                        <optgroup label="Jump to Brand">
                          {uniqueBrands.map(b => (
                            <option key={b} value={`jump_brand:${b}`}>{b}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  )}

                  {activeTab === 'supplies' && (
                    <select
                      value={matSortBy}
                      onChange={(e) => setMatSortBy(e.target.value)}
                      className="h-9 rounded-md border border-zinc-800 bg-zinc-900 text-xs text-emerald-300 font-bold px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="last_updated">Last Updated</option>
                      <option value="name_asc">A-Z Name</option>
                      <option value="category">Category</option>
                      <option value="low_threshold">Low Threshold</option>
                      <option value="missing_cost">⚠️ Missing Cost</option>
                      {uniqueMatVendors.length > 0 && (
                        <optgroup label="Jump to Vendor">
                          {uniqueMatVendors.map(v => (
                            <option key={v} value={`vendor:${v}`}>{v}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  )}

                  {activeTab === 'tools' && (
                    <select
                      value={toolSortBy}
                      onChange={(e) => setToolSortBy(e.target.value)}
                      className="h-9 rounded-md border border-zinc-800 bg-zinc-900 text-xs text-purple-300 font-bold px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="last_updated">Last Updated</option>
                      <option value="name_asc">A-Z Name</option>
                      <option value="purchase_date">Purchase Date</option>
                      <option value="low_threshold">Low Threshold</option>
                      <option value="missing_cost">⚠️ Missing Cost</option>
                      {uniqueToolVendors.length > 0 && (
                        <optgroup label="Jump to Vendor">
                          {uniqueToolVendors.map(v => (
                            <option key={v} value={`vendor:${v}`}>{v}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  )}
                </div>
              </div>
            )}

            {/* Inventory Grid Picker */}
            {activeTab !== 'maintenance' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-2 bg-zinc-900/40 border border-zinc-800/80 rounded-xl">
                {activeTab === 'exterior' && filteredChemicalsExterior.map(c => {
                  const isLogged = localChemRows.some(r => r.chemicalId === c.id);
                  const isBoth = (c.category || c.shelf || '').toLowerCase().includes('both');
                  return (
                    <div key={`ext-${c.id}`} className="flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-blue-500/50 transition-colors">
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold truncate text-white flex items-center gap-1.5">
                          <span>{c.name}</span>
                          {isBoth && <Badge variant="outline" className="text-[9px] bg-purple-500/20 text-purple-300 border-purple-500/30 px-1 py-0">BOTH</Badge>}
                        </div>
                        <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                          <span>{c.brand || 'No Brand'}</span>
                          <span>•</span>
                          <span className="text-blue-400 font-mono">{c.bottleSize || '32 oz'}</span>
                          <span>•</span>
                          <span className="text-zinc-500 font-mono">{c.currentStock} stock</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={isLogged ? "ghost" : "outline"}
                        className={isLogged ? "h-7 text-[10px] bg-blue-500/20 text-blue-300 border-blue-500/30" : "h-7 text-[10px] bg-blue-600 hover:bg-blue-500 text-white"}
                        onClick={() => handleSelectChemical(c)}
                        disabled={isLogged}
                      >
                        {isLogged ? <Check className="h-3 w-3 mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                        {isLogged ? 'Added' : 'Add'}
                      </Button>
                    </div>
                  );
                })}

                {activeTab === 'interior' && filteredChemicalsInterior.map(c => {
                  const isLogged = localChemRows.some(r => r.chemicalId === c.id);
                  const isBoth = (c.category || c.shelf || '').toLowerCase().includes('both');
                  return (
                    <div key={`int-${c.id}`} className="flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-amber-500/50 transition-colors">
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold truncate text-white flex items-center gap-1.5">
                          <span>{c.name}</span>
                          {isBoth && <Badge variant="outline" className="text-[9px] bg-purple-500/20 text-purple-300 border-purple-500/30 px-1 py-0">BOTH</Badge>}
                        </div>
                        <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                          <span>{c.brand || 'No Brand'}</span>
                          <span>•</span>
                          <span className="text-amber-400 font-mono">{c.bottleSize || '24 oz'}</span>
                          <span>•</span>
                          <span className="text-zinc-500 font-mono">{c.currentStock} stock</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={isLogged ? "ghost" : "outline"}
                        className={isLogged ? "h-7 text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/30" : "h-7 text-[10px] bg-amber-600 hover:bg-amber-500 text-white"}
                        onClick={() => handleSelectChemical(c)}
                        disabled={isLogged}
                      >
                        {isLogged ? <Check className="h-3 w-3 mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                        {isLogged ? 'Added' : 'Add'}
                      </Button>
                    </div>
                  );
                })}

                {activeTab === 'supplies' && filteredMaterials.map(m => {
                  const isLogged = localMatRows.some(r => r.materialId === m.id);
                  return (
                    <div key={m.id} className="flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-emerald-500/50 transition-colors">
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold truncate text-white">{m.name}</div>
                        <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                          <span>{m.category || 'General'}</span>
                          <span>•</span>
                          <span className="text-zinc-500 font-mono">{m.quantity} on hand</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={isLogged ? "ghost" : "outline"}
                        className={isLogged ? "h-7 text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "h-7 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white"}
                        onClick={() => handleSelectMaterial(m)}
                        disabled={isLogged}
                      >
                        {isLogged ? <Check className="h-3 w-3 mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                        {isLogged ? 'Added' : 'Add'}
                      </Button>
                    </div>
                  );
                })}

                {activeTab === 'tools' && filteredTools.map(t => {
                  const isLogged = localToolRows.some(r => r.toolId === t.id);
                  return (
                    <div key={t.id} className="flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-purple-500/50 transition-colors">
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold truncate text-white">{t.name}</div>
                      </div>
                      <Button
                        size="sm"
                        variant={isLogged ? "ghost" : "outline"}
                        className={isLogged ? "h-7 text-[10px] bg-purple-500/20 text-purple-300 border-purple-500/30" : "h-7 text-[10px] bg-purple-600 hover:bg-purple-500 text-white"}
                        onClick={() => handleSelectTool(t)}
                        disabled={isLogged}
                      >
                        {isLogged ? <Check className="h-3 w-3 mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                        {isLogged ? 'Added' : 'Add'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Dedicated Equipment Maintenance Tab (Requirement F) */}
            {activeTab === 'maintenance' && (
              <div className="p-4 bg-zinc-900 border border-amber-500/30 rounded-xl space-y-6">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                  <Flame className="h-5 w-5 text-amber-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Predator Gas Generator & Equipment Maintenance Log</h4>
                    <p className="text-[11px] text-zinc-400">Record weekly gas level and service history notes for reports.</p>
                  </div>
                </div>

                {/* Predator Generator Section */}
                <div className="p-3.5 bg-zinc-950/80 border border-amber-500/20 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-amber-300 flex items-center gap-1.5">
                      ⚡ Predator Gas Generator
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-300 border-amber-500/30">
                      Primary Power
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-zinc-400 font-bold">Gas Tank Level (IAC Report)</Label>
                      <select
                        value={genLog.gasLevel || 'Full'}
                        onChange={(e) => updateEquipLog(predatorGenerator.id, predatorGenerator.name, { gasLevel: e.target.value })}
                        className="flex h-8 w-full rounded-md border border-zinc-700 bg-zinc-900 text-xs text-white px-2 py-1"
                      >
                        <option value="Full">Full (1/1 Tank)</option>
                        <option value="3/4">3/4 Tank</option>
                        <option value="1/2">1/2 Tank</option>
                        <option value="1/4">1/4 Tank</option>
                        <option value="Low/Empty">Low / Empty (Refill Needed)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-zinc-400 font-bold">Last Fill-up Date</Label>
                      <Input
                        type="date"
                        value={genLog.lastFillUpDate || ''}
                        onChange={(e) => updateEquipLog(predatorGenerator.id, predatorGenerator.name, { lastFillUpDate: e.target.value })}
                        className="h-8 bg-zinc-900 border-zinc-700 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-zinc-400 font-bold">Last Oil Change</Label>
                      <Input
                        type="date"
                        value={genLog.lastOilChange || ''}
                        onChange={(e) => updateEquipLog(predatorGenerator.id, predatorGenerator.name, { lastOilChange: e.target.value })}
                        className="h-8 bg-zinc-900 border-zinc-700 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-zinc-400 font-bold">Last Air Filter Change</Label>
                      <Input
                        type="date"
                        value={genLog.lastAirFilterChange || ''}
                        onChange={(e) => updateEquipLog(predatorGenerator.id, predatorGenerator.name, { lastAirFilterChange: e.target.value })}
                        className="h-8 bg-zinc-900 border-zinc-700 text-xs text-white"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-[11px] text-zinc-400 font-bold">Winter Storage / Maintenance Notes</Label>
                      <Input
                        placeholder="e.g. Fuel stabilizer added, oil capacity checked, stored clean..."
                        value={genLog.winterStorageNotes || ''}
                        onChange={(e) => updateEquipLog(predatorGenerator.id, predatorGenerator.name, { winterStorageNotes: e.target.value })}
                        className="h-8 bg-zinc-900 border-zinc-700 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Pressure Washer & Compressor Section */}
                <div className="p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-lg space-y-3">
                  <span className="font-bold text-xs text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <WrenchIcon className="h-4 w-4 text-purple-400" />
                    Other Rig Equipment (Pressure Washer, Compressors, Reels/Hoses)
                  </span>

                  {tools.filter(t => !t.name.toLowerCase().includes('generator')).slice(0, 4).map(t => {
                    const l = getEquipLog(t.id);
                    return (
                      <div key={t.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center p-2.5 bg-zinc-900 rounded-md border border-zinc-800">
                        <div className="sm:col-span-4 font-bold text-xs text-white truncate">{t.name}</div>
                        <div className="sm:col-span-3">
                          <Input
                            type="date"
                            placeholder="Last Service Date"
                            value={l.lastServiceDate || ''}
                            onChange={(e) => updateEquipLog(t.id, t.name, { lastServiceDate: e.target.value })}
                            className="h-7 bg-zinc-950 border-zinc-700 text-[11px] text-white"
                          />
                        </div>
                        <div className="sm:col-span-5">
                          <Input
                            placeholder="Condition notes (e.g. Good, quick connects lubricated)"
                            value={l.conditionNotes || ''}
                            onChange={(e) => updateEquipLog(t.id, t.name, { conditionNotes: e.target.value })}
                            className="h-7 bg-zinc-950 border-zinc-700 text-[11px] text-white"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Logged Usage Summary for Job Report */}
          <div className="space-y-4 pt-4 border-t border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
              <span>Logged Job Usage Items ({localChemRows.length + localMatRows.length + localToolRows.length})</span>
              <span className="text-[10px] font-normal text-amber-400 font-mono">1/8 oz Granular Precision</span>
            </h3>

            {localChemRows.length === 0 && localMatRows.length === 0 && localToolRows.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
                No items added to job usage report yet. Select items from Exterior, Interior, or Supplies tabs above.
              </div>
            ) : (
              <div className="space-y-3">
                {/* Chemical Usage Rows */}
                {localChemRows.map((row, idx) => {
                  const chemObj = chemicals.find(c => c.id === row.chemicalId);
                  const concDeducted = calculateConcentrateOz(row.amountUsedOz, row.ratioParts);
                  const bOz = row.bottleSizeOz > 0 ? row.bottleSizeOz : 32;

                  return (
                    <div key={row.id} className="p-3.5 bg-zinc-900/80 border border-blue-500/30 rounded-xl space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-blue-400" />
                          <span className="font-bold text-sm text-white">{row.chemicalName}</span>
                          <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-300 border-blue-500/30">
                            {row.category.toUpperCase()} • {bOz} oz bottle
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => setLocalChemRows(prev => prev.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-zinc-950/60 p-3 rounded-lg border border-zinc-800">
                        {/* Amount Used Input with 1/8 Increments */}
                        <div className="sm:col-span-5 space-y-1">
                          <Label className="text-[11px] text-zinc-400 font-bold">Amount Used (Granular oz)</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.125"
                              min="0"
                              value={row.amountUsedOz}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setLocalChemRows(prev => {
                                  const next = [...prev];
                                  next[idx] = {
                                    ...next[idx],
                                    amountUsedOz: val,
                                    concentrateDeductedOz: calculateConcentrateOz(val, next[idx].ratioParts),
                                  };
                                  return next;
                                });
                              }}
                              className="h-8 bg-zinc-900 border-zinc-700 text-xs font-mono font-bold text-blue-300 pr-8"
                            />
                            <span className="absolute right-2.5 top-2 text-[10px] font-mono text-zinc-500">oz</span>
                          </div>
                          {/* 1/8 Increment Quick Adjustment Buttons (Requirement E) */}
                          <div className="flex flex-wrap gap-1 pt-1">
                            {[
                              { label: '+1/8oz', val: 0.125 },
                              { label: '+1/4oz', val: 0.25 },
                              { label: '+1/2oz', val: 0.5 },
                              { label: '+1oz', val: 1.0 },
                              { label: '+2oz', val: 2.0 },
                              { label: '+4oz', val: 4.0 },
                            ].map(inc => (
                              <button
                                key={inc.label}
                                type="button"
                                className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:bg-blue-600 hover:text-white transition-colors font-mono"
                                onClick={() => {
                                  setLocalChemRows(prev => {
                                    const next = [...prev];
                                    const val = Math.round((next[idx].amountUsedOz + inc.val) * 1000) / 1000;
                                    next[idx] = {
                                      ...next[idx],
                                      amountUsedOz: val,
                                      concentrateDeductedOz: calculateConcentrateOz(val, next[idx].ratioParts),
                                    };
                                    return next;
                                  });
                                }}
                              >
                                {inc.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Dilution Ratio Selector */}
                        <div className="sm:col-span-4 space-y-1">
                          <Label className="text-[11px] text-zinc-400 font-bold">Dilution Ratio</Label>
                          <select
                            value={row.dilutionRatioStr}
                            onChange={(e) => {
                              const ratioStr = e.target.value;
                              let p = 0;
                              const match = ratioStr.match(/(\d+):1/);
                              if (match) p = parseInt(match[1]);
                              setLocalChemRows(prev => {
                                const next = [...prev];
                                next[idx] = {
                                  ...next[idx],
                                  dilutionRatioStr: ratioStr,
                                  ratioParts: p,
                                  concentrateDeductedOz: calculateConcentrateOz(next[idx].amountUsedOz, p),
                                };
                                return next;
                              });
                            }}
                            className="flex h-8 w-full rounded-md border border-zinc-700 bg-zinc-900 text-xs text-white px-2 py-1"
                          >
                            <option value="RTU">RTU / Ready-to-Use (1:1)</option>
                            <option value="4:1">4:1 (Heavy Duty)</option>
                            <option value="10:1">10:1 (Medium Duty)</option>
                            <option value="20:1">20:1 (Light Duty)</option>
                            <option value="256:1">256:1 (Rinseless Wash)</option>
                            {chemObj?.dilutionRatios?.map(r => (
                              <option key={r.ratio} value={r.ratio}>{r.ratio} ({r.notes || 'Custom'})</option>
                            ))}
                          </select>
                        </div>

                        {/* Concentrate Calculated Report Output */}
                        <div className="sm:col-span-3 text-right space-y-0.5">
                          <div className="text-[10px] text-zinc-400">Concentrate Reported:</div>
                          <div className="text-xs font-mono font-bold text-amber-400">{concDeducted.toFixed(3)} oz</div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Supply Rows */}
                {localMatRows.map((row, idx) => (
                  <div key={row.id} className="p-3.5 bg-zinc-900/80 border border-emerald-500/30 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        <span className="font-bold text-sm text-white">{row.materialName}</span>
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                          SUPPLY REPORT LOG
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => setLocalMatRows(prev => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                      </Button>
                    </div>

                    <div className="flex items-center justify-between bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800">
                      <div className="flex items-center gap-3">
                        <Label className="text-xs text-zinc-400 font-bold">Qty Logged for Job:</Label>
                        <Input
                          type="number"
                          min="1"
                          value={row.quantityUsed}
                          onChange={(e) => {
                            const q = parseInt(e.target.value) || 0;
                            setLocalMatRows(prev => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], quantityUsed: q };
                              return next;
                            });
                          }}
                          className="h-8 w-20 bg-zinc-900 border-zinc-700 text-xs font-mono font-bold text-emerald-300"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <div className="text-xs text-zinc-400 flex items-center gap-1.5">
            <Info className="h-4 w-4 text-blue-400" />
            <span>Saves usage to job report. Does not alter IAC inventory levels.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="border-zinc-800 text-zinc-400 hover:text-white">
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4"
              onClick={handleSaveReportOnly}
            >
              Save Materials Usage Log
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
