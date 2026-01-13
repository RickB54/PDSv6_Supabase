import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import {
    getBlockedSlots,
    blockFullDay,
    blockTimeRange,
    unblockDay,
    unblockSlot,
    blockDateRange,
    blockWeekendsInMonth,
    getDatesWithBlocks,
    BlockedTimeSlot,
    formatTimeAMPM
} from '@/lib/availability';
import {
    initGoogleCalendar,
    signInToGoogle,
    signOutFromGoogle,
    isSignedIn,
    saveCalendarConfig,
    getCalendarConfig,
    CalendarConfig
} from '@/lib/googleCalendar';
import { getAvailabilityStatus } from '@/lib/hybridAvailability';
import { Calendar as CalendarIcon, Clock, X, Plus, Trash2, AlertCircle, Shield, CheckCircle, RefreshCw } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

/**
 * Admin Calendar Manager
 * Quick and easy availability blocking
 */
export default function AvailabilityManager() {
    const { toast } = useToast();
    const [blockedSlots, setBlockedSlots] = useState<BlockedTimeSlot[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedDates, setSelectedDates] = useState<Date[]>([]); // Multi-select support
    const [lastClickedDate, setLastClickedDate] = useState<Date | undefined>(undefined); // For shift-select
    const [blockedDates, setBlockedDates] = useState<string[]>([]);

    // Quick block states
    const [rangeStart, setRangeStart] = useState('');
    const [rangeEnd, setRangeEnd] = useState('');
    const [blockReason, setBlockReason] = useState('');

    // Time block states
    const [timeStart, setTimeStart] = useState('09:00');
    const [timeEnd, setTimeEnd] = useState('17:00');

    // Google Calendar states
    const [googleConfig, setGoogleConfig] = useState<CalendarConfig>({
        clientId: '',
        apiKey: '',
        calendarIds: ['primary'],
        maxBookingsPerDay: 1,
        bufferMinutes: 120,
        recoveryDays: []
    });
    const [googleSignedIn, setGoogleSignedIn] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [availStatus, setAvailStatus] = useState<{
        googleActive: boolean;
        manualBlocksCount: number;
        mode: 'google+manual' | 'manual-only';
    }>({
        googleActive: false,
        manualBlocksCount: 0,
        mode: 'manual-only'
    });

    // Loading and blocking states
    const [isBlocking, setIsBlocking] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Calendar navigation
    const [currentDate, setCurrentDate] = useState(new Date());

    // Generate calendar grid (like in BookingsPage)
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [currentDate]);

    useEffect(() => {
        loadBlocks();
        checkGoogleStatus();
        loadConfig();

        const handleChange = () => loadBlocks();
        window.addEventListener('availability-changed', handleChange);
        return () => window.removeEventListener('availability-changed', handleChange);
    }, []);

    const checkGoogleStatus = async () => {
        const status = await getAvailabilityStatus();
        setAvailStatus(status);
        setGoogleSignedIn(status.googleActive);
    };

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true);
        try {
            await signInToGoogle();
            setGoogleSignedIn(true);
            checkGoogleStatus();
            toast({
                title: 'Google Calendar Connected',
                description: 'Your appointments will now auto-block booking times.'
            });
        } catch (error) {
            toast({
                title: 'Connection failed',
                description: 'Please check your API credentials.',
                variant: 'destructive'
            });
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleGoogleSignOut = async () => {
        setGoogleLoading(true);
        try {
            await signOutFromGoogle();
            setGoogleSignedIn(false);
            checkGoogleStatus();
            toast({
                title: 'Disconnected',
                description: 'Google Calendar sync disabled. Manual blocks still active.'
            });
        } catch (error) {
            console.error('Sign out error:', error);
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleSaveGoogleConfig = async () => {
        setGoogleLoading(true);
        try {
            await saveCalendarConfig(googleConfig);

            if (googleConfig.clientId && googleConfig.apiKey) {
                await initGoogleCalendar(googleConfig);
            }

            toast({
                title: 'Settings saved',
                description: 'Google Calendar configuration updated.'
            });
            checkGoogleStatus();
        } catch (error) {
            toast({
                title: 'Save failed',
                description: 'Please check your settings.',
                variant: 'destructive'
            });
        } finally {
            setGoogleLoading(false);
        }
    };

    const loadConfig = async () => {
        const config = await getCalendarConfig();
        setGoogleConfig(config);
    };

    const loadBlocks = async () => {
        const slots = await getBlockedSlots();
        setBlockedSlots(slots);
        const dates = await getDatesWithBlocks();
        setBlockedDates(dates);
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadBlocks();
        checkGoogleStatus();
        setTimeout(() => {
            setIsRefreshing(false);
            toast({ title: 'Refreshed', description: 'Availability data reloaded' });
        }, 500);
    };

    const handleBlockFullDay = async () => {
        if (!selectedDate) {
            toast({ title: 'Select a date first', variant: 'destructive' });
            return;
        }

        if (isBlocking) {
            toast({ title: 'Please wait', description: 'Processing previous request...', variant: 'destructive' });
            return;
        }

        setIsBlocking(true);
        const dateStr = format(selectedDate, 'yyyy-MM-dd');

        try {
            await blockFullDay(dateStr, blockReason || 'Blocked by admin');
            toast({ title: '✓ Day blocked', description: format(selectedDate, 'MMMM d, yyyy') });
            setBlockReason('');
            await loadBlocks();
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to block day', variant: 'destructive' });
        } finally {
            setTimeout(() => setIsBlocking(false), 500);
        }
    };

    const handleBlockTimeRange = async () => {
        if (!selectedDate) {
            toast({ title: 'Select a date first', variant: 'destructive' });
            return;
        }

        if (isBlocking) {
            toast({ title: 'Please wait', description: 'Processing previous request...', variant: 'destructive' });
            return;
        }

        setIsBlocking(true);
        const dateStr = format(selectedDate, 'yyyy-MM-dd');

        try {
            await blockTimeRange(dateStr, timeStart, timeEnd, blockReason || 'Time blocked');
            toast({
                title: '✓ Time blocked',
                description: `${format(selectedDate, 'MMM d')} from ${formatTimeAMPM(timeStart)} to ${formatTimeAMPM(timeEnd)}`
            });
            setBlockReason('');
            await loadBlocks();
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to block time', variant: 'destructive' });
        } finally {
            setTimeout(() => setIsBlocking(false), 500);
        }
    };

    const handleBlockRange = async () => {
        if (!rangeStart || !rangeEnd) {
            toast({ title: 'Enter start and end dates', variant: 'destructive' });
            return;
        }

        if (isBlocking) {
            toast({ title: 'Please wait', description: 'Processing previous request...', variant: 'destructive' });
            return;
        }

        setIsBlocking(true);

        try {
            await blockDateRange(rangeStart, rangeEnd, blockReason || 'Date range blocked');
            toast({
                title: '✓ Date range blocked',
                description: `${rangeStart} to ${rangeEnd}`
            });
            setRangeStart('');
            setRangeEnd('');
            setBlockReason('');
            await loadBlocks();
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to block range', variant: 'destructive' });
        } finally {
            setTimeout(() => setIsBlocking(false), 500);
        }
    };

    const handleBlockWeekends = async () => {
        const now = new Date();
        await blockWeekendsInMonth(now.getFullYear(), now.getMonth(), 'Weekends blocked');
        toast({
            title: 'Weekends blocked',
            description: `All weekends in ${format(now, 'MMMM yyyy')}`
        });
        await loadBlocks();
    };

    const handleUnblockDay = async (date: string) => {
        if (confirm(`Are you sure you want to unblock ${date}? This will remove all blocks for this day.`)) {
            await unblockDay(date);
            toast({ title: '✓ Day unblocked', description: date });
            await loadBlocks();
        }
    };

    const handleUnblockSlot = async (id: string) => {
        const slot = blockedSlots.find(s => s.id === id);
        const message = slot?.startTime && slot?.endTime
            ? `Unblock ${slot.date} from ${formatTimeAMPM(slot.startTime)} to ${formatTimeAMPM(slot.endTime)}?`
            : `Unblock entire day ${slot?.date}?`;

        if (confirm(`Are you sure?\n\n${message}`)) {
            await unblockSlot(id);
            toast({ title: '✓ Time slot unblocked' });
            await loadBlocks();
        }
    };

    const handleClearAll = async () => {
        if (confirm('⚠️ Clear ALL blocked time?\n\nThis will remove every manual block you\'ve created.\n\nThis cannot be undone!')) {
            const slots = await getBlockedSlots();
            await Promise.all(slots.map(s => unblockSlot(s.id)));

            toast({ title: '✓ All blocks cleared' });
            await loadBlocks();
        }
    };

    // Multi-date selection handler
    const handleDateClick = (date: Date, event?: React.MouseEvent) => {
        if (!event) {
            // Single select (from Calendar component)
            setSelectedDate(date);
            setSelectedDates([date]);
            setLastClickedDate(date);
            return;
        }

        if (event.ctrlKey || event.metaKey) {
            // Ctrl/Cmd: Toggle date in selection
            const dateStr = format(date, 'yyyy-MM-dd');
            const isSelected = selectedDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);

            if (isSelected) {
                setSelectedDates(selectedDates.filter(d => format(d, 'yyyy-MM-dd') !== dateStr));
            } else {
                setSelectedDates([...selectedDates, date]);
            }
            setLastClickedDate(date);
        } else if (event.shiftKey && lastClickedDate) {
            // Shift: Select range
            const start = lastClickedDate < date ? lastClickedDate : date;
            const end = lastClickedDate < date ? date : lastClickedDate;

            const range: Date[] = [];
            const current = new Date(start);

            while (current <= end) {
                range.push(new Date(current));
                current.setDate(current.getDate() + 1);
            }

            setSelectedDates(range);
            setSelectedDate(date);
        } else {
            // Normal click: Single select
            setSelectedDate(date);
            setSelectedDates([date]);
            setLastClickedDate(date);
        }
    };

    // Block multiple selected dates
    const handleBlockSelectedDates = async () => {
        if (selectedDates.length === 0) {
            toast({ title: 'No dates selected', description: 'Click dates to select them', variant: 'destructive' });
            return;
        }

        if (isBlocking) {
            toast({ title: 'Please wait', description: 'Processing previous request...', variant: 'destructive' });
            return;
        }

        setIsBlocking(true);

        try {
            await Promise.all(selectedDates.map(date => {
                const dateStr = format(date, 'yyyy-MM-dd');
                return blockFullDay(dateStr, blockReason || 'Blocked by admin');
            }));

            toast({
                title: `✓ ${selectedDates.length} day${selectedDates.length > 1 ? 's' : ''} blocked`,
                description: selectedDates.length > 1 ? 'Multiple dates blocked' : format(selectedDates[0], 'MMMM d, yyyy')
            });
            setBlockReason('');
            setSelectedDates([]);
            setSelectedDate(undefined);
            await loadBlocks();
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to block dates', variant: 'destructive' });
        } finally {
            setTimeout(() => setIsBlocking(false), 500);
        }
    };

    // Modifier for calendar to show blocked dates
    const modifiers = {
        blocked: blockedDates.map(d => new Date(d))
    };

    const modifiersStyles = {
        blocked: {
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '50%'
        }
    };

    return (
        <div>
            <PageHeader title="Availability Manager" />
            <div className="p-4 space-y-6 max-w-screen-xl mx-auto">

                {/* Status Banner */}
                <Card className="p-4 bg-gradient-to-r from-purple-950/40 via-blue-950/40 to-zinc-950 border-purple-900/30">
                    <div className="flex items-start gap-4">
                        <Shield className="w-6 h-6 text-purple-400 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                            <p className="font-bold text-purple-300 mb-2">Hybrid Availability System</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div className="flex items-center gap-2">
                                    {availStatus.googleActive ? (
                                        <>
                                            <CheckCircle className="w-4 h-4 text-green-400" />
                                            <span className="text-green-300">Google Calendar Connected</span>
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="w-4 h-4 text-yellow-400" />
                                            <span className="text-yellow-300">Manual Blocks Only</span>
                                        </>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-zinc-400">Manual Blocks:</span>
                                    <span className="font-bold text-white">{availStatus.manualBlocksCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Tabs */}
                <Tabs defaultValue="manual" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-zinc-900">
                        <TabsTrigger value="manual" className="data-[state=active]:bg-red-700">
                            Manual Blocking
                        </TabsTrigger>
                        <TabsTrigger value="google" className="data-[state=active]:bg-purple-700">
                            Google Calendar
                        </TabsTrigger>
                    </TabsList>

                    {/* Manual Blocking Tab */}
                    <TabsContent value="manual" className="space-y-6 mt-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* Calendar Picker with Multi-Select */}
                            <Card className="p-6 bg-zinc-900 border-zinc-800">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <CalendarIcon className="w-5 h-5 text-red-500" />
                                            <h3 className="font-black text-white uppercase tracking-tight">Select Dates</h3>
                                        </div>
                                        {selectedDates.length > 0 && (
                                            <Badge variant="secondary" className="bg-red-700 text-white">
                                                {selectedDates.length} selected
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Instructions */}
                                    <div className="bg-blue-950/20 border border-blue-900/30 rounded-lg p-3 space-y-1 text-xs">
                                        <p className="text-blue-300 font-bold">How to Select:</p>
                                        <p className="text-blue-200/80">• <kbd className="bg-zinc-800 px-1 rounded">Tap/Click</kbd> - Select single date</p>
                                        <p className="text-blue-200/80">• <kbd className="bg-zinc-800 px-1 rounded">Ctrl+Click</kbd> - Add/remove dates (desktop)</p>
                                        <p className="text-blue-200/80">• <kbd className="bg-zinc-800 px-1 rounded">Shift+Click</kbd> - Select range (desktop)</p>
                                        <p className="text-blue-200/80 text-[10px] mt-1 opacity-75">💡 On mobile: Tap multiple dates one by one</p>
                                    </div>

                                    {/* Custom Multi-Select Calendar */}
                                    <div className="border border-zinc-800 rounded-md p-4 bg-zinc-950">
                                        <div className="grid grid-cols-7 gap-2 mb-2">
                                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                                <div key={day} className="text-center text-xs font-bold text-zinc-500">
                                                    {day}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-7 gap-2">
                                            {calendarDays.map((day, index) => {
                                                const dateStr = format(day, 'yyyy-MM-dd');
                                                const isSelected = selectedDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
                                                const isCurrentMonth = isSameMonth(day, currentDate);
                                                const isToday = isSameDay(day, new Date());

                                                // Check block status for this day
                                                const dayBlocks = blockedSlots.filter(s => s.date === dateStr);
                                                const hasFullDayBlock = dayBlocks.some(b => !b.startTime && !b.endTime);
                                                const hasPartialBlocks = dayBlocks.some(b => b.startTime && b.endTime);
                                                const blockCount = dayBlocks.length;

                                                // Determine indicator style
                                                let indicatorClass = '';
                                                let indicatorStyle = {};

                                                if (hasFullDayBlock) {
                                                    // Solid blue circle for full day block
                                                    indicatorClass = 'after:bg-blue-500';
                                                } else if (hasPartialBlocks) {
                                                    // Check if morning or afternoon blocks
                                                    const morningBlocks = dayBlocks.filter(b => {
                                                        if (!b.startTime) return false;
                                                        const hour = parseInt(b.startTime.split(':')[0]);
                                                        return hour < 12;
                                                    });
                                                    const afternoonBlocks = dayBlocks.filter(b => {
                                                        if (!b.startTime) return false;
                                                        const hour = parseInt(b.startTime.split(':')[0]);
                                                        return hour >= 12;
                                                    });

                                                    if (morningBlocks.length > 0 && afternoonBlocks.length > 0) {
                                                        // Both morning and afternoon - striped indicator
                                                        indicatorClass = 'after:bg-gradient-to-r after:from-blue-500 via-transparent after:to-blue-500';
                                                    } else if (morningBlocks.length > 0) {
                                                        // Morning only - left half
                                                        indicatorClass = 'after:bg-gradient-to-r after:from-blue-500 after:to-transparent';
                                                    } else {
                                                        // Afternoon only - right half
                                                        indicatorClass = 'after:bg-gradient-to-l after:from-blue-500 after:to-transparent';
                                                    }
                                                }

                                                return (
                                                    <button
                                                        key={index}
                                                        type="button"
                                                        onClick={(e) => handleDateClick(day, e)}
                                                        className={cn(
                                                            "h-10 w-full rounded-md text-sm font-medium transition-all relative",
                                                            !isCurrentMonth && "text-zinc-700 opacity-50",
                                                            isCurrentMonth && !isSelected && !isToday && "text-zinc-300 hover:bg-zinc-800",
                                                            isToday && !isSelected && "border-2 border-red-500 text-white",
                                                            isSelected && "bg-red-600 text-white font-bold ring-2 ring-red-400",
                                                            (hasFullDayBlock || hasPartialBlocks) && `after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-2 after:h-2 after:rounded-full ${indicatorClass}`
                                                        )}
                                                        title={
                                                            hasFullDayBlock
                                                                ? "Full day blocked"
                                                                : hasPartialBlocks
                                                                    ? `${blockCount} time block${blockCount > 1 ? 's' : ''}`
                                                                    : undefined
                                                        }
                                                    >
                                                        {format(day, 'd')}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-xs text-zinc-400">
                                        <p className="font-bold text-zinc-300">Legend:</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                                            <span>= Full day blocked</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-transparent" />
                                            <span>= Morning blocked</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-gradient-to-l from-blue-500 to-transparent" />
                                            <span>= Afternoon blocked</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 via-transparent to-blue-500" />
                                            <span>= Multiple blocks</span>
                                        </div>
                                    </div>

                                    {selectedDates.length > 0 && (
                                        <Button
                                            onClick={() => {
                                                setSelectedDates([]);
                                                setSelectedDate(undefined);
                                            }}
                                            variant="outline"
                                            size="sm"
                                            className="w-full border-zinc-700 text-zinc-400"
                                        >
                                            Clear Selection
                                        </Button>
                                    )}
                                </div>
                            </Card>

                            {/* Quick Actions */}
                            <div className="space-y-4">

                                {/* Block Full Day(s) */}
                                <Card className="p-6 bg-zinc-900 border-zinc-800">
                                    <h4 className="font-bold text-white mb-4 uppercase tracking-tight text-sm">
                                        Block Full Day{selectedDates.length > 1 ? 's' : ''}
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <Label className="text-zinc-400 text-xs uppercase">Reason (optional)</Label>
                                            <Input
                                                className="bg-zinc-950 border-zinc-800 text-white"
                                                value={blockReason}
                                                onChange={(e) => setBlockReason(e.target.value)}
                                                placeholder="Personal day, vacation, etc."
                                            />
                                        </div>
                                        <Button
                                            onClick={handleBlockSelectedDates}
                                            disabled={selectedDates.length === 0 || isBlocking}
                                            className="w-full bg-red-700 hover:bg-red-800"
                                        >
                                            {isBlocking ? 'Blocking...' : `Block ${selectedDates.length} Day${selectedDates.length > 1 ? 's' : ''}`}
                                        </Button>
                                    </div>
                                </Card>

                                {/* Block Time Range */}
                                <Card className="p-6 bg-zinc-900 border-zinc-800">
                                    <h4 className="font-bold text-white mb-4 uppercase tracking-tight text-sm">Block Time Range</h4>
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label className="text-zinc-400 text-xs uppercase">Start Time</Label>
                                                <Input
                                                    type="time"
                                                    className="bg-zinc-950 border-zinc-800 text-white"
                                                    value={timeStart}
                                                    onChange={(e) => setTimeStart(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-zinc-400 text-xs uppercase">End Time</Label>
                                                <Input
                                                    type="time"
                                                    className="bg-zinc-950 border-zinc-800 text-white"
                                                    value={timeEnd}
                                                    onChange={(e) => setTimeEnd(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <Button
                                            onClick={handleBlockTimeRange}
                                            disabled={!selectedDate}
                                            className="w-full bg-red-700 hover:bg-red-800"
                                        >
                                            <Clock className="w-4 h-4 mr-2" />
                                            Block Time Range
                                        </Button>
                                    </div>
                                </Card>

                                {/* Block Date Range */}
                                <Card className="p-6 bg-zinc-900 border-zinc-800">
                                    <h4 className="font-bold text-white mb-4 uppercase tracking-tight text-sm">Block Date Range</h4>
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label className="text-zinc-400 text-xs uppercase">Start Date</Label>
                                                <Input
                                                    type="date"
                                                    className="bg-zinc-950 border-zinc-800 text-white"
                                                    value={rangeStart}
                                                    onChange={(e) => setRangeStart(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-zinc-400 text-xs uppercase">End Date</Label>
                                                <Input
                                                    type="date"
                                                    className="bg-zinc-950 border-zinc-800 text-white"
                                                    value={rangeEnd}
                                                    onChange={(e) => setRangeEnd(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <Button
                                            onClick={handleBlockRange}
                                            className="w-full bg-red-700 hover:bg-red-800"
                                        >
                                            Block Date Range
                                        </Button>
                                    </div>
                                </Card>

                                {/* Quick Actions */}
                                <Card className="p-6 bg-zinc-900 border-zinc-800">
                                    <h4 className="font-bold text-white mb-4 uppercase tracking-tight text-sm">Quick Actions</h4>
                                    <div className="space-y-2">
                                        <Button
                                            onClick={handleBlockWeekends}
                                            variant="outline"
                                            className="w-full border-zinc-700 text-white hover:bg-zinc-800"
                                        >
                                            Block All Weekends This Month
                                        </Button>
                                        <Button
                                            onClick={handleClearAll}
                                            variant="outline"
                                            className="w-full border-red-700 text-red-500 hover:bg-red-950/20"
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Clear All Blocks
                                        </Button>
                                    </div>
                                </Card>
                            </div>
                        </div>

                        {/* Blocked Slots List */}
                        <Card className="p-6 bg-zinc-900 border-zinc-800">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-black text-white uppercase tracking-tight">Current Blocks ({blockedSlots.length})</h3>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                    className="border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
                                >
                                    <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    Refresh
                                </Button>
                            </div>

                            {blockedSlots.length === 0 ? (
                                <p className="text-zinc-500 text-center py-8">No blocked time slots</p>
                            ) : (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {blockedSlots.map((slot) => (
                                        <div
                                            key={slot.id}
                                            className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-white">{slot.date}</span>
                                                    {slot.startTime && slot.endTime ? (
                                                        <span className="text-sm text-zinc-400">
                                                            {formatTimeAMPM(slot.startTime)} - {formatTimeAMPM(slot.endTime)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-blue-400 font-bold">FULL DAY</span>
                                                    )}
                                                </div>
                                                {slot.reason && (
                                                    <p className="text-xs text-zinc-500 mt-1">{slot.reason}</p>
                                                )}
                                            </div>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="text-zinc-500 hover:text-red-500"
                                                onClick={() => handleUnblockSlot(slot.id)}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </TabsContent>

                    {/* Google Calendar Tab */}
                    <TabsContent value="google" className="space-y-6 mt-6">

                        {/* Privacy Notice */}
                        <Card className="p-6 bg-blue-950/20 border-blue-900/30">
                            <div className="flex items-start gap-4">
                                <Shield className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                                <div className="space-y-2">
                                    <h3 className="font-bold text-blue-400 uppercase tracking-tight">Privacy Protected</h3>
                                    <p className="text-sm text-zinc-400 leading-relaxed">
                                        This integration only checks if you're <strong>busy or free</strong>. Event titles, descriptions, and personal details are <strong>never</strong> accessed or displayed. Your appointments automatically block booking times without exposing any information.
                                    </p>
                                </div>
                            </div>
                        </Card>

                        {/* API Configuration */}
                        <Card className="p-6 bg-zinc-900 border-zinc-800">
                            <h3 className="font-black text-white uppercase tracking-tight mb-4">Google Calendar API Setup</h3>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-zinc-400 text-xs uppercase font-bold">Client ID</Label>
                                    <Input
                                        className="bg-zinc-950 border-zinc-800 text-white font-mono text-xs"
                                        value={googleConfig.clientId}
                                        onChange={(e) => setGoogleConfig({ ...googleConfig, clientId: e.target.value })}
                                        placeholder="123456789-abc123.apps.googleusercontent.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-zinc-400 text-xs uppercase font-bold">API Key</Label>
                                    <Input
                                        type="password"
                                        className="bg-zinc-950 border-zinc-800 text-white font-mono text-xs"
                                        value={googleConfig.apiKey}
                                        onChange={(e) => setGoogleConfig({ ...googleConfig, apiKey: e.target.value })}
                                        placeholder="AIza..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-zinc-400 text-xs uppercase font-bold">Calendar ID</Label>
                                    <Input
                                        className="bg-zinc-950 border-zinc-800 text-white font-mono text-xs"
                                        value={googleConfig.calendarIds[0] || 'primary'}
                                        onChange={(e) => setGoogleConfig({ ...googleConfig, calendarIds: [e.target.value] })}
                                        placeholder="primary"
                                    />
                                </div>

                                <div className="flex justify-end gap-2">
                                    <Button
                                        onClick={handleSaveGoogleConfig}
                                        disabled={googleLoading}
                                        className="bg-purple-700 hover:bg-purple-800"
                                    >
                                        {googleLoading ? 'Saving...' : 'Save Configuration'}
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        {/* Connection Status */}
                        {googleConfig.clientId && googleConfig.apiKey && (
                            <Card className="p-6 bg-zinc-900 border-zinc-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${googleSignedIn ? 'bg-green-500' : 'bg-zinc-600'}`} />
                                        <div>
                                            <h3 className="font-bold text-white">Calendar Connection</h3>
                                            <p className="text-sm text-zinc-400">
                                                {googleSignedIn ? 'Connected and syncing' : 'Not connected'}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={googleSignedIn ? handleGoogleSignOut : handleGoogleSignIn}
                                        disabled={googleLoading}
                                        className={googleSignedIn ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-purple-700 hover:bg-purple-800'}
                                    >
                                        {googleLoading ? 'Processing...' : googleSignedIn ? 'Disconnect' : 'Connect Calendar'}
                                    </Button>
                                </div>
                            </Card>
                        )}

                        {/* Setup Instructions */}
                        <Card className="p-6 bg-zinc-900 border-zinc-800">
                            <h3 className="font-bold text-white mb-4">Setup Instructions</h3>
                            <div className="space-y-3 text-sm text-zinc-400">
                                <div className="flex gap-3">
                                    <span className="font-bold text-purple-400">1.</span>
                                    <p>Visit <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-purple-400 underline">Google Cloud Console</a></p>
                                </div>
                                <div className="flex gap-3">
                                    <span className="font-bold text-purple-400">2.</span>
                                    <p>Create a project and enable Google Calendar API</p>
                                </div>
                                <div className="flex gap-3">
                                    <span className="font-bold text-purple-400">3.</span>
                                    <p>Create OAuth 2.0 credentials (Web application)</p>
                                </div>
                                <div className="flex gap-3">
                                    <span className="font-bold text-purple-400">4.</span>
                                    <p>Create an API Key</p>
                                </div>
                                <div className="flex gap-3">
                                    <span className="font-bold text-purple-400">5.</span>
                                    <p>Enter credentials above and click "Save Configuration"</p>
                                </div>
                                <div className="flex gap-3">
                                    <span className="font-bold text-purple-400">6.</span>
                                    <p>Click "Connect Calendar" to authorize access</p>
                                </div>
                            </div>
                            <div className="mt-4 p-3 bg-yellow-950/20 border border-yellow-900/30 rounded-lg">
                                <p className="text-xs text-yellow-200">
                                    <strong>Note:</strong> See <code className="bg-zinc-950 px-1 py-0.5 rounded">CALENDAR_SETUP_GUIDE.md</code> for detailed instructions.
                                </p>
                            </div>
                        </Card>

                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
