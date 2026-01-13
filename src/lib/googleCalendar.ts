/**
 * Google Calendar Availability Integration
 * Privacy-safe: Only checks free/busy status, never exposes event details
 */

export interface CalendarConfig {
    clientId: string;
    apiKey: string;
    calendarIds: string[]; // Primary + optional secondary calendars
    maxBookingsPerDay: number;
    bufferMinutes: number; // Time between bookings
    recoveryDays: number[]; // 0=Sunday, 6=Saturday
}

export interface TimeSlot {
    start: Date;
    end: Date;
    available: boolean;
    reason?: 'calendar-busy' | 'max-bookings' | 'buffer-time' | 'recovery-day';
}

export interface FreeBusyResponse {
    calendars: {
        [calendarId: string]: {
            busy: Array<{
                start: string;
                end: string;
            }>;
        };
    };
}

/**
 * Initialize Google Calendar API
 */
export async function initGoogleCalendar(config: CalendarConfig): Promise<void> {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
            (window as any).gapi.load('client:auth2', async () => {
                try {
                    await (window as any).gapi.client.init({
                        apiKey: config.apiKey,
                        clientId: config.clientId,
                        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
                        scope: 'https://www.googleapis.com/auth/calendar.readonly'
                    });
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Sign in to Google (admin only)
 */
export async function signInToGoogle(): Promise<void> {
    const auth = (window as any).gapi.auth2.getAuthInstance();
    await auth.signIn();
}

/**
 * Sign out from Google
 */
export async function signOutFromGoogle(): Promise<void> {
    const auth = (window as any).gapi.auth2.getAuthInstance();
    await auth.signOut();
}

/**
 * Check if user is signed in
 */
export function isSignedIn(): boolean {
    const auth = (window as any).gapi?.auth2?.getAuthInstance();
    return auth?.isSignedIn?.get() || false;
}

/**
 * Get free/busy information for date range
 * PRIVACY-SAFE: Only returns busy/free status, no event details
 */
export async function getFreeBusy(
    calendarIds: string[],
    timeMin: Date,
    timeMax: Date
): Promise<FreeBusyResponse> {
    const response = await (window as any).gapi.client.calendar.freebusy.query({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: calendarIds.map(id => ({ id }))
    });

    return response.result;
}

/**
 * Check if a specific time slot is available
 */
export function isTimeSlotAvailable(
    slot: { start: Date; end: Date },
    busyPeriods: Array<{ start: string; end: string }>
): boolean {
    for (const busy of busyPeriods) {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);

        // Check for any overlap
        if (
            (slot.start >= busyStart && slot.start < busyEnd) ||
            (slot.end > busyStart && slot.end <= busyEnd) ||
            (slot.start <= busyStart && slot.end >= busyEnd)
        ) {
            return false;
        }
    }
    return true;
}

/**
 * Generate available time slots for a date range
 */
export async function getAvailableSlots(
    config: CalendarConfig,
    startDate: Date,
    endDate: Date,
    existingBookings: Array<{ scheduled_at: string; estimated_duration: number }>,
    slotDurationMinutes: number = 60
): Promise<TimeSlot[]> {
    const slots: TimeSlot[] = [];

    // Get free/busy from Google Calendar
    const freeBusy = await getFreeBusy(config.calendarIds, startDate, endDate);

    // Combine all busy periods from all calendars
    const allBusyPeriods: Array<{ start: string; end: string }> = [];
    for (const calendarId of config.calendarIds) {
        const calendarBusy = freeBusy.calendars[calendarId]?.busy || [];
        allBusyPeriods.push(...calendarBusy);
    }

    // Generate time slots (9 AM to 5 PM by default)
    const current = new Date(startDate);
    current.setHours(9, 0, 0, 0);

    while (current < endDate) {
        const dayOfWeek = current.getDay();
        const slotEnd = new Date(current.getTime() + slotDurationMinutes * 60000);

        // Check recovery days
        if (config.recoveryDays.includes(dayOfWeek)) {
            slots.push({
                start: new Date(current),
                end: slotEnd,
                available: false,
                reason: 'recovery-day'
            });
            current.setTime(current.getTime() + slotDurationMinutes * 60000);
            continue;
        }

        // Check Google Calendar availability
        const calendarAvailable = isTimeSlotAvailable(
            { start: current, end: slotEnd },
            allBusyPeriods
        );

        if (!calendarAvailable) {
            slots.push({
                start: new Date(current),
                end: slotEnd,
                available: false,
                reason: 'calendar-busy'
            });
            current.setTime(current.getTime() + slotDurationMinutes * 60000);
            continue;
        }

        // Check max bookings per day
        const dayStart = new Date(current);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(current);
        dayEnd.setHours(23, 59, 59, 999);

        const bookingsThisDay = existingBookings.filter(b => {
            const bookingDate = new Date(b.scheduled_at);
            return bookingDate >= dayStart && bookingDate <= dayEnd;
        });

        if (bookingsThisDay.length >= config.maxBookingsPerDay) {
            slots.push({
                start: new Date(current),
                end: slotEnd,
                available: false,
                reason: 'max-bookings'
            });
            current.setTime(current.getTime() + slotDurationMinutes * 60000);
            continue;
        }

        // Check buffer time from existing bookings
        let hasBufferConflict = false;
        for (const booking of existingBookings) {
            const bookingStart = new Date(booking.scheduled_at);
            const bookingEnd = new Date(bookingStart.getTime() + booking.estimated_duration * 60000);
            const bufferStart = new Date(bookingEnd.getTime());
            const bufferEnd = new Date(bookingEnd.getTime() + config.bufferMinutes * 60000);

            if (
                (current >= bookingStart && current < bufferEnd) ||
                (slotEnd > bookingStart && slotEnd <= bufferEnd)
            ) {
                hasBufferConflict = true;
                break;
            }
        }

        if (hasBufferConflict) {
            slots.push({
                start: new Date(current),
                end: slotEnd,
                available: false,
                reason: 'buffer-time'
            });
            current.setTime(current.getTime() + slotDurationMinutes * 60000);
            continue;
        }

        // Slot is available!
        slots.push({
            start: new Date(current),
            end: slotEnd,
            available: true
        });

        current.setTime(current.getTime() + slotDurationMinutes * 60000);

        // Move to next day at 5 PM
        if (current.getHours() >= 17) {
            current.setDate(current.getDate() + 1);
            current.setHours(9, 0, 0, 0);
        }
    }

    return slots;
}

/**
 * Store calendar config in localStorage (admin only)
 */
export function saveCalendarConfig(config: Partial<CalendarConfig>): void {
    const existing = getCalendarConfig();
    const updated = { ...existing, ...config };
    localStorage.setItem('calendar_config', JSON.stringify(updated));
}

/**
 * Get calendar config from localStorage
 */
export function getCalendarConfig(): CalendarConfig {
    const stored = localStorage.getItem('calendar_config');
    if (stored) {
        return JSON.parse(stored);
    }

    // Default config
    return {
        clientId: '',
        apiKey: '',
        calendarIds: ['primary'],
        maxBookingsPerDay: 1,
        bufferMinutes: 120, // 2 hours
        recoveryDays: [] // No recovery days by default
    };
}
