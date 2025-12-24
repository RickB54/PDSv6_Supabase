
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
const anonClient = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
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
            const safeName = (c.full_name || c.name || '').trim().toLowerCase();
            const safePhone = (c.phone || '').trim();
            const key = `${safeName}|${safePhone}`;
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
                    generalPhotos: c.general_photos || [],
                    beforePhotos: c.before_photos || [],
                    afterPhotos: c.after_photos || [],
                    videoUrl: c.video_url || '',
                    learningCenterUrl: c.learning_center_url || '',
                    videoNote: c.video_note || ''
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
    const safeEmail = customer.email?.trim() || undefined;
    const safePhone = customer.phone?.trim() || undefined;
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
        learning_center_url: customer.learningCenterUrl,
        video_note: customer.videoNote
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

export const deleteSupabaseCustomer = async (id: string) => {
    try {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) throw error;
    } catch (err) {
        console.error('deleteSupabaseCustomer error:', err);
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
            .select('*, customers(full_name)')
            .order('scheduled_at', { ascending: false });

        if (error) {
            console.error('getSupabaseBookings error:', error);
            return [];
        }

        // Map DB columns to SupaBooking interface
        return (data || []).map((b: any) => ({
            id: b.id,
            title: b.service_package || 'Booking',
            customer_name: b.customers?.full_name || 'Unknown Customer',
            date: b.scheduled_at, // Map scheduled_at -> date
            status: b.status,
            vehicle_info: b.booking_vehicle, // Assuming this might be needed, or mapped from relations if needed later
            notes: b.notes,
            price: b.service_price,
            addons: b.add_ons
        }));
    } catch (err) {
        console.error('getSupabaseBookings exception:', err);
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
        return data || [];
    } catch (err) {
        console.error('Error fetching library items:', err);
        return [];
    }
}

/**
 * Create or update a learning library item
 */
export async function upsertLibraryItem(item: LibraryItem): Promise<LibraryItem | null> {
    try {
        const { data, error } = await supabase
            .from('learning_library_items')
            .upsert({
                id: item.id,
                title: item.title,
                description: item.description,
                type: item.type,
                duration: item.duration,
                category: item.category,
                thumbnail_url: item.thumbnail_url,
                resource_url: item.resource_url,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('Error upserting library item:', err);
        return null;
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

        // 2. Try multiple common bucket names
        const buckets = ['images', 'public', 'files', 'storage', 'uploads'];
        let lastError: any = null;

        for (const bucket of buckets) {
            console.log(`Attempting upload to bucket: ${bucket}`);
            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, compressedFile);

            if (!uploadError) {
                // Success! Get URL.
                const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
                return { url: data.publicUrl, error: null };
            }

            console.warn(`Upload to '${bucket}' failed:`, uploadError.message);

            // AUTO-FIX: If bucket not found, try to create 'images' and retry
            if (bucket === 'images' && (uploadError.message.includes('not found') || uploadError.message.includes('Bucket'))) {
                console.log("Bucket 'images' missing. Attempting to create...");
                const { data: bucketData, error: createError } = await supabase.storage.createBucket('images', {
                    public: true,
                    fileSizeLimit: 5242880, // 5MB
                    allowedMimeTypes: ['image/*', 'video/*']
                });

                if (!createError) {
                    console.log("Bucket 'images' created successfully! Retrying upload...", bucketData);
                    // Retry upload to the newly created bucket
                    const { error: retryError } = await supabase.storage
                        .from('images')
                        .upload(filePath, compressedFile);

                    if (!retryError) {
                        const { data } = supabase.storage.from('images').getPublicUrl(filePath);
                        return { url: data.publicUrl, error: null };
                    }
                } else {
                    console.error("Failed to auto-create bucket:", createError);
                }
            }

            lastError = uploadError;
        }

        return {
            url: null,
            error: `All buckets failed. Last error: ${lastError?.message || 'Unknown'}`
        };

    } catch (error: any) {
        console.error('Error uploading file:', error);
        return { url: null, error: error?.message || "Unknown exception during upload" };
    }
}
