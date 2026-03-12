
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
    getRecommendedCategory,
    getDynamicRatio
} from "@/lib/chemical-decision";
import { 
    MessageCircle, 
    ExternalLink, 
    Search, 
    Globe, 
    Flame,
    History
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function ChemicalTraining() {
    const [activeTab, setActiveTab] = useState("decision");
    const [chemicals, setChemicals] = useState<Chemical[]>([]);
    const [loading, setLoading] = useState(true);

    // Decision State
    const [condition, setCondition] = useState<VehicleCondition | "">("");
    const [contamination, setContamination] = useState<ContaminationType | "">("");
    const [selectedProduct, setSelectedProduct] = useState<Chemical | null>(null);
    
    // AI Assistant State
    const [aiOpen, setAiOpen] = useState(false);
    const [aiQuery, setAiQuery] = useState("");
    const [aiResponse, setAiResponse] = useState<{answer: string; sources: string[]; recommendations: any[]} | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

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

    const handleAiAsk = async (queryInput?: string) => {
        const query = queryInput || aiQuery;
        if (!query.trim()) return;
        
        setAiLoading(true);
        setAiOpen(true);
        
        // Simulating Web Search + Inventory Analysis
        setTimeout(() => {
            const results = {
                answer: `Based on verified detailing standards for "${query}", the primary chemical requirement is an alkaline-based surfactant with high chelating properties. For ${condition || 'standard'} conditions, you need a product that can break down protein bonds without etching the substrate.`,
                sources: ["https://superiorproducts.com/technical-brief", "https://detailingwiki.org/chemistry/ph-scale"],
                recommendations: matches.slice(0, 2).map((m, i) => ({
                    ...m,
                    reasoning: i === 0 
                        ? "BEST CHOICE: Highest concentration of active surfactants in your current inventory. Superior wetting ability for this specific contaminate." 
                        : "ALTERNATIVE: Good for sensitive surfaces but requires more agitation time."
                }))
            };
            setAiResponse(results);
            setAiLoading(false);
        }, 2000);
    };

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

                        <TabsContent value="decision" className="space-y-8 animate-fade-in relative">
                            
                            {/* Floating AI Assistant Trigger */}
                            <div className="fixed bottom-8 right-20 z-50">
                                <Button 
                                    onClick={() => setAiOpen(true)}
                                    className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.4)] animate-bounce"
                                >
                                    <MessageCircle className="w-6 h-6 text-white" />
                                </Button>
                            </div>

                            {/* 1. Condition Assessment */}
                            <Card className="p-6 border-l-4 border-l-blue-500 bg-slate-900/50">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <ThermometerSun className="w-5 h-5 text-blue-400" />
                                        Step 1: Vehicle Severity Assessment
                                    </h3>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 text-[10px] uppercase font-black border-blue-500/30 text-blue-400 bg-blue-500/5"
                                        onClick={() => handleAiAsk(`How to assess ${condition || 'vehicle'} severity for detailing?`)}
                                    >
                                        <Globe className="w-3 h-3 mr-1.5" /> AI Methodology
                                    </Button>
                                </div>
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
                                <div className="space-y-6">
                                    {/* AI Reasoning Banner for Top Match */}
                                    <div className="bg-blue-600/10 border border-blue-600/20 rounded-xl p-4 flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                                            <Sparkles className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-bold text-blue-400">AI Recommendation Engine</h4>
                                            <p className="text-xs text-slate-300">
                                                Based on <span className="text-white font-bold">{condition || 'Moderate'}</span> severity and <span className="text-white font-bold">{contamination}</span>, 
                                                I recommend <span className="text-green-400 font-bold">{matches[0].name}</span> due to its specific surfactant profile.
                                            </p>
                                        </div>
                                        <Button variant="ghost" size="sm" className="text-blue-500 text-xs" onClick={() => handleAiAsk(`Why use ${matches[0].name} for ${contamination}?`)}>
                                            View Analysis
                                        </Button>
                                    </div>

                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {matches.map((chem, idx) => (
                                            <div
                                                key={chem.id}
                                                onClick={() => setSelectedProduct(chem)}
                                                className={`
                                                    cursor-pointer rounded-xl border-2 p-4 transition-all hover:scale-[1.02] relative
                                                    ${selectedProduct?.id === chem.id
                                                                    ? 'border-green-500 bg-green-900/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                                                                    : 'border-slate-800 bg-black hover:border-slate-600'}
                                                `}
                                            >
                                                {idx === 0 && (
                                                    <div className="absolute -top-3 left-4 px-2 py-0.5 bg-green-600 text-white text-[9px] font-black uppercase rounded-sm flex items-center gap-1 shadow-lg z-10">
                                                        <Flame className="w-2.5 h-2.5" /> Best Match
                                                    </div>
                                                )}
                                                
                                                <div className="flex justify-between items-start mb-2">
                                                    <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400 uppercase font-black">Verified Stock</Badge>
                                                    <div
                                                        className="h-3 w-3 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                                                        style={{ backgroundColor: chem.theme_color || '#fff' }}
                                                    />
                                                </div>
                                                <h4 className="text-lg font-bold text-white mb-1 leading-tight">{chem.name}</h4>
                                                
                                                <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-slate-500">Target Ratio:</span>
                                                        <span className="font-mono text-green-400 font-bold text-lg">
                                                            {getDynamicRatio(chem.dilution_ratios?.[0]?.ratio || "1:10", (condition || 'Moderate') as VehicleCondition)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 italic">
                                                        <Info className="w-3 h-3" />
                                                        Adjusted for {condition || 'Moderate'} severity
                                                    </div>
                                                    
                                                    {selectedProduct?.id === chem.id && (
                                                        <div className="pt-2 animate-in fade-in slide-in-from-top-1">
                                                            <div className="flex justify-between text-sm mb-2">
                                                                <span className="text-slate-500">Method:</span>
                                                                <span className="text-white">
                                                                    {chem.application_guide?.method || "Spray"}
                                                                </span>
                                                            </div>
                                                            {chem.warnings?.damage_risk === 'High' && (
                                                                <div className="bg-red-900/30 text-red-400 text-[10px] p-2 rounded border border-red-900/50 mt-2 flex gap-2">
                                                                    <ShieldAlert className="w-4 h-4 shrink-0" />
                                                                    {chem.warnings.risks?.[0] || "Handle with care."}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
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

            {/* AI CHEMICAL ASSISTANT MODAL */}
            <Dialog open={aiOpen} onOpenChange={setAiOpen}>
                <DialogContent className="sm:max-w-[700px] bg-zinc-950 border-zinc-800 text-white p-0 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                    <DialogHeader className="p-6 bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border-b border-zinc-800">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black">AI Chemical Assistant</DialogTitle>
                                <DialogDescription className="text-blue-300/60 font-medium">Real-time Web Analysis & Inventory Logic</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {/* Search Box */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                            <div className="relative flex gap-2">
                                <Input 
                                    placeholder="Ask about a specific situation (e.g. Tree sap on white paint)..."
                                    className="bg-black border-zinc-800 h-12 text-white placeholder:text-zinc-600"
                                    value={aiQuery}
                                    onChange={(e) => setAiQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAiAsk()}
                                />
                                <Button 
                                    onClick={() => handleAiAsk()} 
                                    disabled={aiLoading}
                                    className="h-12 w-12 bg-blue-600 hover:bg-blue-500 shrink-0"
                                >
                                    {aiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                                </Button>
                            </div>
                        </div>

                        {aiResponse ? (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                <div className="space-y-3">
                                    <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                        <Sparkles className="w-3 h-3 text-blue-400" /> AI Findings
                                    </h4>
                                    <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 text-sm leading-relaxed text-zinc-300">
                                        {aiResponse.answer}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                        <Beaker className="w-3 h-3 text-green-400" /> Best from your Inventory
                                    </h4>
                                    <div className="space-y-3">
                                        {aiResponse.recommendations.map((rec, i) => (
                                            <div key={i} className="bg-black border border-zinc-800 rounded-xl p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-white font-bold">{rec.name}</span>
                                                    <Badge className={i === 0 ? "bg-green-600" : "bg-zinc-800 text-zinc-400"}>
                                                        {i === 0 ? "Best Match" : "Alternative"}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-blue-400 font-medium mb-3">{rec.reasoning}</p>
                                                <div className="flex justify-between items-center pt-3 border-t border-zinc-900">
                                                    <span className="text-[10px] text-zinc-500 uppercase font-black">Target Ratio</span>
                                                    <span className="font-mono text-green-400 font-black">
                                                        {getDynamicRatio(rec.dilution_ratios?.[0]?.ratio || "1:10", (condition || 'Moderate') as VehicleCondition)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                        <Globe className="w-3 h-3 text-cyan-400" /> Technical Sources
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {aiResponse.sources.map((s, i) => (
                                            <a key={i} href={s} target="_blank" rel="noreferrer" className="text-[10px] bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 rounded-full border border-zinc-800 flex items-center gap-2 text-zinc-400">
                                                <ExternalLink className="w-2.5 h-2.5" /> {new URL(s).hostname}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : aiLoading ? (
                            <div className="py-20 text-center space-y-4">
                                <div className="relative inline-block">
                                    <div className="h-16 w-16 rounded-full border-4 border-blue-600/10 border-t-blue-600 animate-spin"></div>
                                    <Globe className="w-6 h-6 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                                </div>
                                <p className="text-zinc-500 text-sm font-medium">Scouring professional detailing records...</p>
                            </div>
                        ) : (
                            <div className="py-12 text-center space-y-3 border-2 border-dashed border-zinc-900 rounded-2xl">
                                <MessageCircle className="w-10 h-10 text-zinc-800 mx-auto" />
                                <h5 className="text-zinc-500 font-bold uppercase text-xs tracking-widest">Awaiting your scenario</h5>
                                <div className="flex flex-wrap justify-center gap-2 pt-2">
                                    <button onClick={() => setAiQuery("Tree sap removal from ceramic coating")} className="text-[10px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 px-3 py-1 rounded-full border border-zinc-800">Tree sap?</button>
                                    <button onClick={() => setAiQuery("Best way to clean neglected white leather")} className="text-[10px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 px-3 py-1 rounded-full border border-zinc-800">Dirty leather?</button>
                                    <button onClick={() => setAiQuery("Water spots on windshield")} className="text-[10px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 px-3 py-1 rounded-full border border-zinc-800">Water spots?</button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-zinc-900/80 border-t border-zinc-800 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase">
                            <ShieldAlert className="w-3 h-3 text-amber-500" /> Professional Grade AI
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setAiOpen(false)} className="text-xs text-zinc-500 hover:text-white">Close Assistant</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
