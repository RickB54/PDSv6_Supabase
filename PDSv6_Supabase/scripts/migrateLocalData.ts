/**
 * Migration script: Upload local fake backend data to Supabase.
 * Safe to rerun; uses upsert on unique ids and does not delete local data.
 *
 * How to run (dev browser):
 * - Import and call migrateLocalData() from a temporary route or console.
 *   Example in browser console (when app is loaded):
 *     import('/scripts/migrateLocalData.ts').then(m => m.migrateLocalData())
 */

import supabase from '../src/lib/supabase';

// Built-in packages and add-ons
import { servicePackages, addOns } from '../src/lib/services';
// Custom packages/add-ons/services & vehicle type helpers
import { getCustomPackages, getCustomAddOns, getCustomServices } from '../src/lib/servicesMeta';
import localforage from 'localforage';

type Result = { ok: boolean; inserted: number; updated?: number; errors?: string[] };

async function upsertPackages(): Promise<Result> {
  // Load savedPrices to populate per-vehicle columns if present
  const saved = (await localforage.getItem<Record<string,string>>('savedPrices')) || {};
  const built = servicePackages.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    compact_price: Number(saved[`package:${p.id}:compact`] ?? p.pricing?.compact ?? p.basePrice ?? 0) || 0,
    midsize_price: Number(saved[`package:${p.id}:midsize`] ?? p.pricing?.midsize ?? p.basePrice ?? 0) || 0,
    truck_price: Number(saved[`package:${p.id}:truck`] ?? p.pricing?.truck ?? p.basePrice ?? 0) || 0,
    luxury_price: Number(saved[`package:${p.id}:luxury`] ?? p.pricing?.luxury ?? p.basePrice ?? 0) || 0,
    discount_percent: null,
    discount_start: null,
    discount_end: null,
    is_active: true,
  }));
  const custom = getCustomPackages().map(p => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    compact_price: Number(saved[`package:${p.id}:compact`] ?? p.pricing?.compact ?? 0) || 0,
    midsize_price: Number(saved[`package:${p.id}:midsize`] ?? p.pricing?.midsize ?? 0) || 0,
    truck_price: Number(saved[`package:${p.id}:truck`] ?? p.pricing?.truck ?? 0) || 0,
    luxury_price: Number(saved[`package:${p.id}:luxury`] ?? p.pricing?.luxury ?? 0) || 0,
    discount_percent: null,
    discount_start: null,
    discount_end: null,
    is_active: true,
  }));
  const rows = [...built, ...custom];
  const { error } = await supabase.from('packages').upsert(rows, { onConflict: 'id' });
  return { ok: !error, inserted: rows.length, errors: error ? [error.message] : [] };
}

async function upsertAddOns(): Promise<Result> {
  const saved = (await localforage.getItem<Record<string,string>>('savedPrices')) || {};
  const built = addOns.map(a => ({
    id: a.id,
    name: a.name,
    description: a.description || '',
    compact_price: Number(saved[`addon:${a.id}:compact`] ?? a.pricing?.compact ?? a.basePrice ?? 0) || 0,
    midsize_price: Number(saved[`addon:${a.id}:midsize`] ?? a.pricing?.midsize ?? a.basePrice ?? 0) || 0,
    truck_price: Number(saved[`addon:${a.id}:truck`] ?? a.pricing?.truck ?? a.basePrice ?? 0) || 0,
    luxury_price: Number(saved[`addon:${a.id}:luxury`] ?? a.pricing?.luxury ?? a.basePrice ?? 0) || 0,
    discount_percent: null,
    discount_start: null,
    discount_end: null,
    is_active: true,
  }));
  const custom = getCustomAddOns().map(a => ({
    id: a.id,
    name: a.name,
    description: '',
    compact_price: Number(saved[`addon:${a.id}:compact`] ?? a.pricing?.compact ?? 0) || 0,
    midsize_price: Number(saved[`addon:${a.id}:midsize`] ?? a.pricing?.midsize ?? 0) || 0,
    truck_price: Number(saved[`addon:${a.id}:truck`] ?? a.pricing?.truck ?? 0) || 0,
    luxury_price: Number(saved[`addon:${a.id}:luxury`] ?? a.pricing?.luxury ?? 0) || 0,
    discount_percent: null,
    discount_start: null,
    discount_end: null,
    is_active: true,
  }));
  const rows = [...built, ...custom];
  const { error } = await supabase.from('add_ons').upsert(rows, { onConflict: 'id' });
  return { ok: !error, inserted: rows.length, errors: error ? [error.message] : [] };
}

