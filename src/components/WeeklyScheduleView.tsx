import React, { useEffect, useState } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays } from 'date-fns';
import { getBlockedSlots, BlockedTimeSlot, formatTimeAMPM } from '@/lib/availability';
import { getWeeklyBlocks } from '@/lib/hybridAvailability';
import { Loader2, Clock, Lock, Shield } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface WeeklyScheduleViewProps {
    selectedDate: Date | undefined;
    onDateSelect?: (date: Date) => void;
    className?: string;
    existingBookings?: Array<{ scheduled_at: string; estimated_duration: number }>;
    publicView?: boolean;
}

export function WeeklyScheduleView({
    selectedDate,
    onDateSelect,
    className,
    existingBookings = [],
    publicView = false
}: WeeklyScheduleViewProps) {
    const [blocks, setBlocks] = useState<BlockedTimeSlot[]>([]);
    const [loading, setLoading] = useState(false);
    const [weekOffset, setWeekOffset] = useState(0);

    // Sync to selected date (or today) + offset
    const baseDate = selectedDate || new Date();
    const displayDate = addDays(baseDate, weekOffset * 7);

    // Ensure we start on Monday
    const weekStart = startOfWeek(displayDate, { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const allBlocks = await getWeeklyBlocks(weekStart, existingBookings);
                setBlocks(allBlocks as any);
            } catch (error) {
                console.error("Failed to load weekly schedule:", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [weekStart.toISOString(), existingBookings]);

    const getDayBlocks = (day: Date) => {
        const dayStr = format(day, 'yyyy-MM-dd');
        return blocks.filter(b => b.date === dayStr);
    };

    if (loading && blocks.length === 0) return (
        <div className="flex items-center justify-center p-8 bg-muted/20 rounded-lg animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
    );

    return (
        <div className={cn("space-y-4", className)}>
            <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setWeekOffset(prev => prev - 1)}
                    >
                        <span className="sr-only">Previous Week</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    </Button>
                    <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
                    </h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setWeekOffset(prev => prev + 1)}
                    >
                        <span className="sr-only">Next Week</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </Button>
                </div>
                {weekOffset !== 0 && (
                    <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-[10px] text-primary"
                        onClick={() => setWeekOffset(0)}
                    >
                        Jump to Today
                    </Button>
                )}
            </div>

            <div className="space-y-3">
                {weekDays.map(day => {
                    const dayBlocks = getDayBlocks(day);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div
                            key={day.toISOString()}
                            onClick={() => onDateSelect?.(day)}
                            className={cn(
                                "group relative overflow-hidden rounded-lg border transition-all duration-200 cursor-pointer",
                                isSelected ? "border-primary ring-1 ring-primary/20 shadow-md bg-primary/5" : "border-border bg-card hover:border-primary/50 hover:shadow-sm",
                                isToday && !isSelected && "border-blue-300 bg-blue-50/30"
                            )}
                        >
                            {/* Header */}
                            <div className="p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-md flex flex-col items-center justify-center text-xs font-bold leading-none shadow-sm relative",
                                        isSelected ? "bg-primary text-primary-foreground" : (isToday ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-100")
                                    )}>
                                        <span className="opacity-70 text-[10px] uppercase">{format(day, 'EEE')}</span>
                                        <span className="text-lg">{format(day, 'd')}</span>
                                        {(() => {
                                            const dayStr = format(day, 'yyyy-MM-dd');
                                            const dayBlocks = blocks.filter(b => b.date === dayStr);

                                            const morning = dayBlocks.some(b => b.startTime && parseInt(b.startTime.split(':')[0]) < 12);
                                            const afternoon = dayBlocks.some(b => b.startTime && parseInt(b.startTime.split(':')[0]) >= 12);
                                            const isFullWorkday = dayBlocks.some(b => !b.startTime); // Manual full day block

                                            // Calculate total blocked hours logic similar to Availability.tsx
                                            const blockedHours = new Set();
                                            dayBlocks.forEach(i => {
                                                if (!i.startTime) {
                                                    for (let h = 8; h < 16; h++) blockedHours.add(h);
                                                } else {
                                                    const [startH] = i.startTime.split(':').map(Number);
                                                    const [endH] = i.endTime!.split(':').map(Number);
                                                    for (let h = startH; h < endH; h++) {
                                                        if (h >= 8 && h < 16) blockedHours.add(h);
                                                    }
                                                }
                                            });
                                            // A day is "Full" if manually blocked, if morning+afternoon are both hit, or if 6+ hours are filled
                                            const isFull = isFullWorkday || (morning && afternoon) || blockedHours.size >= 6;

                                            let indClass = '';
                                            if (isFull) indClass = 'bg-blue-600';
                                            else if (blockedHours.size > 0) indClass = 'bg-gradient-to-r from-blue-600 from-50% to-white to-50% border border-blue-600';

                                            return indClass ? (
                                                <div className={cn("absolute -bottom-1 -right-1 w-3 h-3 rounded-full shadow-md z-10", indClass)} />
                                            ) : null;
                                        })()}
                                    </div>
                                    <div>
                                        <div className={cn("font-bold text-sm", isSelected || isToday ? "text-foreground" : "text-muted-foreground")}>
                                            {format(day, 'MMMM d, yyyy')}
                                        </div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-1 h-4">
                                            {dayBlocks.length > 0 ? (
                                                <span className="text-destructive font-medium">{dayBlocks.length} Booking{dayBlocks.length > 1 ? 's' : ''}</span>
                                            ) : (
                                                <span className="text-green-600 font-medium">Standard Availability</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Blocks List */}
                            {dayBlocks.length > 0 && (
                                <div className="px-3 pb-3 space-y-2">
                                    {dayBlocks.map(block => {
                                        const isPersonal = (block as any).source === 'google';
                                        const isBooking = (block as any).source === 'booking';
                                        return (
                                            <div key={block.id} className={cn(
                                                "flex items-center justify-between text-xs border rounded px-3 py-2 font-medium",
                                                (publicView || isBooking) ? "bg-blue-50 text-blue-900 border-blue-200" :
                                                    isPersonal ? "bg-zinc-50 text-zinc-500 border-zinc-200" :
                                                        "bg-red-100 text-red-900 border-red-200"
                                            )}>
                                                <div className="flex items-center gap-2">
                                                    {(() => {
                                                        const h = block.startTime ? parseInt(block.startTime.split(':')[0]) : 12;
                                                        const isFull = !block.startTime;
                                                        return (
                                                            <div
                                                                className={cn(
                                                                    "w-2 h-2 rounded-full shadow-sm flex-shrink-0",
                                                                    (publicView || isBooking) ? "bg-blue-600" :
                                                                        isFull ? "bg-[#1e3a8a]" : (h < 12 ? "bg-[linear-gradient(90deg,#1e3a8a_0%,#ffffff_100%)] ring-[0.5px] ring-zinc-400" : "bg-[linear-gradient(90deg,#ffffff_0%,#1e3a8a_100%)] ring-[0.5px] ring-zinc-400")
                                                                )}
                                                            />
                                                        );
                                                    })()}
                                                    {(isPersonal || isBooking) ? <Shield className="w-3.5 h-3.5 opacity-70 text-blue-600" /> : <Clock className="w-3.5 h-3.5 opacity-70" />}
                                                    <span className="font-mono font-bold tracking-tight text-[11px]">
                                                        {block.startTime !== '00:00' && block.startTime ? `${formatTimeAMPM(block.startTime)} - ${formatTimeAMPM(block.endTime!)}` : (publicView ? 'Booked' : (isPersonal ? 'Unavailable' : 'Fully Booked'))}
                                                    </span>
                                                </div>
                                                <span className="italic opacity-80 text-[10px] uppercase tracking-wide truncate max-w-[120px]">
                                                    {publicView ? 'Booked' : (block.reason || ((block as any).source === 'google' ? 'Personal' : (block as any).source === 'booking' ? 'Confirmed' : (block as any).source === 'manual' ? 'Blocked' : 'Booked')))}
                                                </span>
                                                {(!publicView && block.notes) && (
                                                    <div className="hidden group-hover:block absolute top-full left-0 mt-1 p-2 bg-zinc-900 text-white text-[10px] rounded shadow-lg z-50 w-full max-w-xs">
                                                        {block.notes}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
