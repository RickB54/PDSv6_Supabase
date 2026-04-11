import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Save, Package, FlaskConical, Trash2, Plus, Info, Zap } from 'lucide-react';
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] bg-[#0c1220] border-slate-800 text-white flex flex-col p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 border-b border-slate-800/60 bg-[#0f1629]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/30">
              <FlaskConical className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                Rick's Chemical Tips
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Map specific chemicals and professional advice to your live service packages.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar: Packages */}
          <div className="w-72 border-r border-slate-800/60 bg-black/20 overflow-y-auto p-4 space-y-2">
            <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4 px-2">Service Packages</h3>
            {servicePackages.map(pkg => (
              <button
                key={pkg.id}
                onClick={() => setSelectedPackageId(pkg.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all border ${
                  selectedPackageId === pkg.id 
                    ? 'bg-purple-500/10 border-purple-500/50 text-purple-100 shadow-lg shadow-purple-500/5' 
                    : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Package className={`w-4 h-4 ${selectedPackageId === pkg.id ? 'text-purple-400' : 'text-slate-600'}`} />
                  <span className="text-sm font-semibold truncate">{pkg.name}</span>
                </div>
                <div className="text-[10px] opacity-60 mt-1 pl-6">
                  {tips.find(t => t.packageId === pkg.id)?.chemicalIds.length || 0} Chemicals assigned
                </div>
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#0f1629]/30 custom-scrollbar">
            {/* Notes Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-400" />
                  Professional Advice for {servicePackages.find(p => p.id === selectedPackageId)?.name}
                </h4>
                <Badge variant="outline" className="bg-blue-500/5 border-blue-500/20 text-blue-400 text-[10px] uppercase tracking-tighter">
                  Rick's Pro Tip
                </Badge>
              </div>
              <textarea
                value={currentTip.notes}
                onChange={(e) => updateNotes(e.target.value)}
                placeholder="Enter job-specific chemical advice here... (e.g., 'Use high alkaline soap if organic debris is heavy')"
                className="w-full h-32 bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all placeholder:text-slate-600 resize-none text-lg leading-relaxed"
              />
            </section>

            {/* Chemical Assignment */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Recommended Chemicals
                </h4>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search inventory..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-full pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50"
                  />
                </div>
              </div>

              {/* Selected Chemicals Area */}
              {selectedChemicals.length > 0 && (
                <div className="flex flex-wrap gap-2 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl min-h-[60px]">
                  {selectedChemicals.map(chem => (
                    <Badge key={chem.id} className="bg-purple-500/20 text-purple-200 border-purple-500/30 flex items-center gap-2 py-1.5 pl-3 pr-1 group">
                      <span className="font-semibold">{chem.name}</span>
                      <button 
                        onClick={() => toggleChemical(chem.id)}
                        className="p-0.5 hover:bg-purple-500/40 rounded-full transition-colors"
                      >
                        <Trash2 className="w-3 h-3 text-purple-400" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Chemical Picker Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredChemicals.map(chem => (
                  <Card 
                    key={chem.id}
                    onClick={() => toggleChemical(chem.id)}
                    className={`p-3 cursor-pointer transition-all border group relative overflow-hidden ${
                      currentTip.chemicalIds.includes(chem.id)
                        ? 'bg-purple-500/20 border-purple-500/50'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${currentTip.chemicalIds.includes(chem.id) ? 'bg-purple-500/30 text-purple-200' : 'bg-slate-800 text-slate-500'}`}>
                        {chem.primary_image_url ? (
                          <img src={chem.primary_image_url} alt="" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <FlaskConical className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${currentTip.chemicalIds.includes(chem.id) ? 'text-purple-100' : 'text-slate-300'}`}>{chem.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{chem.brand || 'No Brand'}</p>
                      </div>
                    </div>
                    {currentTip.chemicalIds.includes(chem.id) && (
                      <div className="absolute top-2 right-2">
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full shadow-[0_0_8px_#a855f7]" />
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
