import { useEffect, useState, useMemo } from "react";
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
import { Search, Pencil, Trash2, Plus, Save, ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, FileBarChart, MapPin, CalendarPlus, History, Calendar, CalendarDays, CalendarRange, Users, Archive, RotateCcw, RefreshCw, Image as ImageIcon, Video, SidebarOpen, Star, Send, Zap, TicketPercent, MessageSquare, ExternalLink, ShieldCheck, Clock, HelpCircle, Car, Activity, Mail, PhoneIncoming, PhoneOutgoing, AlertCircle, StickyNote, FileDown, FileText, Eye, Loader2, X, Check, Bell, Package, Play, Sun, CalendarCheck, ArrowLeft } from "lucide-react";
import { PhotoGalleryLightbox } from "@/components/gallery/PhotoGalleryLightbox";
import { getYouTubeThumbnail } from "@/lib/youtube";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { exportCustomerHistoryPDF } from '@/lib/pdf-export';
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

import { ActivityLog } from "@/components/customers/ActivityLog";
import { EmailPreviewModal } from "@/components/email/EmailPreviewModal";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import DateRangeFilter, { DateRangeValue } from "@/components/filters/DateRangeFilter";
import jsPDF from "jspdf";

import { UnifiedCustomerTimeline } from "@/components/customers/UnifiedCustomerTimeline";

