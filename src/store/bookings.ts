import { create } from "zustand";
import {
  getSupabaseBookings,
  upsertSupabaseBooking,
  deleteSupabaseBooking
} from "@/lib/supa-data";

export type BookingStatus = "pending" | "confirmed" | "in_progress" | "done" | "tentative" | "blocked";

export interface Booking {
  id: string;
  title: string;
  customer: string;
  customerId?: string; // Link to customer record
  date: string; // ISO date
  endTime?: string; // ISO date for end time
  status: BookingStatus;
  createdAt?: string;
  vehicle?: string; // Vehicle Type (Sedan, SUV, etc.)
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  address?: string;
  assignedEmployee?: string;
  notes?: string;
  price?: number;
  addons?: string[];
  bookedBy?: string;
  hasReminder?: boolean;
  reminderFrequency?: number; // months: 1, 3, 4, 6
  isArchived?: boolean;
}

const STORAGE_KEY = "bookings";

// Helper: load local strictly for migration/fallback
function loadLocal(): Booking[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch (error) {
    return [];
  }
}

interface BookingsState {
  items: Booking[];
  pendingCount: number;
  loading: boolean;
  add: (b: Booking) => Promise<void>;
  update: (id: string, patch: Partial<Booking>) => Promise<void>;
  move: (id: string, dateISO: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useBookingsStore = create<BookingsState>((set, get) => ({
  items: [], // Start empty, fetch on mount
  pendingCount: 0,
  loading: false,

  refresh: async () => {
    set({ loading: true });
    try {
      // Fetch from Supabase
      const remoteItems: Booking[] = await getSupabaseBookings();

      // MIGRATION CHECK: 
      // If Remote is empty BUT Local has data, migrate all local to remote.
      if (remoteItems.length === 0) {
        const localItems = loadLocal();
        if (localItems.length > 0) {
          console.log("Migrating local bookings to Supabase...", localItems.length);
          // Upload all
          await Promise.all(localItems.map(b => upsertSupabaseBooking(b)));
          // Refetch to confirm
          const migratedItems = await getSupabaseBookings();
          set({
            items: migratedItems,
            pendingCount: migratedItems.filter((i: Booking) => i.status === "pending").length
          });
          // Clear local storage after successful migration?
          // For safety, maybe rename key or leave as backup for now.
          // localStorage.removeItem(STORAGE_KEY); 
          set({ loading: false });
          return;
        }
      }

      set({
        items: remoteItems,
        pendingCount: remoteItems.filter((i: Booking) => i.status === "pending").length
      });
    } catch (e) {
      console.error("Booking sync failed, falling back to local for view", e);
      // Fallback
      set({ items: loadLocal() });
    } finally {
      set({ loading: false });
    }
  },

  add: async (b) => {
    // Optimistic Update
    const record = { ...b, createdAt: new Date().toISOString() };
    const items = [...get().items, record];
    set({ items, pendingCount: items.filter(i => i.status === "pending").length });

    // Persist to Supabase
    try {
      await upsertSupabaseBooking(record);
      // Sync PDF/Alerts
      const { onBookingCreated } = await import("@/lib/bookingsSync");
      onBookingCreated(record);
    } catch (err) {
      console.error("Failed to save booking to DB", err);
    }
  },

  update: async (id, patch) => {
    const current = get().items.find(i => i.id === id);
    const updatedItems = get().items.map(i => i.id === id ? { ...i, ...patch } : i);

    // Optimistic
    set({ items: updatedItems, pendingCount: updatedItems.filter(i => i.status === "pending").length });

    // Persist
    const updatedRecord = updatedItems.find(i => i.id === id);
    if (updatedRecord) {
      try {
        await upsertSupabaseBooking(updatedRecord);
        // Sync Status
        if (current && typeof patch.status === 'string' && current.status !== patch.status) {
          const { onBookingStatusChanged } = await import("@/lib/bookingsSync");
          onBookingStatusChanged(updatedRecord, current.status, patch.status);
        }
      } catch (err) {
        console.error("Failed to update booking in DB", err);
      }
    }
  },

  move: async (id, dateISO) => {
    const updatedItems = get().items.map(i => i.id === id ? { ...i, date: dateISO } : i);
    set({ items: updatedItems });

    const record = updatedItems.find(i => i.id === id);
    if (record) {
      try {
        await upsertSupabaseBooking(record);
      } catch (err) { console.error("Move failed", err); }
    }
  },

  remove: async (id) => {
    const items = get().items.filter(i => i.id !== id);
    set({ items, pendingCount: items.filter(i => i.status === "pending").length });
    try {
      await deleteSupabaseBooking(id);
    } catch (err) { console.error("Delete failed", err); }
  }
}));