async function upsertVehicleTypes(): Promise<Result> {
  const seed = [
    { id: 'compact', name: 'Compact/Sedan', description: 'Small cars and sedans', hasPricing: true },
    { id: 'midsize', name: 'Mid-Size/SUV', description: 'Mid-size cars and SUVs', hasPricing: true },
    { id: 'truck', name: 'Truck/Van/Large SUV', description: 'Trucks, vans, large SUVs', hasPricing: true },
    { id: 'luxury', name: 'Luxury/High-End', description: 'Luxury and premium vehicles', hasPricing: true },
  ];
  let list: any[] = [];
  try {
    const current = (await localforage.getItem('vehicleTypes')) as any[] | null;
    list = Array.isArray(current) && current.length > 0 ? current : seed;
  } catch {
    list = seed;
  }
  const rows = list.map(v => ({
    id: String(v.id),
    name: String(v.name || v.id),
    description: String(v.description || ''),
    size: null,
    multiplier: 1,
    is_active: Boolean(v.hasPricing != null ? v.hasPricing : true),
  }));
  const { error } = await supabase.from('vehicle_types').upsert(rows, { onConflict: 'id' });
  return { ok: !error, inserted: rows.length, errors: error ? [error.message] : [] };
}

async function upsertServices(): Promise<Result> {
  // Use custom services plus union of built-in step names as "services"
  const custom = getCustomServices().map(s => ({
    id: s.id,
    name: s.name,
    description: '',
    category: null,
    price_min: null,
    price_max: null,
    duration: null,
    is_active: true,
  }));
  const uniqueSteps = new Map<string, string>();
  for (const p of servicePackages) {
    for (const st of (p.steps || [])) {
      if (!uniqueSteps.has(st.id)) uniqueSteps.set(st.id, st.name);
    }
  }
  const stepsAsServices = Array.from(uniqueSteps.entries()).map(([id, name]) => ({
    id, name,
    description: '', category: null, price_min: null, price_max: null, duration: null, is_active: true,
  }));
  const rows = [...custom, ...stepsAsServices];
  const { error } = await supabase.from('services').upsert(rows, { onConflict: 'id' });
  return { ok: !error, inserted: rows.length, errors: error ? [error.message] : [] };
}

export async function migrateLocalData() {
  const results: Record<string, Result> = {};
  results.packages = await upsertPackages();
  results.add_ons = await upsertAddOns();
  results.vehicle_types = await upsertVehicleTypes();
  results.services = await upsertServices();

  // Optional: migrate coupons from local storage
  try {
    const raw = localStorage.getItem('coupons');
    const localCoupons = raw ? JSON.parse(raw) as any[] : [];
    if (Array.isArray(localCoupons) && localCoupons.length > 0) {
      const rows = localCoupons.map((c: any) => ({
        code: String(c.code || (c.id || '')).toUpperCase(),
        type: c.percent != null ? 'percent' : 'amount',
        value: Number(c.percent ?? c.amount ?? 0) || 0,
        applies_to: null,
        usage_limit: Number(c.usesLeft ?? 0) || null,
        active: Boolean(c.active ?? true),
        start: c.startDate ? new Date(c.startDate).toISOString() : null,
        end: c.endDate ? new Date(c.endDate).toISOString() : null,
      }));
      const { error } = await supabase.from('coupons').upsert(rows, { onConflict: 'code' });
      results.coupons = { ok: !error, inserted: rows.length, errors: error ? [error.message] : [] };
    }
  } catch {}

  console.log('[migrateLocalData] done', results);
  return results;
}

export default migrateLocalData;
