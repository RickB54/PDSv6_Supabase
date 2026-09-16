import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import jsPDF from 'jspdf';

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
  const [categoryFilter, setCategoryFilter] = useState<string>('both');
  const [statusFilter, setStatusFilter] = useState<'live' | 'all' | 'archived'>('live');
  const [showArchived, setShowArchived] = useState<boolean>(false);

  const handleStatusChange = (val: 'live' | 'all' | 'archived') => {
    setStatusFilter(val);
    setShowArchived(val !== 'live');
  };

  const handleToggleArchived = (checked: boolean) => {
    setShowArchived(checked);
    setStatusFilter(checked ? 'all' : 'live');
  };

  // Filter packages
  const showPackages = ['both', 'all', 'packages', 'essential', 'elite'].includes(categoryFilter);
  const showAddons = ['both', 'all', 'addons', 'exterior_addons', 'interior_addons'].includes(categoryFilter);

  let filteredPackages = packages.filter(p => !p.isDeleted);
  if (statusFilter === 'live') {
    filteredPackages = filteredPackages.filter(p => !p.isArchived);
  } else if (statusFilter === 'archived') {
    filteredPackages = filteredPackages.filter(p => p.isArchived);
  }
  if (categoryFilter === 'essential') {
    filteredPackages = filteredPackages.filter(p => (p.name || '').toLowerCase().includes('essential'));
  } else if (categoryFilter === 'elite') {
    filteredPackages = filteredPackages.filter(p => (p.name || '').toLowerCase().includes('elite'));
  }

  let filteredAddOns = addons.filter(a => !a.isDeleted);
  if (statusFilter === 'live') {
    filteredAddOns = filteredAddOns.filter(a => !a.isArchived);
  } else if (statusFilter === 'archived') {
    filteredAddOns = filteredAddOns.filter(a => a.isArchived);
  }
  if (categoryFilter === 'exterior_addons') {
    filteredAddOns = filteredAddOns.filter(a => a.category === 'exterior');
  } else if (categoryFilter === 'interior_addons') {
    filteredAddOns = filteredAddOns.filter(a => a.category === 'interior');
  }

  const getPkgPrice = (p: any, sz: string) => {
    const val = currentPrices[`package:${p.id}:${sz}`];
    return val !== undefined && val !== null && val !== "" ? parseFloat(val) : (p.pricing?.[sz] || 0);
  };

  const getAddonPrice = (a: any, sz: string) => {
    const val = currentPrices[`addon:${a.id}:${sz}`];
    return val !== undefined && val !== null && val !== "" ? parseFloat(val) : (a.pricing?.[sz] || 0);
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;

    const sizes = ['compact', 'midsize', 'truck', 'luxury'];
    const pkgRows = (showPackages ? filteredPackages : []).map(p => {
      const isArchived = !!p.isArchived;
      const cells = sizes.map(sz => `<td style="padding:8px;border:1px solid #ddd;text-align:right;">$${getPkgPrice(p, sz)}</td>`).join('');
      const badge = isArchived ? ' <span style="font-size:10px;background:#e4e4e7;color:#3f3f46;padding:2px 6px;border-radius:4px;font-weight:bold;margin-left:6px;border:1px solid #d4d4d8;">ARCHIVED</span>' : '';
      const rowStyle = isArchived ? 'background:#f4f4f5;color:#52525b;' : '';
      return `<tr style="${rowStyle}"><td style="padding:8px;border:1px solid #ddd;font-weight:${isArchived ? 'normal' : 'bold'}">${p.name}${badge}</td>${cells}</tr>`;
    }).join('');

    const addonRows = (showAddons ? filteredAddOns : []).map(a => {
      const isArchived = !!a.isArchived;
      const cells = sizes.map(sz => `<td style="padding:8px;border:1px solid #ddd;text-align:right;">$${getAddonPrice(a, sz)}</td>`).join('');
      const badge = isArchived ? ' <span style="font-size:10px;background:#e4e4e7;color:#3f3f46;padding:2px 6px;border-radius:4px;font-weight:bold;margin-left:6px;border:1px solid #d4d4d8;">ARCHIVED</span>' : '';
      const rowStyle = isArchived ? 'background:#f4f4f5;color:#52525b;' : '';
      return `<tr style="${rowStyle}"><td style="padding:8px;border:1px solid #ddd;font-weight:${isArchived ? 'normal' : 'bold'}">${a.name}${badge}</td>${cells}</tr>`;
    }).join('');

    const packagesTableHtml = showPackages && filteredPackages.length > 0 ? `
      <h2>Service Packages</h2>
      <table><thead><tr><th>Package</th><th>Compact</th><th>Midsize</th><th>Truck</th><th>Luxury</th></tr></thead><tbody>${pkgRows}</tbody></table>
    ` : (showPackages ? '<p><em>No packages match the current filter.</em></p>' : '');

    const addonsTableHtml = showAddons && filteredAddOns.length > 0 ? `
      <h2>Add-Ons</h2>
      <table><thead><tr><th>Add-On</th><th>Compact</th><th>Midsize</th><th>Truck</th><th>Luxury</th></tr></thead><tbody>${addonRows}</tbody></table>
    ` : (showAddons ? '<p><em>No add-ons match the current filter.</em></p>' : '');

    const dateStr = new Date().toLocaleString();

    win.document.write(`
      <html>
        <head>
          <title>Master Price List — Prime Auto Detail</title>
          <style>
            body{font-family:Arial, sans-serif; padding:24px;}
            h1{color:#dc2626;margin-bottom:4px;}
            h2{color:#b91c1c;margin-top:24px;margin-bottom:8px;}
            table{border-collapse:collapse;width:100%;margin-bottom:20px;}
            th{background:#dc2626;color:white;padding:10px;text-align:right;}
            th:first-child{text-align:left;}
            td{border:1px solid #ddd;padding:8px;text-align:right;}
            td:first-child{text-align:left;}
            tr:nth-child(even){background:#f9f9f9}
          </style>
        </head>
        <body>
          <h1>Prime Auto Detail — Master Price List</h1>
          <p style="color:#666;font-size:12px;margin-bottom:20px;">Prices As Of: ${dateStr} | Status: ${statusFilter.toUpperCase()} | Filter: ${categoryFilter.toUpperCase()}</p>
          ${packagesTableHtml}
          ${addonsTableHtml}
          <script>window.onload = function(){ window.print(); }</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'p' });
      doc.setTextColor(200, 0, 0);
      doc.setFontSize(20);
      doc.text("Prime Auto Detail — Master Price List", 14, 20);

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.text(`Prices As Of: ${new Date().toLocaleString()} | Status: ${statusFilter.toUpperCase()}`, 14, 28);

      const sizes = ['compact', 'midsize', 'truck', 'luxury'];
      let y = 40;
      const xPos = [95, 120, 145, 170];

      const checkPageBreak = (needed = 10) => {
        if (y + needed > 280) {
          doc.addPage();
          y = 20;
        }
      };

      const drawHeader = (title: string) => {
        checkPageBreak(20);
        doc.setFontSize(12);
        doc.setTextColor(200, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text(title, 14, y);
        y += 8;

        doc.setFillColor(240, 240, 240);
        doc.rect(14, y - 6, 182, 8, "F");
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.text("Service", 18, y);
        doc.text("Compact", 100, y, { align: 'right' });
        doc.text("Midsize", 125, y, { align: 'right' });
        doc.text("Truck", 150, y, { align: 'right' });
        doc.text("Luxury", 175, y, { align: 'right' });
        doc.setFont("helvetica", "normal");
        y += 10;
      };

      if (showPackages && filteredPackages.length > 0) {
        drawHeader("Service Packages");
        filteredPackages.forEach(p => {
          checkPageBreak();
          const isArchived = !!p.isArchived;
          doc.setFontSize(9);
          const displayName = isArchived ? `${p.name} [Archived]` : p.name;
          doc.setTextColor(isArchived ? 120 : 0, isArchived ? 120 : 0, isArchived ? 120 : 0);
          doc.text(displayName, 18, y);
          sizes.forEach((sz, i) => {
            const val = getPkgPrice(p, sz);
            doc.text(`$${val}`, xPos[i], y, { align: 'right' });
          });
          y += 7;
        });
        y += 8;
      }

      if (showAddons && filteredAddOns.length > 0) {
        drawHeader("Add-Ons");
        filteredAddOns.forEach(a => {
          checkPageBreak();
          const isArchived = !!a.isArchived;
          doc.setFontSize(9);
          const displayName = isArchived ? `${a.name} [Archived]` : a.name;
          doc.setTextColor(isArchived ? 120 : 0, isArchived ? 120 : 0, isArchived ? 120 : 0);
          doc.text(displayName, 18, y);
          sizes.forEach((sz, i) => {
            const val = getAddonPrice(a, sz);
            doc.text(`$${val}`, xPos[i], y, { align: 'right' });
          });
          y += 7;
        });
      }

      doc.save(`master-price-list-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[95vw] lg:max-w-4xl max-h-[90vh] overflow-y-auto bg-white text-black p-0 border-none shadow-2xl z-[10005]">
        <div className="p-4 sm:p-8">
          <DialogHeader className="text-center mb-6 border-b-2 border-red-600 pb-4">
             <DialogTitle className="text-3xl font-black text-red-600 uppercase tracking-tighter">Prime Auto Detail</DialogTitle>
             <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Master Price List</p>
          </DialogHeader>

          {/* Controls Bar */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter Items:</span>
              <Select value={categoryFilter} onValueChange={(val: any) => setCategoryFilter(val)}>
                <SelectTrigger className="w-[190px] bg-white border-slate-300 text-xs font-semibold">
                  <SelectValue placeholder="All Services & Add-Ons" />
                </SelectTrigger>
                <SelectContent className="z-[10010]">
                  <SelectItem value="both">All Services & Add-Ons</SelectItem>
                  <SelectItem value="packages">All Packages Only</SelectItem>
                  <SelectItem value="essential">Essential Packages Only</SelectItem>
                  <SelectItem value="elite">Elite Packages Only</SelectItem>
                  <SelectItem value="addons">All Add-Ons Only</SelectItem>
                  <SelectItem value="exterior_addons">Exterior Add-Ons Only</SelectItem>
                  <SelectItem value="interior_addons">Interior Add-Ons Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[170px] bg-white border-slate-300 text-xs font-semibold">
                  <SelectValue placeholder="Live Only" />
                </SelectTrigger>
                <SelectContent className="z-[10010]">
                  <SelectItem value="live">Live Only</SelectItem>
                  <SelectItem value="all">Show All (Live + Archived)</SelectItem>
                  <SelectItem value="archived">Archived Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={showArchived} onCheckedChange={handleToggleArchived} />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Show Archived</span>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handlePrint} className="border-slate-300 font-bold text-xs">
                Print
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownloadPDF} className="border-slate-300 font-bold text-xs">
                Download PDF
              </Button>
            </div>
          </div>
          
          <div className="space-y-8">
            {/* Packages */}
            {showPackages && (
              <div>
                <h3 className="text-red-600 font-black text-base sm:text-lg mb-2 sm:mb-3 uppercase tracking-wider">Service Packages</h3>
                <div className="border rounded-lg border-slate-200 w-full overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-red-600 text-white">
                        <th className="p-1.5 sm:p-3 border-r border-red-500 text-left uppercase text-[9px] sm:text-xs font-bold tracking-wider">Package</th>
                        <th className="p-1.5 sm:p-3 border-r border-red-500 text-center uppercase text-[9px] sm:text-xs font-bold tracking-wider">Compact</th>
                        <th className="p-1.5 sm:p-3 border-r border-red-500 text-center uppercase text-[9px] sm:text-xs font-bold tracking-wider">Midsize</th>
                        <th className="p-1.5 sm:p-3 border-r border-red-500 text-center uppercase text-[9px] sm:text-xs font-bold tracking-wider">Truck</th>
                        <th className="p-1.5 sm:p-3 text-center uppercase text-[9px] sm:text-xs font-bold tracking-wider">Luxury</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPackages.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-400 italic text-sm">No packages match the current filter.</td>
                        </tr>
                      ) : (
                        filteredPackages.map((p, idx) => {
                          const isArchived = !!p.isArchived;
                          return (
                            <tr key={p.id} className={isArchived ? "bg-slate-100/90 text-slate-500" : (idx % 2 === 0 ? "bg-white" : "bg-slate-50 hover:bg-slate-100")}>
                              <td className="p-1.5 sm:p-3 border border-slate-200 text-[10px] sm:text-base font-bold text-slate-800 leading-tight">
                                <div className="flex items-center justify-between">
                                  <span>{p.name}</span>
                                  {isArchived && (
                                    <span className="ml-2 text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-slate-300">
                                      Archived
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className={`p-1.5 sm:p-3 border border-slate-200 text-center text-[11px] sm:text-base ${isArchived ? 'font-semibold text-slate-500' : 'font-black text-slate-700'}`}>${getPkgPrice(p, 'compact')}</td>
                              <td className={`p-1.5 sm:p-3 border border-slate-200 text-center text-[11px] sm:text-base ${isArchived ? 'font-semibold text-slate-500' : 'font-black text-slate-700'}`}>${getPkgPrice(p, 'midsize')}</td>
                              <td className={`p-1.5 sm:p-3 border border-slate-200 text-center text-[11px] sm:text-base ${isArchived ? 'font-semibold text-slate-500' : 'font-black text-slate-700'}`}>${getPkgPrice(p, 'truck')}</td>
                              <td className={`p-1.5 sm:p-3 border border-slate-200 text-center text-[11px] sm:text-base ${isArchived ? 'font-semibold text-slate-500' : 'font-black text-slate-700'}`}>${getPkgPrice(p, 'luxury')}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Add-Ons */}
            {showAddons && (
              <div>
                <h3 className="text-red-600 font-black text-base sm:text-lg mb-2 sm:mb-3 uppercase tracking-wider">Add-Ons</h3>
                <div className="border rounded-lg border-slate-200 w-full overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-red-600 text-white">
                        <th className="p-1.5 sm:p-3 border-r border-red-500 text-left uppercase text-[9px] sm:text-xs font-bold tracking-wider">Add-On</th>
                        <th className="p-1.5 sm:p-3 border-r border-red-500 text-center uppercase text-[9px] sm:text-xs font-bold tracking-wider">Compact</th>
                        <th className="p-1.5 sm:p-3 border-r border-red-500 text-center uppercase text-[9px] sm:text-xs font-bold tracking-wider">Midsize</th>
                        <th className="p-1.5 sm:p-3 border-r border-red-500 text-center uppercase text-[9px] sm:text-xs font-bold tracking-wider">Truck</th>
                        <th className="p-1.5 sm:p-3 text-center uppercase text-[9px] sm:text-xs font-bold tracking-wider">Luxury</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAddOns.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-400 italic text-sm">No add-ons match the current filter.</td>
                        </tr>
                      ) : (
                        filteredAddOns.map((a, idx) => {
                          const isArchived = !!a.isArchived;
                          return (
                            <tr key={a.id} className={isArchived ? "bg-slate-100/90 text-slate-500" : (idx % 2 === 0 ? "bg-white" : "bg-slate-50 hover:bg-slate-100")}>
                              <td className="p-1.5 sm:p-3 border border-slate-200 text-[10px] sm:text-base font-bold text-slate-800 leading-tight">
                                <div className="flex items-center justify-between">
                                  <span>{a.name}</span>
                                  {isArchived && (
                                    <span className="ml-2 text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-slate-300">
                                      Archived
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className={`p-1.5 sm:p-3 border border-slate-200 text-center text-[11px] sm:text-base ${isArchived ? 'font-semibold text-slate-500' : 'font-black text-slate-700'}`}>${getAddonPrice(a, 'compact')}</td>
                              <td className={`p-1.5 sm:p-3 border border-slate-200 text-center text-[11px] sm:text-base ${isArchived ? 'font-semibold text-slate-500' : 'font-black text-slate-700'}`}>${getAddonPrice(a, 'midsize')}</td>
                              <td className={`p-1.5 sm:p-3 border border-slate-200 text-center text-[11px] sm:text-base ${isArchived ? 'font-semibold text-slate-500' : 'font-black text-slate-700'}`}>${getAddonPrice(a, 'truck')}</td>
                              <td className={`p-1.5 sm:p-3 border border-slate-200 text-center text-[11px] sm:text-base ${isArchived ? 'font-semibold text-slate-500' : 'font-black text-slate-700'}`}>${getAddonPrice(a, 'luxury')}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
