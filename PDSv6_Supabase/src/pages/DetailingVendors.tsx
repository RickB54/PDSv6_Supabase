import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, Plus, Search, FileDown, Edit, Trash2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getDetailingVendors, upsertDetailingVendor, deleteDetailingVendor } from "@/lib/db";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { savePDFToArchive } from "@/lib/pdfArchive";

const VENDOR_CATEGORIES = [
    "Chemicals",
    "Towels",
    "Tools",
    "Equipment",
    "Accessories",
    "Wholesale",
    "Online Retailer",
    "Other"
];

interface DetailingVendor {
    id: string;
    vendor_name: string;
    category: string;
    contact_name: string;
    phone: string;
    email: string;
    website: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    items_purchased: string[];
    notes: string;
    created_at?: string;
}

export default function DetailingVendors() {
    const { toast } = useToast();
    const [view, setView] = useState<"list" | "form">("list");
    const [vendors, setVendors] = useState<DetailingVendor[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<DetailingVendor>({
        id: "",
        vendor_name: "",
        category: "Chemicals",
        contact_name: "",
        phone: "",
        email: "",
        website: "",
        street: "",
        city: "",
        state: "",
        zip: "",
        country: "",
        items_purchased: [],
        notes: ""
    });

    const [itemsInput, setItemsInput] = useState("");

    useEffect(() => {
        loadVendors();
    }, []);

    const loadVendors = async () => {
        const list = await getDetailingVendors<DetailingVendor>();
        setVendors(list);
    };

    const handleSave = async () => {
        if (!formData.vendor_name) {
            toast({ title: "Validation Error", description: "Vendor name is required.", variant: "destructive" });
            return;
        }
        try {
            const items = itemsInput.split(",").map(i => i.trim()).filter(i => i);
            await upsertDetailingVendor({ ...formData, items_purchased: items, id: editingId || undefined });
            toast({ title: "Success", description: "Vendor saved." });
            await loadVendors();
            setView("list");
            resetForm();
        } catch (error) {
            toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this vendor?")) return;
        await deleteDetailingVendor(id);
        await loadVendors();
        toast({ title: "Deleted", description: "Vendor removed." });
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            id: "",
            vendor_name: "",
            category: "Chemicals",
            contact_name: "",
            phone: "",
            email: "",
            website: "",
            street: "",
            city: "",
            state: "",
            zip: "",
            country: "",
            items_purchased: [],
            notes: ""
        });
        setItemsInput("");
    };

    const handleEdit = (vendor: DetailingVendor) => {
        setFormData(vendor);
        setItemsInput(vendor.items_purchased.join(", "));
        setEditingId(vendor.id);
        setView("form");
    };

    const handleExportPDF = () => {
        if (selectedIds.length === 0) {
            toast({ title: "Select Vendors", description: "Please select at least one vendor to export." });
            return;
        }
        const selected = vendors.filter((v) => selectedIds.includes(v.id));
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Detailing Vendors List", 14, 20);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

        const tableData = selected.map((v) => [
            v.vendor_name,
            v.category,
            v.contact_name,
            v.phone,
            v.email,
            `${v.city}, ${v.state}`
        ]);

        autoTable(doc, {
            startY: 35,
            head: [["Vendor", "Category", "Contact", "Phone", "Email", "Location"]],
            body: tableData,
        });

        const pdfBlob = doc.output("blob");
        const reader = new FileReader();
        reader.readAsDataURL(pdfBlob);
        reader.onloadend = () => {
            const base64data = reader.result as string;
            const fileName = `detailing-vendors-${Date.now()}.pdf`;
            savePDFToArchive("Detailing Vendors", "Admin Export", "export", base64data, { fileName });
            toast({ title: "Export Successful", description: `Saved to File Manager as ${fileName}` });
        };
    };

    const filteredVendors = vendors.filter(v => {
        const matchesSearch = v.vendor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === "all" || v.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    return (
        <div>
            <PageHeader title="Detailing Vendors" />
            <div className="p-4 max-w-7xl mx-auto">

                {view === "list" && (
                    <Card className="p-6 bg-zinc-900 border-zinc-800">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <Package className="w-6 h-6 text-cyan-500" />
                                <h2 className="text-2xl font-bold text-white">Vendors Directory</h2>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleExportPDF} className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700">
                                    <FileDown className="mr-2 h-4 w-4" /> Save PDF
                                </Button>
                                <Button onClick={() => { resetForm(); setView("form"); }} className="bg-blue-600 hover:bg-blue-700 text-white">
                                    <Plus className="mr-2 h-4 w-4" /> Add Vendor
                                </Button>
                            </div>
                        </div>

                        <div className="flex gap-4 mb-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 w-4 h-4" />
                                <Input
                                    placeholder="Search vendors..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                                />
                            </div>
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-[200px] bg-zinc-800 border-zinc-700 text-white">
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-800 border-zinc-700">
                                    <SelectItem value="all" className="text-white">All Categories</SelectItem>
                                    {VENDOR_CATEGORIES.map(cat => (
                                        <SelectItem key={cat} value={cat} className="text-white">{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="rounded-md border border-zinc-800 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-zinc-800">
                                    <TableRow className="hover:bg-zinc-800 border-zinc-700">
                                        <TableHead className="w-[50px]">
                                            <Checkbox
                                                checked={selectedIds.length === filteredVendors.length && filteredVendors.length > 0}
                                                onCheckedChange={(checked) => {
                                                    if (checked) setSelectedIds(filteredVendors.map((v) => v.id));
                                                    else setSelectedIds([]);
                                                }}
                                                className="border-zinc-700"
                                            />
                                        </TableHead>
                                        <TableHead className="text-zinc-300">Vendor Name</TableHead>
                                        <TableHead className="text-zinc-300">Category</TableHead>
                                        <TableHead className="text-zinc-300">Contact</TableHead>
                                        <TableHead className="text-zinc-300">Phone</TableHead>
                                        <TableHead className="text-zinc-300">Email</TableHead>
                                        <TableHead className="text-zinc-300">Location</TableHead>
                                        <TableHead className="text-zinc-300 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredVendors.map((vendor) => (
                                        <TableRow key={vendor.id} className="border-zinc-800 hover:bg-zinc-800/50">
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.includes(vendor.id)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) setSelectedIds([...selectedIds, vendor.id]);
                                                        else setSelectedIds(selectedIds.filter((id) => id !== vendor.id));
                                                    }}
                                                    className="border-zinc-700"
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium text-white">{vendor.vendor_name}</TableCell>
                                            <TableCell className="text-zinc-400">
                                                <span className="px-2 py-1 bg-cyan-900/30 text-cyan-400 rounded text-xs">
                                                    {vendor.category}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-zinc-400">{vendor.contact_name || "-"}</TableCell>
                                            <TableCell className="text-zinc-400">{vendor.phone || "-"}</TableCell>
                                            <TableCell className="text-zinc-400">{vendor.email || "-"}</TableCell>
                                            <TableCell className="text-zinc-400">{vendor.city}, {vendor.state}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleEdit(vendor)}
                                                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                                                    >
                                                        <Edit className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleDelete(vendor.id)}
                                                        className="border-red-700 text-red-500 hover:bg-red-900/20"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredVendors.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center text-zinc-500 py-8">
                                                No vendors found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                )}

                {view === "form" && (
                    <Card className="p-6 bg-zinc-900 border-zinc-800">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <Package className="w-6 h-6 text-cyan-500" />
                                <h2 className="text-2xl font-bold text-white">
                                    {editingId ? "Edit Vendor" : "Add New Vendor"}
                                </h2>
                            </div>
                            <Button onClick={() => { setView("list"); resetForm(); }} variant="outline" className="border-zinc-700 text-zinc-300">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                            </Button>
                        </div>

                        <div className="space-y-6">
                            {/* Vendor Information */}
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-4">Vendor Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-zinc-400">Vendor Name *</Label>
                                        <Input
                                            value={formData.vendor_name}
                                            onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                                            className="bg-zinc-800 border-zinc-700 text-white"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400">Category</Label>
                                        <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-800 border-zinc-700">
                                                {VENDOR_CATEGORIES.map(cat => (
                                                    <SelectItem key={cat} value={cat} className="text-white">{cat}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Information */}
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-zinc-400">Contact Person</Label>
                                        <Input
                                            value={formData.contact_name}
                                            onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                                            className="bg-zinc-800 border-zinc-700 text-white"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400">Phone</Label>
                                        <Input
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="bg-zinc-800 border-zinc-700 text-white"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400">Email</Label>
                                        <Input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="bg-zinc-800 border-zinc-700 text-white"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400">Website</Label>
                                        <Input
                                            value={formData.website}
                                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                            className="bg-zinc-800 border-zinc-700 text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Address Information */}
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-4">Address</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <Label className="text-zinc-400">Street</Label>
                                        <Input
                                            value={formData.street}
                                            onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                                            className="bg-zinc-800 border-zinc-700 text-white"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400">City</Label>
                                        <Input
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            className="bg-zinc-800 border-zinc-700 text-white"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400">State</Label>
                                        <Input
                                            value={formData.state}
                                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                            className="bg-zinc-800 border-zinc-700 text-white"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400">Zip</Label>
                                        <Input
                                            value={formData.zip}
                                            onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                                            className="bg-zinc-800 border-zinc-700 text-white"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400">Country</Label>
                                        <Input
                                            value={formData.country}
                                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                            className="bg-zinc-800 border-zinc-700 text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Purchase Information */}
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-4">Purchase Information</h3>
                                <div>
                                    <Label className="text-zinc-400">Items Typically Purchased (comma-separated)</Label>
                                    <Input
                                        value={itemsInput}
                                        onChange={(e) => setItemsInput(e.target.value)}
                                        placeholder="e.g. Soap, Wax, Polish"
                                        className="bg-zinc-800 border-zinc-700 text-white"
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-4">Notes</h3>
                                <Textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Additional notes about this vendor..."
                                    className="bg-zinc-800 border-zinc-700 text-white min-h-[100px]"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4">
                                <Button onClick={() => { setView("list"); resetForm(); }} variant="outline" className="border-zinc-700 text-zinc-300">
                                    Cancel
                                </Button>
                                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
                                    {editingId ? "Update Vendor" : "Save Vendor"}
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}

            </div>
        </div>
    );
}
