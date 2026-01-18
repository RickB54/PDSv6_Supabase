import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarDays, Circle, Plus, User, Mail, Phone, MapPin, Car, Clock, CreditCard, Package, Info, CheckCircle2, AlertCircle, Trash2, Edit, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { markViewed } from "@/lib/viewTracker";
import { useBookingsStore, Booking, BookingStatus } from "@/store/bookings";
import { getCurrentUser } from "@/lib/auth";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isSameDay, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, isSameMonth } from "date-fns";
import { cn, formatETDate, formatETTime } from "@/lib/utils";
import jsPDF from "jspdf";
import { toast } from "sonner";

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function formatDate(d: Date) { return d.toISOString().split('T')[0]; }

export default function Bookings() {
  const { items, add, update, remove, refresh: refreshBookings } = useBookingsStore();
  const [viewDate, setViewDate] = useState(new Date());
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const [timeRange, setTimeRange] = useState<'all' | 'day' | 'week' | 'month' | 'custom'>('all');
  const [customStart, setCustomStart] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const user = getCurrentUser();

  useEffect(() => {
    refreshBookings();
  }, [refreshBookings]);
  const canEdit = user?.role === 'admin';
  const [previewBooking, setPreviewBooking] = useState<Booking | null>(null);

  useEffect(() => {
    refreshBookings();
    const interval = setInterval(refreshBookings, 5000); // Auto refresh for real-time visibility
    return () => clearInterval(interval);
  }, [refreshBookings]);

  const start = startOfMonth(viewDate);
  const end = endOfMonth(viewDate);
  const days = Array.from({ length: end.getDate() }, (_, i) => new Date(viewDate.getFullYear(), viewDate.getMonth(), i + 1));

  const filtered = useMemo(() => {
    let result = items.filter(b => b.status !== 'blocked'); // Only real bookings

    // Status Filter
    if (filter !== "all") {
      result = result.filter(b => b.status === filter);
    }

    // Time Range Filter
    const now = new Date();
    if (timeRange === 'day') {
      result = result.filter(b => isSameDay(parseISO(b.date), now));
    } else if (timeRange === 'week') {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const end = endOfWeek(now, { weekStartsOn: 1 });
      result = result.filter(b => {
        const d = parseISO(b.date);
        return d >= start && d <= end;
      });
    } else if (timeRange === 'month') {
      result = result.filter(b => isSameMonth(parseISO(b.date), now));
    } else if (timeRange === 'custom') {
      try {
        const start = startOfDay(new Date(customStart + 'T00:00:00'));
        const end = endOfDay(new Date(customEnd + 'T23:59:59'));
        result = result.filter(b => {
          const d = parseISO(b.date);
          return d >= start && d <= end;
        });
      } catch (e) {
        console.error("Invalid custom date range", e);
      }
    }

    // Sort: most recent at top
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [items, filter, timeRange, customStart, customEnd]);

  const onDrop = (e: React.DragEvent<HTMLDivElement>, day: Date) => {
    const id = e.dataTransfer.getData("bookingId");
    const booking = items.find(b => b.id === id);
    if (booking) update(id, { date: formatDate(day) });
  };

  const statusColor = (b: Booking) => {
    switch (b.status) {
      case 'tentative': return "bg-yellow-500 text-white border-yellow-600 shadow-sm font-bold";
      case 'pending': return "bg-amber-500 text-white border-amber-600 font-medium";
      case 'confirmed': return "bg-red-600 text-white border-red-700 shadow-sm font-bold";
      case 'in_progress': return "bg-blue-600 text-white border-blue-700 font-medium";
      case 'done': return "bg-green-600 text-white border-green-700 font-medium";
      default: return "bg-zinc-100 text-zinc-800 border-zinc-200";
    }
  };

  const statusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'tentative': return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white border-none">Tentative</Badge>;
      case 'pending': return <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none">Pending</Badge>;
      case 'confirmed': return <Badge className="bg-red-600 hover:bg-red-700 text-white border-none">Confirmed</Badge>;
      case 'in_progress': return <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-none">In Progress</Badge>;
      case 'done': return <Badge className="bg-green-600 hover:bg-green-700 text-white border-none">Done</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
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
      if (y > pageHeight - 65) {
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
      if (b.status === 'tentative') statusColor = [234, 179, 8]; // Amber

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

  const handleDeleteTestBookings = async () => {
    const testBookings = items.filter(b =>
      b.notes?.includes('Test booking - can be deleted') ||
      b.notes?.includes('[MOCK_DATA]') ||
      b.customer === 'Test Admin'
    );

    if (testBookings.length === 0) {
      toast.error('No test bookings found to delete');
      return;
    }

    if (!window.confirm(`Delete ${testBookings.length} mock booking(s)?`)) return;

    try {
      for (const booking of testBookings) {
        await remove(booking.id);
      }
      toast.success(`✅ Deleted ${testBookings.length} mock booking(s)`);
    } catch (error) {
      toast.error('Failed to delete mock bookings');
    }
  };

  return (
    <div>
      <PageHeader title="Bookings" />
      <div className="p-4 space-y-6">
        <Card className="p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-yellow-500" />
              <h2 className="text-lg font-semibold">Calendar</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}>Prev</Button>
              <Button variant="outline" onClick={() => setViewDate(new Date())}>Today</Button>
              <Button variant="outline" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}>Next</Button>
              <select className="border border-border rounded p-2 text-sm bg-popover text-foreground" value={filter} onChange={e => setFilter(e.target.value as any)}>
                <option value="all">All Statuses</option>
                <option value="tentative">Tentative (New)</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={handlePrintFullSchedule} className="h-9 w-9" title="Print All Bookings">
                    <Printer className="h-4 w-4" />
                  </Button>
                  {window.location.hostname === 'localhost' && (
                    <Button variant="outline" size="icon" onClick={handleDeleteTestBookings} className="h-9 w-9 text-red-500 border-red-500/30 hover:bg-red-500/10" title="Delete All Mock Data">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button asChild className="bg-gradient-hero">
                    <Link to="/book">
                      <Plus className="h-4 w-4 mr-2" /> New Booking
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Month grid with drag-to-reschedule */}
        <Card className="p-2">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            {days.map(day => {
              const dayStr = formatDate(day);
              // Handle full ISO timestamps properly
              const dayBookings = filtered.filter(b => b.date && isSameDay(parseISO(b.date), day));
              return (
                <div key={dayStr}
                  onDragOver={(e) => canEdit && e.preventDefault()}
                  onDrop={(e) => canEdit ? onDrop(e, day) : undefined}
                  className="border border-border rounded min-h-[110px] p-2">
                  <div className="text-xs font-semibold text-muted-foreground">{day.getDate()}</div>
                  <div className="space-y-1 mt-1">
                    {dayBookings.map(b => (
                      <div key={b.id}
                        draggable={canEdit}
                        onDragStart={(e) => canEdit && e.dataTransfer.setData("bookingId", b.id)}
                        onClick={() => markViewed("booking", b.id)}
                        className={`text-[10px] rounded px-1.5 py-0.5 shadow-sm font-medium ${canEdit ? 'cursor-move' : 'cursor-default'} ${statusColor(b)}`}>
                        <div className="flex justify-between items-center gap-1">
                          <span className="truncate">{b.customer || b.title}</span>
                          {(b.status === 'pending' || b.status === 'tentative') && canEdit && (
                            <button
                              onClick={(e) => { e.stopPropagation(); update(b.id, { status: 'confirmed' }); }}
                              className="bg-white/50 hover:bg-white px-1 rounded text-[10px] font-bold text-cyan-900"
                            >
                              OK
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Real Bookings List View (Accordion) */}
        <Card className="p-6 border-zinc-800 bg-zinc-950/50 backdrop-blur-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 pt-6 border-t border-zinc-800/50">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/20">
                <Package className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Real Bookings</h3>
                <p className="text-sm text-zinc-500 font-medium">Manage online and manual bookings only</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 p-2 bg-zinc-900/80 rounded-2xl border border-zinc-800/80 shadow-2xl backdrop-blur-md">
              <div className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-500 mr-2 ml-3">Filter History</div>
              <Button variant={timeRange === 'all' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTimeRange('all')} className={cn("h-8 text-[11px] px-4 font-bold rounded-lg transition-all", timeRange === 'all' ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/20" : "text-zinc-400")}>ALL</Button>
              <Button variant={timeRange === 'day' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTimeRange('day')} className={cn("h-8 text-[11px] px-4 font-bold rounded-lg transition-all", timeRange === 'day' ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/20" : "text-zinc-400")}>TODAY</Button>
              <Button variant={timeRange === 'week' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTimeRange('week')} className={cn("h-8 text-[11px] px-4 font-bold rounded-lg transition-all", timeRange === 'week' ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/20" : "text-zinc-400")}>WEEK</Button>
              <Button variant={timeRange === 'month' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTimeRange('month')} className={cn("h-8 text-[11px] px-4 font-bold rounded-lg transition-all", timeRange === 'month' ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/20" : "text-zinc-400")}>MONTH</Button>
              <Button variant={timeRange === 'custom' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTimeRange('custom')} className={cn("h-8 text-[11px] px-4 font-bold rounded-lg transition-all", timeRange === 'custom' ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/20" : "text-zinc-400")}>CUSTOM RANGE</Button>

              {timeRange === 'custom' && (
                <div className="flex items-center gap-2 ml-2 pl-2 border-l border-zinc-800 animate-in fade-in slide-in-from-right-4 duration-300">
                  <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="h-8 w-36 text-[11px] bg-zinc-950 border-zinc-800 text-white font-bold rounded-lg" />
                  <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest px-1">To</span>
                  <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="h-8 w-36 text-[11px] bg-zinc-950 border-zinc-800 text-white font-bold rounded-lg" />
                </div>
              )}
            </div>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {filtered.map(b => (
              <AccordionItem
                key={b.id}
                value={b.id}
                className="border border-zinc-800 rounded-xl bg-zinc-900/40 px-4 overflow-hidden transition-all hover:bg-zinc-900/60 data-[state=open]:border-zinc-700 data-[state=open]:bg-zinc-900/80"
              >
                <AccordionTrigger
                  className="hover:no-underline py-4"
                  onClick={() => markViewed("booking", b.id)}
                >
                  <div className="flex flex-1 items-center justify-between text-left mr-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${b.status === 'confirmed' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : b.status === 'tentative' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]' : b.status === 'done' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'}`} />
                      <div className="flex flex-col">
                        <span className="font-black text-white text-lg tracking-tight leading-none mb-1">{b.customer || 'Unknown Customer'}</span>
                        <span className="text-xs text-zinc-400 flex items-center gap-2">
                          <Clock className="w-3 h-3 text-red-500" />
                          {formatETDate(b.date)} @ {formatETTime(b.date)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="hidden md:flex flex-col items-end mr-4">
                        <span className="text-sm font-bold text-zinc-200">{b.title}</span>
                        <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">{b.bookedBy || 'Direct'}</span>
                      </div>
                      {statusBadge(b.status)}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-zinc-300">
                    {/* Customer & Contact */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Customer Info</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <User className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm font-bold text-white">{b.customer}</span>
                        </div>
                        {b.customerEmail && (
                          <div className="flex items-center gap-3">
                            <Mail className="w-4 h-4 text-zinc-500" />
                            <a href={`mailto:${b.customerEmail}`} className="text-sm text-blue-400 hover:underline">{b.customerEmail}</a>
                          </div>
                        )}
                        {b.customerPhone && (
                          <div className="flex items-center gap-3">
                            <Phone className="w-4 h-4 text-zinc-500" />
                            <a href={`tel:${b.customerPhone}`} className="text-sm text-blue-400 hover:underline">{b.customerPhone}</a>
                          </div>
                        )}
                        {b.address && (
                          <div className="flex items-start gap-3">
                            <MapPin className="w-4 h-4 text-zinc-500 mt-0.5" />
                            <span className="text-sm leading-relaxed">{b.address}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <Info className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm text-zinc-400 italic">Booked By: {b.bookedBy || 'Internal'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle & Service */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Vehicle & Service</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Car className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm font-bold text-white">
                            {b.vehicleYear} {b.vehicleMake} {b.vehicleModel}
                            <span className="ml-2 text-zinc-500 font-normal">({b.vehicle})</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Package className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm">{b.title}</span>
                        </div>
                        {b.addons && b.addons.length > 0 && (
                          <div className="flex items-start gap-3">
                            <Plus className="w-4 h-4 text-zinc-500 mt-0.5" />
                            <div className="flex flex-wrap gap-1">
                              {b.addons.map((a, i) => (
                                <Badge key={i} variant="secondary" className="bg-zinc-800 text-[10px] py-0">{a}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Status & Financials</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm font-bold text-green-400">
                            {b.price ? `$${b.price.toLocaleString()}` : 'Price not set'}
                          </span>
                        </div>
                        {b.assignedEmployee && (
                          <div className="flex items-center gap-3">
                            <User className="w-4 h-4 text-zinc-500" />
                            <span className="text-sm">Assigned: <span className="text-white font-medium">{b.assignedEmployee}</span></span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 pt-2">
                          {(b.status === 'pending' || b.status === 'tentative') && canEdit && (
                            <Button
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 text-white font-bold h-8"
                              onClick={(e) => { e.stopPropagation(); update(b.id, { status: 'confirmed' }); }}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              {b.bookedBy === 'Customer Web' ? "Approve" : "Confirm"}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-zinc-700 hover:bg-zinc-800 text-zinc-300 gap-1"
                            onClick={(e) => { e.stopPropagation(); setPreviewBooking(b); }}
                          >
                            <Mail className="w-3.5 h-3.5" /> Preview Email
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 text-zinc-500 hover:text-white" onClick={() => remove(b.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Notes (Full Width) */}
                    {b.notes && (
                      <div className="col-span-1 md:col-span-2 lg:col-span-3 pt-4 border-t border-zinc-800">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Internal Notes</h4>
                        <p className="text-sm text-zinc-400 leading-relaxed italic bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                          "{b.notes}"
                        </p>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {[...items].filter(b => b.status !== 'blocked').length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-xl">
              <AlertCircle className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500 font-bold uppercase tracking-widest">No real bookings found</p>
            </div>
          )}
        </Card>
      </div >

      {/* Email Preview Dialog (Shared) */}
      < Dialog open={!!previewBooking
      } onOpenChange={(open) => !open && setPreviewBooking(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white border-zinc-200 p-0 text-black">
          <DialogHeader className="p-4 bg-zinc-100 border-b border-zinc-200 sticky top-0 z-10">
            <DialogTitle className="text-zinc-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                Customer Email Preview
              </div>
              <Badge variant="outline" className={cn("ml-2 capitalize", previewBooking?.status === 'confirmed' ? "border-green-500 text-green-700" : "border-amber-500 text-amber-700")}>
                {previewBooking?.status === 'confirmed' ? 'Confirmed Layout' : 'Request Layout'}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {previewBooking && (
            <div className="p-6 bg-zinc-50 min-h-[400px]">
              <div className="max-w-[600px] mx-auto bg-white shadow-xl rounded-xl border border-zinc-200 overflow-hidden text-left">
                {/* Email Header */}
                <div className="bg-gradient-to-r from-blue-800 to-blue-600 p-8 text-center text-white">
                  <div className="text-4xl mb-3">🚗</div>
                  <h1 className="m-0 text-2xl font-extrabold uppercase tracking-tight">
                    {previewBooking.status === 'confirmed' || previewBooking.status === 'done' ? 'Booking Confirmed!' : 'Booking Request Received'}
                  </h1>
                  <p className="m-0 mt-2 text-sm opacity-90 italic">
                    {previewBooking.status === 'confirmed' || previewBooking.status === 'done'
                      ? "We've officially set your appointment."
                      : "We've received your request and will contact you shortly."}
                  </p>
                </div>

                {/* Email Body */}
                <div className="p-8">
                  <p className="mt-0 text-lg">Hi <strong>{previewBooking.customer || 'Customer'}</strong>,</p>
                  <p className="text-zinc-600 leading-relaxed">
                    {previewBooking.status === 'confirmed' || previewBooking.status === 'done'
                      ? `Great news! Your booking for ${previewBooking.title || 'Service Package'} has been confirmed. Our team is excited to service your vehicle and provide a premium experience.`
                      : `We have received your request for ${previewBooking.title || 'Service Package'}. Our team is reviewing the schedule to ensure we can provide you with the best experience.`}
                  </p>

                  {/* Info Box */}
                  <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-6 my-6">
                    <h3 className="mt-0 mb-4 text-xs font-bold uppercase tracking-widest text-zinc-400">Appointment Details</h3>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-400 w-5 text-center">📅</span>
                        <span className="text-zinc-800 font-semibold">
                          {formatETDate(previewBooking.date)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-zinc-400 w-5 text-center">⏰</span>
                        <span className="text-zinc-800 font-semibold">
                          {formatETTime(previewBooking.date)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-zinc-400 w-5 text-center">🔧</span>
                        <span className="text-zinc-800 font-semibold">{previewBooking.title || "Unnamed Package"}</span>
                      </div>

                      {(previewBooking.vehicleYear || previewBooking.vehicleMake) && (
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-400 w-5 text-center">🚙</span>
                          <span className="text-zinc-800 font-semibold">
                            {previewBooking.vehicleYear} {previewBooking.vehicleMake} {previewBooking.vehicleModel}
                          </span>
                        </div>
                      )}

                      <div className="pt-4 border-t border-dashed border-zinc-200 mt-4 flex justify-between items-center">
                        <span className="text-zinc-500 font-medium">Total Estimate:</span>
                        <span className="text-emerald-600 text-2xl font-black">
                          ${previewBooking.price ? previewBooking.price.toLocaleString() : '0.00'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Dependent Note */}
                  {previewBooking.status !== 'confirmed' && previewBooking.status !== 'done' ? (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                      <p className="m-0 text-sm text-blue-800 leading-relaxed">
                        <strong>Note:</strong> We have received your request. A representative will review the details and contact you within <strong>24 hours</strong> to confirm your appointment.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-6">
                      <p className="m-0 text-sm text-amber-800 leading-relaxed">
                        <strong>Important:</strong> If you need to change or cancel, please let us know at least 24 hours in advance.
                      </p>
                    </div>
                  )}

                  <p className="text-zinc-600 mb-8">We look forward to seeing you soon!</p>

                  <div className="text-center pt-8 border-t border-zinc-100">
                    <p className="m-0 font-bold text-zinc-900">Prime Auto Detail</p>
                    <p className="m-0 mt-1 text-zinc-500 text-sm">Professional Detailing Solutions</p>
                  </div>
                </div>

                {/* Email Footer */}
                <div className="bg-zinc-50 p-6 text-center border-t border-zinc-200">
                  <p className="m-0 text-zinc-400 text-xs">&copy; {new Date().getFullYear()} Prime Auto Detail. All rights reserved.</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="p-4 bg-zinc-50 border-t border-zinc-200">
            <Button onClick={() => setPreviewBooking(null)} className="bg-zinc-900 text-white">Close Preview</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >
    </div >
  );
}
