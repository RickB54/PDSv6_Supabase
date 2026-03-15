import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Chemical } from "@/types/chemicals";
import { AlertTriangle, Droplet, Info, ShieldAlert, Trash2, Sparkles, Pencil, PlusCircle, Package, Check, Images, Calculator } from "lucide-react";
import { ChemicalGalleryModal } from "./ChemicalGalleryModal";
import { useMemo, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateChemicalPartial } from "@/lib/chemicals";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface ChemicalCardProps {
    chemical: Chemical;
    onClick?: () => void;
    isAdmin?: boolean;
    onDelete?: (id: string) => void;
    onUpdate?: () => void;
}

export function ChemicalCard({ chemical, onClick, isAdmin, onDelete, onUpdate }: ChemicalCardProps) {
    const { toast } = useToast();
    const navigate = useNavigate();
    const initialConfig = useMemo(() => {
        try {
            return chemical.user_notes ? JSON.parse(chemical.user_notes) : {};
        } catch {
            return {};
        }
    }, [chemical.user_notes]);

    const [cost, setCost] = useState(initialConfig.cost?.toString() || "");
    const [size, setSize] = useState(initialConfig.size || "");
    const [isAdding, setIsAdding] = useState(false);
    const [galleryOpen, setGalleryOpen] = useState(false);

    useEffect(() => {
        setCost(initialConfig.cost?.toString() || "");
        setSize(initialConfig.size || "");
    }, [initialConfig]);

    const handleAddToInventory = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!cost || !size) {
            toast({ title: "Missing Info", description: "Please enter cost and size.", variant: "destructive" });
            return;
        }

        setIsAdding(true);
        try {
            const updatedNotes = JSON.stringify({
                ...initialConfig,
                cost: parseFloat(cost),
                size: size,
                lastUpdated: new Date().toISOString()
            });

            const { error } = await updateChemicalPartial(chemical.id, { user_notes: updatedNotes });
            if (error) throw error;

            toast({ title: "Added to Inventory" });
            if (onUpdate) onUpdate();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsAdding(false);
        }
    };

    const sideColor = chemical.theme_color || "#3b82f6";
    const riskLevel = chemical.warnings?.damage_risk;

    return (
        <>
            <Card
                className="overflow-hidden bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group flex flex-col h-full"
                style={{ borderLeft: `4px solid ${sideColor}` }}
                onClick={onClick}
            >
                <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                    {chemical.primary_image_url ? (
                        <img src={chemical.primary_image_url} alt={chemical.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-zinc-700">
                            <Droplet className="w-12 h-12 mb-2 opacity-20" />
                            <span className="text-xs uppercase font-bold tracking-widest">No Image</span>
                        </div>
                    )}

                    {(initialConfig.cost !== undefined || (cost && size)) && (
                        <div className="absolute top-2 left-2 z-10">
                            <Badge className="bg-emerald-600 border-emerald-500 text-white font-bold shadow-lg shadow-black/50 text-[10px] px-1.5 py-0.5 flex items-center gap-1 hover:bg-emerald-500">
                                <Check className="w-3 h-3 text-white stroke-2" /> Configured
                            </Badge>
                        </div>
                    )}

                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
                        <Badge variant="outline" className="bg-black/80 backdrop-blur border-zinc-700 text-white font-bold">
                            {chemical.category}
                        </Badge>
                        {chemical.ai_generated && (
                            <Badge className="bg-purple-900/80 backdrop-blur border-purple-700 text-purple-200 text-[10px] px-1.5 py-0.5">
                                <Sparkles className="w-2.5 h-2.5 mr-1" /> AI {chemical.manually_modified && "+ Manual"}
                            </Badge>
                        )}
                        {(chemical as any).is_inventory_only && (
                            <Badge className="bg-amber-900/80 backdrop-blur border-amber-700 text-amber-200 text-[10px] px-1.5 py-0.5 uppercase font-bold animate-pulse">
                                New Product
                            </Badge>
                        )}
                    </div>

                    {riskLevel === 'High' && (
                        <div className="absolute bottom-2 left-2 bg-red-900/90 text-red-200 text-[10px] px-2 py-0.5 rounded font-bold uppercase flex items-center border border-red-700/50">
                            <ShieldAlert className="w-3 h-3 mr-1" /> High Risk
                        </div>
                    )}

                    <div className="absolute bottom-2 right-2 z-10">
                        <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8 bg-black/60 hover:bg-purple-600 text-white border-zinc-700/50 backdrop-blur-sm"
                            onClick={(e) => { e.stopPropagation(); setGalleryOpen(true); }}
                        >
                            <Images className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div className="p-4 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{chemical.name}</h3>
                    {chemical.brand && <p className="text-xs text-zinc-500 uppercase tracking-wide font-semibold mb-3">{chemical.brand}</p>}

                    <div className="mb-4 flex-1">
                        <p className="text-[10px] text-zinc-400 uppercase font-bold mb-1 flex items-center">
                            <Info className="w-3 h-3 mr-1" /> Used For
                        </p>
                        <ul className="space-y-1">
                            {(chemical.used_for || []).slice(0, 3).map((use, idx) => (
                                <li key={idx} className="text-sm text-zinc-300 flex items-start">
                                    <span className="mr-2 text-zinc-600">•</span> {use}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {isAdmin && (
                        <div className="px-4 py-3 bg-zinc-950/50 border-t border-zinc-800 space-y-3 mt-2" onClick={e => e.stopPropagation()}>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Label className="text-[10px] uppercase text-zinc-500 font-bold">Cost ($)</Label>
                                    <Input value={cost} onChange={e => setCost(e.target.value)} className="h-7 text-xs bg-black border-zinc-800" placeholder="0.00" type="number" />
                                </div>
                                <div className="flex-1">
                                    <Label className="text-[10px] uppercase text-zinc-500 font-bold">Size</Label>
                                    <Input value={size} onChange={e => setSize(e.target.value)} className="h-7 text-xs bg-black border-zinc-800" placeholder="e.g. 16oz" />
                                </div>
                            </div>
                            <Button onClick={handleAddToInventory} disabled={isAdding} size="sm" className="w-full h-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-300">
                                {isAdding ? "Adding..." : "Add to Inventory"}
                            </Button>
                        </div>
                    )}

                    <div className="mt-auto pt-3 border-t border-zinc-800/50 flex justify-between items-center text-xs text-zinc-500">
                        <div className="flex items-center gap-2">
                            {isAdmin && onDelete && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-600 hover:text-red-500" onClick={e => e.stopPropagation()}><Trash2 className="w-3.5 h-3.5" /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="text-red-500">Delete Chemical?</AlertDialogTitle>
                                            <AlertDialogDescription className="text-zinc-400">Are you sure you want to delete <strong>{chemical.name}</strong>?</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="bg-zinc-900 border-zinc-800 text-white">Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={(e) => { e.stopPropagation(); onDelete(chemical.id); }} className="bg-red-600 hover:bg-red-700">Delete Forever</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                            <span className="flex items-center">
                                {chemical.dilution_ratios?.length ? 'Has Dilution Data' : 'Ready to Use'}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            {chemical.dilution_ratios?.length ? (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 text-green-400 hover:text-green-300 hover:bg-green-900/20 p-0 px-2 flex items-center gap-1"
                                    onClick={(e) => { e.stopPropagation(); navigate('/dilution-calculator'); }}
                                >
                                    <Calculator className="w-3 h-3" /> Calc
                                </Button>
                            ) : null}
                            <Button variant="ghost" size="sm" className="h-6 text-blue-400 hover:text-blue-300 p-0 px-2">View Card &rarr;</Button>
                        </div>
                    </div>
                </div>
            </Card>

            <ChemicalGalleryModal
                chemical={chemical}
                open={galleryOpen}
                onOpenChange={setGalleryOpen}
                isAdmin={isAdmin}
                onUpdate={onUpdate}
            />
        </>
    );
}
