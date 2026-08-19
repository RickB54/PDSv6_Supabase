import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSupabaseInvoices, getSupabasePayments } from "@/lib/supa-data";
import { getReceivables, Receivable } from "@/lib/receivables";
import { DollarSign, FileText, ArrowRight, ArrowDownRight, CreditCard, Activity, ArrowLeft, Trash2, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDemoMode } from "@/contexts/DemoContext";
import DateRangeFilter, { DateRangeValue } from "@/components/filters/DateRangeFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PaymentWorkflowHelp } from "@/components/help/PaymentWorkflowHelp";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface UnifiedPayment {
  id: string;
  source: 'Invoice' | 'Manual Income' | 'Online/Stripe' | 'Quick Pay';
  customerName: string;
  amount: number;
  date: string;
  status: string;
  reference?: string;
}

import { useNavigate } from "react-router-dom";

const Payments = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<UnifiedPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [dateFilter, setDateFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const [sourceFilter, setSourceFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  
  const handlePaymentClick = async (payment: UnifiedPayment) => {
    // Clear the notification badge in GlobalRightSidebar
    localStorage.setItem('last_viewed_payment_time', new Date().toISOString());
    window.dispatchEvent(new Event('payroll-updated'));

    if (payment.source === 'Invoice' || payment.source === 'Quick Pay') {
      try {
        const invoices = await getSupabaseInvoices();
        const inv = invoices.find(i => 
          i.id === payment.id || 
          (payment.reference && i.invoiceNumber && i.invoiceNumber === payment.reference.replace('INV #', '').replace(' (Owed)', '').trim())
        );
        if (inv) {
          setSelectedInvoice(inv);
        }
      } catch (err) {
        console.error("Failed to fetch invoice details", err);
      }
    }
  };
  
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

        // 1. All Invoices (Paid and Unpaid/Owed)
        invoices.forEach(inv => {
          const rawAmt = inv.paidAmount || (inv.paymentStatus === 'paid' ? inv.total : 0);
          const tipAmt = inv.tipAmount || 0;
          const totalReceived = rawAmt + (rawAmt <= inv.total && tipAmt > 0 ? tipAmt : 0);
          const amountOwed = (inv.total || 0) - totalReceived;
          const isPaid = inv.paymentStatus === 'paid' || totalReceived >= (inv.total || 0);
          
          if (totalReceived > 0 || amountOwed > 0) {
            unified.push({
              id: inv.id || `inv-${inv.invoiceNumber}`,
              source: 'Invoice',
              customerName: inv.customerName || 'Unknown',
              amount: isPaid ? totalReceived : (totalReceived > 0 ? totalReceived : amountOwed),
              date: inv.paidDate || inv.date || inv.createdAt || new Date().toISOString(),
              status: isPaid ? 'paid' : (totalReceived > 0 ? 'partial' : 'owed'),
              reference: `INV #${inv.invoiceNumber}${!isPaid && totalReceived === 0 ? ' (Owed)' : ''}`
            });
          }
        });

        // 2. Manual Income & Quick Pay
        manualIncome.forEach((inc: Receivable) => {
          const isQuickPay = inc.category === 'Quick Pay';
          unified.push({
            id: inc.id || `mi-${Date.now()}-${Math.random()}`,
            source: isQuickPay ? 'Quick Pay' : 'Manual Income',
            customerName: inc.customerName || 'Unknown',
            amount: inc.amount || 0,
            date: inc.date || inc.createdAt || new Date().toISOString(),
            status: 'paid',
            reference: inc.description || (isQuickPay ? 'Quick Pay Transaction' : 'Manual Entry')
          });
        });

        // 3. Online/Stripe Payments (if any)
        onlinePayments.forEach((op: any) => {
          // Skip if this payment is already represented by an invoice to prevent double-counting
          if (op.invoice_id && invoices.some(inv => inv.id === op.invoice_id)) return;
          
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
    // Status
    if (paymentStatusFilter !== "all" && p.status !== paymentStatusFilter) {
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
  const averagePaymentPerDetail = filteredPayments.length > 0 ? totalFilteredAmount / filteredPayments.length : 0;

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
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  Universal Payment Ledger
                  <PaymentWorkflowHelp variant="payments-dashboard" />
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="rounded-full p-1 hover:bg-zinc-800/50 transition-colors cursor-help">
                          <HelpCircle className="w-5 h-5 text-zinc-500 hover:text-rose-400" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[320px] bg-zinc-950 border-zinc-800 p-4 shadow-xl text-zinc-300 font-medium">
                        <p className="text-white font-bold mb-2">How to Delete Payments</p>
                        <ul className="space-y-2 text-sm">
                          <li><strong className="text-emerald-400">Invoices:</strong> To delete an Invoice payment, click the invoice to open the editor, then remove it from the "Payments Log" at the bottom.</li>
                          <li><strong className="text-blue-400">Quick Pay / Manual:</strong> Click the red trash icon directly in this ledger to permanently delete them.</li>
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </h2>
                <p className="text-zinc-400 text-sm">Every payment tracked across the application.</p>
              </div>
            </div>
            <div className="text-center md:text-right flex gap-6 items-end justify-end">
              <div>
                <p className="text-blue-500/70 text-xs uppercase tracking-wider font-black mb-1">Avg per Detail</p>
                <p className="text-4xl font-black text-blue-400 mb-2">${averagePaymentPerDetail.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-emerald-500/70 text-xs uppercase tracking-wider font-black mb-1">Total Filtered Amount</p>
                <p className="text-4xl font-black text-emerald-400 mb-2">${totalFilteredAmount.toFixed(2)}</p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <Button variant="outline" size="sm" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 w-full font-black uppercase tracking-widest text-[10px]" onClick={() => navigate('/payroll')}>
                  <ArrowRight className="w-4 h-4 mr-2" /> Payroll
              </Button>
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
                <SelectItem value="Quick Pay">Quick Pay</SelectItem>
                <SelectItem value="Online/Stripe">Online/Stripe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-[150px]">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Status</label>
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="owed">Amt Owed</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-[150px]">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Date</label>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="daily">Today</SelectItem>
                <SelectItem value="weekly">This Week</SelectItem>
                <SelectItem value="monthly">This Month</SelectItem>
                <SelectItem value="yearly">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {dateFilter === "custom" && (
            <div className="w-full md:w-auto">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block opacity-0">Custom</label>
              <DateRangeFilter value={dateRange} onChange={setDateRange} />
            </div>
          )}
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
                    <TableRow 
                      key={p.id} 
                      className="border-zinc-800/50 hover:bg-zinc-800/30 transition-colors group cursor-pointer"
                      onClick={() => handlePaymentClick(p)}
                    >
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
                          ${p.source === 'Quick Pay' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' : ''}
                          ${p.source === 'Online/Stripe' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : ''}
                        `}>
                          {p.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm max-w-[250px] truncate">
                        {p.reference || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          p.status === 'paid' ? "bg-emerald-500/10 text-emerald-400 border-none" : 
                          p.status === 'partial' ? "bg-blue-500/10 text-blue-400 border-none" :
                          "bg-amber-500/10 text-amber-400 border-none"
                        }>
                          {p.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-black text-emerald-400">
                        <div className="flex items-center justify-end gap-2">
                          <span>${p.amount.toFixed(2)}</span>
                          {(p.source === 'Manual Income' || p.source === 'Quick Pay') && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-red-500 hover:text-red-400 hover:bg-red-500/20 md:opacity-0 md:group-hover:opacity-100 transition-opacity" 
                              onClick={async (e) => { 
                                e.stopPropagation(); 
                                if (window.confirm("Are you sure you want to delete this payment record? This action cannot be undone.")) {
                                  try {
                                    const { deleteReceivable } = await import('@/lib/receivables');
                                    await deleteReceivable(p.id);
                                    setPayments(prev => prev.filter(payment => payment.id !== p.id));
                                  } catch (err) {
                                    console.error("Failed to delete payment", err);
                                  }
                                }
                              }}
                              title="Delete Payment"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>

      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-md bg-[#18181b] border-zinc-800 text-white rounded-xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 font-black tracking-wide flex items-center gap-2 text-xl">
              <FileText className="w-5 h-5 text-emerald-500" />
              Invoice #{selectedInvoice?.invoiceNumber || 'Detail'}
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6 mt-2">
              <div className="grid grid-cols-2 gap-4 bg-[#202025] p-4 rounded-xl border border-zinc-800/50">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-black text-zinc-500 mb-1">Date</p>
                  <p className="font-semibold text-zinc-200">{selectedInvoice.date || selectedInvoice.createdAt}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-black text-zinc-500 mb-1">Vehicle / Info</p>
                  <p className="font-semibold text-zinc-200">{selectedInvoice.vehicle || 'Not Specified'}</p>
                </div>
              </div>
              
              {selectedInvoice.services && selectedInvoice.services.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-black text-zinc-500 mb-3 pl-1">Services</p>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedInvoice.services.map((s: any, idx: number) => {
                      if (s.name?.startsWith('VIRTUAL_')) return null;
                      return (
                        <div key={idx} className="flex justify-between items-center p-3 bg-black/40 rounded-lg border border-zinc-800/30">
                          <span className="text-sm font-medium text-zinc-300">{s.name}</span>
                          <span className="font-black text-zinc-100">${(s.price || 0).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="border-t border-zinc-800/80 pt-5">
                <div className="flex justify-between items-center bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                  <span className="text-sm font-black uppercase tracking-widest text-emerald-500">Total</span>
                  <span className="text-2xl font-black text-emerald-400">${(selectedInvoice.total || 0).toFixed(2)}</span>
                </div>
              </div>
              
              <div className="pt-2">
                <Button 
                  onClick={() => navigate(`/invoice/${selectedInvoice.id}`)} 
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black tracking-wide h-12 shadow-[0_0_20px_rgba(37,99,235,0.2)]"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Open Interactive Invoice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payments;
