import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getDatesWithBlocks, formatTimeAMPM, getBlockedSlots } from '@/lib/availability';
import { getHybridAvailability, getRangeBlockedDates } from '@/lib/hybridAvailability';
import { AlertCircle, Clock, CheckCircle, Calendar as CalendarIcon } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { WeeklyScheduleView } from './WeeklyScheduleView';

interface AvailabilityPickerProps {
    selectedDate: Date | undefined;
    selectedTime: string;
    onDateChange: (date: Date | undefined) => void;
    onTimeChange: (time: string) => void;
    existingBookings: Array<{ scheduled_at: string; estimated_duration: number }>;
    serviceDuration?: number; // Duration in hours
}

export function AvailabilityPicker({
    selectedDate,
    selectedTime,
    onDateChange,
    onTimeChange,
    existingBookings,
    serviceDuration = 1
}: AvailabilityPickerProps) {
    const [blockedFull, setBlockedFull] = useState<Date[]>([]);
    const [blockedMorning, setBlockedMorning] = useState<Date[]>([]);
    const [blockedAfternoon, setBlockedAfternoon] = useState<Date[]>([]);
    const [blockedPersonal, setBlockedPersonal] = useState<Date[]>([]);
    const [availableSlots, setAvailableSlots] = useState<Array<{ start: string; end: string }>>([]);
    const [dayFullyBlocked, setDayFullyBlocked] = useState(false);
    const [loading, setLoading] = useState(false);

    // ... (rest of useEffects)

    // Helper for duration visualization
    const timeToMins = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
    };

    const isSlotSelected = (slotStart: string) => {
        if (!selectedTime) return false;
        const startMins = timeToMins(selectedTime);
        const endMins = startMins + (serviceDuration * 60);
        const currentMins = timeToMins(slotStart);
        // Highlight logic: [start, end)
        // E.g. 10:00 (start=600), dur=2h (120m). limit=720.
        // 10:00 (600) -> True.
        // 11:00 (660) -> True.
        // 12:00 (720) -> False.
        return currentMins >= startMins && currentMins < endMins;
    };

    useEffect(() => {
        loadBlockedDates();

        const handleChange = () => loadBlockedDates();
        window.addEventListener('availability-changed', handleChange);
        return () => window.removeEventListener('availability-changed', handleChange);
    }, []);

    useEffect(() => {
        if (selectedDate) {
            loadDayAvailability();
        }
    }, [selectedDate, existingBookings]);

    const loadBlockedDates = async () => {
        // Load blocks for next 3 months to cover view
        const start = new Date();
        const end = addDays(start, 90);
        const allBlocks = await getRangeBlockedDates(start, end);

        // Group by date to determine morning/afternoon/full
        const datesMap: Record<string, { workMorning: boolean; workAfternoon: boolean; workFull: boolean; personal: boolean }> = {};

        allBlocks.forEach(b => {
            if (!datesMap[b.date]) {
                datesMap[b.date] = { workMorning: false, workAfternoon: false, workFull: false, personal: false };
            }
            if (b.source === 'manual') {
                if (!b.startTime && !b.endTime) {
                    datesMap[b.date].workFull = true;
                } else if (b.startTime) {
                    const hour = parseInt(b.startTime.split(':')[0]);
                    if (hour < 12) datesMap[b.date].workMorning = true;
                    else datesMap[b.date].workAfternoon = true;
                }
            } else if (b.source === 'google') {
                datesMap[b.date].personal = true;
            }
        });

        // Add real bookings to the indicators
        existingBookings.forEach(booking => {
            const d = format(new Date(booking.scheduled_at), 'yyyy-MM-dd');
            if (!datesMap[d]) datesMap[d] = { workMorning: false, workAfternoon: false, workFull: false, personal: false };
            const hour = new Date(booking.scheduled_at).getHours();
            if (hour < 12) datesMap[d].workMorning = true;
            else datesMap[d].workAfternoon = true;
        });

        const full: Date[] = [];
        const morning: Date[] = [];
        const afternoon: Date[] = [];
        const personal: Date[] = [];

        Object.entries(datesMap).forEach(([dStr, info]) => {
            const dateObj = new Date(dStr + 'T00:00:00');
            if (info.workFull || (info.workMorning && info.workAfternoon)) {
                full.push(dateObj);
            } else if (info.workMorning) {
                morning.push(dateObj);
            } else if (info.workAfternoon) {
                afternoon.push(dateObj);
            } else if (info.personal) {
                personal.push(dateObj);
            }
        });

        setBlockedFull(full);
        setBlockedMorning(morning);
        setBlockedAfternoon(afternoon);
        setBlockedPersonal(personal);
    };

    const loadDayAvailability = async () => {
        if (!selectedDate) return;

        setLoading(true);
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');

            // Use hybrid availability (manual blocks + Google Calendar)
            const availability = await getHybridAvailability(dateStr, existingBookings);

            setDayFullyBlocked(availability.fullyBlocked);
            setAvailableSlots(availability.availableSlots);

            // Auto-clear selected time if it's no longer available
            if (selectedTime && !availability.availableSlots.some(s => s.start === selectedTime)) {
                onTimeChange('');
            }
        } catch (error) {
            console.error('Failed to load availability:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calendar modifiers for visual indicators
    const modifiers = {
        workFull: blockedFull,
        workMorning: blockedMorning,
        workAfternoon: blockedAfternoon,
        personal: blockedPersonal,
        today: new Date()
    };

    const modifiersClassNames = {
        workFull: 'work-full-indicator',
        workMorning: 'work-morning-indicator',
        workAfternoon: 'work-afternoon-indicator',
        personal: 'personal-indicator',
        today: 'bg-blue-50 text-blue-900 font-bold'
    };

    return (
        <div className="space-y-6">

            {/* Calendar with Blue Dot Indicators */}
            <div className="space-y-2">
                <Label className="text-sm font-bold uppercase tracking-wide text-zinc-900">
                    Select Preferred Date
                </Label>

                <style>{`
          .work-full-indicator { position: relative; }
          .work-full-indicator::after {
            content: ''; position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%);
            width: 8px; height: 8px; border-radius: 50%;
            background-color: #1e3a8a; z-index: 10;
          }
          .work-morning-indicator { position: relative; }
          .work-morning-indicator::after {
            content: ''; position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%);
            width: 8px; height: 8px; border-radius: 50%;
            background: linear-gradient(90deg, #1e3a8a 0%, #ffffff 100%);
            box-shadow: 0 0 0 1px #e4e4e7; z-index: 10;
          }
          .work-afternoon-indicator { position: relative; }
          .work-afternoon-indicator::after {
            content: ''; position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%);
            width: 8px; height: 8px; border-radius: 50%;
            background: linear-gradient(90deg, #ffffff 0%, #1e3a8a 100%);
            box-shadow: 0 0 0 1px #e4e4e7; z-index: 10;
          }
          .personal-indicator { position: relative; }
          .personal-indicator::after {
            content: ''; position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%);
            width: 8px; height: 8px; border-radius: 50%;
            border: 2px solid #a1a1aa; background-color: transparent; z-index: 10;
          }
        `}</style>

                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={onDateChange}
                    disabled={(date) => {
                        // Disable past dates
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                    }}
                    modifiers={modifiers}
                    modifiersClassNames={modifiersClassNames}
                    className="rounded-md border border-zinc-200 bg-white p-3"
                />

                <div className="flex flex-col gap-2 mt-2 bg-zinc-50 border border-zinc-100 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-zinc-600">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                        <span className="font-medium">Blue Dot = Booked / Work</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-600">
                        <div className="w-2.5 h-2.5 rounded-full border-2 border-zinc-400 flex-shrink-0" />
                        <span className="font-medium">Gray Ring = Unavailable (Personal)</span>
                    </div>
                </div>
            </div>

            {/* Time Slot Picker */}
            {selectedDate && (
                <div className="space-y-3">
                    <Label className="text-sm font-bold uppercase tracking-wide text-zinc-900">
                        Available Time Slots
                    </Label>

                    {dayFullyBlocked ? (
                        <Alert className="bg-yellow-50 border-yellow-200">
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <AlertDescription className="text-yellow-800 text-sm">
                                No availability on {format(selectedDate, 'MMMM d, yyyy')}. Please select another date.
                            </AlertDescription>
                        </Alert>
                    ) : availableSlots.length === 0 ? (
                        <Alert className="bg-yellow-50 border-yellow-200">
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <AlertDescription className="text-yellow-800 text-sm">
                                All time slots are booked for {format(selectedDate, 'MMMM d')}. Try another day.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {availableSlots.map((slot, index) => {
                                    const selected = isSlotSelected(slot.start);
                                    const isStart = selectedTime === slot.start;
                                    return (
                                        <Button
                                            key={index}
                                            type="button"
                                            variant={selected ? 'default' : 'outline'}
                                            className={cn(
                                                "h-12 text-sm font-bold transition-all",
                                                selected
                                                    ? (isStart ? 'bg-green-600 hover:bg-green-700 text-white shadow-md scale-105' : 'bg-green-500/90 text-white hover:bg-green-600')
                                                    : 'border-zinc-300 hover:border-green-600 hover:bg-green-50'
                                            )}
                                            onClick={() => onTimeChange(slot.start)}
                                        >
                                            {formatTimeAMPM(slot.start)}
                                        </Button>
                                    );
                                })}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-3 rounded-lg">
                                <CheckCircle className="w-4 h-4" />
                                <span className="font-medium">
                                    {availableSlots.length} time slot{availableSlots.length !== 1 ? 's' : ''} available
                                </span>
                            </div>
                        </>
                    )}
                </div>
            )}

            {!selectedDate && (
                <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 text-sm">
                        Select a date above to see available time slots
                    </AlertDescription>
                </Alert>
            )}

            {/* Weekly Overview */}
            {/* Weekly Overview - Accordion */}
            <Accordion type="single" collapsible className="w-full mt-8 border-t border-zinc-200 pt-2">
                <AccordionItem value="weekly-view" className="border-b-0">
                    <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex flex-col items-start gap-1">
                            <div className="text-sm font-bold uppercase tracking-wide text-zinc-900 flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-blue-600" /> Weekly Availability
                            </div>
                            <p className="text-xs text-muted-foreground font-normal text-left">
                                Expand to see booked times for the week.
                            </p>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <WeeklyScheduleView
                            selectedDate={selectedDate}
                            onDateSelect={onDateChange}
                        />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
}
