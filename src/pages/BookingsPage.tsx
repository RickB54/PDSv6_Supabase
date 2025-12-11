import React, { useState, useMemo, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
  isToday,
  addHours
} from "date-fns";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, User, Car, Search, X, MapPin, Users, ChevronDown, Mail, Phone, MapPinIcon, Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { useBookingsStore, type Booking } from "@/store/bookings";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api from "@/lib/api";
import { servicePackages, addOns } from "@/lib/services";
import { getCustomPackages, getCustomAddOns } from "@/lib/servicesMeta";
import { useLocation } from "react-router-dom";
import localforage from "localforage";
import { upsertCustomer } from "@/lib/db";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import jsPDF from "jspdf";
import { savePDFToArchive } from "@/lib/pdfArchive";

// --- Types ---
type ViewMode = "day" | "week" | "month" | "year";

// --- Components ---

export default function BookingsPage() {
  const { items, add, update, remove, refresh } = useBookingsStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
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
    notes: "",
    addons: [] as string[]
  });

  const [employees, setEmployees] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState<string | null>(null);


  const allServices = useMemo(() => [...servicePackages, ...getCustomPackages()], []);
  const allAddons = useMemo(() => [...addOns, ...getCustomAddOns()], []);

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const emps = (await localforage.getItem<any[]>('company-employees')) || [];
        setEmployees(emps);
      } catch (err) {
        console.error('Failed to fetch employees:', err);
      }
    };
    fetchEmployees();

    // Fetch customers - Load from localforage to get complete data with addresses/vehicles
    const fetchCustomers = async () => {
      try {
        // Get customers from localforage which has complete mock data
        const custs = (await localforage.getItem<any[]>('customers')) || [];
        console.log('Loaded customers:', custs); // Debug log
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
      const d = parseISO(b.date);
      return isSameMonth(d, currentDate);
    });
  }, [items, currentDate]);

  const getBookingsForDay = (day: Date) => {
    return items.filter(b => isSameDay(parseISO(b.date), day)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Handlers
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
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
      notes: booking.notes || "",
      addons: booking.addons || []
    });
    setIsAddModalOpen(true);
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
        notes: formData.notes,
        addons: formData.addons
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
        notes: formData.notes,
        addons: formData.addons,
        createdAt: new Date().toISOString()
      });
      toast.success("Booking created");
    }
    setIsAddModalOpen(false);
    setSelectedBooking(null);
    setSelectedCustomer(null);
    setFormData({ customer: "", email: "", phone: "", service: "", vehicle: "", vehicleYear: "", vehicleMake: "", vehicleModel: "", address: "", time: "09:00", assignedEmployee: "", notes: "", addons: [] });
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
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Booking Calendar</h1>
          <p className="text-muted-foreground">Manage appointments and schedule services</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleToday}>Today</Button>
          <div className="flex items-center bg-secondary/50 rounded-md border border-border">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="w-32 text-center font-semibold">{format(currentDate, "MMMM yyyy")}</span>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => { setSelectedDate(new Date()); setIsAddModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New Booking
          </Button>
        </div>
      </div>

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

      {/* Booking Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={(open) => { if (!open) { setSelectedBooking(null); setSelectedCustomer(null); } setIsAddModalOpen(open); }}>
        <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-zinc-800">
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
                    try {
                      if (e.target.value) {
                        const newDate = new Date(e.target.value + 'T00:00:00');
                        if (!isNaN(newDate.getTime())) {
                          setSelectedDate(newDate);
                        }
                      }
                    } catch (err) {
                      console.error('Date parse error:', err);
                      toast.error('Invalid date selected');
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
                    console.log('Selected customer:', cust); // Debug log
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
                      console.log('Auto-filled data:', { address: cust.address, year: cust.year, make: cust.vehicle, model: cust.model }); // Debug
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
          </div>

          <DialogFooter className="flex justify-between sm:justify-between gap-2">
            {selectedBooking ? (
              <Button variant="destructive" onClick={handleDelete} className="bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-900">
                Delete Booking
              </Button>
            ) : <div></div>}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={handleSavePDF} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200">
                Save PDF
              </Button>
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">Save Booking</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vehicle Classification Quick Selector Modal */}
      <Dialog open={vehicleClassModalOpen} onOpenChange={setVehicleClassModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-zinc-950 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Vehicle Classification</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-sm text-muted-foreground">Select the vehicle type to auto-fill pricing and service details:</p>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-1 hover:bg-blue-600/10 hover:border-blue-600"
                onClick={() => {
                  setFormData(prev => ({ ...prev, vehicle: prev.vehicle || 'Compact Sedan' }));
                  setVehicleClassModalOpen(false);
                  toast.success('Vehicle class: Compact/Sedan');
                }}
              >
                <Car className="h-5 w-5" />
                <span className="font-semibold">Compact/Sedan</span>
                <span className="text-xs text-muted-foreground">Small cars</span>
              </Button>

              <Button
                variant="outline"
                className="h-20 flex flex-col gap-1 hover:bg-blue-600/10 hover:border-blue-600"
                onClick={() => {
                  setFormData(prev => ({ ...prev, vehicle: prev.vehicle || 'Mid-Size SUV' }));
                  setVehicleClassModalOpen(false);
                  toast.success('Vehicle class: Mid-Size/SUV');
                }}
              >
                <Car className="h-5 w-5" />
                <span className="font-semibold">Mid-Size/SUV</span>
                <span className="text-xs text-muted-foreground">Medium vehicles</span>
              </Button>

              <Button
                variant="outline"
                className="h-20 flex flex-col gap-1 hover:bg-blue-600/10 hover:border-blue-600"
                onClick={() => {
                  setFormData(prev => ({ ...prev, vehicle: prev.vehicle || 'Truck/Van' }));
                  setVehicleClassModalOpen(false);
                  toast.success('Vehicle class: Truck/Van');
                }}
              >
                <Car className="h-5 w-5" />
                <span className="font-semibold">Truck/Van</span>
                <span className="text-xs text-muted-foreground">Large vehicles</span>
              </Button>

              <Button
                variant="outline"
                className="h-20 flex flex-col gap-1 hover:bg-blue-600/10 hover:border-blue-600"
                onClick={() => {
                  setFormData(prev => ({ ...prev, vehicle: prev.vehicle || 'Luxury/High-End' }));
                  setVehicleClassModalOpen(false);
                  toast.success('Vehicle class: Luxury/High-End');
                }}
              >
                <Car className="h-5 w-5" />
                <span className="font-semibold">Luxury/High-End</span>
                <span className="text-xs text-muted-foreground">Premium vehicles</span>
              </Button>
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  // Link to full Vehicle Classification page if needed
                  window.open('/vehicle-classification', '_blank');
                }}
              >
                Open Full Vehicle Classification Page →
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVehicleClassModalOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking History Section */}
      <Card className="mt-6 p-6 bg-zinc-950/50 border-zinc-800">
        <h2 className="text-2xl font-bold mb-4">Booking History</h2>
        <p className="text-sm text-muted-foreground mb-4">
          View all customers with bookings and their complete information
        </p>

        <div className="space-y-2">
          {(() => {
            // Get unique customers from all bookings
            const uniqueCustomers = Array.from(
              new Set(items.map(b => b.customer))
            ).map(customerName => {
              // Find all bookings for this customer
              const customerBookings = items.filter(b => b.customer === customerName);
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
            });

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
                                {booking.assignedEmployee && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    👤 {booking.assignedEmployee}
                                  </div>
                                )}
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
      </Card>
    </div >
  );
}
