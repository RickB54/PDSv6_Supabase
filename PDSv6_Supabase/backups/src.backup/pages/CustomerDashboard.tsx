import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getInvoices } from "@/lib/db";
import { getCurrentUser, logout } from "@/lib/auth";
import { useNavigate, Link } from "react-router-dom";
import { FileText, Download, Eye, Clock, CheckCircle2, Trash2, ShoppingCart, CreditCard } from "lucide-react";
import jsPDF from "jspdf";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Job {
  jobId: string;
  customer: string;
  vehicle: string;
  service: string;
  status: "active" | "completed";
  finishedAt?: string;
}

interface Invoice {
  id?: string;
  invoiceNumber?: number;
  customerId: string;
  customerName: string;
  vehicle: string;
  services: { name: string; price: number }[];
  total: number;
  date: string;
  paymentStatus?: "unpaid" | "partially-paid" | "paid";
}

const CustomerDashboard = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const user = getCurrentUser();
  const navigate = useNavigate();
  const { items, subtotal, removeItem } = useCartStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const allInvoices = await getInvoices();
    const userInvoices = (allInvoices as Invoice[]).filter(
      inv => inv.customerName.toLowerCase() === user?.name.toLowerCase()
    );
    setInvoices(userInvoices);

    // Load jobs from localStorage
    const completedJobs = JSON.parse(localStorage.getItem('completedJobs') || '[]');
    const userJobs = completedJobs.filter((j: Job) => 
      j.customer.toLowerCase() === user?.name.toLowerCase()
    );
    setJobs(userJobs);
  };

  const downloadInvoice = (invoice: Invoice) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Prime Detail Solutions", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Invoice #${invoice.invoiceNumber || 'N/A'}`, 105, 30, { align: "center" });
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
    
    doc.save(`Invoice_${invoice.invoiceNumber}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const activeJobs = jobs.filter(j => j.status === "active");
  const completedJobs = jobs.filter(j => j.status === "completed");
  const unpaidInvoices = invoices.filter(inv => (inv.paymentStatus || "unpaid") !== "paid");
  const paidInvoices = invoices.filter(inv => (inv.paymentStatus || "unpaid") === "paid");

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="My Account" />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">Welcome, {user?.name}!</h1>
            <div className="flex gap-2">
              <Link to="/customer-profile" className="inline-flex items-center rounded-md border px-3 py-2 text-sm">Profile</Link>
              <Button variant="outline" onClick={() => { try { logout(); } finally { navigate('/login', { replace: true }); } }}>Logout</Button>
            </div>
          </div>

          {/* Active Jobs */}
          <Card className="p-6 bg-gradient-card border-border">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Active Jobs</h2>
            </div>
            {activeJobs.length === 0 ? (
              <p className="text-muted-foreground">No active jobs at the moment.</p>
            ) : (
              <div className="space-y-3">
                {activeJobs.map(job => (
                  <div key={job.jobId} className="p-4 bg-background/50 rounded border border-border">
                    <h3 className="font-semibold text-foreground">{job.service}</h3>
                    <p className="text-sm text-muted-foreground">{job.vehicle}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Completed Jobs */}
          <Card className="p-6 bg-gradient-card border-border">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="h-6 w-6 text-success" />
              <h2 className="text-2xl font-bold text-foreground">Job History</h2>
            </div>
            {completedJobs.length === 0 ? (
              <p className="text-muted-foreground">No completed jobs yet.</p>
            ) : (
              <div className="space-y-3">
                {completedJobs.map(job => (
                  <div key={job.jobId} className="p-4 bg-background/50 rounded border border-border">
                    <h3 className="font-semibold text-foreground">{job.service}</h3>
                    <p className="text-sm text-muted-foreground">{job.vehicle}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Completed: {job.finishedAt ? new Date(job.finishedAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Payments & Cart */}
          <Card className="p-6 bg-gradient-card border-border">
            <div className="flex items-center gap-3 mb-4">
              <ShoppingCart className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Payments & Cart</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* My Cart */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">My Cart</h3>
                {items.length === 0 ? (
                  <p className="text-muted-foreground">Your cart is empty.</p>
                ) : (
                  <div className="space-y-2">
                    {items.map(i => (
                      <div key={i.id} className="flex items-center justify-between p-3 bg-background/50 rounded border border-border">
                        <div>
                          <p className="font-semibold text-foreground">{i.name}</p>
                          <p className="text-sm text-muted-foreground">Qty: {i.quantity} {i.vehicleType ? `· ${i.vehicleType}` : ""}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-bold text-primary">${(i.price * i.quantity).toFixed(2)}</p>
                          <Button variant="ghost" size="icon" onClick={() => removeItem(i.id)} aria-label="Remove">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between p-2">
                      <span className="text-sm text-muted-foreground">Subtotal</span>
                      <span className="text-lg font-bold text-foreground">${subtotal().toFixed(2)}</span>
                    </div>
                  </div>
                )}
                {items.length > 0 && (
                  <div className="mt-3 flex items-center justify-end">
                    <Link to="/checkout">
                      <Button variant="default" className="bg-primary text-primary-foreground">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Make a Payment
                      </Button>
                    </Link>
                  </div>
                )}
              </div>

              {/* Unpaid Invoices */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Unpaid Invoices</h3>
                {unpaidInvoices.length === 0 ? (
                  <p className="text-muted-foreground">No unpaid invoices.</p>
                ) : (
                  <div className="space-y-2">
                    {unpaidInvoices.map(inv => (
                      <div key={inv.id} className="p-3 bg-background/50 rounded border border-border flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground">Invoice #{inv.invoiceNumber}</p>
                          <p className="text-sm text-muted-foreground">${inv.total.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Link to={`/checkout?invoice=${inv.id}`}>
                            <Button variant="default" className="bg-primary text-primary-foreground">
                              <CreditCard className="h-4 w-4 mr-2" />
                              Pay Invoice
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Payment History */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">Payment History</h3>
              {paidInvoices.length === 0 ? (
                <p className="text-muted-foreground">No payments yet.</p>
              ) : (
                <div className="space-y-2">
                  {paidInvoices.map(inv => (
                    <div key={inv.id} className="p-3 bg-background/50 rounded border border-border">
                      <div className="flex justify-between">
                        <span>Invoice #{inv.invoiceNumber} — {inv.date}</span>
                        <span className="font-semibold text-success">${inv.total.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Invoices */}
          <Card className="p-6 bg-gradient-card border-border">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">My Invoices</h2>
            </div>
            {invoices.length === 0 ? (
              <p className="text-muted-foreground">No invoices available.</p>
            ) : (
              <div className="space-y-3">
                {invoices.map(inv => (
                  <div key={inv.id} className="p-4 bg-background/50 rounded border border-border">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-foreground">Invoice #{inv.invoiceNumber}</h3>
                        <p className="text-sm text-muted-foreground">{inv.date}</p>
                        <p className="text-lg font-bold text-primary mt-1">${inv.total.toFixed(2)}</p>
                        <p className={`text-sm font-medium ${
                          (inv.paymentStatus || "unpaid") === "paid" ? "text-success" :
                          (inv.paymentStatus || "unpaid") === "partially-paid" ? "text-yellow-500" :
                          "text-destructive"
                        }`}>
                          {(inv.paymentStatus || "unpaid").replace("-", " ").toUpperCase()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="icon" variant="outline" onClick={() => setSelectedInvoice(inv)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline" onClick={() => downloadInvoice(inv)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice #{selectedInvoice?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{selectedInvoice.date}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vehicle</p>
                  <p className="font-medium">{selectedInvoice.vehicle}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Services</p>
                <div className="space-y-2">
                  {selectedInvoice.services.map((s, idx) => (
                    <div key={idx} className="flex justify-between p-2 bg-background/50 rounded">
                      <span>{s.name}</span>
                      <span className="font-semibold">${s.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-2xl font-bold text-primary">${selectedInvoice.total.toFixed(2)}</span>
                </div>
              </div>
              <Button onClick={() => downloadInvoice(selectedInvoice)} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerDashboard;
import { useCartStore } from "@/store/cart";
