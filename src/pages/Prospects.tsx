import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CustomerModal, { type Customer as ModalCustomer } from "@/components/customers/CustomerModal";
import { getCustomers, deleteCustomer as removeCustomer, upsertCustomer } from "@/lib/db";
import { getUnifiedCustomers } from "@/lib/customers";
import { upsertSupabaseCustomer } from "@/lib/supa-data";
import api from "@/lib/api";
import { Search, Pencil, Trash2, Plus, Save, Users, Archive, RotateCcw, Image as ImageIcon, Video } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import DateRangeFilter, { DateRangeValue } from "@/components/filters/DateRangeFilter";
import jsPDF from "jspdf";
import { savePDFToArchive } from "@/lib/pdfArchive";

interface Customer {
  id?: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  vehicle: string;
  model: string;
  year: string;
  color: string;
  mileage: string;
  vehicleType: string;
  conditionInside: string;
  conditionOutside: string;
  services: string[];
  lastService: string;
  duration: string;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
  howFound?: string;
  howFoundOther?: string;
  type?: 'customer' | 'prospect';
  is_archived?: boolean;
  generalPhotos?: string[];
  beforePhotos?: string[];
  afterPhotos?: string[];
  videoUrl?: string;
  learningCenterUrl?: string;
}

const Prospects = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [dateFilter, setDateFilter] = useState<"all" | "daily" | "weekly" | "monthly">("all");
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await getUnifiedCustomers();
      const prospects = (list as Customer[]).filter(c => c.type === 'prospect');
      setCustomers(prospects);
    } catch (err: any) {
      console.error('Refresh prospects failed:', err);
      try {
        const fallback = await getCustomers();
        const prospects = (fallback as Customer[]).filter(c => c.type === 'prospect');
        setCustomers(prospects);
      } catch (err2) {
        setCustomers([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); setModalOpen(true); };

  const onSaveModal = async (data: ModalCustomer) => {
    if (!data.type) data.type = 'prospect';
    try {
      // Ensure we don't send a local/timestamp ID to Supabase UUID column
      const safeId = data.id && data.id.length > 20 && !data.id.includes('_') ? data.id : undefined;

      await upsertSupabaseCustomer({
        id: safeId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        notes: data.notes,
        type: 'prospect',
        is_archived: (data as any).is_archived || false,
        vehicle_info: {
          make: data.vehicle,
          model: data.model,
          year: data.year,
          type: data.vehicleType,
          color: data.color
        },
        generalPhotos: data.generalPhotos,
        beforePhotos: data.beforePhotos,
        afterPhotos: data.afterPhotos,
        videoUrl: data.videoUrl,
        learningCenterUrl: data.learningCenterUrl,
        videoNote: data.videoNote
      });
      await api('/api/customers', { method: 'POST', body: JSON.stringify(data) }).catch(() => { });
      await refresh();
      setModalOpen(false);
      toast({ title: "Saved", description: "Prospect updated." });
    } catch (err: any) {
      const saved = await upsertCustomer(data as any);
      await refresh();
      setModalOpen(false);
      toast({ title: "Saved locally", description: "Backend unavailable; stored offline.", variant: 'default' });
    }
  };

  const handleArchiveId = async (c: Customer) => {
    const newVal = !c.is_archived;
    try {
      await upsertSupabaseCustomer({ ...c, is_archived: newVal });
      await refresh();
      toast({ title: newVal ? "Archived" : "Restored", description: `${c.name} has been ${newVal ? 'archived' : 'restored'}.` });
    } catch (e) {
      toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
    }
  };

  const filterByDate = (customer: Customer) => {
    const now = new Date();
    const baseDateStr = customer.updatedAt || customer.createdAt || customer.lastService;
    if (!baseDateStr) return dateFilter === "all" && !(dateRange.from || dateRange.to);
    const d = new Date(baseDateStr);

    let passQuick = true;
    const dayMs = 24 * 60 * 60 * 1000;
    if (dateFilter === "daily") passQuick = now.getTime() - d.getTime() < dayMs;
    if (dateFilter === "weekly") passQuick = now.getTime() - d.getTime() < 7 * dayMs;
    if (dateFilter === "monthly") passQuick = now.getTime() - d.getTime() < 30 * dayMs;

    let passRange = true;
    if (dateRange.from) passRange = d >= new Date(dateRange.from.setHours(0, 0, 0, 0));
    if (passRange && dateRange.to) passRange = d <= new Date(dateRange.to.setHours(23, 59, 59, 999));

    return passQuick && passRange;
  };

  const filteredCustomers = (Array.isArray(customers) ? customers : []).filter(customer => {
    // Archive Filter
    if (showArchived) {
      if (!customer.is_archived) return false;
    } else {
      if (customer.is_archived) return false;
    }

    const matchesSearch = (customer.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.phone || '').includes(searchTerm) ||
      (customer.vehicle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.year || '').includes(searchTerm);
    return matchesSearch && filterByDate(customer);
  });

  const handleDelete = async () => {
    if (!deleteCustomerId) return;
    await removeCustomer(deleteCustomerId);
    await refresh();
    toast({ title: "Deleted", description: "Prospect permanently removed." });
    setDeleteCustomerId(null);
  };

  const generatePDF = (download = false) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text(`Prospects List (${showArchived ? 'Archived' : 'Active'})`, 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, y);
    y += 15;

    filteredCustomers.forEach((c) => {
      // Check page break with more buffer for larger items
      if (y > 230) { doc.addPage(); y = 20; }

      doc.setFillColor(168, 85, 247); // Purple header
      doc.rect(14, y, pageWidth - 28, 10, 'F');

      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(c.name || "Unknown Prospect", 18, y + 7);
      y += 15;

      doc.setTextColor(40);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      // Column 1
      doc.text(`Phone: ${c.phone || "N/A"}`, 18, y);
      doc.text(`Email: ${c.email || "N/A"}`, 18, y + 5);
      doc.text(`Address: ${c.address || "N/A"}`, 18, y + 10);
      doc.text(`Acquisition: ${c.howFound || 'N/A'}${c.howFoundOther ? ` (${c.howFoundOther})` : ''}`, 18, y + 15);

      // Column 2 - Vehicle
      const vehInfo = `${c.year || ''} ${c.vehicle || ''} ${c.model || ''}`;
      doc.text(`Vehicle: ${vehInfo}`, 110, y);
      doc.text(`Type: ${c.vehicleType || 'N/A'}`, 110, y + 5);
      doc.text(`Color: ${c.color || 'N/A'}`, 110, y + 10);
      doc.text(`Mileage: ${c.mileage || 'N/A'}`, 110, y + 15);

      // Condition
      y += 25;
      doc.setFont("helvetica", "bold");
      doc.text("Condition / Notes:", 18, y);
      doc.setFont("helvetica", "normal");

      const conditionText = `Inside: ${c.conditionInside || 'N/A'}  |  Outside: ${c.conditionOutside || 'N/A'}`;
      doc.text(conditionText, 18, y + 5);

      // Notes wrapping
      if (c.notes) {
        const splitNotes = doc.splitTextToSize(c.notes, pageWidth - 40);
        doc.text(splitNotes, 18, y + 10);
        y += (splitNotes.length * 5) + 5;
      } else {
        doc.text("No additional notes.", 18, y + 10);
        y += 10;
      }

      y += 10;
      doc.setDrawColor(200);
      doc.line(14, y, pageWidth - 14, y);
      y += 10;
    });

    if (download) {
      const fileName = `prospects_report_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
      try {
        const dataUrl = doc.output('datauristring');
        savePDFToArchive('Prospects', 'Prospects', `prospects-${Date.now()}`, dataUrl, { fileName });
        toast({ title: 'Archived', description: 'Saved to File Manager' });
      } catch (e) { }
    } else {
      window.open(doc.output('bloburl'), '_blank');
    }
  };

  const totalProspects = filteredCustomers.length;
  const newThisMonth = filteredCustomers.filter(c => {
    const d = c.createdAt ? new Date(c.createdAt) : new Date();
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Prospects" />
      <main className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
        {/* Stats Card */}
        <Card className="p-6 bg-gradient-to-r from-zinc-900 to-zinc-800 border-zinc-700 shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-purple-500/20 text-purple-400">
                <Users className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Prospects Overview</h2>
                <p className="text-zinc-400 text-sm">Track potential clients and leads</p>
              </div>
            </div>
            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">{showArchived ? 'Archived' : 'Active'}</p>
                <p className="text-3xl font-bold text-white mt-1">{totalProspects}</p>
              </div>
              <div className="text-center border-l border-zinc-700 pl-8">
                <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">New This Month</p>
                <p className="text-3xl font-bold text-purple-400 mt-1">{newThisMonth}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="pl-10 bg-zinc-950 border-zinc-800" />
          </div>
          <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
            <Button
              variant={showArchived ? "secondary" : "ghost"}
              onClick={() => setShowArchived(!showArchived)}
              className="text-zinc-400 hover:text-white"
            >
              {showArchived ? "Show Active" : "Show Archived"}
            </Button>

            <DateRangeFilter value={dateRange} onChange={setDateRange} storageKey="prospects-range" />
            <Button variant="outline" onClick={() => generatePDF(true)} className="border-zinc-700 hover:bg-zinc-800 text-zinc-200">
              <Save className="h-4 w-4 mr-2" /> PDF
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white border-0" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-2" /> Add
            </Button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/50">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-900/80 text-zinc-400 font-medium border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3">Name / Contact</th>
                  <th className="px-4 py-3">Vehicle Interest</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">
                      <div className="flex flex-col items-center gap-2">
                        <RotateCcw className="h-6 w-6 animate-spin text-purple-500" />
                        <p>Loading prospects...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">
                      No prospects found.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map(c => (
                    <tr key={c.id} className="hover:bg-purple-500/5 transition-colors group">
                      <td className="px-4 py-3 flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 cursor-pointer hover:border-purple-400 flex items-center justify-center text-zinc-400 font-bold"
                          onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                        >
                          {(c.generalPhotos?.[0] || c.beforePhotos?.[0] || c.afterPhotos?.[0]) ? (
                            <img
                              src={c.generalPhotos?.[0] || c.beforePhotos?.[0] || c.afterPhotos?.[0]}
                              alt={c.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span>{c.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-200">{c.name || "Unknown"}</div>
                          <div className="text-xs text-zinc-500">{c.phone}</div>
                          <div className="text-xs text-zinc-500">{c.email}</div>
                          {c.videoUrl && (
                            <div className="mt-2 text-sm">
                              <Link to={`/learning-library?videoUrl=${encodeURIComponent(c.videoUrl)}`} className="flex items-center gap-2 text-blue-400 hover:text-blue-300">
                                <Video className="h-4 w-4" /> Watch Video
                              </Link>
                            </div>
                          )}
                          {c.learningCenterUrl && (
                            <div className="mt-2 text-sm">
                              <Link to={`/learning-library?videoUrl=${encodeURIComponent(c.learningCenterUrl)}`} className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300">
                                <Video className="h-4 w-4" /> Learning Center
                              </Link>
                            </div>
                          )}
                          {c.videoNote && (
                            <div className="mt-2 p-2 rounded bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 italic">
                              Note: {c.videoNote}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {c.year} {c.vehicle} {c.model}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs">
                          {c.howFound === 'other' ? c.howFoundOther : c.howFound || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 max-w-[200px] truncate" title={c.notes}>{c.notes || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleArchiveId(c)} className="h-8 w-8 p-0 text-zinc-400 hover:text-amber-400" title={c.is_archived ? "Restore" : "Archive"}>
                            {c.is_archived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(c)} className="h-8 w-8 p-0 text-zinc-400 hover:text-white"><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteCustomerId(c.id!)} className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></Button>
                          {!c.is_archived && (
                            <Button asChild variant="outline" size="sm" className="h-8 text-xs border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 ml-2">
                              <Link to={`/bookings?add=true&customerId=${c.id}&customerName=${encodeURIComponent(c.name)}&vehicleYear=${encodeURIComponent(c.year || '')}&vehicleMake=${encodeURIComponent(c.vehicle || '')}&vehicleModel=${encodeURIComponent(c.model || '')}`}>Convert</Link>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-4">
          {filteredCustomers.map(c => (
            <div key={c.id} className="bg-zinc-900 border border-purple-500/20 p-4 rounded-xl space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <div
                    className="h-10 w-10 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 cursor-pointer hover:border-purple-400 flex items-center justify-center text-zinc-400 font-bold"
                    onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                  >
                    {(c.generalPhotos?.[0] || c.beforePhotos?.[0] || c.afterPhotos?.[0]) ? (
                      <img
                        src={c.generalPhotos?.[0] || c.beforePhotos?.[0] || c.afterPhotos?.[0]}
                        alt={c.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>{c.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-200 text-lg">{c.name}</h3>
                    <p className="text-zinc-400 text-sm">{c.phone}</p>
                  </div>
                </div>
                {!c.is_archived && (
                  <Button asChild variant="outline" size="sm" className="h-8 text-xs border-purple-500/30 text-purple-400 bg-purple-500/10">
                    <Link to={`/bookings?add=true&customerId=${c.id}&customerName=${encodeURIComponent(c.name)}`}>Convert</Link>
                  </Button>
                )}
              </div>
              {c.notes && <div className="text-sm text-zinc-500 italic border-l-2 border-zinc-700 pl-2">{c.notes}</div>}
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <Button variant="ghost" size="sm" onClick={() => handleArchiveId(c)} className="h-8 text-zinc-400 hover:text-amber-400">
                  {c.is_archived ? <><RotateCcw className="h-4 w-4 mr-2" /> Restore</> : <><Archive className="h-4 w-4 mr-2" /> Archive</>}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(c)} className="h-8 text-zinc-400"><Pencil className="h-4 w-4 mr-2" /> Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteCustomerId(c.id!)} className="h-8 text-red-500"><Trash2 className="h-4 w-4 mr-2" /> Del</Button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <AlertDialog open={deleteCustomerId !== null} onOpenChange={() => setDeleteCustomerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Permanently?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CustomerModal open={modalOpen} onOpenChange={setModalOpen} initial={editing} onSave={onSaveModal} defaultType="prospect" />
    </div>
  );
};

export default Prospects;
