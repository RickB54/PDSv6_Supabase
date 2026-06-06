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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import VehicleSelectorModal from "@/components/vehicles/VehicleSelectorModal";
import { upsertSupabaseCustomer, upsertSupabaseEstimate } from "@/lib/supa-data";
import { ServiceComparisonModal } from "@/components/ServiceComparisonModal";
import localforage from "localforage";
import { generateInvoiceNumber } from "@/lib/utils";
import * as supaPkgs from "@/services/supabase/packages";
import * as supaAddOns from "@/services/supabase/addOns";
import { isSupabaseEnabled, getCurrentUser } from "@/lib/auth";

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
    selectedServiceId: string | null;
}

// Mapping Marketing Names to actual Package IDs and sync with services.ts
const BRANDED_PACKAGES = [
    {
        id: "prime-essential-interior",
        name: "Prime Essential Interior",
        actualId: "prime-essential-interior",
        description: "Standard Interior Refresh",
        isLive: true,
        includes: servicePackages.find(p => p.id === "prime-essential-interior")?.steps.map(s => s.name) || [],
        script: "Our Prime Essential Interior is perfect for a professional refresh. We perform a thorough vacuuming and a detailed wipe-down of all surfaces to bring back that clean, tidy feel."
    },
    {
        id: "prime-essential-exterior",
        name: "Prime Essential Exterior",
        actualId: "prime-essential-exterior",
        description: "Hand Wash & Protection",
        isLive: true,
        includes: servicePackages.find(p => p.id === "prime-essential-exterior")?.steps.map(s => s.name) || [],
        script: "The Prime Essential Exterior focuses on a safe, high-quality wash. We use a foam bath and two-bucket hand wash, finishing with a premium spray wax for shine and protection."
    },
    {
        id: "prime-essential-full",
        name: "Prime Essential Full",
        actualId: "prime-essential-full",
        description: "Complete Maintenance Detail",
        isLive: true,
        includes: servicePackages.find(p => p.id === "prime-essential-full")?.steps.map(s => s.name) || [],
        script: "Our Prime Essential Full Detail is the best of both worlds—it combines our Essential Interior and Exterior services for a complete, professional refresh of your entire vehicle."
    },
    {
        id: "prime-elite-interior",
        name: "Prime Elite Interior",
        actualId: "prime-elite-interior",
        description: "Deep Interior Restoration",
        isLive: false,
        includes: servicePackages.find(p => p.id === "prime-elite-interior")?.steps.map(s => s.name) || [],
        script: "The Prime Elite Interior is our deep-clean restoration. We use steam cleaning and extraction on carpets and seats to remove deep stains and odors, finishing with leather conditioning."
    },
    {
        id: "prime-elite-exterior",
        name: "Prime Elite Exterior",
        actualId: "prime-elite-exterior",
        description: "Advanced Paint Protection",
        isLive: false,
        includes: servicePackages.find(p => p.id === "prime-elite-exterior")?.steps.map(s => s.name) || [],
        script: "Our Prime Elite Exterior is designed for ultimate protection. We include clay bar decontamination to smooth the paint and apply a premium sealant for long-lasting gloss and UV protection."
    },
    {
        id: "prime-elite-full",
        name: "Prime Elite Full",
        actualId: "prime-elite-full",
        description: "The Ultimate Restoration",
        isLive: false,
        includes: servicePackages.find(p => p.id === "prime-elite-full")?.steps.map(s => s.name) || [],
        script: "The Prime Elite Full Detail is our flagship showroom package. It combines our deepest interior restoration with our most advanced exterior protection for the ultimate results."
    },
];

export function createEmptyVehicle(livePackages?: any[]): Vehicle {
    const vid = Date.now().toString();
    const firstPkg = livePackages?.find(p => p.id === "prime-essential-exterior") || livePackages?.[0];

    const defaultScenarios = [
        {
            id: `s1-${vid}`,
            label: `Scenario A: ${firstPkg ? firstPkg.name.replace('Prime ', '') : 'Essential Exterior'}`,
            packageId: firstPkg?.id || "prime-essential-exterior",
            addOnIds: []
        }
    ];

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
        seatMaterial: "cloth",
        paintCondition: "good",
        mainGoal: "full",
        scenarios: defaultScenarios,
        selectedScenarioId: `s1-${vid}`,
        selectedServiceId: null
    };
}


