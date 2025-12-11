import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { TrendingUp, User, CheckCircle2, FileText, Edit, Trash2, History as HistoryIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCustomers } from "@/lib/db";
import { getClientUpsells, upsertClientUpsell, deleteClientUpsell, getClientUpsellHistory } from "@/lib/db";
import { COMPLAINT_OPTIONS, GOAL_OPTIONS, UPSELL_SERVICES, UpsellService } from "@/data/upsell_data";
import { generateRecommendations, generateScript } from "@/lib/recommendation_engine";
import jsPDF from "jspdf";
import { savePDFToArchive } from "@/lib/pdfArchive";
import { getCurrentUser } from "@/lib/auth";

interface Customer {
    id: string;
    name: string;
    email?: string;
    phone?: string;
}

interface ClientUpsell {
    id: string;
    client_id: string;
    client_name: string;
    vehicle_type?: string;
    condition?: number;
    complaints: string[];
    custom_complaint?: string;
    goals: string[];
    custom_goal?: string;
    recommended_upsells: string[];
    selected_upsells: string[];
    script: string;
    additional_notes?: string;
    date_created: string;
    created_by: string;
}

export default function AddonUpsellScript() {
    const { toast } = useToast();
    const user = getCurrentUser();

    // State
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedClient, setSelectedClient] = useState<string>("");
    const [vehicleType, setVehicleType] = useState<string>("Mid-Size/SUV");
    const [condition, setCondition] = useState<number>(3);
    const [complaints, setComplaints] = useState<string[]>([]);
    const [customComplaint, setCustomComplaint] = useState<string>("");
    const [goals, setGoals] = useState<string[]>([]);
    const [customGoal, setCustomGoal] = useState<string>("");
    const [additionalNotes, setAdditionalNotes] = useState<string>("");
    const [recommendedUpsells, setRecommendedUpsells] = useState<string[]>([]);
    const [selectedUpsells, setSelectedUpsells] = useState<string[]>([]);
    const [script, setScript] = useState<string>("");
    const [history, setHistory] = useState<ClientUpsell[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Load customers on mount
    useEffect(() => {
        loadCustomers();
    }, []);

    // Load history when client changes
    useEffect(() => {
        if (selectedClient) {
            loadHistory();
        }
    }, [selectedClient]);

    // Update recommendations when complaints/goals change
    useEffect(() => {
        if (complaints.length > 0 || goals.length > 0 || customComplaint || customGoal) {
            const recs = generateRecommendations(complaints, goals, customComplaint, customGoal);
            setRecommendedUpsells(recs);

            // Auto-select all recommendations
            setSelectedUpsells(recs);
        }
    }, [complaints, goals, customComplaint, customGoal]);

    // Update script when selections change
    useEffect(() => {
        if (selectedUpsells.length > 0) {
            const client = selectedClient ? customers.find(c => c.id === selectedClient) : null;
            const clientName = client ? client.name : "[Customer Name]";
            const services = UPSELL_SERVICES.filter(s => selectedUpsells.includes(s.id));
            const generatedScript = generateScript(
                clientName,
                vehicleType,
                condition,
                complaints,
                goals,
                services,
                customComplaint,
                customGoal,
                additionalNotes
            );
            setScript(generatedScript);
        }
    }, [selectedClient, selectedUpsells, vehicleType, condition, complaints, goals, customComplaint, customGoal, additionalNotes, customers]);

    const loadCustomers = async () => {
        const custs = await getCustomers<Customer>();
        setCustomers(custs);
    };

    const loadHistory = async () => {
        if (selectedClient && selectedClient !== 'none') {
            // Load history for specific customer
            const hist = await getClientUpsellHistory(selectedClient);
            setHistory(hist);
        } else {
            // Load all generic scripts (client_id === 'generic')
            const allHistory = await getClientUpsells<ClientUpsell>();
            const genericHistory = allHistory.filter(item => item.client_id === 'generic');
            setHistory(genericHistory);
        }
    };

    const handleComplaintToggle = (complaint: string) => {
        setComplaints(prev =>
            prev.includes(complaint)
                ? prev.filter(c => c !== complaint)
                : [...prev, complaint]
        );
    };

    const handleGoalToggle = (goal: string) => {
        setGoals(prev =>
            prev.includes(goal)
                ? prev.filter(g => g !== goal)
                : [...prev, goal]
        );
    };

    const handleUpsellToggle = (upsellId: string) => {
        setSelectedUpsells(prev =>
            prev.includes(upsellId)
                ? prev.filter(u => u !== upsellId)
                : [...prev, upsellId]
        );
    };

    const handleSave = async () => {
        // Allow saving with or without a customer
        const clientId = selectedClient || 'generic';
        const client = selectedClient ? customers.find(c => c.id === selectedClient) : null;
        const clientName = client ? client.name : 'Generic Customer';

        const data: ClientUpsell = {
            id: editingId || Date.now().toString(),
            client_id: clientId,
            client_name: clientName,
            vehicle_type: vehicleType,
            condition,
            complaints,
            custom_complaint: customComplaint,
            goals,
            custom_goal: customGoal,
            recommended_upsells: recommendedUpsells,
            selected_upsells: selectedUpsells,
            script,
            additional_notes: additionalNotes,
            date_created: new Date().toISOString(),
            created_by: user?.name || "Unknown"
        };

        await upsertClientUpsell(data);

        // Also save PDF to File Manager
        if (script) {
            const doc = new jsPDF();
            let y = 20;

            const addText = (text: string, fontSize = 11, isBold = false) => {
                doc.setFontSize(fontSize);
                if (isBold) doc.setFont("helvetica", "bold");
                else doc.setFont("helvetica", "normal");

                const lines = doc.splitTextToSize(text, 170);
                lines.forEach((line: string) => {
                    if (y > 270) {
                        doc.addPage();
                        y = 20;
                    }
                    doc.text(line, 20, y);
                    y += 6;
                });
                y += 2;
            };

            addText("Client Upsell Script", 18, true);
            addText(`Client: ${clientName}`, 12);
            addText(`Date: ${new Date().toLocaleDateString()}`, 12);
            addText(`Vehicle: ${vehicleType} (Condition: ${condition}/5)`, 12);
            y += 5;

            if (complaints.length > 0 || customComplaint) {
                addText("Complaints:", 12, true);
                complaints.forEach(c => addText(`• ${c}`));
                if (customComplaint) addText(`• ${customComplaint}`);
                y += 3;
            }

            if (goals.length > 0 || customGoal) {
                addText("Goals:", 12, true);
                goals.forEach(g => addText(`• ${g}`));
                if (customGoal) addText(`• ${customGoal}`);
                y += 3;
            }

            const services = UPSELL_SERVICES.filter(s => selectedUpsells.includes(s.id));
            if (services.length > 0) {
                addText("Recommended Services:", 12, true);
                services.forEach(s => {
                    addText(`• ${s.name} - $${s.price}`);
                });
                const total = services.reduce((sum, s) => sum + s.price, 0);
                addText(`Total: $${total}`, 12, true);
                y += 3;
            }

            addText("Sales Script:", 12, true);
            addText(script);

            const dataUrl = doc.output("dataurlstring");
            const fileName = `Upsell_Script_${clientName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;

            savePDFToArchive("Upsell Scripts", clientName, `upsell-${Date.now()}`, dataUrl, {
                fileName,
                path: "Upsell Scripts/"
            });
        }

        toast({ title: "Saved", description: selectedClient ? "Upsell record saved successfully (PDF saved to File Manager)" : "Generic script saved successfully (PDF saved to File Manager)" });
        loadHistory();
        handleReset();
    };

    const handleExportPDF = () => {
        if (!script) {
            toast({ title: "Error", description: "Please generate a script first", variant: "destructive" });
            return;
        }

        const client = selectedClient ? customers.find(c => c.id === selectedClient) : null;
        const clientName = client ? client.name : "Generic Customer";

        const doc = new jsPDF();
        let y = 20;

        const addText = (text: string, fontSize = 11, isBold = false) => {
            doc.setFontSize(fontSize);
            if (isBold) doc.setFont("helvetica", "bold");
            else doc.setFont("helvetica", "normal");

            const lines = doc.splitTextToSize(text, 170);
            lines.forEach((line: string) => {
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }
                doc.text(line, 20, y);
                y += 6;
            });
            y += 2;
        };

        addText("Client Upsell Script", 18, true);
        addText(`Client: ${client.name}`, 12);
        addText(`Date: ${new Date().toLocaleDateString()}`, 12);
        addText(`Vehicle: ${vehicleType} (Condition: ${condition}/5)`, 12);
        y += 5;

        if (complaints.length > 0 || customComplaint) {
            addText("Complaints:", 12, true);
            complaints.forEach(c => addText(`• ${c}`));
            if (customComplaint) addText(`• ${customComplaint}`);
            y += 3;
        }

        if (goals.length > 0 || customGoal) {
            addText("Goals:", 12, true);
            goals.forEach(g => addText(`• ${g}`));
            if (customGoal) addText(`• ${customGoal}`);
            y += 3;
        }

        const services = UPSELL_SERVICES.filter(s => selectedUpsells.includes(s.id));
        if (services.length > 0) {
            addText("Recommended Services:", 12, true);
            services.forEach(s => {
                addText(`• ${s.name} - $${s.price}`);
            });
            const total = services.reduce((sum, s) => sum + s.price, 0);
            addText(`Total: $${total}`, 12, true);
            y += 3;
        }

        addText("Sales Script:", 12, true);
        addText(script);

        const dataUrl = doc.output("dataurlstring");
        const fileName = `Upsell_Script_${clientName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;

        savePDFToArchive("Upsell Scripts", clientName, `upsell-${Date.now()}`, dataUrl, {
            fileName,
            path: "Upsell Scripts/"
        });

        toast({ title: "Exported", description: "Script saved to File Manager" });
    };

    const handleEdit = (item: ClientUpsell) => {
        setEditingId(item.id);
        setSelectedClient(item.client_id);
        setVehicleType(item.vehicle_type || "Mid-Size/SUV");
        setCondition(item.condition || 3);
        setComplaints(item.complaints);
        setCustomComplaint(item.custom_complaint || "");
        setGoals(item.goals);
        setCustomGoal(item.custom_goal || "");
        setSelectedUpsells(item.selected_upsells);
        setScript(item.script);
        setAdditionalNotes(item.additional_notes || "");
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this upsell record?")) return;
        await deleteClientUpsell(id);
        toast({ title: "Deleted", description: "Upsell record removed" });
        loadHistory();
    };

    const handleReset = () => {
        setEditingId(null);
        setSelectedClient("");
        setVehicleType("Mid-Size/SUV");
        setCondition(3);
        setComplaints([]);
        setCustomComplaint("");
        setGoals([]);
        setCustomGoal("");
        setAdditionalNotes("");
        setRecommendedUpsells([]);
        setSelectedUpsells([]);
        setScript("");
    };

    const selectedClientData = customers.find(c => c.id === selectedClient);

    return (
        <div>
            <PageHeader title="Addon Upsell Script" />
            <div className="p-4 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Client Selection */}
                        <Card className="p-6 bg-zinc-900 border-zinc-800">
                            <div className="flex items-center gap-3 mb-4">
                                <User className="w-6 h-6 text-cyan-500" />
                                <h2 className="text-xl font-bold text-white">Select Client (Optional)</h2>
                            </div>

                            <div className="mb-3 p-3 bg-blue-900/20 border border-blue-700 rounded text-sm text-blue-200">
                                💡 You can create a generic script without selecting a client, or choose a specific client to save the script.
                            </div>

                            <Select value={selectedClient || "none"} onValueChange={(val) => setSelectedClient(val === "none" ? "" : val)}>
                                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                    <SelectValue placeholder="Choose a client or leave blank for generic..." />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-800 border-zinc-700">
                                    <SelectItem value="none" className="text-white font-semibold">🔓 No Customer / Generic Mode</SelectItem>
                                    {customers.map(c => (
                                        <SelectItem key={c.id} value={c.id} className="text-white">
                                            {c.name} {c.email && `(${c.email})`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {selectedClientData && (
                                <div className="mt-4 p-3 bg-zinc-800 rounded border border-zinc-700">
                                    <div className="text-sm text-zinc-400">Selected Client</div>
                                    <div className="text-white font-semibold">{selectedClientData.name}</div>
                                    {selectedClientData.email && <div className="text-sm text-zinc-400">{selectedClientData.email}</div>}
                                    {selectedClientData.phone && <div className="text-sm text-zinc-400">{selectedClientData.phone}</div>}
                                </div>
                            )}

                            {!selectedClient && (
                                <div className="mt-4 p-3 bg-zinc-800 rounded border border-zinc-700">
                                    <div className="text-sm text-zinc-400">Mode</div>
                                    <div className="text-white font-semibold">Generic Script</div>
                                    <div className="text-xs text-zinc-500 mt-1">Script will use placeholder "[Customer Name]"</div>
                                </div>
                            )}
                        </Card>

                        {/* Vehicle Info */}
                        <Card className="p-6 bg-zinc-900 border-zinc-800">
                            <h3 className="text-lg font-bold text-white mb-4">Vehicle Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-zinc-400">Vehicle Type</Label>
                                    <Select value={vehicleType} onValueChange={setVehicleType}>
                                        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-800 border-zinc-700">
                                            <SelectItem value="Compact" className="text-white">Compact</SelectItem>
                                            <SelectItem value="Mid-Size/SUV" className="text-white">Mid-Size/SUV</SelectItem>
                                            <SelectItem value="Truck" className="text-white">Truck</SelectItem>
                                            <SelectItem value="Luxury" className="text-white">Luxury</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-zinc-400">Condition (1-5)</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="5"
                                        value={condition}
                                        onChange={(e) => setCondition(Number(e.target.value))}
                                        className="bg-zinc-800 border-zinc-700 text-white"
                                    />
                                </div>
                            </div>
                        </Card>

                        {/* Complaints */}
                        <Card className="p-6 bg-zinc-900 border-zinc-800">
                            <h3 className="text-lg font-bold text-white mb-4">Customer Complaints</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {COMPLAINT_OPTIONS.map(complaint => (
                                    <div key={complaint} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`complaint-${complaint}`}
                                            checked={complaints.includes(complaint)}
                                            onCheckedChange={() => handleComplaintToggle(complaint)}
                                            className="border-zinc-700"
                                        />
                                        <label
                                            htmlFor={`complaint-${complaint}`}
                                            className="text-sm text-white cursor-pointer"
                                        >
                                            {complaint}
                                        </label>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4">
                                <Label className="text-zinc-400">Custom Complaint</Label>
                                <Input
                                    placeholder="Any other issues..."
                                    value={customComplaint}
                                    onChange={(e) => setCustomComplaint(e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 text-white"
                                />
                            </div>
                        </Card>

                        {/* Goals */}
                        <Card className="p-6 bg-zinc-900 border-zinc-800">
                            <h3 className="text-lg font-bold text-white mb-4">Customer Goals</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {GOAL_OPTIONS.map(goal => (
                                    <div key={goal} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`goal-${goal}`}
                                            checked={goals.includes(goal)}
                                            onCheckedChange={() => handleGoalToggle(goal)}
                                            className="border-zinc-700"
                                        />
                                        <label
                                            htmlFor={`goal-${goal}`}
                                            className="text-sm text-white cursor-pointer"
                                        >
                                            {goal}
                                        </label>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4">
                                <Label className="text-zinc-400">Custom Goal</Label>
                                <Input
                                    placeholder="Any other priorities..."
                                    value={customGoal}
                                    onChange={(e) => setCustomGoal(e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 text-white"
                                />
                            </div>
                        </Card>

                        {/* Recommended Upsells */}
                        {recommendedUpsells.length > 0 && (
                            <Card className="p-6 bg-zinc-900 border-zinc-800">
                                <h3 className="text-lg font-bold text-white mb-4">Recommended Upsells</h3>
                                <div className="space-y-3">
                                    {UPSELL_SERVICES.filter(s => recommendedUpsells.includes(s.id)).map(service => (
                                        <div key={service.id} className="flex items-start space-x-3 p-3 bg-zinc-800 rounded border border-zinc-700">
                                            <Checkbox
                                                id={`upsell-${service.id}`}
                                                checked={selectedUpsells.includes(service.id)}
                                                onCheckedChange={() => handleUpsellToggle(service.id)}
                                                className="border-zinc-700 mt-1"
                                            />
                                            <div className="flex-1">
                                                <label
                                                    htmlFor={`upsell-${service.id}`}
                                                    className="text-white font-semibold cursor-pointer"
                                                >
                                                    {service.name} - ${service.price}
                                                </label>
                                                <div className="text-sm text-zinc-400">{service.description}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {selectedUpsells.length > 0 && (
                                    <div className="mt-4 p-3 bg-cyan-900/20 border border-cyan-700 rounded">
                                        <div className="text-cyan-200 font-semibold">
                                            Total: ${UPSELL_SERVICES.filter(s => selectedUpsells.includes(s.id)).reduce((sum, s) => sum + s.price, 0)}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        )}

                        {/* Additional Notes */}
                        <Card className="p-6 bg-zinc-900 border-zinc-800">
                            <h3 className="text-lg font-bold text-white mb-4">Additional Notes</h3>
                            <Textarea
                                placeholder="Any extra preferences or constraints..."
                                value={additionalNotes}
                                onChange={(e) => setAdditionalNotes(e.target.value)}
                                className="bg-zinc-800 border-zinc-700 text-white min-h-[80px]"
                            />
                        </Card>

                        {/* Script */}
                        {script && (
                            <Card className="p-6 bg-zinc-900 border-zinc-800">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-6 h-6 text-purple-500" />
                                        <h3 className="text-lg font-bold text-white">Sales Script</h3>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button onClick={handleExportPDF} className="bg-purple-600 hover:bg-purple-700 text-white">
                                            Print Script
                                        </Button>
                                        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            Save Script
                                        </Button>
                                    </div>
                                </div>
                                <Textarea
                                    value={script}
                                    onChange={(e) => setScript(e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 text-white min-h-[300px] font-mono text-sm"
                                />
                                <div className="mt-2 text-xs text-zinc-500">
                                    Script is editable. Make any changes before saving or printing.
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* History Sidebar */}
                    <div className="lg:col-span-1">
                        {history.length > 0 && (
                            <Card className="p-6 bg-zinc-900 border-zinc-800 sticky top-4">
                                <div className="flex items-center gap-3 mb-4">
                                    <HistoryIcon className="w-6 h-6 text-orange-500" />
                                    <h3 className="text-lg font-bold text-white">{selectedClient && selectedClient !== 'none' ? 'Client History' : 'Generic Scripts'}</h3>
                                    <span className="text-sm text-zinc-500">({history.length})</span>
                                </div>
                                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                    {history.map(item => (
                                        <div key={item.id} className="p-3 bg-zinc-800 rounded border border-zinc-700">
                                            <div className="text-sm text-zinc-400">
                                                {new Date(item.date_created).toLocaleDateString()}
                                            </div>
                                            <div className="text-white font-medium">{item.vehicle_type}</div>
                                            <div className="text-xs text-zinc-500 mt-1">
                                                {item.selected_upsells.length} services • ${UPSELL_SERVICES.filter(s => item.selected_upsells.includes(s.id)).reduce((sum, s) => sum + s.price, 0)}
                                            </div>
                                            <div className="flex gap-2 mt-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleEdit(item)}
                                                    className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                                                >
                                                    <Edit className="w-3 h-3 mr-1" />
                                                    Edit
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDelete(item.id)}
                                                    className="border-red-700 text-red-500 hover:bg-red-900/20"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
