
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowRight, Beaker, CheckCircle2, AlertTriangle, Info, ShieldAlert, ThermometerSun, Droplets, Sparkles, XCircle, Loader2, ShoppingCart, Calculator, ClipboardList, ChevronLeft, HelpCircle } from "lucide-react";
import { Chemical } from "@/types/chemicals";
import { getChemicals } from "@/lib/chemicals";
import { useNavigate } from "react-router-dom";
import {
    VehicleCondition,
    ContaminationType,
    ConditionDefinitions,
    findProductForContamination,
    getRecommendedCategory,
    getDynamicRatio,
    findSuggestedProducts,
    ContaminationToChemistry,
    PurchaseLinks
} from "@/lib/chemical-decision";
import { 
    MessageCircle, 
    ExternalLink, 
    Search, 
    Globe, 
    Flame,
    History,
    Edit2,
    Archive,
    Trash2,
    RotateCcw,
    X
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { JobPrepChecklist } from "@/components/chemicals/JobPrepChecklist";

export default function ChemicalTraining() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("decision");
    const [chemicals, setChemicals] = useState<Chemical[]>([]);
    const [loading, setLoading] = useState(true);

    // Decision State
    const [condition, setCondition] = useState<VehicleCondition | "">("");
    const [contaminationZone, setContaminationZone] = useState<'exterior' | 'interior'>('exterior');
    const [contamination, setContamination] = useState<ContaminationType | "">("");
    const [selectedProduct, setSelectedProduct] = useState<Chemical | null>(null);
    
    // AI Assistant State
    const [aiOpen, setAiOpen] = useState(false);
    const [aiQuery, setAiQuery] = useState("");
    const [aiResponse, setAiResponse] = useState<{answer: string; sources: string[]; recommendations: any[]} | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
    const [aiHistory, setAiHistory] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'chat' | 'history'>('chat');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
    useEffect(() => {
        (async () => {
            const list = await getChemicals();
            setChemicals(list);
            setLoading(false);
            
            // Load History
            const saved = localStorage.getItem('chemical_ai_history');
            if (saved) setAiHistory(JSON.parse(saved));
        })();
    }, []);

    const saveHistory = (items: any[]) => {
        setAiHistory(items);
        localStorage.setItem('chemical_ai_history', JSON.stringify(items));
    };
    const resetDecision = () => {
        setContamination("");
        setSelectedProduct(null);
    }

    const resetPage = () => {
        setCondition("");
        setContamination("");
        setSelectedProduct(null);
        setContaminationZone('exterior');
        toast.success("System reset successfully");
    }

    const matches = contamination ? findProductForContamination(contamination as ContaminationType, chemicals) : [];
    const suggestions = contamination ? findSuggestedProducts(contamination as ContaminationType, chemicals) : [];
    const recommendedCategory = contamination ? getRecommendedCategory(contamination as ContaminationType) : "";

    const handleAiAsk = async (queryInput?: string) => {
        const query = queryInput || aiQuery;
        if (!query.trim()) return;
        
        setAiLoading(true);
        setAiOpen(true);
        setAiQuery(""); // Clear input
        
        // Update local chat history (Clear previous and show only current)
        const newUserMessage = { role: 'user' as const, content: query };
        setChatMessages([newUserMessage]);
        
        // Simulating Web Search + Inventory Analysis
        setTimeout(() => {
            let answer = "";
            let sources = ["https://superiorproducts.com/technical-brief", "https://detailingwiki.org/chemistry/ph-scale"];
            
            const lowerQuery = query.toLowerCase();
            const hasMatches = matches.length > 0;
            const topMatch = matches[0];
            
            // 0. Memory/Frustration Awareness
            if (lowerQuery.includes("repeat") || lowerQuery.includes("stop") || lowerQuery.includes("already said")) {
                answer = `Understood. I'll skip the intro. For your ${contamination || 'current'} task, the specific chemical logic is focused on ${hasMatches ? topMatch.name : 'alkaline-heavy'} surfactants. You need to verify the substrate's heat threshold before application. Let's look at the shelf list below for the exact concentration rates.`;
            }
            // 1. "Show Me" / Direct Recommendation requests
            else if (lowerQuery.includes("show me") || lowerQuery.includes("what chemical") || lowerQuery.includes("suggest") || lowerQuery.includes("give me")) {
                if (hasMatches) {
                    answer = `Direct Stock Match: Based on your inventory, **${topMatch.name}** is the primary solution. It has the correct surface tension for ${contamination || 'this contamination'}. ${topMatch.is_on_hand ? 'It is currently on your shelf.' : 'Note: This is an out-of-stock suggestion from the catalog.'}`;
                } else {
                    answer = "Consultant Analysis: I don't see an exact Ph-match in your current stock for ${contamination || 'this'}. I recommend looking for a high-alkaline pre-wash in the suggested catalog below. For this specific job, look for a dilution capability of at least 1:10.";
                }
            }
            // 2. Comparison/Substitution Logic
            else if (lowerQuery.includes("instead of") || lowerQuery.includes("vs") || lowerQuery.includes("better than") || lowerQuery.includes("alternative")) {
                if (lowerQuery.includes("dirt buster") && lowerQuery.includes("dark fury")) {
                    answer = "Technical Substitution Warning: Dirt Buster is a Ph-Neutral safe cleaner designed for interiors and light maintenance. Using it instead of Dark Fury for heavy contamination (like road film or wheels) will fail because it lacks the inorganic chelating agents needed to break mineral bonds. Dark Fury's high-alkaline profile is required to emulsify traffic film effectively.";
                } else {
                    answer = "When choosing an alternative, prioritize the Ph-Level compatibility. Substituting a neutral cleaner for an alkaline-requirement scene will result in traffic film remaining on the surface, which blocks your sealants from bonding correctly.";
                }
            } 
            // 3. Damage/Safety Analysis
            else if (lowerQuery.includes("damage") || lowerQuery.includes("safe") || lowerQuery.includes("risk") || lowerQuery.includes("paint")) {
                if (lowerQuery.includes("compound") || lowerQuery.includes("polish")) {
                    answer = "Paint Safety Alert: Using a hard compound carries a severe risk of depletion of the clear coat if not measured with a depth gauge. Hard compounds are abrasive; if you generate too much heat or stay in one spot too long, you can 'strike through' the clear coat. Always start with the least aggressive method (Test Spot) before moving to a hard compound.";
                    sources.push("https://detailingwiki.org/paint-correction/clear-coat-thickness");
                } else if (lowerQuery.includes("etch") || lowerQuery.includes("burn")) {
                    answer = "Chemical etching usually occurs when high-Ph chemicals (like APC or Wheel Cleaners) dry on a hot surface. This creates a permanent mark in the clear coat that usually requires machine polishing to level. Pro-tip: Never work in direct sunlight on hot panels.";
                } else {
                    answer = "Surface safety depends on substrate temperature and chemical Ph. Always verify if the surface is cool to the touch. Most damage in detailing comes from using the wrong Ph-level for sensitive metals (like raw aluminum) or letting chemicals dry on the paint.";
                }
            }
            // 4. Assessment / Severity Guidance
            else if (lowerQuery.includes("assess") || lowerQuery.includes("severity") || lowerQuery.includes("condition")) {
                answer = "To assess vehicle severity accurately: 1. Visual Inspection (Check for 'Traffic Film' - the grey haze that doesn't come off with water). 2. Surface Feel (Use the 'Baggie Test' to check for embedded contaminants). 3. Substrate Check (Identify if the panel is plastic, aluminum, or painted). 'Severe' conditions require low-Ph followed by high-Ph (Dual Stage) washing to reset the surface.";
            }
            // 5. Specific Contamination Logic (Interior focused)
            else if (lowerQuery.includes("carpet") || lowerQuery.includes("food") || lowerQuery.includes("stain") || lowerQuery.includes("interior") || lowerQuery.includes("upholstery")) {
                answer = "Interior Technical Logic: Cleaning carpets or upholstery with food stains requires an enzyme-based surfactant or a dedicated carpet shampoo (like Carpet Bomber). Since you're dealing with organic matter, the goal is to break the protein bonds. Do not use high-alkaline wheel cleaners (like Dark Fury) on fabric as it can leave a high-Ph residue that causes skin irritation or fiber browning. Use a drill brush for agitation followed by a hot water extraction for best results.";
            }
            // 6. Specific Contamination Logic (Exterior focused)
            else if (lowerQuery.includes("sap") || lowerQuery.includes("tar") || lowerQuery.includes("bugs")) {
                answer = `Removing ${lowerQuery.includes("sap") ? "Tree Sap" : "Organic Matter"} requires a solvent-based approach. Alcohol-based cleaners break the resin bonds, while alkaline pre-washes soften the exterior shell. Do not scrub; let the chemistry do the work to avoid marring the finish.`;
            }
            // 7. Fallback (Improved)
            else {
                const stateContext = lowerQuery.includes(String(contamination).toLowerCase()) ? `involving ${contamination}` : "involving your current scenario";
                answer = `Technical Analysis for "${query}": For detailing scenarios ${stateContext} at ${condition || 'Moderate'} severity, you must prioritize the Ph-Balance of the solution relative to the substrate. If you are working on paint, ensure the chemical does not exceed a Ph of 12.0 for more than 5 minutes. If working on sensitive metals, stay near Ph-Neutral (7.0). I've highlighted the most compatible items from your list below.`;
            }

            const results = {
                answer,
                sources,
                recommendations: matches.slice(0, 2).map((m, i) => ({
                    ...m,
                    reasoning: i === 0 
                        ? "TOP TIER: Matches the exact chemical profile needed for this specific contaminate." 
                        : "BACKUP OPTION: Safe alternative but may require 20% more product or physical agitation."
                }))
            };
            
            const newHistoryItem = {
                id: Math.random().toString(36).substr(2, 9),
                timestamp: new Date().toISOString(),
                query,
                answer,
                sources,
                recommendations: results.recommendations,
                archived: false
            };
            
            saveHistory([newHistoryItem, ...aiHistory]);
            setChatMessages(prev => [...prev, { role: 'assistant', content: answer }]);
            setAiResponse(results);
            setAiLoading(false);
            
            toast.success("Response saved to history");
        }, 1500);
    };

    const deleteHistoryItem = (id: string) => {
        const updated = aiHistory.filter(item => item.id !== id);
        saveHistory(updated);
        toast.info("Conversation deleted");
    };

    const archiveHistoryItem = (id: string) => {
        const updated = aiHistory.map(item => item.id === id ? { ...item, archived: !item.archived } : item);
        saveHistory(updated);
        toast.info(updated.find(i => i.id === id).archived ? "Archived" : "Restored");
    };

    const updateHistoryItem = (id: string, newQuery: string) => {
        const updated = aiHistory.map(item => item.id === id ? { ...item, query: newQuery } : item);
        saveHistory(updated);
        setEditingId(null);
        toast.success("Updated");
    };

    return (
        <div className="min-h-screen bg-black pb-20">
            <PageHeader title="Chemical Decision System" />

            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 shadow-2xl">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600/20 rounded-xl border border-blue-500/30">
                            <Beaker className="w-8 h-8 text-blue-400" />
                        </div>
                        <div className="flex flex-row items-center gap-4">
                            <div>
                                <h1 className="text-3xl font-black text-white tracking-tight italic">CHEMICAL DECISION SYSTEM</h1>
                                <p className="text-zinc-400 text-sm font-medium">Precision chemistry for a perfect finish.</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'chemical-decision-system' } }))}
                                className="text-zinc-500 hover:text-blue-400 h-10 w-10 mt-1"
                                title="Help Guide"
                            >
                                <HelpCircle className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            onClick={() => navigate('/dilution-calculator')} 
                            className="bg-green-600/10 border-green-500/30 text-green-400 hover:bg-green-600 hover:text-white font-black italic tracking-tighter"
                        >
                            <Calculator className="w-4 h-4 mr-2" /> DILUTION CALCULATOR
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => resetPage()}
                            className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 font-bold"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" /> Reset System
                        </Button>
                    </div>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-2 lg:grid-cols-5 h-auto gap-2 bg-transparent p-0 mb-8">
                    <TabsTrigger value="decision" className="bg-zinc-900 border border-zinc-800 data-[state=active]:bg-blue-600 data-[state=active]:text-white h-10 text-[10px] md:text-sm">Universal Decision System</TabsTrigger>
                    <TabsTrigger value="workflow" className="bg-zinc-900 border border-zinc-800 data-[state=active]:bg-blue-600 data-[state=active]:text-white h-10 text-[10px] md:text-sm">Setup Workflow (Training)</TabsTrigger>
                    <TabsTrigger value="library" className="bg-zinc-900 border border-zinc-800 data-[state=active]:bg-blue-600 data-[state=active]:text-white h-10 text-[10px] md:text-sm">Condition Library</TabsTrigger>
                    <TabsTrigger value="guides" className="bg-zinc-900 border border-zinc-800 data-[state=active]:bg-blue-600 data-[state=active]:text-white h-10 text-[10px] md:text-sm">Service Packages</TabsTrigger>
                    <TabsTrigger value="prep" className="bg-zinc-900 border border-zinc-800 data-[state=active]:bg-purple-600 data-[state=active]:text-white h-10 text-[10px] md:text-sm flex items-center gap-2">
                        <ClipboardList className="w-4 h-4" /> Job Prep
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="decision" className="space-y-8 animate-fade-in relative">
                    
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
                                <Sparkles className="w-3 h-3 mr-1.5" /> AI Consultant
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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

                            <div className="space-y-6">
                                <div className="flex gap-2 p-1 bg-black/40 rounded-lg w-fit">
                                    <Button 
                                        variant={contaminationZone === 'exterior' ? 'default' : 'ghost'} 
                                        size="sm"
                                        onClick={() => { setContaminationZone('exterior'); setContamination(""); }}
                                        className={`h-8 text-[10px] font-black uppercase ${contaminationZone === 'exterior' ? 'bg-blue-600' : 'text-zinc-500'}`}
                                    >
                                        Exterior
                                    </Button>
                                    <Button 
                                        variant={contaminationZone === 'interior' ? 'default' : 'ghost'} 
                                        size="sm"
                                        onClick={() => { setContaminationZone('interior'); setContamination(""); }}
                                        className={`h-8 text-[10px] font-black uppercase ${contaminationZone === 'interior' ? 'bg-purple-600' : 'text-zinc-500'}`}
                                    >
                                        Interior
                                    </Button>
                                </div>

                                <div className="grid md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="text-sm font-bold text-slate-400 mb-2 block uppercase">Select {contaminationZone} Type</label>
                                        <Select value={contamination} onValueChange={(v) => { setContamination(v as ContaminationType); setSelectedProduct(null); }}>
                                            <SelectTrigger className="bg-black border-slate-700 h-12 text-lg">
                                                <SelectValue placeholder={`What ${contaminationZone} issue?`} />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 text-white border-slate-800">
                                                {Object.values(ContaminationType)
                                                    .filter(t => ContaminationToChemistry[t as ContaminationType]?.type === contaminationZone)
                                                    .map((t) => (
                                                        <SelectItem key={t} value={t} className="focus:bg-slate-800 focus:text-white cursor-pointer py-3">
                                                            {t}
                                                        </SelectItem>
                                                    ))
                                                }
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {contamination && (
                                        <div className={`bg-${contaminationZone === 'exterior' ? 'blue' : 'purple'}-900/20 border border-${contaminationZone === 'exterior' ? 'blue' : 'purple'}-500/30 rounded-xl p-4 flex flex-col justify-center animate-in zoom-in-95 relative group`}>
                                            <span className={`text-xs font-bold text-${contaminationZone === 'exterior' ? 'blue' : 'purple'}-400 uppercase tracking-widest mb-1`}>Primary Chemistry Required</span>
                                            <div className="text-2xl font-black text-white">{recommendedCategory}</div>
                                            
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="mt-3 h-8 text-[10px] font-black uppercase border-white/20 hover:bg-white/10"
                                                onClick={() => setPurchaseModalOpen(true)}
                                            >
                                                <ShoppingCart className="w-3.5 h-3.5 mr-2" /> Where to Buy
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* 3. Product Selection */}
                    {contamination && (
                        <Card className="p-6 border-l-4 border-l-green-500 bg-slate-900/50 animate-in fade-in slide-in-from-bottom-4">
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Beaker className="w-5 h-5 text-green-400" />
                                    Step 3: Inventory Selection
                                </h3>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 text-[10px] uppercase font-black border-purple-500/30 text-purple-400 bg-purple-500/5"
                                    onClick={() => setAiOpen(true)}
                                >
                                    <Sparkles className="w-3 h-3 mr-1.5" /> Chemical AI
                                </Button>
                            </div>

                            <div className="space-y-10">
                                {/* SECTION A: IN INVENTORY */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-500 tracking-widest pl-1">
                                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                        On-Hand Inventory Matches
                                    </div>
                                    
                                    {matches.length > 0 ? (
                                        <div className="space-y-6">
                                            {/* AI Reasoning Banner for Top Match */}
                                            <div className="bg-blue-600/10 border border-blue-600/20 rounded-xl p-4 flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                                                    <Sparkles className="w-5 h-5 text-white" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-bold text-blue-400">Inventory Recommendation</h4>
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
                                        <div className="text-center py-8 bg-black/40 rounded-xl border border-dashed border-slate-800">
                                            <XCircle className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                                            <h4 className="text-slate-400 font-bold text-sm">No Matches in Inventory</h4>
                                        </div>
                                    )}
                                </div>

                                {/* SECTION B: SUGGESTIONS */}
                                {(suggestions.length > 0 || matches.length === 0) && (
                                    <div className="space-y-4 pt-6 border-t border-slate-800/50">
                                        <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-500 tracking-widest pl-1">
                                            <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                            Professional Catalog Additions (Not in Stock)
                                        </div>
                                        
                                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                                            {suggestions.map((chem) => (
                                                <div
                                                    key={chem.id}
                                                    className="rounded-xl border border-dashed border-slate-700 bg-zinc-900/30 p-4 relative overflow-hidden flex flex-col justify-between min-h-[140px]"
                                                >
                                                    <div>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <Badge variant="outline" className="text-[9px] border-amber-900/50 text-amber-600/80 uppercase font-black">Out of Stock</Badge>
                                                            <div
                                                                className="h-3 w-3 rounded-full opacity-30"
                                                                style={{ backgroundColor: chem.theme_color || '#fff' }}
                                                            />
                                                        </div>
                                                        <h4 className="text-md font-bold text-slate-300 mb-1 leading-tight">{chem.name}</h4>
                                                        <p className="text-[10px] text-slate-500 line-clamp-2 italic mb-3">Target: {recommendedCategory}</p>
                                                    </div>
                                                    
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="h-7 text-[10px] border-slate-700 bg-slate-800/20 text-slate-500 hover:text-white"
                                                        onClick={() => handleAiAsk(`Tell me about ${chem.name} and why it's good for ${contamination}`)}
                                                    >
                                                        AI Comparison
                                                    </Button>
                                                </div>
                                            ))}
                                            
                                            {suggestions.length === 0 && (
                                                <div className="col-span-full py-6 text-center text-xs text-slate-600 italic">
                                                    No additional suggestions found in the full catalog.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
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
                
                <TabsContent value="prep" className="animate-fade-in outline-none">
                    <JobPrepChecklist />
                </TabsContent>
            </Tabs>

            {/* AI CHEMICAL ASSISTANT MODAL */}
            <Dialog open={aiOpen} onOpenChange={setAiOpen}>
                <DialogContent className="sm:max-w-[700px] bg-zinc-950 border-zinc-800 text-white p-0 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                    <DialogHeader className="p-6 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-b border-zinc-800">
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-purple-600 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-black">Chemical AI Consultant</DialogTitle>
                                    <DialogDescription className="text-purple-300/60 font-medium">Real-time Web Analysis & Inventory Logic</DialogDescription>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {(chatMessages.length > 0 || aiResponse) && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => {
                                            setChatMessages([]);
                                            setAiResponse(null);
                                            setAiQuery("");
                                        }}
                                        className="text-[10px] font-black uppercase tracking-tighter text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                                    >
                                        <XCircle className="w-3 h-3 mr-1" /> Clear Chat
                                    </Button>
                                )}
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => setViewMode(viewMode === 'chat' ? 'history' : 'chat')}
                                    className={`text-[10px] font-black uppercase tracking-tighter ${viewMode === 'history' ? 'bg-purple-900/40 text-purple-400' : 'text-zinc-500'}`}
                                >
                                    <History className="w-3 h-3 mr-1" /> {viewMode === 'history' ? "Back to Chat" : `History (${aiHistory.length})`}
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-zinc-500 hover:text-purple-400 hover:bg-purple-900/20"
                                    title="How to use the AI Agent"
                                    onClick={() => {
                                        window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'ai-chemical-assistant' } }));
                                    }}
                                >
                                    <Info className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {viewMode === 'history' ? (
                            <div className="space-y-4">
                                {aiHistory.length === 0 ? (
                                    <div className="py-20 text-center text-zinc-600 italic">No saved conversations yet.</div>
                                ) : (
                                    aiHistory.map((item) => (
                                        <div key={item.id} className={`bg-zinc-900/50 border rounded-xl overflow-hidden transition-all ${item.archived ? 'border-zinc-800 opacity-60' : 'border-zinc-800 hover:border-purple-900/50'}`}>
                                            <div className="p-4 flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    {editingId === item.id ? (
                                                        <div className="flex gap-2">
                                                            <Input 
                                                                value={editValue} 
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                className="bg-black border-zinc-700 h-8 text-xs"
                                                            />
                                                            <Button size="sm" className="h-8 bg-purple-600" onClick={() => updateHistoryItem(item.id, editValue)}>Save</Button>
                                                        </div>
                                                    ) : (
                                                        <h5 className="text-sm font-bold text-white truncate">{item.query}</h5>
                                                    )}
                                                    <p className="text-[10px] text-zinc-500 mt-1 uppercase font-black">{new Date(item.timestamp).toLocaleDateString()} @ {new Date(item.timestamp).toLocaleTimeString()}</p>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-white" onClick={() => {
                                                        setEditingId(item.id);
                                                        setEditValue(item.query);
                                                    }}><Edit2 className="w-3.5 h-3.5" /></Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-purple-400" onClick={() => archiveHistoryItem(item.id)}>
                                                        {item.archived ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                                                    </Button>
                                                    
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
                                                                <AlertDialogDescription className="text-zinc-500">
                                                                    This will permanently remove this response from your technical history. This action cannot be undone.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel className="bg-zinc-900 border-zinc-800">Cancel</AlertDialogCancel>
                                                                <AlertDialogAction className="bg-red-600 hover:bg-red-700 border-none" onClick={() => deleteHistoryItem(item.id)}>Delete Permanently</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>

                                                    <Button size="sm" variant="outline" className="h-7 border-zinc-800 text-[10px] ml-2" onClick={() => {
                                                        setAiResponse({ answer: item.answer, sources: item.sources, recommendations: item.recommendations });
                                                        setChatMessages([
                                                            { role: 'user', content: item.query },
                                                            { role: 'assistant', content: item.answer }
                                                        ]);
                                                        setViewMode('chat');
                                                    }}>Review</Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <>
                                {/* Conversation History */}
                                {chatMessages.length > 0 && (
                                    <div className="space-y-4 mb-6">
                                        {chatMessages.map((msg, i) => (
                                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`
                                                    max-w-[85%] rounded-2xl px-4 py-3 text-sm
                                                    ${msg.role === 'user' 
                                                        ? 'bg-purple-600 text-white rounded-tr-none' 
                                                        : 'bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-none'}
                                                `}>
                                                    {msg.content}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Search Box */}
                                <div className="relative group sticky top-0 z-10">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
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
                                            className="h-12 w-12 bg-purple-600 hover:bg-purple-500 shrink-0"
                                        >
                                            {aiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                                        </Button>
                                    </div>
                                </div>

                                {aiResponse && !aiLoading ? (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 pt-6">
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                                <Beaker className="w-3 h-3 text-green-400" /> Best from your Inventory
                                            </h4>
                                            <div className="grid gap-3">
                                                {aiResponse.recommendations.map((rec, i) => (
                                                    <div key={i} className="bg-black border border-zinc-800 rounded-xl p-4">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="text-white font-bold">{rec.name}</span>
                                                            <Badge className={i === 0 ? "bg-green-600" : "bg-zinc-800 text-zinc-400"}>
                                                                {i === 0 ? "Best Match" : "Alternative"}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-purple-400 font-medium mb-3">{rec.reasoning}</p>
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
                                            <div className="h-16 w-16 rounded-full border-4 border-purple-600/10 border-t-purple-600 animate-spin"></div>
                                            <Globe className="w-6 h-6 text-purple-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
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
                            </>
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

            {/* Purchase Options Modal */}
            <Dialog open={purchaseModalOpen} onOpenChange={setPurchaseModalOpen}>
                <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-blue-500" />
                            Purchase Guide: {recommendedCategory}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Professional-grade recommendations for {contamination}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {PurchaseLinks[recommendedCategory] ? (
                            PurchaseLinks[recommendedCategory].map((item, idx) => (
                                <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                                    <h5 className="font-bold text-sm mb-3">{item.product}</h5>
                                    <div className="flex flex-wrap gap-2">
                                        {item.links.map((link, lIdx) => (
                                            <a 
                                                key={lIdx} 
                                                href={link.url} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black border border-slate-700 hover:border-blue-500 hover:bg-blue-500/10 text-[10px] font-black uppercase transition-all"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                {link.store}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-8 text-center text-slate-500 italic">
                                Search Amazon or The Rag Company for generic {recommendedCategory}.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
