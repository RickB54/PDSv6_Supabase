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
} from "lucide-react";
import { servicePackages, addOns, type VehicleType } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { VehicleClassificationDialog } from "@/components/vehicles/VehicleClassificationDialog";
import { upsertSupabaseCustomer } from "@/lib/supa-data";

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
    scenarios: Scenario[];
    selectedScenarioId: string | null;
}

// Mapping Marketing Names to actual Package IDs
const BRANDED_PACKAGES = [
    {
        id: "prime-essential-interior",
        name: "Prime Essential Interior",
        actualId: "prime-essential-interior",
        description: "Interior Refresh (1.5 – 3 hours)",
        script: "Our Prime Essential Interior is designed for a fast, high-quality refresh. It's perfect for vehicles that aren't heavily soiled but need a professional tidy-up with a deep vacuum and complete surface wipe-down."
    },
    {
        id: "prime-essential-exterior",
        name: "Prime Essential Exterior",
        actualId: "prime-essential-exterior",
        description: "Exterior Foam Wash (45 – 90 mins)",
        script: "The Essential Exterior is our safest maintenance wash. We use a foam pre-soak, two-bucket hand wash, and apply a premium sealant to enhance shine and protect the paint from the elements."
    },
    {
        id: "prime-essential-full",
        name: "Prime Essential Full",
        actualId: "prime-essential-full",
        description: "Full Maintenance Detail (2.5 – 4 hours)",
        script: "The Essential Full Detail is our most popular maintenance-level package. It's perfect for vehicles that are in relatively good condition but need that professional deep-clean feel, both inside and out."
    },
    {
        id: "prime-elite-interior",
        name: "Prime Elite Interior",
        actualId: "prime-elite-interior",
        description: "Interior Restoration (3.5 – 5 hours)",
        script: "Our Prime Elite Interior is built for restoration. If the interior hasn't been deep-cleaned in a while, we use steam cleaning and full extraction to lift deep-seated dirt from carpets and seats, bringing it back to a showroom finish."
    },
    {
        id: "prime-elite-exterior",
        name: "Prime Elite Exterior",
        actualId: "prime-elite-exterior",
        description: "Decon & Protection (2.5 – 4 hours)",
        script: "The Elite Exterior is where we focus on paint decontamination and deep protection. We use a clay bar to remove embedded grit and apply a ceramic-based sealant for a mirrored gloss and months of durable protection."
    },
    {
        id: "prime-elite-full",
        name: "Prime Elite Full",
        actualId: "prime-elite-full",
        description: "The Ultimate Experience (4.5 – 6 hours)",
        script: "The Prime Elite Full is our flagship showroom package. It's the ultimate combination of deep interior restoration and high-level exterior protection. We detail every inch to ensure the vehicle is returned in the best possible condition."
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
            <DialogContent className="max-w-4xl w-[98vw] sm:w-full h-[95vh] sm:h-[90vh] overflow-hidden flex flex-col p-0 bg-background border-border shadow-2xl rounded-2xl">
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
                    <Accordion type="single" collapsible defaultValue="caller-info" className="w-full">
                        {/* SECTION 0: CALLER IDENTITY */}
                        <AccordionItem value="caller-info" className="border-b border-border bg-zinc-900/40">
                            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30">
                                <div className="flex items-center gap-3 w-full">
                                    <div className="bg-primary/10 text-primary w-7 h-7 rounded-full flex items-center justify-center text-xs font-black">
                                        <User className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-black uppercase tracking-tight text-foreground">
                                            1. Caller Identity
                                        </div>
                                        {callerName && (
                                            <div className="text-[10px] font-bold text-primary uppercase">
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

                        {/* SECTION 1: PRE-QUALIFICATION */}
                        <AccordionItem value="pre-qual" className="border-b border-border">
                            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30">
                                <div className="flex items-center gap-3">
                                    <span className="bg-primary/10 text-primary w-7 h-7 rounded-full flex items-center justify-center text-xs font-black">2</span>
                                    <div className="text-left">
                                        <div className="text-sm font-black uppercase tracking-tight text-foreground">Vehicle Context</div>
                                        {activeVehicle.make && <div className="text-[10px] font-bold text-primary uppercase">{activeVehicle.year} {activeVehicle.make} {activeVehicle.model}</div>}
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-5 pb-6 pt-0">
                                {/* Vehicle Browser Taps */}
                                {vehicles.length > 1 && (
                                    <div className="flex flex-wrap gap-2 mb-4 border-b border-zinc-800 pb-2">
                                        {vehicles.map((v, idx) => (
                                            <button
                                                key={v.id}
                                                onClick={() => setActiveVehicleId(v.id)}
                                                className={`px-3 py-1.5 text-[10px] font-black uppercase border rounded transition-all flex items-center gap-2
                                                    ${activeVehicleId === v.id ? "bg-primary/10 text-primary border-primary" : "text-muted-foreground border-zinc-800 hover:bg-muted/50"}
                                                `}
                                            >
                                                <Car className="w-3.5 h-3.5" />
                                                {v.make || `V${idx + 1}`}
                                                <Trash2 className="w-3 h-3 ml-1 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); removeVehicle(v.id); }} />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="space-y-5">
                                    <div className="p-3 bg-primary/5 border-l-4 border-primary rounded-r-lg italic text-xs sm:text-sm text-foreground">
                                        "To give you an accurate price, tell me about your {activeVehicle.make || 'vehicle'}..."
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Year / Make / Model</Label>
                                            <div className="flex gap-2">
                                                <Input placeholder="Year" value={activeVehicle.year} onChange={(e) => updateVehicle(activeVehicleId, { year: e.target.value })} className="w-20" />
                                                <Input placeholder="Make" value={activeVehicle.make} onChange={(e) => updateVehicle(activeVehicleId, { make: e.target.value })} className="flex-1" />
                                            </div>
                                            <Input placeholder="Model" value={activeVehicle.model} onChange={(e) => updateVehicle(activeVehicleId, { model: e.target.value })} />
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Vehicle Size</Label>
                                                <button onClick={() => setShowAutoClassify(true)} className="text-[9px] font-black uppercase text-primary hover:underline">Auto Classify</button>
                                            </div>
                                            <Select value={activeVehicle.type} onValueChange={(v) => updateVehicle(activeVehicleId, { type: v as VehicleType })}>
                                                <SelectTrigger className="w-full h-10"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="compact">Sedan / Compact</SelectItem>
                                                    <SelectItem value="midsize">Mid-Size / SUV</SelectItem>
                                                    <SelectItem value="truck">Truck / Large SUV</SelectItem>
                                                    <SelectItem value="luxury">Luxury / Oversized</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Overall Condition</Label>
                                            <div className="flex gap-1">
                                                {["light", "moderate", "heavy"].map((c) => (
                                                    <Button
                                                        key={c}
                                                        variant={activeVehicle.condition === c ? "default" : "outline"}
                                                        onClick={() => updateVehicle(activeVehicleId, { condition: c as any })}
                                                        className="flex-1 capitalize text-[10px] font-bold h-10 px-0"
                                                    >
                                                        {c}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-2 block">Client Needs</Label>
                                            <div className="grid grid-cols-2 gap-3 bg-zinc-950/30 p-3 rounded-lg border border-zinc-800">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="int"
                                                        checked={activeVehicle.needs.interior}
                                                        onCheckedChange={(c) => {
                                                            const isChecked = !!c;
                                                            updateVehicle(activeVehicleId, {
                                                                needs: {
                                                                    ...activeVehicle.needs,
                                                                    interior: isChecked,
                                                                    both: false // Choosing specific clears 'both'
                                                                }
                                                            });
                                                        }}
                                                    />
                                                    <Label htmlFor="int" className="text-xs font-bold cursor-pointer">Interior Detail</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="ext"
                                                        checked={activeVehicle.needs.exterior}
                                                        onCheckedChange={(c) => {
                                                            const isChecked = !!c;
                                                            updateVehicle(activeVehicleId, {
                                                                needs: {
                                                                    ...activeVehicle.needs,
                                                                    exterior: isChecked,
                                                                    both: false // Choosing specific clears 'both'
                                                                }
                                                            });
                                                        }}
                                                    />
                                                    <Label htmlFor="ext" className="text-xs font-bold cursor-pointer">Exterior Detail</Label>
                                                </div>
                                                <div className="flex items-center space-x-2 col-span-2 pt-1 border-t border-zinc-800">
                                                    <Checkbox
                                                        id="both"
                                                        checked={activeVehicle.needs.both}
                                                        onCheckedChange={(c) => {
                                                            const isChecked = !!c;
                                                            updateVehicle(activeVehicleId, {
                                                                needs: {
                                                                    ...activeVehicle.needs,
                                                                    both: isChecked,
                                                                    // Choosing 'both' clears specific ones
                                                                    interior: isChecked ? false : activeVehicle.needs.interior,
                                                                    exterior: isChecked ? false : activeVehicle.needs.exterior
                                                                }
                                                            });
                                                        }}
                                                    />
                                                    <Label htmlFor="both" className="text-xs font-black cursor-pointer text-emerald-400">Total Full Detail</Label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-1">Notes / Specifics</Label>
                                            <Textarea
                                                placeholder="Pet hair, smoke, stains, child car seats..."
                                                className="min-h-[80px] bg-muted/20 border-zinc-800 text-sm"
                                                value={activeVehicle.notes}
                                                onChange={(e) => updateVehicle(activeVehicleId, { notes: e.target.value })}
                                            />
                                        </div>
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
                                                    {scenario.packageId && (
                                                        <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-xl relative overflow-hidden group">
                                                            <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                                                                    <FileText className="w-3.5 h-3.5" />
                                                                </div>
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-primary/80">Active Pitch Script</span>
                                                            </div>
                                                            <p className="text-xs sm:text-sm text-foreground leading-relaxed italic">
                                                                "{BRANDED_PACKAGES.find(p => p.id === scenario.packageId)?.script}"
                                                            </p>
                                                        </div>
                                                    )}
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

                <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between shrink-0">
                    <div className="hidden sm:flex gap-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <div className="flex items-center gap-1.5"><CheckCircle2 className={`w-3.5 h-3.5 ${callerName ? 'text-primary' : 'text-zinc-700'}`} /> Identity</div>
                        <div className="flex items-center gap-1.5"><CheckCircle2 className={`w-3.5 h-3.5 ${activeVehicle.make ? 'text-primary' : 'text-zinc-700'}`} /> Vehicle</div>
                        <div className="flex items-center gap-1.5"><CheckCircle2 className={`w-3.5 h-3.5 ${activeVehicle.selectedScenarioId ? 'text-primary' : 'text-zinc-700'}`} /> Selection</div>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
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
                            className="h-10 sm:h-12 font-black uppercase tracking-widest text-[10px] sm:px-4"
                        >
                            Do Not Record
                        </Button>

                        <Button
                            onClick={handleHandoff}
                            disabled={!activeVehicle.selectedScenarioId}
                            className={`flex-1 sm:min-w-[150px] h-10 sm:h-12 font-black uppercase tracking-widest text-[11px] transition-all
                                ${activeVehicle.selectedScenarioId ? 'bg-gradient-hero hover:shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'bg-muted opacity-50'}
                            `}
                        >
                            Confirm & Eval <ArrowRight className="ml-2 w-4 h-4" />
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
        </Dialog>
    );
}