export function CallAssistantModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
    const { toast } = useToast();
    const navigate = useNavigate();
    const user = getCurrentUser();
    const isRickAdmin = user?.email === 'rberube54@gmail.com' || user?.email === 'Rick.PrimeAutoDetail@gmail.com';

    // Caller Identity State
    const [callerName, setCallerName] = useState(() => localStorage.getItem("phone_assistant_draft_name") || "");
    const [callerPhone, setCallerPhone] = useState(() => localStorage.getItem("phone_assistant_draft_phone") || "");
    const [callerEmail, setCallerEmail] = useState(() => localStorage.getItem("phone_assistant_draft_email") || "");

    // Live pricing + meta state
    const [savedPrices, setSavedPrices] = useState<Record<string, string>>({});
    const [packageMetaLive, setPackageMetaLive] = useState<Record<string, any>>({});
    const [addOnMetaLive, setAddOnMetaLive] = useState<Record<string, any>>({});
    const [customPackagesLive, setCustomPackagesLive] = useState<any[]>([]);
    const [customAddOnsLive, setCustomAddOnsLive] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchLive = async () => {
        let finalSavedPrices: Record<string, string> = {};
        let finalPackageMeta: Record<string, any> = {};
        let finalAddOnMeta: Record<string, any> = {};
        let finalCustomPackages: any[] = [];
        let finalCustomAddOns: any[] = [];

        // Smart defaults for packages
        servicePackages.forEach(p => {
            const isEssential = p.id.startsWith('prime-essential');
            finalPackageMeta[p.id] = { id: p.id, visible: isEssential, deleted: false };
        });

        // Smart defaults for add-ons
        const defaultAddonIds = [
            'wheel-cleaning', 'clay-bar', 'headlight-restoration', 'leather-conditioning',
            'ceramic-trim-coat', 'engine-bay', 'pet-hair', 'stain-treatment'
        ];
        addOns.forEach(a => {
            const isDefault = defaultAddonIds.includes(a.id);
            finalAddOnMeta[a.id] = { id: a.id, visible: isDefault, deleted: false };
        });

        // Try localforage for local cache first
        try {
            const localPrices = await localforage.getItem<Record<string, string>>("savedPrices");
            if (localPrices) {
                finalSavedPrices = { ...finalSavedPrices, ...localPrices };
            }
            const localPkgsLive = await localforage.getItem<any>("packagesLive");
            if (localPkgsLive) {
                if (localPkgsLive.savedPrices) finalSavedPrices = { ...finalSavedPrices, ...localPkgsLive.savedPrices };
                if (localPkgsLive.packageMeta) finalPackageMeta = { ...finalPackageMeta, ...localPkgsLive.packageMeta };
                if (localPkgsLive.addOnMeta) finalAddOnMeta = { ...finalAddOnMeta, ...localPkgsLive.addOnMeta };
                if (localPkgsLive.customPackages) finalCustomPackages = localPkgsLive.customPackages;
                if (localPkgsLive.customAddOns) finalCustomAddOns = localPkgsLive.customAddOns;
            }
        } catch (e) {
            console.warn("localforage read failed:", e);
        }

        // Try Supabase if enabled
        if (isSupabaseEnabled()) {
            try {
                const [pkgs, supabaseAddons] = await Promise.all([
                    supaPkgs.getAll().catch(() => []),
                    supaAddOns.getAll().catch(() => [])
                ]);

                if (pkgs && pkgs.length > 0) {
                    pkgs.forEach((p: any) => {
                        const id = p.id;
                        finalPackageMeta[id] = {
                            id,
                            visible: p.is_active === true,
                            deleted: false,
                            imageDataUrl: p.image_url || ""
                        };
                        if (p.compact_price != null) finalSavedPrices[`package:${id}:compact`] = String(p.compact_price);
                        if (p.midsize_price != null) finalSavedPrices[`package:${id}:midsize`] = String(p.midsize_price);
                        if (p.truck_price != null) finalSavedPrices[`package:${id}:truck`] = String(p.truck_price);
                        if (p.luxury_price != null) finalSavedPrices[`package:${id}:luxury`] = String(p.luxury_price);
                    });

                    const builtInPkgIds = servicePackages.map(b => b.id);
                    finalCustomPackages = pkgs.filter((p: any) => !builtInPkgIds.includes(p.id)).map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        description: p.description || "",
                        pricing: { compact: p.compact_price, midsize: p.midsize_price, truck: p.truck_price, luxury: p.luxury_price },
                        steps: []
                    }));
                }

                if (supabaseAddons && supabaseAddons.length > 0) {
                    supabaseAddons.forEach((a: any) => {
                        const id = a.id;
                        finalAddOnMeta[id] = {
                            id,
                            visible: a.is_active === true,
                            deleted: false
                        };
                        if (a.compact_price != null) finalSavedPrices[`addon:${id}:compact`] = String(a.compact_price);
                        if (a.midsize_price != null) finalSavedPrices[`addon:${id}:midsize`] = String(a.midsize_price);
                        if (a.truck_price != null) finalSavedPrices[`addon:${id}:truck`] = String(a.truck_price);
                        if (a.luxury_price != null) finalSavedPrices[`addon:${id}:luxury`] = String(a.luxury_price);
                    });

                    const builtInAddOnIds = addOns.map(b => b.id);
                    finalCustomAddOns = supabaseAddons.filter((a: any) => !builtInAddOnIds.includes(a.id)).map((a: any) => ({
                        id: a.id,
                        name: a.name,
                        description: a.description || "",
                        pricing: { compact: a.compact_price, midsize: a.midsize_price, truck: a.truck_price, luxury: a.luxury_price }
                    }));
                }
            } catch (e) {
                console.error("Supabase sync in CallAssistant failed:", e);
            }
        }

        setSavedPrices(finalSavedPrices);
        setPackageMetaLive(finalPackageMeta);
        setAddOnMetaLive(finalAddOnMeta);
        setCustomPackagesLive(finalCustomPackages);
        setCustomAddOnsLive(finalCustomAddOns);
        setIsLoading(false);
    };

    useEffect(() => {
        if (open) {
            fetchLive();
        }
    }, [open]);

    const livePackages = useMemo(() => {
        const visibleBuiltIns = servicePackages.filter(p => packageMetaLive[p.id]?.visible === true);
        const visibleCustomPkgs = customPackagesLive.filter((p: any) => packageMetaLive[p.id]?.visible === true);

        return [...visibleBuiltIns, ...visibleCustomPkgs].map((p: any) => {
            const pricing = {
                compact: parseFloat(savedPrices[`package:${p.id}:compact`]) || p.pricing?.compact || 0,
                midsize: parseFloat(savedPrices[`package:${p.id}:midsize`]) || p.pricing?.midsize || 0,
                truck: parseFloat(savedPrices[`package:${p.id}:truck`]) || p.pricing?.truck || 0,
                luxury: parseFloat(savedPrices[`package:${p.id}:luxury`]) || p.pricing?.luxury || 0,
            };
            return { ...p, pricing };
        });
    }, [packageMetaLive, customPackagesLive, savedPrices]);

    const liveAddOns = useMemo(() => {
        const visibleBuiltAddOns = addOns.filter(a => addOnMetaLive[a.id]?.visible === true);
        const visibleCustomAddOns = customAddOnsLive.filter((a: any) => addOnMetaLive[a.id]?.visible === true);

        return [...visibleBuiltAddOns, ...visibleCustomAddOns].map((a: any) => {
            const pricing = {
                compact: parseFloat(savedPrices[`addon:${a.id}:compact`]) || (a.pricing?.compact ?? 0),
                midsize: parseFloat(savedPrices[`addon:${a.id}:midsize`]) || (a.pricing?.midsize ?? 0),
                truck: parseFloat(savedPrices[`addon:${a.id}:truck`]) || (a.pricing?.truck ?? 0),
                luxury: parseFloat(savedPrices[`addon:${a.id}:luxury`]) || (a.pricing?.luxury ?? 0),
            };
            return { ...a, pricing };
        });
    }, [addOnMetaLive, customAddOnsLive, savedPrices]);

    // Call state
    const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
        const saved = localStorage.getItem("phone_assistant_draft_vehicles");
        if (saved) {
            try { 
                const parsed = JSON.parse(saved); 
                return parsed.map((v: any) => {
                    let vType = v.type || "midsize";
                    if (vType === "Compact/Sedan" || vType === "Compact") vType = "compact";
                    else if (vType === "Mid-Size/SUV") vType = "midsize";
                    else if (vType === "Truck/Van/Large SUV") vType = "truck";
                    else if (vType === "Luxury/High-End") vType = "luxury";
                    return { ...v, type: vType };
                });
            } catch(e) {}
        }
        return [createEmptyVehicle()];
    });

    // Sanitize and update default scenarios once livePackages are loaded
    useEffect(() => {
        if (!isLoading && livePackages.length > 0) {
            setVehicles(prevVehicles => {
                let changed = false;
                const updated = prevVehicles.map(v => {
                    // Check if scenarios contain stale mock packages that are not live
                    const hasStaleScenarios = v.scenarios.some(s => 
                        s.packageId && !livePackages.some(lp => lp.id === s.packageId)
                    );
                    // Also check if we just have exactly the mock default scenarios (Scenario A: Full Detail, etc.)
                    const isMockDefault = v.scenarios.length === 3 && 
                        v.scenarios[0].packageId === "prime-essential-full" &&
                        v.scenarios[1].packageId === "prime-essential-interior" &&
                        v.scenarios[2].packageId === "prime-essential-exterior";

                    if (hasStaleScenarios || isMockDefault) {
                        changed = true;
                        const firstPkg = livePackages.find(p => p.id === "prime-essential-exterior") || livePackages[0];
                        return {
                            ...v,
                            scenarios: [
                                {
                                    id: `s1-${v.id}`,
                                    label: `Scenario A: ${firstPkg ? firstPkg.name.replace('Prime ', '') : 'Essential Exterior'}`,
                                    packageId: firstPkg?.id || "",
                                    addOnIds: []
                                }
                            ],
                            selectedScenarioId: `s1-${v.id}`
                        };
                    }
                    return v;
                });
                return changed ? updated : prevVehicles;
            });
        }
    }, [livePackages, isLoading]);
    
    const [activeVehicleId, setActiveVehicleId] = useState<string>(() => {
        const saved = localStorage.getItem("phone_assistant_draft_active_id");
        if (saved) return saved;
        return vehicles[0]?.id || "";
    });

    const [showAutoClassify, setShowAutoClassify] = useState(false);

    const [serviceComparisonOpen, setServiceComparisonOpen] = useState(false);
    const [showCloseWarning, setShowCloseWarning] = useState(false);
    const [unselectedFields, setUnselectedFields] = useState<string[]>([]);

    useEffect(() => { localStorage.setItem("phone_assistant_draft_name", callerName); }, [callerName]);
    useEffect(() => { localStorage.setItem("phone_assistant_draft_phone", callerPhone); }, [callerPhone]);
    useEffect(() => { localStorage.setItem("phone_assistant_draft_email", callerEmail); }, [callerEmail]);
    useEffect(() => { localStorage.setItem("phone_assistant_draft_vehicles", JSON.stringify(vehicles)); }, [vehicles]);
    useEffect(() => { localStorage.setItem("phone_assistant_draft_active_id", activeVehicleId); }, [activeVehicleId]);

    const clearDraft = () => {
        localStorage.removeItem("phone_assistant_draft_name");
        localStorage.removeItem("phone_assistant_draft_phone");
        localStorage.removeItem("phone_assistant_draft_email");
        localStorage.removeItem("phone_assistant_draft_vehicles");
        localStorage.removeItem("phone_assistant_draft_active_id");
        const v = createEmptyVehicle(livePackages);
        setCallerName("");
        setCallerPhone("");
        setCallerEmail("");
        setVehicles([v]);
        setActiveVehicleId(v.id);
    };

    const handleFillRickBerubeTest = () => {
        setCallerName("Rick Berube");
        setCallerPhone("978-764-5047");
        setCallerEmail("rberube54+test@gmail.com");

        setVehicles(prev => prev.map((v, idx) => {
            if (idx === 0) {
                const updatedScenarios = [
                    {
                        id: `s1-${v.id}`,
                        label: "Scenario A: Essential Exterior",
                        packageId: "prime-essential-exterior",
                        addOnIds: []
                    }
                ];

                return {
                    ...v,
                    year: "2018",
                    make: "Ford",
                    model: "F-150",
                    type: "truck",
                    condition: "moderate",
                    dailyDriver: true,
                    paintCondition: "good",
                    interiorCondition: "normal",
                    seatMaterial: "cloth",
                    reasonForDetail: "protection",
                    mainGoal: "full",
                    scenarios: updatedScenarios,
                    selectedScenarioId: updatedScenarios[0].id,
                    selectedServiceId: "prime-essential-exterior",
                    notes: "This is a pre-filled test inquiry submitted by Rick Berube (Admin) to verify call pricing calculations, notification emails, and CRM auto-generation."
                };
            }
            return v;
        }));

        toast({
            title: "🧪 Sandbox Mode Active",
            description: "Pre-filled Rick Berube's test details (2018 Ford F-150 Truck)!",
        });
    };

    const handleCloseAttempt = (openState: boolean) => {
        if (!openState) {
            const hasData = callerName.trim() || callerPhone.trim() || callerEmail.trim() || 
                            vehicles[0].year.trim() || vehicles[0].make.trim() || vehicles[0].model.trim() || vehicles[0].notes.trim();
            if (hasData) {
                setShowCloseWarning(true);
                return;
            }
        }
        onOpenChange(openState);
    };

    const addVehicle = () => {
        const v = createEmptyVehicle(livePackages);
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
                scenarios: [...v.scenarios, { id: newSid, label: `Scenario ${String.fromCharCode(65 + v.scenarios.length)}`, packageId: "", addOnIds: [] }]
            };
        }));
    };

    const calculateTotal = (packageId: string, addOnIds: string[], vehicleType: VehicleType) => {
        const pkgObj = livePackages.find(p => p.id === packageId) || servicePackages.find(p => p.id === packageId);
        const pkgPrice = pkgObj ? (parseFloat(savedPrices[`package:${pkgObj.id}:${vehicleType}`]) || pkgObj.pricing?.[vehicleType] || 0) : 0;

        const addonsPrice = addOnIds.reduce((sum, aid) => {
            const ao = liveAddOns.find(a => a.id === aid) || addOns.find(a => a.id === aid);
            const price = ao ? (parseFloat(savedPrices[`addon:${ao.id}:${vehicleType}`]) || ao.pricing?.[vehicleType] || 0) : 0;
            return sum + price;
        }, 0);

        return pkgPrice + addonsPrice;
    };

    const getPackagePitchInfo = (pkgId: string) => {
        if (!pkgId) return null;
        const branded = BRANDED_PACKAGES.find(bp => bp.id === pkgId || bp.actualId === pkgId);
        const livePkg = livePackages.find(lp => lp.id === pkgId) || servicePackages.find(lp => lp.id === pkgId);
        
        if (branded) {
            return {
                name: livePkg?.name || branded.name,
                script: branded.script,
                includes: livePkg?.steps?.map((s: any) => s.name || s) || branded.includes
            };
        }
        
        return {
            name: livePkg?.name || pkgId,
            script: `The ${livePkg?.name || pkgId} is designed to deliver exceptional results for your vehicle, tailored to your specific needs.`,
            includes: livePkg?.steps?.map((s: any) => s.name || s) || []
        };
    };

    const activeVehicle = vehicles.find(v => v.id === activeVehicleId)!;

    const getComparisonLabel = (scenario: Scenario, scenarioA: Scenario, vehicleType: VehicleType) => {
        if (scenario.id === scenarioA.id) return "This is the base scenario (Scenario A).";
        
        const totalS = calculateTotal(scenario.packageId, scenario.addOnIds, vehicleType);
        const totalA = calculateTotal(scenarioA.packageId, scenarioA.addOnIds, vehicleType);
        const diff = totalS - totalA;
        
        const reasons: string[] = [];
        
        if (scenario.packageId !== scenarioA.packageId) {
            const pkgS = livePackages.find(p => p.id === scenario.packageId) || servicePackages.find(p => p.id === scenario.packageId);
            const pkgA = livePackages.find(p => p.id === scenarioA.packageId) || servicePackages.find(p => p.id === scenarioA.packageId);
            const priceS = pkgS ? (parseFloat(savedPrices[`package:${pkgS.id}:${vehicleType}`]) || pkgS.pricing?.[vehicleType] || 0) : 0;
            const priceA = pkgA ? (parseFloat(savedPrices[`package:${pkgA.id}:${vehicleType}`]) || pkgA.pricing?.[vehicleType] || 0) : 0;
            const pkgDiff = priceS - priceA;
            if (pkgDiff > 0) {
                reasons.push(`upgrading package to ${pkgS?.name || scenario.packageId} (+$${pkgDiff.toFixed(2)})`);
            } else if (pkgDiff < 0) {
                reasons.push(`switching package to ${pkgS?.name || scenario.packageId} (-$${Math.abs(pkgDiff).toFixed(2)})`);
            }
        }
        
        // Add-ons added
        const addedAddons = scenario.addOnIds.filter(id => !scenarioA.addOnIds.includes(id));
        if (addedAddons.length > 0) {
            const names = addedAddons.map(id => {
                const ao = liveAddOns.find(a => a.id === id) || addOns.find(a => a.id === id);
                const price = ao ? (parseFloat(savedPrices[`addon:${ao.id}:${vehicleType}`]) || ao.pricing?.[vehicleType] || 0) : 0;
                return `${ao?.name || id} (+$${price.toFixed(2)})`;
            });
            reasons.push(`adding ${names.join(', ')}`);
        }
        
        // Add-ons removed
        const removedAddons = scenarioA.addOnIds.filter(id => !scenario.addOnIds.includes(id));
        if (removedAddons.length > 0) {
            const names = removedAddons.map(id => {
                const ao = liveAddOns.find(a => a.id === id) || addOns.find(a => a.id === id);
                const price = ao ? (parseFloat(savedPrices[`addon:${ao.id}:${vehicleType}`]) || ao.pricing?.[vehicleType] || 0) : 0;
                return `${ao?.name || id} (-$${price.toFixed(2)})`;
            });
            reasons.push(`removing ${names.join(', ')}`);
        }
        
        const labelPrefix = scenario.label.includes(':') ? scenario.label.split(':')[0] : 'Scenario';
        if (diff > 0) {
            return `${labelPrefix} is $${diff.toFixed(2)} more than Scenario A due to ${reasons.join(' and ')}.`;
        } else if (diff < 0) {
            return `${labelPrefix} is $${Math.abs(diff).toFixed(2)} less than Scenario A due to ${reasons.join(' and ')}.`;
        } else {
            return `${labelPrefix} has the same total price as Scenario A.`;
        }
    };

    const autoGenerateEstimate = async (savedCustomer: any, firstVehicle: Vehicle) => {
        // Find selected scenario. If none, default to the first scenario (Scenario A)
        const selectedScenario = firstVehicle.scenarios.find(s => s.id === firstVehicle.selectedScenarioId) || firstVehicle.scenarios[0];
        
        if (!selectedScenario) return;

        // Build services array for Estimate
        const services: { name: string; price: number }[] = [];
        
        const pkgObj = livePackages.find(p => p.id === selectedScenario.packageId) || servicePackages.find(p => p.id === selectedScenario.packageId);
        const pkgPrice = pkgObj ? (parseFloat(savedPrices[`package:${pkgObj.id}:${firstVehicle.type}`]) || pkgObj.pricing?.[firstVehicle.type] || 0) : 0;
        
        if (pkgObj) {
            services.push({ name: pkgObj.name, price: pkgPrice });
        }

        selectedScenario.addOnIds.forEach(aid => {
            const ao = liveAddOns.find(a => a.id === aid) || addOns.find(a => a.id === aid);
            const price = ao ? (parseFloat(savedPrices[`addon:${ao.id}:${firstVehicle.type}`]) || ao.pricing?.[firstVehicle.type] || 0) : 0;
            if (ao) {
                services.push({ name: ao.name, price });
            }
        });

        const selectedTotal = calculateTotal(selectedScenario.packageId, selectedScenario.addOnIds, firstVehicle.type);

        // Build detailed notes comparing scenarios
        const scenarioA = firstVehicle.scenarios[0];
        const scenarioNotes = firstVehicle.scenarios.map(s => {
            const sPkg = livePackages.find(p => p.id === s.packageId) || servicePackages.find(p => p.id === s.packageId);
            const sTotal = calculateTotal(s.packageId, s.addOnIds, firstVehicle.type);
            const comparisonLabel = getComparisonLabel(s, scenarioA, firstVehicle.type);
            
            const sAddons = s.addOnIds.map(aid => {
                const ao = liveAddOns.find(a => a.id === aid);
                const price = ao ? (parseFloat(savedPrices[`addon:${ao.id}:${firstVehicle.type}`]) || ao.pricing?.[firstVehicle.type] || 0) : 0;
                return `  - ${ao?.name || aid}: $${price.toFixed(2)}`;
            });

            return `[${s.label}]
• Package: ${sPkg?.name || s.packageId} ($${(parseFloat(savedPrices[`package:${s.packageId}:${firstVehicle.type}`]) || sPkg?.pricing?.[firstVehicle.type] || 0).toFixed(2)})
• Add-ons Selected:${sAddons.length > 0 ? `\n${sAddons.join('\n')}` : ' None'}
• Total: $${sTotal.toFixed(2)}
• Comparison: ${comparisonLabel}`;
        }).join('\n\n');

        const vehicleStr = `${firstVehicle.year || ''} ${firstVehicle.make || ''} ${firstVehicle.model || ''}`.replace(/\s+/g, ' ').trim() || "Vehicle Context";

        const estimateNotes = `Estimate generated automatically by Phone Assistant.

=== INTERNAL HISTORY LOG ===
[VEHICLE INFO]
• Classification size/type: ${firstVehicle.type.toUpperCase()}
• Condition: ${firstVehicle.condition.toUpperCase()}
• Inside Condition Details: ${firstVehicle.interiorCondition || 'N/A'}
• Outside Paint Details: ${firstVehicle.paintCondition || 'N/A'}
• General notes: ${firstVehicle.notes || 'None'}

[PRICING SCENARIOS COMPARISON]
${scenarioNotes}

[SELECTED SCENARIO FOR THIS ESTIMATE]
This estimate is based on the caller's selection: ${selectedScenario.label} with a total of $${selectedTotal.toFixed(2)}.`.trim();

        const estimatePayload: any = {
            estimateNumber: generateInvoiceNumber(),
            customerId: savedCustomer.id,
            customerName: savedCustomer.name,
            vehicle: vehicleStr,
            services,
            total: selectedTotal,
            date: new Date().toLocaleDateString(),
            estimateDate: new Date().toISOString().split('T')[0],
            status: "open",
            packageId: selectedScenario.packageId,
            addonIds: selectedScenario.addOnIds,
            vehicleId: savedCustomer.vehicles?.[0]?.id || undefined,
            vehicleType: firstVehicle.type,
            discount: 0,
            discountType: "percent",
            notes: estimateNotes,
            isSent: false
        };

        await upsertSupabaseEstimate(estimatePayload);
    };

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
                const timestamp = new Date().toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short"
                });

                const mappedVehicle = {
                    make: firstVehicle.make || '',
                    model: firstVehicle.model || '',
                    year: firstVehicle.year || '',
                    type: firstVehicle.type || 'midsize',
                    mileage: firstVehicle.mileage || '',
                    conditionInside: firstVehicle.interiorCondition || '',
                    conditionOutside: firstVehicle.paintCondition || ''
                };

                const actualServiceId = selectedScenario?.packageId || firstVehicle.selectedServiceId;
                const selectedServicePkg = livePackages.find(p => p.id === actualServiceId) || servicePackages.find(p => p.id === actualServiceId);
                const selectedServiceName = selectedServicePkg ? selectedServicePkg.name : 'None';

                const customerData = {
                    name: callerName || "Unknown Caller",
                    phone: callerPhone,
                    email: callerEmail,
                    type: accountType,
                    notes: `Added via Phone Assistant. This person was a caller on ${timestamp}.

[EVALUATION SUMMARY]
• Detailing Service: ${selectedServiceName.toUpperCase()}
• Dirt Level: ${firstVehicle.condition?.toUpperCase() || 'N/A'}
• Usage: ${firstVehicle.dailyDriver ? 'Daily Driver' : 'Weekend'}
• Storage: ${firstVehicle.garaged || 'N/A'}
• Mileage: ${firstVehicle.mileage || 'N/A'}
• Detail History: ${firstVehicle.detailHistory || 'N/A'}
• Seat Material: ${firstVehicle.seatMaterial || 'N/A'}
• Interior Condition: ${firstVehicle.interiorCondition || 'N/A'}
• Paint Condition: ${firstVehicle.paintCondition || 'N/A'}
• Customer Goal: ${firstVehicle.mainGoal || 'N/A'}

${firstVehicle.notes || ''}`.trim(),
                    vehicle_info: mappedVehicle,
                    vehicles: [mappedVehicle]
                };

                upsertSupabaseCustomer(customerData).then(async (savedCustomer) => {
                    toast({
                        title: accountType === 'customer' ? "Customer Created" : "Prospect Created",
                        description: `${callerName} recorded. View in ${accountType === 'customer' ? 'Customers' : 'Prospects'}.`,
                    });

                    // Auto-Generate Estimate simultaneously!
                    try {
                        await autoGenerateEstimate(savedCustomer, firstVehicle);
                    } catch (estErr) {
                        console.error("Failed to auto-generate estimate on handoff:", estErr);
                    }
                });
            } catch (err) {
                console.error("Failed to persist caller info:", err);
            }
        }

        // Store in localStorage for the Eval page to pick up if it wants
        localStorage.setItem("call_assistant_handoff", JSON.stringify(data));

        clearDraft();
        onOpenChange(false);
        navigate("/client-evaluation");
        toast({ title: "Handoff Successful", description: "Call data passed to Client Evaluation." });
    };

    const handleSaveProspectOnly = async () => {
        if (!callerName) {
            toast({
                title: "Information Required",
                description: "Please enter the caller's Full Name to record them as a prospect.",
                variant: "destructive"
            });
            return;
        }
        try {
            const timestamp = new Date().toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short"
            });

            const firstVehicle = vehicles[0];
            const mappedVehicle = {
                make: firstVehicle.make || '',
                model: firstVehicle.model || '',
                year: firstVehicle.year || '',
                type: firstVehicle.type || 'midsize',
                mileage: firstVehicle.mileage || '',
                conditionInside: firstVehicle.interiorCondition || '',
                conditionOutside: firstVehicle.paintCondition || ''
            };

            const selectedScenario = firstVehicle.scenarios.find(s => s.id === firstVehicle.selectedScenarioId);
            const actualServiceId = selectedScenario?.packageId || firstVehicle.selectedServiceId;
            const selectedServicePkg = livePackages.find(p => p.id === actualServiceId) || servicePackages.find(p => p.id === actualServiceId);
            const selectedServiceName = selectedServicePkg ? selectedServicePkg.name : 'None';

            const customerData = {
                name: callerName || "Unknown Caller",
                phone: callerPhone,
                email: callerEmail,
                type: 'prospect',
                notes: `Added via Phone Assistant. This person was a caller on ${timestamp}.

[EVALUATION SUMMARY]
• Detailing Service: ${selectedServiceName.toUpperCase()}
• Dirt Level: ${firstVehicle.condition?.toUpperCase() || 'N/A'}
• Usage: ${firstVehicle.dailyDriver ? 'Daily Driver' : 'Weekend'}
• Storage: ${firstVehicle.garaged || 'N/A'}
• Mileage: ${firstVehicle.mileage || 'N/A'}
• Detail History: ${firstVehicle.detailHistory || 'N/A'}
• Seat Material: ${firstVehicle.seatMaterial || 'N/A'}
• Interior Condition: ${firstVehicle.interiorCondition || 'N/A'}
• Paint Condition: ${firstVehicle.paintCondition || 'N/A'}
• Customer Goal: ${firstVehicle.mainGoal || 'N/A'}

${firstVehicle.notes || ''}`.trim(),
                vehicle_info: mappedVehicle,
                vehicles: [mappedVehicle]
            };

            const savedCustomer = await upsertSupabaseCustomer(customerData);
            
            // Auto-Generate Estimate simultaneously!
            try {
                await autoGenerateEstimate(savedCustomer, firstVehicle);
            } catch (estErr) {
                console.error("Failed to auto-generate estimate on save prospect:", estErr);
            }

            toast({
                title: "Prospect Saved",
                description: `${callerName} recorded successfully under Prospects list with auto-generated estimate.`,
            });
            clearDraft();
            onOpenChange(false);
        } catch (err) {
            console.error("Failed to save prospect:", err);
            toast({
                title: "Error Saving Prospect",
                description: "An error occurred while saving the prospect. Please try again.",
                variant: "destructive"
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleCloseAttempt}>
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
                        <Button variant="ghost" size="icon" onClick={() => handleCloseAttempt(false)} className="h-8 w-8 rounded-full hover:bg-primary/20">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-0 custom-scrollbar bg-zinc-950/20">
                    <Accordion type="single" collapsible defaultValue="caller-info" className="w-full">
                        {/* SECTION 1: CALLER IDENTITY */}
                        <AccordionItem value="caller-info" className="border-b border-zinc-800/80 bg-purple-950/25 shadow-sm">
                            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-purple-900/10 transition-colors">
                                <div className="flex items-center gap-3 w-full text-left">
                                    <div className="bg-purple-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-[0_0_10px_rgba(147,51,234,0.5)]">
                                        1
                                    </div>
                                    <div>
                                        <div className="text-sm font-black uppercase tracking-tight text-white">
                                            Caller Identity
                                        </div>
                                        {callerName ? (
                                            <div className="text-[10px] font-bold text-purple-400 uppercase">
                                                {callerName} {callerPhone ? `• ${callerPhone}` : ''}
                                            </div>
                                        ) : (
                                            <div className="text-[9px] font-bold text-purple-400 uppercase tracking-widest">
                                                Identify customer for CRM record
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-5 pb-5 pt-2">
                                <div className="space-y-4 pt-2">
                                    {isRickAdmin && (
                                        <div className="flex justify-end mb-2">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="text-[10px] uppercase font-black text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all border border-emerald-500/20 hover:border-emerald-500 px-4 h-9 animate-pulse"
                                                onClick={handleFillRickBerubeTest}
                                                type="button"
                                            >
                                                🧪 Auto-Fill Rick Berube Test
                                            </Button>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Full Name</Label>
                                            <Input
                                                placeholder="Enter Client Name"
                                                value={callerName}
                                                onChange={(e) => setCallerName(e.target.value)}
                                                className="h-9 bg-zinc-950 border-zinc-700 font-bold text-zinc-100"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Phone Number</Label>
                                            <Input
                                                placeholder="555-0199"
                                                value={callerPhone}
                                                onChange={(e) => setCallerPhone(e.target.value)}
                                                className="h-9 bg-zinc-950 border-zinc-700 font-bold text-zinc-100"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Email Address</Label>
                                            <Input
                                                placeholder="customer@example.com"
                                                value={callerEmail}
                                                onChange={(e) => setCallerEmail(e.target.value)}
                                                className="h-9 bg-zinc-950 border-zinc-700 font-bold text-zinc-100"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Call Notes & Special Requests</Label>
                                        <Textarea
                                            placeholder="Type any notes from this call here..."
                                            value={activeVehicle.notes}
                                            onChange={(e) => updateVehicle(activeVehicleId, { notes: e.target.value })}
                                            className="min-h-[80px] bg-zinc-950 border-zinc-700 font-bold text-zinc-100 placeholder:text-zinc-600 rounded-lg p-2.5 resize-none"
                                        />
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        {/* SECTION 2: VEHICLE CONTEXT & EVALUATION */}
                        <AccordionItem value="pre-qual" className="border-b border-zinc-800/80 bg-blue-950/25 shadow-sm">
                            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-blue-900/10 transition-colors">
                                <div className="flex items-center gap-3 w-full text-left">
                                    <div className="bg-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                                        2
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
                                    {/* Evaluation Guide Logic */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-900/40 p-4 rounded-xl border border-blue-500/10">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-start mb-1.5">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setShowAutoClassify(true);
                                                    }}
                                                    className="h-6 px-2 text-[10px] font-black uppercase text-blue-300 hover:text-white bg-blue-500/15 hover:bg-blue-500/30 border border-blue-500/30 rounded-md transition-colors flex items-center gap-2"
                                                >
                                                    <Car className="w-3.5 h-3.5 text-blue-400" /> Vehicle Class
                                                </Button>
                                            </div>
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
                                                <Input placeholder="Year" value={activeVehicle.year} onChange={(e) => updateVehicle(activeVehicleId, { year: e.target.value })} className="w-20 bg-zinc-950 border-zinc-800 text-xs font-bold text-zinc-100" />
                                                <Input placeholder="Make" value={activeVehicle.make} onChange={(e) => updateVehicle(activeVehicleId, { make: e.target.value })} className="flex-1 bg-zinc-950 border-zinc-800 text-xs font-bold text-zinc-100" />
                                                <Input placeholder="Model" value={activeVehicle.model} onChange={(e) => updateVehicle(activeVehicleId, { model: e.target.value })} className="flex-1 bg-zinc-950 border-zinc-800 text-xs font-bold text-zinc-100" />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1">Reason for Detail</Label>
                                            <Select value={activeVehicle.reasonForDetail} onValueChange={(v) => updateVehicle(activeVehicleId, { reasonForDetail: v })}>
                                                <SelectTrigger className="h-9 bg-zinc-950 border-zinc-800 text-xs font-bold text-zinc-100">
                                                    <SelectValue placeholder="MOTIVATION" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
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
                                                <SelectTrigger className="h-8 bg-zinc-950 border-zinc-800 text-[10px] font-black uppercase text-zinc-100">
                                                    <SelectValue placeholder="MAIN CUSTOMER GOAL" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                                                    <SelectItem value="basic">Basic Clean</SelectItem>
                                                    <SelectItem value="interior">Deep Interior Clean</SelectItem>
                                                    <SelectItem value="exterior">Exterior Shine/Protection</SelectItem>
                                                    <SelectItem value="odor">Odor Removal</SelectItem>
                                                    <SelectItem value="full">Full Professional Detail</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                                                <Label className="text-[9px] font-black uppercase text-zinc-400">Select Detailing Service (Optional)</Label>
                                                <Select value={activeVehicle.selectedServiceId || "none"} onValueChange={(v) => updateVehicle(activeVehicleId, { selectedServiceId: v === "none" ? null : v })}>
                                                    <SelectTrigger className="h-8 bg-zinc-950 border-zinc-800 text-[10px] font-black uppercase text-zinc-100">
                                                        <SelectValue placeholder="NO SERVICE SELECTED" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                                                        <SelectItem value="none">-- NO SERVICE SELECTED --</SelectItem>
                                                        {livePackages.map(pkg => (
                                                            <SelectItem key={pkg.id} value={pkg.id}>{pkg.name.toUpperCase()}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* LOGISTICS */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[9px] font-black uppercase text-white/70">Storage</Label>
                                            <Select value={activeVehicle.garaged} onValueChange={(v) => updateVehicle(activeVehicleId, { garaged: v })}>
                                                <SelectTrigger className="h-9 bg-zinc-950 border-zinc-800 text-[10px] font-bold text-zinc-100">
                                                    <SelectValue placeholder="STORAGE" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                                                    <SelectItem value="garaged">Always Garaged</SelectItem>
                                                    <SelectItem value="outdoors">Kept Outdoors</SelectItem>
                                                    <SelectItem value="partial">Mix of Both</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[9px] font-black uppercase text-white/70">Mileage</Label>
                                            <Input placeholder="e.g. 45k" value={activeVehicle.mileage} onChange={(e) => updateVehicle(activeVehicleId, { mileage: e.target.value })} className="h-9 bg-zinc-950 border-zinc-800 text-[10px] font-bold text-zinc-100 placeholder:text-zinc-600" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[9px] font-black uppercase text-white/70">History</Label>
                                            <Select value={activeVehicle.detailHistory} onValueChange={(v) => updateVehicle(activeVehicleId, { detailHistory: v })}>
                                                <SelectTrigger className="h-9 bg-zinc-950 border-zinc-800 text-[10px] font-bold text-zinc-100">
                                                    <SelectValue placeholder="HISTORY" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
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

                        {/* SECTION 3: LIVE PRICING SCENARIOS */}
                        <AccordionItem value="live-pricing" className="border-b border-zinc-800/80 bg-emerald-950/20 shadow-sm">
                            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-emerald-900/10 transition-colors">
                                <div className="flex items-center gap-3 w-full text-left">
                                    <div className="bg-emerald-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                                        3
                                    </div>
                                    <div>
                                        <div className="text-sm font-black uppercase tracking-tight text-white">
                                            Live Pricing Scenarios
                                        </div>
                                        <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">
                                            Instant calculation and scripts
                                        </div>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-5 pb-6 pt-2">
                                <div className="space-y-6">
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
                                                                className="h-8 flex-1 bg-transparent border-none font-black uppercase tracking-widest text-xs p-0 focus-visible:ring-0 placeholder:text-zinc-700 text-zinc-100"
                                                                placeholder="Scenario Label..."
                                                            />
                                                            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter shrink-0">
                                                                {activeVehicle.type || 'select type'}
                                                            </div>
                                                        </div>
                                                                                                                <div className="flex items-center gap-2 shrink-0">
                                                            <div className="text-2xl sm:text-3xl font-black text-zinc-100 font-mono tracking-tighter bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
                                                                ${total}
                                                            </div>
                                                            {sIdx > 0 && (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => {
                                                                        setVehicles(prev => prev.map(v => {
                                                                            if (v.id !== activeVehicleId) return v;
                                                                            const filtered = v.scenarios.filter(s => s.id !== scenario.id);
                                                                            const reindexed = filtered.map((s, idx) => {
                                                                                const prefix = `Scenario ${String.fromCharCode(65 + idx)}`;
                                                                                const suffix = s.label.includes(':') ? s.label.split(':')[1] : '';
                                                                                return {
                                                                                    ...s,
                                                                                    label: suffix ? `${prefix}:${suffix}` : prefix
                                                                                };
                                                                            });
                                                                            return {
                                                                                ...v,
                                                                                scenarios: reindexed,
                                                                                selectedScenarioId: v.selectedScenarioId === scenario.id 
                                                                                    ? (reindexed[0]?.id || null) 
                                                                                    : v.selectedScenarioId
                                                                            };
                                                                        }));
                                                                        toast({
                                                                            title: "Scenario Removed",
                                                                            description: `Successfully removed Scenario ${String.fromCharCode(65 + sIdx)}.`
                                                                        });
                                                                    }}
                                                                    className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-full"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div>
                                                            <Label className="text-[10px] font-black uppercase text-muted-foreground mb-3 block tracking-widest">Select Package</Label>
                                                            <div className="grid grid-cols-1 gap-1.5">
                                                                {livePackages.map(pkg => (
                                                                    <div
                                                                        key={pkg.id}
                                                                        onClick={() => {
                                                                             const cleanName = pkg.name.replace('Prime ', '');
                                                                             const prefix = `Scenario ${String.fromCharCode(65 + sIdx)}`;
                                                                             updateScenario(activeVehicleId, scenario.id, { 
                                                                                 packageId: pkg.id,
                                                                                 label: `${prefix}: ${cleanName}`
                                                                             });
                                                                         }}
                                                                        className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between
                                                                            ${scenario.packageId === pkg.id ? "border-primary bg-primary/10" : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/20"}
                                                                        `}
                                                                    >
                                                                        <div className="flex-1">
                                                                            <div className="text-xs font-black uppercase text-zinc-100">{pkg.name}</div>
                                                                            <div className="text-[10px] text-muted-foreground leading-tight">{pkg.description || pkg.descriptionOverride}</div>
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
                                                                            {liveAddOns.map(ao => {
                                                                                const price = parseFloat(savedPrices[`addon:${ao.id}:${activeVehicle.type}`]) || ao.pricing?.[activeVehicle.type] || 0;
                                                                                return (
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
                                                                                            <Label htmlFor={`${scenario.id}-${ao.id}`} className="text-[11px] font-bold cursor-pointer group-hover:text-primary transition-colors text-zinc-200">{ao.name}</Label>
                                                                                        </div>
                                                                                        <span className="text-[11px] font-bold text-zinc-100 tracking-tighter bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-850 font-mono">${price}</span>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </AccordionContent>
                                                                </AccordionItem>
                                                            </Accordion>
                                                        </div>
                                                    </div>

                                                    {/* Talking Points / Script for selected package */}
                                                    {(() => {
                                                        const pkgPitch = getPackagePitchInfo(scenario.packageId);
                                                        if (!pkgPitch) return null;

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
                                                                        "{pkgPitch.script}"
                                                                    </p>
                                                                </div>

                                                                {pkgPitch.includes.length > 0 && (
                                                                    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                                                                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 block">What's Included:</div>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                                                                            {pkgPitch.includes.map((item, idx) => (
                                                                                <div key={idx} className="flex items-center gap-2 text-[11px] text-zinc-300">
                                                                                    <div className="w-1 h-1 rounded-full bg-primary shrink-0" />
                                                                                    <span className="truncate">{item}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            );
                                        })}

                                        <Button variant="outline" onClick={() => addScenario(activeVehicleId)} className="w-full border-dashed py-6 border-zinc-800 hover:border-primary/50 hover:bg-primary/5 group text-zinc-300">
                                            <Plus className="w-4 h-4 mr-2" /> Add Comparison Scenario
                                        </Button>

                                        {/* Auto Comparison Tool */}
                                        {activeVehicle.scenarios.length >= 1 && (
                                            <div className="mt-8 p-6 bg-zinc-900 border border-emerald-500/30 rounded-2xl shadow-xl relative overflow-hidden">
                                                <Calculator className="absolute top-4 right-4 w-12 h-12 text-emerald-500/10" />
                                                <h4 className="text-emerald-500 font-black uppercase tracking-tighter text-base mb-4 flex items-center gap-2">
                                                    Comparison Summary
                                                </h4>

                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    {activeVehicle.scenarios.map((s, idx) => {
                                                        const total = calculateTotal(s.packageId, s.addOnIds, activeVehicle.type);
                                                        const isSelected = activeVehicle.selectedScenarioId === s.id;
                                                        
                                                        const pkgObj = livePackages.find(p => p.id === s.packageId) || servicePackages.find(p => p.id === s.packageId);
                                                        const pkgPrice = pkgObj ? (parseFloat(savedPrices[`package:${pkgObj.id}:${activeVehicle.type}`]) || pkgObj.pricing?.[activeVehicle.type] || 0) : 0;
                                                        
                                                        const itemizedAddOns = s.addOnIds.map(aid => {
                                                            const ao = liveAddOns.find(a => a.id === aid) || addOns.find(a => a.id === aid);
                                                            const price = ao ? (parseFloat(savedPrices[`addon:${ao.id}:${activeVehicle.type}`]) || ao.pricing?.[activeVehicle.type] || 0) : 0;
                                                            return { name: ao?.name || aid, price };
                                                        });

                                                        return (
                                                            <div 
                                                                key={s.id} 
                                                                onClick={() => updateVehicle(activeVehicleId, { selectedScenarioId: s.id })}
                                                                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between group
                                                                    ${isSelected ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-primary' : 'bg-black/40 border-zinc-800 hover:border-zinc-700'}
                                                                `}
                                                            >
                                                                <div>
                                                                    <div className="flex items-start justify-between gap-1.5 mb-2 border-b border-zinc-800/40 pb-1.5">
                                                                        <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider whitespace-normal leading-tight">
                                                                            {s.label}
                                                                        </span>
                                                                        {isSelected && (
                                                                            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                                                                                Active
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    {/* Total Price */}
                                                                    <div className="text-2xl font-black text-white font-mono tracking-tight flex items-baseline gap-1">
                                                                        ${total}
                                                                    </div>

                                                                    {/* Itemized package & addons */}
                                                                    <div className="mt-3.5 pt-3.5 border-t border-zinc-800/80 space-y-1.5 text-[10px] text-zinc-300">
                                                                        <div className="font-bold text-zinc-200 whitespace-normal leading-tight">
                                                                            📦 {pkgObj ? pkgObj.name.replace('Prime ', '') : 'No Package Selected'}
                                                                        </div>
                                                                        {itemizedAddOns.length > 0 && (
                                                                            <div className="space-y-1.5 pt-1.5 border-t border-zinc-900/60">
                                                                                {itemizedAddOns.map((ao, aIdx) => (
                                                                                    <div key={aIdx} className="text-zinc-400 whitespace-normal leading-tight">
                                                                                        ➕ {ao.name}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Custom Sales pitch & caller tip box */}
                                                <div className="mt-5 pt-4 border-t border-zinc-800/80">
                                                    <div className="p-4 bg-zinc-950/60 border border-emerald-500/20 rounded-xl space-y-3">
                                                        <div className="flex items-center gap-2 text-emerald-400 font-black uppercase text-xs tracking-wider">
                                                            <span className="text-sm">🗣️</span> Professional Phone Pitch & Value Checklist
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-zinc-300 leading-relaxed">
                                                            <div className="space-y-2">
                                                                <div className="font-bold text-zinc-100 uppercase tracking-widest text-[9px] border-b border-zinc-800 pb-1 flex items-center gap-1.5 text-emerald-400">
                                                                    <span>✨</span> PDS Value Props to Mention:
                                                                </div>
                                                                <ul className="space-y-1.5 list-none pl-0">
                                                                    <li className="flex items-start gap-1.5">
                                                                        <span className="text-emerald-500">🚚</span>
                                                                        <span><strong className="text-zinc-100">100% Mobile Detail Rig:</strong> We bring our own water, power, and premium tools directly to their door.</span>
                                                                    </li>
                                                                    <li className="flex items-start gap-1.5">
                                                                        <span className="text-emerald-500">🛡️</span>
                                                                        <span><strong className="text-zinc-100">Licensed & Fully Insured:</strong> Full peace of mind with our certified professional detailers.</span>
                                                                    </li>
                                                                    <li className="flex items-start gap-1.5">
                                                                        <span className="text-emerald-500">✨</span>
                                                                        <span><strong className="text-zinc-100">Premium Paint Sealant:</strong> Included in all exterior packages for a 3-6 month durable protective gloss.</span>
                                                                    </li>
                                                                </ul>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <div className="font-bold text-zinc-100 uppercase tracking-widest text-[9px] border-b border-zinc-800 pb-1 flex items-center gap-1.5 text-emerald-400">
                                                                    <span>🎯</span> Handling Objections & Closing:
                                                                </div>
                                                                <ul className="space-y-1.5 list-none pl-0">
                                                                    <li className="flex items-start gap-1.5">
                                                                        <span className="text-emerald-500">🧴</span>
                                                                        <span><strong className="text-zinc-100">Safe Products:</strong> We use high-end, pH-neutral chemicals safe for pets, kids, and exotic finishes.</span>
                                                                    </li>
                                                                    <li className="flex items-start gap-1.5">
                                                                        <span className="text-emerald-500">🎯</span>
                                                                        <span><strong className="text-zinc-100">Scenario Upsell:</strong> "Selecting scenario A gets your engine completely detailed, preventing dirt and salt buildup."</span>
                                                                    </li>
                                                                    <li className="flex items-start gap-1.5">
                                                                        <span className="text-emerald-500">📅</span>
                                                                        <span><strong className="text-zinc-100">Booking Prompt:</strong> "Should we get your vehicle scheduled for our next open mobile detail slot this week?"</span>
                                                                    </li>
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>

                <div className="p-3 border-t border-border bg-muted/30 flex flex-col gap-3 w-full shrink-0">
                    {/* Desktop Only Legend info */}
                    <div className="hidden lg:flex gap-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <div className="flex items-center gap-1.5"><CheckCircle2 className={`w-3.5 h-3.5 ${callerName ? 'text-primary' : 'text-zinc-700'}`} /> Identity</div>
                        <div className="flex items-center gap-1.5"><CheckCircle2 className={`w-3.5 h-3.5 ${activeVehicle.make ? 'text-primary' : 'text-zinc-700'}`} /> Vehicle</div>
                        <div className="flex items-center gap-1.5"><CheckCircle2 className={`w-3.5 h-3.5 ${activeVehicle.selectedScenarioId ? 'text-primary' : 'text-zinc-700'}`} /> Selection</div>
                    </div>

                    {/* Responsive Footer Controls */}
                    <div className="flex items-center justify-between gap-2 w-full">
                        {/* Left Side: Package Base Prices Cheat Sheet Dropdown */}
                        <div className="flex-1 min-w-[120px] max-w-[280px]">
                            <Select value="none" onValueChange={() => {}}>
                                <SelectTrigger className="w-full h-10 bg-zinc-950 font-black uppercase text-[10px] tracking-widest border-zinc-800 text-zinc-100">
                                    <span className="flex items-center gap-1.5 truncate">
                                        💰 Package Cheat Sheet
                                    </span>
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-950 border-zinc-850 text-zinc-200">
                                    <SelectItem value="none" disabled className="text-zinc-500 font-black text-[9px] uppercase tracking-wider">
                                        Live Package Base Prices ({activeVehicle.type.toUpperCase()})
                                    </SelectItem>
                                    {livePackages.map(pkg => {
                                        const basePrice = parseFloat(savedPrices[`package:${pkg.id}:${activeVehicle.type}`]) || pkg.pricing?.[activeVehicle.type] || 0;
                                        return (
                                            <SelectItem key={pkg.id} value={pkg.id} className="text-zinc-200 font-bold text-xs">
                                                {pkg.name.replace('Prime ', '').toUpperCase()}: ${basePrice}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Right Side: Action Buttons Row (Icon Only) */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={() => handleCloseAttempt(false)}
                                className="h-10 w-10 rounded-xl"
                                title="Cancel"
                            >
                                <X className="w-5 h-5" />
                            </Button>

                            <Button
                                type="button"
                                onClick={() => setServiceComparisonOpen(true)}
                                variant="outline"
                                size="icon"
                                className="h-10 w-10 rounded-xl border-emerald-500 text-emerald-500 hover:bg-emerald-500/10"
                                title="Services"
                            >
                                <LayoutDashboard className="w-5 h-5" />
                            </Button>

                            <Button
                                type="button"
                                onClick={handleSaveProspectOnly}
                                disabled={!callerName}
                                variant="outline"
                                size="icon"
                                className={`h-10 w-10 rounded-xl border-blue-500 text-blue-400 bg-blue-500/5 hover:bg-blue-500/15 transition-all
                                    ${!callerName ? 'opacity-50 cursor-not-allowed border-zinc-800 text-zinc-600 bg-transparent' : ''}
                                `}
                                title="Save Prospect"
                            >
                                <Plus className="w-5 h-5" />
                            </Button>

                            <Button
                                type="button"
                                onClick={handleHandoff}
                                disabled={!activeVehicle.selectedScenarioId}
                                size="icon"
                                className={`h-10 w-10 rounded-xl transition-all
                                    ${activeVehicle.selectedScenarioId ? 'bg-gradient-hero hover:shadow-[0_0_20px_rgba(220,38,38,0.3)] text-white' : 'bg-muted opacity-50'}
                                `}
                                title="Confirm & Go"
                            >
                                <ArrowRight className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
            <VehicleSelectorModal
                open={showAutoClassify}
                onOpenChange={setShowAutoClassify}
                onSelect={(data) => {
                    let mappedType: VehicleType = "midsize";
                    if (data.category === "Compact/Sedan" || data.category === "Compact") mappedType = "compact";
                    else if (data.category === "Mid-Size/SUV") mappedType = "midsize";
                    else if (data.category === "Truck/Van/Large SUV") mappedType = "truck";
                    else if (data.category === "Luxury/High-End") mappedType = "luxury";

                    const updates: any = { type: mappedType };
                    if (data.make) updates.make = data.make;
                    if (data.model) updates.model = data.model;
                    
                    updateVehicle(activeVehicleId, updates);
                    setShowAutoClassify(false);
                    
                    toast({
                        title: "Vehicle Set & Classified",
                        description: `Set to ${data.make || ''} ${data.model || ''} (${data.category.toUpperCase()})`,
                    });
                }}
            />
            <ServiceComparisonModal open={serviceComparisonOpen} onOpenChange={setServiceComparisonOpen} />
            <AlertDialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
                <AlertDialogContent className="bg-zinc-950 border border-zinc-800 text-zinc-100 max-w-md p-6">
                    <AlertDialogHeader className="mb-2">
                        <AlertDialogTitle className="text-xl font-black text-rose-500 uppercase tracking-tighter flex items-center gap-2">
                            <X className="w-5 h-5" /> Close Call Session?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400 text-xs font-bold uppercase leading-relaxed pt-2">
                            You have unsaved changes in this draft. What would you like to do?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex flex-col gap-2 mt-4">
                        <Button 
                            variant="outline" 
                            className="w-full justify-start h-12 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/30 uppercase font-black text-xs tracking-widest"
                            onClick={() => {
                                setShowCloseWarning(false);
                                handleSaveProspectOnly();
                            }}
                        >
                            <Plus className="w-4 h-4 mr-3" /> Save To Prospects
                        </Button>
                        <Button 
                            variant="outline" 
                            className="w-full justify-start h-12 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700 uppercase font-black text-xs tracking-widest"
                            onClick={() => {
                                setShowCloseWarning(false);
                                onOpenChange(false);
                            }}
                        >
                            <FileText className="w-4 h-4 mr-3" /> Keep Draft & Close
                        </Button>
                        <Button 
                            variant="destructive" 
                            className="w-full justify-start h-12 uppercase font-black text-xs tracking-widest"
                            onClick={() => {
                                setShowCloseWarning(false);
                                clearDraft();
                                onOpenChange(false);
                            }}
                        >
                            <Trash2 className="w-4 h-4 mr-3" /> Disregard Caller
                        </Button>
                    </div>
                    <AlertDialogFooter className="mt-4 pt-4 border-t border-zinc-800/50">
                        <AlertDialogCancel className="w-full bg-transparent border-none hover:bg-zinc-900 text-zinc-500 uppercase font-black text-[10px] tracking-widest">
                            Cancel / Keep Editing
                        </AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    );
}
