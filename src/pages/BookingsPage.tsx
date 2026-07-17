import { SidebarTrigger } from "@/components/ui/sidebar"; // NEW IMPORT
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, addYears, subYears, parseISO, isToday, isWithinInterval, startOfYear, endOfYear, eachMonthOfInterval, isBefore } from "date-fns";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, User, Car, Search, X, MapPin, Users, ChevronDown, Mail, Phone, MapPinIcon, Check, ChevronsUpDown, BarChart3, Wrench, Bell, Archive, Filter, Copy, RotateCcw, RefreshCw, Trash2, Printer, Package, Shield, HelpCircle, LayoutGrid, Eye, Tag, DollarSign } from "lucide-react"; // Added LayoutGrid
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Save, LogOut } from "lucide-react";
import { useBookingsStore, type Booking } from "@/store/bookings";
import { useCouponsStore } from "@/store/coupons";
import type { BookingStatus } from "@/store/bookings";
import { cn, formatETDate, formatETTime } from "@/lib/utils";
import { EmailPreviewModal } from "@/components/email/EmailPreviewModal";
import { toast } from "sonner";
import api from "@/lib/api";
import { getSupabaseEmployees, getSupabaseBookings, upsertSupabaseCustomer, upsertSupabaseVehicle, getSupabaseCustomers, Customer, deleteSupabaseVehicle } from "@/lib/supa-data";
import CustomerModal from "@/components/customers/CustomerModal";
import { getCurrentUser } from "@/lib/auth"; 
import { auditEmployeeAction } from "@/lib/audit";
import { servicePackages, addOns, getAddOnPrice, getServicePrice, type VehicleType, getCanonicalAddonName } from "@/lib/services";
import { getCustomPackages, getCustomAddOns } from "@/lib/servicesMeta";
import { useLocation } from "react-router-dom";
import { getUnifiedCustomers } from "@/lib/customers";
import localforage from "localforage";
import { upsertCustomer } from "@/lib/db";
import { useDemoMode } from "@/contexts/DemoContext";
import { MOCK_BOOKINGS } from "@/lib/demoMockData";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import jsPDF from "jspdf";
import { savePDFToArchive } from "@/lib/pdfArchive";
import { exportCustomerHistoryPDF } from "@/lib/pdf-export";
import VehicleSelectorModal from "@/components/vehicles/VehicleSelectorModal";
import supabase from "@/lib/supabase"; // Realtime import
import { getUnifiedCalendarEvents, type CalendarEvent, deleteCalendarEvent } from "@/lib/unifiedCalendar";
import { createGoogleEvent, isSignedIn, initGoogleCalendar, getCalendarConfig, signInToGoogle } from "@/lib/googleCalendar";
import { unblockSlot } from "@/lib/availability"; // Import unblockSlot
import HelpModal from "@/components/help/HelpModal";

import { ContactInput } from "@/components/ui/ContactInput";

// --- Types ---
type ViewMode = "day" | "week" | "month" | "year" | "analytics";

// --- Helpers for Week View ---
const getWeekDays = (date: Date) => {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday start
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
};

const mapToServiceVehicleType = (type: string = ""): VehicleType => {
  const t = type.toLowerCase();
  if (t.includes('compact') || t.includes('sedan')) return 'compact';
  if (t.includes('mid') || t.includes('suv')) {
    if (t.includes('large') || t.includes('truck') || t.includes('van')) return 'truck';
    return 'midsize';
  }
  if (t.includes('truck') || t.includes('van') || t.includes('large')) return 'truck';
  if (t.includes('luxury')) return 'luxury';
  return 'compact'; // default
};

