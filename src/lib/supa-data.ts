import { createClient } from "@supabase/supabase-js";
import { supabase } from './supabase';
import localforage from 'localforage';
// Re-export supabase so other files can import it from here if needed, 
// but primarily so this file can use it.
export { supabase };


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

export interface Vehicle {
    id?: string;
    customer_id?: string;
    make: string;
    model: string;
    year?: string;
    type: string;
    color?: string;
    vin?: string;
    mileage?: string;
    conditionInside?: string;
    conditionOutside?: string;
    created_at?: string;
    // Media Gallery Fields
    generalPhotos?: string[];
    beforePhotos?: string[];
    afterPhotos?: string[];
    videoUrls?: string[]; // Multiple embedded video URLs
}

export interface Customer {
    id?: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    vehicle_info?: any;
    vehicles?: Vehicle[]; // Support for multiple vehicles
    notes?: string;
    created_at?: string;
    type?: string;
    is_archived?: boolean; // New field
    generalPhotos?: string[];
    beforePhotos?: string[];
    afterPhotos?: string[];
    videoUrl?: string;
    learningCenterUrl?: string;
    videoNote?: string;
    // Frontend-specific fields that might be packed into vehicle_info or notes
    vehicle?: string;
    model?: string;
    year?: string;
    color?: string;
    mileage?: string;
    vehicleType?: string;
    conditionInside?: string;
    conditionOutside?: string;
    services?: string[];
    lastService?: string;
    duration?: string;
    howFound?: string;
    howFoundOther?: string;
    shortVideos?: string[];
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
// Singleton ephemeral client to prevent "Multiple GoTrueClient" warnings
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase Environment Variables in supa-data.ts");
}

// Singleton ephemeral client to prevent "Multiple GoTrueClient" warnings
const anonClient = createClient(
    supabaseUrl,
    supabaseAnonKey,
    { auth: { persistSession: false } }
);

