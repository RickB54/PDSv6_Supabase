import { useState, useMemo, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogClose,
} from "@/components/ui/dialog";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Phone,
    Plus,
    Trash2,
    Calculator,
    ArrowRight,
    HelpCircle,
    CheckCircle2,
    LayoutDashboard,
    Car,
    X,
    User,
    FileText,
    Info,
} from "lucide-react";
import { servicePackages, addOns, type VehicleType } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { VehicleClassificationDialog } from "@/components/vehicles/VehicleClassificationDialog";
import { upsertSupabaseCustomer } from "@/lib/supa-data";
import { ServiceComparisonModal } from "@/components/ServiceComparisonModal";

interface Scenario {
    id: string;
    label: string;
    packageId: string;
    addOnIds: string[];
}

interface Vehicle {
    id: string;
    year: string;
    make: string;
    model: string;
    type: VehicleType;
    condition: "light" | "moderate" | "heavy";
    dailyDriver: boolean;
    needs: {
        interior: boolean;
        exterior: boolean;
        both: boolean;
    };
    notes: string;
    garaged: string;
    mileage: string;
    reasonForDetail: string;
    detailHistory: string;
    interiorCondition: string;
    seatMaterial: string;
    paintCondition: string;
    mainGoal: string;
    scenarios: Scenario[];
    selectedScenarioId: string | null;
}

// Mapping Marketing Names to actual Package IDs and sync with services.ts
const BRANDED_PACKAGES = [
    {
        id: "prime-essential-interior",
        name: "Prime Essential Interior",
        actualId: "prime-essential-interior",
        description: "Standard Interior Refresh",
        includes: servicePackages.find(p => p.id === "prime-essential-interior")?.steps.map(s => s.name) || [],
        script: "Our Prime Essential Interior is perfect for a professional refresh. We perform a thorough vacuuming and a detailed wipe-down of all surfaces to bring back that clean, tidy feel."
    },
    {
        id: "prime-essential-exterior",
        name: "Prime Essential Exterior",
        actualId: "prime-essential-exterior",
        description: "Hand Wash & Protection",
        includes: servicePackages.find(p => p.id === "prime-essential-exterior")?.steps.map(s => s.name) || [],
        script: "The Prime Essential Exterior focuses on a safe, high-quality wash. We use a foam bath and two-bucket hand wash, finishing with a premium spray wax for shine and protection."
    },
    {
        id: "prime-essential-full",
        name: "Prime Essential Full",
        actualId: "prime-essential-full",
        description: "Complete Maintenance Detail",
        includes: servicePackages.find(p => p.id === "prime-essential-full")?.steps.map(s => s.name) || [],
        script: "Our Prime Essential Full Detail is the best of both worlds—it combines our Essential Interior and Exterior services for a complete, professional refresh of your entire vehicle."
    },
    {
        id: "prime-elite-interior",
        name: "Prime Elite Interior",
        actualId: "prime-elite-interior",
        description: "Deep Interior Restoration",
        includes: servicePackages.find(p => p.id === "prime-elite-interior")?.steps.map(s => s.name) || [],
        script: "The Prime Elite Interior is our deep-clean restoration. We use steam cleaning and extraction on carpets and seats to remove deep stains and odors, finishing with leather conditioning."
    },
    {
        id: "prime-elite-exterior",
        name: "Prime Elite Exterior",
        actualId: "prime-elite-exterior",
        description: "Advanced Paint Protection",
        includes: servicePackages.find(p => p.id === "prime-elite-exterior")?.steps.map(s => s.name) || [],
        script: "Our Prime Elite Exterior is designed for ultimate protection. We include clay bar decontamination to smooth the paint and apply a premium sealant for long-lasting gloss and UV protection."
    },
    {
        id: "prime-elite-full",
        name: "Prime Elite Full",
        actualId: "prime-elite-full",
        description: "The Ultimate Restoration",
        includes: servicePackages.find(p => p.id === "prime-elite-full")?.steps.map(s => s.name) || [],
        script: "The Prime Elite Full Detail is our flagship showroom package. It combines our deepest interior restoration with our most advanced exterior protection for the ultimate results."
    },
];

