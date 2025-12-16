import { SidebarTrigger } from "@/components/ui/sidebar"; // NEW IMPORT
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, addYears, subYears, parseISO, isToday, isWithinInterval, startOfYear, endOfYear, eachMonthOfInterval } from "date-fns";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, User, Car, Search, X, MapPin, Users, ChevronDown, Mail, Phone, MapPinIcon, Check, ChevronsUpDown, BarChart3, Wrench, Bell, Archive, Filter, Copy } from "lucide-react"; // Added Copy
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { useBookingsStore, type Booking } from "@/store/bookings";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api from "@/lib/api";
import { getSupabaseEmployees, getSupabaseBookings } from "@/lib/supa-data";
import { servicePackages, addOns } from "@/lib/services";
import { getCustomPackages, getCustomAddOns } from "@/lib/servicesMeta";
import { useLocation } from "react-router-dom";
import localforage from "localforage";
import { upsertCustomer } from "@/lib/db";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import jsPDF from "jspdf";
import { savePDFToArchive } from "@/lib/pdfArchive";
import VehicleSelectorModal from "@/components/vehicles/VehicleSelectorModal";

// --- Types ---
type ViewMode = "week" | "month" | "year" | "analytics";

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
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [vehicleClassModalOpen, setVehicleClassModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
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
    assignedEmployee: "",
    bookedBy: "",
    notes: "",
    addons: [] as string[],
    hasReminder: false,
    reminderFrequency: "3"
  });

  const [employees, setEmployees] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [dateFilter, setDateFilter] = useState<{ start: Date | undefined; end: Date | undefined }>({ start: undefined, end: undefined });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const allServices = useMemo(() => [...servicePackages, ...getCustomPackages()], []);
  const allAddons = useMemo(() => [...addOns, ...getCustomAddOns()], []);

  const handleArchiveToggle = (booking: Booking) => {
    if (confirm(booking.isArchived ? "Restore this booking?" : "Are you sure you want to archive this booking?")) {
      update(booking.id, { isArchived: !booking.isArchived });
      toast.success(booking.isArchived ? "Booking restored" : "Booking archived");
    }
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
    if (cat === "Compact") mappedType = "Compact/Sedan";
    else if (cat === "Midsize / Sedan") mappedType = "Compact/Sedan";
    else if (cat === "SUV / Crossover") mappedType = "Mid-Size/SUV";
    else if (cat === "Truck / Oversized") mappedType = "Truck/Van/Large SUV";
    else if (cat === "Oversized Specialty") mappedType = "Truck/Van/Large SUV";

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

    // Fetch bookings from Supabase and sync to store
    const syncBookings = async () => {
      const supaBookings = await getSupabaseBookings();
      const localIds = new Set(items.map(b => b.id));

      supaBookings.forEach(sb => {
        if (!localIds.has(sb.id)) {
          // Determine status - map raw string to BookingStatus type
          let status: any = sb.status;
          if (!['pending', 'confirmed', 'in_progress', 'done'].includes(status)) {
            status = 'pending';
          }

          add({
            id: sb.id,
            customer: sb.customer_name || 'Unknown',
            title: sb.title || 'Service',
            date: sb.date, // Assuming ISO
            status: status,
            vehicle: sb.vehicle_info?.type || '',
            vehicleYear: sb.vehicle_year || sb.vehicle_info?.year || '',
            vehicleMake: sb.vehicle_make || sb.vehicle_info?.make || '',
            vehicleModel: sb.vehicle_model || sb.vehicle_info?.model || '',
            address: sb.address || '',
            assignedEmployee: sb.assigned_employee || '',
            notes: sb.notes || '',
            price: sb.price,
            addons: sb.addons || [],
            bookedBy: sb.booked_by || 'Website',
            hasReminder: sb.has_reminder,
            reminderFrequency: sb.reminder_frequency,
            isArchived: sb.is_archived,
            createdAt: sb.created_at
          });
        }
      });
    };
    syncBookings();

    // Fetch customers - Load from localforage to get complete data with addresses/vehicles
    const fetchCustomers = async () => {
      try {
        // Get customers from localforage which has complete mock data
        const custs = (await localforage.getItem<any[]>('customers')) || [];
        setCustomers(custs);
      } catch (err) {
        console.error('Failed to fetch customers:', err);
      }
    };
    fetchCustomers();
  }, []);

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


  // Refresh data on mount and focus
  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

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
    return items.filter(b => {
      if (!showArchived && b.isArchived) return false;
      return isSameDay(parseISO(b.date), day);
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Handlers
  const handlePrev = () => {
    if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else if (viewMode === 'year') setCurrentDate(subYears(currentDate, 1));
    else setCurrentDate(subMonths(currentDate, 1));
  };
  const handleNext = () => {
    if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else if (viewMode === 'year') setCurrentDate(addYears(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  };
  const handleToday = () => setCurrentDate(new Date());

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setFormData(prev => ({ ...prev, time: "09:00", addons: [] })); // Reset time default
    setIsAddModalOpen(true);
  };

  const handleBookingClick = (e: React.MouseEvent, booking: Booking) => {
    e.stopPropagation();
    setSelectedBooking(booking);
    const matchingCust = customers.find(c => c.name === booking.customer);
    setSelectedCustomer(matchingCust || null);
    setFormData({
      customer: booking.customer,
      email: customers.find(c => c.name === booking.customer)?.email || "",
      phone: customers.find(c => c.name === booking.customer)?.phone || "",
      service: booking.title,
      vehicle: booking.vehicle || "",
      vehicleYear: booking.vehicleYear || "",
      vehicleMake: booking.vehicleMake || "",
      vehicleModel: booking.vehicleModel || "",
      address: booking.address || "",
      time: format(parseISO(booking.date), "HH:mm"),
      assignedEmployee: booking.assignedEmployee || "",
      bookedBy: booking.bookedBy || "", // Load bookedBy
      notes: booking.notes || "",
      addons: booking.addons || [],
      hasReminder: booking.hasReminder || false,
      reminderFrequency: booking.reminderFrequency?.toString() || "3"
    });
    setIsAddModalOpen(true);
    setIsAddModalOpen(true);
  };

  const handleBellClick = (e: React.MouseEvent, booking: Booking) => {
    e.stopPropagation();
    setViewMode("analytics");
    setAnalyticsDefaultTab("reminders");
  };

  const handleSave = async () => {
    if (!formData.customer || !formData.service) {
      toast.error("Customer and Service are required");
      return;
    }

    // Sync to Customer Profile
    try {
      const custPayload = {
        id: (selectedCustomer?.name === formData.customer) ? selectedCustomer?.id : undefined,
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

    if (selectedBooking) {
      // Update
      update(selectedBooking.id, {
        customer: formData.customer,
        title: formData.service,
        date: date.toISOString(),
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
        reminderFrequency: parseInt(formData.reminderFrequency) || 0
      });
      toast.success("Booking updated");
    } else {
      // Create
      add({
        id: `b-${Date.now()}`,
        customer: formData.customer,
        title: formData.service,
        date: date.toISOString(),
        status: "confirmed",
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
        createdAt: new Date().toISOString()
      });
      toast.success("Booking created");
    }
    // Generate and Save PDF automatically
    handleSavePDF();

    setIsAddModalOpen(false);
    setSelectedBooking(null);
    setSelectedCustomer(null);
    setSelectedCustomer(null);
    setFormData({ customer: "", email: "", phone: "", service: "", vehicle: "", vehicleYear: "", vehicleMake: "", vehicleModel: "", address: "", time: "09:00", assignedEmployee: "", bookedBy: "", notes: "", addons: [], hasReminder: false, reminderFrequency: "3" });
  };

  const handleDelete = () => {
    if (selectedBooking) {
      if (confirm("Are you sure you want to delete this booking?")) {
        remove(selectedBooking.id);
        toast.success("Booking deleted");
        setIsAddModalOpen(false);
        setSelectedBooking(null);
        setSelectedCustomer(null);
      }
    }
  };

  const handleDuplicate = (booking: Booking | null = selectedBooking) => {
    if (!booking) return;

    // Find customer data
    const customer = customers.find(c => c.name === booking.customer);

    setFormData({
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
      assignedEmployee: booking.assignedEmployee || "",
      bookedBy: booking.bookedBy || "",
      notes: booking.notes || "",
      addons: booking.addons || [],
      hasReminder: false,
      reminderFrequency: "3"
    });

    // Reset validation/selection states for "New" mode
    setSelectedBooking(null); // Ensure it's treated as new
    setSelectedCustomer(customer || null);
    setSelectedDate(new Date()); // Default to today for the new date
    setIsAddModalOpen(true);
    toast.info("Booking duplicated. Please select a new date.");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50';
      case 'confirmed': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'in_progress': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      case 'done': return 'bg-green-500/20 text-green-400 border-green-500/50';
      default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
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
            <Button variant={viewMode === 'week' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('week')} className="h-7 text-xs px-2">Week</Button>
            <Button variant={viewMode === 'month' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('month')} className="h-7 text-xs px-2">Month</Button>
            <Button variant={viewMode === 'year' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('year')} className="h-7 text-xs px-2">Year</Button>
          </div>

          <Button variant="outline" size="sm" onClick={handleToday} className="h-8">Today</Button>

          <div className="flex items-center bg-secondary/50 rounded-md border border-border h-8">
            <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8"><ChevronLeft className="h-3 w-3" /></Button>
            <span className="min-w-[80px] w-auto text-center text-xs font-semibold px-2">
              {viewMode === 'year' ? format(currentDate, "yyyy") : format(currentDate, "MMMM yyyy")}
            </span>
            <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8"><ChevronRight className="h-3 w-3" /></Button>
          </div>

          <Button className="bg-primary hover:bg-primary/90 h-8 text-xs" onClick={() => { setSelectedDate(new Date()); setIsAddModalOpen(true); }}>
            <Plus className="h-3 w-3 mr-1" /> New
          </Button>
        </div>
      </PageHeader>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Mobile Controls (visible only on small screens) */}
        <div className="flex flex-col gap-4 lg:hidden mb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
              <Button variant={viewMode === 'week' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('week')} className="h-8 text-xs px-3">Week</Button>
              <Button variant={viewMode === 'month' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('month')} className="h-8 text-xs px-3">Month</Button>
              <Button variant={viewMode === 'year' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('year')} className="h-8 text-xs px-3">Year</Button>
            </div>
            <Button className="bg-primary hover:bg-primary/90" size="sm" onClick={() => { setSelectedDate(new Date()); setIsAddModalOpen(true); }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" size="icon" onClick={handlePrev}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="font-semibold">{viewMode === 'year' ? format(currentDate, "yyyy") : format(currentDate, "MMMM yyyy")}</span>
            <Button variant="outline" size="icon" onClick={handleNext}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={handleToday}>Today</Button>
          </div>
        </div>

        {viewMode === 'week' ? (
          <div className="space-y-4">
            {eachDayOfInterval({ start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) }).map(day => {
              const bookings = getBookingsForDay(day);
              const isTodayDate = isToday(day);
              return (
                <Card key={day.toString()} className={cn("p-4 border-zinc-800 bg-zinc-900/40", isTodayDate && "border-primary/50 bg-primary/5")}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={cn("h-12 w-12 rounded-lg flex flex-col items-center justify-center border", isTodayDate ? "bg-primary text-primary-foreground border-primary" : "bg-zinc-800 border-zinc-700")}>
                      <span className="text-xs font-semibold uppercase">{format(day, "EEE")}</span>
                      <span className="text-lg font-bold">{format(day, "d")}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{format(day, "MMMM d, yyyy")}</h3>
                      <p className="text-sm text-muted-foreground">{bookings.length} Booking{bookings.length !== 1 && 's'}</p>
                    </div>
                    <div className="ml-auto">
                      <Button size="sm" variant="ghost" onClick={() => handleDayClick(day)}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {bookings.length === 0 && <p className="text-sm text-zinc-600 italic pl-16">No bookings scheduled.</p>}
                    {bookings.map(booking => (
                      <div key={booking.id}
                        onClick={(e) => handleBookingClick(e, booking)}
                        className={cn("flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-zinc-800/50 transition-all", getStatusColor(booking.status))}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-16 text-center text-xs font-mono">{format(parseISO(booking.date), "HH:mm")}</div>
                          <div>
                            <div className="font-semibold">{booking.customer}</div>
                            <div className="text-sm opacity-80">{booking.title} • {booking.vehicle}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {booking.hasReminder && <Bell className="h-4 w-4 text-yellow-500 animate-pulse" />}
                          {booking.assignedEmployee && <Badge variant="secondary" className="text-xs">{booking.assignedEmployee}</Badge>}
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); handleStartJob(); }}><Wrench className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); handleDuplicate(booking); }}><Copy className="h-4 w-4" /></Button>
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
                        "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                        isTodayDate ? "bg-primary text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                      )}>
                        {format(day, "d")}
                      </span>
                      {bookings.length > 0 && (
                        <span className="text-[10px] text-muted-foreground font-mono">{bookings.length}</span>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[100px] custom-scrollbar">
                      {bookings.map(booking => (
                        <div
                          key={booking.id}
                          onClick={(e) => handleBookingClick(e, booking)}
                          className={cn(
                            "text-xs px-2 py-1.5 rounded border truncate transition-all hover:scale-[1.02] shadow-sm",
                            getStatusColor(booking.status)
                          )}
                        >
                          <div className="flex items-center gap-1">
                            <span className="font-mono opacity-70 text-[10px]">{format(parseISO(booking.date), "HH:mm")}</span>
                            <span className="font-semibold truncate">{booking.customer}</span>
                          </div>
                          <div className="truncate opacity-80 text-[10px]">{booking.title}</div>
                          {booking.vehicleYear && booking.vehicleMake && (
                            <div className="truncate opacity-70 text-[9px]">
                              {booking.vehicleYear} {booking.vehicleMake} {booking.vehicleModel}
                            </div>
                          )}
                          {booking.assignedEmployee && (
                            <div className="truncate opacity-70 text-[9px]">
                              👤 {booking.assignedEmployee}
                            </div>
                          )}
                          {booking.hasReminder && (
                            <div
                              className="absolute top-0.5 right-1 cursor-pointer hover:scale-110 z-10 p-0.5"
                              onClick={(e) => handleBellClick(e, booking)}
                              title="View/Edit Reminder in Analytics"
                            >
                              <Bell className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500/20" />
                            </div>
                          )}
                        </div>
                      ))}
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
          <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto bg-zinc-950 border-zinc-800 p-4 sm:p-6">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  {selectedBooking ? 'Edit Booking' : 'New Booking'}
                </DialogTitle>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Date:</label>
                  <Input
                    type="date"
                    className="w-40 h-8 bg-zinc-900 border-zinc-800"
                    value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")}
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

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm font-medium text-gray-400">Time</label>
                <div className="col-span-3 relative">
                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="time"
                    className="pl-9 bg-zinc-900 border-zinc-800 text-gray-300"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm font-medium text-gray-400">Customer</label>
                <div className="col-span-3 relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 z-10" />
                  <select
                    className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-9 py-2 text-sm text-gray-300 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={formData.customer}
                    onChange={(e) => {
                      const custName = e.target.value;
                      setFormData({ ...formData, customer: custName });

                      // Find and set customer data
                      const cust = customers.find(c => c.name === custName);
                      // console.log('Selected customer:', cust); // Debug log
                      if (cust) {
                        setSelectedCustomer(cust);
                        setFormData(prev => ({
                          ...prev,
                          customer: cust.name,
                          email: cust.email || prev.email || "",
                          phone: cust.phone || prev.phone || "",
                          address: cust.address || prev.address,
                          vehicleYear: cust.year || prev.vehicleYear,
                          vehicleMake: cust.vehicle || prev.vehicleMake,
                          vehicleModel: cust.model || prev.vehicleModel
                        }));
                        // console.log('Auto-filled data:', { address: cust.address, year: cust.year, make: cust.vehicle, model: cust.model }); // Debug
                      }
                    }}
                  >
                    <option value="" className="text-gray-400">Select customer or type below...</option>
                    {customers.map((cust) => (
                      <option key={cust.id} value={cust.name} className="text-gray-300">
                        {cust.name}
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
                <div className="col-span-3 space-y-2">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="123 Main St, City, State"
                      className="pl-9 bg-zinc-900 border-zinc-800 text-gray-300 placeholder:text-gray-500"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  {formData.address && (
                    <div className="w-full h-48 rounded-md overflow-hidden border border-zinc-800">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(formData.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                        frameBorder="0"
                        scrolling="no"
                        title="Location Map"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm font-medium text-gray-400">Service</label>
                <div className="col-span-3 flex gap-2">
                  <div className="relative flex-1">
                    <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 z-10" />
                    <select
                      className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-9 py-2 text-sm text-gray-300 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                        <Button variant="outline" role="combobox" className="w-full justify-between bg-zinc-900 border-zinc-800 text-gray-300 h-10 px-3 font-normal">
                          <span className="truncate">
                            {formData.addons.length > 0
                              ? `${formData.addons.length} Addon${formData.addons.length > 1 ? 's' : ''}`
                              : "Addons..."}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrinking-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0 bg-zinc-950 border-zinc-800">
                        <Command>
                          <CommandInput placeholder="Search addons..." className="h-9" />
                          <CommandEmpty>No addon found.</CommandEmpty>
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
                                className="text-gray-300 cursor-pointer hover:bg-zinc-900"
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

              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm font-medium text-gray-400">Vehicle Type</label>
                <div className="col-span-3 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Car className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="e.g. SUV, Sedan, Truck"
                        className="pl-9 bg-zinc-900 border-zinc-800 text-gray-300 placeholder:text-gray-500"
                        value={formData.vehicle}
                        onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-blue-600 text-blue-600 hover:bg-blue-600/10"
                      onClick={() => setVehicleClassModalOpen(true)}
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
                    className="bg-zinc-900 border-zinc-800 text-gray-300 placeholder:text-gray-500"
                    value={formData.vehicleYear}
                    onChange={(e) => setFormData({ ...formData, vehicleYear: e.target.value })}
                  />
                  <Input
                    placeholder="Make"
                    className="bg-zinc-900 border-zinc-800 text-gray-300 placeholder:text-gray-500"
                    value={formData.vehicleMake}
                    onChange={(e) => setFormData({ ...formData, vehicleMake: e.target.value })}
                  />
                  <Input
                    placeholder="Model"
                    className="bg-zinc-900 border-zinc-800 text-gray-300 placeholder:text-gray-500"
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
                    className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-9 py-2 text-sm text-gray-300 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={formData.assignedEmployee}
                    onChange={(e) => setFormData({ ...formData, assignedEmployee: e.target.value })}
                  >
                    <option value="" className="text-gray-400">Unassigned</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.name} className="text-gray-300">
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
                    className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-9 py-2 text-sm text-gray-300 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={formData.bookedBy}
                    onChange={(e) => setFormData({ ...formData, bookedBy: e.target.value })}
                  >
                    <option value="" className="text-gray-400">Unknown</option>
                    {employees.map((emp) => (
                      <option key={emp.id || emp.email} value={emp.name} className="text-gray-300">
                        {emp.name} ({emp.role})
                      </option>
                    ))}
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
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">Save Booking</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <VehicleSelectorModal
          open={vehicleClassModalOpen}
          onOpenChange={setVehicleClassModalOpen}
          onSelect={handleVehicleSelect}
        />



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

                if (!showArchived) {
                  customerBookings = customerBookings.filter(b => !b.isArchived);
                }

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
                                  className="p-2 rounded border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 transition-colors cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBookingClick(e as any, booking);
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
                                      className={cn("text-xs", getStatusColor(booking.status))}
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
                                      className={cn("h-6 text-xs gap-1 ml-2", booking.isArchived ? "text-yellow-500 hover:text-yellow-400" : "text-zinc-500 hover:text-zinc-300")}
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
    </div >
  );
}