export const getSupabaseEmployees = async (): Promise<Employee[]> => {
    try {
        // 1. Fetch from Supabase using singleton anon client

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

            // STRICT FILTER: Only allow 'admin', 'owner', 'employee'
            if (!['admin', 'owner', 'employee'].includes(role)) {
                continue;
            }

            const normalizedRole = (role === 'admin' || role === 'owner') ? 'Admin' : 'Employee';

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
        // 1. Fetch CRM customers with their vehicles
        // IMPORTANT: Photos are in customers table, NOT vehicles table
        const { data: crmData, error: crmError } = await supabase
            .from('customers')
            .select(`
                *,
                vehicles (
                    id, make, model, year, type, color, vin,
                    general_photos, before_photos, after_photos, video_urls
                )
            `)
            .order('created_at', { ascending: false });

        if (crmError) {
            console.error('⚠️ getSupabaseCustomers CRM fetch error:', crmError);
            console.error('Error details:', { message: crmError.message, code: crmError.code, hint: crmError.hint });
            // Don't throw - try to continue with auth data
        }

        console.log('🔍 CRM Data from customers table:', {
            count: crmData?.length || 0,
            hasError: !!crmError,
            errorCode: crmError?.code,
            sampleData: crmData?.slice(0, 3).map(c => ({ id: c.id, name: c.full_name, type: c.type }))
        });

        // 2. Fetch Auth Users (App Users) with role = customer
        const { data: authData, error: authError } = await supabase
            .from('app_users')
            .select('*')
            .eq('role', 'customer');

        if (authError) {
            console.error('⚠️ getSupabaseCustomers auth fetch error:', authError);
        }

        // 3. Merge Strategies
        const uniqueCustomers: Customer[] = [];
        const seenEmails = new Set<string>();

        // Helper to process CRM record
        const processCrmRecord = (c: any) => {
            const safeEmail = (c.email || '').toLowerCase().trim();
            const key = safeEmail || `no-email-${c.id}`;

            if (safeEmail) seenEmails.add(safeEmail);

            const allVehsRaw = (c.vehicles || []).map((v: any) => ({
                id: v.id,
                make: v.make || '',
                model: v.model || '',
                year: v.year ? String(v.year) : '',
                type: v.type || '',
                color: v.color || '',
                vin: v.vin || '',
                mileage: v.mileage || '',
                conditionInside: v.condition_inside || '',
                conditionOutside: v.condition_outside || '',
                generalPhotos: v.general_photos || [],
                beforePhotos: v.before_photos || [],
                afterPhotos: v.after_photos || [],
                videoUrls: v.video_urls || []
            }));

            // Deduplicate vehicles by ID
            const seenVehIds = new Set<string>();
            const allVehs = allVehsRaw.filter(v => {
                if (!v.id) return true;
                if (seenVehIds.has(v.id)) return false;
                seenVehIds.add(v.id);
                return true;
            });

            // Fallback strategy: First vehicle from table, then legacy vehicle_info JSONB
            const v = allVehs[0] || {};
            const vi = c.vehicle_info || {};

            return {
                id: c.id,
                name: c.full_name || c.name || 'Unknown',
                email: c.email,
                phone: c.phone,
                address: c.address,
                // These top-level properties are key for UI display
                vehicle: v.make || vi.make || '',
                model: v.model || vi.model || '',
                year: v.year || vi.year || '',
                vehicleType: v.type || vi.type || vi.vehicleType || '',
                color: v.color || vi.color || '',
                mileage: v.mileage || vi.mileage || '',
                vehicles: allVehs,
                vehicle_info: {
                    make: v.make || vi.make,
                    model: v.model || vi.model,
                    year: v.year || vi.year,
                    type: v.type || vi.type || vi.vehicleType,
                    color: v.color || vi.color,
                    mileage: v.mileage || vi.mileage
                },
                notes: c.notes,
                created_at: c.created_at,
                type: c.type || 'customer',
                is_archived: c.is_archived || false,
                generalPhotos: c.general_photos && c.general_photos.length > 0 ? c.general_photos : (v.generalPhotos || []),
                beforePhotos: c.before_photos && c.before_photos.length > 0 ? c.before_photos : (v.beforePhotos || []),
                afterPhotos: c.after_photos && c.after_photos.length > 0 ? c.after_photos : (v.afterPhotos || []),
                videoUrl: c.video_url || v.videoUrls?.[0] || '',
                learningCenterUrl: c.learning_center_url || '',
                videoNote: c.video_note || '',
                howFound: c.how_found || '',
                howFoundOther: c.how_found_other || '',
                conditionInside: c.condition_inside || vi.conditionInside || '',
                conditionOutside: c.condition_outside || vi.conditionOutside || ''
            } as Customer;
        };

        // processCrmRecord helper is already defined above
        // Add CRM Data
        (crmData || []).forEach((c: any) => {
            const customer = processCrmRecord(c);
            // Normalize type to lowercase
            customer.type = (customer.type || 'customer').toLowerCase() as any;
            uniqueCustomers.push(customer);
        });

        // Add Auth Data (if not duplicate)
        (authData || []).forEach((u: any) => {
            const safeEmail = (u.email || '').toLowerCase().trim();
            if (safeEmail && !seenEmails.has(safeEmail)) {
                uniqueCustomers.push({
                    id: u.id,
                    name: u.name || u.email || 'Unknown',
                    email: u.email,
                    phone: '',
                    address: '',
                    vehicle: '',
                    model: '',
                    year: '',
                    vehicleType: '',
                    color: '',
                    vehicles: [],
                    vehicle_info: {},
                    notes: 'Registered Account (No CRM Profile)',
                    created_at: u.updated_at || new Date().toISOString(),
                    type: 'customer', // Auth users are always customers unless changed in CRM
                    is_archived: false
                });
                seenEmails.add(safeEmail);
            }
        });

        // 4. Merge Local Mocks (Safe Testing)
        try {
            const localCust = await localforage.getItem<any[]>('customers') || [];
            localCust.forEach(c => {
                if (!c.isStaticMock) return;
                const safeEmail = (c.email || '').toLowerCase().trim();
                const safePhone = (c.phone || '').replace(/\D/g, '');

                // Only skip if exact match from Supabase already exists
                if (safeEmail && seenEmails.has(safeEmail)) return;

                uniqueCustomers.push({
                    ...c,
                    type: (c.type || 'customer').toLowerCase() as any,
                    vehicles: c.vehicles || [],
                    vehicle_info: { make: c.vehicle, model: c.model, year: c.year, type: c.vehicleType, color: 'Mock' }
                });
            });
        } catch { }

        if (uniqueCustomers.length === 0) {
            console.log("⚠️ No customers found in Supabase CRM or Auth tables.");
        }

        // Sort by created recent first
        return uniqueCustomers.sort((a, b) => {
            const da = new Date(a.created_at || 0).getTime();
            const db = new Date(b.created_at || 0).getTime();
            if (isNaN(da) || isNaN(db)) return (a.name || '').localeCompare(b.name || '');
            return db - da;
        });

    } catch (err) {
        console.error('getSupabaseCustomers exception:', err);
        return [];
    }
}

/**
 * Fetch ALL vehicles directly from Supabase (for the gallery)
 */