export function CallAssistantModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
    const { toast } = useToast();
    const navigate = useNavigate();

    // Call state
    const [vehicles, setVehicles] = useState<Vehicle[]>([createEmptyVehicle()]);
    const [activeVehicleId, setActiveVehicleId] = useState<string>(vehicles[0].id);
    const [showAutoClassify, setShowAutoClassify] = useState(false);

    // Caller Identity State
    const [callerName, setCallerName] = useState("");
    const [callerPhone, setCallerPhone] = useState("");
    const [callerEmail, setCallerEmail] = useState("");

    const [serviceComparisonOpen, setServiceComparisonOpen] = useState(false);

    function createEmptyVehicle(): Vehicle {
        const vid = Date.now().toString();
        return {
            id: vid,
            year: "",
            make: "",
            model: "",
            type: "midsize",
            condition: "moderate",
            dailyDriver: true,
            needs: { interior: false, exterior: false, both: true },
            notes: "",
            garaged: "",
            mileage: "",
            reasonForDetail: "",
            detailHistory: "",
            interiorCondition: "normal",
            seatMaterial: "leather",
            paintCondition: "good",
            mainGoal: "full",
            scenarios: [
                { id: `s1-${vid}`, label: "Scenario A", packageId: "prime-essential-full", addOnIds: [] },
                { id: `s2-${vid}`, label: "Scenario B", packageId: "prime-elite-full", addOnIds: [] },
                { id: `s3-${vid}`, label: "Scenario C Undecided", packageId: "prime-essential-full", addOnIds: [] }
            ],
            selectedScenarioId: null
        };
    }

    const addVehicle = () => {
        const v = createEmptyVehicle();
        setVehicles([...vehicles, v]);
        setActiveVehicleId(v.id);
        toast({ title: "Vehicle Added", description: "New vehicle context created for this call." });
    };

    const removeVehicle = (id: string) => {
        if (vehicles.length === 1) return;
        const filtered = vehicles.filter(v => v.id !== id);
        setVehicles(filtered);
        if (activeVehicleId === id) setActiveVehicleId(filtered[0].id);
    };

    const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
        setVehicles(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
    };

    const updateScenario = (vid: string, sid: string, updates: Partial<Scenario>) => {
        setVehicles(prev => prev.map(v => {
            if (v.id !== vid) return v;
            return {
                ...v,
                scenarios: v.scenarios.map(s => s.id === sid ? { ...s, ...updates } : s)
            };
        }));
    };

    const addScenario = (vid: string) => {
        setVehicles(prev => prev.map(v => {
            if (v.id !== vid) return v;
            const newSid = `s${v.scenarios.length + 1}-${vid}`;
            return {
                ...v,
                scenarios: [...v.scenarios, { id: newSid, label: `Scenario ${String.fromCharCode(65 + v.scenarios.length)}`, packageId: "prime-essential-full", addOnIds: [] }]
            };
        }));
    };

    const calculateTotal = (pkgBrandedId: string, addOnIds: string[], vehicleType: VehicleType) => {
        const pkg = BRANDED_PACKAGES.find(p => p.id === pkgBrandedId);
        const actualPkgId = pkg?.actualId || "full-detail";
        const pkgObj = servicePackages.find(p => p.id === actualPkgId);
        const pkgPrice = pkgObj?.pricing[vehicleType] || 0;

        const addonsPrice = addOnIds.reduce((sum, aid) => {
            const ao = addOns.find(a => a.id === aid);
            return sum + (ao?.pricing[vehicleType] || 0);
        }, 0);

        return pkgPrice + addonsPrice;
    };

    const activeVehicle = vehicles.find(v => v.id === activeVehicleId)!;

    const handleHandoff = () => {
        // Prepare data for Evaluation
        const data = vehicles.map(v => {
            const scenario = v.scenarios.find(s => s.id === v.selectedScenarioId);
            return {
                vehicle: v,
                scenario: scenario
            };
        });

        // 1. Determine Type based on Scenario label
        const firstVehicle = vehicles[0];
        const selectedScenario = firstVehicle.scenarios.find(s => s.id === firstVehicle.selectedScenarioId);
        const isUndecided = selectedScenario?.label.includes("Scenario C");
        const accountType = isUndecided ? 'prospect' : 'customer';

        // 2. Persist to Database if Caller Name is provided
        if (callerName) {
            try {
                const customerData = {
                    name: callerName || "Unknown Caller",
                    phone: callerPhone,
                    email: callerEmail,
                    type: accountType,
                    notes: `Added via Phone Assistant. ${firstVehicle.notes}`,
                    vehicle_info: {
                        make: firstVehicle.make,
                        model: firstVehicle.model,
                        year: firstVehicle.year,
                        type: firstVehicle.type
                    }
                };

                upsertSupabaseCustomer(customerData).then(() => {
                    toast({
                        title: accountType === 'customer' ? "Customer Created" : "Prospect Created",
                        description: `${callerName} recorded. View in ${accountType === 'customer' ? 'Customers' : 'Prospects'}.`,
                    });
                });
            } catch (err) {
                console.error("Failed to persist caller info:", err);
            }
        }

        // Store in localStorage for the Eval page to pick up if it wants
        localStorage.setItem("call_assistant_handoff", JSON.stringify(data));

        onOpenChange(false);
        navigate("/client-evaluation");
        toast({ title: "Handoff Successful", description: "Call data passed to Client Evaluation." });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl w-[98vw] sm:w-full h-[98vh] sm:h-[90vh] overflow-hidden flex flex-col p-0 bg-background border-border shadow-2xl rounded-2xl">
                <div className="p-3 sm:p-4 bg-primary/10 border-b border-primary/20 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <Phone className="w-5 h-5 text-primary animate-pulse shrink-0" />
                        <div>
                            <DialogTitle className="text-base sm:text-xl font-black uppercase tracking-tighter leading-none">
                                Call Assistant
                            </DialogTitle>
                            <DialogDescription className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                                Live Pricing Scenarios
                            </DialogDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={addVehicle} className="font-bold border-primary/50 text-primary h-8 px-2">
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Vehicle
                        </Button>
                        <DialogClose asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/20">
                                <X className="w-5 h-5" />
                            </Button>
                        </DialogClose>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-0 custom-scrollbar bg-zinc-950/20">
                    <Accordion type="single" collapsible defaultValue="pre-qual" className="w-full">
                        {/* SECTION 1: VEHICLE CONTEXT & EVALUATION */}
                        <AccordionItem value="pre-qual" className="border-b border-border bg-blue-950/10">
                            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-blue-900/10 transition-colors">
                                <div className="flex items-center gap-3 w-full text-left">
                                    <div className="bg-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                                        1
                                    </div>
                                    <div>
                                        <div className="text-sm font-black uppercase tracking-tight text-white">
                                            Vehicle Context & Evaluation
                                        </div>
                                        <div className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">
                                            Capture details for accurate pricing
                                        </div>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-5 pb-6 pt-2">
                                <div className="space-y-6">
                                    {/* Evaluation Guide Logic moved here */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-900/40 p-4 rounded-xl border border-blue-500/10">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-blue-300 flex items-center gap-2">
                                                <Car className="w-3 h-3" /> Vehicle Class
                                            </Label>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                {[
                                                    { id: 'compact', label: 'Compact (Sedan)' },
                                                    { id: 'midsize', label: 'Midsize (SUV)' },
                                                    { id: 'truck', label: 'Truck (Lrg SUV)' },
                                                    { id: 'luxury', label: 'Luxury (XL)' }
                                                ].map((t) => (
                                                    <Button
                                                        key={t.id}
                                                        variant={activeVehicle.type === t.id ? "default" : "outline"}
                                                        onClick={() => updateVehicle(activeVehicleId, { type: t.id as any })}
                                                        className={`h-9 text-[9px] font-black uppercase px-1 ${activeVehicle.type === t.id ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border-blue-400' : 'border-zinc-700 text-zinc-400'}`}
                                                    >
                                                        {t.label}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-blue-300 flex items-center gap-2">
                                                <Info className="w-3 h-3" /> Dirt Level
                                            </Label>
                                            <div className="flex gap-1">
                                                {[
                                                    { id: 'light', label: 'Light' },
                                                    { id: 'moderate', label: 'Mod' },
                                                    { id: 'heavy', label: 'Heavy' }
                                                ].map((c) => (
                                                    <Button
                                                        key={c.id}
                                                        variant={activeVehicle.condition === c.id ? "default" : "outline"}
                                                        onClick={() => updateVehicle(activeVehicleId, { condition: c.id as any })}
                                                        className={`flex-1 h-8 text-[9px] font-black uppercase ${activeVehicle.condition === c.id ? 'bg-blue-600 hover:bg-blue-500' : 'border-zinc-700'}`}
                                                    >
                                                        {c.label}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-blue-300 flex items-center gap-2">
                                                <User className="w-3 h-3" /> Usage
                                            </Label>
                                            <div className="flex gap-1">
                                                <Button 
                                                    variant={activeVehicle.dailyDriver ? "default" : "outline"}
                                                    className={`flex-1 h-8 text-[9px] font-black uppercase ${activeVehicle.dailyDriver ? 'bg-blue-600 hover:bg-blue-500' : 'border-zinc-700'}`}
                                                    onClick={() => updateVehicle(activeVehicleId, { dailyDriver: true })}
                                                >
                                                    Daily
                                                </Button>
                                                <Button 
                                                    variant={!activeVehicle.dailyDriver ? "default" : "outline"}
                                                    className={`flex-1 h-8 text-[9px] font-black uppercase ${!activeVehicle.dailyDriver ? 'bg-blue-600 hover:bg-blue-500' : 'border-zinc-700'}`}
                                                    onClick={() => updateVehicle(activeVehicleId, { dailyDriver: false })}
                                                >
                                                    Weekend
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Year/Make/Model Section */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1">Year / Make / Model</Label>
                                            <div className="flex gap-2">
                                                <Input placeholder="Year" value={activeVehicle.year} onChange={(e) => updateVehicle(activeVehicleId, { year: e.target.value })} className="w-20 bg-zinc-950 border-zinc-800 text-xs font-bold" />
                                                <Input placeholder="Make" value={activeVehicle.make} onChange={(e) => updateVehicle(activeVehicleId, { make: e.target.value })} className="flex-1 bg-zinc-950 border-zinc-800 text-xs font-bold" />
                                                <Input placeholder="Model" value={activeVehicle.model} onChange={(e) => updateVehicle(activeVehicleId, { model: e.target.value })} className="flex-1 bg-zinc-950 border-zinc-800 text-xs font-bold" />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1">Reason for Detail</Label>
                                            <Select value={activeVehicle.reasonForDetail} onValueChange={(v) => updateVehicle(activeVehicleId, { reasonForDetail: v })}>
                                                <SelectTrigger className="h-9 bg-zinc-950 border-zinc-800 text-[10px] font-bold">
                                                    <SelectValue placeholder="MOTIVATION" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="maintenance">Maintenance</SelectItem>
                                                    <SelectItem value="selling">Selling</SelectItem>
                                                    <SelectItem value="purchase">Just Purchased</SelectItem>
                                                    <SelectItem value="protection">Protection</SelectItem>
                                                    <SelectItem value="restoration">Restoration</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* INTERIOR & PAINT */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase text-white">Interior Condition & Material</Label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {[
                                                    { id: 'normal', label: 'Normal' },
                                                    { id: 'pethair', label: 'Pet Hair' },
                                                    { id: 'stains', label: 'Stains/Odors' },
                                                    { id: 'kids', label: 'Child Seats' },
                                                    { id: 'neglected', label: 'Very Dirty' }
                                                ].map((i) => (
                                                    <Button
                                                        key={i.id}
                                                        variant={activeVehicle.interiorCondition === i.id ? "secondary" : "outline"}
                                                        onClick={() => updateVehicle(activeVehicleId, { interiorCondition: i.id })}
                                                        className={`h-7 text-[9px] font-bold uppercase px-2 ${activeVehicle.interiorCondition === i.id ? 'bg-blue-600/20 text-blue-300 border-blue-500/50' : 'border-zinc-700'}`}
                                                    >
                                                        {i.label}
                                                    </Button>
                                                ))}
                                            </div>
                                            <div className="flex gap-2 pt-1 border-t border-zinc-800">
                                                {[
                                                    { id: 'cloth', label: 'Cloth' },
                                                    { id: 'leather', label: 'Leather' },
                                                    { id: 'synthetic', label: 'Synthetic' }
                                                ].map((m) => (
                                                    <Button
                                                        key={m.id}
                                                        variant={activeVehicle.seatMaterial === m.id ? "secondary" : "ghost"}
                                                        onClick={() => updateVehicle(activeVehicleId, { seatMaterial: m.id })}
                                                        className={`flex-1 h-7 text-[9px] font-bold uppercase ${activeVehicle.seatMaterial === m.id ? 'bg-emerald-500/20 text-emerald-300' : 'text-muted-foreground'}`}
                                                    >
                                                        {m.label}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase text-white">Paint Condition & Goals</Label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {[
                                                    { id: 'good', label: 'Good' },
                                                    { id: 'swirls', label: 'Swirls/Scratches' },
                                                    { id: 'oxidized', label: 'Oxidized/Faded' }
                                                ].map((p) => (
                                                    <Button
                                                        key={p.id}
                                                        variant={activeVehicle.paintCondition === p.id ? "secondary" : "outline"}
                                                        onClick={() => updateVehicle(activeVehicleId, { paintCondition: p.id })}
                                                        className={`h-7 text-[9px] font-bold uppercase px-2 ${activeVehicle.paintCondition === p.id ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'border-zinc-700'}`}
                                                    >
                                                        {p.label}
                                                    </Button>
                                                ))}
                                            </div>
                                            <Select value={activeVehicle.mainGoal} onValueChange={(v) => updateVehicle(activeVehicleId, { mainGoal: v })}>
                                                <SelectTrigger className="h-8 bg-zinc-950 border-zinc-800 text-[10px] font-black uppercase">
                                                    <SelectValue placeholder="MAIN CUSTOMER GOAL" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="basic">Basic Clean</SelectItem>
                                                    <SelectItem value="interior">Deep Interior Clean</SelectItem>
                                                    <SelectItem value="exterior">Exterior Shine/Protection</SelectItem>
                                                    <SelectItem value="odor">Odor Removal</SelectItem>
                                                    <SelectItem value="full">Full Professional Detail</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* LOGISTICS */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[9px] font-black uppercase text-white/70">Storage</Label>
                                            <Select value={activeVehicle.garaged} onValueChange={(v) => updateVehicle(activeVehicleId, { garaged: v })}>
                                                <SelectTrigger className="h-9 bg-zinc-950 border-zinc-800 text-[10px] font-bold text-white">
                                                    <SelectValue placeholder="STORAGE" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="garaged">Always Garaged</SelectItem>
                                                    <SelectItem value="outdoors">Kept Outdoors</SelectItem>
                                                    <SelectItem value="partial">Mix of Both</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[9px] font-black uppercase text-white/70">Mileage</Label>
                                            <Input placeholder="e.g. 45k" value={activeVehicle.mileage} onChange={(e) => updateVehicle(activeVehicleId, { mileage: e.target.value })} className="h-9 bg-zinc-950 border-zinc-800 text-[10px] font-bold text-white placeholder:text-zinc-600" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[9px] font-black uppercase text-white/70">History</Label>
                                            <Select value={activeVehicle.detailHistory} onValueChange={(v) => updateVehicle(activeVehicleId, { detailHistory: v })}>
                                                <SelectTrigger className="h-9 bg-zinc-950 border-zinc-800 text-[10px] font-bold text-white">
                                                    <SelectValue placeholder="HISTORY" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="never">Never Detailed</SelectItem>
                                                    <SelectItem value="recent">Within 6 Mo</SelectItem>
                                                    <SelectItem value="year">~1 Year Ago</SelectItem>
                                                    <SelectItem value="multi-year">2+ Years Ago</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        {/* SECTION 2: CALLER IDENTITY */}
                        <AccordionItem value="caller-info" className="border-b border-border bg-zinc-900/40">
                            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30">
                                <div className="flex items-center gap-3 w-full text-left">
                                    <div className="bg-zinc-800 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ring-1 ring-zinc-700">
                                        2
                                    </div>
                                    <div>
                                        <div className="text-sm font-black uppercase tracking-tight text-white">
                                            Caller Identity
                                        </div>
                                        {callerName && (
                                            <div className="text-[10px] font-bold text-blue-400 uppercase">
                                                {callerName} {callerPhone ? `• ${callerPhone}` : ''}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-5 pb-5 pt-0">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Full Name</Label>
                                        <Input
                                            placeholder="Enter Client Name"
                                            value={callerName}
                                            onChange={(e) => setCallerName(e.target.value)}
                                            className="h-9 bg-background border-zinc-700 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Phone Number</Label>
                                        <Input
                                            placeholder="555-0199"
                                            value={callerPhone}
                                            onChange={(e) => setCallerPhone(e.target.value)}
                                            className="h-9 bg-background border-zinc-700 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Email Address</Label>
                                        <Input
                                            placeholder="customer@example.com"
                                            value={callerEmail}
                                            onChange={(e) => setCallerEmail(e.target.value)}
                                            className="h-9 bg-background border-zinc-700 font-bold"
                                        />
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        {/* SECTION 2: LIVE PRICING SCENARIOS */}
                        <AccordionItem value="live-pricing" className="border-b border-border">
                            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30">
                                <span className="text-sm font-black uppercase tracking-tight text-foreground flex items-center gap-3">
                                    <span className="bg-primary/10 text-primary w-7 h-7 rounded-full flex items-center justify-center text-xs font-black">3</span>
                                    Live Pricing Scenarios
                                </span>
                            </AccordionTrigger>
                            <AccordionContent className="px-5 pb-6 pt-2">
                                <div className="space-y-6">
                                    <div className="space-y-5">
                                        {activeVehicle.scenarios.map((scenario, sIdx) => {
                                            const total = calculateTotal(scenario.packageId, scenario.addOnIds, activeVehicle.type);

                                            return (
                                                <div key={scenario.id} className="p-4 border-2 border-zinc-800 rounded-xl bg-muted/10 hover:border-primary/30 transition-all">
                                                    <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
                                                        <div className="flex items-center gap-3 w-full">
                                                            <div className="p-1 px-2 bg-primary/20 rounded text-[10px] font-bold text-primary shrink-0">
                                                                {String.fromCharCode(65 + sIdx)}
                                                            </div>
                                                            <Input
                                                                value={scenario.label}
                                                                onChange={(e) => updateScenario(activeVehicleId, scenario.id, { label: e.target.value })}
                                                                className="h-8 flex-1 bg-transparent border-none font-black uppercase tracking-widest text-xs p-0 focus-visible:ring-0 placeholder:text-zinc-700"
                                                                placeholder="Scenario Label..."
                                                            />
                                                            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter shrink-0">
                                                                {activeVehicle.type || 'select type'}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 shrink-0">
                                                            <div className="text-2xl sm:text-3xl font-black text-rose-500 font-mono tracking-tighter bg-rose-500/5 px-3 py-1 rounded-lg border border-rose-500/20">
                                                                ${total}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div>
                                                            <Label className="text-[10px] font-black uppercase text-muted-foreground mb-3 block tracking-widest">Select Package</Label>
                                                            <div className="grid grid-cols-1 gap-1.5">
                                                                {BRANDED_PACKAGES.map(pkg => (
                                                                    <div
                                                                        key={pkg.id}
                                                                        onClick={() => updateScenario(activeVehicleId, scenario.id, { packageId: pkg.id })}
                                                                        className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between
                                                                            ${scenario.packageId === pkg.id ? "border-primary bg-primary/10" : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/20"}
                                                                        `}
                                                                    >
                                                                        <div className="flex-1">
                                                                            <div className="text-xs font-black uppercase">{pkg.name}</div>
                                                                            <div className="text-[10px] text-muted-foreground leading-tight">{pkg.description}</div>
                                                                        </div>
                                                                        {scenario.packageId === pkg.id && <CheckCircle2 className="w-4 h-4 text-primary ml-2 shrink-0" />}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <Accordion type="single" collapsible className="w-full">
                                                                <AccordionItem value="addons" className="border-none">
                                                                    <AccordionTrigger className="p-0 hover:no-underline py-2">
                                                                        <Label className="text-[10px] font-black uppercase text-muted-foreground block tracking-widest cursor-pointer">Extra Add-Ons (Instant Math)</Label>
                                                                    </AccordionTrigger>
                                                                    <AccordionContent className="pt-2">
                                                                        <div className="space-y-0.5 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar border border-zinc-800/50 rounded-lg p-2 bg-black/20">
                                                                            {addOns.map(ao => (
                                                                                <div key={ao.id} className="flex items-center justify-between p-1.5 hover:bg-zinc-800/50 rounded transition-colors group">
                                                                                    <div className="flex items-center space-x-2">
                                                                                        <Checkbox
                                                                                            id={`${scenario.id}-${ao.id}`}
                                                                                            checked={scenario.addOnIds.includes(ao.id)}
                                                                                            onCheckedChange={(checked) => {
                                                                                                const next = checked
                                                                                                    ? [...scenario.addOnIds, ao.id]
                                                                                                    : scenario.addOnIds.filter(id => id !== ao.id);
                                                                                                updateScenario(activeVehicleId, scenario.id, { addOnIds: next });
                                                                                            }}
                                                                                        />
                                                                                        <Label htmlFor={`${scenario.id}-${ao.id}`} className="text-[11px] font-bold cursor-pointer group-hover:text-primary transition-colors">{ao.name}</Label>
                                                                                    </div>
                                                                                    <span className="text-[11px] font-black text-rose-400 tracking-tighter">${ao.pricing[activeVehicle.type]}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </AccordionContent>
                                                                </AccordionItem>
                                                            </Accordion>
                                                        </div>
                                                    </div>

                                                    {/* Talking Points / Script for selected package */}
                                                    {(() => {
                                                        const pkgInfo = BRANDED_PACKAGES.find(p => p.id === scenario.packageId);
                                                        if (!pkgInfo) return null;

                                                        return (
                                                            <div className="mt-6 space-y-4">
                                                                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl relative overflow-hidden group">
                                                                    <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                                                                            <FileText className="w-3.5 h-3.5" />
                                                                        </div>
                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/80">Active Pitch Script</span>
                                                                    </div>
                                                                    <p className="text-xs sm:text-sm text-foreground leading-relaxed italic">
                                                                        "{pkgInfo.script}"
                                                                    </p>
                                                                </div>

                                                                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                                                                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 block">What's Included:</div>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                                                                        {pkgInfo.includes.map((item, idx) => (
                                                                            <div key={idx} className="flex items-center gap-2 text-[11px] text-zinc-300">
                                                                                <div className="w-1 h-1 rounded-full bg-primary shrink-0" />
                                                                                <span className="truncate">{item}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            );
                                        })}

                                        <Button variant="outline" onClick={() => addScenario(activeVehicleId)} className="w-full border-dashed py-6 border-zinc-800 hover:border-primary/50 hover:bg-primary/5 group">
                                            <Plus className="w-4 h-4 mr-2" /> Add Comparison Scenario
                                        </Button>

                                        {/* Auto Comparison Tool */}
                                        {activeVehicle.scenarios.length >= 2 && (
                                            <div className="mt-8 p-6 bg-zinc-900 border border-emerald-500/30 rounded-2xl shadow-xl relative overflow-hidden">
                                                <Calculator className="absolute top-4 right-4 w-12 h-12 text-emerald-500/10" />
                                                <h4 className="text-emerald-500 font-black uppercase tracking-tighter text-base mb-4 flex items-center gap-2">
                                                    Comparison Summary
                                                </h4>

                                                <div className="grid grid-cols-2 gap-4">
                                                    {activeVehicle.scenarios.slice(0, 2).map((s, idx) => {
                                                        const total = calculateTotal(s.packageId, s.addOnIds, activeVehicle.type);
                                                        return (
                                                            <div key={s.id} className="p-3 rounded-lg bg-black/40 border border-zinc-800">
                                                                <div className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">{s.label}</div>
                                                                <div className="text-xl font-black text-white mt-1">${total}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {(() => {
                                                    const s1 = activeVehicle.scenarios[0];
                                                    const s2 = activeVehicle.scenarios[1];
                                                    const t1 = calculateTotal(s1.packageId, s1.addOnIds, activeVehicle.type);
                                                    const t2 = calculateTotal(s2.packageId, s2.addOnIds, activeVehicle.type);
                                                    const diff = Math.abs(t1 - t2);
                                                    const moreExp = t1 > t2 ? s1 : s2;
                                                    const cheaper = t1 > t2 ? s2 : s1;

                                                    return (
                                                        <div className="mt-4 pt-4 border-t border-zinc-800">
                                                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-100 font-black text-sm text-center">
                                                                "{moreExp.label} is only <span className="text-emerald-400 text-lg underline underline-offset-4 decoration-2">${diff}</span> more than {cheaper.label}"
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>

                <div className="p-4 border-t border-border bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                    <div className="hidden lg:flex gap-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <div className="flex items-center gap-1.5"><CheckCircle2 className={`w-3.5 h-3.5 ${callerName ? 'text-primary' : 'text-zinc-700'}`} /> Identity</div>
                        <div className="flex items-center gap-1.5"><CheckCircle2 className={`w-3.5 h-3.5 ${activeVehicle.make ? 'text-primary' : 'text-zinc-700'}`} /> Vehicle</div>
                        <div className="flex items-center gap-1.5"><CheckCircle2 className={`w-3.5 h-3.5 ${activeVehicle.selectedScenarioId ? 'text-primary' : 'text-zinc-700'}`} /> Selection</div>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
                        <Select value={activeVehicle.selectedScenarioId || ""} onValueChange={(s) => updateVehicle(activeVehicleId, { selectedScenarioId: s })}>
                            <SelectTrigger className="flex-1 sm:w-48 h-10 sm:h-12 bg-zinc-950 font-black uppercase text-[10px] tracking-widest border-zinc-800">
                                <SelectValue placeholder="CONFIRM SELECTION" />
                            </SelectTrigger>
                            <SelectContent>
                                {activeVehicle.scenarios.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.label} (${calculateTotal(s.packageId, s.addOnIds, activeVehicle.type)})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            variant="destructive"
                            onClick={() => onOpenChange(false)}
                            className="flex-1 sm:flex-none h-10 sm:h-12 font-black uppercase tracking-widest text-[10px] px-2 sm:px-4"
                        >
                            Cancel
                        </Button>

                        <Button
                            onClick={() => setServiceComparisonOpen(true)}
                            variant="outline"
                            className="h-10 sm:h-12 border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 font-black uppercase tracking-widest text-[10px] hidden sm:flex"
                        >
                            <Info className="w-4 h-4 mr-2" /> Show Services
                        </Button>

                        <Button
                            onClick={handleHandoff}
                            disabled={!activeVehicle.selectedScenarioId}
                            className={`flex-1 sm:flex-none sm:min-w-[150px] h-10 sm:h-12 font-black uppercase tracking-widest text-[11px] transition-all
                                ${activeVehicle.selectedScenarioId ? 'bg-gradient-hero hover:shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'bg-muted opacity-50'}
                            `}
                        >
                            Confirm Selection <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
            <VehicleClassificationDialog
                open={showAutoClassify}
                onOpenChange={setShowAutoClassify}
                onSelect={(type) => {
                    updateVehicle(activeVehicleId, { type: type as VehicleType });
                    toast({
                        title: "Size Classified",
                        description: `Vehicle set to ${type.toUpperCase()}`,
                    });
                }}
            />
            <ServiceComparisonModal open={serviceComparisonOpen} onOpenChange={setServiceComparisonOpen} />
        </Dialog>
    );
}
