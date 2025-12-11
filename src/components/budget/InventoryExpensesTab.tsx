import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Download } from "lucide-react";
import localforage from "localforage";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { savePDFToArchive } from "@/lib/pdfArchive";

interface Material {
    id: string;
    name: string;
    category: string;
    subtype?: string;
    quantity: number;
    costPerItem?: number;
    notes?: string;
    lowThreshold?: number;
    unitOfMeasure?: string;
    consumptionRate?: number;
}

interface Chemical {
    id: string;
    name: string;
    bottleSize: string;
    costPerBottle: number;
    threshold: number;
    currentStock: number;
    unitOfMeasure?: string;
    consumptionRate?: number;
}

interface Tool {
    id: string;
    name: string;
    warranty: string;
    purchaseDate: string;
    price: number;
    lifeExpectancy: string;
    notes: string;
    category?: string;
    unitOfMeasure?: string;
}

const CATEGORY_COLORS = {
    materials: "#3b82f6", // blue
    chemicals: "#10b981", // green
    tools: "#f59e0b", // amber
};

export default function InventoryExpensesTab() {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [chemicals, setChemicals] = useState<Chemical[]>([]);
    const [tools, setTools] = useState<Tool[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const mats = (await localforage.getItem<Material[]>("materials")) || [];
        const chems = (await localforage.getItem<Chemical[]>("chemicals")) || [];
        const tls = (await localforage.getItem<Tool[]>("tools")) || [];
        setMaterials(mats);
        setChemicals(chems);
        setTools(tls);
    };

    const totalMaterialsCost = materials.reduce(
        (sum, m) => sum + (m.costPerItem || 0) * m.quantity,
        0
    );
    const totalChemicalsCost = chemicals.reduce(
        (sum, c) => sum + c.costPerBottle * c.currentStock,
        0
    );
    const totalToolsCost = tools.reduce((sum, t) => sum + (t.price || 0), 0);
    const grandTotal = totalMaterialsCost + totalChemicalsCost + totalToolsCost;

    const exportPDF = async () => {
        const doc = new jsPDF();
        let y = 20;

        // Header
        doc.setFontSize(18);
        doc.text("Inventory Expenses Report", 20, y);
        y += 10;
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, y);
        y += 15;

        // Materials Section
        if (materials.length > 0) {
            doc.setFontSize(14);
            doc.text("Materials", 20, y);
            y += 8;
            doc.setFontSize(9);
            materials.forEach((m) => {
                const cost = (m.costPerItem || 0) * m.quantity;
                const line = `${m.name} - ${m.category} - Qty: ${m.quantity} - Cost: $${cost.toFixed(2)}`;
                doc.text(line, 25, y);
                y += 6;
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }
            });
            doc.setFontSize(11);
            doc.text(`Materials Total: $${totalMaterialsCost.toFixed(2)}`, 25, y);
            y += 10;
        }

        // Chemicals Section
        if (chemicals.length > 0) {
            if (y > 250) {
                doc.addPage();
                y = 20;
            }
            doc.setFontSize(14);
            doc.text("Chemicals", 20, y);
            y += 8;
            doc.setFontSize(9);
            chemicals.forEach((c) => {
                const cost = c.costPerBottle * c.currentStock;
                const line = `${c.name} - ${c.bottleSize} - Stock: ${c.currentStock} - Cost: $${cost.toFixed(2)}`;
                doc.text(line, 25, y);
                y += 6;
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }
            });
            doc.setFontSize(11);
            doc.text(`Chemicals Total: $${totalChemicalsCost.toFixed(2)}`, 25, y);
            y += 10;
        }

        // Tools Section
        if (tools.length > 0) {
            if (y > 250) {
                doc.addPage();
                y = 20;
            }
            doc.setFontSize(14);
            doc.text("Tools", 20, y);
            y += 8;
            doc.setFontSize(9);
            tools.forEach((t) => {
                const line = `${t.name} - Price: $${(t.price || 0).toFixed(2)}`;
                doc.text(line, 25, y);
                y += 6;
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }
            });
            doc.setFontSize(11);
            doc.text(`Tools Total: $${totalToolsCost.toFixed(2)}`, 25, y);
            y += 10;
        }

        // Grand Total
        if (y > 260) {
            doc.addPage();
            y = 20;
        }
        doc.setFontSize(16);
        doc.text(`Grand Total: $${grandTotal.toFixed(2)}`, 20, y);

        // Save to File Manager
        const dataUrl = doc.output("dataurlstring");
        const fileName = `Inventory_Expenses_${new Date().toLocaleDateString().replace(/\//g, "-")}.pdf`;
        try {
            await savePDFToArchive(
                "Inventory Report",
                "Inventory",
                `inventory-expenses-${Date.now()}`,
                dataUrl,
                { fileName, path: "Inventory Reports/" }
            );
        } catch (error) {
            console.error("Error saving PDF to archive:", error);
        }

        // Download
        doc.save(fileName);
        toast.success("PDF exported successfully");
    };

    const exportCSV = () => {
        const lines = ["Category,Name,Description,Cost,Unit of Measure,Consumption Rate,Threshold"];

        materials.forEach((m) => {
            const cost = (m.costPerItem || 0) * m.quantity;
            lines.push(
                `Materials,"${m.name}","${m.category} - ${m.subtype || ""}",${cost},${m.unitOfMeasure || "-"},${m.consumptionRate || "-"},${m.lowThreshold || "-"}`
            );
        });

        chemicals.forEach((c) => {
            const cost = c.costPerBottle * c.currentStock;
            lines.push(
                `Chemicals,"${c.name}","${c.bottleSize}",${cost},${c.unitOfMeasure || "-"},${c.consumptionRate || "-"},${c.threshold}`
            );
        });

        tools.forEach((t) => {
            lines.push(
                `Tools,"${t.name}","${t.category || "-"}",${t.price || 0},${t.unitOfMeasure || "-"},-,-`
            );
        });

        const blob = new Blob([lines.join("\n")], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Inventory_Expenses_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV exported successfully");
    };

    const exportJSON = () => {
        const data = {
            materials,
            chemicals,
            tools,
            totals: {
                materials: totalMaterialsCost,
                chemicals: totalChemicalsCost,
                tools: totalToolsCost,
                grandTotal,
            },
            exportDate: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Inventory_Expenses_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("JSON exported successfully");
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards with Pie Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Inventory Breakdown</h3>
                    <div className="flex flex-col items-center justify-center">
                        <div className="relative w-64 h-64">
                            <svg viewBox="0 0 200 200" className="transform -rotate-90">
                                {(() => {
                                    if (grandTotal === 0) {
                                        return (
                                            <circle
                                                cx="100"
                                                cy="100"
                                                r="80"
                                                fill="hsl(var(--muted))"
                                            />
                                        );
                                    }

                                    let currentAngle = 0;
                                    const segments = [
                                        {
                                            name: "Materials",
                                            amount: totalMaterialsCost,
                                            color: CATEGORY_COLORS.materials,
                                        },
                                        {
                                            name: "Chemicals",
                                            amount: totalChemicalsCost,
                                            color: CATEGORY_COLORS.chemicals,
                                        },
                                        {
                                            name: "Tools",
                                            amount: totalToolsCost,
                                            color: CATEGORY_COLORS.tools,
                                        },
                                    ].filter((s) => s.amount > 0);

                                    return segments.map((segment, idx) => {
                                        const percentage = (segment.amount / grandTotal) * 100;
                                        const angle = (percentage / 100) * 360;
                                        const startAngle = currentAngle;
                                        currentAngle += angle;

                                        const x1 =
                                            100 + 80 * Math.cos((startAngle * Math.PI) / 180);
                                        const y1 =
                                            100 + 80 * Math.sin((startAngle * Math.PI) / 180);
                                        const x2 =
                                            100 + 80 * Math.cos((currentAngle * Math.PI) / 180);
                                        const y2 =
                                            100 + 80 * Math.sin((currentAngle * Math.PI) / 180);
                                        const largeArc = angle > 180 ? 1 : 0;

                                        return (
                                            <path
                                                key={idx}
                                                d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                                fill={segment.color}
                                                opacity="0.9"
                                            />
                                        );
                                    });
                                })()}
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground">Total</p>
                                    <p className="text-2xl font-bold">
                                        ${grandTotal.toFixed(0)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="mt-6 space-y-2 w-full max-w-xs">
                            <div className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-4 h-4 rounded"
                                        style={{ backgroundColor: CATEGORY_COLORS.materials }}
                                    />
                                    <span className="text-sm font-medium">Materials</span>
                                </div>
                                <span className="text-sm font-bold">
                                    ${totalMaterialsCost.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-4 h-4 rounded"
                                        style={{ backgroundColor: CATEGORY_COLORS.chemicals }}
                                    />
                                    <span className="text-sm font-medium">Chemicals</span>
                                </div>
                                <span className="text-sm font-bold">
                                    ${totalChemicalsCost.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-4 h-4 rounded"
                                        style={{ backgroundColor: CATEGORY_COLORS.tools }}
                                    />
                                    <span className="text-sm font-medium">Tools</span>
                                </div>
                                <span className="text-sm font-bold">
                                    ${totalToolsCost.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Summary Stats */}
                <Card className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Export Options</h3>
                    </div>
                    <div className="space-y-3">
                        <Button onClick={exportPDF} className="w-full" variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Export as PDF
                        </Button>
                        <Button onClick={exportCSV} className="w-full" variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Export as CSV
                        </Button>
                        <Button onClick={exportJSON} className="w-full" variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Export as JSON
                        </Button>
                    </div>

                    <div className="mt-6 pt-6 border-t space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                                Total Items
                            </span>
                            <span className="font-semibold">
                                {materials.length + chemicals.length + tools.length}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                                Materials Count
                            </span>
                            <span className="font-semibold">{materials.length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                                Chemicals Count
                            </span>
                            <span className="font-semibold">{chemicals.length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                                Tools Count
                            </span>
                            <span className="font-semibold">{tools.length}</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Materials List */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Materials</h3>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Cost/Item</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Total Cost</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead>Consumption Rate</TableHead>
                            <TableHead>Threshold</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {materials.map((m) => (
                            <TableRow key={m.id}>
                                <TableCell className="font-medium">{m.name}</TableCell>
                                <TableCell>{m.category}</TableCell>
                                <TableCell>
                                    ${(m.costPerItem || 0).toFixed(2)}
                                </TableCell>
                                <TableCell>{m.quantity}</TableCell>
                                <TableCell className="font-semibold">
                                    ${((m.costPerItem || 0) * m.quantity).toFixed(2)}
                                </TableCell>
                                <TableCell>{m.unitOfMeasure || "-"}</TableCell>
                                <TableCell>{m.consumptionRate || "-"}</TableCell>
                                <TableCell>{m.lowThreshold || "-"}</TableCell>
                            </TableRow>
                        ))}
                        {materials.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={8}
                                    className="text-center text-muted-foreground py-8"
                                >
                                    No materials in inventory
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Chemicals List */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Chemicals</h3>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Bottle Size</TableHead>
                            <TableHead>Cost/Bottle</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Total Cost</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead>Consumption Rate</TableHead>
                            <TableHead>Threshold</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {chemicals.map((c) => (
                            <TableRow key={c.id}>
                                <TableCell className="font-medium">{c.name}</TableCell>
                                <TableCell>{c.bottleSize}</TableCell>
                                <TableCell>${c.costPerBottle.toFixed(2)}</TableCell>
                                <TableCell>{c.currentStock}</TableCell>
                                <TableCell className="font-semibold">
                                    ${(c.costPerBottle * c.currentStock).toFixed(2)}
                                </TableCell>
                                <TableCell>{c.unitOfMeasure || "-"}</TableCell>
                                <TableCell>{c.consumptionRate || "-"}</TableCell>
                                <TableCell>{c.threshold}</TableCell>
                            </TableRow>
                        ))}
                        {chemicals.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={8}
                                    className="text-center text-muted-foreground py-8"
                                >
                                    No chemicals in inventory
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Tools List */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Tools</h3>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Purchase Date</TableHead>
                            <TableHead>Warranty</TableHead>
                            <TableHead>Life Expectancy</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tools.map((t) => (
                            <TableRow key={t.id}>
                                <TableCell className="font-medium">{t.name}</TableCell>
                                <TableCell>{t.category || "-"}</TableCell>
                                <TableCell className="font-semibold">
                                    ${(t.price || 0).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                    {t.purchaseDate
                                        ? new Date(t.purchaseDate).toLocaleDateString()
                                        : "-"}
                                </TableCell>
                                <TableCell>{t.warranty || "-"}</TableCell>
                                <TableCell>{t.lifeExpectancy || "-"}</TableCell>
                            </TableRow>
                        ))}
                        {tools.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={6}
                                    className="text-center text-muted-foreground py-8"
                                >
                                    No tools in inventory
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
