import { SidebarTrigger } from "@/components/ui/sidebar"; // NEW IMPORT
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, addYears, subYears, parseISO, isToday, isWithinInterval, startOfYear, endOfYear, eachMonthOfInterval } from "date-fns";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, User, Car, Search, X, MapPin, Users, ChevronDown, Mail, Phone, MapPinIcon, Check, ChevronsUpDown, BarChart3, Wrench, Bell, Archive, Filter, Copy, RotateCcw, Trash2 } from "lucide-react"; // Added Copy, RotateCcw, Trash2
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { useBookingsStore, type Booking } from "@/store/bookings";
import type { BookingStatus } from "@/store/bookings";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api from "@/lib/api";
import { getSupabaseEmployees, getSupabaseBookings } from "@/lib/supa-data";
import { getCurrentUser } from "@/lib/auth"; // Fix: Import missing function
import { servicePackages, addOns } from "@/lib/services";
import { getCustomPackages, getCustomAddOns } from "@/lib/servicesMeta";
import { useLocation } from "react-router-dom";
import localforage from "localforage";
import { upsertCustomer } from "@/lib/db";
import { getUnifiedCustomers } from "@/lib/customers";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import jsPDF from "jspdf";
import { savePDFToArchive } from "@/lib/pdfArchive";
import VehicleSelectorModal from "@/components/vehicles/VehicleSelectorModal";
import supabase from "@/lib/supabase"; // Realtime import
import { getUnifiedCalendarEvents, type CalendarEvent, deleteCalendarEvent } from "@/lib/unifiedCalendar";
import { createGoogleEvent, isSignedIn, initGoogleCalendar, getCalendarConfig } from "@/lib/googleCalendar";
import { unblockSlot } from "@/lib/availability"; // Import unblockSlot

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

