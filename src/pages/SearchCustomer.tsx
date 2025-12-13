import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CustomerModal, { type Customer as ModalCustomer } from "@/components/customers/CustomerModal";
import { getCustomers, deleteCustomer as removeCustomer, upsertCustomer } from "@/lib/db";
import { getSupabaseCustomers, upsertSupabaseCustomer } from "@/lib/supa-data";
import { useBookingsStore } from "@/store/bookings";
import { useTasksStore } from "@/store/tasks";
import api from "@/lib/api";
import { Search, Pencil, Trash2, Plus, Save, ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, FileBarChart, MapPin, CalendarPlus, History, Calendar, Users, Archive, RotateCcw } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
}

const SearchCustomer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const { items: allBookings } = useBookingsStore();
  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [autoOpenedAdd, setAutoOpenedAdd] = useState(false);
  const [dateFilter, setDateFilter] = useState<"all" | "daily" | "weekly" | "monthly">("all");
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    try {
      const list = await getSupabaseCustomers();
      setCustomers(Array.isArray(list) ? (list as Customer[]) : []);
    } catch (err: any) {
      console.error('Refresh customers failed:', err);
      try {
        const fallback = await getCustomers();
        setCustomers(Array.isArray(fallback) ? (fallback as Customer[]) : []);
      } catch (err2) {
        setCustomers([]);
      }
    }
  };

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); setModalOpen(true); };

  const onSaveModal = async (data: ModalCustomer) => {
    try {
      await upsertSupabaseCustomer({
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        notes: data.notes,
        type: data.type || 'customer',
        is_archived: (data as any).is_archived || false,
        vehicle_info: {
          make: data.vehicle,
          model: data.model,
          year: data.year,
          type: data.vehicleType,
          color: data.color
        }
      });
      await api('/api/customers', { method: 'POST', body: JSON.stringify(data) }).catch(() => { });
      await refresh();
      setModalOpen(false);
      toast({ title: "Customer Saved", description: "Record stored." });
    } catch (err: any) {
      try {
        await upsertCustomer(data as any);
        await refresh();
        setModalOpen(false);
        toast({ title: "Saved locally", description: "Backend unavailable; stored offline.", variant: 'default' });
      } catch (err2: any) {
        toast({ title: "Save failed", description: err2?.message || String(err2), variant: 'destructive' });
      }
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const flag = params.get("add");
    const shouldOpen = flag === "true" || flag === "1" || (flag === null && params.has("add"));
    if (shouldOpen && !autoOpenedAdd) {
      setEditing(null);
      setModalOpen(true);
      setAutoOpenedAdd(true);
    }
  }, [location.search, autoOpenedAdd]);

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
    if (customer.type === 'prospect') return false;

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

    // Force refresh of stores that might hold stale data in memory
    useBookingsStore.getState().refresh();
    useTasksStore.getState().refresh();

    await refresh();
    toast({ title: "Deleted", description: "Records removed." });
    setDeleteCustomerId(null);
  };

  const generatePDF = (download = false) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text(`Customer List (${showArchived ? 'Archived' : 'Active'})`, 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, y);
    y += 15;

    filteredCustomers.forEach((c) => {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFillColor(59, 130, 246);
      doc.rect(14, y, pageWidth - 28, 10, 'F');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(c.name || "Unknown", 18, y + 7);
      y += 15;
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      const leftX = 18; const rightX = 110; const rowHeight = 6; const startY = y;
      doc.setFont("helvetica", "bold"); doc.text("Contact Info", leftX, y); y += rowHeight;
      doc.setFont("helvetica", "normal");
      doc.text(`Phone: ${c.phone || "N/A"}`, leftX, y); y += rowHeight;
      doc.text(`Email: ${c.email || "N/A"}`, leftX, y); y += rowHeight;

      let rightY = startY;
      doc.setFont("helvetica", "bold"); doc.text("Vehicle Details", rightX, rightY); rightY += rowHeight;
      doc.setFont("helvetica", "normal");
      doc.text(`Vehicle: ${c.year || ''} ${c.vehicle || ''} ${c.model || ''}`, rightX, rightY); rightY += rowHeight;

      y = Math.max(y, rightY) + 5;
      doc.setDrawColor(200);
      doc.line(14, y, pageWidth - 14, y);
      y += 10;
    });

    if (download) {
      doc.save(`customers_report.pdf`);
    } else {
      window.open(doc.output('bloburl'), '_blank');
    }
  };

  const [expandedCustomers, setExpandedCustomers] = useState<string[]>([]);
  const [allExpanded, setAllExpanded] = useState(false);
  const [openMaps, setOpenMaps] = useState<string[]>([]);

  const toggleMap = (id: string) => { setOpenMaps(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };
  const toggleCustomer = (id: string) => { setExpandedCustomers(prev => (prev.includes(id) ? [] : [id])); setAllExpanded(false); };
  const toggleAll = () => {
    if (allExpanded) setExpandedCustomers([]);
    else setExpandedCustomers(filteredCustomers.map(c => c.id!));
    setAllExpanded(!allExpanded);
  };

  const totalCustomers = filteredCustomers.length;
  const newCustomers = filteredCustomers.filter(c => {
    const d = c.createdAt ? new Date(c.createdAt) : new Date();
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Customer Info" />
      <main className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
        <Card className="p-6 bg-gradient-to-r from-zinc-900 to-zinc-800 border-zinc-700 shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-blue-500/20 text-blue-400"><Users className="h-8 w-8" /></div>
              <div><h2 className="text-2xl font-bold text-white">Customer Database</h2><p className="text-zinc-400 text-sm">Manage client profiles</p></div>
            </div>
            <div className="flex gap-8">
              <div className="text-center"><p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">{showArchived ? 'Archived' : 'Active'}</p><p className="text-3xl font-bold text-white mt-1">{totalCustomers}</p></div>
              <div className="text-center border-l border-zinc-700 pl-8"><p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">New This Month</p><p className="text-3xl font-bold text-blue-400 mt-1">{newCustomers}</p></div>
            </div>
          </div>
        </Card>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
          <div className="relative w-full md:w-96"><Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" /><Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="pl-10 bg-zinc-950 border-zinc-800" /></div>
          <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
            <Button variant={showArchived ? "secondary" : "ghost"} onClick={() => setShowArchived(!showArchived)} className="text-zinc-400 hover:text-white">
              {showArchived ? "Show Active" : "Show Archived"}
            </Button>
            <DateRangeFilter value={dateRange} onChange={setDateRange} storageKey="customers-range" />
            <Button variant="outline" onClick={() => generatePDF(true)} className="border-zinc-700 hover:bg-zinc-800 text-zinc-200"><Save className="h-4 w-4 mr-2" /> PDF</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0" onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Add</Button>
            {filteredCustomers.length > 0 && (
              <Button variant="ghost" size="sm" onClick={toggleAll} className="text-zinc-400">{allExpanded ? <ChevronsUp className="h-4 w-4" /> : <ChevronsDown className="h-4 w-4" />}</Button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {[...filteredCustomers]
            .sort((a, b) => { const da = a.updatedAt || ""; const db = b.updatedAt || ""; return (db ? new Date(db).getTime() : 0) - (da ? new Date(da).getTime() : 0); })
            .map((customer) => {
              const isExpanded = expandedCustomers.includes(customer.id!);
              if (!allExpanded && expandedCustomers.length > 0 && !isExpanded) return null;

              return (
                <div key={customer.id} className="border border-blue-500/20 rounded-xl overflow-hidden bg-zinc-900/50 transition-all hover:border-blue-500/40">
                  <div className="p-4 bg-blue-500/5 flex flex-col md:flex-row items-center justify-between cursor-pointer hover:bg-blue-500/10 transition-colors gap-4" onClick={() => toggleCustomer(customer.id!)}>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className={`h-2 w-2 rounded-full ${isExpanded ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]' : 'bg-zinc-600'}`} />
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
                    <div className="p-6 border-t border-blue-500/10 bg-zinc-900/30 animate-in slide-in-from-top-2">
                      <div className="flex justify-end mb-6 gap-2 border-b border-zinc-800 pb-4">
                        {!customer.is_archived && (
                          <Button asChild variant="outline" size="sm" className="h-9 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300">
                            <Link to={`/bookings?add=true&customerId=${customer.id}&customerName=${encodeURIComponent(customer.name)}`}><CalendarPlus className="h-4 w-4 mr-2" /> Book Job</Link>
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
                              <div className="flex gap-2 items-center"><div className="w-20 text-zinc-500 text-sm">Address</div><div className="text-zinc-300 text-sm flex items-center gap-2">{customer.address || '—'} {customer.address && (<Button variant="ghost" size="sm" className="h-5 px-2 text-xs text-blue-400" onClick={(e) => { e.stopPropagation(); toggleMap(customer.id!); }}><MapPin className="h-3 w-3 mr-1" />{openMaps.includes(customer.id!) ? "Hide Map" : "Map"}</Button>)}</div></div>
                              {openMaps.includes(customer.id!) && customer.address && (<div className="mt-2 w-full h-48 rounded-lg overflow-hidden border border-zinc-800"><iframe width="100%" height="100%" frameBorder="0" scrolling="no" src={`https://maps.google.com/maps?q=${encodeURIComponent(customer.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`} title="Map" /></div>)}
                            </div>
                          </section>
                          {customer.notes && (<section className="bg-amber-900/10 border border-amber-500/20 p-3 rounded"><div className="text-amber-500 text-xs font-bold mb-1">Notes</div><div className="text-amber-200/80 text-sm italic">{customer.notes}</div></section>)}
                        </div>

                        <div>
                          <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2"><History className="h-3 w-3" /> Booking History</h4>
                          <div className="space-y-2">
                            {allBookings.filter(b => (b.customer || '').toLowerCase() === (customer.name || '').toLowerCase()).length > 0 ? (
                              allBookings.filter(b => (b.customer || '').toLowerCase() === (customer.name || '').toLowerCase()).sort((a, b) => {
                                const tA = new Date(a.date).getTime();
                                const tB = new Date(b.date).getTime();
                                return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
                              }).map(booking => (
                                <div key={booking.id} className="p-3 bg-zinc-950 rounded border border-zinc-800 flex items-center justify-between">
                                  <div><div className="flex items-center gap-2"><Calendar className="h-3 w-3 text-zinc-500" /><span className="text-zinc-300 text-sm font-medium">{new Date(booking.date).toLocaleDateString()}</span></div><div className="text-xs text-zinc-500 mt-1">{booking.title}</div></div>
                                  <span className={`text-xs px-2 py-0.5 rounded ${booking.status === 'done' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>{booking.status}</span>
                                </div>
                              ))
                            ) : (<div className="text-center py-8 text-zinc-600 border border-dashed border-zinc-800 rounded">No booking history.</div>)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center p-4 rounded-full bg-zinc-900 mb-4 text-zinc-600"><Search className="h-8 w-8" /></div>
            <h3 className="text-lg font-medium text-zinc-300">No {showArchived ? 'archived' : 'active'} customers found</h3>
            <Button className="mt-4 bg-blue-600 hover:bg-blue-500 text-white" onClick={openAdd}>Add Customer</Button>
          </div>
        )}
      </main>

      <AlertDialog open={deleteCustomerId !== null} onOpenChange={() => setDeleteCustomerId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Permanently?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <CustomerModal open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open && new URLSearchParams(location.search).has("add")) navigate(location.pathname, { replace: true }); }} initial={editing} onSave={async (data) => { await onSaveModal(data); if (new URLSearchParams(location.search).has("add")) navigate(location.pathname, { replace: true }); }} />
    </div>
  );
};

export default SearchCustomer;
