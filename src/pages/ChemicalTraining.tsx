
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowRight, Beaker, CheckCircle2, AlertTriangle, Info, ShieldAlert, ThermometerSun, Droplets, Sparkles, XCircle } from "lucide-react";
import { Chemical } from "@/types/chemicals";
import { getChemicals } from "@/lib/chemicals";
import {
    VehicleCondition,
    ContaminationType,
    ConditionDefinitions,
    findProductForContamination,
    getRecommendedCategory
} from "@/lib/chemical-decision";

export default function ChemicalTraining() {
    const [activeTab, setActiveTab] = useState("decision");
    const [chemicals, setChemicals] = useState<Chemical[]>([]);
    const [loading, setLoading] = useState(true);

    // Decision State
    const [condition, setCondition] = useState<VehicleCondition | "">("");
    const [contamination, setContamination] = useState<ContaminationType | "">("");
    const [selectedProduct, setSelectedProduct] = useState<Chemical | null>(null);

    useEffect(() => {
        (async () => {
            const list = await getChemicals();
            setChemicals(list);
            setLoading(false);
        })();
    }, []);

    const resetDecision = () => {
        setContamination("");
        setSelectedProduct(null);
    }

    const matches = contamination ? findProductForContamination(contamination as ContaminationType, chemicals) : [];
    const recommendedCategory = contamination ? getRecommendedCategory(contamination as ContaminationType) : "";

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Chemical Decision System"
                subtitle="Internal Training & Operational Logic"
                action={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setActiveTab("library")}>Learning Library</Button>
                        <Button onClick={() => setActiveTab("decision")}>Decision System</Button>
                    </div>
                }
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-8">
                    <TabsTrigger value="decision">Universal Decision System</TabsTrigger>
                    <TabsTrigger value="workflow">Setup Workflow (Training)</TabsTrigger>
                    <TabsTrigger value="library">Condition Library</TabsTrigger>
                    <TabsTrigger value="guides">Service Packages</TabsTrigger>
                </TabsList>

                {/* --- CORE DECISION SYSTEM --- */}
                <TabsContent value="decision" className="space-y-8 animate-fade-in">

                    {/* 1. Condition Assessment */}
                    <Card className="p-6 border-l-4 border-l-blue-500 bg-slate-900/50">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <ThermometerSun className="w-5 h-5 text-blue-400" />
                            Step 1: Vehicle Severity Assessment
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {(Object.keys(ConditionDefinitions) as VehicleCondition[]).map((cond) => (
                                <button
                                    key={cond}
                                    onClick={() => setCondition(cond)}
                                    className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden group
                    ${condition === cond
                                            ? 'border-blue-500 bg-blue-900/20'
                                            : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                                        }`}
                                >
                                    <div className="font-black text-xl text-white mb-1 uppercase tracking-wider">{cond}</div>
                                    <div className="text-xs text-slate-400 font-medium mb-2">
                                        {cond === 'Light' && 'Maintenance Wash'}
                                        {cond === 'Moderate' && 'Road Grime'}
                                        {cond === 'Heavy' && 'Deep Cleaning'}
                                        {cond === 'Severe' && 'Restoration'}
                                    </div>
                                    {condition === cond && <CheckCircle2 className="absolute top-2 right-2 text-blue-500 w-5 h-5" />}
                                </button>
                            ))}
                        </div>

                        {condition && (
                            <div className="mt-6 p-4 bg-slate-950 rounded-lg border border-slate-800 animate-in fade-in slide-in-from-top-2">
                                <div className="grid md:grid-cols-3 gap-6">
                                    <div>
                                        <span className="text-xs uppercase font-bold text-slate-500 block mb-1">Visual Indicators</span>
                                        <p className="text-sm text-slate-200">{ConditionDefinitions[condition].visual}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs uppercase font-bold text-slate-500 block mb-1">Surface Feel</span>
                                        <p className="text-sm text-slate-200">{ConditionDefinitions[condition].feel}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs uppercase font-bold text-slate-500 block mb-1">Risks</span>
                                        <p className="text-sm text-red-300 flex items-start gap-1">
                                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                            {ConditionDefinitions[condition].risks}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* 2. Contamination Identification */}
                    {condition && (
                        <Card className="p-6 border-l-4 border-l-purple-500 bg-slate-900/50 animate-in fade-in slide-in-from-bottom-4">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-purple-400" />
                                Step 2: Identify Contamination
                            </h3>

                            <div className="grid md:grid-cols-2 gap-8">
                                <div>
                                    <label className="text-sm font-bold text-slate-400 mb-2 block uppercase">Select Contamination Type</label>
                                    <Select value={contamination} onValueChange={(v) => { setContamination(v as ContaminationType); setSelectedProduct(null); }}>
                                        <SelectTrigger className="bg-black border-slate-700 h-12 text-lg">
                                            <SelectValue placeholder="What are you removing?" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 text-white border-slate-800">
                                            {Object.values(ContaminationType).map((t) => (
                                                <SelectItem key={t} value={t} className="focus:bg-slate-800 focus:text-white cursor-pointer py-3">
                                                    {t}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {contamination && (
                                    <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 flex flex-col justify-center">
                                        <span className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">Required Chemistry</span>
                                        <div className="text-2xl font-black text-white">{recommendedCategory}</div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {/* 3. Product Selection */}
                    {contamination && (
                        <Card className="p-6 border-l-4 border-l-green-500 bg-slate-900/50 animate-in fade-in slide-in-from-bottom-4">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <Beaker className="w-5 h-5 text-green-400" />
                                Step 3: Inventory Selection
                            </h3>

                            {matches.length > 0 ? (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {matches.map(chem => (
                                        <div
                                            key={chem.id}
                                            onClick={() => setSelectedProduct(chem)}
                                            className={`
                                    cursor-pointer rounded-xl border-2 p-4 transition-all hover:scale-[1.02]
                                    ${selectedProduct?.id === chem.id
                                                    ? 'border-green-500 bg-green-900/20'
                                                    : 'border-slate-800 bg-black hover:border-slate-600'}
                                `}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">Inventory Verified</Badge>
                                                <div
                                                    className="h-3 w-3 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                                                    style={{ backgroundColor: chem.theme_color || '#fff' }}
                                                />
                                            </div>
                                            <h4 className="text-lg font-bold text-white mb-1 leading-tight">{chem.name}</h4>
                                            <p className="text-xs text-slate-400 line-clamp-2">{chem.description}</p>

                                            {selectedProduct?.id === chem.id && (
                                                <div className="mt-4 pt-4 border-t border-white/10 space-y-3 animate-in fade-in">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-slate-500">Dilution:</span>
                                                        <span className="font-mono text-green-400 font-bold">
                                                            {chem.dilution_ratios?.[0]?.ratio || "RTU"}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-slate-500">Method:</span>
                                                        <span className="text-white">
                                                            {chem.application_guide?.method || "Spray"}
                                                        </span>
                                                    </div>
                                                    {chem.warnings?.damage_risk === 'High' && (
                                                        <div className="bg-red-900/30 text-red-400 text-xs p-2 rounded border border-red-900/50 mt-2 flex gap-2">
                                                            <ShieldAlert className="w-4 h-4 shrink-0" />
                                                            {chem.warnings.risks?.[0] || "Handle with care."}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-black rounded-xl border border-dashed border-slate-800">
                                    <XCircle className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                                    <h4 className="text-white font-bold">No Exact Match in Inventory</h4>
                                    <p className="text-slate-500 text-sm max-w-md mx-auto mt-2">
                                        We couldn't find a product in your active inventory tagged for <span className="text-purple-400">{contamination}</span>.
                                        Check "Chemicals Library" to see if you have products that need to be marked as "On Hand".
                                    </p>
                                </div>
                            )}
                        </Card>
                    )}

                </TabsContent>

                {/* --- WORKFLOW TRAINING --- */}
                <TabsContent value="workflow" className="animate-fade-in">
                    <Card className="p-8 bg-slate-900 text-white border-slate-800">
                        <div className="max-w-3xl mx-auto space-y-12">
                            <div className="text-center space-y-4">
                                <h2 className="text-3xl font-black tracking-tight">Chemical Setup Workflow</h2>
                                <p className="text-slate-400 text-lg">Follow this repeatable process before every service to ensure safety and efficiency.</p>
                            </div>

                            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
                                {[
                                    { title: "1. Inspect & Classify", desc: "Walk the vehicle. Assign Interior & Exterior Severity Levels (Light/Mod/Heavy).", icon: <ThermometerSun /> },
                                    { title: "2. Identify Contamination", desc: "Note specific issues: Bugs? Tar? Iron Fallout? Pet Hair?", icon: <AlertTriangle /> },
                                    { title: "3. Consult Decision System", desc: "Input your findings into the app. Let the system tell you WHICH chemical category is needed.", icon: <Sparkles /> },
                                    { title: "4. Select From Inventory", desc: "Choose ONLY products currently marked 'On Hand'. Do not guess or substitute.", icon: <CheckCircle2 /> },
                                    { title: "5. Dilute & Stage", desc: "Mix chemicals to the ratio shown. Place bottles in order of use (Wheels -> Pre-Wash -> Contact Wash).", icon: <Droplets /> },
                                ].map((step, i) => (
                                    <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-slate-900 bg-slate-800 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow shadow-black z-10 text-slate-400">
                                            {step.icon}
                                        </div>
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 rounded-xl border border-slate-800 bg-black/50 hover:bg-slate-900 transition-colors">
                                            <h3 className="font-bold text-lg mb-1">{step.title}</h3>
                                            <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                {/* --- LIBRARY (Conditions) --- */}
                <TabsContent value="library" className="animate-fade-in">
                    <div className="grid md:grid-cols-2 gap-6">
                        {Object.entries(ConditionDefinitions).map(([key, def]) => (
                            <Card key={key} className="p-6 bg-slate-900 border-slate-800">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-2xl font-black text-white">{key}</h3>
                                    <Badge variant="outline" className={key === 'Severe' ? 'text-red-500 border-red-900' : 'text-slate-500'}>
                                        {key === 'Severe' ? 'Professional Only' : 'Standard'}
                                    </Badge>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <span className="text-xs uppercase font-bold text-slate-500">Look For</span>
                                        <p className="text-slate-300 text-sm mt-1">{def.visual}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs uppercase font-bold text-slate-500">Feel</span>
                                        <p className="text-slate-300 text-sm mt-1">{def.feel}</p>
                                    </div>
                                    <div className="bg-red-950/20 p-3 rounded border border-red-900/30">
                                        <span className="text-xs uppercase font-bold text-red-500 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" /> Risk Factor
                                        </span>
                                        <p className="text-red-200 text-sm mt-1">{def.risks}</p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* --- GUIDES (Service Packages) --- */}
                <TabsContent value="guides" className="animate-fade-in">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            {
                                title: "Maintenance Wash",
                                steps: ["Wheels First", "Pre-Rinse", "Foam Bath", "2-Bucket Wash", "Dry", "Tire Dressing"],
                                chem: ["Wheel Cleaner", "Car Soap", "Tire Shine"],
                                time: "45-60 min"
                            },
                            {
                                title: "Enhancement Detail",
                                steps: ["Strip Wash", "Iron Decon", "Clay Bar", "1-Step Polish", "Panel Wipe", "Sealant"],
                                chem: ["Iron Remover", "Clay Lube", "Polish", "Isopropyl Alcohol", "Sealant"],
                                time: "3-4 hours"
                            },
                            {
                                title: "Interior Deep Clean",
                                steps: ["Trash Removal", "Vacuum", "Steam Vents", "Shampoo Carpets", "Clean Leather", "Clean Glass"],
                                chem: ["APC", "Carpet Bomber", "Leather Cleaner", "Glass Cleaner"],
                                time: "2-3 hours"
                            },
                            {
                                title: "Ceramic Coating",
                                steps: ["Paint Correction", "Double Panel Wipe", "Apply Coating (Crosshatch)", "Level/Buff", "24h Cure"],
                                chem: ["Compound", "Polish", "Surface Prep", "Ceramic Coating"],
                                time: "6-8 hours"
                            },
                            {
                                title: "Engine Bay Detail",
                                steps: ["Cover Alternator/intake", "Rinse (Low Pressure)", "Degrease & Agitate", "Rinse", "Blow Dry", "Dress Plastics"],
                                chem: ["Degreaser", "Plastic Dressing"],
                                time: "30-45 min"
                            },
                        ].map((guide, i) => (
                            <Card key={i} className="p-6 bg-slate-900 border-slate-800 flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-bold text-white">{guide.title}</h3>
                                    <Badge variant="outline" className="text-slate-400 border-slate-700">{guide.time}</Badge>
                                </div>

                                <div className="flex-1 space-y-4">
                                    <div>
                                        <span className="text-xs uppercase font-bold text-slate-500 mb-2 block">Workflow Steps</span>
                                        <ol className="list-decimal pl-4 space-y-1 text-sm text-slate-300">
                                            {guide.steps.map(s => <li key={s}>{s}</li>)}
                                        </ol>
                                    </div>

                                    <div className="pt-4 border-t border-slate-800">
                                        <span className="text-xs uppercase font-bold text-blue-400 mb-2 block flex items-center gap-1"><Beaker className="w-3 h-3" /> Required Chems</span>
                                        <div className="flex flex-wrap gap-1">
                                            {guide.chem.map(c => (
                                                <Badge key={c} variant="secondary" className="bg-slate-800 text-slate-300 hover:bg-slate-700 text-[10px]">{c}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
