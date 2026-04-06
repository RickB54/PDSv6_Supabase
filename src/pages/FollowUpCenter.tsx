import { useState, useMemo, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { useBookingsStore, Booking } from "@/store/bookings";
import { useCouponsStore } from "@/store/coupons";
import { useFollowUpStore, FollowUpLog } from "@/store/followup";
import { getSupabaseCustomers, Customer } from "@/lib/supa-data";
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
  Eye
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
import { onSendReminderEmail, onSendProspectEmail } from "@/lib/bookingsSync";
import { toast } from "sonner";

export default function FollowUpCenter() {
  const { items: allBookings, update: updateBooking } = useBookingsStore();
  const { items: allCoupons, refresh: refreshCoupons } = useCouponsStore();
  const { logs, addLog, clearHistory } = useFollowUpStore();
  
  const [search, setSearch] = useState("");
  const [prospects, setProspects] = useState<Customer[]>([]);
  const [loadingProspects, setLoadingProspects] = useState(false);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProspectDialogOpen, setIsProspectDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedProspect, setSelectedProspect] = useState<Customer | null>(null);
  const [customNote, setCustomNote] = useState("");
  const [includeDiscount, setIncludeDiscount] = useState(false);
  const [selectedCouponId, setSelectedCouponId] = useState<string>("");
  const [isSending, setIsSending] = useState(false);

  // Load data on mount
  useEffect(() => {
    refreshCoupons();
    loadProspects();
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

  const activeCoupons = useMemo(() => allCoupons.filter(c => c.active), [allCoupons]);

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

  const stats = {
    total: customerFollowUps.length,
    dueNow: customerFollowUps.filter(c => c.isDue).length,
    prospects: prospects.length,
    sentThisMonth: logs.filter(l => new Date(l.dateSent).getMonth() === new Date().getMonth()).length
  };

  const openFollowUpDialog = (customer: any) => {
    setSelectedCustomer(customer);
    setCustomNote("");
    setIncludeDiscount(false);
    setSelectedCouponId("");
    setIsDialogOpen(true);
  };

  const openProspectDialog = (prospect: Customer) => {
    setSelectedProspect(prospect);
    setCustomNote("");
    setIncludeDiscount(false);
    setSelectedCouponId("");
    setIsProspectDialogOpen(true);
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
      <main className="container mx-auto px-4 pr-[70px] lg:pr-4 pt-48 pb-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
              <Zap className="h-8 w-8 text-blue-500 fill-blue-500" />
            </div>
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter leading-none italic">
                Retention <span className="text-blue-500">Hub</span>
              </h1>
              <p className="text-zinc-500 font-medium uppercase tracking-widest text-[10px] mt-1.5 flex items-center gap-2">
                <ShieldCheck className="h-3 w-3" /> Professional Growth Engine
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: 'retention-hub' }))}
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 hover:text-emerald-400 group"
            >
              <HelpCircle className="mr-2 h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              Hub Guide
            </Button>
           
           <Button 
             variant="outline" 
             onClick={loadProspects}
             className="bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 border-zinc-800 font-bold uppercase tracking-tight h-12 rounded-xl"
           >
             <RotateCcw className={cn("mr-2 h-4 w-4", loadingProspects && "animate-spin")} />
             Sync All Data
           </Button>

           <div className="hidden md:block h-8 w-[1px] bg-zinc-800 mx-2" />

           <Button 
             variant="ghost" 
             size="icon"
             onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: 'retention-hub' }))}
             className="text-zinc-600 hover:text-white transition-all group"
             title="Help Guide"
           >
             <HelpCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
           </Button>
        </div>
      </div>

      <Tabs defaultValue="opportunities" className="space-y-12">
        <TabsList className="bg-zinc-900 border-2 border-zinc-800 p-2 rounded-[2rem] h-auto flex flex-col sm:flex-row w-full sm:w-fit backdrop-blur-3xl shadow-2xl gap-2 overflow-hidden">
          <TabsTrigger value="opportunities" className="rounded-[1.5rem] px-5 sm:px-10 font-black uppercase tracking-[0.2em] text-[10px] sm:text-[11px] h-14 sm:h-16 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center sm:justify-start gap-3 w-full sm:w-auto">
             <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
             Client Retention
             <Badge className="bg-black/40 text-blue-400 border-none font-black text-[10px] px-2.5 py-1 rounded-lg">{stats.dueNow}</Badge>
          </TabsTrigger>
          <TabsTrigger value="prospects" className="rounded-[1.5rem] px-5 sm:px-10 font-black uppercase tracking-[0.2em] text-[10px] sm:text-[11px] h-14 sm:h-16 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_30px_rgba(147,51,234,0.4)] transition-all flex items-center justify-center sm:justify-start gap-3 border-l-0 sm:border-l border-zinc-800 w-full sm:w-auto">
             <Users2 className="h-4 w-4 sm:h-5 sm:w-5" />
             Potential Leads
             <Badge className="bg-black/40 text-purple-400 border-none font-black text-[10px] px-2.5 py-1 rounded-lg">{stats.prospects}</Badge>
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-[1.5rem] px-5 sm:px-10 font-black uppercase tracking-[0.2em] text-[10px] sm:text-[11px] h-14 sm:h-16 data-[state=active]:bg-zinc-800 data-[state=active]:text-white transition-all flex items-center justify-center sm:justify-start gap-3 border-l-0 sm:border-l border-zinc-800 w-full sm:w-auto">
             <History className="h-4 w-4 sm:h-5 sm:w-5" />
             Engagement History
          </TabsTrigger>
        </TabsList>

        {/* SEARCH BAR (FIXED AT TOP OF ALL TABS) */}
        <div className="relative max-w-4xl">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-[2.5rem] blur opacity-25" />
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-zinc-500 z-10" />
          <Input 
            placeholder="DYNAMIC SEARCH: EMAILS, NAMES, VEHICLES OR SERVICES..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-16 bg-zinc-900/80 border-zinc-800/50 h-20 rounded-[2.5rem] text-xl font-black placeholder:text-zinc-700 placeholder:uppercase focus:ring-blue-500/20 focus:bg-zinc-900 focus:border-blue-500/40 transition-all border-2 relative z-10"
          />
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
                    "group relative overflow-hidden bg-zinc-900/30 border border-zinc-800/50 rounded-[3.5rem] p-10 transition-all hover:bg-zinc-900/60 hover:border-zinc-700 shadow-xl",
                    customer.isDue && "border-l-8 border-l-red-500/60"
                  )}
                >
                   <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative z-10">
                      <div className="flex items-start gap-10">
                         <div className={cn(
                           "h-24 w-24 rounded-[2rem] flex items-center justify-center border-2 transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 shadow-2xl",
                           customer.isDue 
                             ? "bg-red-500/10 border-red-500/20 text-red-500 shadow-red-900/10" 
                             : "bg-blue-500/10 border-blue-500/20 text-blue-500 shadow-blue-900/10"
                         )}>
                            <User className={cn("h-12 w-12", customer.isDue && "animate-pulse")} />
                         </div>
                         
                         <div className="space-y-3">
                            <div className="flex items-center gap-4">
                               <h3 className="text-3xl font-black uppercase tracking-tighter italic">{customer.customer}</h3>
                               {customer.isDue && (
                                 <Badge className="bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border-none shadow-[0_0_20px_rgba(239,68,68,0.4)]">Action Required</Badge>
                               )}
                            </div>
                            <p className="text-zinc-500 font-bold text-base tracking-tight flex items-center gap-2">
                                <Mail className="h-4 w-4 opacity-50 text-blue-500" /> {customer.customerEmail}
                            </p>
                            <div className="flex flex-wrap items-center gap-5 mt-6">
                               <div className="flex items-center gap-2 text-[10px] font-black text-zinc-300 uppercase tracking-widest bg-zinc-800/80 px-5 py-2.5 rounded-2xl border border-zinc-700/50 shadow-lg">
                                  <Sparkles className="h-4 w-4 text-blue-500" />
                                  Last: {customer.title}
                               </div>
                               <div className="flex items-center gap-2 text-[10px] font-black text-zinc-300 uppercase tracking-widest bg-zinc-800/80 px-5 py-2.5 rounded-2xl border border-zinc-700/50 shadow-lg">
                                  <CalendarDays className="h-4 w-4 text-emerald-500" />
                                  {format(customer.lastServiceDate, 'MMM dd, yyyy')}
                               </div>
                               
                               <div className="flex items-center gap-3 px-5 py-2 bg-zinc-950/80 border-2 border-zinc-800 rounded-2xl shadow-inner group/select">
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.15em]">Interval:</span>
                                <Select 
                                 value={String(customer.frequencyMonths)} 
                                 onValueChange={(v) => handleUpdateFrequency(customer.id, v)}
                                >
                                  <SelectTrigger className="h-8 w-44 border-0 bg-transparent text-blue-400 p-0 focus:ring-0 text-[12px] font-black uppercase tracking-[0.1em] hover:text-white transition-colors">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-zinc-900 border-2 border-zinc-800 text-zinc-200 rounded-2xl shadow-2xl">
                                    <SelectItem value="0" className="font-black text-amber-500">Anytime / Manual</SelectItem>
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

                      <div className="flex flex-col sm:flex-row items-center gap-12">
                         <div className="text-right flex flex-col items-end">
                            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-500 mb-3">Engagement Window:</p>
                            {Number(customer.frequencyMonths) === 0 ? (
                               <div className="space-y-2 flex flex-col items-end">
                                 <Input 
                                   type="date"
                                   value={customer.customReminderDate ? customer.customReminderDate.split('T')[0] : new Date().toISOString().split('T')[0]}
                                   onChange={(e) => handleUpdateCustomDate(customer.id, new Date(e.target.value).toISOString())}
                                   className="h-10 w-44 bg-zinc-950 border-2 border-zinc-800 text-amber-400 font-black text-sm rounded-xl focus:ring-amber-500/20 text-center uppercase shadow-lg border-amber-500/10"
                                 />
                                 <p className="text-[10px] text-amber-500/60 font-black uppercase tracking-[0.2em]">Manual Override Active</p>
                               </div>
                            ) : (
                               <>
                                 <p className={cn(
                                   "text-4xl font-black tracking-tighter leading-none mb-2",
                                   customer.isDue ? "text-red-500" : "text-white"
                                 )}>
                                    {format(customer.dueDate, 'MMM dd, yyyy')}
                                 </p>
                                 <p className="text-[12px] text-zinc-500 font-black uppercase tracking-widest italic">
                                    {customer.isDue 
                                      ? `${Math.abs(customer.daysRemaining)} Days Lagging` 
                                      : `Approx. ${customer.daysRemaining} Days Until Due`}
                                 </p>
                               </>
                            )}
                         </div>

                         <Button 
                           onClick={() => openFollowUpDialog(customer)}
                           className={cn(
                             "h-16 px-10 rounded-[1.25rem] font-black uppercase tracking-tighter transition-all hover:scale-105 active:scale-95 text-lg shadow-2xl",
                             customer.isDue 
                               ? "bg-red-600 hover:bg-red-700 text-white shadow-red-900/30" 
                               : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/30"
                           )}
                         >
                            Personalize Outreach
                            <ArrowRight className="ml-3 h-6 w-6" />
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
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-zinc-950/80 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500 border-b border-zinc-800">
                           <th className="px-10 py-6">Recipient & Contact</th>
                           <th className="px-10 py-6 text-center">Dispatch Time</th>
                           <th className="px-10 py-6 text-center">Engagement Type</th>
                           <th className="px-10 py-6 text-center">Loyalty Code</th>
                           <th className="px-10 py-6 text-center">Audit Log</th>
                           <th className="px-10 py-6 text-right">Verification</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-900/60">
                        {logs.length > 0 ? logs.map(log => (
                           <tr key={log.id} className="group hover:bg-zinc-800/30 transition-all duration-300">
                              <td className="px-10 py-7">
                                 <p className="text-base font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{log.customerName}</p>
                                 <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest mt-1 opacity-70">{log.customerEmail}</p>
                              </td>
                              <td className="px-10 py-7 text-center">
                                 <Badge variant="outline" className="bg-zinc-950 border-zinc-800 text-zinc-400 font-black text-[9px] px-3 py-1">
                                    {format(new Date(log.dateSent), 'MMM dd, h:mm a')}
                                 </Badge>
                              </td>
                              <td className="px-10 py-7 text-center">
                                 <span className={cn(
                                     "text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border",
                                     log.emailType === 'prospect_intro' ? "text-purple-400 border-purple-500/20 bg-purple-500/5" : "text-blue-400 border-blue-500/20 bg-blue-500/5"
                                 )}>
                                     {log.emailType === 'prospect_intro' ? 'PROSPECT NURTURING' : 'CLIENT RETENTION'}
                                 </span>
                              </td>
                              <td className="px-10 py-7 text-center">
                                 {log.couponCode ? (
                                    <span className="font-mono text-[11px] font-black text-emerald-500 bg-emerald-500/10 px-4 py-1.5 rounded-lg border border-emerald-500/20 uppercase tracking-tighter">
                                       {log.couponCode}
                                    </span>
                                 ) : <span className="text-zinc-800 font-black">STANDARD_DISPATCH</span>}
                              </td>
                              <td className="px-10 py-7 text-center">
                                 <Button 
                                   size="sm" 
                                   variant="ghost" 
                                   onClick={() => {
                                     const search = encodeURIComponent(log.customerName);
                                     window.location.href = `/file-manager?search=${search}`;
                                   }}
                                   className="h-9 w-9 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all"
                                   title="View Archived Record"
                                 >
                                   <Eye className="h-4 w-4" />
                                 </Button>
                              </td>
                              <td className="px-10 py-7 text-right">
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
                              </td>
                           </tr>
                        )) : (
                           <tr>
                              <td colSpan={5} className="px-10 py-24 text-center">
                                 <History className="h-16 w-16 text-zinc-900 mx-auto mb-4 opacity-20" />
                                 <p className="text-zinc-600 font-black uppercase tracking-[0.3em] text-[11px]">Audit Cache Depleted</p>
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
                </div>
             </CardContent>
          </Card>
        </TabsContent>

      {/* CLIENT RETENTION DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-xl rounded-[3rem] p-10 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] pointer-events-none" />
          <DialogHeader>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3.5 bg-blue-600/10 rounded-2xl border border-blue-600/20">
                <Mail className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <DialogTitle className="text-3xl font-black uppercase tracking-tighter italic">Relationship Outreach</DialogTitle>
                <DialogDescription className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mt-1">Direct Maintenance Dispatch — {selectedCustomer?.customer}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-8 pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5" /> High-End Personal Note
                </label>
                <Badge className="bg-zinc-900 text-zinc-500 border-none font-black text-[9px] uppercase tracking-tighter">Overrides Default Greeting</Badge>
              </div>
              <Textarea 
                placeholder="Compose a high-end personal note to convert this client back to a booked appointment..." 
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="bg-zinc-900/60 border-2 border-zinc-800 min-h-[160px] rounded-[2rem] font-bold italic text-lg text-white placeholder:text-zinc-700 focus:ring-blue-500/20 shadow-2xl transition-all"
              />
            </div>

            <div className="bg-zinc-950 border-2 border-zinc-900 p-8 rounded-[2.5rem] space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                    <TicketPercent className="h-5 w-5 text-emerald-500" /> Loyalty Convertor
                  </p>
                  <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest opacity-60">Embed a professional discount voucher.</p>
                </div>
                <Switch 
                  checked={includeDiscount} 
                  onCheckedChange={setIncludeDiscount}
                  className="data-[state=checked]:bg-emerald-600 scale-125"
                />
              </div>

              {includeDiscount && (
                <div className="pt-6 border-t-2 border-zinc-900 animate-in fade-in slide-in-from-top-4">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-4">Strategic Conversion Asset:</p>
                   <Select value={selectedCouponId} onValueChange={setSelectedCouponId}>
                      <SelectTrigger className="bg-zinc-900 border-2 border-zinc-800 text-white h-14 rounded-2xl font-black uppercase tracking-tight shadow-xl">
                        <SelectValue placeholder="CHOOSE CAMPAIGN VOUCHER..." />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-2 border-zinc-800 text-zinc-200">
                        {activeCoupons.length > 0 ? activeCoupons.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            <div className="flex items-center gap-4">
                              <span className="font-mono font-black text-amber-500 bg-amber-950/40 px-3 py-1 rounded border border-amber-900/40 text-[11px] tracking-tight">{c.code}</span>
                              <span className="font-black uppercase text-[11px] text-zinc-500">— {c.percent ? `${c.percent}% REDUCTION` : `$${c.amount} FLAT OFF`}</span>
                            </div>
                          </SelectItem>
                        )) : (
                          <div className="p-6 text-[11px] font-black uppercase text-zinc-600 italic text-center">No active marketing assets detected.</div>
                        )}
                      </SelectContent>
                   </Select>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-10 border-t-2 border-zinc-900/50 pt-8">
            <Button 
              variant="ghost" 
              onClick={() => setIsDialogOpen(false)}
              className="text-zinc-600 hover:text-white hover:bg-zinc-900 font-black uppercase tracking-[0.2em] text-[10px] h-12"
            >
              Abort Prep
            </Button>
            <Button 
              onClick={executeFollowUp}
              disabled={isSending || (includeDiscount && !selectedCouponId)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-tighter h-16 px-10 rounded-2xl shadow-2xl shadow-blue-900/50 transition-all hover:scale-[1.03] active:scale-95 text-lg"
            >
              {isSending ? "DISPATCHING..." : (
                <>
                  COMMIT OUTREACH
                  <ChevronRight className="ml-3 h-6 w-6" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PROSPECT NURTURING DIALOG */}
      <Dialog open={isProspectDialogOpen} onOpenChange={setIsProspectDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-xl rounded-[3rem] p-10 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 blur-[100px] pointer-events-none" />
          <DialogHeader>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3.5 bg-purple-600/10 rounded-2xl border border-purple-600/20">
                <Users2 className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <DialogTitle className="text-3xl font-black uppercase tracking-tighter italic">Prospect Outreach</DialogTitle>
                <DialogDescription className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mt-1">Lead Conversion Protocol — {selectedProspect?.name}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-8 pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5" /> Discovery Introduction
                </label>
              </div>
              <Textarea 
                placeholder="Introduce your signature processes and premium care to this prospect..." 
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="bg-zinc-900/60 border-2 border-zinc-800 min-h-[160px] rounded-[2rem] font-bold italic text-lg text-white placeholder:text-zinc-700 focus:ring-purple-500/20 shadow-2xl transition-all"
              />
            </div>

            <div className="bg-zinc-950 border-2 border-zinc-900 p-8 rounded-[2.5rem] space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                    <Zap className="h-5 w-5 text-purple-500" /> First-Time Incentive
                  </p>
                  <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest opacity-60">Drive the first booking with a welcome voucher.</p>
                </div>
                <Switch 
                  checked={includeDiscount} 
                  onCheckedChange={setIncludeDiscount}
                  className="data-[state=checked]:bg-purple-600 scale-125"
                />
              </div>

              {includeDiscount && (
                <div className="pt-6 border-t-2 border-zinc-900 animate-in fade-in slide-in-from-top-4">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-4">Conversion Voucher:</p>
                   <Select value={selectedCouponId} onValueChange={setSelectedCouponId}>
                      <SelectTrigger className="bg-zinc-900 border-2 border-zinc-800 text-white h-14 rounded-2xl font-black uppercase tracking-tight">
                        <SelectValue placeholder="SELECT WELCOME OFFER..." />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-2 border-zinc-800 text-zinc-200">
                        {activeCoupons.length > 0 ? activeCoupons.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            <div className="flex items-center gap-4">
                              <span className="font-mono font-black text-purple-400 bg-purple-950/40 px-3 py-1 rounded border border-purple-900/40 text-[11px] tracking-tight">{c.code}</span>
                              <span className="font-black uppercase text-[11px] text-zinc-500">— {c.percent ? `${c.percent}% OFF` : `$${c.amount} OFF`}</span>
                            </div>
                          </SelectItem>
                        )) : (
                          <div className="p-6 text-[11px] font-black uppercase text-zinc-600 italic text-center">No active offers detected.</div>
                        )}
                      </SelectContent>
                   </Select>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-10 border-t-2 border-zinc-900/50 pt-8">
            <Button 
              variant="ghost" 
              onClick={() => setIsProspectDialogOpen(false)}
              className="text-zinc-600 hover:text-white hover:bg-zinc-900 font-black uppercase tracking-[0.2em] text-[10px] h-12"
            >
              Cancel Prep
            </Button>
            <Button 
              onClick={executeProspectFollowUp}
              disabled={isSending || (includeDiscount && !selectedCouponId)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-tighter h-16 px-10 rounded-2xl shadow-2xl shadow-purple-900/50 transition-all hover:scale-[1.03] active:scale-95 text-lg"
            >
              {isSending ? "DISPATCHING..." : (
                <>
                  WELCOME PROSPECT
                  <ChevronRight className="ml-3 h-6 w-6" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </Tabs>
      </main>
    </div>
  );
}
