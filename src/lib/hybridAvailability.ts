/**
 * Hybrid Availability System
 * Combines Google Calendar auto-blocking with manual overrides
 */

import {
    getBlockedSlots as getManualBlocks,
    getDayAvailability as getManualDayAvailability
} from './availability';

import {
    initGoogleCalendar,
    getFreeBusy,
    isTimeSlotAvailable,
    getCalendarConfig,
    isSignedIn,
    listCalendarEvents,
    loadGCalTokenFromSupabase
} from './googleCalendar';
import { addDays, format, startOfMonth, startOfDay, endOfDay } from 'date-fns';

export interface HybridAvailability {
    date: string;
    fullyBlocked: boolean;
    availableSlots: Array<{ start: string; end: string }>;
    blockedSlots: Array<{ start: string; end: string; source: 'manual' | 'google' | 'booking' }>;
}

/**
 * Get combined availability from Google Calendar + Manual Blocks
 */
export async function getHybridAvailability(
    date: string,
    existingBookings: Array<{ scheduled_at: string; estimated_duration: number }> = []
): Promise<HybridAvailability> {

    // Start with manual blocks
    const manualAvailability = await getManualDayAvailability(date, existingBookings);

    // If manually fully blocked, return immediately
    if (manualAvailability.fullyBlocked) {
        return {
            date,
            fullyBlocked: true,
            availableSlots: [],
            blockedSlots: manualAvailability.blockedSlots.map(s => ({ ...s, source: 'manual' as const }))
        };
    }

    const config = await getCalendarConfig();
    // Check if Google Calendar logic should be attempted
    const googleEnabled = !!(config.clientId && config.apiKey);

    if (!googleEnabled) {
        // No Google Calendar config at all, use manual + bookings
        const bookingSlots = existingBookings
            .filter(b => format(new Date(b.scheduled_at), 'yyyy-MM-dd') === date)
            .map(b => {
                const start = format(new Date(b.scheduled_at), 'HH:mm');
                const h = new Date(b.scheduled_at).getHours() + (b.estimated_duration || 1);
                const end = `${String(Math.min(23, h)).padStart(2, '0')}:${format(new Date(b.scheduled_at), 'mm')}`;
                return { start, end, source: 'booking' as const };
            });

        return {
            date,
            fullyBlocked: manualAvailability.availableSlots.length === 0,
            availableSlots: manualAvailability.availableSlots,
            blockedSlots: [
                ...manualAvailability.blockedSlots.map(s => ({ ...s, source: 'manual' as const })),
                ...bookingSlots
            ] as any
        };
    }

    try {
        // Ensure API is initialized
        await initGoogleCalendar(config);
        // Get Google Calendar busy periods
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const freeBusy = await getFreeBusy(config.calendarIds, dayStart, dayEnd);

        // Combine all busy periods from all calendars
        const googleBusyPeriods: Array<{ start: string; end: string }> = [];
        for (const calendarId of config.calendarIds) {
            const calendarBusy = freeBusy.calendars[calendarId]?.busy || [];
            calendarBusy.forEach(period => {
                const start = new Date(period.start);
                const end = new Date(period.end);
                googleBusyPeriods.push({
                    start: start.toTimeString().slice(0, 5),
                    end: end.toTimeString().slice(0, 5)
                });
            });
        }

        // Distinguish bookings from manual blocks in the trace
        const bookingSlots = existingBookings
            .filter(b => format(new Date(b.scheduled_at), 'yyyy-MM-dd') === date)
            .map(b => {
                const start = format(new Date(b.scheduled_at), 'HH:mm');
                // Estimating duration if not provided
                const h = new Date(b.scheduled_at).getHours() + (b.estimated_duration || 1);
                const end = `${String(Math.min(23, h)).padStart(2, '0')}:${format(new Date(b.scheduled_at), 'mm')}`;
                return { start, end, source: 'booking' as const };
            });

        // Combine all blocked periods
        const allBlockedSlots = [
            ...manualAvailability.blockedSlots.map(s => ({ ...s, source: 'manual' as const })),
            ...googleBusyPeriods.map(s => ({ ...s, source: 'google' as const })),
            ...bookingSlots
        ];

        // Filter available slots to exclude Google Calendar blocks
        const finalAvailableSlots = manualAvailability.availableSlots.filter(slot => {
            return isTimeSlotAvailable(
                { start: new Date(`${date}T${slot.start}`), end: new Date(`${date}T${slot.end}`) },
                googleBusyPeriods.map(p => ({
                    start: `${date}T${p.start}`,
                    end: `${date}T${p.end}`
                }))
            );
        });

        return {
            date,
            fullyBlocked: finalAvailableSlots.length === 0,
            availableSlots: finalAvailableSlots,
            blockedSlots: allBlockedSlots as any
        };

    } catch (error) {
        console.error('Google Calendar check failed, using manual + bookings:', error);

        const bookingSlots = existingBookings
            .filter(b => format(new Date(b.scheduled_at), 'yyyy-MM-dd') === date)
            .map(b => {
                const start = format(new Date(b.scheduled_at), 'HH:mm');
                const h = new Date(b.scheduled_at).getHours() + (b.estimated_duration || 1);
                const end = `${String(Math.min(23, h)).padStart(2, '0')}:${format(new Date(b.scheduled_at), 'mm')}`;
                return { start, end, source: 'booking' as const };
            });

        return {
            date,
            fullyBlocked: manualAvailability.availableSlots.length === 0,
            availableSlots: manualAvailability.availableSlots,
            blockedSlots: [
                ...manualAvailability.blockedSlots.map(s => ({ ...s, source: 'manual' as const })),
                ...bookingSlots
            ] as any
        };
    }
}

