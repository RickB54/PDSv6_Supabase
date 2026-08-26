import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  BookOpen, 
  Plus, 
  Pencil, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  Lightbulb, 
  Beaker, 
  Wrench, 
  Search,
  RotateCcw
} from 'lucide-react';
import { sopService, MasterSOPItem, SOPCategory } from '@/lib/sop-service';
import { SOPTooltip } from '@/components/SOPTooltip';

export interface SOPEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MasterSOPItem | null;
  defaultCategory?: SOPCategory;
  onSaveSuccess?: () => void;
}

export const SOPEditModal: React.FC<SOPEditModalProps> = ({
  open,
  onOpenChange,
  item,
  defaultCategory = 'exterior',
  onSaveSuccess
}) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const [formCategory, setFormCategory] = useState<SOPCategory>(defaultCategory);
  const [formCode, setFormCode] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formStepNumber, setFormStepNumber] = useState<number>(1);
  const [formShortSummary, setFormShortSummary] = useState('');
  const [formDetailedInstructions, setFormDetailedInstructions] = useState('');
  const [formRicksTips, setFormRicksTips] = useState('');
  const [formDilutionRatio, setFormDilutionRatio] = useState('RTU');
  const [formTools, setFormTools] = useState('');
  const [formChemicalIds, setFormChemicalIds] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  useEffect(() => {
    if (open) {
      if (item) {
        setFormCategory(item.category);
        setFormCode(item.code);
        setFormTitle(item.title);
        setFormStepNumber(item.stepNumber);
        setFormShortSummary(item.shortSummary || '');
        setFormDetailedInstructions(item.detailedInstructions || '');
        setFormRicksTips(item.ricksTips || '');
        setFormDilutionRatio(item.dilutionRatio || 'RTU');
        setFormTools(item.tools ? item.tools.join(', ') : '');
        setFormChemicalIds(item.chemicalIds ? item.chemicalIds.join(', ') : '');
        setFormIsActive(item.isActive !== false);
      } else {
        setFormCategory(defaultCategory);
        setFormCode('');
        setFormTitle('');
        setFormStepNumber(1);
        setFormShortSummary('');
        setFormDetailedInstructions('');
        setFormRicksTips('');
        setFormDilutionRatio('RTU');
        setFormTools('');
        setFormChemicalIds('');
        setFormIsActive(true);
      }
    }
  }, [open, item, defaultCategory]);

  const handleSaveForm = async () => {
    if (!formTitle.trim()) {
      toast({ title: 'Validation Error', description: 'Please enter a step title.', variant: 'destructive' });
      return;
    }
    if (!formDetailedInstructions.trim()) {
      toast({ title: 'Validation Error', description: 'Please enter detailed instructions.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const currentSOPs = await sopService.getMasterSOPs();
      const toolsArray = formTools ? formTools.split(',').map(s => s.trim()).filter(Boolean) : [];
      const chemicalsArray = formChemicalIds ? formChemicalIds.split(',').map(s => s.trim()).filter(Boolean) : [];

      let updatedList: MasterSOPItem[];

      if (item) {
        // Update existing item
        updatedList = currentSOPs.map(s => {
          if (s.id === item.id) {
            return {
              ...s,
              category: formCategory,
              code: formCode.trim().toUpperCase() || s.code,
              title: formTitle.trim(),
              stepNumber: formStepNumber,
              shortSummary: formShortSummary.trim(),
              detailedInstructions: formDetailedInstructions.trim(),
              ricksTips: formRicksTips.trim(),
              dilutionRatio: formDilutionRatio.trim(),
              tools: toolsArray,
              chemicalIds: chemicalsArray,
              isActive: formIsActive,
              updatedAt: new Date().toISOString()
            };
          }
          return s;
        });
      } else {
        // Create new item
        const categorySOPs = currentSOPs.filter(s => s.category === formCategory);
        const nextStep = formStepNumber || (categorySOPs.length + 1);
        const prefix = formCategory === 'exterior' ? 'EXT' : formCategory === 'interior' ? 'INT' : formCategory === 'preparation' ? 'PREP' : 'SOP';
        const code = formCode.trim().toUpperCase() || `${prefix}-${nextStep < 10 ? '0' + nextStep : nextStep}`;
        const newId = `${formCategory.substring(0, 3)}-${Date.now()}`;

        const newItem: MasterSOPItem = {
          id: newId,
          category: formCategory,
          code: code,
          title: formTitle.trim(),
          stepNumber: nextStep,
          shortSummary: formShortSummary.trim(),
          detailedInstructions: formDetailedInstructions.trim(),
          ricksTips: formRicksTips.trim(),
          dilutionRatio: formDilutionRatio.trim(),
          tools: toolsArray,
          chemicalIds: chemicalsArray,
          isActive: formIsActive,
          updatedAt: new Date().toISOString()
        };
        updatedList = [...currentSOPs, newItem];
      }

      const success = await sopService.saveMasterSOPs(updatedList);
      if (success) {
        onOpenChange(false);
        if (onSaveSuccess) onSaveSuccess();
        toast({
          title: item ? 'SOP Step Updated' : 'New SOP Step Created',
          description: `Saved directly to database single source of truth.`
        });
      } else {
        toast({ title: 'Save Failed', description: 'Could not update Supabase meta record.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error Saving SOP', description: err?.message || 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-950 border-purple-500/30 text-white shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Pencil className="h-5 w-5 text-purple-400" />
            {item ? `Edit Master SOP Step (${item.code})` : 'Create Master SOP Step'}
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs">
            Configure SOP procedural details, dilution ratios, tools, and Rick's Tips. Changes save directly to `master_sops_v1` single source of truth.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-zinc-400">Category</Label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as SOPCategory)}
                className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 text-white px-3 py-1 text-xs focus:ring-1 focus:ring-purple-500 mt-1"
              >
                <option value="exterior">Exterior</option>
                <option value="interior">Interior</option>
                <option value="preparation">Preparation</option>
                <option value="final">Final Inspection</option>
                <option value="safety">Safety</option>
              </select>
            </div>

            <div>
              <Label className="text-xs text-zinc-400">SOP Code</Label>
              <Input 
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="e.g. EXT-01"
                className="h-9 bg-zinc-900 border-zinc-800 text-white text-xs mt-1 font-mono uppercase"
              />
            </div>

            <div>
              <Label className="text-xs text-zinc-400">Step Number</Label>
              <Input 
                type="number"
                value={formStepNumber}
                onChange={(e) => setFormStepNumber(parseInt(e.target.value) || 1)}
                className="h-9 bg-zinc-900 border-zinc-800 text-white text-xs mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-zinc-400">Step Title *</Label>
            <Input 
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Wheels, Tires & Wheel Wells"
              className="h-9 bg-zinc-900 border-zinc-800 text-white text-xs mt-1 font-bold"
            />
          </div>

          <div>
            <Label className="text-xs text-zinc-400">Short Summary (Subheader)</Label>
            <Input 
              value={formShortSummary}
              onChange={(e) => setFormShortSummary(e.target.value)}
              placeholder="e.g. Clean wheels, tires, and wheel wells before touching paint."
              className="h-9 bg-zinc-900 border-zinc-800 text-white text-xs mt-1"
            />
          </div>

          <div>
            <Label className="text-xs text-zinc-400">Detailed Standard Instructions *</Label>
            <Textarea 
              value={formDetailedInstructions}
              onChange={(e) => setFormDetailedInstructions(e.target.value)}
              placeholder="Provide complete step-by-step standard operating instructions..."
              className="min-h-[120px] bg-zinc-900 border-zinc-800 text-white text-xs mt-1 leading-relaxed"
            />
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl space-y-2">
            <Label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4" /> Rick's Pro Tip (Expert Guidance)
            </Label>
            <Textarea 
              value={formRicksTips}
              onChange={(e) => setFormRicksTips(e.target.value)}
              placeholder="e.g. Work on one wheel at a time. Never let wheel cleaner dry on hot rims."
              className="min-h-[70px] bg-zinc-950 border-amber-500/20 text-amber-200 text-xs leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-zinc-400">Dilution Ratio</Label>
              <Input 
                value={formDilutionRatio}
                onChange={(e) => setFormDilutionRatio(e.target.value)}
                placeholder="e.g. 4:1, 10:1, RTU, N/A"
                className="h-9 bg-zinc-900 border-zinc-800 text-white text-xs mt-1 font-semibold"
              />
            </div>

            <div>
              <Label className="text-xs text-zinc-400">Required Tools (Comma-separated)</Label>
              <Input 
                value={formTools}
                onChange={(e) => setFormTools(e.target.value)}
                placeholder="e.g. Wheel Brush, Tire Scrub Brush, Pressure Washer"
                className="h-9 bg-zinc-900 border-zinc-800 text-white text-xs mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-zinc-400">Associated Chemical IDs (Comma-separated)</Label>
            <Input 
              value={formChemicalIds}
              onChange={(e) => setFormChemicalIds(e.target.value)}
              placeholder="e.g. brake-buster, all-purpose-cleaner"
              className="h-9 bg-zinc-900 border-zinc-800 text-white text-xs mt-1"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <div className="flex items-center gap-2">
              <Switch 
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
                id="sop-active-switch"
              />
              <Label htmlFor="sop-active-switch" className="text-xs text-zinc-300 cursor-pointer">
                Active SOP Step
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="border-zinc-800 text-zinc-400 hover:text-white text-xs"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveForm}
            disabled={isSaving}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
          >
            <Save className="h-4 w-4 mr-1.5" />
            {isSaving ? 'Saving to Database...' : 'Save SOP Step'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const MasterSOPEditor: React.FC = () => {
  const { toast } = useToast();
  const [sops, setSops] = useState<MasterSOPItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterSOPItem | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MasterSOPItem | null>(null);

  const loadSOPs = async () => {
    const data = await sopService.getMasterSOPs();
    setSops([...data]);
  };

  useEffect(() => {
    loadSOPs();
    const handleUpdate = () => loadSOPs();
    window.addEventListener('master-sops-updated', handleUpdate);
    return () => window.removeEventListener('master-sops-updated', handleUpdate);
  }, []);

  const openCreateDialog = (category: SOPCategory = 'exterior') => {
    setEditingItem(null);
    setEditDialogOpen(true);
  };

  const openEditDialog = (item: MasterSOPItem) => {
    setEditingItem(item);
    setEditDialogOpen(true);
  };

  const handleMoveStep = async (item: MasterSOPItem, direction: 'up' | 'down') => {
    const categorySOPs = sops.filter(s => s.category === item.category).sort((a, b) => a.stepNumber - b.stepNumber);
    const currentIndex = categorySOPs.findIndex(s => s.id === item.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= categorySOPs.length) return;

    const targetItem = categorySOPs[targetIndex];
    const newSops = sops.map(s => {
      if (s.id === item.id) return { ...s, stepNumber: targetItem.stepNumber };
      if (s.id === targetItem.id) return { ...s, stepNumber: item.stepNumber };
      return s;
    });

    const success = await sopService.saveMasterSOPs(newSops);
    if (success) {
      setSops(newSops);
      toast({ title: 'Step Order Updated', description: `Moved ${item.code} ${direction}.` });
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    const updatedList = sops.filter(s => s.id !== itemToDelete.id);
    const success = await sopService.saveMasterSOPs(updatedList);
    if (success) {
      setSops(updatedList);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      toast({ title: 'SOP Step Deleted', description: `Removed ${itemToDelete.code} from catalog.` });
    } else {
      toast({ title: 'Deletion Failed', description: 'Could not update database.', variant: 'destructive' });
    }
  };

  const handleResetToDefaults = async () => {
    if (!confirm('Are you sure you want to reset all SOPs to the default factory catalog? Any custom steps will be overwritten.')) return;
    const { DEFAULT_MASTER_SOPS } = await import('@/lib/sop-service');
    const success = await sopService.saveMasterSOPs(DEFAULT_MASTER_SOPS);
    if (success) {
      setSops(DEFAULT_MASTER_SOPS);
      toast({ title: 'Catalog Reset', description: 'Restored factory default SOP definitions.' });
    }
  };

  const filteredSOPs = sops
    .filter(s => activeTab === 'all' || s.category === activeTab)
    .filter(s => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.code.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.shortSummary.toLowerCase().includes(q) ||
        s.detailedInstructions.toLowerCase().includes(q) ||
        (s.ricksTips && s.ricksTips.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.stepNumber - b.stepNumber;
    });

  const categoriesCount = {
    all: sops.length,
    exterior: sops.filter(s => s.category === 'exterior').length,
    interior: sops.filter(s => s.category === 'interior').length,
    preparation: sops.filter(s => s.category === 'preparation').length,
    final: sops.filter(s => s.category === 'final').length,
  };

  return (
    <Card className="bg-zinc-950 border-zinc-800 p-4 md:p-6 space-y-6 shadow-2xl rounded-2xl overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30">
              <BookOpen className="h-5 w-5" />
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase italic">
              Master SOP Catalog
            </h2>
            <Badge variant="outline" className="border-purple-500/40 text-purple-400 bg-purple-950/40 text-[10px] font-bold">
              Database Single Source of Truth
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 max-w-2xl">
            Edits here instantly propagate across Prime Training Center, Service Checklist, and all SOP Tooltips in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleResetToDefaults}
            className="bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white text-xs h-9"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reset Defaults
          </Button>
          <Button 
            onClick={() => openCreateDialog(activeTab !== 'all' ? (activeTab as SOPCategory) : 'exterior')}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs h-9 shadow-lg shadow-purple-950/50"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add SOP Step
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 bg-black/50 p-1.5 rounded-xl border border-zinc-800">
          {[
            { id: 'all', label: 'All SOPs' },
            { id: 'exterior', label: 'Exterior' },
            { id: 'interior', label: 'Interior' },
            { id: 'preparation', label: 'Prep' },
            { id: 'final', label: 'Final' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <span>{tab.label}</span>
              <Badge variant="secondary" className="bg-black/40 text-[9px] px-1.5 py-0 h-4 border-0 font-extrabold">
                {(categoriesCount as any)[tab.id] || 0}
              </Badge>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <Input 
            placeholder="Search SOP steps or tips..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-zinc-900 border-zinc-800 text-xs text-white placeholder:text-zinc-500"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filteredSOPs.length === 0 ? (
          <div className="text-center py-12 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
            <BookOpen className="h-10 w-10 text-zinc-600 mx-auto mb-3 animate-pulse" />
            <h3 className="text-zinc-300 font-bold text-sm">No SOP steps found</h3>
          </div>
        ) : (
          filteredSOPs.map((item, idx) => {
            const isFirst = idx === 0 || filteredSOPs[idx - 1]?.category !== item.category;
            const isLast = idx === filteredSOPs.length - 1 || filteredSOPs[idx + 1]?.category !== item.category;

            return (
              <div 
                key={item.id}
                className="p-4 rounded-xl border bg-zinc-900/70 border-zinc-800/80 hover:border-purple-500/40 transition-all duration-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex flex-col items-center justify-center shrink-0">
                      <Badge className="bg-purple-900/50 text-purple-300 border border-purple-500/30 font-black text-xs px-2 py-0.5">
                        {item.code}
                      </Badge>
                      <span className="text-[10px] text-zinc-500 font-bold mt-1">
                        Step {item.stepNumber}
                      </span>
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-white tracking-tight">{item.title}</h3>
                        {item.dilutionRatio && (
                          <Badge variant="outline" className="text-[9px] font-bold text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                            <Beaker className="h-3 w-3 mr-1" /> Ratio: {item.dilutionRatio}
                          </Badge>
                        )}
                        <SOPTooltip sopIdOrCode={item.id} variant="icon" />
                      </div>

                      {item.shortSummary && (
                        <p className="text-xs text-zinc-400 italic">"{item.shortSummary}"</p>
                      )}

                      <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed mt-1">
                        {item.detailedInstructions}
                      </p>

                      {item.ricksTips && (
                        <div className="mt-2 bg-amber-500/10 border border-amber-500/30 p-2 rounded-lg text-xs text-amber-200 flex items-start gap-1.5">
                          <Lightbulb className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <div className="line-clamp-2">
                            <strong className="text-amber-400 uppercase text-[10px]">Rick's Tip: </strong>
                            {item.ricksTips}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center justify-end gap-1.5 shrink-0">
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={isFirst}
                        onClick={() => handleMoveStep(item, 'up')}
                        className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={isLast}
                        onClick={() => handleMoveStep(item, 'down')}
                        className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(item)}
                        className="h-7 px-2 text-xs border-purple-500/30 text-purple-400 hover:bg-purple-500/10 font-bold"
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setItemToDelete(item);
                          setDeleteDialogOpen(true);
                        }}
                        className="h-7 w-7 text-zinc-500 hover:text-red-400 hover:bg-red-950/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <SOPEditModal 
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        item={editingItem}
        defaultCategory={activeTab !== 'all' ? (activeTab as SOPCategory) : 'exterior'}
        onSaveSuccess={loadSOPs}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-red-500/30 text-white shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-400 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Confirm SOP Step Deletion
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Are you sure you want to delete SOP Step <strong className="text-white">{itemToDelete?.code}</strong> ({itemToDelete?.title})? This will update the database source of truth.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              className="border-zinc-800 text-zinc-400 hover:text-white text-xs"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteItem}
              className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
