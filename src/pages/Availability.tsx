import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBookingsStore } from "@/store/bookings";
import { getHybridAvailability, getRangeBlockedDates, getWeeklyBlocks } from "@/lib/hybridAvailability";
import { format, addDays, startOfWeek, eachDayOfInterval, startOfMonth } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { WeeklyScheduleView } from "@/components/WeeklyScheduleView";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, Lock, Package, ChevronRight, AlertCircle, Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTimeAMPM } from "@/lib/availability";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import * as supaPkgs from "@/services/supabase/packages";
import { servicePackages as builtInPackages, getServiceDuration } from "@/lib/services";
import { contentService, type SupaContact } from "@/lib/content";

const IndicatorStyles = () => (
    <style>{`
        .rdp-day { position: relative; }
        .work-full-indicator::after {
            content: '';
            position: absolute;
            bottom: 6px;
            left: 50%;
            transform: translateX(-50%);
            width: 8px;
            height: 8px;
            background-color: #2563eb;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(37, 99, 235, 0.4);
        }
        .work-morning-indicator::after {
            content: '';
            position: absolute;
            bottom: 6px;
            left: 50%;
            transform: translateX(-50%);
            width: 10px;
            height: 10px;
            background: linear-gradient(90deg, #2563eb 0%, #e2e8f0 100%);
            border: 1.5px solid #2563eb;
            border-radius: 50%;
            box-shadow: 0 0 8px rgba(37, 99, 235, 0.2);
        }
        .work-afternoon-indicator::after {
            content: '';
            position: absolute;
            bottom: 6px;
            left: 50%;
            transform: translateX(-50%);
            width: 10px;
            height: 10px;
            background: linear-gradient(270deg, #2563eb 0%, #e2e8f0 100%);
            border: 1.5px solid #2563eb;
            border-radius: 50%;
            box-shadow: 0 0 8px rgba(37, 99, 235, 0.2);
        }
        .work-multiple-indicator::after {
            content: '';
            position: absolute;
            bottom: 6px;
            left: 50%;
            transform: translateX(-50%);
            width: 10px;
            height: 10px;
            background: linear-gradient(90deg, #2563eb 0%, #e2e8f0 50%, #2563eb 100%);
            border: 1.5px solid #2563eb;
            border-radius: 50%;
            box-shadow: 0 0 8px rgba(37, 99, 235, 0.2);
        }
        .rdp-day_selected {
            background-color: #2563eb !important;
            color: white !important;
        }
    `}</style>
);

