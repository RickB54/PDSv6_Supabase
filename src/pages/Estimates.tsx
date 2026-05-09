import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Printer, Save, Trash2, Plus, Search, CheckCircle, XCircle, FileBarChart, Pencil, Calendar, Clock, AlertCircle, Info } from "lucide-react";
import { getSupabaseEstimates, upsertSupabaseEstimate, deleteSupabaseEstimate, Customer } from "@/lib/supa-data";
import supabase from "@/lib/supabase";
import { getUnifiedCustomers } from "@/lib/customers";
import { servicePackages, addOns } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { savePDFToArchive } from "@/lib/pdfArchive";
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
import { MOCK_ESTIMATES, MOCK_CUSTOMERS } from "@/lib/demoMockData";
import logo from "@/assets/pds-final-logo.png";
import { getCustomPackages } from "@/lib/servicesMeta";
import { generateInvoiceNumber } from "@/lib/utils";

interface Estimate {
    id?: string;
    estimateNumber?: number;
    customerId: string;
    customerName: string;
    vehicle: string;
    services: { name: string; price: number }[];
    total: number;
    date: string;
    estimateDate?: string;
    status: "open" | "accepted" | "declined";
    packageId?: string;
    addonIds?: string[];
    vehicleId?: string;
    vehicleType?: string;
    discount?: number;
    discountType?: "percent" | "amount";
    notes?: string;
    created_at?: string;
}