const SearchCustomer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'latest'|'updated'|'alpha'>('latest');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const { items: allBookings, refresh: refreshBookings } = useBookingsStore();
  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [autoOpenedAdd, setAutoOpenedAdd] = useState(false);
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "year">(() => {
    const saved = sessionStorage.getItem("customerDatabaseDateFilter");
    return (saved as any) || "all";
  });

  useEffect(() => {
    sessionStorage.setItem("customerDatabaseDateFilter", dateFilter);
  }, [dateFilter]);

  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const [showArchived, setShowArchived] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [activeModalTab, setActiveModalTab] = useState("profile");
  
  const customerToDelete = useMemo(() => 
    customers.find(c => c.id === deleteCustomerId), 
    [customers, deleteCustomerId]
  );
  
  const impactCounts = useMemo(() => {
    if (!customerToDelete) return { vehicles: 0, bookings: 0 };
    return {
      vehicles: (customerToDelete as any).vehicles?.length || 0,
      bookings: allBookings.filter(b => b.customerId === customerToDelete.id).length
    };
  }, [customerToDelete, allBookings]);
  
  
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailPreviewType, setEmailPreviewType] = useState<'confirmation' | 'request' | 'cancelled' | 'reminder' | 'payment-success' | 'prospect'>('confirmation');
  const [emailFormData, setEmailFormData] = useState<any>(null);

  const handlePreviewEmailForBooking = (booking: any, forcedType?: 'confirmation' | 'request' | 'cancelled' | 'reminder' | 'payment-success' | 'prospect' | 'correspondence', engagement?: any) => {
    if (!booking) return;
    setEmailFormData({
      customer: booking.customer || booking.customer_name || '',
      email: booking.customerEmail || booking.email || booking.customer_email || '',
      phone: booking.customerPhone || booking.phone || '',
      address: booking.address || '',
      service: booking.service || booking.title || '',
      vehicle: booking.vehicle || '',
      vehicleYear: booking.vehicleYear || '',
      vehicleMake: booking.vehicleMake || '',
      vehicleModel: booking.vehicleModel || '',
      notes: booking.notes || '',
      note: booking.note || '',
      body: booking.body || '',
      addons: Array.isArray(booking.addons) ? booking.addons : 
              (typeof booking.addons === 'string' ? JSON.parse(booking.addons) : []),
      time: booking.date ? format(new Date(booking.date), 'HH:mm') : '09:00',
      status: (booking.status || 'pending').toLowerCase() as any,
      sent_at: booking.created_at || booking.date || undefined
    });
    
    let type: any = forcedType;
    if (!type) {
      const stat = (booking.status || 'pending').toLowerCase();
      if (stat === 'confirmed') type = 'confirmation';
      else if (stat === 'cancelled') type = 'cancelled';
      else if (stat === 'done') type = 'payment-success';
      else type = 'request';
    }
    
    setEmailPreviewType(type);
    setShowEmailPreview(true);
  };

  const { isDemoMode } = useDemoMode();
  const isAdmin = getCurrentUser()?.role === 'admin' || isDemoMode;

  useEffect(() => {
    refresh();
    refreshBookings(true);
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

  const handleCreateTestAccount = async () => {
    try {
      setIsRefreshing(true);
      
      const newTestCustomer = {
        name: "Rick Berube",
        email: "rberube54+test@gmail.com",
        phone: "978-764-5047",
        address: "54 Boston Street, Methuen, MA",
        notes: "Test Admin Account",
        type: "client",
        vehicles: [{
          year: "2018",
          make: "Ford",
          model: "F-150",
          color: "Black",
          condition: "Excellent"
        }]
      };

      const result = await upsertSupabaseCustomer(newTestCustomer);

      toast({
        title: "Test Account Created",
        description: "Rick Berube test account is now available."
      });

      await refresh();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  };

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
        howFoundOther: data.howFoundOther,
        date_of_contact: data.date_of_contact
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
    const cid = params.get('customerId');
    if (cid && customers.length > 0) {
      // Small delay to ensure list is rendered
      setTimeout(() => {
        setExpandedCustomers(prev => prev.includes(cid) ? prev : [...prev, cid]);
        const el = document.getElementById(`customer-${cid}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }

    const flag = params.get("add");
    const shouldOpen = flag === "true" || flag === "1" || (flag === null && params.has("add"));
    if (shouldOpen && !autoOpenedAdd) {
      setEditing(null);
      setModalOpen(true);
      setAutoOpenedAdd(true);
    }
  }, [location.search, customers, autoOpenedAdd]);

  const filterByDate = (customer: Customer) => {
    const now = new Date();
    // Normalize date fields: DB uses snake_case, but some local types might be camelCase
    const baseDateStr = (customer as any).created_at || (customer as any).updated_at || (customer as any).createdAt || (customer as any).updatedAt || customer.lastService || new Date().toISOString();
    const d = new Date(baseDateStr);

    if (dateFilter === "today") {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    }
    if (dateFilter === "week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday start
      startOfWeek.setHours(0, 0, 0, 0);
      return d >= startOfWeek;
    }
    if (dateFilter === "month") {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    if (dateFilter === "year") {
      return d.getFullYear() === now.getFullYear();
    }
    // "all"
    return true;
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
  const [galleryPhotos, setGalleryPhotos] = useState<{ url: string; label?: string; type?: "image" | "video"; description?: string; }[]>([]);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
  const [galleryMetadata, setGalleryMetadata] = useState<any[]>([]);
  const [photoToDelete, setPhotoToDelete] = useState<{ index?: number; metadata?: any; customer: Customer } | null>(null);

  const openGallery = (customer: Customer, startIndex = 0) => {
    const photos: { url: string; label?: string; type?: "image" | "video"; description?: string; }[] = [];
    const meta: any[] = [];
    const seenUrls = new Set<string>();

    const addPhoto = (url: string, label: string, m: any) => {
      if (!url || seenUrls.has(url)) return;
      seenUrls.add(url);
      
      let finalUrl = url;
      let description = undefined;
      const isVideo = m.field === 'videoUrls' || m.field === 'videoUrl';
      
      if (isVideo) {
        const parts = url.split(':::');
        finalUrl = parts[0];
        description = parts[1];
      }
      
      photos.push({ 
        url: finalUrl, 
        label, 
        type: isVideo ? 'video' : 'image',
        description 
      });
      meta.push(m);
    };

    // Customer-level photos
    customer.generalPhotos?.forEach((url, idx) => {
      addPhoto(url, "General", { type: 'customer', field: 'generalPhotos', arrayIndex: idx, customerId: customer.id });
    });
    customer.beforePhotos?.forEach((url, idx) => {
      addPhoto(url, "Before", { type: 'customer', field: 'beforePhotos', arrayIndex: idx, customerId: customer.id });
    });
    if (customer.videoUrl) {
      addPhoto(customer.videoUrl, "Customer Video", { type: 'customer', field: 'videoUrl', arrayIndex: 0, customerId: customer.id });
    }

    // Per-vehicle photos
    (customer.vehicles || []).forEach((v, vIdx) => {
      const vLabel = [v.year, v.make, v.model].filter(Boolean).join(' ') || 'Vehicle';
      v.generalPhotos?.forEach((url, idx) => {
        addPhoto(url, `${vLabel} · General`, { type: 'vehicle', field: 'generalPhotos', vehicleIndex: vIdx, arrayIndex: idx, customerId: customer.id });
      });
      v.beforePhotos?.forEach((url, idx) => {
        addPhoto(url, `${vLabel} · Before`, { type: 'vehicle', field: 'beforePhotos', vehicleIndex: vIdx, arrayIndex: idx, customerId: customer.id });
      });
      v.afterPhotos?.forEach((url, idx) => {
        addPhoto(url, `${vLabel} · After`, { type: 'vehicle', field: 'afterPhotos', vehicleIndex: vIdx, arrayIndex: idx, customerId: customer.id });
      });
      v.videoUrls?.forEach((url, idx) => {
        addPhoto(url, `${vLabel} · Video`, { type: 'vehicle', field: 'videoUrls', vehicleIndex: vIdx, arrayIndex: idx, customerId: customer.id });
      });
    });

    setGalleryPhotos(photos);
    setGalleryMetadata(meta);
    setGalleryInitialIndex(Math.min(startIndex, Math.max(0, photos.length - 1)));
    setGalleryOpen(true);
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    const { index, metadata, customer } = photoToDelete;
    const m = metadata || (index !== undefined ? galleryMetadata[index] : null);
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
    setExpandedCustomers(prev => (prev.includes(id) ? [] : [id]));
    setAllExpanded(false);
    
    if (isExpanding) {
      // Immediately scroll to top so the filtered single-card is visible on mobile
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      // Then fine-tune to the element position after React re-renders
      setTimeout(() => {
        const el = document.getElementById(`customer-${id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          window.scrollTo({
            top: rect.top + scrollTop - 100,
            behavior: "smooth"
          });
        }
      }, 250);
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
      <main className="container mx-auto px-1 sm:px-4 py-6 max-w-6xl space-y-6">
        <Card className="p-3 sm:p-6 bg-gradient-to-r from-zinc-900 to-zinc-800 border-zinc-700 shadow-lg">
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

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-900/50 p-2 sm:p-4 rounded-xl border border-zinc-800">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <Input 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder="Search customers..." 
              className="pl-10 pr-10 bg-zinc-950 border-zinc-800" 
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
            {/* Quick date-filter pills */}
            <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-1">
              {([
                { key: "today", label: "Today",  Icon: Sun },
                { key: "week",  label: "Week",   Icon: CalendarDays },
                { key: "month", label: "Month",  Icon: Calendar },
                { key: "year",  label: "Year",   Icon: CalendarRange },
                { key: "all",   label: "All",    Icon: CalendarCheck },
              ] as const).map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setDateFilter(key)}
                  title={key === "today" ? "Today" : key === "week" ? "This Week" : key === "month" ? "This Month" : key === "year" ? "This Year" : "All Time"}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-150",
                    dateFilter === key
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
              {/* Clear / reset to default (all) */}
              {dateFilter !== "all" && (
                <button
                  onClick={() => setDateFilter("all")}
                  title="Reset to All Time"
                  className="flex items-center justify-center w-6 h-6 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 ml-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button variant="ghost" onClick={refresh} className="text-zinc-400 hover:text-white" disabled={isRefreshing}>
              <RotateCcw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button variant={showArchived ? "secondary" : "ghost"} onClick={() => setShowArchived(!showArchived)} className={cn("text-zinc-400 hover:text-white", showArchived && "bg-amber-600/20 text-amber-500 border-amber-600/30")}>
              {showArchived ? "Hide Archived" : "Show Archived"}
            </Button>
            <Button variant="outline" onClick={() => generatePDF(true)} className="border-zinc-700 hover:bg-zinc-800 text-zinc-200"><Save className="h-4 w-4 mr-2" /> PDF</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0" onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Add</Button>
            {isAdmin && (
              <Button variant="outline" className="border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10 whitespace-nowrap" onClick={handleCreateTestAccount}>
                Create Rick Berube Test
              </Button>
            )}
            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger className="w-[140px] bg-zinc-950 border-zinc-800 text-zinc-300">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="updated">Last Updated</SelectItem>
                <SelectItem value="alpha">Alphabetically</SelectItem>
              </SelectContent>
            </Select>
            {filteredCustomers.length > 0 && (
              <Button variant="ghost" size="sm" onClick={toggleAll} className="text-zinc-400">{allExpanded ? <ChevronsUp className="h-4 w-4" /> : <ChevronsDown className="h-4 w-4" />}</Button>
            )}
          </div>
        </div>

        {expandedCustomers.length > 0 && (
          <div className="mb-6 flex items-center justify-between bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setExpandedCustomers([])}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-4 py-2 flex items-center gap-2 transition-all text-xs tracking-wider shadow-lg shadow-blue-500/20"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to All Customers
              </Button>
              <span className="text-zinc-500 text-xs font-semibold">|</span>
              <span className="text-zinc-300 text-xs font-black uppercase tracking-wider">
                Viewing Selected Customer Profile
              </span>
            </div>
            <div className="text-[10px] text-zinc-500 font-bold uppercase bg-zinc-950 px-3 py-1 rounded-full border border-zinc-800/50">
              Single-Client Mode
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...filteredCustomers]
            .sort((a, b) => {
              if (sortBy === 'latest') {
                const getValidTime = (c: any) => {
                  const d = c.created_at || c.createdAt;
                  if (!d) return 0;
                  const t = new Date(d).getTime();
                  return isNaN(t) ? 0 : t;
                };
                return getValidTime(b) - getValidTime(a);
              }
              if (sortBy === 'updated') {
                const getValidTime = (c: any) => {
                  const d = c.updated_at || c.updatedAt || c.created_at || c.createdAt;
                  if (!d) return 0;
                  const t = new Date(d).getTime();
                  return isNaN(t) ? 0 : t;
                };
                return getValidTime(b) - getValidTime(a);
              }
              if (sortBy === 'alpha') {
                return (a.name || '').localeCompare(b.name || '');
              }
              return 0;
            })
            .filter((customer) => {
              if (expandedCustomers.length > 0) {
                return expandedCustomers.includes(customer.id!);
              }
              return true;
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
                      {(() => {
                        const allMedia = Array.from(new Set([
                          ...(customer.generalPhotos || []),
                          ...(customer.beforePhotos || []),
                          ...(customer.afterPhotos || []),
                          ...(customer.videoUrl ? [customer.videoUrl] : []),
                          ...((customer.vehicles || []).flatMap(v => [
                            ...(v.generalPhotos || []),
                            ...(v.beforePhotos || []),
                            ...(v.afterPhotos || []),
                            ...(v.videoUrls || [])
                          ]))
                        ])).filter(Boolean);

                        if (allMedia.length > 0) {
                          return (
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              {allMedia.slice(0, 1).map((item, idx) => {
                                const ytThumb = getYouTubeThumbnail(item);
                                return (
                                  <div
                                    key={`thumb-${idx}`}
                                    className="h-12 w-12 rounded-lg border-2 border-zinc-700 overflow-hidden cursor-pointer hover:border-blue-400 transition-all hover:scale-105 relative bg-zinc-950 flex items-center justify-center"
                                    onClick={() => openGallery(customer, idx)}
                                  >
                                    {ytThumb ? (
                                      <img src={ytThumb} className="h-full w-full object-cover" />
                                    ) : item.includes(':::') || item.includes('youtube.com') || item.includes('youtu.be') ? (
                                      <Video className="w-6 h-6 text-zinc-500" />
                                    ) : (
                                      <img src={item} alt={`${customer.name} - ${idx + 1}`} className="h-full w-full object-cover" />
                                    )}
                                  </div>
                                );
                              })}
                              {allMedia.length > 1 && (
                                <button
                                  onClick={() => openGallery(customer, 0)}
                                  className="h-12 w-12 rounded-lg border-2 border-blue-500/50 bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition-all hover:scale-105"
                                >
                                  +{allMedia.length - 1}
                                </button>
                              )}
                            </div>
                          );
                        }
                        return (
                          <div
                            className="h-12 w-12 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 cursor-pointer hover:border-blue-400 flex items-center justify-center text-zinc-400 font-bold"
                            onClick={async (e) => { e.stopPropagation(); openEdit(customer); }}
                          >
                            <span>{(customer.name || 'U').charAt(0).toUpperCase()}</span>
                          </div>
                        );
                      })()}

                      <div>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-zinc-200 text-lg">
                                {customer.accountType === 'Business' && customer.companyName ? customer.companyName : customer.name}
                              </h3>
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
                           {/* Dynamic Status Badge */}
                           {(() => {
                             const custBookings = allBookings.filter(b => 
                               (b.customerId && b.customerId === customer.id) || 
                               ((b as any).customer_id && (b as any).customer_id === customer.id) || 
                               (b.customer && customer.name && b.customer.toLowerCase() === customer.name.toLowerCase()) ||
                               (b.customerEmail && customer.email && b.customerEmail.toLowerCase() === customer.email.toLowerCase()) ||
                               (b.customerPhone && customer.phone && b.customerPhone === customer.phone)
                             );
                             if (custBookings.length === 0) {
                               return (
                                 <Badge variant="outline" className="h-5 bg-cyan-500/10 text-cyan-400 border-cyan-500/30 gap-1 px-1.5 ml-2">
                                   <Zap className="h-3 w-3" />
                                   <span className="text-[9px] font-black uppercase tracking-tight">NEW</span>
                                 </Badge>
                               );
                             }
                             const statuses = custBookings.map(b => (b.status || 'Pending').toLowerCase());
                             
                             let label = "PENDING";
                             let color = "bg-blue-500/10 text-blue-400 border-blue-500/30";
                             let StatusIcon = Clock;
                             
                             if (statuses.includes('done')) { label = "DONE"; color = "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"; StatusIcon = Check; }
                             else if (statuses.includes('in progress')) { label = "IN PROGRESS"; color = "bg-purple-500/10 text-purple-400 border-purple-500/30"; StatusIcon = Activity; }
                             else if (statuses.includes('confirmed booking') || statuses.includes('confirmed')) { label = "CONFIRMED"; color = "bg-green-500/10 text-green-400 border-green-500/30"; StatusIcon = CalendarCheck; }
                             else if (statuses.includes('tentative (hold)') || statuses.includes('tentative')) { label = "TENTATIVE"; color = "bg-amber-500/10 text-amber-500 border-amber-500/30"; StatusIcon = Clock; }
                             else if (statuses.includes('rescheduled')) { label = "RESCHEDULED"; color = "bg-blue-500/10 text-blue-400 border-blue-500/30"; StatusIcon = RefreshCw; }
                             else if (statuses.includes('blocked')) { label = "BLOCKED"; color = "bg-red-500/10 text-red-400 border-red-500/30"; StatusIcon = AlertCircle; }

                             return (
                               <Badge variant="outline" className={`h-5 ${color} gap-1 px-1.5 ml-2`}>
                                 <StatusIcon className="h-3 w-3" />
                                 <span className="text-[9px] font-black uppercase tracking-tight">{label}</span>
                               </Badge>
                             );
                           })()}
                            </div>
                          </div>
                        </div>
                        {customer.accountType === 'Business' && customer.companyName && (
                          <div className="text-xs font-medium text-zinc-500 mt-1.5 mb-0.5">Contact: {customer.name}</div>
                        )}
                        <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm text-zinc-400 mt-1 items-center">
                          <span>{customer.phone || 'No phone'}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline">{customer.vehicle} {customer.model}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="text-zinc-500 text-[10px] sm:text-xs">
                            Added: {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A'}
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span className="text-zinc-500 text-[10px] sm:text-xs" title="Last Updated">
                            Updated: {(customer.updated_at || (customer as any).updatedAt) ? new Date((customer.updated_at || (customer as any).updatedAt)).toLocaleString() : (customer.created_at ? new Date(customer.created_at).toLocaleString() : 'N/A')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                      <div className="flex flex-wrap gap-1 mr-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async (e) => { 
                            e.stopPropagation(); 
                            const { getCustomerDetailedHistory } = await import('@/lib/supa-data');
                            toast({ title: "Processing", description: "Aggregating customer intelligence..." });
                            try {
                              const detailedHistory = await getCustomerDetailedHistory(customer.id!);
                              if (!detailedHistory) {
                                toast({ title: "Error", description: "Failed to load customer history", variant: "destructive" });
                                return;
                              }
                              toast({ title: "Success", description: "Intelligence report ready" });
                              await exportCustomerHistoryPDF(detailedHistory, true); 
                            } catch (err) {
                              toast({ title: "Error", description: "Error generating report", variant: "destructive" });
                            }
                          }}
                          className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300"
                          title="Preview Activity Report"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async (e) => { e.stopPropagation(); handleArchiveId(customer); }}
                          className={cn("h-8 px-2 text-xs gap-1 transition-all", customer.is_archived ? "text-amber-500 bg-amber-500/10 hover:bg-amber-500/20" : "text-zinc-400 hover:text-amber-400")}
                          title={customer.is_archived ? "Restore" : "Archive"}
                        >
                          {customer.is_archived ? <><RotateCcw className="h-4 w-4" /> Restore</> : <Archive className="h-4 w-4" />}
                        </Button>
                         <Button variant="ghost" size="sm" onClick={async (e) => { e.stopPropagation(); openEdit(customer); }} className="h-8 w-8 p-0 text-zinc-400 hover:text-white"><Pencil className="h-4 w-4" /></Button>
                         {isAdmin && (
                           <Button variant="ghost" size="sm" onClick={async (e) => { e.stopPropagation(); setDeleteCustomerId(customer.id!); }} className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400">
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         )}
                      </div>
                      {isExpanded ? <ChevronUp className="h-5 w-5 text-zinc-500" /> : <ChevronDown className="h-5 w-5 text-zinc-500" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-3 sm:p-6 border-t border-blue-500/10 bg-zinc-900/30 animate-in slide-in-from-top-2">
                      <div className="flex flex-wrap justify-end mb-6 gap-2 border-b border-zinc-800 pb-4">
                        {!customer.is_archived && (
                          <>
                            <Button variant="outline" size="sm" className="h-9 bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800" asChild>
                              <Link to={`/invoicing?customerId=${customer.id}`}>
                                <FileText className="h-4 w-4 mr-2" /> Invoices
                              </Link>
                            </Button>
                            <Button variant="outline" size="sm" className="h-9 bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800" asChild>
                              <Link to={`/estimates?customerId=${customer.id}${(customer.name || '').toLowerCase().includes('forrest') ? '&discount=10' : ''}`}>
                                <FileBarChart className="h-4 w-4 mr-2" /> Estimates
                              </Link>
                            </Button>
                            <Button className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
                              <Link to={`/bookings?add=true&customerId=${customer.id}&customerName=${encodeURIComponent(customer.name)}&email=${encodeURIComponent(customer.email || '')}&phone=${encodeURIComponent(customer.phone || '')}&address=${encodeURIComponent(customer.address || '')}&vehicleYear=${encodeURIComponent(customer.year || '')}&vehicleMake=${encodeURIComponent(customer.vehicle || '')}&vehicleModel=${encodeURIComponent(customer.model || '')}&vehicleType=${encodeURIComponent(customer.vehicleType || '')}&vehicleColor=${encodeURIComponent(customer.color || '')}&notes=${encodeURIComponent(customer.notes || '')}`}><CalendarPlus className="h-4 w-4 mr-2" /> Book Job</Link>
                            </Button>
                          </>
                        )}
                        <Button asChild variant="outline" size="sm" className="h-9 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300">
                          <Link to={`/service-checklist?customerId=${customer.id}`}><FileBarChart className="h-4 w-4 mr-2" /> Start Service</Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild className="h-9 px-4 text-pink-400 hover:text-pink-300 bg-zinc-800/50 border-zinc-800 rounded-lg">
                          <Link to={`/vehicle-gallery?search=${encodeURIComponent(customer.name)}&from=customers&customerId=${customer.id}`}><Video className="h-4 w-4 mr-2" /> Gallery</Link>
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* LEFT COLUMN: IDENTIFICATION & MARKETING */}
                        <div className="space-y-6">
                          <section>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Garage ({customer.vehicles?.length || 0})</h4>
                                <button 
                                  onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'vehicle-management' } }))}
                                  className="text-zinc-600 hover:text-blue-400 transition-colors"
                                  title="Vehicle Help"
                                >
                                  <HelpCircle className="h-3 w-3" />
                                </button>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[9px] font-black text-blue-400 hover:text-blue-300 gap-1"
                                onClick={async (e) => { e.stopPropagation(); openEdit(customer); }}
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
                                        <div className="text-[9px] text-zinc-500 font-bold uppercase">Legacy Profile {customer.color ? `• ${customer.color}` : ''}</div>
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
                                          <div className="text-[9px] text-zinc-500 font-bold uppercase">{v.type || 'No Type Set'} {v.color ? `• ${v.color}` : ''}</div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors"
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            openEdit(customer, "profile");
                                          }}
                                          title="Edit Vehicle"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
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
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                <StickyNote className="h-3.5 w-3.5 text-amber-500" /> Admin Directives & Notes
                              </h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[9px] font-black text-blue-400 hover:text-blue-300 gap-1"
                                onClick={(e) => { e.stopPropagation(); openEdit(customer, "notes"); }}
                              >
                                <Plus className="w-2.5 h-2.5" /> ADD NOTE
                              </Button>
                            </div>
                            
                            {customer.notes ? (
                              <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 text-sm text-zinc-300 italic leading-relaxed whitespace-pre-wrap">
                                "{customer.notes}"
                              </div>
                            ) : (
                              <div className="py-8 text-center border border-dashed border-zinc-800 rounded-2xl opacity-40">
                                <div className="text-[10px] font-black uppercase tracking-widest">No internal directives set.</div>
                              </div>
                            )}
                          </section>
                        </div>

                        {/* RIGHT COLUMN: ENGAGEMENT & ADMIN */}
                        <div className="space-y-6">
                           <section className="bg-zinc-950/40 p-5 rounded-2xl border border-zinc-800/50 space-y-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Communication Overview</h4>
                                <button 
                                  onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'retention-hub' } }))}
                                  className="text-zinc-600 hover:text-blue-400 transition-colors"
                                  title="Engagement Hub Help"
                                >
                                  <HelpCircle className="h-3 w-3" />
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <Button 
                                  variant="outline" 
                                  className="w-full bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 gap-2 font-black uppercase tracking-widest text-[10px] h-12 rounded-xl group px-2"
                                  onClick={() => navigate(`/follow-up-center?search=${encodeURIComponent(customer.name)}`)}
                                >
                                  <Zap className="w-4 h-4 text-amber-500 group-hover:animate-pulse shrink-0" />
                                  <span className="truncate">Engagement Hub</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  className="w-full bg-blue-900/20 border-blue-500/30 text-blue-400 hover:text-blue-300 hover:bg-blue-900/40 gap-2 font-black uppercase tracking-widest text-[10px] h-12 rounded-xl group px-2"
                                  onClick={() => {
                                    const vehicleStr = customer.vehicle 
                                      ? `${customer.year && customer.year !== '-' ? customer.year : ''} ${customer.vehicle || ''} ${customer.model || ''}`.trim()
                                      : '';
                                    const bodyStr = vehicleStr ? `\n\nVehicle Information:\n${vehicleStr}` : '';
                                    const url = `/letter-maker?customerId=${customer.id || ''}&body=${encodeURIComponent(bodyStr)}`;
                                    navigate(url);
                                  }}
                                >
                                  <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                                  <span className="truncate">Write Letter</span>
                                </Button>
                              </div>
                              <div className="space-y-3">
                                 <div className="flex gap-2 items-center"><div className="w-20 text-zinc-500 text-[10px] font-black uppercase tracking-widest">Email</div><div className="text-zinc-300 text-sm font-semibold truncate">{customer.email || '—'}</div></div>
                                 <div className="flex gap-2 items-center"><div className="w-20 text-zinc-500 text-[10px] font-black uppercase tracking-widest">Address</div><div className="text-zinc-300 text-sm flex items-center gap-2">{customer.address || '—'} {customer.address && (<Button variant="ghost" size="sm" className="h-5 px-2 text-xs text-blue-400" onClick={async (e) => { e.stopPropagation(); toggleMap(customer.id!); }}><MapPin className="h-3 w-3 mr-1" />{openMaps.includes(customer.id!) ? "Hide Map" : "Map"}</Button>)}</div></div>
                                 <div className="pt-4 border-t border-zinc-800/50">
                                   <div className="flex items-center justify-between mb-2">
                                     <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block">Relationship Metadata</span>
                                     <Badge variant="outline" className="h-5 bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1 px-1.5">
                                       <Star className="h-3 w-3 fill-amber-500" />
                                       <span className="text-[9px] font-black uppercase tracking-tight">IDENTITY VERIFIED</span>
                                     </Badge>
                                   </div>
                                   <div className="pt-2 pb-4">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full h-9 bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 gap-2"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handlePreviewEmailForBooking({
                                            customer: customer.name,
                                            customerEmail: customer.email,
                                            customerPhone: customer.phone,
                                            address: customer.address,
                                            vehicle: customer.vehicle,
                                            vehicleYear: customer.year,
                                            vehicleMake: customer.vehicle,
                                            vehicleModel: customer.model,
                                            service: 'Premium Detailing Service'
                                          }, 'prospect');
                                        }}
                                      >
                                        <Mail className="h-3.5 w-3.5" /> Preview Welcome Email
                                      </Button>
                                    </div>
                                   <div className="space-y-1.5">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">Profile Created:</span>
                                        <span className="text-[9px] text-zinc-400 font-black uppercase">{(customer as any).created_at ? new Date((customer as any).created_at).toLocaleString() : '—'}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">Last Email Sent:</span>
                                        <span className="text-[9px] text-zinc-500 font-black uppercase">{(customer as any).last_email_sent_at ? new Date((customer as any).last_email_sent_at).toLocaleString() : 'NONE SENT'}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">Last Contact:</span>
                                        <span className="text-[9px] text-blue-400 font-black uppercase">{customer.date_of_contact ? new Date(customer.date_of_contact).toLocaleDateString() : '—'}</span>
                                      </div>
                                   </div>
                                 </div>
                              </div>

                              {openMaps.includes(customer.id!) && customer.address && (<div className="mt-2 w-full h-48 rounded-lg overflow-hidden border border-zinc-800 shadow-2xl"><iframe width="100%" height="100%" frameBorder="0" scrolling="no" src={`https://maps.google.com/maps?q=${encodeURIComponent(customer.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`} title="Map" /></div>)}
                            </section>
                            {customer.is_archived && (
                             <div className="p-12 text-center border border-dashed border-zinc-800 rounded-3xl opacity-50">
                               <Archive className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
                               <p className="text-xs font-black uppercase tracking-widest text-zinc-600">This profile is archived.</p>
                             </div>
                           )}
                        </div>
                      </div>

                      {/* FULL WIDTH ROW: COMBINED TIMELINE & LIFECYCLE */}
                      <div className="mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2">
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
                                       onClick={async (e) => { 
                                         e.stopPropagation(); 
                                         const relatedBookings = allBookings.filter(b => 
                                           (b.customerId === customer.id) || 
                                           (customer.email && b.customerEmail?.toLowerCase() === customer.email.toLowerCase()) ||
                                           (b.customer?.toLowerCase() === customer.name?.toLowerCase())
                                         );
                                         const { getCustomerDetailedHistory } = await import("@/lib/supa-data"); const detailedHistory = await getCustomerDetailedHistory(customer.id!); if (detailedHistory) await exportCustomerHistoryPDF(detailedHistory);
                                       }}
                                     >
                                       <FileDown className="w-3 h-3" /> EXPORT REPORT
                                     </Button>
                                     <Button
                                       variant="ghost"
                                       size="sm"
                                       className="h-8 text-[10px] font-black text-blue-400 hover:text-white bg-blue-500/5 border border-blue-500/20 hover:bg-blue-500 px-4 rounded-lg transition-all gap-1.5"
                                       onClick={async (e) => { e.stopPropagation(); openEdit(customer, "crm"); }}
                                     >
                                       <Plus className="w-3 h-3" /> LOG ACTIVITY
                                     </Button>
                                   </div>
                                 </div>

                                 <UnifiedCustomerTimeline customer={customer} allBookings={allBookings} handlePreviewEmailForBooking={handlePreviewEmailForBooking} navigate={navigate} toast={toast} />
                               </section>
                            </div>

                            <div className="space-y-6">
                               {/* Booking Lifecycle Section relocated to side of timeline for wider utility */}
                               <section className="bg-zinc-950/40 p-5 rounded-2xl border border-zinc-800/50 space-y-4 h-fit">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                      <Calendar className="h-3 w-3" /> Booking Lifecycle
                                    </h4>
                                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tight bg-blue-500/5 text-blue-400 border-blue-500/20 px-2 py-0">
                                      CRM Intel
                                    </Badge>
                                  </div>
                                  
                                  {(() => {
                                    const customerBookings = allBookings.filter(b => 
                                      (b.customerId === customer.id) || 
                                      (customer.email && b.customerEmail?.toLowerCase() === customer.email.toLowerCase()) ||
                                      (b.customer?.toLowerCase() === customer.name?.toLowerCase())
                                    );
                                    
                                    const doneCount = customerBookings.filter(b => b.status === 'done' || b.status === 'completed').length;
                                    const scheduled = customerBookings.filter(b => b.status === 'confirmed');
                                    const tentative = customerBookings.filter(b => b.status === 'tentative');
                                    
                                    const upcoming = scheduled
                                      .filter(b => new Date(b.date).getTime() > Date.now())
                                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

                                    if (customerBookings.length === 0) {
                                      return (
                                        <div className="py-4 text-center border border-dashed border-zinc-800 rounded-xl">
                                          <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">No Booking Data Yet</p>
                                        </div>
                                      );
                                    }

                                    return (
                                      <div className="grid grid-cols-1 gap-3">
                                        <div className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                                          <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                              <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                            </div>
                                            <div>
                                              <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Completed Jobs</div>
                                              <div className="text-zinc-200 text-lg font-black tracking-tighter">{doneCount}</div>
                                            </div>
                                          </div>
                                          <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-tight">Booking Done</div>
                                        </div>

                                        {upcoming && (
                                          <div className="flex items-center justify-between bg-blue-500/5 p-3 rounded-xl border border-blue-500/20 animate-pulse-slow">
                                            <div className="flex items-center gap-3">
                                              <div className="p-2 bg-blue-500/10 rounded-lg">
                                                <Clock className="w-4 h-4 text-blue-400" />
                                              </div>
                                              <div>
                                                <div className="text-[10px] text-blue-500 font-black uppercase tracking-widest">Next Scheduled</div>
                                                <div className="text-zinc-200 text-sm font-bold truncate max-w-[150px]">{upcoming.title}</div>
                                                <div className="text-[10px] text-zinc-400">{new Date(upcoming.date).toLocaleDateString()}</div>
                                              </div>
                                            </div>
                                            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-tight">Booking Scheduled</div>
                                          </div>
                                        )}

                                        {tentative.length > 0 && (
                                          <div className="flex items-center justify-between bg-amber-500/5 p-3 rounded-xl border border-amber-500/20">
                                            <div className="flex items-center gap-3">
                                              <div className="p-2 bg-amber-500/10 rounded-lg">
                                                <AlertCircle className="w-4 h-4 text-amber-500" />
                                              </div>
                                              <div>
                                                <div className="text-[10px] text-amber-500 font-black uppercase tracking-widest">Active Requests</div>
                                                <div className="text-zinc-200 text-lg font-black tracking-tighter">{tentative.length}</div>
                                              </div>
                                            </div>
                                            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-tight">Tentatively Booked</div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                               </section>
                            </div>
                         </div>
                      </div>
                                            {/* MEDIA GALLERY - dynamic */}
                      {(() => {
                        const allMedia: {url: string; label: string; type: 'before'|'after'|'general'|'video'; metadata: any; isVideo?: boolean}[] = [];
                        const seenUrls = new Set<string>();

                        const addMedia = (url: string, label: string, type: 'before'|'after'|'general'|'video', m: any, isVideo = false) => {
                          if (!url) return;
                          
                          let finalUrl = url;
                          if (isVideo) {
                            finalUrl = url.split(':::')[0];
                          }
                          
                          if (seenUrls.has(finalUrl)) return;
                          seenUrls.add(finalUrl);
                          allMedia.push({ url: finalUrl, label, type, metadata: m, isVideo });
                        };

                        customer.generalPhotos?.forEach((url, idx) => addMedia(url, 'General', 'general', { type: 'customer', field: 'generalPhotos', arrayIndex: idx, customerId: customer.id }));
                        customer.beforePhotos?.forEach((url, idx) => addMedia(url, 'Before', 'before', { type: 'customer', field: 'beforePhotos', arrayIndex: idx, customerId: customer.id }));
                        customer.afterPhotos?.forEach((url, idx) => addMedia(url, 'After', 'after', { type: 'customer', field: 'afterPhotos', arrayIndex: idx, customerId: customer.id }));
                        
                        if (customer.videoUrl) {
                          addMedia(customer.videoUrl, 'Video', 'video', { type: 'customer', field: 'videoUrl', arrayIndex: 0, customerId: customer.id }, true);
                        }

                        (customer.vehicles || []).forEach((v, vIdx) => {
                          const vLabel = [v.year, v.make, v.model].filter(Boolean).join(' ') || 'Vehicle';
                          v.generalPhotos?.forEach((url, idx) => addMedia(url, vLabel + ' - General', 'general', { type: 'vehicle', field: 'generalPhotos', vehicleIndex: vIdx, arrayIndex: idx, customerId: customer.id }));
                          v.beforePhotos?.forEach((url, idx) => addMedia(url, vLabel + ' - Before', 'before', { type: 'vehicle', field: 'beforePhotos', vehicleIndex: vIdx, arrayIndex: idx, customerId: customer.id }));
                          v.afterPhotos?.forEach((url, idx) => addMedia(url, vLabel + ' - After', 'after', { type: 'vehicle', field: 'afterPhotos', vehicleIndex: vIdx, arrayIndex: idx, customerId: customer.id }));
                          v.videoUrls?.forEach((url, idx) => addMedia(url, vLabel + ' - Video', 'video', { type: 'vehicle', field: 'videoUrls', vehicleIndex: vIdx, arrayIndex: idx, customerId: customer.id }, true));
                        });
                        
                        const displayMedia = allMedia.slice(0, 12);

                        return (
                          <div className="mt-12 pt-8 border-t border-zinc-800/50">
                            <div className="flex items-center justify-between mb-6">
                              <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                <ImageIcon className="h-3 w-3" /> Media Archive {allMedia.length > 0 ? `(${allMedia.length} items)` : ''}
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
                                {allMedia.length > 0 && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-7 text-[10px] font-black border-blue-500/30 text-blue-400 hover:bg-blue-500/10 gap-1.5"
                                    onClick={() => navigate(`/vehicle-gallery?search=${encodeURIComponent(customer.name)}&from=customers`)}
                                  >
                                    VIEW ALL <ExternalLink className="w-3 h-3 ml-0.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                              {displayMedia.map((m, i) => {
                                const ytThumb = m.isVideo ? getYouTubeThumbnail(m.url) : null;
                                return (
                                  <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 cursor-pointer hover:border-blue-400 transition-all hover:scale-[1.03] shadow-xl" onClick={() => openGallery(customer, i)}>
                                    {m.isVideo ? (
                                      <div className="w-full h-full relative">
                                        {ytThumb ? (
                                          <img src={ytThumb} className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                                            <Video className="w-8 h-8 text-zinc-700" />
                                          </div>
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                                          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                                            <Play className="w-4 h-4 text-white fill-white" />
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <img src={m.url} alt={m.label} className="w-full h-full object-cover" />
                                    )}
                                    <div className={cn(
                                      "absolute top-2 left-2 text-[9px] px-1.5 py-0.5 rounded text-white font-black uppercase",
                                      m.type === 'before' ? 'bg-orange-600/80' : 
                                      m.type === 'after' ? 'bg-emerald-600/80' : 
                                      m.type === 'video' ? 'bg-pink-600/80' :
                                      'bg-zinc-600/80'
                                    )}>{m.type}</div>
                                  
                                  {isAdmin && (
                                    <button 
                                      className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 shadow-lg z-10"
                                      onClick={(e) => { e.stopPropagation(); setPhotoToDelete({ metadata: m.metadata, customer }); }}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                              {allMedia.length > 12 && (
                                <div 
                                  className="relative aspect-square rounded-2xl overflow-hidden border border-dashed border-zinc-700 bg-zinc-950/40 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-900 transition-all group"
                                  onClick={() => navigate(`/vehicle-gallery?search=${encodeURIComponent(customer.name)}`)}
                                >
                                  <span className="text-xl font-black text-blue-500/50 group-hover:text-blue-400">+{allMedia.length - 12}</span>
                                  <span className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter">More Assets</span>
                                </div>
                              )}
                            </div>
                            
                            {allMedia.length === 0 && (
                              <div className="flex flex-col items-center justify-center p-8 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/30">
                                <ImageIcon className="h-8 w-8 text-zinc-700 mb-3" />
                                <p className="text-sm font-medium text-zinc-500 mb-4">No media uploaded yet</p>
                                <Button 
                                  variant="outline" 
                                  className="h-8 text-xs font-bold border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                                  onClick={() => openEdit(customer, "media")}
                                >
                                  <Plus className="w-3 h-3 mr-1.5" /> UPLOAD PHOTO
                                </Button>
                              </div>
                            )}
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
        <AlertDialogContent className="z-[250]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Permanently?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {customerToDelete?.name?.toLowerCase().trim() === 'rick berube' ? (
                <>
                  This will permanently delete <strong>{customerToDelete?.name}</strong>.
                  <br /><br />
                  <strong className="text-red-400">SPECIAL OVERRIDE ACTIVE:</strong> Because this is your test account, deleting this profile will <strong>completely wipe out all associated Invoices, Estimates, Bookings, and Vehicles.</strong> 
                  <br /><br />
                  Your analytics and accounting numbers will instantly revert to normal as if this account never existed. <strong>This action cannot be undone.</strong>
                </>
              ) : (
                <>
                  This will permanently delete <strong>{customerToDelete?.name || 'this customer'}</strong>, 
                  all <strong>{impactCounts.vehicles} related vehicle(s)</strong>, 
                  and detach <strong>{impactCounts.bookings} booking(s)</strong> from this profile. 
                  <br /><br />
                  Booking history will be preserved as a snapshot, but the link to this customer record will be removed. 
                  <strong> This action cannot be undone.</strong>
                </>
              )}
            </AlertDialogDescription>
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
              className="bg-red-600 hover:bg-red-700 text-white border-0"
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
        <AlertDialogContent className="z-[200]">
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

      <EmailPreviewModal 
        open={showEmailPreview} 
        onOpenChange={setShowEmailPreview}
        type={emailPreviewType}
        data={emailFormData}
      />
    </div >
  );
};

export default SearchCustomer;


