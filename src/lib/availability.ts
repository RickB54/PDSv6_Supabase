/**
 * Supabase-based Availability Management
 * Stores manual blocks in database for cross-device sync
 */

import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

export interface BlockedTimeSlot {
    id: string;
    date: string; // YYYY-MM-DD
    startTime?: string; // HH:mm (if undefined, blocks entire day)
    endTime?: string; // HH:mm
    reason?: string; // Optional note for admin
    source?: string; // Origin tracking
    createdAt: string;
}

export interface DayAvailability {
    date: string;
    fullyBlocked: boolean;
    blockedSlots: Array<{ start: string; end: string }>;
    availableSlots: Array<{ start: string; end: string }>;
}

const BUSINESS_HOURS = {
    start: '08:00',
    end: '16:00',
    slotDuration: 60 // minutes
};

/**
 * Get all blocked time slots from Supabase
 */
export async function getBlockedSlots(): Promise<BlockedTimeSlot[]> {
    try {
        const { data, error } = await supabase
            .from('availability_blocks')
            .select('*')
            .order('date', { ascending: true });

        if (error) {
            console.error('Error fetching availability blocks:', error);
            return [];
        }

        return (data || []).map((row: any) => ({
            id: row.id,
            date: row.date,
            startTime: row.start_time ? row.start_time.slice(0, 5) : null,
            endTime: row.end_time ? row.end_time.slice(0, 5) : null,
            reason: row.reason,
            source: row.source_origin,
            createdAt: row.created_at
        }));
    } catch (error) {
        console.error('Failed to fetch availability blocks:', error);
        return [];
    }
}

/**
 * Block a full day
 */
export async function blockFullDay(date: string, reason?: string, createdBy?: string): Promise<void> {
    const { error } = await supabase
        .from('availability_blocks')
        .insert({
            date,
            reason: reason || 'Blocked by admin',
            created_by: createdBy,
            source_origin: 'Hybrid Availability System'
        });

    if (error) console.error('Error blocking full day:', error);

    // Dispatch event for UI updates
    window.dispatchEvent(new Event('availability-changed'));
}

/**
 * Block a specific time range
 */
export async function blockTimeRange(
    date: string,
    startTime: string,
    endTime: string,
    reason?: string,
    createdBy?: string
): Promise<void> {
    const { error } = await supabase
        .from('availability_blocks')
        .insert({
            date,
            start_time: startTime,
            end_time: endTime,
            reason: reason || 'Time blocked',
            created_by: createdBy,
            source_origin: 'Hybrid Availability System'
        });

    if (error) console.error('Error blocking time range:', error);

    window.dispatchEvent(new Event('availability-changed'));
}

/**
 * Block multiple full days (date range)
 */
export async function blockDateRange(
    startDate: string,
    endDate: string,
    reason?: string,
    createdBy?: string
): Promise<void> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const blocks: any[] = [];

    // Correct date iteration
    const current = new Date(start);
    // Add 12 hours to avoid timezone shifting issues on iteration
    current.setHours(12, 0, 0, 0);
    const endCmp = new Date(end);
    endCmp.setHours(12, 0, 0, 0);

    while (current <= endCmp) {
        blocks.push({
            date: format(current, 'yyyy-MM-dd'),
            reason: reason || 'Blocked by admin',
            created_by: createdBy,
            source_origin: 'Public Holiday / Range'
        });
        current.setDate(current.getDate() + 1);
    }

    if (blocks.length > 0) {
        const { error } = await supabase
            .from('availability_blocks')
            .insert(blocks);

        if (error) console.error('Error blocking date range:', error);
    }

    window.dispatchEvent(new Event('availability-changed'));
}

/**
 * Unblock multiple full days (date range)
 */
export async function unblockDateRange(
    startDate: string,
    endDate: string
): Promise<void> {
    const { error } = await supabase
        .from('availability_blocks')
        .delete()
        .gte('date', startDate)
        .lte('date', endDate);

    if (error) console.error('Error unblocking date range:', error);

    window.dispatchEvent(new Event('availability-changed'));
}

/**
 * Unblock a specific slot (delete by ID)
 */
export async function unblockSlot(id: string): Promise<void> {
    const { error } = await supabase
        .from('availability_blocks')
        .delete()
        .eq('id', id);

    if (error) console.error('Error deleting block:', error);

    window.dispatchEvent(new Event('availability-changed'));
}

/**
 * Unblock entire day (delete all blocks for date)
 */
export async function unblockDay(date: string): Promise<void> {
    const { error } = await supabase
        .from('availability_blocks')
        .delete()
        .eq('date', date);

    if (error) console.error('Error unblocking day:', error);

    window.dispatchEvent(new Event('availability-changed'));
}

/**
 * Get list of dates that have blocks
 */
export async function getDatesWithBlocks(): Promise<string[]> {
    const { data, error } = await supabase
        .from('availability_blocks')
        .select('date')
        .order('date');

    if (error) return [];

    // Get unique dates
    const uniqueDates = [...new Set(data?.map((b: any) => b.date) || [])];
    return uniqueDates;
}


/**
 * Get availability availability for a specific day
 * (Used for frontend logic)
 */
