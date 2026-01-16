import { create } from "zustand";
import { isSupabaseConfigured } from "@/lib/supabase";
import * as couponsSvc from "@/services/supabase/coupons";

export interface Coupon {
  id: string;
  code: string;
  title: string;
  percent?: number;
  amount?: number;
  usesLeft: number;
  startDate?: string;
  endDate?: string;
  active: boolean;
}

const STORAGE_KEY = "coupons";

function load(): Coupon[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function save(items: Coupon[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

interface CouponsState {
  items: Coupon[];
  add: (c: Coupon) => void;
  update: (id: string, patch: Partial<Coupon>) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  refresh: () => void;
}

export const useCouponsStore = create<CouponsState>((set, get) => ({
  items: load(),
  add: async (c) => {
    // Optimistic local update first so UI never stalls
    const existingItems = get().items;
    const itemsLocal = [...existingItems, c];
    save(itemsLocal);
    set({ items: itemsLocal });

    // Attempt Supabase create
    if (isSupabaseConfigured()) {
      try {
        const row = {
          code: c.code.toUpperCase(),
          type: c.percent != null ? 'percent' : 'amount',
          value: Number(c.percent ?? c.amount ?? 0) || 0,
          usage_limit: (c.usesLeft === 0 || c.usesLeft >= 9999) ? null : c.usesLeft,
          active: c.active ?? true,
          start: c.startDate || null,
          end: c.endDate || null,
        } as any;
        await couponsSvc.create(row);
        await get().refresh();
        console.log(`[coupons.store] SUCCESS: Coupon ${c.code} synced to Supabase`);
      } catch (err) {
        console.error("[coupons.store] Supabase create failed", err);
        // We keep the local item but throw so UI knows sync failed
        throw err;
      }
    }
  },
  update: async (id, patch) => {
    const existing = get().items.find(i => i.id === id);
    if (!existing) return;

    // Optimistic local update
    const itemsLocal = get().items.map(i => i.id === id ? { ...i, ...patch } : i);
    save(itemsLocal);
    set({ items: itemsLocal });

    if (isSupabaseConfigured()) {
      try {
        const next = { ...existing, ...patch } as Coupon;
        const row = {
          code: next.code.toUpperCase(),
          type: next.percent != null ? 'percent' : 'amount',
          value: Number(next.percent ?? next.amount ?? 0) || 0,
          usage_limit: (next.usesLeft === 0 || next.usesLeft >= 9999) ? null : next.usesLeft,
          active: next.active ?? true,
          start: next.startDate || null,
          end: next.endDate || null
        } as any;
        await couponsSvc.update(row.code, row);
        await get().refresh();
      } catch (err) {
        console.error("[coupons.store] Supabase update failed", err);
        throw err;
      }
    }
  },
  remove: async (id) => {
    const existing = get().items.find(i => i.id === id);
    if (!existing) return;

    // Optimistic local removal
    const itemsLocal = get().items.filter(i => i.id !== id);
    save(itemsLocal);
    set({ items: itemsLocal });

    if (isSupabaseConfigured()) {
      try {
        await couponsSvc.remove(existing.code.toUpperCase());
        await get().refresh();
      } catch (err) {
        console.error('[coupons.store] Supabase remove failed', err);
        throw err;
      }
    }
  },
  toggle: async (id) => {
    const existing = get().items.find(i => i.id === id);
    if (!existing) return;

    // Optimistic local toggle
    const nextActive = !existing.active;
    const itemsLocal = get().items.map(i => i.id === id ? { ...i, active: nextActive } : i);
    save(itemsLocal);
    set({ items: itemsLocal });

    if (isSupabaseConfigured()) {
      try {
        await couponsSvc.toggle(existing.code.toUpperCase(), nextActive);
        await get().refresh();
      } catch (err) {
        console.error('[coupons.store] Supabase toggle failed', err);
        throw err;
      }
    }
  },
  refresh: async () => {
    if (isSupabaseConfigured()) {
      try {
        const rows = await couponsSvc.getAll();
        const items = (rows || []).map((r: any) => ({
          id: `coupon_${r.code}`,
          code: String(r.code || '').toUpperCase(),
          title: String(r.code || '').toUpperCase(),
          percent: r.type === 'percent' ? Number(r.value || 0) : undefined,
          amount: r.type === 'amount' ? Number(r.value || 0) : undefined,
          usesLeft: (r.usage_limit === null || r.usage_limit === undefined || r.usage_limit === 0) ? 99999 : Number(r.usage_limit),
          startDate: r.start || undefined,
          endDate: r.end || undefined,
          active: !!r.active,
        } as Coupon));

        save(items); // Sync remote data back to local storage for offline use
        set({ items });
        console.log(`[coupons.store] SUCCESS: Refreshed ${items.length} coupons from Supabase`);
        return;
      } catch (err) {
        console.error("[coupons.store] Refresh failed, falling back to local storage", err);
        set({ items: load() });
      }
    } else {
      set({ items: load() });
    }
  }
}));

// Initialize store from Supabase if possible
if (isSupabaseConfigured()) {
  useCouponsStore.getState().refresh();
}

export function applyBestCoupon(total: number): { total: number; applied?: Coupon } {
  const now = new Date();
  const coupons = useCouponsStore.getState().items.filter(c => c.active && c.usesLeft > 0 && (!c.startDate || new Date(c.startDate) <= now) && (!c.endDate || new Date(c.endDate) >= now));
  let best = undefined as Coupon | undefined;
  let bestTotal = total;
  for (const c of coupons) {
    let t = total;
    if (c.percent) t = Math.max(0, t * (1 - c.percent / 100));
    if (c.amount) t = Math.max(0, t - c.amount);
    if (t < bestTotal) { bestTotal = t; best = c; }
  }
  return { total: bestTotal, applied: best };
}
