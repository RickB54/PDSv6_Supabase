import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Printer, Save, Trash2, Plus, Search, CheckCircle, CreditCard, Filter, Pencil, X, Mail, Send, Loader2, HelpCircle } from "lucide-react";
import {
  getSupabaseInvoices,
  upsertSupabaseInvoice,
  deleteSupabaseInvoice,
  getSupabaseCustomers,
  upsertSupabaseCustomer,
  Customer
} from "@/lib/supa-data";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { PaymentDialog } from "@/components/invoicing/PaymentDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import supabase from "@/lib/supabase";
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

import { useDemoMode } from "@/contexts/DemoContext";
import { MOCK_INVOICES, MOCK_CUSTOMERS } from "@/lib/demoMockData";
import { generateInvoiceNumber } from "@/lib/utils";
import logo from "@/assets/pds-final-logo.png";
import { servicePackages, addOns, getServicePrice, getAddOnPrice, VehicleType as LibVehicleType } from "@/lib/services";
import { getCustomPackages } from "@/lib/servicesMeta";
import qrCode from "@/assets/review-qr.png";

interface Invoice {
  id?: string;
  invoiceNumber?: number;
  customerId: string;
  customerName: string;
  vehicle: string;
  services: { name: string; price: number }[];
  total: number;
  date: string;
  createdAt?: string;
  paymentStatus?: "unpaid" | "partially-paid" | "paid";
  paidAmount?: number;
  paidDate?: string;
  discount?: {
    type: "fixed" | "percent";
    value: number;
    amount: number;
  };
  notes?: string;
}

