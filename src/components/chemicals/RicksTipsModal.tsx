import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Save, Package, FlaskConical, Trash2, Plus, Info, Zap, Check, CheckSquare } from 'lucide-react';
import { servicePackages } from '@/lib/services';
import { getCombinedSelectableProducts } from '@/lib/chemicals';
import { toast } from 'sonner';

interface TipMapping {
  packageId: string;
  chemicalIds: string[];
  notes: string;
}

export default function RicksTipsModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [tips, setTips] = useState<TipMapping[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>(servicePackages[0]?.id || '');
  const [availableChemicals, setAvailableChemicals] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Load tips from local storage
    const saved = localStorage.getItem('ricks_chemical_tips');
    if (saved) {
      try {
        setTips(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse Rick's tips", e);
      }
    }

    // Load chemicals
    const loadChems = async () => {
      const chems = await getCombinedSelectableProducts();
      setAvailableChemicals(chems);
    };
    loadChems();
  }, [open]);

  const currentTip = tips.find(t => t.packageId === selectedPackageId) || { packageId: selectedPackageId, chemicalIds: [], notes: '' };

  const saveTips = (newTips: TipMapping[]) => {
    setTips(newTips);
    localStorage.setItem('ricks_chemical_tips', JSON.stringify(newTips));
  };

  const toggleChemical = (chemId: string) => {
    const existingIndex = tips.findIndex(t => t.packageId === selectedPackageId);
    let newTips = [...tips];

    if (existingIndex > -1) {
      const chemIndex = newTips[existingIndex].chemicalIds.indexOf(chemId);
      if (chemIndex > -1) {
        newTips[existingIndex].chemicalIds.splice(chemIndex, 1);
      } else {
        newTips[existingIndex].chemicalIds.push(chemId);
      }
    } else {
      newTips.push({ packageId: selectedPackageId, chemicalIds: [chemId], notes: '' });
    }
    saveTips(newTips);
  };

  const updateNotes = (notes: string) => {
    const existingIndex = tips.findIndex(t => t.packageId === selectedPackageId);
    let newTips = [...tips];
    if (existingIndex > -1) {
      newTips[existingIndex].notes = notes;
    } else {
      newTips.push({ packageId: selectedPackageId, chemicalIds: [], notes });
    }
    saveTips(newTips);
  };

  const filteredChemicals = availableChemicals.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.brand || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedChemicals = availableChemicals.filter(c => currentTip.chemicalIds.includes(c.id));

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    const isChecked = checked === true;
    const existingIndex = tips.findIndex(t => t.packageId === selectedPackageId);
    let newTips = [...tips];
    const filteredIds = filteredChemicals.map(c => c.id);

    if (existingIndex > -1) {
      if (isChecked) {
        const union = Array.from(new Set([...newTips[existingIndex].chemicalIds, ...filteredIds]));
        newTips[existingIndex].chemicalIds = union;
      } else {
        newTips[existingIndex].chemicalIds = newTips[existingIndex].chemicalIds.filter(id => !filteredIds.includes(id));
      }
    } else {
      if (isChecked) {
        newTips.push({ packageId: selectedPackageId, chemicalIds: filteredIds, notes: '' });
      }
    }
    saveTips(newTips);
  };

  const isAllSelected = filteredChemicals.length > 0 && filteredChemicals.every(c => currentTip.chemicalIds.includes(c.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-5xl h-[90vh] md:h-[85vh] bg-[#0c1220] border-slate-800 text-white flex flex-col p-0 overflow-hidden shadow-2xl rounded-2xl">
        <DialogHeader className="p-4 md:p-6 border-b border-slate-800/60 bg-[#0f1629] shrink-0">
          <div className="flex items-start md:items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/30 shrink-0">
              <FlaskConical className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <DialogTitle className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 text-left">
                Rick's Chemical Tips
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs md:text-sm text-left">
                Map specific chemicals and professional advice to your live service packages.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar: Packages Dropdown */}
          <div className="p-4 border-b border-slate-800/60 bg-black/40 shrink-0 z-10">
            <div className="max-w-xl mx-auto flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">Selected Service Package</label>
              <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                <SelectTrigger className="w-full bg-slate-900 border-slate-700 h-14 text-white focus:ring-purple-500/50">
                  <SelectValue placeholder="Select a Service Package" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white max-h-[40vh]">
                  {servicePackages.map(pkg => (
                    <SelectItem key={pkg.id} value={pkg.id} className="focus:bg-purple-500/20 focus:text-purple-100 py-3 cursor-pointer">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="font-semibold">{pkg.name}</span>
                        <span className="text-[10px] text-slate-400">
                          {tips.find(t => t.packageId === pkg.id)?.chemicalIds.length || 0} Chemicals assigned
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 bg-[#0f1629]/30 custom-scrollbar">
            {/* Notes Section */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-base md:text-lg font-bold flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-400" />
                  Professional Advice
                </h4>
                <Badge variant="outline" className="bg-blue-500/5 border-blue-500/20 text-blue-400 text-[9px] md:text-[10px] uppercase tracking-tighter">
                  Rick's Pro Tip
                </Badge>
              </div>
              <textarea
                value={currentTip.notes}
                onChange={(e) => updateNotes(e.target.value)}
                placeholder="Enter job-specific chemical advice here... (e.g., 'Use high alkaline soap if organic debris is heavy')"
                className="w-full h-28 md:h-32 bg-slate-900/80 border border-slate-700/50 rounded-xl p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all placeholder:text-slate-600 resize-none text-base md:text-lg leading-relaxed shadow-inner"
              />
            </section>

            {/* Chemical Assignment */}
            <section className="space-y-4 md:space-y-6 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h4 className="text-base md:text-lg font-bold flex items-center gap-2 shrink-0">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Recommended Chemicals
                </h4>
                <div className="flex flex-col min-[450px]:flex-row items-stretch min-[450px]:items-center gap-3 w-full sm:w-auto">
                   <div className="flex items-center justify-center gap-2 bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-800 hover:bg-slate-800 transition-colors">
                     <Checkbox id="select-all" checked={isAllSelected} onCheckedChange={handleSelectAll} />
                     <label htmlFor="select-all" className="text-xs font-medium text-slate-300 cursor-pointer">Select All Shown</label>
                   </div>
                  <div className="relative flex-1 sm:w-56 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search inventory..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900/80 border border-slate-700/50 rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Selected Chemicals Area */}
              {selectedChemicals.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 md:p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl min-h-[60px]">
                  {selectedChemicals.map(chem => (
                    <Badge key={chem.id} className="bg-purple-500/20 text-purple-200 border-purple-500/30 flex items-center gap-2 py-1.5 pl-3 pr-1 group shadow-sm transition-all hover:bg-purple-500/30">
                      <span className="font-semibold text-xs md:text-sm">{chem.name}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleChemical(chem.id); }}
                        className="p-1 hover:bg-purple-500/40 rounded-full transition-colors focus:outline-none"
                      >
                        <Trash2 className="w-3 h-3 text-purple-300" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Chemical Picker Grid - Compact Squares */}
              <div className="grid grid-cols-4 min-[400px]:grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 md:gap-4">
                {filteredChemicals.map(chem => {
                  const isSelected = currentTip.chemicalIds.includes(chem.id);
                  return (
                    <Popover key={chem.id}>
                      <PopoverTrigger asChild>
                        <button className={`relative aspect-square rounded-xl md:rounded-2xl border-2 transition-all overflow-hidden flex items-center justify-center bg-slate-900 focus:outline-none group ${
                          isSelected 
                            ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
                            : 'border-slate-800 hover:border-slate-600'
                        }`}>
                          {chem.primary_image_url ? (
                            <img src={chem.primary_image_url} alt={chem.name} className={`w-full h-full object-cover transition-transform group-hover:scale-110 ${!isSelected ? 'opacity-70 group-hover:opacity-100' : 'opacity-100'}`} />
                          ) : (
                            <FlaskConical className={`w-8 h-8 md:w-10 md:h-10 ${isSelected ? 'text-purple-400' : 'text-slate-600'}`} />
                          )}
                          
                          {/* Selection Indicator Overlay */}
                          {isSelected && (
                            <div className="absolute inset-0 bg-purple-500/10 flex items-start justify-end p-1.5 md:p-2 pointer-events-none">
                              <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center shadow-md">
                                <Check className="w-3 h-3 text-white" strokeWidth={3} />
                              </div>
                            </div>
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent sideOffset={8} className="w-64 bg-slate-900 border-slate-700 outline-none shadow-2xl p-4 flex flex-col gap-4 rounded-xl z-[100]">
                         <div className="flex gap-3 items-start">
                             <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-800 flex items-center justify-center border border-slate-700">
                                {chem.primary_image_url ? <img src={chem.primary_image_url} alt="" className="w-full h-full object-cover" /> : <FlaskConical className="w-6 h-6 text-slate-500" />}
                             </div>
                             <div className="min-w-0">
                                 <h4 className="text-sm font-bold text-white leading-tight mb-1">{chem.name}</h4>
                                 <p className="text-[10px] text-slate-400 uppercase tracking-wider truncate">{chem.brand || 'No Brand'}</p>
                             </div>
                         </div>
                         <button 
                           onClick={() => toggleChemical(chem.id)}
                           className={`w-full py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-all ${
                             isSelected 
                               ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20' 
                               : 'bg-purple-500 text-white hover:bg-purple-600 shadow-lg shadow-purple-500/20'
                           }`}
                         >
                            {isSelected ? (
                              <>
                                <Trash2 className="w-4 h-4" />
                                Remove from Package
                              </>
                            ) : (
                              <>
                                <CheckSquare className="w-4 h-4" />
                                Select Component
                              </>
                            )}
                         </button>
                      </PopoverContent>
                    </Popover>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
