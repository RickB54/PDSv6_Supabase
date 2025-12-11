import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Edit2, Save, FileText, Download } from "lucide-react";
import localforage from "localforage";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { savePDFToArchive } from "@/lib/pdfArchive";

// --- Types ---
interface PackageItem {
    id: string;
    name: string;
    description: string;
    includes: string[];
    isCustom?: boolean;
}

// --- Initial Data ---

const INITIAL_ACTUAL_PACKAGES: PackageItem[] = [
    {
        id: "actual-1",
        name: "Basic Exterior Wash",
        description: "Essential exterior cleaning",
        includes: [
            "Pre-rinse & foam",
            "Two-bucket wash",
            "Hand dry",
            "Final inspection"
        ]
    },
    {
        id: "actual-2",
        name: "Express Wash & Wax",
        description: "Quick wash with protective wax",
        includes: [
            "Quick wash",
            "Spray wax",
            "Tire shine",
            "Final inspection"
        ]
    },
    {
        id: "actual-3",
        name: "Full Exterior Detail",
        description: "Complete exterior restoration",
        includes: [
            "Pre-rinse vehicle",
            "Apply foam cannon",
            "Two-bucket wash",
            "Clay bar treatment",
            "Iron remover application",
            "Dry vehicle",
            "Apply sealant/wax",
            "Tire dressing",
            "Clean windows",
            "Final inspection"
        ]
    },
    {
        id: "actual-4",
        name: "Interior Cleaning",
        description: "Deep interior detailing",
        includes: [
            "Vacuum all surfaces",
            "Clean dashboard",
            "Clean door panels",
            "Clean seats",
            "Clean carpets/mats",
            "Apply UV protectant",
            "Clean windows",
            "Final inspection"
        ]
    },
    {
        id: "actual-5",
        name: "Full Detail",
        description: "Complete interior and exterior",
        includes: [
            "Pre-rinse vehicle",
            "Apply foam cannon",
            "Two-bucket wash",
            "Clay bar treatment",
            "Iron remover application",
            "Dry vehicle",
            "Apply sealant",
            "Tire dressing",
            "Vacuum all surfaces",
            "Clean dashboard",
            "Clean door panels",
            "Clean seats",
            "Clean carpets/mats",
            "Apply UV protectant",
            "Clean windows",
            "Final inspection"
        ]
    },
    {
        id: "actual-6",
        name: "Premium Detail",
        description: "Ultimate detailing experience",
        includes: [
            "Pre-rinse vehicle",
            "Apply foam cannon",
            "Two-bucket wash",
            "Clay bar treatment",
            "Iron remover application",
            "Dry vehicle",
            "Apply ceramic coating",
            "Tire dressing",
            "Vacuum all surfaces",
            "Clean dashboard",
            "Clean door panels",
            "Clean seats",
            "Clean carpets/mats",
            "Apply UV protectant",
            "Clean windows",
            "Final inspection"
        ]
    }
];

