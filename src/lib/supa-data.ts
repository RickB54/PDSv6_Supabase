import { createClient } from "@supabase/supabase-js";
import { supabase } from './supabase';
import localforage from 'localforage';
import { MOCK_GALLERY } from './demoMockData';
// Re-export supabase so other files can import it from here if needed, 
// but primarily so this file can use it.
export { supabase };


// Types
export const isDemoActive = () => localStorage.getItem("demo_mode_active") === "true";

const blockDemo = (action: string) => {
  if (isDemoActive()) {
    window.dispatchEvent(new CustomEvent('demo-blocked-action', { detail: { action } }));
    return true;
  }
  return false;
};

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
    accountType?: string;
    companyName?: string;
    vehicle_info?: any;
    vehicles?: Vehicle[]; // Support for multiple vehicles
    notes?: string;
    created_at?: string;
    updated_at?: string;
    type?: string;
    is_archived?: boolean; // New field
    generalPhotos?: string[];
    beforePhotos?: string[];
    afterPhotos?: string[];
    videoUrl?: string;
    learningCenterUrl?: string;
    videoNote?: string;
    // Frontend-specific fields that might be packed into vehicle_info or notes
    vehicleType?: string;
    addonIds?: string[];
    vehicle?: string;
    model?: string;
    year?: string;
    color?: string;
    mileage?: string;
    conditionInside?: string;
    conditionOutside?: string;
    services?: string[];
    lastService?: string;
    duration?: string;
    howFound?: string;
    howFoundOther?: string;
    shortVideos?: string[];
    has_google_review?: boolean;
    engagements?: any[];
    activity_log?: any[];
    date_of_contact?: string;
    last_email_sent_at?: string;
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
    if (isDemoActive()) {
        const { MOCK_EMPLOYEES } = await import('./demoMockData');
        return MOCK_EMPLOYEES.map(e => ({
            id: e.id,
            name: e.name,
            email: e.email,
            role: e.role.charAt(0).toUpperCase() + e.role.slice(1)
        }));
    }
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
 * Helper to determine if two vehicles are duplicates.
 * Handles variations in makes, models, and missing years.
 */
export function areVehiclesDuplicates(vA: any, vB: any): boolean {
    const yrA = (vA.year && String(vA.year).trim() !== '-' && String(vA.year).trim() !== '---') ? String(vA.year).trim() : '';
    const yrB = (vB.year && String(vB.year).trim() !== '-' && String(vB.year).trim() !== '---') ? String(vB.year).trim() : '';
    
    // If both have years, and the years are different, they are NOT duplicates
    if (yrA && yrB && yrA !== yrB) {
        return false;
    }
    
    // Normalize make and model strings, treating "make" or "model" placeholders as empty
    let makeA = (vA.make || '').toLowerCase().trim();
    if (makeA === 'make') makeA = '';
    let modelA = (vA.model || '').toLowerCase().trim();
    if (modelA === 'model') modelA = '';
    
    let makeB = (vB.make || '').toLowerCase().trim();
    if (makeB === 'make') makeB = '';
    let modelB = (vB.model || '').toLowerCase().trim();
    if (modelB === 'model') modelB = '';
    
    const fullA = `${makeA} ${modelA}`.replace(/\s+/g, ' ').trim();
    const fullB = `${makeB} ${modelB}`.replace(/\s+/g, ' ').trim();
    
    if (fullA === fullB) return true;
    if (!fullA || !fullB) return false;
    
    // If one is a complete substring of the other
    if (fullA.includes(fullB) || fullB.includes(fullA)) {
        return true;
    }

    // If models are identical and at least one make is missing
    if (modelA && modelB && modelA === modelB) {
        if (!makeA || !makeB) return true;
        // If makes are different, it could be a different car (e.g. Chevy 1500 vs Ram 1500)
        // But if one make string includes the other, it's a duplicate
        if (makeA.includes(makeB) || makeB.includes(makeA)) return true;
    }

    // Remove all spaces and check substring as a fallback for weird formatting
    const strippedA = fullA.replace(/[\s-]/g, '');
    const strippedB = fullB.replace(/[\s-]/g, '');
    if (strippedA && strippedB && (strippedA.includes(strippedB) || strippedB.includes(strippedA))) {
        return true;
    }
    
    return false;
}

/**
 * Fetches customers directly from Supabase.
 * Deduplicates by name/phone if Supabase contains duplicates.
 */
