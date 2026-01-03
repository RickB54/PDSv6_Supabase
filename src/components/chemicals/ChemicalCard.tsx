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
import { AlertTriangle, Droplet, Info, ShieldAlert, Trash2, Sparkles, Pencil, PlusCircle, Package } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateChemicalPartial } from "@/lib/chemicals";
import * as inventoryData from "@/lib/inventory-data";
import { useToast } from "@/hooks/use-toast";

interface ChemicalCardProps {
    chemical: Chemical;
    onClick: () => void;
    isAdmin?: boolean;
    onClick: () => void;
    isAdmin?: boolean;
    onDelete?: (id: string) => void;
    onUpdate?: () => void;
}

export function ChemicalCard({ chemical, onClick, isAdmin, onDelete, onUpdate }: ChemicalCardProps) {
    const { toast } = useToast();
    const [cost, setCost] = useState(chemical.default_cost?.toString() || "");
    const [size, setSize] = useState(chemical.default_size || "");
    const [isAdding, setIsAdding] = useState(false);

    const handleAddToInventory = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!cost && !size) {
            toast({ title: "Missing Data", description: "Please enter a cost or size.", variant: "destructive" });
            return;
        }

        setIsAdding(true);
        try {
            // 1. Save defaults to Knowledge Base
            await updateChemicalPartial(chemical.id, {
                default_cost: parseFloat(cost) || 0,
                default_size: size
            });
            if (onUpdate) onUpdate();

            // 2. Add to Inventory
            const newItem = {
                name: chemical.name,
                category: chemical.category,
                costPerBottle: parseFloat(cost) || 0,
                bottleSize: size || "16oz",
                currentStock: 0,
                threshold: 1,
                chemicalLibraryId: chemical.id,
                imageUrl: chemical.primary_image_url
            };

            await inventoryData.saveChemical(newItem as any);

            toast({
                title: "Added to Inventory",
                description: `${chemical.name} has been added to your inventory tracking.`,
                className: "bg-emerald-900 border-emerald-800 text-white"
            });
        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: "Failed to add to inventory", variant: "destructive" });
        } finally {
            setIsAdding(false);
        }
    };
    // Determine border/glow color based on theme_color or category
    const themeStyle = useMemo(() => {
        return {
            borderColor: chemical.theme_color,
            boxShadow: `0 0 10px -5px ${chemical.theme_color}40` // Subtle glow
        };
    }, [chemical.theme_color]);

    const riskLevel = chemical.warnings?.damage_risk;

    return (
        <Card
            className="overflow-hidden bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group flex flex-col h-full"
            style={{ borderLeft: `4px solid ${chemical.theme_color}` }}
            onClick={onClick}
        >
            {/* Image Area */}
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                {chemical.primary_image_url ? (
                    <img
                        src={chemical.primary_image_url}
                        alt={chemical.name}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-700">
                        <Droplet className="w-12 h-12 mb-2 opacity-20" />
                        <span className="text-xs uppercase font-bold tracking-widest">No Image</span>
                    </div>
                )}

                {/* Category Badge */}
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    <Badge
                        variant="outline"
                        className="bg-black/80 backdrop-blur border-zinc-700 text-white font-bold"
                    >
                        {chemical.category}
                    </Badge>

                    {/* AI Tracking Badge */}
                    {chemical.ai_generated && !chemical.manually_modified && (
                        <Badge className="bg-purple-900/80 backdrop-blur border-purple-700 text-purple-200 text-[10px] px-1.5 py-0.5">
                            <Sparkles className="w-2.5 h-2.5 mr-1" />
                            AI
                        </Badge>
                    )}
                    {chemical.ai_generated && chemical.manually_modified && (
                        <Badge className="bg-blue-900/80 backdrop-blur border-blue-700 text-blue-200 text-[10px] px-1.5 py-0.5">
                            <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                            AI +
                            <Pencil className="w-2.5 h-2.5 mx-0.5" />
                            Manual
                        </Badge>
                    )}
                    {!chemical.ai_generated && (
                        <Badge className="bg-green-900/80 backdrop-blur border-green-700 text-green-200 text-[10px] px-1.5 py-0.5">
                            <Pencil className="w-2.5 h-2.5 mr-1" />
                            Manual
                        </Badge>
                    )}
                </div>

                {/* Risk Indicator if High */}
                {riskLevel === 'High' && (
                    <div className="absolute bottom-2 left-2 bg-red-900/90 text-red-200 text-[10px] px-2 py-0.5 rounded font-bold uppercase flex items-center border border-red-700/50">
                        <ShieldAlert className="w-3 h-3 mr-1" />
                        High Risk
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
                    {chemical.name}
                </h3>
                {chemical.brand && (
                    <p className="text-xs text-zinc-500 uppercase tracking-wide font-semibold mb-3">
                        {chemical.brand}
                    </p>
                )}

                {/* Mandatory "Used For" List */}
                <div className="mb-4 flex-1">
                    <p className="text-[10px] text-zinc-400 uppercase font-bold mb-1 flex items-center">
                        <Info className="w-3 h-3 mr-1" /> Used For
                    </p>
                    <ul className="space-y-1">
                        {(chemical.used_for || []).slice(0, 3).map((use, idx) => (
                            <li key={idx} className="text-sm text-zinc-300 flex items-start">
                                <span className="mr-2 text-zinc-600">•</span>
                                {use}
                            </li>
                        ))}
                        {(chemical.used_for?.length || 0) > 3 && (
                            <li className="text-xs text-zinc-500 pl-3">
                                + {(chemical.used_for?.length || 0) - 3} more...
                            </li>
                        )}
                    </ul>
                </div>

                {/* Inventory Quick Actions */}
                <div className="px-4 py-3 bg-zinc-950/50 border-t border-zinc-800 space-y-3" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <Label className="text-[10px] uppercase text-zinc-500 font-bold">Cost ($)</Label>
                            <Input
                                value={cost}
                                onChange={e => setCost(e.target.value)}
                                className="h-7 text-xs bg-black border-zinc-800 focus:border-purple-500"
                                placeholder="0.00"
                                type="number"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div className="flex-1">
                            <Label className="text-[10px] uppercase text-zinc-500 font-bold">Size</Label>
                            <Input
                                value={size}
                                onChange={e => setSize(e.target.value)}
                                className="h-7 text-xs bg-black border-zinc-800 focus:border-purple-500"
                                placeholder="e.g. 16oz"
                            />
                        </div>
                    </div>
                    <Button
                        onClick={handleAddToInventory}
                        disabled={isAdding}
                        size="sm"
                        className="w-full h-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700"
                    >
                        {isAdding ? (
                            <span className="animate-pulse">Adding...</span>
                        ) : (
                            <>
                                <PlusCircle className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                                Add to Inventory
                            </>
                        )}
                    </Button>
                </div>

                {/* Footer Actions */}
                <div className="mt-auto pt-3 border-t border-zinc-800/50 flex justify-between items-center text-xs text-zinc-500">
                    <div className="flex items-center gap-2">
                        {isAdmin && onDelete && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-zinc-600 hover:text-red-500 hover:bg-red-900/10"
                                        onClick={(e) => e.stopPropagation()} // Prevent card click
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-red-500 flex items-center gap-2">
                                            <ShieldAlert className="w-5 h-5" />
                                            Delete Chemical?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className="text-zinc-400">
                                            Are you sure you want to delete <strong>{chemical.name}</strong>?
                                            <br />This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:text-white">Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(chemical.id);
                                            }}
                                            className="bg-red-600 hover:bg-red-700 text-white border-0"
                                        >
                                            Delete Forever
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                        <span className="flex items-center">
                            {chemical.dilution_ratios?.length ? 'Has Dilution Data' : 'Ready to Use'}
                        </span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 p-0 px-2">
                        View Card &rarr;
                    </Button>
                </div>
            </div>
        </Card>
    );
}
