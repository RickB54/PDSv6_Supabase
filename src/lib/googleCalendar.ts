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
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes to safely avoid rate limits/quota issues


/**
 * Initialize Google APIs (Singleton pattern)
 * Loads GAPI for Calendar and GIS for Authentication
 */
export async function initGoogleCalendar(config: CalendarConfig): Promise<void> {
    const configHash = JSON.stringify({ c: config.clientId, a: config.apiKey, ids: config.calendarIds });

    // Check if config has changed and reset state if necessary
    if (lastInitConfig !== null && lastInitConfig !== configHash) {
        console.log("[GoogleCalendar] Configuration changed. Resetting Google API state.");
        tokenClient = null;
        isGsiLoaded = false;
        isGapiLoaded = false; // Force re-init of GAPI as well
        gapiLoadPromise = null; // Clear any pending promise
        // Also clear any existing token as it might be for a different client ID
        localStorage.removeItem('g_cal_token');
        localStorage.removeItem('g_cal_connected');
    }

    if (isGapiLoaded && isGsiLoaded && lastInitConfig === configHash && tokenClient) {
        console.log("[GoogleCalendar] Reusing existing initialization");
        return Promise.resolve();
    }
    if (gapiLoadPromise && lastInitConfig === configHash) {
        console.log("[GoogleCalendar] Initialization already in progress, returning existing promise.");
        return gapiLoadPromise;
    }

    if (!config.apiKey || !config.clientId) {
        console.error("[GoogleCalendar] Missing credentials. Client ID or API Key is empty.");
        return Promise.reject(new Error("Missing credentials. Please check your Client ID and API Key."));
    }

    console.log("[GoogleCalendar] Initializing with Client ID:", config.clientId);
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

                        // Share token globally via Supabase for "No Sync" robustness
                        saveGCalTokenToSupabase({
                            access_token: response.access_token,
                            expires_at: Date.now() + (response.expires_in * 1000)
                        });

                        window.dispatchEvent(new Event('g_cal_auth_complete'));
                    },
                });
                isGsiLoaded = true;

                // Restore token if exists
                const storedToken = localStorage.getItem('g_cal_token');
                const wasConnected = localStorage.getItem('g_cal_connected') === 'true';

                if (storedToken) {
                    try {
                        const token = JSON.parse(storedToken);
                        if (token.expires_at > Date.now()) {
                            (window as any).gapi.client.setToken({ access_token: token.access_token });
                        } else if (wasConnected) {
                            // Proactively try to refresh if it was previously connected
                            console.log("[GoogleCalendar] Proactively refreshing expired token...");
                            ensureSignedIn().catch(() => { });
                        }
                    } catch (e) {
                        console.warn("[GoogleCalendar] Failed to restore token:", e);
                    }
                } else if (wasConnected) {
                    // Even if no local token, try to load from Supabase shared storage
                    console.log("[GoogleCalendar] Local token missing but previously connected. Loading shared session...");
                    ensureSignedIn().catch(() => { });
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
    try {
        const storedToken = localStorage.getItem('g_cal_token');
        if (storedToken) {
            const token = JSON.parse(storedToken);
            if ((window as any).google?.accounts?.oauth2?.revoke) {
                (window as any).google.accounts.oauth2.revoke(token.access_token, () => {
                    console.log("[GoogleCalendar] Token revoked");
                });
            }
        }
    } catch (e) { console.warn("[GoogleCalendar] Revoke failed", e); }

    localStorage.removeItem('g_cal_token');
    localStorage.removeItem('g_cal_connected');

    if ((window as any).gapi?.client) {
        try { (window as any).gapi.client.setToken(null); } catch (e) { }
    }

    // Also clear shared token from Supabase
    if (isSupabaseEnabled()) {
        try {
            await supabase.from('app_settings').delete().eq('key', 'gcal_shared_token');
        } catch (e) { console.error("[GoogleCalendar] Supabase delete error:", e); }
    }
}

/**
 * Check if signed in and token is valid
 */
export function isSignedIn(): boolean {
    // 1. Check local storage first
    const storedToken = localStorage.getItem('g_cal_token');
    if (storedToken) {
        try {
            const token = JSON.parse(storedToken);
            const isValid = token.expires_at > Date.now();
            if (isValid && (window as any).gapi?.client) {
                (window as any).gapi.client.setToken({ access_token: token.access_token });
                return true;
            }
        } catch {
            // Fall through to Supabase check if local storage is corrupt
        }
    }

    // 2. If local storage token is invalid or missing, try to load from Supabase
    // This is an async operation, so we can't directly return its result here.
    // Instead, we'll rely on `getFreeBusy` or `ensureSignedIn` to proactively load it.
    // For `isSignedIn` to be synchronous, we can only check what's immediately available.
    // The `getFreeBusy` function will handle the async loading from Supabase.
    return false;
}

/**
 * Shared Token Helpers
 */
