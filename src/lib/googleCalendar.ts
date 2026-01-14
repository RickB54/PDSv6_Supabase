/**
 * Google Calendar Availability Integration
 * Updated to use Google Identity Services (GIS) for modern authentication.
 * Privacy-safe: Only checks free/busy status, never exposes event details.
 */

import supabase from './supabase';
import { isSupabaseEnabled } from './auth';

export interface CalendarConfig {
    clientId: string;
    apiKey: string;
    calendarIds: string[];
    maxBookingsPerDay: number;
    bufferMinutes: number;
    recoveryDays: number[];
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

// Global state
let isGapiLoaded = false;
let isGsiLoaded = false;
let tokenClient: any = null;
let gapiLoadPromise: Promise<void> | null = null;
let lastInitConfig: string | null = null;

const freeBusyCache: Record<string, { data: FreeBusyResponse; timestamp: number }> = {};
const CACHE_TTL = 30 * 1000; // 30 seconds cache for more "instant" feel

/**
 * Initialize Google APIs (Singleton pattern)
 * Loads GAPI for Calendar and GIS for Authentication
 */
export async function initGoogleCalendar(config: CalendarConfig): Promise<void> {
    const configHash = JSON.stringify({ c: config.clientId, a: config.apiKey });
    if (isGapiLoaded && isGsiLoaded && lastInitConfig === configHash) return Promise.resolve();
    if (gapiLoadPromise && lastInitConfig === configHash) return gapiLoadPromise;

    if (!config.apiKey || !config.clientId) {
        return Promise.reject(new Error("Missing credentials. Please check your Client ID and API Key."));
    }

    lastInitConfig = configHash;

    gapiLoadPromise = new Promise((resolve, reject) => {
        let scriptsLoaded = 0;
        const totalScripts = 2;

        const onScriptLoad = () => {
            scriptsLoaded++;
            if (scriptsLoaded === totalScripts) {
                initializeApis();
            }
        };

        const initializeApis = async () => {
            try {
                // 1. Initialize GAPI Client
                await new Promise((res, rej) => {
                    (window as any).gapi.load('client', {
                        callback: res,
                        onerror: rej
                    });
                });

                await (window as any).gapi.client.init({
                    apiKey: config.apiKey,
                    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
                });
                isGapiLoaded = true;

                // 2. Initialize Identity Services (GIS)
                tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
                    client_id: config.clientId,
                    scope: 'https://www.googleapis.com/auth/calendar.readonly',
                    callback: (response: any) => {
                        if (response.error !== undefined) {
                            console.error("Token error:", response);
                            const errorEvent = new CustomEvent('g_cal_auth_error', { detail: response });
                            window.dispatchEvent(errorEvent);
                            return;
                        }
                        // Handle token in memory
                        localStorage.setItem('g_cal_token', JSON.stringify({
                            access_token: response.access_token,
                            expires_at: Date.now() + (response.expires_in * 1000)
                        }));
                        localStorage.setItem('g_cal_connected', 'true');

                        // Set token for GAPI immediately
                        if ((window as any).gapi?.client) {
                            (window as any).gapi.client.setToken({ access_token: response.access_token });
                        }

                        window.dispatchEvent(new Event('g_cal_auth_complete'));
                    },
                });
                isGsiLoaded = true;

                // Restore token if exists
                const storedToken = localStorage.getItem('g_cal_token');
                if (storedToken) {
                    try {
                        const token = JSON.parse(storedToken);
                        if (token.expires_at > Date.now()) {
                            (window as any).gapi.client.setToken({ access_token: token.access_token });
                        } else if (localStorage.getItem('g_cal_connected') === 'true') {
                            // Proactively try to refresh if it was previously connected
                            console.log("[GoogleCalendar] Proactively refreshing expired token...");
                            setTimeout(() => ensureSignedIn().catch(() => { }), 1000);
                        }
                    } catch (e) {
                        console.warn("[GoogleCalendar] Failed to restore token:", e);
                    }
                }

                resolve();
            } catch (error: any) {
                console.error("API Init Error:", error);
                gapiLoadPromise = null;
                reject(new Error(error.message || "Failed to initialize Google APIs"));
            }
        };

        // Load GAPI
        if (!document.getElementById('google-api-script')) {
            const script = document.createElement('script');
            script.id = 'google-api-script';
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = onScriptLoad;
            script.onerror = () => reject(new Error("GAPI script failed"));
            document.head.appendChild(script);
        } else {
            onScriptLoad();
        }

        // Load GIS
        if (!document.getElementById('google-gsi-script')) {
            const script = document.createElement('script');
            script.id = 'google-gsi-script';
            script.src = 'https://accounts.google.com/gsi/client';
            script.onload = onScriptLoad;
            script.onerror = () => reject(new Error("GIS script failed"));
            document.head.appendChild(script);
        } else {
            onScriptLoad();
        }
    });

    return gapiLoadPromise;
}

