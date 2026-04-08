import localforage from "localforage";
import { supabase } from "./supabase";

localforage.config({ name: "prime-detail-db" });

const KEY = "receivables";

export type Receivable = {
  id?: string;
  amount: number;
  category?: string;
  description?: string;
  date: string; // ISO date
  customerName?: string;
  paymentMethod?: string; // cash, card, etc
  createdAt?: string;
  updatedAt?: string;
};

export async function getReceivables(): Promise<Receivable[]> {
  try {
    const { data, error } = await supabase
      .from("manual_income")
      .select("*")
      .order("date", { ascending: false });
    if (error) throw error;
    return (data || []).map((r) => ({
      ...r,
      customerName: r.customer_name,
      paymentMethod: r.payment_method,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  } catch (err) {
    console.error("getReceivables error:", err);
    return (await localforage.getItem<Receivable[]>(KEY)) || [];
  }
}

export async function upsertReceivable(rec: Receivable): Promise<Receivable> {
  try {
    const payload = {
      ...rec,
      customer_name: rec.customerName,
      payment_method: rec.paymentMethod
    };
    delete (payload as any).customerName;
    delete (payload as any).paymentMethod;

    const { data, error } = await supabase
      .from("manual_income")
      .upsert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    const list = (await localforage.getItem<Receivable[]>(KEY)) || [];
    const saved = rec.id ? { ...list.find(r => r.id === rec.id), ...rec } : { id: `rcv-${Date.now()}`, ...rec };
    list.push(saved);
    await localforage.setItem(KEY, list);
    return saved as any;
  }
}

export async function deleteReceivable(id: string): Promise<void> {
  try {
    await supabase.from("manual_income").delete().eq("id", id);
  } catch {
    const list = (await localforage.getItem<Receivable[]>(KEY)) || [];
    await localforage.setItem(KEY, list.filter((r) => r.id !== id));
  }
}
