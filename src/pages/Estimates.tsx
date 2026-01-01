import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Printer, Save, Trash2, Plus, Pencil, CheckCircle, XCircle, RotateCcw, Search, Calendar } from "lucide-react";
import { getSupabaseEstimates, upsertSupabaseEstimate } from "@/lib/supa-data";
import supabase from "@/lib/supabase";
import { getUnifiedCustomers } from "@/lib/customers";
import { Customer } from "@/components/customers/CustomerModal";
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

interface Estimate {
    id?: string;
    estimateNumber?: number;
    customerId: string;
    customerName: string;
    vehicle: string;
    services: { name: string; price: number }[];
    total: number;
    date: string;
    createdAt: string;
    status?: "open" | "accepted" | "declined";
    packageId?: string;
    vehicleType?: "compact" | "midsize" | "truck" | "luxury";
    addonIds?: string[];
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
    const [selectedVehicleType, setSelectedVehicleType] = useState<"compact" | "midsize" | "truck" | "luxury">("midsize");
    const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
    const [editingEstimateId, setEditingEstimateId] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<"open" | "accepted" | "declined">("open");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [est, custs] = await Promise.all([getSupabaseEstimates(), getUnifiedCustomers()]);
        setEstimates(est as any as Estimate[]);
        setCustomers(custs as any as Customer[]);
    };

    const calculateTotal = () => services.reduce((sum, s) => sum + s.price, 0);

    const createEstimate = async () => {
        if (!selectedCustomer || services.length === 0) {
            toast({ title: "Error", description: "Please select customer and add services", variant: "destructive" });
            return;
        }

        const customer = customers.find(c => c.id === selectedCustomer);
        if (!customer) return;

        const estimateData: any = {
            id: editingEstimateId || undefined,
            customerId: selectedCustomer,
            customerName: customer.name,
            services,
            total: calculateTotal(),
            date: new Date().toLocaleDateString(),
            status: selectedStatus,
            packageId: selectedPackage,
            vehicleId: (customer as any).vehicleType ? undefined : undefined,
            notes: "",
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
        loadData();
    };

    const handleModify = (est: Estimate) => {
        setEditingEstimateId(est.id || null);
        setSelectedCustomer(est.customerId);
        setServices(est.services);
        setSelectedPackage(est.packageId || "");
        setSelectedVehicleType(est.vehicleType || "midsize");
        setSelectedAddons(est.addonIds || []);
        setSelectedStatus(est.status || "open");
        setShowCreateForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleStatusChange = async (est: Estimate, newStatus: "open" | "accepted" | "declined") => {
        const updated = { ...est, status: newStatus };
        await upsertSupabaseEstimate(updated as any);
        toast({ title: "Status Updated", description: `Estimate marked as ${newStatus}` });
        loadData();
        if (selectedEstimate?.id === est.id) setSelectedEstimate(updated as any);
    };

    const handleDeleteEstimate = async (id: string) => {
        await supabase.from('estimates').delete().eq('id', id);
        toast({ title: "Deleted", description: "Estimate removed" });
        setDeleteId(null);
        loadData();
    };

    const generatePDF = (estimate: Estimate, action: 'print' | 'download' | 'archive') => {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.setTextColor(245, 158, 11); // Amber
        doc.text("ESTIMATE", 105, 20, { align: "center" });
        doc.setTextColor(0);
        doc.setFontSize(12);
        doc.text("Prime Auto Detail", 105, 28, { align: "center" });

        doc.setFontSize(10);
        doc.text(`Estimate #${estimate.estimateNumber || 'N/A'}`, 20, 45);
        doc.text(`Date: ${estimate.date}`, 20, 52);

        let y = 80;
        doc.text("Services:", 20, y);
        y += 8;
        estimate.services.forEach(service => {
            doc.text(`${service.name}`, 25, y);
            doc.text(`$${service.price.toFixed(2)}`, 180, y, { align: "right" });
            y += 7;
        });

        y += 5;
        doc.setFontSize(14);
        doc.text("Total:", 140, y);
        doc.text(`$${estimate.total.toFixed(2)}`, 180, y, { align: "right" });

        // ... actions logic
        if (action === 'download') doc.save(`Estimate_${estimate.estimateNumber}.pdf`);
        else if (action === 'print') window.open(doc.output('bloburl'), '_blank');
        else { /* archive logic */ }
    };

    const filterItems = () => {
        const now = new Date();
        return estimates.filter(e => {
            if (filterCustomerId && e.customerId !== filterCustomerId) return false;

            const estDate = new Date(e.createdAt);
            let passQuick = true;
            if (dateFilter === "daily") passQuick = estDate.toDateString() === now.toDateString();
            else if (dateFilter === "weekly") passQuick = estDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            else if (dateFilter === "monthly") passQuick = estDate.getMonth() === now.getMonth() && estDate.getFullYear() === now.getFullYear();

            let passRange = true;
            if (dateRange.from) passRange = estDate >= new Date(dateRange.from.setHours(0, 0, 0, 0));
            if (passRange && dateRange.to) passRange = estDate <= new Date(dateRange.to.setHours(23, 59, 59, 999));

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
                                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                                    <SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1"><SelectValue placeholder="Select Customer" /></SelectTrigger>
                                    <SelectContent>
                                        {customers.map(c => <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

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

                            {/* Services List */}
                            <div className="bg-zinc-950 p-4 rounded border border-zinc-800">
                                {services.map((s, i) => (
                                    <div key={i} className="flex justify-between items-center text-zinc-300 mb-2">
                                        <span>{s.name}</span>
                                        <span className="font-mono">${s.price}</span>
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
                                            </div>
                                            <div className="font-medium text-zinc-300">{est.customerName}</div>
                                            <div className="text-xs text-zinc-500">{est.vehicle}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 justify-between md:justify-end w-full md:w-auto">
                                        <div className="text-right">
                                            <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Total</div>
                                            <div className="text-xl font-bold text-white">${est.total.toFixed(2)}</div>
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
                                        <span className="font-mono text-zinc-200">${s.price.toFixed(2)}</span>
                                    </div>
                                ))}
                                <div className="border-t border-zinc-800 mt-4 pt-4 flex justify-between items-center">
                                    <span className="text-lg font-bold text-white">Total</span>
                                    <span className="text-2xl font-bold text-amber-500">${selectedEstimate.total.toFixed(2)}</span>
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
