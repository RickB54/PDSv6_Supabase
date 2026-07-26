import { useMemo, useEffect, useState } from "react";
import { Customer, supabase } from "@/lib/supa-data";
import { Booking } from "@/store/bookings";
import { contentService } from "@/lib/content";
import { differenceInDays, addDays, addMonths, isBefore, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export interface FollowUpSettings {
  active: boolean;
  threshold: number;
  unit: 'days' | 'months';
}

export const DEFAULT_FOLLOW_UP_SETTINGS: FollowUpSettings = {
  active: true,
  threshold: 90,
  unit: 'days'
};

export function useFollowUpSettings() {
  const [settings, setSettings] = useState<FollowUpSettings>(DEFAULT_FOLLOW_UP_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      const meta = await contentService.getServiceMeta("follow_up_settings");
      if (meta?.meta) {
        setSettings(meta.meta);
      }
      setLoading(false);
    };
    loadSettings();

    const handleContentChange = (e: any) => {
      if (e.detail?.kind === 'settings') loadSettings();
    };
    window.addEventListener('content-changed', handleContentChange as any);
    return () => window.removeEventListener('content-changed', handleContentChange as any);
  }, []);

  const saveSettings = async (newSettings: FollowUpSettings) => {
    await contentService.upsertServiceMeta({
      key: "follow_up_settings",
      title: "Follow-up Settings",
      meta: newSettings
    });
    setSettings(newSettings);
    window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'settings' } }));
  };

  return { settings, saveSettings, loading };
}

export function useFollowUpStatus(customers: Customer[], bookings: Booking[]) {
  const { settings, loading: settingsLoading } = useFollowUpSettings();
  const [engagements, setEngagements] = useState<any[]>([]);
  const [loadingEngagements, setLoadingEngagements] = useState(true);

  const fetchEngagements = async () => {
    setLoadingEngagements(true);
    const { data } = await supabase.from('engagements').select('*').order('created_at', { ascending: false });
    if (data) setEngagements(data);
    setLoadingEngagements(false);
  };

  useEffect(() => {
    fetchEngagements();
  }, []);

  return useMemo(() => {
    const loading = settingsLoading || loadingEngagements;
    if (!settings.active || loading) return { active: settings.active, overdue: [], dueThisWeek: [], dueThisMonth: [], loading, refresh: fetchEngagements };

    const now = new Date();
    const thresholdDays = settings.unit === 'months' ? settings.threshold * 30 : settings.threshold;
    
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const customersWithStatus = customers.map(customer => {
      let lastActivityDate = customer.updated_at || customer.created_at ? new Date(customer.updated_at || customer.created_at) : new Date(2000, 0, 1);

      // 1. Profile Notes
      if (customer.notes && customer.notes.trim()) {
        const noteDate = customer.updated_at ? new Date(customer.updated_at) : new Date();
        if (noteDate > lastActivityDate) lastActivityDate = noteDate;
      }

      // 2. Activity Log
      const activityLog = (customer as any).activity_log || (customer as any).activityLog || [];
      activityLog.forEach((log: any) => {
        const logDate = new Date(log.timestamp || log.created_at);
        if (logDate > lastActivityDate) lastActivityDate = logDate;
      });

      // 3. Bookings
      const customerBookings = bookings.filter(b => 
        b.customerId === customer.id || 
        (customer.email && b.customerEmail?.toLowerCase() === customer.email.toLowerCase()) ||
        (customer.name && b.customer?.toLowerCase() === customer.name.toLowerCase())
      );

      customerBookings.forEach(b => {
        const bDate = new Date(b.date || (b as any).createdAt || (b as any).created_at);
        if (bDate > lastActivityDate) lastActivityDate = bDate;
        if (b.notes && b.notes.trim() && bDate > lastActivityDate) {
          lastActivityDate = bDate;
        }
      });

      // 4. Engagements
      const customerEngagements = engagements.filter(e => 
        e.customer_id === customer.id ||
        (customer.email && e.customer_email?.toLowerCase() === customer.email.toLowerCase()) ||
        (customer.name && e.customer_name?.toLowerCase() === customer.name.toLowerCase())
      );

      customerEngagements.forEach(e => {
        const eDate = new Date(e.created_at || e.timestamp);
        if (eDate > lastActivityDate) lastActivityDate = eDate;
      });

      const safeThreshold = Number(settings.threshold) || 1;
      const thresholdDate = settings.unit === 'months' 
        ? addMonths(lastActivityDate, safeThreshold)
        : addDays(lastActivityDate, safeThreshold);

      const daysUntilDue = differenceInDays(thresholdDate, now);
      
      const isOverdue = daysUntilDue < 0;
      const isDueThisWeek = daysUntilDue >= 0 && daysUntilDue <= 7;
      const isDueThisMonth = daysUntilDue > 7 && daysUntilDue <= 30;
      const daysSince = differenceInDays(now, lastActivityDate);

      return {
        customer,
        lastActivityDate,
        thresholdDate,
        isOverdue,
        isDueThisWeek,
        isDueThisMonth,
        daysSince
      };
    });

    const overdue = customersWithStatus.filter(c => c.isOverdue).sort((a, b) => b.daysSince - a.daysSince);
    const dueThisWeek = customersWithStatus.filter(c => c.isDueThisWeek).sort((a, b) => b.daysSince - a.daysSince);
    const dueThisMonth = customersWithStatus.filter(c => c.isDueThisMonth).sort((a, b) => b.daysSince - a.daysSince);

    return { active: settings.active, overdue, dueThisWeek, dueThisMonth, loading, refresh: fetchEngagements };
  }, [customers, bookings, engagements, settingsLoading, loadingEngagements, settings]);
}
