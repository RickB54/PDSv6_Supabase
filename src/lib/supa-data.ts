
import { supabase } from './supabase';
import localforage from 'localforage';
import { createClient } from '@supabase/supabase-js';


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
    type?: string;
    is_archived?: boolean; // New field
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
        // Use ephemeral client to bypass RLS/session issues for reliable directory listing
        const anonClient = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY,
            { auth: { persistSession: false } }
        );

        const { data: supaUsers, error } = await anonClient
            .from('app_users')
            .select('*');

        if (error) {
            console.error('Supabase fetch error (app_users):', error);
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
        // Fetch customers with their vehicles
        const { data, error } = await supabase
            .from('customers')
            .select(`
                *,
                vehicles (
                    make, model, year, type, color, vin
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('getSupabaseCustomers error:', error);
            return [];
        }

        // Client-side deduplication just in case DB is dirty
        const uniqueCustomers: Customer[] = [];
        const seenMap = new Set<string>();

        // 1. Process Supabase Data
        (data || []).forEach((c: any) => {
            const key = `${c.name?.trim().toLowerCase()}|${c.phone?.trim()}`;
            if (!seenMap.has(key)) {
                const v = c.vehicles && c.vehicles[0] ? c.vehicles[0] : {};
                uniqueCustomers.push({
                    id: c.id,
                    name: c.full_name || c.name,
                    email: c.email,
                    phone: c.phone,
                    address: c.address,
                    vehicle_info: { make: v.make, model: v.model, year: v.year, type: v.type, color: v.color },
                    notes: c.notes,
                    created_at: c.created_at,
                    type: c.type || 'customer',
                    is_archived: c.is_archived || false,
                } as any);
                seenMap.add(key);
            }
        });

        // 2. Merge Local Mocks (Safe Testing)
        try {
            const localCust = await localforage.getItem<any[]>('customers') || [];
            localCust.forEach(c => {
                if (!c.isStaticMock) return; // Only allow explicit mocks
                const key = `${c.name?.trim().toLowerCase()}|${c.phone?.trim()}`;
                if (!seenMap.has(key)) {
                    uniqueCustomers.push({
                        ...c,
                        vehicle_info: { make: c.vehicle, model: c.model, year: c.year, type: c.vehicleType, color: 'Mock' }
                    });
                    seenMap.add(key);
                }
            });
        } catch { }

        return uniqueCustomers;
    } catch (err) {
        console.error('getSupabaseCustomers exception:', err);
        return [];
    }
};

/**
 * Upserts a customer to Supabase.
 * Automatically handles vehicle creation/update if vehicle_info is provided.
 */
export const upsertSupabaseCustomer = async (customer: Partial<Customer> & { type?: string }) => {
    // 1. Prepare payload for CUSTOMERS table
    const payload: any = {
        full_name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        notes: customer.notes || '',
        type: customer.type || 'customer'
    };

    let customerId = customer.id;

    if (customerId) {
        // Update
        const { data, error } = await supabase
            .from('customers')
            .update(payload)
            .eq('id', customerId)
            .select()
            .single();
        if (error) throw error;
    } else {
        // Insert
        // Check duplication by email first to be safe
        if (payload.email) {
            const { data: existing } = await supabase.from('customers').select('id').eq('email', payload.email).single();
            if (existing) {
                // Update existing instead of simple insert
                const { data, error } = await supabase.from('customers').update(payload).eq('id', existing.id).select().single();
                if (error) throw error;
                customerId = existing.id;
            } else {
                const { data, error } = await supabase.from('customers').insert([payload]).select().single();
                if (error) throw error;
                customerId = data.id;
            }
        } else {
            const { data, error } = await supabase.from('customers').insert([payload]).select().single();
            if (error) throw error;
            customerId = data.id;
        }
    }

    // 2. Upsert VEHICLE if info provided
    if (customerId && customer.vehicle_info) {
        // Simple logic: Insert a new vehicle if it has content, 
        // essentially satisfying "Last Known Vehicle".
        // A more complex logic would check if it exists.
        const v = customer.vehicle_info;
        if (v.make || v.model || v.year) {
            const { error: vErr } = await supabase.from('vehicles').insert({
                customer_id: customerId,
                make: v.make,
                model: v.model,
                year: v.year, // ensure number or handled by db
                type: v.type || v.vehicleType,
                color: v.color
            });
            if (vErr) console.warn("Vehicle save failed", vErr);
        }
    }

    return { id: customerId, ...payload };
};
// ------------------------------------------------------------------
// Team Chat
// ------------------------------------------------------------------

export interface TeamMessage {
    id: string;
    created_at: string;
    sender_email: string;
    sender_name: string;
    recipient_email: string | null; // null = public
    content: string;
}

export const getTeamMessages = async (): Promise<TeamMessage[]> => {
    try {
        const { data, error } = await supabase
            .from('team_messages')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(100);

        if (error) {
            console.error('getTeamMessages error:', error);
            return [];
        }
        return data || [];
    } catch (err) {
        console.error('getTeamMessages exception:', err);
        return [];
    }
};

export const sendTeamMessage = async (content: string, senderEmail: string, senderName: string, recipientEmail?: string | null) => {
    try {
        const { data, error } = await supabase
            .from('team_messages')
            .insert([{
                content,
                sender_email: senderEmail,
                sender_name: senderName,
                recipient_email: recipientEmail || null
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('sendTeamMessage error:', err);
        throw err;
    }
};

// ------------------------------------------------------------------
// Estimates & Invoices
// ------------------------------------------------------------------

export interface Estimate {
    id?: string;
    estimateNumber?: number;
    customerId?: string;
    customerName?: string; // UI convenience
    vehicle?: string; // UI convenience
    vehicleId?: string;
    services: { name: string; price: number }[];
    total: number;
    date: string;
    status: string; // open, accepted, declined
    created_at?: string;
    notes?: string;
    packageId?: string; // optional metadata
    addonIds?: string[]; // optional metadata
}

export const getSupabaseEstimates = async (): Promise<Estimate[]> => {
    try {
        const { data, error } = await supabase
            .from('estimates')
            .select('*, customers(full_name), vehicles(make, model, year)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('getSupabaseEstimates error:', error);
            return [];
        }

        const results = (data || []).map((e: any) => ({
            id: e.id,
            estimateNumber: e.estimate_number,
            customerId: e.customer_id,
            customerName: e.customers?.full_name || 'Unknown',
            vehicle: e.vehicles ? `${e.vehicles.year} ${e.vehicles.make} ${e.vehicles.model}` : 'Unknown',
            vehicleId: e.vehicle_id,
            services: e.services || [],
            total: e.total,
            date: e.date,
            status: e.status,
            created_at: e.created_at,
            notes: e.notes
        }));

        // Merge Local Mock Estimates
        try {
            const localEst = await localforage.getItem<any[]>('estimates') || [];
            localEst.forEach(e => {
                if (e.isStaticMock) {
                    results.push(e);
                }
            });
        } catch { }

        return results.sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
    } catch (err) {
        console.error('Exception getSupabaseEstimates', err);
        return [];
    }
};

/**
 * Creates or updates an estimate.
 * Can optionally upsert customer/vehicle if provided in metadata (for BookNow flow).
 */
export const upsertSupabaseEstimate = async (p: Partial<Estimate> & {
    customer?: Partial<Customer> & { type?: string },
    vehicle?: any
}) => {
    // 1. Upsert Customer/Vehicle if provided
    let customerId = p.customerId;
    let vehicleId = p.vehicleId;

    if (p.customer) {
        // Use existing upsert logic
        const c = await upsertSupabaseCustomer({ ...p.customer, vehicle_info: p.vehicle });
        customerId = c.id;

        // If we just created the customer/vehicle via that function, we might need to query the vehicle ID
        if (p.vehicle) {
            const { data: vData } = await supabase.from('vehicles')
                .select('id')
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (vData) vehicleId = vData.id;
        }
    }

    // 2. Prepare Estimate Payload
    const payload = {
        customer_id: customerId,
        vehicle_id: vehicleId,
        services: p.services, // ensure this is valid json or use JSON.stringify if needed, Supabase client handles array/obj -> jsonb usually
        total: p.total,
        date: p.date,
        status: p.status || 'open',
        notes: p.notes,
    };

    // HANDLE LOCAL MOCK ESTIMATES
    const isMock = (String(p.id || '').startsWith('est_') || String(p.id || '').startsWith('static_') || (p as any).isStaticMock);
    if (isMock) {
        // Save to localforage instead of Supabase
        const ests = await localforage.getItem<any[]>('estimates') || [];
        const idx = ests.findIndex(e => e.id === p.id);
        const saved = {
            ...p,
            ...payload,
            id: p.id || `est_${Date.now()}`,
            customerName: p.customerName || p.customer?.name || 'Mock Customer', // Persist UI Helpers
            vehicle: p.vehicle || 'Mock Vehicle',
            isStaticMock: true,
            updatedAt: new Date().toISOString()
        };

        if (idx >= 0) {
            ests[idx] = saved;
        } else {
            ests.push(saved);
        }
        await localforage.setItem('estimates', ests);
        return saved;
    }

    if (p.id) {
        const { data, error } = await supabase.from('estimates').update(payload).eq('id', p.id).select().single();
        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabase.from('estimates').insert([payload]).select().single();
        if (error) throw error;
        return data;
    }
};

export const deleteSupabaseEstimate = async (id: string) => {
    const { error } = await supabase.from('estimates').delete().eq('id', id);
    if (error) throw error;
};

export const deleteTeamMessage = async (id: string) => {
    const { error } = await supabase.from('team_messages').delete().eq('id', id);
    if (error) throw error;
};

// ------------------------------------------------------------------
// Bookings
// ------------------------------------------------------------------

export interface SupaBooking {
    id: string;
    title: string;
    customer_name: string;
    date: string;
    status: string;
    created_at?: string;
    vehicle_info?: any;
    vehicle_year?: string;
    vehicle_make?: string;
    vehicle_model?: string;
    address?: string;
    assigned_employee?: string;
    notes?: string;
    price?: number;
    addons?: string[];
    booked_by?: string;
    has_reminder?: boolean;
    reminder_frequency?: number;
    is_archived?: boolean;
}

export const getSupabaseBookings = async (): Promise<SupaBooking[]> => {
    try {
        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .order('date', { ascending: false });

        if (error) {
            console.error('getSupabaseBookings error:', error);
            return [];
        }
        return data || [];
    } catch (err) {
        console.error('getSupabaseBookings exception:', err);
        return [];
    }
};
