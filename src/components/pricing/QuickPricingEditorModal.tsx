import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export const QuickPricingEditorModal = ({ 
  open, 
  onOpenChange, 
  packages, 
  addons, 
  currentPrices, 
  onSavePrices,
  onDownloadAuditPDF,
  onDownloadPricesPDF
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packages: any[];
  addons: any[];
  currentPrices: Record<string, string>;
  onSavePrices: (newPrices: Record<string, string>) => void;
  onDownloadAuditPDF?: () => void;
  onDownloadPricesPDF?: () => void;
}) => {
  const [localPrices, setLocalPrices] = useState<Record<string, string>>(currentPrices);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkMode, setBulkMode] = useState<"$" | "%">("$");
  
  React.useEffect(() => {
    if (open) {
      setLocalPrices(currentPrices);
      setSelectedKeys(new Set());
      setBulkPrice("");
      setBulkMode("$");
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
    const amount = parseFloat(bulkPrice);
    if (!bulkPrice || isNaN(amount)) {
        toast({ title: "Invalid Amount", variant: "destructive" });
        return;
    }
    if (selectedKeys.size === 0) {
        toast({ title: "No items selected", variant: "destructive" });
        return;
    }
    
    setLocalPrices(prev => {
      const next = { ...prev };
      selectedKeys.forEach(k => {
        if (bulkMode === "$") {
          next[k] = amount.toString();
        } else {
          // percentage increase
          const currentVal = parseFloat(next[k] || "0");
          const increase = currentVal * (amount / 100);
          next[k] = Math.ceil(currentVal + increase).toString();
        }
      });
      return next;
    });
    
    toast({ title: `Applied ${bulkMode === "$" ? "$" : ""}${amount}${bulkMode === "%" ? "% increase" : ""} to ${selectedKeys.size} items` });
    setSelectedKeys(new Set());
    setBulkPrice("");
  };

  const applyRowPercentage = (type: string, id: string, pct: number) => {
    setLocalPrices(prev => {
      const next = { ...prev };
      vehicleTypes.forEach(v => {
        const key = `${type}:${id}:${v}`;
        const currentVal = parseFloat(next[key] || "0");
        const increase = currentVal * (pct / 100);
        next[key] = Math.ceil(currentVal + increase).toString();
      });
      return next;
    });
    toast({ title: `Applied +${pct}% to row` });
  };

  const handleSave = () => {
    onSavePrices(localPrices);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[95vw] w-full h-[90vh] bg-zinc-950 border-zinc-800 text-zinc-100 flex flex-col p-0 z-[9999] shadow-2xl">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <DialogTitle className="text-2xl font-black text-emerald-500 uppercase tracking-tight flex items-center gap-3">
            Quick Bulk Grid Editor
            <TooltipProvider>
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-8 h-8 text-zinc-400 hover:text-emerald-500 cursor-help transition-colors" />
                </TooltipTrigger>
                <TooltipContent className="bg-white border-slate-200 text-slate-800 p-5 max-w-[350px] shadow-xl z-[10000] rounded-xl">
                  <h3 className="font-bold text-lg text-slate-900 mb-1">Quick Bulk Grid</h3>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">CHEAT SHEET</p>
                  
                  <p className="mb-4 text-sm text-slate-600">
                    This editor allows you to quickly adjust your pricing across all packages, add-ons, and vehicle sizes.
                  </p>
                  
                  <p className="font-bold text-slate-900 mb-2">Recommended Actions:</p>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
                    <li>Type directly into any box to change its price</li>
                    <li>Check the boxes next to items to select them, then use the Bulk Edit tool to apply a flat price or percentage increase</li>
                    <li>Use the +5% or +10% buttons to instantly boost an entire row</li>
                    <li>Click Save & Publish Live when you're done</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DialogTitle>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-zinc-950 p-2 rounded-lg border border-zinc-800">
               <span className="text-sm font-bold text-zinc-400">Bulk Edit Selected:</span>
               
               <Select value={bulkMode} onValueChange={(val: any) => setBulkMode(val)}>
                 <SelectTrigger className="w-16 h-9 bg-black border-zinc-800 text-white font-bold">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent className="bg-zinc-900 border-zinc-700 text-white z-[10000]">
                   <SelectItem value="$">$ Flat</SelectItem>
                   <SelectItem value="%">% Inc.</SelectItem>
                 </SelectContent>
               </Select>
               
               <div className="relative">
                 <span className="absolute left-2 top-2 text-zinc-500 font-bold">{bulkMode === "$" ? "$" : "%"}</span>
                 <Input 
                   className="w-20 pl-6 h-9 bg-black border-zinc-700 focus:border-emerald-500 font-mono font-bold text-white placeholder:text-zinc-700" 
                   placeholder="0" 
                   value={bulkPrice}
                   onChange={e => setBulkPrice(e.target.value)}
                 />
               </div>
               <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={applyBulkPrice}>Apply</Button>
            </div>
            
            <div className="flex flex-col gap-1.5">
              {onDownloadPricesPDF && (
                <Button size="sm" variant="outline" className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 font-bold px-3 py-1 h-7 text-xs uppercase tracking-wider" onClick={onDownloadPricesPDF}>
                  Print Current Chart
                </Button>
              )}
              {onDownloadAuditPDF && (
                <Button size="sm" variant="outline" className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10 font-bold px-3 py-1 h-7 text-xs uppercase tracking-wider" onClick={onDownloadAuditPDF}>
                  Audit PDF
                </Button>
              )}
            </div>

            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8 shadow-lg shadow-blue-500/20 uppercase tracking-wider ml-2" onClick={handleSave}>
              Save & Publish Live
            </Button>
          </div>
        </div>
        
        <ScrollArea className="flex-1 p-6 bg-zinc-950">
          <div className="space-y-10">
            {/* Packages */}
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-wider mb-4 border-b border-zinc-800 pb-2">Packages</h3>
              <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/40">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-black uppercase text-xs tracking-wider sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="p-4 w-12 text-center">Sel</th>
                      <th className="p-4">Package Name</th>
                      {vehicleTypes.map(v => (
                        <th key={v} className="p-4 text-center">{vehicleLabels[v]}</th>
                      ))}
                      <th className="p-4 text-center">Row Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packages.map(pkg => (
                      <tr key={pkg.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/40 transition-colors">
                        <td className="p-4 text-center">
                          <Checkbox 
                            checked={vehicleTypes.every(v => selectedKeys.has(`package:${pkg.id}:${v}`))}
                            onCheckedChange={(c) => handleSelectRow('package', pkg.id, !!c)}
                            className="border-zinc-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 scale-125"
                          />
                        </td>
                        <td className="p-4 font-black text-blue-400 text-base">{pkg.name}</td>
                        {vehicleTypes.map(v => {
                          const key = `package:${pkg.id}:${v}`;
                          return (
                            <td key={v} className="p-2">
                              <div className="flex items-center gap-3 justify-center">
                                <Checkbox 
                                  checked={selectedKeys.has(key)}
                                  onCheckedChange={(c) => handleCheckbox(key, !!c)}
                                  className="border-zinc-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 scale-110"
                                />
                                <div className="relative">
                                  <span className="absolute left-2 top-2 text-zinc-600 font-bold text-sm">$</span>
                                  <Input 
                                    className="w-24 pl-6 h-9 bg-black border-zinc-700 focus:border-emerald-500 text-center font-mono font-bold text-white shadow-sm text-sm" 
                                    value={localPrices[key] !== undefined ? localPrices[key] : (pkg.pricing[v] || 0)}
                                    onChange={(e) => handlePriceChange(key, e.target.value)}
                                  />
                                </div>
                              </div>
                            </td>
                          );
                        })}
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button size="sm" variant="outline" className="h-8 border-zinc-700 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50" onClick={() => applyRowPercentage('package', pkg.id, 5)}>+5%</Button>
                            <Button size="sm" variant="outline" className="h-8 border-zinc-700 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50" onClick={() => applyRowPercentage('package', pkg.id, 10)}>+10%</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Addons */}
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-wider mb-4 border-b border-zinc-800 pb-2">Add-Ons</h3>
              <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/40">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-black uppercase text-xs tracking-wider sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="p-4 w-12 text-center">Sel</th>
                      <th className="p-4">Add-On Name</th>
                      {vehicleTypes.map(v => (
                        <th key={v} className="p-4 text-center">{vehicleLabels[v]}</th>
                      ))}
                      <th className="p-4 text-center">Row Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addons.map(addon => (
                      <tr key={addon.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/40 transition-colors">
                        <td className="p-4 text-center">
                          <Checkbox 
                            checked={vehicleTypes.every(v => selectedKeys.has(`addon:${addon.id}:${v}`))}
                            onCheckedChange={(c) => handleSelectRow('addon', addon.id, !!c)}
                            className="border-zinc-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 scale-125"
                          />
                        </td>
                        <td className="p-4 font-black text-purple-400 text-base">{addon.name}</td>
                        {vehicleTypes.map(v => {
                          const key = `addon:${addon.id}:${v}`;
                          return (
                            <td key={v} className="p-2">
                              <div className="flex items-center gap-3 justify-center">
                                <Checkbox 
                                  checked={selectedKeys.has(key)}
                                  onCheckedChange={(c) => handleCheckbox(key, !!c)}
                                  className="border-zinc-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 scale-110"
                                />
                                <div className="relative">
                                  <span className="absolute left-2 top-2 text-zinc-600 font-bold text-sm">$</span>
                                  <Input 
                                    className="w-24 pl-6 h-9 bg-black border-zinc-700 focus:border-emerald-500 text-center font-mono font-bold text-white shadow-sm text-sm" 
                                    value={localPrices[key] !== undefined ? localPrices[key] : (addon.pricing[v] || 0)}
                                    onChange={(e) => handlePriceChange(key, e.target.value)}
                                  />
                                </div>
                              </div>
                            </td>
                          );
                        })}
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button size="sm" variant="outline" className="h-8 border-zinc-700 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50" onClick={() => applyRowPercentage('addon', addon.id, 5)}>+5%</Button>
                            <Button size="sm" variant="outline" className="h-8 border-zinc-700 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50" onClick={() => applyRowPercentage('addon', addon.id, 10)}>+10%</Button>
                          </div>
                        </td>
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
