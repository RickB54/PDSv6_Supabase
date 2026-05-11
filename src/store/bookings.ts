import { create } from "zustand";
import {
  getSupabaseBookings,
  upsertSupabaseBooking,
  deleteSupabaseBooking
} from "@/lib/supa-data";
import { isSupabaseEnabled } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const b_import = { supabase };

export type BookingStatus = "pending" | "confirmed" | "in_progress" | "done" | "tentative" | "blocked" | "completed" | "cancelled";

export interface Booking {
  id: string;
  title: string;
  customer: string;
  customerEmail?: string;
  customerPhone?: string;
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
  customReminderDate?: string; // For manual anytime scheduling
  isArchived?: boolean;
  vehicleId?: string;
  source?: string;
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
  refresh: (isBackground?: boolean) => Promise<void>;
  subscribeRealtime: () => () => void;
}

export const useBookingsStore = create<BookingsState>((set, get) => ({
  items: loadLocal(), // Start with local data for instant load
  pendingCount: 0,
  loading: false,

  refresh: async (isBackground = false) => {
    if (!isBackground) set({ loading: true });
    try {
      // Fetch from Supabase
      const allRemoteItems: Booking[] = await getSupabaseBookings();
      
      // CRITICAL: Filter out the internal system alert storage record so it NEVER appears in the UI/Calendar
      const ALERT_DUMMY_ID = '00000000-0000-0000-0000-000000000000';
      const remoteItems = allRemoteItems.filter(b => b.id !== ALERT_DUMMY_ID);

      // MIGRATION / FALLBACK CHECK: 
      // If Remote is empty BUT Local has data, migrate all local to remote.
      if (remoteItems.length === 0 && allRemoteItems.length === 0) {
        const localItems = loadLocal().filter(b => b.id !== ALERT_DUMMY_ID);
        if (localItems.length > 0) {
          console.log("Migrating local bookings to Supabase...", localItems.length);
          await Promise.all(localItems.map(b => upsertSupabaseBooking(b)));
          const migratedItems = (await getSupabaseBookings()).filter(b => b.id !== ALERT_DUMMY_ID);
          set({
            items: migratedItems,
            pendingCount: migratedItems.filter((i: Booking) => i.status === "pending").length
          });
          if (!isBackground) set({ loading: false });
          return;
        }
      }

      // CRITICAL: Merge remote items with any local items that haven't synced yet
      // This prevents "disappearing" bookings during the split-second between a local save and a remote fetch.
      const localOptimistic = get().items.filter(li => {
        const isRemote = remoteItems.some(ri => ri.id === li.id);
        if (isRemote) return false;

        // Protect local items created in the last 30 seconds from being overwritten by stale DB fetch
        if (!li.createdAt) return false;
        const age = Date.now() - new Date(li.createdAt).getTime();
        const isFresh = age < 30000; // 30 second protection window
        
        if (isFresh) {
          console.log(`[Stability] Preserving optimistic record: ${li.customer} (${Math.round(age/1000)}s old)`);
        }
        return isFresh;
      });

      const mergedItems = [...remoteItems, ...localOptimistic];

      set({
        items: mergedItems,
        pendingCount: mergedItems.filter((i: Booking) => i.status === "pending").length
      });
      console.log(`[Stability] Sync complete. Remote: ${remoteItems.length}, Preserved Local: ${localOptimistic.length}`);
    } catch (e) {
      console.error("❌ Booking sync failed", e);
      // Ensure we have current local data if cloud fails
      set({ items: loadLocal() });
    } finally {
      if (!isBackground) set({ loading: false });
    }
  },

  subscribeRealtime: () => {
    const { supabase } = b_import; // We'll need to handle imports carefully
    const channel = supabase
      .channel('bookings-realtime')
      .on(
        'postgres_changes',
        { event: '*', table: 'bookings', schema: 'public' },
        async (payload) => {
          console.log('🔥 Realtime Booking Change:', payload.eventType, payload.new);

          const refresh = get().refresh;
          // Slight delay to allow for DB consistency and replication
          setTimeout(async () => {
            console.log('[Stability] Realtime update triggered refresh');
            await refresh(true);
          }, 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  add: async (b) => {
    // Optimistic Update
    const record = { ...b, createdAt: new Date().toISOString() };
    const items = [...get().items, record];
    set({ items, pendingCount: items.filter(i => i.status === "pending").length });

    // 1. Perspective check: Is Supabase enabled?
    if (isSupabaseEnabled()) {
      try {
        await upsertSupabaseBooking(record);
      } catch (err: any) {
        console.error("Supabase persistent save failed:", err);
        // PERSISTENT ERROR TOAST
        toast.error(`Database Save Failed: ${err.message || 'Unknown error'}. Booking is only saved locally.`, {
          duration: 10000,
          id: `db-error-${record.id}`
        });
      }
    }

    // 2. ALWAYS trigger sync logic (PDF, Admin Alerts, File Manager)
    try {
      const { onBookingCreated } = await import("@/lib/bookingsSync");
      await onBookingCreated(record);
    } catch (syncErr) {
      console.error("Local sync logic failed (PDF/Alerts):", syncErr);
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
          await onBookingStatusChanged(updatedRecord, current.status, patch.status);
        }
      } catch (err) {
        console.error("Failed to update booking in DB", err);
        import("sonner").then(({ toast }) => {
          toast.error(`Cloud sync failed: ${err.message || 'Unknown error'}. Your changes might not be saved.`);
        });
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