export const getSupabaseAllVehicles = async (): Promise<Vehicle[]> => {
    try {
        const { data, error } = await supabase
            .from('vehicles')
            .select(`
                *,
                customers (
                    id, full_name, type
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('getSupabaseAllVehicles error:', error);
            return [];
        }

        return (data || []).map(v => ({
            id: v.id,
            make: v.make || '',
            model: v.model || '',
            year: v.year ? String(v.year) : '',
            type: v.type || '',
            color: v.color || '',
            vin: v.vin || '',
            customer_id: v.customer_id,
            generalPhotos: v.general_photos || [],
            beforePhotos: v.before_photos || [],
            afterPhotos: v.after_photos || [],
            videoUrls: v.video_urls || [],
            customer_info: v.customers ? {
                id: v.customers.id,
                name: v.customers.full_name,
                type: v.customers.type
            } : undefined
        } as any));
    } catch (err) {
        console.error('getSupabaseAllVehicles exception:', err);
        return [];
    }
}


/**
 * Save a classified vehicle to the Supabase vehicles table
 * Makes it searchable for future bookings/customers
 */
export async function upsertSupabaseVehicle(vehicleData: {
    id?: string;
    make: string;
    model: string;
    year?: string;
    type: string;
    color?: string;
    vin?: string;
    mileage?: string;
    conditionInside?: string;
    conditionOutside?: string;
    customer_id?: string;
    generalPhotos?: string[];
    beforePhotos?: string[];
    afterPhotos?: string[];
    videoUrls?: string[];
}) {
    try {
        const payload: any = {
            make: vehicleData.make,
            model: vehicleData.model,
            year: vehicleData.year || null,
            type: vehicleData.type,
            color: vehicleData.color || null,
            vin: vehicleData.vin || null,
            mileage: vehicleData.mileage || null,
            // Condition fields - will work after running ADD_VEHICLE_CONDITION_COLUMNS.sql
            condition_inside: vehicleData.conditionInside || null,
            condition_outside: vehicleData.conditionOutside || null,
            general_photos: vehicleData.generalPhotos || [],
            before_photos: vehicleData.beforePhotos || [],
            after_photos: vehicleData.afterPhotos || [],
            video_urls: vehicleData.videoUrls || []
        };

        // Strict UUID validation for payload.id
        if (vehicleData.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vehicleData.id)) {
            payload.id = vehicleData.id;
        }

        // Strict UUID validation for customer_id
        if (vehicleData.customer_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vehicleData.customer_id)) {
            payload.customer_id = vehicleData.customer_id;
        } else {
            payload.customer_id = null;
        }

        console.log('🚗 Upserting vehicle with customer_id:', payload.customer_id);

        const { data, error } = await supabase
            .from('vehicles')
            .upsert(payload, { onConflict: 'id' })
            .select()
            .single();

        if (error) {
            console.error('❌ Supabase Vehicle Upsert Error:', error);
            throw error;
        }
        console.log('✅ Vehicle saved successfully with ID:', data.id);
        return data;
    } catch (err) {
        console.error('Failed to save vehicle to Supabase:', err);
        throw err;
    }
};

/**
 * Upserts a customer to Supabase.
 * Automatically handles multiple vehicle creation/update.
 */
export const upsertSupabaseCustomer = async (customer: Partial<Customer> & { type?: string }) => {
    // 1. Prepare payload for CUSTOMERS table
    const safeEmail = customer.email?.trim() || undefined;
    const safePhone = customer.phone?.trim() || undefined;

    // BUILD PAYLOAD CAREFULLY - TO AVOID CRASHING IF COLUMNS ARE MISSING
    const payload: any = {
        full_name: customer.name,
        email: safeEmail,
        phone: safePhone,
        address: customer.address,
        notes: customer.notes || '',
        type: customer.type || 'customer',
        general_photos: customer.generalPhotos,
        before_photos: customer.beforePhotos,
        after_photos: customer.afterPhotos,
        video_url: customer.videoUrl,
        learning_center_url: customer.learningCenterUrl
    };

    // ONLY ADD THESE IF THEY WERE PASSED - AND WE'LL CATCH DB ERROR IF MISSING
    if (customer.howFound) payload.how_found = customer.howFound;
    if (customer.howFoundOther) payload.how_found_other = customer.howFoundOther;
    if (customer.conditionInside) payload.condition_inside = customer.conditionInside;
    if (customer.conditionOutside) payload.condition_outside = customer.conditionOutside;

    const customerId = (customer.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customer.id)) ? customer.id : undefined;

    // Use native upsert for atomic operation
    const upsertData: any = { ...payload };
    if (customerId) upsertData.id = customerId;

    // If no ID but email exists, try to find existing by email first to avoid duplicates
    let finalId = customerId;
    if (!finalId && payload.email) {
        const { data: existing } = await supabase.from('customers').select('id').eq('email', payload.email).maybeSingle();
        if (existing) finalId = existing.id;
    }

    if (finalId) upsertData.id = finalId;

    const { data: upserted, error: upsertError } = await supabase
        .from('customers')
        .upsert(upsertData, { onConflict: 'id' })
        .select()
        .single();

    if (upsertError) {
        console.error('[upsertSupabaseCustomer] Upsert error:', upsertError);
        throw upsertError;
    }

    finalId = upserted.id;
    const finalVehicles: any[] = [];

    // 2. Upsert VEHICLES if info provided
    if (finalId) {
        // A. Handle 'vehicles' array (preferred)
        if (customer.vehicles && Array.isArray(customer.vehicles)) {
            for (const v of customer.vehicles) {
                if (v.make || v.model || v.year) {
                    const savedVeh = await upsertSupabaseVehicle({
                        ...v,
                        customer_id: finalId
                    });
                    finalVehicles.push(savedVeh);
                }
            }
        }
        // B. Fallback to legacy 'vehicle_info' for single vehicle entry
        else if (customer.vehicle_info) {
            const v = customer.vehicle_info;
            if (v.make || v.model || v.year) {
                const savedVeh = await upsertSupabaseVehicle({
                    make: v.make,
                    model: v.model,
                    year: v.year,
                    type: v.type || v.vehicleType || 'Compact/Sedan',
                    color: v.color,
                    customer_id: finalId
                });
                finalVehicles.push(savedVeh);
            }
        }
    }

    return {
        ...upserted,
        name: upserted.full_name, // Map back for consistency
        vehicles: finalVehicles.length > 0 ? finalVehicles : (customer.vehicles || [])
    };
};

/**
 * Deletes a customer and all their associated data (Vehicles, Bookings, Invoices, Storage Files)
 * This is a highly robust deletion that cleans up database rows AND physical storage files.
 */
export const deleteSupabaseCustomer = async (id: string) => {
    try {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            console.warn(`[DeleteCustomer] Invalid UUID: ${id}`);
            return { success: false, error: 'invalid_id' };
        }

        console.log(`[DeleteCustomer] Starting total cleanup for ID: ${id}`);

        // 1. COLLECT MEDIA URLS (Storage Cleanup Preparation)
        // We need to fetch the customer and their vehicles to get all photo URLs before deleting rows.
        const { data: customer, error: fetchError } = await supabase
            .from('customers')
            .select('*, vehicles(*)')
            .eq('id', id)
            .maybeSingle();

        if (fetchError) console.warn('[DeleteCustomer] Error fetching for media cleanup:', fetchError);

        if (customer) {
            const mediaUrls: string[] = [
                ...(customer.general_photos || []),
                ...(customer.before_photos || []),
                ...(customer.after_photos || []),
                ...(customer.short_videos || []),
                ...(customer.vehicles?.flatMap((v: any) => [
                    ...(v.general_photos || []),
                    ...(v.before_photos || []),
                    ...(v.after_photos || []),
                    ...(v.video_urls || [])
                ]) || [])
            ].filter(Boolean);

            if (mediaUrls.length > 0) {
                console.log(`[DeleteCustomer] Found ${mediaUrls.length} media items to purge from storage.`);

                // Extract unique paths from bucket URLs
                const bucketName = 'customer-photos';
                const storagePaths = mediaUrls
                    .filter(url => url.includes(`/${bucketName}/`))
                    .map(url => url.split(`/${bucketName}/`).pop())
                    .filter(Boolean) as string[];

                if (storagePaths.length > 0) {
                    const { error: storageError } = await supabase.storage
                        .from(bucketName)
                        .remove(storagePaths);

                    if (storageError) console.warn('[DeleteCustomer] Storage cleanup warning:', storageError);
                    else console.log(`[DeleteCustomer] Successfully purged ${storagePaths.length} files from ${bucketName}`);
                }
            }
        }

        // 2. DATABASE DELETION (CRM)
        // ON DELETE CASCADE at DB level handles vehicles, bookings, invoices, estimates.
        const { error: crmError, count: crmCount } = await supabase
            .from('customers')
            .delete({ count: 'exact' })
            .eq('id', id);

        if (crmError) {
            console.error('[DeleteCustomer] Database deletion failed:', crmError);
            throw crmError;
        }

        // 3. AUTH PROFILE CLEANUP (Optional app_users sync)
        const { error: authError, count: authCount } = await supabase
            .from('app_users')
            .delete({ count: 'exact' })
            .eq('id', id);

        console.log(`[DeleteCustomer] Completed. CRM count: ${crmCount}, Auth count: ${authCount}`);

        return {
            success: true,
            crmCount: crmCount || 0,
            authCount: authCount || 0
        };
    } catch (err: any) {
        console.error('[DeleteCustomer] Processing error:', err);
        throw err;
    }
};
// ------------------------------------------------------------------
// Team Chat
// ------------------------------------------------------------------

export interface OnlineUser {
    email: string;
    name: string;
    role?: string;
    lastSeen: string;
}

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

export const getSupabaseEstimates = async (filterByCurrentUser = false): Promise<Estimate[]> => {
    try {
        let query = supabase
            .from('estimates')
            .select('*, customers(full_name), vehicles(make, model, year)')
            .order('created_at', { ascending: false });

        if (filterByCurrentUser) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: customerData } = await supabase
                    .from('customers')
                    .select('id')
                    .eq('user_id', user.id)
                    .single();

                if (customerData) {
                    query = query.eq('customer_id', customerData.id);
                } else {
                    return [];
                }
            } else {
                return [];
            }
        }

        const { data, error } = await query;

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

export const deleteAllTeamMessages = async () => {
    const { error, count } = await supabase.from('team_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
    if (error) throw error;
    return count;
};



// ------------------------------------------------------------------
// Staff Schedule (Cloud)
// ------------------------------------------------------------------

export interface StaffShift {
    id?: string;
    employee_id: string; // references app_users.id or email
    employee_name: string;
    date: string; // YYYY-MM-DD
    start_time: string; // HH:mm
    end_time: string; // HH:mm
    role: string;
    notes?: string;
    color?: string;
    status?: string;
}

export const getStaffShifts = async (start: string, end: string) => {
    // Determine range or fetch all. For now, fetch all relative to date range, or just all for simplicity if dataset small.
    // Let's filter by date string range for efficiency.
    const { data, error } = await supabase
        .from('staff_shifts')
        .select('*')
        .gte('date', start)
        .lte('date', end);

    if (error) {
        console.error('getStaffShifts error:', error);
        return [];
    }
    return data || [];
};

export const createStaffShift = async (shift: StaffShift) => {
    const { data, error } = await supabase
        .from('staff_shifts')
        .insert([shift])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateStaffShift = async (id: string, updates: Partial<StaffShift>) => {
    const { data, error } = await supabase
        .from('staff_shifts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteStaffShift = async (id: string) => {
    const { error } = await supabase
        .from('staff_shifts')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

// [Removed duplicate Bookings section. See end of file for implementation.]

export const getSupabaseInvoices = async (filterByCurrentUser = false): Promise<any[]> => {
    try {
        let query = supabase
            .from('invoices')
            .select('*, customers(full_name, user_id), vehicles(make, model, year)')
            .order('created_at', { ascending: false });

        // If filtering for current user (customer dashboard), only get their invoices
        if (filterByCurrentUser) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            // Get customer record for this auth user
            const { data: customerData } = await supabase
                .from('customers')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!customerData) return [];

            query = query.eq('customer_id', customerData.id);
        }

        const { data, error } = await query;

        if (error) {
            console.error('getSupabaseInvoices error:', error);
            return [];
        }

        return (data || []).map((i: any) => ({
            id: i.id,
            invoiceNumber: i.invoice_number,
            customerId: i.customer_id,
            customerName: i.customers?.full_name || 'Unknown',
            vehicle: i.vehicles ? `${i.vehicles.year} ${i.vehicles.make} ${i.vehicles.model}` : 'Unknown',
            services: i.services || [],
            total: i.total,
            date: i.date,
            paymentStatus: i.status || 'unpaid',
            createdAt: i.created_at,
            paidAmount: i.paid_amount || 0,
            paidDate: i.paid_date
        }));
    } catch (err) {
        console.error('getSupabaseInvoices exception:', err);
        return [];
    }
};

export const upsertSupabaseInvoice = async (invoice: any) => {
    // Map Frontend Invoice object to DB columns
    const payload = {
        invoice_number: invoice.invoiceNumber,
        customer_id: invoice.customerId,
        // We don't store customer_name or vehicle text directly if we have relations, 
        // but if the table supports it as cache, we could. 
        // For now, assume relations handle it, OR relying on what we just selected.
        // Actually, for Auth-only users who don't have a Customer row, we MIGHT have an issue if we don't store the name.
        // Let's check if the table has 'customer_name' column? 
        // If not, we rely on the ID.
        // vehicle_id might be needed if we want to link it.
        // services is JSONB
        services: invoice.services,
        total: invoice.total,
        date: invoice.date,
        status: invoice.paymentStatus,
        paid_amount: invoice.paidAmount,
        paid_date: invoice.paidDate
    };

    if (invoice.id) {
        const { data, error } = await supabase.from('invoices').update(payload).eq('id', invoice.id).select().single();
        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabase.from('invoices').insert([payload]).select().single();
        if (error) throw error;
        return data;
    }
};

export const deleteSupabaseInvoice = async (id: string) => {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) throw error;
};



// ------------------------------------------------------------------
// Payments
// ------------------------------------------------------------------

export const getSupabasePayments = async (filterByCurrentUser = false): Promise<any[]> => {
    try {
        let query = supabase
            .from('payments')
            .select('*, bookings(customer_id, service_package)')
            .order('created_at', { ascending: false });

        // If filtering for current user, get their payments through bookings
        if (filterByCurrentUser) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            // Get customer record for this auth user
            const { data: customerData } = await supabase
                .from('customers')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!customerData) return [];

            // Get all bookings for this customer
            const { data: bookings } = await supabase
                .from('bookings')
                .select('id')
                .eq('customer_id', customerData.id);

            if (!bookings || bookings.length === 0) return [];

            const bookingIds = bookings.map(b => b.id);
            query = query.in('booking_id', bookingIds);
        }

        const { data, error } = await query;

        if (error) {
            console.error('getSupabasePayments error:', error);
            return [];
        }

        return (data || []).map((p: any) => ({
            id: p.id,
            bookingId: p.booking_id,
            amount: p.amount,
            currency: p.currency,
            status: p.status,
            servicePackage: p.bookings?.service_package,
            createdAt: p.created_at
        }));
    } catch (err) {
        console.error('getSupabasePayments exception:', err);
        return [];
    }
};

// ------------------------------------------------------------------
// Training Center
// ------------------------------------------------------------------


export interface TrainingBadge {
    id: string;
    title: string;
    description: string;
    icon_name: string;
    color: string;
}

export interface TrainingModule {
    id: string;
    title: string;
    category: string;
    video_url: string;
    description: string;
    quiz_data: any[]; // { question, options, correctIndex }
    created_at?: string;
    // New Fields
    prerequisite_ids?: string[];
    sop_link?: string;
    is_safety?: boolean;
    badge_reward_id?: string;
    // Joined Badge (readonly)
    badge?: TrainingBadge;
}

export interface TrainingProgress {
    id?: string;
    user_id: string;
    module_id: string;
    status: 'started' | 'completed';
    score: number;
    completed_at?: string;
    answers?: number[];
    // New Fields
    video_position?: number;
    acknowledged_at?: string;
}

export const getTrainingModules = async (): Promise<TrainingModule[]> => {
    try {
        // Join with badges to get badge details
        const { data, error } = await supabase
            .from('training_modules')
            .select('*, badge:training_badges(*)')
            .order('created_at', { ascending: false });
        if (error) { console.error('getTrainingModules error:', error); return []; }
        // Flatten or map if necessary, but Supabase returns object for single relation usually
        return (data || []).map((m: any) => ({
            ...m,
            badge: m.badge // Supabase returns single object or null
        }));
    } catch (e) { console.error(e); return []; }
};

export const getTrainingBadges = async (): Promise<TrainingBadge[]> => {
    try {
        const { data } = await supabase.from('training_badges').select('*');
        return data || [];
    } catch { return []; }
}

export const upsertTrainingModule = async (module: Partial<TrainingModule>) => {
    const payload = { ...module };
    if (payload.id && payload.id.startsWith('vid_')) delete payload.id;
    // Remove joined object before upsert
    delete payload.badge;

    const { data, error } = await supabase.from('training_modules').upsert(payload as any).select().single();
    if (error) throw error;
    return data;
};

export const deleteTrainingModule = async (id: string) => {
    const { error } = await supabase.from('training_modules').delete().eq('id', id);
    if (error) throw error;
};

export const getTrainingProgress = async (userId: string) => {
    const { data, error } = await supabase.from('training_progress').select('*').eq('user_id', userId);
    if (error) { console.error('getTrainingProgress error:', error); return []; }
    return data || [];
};

export const upsertTrainingProgress = async (progress: Partial<TrainingProgress>) => {
    // If we have an ID, upsert by ID. If not, upsert by user_id+module_id
    const conflict = progress.id ? 'id' : 'user_id, module_id';
    const { data, error } = await supabase.from('training_progress')
        .upsert(progress as any, { onConflict: conflict })
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const getOrientationExamModule = async (): Promise<TrainingModule | null> => {
    const { data } = await supabase.from('training_modules').select('*').eq('title', 'Final Orientation Exam').single();
    return data;
};

// ------------------------------------------------------------------
// Learning Library
// ------------------------------------------------------------------

export interface LibraryItem {
    id: string;
    title: string;
    description: string;
    type: 'video' | 'pdf' | 'article' | 'image';
    duration?: string;
    category: string;
    thumbnail_url?: string;
    resource_url?: string;
    created_at?: string;
    updated_at?: string;
    created_by?: string; // Email of the user who created it
    is_published?: boolean;
    is_verified?: boolean;
}

/**
 * Get all learning library items from Supabase
 */
export async function getLibraryItems(): Promise<LibraryItem[]> {
    try {
        const { data, error } = await supabase
            .from('learning_library_items')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Parse Metadata from Description
        const parsedData = (data || []).map((item: any) => {
            const desc = item.description || '';
            const createdByMatch = desc.match(/\[meta:created_by=([^\]]+)\]/);
            const originalTypeMatch = desc.match(/\[meta:original_type=([^\]]+)\]/);

            // Clean description for display
            const cleanDesc = desc
                .replace(/\[meta:created_by=[^\]]+\]/g, '')
                .replace(/\[meta:original_type=[^\]]+\]/g, '')
                .trim();

            return {
                ...item,
                description: cleanDesc,
                created_by: createdByMatch ? createdByMatch[1] : undefined,
                // Restore type if it was mapped
                type: originalTypeMatch ? originalTypeMatch[1] : item.type
            };
        });

        return parsedData as LibraryItem[];
    } catch (err) {
        console.error('Error fetching library items:', err);
        return [];
    }
}

// Comments Management
// ------------------------------------------------------------------
export interface LibraryComment {
    id: string;
    post_id: string;
    parent_id?: string; // Support for nested replies
    author: string;
    avatar_url?: string;
    text: string;
    created_at: string;
}

export async function getComments(postId: string): Promise<LibraryComment[]> {
    try {
        const { data, error } = await supabase
            .from('learning_library_comments')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data as LibraryComment[];
    } catch (error) {
        console.error("Error fetching comments:", error);
        return [];
    }
}

export async function addComment(comment: Omit<LibraryComment, 'id' | 'created_at'>): Promise<LibraryComment | null> {
    try {
        const { data, error } = await supabase
            .from('learning_library_comments')
            .insert([comment])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error adding comment:", error);
        return null;
    }
}

export async function getAllCommentCounts(): Promise<Record<string, number>> {
    try {
        const { data, error } = await supabase
            .from('learning_library_comments')
            .select('post_id');

        if (error) throw error;

        const counts: Record<string, number> = {};
        data?.forEach((c: any) => {
            counts[c.post_id] = (counts[c.post_id] || 0) + 1;
        });
        return counts;
    } catch (error) {
        console.error("Error fetching comment counts:", error);
        return {};
    }
}

/**
 * Rename a category across all posts
 */
export async function renameLibraryCategory(oldName: string, newName: string): Promise<{ success: boolean; count: number }> {
    try {
        const { data, error } = await supabase
            .from('learning_library_items')
            .update({ category: newName })
            .eq('category', oldName)
            .select();

        if (error) throw error;
        return { success: true, count: data ? data.length : 0 };
    } catch (error) {
        console.error("Error renaming category:", error);
        return { success: false, count: 0 };
    }
}

/**
 * Delete a category (Reassign posts to 'General')
 */
export async function deleteLibraryCategory(targetCategory: string): Promise<{ success: boolean; count: number }> {
    try {
        const { data, error } = await supabase
            .from('learning_library_items')
            .update({ category: 'General' })
            .eq('category', targetCategory)
            .select();

        if (error) throw error;
        return { success: true, count: data ? data.length : 0 };
    } catch (error) {
        console.error("Error deleting category:", error);
        return { success: false, count: 0 };
    }
}

/**
 * Create or update a learning library item
 */
export async function upsertLibraryItem(item: LibraryItem): Promise<{ success: boolean; data?: LibraryItem; error?: any }> {
    try {
        // Pack metadata into description for persistence
        // We use the raw description + the tag
        let descriptionToSave = item.description || '';

        // Handle OWNER metadata (created_by)
        if (item.created_by) {
            descriptionToSave = descriptionToSave.replace(/\[meta:created_by=([^\]]+)\]/g, '').trim();
            descriptionToSave += `\n\n[meta:created_by=${item.created_by}]`;
        }

        // Handle TYPE mapping (DB only allows video, pdf, article)
        // We map 'image' -> 'article' and add metadata
        let typeToSave = item.type;
        if (item.type === 'image') {
            typeToSave = 'article';
            descriptionToSave = descriptionToSave.replace(/\[meta:original_type=([^\]]+)\]/g, '').trim();
            descriptionToSave += `\n\n[meta:original_type=image]`;
        }

        const payload: any = {
            id: item.id || crypto.randomUUID(),
            title: item.title,
            description: descriptionToSave,
            type: typeToSave,
            duration: item.duration,
            category: item.category,
            thumbnail_url: item.thumbnail_url,
            resource_url: item.resource_url,
            is_published: item.is_published ?? false,
            is_verified: item.is_verified ?? false,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('learning_library_items')
            .upsert(payload)
            .select()
            .maybeSingle();

        if (error) {
            console.error("Supabase Upsert Error:", error);
            return { success: false, error };
        }
        return { success: true, data };
    } catch (err) {
        console.error('Error upserting library item:', err);
        return { success: false, error: err };
    }
}

/**
 * Delete a learning library item
 */
export async function deleteLibraryItem(id: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('learning_library_items')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Error deleting library item:', err);
        return false;
    }
}

/**
 * Copies a library item (e.g. from Blog to Learning Library or vice-versa)
 * by creating a new record with a new ID.
 */
export async function copyLibraryItem(item: LibraryItem, targetCategory?: string): Promise<{ success: boolean; data?: LibraryItem; error?: any }> {
    try {
        const newItem = {
            ...item,
            id: crypto.randomUUID(),
            category: targetCategory || item.category,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        return await upsertLibraryItem(newItem);
    } catch (err) {
        console.error('Error copying library item:', err);
        return { success: false, error: err };
    }
}

/**
 * Bulk delete library items by type (or all).
 * This is a destructive admin action.
 */
export async function deleteLibraryItems(targetType: 'video' | 'image' | 'all'): Promise<{ success: boolean; count: number }> {
    try {
        // 1. Fetch all items (so we can parse metadata to identify 'image' types correctly)
        const allItems = await getLibraryItems();

        let toDelete: LibraryItem[] = [];

        if (targetType === 'all') {
            toDelete = allItems;
        } else {
            toDelete = allItems.filter(item => item.type === targetType);
        }

        if (toDelete.length === 0) {
            return { success: true, count: 0 };
        }

        const ids = toDelete.map(i => i.id);

        // 2. Perform Delete
        const { error } = await supabase
            .from('learning_library_items')
            .delete()
            .in('id', ids);

        if (error) throw error;

        return { success: true, count: ids.length };

    } catch (err) {
        console.error('deleteLibraryItems error:', err);
        return { success: false, count: 0 };
    }
}

import { compressImage } from './imageUtils';

/**
 * Upload a file to Supabase storage with compression and robust fallback
 */
export async function uploadLibraryFile(file: File): Promise<{ url: string | null, error: string | null }> {
    try {
        // 1. Compress Image
        const compressedFile = await compressImage(file);

        const fileExt = compressedFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `library/${fileName}`;

        // 2. Dynamic Bucket Discovery
        // Prioritize 'customer-photos' as it's the standard for this app
        const { data: buckets } = await supabase.storage.listBuckets();

        // Preferred order of buckets to try
        const preferredBuckets = ['customer-photos', 'images', 'public'];
        let targetBucket = 'customer-photos'; // Default

        if (buckets && buckets.length > 0) {
            const bucketNames = buckets.map(b => b.name);
            const found = preferredBuckets.find(b => bucketNames.includes(b));
            if (found) targetBucket = found;
            else targetBucket = buckets[0].name; // Fallback to whatever exists
        }

        console.log(`Uploading to bucket: ${targetBucket}`);

        // 3. Attempt Upload
        const { error: uploadError } = await supabase.storage
            .from(targetBucket)
            .upload(filePath, compressedFile);

        if (!uploadError) {
            const { data } = supabase.storage.from(targetBucket).getPublicUrl(filePath);
            return { url: data.publicUrl, error: null };
        }

        console.warn(`Upload to '${targetBucket}' failed:`, uploadError.message);

        // AUTO-FIX: Create bucket if specifically missing
        if (uploadError.message.includes('not found') || uploadError.message.includes('Bucket')) {
            // Try to use 'images' as a backup if customer-photos failed
            if (targetBucket !== 'images') {
                console.log("Retrying with 'images' bucket...");
                const { error: retryError } = await supabase.storage.from('images').upload(filePath, compressedFile);
                if (!retryError) {
                    const { data } = supabase.storage.from('images').getPublicUrl(filePath);
                    return { url: data.publicUrl, error: null };
                }
            }
        }

        return {
            url: null,
            error: `Upload failed: ${uploadError?.message} (Target Bucket: ${targetBucket})`
        };
    } catch (error: any) {
        console.error('Error uploading file:', error);
        return { url: null, error: error?.message || "Unknown exception during upload" };
    }
}

// ------------------------------------------------------------------
// ------------------------------------------------------------------
// Bookings
// ------------------------------------------------------------------

export interface SupaBooking {
    id: string; // UUID
    customer_id?: string;
    // We stash extra fields in existing JSONB columns to avoid schema changes
    booking_vehicle: any; // JSONB
    add_ons: any; // JSONB
    date: string;
    status: string;
    created_at?: string;
}

export const getSupabaseBookings = async (filterByCurrentUser = false): Promise<any[]> => {
    try {
        let query = supabase
            .from('bookings')
            .select('*, customers(full_name, email, phone), vehicles(make, model, year, type)');

        if (filterByCurrentUser) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data: customerData } = await supabase
                .from('customers')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!customerData) return [];

            query = query.eq('customer_id', customerData.id);
        }

        const { data, error } = await query;

        if (error) {
            console.error('getSupabaseBookings error:', error);
            return [];
        }

        console.log(`[getSupabaseBookings] Fetched ${data?.length} rows. Filtering by currentUser=${filterByCurrentUser}`);


        return (data || []).map((b: any) => {
            const meta = b.booking_vehicle || {};
            // If date is missing (legacy?), try to recover from scheduled_at, meta or ignore
            const dateStr = b.date || b.scheduled_at || meta.date || new Date().toISOString();

            return {
                id: b.id,
                title: b.title || b.service_package || meta.title || b.service || 'Service',
                customer: b.customer_name || (b.customers ? b.customers.full_name : null) || meta.customer_name || 'Unknown',
                customerEmail: b.customers?.email || meta.email,
                customerPhone: b.customers?.phone || meta.phone,
                customerId: b.customer_id,
                date: dateStr,
                endTime: b.end_time || meta.end_time,
                status: b.status || 'confirmed',
                notes: b.notes || meta.notes,
                vehicle: b.vehicle_type || meta.type || b.vehicles?.type || '',
                vehicleMake: b.make || meta.make || b.vehicles?.make || '',
                vehicleModel: b.model || meta.model || b.vehicles?.model || '',
                vehicleYear: b.year || meta.year || b.vehicles?.year || '',
                addons: Array.isArray(b.add_ons) ? b.add_ons : [],
                price: b.price || b.service_price || meta.price,
                assignedEmployee: b.assigned_employee || meta.assigned_employee,
                bookedBy: b.booked_by || meta.booked_by,
                createdAt: b.created_at || meta.created_at,
                vehicleId: b.vehicle_id || meta.vehicle_id,
                reminderFrequency: meta.reminder_frequency,
                hasReminder: meta.has_reminder,
                isArchived: meta.is_archived
            };
        });
    } catch (err) {
        console.error('Exception getSupabaseBookings', err);
        return [];
    }
};

export const upsertSupabaseBooking = async (booking: any) => {
    try {
        // Robust payload: stash everything potentially missing in booking_vehicle JSONB
        const meta = {
            type: booking.vehicle,
            make: booking.vehicleMake,
            model: booking.vehicleModel,
            year: booking.vehicleYear,
            title: booking.title,
            customer_name: booking.customer,
            end_time: booking.endTime,
            price: booking.price,
            assigned_employee: booking.assignedEmployee,
            booked_by: booking.bookedBy,
            reminder_frequency: booking.reminderFrequency,
            has_reminder: booking.hasReminder,
            is_archived: booking.isArchived,
            vehicle_id: booking.vehicleId || booking.vehicle_id, // Stash in meta too
            notes: booking.notes
        };

        const payload: any = {
            id: booking.id,
            customer_id: booking.customerId || null,
            vehicle_id: booking.vehicleId || booking.vehicle_id || null, // Top-level if column exists
            date: booking.date,
            status: booking.status,
            booking_vehicle: meta,
            add_ons: booking.addons,
            created_at: booking.createdAt || new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('bookings')
            .upsert(payload)
            .select()
            .single();

        if (error) {
            console.warn('Upsert booking warning (trying fallback?):', error);
            throw error;
        }
        return data;
    } catch (err) {
        console.error('upsertSupabaseBooking error:', err);
        throw err;
    }
};

export const deleteSupabaseBooking = async (id: string) => {
    try {
        const { error } = await supabase.from('bookings').delete().eq('id', id);
        if (error) throw error;
    } catch (err) {
        console.error('deleteSupabaseBooking error:', err);
        throw err;
    }
};


