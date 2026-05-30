import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { useBookingsStore, Booking } from "@/store/bookings";
import { useCouponsStore } from "@/store/coupons";
import { useFollowUpStore, FollowUpLog } from "@/store/followup";
import { getSupabaseCustomers, Customer } from "@/lib/supa-data";
import { RetentionHub } from "@/components/customers/RetentionHub";
import { 
  Bell, 
  Search, 
  Calendar, 
  Mail, 
  CheckCircle2, 
  Clock, 
  User, 
  Users,
  TrendingUp, 
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Send,
  MessageSquare,
  TicketPercent,
  Plus,
  ChevronRight,
  History,
  Activity,
  CalendarDays,
  Trash2,
  Users2,
  Zap,
  Star,
  Shield,
  RotateCcw,
  HelpCircle,
  ExternalLink,
  Eye,
  X
} from "lucide-react";
import { format, addMonths, isBefore, differenceInDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { onSendReminderEmail, onSendProspectEmail, CLIENT_CAMPAIGNS, PROSPECT_CAMPAIGNS, EmailCampaign } from "@/lib/bookingsSync";
import { toast } from "sonner";
import supabase from "@/lib/supabase";
import { SmartMissionWorkflow } from "@/components/followup/SmartMissionWorkflow";

export default function FollowUpCenter() {
  const { items: allBookings, update: updateBooking } = useBookingsStore();
  const { items: allCoupons, refresh: refreshCoupons } = useCouponsStore();
  const { logs, addLog, clearHistory, removeLog } = useFollowUpStore();
  
  const handleDeleteAuditLog = async (logId: string) => {
    if (!confirm("Are you sure you want to permanently delete this engagement record?")) return;
    try {
      if (!logId.startsWith('log_') && !logId.startsWith('db_')) {
        const { error } = await supabase.from('engagements').delete().eq('id', logId);
        if (error) throw error;
      }
      removeLog(logId);
      setDbLogs(prev => prev.filter(l => l.id !== logId));
      toast.success("Engagement record deleted.");
      loadDbLogs();
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete record.");
    }
  };
  
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [operationalMode, setOperationalMode] = useState<'mission' | 'manual'>('mission');
  const todayKey = new Date().toISOString().split('T')[0];
  const [dismissedMissions, setDismissedMissions] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`dismissed_missions_${todayKey}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const handleDismissMission = (id: string) => {
    setDismissedMissions(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem(`dismissed_missions_${todayKey}`, JSON.stringify(Array.from(next)));
      return next;
    });
    toast.success("Mission marked as complete/dismissed for today.");
  };
  const [prospects, setProspects] = useState<Customer[]>([]);
  const [loadingProspects, setLoadingProspects] = useState(false);
  const [dbLogs, setDbLogs] = useState<FollowUpLog[]>([]);
  const [loadingDbLogs, setLoadingDbLogs] = useState(false);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProspectDialogOpen, setIsProspectDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedProspect, setSelectedProspect] = useState<Customer | null>(null);
  const [customNote, setCustomNote] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [includeDiscount, setIncludeDiscount] = useState(false);
  const [selectedCouponId, setSelectedCouponId] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState<FollowUpLog | null>(null);

  // Load data on mount
  useEffect(() => {
    refreshCoupons();
    loadProspects();
    loadDbLogs();
  }, []);

  const loadProspects = async () => {
    setLoadingProspects(true);
    try {
      const all = await getSupabaseCustomers();
      const filtered = all.filter(c => c.type === 'prospect');
      setProspects(filtered);
    } catch (e) {
      console.error("Failed to load prospects", e);
    } finally {
      setLoadingProspects(false);
    }
  };

  const loadDbLogs = async () => {
    setLoadingDbLogs(true);
    try {
      const { data, error } = await supabase
        .from('engagements')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        const mapped: FollowUpLog[] = data.map((r: any) => ({
          id: r.id || `db_${r.created_at}_${Math.random()}`,
          customerEmail: r.customer_email || "",
          customerName: r.customer_name || "",
          dateSent: r.created_at,
          frequency: r.type === 'initial' ? 'Lead Outreach' : r.type === 'correspondence' ? 'Correspondence' : 'Client Retention',
          emailType: r.type === 'initial' ? 'prospect_intro' : r.type === 'correspondence' ? 'correspondence' : 'maintenance_reminder',
          customNote: r.note || undefined,
          couponCode: r.coupon_code || undefined
        }));
        setDbLogs(mapped);
      }
    } catch (e) {
      console.warn("Could not fetch database engagements:", e);
    } finally {
      setLoadingDbLogs(false);
    }
  };

  const activeCoupons = useMemo(() => allCoupons.filter(c => c.active), [allCoupons]);

  const combinedLogs = useMemo(() => {
    const all = [...logs, ...dbLogs];
    const unique = new Map<string, FollowUpLog>();
    all.forEach(log => {
      const date = new Date(log.dateSent);
      const roundedTime = Math.round(date.getTime() / 10000) * 10000;
      const key = `${(log.customerName || '').trim().toLowerCase()}_${(log.customerEmail || '').trim().toLowerCase()}_${roundedTime}`;
      unique.set(key, log);
    });
    return Array.from(unique.values()).sort((a, b) => {
      const nameCompare = (a.customerName || '').localeCompare(b.customerName || '');
      if (nameCompare !== 0) return nameCompare;
      return new Date(b.dateSent).getTime() - new Date(a.dateSent).getTime();
    });
  }, [logs, dbLogs]);

  // Group bookings by customer to find the LATEST service for each
  const customerFollowUps = useMemo(() => {
    const latestByCustomer: Record<string, Booking> = {};

    // Filter for completed/done bookings ONLY
    const completedBookings = allBookings.filter(b => b.status === 'done' || b.status === 'confirmed');

    completedBookings.forEach(booking => {
      if (!booking.customerEmail) return;
      const existing = latestByCustomer[booking.customerEmail];
      if (!existing || new Date(booking.date) > new Date(existing.date)) {
        latestByCustomer[booking.customerEmail] = booking;
      }
    });

    return Object.values(latestByCustomer).map(booking => {
      const lastService = new Date(booking.date);
      const freqValue = booking.reminderFrequency ?? "6"; // Use nullish coalescing
      
      // Handle "0" as Manual/Anytime
      if (Number(freqValue) === 0) {
          const targetDate = booking.customReminderDate ? new Date(booking.customReminderDate) : new Date();
          return {
              ...booking,
              lastServiceDate: lastService,
              dueDate: targetDate,
              isDue: isBefore(targetDate, new Date()), 
              daysRemaining: differenceInDays(targetDate, new Date()),
              frequencyLabel: 'Anytime / Manual',
              frequencyMonths: 0
          };
      }

      const frequency = parseInt(String(freqValue));
      const dueDate = addMonths(lastService, frequency);
      const isDue = isBefore(dueDate, new Date());
      const daysRemaining = differenceInDays(dueDate, new Date());
      
      const frequencyLabel = 
        frequency === 1 ? 'Monthly' :
        frequency === 2 ? 'Bi-Monthly' :
        frequency === 3 ? 'Quarterly' :
        frequency === 4 ? '4 Months' :
        frequency === 6 ? '6 Months' :
        frequency === 12 ? 'Yearly' :
        `${frequency} Months`;

      return {
        ...booking,
        lastServiceDate: lastService,
        dueDate,
        isDue,
        daysRemaining,
        frequencyLabel,
        frequencyMonths: frequency
      };
    }).sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [allBookings]);

  const handleUpdateCustomDate = async (customerId: string, newDate: string) => {
    const booking = allBookings.find(b => b.id === customerId);
    if (!booking) return;
    try {
      await updateBooking(customerId, { ...booking, customReminderDate: newDate });
      toast.success("Engagement date updated.");
    } catch (e) {
      toast.error("Failed to update date.");
    }
  };

  // Combined Search Filtering
  const filteredOpportunities = customerFollowUps.filter(c => 
    c.customer?.toLowerCase().includes(search.toLowerCase()) || 
    c.customerEmail?.toLowerCase().includes(search.toLowerCase()) ||
    c.title?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredProspects = prospects.filter(p => 
    p.name?.toLowerCase().includes(search.toLowerCase()) || 
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.vehicle?.toLowerCase().includes(search.toLowerCase()) ||
    p.notes?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCombinedLogs = combinedLogs.filter(log => 
    log.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    log.customerEmail?.toLowerCase().includes(search.toLowerCase()) ||
    log.emailType?.toLowerCase().includes(search.toLowerCase()) ||
    log.customNote?.toLowerCase().includes(search.toLowerCase()) ||
    log.couponCode?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: customerFollowUps.length,
    dueNow: customerFollowUps.filter(c => c.isDue).length,
    prospects: prospects.length,
    sentThisMonth: logs.filter(l => new Date(l.dateSent).getMonth() === new Date().getMonth()).length
  };

  const openFollowUpDialog = (customer: any) => {
    setSelectedCustomer(customer);
    setCustomNote("");
    setSelectedCampaignId("");
    setIncludeDiscount(false);
    setSelectedCouponId("");
    setIsDialogOpen(true);
  };

  const openProspectDialog = (prospect: Customer) => {
    setSelectedProspect(prospect);
    setCustomNote("");
    setSelectedCampaignId("");
    setIncludeDiscount(false);
    setSelectedCouponId("");
    setIsProspectDialogOpen(true);
  };

  const handleCampaignSelect = (campaignId: string, isProspect: boolean) => {
    setSelectedCampaignId(campaignId);
    const campaigns = isProspect ? PROSPECT_CAMPAIGNS : CLIENT_CAMPAIGNS;
    const campaign = campaigns.find(c => c.id === campaignId);
    if (campaign) {
      setCustomNote(campaign.defaultText);
      if (campaign.suggestedIncentive) {
        setIncludeDiscount(true);
        if (!selectedCouponId) {
          const active = allCoupons.filter(c => c.active);
          if (active.length > 0) {
            setSelectedCouponId(active[0].id);
          }
        }
      }
      toast.info(`Campaign Loaded: ${campaign.name}`);
    }
  };

  const executeFollowUp = async () => {
    if (!selectedCustomer) return;
    setIsSending(true);

    try {
      const coupon = activeCoupons.find(c => c.id === selectedCouponId);
      const discountLabel = coupon ? (coupon.percent ? `${coupon.percent}% OFF` : `$${coupon.amount} OFF`) : undefined;

      await onSendReminderEmail(selectedCustomer, selectedCustomer.frequencyLabel, {
        customNote: customNote.trim() || undefined,
        couponCode: includeDiscount ? coupon?.code : undefined,
        discountLabel: includeDiscount ? discountLabel : undefined
      });

      addLog({
        id: `log_${Date.now()}`,
        customerName: selectedCustomer.customer,
        customerEmail: selectedCustomer.customerEmail || "",
        dateSent: new Date().toISOString(),
        frequency: selectedCustomer.frequencyLabel,
        emailType: "maintenance_reminder",
        customNote: customNote.trim() || undefined,
        couponCode: includeDiscount ? coupon?.code : undefined
      });

      toast.success(`Professional follow-up sent to ${selectedCustomer.customer}!`);
      setIsDialogOpen(false);
      await loadDbLogs();
    } catch (e) {
      toast.error("Failed to send follow-up.");
    } finally {
      setIsSending(false);
    }
  };

  const executeProspectFollowUp = async () => {
    if (!selectedProspect) return;
    setIsSending(true);

    try {
      const coupon = activeCoupons.find(c => c.id === selectedCouponId);
      const discountLabel = coupon ? (coupon.percent ? `${coupon.percent}% OFF` : `$${coupon.amount} OFF`) : undefined;

      await onSendProspectEmail(selectedProspect, {
        customNote: customNote.trim() || undefined,
        couponCode: includeDiscount ? coupon?.code : undefined,
        discountLabel: includeDiscount ? discountLabel : undefined
      });

      addLog({
        id: `log_p_${Date.now()}`,
        customerName: selectedProspect.name,
        customerEmail: selectedProspect.email || "",
        dateSent: new Date().toISOString(),
        frequency: "Lead Outreach",
        emailType: "prospect_intro",
        customNote: customNote.trim() || undefined,
        couponCode: includeDiscount ? coupon?.code : undefined
      });

      toast.success(`Welcome intro sent to ${selectedProspect.name}!`);
      setIsProspectDialogOpen(false);
      await loadDbLogs();
    } catch (e) {
      toast.error("Failed to send prospect outreach.");
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateFrequency = async (customerId: string, newFreq: string) => {
    const booking = allBookings.find(b => b.id === customerId);
    if (!booking) return;
    try {
      await updateBooking(customerId, { ...booking, reminderFrequency: Number(newFreq) });
      toast.info("Maintenance schedule updated.");
    } catch (e) {
      toast.error("Failed to update schedule.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="container mx-auto px-4 md:pr-[70px] lg:pr-4 pt-2 pb-12 -mt-12">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                  <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 fill-blue-500" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter leading-none italic">
                    Retention <span className="text-blue-500">Hub</span>
                  </h1>
                  <p className="text-zinc-500 font-bold uppercase tracking-widest text-[9px] sm:text-[10px] mt-1.5 flex items-center gap-2">
                    <ShieldCheck className="h-3 w-3" /> Professional Growth Engine
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: 'retention-hub' }))}
                  className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 hover:text-emerald-400 group h-10 text-xs flex-1 sm:flex-none"
                >
                  <HelpCircle className="mr-2 h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  Hub Guide
                </Button>
               
               <Button 
                 variant="outline" 
                 onClick={loadProspects}
                 className="bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 border-zinc-800 font-bold uppercase tracking-tight h-10 rounded-xl text-xs flex-1 sm:flex-none"
               >
                 <RotateCcw className={cn("mr-2 h-4 w-4", loadingProspects && "animate-spin")} />
                 Sync All
               </Button>
               
               <Button 
                 variant="outline" 
                 onClick={() => window.location.href = '/letter-maker'}
                 className="bg-purple-900/20 hover:bg-purple-900/40 text-purple-400 border-purple-500/30 font-bold uppercase tracking-tight h-10 rounded-xl text-xs flex-1 sm:flex-none"
               >
                 <Mail className="mr-2 h-4 w-4" />
                 Free-Form Letter
               </Button>

               <div className="hidden lg:block h-8 w-[1px] bg-zinc-800 mx-2" />

               <Button 
                 variant="ghost" 
                 size="icon"
                 onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: 'retention-hub' }))}
                 className="hidden sm:flex text-zinc-600 hover:text-white transition-all group"
                 title="Help Guide"
               >
                 <HelpCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
               </Button>
            </div>
        </div>

        <div className="w-full flex justify-center mb-12">
          <div className="bg-zinc-950 border-2 border-zinc-800 p-2 rounded-2xl sm:rounded-full flex flex-col sm:flex-row gap-2 shadow-2xl w-full max-w-2xl">
            <button
              onClick={() => setOperationalMode('mission')}
              className={cn(
                "flex-1 px-6 py-4 rounded-xl sm:rounded-full text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2",
                operationalMode === 'mission' 
                  ? "bg-blue-600 text-white shadow-[0_0_30px_rgba(37,99,235,0.4)]" 
                  : "bg-zinc-900 text-zinc-500 hover:text-white hover:bg-zinc-800"
              )}
            >
              <Zap className="h-4 w-4" /> Smart Mission Workflow
            </button>
            <button
              onClick={() => setOperationalMode('manual')}
              className={cn(
                "flex-1 px-6 py-4 rounded-xl sm:rounded-full text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2",
                operationalMode === 'manual' 
                  ? "bg-zinc-700 text-white shadow-xl" 
                  : "bg-zinc-900 text-zinc-500 hover:text-white hover:bg-zinc-800"
              )}
            >
              <Users className="h-4 w-4" /> Manual CRM Workspace
            </button>
          </div>
        </div>

        {operationalMode === 'mission' ? (
          <SmartMissionWorkflow 
            customerFollowUps={customerFollowUps.filter(c => !dismissedMissions.has(`cust_${c.id}`))} 
            prospects={prospects.filter(p => !dismissedMissions.has(`prospect_${p.id}`))} 
            allBookings={allBookings}
            onOpenFollowUp={openFollowUpDialog}
            onOpenProspect={openProspectDialog}
            onMarkComplete={handleDismissMission}
          />
        ) : (
      <Tabs defaultValue="opportunities" className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="w-full">
          <TabsList className="bg-zinc-900 border-2 border-zinc-800 p-1.5 rounded-[1.5rem] sm:rounded-3xl h-auto flex flex-col sm:flex-row w-full sm:w-fit backdrop-blur-3xl shadow-2xl gap-2 mb-8 mx-auto">
            <TabsTrigger value="opportunities" className="rounded-xl sm:rounded-2xl px-6 sm:px-10 font-black uppercase tracking-[0.2em] text-[10px] sm:text-[11px] h-14 sm:h-16 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center sm:justify-start gap-3 w-full">
               <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
               Client Retention
               <Badge className="bg-black/40 text-blue-400 border-none font-black text-[10px] px-2.5 py-1 rounded-lg">{stats.dueNow}</Badge>
            </TabsTrigger>
            <TabsTrigger value="prospects" className="rounded-xl sm:rounded-2xl px-6 sm:px-10 font-black uppercase tracking-[0.2em] text-[10px] sm:text-[11px] h-14 sm:h-16 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_30px_rgba(147,51,234,0.4)] transition-all flex items-center justify-center sm:justify-start gap-3 w-full">
               <Users2 className="h-4 w-4 sm:h-5 sm:w-5" />
               Potential Leads
               <Badge className="bg-black/40 text-purple-400 border-none font-black text-[10px] px-2.5 py-1 rounded-lg">{stats.prospects}</Badge>
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl sm:rounded-2xl px-6 sm:px-10 font-black uppercase tracking-[0.2em] text-[10px] sm:text-[11px] h-14 sm:h-16 data-[state=active]:bg-zinc-800 data-[state=active]:text-white transition-all flex items-center justify-center sm:justify-start gap-3 w-full">
               <History className="h-4 w-4 sm:h-5 sm:w-5" />
               Engagement History
            </TabsTrigger>
          </TabsList>
        </div>

        {/* SEARCH BAR (FIXED AT TOP OF ALL TABS) */}
        <div className="relative max-w-4xl">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl sm:rounded-[2.5rem] blur opacity-25" />
          <Search className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 text-zinc-500 z-10" />
          <Input 
            placeholder="SEARCH: EMAILS, NAMES, VEHICLES..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 sm:pl-16 pr-12 sm:pr-16 bg-zinc-900/80 border-zinc-800/50 h-14 sm:h-20 rounded-2xl sm:rounded-[2.5rem] text-sm sm:text-xl font-black placeholder:text-zinc-700 placeholder:uppercase focus:ring-blue-500/20 focus:bg-zinc-900 focus:border-blue-500/40 transition-all border-2 relative z-10"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors z-20"
            >
              <X className="h-6 w-6 sm:h-8 sm:w-8" />
            </button>
          )}
        </div>

        <TabsContent value="opportunities" className="mt-0 outline-none">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <Card className="bg-zinc-900/40 border-zinc-800 border-l-[6px] border-l-blue-500 backdrop-blur-3xl shadow-2xl group overflow-hidden relative">
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl rounded-full" />
               <CardContent className="pt-8 pb-8 px-8">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Service Network</p>
                    <Users className="h-5 w-5 text-blue-500 group-hover:scale-125 transition-transform" />
                  </div>
                  <div className="flex items-end gap-3">
                    <span className="text-4xl font-black leading-none">{stats.total}</span>
                    <span className="text-zinc-500 text-[11px] font-black uppercase mb-1 opacity-60">Verified Active Clients</span>
                  </div>
               </CardContent>
            </Card>

            <Card className="bg-zinc-900/40 border-zinc-800 backdrop-blur-3xl shadow-2xl border-l-[6px] border-l-red-500 group overflow-hidden relative">
               <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 blur-3xl rounded-full" />
               <CardContent className="pt-8 pb-8 px-8">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Retention Alerts</p>
                    <Clock className="h-5 w-5 text-red-500 group-hover:animate-pulse" />
                  </div>
                  <div className="flex items-end gap-3">
                    <span className="text-4xl font-black text-red-500 leading-none">{stats.dueNow}</span>
                    <span className="text-zinc-500 text-[11px] font-black uppercase mb-1 italic text-red-500/80">Require Strategic Precise Tasking</span>
                  </div>
               </CardContent>
            </Card>

            <Card className="bg-zinc-900/40 border-zinc-800 backdrop-blur-3xl shadow-2xl group border-l-[6px] border-l-emerald-500 overflow-hidden relative">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 blur-3xl rounded-full" />
               <CardContent className="pt-8 pb-8 px-8">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Monthly Success</p>
                    <Star className="h-5 w-5 text-emerald-400 fill-emerald-400/20" />
                  </div>
                  <div className="flex items-end gap-3">
                    <span className="text-4xl font-black text-emerald-500 leading-none">{stats.sentThisMonth}</span>
                    <span className="text-zinc-500 text-[11px] font-black uppercase mb-1">Total Outreach Conversions</span>
                  </div>
               </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {filteredOpportunities.length > 0 ? (
              filteredOpportunities.map((customer) => (
                <div 
                  key={customer.id} 
                  className={cn(
                    "group relative overflow-hidden bg-zinc-900/30 border border-zinc-800/50 rounded-3xl sm:rounded-[3.5rem] p-6 sm:p-10 transition-all hover:bg-zinc-900/60 hover:border-zinc-700 shadow-xl",
                    customer.isDue && "border-l-4 sm:border-l-8 border-l-red-500/60"
                  )}
                >
                   <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 relative z-10">
                      <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-10">
                         <div className={cn(
                           "h-16 w-16 sm:h-24 sm:w-24 rounded-2xl sm:rounded-[2rem] flex items-center justify-center border-2 transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 shadow-2xl shrink-0",
                           customer.isDue 
                             ? "bg-red-500/10 border-red-500/20 text-red-500 shadow-red-900/10" 
                             : "bg-blue-500/10 border-blue-500/20 text-blue-500 shadow-blue-900/10"
                         )}>
                            <User className={cn("h-8 w-8 sm:h-12 sm:w-12", customer.isDue && "animate-pulse")} />
                         </div>
                         
                         <div className="space-y-3 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                               <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter italic truncate">{customer.customer}</h3>
                               {customer.isDue && (
                                 <Badge className="bg-red-600 text-white text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border-none shadow-[0_0_20px_rgba(239,68,68,0.4)]">DUE</Badge>
                               )}
                            </div>
                            <p className="text-zinc-500 font-bold text-sm sm:text-base tracking-tight flex items-center gap-2 truncate">
                                <Mail className="h-3.5 w-3.5 opacity-50 text-blue-500 shrink-0" /> {customer.customerEmail}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 sm:gap-5 mt-4 sm:mt-6">
                               <div className="flex items-center gap-2 text-[9px] font-black text-zinc-300 uppercase tracking-widest bg-zinc-800/80 px-4 py-2 rounded-xl border border-zinc-700/50 shadow-lg">
                                  <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                                  Last: {customer.title}
                               </div>
                               <div className="flex items-center gap-2 text-[9px] font-black text-zinc-300 uppercase tracking-widest bg-zinc-800/80 px-4 py-2 rounded-xl border border-zinc-700/50 shadow-lg">
                                  <CalendarDays className="h-3.5 w-3.5 text-emerald-500" />
                                  {format(customer.lastServiceDate, 'MMM dd, yyyy')}
                               </div>
                               
                               <div className="flex items-center gap-3 px-4 py-1.5 bg-zinc-950/80 border-2 border-zinc-800 rounded-xl shadow-inner group/select">
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.15em]">Freq:</span>
                                <Select 
                                 value={String(customer.frequencyMonths)} 
                                 onValueChange={(v) => handleUpdateFrequency(customer.id, v)}
                                >
                                  <SelectTrigger className="h-7 w-32 border-0 bg-transparent text-blue-400 p-0 focus:ring-0 text-[11px] font-black uppercase tracking-[0.1em] hover:text-white transition-colors">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-zinc-900 border-2 border-zinc-800 text-zinc-200 rounded-xl shadow-2xl">
                                    <SelectItem value="0" className="font-black text-amber-500">Anytime</SelectItem>
                                    <SelectItem value="1">Monthly</SelectItem>
                                    <SelectItem value="2">Bi-Monthly</SelectItem>
                                    <SelectItem value="3">Quarterly</SelectItem>
                                    <SelectItem value="4">4 Months</SelectItem>
                                    <SelectItem value="6">6 Months</SelectItem>
                                    <SelectItem value="12">Yearly</SelectItem>
                                  </SelectContent>
                                </Select>
                               </div>
                            </div>
                         </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-8 xl:gap-12 w-full xl:w-auto">
                         <div className="text-center sm:text-right flex flex-col items-center sm:items-end w-full sm:w-auto">
                            <p className="text-[9px] uppercase font-black tracking-[0.2em] text-zinc-500 mb-2">Target Date:</p>
                            {Number(customer.frequencyMonths) === 0 ? (
                               <div className="space-y-2 flex flex-col items-center sm:items-end">
                                 <Input 
                                   type="date"
                                   value={customer.customReminderDate ? customer.customReminderDate.split('T')[0] : new Date().toISOString().split('T')[0]}
                                   onChange={(e) => handleUpdateCustomDate(customer.id, new Date(e.target.value).toISOString())}
                                   className="h-10 w-44 bg-zinc-950 border-2 border-zinc-800 text-amber-400 font-black text-xs rounded-xl focus:ring-amber-500/20 text-center uppercase shadow-lg border-amber-500/10"
                                 />
                                 <p className="text-[9px] text-amber-500/60 font-black uppercase tracking-[0.2em]">Manual Override</p>
                               </div>
                            ) : (
                               <>
                                 <p className={cn(
                                   "text-3xl sm:text-4xl font-black tracking-tighter leading-none mb-1.5",
                                   customer.isDue ? "text-red-500" : "text-white"
                                 )}>
                                    {format(customer.dueDate, 'MMM dd, yyyy')}
                                 </p>
                                 <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest italic">
                                    {customer.isDue 
                                      ? `${Math.abs(customer.daysRemaining)} Days Lagging` 
                                      : `${customer.daysRemaining} Days Until Due`}
                                 </p>
                               </>
                            )}
                         </div>

                         <Button 
                           onClick={() => openFollowUpDialog(customer)}
                           className={cn(
                             "h-14 sm:h-16 w-full sm:w-auto px-8 sm:px-10 rounded-2xl sm:rounded-[1.25rem] font-black uppercase tracking-tighter transition-all hover:scale-105 active:scale-95 text-base sm:text-lg shadow-2xl",
                             customer.isDue 
                               ? "bg-red-600 hover:bg-red-700 text-white shadow-red-900/30" 
                               : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/30"
                           )}
                         >
                            Outreach
                            <ArrowRight className="ml-2 sm:ml-3 h-5 w-5 sm:h-6 sm:w-6" />
                         </Button>
                      </div>
                   </div>
                </div>
              ))
            ) : (
              <div className="py-32 text-center border-4 border-dashed border-zinc-900 rounded-[4rem]">
                 <Shield className="h-20 w-20 text-zinc-900 mx-auto mb-6" />
                 <h2 className="text-3xl font-black text-zinc-800 uppercase italic">No Retention Targets Found</h2>
                 <p className="text-zinc-600 mt-4 max-w-sm mx-auto text-lg font-bold uppercase tracking-tight opacity-40">All regular clients are within their maintenance protection window.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="prospects" className="mt-0">
          <div className="mb-10 p-8 bg-purple-600/5 border border-purple-600/10 rounded-[3rem] flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="flex items-center gap-6">
                <div className="h-20 w-20 bg-purple-600/10 border-2 border-purple-600/20 rounded-[2rem] flex items-center justify-center">
                   <Users2 className="h-10 w-10 text-purple-500" />
                </div>
                <div>
                   <h2 className="text-3xl font-black uppercase tracking-tighter italic">Prospect <span className="text-purple-500">Nurturing</span></h2>
                   <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest mt-1">Convert potential interest into booked services</p>
                </div>
             </div>
             <div className="bg-purple-600/10 px-8 py-3 rounded-2xl border border-purple-600/20">
                <span className="text-3xl font-black text-purple-500">{stats.prospects}</span>
                <span className="text-[10px] font-black uppercase text-purple-400/60 ml-3 tracking-widest">Active Leads</span>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredProspects.length > 0 ? (
              filteredProspects.map((prospect) => (
                <div 
                  key={prospect.id} 
                  className="group relative bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-8 transition-all hover:bg-zinc-900/60 hover:border-purple-500/30"
                >
                   <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-5">
                         <div className="h-16 w-16 bg-zinc-950 border-2 border-zinc-800 rounded-2xl flex items-center justify-center group-hover:bg-purple-600/10 group-hover:border-purple-500/20 transition-all">
                            <User className="h-8 w-8 text-purple-400" />
                         </div>
                         <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">{prospect.name}</h3>
                            <p className="text-zinc-500 text-sm font-bold">{prospect.email || 'No Email Logged'}</p>
                         </div>
                      </div>
                      <Badge className="bg-purple-900/30 text-purple-400 font-black uppercase text-[9px] tracking-widest border border-purple-900/50">LEAD</Badge>
                   </div>

                   <div className="mt-8 grid grid-cols-2 gap-4">
                      <div className="bg-black/40 p-4 rounded-2xl border border-zinc-800/50">
                         <p className="text-[10px] font-black text-zinc-600 uppercase mb-1">Inquiry Vehicle</p>
                         <p className="text-sm font-black text-zinc-300">
                             {typeof prospect.vehicle === 'string' && prospect.vehicle ? prospect.vehicle : 
                              (typeof prospect.vehicle_info === 'object' && prospect.vehicle_info 
                                ? `${prospect.vehicle_info.year || ''} ${prospect.vehicle_info.make || ''} ${prospect.vehicle_info.model || ''}`.trim() || 'Not Specified'
                                : (prospect.vehicle_info || 'Not Specified'))}
                         </p>
                      </div>
                      <div className="bg-black/40 p-4 rounded-2xl border border-zinc-800/50">
                         <p className="text-[10px] font-black text-zinc-600 uppercase mb-1">Source</p>
                         <p className="text-sm font-black text-zinc-300 uppercase tracking-tight">{prospect.howFound || 'Direct'}</p>
                      </div>
                   </div>

                   {prospect.notes && (
                     <div className="mt-6 p-4 bg-purple-500/5 border border-purple-500/10 rounded-2xl italic text-zinc-400 text-sm line-clamp-2">
                        "{prospect.notes}"
                     </div>
                   )}

                   <div className="mt-8 pt-8 border-t border-zinc-800/50 flex items-center justify-between">
                      <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Ready for first intro?</p>
                      <Button 
                        onClick={() => openProspectDialog(prospect)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-widest text-[10px] h-11 px-6 rounded-xl transition-all hover:scale-105 active:scale-95"
                      >
                         Send Welcome Offer
                      </Button>
                   </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 py-32 text-center border-4 border-dashed border-zinc-900 rounded-[4rem]">
                 <Users2 className="h-20 w-20 text-zinc-900 mx-auto mb-6 opacity-20" />
                 <h2 className="text-3xl font-black text-zinc-800 uppercase italic">No Active Prospects</h2>
                 <p className="text-zinc-600 mt-4 max-w-sm mx-auto text-lg font-bold uppercase tracking-tight opacity-40">Add new leads in the Prospects section to start nurturing them.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <Card className="bg-zinc-900/40 border-zinc-800 rounded-[3rem] overflow-hidden backdrop-blur-xl border-t-2">
             <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 p-10">
                <div>
                   <CardTitle className="text-2xl font-black uppercase tracking-tighter italic">Engagement <span className="text-emerald-500">Audit Trail</span></CardTitle>
                   <CardDescription className="text-zinc-500 text-sm font-medium">Chronological record of all professional retention efforts.</CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { if(confirm("Permanently clear dispatch history?")) clearHistory(); }}
                  className="text-zinc-600 hover:text-red-400 font-black uppercase tracking-[0.2em] text-[10px]"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Reset Log
                </Button>
             </CardHeader>
             <CardContent className="p-0">
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-zinc-950/80 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500 border-b border-zinc-800">
                           <th className="px-4 py-6">Recipient & Contact</th>
                           <th className="px-4 py-6 text-center">Dispatch Time</th>
                           <th className="px-4 py-6 text-center">Engagement Type</th>
                           <th className="px-4 py-6 text-center">Loyalty Code</th>
                           <th className="px-4 py-6 text-center">Audit Log</th>
                           <th className="px-4 py-6 text-right">Verification</th>
                        </tr>
                     </thead>
                      <tbody className="divide-y divide-zinc-900/60">
                         {filteredCombinedLogs.length > 0 ? filteredCombinedLogs.map(log => (
                            <tr key={log.id} className="group hover:bg-zinc-800/30 transition-all duration-300">
                               <td className="px-4 py-7">
                                  <p className="text-base font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{log.customerName}</p>
                                  <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest mt-1 opacity-70">{log.customerEmail}</p>
                                  {log.id.startsWith("db_") && (
                                     <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest">
                                        Cloud Synced
                                     </span>
                                  )}
                               </td>
                               <td className="px-4 py-7 text-center">
                                  <Badge variant="outline" className="bg-zinc-950 border-zinc-800 text-zinc-400 font-black text-[9px] px-3 py-1">
                                     {format(new Date(log.dateSent), 'MMM dd, h:mm a')}
                                  </Badge>
                               </td>
                               <td className="px-4 py-7 text-center">
                                  <span className={cn("text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border",
                                     log.emailType === 'prospect_intro' ? "text-purple-400 border-purple-500/20 bg-purple-500/5" : log.emailType === 'correspondence' ? "text-amber-400 border-amber-500/20 bg-amber-500/5" : "text-blue-400 border-blue-500/20 bg-blue-500/5"
                                  )}>
                                     {log.emailType === 'prospect_intro' ? 'PROSPECT NURTURING' : log.emailType === 'correspondence' ? 'CORRESPONDENCE' : 'CLIENT RETENTION'}
                                  </span>
                               </td>
                               <td className="px-4 py-7 text-center">
                                  {log.couponCode ? (
                                     <span className="font-mono text-[11px] font-black text-emerald-500 bg-emerald-500/10 px-4 py-1.5 rounded-lg border border-emerald-500/20 uppercase tracking-tighter">
                                        {log.couponCode}
                                     </span>
                                  ) : <span className="text-zinc-800 font-black">STANDARD_DISPATCH</span>}
                               </td>
                               <td className="px-4 py-7 text-center">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => setSelectedAuditLog(log)}
                                    className="h-9 w-9 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all"
                                    title="View Detailed Preview Card"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                               </td>
                               <td className="px-4 py-7 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                     {log.customNote ? (
                                        <Dialog>
                                           <DialogTrigger asChild>
                                              <Button variant="ghost" size="sm" className="h-10 border border-zinc-800 hover:scale-105 active:scale-95 text-blue-500 hover:text-blue-400 text-[10px] font-black tracking-widest uppercase rounded-xl">
                                                 View Message
                                              </Button>
                                           </DialogTrigger>
                                           <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-sm rounded-[3rem] p-10">
                                              <DialogHeader>
                                                 <DialogTitle className="text-xs uppercase font-black tracking-[0.2em] text-zinc-500 mb-6 underline decoration-blue-500 decoration-4 underline-offset-8">Dispatched Note</DialogTitle>
                                              </DialogHeader>
                                              <div className="bg-zinc-900/50 p-8 rounded-[2rem] font-bold italic text-xl border-2 border-zinc-800 text-blue-200/90 leading-relaxed">
                                                 "{log.customNote}"
                                              </div>
                                           </DialogContent>
                                        </Dialog>
                                     ) : <span className="text-zinc-700 text-[10px] font-black uppercase italic tracking-widest opacity-30">PRO_TEMPLATE_V1</span>}
                                     
                                     <Button 
                                       variant="ghost" 
                                       size="icon" 
                                       onClick={() => handleDeleteAuditLog(log.id)}
                                       className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 rounded-xl transition-all"
                                     >
                                       <Trash2 className="h-4 w-4" />
                                     </Button>
                                  </div>
                               </td>
                            </tr>
                         )) : (
                            <tr>
                               <td colSpan={6} className="px-10 py-24 text-center">
                                  <History className="h-16 w-16 text-zinc-900 mx-auto mb-4 opacity-20" />
                                  <p className="text-zinc-600 font-black uppercase tracking-[0.3em] text-[11px]">Audit Cache Depleted</p>
                                  {loadingDbLogs && <p className="text-zinc-500 text-xs mt-2 uppercase font-black animate-pulse">Syncing Cloud Ledger...</p>}
                               </td>
                            </tr>
                         )}
                      </tbody>
                  </table>
                </div>

                <div className="lg:hidden flex flex-col divide-y divide-zinc-900/60">
                  {filteredCombinedLogs.length > 0 ? filteredCombinedLogs.map(log => (
                    <div key={log.id} className="p-6 flex flex-col gap-4 group hover:bg-zinc-800/30 transition-all">
                       <div className="flex items-start justify-between">
                          <div>
                             <p className="text-base font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{log.customerName}</p>
                             <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest mt-1 opacity-70">{log.customerEmail}</p>
                          </div>
                          <Badge variant="outline" className="bg-zinc-950 border-zinc-800 text-zinc-400 font-black text-[9px] px-3 py-1 h-fit">
                             {format(new Date(log.dateSent), 'MMM dd, h:mm a')}
                          </Badge>
                       </div>
                       
                       <div className="flex flex-wrap gap-2 items-center">
                          <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
                              log.emailType === 'prospect_intro' ? "text-purple-400 border-purple-500/20 bg-purple-500/5" : log.emailType === 'correspondence' ? "text-amber-400 border-amber-500/20 bg-amber-500/5" : "text-blue-400 border-blue-500/20 bg-blue-500/5"
                           )}>
                              {log.emailType === 'prospect_intro' ? 'PROSPECT NURTURING' : log.emailType === 'correspondence' ? 'CORRESPONDENCE' : 'CLIENT RETENTION'}
                           </span>
                          {log.couponCode && (
                             <span className="font-mono text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20 uppercase tracking-tighter">
                                {log.couponCode}
                             </span>
                          )}
                          {log.id.startsWith("db_") && (
                             <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest">
                                Cloud
                             </span>
                          )}
                       </div>

                       <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => setSelectedAuditLog(log)}
                            className="h-8 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg text-[10px] font-black uppercase tracking-widest"
                          >
                            <Eye className="h-3 w-3 mr-2" /> Card
                          </Button>
                          
                          <div className="flex items-center gap-2">
                            {log.customNote ? (
                               <Dialog>
                                  <DialogTrigger asChild>
                                     <Button variant="ghost" size="sm" className="h-8 border border-zinc-800 text-blue-500 hover:text-blue-400 text-[9px] font-black tracking-widest uppercase rounded-lg">
                                        View Msg
                                     </Button>
                                  </DialogTrigger>
                                  <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-sm rounded-[3rem] p-10">
                                     <DialogHeader>
                                        <DialogTitle className="text-xs uppercase font-black tracking-[0.2em] text-zinc-500 mb-6 underline decoration-blue-500 decoration-4 underline-offset-8">Dispatched Note</DialogTitle>
                                     </DialogHeader>
                                     <div className="bg-zinc-900/50 p-8 rounded-[2rem] font-bold italic text-xl border-2 border-zinc-800 text-blue-200/90 leading-relaxed">
                                        "{log.customNote}"
                                     </div>
                                  </DialogContent>
                               </Dialog>
                            ) : <span className="text-zinc-700 text-[9px] font-black uppercase italic tracking-widest opacity-30">PRO_V1</span>}
                            
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteAuditLog(log.id)}
                              className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 rounded-lg transition-all"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                       </div>
                    </div>
                  )) : (
                    <div className="p-16 text-center">
                      <History className="h-12 w-12 text-zinc-900 mx-auto mb-4 opacity-20" />
                      <p className="text-zinc-600 font-black uppercase tracking-[0.2em] text-[10px]">Audit Cache Depleted</p>
                      {loadingDbLogs && <p className="text-zinc-500 text-xs mt-2 uppercase font-black animate-pulse">Syncing Cloud Ledger...</p>}
                    </div>
                  )}
                </div>
             </CardContent>
          </Card>
        </TabsContent>

      {/* CLIENT RETENTION DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-3xl rounded-[2rem] p-0 overflow-hidden max-h-[85vh] flex flex-col">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] pointer-events-none" />
          <DialogHeader className="p-6 border-b border-zinc-900 bg-zinc-900/50 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600/10 rounded-xl border border-blue-600/20">
                <Mail className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black uppercase tracking-tight italic">Relationship CRM Hub</DialogTitle>
                <DialogDescription className="text-zinc-500 font-bold uppercase tracking-widest text-[9px] mt-1">Direct Outreach & Unified History — {selectedCustomer?.customer}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            {selectedCustomer && (
              <RetentionHub 
                customer={{
                  id: selectedCustomer.customerId || selectedCustomer.customer_id || selectedCustomer.id,
                  name: selectedCustomer.customer || 'Unknown',
                  email: selectedCustomer.customerEmail || '',
                  phone: selectedCustomer.customerPhone || '',
                  type: 'customer',
                  notes: selectedCustomer.notes || ''
                }}
                onRefresh={() => {
                  setIsDialogOpen(false);
                  loadProspects(); // refresh data
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* PROSPECT NURTURING DIALOG */}
      <Dialog open={isProspectDialogOpen} onOpenChange={setIsProspectDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-3xl rounded-[2rem] p-0 overflow-hidden max-h-[85vh] flex flex-col">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 blur-[100px] pointer-events-none" />
          <DialogHeader className="p-6 border-b border-zinc-900 bg-zinc-900/50 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-600/10 rounded-xl border border-purple-600/20">
                <Users2 className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black uppercase tracking-tight italic">Prospect CRM Hub</DialogTitle>
                <DialogDescription className="text-zinc-500 font-bold uppercase tracking-widest text-[9px] mt-1">Lead Conversion & Unified History — {selectedProspect?.name}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            {selectedProspect && (
              <RetentionHub 
                customer={{
                  id: selectedProspect.id,
                  name: selectedProspect.name || 'Unknown',
                  email: selectedProspect.email || '',
                  phone: selectedProspect.phone || '',
                  type: 'prospect',
                  notes: selectedProspect.notes || ''
                }}
                onRefresh={() => {
                  setIsProspectDialogOpen(false);
                  loadProspects(); // refresh data
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* DETAILED AUDIT PREVIEW CARD DIALOG */}
      <Dialog open={selectedAuditLog !== null} onOpenChange={(open) => { if(!open) setSelectedAuditLog(null); }}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-2xl rounded-[3rem] p-10 overflow-hidden relative shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/5 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 blur-[120px] pointer-events-none" />
          
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-emerald-600/10 rounded-2xl border border-emerald-600/20">
                <Eye className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-3xl font-black uppercase tracking-tighter italic">Engagement Audit Card</DialogTitle>
                <DialogDescription className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mt-1">Chronological System Registry Log</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedAuditLog && (
            <div className="space-y-6 relative z-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/80">
                  <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider block mb-1">Customer / Recipient</span>
                  <span className="text-base font-black text-white uppercase tracking-tight block truncate">{selectedAuditLog.customerName}</span>
                  <span className="text-[11px] text-zinc-400 font-medium block truncate mt-0.5">{selectedAuditLog.customerEmail}</span>
                </div>
                
                <div className="bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/80">
                  <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider block mb-1">Dispatch Timestamp</span>
                  <span className="text-base font-black text-white uppercase tracking-tight block">
                    {format(new Date(selectedAuditLog.dateSent), 'MMM dd, yyyy')}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-medium block mt-0.5">
                    {format(new Date(selectedAuditLog.dateSent), 'h:mm a · OOOO')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/80">
                  <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider block mb-1">Engagement Strategy</span>
                  <span className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded border shadow-sm",
                    selectedAuditLog.emailType === 'prospect_intro' ? "text-purple-400 border-purple-500/20 bg-purple-500/5" : selectedAuditLog.emailType === 'correspondence' ? "text-amber-400 border-amber-500/20 bg-amber-500/5" : "text-blue-400 border-blue-500/20 bg-blue-500/5"
                  )}>
                    {selectedAuditLog.emailType === 'prospect_intro' ? 'PROSPECT NURTURING' : selectedAuditLog.emailType === 'correspondence' ? 'CORRESPONDENCE' : 'CLIENT RETENTION'}
                  </span>
                </div>

                <div className="bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/80">
                  <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider block mb-1">Voucher Incentive</span>
                  {selectedAuditLog.couponCode ? (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded border border-emerald-500/20 uppercase tracking-tighter">
                        {selectedAuditLog.couponCode}
                      </span>
                    </div>
                  ) : (
                    <span className="text-zinc-600 text-xs font-black uppercase tracking-widest italic block mt-1">Standard dispatch</span>
                  )}
                </div>
              </div>

              <div className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800/80 space-y-2">
                <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider block">Dispatched Message Body</span>
                <div className="bg-zinc-950/80 border border-zinc-800 p-5 rounded-xl text-zinc-200 text-sm font-semibold italic leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {selectedAuditLog.customNote ? `"${selectedAuditLog.customNote}"` : `No custom note. Dispatched using professional standard ${selectedAuditLog.emailType === 'prospect_intro' ? 'lead follow-up' : 'maintenance reminder'} template (V1).`}
                </div>
              </div>

              <div className="bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/80 flex items-center justify-between text-[10px] uppercase font-black">
                <div className="flex items-center gap-2 text-zinc-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Audit Status: Verified Secure
                </div>
                <div className="text-zinc-600">
                  ID: {selectedAuditLog.id}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-8 border-t border-zinc-800/50 pt-6 flex justify-between items-center w-full">
            <Button 
              variant="outline" 
              onClick={() => {
                if (selectedAuditLog) {
                  const search = encodeURIComponent(selectedAuditLog.customerName);
                  window.open(`/file-manager?search=${search}`, '_blank');
                }
              }}
              className="border-zinc-800 hover:bg-zinc-900 text-zinc-400 text-[10px] font-black uppercase tracking-widest rounded-xl"
            >
              <ExternalLink className="h-4 w-4 mr-2" /> View Archived File
            </Button>
            <Button 
              onClick={() => setSelectedAuditLog(null)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl px-6 h-10"
            >
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </Tabs>
      )}
      </main>
    </div>
  );
}