const INITIAL_OTHER_PACKAGES: PackageItem[] = [
    {
        id: "other-1",
        name: "Express Detail",
        description: "Quick but thorough detail",
        includes: [
            "Hand Wash & Dry",
            "Wheels & Tires Cleaned",
            "Tire Shine",
            "Light Interior Vacuum",
            "Interior Wipe-Down (Dash, Console, Door Panels)",
            "Interior & Exterior Windows"
        ]
    },
    {
        id: "other-2",
        name: "Full Interior Detail",
        description: "Comprehensive interior cleaning",
        includes: [
            "Full Interior Vacuum",
            "Carpet Shampoo & Extraction",
            "Seat Shampoo & Extraction (cloth)",
            "Leather Cleaning & Conditioning (leather)",
            "Deep Cleaning of Dash, Console, Door Panels, Vents",
            "Cupholders + Crevices Deep Clean",
            "Interior Windows & Mirrors",
            "Light Odor Neutralizer"
        ]
    },
    {
        id: "other-3",
        name: "Full Exterior Detail",
        description: "Comprehensive exterior cleaning",
        includes: [
            "Hand Wash & Dry",
            "Foam Pre-Soak + Bug Removal",
            "Iron Decontamination",
            "Clay Bar Treatment",
            "Hand Wax or Sealant",
            "Wheels Deep Cleaned + Wheel Faces Polished",
            "Tires Cleaned & Dressed",
            "Exterior Plastics Restored",
            "Exterior Windows"
        ]
    },
    {
        id: "other-4",
        name: "Full Detail (Inside + Outside)",
        description: "Complete package",
        includes: [
            "Interior: Full Vacuum",
            "Interior: Carpet & Seat Shampoo/Extraction",
            "Interior: Leather Cleaning & Conditioning",
            "Interior: Full Interior Wipe-Down + Crevice Cleaning",
            "Interior: Interior Windows",
            "Exterior: Hand Wash & Dry",
            "Exterior: Clay Bar",
            "Exterior: Wax / Sealant",
            "Exterior: Wheels Deep Cleaned",
            "Exterior: Tires Dressed",
            "Exterior: Exterior Plastics Restored"
        ]
    },
    {
        id: "other-5",
        name: "Premium Full Detail",
        description: "High-end detail package",
        includes: [
            "Interior: Deep Vacuum",
            "Interior: Carpet + Seat Shampoo/Extraction",
            "Interior: Steam Cleaning of High-Touch Areas",
            "Interior: Leather Deep Clean + Conditioning Treatment",
            "Interior: Odor Treatment",
            "Interior: Interior Plastic Conditioning",
            "Exterior: Foam Bath + Hand Wash",
            "Exterior: Clay Bar",
            "Exterior: Machine Polish (Single-Step Enhancement)",
            "Exterior: Premium Sealant or Light Ceramic Topper",
            "Exterior: Wheel Faces Polished",
            "Exterior: Tires Cleaned & Dressed",
            "Exterior: Trim Restoration"
        ]
    },
    {
        id: "other-6",
        name: "Paint Correction",
        description: "Restoring paint perfection",
        includes: [
            "Foam Pre-Wash + Hand Wash",
            "Full Decontamination (Iron + Clay)",
            "Tape and Trim Protection",
            "1-Step or 2-Step Paint Correction (depending on package level)",
            "Gloss Enhancement Polish",
            "Sealant Applied After Correction"
        ]
    },
    {
        id: "other-7",
        name: "Ceramic Coating Packages",
        description: "Long term protection",
        includes: [
            "Full Wash",
            "Paint Decontamination",
            "Single-Step Polish (or multi-step if chosen)",
            "Panel Wipe Prep",
            "Ceramic Coating Applied to Paint",
            "Wheels Coated (faces only unless “wheels-off” upgrade chosen)",
            "Glass Coating (if included)",
            "Cure Time Instructions"
        ]
    },
    {
        id: "other-8",
        name: "Maintenance Detail",
        description: "Ideal for customers who previously purchased a Full Detail or Ceramic Coating",
        includes: [
            "Hand Wash",
            "Light Interior Vacuum",
            "Light Wipe-Down of Interior",
            "Windows",
            "Wheels & Tires",
            "Quick Spray Sealant"
        ]
    }
];

