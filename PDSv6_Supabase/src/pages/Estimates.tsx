import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Printer, Save, Trash2, Plus, Pencil, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { getEstimates, upsertEstimate, getCustomers, deleteEstimate } from "@/lib/db";
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

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [est, custs] = await Promise.all([getEstimates(), getCustomers()]);
        setEstimates(est as Estimate[]);
        setCustomers(custs as Customer[]);
    };

    const calculateTotal = () => services.reduce((sum, s) => sum + s.price, 0);

    const createEstimate = async () => {
        if (!selectedCustomer || services.length === 0) {
            toast({ title: "Error", description: "Please select customer and add services", variant: "destructive" });
            return;
        }

        const customer = customers.find(c => c.id === selectedCustomer);
        if (!customer) return;

        const estimateData: Estimate = {
            id: editingEstimateId || undefined,
            estimateNumber: editingEstimateId ? estimates.find(e => e.id === editingEstimateId)?.estimateNumber : undefined,
            customerId: selectedCustomer,
            customerName: customer.name,
            vehicle: `${customer.year || ''} ${customer.vehicle || ''} ${customer.model || ''}`.trim(),
            services,
            total: calculateTotal(),
            date: new Date().toLocaleDateString(),
            createdAt: editingEstimateId ? (estimates.find(e => e.id === editingEstimateId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
            status: selectedStatus,
            packageId: selectedPackage,
            vehicleType: selectedVehicleType,
            addonIds: selectedAddons
        };

        await upsertEstimate(estimateData);
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
        await upsertEstimate(updated);
        toast({ title: "Status Updated", description: `Estimate marked as ${newStatus}` });
        loadData();
    };

    const handleDeleteEstimate = async (id: string) => {
        await deleteEstimate(id);
        toast({ title: "Deleted", description: "Estimate removed" });
        setDeleteId(null);
        loadData();
    };

    const generatePDF = (estimate: Estimate, action: 'print' | 'download' | 'archive') => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.text("ESTIMATE", 105, 20, { align: "center" });
        doc.setFontSize(12);
        doc.text("Prime Detail Solutions", 105, 28, { align: "center" });

        // Estimate Info
        doc.setFontSize(10);
        doc.text(`Estimate #${estimate.estimateNumber || 'N/A'}`, 20, 45);
        doc.text(`Date: ${estimate.date}`, 20, 52);
        doc.text(`Status: ${(estimate.status || 'open').toUpperCase()}`, 20, 59);

        // Customer Info
        doc.text(`Customer: ${estimate.customerName}`, 20, 70);
        doc.text(`Vehicle: ${estimate.vehicle}`, 20, 77);

        // Services
        let y = 90;
        doc.setFontSize(12);
        doc.text("Services:", 20, y);
        y += 8;

        doc.setFontSize(10);
        estimate.services.forEach(service => {
            doc.text(`${service.name}`, 25, y);
            doc.text(`$${service.price.toFixed(2)}`, 180, y, { align: "right" });
            y += 7;
        });

        // Total
        y += 5;
        doc.setFontSize(12);
        doc.text("Total:", 140, y);
        doc.text(`$${estimate.total.toFixed(2)}`, 180, y, { align: "right" });

        // Footer
        doc.setFontSize(8);
        doc.text("This estimate is valid for 30 days from the date above.", 105, 280, { align: "center" });

        if (action === 'download') {
            doc.save(`Estimate_${estimate.estimateNumber || 'New'}.pdf`);
        } else if (action === 'print') {
            window.open(doc.output('bloburl'), '_blank');
        } else if (action === 'archive') {
            const pdfDataUrl = doc.output('datauristring');
            const safeName = estimate.customerName.replace(/[^a-zA-Z0-9]/g, '_');
            const fileName = `Estimate_${safeName}_${estimate.estimateNumber || Date.now()}.pdf`;

            savePDFToArchive(
                'Estimate',
                estimate.customerName,
                estimate.id || `est-${Date.now()}`,
                pdfDataUrl,
                { fileName }
            );
            toast({ title: 'Saved', description: 'Estimate PDF saved to File Manager.' });
        }
    };

    const filterItems = () => {
        let filtered = estimates;

        if (filterCustomerId) {
            filtered = filtered.filter(e => e.customerId === filterCustomerId);
        }

        // Date filtering
        if (dateFilter !== "all" || dateRange.from || dateRange.to) {
            filtered = filtered.filter(e => {
                const estDate = new Date(e.createdAt);
                const now = new Date();

                let passQuick = true;
                if (dateFilter === "daily") passQuick = estDate.toDateString() === now.toDateString();
                else if (dateFilter === "weekly") passQuick = estDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                else if (dateFilter === "monthly") passQuick = estDate.getMonth() === now.getMonth() && estDate.getFullYear() === now.getFullYear();

                let passRange = true;
                if (dateRange.from) passRange = estDate >= new Date(dateRange.from.setHours(0, 0, 0, 0));
                if (passRange && dateRange.to) passRange = estDate <= new Date(dateRange.to.setHours(23, 59, 59, 999));

                return passQuick && passRange;
            });
        }

        return filtered;
    };

    return (
        <div className="min-h-screen bg-background">
            <PageHeader title="Estimates" />
            <main className="container mx-auto px-4 py-6 max-w-6xl">
                <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center flex-wrap gap-3">
                        <h1 className="text-3xl font-bold text-foreground">Estimates</h1>
                        <div className="flex gap-3 items-center flex-wrap w-full md:w-auto">
                            <Link to="/invoicing">
                                <Button variant="outline" size="sm">
                                    <FileText className="h-4 w-4 mr-2" />Invoices
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
                            <DateRangeFilter value={dateRange} onChange={setDateRange} storageKey="estimates-range" />
                            <Button onClick={() => setShowCreateForm(!showCreateForm)} className="bg-gradient-hero">
                                <Plus className="h-4 w-4 mr-2" />
                                Create Estimate
                            </Button>
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

                    {showCreateForm && (
                        <Card className="p-6 bg-gradient-card border-border">
                            <h2 className="text-xl font-bold text-foreground mb-4">{editingEstimateId ? "Edit Estimate" : "New Estimate"}</h2>
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

                                <div className="border-t border-border pt-4">
                                    <Label>Select Service Package</Label>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <Select value={selectedPackage} onValueChange={(val) => {
                                            setSelectedPackage(val);
                                            const pkg = servicePackages.find(p => p.id === val);
                                            if (pkg) {
                                                const price = pkg.pricing[selectedVehicleType] || 0;
                                                setServices([{ name: pkg.name, price }]);
                                                setSelectedAddons([]);
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

                                <div className="border-t border-border pt-4">
                                    <Label>Add-ons (Optional)</Label>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        {addOns.map(addon => {
                                            const isSelected = selectedAddons.includes(addon.id);
                                            const addonPrice = addon.pricing[selectedVehicleType] || 0;
                                            return (
                                                <Button
                                                    key={addon.id}
                                                    type="button"
                                                    variant={isSelected ? "default" : "outline"}
                                                    size="sm"
                                                    className="justify-between h-auto py-2"
                                                    onClick={() => {
                                                        const newAddons = isSelected
                                                            ? selectedAddons.filter(id => id !== addon.id)
                                                            : [...selectedAddons, addon.id];
                                                        setSelectedAddons(newAddons);

                                                        const baseService = services[0];
                                                        const addonServices = newAddons.map(addonId => {
                                                            const a = addOns.find(ao => ao.id === addonId);
                                                            return {
                                                                name: a?.name || '',
                                                                price: a?.pricing[selectedVehicleType] || 0
                                                            };
                                                        });
                                                        setServices(baseService ? [baseService, ...addonServices] : addonServices);
                                                    }}
                                                >
                                                    <span>{addon.name}</span>
                                                    <span className="ml-2 text-xs opacity-70">${addonPrice}</span>
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="border-t border-border pt-4">
                                    <Label>Estimate Status</Label>
                                    <Select value={selectedStatus} onValueChange={(val: any) => setSelectedStatus(val)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="open">Open</SelectItem>
                                            <SelectItem value="accepted">Accepted (Closed)</SelectItem>
                                            <SelectItem value="declined">Declined (Closed)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {services.length > 0 && (
                                    <div className="space-y-2">
                                        {services.map((s, i) => (
                                            <div key={i} className="flex justify-between items-center p-2 bg-background/50 rounded">
                                                <span>{s.name}</span>
                                                <span className="font-semibold">${s.price.toFixed(2)}</span>
                                            </div>
                                        ))}
                                        <div className="text-right text-xl font-bold text-primary pt-2 border-t">
                                            Total: ${calculateTotal().toFixed(2)}
                                        </div>
                                    </div>
                                )}

                                <Button onClick={createEstimate} className="w-full bg-gradient-hero">
                                    {editingEstimateId ? "Save Changes" : "Create Estimate"}
                                </Button>
                                {editingEstimateId && (
                                    <Button variant="outline" className="w-full mt-2" onClick={() => {
                                        setEditingEstimateId(null);
                                        setShowCreateForm(false);
                                        setSelectedCustomer("");
                                        setServices([]);
                                    }}>
                                        Cancel Edit
                                    </Button>
                                )}
                            </div>
                        </Card>
                    )}

                    <div className="grid gap-4">
                        {filterItems().map((est) => (
                            <Card
                                key={est.id}
                                className="p-4 bg-gradient-card border-border cursor-pointer hover:border-primary/50 transition-colors"
                                onClick={() => setSelectedEstimate(est)}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-foreground">Estimate #{est.estimateNumber || 'N/A'}</h3>
                                        <p className="text-sm text-muted-foreground">{est.customerName}</p>
                                        <p className="text-sm text-muted-foreground">{est.vehicle}</p>
                                        <p className="text-sm text-muted-foreground">Date: {est.date}</p>
                                        <p className="text-lg font-bold text-primary mt-2">Total: ${est.total.toFixed(2)}</p>
                                        <p className={`text-sm font-medium mt-1 ${(est.status || "open") === "accepted" ? "text-success" :
                                            (est.status || "open") === "declined" ? "text-destructive" :
                                                "text-yellow-500"
                                            }`}>
                                            {(est.status || "open").toUpperCase()}
                                        </p>
                                    </div>
                                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                        <Button size="icon" variant="outline" onClick={() => handleModify(est)} title="Edit Estimate">
                                            <Pencil className="h-4 w-4" />
                                        </Button>

                                        {(est.status || 'open') !== 'accepted' && (
                                            <Button size="icon" variant="outline" onClick={() => handleStatusChange(est, 'accepted')} title="Mark Accepted/Closed" className="text-green-600 hover:text-green-700">
                                                <CheckCircle className="h-4 w-4" />
                                            </Button>
                                        )}

                                        {(est.status || 'open') !== 'declined' && (
                                            <Button size="icon" variant="outline" onClick={() => handleStatusChange(est, 'declined')} title="Mark Declined/Closed" className="text-red-600 hover:text-red-700">
                                                <XCircle className="h-4 w-4" />
                                            </Button>
                                        )}

                                        {(est.status === 'accepted' || est.status === 'declined') && (
                                            <Button size="icon" variant="outline" onClick={() => handleStatusChange(est, 'open')} title="Re-open Estimate" className="text-yellow-600 hover:text-yellow-700">
                                                <RotateCcw className="h-4 w-4" />
                                            </Button>
                                        )}

                                        <Button size="icon" variant="outline" onClick={() => generatePDF(est, 'print')} title="Print">
                                            <Printer className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="outline" onClick={() => generatePDF(est, 'archive')} title="Save to File Manager">
                                            <Save className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => setDeleteId(est.id!)}>
                                            <Trash2 className="h-4 w-4" />
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
                        <AlertDialogTitle>Delete Estimate?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="button-group-responsive">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteId && handleDeleteEstimate(deleteId)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {selectedEstimate && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedEstimate(null)}>
                    <Card className="max-w-2xl w-full max-h-[90vh] overflow-auto bg-background" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-foreground">Estimate #{selectedEstimate.estimateNumber}</h2>
                                    <p className="text-muted-foreground">Prime Detail Solutions</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedEstimate(null)}>✕</Button>
                            </div>

                            <div className="border-t border-border pt-4 space-y-3">
                                <div>
                                    <Label className="text-sm font-semibold">Customer</Label>
                                    <p className="text-foreground">{selectedEstimate.customerName}</p>
                                </div>
                                <div>
                                    <Label className="text-sm font-semibold">Vehicle</Label>
                                    <p className="text-foreground">{selectedEstimate.vehicle}</p>
                                </div>
                                <div>
                                    <Label className="text-sm font-semibold">Date</Label>
                                    <p className="text-foreground">{selectedEstimate.date}</p>
                                </div>
                            </div>

                            <div className="border-t border-border pt-4">
                                <Label className="text-sm font-semibold mb-2 block">Services</Label>
                                <div className="space-y-2">
                                    {(selectedEstimate.services || []).map((s, i) => (
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
                                    <span className="text-primary">${selectedEstimate.total.toFixed(2)}</span>
                                </div>
                                <div className="mt-2">
                                    <p className={`text-sm font-medium ${(selectedEstimate.status || "open") === "accepted" ? "text-success" :
                                        (selectedEstimate.status || "open") === "declined" ? "text-destructive" :
                                            "text-yellow-500"
                                        }`}>
                                        Status: {(selectedEstimate.status || "open").toUpperCase()}
                                    </p>
                                </div>
                            </div>

                            <div className="border-t border-border pt-4 flex gap-2 justify-end">
                                <Button variant="outline" onClick={() => generatePDF(selectedEstimate, 'print')}>
                                    <Printer className="h-4 w-4 mr-2" />Print
                                </Button>
                                <Button variant="outline" onClick={() => generatePDF(selectedEstimate, 'archive')}>
                                    <Save className="h-4 w-4 mr-2" />Save PDF
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