/**
 * Check if Google Calendar is currently active
 */
export async function isGoogleCalendarActive(): Promise<boolean> {
    const config = await getCalendarConfig();
    const isConfigured = !!(config.clientId && config.apiKey);
    if (!isConfigured) return false;

    // Also check if actually signed in (authorized)
    return isSignedIn();
}

/**
 * Get availability status for display
 */
export async function getAvailabilityStatus(): Promise<{
    googleActive: boolean;
    manualBlocksCount: number;
    mode: 'google+manual' | 'manual-only';
}> {
    const googleActive = await isGoogleCalendarActive();
    const manualBlocks = await getManualBlocks();

    return {
        googleActive,
        manualBlocksCount: manualBlocks.length,
        mode: googleActive ? 'google+manual' : 'manual-only'
    };
}

/**
 * Get blocked dates in a range with source and time info (for calendar dots)
 */
export async function getRangeBlockedDates(
    start: Date,
    end: Date,
    existingBookings: Array<{ scheduled_at: string; estimated_duration: number }> = []
): Promise<Array<{
    date: string;
    source: 'manual' | 'google' | 'booking';
    startTime: string | null;
    endTime: string | null;
}>> {
    // 1. Manual Blocks
    const manualAll = await getManualBlocks();
    const manualMapped = manualAll.filter(b => {
        const parts = b.date.split('-').map(Number);
        if (parts.length !== 3) return false;
        const d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
        return d >= start && d <= end;
    }).map(b => ({
        date: b.date,
        source: 'manual' as const,
        startTime: b.startTime || null,
        endTime: b.endTime || null
    }));

    // 1.5 Real Bookings
    const bookingMapped = existingBookings.filter(b => {
        const d = new Date(b.scheduled_at);
        return d >= start && d <= end;
    }).map(b => {
        const dateObj = new Date(b.scheduled_at);
        const hStart = dateObj.getHours();
        const mStart = dateObj.getMinutes();
        const durationHours = b.estimated_duration || 1;
        const totalMinutes = Math.round((hStart * 60) + mStart + (durationHours * 60));
        const actualHEnd = Math.min(23, Math.floor(totalMinutes / 60));
        const actualMEnd = totalMinutes % 60;

        return {
            date: format(dateObj, 'yyyy-MM-dd'),
            source: 'booking' as const,
            startTime: `${String(hStart).padStart(2, '0')}:${String(mStart).padStart(2, '0')}`,
            endTime: `${String(actualHEnd).padStart(2, '0')}:${String(actualMEnd).padStart(2, '0')}`
        };
    });

    const config = await getCalendarConfig();
    const googleEnabled = !!(config.clientId && config.apiKey);

    if (!googleEnabled) {
        return [...manualMapped, ...bookingMapped];
    }

    // 2. Google Blocks
    try {
        await initGoogleCalendar(config);

        let isGcalSigned = isSignedIn();
        if (!isGcalSigned) {
            const shared = await loadGCalTokenFromSupabase();
            if (shared && (window as any).gapi?.client) {
                (window as any).gapi.client.setToken({ access_token: shared.access_token });
                isGcalSigned = true;
            }
        }

        if (isGcalSigned) {
            const googleBlocks: Array<{ date: string; source: 'google'; startTime: string | null; endTime: string | null }> = [];

            for (const calId of config.calendarIds) {
                const events = await listCalendarEvents(calId, startOfDay(start), endOfDay(end));

                events.forEach((event: any) => {
                    const startStr = event.start.dateTime || event.start.date;
                    const endStr = event.end.dateTime || event.end.date;

                    const startEvent = new Date(startStr);
                    const endEvent = new Date(endStr);

                    // Detect All-Day: Either just a date object, or spanning 24h starting at 00:00
                    const isAllDay = !event.start.dateTime ||
                        (startStr.includes('T00:00:00') && (endEvent.getTime() - startEvent.getTime() >= 23 * 60 * 60 * 1000));

                    // Detect "12am-12am" or 0-duration blocks
                    const isZeroDuration = event.start.dateTime && event.end.dateTime && (startStr === endStr || startStr.split('T')[1].startsWith('00:00') && endStr.split('T')[1].startsWith('00:00'));

                    let curr = new Date(startEvent);
                    do {
                        const dStr = format(curr, 'yyyy-MM-dd');

                        if (isAllDay || isZeroDuration) {
                            googleBlocks.push({
                                date: dStr,
                                source: 'google',
                                startTime: null,
                                endTime: null
                            });
                        } else {
                            const isFirstDay = curr.toDateString() === startEvent.toDateString();
                            const sTime = isFirstDay ? startEvent.toTimeString().slice(0, 5) : '00:00';

                            const nextMidnight = new Date(curr);
                            nextMidnight.setDate(nextMidnight.getDate() + 1);
                            nextMidnight.setHours(0, 0, 0, 0);

                            const isLastDay = endEvent <= nextMidnight;
                            const eTime = isLastDay ? endEvent.toTimeString().slice(0, 5) : '23:59';

                            googleBlocks.push({
                                date: dStr,
                                source: 'google',
                                startTime: sTime,
                                endTime: eTime
                            });
                        }

                        curr = addDays(curr, 1);
                        curr.setHours(0, 0, 0, 0);
                    } while (curr < endEvent);
                });
            }
            return [...manualMapped, ...bookingMapped, ...googleBlocks];
        }

        return [...manualMapped, ...bookingMapped];
    } catch (e) {
        console.error("Failed to fetch Google range:", e);
        return [...manualMapped, ...bookingMapped];
    }
}

