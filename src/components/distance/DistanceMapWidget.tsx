import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Navigation, MapPin, ExternalLink, Compass, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DistanceMapWidgetProps {
    initialAddress?: string;
    onDistanceCalculated?: (miles: number) => void;
    theme?: 'dark' | 'light';
    shopAddress?: string;
    shopLat?: number;
    shopLng?: number;
}

const DEFAULT_SHOP_ADDRESS = "54 Boston Street, Methuen MA 01844";
const DEFAULT_SHOP_LAT = 42.7224;
const DEFAULT_SHOP_LNG = -71.1529;

export const DistanceMapWidget: React.FC<DistanceMapWidgetProps> = ({
    initialAddress = '',
    onDistanceCalculated,
    theme = 'dark',
    shopAddress = DEFAULT_SHOP_ADDRESS,
    shopLat = DEFAULT_SHOP_LAT,
    shopLng = DEFAULT_SHOP_LNG
}) => {
    const [isOpen, setIsOpen] = useState(false);
    
    // Helper to sanitize origin address so destination is NEVER appended
    const sanitizeOriginAddress = (rawAddress: string, shopAddr: string = shopAddress): string => {
        if (!rawAddress) return '';
        let clean = rawAddress.trim();
        
        // Remove common non-address status keywords
        if (clean.toLowerCase().includes('calculated distance') || clean.toLowerCase().includes('at shop')) {
            return '';
        }

        // Strip out concatenated destination if present (e.g. "94 Main St, North Andover, MA to 54 Boston Street, Methuen MA")
        const toMatch = clean.match(/^(.*?)\s+to\s+.*$/i);
        if (toMatch && toMatch[1]) {
            clean = toMatch[1].trim();
        }

        // Also check explicit shop address substring match
        const shopToken = shopAddr.split(',')[0].trim();
        if (shopToken && clean.toLowerCase().includes(shopToken.toLowerCase())) {
            const idx = clean.toLowerCase().indexOf(shopToken.toLowerCase());
            if (idx > 0) {
                const before = clean.substring(0, idx).replace(/\s+(to|-|at)\s*$/i, '').trim();
                if (before) {
                    clean = before;
                }
            }
        }

        return clean;
    };

    // Single Source of Truth for the origin address input & route query
    const [originAddress, setOriginAddress] = useState<string>(() => sanitizeOriginAddress(initialAddress));
    const [activeRouteAddress, setActiveRouteAddress] = useState<string>(() => sanitizeOriginAddress(initialAddress));
    const [calculatedMiles, setCalculatedMiles] = useState<number | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [geocodedCoords, setGeocodedCoords] = useState<{ lat: number; lon: number } | null>(null);

    useEffect(() => {
        if (initialAddress) {
            const cleaned = sanitizeOriginAddress(initialAddress);
            if (cleaned) {
                setOriginAddress(cleaned);
                if (!activeRouteAddress) {
                    setActiveRouteAddress(cleaned);
                }
            }
        }
    }, [initialAddress]);

    const calculateDistance = async (addressToGeocode: string) => {
        const cleanOrigin = sanitizeOriginAddress(addressToGeocode);
        if (!cleanOrigin) return;

        setIsCalculating(true);
        setErrorMsg(null);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanOrigin)}`);
            const data = await res.json();
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                setGeocodedCoords({ lat, lon });
                
                let drivingMiles = 0;

                try {
                    const routeRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${lon},${lat};${shopLng},${shopLat}?overview=false&alternatives=true`);
                    const routeData = await routeRes.json();
                    if (routeData && routeData.routes && routeData.routes.length > 0) {
                        // Use OSRM primary recommended driving route (routes[0])
                        const primaryRouteMeters = routeData.routes[0].distance;
                        drivingMiles = Math.max(0.1, Math.round((primaryRouteMeters / 1609.344) * 10) / 10);
                    }
                } catch (routeErr) {
                    console.warn("OSRM routing API call failed, falling back to straight line formula", routeErr);
                }

                if (!drivingMiles) {
                    const R = 3958.8; 
                    const dLat = (lat - shopLat) * (Math.PI / 180);
                    const dLon = (lon - shopLng) * (Math.PI / 180);
                    const a = 
                        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(shopLat * (Math.PI / 180)) * Math.cos(lat * (Math.PI / 180)) * 
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    
                    drivingMiles = Math.max(0.1, Math.round(R * c * 0.83 * 10) / 10);
                }

                setCalculatedMiles(drivingMiles);
                if (onDistanceCalculated) {
                    onDistanceCalculated(drivingMiles);
                }
            } else {
                setErrorMsg("Could not find location. Please check address or enter zip code.");
                setCalculatedMiles(null);
                setGeocodedCoords(null);
            }
        } catch (e) {
            console.error("Distance calculation error", e);
            setErrorMsg("Distance calculation service unavailable. You can enter miles manually.");
            setCalculatedMiles(null);
            setGeocodedCoords(null);
        } finally {
            setIsCalculating(false);
        }
    };

    const triggerCalculation = (targetAddr: string) => {
        const cleaned = sanitizeOriginAddress(targetAddr);
        if (!cleaned) return;
        setOriginAddress(cleaned);
        setActiveRouteAddress(cleaned);
        calculateDistance(cleaned);
    };

    useEffect(() => {
        if (isOpen && activeRouteAddress && calculatedMiles === null) {
            calculateDistance(activeRouteAddress);
        }
    }, [isOpen, activeRouteAddress]);

    const isDark = theme === 'dark';

    return (
        <div className="w-full mt-2">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "text-xs font-semibold flex items-center gap-1.5 transition-colors underline underline-offset-2",
                    isDark 
                        ? "text-blue-400 hover:text-blue-300" 
                        : "text-blue-700 hover:text-blue-900"
                )}
            >
                <Navigation className="w-3.5 h-3.5 shrink-0" />
                <span>Find out how many miles you are from my shop.</span>
            </button>

            {isOpen && (
                <div className={cn(
                    "mt-3 p-4 rounded-xl border space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 shadow-xl",
                    isDark 
                        ? "bg-zinc-950/90 border-zinc-800 text-white" 
                        : "bg-blue-50/70 border-blue-200 text-zinc-900"
                )}>
                    {/* Header bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 border-zinc-800/50">
                        <div>
                            <h4 className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-1.5", isDark ? "text-blue-400" : "text-blue-900")}>
                                <Compass className="w-4 h-4" />
                                Distance to Shop
                            </h4>
                            <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-zinc-600")}>
                                Shop Location: <strong className={isDark ? "text-zinc-200" : "text-zinc-800"}>{shopAddress}</strong>
                            </p>
                        </div>
                        {calculatedMiles !== null && (
                            <div className={cn(
                                "px-3 py-1.5 rounded-lg border text-right",
                                isDark 
                                    ? "bg-blue-500/10 border-blue-500/30" 
                                    : "bg-white border-blue-300 shadow-sm"
                            )}>
                                <span className="text-[10px] uppercase font-bold block text-zinc-500">Calculated Distance</span>
                                <span className={cn("text-lg font-black font-mono", isDark ? "text-blue-400" : "text-blue-700")}>
                                    {calculatedMiles} miles
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Address Entry / Search */}
                    <div className="space-y-2">
                        <Label className={cn("text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-zinc-600")}>
                            {activeRouteAddress ? "Your Address / Location:" : "Enter your address or zip code to calculate distance:"}
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                type="text"
                                placeholder="Enter street address, city, or zip code..."
                                value={originAddress}
                                onChange={(e) => setOriginAddress(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        triggerCalculation(originAddress);
                                    }
                                }}
                                className={cn(
                                    "h-9 text-xs flex-1",
                                    isDark ? "bg-zinc-900 border-zinc-700 text-white" : "bg-white border-zinc-300 text-zinc-900"
                                )}
                            />
                            <Button
                                type="button"
                                size="sm"
                                disabled={isCalculating || !originAddress.trim()}
                                onClick={() => triggerCalculation(originAddress)}
                                className={cn(
                                    "h-9 px-4 font-bold text-xs shrink-0",
                                    isDark 
                                        ? "bg-blue-600 hover:bg-blue-500 text-white" 
                                        : "bg-blue-700 hover:bg-blue-800 text-white"
                                )}
                            >
                                {isCalculating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Calculate"}
                            </Button>
                        </div>
                        {errorMsg && (
                            <p className="text-xs text-amber-500 font-medium italic mt-1">{errorMsg}</p>
                        )}
                    </div>

                    {/* Embedded Map */}
                    {activeRouteAddress ? (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className={isDark ? "text-zinc-400" : "text-zinc-600"}>
                                    Route from: <strong className={isDark ? "text-white" : "text-zinc-900"}>{activeRouteAddress}</strong>
                                </span>
                                {isCalculating && (
                                    <span className="flex items-center gap-1 text-blue-500 font-medium">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Calculating...
                                    </span>
                                )}
                            </div>
                            <div className="relative w-full h-56 md:h-64 rounded-xl overflow-hidden border border-zinc-700/50 shadow-inner bg-zinc-900">
                                <iframe
                                    title="Google Maps Route"
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    loading="lazy"
                                    allowFullScreen
                                    src={`https://maps.google.com/maps?saddr=${encodeURIComponent(activeRouteAddress)}&daddr=${encodeURIComponent(shopAddress)}&output=embed`}
                                />
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                                <span className={cn("italic text-[11px]", isDark ? "text-zinc-500" : "text-zinc-600")}>
                                    Interactive route map powered by Google Maps
                                </span>
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(activeRouteAddress)}&destination=${encodeURIComponent(shopAddress)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cn(
                                        "font-semibold flex items-center gap-1 hover:underline",
                                        isDark ? "text-blue-400" : "text-blue-700"
                                    )}
                                >
                                    Open in Google Maps App <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
};
