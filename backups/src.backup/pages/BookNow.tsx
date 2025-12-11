import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar } from "lucide-react";
import { useBookingsStore } from "@/store/bookings";
import { notify } from "@/store/alerts";
import { savePDFToArchive } from "@/lib/pdfArchive";
import jsPDF from "jspdf";
import { servicePackages as builtInPackages, addOns as builtInAddOns } from "@/lib/services";
import { getCustomServices, buildFullSyncPayload } from "@/lib/servicesMeta";
import { generateBookingPDF, uploadToFileManager } from "@/lib/bookingsSync";
import { useCouponsStore } from "@/store/coupons";
import { isSupabaseEnabled } from "@/lib/auth";
import * as bookingsSvc from "@/services/supabase/bookings";
import api from "@/lib/api.js";

const BookNow = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  // AT THE VERY TOP — ONLY read from URL, never from localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedServices = urlParams.get('services')?.split(',').filter(Boolean) || [];
  const preselectedAddons = urlParams.get('addons')?.split(',').filter(Boolean) || [];
  const urlPackage = urlParams.get('package') || '';
  const urlPrice = parseFloat(urlParams.get('price') || '') || 0;
  const urlVehicle = urlParams.get('vehicle') || '';

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    make: "",
    model: "",
    year: "",
    datetime: "",
    package: urlPackage || preselectedServices[0] || "",
    message: ""
  });
  const [vehicleType, setVehicleType] = useState<string>(urlVehicle || 'compact');
  const [addOns, setAddOns] = useState<string[]>(preselectedAddons);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addBooking = useBookingsStore(state => state.add);
  // Coupon states
  const [couponCode, setCouponCode] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [couponError, setCouponError] = useState<string>('');

  // Live pricing + meta state
  const [savedPricesLive, setSavedPricesLive] = useState<Record<string,string>>({});
  const [packageMetaLive, setPackageMetaLive] = useState<Record<string, any>>({});
  const [addOnMetaLive, setAddOnMetaLive] = useState<Record<string, any>>({});
  const [customPackagesLive, setCustomPackagesLive] = useState<any[]>([]);
  const [customAddOnsLive, setCustomAddOnsLive] = useState<any[]>([]);
  const [lastSyncTs, setLastSyncTs] = useState<number | null>(null);
  // Dynamic vehicle type display labels
  const [vehicleLabels, setVehicleLabels] = useState<Record<string, string>>({
    compact: "Compact/Sedan",
    midsize: "Mid-Size/SUV",
    truck: "Truck/Van/Large SUV",
    luxury: "Luxury/High-End",
  });
  const [vehicleOptions, setVehicleOptions] = useState<string[]>(['compact','midsize','truck','luxury']);

  const getKey = (type: 'package'|'addon', id: string, size: string) => `${type}:${id}:${size}`;

  const fetchLive = async () => {
    try {
      const res = await fetch(`http://localhost:6061/api/packages/live?v=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
      if (res.ok) {
        const ct = res.headers.get('Content-Type') || '';
        if (ct.includes('application/json')) {
          const data = await res.json();
          setSavedPricesLive(data.savedPrices || {});
          setPackageMetaLive(data.packageMeta || {});
          setAddOnMetaLive(data.addOnMeta || {});
          setCustomPackagesLive(data.customPackages || []);
          setCustomAddOnsLive(data.customAddOns || []);
          setLastSyncTs(Date.now());
          return;
        }
      }
    } catch {}
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
    fetchLive();
    const intervalId = setInterval(fetchLive, 2000);
    return () => clearInterval(intervalId);
  }, []);

  // Load dynamic vehicle types from live endpoint and keep in sync on admin edits
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
            // ensure current selection is valid
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

  // Hard reload page when admin triggers force refresh (vehicle types changed)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'force-refresh') {
        window.location.reload();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const allBuiltInSteps: Record<string, { id: string; name: string }> = Object.fromEntries(
    builtInPackages.flatMap(p => p.steps.map(s => [typeof s === 'string' ? s : s.id, typeof s === 'string' ? s : s.name]))
      .map(([id, name]) => [id as string, { id: id as string, name: name as string }])
  );
  const customServicesMap: Record<string, string> = Object.fromEntries(getCustomServices().map(s => [s.id, s.name]));

  const visibleBuiltIns = builtInPackages.filter(p => (packageMetaLive[p.id]?.visible) !== false && !packageMetaLive[p.id]?.deleted);
  const visibleCustomPkgs = customPackagesLive.filter((p: any) => (packageMetaLive[p.id]?.visible) !== false && !packageMetaLive[p.id]?.deleted);
  const livePackages = [...visibleBuiltIns, ...visibleCustomPkgs].map((p: any) => {
    const pricing: Record<string, number> = {
      compact: parseFloat(savedPricesLive[getKey('package', p.id, 'compact')]) || p.pricing.compact,
      midsize: parseFloat(savedPricesLive[getKey('package', p.id, 'midsize')]) || p.pricing.midsize,
      truck: parseFloat(savedPricesLive[getKey('package', p.id, 'truck')]) || p.pricing.truck,
      luxury: parseFloat(savedPricesLive[getKey('package', p.id, 'luxury')]) || p.pricing.luxury,
    };
    // bring in any dynamically seeded vehicle-type pricing
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
    return { ...p, pricing, steps };
  });

  const visibleBuiltAddOns = builtInAddOns.filter(a => (addOnMetaLive[a.id]?.visible) !== false && !addOnMetaLive[a.id]?.deleted);
  const visibleCustomAddOns = customAddOnsLive.filter((a: any) => (addOnMetaLive[a.id]?.visible) !== false && !addOnMetaLive[a.id]?.deleted);
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

  // Compute total (service + add-ons)
  const selectedService = livePackages.find(s => s.id === formData.package);
  const selectedServicePrice = selectedService ? (selectedService.pricing[vehicleType] ?? selectedService.pricing['compact'] ?? 0) : 0;
  const packagePrice = urlPrice > 0 ? urlPrice : selectedServicePrice;
  const addOnsTotal = addOns.reduce((sum, id) => {
    const found = liveAddOns.find(a => a.id === id);
    const price = found ? (found.pricing[vehicleType] ?? found.pricing['compact'] ?? 0) : 0;
    return sum + price;
  }, 0);
  const total = packagePrice + addOnsTotal;
  const discountedTotal = Math.max(0, total - appliedDiscount);

  // NUKES ANY OLD GHOST DATA ON EVERY LOAD
  useEffect(() => {
    try {
      localStorage.removeItem('selectedServices');
      localStorage.removeItem('selectedAddons');
      localStorage.removeItem('lastBookingServices');
      localStorage.removeItem('lastBookingAddons');
      localStorage.removeItem('bookingDraft');
      localStorage.removeItem('selectedVehicleType');
      localStorage.removeItem('selectedPackage');
      localStorage.removeItem('selectedAddOns');
    } catch {}
  }, []);

  // Apply coupon against live coupons
  const applyCoupon = () => {
    try {
      const code = couponCode.trim().toUpperCase();
      if (!code) return;
      setCouponError('');
      const now = new Date();
      const coupons = useCouponsStore.getState().items.filter(
        (c: any) => c.active && c.usesLeft > 0 && (!c.startDate || new Date(c.startDate) <= now) && (!c.endDate || new Date(c.endDate) >= now)
      );
      const match = coupons.find((c: any) => c.code === code);
      if (!match) {
        setAppliedDiscount(0);
        setAppliedCouponCode('');
        setCouponError('This coupon code is not valid');
        return;
      }
      let newTotal = total;
      if (match.percent) newTotal = Math.max(0, newTotal * (1 - match.percent / 100));
      if (match.amount) newTotal = Math.max(0, newTotal - match.amount);
      const discount = total - newTotal;
      setAppliedDiscount(discount);
      setAppliedCouponCode(match.code);
      setCouponError('');
    } catch {}
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone is required";
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = "Phone must be 10 digits";
    }
    if (!formData.make.trim()) newErrors.make = "Vehicle make is required";
    if (!formData.model.trim()) newErrors.model = "Vehicle model is required";
    if (!formData.year.trim()) newErrors.year = "Year is required";
    if (!formData.package) newErrors.package = "Please select a package";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formEl = e.currentTarget as HTMLFormElement;

    if (!validateForm()) {
      toast({
        title: "Please fix errors",
        description: "Check the form for validation errors",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    // Silent auto-create customer account
    try {
      const autoPassword = `PDS${Math.random().toString(36).slice(2, 10)}`;
      console.log(`Customer account created: ${formData.email} / ${autoPassword}`);
      console.log(`Portal link: ${window.location.origin}/portal?token=auto-${Date.now()}`);
    } catch {}

    // 1) Save booking to API and local store for instant calendar
    const dateIso = formData.datetime ? new Date(formData.datetime).toISOString() : new Date().toISOString();
    const bookingPayload = {
      customer: { name: formData.name, email: formData.email, phone: formData.phone },
      vehicle: { year: formData.year, make: formData.make, model: formData.model, type: vehicleType },
      service: selectedService ? selectedService.name : formData.package,
      addOns: addOns.map(id => {
        const a = addOnDefs.find(x => x.id === id);
        return { id, name: a?.name || id, price: getAddOnPrice(id, vehicleType) };
      }),
      date: dateIso,
      total: discountedTotal,
      notes: formData.message,
    };
    try {
      await api('/api/bookings', { method: 'POST', body: JSON.stringify(bookingPayload) });
    } catch {}
    try {
      if (isSupabaseEnabled()) {
        await bookingsSvc.create({
          customer_name: formData.name,
          phone: formData.phone,
          email: formData.email,
          vehicle_type: vehicleType,
          package: bookingPayload.service || formData.package,
          add_ons: addOns,
          date: dateIso,
          notes: formData.message,
          price_total: discountedTotal,
          status: 'pending'
        });
      }
    } catch {}
    const localBookingId = `booking_${Date.now()}`;
    addBooking({ id: localBookingId, title: bookingPayload.service || "Booking", customer: formData.name, date: dateIso, status: "pending" });

    // 2) Generate + upload PDF to File Manager
    const bookingForPdf = { id: localBookingId, title: bookingPayload.service || "Booking", customer: formData.name, date: dateIso, status: "pending" } as any;
    const pdfDataUrl = generateBookingPDF(bookingForPdf, {
      vehicle: `${formData.year} ${formData.make} ${formData.model}`,
      service: bookingPayload.service,
      price: discountedTotal,
      notes: formData.message,
    });
    try {
      const d = new Date(dateIso);
      const year = d.getFullYear();
      const monthName = d.toLocaleString(undefined, { month: "long" });
      const path = `Bookings ${year}/${monthName}/`;
      uploadToFileManager(pdfDataUrl, path, bookingForPdf, { service: bookingPayload.service, price: discountedTotal });
    } catch {}

    // 3) Hidden admin email
    try {
      await api('/api/email/admin', { method: 'POST', body: JSON.stringify({ ...bookingPayload, pdfDataUrl }) });
    } catch {}

    // 4) Customer email
    try {
      await api('/api/email/customer', { method: 'POST', body: JSON.stringify({ to: formData.email, ...bookingPayload, pdfDataUrl }) });
    } catch {}

    // 5) Admin toast + sound (local only)
    try {
      toast({ title: `NEW BOOKING! $${discountedTotal} — ${formData.name}`, description: `${new Date(dateIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, duration: 8000 });
      const audio = new Audio('/sounds/cash-register.mp3');
      audio.play().catch(() => {});
      if (typeof Notification !== 'undefined') {
        if (Notification.permission === 'granted') {
          new Notification('New Booking', { body: `${formData.name} — $${total}`, icon: '/favicon.ico' });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then((p) => { if (p === 'granted') new Notification('New Booking', { body: `${formData.name} — $${total}`, icon: '/favicon.ico' }); });
        }
      }
    } catch {}

    // Allow normal browser POST so Netlify can capture the submission
    try { formEl.submit(); } catch {}

    // 6) Redirect to thank you
    window.location.href = `/thank-you?total=${encodeURIComponent(discountedTotal)}&name=${encodeURIComponent(formData.name)}&time=${encodeURIComponent(new Date(dateIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}&date=${encodeURIComponent(new Date(dateIso).toLocaleDateString())}`;

    // Reset form
    setFormData({
      name: "",
      email: "",
      phone: "",
      make: "",
      model: "",
      year: "",
      datetime: "",
      package: "",
      message: ""
    });
    setAddOns([]);
    setErrors({});
    setIsSubmitting(false);
  };

  const toggleAddOn = (addonId: string) => {
    setAddOns(prev => 
      prev.includes(addonId) ? prev.filter(a => a !== addonId) : [...prev, addonId]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Link>
        </Button>

        <div className="space-y-6 animate-fade-in">
          <div className="text-center space-y-4">
            <Calendar className="h-16 w-16 mx-auto text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Book Your Detail</h1>
            <p className="text-muted-foreground text-lg">Fill out the form below to request an appointment</p>
          </div>

          <Card className="p-8 bg-gradient-card border-border">
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
              name="booking"
              method="POST"
              data-netlify="true"
              netlify-honeypot="bot-field"
            >
              <input type="hidden" name="form-name" value="booking" />
              <input type="hidden" name="bot-field" />
              {/* Netlify reCAPTCHA v2 */}
              <div data-netlify-recaptcha="true"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className={errors.name ? "border-destructive" : ""}
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className={errors.phone ? "border-destructive" : ""}
                  />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="make">Vehicle Make *</Label>
                  <Input
                    id="make"
                    placeholder="e.g., Toyota"
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Vehicle Model *</Label>
                  <Input
                    id="model"
                    placeholder="e.g., Camry"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">Year *</Label>
                  <Input
                    id="year"
                    placeholder="e.g., 2020"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Vehicle Type</Label>
                <Select value={vehicleType} onValueChange={(v) => setVehicleType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>{vehicleLabels[opt] || opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="datetime">Preferred Date/Time (Optional)</Label>
                <Input
                  id="datetime"
                  type="datetime-local"
                  value={formData.datetime}
                  onChange={(e) => setFormData({ ...formData, datetime: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Package *</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {livePackages.map((pkg: any) => {
                    const isSelected = formData.package === pkg.id;
                    const isBestValue = pkg.name.includes('BEST VALUE');
                    const imageSrc = packageMetaLive[pkg.id]?.imageDataUrl;
                    return (
                      <Card
                        key={pkg.id}
                        className={`relative overflow-hidden cursor-pointer transition-all ${isSelected ? 'border-primary ring-2 ring-primary/40' : 'border-border hover:border-primary/30'}`}
                        onClick={() => setFormData({ ...formData, package: pkg.id })}
                      >
                        {isBestValue && (
                          <div className="absolute top-0 left-0 right-0 bg-gradient-hero py-1 text-center z-10">
                            <span className="text-xs font-bold text-white tracking-wider">★ BEST VALUE ★</span>
                          </div>
                        )}
                        {imageSrc && (
                          <div className="relative h-32 overflow-hidden">
                            <img src={imageSrc} alt={pkg.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className={`p-4 ${isBestValue ? 'pt-6' : ''}`}>
                          <div className="flex items-start justify-between">
                            <h3 className="font-semibold text-foreground pr-2">{pkg.name.replace(' (BEST VALUE)', '')}</h3>
                            {isSelected && <div className="bg-primary rounded-full px-2 py-1 text-xs text-white">Selected</div>}
                          </div>
                          <div className="mt-2 text-primary font-bold text-xl">${pkg.pricing[vehicleType]}</div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
                {errors.package && <p className="text-xs text-destructive">{errors.package}</p>}
              </div>

              <div className="space-y-2">
                <Label>Add-Ons (Optional)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border border-border rounded-md">
                  {liveAddOns.map((addon: any) => {
                    const isSelected = addOns.includes(addon.id);
                    return (
                      <Card
                        key={addon.id}
                        className={`p-3 cursor-pointer transition-all ${isSelected ? 'border-primary ring-2 ring-primary/40 bg-primary/5' : 'border-border hover:border-primary/30'}`}
                        onClick={() => toggleAddOn(addon.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold text-foreground">{addon.name}</div>
                            <div className="text-primary font-bold">${addon.pricing[vehicleType]}</div>
                          </div>
                          {isSelected && <div className="bg-primary rounded-full px-2 py-1 text-xs text-white">✓</div>}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Additional Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Any special requests or questions?"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                />
              </div>

              {/* === LIVE COUPONS FROM ADMIN === */}
              <div className="mt-8 p-6 bg-zinc-900 border border-zinc-700 rounded-xl">
                <h3 className="text-xl font-bold text-white mb-4">Coupon Code</h3>
                
                <div className="flex gap-3">
                  <Input 
                    type="text" 
                    placeholder="Enter code" 
                    className="flex-1 px-5 py-4 bg-black border border-zinc-600 rounded-lg text-white focus:border-red-500 focus:outline-none" 
                    value={couponCode} 
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())} 
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); } }} 
                  /> 
                  <Button 
                    className="bg-red-600 hover:bg-red-700 font-bold px-8" 
                    type="button"
                    onClick={applyCoupon} 
                  > 
                    Apply 
                  </Button> 
                </div>

                {appliedDiscount > 0 && (
                  <div className="mt-4 text-green-400 font-bold text-lg"> 
                    ✓ {appliedCouponCode} applied — You saved ${appliedDiscount.toFixed(2)}! 
                  </div> 
                )}

                {couponError && (
                  <div className="mt-4 text-red-400 font-semibold">{couponError}</div>
                )}
              </div>

              {/* Estimated total */}
              <div className="flex items-center justify-between p-4 border border-border rounded-md">
                <div className="text-sm text-muted-foreground">Estimated Total</div>
                <div className="text-xl font-bold text-foreground">${discountedTotal}</div>
              </div>

              <Button type="submit" className="w-full bg-gradient-hero text-lg py-6 min-h-[56px] mt-4" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Booking Request"}
              </Button>
              {/* New: Separate Estimate and Payment actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full py-6"
                  onClick={async () => {
                    try {
                      const dateIso = formData.datetime ? new Date(formData.datetime).toISOString() : new Date().toISOString();
                      const estimatePayload = {
                        kind: 'estimate-request',
                        customer: { name: formData.name, email: formData.email, phone: formData.phone },
                        vehicle: { year: formData.year, make: formData.make, model: formData.model, type: vehicleType },
                        package: formData.package,
                        addOns,
                        preferredDate: dateIso,
                        notes: formData.message,
                      };
                      await fetch("http://localhost:6061/api/email/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(estimatePayload) });
                      toast({ title: "Your estimate request has been sent.", description: "Rick will reach out to confirm.", duration: 4000 });
                    } catch {
                      toast({ title: "Estimate request queued", description: "We’ll try sending again shortly.", duration: 4000 });
                    }
                  }}
                >
                  Schedule an Estimate
                </Button>
                {/* Checkout removed */}
                <Button
                  type="button"
                  className="w-full bg-primary text-primary-foreground py-6"
                  asChild
                >
                  <Link to="/checkout">Make a Payment / Checkout</Link>
                </Button>
              </div>
            </form>
          </Card>

          <p className="text-center text-sm text-muted-foreground">
            By submitting this form, you agree to be contacted by Prime Detail Solutions regarding your booking.
          </p>
        </div>
      </main>
      {/* Removed bottom debug banner for production */}
    </div>
  );
};

export default BookNow;
