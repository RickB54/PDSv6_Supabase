import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import CustomerModal from "@/components/customers/CustomerModal";
import { getCustomers, deleteCustomer as removeCustomer, upsertCustomer } from "@/lib/db";
import { getUnifiedCustomers } from "@/lib/customers";
import { getSupabaseCustomers, upsertSupabaseCustomer, deleteSupabaseCustomer, deleteSupabaseVehicle, Customer, supabase } from "@/lib/supa-data";
import { useBookingsStore } from "@/store/bookings";
import { useTasksStore } from "@/store/tasks";
import api from "@/lib/api";
import { useDemoMode } from "@/contexts/DemoContext";
import { MOCK_CUSTOMERS } from "@/lib/demoMockData";
import { Search, Pencil, Trash2, Plus, Save, ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, FileBarChart, MapPin, CalendarPlus, History, Calendar, Users, Archive, RotateCcw, Image as ImageIcon, Video, SidebarOpen, Star, Send, Zap, TicketPercent, MessageSquare, ExternalLink, ShieldCheck, Clock, HelpCircle, Car, Activity, Mail, PhoneIncoming, PhoneOutgoing, AlertCircle, StickyNote, FileDown } from "lucide-react";
import { PhotoGalleryLightbox } from "@/components/gallery/PhotoGalleryLightbox";
import { getYouTubeThumbnail } from "@/lib/youtube";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCouponsStore } from "@/store/coupons";
import { useFollowUpStore } from "@/store/followup";
import { onSendReminderEmail, onSendProspectEmail } from "@/lib/bookingsSync";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCurrentUser } from "@/lib/auth";
import { auditEmployeeAction } from "@/lib/audit";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RetentionHub } from "@/components/customers/RetentionHub";
import { ActivityLog } from "@/components/customers/ActivityLog";
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [activeModalTab, setActiveModalTab] = useState("profile");

  const { isDemoMode } = useDemoMode();
  const isAdmin = getCurrentUser()?.role === 'admin' || isDemoMode;

  useEffect(() => {
    refresh();
  }, [isDemoMode]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('search');
    if (q) {
      setSearchTerm(decodeURIComponent(q));
      // Automatically expand if there's an exact or close match
      // We can't easily auto-expand yet because customers are loaded via refresh()
    }
  }, [location.search]);

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      if (isDemoMode) {
        setCustomers(MOCK_CUSTOMERS as any);
        return;
      }
      
      const list = await getSupabaseCustomers();
      console.log('🔍 All Supabase customers in Customer Profiles:', list);

      // Filter for customers only (anyone NOT explicitly a prospect)
      const customersOnly = list.filter(c => {
        const customerType = (c.type || '').toLowerCase();
        return customerType !== 'prospect';
      });

      console.log('🔍 Filtered customers:', customersOnly);
      setCustomers(customersOnly);
    } catch (err: any) {
      console.error('Refresh customers failed:', err);
      try {
        const fallback = await getCustomers();
        setCustomers(Array.isArray(fallback) ? (fallback as any[]) : []);
      } catch (err2) {
        setCustomers([]);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const openAdd = () => { setEditing(null); setActiveModalTab("profile"); setModalOpen(true); };
  const openEdit = (c: Customer, tab: string = "profile") => { setEditing(c); setActiveModalTab(tab); setModalOpen(true); };

  const onSaveModal = async (data: Customer) => {
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
        type: data.type || 'customer',
        is_archived: (data as any).is_archived || false,
        vehicle_info: {
          make: data.vehicle,
          model: data.model,
          year: data.year,
          type: data.vehicleType,
          color: data.color,
          mileage: data.mileage
        },
        vehicles: (data as any).vehicles,
        generalPhotos: data.generalPhotos,
        beforePhotos: data.beforePhotos,
        afterPhotos: data.afterPhotos,
        videoUrl: data.videoUrl,
        learningCenterUrl: data.learningCenterUrl,
        videoNote: data.videoNote,
        howFound: data.howFound,
        howFoundOther: data.howFoundOther
      });
      await api('/api/customers', { method: 'POST', body: JSON.stringify(data) }).catch(() => { });
      await refresh();
      setModalOpen(false);
      toast({ title: "Customer Saved", description: "Record stored." });

      // AUDIT for Employee
      const user = getCurrentUser();
      if (user?.role === 'employee') {
        await auditEmployeeAction(data.id ? 'update' : 'create', 'Customer', data);
      }
    } catch (err: any) {
      console.error('❌ Supabase upsertSupabaseCustomer failed:', err);
      console.error('Error details:', { message: err?.message, code: err?.code, details: err?.details, hint: err?.hint });
      try {
        await upsertCustomer(data as any);
        await refresh();
        setModalOpen(false);
        toast({
          title: "Saved locally",
          description: `Backend unavailable: ${err?.message || 'Connection error'}`,
          variant: 'default'
        });
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
    // Normalize date fields: DB uses snake_case, but some local types might be camelCase
    const baseDateStr = (customer as any).updated_at || (customer as any).created_at || (customer as any).updatedAt || (customer as any).createdAt || customer.lastService;
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

    // Archive Filter - Strict Toggle (Show ONLY archived if true, otherwise show ONLY active)
    const isArchived = customer.is_archived === true;
    if (showArchived) {
      if (!isArchived) return false;
    } else {
      if (isArchived) return false;
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
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(deleteCustomerId)) {
        await deleteSupabaseCustomer(deleteCustomerId);
      }
      await removeCustomer(deleteCustomerId).catch(() => { });
      await refresh();
      toast({ title: "Deleted", description: "Customer permanently removed." });
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error?.message || "Could not delete customer.", variant: "destructive" });
    }
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
      // Check page break with more buffer
      if (y > 230) { doc.addPage(); y = 20; }

      doc.setFillColor(59, 130, 246); // Blue header for Customers
      doc.rect(14, y, pageWidth - 28, 10, 'F');

      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(c.name || "Unknown", 18, y + 7);
      y += 15;

      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      // Detailed Layout similar to Prospects
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

      // Condition / Notes
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
      doc.save(`customers_report.pdf`);
    } else {
      window.open(doc.output('bloburl'), '_blank');
    }
  };

  const [expandedCustomers, setExpandedCustomers] = useState<string[]>([]);
  const [allExpanded, setAllExpanded] = useState(false);
  const [openMaps, setOpenMaps] = useState<string[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<{ url: string; label?: string }[]>([]);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
  const [galleryMetadata, setGalleryMetadata] = useState<any[]>([]);
  const [photoToDelete, setPhotoToDelete] = useState<{ index: number; customer: Customer } | null>(null);

  const openGallery = (customer: Customer, startIndex = 0) => {
    const photos: { url: string; label?: string }[] = [];
    const meta: any[] = [];

    // Customer-level photos
    customer.generalPhotos?.forEach((url, idx) => {
      photos.push({ url, label: "General" });
      meta.push({ type: 'customer', field: 'generalPhotos', arrayIndex: idx, customerId: customer.id });
    });
    customer.beforePhotos?.forEach((url, idx) => {
      photos.push({ url, label: "Before" });
      meta.push({ type: 'customer', field: 'beforePhotos', arrayIndex: idx, customerId: customer.id });
    });
    customer.afterPhotos?.forEach((url, idx) => {
      photos.push({ url, label: "After" });
      meta.push({ type: 'customer', field: 'afterPhotos', arrayIndex: idx, customerId: customer.id });
    });

    // Per-vehicle photos
    (customer.vehicles || []).forEach((v, vIdx) => {
      const vLabel = [v.year, v.make, v.model].filter(Boolean).join(' ') || 'Vehicle';
      v.generalPhotos?.forEach((url, idx) => {
        photos.push({ url, label: `${vLabel} · General` });
        meta.push({ type: 'vehicle', field: 'generalPhotos', vehicleIndex: vIdx, arrayIndex: idx, customerId: customer.id });
      });
      v.beforePhotos?.forEach((url, idx) => {
        photos.push({ url, label: `${vLabel} · Before` });
        meta.push({ type: 'vehicle', field: 'beforePhotos', vehicleIndex: vIdx, arrayIndex: idx, customerId: customer.id });
      });
      v.afterPhotos?.forEach((url, idx) => {
        photos.push({ url, label: `${vLabel} · After` });
        meta.push({ type: 'vehicle', field: 'afterPhotos', vehicleIndex: vIdx, arrayIndex: idx, customerId: customer.id });
      });
    });

    setGalleryPhotos(photos);
    setGalleryMetadata(meta);
    setGalleryInitialIndex(Math.min(startIndex, Math.max(0, photos.length - 1)));
    setGalleryOpen(true);
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    const { index, customer } = photoToDelete;
    const m = galleryMetadata[index];
    if (!m) return;

    try {
      const updatedCustomer = { ...customer };
      if (m.type === 'customer') {
        const arr = [...(updatedCustomer[m.field as keyof Customer] as string[])];
        arr.splice(m.arrayIndex, 1);
        (updatedCustomer as any)[m.field] = arr;
      } else if (m.type === 'vehicle') {
        const vehicles = [...(updatedCustomer.vehicles || [])];
        const v = { ...vehicles[m.vehicleIndex] };
        const arr = [...(v[m.field as keyof typeof v] as string[])];
        arr.splice(m.arrayIndex, 1);
        (v as any)[m.field] = arr;
        vehicles[m.vehicleIndex] = v;
        updatedCustomer.vehicles = vehicles;
      }

      await upsertSupabaseCustomer(updatedCustomer);
      toast({ title: "Deleted", description: "Photo removed from archive." });
      setGalleryOpen(false);
      refresh();
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete photo.", variant: "destructive" });
    } finally {
      setPhotoToDelete(null);
    }
  };

  const toggleMap = (id: string) => { setOpenMaps(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };
  const toggleCustomer = (id: string) => {
    const isExpanding = !expandedCustomers.includes(id);
    setExpandedCustomers(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    setAllExpanded(false);
    
    if (isExpanding) {
      setTimeout(() => {
        const el = document.getElementById(`customer-${id}`);
        if (el) {
          const offset = 100; // Account for fixed header
          const elementPosition = el.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - offset;
          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
          });
        }
      }, 150);
    }
  };
  const toggleAll = () => {
    if (expandedCustomers.length === filteredCustomers.length) {
      setExpandedCustomers([]);
      setAllExpanded(false);
    } else {
      setExpandedCustomers(filteredCustomers.map(c => c.id!));
      setAllExpanded(true);
    }
  };

  const totalCustomers = filteredCustomers.length;
  const newCustomers = filteredCustomers.filter(c => {
    const dStr = (c as any).created_at || (c as any).createdAt;
    const d = dStr ? new Date(dStr) : new Date();
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Customer Database" />
      <main className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
        <Card className="p-6 bg-gradient-to-r from-zinc-900 to-zinc-800 border-zinc-700 shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-blue-500/20 text-blue-400"><Users className="h-8 w-8" /></div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-white">Customer Database</h2>
                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'customers' } }))}
                    className="p-1 text-zinc-500 hover:text-blue-400 transition-colors"
                    title="Customer Help"
                  >
                    <HelpCircle className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-zinc-400 text-sm">Manage client profiles</p>
              </div>
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
            <Button variant="ghost" onClick={refresh} className="text-zinc-400 hover:text-white" disabled={isRefreshing}>
              <RotateCcw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button variant={showArchived ? "secondary" : "ghost"} onClick={() => setShowArchived(!showArchived)} className={cn("text-zinc-400 hover:text-white", showArchived && "bg-amber-600/20 text-amber-500 border-amber-600/30")}>
              {showArchived ? "Hide Archived" : "Show Archived"}
            </Button>
            <DateRangeFilter value={dateRange} onChange={setDateRange} storageKey="customers-range" />
            <Button variant="outline" onClick={() => generatePDF(true)} className="border-zinc-700 hover:bg-zinc-800 text-zinc-200"><Save className="h-4 w-4 mr-2" /> PDF</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0" onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Add</Button>
            {filteredCustomers.length > 0 && (
              <Button variant="ghost" size="sm" onClick={toggleAll} className="text-zinc-400">{allExpanded ? <ChevronsUp className="h-4 w-4" /> : <ChevronsDown className="h-4 w-4" />}</Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...filteredCustomers]
            .sort((a, b) => {
              const daStr = (a as any).updated_at || (a as any).updatedAt || "";
              const dbStr = (b as any).updated_at || (b as any).updatedAt || "";
              return (dbStr ? new Date(dbStr).getTime() : 0) - (daStr ? new Date(daStr).getTime() : 0);
            })
            .map((customer) => {
              const isExpanded = expandedCustomers.includes(customer.id!);

              return (
                <div key={customer.id} id={`customer-${customer.id}`} className={cn(
                  "border rounded-xl overflow-hidden transition-all",
                  isExpanded && "md:col-span-2",
                  customer.is_archived
                    ? "bg-green-900/40 border-green-700 hover:bg-green-900/50"
                    : "bg-zinc-900/50 border-blue-500/20 hover:border-blue-500/40"
                )}>
                  <div className={cn("p-4 flex flex-col md:flex-row items-center justify-between cursor-pointer transition-colors gap-4",
                    customer.is_archived ? "hover:bg-green-900/10" : "bg-blue-500/5 hover:bg-blue-500/10"
                  )} onClick={() => toggleCustomer(customer.id!)}>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className={`h-2 w-2 rounded-full ${isExpanded ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]' : 'bg-zinc-600'}`} />

                      {/* Photo Thumbnails - clickable to open gallery */}
                      {(customer.generalPhotos?.length || customer.beforePhotos?.length || customer.afterPhotos?.length) ? (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          {customer.generalPhotos?.slice(0, 3).map((photo, idx) => (
                            <div
                              key={`thumb-g-${idx}`}
                              className="h-12 w-12 rounded-lg border-2 border-zinc-700 overflow-hidden cursor-pointer hover:border-blue-400 transition-all hover:scale-105"
                              onClick={() => openGallery(customer, idx)}
                            >
                              <img src={photo} alt={`${customer.name} - General ${idx + 1}`} className="h-full w-full object-cover" />
                            </div>
                          ))}
                          {(customer.beforePhotos?.length || 0) + (customer.afterPhotos?.length || 0) + (customer.generalPhotos?.length || 0) > 3 && (
                            <button
                              onClick={() => openGallery(customer, 0)}
                              className="h-12 w-12 rounded-lg border-2 border-blue-500/50 bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition-all hover:scale-105"
                            >
                              +{(customer.beforePhotos?.length || 0) + (customer.afterPhotos?.length || 0) + (customer.generalPhotos?.length || 0) - 3}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div
                          className="h-12 w-12 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 cursor-pointer hover:border-blue-400 flex items-center justify-center text-zinc-400 font-bold"
                          onClick={(e) => { e.stopPropagation(); openEdit(customer); }}
                        >
                          <span>{(customer.name || 'U').charAt(0).toUpperCase()}</span>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                           <h3 className="font-bold text-zinc-200 text-lg">{customer.name}</h3>
                           {customer.is_archived && (
                             <Badge variant="outline" className="h-5 bg-zinc-500/20 text-zinc-500 border-zinc-500/30 gap-1 px-1.5 ml-2">
                               <Archive className="h-3 w-3" />
                               <span className="text-[9px] font-black uppercase tracking-tight">ARCHIVED</span>
                             </Badge>
                           )}
                           {customer.has_google_review && (
                             <Badge variant="outline" className="h-5 bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1 px-1.5 ml-2">
                               <Star className="h-3 w-3 fill-amber-500" />
                               <span className="text-[9px] font-black uppercase tracking-tight">VIP</span>
                             </Badge>
                           )}
                        </div>
                        <div className="flex gap-3 text-sm text-zinc-400">
                          <span>{customer.phone || 'No phone'}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline">{customer.vehicle} {customer.model}</span>
                          {customer.notes && !isExpanded && (
                            <span className="hidden lg:inline text-blue-400 italic truncate max-w-[200px]">
                              • "{customer.notes.substring(0, 40)}{customer.notes.length > 40 ? '...' : ''}"
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                      <div className="flex gap-1 mr-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleArchiveId(customer); }}
                          className={cn("h-8 px-2 text-xs gap-1 transition-all", customer.is_archived ? "text-amber-500 bg-amber-500/10 hover:bg-amber-500/20" : "text-zinc-400 hover:text-amber-400")}
                          title={customer.is_archived ? "Restore" : "Archive"}
                        >
                          {customer.is_archived ? <><RotateCcw className="h-4 w-4" /> Restore</> : <Archive className="h-4 w-4" />}
                        </Button>
                         <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(customer); }} className="h-8 w-8 p-0 text-zinc-400 hover:text-white"><Pencil className="h-4 w-4" /></Button>
                         {isAdmin && (
                           <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteCustomerId(customer.id!); }} className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400">
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         )}
                      </div>
                      {isExpanded ? <ChevronUp className="h-5 w-5 text-zinc-500" /> : <ChevronDown className="h-5 w-5 text-zinc-500" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-6 border-t border-blue-500/10 bg-zinc-900/30 animate-in slide-in-from-top-2">
                      <div className="flex justify-end mb-6 gap-2 border-b border-zinc-800 pb-4">
                        {!customer.is_archived && (
                          <Button asChild variant="outline" size="sm" className="h-9 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300">
                            <Link to={`/bookings?add=true&customerId=${customer.id}&customerName=${encodeURIComponent(customer.name)}&email=${encodeURIComponent(customer.email || '')}&phone=${encodeURIComponent(customer.phone || '')}&address=${encodeURIComponent(customer.address || '')}&vehicleYear=${encodeURIComponent(customer.year || '')}&vehicleMake=${encodeURIComponent(customer.vehicle || '')}&vehicleModel=${encodeURIComponent(customer.model || '')}&vehicleType=${encodeURIComponent(customer.vehicleType || '')}`}><CalendarPlus className="h-4 w-4 mr-2" /> Book Job</Link>
                          </Button>
                        )}
                        <Button asChild variant="outline" size="sm" className="h-9 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300">
                          <Link to={`/service-checklist?customerId=${customer.id}`}><FileBarChart className="h-4 w-4 mr-2" /> Start Service</Link>
                        </Button>
                        <Button asChild variant="outline" size="sm" className="h-9 border-pink-500/30 text-pink-400 hover:bg-pink-500/10 hover:text-pink-300">
                          <Link to={`/vehicle-gallery?customerId=${customer.id}`}><Video className="h-4 w-4 mr-2" /> Gallery</Link>
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* LEFT COLUMN: IDENTIFICATION & MARKETING */}
                        <div className="space-y-6">
                          <section>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Garage ({customer.vehicles?.length || 0})</h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[9px] font-black text-blue-400 hover:text-blue-300 gap-1"
                                onClick={(e) => { e.stopPropagation(); openEdit(customer); }}
                              >
                                <Plus className="w-2.5 h-2.5" /> ADD VEHICLE
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {(() => {
                                const vehicles = customer.vehicles || [];
                                if (vehicles.length === 0) {
                                  // Fallback to legacy fields if no vehicles in garage
                                  const v_year = (customer.year && customer.year !== '-' && customer.year !== '---') ? customer.year : '';
                                  const v_make = customer.vehicle || '-';
                                  const v_model = customer.model || '';
                                  return (
                                    <div className="bg-zinc-950 p-3 rounded border border-zinc-800/50 flex items-center justify-between">
                                      <div>
                                        <div className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-0.5">Primary Vehicle</div>
                                        <div className="text-zinc-200 text-sm font-black tracking-tight">{v_year ? `${v_year} ` : ''}{v_make} {v_model}</div>
                                      </div>
                                      <Badge variant="outline" className="text-[8px] text-zinc-600 border-zinc-800">LEGACY DATA</Badge>
                                    </div>
                                  );
                                }

                                return vehicles.map((v: any, vIdx: number) => {
                                  const vy = (v.year && v.year !== '-' && v.year !== '---') ? v.year : '';
                                  return (
                                    <div key={vIdx} className="bg-zinc-950 p-3 rounded border border-zinc-800/50 flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/10 rounded-lg">
                                          <Car className="w-3.5 h-3.5 text-blue-400" />
                                        </div>
                                        <div>
                                          <div className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-0.5">{vIdx === 0 ? 'Primary Vehicle' : `Vehicle #${vIdx+1}`}</div>
                                          <div className="text-zinc-200 text-sm font-black tracking-tight">{vy ? `${vy} ` : ''}{v.make} {v.model}</div>
                                          <div className="text-[9px] text-zinc-500 font-bold uppercase">{v.type || 'Standard'} {v.color ? `• ${v.color}` : ''}</div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {vIdx === 0 && <Badge variant="outline" className="text-[8px] border-blue-500/30 text-blue-400 bg-blue-500/5">DEFAULT</Badge>}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0 text-zinc-600 hover:text-red-500 transition-colors"
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            if (confirm(`Remove this ${v.make} ${v.model} from garage?`)) {
                                              setCustomers(prev => prev.map(c => {
                                                if (c.id === customer.id) {
                                                  return { ...c, vehicles: (c.vehicles || []).filter((veh: any) => veh.id !== v.id) };
                                                }
                                                return c;
                                              }));
                                              try {
                                                await deleteSupabaseVehicle(v.id);
                                                toast({ title: "Success", description: "Vehicle removed" });
                                              } catch (err: any) {
                                                toast({ 
                                                  title: "Error", 
                                                  description: err.message || "Failed to remove vehicle",
                                                  variant: "destructive"
                                                });
                                                refresh();
                                              }
                                            }
                                          }}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </section>

                           <section className="bg-zinc-950/40 p-5 rounded-2xl border border-zinc-800/50 space-y-4">
                              <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Communication Overview</h4>
                              <div className="space-y-3">
                                 <div className="flex gap-2 items-center"><div className="w-20 text-zinc-500 text-[10px] font-black uppercase tracking-widest">Email</div><div className="text-zinc-300 text-sm font-semibold truncate">{customer.email || '—'}</div></div>
                                 <div className="flex gap-2 items-center"><div className="w-20 text-zinc-500 text-[10px] font-black uppercase tracking-widest">Address</div><div className="text-zinc-300 text-sm flex items-center gap-2">{customer.address || '—'} {customer.address && (<Button variant="ghost" size="sm" className="h-5 px-2 text-xs text-blue-400" onClick={(e) => { e.stopPropagation(); toggleMap(customer.id!); }}><MapPin className="h-3 w-3 mr-1" />{openMaps.includes(customer.id!) ? "Hide Map" : "Map"}</Button>)}</div></div>
                                 <div className="pt-4 border-t border-zinc-800/50">
                                   <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block mb-2">Status Tracking</span>
                                   <div className="flex items-center gap-2">
                                      <Star className={cn("h-4 w-4", customer.has_google_review ? "fill-amber-500 text-amber-500" : "text-zinc-700")} />
                                      <span className="text-xs font-bold text-zinc-300">{customer.has_google_review ? 'Identity Verified VIP' : 'No review response recorded'}</span>
                                   </div>
                                 </div>
                              </div>
                              {openMaps.includes(customer.id!) && customer.address && (<div className="mt-2 w-full h-48 rounded-lg overflow-hidden border border-zinc-800 shadow-2xl"><iframe width="100%" height="100%" frameBorder="0" scrolling="no" src={`https://maps.google.com/maps?q=${encodeURIComponent(customer.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`} title="Map" /></div>)}
                           </section>

                        </div>

                        {/* RIGHT COLUMN: TIMELINE */}
                        <div className="space-y-6">
                           {customer.notes && (
                             <section className="bg-blue-900/10 border border-blue-500/20 p-5 rounded-2xl shadow-lg animate-in fade-in slide-in-from-right-4 duration-500">
                               <div className="text-blue-500 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2"><ShieldCheck className="w-3 h-3" /> Admin Directive</div>
                               <div className="text-zinc-300 text-sm italic leading-relaxed tracking-tight font-medium">"{customer.notes}"</div>
                             </section>
                           )}

                           <section>
                             <div className="flex items-center justify-between mb-4">
                               <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                 <History className="h-3.5 w-3.5" /> Combined Session & Interaction Timeline
                               </h4>
                               <div className="flex items-center gap-2">
                                 <Button
                                   variant="outline"
                                   size="sm"
                                   className="h-8 text-[10px] font-black text-emerald-400 hover:text-white border-emerald-500/20 hover:bg-emerald-500 px-4 rounded-lg transition-all gap-1.5"
                                   onClick={(e) => { 
                                     e.stopPropagation(); 
                                     const relatedBookings = allBookings.filter(b => 
                                       (b.customerId === customer.id) || 
                                       (customer.email && b.customerEmail?.toLowerCase() === customer.email.toLowerCase()) ||
                                       (b.customer?.toLowerCase() === customer.name?.toLowerCase())
                                     );
                                     exportCustomerHistoryPDF(customer, relatedBookings); 
                                   }}
                                 >
                                   <FileDown className="w-3 h-3" /> EXPORT REPORT
                                 </Button>
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   className="h-8 text-[10px] font-black text-blue-400 hover:text-white bg-blue-500/5 border border-blue-500/20 hover:bg-blue-500 px-4 rounded-lg transition-all gap-1.5"
                                   onClick={(e) => { e.stopPropagation(); openEdit(customer, "crm"); }}
                                 >
                                   <Plus className="w-3 h-3" /> LOG ACTIVITY
                                 </Button>
                               </div>
                             </div>

                             <div className="space-y-4 max-h-[800px] overflow-y-auto custom-scrollbar pr-2">
                               {(() => {
                                 // Combine bookings and activity logs
                                 const items: any[] = [];
                                 
                                 // 1. Add Bookings
                                 allBookings
                                   .filter(b => 
                                     (b.customerId === customer.id) || 
                                     (customer.email && b.customerEmail?.toLowerCase() === customer.email.toLowerCase()) ||
                                     (b.customer?.toLowerCase() === customer.name?.toLowerCase())
                                   )
                                   .forEach(b => items.push({ ...b, timelineType: 'booking' }));

                                 // 2. Add Activity Logs
                                 const activityLog = (customer as any).activity_log || [];
                                 activityLog.forEach((a: any) => items.push({ ...a, timelineType: 'activity' }));

                                 // Sort by date recent first
                                 items.sort((a, b) => new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime());

                                 if (items.length === 0) {
                                   return (
                                     <div className="text-center py-12 text-zinc-700 bg-zinc-950/20 border border-dashed border-zinc-800 rounded-3xl">
                                       <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                       <div className="text-xs font-black uppercase tracking-widest opacity-40">Zero prior history found.</div>
                                     </div>
                                   );
                                 }

                                 return items.map((item, idx) => {
                                   if (item.timelineType === 'booking') {
                                     const booking = item;
                                     const bookingDate = new Date(booking.date);
                                     const dateStr = bookingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                     const timeStr = bookingDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                                     return (
                                       <div key={`booking-${booking.id}-${idx}`} className="p-5 bg-zinc-950 rounded-2xl border border-zinc-800 hover:border-blue-500/40 transition-all group/booking shadow-xl relative overflow-hidden">
                                          <div className={cn("absolute inset-0 opacity-[0.03]", booking.status === 'done' ? "bg-emerald-500" : "bg-blue-500")} />

                                           <div className="flex items-start justify-between mb-4 relative z-10">
                                             <div className="flex-1">
                                               <div className="flex items-center gap-2 mb-2">
                                                 <Calendar className="h-4 w-4 text-blue-500" />
                                                 <span className="text-zinc-200 text-sm font-black uppercase tracking-tight">{dateStr}</span>
                                                 <span className="text-zinc-600 text-xs">•</span>
                                                 <span className="text-zinc-400 text-xs font-bold">{timeStr}</span>
                                               </div>
                                               <div className="text-lg text-white font-black uppercase tracking-tighter group-hover/booking:text-blue-400 transition-colors leading-none mb-4">{booking.title || 'Premium Service'}</div>
                                               
                                               <div className="grid grid-cols-2 gap-2">
                                                 <div className="bg-zinc-900/80 px-3 py-2 rounded-xl border border-zinc-800 text-[11px] text-zinc-400">
                                                   <div className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-0.5">Vehicle Managed</div>
                                                   <span className="font-bold text-zinc-300">{booking.vehicleYear || '-'} {booking.vehicleMake || '-'} {booking.vehicleModel || '-'}</span>
                                                 </div>
                                                 <div className="bg-zinc-900/80 px-3 py-2 rounded-xl border border-zinc-800 text-[11px] text-zinc-400">
                                                   <div className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-0.5">Monetary Value</div>
                                                   <span className="text-emerald-500 font-black tracking-tight">${booking.price?.toFixed(2) || '0.00'}</span>
                                                 </div>
                                               </div>
                                             </div>
                                             <Badge className={cn(
                                               "text-[10px] font-black uppercase px-3 py-1 rounded-full border shadow-2xl transition-all",
                                               booking.status === 'done' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                               booking.status === 'confirmed' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                               "bg-zinc-800 text-zinc-500 border-zinc-700"
                                             )}>
                                               {booking.status}
                                             </Badge>
                                           </div>

                                           {booking.notes && (
                                             <div className="mt-2 p-3 bg-blue-900/10 rounded-xl border border-blue-500/10 text-[11px] text-zinc-400 italic leading-relaxed">
                                               "{booking.notes}"
                                             </div>
                                           )}
                                           
                                           <div className="mt-4 pt-4 border-t border-zinc-800/40 flex items-center justify-between">
                                              <div className="text-[9px] text-zinc-600 font-bold uppercase tracking-[0.2em]">Session #{booking.id.slice(-6).toUpperCase()}</div>
                                              <Button 
                                               variant="ghost" 
                                               size="sm" 
                                               className="h-6 text-[9px] font-black text-zinc-500 hover:text-white p-0 gap-1.5"
                                               onClick={(e) => { e.stopPropagation(); navigate('/bookings?id=' + booking.id); }}
                                              >
                                                Inspect <ExternalLink className="h-2.5 w-2.5" />
                                              </Button>
                                           </div>
                                       </div>
                                     );
                                   } else {
                                     // Activity Log entry
                                     const act = item;
                                     const getActivityIcon = (type: string) => {
                                       switch (type) {
                                         case 'call_in': return <PhoneIncoming className="h-4 w-4 text-emerald-400" />;
                                         case 'call_out': return <PhoneOutgoing className="h-4 w-4 text-blue-400" />;
                                         case 'text': return <MessageSquare className="h-4 w-4 text-amber-400" />;
                                         case 'email': return <Mail className="h-4 w-4 text-indigo-400" />;
                                         case 'attempt': return <AlertCircle className="h-4 w-4 text-red-400" />;
                                         default: return <StickyNote className="h-4 w-4 text-zinc-400" />;
                                       }
                                     };

                                     const getActivityLabel = (type: string) => {
                                       switch (type) {
                                         case 'call_in': return 'Incoming Call';
                                         case 'call_out': return 'Outgoing Call';
                                         case 'text': return 'Text Message';
                                         case 'email': return 'Email Sent';
                                         case 'attempt': return 'Contact Attempt';
                                         default: return 'General Note';
                                       }
                                     };

                                     return (
                                       <div key={`act-${act.id || idx}`} className="p-5 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 hover:border-zinc-700 transition-all shadow-lg flex gap-4">
                                          <div className="h-10 w-10 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-center shrink-0">
                                            {getActivityIcon(act.type)}
                                          </div>
                                          <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                              <div className="text-zinc-200 font-black uppercase tracking-tight text-sm">{getActivityLabel(act.type)}</div>
                                              <div className="text-[10px] text-zinc-500 font-bold uppercase">{format(new Date(act.created_at), 'MMMM dd, yyyy · p')}</div>
                                            </div>
                                            <p className="text-xs text-zinc-300 italic leading-relaxed font-medium">"{act.note}"</p>
                                          </div>
                                       </div>
                                     );
                                   }
                                 });
                               })()}
                             </div>
                           </section>
                        </div>
                      </div>
                                            {/* MEDIA GALLERY - dynamic */}
                      {(() => {
                        const allPhotos: {url: string; label: string; type: 'before'|'after'|'general'}[] = [];
                        customer.generalPhotos?.forEach(url => allPhotos.push({url, label: 'General', type: 'general'}));
                        customer.beforePhotos?.forEach(url => allPhotos.push({url, label: 'Before', type: 'before'}));
                        customer.afterPhotos?.forEach(url => allPhotos.push({url, label: 'After', type: 'after'}));
                        for (const v of customer.vehicles || []) {
                          const vLabel = [v.year, v.make, v.model].filter(Boolean).join(' ') || 'Vehicle';
                          v.generalPhotos?.forEach(url => allPhotos.push({url, label: vLabel + ' - General', type: 'general'}));
                          v.beforePhotos?.forEach(url => allPhotos.push({url, label: vLabel + ' - Before', type: 'before'}));
                          v.afterPhotos?.forEach(url => allPhotos.push({url, label: vLabel + ' - After', type: 'after'}));
                        }
                        if (allPhotos.length === 0) return null;

                        const displayPhotos = allPhotos.slice(0, 12);
                        const hasMore = allPhotos.length > 12;

                        return (
                          <div className="mt-12 pt-8 border-t border-zinc-800/50">
                            <div className="flex items-center justify-between mb-6">
                              <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                <ImageIcon className="h-3 w-3" /> Media Archive ({allPhotos.length} items)
                              </h4>
                               <div className="flex items-center gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-7 text-[10px] font-black border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 gap-1.5"
                                  onClick={() => openEdit(customer, "media")}
                                >
                                  <Plus className="w-3 h-3" /> ADD MEDIA
                                </Button>
                                {allPhotos.length > 0 && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-7 text-[10px] font-black border-blue-500/30 text-blue-400 hover:bg-blue-500/10 gap-1.5"
                                    onClick={() => navigate(`/vehicle-gallery?customerId=${customer.id}`)}
                                  >
                                    VIEW ALL <ExternalLink className="w-3 h-3 ml-0.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                              {displayPhotos.map((p, i) => (
                                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 cursor-pointer hover:border-blue-400 transition-all hover:scale-[1.03] shadow-xl" onClick={() => openGallery(customer, i)}>
                                  <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                                  <div className={cn(
                                    "absolute top-2 left-2 text-[9px] px-1.5 py-0.5 rounded text-white font-black uppercase",
                                    p.type === 'before' ? 'bg-orange-600/80' : 
                                    p.type === 'after' ? 'bg-emerald-600/80' : 
                                    'bg-blue-600/60'
                                  )}>{p.type}</div>
                                </div>
                              ))}
                              {hasMore && (
                                <div 
                                  className="relative aspect-square rounded-2xl overflow-hidden border border-dashed border-zinc-700 bg-zinc-950/40 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-900 transition-all group"
                                  onClick={() => navigate(`/vehicle-gallery?customerId=${customer.id}`)}
                                >
                                  <span className="text-xl font-black text-blue-500/50 group-hover:text-blue-400">+{allPhotos.length - 6}</span>
                                  <span className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter">More Assets</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {
          filteredCustomers.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center p-4 rounded-full bg-zinc-900 mb-4 text-zinc-600"><Search className="h-8 w-8" /></div>
              <h3 className="text-lg font-medium text-zinc-300">No {showArchived ? 'archived' : 'active'} customers found</h3>
              <Button className="mt-4 bg-blue-600 hover:bg-blue-500 text-white" onClick={openAdd}>Add Customer</Button>
            </div>
          )
        }
      </main >

      <AlertDialog open={deleteCustomerId !== null} onOpenChange={() => setDeleteCustomerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Permanently?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                const user = getCurrentUser();
                if (user?.role !== 'admin') {
                  toast({
                    title: "Access Denied",
                    description: "You do not have permission to delete customer records. This action has been logged.",
                    variant: "destructive"
                  });
                  setDeleteCustomerId(null);
                  return;
                }
                await handleDelete();
              }} 
              className="bg-destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PhotoGalleryLightbox
        photos={galleryPhotos}
        initialIndex={galleryInitialIndex}
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        isAdmin={isAdmin}
        onDelete={(idx) => {
          const m = galleryMetadata[idx];
          if (!m) return;
          const customer = customers.find(c => c.id === m.customerId);
          if (customer) {
            setPhotoToDelete({ index: idx, customer });
          }
        }}
      />

      <AlertDialog open={photoToDelete !== null} onOpenChange={() => setPhotoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this photo from the archive? This will also remove it from the vehicle gallery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePhoto} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Photo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CustomerModal 
        open={modalOpen} 
        onOpenChange={(open) => { setModalOpen(open); if (!open && new URLSearchParams(location.search).has("add")) navigate(location.pathname, { replace: true }); }} 
        initial={editing} 
        initialTab={activeModalTab}
        onSave={async (data) => { await onSaveModal(data); if (new URLSearchParams(location.search).has("add")) navigate(location.pathname, { replace: true }); }} 
      />
    </div >
  );
};

export default SearchCustomer;


