import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CustomerModal, { type Customer as ModalCustomer } from "@/components/customers/CustomerModal";
import { getCustomers, deleteCustomer as removeCustomer, upsertCustomer } from "@/lib/db";
import { getUnifiedCustomers } from "@/lib/customers";
import { upsertSupabaseCustomer, Customer } from "@/lib/supa-data";
import api from "@/lib/api";
import { Search, Pencil, Trash2, Plus, Save, Users, Archive, RotateCcw, Image as ImageIcon, Video, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, MapPin, CalendarPlus, FileBarChart } from "lucide-react";
import { PhotoGalleryLightbox } from "@/components/gallery/PhotoGalleryLightbox";
import { getYouTubeThumbnail } from "@/lib/youtube";
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedThisMount, setHasLoadedThisMount] = useState(false);
  const [expandedCustomers, setExpandedCustomers] = useState<string[]>([]);
  const [allExpanded, setAllExpanded] = useState(false);
  const [openMaps, setOpenMaps] = useState<string[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<{ url: string; label?: string }[]>([]);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

  useEffect(() => {
    // Always load fresh data on mount to ensure we see new prospects
    // But only once per mount to avoid duplicate calls
    if (!hasLoadedThisMount) {
      refresh();
      setHasLoadedThisMount(true);
    }
  }, []);

  const refresh = async () => {
    setIsRefreshing(true);
    setLoading(true);
    try {
      const list = await getUnifiedCustomers();
      console.log('🔍 All unified customers:', list);
      console.log('🔍 Total count:', list.length);
      console.log('🔍 Each customer:', list.map(c => ({ name: c.name, type: c.type })));

      const prospects = (list as Customer[]).filter(c => c.type === 'prospect');
      console.log('🔍 Filtered prospects:', prospects);
      console.log('🔍 Prospects count:', prospects.length);
      console.log('🔍 Prospect names:', prospects.map(p => p.name));

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
      setIsRefreshing(false);
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
          color: data.color,
          mileage: data.mileage
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
      console.error('❌ Supabase upsertSupabaseCustomer failed:', err);
      console.error('Error details:', { message: err?.message, code: err?.code, details: err?.details, hint: err?.hint });
      const saved = await upsertCustomer(data as any);
      await refresh();
      setModalOpen(false);
      toast({
        title: "Saved locally",
        description: `Backend unavailable: ${err?.message || 'Connection error'}`,
        variant: 'default'
      });
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

  const openGallery = (customer: Customer, startIndex = 0) => {
    const photos: { url: string; label?: string }[] = [];
    customer.generalPhotos?.forEach((url) => photos.push({ url, label: "General" }));
    customer.beforePhotos?.forEach((url) => photos.push({ url, label: "Before" }));
    customer.afterPhotos?.forEach((url) => photos.push({ url, label: "After" }));
    setGalleryPhotos(photos);
    setGalleryInitialIndex(startIndex);
    setGalleryOpen(true);
  };

  const toggleMap = (id: string) => { setOpenMaps(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };
  const toggleCustomer = (id: string) => { setExpandedCustomers(prev => (prev.includes(id) ? [] : [id])); setAllExpanded(false); };
  const toggleAll = () => {
    if (allExpanded) setExpandedCustomers([]);
    else setExpandedCustomers(filteredCustomers.map(c => c.id!));
    setAllExpanded(!allExpanded);
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
              variant="ghost"
              size="sm"
              onClick={refresh}
              disabled={isRefreshing}
              className="gap-2 text-zinc-400 hover:text-white"
            >
              <RotateCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
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
            {filteredCustomers.length > 0 && (
              <Button variant="ghost" size="sm" onClick={toggleAll} className="text-zinc-400">
                {allExpanded ? <ChevronsUp className="h-4 w-4" /> : <ChevronsDown className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        {/* Accordion Cards View */}
        <div className="space-y-4">
          {[...filteredCustomers]
            .sort((a, b) => { const da = a.updatedAt || ""; const db = b.updatedAt || ""; return (db ? new Date(db).getTime() : 0) - (da ? new Date(da).getTime() : 0); })
            .map((customer) => {
              const isExpanded = expandedCustomers.includes(customer.id!);
              if (!allExpanded && expandedCustomers.length > 0 && !isExpanded) return null;

              return (
                <div key={customer.id} className="border border-purple-500/20 rounded-xl overflow-hidden bg-zinc-900/50 transition-all hover:border-purple-500/40">
                  <div className="p-4 bg-purple-500/5 flex flex-col md:flex-row items-center justify-between cursor-pointer hover:bg-purple-500/10 transition-colors gap-4" onClick={() => toggleCustomer(customer.id!)}>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className={`h-2 w-2 rounded-full ${isExpanded ? 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'bg-zinc-600'}`} />

                      {/* Photo Thumbnails - clickable to open gallery */}
                      {(customer.generalPhotos?.length || customer.beforePhotos?.length || customer.afterPhotos?.length) ? (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          {customer.generalPhotos?.slice(0, 3).map((photo, idx) => (
                            <div
                              key={`thumb-g-${idx}`}
                              className="h-12 w-12 rounded-lg border-2 border-zinc-700 overflow-hidden cursor-pointer hover:border-purple-400 transition-all hover:scale-105"
                              onClick={() => openGallery(customer, idx)}
                            >
                              <img src={photo} alt={`${customer.name} - General ${idx + 1}`} className="h-full w-full object-cover" />
                            </div>
                          ))}
                          {(customer.beforePhotos?.length || 0) + (customer.afterPhotos?.length || 0) + (customer.generalPhotos?.length || 0) > 3 && (
                            <button
                              onClick={() => openGallery(customer, 0)}
                              className="h-12 w-12 rounded-lg border-2 border-purple-500/50 bg-purple-500/10 flex items-center justify-center text-purple-400 text-xs font-bold hover:bg-purple-500/20 transition-all hover:scale-105"
                            >
                              +{(customer.beforePhotos?.length || 0) + (customer.afterPhotos?.length || 0) + (customer.generalPhotos?.length || 0) - 3}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div
                          className="h-12 w-12 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 cursor-pointer hover:border-purple-400 flex items-center justify-center text-zinc-400 font-bold"
                          onClick={(e) => { e.stopPropagation(); openEdit(customer); }}
                        >
                          <span>{(customer.name || 'U').charAt(0).toUpperCase()}</span>
                        </div>
                      )}

                      <div><h3 className="font-bold text-zinc-200 text-lg flex items-center gap-2">{customer.name}</h3><div className="flex gap-3 text-sm text-zinc-400"><span>{customer.phone || 'No phone'}</span><span className="hidden sm:inline">•</span><span className="hidden sm:inline">{customer.vehicle} {customer.model}</span></div></div>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                      <div className="flex gap-1 mr-4">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleArchiveId(customer); }} className="h-8 w-8 p-0 text-zinc-400 hover:text-amber-400" title={customer.is_archived ? "Restore" : "Archive"}>
                          {customer.is_archived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(customer); }} className="h-8 w-8 p-0 text-zinc-400 hover:text-white"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteCustomerId(customer.id!); }} className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                      {isExpanded ? <ChevronUp className="h-5 w-5 text-zinc-500" /> : <ChevronDown className="h-5 w-5 text-zinc-500" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-6 border-t border-purple-500/10 bg-zinc-900/30 animate-in slide-in-from-top-2">
                      <div className="flex justify-end mb-6 gap-2 border-b border-zinc-800 pb-4">
                        {!customer.is_archived && (
                          <Button asChild variant="outline" size="sm" className="h-9 border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300">
                            <Link to={`/bookings?add=true&customerId=${customer.id}&customerName=${encodeURIComponent(customer.name)}&vehicleYear=${encodeURIComponent(customer.year || '')}&vehicleMake=${encodeURIComponent(customer.vehicle || '')}&vehicleModel=${encodeURIComponent(customer.model || '')}`}><CalendarPlus className="h-4 w-4 mr-2" /> Convert to Customer</Link>
                          </Button>
                        )}
                        <Button asChild variant="outline" size="sm" className="h-9 border-zinc-700 hover:bg-zinc-800"><Link to={`/service-checklist?customerId=${customer.id}`}><FileBarChart className="h-4 w-4 mr-2" /> Start Service</Link></Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <section><h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-3">Vehicle Details</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-zinc-950 p-3 rounded border border-zinc-800/50"><div className="text-zinc-500 text-xs">Vehicle</div><div className="text-zinc-200 font-medium">{customer.year} {customer.vehicle} {customer.model}</div></div>
                              <div className="bg-zinc-950 p-3 rounded border border-zinc-800/50"><div className="text-zinc-500 text-xs">Type/Color</div><div className="text-zinc-200 font-medium">{customer.vehicleType || '-'} / {customer.color || '-'}</div></div>
                              <div className="bg-zinc-950 p-3 rounded border border-zinc-800/50"><div className="text-zinc-500 text-xs">Mileage</div><div className="text-zinc-200 font-medium">{customer.mileage || '-'}</div></div>
                            </div>
                          </section>
                          <section><h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-3">Contact info</h4>
                            <div className="space-y-3">
                              <div className="flex gap-2 items-center"><div className="w-20 text-zinc-500 text-sm">Email</div><div className="text-zinc-300 text-sm">{customer.email || '—'}</div></div>
                              <div className="flex gap-2 items-center"><div className="w-20 text-zinc-500 text-sm">Address</div><div className="text-zinc-300 text-sm flex items-center gap-2">{customer.address || '—'} {customer.address && (<Button variant="ghost" size="sm" className="h-5 px-2 text-xs text-purple-400" onClick={(e) => { e.stopPropagation(); toggleMap(customer.id!); }}><MapPin className="h-3 w-3 mr-1" />{openMaps.includes(customer.id!) ? "Hide Map" : "Map"}</Button>)}</div></div>
                              {openMaps.includes(customer.id!) && customer.address && (<div className="mt-2 w-full h-48 rounded-lg overflow-hidden border border-zinc-800"><iframe width="100%" height="100%" frameBorder="0" scrolling="no" src={`https://maps.google.com/maps?q=${encodeURIComponent(customer.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`} title="Map" /></div>)}
                            </div>
                          </section>
                          {customer.notes && (<section className="bg-amber-900/10 border border-amber-500/20 p-3 rounded"><div className="text-amber-500 text-xs font-bold mb-1">Notes</div><div className="text-amber-200/80 text-sm italic">{customer.notes}</div></section>)}

                          {/* Media Gallery Section */}
                          {((customer.generalPhotos && customer.generalPhotos.length > 0) ||
                            (customer.beforePhotos && customer.beforePhotos.length > 0) ||
                            (customer.afterPhotos && customer.afterPhotos.length > 0) ||
                            customer.videoUrl) && (
                              <section>
                                <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2"><ImageIcon className="h-3 w-3" /> Media Gallery</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  {customer.generalPhotos?.map((p, i) => {
                                    const photoIndex = i;
                                    return (
                                      <div
                                        key={`g-${i}`}
                                        className="relative aspect-square rounded overflow-hidden border border-zinc-700 bg-zinc-950 cursor-pointer hover:border-purple-400 transition-all hover:scale-105"
                                        onClick={() => openGallery(customer, photoIndex)}
                                      >
                                        <img src={p} alt="General" className="w-full h-full object-cover" />
                                      </div>
                                    );
                                  })}
                                  {customer.beforePhotos?.map((p, i) => {
                                    const photoIndex = (customer.generalPhotos?.length || 0) + i;
                                    return (
                                      <div
                                        key={`b-${i}`}
                                        className="relative aspect-square rounded overflow-hidden border border-zinc-700 bg-zinc-950 cursor-pointer hover:border-purple-400 transition-all hover:scale-105"
                                        onClick={() => openGallery(customer, photoIndex)}
                                      >
                                        <div className="absolute top-0 left-0 bg-black/50 text-[10px] px-1 text-white">Before</div>
                                        <img src={p} alt="Before" className="w-full h-full object-cover" />
                                      </div>
                                    );
                                  })}
                                  {customer.afterPhotos?.map((p, i) => {
                                    const photoIndex = (customer.generalPhotos?.length || 0) + (customer.beforePhotos?.length || 0) + i;
                                    return (
                                      <div
                                        key={`a-${i}`}
                                        className="relative aspect-square rounded overflow-hidden border border-zinc-700 bg-zinc-950 cursor-pointer hover:border-purple-400 transition-all hover:scale-105"
                                        onClick={() => openGallery(customer, photoIndex)}
                                      >
                                        <div className="absolute top-0 left-0 bg-black/50 text-[10px] px-1 text-white">After</div>
                                        <img src={p} alt="After" className="w-full h-full object-cover" />
                                      </div>
                                    );
                                  })}
                                </div>
                                {customer.videoUrl && (
                                  <div className="mt-4">
                                    <a
                                      href={customer.videoUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="relative block aspect-video rounded overflow-hidden border-2 border-purple-500/30 bg-zinc-950 hover:border-purple-400 transition-all group"
                                    >
                                      {getYouTubeThumbnail(customer.videoUrl) ? (
                                        <>
                                          <img
                                            src={getYouTubeThumbnail(customer.videoUrl)!}
                                            alt="Video thumbnail"
                                            className="w-full h-full object-cover"
                                          />
                                          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center">
                                            <div className="bg-red-600 rounded-full p-4 group-hover:scale-110 transition-transform">
                                              <Video className="h-8 w-8 text-white" />
                                            </div>
                                          </div>
                                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                                            <p className="text-white text-sm font-medium flex items-center gap-2">
                                              <Video className="h-4 w-4" /> Before/After Showcase Video
                                            </p>
                                          </div>
                                        </>
                                      ) : (
                                        <div className="flex items-center justify-center gap-2 text-purple-400 hover:text-purple-300">
                                          <Video className="h-4 w-4" /> Watch Video
                                        </div>
                                      )}
                                    </a>
                                  </div>
                                )}
                                {customer.learningCenterUrl && (
                                  <div className="mt-2 text-sm">
                                    <Link to={`/learning-library?videoUrl=${encodeURIComponent(customer.learningCenterUrl)}`} className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300">
                                      <Video className="h-4 w-4" /> Learning Center
                                    </Link>
                                  </div>
                                )}
                                {customer.videoNote && (
                                  <div className="mt-2 p-2 rounded bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 italic">
                                    Note: {customer.videoNote}
                                  </div>
                                )}
                              </section>
                            )}
                        </div>

                        <div>
                          <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-3">Prospect Info</h4>
                          <div className="space-y-3 bg-zinc-950 p-4 rounded border border-zinc-800/50">
                            <div className="flex items-center gap-2"><span className="text-zinc-500 text-sm w-24">Source:</span><span className="inline-flex items-center px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300">{customer.howFound === 'other' ? customer.howFoundOther : customer.howFound || '—'}</span></div>
                            <div className="flex items-center gap-2"><span className="text-zinc-500 text-sm w-24">Created:</span><span className="text-zinc-300 text-sm">{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : '—'}</span></div>
                            <div className="flex items-center gap-2"><span className="text-zinc-500 text-sm w-24">Last Updated:</span><span className="text-zinc-300 text-sm">{customer.updatedAt ? new Date(customer.updatedAt).toLocaleDateString() : '—'}</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Mobile View - Keep Existing */}
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
                      <span>{(c.name || 'U').charAt(0).toUpperCase()}</span>
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

      <PhotoGalleryLightbox
        photos={galleryPhotos}
        initialIndex={galleryInitialIndex}
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
      />

      <CustomerModal open={modalOpen} onOpenChange={setModalOpen} initial={editing} onSave={onSaveModal} defaultType="prospect" />
    </div>
  );
};

export default Prospects;
