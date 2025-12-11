import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Printer, Save, Trash2, FileBarChart, DollarSign, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { getInvoices, upsertInvoice, getCustomers, deleteInvoice, getEstimates, addEstimate } from "@/lib/db";
import { Customer } from "@/components/customers/CustomerModal";
import { servicePackages, addOns } from "@/lib/services";
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
  const [estimates, setEstimates] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'invoices' | 'estimates'>('invoices');
  const [createType, setCreateType] = useState<'invoice' | 'estimate'>('invoice');
  const [selectedPackage, setSelectedPackage] = useState("");
  const [selectedVehicleType, setSelectedVehicleType] = useState<"compact" | "midsize" | "truck" | "luxury">("midsize");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [invs, custs, ests] = await Promise.all([getInvoices(), getCustomers(), getEstimates()]);

    // Assign invoice numbers starting from 100
    const invoicesWithNumbers = (invs as Invoice[]).map((inv, idx) => ({
      ...inv,
      invoiceNumber: inv.invoiceNumber || 100 + idx
    }));

    setInvoices(invoicesWithNumbers);
    setCustomers(custs as Customer[]);
    setEstimates(ests || []);
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

    // Get next invoice number
    const maxInvoiceNum = invoices.reduce((max, inv) => Math.max(max, inv.invoiceNumber || 99), 99);

    const invoice: Invoice = {
      invoiceNumber: maxInvoiceNum + 1,
      customerId: selectedCustomer,
      customerName: customer.name,
      vehicle: `${customer.year} ${customer.vehicle} ${customer.model}`,
      services,
      total: calculateTotal(),
      date: new Date().toLocaleDateString(),
      createdAt: new Date().toISOString(),
      paymentStatus: "unpaid",
      paidAmount: 0,
    };

    if (createType === 'estimate') {
      await addEstimate({ ...invoice, status: 'Open', invoiceNumber: undefined });
      toast({ title: "Success", description: "Estimate created successfully" });
      setViewMode('estimates');
    } else {
      await upsertInvoice(invoice);
      toast({ title: "Success", description: "Invoice created successfully" });
      setViewMode('invoices');
    }
    setSelectedCustomer("");
    setServices([]);
    setShowCreateForm(false);
    loadData();
  };

  const generatePDF = (invoice: Invoice, download = false) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Prime Detail Solutions", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text("Invoice", 105, 30, { align: "center" });
    doc.text(`Invoice #${invoice.invoiceNumber || 'N/A'}`, 105, 38, { align: "center" });
    doc.text(`Date: ${invoice.date}`, 20, 50);
    doc.text(`Customer: ${invoice.customerName}`, 20, 60);
    doc.text(`Vehicle: ${invoice.vehicle}`, 20, 70);

    let y = 85;
    doc.text("Services:", 20, y);
    y += 10;
    invoice.services.forEach((s) => {
      doc.text(`${s.name}: $${s.price.toFixed(2)}`, 30, y);
      y += 8;
    });

    y += 5;
    doc.setFontSize(14);
    doc.text(`Total: $${invoice.total.toFixed(2)}`, 20, y);

    y += 10;
    doc.setFontSize(10);
    const status = invoice.paymentStatus || "unpaid";
    doc.text(`Payment Status: ${status.toUpperCase()}`, 20, y);
    if (invoice.paidAmount && invoice.paidAmount > 0) {
      y += 6;
      doc.text(`Paid: $${invoice.paidAmount.toFixed(2)}`, 20, y);
    }

    if (download) {
      doc.save(`Invoice_${invoice.invoiceNumber}_${new Date().toISOString().split('T')[0]}.pdf`);
    } else {
      window.open(doc.output('bloburl'), '_blank');
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    await deleteInvoice(id);
    setDeleteId(null);
    toast({ title: "Deleted", description: "Invoice deleted successfully" });
    loadData();
  };

  const filterItems = () => {
    const source = viewMode === 'estimates' ? estimates : invoices;
    const now = new Date();
    return source.filter(inv => {
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

      return passQuick && passRange && passCustomer;
    });
  };

  const totalOutstanding = filterItems()
    .filter(inv => (inv.paymentStatus || "unpaid") !== "paid")
    .reduce((sum, inv) => sum + (inv.total - (inv.paidAmount || 0)), 0);

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

  const generateListPDF = (download = false) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Invoice List", 20, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 28);
    let y = 40;
    filterItems().forEach((inv) => {
      doc.setFontSize(10);
      const status = inv.paymentStatus || "unpaid";
      doc.text(`#${inv.invoiceNumber} | ${inv.customerName} | $${inv.total.toFixed(2)} | ${status.toUpperCase()} | ${inv.date}`, 20, y);
      y += 7;
      if (y > 280) { doc.addPage(); y = 20; }
    });
    if (download) doc.save(`Invoices_${new Date().toISOString().split('T')[0]}.pdf`);
    else window.open(doc.output('bloburl'), '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Invoicing" />
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-foreground">Invoicing</h1>
              <div className="flex bg-muted rounded-lg p-1">
                <Button
                  variant={viewMode === 'invoices' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('invoices')}
                  className="rounded-md"
                >
                  Invoices
                </Button>
                <Button
                  variant={viewMode === 'estimates' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('estimates')}
                  className="rounded-md"
                >
                  Estimates
                </Button>
              </div>
            </div>
            <div className="flex gap-3 items-center flex-wrap w-full md:w-auto">
              <Link to="/reports">
                <Button variant="outline" size="sm">
                  <FileBarChart className="h-4 w-4 mr-2" />Reports
                </Button>
              </Link>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-40">
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
              <Button variant="outline" size="sm" onClick={() => generateListPDF(false)}>
                <Printer className="h-4 w-4 mr-2" />Print
              </Button>
              <Button variant="outline" size="sm" onClick={() => generateListPDF(true)}>
                <Save className="h-4 w-4 mr-2" />Save PDF
              </Button>
              <div className="flex gap-2">
                <Button onClick={() => { setCreateType('invoice'); setShowCreateForm(!showCreateForm); }} className="bg-gradient-hero">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
                <Button onClick={() => { setCreateType('estimate'); setShowCreateForm(!showCreateForm); }} variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Create Estimate
                </Button>
              </div>
            </div>
          </div>

          {/* Customer Filter */}
          <Card className="p-4 bg-gradient-card border-border">
            <Label htmlFor="customer-filter" className="text-sm font-medium mb-2 block">Filter by Customer</Label>
            <div className="flex gap-2 items-center">
              <Select value={filterCustomerId || "all"} onValueChange={(val) => setFilterCustomerId(val === "all" ? "" : val)}>
                <SelectTrigger id="customer-filter" className="flex-1">
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filterCustomerId && (
                <Button variant="outline" size="sm" onClick={() => setFilterCustomerId("")}>
                  Clear
                </Button>
              )}
            </div>
          </Card>

          {/* Outstanding Balance */}
          <Card className="p-6 bg-gradient-card border-border">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-destructive/20 rounded-lg">
                <DollarSign className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Outstanding Balance</p>
                <h3 className="text-2xl font-bold text-foreground">${totalOutstanding.toFixed(2)}</h3>
              </div>
            </div>
          </Card>

          {showCreateForm && (
            <Card className="p-6 bg-gradient-card border-border">
              <h2 className="text-xl font-bold text-foreground mb-4">New {createType === 'estimate' ? 'Estimate' : 'Invoice'}</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="customer">Select Customer</Label>
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id!}>
                          {c.name} - {c.vehicle} {c.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Estimates: Service Package & Addons Selection */}
                {createType === 'estimate' && (
                  <>
                    <div className="border-t border-border pt-4">
                      <Label>Select Service Package</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <Select value={selectedPackage} onValueChange={(val) => {
                          setSelectedPackage(val);
                          const pkg = servicePackages.find(p => p.id === val);
                          if (pkg) {
                            const price = pkg.pricing[selectedVehicleType] || 0;
                            setServices([{ name: pkg.name, price }]);
                            setSelectedAddons([]); // Clear addons when changing package
                          }
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose package..." />
                          </SelectTrigger>
                          <SelectContent>
                            {servicePackages.map(pkg => {
                              const price = pkg.pricing[selectedVehicleType] || 0;
                              return (
                                <SelectItem key={pkg.id} value={pkg.id}>
                                  {pkg.name} - ${price}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <Select value={selectedVehicleType} onValueChange={(val: any) => {
                          setSelectedVehicleType(val);
                          if (selectedPackage) {
                            const pkg = servicePackages.find(p => p.id === selectedPackage);
                            if (pkg) {
                              const price = pkg.pricing[val] || 0;
                              setServices([{ name: pkg.name, price }]);
                            }
                          }
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Vehicle type..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="compact">Compact (Cars, Small Sedans)</SelectItem>
                            <SelectItem value="midsize">Midsize (Sedans, Small SUVs)</SelectItem>
                            <SelectItem value="truck">Truck/SUV (Large Vehicles)</SelectItem>
                            <SelectItem value="luxury">Luxury (Premium Vehicles)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                  </>
                )}

                {/* Manual Service Entry for Invoices */}
                {createType === 'invoice' && (
                  <div className="border-t border-border pt-4">
                    <Label>Add Services</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Service name"
                        value={newService.name}
                        onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                      />
                      <Input
                        type="number"
                        placeholder="Price"
                        value={newService.price}
                        onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                        className="w-32"
                      />
                      <Button onClick={addService} variant="outline">Add</Button>
                    </div>
                  </div>
                )}

                {services.length > 0 && (
                  <div className="space-y-2">
                    {services.map((s, i) => (
                      <div key={i} className="flex justify-between items-center p-2 bg-background/50 rounded">
                        <span>{s.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">${s.price.toFixed(2)}</span>
                          <Button size="icon" variant="ghost" onClick={() => removeService(i)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="text-right text-xl font-bold text-primary pt-2 border-t">
                      Total: ${calculateTotal().toFixed(2)}
                    </div>
                  </div>
                )}

                <Button onClick={createInvoice} className="w-full bg-gradient-hero">
                  Create {createType === 'estimate' ? 'Estimate' : 'Invoice'}
                </Button>
              </div>
            </Card>
          )}

          <div className="grid gap-4">
            {filterItems().map((inv) => (
              <Card
                key={inv.id}
                className="p-4 bg-gradient-card border-border cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedInvoice(inv)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-foreground">{viewMode === 'estimates' ? 'Estimate' : 'Invoice'} #{inv.invoiceNumber || 'N/A'}</h3>
                    <p className="text-sm text-muted-foreground">{inv.customerName}</p>
                    <p className="text-sm text-muted-foreground">{inv.vehicle}</p>
                    <p className="text-sm text-muted-foreground">Date: {inv.date}</p>
                    <p className="text-lg font-bold text-primary mt-2">Total: ${inv.total.toFixed(2)}</p>
                    <p className={`text-sm font-medium mt-1 ${(inv.paymentStatus || "unpaid") === "paid" ? "text-success" :
                      (inv.paymentStatus || "unpaid") === "partially-paid" ? "text-yellow-500" :
                        "text-destructive"
                      }`}>
                      {(inv.paymentStatus || "unpaid").replace("-", " ").toUpperCase()}
                      {inv.paidAmount && inv.paidAmount > 0 ? ` ($${inv.paidAmount.toFixed(2)} paid)` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="outline" onClick={() => generatePDF(inv, false)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="outline" onClick={() => generatePDF(inv, true)}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteId(inv.id!)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      disabled={viewMode === 'estimates'}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (viewMode !== 'estimates' && inv.services && Array.isArray(inv.services)) {
                          setSelectedInvoice(inv);
                          const remaining = inv.total - (inv.paidAmount || 0);
                          setPaymentAmount(remaining > 0 ? String(remaining.toFixed(2)) : "");
                          setPaymentDialogOpen(true);
                        }
                      }}
                    >
                      Record Payment
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="button-group-responsive">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDeleteInvoice(deleteId)}>Delete</AlertDialogAction>
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

      {/* Invoice Detail Dialog */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedInvoice(null)}>
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-auto bg-background" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Invoice #{selectedInvoice.invoiceNumber}</h2>
                  <p className="text-muted-foreground">Prime Detail Solutions</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(null)}>✕</Button>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <div>
                  <Label className="text-sm font-semibold">Customer</Label>
                  <p className="text-foreground">{selectedInvoice.customerName}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Vehicle</Label>
                  <p className="text-foreground">{selectedInvoice.vehicle}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Date</Label>
                  <p className="text-foreground">{selectedInvoice.date}</p>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <Label className="text-sm font-semibold mb-2 block">Services</Label>
                <div className="space-y-2">
                  {(selectedInvoice.services || []).map((s, i) => (
                    <div key={i} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                      <span>{s.name}</span>
                      <span className="font-semibold">${s.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">${selectedInvoice.total.toFixed(2)}</span>
                </div>
                <div className="mt-2">
                  <p className={`text-sm font-medium ${(selectedInvoice.paymentStatus || "unpaid") === "paid" ? "text-success" :
                    (selectedInvoice.paymentStatus || "unpaid") === "partially-paid" ? "text-yellow-500" :
                      "text-destructive"
                    }`}>
                    Status: {(selectedInvoice.paymentStatus || "unpaid").replace("-", " ").toUpperCase()}
                  </p>
                  {selectedInvoice.paidAmount && selectedInvoice.paidAmount > 0 && (
                    <p className="text-sm text-muted-foreground">Paid: ${selectedInvoice.paidAmount.toFixed(2)}</p>
                  )}
                </div>
              </div>

              <div className="border-t border-border pt-4 flex gap-2 justify-end">
                <Button variant="outline" onClick={() => generatePDF(selectedInvoice, false)}>
                  <Printer className="h-4 w-4 mr-2" />Print
                </Button>
                <Button variant="outline" onClick={() => generatePDF(selectedInvoice, true)}>
                  <Save className="h-4 w-4 mr-2" />Save PDF
                </Button>
                {viewMode === 'invoices' && (selectedInvoice.paymentStatus || 'unpaid') !== 'paid' && (
                  <Button
                    onClick={() => {
                      const remaining = selectedInvoice.total - (selectedInvoice.paidAmount || 0);
                      setPaymentAmount(remaining > 0 ? String(remaining.toFixed(2)) : "");
                      setPaymentDialogOpen(true);
                    }}
                    className="bg-gradient-hero"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Record Payment
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
