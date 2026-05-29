import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FollowUpLog {
  id: string;
  customerEmail: string;
  customerName: string;
  dateSent: string;
  frequency: string;
  emailType: string;
  customNote?: string;
  couponCode?: string;
}

interface FollowUpState {
  logs: FollowUpLog[];
  addLog: (log: FollowUpLog) => void;
  clearHistory: () => void;
  removeLog: (id: string) => void;
}

export const useFollowUpStore = create<FollowUpState>()(
  persist(
    (set) => ({
      logs: [],
      addLog: (log) => set((state) => ({ logs: [log, ...state.logs] })),
      clearHistory: () => set({ logs: [] }),
      removeLog: (id) => set((state) => ({ logs: state.logs.filter(l => l.id !== id) })),
    }),
    {
      name: 'followup-history-storage',
    }
  )
);
