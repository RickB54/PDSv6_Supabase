import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chemical } from "@/types/chemicals";
import { AlertTriangle, Droplet, Info, ShieldAlert } from "lucide-react";
import { useMemo } from "react";

interface ChemicalCardProps {
    chemical: Chemical;
    onClick: () => void;
}

export function ChemicalCard({ chemical, onClick }: ChemicalCardProps) {
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
                <div className="absolute top-2 right-2">
                    <Badge
                        variant="outline"
                        className="bg-black/80 backdrop-blur border-zinc-700 text-white font-bold"
                    >
                        {chemical.category}
                    </Badge>
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

                {/* Footer Actions */}
                <div className="mt-auto pt-3 border-t border-zinc-800/50 flex justify-between items-center text-xs text-zinc-500">
                    <span className="flex items-center">
                        {chemical.dilution_ratios?.length ? 'Has Dilution Data' : 'Ready to Use'}
                    </span>
                    <Button variant="ghost" size="sm" className="h-6 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 p-0 px-2">
                        View Card &rarr;
                    </Button>
                </div>
            </div>
        </Card>
    );
}