export const getSupabaseCustomers = async (): Promise<Customer[]> => {
    if (isDemoActive()) {
        const { MOCK_CUSTOMERS } = await import('./demoMockData');
        return MOCK_CUSTOMERS as Customer[];
    }
    try {
        // 1. Fetch CRM customers with their vehicles
        // IMPORTANT: Photos are in customers table, NOT vehicles table
        const { data: crmData, error: crmError } = await supabase
            .from('customers')
            .select(`
                *,
                vehicles (
                    id, make, model, year, type, color, vin, mileage, condition_inside, condition_outside,
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

        // 2. Fetch Auth Users (App Users) - includes all potential clients
        const { data: authData, error: authError } = await supabase
            .from('app_users')
            .select('*');

        if (authError) {
            console.error('⚠️ getSupabaseCustomers auth fetch error:', authError);
        }

        // 3. Merge Strategies
        // Unique key: Email (if exists), otherwise Name + Phone.
        const mergedMap = new Map<string, Customer>();

        // Helper to process CRM record
        const processCrmRecord = (c: any) => {
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

            // Deduplicate vehicles by ID and Content (Year + Model)
            // Prevents duplicates like "F-150" and "Ford F-150" or "Sienna" and "Toyota Sienna"
            const allVehs: any[] = [];
            allVehsRaw.forEach((v: any) => {
                const isDuplicate = allVehs.some((existing, idx) => {
                    if (areVehiclesDuplicates(v, existing)) {
                        // Prefer the entry with more information (longer year or full details)
                        const yrV = v.year && v.year !== '-' && v.year !== '---';
                        const yrE = existing.year && existing.year !== '-' && existing.year !== '---';
                        if (!yrE && yrV) {
                            allVehs[idx] = v; // Replace with the one that has a year
                        } else if (yrE === yrV) {
                            const lenV = `${v.make} ${v.model}`.trim().length;
                            const lenE = `${existing.make} ${existing.model}`.trim().length;
                            if (lenV >= lenE) {
                                allVehs[idx] = v; // Replace with the more detailed one
                            }
                        }
                        return true;
                    }
                    return false;
                });

                if (!isDuplicate) {
                    allVehs.push(v);
                }
            });

            const v = allVehs[0] || {};
            const vi = c.vehicle_info || {};

            return {
                id: c.id,
                name: c.full_name || c.name || 'Unknown',
                email: c.email,
                phone: c.phone,
                address: c.address,
                vehicle: v.make || vi.make || c.vehicle || '',
                model: v.model || vi.model || c.model || '',
                year: v.year ? String(v.year) : (vi.year ? String(vi.year) : (c.year ? String(c.year) : '')),
                vehicleType: v.type || vi.type || vi.vehicleType || c.vehicle_type || c.vehicleType || '',
                color: v.color || vi.color || c.color || '',
                mileage: v.mileage || vi.mileage || c.mileage || '',
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
                updated_at: c.updated_at,
                accountType: c.account_type,
                companyName: c.company_name,
                type: c.type || 'customer',
                is_archived: c.is_archived || false,
                generalPhotos: c.general_photos || [],
                beforePhotos: c.before_photos || [],
                afterPhotos: c.after_photos || [],
                videoUrl: c.video_url || '',
                learningCenterUrl: c.learning_center_url || '',
                videoNote: c.video_note || '',
                howFound: c.how_found || '',
                howFoundOther: c.how_found_other || '',
                conditionInside: c.condition_inside || vi.conditionInside || '',
                conditionOutside: c.condition_outside || vi.conditionOutside || '',
                activity_log: c.activity_log || []
            } as Customer;
        };

        // Add CRM Data
        (crmData || []).forEach((c: any) => {
            const customer = processCrmRecord(c);
            customer.type = (customer.type || 'customer').toLowerCase() as any;

            const email = (customer.email || '').toLowerCase().trim();
            const phone = (customer.phone || '').replace(/\D/g, '');
            const name = (customer.name || '').toLowerCase().trim();

            let key = email;
            if (!key) {
                key = `name:${name}_phone:${phone || c.id}`;
            }

            if (mergedMap.has(key)) {
                const existing = mergedMap.get(key)!;
                mergedMap.set(key, { ...existing, ...customer });
            } else {
                mergedMap.set(key, customer);
            }
        });

        // Add Auth Data (if not duplicate)
        (authData || []).forEach((u: any) => {
            // Do NOT add employees or admins as "Registered Account" customers
            if (u.role === 'admin' || u.role === 'employee') return;

            const safeEmail = (u.email || '').toLowerCase().trim();
            if (safeEmail && !mergedMap.has(safeEmail)) {
                mergedMap.set(safeEmail, {
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
                    type: 'customer',
                    is_archived: false
                });
            }
        });

        const uniqueCustomers = Array.from(mergedMap.values());

        // 4. Merge Local Mocks (Safe Testing)
        try {
            const localCust = await localforage.getItem<any[]>('customers') || [];
            localCust.forEach(c => {
                if (!c.isStaticMock) return;
                const safeEmail = (c.email || '').toLowerCase().trim();
                if (safeEmail && mergedMap.has(safeEmail)) return;

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
 * Aggregates all data related to a single customer for reporting.
 * Applies standard mappers to ensure data consistency with the rest of the app.
 */
export const getCustomerDetailedHistory = async (customerId: string) => {
    try {
        // Fetch all in parallel
        const [customerRes, bookingsRes, invoicesRes, estimatesRes, engagementsRes] = await Promise.all([
            supabase.from('customers').select('*, vehicles(*)').eq('id', customerId).maybeSingle(),
            supabase.from('bookings').select('*, customers(full_name, email, phone, address, notes), vehicles(make, model, year, type)').eq('customer_id', customerId),
            supabase.from('invoices').select('*, customers(full_name), vehicles(make, model, year)').eq('customer_id', customerId),
            supabase.from('estimates').select('*, customers(full_name), vehicles(make, model, year)').eq('customer_id', customerId),
            supabase.from('engagements').select('*').eq('customer_id', customerId).order('created_at', { ascending: false })
        ]);

        if (customerRes.error) throw customerRes.error;
        const customerData = customerRes.data;
        if (!customerData) return null;

        // 1. Map Customer & Vehicles
        const customer = {
            ...customerData,
            name: customerData.full_name || customerData.name || 'Unknown',
            generalPhotos: customerData.general_photos || [],
            beforePhotos: customerData.before_photos || [],
            afterPhotos: customerData.after_photos || [],
            vehicles: (() => {
                const rawVehs = (customerData.vehicles || []).map((v: any) => ({
                    id: v.id,
                    make: v.make || '',
                    model: v.model || '',
                    year: v.year ? String(v.year) : '',
                    type: v.type || '',
                    color: v.color || '',
                    vin: v.vin || '',
                    generalPhotos: v.general_photos || [],
                    beforePhotos: v.before_photos || [],
                    afterPhotos: v.after_photos || [],
                    videoUrls: v.video_urls || []
                }));
                const deduped: any[] = [];
                rawVehs.forEach((v: any) => {
                    const isDup = deduped.some((ex, idx) => {
                        if (areVehiclesDuplicates(v, ex)) {
                            const yrV = v.year && v.year !== '-' && v.year !== '---';
                            const yrE = ex.year && ex.year !== '-' && ex.year !== '---';
                            if (!yrE && yrV) {
                                deduped[idx] = v;
                            } else if (yrE === yrV) {
                                const lenV = `${v.make} ${v.model}`.trim().length;
                                const lenE = `${ex.make} ${ex.model}`.trim().length;
                                if (lenV >= lenE) {
                                    deduped[idx] = v;
                                }
                            }
                            return true;
                        }
                        return false;
                    });
                    if (!isDup) {
                        deduped.push(v);
                    }
                });
                return deduped;
            })()
        };

        // 2. Map Bookings (Standardize fields for PDF)
        const bookings = (bookingsRes.data || []).map((b: any) => {
            const meta = b.booking_vehicle || {};
            return {
                ...b,
                service: b.service_package || b.title || meta.title || b.service || 'N/A',
                price: b.service_price || b.price || meta.price || 0,
                vehicleYear: b.vehicles?.year || b.year || meta.year || '',
                vehicleMake: b.vehicles?.make || b.make || meta.make || '',
                vehicleModel: b.vehicles?.model || b.model || meta.model || '',
                date: b.date || b.scheduled_at || meta.date || b.created_at
            };
        });

        // 3. Map Invoices
        const invoices = (invoicesRes.data || []).map((i: any) => {
            let vehicle = i.vehicle || (i.vehicles ? `${i.vehicles.year} ${i.vehicles.make} ${i.vehicles.model}` : "Unknown");
            // Basic virtual field unpacking if needed
            return {
                ...i,
                invoiceNumber: i.invoice_number,
                total: i.total || 0,
                paidAmount: i.paid_amount || 0,
                date: i.date || i.created_at?.split('T')[0],
                vehicle
            };
        });

        // 4. Map Estimates
        const estimates = (estimatesRes.data || []).map((e: any) => ({
            ...e,
            estimateNumber: e.estimate_number,
            total: e.total || 0,
            date: e.date || e.created_at?.split('T')[0]
        }));

        return {
            customer,
            bookings,
            invoices,
            estimates,
            engagements: engagementsRes.data || []
        };
    } catch (err) {
        console.error('getCustomerDetailedHistory error:', err);
        return null;
    }
};

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
    if (blockDemo('vehicle update')) return { id: vehicleData.id || `demo_v_${Date.now()}`, ...vehicleData };
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

        // DUPLICATE CHECK: If no ID provided, check for existing vehicle for this customer
        if (!payload.id && payload.customer_id) {
            const { data: existing } = await supabase
                .from('vehicles')
                .select('id')
                .eq('customer_id', payload.customer_id)
                .eq('make', payload.make)
                .eq('model', payload.model)
                .eq('year', payload.year || null)
                .maybeSingle();
            
            if (existing) {
                console.log('🚗 Duplicate vehicle found, using existing ID:', existing.id);
                payload.id = existing.id;
            }
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

export const deleteSupabaseVehicle = async (id: string) => {
    if (blockDemo('vehicle delete')) return;
    try {
        const { error } = await supabase.from('vehicles').delete().eq('id', id);
        if (error) {
            // Check for foreign key violation (linked bookings)
            if (error.code === '23503') {
                throw new Error("Cannot delete this vehicle because it is linked to a booking. Please edit the booking first to use a different vehicle record.");
            }
            throw error;
        }
        console.log('✅ Vehicle deleted successfully:', id);
    } catch (err) {
        console.error('deleteSupabaseVehicle error:', err);
        throw err;
    }
};

/**
 * Upserts a customer to Supabase.
 * Automatically handles multiple vehicle creation/update.
 */
export const upsertSupabaseCustomer = async (customer: Partial<Customer> & { type?: string }) => {
    if (blockDemo('customer update')) return { ...customer, id: customer.id || `demo_c_${Date.now()}` };
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
        is_archived: customer.is_archived || false,
        general_photos: customer.generalPhotos,
        before_photos: customer.beforePhotos,
        after_photos: customer.afterPhotos,
        video_url: customer.videoUrl,
        learning_center_url: customer.learningCenterUrl,
        updated_at: new Date().toISOString()
    };

    // ONLY ADD THESE IF THEY WERE PASSED - AND WE'LL CATCH DB ERROR IF MISSING
    if (customer.howFound) payload.how_found = customer.howFound;
    if (customer.howFoundOther) payload.how_found_other = customer.howFoundOther;
    if (customer.conditionInside) payload.condition_inside = customer.conditionInside;
    if (customer.conditionOutside) payload.condition_outside = customer.conditionOutside;
    if (customer.accountType) payload.account_type = customer.accountType;
    if (customer.companyName) payload.company_name = customer.companyName;

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

    if (finalId) {
        upsertData.id = finalId;
        // Optimization: Try to get current type to avoid overwriting it if not provided
        if (!customer.type) {
            const { data: current } = await supabase.from('customers').select('type').eq('id', finalId).maybeSingle();
            if (current?.type) upsertData.type = current.type;
        }
    } else {
        // Only default to 'customer' for BRAND NEW records
        if (!upsertData.type) upsertData.type = 'customer';
    }

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
            // Deduplicate incoming array to prevent processing identical vehicles multiple times
            const uniqueIncoming: any[] = [];
            customer.vehicles.forEach((v: any) => {
                const isDup = uniqueIncoming.some((ex, idx) => {
                    if (areVehiclesDuplicates(v, ex)) {
                        const yrV = v.year && v.year !== '-' && v.year !== '---';
                        const yrE = ex.year && ex.year !== '-' && ex.year !== '---';
                        if (!yrE && yrV) {
                            uniqueIncoming[idx] = v;
                        } else if (yrE === yrV) {
                            const lenV = `${v.make} ${v.model}`.trim().length;
                            const lenE = `${ex.make} ${ex.model}`.trim().length;
                            if (lenV >= lenE) {
                                uniqueIncoming[idx] = v;
                            }
                        }
                        return true;
                    }
                    return false;
                });
                if (!isDup) {
                    uniqueIncoming.push(v);
                }
            });

            for (const v of uniqueIncoming) {
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
                    type: v.type || v.vehicleType || '',
                    color: v.color,
                    customer_id: finalId
                });
                finalVehicles.push(savedVeh);
            }
        }
        // C. Last Resort: Handle direct fields on the customer object
        else if (customer.vehicle || customer.model || customer.year) {
            const savedVeh = await upsertSupabaseVehicle({
                make: customer.vehicle || '',
                model: customer.model || '',
                year: customer.year || '',
                type: customer.vehicleType || customer.type || '',
                color: customer.color || '',
                customer_id: finalId
            });
            finalVehicles.push(savedVeh);
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
    if (blockDemo('customer deletion')) return { success: true, crmCount: 1, authCount: 1 };
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

        // 2. DETACH BOOKINGS & ESTIMATES before deletion to prevent cascade errors
        // Fetch vehicle IDs from the customer record retrieved in Step 1
        const vehicleIds = (customer?.vehicles || []).map((v: any) => v.id).filter(Boolean);

        const isRickBerube = customer?.full_name?.toLowerCase().trim() === 'rick berube';

        // 2. PRE-CALCULATE COUNTS to guarantee accurate reporting
        const [{ count: iCount }, { count: eCount }, { count: bCount }, { count: engCount }, { count: miCount }, { count: teCount }] = await Promise.all([
            supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('customer_id', id),
            supabase.from('estimates').select('*', { count: 'exact', head: true }).eq('customer_id', id),
            supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('customer_id', id),
            supabase.from('engagements').select('*', { count: 'exact', head: true }).eq('customer_id', id),
            supabase.from('manual_income').select('*', { count: 'exact', head: true }).ilike('customer_name', '%Rick Berube%'),
            supabase.from('tax_expenses').select('*', { count: 'exact', head: true }).ilike('payee', '%Rick Berube%')
        ]);

        let vCount = 0;
        if (vehicleIds.length > 0) {
            const { count } = await supabase.from('vehicles').select('*', { count: 'exact', head: true }).in('id', vehicleIds);
            vCount = count || 0;
        }

        let pCount = 0;
        const { data: bDataForCount } = await supabase.from('bookings').select('id').eq('customer_id', id);
        if (bDataForCount && bDataForCount.length > 0) {
            const bIds = bDataForCount.map(b => b.id);
            const { count } = await supabase.from('payments').select('*', { count: 'exact', head: true }).in('booking_id', bIds);
            pCount = count || 0;
        }

        const affectedData = {
            bookings: bCount || 0,
            estimates: eCount || 0,
            invoices: iCount || 0,
            vehicles: vCount || 0,
            engagements: engCount || 0,
            manual_income: miCount || 0,
            expenses: teCount || 0,
            payments: pCount || 0,
            type: isRickBerube ? 'deleted automatically' : 'detached (requires manual deletion)'
        };

        if (isRickBerube) {
            console.log(`[DeleteCustomer] Special wipe triggered for Rick Berube. Cascading deletions...`);
            // Delete engagements
            await supabase.from('engagements').delete().eq('customer_id', id);
            
            // Delete manual income with name match
            await supabase.from('manual_income').delete().ilike('customer_name', '%Rick Berube%');
            
            // Delete expenses with payee match
            await supabase.from('tax_expenses').delete().ilike('payee', '%Rick Berube%');

            await supabase.from('invoices').delete().or(`customer_id.eq.${id},customer_name.ilike.%Rick Berube%`);
            await supabase.from('estimates').delete().or(`customer_id.eq.${id},customer_name.ilike.%Rick Berube%`);
            
            // Get booking IDs to delete payments
            const { data: bData } = await supabase.from('bookings').select('id').eq('customer_id', id);
            if (bData && bData.length > 0) {
                const bIds = bData.map(b => b.id);
                await supabase.from('payments').delete().in('booking_id', bIds);
            }
            
            await supabase.from('bookings').delete().or(`customer_id.eq.${id},customer_name.ilike.%Rick Berube%`);
            if (vehicleIds.length > 0) {
                await supabase.from('vehicles').delete().in('id', vehicleIds);
            }
        } else {
            console.log(`[DeleteCustomer] Detaching linked records for ${id} and ${vehicleIds.length} vehicle(s).`);

            // Nullify vehicle links in Bookings (fixes the FK violation)
            if (vehicleIds.length > 0) {
                await supabase.from('bookings').update({ vehicle_id: null }).in('vehicle_id', vehicleIds);
            }
            // Nullify customer link in Bookings
            const { error: custBookError } = await supabase.from('bookings').update({ customer_id: null }).eq('customer_id', id);
            if (custBookError) console.warn('[DeleteCustomer] Bookings customer detach warning:', custBookError);

            // Nullify vehicle and customer links in Estimates
            if (vehicleIds.length > 0) {
                await supabase.from('estimates').update({ vehicle_id: null }).in('vehicle_id', vehicleIds);
            }
            const { error: custEstError } = await supabase.from('estimates').update({ customer_id: null }).eq('customer_id', id);
            if (custEstError) console.warn('[DeleteCustomer] Estimates customer detach warning:', custEstError);
        }

        // 3. DATABASE DELETION (CRM)
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
            authCount: authCount || 0,
            affectedData
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
    if (blockDemo('team message')) return { id: `demo_m_${Date.now()}`, content, sender_email: senderEmail, sender_name: senderName, created_at: new Date().toISOString() };
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
    estimateDate?: string;
    status: string; // open, accepted, declined
    created_at?: string;
    notes?: string;
    packageId?: string; // optional metadata
    addonIds?: string[]; // optional metadata
    discount?: number;
    discountType?: "percent" | "amount";
    vehicleType?: string;
    isSent?: boolean;
    sentDate?: string;
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
            services: (e.services || []).filter((s: any) => {
                if (s.name?.startsWith("VIRTUAL_SENT:")) {
                    (e as any).isSent = s.name.replace("VIRTUAL_SENT:", "").trim() === "true";
                    return false;
                }
                if (s.name?.startsWith("VIRTUAL_SENT_DATE:")) {
                    (e as any).sentDate = s.name.replace("VIRTUAL_SENT_DATE:", "").trim();
                    return false;
                }
                return true;
            }),
            isSent: (e as any).isSent ?? false,
            sentDate: (e as any).sentDate,
            total: e.total,
            date: e.date || e.created_at?.split('T')[0],
            status: e.status,
            createdAt: e.created_at,
            created_at: e.created_at,
            notes: e.notes,
            vehicleType: e.vehicle_type,
            packageId: e.package_id,
            addonIds: e.addon_ids || [],
            discount: e.discount,
            discountType: e.discount_type as ('percent' | 'amount' | undefined),
            estimateDate: e.estimate_date
        }));

        // Merge Local Estimates (Offline or Legacy)
        try {
            const localEst = await localforage.getItem<any[]>('estimates') || [];
            localEst.forEach(le => {
                // If it's a static mock from demo or if it's already in results, skip
                if (le.isStaticMock) return;
                const exists = results.some(re => re.id === le.id || (re.estimateNumber && re.estimateNumber === le.estimateNumber));
                if (!exists) {
                    results.push({
                        ...le,
                        id: le.id || `local_est_${Date.now()}_${Math.random()}`,
                        customerName: le.customerName || "Local Prospect",
                        date: le.date || le.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
                    });
                }
            });
        } catch (e) {
            console.warn("Local estimates merge failed", e);
        }

        return results.sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
    } catch (err) {
        console.error('getSupabaseEstimates exception:', err);
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
    if (isDemoActive()) return { ...p, id: p.id || `demo_est_${Date.now()}` };
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
        services: [
            ...(p.services || []),
            ...(p.isSent !== undefined ? [{ name: `VIRTUAL_SENT:${p.isSent}`, price: 0 }] : []),
            ...(p.sentDate ? [{ name: `VIRTUAL_SENT_DATE:${p.sentDate}`, price: 0 }] : [])
        ], 
        total: p.total,
        date: p.date,
        status: p.status || 'open',
        notes: p.notes,
        vehicle_type: p.vehicleType,
        package_id: p.packageId,
        discount: p.discount || 0,
        estimate_number: p.estimateNumber,
        estimate_date: p.estimateDate,
        discount_type: p.discountType
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
    if (isDemoActive()) return;
    try {
        const { error } = await supabase.from('estimates').delete().eq('id', id);
        if (error) throw error;
    } catch (err) {
        console.error('deleteSupabaseEstimate error:', err);
        throw err;
    }
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
    if (isDemoActive()) {
        // Return some localized mock shifts for the schedule UI
        return [
            { 
                id: 'mock-shift-1', 
                employee_id: 'demo-emp-2', 
                employee_name: 'Sam Staff', 
                date: new Date().toISOString().split('T')[0], 
                start_time: '10:00', 
                end_time: '17:00', 
                role: 'Detailer',
                status: 'scheduled',
                color: 'blue'
            },
            { 
                id: 'mock-shift-2', 
                employee_id: 'demo-emp-1', 
                employee_name: 'Alex Admin', 
                date: new Date().toISOString().split('T')[0], 
                start_time: '08:00', 
                end_time: '14:00', 
                role: 'Manager',
                status: 'scheduled',
                color: 'purple'
            }
        ];
    }
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

        const supaInvoices = (data || []).map(i => {
            // Unpack virtualized fields from services if they exist
            let notes = i.notes || "";
            let vehicle = i.vehicle || (i.vehicles ? `${i.vehicles.year} ${i.vehicles.make} ${i.vehicles.model}` : "");
            if (!vehicle || vehicle.trim() === "Unknown Unknown") vehicle = "Unknown";
            let discount = i.discount || null;
            let adjustment = i.adjustment || null;
            let tipAmount = i.tipAmount || null;
            let isSent = false;
            let sentDate = "";
            let serviceDate = "";
            let priceLocked = false;
            
            const filteredServices = (i.services || []).filter((s: any) => {
              if (!s || !s.name) return true;
              if (s.name.startsWith("VIRTUAL_VEHICLE:")) {
                vehicle = s.name.replace("VIRTUAL_VEHICLE:", "").trim();
                return false;
              }
              if (s.name.startsWith("VIRTUAL_NOTES:")) {
                notes = s.name.replace("VIRTUAL_NOTES:", "").trim();
                return false;
              }
              if (s.name.startsWith("VIRTUAL_DISCOUNT:")) {
                try {
                  discount = JSON.parse(s.name.replace("VIRTUAL_DISCOUNT:", "").trim());
                } catch (e) { console.error("Failed to parse virtual discount", e); }
                return false;
              }
              if (s.name.startsWith("VIRTUAL_ADJUSTMENT:")) {
                adjustment = parseFloat(s.name.replace("VIRTUAL_ADJUSTMENT:", "").trim());
                return false;
              }
              if (s.name.startsWith("VIRTUAL_TIP:")) {
                tipAmount = parseFloat(s.name.replace("VIRTUAL_TIP:", "").trim());
                return false;
              }
              if (s.name.startsWith("VIRTUAL_PRICE_LOCKED:")) {
                priceLocked = s.name.replace("VIRTUAL_PRICE_LOCKED:", "").trim() === "true";
                return false;
              }
              if (s.name.startsWith("VIRTUAL_SENT:")) {
                isSent = s.name.replace("VIRTUAL_SENT:", "").trim() === "true";
                return false;
              }
              if (s.name.startsWith("VIRTUAL_SENT_DATE:")) {
                sentDate = s.name.replace("VIRTUAL_SENT_DATE:", "").trim();
                return false;
              }
              if (s.name.startsWith("VIRTUAL_SERVICE_DATE:")) {
                serviceDate = s.name.replace("VIRTUAL_SERVICE_DATE:", "").trim();
                return false;
              }
              return true;
            });

            return {
              id: i.id,
              invoiceNumber: i.invoice_number,
              customerId: i.customer_id,
              customerName: i.customers?.full_name || i.customerName || "Unknown",
              vehicle: vehicle || "Unknown Vehicle",
              date: i.date || i.created_at?.split('T')[0],
              serviceDate: serviceDate || i.date || i.created_at?.split('T')[0],
              total: i.total || 0,
              services: filteredServices,
              paymentStatus: i.status || "unpaid",
              paidAmount: i.paid_amount || 0,
              paidDate: i.paid_date,
              notes: notes || "",
              discount: discount,
              adjustment: adjustment,
              tipAmount: tipAmount,
              priceLocked: priceLocked,
              isSent: isSent,
              sentDate: sentDate,
              createdAt: i.created_at
            };
        });

        // Merge Local Invoices (Offline or Legacy)
        try {
            const localInvs = await localforage.getItem<any[]>('invoices') || [];
            localInvs.forEach(li => {
                // If it doesn't have a Supabase-like UUID or isn't already in supaInvoices
                if (!supaInvoices.some(si => si.id === li.id || (si.invoiceNumber && si.invoiceNumber === li.invoiceNumber))) {
                    supaInvoices.push({
                        ...li,
                        id: li.id || `local_${Date.now()}_${Math.random()}`,
                        customerName: li.customerName || "Local Customer",
                        paymentStatus: li.paymentStatus || li.status || "unpaid",
                        date: li.date || li.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0]
                    });
                }
            });
        } catch (e) {
            console.warn("Local invoices merge failed", e);
        }

        return supaInvoices;
    } catch (err) {
        console.error('getSupabaseInvoices exception:', err);
        return [];
    }
};

export const upsertSupabaseInvoice = async (invoice: any) => {
    if (isDemoActive()) return { ...invoice, id: invoice.id || `demo_inv_${Date.now()}` };
    
    const virtualServices = [...(invoice.services || [])];
    if (invoice.vehicle) virtualServices.push({ name: `VIRTUAL_VEHICLE:${invoice.vehicle}`, price: 0 });
    if (invoice.notes) virtualServices.push({ name: `VIRTUAL_NOTES:${invoice.notes}`, price: 0 });
    if (invoice.discount) virtualServices.push({ name: `VIRTUAL_DISCOUNT:${JSON.stringify(invoice.discount)}`, price: 0 });
    if (invoice.adjustment) virtualServices.push({ name: `VIRTUAL_ADJUSTMENT:${invoice.adjustment}`, price: 0 });
    if (invoice.tipAmount) virtualServices.push({ name: `VIRTUAL_TIP:${invoice.tipAmount}`, price: 0 });
    if (invoice.priceLocked !== undefined) virtualServices.push({ name: `VIRTUAL_PRICE_LOCKED:${invoice.priceLocked}`, price: 0 });
    if (invoice.isSent !== undefined) virtualServices.push({ name: `VIRTUAL_SENT:${invoice.isSent}`, price: 0 });
    if (invoice.sentDate) virtualServices.push({ name: `VIRTUAL_SENT_DATE:${invoice.sentDate}`, price: 0 });
    if (invoice.serviceDate) virtualServices.push({ name: `VIRTUAL_SERVICE_DATE:${invoice.serviceDate}`, price: 0 });

    const payload = {
        total: invoice.total,
        date: invoice.date,
        status: invoice.paymentStatus,
        paid_amount: invoice.paidAmount,
        paid_date: invoice.paidDate,
        services: virtualServices,
        customer_id: invoice.customerId,
        invoice_number: invoice.invoiceNumber
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
    if (isDemoActive()) return;
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
    sort_order?: number;
    is_pinned?: boolean;
}

/**
 * Get all learning library items from Supabase
 */
export async function getLibraryItems(category?: string): Promise<LibraryItem[]> {
    const isDemoMode = localStorage.getItem("demo_mode_active") === "true";
    if (isDemoMode) {
        let items = [...MOCK_GALLERY];
        if (category) items = items.filter(i => i.category === category);
        return items as LibraryItem[];
    }
    try {
        let query = supabase
            .from('learning_library_items')
            .select('*');
        
        if (category) {
            query = query.eq('category', category);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        // Map columns directly (Schema Update Fix)
        const parsedData = (data || []).map((item: any) => ({
            id: item.id,
            title: item.title,
            description: item.content || item.description || '', // Fix: Align with schema 'content'
            type: item.type,
            duration: item.duration,
            category: item.category,
            thumbnail_url: item.thumbnail_url,
            resource_url: item.resource_url,
            created_at: item.created_at,
            updated_at: item.updated_at,
            is_published: item.is_published ?? false,
            is_verified: item.is_verified ?? false,
            // New Schema Columns
            created_by: item.created_by,
            sort_order: item.sort_order,
            is_pinned: item.is_pinned ?? false
        }));

        // PRIORITY SORTING:
        // 1. IS_PINNED (Pinned posts always first)
        // 2. NO SORT_ORDER (New/Manual-less posts next, by date)
        // 3. SORT_ORDER (Manually reordered posts last)
        const sortedData = parsedData.sort((a, b) => {
            // Priority 1: Pinned status
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;

            // Priority 2: Handling sort_order (New posts first)
            // If both don't have sort_order, sort by date
            if (a.sort_order == null && b.sort_order == null) {
                return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
            }

            // If one has sort_order and the other doesn't, the one WITHOUT sort_order goes first (user request)
            if (a.sort_order == null) return 1;
            if (b.sort_order == null) return -1;

            // Priority 3: Both have sort_order, use it
            return (a.sort_order || 0) - (b.sort_order || 0);
        });

        return sortedData as LibraryItem[];
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
    if (isDemoActive()) return { id: `demo_cmt_${Date.now()}`, created_at: new Date().toISOString(), ...comment } as any;
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

export async function deleteComment(commentId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('learning_library_comments')
            .delete()
            .eq('id', commentId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Error deleting comment:", error);
        return false;
    }
}

export async function updateComment(commentId: string, text: string): Promise<boolean> {
    try {
        console.log('Updating comment:', { commentId, text });
        const { data, error } = await supabase.from('learning_library_comments').update({ text }).eq('id', commentId).select();
        if (error) { console.error('Supabase error updating comment:', error); throw error; }
        console.log('Comment updated successfully:', data);
        return true;
    } catch (error) {
        console.error('Error updating comment:', error);
        return false;
    }
}

export async function deleteAllCommentsForPost(postId: string): Promise<{ success: boolean; count: number }> {
    try {
        const { data, error } = await supabase
            .from('learning_library_comments')
            .delete()
            .eq('post_id', postId)
            .select();

        if (error) throw error;
        return { success: true, count: data ? data.length : 0 };
    } catch (error) {
        console.error("Error deleting comments for post:", error);
        return { success: false, count: 0 };
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
    const isDemoMode = localStorage.getItem("demo_mode_active") === "true";
    if (isDemoMode) {
        return { success: true, data: item };
    }
    try {
        const payload: any = {
            id: item.id || crypto.randomUUID(),
            title: item.title,
            content: item.description, // Fix: Align with schema 'content'
            description: item.description, // Fallback for legacy
            type: item.type, // Schema supports 'image' now
            duration: item.duration,
            category: item.category,
            thumbnail_url: item.thumbnail_url,
            resource_url: item.resource_url,
            is_published: item.is_published ?? false,
            is_verified: item.is_verified ?? false,
            // New Schema Columns
            created_by: item.created_by,
            sort_order: item.sort_order,
            is_pinned: item.is_pinned,
            updated_at: new Date().toISOString()
        };

        // Allow overriding created_at for manual publish dates
        if (item.created_at) {
            payload.created_at = item.created_at;
        }

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
    if (isDemoActive()) return true;
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
            .select('*, customers(full_name, email, phone, address, notes), vehicles(make, model, year, type, color)');

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

        const ALERT_DUMMY_ID = '00000000-0000-0000-0000-000000000000';
        const rawData = (data || []).filter(b => b.id !== ALERT_DUMMY_ID);

        console.log(`[getSupabaseBookings] Fetched ${data?.length} rows. Filtering by currentUser=${filterByCurrentUser}`);

        return rawData.map((b: any) => {
            // Priority: Columns -> Legacy meta (if migration incomplete)
            let meta = b.booking_vehicle || {};
            if (typeof meta === 'string') {
                try { meta = JSON.parse(meta); } catch(e) { meta = {}; }
            }
            const dateStr = b.date || b.scheduled_at || meta.date || new Date().toISOString();

            return {
                id: b.id,
                // Map columns first, fallback to meta
                title: b.service_package || b.title || meta.title || b.service || 'Service',
                customer: b.customers?.full_name || b.customer_name || meta.customer_name || meta.customer || 'Unknown',
                customerEmail: b.customers?.email || meta.email || meta.customer_email || meta.customerEmail || b.email || '',
                customerPhone: b.customers?.phone || meta.phone || meta.customer_phone || meta.customerPhone || b.phone || '',
                email: b.customers?.email || meta.email || meta.customer_email || meta.customerEmail || b.email || '',
                phone: b.customers?.phone || meta.phone || meta.customer_phone || meta.customerPhone || b.phone || '',
                customerId: b.customer_id,

                // CRITICAL: Hybrid Availability expects 'scheduled_at'
                date: dateStr,
                scheduled_at: dateStr,

                endTime: b.end_time || meta.end_time,
                status: b.status || 'confirmed',

                // Employee Info
                assignedEmployee: b.assigned_employee_id || 'Unassigned',
                employee: b.assigned_employee_id || 'Unassigned',
                employeeName: b.assigned_employee_id || 'Unassigned',

                // Service & Time consistency for Reports
                service: b.service_package || b.title || meta.title || b.service || 'N/A',
                totalTime: b.estimated_time || meta.estimated_time || 'N/A',

                // Vehicle Relations
                vehicleId: b.vehicle_id || meta.vehicle_id,
                vehicle: b.vehicles?.type || b.vehicle_type || meta.type || (b.booking_vehicle?.type) || '',
                vehicleMake: b.vehicles?.make || b.make || meta.make || (b.booking_vehicle?.make) || '',
                vehicleModel: b.vehicles?.model || b.model || meta.model || (b.booking_vehicle?.model) || '',
                vehicleYear: b.vehicles?.year || b.year || meta.year || (b.booking_vehicle?.year) || '',
                vehicleColor: b.vehicles?.color || b.color || meta.color || (b.booking_vehicle?.color) || '',

                // Addons mapping with robust parsing
                addons: (() => {
                  try {
                    const raw = b.add_ons || meta.add_ons || meta.addons || [];
                    if (Array.isArray(raw)) return raw;
                    if (typeof raw === 'string') return JSON.parse(raw);
                    return [];
                  } catch (e) {
                    return [];
                  }
                })(),
                price: b.service_price || b.price || meta.price,
                createdAt: b.created_at || meta.created_at,

                hasReminder: b.has_reminder || meta.has_reminder,
                reminderFrequency: b.reminder_frequency || meta.reminder_frequency,
                address: b.address || b.customers?.address || meta.address || '',
                notes: b.notes || b.customers?.notes || meta.notes || '',
                customReminderDate: b.custom_reminder_date || meta.custom_reminder_date,
                isArchived: b.is_archived || meta.is_archived || false,
                source: b.source_origin || meta.source_origin || b.source || 'Manual Entry',
                discountCode: b.discount_code || meta.discountCode || meta.discount_code || '',
                discountAmount: Number(b.discount_amount || meta.discountAmount || meta.discount_amount || 0),
                placeOfService: meta.placeOfService || meta.place_of_service || b.place_of_service || '',
                booking_vehicle: meta
            };
        });
    } catch (err) {
        console.error('Exception getSupabaseBookings', err);
        return [];
    }
};
 
export const upsertSupabaseBooking = async (booking: any) => {
    if (isDemoActive()) return { ...booking, id: booking.id || `demo_b_${Date.now()}` };
    try {
        // EXPLICITLY DEFINE ONLY THE KEYS THAT EXIST IN THE DB
        const payload: any = {
            customer_id: (booking.customerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(booking.customerId)) ? booking.customerId : (booking.customer_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(booking.customer_id)) ? booking.customer_id : null,
            vehicle_id: (booking.vehicleId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(booking.vehicleId)) ? booking.vehicleId : (booking.vehicle_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(booking.vehicle_id)) ? booking.vehicle_id : null,
            scheduled_at: booking.date || booking.scheduled_at,
            date: booking.date || booking.scheduled_at,
            service_package: booking.title || booking.service_package,
            status: booking.status || 'confirmed',
            notes: booking.notes,
            service_price: Number(booking.price || booking.service_price || 0),
            add_ons: Array.isArray(booking.addons) ? booking.addons : [],
            booking_vehicle: {
              ...(booking.vehicle_info || booking.booking_vehicle || {}),
              customer_name: booking.customer || booking.customer_name,
              make: booking.vehicleMake || booking.make,
              model: booking.vehicleModel || booking.model,
              year: booking.vehicleYear || booking.year,
              type: booking.vehicle || booking.type,
              color: booking.vehicleColor || booking.color || (booking.booking_vehicle?.color) || '',
              reminder_frequency: booking.reminderFrequency,
              custom_reminder_date: booking.customReminderDate,
              discountCode: booking.discountCode || '',
              discountAmount: Number(booking.discountAmount || 0),
              placeOfService: booking.placeOfService || ''
            },
            end_time: booking.endTime || booking.end_time || null,
            is_archived: booking.isArchived || false,
            source_origin: booking.source || booking.source_origin || 'Manual Entry',
            created_at: booking.createdAt || new Date().toISOString()
        };

        // Handle assigned_employee_id with UUID validation to prevent DB crashes
        const empId = booking.assignedEmployeeId || booking.assigned_employee_id || booking.assignedEmployee;
        if (empId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(empId)) {
            payload.assigned_employee_id = empId;
        } else if (empId && empId !== 'Unassigned') {
            // If it's a name instead of an ID, we append it to notes to preserve the data without crashing the UUID column
            payload.notes = (payload.notes ? payload.notes + "\n" : "") + "Assigned to: " + empId;
        }

        if (booking.id) {
            payload.id = booking.id;
        }

        let { data, error } = await supabase
            .from('bookings')
            .upsert(payload)
            .select()
            .single();

        // CRITICAL FALLBACK: If employee ID is invalid (FK violation), retry without it to save the booking
        if (error && error.code === '23503' && error.message.includes('assigned_employee_id')) {
            console.warn('[upsertSupabaseBooking] FK violation for employee. Retrying without ID...');
            const retryPayload = { ...payload };
            delete retryPayload.assigned_employee_id;
            // Append the invalid ID/Name to notes so we don't lose the user's intent
            retryPayload.notes = (retryPayload.notes ? retryPayload.notes + "\n" : "") + "Staff Link Failed (Invalid ID): " + payload.assigned_employee_id;
            
            const retryResult = await supabase
                .from('bookings')
                .upsert(retryPayload)
                .select()
                .single();
            
            data = retryResult.data;
            error = retryResult.error;
        }

        if (error) {
            console.error('Upsert booking error:', error);
            throw error;
        }

        // Vehicle syncing is now handled explicitly via the CRM/Modal to ensure a single source of truth and avoid duplicates.

        return data;
    } catch (err) {
        console.error('upsertSupabaseBooking error:', err);
        throw err;
    }
};

export const deleteSupabaseBooking = async (id: string) => {
    if (isDemoActive()) return;
    try {
        const { error } = await supabase.from('bookings').delete().eq('id', id);
        if (error) throw error;
    } catch (err) {
        console.error('deleteSupabaseBooking error:', err);
        throw err;
    }
};

// ------------------------------------------------------------------
// Mileage Tracking
// ------------------------------------------------------------------

export interface MileageLog {
    id?: string;
    date: string;
    miles_driven: number;
    purpose: string;
    start_location?: string;
    end_location?: string;
    odometer_start?: number;
    odometer_end?: number;
    customer_id?: string;
    job_id?: string;
    is_business: boolean;
    created_at?: string;
}

export const getSupabaseMileageLogs = async (): Promise<MileageLog[]> => {
    try {
        const { data, error } = await supabase
            .from('mileage_log')
            .select('*, customers(full_name)')
            .order('date', { ascending: false });

        if (error) {
            console.error('getSupabaseMileageLogs error:', error);
            return [];
        }

        return (data || []).map(m => ({
            ...m,
            customerName: m.customers?.full_name
        }));
    } catch (err) {
        console.error('getSupabaseMileageLogs exception:', err);
        return [];
    }
};

export const upsertSupabaseMileageLog = async (log: Partial<MileageLog>) => {
    if (isDemoActive()) return { ...log, id: log.id || `demo_ml_${Date.now()}` };
    try {
        const { data, error } = await supabase
            .from('mileage_log')
            .upsert(log)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('upsertSupabaseMileageLog error:', err);
        throw err;
    }
};

export const deleteSupabaseMileageLog = async (id: string) => {
    if (isDemoActive()) return;
    try {
        const { error } = await supabase
            .from('mileage_log')
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (err) {
        console.error('deleteSupabaseMileageLog error:', err);
        throw err;
    }
};

// ------------------------------------------------------------------
// Tax tracking
// ------------------------------------------------------------------

export interface TaxExpense {
    id?: string;
    date: string;
    amount: number;
    vendor?: string;
    payment_method?: string;
    category: string;
    tags?: string[];
    is_deductible: boolean;
    notes?: string;
    receipt_url?: string;
    asset_id?: string;
    is_recurring: boolean;
    recurring_interval?: string;
    created_at?: string;
    updated_at?: string;
}

export interface TaxReportArchive {
    id?: string;
    year: number;
    report_name: string;
    report_data: any;
    created_at?: string;
    created_by?: string;
    notes?: string;
}

export const getSupabaseTaxExpenses = async (year?: number): Promise<TaxExpense[]> => {
    try {
        let query = supabase.from('tax_expenses').select('*');

        if (year) {
            query = query.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`);
        }

        const { data, error } = await query.order('date', { ascending: false });

        if (error) {
            console.error('getSupabaseTaxExpenses error:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('getSupabaseTaxExpenses exception:', err);
        return [];
    }
};

export const upsertSupabaseTaxExpense = async (expense: Partial<TaxExpense>) => {
    if (isDemoActive()) return { ...expense, id: expense.id || `demo_tx_${Date.now()}` };
    try {
        const { data, error } = await supabase
            .from('tax_expenses')
            .upsert(expense)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('upsertSupabaseTaxExpense error:', err);
        throw err;
    }
};

export const deleteSupabaseTaxExpense = async (id: string) => {
    if (isDemoActive()) return;
    try {
        const { error } = await supabase
            .from('tax_expenses')
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (err) {
        console.error('deleteSupabaseTaxExpense error:', err);
        throw err;
    }
};

export const getSupabaseTaxReports = async (year?: number): Promise<TaxReportArchive[]> => {
    try {
        let query = supabase.from('tax_reports').select('*');
        if (year) query = query.eq('year', year);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err: any) {
        if (err?.code !== '42P01') {
            console.error('getSupabaseTaxReports error:', err);
        }
        return [];
    }
};

export const saveSupabaseTaxReport = async (report: Partial<TaxReportArchive>) => {
    if (isDemoActive()) return { ...report, id: `demo_rep_${Date.now()}` };
    try {
        const { data, error } = await supabase.from('tax_reports').insert(report).select().single();
        if (error) throw error;
        return data;
    } catch (err: any) {
        if (err?.code !== '42P01') {
            console.error('saveSupabaseTaxReport error:', err);
        }
        throw err;
    }
};

export const deleteSupabaseTaxReport = async (id: string) => {
    if (isDemoActive()) return;
    try {
        const { error } = await supabase.from('tax_reports').delete().eq('id', id);
        if (error) throw error;
    } catch (err) {
        console.error('deleteSupabaseTaxReport error:', err);
        throw err;
    }
};

// ------------------------------------------------------------------
// Income (Receivables) Sync
// ------------------------------------------------------------------

export const getSupabaseIncome = async (): Promise<any[]> => {
    try {
        const { data, error } = await supabase
            .from('manual_income')
            .select('*')
            .order('date', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('getSupabaseIncome error:', err);
        return [];
    }
};

export const upsertSupabaseIncome = async (income: any) => {
    if (isDemoActive()) return { ...income, id: income.id || `demo_inc_${Date.now()}` };
    try {
        const { data, error } = await supabase
            .from('manual_income')
            .upsert(income)
            .select()
            .single();
        if (error) throw error;
        return data;
    } catch (err) {
        console.error('upsertSupabaseIncome error:', err);
        throw err;
    }
};

export const deleteSupabaseIncome = async (id: string) => {
    if (isDemoActive()) return;
    try {
        const { error } = await supabase
            .from('manual_income')
            .delete()
            .eq('id', id);
        if (error) throw error;
    } catch (err) {
        console.error('deleteSupabaseIncome error:', err);
        throw err;
    }
};