export default function BookingsPage() {
  const navigate = useNavigate();
  const { items, add, update, remove, refresh } = useBookingsStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [analyticsDefaultTab, setAnalyticsDefaultTab] = useState<string | undefined>(undefined);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const hasInitialized = useRef(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [vehicleClassModalOpen, setVehicleClassModalOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);


  const [vehicleSelectorOpen, setVehicleSelectorOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Sync latest data on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Form State
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
    address: "",
    time: "09:00",
    endTime: "17:00",
    assignedEmployee: "",
    bookedBy: getCurrentUser()?.name || '',
    notes: "",
    addons: [] as string[],
    hasReminder: false,
    reminderFrequency: "3",
    status: "confirmed" as BookingStatus,
    vehicleId: undefined as string | undefined
  });

  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [dateFilter, setDateFilter] = useState<{ start: Date | undefined; end: Date | undefined }>({ start: undefined, end: undefined });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [unifiedEvents, setUnifiedEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const allServices = useMemo(() => [...servicePackages, ...getCustomPackages()], []);
  const allAddons = useMemo(() => [...addOns, ...getCustomAddOns()], []);

  const handleArchiveToggle = (booking: Booking) => {
    update(booking.id, { isArchived: !booking.isArchived });
    toast.success(booking.isArchived ? "Booking restored" : "Booking archived");
  };

  // Handlers
  const handleStartJob = () => {
    const params = new URLSearchParams();
    if (selectedCustomer?.id) params.set('customerId', selectedCustomer.id);
    else if (formData.customer) params.set('customerName', formData.customer); // Fallback

    // Find service ID
    const svc = allServices.find(s => s.name === formData.service);
    if (svc) params.set('package', svc.id);

    if (formData.vehicle) params.set('vehicleType', formData.vehicle);
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

    // Map ClassificationTool categories
    if (cat === "Compact") mappedType = "Compact/Sedan (Small cars and sedans)";
    else if (cat === "Midsize / Sedan") mappedType = "Compact/Sedan (Small cars and sedans)";
    else if (cat === "SUV / Crossover") mappedType = "Mid-Size/SUV (Mid-size cars and SUVs)";
    else if (cat === "Truck / Oversized") mappedType = "Truck/Van/Large SUV (Trucks, vans, large SUVs)";
    else if (cat === "Oversized Specialty") mappedType = "Truck/Van/Large SUV (Trucks, vans, large SUVs)";
    else if (cat.includes("Compact/Sedan")) mappedType = "Compact/Sedan (Small cars and sedans)";
    else if (cat.includes("Mid-Size/SUV")) mappedType = "Mid-Size/SUV (Mid-size cars and SUVs)";
    else if (cat.includes("Truck/Van/Large SUV")) mappedType = "Truck/Van/Large SUV (Trucks, vans, large SUVs)";
    else if (cat.includes("Luxury/High-End")) mappedType = "Luxury/High-End (Luxury and premium vehicles)";

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
      } catch (err) {
        console.error('Failed to fetch employees:', err);
      }
    };
    fetchEmployees();
  }, []);

  const fetchCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
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
        // Year view - get full year
        startDate = startOfYear(currentDate);
        endDate = endOfYear(currentDate);
      }

      const events = await getUnifiedCalendarEvents(startDate, endDate, items);
      setUnifiedEvents(events);
    } catch (error) {
      console.error('Failed to load unified events:', error);
    } finally {
      setEventsLoading(false);
    }
  }, [viewMode, currentDate, items, refresh]);

  useEffect(() => {
    // 1. Fetch Customers
    fetchCustomers();

    // 2. Realtime Subscription (using store refresh)
    const channel = supabase
      .channel('bookings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        refresh();
        toast.info("Calendar updated from remote change");
      })
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
  }, [refresh, fetchCustomers, loadUnifiedEvents]);

  // Handle URL query parameters for pre-filling booking form
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldAdd = params.get('add') === 'true';
    const customerName = params.get('customerName');
    const email = params.get('email');
    const phone = params.get('phone');
    const vehicleYear = params.get('vehicleYear');
    const vehicleMake = params.get('vehicleMake');
    const vehicleModel = params.get('vehicleModel');
    const vehicleType = params.get('vehicleType');
    const address = params.get('address');

    if (shouldAdd) {
      setFormData(prev => ({
        ...prev,
        customer: customerName ? decodeURIComponent(customerName) : prev.customer,
        address: address ? decodeURIComponent(address) : prev.address,
        email: email ? decodeURIComponent(email) : prev.email,
        phone: phone ? decodeURIComponent(phone) : prev.phone,
        vehicleYear: vehicleYear ? decodeURIComponent(vehicleYear) : prev.vehicleYear,
        vehicleMake: vehicleMake ? decodeURIComponent(vehicleMake) : prev.vehicleMake,
        vehicleModel: vehicleModel ? decodeURIComponent(vehicleModel) : prev.vehicleModel,
        vehicle: vehicleType ? decodeURIComponent(vehicleType) : prev.vehicle
      }));
      setSelectedDate(new Date());
      setIsAddModalOpen(true);

      // Clear URL params after opening
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.search]);

  // Sync view mode with URL param 'view'
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const viewParam = params.get('view');
    if (viewParam === 'analytics') {
      setViewMode('analytics');
    }
  }, [location.search]);

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
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadUnifiedEvents, refresh]);

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
      if (!showArchived && b.isArchived) return false;
      const d = parseISO(b.date);
      return isSameMonth(d, currentDate);
    });
  }, [items, currentDate, showArchived]);

  const getBookingsForDay = (day: Date) => {
    // Get unified events for this day
    return unifiedEvents.filter(event => {
      return isSameDay(parseISO(event.date), day);
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Get real bookings only (for legacy compatibility)
  const getRealBookingsForDay = (day: Date) => {
    return items.filter(b => {
      if (!showArchived && b.isArchived) return false;
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
    setSelectedDate(day);
    setFormData(prev => ({ ...prev, time: "09:00", addons: [] })); // Reset time default
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
      email: booking.email || matchingCust?.email || "",
      phone: booking.phone || matchingCust?.phone || "",
      service: booking.title || "",
      vehicle: booking.vehicle || matchingCust?.vehicleType || "",
      vehicleYear: booking.vehicleYear || matchingCust?.year || "",
      vehicleMake: booking.vehicleMake || matchingCust?.vehicle || "",
      vehicleModel: booking.vehicleModel || matchingCust?.model || "",
      address: booking.address || "",
      time: booking.date ? format(parseISO(booking.date), "HH:mm") : "09:00",
      endTime: booking.endTime ? format(parseISO(booking.endTime), "HH:mm") : "17:00",
      assignedEmployee: booking.assignedEmployee || "",
      bookedBy: booking.bookedBy || "",
      notes: booking.notes || "",
      addons: booking.addons || [],
      hasReminder: booking.hasReminder || false,
      reminderFrequency: booking.reminderFrequency?.toString() || "3",
      status: booking.status || "confirmed",
      vehicleId: booking.vehicleId
    });
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

  const handleSave = async () => {
    if (!formData.customer || !formData.service) {
      toast.error("Customer and Service are required");
      return;
    }

    // Sync to Customer Profile
    try {
      // Resolve customer ID from selection if names match, otherwise undefined (or previous formData.customerId if just editing details)
      const resolvedCustomerId = (selectedCustomer?.name === formData.customer) ? selectedCustomer?.id : formData.customerId;

      const custPayload = {
        id: resolvedCustomerId,
        name: formData.customer,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        vehicle: formData.vehicleMake,
        model: formData.vehicleModel,
        year: formData.vehicleYear,
        updatedAt: new Date().toISOString()
      };
      await upsertCustomer(custPayload);
    } catch (e) { console.error('Customer sync failed', e); }

    const dateBase = selectedDate || new Date();
    const [hours, minutes] = formData.time.split(":").map(Number);
    const date = new Date(dateBase);
    date.setHours(hours, minutes, 0, 0);

    let resultingBooking: any;

    if (selectedBooking) {
      // Update
      const updates = {
        customer: formData.customer,
        title: formData.service,
        date: date.toISOString(),
        endTime: formData.endTime ? (() => {
          const [endHours, endMinutes] = formData.endTime.split(":").map(Number);
          const endDate = new Date(dateBase);
          endDate.setHours(endHours, endMinutes, 0, 0);
          return endDate.toISOString();
        })() : undefined,
        status: formData.status,
        vehicle: formData.vehicle,
        vehicleYear: formData.vehicleYear,
        vehicleMake: formData.vehicleMake,
        vehicleModel: formData.vehicleModel,
        address: formData.address,
        assignedEmployee: formData.assignedEmployee,
        bookedBy: formData.bookedBy, // Save bookedBy
        notes: formData.notes,
        addons: formData.addons,
        hasReminder: formData.hasReminder,
        reminderFrequency: parseInt(formData.reminderFrequency) || 0,
        vehicleId: formData.vehicleId,
        customerId: (selectedCustomer?.name === formData.customer) ? selectedCustomer?.id : formData.customerId
      };
      update(selectedBooking.id, updates);
      resultingBooking = { ...selectedBooking, ...updates };

      // Notify Admin if Employee
      notifyEmployeeChange('update', resultingBooking);

      toast.success("Booking updated");
    } else {
      // Create
      const newBooking: Booking = {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `b-${Date.now()}`,
        customer: formData.customer,
        customerId: (selectedCustomer?.name === formData.customer) ? selectedCustomer?.id : formData.customerId,
        title: formData.service,
        date: date.toISOString(),
        endTime: formData.endTime ? (() => {
          const [endHours, endMinutes] = formData.endTime.split(":").map(Number);
          const endDate = new Date(dateBase);
          endDate.setHours(endHours, endMinutes, 0, 0);
          return endDate.toISOString();
        })() : undefined,
        status: formData.status,
        vehicle: formData.vehicle,
        vehicleYear: formData.vehicleYear,
        vehicleMake: formData.vehicleMake,
        vehicleModel: formData.vehicleModel,
        address: formData.address,
        assignedEmployee: formData.assignedEmployee,
        bookedBy: formData.bookedBy, // Save bookedBy
        notes: formData.notes,
        addons: formData.addons,
        hasReminder: formData.hasReminder,
        reminderFrequency: parseInt(formData.reminderFrequency) || 0,
        vehicleId: formData.vehicleId, // Store the specific vehicle ID
        createdAt: new Date().toISOString()
      };
      add(newBooking as any);
      resultingBooking = newBooking;

      // Notify Admin if Employee
      notifyEmployeeChange('create', resultingBooking);

      toast.success("Booking created");
    }

    // Sync to Google Calendar if signed in
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
        toast.error("Google Calendar sync failed. Check console.");
      }
    }

    // Generate and Save PDF automatically
    handleSavePDF(); // Default customer copy

    setIsAddModalOpen(false);
    setSelectedBooking(null);
    setSelectedCustomer(null);
    setSelectedCustomer(null);
    setFormData({ customerId: undefined, customer: "", email: "", phone: "", service: "", vehicle: "", vehicleYear: "", vehicleMake: "", vehicleModel: "", address: "", time: "09:00", endTime: "17:00", assignedEmployee: "", bookedBy: "", notes: "", addons: [], hasReminder: false, reminderFrequency: "3", status: "confirmed", vehicleId: undefined });
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
      vehicleId: booking.vehicleId
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
      b.notes?.includes('Test booking - can be deleted')
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

    const pdfDataUrl = doc.output('datauristring');
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


  return (
    <div className="min-h-screen bg-background text-foreground w-full max-w-[100vw] overflow-x-hidden">
      <PageHeader title="Booking Calendar" subtitle="Manage appointments">
        <div className="flex items-center gap-2 hidden lg:flex">
          <div className="flex bg-zinc-900/50 rounded-lg p-1 border border-zinc-800">
            <Button variant={viewMode === 'day' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('day')} className="h-7 text-xs px-2">Day</Button>
            <Button variant={viewMode === 'week' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('week')} className="h-7 text-xs px-2">Week</Button>
            <Button variant={viewMode === 'month' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('month')} className="h-7 text-xs px-2">Month</Button>
            <Button variant={viewMode === 'year' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('year')} className="h-7 text-xs px-2">Year</Button>
          </div>

          <Button variant="outline" size="icon" onClick={refresh} className="h-8 w-8" title="Refresh">
            <RotateCcw className="h-3 w-3" />
          </Button>

          <Button variant="outline" size="sm" onClick={handleToday} className="h-8">Today</Button>

          {/* 🗑️ DELETE TEST DATA BUTTON - Only on localhost */}
          {window.location.hostname === 'localhost' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteTestBookings}
              className="h-8 bg-red-600 hover:bg-red-700"
            >
              🗑️ Delete Test Data
            </Button>
          )}

          <div className="flex items-center bg-secondary/50 rounded-md border border-border h-8">
            <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8"><ChevronLeft className="h-3 w-3" /></Button>
            <span className="min-w-[80px] w-auto text-center text-xs font-semibold px-2">
              {viewMode === 'day' ? format(currentDate, "MMMM d") : viewMode === 'year' ? format(currentDate, "yyyy") : format(currentDate, "MMMM yyyy")}
            </span>
            <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8"><ChevronRight className="h-3 w-3" /></Button>
          </div>

          <Button className="bg-primary hover:bg-primary/90 h-8 text-xs" onClick={() => {
            setSelectedDate(new Date());
            setFormData(prev => ({ ...prev, bookedBy: getCurrentUser()?.name || '' }));
            setIsAddModalOpen(true);
          }}>
            <Plus className="h-3 w-3 mr-1" /> New
          </Button>
        </div>
      </PageHeader>

      <div className="p-4 sm:p-6 space-y-6 mt-12 lg:mt-0">
        {/* Mobile Controls (visible only on small screens) */}
        <div className="flex flex-col gap-4 lg:hidden mb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
              <Button variant={viewMode === 'day' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('day')} className="h-8 text-xs px-3">Day</Button>
              <Button variant={viewMode === 'week' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('week')} className="h-8 text-xs px-3">Week</Button>
              <Button variant={viewMode === 'month' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('month')} className="h-8 text-xs px-3">Month</Button>
              <Button variant={viewMode === 'year' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('year')} className="h-8 text-xs px-3">Year</Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={refresh} title="Refresh">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button className="bg-primary hover:bg-primary/90" size="sm" onClick={() => { setSelectedDate(new Date()); setIsAddModalOpen(true); }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" size="icon" onClick={handlePrev}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="font-semibold">{viewMode === 'day' ? format(currentDate, "EEEE, MMMM d, yyyy") : viewMode === 'year' ? format(currentDate, "yyyy") : format(currentDate, "MMMM yyyy")}</span>
            <Button variant="outline" size="icon" onClick={handleNext}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={handleToday}>Today</Button>
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
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {booking.type === 'booking' && (booking as Booking).hasReminder && <Bell className="h-4 w-4 text-yellow-500 animate-pulse" />}
                          {booking.type === 'booking' && (booking as Booking).assignedEmployee && <Badge variant="secondary" className="text-xs">{(booking as Booking).assignedEmployee}</Badge>}
                          <div className="flex gap-1">
                            {booking.type === 'booking' && (
                              <>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); handleStartJob(); }}><Wrench className="h-4 w-4" /></Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); handleDuplicate(booking as Booking); }}><Copy className="h-4 w-4" /></Button>
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
                            setSelectedHistoryCustomer(custName);
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
            <div className="grid grid-cols-7 auto-rows-fr gap-px bg-zinc-800">
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
                      "min-h-[140px] bg-zinc-950 p-2 relative group transition-colors hover:bg-zinc-900/80 cursor-pointer flex flex-col gap-1",
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
                                <div className="truncate opacity-80 text-[10px]">{booking.title}</div>

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
            <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 shrink-0">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  {selectedBooking ? 'Edit Booking' : 'New Booking'}
                </DialogTitle>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Date:</label>
                  <Input
                    type="date"
                    className="w-40 h-8 bg-zinc-900 border-zinc-800"
                    value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-MM-dd")}
                    onChange={(e) => {
                      if (e.target.value) {
                        // Parse YYYY-MM-DD manually to create local date at midnight explicitly
                        // preventing any timezone/UTC conversion issues
                        const [year, month, day] = e.target.value.split('-').map(Number);
                        const newDate = new Date(year, month - 1, day);
                        setSelectedDate(newDate);
                      }
                    }}
                  />
                </div>
              </div>
            </DialogHeader>

            <div className="overflow-y-auto flex-1 px-4 sm:px-6">
              <div className="grid gap-4 py-4">
                {/* SUMMARY HEADER (READ ONLY) */}
                <div className="p-3 bg-zinc-950/50 rounded-lg border border-purple-500/20 mb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Service Summary</div>
                      <div className="text-white font-medium text-lg">{formData.service || "No Service Selected"}</div>
                      {formData.addons.length > 0 && <div className="text-zinc-400 text-sm">+ {formData.addons.join(", ")}</div>}
                    </div>
                    <div className="text-right">
                      <div className="text-emerald-400 font-bold text-lg">
                        {selectedBooking?.price ? `$${selectedBooking.price.toFixed(2)}` : 'Est.'}
                      </div>
                      <div className="text-zinc-500 text-xs">{formData.date ? format(new Date(formData.date), "MMM d, yyyy") : "No Date"}</div>
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
                            vehicle: primaryVeh?.type || cust.vehicleType || prev.vehicle
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
                              vehicle: veh.type || prev.vehicle
                            }));
                          }
                        }}
                      >
                        <option value="">-- Choose from Linked Vehicles --</option>
                        {selectedCustomer.vehicles.map((v: any) => (
                          <option key={v.id} value={v.id}>
                            {v.year} {v.make} {v.model} ({v.type || 'N/A'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm font-medium text-gray-400">Contact</label>
                  <div className="col-span-3 grid grid-cols-2 gap-2">
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Email (optional)"
                        className="pl-9 bg-zinc-900 border-zinc-800 text-gray-300"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Phone (optional)"
                        className="pl-9 bg-zinc-900 border-zinc-800 text-gray-300"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                                ? `${formData.addons.length} Addon${formData.addons.length > 1 ? 's' : ''}`
                                : "Addons..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrinking-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0 bg-white border-zinc-300">
                          <Command>
                            <CommandInput placeholder="Search addons..." className="h-9 text-zinc-900" />
                            <CommandEmpty className="text-zinc-600">No addon found.</CommandEmpty>
                            <CommandGroup className="max-h-64 overflow-auto">
                              {allAddons.map((addon) => (
                                <CommandItem
                                  key={addon.id}
                                  value={addon.name}
                                  onSelect={() => {
                                    setFormData(prev => {
                                      const exists = prev.addons.includes(addon.name);
                                      if (exists) return { ...prev, addons: prev.addons.filter(a => a !== addon.name) };
                                      return { ...prev, addons: [...prev.addons, addon.name] };
                                    });
                                  }}
                                  className="text-zinc-900 cursor-pointer hover:bg-zinc-100"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.addons.includes(addon.name) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {addon.name}
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
                    </select>
                  </div>
                </div>

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
                        onClick={() => navigate('/vehicle-classification', { state: { returnTo: '/bookings' } })}
                      >
                        Quick Select
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm font-medium text-gray-400">Vehicle Details</label>
                  <div className="col-span-3 grid grid-cols-3 gap-2">
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
                    {selectedCustomer?.vehicle && (
                      <p className="col-span-3 text-xs text-gray-400">
                        Customer's vehicle: {selectedCustomer.year} {selectedCustomer.vehicle} {selectedCustomer.model}
                      </p>
                    )}
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
                    <div className="col-span-3 text-sm text-gray-400">
                      {new Date(selectedBooking.createdAt).toLocaleString()}
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
                          <option value="1">1 Month</option>
                          <option value="3">3 Months</option>
                          <option value="4">4 Months</option>
                          <option value="6">6 Months</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-between sm:justify-between gap-2">
              <div className="flex gap-2">
                {selectedBooking && (
                  <Button variant="destructive" size="icon" onClick={handleDelete} className="bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-900">
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="secondary" onClick={handleStartJob} className="gap-2">
                  <Wrench className="h-4 w-4" /> Start Job
                </Button>
                <Button variant="secondary" onClick={() => handleDuplicate(selectedBooking)} className="gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700">
                  <Copy className="h-4 w-4" /> Duplicate
                </Button>
                {selectedBooking?.status === 'tentative' && (
                  <Button
                    onClick={() => {
                      if (selectedBooking) {
                        update(selectedBooking.id, { status: 'confirmed' });
                        toast.success('Booking confirmed!');
                        setIsAddModalOpen(false);
                      }
                    }}
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    ✓ Confirm Booking
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">Save Booking</Button>
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



        {/* Booking History Section */}
        <Card className="mt-6 p-6 bg-zinc-950/50 border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Booking History</h2>
              <p className="text-sm text-muted-foreground">
                View all customers with bookings and their complete information
              </p>
            </div>
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900/50">
                  <Filter className="h-4 w-4" />
                  Filter History
                  {(showArchived || dateFilter.start) && (
                    <Badge variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30 ml-1 h-5 px-1.5">
                      !
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-zinc-950 border-zinc-800 p-4" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Show Archived</span>
                    <Switch checked={showArchived} onCheckedChange={setShowArchived} />
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Date Range</span>
                    <div className="grid gap-2">
                      <Calendar
                        mode="range"
                        selected={{ from: dateFilter.start, to: dateFilter.end }}
                        onSelect={(range) => setDateFilter({ start: range?.from, end: range?.to })}
                        initialFocus
                        className="rounded-md border border-zinc-800 bg-zinc-900"
                      />
                    </div>
                    {(dateFilter.start || dateFilter.end) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-muted-foreground hover:text-white"
                        onClick={() => setDateFilter({ start: undefined, end: undefined })}
                      >
                        Clear Dates
                      </Button>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            {(() => {
              // Get unique customers from all bookings
              const uniqueCustomers = Array.from(
                new Set(items.map(b => b.customer))
              ).map(customerName => {
                // Find all bookings for this customer
                // Apply filters here
                let customerBookings = items.filter(b => b.customer === customerName);

                // Removed !showArchived check so they always appear in history list

                if (dateFilter.start && dateFilter.end) {
                  customerBookings = customerBookings.filter(b => {
                    const d = parseISO(b.date);
                    return isWithinInterval(d, { start: startOfDay(dateFilter.start!), end: endOfDay(dateFilter.end!) });
                  });
                } else if (dateFilter.start) {
                  // Single day selection or partial range? Calendar range usually sets both if range
                  // If only start is set, maybe just match start?
                  // But range calendar might return undefined end while selecting
                  // Let's assume strict range only if both set, or just allow strict filtering if single day
                  // Actually standard behavior is to show nothing or just start? 
                  // Let's safe guard:
                  if (!dateFilter.end) {
                    customerBookings = customerBookings.filter(b => isSameDay(parseISO(b.date), dateFilter.start!));
                  }
                }

                if (customerBookings.length === 0) return null;

                // Get the most recent booking to extract customer details
                // Get the most recent booking to extract customer details
                const recentBooking = customerBookings.sort((a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime()
                )[0];

                // Find full customer data from customers list
                const fullCustomer = customers.find(c => c.name === customerName);

                return {
                  name: customerName,
                  bookingCount: customerBookings.length,
                  lastBooking: recentBooking.date,
                  vehicle: recentBooking.vehicleYear && recentBooking.vehicleMake
                    ? `${recentBooking.vehicleYear} ${recentBooking.vehicleMake} ${recentBooking.vehicleModel}`
                    : recentBooking.vehicle || 'N/A',
                  address: recentBooking.address || fullCustomer?.address || 'N/A',
                  phone: fullCustomer?.phone || 'N/A',
                  email: fullCustomer?.email || 'N/A',
                  bookings: customerBookings
                };
              }).filter(Boolean) as any[];

              if (uniqueCustomers.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    No booking history yet. Create your first booking above!
                  </div>
                );
              }

              return uniqueCustomers.map((customer) => (
                <Collapsible
                  key={customer.name}
                  open={selectedHistoryCustomer === customer.name}
                  onOpenChange={(open) => setSelectedHistoryCustomer(open ? customer.name : null)}
                >
                  <div className="border border-zinc-800 rounded-lg overflow-hidden">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-4 hover:bg-zinc-900/50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div className="text-left">
                            <div className="font-semibold">{customer.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {customer.bookingCount} booking{customer.bookingCount > 1 ? 's' : ''} • Last: {format(parseISO(customer.lastBooking), "MMM d, yyyy")}
                            </div>
                          </div>
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-5 w-5 text-muted-foreground transition-transform",
                            selectedHistoryCustomer === customer.name && "transform rotate-180"
                          )}
                        />
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t border-zinc-800 p-4 bg-zinc-900/30">
                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Customer Details */}
                          <div className="space-y-3">
                            <h3 className="font-semibold text-sm text-muted-foreground uppercase">Contact Information</h3>

                            <div className="flex items-start gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div>
                                <div className="text-xs text-muted-foreground">Email</div>
                                <div className="text-sm">{customer.email}</div>
                              </div>
                            </div>

                            <div className="flex items-start gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div>
                                <div className="text-xs text-muted-foreground">Phone</div>
                                <div className="text-sm">{customer.phone}</div>
                              </div>
                            </div>

                            <div className="flex items-start gap-2">
                              <MapPinIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div>
                                <div className="text-xs text-muted-foreground">Address</div>
                                <div className="text-sm">{customer.address}</div>
                              </div>
                            </div>

                            <div className="flex items-start gap-2">
                              <Car className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div>
                                <div className="text-xs text-muted-foreground">Vehicle</div>
                                <div className="text-sm">{customer.vehicle}</div>
                              </div>
                            </div>
                          </div>

                          {/* Booking History for this customer */}
                          <div className="space-y-3">
                            <h3 className="font-semibold text-sm text-muted-foreground uppercase">Booking History</h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {customer.bookings.map((booking: Booking) => (
                                <div
                                  key={booking.id}
                                  className={cn(
                                    "p-2 rounded border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 transition-colors cursor-pointer",
                                    booking.isArchived && "bg-green-900/40 border-green-700 hover:bg-green-900/50"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBookingClick(e as any, booking as any);
                                  }}
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="font-medium text-sm">{booking.title}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {format(parseISO(booking.date), "MMM d, yyyy 'at' h:mm a")}
                                      </div>
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className={cn("text-xs", getStatusColor(booking.status as any))}
                                    >
                                      {booking.status}
                                    </Badge>
                                  </div>
                                  <div className="flex justify-end mt-2">
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="h-6 text-xs gap-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const params = new URLSearchParams();
                                        if (customer.name) params.set('customerName', customer.name);
                                        if (booking.title) {
                                          const svc = allServices.find(s => s.name === booking.title);
                                          if (svc) params.set('package', svc.id);
                                        }
                                        if (booking.vehicle) params.set('vehicleType', booking.vehicle);
                                        if (booking.addons && booking.addons.length) {
                                          const aids = booking.addons.map(name => allAddons.find(a => a.name === name)?.id).filter(Boolean);
                                          params.set('addons', aids.join(','));
                                        }
                                        navigate(`/service-checklist?${params.toString()}`);
                                      }}
                                    >
                                      <Wrench className="h-3 w-3" /> Start Job
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className={cn("h-6 text-xs gap-1 ml-2", booking.isArchived ? "text-green-400 hover:text-green-300" : "text-zinc-500 hover:text-zinc-300")}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleArchiveToggle(booking);
                                      }}
                                    >
                                      <Archive className="h-3 w-3" /> {booking.isArchived ? "Restore" : "Archive"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 text-xs gap-1 ml-2 text-zinc-500 hover:text-zinc-300"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDuplicate(booking);
                                      }}
                                    >
                                      <Copy className="h-3 w-3" /> Duplicate
                                    </Button>
                                  </div>
                                  {
                                    booking.assignedEmployee && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        👤 {booking.assignedEmployee}
                                      </div>
                                    )
                                  }
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ));
            })()}
          </div>
        </Card >
      </div>
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
              onClick={() => {
                if (selectedBooking) {
                  // Notify Admin if Employee BEFORE removal
                  notifyEmployeeChange('delete', selectedBooking);
                  remove(selectedBooking.id);
                  toast.success("Booking deleted");
                  setIsAddModalOpen(false);
                  setSelectedBooking(null);
                  setSelectedCustomer(null);
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
    </div >
  );
}
