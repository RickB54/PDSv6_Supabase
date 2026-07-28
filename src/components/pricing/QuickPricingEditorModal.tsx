import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";

export const QuickPricingEditorModal = ({ 
  open, 
  onOpenChange, 
  packages, 
  addons, 
  currentPrices, 
  onSavePrices 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packages: any[];
  addons: any[];
  currentPrices: Record<string, string>;
  onSavePrices: (newPrices: Record<string, string>) => void;
}) => {
  const [localPrices, setLocalPrices] = useState<Record<string, string>>(currentPrices);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkPrice, setBulkPrice] = useState("");
  
  // Update localPrices when opened
  React.useEffect(() => {
    if (open) {
      setLocalPrices(currentPrices);
      setSelectedKeys(new Set());
      setBulkPrice("");
    }
  }, [open, currentPrices]);

  const vehicleTypes = ['compact', 'midsize', 'truck', 'luxury'];
  const vehicleLabels: Record<string, string> = {
    compact: 'Compact',
    midsize: 'Mid-Size',
    truck: 'Truck',
    luxury: 'Luxury'
  };

  const handlePriceChange = (key: string, value: string) => {
    setLocalPrices(prev => ({ ...prev, [key]: value }));
  };

  const handleCheckbox = (key: string, checked: boolean) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };
  
  const handleSelectRow = (type: string, id: string, checked: boolean) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      vehicleTypes.forEach(v => {
        const key = `${type}:${id}:${v}`;
        if (checked) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  };

  const applyBulkPrice = () => {
    if (!bulkPrice || isNaN(parseFloat(bulkPrice))) {
        toast({ title: "Invalid Price", variant: "destructive" });
        return;
    }
    if (selectedKeys.size === 0) {
        toast({ title: "No items selected", variant: "destructive" });
        return;
    }
    
    setLocalPrices(prev => {
      const next = { ...prev };
      selectedKeys.forEach(k => next[k] = bulkPrice);
      return next;
    });
    toast({ title: `Applied $${bulkPrice} to ${selectedKeys.size} items` });
    setSelectedKeys(new Set());
    setBulkPrice("");
  };

  const handleSave = () => {
    onSavePrices(localPrices);
    onOpenChange(false);
    toast({ title: "Pricing Updated", description: "Changes have been staged. Please hit Save All to confirm." });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] bg-zinc-950 border-zinc-800 text-zinc-100 flex flex-col p-0 z-[100]">
        <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-zinc-900/50">
          <DialogTitle className="text-2xl font-black text-emerald-500 uppercase tracking-tight">Quick Bulk Grid Editor</DialogTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-zinc-900 p-2 rounded-lg border border-zinc-700">
               <span className="text-sm font-bold text-zinc-400">Bulk Edit Selected:</span>
               <div className="relative">
                 <span className="absolute left-2 top-2 text-zinc-500">$</span>
                 <Input 
                   className="w-24 pl-6 h-9 bg-black border-zinc-700 focus:border-emerald-500 font-mono" 
                   placeholder="0" 
                   value={bulkPrice}
                   onChange={e => setBulkPrice(e.target.value)}
                 />
               </div>
               <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={applyBulkPrice}>Apply</Button>
            </div>
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 shadow-lg shadow-blue-500/20" onClick={handleSave}>
              Save Grid Edits
            </Button>
          </div>
        </div>
        
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-8">
            {/* Packages */}
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-wider mb-4 border-b border-zinc-800 pb-2">Packages</h3>
              <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/30">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-bold uppercase text-xs tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="p-4 w-12 text-center">Row</th>
                      <th className="p-4">Package Name</th>
                      {vehicleTypes.map(v => (
                        <th key={v} className="p-4 text-center">{vehicleLabels[v]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {packages.map(pkg => (
                      <tr key={pkg.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                        <td className="p-4 text-center">
                          <Checkbox 
                            checked={vehicleTypes.every(v => selectedKeys.has(`package:${pkg.id}:${v}`))}
                            onCheckedChange={(c) => handleSelectRow('package', pkg.id, !!c)}
                            className="border-zinc-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                          />
                        </td>
                        <td className="p-4 font-bold text-blue-300">{pkg.name}</td>
                        {vehicleTypes.map(v => {
                          const key = `package:${pkg.id}:${v}`;
                          return (
                            <td key={v} className="p-2">
                              <div className="flex items-center gap-2 justify-center">
                                <Checkbox 
                                  checked={selectedKeys.has(key)}
                                  onCheckedChange={(c) => handleCheckbox(key, !!c)}
                                  className="border-zinc-700 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                />
                                <div className="relative">
                                  <span className="absolute left-2 top-1.5 text-zinc-600 text-xs">$</span>
                                  <Input 
                                    className="w-20 pl-5 h-8 bg-black/50 border-zinc-700 focus:border-emerald-500 text-center font-mono text-sm" 
                                    value={localPrices[key] !== undefined ? localPrices[key] : (pkg.pricing[v] || 0)}
                                    onChange={(e) => handlePriceChange(key, e.target.value)}
                                  />
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Addons */}
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-wider mb-4 border-b border-zinc-800 pb-2">Add-Ons</h3>
              <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/30">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-bold uppercase text-xs tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="p-4 w-12 text-center">Row</th>
                      <th className="p-4">Add-On Name</th>
                      {vehicleTypes.map(v => (
                        <th key={v} className="p-4 text-center">{vehicleLabels[v]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {addons.map(addon => (
                      <tr key={addon.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                        <td className="p-4 text-center">
                          <Checkbox 
                            checked={vehicleTypes.every(v => selectedKeys.has(`addon:${addon.id}:${v}`))}
                            onCheckedChange={(c) => handleSelectRow('addon', addon.id, !!c)}
                            className="border-zinc-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                          />
                        </td>
                        <td className="p-4 font-bold text-purple-300">{addon.name}</td>
                        {vehicleTypes.map(v => {
                          const key = `addon:${addon.id}:${v}`;
                          return (
                            <td key={v} className="p-2">
                              <div className="flex items-center gap-2 justify-center">
                                <Checkbox 
                                  checked={selectedKeys.has(key)}
                                  onCheckedChange={(c) => handleCheckbox(key, !!c)}
                                  className="border-zinc-700 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                />
                                <div className="relative">
                                  <span className="absolute left-2 top-1.5 text-zinc-600 text-xs">$</span>
                                  <Input 
                                    className="w-20 pl-5 h-8 bg-black/50 border-zinc-700 focus:border-emerald-500 text-center font-mono text-sm" 
                                    value={localPrices[key] !== undefined ? localPrices[key] : (addon.pricing[v] || 0)}
                                    onChange={(e) => handlePriceChange(key, e.target.value)}
                                  />
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
