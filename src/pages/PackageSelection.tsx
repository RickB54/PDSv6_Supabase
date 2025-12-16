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
import { Plus, Trash2, Edit2, Save, FileText, Download, CheckCircle2, ArrowRight, Package, ArrowLeft, BarChart3, ListFilter } from "lucide-react";
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
    const [step, setStep] = useState<1 | 2>(1);
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
            if (newSet.size >= 3) {
                toast.error("Select up to 3 packages for optimal comparison");
                // We don't block, just warn, but let's allow fit
            }
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((pkg) => {
                const isSelected = selectedIds.has(pkg.id);
                return (
                    <div
                        key={pkg.id}
                        onClick={() => toggleSelection(pkg.id)}
                        className={`
                            cursor-pointer relative group rounded-xl border transition-all duration-200 overflow-hidden
                            ${isSelected
                                ? 'bg-zinc-900 border-red-500 ring-1 ring-red-500 shadow-lg shadow-red-900/10'
                                : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800'
                            }
                        `}
                    >
                        {isSelected && (
                            <div className="absolute top-3 right-3 text-red-500">
                                <CheckCircle2 className="w-5 h-5 fill-red-500/10" />
                            </div>
                        )}

                        <div className="p-5">
                            <h3 className={`font-bold text-lg mb-1 pr-6 ${isSelected ? 'text-white' : 'text-zinc-200'}`}>{pkg.name}</h3>
                            <p className="text-sm text-zinc-400 line-clamp-2 min-h-[40px]">{pkg.description}</p>

                            <div className="mt-4 pt-4 border-t border-zinc-800/50 flex justify-between items-center">
                                <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                                    {pkg.includes.length} Features
                                </span>
                                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-white" onClick={() => handleEdit(pkg, listType)}>
                                        <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-red-500" onClick={() => handleDelete(pkg.id, listType)}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
            {/* Add New Button Card */}
            <div
                onClick={() => {
                    setEditingPackage(null);
                    setTargetList(listType);
                    setEditForm({ name: "", description: "", includes: "" });
                    setIsModalOpen(true);
                }}
                className="cursor-pointer rounded-xl border border-zinc-800 border-dashed bg-zinc-950/30 hover:bg-zinc-900 hover:border-zinc-700 transition-all duration-200 flex flex-col items-center justify-center min-h-[160px] group"
            >
                <div className="p-3 rounded-full bg-zinc-900 text-zinc-500 group-hover:text-white group-hover:bg-zinc-800 transition-colors mb-3">
                    <Plus className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium text-zinc-400 group-hover:text-white">Add Package</span>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background pb-20">
            <PageHeader title="Package Comparison" />
            <div className="p-4 max-w-7xl mx-auto space-y-6">

                {/* Step 1: Select Packages */}
                {step === 1 && (
                    <Card className="p-8 bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 shadow-xl">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-500/10 rounded-full border border-red-500/20">
                                    <ListFilter className="w-8 h-8 text-red-500" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Select Packages to Compare</h2>
                                    <p className="text-zinc-400 text-sm">Step 1 of 2: Choose items from your menu</p>
                                </div>
                            </div>
                            <Button
                                onClick={() => setStep(2)}
                                disabled={selectedIds.size < 1}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 h-12 shadow-lg shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Compare Selected ({selectedIds.size}) <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </div>

                        <div className="space-y-10">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <Package className="w-5 h-5 text-zinc-400" />
                                    Active Packages
                                </h3>
                                {renderPackageList(actualPackages, "actual")}
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <Package className="w-5 h-5 text-zinc-400" />
                                    Other / Custom Packages
                                </h3>
                                {renderPackageList(otherPackages, "other")}
                            </div>
                        </div>
                    </Card>
                )}


                {/* Step 2: Comparison View */}
                {step === 2 && comparisonData && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        {/* Header & Controls */}
                        <Card className="p-6 bg-zinc-900 border-zinc-800 shadow-xl">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <Button variant="ghost" onClick={() => setStep(1)} className="text-zinc-400 hover:text-white pl-0">
                                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Selection
                                    </Button>
                                    <div className="h-6 w-px bg-zinc-700 mx-2 hidden sm:block"></div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-red-500" />
                                        Comparison Visualization
                                    </h2>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex items-center space-x-2 bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                                        <Switch
                                            id="diff-mode"
                                            checked={showDifferencesOnly}
                                            onCheckedChange={setShowDifferencesOnly}
                                            className="data-[state=checked]:bg-red-600"
                                        />
                                        <Label htmlFor="diff-mode" className="text-sm text-zinc-300 cursor-pointer">Show Differences Only</Label>
                                    </div>
                                    <Button onClick={handleGeneratePDF} className="bg-white text-black hover:bg-zinc-200">
                                        <Download className="mr-2 h-4 w-4" /> Export PDF
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        {/* Comparison Table */}
                        <Card className="bg-zinc-950 border-zinc-800 overflow-hidden shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="bg-zinc-900/80 border-b border-zinc-800">
                                            <th className="px-6 py-6 font-bold text-zinc-400 uppercase tracking-wider w-1/4 min-w-[200px]">Feature</th>
                                            {comparisonData.selected.map(p => (
                                                <th key={p.id} className="px-6 py-6 font-bold text-white text-lg min-w-[200px]">
                                                    {p.name}
                                                    <div className="text-xs font-normal text-zinc-500 mt-1 capitalize normal-case line-clamp-1">{p.description}</div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/50">
                                        {comparisonData.rows
                                            .filter(r => !showDifferencesOnly || r.isDifferent)
                                            .map((row, idx) => (
                                                <tr key={idx} className={`hover:bg-zinc-900/30 transition-colors ${row.isDifferent ? 'bg-red-950/5' : ''}`}>
                                                    <td className="px-6 py-4 font-medium text-zinc-300 border-r border-zinc-800/50 bg-zinc-900/20">{row.feature}</td>
                                                    {row.status.map((included, i) => (
                                                        <td key={i} className="px-6 py-4 text-center">
                                                            {included ? (
                                                                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                                    <CheckCircle2 className="w-5 h-5" />
                                                                </div>
                                                            ) : (
                                                                <span className="text-zinc-600 text-2xl font-light">·</span>
                                                            )}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        {comparisonData.rows.filter(r => !showDifferencesOnly || r.isDifferent).length === 0 && (
                                            <tr>
                                                <td colSpan={comparisonData.selected.length + 1} className="px-6 py-12 text-center text-zinc-500">
                                                    No differences found to display.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        {/* Explanations Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                            {comparisonData.selected.map(pkg => (
                                <Card key={pkg.id} className="bg-zinc-900 border-zinc-800 flex flex-col h-full hover:border-red-900/30 transition-colors">
                                    <div className="p-6 border-b border-zinc-800 bg-zinc-950/30">
                                        <h3 className="text-xl font-bold text-white mb-2">{pkg.name}</h3>
                                        <p className="text-sm text-zinc-400">{pkg.description}</p>
                                    </div>
                                    <div className="p-6 flex-1 bg-zinc-900/50">
                                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Complete Breakdown</h4>
                                        <ul className="space-y-3">
                                            {pkg.includes.map((item, idx) => (
                                                <li key={idx} className="flex items-start gap-3 text-sm text-zinc-300">
                                                    <div className="mt-1 min-w-[16px]"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div></div>
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

            </div>


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