const Invoicing = () => {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const { isDemoMode } = useDemoMode();
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
  const [isEditingPaid, setIsEditingPaid] = useState(false);
  const [editPaidValue, setEditPaidValue] = useState("");
  const [serviceCategory, setServiceCategory] = useState<"package" | "addon" | "custom">("custom");
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [editServices, setEditServices] = useState<{ name: string; price: number }[]>([]);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailInvoiceId, setEmailInvoiceId] = useState<string | null>(null);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [customVehicle, setCustomVehicle] = useState("");
  const [editVehicle, setEditVehicle] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const location = useLocation();

  useEffect(() => {
    loadData();
  }, [isDemoMode, showArchived]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cid = params.get('customerId');
    if (cid) {
      setFilterCustomerId(cid);
      // Also try to pre-fill search term with customer name if we have it
      const cust = customers.find(c => c.id === cid);
      if (cust) {
        setSearchTerm(cust.name);
      }
    } else {
      // If no customerId in URL, reset the filter
      setFilterCustomerId("");
    }
  }, [location.search, customers]);

  const toBuiltInVehKey = (key: string): LibVehicleType => {
    const k = key?.toLowerCase();
    return (k === 'compact' || k === 'midsize' || k === 'truck' || k === 'luxury') ? (k as LibVehicleType) : 'midsize';
  };

  const loadData = async () => {
    if (isDemoMode) {
      setInvoices(MOCK_INVOICES.map((inv: any) => ({
        ...inv,
        invoiceNumber: parseInt(inv.invoiceNumber?.replace('INV-', '') || '100'),
        customerId: inv.id,
        vehicle: "Demo Vehicle",
        services: [{ name: "Detail Service", price: inv.total }],
        date: new Date(inv.createdAt).toLocaleDateString(),
        createdAt: inv.createdAt
      })));
      setCustomers(MOCK_CUSTOMERS as any[]);
      return;
    }
    const [invs, custs] = await Promise.all([getSupabaseInvoices(), getSupabaseCustomers()]);
    // 1. Process and format invoices
    const processedInvoices = (invs as Invoice[] || []).map((inv, idx) => {
      let finalNumber = inv.invoiceNumber || (100 + idx);
      const numStr = String(finalNumber);
      
      // If it's an "old" number (starts with 17) and we have a date, re-format it to look "new"
      // New format: YMMDDHHmm (9 digits, starts with 6 for 2026)
      if (numStr.startsWith('17') || numStr.length > 9) {
        try {
          const d = new Date(inv.createdAt || inv.date);
          if (!isNaN(d.getTime())) {
            const y = String(d.getFullYear()).slice(-1);
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const h = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            finalNumber = parseInt(`${y}${m}${day}${h}${min}`);
          }
        } catch (e) {
          console.warn("Failed to re-format old invoice number", e);
        }
      }

      return {
        ...inv,
        invoiceNumber: finalNumber,
        total: inv.total || 0,
        paymentStatus: inv.paymentStatus || 'unpaid',
        date: inv.date || new Date().toLocaleDateString()
      };
    });

    // 2. Deduplicate and Filter Archived
    const allCustomers = (custs as Customer[] || []);
    const activeCustomers = allCustomers.filter(c => !c.is_archived);
    const displayedCustomers = showArchived ? allCustomers : activeCustomers;
    const displayedCustomerIds = new Set(displayedCustomers.map(c => c.id));

    const seen = new Map<string, Invoice>();
    processedInvoices.forEach(inv => {
      // Skip if customer is archived and we're not showing archived
      if (!displayedCustomerIds.has(inv.customerId)) return;

      const day = new Date(inv.createdAt || inv.date).toDateString();
      const key = `${inv.customerId}_${inv.total.toFixed(2)}_${day}`;
      const existing = seen.get(key);
      
      if (!existing || (inv.id && existing.id && inv.id > existing.id)) {
        seen.set(key, inv);
      }
    });

    setInvoices(Array.from(seen.values()));
    setCustomers(displayedCustomers);
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

  const handleCustomerChange = (cid: string) => {
    setSelectedCustomer(cid);
    const c = customers.find(x => x.id === cid);
    if (c) {
      setCustomVehicle(`${c.year || ''} ${c.vehicle || ''} ${c.model || ''}`.trim());
    }
  };

  const createInvoice = async () => {
    if (!selectedCustomer || services.length === 0) {
      toast({ title: "Error", description: "Please select a customer and add services", variant: "destructive" });
      return;
    }

    if (isCreating) return;
    setIsCreating(true);

    // Simple Duplicate Check: Check if an invoice with same customer and total was created today
    const potentialDuplicate = invoices.find(inv => {
      const invDateStr = inv.createdAt || inv.date;
      if (!invDateStr) return false;
      const invDate = new Date(invDateStr);
      return inv.customerId === selectedCustomer && 
             Math.abs(inv.total - calculateTotal()) < 0.01 &&
             invDate.toDateString() === new Date().toDateString();
    });

    if (potentialDuplicate && !window.confirm("A similar invoice for this customer already exists for today. Create anyway?")) {
      setIsCreating(false);
      return;
    }

    if (isDemoMode) {
      toast({ title: "Simulation Mode", description: "Invoice simulated locally. No real data was created." });
      setSelectedCustomer("");
      setServices([]);
      setShowCreateForm(false);
      return;
    }

    try {
      const customer = customers.find(c => c.id === selectedCustomer);
      if (!customer) throw new Error("Customer not found in list");

      // 1. Ensure Customer exists in CRM (Sync Auth -> CRM if needed)
      // This is crucial if 'selectedCustomer' is an Auth User ID who hasn't been synced to 'customers' table yet.
      // We assume 'customer' object has at least a name, maybe email.
      const crmCustomer = await upsertSupabaseCustomer({
        id: customer.id, 
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        vehicle_info: {
          make: customer.vehicle?.split(' ')[1] || '',
          model: customer.model,
          year: customer.year
        }
      });

      // 2. Prepare Invoice
      const vehicleDesc = customVehicle || `${customer.year || ''} ${customer.vehicle || ''} ${customer.model || ''}`;

      const invoice: Invoice = {
        invoiceNumber: generateInvoiceNumber(),
        customerId: crmCustomer.id!,
        customerName: crmCustomer.full_name || customer.name,
        vehicle: vehicleDesc.trim() || "Unknown Vehicle",
        services,
        total: calculateTotal(),
        date: new Date().toLocaleDateString(),
        createdAt: new Date().toISOString(),
        paymentStatus: calculateTotal() === 0 ? "paid" : "unpaid",
        paidAmount: 0,
        notes: customNotes,
      };

      // 3. Create Invoice
      await upsertSupabaseInvoice(invoice);
      toast({ title: "Success", description: "Invoice created successfully" });

      setSelectedCustomer("");
      setServices([]);
      setCustomVehicle("");
      setCustomNotes("");
      setShowCreateForm(false);
      loadData();

    } catch (err: any) {
      console.error("Create Invoice Failed:", err);
      toast({
        title: "Failed to create invoice",
        description: err.message || "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (isDemoMode) {
      toast({ title: "Simulation Mode", description: "Delete simulated locally." });
      setDeleteId(null);
      return;
    }
    await deleteSupabaseInvoice(id);
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
  
  // Safe Sort: Create a copy and handle invalid dates
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    const dateA = new Date(a.createdAt || a.date).getTime() || 0;
    const dateB = new Date(b.createdAt || b.date).getTime() || 0;
    return dateB - dateA;
  });
  const totalOutstanding = filteredInvoices
    .filter(inv => (inv.paymentStatus || "unpaid") !== "paid")
    .reduce((sum, inv) => sum + (inv.total - (inv.paidAmount || 0)), 0);

  const totalRevenue = filteredInvoices
    .reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);

  const updatePayment = async () => {
    if (!selectedInvoice) return;
    const amt = parseFloat(paymentAmount);
    if (Number.isNaN(amt) || amt <= 0) return;

    try {
      if (isDemoMode) {
        toast({ title: "Simulation Mode", description: "Payment recorded in local state." });
        setPaymentDialogOpen(false);
        setPaymentAmount("");
        return;
      }

      const newPaid = (selectedInvoice.paidAmount || 0) + amt;
      const status = newPaid >= selectedInvoice.total ? "paid" : "partially-paid";
      const updated: Invoice = { ...selectedInvoice, paidAmount: newPaid, paymentStatus: status, paidDate: new Date().toISOString() };
      await upsertSupabaseInvoice(updated);
      setPaymentDialogOpen(false);
      setPaymentAmount("");
      setSelectedInvoice(updated);
      await loadData();
      toast({ title: "Payment recorded", description: `Added $${amt.toFixed(2)} to invoice #${updated.invoiceNumber}` });
    } catch (err: any) {
      console.error("Payment Error:", err);
      toast({ title: "Failed to record payment", description: err.message, variant: "destructive" });
    }
  };

  const saveEditedPaid = async () => {
    if (!selectedInvoice) return;
    const amt = parseFloat(editPaidValue);
    if (Number.isNaN(amt) || amt < 0) return; // Allow 0 to reset

    if (isDemoMode) {
      toast({ title: "Simulation Mode", description: "Manual payment update simulated." });
      setIsEditingPaid(false);
      return;
    }

    // Determine status based on new amount
    const status = amt >= selectedInvoice.total ? "paid" : amt > 0 ? "partially-paid" : "unpaid";

    const updated: Invoice = { ...selectedInvoice, paidAmount: amt, paymentStatus: status };
    if (amt >= selectedInvoice.total) {
      updated.paidDate = new Date().toISOString();
    }

    await upsertSupabaseInvoice(updated);
    setSelectedInvoice(updated);
    setIsEditingPaid(false);
    loadData();
    toast({ title: "Payment updated", description: `Payment amount manually updated to $${amt.toFixed(2)}` });
  };

  const handleEditInvoice = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setEditServices(inv.services ? [...inv.services] : []);
    setEditVehicle(inv.vehicle || "");
    setEditNotes(inv.notes || "");
    setIsEditingInvoice(true);
  };

  const saveEditedInvoice = async () => {
    if (!selectedInvoice) return;
    const subtotal = editServices.reduce((sum, s) => sum + s.price, 0);
    let newTotal = subtotal;
    if (selectedInvoice.discount) {
      newTotal -= selectedInvoice.discount.amount;
    }
    if (newTotal < 0) newTotal = 0;

    const updated: Invoice = { 
      ...selectedInvoice, 
      services: editServices, 
      vehicle: editVehicle,
      notes: editNotes,
      total: newTotal 
    };
    
    // Auto-update status if total changed
    if (updated.paidAmount && updated.paidAmount >= newTotal) {
      updated.paymentStatus = "paid";
    } else if (updated.paidAmount && updated.paidAmount > 0) {
      updated.paymentStatus = "partially-paid";
    } else if (newTotal === 0) {
      updated.paymentStatus = "paid";
    } else {
      updated.paymentStatus = "unpaid";
    }

    try {
      await upsertSupabaseInvoice(updated);
      setSelectedInvoice(updated);
      setIsEditingInvoice(false);
      await loadData();
      toast({ title: "Invoice Updated", description: "Changes saved successfully" });
    } catch (err: any) {
      console.error("Save Edit Failed:", err);
      toast({ title: "Failed to save changes", description: err.message, variant: "destructive" });
    }
  };

  const handleAddEditItem = (category: string, id: string) => {
    if (category === 'package') {
      const p = servicePackages.find(x => x.id === id);
      if (p) setEditServices([...editServices, { name: p.name, price: p.basePrice }]);
    } else if (category === 'addon') {
      const a = addOns.find(x => x.id === id);
      if (a) setEditServices([...editServices, { name: a.name, price: a.basePrice }]);
    }
  };

  const generatePDF = (invoice: Invoice, download = false) => {
    const doc = new jsPDF();
    
    // Add Logo - Top Center
    try {
      const logoWidth = 35;
      const logoHeight = 35;
      const xPos = (210 - logoWidth) / 2; // Center horizontally (A4 is 210mm wide)
      doc.addImage(logo, 'PNG', xPos, 10, logoWidth, logoHeight);
    } catch (e) {
      console.warn("Logo failed to load for PDF", e);
    }

    doc.setFontSize(18);
    doc.setTextColor(16, 185, 129); // Emerald color
    doc.text("Prime Auto Detail", 105, 52, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text("INVOICE", 105, 58, { align: "center" });
    doc.text(`Invoice #${invoice.invoiceNumber || 'N/A'}`, 105, 66, { align: "center" });

    doc.setFontSize(10);
    doc.text(`Service Date: ${invoice.date}`, 20, 80);
    doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`, 20, 86);
    doc.text(`Customer: ${invoice.customerName}`, 20, 92);
    doc.text(`Vehicle: ${invoice.vehicle}`, 20, 98);

    let y = 110;
    doc.setFontSize(12);
    doc.text("Services Provided:", 20, y);
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
    
    if (invoice.discount && invoice.discount.amount > 0) {
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      const discountLabel = invoice.discount.type === 'percent' 
        ? `Discount (${invoice.discount.value}%):` 
        : `Discount (Fixed):`;
      doc.text(discountLabel, 140, y);
      doc.text(`-$${invoice.discount.amount.toFixed(2)}`, 180, y, { align: "right" });
      y += 8;
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
    }

    doc.text("Total Amount:", 125, y);
    doc.text(`$${invoice.total.toFixed(2)}`, 180, y, { align: "right" });
    y += 10;

    if (invoice.paidAmount && invoice.paidAmount > 0) {
      y += 8;
      doc.setFontSize(10);
      doc.setTextColor(16, 185, 129);
      doc.text(`Paid: $${invoice.paidAmount.toFixed(2)}`, 180, y, { align: "right" });

      const balance = invoice.total - invoice.paidAmount;
      if (balance <= 0) {
        y += 8;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("PAID IN FULL", 180, y, { align: "right" });
        doc.setFont("helvetica", "normal");
      } else {
        y += 6;
        doc.setTextColor(239, 68, 68);
        doc.text(`Balance Due: $${balance.toFixed(2)}`, 180, y, { align: "right" });
      }
    } else if (invoice.total === 0) {
      y += 8;
      doc.setFontSize(14);
      doc.setTextColor(16, 185, 129);
      doc.setFont("helvetica", "bold");
      doc.text("PAID IN FULL", 180, y, { align: "right" });
      doc.setFont("helvetica", "normal");
    }

    if (invoice.notes) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      y += 15;
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60); // Darker grey
      doc.setFont("helvetica", "bold");
      doc.text("Notes:", 20, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      const splitNotes = doc.splitTextToSize(invoice.notes, 170);
      doc.text(splitNotes, 20, y + 6);
      y += (splitNotes.length * 5) + 5;
    }

    y += 20;
    doc.setTextColor(100);
    doc.setFontSize(10);
    doc.text("Thank you for trusting Prime Auto Detail with your vehicle!", 105, y, { align: "center" });
    doc.text("We truly appreciate your business and look forward to serving you again.", 105, y + 6, { align: "center" });

    if (download) doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
    else window.open(doc.output('bloburl'), '_blank');
  };

  const openEmailModal = (inv: Invoice) => {
    const customer = customers.find(c => c.id === inv.customerId);
    const firstName = customer?.name?.split(' ')[0] || 'Customer';
    const subtotal = inv.services.reduce((sum, s) => sum + s.price, 0);

    let summaryText = `Total: $${inv.total.toFixed(2)}`;
    if (inv.discount && inv.discount.amount > 0) {
      const discountSub = inv.total + inv.discount.amount;
      summaryText = `Subtotal: $${discountSub.toFixed(2)}\nDiscount: -$${inv.discount.amount.toFixed(2)}\nTotal: $${inv.total.toFixed(2)}`;
    }

    let notesText = "";
    if (inv.notes) {
      notesText = `\nNotes:\n${inv.notes}\n`;
    }

    const draft = `Hi ${firstName}!

Thank you for trusting Prime Auto Detail with your vehicle. It was a pleasure working on your car, and I truly appreciate your business.

Service Summary:
${summaryText}
${notesText}
${(inv.paymentStatus === 'paid' || inv.total === 0) ? 'Status: PAID IN FULL\n' : ''}
Attached is your invoice/receipt for your records.

If you were happy with the service, I would greatly appreciate it if you could take a moment to leave a review. Your feedback not only helps my business grow, but also helps others feel confident choosing Prime Auto Detail.

You can leave a review here: https://g.page/r/CUaXyAfwdcv1EBM/review

Thank you again for your support, and I look forward to working with you again in the future. 

Best regards,
Rick Berube
Prime Auto Detail
Precision. Protection. Perfection.`;

    setEmailSubject(`Invoice #${inv.invoiceNumber} from Prime Auto Detail`);
    setEmailRecipient(customer?.email || "");
    setEmailBody(draft);
    setEmailInvoiceId(inv.id || null);
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = async () => {
    if (!emailInvoiceId) return;
    setIsSendingEmail(true);

    try {
      const selectedInv = invoices.find(inv => inv.id === emailInvoiceId);
      const toEmail = emailRecipient.trim();

      if (!toEmail) {
        throw new Error("Please provide a recipient email address.");
      }

      // Convert body to simple HTML (replace newlines with <br>)
      const htmlBody = emailBody.replace(/\n/g, '<br/>');

      const { data, error } = await supabase.functions.invoke('send-booking-email', {
        body: {
          to: toEmail,
          subject: emailSubject,
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
              <div style="background: #000; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: #fff; margin: 0; font-size: 24px;">Prime Auto Detail</h1>
              </div>
              <div style="padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 10px 10px; background: #fff;">
                ${htmlBody}
              </div>
              <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #888;">
                &copy; ${new Date().getFullYear()} Prime Auto Detail. All rights reserved.
              </div>
            </div>
          `,
          customerName: customers.find(c => c.id === selectedInv?.customerId)?.name || 'Customer',
          price: selectedInv?.total || 0,
          date: selectedInv?.date || new Date().toLocaleDateString(),
          service: 'Detailing Service'
        }
      });

      if (error) throw error;
      
      toast({ title: "Email Sent", description: `Invoice successfully emailed to ${toEmail}` });
      setIsEmailModalOpen(false);
    } catch (err: any) {
      console.error("Email send failed:", err);
      toast({ 
        title: "Failed to send email", 
        description: err.message || "Unknown error occurred", 
        variant: "destructive" 
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Invoicing & Payments" showBack />

      <main className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
        {/* Help Modal */}
        <Dialog open={isHelpModalOpen} onOpenChange={setIsHelpModalOpen}>
          <DialogContent className="bg-zinc-950 border-zinc-800 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-emerald-500" />
                Invoice Numbering System
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                Understanding your professional invoice numbering logic.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-sm text-zinc-300 leading-relaxed">
              <p>
                To maintain professional records, all invoices use a chronological 9-digit numbering system: 
                <span className="text-emerald-400 font-mono ml-1">YMMDDHHmm</span>
              </p>
              
              <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Y</span>
                  <span>Year Digit (e.g., 6 for 2026)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">MM</span>
                  <span>Month (01-12)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">DD</span>
                  <span>Day (01-31)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">HH</span>
                  <span>Hour (00-23)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">mm</span>
                  <span>Minute (00-59)</span>
                </div>
              </div>

              <div className="p-3 rounded bg-emerald-500/5 border border-emerald-500/10 text-emerald-500/90 text-xs italic">
                Example: May 6, 2026, at 6:49 PM becomes <span className="font-bold underline">605061849</span>
              </div>

              <p>
                This system ensures every invoice number is unique, sortable, and provides instant context on when the service occurred without needing to open the file.
              </p>
            </div>
          </DialogContent>
        </Dialog>
        {/* Email Invoice Modal */}
        <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
          <DialogContent className="bg-zinc-950 border-zinc-800 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Mail className="h-5 w-5 text-emerald-500" />
                Send Invoice Email
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                Personalize the message before sending it to the customer.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Recipient Email</Label>
                <Input 
                  value={emailRecipient}
                  onChange={e => setEmailRecipient(e.target.value)}
                  placeholder="customer@example.com"
                  className="bg-zinc-900 border-zinc-800 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Subject</Label>
                <Input 
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Message Body</Label>
                <Textarea 
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-white min-h-[200px] text-sm leading-relaxed"
                />
              </div>

            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="ghost" onClick={() => setIsEmailModalOpen(false)} className="text-zinc-400 hover:text-white">
                Cancel
              </Button>
              <Button 
                onClick={handleSendEmail} 
                disabled={isSendingEmail}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold min-w-[120px]"
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
            <div className="flex items-center gap-2 bg-zinc-950/50 px-3 py-1.5 rounded-md border border-zinc-800/50">
              <input 
                id="show-archived-main"
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-zinc-800 bg-zinc-950 accent-emerald-500 cursor-pointer"
              />
              <Label htmlFor="show-archived-main" className="text-[10px] uppercase font-bold text-zinc-500 cursor-pointer tracking-wider">Show Archived</Label>
            </div>
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
                  <Select value={selectedCustomer} onValueChange={handleCustomerChange}>
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

                <div className="space-y-2">
                  <Label className="text-zinc-400">Vehicle Info</Label>
                  <Input 
                    placeholder="e.g. 2023 Tesla Model 3"
                    value={customVehicle}
                    onChange={(e) => setCustomVehicle(e.target.value)}
                    className="bg-zinc-950 border-zinc-800"
                  />
                  <p className="text-[10px] text-zinc-500 italic">Leave blank to use customer's default vehicle.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-400">Invoice Notes</Label>
                  <Textarea 
                    placeholder="Add special instructions or reminders for this invoice..."
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 min-h-[80px]"
                  />
                </div>

                <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800">
                  <Label className="text-zinc-400 mb-2 block">Line Items</Label>
                  <div className="space-y-4 mb-4">
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs text-zinc-500 uppercase font-bold">Service Type</Label>
                      <Select value={serviceCategory} onValueChange={(val: any) => {
                        setServiceCategory(val);
                        setNewService({ name: "", price: "" });
                      }}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-200">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="package">Service Packages</SelectItem>
                          <SelectItem value="addon">Add-ons</SelectItem>
                          <SelectItem value="custom">Custom Entry</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1">
                        {serviceCategory === "package" ? (
                          <Select 
                            value={newService.name} 
                            onValueChange={(val) => {
                              const pkg = servicePackages.find(p => p.id === val) || (getCustomPackages().find(p => p.id === val) as any);
                              if (pkg) {
                                // Attempt to get price based on customer vehicle type
                                const customer = customers.find(c => c.id === selectedCustomer);
                                const vType = toBuiltInVehKey(customer?.vehicleType || 'midsize');
                                const price = getServicePrice(pkg.id, vType) || pkg.basePrice || 0;
                                setNewService({ name: pkg.name, price: price.toString() });
                              }
                            }}
                          >
                            <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-200">
                              <SelectValue placeholder="Choose Package" />
                            </SelectTrigger>
                            <SelectContent>
                              {servicePackages.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                              {getCustomPackages().length > 0 && (
                                <>
                                  <div className="h-px bg-zinc-800 my-1 mx-2" />
                                  <div className="px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Custom Packages</div>
                                  {getCustomPackages().map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                  ))}
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        ) : serviceCategory === "addon" ? (
                          <Select 
                            value={newService.name} 
                            onValueChange={(val) => {
                              const addon = addOns.find(a => a.id === val);
                              if (addon) {
                                const customer = customers.find(c => c.id === selectedCustomer);
                                const vType = toBuiltInVehKey(customer?.vehicleType || 'midsize');
                                const price = getAddOnPrice(addon.id, vType);
                                setNewService({ name: addon.name, price: price.toString() });
                              }
                            }}
                          >
                            <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-200">
                              <SelectValue placeholder="Choose Add-on" />
                            </SelectTrigger>
                            <SelectContent>
                              {addOns.map(a => (
                                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            placeholder="Custom Service Name"
                            value={newService.name}
                            onChange={e => setNewService({ ...newService, name: e.target.value })}
                            className="bg-zinc-900 border-zinc-800 text-zinc-200"
                          />
                        )}
                      </div>
                      <Input
                        type="number"
                        placeholder="Price"
                        value={newService.price}
                        onChange={e => setNewService({ ...newService, price: e.target.value })}
                        className="w-32 bg-zinc-900 border-zinc-800 text-zinc-200"
                      />
                      <Button size="icon" variant="outline" onClick={addService} className="border-zinc-700 hover:bg-zinc-800 shrink-0">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
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

                  <Button onClick={createInvoice} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={services.length === 0 || !selectedCustomer || isCreating}>
                    {isCreating ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                    ) : (
                      "Generate Invoice"
                    )}
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
          {sortedInvoices.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {sortedInvoices.map(invoice => (
                <div 
                  key={invoice.id} 
                  className="group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/30 transition-all hover:shadow-lg hover:shadow-emerald-500/5 cursor-pointer" 
                  onClick={() => handleEditInvoice(invoice)}
                >
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

                  <div className="flex items-center gap-6 justify-between md:justify-end w-full md:w-auto" onClick={e => e.stopPropagation()}>
                    <div className="text-right">
                      <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Amount</div>
                      <div className="flex flex-col items-end">
                        {invoice.discount && invoice.discount.amount > 0 && (
                          <span className="text-[10px] text-zinc-500 line-through decoration-zinc-700">
                            ${(invoice.total + invoice.discount.amount).toFixed(2)}
                          </span>
                        )}
                        <div className="text-xl font-bold text-white">${invoice.total.toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="text-right min-w-[100px]">
                      <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Status</div>
                      <div className={`font-medium ${ (invoice.paymentStatus === 'paid' || invoice.total === 0) ? 'text-emerald-400' :
                        invoice.paymentStatus === 'partially-paid' ? 'text-amber-400' : 'text-red-400'
                        }`}>
                        {(invoice.total === 0 ? 'paid' : (invoice.paymentStatus || 'unpaid')).toUpperCase()}
                      </div>
                    </div>

                    <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={() => handleEditInvoice(invoice)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
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

      {/* Edit Modal */}
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
                  <div className={`mt-1 font-bold ${((selectedInvoice.paymentStatus || 'unpaid') === 'paid' || selectedInvoice.total === 0) ? 'text-emerald-400' : 'text-red-400'}`}>
                    {(selectedInvoice.total === 0 ? 'paid' : (selectedInvoice.paymentStatus || 'unpaid')).toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="py-6 space-y-6">
                <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                  <Label className="text-emerald-500 uppercase tracking-widest font-bold text-[10px] block mb-4">Line Items</Label>
                  
                  <div className="space-y-2 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {editServices.map((s, i) => (
                      <div key={i} className="flex gap-2 items-center bg-zinc-950 p-2 rounded-md border border-zinc-800 group">
                        <div className="flex-1">
                          <Input 
                            value={s.name} 
                            onChange={e => {
                              const newS = [...editServices];
                              newS[i].name = e.target.value;
                              setEditServices(newS);
                            }}
                            className="bg-transparent border-0 text-sm h-8 font-medium text-white focus-visible:ring-0 px-1"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500 text-xs">$</span>
                          <Input 
                            type="number"
                            value={s.price} 
                            onChange={e => {
                              const newS = [...editServices];
                              newS[i].price = parseFloat(e.target.value) || 0;
                              setEditServices(newS);
                            }}
                            className="w-20 bg-transparent border-0 text-sm h-8 text-right font-mono focus-visible:ring-0 px-1"
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEditServices(editServices.filter((_, idx) => idx !== i))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4 border-b border-zinc-800/50 mb-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Category</Label>
                      <Select value={serviceCategory} onValueChange={(val: any) => setServiceCategory(val)}>
                        <SelectTrigger className="bg-zinc-950 border-zinc-800 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="package">Packages</SelectItem>
                          <SelectItem value="addon">Add-ons</SelectItem>
                          <SelectItem value="custom">Custom Line</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Selection</Label>
                      {serviceCategory === "package" ? (
                        <Select onValueChange={(val) => handleAddEditItem('package', val)}>
                          <SelectTrigger className="bg-zinc-950 border-zinc-800 h-9">
                            <SelectValue placeholder="Add Package..." />
                          </SelectTrigger>
                          <SelectContent>
                            {servicePackages.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : serviceCategory === "addon" ? (
                        <Select onValueChange={(val) => handleAddEditItem('addon', val)}>
                          <SelectTrigger className="bg-zinc-950 border-zinc-800 h-9">
                            <SelectValue placeholder="Add Add-on..." />
                          </SelectTrigger>
                          <SelectContent>
                            {addOns.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Button variant="outline" className="w-full border-dashed border-zinc-700 text-zinc-400 h-9" onClick={() => setEditServices([...editServices, { name: "Custom Service", price: 0 }])}>
                          <Plus className="h-4 w-4 mr-2" /> Custom Item
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center px-2">
                     <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Subtotal Owed</span>
                     <span className="text-xl font-bold text-emerald-500">${editServices.reduce((sum, s) => sum + s.price, 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Vehicle Details</Label>
                    <Input 
                      value={editVehicle}
                      onChange={(e) => setEditVehicle(e.target.value)}
                      placeholder="Year Make Model"
                      className="bg-zinc-900 border-zinc-800 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Invoice Notes (Visible to Customer)</Label>
                    <Textarea 
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Add special instructions or reminders for the customer..."
                      className="bg-zinc-900 border-zinc-800 text-white min-h-[120px] text-sm leading-relaxed"
                    />
                    <p className="text-[10px] text-zinc-500 italic">These notes will appear at the bottom of the PDF invoice.</p>
                  </div>
                </div>

                <div className="flex gap-2 justify-between pt-4 border-t border-zinc-800">
                  <div className="flex gap-2">
                    <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800 text-zinc-300" onClick={() => {
                      const currentInv = {
                        ...selectedInvoice,
                        services: editServices,
                        vehicle: editVehicle,
                        notes: editNotes,
                        total: editServices.reduce((sum, s) => sum + s.price, 0) - (selectedInvoice.discount?.amount || 0)
                      };
                      generatePDF(currentInv as Invoice, false);
                    }}>
                      <Printer className="h-4 w-4 mr-2" /> Print
                    </Button>
                    <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800 text-zinc-300" onClick={() => {
                      const currentInv = {
                        ...selectedInvoice,
                        services: editServices,
                        vehicle: editVehicle,
                        notes: editNotes,
                        total: editServices.reduce((sum, s) => sum + s.price, 0) - (selectedInvoice.discount?.amount || 0)
                      };
                      generatePDF(currentInv as Invoice, true);
                    }}>
                      <Save className="h-4 w-4 mr-2" /> Save to PDF
                    </Button>
                    <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-900" onClick={() => {
                       const currentInv = {
                        ...selectedInvoice,
                        services: editServices,
                        vehicle: editVehicle,
                        notes: editNotes,
                        total: editServices.reduce((sum, s) => sum + s.price, 0) - (selectedInvoice.discount?.amount || 0)
                      };
                      openEmailModal(currentInv as Invoice);
                    }}>
                      <Mail className="h-4 w-4 mr-2" /> Preview Email
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" className="text-zinc-500" onClick={() => setSelectedInvoice(null)}>Cancel</Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20" onClick={saveEditedInvoice}>
                      <CheckCircle className="h-4 w-4 mr-2" /> Save Changes
                    </Button>
                  </div>
                </div>
              </div>

              {(selectedInvoice.paidAmount || 0) > 0 && (
                <div className="mt-6 pt-6 border-t border-zinc-800 space-y-2">
                  <div className="flex justify-between items-center text-sm text-zinc-400">
                    <span>Amount Paid</span>
                    <div className="flex items-center gap-2 group">
                      <span>-${(selectedInvoice.paidAmount || 0).toFixed(2)}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-white" onClick={() => { setEditPaidValue(String(selectedInvoice.paidAmount || 0)); setIsEditingPaid(true); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {(selectedInvoice.total - (selectedInvoice.paidAmount || 0) > 0) && (
                    <div className="flex justify-between items-center text-lg font-bold text-red-400">
                      <span>Balance Due</span>
                      <span>${(selectedInvoice.total - (selectedInvoice.paidAmount || 0)).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {(selectedInvoice.paymentStatus || 'unpaid') !== 'paid' && (
                <div className="mt-6">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6" onClick={() => { setPaymentAmount((selectedInvoice.total - (selectedInvoice.paidAmount || 0)).toFixed(2)); setPaymentDialogOpen(true); }}>
                    <CreditCard className="h-4 w-4 mr-2" /> Record Payment
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Invoicing;
