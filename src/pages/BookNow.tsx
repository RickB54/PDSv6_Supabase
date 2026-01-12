import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Clock, CheckCircle, ArrowLeft, Loader2, HelpCircle, Tag, AlertCircle } from "lucide-react"; // Renamed Calendar icon
import { VehicleClassificationDialog } from "@/components/vehicles/VehicleClassificationDialog";
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
import * as supaPkgs from "@/services/supabase/packages";
import * as supaAddOns from "@/services/supabase/addOns";
import api from "@/lib/api.js";
import { upsertSupabaseEstimate } from "@/lib/supa-data";
import { contentService } from "@/lib/content";
import { getCurrentUser } from "@/lib/auth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar"; // Actual Calendar component
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const BookNow = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedAddons = urlParams.get('addons')?.split(',').filter(Boolean) || [];
  const urlPackage = urlParams.get('package') || '';
  const urlPrice = parseFloat(urlParams.get('price') || '') || 0;
  const urlVehicle = urlParams.get('vehicle') || '';
  const urlDistance = parseFloat(urlParams.get('distance') || '0');
  const urlDestFee = parseFloat(urlParams.get('destinationFee') || '0');

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    make: "",
    model: "",
    year: "",
    datetime: "",
    package: urlPackage || "",
    message: "",
    conditionInside: "",
    conditionOutside: ""
  });
  const [vehicleType, setVehicleType] = useState<string>(urlVehicle || 'compact');
  const [addOns, setAddOns] = useState<string[]>(preselectedAddons);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { add: addBooking, items: allBookings, refresh: refreshBookings } = useBookingsStore();

  useEffect(() => {
    refreshBookings();
  }, [refreshBookings]);
  // Coupon states
  const [couponCode, setCouponCode] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [couponError, setCouponError] = useState<string>('');
  const [showCouponField, setShowCouponField] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);

  // Live pricing + meta state
  const [savedPricesLive, setSavedPricesLive] = useState<Record<string, string>>({});
  const [packageMetaLive, setPackageMetaLive] = useState<Record<string, any>>({});
  const [addOnMetaLive, setAddOnMetaLive] = useState<Record<string, any>>({});
  const [customPackagesLive, setCustomPackagesLive] = useState<any[]>([]);
  const [customAddOnsLive, setCustomAddOnsLive] = useState<any[]>([]);
  const [lastSyncTs, setLastSyncTs] = useState<number | null>(null);
  // Dynamic vehicle type display labels
  const [vehicleLabels, setVehicleLabels] = useState<Record<string, string>>({
    compact: "Compact/Sedan (Small cars and sedans)",
    midsize: "Mid-Size/SUV (Mid-size cars and SUVs)",
    truck: "Truck/Van/Large SUV (Trucks, vans, large SUVs)",
    luxury: "Luxury/High-End (Luxury and premium vehicles)",
  });
  const [vehicleOptions, setVehicleOptions] = useState<string[]>(['compact', 'midsize', 'truck', 'luxury']);
  const [showClassification, setShowClassification] = useState(false);

  useEffect(() => {
    // Load dynamic vehicle types
    const loadVT = async () => {
      if (isSupabaseEnabled()) {
        try {
          const types = await contentService.getVehicleTypes();
          if (types && types.length > 0) {
            setVehicleOptions(types.filter(t => t.is_active).map(t => t.id));
            const labels: Record<string, string> = {};
            types.forEach(t => labels[t.id] = t.name + (t.description ? ` (${t.description})` : ''));
            setVehicleLabels(labels);
          }
        } catch { }
      }
    };
    loadVT();
    const onChanged = (e: any) => {
      if (e?.detail?.kind === 'vehicle-types') loadVT();
    };
    window.addEventListener('content-changed', onChanged as any);
    return () => window.removeEventListener('content-changed', onChanged as any);
  }, []);

  const getKey = (type: 'package' | 'addon', id: string, size: string) => `${type}:${id}:${size}`;

  const fetchLive = async () => {
    try {
      const res = await fetch(`http://localhost:6066/api/packages/live?v=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
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
    } catch { }
    try {
      const snapshot = await buildFullSyncPayload();
      setSavedPricesLive(snapshot.savedPrices || {});
      setPackageMetaLive(snapshot.packageMeta || {});
      setAddOnMetaLive(snapshot.addOnMeta || {});
      setCustomPackagesLive(snapshot.customPackages || []);
      setCustomAddOnsLive(snapshot.customAddOns || []);
      setLastSyncTs(Date.now());
    } catch {
      // Fallback: If local fetch fails, try Supabase directly
      if (isSupabaseEnabled()) {
        try {
          const [pkgs, addons] = await Promise.all([supaPkgs.getAll(), supaAddOns.getAll()]);

          const newPackageMeta: Record<string, any> = {};
          const newSavedPrices: Record<string, string> = {};

          pkgs.forEach((p: any) => {
            newPackageMeta[p.id] = {
              visible: p.is_active !== false,
              deleted: false, // assuming if it's in the DB it's not "deleted" in the metadata sense, or we filter elsewhere
              imageDataUrl: undefined // Supabase doesn't store the massive data URL in the main table usually, or if it does, map it here
            };
            // Map prices
            newSavedPrices[`package:${p.id}:compact`] = String(p.compact_price || 0);
            newSavedPrices[`package:${p.id}:midsize`] = String(p.midsize_price || 0);
            newSavedPrices[`package:${p.id}:truck`] = String(p.truck_price || 0);
            newSavedPrices[`package:${p.id}:luxury`] = String(p.luxury_price || 0);
          });

          const newAddOnMeta: Record<string, any> = {};
          addons.forEach((a: any) => {
            newAddOnMeta[a.id] = {
              visible: a.is_active !== false,
              deleted: false
            };
            newSavedPrices[`addon:${a.id}:compact`] = String(a.compact_price || 0);
            newSavedPrices[`addon:${a.id}:midsize`] = String(a.midsize_price || 0);
            newSavedPrices[`addon:${a.id}:truck`] = String(a.truck_price || 0);
            newSavedPrices[`addon:${a.id}:luxury`] = String(a.luxury_price || 0);
          });

          setPackageMetaLive(newPackageMeta);
          setAddOnMetaLive(newAddOnMeta);
          setSavedPricesLive(newSavedPrices);
          // For now, customPackages logic in Supabase might need more work if they are stored differently, 
          // but assuming they overwrite built-ins or are just rows in the 'packages' table.
          // IF 'packages' table includes custom packages, we don't need separate customPackagesLive array interactions 
          // unless BookNow logic splits them explicity. 
          // BookNow merges: [...visibleBuiltIns, ...visibleCustomPkgs]
          // The built-in IDs won't change. 
          // The supabase `pkgs` includes BOTH built-in overrides AND custom packages. 
          // So we might need to populate customPackagesLive with any row that isn't a built-in ID.

          const builtInIds = builtInPackages.map(b => b.id);
          const customs = pkgs.filter((p: any) => !builtInIds.includes(p.id)).map((p: any) => ({
            id: p.id,
            name: p.name,
            pricing: {
              compact: p.compact_price,
              midsize: p.midsize_price,
              truck: p.truck_price,
              luxury: p.luxury_price
            },
            steps: [] // Steps might be missing if not joined, but prices are key
          }));
          setCustomPackagesLive(customs);

          const builtInAddOnIds = builtInAddOns.map(b => b.id);
          const customAdds = addons.filter((a: any) => !builtInAddOnIds.includes(a.id)).map((a: any) => ({
            id: a.id,
            name: a.name,
            pricing: {
              compact: a.compact_price,
              midsize: a.midsize_price,
              truck: a.truck_price,
              luxury: a.luxury_price
            },
            steps: []
          }));
          setCustomAddOnsLive(customAdds);

          setLastSyncTs(Date.now());
        } catch (e) {
          console.error("Supabase fallback fetch failed", e);
        }
      }
    }
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
        const res = await fetch(`http://localhost:6066/api/vehicle-types/live?v=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
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
            setVehicleOptions(opts.length ? opts : ['compact', 'midsize', 'truck', 'luxury']);
            // ensure current selection is valid
            if (!opts.includes(vehicleType)) setVehicleType(opts[0] || 'compact');
          }
        }
      } catch { }
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
  const total = packagePrice + addOnsTotal + urlDestFee;
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
    } catch { }
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
    } catch { }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const user = getCurrentUser(); // Check if logged in (staff/admin)

    if (!formData.name.trim()) newErrors.name = "Name is required";

    // If NOT logged in (Regular Customer), enforce strict validation
    if (!user) {
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
      if (!formData.address.trim()) newErrors.address = "Service address is required";
      if (!formData.make.trim()) newErrors.make = "Vehicle make is required";
      if (!formData.model.trim()) newErrors.model = "Vehicle model is required";
      if (!formData.year.trim()) newErrors.year = "Year is required";
      if (!date) newErrors.date = "Please select a preferred date";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addOnDefs = liveAddOns;
  const getAddOnPrice = (id: string, vType: string) => {
    const a = addOnDefs.find(x => x.id === id);
    return a?.pricing?.[vType] || 0;
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
      // console.log(`Customer account created: ${formData.email} / ${autoPassword}`);
      // console.log(`Portal link: ${window.location.origin}/portal?token=auto-${Date.now()}`);
    } catch { }

    // 1) Save booking to API and local store for instant calendar
    const dateIso = date ? date.toISOString() : new Date().toISOString();

    const finalNotes = formData.message || "";

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
      notes: finalNotes,
    };
    try {
      await api('/api/bookings', { method: 'POST', body: JSON.stringify(bookingPayload) });
    } catch { }
    try {
      if (isSupabaseEnabled()) {
        await bookingsSvc.create({
          customer_name: formData.name,
          phone: formData.phone,
          email: formData.email,
          vehicle_type: vehicleType,
          year: formData.year,
          make: formData.make,
          model: formData.model,
          package: bookingPayload.service || formData.package,
          add_ons: addOns,
          date: dateIso,
          notes: finalNotes,
          price_total: discountedTotal,
          status: 'pending',
          booked_by: (() => {
            const u = getCurrentUser();
            if (!u) return 'Customer Web';
            return u.name || u.email || 'Unknown User';
          })()
        });
      }
    } catch (createError) {
      console.error("Booking Creation Failed in Supabase:", createError);
      toast({
        title: "Booking Error",
        description: "Could not save to calendar. Check console for details.",
        variant: "destructive"
      });
      // Don't return, allow PDF/Email to try? Or stop?
      // For now, trace the error.
    }
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
    } catch { }

    // 3) Hidden admin email
    try {
      await api('/api/email/admin', { method: 'POST', body: JSON.stringify({ ...bookingPayload, pdfDataUrl }) });
    } catch { }

    // 4) Customer email
    try {
      await api('/api/email/customer', { method: 'POST', body: JSON.stringify({ to: formData.email, ...bookingPayload, pdfDataUrl }) });
    } catch { }

    // 5) Admin toast + sound (local only)
    try {
      toast({ title: `NEW BOOKING! $${discountedTotal} — ${formData.name}`, description: `${new Date(dateIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, duration: 8000 });
      const audio = new Audio('/sounds/cash-register.mp3');
      audio.play().catch(() => { });
      if (typeof Notification !== 'undefined') {
        if (Notification.permission === 'granted') {
          new Notification('New Booking', { body: `${formData.name} — $${total}`, icon: '/favicon.ico' });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then((p) => { if (p === 'granted') new Notification('New Booking', { body: `${formData.name} — $${total}`, icon: '/favicon.ico' }); });
        }
      }
    } catch { }

    // Allow normal browser POST so Netlify can capture the submission
    try { formEl.submit(); } catch { }

    // 6) Redirect to thank you
    window.location.href = `/thank-you?total=${encodeURIComponent(discountedTotal)}&name=${encodeURIComponent(formData.name)}&time=${encodeURIComponent(new Date(dateIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}&date=${encodeURIComponent(new Date(dateIso).toLocaleDateString())}`;

    // Reset form
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      make: "",
      model: "",
      year: "",
      datetime: "",
      package: "",
      message: "",
      conditionInside: "",
      conditionOutside: ""
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

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const lower = val.toLowerCase();
    if (lower === 'test booking' || lower === 'test customer') {
      // Magic Prefill
      setFormData(prev => ({
        ...prev,
        name: val,
        email: 'test@example.com',
        phone: '5551234567',
        make: 'TestMake',
        model: 'TestModel',
        year: '2024',
        package: prev.package || livePackages[0]?.id || "",
        datetime: prev.datetime || new Date().toISOString().slice(0, 16) // Current time
      }));
      toast({ title: "Test Mode Activated", description: "Mock data prefilled." });
    } else {
      setFormData(prev => ({ ...prev, name: val }));
    }
  };

  return (
    <div className="min-h-screen bg-background pt-16">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/services">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Services
          </Link>
        </Button>

        <div className="space-y-8 animate-fade-in">
          <div className="text-center space-y-4 mb-2">
            <h1 className="text-4xl font-black text-foreground uppercase tracking-tight">Confirm Your Details</h1>
            <p className="text-muted-foreground text-lg italic">Please verify your selection and provide site details below</p>
            <p className="text-xs text-primary font-bold italic">
              * To start a fresh booking with different services, please return to the <Link to="/services" className="underline">Services Page</Link>.
            </p>
          </div>

          {/* READ-ONLY SUMMARY (LOCKED IN) */}
          <Card className="p-0 overflow-hidden border-2 border-blue-400/30 bg-blue-50/95 shadow-2xl">
            <div className="bg-blue-100/50 border-b border-blue-200 p-4 px-6 flex justify-between items-center">
              <h2 className="text-xl font-black text-blue-900 uppercase tracking-wider">Selected Package</h2>
              <span className="text-xs font-bold text-blue-700/70 uppercase bg-blue-200/50 px-3 py-1 rounded-full border border-blue-300/50">Read-Only Summary</span>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="space-y-4 flex-1">
                  <div>
                    <div className="text-xs font-bold text-blue-800/60 uppercase tracking-widest mb-1">Package Name</div>
                    <div className="text-2xl font-bold text-blue-950">{selectedService ? selectedService.name.replace(' (BEST VALUE)', '') : urlPackage || 'Custom Package'}</div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-blue-800/60 uppercase tracking-widest mb-1">Vehicle Size</div>
                    <div className="text-lg font-semibold text-blue-900 capitalize">
                      {vehicleLabels[vehicleType] || vehicleType}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 md:text-right">
                  <div>
                    <div className="text-xs font-bold text-blue-800/60 uppercase tracking-widest mb-1">Price Estimate</div>
                    <div className="text-3xl font-black text-primary italic">
                      ${discountedTotal}
                    </div>
                    {appliedDiscount > 0 && (
                      <div className="text-sm text-green-600 font-bold">
                        -${appliedDiscount} {appliedCouponCode} applied
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-bold text-blue-800/60 uppercase tracking-widest mb-1">Est. Duration</div>
                    <div className="text-sm font-medium text-blue-800 italic">Approx. 2-4 Hours (Varies by Condition)</div>
                  </div>
                </div>
              </div>

              {addOns.length > 0 && (
                <div className="pt-6 border-t border-blue-200">
                  <div className="text-xs font-bold text-blue-800/60 uppercase tracking-widest mb-3">Selected Add-Ons</div>
                  <div className="flex flex-wrap gap-2">
                    {addOns.map(id => {
                      const found = liveAddOns.find(a => a.id === id);
                      return (
                        <span key={id} className="bg-blue-100/50 border border-blue-200 text-blue-900 px-3 py-1.5 rounded-md text-sm font-medium">
                          + {found ? found.name : id}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-4 text-center">
                <p className="text-xs text-blue-700/70 italic">
                  * To change your package or add-ons, please <Link to="/services" className="text-blue-900 font-bold hover:underline">return to the services page</Link>.
                </p>
              </div>
            </div>
          </Card>
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
            <div className="space-y-6">
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 mb-2">
                <h3 className="text-lg font-bold text-foreground uppercase tracking-tight mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Contact & Service Location
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={handleNameChange}
                      required
                      className={errors.name ? "border-destructive h-12" : "h-12"}
                    />
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className={errors.email ? "border-destructive h-12" : "h-12"}
                    />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(555) 000-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      className={errors.phone ? "border-destructive h-12" : "h-12"}
                    />
                    {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Service Address *</Label>
                    <Input
                      id="address"
                      placeholder="Street, City, State, Zip"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      required
                      className="h-12"
                    />
                  </div>
                </div>
              </div>


              <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 mb-2">
                <h3 className="text-lg font-bold text-foreground uppercase tracking-tight mb-4 flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  Vehicle Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="make">Vehicle Make *</Label>
                    <Input
                      id="make"
                      placeholder="e.g., Toyota"
                      value={formData.make}
                      onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                      required
                      className="h-11"
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
                      className="h-11"
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
                      className="h-11"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-bold text-foreground uppercase tracking-tight flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  Select Preferred Date
                </h3>

                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <Card className="p-4 bg-blue-50/95 border-2 border-blue-400/30 shadow-xl mx-auto md:mx-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      className="rounded-md border-0 bg-transparent text-blue-950"
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      modifiers={{
                        booked: (date) => {
                          const dStr = format(date, 'yyyy-MM-dd');
                          return allBookings.some(b => b.date.startsWith(dStr) && b.status !== 'blocked');
                        }
                      }}
                      modifiersStyles={{
                        booked: { fontWeight: 'bold', color: '#1e40af', borderBottom: '2px solid #1e40af' }
                      }}
                    />
                  </Card>

                  <div className="flex-1 space-y-4">
                    <div className="p-4 bg-blue-100/30 border border-blue-200/50 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-1">📅 Why pick a date?</p>
                      <p className="text-xs text-blue-800/80 leading-relaxed">
                        Selecting a date helps us check availability. All bookings are <span className="text-blue-600 font-bold underline">requests pending confirmation</span>. Rick will contact you to finalize the exact time.
                      </p>
                    </div>

                    {date && (
                      <div className="p-4 bg-blue-600 border border-blue-500 rounded-lg animate-in fade-in slide-in-from-left-2 transition-all shadow-lg shadow-blue-500/20">
                        <p className="text-sm font-bold text-white/80 mb-1 uppercase tracking-tight">Selected Date</p>
                        <p className="text-lg font-black text-white">{format(date, 'EEEE, LLLL do, yyyy')}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-blue-900 font-bold">Special Requests or Specific Timing (Optional)</Label>
                      <div className="bg-blue-50/95 p-3 rounded-lg border-2 border-blue-400/30">
                        <Textarea
                          id="message"
                          placeholder="e.g., Morning appointment preferred, parking details, etc."
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          rows={3}
                          className="bg-transparent border-0 text-blue-950 placeholder:text-blue-400 focus-visible:ring-0 min-h-[80px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>





              {/* === IMPROVED COUPON PLACEMENT === */}
              <div className="pt-4">
                {!showCouponField ? (
                  <button
                    type="button"
                    onClick={() => setShowCouponField(true)}
                    className="text-sm text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    Have a promo code?
                  </button>
                ) : (
                  <div className="space-y-3 p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Enter promo code"
                        className="h-10 bg-black border-zinc-700 text-sm focus:border-primary uppercase"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); } }}
                      />
                      <Button
                        className="h-10 px-4 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase transition-all"
                        type="button"
                        onClick={applyCoupon}
                      >
                        Apply
                      </Button>
                    </div>
                    {appliedDiscount > 0 && (
                      <div className="text-green-400 font-bold text-xs flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {appliedCouponCode} applied! You saved ${appliedDiscount.toFixed(2)}
                      </div>
                    )}
                    {couponError && (
                      <div className="text-red-400 font-semibold text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {couponError}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Estimated total */}
              <div className="flex items-center justify-between p-4 border border-border rounded-md">
                <div className="text-sm text-muted-foreground">Estimated Total</div>
                <div className="text-xl font-bold text-foreground">${discountedTotal}</div>
              </div>

              <Button type="submit" className="w-full bg-gradient-hero text-lg py-7 font-black uppercase tracking-tighter shadow-2xl shadow-primary/20 hover:scale-[1.01] transition-transform" disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : "Schedule My Detail"}
              </Button>

              {/* New: Separate Estimate and Payment actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full py-6"
                  onClick={async () => {
                    try {
                      const dateIso = date ? date.toISOString() : new Date().toISOString();

                      // Construct Services List for Estimate
                      const selectedPkg = livePackages.find((p: any) => p.id === formData.package);
                      const servicesList = [];
                      if (selectedPkg) {
                        servicesList.push({ name: selectedPkg.name, price: selectedPkg.pricing[vehicleType] || 0 });
                      }
                      addOns.forEach(id => {
                        const addon = liveAddOns.find((a: any) => a.id === id);
                        if (addon) {
                          servicesList.push({ name: addon.name, price: addon.pricing[vehicleType] || 0 });
                        }
                      });

                      // Save to Supabase
                      await upsertSupabaseEstimate({
                        date: new Date().toLocaleDateString(),
                        status: 'open',
                        total: discountedTotal,
                        services: servicesList,
                        notes: formData.message,
                        customer: {
                          name: formData.name,
                          email: formData.email,
                          phone: formData.phone,
                          type: 'prospect'
                        },
                        vehicle: {
                          year: formData.year,
                          make: formData.make,
                          model: formData.model,
                          type: vehicleType
                        }
                      } as any);

                      const estimatePayload = {
                        kind: 'estimate-request',
                        customer: { name: formData.name, email: formData.email, phone: formData.phone },
                        vehicle: { year: formData.year, make: formData.make, model: formData.model, type: vehicleType },
                        package: formData.package,
                        addOns,
                        preferredDate: dateIso,
                        notes: formData.message,
                      };

                      // 1. Send email (simulated locally)
                      await api('/api/email/admin', { method: 'POST', body: JSON.stringify(estimatePayload) });

                      // 2. Generate PDF and save to File Manager
                      const pdfDataUrl = generateBookingPDF({
                        id: `est_${Date.now()}`,
                        customer: formData.name,
                        date: dateIso,
                        title: "Estimate Request",
                        status: "pending"
                      } as any, {
                        vehicle: `${formData.year} ${formData.make} ${formData.model}`,
                        service: `Estimate: ${formData.package}`,
                        price: discountedTotal,
                        notes: formData.message
                      });

                      const d = new Date();
                      const year = d.getFullYear();
                      const monthName = d.toLocaleString(undefined, { month: 'long' });
                      const path = `Estimates/${year}/${monthName}/`;

                      savePDFToArchive(
                        "Estimate",
                        formData.name,
                        `est_${Date.now()}`,
                        pdfDataUrl,
                        { fileName: `Estimate_${formData.name.replace(/\s/g, '_')}_${Date.now()}.pdf`, path }
                      );

                      toast({ title: "Your estimate request has been sent.", description: "Rick will reach out to confirm.", duration: 4000 });
                    } catch (err) {
                      console.error("Estimate error:", err);
                      toast({ title: "Error sending estimate", description: "Please try again or contact us directly.", variant: "destructive", duration: 4000 });
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
            </div>
          </form>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          By submitting this form, you agree to be contacted by Prime Auto Detail regarding your booking.
        </p>
      </main>
    </div>
  );
};

export default BookNow;
