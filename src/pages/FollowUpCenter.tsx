import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { useBookingsStore } from "@/store/bookings";
import { getSupabaseCustomers, Customer } from "@/lib/supa-data";
import { RetentionHub } from "@/components/customers/RetentionHub";
import { Search, Clock, ArrowRight, Settings, X, ExternalLink, CalendarDays, Zap, FileText } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useFollowUpStatus, useFollowUpSettings } from "@/hooks/useFollowUpStatus";

export default function FollowUpCenter() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  
  const { items: allBookings } = useBookingsStore();
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [prospects, setProspects] = useState<Customer[]>([]);
  
  const followUpStatus = useFollowUpStatus(allCustomers, allBookings);
  const { settings, saveSettings } = useFollowUpSettings();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const loadData = async () => {
    try {
      const all = await getSupabaseCustomers();
      setAllCustomers(all);
      setProspects(all.filter(c => (c.type || '').toLowerCase() === 'prospect'));
    } catch (e) {
      console.error("Failed to load customers", e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openFollowUpDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDialogOpen(true);
  };

  const handleViewProfile = (customerId: string, customerName: string) => {
    navigate(`/search-customer?customerId=${customerId}&search=${encodeURIComponent(customerName)}`);
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

  const filteredOverdue = followUpStatus.overdue.filter(c => matchSearch(c.customer));
  const filteredDueSoon = [...followUpStatus.dueThisWeek, ...followUpStatus.dueThisMonth].filter(c => matchSearch(c.customer));
  const filteredProspects = prospects.filter(matchSearch);

  const renderCustomerCard = (item: any, isProspect = false) => {
    let daysSince = 0;
    let lastServiceDate = null;
    let serviceTitle = "Never booked";
    
    if (!isProspect) {
      daysSince = item.daysSince;
      lastServiceDate = item.lastActivityDate;
      const customerBookings = allBookings.filter(b => b.customerId === item.customer.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (customerBookings.length > 0) {
        serviceTitle = customerBookings[0].title || "Unknown Service";
      } else {
        serviceTitle = "No booking found";
      }
    } else {
      const p = item as Customer;
      const createdDate = p.created_at ? new Date(p.created_at) : new Date();
      daysSince = Math.floor((new Date().getTime() - createdDate.getTime()) / (1000 * 3600 * 24));
      lastServiceDate = createdDate;
    }

    const customer = isProspect ? (item as Customer) : item.customer;

    return (
      <div key={customer.id} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between gap-6 hover:bg-zinc-900/60 transition-colors shadow-lg overflow-hidden relative group">
        <div className="space-y-3 flex-1 min-w-0 z-10">
          <div className="flex flex-wrap items-center gap-3">
            <h5 className="text-xl font-black uppercase tracking-tight text-zinc-200 truncate">{customer.name}</h5>
            {isProspect && <Badge className="bg-purple-500/20 text-purple-400 text-[9px] uppercase font-black px-2 py-0.5 border-none">Prospect</Badge>}
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
              <span className="text-[9px] uppercase font-black text-zinc-600 tracking-widest">Service Type</span>
              <div className="flex items-center gap-2 mt-1">
                <FileText className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-bold text-zinc-300 truncate max-w-[150px]">{serviceTitle}</span>
              </div>
            </div>

            <div className="bg-zinc-950/50 px-4 py-2 rounded-xl border border-zinc-800/50 flex flex-col">
              <span className="text-[9px] uppercase font-black text-zinc-600 tracking-widest">Time Elapsed</span>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-bold text-zinc-300">{daysSince} Days</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 justify-center z-10 shrink-0 w-full sm:w-48">
          <Button 
            onClick={() => openFollowUpDialog(customer)}
            className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-transform hover:scale-105 active:scale-95"
          >
            Send Follow-up
            <ArrowRight className="ml-2 h-3 w-3" />
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/letter-maker?customerId=${customer.id}`)}
              className="w-full h-9 bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white font-black text-[9px] uppercase tracking-widest rounded-xl px-1"
            >
              Write Letter
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/estimates?customerId=${customer.id}&add=true`)}
              className="w-full h-9 bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white font-black text-[9px] uppercase tracking-widest rounded-xl px-1"
            >
              Send Estimate
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() => handleViewProfile(customer.id!, customer.name!)}
            className="w-full h-9 bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-colors"
          >
            <ExternalLink className="mr-2 h-3 w-3" /> View Profile
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <Navbar />
      <main className="container mx-auto px-4 md:px-6 pt-6 max-w-6xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6 mb-10">
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
                <Settings className="h-5 w-5 text-zinc-500 hidden sm:block" />
                <span className="text-[10px] uppercase font-black text-zinc-500 tracking-widest shrink-0">Threshold: {settings.threshold} {settings.unit}</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Input 
                  type="number" 
                  value={settings.threshold === 0 ? '' : settings.threshold}
                  onChange={(e) => saveSettings({ ...settings, threshold: e.target.value ? parseInt(e.target.value) : 0 })}
                  className="w-16 h-8 text-center font-bold bg-zinc-950 border-zinc-700 text-xs shrink-0"
                />
                <Select value={settings.unit} onValueChange={(v: 'days' | 'months') => saveSettings({ ...settings, unit: v })}>
                  <SelectTrigger className="w-24 h-8 bg-zinc-950 border-zinc-700 text-xs font-black uppercase tracking-widest shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="days" className="text-xs font-black uppercase tracking-widest">Days</SelectItem>
                    <SelectItem value="months" className="text-xs font-black uppercase tracking-widest">Months</SelectItem>
                  </SelectContent>
                </Select>
                <div className="h-6 w-px bg-zinc-800 mx-2 hidden sm:block" />
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] uppercase font-black text-zinc-500">Active</span>
                  <Switch checked={settings.active} onCheckedChange={(v) => saveSettings({ ...settings, active: v })} />
                </div>
            </div>
          </div>
        </div>

        <div className="relative mb-12">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-zinc-500 z-10" />
          <Input 
            placeholder="Search by name, email, or phone..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-16 pr-16 bg-zinc-900/80 border-zinc-800 h-16 rounded-[2rem] text-lg font-bold placeholder:text-zinc-600 focus:ring-blue-500/20 focus:border-blue-500/40"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors z-20">
              <X className="h-6 w-6" />
            </button>
          )}
        </div>

        <div className="space-y-16">
          <section>
            <div className="flex items-center gap-4 mb-6 pb-2 border-b-2 border-red-500/20">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-red-500">Overdue ({filteredOverdue.length})</h2>
            </div>
            {filteredOverdue.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {filteredOverdue.map(item => renderCustomerCard(item, false))}
              </div>
            ) : (
              <div className="text-center py-12 bg-zinc-900/20 rounded-2xl border border-zinc-800 border-dashed">
                <p className="text-zinc-500 font-bold uppercase tracking-widest">No overdue customers found.</p>
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center gap-4 mb-6 pb-2 border-b-2 border-amber-500/20">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-amber-500">Due Soon ({filteredDueSoon.length})</h2>
            </div>
            {filteredDueSoon.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {filteredDueSoon.map(item => renderCustomerCard(item, false))}
              </div>
            ) : (
              <div className="text-center py-12 bg-zinc-900/20 rounded-2xl border border-zinc-800 border-dashed">
                <p className="text-zinc-500 font-bold uppercase tracking-widest">No customers due soon.</p>
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center gap-4 mb-6 pb-2 border-b-2 border-purple-500/20">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-purple-400">Prospects ({filteredProspects.length})</h2>
            </div>
            {filteredProspects.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {filteredProspects.map(prospect => renderCustomerCard(prospect, true))}
              </div>
            ) : (
              <div className="text-center py-12 bg-zinc-900/20 rounded-2xl border border-zinc-800 border-dashed">
                <p className="text-zinc-500 font-bold uppercase tracking-widest">No active prospects found.</p>
              </div>
            )}
          </section>
        </div>
      </main>

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
    </div>
  );
}
