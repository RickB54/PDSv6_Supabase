import localforage from "localforage";
import supabase from "@/lib/supabase";
import { pushAdminAlert } from "@/lib/adminAlerts";

localforage.config({ name: "prime-detail-db" });

const KEY = "receivables";

export type Receivable = {
  id?: string;
  amount: number;
  category?: string;
  description?: string;
  date: string; // ISO date
  customerId?: string;
  customerName?: string;
  paymentMethod?: string; // cash, card, etc
  createdAt?: string;
  updatedAt?: string;
};

const genId = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? (crypto as any).randomUUID()
    : `rcv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

async function fallbackGet(): Promise<Receivable[]> {
  return (await localforage.getItem<Receivable[]>(KEY)) || [];
}
async function fallbackSet(list: Receivable[]) {
  await localforage.setItem(KEY, list);
}

export async function getReceivables(): Promise<Receivable[]> {
  try {
    const { data, error } = await supabase.from("receivables").select("*");
    if (error) throw error;
    return Array.isArray(data) ? data as any : [];
  } catch {
    return fallbackGet();
  }
}

export async function upsertReceivable(rec: Receivable): Promise<Receivable> {
  const now = new Date().toISOString();
  try {
    // Try Supabase first
    if (rec.id) {
      const { data, error } = await supabase
        .from("receivables")
        .update({ ...rec, updated_at: now })
        .eq("id", rec.id)
        .select()
        .single();
      if (error) throw error;
      const saved = (data as any) || { ...rec };
      try { pushAdminAlert('accounting_update', 'Income recorded', 'system', { recordType: 'Accounting', id: saved.id }); } catch {}
      return saved as any;
    } else {
      const { data, error } = await supabase
        .from("receivables")
        .insert({ ...rec, created_at: now, updated_at: now })
        .select()
        .single();
      if (error) throw error;
      const saved = (data as any) || { ...rec };
      try { pushAdminAlert('accounting_update', 'Income recorded', 'system', { recordType: 'Accounting', id: saved.id }); } catch {}
      return saved as any;
    }
  } catch {
    // Fallback to local storage
    const list = await fallbackGet();
    let saved: Receivable;
    if (rec.id) {
      const idx = list.findIndex((r) => r.id === rec.id);
      saved = { ...list[idx], ...rec, updatedAt: now, createdAt: list[idx]?.createdAt || now } as Receivable;
      if (idx >= 0) list[idx] = saved; else list.push(saved);
    } else {
      saved = { id: genId(), ...rec, createdAt: now, updatedAt: now } as Receivable;
      list.push(saved);
    }
    await fallbackSet(list);
    try { pushAdminAlert('accounting_update', 'Income recorded (local)', 'system', { recordType: 'Accounting', id: saved.id }); } catch {}
    return saved;
  }
}

export async function deleteReceivable(id: string): Promise<void> {
  try {
    const { error } = await supabase.from("receivables").delete().eq("id", id);
    if (error) throw error;
  } catch {
    const list = await fallbackGet();
    const next = list.filter((r) => r.id !== id);
    await fallbackSet(next);
  }
}