export default function PackageSelection() {
    const [actualPackages, setActualPackages] = useState<PackageItem[]>([]);
    const [otherPackages, setOtherPackages] = useState<PackageItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);

    // Edit/Add Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPackage, setEditingPackage] = useState<PackageItem | null>(null);
    const [editForm, setEditForm] = useState({
        name: "",
        description: "",
        includes: ""
    });
    const [targetList, setTargetList] = useState<"actual" | "other">("other");

    // Load data
    useEffect(() => {
        const loadData = async () => {
            const savedActual = await localforage.getItem<PackageItem[]>("pkg_select_actual");
            const savedOther = await localforage.getItem<PackageItem[]>("pkg_select_other");
            const savedSelection = await localforage.getItem<string[]>("pkg_select_selection");

            setActualPackages(savedActual || INITIAL_ACTUAL_PACKAGES);
            setOtherPackages(savedOther || INITIAL_OTHER_PACKAGES);
            if (savedSelection) {
                setSelectedIds(new Set(savedSelection));
            }
        };
        loadData();
    }, []);

    // Save data
    const saveData = async (actual: PackageItem[], other: PackageItem[]) => {
        await localforage.setItem("pkg_select_actual", actual);
        await localforage.setItem("pkg_select_other", other);
        setActualPackages(actual);
        setOtherPackages(other);
    };

    const saveSelection = async (newSet: Set<string>) => {
        setSelectedIds(newSet);
        await localforage.setItem("pkg_select_selection", Array.from(newSet));
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        saveSelection(newSet);
    };

    const handleEdit = (pkg: PackageItem, list: "actual" | "other") => {
        setEditingPackage(pkg);
        setTargetList(list);
        setEditForm({
            name: pkg.name,
            description: pkg.description,
            includes: pkg.includes.join("\n")
        });
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingPackage(null);
        setTargetList("other"); // Default to adding to "Other" list
        setEditForm({
            name: "",
            description: "",
            includes: ""
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string, list: "actual" | "other") => {
        if (!confirm("Are you sure you want to delete this package?")) return;

        if (list === "actual") {
            const newList = actualPackages.filter(p => p.id !== id);
            await saveData(newList, otherPackages);
        } else {
            const newList = otherPackages.filter(p => p.id !== id);
            await saveData(actualPackages, newList);
        }

        // Also remove from selection if present
        if (selectedIds.has(id)) {
            const newSet = new Set(selectedIds);
            newSet.delete(id);
            saveSelection(newSet);
        }
        toast.success("Package deleted");
    };

    const handleSave = async () => {
        const includesList = editForm.includes.split("\n").filter(line => line.trim() !== "");

        if (editingPackage) {
            // Update existing
            const updatedPkg = {
                ...editingPackage,
                name: editForm.name,
                description: editForm.description,
                includes: includesList
            };

            if (targetList === "actual") {
                const newList = actualPackages.map(p => p.id === updatedPkg.id ? updatedPkg : p);
                await saveData(newList, otherPackages);
            } else {
                const newList = otherPackages.map(p => p.id === updatedPkg.id ? updatedPkg : p);
                await saveData(actualPackages, newList);
            }
            toast.success("Package updated");
        } else {
            // Create new
            const newPkg: PackageItem = {
                id: `custom-${Date.now()}`,
                name: editForm.name,
                description: editForm.description,
                includes: includesList,
                isCustom: true
            };

            // Always add new to "Other" list as per requirement (or we could add a selector, but "Other" seems appropriate for custom additions)
            const newList = [...otherPackages, newPkg];
            await saveData(actualPackages, newList);
            toast.success("Package added");
        }
        setIsModalOpen(false);
    };

    // --- Comparison Logic ---
    const getSelectedPackages = () => {
        const all = [...actualPackages, ...otherPackages];
        return all.filter(p => selectedIds.has(p.id));
    };

    const generateComparisonData = () => {
        const selected = getSelectedPackages();
        if (selected.length < 2) return null;

        // Get all unique features across selected packages
        const allFeatures = new Set<string>();
        selected.forEach(p => p.includes.forEach(f => allFeatures.add(f)));
        const sortedFeatures = Array.from(allFeatures).sort();

        // Build rows
        const rows = sortedFeatures.map(feature => {
            const status = selected.map(p => p.includes.includes(feature));
            const isDifferent = status.some(s => s !== status[0]);
            return { feature, status, isDifferent };
        });

        return { selected, rows };
    };

    const comparisonData = generateComparisonData();

    const handleGeneratePDF = () => {
        if (!comparisonData) return;
        const { selected, rows } = comparisonData;

        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(220, 38, 38); // Red
        doc.text("Package Comparison Summary", 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 30);

        // Prepare table data
        const head = [["Feature", ...selected.map(p => p.name)]];
        const body = rows
            .filter(r => !showDifferencesOnly || r.isDifferent)
            .map(r => [
                r.feature,
                ...r.status.map(s => s ? "YES" : "-")
            ]);

        // Generate table
        autoTable(doc, {
            startY: 40,
            head: head,
            body: body,
            headStyles: { fillColor: [220, 38, 38] },
            styles: { fontSize: 9 },
            columnStyles: { 0: { fontStyle: 'bold' } },
        });

        // Add Explanations to PDF
        let finalY = (doc as any).lastAutoTable.finalY + 10;

        doc.setFontSize(16);
        doc.setTextColor(220, 38, 38);
        doc.text("Package Explanations", 14, finalY);
        finalY += 10;

        selected.forEach((pkg) => {
            // Check for page break
            if (finalY > 250) {
                doc.addPage();
                finalY = 20;
            }

            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "bold");
            doc.text(pkg.name, 14, finalY);
            finalY += 7;

            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(80);

            // Description
            const descLines = doc.splitTextToSize(pkg.description, 180);
            doc.text(descLines, 14, finalY);
            finalY += (descLines.length * 5) + 5;

            // Includes
            doc.setFontSize(10);
            doc.setTextColor(50);
            pkg.includes.forEach(item => {
                if (finalY > 270) {
                    doc.addPage();
                    finalY = 20;
                }
                doc.text(`• ${item}`, 20, finalY);
                finalY += 5;
            });

            finalY += 10; // Spacing between packages
        });

        // Save to File Manager
        const pdfDataUrl = doc.output("dataurlstring");
        const fileName = `Comparison_Summary_${Date.now()}.pdf`;

        try {
            savePDFToArchive(
                "Package Comparisons",
                "Admin User",
                `comp-${Date.now()}`,
                pdfDataUrl,
                { fileName }
            );
            toast.success("Comparison PDF saved to File Manager");
        } catch (e) {
            console.error(e);
            toast.error("Failed to save PDF");
        }
    };

    const renderPackageList = (packages: PackageItem[], listType: "actual" | "other") => (
        <Accordion type="multiple" className="w-full space-y-4">
            {packages.map((pkg) => (
                <AccordionItem key={pkg.id} value={pkg.id} className="border rounded-lg px-4 bg-card">
                    <div className="flex items-center py-4">
                        <Checkbox
                            checked={selectedIds.has(pkg.id)}
                            onCheckedChange={() => toggleSelection(pkg.id)}
                            className="mr-4 h-5 w-5"
                        />
                        <AccordionTrigger className="flex-1 hover:no-underline py-0">
                            <div className="flex flex-col items-start text-left">
                                <span className="font-semibold text-lg">{pkg.name}</span>
                                <span className="text-sm text-muted-foreground">{pkg.description}</span>
                            </div>
                        </AccordionTrigger>
                        <div className="flex gap-2 ml-4">
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(pkg, listType); }}>
                                <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(pkg.id, listType); }}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <AccordionContent>
                        <div className="pl-9 pb-4">
                            <h4 className="font-semibold mb-2">What's Included:</h4>
                            <ul className="space-y-1">
                                {pkg.includes.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                        <span className="text-primary">✓</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8 pb-24">
            <PageHeader title="Package Comparison Guide" description="Select packages to compare features side-by-side." />

            {/* Comparison View (Sticky or Top if active) */}
            {comparisonData && (
                <Accordion type="single" collapsible defaultValue="summary" className="w-full">
                    <AccordionItem value="summary" className="border-none">
                        <AccordionTrigger className="hover:no-underline py-2">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                <span className="text-xl font-bold">Comparison Summary</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <Card className="border-2 border-primary/20 shadow-lg animate-in fade-in slide-in-from-top-4 mt-2">
                                <CardHeader className="bg-muted/30 pb-4">
                                    <div className="flex items-center justify-end">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center space-x-2">
                                                <Switch
                                                    id="diff-mode"
                                                    checked={showDifferencesOnly}
                                                    onCheckedChange={setShowDifferencesOnly}
                                                />
                                                <Label htmlFor="diff-mode">Show Differences Only</Label>
                                            </div>
                                            <Button onClick={handleGeneratePDF} variant="default">
                                                <Download className="mr-2 h-4 w-4" />
                                                Save as PDF
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
                                            <tr>
                                                <th className="px-6 py-3 font-bold">Feature</th>
                                                {comparisonData.selected.map(p => (
                                                    <th key={p.id} className="px-6 py-3 font-bold text-foreground">{p.name}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {comparisonData.rows
                                                .filter(r => !showDifferencesOnly || r.isDifferent)
                                                .map((row, idx) => (
                                                    <tr key={idx} className={`hover:bg-muted/20 ${row.isDifferent ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                                                        <td className="px-6 py-3 font-medium">{row.feature}</td>
                                                        {row.status.map((included, i) => (
                                                            <td key={i} className="px-6 py-3">
                                                                {included ? (
                                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                                                        ✓
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-muted-foreground">-</span>
                                                                )}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            {comparisonData.rows.filter(r => !showDifferencesOnly || r.isDifferent).length === 0 && (
                                                <tr>
                                                    <td colSpan={comparisonData.selected.length + 1} className="px-6 py-8 text-center text-muted-foreground">
                                                        No differences found between selected packages.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </CardContent>
                            </Card>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}

            {/* Package Explanations Section */}
            {comparisonData && (
                <Accordion type="single" collapsible defaultValue="explanations" className="w-full">
                    <AccordionItem value="explanations" className="border-none">
                        <AccordionTrigger className="hover:no-underline py-2">
                            <div className="flex items-center gap-2">
                                <FileText className="h-6 w-6 text-primary" />
                                <span className="text-2xl font-bold text-primary">Package Explanations</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                {comparisonData.selected.map(pkg => (
                                    <Card key={pkg.id} className="border shadow-sm hover:shadow-md transition-shadow">
                                        <CardHeader className="bg-muted/10 pb-3">
                                            <CardTitle className="text-lg font-bold text-primary">{pkg.name}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-4 space-y-4">
                                            <div>
                                                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Summary</h4>
                                                <p className="text-foreground">{pkg.description}</p>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Detailed Breakdown</h4>
                                                <ul className="space-y-2">
                                                    {pkg.includes.map((item, idx) => (
                                                        <li key={idx} className="flex items-start gap-2 text-sm">
                                                            <span className="text-green-600 mt-0.5">✓</span>
                                                            <span>{item}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}

            {/* Actual Packages Section */}
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="actual" className="border-none">
                    <AccordionTrigger className="hover:no-underline py-2">
                        <div className="flex items-center justify-between w-full pr-4">
                            <span className="text-2xl font-bold text-primary">Actual Packages</span>
                            <span className="text-muted-foreground text-sm font-normal">Currently live on your site</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="mt-4">
                            {renderPackageList(actualPackages, "actual")}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            {/* Colorful Divider */}
            <div className="relative py-8">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-4 border-dashed border-indigo-500/30"></div>
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-background px-4 text-sm text-muted-foreground font-medium uppercase tracking-wider">
                        <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-transparent bg-clip-text font-bold text-lg">
                            Additional Options
                        </span>
                    </span>
                </div>
            </div>

            {/* Other Packages Section */}
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="other" className="border-none">
                    <AccordionTrigger className="hover:no-underline py-2">
                        <span className="text-2xl font-bold text-purple-600">Other Packages</span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-4 mt-4">
                            <div className="flex justify-end">
                                <Button onClick={handleAdd} className="bg-purple-600 hover:bg-purple-700">
                                    <Plus className="mr-2 h-4 w-4" /> Add Custom Package
                                </Button>
                            </div>
                            {renderPackageList(otherPackages, "other")}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            {/* Edit/Add Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingPackage ? "Edit Package" : "Add New Package"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Package Name</label>
                            <Input
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                placeholder="e.g. Ultimate Shine"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Input
                                value={editForm.description}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                placeholder="Brief summary..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Includes (one per line)</label>
                            <Textarea
                                value={editForm.includes}
                                onChange={(e) => setEditForm({ ...editForm, includes: e.target.value })}
                                placeholder="✓ Item 1&#10;✓ Item 2&#10;✓ Item 3"
                                className="h-40"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" /> Save Package</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
