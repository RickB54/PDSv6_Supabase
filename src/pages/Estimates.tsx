import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Printer, Save, Trash2, Plus, Search, CheckCircle, XCircle, FileBarChart, Pencil, Calendar, Clock, AlertCircle, Info, Sparkles, Loader2, Eye, Send, Users, X, Link as LinkIcon } from "lucide-react";
import { getSupabaseEstimates, upsertSupabaseEstimate, deleteSupabaseEstimate, Customer } from "@/lib/supa-data";
import { refineTextWithAI } from "@/lib/ai-refiner";
import supabase from "@/lib/supabase";
import { getUnifiedCustomers } from "@/lib/customers";
import { servicePackages, addOns } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";
import { savePDFToArchive } from "@/lib/pdfArchive";
import { normalizeVehicleType } from "@/lib/pricingHelpers";
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
import qrCode from "@/assets/review-qr.png";
import { getCustomPackages } from "@/lib/servicesMeta";
import { generateInvoiceNumber } from "@/lib/utils";
import { useCouponsStore } from "@/store/coupons";

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
    isSent?: boolean;
    sentDate?: string;
}


const extractPreCheckData = (notes: string) => {
    if (!notes) return null;
    const marker = "[PRE_CHECK_DATA]: ";
    const idx = notes.indexOf(marker);
    if (idx === -1) return null;
    try {
        const jsonStr = notes.substring(idx + marker.length).trim();
        return JSON.parse(jsonStr);
    } catch {
        return null;
    }
};

const getPublicNotes = (notes: string): string => {
    if (!notes) return "";
    let clean = notes;
    if (clean.includes("[ACCEPTED_BY_CUSTOMER]")) clean = clean.split("[ACCEPTED_BY_CUSTOMER]")[0];
    if (clean.includes("[PRE_CHECK_DATA]:")) clean = clean.split("[PRE_CHECK_DATA]:")[0];
    let divider = "=== INTERNAL HISTORY LOG ===";
    if (clean.includes(divider)) return clean.split(divider)[0].trim();
    if (clean.includes("[VEHICLE INFO]")) return clean.split("[VEHICLE INFO]")[0].trim();
    return clean.trim();
};

