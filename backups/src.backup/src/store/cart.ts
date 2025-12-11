import { create } from "zustand";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  vehicleType?: string;
  addOns?: { id: string; name: string; price: number }[];
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  setQuantity: (id: string, qty: number) => void;
  subtotal: () => number;
  count: () => number;
}

const STORAGE_KEY = "cart_items";

function load(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || "[]";
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function save(items: CartItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

export const useCartStore = create<CartState>((set, get) => ({
  items: load(),
  addItem: (item) => {
    const qty = item.quantity ?? 1;
    const existing = get().items.find(i => i.id === item.id);
    let items: CartItem[];
    if (existing) {
      items = get().items.map(i => i.id === item.id ? { ...i, quantity: i.quantity + qty } : i);
    } else {
      items = [...get().items, { ...item, quantity: qty }];
    }
    save(items);
    set({ items });
  },
  removeItem: (id) => {
    const items = get().items.filter(i => i.id !== id);
    save(items);
    set({ items });
  },
  clear: () => { save([]); set({ items: [] }); },
  setQuantity: (id, qty) => {
    if (qty <= 0) return get().removeItem(id);
    const items = get().items.map(i => i.id === id ? { ...i, quantity: qty } : i);
    save(items);
    set({ items });
  },
  subtotal: () => get().items.reduce((sum, i) => sum + (i.price * i.quantity) + (i.addOns?.reduce((s,a)=>s+a.price,0) || 0), 0),
  count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));