const Availability = () => {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [blockedFull, setBlockedFull] = useState<Date[]>([]);
    const [blockedMorning, setBlockedMorning] = useState<Date[]>([]);
    const [blockedAfternoon, setBlockedAfternoon] = useState<Date[]>([]);
    const [blockedMultiple, setBlockedMultiple] = useState<Date[]>([]);
    const [dailySlots, setDailySlots] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState("monthly");
    const [loading, setLoading] = useState(false);
    const [contact, setContact] = useState<SupaContact | null>(null);

    // Selection state
    const [packages, setPackages] = useState<any[]>([]);
    const [selectedPackageId, setSelectedPackageId] = useState<string>("");
    const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
    const [selectedVehicleType, setSelectedVehicleType] = useState<string>("compact");

    const { items: allBookings, refresh: refreshBookings } = useBookingsStore();

    useEffect(() => {
        refreshBookings();
        loadInitialData();
        // Auto-refresh bookings every 10 seconds to show new online bookings immediately
        const interval = setInterval(refreshBookings, 10000);
        return () => clearInterval(interval);
    }, [refreshBookings]);

    const loadInitialData = async () => {
        try {
            const [pkgs, vts, contactInfo] = await Promise.all([
                supaPkgs.getAll(),
                contentService.getVehicleTypes(),
                contentService.getContact()
            ]);

            setContact(contactInfo);

            const legacyIds = ['basic-exterior', 'express-wax', 'full-exterior', 'interior-cleaning', 'full-detail', 'premium-detail'];
            const activeBuiltIns = builtInPackages.filter(p =>
                !p.id.includes('2025') &&
                !p.name.includes('2025') &&
                !legacyIds.includes(p.id)
            );
            const builtInIds = activeBuiltIns.map(b => b.id);
            const mergedPkgs = [...activeBuiltIns];

            pkgs.forEach((p: any) => {
                if (!builtInIds.includes(p.id) && !p.id.includes('2025') && !p.name.includes('2025') && !legacyIds.includes(p.id)) {
                    mergedPkgs.push({
                        id: p.id,
                        name: p.name,
                        description: p.description || "",
                        basePrice: p.compact_price || 0,
                        pricing: {
                            compact: p.compact_price || 0,
                            midsize: p.midsize_price || 0,
                            truck: p.truck_price || 0,
                            luxury: p.luxury_price || 0
                        },
                        steps: []
                    });
                }
            });

            setPackages(mergedPkgs);
            if (mergedPkgs.length > 0) setSelectedPackageId(mergedPkgs[0].id);

            const activeVts = vts.filter(v => v.is_active);
            setVehicleTypes(activeVts);
            if (activeVts.length > 0) setSelectedVehicleType(activeVts[0].id);

        } catch (e) {
            console.error("Failed to load initial metadata", e);
        }
    };

    const mappedBookings = (allBookings || []).map(b => ({
        scheduled_at: b.date,
        estimated_duration: b.endTime
            ? (new Date(b.endTime).getTime() - new Date(b.date).getTime()) / (1000 * 60 * 60)
            : getServiceDuration('') || 3
    }));

    const loadAvailability = async () => {
        setLoading(true);
        try {
            // Load from start of month to ensure consistent view
            const start = startOfMonth(new Date());
            const end = addDays(start, 90);
            const allBlocks = await getRangeBlockedDates(start, end, mappedBookings);

            const datesMap: Record<string, { workMorning: boolean, workAfternoon: boolean, workFull: boolean }> = {};

            allBlocks.forEach(b => {
                if (!datesMap[b.date]) {
                    datesMap[b.date] = { workMorning: false, workAfternoon: false, workFull: false };
                }
                if (!b.startTime || !b.endTime) {
                    datesMap[b.date].workFull = true;
                } else {
                    const startH = parseInt(b.startTime.split(':')[0]);
                    const endH = parseInt(b.endTime.split(':')[0]);

                    if (startH === 0 && (endH === 0 || endH >= 16)) {
                        datesMap[b.date].workFull = true;
                    } else {
                        if (startH < 12) datesMap[b.date].workMorning = true;
                        if (endH >= 12 || startH >= 12) {
                            if (endH === 12 && parseInt(b.endTime.split(':')[1]) === 0) {
                                // Morning only
                            } else {
                                datesMap[b.date].workAfternoon = true;
                            }
                        }
                    }
                }
            });

            const full: Date[] = [];
            const morning: Date[] = [];
            const afternoon: Date[] = [];
            const multiple: Date[] = [];

            Object.entries(datesMap).forEach(([dStr, info]) => {
                const dateObj = new Date(dStr + 'T12:00:00');
                if (info.workFull) {
                    full.push(dateObj);
                } else if (info.workMorning && info.workAfternoon) {
                    multiple.push(dateObj);
                } else if (info.workMorning) {
                    morning.push(dateObj);
                } else if (info.workAfternoon) {
                    afternoon.push(dateObj);
                }
            });

            setBlockedFull(full);
            setBlockedMorning(morning);
            setBlockedAfternoon(afternoon);
            setBlockedMultiple(multiple);

            if (selectedDate) {
                const dayInfo = await getHybridAvailability(format(selectedDate, 'yyyy-MM-dd'), mappedBookings);
                setDailySlots(dayInfo.availableSlots);
            }
        } catch (e) {
            console.error("Failed to load availability data", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAvailability();
    }, [selectedDate, allBookings]);

    const modifiers = {
        workFull: blockedFull,
        workMorning: blockedMorning,
        workAfternoon: blockedAfternoon,
        workMultiple: blockedMultiple,
    };

    const modifiersClassNames = {
        workFull: "work-full-indicator",
        workMorning: "work-morning-indicator",
        workAfternoon: "work-afternoon-indicator",
        workMultiple: "work-multiple-indicator",
    };

    const selectedPkg = packages.find(p => p.id === selectedPackageId);
    const price = selectedPkg ? (selectedPkg.pricing[selectedVehicleType] || selectedPkg.basePrice) : 0;
    const bookingUrl = `/book?date=${format(selectedDate, 'yyyy-MM-dd')}&package=${selectedPackageId}&vehicle=${selectedVehicleType}&price=${price}`;

    return (
        <div className="min-h-screen bg-slate-50">
            <IndicatorStyles />
            <Navbar />

            <main className="container mx-auto px-4 pt-24 pb-12">
                <div className="max-w-7xl mx-auto space-y-8">
                    <div className="text-center space-y-4">
                        <h1 className="text-5xl font-black text-foreground uppercase tracking-tighter">Check Availability</h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto italic font-medium">
                            Explore our live schedule. We sync in real-time with our appointments to provide you the most accurate booking experience.
                        </p>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="flex justify-center mb-8">
                            <TabsList className="grid w-full max-w-md grid-cols-3 h-12 bg-white border border-slate-200 shadow-sm p-1">
                                <TabsTrigger value="monthly" className="data-[state=active]:bg-primary data-[state=active]:text-white font-bold uppercase text-xs tracking-widest transition-all">Monthly</TabsTrigger>
                                <TabsTrigger value="weekly" className="data-[state=active]:bg-primary data-[state=active]:text-white font-bold uppercase text-xs tracking-widest transition-all">Weekly</TabsTrigger>
                                <TabsTrigger value="list" className="data-[state=active]:bg-primary data-[state=active]:text-white font-bold uppercase text-xs tracking-widest transition-all">Timeline</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="monthly" className="animate-in fade-in zoom-in duration-500 space-y-8">
                            {/* Step 1: Selection */}
                            <div className="flex justify-center">
                                <Card className="w-full max-w-4xl p-6 bg-white border border-slate-200 shadow-xl rounded-2xl ring-1 ring-primary/5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                                <Package className="w-5 h-5 text-primary" />
                                                <h3 className="text-lg font-black uppercase tracking-widest text-slate-800">Step 1: Choose Service</h3>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Service Package</Label>
                                                    <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                                                        <SelectTrigger className="bg-slate-50 border-slate-200 h-12">
                                                            <SelectValue placeholder="Select a package" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-white border-slate-200">
                                                            {packages.map(p => (
                                                                <SelectItem key={p.id} value={p.id} className="text-slate-700 focus:bg-primary focus:text-white uppercase font-bold text-xs">{p.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle Type</Label>
                                                    <Select value={selectedVehicleType} onValueChange={setSelectedVehicleType}>
                                                        <SelectTrigger className="bg-slate-50 border-slate-200 h-12">
                                                            <SelectValue placeholder="Select vehicle type" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-white border-slate-200">
                                                            {vehicleTypes.map(v => (
                                                                <SelectItem key={v.id} value={v.id} className="text-slate-700 focus:bg-primary focus:text-white uppercase font-bold text-xs">{v.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                        {selectedPkg && (
                                            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 flex flex-col justify-center min-h-[110px]">
                                                <p className="text-[10px] font-black uppercase text-primary tracking-widest italic">Estimated Service Cost</p>
                                                <p className="text-4xl font-black text-slate-900 tracking-tighter">${price}</p>
                                                <p className="text-xs text-slate-500 italic line-clamp-1 mt-1">{selectedPkg.description}</p>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </div>

                            <div className="flex flex-col gap-8">
                                <div className="flex justify-center">
                                    <Card className="w-full max-w-4xl p-8 border border-slate-200 bg-white shadow-xl overflow-hidden rounded-2xl">
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-primary/10 rounded-xl">
                                                    <CalendarIcon className="w-6 h-6 text-primary" />
                                                </div>
                                                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800">Prime Schedule</h2>
                                            </div>
                                            <div className="flex flex-wrap gap-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-blue-600 shadow-sm" />
                                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Booked / Work</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full border border-blue-600 bg-gradient-to-r from-blue-600 to-[#e2e8f0]" />
                                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Half Moon = Partial Day Available</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Calendar
                                            mode="single"
                                            selected={selectedDate}
                                            onSelect={(d) => d && setSelectedDate(d)}
                                            className="w-full border-0 p-0 [&_.rdp-day]:h-16 [&_.rdp-day]:w-full [&_.rdp-day]:text-lg [&_.rdp-day]:font-black [&_.rdp-day]:rounded-xl [&_.rdp-day]:text-slate-900 [&_.rdp-caption]:mb-8 [&_.rdp-caption_label]:text-2xl [&_.rdp-caption_label]:font-black [&_.rdp-caption_label]:uppercase [&_.rdp-head_cell]:text-xs [&_.rdp-head_cell]:font-black [&_.rdp-head_cell]:uppercase [&_.rdp-head_cell]:text-slate-400 [&_.rdp-head_cell]:py-4"
                                            modifiers={modifiers}
                                            modifiersClassNames={modifiersClassNames}
                                            showOutsideDays
                                        />
                                    </Card>
                                </div>

                                <div className="flex justify-center">
                                    <div className="w-full max-w-5xl space-y-6">
                                        <Card className="p-8 bg-slate-900 text-white border-none shadow-2xl rounded-2xl overflow-hidden relative">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -mr-32 -mt-32" />
                                            <div className="space-y-8 relative z-10">
                                                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                                    <h3 className="text-2xl font-black uppercase tracking-widest flex items-center gap-3 text-white">
                                                        <Clock className="w-6 h-6 text-primary" />
                                                        {format(selectedDate, 'MMMM d')} Availability
                                                    </h3>
                                                    <Badge variant="outline" className="font-mono text-primary border-primary/50 uppercase italic px-4 py-1">Live Slots</Badge>
                                                </div>
                                                {dailySlots.length > 0 ? (
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 transition-all">
                                                        {dailySlots.map((slot, idx) => (
                                                            <a
                                                                key={idx}
                                                                href={`${bookingUrl}&time=${formatTimeAMPM(slot.start)}`}
                                                                className="flex flex-col gap-2 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-primary hover:border-primary transition-all group cursor-pointer"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-black text-xl text-white group-hover:text-white transition-colors tracking-tighter">
                                                                        {formatTimeAMPM(slot.start)}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center justify-between mt-1 pt-2 border-t border-white/5 group-hover:border-white/20">
                                                                    <span className="text-[10px] font-black uppercase text-zinc-400 group-hover:text-white/80 tracking-widest">Available</span>
                                                                    <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                                                                </div>
                                                            </a>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                                                        <div className="p-6 bg-red-500/10 rounded-full ring-8 ring-red-500/5">
                                                            <Lock className="w-12 h-12 text-red-500" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <p className="font-black text-3xl uppercase tracking-tighter text-white">Fully Booked</p>
                                                            <p className="text-lg text-zinc-400 italic font-medium">Our schedule for this date is currently full.</p>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="pt-4 flex justify-center">
                                                    <Button asChild className="w-full max-w-md bg-primary hover:bg-primary/90 py-8 text-xl font-black uppercase tracking-widest shadow-2xl hover:scale-[1.02] transition-all rounded-xl">
                                                        <a href={bookingUrl}>Quick Book: {format(selectedDate, 'MMM d')}</a>
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <Card className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex items-start gap-5">
                                                    <div className="p-4 bg-slate-100 rounded-2xl flex-shrink-0">
                                                        <AlertCircle className="w-6 h-6 text-slate-600" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <h4 className="font-black uppercase text-slate-800 tracking-tight">Need a custom time?</h4>
                                                        <p className="text-sm text-slate-500 italic font-medium leading-relaxed">
                                                            Our schedule is dynamic and often updates in real-time. If you don't see your preferred slot, contact us directly for expert scheduling help.
                                                        </p>
                                                    </div>
                                                </div>
                                            </Card>
                                            <Card className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm">
                                                <div className="flex flex-col sm:flex-row items-center gap-6 h-full justify-center">
                                                    {contact?.phone && (
                                                        <a href={`tel:${contact.phone.replace(/[^0-9]/g, '')}`} className="flex items-center gap-3 px-6 py-4 bg-slate-50 rounded-2xl text-base font-black text-slate-800 hover:text-primary hover:bg-primary/5 transition-all border border-slate-100 whitespace-nowrap min-w-fit">
                                                            <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                                                            {contact.phone}
                                                        </a>
                                                    )}
                                                    {contact?.email && (
                                                        <a
                                                            href={`https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent(contact.email)}&su=Detailing%20Inquiry`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-3 px-6 py-4 bg-slate-50 rounded-2xl text-base font-black text-slate-800 hover:text-primary hover:bg-primary/5 transition-all border border-slate-100 whitespace-nowrap min-w-fit"
                                                        >
                                                            <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                                                            Contact Email
                                                        </a>
                                                    )}
                                                </div>
                                            </Card>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="weekly" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <Card className="p-2 bg-white border border-slate-200 overflow-hidden shadow-2xl rounded-2xl">
                                <WeeklyScheduleView
                                    selectedDate={selectedDate}
                                    onDateSelect={setSelectedDate}
                                    existingBookings={mappedBookings}
                                    className="bg-transparent"
                                    publicView={true}
                                />
                            </Card>
                        </TabsContent>

                        <TabsContent value="list" className="animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="max-w-4xl mx-auto space-y-4">
                                {eachDayOfInterval({
                                    start: selectedDate,
                                    end: addDays(selectedDate, 14)
                                }).map((day, idx) => {
                                    const dayStr = format(day, 'yyyy-MM-dd');
                                    const isDayFull = blockedFull.some(d => format(d, 'yyyy-MM-dd') === dayStr);
                                    return (
                                        <Card key={idx} className={cn(
                                            "p-6 transition-all border-l-8 rounded-2xl bg-white shadow-sm hover:shadow-md",
                                            isDayFull ? "border-l-red-500" : "border-l-green-500 hover:translate-x-2"
                                        )}>
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{format(day, 'EEEE')}</p>
                                                    <h4 className="text-2xl font-black uppercase tracking-tighter text-slate-800">{format(day, 'MMMM d, yyyy')}</h4>
                                                </div>
                                                <div className="text-right space-y-2">
                                                    {blockedFull.some(d => format(d, 'yyyy-MM-dd') === dayStr) ? (
                                                        <Badge variant="destructive" className="uppercase font-black tracking-widest px-4 py-1 rounded-full">Booked</Badge>
                                                    ) : (
                                                        <div className="flex flex-col items-end gap-1">
                                                            <Badge className="bg-green-500 text-white uppercase font-black tracking-widest px-4 py-1 rounded-full">Open Slots</Badge>
                                                            <span className="text-xs text-slate-400 font-medium italic underline decoration-primary/50 cursor-pointer hover:text-primary transition-colors" onClick={() => {
                                                                setSelectedDate(day);
                                                                setActiveTab("monthly");
                                                            }}>View Hourly Slots</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        </TabsContent>
                    </Tabs>
                    <Footer />
                </div>
            </main>
        </div>
    );
};

export default Availability;
