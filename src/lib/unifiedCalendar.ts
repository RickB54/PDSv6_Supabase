/**
 * Unified Calendar Events
 * Combines real bookings, manual blocks, and Google Calendar events
 */

import { getBlockedSlots, formatTimeAMPM } from './availability';
import { getFreeBusy, isSignedIn, getCalendarConfig } from './googleCalendar';
import type { Booking } from '@/store/bookings';

export interface CalendarEvent {
    id: string;
    type: 'booking' | 'manual-block' | 'google-event';
    title: string;
    date: string; // ISO string
    endTime?: string; // ISO string
    customer?: string;
    status?: string;
    source: 'booking' | 'manual' | 'google';
    isDeletable: boolean;
    color?: string;
    icon?: string;
}

/**
 * Get all calendar events for a date range
 */
export async function getUnifiedCalendarEvents(
    startDate: Date,
    endDate: Date,
    realBookings: Booking[]
): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];

    // 1. Add real bookings
    realBookings.forEach(booking => {
        events.push({
            id: booking.id,
            type: 'booking',
            title: booking.title,
            date: booking.date,
            endTime: booking.endTime,
            customer: booking.customer,
            status: booking.status,
            source: 'booking',
            isDeletable: true,
            color: undefined, // Use default booking colors
            icon: undefined
        });
    });

    // 2. Add manual blocks
    const manualBlocks = await getBlockedSlots();
    manualBlocks.forEach(block => {
        const blockDate = new Date(block.date);
        if (blockDate >= startDate && blockDate <= endDate) {
            // Create ISO datetime for the block
            let blockStart: string;
            let blockEnd: string | undefined;

            if (block.startTime && block.endTime) {
                // Specific time range
                const [startHour, startMin] = block.startTime.split(':').map(Number);
                const [endHour, endMin] = block.endTime.split(':').map(Number);

                const start = new Date(block.date);
                start.setHours(startHour, startMin, 0, 0);
                blockStart = start.toISOString();

                const end = new Date(block.date);
                end.setHours(endHour, endMin, 0, 0);
                blockEnd = end.toISOString();
            } else {
                // Full day block - show at 9 AM
                const start = new Date(block.date);
                start.setHours(9, 0, 0, 0);
                blockStart = start.toISOString();

                const end = new Date(block.date);
                end.setHours(17, 0, 0, 0);
                blockEnd = end.toISOString();
            }

            events.push({
                id: block.id,
                type: 'manual-block',
                title: block.reason || 'Blocked Time',
                date: blockStart,
                endTime: blockEnd,
                source: 'manual',
                isDeletable: true,
                color: 'blue', // Blue for manual blocks
                icon: '🔵'
            });
        }
    });

    // 3. Add Google Calendar events (if connected)
    const config = getCalendarConfig();
    if (config.clientId && config.apiKey && isSignedIn()) {
        try {
            const freeBusy = await getFreeBusy(config.calendarIds, startDate, endDate);

            // Process each calendar's busy periods
            for (const calendarId of config.calendarIds) {
                const busyPeriods = freeBusy.calendars[calendarId]?.busy || [];

                busyPeriods.forEach((period, index) => {
                    events.push({
                        id: `google-${calendarId}-${index}`,
                        type: 'google-event',
                        title: 'Personal Appointment',
                        date: period.start,
                        endTime: period.end,
                        source: 'google',
                        isDeletable: false, // Can't delete Google Calendar events from here
                        color: 'purple', // Purple for Google events
                        icon: '📅'
                    });
                });
            }
        } catch (error) {
            console.error('Failed to fetch Google Calendar events:', error);
        }
    }

    // Sort by date
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return events;
}

/**
 * Get events for a specific day
 */
export async function getEventsForDay(
    day: Date,
    realBookings: Booking[]
): Promise<CalendarEvent[]> {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    const allEvents = await getUnifiedCalendarEvents(dayStart, dayEnd, realBookings);

    return allEvents.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= dayStart && eventDate <= dayEnd;
    });
}

/**
 * Delete an event (only works for bookings and manual blocks)
 */
export async function deleteCalendarEvent(
    event: CalendarEvent,
    deleteBooking: (id: string) => void
): Promise<boolean> {
    if (!event.isDeletable) {
        return false;
    }

    if (event.source === 'booking') {
        deleteBooking(event.id);
        return true;
    }

    if (event.source === 'manual') {
        const { unblockSlot } = await import('./availability');
        await unblockSlot(event.id);
        return true;
    }

    return false;
}
