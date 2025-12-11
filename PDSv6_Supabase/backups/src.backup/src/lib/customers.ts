import api from "@/lib/api";
import { getCustomers as getLocalCustomers } from "@/lib/db";

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
  createdAt?: string;
  updatedAt?: string;
}

function dedupeByKey(items: UnifiedCustomer[]): UnifiedCustomer[] {
  const seen = new Map<string, UnifiedCustomer>();
  for (const c of items) {
    const key = (c.email?.toLowerCase() || c.phone || c.name).trim();
    if (!key) continue;
    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, c);
    } else {
      // Prefer item with id and most recent updatedAt
      const prevTs = prev.updatedAt ? new Date(prev.updatedAt).getTime() : 0;
      const currTs = c.updatedAt ? new Date(c.updatedAt).getTime() : 0;
      if (currTs >= prevTs) {
        seen.set(key, { ...prev, ...c });
      }
    }
  }
  return Array.from(seen.values());
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

  const localCustomers = await getLocalCustomers<UnifiedCustomer>();

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

  const merged = dedupeByKey([...apiCustomers, ...localCustomers, ...bookingCustomers]);
  // Sort by recency when available, fallback to name
  merged.sort((a, b) => {
    const at = a.updatedAt || a.createdAt;
    const bt = b.updatedAt || b.createdAt;
    if (at && bt) return new Date(bt).getTime() - new Date(at).getTime();
    return (a.name || '').localeCompare(b.name || '');
  });
  return merged;
}

