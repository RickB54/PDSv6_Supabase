/**
 * Hybrid Availability System
 * Combines Google Calendar auto-blocking with manual overrides
 */

import {
    getBlockedSlots as getManualBlocks,
    BlockedTimeSlot,
    getDayAvailability as getManualDayAvailability
} from './availability';

import {
    getFreeBusy,
    isTimeSlotAvailable,
    getCalendarConfig,
    isSignedIn
} from './googleCalendar';
import { addDays, format, parseISO } from 'date-fns';

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

    // Check if Google Calendar is connected
    const config = await getCalendarConfig();
    const googleEnabled = config.clientId && config.apiKey && isSignedIn();

    if (!googleEnabled) {
        // No Google Calendar, use manual blocks only
        return {
            date,
            fullyBlocked: false,
            availableSlots: manualAvailability.availableSlots,
            blockedSlots: manualAvailability.blockedSlots.map(s => ({ ...s, source: 'manual' as const }))
        };
    }

    try {
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

        // Combine all blocked periods
        const allBlockedSlots = [
            ...manualAvailability.blockedSlots.map(s => ({ ...s, source: 'manual' as const })),
            ...googleBusyPeriods.map(s => ({ ...s, source: 'google' as const }))
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
            blockedSlots: allBlockedSlots
        };

    } catch (error) {
        console.error('Google Calendar check failed, using manual blocks only:', error);
        // Fallback to manual blocks if Google Calendar fails
        return {
            date,
            fullyBlocked: false,
            availableSlots: manualAvailability.availableSlots,
            blockedSlots: manualAvailability.blockedSlots.map(s => ({ ...s, source: 'manual' as const }))
        };
    }
}

/**
 * Check if Google Calendar is currently active
 */
/**
 * Check if Google Calendar is currently active
 */
export async function isGoogleCalendarActive(): Promise<boolean> {
    const config = await getCalendarConfig();
    return !!(config.clientId && config.apiKey && isSignedIn());
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
 * Get blocked dates in a range with source (for calendar dots)
 */
export async function getRangeBlockedDates(start: Date, end: Date): Promise<Array<{ date: string; source: 'manual' | 'google' }>> {
    // 1. Manual Blocks
    const manualAll = await getManualBlocks();
    const manualMapped = manualAll.map(b => ({ date: b.date, source: 'manual' as const }));

    const config = await getCalendarConfig();
    const googleEnabled = config.clientId && config.apiKey && isSignedIn();

    if (!googleEnabled) {
        return manualMapped;
    }

    // 2. Google Blocks
    try {
        const freeBusy = await getFreeBusy(config.calendarIds, start, end);
        const googleDatesSet = new Set<string>();

        for (const calId of config.calendarIds) {
            const busy = freeBusy.calendars[calId]?.busy || [];
            busy.forEach(p => {
                let curr = new Date(p.start);
                const endEvent = new Date(p.end);
                // If event is less than 24h, it maps to start date based on locale?
                // Simple logic: Mark the day of the start.
                // Better logic: Mark all touched days.

                // Normalize start to date string
                const dateStr = format(curr, 'yyyy-MM-dd');
                googleDatesSet.add(dateStr);

                // If it spans days (checking loop)
                let loopCurr = new Date(curr);
                loopCurr.setHours(0, 0, 0, 0);
                const loopEnd = new Date(endEvent);

                while (addDays(loopCurr, 1) < loopEnd) {
                    loopCurr = addDays(loopCurr, 1);
                    googleDatesSet.add(format(loopCurr, 'yyyy-MM-dd'));
                }
            });
        }

        const googleMapped = Array.from(googleDatesSet).map(d => ({ date: d, source: 'google' as const }));
        return [...manualMapped, ...googleMapped];
    } catch (e) {
        console.error("Failed to fetch Google range:", e);
        return manualMapped;
    }
}

/**
 * Get combined blocks for a week (Manual + Google)
 */
export async function getWeeklyBlocks(startDate: Date): Promise<Array<{ id?: string; date: string; startTime: string | null; endTime: string | null; source: 'manual' | 'google'; reason?: string }>> {
    const endDate = addDays(startDate, 7);
    const manualAll = await getManualBlocks();

    // Filter manual to range
    const manualInRange = manualAll.filter(b => {
        const d = new Date(b.date);
        return d >= startDate && d <= endDate;
    }).map(b => ({
        id: b.id,
        date: b.date,
        startTime: b.startTime || null,
        endTime: b.endTime || null,
        source: 'manual' as const,
        reason: b.reason
    }));

    const config = await getCalendarConfig();
    const googleEnabled = config.clientId && config.apiKey && isSignedIn();

    if (!googleEnabled) {
        return manualInRange;
    }

    try {
        // Fetch Google
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

        return [...manualInRange, ...googleBlocks];
    } catch (error) {
        console.error("Failed to fetch Google blocks:", error);
        return manualInRange;
    }
}