/**
 * Sign in to Google
 * Uses the new requestAccessToken flow
 */
export async function signInToGoogle(): Promise<void> {
    if (!tokenClient) throw new Error("Google APIs not initialized. Please click 'Save Configuration' first.");

    return new Promise((resolve, reject) => {
        const handleAuth = () => {
            window.removeEventListener('g_cal_auth_complete', handleAuth);
            window.removeEventListener('g_cal_auth_error', handleError);
            resolve();
        };

        const handleError = (e: any) => {
            window.removeEventListener('g_cal_auth_complete', handleAuth);
            window.removeEventListener('g_cal_auth_error', handleError);
            reject(new Error(e.detail?.error_description || e.detail?.error || "Authorization failed"));
        };

        window.addEventListener('g_cal_auth_complete', handleAuth);
        window.addEventListener('g_cal_auth_error', handleError);

        // Extended timeout to 2 minutes for slow users/connections
        setTimeout(() => {
            window.removeEventListener('g_cal_auth_complete', handleAuth);
            window.removeEventListener('g_cal_auth_error', handleError);
            reject(new Error("Authentication timed out. Please try again."));
        }, 120000);

        tokenClient.requestAccessToken({ prompt: '' }); // Don't force consent if already granted
    });
}

/**
 * Sign out
 */
export async function signOutFromGoogle(): Promise<void> {
    const storedToken = localStorage.getItem('g_cal_token');
    if (storedToken) {
        const token = JSON.parse(storedToken);
        (window as any).google.accounts.oauth2.revoke(token.access_token, () => {
            console.log("Token revoked");
        });
    }
    localStorage.removeItem('g_cal_token');
    localStorage.removeItem('g_cal_connected');
    if ((window as any).gapi?.client) {
        (window as any).gapi.client.setToken(null);
    }
}

/**
 * Check if signed in and token is valid
 */
export function isSignedIn(): boolean {
    const storedToken = localStorage.getItem('g_cal_token');
    if (!storedToken) return false;

    try {
        const token = JSON.parse(storedToken);
        const isValid = token.expires_at > Date.now();
        if (isValid && (window as any).gapi?.client) {
            (window as any).gapi.client.setToken({ access_token: token.access_token });
        }
        return isValid;
    } catch {
        return false;
    }
}

/**
 * Ensure we have a valid token, refreshing if necessary
 */
