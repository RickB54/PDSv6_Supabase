import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { servicePackages as builtInPackages, addOns as builtInAddOns, VehicleType, calculateDestinationFee } from "@/lib/services";
import { getCustomServices, getAllPackageMeta, getAllAddOnMeta, buildFullSyncPayload } from "@/lib/servicesMeta";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { HeroSection } from "@/components/HeroSection";
import packageBasic from "@/assets/package-basic.jpg";
import packageExpress from "@/assets/package-express.jpg";
import packageExterior from "@/assets/package-exterior.jpg";
import packageInterior from "@/assets/package-interior.jpg";
import packageFull from "@/assets/package-full.jpg";
import packagePremium from "@/assets/package-premium.jpg";

const packageImages: Record<string, string> = {
  "basic-exterior": packageBasic,
  "express-wax": packageExpress,
  "full-exterior": packageExterior,
  "interior-cleaning": packageInterior,
  "full-detail": packageFull,
  "premium-detail": packagePremium,
};

const CustomerPortal = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const addToCart = useCartStore((s) => s.addItem);
  const [vehicleType, setVehicleType] = useState<string>('compact');
  const [vehicleLabels, setVehicleLabels] = useState<Record<string, string>>({
    compact: "Compact/Sedan",
    midsize: "Mid-Size/SUV",
    truck: "Truck/Van/Large SUV",
    luxury: "Luxury/High-End",
  });
  const [vehicleOptions, setVehicleOptions] = useState<string[]>(['compact','midsize','truck','luxury']);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [distance, setDistance] = useState(0);
  const [addOnsExpanded, setAddOnsExpanded] = useState(false);
  const [learnMorePackage, setLearnMorePackage] = useState<any | null>(null);

  // Live data pulled from backend
  const [savedPricesLive, setSavedPricesLive] = useState<Record<string,string>>({});
  const [packageMetaLive, setPackageMetaLive] = useState<Record<string, any>>({});
  const [addOnMetaLive, setAddOnMetaLive] = useState<Record<string, any>>({});
  const [customPackagesLive, setCustomPackagesLive] = useState<any[]>([]);
  const [customAddOnsLive, setCustomAddOnsLive] = useState<any[]>([]);
  const [lastSyncTs, setLastSyncTs] = useState<number | null>(null);

  const getKey = (type: 'package'|'addon', id: string, size: string) => `${type}:${id}:${size}`;

  const fetchLive = async () => {
    try {
      const res = await fetch(`http://localhost:6061/api/packages/live?v=${Date.now()}` , {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const contentType = res.headers.get('Content-Type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          setSavedPricesLive(data.savedPrices || {});
          setPackageMetaLive(data.packageMeta || {});
          setAddOnMetaLive(data.addOnMeta || {});
          setCustomPackagesLive(data.customPackages || []);
          setCustomAddOnsLive(data.customAddOns || []);
          setLastSyncTs(Date.now());
          return;
        }
        // Fall through to local snapshot if server returned HTML due to SPA redirects
      }
    } catch {}
    // Local fallback snapshot when backend is unavailable or returns non-JSON
    try {
      const snapshot = await buildFullSyncPayload();
      setSavedPricesLive(snapshot.savedPrices || {});
      setPackageMetaLive(snapshot.packageMeta || {});
      setAddOnMetaLive(snapshot.addOnMeta || {});
      setCustomPackagesLive(snapshot.customPackages || []);
      setCustomAddOnsLive(snapshot.customAddOns || []);
      setLastSyncTs(Date.now());
    } catch {}
  };

  useEffect(() => {
    const loadVehicleTypes = async () => {
      try {
        const res = await fetch(`http://localhost:6061/api/vehicle-types/live?v=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const map: Record<string, string> = { ...vehicleLabels };
            const opts: string[] = [];
            data.forEach((vt: any) => {
              const id = String(vt.id || vt.key || '').trim();
              const name = String(vt.name || '').trim();
              if (id && name) { map[id] = name; opts.push(id); }
            });
            setVehicleLabels(map);
            setVehicleOptions(opts.length ? opts : ['compact','midsize','truck','luxury']);
            if (!opts.includes(vehicleType)) setVehicleType(opts[0] || 'compact');
          }
        }
      } catch {}
    };
    loadVehicleTypes();
    const onChanged = (e: any) => {
      if (e && e.detail && (e.detail.kind === 'vehicle-types' || e.detail.type === 'vehicle-types')) loadVehicleTypes();
    };
    window.addEventListener('content-changed', onChanged as any);
    return () => window.removeEventListener('content-changed', onChanged as any);
  }, []);

  useEffect(() => {
    fetchLive();
    const intervalId = setInterval(fetchLive, 2000);
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Build live packages and add-ons arrays
  const allBuiltInSteps: Record<string, { id: string; name: string }> = Object.fromEntries(
    builtInPackages.flatMap(p => p.steps.map(s => [typeof s === 'string' ? s : s.id, typeof s === 'string' ? s : s.name]))
      .map(([id, name]) => [id as string, { id: id as string, name: name as string }])
  );
  const customServicesMap: Record<string, string> = Object.fromEntries(getCustomServices().map(s => [s.id, s.name]));

  const visibleBuiltIns = builtInPackages.filter(p => (packageMetaLive[p.id]?.visible) !== false);
  const visibleCustomPkgs = customPackagesLive.filter((p: any) => (packageMetaLive[p.id]?.visible) !== false);
  const livePackages = [...visibleBuiltIns, ...visibleCustomPkgs].map((p: any) => {
    const pricing: Record<string, number> = {
      compact: parseFloat(savedPricesLive[getKey('package', p.id, 'compact')]) || p.pricing.compact,
      midsize: parseFloat(savedPricesLive[getKey('package', p.id, 'midsize')]) || p.pricing.midsize,
      truck: parseFloat(savedPricesLive[getKey('package', p.id, 'truck')]) || p.pricing.truck,
      luxury: parseFloat(savedPricesLive[getKey('package', p.id, 'luxury')]) || p.pricing.luxury,
    };
    Object.keys(savedPricesLive).forEach((k) => {
      const prefix = `package:${p.id}:`;
      if (k.startsWith(prefix)) {
        const veh = k.slice(prefix.length);
        const val = parseFloat(savedPricesLive[k]);
        if (!Number.isNaN(val)) pricing[veh] = val;
      }
    });
    const metaSteps: string[] | undefined = packageMetaLive[p.id]?.stepIds;
    const steps = metaSteps && metaSteps.length > 0
      ? metaSteps.map(id => ({ id, name: allBuiltInSteps[id]?.name || customServicesMap[id] || id }))
      : p.steps.map((s: any) => (typeof s === 'string' ? { id: s, name: s } : s));
    const description = packageMetaLive[p.id]?.descriptionOverride || p.description;
    return { ...p, pricing, steps, description };
  });

  const visibleBuiltAddOns = builtInAddOns.filter(a => (addOnMetaLive[a.id]?.visible) !== false);
  const visibleCustomAddOns = customAddOnsLive.filter((a: any) => (addOnMetaLive[a.id]?.visible) !== false);
  const liveAddOns = [...visibleBuiltAddOns, ...visibleCustomAddOns].map((a: any) => {
    const pricing: Record<string, number> = {
      compact: parseFloat(savedPricesLive[getKey('addon', a.id, 'compact')]) || a.pricing.compact,
      midsize: parseFloat(savedPricesLive[getKey('addon', a.id, 'midsize')]) || a.pricing.midsize,
      truck: parseFloat(savedPricesLive[getKey('addon', a.id, 'truck')]) || a.pricing.truck,
      luxury: parseFloat(savedPricesLive[getKey('addon', a.id, 'luxury')]) || a.pricing.luxury,
    };
    Object.keys(savedPricesLive).forEach((k) => {
      const prefix = `addon:${a.id}:`;
      if (k.startsWith(prefix)) {
        const veh = k.slice(prefix.length);
        const val = parseFloat(savedPricesLive[k]);
        if (!Number.isNaN(val)) pricing[veh] = val;
      }
    });
    const metaSteps: string[] | undefined = addOnMetaLive[a.id]?.stepIds;
    const steps = metaSteps && metaSteps.length > 0
      ? metaSteps.map(id => ({ id, name: allBuiltInSteps[id]?.name || customServicesMap[id] || id }))
      : (a.steps ? a.steps.map((s: any) => (typeof s === 'string' ? { id: s, name: s } : s)) : []);
    return { ...a, pricing, steps };
  });

  const service = livePackages.find(s => s.id === selectedService);
  const servicePrice = service ? service.pricing[vehicleType] : 0;
  const addOnsTotal = selectedAddOns.reduce((sum, id) => {
    const found = liveAddOns.find(a => a.id === id);
    return sum + (found ? found.pricing[vehicleType] : 0);
  }, 0);
  const destinationFee = calculateDestinationFee(distance);
  const total = servicePrice + addOnsTotal + destinationFee;

  const toggleAddOn = (id: string) => {
    setSelectedAddOns(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Vehicle Type Selector - Centered */}
        <div className="flex justify-center mb-12">
          <div className="w-full max-w-md">
            <Label className="text-center block mb-3 text-lg font-semibold text-foreground">
              Select Your Vehicle Type
            </Label>
            <Select value={vehicleType} onValueChange={(v) => setVehicleType(v)}>
              <SelectTrigger className="w-full h-12 text-base bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                {vehicleOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>{vehicleLabels[opt] || opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                    ? 'border-primary ring-4 ring-primary/50 shadow-[0_0_40px_rgba(220,38,38,0.3)]' 
                    : 'border-border hover:border-primary/50 shadow-card'
                  }
                  ${isBestValue ? 'border-primary/70' : ''}
                `}
                style={{
                  background: 'linear-gradient(180deg, hsl(0, 0%, 100%) 0%, hsl(0, 0%, 98%) 100%)',
                }}
                onClick={() => setSelectedService(pkg.id)}
              >
                {isBestValue && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-hero py-1 text-center z-10">
                    <span className="text-xs font-bold text-white tracking-wider">★ BEST VALUE ★</span>
                  </div>
                )}
                
                {/* Package Image (prefer live uploaded image if available) */}
                {(packageMetaLive[pkg.id]?.imageDataUrl || packageImages[pkg.id]) && (
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={packageMetaLive[pkg.id]?.imageDataUrl || packageImages[pkg.id]} 
                      alt={pkg.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                
                <div className={`p-6 space-y-5 ${isBestValue ? 'pt-8' : ''}`}>
                  {/* Service Name & Check */}
                  <div className="flex items-start justify-between min-h-[60px]">
                    <h3 className="text-xl font-bold text-foreground leading-tight pr-2">
                      {pkg.name.replace(' (BEST VALUE)', '')}
                    </h3>
                    {isSelected && (
                      <div className="bg-primary rounded-full p-1 flex-shrink-0">
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
                    <div className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      ${pkg.pricing[vehicleType]}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      For {vehicleLabels[vehicleType] || vehicleType}
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2">
                    <Button
                      className={`flex-1 h-12 font-semibold transition-all duration-300 
                        ${isSelected 
                          ? 'bg-gradient-hero text-white shadow-glow' 
                          : 'bg-secondary text-secondary-foreground hover:bg-gradient-hero hover:text-white'
                        }`}
                    >
                      {isSelected ? '✓ Selected' : 'Select'}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-12"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLearnMorePackage(pkg);
                      }}
                    >
                      Learn More
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Add-Ons - Collapsible Dropdown */}
        <Card className="mb-12 bg-gradient-card border-border">
          <button
            onClick={() => setAddOnsExpanded(!addOnsExpanded)}
            className="w-full p-6 flex items-center justify-between text-left hover:bg-muted/10 transition-colors"
          >
            <h2 className="text-2xl font-bold text-foreground">Add-On Services</h2>
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
                        ${isSelected ? 'border-primary ring-2 ring-primary/50 bg-primary/5' : 'border-border hover:border-primary/30'}
                      `}
                      onClick={() => toggleAddOn(addon.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground text-sm mb-1">{addon.name}</h4>
                          <p className="text-primary font-bold text-lg">${addon.pricing[vehicleType]}</p>
                        </div>
                        {isSelected && (
                          <div className="bg-primary rounded-full p-1">
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
          <Card className="p-8 max-w-lg mx-auto bg-gradient-card border-border shadow-card">
            <h3 className="text-2xl font-bold mb-6 text-foreground text-center">
              [ ORDER SUMMARY ]
            </h3>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-start py-2 border-b border-border">
                <span className="text-foreground font-medium">Service:</span>
                <span className="text-right">
                  <div className="font-semibold text-foreground">{service?.name.replace(' (BEST VALUE)', '')}</div>
                  <div className="text-primary font-bold">${servicePrice}</div>
                </span>
              </div>
              
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-foreground font-medium">Vehicle:</span>
                <span className="text-foreground capitalize">{vehicleType === 'compact' ? 'Compact/Sedan' : vehicleType === 'midsize' ? 'Mid-Size/SUV' : vehicleType === 'truck' ? 'Truck/Van/Large SUV' : 'Luxury/High-End'}</span>
              </div>

              {selectedAddOns.length > 0 && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-foreground font-medium">Add-Ons:</span>
                  <span className="text-primary font-bold">${addOnsTotal}</span>
                </div>
              )}
              
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-foreground font-medium">
                  Destination: <span className="text-muted-foreground text-sm">{distance} mi</span>
                </span>
                <span className="text-primary font-bold">${destinationFee}</span>
              </div>

              <div className="border-t-2 border-primary pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-foreground">TOTAL</span>
                  <span className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    ${total}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <Button 
                className="w-full h-12 bg-gradient-hero text-white font-semibold text-lg shadow-glow hover:shadow-[0_0_40px_rgba(220,38,38,0.4)]"
                onClick={() => {
                  const selectedPkg = livePackages.find(s => s.id === selectedService);
                  const price = selectedPkg ? selectedPkg.pricing[vehicleType] : 0;
                  const params = new URLSearchParams();
                  if (selectedPkg) params.set('package', selectedPkg.id);
                  if (price > 0) params.set('price', String(price));
                  params.set('vehicle', vehicleType);
                  if (selectedAddOns.length > 0) params.set('addons', selectedAddOns.join(','));
                  window.location.href = `/book-now?${params.toString()}`;
                }}
              >
                BOOK NOW → GET ESTIMATE
              </Button>
              {/* Removed per request: View My Offers button */}
            </div>
          </Card>
        )}

        {/* Service & Pricing Disclaimer */}
        <Card className="mt-12 p-6 border-destructive bg-destructive/10">
          <h3 className="font-bold text-lg mb-3 text-foreground flex items-center gap-2">
            ⚠️ Service & Pricing Disclaimer
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• <strong>Paint Protection & Ceramic Coating</strong> NOT included. Available only in Premium packages or add-ons.</p>
            <p>• We do <strong>NOT</strong> offer: → Biological Cleanup → Emergency Services</p>
            <p>• We focus on <strong>premium cosmetic and protective detailing</strong>.</p>
            <p className="font-semibold mt-4 text-foreground border-t border-border pt-3">
              Important: Final price may vary based on vehicle condition, size, or additional work required. 
              All quotes are estimates until vehicle is inspected.
            </p>
          </div>
          {/* Removed confirmation button per request */}
        </Card>
      </main>
      {/* Debug Bar removed: production environment with Supabase enabled */}

      {/* Learn More Dialog */}
      <Dialog open={!!learnMorePackage} onOpenChange={() => setLearnMorePackage(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{learnMorePackage?.name.replace(' (BEST VALUE)', '')}</DialogTitle>
            <DialogDescription>
              ${learnMorePackage ? learnMorePackage.pricing[vehicleType] : 0}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2 text-foreground">Why Choose This Package?</h4>
              <p className="text-muted-foreground">{learnMorePackage?.description}</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2 text-foreground">What's Included:</h4>
              <ul className="space-y-2">
                {learnMorePackage?.steps.map((step: any, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span className="text-muted-foreground">{typeof step === 'string' ? step : step.name}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                className="flex-1 bg-gradient-hero"
                onClick={() => {
                  if (learnMorePackage) {
                    // Add selected package to cart with current vehicleType pricing
                    const price = learnMorePackage.pricing[vehicleType];
                    addToCart({
                      id: learnMorePackage.id,
                      name: learnMorePackage.name.replace(' (BEST VALUE)', ''),
                      price,
                      quantity: 1,
                      vehicleType,
                    });
                    toast({ title: "Added to Cart", description: `${learnMorePackage.name} — $${price}`, duration: 2500 });
                  }
                  setLearnMorePackage(null);
                }}
              >
                Add to Cart
              </Button>
              <Button variant="outline" onClick={() => setLearnMorePackage(null)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerPortal;
import { useCartStore } from "@/store/cart";
import { useToast } from "@/hooks/use-toast";