export async function getDayAvailability(
    date: string,
    existingBookings: Array<{ scheduled_at: string; estimated_duration: number }> = []
): Promise<DayAvailability> {

    // 1. Fetch blocks for this date
    const { data: dbBlocks } = await supabase
        .from('availability_blocks')
        .select('*')
        .eq('date', date);

    const blocks = (dbBlocks || []).map((row: any) => ({
        id: row.id,
        date: row.date,
        startTime: row.start_time ? row.start_time.slice(0, 5) : null,
        endTime: row.end_time ? row.end_time.slice(0, 5) : null
    }));

    const blockedSlots: Array<{ start: string; end: string }> = [];
    let fullyBlocked = false;

    // Check full day blocks
    if (blocks.some(b => !b.startTime && !b.endTime)) {
        fullyBlocked = true;
    }

    // Generate all business slots
    const allSlots = generateTimeSlots(BUSINESS_HOURS.start, BUSINESS_HOURS.end, BUSINESS_HOURS.slotDuration);
    const availableSlots: Array<{ start: string; end: string }> = [];

    // Process each slot
    for (const slot of allSlots) {
        // 1. Check if manually blocked
        const isManuallyBlocked = fullyBlocked || blocks.some(b => {
            if (b.startTime && b.endTime) {
                return slot.start >= b.startTime && slot.start < b.endTime;
            }
            return false;
        });

        // 2. Check if booked by customer (accounts for duration)
        const isBooked = existingBookings.some(booking => {
            const bookingDate = new Date(booking.scheduled_at);
            if (format(bookingDate, 'yyyy-MM-dd') !== date) return false;

            const startMins = bookingDate.getHours() * 60 + bookingDate.getMinutes();
            const durationMins = (booking.estimated_duration || 1) * 60;
            const endMins = startMins + durationMins;

            const [slotH, slotM] = slot.start.split(':').map(Number);
            const slotMins = slotH * 60 + slotM;

            // Slot is blocked if it starts within the booking window
            return slotMins >= startMins && slotMins < endMins;
        });

        if (isManuallyBlocked || isBooked) {
            blockedSlots.push(slot);
        } else {
            availableSlots.push(slot);
        }
    }

    return {
        date,
        fullyBlocked: fullyBlocked || availableSlots.length === 0,
        blockedSlots,
        availableSlots
    };
}


/**
 * Helper: Generate time slots
 */
function generateTimeSlots(start: string, end: string, duration: number): Array<{ start: string; end: string }> {
    const slots: Array<{ start: string; end: string }> = [];
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);

    let currentHour = startHour;
    let currentMin = startMin;

    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
        const slotStart = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;

        currentMin += duration;
        if (currentMin >= 60) {
            currentHour += Math.floor(currentMin / 60);
            currentMin = currentMin % 60;
        }

        const slotEnd = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;

        slots.push({ start: slotStart, end: slotEnd });
    }

    return slots;
}

/**
 * Format time to AM/PM
 */
export function formatTimeAMPM(time24: string): string {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Set bulk availability for a range of dates
 * Each day config defines if morning/afternoon are OPEN
 */
export async function setBulkAvailability(
    configs: Array<{ date: string; morningOpen: boolean; afternoonOpen: boolean }>,
    reason?: string
): Promise<void> {
    const dates = configs.map(c => c.date);
    
    // 1. Clear all manual blocks for these dates
    const { error: deleteError } = await supabase
        .from('availability_blocks')
        .delete()
        .in('date', dates);
        
    if (deleteError) {
        console.error('Error clearing blocks for bulk update:', deleteError);
        throw deleteError;
    }
    
    // 2. Prepare new blocks
    const newBlocks: any[] = [];
    
    configs.forEach(config => {
        if (!config.morningOpen && !config.afternoonOpen) {
            // Full day block
            newBlocks.push({
                date: config.date,
                reason: reason || 'Bulk blocked',
                source_origin: 'Hybrid Availability System'
            });
        } else if (config.morningOpen && !config.afternoonOpen) {
            // Morning open, Afternoon closed -> Block 12:00-16:00
            newBlocks.push({
                date: config.date,
                start_time: '12:00:00',
                end_time: '16:00:00',
                reason: reason || 'Bulk partial block (Afternoon closed)',
                source_origin: 'Hybrid Availability System'
            });
        } else if (!config.morningOpen && config.afternoonOpen) {
            // Morning closed, Afternoon open -> Block 08:00-12:00
            newBlocks.push({
                date: config.date,
                start_time: '08:00:00',
                end_time: '12:00:00',
                reason: reason || 'Bulk partial block (Morning closed)',
                source_origin: 'Hybrid Availability System'
            });
        }
        // If both open -> No block record needed
    });
    
    if (newBlocks.length > 0) {
        const { error: insertError } = await supabase
            .from('availability_blocks')
            .insert(newBlocks);
            
        if (insertError) {
            console.error('Error inserting bulk blocks:', insertError);
            throw insertError;
        }
    }
    
    window.dispatchEvent(new Event('availability-changed'));
}

/**
 * Block all weekends in a month
 */
export async function blockWeekendsInMonth(year: number, month: number, reason?: string): Promise<void> {
    const blocks: any[] = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();

        // 0 = Sunday, 6 = Saturday
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            blocks.push({
                date: format(date, 'yyyy-MM-dd'),
                reason: reason || 'Weekend blocked'
            });
        }
    }

    if (blocks.length > 0) {
        const { error } = await supabase
            .from('availability_blocks')
            .insert(blocks);

        if (error) console.error('Error blocking weekends:', error);
    }

    window.dispatchEvent(new Event('availability-changed'));
}
