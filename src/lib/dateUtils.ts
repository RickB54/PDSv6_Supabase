import { parseISO } from 'date-fns';

/**
 * Robustly parses a booking date string, preventing day-shifting caused by UTC midnight tokens.
 * Always pins midnight-ish UTC timestamps to local noon to ensure the date stays on the intended calendar day.
 */
export function getParsedBookingDate(scheduledAt: string | undefined): Date {
    if (!scheduledAt) return new Date();
    const str = scheduledAt;

    // 1. Handle date-only strings (e.g. "2024-01-25")
    if (!str.includes('T')) return parseISO(str + 'T12:00:00');

    // 2. Handle UTC or offset strings (e.g. "2024-01-25T00:00:00Z")
    // Identify if the timestamp is within 6 hours of midnight (common window for US timezone shifts)
    const timePart = str.split('T')[1] || '';
    const hour = parseInt(timePart.slice(0, 2));
    const hasOffset = str.includes('Z') || str.includes('+') || (timePart.includes('-') && timePart.split('-').length > 1);

    if (hasOffset && hour < 6) {
        // Force to local noon of the date part to prevent shifting to the previous day in local time
        return parseISO(str.split('T')[0] + 'T12:00:00');
    }

    // 3. Normal local or properly formatted ISO
    return parseISO(str);
}
