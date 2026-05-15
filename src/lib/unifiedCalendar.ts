/**
 * Unified Calendar Events
 * Combines real bookings, manual blocks, and Google Calendar events.
 */

import { getBlockedSlots } from './availability';
import { getFreeBusy, isSignedIn, getCalendarConfig, listCalendarEvents, loadGCalTokenFromSupabase } from './googleCalendar';

import type { Booking } from '@/store/bookings';
import { parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

export interface CalendarEvent {
    id: string;
    type: 'booking' | 'manual-block' | 'google-event';
    title: string;
    date: string; // ISO string
    endTime?: string; // ISO string
    customer?: string;
    customerEmail?: string;
    customerPhone?: string;
    address?: string;
    status?: string;
    source: 'booking' | 'manual' | 'google';
    source_origin?: string; // e.g. 'Hybrid Availability System'
    isDeletable: boolean;
    color?: string;
    icon?: string;
    assignedEmployee?: string;
    vehicle?: string;
    vehicleYear?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    notes?: string;
    addons?: string[];
    price?: number;
    bookedBy?: string;
    hasReminder?: boolean;
    reminderFrequency?: number;
    vehicleId?: string;
    customerId?: string;
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
    const interval = { start: startDate, end: endDate };

    // 1. Add real bookings
    realBookings.forEach(booking => {
        const bookingDate = parseISO(booking.date);
        if (isWithinInterval(bookingDate, interval)) {
            events.push({
                id: booking.id,
                type: 'booking',
                title: booking.title,
                date: booking.date,
                endTime: booking.endTime,
                customer: booking.customer,
                customerEmail: booking.customerEmail,
                customerPhone: booking.customerPhone,
                address: booking.address,
                status: booking.status,
                source: 'booking',
                source_origin: booking.source || 'Manual Entry',
                isDeletable: true,
                assignedEmployee: booking.assignedEmployee,
                vehicle: booking.vehicle,
                vehicleYear: booking.vehicleYear,
                vehicleMake: booking.vehicleMake,
                vehicleModel: booking.vehicleModel,
                notes: booking.notes,
                addons: booking.addons,
                price: booking.price,
                bookedBy: booking.bookedBy,
                hasReminder: booking.hasReminder,
                reminderFrequency: booking.reminderFrequency,
                vehicleId: booking.vehicleId,
                customerId: booking.customerId
            });
        }
    });

    // 2. Add manual blocks
    try {
        const manualBlocks = await getBlockedSlots();
        manualBlocks.forEach(block => {
            // Parse date string (YYYY-MM-DD) carefully. 
            // new Date("2024-01-01") is UTC, but we want local for comparisons.
            const [y, m, d] = block.date.split('-').map(Number);
            const blockLocalDay = new Date(y, m - 1, d);

            if (isWithinInterval(blockLocalDay, interval) ||
                (blockLocalDay >= startOfDay(startDate) && blockLocalDay <= endOfDay(endDate))) {

                // Create ISO datetime for the block
                let blockStart: string;
                let blockEnd: string | undefined;

                if (block.startTime && block.endTime) {
                    const [startH, startM] = block.startTime.split(':').map(Number);
                    const [endH, endM] = block.endTime.split(':').map(Number);

                    const start = new Date(y, m - 1, d, startH, startM);
                    blockStart = start.toISOString();

                    const end = new Date(y, m - 1, d, endH, endM);
                    blockEnd = end.toISOString();
                } else {
                    const start = new Date(y, m - 1, d, 9, 0);
                    blockStart = start.toISOString();

                    const end = new Date(y, m - 1, d, 17, 0);
                    blockEnd = end.toISOString();
                }

                events.push({
                    id: block.id,
                    type: 'manual-block',
                    title: block.reason || 'Blocked Time',
                    date: blockStart,
                    endTime: blockEnd,
                    source_origin: block.source || 'Hybrid Availability System',
                    source: 'manual',
                    isDeletable: true,
                    color: 'blue',
                    icon: '🔵'
                });
            }
        });
    } catch (e) {
        console.error("Manual blocks fetch failed", e);
    }

    // 3. Add Google Calendar events (if connected)
    const config = await getCalendarConfig();
    let isGcalSigned = isSignedIn();

    // Proactively try to load shared token if not signed in locally
    if (!isGcalSigned && config.clientId && config.apiKey) {
        const shared = await loadGCalTokenFromSupabase();
        if (shared && (window as any).gapi?.client) {
            (window as any).gapi.client.setToken({ access_token: shared.access_token });
            isGcalSigned = true;
        }
    }

    if (config.clientId && config.apiKey && isGcalSigned) {
        try {
            const timeMin = startOfDay(startDate);
            const timeMax = endOfDay(endDate);

            console.log(`[UnifiedCalendar] Fetching GCal Details from ${timeMin.toISOString()} to ${timeMax.toISOString()}`);

            const gEventMap = new Map<string, any>();

            for (const calendarId of config.calendarIds) {
                const gEvents = await listCalendarEvents(calendarId, timeMin, timeMax);
                console.log(`[UnifiedCalendar] Calendar ${calendarId} has ${gEvents.length} events`);

                gEvents.forEach((gEvent: any) => {
                    // Use event ID as key to prevent duplicates
                    if (gEvent.id) {
                        gEventMap.set(gEvent.id, gEvent);
                    }
                });
            }

            gEventMap.forEach((gEvent) => {
                const start = gEvent.start.dateTime || gEvent.start.date;
                const end = gEvent.end.dateTime || gEvent.end.date;

                events.push({
                    id: gEvent.id,
                    type: 'google-event',
                    title: gEvent.summary || 'Booked (External Calendar Event)',
                    date: start,
                    endTime: end,
                    source: 'google',
                    source_origin: 'Hybrid Availability System',
                    isDeletable: false,
                    color: 'blue',
                    icon: '📅',
                    notes: gEvent.description || ''
                });
            });
        } catch (error) {
            console.error('[UnifiedCalendar] Failed to fetch Google Calendar events:', error);
        }
    } else {
        if (!isGcalSigned) console.log("[UnifiedCalendar] Google Calendar not signed in");
        if (!config.apiKey) console.log("[UnifiedCalendar] Google Calendar API Key missing");
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

    return await getUnifiedCalendarEvents(dayStart, dayEnd, realBookings);
}

/**
 * Delete an event (only works for bookings and manual blocks)
 */
export async function deleteCalendarEvent(
    event: any, // Use any for flexibility with generic event objects
    deleteBooking: (id: string) => void
): Promise<boolean> {
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
