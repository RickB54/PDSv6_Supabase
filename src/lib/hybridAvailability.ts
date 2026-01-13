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
    const config = getCalendarConfig();
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
export function isGoogleCalendarActive(): boolean {
    const config = getCalendarConfig();
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
    const googleActive = isGoogleCalendarActive();
    const manualBlocks = await getManualBlocks();

    return {
        googleActive,
        manualBlocksCount: manualBlocks.length,
        mode: googleActive ? 'google+manual' : 'manual-only'
    };
}
