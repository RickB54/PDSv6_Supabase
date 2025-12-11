import React, { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMinutes,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  setHours,
  setMinutes,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import CustomerModal, { type Customer } from "@/components/customers/CustomerModal";
import api from "@/lib/api";
import { useBookingsStore, type Booking } from "@/store/bookings";
import { getCurrentUser } from "@/lib/auth";

type ViewMode = "week" | "month";

type BookingTime = {
  start: string; // ISO with time
  durationMinutes: number; // default 60
  techId?: string;
};

const HOURS_START = 7; // 7 AM
const HOURS_END = 20; // Keep original slots through 8 PM; ensure 7 PM line shows
const SLOT_MINUTES = 30;

type Tech = { id: string; name: string; initials: string };
// Remove mock techs; default to empty so only real employees or self show
const DEFAULT_TECHS: Tech[] = [];

// LocalStorage helpers
function loadBookingTimes(): Record<string, BookingTime> {
  try {
    const raw = localStorage.getItem("bookingTimes");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveBookingTimes(map: Record<string, BookingTime>) {
  localStorage.setItem("bookingTimes", JSON.stringify(map));
}
function loadRequestFlags(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem("bookingRequestFlags");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveRequestFlags(map: Record<string, boolean>) {
  localStorage.setItem("bookingRequestFlags", JSON.stringify(map));
}

function statusClasses(status: Booking["status"]) {
  switch (status) {
    case "pending":
      return "bg-red-500 text-white";
    case "confirmed":
      return "bg-red-700 text-white";
    case "in_progress":
      return "bg-red-600 text-white animate-pulse";
    case "done":
      return "bg-zinc-900 text-gray-500";
    default:
      return "bg-red-500 text-white";
  }
}

export default function BookingsPage() {
  const { items, add, update, remove } = useBookingsStore();
  const refresh = useBookingsStore((s) => s.refresh);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [monthDate, setMonthDate] = useState<Date>(new Date());
  const [bookingTimes, setBookingTimes] = useState<Record<string, BookingTime>>(() => loadBookingTimes());
  const [requestFlags, setRequestFlags] = useState<Record<string, boolean>>(() => loadRequestFlags());
  const [inlineForm, setInlineForm] = useState<null | { start: Date; techId?: string }>(null);
  const [formCustomer, setFormCustomer] = useState("");
  const [formService, setFormService] = useState("");
  const [formVehicle, setFormVehicle] = useState("");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [newPdfsToday, setNewPdfsToday] = useState<number>(0);
  const [now, setNow] = useState<number>(() => Date.now());
  const [knownIds, setKnownIds] = useState<Set<string>>(() => new Set((Array.isArray(items) ? items : []).map(i => i.id)));

  const user = getCurrentUser();
  const isAdmin = user?.role === "admin";
  const isEmployee = user?.role === "employee";

  const techSelf: Tech | null = isEmployee
    ? { id: `tech-${user?.email ?? "self"}`, name: user?.name ?? "Me", initials: (user?.name?.split(" ").map((n) => n[0]).join("") || "ME").slice(0, 2) }
    : null;
  const techs: Tech[] = techSelf ? [techSelf, ...DEFAULT_TECHS] : DEFAULT_TECHS;
  const [showMyOnly, setShowMyOnly] = useState<boolean>(isEmployee);

  useEffect(() => {
    saveBookingTimes(bookingTimes);
  }, [bookingTimes]);

  useEffect(() => {
    saveRequestFlags(requestFlags);
  }, [requestFlags]);

  // Heartbeat to re-evaluate NEW badge window
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Count today's new booking PDFs for badge on Bookings page
  useEffect(() => {
    try {
      const records = JSON.parse(localStorage.getItem('pdfArchive') || '[]');
      const today = new Date().toDateString();
      const count = (Array.isArray(records) ? records : []).filter((r: any) => {
        if (r.recordType !== 'Bookings') return false;
        const ts = new Date(r.timestamp);
        return ts.toDateString() === today;
      }).length;
      setNewPdfsToday(count);
    } catch {}
  }, [items]);

  // Listen for employee booking requests and notify admin instantly
  useEffect(() => {
    function onRequested(ev: any) {
      if (!isAdmin) return;
      const payload = ev?.detail as { when: string; service: string; customer: string; employee: string };
      if (!payload) return;
      toast.error(`${payload.employee} requested ${payload.when} ${payload.service} – ${payload.customer}`, {
        description: "Employee Request",
      });
    }
    window.addEventListener("booking-requested", onRequested as any);
    return () => window.removeEventListener("booking-requested", onRequested as any);
  }, [isAdmin]);

  // Real-time cross-tab syncing: refresh store and toast when new booking arrives
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      try {
        if (e.key === 'bookings') {
          refresh();
        }
        if (e.key === 'pdfArchive') {
          // recalc today's PDF count
          const records = JSON.parse(localStorage.getItem('pdfArchive') || '[]');
          const today = new Date().toDateString();
          const count = (Array.isArray(records) ? records : []).filter((r: any) => {
            if (r.recordType !== 'Bookings') return false;
            const ts = new Date(r.timestamp);
            return ts.toDateString() === today;
          }).length;
          setNewPdfsToday(count);
        }
        if (e.key === 'lastBookingEvent' && e.newValue) {
          const payload = JSON.parse(e.newValue);
          const { id, ts, price } = payload || {};
          // Slight delay to ensure store refresh pulls in new item
          setTimeout(() => {
            const bk = useBookingsStore.getState().items.find(i => i.id === id);
            if (!bk) return;
            if (!isAdmin) return;
            const timeStr = new Date(bk.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const amt = typeof price === 'number' ? ` $${price}` : '';
            toast.success(`NEW BOOKING!${amt} — ${bk.customer} @ ${timeStr}`, { duration: 8000 });
            try { new Audio('/sounds/cash-register.mp3').play().catch(() => {}); } catch {}
            if (typeof Notification !== 'undefined') {
              if (Notification.permission === 'granted') {
                new Notification('New Booking', { body: `${bk.customer}${amt ? ' —' + amt : ''} @ ${timeStr}`, icon: '/favicon.ico' });
              } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then((p) => { if (p === 'granted') new Notification('New Booking', { body: `${bk.customer}${amt ? ' —' + amt : ''} @ ${timeStr}`, icon: '/favicon.ico' }); });
              }
            }
          }, 250);
        }
      } catch {}
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [isAdmin, refresh]);

  // Track known IDs and detect newly added items (same-tab adds)
  useEffect(() => {
    const nextIds = new Set<string>([...knownIds]);
    let hasNew = false;
    items.forEach(i => { if (!nextIds.has(i.id)) { nextIds.add(i.id); hasNew = true; } });
    if (hasNew) setKnownIds(nextIds);
  }, [items]);

  const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)), [weekStart]);
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
    const end = addDays(endOfMonth(monthDate), 6);
    return eachDayOfInterval({ start, end: startOfWeek(end, { weekStartsOn: 1 }) });
  }, [monthDate]);

  function eventTopMinutes(date: Date) {
    const mins = date.getHours() * 60 + date.getMinutes();
    return Math.max(0, mins - HOURS_START * 60);
  }

  function startOfDayWithHour(base: Date, h: number) {
    return setHours(setMinutes(base, 0), h);
  }

  function getTime(b: Booking): BookingTime | undefined {
    return bookingTimes[b.id];
  }

  function upsertTime(id: string, next: Partial<BookingTime>) {
    const prev = bookingTimes[id] || { start: startOfDayWithHour(new Date(), 9).toISOString(), durationMinutes: 60 };
    const merged = { ...prev, ...next } as BookingTime;
    setBookingTimes((m) => ({ ...m, [id]: merged }));
  }

  function handleAddRequest(start: Date, techId?: string) {
    if (!isEmployee) return;
    const id = `req-${Date.now()}`;
    const title = formService ? formService : "New Booking";
    const customer = formCustomer || "Unknown";
    const dateIso = start.toISOString();
    const newBooking: Booking = { id, title, customer, date: dateIso, status: "pending" };
    add(newBooking);
    upsertTime(id, { start: dateIso, durationMinutes: 60, techId: techId || techSelf?.id });
    setRequestFlags((f) => ({ ...f, [id]: true }));

    const when = format(start, "p");
    const detail = { when, service: formService || "Service", customer, employee: user?.name || "Employee" };
    window.dispatchEvent(new CustomEvent("booking-requested", { detail }));
    setInlineForm(null);
    setFormCustomer("");
    setFormService("");
    setFormVehicle("");
  }

  function handleAdminCreate(start: Date, techId?: string) {
    if (!isAdmin) return;
    const id = `b-${Date.now()}`;
    const title = formService || "New Booking";
    const customer = formCustomer || "Unknown";
    const dateIso = start.toISOString();
    const newBooking: Booking = { id, title, customer, date: dateIso, status: "pending" };
    add(newBooking);
    upsertTime(id, { start: dateIso, durationMinutes: 60, techId });
    setInlineForm(null);
    setFormCustomer("");
    setFormService("");
    setFormVehicle("");
  }

  function moveEvent(id: string, nextStart: Date, nextTechId?: string) {
    const bt = bookingTimes[id];
    const duration = bt?.durationMinutes ?? 60;
    upsertTime(id, { start: nextStart.toISOString(), durationMinutes: duration, techId: nextTechId ?? bt?.techId });
  }

  function resizeEvent(id: string, minutes: number) {
    upsertTime(id, { durationMinutes: Math.max(30, minutes) });
  }

  function DayDots({ day }: { day: Date }) {
    const dayBookings = items.filter((b) => isSameDay(parseISO(b.date), day));
    const visible = dayBookings.slice(0, 8);
    const extra = Math.max(0, dayBookings.length - visible.length);
    return (
      <div className="mt-2 flex flex-wrap gap-1 relative">
        {visible.map((b) => (
          <span key={b.id} title={`${b.customer} – ${b.title}`} className={`inline-block w-2 h-2 rounded-full ${b.status === "done" ? "bg-zinc-700" : "bg-red-600"}`}></span>
        ))}
        {extra > 0 && <span className="text-xs text-zinc-400">+{extra}</span>}
      </div>
    );
  }

  function WeekView() {
    const columnsBase = showMyOnly && techSelf ? [techSelf] : techs;
    const columns = columnsBase.length > 0 ? columnsBase : [{ id: 'unassigned', name: 'Unassigned', initials: 'UA' }];
    const totalMinutes = (HOURS_END - HOURS_START) * 60;

    return (
      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
          {columns.map((col) => (
            <div key={col.id} className="border-r border-zinc-800">
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/60">
                <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-white">{col.initials}</div>
                <div className="text-sm font-semibold text-white">{col.name}</div>
              </div>
              {/* Match container height to slot count × slot height to remove extra blank space */}
              <div className="relative" style={{ height: (totalMinutes / SLOT_MINUTES) * 24 }}>
                {/* time slots */}
                {Array.from({ length: totalMinutes / SLOT_MINUTES }).map((_, idx) => {
                  const minutes = HOURS_START * 60 + idx * SLOT_MINUTES;
                  const h = Math.floor(minutes / 60);
                  const m = minutes % 60;
                  const label = format(setMinutes(setHours(weekDays[0], h), m), "p");
                  return (
                    <div
                      key={idx}
                      className="border-t border-zinc-800/60 hover:bg-zinc-900/40"
                      style={{ height: 24 }}
                      onClick={() => {
                        const base = setHours(setMinutes(weekDays[0], h), m);
                        setInlineForm({ start: base, techId: col.id });
                      }}
                    >
                      {idx % 2 === 0 && (
                        <div className="absolute -left-14 text-[10px] text-zinc-500">{label}</div>
                      )}
                    </div>
                  );
                })}
                {/* events */}
                {items
                  .filter((b) => {
                    const bt = getTime(b);
                    if (!bt) return false;
                    const d = parseISO(bt.start);
                    const matchesDay = weekDays.some((wd) => isSameDay(wd, d));
                    const matchesTech = (bt.techId || columns[0].id) === col.id;
                    return matchesDay && matchesTech;
                  })
                  .map((b) => {
                    const bt = getTime(b)!;
                    const start = parseISO(bt.start);
                    const top = (eventTopMinutes(start) / SLOT_MINUTES) * 24; // 24px per slot
                    const height = (bt.durationMinutes / SLOT_MINUTES) * 24;
                    const isRequest = !!requestFlags[b.id];
                    const faded = isEmployee && !isRequest;
                    const isNew = !!b.createdAt && (now - new Date(b.createdAt).getTime()) < 10_000;
                    return (
                      <div
                        key={b.id}
                        className={`absolute left-2 right-2 rounded-md shadow ${statusClasses(b.status)} ${faded ? "opacity-60 cursor-default" : ""} ${isNew ? 'ring-2 ring-red-500 animate-pulse' : ''}`}
                        style={{ top, height }}
                        onMouseDown={(e) => {
                          if (!isAdmin) return;
                          const startY = e.clientY;
                          const origStart = start;
                          function onMove(me: MouseEvent) {
                            const dy = me.clientY - startY;
                            const slots = Math.round(dy / 24);
                            const next = addMinutes(origStart, slots * SLOT_MINUTES);
                            moveEvent(b.id, next, col.id);
                          }
                          function onUp() {
                            window.removeEventListener("mousemove", onMove);
                            window.removeEventListener("mouseup", onUp);
                          }
                          window.addEventListener("mousemove", onMove);
                          window.addEventListener("mouseup", onUp);
                        }}
                        onDoubleClick={() => setSelected(b)}
                      >
                        <div className={`px-2 py-1 text-xs flex items-center justify-between ${isRequest ? "border-l-2 border-yellow-400" : ""}`}>
                          <span className="font-semibold">{b.customer}</span>
                          <span className="opacity-80">{b.title}</span>
                          {isRequest && (
                            <span className="ml-2 text-[10px] bg-yellow-500 text-black px-1 rounded">Employee Request</span>
                          )}
                          {isNew && (
                            <span className="ml-2 text-[10px] bg-red-600 text-white px-1 rounded">NEW</span>
                          )}
                        </div>
                        {isAdmin && (
                          <div
                            className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize"
                            onMouseDown={(e) => {
                              const startY = e.clientY;
                              const orig = bt.durationMinutes;
                              function onMove(me: MouseEvent) {
                                const dy = me.clientY - startY;
                                const slots = Math.round(dy / 24);
                                resizeEvent(b.id, Math.max(30, orig + slots * SLOT_MINUTES));
                              }
                              function onUp() {
                                window.removeEventListener("mousemove", onMove);
                                window.removeEventListener("mouseup", onUp);
                              }
                              window.addEventListener("mousemove", onMove);
                              window.addEventListener("mouseup", onUp);
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
        {inlineForm && (
          <div className="fixed bottom-6 right-6 w-96 rounded-lg border border-zinc-800 bg-black p-4 shadow-xl">
            <div className="text-sm font-semibold text-white mb-2">{isAdmin ? "Create Booking" : "New Booking Request"}</div>
            <div className="space-y-2">
              <CustomerSearchField
                value={formCustomer}
                onChange={(v) => setFormCustomer(v)}
                onAddNew={(cust) => setFormCustomer(cust.name)}
              />
              <Input placeholder="Service" value={formService} onChange={(e) => setFormService(e.target.value)} />
              <Input placeholder="Vehicle" value={formVehicle} onChange={(e) => setFormVehicle(e.target.value)} />
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="text-xs text-zinc-400">{format(inlineForm.start, "EEE p")}</div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setInlineForm(null)}>Cancel</Button>
                {isAdmin ? (
                  <Button className="bg-red-700 hover:bg-red-800" onClick={() => handleAdminCreate(inlineForm.start, inlineForm.techId)}>Create Booking</Button>
                ) : (
                  <Button className="bg-red-700 hover:bg-red-800" onClick={() => handleAddRequest(inlineForm.start, inlineForm.techId)}>Request Booking</Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function MonthView() {
    return (
  <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {monthDays.map((day, idx) => (
          <div key={idx} className={`p-2 rounded-lg border ${isSameMonth(day, monthDate) ? "border-zinc-800" : "border-zinc-900 opacity-60"}`}>
            <div className="text-xs text-zinc-400">{format(day, "d")}</div>
            <DayDots day={day} />
          </div>
        ))}
      </div>
    );
  }

  const todayList = items
    .filter((b) => isSameDay(parseISO(b.date), new Date()))
    .sort((a, b) => {
      const ta = bookingTimes[a.id]?.start || a.date;
      const tb = bookingTimes[b.id]?.start || b.date;
      return parseISO(ta).getTime() - parseISO(tb).getTime();
    });

  function StatusBadge({ b }: { b: Booking }) {
    const base = statusClasses(b.status);
    const isRequest = !!requestFlags[b.id];
    return <span className={`text-[10px] px-2 py-0.5 rounded ${base}`}>{isRequest ? "Employee Request" : b.status.replace("_", " ")}</span>;
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Bookings" />
      {newPdfsToday > 0 && (
        <div className="px-4">
          <Badge className="bg-red-600 text-white">{newPdfsToday} update{newPdfsToday === 1 ? '' : 's'} today</Badge>
        </div>
      )}

      <Card className="bg-black border-zinc-800">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <Button variant={viewMode === "week" ? "default" : "outline"} className={viewMode === "week" ? "bg-red-700 hover:bg-red-800" : ""} onClick={() => setViewMode("week")}>Week</Button>
            <Button variant={viewMode === "month" ? "default" : "outline"} className={viewMode === "month" ? "bg-red-700 hover:bg-red-800" : ""} onClick={() => setViewMode("month")}>Month</Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setWeekStart(addDays(weekStart, -7))}>Prev</Button>
            <Button variant="outline" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</Button>
            <Button variant="outline" onClick={() => setWeekStart(addDays(weekStart, 7))}>Next</Button>
            <div className="ml-4 flex items-center gap-2">
              <Button variant={showMyOnly ? "default" : "outline"} className={showMyOnly ? "bg-red-700 hover:bg-red-800" : ""} onClick={() => setShowMyOnly(true)}>My Schedule Only</Button>
              <Button variant={!showMyOnly ? "default" : "outline"} className={!showMyOnly ? "bg-red-700 hover:bg-red-800" : ""} onClick={() => setShowMyOnly(false)}>All Techs</Button>
            </div>
          </div>
        </div>
        <div className="p-3">
          {viewMode === "week" ? <WeekView /> : <MonthView />}
        </div>
      </Card>

      {/* Pending module moved up under buttons for clarity */}
      <Card className="bg-black border-zinc-800">
        <div className="p-3 text-sm font-semibold text-white">Pending</div>
        <div className="px-3 pb-3">
          <div className="divide-y divide-zinc-800">
            {items
              .filter((b) => b.status === "pending")
              .sort((a, b) => {
                const ta = bookingTimes[a.id]?.start || a.date;
                const tb = bookingTimes[b.id]?.start || b.date;
                return parseISO(ta).getTime() - parseISO(tb).getTime();
              })
              .map((b) => {
                const bt = bookingTimes[b.id];
                const time = bt ? format(parseISO(bt.start), "p") : format(parseISO(b.date), "p");
                const isNew = !!b.createdAt && (now - new Date(b.createdAt).getTime()) < 10_000;
                return (
                  <div key={b.id} className={`flex items-center justify-between py-2 hover:bg-zinc-900/40 rounded px-2 cursor-pointer ${isNew ? 'ring-1 ring-red-600 animate-pulse' : ''}`} onClick={() => setSelected(b)}>
                    <div className="flex items-center gap-3">
                      <span className={`inline-block w-2 h-2 rounded-full ${requestFlags[b.id] ? "bg-yellow-500" : "bg-red-600"}`}></span>
                      <span className="text-xs text-zinc-400 w-16">{time}</span>
                      <span className="text-sm text-white">{b.customer}</span>
                      <span className="text-sm text-zinc-300">{b.title}</span>
                      {isNew && <span className="ml-2 text-[10px] bg-red-600 text-white px-1 rounded">NEW</span>}
                    </div>
                    <StatusBadge b={b} />
                  </div>
                );
              })}
          </div>
        </div>
      </Card>

      <Card className="bg-black border-zinc-800">
        <div className="p-3 text-sm font-semibold text-white">Today</div>
        <div className="px-3 pb-3">
          <div className="divide-y divide-zinc-800">
            {todayList.map((b) => {
              const bt = bookingTimes[b.id];
              const time = bt ? format(parseISO(bt.start), "p") : format(parseISO(b.date), "p");
              const isNew = !!b.createdAt && (now - new Date(b.createdAt).getTime()) < 10_000;
              return (
                <div key={b.id} className={`flex items-center justify-between py-2 hover:bg-zinc-900/40 rounded px-2 cursor-pointer ${isNew ? 'ring-1 ring-red-600 animate-pulse' : ''}`} onClick={() => setSelected(b)}>
                  <div className="flex items-center gap-3">
                    <span className={`inline-block w-2 h-2 rounded-full ${requestFlags[b.id] ? "bg-yellow-500" : "bg-red-600"}`}></span>
                    <span className="text-xs text-zinc-400 w-16">{time}</span>
                    <span className="text-sm text-white">{b.customer}</span>
                    <span className="text-sm text-zinc-300">{b.title}</span>
                    {isNew && <span className="ml-2 text-[10px] bg-red-600 text-white px-1 rounded">NEW</span>}
                  </div>
                  <StatusBadge b={b} />
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Customer Add/Edit Modal */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Booking</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-2">
              {/* Editable fields for admin */}
              {isAdmin ? (
                <>
                  <CustomerSearchField
                    value={formCustomer || selected.customer}
                    onChange={(v) => setFormCustomer(v)}
                    onAddNew={(cust) => setFormCustomer(cust.name)}
                  />
                  <Input
                    placeholder="Service"
                    value={formService || selected.title}
                    onChange={(e) => setFormService(e.target.value)}
                  />
                </>
              ) : (
                <>
                  <div className="text-sm text-zinc-300">Customer: {selected.customer}</div>
                  <div className="text-sm text-zinc-300">Service: {selected.title}</div>
                </>
              )}
              <div className="text-sm text-zinc-300">Date: {format(parseISO(selected.date), "PPP p")}</div>
              <div className="button-group-responsive flex flex-wrap gap-2 pt-2">
                {isAdmin && (
                  <>
                    <Button className="bg-red-700 hover:bg-red-800" onClick={() => update(selected.id, { status: "pending" })}>Pending</Button>
                    <Button className="bg-red-800 hover:bg-red-900" onClick={() => update(selected.id, { status: "confirmed" })}>Confirm</Button>
                    <Button className="bg-red-600 hover:bg-red-700" onClick={() => update(selected.id, { status: "in_progress" })}>Start</Button>
                    <Button className="bg-zinc-900 hover:bg-zinc-800" onClick={() => update(selected.id, { status: "done" })}>Complete</Button>
                    <Button variant="outline" onClick={() => { update(selected.id, { customer: formCustomer || selected.customer, title: formService || selected.title }); setSelected(null); setFormCustomer(""); setFormService(""); }}>Save Changes</Button>
                    <Button variant="outline" onClick={() => { remove(selected.id); setSelected(null); }}>Delete</Button>
                  </>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="button-group-responsive">
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inline quick-create form */}
      {/* Enhance customer field with search and add */}
      
    </div>
  );
}

// Lightweight customer search dropdown with Add New modal
function CustomerSearchField({ value, onChange, onAddNew }: { value: string; onChange: (v: string) => void; onAddNew: (c: Customer) => void }) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const run = async () => {
      if (!query) { setOptions([]); return; }
      try {
        const list = await api(`/api/customers/search?q=${encodeURIComponent(query)}`, { method: 'GET' });
        setOptions(list || []);
        setOpen(true);
      } catch {
        setOptions([]);
      }
    };
    const t = setTimeout(run, 200);
    return () => clearTimeout(t);
  }, [query]);

  const select = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Input
        placeholder="Customer name"
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); }}
      />
      {open && options.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-zinc-800 bg-black shadow-lg">
          {options.slice(0, 6).map((c) => (
            <div key={c.id || c.name} className="px-3 py-2 text-sm text-white hover:bg-zinc-900 cursor-pointer" onClick={() => select(c.name)}>
              {c.name}
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end mt-2">
        <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>Add New Customer</Button>
      </div>
      <CustomerModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initial={null}
        onSave={(data) => { onAddNew(data); setModalOpen(false); }}
      />
    </div>
  );
}
