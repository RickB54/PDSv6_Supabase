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
    source?: string; // 'manual' | 'google'
    created_by?: string;
    created_at: string;
    updated_at: string;
}

// ... existing BUSINESS_HOURS ...

// NOTE: Using the existing functions but adding 'source' to payloads

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
                created_by: createdBy,
                source: 'manual'
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
                created_by: createdBy,
                source: 'manual'
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
                created_by: createdBy,
                source: 'manual'
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

// ... deleteBlock ...
// ... deleteBlocksForDate ...
// ... clearAllBlocks ...
// ... getDatesWithBlocks ...
// ... getAvailableSlots ...
// ... generateTimeSlots ...
// ... formatTimeAMPM ...

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
                    created_by: createdBy,
                    source: 'manual'
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