/**
 * Get combined blocks for a week (Manual + Google)
 */
export async function getWeeklyBlocks(
    startDate: Date,
    existingBookings: Array<{ scheduled_at: string; estimated_duration: number }> = []
): Promise<Array<{ id?: string; date: string; startTime: string | null; endTime: string | null; source: 'manual' | 'google' | 'booking'; reason?: string }>> {
    const endDate = addDays(startDate, 7);
    const manualAll = await getManualBlocks();

    // Filter manual to range
    const manualInRange = manualAll.filter(b => {
        const parts = b.date.split('-').map(Number);
        if (parts.length !== 3) return false;
        const d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
        return d >= startDate && d <= endDate;
    }).map(b => ({
        id: b.id,
        date: b.date,
        startTime: b.startTime || null,
        endTime: b.endTime || null,
        source: 'manual' as const,
        reason: b.reason
    }));

    // 1.5 Filter bookings to range
    const bookingsInRange = existingBookings.filter(b => {
        const d = new Date(b.scheduled_at);
        return d >= startDate && d <= endDate;
    }).map((b, idx) => {
        const dateObj = new Date(b.scheduled_at);
        const hStart = dateObj.getHours();
        const mStart = dateObj.getMinutes();
        const durationHours = b.estimated_duration || 1;
        const totalMinutes = Math.round((hStart * 60) + mStart + (durationHours * 60));
        const actualHEnd = Math.min(23, Math.floor(totalMinutes / 60));
        const actualMEnd = totalMinutes % 60;

        return {
            id: `b-${idx}-${b.scheduled_at}`,
            date: format(dateObj, 'yyyy-MM-dd'),
            startTime: `${String(hStart).padStart(2, '0')}:${String(mStart).padStart(2, '0')}`,
            endTime: `${String(actualHEnd).padStart(2, '0')}:${String(actualMEnd).padStart(2, '0')}`,
            source: 'booking' as const,
            reason: 'Confirmed Booking'
        };
    });

    const config = await getCalendarConfig();
    const googleEnabled = !!(config.clientId && config.apiKey);

    if (!googleEnabled) {
        return [...manualInRange, ...bookingsInRange];
    }

    try {
        // Fetch Google
        await initGoogleCalendar(config);
        const freeBusy = await getFreeBusy(config.calendarIds, startDate, endDate);
        const googleBlocks: any[] = [];

        for (const calId of config.calendarIds) {
            const busy = freeBusy.calendars[calId]?.busy || [];
            busy.forEach((p, idx) => {
                const start = new Date(p.start);
                const end = new Date(p.end);

                let curr = new Date(start);
                while (curr < end) {
                    const dStr = format(curr, 'yyyy-MM-dd');

                    // Start time
                    const isFirstDay = curr.toDateString() === start.toDateString();
                    const sTime = isFirstDay
                        ? start.toTimeString().slice(0, 5)
                        : '00:00';

                    // End time
                    const nextMidnight = new Date(curr);
                    nextMidnight.setDate(nextMidnight.getDate() + 1);
                    nextMidnight.setHours(0, 0, 0, 0);

                    const isLastDay = end <= nextMidnight;
                    const eTime = isLastDay
                        ? end.toTimeString().slice(0, 5)
                        : '23:59';

                    googleBlocks.push({
                        id: `g-${idx}-${dStr}`,
                        date: dStr,
                        startTime: sTime,
                        endTime: eTime,
                        source: 'google' as const,
                        reason: 'Personal Time'
                    });

                    curr = addDays(curr, 1);
                    curr.setHours(0, 0, 0, 0);
                }
            });
        }

        return [...manualInRange, ...bookingsInRange, ...googleBlocks];
    } catch (error) {
        console.error("Failed to fetch Google blocks:", error);
        return [...manualInRange, ...bookingsInRange];
    }
}
