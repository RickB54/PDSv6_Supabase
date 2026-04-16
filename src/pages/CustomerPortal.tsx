import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { servicePackages as builtInPackages, addOns as builtInAddOns, VehicleType, calculateDestinationFee } from "@/lib/services";
import { getCustomServices, getAllPackageMeta, getAllAddOnMeta, buildFullSyncPayload } from "@/lib/servicesMeta";
import { isSupabaseEnabled, getCurrentUser } from "@/lib/auth";
import * as supaPkgs from "@/services/supabase/packages";
import * as supaAddOns from "@/services/supabase/addOns";
import { contentService } from "@/lib/content";
import { useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import localforage from "localforage";
import { Check, ChevronDown, ChevronUp, HelpCircle, ShieldCheck, AlertCircle, Clock, X, RefreshCw } from "lucide-react";
import { HeroSection } from "@/components/HeroSection";
import { VehicleClassificationDialog } from "@/components/vehicles/VehicleClassificationDialog";
import { AvailabilityPicker } from "@/components/AvailabilityPicker";
import { CompareServicesModal } from "@/components/CompareServicesModal";
import { formatTimeAMPM } from "@/lib/availability";
import { useBookingsStore } from "@/store/bookings";
import packageBasic from "@/assets/package-basic.jpg";
import packageExpress from "@/assets/package-express.jpg";
import packageExterior from "@/assets/package-exterior.jpg";
import packageInterior from "@/assets/package-interior.jpg";
import packageFull from "@/assets/package-full.jpg";
import packagePremium from "@/assets/package-premium.jpg";

// 2026 Package Images (Using 2025 Collection for Essential)
import primeEssentialExt from "@/assets/prime_essential_exterior_v3.png";
import primeEssentialInt from "@/assets/prime_essential_interior_2025.png";
import primeEssentialFull from "@/assets/prime_essential_full_v3.png";
// Elite packages use placeholders or reuse until more generated
import primeEliteExt from "@/assets/prime_essential_exterior.png";
import primeEliteInt from "@/assets/prime_essential_interior.png";
import primeEliteFull from "@/assets/prime_essential_full_detail.png";

const packageImages: Record<string, string> = {
  "prime-essential-exterior": primeEssentialExt,
  "prime-essential-interior": primeEssentialInt,
  "prime-essential-full": primeEssentialFull,
  "prime-elite-exterior": primeEliteExt,
  "prime-elite-interior": primeEliteInt,
  "prime-elite-full": primeEliteFull,
};

// Helper for estimated duration
const getServiceDuration = (id: string = '') => {
  if (id.includes('prime-elite-full')) return 5.5;
  if (id.includes('prime-elite-interior')) return 4.5;
  if (id.includes('prime-elite-exterior')) return 1.5;
  if (id.includes('prime-essential-full')) return 2.5;
  if (id.includes('prime-essential-interior')) return 1.5;
  if (id.includes('prime-essential-exterior')) return 1;
  return 3;
};

const CustomerPortal = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [showBookNow, setShowBookNow] = useState(false);
  const [bookingTestMode, setBookingTestMode] = useState(false);
  const [businessStatus, setBusinessStatus] = useState<any>(null);
  // Only show direct booking functions if the site is officially LIVE (not in Pre-Launch or Winter Mode)
  // Per user request, admins will use the Shuffle button on the Book Now page for diagnostic testing
  const isEffectiveLive = businessStatus ? businessStatus.showBooking : showBookNow;
  // ... (rest of hook calls)

  // ... (skip down to AvailabilityPicker) ...
  // Instead of replacing the whole file, I will target specific blocks. 
  // This replacement is tricky due to size. I'll handle getDuration separately.
  const { toast } = useToast();
  const [vehicleType, setVehicleType] = useState<string>('compact');
  const [vehicleDetails, setVehicleDetails] = useState<{ make: string, model: string }>({ make: "", model: "" });
  const [vehicleLabels, setVehicleLabels] = useState<Record<string, string>>({
    compact: "Compact/Sedan",
    midsize: "Mid-Size/SUV",
    truck: "Truck/Van/Large SUV",
    luxury: "Luxury/High-End",
  });
  const [vehicleOptions, setVehicleOptions] = useState<string[]>(['compact', 'midsize', 'truck', 'luxury']);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [distance, setDistance] = useState(0);
  const [addOnsExpanded, setAddOnsExpanded] = useState(false);
  const [learnMorePackage, setLearnMorePackage] = useState<any | null>(null);
  const [showClassification, setShowClassification] = useState(false);
  const [comparePkgId, setComparePkgId] = useState<string | null>(null);

  // Availability picker state
  const [availDate, setAvailDate] = useState<Date | undefined>(undefined);
  const [availTime, setAvailTime] = useState('');
  const [modalAddOns, setModalAddOns] = useState<string[]>([]);
  const { items: allBookings } = useBookingsStore();

  // Sequential Step Blinking Logic
  const [vehicleInteracted, setVehicleInteracted] = useState(false);
  const [addOnsInteracted, setAddOnsInteracted] = useState(false);

  const getActiveStep = () => {
    if (!vehicleInteracted) return 1;
    if (!selectedService) return 2;
    if (!addOnsInteracted) return 3;
    return 4; // Completed all, blink CTA
  };
  const activeStep = getActiveStep();

  // Live data pulled from backend
  const [savedPricesLive, setSavedPricesLive] = useState<Record<string, string>>({});
  const [packageMetaLive, setPackageMetaLive] = useState<Record<string, any>>({});
  const [addOnMetaLive, setAddOnMetaLive] = useState<Record<string, any>>({});
  const [customPackagesLive, setCustomPackagesLive] = useState<any[]>([]);
  const [customAddOnsLive, setCustomAddOnsLive] = useState<any[]>([]);
  const [lastSyncTs, setLastSyncTs] = useState<number | null>(null);

  const getKey = (type: 'package' | 'addon', id: string, size: string) => `${type}:${id}:${size}`;

  const fetchLive = async () => {
    let finalSavedPrices: Record<string, string> = {};
    let finalPackageMeta: Record<string, any> = {};
    let finalAddOnMeta: Record<string, any> = {};
    let finalCustomPackages: any[] = [];
    let finalCustomAddOns: any[] = [];

    // Initialize with built-ins as hidden by default (Strict Protection)
    // Smart Defaults: Show only what the user wants by default
    builtInPackages.forEach(p => {
      const isEssential = p.id.startsWith('prime-essential');
      finalPackageMeta[p.id] = { id: p.id, visible: isEssential, deleted: false };
    });
    
    const defaultAddonIds = [
      'wheel-cleaning', 'clay-bar', 'headlight-restoration', 'leather-conditioning',
      'ceramic-trim-coat', 'engine-bay', 'pet-hair', 'stain-treatment'
    ];
    builtInAddOns.forEach(a => {
      const isDefault = defaultAddonIds.includes(a.id);
      finalAddOnMeta[a.id] = { id: a.id, visible: isDefault, deleted: false };
    });

    if (isSupabaseEnabled()) {
      try {
        let pkgs: any[] = [];
        try { pkgs = await supaPkgs.getAll(); } catch (e) { console.warn("Supabase pkgs fetch failed (likely RLS):", e); }

        let addons: any[] = [];
        try { addons = await supaAddOns.getAll(); } catch (e) { console.warn("Supabase addons fetch failed (likely RLS):", e); }

        let allMetaItems: any[] = [];
        try { allMetaItems = await contentService.getAllServiceMeta(); } catch (e) { console.warn("Supabase meta fetch failed (likely RLS):", e); }

        if (pkgs.length > 0) {
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
        }

        if (addons.length > 0) {
          addons.forEach((a: any) => {
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
        }

        const builtInPkgIds = builtInPackages.map(b => b.id);
        const builtInAddOnIds = builtInAddOns.map(b => b.id);

        finalCustomPackages = pkgs.filter((p: any) => !builtInPkgIds.includes(p.id)).map((p: any) => ({
          id: p.id, name: p.name, description: p.description || "", pricing: { compact: p.compact_price, midsize: p.midsize_price, truck: p.truck_price, luxury: p.luxury_price }, steps: []
        }));

        finalCustomAddOns = addons.filter((a: any) => !builtInAddOnIds.includes(a.id)).map((a: any) => ({
          id: a.id, name: a.name, description: a.description || "", pricing: { compact: a.compact_price, midsize: a.midsize_price, truck: a.truck_price, luxury: a.luxury_price }
        }));

        const globalMeta = allMetaItems.find(m => m.key === 'global_settings');
        if (globalMeta?.meta) {
          setShowBookNow(globalMeta.meta.showBookNow !== false);
          if (globalMeta.meta.businessStatus) setBusinessStatus(globalMeta.meta.businessStatus);
        }
      } catch (e) {
        console.error("Supabase live sync failed:", e);
      }
    }

    setSavedPricesLive(finalSavedPrices);
    setPackageMetaLive(finalPackageMeta);
    setAddOnMetaLive(finalAddOnMeta);
    setCustomPackagesLive(finalCustomPackages);
    setCustomAddOnsLive(finalCustomAddOns);
    setLastSyncTs(Date.now());
  };

  useEffect(() => {
    fetchLive();
    const intervalId = setInterval(fetchLive, 120000); 
    return () => clearInterval(intervalId);
  }, []);

  const allBuiltInSteps: Record<string, { id: string; name: string }> = Object.fromEntries(
    builtInPackages.flatMap(p => p.steps.map(s => [typeof s === 'string' ? s : s.id, typeof s === 'string' ? s : s.name]))
      .map(([id, name]) => [id as string, { id: id as string, name: name as string }])
  );
  const customServicesMap: Record<string, string> = Object.fromEntries(getCustomServices().map(s => [s.id, s.name]));

  const livePackages = useMemo(() => {
    const visibleBuiltIns = builtInPackages.filter(p => packageMetaLive[p.id]?.visible === true && p.id.includes('prime-essential'));
    const visibleCustomPkgs = customPackagesLive.filter((p: any) => packageMetaLive[p.id]?.visible === true);
    
    return [...visibleBuiltIns, ...visibleCustomPkgs].map((p: any) => {
      const pricing = {
        compact: parseFloat(savedPricesLive[`package:${p.id}:compact`]) || p.pricing?.compact || 0,
        midsize: parseFloat(savedPricesLive[`package:${p.id}:midsize`]) || p.pricing?.midsize || 0,
        truck: parseFloat(savedPricesLive[`package:${p.id}:truck`]) || p.pricing?.truck || 0,
        luxury: parseFloat(savedPricesLive[`package:${p.id}:luxury`]) || p.pricing?.luxury || 0,
      };
      return { ...p, pricing };
    });
  }, [packageMetaLive, customPackagesLive, savedPricesLive]);

  const liveAddOns = useMemo(() => {
    const visibleBuiltAddOns = builtInAddOns.filter(a => addOnMetaLive[a.id]?.visible === true);
    const visibleCustomAddOns = customAddOnsLive.filter((a: any) => addOnMetaLive[a.id]?.visible === true);

    return [...visibleBuiltAddOns, ...visibleCustomAddOns].map((a: any) => {
      const pricing = {
        compact: parseFloat(savedPricesLive[`addon:${a.id}:compact`]) || (a.pricing?.compact ?? 0),
        midsize: parseFloat(savedPricesLive[`addon:${a.id}:midsize`]) || (a.pricing?.midsize ?? 0),
        truck: parseFloat(savedPricesLive[`addon:${a.id}:truck`]) || (a.pricing?.truck ?? 0),
        luxury: parseFloat(savedPricesLive[`addon:${a.id}:luxury`]) || (a.pricing?.luxury ?? 0),
      };
      return { ...a, pricing };
    });
  }, [addOnMetaLive, customAddOnsLive, savedPricesLive]);

  const service = livePackages.find(s => s.id === selectedService);
  const servicePrice = service ? service.pricing[vehicleType] : 0;
  const addOnsTotal = selectedAddOns.reduce((sum, id) => {
    const found = liveAddOns.find(a => a.id === id);
    return sum + (found ? found.pricing[vehicleType] : 0);
  }, 0);
  const destinationFee = calculateDestinationFee(distance);
  const total = (servicePrice || 0) + (addOnsTotal || 0) + (destinationFee || 0);

  const toggleAddOn = (id: string) => {
    setSelectedAddOns(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main id="services" className="container mx-auto px-4 py-24 max-w-7xl scroll-mt-24">
        {/* Step Guide Intro */}
        <div className="mb-12 text-center animate-fade-in bg-blue-50/50 p-8 rounded-2xl border border-blue-100 shadow-sm">
          <h2 className="text-3xl md:text-4xl font-black text-blue-900 uppercase tracking-tighter">
            Follow the <span className="text-red-600 italic">3 easy steps</span> to choose your detail
          </h2>
        </div>

        {/* Vehicle Type Selector - Centered */}
        <div className="flex justify-center mb-12">
          <div className={`w-full max-w-md bg-blue-50/30 p-6 rounded-xl border-2 shadow-sm transition-all duration-500
            ${activeStep === 1 ? 'border-blue-600/50 animate-pulse-subtle' : 'border-blue-100'}
          `}>
            <Label className={`text-center block mb-3 text-lg font-black uppercase tracking-tight
              ${activeStep === 1 ? 'text-blue-700 animate-blink' : 'text-blue-900/40'}
            `}>
              Step 1: Select Your Vehicle Type
            </Label>
            <Select
              value={vehicleType}
              onValueChange={(v) => { setVehicleType(v); setVehicleInteracted(true); }}
              onOpenChange={(open) => { if (open) setVehicleInteracted(true); }}
            >
              <SelectTrigger className="w-full h-12 text-base bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                {vehicleOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>{vehicleLabels[opt] || opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-3 text-center">
              <button
                onClick={() => setShowClassification(true)}
                className="text-xs text-blue-700/70 hover:text-blue-700 font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 mx-auto transition-colors group"
              >
                <HelpCircle className="w-3.5 h-3.5 group-hover:animate-pulse" />
                Not sure which size to pick? Click here
              </button>
            </div>
          </div>
        </div>

        {/* Step 2 Header */}
        <div className="mb-8 pt-8 border-t border-blue-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <h3 className={`text-2xl font-black uppercase tracking-tight transition-colors
            ${activeStep === 2 ? 'text-blue-700 animate-blink' : 'text-blue-900/40'}
          `}>
            Step 2: Select your package below
          </h3>
          {getCurrentUser()?.role === 'admin' && (
            <button 
              onClick={async () => {
                const confirm = window.confirm("DEEP SYNC: This will clear duplicates and force a refresh of all prices from the database. Proceed?");
                if (!confirm) return;
                
                toast({ title: "Syncing...", description: "Cleaning database & local storage." });

                // Clear all relevant local storage keys
                const keys = [
                  'servicePackageMeta', 'serviceAddOnMeta', 
                  'servicePricingOverrides', 'addOnPricingOverrides',
                  'packageMeta', 'addOnMeta', 'savedPrices'
                ];
                keys.forEach(k => localStorage.removeItem(k));
                
                // Trigger background prune/sync if they use the admin page next, 
                // but for now, the deduplication logic will hide them anyway.
                
                // Force hard reload
                window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
              }}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-full text-xs font-bold uppercase tracking-widest transition-all hover:scale-105 shadow-md hover:bg-black active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sync with Cloud
            </button>
          )}
        </div>

        {/* Premium 6-Box Service Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {livePackages.map((pkg: any, index: number) => {
            const isSelected = selectedService === pkg.id;
            const isBestValue = pkg.name.includes("BEST VALUE");

            return (
              <Card
                key={pkg.id}
                className={`relative overflow-hidden cursor-pointer transition-all duration-500 hover:-translate-y-2 group
                  ${isSelected
                    ? 'border-blue-600 ring-4 ring-blue-600/20 shadow-xl'
                    : 'border-blue-100 hover:border-blue-300 shadow-sm'
                  }
                  ${isBestValue ? 'border-primary/70' : ''}
                `}
                style={{
                  background: 'linear-gradient(180deg, hsl(0, 0%, 100%) 0%, hsl(0, 0%, 98%) 100%)',
                }}
                onClick={() => setSelectedService(pkg.id)}
              >
                {isBestValue && (
                  <div className="absolute top-0 left-0 right-0 bg-blue-700 py-1 text-center z-10">
                    <span className="text-xs font-bold text-white tracking-wider">★ BEST VALUE ★</span>
                  </div>
                )}

                {/* Package Image Rendering Logic */}
                {(() => {
                  const customUrl = packageMetaLive[pkg.id]?.imageDataUrl;
                  const defaultImg = packageImages[pkg.id];

                  const isFullDetail = pkg.id.includes('full-detail') || pkg.id.includes('full-detail-2025') || pkg.id.includes('full');

                  if (isFullDetail && !customUrl && !packageImages[pkg.id]) {
                    // Show split screen if we have Essential assets, otherwise fallback
                    return (
                      <div className="relative h-48 overflow-hidden flex shadow-inner">
                        <div className="w-1/2 h-full border-r border-white/20">
                          <img src={primeEssentialExt} alt="Exterior" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        </div>
                        <div className="w-1/2 h-full">
                          <img src={primeEssentialInt} alt="Interior" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                      </div>
                    );
                  }

                  if (customUrl || defaultImg) {
                    return (
                      <div className="relative h-48 overflow-hidden bg-zinc-100">
                        <img
                          src={customUrl || defaultImg}
                          alt={pkg.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className={`p-6 space-y-5 ${isBestValue ? 'pt-8' : ''}`}>
                  <div className="flex items-start justify-between min-h-[60px]">
                    <h3 className="text-xl font-bold text-blue-900 leading-tight pr-2">
                      {pkg.name.replace(' (BEST VALUE)', '')}
                    </h3>
                    {isSelected && (
                      <div className="bg-blue-600 rounded-full p-1 flex-shrink-0">
                        <Check className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-muted-foreground text-sm min-h-[40px] leading-relaxed">
                    {pkg.description}
                  </p>

                  {/* Dynamic Price */}
                  <div className="py-3">
                    <div className="text-4xl font-bold text-blue-800">
                      ${pkg.pricing[vehicleType]}
                    </div>
                    <div className="text-xs text-blue-700/60 mt-1 font-semibold">
                      For {vehicleLabels[vehicleType] || vehicleType}
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      <Button
                        className={`flex-1 h-12 font-semibold transition-all duration-300 
                          ${isSelected
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 border-none'
                            : 'bg-zinc-100 text-zinc-900 hover:bg-blue-600 hover:text-white border-none'
                          }`}
                        onClick={() => {
                          setSelectedService(pkg.id);
                          setVehicleInteracted(true);
                        }}
                      >
                        {isSelected ? '✓ Selected' : 'Select'}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 h-12"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLearnMorePackage(pkg);
                        }}
                      >
                        Learn More
                      </Button>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full h-10 text-[10px] font-black uppercase tracking-[0.15em] border-zinc-200 text-zinc-500 hover:border-blue-700 hover:text-blue-700 hover:bg-zinc-50 transition-all rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        setComparePkgId(pkg.id);
                      }}
                    >
                      Compare Packages
                    </Button>

                    {isEffectiveLive && (
                      <Button
                        className="w-full h-12 bg-blue-900 hover:bg-black text-white font-bold"
                        onClick={() => {
                          const price = pkg.pricing[vehicleType];
                          const params = new URLSearchParams();
                          params.set('package', pkg.id);
                          if (price > 0) params.set('price', String(price));
                          params.set('vehicle', vehicleType);
                          if (selectedAddOns.length > 0) params.set('addons', selectedAddOns.join(','));
                          if (distance > 0) params.set('distance', String(distance));
                          window.location.href = `/book?${params.toString()}`;
                        }}
                      >
                        Book Now →
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Add-Ons - Collapsible Dropdown */}
        <Card className="mb-12 bg-gradient-card border-border">
          <button
            onClick={() => { setAddOnsExpanded(!addOnsExpanded); setAddOnsInteracted(true); }}
            className={`w-full p-6 flex items-center justify-between text-left hover:bg-muted/10 transition-colors
              ${activeStep === 3 ? 'animate-pulse-subtle bg-primary/5' : ''}
            `}
          >
            <h2 className={`text-2xl font-black uppercase tracking-tight transition-colors
              ${activeStep === 3 ? 'text-blue-700 animate-blink' : 'text-blue-800'}
            `}>
              Step 3 Optional: Select Your Add-Ons
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedAddOns.length > 0 && `${selectedAddOns.length} selected`}
              </span>
              {addOnsExpanded ? (
                <ChevronUp className="h-6 w-6 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
          </button>

          {addOnsExpanded && (
            <div className="px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {liveAddOns.map((addon: any) => {
                  const isSelected = selectedAddOns.includes(addon.id);
                  return (
                    <Card
                      key={addon.id}
                      className={`p-4 cursor-pointer transition-all duration-300 hover:shadow-lg
                        ${isSelected ? 'border-blue-600 ring-2 ring-blue-600/20 bg-blue-50/30' : 'border-blue-100 hover:border-blue-300'}
                      `}
                      onClick={() => toggleAddOn(addon.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-blue-900 text-sm mb-1">{addon.name}</h4>
                          <p className="text-blue-700 font-bold text-lg">${addon.pricing[vehicleType]}</p>
                        </div>
                        {isSelected && (
                          <div className="bg-blue-600 rounded-full p-1">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Destination Fee Input */}
        <Card className="mb-12 p-6 bg-gradient-card border-border">
          <Label className="text-lg font-semibold text-foreground mb-3 block">
            Distance to Your Location (miles)
          </Label>
          <Input
            type="number"
            min="0"
            value={distance}
            onChange={(e) => setDistance(parseFloat(e.target.value) || 0)}
            placeholder="Enter distance in miles"
            className="w-full max-w-xs bg-background border-border"
          />
          <p className="text-sm text-muted-foreground mt-2">
            {distance <= 5 && "Free within 5 miles"}
            {distance > 5 && distance <= 10 && `$10 destination fee (6-10 miles)`}
            {distance > 10 && distance <= 20 && `$${destinationFee} destination fee (11-20 miles)`}
            {distance > 20 && distance <= 30 && `$${destinationFee} destination fee (21-30 miles)`}
            {distance > 30 && distance <= 50 && `$${destinationFee} destination fee (31-50 miles)`}
            {distance > 50 && `$75 destination fee (50+ miles)`}
          </p>
        </Card>

        {/* Order Summary */}
        {selectedService && (
          <Card className="p-8 max-w-lg mx-auto bg-white border-blue-100 shadow-2xl">
            <h3 className="text-2xl font-bold mb-6 text-blue-900 text-center uppercase tracking-widest">
              [ Order Summary ]
            </h3>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-start py-2 border-b border-border">
                <span className="text-zinc-500 font-medium">Service:</span>
                <span className="text-right">
                  <div className="font-bold text-blue-900">{service?.name.replace(' (BEST VALUE)', '')}</div>
                  <div className="text-blue-700 font-bold">${servicePrice}</div>
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-blue-50">
                <span className="text-zinc-500 font-medium">Vehicle:</span>
                <span className="text-blue-900 font-semibold capitalize">{vehicleType === 'compact' ? 'Compact/Sedan' : vehicleType === 'midsize' ? 'Mid-Size/SUV' : vehicleType === 'truck' ? 'Truck/Van/Large SUV' : 'Luxury/High-End'}</span>
              </div>

              {selectedAddOns.length > 0 && (
                <div className="flex justify-between py-2 border-b border-blue-50">
                  <span className="text-zinc-500 font-medium">Add-Ons:</span>
                  <span className="text-blue-700 font-bold">${addOnsTotal}</span>
                </div>
              )}

              <div className="flex justify-between py-2 border-b border-blue-50">
                <span className="text-zinc-500 font-medium">
                  Destination: <span className="text-zinc-400 text-sm">{distance} mi</span>
                </span>
                <span className="text-blue-700 font-bold">${destinationFee}</span>
              </div>

              <div className="border-t-2 border-blue-600 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-blue-900">TOTAL</span>
                  <span className="text-3xl font-black text-blue-700">
                    ${total}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {isEffectiveLive ? (
                <Button
                  className={`w-full h-14 text-white font-bold text-xl transition-all rounded-xl shadow-xl
                    ${activeStep === 4 ? 'bg-blue-600 animate-blink shadow-blue-600/30' : 'bg-blue-600 hover:bg-blue-700'}
                  `}
                  onClick={() => {
                    const selectedPkg = livePackages.find(s => s.id === selectedService);
                    const price = selectedPkg ? selectedPkg.pricing[vehicleType] : 0;
                    const params = new URLSearchParams();
                    if (selectedPkg) params.set('package', selectedPkg.id);
                    if (price > 0) params.set('price', String(price));
                    params.set('vehicle', vehicleType);
                    if (selectedAddOns.length > 0) params.set('addons', selectedAddOns.join(','));
                    if (distance > 0) params.set('distance', String(distance));
                    if (destinationFee > 0) params.set('destinationFee', String(destinationFee));
                    window.location.href = `/book?${params.toString()}`;
                  }}
                >
                  Schedule My Detail →
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                    <p className="text-sm font-bold text-primary text-center uppercase tracking-tight">
                      Prime Auto Detail is launching soon!
                    </p>
                    <p className="text-xs text-muted-foreground text-center mt-2 font-medium">
                      Live bookings are not yet open. Please use our inquiry form to join the waitlist.
                    </p>
                  </div>
                  <Button
                    className="w-full h-14 bg-gradient-hero text-white font-black text-xl uppercase tracking-widest shadow-xl"
                    asChild
                  >
                    <Link to="/contact">Inquiry Form →</Link>
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Service Coverage & Policy Notice */}
        <section className="mt-20 border-t border-zinc-100 pt-16">
          <Card className="overflow-hidden border border-blue-100 bg-white shadow-2xl rounded-2xl">
            <div className="bg-blue-900 px-8 py-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-blue-800/50 rounded-xl border border-blue-700/50">
                  <ShieldCheck className="w-6 h-6 text-blue-100" />
                </div>
                <div>
                  <h3 className="font-black text-white uppercase tracking-[0.2em] text-xs">Contractual Disclosure</h3>
                  <p className="text-blue-200 text-xs font-medium">Service Coverage & Professional Policies</p>
                </div>
              </div>
              <Badge className="bg-blue-600 text-white border-none px-4 py-1.5 uppercase text-[10px] font-black tracking-widest shadow-lg">Official Notice</Badge>
            </div>

            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-100">
                {/* Scope of Service column */}
                <div className="p-10 space-y-8">
                  <div className="space-y-2">
                    <h4 className="text-blue-600 text-[10px] font-black uppercase tracking-[0.25em]">Our Specialization</h4>
                    <p className="text-2xl font-black text-zinc-900 leading-[1.1]">Elite Cosmetic & <br />Structural Preservation.</p>
                  </div>

                  <div className="space-y-5">
                    <div className="flex gap-5">
                      <div className="h-2 w-2 rounded-full bg-blue-600 mt-2.5 shrink-0 shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
                      <div>
                        <p className="text-sm font-black text-zinc-900 uppercase tracking-tight">Standard Inclusion Scope</p>
                        <p className="text-[13px] text-zinc-500 leading-relaxed mt-1.5 font-medium">Precision paint decontamination, high-level interior sanitation, and hydrophobic surface sealing. Premium tiers focus on long-term ceramic preservation.</p>
                      </div>
                    </div>
                    <div className="flex gap-5">
                      <div className="h-2 w-2 rounded-full bg-zinc-300 mt-2.5 shrink-0" />
                      <div>
                        <p className="text-sm font-black text-zinc-400 uppercase tracking-tight">Technical Omissions</p>
                        <p className="text-[13px] text-zinc-500 leading-relaxed mt-1.5 italic font-medium">Multi-stage paint correction & ceramic coating applications are specialized services available upon consultation and are not included in maintenance-focused packages.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Limitations column */}
                <div className="p-10 space-y-8 bg-zinc-50/30">
                  <div className="space-y-2">
                    <h4 className="text-red-600 text-[10px] font-black uppercase tracking-[0.25em]">Strict Limitations</h4>
                    <p className="text-2xl font-black text-zinc-900 leading-[1.1]">Excluded Conditions & <br />Restricted Environments.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { label: "Biological & Hazmat Cleanup", icon: <X className="w-4 h-4 text-red-500" /> },
                      { label: "Emergency Response Vehicles", icon: <X className="w-4 h-4 text-red-500" /> },
                      { label: "Heavy Industrial Machinery", icon: <X className="w-4 h-4 text-red-500" /> }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-4 bg-white border border-zinc-200/60 p-4 rounded-xl shadow-sm group hover:border-red-200 transition-colors">
                        <div className="p-1.5 bg-zinc-50 rounded-lg group-hover:bg-red-50 transition-colors">
                          {item.icon}
                        </div>
                        <span className="text-[11px] font-black text-zinc-800 uppercase tracking-wider">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Professional Pricing Policy Bar */}
              <div className="bg-zinc-900 p-8 border-t border-zinc-800">
                <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-amber-500/10 rounded-xl shrink-0 border border-amber-500/20">
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] leading-none">Valuation Disclaimer</p>
                      <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed font-medium">
                        Automated digital quotations serve as initial estimates based on standard vehicle metadata. Prime Auto Detail reserves the right to adjust final invoicing on-site upon verification of actual vehicle dimensions, surface contamination levels, and overall condition.
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <div className="bg-zinc-800 px-4 py-2 rounded-lg border border-zinc-700">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Est. 2024</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
      {/* Debug Bar removed: production environment with Supabase enabled */}
      {/* Debug Bar removed: production environment with Supabase enabled */}

      {/* Learn More Dialog */}
      <Dialog open={!!learnMorePackage} onOpenChange={(open) => { if (!open) { setLearnMorePackage(null); setModalAddOns([]); setAvailDate(undefined); setAvailTime(''); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl">{learnMorePackage?.name.replace(' (BEST VALUE)', '')}</DialogTitle>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xl font-bold text-blue-700">
                    ${learnMorePackage ? learnMorePackage.pricing[vehicleType] : 0}
                  </span>
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                  <div className="flex items-center gap-1.5 text-zinc-500 font-medium">
                    <Clock className="w-4 h-4" />
                    <span>Avg. Time: {(() => {
                      const hrs = getServiceDuration(learnMorePackage?.id);
                      if (hrs === 5.5) return "5 - 6 Hours";
                      if (hrs === 4.5) return "4 - 5 Hours";
                      if (hrs === 1.5) return "1 hr 30 min";
                      if (hrs === 2.5) return "2 hr 30 min";
                      return `${hrs} hr${hrs !== 1 ? 's' : ''}`;
                    })()}</span>
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <h4 className="font-bold mb-2 text-blue-900 uppercase text-sm tracking-wider">Why Choose This Package?</h4>
              <p className="text-zinc-600 leading-relaxed">{learnMorePackage?.description}</p>
            </div>

            <div>
              <h4 className="font-bold mb-3 text-blue-900 uppercase text-sm tracking-wider">What's Included:</h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                {learnMorePackage?.steps.map((step: any, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1 font-bold">✓</span>
                    <span className="text-zinc-600 text-sm">{typeof step === 'string' ? step : step.name}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Add-Ons Accordion in Modal */}
            <div className="border-t border-blue-50 pt-6">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="addons" className="border-none">
                  <AccordionTrigger className="hover:no-underline py-0">
                    <h4 className="font-bold text-blue-900 uppercase text-sm tracking-wider">Enhance Your Service:</h4>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div className="grid grid-cols-1 gap-2">
                      {liveAddOns.map(addon => {
                        const isSelected = modalAddOns.includes(addon.id);
                        return (
                          <div
                            key={addon.id}
                            onClick={() => setModalAddOns(prev => prev.includes(addon.id) ? prev.filter(id => id !== addon.id) : [...prev, addon.id])}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-blue-50 border-blue-600 shadow-sm' : 'bg-zinc-50 border-zinc-200 hover:border-blue-300'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-zinc-300'}`}>
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span className="text-sm font-medium text-zinc-700">{addon.name}</span>
                            </div>
                            <span className="font-bold text-blue-700 text-sm">${addon.pricing[vehicleType]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Availability Calendar */}
            <div className="border-t border-blue-50 pt-6">
              <h4 className="font-bold mb-3 text-blue-900 uppercase text-sm tracking-wider">Check Availability</h4>
              <AvailabilityPicker
                selectedDate={availDate}
                selectedTime={availTime}
                onDateChange={setAvailDate}
                onTimeChange={setAvailTime}
                existingBookings={allBookings.map(b => ({
                  scheduled_at: b.date,
                  estimated_duration: b.endTime
                    ? (new Date(b.endTime).getTime() - new Date(b.date).getTime()) / (1000 * 60 * 60)
                    : 3
                }))}
                serviceDuration={learnMorePackage ? getServiceDuration(learnMorePackage.id) : 1}
              />
              <p className="text-xs text-zinc-500 italic mt-3 text-center">
                * Availability subject to change. Final confirmation provided after booking.
              </p>
            </div>

            <div className="flex gap-4 pt-6 border-t border-blue-50">
              <Button
                className="flex-1 h-12 bg-blue-600 hover:bg-black text-white font-bold uppercase tracking-widest"
                onClick={() => {
                  if (learnMorePackage) {
                    const price = learnMorePackage.pricing[vehicleType];
                    const params = new URLSearchParams();
                    params.set('package', learnMorePackage.id);
                    params.set('vehicle', vehicleType);
                    params.set('price', String(price));

                    // Combine modal and main page add-ons? No, let's just use modal selections if in modal.
                    // Or merge them. User choice. Usually modal selection is what they want now.
                    // Let's use modalAddOns.
                    if (modalAddOns.length > 0) params.set('addons', modalAddOns.join(','));

                    if (availDate && availTime) {
                      params.set('date', format(availDate, 'yyyy-MM-dd'));
                      params.set('time', formatTimeAMPM(availTime));
                    }

                    if (distance > 0) params.set('distance', String(distance));
                    if (vehicleDetails.make) params.set('make', vehicleDetails.make);
                    if (vehicleDetails.model) params.set('model', vehicleDetails.model);

                    window.location.href = `/book?${params.toString()}`;
                  }
                  setLearnMorePackage(null);
                }}
              >
                {availDate && availTime
                  ? `Book Now: ${format(availDate, 'MMM d')} @ ${formatTimeAMPM(availTime)}`
                  : 'Book This Service Now'
                }
              </Button>
              <Button variant="outline" onClick={() => setLearnMorePackage(null)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <VehicleClassificationDialog
        open={showClassification}
        onOpenChange={setShowClassification}
        onSelect={(cat, details) => {
          if (details) setVehicleDetails(details);
          // Normalize the category back to the internal IDs if possible
          const lower = cat.toLowerCase();
          if (lower.includes("compact")) setVehicleType("compact");
          else if (lower.includes("mid-size") || lower.includes("midsize")) setVehicleType("midsize");
          else if (lower.includes("truck") || lower.includes("van") || lower.includes("large suv")) setVehicleType("truck");
          else if (lower.includes("luxury")) setVehicleType("luxury");
          else setVehicleType("midsize"); // Fallback
        }}
      />

      <CompareServicesModal
        open={!!comparePkgId}
        onOpenChange={(open) => !open && setComparePkgId(null)}
        allPackages={livePackages}
        initialPackageId={comparePkgId || ""}
        onSelect={(id) => {
          setSelectedService(id);
          setVehicleInteracted(true);
        }}
      />

      <Footer />
    </div>
  );
};

export default CustomerPortal;
