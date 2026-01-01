import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Printer, Save, Trash2, Plus, Search, CheckCircle, CreditCard, Filter } from "lucide-react";
import { getInvoices, upsertInvoice, deleteInvoice } from "@/lib/db";
import { getSupabaseCustomers } from "@/lib/supa-data";
import { Customer } from "@/components/customers/CustomerModal";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { PaymentDialog } from "@/components/invoicing/PaymentDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DateRangeFilter, { DateRangeValue } from "@/components/filters/DateRangeFilter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Invoice {
  id?: string;
  invoiceNumber?: number;
  customerId: string;
  customerName: string;
  vehicle: string;
  services: { name: string; price: number }[];
  total: number;
  date: string;
  createdAt: string;
  paymentStatus?: "unpaid" | "partially-paid" | "paid";
  paidAmount?: number;
  paidDate?: string;
}

const Invoicing = () => {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [services, setServices] = useState<{ name: string; price: number }[]>([]);
  const [newService, setNewService] = useState({ name: "", price: "" });
  const [dateFilter, setDateFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [filterCustomerId, setFilterCustomerId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [invs, custs] = await Promise.all([getInvoices(), getSupabaseCustomers()]);
    // Assign invoice numbers starting from 100 if missing
    const invoicesWithNumbers = (invs as Invoice[]).map((inv, idx) => ({
      ...inv,
      invoiceNumber: inv.invoiceNumber || 100 + idx
    }));
    setInvoices(invoicesWithNumbers);
    setCustomers(custs as Customer[]);
  };

  const addService = () => {
    if (newService.name && newService.price) {
      setServices([...services, { name: newService.name, price: parseFloat(newService.price) }]);
      setNewService({ name: "", price: "" });
    }
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const calculateTotal = () => services.reduce((sum, s) => sum + s.price, 0);

  const createInvoice = async () => {
    if (!selectedCustomer || services.length === 0) {
      toast({ title: "Error", description: "Please select a customer and add services", variant: "destructive" });
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomer);
    if (!customer) return;

    const maxInvoiceNum = invoices.reduce((max, inv) => Math.max(max, inv.invoiceNumber || 99), 99);
    const vehicleDesc = `${customer.year || ''} ${customer.vehicle || ''} ${customer.model || ''}`;

    const invoice: Invoice = {
      invoiceNumber: maxInvoiceNum + 1,
      customerId: selectedCustomer,
      customerName: customer.name,
      vehicle: vehicleDesc.trim() || "Unknown Vehicle",
      services,
      total: calculateTotal(),
      date: new Date().toLocaleDateString(),
      createdAt: new Date().toISOString(),
      paymentStatus: "unpaid",
      paidAmount: 0,
    };

    await upsertInvoice(invoice);
    toast({ title: "Success", description: "Invoice created successfully" });

    setSelectedCustomer("");
    setServices([]);
    setShowCreateForm(false);
    loadData();
  };

  const handleDeleteInvoice = async (id: string) => {
    await deleteInvoice(id);
    setDeleteId(null);
    toast({ title: "Deleted", description: "Invoice deleted successfully" });
    loadData();
  };

  const filterItems = () => {
    const now = new Date();
    return invoices.filter(inv => {
      const invDate = new Date(inv.createdAt || inv.date);
      let passQuick = true;
      if (dateFilter === "daily") passQuick = invDate.toDateString() === now.toDateString();
      else if (dateFilter === "weekly") passQuick = invDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      else if (dateFilter === "monthly") passQuick = invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();

      let passRange = true;
      if (dateRange.from) passRange = invDate >= new Date(dateRange.from.setHours(0, 0, 0, 0));
      if (passRange && dateRange.to) passRange = invDate <= new Date(dateRange.to.setHours(23, 59, 59, 999));

      let passCustomer = true;
      if (filterCustomerId) passCustomer = inv.customerId === filterCustomerId;

      let passSearch = true;
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        passSearch =
          (inv.customerName || '').toLowerCase().includes(lower) ||
          String(inv.invoiceNumber || '').includes(lower);
      }

      return passQuick && passRange && passCustomer && passSearch;
    });
  };

  const filteredInvoices = filterItems();
  const totalOutstanding = filteredInvoices
    .filter(inv => (inv.paymentStatus || "unpaid") !== "paid")
    .reduce((sum, inv) => sum + (inv.total - (inv.paidAmount || 0)), 0);

  const totalRevenue = filteredInvoices
    .reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);

  const updatePayment = async () => {
    if (!selectedInvoice) return;
    const amt = parseFloat(paymentAmount);
    if (Number.isNaN(amt) || amt <= 0) return;
    const newPaid = (selectedInvoice.paidAmount || 0) + amt;
    const status = newPaid >= selectedInvoice.total ? "paid" : "partially-paid";
    const updated: Invoice = { ...selectedInvoice, paidAmount: newPaid, paymentStatus: status, paidDate: new Date().toISOString() };
    await upsertInvoice(updated);
    setPaymentDialogOpen(false);
    setPaymentAmount("");
    setSelectedInvoice(updated);
    loadData();
    toast({ title: "Payment recorded", description: `Added $${amt.toFixed(2)} to invoice #${updated.invoiceNumber}` });
  };

  const generatePDF = (invoice: Invoice, download = false) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(16, 185, 129); // Emerald color
    doc.text("Prime Auto Detail", 105, 20, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text("INVOICE", 105, 30, { align: "center" });
    doc.text(`Invoice #${invoice.invoiceNumber || 'N/A'}`, 105, 38, { align: "center" });

    doc.setFontSize(10);
    doc.text(`Date: ${invoice.date}`, 20, 50);
    doc.text(`Customer: ${invoice.customerName}`, 20, 56);
    doc.text(`Vehicle: ${invoice.vehicle}`, 20, 62);

    let y = 80;
    doc.setFontSize(12);
    doc.text("Services:", 20, y);
    y += 8;

    doc.setFontSize(10);
    invoice.services.forEach((s) => {
      doc.text(`${s.name}`, 25, y);
      doc.text(`$${s.price.toFixed(2)}`, 180, y, { align: "right" });
      y += 7;
    });

    y += 5;
    doc.line(20, y, 190, y);
    y += 10;

    doc.setFontSize(14);
    doc.text("Total:", 140, y);
    doc.text(`$${invoice.total.toFixed(2)}`, 180, y, { align: "right" });

    if (invoice.paidAmount && invoice.paidAmount > 0) {
      y += 8;
      doc.setFontSize(10);
      doc.setTextColor(16, 185, 129);
      doc.text(`Paid: $${invoice.paidAmount.toFixed(2)}`, 180, y, { align: "right" });

      const balance = invoice.total - invoice.paidAmount;
      if (balance > 0) {
        y += 6;
        doc.setTextColor(239, 68, 68);
        doc.text(`Balance Due: $${balance.toFixed(2)}`, 180, y, { align: "right" });
      }
    }

    if (download) doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
    else window.open(doc.output('bloburl'), '_blank');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Invoicing" />

      <main className="container mx-auto px-4 py-6 max-w-6xl space-y-6">

        {/* Stats Card */}
        <Card className="p-6 bg-gradient-to-r from-zinc-900 to-zinc-800 border-zinc-700 shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-emerald-500/5 rotate-12 transform scale-150 pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-emerald-500/20 text-emerald-400">
                <FileText className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Invoicing & Payments</h2>
                <p className="text-zinc-400 text-sm">Manage billing and track revenue</p>
              </div>
            </div>

            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Outstanding</p>
                <p className="text-3xl font-bold text-red-400 mt-1">${totalOutstanding.toFixed(2)}</p>
              </div>
              <div className="text-center border-l border-zinc-700 pl-8">
                <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Revenue</p>
                <p className="text-3xl font-bold text-emerald-400 mt-1">${totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
          <div className="flex gap-2 w-full md:w-auto items-center">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-950 border-zinc-800"
              />
            </div>
            <Select value={filterCustomerId || "all"} onValueChange={(val) => setFilterCustomerId(val === "all" ? "" : val)}>
              <SelectTrigger className="w-[180px] bg-zinc-950 border-zinc-800">
                <SelectValue placeholder="All Customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customers.map(c => <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2 items-center w-full md:w-auto justify-end">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[130px] bg-zinc-950 border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="daily">Today</SelectItem>
                <SelectItem value="weekly">This Week</SelectItem>
                <SelectItem value="monthly">This Month</SelectItem>
              </SelectContent>
            </Select>
            <DateRangeFilter value={dateRange} onChange={setDateRange} storageKey="invoices-range" />
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white border-0" onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" /> New Invoice
            </Button>
          </div>
        </div>

        {showCreateForm && (
          <Card className="p-6 bg-zinc-900 border-zinc-800 animate-in slide-in-from-top-4">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold text-white">Create New Invoice</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400">Select Customer</Label>
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800">
                      <SelectValue placeholder="Choose customer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id!}>{c.name} - {c.vehicle}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800">
                  <Label className="text-zinc-400 mb-2 block">Line Items</Label>
                  <div className="flex gap-2 mb-4">
                    <Input
                      placeholder="Service Description"
                      value={newService.name}
                      onChange={e => setNewService({ ...newService, name: e.target.value })}
                      className="bg-zinc-900 border-zinc-800 text-zinc-200"
                    />
                    <Input
                      type="number"
                      placeholder="Price"
                      value={newService.price}
                      onChange={e => setNewService({ ...newService, price: e.target.value })}
                      className="w-32 bg-zinc-900 border-zinc-800 text-zinc-200"
                    />
                    <Button size="icon" variant="outline" onClick={addService} className="border-zinc-700 hover:bg-zinc-800">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {services.length > 0 ? (
                    <div className="space-y-2">
                      {services.map((s, i) => (
                        <div key={i} className="flex justify-between items-center p-2 bg-zinc-900 rounded border border-zinc-800/50">
                          <span className="text-sm text-zinc-300">{s.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-emerald-400">${s.price.toFixed(2)}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-500 hover:text-red-400" onClick={() => removeService(i)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <div className="pt-3 mt-3 border-t border-zinc-800 flex justify-between items-center">
                        <span className="font-bold text-zinc-400">Total</span>
                        <span className="font-bold text-xl text-white">${calculateTotal().toFixed(2)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-zinc-600 italic text-sm">No items added yet</div>
                  )}

                  <Button onClick={createInvoice} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={services.length === 0 || !selectedCustomer}>
                    Generate Invoice
                  </Button>
                </div>
              </div>

              <div className="hidden md:flex items-center justify-center p-6 bg-emerald-500/5 rounded-xl border border-emerald-500/10 border-dashed">
                <div className="text-center">
                  <FileText className="h-16 w-16 text-emerald-500/30 mx-auto mb-4" />
                  <h3 className="text-emerald-500 font-medium">Ready to invoice</h3>
                  <p className="text-sm text-emerald-500/60 max-w-xs mt-2">Generate clean, professional invoices and track payments easily.</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Invoice List */}
        <div className="space-y-4">
          {filteredInvoices.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(invoice => (
                <div key={invoice.id} className="group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/30 transition-all hover:shadow-lg hover:shadow-emerald-500/5 cursor-pointer" onClick={() => setSelectedInvoice(invoice)}>
                  <div className="flex items-center gap-4 mb-4 md:mb-0">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center border ${(invoice.paymentStatus === 'paid')
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                      }`}>
                      {(invoice.paymentStatus === 'paid') ? <CheckCircle className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-lg">#{invoice.invoiceNumber}</span>
                        <span className="text-zinc-500 text-sm">• {invoice.date}</span>
                      </div>
                      <div className="font-medium text-zinc-300">{invoice.customerName}</div>
                      <div className="text-xs text-zinc-500">{invoice.vehicle}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 justify-between md:justify-end w-full md:w-auto">
                    <div className="text-right">
                      <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Amount</div>
                      <div className="text-xl font-bold text-white">${invoice.total.toFixed(2)}</div>
                    </div>

                    <div className="text-right min-w-[100px]">
                      <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Status</div>
                      <div className={`font-medium ${invoice.paymentStatus === 'paid' ? 'text-emerald-400' :
                        invoice.paymentStatus === 'partially-paid' ? 'text-amber-400' : 'text-red-400'
                        }`}>
                        {(invoice.paymentStatus || 'unpaid').toUpperCase()}
                      </div>
                    </div>

                    <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={() => generatePDF(invoice, true)}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-400/10" onClick={() => setDeleteId(invoice.id!)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-zinc-900/30 rounded-xl border border-zinc-800 dashed border-2">
              <div className="inline-flex items-center justify-center p-4 rounded-full bg-zinc-900 mb-4 text-zinc-600">
                <FileText className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-medium text-zinc-300">No invoices found</h3>
              <p className="text-zinc-500 mt-1 max-w-sm mx-auto">Try adjusting your filters or create a new invoice to get started.</p>
              <Button className="mt-6 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowCreateForm(true)}>
                Create Invoice
              </Button>
            </div>
          )}
        </div>

      </main>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Always verify before deleting financial records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="button-group-responsive">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDeleteInvoice(deleteId)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        invoice={selectedInvoice}
        paymentAmount={paymentAmount}
        setPaymentAmount={setPaymentAmount}
        onConfirm={updatePayment}
      />

      {/* Detail Modal */}
      {selectedInvoice && !paymentDialogOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedInvoice(null)}>
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-zinc-950 border-zinc-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    Invoice #{selectedInvoice.invoiceNumber}
                    {(selectedInvoice.paymentStatus === 'paid') && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                  </h2>
                  <p className="text-zinc-400">Prime Auto Detail</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(null)} className="h-8 w-8 p-0 rounded-full hover:bg-zinc-900">✕</Button>
              </div>

              <div className="grid grid-cols-2 gap-8 py-6 border-t border-b border-zinc-800">
                <div>
                  <Label className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Bill To</Label>
                  <div className="mt-1 font-medium text-zinc-200 text-lg">{selectedInvoice.customerName}</div>
                  <div className="text-sm text-zinc-400">{selectedInvoice.vehicle}</div>
                </div>
                <div className="text-right">
                  <Label className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Details</Label>
                  <div className="mt-1 text-zinc-300">Date: {selectedInvoice.date}</div>
                  <div className={`mt-1 font-bold ${(selectedInvoice.paymentStatus || 'unpaid') === 'paid' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {(selectedInvoice.paymentStatus || 'unpaid').toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="py-6 space-y-3">
                <Label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-4 block">Services Provided</Label>
                {selectedInvoice.services.map((s, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span className="text-zinc-300">{s.name}</span>
                    <span className="font-mono text-zinc-200">${s.price.toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-zinc-800 mt-4 pt-4 flex justify-between items-center">
                  <span className="text-lg font-bold text-white">Total</span>
                  <span className="text-2xl font-bold text-emerald-400">${selectedInvoice.total.toFixed(2)}</span>
                </div>
                {(selectedInvoice.paidAmount || 0) > 0 && (
                  <div className="flex justify-between items-center text-sm text-zinc-400">
                    <span>Amount Paid</span>
                    <span>-${selectedInvoice.paidAmount?.toFixed(2)}</span>
                  </div>
                )}
                {(selectedInvoice.paidAmount || 0) > 0 && (selectedInvoice.total - (selectedInvoice.paidAmount || 0) > 0) && (
                  <div className="flex justify-between items-center text-lg font-bold text-red-400 border-t border-zinc-800/50 pt-2">
                    <span>Balance Due</span>
                    <span>${(selectedInvoice.total - (selectedInvoice.paidAmount || 0)).toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-zinc-800">
                <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800 text-zinc-300" onClick={() => generatePDF(selectedInvoice, false)}>
                  <Printer className="h-4 w-4 mr-2" /> Print
                </Button>
                {(selectedInvoice.paymentStatus || 'unpaid') !== 'paid' && (
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setPaymentAmount((selectedInvoice.total - (selectedInvoice.paidAmount || 0)).toFixed(2)); setPaymentDialogOpen(true); }}>
                    <CreditCard className="h-4 w-4 mr-2" /> Record Payment
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Invoicing;
