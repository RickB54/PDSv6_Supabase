import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAlertsStore, mapAlert } from "@/store/alerts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";
import { getEmployeeNotifications, markAllEmployeeNotificationsRead, markEmployeeNotificationRead } from "@/lib/employeeNotifications";
import supabase from "@/lib/supabase";
import { notify } from "@/store/alerts";
import { toast } from "@/hooks/use-toast";
import { performGlobalSync } from "@/lib/adminAlerts";

export default function NotificationBell() {
  const { alerts, latest, unreadCount, markAllRead, markRead, dismissAll, refresh } = useAlertsStore();
  const user = getCurrentUser();
  const isEmployee = !!user && user.role === 'employee';
  const employeeKeys = useMemo(() => {
    const email = String(user?.email || '').trim();
    const name = String(user?.name || '').trim();
    return [email, name].filter(Boolean).map(s => s.toLowerCase());
  }, [user]);
  const [empItems, setEmpItems] = useState<{ id: string; title: string; href: string; read?: boolean }[]>([]);
  const [empUnreadCount, setEmpUnreadCount] = useState<number>(0);
  const [ring, setRing] = useState(false);
  const prevUnreadRef = useRef(unreadCount);
  const location = useLocation();
  const isFileManagerView = location.pathname.startsWith('/file-manager');

  const sendDesktopNotification = (title: string, body: string) => {
    try {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          silent: true
        });
      }
    } catch (err) {
      console.warn("[NotificationBell] Notification constructor failed (expected on mobile):", err);
    }
  };

  useEffect(() => {
    const count = displayUnreadCount;
    if (isFileManagerView) {
      setRing(false);
      prevUnreadRef.current = count;
      return;
    }
    if (count > prevUnreadRef.current) {
      setRing(true);
      
      // 1. Audio Notification
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "square";
        o.frequency.value = 1200;
        g.gain.setValueAtTime(0.3, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        o.connect(g); g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.3);
        setTimeout(() => ctx.close(), 400);
      } catch { }

      // 2. Desktop Notification
      const latestAlert = alerts?.[0];
      if (latestAlert && !latestAlert.read) {
        // Exclude utility background alerts from sliding out on the PC
        const ignoredTypes = [
          'pdf_saved',
          'admin_email_sent',
          'accounting_update',
          'todo_completed',
          'todo_acknowledged',
          'todo_comment',
          'todo_updated',
          'cheat_sheet_downloaded',
          'video_checked',
          'tip_checked'
        ];
        
        if (!ignoredTypes.includes(latestAlert.type)) {
          // Prevent duplicate PC notifications across multiple mounted bell components (e.g. mobile & desktop views)
          const notifiedSet = (window as any).__notifiedAlertIds || new Set<string>();
          (window as any).__notifiedAlertIds = notifiedSet;
          if (!notifiedSet.has(latestAlert.id)) {
            notifiedSet.add(latestAlert.id);
            sendDesktopNotification("New Admin Alert", latestAlert.message);
          }
        }
      }

      setTimeout(() => setRing(false), 600);
    }
    prevUnreadRef.current = count;
  }, [unreadCount, empUnreadCount, isFileManagerView, isEmployee, alerts]);

  // Keep dropdown in sync when alerts/employee notifications change
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'admin_alerts') {
        try { refresh(); } catch { }
      }
      if (e.key === 'employee_notifications') {
        try {
          const list = getEmployeeNotifications();
          const filtered = list.filter(n => employeeKeys.includes(String(n.employeeId || '').toLowerCase()));
          setEmpItems(filtered.map(n => ({ id: n.id, title: n.message, href: '/tasks', read: !!n.read })));
          setEmpUnreadCount(filtered.filter(n => !n.read).length);
        } catch { }
      }
    };
    const onAdminLocal = (e: Event) => { try { refresh(); } catch { } };
    const onEmpLocal = (e: Event) => {
      try {
        const list = getEmployeeNotifications();
        const filtered = list.filter(n => employeeKeys.includes(String(n.employeeId || '').toLowerCase()));
        setEmpItems(filtered.map(n => ({ id: n.id, title: n.message, href: '/tasks', read: !!n.read })));
        setEmpUnreadCount(filtered.filter(n => !n.read).length);
      } catch { }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('admin_alerts_updated', onAdminLocal as EventListener);
    window.addEventListener('employee_notifications_updated', onEmpLocal as EventListener);
    try { refresh(); } catch { }
    try { onEmpLocal(new Event('init')); } catch { }
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('admin_alerts_updated', onAdminLocal as EventListener);
      window.removeEventListener('employee_notifications_updated', onEmpLocal as EventListener);
    };
  }, [refresh, employeeKeys.join('|')]);

  // Helper to extract customer name from alert message
  const getCustomerName = (message: string) => {
    if (!message) return null;
    const patterns = [
      /Job completed for (.*)/i,
      /New Job for (.*)/i,
      /NEW BOOKING: (.*?) -/i,
      /New customer added: (.*)/i,
      /NEW ONLINE REQUEST: (.*?) -/i,
      /Confirmation email sent to (.*?) \(/i,
      /Employee contact: (.*)/i,
      /Payment Success: (.*?) -/i,
      /Inquiry from (.*)/i,
      /for (.*)/i
    ];
    for (const p of patterns) {
      const match = message.match(p);
      if (match) return match[1].trim();
    }
    return null;
  };

  const groupedItems = useMemo(() => {
    if (isEmployee) {
      const sorted = [...(empItems || [])].reverse();
      return sorted.slice(0, 10).map(i => ({ ...i, group: null, shortTitle: i.title }));
    }

    const dismissedIds = JSON.parse(localStorage.getItem('dismissed_alert_ids') || '[]');
    const sortedAlerts = [...(alerts || [])]
      .filter(a => {
        const isDismissed = dismissedIds.includes(a.id) || 
                            (a.payload?.bookingId && dismissedIds.includes(String(a.payload.bookingId))) ||
                            (a.payload?.recordId && dismissedIds.includes(String(a.payload.recordId)));
        return !isDismissed;
      })
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

    const groups: Record<string, any[]> = {};
    const others: any[] = [];

    sortedAlerts.forEach(a => {
      const mapped = mapAlert(a);
      const cust = getCustomerName(a.message || a.type);
      
      const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const safeCust = cust ? escapeRegExp(cust) : '';
      
      const item = { 
        ...mapped, 
        timestamp: a.timestamp, 
        read: a.read, 
        rawMessage: a.message,
        shortTitle: (a.message && safeCust) 
          ? a.message.replace(new RegExp(` (for|to|of|from|:|-|—) ${safeCust}`, 'i'), '').trim()
          : mapped.title
      };

      if (cust && cust.length < 50) {
        if (!groups[cust]) groups[cust] = [];
        groups[cust].push(item);
      } else {
        others.push(item);
      }
    });

    // Convert groups to a list
    const result: any[] = [];
    Object.entries(groups).forEach(([name, alerts]) => {
      result.push({
        id: `group-${name}`,
        isGroup: true,
        customerName: name,
        alerts: alerts.slice(0, 5), // Don't overflow a single group
        timestamp: alerts[0].timestamp // Latest timestamp
      });
    });

    others.forEach(o => result.push({ ...o, isGroup: false }));

    // Re-sort final list by timestamp
    return result.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()).slice(0, 10);
  }, [alerts, empItems, isEmployee]);

  const items = groupedItems;

  // Compute displayUnreadCount and importantUnread using non-dismissed unread alerts
  const displayUnreadCount = useMemo(() => {
    if (isFileManagerView) return 0;
    if (isEmployee) return empUnreadCount;
    
    const dismissedIds = JSON.parse(localStorage.getItem('dismissed_alert_ids') || '[]');
    const activeUnreadAlerts = (alerts || []).filter(a => {
      if (a.read || a.type === 'payroll_due') return false;
      const isDismissed = dismissedIds.includes(a.id) || 
                          (a.payload?.bookingId && dismissedIds.includes(String(a.payload.bookingId))) ||
                          (a.payload?.recordId && dismissedIds.includes(String(a.payload.recordId)));
      return !isDismissed;
    });
    return activeUnreadAlerts.length;
  }, [alerts, isEmployee, empUnreadCount, isFileManagerView]);

  const importantUnread = useMemo(() => {
    if (isEmployee || isFileManagerView) return 0;
    const dismissedIds = JSON.parse(localStorage.getItem('dismissed_alert_ids') || '[]');
    const importantTypes = ['exam_reminder', 'admin_message', 'booking_created', 'pdf_saved'];
    
    return (alerts || []).filter(a => {
      if (a.read || !importantTypes.includes(a.type)) return false;
      const isDismissed = dismissedIds.includes(a.id) || 
                          (a.payload?.bookingId && dismissedIds.includes(String(a.payload.bookingId))) ||
                          (a.payload?.recordId && dismissedIds.includes(String(a.payload.recordId)));
      return !isDismissed;
    }).length;
  }, [alerts, isEmployee, isFileManagerView]);

  // Background Sync for Online Bookings (ensure Admin is notified of public website activity)
  useEffect(() => {
    if (isEmployee || isFileManagerView) return;
    const isDemoMode = localStorage.getItem('demo_mode_active') === 'true';
    if (isDemoMode) return; // Prevent live sync and DB mutations during Demo Mode

    const syncBookings = async () => {
      try {
        // 1. Sync global AdminAlerts state from DB
        await performGlobalSync();
        refresh();

        // 2. Sync 'tentative' bookings and deduplicate via DB flag
        const { data, error } = await supabase
          .from('bookings')
          .select('id, customer_id, date, package_name, metadata, customer_name')
          .in('status', ['tentative', 'TENTATIVE'])
          .limit(20);

          if (error) console.error("Error fetching tentative bookings:", error);

          let addedAny = false;

          for (const b of (data || [])) {
            let meta = b.metadata || {};
            if (typeof meta === 'string') {
              try { meta = JSON.parse(meta); } catch(e) { meta = {}; }
            }
            
            // SYNCHRONIZED DEDUPLICATION:
            const syncId = `sync_book_${b.id}`;
            const isAlreadyNotifiedGlobally = meta.notified === true;
            const dismissedIds = JSON.parse(localStorage.getItem('dismissed_alert_ids') || '[]');
            const isLocallyDismissed = dismissedIds.includes(syncId) || dismissedIds.includes(b.id);
            const alreadyAlerted = (alerts || []).some(a => 
              a.type === 'booking_created' && 
              String(a.payload?.bookingId || '') === String(b.id)
            );
            
            if (!isAlreadyNotifiedGlobally && !isLocallyDismissed && !alreadyAlerted) {
              const custName = b.customer_name || meta.customer_name || meta.name || 'New Customer';
              let activeCustomerId = b.customer_id;

              // AUTO-PROMOTION: If the booking doesn't have a linked customer record,
              // we create one now from the Admin's authenticated session.
              if (!activeCustomerId) {
                try {
                  const email = meta.email || null;
                  let existingId = null;
                  
                  if (email) {
                    const { data: existing } = await supabase.from('customers').select('id').eq('email', email).maybeSingle();
                    if (existing) existingId = existing.id;
                  }

                  if (existingId) {
                    activeCustomerId = existingId;
                    await supabase.from('bookings').update({ customer_id: activeCustomerId }).eq('id', b.id);
                    console.log(`[AlertSync] Linked existing customer ${activeCustomerId} to booking ${b.id}`);
                  } else {
                    const { data: newCust, error: cErr } = await supabase.from('customers').insert({
                      full_name: custName,
                      email: email,
                      phone: meta.phone || null,
                      type: 'prospect',
                      notes: `Auto-created from Online Booking #${b.id}`
                    }).select('id').single();

                    if (!cErr && newCust) {
                      activeCustomerId = newCust.id;
                      await supabase.from('bookings').update({ customer_id: activeCustomerId }).eq('id', b.id);
                      console.log(`[AlertSync] Auto-created prospect ${activeCustomerId} for booking ${b.id}`);
                    }
                  }
                } catch (e) {
                  console.warn("[AlertSync] Auto-prospect creation failed:", e);
                }
              }

              const serviceStr = b.package_name || meta.service_package || meta.package || 'Service';

              toast({
                title: "New Online Booking!",
                description: `${custName} just booked a ${serviceStr}.`,
                variant: "default",
              });

              notify(
                'booking_created',
                `NEW ONLINE REQUEST: ${custName} - ${serviceStr}`,
                'Customer Web',
                { id: syncId, recordId: b.id, bookingId: b.id, customerId: activeCustomerId }
              );
              
              // MARK AS NOTIFIED IN DB (Syncs to all devices)
              await supabase.from('bookings').update({
                metadata: { ...meta, notified: true }
              }).eq('id', b.id);

              addedAny = true;
            }
          }

          // 3. Sync Estimate Responses from engagements
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const { data: engData } = await supabase
            .from('engagements')
            .select('id, customer_id, customer_name, type, note, created_at')
            .in('type', ['Estimate Response', 'Estimate Pre-Check'])
            .gte('created_at', yesterday.toISOString())
            .order('created_at', { ascending: false })
            .limit(10);

          for (const e of (engData || [])) {
            const syncId = `sync_eng_${e.id}`;
            const dismissedIds = JSON.parse(localStorage.getItem('dismissed_alert_ids') || '[]');
            const isLocallyDismissed = dismissedIds.includes(syncId) || dismissedIds.includes(e.id);
            const alreadyAlerted = (useAlertsStore.getState().alerts || []).some(a => 
              a.type === 'admin_message' && 
              String(a.payload?.recordId || '') === String(e.id)
            );

            if (!isLocallyDismissed && !alreadyAlerted) {
              const custName = e.customer_name || 'Customer';
              
              toast({
                title: e.type === 'Estimate Pre-Check' ? "Estimate Accepted!" : "Estimate Declined",
                description: e.note,
                variant: "default",
              });

              notify(
                'admin_message',
                `ESTIMATE UPDATE: ${custName} - ${e.note}`,
                'Customer Web',
                { id: syncId, recordId: e.id, customerId: e.customer_id }
              );
              
              addedAny = true;
            }
          }

          if (addedAny) {
            refresh();
          }
        } catch (err) {
        console.warn("[AlertSync] Failed to poll bookings:", err);
      }
    };

    const interval = setInterval(syncBookings, 5000); // Check every 5s for snappy alerts
    syncBookings(); // Initial check
    return () => clearInterval(interval);
  }, [isEmployee, isFileManagerView, refresh]);

  // Priority: Yellow if ANY unread (easier to see), Red if 0 (matches user's screenshot requirement for 'nothing new')
  const bellColorClass = (displayUnreadCount > 0 || importantUnread > 0) ? "text-yellow-400" : "text-red-600";

  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative group">
          <Bell className={`h-6 w-6 transition-all duration-300 ${bellColorClass} ${ring ? 'animate-bounce scale-110' : 'group-hover:scale-110'}`} />
          {/* Show badge for ANY unread count with high-contrast red for urgency */}
          {(displayUnreadCount > 0 || importantUnread > 0) && (
            <Badge className="absolute -top-1 -right-1 bg-red-600 text-white font-bold border-2 border-black animate-in zoom-in duration-300">
              {displayUnreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-h-[80vh] overflow-y-auto">
        <div className="px-3 py-2 text-sm font-semibold border-b border-border">Alerts</div>
        {items.length === 0 ? (
          <div className="px-3 py-4 text-sm text-muted-foreground text-center">No new alerts</div>
        ) : (
          items.map(a => {
            const timeStr = a.timestamp ? (() => {
              const diff = Date.now() - new Date(a.timestamp).getTime();
              const mins = Math.floor(diff / 60000);
              const hrs = Math.floor(diff / 3600000);
              const days = Math.floor(diff / 86400000);
              if (mins < 1) return 'Just now';
              if (mins < 60) return `${mins}m ago`;
              if (hrs < 24) return `${hrs}h ago`;
              return `${days}d ago`;
            })() : null;

            if (a.isGroup) {
              return (
                <DropdownMenuItem key={a.id} className="flex flex-col items-start gap-2 p-3 border-b border-zinc-800/50 focus:bg-zinc-800 focus:text-white cursor-pointer group">
                  <div className="flex items-center justify-between w-full mb-1">
                    <div className="text-[11px] font-black uppercase tracking-wider text-emerald-500">{a.customerName}</div>
                    {timeStr && <div className="text-[10px] text-muted-foreground">{timeStr}</div>}
                  </div>
                  <div className="flex flex-col gap-2 w-full">
                    {a.alerts.map((alert: any) => (
                      <div key={alert.id} className="flex items-center justify-between w-full gap-2">
                        <div className="text-sm truncate text-zinc-300 group-hover:text-white flex-1">{alert.shortTitle}</div>
                        <div className="flex items-center gap-2">
                          <a
                            href={alert.href}
                            className="text-[10px] font-bold uppercase text-primary hover:text-white px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800"
                            onClick={() => { if (isEmployee) markEmployeeNotificationRead(alert.id); else markRead(alert.id); }}
                          >
                            Open
                          </a>
                          <button
                            className="text-[10px] text-zinc-500 hover:text-red-400"
                            onClick={(e) => {
                              e.preventDefault(); e.stopPropagation();
                              try { 
                                const dismissed = JSON.parse(localStorage.getItem('dismissed_alert_ids') || '[]');
                                dismissed.push(alert.id);
                                if (alert.payload?.bookingId) dismissed.push(String(alert.payload.bookingId));
                                if (alert.payload?.recordId) dismissed.push(String(alert.payload.recordId));
                                localStorage.setItem('dismissed_alert_ids', JSON.stringify(dismissed));
                                useAlertsStore.getState().dismiss(alert.id); 
                              } catch { }
                            }}
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </DropdownMenuItem>
              );
            }

            return (
              <DropdownMenuItem key={a.id} className="flex flex-col items-start gap-2 p-3 border-b border-border/50 focus:bg-zinc-800 focus:text-white cursor-pointer group">
                <div className="flex items-center justify-between w-full">
                  <div className="text-sm break-words flex-1 leading-relaxed group-hover:text-white">{a.title}</div>
                  {timeStr && (
                    <div className="text-[10px] text-muted-foreground ml-2 whitespace-nowrap">
                      {timeStr}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end w-full gap-3 mt-1">
                  <a
                    href={a.href}
                    className="text-xs font-medium text-primary hover:text-white hover:underline px-2 py-1 rounded hover:bg-primary transition-colors bg-zinc-900 border border-zinc-700"
                    onClick={() => { if (isEmployee) markEmployeeNotificationRead(a.id); else markRead(a.id); }}
                  >
                    Open
                  </a>
                  {!isEmployee && (
                    <button
                      className="text-xs text-muted-foreground hover:text-red-400 px-2 py-1 rounded hover:bg-zinc-900 transition-colors"
                      onClick={(e) => {
                        e.preventDefault(); e.stopPropagation();
                        try { 
                          const dismissed = JSON.parse(localStorage.getItem('dismissed_alert_ids') || '[]');
                          dismissed.push(a.id);
                          if (a.payload?.bookingId) dismissed.push(String(a.payload.bookingId));
                          if (a.payload?.recordId) dismissed.push(String(a.payload.recordId));
                          localStorage.setItem('dismissed_alert_ids', JSON.stringify(dismissed));
                          useAlertsStore.getState().dismiss(a.id); 
                        } catch { }
                      }}
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </DropdownMenuItem>
            );
          })
        )}
        <div className="px-3 py-2">
          {isEmployee ? (
            <Button variant="outline" size="sm" onClick={() => {
              try { markAllEmployeeNotificationsRead(employeeKeys[0]); } catch { }; try {
                const list = getEmployeeNotifications();
                const filtered = list.filter(n => employeeKeys.includes(String(n.employeeId || '').toLowerCase()));
                setEmpItems(filtered.map(n => ({ id: n.id, title: n.message, href: '/tasks', read: !!n.read })));
                setEmpUnreadCount(filtered.filter(n => !n.read).length);
              } catch (e) { }
              setOpen(false);
            }} className="w-full">Mark all read</Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => { 
              try {
                const dismissed = JSON.parse(localStorage.getItem('dismissed_alert_ids') || '[]');
                alerts.forEach(a => {
                  dismissed.push(a.id);
                  if (a.payload?.bookingId) dismissed.push(String(a.payload.bookingId));
                  if (a.payload?.recordId) dismissed.push(String(a.payload.recordId));
                });
                localStorage.setItem('dismissed_alert_ids', JSON.stringify(dismissed));
              } catch { }
              dismissAll(); 
              setOpen(false); 
            }} className="w-full">Dismiss all</Button>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