async function saveGCalTokenToSupabase(token: any) {
    if (!isSupabaseEnabled()) return;
    try {
        await supabase.from('app_settings').upsert({
            key: 'gcal_shared_token',
            value: {
                access_token: token.access_token,
                expires_at: token.expires_at,
                updated_at: new Date().toISOString()
            }
        });
    } catch (e) { }
}

export async function loadGCalTokenFromSupabase() {
    if (!isSupabaseEnabled()) return null;
    try {
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'gcal_shared_token').maybeSingle();
        if (data?.value && data.value.expires_at > Date.now()) {
            return data.value;
        }
    } catch (e) { }
    return null;
}

/**
 * Ensure we have a valid token, refreshing if necessary
 */
export async function ensureSignedIn(): Promise<void> {
    if (isSignedIn()) return;

    // Try to load from Supabase if local token is missing/expired
    const sharedToken = await loadGCalTokenFromSupabase();
    if (sharedToken) {
        localStorage.setItem('g_cal_token', JSON.stringify(sharedToken));
        localStorage.setItem('g_cal_connected', 'true');
        if ((window as any).gapi?.client) {
            (window as any).gapi.client.setToken({ access_token: sharedToken.access_token });
        }
        return; // Successfully loaded from Supabase
    }

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
    // For customers (online), avoid hard error if not signed in.
    if (!isSignedIn()) {
        try {
            // First try to load a shared token from Supabase
            const shared = await loadGCalTokenFromSupabase();
            if (shared && (window as any).gapi?.client) {
                (window as any).gapi.client.setToken({ access_token: shared.access_token });
                // Update local storage for consistency
                localStorage.setItem('g_cal_token', JSON.stringify(shared));
                localStorage.setItem('g_cal_connected', 'true');
            } else {
                // Do not force sign in for read-only checks if shared token fails
                console.warn("[GoogleCalendar] No session/shared token. Skipping silent auth to avoid popup.");
            }
        } catch (e) {
            console.warn("[GoogleCalendar] No valid session or shared token, attempting fetch with API Key...");
        }
    }

    const cacheKey = `${calendarIds.join(',')}_${timeMin.toISOString().split('T')[0]}_${timeMax.toISOString().split('T')[0]}`;
    const cached = freeBusyCache[cacheKey];

    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return cached.data;
    }

    try {
        if (!(window as any).gapi?.client?.calendar) {
            throw new Error("GAPI Calendar not initialized");
        }

        const response = await (window as any).gapi.client.calendar.freebusy.query({
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            items: calendarIds.map((id: string) => ({ id }))
        });

        const result = response.result;
        console.log(`[GoogleCalendar] FreeBusy Response for ${calendarIds.join(',')}:`, result);
        freeBusyCache[cacheKey] = { data: result, timestamp: Date.now() };
        return result;
    } catch (error: any) {
        if (error.status === 401 || error.status === 403) {
            // Token likely expired or invalid
            localStorage.removeItem('g_cal_token');
            localStorage.removeItem('g_cal_connected');

            // Try one-time recovery with Supabase shared token
            const shared = await loadGCalTokenFromSupabase();
            if (shared) {
                try {
                    (window as any).gapi.client.setToken({ access_token: shared.access_token });
                    // Update local storage for consistency
                    localStorage.setItem('g_cal_token', JSON.stringify(shared));
                    localStorage.setItem('g_cal_connected', 'true');

                    const retry = await (window as any).gapi.client.calendar.freebusy.query({
                        timeMin: timeMin.toISOString(),
                        timeMax: timeMax.toISOString(),
                        items: calendarIds.map((id: string) => ({ id }))
                    });
                    return retry.result;
                } catch (retryError) {
                    console.warn("[GoogleCalendar] Supabase shared token failed on retry:", retryError);
                }
            }

            // Fallback to empty
            return {
                calendars: {}
            } as FreeBusyResponse;
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

const eventsCache: Record<string, { data: any[]; timestamp: number }> = {};



/**
 * List Events for a specific range and calendars
 */
export async function listCalendarEvents(calendarId: string, timeMin: Date, timeMax: Date) {
    if (!isSignedIn()) {
        try {
            const shared = await loadGCalTokenFromSupabase();
            if (shared && (window as any).gapi?.client) {
                (window as any).gapi.client.setToken({ access_token: shared.access_token });
            }
        } catch (e) {
            console.warn("[GoogleCalendar] Not signed in and no shared token found. Skipping auto-auth.");
        }
    }

    const cacheKey = `events_${calendarId}_${timeMin.toISOString().split('T')[0]}_${timeMax.toISOString().split('T')[0]}`;
    const cached = eventsCache[cacheKey];
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        console.log(`[GoogleCalendar] Returning cached events for ${calendarId}`);
        return cached.data;
    }

    try {
        if (!(window as any).gapi?.client?.calendar) {
            return [];
        }

        const response = await (window as any).gapi.client.calendar.events.list({
            calendarId: calendarId,
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
        });

        const items = response.result.items || [];
        eventsCache[cacheKey] = { data: items, timestamp: Date.now() };
        return items;
    } catch (e) {
        console.error(`[GoogleCalendar] List events failed for ${calendarId}:`, e);
        return [];
    }
}

