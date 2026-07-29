import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { useBookingsStore } from "@/store/bookings";
import { useCouponsStore } from "@/store/coupons";
import { getSupabaseCustomers, Customer, supabase, upsertSupabaseCustomer } from "@/lib/supa-data";
import { RetentionHub } from "@/components/customers/RetentionHub";
import { Search, Clock, ArrowRight, Settings, X, ExternalLink, CalendarDays, Zap, FileText, CheckCircle, Ticket, Mail, Calendar, Trash2, UserPlus, EyeOff, HelpCircle, PenTool, CheckCircle2 } from "lucide-react";
import { format, isSameMonth } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useFollowUpStatus, useFollowUpSettings } from "@/hooks/useFollowUpStatus";
import { toast } from "sonner";
import { onSendReminderEmail, onSendProspectEmail } from "@/lib/bookingsSync";
import { PageModal } from "@/components/ui/PageModal";
import LetterMaker from "@/pages/LetterMaker";
import Estimates from "@/pages/Estimates";
import BookingsPage from "@/pages/BookingsPage";

export default function FollowUpCenter() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  
  const { items: allBookings } = useBookingsStore();
  const { items: allCoupons, refresh: refreshCoupons } = useCouponsStore();
  
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [prospects, setProspects] = useState<Customer[]>([]);
  const [lostProspects, setLostProspects] = useState<Customer[]>([]);
  const [showLost, setShowLost] = useState(false);
  
  const followUpStatus = useFollowUpStatus(allCustomers, allBookings);
  const { settings, saveSettings } = useFollowUpSettings();
  
  // Modals
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [contactNote, setContactNote] = useState("");
  
  // Sort states
  const [sortOverdue, setSortOverdue] = useState("most_overdue");
  const [sortDueSoon, setSortDueSoon] = useState("most_overdue");
  const [sortProspects, setSortProspects] = useState("alphabetical");

  const [pageModal, setPageModal] = useState<{ isOpen: boolean; url: string; component: any; title: string; icon: any }>({ isOpen: false, url: '', component: null, title: '', icon: null });

  const openLetterMaker = (customerId: string) => {
    setPageModal({ isOpen: true, url: `/?customerId=${customerId}`, component: LetterMaker, title: 'Letter Maker', icon: <PenTool className="w-5 h-5 text-blue-500" /> });
  };
  const openEstimate = (customerId: string) => {
    setPageModal({ isOpen: true, url: `/?customerId=${customerId}&add=true`, component: Estimates, title: 'Estimates', icon: <FileText className="w-5 h-5 text-blue-500" /> });
  };
  const openBooking = (customerId: string) => {
    setPageModal({ isOpen: true, url: `/?add=true&customerId=${customerId}`, component: BookingsPage, title: 'Schedule Booking', icon: <Calendar className="w-5 h-5 text-blue-500" /> });
  };

  const loadData = async () => {
    try {
      const all = await getSupabaseCustomers();
      const activeAll = all.filter(c => !c.is_archived);
      setAllCustomers(activeAll);
      
      setProspects(activeAll.filter(c => c.type === 'prospect'));
      setLostProspects(all.filter(c => c.type === 'lost_prospect' || (c.type === 'prospect' && c.is_archived)));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    refreshCoupons();
  }, []);

  const openFollowUpDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDialogOpen(true);
  };

  const handleViewProfile = (customerId: string, customerName: string) => {
    navigate(`/search-customer?customerId=${customerId}&search=${encodeURIComponent(customerName)}`);
  };

  const handleSnooze = async (customerId: string, days: number) => {
    if (localStorage.getItem("demo_mode_active") === "true") {
      toast.success(`Snoozed for ${days} days (Demo)`);
      return;
    }
    try {
      await supabase.from('engagements').insert({
        customer_id: customerId,
        type: 'activity',
        note: `Snoozed for ${days} days`
      });
      toast.success(`Snoozed for ${days} days.`);
      followUpStatus.refresh();
      loadData();
    } catch (e) {
      toast.error("Failed to snooze.");
    }
  };

  const handleLogContact = async () => {
    if (!selectedCustomer) return;
    if (localStorage.getItem("demo_mode_active") === "true") {
      toast.success("Contact logged successfully (Demo).");
      setIsNoteDialogOpen(false);
      return;
    }
    try {
      await supabase.from('engagements').insert({
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        type: 'activity',
        note: `Marked as contacted: ${contactNote || 'No notes provided'}`
      });
      toast.success("Contact logged successfully.");
      setIsNoteDialogOpen(false);
      setContactNote("");
      followUpStatus.refresh();
      loadData();
    } catch (e) {
      toast.error("Failed to log contact.");
    }
  };

  const handleConvertProspect = async (customerId: string) => {
    if (!confirm("Convert this prospect to a customer?")) return;
    try {
      const prospect = allCustomers.find(c => c.id === customerId);
      if (prospect) {
        await upsertSupabaseCustomer({ ...prospect, type: 'customer' });
        toast.success("Prospect converted to customer!");
        loadData();
      }
    } catch (e) {
      toast.error("Failed to convert prospect.");
    }
  };

  const handleLostProspect = async (customerId: string) => {
    if (!confirm("Mark this prospect as lost?")) return;
    try {
      const prospect = allCustomers.find(c => c.id === customerId);
      if (prospect) {
        await upsertSupabaseCustomer({ ...prospect, type: 'lost_prospect' });
        toast.success("Prospect marked as lost.");
        loadData();
      }
    } catch (e) {
      toast.error("Failed to mark as lost.");
    }
  };

  const handleRestoreProspect = async (customerId: string) => {
    try {
      const prospect = lostProspects.find(c => c.id === customerId);
      if (prospect) {
        await upsertSupabaseCustomer({ ...prospect, type: 'prospect', is_archived: false });
        toast.success("Prospect restored.");
        loadData();
      }
    } catch (e) {
      toast.error("Failed to restore prospect.");
    }
  };

  const searchLower = search.toLowerCase();
  const matchSearch = (c: Customer) => {
    if (!searchLower) return true;
    return (
      (c.name || '').toLowerCase().includes(searchLower) ||
      (c.email || '').toLowerCase().includes(searchLower) ||
      (c.phone || '').toLowerCase().includes(searchLower)
    );
  };

  const applySort = (items: any[], sortType: string) => {
    return [...items].sort((a, b) => {
      if (sortType === 'alphabetical') {
        return (a.customer?.name || a.name || '').localeCompare(b.customer?.name || b.name || '');
      } else if (sortType === 'highest_value') {
        const valA = a.lastServiceValue || 0;
        const valB = b.lastServiceValue || 0;
        return valB - valA;
      } else if (sortType === 'newest') {
        return new Date(b.customer?.created_at || 0).getTime() - new Date(a.customer?.created_at || 0).getTime();
      } else { // most_overdue
        const daysA = a.daysSince || 0;
        const daysB = b.daysSince || 0;
        return daysB - daysA;
      }
    });
  };

  const filteredOverdue = applySort(followUpStatus.overdue.filter(c => matchSearch(c.customer)), sortOverdue);
  const filteredDueSoon = applySort([...followUpStatus.dueThisWeek, ...followUpStatus.dueThisMonth].filter(c => matchSearch(c.customer)), sortDueSoon);
  
  let currentProspectsList = showLost ? lostProspects : prospects;
  const filteredProspects = applySort(currentProspectsList.filter(matchSearch).map(p => ({ customer: p, daysSince: 0 })), sortProspects);

  // Stats
  const emailsThisMonth = (followUpStatus.engagements || []).filter((e: any) => 
    e.type === 'letter' || e.type === 'email' || e.type === 'prospect_intro' || e.type === 'correspondence'
  ).filter((e: any) => {
    const d = new Date(e.created_at || e.timestamp);
    return isSameMonth(d, new Date());
  }).length;

  const renderCustomerCard = (item: any, section: 'overdue' | 'dueSoon' | 'prospects' | 'lost') => {
    const isProspect = section === 'prospects' || section === 'lost';
    const customer = isProspect ? (item.customer as Customer) : item.customer;
    let daysSince = 0;
    let lastServiceDate = null;
    let serviceTitle = "Never booked";
    
    if (!isProspect) {
      daysSince = item.daysSince;
      lastServiceDate = item.lastActivityDate;
      const customerBookings = allBookings.filter(b => b.customerId === customer.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (customerBookings.length > 0) {
        serviceTitle = customerBookings[0].title || "Unknown Service";
      } else {
        serviceTitle = "No booking found";
      }
    } else {
      const createdDate = customer.created_at ? new Date(customer.created_at) : new Date();
      daysSince = Math.floor((new Date().getTime() - createdDate.getTime()) / (1000 * 3600 * 24));
      lastServiceDate = createdDate;
    }

    return (
      <div key={customer.id} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 flex flex-col xl:flex-row justify-between gap-6 hover:bg-zinc-900/60 transition-colors shadow-lg overflow-hidden relative group">
        <div className="space-y-3 flex-1 min-w-0 z-10">
          <div className="flex flex-wrap items-center gap-3">
            <h5 className="text-xl font-black uppercase tracking-tight text-zinc-200 truncate">{customer.name}</h5>
            {isProspect && <Badge className="bg-purple-500/20 text-purple-400 text-[9px] uppercase font-black px-2 py-0.5 border-none">{section === 'lost' ? 'Lost Prospect' : 'Prospect'}</Badge>}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-zinc-500">
            {customer.email ? (
              <span className="truncate">{customer.email}</span>
            ) : (
              <span 
                className="truncate text-blue-400 hover:underline cursor-pointer"
                onClick={() => handleViewProfile(customer.id!, customer.name!)}
              >
                No email on file — add in profile
              </span>
            )}
            <span>&bull;</span>
            <span>{customer.phone || 'No phone'}</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-4">
            <div className="bg-zinc-950/50 px-4 py-2 rounded-xl border border-zinc-800/50 flex flex-col">
              <span className="text-[9px] uppercase font-black text-zinc-600 tracking-widest">Last Contact</span>
              <div className="flex items-center gap-2 mt-1">
                <CalendarDays className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-xs font-bold text-zinc-300">{lastServiceDate ? format(lastServiceDate, 'MMM d, yyyy') : 'Unknown'}</span>
              </div>
            </div>
            
            <div className="bg-zinc-950/50 px-4 py-2 rounded-xl border border-zinc-800/50 flex flex-col">
              <span className="text-[9px] uppercase font-black text-zinc-600 tracking-widest">{isProspect ? 'Added' : 'Service Type'}</span>
              <div className="flex items-center gap-2 mt-1">
                <FileText className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-bold text-zinc-300 truncate max-w-[150px]">{isProspect ? (daysSince + ' days ago') : serviceTitle}</span>
              </div>
            </div>

            {!isProspect && item.lastServiceValue > 0 && (
              <div className="bg-zinc-950/50 px-4 py-2 rounded-xl border border-zinc-800/50 flex flex-col">
                <span className="text-[9px] uppercase font-black text-zinc-600 tracking-widest">Last Value</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold text-emerald-400">${item.lastServiceValue.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap lg:flex-col gap-2 justify-center z-10 shrink-0 w-full xl:w-64">
          <div className="grid grid-cols-1 gap-2 w-full">
            {section === 'overdue' && (
              <div className="flex gap-2 w-full">
                <Button onClick={() => openFollowUpDialog(customer)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] h-9">
                  Send Follow-up
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" onClick={() => openFollowUpDialog(customer)} className="flex-1 bg-zinc-950 border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-black uppercase tracking-widest text-[10px] h-9">
                        <Ticket className="w-3.5 h-3.5 mr-1.5 text-pink-500" /> Apply Coupon & Send
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Send a follow-up email with a discount code attached. Select from your active coupons.</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
            {section === 'dueSoon' && (
              <div className="flex gap-2 w-full">
                <Button onClick={async () => {
                  const cb = allBookings.find(b => b.customerId === customer.id);
                  if (cb) await onSendReminderEmail(cb, "Manual Outreach");
                  else toast.error("No booking found to generate reminder.");
                }} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] h-9">
                  Send Maintenance Reminder
                </Button>
              </div>
            )}
            {section === 'prospects' && (
              <div className="flex gap-2 w-full">
                <Button onClick={async () => await onSendProspectEmail(customer)} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-widest text-[10px] h-9">
                  Send Welcome Email
                </Button>
                <Button variant="outline" onClick={() => handleConvertProspect(customer.id!)} className="flex-1 bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-emerald-500 hover:text-emerald-400 text-[10px] font-black uppercase tracking-widest h-9">
                  <UserPlus className="h-3 w-3 mr-1" /> Convert
                </Button>
              </div>
            )}
            {section === 'lost' && (
              <Button onClick={() => handleRestoreProspect(customer.id!)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-[10px] font-black uppercase tracking-widest h-9">
                Restore Prospect
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="outline" onClick={() => openLetterMaker(customer.id!)} className="w-full bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[9px] font-black uppercase tracking-widest h-9 px-1">
              Write Letter
            </Button>
            <Button variant="outline" onClick={() => openEstimate(customer.id!)} className="w-full bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[9px] font-black uppercase tracking-widest h-9 px-1">
              Estimate
            </Button>
            <Button variant="outline" onClick={() => openBooking(customer.id!)} className="w-full bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[9px] font-black uppercase tracking-widest h-9 px-1">
              Schedule Booking
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={() => { setSelectedCustomer(customer); setIsNoteDialogOpen(true); }} className="w-full bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[9px] font-black uppercase tracking-widest h-9 px-1">
                    Mark Contacted
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Log that you contacted this customer outside the app (phone call, text, etc.). Resets their inactivity clock.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={() => handleSnooze(customer.id!, 14)} className="w-full bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-zinc-500 hover:text-white text-[9px] font-black uppercase tracking-widest h-9 px-1 gap-1">
                    <Clock className="w-3 h-3" /> Snooze
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Temporarily removes this customer from the list. They reappear automatically when the snooze period expires.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="outline" onClick={() => window.open(`/search?search=${encodeURIComponent(customer.name)}`, '_blank')} className="w-full bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-zinc-500 hover:text-white text-[9px] font-black uppercase tracking-widest h-9 px-1 gap-1">
              Profile <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
          {section === 'prospects' && (
             <TooltipProvider>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <Button variant="ghost" onClick={() => handleLostProspect(customer.id!)} className="w-full hover:bg-zinc-800 text-zinc-500 hover:text-red-400 text-[9px] font-black uppercase tracking-widest h-7 mt-1">
                     <EyeOff className="h-3 w-3 mr-1" /> Mark as Lost
                   </Button>
                 </TooltipTrigger>
                 <TooltipContent>Removes from active prospects without deleting. Use 'Show Lost' toggle to view and restore lost prospects.</TooltipContent>
               </Tooltip>
             </TooltipProvider>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <PageHeader title="Follow-Up Center" subtitle="Monitor service intervals and nurture prospects" />
      <main className="container mx-auto px-4 md:px-6 pt-6 max-w-6xl">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                <Zap className="h-8 w-8 text-blue-500 fill-blue-500" />
              </div>
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic flex items-center">
                Retention <span className="text-blue-500 ml-3">Hub</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="ml-3 text-zinc-500 hover:text-white transition-colors focus:outline-none">
                      <HelpCircle className="h-6 w-6" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="right" className="max-w-[450px] bg-white border-slate-200 text-slate-900 p-6 shadow-xl z-[200] font-sans normal-case not-italic tracking-normal font-normal relative">
                       <PopoverClose className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none text-slate-500 hover:text-slate-900">
                         <X className="h-4 w-4" />
                       </PopoverClose>
                       <div className="space-y-4">
                          <div>
                            <h4 className="font-bold text-lg text-slate-900 leading-tight pr-6">Retention Hub Flow</h4>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1 pb-3 border-b border-slate-100">Cheat Sheet</p>
                          </div>
                          
                          <div className="space-y-5">
                             <div className="flex gap-3 items-start">
                                <div className="shrink-0 mt-0.5"><CheckCircle2 className="w-5 h-5 text-emerald-500" /></div>
                                <div>
                                   <h5 className="font-bold text-slate-900 text-sm mb-1">1. Overdue</h5>
                                   <p className="text-sm text-slate-600 leading-relaxed">Clients past their scheduled service interval. <strong>Action:</strong> Send them an automated follow-up email, call them, or mark them as contacted to clear them out.</p>
                                </div>
                             </div>
                             
                             <div className="flex gap-3 items-start">
                                <div className="shrink-0 mt-0.5"><CheckCircle2 className="w-5 h-5 text-emerald-500" /></div>
                                <div>
                                   <h5 className="font-bold text-slate-900 text-sm mb-1">2. Due Soon</h5>
                                   <p className="text-sm text-slate-600 leading-relaxed">Clients approaching their service interval. <strong>Action:</strong> Proactively reach out to get them on the schedule before their car gets too dirty.</p>
                                </div>
                             </div>

                             <div className="flex gap-3 items-start">
                                <div className="shrink-0 mt-0.5"><CheckCircle2 className="w-5 h-5 text-emerald-500" /></div>
                                <div>
                                   <h5 className="font-bold text-slate-900 text-sm mb-1">3. Prospects</h5>
                                   <p className="text-sm text-slate-600 leading-relaxed">New leads who haven't booked yet. <strong>Action:</strong> Nurture them! Send an estimate, write a custom letter, or schedule a booking to officially convert them to a Customer.</p>
                                </div>
                             </div>

                             <div className="flex gap-3 items-start">
                                <div className="shrink-0 mt-0.5"><CheckCircle2 className="w-5 h-5 text-emerald-500" /></div>
                                <div>
                                   <h5 className="font-bold text-slate-900 text-sm mb-1">4. Lost Prospects</h5>
                                   <p className="text-sm text-slate-600 leading-relaxed">Prospects who declined or went cold (Toggle "Show Lost"). <strong>Action:</strong> Try re-engaging them later with a discount or restore them to active prospects.</p>
                                </div>
                             </div>

                             <div className="flex gap-3 items-start">
                                <div className="shrink-0 mt-0.5"><CheckCircle2 className="w-5 h-5 text-emerald-500" /></div>
                                <div>
                                   <h5 className="font-bold text-slate-900 text-sm mb-1">Quick Actions</h5>
                                   <p className="text-sm text-slate-600 leading-relaxed">You can apply coupons, write custom letters, schedule bookings, or snooze reminders directly from each client card. Use the search bar to find anyone instantly.</p>
                                </div>
                             </div>
                          </div>
                       </div>
                  </PopoverContent>
                </Popover>
              </h1>
            </div>
            <p className="text-zinc-500 font-bold text-sm tracking-wide">
              Never let a customer slip away. Monitor service intervals, reach out to overdue clients, and nurture prospects into paying customers.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Active</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Switch 
                        checked={settings.active}
                        onCheckedChange={(v) => saveSettings({ ...settings, active: v })}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>When ON, the hub actively monitors and flags customers for follow-up. Toggle OFF to pause all follow-up tracking.</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="w-px h-8 bg-zinc-800 hidden sm:block"></div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Thresholds:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-8 bg-zinc-950 border-zinc-700 text-white font-bold text-xs">
                    Configure Tiers
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-zinc-950 border-zinc-800 p-4 shadow-xl text-white">
                  <div className="space-y-4">
                    <h4 className="font-bold text-zinc-200">Follow-Up Tiers</h4>
                    <p className="text-xs text-zinc-500">Configure how long until a customer is due for a follow-up based on their last service.</p>
                    
                    <div className="grid gap-3">
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label className="text-xs font-bold text-zinc-300 col-span-2">Maintenance / Exterior</Label>
                        <Input 
                          type="number" 
                          value={settings.thresholds?.maintenance || 3}
                          onChange={(e) => saveSettings({ ...settings, thresholds: { ...settings.thresholds, maintenance: parseInt(e.target.value) || 3 } })}
                          className="h-8 bg-zinc-900 border-zinc-700 text-center font-bold text-white col-span-1"
                        />
                      </div>
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label className="text-xs font-bold text-amber-500 col-span-2">Full Detail</Label>
                        <Input 
                          type="number" 
                          value={settings.thresholds?.fullDetail || 6}
                          onChange={(e) => saveSettings({ ...settings, thresholds: { ...settings.thresholds, fullDetail: parseInt(e.target.value) || 6 } })}
                          className="h-8 bg-zinc-900 border-zinc-700 text-center font-bold text-white col-span-1"
                        />
                      </div>
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label className="text-xs font-bold text-emerald-400 col-span-2">Ceramic Coating</Label>
                        <Input 
                          type="number" 
                          value={settings.thresholds?.ceramic || 12}
                          onChange={(e) => saveSettings({ ...settings, thresholds: { ...settings.thresholds, ceramic: parseInt(e.target.value) || 12 } })}
                          className="h-8 bg-zinc-900 border-zinc-700 text-center font-bold text-white col-span-1"
                        />
                      </div>
                      
                      <div className="grid grid-cols-3 items-center gap-4 pt-2 border-t border-zinc-800">
                        <Label className="text-xs font-bold text-zinc-500 col-span-2">Time Unit</Label>
                        <Select value={settings.unit} onValueChange={(v: 'days' | 'months') => saveSettings({ ...settings, unit: v })}>
                          <SelectTrigger className="col-span-1 h-8 bg-zinc-900 border-zinc-700 text-white font-bold text-xs uppercase px-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                            <SelectItem value="days" className="font-bold text-xs uppercase tracking-wider">Days</SelectItem>
                            <SelectItem value="months" className="font-bold text-xs uppercase tracking-wider">Months</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Total Overdue</span>
                    <span className="text-2xl font-black text-red-400 mt-1">{filteredOverdue.length}</span>
                </div>
                <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Total Due Soon</span>
                    <span className="text-2xl font-black text-amber-400 mt-1">{filteredDueSoon.length}</span>
                </div>
                <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Total Prospects</span>
                    <span className="text-2xl font-black text-purple-400 mt-1">{prospects.length}</span>
                </div>
                <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Emails (This Mo)</span>
                    <span className="text-2xl font-black text-emerald-400 mt-1">{emailsThisMonth}</span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>Live counts updated as you take actions. Emails Sent This Month counts all outreach emails sent from this hub during the current calendar month.</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="relative mb-8">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 z-10" />
          <Input 
            placeholder="Search across all sections by name, email, or phone..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-14 pr-14 bg-zinc-900/80 border-zinc-800 h-14 rounded-2xl text-md font-bold placeholder:text-zinc-600 focus:ring-blue-500/20 focus:border-blue-500/40"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors z-20">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <Accordion type="multiple" defaultValue={["overdue", "dueSoon", "prospects"]} className="space-y-6">
          {/* Overdue Section */}
          <AccordionItem value="overdue" className="border-none bg-transparent">
            <AccordionTrigger className="hover:no-underline py-0 mb-4">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-red-500 flex items-center">
                    Overdue ({filteredOverdue.length})
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-zinc-500 hover:text-white transition-colors focus:outline-none ml-3">
                          <HelpCircle className="h-5 w-5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 bg-white border-slate-200 p-5 shadow-xl z-[200] font-sans normal-case not-italic tracking-normal font-normal relative">
                         <PopoverClose className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none text-slate-500 hover:text-slate-900">
                           <X className="h-4 w-4" />
                         </PopoverClose>
                         <h4 className="font-bold text-slate-900 mb-1 pr-6">Overdue Clients</h4>
                         <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">Cheat Sheet</p>
                         <p className="text-sm text-slate-600 mb-4">These clients are past their scheduled service interval.</p>
                         <div className="space-y-3">
                           <h5 className="font-bold text-slate-800 text-sm">Recommended Actions:</h5>
                           <ul className="text-sm text-slate-600 space-y-2 list-disc pl-4">
                             <li>Send an automated follow-up email</li>
                             <li>Give them a phone call to re-engage</li>
                             <li>Mark them as contacted to clear them out</li>
                           </ul>
                         </div>
                      </PopoverContent>
                    </Popover>
                  </h2>
                </div>
                <div onClick={e => e.stopPropagation()}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Select value={sortOverdue} onValueChange={setSortOverdue}>
                            <SelectTrigger className="h-8 bg-zinc-900 border-zinc-800 text-[9px] font-black uppercase w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                              <SelectItem value="most_overdue" className="text-[10px] font-bold">Most Overdue</SelectItem>
                              <SelectItem value="highest_value" className="text-[10px] font-bold">Highest Value</SelectItem>
                              <SelectItem value="alphabetical" className="text-[10px] font-bold">Alphabetical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Sort customers within this section. 'Highest Value' sorts by their most recent booking total.</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6">
              {filteredOverdue.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {filteredOverdue.map(item => renderCustomerCard(item, 'overdue'))}
                </div>
              ) : (
                <div className="text-center py-10 bg-zinc-900/20 rounded-2xl border border-zinc-800 border-dashed">
                  <p className="text-zinc-500 font-bold uppercase tracking-widest">No overdue customers found.</p>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Due Soon Section */}
          <AccordionItem value="dueSoon" className="border-none bg-transparent">
            <AccordionTrigger className="hover:no-underline py-0 mb-4">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-amber-500 flex items-center">
                    Due Soon ({filteredDueSoon.length})
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-zinc-500 hover:text-white transition-colors focus:outline-none ml-3">
                          <HelpCircle className="h-5 w-5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 bg-white border-slate-200 p-5 shadow-xl z-[200] font-sans normal-case not-italic tracking-normal font-normal relative">
                         <PopoverClose className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none text-slate-500 hover:text-slate-900">
                           <X className="h-4 w-4" />
                         </PopoverClose>
                         <h4 className="font-bold text-slate-900 mb-1 pr-6">Due Soon Clients</h4>
                         <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">Cheat Sheet</p>
                         <p className="text-sm text-slate-600 mb-4">These clients are approaching their scheduled service interval.</p>
                         <div className="space-y-3">
                           <h5 className="font-bold text-slate-800 text-sm">Recommended Actions:</h5>
                           <ul className="text-sm text-slate-600 space-y-2 list-disc pl-4">
                             <li>Proactively reach out to get them on the schedule</li>
                             <li>Remind them before their vehicle gets too dirty</li>
                             <li>Send an estimate for their upcoming service</li>
                           </ul>
                         </div>
                      </PopoverContent>
                    </Popover>
                  </h2>
                </div>
                <div onClick={e => e.stopPropagation()}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Select value={sortDueSoon} onValueChange={setSortDueSoon}>
                            <SelectTrigger className="h-8 bg-zinc-900 border-zinc-800 text-[9px] font-black uppercase w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                              <SelectItem value="most_overdue" className="text-[10px] font-bold">Most Overdue</SelectItem>
                              <SelectItem value="highest_value" className="text-[10px] font-bold">Highest Value</SelectItem>
                              <SelectItem value="alphabetical" className="text-[10px] font-bold">Alphabetical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Sort customers within this section. 'Highest Value' sorts by their most recent booking total.</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6">
              {filteredDueSoon.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {filteredDueSoon.map(item => renderCustomerCard(item, 'dueSoon'))}
                </div>
              ) : (
                <div className="text-center py-10 bg-zinc-900/20 rounded-2xl border border-zinc-800 border-dashed">
                  <p className="text-zinc-500 font-bold uppercase tracking-widest">No customers due soon.</p>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Prospects Section */}
          <AccordionItem value="prospects" className="border-none bg-transparent">
            <AccordionTrigger className="hover:no-underline py-0 mb-4">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-purple-400 flex items-center">
                    Prospects ({filteredProspects.length})
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-zinc-500 hover:text-white transition-colors focus:outline-none ml-3">
                          <HelpCircle className="h-5 w-5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 bg-white border-slate-200 p-5 shadow-xl z-[200] font-sans normal-case not-italic tracking-normal font-normal relative">
                         <PopoverClose className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none text-slate-500 hover:text-slate-900">
                           <X className="h-4 w-4" />
                         </PopoverClose>
                         <h4 className="font-bold text-slate-900 mb-1 pr-6">Prospects</h4>
                         <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">Cheat Sheet</p>
                         <p className="text-sm text-slate-600 mb-4">New leads who haven't booked a service yet.</p>
                         <div className="space-y-3">
                           <h5 className="font-bold text-slate-800 text-sm">Recommended Actions:</h5>
                           <ul className="text-sm text-slate-600 space-y-2 list-disc pl-4">
                             <li>Send them an estimate or custom letter</li>
                             <li>Schedule a booking to convert them to a customer</li>
                             <li>Toggle "Show Lost" to view leads who went cold, then re-engage with a discount</li>
                           </ul>
                         </div>
                      </PopoverContent>
                    </Popover>
                  </h2>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <Switch checked={showLost} onCheckedChange={setShowLost} id="showLostToggle" />
                    <label htmlFor="showLostToggle" className="text-[9px] font-black uppercase text-zinc-500 cursor-pointer">Show Lost</label>
                  </div>
                </div>
                <div onClick={e => e.stopPropagation()}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Select value={sortProspects} onValueChange={setSortProspects}>
                            <SelectTrigger className="h-8 bg-zinc-900 border-zinc-800 text-[9px] font-black uppercase w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                              <SelectItem value="alphabetical" className="text-[10px] font-bold">Alphabetical</SelectItem>
                              <SelectItem value="newest" className="text-[10px] font-bold">Newest First</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Sort customers within this section.</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6">
              {filteredProspects.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {filteredProspects.map(prospect => renderCustomerCard(prospect, showLost ? 'lost' : 'prospects'))}
                </div>
              ) : (
                <div className="text-center py-10 bg-zinc-900/20 rounded-2xl border border-zinc-800 border-dashed">
                  <p className="text-zinc-500 font-bold uppercase tracking-widest">No active prospects found.</p>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </main>

      {/* Retention Hub Full Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-3xl rounded-[2rem] p-0 overflow-hidden max-h-[85vh] flex flex-col">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] pointer-events-none" />
          <DialogHeader className="p-6 border-b border-zinc-900 bg-zinc-900/50 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600/10 rounded-xl border border-blue-600/20">
                <Zap className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black uppercase tracking-tight italic">Direct Outreach</DialogTitle>
                <DialogDescription className="text-zinc-500 font-bold uppercase tracking-widest text-[9px] mt-1">Compose message for {selectedCustomer?.name}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            {selectedCustomer && (
              <RetentionHub 
                onOpenEstimate={() => openEstimate(selectedCustomer.id!)}
                customer={{
                  id: selectedCustomer.id,
                  name: selectedCustomer.name || 'Unknown',
                  email: selectedCustomer.email || '',
                  phone: selectedCustomer.phone || '',
                  type: selectedCustomer.type || 'customer',
                  notes: selectedCustomer.notes || ''
                }}
                onRefresh={() => {
                  setIsDialogOpen(false);
                  loadData(); 
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Page Modals rendering generic overlays */}
      <PageModal 
        isOpen={pageModal.isOpen} 
        onClose={() => setPageModal(prev => ({ ...prev, isOpen: false }))} 
        initialUrl={pageModal.url}
        component={pageModal.component}
        title={pageModal.title}
        icon={pageModal.icon}
      />

    </div>
  );
}
