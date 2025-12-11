
import { supabase } from './supabase';
import localforage from 'localforage';


// Types
export interface Employee {
    id?: string;
    email: string;
    name: string;
    role: string;
    // Local metadata fields
    flatRate?: number;
    bonuses?: number;
    paymentByJob?: boolean;
    jobRates?: Record<string, number>;
    lastPaid?: string;
}

export interface Customer {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    vehicle_info?: any;
    notes?: string;
    created_at?: string;
}

// ------------------------------------------------------------------
// Employees
// ------------------------------------------------------------------

/**
 * Fetches employees from Supabase (source of truth) and merges with 
 * local metadata (rates, bonuses) from localforage.
 * 
 * Strategy:
 * 1. Fetch all users from Supabase 'app_users' (or authorized_users).
 * 2. Fetch local 'company-employees' to get rates/bonuses.
 * 3. Return Supabase users, enriched with local data. 
 *    - Ignores employees that exist LOCALLY but NOT in Supabase (cleans up ghosts).
 *    - Deduplicates by email.
 */
export const getSupabaseEmployees = async (): Promise<Employee[]> => {
    try {
        // 1. Fetch from Supabase
        // We try 'app_users' first as it seems to be the main user directory based on AdminUsers.tsx
        const { data: supaUsers, error } = await supabase
            .from('app_users')
            .select('*');

        if (error) {
            console.error('Supabase fetch error (app_users):', error);
            // Fallback: If allowed, maybe return local? But goal is Single Source of Truth.
            // Let's try to return what we can or throw.
            // For now, let's look at authorized_users as fallback if app_users is empty/fails?
            // Actually AdminUsers.tsx uses app_users for the list.
        }

        const safeSupaUsers = supaUsers || [];

        // 2. Fetch Local Metadata
        const localEmployees = (await localforage.getItem<Employee[]>('company-employees')) || [];
        const localMap = new Map<string, Employee>();
        localEmployees.forEach(emp => {
            if (emp.email) localMap.set(emp.email.toLowerCase(), emp);
        });

        // 3. Merge & Deduplicate
        const mergedEmployees: Employee[] = [];
        const seenEmails = new Set<string>();

        // A. Add Supabase Users
        for (const supaUser of safeSupaUsers) {
            const email = (supaUser.email || '').toLowerCase();
            if (!email) continue;
            if (seenEmails.has(email)) continue; // Deduplicate

            // Check if this user is actually an employee or admin
            const role = (supaUser.role || '').toLowerCase();
            // Assuming we want all potential assignees which includes employees and admins
            // We include them if they are in the system.

            const normalizedRole = role === 'admin' || role === 'owner' ? 'Admin' : 'Employee';

            // Get local metadata
            const localData = localMap.get(email);

            mergedEmployees.push({
                id: supaUser.id, // Supabase ID
                email: supaUser.email,
                name: supaUser.name || supaUser.email, // Fallback to email if name missing
                role: normalizedRole,
                // Merge local fields
                flatRate: localData?.flatRate,
                bonuses: localData?.bonuses,
                paymentByJob: localData?.paymentByJob,
                jobRates: localData?.jobRates,
                lastPaid: localData?.lastPaid
            });

            seenEmails.add(email);
        }

        // B. Add Local-Only Employees (Fallback for when Supabase is out of sync or offline)
        localEmployees.forEach(localEmp => {
            const email = (localEmp.email || '').toLowerCase();
            if (!email) return;
            if (seenEmails.has(email)) return; // Already added from Supabase

            // Add local-only employee
            mergedEmployees.push({
                ...localEmp,
                id: localEmp.id || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // ensure ID
                name: localEmp.name || localEmp.email,
                role: localEmp.role || 'Employee'
            });
            seenEmails.add(email);
        });

        // Sort by name
        return mergedEmployees.sort((a, b) => a.name.localeCompare(b.name));

    } catch (err) {
        console.error('getSupabaseEmployees failed:', err);
        return [];
    }
};

// ------------------------------------------------------------------
// Customers
// ------------------------------------------------------------------

/**
 * Fetches customers directly from Supabase.
 * Deduplicates by name/phone if Supabase contains duplicates.
 */
export const getSupabaseCustomers = async (): Promise<Customer[]> => {
    try {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('getSupabaseCustomers error:', error);
            // Fallback to local if offline? 
            // For this task, we want to enforce Supabase truth.
            return [];
        }

        // Client-side deduplication just in case DB is dirty
        const uniqueCustomers: Customer[] = [];
        const seenMap = new Set<string>();

        (data || []).forEach((c: any) => {
            // Create a composite key for uniqueness ?? 
            // Or just use ID? User showed 'Cinthia Branka' twice. 
            // If they have different IDs but same name, they show as duplicates.
            // Let's dedup by Name + Phone to be safe for the UI list.
            const key = `${c.name?.trim().toLowerCase()}|${c.phone?.trim()}`;
            if (!seenMap.has(key)) {
                uniqueCustomers.push({
                    id: c.id,
                    name: c.name,
                    email: c.email,
                    phone: c.phone,
                    address: c.address,
                    vehicle_info: c.vehicle_info,
                    notes: c.notes,
                    created_at: c.created_at
                });
                seenMap.add(key);
            }
        });

        return uniqueCustomers;
    } catch (err) {
        console.error('getSupabaseCustomers exception:', err);
        return [];
    }
};

/**
 * Upserts a customer to Supabase.
 */
export const upsertSupabaseCustomer = async (customer: Partial<Customer>) => {
    // If no ID, it's a new customer.
    // We should check if one exists with same details first to prevent dupes?

    // 1. Prepare payload
    const payload = {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        vehicle_info: customer.vehicle_info,
        notes: customer.notes || '',
        // If it's new, add created_at? Supabase usually handles default now()
    };

    if (customer.id) {
        // Update
        const { data, error } = await supabase
            .from('customers')
            .update(payload)
            .eq('id', customer.id)
            .select()
            .single();
        if (error) throw error;
        return data;
    } else {
        // Insert
        // Optional: Check existence.
        // But simpler to just insert. logic in UI usually handles "edit vs new".
        const { data, error } = await supabase
            .from('customers')
            .insert([payload])
            .select() // return the inserted record
            .single();
        if (error) throw error;
        return data;
    }
};
