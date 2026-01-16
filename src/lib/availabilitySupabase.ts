/**
 * Supabase-based Availability Management
 * Stores manual blocks in database for cross-device sync
 */

import supabase from './supabase';
import { format } from 'date-fns';

export interface AvailabilityBlock {
    id: string;
    date: string; // YYYY-MM-DD
    start_time?: string; // HH:MM
    end_time?: string; // HH:MM
    reason?: string;
    created_by?: string;
    created_at: string;
    updated_at: string;
}

const BUSINESS_HOURS = {
    start: '08:00',
    end: '16:00',
    slotDuration: 60 // minutes
};

/**
 * Get all availability blocks from Supabase
 */
export async function getAvailabilityBlocks(): Promise<AvailabilityBlock[]> {
    try {
        const { data, error } = await supabase
            .from('availability_blocks')
            .select('*')
            .order('date', { ascending: true });

        if (error) {
            console.error('Error fetching availability blocks:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Failed to fetch availability blocks:', error);
        return [];
    }
}

/**
 * Get blocks for a specific date
 */
export async function getBlocksForDate(date: string): Promise<AvailabilityBlock[]> {
    try {
        const { data, error } = await supabase
            .from('availability_blocks')
            .select('*')
            .eq('date', date);

        if (error) {
            console.error('Error fetching blocks for date:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Failed to fetch blocks for date:', error);
        return [];
    }
}

/**
 * Block a full day
 */
export async function blockFullDay(date: string, reason?: string, createdBy?: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('availability_blocks')
            .insert({
                date,
                reason: reason || 'Blocked by admin',
                created_by: createdBy
            });

        if (error) {
            console.error('Error blocking full day:', error);
            return false;
        }

        // Dispatch event for UI updates
        window.dispatchEvent(new Event('availability-changed'));
        return true;
    } catch (error) {
        console.error('Failed to block full day:', error);
        return false;
    }
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
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('availability_blocks')
            .insert({
                date,
                start_time: startTime,
                end_time: endTime,
                reason: reason || 'Time blocked',
                created_by: createdBy
            });

        if (error) {
            console.error('Error blocking time range:', error);
            return false;
        }

        window.dispatchEvent(new Event('availability-changed'));
        return true;
    } catch (error) {
        console.error('Failed to block time range:', error);
        return false;
    }
}

/**
 * Block multiple full days (date range)
 */
export async function blockDateRange(
    startDate: string,
    endDate: string,
    reason?: string,
    createdBy?: string
): Promise<boolean> {
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const blocks: any[] = [];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            blocks.push({
                date: format(d, 'yyyy-MM-dd'),
                reason: reason || 'Blocked by admin',
                created_by: createdBy
            });
        }

        const { error } = await supabase
            .from('availability_blocks')
            .insert(blocks);

        if (error) {
            console.error('Error blocking date range:', error);
            return false;
        }

        window.dispatchEvent(new Event('availability-changed'));
        return true;
    } catch (error) {
        console.error('Failed to block date range:', error);
        return false;
    }
}

/**
 * Delete a specific block
 */
export async function deleteBlock(blockId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('availability_blocks')
            .delete()
            .eq('id', blockId);

        if (error) {
            console.error('Error deleting block:', error);
            return false;
        }

        window.dispatchEvent(new Event('availability-changed'));
        return true;
    } catch (error) {
        console.error('Failed to delete block:', error);
        return false;
    }
}

/**
 * Delete all blocks for a specific date
 */
export async function deleteBlocksForDate(date: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('availability_blocks')
            .delete()
            .eq('date', date);

        if (error) {
            console.error('Error deleting blocks for date:', error);
            return false;
        }

        window.dispatchEvent(new Event('availability-changed'));
        return true;
    } catch (error) {
        console.error('Failed to delete blocks for date:', error);
        return false;
    }
}

/**
 * Clear all blocks
 */
export async function clearAllBlocks(): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('availability_blocks')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (error) {
            console.error('Error clearing all blocks:', error);
            return false;
        }

        window.dispatchEvent(new Event('availability-changed'));
        return true;
    } catch (error) {
        console.error('Failed to clear all blocks:', error);
        return false;
    }
}

/**
 * Get list of dates that have blocks
 */
export async function getDatesWithBlocks(): Promise<string[]> {
    try {
        const { data, error } = await supabase
            .from('availability_blocks')
            .select('date')
            .order('date');

        if (error) {
            console.error('Error fetching dates with blocks:', error);
            return [];
        }

        // Get unique dates
        const uniqueDates = [...new Set(data?.map(b => b.date) || [])];
        return uniqueDates;
    } catch (error) {
        console.error('Failed to fetch dates with blocks:', error);
        return [];
    }
}

/**
 * Get available time slots for a specific date
 */
export async function getAvailableSlots(
    date: string,
    existingBookings: Array<{ scheduled_at: string; estimated_duration: number }> = []
): Promise<Array<{ start: string; end: string }>> {
    try {
        // Get all blocks for this date
        const blocks = await getBlocksForDate(date);

        // Generate all possible time slots
        const allSlots = generateTimeSlots(BUSINESS_HOURS.start, BUSINESS_HOURS.end, BUSINESS_HOURS.slotDuration);

        // Filter out blocked slots
        const availableSlots = allSlots.filter(slot => {
            // Check if slot is blocked by manual block
            const isBlocked = blocks.some(block => {
                // Full day block
                if (!block.start_time && !block.end_time) {
                    return true;
                }

                // Time range block
                if (block.start_time && block.end_time) {
                    return slot.start >= block.start_time && slot.start < block.end_time;
                }

                return false;
            });

            if (isBlocked) return false;

            // Check if slot is taken by existing booking (accounts for duration)
            const isBooked = existingBookings.some(booking => {
                const bookingDate = new Date(booking.scheduled_at);
                const bookingDateStr = format(bookingDate, 'yyyy-MM-dd');

                if (bookingDateStr !== date) return false;

                const startMins = bookingDate.getHours() * 60 + bookingDate.getMinutes();
                const durationMins = (booking.estimated_duration || 1) * 60;
                const endMins = startMins + durationMins;

                const [slotH, slotM] = slot.start.split(':').map(Number);
                const slotMins = slotH * 60 + slotM;

                return slotMins >= startMins && slotMins < endMins;
            });

            return !isBooked;
        });

        return availableSlots;
    } catch (error) {
        console.error('Failed to get available slots:', error);
        return [];
    }
}

/**
 * Generate time slots
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
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Block all weekends in a month
 */
export async function blockWeekendsInMonth(year: number, month: number, reason?: string, createdBy?: string): Promise<boolean> {
    try {
        const blocks: any[] = [];
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayOfWeek = date.getDay();

            // 0 = Sunday, 6 = Saturday
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                blocks.push({
                    date: format(date, 'yyyy-MM-dd'),
                    reason: reason || 'Weekend',
                    created_by: createdBy
                });
            }
        }

        const { error } = await supabase
            .from('availability_blocks')
            .insert(blocks);

        if (error) {
            console.error('Error blocking weekends:', error);
            return false;
        }

        window.dispatchEvent(new Event('availability-changed'));
        return true;
    } catch (error) {
        console.error('Failed to block weekends:', error);
        return false;
    }
}
