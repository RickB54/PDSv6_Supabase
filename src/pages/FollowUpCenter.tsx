import { useState, useMemo } from "react";
import { useBookingsStore, Booking } from "@/store/bookings";
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
  Send
} from "lucide-react";
import { format, addMonths, isBefore, differenceInDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { onSendReminderEmail } from "@/lib/bookingsSync";
import { toast } from "sonner";

export default function FollowUpCenter() {
  const { items: allBookings } = useBookingsStore();
  const [search, setSearch] = useState("");

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
      // Calculate due date
      const lastService = new Date(booking.date);
      const frequency = parseInt(String(booking.reminderFrequency || "6"));
      const dueDate = addMonths(lastService, frequency);
      const isDue = isBefore(dueDate, new Date());
      const daysRemaining = differenceInDays(dueDate, new Date());
      
      const frequencyLabel = 
        frequency === 1 ? '1 Month' :
        frequency === 3 ? '3 Months' :
        frequency === 4 ? '4 Months' :
        frequency === 6 ? '6 Months' :
        `${frequency} Months`;

      return {
        ...booking,
        lastServiceDate: lastService,
        dueDate,
        isDue,
        daysRemaining,
        frequencyLabel
      };
    }).sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [allBookings]);

  const filtered = customerFollowUps.filter(c => 
    c.customer?.toLowerCase().includes(search.toLowerCase()) || 
    c.customerEmail?.toLowerCase().includes(search.toLowerCase()) ||
    c.title?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: customerFollowUps.length,
    dueNow: customerFollowUps.filter(c => c.isDue).length,
    upcoming: customerFollowUps.filter(c => !c.isDue && c.daysRemaining < 30).length,
  };

  const handleSendReminder = async (customer: any) => {
    try {
      await onSendReminderEmail(customer, customer.frequencyLabel);
      toast.success(`Professional follow-up sent to ${customer.customer}!`);
    } catch (e) {
      toast.error("Failed to send follow-up. Please try again.");
    }
  };

  const handleSendAllDue = async () => {
    const due = customerFollowUps.filter(c => c.isDue);
    if (!due.length) return;
    
    if (confirm(`Are you sure you want to send professional follow-ups to all ${due.length} customers?`)) {
      toast.info(`Sending ${due.length} follow-ups in the background...`);
      for (const customer of due) {
        await handleSendReminder(customer);
      }
      toast.success("Batch follow-up complete.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
              <Bell className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter leading-none italic">
                Follow-Up <span className="text-blue-500">Center</span>
              </h1>
              <p className="text-zinc-500 font-medium uppercase tracking-widest text-xs mt-1">
                Customer Retention & Loyalty Engine
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <Button 
             variant="outline" 
             onClick={handleSendAllDue}
             disabled={stats.dueNow === 0}
             className="bg-blue-600 hover:bg-blue-700 text-white border-0 font-bold uppercase tracking-tight"
           >
             <Send className="mr-2 h-4 w-4" />
             Send All Due ({stats.dueNow})
           </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl">
           <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Total Retention Pool</p>
                <Users className="h-4 w-4 text-blue-400" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black">{stats.total}</span>
                <span className="text-zinc-500 text-sm font-bold mb-1">Active Customers</span>
              </div>
           </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl border-l-4 border-l-red-500">
           <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Maintenance Due</p>
                <Clock className="h-4 w-4 text-red-500" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-red-500">{stats.dueNow}</span>
                <span className="text-zinc-500 text-sm font-bold mb-1 italic">Engagement Required</span>
              </div>
           </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl border-l-4 border-l-amber-500">
           <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Upcoming (30 Days)</p>
                <Calendar className="h-4 w-4 text-amber-500" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-amber-500">{stats.upcoming}</span>
                <span className="text-zinc-500 text-sm font-bold mb-1">Nearing Term</span>
              </div>
           </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative mb-8 max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
        <Input 
          placeholder="SEARCH CUSTOMERS, EMAILS OR SERVICES..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-12 bg-zinc-900/80 border-zinc-800 h-14 rounded-2xl text-lg font-bold placeholder:text-zinc-700 placeholder:uppercase"
        />
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {filtered.length > 0 ? (
          filtered.map((customer) => (
            <div 
              key={customer.id} 
              className={cn(
                "group relative overflow-hidden bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 transition-all hover:bg-zinc-900/60 hover:border-zinc-700",
                customer.isDue && "border-l-4 border-l-red-500"
              )}
            >
               {/* Background Glow */}
               <div className={cn(
                 "absolute -top-12 -right-12 w-48 h-48 blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity rounded-full",
                 customer.isDue ? "bg-red-500" : "bg-blue-500"
               )} />

               <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
                  <div className="flex items-start gap-6">
                     <div className={cn(
                       "h-16 w-16 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-110",
                       customer.isDue 
                         ? "bg-red-500/10 border-red-500/20 text-red-500" 
                         : "bg-blue-500/10 border-blue-500/20 text-blue-500"
                     )}>
                        <User className="h-8 w-8" />
                     </div>
                     
                     <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           <h3 className="text-xl font-black uppercase tracking-tight">{customer.customer}</h3>
                           {customer.isDue && (
                             <Badge className="bg-red-600 text-[10px] font-black uppercase tracking-widest px-2 py-0">OVERDUE</Badge>
                           )}
                        </div>
                        <p className="text-zinc-500 font-bold text-sm tracking-tight">{customer.customerEmail}</p>
                        <div className="flex flex-wrap items-center gap-4 mt-2">
                           <div className="flex items-center gap-1.5 text-[11px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-800/50 px-3 py-1 rounded-full">
                              <Sparkles className="h-3 w-3" />
                              Last: {customer.title}
                           </div>
                           <div className="flex items-center gap-1.5 text-[11px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-800/50 px-3 py-1 rounded-full">
                              <Calendar className="h-3 w-3" />
                              {format(customer.lastServiceDate, 'MMM dd, yyyy')}
                           </div>
                           <div className="flex items-center gap-1.5 text-[11px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-full">
                              <ShieldCheck className="h-3 w-3" />
                              Term: {customer.frequencyLabel}
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                     <div className="text-right flex-1 sm:flex-none">
                        <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Maintenance Next Date:</p>
                        <p className={cn(
                          "text-xl font-black",
                          customer.isDue ? "text-red-500" : "text-white"
                        )}>
                           {format(customer.dueDate, 'MMM dd, yyyy')}
                        </p>
                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-tight">
                           {customer.isDue 
                             ? `${Math.abs(customer.daysRemaining)} Days Past Maintenance` 
                             : `Due in ${customer.daysRemaining} Days`}
                        </p>
                     </div>

                     <Button 
                       onClick={() => handleSendReminder(customer)}
                       className={cn(
                         "h-14 px-8 rounded-2xl font-black uppercase tracking-tighter transition-all",
                         customer.isDue 
                           ? "bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-900/20" 
                           : "bg-zinc-800 hover:bg-zinc-700 text-white"
                       )}
                     >
                        Send Professional Follow-up
                        <ArrowRight className="ml-2 h-5 w-5" />
                     </Button>
                  </div>
               </div>
            </div>
          ))
        ) : (
          <div className="py-24 text-center border-2 border-dashed border-zinc-800 rounded-3xl">
             <Mail className="h-16 w-16 text-zinc-800 mx-auto mb-4" />
             <h2 className="text-2xl font-black text-zinc-700 uppercase italic">No Retention Targets Found</h2>
             <p className="text-zinc-600 mt-2">Adjust your search or wait for upcoming maintenance intervals.</p>
          </div>
        )}
      </div>
    </div>
  );
}