export default function BookingsPage() {
  const navigate = useNavigate();
  const { items, add, update, remove, refresh, subscribeRealtime } = useBookingsStore();
  const { items: coupons, refresh: refreshCoupons } = useCouponsStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [analyticsDefaultTab, setAnalyticsDefaultTab] = useState<string | undefined>(undefined);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const hasInitialized = useRef(false);
  const [showClassificationModal, setShowClassificationModal] = useState(false);
  const lastHandledBookingId = useRef<string | null>(null);

  const handleClassificationSelect = (data: { make: string; model: string; category: string }) => {
    setFormData(prev => ({
      ...prev,
      vehicleMake: data.make,
      vehicleModel: data.model,
      vehicle: data.category
    }));
    setShowClassificationModal(false);
    toast.success(`Vehicle set to ${data.category}`);
  };
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [vehicleClassModalOpen, setVehicleClassModalOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailPreviewType, setEmailPreviewType] = useState<'confirmation' | 'request' | 'cancelled' | 'reminder' | 'payment-success' | 'prospect'>('confirmation');
  const [emailFormData, setEmailFormData] = useState<any>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [vehicleSelectorOpen, setVehicleSelectorOpen] = useState(false);
  
  // Dialog/Search states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Sync latest data on mount and subscribe to realtime updates
  useEffect(() => {
    refresh();
    refreshCoupons();
    const unsubscribe = subscribeRealtime();
    return () => {
      unsubscribe();
    };
  }, [refresh, refreshCoupons, subscribeRealtime]);

  // Form State
  const { isDemoMode } = useDemoMode();
  const isAdmin = getCurrentUser()?.role === 'admin' || isDemoMode;

  const [formData, setFormData] = useState({
    customerId: undefined as string | undefined,
    customer: "",
    email: "",
    phone: "",
    service: "",
    vehicle: "",
    vehicleYear: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleColor: "",
    vehicleCondition: "",
    address: "",
    time: "09:00",
    endTime: "17:00",
    assignedEmployee: "",
    bookedBy: getCurrentUser()?.name || '',
    notes: "",
    addons: [] as string[],
    hasReminder: false,
    reminderFrequency: "3",
    status: (getCurrentUser()?.role === 'admin' ? 'confirmed' : 'tentative') as BookingStatus,
    vehicleId: undefined as string | undefined,
    discountType: "coupon" as "coupon" | "custom",
    discountCode: "",
    customDiscount: "",
    placeOfService: "Customer's address",
    probonoReason: "",
    probonoReasons: [] as string[],
    probonoPrimaryReason: ""
  });

  const [cancelReason, setCancelReason] = useState("");
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const onSaveCustomer = async (data: Customer) => {
    try {
      await upsertSupabaseCustomer(data as any);
      await fetchCustomers(); // Refresh local customer list
      await refresh(); // Refresh bookings
      toast.success("Customer record updated");
    } catch (err) {
      console.error("Failed to save customer from bookings:", err);
      toast.error("Failed to update customer record");
    }
  };

  const handlePurgeGenericBookings = async () => {
    if (!isAdmin) return;
    if (!window.confirm("Are you sure you want to delete ALL 'Generic Customer' bookings? This cannot be undone.")) return;

    const purgeToast = toast.loading("Purging test data...");
    try {
      const genericItems = items.filter(b => 
        b.customer === 'Generic Customer' || 
        b.customer === 'New Customer' ||
        (b.customer || '').toLowerCase().includes('test customer')
      );
      
      console.log(`Purging ${genericItems.length} generic bookings`);
      
      for (const item of genericItems) {
        await remove(item.id);
      }
      
      toast.success(`Successfully purged ${genericItems.length} test records.`, { id: purgeToast });
    } catch (err) {
      console.error("Purge failed:", err);
      toast.error("Failed to complete purge.", { id: purgeToast });
    }
  };



  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [engagements, setEngagements] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState<string | null>(null);
  const [selectedActivityLog, setSelectedActivityLog] = useState<any>(null);
  
  const handleSelectHistoryCustomer = (customerName: string | null) => {
    setSelectedHistoryCustomer(customerName);
    if (customerName) {
      setTimeout(() => {
        const id = `history-customer-${customerName.replace(/\s+/g, '-')}`;
        const el = document.getElementById(id);
        if (el) {
          const offset = 120; // Room for fixed header
          const bodyRect = document.body.getBoundingClientRect().top;
          const elementRect = el.getBoundingClientRect().top;
          const elementPosition = elementRect - bodyRect;
          const offsetPosition = elementPosition - offset;

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
          });
        }
      }, 100);
    }
  };

  const fetchEngagements = useCallback(async () => {
    try {
      const isDemo = localStorage.getItem("demo_mode_active") === "true";
      if (isDemo) {
        const { MOCK_ENGAGEMENTS } = await import('@/lib/demoMockData');
        setEngagements(MOCK_ENGAGEMENTS);
        return;
      }
      const { data, error } = await supabase.from('engagements').select('*').order('created_at', { ascending: false });
      if (!error && data) setEngagements(data);
    } catch (e) {
      console.error("Failed to fetch engagements", e);
    }
  }, []);

  const [archiveFilter, setArchiveFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [dateFilter, setDateFilter] = useState<{ start: Date | undefined; end: Date | undefined }>(() => {
    const saved = sessionStorage.getItem("bookingsHistoryDateFilter");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          start: parsed.start ? new Date(parsed.start) : undefined,
          end: parsed.end ? new Date(parsed.end) : undefined
        };
      } catch (e) {
        return { start: undefined, end: undefined };
      }
    }
    return { start: undefined, end: undefined };
  });

  useEffect(() => {
    sessionStorage.setItem("bookingsHistoryDateFilter", JSON.stringify({
      start: dateFilter.start?.toISOString(),
      end: dateFilter.end?.toISOString()
    }));
  }, [dateFilter]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'blocked' | null>(null);
  const [sortOrder, setSortOrder] = useState<'next-booking' | 'name' | 'last-active'>('next-booking');

  const [unifiedEvents, setUnifiedEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [isGoogleSynced, setIsGoogleSynced] = useState(isSignedIn());
  const lastLoadTimeRef = useRef<number>(0);

  const uniqueCustomers = useMemo(() => {
    const today = startOfDay(new Date());
    
    const customersList = Array.from(
      new Set([
        ...items.map(b => (b.customer || '').trim()),
        ...unifiedEvents.map(e => (e.customer || 'INTERNAL: System Blocks').trim())
      ])
    ).filter(name => name && (name !== 'INTERNAL: System Blocks' || sourceFilter === 'Hybrid Availability System' || sourceFilter === 'INTERNAL: System Blocks')).map(customerName => {
      if (!customerName) return null;
      
      const customerData = customers.find(c => {
        const normalizedName = (c.full_name || c.name || '').trim().toLowerCase();
        return normalizedName === customerName.trim().toLowerCase();
      });
      
      // We'll filter events individually below, so we don't need to return null here
      // based on the customer profile's archive status. This ensures customers with 
      // active bookings show up in history regardless of their profile status.
      const isCustArchived = customerData?.is_archived === true;

      // Aggregate activity
      let customerEvents = [
        ...items.filter(b => {
          const isCustMatch = b.customer?.trim().toLowerCase() === customerName.trim().toLowerCase();
          const isArchived = (b as any).isArchived === true || (b as any).is_archived === true;
          const isArchiveVisible = 
            archiveFilter === 'all' ? true : 
            archiveFilter === 'archived' ? isArchived : !isArchived;
          
          const isBlocked = b.status === 'blocked' || (b as any).type === 'manual-block';
          const isBlockedVisible = (sourceFilter === 'Hybrid Availability System' || sourceFilter === 'INTERNAL: System Blocks') ? true : !isBlocked;
          
          return isCustMatch && isArchiveVisible && isBlockedVisible;
        }).map(b => ({ ...b, type: 'booking' as const })),
        ...unifiedEvents.filter(e => {
          const eCust = (e.customer || 'INTERNAL: System Blocks').trim().toLowerCase();
          const isCustMatch = eCust === customerName.trim().toLowerCase();
          const isArchived = (e as any).isArchived === true || (e as any).is_archived === true;
          const isArchiveVisible = 
            archiveFilter === 'all' ? true : 
            archiveFilter === 'archived' ? isArchived : !isArchived;
            
          const isBlocked = e.type === 'manual-block' || (e as any).status === 'blocked';
          const isBlockedVisible = (sourceFilter === 'Hybrid Availability System' || sourceFilter === 'INTERNAL: System Blocks') ? true : !isBlocked;
            
          return isCustMatch && isArchiveVisible && e.type !== 'booking' && isBlockedVisible;
        }),
        ...engagements.filter(eng => {
          const isNameMatch = eng.customer_name?.trim().toLowerCase() === customerName.trim().toLowerCase();
          const isEmailMatch = eng.customer_email && customerData?.email && eng.customer_email.trim().toLowerCase() === customerData.email.trim().toLowerCase();
          return isNameMatch || isEmailMatch;
        }).map(eng => ({
          ...eng,
          id: eng.id,
          date: eng.created_at, // Map to common date field
          type: 'activity' as const,
          originalType: eng.type,
          source: 'System Outreach'
        }))
      ];

      // Filters
      if (sourceFilter) {
        customerEvents = customerEvents.filter(e => {
          const s = ((e as any).source || (e as any).source_origin || '').toLowerCase();
          const f = sourceFilter.toLowerCase();
          // Match the specific source or if we're looking at Hybrid/System blocks
          if (f === 'hybrid availability system' || f === 'internal: system blocks') {
            return s === 'hybrid availability system' || s === 'internal: system blocks' || s === 'manual' || s === 'google';
          }
          if (f === 'public website') {
            return s === 'public website' || s === 'customer web';
          }
          return s === f;
        });
      }
      if (statusFilter) customerEvents = customerEvents.filter(e => ((e as any).status || (e.type === 'manual-block' ? 'blocked' : 'pending')) === statusFilter);
        if (dateFilter.start) {
          const start = startOfDay(dateFilter.start!);
          const end = endOfDay(dateFilter.end || dateFilter.start!);
          customerEvents = customerEvents.filter(e => isWithinInterval(parseISO(e.date), { start, end }));
          
          // Only show the customer if they have an actual booking or block in this timeframe,
          // ignoring customers who only have an engagement/activity log in this timeframe.
          const hasBookingOrBlock = customerEvents.some(e => e.type !== 'activity');
          if (!hasBookingOrBlock) return null;
        }

        if (customerEvents.length === 0) return null;

      // Analysis for sorting
      const sortedEvents = customerEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const future = customerEvents.filter(e => !isBefore(startOfDay(parseISO(e.date)), today));
      const past = customerEvents.filter(e => isBefore(startOfDay(parseISO(e.date)), today));
      
      const nextDate = future.length > 0 
        ? future.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0].date
        : null;
      const lastPastDate = past.length > 0
        ? past.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
        : null;

      const mostRecent = sortedEvents[0];
      const mostRecentBooking = sortedEvents.find(e => e.type === 'booking');

      return {
        name: customerName,
        bookingCount: customerEvents.length,
        lastBooking: mostRecentBooking ? mostRecentBooking.date : mostRecent.date,
        nextBookingDate: nextDate,
        lastPastBookingDate: lastPastDate,
        mostRecentStatus: mostRecentBooking ? mostRecentBooking.type : mostRecent.type,
        mostRecentStatusValue: mostRecentBooking 
          ? (mostRecentBooking.status || 'pending').toUpperCase() 
          : mostRecent.type === 'activity' 
            ? ((mostRecent as any).originalType || 'ENGAGED').toUpperCase() 
            : mostRecent.type === 'google-event'
              ? 'EXTERNAL'
              : 'BLOCKED',
        vehicle: (mostRecentBooking?.vehicleYear && mostRecentBooking?.vehicleMake)
          ? `${mostRecentBooking.vehicleYear} ${mostRecentBooking.vehicleMake} ${mostRecentBooking.vehicleModel}`
          : (mostRecent.vehicleYear && mostRecent.vehicleMake)
          ? `${mostRecent.vehicleYear} ${mostRecent.vehicleMake} ${mostRecent.vehicleModel}`
          : (customerName === 'INTERNAL: System Blocks' ? 'System Allocation' : 'N/A'),
        vehicles: customerData?.vehicles || [],
        address: mostRecent.type === 'booking' ? (items.find(i => i.id === mostRecent.id)?.address || customerData?.address || 'N/A') : 'Internal System',
        phone: customerData?.phone || '—',
        email: customerData?.email || '—',
        notes: customerData?.notes || '—',
        type: customerData?.type || 'customer',
        events: sortedEvents,
        isSystem: customerName === 'INTERNAL: System Blocks',
        id: customerData?.id
      };
    });

    const result = (customersList || []).filter(Boolean).sort((a: any, b: any) => {
      if (!a || !b) return 0;
      if (sortOrder === 'next-booking') {
        // 1. Future bookings first, soonest first (Ascending)
        if (a.nextBookingDate && !b.nextBookingDate) return -1;
        if (!a.nextBookingDate && b.nextBookingDate) return 1;
        if (a.nextBookingDate && b.nextBookingDate) {
          return new Date(a.nextBookingDate).getTime() - new Date(b.nextBookingDate).getTime();
        }
        // 2. Only past bookings last, latest first (Descending)
        if (a.lastPastBookingDate && b.lastPastBookingDate) {
          return new Date(b.lastPastBookingDate).getTime() - new Date(a.lastPastBookingDate).getTime();
        }
        return 0;
      }
      if (sortOrder === 'name') return (a.name || '').localeCompare(b.name || '');
      return new Date(b.lastBooking || 0).getTime() - new Date(a.lastBooking || 0).getTime();
    });


    return result;
  }, [items, unifiedEvents, customers, archiveFilter, sourceFilter, statusFilter, dateFilter, sortOrder]);


  const allServices = useMemo(() => [...servicePackages, ...getCustomPackages()], []);
  const allAddons = useMemo(() => [...addOns, ...getCustomAddOns()], []);

  const matchedCoupon = useMemo(() => {
    if (formData.discountType !== 'coupon' || !formData.discountCode) return null;
    const code = formData.discountCode.trim().toUpperCase();
    return coupons.find(c => c.code === code && c.active);
  }, [formData.discountCode, formData.discountType, coupons]);

  const liveSubtotal = useMemo(() => {
    let subtotal = 0;
    const vType = mapToServiceVehicleType(formData.vehicle);
    const pkg = allServices.find(s => s.name === formData.service);
    if (pkg) {
      subtotal = getServicePrice(pkg.id, vType);
    }
    
    if (formData.addons && formData.addons.length > 0) {
      formData.addons.forEach(addonName => {
        const canonical = getCanonicalAddonName(addonName);
        const addon = allAddons.find(a => a.name === canonical);
        if (addon) {
          subtotal += getAddOnPrice(addon.id, vType);
        }
      });
    }
    return subtotal;
  }, [formData.service, formData.vehicle, formData.addons, allServices, allAddons]);

  const liveTotal = useMemo(() => {
    let total = 0;
    const vType = mapToServiceVehicleType(formData.vehicle);
    const pkg = allServices.find(s => s.name === formData.service);
    if (pkg) {
      total = getServicePrice(pkg.id, vType);
    }
    
    if (formData.addons && formData.addons.length > 0) {
      formData.addons.forEach(addonName => {
        const canonical = getCanonicalAddonName(addonName);
        const addon = allAddons.find(a => a.name === canonical);
        if (addon) {
          total += getAddOnPrice(addon.id, vType);
        }
      });
    }

    if (formData.discountType === 'custom' && formData.customDiscount) {
      const customVal = Number(formData.customDiscount);
      if (!isNaN(customVal) && customVal > 0) {
        total = Math.max(0, total - customVal);
      }
    } else if (formData.discountType === 'coupon' && matchedCoupon) {
      if (matchedCoupon.percent) {
        total = Math.max(0, total * (1 - matchedCoupon.percent / 100));
      } else if (matchedCoupon.amount) {
        total = Math.max(0, total - matchedCoupon.amount);
      }
    }
    return total;
  }, [formData.service, formData.vehicle, formData.addons, allServices, allAddons, formData.discountType, formData.customDiscount, matchedCoupon]);

  const getEventPrice = useCallback((event: any) => {
    if (event.type !== 'booking') return 0;
    const booking = items.find(i => i.id === event.id) || event;
    const title = booking.title || booking.service_package;
    if (!title) return 0;
    
    const vType = mapToServiceVehicleType(booking.vehicle || booking.vehicleType);
    const svc = allServices.find(s => s.name === title);
    let total = svc ? getServicePrice(svc.id, vType) : 0;
    
    const addons = booking.addons || booking.add_ons || [];
    const addonsArray = Array.isArray(addons) ? addons : (typeof addons === 'string' ? JSON.parse(addons) : []);
    
    addonsArray.forEach((a: string) => {
      const canonical = getCanonicalAddonName(a);
      const addonDef = allAddons.find(ad => ad.name === canonical);
      if (addonDef) {
        total += getAddOnPrice(addonDef.id, vType);
      }
    });

    if (booking.discountAmount) {
      total = Math.max(0, total - booking.discountAmount);
    }
    return total;
  }, [items, allServices, allAddons]);

  const handleArchiveToggle = (booking: Booking) => {
    update(booking.id, { isArchived: !booking.isArchived });
    toast.success(booking.isArchived ? "Booking restored" : "Booking archived");
  };

  // Handlers
  const handleStartJob = () => {
    const params = new URLSearchParams();
    if (selectedCustomer?.id) params.set('customerId', selectedCustomer.id);
    if (formData.customer) params.set('customerName', formData.customer);
    if (selectedBooking?.id) params.set('id', selectedBooking.id); // PASS THE BOOKING ID

    // Find service ID
    const svc = allServices.find(s => s.name === formData.service);
    if (svc) params.set('package', svc.id);

    if (formData.vehicle) params.set('vehicleType', formData.vehicle);
    if (formData.vehicleYear) params.set('vehicleYear', formData.vehicleYear);
    if (formData.vehicleMake) params.set('vehicleMake', formData.vehicleMake);
    if (formData.vehicleModel) params.set('vehicleModel', formData.vehicleModel);
    if (formData.vehicleColor) params.set('vehicleColor', formData.vehicleColor);

    if (formData.addons.length > 0) {
      // Map names to IDs
      const aids = formData.addons.map(name => allAddons.find(a => a.name === name)?.id).filter(Boolean);
      params.set('addons', aids.join(','));
    }

    navigate(`/service-checklist?${params.toString()}`);
  };

  const handleVehicleSelect = (data: { make: string; model: string; category: string }) => {
    let mappedType = "";
    const cat = data.category;

    // Map ClassificationTool categories to clean standardized labels
    if (cat === "Compact") mappedType = "Compact/Sedan";
    else if (cat === "Midsize / Sedan") mappedType = "Compact/Sedan";
    else if (cat === "SUV / Crossover") mappedType = "Mid-Size/SUV";
    else if (cat === "Truck / Oversized") mappedType = "Truck/Van/Large SUV";
    else if (cat === "Oversized Specialty") mappedType = "Truck/Van/Large SUV";
    else if (cat.includes("Compact/Sedan")) mappedType = "Compact/Sedan";
    else if (cat.includes("Mid-Size/SUV")) mappedType = "Mid-Size/SUV";
    else if (cat.includes("Truck/Van/Large SUV")) mappedType = "Truck/Van/Large SUV";
    else if (cat.includes("Luxury/High-End")) mappedType = "Luxury/High-End";

    setFormData(prev => ({
      ...prev,
      vehicleMake: data.make,
      vehicleModel: data.model,
      vehicle: mappedType || prev.vehicle
    }));
  };

  // Fetch employees and sync
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const emps = await getSupabaseEmployees(); // Use Supabase
        setEmployees(emps);
        
        // AUTO-ASSIGN: Default to Rick Berube for new bookings
        const rick = emps.find(e => 
          e.name.toLowerCase().includes('rick') || 
          e.email?.toLowerCase().includes('rberube') ||
          e.name.toLowerCase().includes('rberube54')
        );
        if (rick && !formData.assignedEmployee) {
          setFormData(prev => ({ 
            ...prev, 
            assignedEmployee: rick.id || rick.name 
          }));
        } else if (!formData.assignedEmployee) {
          setFormData(prev => ({ ...prev, assignedEmployee: "rberube54" }));
        }
      } catch (err) {
        console.error('Failed to fetch employees:', err);
      }
    };
    fetchEmployees();
  }, []);

  const fetchCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      fetchEngagements(); // Refresh engagements in parallel
      const custs = await getUnifiedCustomers();
      if (custs.length > 0) {
        setCustomers(custs);
      } else {
        console.warn('BookingsPage: getUnifiedCustomers returned empty. Falling back to localforage.');
        const localCusts = (await localforage.getItem<any[]>('customers')) || [];
        const mappedLocal = localCusts.map(c => ({ ...c, type: c.type || 'customer' }));
        setCustomers(mappedLocal);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      const localCusts = (await localforage.getItem<any[]>('customers')) || [];
      setCustomers(localCusts);
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  // Load unified events (bookings + manual blocks + Google Calendar)
  const loadUnifiedEvents = useCallback(async () => {
    const timestamp = Date.now();
    lastLoadTimeRef.current = timestamp;
    setEventsLoading(true);
    try {
      let startDate: Date, endDate: Date;

      if (viewMode === 'day') {
        startDate = startOfDay(currentDate);
        endDate = endOfDay(currentDate);
      } else if (viewMode === 'week') {
        startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
        endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
      } else if (viewMode === 'month') {
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
      } else {
        startDate = startOfYear(currentDate);
        endDate = endOfYear(currentDate);
      }

      const displayItems = isDemoMode ? MOCK_BOOKINGS : items;
      const events = await getUnifiedCalendarEvents(startDate, endDate, displayItems as any[]);

      // Only update if this is the latest requested load
      if (lastLoadTimeRef.current === timestamp) {
        setUnifiedEvents(isDemoMode ? events.filter(e => e.type === 'booking') : events);
      }
    } catch (error) {
      console.error('Failed to load unified events:', error);
    } finally {
      if (lastLoadTimeRef.current === timestamp) {
        setEventsLoading(false);
        setIsGoogleSynced(isSignedIn());
      }
    }
  }, [viewMode, currentDate, items]); // Removed refresh from deps

  useEffect(() => {
    // 1. Fetch Customers
    fetchCustomers();

    // 2. Realtime Subscription for Availability (Bookings handled by Store)
    const channel = supabase
      .channel('availability-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability_blocks' }, () => {
        loadUnifiedEvents();
      })
      .subscribe();

    // 3. Local event listener
    const handleLocalChange = () => loadUnifiedEvents();
    window.addEventListener('availability-changed', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('availability-changed', handleLocalChange);
    };
  }, [fetchCustomers, loadUnifiedEvents]);

  // NEW EFFECT: Ensure events reload when dependencies change
  useEffect(() => {
    loadUnifiedEvents();
  }, [loadUnifiedEvents]);

  // Handle URL query parameters for pre-filling booking form
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldAdd = params.get('add') === 'true';
    const customerId = params.get('customerId');
    const customerName = params.get('customerName');
    const email = params.get('email');
    const phone = params.get('phone');
    const vehicleYear = params.get('vehicleYear');
    const vehicleMake = params.get('vehicleMake');
    const vehicleModel = params.get('vehicleModel');
    const vehicleType = params.get('vehicleType');
    const vehicleColor = params.get('vehicleColor');
    const address = params.get('address');
    const notes = params.get('notes');

    if (shouldAdd) {
      setFormData(prev => ({
        ...prev,
        customerId: customerId || prev.customerId,
        customer: customerName ? decodeURIComponent(customerName) : prev.customer,
        address: address ? decodeURIComponent(address) : prev.address,
        email: email ? decodeURIComponent(email) : prev.email,
        phone: phone ? decodeURIComponent(phone) : prev.phone,
        vehicleYear: vehicleYear ? decodeURIComponent(vehicleYear) : prev.vehicleYear,
        vehicleMake: vehicleMake ? decodeURIComponent(vehicleMake) : prev.vehicleMake,
        vehicleModel: vehicleModel ? decodeURIComponent(vehicleModel) : prev.vehicleModel,
        vehicleColor: vehicleColor ? decodeURIComponent(vehicleColor) : prev.vehicleColor,
        vehicle: vehicleType ? decodeURIComponent(vehicleType) : prev.vehicle,
        notes: notes ? decodeURIComponent(notes) : prev.notes
      }));
      setSelectedDate(new Date());
      setIsAddModalOpen(true);

      // Clear URL params after opening
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.search]);

  // Resolve selectedCustomer if customerId is in URL but not yet selected
  useEffect(() => {
    if (formData.customerId && !selectedCustomer && customers.length > 0) {
      const cust = customers.find(c => c.id === formData.customerId);
      if (cust) {
        setSelectedCustomer(cust);
        // Also ensure vehicle matches if we have multiple
        if (cust.vehicles && cust.vehicles.length > 0) {
           const match = cust.vehicles.find((v: any) => 
            v.make === formData.vehicleMake && 
            v.model === formData.vehicleModel
           );
           if (match) {
             setFormData(prev => ({ ...prev, vehicleId: match.id }));
           }
        }
      }
    }
  }, [formData.customerId, selectedCustomer, customers]);

  // Sync view mode with URL param 'view'
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const viewParam = params.get('view');
    const bookingId = params.get('id');

    if (viewParam === 'analytics') {
      setViewMode('analytics');
    }

    if (bookingId && items.length > 0) {
      // ONLY trigger initialization if this is a NEW bookingId we haven't handled yet via URL
      if (lastHandledBookingId.current !== bookingId) {
        const booking = items.find(b => b.id === bookingId);
        if (booking) {
          lastHandledBookingId.current = bookingId;
          // Find matching customer
          const matchingCust = customers.find(c => c.name === booking.customer);
          setSelectedCustomer(matchingCust || null);
          setSelectedBooking(booking);
          
          // Populate formData
          setFormData({
            customer: booking.customer || "",
            customerId: booking.customerId || matchingCust?.id,
            email: booking.customerEmail || matchingCust?.email || "",
            phone: booking.customerPhone || matchingCust?.phone || "",
            service: booking.title || "",
            vehicle: booking.vehicle || matchingCust?.vehicleType || "",
            vehicleYear: booking.vehicleYear || matchingCust?.year || "",
            vehicleMake: booking.vehicleMake || matchingCust?.vehicle || "",
            vehicleModel: booking.vehicleModel || matchingCust?.model || "",
            vehicleColor: booking.vehicleColor || "",
            vehicleCondition: booking.vehicleCondition || "",
            address: booking.address || "",
            time: booking.date ? format(parseISO(booking.date), "HH:mm") : "09:00",
            endTime: booking.endTime ? format(parseISO(booking.endTime), "HH:mm") : "17:00",
            assignedEmployee: booking.assignedEmployee || "",
            bookedBy: booking.bookedBy || "",
            notes: booking.notes || "",
            addons: Array.isArray(booking.addons) ? booking.addons : [],
            hasReminder: booking.hasReminder || false,
            reminderFrequency: booking.reminderFrequency?.toString() || "3",
            status: booking.status || "confirmed",
            vehicleId: booking.vehicleId,
            discountType: booking.discountCode && booking.discountCode !== 'CUSTOM' ? 'coupon' : (booking.discountAmount ? 'custom' : 'coupon'),
            discountCode: booking.discountCode && booking.discountCode !== 'CUSTOM' ? booking.discountCode : '',
            customDiscount: booking.discountCode === 'CUSTOM' || (!booking.discountCode && booking.discountAmount) ? String(booking.discountAmount) : '',
            placeOfService: booking.placeOfService || "Customer's address",
            probonoReason: booking.probonoReason || "",
            probonoReasons: booking.probonoReasons || [],
            probonoPrimaryReason: booking.probonoPrimaryReason || ""
          });
          
          setSelectedDate(booking.date ? parseISO(booking.date) : new Date());
          setIsAddModalOpen(true);
          // Clear param so it doesn't re-open on every render
          window.history.replaceState({}, '', location.pathname);
        }
      }
    } else if (!bookingId) {
      // Clear the ref if no ID in URL so it can be re-triggered if user navigates back to an ID
      lastHandledBookingId.current = null;
    }
  }, [location.search, items, customers]);

  // Handle vehicle data returned from classification page
  useEffect(() => {
    if (location.state?.vehicleData) {
      const { make, model, category } = location.state.vehicleData;
      setFormData(prev => ({
        ...prev,
        vehicleMake: make || prev.vehicleMake,
        vehicleModel: model || prev.vehicleModel,
        vehicle: category || prev.vehicle
      }));
      // Open booking modal if not already open
      if (!isAddModalOpen) {
        setIsAddModalOpen(true);
      }
      // Clear state to prevent re-applying
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, isAddModalOpen, navigate]);

  // 1. One-time Initialization
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initPage = async () => {
      // Refresh store data first
      await refresh();

      // Initialize GCal in background
      try {
        const config = await getCalendarConfig();
        if (config.clientId && config.apiKey) {
          await initGoogleCalendar(config);
        }
      } catch (e) {
        console.warn("[BookingsPage] GCal background init failed:", e);
      }

      // Initial event load
      loadUnifiedEvents();
    };

    initPage();
  }, []); // Empty dependencies = run once on mount

  // 2. Focus Refresh (only when tab becomes active)
  useEffect(() => {
    const onFocus = () => {
      refresh();
      loadUnifiedEvents();
      setIsGoogleSynced(isSignedIn());
    };
    window.addEventListener("focus", onFocus);
    
    const handleAuthComplete = () => {
      setIsGoogleSynced(true);
      loadUnifiedEvents();
    };
    window.addEventListener('g_cal_auth_complete', handleAuthComplete);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener('g_cal_auth_complete', handleAuthComplete);
    };
  }, [loadUnifiedEvents, refresh]);

  const handleSyncGoogleCalendar = async () => {
    const syncToast = toast.loading("Syncing Google Calendar...");
    try {
      await signInToGoogle();
      setIsGoogleSynced(true);
      await loadUnifiedEvents();
      toast.success("Personal calendar items synchronized!", { id: syncToast });
    } catch (err: any) {
      console.error("Manual sync failed:", err);
      toast.error(err.message || "Failed to sync calendar", { id: syncToast });
    }
  };

  // Calendar Grid Generation
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  // Filter bookings for the current view
  const monthBookings = useMemo(() => {
    return items.filter(b => {
      const isArchived = b.isArchived;
      const isArchiveVisible = 
        archiveFilter === 'all' ? true : 
        archiveFilter === 'archived' ? isArchived : !isArchived;
      if (!isArchiveVisible) return false;
      const d = parseISO(b.date);
      return isSameMonth(d, currentDate);
    });
  }, [items, currentDate, archiveFilter]);

  const getBookingsForDay = (day: Date) => {
    // Get unified events for this day
    return unifiedEvents.filter(event => {
      return isSameDay(parseISO(event.date), day);
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Get real bookings only (for legacy compatibility)
  const getRealBookingsForDay = (day: Date) => {
    return items.filter(b => {
      const isArchived = b.isArchived;
      const isArchiveVisible = 
        archiveFilter === 'all' ? true : 
        archiveFilter === 'archived' ? isArchived : !isArchived;
      if (!isArchiveVisible) return false;
      return isSameDay(parseISO(b.date), day);
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Status styling helpers
  const getStatusColor = (status: BookingStatus | undefined, type?: string) => {
    if (type === 'google-event') return 'bg-blue-600/20 border-blue-600 text-blue-200 shadow-[0_0_10px_rgba(37,99,235,0.2)]';
    if (type === 'manual-block') return 'bg-blue-500/20 border-blue-500 text-blue-200';

    switch (status) {
      case 'tentative':
        return 'bg-yellow-500/10 border-yellow-500/50 border-dashed text-yellow-200';
      case 'blocked':
        return 'bg-red-500/10 border-red-500/50 border-dashed text-red-200';
      case 'confirmed':
        return 'bg-primary/20 border-primary text-primary-foreground';
      case 'pending':
        return 'bg-orange-500/20 border-orange-500 text-orange-200';
      case 'in_progress':
        return 'bg-blue-500/20 border-blue-500 text-blue-200';
      case 'done':
        return 'bg-green-500/20 border-green-500 text-green-200';
      case 'rescheduled':
        return 'bg-cyan-500/10 border-cyan-500/50 border-dashed text-cyan-200';
      default:
        return 'bg-primary/20 border-primary text-primary-foreground';
    }
  };

  const getStatusIcon = (status: BookingStatus | undefined) => {
    switch (status) {
      case 'tentative': return '⏱';
      case 'blocked': return '🚫';
      case 'confirmed': return '✓';
      case 'pending': return '⏳';
      case 'in_progress': return '🔄';
      case 'done': return '✅';
      case 'rescheduled': return '🔄';
      default: return '✓';
    }
  };

  // Handlers
  const handlePrev = () => {
    if (viewMode === 'day') setCurrentDate(date => { const d = new Date(date); d.setDate(d.getDate() - 1); return d; });
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else if (viewMode === 'year') setCurrentDate(subYears(currentDate, 1));
    else setCurrentDate(subMonths(currentDate, 1));
  };
  const handleNext = () => {
    if (viewMode === 'day') setCurrentDate(date => { const d = new Date(date); d.setDate(d.getDate() + 1); return d; });
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else if (viewMode === 'year') setCurrentDate(addYears(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  };
  const handleToday = () => setCurrentDate(new Date());

  const handleDayClick = (day: Date) => {
    if (!isAdmin) return;
    setSelectedDate(day);
    setSelectedBooking(null);
    setSelectedCustomer(null);
    const defaultCoupon = coupons.find(c => c.active)?.code || "";
    setFormData({
      customerId: undefined,
      customer: "",
      email: "",
      phone: "",
      service: "",
      vehicle: "",
      vehicleYear: "",
      vehicleMake: "",
      vehicleModel: "",
      vehicleColor: "",
      vehicleCondition: "",
      address: "",
      time: "09:00",
      endTime: "17:00",
      assignedEmployee: "",
      bookedBy: getCurrentUser()?.name || '',
      notes: "",
      addons: [],
      hasReminder: false,
      reminderFrequency: "3",
      status: (getCurrentUser()?.role === 'admin' ? 'confirmed' : 'tentative') as BookingStatus,
      vehicleId: undefined,
      discountType: "coupon",
      discountCode: defaultCoupon,
      customDiscount: "",
      placeOfService: "Customer's address",
      probonoReason: "",
      probonoReasons: [],
      probonoPrimaryReason: ""
    });
    setIsAddModalOpen(true);
  };

  const handleBookingClick = async (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();

    // If it's a manual block, handle separately
    if (event.type === 'manual-block') {
      if (window.confirm(`Delete manual block: "${event.title}"?`)) {
        try {
          await unblockSlot(event.id);
          toast.success("Manual block removed");
          // Refresh view
          window.dispatchEvent(new Event('availability-changed'));
        } catch (err) {
          toast.error("Failed to remove manual block");
        }
      }
      return;
    }

    if (event.type === 'google-event') {
      toast.info("This is a Google Calendar event. Update it in your Google Calendar.");
      return;
    }

    // It is a real booking
    const booking = event as Booking; // Cast is safe here because type is not manual-block or google-event
    setSelectedBooking(booking);
    const matchingCust = customers.find(c => c.name === booking.customer);
    setSelectedCustomer(matchingCust || null);

    // Populate formData from booking first, then fallback to customer
    setFormData({
      customer: booking.customer || "",
      customerId: booking.customerId || matchingCust?.id,
      email: booking.customerEmail || matchingCust?.email || "",
      phone: booking.customerPhone || matchingCust?.phone || "",
      service: booking.title || "",
      vehicle: booking.vehicle || matchingCust?.vehicleType || "",
      vehicleYear: booking.vehicleYear || matchingCust?.year || "",
      vehicleMake: booking.vehicleMake || matchingCust?.vehicle || "",
      vehicleModel: booking.vehicleModel || matchingCust?.model || "",
      vehicleColor: booking.vehicleColor || "",
      vehicleCondition: booking.vehicleCondition || "",
      address: booking.address || matchingCust?.address || "",
      time: booking.date ? format(parseISO(booking.date), "HH:mm") : "09:00",
      endTime: booking.endTime ? format(parseISO(booking.endTime), "HH:mm") : "17:00",
      assignedEmployee: booking.assignedEmployee || "",
      bookedBy: booking.bookedBy || "",
      notes: booking.notes || matchingCust?.notes || "",
      addons: (Array.isArray(booking.addons) ? booking.addons : []).map(a => getCanonicalAddonName(a)),
      hasReminder: booking.hasReminder || false,
      reminderFrequency: booking.reminderFrequency?.toString() || "3",
      status: booking.status || "confirmed",
      vehicleId: booking.vehicleId,
      discountType: booking.discountCode && booking.discountCode !== 'CUSTOM' ? 'coupon' : (booking.discountAmount ? 'custom' : 'coupon'),
      discountCode: booking.discountCode && booking.discountCode !== 'CUSTOM' ? booking.discountCode : '',
      customDiscount: booking.discountCode === 'CUSTOM' || (!booking.discountCode && booking.discountAmount) ? String(booking.discountAmount) : '',
      placeOfService: booking.placeOfService || "Customer's address",
      probonoReason: booking.probonoReason || "",
      probonoReasons: booking.probonoReasons || [],
      probonoPrimaryReason: booking.probonoPrimaryReason || ""
    });
    
    if (booking.date) {
      setSelectedDate(parseISO(booking.date));
    }
    
    setIsAddModalOpen(true);
  };

  const handleBellClick = (e: React.MouseEvent, booking: Booking) => {
    e.stopPropagation();
    setViewMode("analytics");
    setAnalyticsDefaultTab("reminders");
  };

   // Helper: Notify Admin of Employee Actions
  const notifyEmployeeChange = async (action: 'create' | 'update' | 'delete', booking: Booking | any) => {
    // Only notify if current user is an employee (or checking role strictly)
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'employee') return;

    try {
      // 1. Push Bell Notification
      const title = `Employee ${action.toUpperCase()} Booking`;
      const msg = `${currentUser.name} has ${action}d a booking for ${booking.customer} on ${format(parseISO(booking.date), 'MMM d, yyyy')}.`;
      await import("@/lib/adminAlerts").then(m => m.pushAdminAlert('booking_created', msg, 'system', { id: booking.id }));

      // 2. Generate PDF Evidence (reuse logic or simplified)
      // We reuse the form data if it matches the booking, or use booking data
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(`Employee Action Report: ${action.toUpperCase()}`, 20, 20);
      doc.setFontSize(10);
      doc.text(`Employee: ${currentUser.name} (${currentUser.email})`, 20, 30);
      doc.text(`Timestamp: ${new Date().toLocaleString()}`, 20, 35);
      doc.text(`Action: ${action}`, 20, 40);

      doc.line(20, 45, 190, 45);

      let y = 55;
      doc.text(`Customer: ${booking.customer}`, 20, y); y += 6;
      doc.text(`Service: ${booking.title}`, 20, y); y += 6;
      doc.text(`Date: ${format(parseISO(booking.date), 'MMM d, yyyy')}`, 20, y); y += 6;
      if (booking.price) { doc.text(`Price: $${booking.price}`, 20, y); y += 6; }

      const pdfDataUrl = doc.output('datauristring');
      const fileName = `Audit_${currentUser.name}_${booking.customer}_${Date.now()}.pdf`;

      // Use 'Admin Updates' or 'Jobs' as category, 'Employee_Audits' was not in type
      await savePDFToArchive('Admin Updates', booking.customer, `audit-${Date.now()}`, pdfDataUrl, { fileName });

      toast.info("Admin notified of change (Audit PDF generated).");

    } catch (e) {
      console.error("Failed to notify admin change", e);
    }
  };

  const handleSavePDF = () => {
    if (!formData.customer || !formData.service) {
      toast.error('Please fill in Customer and Service to generate PDF');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('New Booking Details', 20, 20);

    doc.setFontSize(10);
    doc.text(`Created: ${new Date().toLocaleString()}`, 20, 28);

    // Draw a line
    doc.setLineWidth(0.5);
    doc.line(20, 32, 190, 32);

    let y = 45;
    const addLine = (label: string, value: string) => {
      doc.setFont(undefined, 'bold');
      doc.text(label, 20, y);
      doc.setFont(undefined, 'normal');
      doc.text(String(value || 'N/A'), 60, y);
      y += 8;
    };

    addLine('Customer:', formData.customer);
    if (formData.email) addLine('Email:', formData.email);
    if (formData.phone) addLine('Phone:', formData.phone);
    addLine('Service:', formData.service);
    if (formData.addons && formData.addons.length > 0) {
      addLine('Add-Ons:', formData.addons.join(', '));
    }
    addLine('Date:', selectedDate ? format(selectedDate, "MMM d, yyyy") : 'N/A');
    addLine('Time:', formData.time);
    addLine('Address:', formData.address);

    y += 4;
    doc.setFont(undefined, 'bold');
    doc.text('Vehicle Information:', 20, y);
    y += 8;
    addLine('Type:', formData.vehicle);
    addLine('Details:', `${formData.vehicleYear} ${formData.vehicleMake} ${formData.vehicleModel}`);

    y += 4;
    addLine('Assigned To:', formData.assignedEmployee);

    if (formData.notes) {
      y += 4;
      doc.setFont(undefined, 'bold');
      doc.text('Notes:', 20, y);
      y += 6;
      doc.setFont(undefined, 'normal');
      const splitNotes = doc.splitTextToSize(formData.notes, 170);
      doc.text(splitNotes, 20, y);
    }

    const pdfDataUrl = doc.output('dataurlstring');
    const safeName = formData.customer.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Booking_${safeName}_${new Date().getTime()}.pdf`;

    savePDFToArchive(
      'Bookings',
      formData.customer,
      `b-pdf-${Date.now()}`,
      pdfDataUrl,
      { fileName }
    );
    toast.success('PDF saved to File Manager (Bookings)');
  };

  const handleSave = async (triggerEmailSend: boolean = false) => {
    console.log("!!! SAVE BUTTON CLICKED !!!", { triggerEmailSend });
    if (!isAdmin) {
      toast.error('Employees cannot edit or save bookings.');
      return;
    }
    
    // 1. Validation Logic
    if (isDemoMode) {
      toast.info("Demo Mode (Read-Only): Booking simulation successful. No data was saved.");
      setIsAddModalOpen(false);
      return;
    }

    if (!formData.customer || !formData.service) {
      toast.error("Customer and Service are required");
      return;
    }

    console.log(">>> handleSave EXECUTION STARTED");
    const saveToast = toast.loading("Saving booking...");
    try {
      // 1. Sync to Customer Profile (Blocking for Supabase, non-blocking for Local)
      let finalCustomerId = (selectedCustomer?.name === formData.customer) ? selectedCustomer?.id : formData.customerId;
      
      const custPayload = {
        id: finalCustomerId,
        name: formData.customer,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        type: (selectedCustomer?.type === 'customer' || formData.status === 'confirmed' || triggerEmailSend || formData.status === 'done' || formData.status === 'in_progress') ? 'customer' : 'prospect',
        updatedAt: new Date().toISOString(),
        vehicles: [{
          make: formData.vehicleMake,
          model: formData.vehicleModel,
          year: formData.vehicleYear,
          type: formData.vehicle,
          color: formData.vehicleColor,
          condition: formData.vehicleCondition
        }]
      };

      if (!isDemoMode) {
        try {
          const savedCust = await upsertSupabaseCustomer(custPayload);
          if (savedCust?.id) {
            finalCustomerId = savedCust.id;
            console.log("✅ Customer record verified/created in Supabase:", finalCustomerId);
          }
        } catch (e) {
          console.error('⚠️ Critical: Supabase customer sync failed. Booking will proceed but record might be disconnected.', e);
        }
      }

      // Also sync locally for legacy fallback / offline support
      upsertCustomer({ ...custPayload, id: finalCustomerId }).catch(e => console.error('Local customer sync failed', e)); 

      // 2. Prepare Date Objects
      const dateBase = selectedDate || new Date();
      const timeStr = formData.time || "09:00";
      const [hours, minutes] = timeStr.split(":").map(Number);
      const date = new Date(dateBase);
      date.setHours(isNaN(hours) ? 9 : hours, isNaN(minutes) ? 0 : minutes, 0, 0);

      const endTimeStr = formData.endTime || "17:00";
      const [endHours, endMinutes] = endTimeStr.split(":").map(Number);
      const endDate = new Date(dateBase);
      endDate.setHours(isNaN(endHours) ? 17 : endHours, isNaN(endMinutes) ? 0 : endMinutes, 0, 0);
      let calculatedPrice = 0;
      const finalVType = mapToServiceVehicleType(formData.vehicle);
      const pkg = allServices.find(s => s.name === formData.service);
      if (pkg) {
        calculatedPrice = getServicePrice(pkg.id, finalVType);
      }
      
      if (formData.addons && formData.addons.length > 0) {
        formData.addons.forEach(addonName => {
          const addon = allAddons.find(a => a.name === addonName);
          if (addon) {
            calculatedPrice += getAddOnPrice(addon.id, finalVType);
          }
        });
      }
 
      // Apply discount to calculatedPrice if matched or manual
      let discountAmount = 0;
      let finalDiscountCode = "";
      
      if (formData.discountType === 'custom' && formData.customDiscount) {
        const customVal = Number(formData.customDiscount);
        if (!isNaN(customVal) && customVal > 0) {
          discountAmount = customVal;
          finalDiscountCode = "CUSTOM";
        }
      } else if (formData.discountType === 'coupon' && matchedCoupon) {
        finalDiscountCode = matchedCoupon.code;
        if (matchedCoupon.percent) {
          discountAmount = calculatedPrice * (matchedCoupon.percent / 100);
        } else if (matchedCoupon.amount) {
          discountAmount = matchedCoupon.amount;
        }
      }
      
      const finalPriceForTotal = Math.max(0, calculatedPrice - discountAmount);
 
      let resultingBooking: any;
 
      if (selectedBooking) {
        // Update
        const updates: Partial<Booking> = {
          customer: formData.customer,
          title: formData.service,
          date: date.toISOString(),
          endTime: endDate.toISOString(),
          status: triggerEmailSend ? 'confirmed' : (formData.status as any),
          vehicle: formData.vehicle,
          vehicleYear: formData.vehicleYear,
          vehicleMake: formData.vehicleMake,
          vehicleModel: formData.vehicleModel,
          vehicleColor: formData.vehicleColor,
          vehicleCondition: formData.vehicleCondition,
          address: formData.address,
          assignedEmployee: formData.assignedEmployee,
          bookedBy: formData.bookedBy,
          notes: formData.notes,
          addons: formData.addons,
          hasReminder: formData.hasReminder,
          reminderFrequency: parseInt(formData.reminderFrequency) || 0,
          vehicleId: formData.vehicleId,
          customerId: finalCustomerId,
          customerEmail: formData.email,
          customerPhone: formData.phone,
          price: calculatedPrice,
          discountCode: finalDiscountCode,
          discountAmount: discountAmount,
          placeOfService: formData.placeOfService,
          probonoReason: formData.probonoReason || "",
          probonoReasons: formData.probonoReasons || [],
          probonoPrimaryReason: formData.probonoPrimaryReason || ""
        };
        
        if (triggerEmailSend) {
          (updates as any).last_email_sent_at = new Date().toISOString();
        }

        // Reschedule Tracking Logic
        const oldDateObj = new Date(selectedBooking.date);
        const newDateObj = date;
        const dateChanged = oldDateObj.getTime() !== newDateObj.getTime();
        const statusChangedToRescheduled = formData.status === 'rescheduled' && selectedBooking.status !== 'rescheduled';

        if (dateChanged || statusChangedToRescheduled) {
          const rawHistory = (selectedBooking as any).rescheduleHistory || (selectedBooking as any).booking_vehicle?.reschedule_history || [];
          const existingHistory = Array.isArray(rawHistory) ? rawHistory : [];
          
          const newHistoryItem = {
            originalDate: selectedBooking.date,
            newDate: date.toISOString(),
            updatedAt: new Date().toISOString(),
            statusAtReschedule: formData.status
          };
          const updatedHistory = [...existingHistory, newHistoryItem];
          
          (updates as any).rescheduleHistory = updatedHistory;
          (updates as any).booking_vehicle = {
            ...((selectedBooking as any).booking_vehicle || {}),
            reschedule_history: updatedHistory
          };

          try {
            const formattedOldDate = format(oldDateObj, "MMMM dd, yyyy 'at' h:mm a");
            const formattedNewDate = format(newDateObj, "MMMM dd, yyyy 'at' h:mm a");
            const noteText = `Booking "${selectedBooking.title || formData.service}" rescheduled from ${formattedOldDate} to ${formattedNewDate}.`;
            
            await supabase.from('engagements').insert({
              customer_id: finalCustomerId,
              customer_name: formData.customer,
              customer_email: formData.email,
              note: noteText,
              type: 'rescheduled',
              created_at: new Date().toISOString()
            });

            const currentLocalDateStr = format(new Date(), "MMMM dd, yyyy");
            const rescheduleNoteLine = `\n\n[RESCHEDULED on ${currentLocalDateStr}]: Moved from ${formattedOldDate} to ${formattedNewDate}.`;
            if (!updates.notes?.includes(rescheduleNoteLine)) {
              updates.notes = (updates.notes || "") + rescheduleNoteLine;
            }
          } catch (crmErr) {
            console.error("⚠️ Failed to log reschedule history:", crmErr);
          }
        }
        
        await update(selectedBooking.id, updates);
        resultingBooking = { ...selectedBooking, ...updates };
 
        // Notify Admin if Employee
        const currentUser = getCurrentUser();
        if (currentUser?.role === 'employee') {
          await auditEmployeeAction('update', 'Booking', resultingBooking);
        }
      } else {
        const newBooking: Booking = {
          id: (typeof crypto !== 'undefined' && crypto.randomUUID) 
            ? crypto.randomUUID() 
            : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
              }),
          customer: formData.customer,
          customerId: finalCustomerId,
          title: formData.service,
          date: date.toISOString(),
          endTime: endDate.toISOString(),
          status: triggerEmailSend ? 'confirmed' : ((getCurrentUser()?.role === 'admin' ? formData.status : 'tentative') as any),
          vehicle: formData.vehicle,
          vehicleYear: formData.vehicleYear,
          vehicleMake: formData.vehicleMake,
          vehicleModel: formData.vehicleModel,
          vehicleColor: formData.vehicleColor,
          vehicleCondition: formData.vehicleCondition,
          address: formData.address,
          assignedEmployee: formData.assignedEmployee,
          bookedBy: formData.bookedBy || getCurrentUser()?.name || 'Staff',
          notes: formData.notes,
          addons: formData.addons,
          hasReminder: formData.hasReminder,
          reminderFrequency: parseInt(formData.reminderFrequency) || 0,
          vehicleId: formData.vehicleId,
          customerEmail: formData.email,
          customerPhone: formData.phone,
          price: calculatedPrice,
          createdAt: new Date().toISOString(),
          discountCode: finalDiscountCode,
          discountAmount: discountAmount,
          placeOfService: formData.placeOfService,
          probonoReason: formData.probonoReason || "",
          probonoReasons: formData.probonoReasons || [],
          probonoPrimaryReason: formData.probonoPrimaryReason || ""
        };
        
        if (triggerEmailSend) {
          (newBooking as any).last_email_sent_at = new Date().toISOString();
        }
        
        await add(newBooking as any);
        resultingBooking = newBooking;

        // AUDIT for Employee
        const userForAudit = getCurrentUser();
        if (userForAudit?.role === 'employee') {
          await auditEmployeeAction('create', 'Booking', resultingBooking);
        }
      }

      toast.dismiss(saveToast);
      toast.success(selectedBooking ? "Booking updated" : "Booking created");
      
      // Post-save logic (Google Sync, PDF, etc)
      if (isSignedIn()) {
        try {
          await createGoogleEvent({
            summary: `Detailing: ${resultingBooking.customer}`,
            description: `Service: ${resultingBooking.title}\nVehicle: ${resultingBooking.vehicle}\nNotes: ${resultingBooking.notes || 'No notes'}`,
            start: new Date(resultingBooking.date),
            end: resultingBooking.endTime ? new Date(resultingBooking.endTime) : new Date(new Date(resultingBooking.date).getTime() + 3 * 60 * 60000),
          });
          toast.success("Synced to Google Calendar");
        } catch (err) {
          console.error("Google sync failed:", err);
          toast.error("Google Calendar sync failed.");
        }
      }

      // Generate and Save PDF automatically via the booking store logic (handled by add/update)
      // Removing explicit call here to prevent duplicate alerts
      /*
      try {
        handleSavePDF();
      } catch (pdfErr) {
        console.error("PDF generation failed:", pdfErr);
      }
      */

      // Final cleanup and close
      // Final cleanup and close
      console.log("Save complete, closing modal...");
      setIsAddModalOpen(false);
      
      if (triggerEmailSend) {
        setSelectedBooking(resultingBooking);
        handlePreviewEmailForBooking(resultingBooking, 'confirmation');
      }
      
      // Refresh in background to ensure everything is in sync
      refresh();
      fetchCustomers(); // CRITICAL: Ensure new customer profiles are added to the local cache immediately
      loadUnifiedEvents();
      
      // Delay state resets slightly to allow modal animation to complete
      setTimeout(() => {
        setSelectedBooking(null);
        setSelectedCustomer(null);
        setFormData({
          customerId: undefined,
          customer: "",
          email: "",
          phone: "",
          service: "",
          vehicle: "",
          vehicleYear: "",
          vehicleMake: "",
          vehicleModel: "",
          vehicleColor: "",
          vehicleCondition: "",
          address: "",
          time: "09:00",
          endTime: "17:00",
          assignedEmployee: "",
          bookedBy: "",
          notes: "",
          addons: [],
          hasReminder: false,
          reminderFrequency: "6",
          status: "confirmed",
          vehicleId: undefined,
          discountType: "coupon",
          discountCode: "",
          customDiscount: "",
          placeOfService: "Customer's address",
          probonoReason: "",
          probonoReasons: [],
          probonoPrimaryReason: ""
        });
      }, 300);

    } catch (saveErr: any) {
      toast.dismiss(saveToast);
      console.error("CRITICAL SAVE ERROR:", saveErr);
      toast.error(`Failed to save booking: ${saveErr.message || 'Unknown error'}`);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    
    try {
      update(selectedBooking.id, { status: 'cancelled' as any, notes: `${formData.notes}\n\n[CANCELLED]: ${cancelReason}` });
      
      // Trigger sync logic for cancellation email
      const { onBookingCancelled } = await import("@/lib/bookingsSync");
      await onBookingCancelled(selectedBooking, cancelReason);
      
      toast.success("Booking cancelled and customer notified.");
      setIsCancelConfirmOpen(false);
      setIsAddModalOpen(false);
      setCancelReason("");
    } catch (err) {
      console.error("Failed to cancel booking:", err);
      toast.error("Failed to cancel booking. Please try again.");
    }
  };

  const handleDelete = () => {
    if (selectedBooking) {
      setIsDeleteDialogOpen(true);
    }
  };

  const handleDuplicate = (booking: Booking | null = selectedBooking) => {
    if (!booking) return;

    // Find customer data
    const customer = customers.find(c => c.name === booking.customer);

    setFormData({
      customerId: undefined,
      customer: booking.customer,
      email: customer?.email || "",
      phone: customer?.phone || "",
      service: booking.title,
      vehicle: booking.vehicle || "",
      vehicleYear: booking.vehicleYear || "",
      vehicleMake: booking.vehicleMake || "",
      vehicleModel: booking.vehicleModel || "",
      vehicleColor: booking.vehicleColor || "",
      vehicleCondition: booking.vehicleCondition || "",
      address: booking.address || "",
      time: "09:00", // Default time for new booking
      endTime: "17:00",
      assignedEmployee: booking.assignedEmployee || "",
      bookedBy: booking.bookedBy || "",
      notes: booking.notes || "",
      addons: booking.addons || [],
      hasReminder: false,
      reminderFrequency: "3",
      status: booking.status || "confirmed",
      vehicleId: booking.vehicleId,
      discountType: booking.discountCode && booking.discountCode !== 'CUSTOM' ? 'coupon' : (booking.discountAmount ? 'custom' : 'coupon'),
      discountCode: booking.discountCode && booking.discountCode !== 'CUSTOM' ? booking.discountCode : '',
      customDiscount: booking.discountCode === 'CUSTOM' || (!booking.discountCode && booking.discountAmount) ? String(booking.discountAmount) : '',
      placeOfService: booking.placeOfService || "Customer's address",
      probonoReason: booking.probonoReason || "",
      probonoReasons: booking.probonoReasons || [],
      probonoPrimaryReason: booking.probonoPrimaryReason || ""
    });

    // Reset validation/selection states for "New" mode
    setSelectedBooking(null); // Ensure it's treated as new
    setSelectedCustomer(customer || null);
    setSelectedDate(parseISO(booking.date)); // Default to the original booking date (Same Day)
    setIsAddModalOpen(true);
    toast.info("Booking duplicated. Please select a new time.");
  };

  // 🗑️ Delete Test Bookings - Only deletes bookings with test notes
  const handleDeleteTestBookings = async () => {
    const testBookings = items.filter(b =>
      b.notes?.includes('Test booking - can be deleted') ||
      b.notes?.includes('[MOCK_DATA]') ||
      b.customer === 'Test Admin'
    );

    if (testBookings.length === 0) {
      toast.info('No test bookings found to delete');
      return;
    }

    const confirmed = window.confirm(
      `Delete ${testBookings.length} test booking(s)?\n\nThis will only delete bookings with notes: "Test booking - can be deleted"\n\nYour real bookings will NOT be affected.`
    );

    if (!confirmed) return;

    try {
      // Delete from Supabase
      for (const booking of testBookings) {
        if (booking.id) {
          await supabase.from('bookings').delete().eq('id', booking.id);
        }
      }

      // Refresh the bookings list
      await refresh();

      // Force calendar refresh
      window.dispatchEvent(new Event('availability-changed'));

      toast.success(`✅ Deleted ${testBookings.length} test booking(s)`);
    } catch (error) {
      console.error('Failed to delete test bookings:', error);
      toast.error('Failed to delete test bookings');
    }
  };


  const handlePrintFullSchedule = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 20;

    // Header
    doc.setFillColor(30, 58, 138); // Dark Blue
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text("Prime Auto Detail", 20, 25);
    doc.setFontSize(14);
    doc.setFont(undefined, 'normal');
    doc.text("Booking Schedule Report", 20, 33);

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 70, 33);

    y = 55;

    // Summary
    const activeBookings = items.filter(b => !b.isArchived);
    const totalEstValue = activeBookings.reduce((sum, b) => sum + (b.price || 0), 0);

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Active Bookings: ${activeBookings.length}`, 20, y);
    doc.text(`Estimated Total Value: $${totalEstValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, pageWidth - 90, y);

    y += 15;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, y - 5, pageWidth - 20, y - 5);

    // Sort by date
    const sortedBookings = [...activeBookings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedBookings.forEach((b, index) => {
      // Check if we need a new page
      if (y > pageHeight - 60) {
        doc.addPage();
        y = 20;
      }

      // Booking Container
      doc.setDrawColor(240, 240, 240);
      doc.setFillColor(252, 252, 252);
      doc.rect(20, y, pageWidth - 40, 65, 'FD');

      // Status Indicator
      let statusColor = [100, 100, 100]; // Default
      if (b.status === 'confirmed') statusColor = [16, 185, 129]; // Emerald
      if (b.status === 'tentative') statusColor = [245, 158, 11]; // Amber

      doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.rect(20, y, 4, 65, 'F');

      y += 10;
      doc.setTextColor(30, 58, 138);
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(b.title || "Standard Package", 30, y);

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.text(formatETDate(b.date) + " @ " + formatETTime(b.date), pageWidth - 90, y);

      y += 10;
      doc.setTextColor(60, 60, 60);
      doc.setFont(undefined, 'bold');
      doc.text("Customer:", 30, y);
      doc.setFont(undefined, 'normal');
      doc.text(`${b.customer || 'Unknown'} - ${b.customerEmail || b.customerPhone || 'N/A'}`, 60, y);

      const priceText = b.price ? `$${b.price.toFixed(2)}` : 'Est.';
      doc.setTextColor(16, 185, 129);
      doc.setFont(undefined, 'bold');
      doc.text(priceText, pageWidth - 45, y);

      y += 8;
      doc.setTextColor(60, 60, 60);
      doc.setFont(undefined, 'bold');
      doc.text("Vehicle:", 30, y);
      doc.setFont(undefined, 'normal');
      doc.text(`${b.vehicleYear || ''} ${b.vehicleMake || ''} ${b.vehicleModel || ''} (${b.vehicle || 'Unknown Type'})`, 60, y);

      y += 8;
      doc.setFont(undefined, 'bold');
      doc.text("Add-ons:", 30, y);
      doc.setFont(undefined, 'normal');
      doc.text((b.addons && b.addons.length > 0) ? b.addons.join(", ") : "None", 60, y);

      y += 8;
      doc.setFont(undefined, 'bold');
      doc.text("Notes:", 30, y);
      doc.setFont(undefined, 'normal');
      const notesLines = doc.splitTextToSize(b.notes || "No notes provided.", pageWidth - 100);
      doc.text(notesLines, 60, y);

      y += (notesLines.length * 5) + 5;

      // Separator
      y += 5;
    });

    // Footer on the last page
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Prime Auto Detail - Schedule Report - Official Business Record", pageWidth / 2, pageHeight - 10, { align: 'center' });

    doc.save(`Prime_Auto_Detail_Schedule_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success("Schedule report generated!");
  };


  const handleConvertToProspect = async (booking: any, type: 'prospect' | 'customer' = 'prospect') => {
    if (!booking) return;
    
    const confirmMsg = `Carry over all info for "${booking.customer || 'this customer'}" and create a new ${type} record?`;
    if (!window.confirm(confirmMsg)) return;

    const convertToast = toast.loading(`Converting booking to ${type}...`);
    try {
      // 1. Create the Profile record
      const payload = {
        name: booking.customer,
        email: booking.customerEmail || booking.email || "",
        phone: booking.customerPhone || booking.phone || "",
        address: booking.address || "",
        type: type,
        notes: `Created manually from booking history. Original Booking: ${booking.title} (${booking.date})`,
        vehicles: [{
          make: booking.vehicleMake || '',
          model: booking.vehicleModel || '',
          year: booking.vehicleYear || '',
          type: booking.vehicle || ''
        }]
      };

      const result = await upsertSupabaseCustomer(payload as any);
      
      if (result && result.id) {
        // 2. Link the booking to this new customer ID
        await update(booking.id, { customerId: result.id });
        
        toast.success(`Successfully created ${type} for ${booking.customer}`, { id: convertToast });
        
        // Refresh state
        fetchCustomers();
        refresh();
      } else {
        throw new Error("No ID returned from profile creation");
      }
    } catch (err: any) {
      console.error("Conversion failed:", err);
      toast.error(err.message || `Failed to create ${type} profile`, { id: convertToast });
    }
  };

  const handlePreviewEmailForBooking = (booking: any, forcedType?: any, engagement?: any) => {
    if (!booking) return;
    
    // Set form data to match the booking so the preview works
    const previewData = {
      ...formData,
      customer: booking.customer || booking.customer_name || '',
      email: booking.customerEmail || booking.email || booking.customer_email || '',
      phone: booking.customerPhone || booking.phone || '',
      address: booking.address || '',
      service: booking.service || booking.title || booking.note || '',
      notes: booking.notes || '',
      date: booking.date || booking.created_at || new Date().toISOString(),
      price: booking.price || booking.price_total || 0,
      vehicleYear: booking.vehicleYear || booking.year || '',
      vehicleMake: booking.vehicleMake || booking.make || '',
      vehicleModel: booking.vehicleModel || booking.model || '',
      vehicle: booking.vehicle || booking.vehicle_type || '',
      addons: Array.isArray(booking.addons) ? booking.addons : 
              (typeof booking.addons === 'string' ? JSON.parse(booking.addons) : []),
      // If we have engagement metadata, pass it through
      sent_at: engagement?.created_at || booking.last_email_sent_at,
      last_email_sent_at: engagement?.created_at || booking.last_email_sent_at
    };
    
    setEmailFormData(previewData);
    
    // Determine preview type based on status or forcedType
    let type: any = forcedType || 'request';
    if (!forcedType) {
      const stat = (booking.status || 'pending').toLowerCase();
      if (stat === 'confirmed') type = 'confirmation';
      else if (stat === 'cancelled') type = 'cancelled';
      else if (stat === 'done') type = 'payment-success';
    } else if (engagement?.type === 'retention') {
      type = 'reminder';
    } else if (engagement?.type === 'initial') {
      type = 'prospect';
    }
    
    setEmailPreviewType(type);
    setShowEmailPreview(true);
  };


  return (
    <div className="min-h-screen bg-background text-foreground w-full max-w-[100vw] overflow-x-hidden">
      <PageHeader title="Booking Calendar" subtitle="Manage appointments" />

      <div className="p-1 sm:p-6 space-y-6 lg:mt-4">
        {/* Unified Responsive Toolbar */}
        <div className="flex flex-col xl:flex-row items-center justify-between gap-4 mb-4 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/50 shadow-sm">
          
          <div className="flex items-center justify-between w-full xl:w-auto gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800 shadow-inner">
              <Button variant={viewMode === 'day' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('day')} className="h-8 text-xs px-3">Day</Button>
              <Button variant={viewMode === 'week' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('week')} className="h-8 text-xs px-3">Week</Button>
              <Button variant={viewMode === 'month' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('month')} className="h-8 text-xs px-3">Month</Button>
              <Button variant={viewMode === 'year' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('year')} className="h-8 text-xs px-3">Year</Button>
            </div>
            
            {/* Mobile Actions (Visible on small screens, grouped) */}
            <div className="flex gap-1.5 xl:hidden">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => refresh()} title="Refresh"><RotateCcw className="h-3.5 w-3.5" /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrintFullSchedule} title="Print"><Printer className="h-3.5 w-3.5" /></Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between w-full xl:w-auto gap-4">
            {/* Date Navigation & Label */}
            <div className="flex items-center bg-secondary/30 rounded-md border border-border h-9 shadow-sm">
              <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-zinc-800" onClick={handlePrev}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="font-semibold text-sm min-w-[150px] text-center tracking-tight text-zinc-200">
                {viewMode === 'day' ? format(currentDate, "EEEE, MMM d, yyyy") : viewMode === 'year' ? format(currentDate, "yyyy") : format(currentDate, "MMMM yyyy")}
              </span>
              <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-zinc-800" onClick={handleNext}><ChevronRight className="h-4 w-4" /></Button>
              <div className="w-px h-5 bg-border mx-1" />
              <Button variant="ghost" size="sm" onClick={handleToday} className="h-9 px-3 text-xs font-semibold hover:bg-zinc-800">Today</Button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Desktop/Tablet Actions */}
              <div className="hidden xl:flex items-center gap-1 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800 shadow-sm">
                <Button variant="ghost" size="icon" onClick={() => refresh()} className="h-7 w-7 text-zinc-400 hover:text-white" title="Refresh">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handlePrintFullSchedule} className="h-7 w-7 text-zinc-400 hover:text-white" title="Print All Bookings">
                  <Printer className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handlePurgeGenericBookings} className="h-7 w-7 text-red-500/50 hover:text-red-500" title="Cleanup Generic Test Bookings">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleSyncGoogleCalendar} 
                      className={cn(
                        "h-9 text-xs gap-1.5 transition-all px-3 hidden sm:flex shadow-sm",
                        isGoogleSynced ? "border-blue-500/50 text-blue-400 bg-blue-500/5 hover:bg-blue-500/10" : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                      )}
                    >
                      <CalendarIcon className={cn("h-3.5 w-3.5", isGoogleSynced && "animate-pulse")} />
                      {isGoogleSynced ? "Personal Sync" : "Personal Calendar"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isGoogleSynced ? "Your Google Calendar is connected and syncing personal items." : "Click to authorize and show your personal Google Calendar events."}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* New Booking Button */}
              {isAdmin && (
                <Button className="bg-primary hover:bg-primary/90 h-9 text-xs font-bold shadow-sm w-full sm:w-auto" onClick={() => {
                  setSelectedDate(new Date());
                  setFormData(prev => ({ ...prev, bookedBy: getCurrentUser()?.name || '' }));
                  setIsAddModalOpen(true);
                }}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> New
                </Button>
              )}
            </div>
          </div>
        </div>

        {viewMode === 'day' ? (
          <Card className="min-h-[600px] flex flex-col bg-zinc-950/50 border-zinc-800">
            {/* Day View Timeline Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
              <div>
                <h2 className="text-xl font-bold">{format(currentDate, "EEEE")}</h2>
                <p className="text-muted-foreground">{format(currentDate, "MMMM d, yyyy")}</p>
              </div>
              <Button onClick={() => handleDayClick(currentDate)} className="gap-2">
                <Plus className="h-4 w-4" /> Add Booking
              </Button>
            </div>

            {/* Timeline Grid */}
            <div className="flex-1 overflow-y-auto relative custom-scrollbar p-0">
              {/* Time Indicators (08:00 - 18:00) */}
              <div className="relative min-h-[800px]">
                {Array.from({ length: 13 }).map((_, i) => {
                  const hour = i + 7; // Start at 7 AM
                  return (
                    <div key={hour} className="flex h-[60px] border-b border-zinc-800/50 group hover:bg-zinc-900/10">
                      <div className="w-16 text-right pr-4 text-xs text-muted-foreground py-2 sticky left-0 bg-background/95 border-r border-zinc-800/50 z-10">
                        {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                      </div>
                      <div className="flex-1 relative">
                        {/* 30-min marker (dashed) */}
                        <div className="absolute top-1/2 left-0 right-0 border-t border-zinc-800/20 border-dashed w-full" />
                      </div>
                    </div>
                  );
                })}

                {/* Current Time Indicator */}
                {isToday(currentDate) && (() => {
                  const now = new Date();
                  const currentHour = now.getHours();
                  const currentMin = now.getMinutes();
                  // Pixel calculation: (Hour - 7) * 60px + Minutes
                  const top = Math.max(0, (currentHour - 7) * 60 + currentMin);
                  if (currentHour >= 7 && currentHour <= 19) {
                    return (
                      <div className="absolute left-16 right-0 border-t-2 border-red-500 z-20 pointer-events-none flex items-center" style={{ top: `${top}px` }}>
                        <div className="w-2 h-2 bg-red-500 rounded-full -ml-1" />
                      </div>
                    )
                  }
                  return null;
                })()}

                {/* Render Unified Events (Bookings + Manual Blocks + Google Calendar) */}
                {getBookingsForDay(currentDate).map(event => {
                  const start = new Date(event.date);
                  const startH = start.getHours();
                  const startM = start.getMinutes();

                  // Duration - assume 1h default if no end time, or calc diff
                  let durationMin = 60;
                  if (event.endTime) {
                    const end = new Date(event.endTime);
                    durationMin = (end.getTime() - start.getTime()) / 60000;
                  }
                  // Min height 30px
                  durationMin = Math.max(30, durationMin);

                  // Top position: (Hour - 7) * 60 + Min
                  const top = (startH - 7) * 60 + startM;

                  // Skip if outside 7am-8pm roughly or negative
                  if (top < 0) return null;

                  // Determine styling based on event type
                  let eventColor = '';
                  let eventIcon = '';

                  if (event.type === 'manual-block') {
                    eventColor = 'bg-blue-500/20 border-blue-500 text-blue-200';
                    eventIcon = '🔵';
                  } else if (event.type === 'google-event') {
                    eventColor = 'bg-purple-500/20 border-purple-500 text-purple-200';
                    eventIcon = '📅';
                  } else {
                    // Real booking - use status color
                    const booking = items.find(b => b.id === event.id);
                    eventColor = booking ? getStatusColor(booking.status) : 'bg-primary/20 border-primary text-primary-foreground';
                    eventIcon = booking ? getStatusIcon(booking.status) : '✓';
                  }

                  return (
                    <div
                      key={event.id}
                      onClick={(e) => handleBookingClick(e, event)}
                      className={cn(
                        "absolute left-20 right-4 rounded-md border p-2 text-xs shadow-sm cursor-pointer hover:brightness-110 transition-all z-10 overflow-hidden flex flex-col",
                        eventColor
                      )}
                      style={{
                        top: `${top}px`,
                        height: `${durationMin}px`,
                        minHeight: '40px'
                      }}
                    >
                      <div className="flex items-center gap-2 font-semibold">
                        {(() => {
                          const h = parseISO(event.date).getHours();
                          const isFull = event.type === 'manual-block' && !event.endTime;
                          return (
                            <div
                              className={cn(
                                "w-2 h-2 rounded-full shadow-sm flex-shrink-0",
                                isFull ? "bg-[#1e3a8a]" : (h < 12 ? "bg-[linear-gradient(90deg,#1e3a8a_0%,#ffffff_100%)] ring-[0.5px] ring-zinc-400" : "bg-[linear-gradient(90deg,#ffffff_0%,#1e3a8a_100%)] ring-[0.5px] ring-zinc-400")
                              )}
                            />
                          );
                        })()}
                        <span>{format(start, "h:mm a")}</span>
                        <span className="truncate">{event.customer || event.title}</span>
                      </div>
                      {event.type === 'booking' && <div className="opacity-90 truncate">{event.title}</div>}
                      {event.type === 'manual-block' && <div className="opacity-75 text-[10px]">Manual Block</div>}
                      {event.type === 'google-event' && <div className="opacity-75 text-[10px]">Google Calendar</div>}
                      <div className="mt-auto pt-1 flex items-center gap-1 text-[10px] uppercase font-bold opacity-80">
                        {event.isDeletable && <span className="text-red-400">Click to delete</span>}
                        {!event.isDeletable && <span className="text-zinc-500">Read-only</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        ) : viewMode === 'week' ? (
          <div className="space-y-4">
            {eachDayOfInterval({ start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) }).map(day => {
              const bookings = getBookingsForDay(day);
              const isTodayDate = isToday(day);
              return (
                <Card key={day.toString()} className={cn("p-4 border-zinc-800 bg-zinc-900/40", isTodayDate && "border-primary/50 bg-primary/5")}>
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className={cn("h-12 w-12 rounded-lg flex flex-col items-center justify-center border cursor-pointer hover:bg-zinc-800 transition-colors", isTodayDate ? "bg-primary text-primary-foreground border-primary" : "bg-zinc-800 border-zinc-700")}
                      onClick={() => { setCurrentDate(day); setViewMode('day'); }}
                      title="View Day Timeline"
                    >
                      <span className="text-xs font-semibold uppercase">{format(day, "EEE")}</span>
                      <span className="text-lg font-bold">{format(day, "d")}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{format(day, "MMMM d, yyyy")}</h3>
                      <p className="text-sm text-muted-foreground">{bookings.length} Event{bookings.length !== 1 && 's'}</p>
                    </div>
                    <div className="ml-auto">
                      <Button size="sm" variant="ghost" onClick={() => handleDayClick(day)}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {bookings.length === 0 && <p className="text-sm text-zinc-600 italic pl-16">No events scheduled.</p>}
                    {bookings.map((booking: CalendarEvent) => (
                      <div key={booking.id}
                        onClick={(e) => handleBookingClick(e, booking)}
                        className={cn("flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-zinc-800/50 transition-all", getStatusColor(booking.status as any, booking.type))}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-24 text-center text-xs font-mono flex flex-col items-center">
                            <span>{format(parseISO(booking.date), "h:mm a")}</span>
                            {booking.endTime && <span className="text-zinc-500 opacity-80">- {format(parseISO(booking.endTime), "h:mm a")}</span>}
                          </div>
                          <div>
                            <div className="font-semibold">{booking.customer || (booking as any).title}</div>
                            <div className="text-sm opacity-80 flex items-center gap-1.5">
                              {(() => {
                                const h = parseISO(booking.date).getHours();
                                const isFull = booking.type === 'manual-block' && !booking.endTime;
                                return (
                                  <div
                                    className={cn(
                                      "w-2 h-2 rounded-full shadow-sm flex-shrink-0",
                                      isFull ? "bg-[#1e3a8a]" : (h < 12 ? "bg-[linear-gradient(90deg,#1e3a8a_0%,#ffffff_100%)] ring-[0.5px] ring-zinc-400" : "bg-[linear-gradient(90deg,#ffffff_0%,#1e3a8a_100%)] ring-[0.5px] ring-zinc-400")
                                    )}
                                  />
                                );
                              })()}
                              {booking.type === 'booking'
                                ? `${(booking as any).title} • ${booking.vehicleYear || ''} ${booking.vehicleMake || ''} ${booking.vehicleModel || ''}`
                                : (booking as any).title}
                            </div>
                            <div className="flex items-center gap-1 text-xs mt-0.5 opacity-90 font-medium">
                              <span className="uppercase">{booking.status || (booking.type === 'manual-block' ? 'Blocked' : 'Event')}</span>
                            </div>
                            {booking.type === 'booking' && (((booking as Booking).customerEmail || (booking as any).email) || ((booking as Booking).customerPhone || (booking as any).phone)) && (
                              <div className="flex flex-col gap-0.5 mt-1.5 text-xs text-zinc-400 font-medium">
                                {((booking as Booking).customerEmail || (booking as any).email) && (
                                  <div>📧 {((booking as Booking).customerEmail || (booking as any).email)}</div>
                                )}
                                {((booking as Booking).customerPhone || (booking as any).phone) && (
                                  <div>📞 {((booking as Booking).customerPhone || (booking as any).phone)}</div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {booking.type === 'booking' && (booking as Booking).hasReminder && <Bell className="h-4 w-4 text-yellow-500 animate-pulse" />}
                          {booking.type === 'booking' && (booking as Booking).assignedEmployee && <Badge variant="secondary" className="text-xs">{(booking as Booking).assignedEmployee}</Badge>}
                          <div className="flex gap-1">
                            {booking.type === 'booking' && (
                              <>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={async (e) => { e.stopPropagation(); handleStartJob(); }}><Wrench className="h-4 w-4" /></Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={async (e) => { e.stopPropagation(); handleDuplicate(booking as Booking); }}><Copy className="h-4 w-4" /></Button>
                              </>
                            )}
                            {(booking.type === 'manual-block' || booking.type === 'booking') && (
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={(e) => handleBookingClick(e, booking)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : viewMode === 'year' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {eachMonthOfInterval({ start: startOfYear(currentDate), end: endOfYear(currentDate) }).map(month => (
              <Card key={month.toString()} className="p-4 bg-zinc-950 border-zinc-800">
                <h3 className="font-semibold mb-3 text-center">{format(month, "MMMM")}</h3>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] mb-1 text-zinc-500">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: startOfMonth(month).getDay() }).map((_, i) => <div key={`empty-${i}`} />)}
                  {eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }).map(day => {
                    const dayBookings = getBookingsForDay(day);
                    const hasBooking = dayBookings.length > 0;
                    const isDone = dayBookings.some(b => b.status === 'done');
                    return (
                      <div
                        key={day.toString()}
                        onClick={() => {
                          if (hasBooking) {
                            // Open history for the first customer of the day?
                            const custName = dayBookings[0].customer;
                            handleSelectHistoryCustomer(custName);
                            // Scroll to history? Handled by state but need to ensure it expands.
                            toast.info(`Viewing history for ${custName}`);
                          }
                        }}
                        className={cn(
                          "aspect-square flex items-center justify-center rounded-full text-[10px] cursor-pointer hover:bg-zinc-800 relative",
                          isToday(day) && "bg-zinc-800 text-white font-bold",
                          hasBooking && "font-bold text-white"
                        )}
                      >
                        {format(day, "d")}
                        {hasBooking && (
                          <div className={cn(
                            "absolute -bottom-0.5 w-1 h-1 rounded-full",
                            isDone ? "bg-green-500" : "bg-blue-500"
                          )} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-1 bg-zinc-950/50 border-zinc-800 shadow-2xl overflow-hidden rounded-xl">
            {/* Calendar Header */}
            <div className="grid grid-cols-7 mb-1 text-center py-2 bg-zinc-900/50 rounded-t-lg border-b border-zinc-800">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{day}</div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 auto-rows-fr bg-zinc-950 border-t border-l border-zinc-800/80">
              {calendarDays.map((day, dayIdx) => {
                const bookings = getBookingsForDay(day);
                const isSelectedMonth = isSameMonth(day, currentDate);
                const isTodayDate = isToday(day);

                // Removed Header Moons - Only showing inside cards now

                return (
                  <div
                    key={day.toString()}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "min-h-[140px] bg-zinc-950 p-2 relative group transition-colors hover:bg-zinc-900/80 cursor-pointer flex flex-col gap-1 border-r border-b border-zinc-800/80",
                      !isSelectedMonth && "bg-zinc-950/30 text-muted-foreground/40"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <span className={cn(
                        "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full relative",
                        isTodayDate ? "bg-primary text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                      )}>
                        {format(day, "d")}
                      </span>
                      {bookings.length > 0 && (
                        <span className="text-[10px] text-muted-foreground font-mono">{bookings.length}</span>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[100px] custom-scrollbar">
                      <TooltipProvider>
                        {bookings.map(booking => (
                          <Tooltip key={booking.id}>
                            <TooltipTrigger asChild>
                              <div
                                onClick={(e) => handleBookingClick(e, booking)}
                                className={cn(
                                  "text-xs px-2 py-1.5 rounded border truncate transition-all hover:scale-[1.02] shadow-sm relative",
                                  getStatusColor(booking.status as any, booking.type)
                                )}
                              >
                                <div className="flex items-center gap-1.5">
                                  {(() => {
                                    const hour = parseISO(booking.date).getHours();
                                    const isFull = booking.type === 'manual-block' && !booking.endTime;
                                    return (
                                      <div
                                        className={cn(
                                          "w-2 h-2 rounded-full shadow-sm flex-shrink-0",
                                          isFull ? "bg-[#1e3a8a]" : (hour < 12 ? "bg-[linear-gradient(90deg,#1e3a8a_0%,#ffffff_100%)] ring-[0.5px] ring-zinc-400" : "bg-[linear-gradient(90deg,#ffffff_0%,#1e3a8a_100%)] ring-[0.5px] ring-zinc-400")
                                        )}
                                      />
                                    );
                                  })()}
                                  <span className="font-mono opacity-70 text-[10px]">{format(parseISO(booking.date), "h:mm a")}</span>
                                  <span className="font-semibold truncate">{booking.customer || booking.title}</span>
                                </div>
                                <div className="truncate opacity-80 text-[10px] font-bold">
                                  {booking.title}
                                  {(booking as Booking).addons && (booking as Booking).addons!.length > 0 && (
                                    <span className="text-zinc-400 font-normal"> + {(booking as Booking).addons!.join(", ")}</span>
                                  )}
                                </div>

                                {/* Status Text for Month View */}
                                <div className="flex items-center gap-1 text-[9px] opacity-90 font-semibold uppercase mt-0.5">
                                  <span>{booking.status || (booking.type === 'manual-block' ? 'Blocked' : 'Event')}</span>
                                </div>

                                {booking.type === 'booking' && (booking as Booking).vehicleYear && (booking as Booking).vehicleMake && (
                                  <div className="truncate opacity-70 text-[9px]">
                                    {(booking as Booking).vehicleYear} {(booking as Booking).vehicleMake} {(booking as Booking).vehicleModel}
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="bg-zinc-900 text-white border-zinc-700 p-3 shadow-2xl z-[100] max-w-[250px]"
                            >
                              <div className="space-y-1.5">
                                <div className="font-bold flex items-center gap-2 border-b border-zinc-800 pb-1 mb-1">
                                  {(booking as any).icon || getStatusIcon(booking.status as any)}
                                  {booking.customer || booking.title}
                                </div>
                                <div className="flex items-center gap-2 text-xs font-mono text-blue-400">
                                  <Clock className="w-3 h-3" />
                                  {format(parseISO(booking.date), "PPP")}
                                </div>
                                <div className="flex items-center gap-2 text-xs font-black text-white">
                                  <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Time:</span>
                                  {format(parseISO(booking.date), "h:mm a")}
                                  {booking.endTime && ` - ${format(parseISO(booking.endTime), "h:mm a")}`}
                                </div>
                                <div className="text-xs text-zinc-300 italic">{booking.title}</div>
                                {booking.type === 'booking' && (
                                  <div className="pt-1 border-t border-zinc-800 mt-1 flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-[10px]">
                                      <Badge variant="outline" className="text-[9px] h-4 px-1">{booking.status}</Badge>
                                      {booking.assignedEmployee && <span className="text-zinc-400">👤 {booking.assignedEmployee}</span>}
                                    </div>
                                    {((booking as Booking).customerEmail || (booking as any).email) && (
                                      <div className="text-[10px] text-zinc-400">📧 {((booking as Booking).customerEmail || (booking as any).email)}</div>
                                    )}
                                    {((booking as Booking).customerPhone || (booking as any).phone) && (
                                      <div className="text-[10px] text-zinc-400">📞 {((booking as Booking).customerPhone || (booking as any).phone)}</div>
                                    )}
                                    {(booking as Booking).vehicleMake && (
                                      <div className="text-[10px] text-blue-300 font-semibold px-1 py-0.5 bg-blue-500/10 rounded border border-blue-500/20">
                                        🚗 {(booking as Booking).vehicleYear} {(booking as Booking).vehicleMake} {(booking as Booking).vehicleModel}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </TooltipProvider>
                    </div>

                    {/* Hover Add Button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                      <Plus className="h-8 w-8 text-zinc-700/50" />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )
        }

        {/* Booking Dialog */}
        <Dialog open={isAddModalOpen} onOpenChange={(open) => { if (!open) { setSelectedBooking(null); setSelectedCustomer(null); } setIsAddModalOpen(open); }}>
          <DialogContent className="w-[95vw] max-w-[500px] max-h-[85vh] flex flex-col bg-zinc-950 border-zinc-800 p-0">
            <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 shrink-0 border-b border-zinc-800/50 bg-zinc-900/20">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    {selectedBooking ? 'Edit Booking' : 'New Booking'}
                  </DialogTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-500">Scheduled Date:</label>
                    <Input
                      type="date"
                      className="w-32 h-7 text-xs bg-zinc-900 border-zinc-800"
                      value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")}
                      onChange={(e) => {
                        if (e.target.value) {
                          const [year, month, day] = e.target.value.split('-').map(Number);
                          const newDate = new Date(year, month - 1, day);
                          setSelectedDate(newDate);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* HEADER ACTIONS (CLEANER SAVE/CLOSE) */}
                <div className="flex items-center gap-1">
                  {isAdmin && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleSave(false)}
                      className="h-10 w-10 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                      title="Save Changes"
                    >
                      <Save className="h-6 w-6" />
                    </Button>
                  )}

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsAddModalOpen(false)}
                    className="h-10 w-10 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                    title="Close"
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="overflow-y-auto flex-1 px-4 sm:px-6">
              <div className="grid gap-4 py-4">
                {/* SUMMARY HEADER (READ ONLY) */}
                <div className="p-3 bg-zinc-950/50 rounded-lg border border-purple-500/20 mb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-1">Service Summary</div>
                      <div className="text-white font-black text-xl tracking-tight leading-tight uppercase">{formData.service || "No Service Selected"}</div>
                      {formData.addons && formData.addons.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {formData.addons.map((a, i) => (
                            <Badge key={i} variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] font-black uppercase py-0 px-2 h-5">
                              {a}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      {liveSubtotal !== liveTotal && (
                        <div className="text-zinc-500 font-bold text-sm line-through drop-shadow-md">
                          ${liveSubtotal.toFixed(2)}
                        </div>
                      )}
                      <div className="text-emerald-400 font-bold text-xl drop-shadow-md">
                        ${liveTotal.toFixed(2)}
                      </div>
                      {formData.discountType === 'custom' && formData.customDiscount ? (
                        <div className="text-[10px] text-amber-400 font-bold uppercase mt-0.5">
                          -${Number(formData.customDiscount).toFixed(2)} Manual Disc.
                        </div>
                      ) : matchedCoupon ? (
                        <div className="text-[10px] text-amber-400 font-bold uppercase mt-0.5">
                          -{matchedCoupon.percent ? `${matchedCoupon.percent}%` : `$${matchedCoupon.amount}`} ({matchedCoupon.code})
                        </div>
                      ) : null}
                      <div className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">
                        Live Estimate
                      </div>
                      <div className="text-zinc-500 text-[10px] mt-1">
                        {selectedDate ? formatETDate(selectedDate) : "No Date"}
                        {formData.time && ` @ ${formatETTime(`${format(selectedDate || new Date(), 'yyyy-MM-dd')}T${formData.time}`)}`}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm font-medium text-gray-400">Time</label>
                  <div className="col-span-3 grid grid-cols-2 gap-2">
                    <div>
                      <div className="relative">
                        <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 z-10" />
                        <Input
                          type="time"
                          value={formData.time}
                          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                          className="pl-9 bg-zinc-900 border-zinc-800 text-gray-300"
                        />
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1 text-center">Start</div>
                    </div>
                    <div>
                      <div className="relative">
                        <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 z-10" />
                        <Input
                          type="time"
                          value={formData.endTime}
                          onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                          className="pl-9 bg-zinc-900 border-zinc-800 text-gray-300"
                        />
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1 text-center">End</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm font-medium text-gray-400">Customer</label>
                  <div className="col-span-3 relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 z-10" />
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-gray-400 text-sm">Select Customer</label>
                      <button
                        type="button"
                        onClick={fetchCustomers}
                        className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                      >
                        {loadingCustomers ? 'Loading...' : `Refresh List (${customers.length})`}
                      </button>
                    </div>
                    <select
                      className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-9 py-2 text-sm text-gray-300 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={formData.customer}
                      disabled={loadingCustomers}
                      onChange={(e) => {
                        const custName = e.target.value;
                        setFormData({ ...formData, customer: custName });

                        // Find and set customer data
                        const cust = customers.find(c => c.name === custName);
                        // console.log('Selected customer:', cust); // Debug log
                        if (cust) {
                          setSelectedCustomer(cust);
                          const primaryVeh = cust.vehicles && cust.vehicles.length > 0 ? cust.vehicles[0] : null;
                          setFormData(prev => ({
                            ...prev,
                            customer: cust.name,
                            email: cust.email || prev.email || "",
                            phone: cust.phone || prev.phone || "",
                            address: cust.address || prev.address,
                            vehicleYear: primaryVeh?.year || cust.year || prev.vehicleYear,
                            vehicleMake: primaryVeh?.make || cust.vehicle || prev.vehicleMake,
                            vehicleModel: primaryVeh?.model || cust.model || prev.vehicleModel,
                            vehicleId: primaryVeh?.id,
                            vehicle: primaryVeh?.type || cust.vehicleType || prev.vehicle,
                            notes: cust.notes || prev.notes,
                          }));
                          // console.log('Auto-filled data:', { address: cust.address, year: cust.year, make: cust.vehicle, model: cust.model }); // Debug
                        }
                      }}
                    >
                      <option value="" className="text-gray-400">
                        {loadingCustomers ? "Loading..." : "Select a Customer OR a Prospect"}
                      </option>
                      {customers.map((cust) => (
                        <option key={cust.id || cust.email || cust.name} value={cust.name} className="text-gray-300">
                          {cust.name} {cust.type === 'prospect' ? '(Prospect)' : ''}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2">
                      <Input
                        placeholder="Or type new customer name..."
                        className="pl-9 bg-zinc-900 border-zinc-800 text-gray-300 placeholder:text-gray-500"
                        value={formData.customer}
                        onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {selectedCustomer && (selectedCustomer.vehicles?.length || 0) > 0 && (
                  <div className="grid grid-cols-4 items-center gap-4 animate-in fade-in slide-in-from-top-1">
                    <label className="text-right text-sm font-medium text-purple-400">Select Vehicle</label>
                    <div className="col-span-3">
                      <select
                        className="flex h-10 w-full rounded-md border border-purple-900/40 bg-zinc-900 px-3 py-2 text-sm text-white focus:ring-purple-500/20"
                        value={formData.vehicleId}
                        onChange={(e) => {
                          const vehId = e.target.value;
                          const veh = selectedCustomer.vehicles.find((v: any) => v.id === vehId);
                          if (veh) {
                            setFormData(prev => ({
                              ...prev,
                              vehicleId: vehId,
                              vehicleYear: veh.year || prev.vehicleYear,
                              vehicleMake: veh.make || prev.vehicleMake,
                              vehicleModel: veh.model || prev.vehicleModel,
                              vehicleColor: veh.color || "",
                              vehicle: veh.type || prev.vehicle
                            }));
                          }
                        }}
                      >
                        <option value="">-- Choose from Linked Vehicles --</option>
                        {selectedCustomer.vehicles.map((v: any) => (
                          <option key={v.id} value={v.id}>
                            {v.year} {v.make} {v.model} {v.color ? `[Color: ${v.color}]` : ""} ({v.type || 'No Type'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-4 items-start gap-4">
                  <label className="text-right text-sm font-medium text-gray-400 mt-2">Contact</label>
                  <div className="col-span-3 space-y-3">
                    <div className="relative">
                      <ContactInput
                        type="email"
                        value={formData.email}
                        onChange={(val) => setFormData({ ...formData, email: val })}
                      />
                    </div>
                    <div className="relative">
                      <ContactInput
                        type="phone"
                        value={formData.phone}
                        onChange={(val) => setFormData({ ...formData, phone: val })}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-start gap-4">
                  <label className="text-right text-sm font-medium text-gray-400 mt-2">Address</label>
                  <div className="col-span-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                          placeholder="123 Main St, City, State"
                          className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-gray-500"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                      </div>
                      {formData.address && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setShowMap(true)}
                          className="shrink-0 border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                          title="View on Map"
                        >
                          <MapPin className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm font-medium text-gray-400">Place of Service</label>
                  <div className="col-span-3">
                    <select
                      className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:ring-purple-500/20"
                      value={formData.placeOfService}
                      onChange={(e) => setFormData({ ...formData, placeOfService: e.target.value })}
                    >
                      <option value="Customer's address">Mobile Detailing (Customer's address)</option>
                      <option value="Shop in Methuen">Shop in Methuen</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm font-medium text-gray-400">Service</label>
                  <div className="col-span-3 flex gap-2">
                    <div className="relative flex-1">
                      <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 z-10" />
                      <select
                        className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-9 py-2 text-sm text-white ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={formData.service}
                        onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                      >
                        <option value="" className="text-gray-500">Select Service...</option>
                        {allServices.map((pkg) => (
                          <option key={pkg.id} value={pkg.name}>
                            {pkg.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="w-full justify-between bg-zinc-900 border-zinc-800 text-white h-10 px-3 font-normal">
                            <span className="truncate">
                              {formData.addons.length > 0
                                ? formData.addons.join(", ")
                                : "Addons..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrinking-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-0 bg-zinc-900 border-zinc-800 shadow-2xl">
                          <Command className="bg-zinc-900">
                            <CommandInput placeholder="Search addons..." className="h-10 text-white border-zinc-800" />
                            <CommandEmpty className="text-zinc-500 py-6 text-center text-xs uppercase font-black tracking-widest">No addon found.</CommandEmpty>
                            <CommandGroup className="max-h-80 overflow-auto p-1 custom-scrollbar">
                              {allAddons
                                .filter((addon: any) => {
                                  if (addon.active === false) return false;
                                  if (!addon.applicableVehicleTypes) return true;
                                  const mappedVType = mapToServiceVehicleType(formData.vehicle || "");
                                  return addon.applicableVehicleTypes.includes(mappedVType);
                                })
                                .map((addon) => (
                                <CommandItem
                                  key={addon.id}
                                  value={addon.name}
                                  onSelect={() => {
                                    const name = addon.name;
                                    console.log(`[AddonSelector] Toggling addon: ${name}`);
                                    setFormData(prev => {
                                      const current = Array.isArray(prev.addons) ? prev.addons : [];
                                      const exists = current.includes(name);
                                      const next = exists 
                                        ? current.filter(a => a !== name)
                                        : [...current, name];
                                      console.log(`[AddonSelector] New state:`, next);
                                      return { ...prev, addons: next };
                                    });
                                  }}
                                  className="text-zinc-300 cursor-pointer hover:bg-white/10 aria-selected:bg-white/10 hover:text-white transition-colors rounded-lg mb-1 pointer-events-auto"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4 text-blue-500",
                                      formData.addons.includes(addon.name) ? "opacity-100 scale-100" : "opacity-0 scale-50"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold">{addon.name}</span>
                                    {(() => {
                                      const vType = mapToServiceVehicleType(formData.vehicle);
                                      const price = getAddOnPrice(addon.id, vType);
                                      return price > 0 ? <span className="text-[9px] text-zinc-400 font-black">+{vType === 'compact' ? '' : `(${vType}) `}${price}</span> : null;
                                    })()}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                {/* Booking Status */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm font-medium text-gray-400">Status</label>
                  <div className="col-span-3">
                    <select
                      className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={formData.status || 'confirmed'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    >
                      <option value="confirmed">✓ Confirmed Booking</option>
                      <option value="tentative">⏱ Tentative (Hold)</option>
                      <option value="blocked">🚫 Blocked</option>
                      <option value="pending">⏳ Pending</option>
                      <option value="in_progress">🔄 In Progress</option>
                      <option value="done">✅ Done</option>
                      <option value="rescheduled">🔄 Rescheduled</option>
                    </select>
                  </div>
                </div>

                {/* Discount Option */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm font-medium text-amber-400">Discount</label>
                  <div className="col-span-3 grid grid-cols-3 gap-2">
                    <select
                      className="flex h-10 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      value={formData.discountType || 'coupon'}
                      onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
                    >
                      <option value="coupon">Coupon Code</option>
                      <option value="custom">Manual Amount ($)</option>
                    </select>
                    
                    {formData.discountType === 'custom' ? (
                      <div className="col-span-2 relative">
                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-amber-500 z-10" />
                        <Input
                          type="number"
                          placeholder="Amount e.g. 25"
                          className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-amber-500/30"
                          value={formData.customDiscount || ''}
                          onChange={(e) => setFormData({ ...formData, customDiscount: e.target.value })}
                        />
                      </div>
                    ) : (
                      <div className="col-span-2 flex flex-col gap-2">
                        <div className="relative">
                          <Tag className="absolute left-3 top-2.5 h-4 w-4 text-amber-500 z-10" />
                          <select
                            className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 pl-9 pr-8 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500 appearance-none cursor-pointer"
                            value={(formData.discountCode && coupons.some(c => c.code === formData.discountCode)) ? formData.discountCode : (formData.discountCode ? 'CUSTOM_CODE' : '')}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'CUSTOM_CODE') {
                                setFormData({ ...formData, discountCode: 'CUSTOM' });
                              } else {
                                setFormData({ ...formData, discountCode: val });
                              }
                            }}
                          >
                            <option value="">Select Coupon...</option>
                            {coupons.filter(c => c.active).map(c => (
                              <option key={c.code} value={c.code} className="bg-zinc-900 text-white">
                                {c.code} ({c.percent ? `${c.percent}% Off` : `$${c.amount} Off`})
                              </option>
                            ))}
                            <option value="CUSTOM_CODE" className="bg-zinc-900 text-yellow-500 font-bold">-- Enter Custom Code --</option>
                          </select>
                          <div className="absolute right-3 top-3 pointer-events-none text-zinc-500 text-xs font-mono">▼</div>
                        </div>
                        {((formData.discountCode && !coupons.some(c => c.code === formData.discountCode)) || formData.discountCode === 'CUSTOM') && (
                          <div className="relative animate-in slide-in-from-top-1 duration-150">
                            <Input
                              placeholder="ENTER CODE"
                              className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 font-mono uppercase focus:border-amber-500/30"
                              value={formData.discountCode === 'CUSTOM' ? '' : formData.discountCode}
                              onChange={(e) => setFormData({ ...formData, discountCode: e.target.value.toUpperCase() })}
                            />
                            {formData.discountCode && !matchedCoupon && (
                              <span className="absolute right-3 top-3 text-[10px] text-red-500 font-bold uppercase">Not Found</span>
                            )}
                            {formData.discountCode && matchedCoupon && (
                              <span className="absolute right-3 top-3 text-[10px] text-green-500 font-bold uppercase">Applied!</span>
                            )}
                          </div>
                        )}
                        {formData.discountCode && coupons.some(c => c.code === formData.discountCode) && matchedCoupon && (
                          <div className="text-[10px] text-green-500 font-bold uppercase tracking-wider pl-1">
                            ✓ {matchedCoupon.percent ? `${matchedCoupon.percent}%` : `$${matchedCoupon.amount}`} discount applied from coupon: {matchedCoupon.code}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Probono Reason (Conditional) */}
                {typeof liveTotal !== 'undefined' && liveTotal === 0 && (formData.discountCode === 'PROBONO' || matchedCoupon || Number(formData.customDiscount) > 0) && (
                  <div className="grid grid-cols-4 items-center gap-4 animate-in fade-in slide-in-from-top-1">
                    <label className="text-right text-sm font-medium text-pink-400">Probono Reason</label>
                    <div className="col-span-3 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {["Referral Builder", "Family/Friend", "Review-for-Service Trade", "Redo/Comp for Issue", "Charity", "Other"].map(reason => {
                          const isChecked = (formData.probonoReasons && formData.probonoReasons.includes(reason)) || formData.probonoReason === reason;
                          return (
                            <label key={reason} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs cursor-pointer transition-colors ${isChecked ? 'bg-pink-500/20 border-pink-500/50 text-pink-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}>
                              <input 
                                type="checkbox" 
                                className="hidden"
                                checked={isChecked}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  let newReasons = [...(formData.probonoReasons || [])];
                                  if (formData.probonoReason && !newReasons.includes(formData.probonoReason)) {
                                    newReasons.push(formData.probonoReason);
                                  }
                                  
                                  if (checked) {
                                    if (!newReasons.includes(reason)) newReasons.push(reason);
                                  } else {
                                    newReasons = newReasons.filter(r => r !== reason);
                                  }
                                  
                                  let primary = formData.probonoPrimaryReason || formData.probonoReason;
                                  if (newReasons.length === 1) {
                                    primary = newReasons[0];
                                  } else if (!newReasons.includes(primary || '')) {
                                    primary = newReasons.length > 0 ? newReasons[0] : "";
                                  }
                                  
                                  setFormData({ ...formData, probonoReasons: newReasons, probonoPrimaryReason: primary, probonoReason: primary });
                                }}
                              />
                              <div className={`w-3 h-3 rounded-sm flex items-center justify-center border ${isChecked ? 'bg-pink-500 border-pink-500 text-white font-bold text-[10px]' : 'border-zinc-600 bg-zinc-950'}`}>
                                {isChecked && "✓"}
                              </div>
                              {reason}
                            </label>
                          );
                        })}
                      </div>
                      
                      {((formData.probonoReasons && formData.probonoReasons.length > 1) || (!formData.probonoReasons?.length && formData.probonoReason)) && (
                        <div className="flex items-center gap-3 bg-zinc-950/50 p-2.5 rounded-md border border-zinc-800/50">
                          <span className="text-xs text-zinc-400 font-medium whitespace-nowrap">Primary Reason:</span>
                          <select
                            className="flex h-8 w-full rounded-md border border-pink-500/30 bg-zinc-900 px-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-pink-500/50"
                            value={formData.probonoPrimaryReason || formData.probonoReason || ""}
                            onChange={(e) => setFormData({ ...formData, probonoPrimaryReason: e.target.value, probonoReason: e.target.value })}
                          >
                            <option value="">Select Primary...</option>
                            {(formData.probonoReasons?.length ? formData.probonoReasons : [formData.probonoReason]).filter(Boolean).map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm font-medium text-gray-400">Vehicle Type</label>
                  <div className="col-span-3 space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Car className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                          placeholder="e.g. SUV, Sedan, Truck"
                          className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-gray-500"
                          value={formData.vehicle}
                          onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-blue-600 text-blue-600 hover:bg-blue-600/10"
                        onClick={() => setShowClassificationModal(true)}
                      >
                        Quick Select
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm font-medium text-gray-400">Vehicle Details</label>
                  <div className="col-span-3 grid grid-cols-4 gap-2">
                    <Input
                      placeholder="Year"
                      className="bg-zinc-900 border-zinc-800 text-white placeholder:text-gray-500"
                      value={formData.vehicleYear}
                      onChange={(e) => setFormData({ ...formData, vehicleYear: e.target.value })}
                    />
                    <Input
                      placeholder="Make"
                      className="bg-zinc-900 border-zinc-800 text-white placeholder:text-gray-500"
                      value={formData.vehicleMake}
                      onChange={(e) => setFormData({ ...formData, vehicleMake: e.target.value })}
                    />
                    <Input
                      placeholder="Model"
                      className="bg-zinc-900 border-zinc-800 text-white placeholder:text-gray-500"
                      value={formData.vehicleModel}
                      onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                    />
                    <Input
                      placeholder="Color"
                      className="bg-zinc-900 border-zinc-800 text-white placeholder:text-gray-500"
                      value={formData.vehicleColor || ''}
                      onChange={(e) => setFormData({ ...formData, vehicleColor: e.target.value })}
                    />
                    {selectedCustomer?.vehicle && (
                      <p className="col-span-4 text-xs text-gray-400">
                        Customer's vehicle: {selectedCustomer.year} {selectedCustomer.vehicle} {selectedCustomer.model} {selectedCustomer.color ? `[Color: ${selectedCustomer.color}]` : ''}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm font-medium text-gray-400">Condition</label>
                  <div className="col-span-3">
                    <select
                      className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={formData.vehicleCondition || ''}
                      onChange={(e) => setFormData({ ...formData, vehicleCondition: e.target.value })}
                    >
                      <option value="" className="text-gray-500">Not Specified</option>
                      <option value="Excellent">Excellent (Fairly Clean, Daily Driver)</option>
                      <option value="Good">Good (Light Dust/Debris, No Heavy Stains)</option>
                      <option value="Fair">Fair (Pet Hair, Light Stains, Spills)</option>
                      <option value="Poor">Poor (Heavy Stains, Odors, Mold/Mildew)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm font-medium text-gray-400">Assign To</label>
                  <div className="col-span-3 relative">
                    <Users className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                    <select
                      className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-9 py-2 text-sm text-white ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={formData.assignedEmployee}
                      onChange={(e) => setFormData({ ...formData, assignedEmployee: e.target.value })}
                    >
                      <option value="" className="text-gray-400">Unassigned</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.name} className="text-white bg-zinc-900">
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Booked By Field */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm font-medium text-gray-400">Booked By</label>
                  <div className="col-span-3 relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                    <select
                      className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-9 py-2 text-sm text-white ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={formData.bookedBy}
                      onChange={(e) => setFormData({ ...formData, bookedBy: e.target.value })}
                    >
                      <option value="" className="text-gray-400">Unknown</option>
                      <option value="Public Website" className="text-emerald-400 bg-zinc-900 font-bold">Online Booking (Public)</option>
                      {/* Ensure current user defaults if not in list */}
                      {getCurrentUser()?.name && !employees.find(e => e.name === getCurrentUser()?.name) && (
                        <option key="current-user" value={getCurrentUser()?.name} className="text-white bg-zinc-900">
                          {getCurrentUser()?.name} (You)
                        </option>
                      )}
                      {employees.map((emp) => (
                        <option key={emp.id || emp.email} value={emp.name} className="text-white bg-zinc-900">
                          {emp.name} ({emp.role})
                        </option>
                      ))}
                      {/* Catch-all: If the saved value isn't any of the above, show it so it doesn't look Unknown */}
                      {formData.bookedBy &&
                        formData.bookedBy !== getCurrentUser()?.name &&
                        !employees.find(e => e.name === formData.bookedBy) && (
                          <option key="saved-value" value={formData.bookedBy} className="text-gray-300">
                            {formData.bookedBy}
                          </option>
                        )}
                    </select>
                  </div>
                </div>

                {/* Creation Timestamp in History */}
                {selectedBooking && selectedBooking.createdAt && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label className="text-right text-sm font-medium text-gray-400">Created On</label>
                    <div className="col-span-3 text-sm text-gray-400 font-semibold bg-zinc-900/50 p-2 rounded-md border border-zinc-800">
                      {format(parseISO(selectedBooking.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-4 items-start gap-4">
                  <label className="text-right text-sm font-medium text-gray-400 mt-2">Notes</label>
                  <div className="col-span-3">
                    <textarea
                      className="flex w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-gray-300 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
                      placeholder="Additional notes..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>

                {/* Reschedule History list */}
                {selectedBooking && (() => {
                  const rawHistory = (selectedBooking as any).rescheduleHistory || (selectedBooking as any).booking_vehicle?.reschedule_history || [];
                  const existingHistory = Array.isArray(rawHistory) ? rawHistory : [];
                  if (existingHistory.length === 0) return null;
                  return (
                    <div className="grid grid-cols-4 items-start gap-4">
                      <label className="text-right text-xs font-black uppercase text-cyan-400 mt-1">Reschedules</label>
                      <div className="col-span-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5 space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                          <RefreshCw className="h-3 w-3 text-cyan-400" />
                          Previous Date History ({existingHistory.length})
                        </div>
                        <div className="space-y-1.5">
                          {existingHistory.map((item: any, idx: number) => {
                            let oldStr = 'N/A';
                            let newStr = 'N/A';
                            try { oldStr = format(new Date(item.originalDate), 'MMM d, yyyy @ h:mm a'); } catch(e){}
                            try { newStr = format(new Date(item.newDate), 'MMM d, yyyy @ h:mm a'); } catch(e){}
                            return (
                              <div key={idx} className="text-[10px] text-zinc-400 font-medium flex items-center gap-2 bg-zinc-900/40 p-2 rounded-lg border border-white/5">
                                <span className="font-bold text-zinc-500">#{idx + 1}</span>
                                <span>{oldStr}</span>
                                <span className="text-cyan-500">➜</span>
                                <span className="text-zinc-200 font-bold">{newStr}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Reminder Settings */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm font-medium text-gray-400">Reminder</label>
                  <div className="col-span-3 flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="hasReminder"
                        className="rounded border-zinc-800 bg-zinc-900 data-[state=checked]:bg-primary"
                        checked={formData.hasReminder}
                        onChange={(e) => setFormData({ ...formData, hasReminder: e.target.checked })}
                      />
                      <label htmlFor="hasReminder" className="text-sm font-medium text-gray-300 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Enable Follow-up
                      </label>
                    </div>

                    {formData.hasReminder && (
                      <div className="flex-1">
                        <select
                          className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          value={formData.reminderFrequency}
                          onChange={(e) => setFormData({ ...formData, reminderFrequency: e.target.value })}
                        >
                          <option value="0">Anytime / Manual</option>
                          <option value="1">Monthly</option>
                          <option value="2">Bi-Monthly</option>
                          <option value="3">Quarterly</option>
                          <option value="4">4 Months</option>
                          <option value="6">6 Months</option>
                          <option value="12">Yearly</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="px-4 sm:px-6 py-4 shrink-0 border-t border-zinc-800 bg-zinc-900/50 mt-auto">
              <div className="flex flex-wrap items-center gap-2 w-full">
                {selectedBooking && selectedBooking.status !== 'cancelled' && isAdmin && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsCancelConfirmOpen(true)}
                    className="text-orange-400 border-orange-950/50 hover:bg-orange-950/20 hover:text-orange-300 h-9 font-bold px-3"
                  >
                    <X className="mr-1.5 h-4 w-4" /> Cancel Job
                  </Button>
                )}
                
                {selectedBooking && isAdmin && (
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    onClick={handleDelete} 
                    className="bg-red-950/40 hover:bg-red-900 text-red-200 border border-red-900/50 h-9 w-9"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}

                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-zinc-800 hover:bg-zinc-800 text-zinc-300 h-9 px-3"
                    >
                      <Mail className="mr-1.5 h-4 w-4" /> Previews <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="start" className="bg-zinc-900 border-zinc-800 text-zinc-200 w-56 z-[9999]">
                    <DropdownMenuLabel className="text-[10px] uppercase font-bold text-zinc-500">Customer Communication</DropdownMenuLabel>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => handlePreviewEmailForBooking(selectedBooking || formData, 'confirmation')}>
                      <Check className="mr-2 h-4 w-4 text-emerald-500" /> Booking Approved
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => handlePreviewEmailForBooking(selectedBooking || formData, 'request')}>
                      <Clock className="mr-2 h-4 w-4 text-amber-500" /> Request Received
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => handlePreviewEmailForBooking(selectedBooking || formData, 'cancelled')}>
                      <X className="mr-2 h-4 w-4 text-red-500" /> Job Cancelled
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => handlePreviewEmailForBooking(selectedBooking || formData, 'reminder')}>
                      <Bell className="mr-2 h-4 w-4 text-blue-500" /> 6-Month Reminder
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuLabel className="text-[10px] uppercase font-bold text-zinc-500">Sales & Billing</DropdownMenuLabel>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => handlePreviewEmailForBooking(selectedBooking || formData, 'payment-success')}>
                      <Package className="mr-2 h-4 w-4 text-green-500" /> Payment Success
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {formData.status !== 'cancelled' && isAdmin && (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={async (e) => { e.preventDefault(); e.stopPropagation(); handleSave(true); }} 
                    className="bg-blue-600 hover:bg-blue-700 text-white border-none h-9 px-4 font-bold relative z-[200] pointer-events-auto"
                  >
                    <Check className="mr-1.5 h-4 w-4" /> {formData.status === 'confirmed' ? 'Resend Approval' : 'Approve & Email'}
                  </Button>
                )}

                {isAdmin && (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={async (e) => { e.preventDefault(); e.stopPropagation(); handleSave(); }} 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white border-none h-9 px-4 font-bold relative z-[200] pointer-events-auto"
                  >
                    <Save className="mr-1.5 h-4 w-4" /> Save Booking
                  </Button>
                )}

                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleStartJob} 
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 h-9 px-3"
                >
                  <Wrench className="mr-1.5 h-4 w-4 text-purple-400" /> Start Job
                </Button>

                {isAdmin && (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => handleDuplicate(selectedBooking)} 
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 h-9 px-3"
                  >
                    <Copy className="mr-1.5 h-4 w-4 opacity-50" /> Duplicate
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <VehicleSelectorModal
          open={vehicleSelectorOpen}
          onOpenChange={setVehicleSelectorOpen}
          onSelect={handleVehicleSelect}
        />

        {/* Google Maps Dialog */}
        <Dialog open={showMap} onOpenChange={setShowMap}>
          <DialogContent className="sm:max-w-[600px] h-[500px] bg-zinc-950 border-zinc-800 p-0 overflow-hidden">
            <DialogHeader className="p-4 bg-zinc-900/50 border-b border-zinc-800 absolute top-0 w-full z-10 backdrop-blur-sm">
              <DialogTitle className="text-white flex items-center gap-2">
                <MapPin className="h-5 w-5 text-red-500" />
                {formData.address || "Location"}
              </DialogTitle>
            </DialogHeader>
            <div className="w-full h-full pt-[60px]">
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(formData.address || "")}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
              ></iframe>
            </div>
          </DialogContent>
        </Dialog>

        <Card className="mt-8 p-0 bg-zinc-950/50 border-zinc-800 overflow-hidden">
          <div className="p-3 sm:p-6 pb-2">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/20">
                  <Package className="h-6 w-6 text-red-500" />
                </div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight leading-none mb-1">Booking History</h2>
                </div>
                <p className="text-sm text-zinc-500 font-medium">
                  Complete customer records and booking logs
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 p-2 bg-zinc-900/80 rounded-2xl border border-zinc-800/80 shadow-2xl backdrop-blur-md">
                <div className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-500 mr-2 ml-3">Quick Filter:</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateFilter({ start: undefined, end: undefined })}
                  className={cn("h-8 text-[11px] px-4 font-bold rounded-lg transition-all", (!dateFilter.start && !dateFilter.end) ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/20" : "text-zinc-400")}
                >
                  ALL
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateFilter({ start: new Date(), end: undefined })}
                  className={cn("h-8 text-[11px] px-4 font-bold rounded-lg transition-all", (dateFilter.start && isToday(dateFilter.start) && !dateFilter.end) ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/20" : "text-zinc-400")}
                >
                  TODAY
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateFilter({ start: startOfWeek(new Date()), end: endOfWeek(new Date()) })}
                  className={cn("h-8 text-[11px] px-4 font-bold rounded-lg transition-all", (dateFilter.start && dateFilter.end && isSameDay(dateFilter.start, startOfWeek(new Date()))) ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/20" : "text-zinc-400")}
                >
                  WEEK
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateFilter({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) })}
                  className={cn("h-8 text-[11px] px-4 font-bold rounded-lg transition-all", (dateFilter.start && isSameMonth(dateFilter.start, new Date()) && !dateFilter.end && !isToday(dateFilter.start)) ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/20" : (dateFilter.start && dateFilter.end && isSameDay(dateFilter.start, startOfMonth(new Date()))) ? "bg-red-600 text-white" : "text-zinc-400")}
                >
                  MONTH
                </Button>

                <div className="w-px h-6 bg-zinc-800 mx-1" />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className={cn("h-8 text-[11px] px-3 font-bold rounded-lg transition-all", sourceFilter ? "bg-purple-600 text-white" : "text-zinc-400")}>
                      {sourceFilter || 'SOURCE'} <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-white w-56">
                    <DropdownMenuItem onClick={() => setSourceFilter(null)} className="cursor-pointer">All Sources</DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuItem onClick={() => setSourceFilter('Business Launch Manager')} className="cursor-pointer">Business Launch Manager</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSourceFilter('Hybrid Availability System')} className="cursor-pointer">Hybrid Availability System</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSourceFilter('INTERNAL: System Blocks')} className="cursor-pointer">Internal System Blocks</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSourceFilter('Public Website')} className="cursor-pointer">Public Website</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSourceFilter('Manual Entry')} className="cursor-pointer">Manual Entry</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="w-px h-6 bg-zinc-800 mx-1" />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className={cn("h-8 text-[11px] px-3 font-bold rounded-lg transition-all", statusFilter ? "bg-emerald-600 text-white" : "text-zinc-400")}>
                      {statusFilter ? statusFilter.replace('_', ' ').toUpperCase() : 'STATUS'} <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-white w-56">
                    <DropdownMenuItem onClick={() => setStatusFilter(null)} className="cursor-pointer">All Statuses</DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuItem onClick={() => setStatusFilter('confirmed')} className="cursor-pointer flex items-center gap-2">
                      <Check className="h-3 w-3 text-emerald-500" /> Confirmed Booking
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('tentative')} className="cursor-pointer flex items-center gap-2">
                      <Clock className="h-3 w-3 text-amber-500" /> Tentative (Hold)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('blocked')} className="cursor-pointer flex items-center gap-2">
                      <Shield className="h-3 w-3 text-red-500" /> Blocked
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('pending')} className="cursor-pointer flex items-center gap-2">
                      <RotateCcw className="h-3 w-3 text-blue-500" /> Pending
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('in_progress')} className="cursor-pointer flex items-center gap-2">
                      <Wrench className="h-3 w-3 text-purple-500" /> In Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('done')} className="cursor-pointer flex items-center gap-2">
                      <Package className="h-3 w-3 text-green-500" /> Done
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('rescheduled')} className="cursor-pointer flex items-center gap-2">
                      <RefreshCw className="h-3 w-3 text-cyan-500" /> Rescheduled
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="w-px h-6 bg-zinc-800 mx-1" />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={cn(
                        "h-8 text-[11px] px-3 font-bold rounded-lg transition-all border", 
                        archiveFilter === 'archived' ? "bg-amber-600/20 text-amber-500 border-amber-600/30" : 
                        archiveFilter === 'all' ? "bg-blue-600/20 text-blue-400 border-blue-600/30" : 
                        "text-zinc-400 border-transparent"
                      )}
                    >
                      <Archive className="h-3 w-3 mr-1.5" />
                      {archiveFilter === 'all' ? 'ALL BOOKINGS' : archiveFilter.toUpperCase()} <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-white w-48">
                    <DropdownMenuItem onClick={() => setArchiveFilter('active')} className="cursor-pointer flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-zinc-500" /> Active Only
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setArchiveFilter('archived')} className="cursor-pointer flex items-center gap-2 text-amber-400">
                      <Archive className="h-3 w-3" /> Archived Only
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setArchiveFilter('all')} className="cursor-pointer flex items-center gap-2 text-blue-400">
                      <LayoutGrid className="h-3 w-3" /> Show All (Both)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
 
                 <div className="w-px h-6 bg-zinc-800 mx-1" />
 
                 <TooltipProvider>
                   <Tooltip>
                     <TooltipTrigger asChild>
                       <Button 
                         variant="outline" 
                         size="icon" 
                         className="h-8 w-8 border-zinc-700 bg-zinc-900/50 hover:bg-red-600 hover:text-white transition-all shadow-xl rounded-lg"
                         onClick={() => {
                           setSortOrder('next-booking');
                           setDateFilter({ start: undefined, end: undefined });
                           setSourceFilter(null);
                           setStatusFilter(null);
                           setArchiveFilter('active');
                           toast.success("Sort & filters reset to default");
                         }}
                       >
                         <RotateCcw className="h-3.5 w-3.5" />
                       </Button>
                     </TooltipTrigger>
                     <TooltipContent className="bg-zinc-900 border-zinc-800 text-white text-[10px] font-black uppercase tracking-widest">
                       Reset Default Sort & Filters
                     </TooltipContent>
                   </Tooltip>
                 </TooltipProvider>

                <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("gap-2 border-zinc-700 font-bold h-8 text-[11px] hover:bg-zinc-800 transition-all shadow-xl", (dateFilter.start || dateFilter.end) && "bg-red-600 text-white border-red-600 hover:bg-red-700")}>
                      <Filter className="h-3.5 w-3.5" />
                      Filter History
                      {(archiveFilter !== 'active') && (
                        <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 ml-1 h-4 px-1 border-none text-[8px]">
                          +{archiveFilter === 'all' ? 'All' : 'Archived'}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 bg-zinc-950 border-zinc-800 p-0 overflow-hidden shadow-2xl" align="end">
                    <div className="p-4 bg-red-600 flex items-center justify-between shadow-lg">
                      <span className="text-xs font-black uppercase tracking-widest text-white antialiased">Filter History</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20 rounded-full" onClick={() => setIsFilterOpen(false)}>
                        <X className="h-3 w-3 text-white" />
                      </Button>
                    </div>

                    <div className="p-4 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white">Archive Mode</span>
                          <span className="text-[10px] text-zinc-500 uppercase font-black">{archiveFilter === 'all' ? 'Showing All' : archiveFilter === 'archived' ? 'Archived Only' : 'Active Only'}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-[10px] font-black border border-zinc-800"
                          onClick={() => {
                            const next: Record<string, 'active' | 'archived' | 'all'> = { active: 'archived', archived: 'all', all: 'active' };
                            setArchiveFilter(next[archiveFilter]);
                          }}
                        >
                          TOGGLE
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Quick Presets</span>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn("h-8 text-[11px] font-bold border border-zinc-800 hover:bg-zinc-800", (!dateFilter.start && !dateFilter.end) && "bg-red-600 text-white border-red-600 hover:bg-red-700")}
                            onClick={() => setDateFilter({ start: undefined, end: undefined })}
                          >
                            VIEW ALL
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn("h-8 text-[11px] font-bold border border-zinc-800 hover:bg-zinc-800", (dateFilter.start && isToday(dateFilter.start) && !dateFilter.end) && "bg-red-600 text-white border-red-600 hover:bg-red-700")}
                            onClick={() => setDateFilter({ start: new Date(), end: undefined })}
                          >
                            TODAY
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn("h-8 text-[11px] font-bold border border-zinc-800 hover:bg-zinc-800", (dateFilter.start && dateFilter.end && isSameDay(dateFilter.start, startOfWeek(new Date()))) && "bg-red-600 text-white border-red-600 hover:bg-red-700")}
                            onClick={() => setDateFilter({ start: startOfWeek(new Date()), end: endOfWeek(new Date()) })}
                          >
                            THIS WEEK
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn("h-8 text-[11px] font-bold border border-zinc-800 hover:bg-zinc-800", (dateFilter.start && isSameMonth(dateFilter.start, new Date()) && !dateFilter.end) && "bg-red-600 text-white border-red-600 hover:bg-red-700")}
                            onClick={() => setDateFilter({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) })}
                          >
                            THIS MONTH
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2 border-t border-zinc-800/50">
                        <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Custom Range</span>
                        <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/40">
                          <Calendar
                            mode="range"
                            selected={{ from: dateFilter.start, to: dateFilter.end }}
                            onSelect={(range) => setDateFilter({ start: range?.from, end: range?.to })}
                            initialFocus
                            className="bg-transparent text-white"
                          />
                        </div>
                        {(dateFilter.start || dateFilter.end) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-[10px] font-black uppercase text-zinc-500 hover:text-red-500 transition-colors"
                            onClick={() => setDateFilter({ start: undefined, end: undefined })}
                          >
                            <RotateCcw className="h-3 w-3 mr-2" />
                            Clear Date Filter
                          </Button>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="p-2 sm:p-6">
              <div className="space-y-4">

                  <div className="space-y-2">
                    {uniqueCustomers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No booking history yet. Create your first booking above!
                      </div>
                    ) : (
                      uniqueCustomers
                        .filter(customer => !selectedHistoryCustomer || selectedHistoryCustomer === customer.name)
                        .map((customer) => (
                      <Collapsible
                        key={customer.name}
                        id={`history-customer-${customer.name.replace(/\s+/g, '-')}`}
                        open={selectedHistoryCustomer === customer.name}
                        onOpenChange={(open) => handleSelectHistoryCustomer(open ? customer.name : null)}
                        className="border border-zinc-800 rounded-lg overflow-hidden transition-all"
                      >
                          <CollapsibleTrigger className="w-full">
                            <div className="flex items-center justify-between p-2.5 sm:p-4 hover:bg-zinc-900/50 transition-colors cursor-pointer min-w-0">
                              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", customer.isSystem ? "bg-blue-500/20" : "bg-primary/20")}>
                                  {customer.isSystem ? (
                                    <Shield className="h-5 w-5 text-blue-400" />
                                  ) : (
                                    <User className="h-5 w-5 text-primary" />
                                  )}
                                </div>
                                  <div className="text-left min-w-0">
                                    <div className="font-semibold truncate">{customer.name}</div>
                                    <div className="flex items-center flex-wrap gap-2 mt-0.5">
                                      <div className="text-xs sm:text-sm text-muted-foreground truncate">
                                        {customer.bookingCount} record{customer.bookingCount > 1 ? 's' : ''} • Last: {format(parseISO(customer.lastBooking), "MMM d, yyyy")}
                                      </div>
                                      <Badge 
                                        variant="outline" 
                                        className={cn(
                                          "text-[9px] h-4 px-1.5 uppercase font-black tracking-tight shrink-0", 
                                          customer.mostRecentStatus === 'booking' 
                                            ? getStatusColor(customer.mostRecentStatusValue.toLowerCase() as any) 
                                            : "text-blue-400 border-blue-900/50 bg-blue-950/20"
                                        )}
                                      >
                                        {customer.mostRecentStatusValue}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 text-primary hover:text-primary/80"
                                  onClick={async (e) => { 
                                    e.stopPropagation(); 
                                    const reportToast = toast.loading(`Building history report for ${customer.name}...`);
                                    try {
                                      const { getCustomerDetailedHistory } = await import('@/lib/supa-data'); 
                                      const detailedHistory = await getCustomerDetailedHistory(customer.id!); 
                                      if (detailedHistory) {
                                        await exportCustomerHistoryPDF(detailedHistory, true); 
                                        toast.success("Report generated successfully", { id: reportToast });
                                      } else {
                                        toast.error("Could not find detailed history for this customer", { id: reportToast });
                                      }
                                    } catch (err) {
                                      console.error("Report generation failed:", err);
                                      toast.error("Failed to build PDF report", { id: reportToast });
                                    }
                                  }}
                                  title="Preview History Report"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <ChevronDown
                                  className={cn(
                                    "h-5 w-5 text-muted-foreground transition-transform",
                                    selectedHistoryCustomer === customer.name && "transform rotate-180"
                                  )}
                                />
                              </div>
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="border-t border-zinc-800 p-2 sm:p-4 bg-zinc-900/30">
                              <div className="grid md:grid-cols-2 gap-4">
                                {!customer.isSystem ? (
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                      <h3 className="font-semibold text-sm text-zinc-500 uppercase tracking-widest">Profile Identity</h3>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            const firstBooking = customer.events?.find((e: any) => e.type === 'booking');
                                            const vehicleStr = firstBooking 
                                              ? `${firstBooking.vehicleYear && firstBooking.vehicleYear !== '-' ? firstBooking.vehicleYear : ''} ${firstBooking.vehicleMake || ''} ${firstBooking.vehicleModel || ''}`.trim()
                                              : '';
                                            const bodyStr = vehicleStr ? `\n\nVehicle Information:\n${vehicleStr}` : '';
                                            const url = `/letter-maker?customerId=${customer.id || ''}&body=${encodeURIComponent(bodyStr)}`;
                                            window.open(url, '_blank');
                                          }}
                                          className="h-8 text-[11px] font-black border-purple-500/30 text-purple-400 hover:bg-purple-900/20 hover:text-purple-300"
                                        >
                                          <Mail className="w-3.5 h-3.5 mr-2" />
                                          Write Letter
                                        </Button>
                                        <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          if (!customer.id) {
                                            toast.error("This customer is not yet in the database. Add them as a prospect first.");
                                            return;
                                          }
                                          const targetPath = customer.type === 'prospect' ? '/prospects' : '/search-customer';
                                          navigate(`${targetPath}?search=${encodeURIComponent(customer.name)}`);
                                        }}
                                        disabled={!customer.id}
                                        className={cn(
                                          "h-8 text-[11px] font-black border-zinc-800",
                                          customer.id ? "text-zinc-400 hover:bg-zinc-800 hover:text-white" : "text-zinc-600 opacity-50 cursor-not-allowed"
                                        )}
                                        >
                                          <User className="w-3.5 h-3.5 mr-2" />
                                          View in Database
                                        </Button>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div className="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50">
                                        <div className="text-[10px] text-zinc-500 uppercase font-black mb-1">Email Connection</div>
                                        <div className="text-sm truncate text-zinc-300 font-bold">{customer.email || '—'}</div>
                                      </div>
                                      <div className="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50">
                                        <div className="text-[10px] text-zinc-500 uppercase font-black mb-1">Mobile Contact</div>
                                        <div className="text-sm text-zinc-300 font-bold">{customer.phone || '—'}</div>
                                      </div>
                                    </div>

                                    <div className="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50 group/address">
                                       <div className="text-[10px] text-zinc-500 uppercase font-black mb-1 flex items-center gap-2">
                                         <MapPinIcon className="w-3 h-3 group-hover/address:text-red-500 transition-colors" /> Registered Address
                                       </div>
                                       <div className="text-sm text-zinc-300 font-bold">{customer.address || '—'}</div>
                                    </div>

                                    {!customer.id && (
                                      <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/20 space-y-3">
                                        <div className="flex items-center gap-2">
                                          <Shield className="w-3 h-3 text-red-500" />
                                          <span className="text-[10px] text-red-500 uppercase font-black tracking-widest">Database Record Missing</span>
                                        </div>
                                        <p className="text-[10px] text-zinc-500 leading-relaxed">This person is not yet in your CRM. You can manually add them and link this booking history below.</p>
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            className="h-7 text-[9px] font-black uppercase bg-zinc-100 text-black hover:bg-white flex-1"
                                            onClick={() => {
                                              const firstBooking = customer.events?.find((e: any) => e.type === 'booking');
                                              const original = firstBooking ? items.find(i => i.id === firstBooking.id) : null;
                                              if (original) handleConvertToProspect(original, 'prospect');
                                            }}
                                          >
                                            Add as Prospect
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-[9px] font-black uppercase border-zinc-800 text-zinc-400 hover:text-white flex-1"
                                            onClick={() => {
                                              const firstBooking = customer.events?.find((e: any) => e.type === 'booking');
                                              const original = firstBooking ? items.find(i => i.id === firstBooking.id) : null;
                                              if (original) handleConvertToProspect(original, 'customer');
                                            }}
                                          >
                                            Add as Customer
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                    
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <h3 className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Customer Garage ({customer.vehicles?.length || 0})</h3>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 text-[9px] font-black text-blue-400 hover:text-blue-300 gap-1"
                                          onClick={() => {
                                            const cData = customers.find(c => c.id === customer.id || (c.name && c.name.trim().toLowerCase() === customer.name.trim().toLowerCase()));
                                            if (cData) {
                                              setCustomerToEdit(cData);
                                              setIsCustomerModalOpen(true);
                                            } else {
                                              // If not found, it's likely a virtual customer from a booking.
                                              // Suggest adding as prospect first
                                              const firstBooking = customer.events?.find((e: any) => e.type === 'booking');
                                              const original = firstBooking ? items.find(i => i.id === firstBooking.id) : null;
                                              
                                              if (original && confirm(`"${customer.name}" does not have a profile yet. Would you like to create a Prospect profile to manage vehicles?`)) {
                                                handleConvertToProspect(original);
                                              } else {
                                                toast.error("Please add this customer to Prospects or Search first to manage their vehicles.");
                                              }
                                            }
                                          }}
                                        >
                                          <Plus className="w-2.5 h-2.5" /> MANAGE VEHICLES
                                        </Button>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        {(customer.vehicles && customer.vehicles.length > 0) ? (
                                          customer.vehicles.map((v: any, idx: number) => (
                                            <div key={idx} className="bg-blue-900/10 p-3 rounded-xl border border-blue-500/20 flex items-center justify-between">
                                              <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                                  <Car className="w-4 h-4 text-blue-400" />
                                                </div>
                                                <div>
                                                  <div className="text-[10px] text-blue-400/70 uppercase font-black tracking-widest">
                                                    {idx === 0 ? 'Primary Vehicle' : `Vehicle #${idx + 1}`}
                                                  </div>
                                                  <div className="text-sm font-bold text-zinc-200">
                                                    {(v.year && v.year !== '-' && v.year !== '---') ? `${v.year} ` : ''}{v.make} {v.model}
                                                  </div>
                                                  <div className="text-[9px] text-zinc-500 font-bold uppercase">
                                                    {v.type || 'Standard'}
                                                    {v.color ? ` • Color: ${v.color}` : ''}
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                {idx === 0 && <Badge className="bg-blue-500/20 text-blue-400 border-none text-[9px] font-black">ACTIVE PROFILE</Badge>}
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-7 w-7 p-0 text-zinc-600 hover:text-red-500 transition-colors"
                                                  onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`Remove this ${v.make} ${v.model} from garage?`)) {
                                                      // Optimistic UI update
                                                      setCustomers(prev => prev.map(c => {
                                                        if (c.id === customer.id) {
                                                          return { 
                                                            ...c, 
                                                            vehicles: (c.vehicles || []).filter((veh: any) => veh.id !== v.id) 
                                                          };
                                                        }
                                                        return c;
                                                      }));

                                                      try {
                                                        await deleteSupabaseVehicle(v.id);
                                                        toast.success("Vehicle removed");
                                                        // No need to fetchCustomers() if optimistic worked
                                                      } catch (err: any) {
                                                        toast.error(err.message || "Failed to remove vehicle");
                                                        fetchCustomers(); // Rollback on error
                                                      }
                                                    }
                                                  }}
                                                >
                                                  <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                              </div>
                                            </div>
                                          ))
                                        ) : (
                                          <div className="bg-zinc-950/50 p-3 rounded-xl border border-dashed border-zinc-800 flex items-center gap-3 text-zinc-500 italic text-xs">
                                            <Car className="w-4 h-4 opacity-30" />
                                            No vehicles registered. Click 'Manage' to add one.
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <h3 className="font-semibold text-sm text-muted-foreground uppercase">Internal Information</h3>
                                    <p className="text-sm text-zinc-500">These records represent internal calendar allocations, vacations, or system maintenance blocks created by administrators.</p>
                                    <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-950/30 p-2 rounded border border-blue-900/30">
                                      <Shield className="w-3 h-3" />
                                      <span>Full Audit Traceability Enabled</span>
                                    </div>
                                  </div>
                                )}

                                {/* Booking History for this customer */}
                                <div className="space-y-3">
                                  <h3 className="font-semibold text-sm text-muted-foreground uppercase">Activity Logs</h3>
                                  <div className="space-y-2 max-h-64 overflow-y-auto overflow-x-auto pr-2 scrollbar-thin">
                                    {customer.events.map((event: any) => (
                                      <div
                                        key={event.id}
                                        className={cn(
                                          "p-2 rounded border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 transition-colors cursor-pointer",
                                          event.type === 'booking' && items.find(i => i.id === event.id)?.isArchived && "bg-green-900/40 border-green-700 hover:bg-green-900/50"
                                        )}
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (event.type === 'booking') {
                                            const original = items.find(i => i.id === event.id);
                                            if (original) handleBookingClick(e as any, original as any);
                                          } else if (event.type === 'activity') {
                                            setSelectedActivityLog(event);
                                          }
                                        }}
                                      >
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <div className="font-medium text-sm flex items-center flex-wrap gap-2">
                                              <span>{event.title}</span>
                                              {event.type === 'booking' && (() => {
                                                const vType = mapToServiceVehicleType(event.vehicle || event.vehicleType || '');
                                                const svcName = event.title || event.service_package || '';
                                                const svc = allServices.find(s => s.name === svcName || s.id === svcName);
                                                const basePrice = svc ? getServicePrice(svc.id, vType) : 0;
                                                const total = getEventPrice(event);
                                                const bookingItem = items.find(i => i.id === event.id) || event;
                                                const discCode = bookingItem.discountCode;
                                                const discAmt = Number(bookingItem.discountAmount || 0);
                                                return (
                                                  <div className="flex flex-wrap gap-1 items-center">
                                                    <Badge variant="outline" className="text-[10px] font-black uppercase text-green-400 bg-green-500/10 border-green-500/20 px-1.5 py-0 h-4">
                                                      Total: ${total}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-[10px] font-black uppercase text-zinc-400 bg-zinc-800/40 border-zinc-700/50 px-1.5 py-0 h-4">
                                                      Service: ${basePrice}
                                                    </Badge>
                                                    {discAmt > 0 && (
                                                      <Badge variant="outline" className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 border-amber-500/20 px-1.5 py-0 h-4">
                                                        Discount: -${discAmt.toFixed(2)} {discCode ? `(${discCode})` : ''}
                                                      </Badge>
                                                    )}
                                                    {(bookingItem.probonoPrimaryReason || bookingItem.probonoReason) && (
                                                      <Badge variant="outline" className="text-[10px] font-black uppercase text-pink-400 bg-pink-500/10 border-pink-500/20 px-1.5 py-0 h-4" title={bookingItem.probonoReasons?.join(', ')}>
                                                        Probono: {bookingItem.probonoPrimaryReason || bookingItem.probonoReason}
                                                        {bookingItem.probonoReasons && bookingItem.probonoReasons.length > 1 && ` +${bookingItem.probonoReasons.length - 1}`}
                                                      </Badge>
                                                    )}
                                                  </div>
                                                );
                                              })()}
                                              {(() => {
                                                const rawAddons = event.addons || event.add_ons || [];
                                                const addonsArray = Array.isArray(rawAddons) ? rawAddons : 
                                                                   (typeof rawAddons === 'string' ? JSON.parse(rawAddons) : []);
                                                
                                                if (addonsArray.length === 0) return null;

                                                const vType = mapToServiceVehicleType(event.vehicle || event.vehicleType || '');

                                                return (
                                                  <div className="flex flex-wrap gap-1.5 mt-1.5 mb-1">
                                                    {addonsArray.map((a: string, i: number) => {
                                                      const canonical = getCanonicalAddonName(a);
                                                      const addonDef = allAddons.find(ad => ad.name === canonical);
                                                      const addonPrice = addonDef ? getAddOnPrice(addonDef.id, vType) : 0;
                                                      return (
                                                        <Badge key={i} variant="outline" className="text-[9px] font-black uppercase px-2 py-0 h-4 bg-blue-500/10 text-blue-400 border-blue-500/20">
                                                          {a} (${addonPrice})
                                                        </Badge>
                                                      );
                                                    })}
                                                  </div>
                                                );
                                              })()}
                                            </div>
                                            <div className="text-xs text-muted-foreground flex items-center flex-wrap gap-1.5 mt-1">
                                              {format(parseISO(event.date), "MMM d, yyyy 'at' h:mm a")}
                                              
                                              {event.type === 'booking' && (items.find(i => i.id === event.id)?.createdAt || (event as any).createdAt) && (
                                                <>
                                                  <span className="text-zinc-700">•</span>
                                                  <span className="text-zinc-500 italic" title="Time booking was placed">Placed: {format(parseISO(items.find(i => i.id === event.id)?.createdAt || (event as any).createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                                                </>
                                              )}

                                              {event.type === 'booking' && (
                                                <>
                                                  <span className="text-zinc-700">•</span>
                                                  <span className="text-amber-400/80 font-bold uppercase text-[10px] flex items-center gap-1">
                                                    <MapPinIcon className="w-3 h-3" />
                                                    {event.placeOfService || event.address || "Customer's Address"}
                                                  </span>
                                                </>
                                              )}

                                              {event.type === 'booking' && (event.vehicleYear || event.vehicleMake) && (
                                                <>
                                                  <span className="text-zinc-700">•</span>
                                                  <span className="text-blue-400/80 font-bold uppercase text-[10px]">
                                                    {(event.vehicleYear && event.vehicleYear !== '-' && event.vehicleYear !== '---') ? `${event.vehicleYear} ` : ''}{event.vehicleMake} {event.vehicleModel}{event.vehicleColor ? ` (${event.vehicleColor})` : ''}
                                                  </span>
                                                </>
                                              )}
                                            </div>
                                            
                                            {event.type === 'booking' && (
                                              <div className="flex flex-col gap-0.5 mt-1.5">
                                                {(() => {
                                                  const b = items.find(i => i.id === event.id) || event;
                                                  const email = b.customerEmail || b.email || b.customer_email;
                                                  const phone = b.customerPhone || b.phone;
                                                  if (!email && !phone) return null;
                                                  return (
                                                    <div className="flex flex-col gap-0.5 text-[11px] text-zinc-400 font-medium">
                                                      {email && <div>📧 {email}</div>}
                                                      {phone && <div>📞 {phone}</div>}
                                                    </div>
                                                  );
                                                })()}
                                              </div>
                                            )}
                                            
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {archiveFilter === 'all' && (('isArchived' in event ? event.isArchived : (items.find(i => i.id === event.id)?.isArchived)) && (
                                              <Badge variant="outline" className="text-[10px] h-5 bg-amber-500/10 text-amber-500 border-amber-500/20">
                                                ARCHIVED
                                              </Badge>
                                            ))}
                                            <Badge
                                              variant="outline"
                                              className={cn("text-[10px] h-5", 
                                                event.type === 'booking' ? getStatusColor((event.status || 'pending') as any) : 
                                                event.type === 'activity' ? "text-purple-400 border-purple-900 bg-purple-500/10" :
                                                "text-red-400 border-red-900 bg-red-500/10"
                                              )}
                                            >
                                              {event.type === 'booking' ? (event.status || 'PENDING') : event.type === 'activity' ? (event.originalType || 'LOG') : 'BLOCKED'}
                                            </Badge>
                                          </div>
                                        </div>
                                        
                                        {event.type === 'booking' && (items.find(i => i.id === event.id)?.notes || event.notes) && (
                                          <div className="mt-2 p-2 bg-zinc-900/50 border border-zinc-800 rounded-md">
                                            <div className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-1">Booking Notes</div>
                                            <div className="text-xs text-zinc-400 whitespace-pre-wrap">{items.find(i => i.id === event.id)?.notes || event.notes}</div>
                                          </div>
                                        )}
                                        
                                        <div className="flex items-center gap-3 mt-2">
                                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                Source: <span className="text-purple-300 font-medium">{('source_origin' in event ? (event as any).source_origin : (event.source || 'Manual Entry'))}</span>
                                            </div>
                                            
                                            {/* ADD TO PROSPECTS BUTTON - Only show if not already linked to a customer/prospect */}
                                            {event.type === 'booking' && !customer.id && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-5 px-2 text-[9px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 rounded-md gap-1"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const original = items.find(i => i.id === event.id);
                                                  if (original) handleConvertToProspect(original);
                                                }}
                                              >
                                                <Plus className="w-2.5 h-2.5" /> Add to Prospects
                                              </Button>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap justify-end gap-1 mt-2">
                                          {event.type === 'booking' ? (
                                            <>
                                              <Button
                                                size="sm"
                                                variant="secondary"
                                                className="h-6 text-[10px] gap-1"
                                                onClick={async (e) => {
                                                  e.stopPropagation();
                                                  // Fall back to the event object if the booking isn't in the local store
                                                  const booking = items.find(i => i.id === event.id) || event as any;
                                                  const params = new URLSearchParams();
                                                  if (customer.name) params.set('customerName', customer.name);
                                                  const title = booking.title || (booking as any).service_package || '';
                                                  if (title) {
                                                    const svc = allServices.find(s => s.name === title);
                                                    if (svc) params.set('package', svc.id);
                                                  }
                                                  const vehicleType = booking.vehicle || (booking as any).vehicleType || '';
                                                  if (vehicleType) params.set('vehicleType', vehicleType);
                                                  const addons = booking.addons || (booking as any).add_ons || [];
                                                  if (Array.isArray(addons) && addons.length) {
                                                    const aids = addons.map((name: string) => allAddons.find(a => a.name === name)?.id).filter(Boolean);
                                                    if (aids.length) params.set('addons', aids.join(','));
                                                  }
                                                  navigate(`/service-checklist?${params.toString()}`);
                                                }}
                                              >
                                                <Wrench className="h-2.5 w-2.5" /> Start Job
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className={cn("h-6 text-[10px] gap-1 ml-1", items.find(i => i.id === event.id)?.isArchived ? "text-green-400 hover:text-green-300" : "text-zinc-500 hover:text-zinc-300")}
                                                onClick={async (e) => {
                                                  e.stopPropagation();
                                                  const booking = items.find(i => i.id === event.id);
                                                  if (booking) handleArchiveToggle(booking);
                                                }}
                                              >
                                                <Archive className="h-2.5 w-2.5" /> {items.find(i => i.id === event.id)?.isArchived ? "Restore" : "Archive"}
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 text-[10px] gap-1 ml-1 text-zinc-500 hover:text-zinc-300"
                                                onClick={async (e) => {
                                                  e.stopPropagation();
                                                  const booking = items.find(i => i.id === event.id);
                                                  if (booking) handleDuplicate(booking);
                                                }}
                                              >
                                                <Copy className="h-2.5 w-2.5" /> Duplicate
                                              </Button>
                                              <DropdownMenu>
                                                 <DropdownMenuTrigger asChild>
                                                   <Button
                                                     size="sm"
                                                     variant="ghost"
                                                     className="h-6 text-[10px] gap-1 ml-1 text-zinc-500 hover:text-zinc-300"
                                                   >
                                                     <Mail className="h-2.5 w-2.5 text-blue-400" /> Email
                                                   </Button>
                                                 </DropdownMenuTrigger>
                                                 <DropdownMenuContent className="bg-zinc-950 border-zinc-800 w-56">
                                                   <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2 py-1.5">Actual Emails Sent</DropdownMenuLabel>
                                                   {(() => {
                                                     const relevantEngagements = engagements.filter(eng => {
                                                       const isBookingMatch = eng.booking_id === event.id;
                                                       const isNameMatch = eng.customer_name?.toLowerCase() === customer.name.toLowerCase();
                                                       const isEmailMatch = eng.customer_email && customer?.email && eng.customer_email.toLowerCase() === customer.email.toLowerCase();
                                                       return (isBookingMatch || (isNameMatch || isEmailMatch)) && (eng.type === 'email' || eng.type === 'retention' || eng.type === 'initial');
                                                     }).slice(0, 5);

                                                     if (relevantEngagements.length === 0) {
                                                       return <div className="text-[10px] text-zinc-600 italic px-2 py-2">No historical records found.</div>;
                                                     }

                                                     return relevantEngagements.map((eng, eIdx) => (
                                                       <DropdownMenuItem 
                                                         key={eng.id || eIdx}
                                                         className="text-[10px] text-zinc-300 focus:bg-blue-600 focus:text-white cursor-pointer"
                                                         onClick={(e) => {
                                                           e.stopPropagation();
                                                           const original = items.find(i => i.id === event.id);
                                                           handlePreviewEmailForBooking(original || eng, undefined, eng);
                                                         }}
                                                       >
                                                         <div className="flex flex-col">
                                                           <span className="font-bold">{format(new Date(eng.created_at), 'MMM d, h:mm a')}</span>
                                                           <span className="text-[9px] opacity-70 truncate max-w-[180px]">{eng.note}</span>
                                                         </div>
                                                       </DropdownMenuItem>
                                                     ));
                                                   })()}
                                                   
                                                   <DropdownMenuSeparator className="bg-zinc-800" />
                                                   <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2 py-1.5">Production Templates</DropdownMenuLabel>
                                                   <DropdownMenuItem 
                                                     className="text-[10px] text-zinc-300 focus:bg-blue-600 focus:text-white cursor-pointer"
                                                     onClick={(e) => {
                                                       e.stopPropagation();
                                                       const original = items.find(i => i.id === event.id);
                                                       if (original) handlePreviewEmailForBooking(original);
                                                     }}
                                                   >
                                                     <Mail className="h-3 w-3 mr-2" /> Preview Production Template
                                                   </DropdownMenuItem>
                                                 </DropdownMenuContent>
                                               </DropdownMenu>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="h-6 text-[10px] gap-1 ml-1 text-blue-400 hover:text-blue-300"
                                                  onClick={async (e) => { 
                                                    e.stopPropagation(); 
                                                    const { getCustomerDetailedHistory } = await import('@/lib/supa-data'); const detailedHistory = await getCustomerDetailedHistory(event.customerId!); if (detailedHistory) await exportCustomerHistoryPDF(detailedHistory, true); 
                                                  }}
                                                >
                                                  <Eye className="h-2.5 w-2.5" /> Preview
                                                </Button>
                                                {isAdmin && (
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="h-6 text-[10px] gap-1 ml-1 text-red-500 hover:text-red-400 hover:bg-red-950/20"
                                                  onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm(`⚠️ Delete this history record for "${customer.name}"?\n\nThis action cannot be undone.`)) {
                                                      try {
                                                        await remove(event.id);
                                                        toast.success("History record deleted");
                                                      } catch (err: any) {
                                                        toast.error(err.message || "Failed to delete record");
                                                        refresh(); // Rollback local state
                                                      }
                                                    }
                                                  }}
                                                >
                                                  <Trash2 className="h-2.5 w-2.5" /> Delete
                                                </Button>
                                              )}
                                            </>
                                          ) : event.type === 'manual-block' ? (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-6 text-[10px] gap-1 text-red-500 hover:text-red-400 hover:bg-red-950/20"
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                if (confirm('Are you sure you want to delete this internal block?')) {
                                                  await unblockSlot(event.id);
                                                  loadUnifiedEvents();
                                                  toast.success("Internal block removed");
                                                }
                                              }}
                                            >
                                              <Trash2 className="h-2.5 w-2.5" /> Delete Block
                                            </Button>
                                          ) : null}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CollapsibleContent>
                      </Collapsible>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
      <AlertDialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-800 max-w-[500px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-orange-500">Cancel Appointment?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 text-base">
              This will mark the job as <strong>Cancelled</strong> and send an official notification to <strong>{formData.customer || 'the customer'}</strong> with the reason you provide below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 px-1">
            <label className="text-sm font-medium text-zinc-300 mb-2 block">
              Cancellation Reason (sent to customer)
            </label>
            <textarea
              className="w-full min-h-[120px] bg-zinc-900 border border-zinc-800 rounded-md p-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="e.g. Due to unforeseen scheduling conflicts, we need to cancel your appointment. We apologize for any inconvenience..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-none">Keep Appointment</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelBooking}
              disabled={!cancelReason.trim()}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
            >
              Confirm Cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this booking? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (selectedBooking) {
                  const user = getCurrentUser();
                  if (user?.role !== 'admin') {
                    toast.error("Access Denied", { description: "You do not have permission to delete bookings. Please contact an Administrator." });
                    setIsDeleteDialogOpen(false);
                    return;
                  }
                  
                  try {
                    await remove(selectedBooking.id);
                    toast.success("Booking deleted");
                    setIsAddModalOpen(false);
                    setSelectedBooking(null);
                    setSelectedCustomer(null);
                    // Refresh unified events to ensure history updates
                    await loadUnifiedEvents();
                  } catch (err: any) {
                    toast.error(err.message || "Failed to delete booking");
                  }
                }
                setIsDeleteDialogOpen(false);
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CustomerModal
        open={isCustomerModalOpen}
        onOpenChange={setIsCustomerModalOpen}
        initial={customerToEdit}
        onSave={onSaveCustomer}
        canAddMedia={isAdmin || unifiedEvents.some(e => e.type === 'booking' && (e.customerId === customerToEdit?.id || e.customerEmail === customerToEdit?.email) && e.assignedEmployee === getCurrentUser()?.id)}
      />

      <VehicleSelectorModal 
        open={showClassificationModal}
        onOpenChange={setShowClassificationModal}
        onSelect={handleClassificationSelect}
      />

      <HelpModal 
        open={isHelpOpen} 
        onOpenChange={setIsHelpOpen} 
        role={isAdmin ? 'admin' : 'employee'} 
      />

      <EmailPreviewModal 
        open={showEmailPreview} 
        onOpenChange={setShowEmailPreview}
        type={emailPreviewType}
        data={emailFormData}
      />

      <Dialog open={!!selectedActivityLog} onOpenChange={(open) => !open && setSelectedActivityLog(null)}>
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Activity Details
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex flex-col gap-1 border-b border-zinc-800 pb-4">
              <div className="text-xs text-zinc-500 font-semibold tracking-wider uppercase">Source / Type</div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-purple-400 border-purple-900 bg-purple-500/10">
                  {selectedActivityLog?.originalType || selectedActivityLog?.type}
                </Badge>
                <span className="text-sm text-zinc-400">{selectedActivityLog?.source}</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-1 border-b border-zinc-800 pb-4">
              <div className="text-xs text-zinc-500 font-semibold tracking-wider uppercase">Timestamp</div>
              <div className="text-sm">
                {selectedActivityLog?.date ? new Date(selectedActivityLog.date).toLocaleString() : 'N/A'}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-xs text-zinc-500 font-semibold tracking-wider uppercase">Content / Notes</div>
              <div className="text-sm bg-zinc-900/50 p-3 rounded-md border border-zinc-800 whitespace-pre-wrap">
                {selectedActivityLog?.content || selectedActivityLog?.notes || 'No content available.'}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedActivityLog(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
