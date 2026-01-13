import React, { useEffect, useState } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays } from 'date-fns';
import { getBlockedSlots, BlockedTimeSlot, formatTimeAMPM } from '@/lib/availability';
import { Loader2, Clock } from 'lucide-react';
import { cn } from "@/lib/utils";

interface WeeklyScheduleViewProps {
    selectedDate: Date | undefined;
    className?: string;
}

export function WeeklyScheduleView({ selectedDate, className }: WeeklyScheduleViewProps) {
    const [blocks, setBlocks] = useState<BlockedTimeSlot[]>([]);
    const [loading, setLoading] = useState(false);

    // Sync to selected date (or today)
    const displayDate = selectedDate || new Date();
    // Ensure we start on Monday
    const weekStart = startOfWeek(displayDate, { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const allBlocks = await getBlockedSlots();
            setBlocks(allBlocks);
            setLoading(false);
        };
        load();
    }, []);

    const getDayBlocks = (day: Date) => {
        const dayStr = format(day, 'yyyy-MM-dd');
        return blocks.filter(b => b.date === dayStr);
    };

    if (loading) return (
        <div className="flex items-center justify-center p-8 bg-muted/20 rounded-lg animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
    );

    return (
        <div className={cn("space-y-4", className)}>
            <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    Week Schedule: {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
                </h3>
            </div>

            <div className="space-y-3">
                {weekDays.map(day => {
                    const dayBlocks = getDayBlocks(day);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div
                            key={day.toISOString()}
                            className={cn(
                                "group relative overflow-hidden rounded-lg border transition-all duration-200",
                                isSelected ? "border-primary ring-1 ring-primary/20 shadow-md bg-primary/5" : "border-border bg-card",
                                isToday && !isSelected && "border-blue-300 bg-blue-50/30"
                            )}
                        >
                            {/* Header */}
                            <div className="p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-md flex flex-col items-center justify-center text-xs font-bold leading-none shadow-sm",
                                        isSelected ? "bg-primary text-primary-foreground" : (isToday ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-100")
                                    )}>
                                        <span className="opacity-70 text-[10px] uppercase">{format(day, 'EEE')}</span>
                                        <span className="text-lg">{format(day, 'd')}</span>
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
                                    {dayBlocks.map(block => (
                                        <div key={block.id} className="flex items-center justify-between text-xs bg-red-100 text-red-900 border border-red-200 rounded px-3 py-2 font-medium">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3.5 h-3.5 opacity-70" />
                                                <span className="font-mono font-bold tracking-tight">
                                                    {block.startTime ? `${formatTimeAMPM(block.startTime)} - ${formatTimeAMPM(block.endTime!)}` : 'Fully Booked'}
                                                </span>
                                            </div>
                                            <span className="italic opacity-80 text-[10px] uppercase tracking-wide truncate max-w-[120px]">
                                                Booked
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
