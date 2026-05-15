import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, FileDown, Star, Edit, Trash2 } from "lucide-react";
import { getSubContractors, upsertSubContractor, deleteSubContractor } from "@/lib/db";
import { savePDFToArchive } from "@/lib/pdfArchive";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface SubContractor {
    id: string;
    full_name: string;
    business_name: string;
    phone: string;
    email: string;
    website: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    services: string;
    notes: string;
    rating: number;
    availability: string;
    created_at?: string;
}

const MOCK_SEARCH_RESULTS = [
    {
        business_name: "John Car Care",
        full_name: "John Smith",
        phone: "(978) 555-1010",
        email: "john@methuenmobile.example.com",
        website: "https://methuenmobile.example.com",
        address: "15 Hampshire St",
        city: "Methuen",
        state: "MA",
        zip: "01844",
        rating: 4,
        services: "Mobile Detailing, Ceramic Coating",
    },
    {
        business_name: "Sparkle Detail",
        full_name: "Sarah Jones",
        phone: "(978) 555-2020",
        email: "info@sparkleauto.example.com",
        website: "https://sparkleauto.example.com",
        address: "250 Broadway",
        city: "Methuen",
        state: "MA",
        zip: "01844",
        rating: 5,
        services: "Interior Detail, Paint Correction",
    },
    {
        business_name: "North Shore Shine",
        full_name: "Mike Brown",
        phone: "(978) 555-3030",
        email: "mike@nss.example.com",
        website: "https://nss.example.com",
        address: "12 Pleasant St",
        city: "Lawrence",
        state: "MA",
        zip: "01841",
        rating: 3,
        services: "Basic Wash, Wax",
    },
    {
        business_name: "Premium Finish",
        full_name: "David Wilson",
        phone: "(978) 555-4040",
        email: "contact@premiumfinish.example.com",
        website: "https://premiumfinish.example.com",
        address: "99 Main St",
        city: "Haverhill",
        state: "MA",
        zip: "01830",
        rating: 5,
        services: "Full Detail, PPF",
    },
];

