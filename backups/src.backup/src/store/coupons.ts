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
    const itemsLocal = [...get().items, c];
    save(itemsLocal);
    set({ items: itemsLocal });

    // Attempt Supabase create in the background when configured
    if (isSupabaseConfigured()) {
      try {
        const row = {
          code: c.code.toUpperCase(),
          type: c.percent != null ? 'percent' : 'amount',
          value: Number(c.percent ?? c.amount ?? 0) || 0,
          usage_limit: c.usesLeft ?? null,
          active: c.active ?? true,
          start: c.startDate || null,
          end: c.endDate || null,
        } as any;
        await couponsSvc.create(row);
        // Refresh from server to ensure consistency
        await get().refresh();
      } catch (err) {
        console.error("[coupons.store] Supabase create failed; keeping local item", err);
      }
    }
  },
  update: async (id, patch) => {
    const existing = get().items.find(i => i.id === id);
    if (isSupabaseConfigured() && existing) {
      try {
        const next = { ...existing, ...patch } as Coupon;
        const row = { code: next.code.toUpperCase(), type: next.percent != null ? 'percent' : 'amount', value: Number(next.percent ?? next.amount ?? 0) || 0, usage_limit: next.usesLeft ?? null, active: next.active ?? true, start: next.startDate || null, end: next.endDate || null } as any;
        await couponsSvc.update(row.code, row);
        await get().refresh();
        return;
      } catch {}
    }
    const items = get().items.map(i => i.id === id ? { ...i, ...patch } : i); save(items); set({ items });
  },
  remove: async (id) => {
    const existing = get().items.find(i => i.id === id);
    // Optimistic local removal first
    const itemsLocal = get().items.filter(i => i.id !== id);
    save(itemsLocal);
    set({ items: itemsLocal });

    // Background Supabase sync when configured
    if (isSupabaseConfigured() && existing) {
      try {
        await couponsSvc.remove(existing.code.toUpperCase());
        await get().refresh();
      } catch (err) {
        console.error('[coupons.store] Supabase remove failed; keeping local removal', err);
      }
    }
  },
  toggle: async (id) => {
    const existing = get().items.find(i => i.id === id);
    // Optimistic local toggle first
    const itemsLocal = get().items.map(i => i.id === id ? { ...i, active: !i.active } : i);
    save(itemsLocal);
    set({ items: itemsLocal });

    // Background Supabase sync when configured
    if (isSupabaseConfigured() && existing) {
      try {
        await couponsSvc.toggle(existing.code.toUpperCase(), !existing.active);
        await get().refresh();
      } catch (err) {
        console.error('[coupons.store] Supabase toggle failed; keeping local toggle', err);
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
          usesLeft: r.usage_limit ?? 0,
          startDate: r.start || undefined,
          endDate: r.end || undefined,
          active: !!r.active,
        } as Coupon));
        set({ items });
        return;
      } catch {}
    }
    set({ items: load() });
  }
}));

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