const Estimates = () => {
    const { toast } = useToast();
    const [estimates, setEstimates] = useState<Estimate[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [services, setServices] = useState<{ name: string; price: number }[]>([]);
    const [dateFilter, setDateFilter] = useState("all");
    const [dateRange, setDateRange] = useState<DateRangeValue>({});
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
    const [filterCustomerId, setFilterCustomerId] = useState("");
    const [selectedPackage, setSelectedPackage] = useState("");
    const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
    const [selectedVehicleType, setSelectedVehicleType] = useState<"compact" | "midsize" | "truck" | "luxury">("midsize");
    const [selectedStatus, setSelectedStatus] = useState<"open" | "accepted" | "declined">("open");
    const [editingEstimateId, setEditingEstimateId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedVehicleId, setSelectedVehicleId] = useState("");
    const [discount, setDiscount] = useState(0);
    const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
    const formatPart = (val: any) => (val && val !== 'null' && val !== 'undefined') ? val : '';
    const getLocalDateString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [estimateDate, setEstimateDate] = useState(getLocalDateString());
    const [notes, setNotes] = useState("");

    const { isDemoMode } = useDemoMode();

    useEffect(() => {
        loadData();
    }, [isDemoMode]);

    const loadData = async () => {
        const [est, custs] = await Promise.all([
            isDemoMode ? Promise.resolve(MOCK_ESTIMATES as any[]) : getSupabaseEstimates(),
            getUnifiedCustomers()
        ]);
        setEstimates(est as any as Estimate[]);
        setCustomers(custs as any as Customer[]);
    };

    useEffect(() => {
        const customerId = searchParams.get('customerId');
        const customerName = searchParams.get('customerName');
        const discountParam = searchParams.get('discount');
        if (customerName) {
            const found = customers.find(c => c.name.toLowerCase().includes(customerName.toLowerCase()));
            if (found) {
                setSelectedCustomer(found.id!);
                setShowCreateForm(true);
            }
        }
        setDiscount(0);
        setDiscountType("percent");

        if (customerId && customers.length > 0) {
            const customer = customers.find(c => c.id === customerId);
            if (customer) {
                setSelectedCustomer(customer.id || "");
                setFilterCustomerId(customer.id || "");
                setShowCreateForm(true);
                if (discountParam) setDiscount(parseFloat(discountParam));
                
                // Auto-apply logic removed as requested
                setDiscount(0);

                if (customer.vehicles && customer.vehicles.length > 0) {
                    if (customer.vehicles.length === 1) {
                        const v = customer.vehicles[0];
                        setSelectedVehicleId(v.id || "");
                        if (v.type) {
                            const vType = v.type.toLowerCase();
                            if (vType.includes('compact')) setSelectedVehicleType('compact');
                            else if (vType.includes('truck') || vType.includes('suv') || vType.includes('van')) setSelectedVehicleType('truck');
                            else if (vType.includes('luxury')) setSelectedVehicleType('luxury');
                            else setSelectedVehicleType('midsize');
                        }
                    } else {
                        setSelectedVehicleId("");
                    }
                } else if (customer.vehicleType) {
                    const vType = customer.vehicleType.toLowerCase();
                    if (vType.includes('compact')) setSelectedVehicleType('compact');
                    else if (vType.includes('truck') || vType.includes('suv') || vType.includes('van')) setSelectedVehicleType('truck');
                    else if (vType.includes('luxury')) setSelectedVehicleType('luxury');
                    else setSelectedVehicleType('midsize');
                }
            }
        }
    }, [searchParams, customers]);

    const calculateTotal = () => {
        const subtotal = services.reduce((sum, s) => sum + s.price, 0);
        if (discountType === 'percent') {
            return subtotal * (1 - (discount / 100));
        } else {
            return Math.max(0, subtotal - discount);
        }
    };

    const createEstimate = async () => {
        if (!selectedCustomer || services.length === 0) {
            toast({ title: "Error", description: "Please select customer and add services", variant: "destructive" });
            return;
        }

        const customer = customers.find(c => c.id === selectedCustomer);
        if (!customer) {
            console.error('Customer not found for ID:', selectedCustomer);
            toast({ title: "Error", description: "Customer record not found. Please try re-selecting the customer.", variant: "destructive" });
            return;
        }

        try {
            if (isDemoMode) {
                toast({ title: "Simulation Mode", description: "Estimate simulated locally. No real data was created." });
                setShowCreateForm(false);
                setEditingEstimateId(null);
                setSelectedCustomer("");
                setServices([]);
                return;
            }

            const vehicleObj = customer.vehicles?.find(v => v.id === selectedVehicleId);
            let vehicleStr = vehicleObj 
                ? `${formatPart(vehicleObj.year)} ${formatPart(vehicleObj.make)} ${formatPart(vehicleObj.model)}`.replace(/\s+/g, ' ').trim()
                : `${formatPart(customer.year)} ${formatPart(customer.vehicle)} ${formatPart(customer.model)}`.replace(/\s+/g, ' ').trim();

            if (selectedVehicleId === "primary") {
                vehicleStr = `${vehicleStr} (Primary)`.trim();
            }
            if (!vehicleStr) vehicleStr = "Unknown Vehicle";

            const estimateData: any = {
                id: editingEstimateId || undefined,
                estimateNumber: editingEstimateId ? estimates.find(e => e.id === editingEstimateId)?.estimateNumber : generateInvoiceNumber(),
                customerId: selectedCustomer,
                customerName: customer.name,
                vehicle: vehicleStr,
                services,
                total: calculateTotal(),
                date: new Date().toLocaleDateString(),
                estimateDate: estimateDate,
                status: selectedStatus,
                packageId: selectedPackage,
                addonIds: selectedAddons,
                vehicleId: selectedVehicleId || undefined,
                vehicleType: selectedVehicleType,
                discount,
                discountType,
                notes: notes,
                created_at: editingEstimateId ? estimates.find(e => e.id === editingEstimateId)?.created_at : new Date().toISOString(),
            };

            await upsertSupabaseEstimate(estimateData);
            toast({ title: "Success", description: editingEstimateId ? "Estimate updated successfully!" : "Estimate created successfully!" });
            setShowCreateForm(false);
            setEditingEstimateId(null);
            setSelectedCustomer("");
            setServices([]);
            setSelectedPackage("");
            setSelectedAddons([]);
            setSelectedStatus("open");
            setSelectedVehicleId("");
            setDiscount(0);
            setNotes("");
            setEstimateDate(getLocalDateString());
            loadData();
        } catch (error: any) {
            console.error('Error saving estimate:', error);
            toast({ title: "Error", description: `Failed to save estimate: ${error.message || 'Unknown error'}`, variant: "destructive" });
        }
    };

    const handleModify = (est: Estimate) => {
        setEditingEstimateId(est.id || null);
        setSelectedCustomer(est.customerId);
        setServices(est.services);
        setSelectedPackage(est.packageId || "");
        setSelectedVehicleType((est.vehicleType as any) || "midsize");
        setSelectedAddons(est.addonIds || []);
        setSelectedStatus(est.status || "open");
        setSelectedVehicleId((est as any).vehicleId || "");
        setDiscount(est.discount || 0);
        setDiscountType(est.discountType || "percent");
        setNotes(est.notes || "");
        setEstimateDate(est.estimateDate || getLocalDateString());
        setShowCreateForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleStatusChange = async (est: Estimate, newStatus: "open" | "accepted" | "declined") => {
        if (isDemoMode) {
            toast({ title: "Simulation Mode", description: "State updated in local view." });
            return;
        }
        const updated = { ...est, status: newStatus };
        await upsertSupabaseEstimate(updated as any);
        toast({ title: "Status Updated", description: `Estimate marked as ${newStatus}` });
        loadData();
        if (selectedEstimate?.id === est.id) setSelectedEstimate(updated as any);
    };

    const handleDeleteEstimate = async (id: string) => {
        if (isDemoMode) {
            toast({ title: "Simulation Mode", description: "Delete simulated locally." });
            setDeleteId(null);
            return;
        }
        await deleteSupabaseEstimate(id);
        toast({ title: "Deleted", description: "Estimate removed" });
        setDeleteId(null);
        loadData();
    };

    const generatePDF = (estimate: Estimate, action: 'print' | 'download' | 'archive') => {
        const doc = new jsPDF();
        
        // PROFESSIONAL STYLE (Identical to Invoice but for Estimates)
        try {
            const logoWidth = 28;
            const logoHeight = 28;
            doc.addImage(logo, 'PNG', 20, 10, logoWidth, logoHeight);
            
            // Contact Info next to logo
            doc.setFontSize(13);
            doc.setTextColor(16, 185, 129); // Emerald color
            doc.setFont("helvetica", "bold");
            doc.text("Rick Berube", 52, 18);
            
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            doc.setFont("helvetica", "normal");
            doc.text("54 Boston Street, Methuen MA 01844", 52, 24);
            doc.text("978-566-1008", 52, 29);
            
            // Company Name on the Right
            doc.setFontSize(14);
            doc.setTextColor(16, 185, 129);
            doc.setFont("helvetica", "bold");
            doc.text("Prime Auto Detail", 190, 18, { align: "right" });
            
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(11);
            doc.text("ESTIMATE / QUOTE", 190, 24, { align: "right" });
            doc.text(`Estimate #${estimate.estimateNumber || 'N/A'}`, 190, 29, { align: "right" });
        } catch (e) {
            console.warn("Professional header failed", e);
            doc.setFontSize(16);
            doc.text("Prime Auto Detail", 105, 15, { align: "center" });
        }

        const contentStartY = 45;
        doc.setFontSize(10);
        doc.text(`Estimate Date: ${estimate.estimateDate || estimate.date}`, 20, contentStartY);
        doc.text(`Quote Valid Until: ${new Date(new Date(estimate.estimateDate || estimate.date).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}`, 20, contentStartY + 6);
        
        // Move Customer and Vehicle to the right side
        doc.setFont("helvetica", "bold");
        doc.text(`Prospect: ${estimate.customerName}`, 130, contentStartY);
        doc.text(`Vehicle: ${estimate.vehicle}`, 130, contentStartY + 6);
        doc.setFont("helvetica", "normal");

        let y = contentStartY + 16;
        doc.setFontSize(11);
        doc.text("Proposed Services:", 20, y);
        y += 6;

        doc.setFontSize(10);
        estimate.services.forEach((s) => {
            doc.text(`${s.name}`, 25, y);
            doc.text(`$${(s.price || 0).toFixed(2)}`, 180, y, { align: "right" });
            y += 6;
        });

        y += 3;
        doc.line(20, y, 190, y);
        y += 8;

        doc.setFontSize(12);
        
        if (estimate.discount && estimate.discount > 0) {
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            const subtotal = estimate.services.reduce((sum, s) => sum + s.price, 0);
            const discountAmount = estimate.discountType === 'percent' 
                ? subtotal * (estimate.discount / 100)
                : estimate.discount;
            const discountLabel = estimate.discountType === 'percent'
                ? `Promotional Discount (${estimate.discount}%):`
                : `Promotional Discount:`;
            
            doc.text(discountLabel, 140, y);
            doc.text(`-$${discountAmount.toFixed(2)}`, 180, y, { align: "right" });
            y += 12;
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
        } else {
            // NO DISCOUNT: Remove the extra gap
            y += 2; 
        }

        doc.setFont("helvetica", "bold");
        doc.text("Estimated Total:", 125, y);
        doc.text(`$${(estimate.total || 0).toFixed(2)}`, 180, y, { align: "right" });
        doc.setFont("helvetica", "normal");
        y += 12;

        if (estimate.notes) {
            if (y > 230) {
                doc.addPage();
                y = 20;
            }
            doc.setFontSize(10);
            doc.setTextColor(60, 60, 60); 
            doc.setFont("helvetica", "bold");
            doc.text("Notes & Conversation Details:", 20, y);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(80, 80, 80);
            const splitNotes = doc.splitTextToSize(estimate.notes, 170);
            doc.text(splitNotes, 20, y + 5);
            y += (splitNotes.length * 5) + 10;
        }

        y += 10;
        doc.setTextColor(100);
        doc.setFontSize(10);
        doc.text("This is an estimate for detailing services. Prices may vary based on actual vehicle condition upon arrival.", 105, y, { align: "center" });
        doc.text("Thank you for considering Prime Auto Detail for your vehicle's protection and care!", 105, y + 6, { align: "center" });

        if (action === 'download') doc.save(`Estimate_${estimate.estimateNumber}.pdf`);
        else if (action === 'print') window.open(doc.output('bloburl'), '_blank');
    };

    const filterItems = () => {
        const now = new Date();
        return estimates.filter(e => {
            if (filterCustomerId && e.customerId !== filterCustomerId) return false;

            const estDate = new Date(e.created_at || e.date);
            let passQuick = true;
            if (dateFilter === "daily") passQuick = estDate.toDateString() === now.toDateString();
            else if (dateFilter === "weekly") passQuick = estDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            else if (dateFilter === "monthly") passQuick = estDate.getMonth() === now.getMonth() && estDate.getFullYear() === now.getFullYear();

            let passRange = true;
            if (dateRange.from) passRange = estDate >= new Date(new Date(dateRange.from).setHours(0, 0, 0, 0));
            if (passRange && dateRange.to) passRange = estDate <= new Date(new Date(dateRange.to).setHours(23, 59, 59, 999));

            let passSearch = true;
            if (searchTerm) {
                passSearch = (e.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    String(e.estimateNumber || '').includes(searchTerm);
            }

            return passQuick && passRange && passSearch;
        });
    };

    const filteredEstimates = filterItems();
    const openCount = filteredEstimates.filter(e => (e.status || 'open') === 'open').length;
    const acceptedCount = filteredEstimates.filter(e => (e.status || 'open') === 'accepted').length;

    return (
        <div className="min-h-screen bg-background pb-20 overflow-x-hidden w-full">
            <PageHeader title="Estimates" />
            <main className="container mx-auto px-4 py-6 max-w-6xl space-y-6 w-full">

                {/* Stats Card */}
                <Card className="p-6 bg-gradient-to-r from-zinc-900 to-zinc-800 border-zinc-700 shadow-lg relative overflow-hidden">
                    <div className="absolute right-0 top-0 h-full w-1/3 bg-amber-500/5 rotate-12 transform scale-150 pointer-events-none" />
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="p-4 rounded-full bg-amber-500/20 text-amber-500">
                                <FileText className="h-8 w-8" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">Estimates & Quotes</h2>
                                <p className="text-zinc-400 text-sm">Create, track, and approve estimates</p>
                                <div className="mt-2 flex items-center gap-2 text-xs font-bold font-mono text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 w-fit">
                            <Clock className="h-4 w-4" />
                            <span>SYSTEM STAMP: {new Date().toLocaleString()}</span>
                        </div>
                    </div>
                        </div>

                        <div className="flex gap-8">
                            <div className="text-center">
                                <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Open</p>
                                <p className="text-3xl font-bold text-amber-500 mt-1">{openCount}</p>
                            </div>
                            <div className="text-center border-l border-zinc-700 pl-8">
                                <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Accepted</p>
                                <p className="text-3xl font-bold text-emerald-500 mt-1">{acceptedCount}</p>
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
                                placeholder="Search estimates..."
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
                        <DateRangeFilter value={dateRange} onChange={setDateRange} storageKey="estimates-range" />
                        <Button className="bg-amber-600 hover:bg-amber-700 text-white border-0" onClick={() => { setEditingEstimateId(null); setSelectedCustomer(""); setServices([]); setShowCreateForm(true); }}>
                            <Plus className="h-4 w-4 mr-2" /> New Estimate
                        </Button>
                    </div>
                </div>

                {/* Create Form */}
                {showCreateForm && (
                    <Card className="p-6 bg-zinc-900 border-zinc-800 animate-in slide-in-from-top-4">
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-xl font-bold text-white">{editingEstimateId ? "Edit Estimate" : "Create New Estimate"}</h2>
                            <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                        </div>
                        {/* Form Content similar to existing but styled */}
                        <div className="space-y-4">
                            <div>
                                 <Label className="text-zinc-400">Customer</Label>
                                 <Select value={selectedCustomer} onValueChange={(val) => {
                                     setSelectedCustomer(val);
                                     const cust = customers.find(c => c.id === val);
                                     if (cust && cust.vehicles && cust.vehicles.length === 1) {
                                         const v = cust.vehicles[0];
                                         setSelectedVehicleId(v.id || "");
                                         if (v.type) {
                                            const vt = v.type.toLowerCase();
                                            if (vt.includes('compact')) setSelectedVehicleType('compact');
                                            else if (vt.includes('truck') || vt.includes('suv') || vt.includes('van')) setSelectedVehicleType('truck');
                                            else if (vt.includes('luxury')) setSelectedVehicleType('luxury');
                                            else setSelectedVehicleType('midsize');
                                         }
                                     } else if (cust && cust.vehicles && cust.vehicles.length > 1) {
                                         // Multiple vehicles: Clear selection to force user to choose
                                         setSelectedVehicleId("");
                                     } else if (cust && cust.vehicleType) {
                                        const vt = cust.vehicleType.toLowerCase();
                                        if (vt.includes('compact')) setSelectedVehicleType('compact');
                                        else if (vt.includes('truck') || vt.includes('suv') || vt.includes('van')) setSelectedVehicleType('truck');
                                        else if (vt.includes('luxury')) setSelectedVehicleType('luxury');
                                        else setSelectedVehicleType('midsize');
                                     } else {
                                         setSelectedVehicleId("");
                                     }
                                 }}>
                                     <SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1"><SelectValue placeholder="Select Customer" /></SelectTrigger>
                                     <SelectContent>
                                         {customers.map(c => <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>)}
                                     </SelectContent>
                                 </Select>
                             </div>

                             {selectedCustomer && (
                                 <div className="animate-in slide-in-from-top-2">
                                     <Label className="text-zinc-400">Select Vehicle</Label>
                                     <Select value={selectedVehicleId} onValueChange={(val) => {
                                         setSelectedVehicleId(val);
                                         const cust = customers.find(c => c.id === selectedCustomer);
                                         const v = cust?.vehicles?.find(vh => vh.id === val);
                                         if (v && v.type) {
                                            const vt = v.type.toLowerCase();
                                            if (vt.includes('compact')) setSelectedVehicleType('compact');
                                            else if (vt.includes('truck') || vt.includes('suv') || vt.includes('van')) setSelectedVehicleType('truck');
                                            else if (vt.includes('luxury')) setSelectedVehicleType('luxury');
                                            else setSelectedVehicleType('midsize');
                                         }
                                     }}>
                                         <SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1">
                                             <SelectValue placeholder="Choose vehicle from garage..." />
                                         </SelectTrigger>
                                         <SelectContent>
                                             {customers.find(c => c.id === selectedCustomer)?.vehicles?.map(v => (
                                                 <SelectItem key={v.id} value={v.id!}>
                                                     {`${formatPart(v.year)} ${formatPart(v.make)} ${formatPart(v.model)}`.trim()} ({v.type})
                                                 </SelectItem>
                                             )) || (
                                                 ((cust) => (cust && (cust.vehicle || cust.model) ? (
                                                     <SelectItem value="primary">
                                                         {`${formatPart(cust.year)} ${formatPart(cust.vehicle)} ${formatPart(cust.model)}`.trim()} (Primary)
                                                     </SelectItem>
                                                 ) : (
                                                     <SelectItem value="none" disabled>No vehicles in garage</SelectItem>
                                                 )))(customers.find(c => c.id === selectedCustomer))
                                             )}
                                         </SelectContent>
                                     </Select>
                                 </div>
                             )}

                            {/* Packages / Vehicle / Addons Logic - Simplified for this bulk update but keeping functional structure */}
                            <div className="border-t border-zinc-800 pt-4">
                                <Label className="text-zinc-400">Quick Package Select</Label>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <Select value={selectedPackage} onValueChange={(val) => {
                                        setSelectedPackage(val);
                                        const pkg = servicePackages.find(p => p.id === val);
                                        if (pkg) {
                                            const price = pkg.pricing[selectedVehicleType] || 0;
                                            setServices([{ name: pkg.name, price }]);
                                        }
                                    }}>
                                        <SelectTrigger className="bg-zinc-950 border-zinc-800"><SelectValue placeholder="Package..." /></SelectTrigger>
                                        <SelectContent>{servicePackages.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Select value={selectedVehicleType} onValueChange={(val: any) => {
                                        setSelectedVehicleType(val);
                                        // Update price logic...
                                        if (selectedPackage) {
                                            const pkg = servicePackages.find(p => p.id === selectedPackage);
                                            if (pkg) setServices([{ name: pkg.name, price: pkg.pricing[val] || 0 }]);
                                        }
                                    }}>
                                        <SelectTrigger className="bg-zinc-950 border-zinc-800"><SelectValue placeholder="Vehicle Type used for pricing" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="compact">Compact</SelectItem>
                                            <SelectItem value="midsize">Midsize</SelectItem>
                                            <SelectItem value="truck">Truck/SUV</SelectItem>
                                            <SelectItem value="luxury">Luxury</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                             <div className="grid grid-cols-2 gap-4">
                                 <div>
                                     <Label className="text-zinc-400">Discount</Label>
                                     <div className="flex items-center gap-2 mt-1">
                                         <Select value={discountType} onValueChange={(val: any) => setDiscountType(val)}>
                                             <SelectTrigger className="w-24 bg-zinc-950 border-zinc-800">
                                                 <SelectValue />
                                             </SelectTrigger>
                                             <SelectContent>
                                                 <SelectItem value="percent">%</SelectItem>
                                                 <SelectItem value="amount">$</SelectItem>
                                             </SelectContent>
                                         </Select>
                                         <Input 
                                             type="number" 
                                             value={discount} 
                                             onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} 
                                             className="bg-zinc-950 border-zinc-800" 
                                             placeholder="0"
                                         />
                                     </div>
                                 </div>
                                 <div>
                                     <Label className="text-zinc-400">Estimate Date</Label>
                                     <Input 
                                         type="date" 
                                         className="bg-zinc-950 border-zinc-800 mt-1"
                                         value={estimateDate}
                                         onChange={(e) => setEstimateDate(e.target.value)}
                                     />
                                 </div>
                             </div>

                             <div>
                                 <Label className="text-zinc-400">Add-ons</Label>
                                 <div className="flex flex-wrap gap-2 mt-2">
                                     {addOns.filter(a => [
                                         'wheel-cleaning', 
                                         'clay-bar', 
                                         'headlight-restoration', 
                                         'leather-conditioning', 
                                         'ceramic-trim-coat', 
                                         'engine-bay', 
                                         'pet-hair', 
                                         'stain-treatment', 
                                         'scratch-repair', 
                                         'deep-interior'
                                     ].includes(a.id)).map(addon => {
                                         const isSelected = selectedAddons.includes(addon.id);
                                         return (
                                             <Button
                                                 key={addon.id}
                                                 variant={isSelected ? "default" : "outline"}
                                                 size="sm"
                                                 className={isSelected ? "bg-amber-600" : "border-zinc-800 text-zinc-400"}
                                                 onClick={() => {
                                                     let newAddons;
                                                     if (isSelected) {
                                                         newAddons = selectedAddons.filter(id => id !== addon.id);
                                                     } else {
                                                         newAddons = [...selectedAddons, addon.id];
                                                     }
                                                     setSelectedAddons(newAddons);
                                                     
                                                     // Update services list
                                                     const pkg = servicePackages.find(p => p.id === selectedPackage);
                                                     const basePrice = pkg ? pkg.pricing[selectedVehicleType] || 0 : 0;
                                                     const baseService = pkg ? [{ name: pkg.name, price: basePrice }] : services.filter(s => !addOns.some(a => a.name === s.name));
                                                     
                                                     const addonServices = newAddons.map(id => {
                                                         const a = addOns.find(add => add.id === id);
                                                         if (!a) return null;
                                                         const price = a.pricing[selectedVehicleType] || a.basePrice || 0;
                                                         return { name: a.name, price };
                                                     }).filter(Boolean) as { name: string, price: number }[];
                                                     
                                                     setServices([...baseService, ...addonServices]);
                                                 }}
                                             >
                                                 {addon.name} (+${addon.pricing[selectedVehicleType] || addon.basePrice})
                                             </Button>
                                         );
                                     })}
                                 </div>
                             </div>

                             <div>
                                 <Label className="text-zinc-400">Notes & Conversation Details</Label>
                                 <textarea 
                                     value={notes}
                                     onChange={(e) => setNotes(e.target.value)}
                                     placeholder="Enter specific details from your conversation..."
                                     className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-md p-2 text-white text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                 />
                             </div>

                            {/* Services List */}
                            <div className="bg-zinc-950 p-4 rounded border border-zinc-800">
                                {services.map((s, i) => (
                                    <div key={i} className="flex justify-between items-center text-zinc-300 mb-2">
                                        <span>{s.name}</span>
                                        <span className="font-mono">${(s.price || 0).toFixed(2)}</span>
                                    </div>
                                ))}
                                <div className="border-t border-zinc-800 pt-2 flex justify-between font-bold text-white">
                                    <span>Total</span>
                                    <span>${calculateTotal().toFixed(2)}</span>
                                </div>
                            </div>

                            <Button onClick={createEstimate} className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                                {editingEstimateId ? "Save Changes" : "Create Estimate"}
                            </Button>
                        </div>
                    </Card>
                )}

                {/* Estimate List */}
                <div className="space-y-4">
                    {filteredEstimates.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredEstimates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(est => (
                                <div key={est.id} className="group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-amber-500/30 transition-all hover:shadow-lg hover:shadow-amber-500/5 cursor-pointer" onClick={() => setSelectedEstimate(est)}>
                                    <div className="flex items-center gap-4 mb-4 md:mb-0">
                                        <div className={`h-12 w-12 rounded-full flex items-center justify-center border ${(est.status === 'accepted') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                            (est.status === 'declined') ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                                                'bg-amber-500/10 border-amber-500/20 text-amber-500'
                                            }`}>
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-white text-lg">#{est.estimateNumber}</span>
                                                <span className="text-zinc-500 text-sm">• {est.date}</span>
                                                {(est as any).created_at && (
                                                    <span className="ml-2 text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700 font-mono">
                                                        STAMP: {new Date((est as any).created_at).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="font-medium text-zinc-300">{est.customerName}</div>
                                            <div className="text-xs text-zinc-500">{est.vehicle}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 justify-between md:justify-end w-full md:w-auto">
                                        <div className="text-right">
                                            <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Total</div>
                                            <div className="text-xl font-bold text-white">${(est.total || 0).toFixed(2)}</div>
                                        </div>

                                        <div className="text-right min-w-[100px]">
                                            <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Status</div>
                                            <div className={`font-medium ${(est.status || 'open') === 'accepted' ? 'text-emerald-400' :
                                                (est.status || 'open') === 'declined' ? 'text-red-400' : 'text-amber-400'
                                                }`}>
                                                {(est.status || 'open').toUpperCase()}
                                            </div>
                                        </div>

                                        <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={() => handleModify(est)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-400/10" onClick={() => setDeleteId(est.id!)}>
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
                            <h3 className="text-xl font-medium text-zinc-300">No estimates found</h3>
                            <Button className="mt-6 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setShowCreateForm(true)}>
                                Create Estimate
                            </Button>
                        </div>
                    )}
                </div>

            </main>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Estimate?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="button-group-responsive">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteId && handleDeleteEstimate(deleteId)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Estimate Detail Modal */}
            {selectedEstimate && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedEstimate(null)}>
                    <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-zinc-950 border-zinc-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                        Estimate #{selectedEstimate.estimateNumber}
                                    </h2>
                                    <p className="text-zinc-400">Prime Auto Detail</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedEstimate(null)} className="h-8 w-8 p-0 rounded-full hover:bg-zinc-900">✕</Button>
                            </div>

                            {/* Service Details similar to Invoicing but tailored for Estimates */}
                            <div className="py-6 space-y-3 border-t border-b border-zinc-800">
                                {selectedEstimate.services.map((s, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm">
                                        <span className="text-zinc-300">{s.name}</span>
                                        <span className="font-mono text-zinc-200">${(s.price || 0).toFixed(2)}</span>
                                    </div>
                                ))}
                                <div className="border-t border-zinc-800 mt-4 pt-4 flex justify-between items-center">
                                    <span className="text-lg font-bold text-white">Total</span>
                                    <span className="text-2xl font-bold text-amber-500">${(selectedEstimate.total || 0).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 justify-end pt-4 mt-2">
                                {(selectedEstimate.status || 'open') !== 'accepted' && (
                                    <Button variant="outline" className="border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10" onClick={() => handleStatusChange(selectedEstimate, 'accepted')}>
                                        <CheckCircle className="h-4 w-4 mr-2" /> Mark Accepted
                                    </Button>
                                )}
                                {(selectedEstimate.status || 'open') !== 'declined' && (
                                    <Button variant="outline" className="border-red-500/50 text-red-500 hover:bg-red-500/10" onClick={() => handleStatusChange(selectedEstimate, 'declined')}>
                                        <XCircle className="h-4 w-4 mr-2" /> Mark Declined
                                    </Button>
                                )}
                                 <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800 text-zinc-300" onClick={() => generatePDF(selectedEstimate, 'download')}>
                                    <Save className="h-4 w-4 mr-2" /> Save PDF
                                </Button>
                                <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800 text-zinc-300" onClick={() => generatePDF(selectedEstimate, 'print')}>
                                    <Printer className="h-4 w-4 mr-2" /> Print
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default Estimates;