export async function ensureSignedIn(): Promise<void> {
    if (isSignedIn()) return;

    const wasConnected = localStorage.getItem('g_cal_connected') === 'true';
    if (!wasConnected) throw new Error("Not previously connected");

    // Try silent refresh first (prompt: none)
    return new Promise((resolve, reject) => {
        const handleAuth = () => {
            window.removeEventListener('g_cal_auth_complete', handleAuth);
            window.removeEventListener('g_cal_auth_error', handleError);
            resolve();
        };

        const handleError = (e: any) => {
            window.removeEventListener('g_cal_auth_complete', handleAuth);
            window.removeEventListener('g_cal_auth_error', handleError);
            // If silent fails, we might need a prompt, but we'll try empty prompt first
            if (e.detail?.error === 'interaction_required') {
                // We can't do much silently if interaction is required
                reject(new Error("Manual reconnection required"));
            } else {
                reject(new Error(e.detail?.error || "Auth refresh failed"));
            }
        };

        window.addEventListener('g_cal_auth_complete', handleAuth);
        window.addEventListener('g_cal_auth_error', handleError);

        if (!tokenClient) {
            reject(new Error("API not initialized"));
            return;
        }

        // Try silently first
        tokenClient.requestAccessToken({ prompt: 'none' });

        // Timeout for silent retry
        setTimeout(() => {
            window.removeEventListener('g_cal_auth_complete', handleAuth);
            window.removeEventListener('g_cal_auth_error', handleError);
            reject(new Error("Refresh timed out"));
        }, 5000);
    });
}

/**
 * Get FreeBusy
 */
export async function getFreeBusy(
    calendarIds: string[],
    timeMin: Date,
    timeMax: Date
): Promise<FreeBusyResponse> {
    // Try refresh if needed
    if (!isSignedIn()) {
        try {
            await ensureSignedIn();
        } catch (e) {
            throw new Error("Not signed in to Google Calendar and refresh failed");
        }
    }

    const cacheKey = `${calendarIds.join(',')}_${timeMin.toISOString().split('T')[0]}_${timeMax.toISOString().split('T')[0]}`;
    const cached = freeBusyCache[cacheKey];

    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return cached.data;
    }

    try {
        const response = await (window as any).gapi.client.calendar.freebusy.query({
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            items: calendarIds.map((id: string) => ({ id }))
        });

        const result = response.result;
        freeBusyCache[cacheKey] = { data: result, timestamp: Date.now() };
        return result;
    } catch (error: any) {
        if (error.status === 401) {
            localStorage.removeItem('g_cal_token');
            localStorage.removeItem('g_cal_connected');
        }
        throw error;
    }
}

/**
 * Overlap check
 */
export function isTimeSlotAvailable(
    slot: { start: Date; end: Date },
    busyPeriods: Array<{ start: string; end: string }>
): boolean {
    for (const busy of busyPeriods) {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        if (slot.start < busyEnd && slot.end > busyStart) {
            return false;
        }
    }
    return true;
}

/**
 * Slot Generator
 */
export async function getAvailableSlots(
    config: CalendarConfig,
    startDate: Date,
    endDate: Date,
    existingBookings: Array<{ scheduled_at: string; estimated_duration: number }>,
    slotDurationMinutes: number = 60
): Promise<TimeSlot[]> {
    const slots: TimeSlot[] = [];

    try {
        const freeBusy = await getFreeBusy(config.calendarIds, startDate, endDate);
        const allBusyPeriods: Array<{ start: string; end: string }> = [];

        if (freeBusy && freeBusy.calendars) {
            for (const calendarId of config.calendarIds) {
                const calendarBusy = freeBusy.calendars[calendarId]?.busy || [];
                allBusyPeriods.push(...calendarBusy);
            }
        }

        const current = new Date(startDate);
        current.setHours(9, 0, 0, 0);

        while (current < endDate) {
            const dayOfWeek = current.getDay();
            const slotEnd = new Date(current.getTime() + slotDurationMinutes * 60000);

            if (config.recoveryDays.includes(dayOfWeek)) {
                slots.push({ start: new Date(current), end: slotEnd, available: false, reason: 'recovery-day' });
                current.setTime(current.getTime() + slotDurationMinutes * 60000);
                continue;
            }

            if (!isTimeSlotAvailable({ start: current, end: slotEnd }, allBusyPeriods)) {
                slots.push({ start: new Date(current), end: slotEnd, available: false, reason: 'calendar-busy' });
                current.setTime(current.getTime() + slotDurationMinutes * 60000);
                continue;
            }

            const dayStart = new Date(current);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(current);
            dayEnd.setHours(23, 59, 59, 999);

            const bookingsThisDay = existingBookings.filter(b => {
                const d = new Date(b.scheduled_at);
                return d >= dayStart && d <= dayEnd;
            });

            if (bookingsThisDay.length >= config.maxBookingsPerDay) {
                slots.push({ start: new Date(current), end: slotEnd, available: false, reason: 'max-bookings' });
                current.setTime(current.getTime() + slotDurationMinutes * 60000);
                continue;
            }

            let hasBufferConflict = false;
            for (const booking of existingBookings) {
                const bStart = new Date(booking.scheduled_at);
                const bEnd = new Date(bStart.getTime() + (booking.estimated_duration || 0) * 60000);
                const bufEnd = new Date(bEnd.getTime() + (config.bufferMinutes || 0) * 60000);
                if (current >= bStart && current < bufEnd) { hasBufferConflict = true; break; }
                if (slotEnd > bStart && slotEnd <= bufEnd) { hasBufferConflict = true; break; }
            }

            if (hasBufferConflict) {
                slots.push({ start: new Date(current), end: slotEnd, available: false, reason: 'buffer-time' });
                current.setTime(current.getTime() + slotDurationMinutes * 60000);
                continue;
            }

            slots.push({ start: new Date(current), end: slotEnd, available: true });
            current.setTime(current.getTime() + slotDurationMinutes * 60000);
            if (current.getHours() >= 17) {
                current.setDate(current.getDate() + 1);
                current.setHours(9, 0, 0, 0);
            }
        }
    } catch (e) {
        console.warn("Availability check skipped: Google Calendar not connected or error occurred.");
    }

    return slots;
}

