import React, { useEffect, useState } from "react";
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
import { Calendar as CalendarIcon, Clock, CheckCircle, ArrowLeft, Loader2, HelpCircle, Tag, AlertCircle, Check, CreditCard, ChevronRight, ArrowRight, TestTube2 } from "lucide-react"; // Merged icons
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
import supabase from "@/lib/supabase";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// Calendar component import removed (replaced by AvailabilityPicker)
import { AvailabilityPicker } from "@/components/AvailabilityPicker";
import { format } from "date-fns";
import { cn, formatETDate, formatETTime } from "@/lib/utils";
const getServiceDuration = (id: string = '') => {
  if (id.includes('prime-elite-full')) return 5.5;
  if (id.includes('prime-elite-interior')) return 4.5;
  if (id.includes('prime-elite-exterior')) return 1.5;
  if (id.includes('prime-essential-full')) return 2.5;
  if (id.includes('prime-essential-interior')) return 1.5;
  if (id.includes('prime-essential-exterior')) return 1;
  return 3;
};
import { formatTimeAMPM } from "@/lib/availability";

const BookNow = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedAddons = urlParams.get('addons')?.split(',').filter(Boolean) || [];
  const urlPackage = urlParams.get('package') || '';
  const urlPrice = parseFloat(urlParams.get('price') || '') || 0;
  const urlVehicle = urlParams.get('vehicle') || '';
  const urlDistance = parseFloat(urlParams.get('distance') || '0');
  const urlDateStr = urlParams.get('date');
  const urlTimeStr = urlParams.get('time');
  const urlDestFee = parseFloat(urlParams.get('destinationFee') || '0');

  // 1. All State Declarations First
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", address: "",
    make: urlParams.get('make') || "", model: urlParams.get('model') || "", year: urlParams.get('year') || "",
    datetime: "", package: urlPackage || "", message: urlTimeStr ? `Preferred Time: ${urlTimeStr}` : "",
    conditionInside: "", conditionOutside: ""
  });
  const [vehicleType, setVehicleType] = useState<string>(urlVehicle || 'compact');
  const [addOns, setAddOns] = useState<string[]>(preselectedAddons);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { add: addBooking, items: allBookings, refresh: refreshBookings } = useBookingsStore();
  const { refresh: refreshCoupons, items: allCoupons } = useCouponsStore();
  const [testModeActive, setTestModeActive] = useState(false);

  // Coupon states
  const [couponCode, setCouponCode] = useState('');
  const [matchedCoupon, setMatchedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState<string>('');
  const [showCouponField, setShowCouponField] = useState(false);

  // Date/Time states
  const [date, setDate] = useState<Date | undefined>(() => {
    if (!urlDateStr) return undefined;
    const parts = urlDateStr.split('-').map(Number);
    if (parts.length !== 3) return undefined;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  });
  const [selectedTime, setSelectedTime] = useState(() => {
    if (!urlTimeStr) return '';
    const match = urlTimeStr.match(/(\d+):(\d+)\s?(AM|PM)/i);
    if (match) {
      let [_, h, m, ap] = match;
      let hour = parseInt(h);
      if (ap.toUpperCase() === 'PM' && hour < 12) hour += 12;
      if (ap.toUpperCase() === 'AM' && hour === 12) hour = 0;
      return `${hour.toString().padStart(2, '0')}:${m}:00`;
    }
    return '';
  });
  const [isEditingDate, setIsEditingDate] = useState(!date || !selectedTime);

  // 2. Specialized Logic Functions
  const fillTestData = () => {
    const mockProfiles = [
      { name: "James Wilson", email: "james.w@example.com", phone: "(555) 234-5678", address: "742 Evergreen Terrace, Springfield", make: "Tesla", model: "Model 3", year: "2023", vType: "sedan", package: "prime-essential-exterior", addons: ["premium-wax"], time: "09:00:00" },
      { name: "Sarah Miller", email: "sarah.m@example.com", phone: "(555) 987-6543", address: "1001 Mountain View Rd, Boulder, CO", make: "Ford", model: "F-150", year: "2021", vType: "truck", package: "prime-essential-full", addons: ["clay-bar-treatment"], time: "13:30:00" },
      { name: "Robert Chen", email: "r.chen@tech.io", phone: "(555) 456-7890", address: "50 California St, San Francisco, CA", make: "BMW", model: "X5", year: "2024", vType: "midsize", package: "prime-essential-interior", addons: ["engine-bay-cleaning"], time: "10:00:00" },
      { name: "Elena Rodriguez", email: "elena.rod@lifestyle.com", phone: "(555) 321-0987", address: "12 Biscayne Blvd, Miami, FL", make: "Porsche", model: "Cayenne", year: "2022", vType: "midsize", package: "prime-elite-exterior", addons: ["odor-elimination"], time: "15:00:00" },
      { name: "Marcus Thorne", email: "m.thorne@heavy.net", phone: "(555) 888-9999", address: "99 Industrial Way, Detroit, MI", make: "Chevrolet", model: "Suburban", year: "2020", vType: "truck", package: "prime-elite-full", addons: ["headlight-restoration"], time: "11:00:00" },
      { name: "Sophia Lee", email: "sophia.lee@design.com", phone: "(555) 111-2222", address: "888 Art District, Austin, TX", make: "Rivian", model: "R1S", year: "2024", vType: "midsize", package: "prime-elite-interior", addons: ["ceramic-coating"], time: "08:30:00" },
      { name: "David Miller", email: "david.m@builder.org", phone: "(555) 333-4444", address: "456 Construction Way, Seattle, WA", make: "Ram", model: "1500", year: "2019", vType: "truck", package: "prime-essential-exterior", addons: ["undercarriage-wash"], time: "14:00:00" },
      { name: "Linda Thompson", email: "linda.t@traveler.com", phone: "(555) 555-6666", address: "123 Coastal Hwy, Malibu, CA", make: "Mercedes", model: "GLE", year: "2021", vType: "luxury", package: "prime-essential-full", addons: ["leather-treatment"], time: "12:00:00" }
    ];

    const randomIndex = Math.floor(Math.random() * mockProfiles.length);
    const profile = mockProfiles[randomIndex];

    setFormData(prev => ({
      ...prev,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      address: profile.address,
      make: profile.make,
      model: profile.model,
      year: profile.year,
      package: profile.package,
      message: `[MOCK_DATA] Test booking for ${profile.name} - can be deleted`,
      conditionInside: "Good",
      conditionOutside: "Fair"
    }));
    setVehicleType(profile.vType);
    setAddOns(profile.addons);

    // Default date/time for test booking if not set
    if (!date && !selectedTime) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + (randomIndex + 1));
      setDate(targetDate);
      setSelectedTime(profile.time);
      setIsEditingDate(false);
    }

    toast({
      title: "🧪 Mock Data Filled!",
      description: `Loaded profile: ${profile.name}. ${(!date && !selectedTime) ? "Date/Time defaulted." : "Date/Time preserved."}`
    });
  };

  // 3. Effects
  useEffect(() => {
    refreshBookings();
    refreshCoupons();

    const checkTestMode = async () => {
      const meta = await contentService.getServiceMeta('booking_test_mode');
      if (meta?.meta?.active) {
        setTestModeActive(true);
        setTimeout(fillTestData, 500); 
      }
    };
    checkTestMode();

    const handleContentChange = (e: any) => {
      if (e.detail?.kind === 'booking_test_mode') {
        contentService.getServiceMeta('booking_test_mode').then(m => {
          if (m?.meta?.active) {
            setTestModeActive(true);
            fillTestData();
          } else {
            setTestModeActive(false);
            setFormData({
              name: "", email: "", phone: "", address: "", make: "", model: "", year: "",
              datetime: "", package: urlPackage || "", message: "", conditionInside: "", conditionOutside: ""
            });
            setAddOns([]);
          }
        });
      }
    };
    window.addEventListener('content-changed', handleContentChange as any);
    return () => window.removeEventListener('content-changed', handleContentChange as any);
  }, []);

  // Map bookings for AvailabilityPicker
  const mappedBookings = allBookings.map(b => ({
    scheduled_at: b.date,
    estimated_duration: b.endTime
      ? (new Date(b.endTime).getTime() - new Date(b.date).getTime()) / (1000 * 60 * 60)
      : 3
  }));

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
      const res = await fetch(`/api/packages/live?v=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
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
        const res = await fetch(`/api/vehicle-types/live?v=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
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
  const legacyIds = ['basic-exterior', 'express-wax', 'full-exterior', 'interior-cleaning', 'full-detail', 'premium-detail'];

  const visibleBuiltIns = builtInPackages.filter(p => (packageMetaLive[p.id]?.visible) !== false && !packageMetaLive[p.id]?.deleted);
  const visibleCustomPkgs = customPackagesLive.filter((p: any) => (packageMetaLive[p.id]?.visible) !== false && !packageMetaLive[p.id]?.deleted);
  const livePackages = [...visibleBuiltIns, ...visibleCustomPkgs].map((p: any) => {
    const pricing: Record<string, number> = {
      compact: parseFloat(savedPricesLive[getKey('package', p.id, 'compact')]) || p.pricing?.compact || 0,
      midsize: parseFloat(savedPricesLive[getKey('package', p.id, 'midsize')]) || p.pricing?.midsize || 0,
      truck: parseFloat(savedPricesLive[getKey('package', p.id, 'truck')]) || p.pricing?.truck || 0,
      luxury: parseFloat(savedPricesLive[getKey('package', p.id, 'luxury')]) || p.pricing?.luxury || 0,
    };
    // bring in any dynamically seeded vehicle-type pricing
    Object.keys(savedPricesLive).forEach((k) => {
      const prefix = `package:${p.id}:`;
      if (k.startsWith(prefix)) {
        const veh = k.slice(prefix.length);
        const val = parseFloat(savedPricesLive[k]);
        if (!Number.isNaN(val) && val > 0) pricing[veh] = val;
      }
    });
    const metaSteps: string[] | undefined = packageMetaLive[p.id]?.stepIds;
    const steps = metaSteps && metaSteps.length > 0
      ? metaSteps.map(id => ({ id, name: allBuiltInSteps[id]?.name || customServicesMap[id] || id }))
      : p.steps.map((s: any) => (typeof s === 'string' ? { id: s, name: s } : s));
    return { ...p, pricing, steps };
  });

  // Filter packages based on mode (3-pack or 6-pack)
  const [packageMode, setPackageMode] = React.useState<string>('6-pack');

  React.useEffect(() => {
    fetch('/package-mode.json?v=' + Date.now())
      .then(res => res.json())
      .then(data => {
        console.log('📦 Package mode loaded:', data.mode);
        setPackageMode(data.mode || '6-pack');
      })
      .catch(() => setPackageMode('6-pack'));
  }, []);

  // Filter packages: only include Essential and Elite Prime Packages
  const filteredPackages = livePackages.filter(p =>
    p.id.startsWith('prime-essential') || p.id.startsWith('prime-elite')
  );

  const visibleBuiltAddOns = builtInAddOns.filter(a => (addOnMetaLive[a.id]?.visible) !== false && !addOnMetaLive[a.id]?.deleted);
  const visibleCustomAddOns = customAddOnsLive.filter((a: any) => (addOnMetaLive[a.id]?.visible) !== false && !addOnMetaLive[a.id]?.deleted);
  const liveAddOns = [...visibleBuiltAddOns, ...visibleCustomAddOns].map((a: any) => {
    const pricing: Record<string, number> = {
      compact: parseFloat(savedPricesLive[getKey('addon', a.id, 'compact')]) || a.pricing?.compact || 0,
      midsize: parseFloat(savedPricesLive[getKey('addon', a.id, 'midsize')]) || a.pricing?.midsize || 0,
      truck: parseFloat(savedPricesLive[getKey('addon', a.id, 'truck')]) || a.pricing?.truck || 0,
      luxury: parseFloat(savedPricesLive[getKey('addon', a.id, 'luxury')]) || a.pricing?.luxury || 0,
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
  const selectedService = filteredPackages.find(s => s.id === formData.package);
  const selectedServicePrice = selectedService ? (selectedService.pricing[vehicleType] ?? selectedService.pricing['compact'] ?? 0) : 0;

  // If we have a selected package, use its dynamic price. 
  // If not, fall back to urlPrice (e.g. custom link).
  const packagePrice = selectedService ? selectedServicePrice : (urlPrice > 0 ? urlPrice : 0);
  const addOnsTotal = addOns.reduce((sum, id) => {
    const found = liveAddOns.find(a => a.id === id);
    const price = found ? (found.pricing[vehicleType] ?? found.pricing['compact'] ?? 0) : 0;
    return sum + price;
  }, 0);
  const total = packagePrice + addOnsTotal + urlDestFee;
  const appliedDiscount = matchedCoupon
    ? (matchedCoupon.percent ? (total * matchedCoupon.percent / 100) : (matchedCoupon.amount || 0))
    : 0;
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
  const applyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    setCouponError('');
    console.log(`[Coupon] Attempting to apply code: ${code}`);

    try {
      // 1. Force a refresh from Supabase to ensure we have any newly created coupons
      await refreshCoupons();

      // 2. IMPORTANT: Use the store state directly. 
      // React state 'allCoupons' may still be stale in this execution frame.
      const freshItems = useCouponsStore.getState().items;
      console.log(`[Coupon] Store contains ${freshItems.length} coupons:`, freshItems.map(c => c.code));

      const match = freshItems.find((c: any) => c.code === code);

      if (!match) {
        setMatchedCoupon(null);
        setCouponError('This coupon code is not valid');
        console.warn(`[Coupon] No match found for code: ${code}`);
        return;
      }

      // 3. Detailed validation check
      const now = new Date();
      // usesLeft 99999 means unlimited
      const hasUses = match.usesLeft === undefined || match.usesLeft > 0;
      const isDateValid = (!match.startDate || new Date(match.startDate) <= now) &&
        (!match.endDate || new Date(match.endDate) >= now);

      console.log(`[Coupon] Match found:`, {
        code: match.code,
        active: match.active,
        hasUses,
        isDateValid,
        percent: match.percent,
        amount: match.amount
      });

      if (!match.active) {
        setMatchedCoupon(null);
        setCouponError('This coupon is currently disabled');
        return;
      }

      if (!hasUses) {
        setMatchedCoupon(null);
        setCouponError('This coupon has reached its usage limit');
        return;
      }

      if (!isDateValid) {
        setMatchedCoupon(null);
        setCouponError('This coupon has expired or is not yet active');
        return;
      }

      // Success
      setMatchedCoupon(match);
      setCouponError('');
      toast({
        title: "Success!",
        description: `Coupon ${match.code} applied.`
      });
    } catch (err) {
      console.error('[BookNow] applyCoupon error', err);
      setCouponError('Could not validate coupon. Please try again.');
    }
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
      if (!date) {
        newErrors.date = "Please select a preferred date";
      } else if (!selectedTime) {
        newErrors.date = "Please select an available time slot";
      }
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

    try {
      // Silent auto-create customer account
      try {
        const autoPassword = `PDS${Math.random().toString(36).slice(2, 10)}`;
        // console.log(`Customer account created: ${formData.email} / ${autoPassword}`);
        // console.log(`Portal link: ${window.location.origin}/portal?token=auto-${Date.now()}`);
      } catch { }

      // 1) Save booking to Supabase (creates customer/vehicle/booking in one flow)
      let submissionDate = date ? new Date(date) : new Date();

      if (selectedTime && date) {
        const [h, m] = selectedTime.split(':').map(Number);
        submissionDate.setHours(h, m, 0, 0);
      }

      const dateIso = submissionDate.toISOString();
      // Ensure all bookings created during Admin Test Mode are flagged for future purging
      const mockSignature = "[MOCK_DATA]";
      let finalNotes = formData.message || "";
      if (testModeActive && !finalNotes.includes(mockSignature)) {
        finalNotes = `${mockSignature} ${finalNotes}`.trim();
      }

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

      let createdBooking: any = null;
      try {
        if (isSupabaseEnabled()) {
          createdBooking = await bookingsSvc.create({
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
            status: 'tentative',
            booked_by: 'Customer Web'
          });
        }
      } catch (createError) {
        console.error("Booking Creation Failed in Supabase:", createError);
      }

      const finalId = createdBooking?.id ? String(createdBooking.id) : `booking_${Date.now()}`;
      const durationHours = getServiceDuration(bookingPayload.service || formData.package);
      const endTimeDate = new Date(submissionDate.getTime() + durationHours * 60 * 60 * 1000);
      const endTimeIso = endTimeDate.toISOString();

      console.log('✅ BOOKING CREATED:', {
        id: finalId,
        customer: formData.name,
        service: bookingPayload.service,
        date: dateIso,
        status: 'tentative',
        supabaseId: createdBooking?.id
      });

      // Trigger notifications and PDF generation (booking already saved to Supabase above)
      const bookingRecord = {
        id: finalId,
        title: bookingPayload.service || "Booking",
        customer: formData.name,
        date: dateIso,
        endTime: endTimeIso,
        status: "tentative" as const,
        bookedBy: 'Customer Web',
        vehicle: vehicleType,
        vehicleYear: formData.year,
        vehicleMake: formData.make,
        vehicleModel: formData.model,
        price: discountedTotal,
        notes: finalNotes,
        source: 'Public Website'
      };

      // Generate and save PDF to File Manager (this creates ONE alert)
      try {
        const { onBookingCreated } = await import("@/lib/bookingsSync");
        await onBookingCreated(bookingRecord);
        console.log('✅ PDF GENERATED and saved to File Manager');
      } catch (syncErr) {
        console.error("❌ PDF/Alert generation failed:", syncErr);
      }

      // FORCE REFRESH the bookings store to show the new booking immediately
      console.log('🔄 Refreshing bookings store...');
      await refreshBookings();

      // Wait a moment and refresh again to be absolutely sure
      setTimeout(async () => {
        await refreshBookings();
        console.log('✅ Bookings store refreshed AGAIN');
      }, 1000);

      // Send REAL Email to Admin (Rick.PrimeAutoDetail@gmail.com)
      try {
        const formattedDate = formatETDate(dateIso);
        const formattedTime = formatETTime(dateIso);

        console.log('📧 Notifying Admin and Customer via Edge Function...');

        // 1. Send to Admin
        const adminEmail = supabase.functions.invoke('send-booking-email', {
          body: {
            to: 'rick.primeautodetail@gmail.com',
            subject: `🔔 NEW REQUEST: ${formData.name} - ${bookingPayload.service}`,
            customerName: formData.name,
            customerEmail: formData.email,
            service: bookingPayload.service,
            date: formattedDate,
            time: formattedTime,
            price: discountedTotal.toFixed(2),
            status: 'TENTATIVE'
          }
        });

        // 2. Send to Customer (Receipt)
        const customerEmail = formData.email ? supabase.functions.invoke('send-booking-email', {
          body: {
            to: formData.email,
            subject: `🚗 Request Received: ${bookingPayload.service}`,
            customerName: formData.name,
            customerEmail: formData.email,
            service: bookingPayload.service,
            date: formattedDate,
            time: formattedTime,
            price: discountedTotal.toFixed(2),
            status: 'TENTATIVE'
          }
        }) : Promise.resolve({ error: null });

        const [adminRes, customerRes] = await Promise.all([adminEmail, customerEmail]);

        if (adminRes.error) console.error('❌ Admin Email Error:', adminRes.error);
        if (customerRes.error) console.error('❌ Customer Email Error:', customerRes.error);

        console.log('✅ Notification emails dispatched');
      } catch (emailError) {
        console.error("❌ Email sending FAILED:", emailError);
      }

      // Redirect to thank you
      navigate(`/thank-you?total=${encodeURIComponent(discountedTotal)}&name=${encodeURIComponent(formData.name)}&time=${encodeURIComponent(formatETTime(dateIso))}&date=${encodeURIComponent(formatETDate(dateIso))}`);

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
    } catch (error: any) {
      console.error("Booking submission failed:", error);
      toast({
        title: "Booking Failed",
        description: error?.message || "An unexpected error occurred. Please try again or contact support.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
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
        package: prev.package || filteredPackages[0]?.id || "",
        datetime: prev.datetime || new Date().toISOString().slice(0, 16) // Current time
      }));
      toast({ title: "Test Mode Activated", description: "Mock data prefilled." });
    } else {
      setFormData(prev => ({ ...prev, name: val }));
      if (errors.name) setErrors(prev => { const n = { ...prev }; delete n.name; return n; });
    }
  };

  const [showBackToTop, setShowBackToTop] = useState(false);
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-background pt-16">
      <Navbar />

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-10 right-10 z-[60] bg-primary text-white p-4 rounded-full shadow-2xl transition-all duration-300 animate-in fade-in zoom-in hover:scale-110 active:scale-95 group overflow-hidden"
          title="Back to Top"
        >
          <div className="absolute inset-0 bg-white/20 animate-ping opacity-20" />
          <div className="absolute inset-0 bg-white/10 animate-pulse-glow-inner" />
          <ArrowLeft className="w-6 h-6 rotate-90 relative z-10 font-black stroke-[3]" />
          <style>{`
            @keyframes pulse-glow-inner {
              0%, 100% { transform: scale(1); opacity: 0.3; }
              50% { transform: scale(1.15); opacity: 0.1; }
            }
            .animate-pulse-glow-inner {
              animation: pulse-glow-inner 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }
          `}</style>
        </button>
      )}

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {testModeActive && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between animate-pulse-subtle shadow-lg shadow-amber-500/5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center shadow-inner ring-2 ring-amber-400/50">
                <TestTube2 className="h-5 w-5 text-black" />
              </div>
              <div>
                <h3 className="text-amber-500 font-black italic uppercase tracking-tighter text-sm flex items-center gap-2">
                  Admin Test Mode Active
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                </h3>
                <p className="text-[10px] text-zinc-500 font-medium">Verification mode enabled: form fields are pre-filled with randomized test identities.</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[10px] uppercase font-bold text-amber-500 hover:bg-amber-500 hover:text-black transition-all border border-amber-500/20 hover:border-amber-500 px-4"
              onClick={fillTestData}
            >
              Shuffle Data
            </Button>
          </div>
        )}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" asChild>
            <Link to="/services">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Services
            </Link>
          </Button>


        </div>

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
                      ${discountedTotal.toFixed(2)}
                    </div>
                    {appliedDiscount > 0 && (
                      <div className="text-sm text-green-600 font-bold">
                        -${appliedDiscount.toFixed(2)} {matchedCoupon?.code} applied
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
          <form onSubmit={handleSubmit} className="space-y-4" name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field" noValidate>
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
                    {errors.name && <p className="text-[13px] text-red-600 font-bold animate-pulse-grow uppercase tracking-tight ml-1 mt-1 block decoration-red-600 underline underline-offset-2">⚠️ {errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        if (errors.email) setErrors(prev => { const n = { ...prev }; delete n.email; return n; });
                      }}
                      required
                      className={errors.email ? "border-destructive h-12" : "h-12"}
                    />
                    {errors.email && <p className="text-[13px] text-red-600 font-bold animate-pulse-grow uppercase tracking-tight ml-1 mt-1 block decoration-red-600 underline underline-offset-2">⚠️ {errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(555) 000-0000"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData({ ...formData, phone: e.target.value });
                        if (errors.phone) setErrors(prev => { const n = { ...prev }; delete n.phone; return n; });
                      }}
                      required
                      className={errors.phone ? "border-destructive h-12" : "h-12"}
                    />
                    {errors.phone && <p className="text-[13px] text-red-600 font-bold animate-pulse-grow uppercase tracking-tight ml-1 mt-1 block decoration-red-600 underline underline-offset-2">⚠️ {errors.phone}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Service Address *</Label>
                    <Input
                      id="address"
                      placeholder="Street, City, State, Zip"
                      value={formData.address}
                      onChange={(e) => {
                        setFormData({ ...formData, address: e.target.value });
                        if (errors.address) setErrors(prev => { const n = { ...prev }; delete n.address; return n; });
                      }}
                      required
                      className={errors.address ? "border-destructive h-12" : "h-12"}
                    />
                    {errors.address && <p className="text-[13px] text-red-600 font-bold animate-pulse-grow uppercase tracking-tight ml-1 mt-1 block decoration-red-600 underline underline-offset-2">⚠️ {errors.address}</p>}
                  </div>
                </div>
              </div>


              <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 mb-2">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-foreground uppercase tracking-tight flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-primary" />
                    Vehicle Details
                  </h3>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => setShowClassification(true)}
                    className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-full text-[10px] h-auto font-black uppercase tracking-widest shadow-lg shadow-blue-500/20"
                    title="Our Vehicle Classifier helps you determine exactly which size category (Compact, Mid-Size, Truck) your specific vehicle belongs to, ensuring accurate pricing."
                  >
                    Vehicle Classifier
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="make">Vehicle Make *</Label>
                    <Input
                      id="make"
                      placeholder="e.g., Toyota"
                      value={formData.make}
                      onChange={(e) => {
                        setFormData({ ...formData, make: e.target.value });
                        if (errors.make) setErrors(prev => { const n = { ...prev }; delete n.make; return n; });
                      }}
                      required
                      className={errors.make ? "border-destructive h-11" : "h-11"}
                    />
                    {errors.make && <p className="text-[12px] text-white bg-red-600 py-1 px-2 rounded-md font-black animate-pulse-grow uppercase tracking-tight ml-1 mt-1 inline-block shadow-lg ring-2 ring-red-400">⚠️ {errors.make}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">Vehicle Model *</Label>
                    <Input
                      id="model"
                      placeholder="e.g., Camry"
                      value={formData.model}
                      onChange={(e) => {
                        setFormData({ ...formData, model: e.target.value });
                        if (errors.model) setErrors(prev => { const n = { ...prev }; delete n.model; return n; });
                      }}
                      required
                      className={errors.model ? "border-destructive h-11" : "h-11"}
                    />
                    {errors.model && <p className="text-[12px] text-white bg-red-600 py-1 px-2 rounded-md font-black animate-pulse-grow uppercase tracking-tight ml-1 mt-1 inline-block shadow-lg ring-2 ring-red-400">⚠️ {errors.model}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year">Year *</Label>
                    <Input
                      id="year"
                      placeholder="e.g., 2020"
                      value={formData.year}
                      onChange={(e) => {
                        setFormData({ ...formData, year: e.target.value });
                        if (errors.year) setErrors(prev => { const n = { ...prev }; delete n.year; return n; });
                      }}
                      required
                      className={errors.year ? "border-destructive h-11" : "h-11"}
                    />
                    {errors.year && <p className="text-[12px] text-white bg-red-600 py-1 px-2 rounded-md font-black animate-pulse-grow uppercase tracking-tight ml-1 mt-1 inline-block shadow-lg ring-2 ring-red-400">⚠️ {errors.year}</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-bold text-foreground uppercase tracking-tight flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  Select Preferred Date
                </h3>

                <div className="flex flex-col gap-6">
                  {(!isEditingDate && date && selectedTime) ? (
                    <div className="bg-green-50/50 border border-green-200 p-4 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-full text-green-700 shadow-sm border border-green-200">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-green-900 text-xs uppercase tracking-wide mb-0.5">Date & Time Confirmed</div>
                          <div className="text-lg font-bold text-green-950 flex items-center gap-2">
                            {format(date, 'EEEE, MMMM do')} <span className="text-green-300">|</span> {formatTimeAMPM(selectedTime)}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-700 hover:text-green-900 hover:bg-green-100 font-medium"
                        onClick={() => setIsEditingDate(true)}
                        type="button"
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <div className={cn("w-full bg-white p-4 rounded-lg shadow-sm border", errors.date ? "border-red-500 ring-2 ring-red-500/20" : "border-zinc-200")}>
                      <AvailabilityPicker
                        selectedDate={date}
                        selectedTime={selectedTime}
                        onDateChange={(d) => {
                          setDate(d);
                          if (d && errors.date) {
                            setErrors(prev => {
                              const next = { ...prev };
                              delete next.date;
                              return next;
                            });
                          }
                        }}
                        onTimeChange={(t) => {
                          setSelectedTime(t);
                          // Also clear date error if time is selected
                          if (t && errors.date) {
                            setErrors(prev => {
                              const next = { ...prev };
                              delete next.date;
                              return next;
                            });
                          }
                        }}
                        existingBookings={mappedBookings}
                        serviceDuration={getServiceDuration(formData.package)}
                      />
                      {errors.date && <p className="text-[13px] text-red-600 font-bold animate-pulse-grow uppercase tracking-tight mt-4 text-center block decoration-red-600 underline underline-offset-2">⚠️ {errors.date}</p>}
                    </div>
                  )}

                  <div className="p-4 bg-blue-100/30 border border-blue-200/50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <Label htmlFor="message" className="font-bold text-blue-900 uppercase text-xs tracking-wider">Special Requests / Notes</Label>
                      {date && <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">{format(date, 'EEEE, LLLL do, yyyy')} {selectedTime ? `@ ${formatTimeAMPM(selectedTime)}` : ''}</span>}
                    </div>
                    <Textarea
                      id="message"
                      placeholder="Any specific concerns? (e.g. stains, pet hair...)"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="min-h-[120px] bg-white border-blue-200 focus:border-blue-500"
                    />
                  </div>
                </div>

              </div>
            </div>





            {/* === IMPROVED COUPON PLACEMENT === */}
            <div className="pt-6">
              {!showCouponField ? (
                <button
                  type="button"
                  onClick={() => setShowCouponField(true)}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-bold transition-all flex items-center gap-1.5 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 shadow-sm"
                >
                  <Tag className="w-3.5 h-3.5" />
                  Apply Promotional Code?
                </button>
              ) : (
                <div className="space-y-4 p-5 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-500">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Promotional Code</h3>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Enter code"
                      className="h-11 bg-black border-zinc-800 text-sm focus:border-primary uppercase text-white font-bold tracking-widest"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); } }}
                    />
                    <Button
                      className="h-11 px-6 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg"
                      type="button"
                      onClick={applyCoupon}
                    >
                      Apply
                    </Button>
                  </div>
                  {matchedCoupon && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                      <div className="bg-emerald-500 rounded-full p-1 shadow-lg shadow-emerald-500/20">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-emerald-500 font-black text-[11px] uppercase tracking-widest">
                        {matchedCoupon.code} Success! Disount Applied: -${appliedDiscount.toFixed(2)}
                      </span>
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
              <div className="text-xl font-bold text-foreground">${discountedTotal.toFixed(2)}</div>
            </div>

            {/* Tentative Booking Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-amber-900 uppercase tracking-tight">Important Note Regarding Your Booking</p>
                  <p className="text-xs text-amber-800 leading-relaxed font-medium">
                    Please note that this is a <span className="underline decoration-amber-400 decoration-2 underline-offset-2">tentative booking request</span>. Your appointment is not finalized until we personally review our schedule and send a formal confirmation email. We will reach out shortly to confirm the exact time and details.
                  </p>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full bg-gradient-hero text-lg py-7 font-black uppercase tracking-tighter shadow-2xl shadow-primary/20 hover:scale-[1.01] transition-transform" disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : "Schedule My Detail"}
            </Button>

            <div className="flex justify-center mt-6">
              <Button
                type="button"
                variant="ghost"
                className="text-primary hover:text-primary/80 font-bold underline p-0 h-auto"
                asChild
              >
                <Link to="/checkout">Make a Payment / Checkout</Link>
              </Button>
            </div>
          </form>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          By submitting this form, you agree to be contacted by Prime Auto Detail regarding your booking.
        </p>
        <VehicleClassificationDialog
          open={showClassification}
          onOpenChange={setShowClassification}
          onSelect={(category, details) => {
            setVehicleType(category);
            if (details) {
              setFormData(prev => ({
                ...prev,
                make: details.make,
                model: details.model
              }));
              // UX: Toast confirmation
              toast({ title: "Vehicle Updated", description: `${details.make} ${details.model} classified as ${category.toUpperCase()}` });
            }
            setShowClassification(false);
          }}
        />
      </main>
    </div>
  );
};

export default BookNow;
