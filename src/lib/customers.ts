import api from "@/lib/api";
import { getCustomers as getLocalCustomers } from "@/lib/db";
import { getSupabaseCustomers } from "@/lib/supa-data";

export interface UnifiedCustomer {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  vehicle?: string;
  model?: string;
  year?: string;
  color?: string;
  mileage?: string;
  vehicleType?: string;
  vehicles?: any[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  type?: 'customer' | 'prospect';
  is_archived?: boolean;
  generalPhotos?: string[];
  beforePhotos?: string[];
  afterPhotos?: string[];
  videoUrl?: string;
  learningCenterUrl?: string;
  videoNote?: string;
  howFound?: string;
  howFoundOther?: string;
  conditionInside?: string;
  conditionOutside?: string;
  lastService?: string;
  activity_log?: any[];
}

/**
 * Merges multiple customer sources into a single unified list.
 * Deduplicates by trying to find a match in:
 * 1. Email (case-insensitive)
 * 2. Phone (digits only)
 * 3. Exact Name match (if no email/phone)
 */
/**
 * Merges multiple customer sources into a single unified list.
 * Strategy:
 * 1. Match by ID (exact match)
 * 2. Match by Email (if not placeholder)
 * 3. Match by Phone (digits only, if not placeholder)
 * 4. Match by Name (only as last resort, and not if it's a generic name)
 */
function dedupeByKey(items: UnifiedCustomer[]): UnifiedCustomer[] {
  const mergedSource = new Map<string, UnifiedCustomer>(); // Primary ID -> Record
  const emailMap = new Map<string, string>(); // email -> ID
  const nameMap = new Map<string, string>(); // normalized name -> ID

  const isPlaceholder = (val?: string) => {
    if (!val) return true;
    const lower = val.toLowerCase().trim();
    return ['unknown', 'none', 'n/a', 'no-email'].some(p => lower.includes(p));
  };

  const normalizeName = (n: string) => n.toLowerCase().replace(/\s+/g, ' ').trim();

  for (const c of items) {
    if (!c.name || c.name.trim() === '') continue;

    const nameKey = normalizeName(c.name);
    const emailKey = c.email?.toLowerCase().trim();
    
    // Determine the "best" existing record for this person
    let targetId = c.id && mergedSource.has(c.id) ? c.id : null;
    
    if (!targetId && emailKey && !isPlaceholder(emailKey)) {
      targetId = emailMap.get(emailKey) || null;
    }
    
    if (!targetId && nameKey) {
      targetId = nameMap.get(nameKey) || null;
    }

    if (targetId) {
      const existing = mergedSource.get(targetId)!;
      
      // Update the ID to the most stable one (Supabase UUID > local)
      const finalId = (c.id && c.id.length > 20) ? c.id : (existing.id || c.id);
      
      // Merge properties
      Object.assign(existing, {
        ...c,
        id: finalId,
        // Preserve arrays if they exist in either source
        vehicles: (c.vehicles && c.vehicles.length > 0) ? c.vehicles : (existing.vehicles || []),
        activity_log: (c.activity_log && c.activity_log.length > 0) ? c.activity_log : (existing.activity_log || []),
        generalPhotos: (c.generalPhotos && c.generalPhotos.length > 0) ? c.generalPhotos : (existing.generalPhotos || []),
        beforePhotos: (c.beforePhotos && c.beforePhotos.length > 0) ? c.beforePhotos : (existing.beforePhotos || []),
        afterPhotos: (c.afterPhotos && c.afterPhotos.length > 0) ? c.afterPhotos : (existing.afterPhotos || []),
        
        // CRITICAL: If the user says they are a prospect, keep that if possible
        type: (c.type === 'prospect' || existing.type === 'prospect') ? 'prospect' : 'customer',
        phone: c.phone || existing.phone,
        email: c.email || existing.email,
        address: c.address || existing.address,
        updatedAt: (new Date(c.updatedAt || 0) > new Date(existing.updatedAt || 0)) ? c.updatedAt : existing.updatedAt
      });

      // Maintain mapping consistency
      if (finalId !== targetId) {
        mergedSource.delete(targetId);
        mergedSource.set(finalId, existing);
        // Update other maps to point to the new ID
        for (let [k, v] of emailMap) if (v === targetId) emailMap.set(k, finalId);
        for (let [k, v] of nameMap) if (v === targetId) nameMap.set(k, finalId);
      }
    } else {
      const entry = { ...c, type: c.type || 'customer' };
      const newId = c.id || `id-${Math.random().toString(36).slice(2, 9)}`;
      mergedSource.set(newId, entry);
      if (emailKey && !isPlaceholder(emailKey)) emailMap.set(emailKey, newId);
      if (nameKey) nameMap.set(nameKey, newId);
    }
  }

  return Array.from(mergedSource.values());
}

export async function getUnifiedCustomers(): Promise<UnifiedCustomer[]> {
  let apiCustomers: UnifiedCustomer[] = [];
  try {
    const list = await api('/api/customers', { method: 'GET' });
    apiCustomers = (Array.isArray(list)
      ? list
      : (Array.isArray((list as any)?.data)
        ? (list as any).data
        : (Array.isArray((list as any)?.customers)
          ? (list as any).customers
          : []))) as UnifiedCustomer[];
  } catch {
    apiCustomers = [];
  }


  const localCustomers = await getLocalCustomers<UnifiedCustomer & { id: string }>();

  // Fetch Supabase
  let supaCustomers: UnifiedCustomer[] = [];
  try {
    const rawSupa = await getSupabaseCustomers();
    supaCustomers = rawSupa.map((SC: any) => ({
      id: SC.id,
      name: SC.full_name || SC.name,
      email: SC.email,
      phone: SC.phone,
      address: SC.address,
      vehicle: SC.vehicle_info?.make || SC.vehicle || '',
      model: SC.vehicle_info?.model || SC.model || '',
      year: String(SC.vehicle_info?.year || SC.year || ''),
      vehicleType: SC.vehicle_info?.type || SC.vehicleType || '',
      color: SC.vehicle_info?.color || SC.color || '',
      mileage: SC.vehicle_info?.mileage || SC.mileage || '',
      vehicles: SC.vehicles || [],
      notes: SC.notes,
      type: SC.type,
      is_archived: SC.is_archived || false,
      generalPhotos: SC.generalPhotos || [],
      beforePhotos: SC.beforePhotos || [],
      afterPhotos: SC.afterPhotos || [],
      videoUrl: SC.videoUrl || '',
      learningCenterUrl: SC.learningCenterUrl || '',
      videoNote: SC.videoNote || '',
      howFound: SC.howFound || '',
      howFoundOther: SC.howFoundOther || '',
      conditionInside: SC.conditionInside || '',
      conditionOutside: SC.conditionOutside || '',
      lastService: SC.lastService || '',
      createdAt: SC.created_at,
      updatedAt: SC.created_at
    }));
  } catch (err) { }

  // Pull names from bookings (created via website) and merge as minimal customers
  let bookingCustomers: UnifiedCustomer[] = [];
  try {
    const raw = localStorage.getItem('bookings') || '[]';
    const bookings = JSON.parse(raw) as Array<{ customer?: string; createdAt?: string }>;
    const names = Array.from(new Set(bookings.map(b => (b.customer || '').trim()).filter(Boolean)));
    bookingCustomers = names.map(n => ({ name: n }));
  } catch {
    bookingCustomers = [];
  }

  const merged = dedupeByKey([...apiCustomers, ...localCustomers, ...supaCustomers, ...bookingCustomers]);
  // Sort by recency when available, fallback to name
  merged.sort((a, b) => {
    const at = a.updatedAt || a.createdAt;
    const bt = b.updatedAt || b.createdAt;
    if (at && bt) return new Date(bt).getTime() - new Date(at).getTime();
    return (a.name || '').localeCompare(b.name || '');
  });
  return merged;
}

