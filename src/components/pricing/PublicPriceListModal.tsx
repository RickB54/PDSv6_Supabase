import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";

export const PublicPriceListModal = ({
  open,
  onOpenChange,
  packages,
  addons,
  currentPrices,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packages: any[];
  addons: any[];
  currentPrices: Record<string, string>;
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[95vw] lg:max-w-4xl max-h-[90vh] overflow-y-auto bg-white text-black p-0 border-none shadow-2xl z-[10005]">
        <div className="p-6 sm:p-10">
          <div className="text-center mb-8 border-b-2 border-red-600 pb-4">
             <h2 className="text-3xl font-black text-red-600 uppercase tracking-tighter">Prime Auto Detail</h2>
             <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Master Price List</p>
          </div>
          
          <div className="space-y-8">
            {/* Packages */}
            <div>
              <h3 className="text-red-600 font-black text-lg mb-3 uppercase tracking-wider">Service Packages</h3>
              <div className="overflow-x-auto border rounded-lg border-slate-200">
                <table className="w-full border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-red-600 text-white">
                      <th className="p-3 border-r border-red-500 text-left uppercase text-xs font-bold tracking-wider">Package</th>
                      <th className="p-3 border-r border-red-500 text-center uppercase text-xs font-bold tracking-wider">Compact</th>
                      <th className="p-3 border-r border-red-500 text-center uppercase text-xs font-bold tracking-wider">Midsize</th>
                      <th className="p-3 border-r border-red-500 text-center uppercase text-xs font-bold tracking-wider">Truck</th>
                      <th className="p-3 text-center uppercase text-xs font-bold tracking-wider">Luxury</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packages.map((p, idx) => {
                      const getP = (sz: string) => {
                        const val = currentPrices[`package:${p.id}:${sz}`];
                        return val !== undefined && val !== null && val !== "" ? parseFloat(val) : (p.pricing[sz] || 0);
                      };
                      return (
                        <tr key={p.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50 hover:bg-slate-100"}>
                          <td className="p-3 border border-slate-200 font-bold text-slate-800">{p.name}</td>
                          <td className="p-3 border border-slate-200 text-center font-black text-slate-700">${getP('compact')}</td>
                          <td className="p-3 border border-slate-200 text-center font-black text-slate-700">${getP('midsize')}</td>
                          <td className="p-3 border border-slate-200 text-center font-black text-slate-700">${getP('truck')}</td>
                          <td className="p-3 border border-slate-200 text-center font-black text-slate-700">${getP('luxury')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Add-Ons */}
            <div>
              <h3 className="text-red-600 font-black text-lg mb-3 uppercase tracking-wider">Add-Ons</h3>
              <div className="overflow-x-auto border rounded-lg border-slate-200">
                <table className="w-full border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-red-600 text-white">
                      <th className="p-3 border-r border-red-500 text-left uppercase text-xs font-bold tracking-wider">Add-On</th>
                      <th className="p-3 border-r border-red-500 text-center uppercase text-xs font-bold tracking-wider">Compact</th>
                      <th className="p-3 border-r border-red-500 text-center uppercase text-xs font-bold tracking-wider">Midsize</th>
                      <th className="p-3 border-r border-red-500 text-center uppercase text-xs font-bold tracking-wider">Truck</th>
                      <th className="p-3 text-center uppercase text-xs font-bold tracking-wider">Luxury</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addons.map((a, idx) => {
                      const getP = (sz: string) => {
                        const val = currentPrices[`addon:${a.id}:${sz}`];
                        return val !== undefined && val !== null && val !== "" ? parseFloat(val) : (a.pricing[sz] || 0);
                      };
                      return (
                        <tr key={a.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50 hover:bg-slate-100"}>
                          <td className="p-3 border border-slate-200 font-bold text-slate-800">{a.name}</td>
                          <td className="p-3 border border-slate-200 text-center font-black text-slate-700">${getP('compact')}</td>
                          <td className="p-3 border border-slate-200 text-center font-black text-slate-700">${getP('midsize')}</td>
                          <td className="p-3 border border-slate-200 text-center font-black text-slate-700">${getP('truck')}</td>
                          <td className="p-3 border border-slate-200 text-center font-black text-slate-700">${getP('luxury')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
