import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSupabaseInvoices, getSupabasePayments } from "@/lib/supa-data";
import { getReceivables, Receivable } from "@/lib/receivables";
import { DollarSign, FileText, ArrowRight, ArrowDownRight, CreditCard, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDemoMode } from "@/contexts/DemoContext";
import DateRangeFilter, { DateRangeValue } from "@/components/filters/DateRangeFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export interface UnifiedPayment {
  id: string;
  source: 'Invoice' | 'Manual Income' | 'Online/Stripe';
  customerName: string;
  amount: number;
  date: string;
  status: string;
  reference?: string;
}

const Payments = () => {
  const [payments, setPayments] = useState<UnifiedPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [dateFilter, setDateFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const [sourceFilter, setSourceFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const { isDemoMode } = useDemoMode();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [invoices, manualIncome, onlinePayments] = await Promise.all([
          getSupabaseInvoices(),
          getReceivables(),
          getSupabasePayments()
        ]);

        const unified: UnifiedPayment[] = [];

        // 1. Paid Invoices
        invoices.forEach(inv => {
          const rawAmt = inv.paidAmount || (inv.paymentStatus === 'paid' ? inv.total : 0);
          const tipAmt = inv.tipAmount || 0;
          const totalReceived = rawAmt + (rawAmt <= inv.total && tipAmt > 0 ? tipAmt : 0);
          
          if (totalReceived > 0) {
            unified.push({
              id: inv.id || `inv-${inv.invoiceNumber}`,
              source: 'Invoice',
              customerName: inv.customerName || 'Unknown',
              amount: totalReceived,
              date: inv.paidDate || inv.date || inv.createdAt || new Date().toISOString(),
              status: inv.paymentStatus || 'paid',
              reference: `INV #${inv.invoiceNumber}`
            });
          }
        });

        // 2. Manual Income
        manualIncome.forEach((inc: Receivable) => {
          unified.push({
            id: inc.id,
            source: 'Manual Income',
            customerName: inc.customerName || 'Unknown',
            amount: inc.amount || 0,
            date: inc.date || inc.createdAt || new Date().toISOString(),
            status: 'paid',
            reference: inc.description || 'Manual Entry'
          });
        });

        // 3. Online/Stripe Payments (if any)
        onlinePayments.forEach((op: any) => {
          unified.push({
            id: op.id,
            source: 'Online/Stripe',
            customerName: op.booking?.customer_name || op.customerName || 'Online Customer',
            amount: op.amount || 0,
            date: op.created_at || op.createdAt || new Date().toISOString(),
            status: op.status || 'completed',
            reference: op.servicePackage || 'Online Booking'
          });
        });

        // Sort by date descending
        unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setPayments(unified);
      } catch (err) {
        console.error("Failed to load payments", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isDemoMode]);

  // Apply filters
  const filteredPayments = payments.filter(p => {
    // Search
    if (searchQuery && !p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) && !(p.reference || '').toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Source
    if (sourceFilter !== "all" && p.source !== sourceFilter) {
      return false;
    }
    // Date
    if (dateFilter !== "all") {
      const d = new Date(p.date);
      const now = new Date();
      if (dateFilter === "daily" && d.toDateString() !== now.toDateString()) return false;
      
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      if (dateFilter === "weekly" && d < startOfWeek) return false;
      
      if (dateFilter === "monthly" && (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) return false;
      if (dateFilter === "yearly" && d.getFullYear() !== now.getFullYear()) return false;
      if (dateFilter === "custom" && dateRange.from) {
        if (d < dateRange.from) return false;
        if (dateRange.to && d > dateRange.to) return false;
      }
    }
    return true;
  });

  const totalFilteredAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="All Payments" />
      <main className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        <Card className="p-6 bg-gradient-to-r from-emerald-900/30 to-emerald-950/30 border-emerald-500/20 shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-emerald-500/5 rotate-12 transform scale-150 pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-emerald-500/20 text-emerald-400">
                <DollarSign className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Universal Payment Ledger</h2>
                <p className="text-zinc-400 text-sm">Every payment tracked across the application.</p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-emerald-500/70 text-xs uppercase tracking-wider font-black mb-1">Total Filtered Amount</p>
              <p className="text-4xl font-black text-emerald-400">${totalFilteredAmount.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Search Customer or Reference</label>
            <div className="relative">
              <Input 
                placeholder="Search payments..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-white"
              />
            </div>
          </div>
          
          <div className="w-[200px]">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Source</label>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="Invoice">Invoices</SelectItem>
                <SelectItem value="Manual Income">Manual Income</SelectItem>
                <SelectItem value="Online/Stripe">Online/Stripe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full md:w-auto">
             <DateRangeFilter value={dateFilter} onChange={setDateFilter} dateRange={dateRange} onDateRangeChange={setDateRange} />
          </div>
        </div>

        {/* Table */}
        <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-950 border-b border-zinc-800">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-zinc-400 font-bold uppercase text-xs tracking-wider">Date</TableHead>
                  <TableHead className="text-zinc-400 font-bold uppercase text-xs tracking-wider">Customer</TableHead>
                  <TableHead className="text-zinc-400 font-bold uppercase text-xs tracking-wider">Source</TableHead>
                  <TableHead className="text-zinc-400 font-bold uppercase text-xs tracking-wider">Reference</TableHead>
                  <TableHead className="text-zinc-400 font-bold uppercase text-xs tracking-wider">Status</TableHead>
                  <TableHead className="text-right text-zinc-400 font-bold uppercase text-xs tracking-wider">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-zinc-500">
                      <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-emerald-500" />
                      Loading Payments...
                    </TableCell>
                  </TableRow>
                ) : filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-zinc-500 font-medium">
                      No payments found matching the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((p) => (
                    <TableRow key={p.id} className="border-zinc-800/50 hover:bg-zinc-800/30 transition-colors group">
                      <TableCell className="text-zinc-300 font-medium whitespace-nowrap">
                        {new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-white font-bold whitespace-nowrap">
                        {p.customerName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`
                          whitespace-nowrap 
                          ${p.source === 'Invoice' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' : ''}
                          ${p.source === 'Manual Income' ? 'border-purple-500/30 text-purple-400 bg-purple-500/10' : ''}
                          ${p.source === 'Online/Stripe' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : ''}
                        `}>
                          {p.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm max-w-[250px] truncate">
                        {p.reference || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-none">
                          {p.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-black text-emerald-400">
                        ${p.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Payments;