/**
 * Save config
 */
export async function saveCalendarConfig(config: Partial<CalendarConfig>): Promise<void> {
    const existing = await getCalendarConfig();
    const updated = { ...existing, ...config };
    localStorage.setItem('calendar_config', JSON.stringify(updated));

    if (isSupabaseEnabled()) {
        try {
            await supabase.from('app_settings').upsert({
                key: 'calendar_config',
                value: updated,
                updated_at: new Date().toISOString()
            });
        } catch (e) { console.error("Supabase write error:", e); }
    }
}

/**
 * Get config
 */
export async function getCalendarConfig(): Promise<CalendarConfig> {
    const defaultConfig: CalendarConfig = {
        clientId: '197117387632-77kdstpf87m491fdcast1ec9p3g16ua8.apps.googleusercontent.com',
        apiKey: '',
        calendarIds: ['primary'],
        maxBookingsPerDay: 1,
        bufferMinutes: 120,
        recoveryDays: []
    };

    if (isSupabaseEnabled()) {
        try {
            const { data } = await supabase.from('app_settings').select('value').eq('key', 'calendar_config').maybeSingle();
            if (data?.value) return { ...defaultConfig, ...data.value };
        } catch (e) { console.error("Supabase read error:", e); }
    }

    const stored = localStorage.getItem('calendar_config');
    if (stored) return { ...defaultConfig, ...JSON.parse(stored) };

    return defaultConfig;
}

/**
 * Create Event
 */
export async function createGoogleEvent(event: {
    summary: string;
    description: string;
    start: Date;
    end: Date;
    location?: string;
}) {
    if (!isSignedIn()) return null;

    try {
        const response = await (window as any).gapi.client.calendar.events.insert({
            calendarId: 'primary',
            resource: {
                summary: event.summary,
                description: event.description,
                location: event.location,
                start: { dateTime: event.start.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
                end: { dateTime: event.end.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
            },
        });
        return response.result;
    } catch (error: any) {
        console.error("Event Create Error:", error);
        throw error;
    }
}

/**
 * List Events for a specific range and calendars
 */
export async function listCalendarEvents(calendarId: string, timeMin: Date, timeMax: Date) {
    if (!isSignedIn()) return [];
    try {
        const response = await (window as any).gapi.client.calendar.events.list({
            calendarId: calendarId,
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
        });
        return response.result.items || [];
    } catch (e) {
        console.error(`[GoogleCalendar] List events failed for ${calendarId}:`, e);
        return [];
    }
}