export default function ManageSubContractors() {
    const { toast } = useToast();
    const [view, setView] = useState<"list" | "form" | "search">("list");
    const [contractors, setContractors] = useState<SubContractor[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<SubContractor>({
        id: "",
        full_name: "",
        business_name: "",
        phone: "",
        email: "",
        website: "",
        address: "",
        city: "",
        state: "",
        zip: "",
        services: "",
        notes: "",
        rating: 5,
        availability: "Mon-Fri",
    });

    // Search View State
    const [localSearchTerm, setLocalSearchTerm] = useState("Methuen, MA 01844");
    const [searchResults, setSearchResults] = useState<typeof MOCK_SEARCH_RESULTS>([]);

    useEffect(() => {
        loadContractors();
    }, []);

    const loadContractors = async () => {
        const list = await getSubContractors<SubContractor>();
        setContractors(list);
    };

    const handleSave = async () => {
        if (!formData.full_name || !formData.business_name) {
            toast({ title: "Validation Error", description: "Name and Business Name are required.", variant: "destructive" });
            return;
        }
        try {
            await upsertSubContractor({ ...formData, id: editingId || undefined });
            toast({ title: "Success", description: "Sub-contractor saved." });
            await loadContractors();
            setView("list");
            resetForm();
        } catch (error) {
            toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this contractor?")) return;
        await deleteSubContractor(id);
        await loadContractors();
        toast({ title: "Deleted", description: "Contractor removed." });
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            id: "",
            full_name: "",
            business_name: "",
            phone: "",
            email: "",
            website: "",
            address: "",
            city: "",
            state: "",
            zip: "",
            services: "",
            notes: "",
            rating: 5,
            availability: "Mon-Fri",
        });
    };

    const handleEdit = (c: SubContractor) => {
        setFormData(c);
        setEditingId(c.id!);
        setView("form");
    };

    const handleExportPDF = () => {
        if (selectedIds.length === 0) {
            toast({ title: "Select Contractors", description: "Please select at least one contractor to export." });
            return;
        }
        const selected = contractors.filter((c) => selectedIds.includes(c.id!));
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Sub-Contractors List", 14, 20);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

        const tableData = selected.map((c) => [
            c.business_name,
            c.full_name,
            c.phone,
            c.email,
            `${c.city}, ${c.state}`,
            c.rating,
        ]);

        autoTable(doc, {
            startY: 35,
            head: [["Business", "Contact", "Phone", "Email", "Location", "Rating"]],
            body: tableData,
        });

        const pdfBlob = doc.output("blob");
        const reader = new FileReader();
        reader.readAsDataURL(pdfBlob);
        reader.onloadend = () => {
            const base64data = reader.result as string;
            const fileName = `sub-contractors-${Date.now()}.pdf`;
            savePDFToArchive("Sub-Contractors", "Admin Export", "export", base64data, { fileName });
            toast({ title: "Export Successful", description: `Saved to File Manager as ${fileName}` });
        };
    };

    const performMockSearch = () => {
        setTimeout(() => {
            setSearchResults(MOCK_SEARCH_RESULTS);
        }, 600);
    };

    const importSearchResult = (result: typeof MOCK_SEARCH_RESULTS[0]) => {
        setFormData({
            ...formData,
            ...result,
            availability: "Mon-Fri",
            notes: "Imported from local search",
        });
        setView("form");
    };

    const filteredContractors = contractors.filter((c) =>
        c.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.city.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div>
            <PageHeader title="Manage Sub-Contractors" />
            <div className="p-6 max-w-7xl mx-auto">
                {view === "list" && (
                    <Card className="p-6 bg-zinc-900 border-zinc-800">
                        <div className="space-y-4">
                            <div className="flex flex-col gap-4">
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-400" />
                                    <Input
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-8 bg-zinc-800 border-zinc-700"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button onClick={() => { setView("search"); setSearchResults([]); }} className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700">
                                        <Search className="mr-2 h-4 w-4" /> Find Local
                                    </Button>
                                    <Button onClick={handleExportPDF} className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700">
                                        <FileDown className="mr-2 h-4 w-4" /> Save PDF
                                    </Button>
                                    <Button onClick={() => { resetForm(); setView("form"); }} className="bg-blue-600 hover:bg-blue-700 text-white">
                                        <Plus className="mr-2 h-4 w-4" /> Add Contractor
                                    </Button>
                                </div>
                            </div>

                            <div className="rounded-md border border-zinc-800 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-zinc-800">
                                        <TableRow className="hover:bg-zinc-800 border-zinc-700">
                                            <TableHead className="w-[50px]">
                                                <Checkbox
                                                    checked={selectedIds.length === filteredContractors.length && filteredContractors.length > 0}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) setSelectedIds(filteredContractors.map((c) => c.id!));
                                                        else setSelectedIds([]);
                                                    }}
                                                />
                                            </TableHead>
                                            <TableHead>Business</TableHead>
                                            <TableHead>Contact</TableHead>
                                            <TableHead>Phone</TableHead>
                                            <TableHead>Location</TableHead>
                                            <TableHead>Rating</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredContractors.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-zinc-500">No contractors found.</TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredContractors.map((c) => (
                                                <TableRow key={c.id} className="hover:bg-zinc-800/50 border-zinc-700">
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={selectedIds.includes(c.id!)}
                                                            onCheckedChange={(checked) => {
                                                                if (checked) setSelectedIds([...selectedIds, c.id!]);
                                                                else setSelectedIds(selectedIds.filter((id) => id !== c.id));
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-medium">{c.business_name}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span>{c.full_name}</span>
                                                            <span className="text-xs text-zinc-500">{c.email}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{c.phone}</TableCell>
                                                    <TableCell>{c.city}, {c.state}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center text-yellow-500">
                                                            <span className="mr-1">{c.rating}</span> <Star className="h-3 w-3 fill-current" />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button size="sm" variant="ghost" onClick={() => handleEdit(c)}><Edit className="h-4 w-4" /></Button>
                                                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-400" onClick={() => handleDelete(c.id!)}><Trash2 className="h-4 w-4" /></Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </Card>
                )}

                {view === "form" && (
                    <Card className="p-6 bg-zinc-900 border-zinc-800">
                        <h2 className="text-2xl font-bold mb-6">{editingId ? "Edit Contractor" : "Add Contractor"}</h2>
                        <div className="space-y-6 max-w-3xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Full Name</Label>
                                    <Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="bg-zinc-800 border-zinc-700" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Business Name</Label>
                                    <Input value={formData.business_name} onChange={(e) => setFormData({ ...formData, business_name: e.target.value })} className="bg-zinc-800 border-zinc-700" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone</Label>
                                    <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="bg-zinc-800 border-zinc-700" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="bg-zinc-800 border-zinc-700" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Website (Optional)</Label>
                                    <Input value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} className="bg-zinc-800 border-zinc-700" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Address</Label>
                                    <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="bg-zinc-800 border-zinc-700" />
                                </div>
                                <div className="space-y-2">
                                    <Label>City</Label>
                                    <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="bg-zinc-800 border-zinc-700" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>State</Label>
                                        <Input value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className="bg-zinc-800 border-zinc-700" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Zip</Label>
                                        <Input value={formData.zip} onChange={(e) => setFormData({ ...formData, zip: e.target.value })} className="bg-zinc-800 border-zinc-700" />
                                    </div>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Services Offered</Label>
                                    <Textarea value={formData.services} onChange={(e) => setFormData({ ...formData, services: e.target.value })} className="bg-zinc-800 border-zinc-700" placeholder="e.g. Mobile Detailing, Ceramic Coating..." />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Notes</Label>
                                    <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="bg-zinc-800 border-zinc-700" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Rating (1-5)</Label>
                                    <Select value={String(formData.rating)} onValueChange={(v) => setFormData({ ...formData, rating: Number(v) })}>
                                        <SelectTrigger className="bg-zinc-800 border-zinc-700">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[1, 2, 3, 4, 5].map((r) => <SelectItem key={r} value={String(r)}>{r} Stars</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Availability</Label>
                                    <Select value={formData.availability} onValueChange={(v) => setFormData({ ...formData, availability: v })}>
                                        <SelectTrigger className="bg-zinc-800 border-zinc-700">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Mon-Fri">Mon-Fri</SelectItem>
                                            <SelectItem value="Mon-Sat">Mon-Sat</SelectItem>
                                            <SelectItem value="Mon-Sun">Mon-Sun</SelectItem>
                                            <SelectItem value="Weekends Only">Weekends Only</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-4 pt-4">
                                <Button variant="outline" onClick={() => setView("list")} className="border-zinc-700">Cancel</Button>
                                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">Save Contractor</Button>
                            </div>
                        </div>
                    </Card>
                )}

                {view === "search" && (
                    <Card className="p-6 bg-zinc-900 border-zinc-800">
                        <h2 className="text-2xl font-bold mb-6">Find Local Detailers</h2>
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <Input
                                    value={localSearchTerm}
                                    onChange={(e) => setLocalSearchTerm(e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 text-lg p-6"
                                    placeholder="Enter location..."
                                />
                                <Button onClick={performMockSearch} className="h-auto px-8 bg-blue-600 hover:bg-blue-700 text-lg">
                                    Search Area
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-zinc-400">Search Results — {localSearchTerm}</h3>
                                {searchResults.length === 0 ? (
                                    <div className="text-center py-12 text-zinc-600 border border-dashed border-zinc-800 rounded-lg">
                                        Click "Search Area" to find local detailers
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {searchResults.map((result, i) => (
                                            <div key={i} className="bg-zinc-800 border border-zinc-700 p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-lg text-white">{result.business_name}</h4>
                                                        <span className="text-zinc-500">— {result.full_name}</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
                                                        <span>{result.phone}</span>
                                                        <span>{result.email}</span>
                                                        <span>{result.address}, {result.city}</span>
                                                    </div>
                                                    <a href={result.website} target="_blank" rel="noreferrer" className="text-sm text-blue-400 hover:underline">
                                                        {result.website}
                                                    </a>
                                                </div>
                                                <div className="flex flex-col items-end gap-2 min-w-[120px]">
                                                    <div className="flex items-center text-yellow-500">
                                                        <span className="font-bold mr-1">{result.rating}</span> <Star className="h-4 w-4 fill-current" />
                                                    </div>
                                                    <Button onClick={() => importSearchResult(result)} className="w-full bg-green-600 hover:bg-green-700">
                                                        Import
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="pt-4">
                                <Button variant="ghost" onClick={() => setView("list")}>
                                    Back to List
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
