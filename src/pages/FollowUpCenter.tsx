import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { useBookingsStore } from "@/store/bookings";
import { useCouponsStore } from "@/store/coupons";
import { getSupabaseCustomers, Customer, supabase, upsertSupabaseCustomer } from "@/lib/supa-data";
import { RetentionHub } from "@/components/customers/RetentionHub";
import { Search, Clock, ArrowRight, Settings, X, ExternalLink, CalendarDays, Zap, FileText, CheckCircle, Ticket, Mail, Calendar, Trash2, UserPlus, EyeOff } from "lucide-react";
import { format, isSameMonth } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useFollowUpStatus, useFollowUpSettings } from "@/hooks/useFollowUpStatus";
import { toast } from "sonner";
import { onSendReminderEmail, onSendProspectEmail } from "@/lib/bookingsSync";

export default function FollowUpCenter() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  
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

  const loadData = async () => {
    try {
      const all = await getSupabaseCustomers();
      setAllCustomers(all);
      setProspects(all.filter(c => (c.type || '').toLowerCase() === 'prospect'));
      setLostProspects(all.filter(c => (c.type || '').toLowerCase() === 'lost_prospect'));
    } catch (e) {
      console.error("Failed to load customers", e);
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

  const handleMarkContacted = async () => {
    if (!selectedCustomer) return;
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
      const prospect = allCustomers.find(c => c.id === customerId);
      if (prospect) {
        await upsertSupabaseCustomer({ ...prospect, type: 'prospect' });
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
          <div className="grid grid-cols-2 gap-2 w-full">
            {section === 'overdue' && (
              <>
                <Button onClick={() => openFollowUpDialog(customer)} className="w-full bg-blue-600 hover:bg-blue-700 text-[9px] font-black uppercase tracking-widest h-9 px-1">
                  <Mail className="h-3 w-3 mr-1" /> Follow-up
                </Button>
                <Button variant="outline" onClick={() => { setSelectedCustomer(customer); setIsNoteDialogOpen(true); }} className="w-full bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-[9px] font-black uppercase tracking-widest h-9 px-1">
                  <CheckCircle className="h-3 w-3 mr-1" /> Contacted
                </Button>
                <Button variant="outline" onClick={() => openFollowUpDialog(customer)} className="w-full col-span-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 border-emerald-500/20 text-[9px] font-black uppercase tracking-widest h-9 px-1">
                  <Ticket className="h-3 w-3 mr-1" /> Apply Coupon & Send
                </Button>
              </>
            )}
            {section === 'dueSoon' && (
              <>
                <Button onClick={async () => {
                  const cb = allBookings.find(b => b.customerId === customer.id);
                  if (cb) await onSendReminderEmail(cb, "Manual Outreach");
                  else toast.error("No booking found to generate reminder.");
                }} className="w-full bg-amber-600 hover:bg-amber-700 text-[9px] font-black uppercase tracking-widest h-9 px-1">
                  Reminder
                </Button>
                <Button variant="outline" onClick={() => { setSelectedCustomer(customer); setIsNoteDialogOpen(true); }} className="w-full bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-[9px] font-black uppercase tracking-widest h-9 px-1">
                  <CheckCircle className="h-3 w-3 mr-1" /> Contacted
                </Button>
              </>
            )}
            {section === 'prospects' && (
              <>
                <Button onClick={async () => await onSendProspectEmail(customer)} className="w-full bg-purple-600 hover:bg-purple-700 text-[9px] font-black uppercase tracking-widest h-9 px-1">
                  Welcome Email
                </Button>
                <Button variant="outline" onClick={() => handleConvertProspect(customer.id!)} className="w-full bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-emerald-500 hover:text-emerald-400 text-[9px] font-black uppercase tracking-widest h-9 px-1">
                  <UserPlus className="h-3 w-3 mr-1" /> Convert
                </Button>
              </>
            )}
            {section === 'lost' && (
              <Button onClick={() => handleRestoreProspect(customer.id!)} className="w-full col-span-2 bg-emerald-600 hover:bg-emerald-700 text-[9px] font-black uppercase tracking-widest h-9">
                Restore Prospect
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="outline" onClick={() => navigate(`/letter-maker?customerId=${customer.id}`)} className="w-full bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[9px] font-black uppercase tracking-widest h-9 px-1">
              Write Letter
            </Button>
            <Button variant="outline" onClick={() => navigate(`/estimates?customerId=${customer.id}&add=true`)} className="w-full bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[9px] font-black uppercase tracking-widest h-9 px-1">
              Estimate
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2 w-full">
            <Button variant="outline" onClick={() => handleViewProfile(customer.id!, customer.name!)} className="w-full bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[9px] font-black uppercase h-9 px-1" title="View Profile">
              <ExternalLink className="h-3 w-3" />
            </Button>
            <Button variant="outline" onClick={() => window.dispatchEvent(new CustomEvent('open-new-booking-modal', { detail: { customer } }))} className="w-full bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[9px] font-black uppercase h-9 px-1" title="Schedule Booking">
              <Calendar className="h-3 w-3" />
            </Button>
            {section !== 'lost' ? (
              <Select onValueChange={(v) => handleSnooze(customer.id!, parseInt(v))}>
                <SelectTrigger className="w-full bg-zinc-950 border-zinc-800 text-zinc-400 text-[9px] font-black h-9 px-2">
                  <Clock className="h-3 w-3 mr-1" /> Snooze
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                  <SelectItem value="7" className="text-[10px] font-bold">Snooze 7d</SelectItem>
                  <SelectItem value="14" className="text-[10px] font-bold">Snooze 14d</SelectItem>
                  <SelectItem value="30" className="text-[10px] font-bold">Snooze 30d</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Button variant="outline" onClick={() => { if(confirm("Are you sure?")) { /* delete functionality */ } }} className="w-full bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-red-500 hover:text-red-400 text-[9px] font-black uppercase h-9 px-1" title="Delete Prospect">
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
          {section === 'prospects' && (
             <Button variant="ghost" onClick={() => handleLostProspect(customer.id!)} className="w-full hover:bg-zinc-800 text-zinc-500 hover:text-red-400 text-[9px] font-black uppercase tracking-widest h-7 mt-1">
               <EyeOff className="h-3 w-3 mr-1" /> Mark as Lost
             </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <Navbar />
      <main className="container mx-auto px-4 md:px-6 pt-6 max-w-6xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                <Zap className="h-8 w-8 text-blue-500 fill-blue-500" />
              </div>
              <h1 className="text-4xl font-black uppercase tracking-tighter italic">Retention <span className="text-blue-500">Hub</span></h1>
            </div>
            <p className="text-zinc-500 font-bold text-sm tracking-wide">Manage follow-ups and nurture prospects seamlessly.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Input 
                  type="number" 
                  value={settings.threshold === 0 ? '' : settings.threshold}
                  onChange={(e) => saveSettings({ ...settings, threshold: e.target.value ? parseInt(e.target.value) : 0 })}
                  className="w-16 h-8 text-center font-bold bg-zinc-950 border-zinc-700 text-xs shrink-0"
                />
                <span className="text-[10px] uppercase font-black text-zinc-500 tracking-widest shrink-0">Days</span>
            </div>
            <div className="h-6 w-px bg-zinc-800 mx-2 hidden sm:block" />
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] uppercase font-black text-zinc-500">Active</span>
              <Switch checked={settings.active} onCheckedChange={(v) => saveSettings({ ...settings, active: v })} />
            </div>
          </div>
        </div>

        {/* Stats Row */}
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
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-red-500">Overdue ({filteredOverdue.length})</h2>
                </div>
                <div onClick={e => e.stopPropagation()}>
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
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-amber-500">Due Soon ({filteredDueSoon.length})</h2>
                </div>
                <div onClick={e => e.stopPropagation()}>
                    <Select value={sortDueSoon} onValueChange={setSortDueSoon}>
                      <SelectTrigger className="h-8 bg-zinc-900 border-zinc-800 text-[9px] font-black uppercase w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                        <SelectItem value="most_overdue" className="text-[10px] font-bold">Closest to Due</SelectItem>
                        <SelectItem value="highest_value" className="text-[10px] font-bold">Highest Value</SelectItem>
                        <SelectItem value="alphabetical" className="text-[10px] font-bold">Alphabetical</SelectItem>
                      </SelectContent>
                    </Select>
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
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-purple-400">Prospects ({filteredProspects.length})</h2>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <Switch checked={showLost} onCheckedChange={setShowLost} id="showLostToggle" />
                    <label htmlFor="showLostToggle" className="text-[9px] font-black uppercase text-zinc-500 cursor-pointer">Show Lost</label>
                  </div>
                </div>
                <div onClick={e => e.stopPropagation()}>
                    <Select value={sortProspects} onValueChange={setSortProspects}>
                      <SelectTrigger className="h-8 bg-zinc-900 border-zinc-800 text-[9px] font-black uppercase w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                        <SelectItem value="alphabetical" className="text-[10px] font-bold">Alphabetical</SelectItem>
                        <SelectItem value="most_overdue" className="text-[10px] font-bold">Oldest First</SelectItem>
                      </SelectContent>
                    </Select>
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

      {/* Contact Note Modal */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
         <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-sm rounded-[2rem]">
            <DialogHeader>
               <DialogTitle className="font-black uppercase italic tracking-tighter text-xl">Log Manual Contact</DialogTitle>
               <DialogDescription className="text-zinc-500 font-bold text-xs">Record how you contacted {selectedCustomer?.name}. This will reset their clock.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
               <Input 
                 placeholder="e.g. Called and left a voicemail..." 
                 value={contactNote}
                 onChange={(e) => setContactNote(e.target.value)}
                 className="bg-zinc-900 border-zinc-800 h-12 text-sm"
               />
            </div>
            <DialogFooter>
               <Button variant="outline" onClick={() => setIsNoteDialogOpen(false)} className="bg-zinc-900 border-zinc-800 text-zinc-400">Cancel</Button>
               <Button onClick={handleMarkContacted} className="bg-emerald-600 hover:bg-emerald-700 font-black uppercase tracking-widest text-[10px]">Save & Reset Clock</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}
