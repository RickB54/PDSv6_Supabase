import { useState, useEffect, useMemo } from 'react';
import localforage from 'localforage';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from '@/components/PageHeader';
import {
    getBlockedSlots,
    blockFullDay,
    blockTimeRange,
    unblockDay,
    unblockSlot,
    blockDateRange,
    unblockDateRange,
    blockWeekendsInMonth,
    getDatesWithBlocks,
    BlockedTimeSlot,
    formatTimeAMPM,
    setBulkAvailability
} from '@/lib/availability';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { addDays, subDays } from 'date-fns';
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
import { Calendar as CalendarIcon, Clock, X, Plus, Trash2, AlertCircle, Shield, CheckCircle, RefreshCw, Zap, CalendarCheck, HelpCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { useBookingsStore } from '@/store/bookings';
import * as bookingsSvc from '@/services/supabase/bookings';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateBookingPDF, uploadToFileManager } from '@/lib/bookingsSync';
import api from '@/lib/api';
import HelpModal from '@/components/help/HelpModal';
import { getCurrentUser } from '@/lib/auth';

/**
 * Admin Calendar Manager
 * Quick and easy availability blocking
 */
import { useDemoMode } from '@/contexts/DemoContext';

export default function AvailabilityManager() {
    const { isDemoMode } = useDemoMode();
    const { items, refresh: refreshBookings } = useBookingsStore();
    const { toast } = useToast();

    // Secondary security guard for deep-links
    if (isDemoMode) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <Shield className="w-16 h-16 text-zinc-700 mb-4" />
                <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Restricted Section</h2>
                <p className="text-zinc-500 max-w-md mx-auto mb-6">
                    The Hybrid Availability System contains sensitive administrative logic and is not available in the Interactive Demo.
                </p>
                <Button variant="outline" onClick={() => window.location.href = '/bookings-analytics'}>
                    Return to Dashboard
                </Button>
            </div>
        );
    }
    const [blockedSlots, setBlockedSlots] = useState<BlockedTimeSlot[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedDates, setSelectedDates] = useState<Date[]>([]); // Multi-select support
    const [lastClickedDate, setLastClickedDate] = useState<Date | undefined>(undefined); // For shift-select
    const [blockedDates, setBlockedDates] = useState<string[]>([]);

    // Manual Booking State
    const [showManualBooking, setShowManualBooking] = useState(false);
    const [manualBooking, setManualBooking] = useState({
        name: '',
        phone: '',
        email: '',
        service: 'Prime Essential Interior',
        time: '09:00',
        make: '',
        model: '',
        year: '',
        address: ''
    });

    // Quick block states
    const [rangeStart, setRangeStart] = useState('');
    const [rangeEnd, setRangeEnd] = useState('');
    const [blockReason, setBlockReason] = useState('');
    const [isUnblockMode, setIsUnblockMode] = useState(false);
    const [rangeHistory, setRangeHistory] = useState<Array<{ start: string; end: string; reason?: string }>>([]);

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
    const [calIdsInput, setCalIdsInput] = useState('primary');
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
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isBlocking, setIsBlocking] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Monthly Planner State
    const [plannerStartDate, setPlannerStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [plannerDays, setPlannerDays] = useState<Array<{ date: string; morningOpen: boolean; afternoonOpen: boolean }>>([]);
    const [isSavingPlanner, setIsSavingPlanner] = useState(false);

    // Google Config
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

    // Compute contiguous blocked ranges from the currently loaded blockedSlots
    const currentBlockedRanges = useMemo(() => {
        // Filter for full-day blocks (no specific time)
        const fullDayBlocks = blockedSlots
            .filter(b => (!b.startTime && !b.endTime) || (b.startTime === '08:00' && b.endTime === '16:00'))
            .sort((a, b) => a.date.localeCompare(b.date));

        if (fullDayBlocks.length === 0) return [];

        const ranges: Array<{ start: string; end: string; reason?: string }> = [];
        let currentRange: { start: string; end: string; reason?: string } | null = null;

        fullDayBlocks.forEach((block, idx) => {
            if (!currentRange) {
                currentRange = { start: block.date, end: block.date, reason: block.reason };
            } else {
                // Parse date in ISO format safely
                const lastDate = parseISO(currentRange.end);
                const thisDate = parseISO(block.date);
                const diff = (thisDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

                // If consecutive AND same reason, extend the range
                if (diff === 1 && block.reason === currentRange.reason) {
                    currentRange.end = block.date;
                } else {
                    ranges.push(currentRange);
                    currentRange = { start: block.date, end: block.date, reason: block.reason };
                }
            }
            if (idx === fullDayBlocks.length - 1 && currentRange) {
                ranges.push(currentRange);
            }
        });

        // Dedup / sort by start date
        return ranges.sort((a, b) => a.start.localeCompare(b.start));
    }, [blockedSlots]);

    useEffect(() => {
        const loadHistory = async () => {
            const history = await localforage.getItem<any[]>('range-blocking-history');
            if (history) setRangeHistory(history.slice(0, 10));
        };
        loadHistory();
    }, []);

    useEffect(() => {
        loadBlocks();
        checkGoogleStatus();
        loadConfig();
        refreshBookings();

        const handleChange = () => loadBlocks();
        const handleGoogleAuth = () => checkGoogleStatus();

        window.addEventListener('availability-changed', handleChange);
        window.addEventListener('g_cal_auth_complete', handleGoogleAuth);

        return () => {
            window.removeEventListener('availability-changed', handleChange);
            window.removeEventListener('g_cal_auth_complete', handleGoogleAuth);
        };
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
        } catch (error: any) {
            console.error('Connection Error:', error);
            toast({
                title: 'Connection failed',
                description: error.message || 'Please check your API credentials.',
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
            // Force status check
            const status = await getAvailabilityStatus();
            setAvailStatus(status);
            toast({
                title: 'Disconnected',
                description: 'Google Calendar sync disabled. Manual blocks still active.'
            });
        } catch (error) {
            console.error('Sign out error:', error);
            toast({ title: 'Logout fail', variant: 'destructive' });
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleReset = async () => {
        setGoogleLoading(true);
        try {
            await signOutFromGoogle();
            localStorage.clear();
            window.location.reload();
        } catch (e) {
            setGoogleLoading(false);
        }
    };

    const handleSaveGoogleConfig = async () => {
        setGoogleLoading(true);
        try {
            const parsedCalendarIds = calIdsInput.split(',').map(id => id.trim()).filter(id => id !== '');
            const updatedConfig = { ...googleConfig, calendarIds: parsedCalendarIds };
            setGoogleConfig(updatedConfig); // Update local state immediately

            await saveCalendarConfig(updatedConfig);

            if (updatedConfig.clientId && updatedConfig.apiKey) {
                await initGoogleCalendar(updatedConfig);
            }

            toast({
                title: 'Settings saved',
                description: 'Google Calendar configuration updated.'
            });
            checkGoogleStatus();
        } catch (error: any) {
            console.error('Google Config Save Error:', error);
            const errorMessage = error.message || (typeof error === 'string' ? error : 'Please check your settings.');
            toast({
                title: 'Save failed',
                description: errorMessage,
                variant: 'destructive'
            });
        } finally {
            setGoogleLoading(false);
        }
    };

    const loadConfig = async () => {
        try {
            const config = await getCalendarConfig();
            setGoogleConfig(config);
            setCalIdsInput(config.calendarIds.join(', '));
            if (config.clientId && config.apiKey) {
                initGoogleCalendar(config).catch(console.error);
            }
        } catch (error) {
            console.error('Load config error:', error);
        }
    };

    const loadBlocks = async () => {
        const slots = await getBlockedSlots();
        setBlockedSlots(slots);
        const dates = await getDatesWithBlocks();
        setBlockedDates(dates);
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await Promise.all([
            loadBlocks(),
            refreshBookings()
        ]);
        checkGoogleStatus();
        setTimeout(() => {
            setIsRefreshing(false);
            toast({ title: 'Refreshed', description: 'Availability data reloaded' });
        }, 500);
    };

    const initPlanner = () => {
        const start = new Date(plannerStartDate + 'T12:00:00');
        const days = [];
        for (let i = 0; i < 28; i++) {
            const d = addDays(start, i);
            days.push({
                date: format(d, 'yyyy-MM-dd'),
                morningOpen: false,
                afternoonOpen: false
            });
        }
        setPlannerDays(days);
        toast({
            title: 'Planner Prepared',
            description: 'All 28 days initially blocked. Check the boxes to open specific slots.'
        });
    };

    const handleSavePlanner = async () => {
        setIsSavingPlanner(true);
        try {
            await setBulkAvailability(plannerDays, 'Set via Monthly Planner');
            toast({
                title: 'Schedule Updated',
                description: 'Bulk availability has been applied successfully.'
            });
            await loadBlocks();
        } catch (error) {
            console.error('Planner Error:', error);
            toast({ title: 'Failed to update schedule', variant: 'destructive' });
        } finally {
            setIsSavingPlanner(false);
        }
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
            
            // Save to history
            const newRange = { start: rangeStart, end: rangeEnd, reason: blockReason };
            setRangeHistory(prev => {
                const next = [newRange, ...prev.filter(r => !(r.start === newRange.start && r.end === newRange.end))].slice(0, 10);
                localforage.setItem('range-blocking-history', next);
                return next;
            });

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

    const handleUnblockRange = async () => {
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
            await unblockDateRange(rangeStart, rangeEnd);
            toast({
                title: '✓ Date range unblocked',
                description: `Cleared all blocks from ${rangeStart} to ${rangeEnd}`
            });
            setRangeStart('');
            setRangeEnd('');
            await loadBlocks();
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to unblock range', variant: 'destructive' });
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

    // Unblock multiple selected dates
    const handleDeleteSelectedDates = async () => {
        if (selectedDates.length === 0) return;

        setIsDeleting(true);
        try {
            await Promise.all(selectedDates.map(date => {
                const dateStr = format(date, 'yyyy-MM-dd');
                return unblockDay(dateStr);
            }));

            toast({
                title: `✓ Blocks Cleared`,
                description: `Cleared all blocks for ${selectedDates.length} selected date${selectedDates.length > 1 ? 's' : ''}.`
            });

            setSelectedDates([]);
            setSelectedDate(undefined);
            await loadBlocks();
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to clear blocks', variant: 'destructive' });
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
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

    const handleCreateManualBooking = async () => {
        if (!selectedDate) {
            toast({ title: "Select a date first", variant: "destructive" });
            return;
        }
        if (!manualBooking.name) {
            toast({ title: "Name is required", variant: "destructive" });
            return;
        }

        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const dateTime = `${dateStr}T${manualBooking.time}:00`;

            const bookingId = await bookingsSvc.create({
                customer_name: manualBooking.name,
                phone: manualBooking.phone,
                email: manualBooking.email,
                address: manualBooking.address || '',
                vehicle_type: 'Unknown',
                make: manualBooking.make,
                model: manualBooking.model,
                year: manualBooking.year,
                package: manualBooking.service,
                add_ons: [],
                date: new Date(dateTime).toISOString(),
                price_total: 0,
                status: 'confirmed',
                booked_by: 'Admin Manual',
                notes: 'Manual Entry via Availability Manager'
            });

            // Requirement: PDF + Email for Manual Entry
            const dateIso = new Date(dateTime).toISOString();
            const bookingForPdf = {
                id: `manual_${Date.now()}`,
                title: manualBooking.service,
                customer: manualBooking.name,
                date: dateIso,
                status: "confirmed"
            };

            const pdfDataUrl = generateBookingPDF(bookingForPdf as any, {
                vehicle: `${manualBooking.year} ${manualBooking.make} ${manualBooking.model}`,
                service: manualBooking.service,
                price: 0,
                notes: 'Manual Entry via Admin',
            });

            try {
                const d = new Date(dateIso);
                const year = d.getFullYear();
                const monthName = d.toLocaleString(undefined, { month: "long" });
                const path = `Bookings ${year}/${monthName}/`;
                uploadToFileManager(pdfDataUrl, path, bookingForPdf as any, { service: manualBooking.service, price: 0 });
            } catch (err) { console.error("PDF Upload Failed:", err); }

            const payload = {
                customer: { name: manualBooking.name, email: manualBooking.email, phone: manualBooking.phone },
                vehicle: { year: manualBooking.year, make: manualBooking.make, model: manualBooking.model, type: 'Manual' },
                service: manualBooking.service,
                addOns: [],
                date: dateIso,
                total: 0,
                notes: 'Manual Entry',
                pdfDataUrl
            };

            try {
                await api('/api/email/admin', { method: 'POST', body: JSON.stringify(payload) });
                if (manualBooking.email) {
                    await api('/api/email/customer', { method: 'POST', body: JSON.stringify({ to: manualBooking.email, ...payload }) });
                }
            } catch (err) { console.error("Email Mock Failed:", err); }

            toast({ title: "Booking Created", description: `${manualBooking.name} on ${dateStr} (PDF Saved)` });
            setShowManualBooking(false);
            setManualBooking({ name: '', phone: '', email: '', service: 'Prime Essential Interior', time: '09:00', make: '', model: '', year: '', address: '' });
            await refreshBookings();
            await loadBlocks();
        } catch (e: any) {
            console.error(e);
            toast({ title: "Error creating booking", description: e.message || "Unknown error", variant: "destructive" });
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
                            <div className="flex items-center gap-3 mb-2">
                                <p className="font-bold text-purple-300">Hybrid Availability System</p>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                                    onClick={() => {
                                        window.dispatchEvent(new CustomEvent('open-help', { 
                                            detail: { topicId: 'availability-manager', role: getCurrentUser()?.role } 
                                        }));
                                    }}
                                    title="System Guide"
                                >
                                    <HelpCircle className="h-4 w-4" />
                                </Button>
                            </div>
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

                {/* 4-Week Planner Accordion */}
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="planner" className="border-none">
                        <AccordionTrigger className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:no-underline group transition-all hover:bg-zinc-800/80">
                            <div className="flex items-center gap-4 text-left">
                                <div className="p-2 rounded-lg bg-orange-600/20 text-orange-500 group-hover:scale-110 transition-transform">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-black text-white uppercase tracking-tight flex items-center flex-wrap gap-2">
                                        4-Week Availability Planner
                                        {plannerDays.length > 0 && (
                                            <span className="text-[10px] text-orange-400 font-bold border border-orange-500/30 px-2 py-0.5 rounded-full bg-orange-500/10 animate-pulse">
                                                Active Range: {format(new Date(plannerDays[0].date + 'T12:00:00'), 'MMM d')} - {format(new Date(plannerDays[27].date + 'T12:00:00'), 'MMM d')}
                                            </span>
                                        )}
                                    </h3>
                                    <p className="text-xs text-zinc-400">Opt-in mode: Total control over what dates/slots are sent to the live website</p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4 px-1 pb-2">
                            <Card className="p-6 bg-zinc-950 border-zinc-900 space-y-6 shadow-2xl">
                                <div className="flex flex-col md:flex-row items-end gap-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
                                    <div className="space-y-2">
                                        <Label className="text-zinc-500 text-[10px] uppercase font-black tracking-widest">Start Date</Label>
                                        <Input
                                            type="date"
                                            className="bg-zinc-950 border-zinc-800 text-white w-48 h-10 ring-offset-zinc-950"
                                            value={plannerStartDate}
                                            onChange={(e) => setPlannerStartDate(e.target.value)}
                                        />
                                    </div>
                                    <Button
                                        onClick={initPlanner}
                                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold h-10 px-6 transition-all active:scale-95"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Initialize Window
                                    </Button>
                                    {plannerDays.length > 0 && (
                                        <Button
                                            onClick={handleSavePlanner}
                                            disabled={isSavingPlanner}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest shadow-lg shadow-emerald-900/40 px-8 h-10 ml-auto transition-all active:scale-95 border-b-4 border-emerald-800 active:border-b-0"
                                        >
                                            {isSavingPlanner ? 'Sending to Live Site...' : 'Update Live Website Availability'}
                                        </Button>
                                    )}
                                </div>

                                {plannerDays.length > 0 ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 max-h-[450px] overflow-y-auto pr-2 pb-4 scrollbar-thin scrollbar-thumb-zinc-800">
                                            {plannerDays.map((day, idx) => (
                                                <div key={day.date} className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg space-y-3 shadow-inner hover:border-zinc-700 transition-colors">
                                                    <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                                                        <span className="font-bold text-white text-[11px] whitespace-nowrap">{format(new Date(day.date + 'T12:00:00'), 'EEE, MMM d')}</span>
                                                        <span className="text-[9px] text-zinc-600 uppercase font-black">{idx + 1}/28</span>
                                                    </div>
                                                    <div className="flex flex-col gap-1.5">
                                                        <button
                                                            onClick={() => {
                                                                const next = [...plannerDays];
                                                                next[idx].morningOpen = !next[idx].morningOpen;
                                                                setPlannerDays(next);
                                                            }}
                                                            className={cn(
                                                                "w-full py-2 rounded-md text-[9px] font-black uppercase transition-all border flex items-center justify-center gap-1.5",
                                                                day.morningOpen
                                                                    ? "bg-emerald-900/40 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                                                                    : "bg-zinc-950 border-zinc-800 text-zinc-600 opacity-60 hover:opacity-100"
                                                            )}
                                                        >
                                                            <div className={cn("w-1.5 h-1.5 rounded-full", day.morningOpen ? "bg-emerald-400" : "bg-zinc-800")} />
                                                            {day.morningOpen ? 'Morning Open' : 'Morning Blocked'}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const next = [...plannerDays];
                                                                next[idx].afternoonOpen = !next[idx].afternoonOpen;
                                                                setPlannerDays(next);
                                                            }}
                                                            className={cn(
                                                                "w-full py-2 rounded-md text-[9px] font-black uppercase transition-all border flex items-center justify-center gap-1.5",
                                                                day.afternoonOpen
                                                                    ? "bg-sky-900/40 border-sky-500 text-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.15)]"
                                                                    : "bg-zinc-950 border-zinc-800 text-zinc-600 opacity-60 hover:opacity-100"
                                                            )}
                                                        >
                                                            <div className={cn("w-1.5 h-1.5 rounded-full", day.afternoonOpen ? "bg-sky-400" : "bg-zinc-800")} />
                                                            {day.afternoonOpen ? 'Afternoon Open' : 'Afternoon Blocked'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-3 bg-blue-950/20 p-3 rounded-lg border border-blue-900/30">
                                            <AlertCircle className="w-4 h-4 text-blue-400" />
                                            <p className="text-[10px] text-blue-300 font-medium leading-relaxed">
                                                <strong>Security Logic:</strong> Applying this schedule will overwrite existing manual blocks for these 28 dates to match exactly what you've selected above.
                                                <span className="text-blue-400 ml-1">Confirmed customer bookings will always remain visible and respected on your calendar.</span>
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-20 border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-900/40 group hover:bg-zinc-900/60 transition-colors">
                                        <div className="bg-zinc-950 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800 shadow-xl group-hover:scale-110 transition-transform">
                                            <CalendarCheck className="w-10 h-10 text-zinc-700" />
                                        </div>
                                        <p className="text-zinc-300 text-sm font-black uppercase tracking-widest">Monthly Schedule Sweep</p>
                                        <p className="text-zinc-500 max-w-xs mx-auto text-xs mt-2 leading-relaxed font-medium">
                                            Perfect for when you want to stay mostly closed and only open up specific slots. Initialize to see your 4-week window.
                                        </p>
                                    </div>
                                )}
                            </Card>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

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
                        <div className="flex justify-between items-center bg-zinc-900 p-4 rounded-lg border border-zinc-800">
                            <div>
                                <h3 className="font-bold text-white">Quick Actions</h3>
                                <p className="text-xs text-zinc-400">Manage blocks and bookings</p>
                            </div>
                            <Dialog open={showManualBooking} onOpenChange={setShowManualBooking}>
                                <DialogTrigger asChild>
                                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Manual Booking
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
                                    <DialogHeader>
                                        <DialogTitle>Add Manual Booking</DialogTitle>
                                        <DialogDescription>Create a confirmed booking for {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'selected date'}.</DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Customer Name</Label>
                                                <Input value={manualBooking.name} onChange={e => setManualBooking({ ...manualBooking, name: e.target.value })} className="bg-zinc-900 border-zinc-700" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Phone</Label>
                                                <Input value={manualBooking.phone} onChange={e => setManualBooking({ ...manualBooking, phone: e.target.value })} className="bg-zinc-900 border-zinc-700" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="space-y-2">
                                                <Label>Year</Label>
                                                <Input value={manualBooking.year} onChange={e => setManualBooking({ ...manualBooking, year: e.target.value })} className="bg-zinc-900 border-zinc-700" placeholder="2024" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Make</Label>
                                                <Input value={manualBooking.make} onChange={e => setManualBooking({ ...manualBooking, make: e.target.value })} className="bg-zinc-900 border-zinc-700" placeholder="Ford" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Model</Label>
                                                <Input value={manualBooking.model} onChange={e => setManualBooking({ ...manualBooking, model: e.target.value })} className="bg-zinc-900 border-zinc-700" placeholder="F-150" />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Service Package</Label>
                                            <Select value={manualBooking.service} onValueChange={v => setManualBooking({ ...manualBooking, service: v })}>
                                                <SelectTrigger className="bg-zinc-900 border-zinc-700">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                                    <SelectItem value="Prime Essential Interior">Prime Essential Interior</SelectItem>
                                                    <SelectItem value="Prime Essential Exterior">Prime Essential Exterior</SelectItem>
                                                    <SelectItem value="Prime Essential Full">Prime Essential Full</SelectItem>
                                                    <SelectItem value="Prime Elite Interior">Prime Elite Interior</SelectItem>
                                                    <SelectItem value="Prime Elite Exterior">Prime Elite Exterior</SelectItem>
                                                    <SelectItem value="Prime Elite Full">Prime Elite Full</SelectItem>
                                                    <SelectItem value="Custom Service">Custom Service</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Time</Label>
                                            <Input type="time" value={manualBooking.time} onChange={e => setManualBooking({ ...manualBooking, time: e.target.value })} className="bg-zinc-900 border-zinc-700" />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleCreateManualBooking} className="bg-emerald-600 hover:bg-emerald-700">Confirm Booking</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>

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
                                                // Also include real bookings in the indicators
                                                const dayBookings = items.filter(b => {
                                                    try {
                                                        return isSameDay(parseISO(b.date), day);
                                                    } catch (e) { return false; }
                                                });

                                                const hasFullDayBlock = dayBlocks.some(b => !b.startTime && !b.endTime);
                                                const hasPartialBlocks = dayBlocks.some(b => b.startTime && b.endTime) || dayBookings.length > 0;
                                                const blockCount = dayBlocks.length + dayBookings.length;

                                                // Determine indicator style
                                                let indicatorClass = '';

                                                if (hasFullDayBlock) {
                                                    // Solid blue circle for full day block
                                                    indicatorClass = 'after:bg-blue-500';
                                                } else if (hasPartialBlocks) {
                                                    // Check if morning or afternoon blocks/bookings
                                                    const hasMorning = dayBlocks.some(b => {
                                                        if (!b.startTime) return false;
                                                        return parseInt(b.startTime.split(':')[0]) < 12;
                                                    }) || dayBookings.some(b => {
                                                        const hour = parseISO(b.date).getHours();
                                                        return hour < 12;
                                                    });

                                                    const hasAfternoon = dayBlocks.some(b => {
                                                        if (!b.startTime) return false;
                                                        return parseInt(b.startTime.split(':')[0]) >= 12;
                                                    }) || dayBookings.some(b => {
                                                        const hour = parseISO(b.date).getHours();
                                                        return hour >= 12;
                                                    });

                                                    if (hasMorning && hasAfternoon) {
                                                        // Both morning and afternoon - solid deep blue
                                                        indicatorClass = 'after:bg-[#1e3a8a]';
                                                    } else if (hasMorning) {
                                                        // Morning only - left half (Deep dark blue transitioning smoothly to white)
                                                        indicatorClass = 'after:bg-[linear-gradient(90deg,#1e3a8a_0%,#ffffff_100%)] after:ring-1 after:ring-zinc-200';
                                                    } else if (hasAfternoon) {
                                                        // Afternoon only - right half (White transitioning smoothly to deep dark blue)
                                                        indicatorClass = 'after:bg-[linear-gradient(90deg,#ffffff_0%,#1e3a8a_100%)] after:ring-1 after:ring-zinc-200';
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
                                        <div className="space-y-2">
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
                                            <Button
                                                onClick={() => setShowDeleteConfirm(true)}
                                                variant="outline"
                                                size="sm"
                                                className="w-full border-red-900/50 text-red-500 hover:bg-red-950/20"
                                            >
                                                <X className="w-3 h-3 mr-2" />
                                                Delete Selection
                                            </Button>
                                        </div>
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
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-bold text-white uppercase tracking-tight text-sm">
                                            {isUnblockMode ? 'Unblock' : 'Block'} Date Range
                                        </h4>
                                        <div className="flex items-center gap-2 bg-zinc-950 p-1 px-2 rounded-full border border-zinc-800">
                                            <span className={cn("text-[10px] font-black tracking-widest", !isUnblockMode ? "text-red-500" : "text-zinc-500")}>BLOCK</span>
                                            <Switch
                                                checked={isUnblockMode}
                                                onCheckedChange={setIsUnblockMode}
                                                className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-red-700 h-5 w-9 scale-90"
                                            />
                                            <span className={cn("text-[10px] font-black tracking-widest", isUnblockMode ? "text-emerald-500" : "text-zinc-500")}>UNBLOCK</span>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        {(currentBlockedRanges.length > 0 || rangeHistory.length > 0) && (
                                            <div className="space-y-2 animate-in slide-in-from-top-1 duration-300">
                                                <Label className="text-zinc-500 text-[10px] uppercase font-bold tracking-tight">Select Predefined Range</Label>
                                                <Select onValueChange={(val) => {
                                                    const [start, end, reason] = val.split('|');
                                                    setRangeStart(start);
                                                    setRangeEnd(end);
                                                    if (reason && reason !== 'undefined') setBlockReason(reason);
                                                }}>
                                                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-300 text-xs h-9">
                                                        <SelectValue placeholder="Quick select a date range..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                                                        {currentBlockedRanges.length > 0 && (
                                                            <SelectGroup>
                                                                <SelectLabel className="text-emerald-500 text-[10px] uppercase">Active Blocked Ranges</SelectLabel>
                                                                {currentBlockedRanges.map((r, i) => (
                                                                    <SelectItem key={`curr-${i}`} value={`${r.start}|${r.end}|${r.reason}`} className="text-xs">
                                                                        {format(parseISO(r.start), 'MMM d')} - {format(parseISO(r.end), 'MMM d')} {r.reason ? `(${r.reason})` : ''}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectGroup>
                                                        )}
                                                        {rangeHistory.some(h => !currentBlockedRanges.some(c => c.start === h.start && c.end === h.end)) && (
                                                            <SelectGroup>
                                                                <SelectLabel className="text-blue-500 text-[10px] uppercase">Recent History</SelectLabel>
                                                                {rangeHistory.filter(h => !currentBlockedRanges.some(c => c.start === h.start && c.end === h.end)).map((r, i) => (
                                                                    <SelectItem key={`hist-${i}`} value={`${r.start}|${r.end}|${r.reason}`} className="text-xs">
                                                                        {format(parseISO(r.start), 'MMM d')} - {format(parseISO(r.end), 'MMM d')} {r.reason ? `(${r.reason})` : ''}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectGroup>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label className="text-zinc-400 text-xs uppercase font-bold">Start Date</Label>
                                                <Input
                                                    type="date"
                                                    className="bg-zinc-950 border-zinc-800 text-white"
                                                    value={rangeStart}
                                                    onChange={(e) => setRangeStart(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-zinc-400 text-xs uppercase font-bold">End Date</Label>
                                                <Input
                                                    type="date"
                                                    className="bg-zinc-950 border-zinc-800 text-white"
                                                    value={rangeEnd}
                                                    onChange={(e) => setRangeEnd(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        
                                        {!isUnblockMode && (
                                            <div className="space-y-2 animate-in fade-in duration-300">
                                                <Label className="text-zinc-400 text-xs uppercase font-bold">Reason (optional)</Label>
                                                <Input
                                                    className="bg-zinc-950 border-zinc-800 text-white"
                                                    value={blockReason}
                                                    onChange={(e) => setBlockReason(e.target.value)}
                                                    placeholder="Vacation, seasonal closure..."
                                                />
                                            </div>
                                        )}

                                        <Button
                                            onClick={isUnblockMode ? handleUnblockRange : handleBlockRange}
                                            disabled={isBlocking}
                                            className={cn(
                                                "w-full font-bold uppercase tracking-widest transition-all",
                                                isUnblockMode 
                                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                                                    : "bg-red-700 hover:bg-red-800 text-white"
                                            )}
                                        >
                                            {isBlocking ? 'Processing...' : `${isUnblockMode ? 'Unblock' : 'Block'} Date Range`}
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
                                    <h3 className="font-bold text-blue-400 uppercase tracking-tight">Administrative Transparency</h3>
                                    <p className="text-sm text-zinc-400 leading-relaxed">
                                        Your personal calendar events are now synchronized with full <strong>titles and descriptions</strong> for your visibility in the administrative dashboard. <strong>Privacy is still maintained:</strong> public customers will only see these slots as "Booked" or "Unavailable" without any personal details.
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
                                    <Label className="text-zinc-400 text-xs uppercase font-bold">Calendar IDs (comma separated)</Label>
                                    <Input
                                        className="bg-zinc-950 border-zinc-800 text-white font-mono text-xs"
                                        value={calIdsInput}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setCalIdsInput(val);
                                            // Silently update config in background
                                            const ids = val.split(',').map(s => s.trim()).filter(Boolean);
                                            setGoogleConfig(prev => ({ ...prev, calendarIds: ids }));
                                        }}
                                        placeholder="primary, rberube54@gmail.com"
                                    />
                                    <p className="text-[10px] text-zinc-500 italic">
                                        Use "primary" for your main account. Add shared calendar emails separated by commas.
                                    </p>
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
                                    <div className="flex gap-2">
                                        {googleSignedIn && (
                                            <Button
                                                variant="outline"
                                                onClick={handleReset}
                                                disabled={googleLoading}
                                                className="border-zinc-700 text-zinc-400 hover:text-white"
                                            >
                                                Reset
                                            </Button>
                                        )}
                                        <Button
                                            onClick={googleSignedIn ? handleGoogleSignOut : handleGoogleSignIn}
                                            disabled={googleLoading}
                                            className={googleSignedIn ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-purple-700 hover:bg-purple-800'}
                                        >
                                            {googleLoading ? 'Processing...' : googleSignedIn ? 'Disconnect' : 'Connect Calendar'}
                                        </Button>
                                    </div>
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
            {/* Deletion Warning Modal */}
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black uppercase tracking-tighter text-red-500 flex items-center gap-2">
                            <AlertCircle className="w-6 h-6" /> Warning: Unblocking Selection
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                            You are about to clear ALL blocks for <strong>{selectedDates.length}</strong> selected dates. This will make these dates fully available for online booking again.
                            <br /><br />
                            This action cannot be undone. Are you sure?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">Cancel</AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Button
                                onClick={handleDeleteSelectedDates}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold"
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Clearing...' : 'Yes, Delete Selection'}
                            </Button>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
