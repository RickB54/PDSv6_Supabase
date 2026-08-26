import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Trash2, AlertTriangle, Check, Droplets, Package, Wrench, Sparkles } from 'lucide-react';
import { Chemical, Material, Tool as Equipment } from '@/lib/inventory-data';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface LoggedChemicalUsage {
  id: string; // unique row id
  chemicalId: string;
  chemicalName: string;
  category: 'exterior' | 'interior' | 'other';
  amountUsedOz: number;
  dilutionRatioStr: string; // e.g. "4:1", "10:1", "RTU"
  ratioParts: number; // e.g. 4 for 4:1, 0 for RTU
  concentrateDeductedOz: number;
  bottleSizeOz: number;
  currentStock: number;
  isStockClamped?: boolean;
  notes?: string;
  deducted?: boolean;
}

export interface LoggedMaterialUsage {
  id: string; // unique row id
  materialId: string;
  materialName: string;
  quantityUsed: number;
  currentStock: number;
  isStockClamped?: boolean;
  notes?: string;
  deducted?: boolean;
}

export interface LoggedToolUsage {
  id: string;
  toolId: string;
  toolName: string;
  notes?: string;
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
  onSaveRows: (chemRows: LoggedChemicalUsage[], matRows: LoggedMaterialUsage[], toolRows: LoggedToolUsage[]) => void;
  onDeductComplete?: () => void;
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
  onSaveRows,
  onDeductComplete,
}: MaterialInventoryPickerModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'exterior' | 'interior' | 'supplies' | 'tools'>('exterior');
  const [searchQuery, setSearchQuery] = useState('');
  const [localChemRows, setLocalChemRows] = useState<LoggedChemicalUsage[]>(chemRows);
  const [localMatRows, setLocalMatRows] = useState<LoggedMaterialUsage[]>(matRows);
  const [localToolRows, setLocalToolRows] = useState<LoggedToolUsage[]>(toolRows);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when modal opens
  React.useEffect(() => {
    if (open) {
      setLocalChemRows(chemRows);
      setLocalMatRows(matRows);
      setLocalToolRows(toolRows);
    }
  }, [open, chemRows, matRows, toolRows]);

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

  // Helper to calculate concentrate oz deducted
  const calculateConcentrateOz = (amountOz: number, ratioParts: number): number => {
    if (ratioParts <= 0) return amountOz;
    return amountOz / (ratioParts + 1);
  };

  // Add chemical to logged list
  const handleSelectChemical = (chem: Chemical) => {
    if (localChemRows.some(r => r.chemicalId === chem.id)) {
      toast({ title: 'Already Added', description: `${chem.name} is already in your logged list.` });
      return;
    }
    const categoryName = (chem.category || chem.shelf || '').toLowerCase();
    const cat: 'exterior' | 'interior' | 'other' = categoryName.includes('interior') ? 'interior' : 'exterior';
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
      deducted: false
    };

    setLocalChemRows(prev => [...prev, newRow]);
    toast({ title: 'Chemical Added', description: `Added ${chem.name} to usage log.` });
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
      deducted: false
    };
    setLocalMatRows(prev => [...prev, newRow]);
    toast({ title: 'Supply Added', description: `Added ${mat.name} to usage log.` });
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

  // Filtered inventory lists
  const filteredChemicalsExterior = useMemo(() => {
    return chemicals.filter(c => {
      const cat = (c.category || c.shelf || c.section || '').toLowerCase();
      const isExt = !cat.includes('interior');
      if (!isExt) return false;
      if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase()) && !(c.brand && c.brand.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
      return true;
    });
  }, [chemicals, searchQuery]);

  const filteredChemicalsInterior = useMemo(() => {
    return chemicals.filter(c => {
      const cat = (c.category || c.shelf || c.section || '').toLowerCase();
      const isInt = cat.includes('interior');
      if (!isInt) return false;
      if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase()) && !(c.brand && c.brand.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
      return true;
    });
  }, [chemicals, searchQuery]);

  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase()) && !(m.category && m.category.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
      return true;
    });
  }, [materials, searchQuery]);

  const filteredTools = useMemo(() => {
    return tools.filter(t => {
      if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [tools, searchQuery]);

  // Execute Database Deductions exactly once per save
  const handleSaveAndDeduct = async () => {
    setIsSaving(true);
    try {
      const nextChemRows = [...localChemRows];
      const nextMatRows = [...localMatRows];

      let totalDeductionsCount = 0;

      // 1. Process Chemical Deductions
      for (let i = 0; i < nextChemRows.length; i++) {
        const row = nextChemRows[i];
        if (row.deducted || row.amountUsedOz <= 0) continue;

        // Fetch fresh record from Supabase
        const { data: dbChem } = await supabase.from('chemicals').select('*').eq('id', row.chemicalId).single();
        const liveStock = dbChem ? (dbChem.current_stock || 0) : row.currentStock;
        const bOz = row.bottleSizeOz > 0 ? row.bottleSizeOz : 32;

        const currentOnHandOz = liveStock * bOz;
        const concDeductedOz = calculateConcentrateOz(row.amountUsedOz, row.ratioParts);
        let newOnHandOz = currentOnHandOz - concDeductedOz;

        let isClamped = false;
        if (newOnHandOz < 0) {
          newOnHandOz = 0;
          isClamped = true;
        }

        const rawNewStock = newOnHandOz / bOz;
        const finalStock = Math.round(rawNewStock * 100) / 100;

        // Write to Supabase
        const { error: updateErr } = await supabase
          .from('chemicals')
          .update({ current_stock: finalStock, updated_at: new Date().toISOString() })
          .eq('id', row.chemicalId);

        if (!updateErr) {
          nextChemRows[i] = {
            ...row,
            currentStock: finalStock,
            concentrateDeductedOz: concDeductedOz,
            isStockClamped: isClamped,
            deducted: true
          };
          totalDeductionsCount++;
        }
      }

      // 2. Process Material / Supply Deductions
      for (let i = 0; i < nextMatRows.length; i++) {
        const row = nextMatRows[i];
        if (row.deducted || row.quantityUsed <= 0) continue;

        const { data: dbMat } = await supabase.from('materials').select('*').eq('id', row.materialId).single();
        const liveStock = dbMat ? (dbMat.quantity || 0) : row.currentStock;

        let newQty = liveStock - row.quantityUsed;
        let isClamped = false;
        if (newQty < 0) {
          newQty = 0;
          isClamped = true;
        }

        const { error: updateErr } = await supabase
          .from('materials')
          .update({ quantity: newQty, updated_at: new Date().toISOString() })
          .eq('id', row.materialId);

        if (!updateErr) {
          nextMatRows[i] = {
            ...row,
            currentStock: newQty,
            isStockClamped: isClamped,
            deducted: true
          };
          totalDeductionsCount++;
        }
      }

      setLocalChemRows(nextChemRows);
      setLocalMatRows(nextMatRows);
      onSaveRows(nextChemRows, nextMatRows, localToolRows);

      if (totalDeductionsCount > 0) {
        toast({
          title: 'Inventory Depleted',
          description: `Successfully deducted usage for ${totalDeductionsCount} item(s) from Supabase inventory.`
        });
      } else {
        toast({ title: 'Saved', description: 'Materials usage log updated.' });
      }

      if (onDeductComplete) onDeductComplete();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error deducting inventory:', err);
      toast({ variant: 'destructive', title: 'Deduction Error', description: err.message || 'Failed to update inventory.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-zinc-950 text-white border-zinc-800 p-0 overflow-hidden">
        <DialogHeader className="p-4 md:p-6 border-b border-zinc-800 bg-zinc-900/60">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
            <Droplets className="h-6 w-6 text-blue-400" />
            Materials & Chemical Usage Picker
          </DialogTitle>
          <p className="text-xs text-zinc-400">
            Search inventory to log granular chemical usage (in oz) and supplies. On save, usage automatically depletes real stock.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Top Picker Controls & Search */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={activeTab === 'exterior' ? 'default' : 'outline'}
                className={activeTab === 'exterior' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'border-zinc-800 text-zinc-400'}
                onClick={() => setActiveTab('exterior')}
              >
                <Sparkles className="h-4 w-4 mr-1.5 text-blue-400" />
                Section 1: Exterior Chemicals ({filteredChemicalsExterior.length})
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'interior' ? 'default' : 'outline'}
                className={activeTab === 'interior' ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'border-zinc-800 text-zinc-400'}
                onClick={() => setActiveTab('interior')}
              >
                <Droplets className="h-4 w-4 mr-1.5 text-amber-400" />
                Section 2: Interior Chemicals ({filteredChemicalsInterior.length})
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'supplies' ? 'default' : 'outline'}
                className={activeTab === 'supplies' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'border-zinc-800 text-zinc-400'}
                onClick={() => setActiveTab('supplies')}
              >
                <Package className="h-4 w-4 mr-1.5 text-emerald-400" />
                Supplies & Consumables ({filteredMaterials.length})
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
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <Input
                placeholder={`Search ${activeTab} items by name or brand...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-zinc-900 border-zinc-800 text-sm font-sans"
              />
            </div>

            {/* IAC-style Inventory Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-2 bg-zinc-900/40 border border-zinc-800/80 rounded-xl">
              {activeTab === 'exterior' && filteredChemicalsExterior.map(c => {
                const isLogged = localChemRows.some(r => r.chemicalId === c.id);
                return (
                  <div key={c.id} className="flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-blue-500/50 transition-colors">
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold truncate text-white">{c.name}</div>
                      <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                        <span>{c.brand || 'No Brand'}</span>
                        <span>•</span>
                        <span className="text-blue-400 font-mono">{c.bottleSize || '32 oz'}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-mono">{c.currentStock} stock</span>
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
                return (
                  <div key={c.id} className="flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-amber-500/50 transition-colors">
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold truncate text-white">{c.name}</div>
                      <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                        <span>{c.brand || 'No Brand'}</span>
                        <span>•</span>
                        <span className="text-amber-400 font-mono">{c.bottleSize || '24 oz'}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-mono">{c.currentStock} stock</span>
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
                        <span className="text-emerald-400 font-mono">{m.quantity} on hand</span>
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
          </div>

          {/* Logged Items List for Current Job */}
          <div className="space-y-4 pt-4 border-t border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
              <span>Logged Job Usage Items ({localChemRows.length + localMatRows.length + localToolRows.length})</span>
              <span className="text-[10px] font-normal text-zinc-500">Fine-tune exact ounces used per chemical</span>
            </h3>

            {localChemRows.length === 0 && localMatRows.length === 0 && localToolRows.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
                No inventory items added to this job yet. Use the picker grid above to add chemicals or supplies.
              </div>
            ) : (
              <div className="space-y-3">
                {/* Chemical Usage Rows */}
                {localChemRows.map((row, idx) => {
                  const chemObj = chemicals.find(c => c.id === row.chemicalId);
                  const concDeducted = calculateConcentrateOz(row.amountUsedOz, row.ratioParts);
                  const bOz = row.bottleSizeOz > 0 ? row.bottleSizeOz : 32;
                  const currentOnHandOz = row.currentStock * bOz;
                  const projOnHandOz = Math.max(0, currentOnHandOz - concDeducted);
                  const projStock = Math.round((projOnHandOz / bOz) * 100) / 100;
                  const willClamp = (currentOnHandOz - concDeducted) < 0;

                  return (
                    <div key={row.id} className="p-3.5 bg-zinc-900/80 border border-blue-500/30 rounded-xl space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-blue-400" />
                          <span className="font-bold text-sm text-white">{row.chemicalName}</span>
                          <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-300 border-blue-500/30">
                            {row.category.toUpperCase()} • {bOz} oz bottle
                          </Badge>
                          {row.deducted && (
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
                              <Check className="h-3 w-3 mr-1" /> Deducted
                            </Badge>
                          )}
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
                        {/* Amount Used Input */}
                        <div className="sm:col-span-4 space-y-1">
                          <Label className="text-[11px] text-zinc-400 font-bold">Amount Used (Granular oz)</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.1"
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
                                    deducted: false
                                  };
                                  return next;
                                });
                              }}
                              className="h-8 bg-zinc-900 border-zinc-700 text-xs font-mono font-bold text-blue-300 pr-8"
                            />
                            <span className="absolute right-2.5 top-2 text-[10px] font-mono text-zinc-500">oz</span>
                          </div>
                          {/* Small Quick Increments */}
                          <div className="flex gap-1 pt-1">
                            {[1, 2, 4, 8].map(inc => (
                              <button
                                key={inc}
                                type="button"
                                className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:bg-blue-600 hover:text-white transition-colors"
                                onClick={() => {
                                  setLocalChemRows(prev => {
                                    const next = [...prev];
                                    const val = Math.round((next[idx].amountUsedOz + inc) * 10) / 10;
                                    next[idx] = {
                                      ...next[idx],
                                      amountUsedOz: val,
                                      concentrateDeductedOz: calculateConcentrateOz(val, next[idx].ratioParts),
                                      deducted: false
                                    };
                                    return next;
                                  });
                                }}
                              >
                                +{inc}oz
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
                                  deducted: false
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

                        {/* Projected Deduction Summary */}
                        <div className="sm:col-span-4 text-right space-y-0.5">
                          <div className="text-[10px] text-zinc-400">Concentrate Deducted:</div>
                          <div className="text-xs font-mono font-bold text-amber-400">{concDeducted.toFixed(2)} oz</div>
                          <div className="text-[10px] text-zinc-400">
                            New Stock: <span className="font-mono text-emerald-400 font-bold">{projStock}</span> (was {row.currentStock})
                          </div>
                        </div>
                      </div>

                      {/* Negative Stock Warning */}
                      {(willClamp || row.isStockClamped) && (
                        <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-amber-300 text-[11px] font-medium">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                          <span>Warning: Usage exceeds on-hand stock! Resulting inventory will be clamped at <strong>0.00 stock</strong>.</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Supply Rows */}
                {localMatRows.map((row, idx) => {
                  const projQty = Math.max(0, row.currentStock - row.quantityUsed);
                  const willClamp = (row.currentStock - row.quantityUsed) < 0;

                  return (
                    <div key={row.id} className="p-3.5 bg-zinc-900/80 border border-emerald-500/30 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          <span className="font-bold text-sm text-white">{row.materialName}</span>
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                            SUPPLY • {row.currentStock} on hand
                          </Badge>
                          {row.deducted && (
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
                              <Check className="h-3 w-3 mr-1" /> Deducted
                            </Badge>
                          )}
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
                          <Label className="text-xs text-zinc-400 font-bold">Qty Used:</Label>
                          <Input
                            type="number"
                            min="1"
                            value={row.quantityUsed}
                            onChange={(e) => {
                              const q = parseInt(e.target.value) || 0;
                              setLocalMatRows(prev => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], quantityUsed: q, deducted: false };
                                return next;
                              });
                            }}
                            className="h-8 w-20 bg-zinc-900 border-zinc-700 text-xs font-mono font-bold text-emerald-300"
                          />
                        </div>
                        <div className="text-xs text-zinc-400">
                          New Supply Stock: <span className="font-mono text-emerald-400 font-bold">{projQty}</span>
                        </div>
                      </div>

                      {willClamp && (
                        <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-amber-300 text-[11px]">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                          <span>Warning: Usage exceeds stock on hand! Quantity will clamp at <strong>0</strong>.</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <div className="text-xs text-zinc-500">
            Deductions fire immediately on save to update your Supabase inventory.
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="border-zinc-800 text-zinc-400 hover:text-white">
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4"
              onClick={handleSaveAndDeduct}
              disabled={isSaving}
            >
              {isSaving ? 'Updating Inventory...' : 'Save & Deduct Inventory'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