const getInternalNotes = (notes: string): string => {
    if (!notes) return "";
    let clean = notes;
    if (clean.includes("[ACCEPTED_BY_CUSTOMER]")) clean = clean.split("[ACCEPTED_BY_CUSTOMER]")[0];
    if (clean.includes("[PRE_CHECK_DATA]:")) clean = clean.split("[PRE_CHECK_DATA]:")[0];
    let divider = "=== INTERNAL HISTORY LOG ===";
    if (clean.includes(divider)) return clean.split(divider)[1].trim();
    if (clean.includes("[VEHICLE INFO]")) return clean.substring(clean.indexOf("[VEHICLE INFO]")).trim();
    return "";
};

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
    const [discountMethod, setDiscountMethod] = useState<"coupon" | "manual">("manual");
    const [discountCode, setDiscountCode] = useState("");
    const { items: coupons, refresh: refreshCoupons } = useCouponsStore();
    
    useEffect(() => {
        refreshCoupons();
    }, [refreshCoupons]);

    const [currentEstimateNumber, setCurrentEstimateNumber] = useState<number>(0);

    useEffect(() => {
        if (showCreateForm) {
            if (editingEstimateId) {
                const est = estimates.find(e => e.id === editingEstimateId);
                setCurrentEstimateNumber(est?.estimateNumber || generateInvoiceNumber());
            } else {
                setCurrentEstimateNumber(generateInvoiceNumber());
            }
        }
    }, [showCreateForm, editingEstimateId, estimates]);
        const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
    const [editIsSent, setEditIsSent] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();
    const formatPart = (val: any) => (val && val !== 'null' && val !== 'undefined') ? val : '';
    const formatDisplayDate = (dStr: string) => {
        if (!dStr) return '';
        if (dStr.includes('-')) {
            const parts = dStr.split('-');
            if (parts.length === 3 && parts[0].length === 4) {
                return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}/${parts[0]}`;
            }
        }
        return dStr;
    };
    
    const getValidUntilDate = (dStr: string) => {
        if (!dStr) return '';
        let d = new Date();
        if (dStr.includes('-')) {
            const parts = dStr.split('-');
            if (parts.length === 3 && parts[0].length === 4) {
                d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            } else {
                d = new Date(dStr);
            }
        } else {
            d = new Date(dStr);
        }
        d.setMonth(d.getMonth() + 1);
        return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    };

    const getLocalDateString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [estimateDate, setEstimateDate] = useState(getLocalDateString());
    const [notes, setNotes] = useState("");
    const [isRefiningNotes, setIsRefiningNotes] = useState(false);
    
    // Full screen notes editor states
    const [isNotesFullScreen, setIsNotesFullScreen] = useState(false);
    const [fullScreenPublicText, setFullScreenPublicText] = useState("");
    const [fullScreenInternalText, setFullScreenInternalText] = useState("");
    const [notesSource, setNotesSource] = useState<"form" | "detail">("form");

    const handleSaveDetailNotes = async (updatedNotes: string) => {
        if (!selectedEstimate) return;
        const updated = { ...selectedEstimate, notes: updatedNotes };
        try {
            if (!isDemoMode) {
                await upsertSupabaseEstimate(updated as any);
            }
            setSelectedEstimate(updated);
            setEstimates(prev => prev.map(e => e.id === selectedEstimate.id ? updated : e));
            toast({ title: "Notes Saved", description: "Estimate notes updated successfully." });
        } catch (err) {
            toast({ title: "Error", description: "Failed to update notes", variant: "destructive" });
        }
    };

    const handleAIEnhance = async () => {
        if (!notes.trim()) {
            toast({ title: "No text found", description: "Please enter some notes to enhance.", variant: "destructive" });
            return;
        }
        setIsRefiningNotes(true);
        try {
            const refined = await refineTextWithAI(notes);
            setNotes(refined);
            toast({ title: "Notes Enhanced", description: "Your notes have been professionally polished." });
        } catch (error) {
            toast({ title: "Error", description: "Failed to enhance notes.", variant: "destructive" });
        } finally {
            setIsRefiningNotes(false);
        }
    };

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
        const editId = searchParams.get('editId');

        if (editId && estimates.length > 0) {
            const found = estimates.find(e => e.id === editId);
            if (found && !selectedEstimate) {
                setSelectedEstimate(found);
                return; // Stop here if we opened an estimate
            }
        }
        if (customerName) {
            const found = customers.find(c => c.name.toLowerCase().includes(customerName.toLowerCase()));
            if (found) {
                setSelectedCustomer(found.id!);
                const hasExisting = estimates.some(e => e.customerId === found.id);
                setShowCreateForm(!hasExisting);
            }
        }
        setDiscount(0);
        setDiscountType("percent");

        if (customerId && customers.length > 0) {
            const customer = customers.find(c => c.id === customerId);
            if (customer) {
                setSelectedCustomer(customer.id || "");
                setFilterCustomerId(customer.id || "");
                const hasExisting = estimates.some(e => e.customerId === customerId);
                setShowCreateForm(!hasExisting);
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
    }, [searchParams, customers, estimates]);

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

        if (isSubmitting) return; // Prevent double-click
        setIsSubmitting(true);

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
                ? `${formatPart(vehicleObj.year)} ${formatPart(vehicleObj.make)} ${formatPart(vehicleObj.model)} ${vehicleObj.color ? `[Color: ${vehicleObj.color}]` : ''}`.replace(/\s+/g, ' ').trim()
                : `${formatPart(customer.year)} ${formatPart(customer.vehicle)} ${formatPart(customer.model)}`.replace(/\s+/g, ' ').trim();

            if (selectedVehicleId === "primary") {
                vehicleStr = `${vehicleStr} (Primary)`.trim();
            }
            if (!vehicleStr) vehicleStr = "Unknown Vehicle";

            const isEditing = !!editingEstimateId;
            const estimateData: any = {
                id: editingEstimateId || undefined,
                estimateNumber: isEditing ? estimates.find(e => e.id === editingEstimateId)?.estimateNumber : (currentEstimateNumber || generateInvoiceNumber()),
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
                isSent: editIsSent,
                sentDate: editIsSent ? (isEditing ? estimates.find(e => e.id === editingEstimateId)?.sentDate || new Date().toISOString() : new Date().toISOString()) : undefined,
                created_at: isEditing ? estimates.find(e => e.id === editingEstimateId)?.created_at : new Date().toISOString(),
            };

            // Save to Supabase
            const saved = await upsertSupabaseEstimate(estimateData);
            
            const estToUpdate = isEditing ? estimates.find(e => e.id === editingEstimateId) : null;
            const wasSentBefore = estToUpdate?.isSent;
            
            if (editIsSent && !wasSentBefore && selectedCustomer) {
                try {
                    await supabase.from('engagements').insert({
                        customer_id: selectedCustomer,
                        customer_name: customer.name,
                        type: 'correspondence',
                        note: `Estimate Sent: #${estimateData.estimateNumber}\nTotal: $${(estimateData.total || 0).toFixed(2)}\nServices: ${services.map(s => s.name).join(', ') || 'N/A'}`
                    });
                } catch (e) {
                    console.warn("Could not log estimate to engagements:", e);
                }
            }

            // OPTIMISTIC UPDATE: merge the returned record into local state immediately
            // so the list appears without waiting for a full network reload
            const savedEstimate: Estimate = {
                ...estimateData,
                id: saved?.id || estimateData.id || `est_${Date.now()}`,
            };
            setEstimates(prev => {
                if (isEditing) {
                    return prev.map(e => e.id === editingEstimateId ? savedEstimate : e);
                } else {
                    return [savedEstimate, ...prev];
                }
            });

            toast({ title: "Success", description: isEditing ? "Estimate updated successfully!" : "Estimate created successfully!" });

            // Reset form
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
            setEditIsSent(false);
            setEstimateDate(getLocalDateString());

            // Background sync to reconcile with server (no await — UI already updated)
            loadData();
        } catch (error: any) {
            console.error('Error saving estimate:', error);
            toast({ title: "Error", description: `Failed to save estimate: ${error.message || 'Unknown error'}`, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
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
        setEditIsSent(est.isSent || false);
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

    const toggleSentStatus = async (e: React.MouseEvent, estimate: Estimate) => {
        e.stopPropagation();
        if (isDemoMode) {
            toast({ title: "Simulation Mode", description: "Sent status updated locally." });
            return;
        }

        const newStatus = !estimate.isSent;
        const updatedEstimate = {
            ...estimate,
            isSent: newStatus,
            sentDate: newStatus ? new Date().toISOString() : undefined
        };

        try {
            await upsertSupabaseEstimate(updatedEstimate as any);

            if (newStatus && estimate.customerId) {
                try {
                    await supabase.from('engagements').insert({
                        customer_id: estimate.customerId,
                        customer_name: estimate.customerName,
                        type: 'correspondence',
                        note: `Estimate Sent: #${estimate.estimateNumber}\nTotal: $${(estimate.total || 0).toFixed(2)}\nServices: ${estimate.services?.map(s => s.name).join(', ') || 'N/A'}`
                    });
                } catch (e) {
                    console.warn("Could not log estimate to engagements:", e);
                }
            }

            toast({
                title: newStatus ? "Marked as Sent" : "Marked as Unsent",
                description: newStatus ? `Estimate #${estimate.estimateNumber} recorded as sent.` : `Estimate #${estimate.estimateNumber} status cleared.`
            });
            loadData();
        } catch (err) {
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
        }
    };

    const handleCopyLink = (estId: string) => {
        const link = `https://primeautodetail.net/estimate/${estId}`;
        navigator.clipboard.writeText(link);
        toast({ title: "Link Copied", description: "Estimate URL copied to clipboard." });
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
            doc.text("ESTIMATE / QUOTE", 190, 20, { align: "right" });
            doc.text(`Estimate #${estimate.estimateNumber || 'N/A'}`, 190, 25, { align: "right" });
        } catch (e) {
            console.warn("Professional header failed", e);
            doc.setFontSize(16);
            doc.text("Prime Auto Detail", 105, 15, { align: "center" });
        }

        const contentStartY = 45;
        doc.setFontSize(10);
        const targetDateStr = estimate.estimateDate || estimate.date;
        doc.text(`Estimate Date: ${formatDisplayDate(targetDateStr)}`, 20, contentStartY);
        doc.text(`Quote Valid Until: ${getValidUntilDate(targetDateStr)}`, 20, contentStartY + 6);
        
        // Move Customer and Vehicle to the right side
        doc.setFont("helvetica", "bold");
                doc.text(`Customer: ${estimate.customerName}`, 130, contentStartY);
        doc.text(`Vehicle: ${(estimate.vehicle || '').replace(/\bnull\b/ig, '').replace(/\s+/g, ' ').trim()}`, 130, contentStartY + 6);
        doc.setFont("helvetica", "normal");

        let y = contentStartY + 16;
        doc.setFontSize(11);
        doc.text("Proposed Services:", 20, y);
        y += 6;

        doc.setFontSize(10);
        estimate.services.forEach((s) => {
                        const serviceName = s.name || 'Service';
            const lines = doc.splitTextToSize(serviceName, 140);
            doc.text(lines, 25, y);
            doc.text(`$${(s.price || 0).toFixed(2)}`, 180, y, { align: "right" });
            y += (lines.length * 7);
        });

        y += 3;
        doc.line(20, y, 190, y);
        y += 8;

        doc.setFontSize(12);
        
        if (estimate.discount && estimate.discount > 0) {
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            const subtotal = estimate.services.reduce((sum, s) => sum + s.price, 0);

            // Self-healing: if discountType is missing (old records), back-calculate from saved total
            let resolvedType = estimate.discountType;
            if (!resolvedType && estimate.total != null && subtotal > 0) {
                const asPercent = Math.round(subtotal * (1 - estimate.discount / 100) * 100) / 100;
                const asAmount  = Math.round((subtotal - estimate.discount) * 100) / 100;
                const savedTotal = Math.round(estimate.total * 100) / 100;
                if (Math.abs(asPercent - savedTotal) < 0.02) {
                    resolvedType = 'percent';
                } else if (Math.abs(asAmount - savedTotal) < 0.02) {
                    resolvedType = 'amount';
                } else {
                    resolvedType = 'percent'; // safest fallback for coupon discounts
                }
            }

            const discountAmount = resolvedType === 'percent'
                ? subtotal * (estimate.discount / 100)
                : estimate.discount;
            const discountLabel = resolvedType === 'percent'
                ? `Discount (${estimate.discount}%):`
                : `Discount:`;

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
            const splitNotes = doc.splitTextToSize(getPublicNotes(estimate.notes || ""), 170);
            doc.text(splitNotes, 20, y + 5);
            y += (splitNotes.length * 5) + 10;
        }

                y += 10;
        doc.setTextColor(100);
        doc.setFontSize(10);
        doc.text("This is an estimate for detailing services. Prices may vary based on actual vehicle condition upon arrival.", 105, y, { align: "center" });
        doc.text("Thank you for trusting Prime Auto Detail with your vehicle!", 105, y + 6, { align: "center" });
        doc.text("We truly appreciate your business and look forward to serving you again.", 105, y + 12, { align: "center" });

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
                                 <Select value={selectedCustomer} onValueChange={async (val) => {
                                     setSelectedCustomer(val);
                                      setDiscount(0);
                                      setDiscountType("percent");
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

                                      // Auto-carry booking details (services, vehicle, discount)
                                      try {
                                        const { data: bookings, error } = await supabase
                                          .from('bookings')
                                          .select('*')
                                          .eq('customerId', val)
                                          .order('date', { ascending: false })
                                          .limit(1);

                                        if (!error && bookings && bookings.length > 0) {
                                          const latestBooking = bookings[0];
                                          
                                          // Auto-populate package and services
                                          if (latestBooking.title) {
                                            const finalVType = (latestBooking.vehicle || 'midsize').toLowerCase().includes('compact') ? 'compact' : 
                                                              (latestBooking.vehicle || 'midsize').toLowerCase().includes('luxury') ? 'luxury' :
                                                              ((latestBooking.vehicle || 'midsize').toLowerCase().includes('truck') || (latestBooking.vehicle || 'midsize').toLowerCase().includes('suv')) ? 'truck' : 'midsize';
                                            
                                            setSelectedVehicleType(finalVType as any);
                                            
                                            // Find matched package
                                            const { getCustomPackages } = await import('@/lib/servicesMeta');
                                            const pkg = servicePackages.find(p => p.name === latestBooking.title) || getCustomPackages().find(p => p.name === latestBooking.title);
                                            if (pkg) setSelectedPackage(pkg.id);
                                            
                                            let bPrice = pkg ? (pkg.pricing[finalVType] || (pkg as any).basePrice || 0) : 150;
                                            const bServices = [{ name: latestBooking.title, price: bPrice }];
                                            
                                            // Addons
                                            if (latestBooking.addons && Array.isArray(latestBooking.addons)) {
                                              const bAddonIds: string[] = [];
                                              latestBooking.addons.forEach((addonName: string) => {
                                                const addon = addOns.find(a => a.name === addonName);
                                                if (addon) bAddonIds.push(addon.id);
                                                const addonPrice = addon ? (addon.pricing?.[finalVType] || addon.basePrice) : 30;
                                                bServices.push({ name: addonName, price: addonPrice });
                                              });
                                              setSelectedAddons(bAddonIds);
                                            }
                                            setServices(bServices);
                                          }

                                          // Auto-fill discount
                                          if (latestBooking.discountAmount > 0) {
                                            const hasCoupon = latestBooking.discountCode && latestBooking.discountCode !== 'CUSTOM';
                                            if (hasCoupon) {
                                              setDiscountMethod('coupon');
                                              setDiscountCode(latestBooking.discountCode);
                                              const matched = coupons.find(c => c.code === latestBooking.discountCode.toUpperCase());
                                              if (matched) {
                                                setDiscountType(matched.percent ? 'percent' : 'amount');
                                                setDiscount(matched.percent || matched.amount || 0);
                                              } else {
                                                setDiscountType('amount');
                                                setDiscount(latestBooking.discountAmount);
                                              }
                                            } else {
                                              setDiscountMethod('manual');
                                              setDiscountType('amount');
                                              setDiscount(latestBooking.discountAmount);
                                              setDiscountCode('CUSTOM');
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
                                         } else if (v) {
                                            const guessed = normalizeVehicleType(`${v.year || ''} ${v.make || ''} ${v.model || ''}`);
                                            if (guessed) setSelectedVehicleType(guessed);
                                         }
                                     }}>
                                         <SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1">
                                             <SelectValue placeholder="Choose vehicle from garage..." />
                                         </SelectTrigger>
                                         <SelectContent>
                                             {customers.find(c => c.id === selectedCustomer)?.vehicles?.map(v => (
                                                 <SelectItem key={v.id} value={v.id!}>
                                                     {`${formatPart(v.year)} ${formatPart(v.make)} ${formatPart(v.model)} ${v.color ? `[Color: ${v.color}]` : ''}`.trim()} ({v.type})
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
                                      <div className="flex flex-col gap-2 mt-1">
                                          <div className="flex gap-2">
                                              <Select 
                                                  value={discountMethod} 
                                                  onValueChange={(val) => {
                                                      setDiscountMethod(val as 'coupon' | 'manual');
                                                      if (val === 'coupon') {
                                                          const first = coupons.find(c => c.active)?.code || '';
                                                          setDiscountCode(first);
                                                          const matched = coupons.find(c => c.code === first);
                                                          if (matched) {
                                                              setDiscountType(matched.percent ? 'percent' : 'amount');
                                                              setDiscount(matched.percent || matched.amount || 0);
                                                          } else {
                                                              setDiscountType('amount');
                                                              setDiscount(0);
                                                          }
                                                      } else {
                                                          setDiscountCode('CUSTOM');
                                                          setDiscountType('amount');
                                                          setDiscount(0);
                                                      }
                                                  }}
                                              >
                                                  <SelectTrigger className="w-[120px] bg-zinc-950 border-zinc-800 text-xs">
                                                      <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                      <SelectItem value="coupon">Coupon Code</SelectItem>
                                                      <SelectItem value="manual">Manual Amount</SelectItem>
                                                  </SelectContent>
                                              </Select>

                                              {discountMethod === 'coupon' ? (
                                                  <div className="flex-1 flex flex-col gap-2">
                                                      <Select
                                                          value={(discountCode && coupons.some(c => c.code === discountCode)) ? discountCode : (discountCode ? 'CUSTOM_CODE' : '')}
                                                          onValueChange={(val) => {
                                                              if (val === 'CUSTOM_CODE') {
                                                                  setDiscountCode('CUSTOM');
                                                                  setDiscount(0);
                                                                  setDiscountType('amount');
                                                              } else {
                                                                  setDiscountCode(val);
                                                                  const matched = coupons.find(c => c.code === val);
                                                                  if (matched) {
                                                                      setDiscountType(matched.percent ? 'percent' : 'amount');
                                                                      setDiscount(matched.percent || matched.amount || 0);
                                                                  }
                                                              }
                                                          }}
                                                      >
                                                          <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs">
                                                              <SelectValue placeholder="Select Coupon..." />
                                                          </SelectTrigger>
                                                          <SelectContent>
                                                              
                                                              {coupons.filter(c => c.active).map(c => (
                                                                  <SelectItem key={c.code} value={c.code}>
                                                                      {c.code} ({c.percent ? `${c.percent}% Off` : `${c.amount} Off`})
                                                                  </SelectItem>
                                                              ))}
                                                              <SelectItem value="CUSTOM_CODE">-- Enter Custom Code --</SelectItem>
                                                          </SelectContent>
                                                      </Select>

                                                      {((discountCode && !coupons.some(c => c.code === discountCode)) || discountCode === 'CUSTOM') && (
                                                          <Input
                                                              type="text"
                                                              placeholder="Enter Custom Code..."
                                                              className="h-9 bg-zinc-950 border-zinc-800 text-zinc-200 uppercase text-xs"
                                                              value={discountCode === 'CUSTOM' ? '' : discountCode}
                                                              onChange={(e) => {
                                                                  const codeVal = e.target.value.toUpperCase();
                                                                  setDiscountCode(codeVal);
                                                                  const matched = coupons.find(c => c.code === codeVal);
                                                                  if (matched) {
                                                                      setDiscountType(matched.percent ? 'percent' : 'amount');
                                                                      setDiscount(matched.percent || matched.amount || 0);
                                                                  } else {
                                                                      setDiscountType('amount');
                                                                      setDiscount(0);
                                                                  }
                                                              }}
                                                          />
                                                      )}
                                                  </div>
                                              ) : (
                                                  <div className="flex-1 flex gap-2">
                                                      <Select 
                                                          value={discountType} 
                                                          onValueChange={(val) => {
                                                              setDiscountType(val as 'percent' | 'amount');
                                                          }}
                                                      >
                                                          <SelectTrigger className="w-16 bg-zinc-950 border-zinc-800 text-xs">
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
                                                          className="bg-zinc-950 border-zinc-800 text-xs flex-1" 
                                                          placeholder="0"
                                                      />
                                                  </div>
                                              )}
                                          </div>
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
                                 <div className="flex items-center justify-between">
                                     <Label className="text-zinc-400">Notes & Conversation Details</Label>
                                     <Button 
                                         variant="ghost" 
                                         size="sm" 
                                         onClick={handleAIEnhance} 
                                         disabled={isRefiningNotes || !notes.trim()}
                                         className="h-6 px-2 text-xs bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 hover:text-amber-400 border border-amber-500/20"
                                     >
                                         {isRefiningNotes ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                                         {isRefiningNotes ? 'Enhancing...' : 'Enhance with AI'}
                                     </Button>
                                 </div>
                                 <textarea
                                      value={getPublicNotes(notes)}
                                      onClick={() => {
                                          setFullScreenPublicText(getPublicNotes(notes));
                                          setFullScreenInternalText(getInternalNotes(notes));
                                          setNotesSource("form");
                                          setIsNotesFullScreen(true);
                                      }}
                                      readOnly
                                      placeholder="Click to view full page & edit notes..."
                                      className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-md p-2 text-white text-sm mt-2 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer hover:border-zinc-700 transition-colors"
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

                            <div className="flex gap-2">
                                <Button onClick={createEstimate} disabled={isSubmitting} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-60">
                                    {isSubmitting ? (
                                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{editingEstimateId ? "Saving..." : "Creating..."}</>
                                    ) : (
                                        editingEstimateId ? "Save Changes" : "Create Estimate"
                                    )}
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="border-zinc-700 text-zinc-300"
                                    onClick={() => {
                                        const cust = customers.find(c => c.id === selectedCustomer);
                                        const vehicleObj = cust?.vehicles?.find(v => v.id === selectedVehicleId);
                                        const vehicleStr = vehicleObj 
                                            ? `${formatPart(vehicleObj.year)} ${formatPart(vehicleObj.make)} ${formatPart(vehicleObj.model)} ${vehicleObj.color ? `[Color: ${vehicleObj.color}]` : ''}`.replace(/\s+/g, ' ').trim()
                                            : cust 
                                                ? `${formatPart(cust.year)} ${formatPart(cust.vehicle)} ${formatPart(cust.model)}`.replace(/\s+/g, ' ').trim()
                                                : "Current Vehicle";

                                        const tempEst: Estimate = {
                                            estimateNumber: editingEstimateId ? estimates.find(e => e.id === editingEstimateId)?.estimateNumber : (currentEstimateNumber || generateInvoiceNumber()),
                                            customerId: selectedCustomer,
                                                                                        customerName: customers.find(c => c.id === selectedCustomer)?.name || "Valued Customer",
                                            vehicle: vehicleStr,
                                            services,
                                            total: calculateTotal(),
                                            date: new Date().toLocaleDateString(),
                                            estimateDate: estimateDate,
                                            status: selectedStatus,
                                            discount,
                                            discountType,
                                            notes: notes,
                                        };
                                        generatePDF(tempEst, 'print');
                                    }}
                                >
                                    <Eye className="h-4 w-4 mr-2" /> Preview
                                </Button>
                            </div>
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
                                                                                                <span className="text-zinc-500 text-sm">• {formatDisplayDate(est.estimateDate || est.date)}</span>
                                                {est.isSent && (
                                                    <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] h-4 px-1.5 py-0 uppercase font-black tracking-widest ml-1 rounded flex items-center">
                                                        SENT
                                                    </span>
                                                )}
                                                {(est as any).created_at && (
                                                    <span className="ml-2 text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700 font-mono">
                                                        STAMP: {new Date((est as any).created_at).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="font-medium text-zinc-300">{est.customerName}</div>
                                            <div className="text-xs text-zinc-500">{(est.vehicle || '').replace(/\bnull\b/ig, '').replace(/\s+/g, ' ').trim()}</div>
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
                                        <div className="flex flex-col items-center gap-1 min-w-[50px]" onClick={e => e.stopPropagation()}>
                                            <div className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">Sent?</div>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className={cn(
                                                    "h-8 w-8 rounded-full border transition-all",
                                                    est.isSent
                                                        ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                                                        : "bg-zinc-800 border-zinc-700 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700"
                                                )}
                                                onClick={(e) => toggleSentStatus(e, est)}
                                                title={est.isSent ? `Sent on ${est.sentDate ? new Date(est.sentDate).toLocaleDateString() : 'N/A'}` : "Mark as Sent"}
                                            >
                                                <Send className={cn("h-4 w-4", est.isSent && "fill-blue-400/20")} />
                                            </Button>
                                        </div>
                                        <div className="flex gap-2 items-center" onClick={e => e.stopPropagation()}>
                                            <Button size="icon" variant="ghost" className="h-9 w-9 text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={() => handleModify(est)} title="Edit Estimate">
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-9 w-9 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 border border-amber-500/20" onClick={() => generatePDF(est, 'print')} title="Preview PDF">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-9 w-9 text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={() => generatePDF(est, 'print')} title="Print PDF">
                                                <Printer className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-9 w-9 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 border border-blue-500/20" onClick={() => generatePDF(est, 'download')} title="Download PDF">
                                                <Save className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-9 w-9 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20" onClick={() => handleCopyLink(est.id!)} title="Copy Hosted Link">
                                                <LinkIcon className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-9 w-9 text-zinc-500 hover:text-red-400 hover:bg-red-400/10" onClick={() => setDeleteId(est.id!)} title="Delete Estimate">
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

            {/* Full Page Notes Editor Overlay */}
            {isNotesFullScreen && (
                <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col p-6 md:p-8 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col min-h-0">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                                    📝 Professional Estimate Notes Panel
                                </h3>
                                <p className="text-zinc-400 text-xs mt-1">
                                    Manage public customer-facing notes separately from call history log.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button 
                                    onClick={async () => {
                                        setIsRefiningNotes(true);
                                        try {
                                            const refined = await refineTextWithAI(fullScreenPublicText);
                                            setFullScreenPublicText(refined);
                                            toast({ title: "Notes Enhanced", description: "Your customer notes have been professionally polished." });
                                        } catch (error) {
                                            toast({ title: "Error", description: "Failed to enhance notes.", variant: "destructive" });
                                        } finally {
                                            setIsRefiningNotes(false);
                                        }
                                    }}
                                    disabled={isRefiningNotes || !fullScreenPublicText.trim()}
                                    className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 hover:text-amber-400 border border-amber-500/20 font-bold text-xs"
                                >
                                    {isRefiningNotes ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                                    Polish Customer Notes
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    className="text-zinc-400 hover:text-white text-xs h-9"
                                    onClick={() => setIsNotesFullScreen(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>

                        {/* Split Editor Workspace */}
                        <div className="flex-1 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0 overflow-y-auto lg:overflow-hidden">
                            
                            {/* Left Side: Customer-Facing Notes (Editable) */}
                            <div className="flex flex-col min-h-[300px] lg:min-h-0 h-full">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                                        ✍️ Customer-Facing Notes (Prints on PDF)
                                    </span>
                                </div>
                                <textarea 
                                    value={fullScreenPublicText}
                                    onChange={(e) => setFullScreenPublicText(e.target.value)}
                                    placeholder="Type instructions, terms, greetings, or details that the customer will see on their printed estimate..."
                                    autoFocus
                                    className="w-full flex-1 bg-zinc-950/90 border border-zinc-800 rounded-2xl p-4 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none font-sans leading-relaxed shadow-inner"
                                />
                            </div>

                            {/* Right Side: Call History & Scenario Log (Editable & Preserved) */}
                            <div className="flex flex-col min-h-[300px] lg:min-h-0 h-full border-t lg:border-t-0 lg:border-l border-zinc-800 lg:pl-6 pt-6 lg:pt-0">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                                        📋 Internal Call History & Scenario Log (Permanent)
                                    </span>
                                </div>
                                <textarea 
                                    value={fullScreenInternalText}
                                    onChange={(e) => setFullScreenInternalText(e.target.value)}
                                    placeholder="Internal notes, vehicle evaluation logs, and scenarios comparisons..."
                                    className="w-full flex-1 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 text-zinc-300 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-700 resize-none font-mono leading-relaxed"
                                />
                            </div>

                        </div>

                        {/* Footer */}
                        <div className="pt-4 border-t border-zinc-800 flex items-center justify-between shrink-0">
                            <div className="text-zinc-500 text-[11px]">
                                Your edits will keep your internal call history intact in the system.
                            </div>
                            <Button 
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-8 h-10 rounded-xl text-sm shadow-lg shadow-amber-600/10"
                                onClick={() => {
                                    const finalNotes = `${fullScreenPublicText}\n\n=== INTERNAL HISTORY LOG ===\n${fullScreenInternalText}`.trim();
                                    if (notesSource === "form") {
                                        setNotes(finalNotes);
                                        toast({ title: "Draft Notes Updated", description: "Updated inside the estimate creation form." });
                                    } else {
                                        handleSaveDetailNotes(finalNotes);
                                    }
                                    setIsNotesFullScreen(false);
                                }}
                            >
                                Save & Apply Notes
                            </Button>
                        </div>

                    </div>
                </div>
            )}

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
                                <div className="flex gap-3 items-center">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20 h-9 font-bold px-4"
                                        onClick={() => navigate(`/search-customer?customerId=${selectedEstimate.customerId}&search=${encodeURIComponent(selectedEstimate.customerName)}`)}
                                    >
                                        <Users className="h-4 w-4 mr-2" /> Customer Profile
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedEstimate(null)} className="h-9 w-9 p-0 rounded-full hover:bg-zinc-900 text-zinc-500">✕</Button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50 mb-6">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={async () => {
                                        const newIsSent = !editIsSent;
                                        setEditIsSent(newIsSent);
                                        // Auto-save the sent status when toggled from the detail modal
                                        if (selectedEstimate) {
                                            const updated = {
                                                ...selectedEstimate,
                                                isSent: newIsSent,
                                                sentDate: newIsSent ? new Date().toISOString() : undefined
                                            };
                                            try {
                                                await upsertSupabaseEstimate(updated as any);
                                                setSelectedEstimate(updated);
                                                
                                                if (newIsSent && updated.customerId) {
                                                    try {
                                                        await supabase.from('engagements').insert({
                                                            customer_id: updated.customerId,
                                                            customer_name: updated.customerName,
                                                            type: 'correspondence',
                                                            note: `Estimate Sent: #${updated.estimateNumber}\nTotal: $${(updated.total || 0).toFixed(2)}\nServices: ${updated.services?.map(s => s.name).join(', ') || 'N/A'}`
                                                        });
                                                    } catch (e) {}
                                                }
                                                
                                                toast({
                                                    title: newIsSent ? "Marked as Sent" : "Marked as Unsent",
                                                    description: "Sent status updated successfully."
                                                });
                                                loadData();
                                            } catch (err) {
                                                console.error("Failed to update sent status", err);
                                            }
                                        }
                                    }}
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
                                    I have sent this estimate to the customer
                                </Button>
                                {editIsSent && selectedEstimate.sentDate && (
                                    <span className="text-[10px] text-zinc-500 italic ml-auto">
                                        Marked sent on {new Date(selectedEstimate.sentDate).toLocaleDateString()}
                                    </span>
                                )}
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

                            {/* Pre-Check Data Block if customer accepted online */}
                            {selectedEstimate.notes?.includes("[ACCEPTED_BY_CUSTOMER]") && extractPreCheckData(selectedEstimate.notes) && (
                                <div className="py-4 border-b border-zinc-800">
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                                        <div className="flex items-center gap-2 text-emerald-400 font-bold mb-3 uppercase tracking-wider text-xs">
                                            <CheckCircle className="h-4 w-4" />
                                            Accepted Online by Customer - Pre-Check Data
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            {(() => {
                                                const preCheck = extractPreCheckData(selectedEstimate.notes!);
                                                if (!preCheck) return null;
                                                return (
                                                    <>
                                                        <div className="text-zinc-400">Pet Hair: <span className="text-zinc-200">{preCheck.petHair ? 'Yes' : 'No'}</span></div>
                                                        <div className="text-zinc-400">Stains: <span className="text-zinc-200">{preCheck.stains ? `Yes (${preCheck.stainDesc})` : 'No'}</span></div>
                                                        <div className="text-zinc-400">Odors: <span className="text-zinc-200">{preCheck.odors ? `Yes (${preCheck.odorDesc})` : 'No'}</span></div>
                                                        <div className="text-zinc-400">Exterior Paint: <span className="text-zinc-200">{preCheck.exteriorPaint || 'N/A'}</span></div>
                                                        <div className="text-zinc-400">Scratches: <span className="text-zinc-200">{preCheck.paintScratches ? `Yes (${preCheck.scratchDesc})` : 'No'}</span></div>
                                                        <div className="text-zinc-400">Interior Condition: <span className="text-zinc-200">{preCheck.interiorCondition || 'N/A'}</span></div>
                                                        <div className="text-zinc-400">Tires/Wheels: <span className="text-zinc-200">{preCheck.tireCondition || 'N/A'}</span></div>
                                                        <div className="text-zinc-400">Known Damage: <span className="text-zinc-200">{preCheck.knownDamage ? `Yes (${preCheck.damageDesc})` : 'No'}</span></div>
                                                        <div className="text-zinc-400 col-span-2">Last Detail: <span className="text-zinc-200">{preCheck.lastDetail || 'N/A'}</span></div>
                                                        {preCheck.specialRequests && (
                                                            <div className="text-zinc-400 col-span-2 mt-2">
                                                                Special Requests/Notes: <br/>
                                                                <span className="text-zinc-200 italic">{preCheck.specialRequests}</span>
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Notes & Conversation Details display in Detail modal */}
                            <div className="py-4 border-b border-zinc-800 space-y-3">
                                <div 
                                    className="p-3.5 bg-zinc-900/50 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition-colors"
                                    onClick={() => {
                                        setFullScreenPublicText(getPublicNotes(selectedEstimate.notes || ""));
                                        setFullScreenInternalText(getInternalNotes(selectedEstimate.notes || ""));
                                        setNotesSource("detail");
                                        setIsNotesFullScreen(true);
                                    }}
                                >
                                    <div className="text-[10px] font-black uppercase text-amber-400 tracking-widest mb-1.5 flex items-center justify-between">
                                        <span>✍️ Customer-Facing Notes (Prints on PDF)</span>
                                        <span className="text-[8px] text-amber-500 font-bold uppercase tracking-wider bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Edit Notes</span>
                                    </div>
                                    <div className="text-zinc-200 text-xs whitespace-pre-wrap leading-relaxed">
                                        {getPublicNotes(selectedEstimate.notes || "") || <span className="text-zinc-500 italic">No customer-facing notes added. Click here to add...</span>}
                                    </div>
                                </div>

                                {getInternalNotes(selectedEstimate.notes || "") && (
                                    <div 
                                        className="p-3.5 bg-zinc-950/40 border border-zinc-900 rounded-xl cursor-pointer hover:border-zinc-800 transition-colors"
                                        onClick={() => {
                                            setFullScreenPublicText(getPublicNotes(selectedEstimate.notes || ""));
                                            setFullScreenInternalText(getInternalNotes(selectedEstimate.notes || ""));
                                            setNotesSource("detail");
                                            setIsNotesFullScreen(true);
                                        }}
                                    >
                                        <div className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1.5">
                                            📋 Internal History & Scenario Log (System Backup)
                                        </div>
                                        <div className="text-zinc-400 text-[11px] font-mono whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                                            {getInternalNotes(selectedEstimate.notes || "")}
                                        </div>
                                    </div>
                                )}
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
                                <Button variant="outline" className="border-blue-700/50 hover:bg-blue-800/20 text-blue-400" onClick={() => handleCopyLink(selectedEstimate.id!)}>
                                    <LinkIcon className="h-4 w-4 mr-2" /> Copy Link
                                </Button>
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
