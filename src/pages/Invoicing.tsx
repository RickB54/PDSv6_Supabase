import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useLocation, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Printer, Save, Trash2, Plus, Search, CheckCircle, CreditCard, Filter, Pencil, X, Mail, Send, Loader2, HelpCircle, Users, User, Eye, Link as LinkIcon } from "lucide-react";
import {
  getSupabaseInvoices,
  upsertSupabaseInvoice,
  deleteSupabaseInvoice,
  getSupabaseCustomers,
  upsertSupabaseCustomer,
  Customer
} from "@/lib/supa-data";
import { normalizeVehicleType } from "@/lib/pricingHelpers";
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
  DialogFooter,
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
import { useCouponsStore } from "@/store/coupons";
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
import { generateInvoiceNumber, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
  serviceDate?: string;
  createdAt?: string;
  paymentStatus?: "unpaid" | "partially-paid" | "paid";
  paidAmount?: number;
  paidDate?: string;
  discount?: {
    type: "fixed" | "percent";
    value: number;
    amount: number;
    code?: string;
  };
  adjustment?: number;
  tipAmount?: number;
  notes?: string;
  isSent?: boolean;
  sentDate?: string;
}

const Invoicing = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
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
  const [tipAmount, setTipAmount] = useState<string>("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [filterCustomerId, setFilterCustomerId] = useState("");
  const [filterVehicle, setFilterVehicle] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditingPaid, setIsEditingPaid] = useState(false);
  const [editPaidValue, setEditPaidValue] = useState("");
  const [editTipValue, setEditTipValue] = useState("");
  const [serviceCategory, setServiceCategory] = useState<"package" | "addon" | "custom">("custom");
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [editServices, setEditServices] = useState<{ name: string; price: number }[]>([]);
  const [editDiscountMethod, setEditDiscountMethod] = useState<"coupon" | "custom">("custom");
  const [editDiscountCode, setEditDiscountCode] = useState("");
  const [editDiscountType, setEditDiscountType] = useState<"percent" | "fixed">("percent");
  const [editDiscountValue, setEditDiscountValue] = useState<number>(0);
  const [editAdjustmentAmount, setEditAdjustmentAmount] = useState<number>(0);
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
  const [customVehicleClass, setCustomVehicleClass] = useState("midsize");
  const [invoiceDiscount, setInvoiceDiscount] = useState<number>(0);
  const [invoiceDiscountType, setInvoiceDiscountType] = useState<"percent" | "fixed">("percent");
  const [invoiceDiscountCode, setInvoiceDiscountCode] = useState<string>("");
  const [invoiceDiscountMethod, setInvoiceDiscountMethod] = useState<"coupon" | "manual">("manual");
  const [currentInvoiceNumber, setCurrentInvoiceNumber] = useState<number>(0);
  const [serviceDate, setServiceDate] = useState<string>("");
  
  const { items: coupons, refresh: refreshCoupons } = useCouponsStore();
  
  useEffect(() => {
    refreshCoupons();
  }, [refreshCoupons]);

  useEffect(() => {
    if (showCreateForm) {
      if (isEditingInvoice && selectedInvoice) {
        setCurrentInvoiceNumber(selectedInvoice.invoiceNumber || generateInvoiceNumber());
        setServiceDate(selectedInvoice.serviceDate || selectedInvoice.date || new Date().toISOString().split('T')[0]);
      } else {
        setCurrentInvoiceNumber(generateInvoiceNumber());
        setServiceDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [showCreateForm, isEditingInvoice, selectedInvoice]);

  const [editVehicle, setEditVehicle] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editIsSent, setEditIsSent] = useState(false);
  const [invoiceStyle, setInvoiceStyle] = useState<'original' | 'professional'>('original');

  const location = useLocation();

  useEffect(() => {
    loadData();
  }, [isDemoMode, showArchived]);

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // URL routing logic moved below handleEditInvoice

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

    setInvoices(processedInvoices);
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

  const calculateSubtotal = () => services.reduce((sum, s) => sum + s.price, 0);

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    if (invoiceDiscountType === 'percent') {
      return Math.max(0, subtotal * (1 - (invoiceDiscount / 100)));
    } else {
      return Math.max(0, subtotal - invoiceDiscount);
    }
  };

  const handleCustomerChange = async (cid: string) => {
    setSelectedCustomer(cid);
    // Reset discount states upon customer change first
    setInvoiceDiscount(0);
    setInvoiceDiscountType('percent');
    setInvoiceDiscountCode('');
    
    const c = customers.find(x => x.id === cid);
    if (c) {
      const primaryVehicle = c.vehicles && c.vehicles.length > 0 
        ? `${c.vehicles[0].year || ''} ${c.vehicles[0].make} ${c.vehicles[0].model} ${c.vehicles[0].color ? `[Color: ${c.vehicles[0].color}]` : ''}`.replace(/\s+/g, ' ').trim()
        : `${c.year || ''} ${c.vehicle || ''} ${c.model || ''}`.trim();
      setCustomVehicle(primaryVehicle);

      // Auto-carry booking discount, vehicle details and service package!
      try {
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('customerId', cid)
          .order('date', { ascending: false })
          .limit(1);

        if (!error && bookings && bookings.length > 0) {
          const latestBooking = bookings[0];
          
          // Auto-fill vehicle details if available
          if (latestBooking.vehicle) {
            const bVehicle = `${latestBooking.vehicleYear || ''} ${latestBooking.vehicleMake || ''} ${latestBooking.vehicleModel || ''} ${latestBooking.vehicleColor ? `[Color: ${latestBooking.vehicleColor}]` : ''}`.replace(/\s+/g, ' ').trim();
            if (bVehicle) setCustomVehicle(bVehicle);
          }

          // Auto-populate services and addons
          if (latestBooking.title) {
            const finalVType = toBuiltInVehKey(latestBooking.vehicle || 'midsize');
            
            // Find in servicePackages (from imports)
            const { servicePackages: pkgs, addOns: ads } = await import('@/lib/services');
            const pkg = pkgs.find(p => p.name === latestBooking.title);
            let bPrice = pkg ? (pkg.pricing[finalVType] || pkg.basePrice) : 150;
            
            const bServices = [{ name: latestBooking.title, price: bPrice }];
            
            // Add ons
            if (latestBooking.addons && Array.isArray(latestBooking.addons)) {
              latestBooking.addons.forEach((addonName: string) => {
                const addon = ads.find(a => a.name === addonName);
                const addonPrice = addon ? (addon.pricing?.[finalVType] || addon.basePrice) : 30;
                bServices.push({ name: addonName, price: addonPrice });
              });
            }
            setServices(bServices);
          }

          // Auto-fill discount
          if (latestBooking.discountAmount > 0) {
            const hasCoupon = latestBooking.discountCode && latestBooking.discountCode !== 'CUSTOM';
            if (hasCoupon) {
              setInvoiceDiscountMethod('coupon');
              setInvoiceDiscountCode(latestBooking.discountCode);
              const matched = coupons.find(c => c.code === latestBooking.discountCode.toUpperCase());
              if (matched) {
                setInvoiceDiscountType(matched.percent ? 'percent' : 'fixed');
                setInvoiceDiscount(matched.percent || matched.amount || 0);
              } else {
                setInvoiceDiscountType('fixed');
                setInvoiceDiscount(latestBooking.discountAmount);
              }
            } else {
              setInvoiceDiscountMethod('manual');
              setInvoiceDiscountType('fixed');
              setInvoiceDiscount(latestBooking.discountAmount);
              setInvoiceDiscountCode('CUSTOM');
            }
            
            toast({
              title: "Discount Carried Over!",
              description: `Applied latest booking's discount: -$${latestBooking.discountAmount.toFixed(2)} (${latestBooking.discountCode || 'CUSTOM'})`
            });
          }
        }
      } catch (err) {
        console.warn("Failed to automatically carry over booking details:", err);
      }
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
      setInvoiceDiscount(0);
      setInvoiceDiscountType('percent');
      setInvoiceDiscountCode('');
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
      
      const subtotal = calculateSubtotal();
      const finalDiscountAmount = invoiceDiscountType === 'percent'
        ? subtotal * (invoiceDiscount / 100)
        : invoiceDiscount;

      const invoice: Invoice = {
        invoiceNumber: currentInvoiceNumber || generateInvoiceNumber(),
        customerId: crmCustomer.id!,
        customerName: crmCustomer.full_name || customer.name,
        vehicle: vehicleDesc.trim() || "Unknown Vehicle",
        services,
        total: calculateTotal(),
        date: new Date().toLocaleDateString(),
        serviceDate: serviceDate || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        paymentStatus: calculateTotal() === 0 ? "paid" : "unpaid",
        paidAmount: 0,
        notes: customNotes,
        isSent: false,
        discount: finalDiscountAmount > 0 ? {
          type: invoiceDiscountType === 'percent' ? 'percent' : 'fixed',
          value: invoiceDiscount,
          amount: finalDiscountAmount
        } : undefined
      };

      // 3. Create Invoice
      await upsertSupabaseInvoice(invoice);
      toast({ title: "Success", description: "Invoice created successfully" });

      setSelectedCustomer("");
      setServices([]);
      setCustomVehicle("");
      setCustomNotes("");
      setInvoiceDiscount(0);
      setInvoiceDiscountType('percent');
      setInvoiceDiscountCode('');
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

      let passVehicle = true;
      if (filterVehicle !== "all") {
        passVehicle = inv.vehicle.toLowerCase().includes(filterVehicle.toLowerCase());
      }

      return passQuick && passRange && passCustomer && passSearch && passVehicle;
    });
  };

  const filteredInvoices = filterItems();
  
  // Safe Sort: Create a copy and handle invalid dates
  const toggleSentStatus = async (e: React.MouseEvent, invoice: Invoice) => {
    e.stopPropagation();
    const updated = { 
      ...invoice, 
      isSent: !invoice.isSent,
      sentDate: !invoice.isSent ? new Date().toISOString() : invoice.sentDate
    };
    try {
      await upsertSupabaseInvoice(updated);

      if (updated.isSent && invoice.customerId) {
        try {
          await supabase.from('engagements').insert({
            customer_id: invoice.customerId,
            customer_name: invoice.customerName,
            type: 'correspondence',
            note: `Invoice Sent: #${invoice.invoiceNumber}\nTotal: $${(invoice.total || 0).toFixed(2)}\nServices: ${invoice.services?.map(s => s.name).join(', ') || 'N/A'}`
          });
        } catch (e) {
          console.warn("Could not log invoice to engagements:", e);
        }
      }

      await loadData();
      toast({ 
        title: updated.isSent ? "Invoice marked as sent" : "Invoice marked as unsent",
        description: updated.isSent ? `Marked as sent on ${new Date().toLocaleDateString()}` : "Sent status removed"
      });
    } catch (err: any) {
      toast({ title: "Failed to update status", description: err.message, variant: "destructive" });
    }
  };

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
    const tip = parseFloat(tipAmount);
    if ((Number.isNaN(amt) || amt <= 0) && (Number.isNaN(tip) || tip <= 0)) return;

    try {
      if (isDemoMode) {
        toast({ title: "Simulation Mode", description: "Payment recorded in local state." });
        setPaymentDialogOpen(false);
        setPaymentAmount("");
        setTipAmount("");
        return;
      }

      const currentPaid = selectedInvoice.paidAmount || 0;
      const currentTip = selectedInvoice.tipAmount || 0;
      
      const newPaid = !Number.isNaN(amt) ? currentPaid + amt : currentPaid;
      const newTip = !Number.isNaN(tip) ? currentTip + tip : currentTip;
      
      const status = newPaid >= selectedInvoice.total ? "paid" : "partially-paid";
      const updated: Invoice = { 
        ...selectedInvoice, 
        paidAmount: newPaid, 
        paymentStatus: status, 
        paidDate: new Date().toISOString(),
        tipAmount: newTip > 0 ? newTip : undefined
      };
      
      await upsertSupabaseInvoice(updated);
      setPaymentDialogOpen(false);
      setPaymentAmount("");
      setTipAmount("");
      setSelectedInvoice(updated);
      await loadData();
      
      let toastDesc = `Added $${(!Number.isNaN(amt) ? amt : 0).toFixed(2)} to invoice #${updated.invoiceNumber}`;
      if (!Number.isNaN(tip) && tip > 0) toastDesc += ` (Includes $${tip.toFixed(2)} Tip)`;
      
      toast({ title: "Payment recorded", description: toastDesc });
    } catch (err: any) {
      console.error("Payment Error:", err);
      toast({ title: "Failed to record payment", description: err.message, variant: "destructive" });
    }
  };

  const saveEditedPaid = async () => {
    if (!selectedInvoice) return;
    const amt = parseFloat(editPaidValue);
    const tip = parseFloat(editTipValue);
    if (Number.isNaN(amt) || amt < 0) return; // Allow 0 to reset

    if (isDemoMode) {
      toast({ title: "Simulation Mode", description: "Manual payment update simulated." });
      setIsEditingPaid(false);
      return;
    }

    // Determine status based on new amount
    const status = amt >= selectedInvoice.total ? "paid" : amt > 0 ? "partially-paid" : "unpaid";

    const updated: Invoice = { 
      ...selectedInvoice, 
      paidAmount: amt, 
      paymentStatus: status,
      tipAmount: (!Number.isNaN(tip) && tip > 0) ? tip : undefined
    };
    
    if (amt >= selectedInvoice.total) {
      updated.paidDate = new Date().toISOString();
    }

    await upsertSupabaseInvoice(updated);
    setSelectedInvoice(updated);
    setIsEditingPaid(false);
    loadData();
    toast({ title: "Payment updated", description: `Payment and Tip amounts manually updated.` });
  };

  const handleEditInvoice = (inv: Invoice) => {
    // Fallback to customer's vehicle if invoice vehicle is missing or 'Unknown'
    let resolvedVehicle = inv.vehicle || "";
    if (!resolvedVehicle || resolvedVehicle === "Unknown" || resolvedVehicle === "Unknown Vehicle") {
      const cust = customers.find(c => c.id === inv.customerId);
      if (cust) {
        resolvedVehicle = `${cust.year || ''} ${cust.vehicle || ''} ${cust.model || ''}`.trim();
      }
    }
    if (!resolvedVehicle) resolvedVehicle = "Unknown";

    const enrichedInv = { ...inv, vehicle: resolvedVehicle };
    setSelectedInvoice(enrichedInv);
    
    // Extract adjustment amount from services (legacy) or property
    let adjAmount = inv.adjustment || 0;
    const services = Array.isArray(inv.services) ? inv.services.filter(s => {
      if (s.name === "Adjusted") {
        if (!inv.adjustment) adjAmount = Math.abs(s.price);
        return false;
      }
      return true;
    }) : [];
    
    setEditServices(services);
    setEditAdjustmentAmount(adjAmount);
    
    if (inv.discount) {
      setEditDiscountMethod(inv.discount.code && inv.discount.code !== 'CUSTOM' ? 'coupon' : 'custom'); 
      setEditDiscountCode(inv.discount.code || '');
      setEditDiscountType(inv.discount.type);
      setEditDiscountValue(inv.discount.value);
    } else {
      setEditDiscountMethod('custom');
      setEditDiscountType('percent');
      setEditDiscountValue(0);
      setEditDiscountCode('');
    }

    setEditVehicle(resolvedVehicle);
    setEditNotes(inv.notes || "");
    setEditIsSent(inv.isSent || false);
    setServiceDate(inv.serviceDate || inv.date || new Date().toISOString().split('T')[0]);
    setIsEditingInvoice(true);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cid = params.get('customerId');
    const eid = params.get('editId');

    if (eid && invoices.length > 0) {
      const inv = invoices.find(i => i.id === eid);
      if (inv && !isEditingInvoice) {
        handleEditInvoice(inv);
      }
    } else if (cid && !eid && customers.length > 0) {
      setFilterCustomerId(cid);
      const cust = customers.find(c => c.id === cid);
      if (cust) {
        setSearchTerm(cust.name);
        setFilterVehicle("all");
      }
    } else if (!cid) {
      setFilterCustomerId("");
      setFilterVehicle("all");
    }
  }, [location.search, customers.length, invoices.length]);

  
  const buildCurrentEditedInvoice = (): Invoice => {
    if (!selectedInvoice) return {} as Invoice;
    const subtotal = editServices.reduce((sum, s) => sum + s.price, 0);
    const finalDiscountAmount = editDiscountType === 'percent'
      ? subtotal * (editDiscountValue / 100)
      : editDiscountValue;

    let newTotal = subtotal - finalDiscountAmount - editAdjustmentAmount;
    if (newTotal < 0) newTotal = 0;

    const updated: Invoice = { 
      ...selectedInvoice, 
      services: editServices, 
      vehicle: editVehicle,
      notes: editNotes,
      isSent: editIsSent,
      sentDate: editIsSent && !selectedInvoice.isSent ? new Date().toISOString() : selectedInvoice.sentDate,
      serviceDate: serviceDate,
      total: newTotal,
      discount: finalDiscountAmount > 0 ? {
        type: editDiscountType,
        value: editDiscountValue,
        amount: finalDiscountAmount,
        code: editDiscountCode || undefined
      } : undefined,
      adjustment: editAdjustmentAmount > 0 ? editAdjustmentAmount : undefined
    };

    if (updated.paidAmount && updated.paidAmount >= newTotal) {
      updated.paymentStatus = "paid";
    } else if (updated.paidAmount && updated.paidAmount > 0) {
      updated.paymentStatus = "partially-paid";
    } else if (newTotal === 0) {
      updated.paymentStatus = "paid";
    } else {
      updated.paymentStatus = "unpaid";
    }
    
    return updated;
  };

  const saveEditedInvoice = async () => {
    if (!selectedInvoice) return;
    const updated = buildCurrentEditedInvoice();

    try {
      await upsertSupabaseInvoice(updated);
      
      if (updated.isSent && !selectedInvoice.isSent && updated.customerId) {
        try {
          await supabase.from('engagements').insert({
            customer_id: updated.customerId,
            customer_name: updated.customerName,
            type: 'correspondence',
            note: `Invoice Sent: #${updated.invoiceNumber}\nTotal: $${(updated.total || 0).toFixed(2)}\nServices: ${updated.services?.map(s => s.name).join(', ') || 'N/A'}`
          });
        } catch (e) {
          console.warn("Could not log invoice to engagements:", e);
        }
      }

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

  const handleCopyLink = (invoiceId: string) => {
    const link = `https://primeautodetail.net/invoice/${invoiceId}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link Copied!", description: "Hosted Invoice URL copied to clipboard." });
  };

  const generatePDF = (invoice: Invoice, download = false, styleOverride?: 'original' | 'professional') => {
    const doc = new jsPDF();
    
    // UNIFORM PROFESSIONAL HEADER (Logo on left)
    try {
      const logoWidth = 28;
      const logoHeight = 28;
      doc.addImage(logo, 'PNG', 20, 10, logoWidth, logoHeight);
      
      // Contact Info next to logo
      doc.setFontSize(13);
      doc.setTextColor(16, 185, 129); // Emerald color
      doc.setFont("helvetica", "bold");
      doc.text("Rick Berube", 52, 14);
      
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.setFont("helvetica", "normal");
      doc.text("54 Boston Street, Methuen MA 01844", 52, 19);
      doc.text("Rick.PrimeAutoDetail@gmail.com", 52, 24);
      doc.text("https://PrimeAutoDetail.net", 52, 29);
      doc.text("978-566-1008", 52, 34);
      
      // Company Name on the Right
      doc.setFontSize(14);
      doc.setTextColor(16, 185, 129);
      doc.setFont("helvetica", "bold");
      doc.text("Prime Auto Detail", 190, 14, { align: "right" });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.text("INVOICE", 190, 20, { align: "right" });
      doc.text(`Invoice #${invoice.invoiceNumber || 'N/A'}`, 190, 25, { align: "right" });
    } catch (e) {
      console.warn("Header failed", e);
      doc.setFontSize(16);
      doc.text("Prime Auto Detail", 105, 15, { align: "center" });
    }

    const contentStartY = 45;
    doc.setFontSize(10);
    
    let displayServiceDate = invoice.serviceDate || invoice.date;
    if (displayServiceDate && displayServiceDate.includes('-')) {
      const parts = displayServiceDate.split('-');
      if (parts.length === 3) {
        displayServiceDate = `${parseInt(parts[1])}/${parseInt(parts[2])}/${parts[0]}`;
      }
    }
    
    let displayInvoiceDate = invoice.date || new Date().toLocaleDateString();
    if (displayInvoiceDate && displayInvoiceDate.includes('-')) {
      const parts = displayInvoiceDate.split('-');
      if (parts.length === 3) {
        displayInvoiceDate = `${parseInt(parts[1])}/${parseInt(parts[2])}/${parts[0]}`;
      }
    }

    doc.text(`Service Date: ${displayServiceDate}`, 20, contentStartY);
    doc.text(`Invoice Date: ${displayInvoiceDate}`, 20, contentStartY + 6);
    
    // Move Customer and Vehicle to the right side
    doc.setFont("helvetica", "bold");
    doc.text(`Customer: ${invoice.customerName}`, 130, contentStartY);
    doc.text(`Vehicle: ${invoice.vehicle}`, 130, contentStartY + 6);
    doc.setFont("helvetica", "normal");

    let y = contentStartY + 16;
    doc.setFontSize(11);
    doc.text("Services Provided:", 20, y);
    y += 6;

    doc.setFontSize(10);
    invoice.services.forEach((s) => {
            const serviceName = s.name || 'Service';
      const lines = doc.splitTextToSize(serviceName, 140);
      doc.text(lines, 25, y);
      doc.text(`$${s.price.toFixed(2)}`, 180, y, { align: "right" });
      y += (lines.length * 7);
    });

    y += 3;
    doc.line(20, y, 190, y);
    y += 8;

    doc.setFontSize(12);
    
    if (invoice.discount && invoice.discount.amount > 0) {
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      let discountLabel = "";
      if (invoice.discount.code && invoice.discount.code !== 'CUSTOM') {
        const symbol = invoice.discount.type === 'percent' ? '%' : '$';
        discountLabel = `${invoice.discount.code} (${invoice.discount.value}${symbol} Off):`;
      } else {
        discountLabel = invoice.discount.type === 'percent' 
          ? `Discount (${invoice.discount.value}%):` 
          : `Discount (Fixed):`;
      }
      doc.text(discountLabel, 165, y, { align: "right" });
      doc.text(`-$${invoice.discount.amount.toFixed(2)}`, 180, y, { align: "right" });
      y += 7;
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
    }

    if (invoice.adjustment && invoice.adjustment > 0) {
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("Adjusted:", 165, y, { align: "right" });
      doc.text(`-$${invoice.adjustment.toFixed(2)}`, 180, y, { align: "right" });
      y += 7;
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
    }

    doc.text("Total Amount:", 125, y);
    doc.text(`$${invoice.total.toFixed(2)}`, 180, y, { align: "right" });
    y += 8;

    if (invoice.paidAmount && invoice.paidAmount > 0) {
      doc.setFontSize(10);
      doc.setTextColor(16, 185, 129);
      doc.text(`Paid: $${invoice.paidAmount.toFixed(2)}`, 180, y, { align: "right" });

      const balance = invoice.total - invoice.paidAmount;
      if (balance <= 0) {
        y += 7;
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text("PAID IN FULL", 180, y, { align: "right" });
        doc.setFont("helvetica", "normal");
      } else {
        y += 6;
        doc.setTextColor(239, 68, 68);
        doc.text(`Balance Due: $${balance.toFixed(2)}`, 180, y, { align: "right" });
      }
    } else if (invoice.total === 0) {
      doc.setFontSize(13);
      doc.setTextColor(16, 185, 129);
      doc.setFont("helvetica", "bold");
      doc.text("PAID IN FULL", 180, y, { align: "right" });
      doc.setFont("helvetica", "normal");
    }

    if (invoice.notes) {
      const cleanNotes = invoice.notes.replace('[PAID_VIA_STRIPE]', '').trim();
      if (cleanNotes) {
        if (y > 230) {
          doc.addPage();
          y = 20;
        }
        y += 8;
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60); // Darker grey
        doc.setFont("helvetica", "bold");
        doc.text("Notes:", 20, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        const splitNotes = doc.splitTextToSize(cleanNotes, 170);
        doc.text(splitNotes, 20, y + 5);
        y += (splitNotes.length * 5) + 4;
      }
    }

    // Google Review Section - Compact Layout
    if (y > 210) {
      doc.addPage();
      y = 30;
    } else {
      y += 6;
    }

    doc.setFontSize(10);
    doc.setTextColor(16, 185, 129); // Emerald
    doc.setFont("helvetica", "bold");
    doc.text("Help Us Grow!", 105, y, { align: "center" });
    
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const reviewStatement = "Your feedback is extremely valuable and plays a vital role in helping small businesses like mine continue to grow and reach new customers.";
    const splitStatement = doc.splitTextToSize(reviewStatement, 160);
    doc.text(splitStatement, 105, y, { align: "center" });
    
    y += (splitStatement.length * 5) + 1;
    
    // QR Code
    try {
      const qrWidth = 28;
      const qrHeight = 28;
      const qrX = (210 - qrWidth) / 2;
      doc.addImage(qrCode, 'PNG', qrX, y, qrWidth, qrHeight);
      y += qrHeight + 4;
    } catch (e) {
      console.warn("QR Code failed to load for PDF", e);
    }

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Scan with your phone to leave a Google Review", 105, y, { align: "center" });
    doc.setTextColor(16, 185, 129);
    doc.setFont("helvetica", "bold");
    doc.text("https://g.page/r/CUaXyAfwdcv1EBM/review", 105, y + 5, { align: "center" });
    doc.setFont("helvetica", "normal");

    y += 18; // Added space below URL for a cleaner look
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
    if ((inv.discount && inv.discount.amount > 0) || (inv.adjustment && inv.adjustment > 0)) {
      let baseSub = inv.total;
      if (inv.discount) baseSub += inv.discount.amount;
      if (inv.adjustment) baseSub += inv.adjustment;
      
      summaryText = `Subtotal: $${baseSub.toFixed(2)}\n`;
      if (inv.discount && inv.discount.amount > 0) {
        const dLabel = (inv.discount.code && inv.discount.code !== 'CUSTOM') 
          ? `${inv.discount.code} (${inv.discount.type === 'percent' ? `${inv.discount.value}%` : `$${inv.discount.value}`} Off):`
          : 'Discount:';
        summaryText += `${dLabel} -$${inv.discount.amount.toFixed(2)}\n`;
      }
      if (inv.adjustment && inv.adjustment > 0) {
        summaryText += `Adjustment: -$${inv.adjustment.toFixed(2)}\n`;
      }
      summaryText += `Total: $${inv.total.toFixed(2)}`;
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
      <PageHeader title="Invoicing & Payments" />

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
                className="pl-10 pr-10 bg-zinc-950 border-zinc-800"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {filterCustomerId ? (
              <Select value={filterVehicle} onValueChange={(val) => {
                if (val === "clear") {
                  setFilterCustomerId("");
                  setFilterVehicle("all");
                  setSearchTerm("");
                } else {
                  setFilterVehicle(val);
                }
              }}>
                <SelectTrigger className="w-[200px] bg-zinc-950 border-zinc-800 text-zinc-200">
                  <SelectValue placeholder="All Vehicles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vehicles</SelectItem>
                  {customers.find(c => c.id === filterCustomerId)?.vehicles?.map((v, idx) => {
                    const label = `${v.year || ''} ${v.make} ${v.model} ${v.color ? `[Color: ${v.color}]` : ''}`.replace(/\s+/g, ' ').trim();
                    return <SelectItem key={v.id || idx} value={label}>{label}</SelectItem>;
                  })}
                  <SelectItem value="clear" className="text-red-400 font-bold border-t border-zinc-800 mt-2">Clear Customer Filter</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Select value="all" onValueChange={(val) => setFilterCustomerId(val === "all" ? "" : val)}>
                <SelectTrigger className="w-[180px] bg-zinc-950 border-zinc-800 text-zinc-400">
                  <SelectValue placeholder="Filter by Customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Select Customer...</SelectItem>
                  {customers.map(c => <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
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
                  <Label className="text-zinc-400">Service Date</Label>
                  <Input 
                    type="date"
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-zinc-200 [color-scheme:dark]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-400">Vehicle Selection</Label>
                  {(() => {
                    const cust = customers.find(c => c.id === selectedCustomer);
                    const vels = cust?.vehicles || [];
                    if (vels.length > 0) {
                      return (
                        <Select 
                          value={vels.some(v => {
                            const label = `${v.year || ''} ${v.make} ${v.model} ${v.color ? `[Color: ${v.color}]` : ''}`.replace(/\s+/g, ' ').trim();
                            return label === customVehicle;
                          }) ? customVehicle : "custom"} 
                          onValueChange={(val) => {
                            if (val !== "custom") {
                              setCustomVehicle(val);
                              const cust = customers.find(c => c.id === selectedCustomer);
                              if (cust && cust.vehicles) {
                                const matched = cust.vehicles.find(v => {
                                  const label = `${v.year || ''} ${v.make} ${v.model} ${v.color ? `[Color: ${v.color}]` : ''}`.replace(/\s+/g, ' ').trim();
                                  return label === val;
                                });
                                if (matched && matched.type) {
                                  setCustomVehicleClass(matched.type.toLowerCase() as any);
                                } else {
                                  const guessed = normalizeVehicleType(val);
                                  if (guessed) setCustomVehicleClass(guessed);
                                }
                              }
                            }
                            else setCustomVehicle("");
                          }}
                        >
                          <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-200">
                            <SelectValue placeholder="Choose Vehicle" />
                          </SelectTrigger>
                          <SelectContent>
                            {vels.map((v, idx) => {
                              const label = `${v.year || ''} ${v.make} ${v.model} ${v.color ? `[Color: ${v.color}]` : ''}`.replace(/\s+/g, ' ').trim();
                              return <SelectItem key={v.id || idx} value={label}>{label}</SelectItem>;
                            })}
                            <SelectItem value="custom">Manual / Other...</SelectItem>
                          </SelectContent>
                        </Select>
                      );
                    }
                    return null;
                  })()}
                  
                  {(!selectedCustomer || !customers.find(c => c.id === selectedCustomer)?.vehicles?.length || !customers.find(c => c.id === selectedCustomer)?.vehicles?.some(v => `${v.year || ''} ${v.make} ${v.model} ${v.color ? `[Color: ${v.color}]` : ''}`.replace(/\s+/g, ' ').trim() === customVehicle)) && (
                    <Input 
                      placeholder="e.g. 2023 Tesla Model 3"
                      value={customVehicle}
                      onChange={(e) => {
                        setCustomVehicle(e.target.value);
                        const guessed = normalizeVehicleType(e.target.value);
                        if (guessed) setCustomVehicleClass(guessed);
                      }}
                      className="bg-zinc-950 border-zinc-800 mt-2"
                    />
                  )}
                  <p className="text-[10px] text-zinc-500 italic">Select from customer's vehicles or enter manually.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-400">Vehicle Classification (Pricing Tier)</Label>
                  <Select value={customVehicleClass} onValueChange={setCustomVehicleClass}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-200">
                      <SelectValue placeholder="Select Vehicle Size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact / Sedan</SelectItem>
                      <SelectItem value="midsize">Mid-Size / SUV</SelectItem>
                      <SelectItem value="truck">Truck / Van / Large SUV</SelectItem>
                      <SelectItem value="luxury">Luxury / Specialty</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-zinc-500 italic">This will accurately calculate the base prices below.</p>
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
                              const pkg = servicePackages.find(p => p.name === val) || (getCustomPackages().find(p => p.name === val) as any);
                              if (pkg) {
                                const vType = toBuiltInVehKey(customVehicleClass);
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
                                <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                              ))}
                              {getCustomPackages().length > 0 && (
                                <>
                                  <div className="h-px bg-zinc-800 my-1 mx-2" />
                                  <div className="px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Custom Packages</div>
                                  {getCustomPackages().map(p => (
                                    <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                                  ))}
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        ) : serviceCategory === "addon" ? (
                          <Select 
                            value={newService.name} 
                            onValueChange={(val) => {
                              const addon = addOns.find(a => a.name === val);
                              if (addon) {
                                const vType = toBuiltInVehKey(customVehicleClass);
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
                                <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
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

                      {/* Subtotal & Discount Inputs */}
                      <div className="pt-3 mt-3 border-t border-zinc-800 space-y-2">
                        <div className="flex justify-between items-center text-sm text-zinc-400">
                          <span>Subtotal</span>
                          <span className="font-mono">${calculateSubtotal().toFixed(2)}</span>
                        </div>
                        
                        <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Apply Discount</span>
                            {invoiceDiscountCode && (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">
                                {invoiceDiscountCode}
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2">
                            <Select 
                              value={invoiceDiscountMethod} 
                              onValueChange={(val: 'coupon' | 'manual') => {
                                setInvoiceDiscountMethod(val);
                                if (val === 'coupon') {
                                  const first = coupons.find(c => c.active)?.code || '';
                                  setInvoiceDiscountCode(first);
                                  const matched = coupons.find(c => c.code === first);
                                  if (matched) {
                                    setInvoiceDiscountType(matched.percent ? 'percent' : 'fixed');
                                    setInvoiceDiscount(matched.percent || matched.amount || 0);
                                  } else {
                                    setInvoiceDiscountType('fixed');
                                    setInvoiceDiscount(0);
                                  }
                                } else {
                                  setInvoiceDiscountCode('CUSTOM');
                                  setInvoiceDiscountType('fixed');
                                  setInvoiceDiscount(0);
                                }
                              }}
                            >
                              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="coupon">Coupon Code</SelectItem>
                                <SelectItem value="manual">Manual Amount</SelectItem>
                              </SelectContent>
                            </Select>

                            {invoiceDiscountMethod === 'coupon' ? (
                              <div className="col-span-2 flex flex-col gap-2">
                                <Select
                                  value={(invoiceDiscountCode && coupons.some(c => c.code === invoiceDiscountCode)) ? invoiceDiscountCode : (invoiceDiscountCode ? 'CUSTOM_CODE' : '')}
                                  onValueChange={(val) => {
                                    if (val === 'CUSTOM_CODE') {
                                      setInvoiceDiscountCode('CUSTOM');
                                      setInvoiceDiscount(0);
                                      setInvoiceDiscountType('fixed');
                                    } else {
                                      setInvoiceDiscountCode(val);
                                      const matched = coupons.find(c => c.code === val);
                                      if (matched) {
                                        setInvoiceDiscountType(matched.percent ? 'percent' : 'fixed');
                                        setInvoiceDiscount(matched.percent || matched.amount || 0);
                                      }
                                    }
                                  }}
                                >
                                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs">
                                    <SelectValue placeholder="Select Coupon..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    
                                    {coupons.filter(c => c.active).map(c => (
                                      <SelectItem key={c.code} value={c.code}>
                                        {c.code} ({c.percent ? `${c.percent}% Off` : `$${c.amount} Off`})
                                      </SelectItem>
                                    ))}
                                    <SelectItem value="CUSTOM_CODE">-- Enter Custom Code --</SelectItem>
                                  </SelectContent>
                                </Select>

                                {((invoiceDiscountCode && !coupons.some(c => c.code === invoiceDiscountCode)) || invoiceDiscountCode === 'CUSTOM') && (
                                  <Input
                                    type="text"
                                    placeholder="Enter Custom Code..."
                                    className="h-9 bg-zinc-900 border-zinc-800 text-zinc-200 uppercase text-xs"
                                    value={invoiceDiscountCode === 'CUSTOM' ? '' : invoiceDiscountCode}
                                    onChange={(e) => {
                                      const codeVal = e.target.value.toUpperCase();
                                      setInvoiceDiscountCode(codeVal);
                                      const matched = coupons.find(c => c.code === codeVal);
                                      if (matched) {
                                        setInvoiceDiscountType(matched.percent ? 'percent' : 'fixed');
                                        setInvoiceDiscount(matched.percent || matched.amount || 0);
                                      } else {
                                        setInvoiceDiscountType('fixed');
                                        setInvoiceDiscount(0);
                                      }
                                    }}
                                  />
                                )}
                              </div>
                            ) : (
                              <div className="col-span-2 flex gap-2">
                                <Select 
                                  value={invoiceDiscountType} 
                                  onValueChange={(val: 'percent' | 'fixed') => {
                                    setInvoiceDiscountType(val);
                                  }}
                                >
                                  <SelectTrigger className="w-[100px] bg-zinc-900 border-zinc-800 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="percent">Percent (%)</SelectItem>
                                    <SelectItem value="fixed">Fixed ($)</SelectItem>
                                  </SelectContent>
                                </Select>

                                <div className="relative flex-1">
                                  {invoiceDiscountType === 'fixed' && <span className="absolute left-3 top-2 text-zinc-500 text-xs">$</span>}
                                  <Input
                                    type="number"
                                    placeholder={invoiceDiscountType === 'percent' ? "e.g. 10" : "e.g. 25"}
                                    className={`h-9 bg-zinc-900 border-zinc-800 text-zinc-200 text-xs ${invoiceDiscountType === 'fixed' ? 'pl-7' : ''}`}
                                    value={invoiceDiscount || ''}
                                    onChange={e => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setInvoiceDiscount(val);
                                    }}
                                  />
                                  {invoiceDiscountType === 'percent' && <span className="absolute right-3 top-2 text-zinc-500 text-xs">%</span>}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {invoiceDiscount > 0 && (
                          <div className="flex justify-between items-center text-sm text-red-400 font-medium">
                            <span>Discount</span>
                            <span className="font-mono">
                              -${(invoiceDiscountType === 'percent' 
                                ? calculateSubtotal() * (invoiceDiscount / 100) 
                                : invoiceDiscount).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 mt-3 border-t border-zinc-800 flex justify-between items-center">
                        <span className="font-bold text-zinc-400">Total</span>
                        <span className="font-bold text-xl text-white">${calculateTotal().toFixed(2)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-zinc-600 italic text-sm">No items added yet</div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <Button onClick={createInvoice} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={services.length === 0 || !selectedCustomer || isCreating}>
                      {isCreating ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                      ) : (
                        "Generate Invoice"
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-zinc-700 text-zinc-300"
                      disabled={services.length === 0 || !selectedCustomer}
                      onClick={() => {
                        const subtotal = calculateSubtotal();
                        const finalDiscountAmount = invoiceDiscountType === 'percent'
                          ? subtotal * (invoiceDiscount / 100)
                          : invoiceDiscount;

                        const tempInv: Invoice = {
                          invoiceNumber: currentInvoiceNumber || generateInvoiceNumber(),
                          customerId: selectedCustomer,
                          customerName: customers.find(c => c.id === selectedCustomer)?.name || "Valued Customer",
                          vehicle: customVehicle || "Current Vehicle",
                          services,
                          total: calculateTotal(),
                          date: new Date().toLocaleDateString(),
                          serviceDate: serviceDate || new Date().toISOString().split('T')[0],
                          notes: customNotes,
                          discount: finalDiscountAmount > 0 ? {
                            type: invoiceDiscountType === 'percent' ? 'percent' : 'fixed',
                            value: invoiceDiscount,
                            amount: finalDiscountAmount
                          } : undefined
                        };
                        generatePDF(tempInv, false);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" /> Preview
                    </Button>
                  </div>
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
                  className="group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/30 transition-all hover:shadow-lg hover:shadow-emerald-500/5 cursor-pointer gap-4" 
                  onClick={() => handleEditInvoice(invoice)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center border ${(invoice.paymentStatus === 'paid')
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                      }`}>
                      {(invoice.paymentStatus === 'paid') ? <CheckCircle className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-lg">#{invoice.invoiceNumber}</span>
                        {(() => {
                          const displayService = invoice.serviceDate || invoice.date;
                          const formattedService = displayService && displayService.includes('-') 
                            ? (() => {
                                const parts = displayService.split('-');
                                return parts.length === 3 ? `${parseInt(parts[1])}/${parseInt(parts[2])}/${parts[0]}` : displayService;
                              })()
                            : displayService;

                          const displayInvoice = invoice.date;
                          const formattedInvoice = displayInvoice && displayInvoice.includes('-')
                            ? (() => {
                                const parts = displayInvoice.split('-');
                                return parts.length === 3 ? `${parseInt(parts[1])}/${parseInt(parts[2])}/${parts[0]}` : displayInvoice;
                              })()
                            : displayInvoice;

                          return (
                            <span className="text-zinc-500 text-xs flex flex-wrap items-center gap-1.5 ml-2 border-l border-zinc-800 pl-2 font-semibold">
                              <span>Inv Date:</span>
                              <span className="text-zinc-300 font-medium">{formattedInvoice}</span>
                              <span className="text-zinc-700 font-normal ml-0.5">•</span>
                              <span>Serv Date:</span>
                              <span className="text-emerald-400 font-medium">{formattedService}</span>
                            </span>
                          );
                        })()}
                        {invoice.isSent && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px] h-4 px-1 py-0 uppercase font-black tracking-widest ml-1">
                            SENT
                          </Badge>
                        )}
                      </div>
                      <div className="font-medium text-zinc-300">{invoice.customerName}</div>
                      <div className="text-xs text-zinc-500">
                        {(!invoice.vehicle || invoice.vehicle === "Unknown" || invoice.vehicle === "Unknown Vehicle") 
                          ? (customers.find(c => c.id === invoice.customerId)?.vehicle || "Unknown") 
                          : invoice.vehicle}
                      </div>
                    </div>
                  </div>                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 sm:gap-6 justify-between md:justify-end w-full md:w-auto mt-4 md:mt-0" onClick={e => e.stopPropagation()}>
                    <div className="text-left sm:text-right flex-1 sm:flex-none">
                      <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Amount</div>
                      <div className="flex flex-col items-end">
                        {invoice.discount && invoice.discount.amount > 0 && (
                          <span className="text-[10px] text-zinc-500 line-through decoration-zinc-700">
                            ${(invoice.total + invoice.discount.amount).toFixed(2)}
                          </span>
                        )}
                        <div className="text-lg sm:text-xl font-bold text-white">${invoice.total.toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="text-right min-w-[90px] flex-1 sm:flex-none">
                      <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Status</div>
                      <div className={`font-bold text-xs ${ (invoice.paymentStatus === 'paid' || invoice.total === 0) ? 'text-emerald-400' :
                        invoice.paymentStatus === 'partially-paid' ? 'text-amber-400' : 'text-red-400'
                        }`}>
                        {(invoice.total === 0 ? 'paid' : (invoice.paymentStatus || 'unpaid')).toUpperCase()}
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-1 min-w-[50px]" onClick={e => e.stopPropagation()}>
                       <div className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">Sent?</div>
                       <Button 
                        size="icon" 
                        variant="ghost" 
                        className={cn(
                          "h-7 w-7 rounded-full border transition-all",
                          invoice.isSent 
                            ? "bg-blue-500/20 border-blue-500/50 text-blue-400" 
                            : "bg-zinc-900 border-zinc-800 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700"
                        )}
                        onClick={(e) => toggleSentStatus(e, invoice)}
                        title={invoice.isSent ? `Sent on ${invoice.sentDate ? new Date(invoice.sentDate).toLocaleDateString() : 'N/A'}` : "Mark as Sent"}
                       >
                         <Send className={cn("h-3.5 w-3.5", invoice.isSent && "fill-blue-400/20")} />
                       </Button>
                    </div>

                    <div className="flex gap-1.5 items-center justify-end w-full sm:w-auto" onClick={e => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={() => handleEditInvoice(invoice)} title="Edit Invoice">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-400/10 border border-emerald-500/20" onClick={() => generatePDF(invoice, false)} title="Preview PDF">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={() => generatePDF(invoice, false)} title="Print PDF">
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 border border-blue-500/20" onClick={() => generatePDF(invoice, true)} title="Download PDF">
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20" onClick={() => handleCopyLink(invoice.id!)} title="Copy Hosted Link">
                        <LinkIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-400/10" onClick={() => setDeleteId(invoice.id!)} title="Delete Invoice">
                        <Trash2 className="h-3.5 w-3.5" />
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
        tipAmount={tipAmount}
        setTipAmount={setTipAmount}
        onConfirm={updatePayment}
      />

      <Dialog open={isEditingPaid} onOpenChange={setIsEditingPaid}>
        <DialogContent className="sm:max-w-[400px] bg-zinc-950 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              <Pencil className="h-5 w-5 text-emerald-400" />
              Edit Payment Allocation
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              Adjust the payment and tip amounts for this invoice.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Invoice Payment Amount</Label>
              <Input 
                type="number"
                step="0.01"
                value={editPaidValue} 
                onChange={e => setEditPaidValue(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-zinc-100 font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-emerald-500 text-xs font-bold uppercase tracking-wider">Tip Amount (Internal)</Label>
              <Input 
                type="number"
                step="0.01"
                value={editTipValue} 
                onChange={e => setEditTipValue(e.target.value)}
                className="bg-zinc-900 border-emerald-900/50 text-zinc-100 font-medium focus-visible:ring-emerald-500/50"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-zinc-800 pt-6">
            <Button variant="ghost" onClick={() => setIsEditingPaid(false)} className="text-zinc-500 hover:text-white">Cancel</Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              onClick={saveEditedPaid}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  
                  {selectedInvoice.notes?.includes('[PAID_VIA_STRIPE]') && (
                    <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">PAID VIA STRIPE (ONLINE)</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 items-center">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 h-9 font-bold px-4"
                    onClick={() => navigate(`/search-customer?customerId=${selectedInvoice.customerId}&search=${encodeURIComponent(selectedInvoice.customerName)}`)}
                  >
                    <Users className="h-4 w-4 mr-2" /> Customer Profile
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(null)} className="h-9 w-9 p-0 rounded-full hover:bg-zinc-900 text-zinc-500">✕</Button>
                </div>
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

              <div className="bg-zinc-900/30 p-4 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">PDF Header Style</Label>
                  <p className="text-[10px] text-zinc-600 italic">Toggle between the original center-logo or professional side-logo with contact info.</p>
                </div>
                <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 shadow-inner">
                  <Button 
                    variant={invoiceStyle === 'original' ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => setInvoiceStyle('original')}
                    className={cn(
                      "rounded-lg text-[10px] font-black tracking-tighter h-7 px-3 uppercase transition-all",
                      invoiceStyle === 'original' ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    Original
                  </Button>
                  <Button 
                    variant={invoiceStyle === 'professional' ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => setInvoiceStyle('professional')}
                    className={cn(
                      "rounded-lg text-[10px] font-black tracking-tighter h-7 px-3 uppercase transition-all",
                      invoiceStyle === 'professional' ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    Professional
                  </Button>
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
                     <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Subtotal</span>
                     <span className="text-xl font-bold text-emerald-500">${editServices.reduce((sum, s) => sum + s.price, 0).toFixed(2)}</span>
                  </div>
                  
                  <div className="space-y-4 pt-4 border-t border-zinc-800">
                    <Label className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Apply Discount</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Select 
                        value={editDiscountMethod} 
                        onValueChange={(val: 'coupon' | 'custom') => {
                          setEditDiscountMethod(val);
                          if (val === 'coupon') {
                            const first = coupons.find(c => c.active)?.code || '';
                            setEditDiscountCode(first);
                            const matched = coupons.find(c => c.code === first);
                            if (matched) {
                              setEditDiscountType(matched.percent ? 'percent' : 'fixed');
                              setEditDiscountValue(matched.percent || matched.amount || 0);
                            }
                          } else {
                            setEditDiscountCode('');
                            setEditDiscountType('fixed');
                            setEditDiscountValue(0);
                          }
                        }}>
                        <SelectTrigger className="bg-zinc-950 border-zinc-800 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="coupon">Coupon</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>

                      {editDiscountMethod === 'coupon' ? (
                        <div className="col-span-2">
                          <Select
                            value={(editDiscountCode && coupons.some(c => c.code === editDiscountCode)) ? editDiscountCode : (editDiscountCode ? 'CUSTOM_CODE' : '')}
                            onValueChange={(val) => {
                              if (val === 'CUSTOM_CODE') {
                                setEditDiscountCode('CUSTOM');
                                setEditDiscountType('fixed');
                                setEditDiscountValue(0);
                              } else {
                                setEditDiscountCode(val);
                                const matched = coupons.find(c => c.code === val);
                                if (matched) {
                                  setEditDiscountType(matched.percent ? 'percent' : 'fixed');
                                  setEditDiscountValue(matched.percent || matched.amount || 0);
                                }
                              }
                            }}>
                            <SelectTrigger className="bg-zinc-950 border-zinc-800 h-9">
                              <SelectValue placeholder="Select Coupon..." />
                            </SelectTrigger>
                            <SelectContent>
                              {coupons.filter(c => c.active).map(c => (
                                <SelectItem key={c.code} value={c.code}>
                                  {c.code} ({c.percent ? `${c.percent}% Off` : `${c.amount} Off`})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="col-span-2 flex gap-2">
                          <Select 
                            value={editDiscountType} 
                            onValueChange={(val: 'percent' | 'fixed') => setEditDiscountType(val)}>
                            <SelectTrigger className="w-24 bg-zinc-950 border-zinc-800 h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percent">%</SelectItem>
                              <SelectItem value="fixed">$</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            className="bg-zinc-950 border-zinc-800 h-9 text-right font-mono"
                            placeholder="0.00"
                            value={editDiscountValue || ''}
                            onChange={e => setEditDiscountValue(parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {editDiscountValue > 0 && (
                    <div className="flex justify-between items-center px-2 text-sm text-red-400 font-medium">
                      <span>{editDiscountMethod === 'coupon' && editDiscountCode && editDiscountCode !== 'CUSTOM' ? `${editDiscountCode} (${editDiscountType === 'percent' ? `${editDiscountValue}%` : `$${editDiscountValue}`} Off)` : `Discount`}</span>
                      <span className="font-mono">
                        -${(editDiscountType === 'percent' 
                          ? editServices.reduce((sum, s) => sum + s.price, 0) * (editDiscountValue / 100) 
                          : editDiscountValue).toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="space-y-4 pt-4 border-t border-zinc-800">
                    <Label className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Adjustment</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-xs">-$</span>
                      <Input
                        type="number"
                        value={editAdjustmentAmount || ''}
                        onChange={e => setEditAdjustmentAmount(parseFloat(e.target.value) || 0)}
                        className="w-full bg-zinc-900 border-zinc-800 text-sm h-9 text-right font-mono focus-visible:ring-0 px-2"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {editAdjustmentAmount > 0 && (
                    <div className="flex justify-between items-center px-2 text-sm text-red-400 font-medium">
                      <span>Adjusted</span>
                      <span className="font-mono">
                        -${editAdjustmentAmount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center px-2 mt-2 pt-2 border-t border-zinc-800/50">
                     <span className="text-sm text-zinc-200 font-bold uppercase tracking-wider">TOTAL OWED</span>
                     <span className="text-2xl font-black text-emerald-400">${Math.max(0, editServices.reduce((sum, s) => sum + s.price, 0) - (editDiscountType === 'percent' ? editServices.reduce((sum, s) => sum + s.price, 0) * (editDiscountValue / 100) : editDiscountValue) - editAdjustmentAmount).toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50 mt-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setEditIsSent(!editIsSent)}
                    className={cn(
                      "gap-2 font-bold text-[11px] uppercase tracking-wider",
                      editIsSent 
                        ? "text-blue-400 hover:text-blue-300 hover:bg-blue-400/10" 
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                    )}
                  >
                    <div className={cn(
                      "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                      editIsSent ? "bg-blue-500 border-blue-400" : "bg-zinc-950 border-zinc-700"
                    )}>
                      {editIsSent && <CheckCircle className="h-3 w-3 text-white fill-white" />}
                    </div>
                    I have sent this invoice to the customer
                  </Button>
                  {editIsSent && selectedInvoice.sentDate && (
                    <span className="text-[10px] text-zinc-500 italic ml-auto">
                      Marked sent on {new Date(selectedInvoice.sentDate).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Service Date</Label>
                    <Input 
                      type="date"
                      value={serviceDate}
                      onChange={(e) => setServiceDate(e.target.value)}
                      className="bg-zinc-900 border-zinc-800 text-white [color-scheme:dark]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Vehicle Details</Label>
                    {(() => {
                      const cust = customers.find(c => c.id === selectedInvoice.customerId);
                      const vels = cust?.vehicles || [];
                      const currentVehLabel = editVehicle;
                      const isInList = vels.some(v => `${v.year || ''} ${v.make} ${v.model}`.trim() === currentVehLabel);
                      
                      return (
                        <div className="space-y-2">
                          {vels.length > 0 && (
                            <Select 
                              value={isInList ? currentVehLabel : "custom"} 
                              onValueChange={(val) => {
                                if (val !== "custom") setEditVehicle(val);
                                // If custom, we keep the current editVehicle or clear it? 
                                // Better to keep it so they can edit it.
                              }}
                            >
                              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white">
                                <SelectValue placeholder="Select from CRM" />
                              </SelectTrigger>
                              <SelectContent>
                                {vels.map((v, idx) => {
                                  const label = `${v.year || ''} ${v.make} ${v.model}`.trim();
                                  return <SelectItem key={v.id || idx} value={label}>{label}</SelectItem>;
                                })}
                                <SelectItem value="custom">Custom / Other</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          
                          {(!isInList || vels.length === 0) && (
                            <Input 
                              value={editVehicle}
                              onChange={(e) => setEditVehicle(e.target.value)}
                              placeholder="Year Make Model"
                              className="bg-zinc-900 border-zinc-800 text-white"
                            />
                          )}
                        </div>
                      );
                    })()}
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

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-zinc-800 w-full">
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <Button variant="outline" className="border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10" onClick={() => {
                      const currentInv = buildCurrentEditedInvoice();
                      generatePDF(currentInv, false);
                    }}>
                      <Eye className="h-4 w-4 mr-2" /> Preview
                    </Button>
                    <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800 text-zinc-300" onClick={() => {
                      const currentInv = buildCurrentEditedInvoice();
                      generatePDF(currentInv, false);
                    }}>
                      <Printer className="h-4 w-4 mr-2" /> Print
                    </Button>
                    <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800 text-zinc-300" onClick={() => {
                      const currentInv = buildCurrentEditedInvoice();
                      generatePDF(currentInv, true);
                    }}>
                      <Save className="h-4 w-4 mr-2" /> Save to PDF
                    </Button>
                    <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-900" onClick={() => {
                       const currentInv = buildCurrentEditedInvoice();
                      openEmailModal(currentInv);
                    }}>
                      <Mail className="h-4 w-4 mr-2" /> Preview Email
                    </Button>
                  </div>
                  <div className="flex gap-2 justify-end w-full sm:w-auto">
                    <Button variant="ghost" className="text-zinc-500" onClick={() => setSelectedInvoice(null)}>Cancel</Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20 whitespace-nowrap" onClick={saveEditedInvoice}>
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
                      <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-white" onClick={() => { setEditPaidValue(String(selectedInvoice.paidAmount || 0)); setEditTipValue(String(selectedInvoice.tipAmount || 0)); setIsEditingPaid(true); }}>
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

              <div className="mt-6">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6" onClick={() => { setPaymentAmount(Math.max(0, selectedInvoice.total - (selectedInvoice.paidAmount || 0)).toFixed(2)); setPaymentDialogOpen(true); }}>
                  <CreditCard className="h-4 w-4 mr-2" /> 
                  {(selectedInvoice.paymentStatus === 'paid' || selectedInvoice.total - (selectedInvoice.paidAmount || 0) <= 0) ? 'Record Additional Payment / Tip' : 'Record Payment'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
      {/* Customer Profile Modal (Auto-opens from Analytics) */}
      <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-zinc-950 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              <User className="h-5 w-5 text-violet-400" />
              {editingCustomer?.id ? 'Customer Profile' : 'Add New Customer'}
            </DialogTitle>
            <DialogDescription className="text-zinc-500 italic">
              Manage contact details and business information for this customer.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Full Name</Label>
                <Input 
                  value={editingCustomer?.name || ""} 
                  onChange={e => setEditingCustomer(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Email Address</Label>
                <Input 
                  value={editingCustomer?.email || ""} 
                  onChange={e => setEditingCustomer(prev => prev ? { ...prev, email: e.target.value } : null)}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Phone Number</Label>
                <Input 
                  value={editingCustomer?.phone || ""} 
                  onChange={e => setEditingCustomer(prev => prev ? { ...prev, phone: e.target.value } : null)}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Address / Location</Label>
                <Input 
                  value={editingCustomer?.address || ""} 
                  onChange={e => setEditingCustomer(prev => prev ? { ...prev, address: e.target.value } : null)}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-zinc-800 pt-6">
            <Button variant="ghost" onClick={() => setIsCustomerModalOpen(false)} className="text-zinc-500 hover:text-white">Cancel</Button>
            <Button 
              className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-6 shadow-lg shadow-violet-900/20"
              onClick={async () => {
                if (editingCustomer) {
                  try {
                    await upsertSupabaseCustomer(editingCustomer);
                    toast({ title: "Success", description: "Customer profile updated." });
                    loadData();
                    setIsCustomerModalOpen(false);
                  } catch (err) {
                    toast({ title: "Error", description: "Failed to save profile.", variant: "destructive" });
                  }
                }
              }}
            >
              Save Profile Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Invoicing;
