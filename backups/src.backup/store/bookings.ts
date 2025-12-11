import { create } from "zustand";

export type BookingStatus = "pending" | "confirmed" | "in_progress" | "done";

export interface Booking {
  id: string;
  title: string;
  customer: string;
  date: string; // ISO date
  status: BookingStatus;
  createdAt?: string;
}

const STORAGE_KEY = "bookings";

function load(): Booking[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function save(items: Booking[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

interface BookingsState {
  items: Booking[];
  pendingCount: number;
  add: (b: Booking) => void;
  update: (id: string, patch: Partial<Booking>) => void;
  move: (id: string, dateISO: string) => void;
  remove: (id: string) => void;
  refresh: () => void;
}

export const useBookingsStore = create<BookingsState>((set, get) => ({
  items: load(),
  pendingCount: load().filter(b => b.status === "pending").length,
  add: (b) => {
    const record = { ...b, createdAt: new Date().toISOString() };
    const items = [...get().items, record];
    save(items);
    set({ items, pendingCount: items.filter(i => i.status === "pending").length });
    // Auto-generate and upload PDF for new bookings
    try {
      // Dynamically import to avoid circular deps during tests
      const { onBookingCreated } = require("@/lib/bookingsSync");
      onBookingCreated(record);
    } catch (err) {
      console.warn('Booking sync hook failed', err);
    }
  },
  update: (id, patch) => {
    const current = get().items.find(i => i.id === id);
    const items = get().items.map(i => i.id === id ? { ...i, ...patch } : i);
    save(items);
    set({ items, pendingCount: items.filter(i => i.status === "pending").length });
    // If status changed, generate a PDF and alert (include Confirm)
    try {
      if (current && typeof patch.status === 'string' && current.status !== patch.status) {
        const { onBookingStatusChanged } = require("@/lib/bookingsSync");
        const updated = items.find(i => i.id === id)!;
        onBookingStatusChanged(updated, current.status, patch.status);
      }
    } catch (err) {
      console.warn('Booking status sync hook failed', err);
    }
  },
  move: (id, dateISO) => {
    const items = get().items.map(i => i.id === id ? { ...i, date: dateISO } : i);
    save(items);
    set({ items });
  },
  remove: (id) => {
    const items = get().items.filter(i => i.id !== id);
    save(items);
    set({ items, pendingCount: items.filter(i => i.status === "pending").length });
  },
  refresh: () => set({ items: load(), pendingCount: load().filter(b => b.status === "pending").length })
}));
