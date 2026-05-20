import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { postFullSync, getAllPackageMeta, setPackageMeta, getCustomPackages, getCustomServices } from "@/lib/servicesMeta";
import { servicePackages as builtInPackages } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import { useDemoMode } from "@/contexts/DemoContext";
import { contentService } from "@/lib/content";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Facebook, 
  Pencil, 
  Trash2, 
  HelpCircle, 
  TestTube2,
  Users, 
  Rocket, 
  Calendar, 
  ShieldCheck, 
  ChevronsDown, 
  ChevronsUp,
  LayoutDashboard,
  Snowflake,
  Construction,
  Info,
  Settings,
  Tag
} from "lucide-react";
import HelpModal from "@/components/help/HelpModal";

const notifyChange = (kind: string) => {
  try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind } })); } catch { }
};
import * as bookingsSvc from "@/services/supabase/bookings";

const DEFAULT_PROMO_OPTIONS = [
  {
    id: 'ceramic-sale',
    name: '🔥 Ceramic Coating Sale (15% Off Special)',
    title: '🔥 SPECIAL OFFER: 15% OFF ALL CERAMIC COATINGS 🔥',
    desc: 'Book your professional detailing experience online today and save 15% on premium ceramic coatings! This limited-time offer includes professional paint correction and premium surface protection at our state-of-the-art Methuen facility.'
  },
  {
    id: 'shop-wide',
    name: '✨ 10% Off All Services (Shop Wide Special)',
    title: '✨ SPECIAL OFFER: 10% OFF ALL SERVICES SHOP WIDE ✨',
    desc: 'Save 10% on any detailing package booked online! Get premium interior and exterior detailing from our certified team at our Methuen facility. Limited time only!'
  },
  {
    id: 'addon-special',
    name: '🚀 15% Off All Service Add-Ons!',
    title: '🚀 SPECIAL OFFER: 15% OFF ALL SERVICE ADD-ONS 🚀',
    desc: 'Enhance your detail today! Save 15% on premium add-ons including glass ceramic coating, engine bay detailing, leather conditioning, and pet hair removal.'
  },
  {
    id: 'winter-protection',
    name: '❄️ Winter Protection (Free Windshield Coating)',
    title: '❄️ WINTER SPECIAL: FREE CERAMIC WINDSHIELD COATING ❄️',
    desc: 'Book any full exterior or interior detail package and receive a complimentary premium ceramic windshield glass coating to repel rain, snow, and ice!'
  },
  {
    id: 'spring-renewal',
    name: '🌸 Spring Renewal Detail (10% Off Full Detail)',
    title: '🌸 SPRING RENEWAL: 10% OFF FULL DETAIL PACKAGES 🌸',
    desc: 'Wash away winter salt and grime! Save 10% on full interior + exterior renewal packages. Bring back that new car shine and protect your paint today.'
  }
];

export default function WebsiteAdministration() {
  const { toast } = useToast();
  const { isDemoMode } = useDemoMode();

  const [customPromoOptions, setCustomPromoOptions] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('prime_custom_sale_ideas');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const promoOptions = [...DEFAULT_PROMO_OPTIONS, ...customPromoOptions];

  const handleSelectPromo = (promoId: string) => {
    const selected = promoOptions.find(p => p.id === promoId);
    if (selected) {
      setBusinessStatus((prev: any) => ({
        ...prev,
        topBannerText: selected.title,
        topBannerDescription: selected.desc,
        bannerText: selected.title,
        bannerDescription: selected.desc
      }));
      toast({
        title: "Promo Idea Applied",
        description: `Loaded preset: ${selected.name}`
      });
    }
  };

  const handleSaveCustomPromo = () => {
    const title = businessStatus.topBannerText || '';
    const desc = businessStatus.topBannerDescription || '';
    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an Announcement Title before saving.",
        variant: "destructive"
      });
      return;
    }
    const name = prompt("Enter a friendly name for this custom sale preset (e.g. '15% off All Add-Ons!'):");
    if (!name || !name.trim()) return;

    const newPreset = {
      id: `custom-promo-${Date.now()}`,
      name: `✨ ${name.trim()}`,
      title: title.trim(),
      desc: desc.trim()
    };

    const updated = [...customPromoOptions, newPreset];
    setCustomPromoOptions(updated);
    localStorage.setItem('prime_custom_sale_ideas', JSON.stringify(updated));
    toast({
      title: "Preset Saved",
      description: `"${name}" has been added to your growing dropdown list!`
    });
  };

  const ensureNotDemo = (action: string) => {
    if (isDemoMode) {
      toast({
        title: "Simulation Active",
        description: `Persistent ${action} is disabled in the public interactive demo. Your local changes will not affect live business data.`,
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
  const [showBookNow, setShowBookNow] = useState(false);
  const [helpId, setHelpId] = useState<string | null>(null);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [contactInfo, setContactInfo] = useState<{ hours: string; phone: string; address: string; email: string }>({ hours: '', phone: '', address: '', email: '' });
  const [aboutSections, setAboutSections] = useState<any[]>([]);
  const [aboutFeatures, setAboutFeatures] = useState<{ expertTeam: string; ecoFriendly: string; satisfactionGuarantee: string }>({ expertTeam: '', ecoFriendly: '', satisfactionGuarantee: '' });
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [servicesDisclaimer, setServicesDisclaimer] = useState<string>('');
  const [contractualDisclosure, setContractualDisclosure] = useState<string>('Precision paint decontamination, high-level interior sanitation, and hydrophobic surface sealing. Premium tiers focus on long-term ceramic preservation.');
  const [valuationDisclaimer, setValuationDisclaimer] = useState<string>('Automated digital quotations serve as initial estimates based on standard vehicle metadata. Prime Auto Detail reserves the right to adjust final invoicing on-site upon verification of actual vehicle dimensions, surface contamination levels, and overall condition.');
  const DEFAULT_HOME_DATA = {
    heroTitle: 'PRIME AUTO DETAIL',
    heroSubtitle: 'Premium auto detailing services that exceed expectations',
    whyMattersTitle: 'More Than Just',
    whyMattersAccent: 'Detailing Matters',
    whyMatters: 'Most people mistake a quick car wash for detailing. While automated washes often leave behind micro-scratches and strip protective layers, professional detailing is a restorative process.',
    whyMattersList: ["Decontamination of all surfaces", "Paint correction to remove swirl marks", "Ceramic coatings for long-term protection", "Deep interior restoration and conditioning"],
    beyondSurfaceTitle: 'Beyond the Surface',
    beyondSurfaceSubtitle: 'Specialized care for every inch of your investment.',
    precisionProcessTitle: 'Our Precision Process',
    precisionProcessSteps: [
      { step: "01", name: "Booking", desc: "Easily schedule through our portal with transparent upfront pricing." },
      { step: "02", name: "Evaluation", desc: "On-site condition assessment to tailor our plan to your vehicle." },
      { step: "03", name: "The Detail", desc: "Clock-out service where we don't leave until the job is perfect." }
    ],
    eliteResultsTitle: 'Elite Results. Delivered.',
    eliteResultsText: 'We bring the high-end studio experience to your driveway. No lines, no wait, just unmatched precision.',
    perfectedTitle: 'Perfected for Every Driver',
    perfectedSubtitle: 'Whether it\'s your daily commute or your weekend pride, we have a solution.',
    showTestimonials: false
  };

  const [homeData, setHomeData] = useState<any>(DEFAULT_HOME_DATA);
  const DEFAULT_ABOUT_DATA = {
    heroBadge: 'Premium Craftsmanship',
    heroTitle: 'About Prime Auto Detail',
    heroSubtitle: 'Elevating automotive care through precision, passion, and a commitment to perfection. We don\'t just clean cars—we preserve investments.',
    moreThanWashTitle: 'More Than a Car Wash',
    moreThanWashSubtitle: 'Understanding the difference between cleaning and detailing.',
    benefits: [
      { title: "Paint Preservation", desc: "Automated washes use abrasive brushes that create micro-scratches. We use pH-neutral chemicals and hand-washing techniques to protect your clear coat." },
      { title: "Value Retention", desc: "A professionally detailed car maintains a much higher resale value. We remove contaminants that cause long-term corrosion and oxidation." },
      { title: "Internal Health", desc: "We don\'t just vacuum. We steam-clean, extract, and condition surfaces to remove bacteria and allergens, creating a healthier environment for you." }
    ],
    interiorRefreshTitle: 'Interior Refresh & Restoration',
    interiorRefreshText: 'The cabin of your vehicle should be a sanctuary. Our interior detailing process goes beyond a simple wipe-down. We deep-clean every surface, extract deep-seated dirt from carpets, and condition leather to its original supple feel.',
    interiorRefreshList: [
      "Deep Steam Cleaning & Sanitization",
      "Professional Carpet & Upholstery Extraction",
      "Premium Leather Conditioning (Matte Finish)",
      "Odor Elimination & Air Quality Improvement",
      "Meticulous Cracks & Crevices Detail"
    ],
    exteriorCareTitle: 'Exterior Care That Protects',
    exteriorCareText: 'Your paint is constantly under attack from UV rays, road salt, and environmental debris. We use multi-stage decontamination and professional polishing to restore clarity, followed by the best protective sealants in the industry.',
    approachTitle: 'Our Approach',
    approachText: 'Our philosophy is simple: Education first, upsell never. We evaluate your vehicle\'s specific condition and tailor our techniques to provide the best possible results without unnecessary additives.',
    showTestimonials: false,
    whoWeAreTitle: 'Who We Are',
    whoWeAreText: 'Prime Auto Detail is a locally owned, dedicated professional mobile auto detailing service designed for vehicle owners who demand more than a "quick wash." Our focus is on quality over quantity. Every vehicle that enters our care is treated with the same meticulous attention to detail as if it were our own. We focus on delivering results that exceed expectations through careful attention to detail and professional-grade standards.'
  };

  const [aboutData, setAboutData] = useState<any>(DEFAULT_ABOUT_DATA);
  const DEFAULT_FOOTER_DATA = {
    brandName: 'Prime Auto Detail',
    marqueeText: 'Precision. Protection. Perfection.',
    copyrightText: `© ${new Date().getFullYear()} Prime Auto Detail. All Rights Reserved.`,
    facebookUrl: 'https://www.facebook.com/PrimeAutoDetail.net'
  };

  const [footerData, setFooterData] = useState<any>(DEFAULT_FOOTER_DATA);
  const [headerLinks, setHeaderLinks] = useState<any[]>([]);
  const [learnMoreEdit, setLearnMoreEdit] = useState<Record<string, { description: string; stepIds: string[] }>>({});
  const [allStepOptions, setAllStepOptions] = useState<{ id: string; name: string }[]>([]);
  const [editTestimonial, setEditTestimonial] = useState<any | null>(null);
  const [newTestimonialOpen, setNewTestimonialOpen] = useState(false);
  const [newTestimonialName, setNewTestimonialName] = useState('');
  const [newTestimonialQuote, setNewTestimonialQuote] = useState('');

  const [editVehicle, setEditVehicle] = useState<any | null>(null);
  const [newVehicleOpen, setNewVehicleOpen] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState('');
  const [newVehicleDesc, setNewVehicleDesc] = useState('');
  const [newVehicleMultiplier, setNewVehicleMultiplier] = useState<string>('100');

  const [editFaq, setEditFaq] = useState<any | null>(null);
  const [newFaqOpen, setNewFaqOpen] = useState(false);
  const [newFaqQ, setNewFaqQ] = useState('');
  const [bookingTestMode, setBookingTestMode] = useState(false);
  const [newFaqA, setNewFaqA] = useState('');

  const [businessStatus, setBusinessStatus] = useState<{
    mode: string;
    bannerText: string;
    bannerDescription: string;
    showBooking: boolean;
    showContact: boolean;
    isTopBannerActive: boolean;
    isContactBannerActive: boolean;
    blockedStartDate?: string;
    blockedEndDate?: string;
    blockedReason?: string;
    topBannerText?: string;
    topBannerDescription?: string;
    shopOnly?: boolean;
  }>({
    mode: 'live',
    bannerText: 'We are currently LIVE and accepting bookings!',
    bannerDescription: 'Our mobile units are active and ready to deliver precision results to your driveway.',
    showBooking: true,
    showContact: true,
    isTopBannerActive: false,
    isContactBannerActive: true,
    blockedStartDate: '',
    blockedEndDate: '',
    blockedReason: ''
  });
  const [activeStatus, setActiveStatus] = useState<any>(null);
  const [blockHistory, setBlockHistory] = useState<{ start: string; end: string; reason: string; ids: string[] }[]>([]);
  const [blockHistoryLoading, setBlockHistoryLoading] = useState(false);
  const [blockStaffScheduler, setBlockStaffScheduler] = useState(false);

  const loadBlockHistory = async () => {
    setBlockHistoryLoading(true);
    try {
      const { getBlockedSlots } = await import('@/lib/availability');
      const slots = await getBlockedSlots();
      // Group contiguous dates by reason into ranges
      const sorted = [...slots].sort((a, b) => a.date.localeCompare(b.date));
      const ranges: { start: string; end: string; reason: string; ids: string[] }[] = [];
      for (const slot of sorted) {
        const last = ranges[ranges.length - 1];
        const prevDate = last ? new Date(last.end) : null;
        const currDate = new Date(slot.date);
        const isNextDay = prevDate && (currDate.getTime() - prevDate.getTime()) <= 86400001;
        const sameReason = last && last.reason === (slot.reason || '');
        if (last && isNextDay && sameReason) {
          last.end = slot.date;
          last.ids.push(slot.id);
        } else {
          ranges.push({ start: slot.date, end: slot.date, reason: slot.reason || 'Blocked', ids: [slot.id] });
        }
      }
      setBlockHistory(ranges);
    } finally {
      setBlockHistoryLoading(false);
    }
  };

  const handleUnblockRange = async (range: { start: string; end: string; reason: string; ids: string[] }) => {
    if (!ensureNotDemo("calendar unblocking")) return;
    if (!confirm(`Remove all blocks from ${range.start} to ${range.end}?`)) return;
    const { unblockDateRange } = await import('@/lib/availability');
    await unblockDateRange(range.start, range.end);
    toast({ title: 'Date Range Unblocked', description: `${range.start} → ${range.end} cleared from booking calendar.` });
    loadBlockHistory();
  };

  const STATUS_PRESETS: Record<string, any> = {
    live: {
      mode: 'live',
      bannerText: '✨ NOW LIVE: PREMIUM MOBILE DETAILING',
      bannerDescription: 'Fully operational! Book your elite detailing experience online today for premium service at your driveway.',
      topBannerText: '✨ NOW LIVE: PREMIUM MOBILE DETAILING',
      topBannerDescription: 'Fully operational! Book your elite detailing experience online today for premium service at your driveway.',
      showBooking: true,
      showContact: true,
      isTopBannerActive: false,
      isContactBannerActive: false,
      blockedStartDate: '',
      blockedEndDate: '',
      blockedReason: '',
      shopOnly: false
    },
    'pre-launch': {
      mode: 'pre-launch',
      bannerText: '🚀 PRE-LAUNCH: GROWING THE WAITLIST',
      bannerDescription: 'We are in the final setup phase. Active detailing is currently paused, but we are accepting inquiries and waitlist signups!',
      topBannerText: '🚀 PRE-LAUNCH: GROWING THE WAITLIST',
      topBannerDescription: 'We are in the final setup phase. Active detailing is currently paused, but we are accepting inquiries and waitlist signups!',
      showBooking: false,
      showContact: true,
      isTopBannerActive: true,
      isContactBannerActive: true,
      blockedStartDate: '',
      blockedEndDate: '',
      blockedReason: '',
      shopOnly: false
    },
    'winter-closed': {
      mode: 'winter-closed',
      bannerText: '❄️ SEASONAL PAUSE: WINTER OPERATIONS',
      bannerDescription: 'We are currently closed for the winter season to protect our equipment and your vehicle. We will resume operations in the Spring! Inquiries are still welcome for future bookings.',
      topBannerText: '❄️ SEASONAL PAUSE: WINTER OPERATIONS',
      topBannerDescription: 'We are currently closed for the winter season to protect our equipment and your vehicle. We will resume operations in the Spring! Inquiries are still welcome for future bookings.',
      showBooking: false,
      showContact: true,
      isTopBannerActive: true,
      isContactBannerActive: true,
      blockedStartDate: '',
      blockedEndDate: '',
      blockedReason: 'Seasonal Closure',
      shopOnly: false
    },
    'marketing': {
      mode: 'marketing',
      bannerText: '⚠️ Methuen Shop-Only Operation Updates',
      bannerDescription: 'We are serving customers exclusively at our state-of-the-art Methuen facility located at 54 Boston Street. Come visit us (By Appointment Only) for a premium experience!',
      topBannerText: '🔥 SPECIAL OFFER: 15% OFF ALL CERAMIC COATINGS 🔥',
      topBannerDescription: 'Book your professional detailing experience online today and save 15% on premium ceramic coatings! This limited-time offer includes professional paint correction and premium surface protection at our state-of-the-art Methuen facility.',
      showBooking: true,
      showContact: true,
      isTopBannerActive: true,
      isContactBannerActive: true,
      blockedStartDate: '',
      blockedEndDate: '',
      blockedReason: '',
      shopOnly: true
    },
    'custom': {
      mode: 'custom',
      bannerText: '',
      bannerDescription: '',
      topBannerText: '',
      topBannerDescription: '',
      showBooking: true,
      showContact: true,
      isTopBannerActive: true,
      isContactBannerActive: true,
      blockedStartDate: '',
      blockedEndDate: '',
      blockedReason: '',
      shopOnly: false
    }
  };

  const CUSTOM_PRESETS = [
    { 
      id: 'ceramic-sale', 
      name: '🔥 Ceramic Coating Sale (15% Off Special)', 
      reason: 'Ceramic Coating Sale',
      title: '🔥 SPECIAL OFFER: 15% OFF ALL CERAMIC COATINGS 🔥',
      desc: 'Book your professional detailing experience online today and save 15% on premium ceramic coatings! This limited-time offer includes professional paint correction and premium surface protection at our state-of-the-art Methuen facility located at 54 Boston Street, Methuen, MA.',
      shopOnly: true
    },
    { 
      id: 'shop-only', 
      name: '🏢 Shop-Only Detailing (Methuen Facility)', 
      reason: 'Shop Only Detailing',
      title: '🏢 PREMIUM SHOP-ONLY DETAILING ACTIVE',
      desc: 'We are fully operational! Book your professional detailing experience online today for premium service at our state-of-the-art facility located at 54 Boston Street, Methuen, MA.',
      shopOnly: true
    },
    { 
      id: 'vacation', 
      name: '🌴 Vacation / Holiday', 
      reason: 'Vacation',
      title: '🌴 OUT OF OFFICE: VACATION MODE',
      desc: 'Our team is taking a short break to recharge! We will be out of the office during this period. You can still send inquiries, and we will respond systematically in the order they were received upon our return. Thank you for your patience!',
      shopOnly: false
    },
    { 
      id: 'medical', 
      name: '🏥 Medical / Health', 
      reason: 'Medical Leave',
      title: '🏥 TEMPORARY LEAVE: MEDICAL NOTICE',
      desc: 'Prime Auto Detail is temporarily pausing operations for medical reasons. We apologize for any disruption to your scheduling! Our inquiry portal remains active, and we will contact you immediately when we resume full mobile detailing services.',
      shopOnly: false
    },
    { 
      id: 'family', 
      name: '👨‍👩‍👧‍👦 Family Leave', 
      reason: 'Family Commitments',
      title: '👨‍👩‍👧‍👦 FAMILY LEAVE: TEMPORARY PAUSE',
      desc: 'We are currently away for family-related reasons. Mobile detailing is paused, but we are accepting inquiries for future bookings. High-end care for your vehicle will resume shortly. Thank you for being a valued customer!',
      shopOnly: false
    },
    { 
      id: 'emergency', 
      name: '⚠️ Personal Emergency', 
      reason: 'Personal Emergency',
      title: '⚠️ TEMPORARY STATUS UPDATE',
      desc: 'Due to personal emergency circumstances, we have temporarily paused our active detailing schedule. We will reach out to all pending inquiries and resume operations as soon as possible.',
      shopOnly: false
    },
    { 
      id: 'travel', 
      name: '✈️ Business Travel', 
      reason: 'Business Travel',
      title: '✈️ AWAY ON BUSINESS',
      desc: 'Our mobile units are stationary for a few days while our team is away on business. Inquiry response times may be slightly longer than usual. We look forward to detailing your vehicle upon our return!',
      shopOnly: false
    }
  ];

  const [editAbout, setEditAbout] = useState<any | null>(null);

  const handleUpdateStatus = async (newStatus: any) => {
    if (!ensureNotDemo("status deployment")) return;
    setBusinessStatus(newStatus);
    setActiveStatus(newStatus);
    const isLive = newStatus.mode === 'live' || (newStatus.mode === 'custom' && newStatus.showBooking);
    setShowBookNow(isLive);
    
    // Handle automated calendar blocking if in custom mode with date range
    if (newStatus.mode === 'custom' && newStatus.blockedStartDate && newStatus.blockedEndDate) {
      try {
        const { blockDateRange } = await import("@/lib/availability");
        await blockDateRange(
          newStatus.blockedStartDate, 
          newStatus.blockedEndDate, 
          newStatus.blockedReason || 'Blocked by Business Launch Manager (Custom Mode)',
          'Business Launch Manager'
        );
        toast({
          title: "Calendar Sync",
          description: "Custom date range has been blocked on the booking calendar.",
        });

        // Optionally also block in Staff Scheduler
        if (blockStaffScheduler) {
          try {
            const { createStaffShift } = await import('@/lib/supa-data');
            const { eachDayOfInterval, parseISO, format: dateFnsFormat } = await import('date-fns');
            const days = eachDayOfInterval({
              start: parseISO(newStatus.blockedStartDate),
              end: parseISO(newStatus.blockedEndDate)
            });
            for (const day of days) {
              await createStaffShift({
                employee_id: 'system',
                employee_name: 'All Staff',
                date: dateFnsFormat(day, 'yyyy-MM-dd'),
                start_time: '08:00',
                end_time: '17:00',
                role: 'Business Closed',
                notes: newStatus.blockedReason || 'Business Closed – Launch Manager',
                color: 'red',
                status: 'scheduled'
              });
            }
            toast({ title: "Staff Scheduler Synced", description: `"Business Closed" added for ${days.length} day(s).` });
          } catch(staffErr) {
            console.error("Failed to sync to Staff Scheduler:", staffErr);
          }
        }
      } catch (e) {
        console.error("Failed to auto-block calendar:", e);
      }
    }


    await contentService.upsertServiceMeta({
      key: 'global_settings',
      meta: { 
        showBookNow: isLive,
        businessStatus: newStatus
      },
      description: 'Website Global Operational Status'
    });
    
    toast({
      title: "Deployment Successful",
      description: `Website status has been updated to ${newStatus.mode.toUpperCase()}.`,
    });

    notifyChange('settings');
  };
  const [newAboutOpen, setNewAboutOpen] = useState(false);
  const [newAboutSection, setNewAboutSection] = useState('');
  const [newAboutContent, setNewAboutContent] = useState('');
  const [accordionValue, setAccordionValue] = useState<string[]>([]);
  const ALL_SECTIONS = ["home", "about-page", "bookings", "faqs", "vehicle-types", "launch-status", "contact", "package-details", "footer", "header"];

  const loadWA = async () => {
    // 1. VEHICLE TYPES
    try {
      const supaTypes = await contentService.getVehicleTypes();
      if (supaTypes.length > 0) {
        setVehicleTypes(supaTypes.map(st => ({
          id: st.id,
          name: st.name,
          description: st.description,
          multiplier: st.multiplier || 100, // Important: use DB multiplier
          protected: ['compact', 'midsize', 'truck', 'luxury'].includes(st.id) // keep protected logic
        })));
      } else {
        // Migration: If cloud empty, fetch local and push
        const localTypes = await api('/api/vehicle-types', { method: 'GET' });
        if (Array.isArray(localTypes) && localTypes.length > 0) {
          setVehicleTypes(localTypes); // show immediately
          // Background Sync
          for (const vt of localTypes) {
            await contentService.upsertVehicleType({
              id: vt.id,
              name: vt.name,
              description: vt.description,
              multiplier: 100, // local api doesn't store this cleanly usually, default 100
              has_pricing: true,
              is_active: true
            });
          }
          toast({ title: 'Migrating Vehicle Types to Cloud...' });
        }
      }
    } catch { setVehicleTypes([]); }

    // 2. FAQS
    try {
      const supaFaqs = await contentService.getFaqs();
      if (supaFaqs.length > 0) {
        setFaqs(supaFaqs);
      } else {
        const local = await api('/api/faqs', { method: 'GET' });
        const list = Array.isArray(local) ? local : (Array.isArray((local as any)?.items) ? (local as any).items : []);
        setFaqs(list);
        if (list.length > 0) {
          for (const f of list) {
            await contentService.upsertFaq({ question: f.question, answer: f.answer, sort_order: 0 });
          }
          toast({ title: 'Migrating FAQs to Cloud...' });
        }
      }
    } catch { setFaqs([]); }

    // 3. CONTACT
    try {
      const supaContact = await contentService.getContact();
      if (supaContact) {
        setContactInfo({
          hours: supaContact.hours || '',
          phone: supaContact.phone || '',
          address: supaContact.address || '',
          email: supaContact.email || ''
        });
      } else {
        // Migration
        const c = await api('/api/contact', { method: 'GET' });
        if (c && typeof c === 'object') {
          const safeC = {
            hours: (c as any).hours || '',
            phone: (c as any).phone || '',
            address: (c as any).address || '',
            email: (c as any).email || '',
          };
          setContactInfo(safeC);
          await contentService.upsertContact(safeC);
          toast({ title: 'Migrating Contact Info to Cloud...' });
        }
      }
    } catch { }

    // 4. ABOUT SECTIONS
    try {
      const supaAbout = await contentService.getAboutSections();
      if (supaAbout.length > 0) {
        setAboutSections(supaAbout.map(s => ({ ...s, section: s.section_title }))); // map title->section for UI compatibility
      } else {
        const a = await api('/api/about', { method: 'GET' });
        const list = Array.isArray(a) ? a : [];
        setAboutSections(list);
        if (list.length > 0) {
          for (const item of list) {
            await contentService.upsertAboutSection({ section_title: item.section, content: item.content });
          }
          toast({ title: 'Migrating About Sections to Cloud...' });
        }
      }
    } catch { setAboutSections([]); }

    // 5. TESTIMONIALS
    try {
      const supaTest = await contentService.getTestimonials();
      if (supaTest.length > 0) {
        setTestimonials(supaTest);
      } else {
        const t = await api('/api/testimonials', { method: 'GET' });
        const list = Array.isArray(t) ? t : [];
        setTestimonials(list);
        if (list.length > 0) {
          for (const item of list) {
            await contentService.upsertTestimonial({ name: item.name, quote: item.quote, role: 'Customer' });
          }
          toast({ title: 'Migrating Testimonials to Cloud...' });
        }
      }
    } catch { setTestimonials([]); }

    // 6. SERVICE META (Disclaimer + Learn More)
    try {
      const allMeta = await contentService.getAllServiceMeta();
      const d = allMeta.find(m => m.key === 'disclaimer');
      if (d) setServicesDisclaimer(d.description || '');

      const cd = allMeta.find(m => m.key === 'contractual_disclosure');
      if (cd) setContractualDisclosure(cd.description || '');

      const vd = allMeta.find(m => m.key === 'valuation_disclaimer');
      if (vd) setValuationDisclaimer(vd.description || '');
      
      // Global Settings
      const gs = allMeta.find(m => m.key === 'global_settings');
      if (gs && gs.meta) {
        setShowBookNow(gs.meta.showBookNow !== false);
        if (gs.meta.businessStatus) {
          setBusinessStatus(gs.meta.businessStatus);
          setActiveStatus(gs.meta.businessStatus);
        } else {
          // Migration from old showBookNow flag
          setBusinessStatus({
            mode: gs.meta.showBookNow !== false ? 'live' : 'pre-launch',
            bannerText: gs.meta.showBookNow !== false ? 'We are currently LIVE and accepting bookings!' : 'Grand Opening Soon - Pre-Launch Mode Active',
            bannerDescription: gs.meta.showBookNow !== false ? 'Our mobile units are active.' : 'We are preparing for our official launch.',
            showBooking: gs.meta.showBookNow !== false,
            showContact: true,
            isTopBannerActive: gs.meta.showBookNow === false,
            isContactBannerActive: gs.meta.showBookNow === false
          });
        }
      }

      // Booking Test Mode
      const btm = allMeta.find(m => m.key === 'booking_test_mode');
      if (btm) setBookingTestMode(btm.meta?.active === true);

      // Home Data
      const h = allMeta.find(m => m.key === 'home_content');
      if (h && h.meta) {
        setHomeData((prev: any) => ({ ...prev, ...h.meta }));
      }

      // About Data
      const a = allMeta.find(m => m.key === 'about_content');
      if (a && a.meta) {
        setAboutData((prev: any) => ({ ...prev, ...a.meta }));
      }

      // Footer Data
      const f = allMeta.find(m => m.key === 'footer_content');
      if (f && f.meta) {
        setFooterData((prev: any) => ({ ...prev, ...f.meta }));
      }

      // Header Data
      const hl = allMeta.find(m => m.key === 'header_links');
      if (hl && hl.meta && Array.isArray(hl.meta.links)) {
        setHeaderLinks(hl.meta.links);
      } else {
        setHeaderLinks([
          { to: "/", label: "Home" },
          { to: "/services", label: "Services" },
          { to: "/about", label: "About" },
          { to: "/availability", label: "Availability" },
          { to: "/faq", label: "FAQ" },
          { to: "/contact", label: "Contact" },
        ]);
      }

      // 7. BUILD LEARN MORE (Merge Global Meta + Local/Cloud)
      const customPkgs = getCustomPackages();
      const allPkgs: any[] = [...builtInPackages, ...customPkgs];
      const initial: Record<string, { description: string; stepIds: string[] }> = {};

      const metaMap: Record<string, any> = {};
      allMeta.forEach(m => metaMap[m.key] = m.meta || {});

      allPkgs.forEach((p: any) => {
        const cloudMeta = allMeta.find(m => m.key === p.id);
        const defaultStepIds = (p.steps || []).map((s: any) => (typeof s === 'string' ? s : s.id));

        if (cloudMeta) {
          initial[p.id] = {
            description: cloudMeta.description || p.description || '',
            stepIds: cloudMeta.meta?.stepIds || defaultStepIds
          };
        } else {
          initial[p.id] = {
            description: p.description || '',
            stepIds: defaultStepIds
          };
        }
      });
      setLearnMoreEdit(initial);

      // Build global step options
      const builtSteps = builtInPackages.flatMap(p => p.steps).map((s: any) => ({ id: s.id, name: s.name }));
      const customServices = getCustomServices().map(s => ({ id: s.id, name: s.name }));
      const unionMap: Record<string, string> = {};
      [...builtSteps, ...customServices].forEach(s => { if (!unionMap[s.id]) unionMap[s.id] = s.name; });
      setAllStepOptions(Object.entries(unionMap).map(([id, name]) => ({ id, name })));

    } catch (e) {
      console.error('Load WA Error:', e);
    }
  };

  useEffect(() => {
    loadWA();
    // Reduce noise: we don't need intense polling if we trust cloud save
    // but we can listen for local events just in case
    const onChanged = (e: any) => {
      // triggers refresh
    };
    window.addEventListener('content-changed', onChanged as any);
    return () => window.removeEventListener('content-changed', onChanged as any);
  }, []);

  return (
    <div>
      <PageHeader title="Website Administration" />
      <div className="p-4 space-y-8 max-w-screen-xl mx-auto animate-fade-in">

        {/* Premium Header Block */}
        <div className="bg-gradient-to-r from-red-950/40 via-black to-zinc-950 p-8 rounded-2xl border border-red-900/20 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Content Control</h1>
              <p className="text-zinc-400 max-w-xl">Manage your website's content, vehicle pricing, FAQs, and more from a centralized dashboard. Changes reflect immediately.</p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-white"
                onClick={() => setAccordionValue(accordionValue.length === ALL_SECTIONS.length ? [] : ALL_SECTIONS)}
              >
                {accordionValue.length === ALL_SECTIONS.length ? (
                  <>
                    <ChevronsUp className="h-4 w-4 mr-2" />
                    Collapse All
                  </>
                ) : (
                  <>
                    <ChevronsDown className="h-4 w-4 mr-2" />
                    Expand All
                  </>
                )}
              </Button>
            </div>
          </div>
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        </div>

        {/* Status Dashboard / Stats Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status Mode Card - Cycle/Select Presets via Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Card 
                className={`p-4 bg-zinc-900/40 border-zinc-800/50 flex items-center gap-4 hover:border-zinc-700 transition-all cursor-pointer hover:scale-[1.02] active:scale-95 group shadow-lg shadow-black/20`}
              >
                <div className={`p-3 rounded-xl transition-all duration-500 ${
                  businessStatus.mode === 'live' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 
                  businessStatus.mode === 'winter-closed' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' :
                  businessStatus.mode === 'marketing' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]' :
                  businessStatus.mode === 'custom' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' :
                  'bg-red-500/10 text-red-500 border border-red-500/10'
                }`}>
                  {businessStatus.mode === 'live' ? <Rocket className="h-6 w-6 animate-pulse" /> : 
                   businessStatus.mode === 'winter-closed' ? <Snowflake className="h-6 w-6 animate-spin-slow" /> :
                   businessStatus.mode === 'marketing' ? <Tag className="h-6 w-6 animate-bounce-subtle" /> :
                   businessStatus.mode === 'custom' ? <Settings className="h-6 w-6" /> :
                   <Construction className="h-6 w-6" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest group-hover:text-zinc-300 transition-colors cursor-help">Global Status</p>
                    <HelpCircle className="h-3 w-3 text-zinc-600 hover:text-emerald-400 transition-colors" />
                  </div>
                  <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">
                    {businessStatus.mode === 'live' ? 'Website Live' : 
                     businessStatus.mode === 'winter-closed' ? 'Winter Mode' : 
                     businessStatus.mode === 'marketing' ? 'Marketing Mode' : 
                     businessStatus.mode === 'custom' ? 'Custom Mode' : 'Pre-Launch'}
                  </h3>
                </div>
              </Card>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-white w-64 shadow-2xl p-1.5 focus:outline-none">
              <DropdownMenuItem 
                className="flex items-center gap-3 p-3 focus:bg-emerald-500/10 focus:text-emerald-400 cursor-pointer rounded-lg mb-1" 
                onClick={() => {
                  handleUpdateStatus(STATUS_PRESETS.live);
                  toast({ title: "Live Mode Active", description: "All booking features enabled." });
                }}
              >
                <div className="p-2 bg-emerald-500/20 rounded-md">
                  <Rocket className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase italic tracking-tighter">Live Mode</p>
                  <p className="text-[10px] text-zinc-500">Enable all consumer functions</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="flex items-center gap-3 p-3 focus:bg-red-500/10 focus:text-red-400 cursor-pointer rounded-lg mb-1" 
                onClick={() => {
                  handleUpdateStatus(STATUS_PRESETS['pre-launch']);
                  toast({ title: "Pre-Launch Enabled", description: "Bookings disabled, inquiry portal active." });
                }}
              >
                <div className="p-2 bg-red-500/20 rounded-md">
                  <Construction className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase italic tracking-tighter">Pre-Launch</p>
                  <p className="text-[10px] text-zinc-500">Hide bookings / Show 'Coming Soon'</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="flex items-center gap-3 p-3 focus:bg-blue-500/10 focus:text-blue-400 cursor-pointer rounded-lg mb-1" 
                onClick={() => {
                  handleUpdateStatus(STATUS_PRESETS['winter-closed']);
                  toast({ title: "Winter Mode Active", description: "Seasonal closure notice active." });
                }}
              >
                <div className="p-2 bg-blue-500/20 rounded-md">
                  <Snowflake className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase italic tracking-tighter">Winter Mode</p>
                  <p className="text-[10px] text-zinc-500">Seasonal closure / Lead preservation</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="flex items-center gap-3 p-3 focus:bg-amber-500/10 focus:text-amber-400 cursor-pointer rounded-lg mb-1" 
                onClick={() => {
                  handleUpdateStatus(STATUS_PRESETS['marketing']);
                  toast({ title: "Marketing Mode Active", description: "Promo notices and custom sales active." });
                }}
              >
                <div className="p-2 bg-amber-500/20 rounded-md">
                  <Tag className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase italic tracking-tighter">Marketing Mode</p>
                  <p className="text-[10px] text-zinc-500">Special offers / Ceramic Coating sales</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="flex items-center gap-3 p-3 focus:bg-purple-500/10 focus:text-purple-400 cursor-pointer rounded-lg" 
                onClick={() => {
                  handleUpdateStatus({ ...businessStatus, mode: 'custom' });
                  if (!accordionValue.includes('launch-status')) {
                    setAccordionValue([...accordionValue, 'launch-status']);
                  }
                  toast({ title: "Custom Mode", description: "Manual overrides enabled below." });
                }}
              >
                <div className="p-2 bg-purple-500/20 rounded-md">
                  <Settings className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase italic tracking-tighter">Custom Mode</p>
                  <p className="text-[10px] text-zinc-500">Configurable manual overrides</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Card 
            className={`p-4 bg-zinc-900/40 border-zinc-800/50 flex items-center gap-4 hover:border-amber-900/40 transition-all cursor-pointer hover:scale-[1.02] active:scale-95 group shadow-lg shadow-black/20 ${isDemoMode ? 'opacity-50 grayscale' : ''}`}
            onClick={async () => {
              if (isDemoMode) {
                toast({
                  title: "Demo Mode active",
                  description: "You cannot toggle test modes while in interactive demo.",
                  variant: "destructive"
                });
                return;
              }
              const next = !bookingTestMode;
              setBookingTestMode(next);
              await contentService.upsertServiceMeta({
                key: 'booking_test_mode',
                meta: { active: next },
                description: 'Administrative Booking Test Mode'
              });
              
              if (!next) {
                try {
                  await bookingsSvc.purgeMockData();
                  toast({ title: 'Production Mode Restored', description: 'Mock data purged.' });
                } catch (e) { console.error(e); }
              } else {
                toast({ title: 'Test Mode Active', description: 'Diagnostic links revealed.' });
              }
              notifyChange('settings');
            }}
          >
            <div className={`p-3 rounded-xl transition-colors ${bookingTestMode ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-zinc-500/10 text-zinc-500 border border-zinc-800'}`}>
              <TestTube2 className={`h-6 w-6 ${bookingTestMode ? 'animate-bounce-subtle' : ''}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest group-hover:text-zinc-300 transition-colors cursor-help" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'booking-test-mode', role: 'admin' }})); }}>Booking Mode</p>
                <HelpCircle className="h-3 w-3 text-zinc-600 hover:text-amber-400 transition-colors" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'booking-test-mode', role: 'admin' }})); }} />
              </div>
              <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">
                {bookingTestMode ? 'Admin Test' : 'Standard'}
              </h3>
            </div>
          </Card>

          <Card 
            className={`p-4 bg-zinc-900/40 border-zinc-800/50 flex items-center gap-4 hover:border-blue-900/40 transition-all cursor-pointer hover:scale-[1.02] active:scale-95 group shadow-lg shadow-black/20`}
            onClick={() => {
              const next = !homeData.showTestimonials;
              setHomeData({ ...homeData, showTestimonials: next });
              toast({ title: next ? 'Reviews Enabled' : 'Reviews Hidden', description: `Home page visibility ${next ? 'on' : 'off'}.` });
            }}
          >
            <div className={`p-3 rounded-xl transition-colors ${homeData.showTestimonials ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' : 'bg-zinc-800 text-zinc-600'}`}>
              <Users className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest group-hover:text-zinc-300 transition-colors cursor-help" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'testimonials-management', role: 'admin' }})); }}>Testimonials</p>
                <HelpCircle className="h-3 w-3 text-zinc-600 hover:text-blue-400 transition-colors" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'testimonials-management', role: 'admin' }})); }} />
              </div>
              <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">
                {homeData.showTestimonials ? `${testimonials.length} ACTIVE` : 'INACTIVE'}
              </h3>
            </div>
          </Card>

          <Card className="p-4 bg-zinc-900/40 border-zinc-800/50 flex items-center gap-4 hover:border-red-900/40 transition-colors">
            <div className="p-3 rounded-xl bg-zinc-500/10 text-zinc-400">
              <LayoutDashboard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Sections</p>
              <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">
                10 CONTROL AREAS
              </h3>
            </div>
          </Card>
        </div>

        <Card className="p-1 bg-zinc-950/50 border-zinc-800 shadow-xl rounded-xl overflow-hidden">
          <Accordion 
            type="multiple" 
            value={accordionValue}
            onValueChange={setAccordionValue}
            className="w-full space-y-1"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-red-950/20 via-zinc-900/30 to-transparent border-y border-zinc-800/50 flex items-center justify-between mb-4 mt-2">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white">Management Functions</h4>
              </div>
              <div className="h-px flex-1 mx-6 bg-gradient-to-r from-zinc-800/80 to-transparent" />
              <Badge variant="outline" className="text-[8px] font-black border-red-500/30 text-red-500 uppercase px-2 shadow-[0_0_10px_rgba(239,68,68,0.1)]">Active Control</Badge>
            </div>



            {/* Business Launch Manager - Global Toggle */}
            <AccordionItem 
              value="launch-status" 
              className="border-2 mb-4 rounded-xl bg-gradient-to-br from-zinc-900/90 via-zinc-900 to-red-900/10 hover:from-zinc-800 transition-all border-red-500/20 overflow-hidden px-2 shadow-[0_0_30px_rgba(239,68,68,0.05)] scale-[1.01]"
            >
              <AccordionTrigger className="hover:no-underline px-6 py-5 hover:text-red-400 [&[data-state=open]]:text-red-500 font-bold uppercase tracking-tight text-lg group">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-500/10 rounded-xl group-data-[state=open]:bg-red-500/20 transition-colors">
                    <Rocket className="h-6 w-6 text-red-500 group-data-[state=open]:animate-bounce" />
                  </div>
                  <span className="font-black text-white tracking-tighter text-xl">Business Launch Manager</span>
                  <div className="ml-2 px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-[8px] font-black text-red-500 uppercase tracking-widest">Master Control</div>
                  <HelpCircle className="h-4 w-4 text-zinc-700 hover:text-red-500 transition-colors" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'business-launch-manager', role: 'admin' }})); }} />
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-6 space-y-8 bg-black/20">
                {/* Advanced Mode Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    { id: 'live', name: 'Live Mode', icon: Rocket, color: 'emerald' },
                    { id: 'pre-launch', name: 'Pre-Launch', icon: Construction, color: 'red' },
                    { id: 'winter-closed', name: 'Winter Mode', icon: Snowflake, color: 'blue' },
                    { id: 'marketing', name: 'Marketing Mode', icon: Tag, color: 'amber' },
                    { id: 'custom', name: 'Custom Mode', icon: Settings, color: 'purple' }
                  ].map((preset) => {
                    const isPreview = businessStatus.mode === preset.id;
                    const isActive = activeStatus?.mode === preset.id;

                    const colorStyles: Record<string, string> = {
                      emerald: isPreview ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700',
                      red: isPreview ? 'bg-red-500/10 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700',
                      blue: isPreview ? 'bg-blue-500/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700',
                      purple: isPreview ? 'bg-purple-500/10 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700',
                      amber: isPreview ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700',
                    };
                    const iconColors: Record<string, string> = {
                      emerald: isPreview ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-500',
                      red: isPreview ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-500',
                      blue: isPreview ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-500',
                      purple: isPreview ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-zinc-500',
                      amber: isPreview ? 'bg-amber-500 text-white' : 'bg-zinc-800 text-zinc-500',
                    };
                    const textColors: Record<string, string> = {
                      emerald: isPreview ? 'text-emerald-500' : 'text-zinc-500',
                      red: isPreview ? 'text-red-500' : 'text-zinc-500',
                      blue: isPreview ? 'text-blue-500' : 'text-zinc-500',
                      purple: isPreview ? 'text-purple-500' : 'text-zinc-500',
                      amber: isPreview ? 'text-amber-500' : 'text-zinc-500',
                    };

                    return (
                    <Card 
                      key={preset.id}
                      className={`p-4 cursor-pointer transition-all border-2 relative overflow-hidden ${colorStyles[preset.color]}`}
                      onClick={() => {
                        if (preset.id === 'custom') {
                          setBusinessStatus({
                            ...businessStatus,
                            mode: 'custom',
                            bannerText: '',
                            bannerDescription: '',
                            topBannerText: '',
                            topBannerDescription: '',
                            isTopBannerActive: true,
                            isContactBannerActive: true,
                            showBooking: true,
                            showContact: true,
                            shopOnly: false
                          });
                        } else if (preset.id === 'marketing') {
                          setBusinessStatus({ ...businessStatus, ...STATUS_PRESETS['marketing'] });
                        } else {
                          setBusinessStatus(STATUS_PRESETS[preset.id]);
                        }
                      }}
                    >
                      {isActive && (
                        <div className={`absolute top-2 right-2 flex items-center gap-1`}>
                           <div className={`h-2 w-2 rounded-full animate-pulse ${
                             preset.color === 'emerald' ? 'bg-emerald-500' : 
                             preset.color === 'red' ? 'bg-red-500' : 
                             preset.color === 'blue' ? 'bg-blue-500' : 
                             preset.color === 'amber' ? 'bg-amber-500' : 'bg-purple-500'
                           }`} />
                           <span className="text-[8px] font-black uppercase text-zinc-500 tracking-tighter">Live Now</span>
                        </div>
                      )}

                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className={`p-3 rounded-full ${iconColors[preset.color]}`}>
                          <preset.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 pb-2">
                          <p className={`text-xs font-black uppercase tracking-widest ${textColors[preset.color]}`}>{preset.name}</p>
                          <p className="text-[10px] text-zinc-600 mt-1">
                            {preset.id === 'live' ? 'Full Operations' : 
                             preset.id === 'pre-launch' ? 'Growing Leads' : 
                             preset.id === 'winter-closed' ? 'Seasonal Pause' : 
                             preset.id === 'marketing' ? 'Promotions & Sales' : 'Your Config'}
                          </p>
                        </div>

                        <div className="pt-2 mt-auto border-t border-zinc-800 w-full flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                           <Label className={`text-[10px] uppercase font-black tracking-tighter ${isActive ? 'text-zinc-300' : 'text-zinc-500'}`}>
                             {isActive ? 'Active' : 'Deploy'}
                           </Label>
                           <Switch 
                             checked={isActive} 
                             onCheckedChange={(checked) => {
                               if (checked) {
                                  // If we are activating the mode currently being edited, use the edited state (businessStatus)
                                  // Otherwise, use the preset default
                                  const presetData = (businessStatus.mode === preset.id) ? businessStatus : (preset.id === 'custom' ? businessStatus : STATUS_PRESETS[preset.id]);
                                  handleUpdateStatus(presetData);
                               }
                             }}
                             className={`scale-75 ${
                               preset.color === 'emerald' ? 'data-[state=checked]:bg-emerald-600' : 
                               preset.color === 'red' ? 'data-[state=checked]:bg-red-600' : 
                               preset.color === 'blue' ? 'data-[state=checked]:bg-blue-600' : 
                               preset.color === 'amber' ? 'data-[state=checked]:bg-amber-600' : 'data-[state=checked]:bg-purple-600'
                             }`}
                           />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

                {/* Status Configuration Form */}
                <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-zinc-900 rounded-lg">
                        <Settings className="h-4 w-4 text-zinc-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-bold uppercase tracking-tight">Status Configuration</h4>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold">Currently in {businessStatus.mode} mode</p>
                      </div>
                    </div>
                    {businessStatus.mode !== 'live' && (
                       <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 px-3 flex items-center gap-1">
                         <Info className="h-3 w-3" /> Professional Banner Active
                       </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      {/* Section 1: Top Announcement Bar (Site-wide) */}
                      <div className="space-y-4 p-5 bg-zinc-900/10 border border-zinc-900 rounded-2xl">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-black uppercase tracking-wider text-red-500 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                            Top Announcement Bar (Header Banner)
                          </h5>
                          {!businessStatus.isTopBannerActive && (
                            <Badge variant="outline" className="text-[8px] border-zinc-800 text-zinc-500 uppercase px-2">Inactive</Badge>
                          )}
                        </div>
                        
                        {businessStatus.mode === 'marketing' && (
                          <div className="space-y-2 p-3 bg-purple-950/20 border border-purple-900/30 rounded-xl mb-2">
                            <Label className="text-[10px] uppercase font-black tracking-widest text-purple-400">🏷️ Quick Sale Presets & Ideas</Label>
                            <div className="flex gap-2">
                              <Select onValueChange={(val) => handleSelectPromo(val)}>
                                <SelectTrigger className="w-full bg-zinc-950 border-zinc-800 text-xs text-white">
                                  <SelectValue placeholder="Select a sale or promotion idea..." />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm">
                                  {promoOptions.map((opt) => (
                                    <SelectItem key={opt.id} value={opt.id} className="text-xs focus:bg-zinc-800">
                                      {opt.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={handleSaveCustomPromo}
                                className="text-[10px] uppercase font-black tracking-wider border-purple-800 hover:bg-purple-900/20 text-purple-300 h-9 px-3 shrink-0"
                                title="Save current announcement text as a new reusable preset"
                              >
                                Save Custom
                              </Button>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest flex items-center gap-2">
                            Announcement Title Text
                            <HelpCircle className="h-3 w-3 text-zinc-800 hover:text-white cursor-help" onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'business-launch-manager', role: 'admin' }}))} />
                          </Label>
                          <Input 
                            className="bg-zinc-900 border-zinc-800 text-white font-bold h-10 text-sm" 
                            placeholder="e.g. ✨ NOW LIVE: PREMIUM MOBILE DETAILING"
                            value={businessStatus.topBannerText || ''} 
                            onChange={(e) => setBusinessStatus({ ...businessStatus, topBannerText: e.target.value })} 
                            disabled={!businessStatus.isTopBannerActive}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Announcement Sub-Description</Label>
                          <textarea 
                            className="w-full bg-zinc-900 border-zinc-800 text-zinc-400 rounded-lg p-3 text-xs min-h-[80px]" 
                            placeholder="e.g. Fully operational! Book your elite detailing experience online today..."
                            value={businessStatus.topBannerDescription || ''} 
                            onChange={(e) => setBusinessStatus({ ...businessStatus, topBannerDescription: e.target.value })} 
                            disabled={!businessStatus.isTopBannerActive}
                          />
                        </div>
                      </div>

                      {/* Section 2: Contact Page Notice Banner */}
                      <div className="space-y-4 p-5 bg-zinc-900/10 border border-zinc-900 rounded-2xl">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                            Contact Page Notice Banner
                          </h5>
                          {!businessStatus.isContactBannerActive && (
                            <Badge variant="outline" className="text-[8px] border-zinc-800 text-zinc-500 uppercase px-2">Inactive</Badge>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Contact Notice Heading</Label>
                          <Input 
                            className="bg-zinc-900 border-zinc-800 text-white font-bold h-10 text-sm" 
                            placeholder="e.g. Important Status Update"
                            value={businessStatus.bannerText || ''} 
                            onChange={(e) => setBusinessStatus({ ...businessStatus, bannerText: e.target.value })} 
                            disabled={!businessStatus.isContactBannerActive}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Contact Notice Sub-Description</Label>
                          <textarea 
                            className="w-full bg-zinc-900 border-zinc-800 text-zinc-400 rounded-lg p-3 text-xs min-h-[80px]" 
                            placeholder="e.g. Enter the detailed status update for your Contact page here..."
                            value={businessStatus.bannerDescription || ''} 
                            onChange={(e) => setBusinessStatus({ ...businessStatus, bannerDescription: e.target.value })} 
                            disabled={!businessStatus.isContactBannerActive}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 bg-black/40 p-6 rounded-xl border border-zinc-900">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-4">Feature Visibility Toggles</h4>
                      
                      <div className="flex items-center justify-between group">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Accept Real Bookings</Label>
                          <p className="text-[10px] text-zinc-500">Enable/Disable the 'Book Now' functionality site-wide.</p>
                        </div>
                        <Switch 
                          checked={businessStatus.showBooking} 
                          onCheckedChange={(c) => setBusinessStatus({ ...businessStatus, showBooking: c })}
                          className="data-[state=checked]:bg-emerald-600"
                        />
                      </div>

                      <div className="flex items-center justify-between group">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">Accept Inquiries</Label>
                          <p className="text-[10px] text-zinc-500">Enable/Disable the contact and inquiry forms.</p>
                        </div>
                        <Switch 
                          checked={businessStatus.showContact} 
                          onCheckedChange={(c) => setBusinessStatus({ ...businessStatus, showContact: c })}
                          className="data-[state=checked]:bg-blue-600"
                        />
                      </div>

                      <div className="flex items-center justify-between group">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">Display Top Banner</Label>
                          <p className="text-[10px] text-zinc-500">Enable/Disable the site-wide announcement bar.</p>
                        </div>
                        <Switch 
                          checked={!!businessStatus.isTopBannerActive} 
                          onCheckedChange={(c) => setBusinessStatus({ ...businessStatus, isTopBannerActive: !!c })}
                          className="data-[state=checked]:bg-red-600"
                        />
                      </div>

                      <div className="flex items-center justify-between group">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">Display Contact Notice</Label>
                          <p className="text-[10px] text-zinc-500">Enable/Disable the informational banner on the contact page.</p>
                        </div>
                        <Switch 
                          checked={!!businessStatus.isContactBannerActive} 
                          onCheckedChange={(c) => setBusinessStatus({ ...businessStatus, isContactBannerActive: !!c })} 
                          className="data-[state=checked]:bg-blue-600"
                        />
                      </div>

                      <div className="flex items-center justify-between group">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">Only Accept Shop Detailing</Label>
                          <p className="text-[10px] text-zinc-500">Restrict bookings and inquiries to our professional shop facility in Methuen only.</p>
                        </div>
                        <Switch 
                          checked={!!businessStatus.shopOnly} 
                          onCheckedChange={(c) => setBusinessStatus({ ...businessStatus, shopOnly: !!c })} 
                          className="data-[state=checked]:bg-purple-600"
                        />
                      </div>
                    </div>
                  </div>

                  {businessStatus.mode === 'custom' && (
                    <div className="pt-4 mt-6 border-t border-zinc-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-2">
                          <Calendar className="h-3 w-3" /> Custom Block Duration
                        </h5>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white bg-zinc-900 border border-zinc-800">
                              Standard Notice Library <LayoutDashboard className="h-3 w-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 bg-zinc-950 border-zinc-800 text-white z-[100]">
                            <div className="px-2 py-1 text-[10px] font-black uppercase text-zinc-600">Select Preset Logic</div>
                            {CUSTOM_PRESETS.map((p) => (
                              <DropdownMenuItem 
                                key={p.id} 
                                onClick={() => {
                                  window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'prime-dilution-masterclass', role: 'admin' }}));
                                  setBusinessStatus({ 
                                    ...businessStatus, 
                                    bannerText: p.title, 
                                    bannerDescription: p.desc, 
                                    topBannerText: p.title,
                                    topBannerDescription: p.desc,
                                    blockedReason: p.reason,
                                    isTopBannerActive: true,
                                    isContactBannerActive: true,
                                    showBooking: p.id === 'shop-only' ? true : false,
                                    shopOnly: p.shopOnly || false
                                  });
                                  toast({ title: `${p.name} Applied`, description: "Banner fields pre-filled with professional messaging." });
                                }}
                                className="text-xs focus:bg-purple-900/20 focus:text-purple-400 cursor-pointer"
                              >
                                {p.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[9px] uppercase text-zinc-500 font-bold">Start Date</Label>
                          <Input 
                            type="date" 
                            className="bg-zinc-900 border-zinc-800 text-xs h-8 text-white h-9" 
                            value={businessStatus.blockedStartDate || ''}
                            onChange={(e) => setBusinessStatus({ ...businessStatus, blockedStartDate: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] uppercase text-zinc-500 font-bold">End Date</Label>
                          <Input 
                            type="date" 
                            className="bg-zinc-900 border-zinc-800 text-xs h-8 text-white h-9" 
                            value={businessStatus.blockedEndDate || ''}
                            onChange={(e) => setBusinessStatus({ ...businessStatus, blockedEndDate: e.target.value })}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-[9px] uppercase text-zinc-500 font-bold">Blocking Reason (Choose Category)</Label>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-5 text-[8px] font-black text-purple-500 hover:text-white uppercase"
                            onClick={() => {
                              const reasons = ["Vacation", "Medical Leave", "Personal Emergency", "Business Travel", "Equipment Maintenance"];
                              const val = businessStatus.blockedReason || reasons[0];
                              const next = reasons[(reasons.indexOf(val) + 1) % reasons.length];
                              
                              // Auto-generate banner content "AI-style"
                              const generatedTitleCount = ["OFFICE NOTICE", "TEMPORARY STATUS update", "SERVICE ALERT", "BOOKING UPDATE"];
                              const randomTitle = generatedTitleCount[Math.floor(Math.random() * generatedTitleCount.length)];
                              
                              setBusinessStatus({ 
                                ...businessStatus, 
                                blockedReason: next,
                                bannerText: `⚠️ ${randomTitle}: ${next.toUpperCase()}`,
                                bannerDescription: `Prime Auto Detail is currently adjusting operations for ${next}. We appreciate your patience and will respond to all inquiries in the order received as soon as possible.`
                              });
                              toast({ title: "AI Generation Complete", description: `Synthesized professionally formatted banner for: ${next}` });
                            }}
                          >
                            <Rocket className="h-2 w-2 mr-1" /> Use AI Generation
                          </Button>
                        </div>
                        <Select 
                          value={businessStatus.blockedReason || ""} 
                          onValueChange={(val) => {
                            setBusinessStatus({ 
                                ...businessStatus, 
                                blockedReason: val,
                                bannerText: `⚠️ NOTICE: ${val.toUpperCase()}`,
                                bannerDescription: `Prime Auto Detail operations are temporarily adjusted due to ${val}. We remain active for inquiries and future bookings!`
                            });
                            toast({ title: "Reason Applied", description: "Banner heading and description pre-filled automatically." });
                          }}
                        >
                          <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs h-9 text-white w-full">
                            <SelectValue placeholder="Select a reason for being away..." />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-950 border-zinc-800 text-white z-[120]">
                            <SelectItem value="Vacation">🌴 Vacation / Holiday</SelectItem>
                            <SelectItem value="Medical Leave">🏥 Medical Leave</SelectItem>
                            <SelectItem value="Personal Emergency">⚠️ Personal Emergency</SelectItem>
                            <SelectItem value="Family Commitments">👨‍👩‍👧‍👦 Family Commitments</SelectItem>
                            <SelectItem value="Business Travel">✈️ Business Travel</SelectItem>
                            <SelectItem value="Equipment Maintenance">🔧 Equipment Maintenance</SelectItem>
                            <SelectItem value="Training / Certification">📚 Training / Certification</SelectItem>
                            <SelectItem value="Seasonal Closure">❄️ Seasonal Closure</SelectItem>
                            <SelectItem value="Personal Time">🏠 Personal Time</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 mt-8">
                    <Button 
                      className="flex-1 bg-zinc-100 hover:bg-white text-black font-black uppercase italic tracking-tighter"
                      onClick={() => handleUpdateStatus(businessStatus)}
                    >
                      Apply Status Changes
                    </Button>
                    <Button
                      variant="outline"
                      className="px-8 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white font-black uppercase italic tracking-tighter"
                      onClick={() => {
                        const mode = businessStatus.mode || 'live';
                        const defaults = STATUS_PRESETS[mode] || STATUS_PRESETS['live'];
                        setBusinessStatus(defaults);
                        toast({ title: "Defaults Loaded", description: `Settings for ${mode} have been reset.` });
                      }}
                    >
                      Reset to Default
                    </Button>
                  </div>
                </div>

                {/* ── BLOCK HISTORY PANEL ── */}
                <div className="border-t border-zinc-800/60 pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-orange-500" />
                      <h4 className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">Block History &amp; Management</h4>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
                        <input
                          id="block-staff-scheduler"
                          type="checkbox"
                          checked={blockStaffScheduler}
                          onChange={e => setBlockStaffScheduler(e.target.checked)}
                          className="accent-orange-500 h-3.5 w-3.5"
                        />
                        <label htmlFor="block-staff-scheduler" className="text-[10px] font-bold uppercase text-zinc-400 cursor-pointer">
                          Also Block Staff Scheduler
                        </label>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] border-orange-500/30 text-orange-400 hover:bg-orange-500/10 font-black uppercase"
                        onClick={loadBlockHistory}
                        disabled={blockHistoryLoading}
                      >
                        {blockHistoryLoading ? 'Loading...' : 'Load History'}
                      </Button>
                      {blockHistory.length > 0 && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-[10px] bg-red-900/60 hover:bg-red-700 border border-red-700/50 font-black uppercase"
                          onClick={async () => {
                            if (!ensureNotDemo("clearing all blocks")) return;
                            if (!confirm(`This will clear ALL ${blockHistory.reduce((t, r) => t + r.ids.length, 0)} blocked dates from the booking calendar. Are you sure?`)) return;
                            const { supabase } = await import('@/lib/supabase');
                            await supabase.from('availability_blocks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                            window.dispatchEvent(new Event('availability-changed'));
                            toast({ title: '🧹 All Blocks Cleared', description: 'Every blocked date has been removed from the booking calendar.' });
                            setBlockHistory([]);
                          }}
                        >
                          🗑 Clear ALL
                        </Button>
                      )}
                    </div>
                  </div>

                  {blockHistory.length === 0 && !blockHistoryLoading && (
                    <div className="text-center py-6 text-zinc-600 text-xs italic border border-dashed border-zinc-800 rounded-lg">
                      Click "Load History" to see all currently blocked date ranges.
                    </div>
                  )}

                  {blockHistory.length > 0 && (
                    <div className="space-y-2">
                      {blockHistory.map((range, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl hover:border-orange-500/30 transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-orange-500/10 rounded-lg">
                              <svg className="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">
                                {range.start === range.end ? range.start : `${range.start}  →  ${range.end}`}
                              </p>
                              <p className="text-[10px] text-zinc-500 mt-0.5">
                                {range.reason} &bull; {range.ids.length} day{range.ids.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-[10px] bg-red-900/40 hover:bg-red-700 border border-red-700/30 text-red-400 hover:text-white font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={async () => {
                              if (!ensureNotDemo("block removal")) return;
                              await handleUnblockRange(range);
                              if (blockStaffScheduler) {
                                try {
                                  const { createStaffShift } = await import('@/lib/supa-data');
                                  const { eachDayOfInterval, parseISO } = await import('date-fns');
                                  const days = eachDayOfInterval({ start: parseISO(range.start), end: parseISO(range.end) });
                                  // We need to remove the staff blocks that match this range+reason
                                  const { getStaffShifts, deleteStaffShift } = await import('@/lib/supa-data');
                                  const existing = await getStaffShifts(range.start, range.end);
                                  for (const s of existing.filter((s: any) => s.role === 'Business Closed' && s.notes === range.reason)) {
                                    await deleteStaffShift(s.id!);
                                  }
                                  toast({ title: 'Staff Scheduler Cleared', description: `Business Closed blocks removed for ${range.start} → ${range.end}.` });
                                } catch(e) {
                                  console.error('Failed to clear staff scheduler blocks', e);
                                }
                              }
                            }}
                          >
                            Remove Block
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {blockStaffScheduler && (
                    <div className="mt-3 p-3 bg-blue-950/20 border border-blue-500/20 rounded-lg text-[10px] text-blue-300">
                      <span className="font-black">Staff Scheduler Sync ON:</span> When you deploy a Custom Mode block, a "Business Closed" all-day entry will also be added to the Staff Schedule for each blocked day. Removing it here will also remove those entries.
                    </div>
                  )}
                </div>

              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="bookings" className="border-b-0 mb-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors border border-zinc-800/50 overflow-hidden px-2 shadow-lg shadow-amber-900/5">
              <AccordionTrigger className="hover:no-underline px-4 hover:text-amber-400 [&[data-state=open]]:text-amber-500 font-bold uppercase tracking-tight">
                <div className="flex items-center gap-2">
                  Booking Control
                  <HelpCircle className="h-4 w-4 text-zinc-600" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'booking-test-mode', role: 'admin' }})); }} />
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 space-y-6">
                <div className="flex items-center justify-between p-5 bg-gradient-to-r from-zinc-900/80 to-zinc-950 border border-amber-900/20 rounded-xl">
                  <div className="space-y-1.5 flex-1 pr-6">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-black text-lg uppercase tracking-tighter">Booking Test Mode</h4>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 text-zinc-600 hover:text-amber-500 transition-colors"
                        onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'booking-test-mode', role: 'admin' }}))}
                      >
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed max-w-lg">
                      {bookingTestMode 
                        ? "Currently: TEST MODE ACTIVE - The 'Booking (Test)' link is visible in the Navbar. The booking page will auto-fill with random test data for diagnostic purposes." 
                        : "Currently: PRODUCTION MODE - Test links are hidden. Booking page operates normally with manual user input only."}
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-3 bg-zinc-950 px-5 py-2.5 rounded-full border border-zinc-800 shadow-inner">
                      <Label className={`text-[10px] uppercase font-black tracking-widest ${bookingTestMode ? 'text-amber-500' : 'text-zinc-500'}`}>
                        {bookingTestMode ? 'Test Mode On' : 'Standard'}
                      </Label>
                      <Switch
                        checked={bookingTestMode}
                        onCheckedChange={async (checked) => {
                          if (!ensureNotDemo("test mode toggle")) return;
                          setBookingTestMode(checked);
                          await contentService.upsertServiceMeta({
                            key: 'booking_test_mode',
                            meta: { active: checked },
                            description: 'Administrative Booking Test Mode'
                          });
                          
                          if (!checked) {
                            try {
                              await bookingsSvc.purgeMockData();
                              toast({ 
                                title: 'Production Mode Restored', 
                                description: 'Test mode disabled and all mock bookings have been purged.',
                                className: "bg-zinc-900 border-zinc-700 text-white"
                              });
                            } catch (error) {
                              console.error("Purge failed:", error);
                              toast({ 
                                title: 'Cleanup Warning', 
                                description: 'Test mode disabled, but automated purge encountered an issue.',
                                variant: "destructive"
                              });
                            }
                          } else {
                            toast({ 
                              title: 'Booking Test Mode Active', 
                              description: 'Test booking link is now visible to you.',
                              className: "bg-amber-950 border-amber-500 text-white"
                            });
                          }
                          
                          notifyChange('settings');
                        }}
                      />
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Vehicle Types */}
            <AccordionItem value="vehicle-types" className="border-b-0 mb-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors border border-zinc-800/50 overflow-hidden px-2">
              <AccordionTrigger className="hover:no-underline px-4 hover:text-red-400 [&[data-state=open]]:text-red-500">
                <div className="flex items-center gap-2">
                  Vehicle Types
                  <HelpCircle className="h-4 w-4 text-zinc-600" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'vehicle-types-management', role: 'admin' }})); }} />
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm uppercase tracking-widest text-zinc-500">Register Vehicle Types</h4>
                    <HelpCircle className="h-3.5 w-3.5 text-zinc-700 cursor-pointer hover:text-white" onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'vehicle-types-management', role: 'admin' }}))} />
                  </div>
                  <Button className="bg-red-700 hover:bg-red-800 h-8 text-xs font-bold" onClick={() => {
                    if (!ensureNotDemo("addition")) return;
                    setNewVehicleOpen(true);
                  }}>Add Type</Button>
                </div>
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800">
                        <TableHead className="text-[10px] text-zinc-500 uppercase">Type Name</TableHead>
                        <TableHead className="text-[10px] text-zinc-500 uppercase">Multiplier</TableHead>
                        <TableHead className="text-[10px] text-zinc-500 uppercase w-20 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicleTypes.map((vt: any) => (
                        <TableRow key={vt.id} className="border-zinc-800">
                          <TableCell className="text-white font-medium text-sm">{vt.name}</TableCell>
                          <TableCell className="text-zinc-400 text-sm italic">${vt.multiplier}</TableCell>
                          <TableCell className="text-right flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-white" onClick={() => setEditVehicle(vt)}><Pencil className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-red-500" disabled={vt.protected} onClick={async () => {
                              if (!ensureNotDemo("deletion")) return;
                              if (!confirm('Delete this vehicle type?')) return;
                              await contentService.deleteVehicleType(vt.id);
                              const updated = await contentService.getVehicleTypes();
                              setVehicleTypes(updated.map(st => ({ id: st.id, name: st.name, description: st.description, multiplier: st.multiplier, protected: ['compact', 'midsize', 'truck', 'luxury'].includes(st.id) })));
                              notifyChange('vehicle-types');
                              toast({ title: 'Vehicle type deleted' });
                            }}><Trash2 className="h-3 w-3" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>

            <div className="px-4 py-3 bg-zinc-900/30 border-y border-zinc-800/50 mt-4 flex items-center justify-between">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Website Pages</h4>
              <div className="h-px flex-1 mx-4 bg-gradient-to-r from-zinc-800/50 to-transparent" />
            </div>

            {/* Home Page Sections */}
            <AccordionItem value="home" className="border-b-0 mb-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors border border-zinc-800/50 overflow-hidden px-2 shadow-lg shadow-red-900/5">
              <AccordionTrigger className="hover:no-underline px-4 hover:text-red-400 [&[data-state=open]]:text-red-500 font-bold uppercase tracking-tight">
                <div className="flex items-center gap-2">
                  Home Page Content Control
                  <HelpCircle className="h-4 w-4 text-zinc-600 hover:text-red-500 transition-colors" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'home-content-management', role: 'admin' }})); }} />
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 space-y-8">
                <div className="space-y-4 border-l-4 border-red-600 pl-4 bg-zinc-900/40 p-4 rounded-r-lg">
                  <h4 className="font-black text-xl text-white uppercase italic italic tracking-tighter">1. Hero & Branding</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs uppercase font-bold">Main Brand Title</Label>
                      <Input className="bg-zinc-950 border-zinc-800 text-white font-black uppercase text-lg" value={homeData.heroTitle} onChange={(e) => setHomeData({ ...homeData, heroTitle: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs uppercase font-bold">Hero Subtitle (Italic)</Label>
                      <Input className="bg-zinc-950 border-zinc-800 text-white italic" value={homeData.heroSubtitle} onChange={(e) => setHomeData({ ...homeData, heroSubtitle: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 border-l-4 border-red-600 pl-4 bg-zinc-900/40 p-4 rounded-r-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-xl text-white uppercase italic tracking-tighter">1b. Customer Testimonials (Reviews)</h4>
                    <div className="flex items-center gap-3 bg-zinc-950 px-4 py-2 rounded-full border border-zinc-800">
                      <Label className="text-zinc-400 text-xs uppercase font-bold">{homeData.showTestimonials ? 'Visible' : 'Hidden'}</Label>
                      <Switch
                        checked={homeData.showTestimonials}
                        onCheckedChange={(checked) => setHomeData({ ...homeData, showTestimonials: checked })}
                      />
                    </div>
                  </div>
                  <p className="text-zinc-500 text-xs italic">Toggle whether the "What Our Customers Say" section appears on the Home page. Recommended to hide for new businesses.</p>
                </div>

                <div className="space-y-4 border-l-4 border-red-600 pl-4 bg-zinc-900/40 p-4 rounded-r-lg">
                  <h4 className="font-black text-xl text-white uppercase italic italic tracking-tighter">2. Why Detailing Matters (SEO/Education)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs uppercase font-bold">Section Title (Main)</Label>
                      <Input className="bg-zinc-950 border-zinc-800 text-white" value={homeData.whyMattersTitle} onChange={(e) => setHomeData({ ...homeData, whyMattersTitle: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs uppercase font-bold">Accent Title (Red)</Label>
                      <Input className="bg-zinc-950 border-zinc-800 text-red-500 font-bold" value={homeData.whyMattersAccent} onChange={(e) => setHomeData({ ...homeData, whyMattersAccent: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs uppercase font-bold">Detailed Description</Label>
                    <textarea
                      className="w-full rounded-md bg-zinc-950 border-zinc-800 text-white p-3 h-32 text-sm leading-relaxed"
                      value={homeData.whyMatters}
                      onChange={(e) => setHomeData({ ...homeData, whyMatters: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs uppercase font-bold">Checklist Items (one per line)</Label>
                    <textarea
                      className="w-full rounded-md bg-zinc-950 border-zinc-800 text-white p-3 h-24 text-sm font-mono"
                      value={homeData.whyMattersList?.join('\n')}
                      onChange={(e) => setHomeData({ ...homeData, whyMattersList: e.target.value.split('\n').filter(Boolean) })}
                    />
                  </div>
                </div>

                <div className="space-y-4 border-l-4 border-red-600 pl-4 bg-zinc-900/40 p-4 rounded-r-lg">
                  <h4 className="font-black text-xl text-white uppercase italic italic tracking-tighter">3. Precision Process Steps</h4>
                  {homeData.precisionProcessSteps?.map((step, i) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-zinc-500 uppercase">Step #</Label>
                        <Input className="bg-zinc-900 h-8 text-red-500 font-black italic" value={step.step} onChange={(e) => {
                          const n = [...homeData.precisionProcessSteps]; n[i].step = e.target.value; setHomeData({ ...homeData, precisionProcessSteps: n });
                        }} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-zinc-500 uppercase">Step Name</Label>
                        <Input className="bg-zinc-900 h-8 uppercase font-bold" value={step.name} onChange={(e) => {
                          const n = [...homeData.precisionProcessSteps]; n[i].name = e.target.value; setHomeData({ ...homeData, precisionProcessSteps: n });
                        }} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-zinc-500 uppercase">Description</Label>
                        <Input className="bg-zinc-900 h-8 text-xs" value={step.desc} onChange={(e) => {
                          const n = [...homeData.precisionProcessSteps]; n[i].desc = e.target.value; setHomeData({ ...homeData, precisionProcessSteps: n });
                        }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-4 gap-3">
                  <Button variant="outline" className="border-zinc-800 text-zinc-500 hover:text-white" onClick={() => {
                    setHomeData(DEFAULT_HOME_DATA);
                    toast({ title: 'Defaults Loaded', description: 'Click Save to apply these to the live site.' });
                  }}>Reset to Default</Button>
                  <Button className="bg-red-700 hover:bg-red-800 px-8 font-black uppercase italic tracking-tighter" onClick={async () => {
                    if (!ensureNotDemo("save")) return;
                    await contentService.upsertServiceMeta({ key: 'home_content', meta: homeData, description: 'Complete Home Content' });
                    notifyChange('home');
                    toast({ title: 'Home settings saved!', description: 'All sections updated live.' });
                  }}>Save Home Content</Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* About Page Sections */}
            <AccordionItem value="about-page" className="border-b-0 mb-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors border border-zinc-800/50 overflow-hidden px-2 shadow-lg shadow-blue-900/5">
              <AccordionTrigger className="hover:no-underline px-4 hover:text-blue-400 [&[data-state=open]]:text-blue-500 font-bold uppercase tracking-tight">
                <div className="flex items-center gap-2">
                  About Page Content Control
                  <HelpCircle className="h-4 w-4 text-zinc-600 hover:text-blue-500 transition-colors" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'about-content-management', role: 'admin' }})); }} />
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 space-y-8">
                <div className="space-y-4 border-l-4 border-blue-600 pl-4 bg-zinc-900/40 p-4 rounded-r-lg">
                  <h4 className="font-black text-xl text-white uppercase italic italic tracking-tighter text-blue-400">1. About Hero</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs uppercase font-bold">Hero Badge (Award)</Label>
                      <Input className="bg-zinc-950 border-zinc-800 text-blue-400 font-bold uppercase" value={aboutData.heroBadge} onChange={(e) => setAboutData({ ...aboutData, heroBadge: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs uppercase font-bold">Main Header Title</Label>
                      <Input className="bg-zinc-950 border-zinc-800 text-white font-black uppercase" value={aboutData.heroTitle} onChange={(e) => setAboutData({ ...aboutData, heroTitle: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs uppercase font-bold">Hero Subtitle</Label>
                    <textarea className="w-full bg-zinc-950 border-zinc-800 rounded p-3 text-sm text-zinc-300" value={aboutData.heroSubtitle} onChange={(e) => setAboutData({ ...aboutData, heroSubtitle: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-4 border-l-4 border-blue-600 pl-4 bg-zinc-900/40 p-4 rounded-r-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-xl text-white uppercase italic tracking-tighter text-blue-400">1b. Customer Testimonials</h4>
                    <div className="flex items-center gap-3 bg-zinc-950 px-4 py-2 rounded-full border border-zinc-800">
                      <Label className="text-zinc-400 text-xs uppercase font-bold">{aboutData.showTestimonials ? 'Visible' : 'Hidden'}</Label>
                      <Switch
                        checked={aboutData.showTestimonials}
                        onCheckedChange={(checked) => setAboutData({ ...aboutData, showTestimonials: checked })}
                      />
                    </div>
                  </div>
                  <p className="text-zinc-500 text-xs italic">Toggle whether the "What Our Customers Say" section appears on the About page.</p>
                  
                  {/* Embedded Testimonial Management for visibility */}
                  <div className="mt-4 p-4 bg-zinc-950/50 rounded-lg border border-zinc-800">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-bold text-[10px] uppercase text-zinc-500 tracking-widest">Manage Reviews Below</h5>
                      <Button className="bg-red-700 hover:bg-red-800 h-6 text-[10px] uppercase font-black" onClick={() => setNewTestimonialOpen(true)}>Add New Review</Button>
                    </div>
                    {testimonials.length === 0 ? (
                      <p className="text-[10px] text-zinc-500 italic">No custom reviews added yet. Showing defaults on website.</p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {testimonials.map(t => (
                          <div key={t.id} className="flex items-center justify-between p-2 bg-zinc-900 rounded border border-zinc-800">
                            <span className="text-[10px] text-white font-bold truncate max-w-[100px]">{t.name}</span>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-zinc-500 hover:text-white" onClick={() => setEditTestimonial(t)}><Pencil className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-zinc-500 hover:text-red-500" onClick={async () => {
                                if (!ensureNotDemo("deletion")) return;
                                if(!confirm('Delete?')) return;
                                await contentService.deleteTestimonial(t.id);
                                const updated = await contentService.getTestimonials();
                                setTestimonials(updated);
                                notifyChange('testimonials');
                              }}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4 border-l-4 border-blue-600 pl-4 bg-zinc-900/40 p-4 rounded-r-lg">
                  <h4 className="font-black text-xl text-white uppercase italic tracking-tighter text-blue-400 font-bold">2. More Than a Car Wash Sections</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs uppercase font-bold">Section Header Title</Label>
                      <Input className="bg-zinc-950 border-zinc-800 text-white font-black" value={aboutData.moreThanWashTitle} onChange={(e) => setAboutData({ ...aboutData, moreThanWashTitle: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-zinc-400 text-xs uppercase font-bold">Section Subtitle</Label>
                        <Input className="bg-zinc-950 border-zinc-800 text-zinc-400" value={aboutData.moreThanWashSubtitle} onChange={(e) => setAboutData({ ...aboutData, moreThanWashSubtitle: e.target.value })} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    {(aboutData.benefits || [
                      { title: "Paint Preservation", desc: "Automated washes use abrasive brushes that create micro-scratches. We use pH-neutral chemicals and hand-washing techniques to protect your clear coat." },
                      { title: "Value Retention", desc: "A professionally detailed car maintains a much higher resale value. We remove contaminants that cause long-term corrosion and oxidation." },
                      { title: "Internal Health", desc: "We don't just vacuum. We steam-clean, extract, and condition surfaces to remove bacteria and allergens, creating a healthier environment for you." }
                    ]).map((b, i) => (
                      <div key={i} className="p-3 bg-zinc-950 rounded border border-zinc-800 space-y-2">
                        <Label className="text-[9px] text-zinc-600 uppercase font-black">Benefit Card #{i+1}</Label>
                        <Input className="bg-zinc-900 border-zinc-800 h-8 text-[11px] font-bold" placeholder="Header" value={b.title} onChange={(e) => {
                          const n = [...(aboutData.benefits || [])]; n[i] = { ...n[i], title: e.target.value };
                          setAboutData({ ...aboutData, benefits: n });
                        }} />
                        <textarea className="w-full bg-zinc-900 border-zinc-800 h-20 text-[10px] p-2 text-zinc-400" placeholder="Body Text" value={b.desc} onChange={(e) => {
                          const n = [...(aboutData.benefits || [])]; n[i] = { ...n[i], desc: e.target.value };
                          setAboutData({ ...aboutData, benefits: n });
                        }} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 border-l-4 border-blue-600 pl-4 bg-zinc-900/40 p-4 rounded-r-lg">
                  <h4 className="font-black text-xl text-white uppercase italic tracking-tighter text-blue-400">2a. Who We Are</h4>
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs uppercase font-bold">Section Title</Label>
                    <Input className="bg-zinc-950 border-zinc-800 text-white font-bold" value={aboutData.whoWeAreTitle} onChange={(e) => setAboutData({ ...aboutData, whoWeAreTitle: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs uppercase font-bold">Section Content (Main Bio)</Label>
                    <textarea
                      className="w-full bg-zinc-950 border-zinc-800 rounded p-3 text-sm min-h-[150px] text-zinc-300"
                      value={aboutData.whoWeAreText}
                      onChange={(e) => setAboutData({ ...aboutData, whoWeAreText: e.target.value })}
                    />
                    <p className="text-zinc-500 text-[10px] italic mt-1 font-medium">This replaces the fallback text and takes priority over legacy About Sections below.</p>
                  </div>
                </div>

                <div className="space-y-4 border-l-4 border-blue-600 pl-4 bg-zinc-900/40 p-4 rounded-r-lg">
                  <h4 className="font-black text-xl text-white uppercase italic tracking-tighter text-blue-400">2b. Restoration Story</h4>
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs uppercase font-bold">Interior Refresh Title</Label>
                    <Input className="bg-zinc-950 border-zinc-800 text-white font-bold" value={aboutData.interiorRefreshTitle} onChange={(e) => setAboutData({ ...aboutData, interiorRefreshTitle: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs uppercase font-bold">Interior Refresh Content</Label>
                    <textarea className="w-full bg-zinc-950 border-zinc-800 rounded p-3 text-sm" value={aboutData.interiorRefreshText} onChange={(e) => setAboutData({ ...aboutData, interiorRefreshText: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs uppercase font-bold">Interior Benefits List (one per line)</Label>
                    <textarea className="w-full bg-zinc-950 border-zinc-800 rounded p-3 text-sm font-mono" value={aboutData.interiorRefreshList?.join('\n')} onChange={(e) => setAboutData({ ...aboutData, interiorRefreshList: e.target.value.split('\n').filter(Boolean) })} />
                  </div>
                </div>

                <div className="space-y-4 border-l-4 border-blue-600 pl-4 bg-zinc-900/40 p-4 rounded-r-lg">
                  <h4 className="font-black text-xl text-white uppercase italic italic tracking-tighter text-blue-400">3. Exterior Strategy</h4>
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs uppercase font-bold">Exterior Coverage Title</Label>
                    <Input className="bg-zinc-950 border-zinc-800 text-white font-bold" value={aboutData.exteriorCareTitle} onChange={(e) => setAboutData({ ...aboutData, exteriorCareTitle: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs uppercase font-bold">Exterior Care Content</Label>
                    <textarea className="w-full bg-zinc-950 border-zinc-800 rounded p-3 text-sm" value={aboutData.exteriorCareText} onChange={(e) => setAboutData({ ...aboutData, exteriorCareText: e.target.value })} />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" className="border-zinc-800 text-zinc-500 hover:text-white font-bold uppercase tracking-tighter" onClick={() => {
                    setAboutData(DEFAULT_ABOUT_DATA);
                    toast({ title: 'Defaults Loaded', description: 'Click Save to apply these to the live site.' });
                  }}>Reset to Default</Button>
                  <Button className="bg-blue-700 hover:bg-blue-800 px-8 font-black uppercase italic tracking-tighter" onClick={async () => {
                    if (!ensureNotDemo("save")) return;
                    await contentService.upsertServiceMeta({ key: 'about_content', meta: aboutData, description: 'Complete About Content' });
                    notifyChange('about');
                    toast({ title: 'About settings saved!', description: 'Page sections updated.' });
                  }}>Save About Content</Button>
                </div>

                <div className="h-px bg-zinc-800 my-8" />

                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold uppercase text-zinc-400 tracking-widest text-xs">About Sections Table (Legacy)</h4>
                  <Button className="bg-zinc-800 hover:bg-zinc-700 h-8 text-xs" onClick={() => {
                    if (!ensureNotDemo("addition")) return;
                    setNewAboutOpen(true);
                  }}>Add Row</Button>
                </div>
                <div className="w-full overflow-x-auto mb-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-zinc-500 uppercase text-[10px]">Section</TableHead>
                        <TableHead className="text-zinc-500 uppercase text-[10px]">Content</TableHead>
                        <TableHead className="text-zinc-500 uppercase text-[10px] w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aboutSections.map((s) => (
                        <TableRow key={s.id} className="border-zinc-800">
                          <TableCell className="text-white font-medium">{s.section}</TableCell>
                          <TableCell className="text-zinc-400 text-sm max-w-xs truncate">{s.content}</TableCell>
                          <TableCell className="flex gap-2">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => setEditAbout(s)}><Pencil className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-red-500" onClick={async () => {
                              if (!ensureNotDemo("deletion")) return;
                              if (!confirm('Delete this section?')) return;
                              await contentService.deleteAboutSection(s.id);
                              const updated = await contentService.getAboutSections();
                              setAboutSections(updated.map(s => ({ ...s, section: s.section_title })));
                              toast({ title: 'Section deleted' });
                            }}><Trash2 className="h-3 w-3" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* FAQs */}
            <AccordionItem value="faqs" className="border-b-0 mb-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors border border-zinc-800/50 overflow-hidden px-2">
              <AccordionTrigger className="hover:no-underline px-4 hover:text-red-400 [&[data-state=open]]:text-red-500 font-bold uppercase tracking-tight">
                <div className="flex items-center gap-2">
                  FAQs
                  <HelpCircle className="h-4 w-4 text-zinc-600 hover:text-red-500 transition-colors" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'faqs-management', role: 'admin' }})); }} />
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-sm uppercase tracking-widest text-zinc-500">Manage FAQs</h4>
                  <Button className="bg-red-700 hover:bg-red-800 h-8 text-xs font-bold" onClick={() => {
                    if (!ensureNotDemo("addition")) return;
                    setNewFaqOpen(true);
                  }}>Add FAQ</Button>
                </div>
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800">
                        <TableHead className="text-[10px] text-zinc-500 uppercase">Question</TableHead>
                        <TableHead className="text-[10px] text-zinc-500 uppercase">Answer</TableHead>
                        <TableHead className="text-[10px] text-zinc-500 uppercase w-20 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {faqs.map((fq: any) => (
                        <TableRow key={fq.id} className="border-zinc-800">
                          <TableCell className="text-white font-medium text-sm">{fq.question}</TableCell>
                          <TableCell className="text-zinc-400 text-sm max-w-xs truncate">{fq.answer}</TableCell>
                          <TableCell className="text-right flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-white" onClick={() => setEditFaq(fq)}><Pencil className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-red-500" onClick={async () => {
                              if (!ensureNotDemo("deletion")) return;
                              if (!confirm('Delete this FAQ?')) return;
                              await contentService.deleteFaq(fq.id);
                              const updated = await contentService.getFaqs();
                              setFaqs(updated);
                              notifyChange('faqs');
                              toast({ title: 'FAQ deleted' });
                            }}><Trash2 className="h-3 w-3" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Contact Information */}
            <AccordionItem value="contact" className="border-b-0 mb-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors border border-zinc-800/50 overflow-hidden px-2">
              <AccordionTrigger className="hover:no-underline px-4 hover:text-red-400 [&[data-state=open]]:text-red-500 font-bold uppercase tracking-tight">
                <div className="flex items-center gap-2">
                  Contact Control
                  <HelpCircle className="h-4 w-4 text-zinc-600 hover:text-red-500 transition-colors" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'contact-control', role: 'admin' }})); }} />
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                  <div className="space-y-2">
                    <Label className="text-zinc-500 text-[10px] uppercase font-bold">Business Phone</Label>
                    <Input className="bg-zinc-950 border-zinc-800 text-white" value={contactInfo.phone} onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-500 text-[10px] uppercase font-bold">Email Address</Label>
                    <Input className="bg-zinc-950 border-zinc-800 text-white" value={contactInfo.email} onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-zinc-500 text-[10px] uppercase font-bold">Business Address / Location</Label>
                    <Input className="bg-zinc-950 border-zinc-800 text-white" value={contactInfo.address} onChange={(e) => setContactInfo({ ...contactInfo, address: e.target.value })} placeholder="54 Boston Street Methuen, MA" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-zinc-500 text-[10px] uppercase font-bold">Service Hours</Label>
                    <textarea className="w-full bg-zinc-950 border-zinc-800 text-white rounded p-3 h-24 text-sm" value={contactInfo.hours} onChange={(e) => setContactInfo({ ...contactInfo, hours: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button className="bg-red-700 hover:bg-red-800 px-6 font-bold uppercase tracking-tighter" onClick={async () => {
                    if (!ensureNotDemo("save")) return;
                    await contentService.upsertContact(contactInfo);
                    notifyChange('contact');
                    toast({ title: 'Contact Sync', description: 'Business details updated.' });
                  }}>Save Contact Profile</Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Services */}
            <AccordionItem value="package-details" className="border-b-0 mb-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors border border-zinc-800/50 overflow-hidden px-2">
              <AccordionTrigger className="hover:no-underline px-4 hover:text-red-400 [&[data-state=open]]:text-red-500 font-bold uppercase tracking-tight">
                <div className="flex items-center gap-2">
                  Services Page (Disclaimer & Details)
                  <HelpCircle className="h-4 w-4 text-zinc-600" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'services-disclaimer-management', role: 'admin' }})); }} />
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 space-y-8">
                <div className="space-y-2">
                  <Label className="text-zinc-400 text-xs uppercase font-bold">Services Section Disclaimer (Top Notice)</Label>
                  <textarea
                    className="w-full rounded-md bg-zinc-950 border-zinc-800 text-white p-3 h-32 text-sm leading-relaxed"
                    value={servicesDisclaimer}
                    onChange={(e) => setServicesDisclaimer(e.target.value)}
                    placeholder="⚠️ Service & Pricing Disclaimer..."
                  />
                  <div className="flex justify-end">
                    <Button className="bg-red-700 hover:bg-red-800 h-8 text-xs uppercase font-bold" onClick={async () => {
                      if (!ensureNotDemo("save")) return;
                      await contentService.upsertServiceMeta({ key: 'disclaimer', description: servicesDisclaimer });
                      toast({ title: 'Disclaimer Updated' });
                    }}>Save Top Notice</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-400 text-xs uppercase font-bold">Contractual Disclosure (Scope/Limitations)</Label>
                  <textarea
                    className="w-full rounded-md bg-zinc-950 border-zinc-800 text-white p-3 h-32 text-sm leading-relaxed"
                    value={contractualDisclosure}
                    onChange={(e) => setContractualDisclosure(e.target.value)}
                    placeholder="Enter the text for the Contractual Disclosure section..."
                  />
                  <div className="flex justify-end">
                    <Button className="bg-red-700 hover:bg-red-800 h-8 text-xs uppercase font-bold" onClick={async () => {
                      if (!ensureNotDemo("save")) return;
                      await contentService.upsertServiceMeta({ key: 'contractual_disclosure', description: contractualDisclosure });
                      toast({ title: 'Contractual Disclosure Updated' });
                    }}>Save Disclosure</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-400 text-xs uppercase font-bold">Valuation Disclaimer (Bottom Bar)</Label>
                  <textarea
                    className="w-full rounded-md bg-zinc-950 border-zinc-800 text-white p-3 h-32 text-sm leading-relaxed"
                    value={valuationDisclaimer}
                    onChange={(e) => setValuationDisclaimer(e.target.value)}
                    placeholder="Enter the text for the Valuation Disclaimer bottom bar..."
                  />
                  <div className="flex justify-end">
                    <Button className="bg-red-700 hover:bg-red-800 h-8 text-xs uppercase font-bold" onClick={async () => {
                      if (!ensureNotDemo("save")) return;
                      await contentService.upsertServiceMeta({ key: 'valuation_disclaimer', description: valuationDisclaimer });
                      toast({ title: 'Valuation Disclaimer Updated' });
                    }}>Save Bottom Disclaimer</Button>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="font-bold text-sm uppercase tracking-widest text-zinc-500">Package Details (Learn More)</h4>
                  <div className="grid grid-cols-1 gap-4">
                    {[...builtInPackages, ...getCustomPackages()].map((pkg: any) => (
                      <Card key={pkg.id} className="p-4 bg-zinc-950 border-zinc-900 overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                          <h5 className="font-black text-white italic uppercase tracking-tighter">{pkg.name.replace(' (BEST VALUE)', '')}</h5>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[10px] text-zinc-500 hover:text-white"
                              onClick={() => {
                                const defaultStepIds = (pkg.steps || []).map((s: any) => (typeof s === 'string' ? s : s.id));
                                setLearnMoreEdit(prev => ({ ...prev, [pkg.id]: { description: pkg.description || '', stepIds: defaultStepIds } }));
                              }}
                            >
                              Reset
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-[10px] bg-red-700 hover:bg-red-800"
                              onClick={async () => {
                                if (!ensureNotDemo("save")) return;
                                const current = learnMoreEdit[pkg.id] || { description: '', stepIds: [] };
                                await contentService.upsertServiceMeta({
                                  key: pkg.id,
                                  description: current.description,
                                  meta: { stepIds: current.stepIds }
                                });
                                notifyChange('packages');
                                toast({ title: 'Package Updated', description: pkg.name });
                              }}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-zinc-600 uppercase font-bold">Marketing Description</Label>
                            <textarea
                              className="w-full bg-zinc-900 border-zinc-800 text-white rounded p-2 text-xs h-32"
                              value={learnMoreEdit[pkg.id]?.description || ''}
                              onChange={(e) => setLearnMoreEdit(prev => ({ ...prev, [pkg.id]: { ...(prev[pkg.id] || { description: '', stepIds: [] }), description: e.target.value } }))}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-zinc-600 uppercase font-bold">Steps Included</Label>
                            <div className="bg-zinc-900 border border-zinc-800 rounded p-2 h-32 overflow-y-auto custom-scrollbar">
                              <div className="grid grid-cols-1 gap-1">
                                {allStepOptions.map(opt => {
                                  const checked = (learnMoreEdit[pkg.id]?.stepIds || []).includes(opt.id);
                                  return (
                                    <label key={`${pkg.id}-${opt.id}`} className="flex items-center gap-2 cursor-pointer group">
                                      <input
                                        type="checkbox"
                                        className="accent-red-600"
                                        checked={checked}
                                        onChange={(e) => {
                                          setLearnMoreEdit(prev => {
                                            const current = prev[pkg.id] || { description: '', stepIds: [] };
                                            const nextIds = new Set(current.stepIds);
                                            if (e.target.checked) nextIds.add(opt.id); else nextIds.delete(opt.id);
                                            return { ...prev, [pkg.id]: { ...current, stepIds: Array.from(nextIds) } };
                                          });
                                        }}
                                      />
                                      <span className="text-[10px] text-zinc-400 group-hover:text-white transition-colors">{opt.name}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Footer Control */}
            <AccordionItem value="footer" className="border-b-0 mb-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors border border-zinc-800/50 overflow-hidden px-2">
              <AccordionTrigger className="hover:no-underline px-4 hover:text-amber-400 [&[data-state=open]]:text-amber-500 font-bold uppercase tracking-tight">
                <div className="flex items-center gap-2">
                  Footer Content Control
                  <HelpCircle className="h-4 w-4 text-zinc-600 hover:text-amber-500 transition-colors" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'footer-content-management', role: 'admin' }})); }} />
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-900/40 p-4 rounded-lg border border-zinc-800">
                  <div className="space-y-2">
                    <Label className="text-zinc-500 text-[10px] uppercase font-bold">Brand Name</Label>
                    <Input className="bg-zinc-950 border-zinc-800 text-white" value={footerData.brandName} onChange={(e) => setFooterData({ ...footerData, brandName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-500 text-[10px] uppercase font-bold">Marquee / Slogan</Label>
                    <Input className="bg-zinc-950 border-zinc-800 text-white" value={footerData.marqueeText} onChange={(e) => setFooterData({ ...footerData, marqueeText: e.target.value })} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-zinc-500 text-[10px] uppercase font-bold">Copyright Statement</Label>
                    <Input className="bg-zinc-950 border-zinc-800 text-white" value={footerData.copyrightText} onChange={(e) => setFooterData({ ...footerData, copyrightText: e.target.value })} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-zinc-500 text-[10px] uppercase font-bold">Facebook Page URL</Label>
                    <Input className="bg-zinc-950 border-zinc-800 text-white" value={footerData.facebookUrl} onChange={(e) => setFooterData({ ...footerData, facebookUrl: e.target.value })} placeholder="https://www.facebook.com/PrimeAutoDetail.net" />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" className="border-zinc-800 text-zinc-500 hover:text-white" onClick={() => {
                    setFooterData(DEFAULT_FOOTER_DATA);
                    toast({ title: 'Defaults Loaded', description: 'Click Save to apply these to the live site.' });
                  }}>Reset to Default</Button>
                  <Button className="bg-amber-600 hover:bg-amber-700 px-6 font-bold uppercase tracking-tighter" onClick={async () => {
                    if (!ensureNotDemo("save")) return;
                    await contentService.upsertServiceMeta({ key: 'footer_content', meta: footerData, description: 'Website Footer Content' });
                    notifyChange('footer');
                    toast({ title: 'Footer Updated', description: 'Changes reflect live on the website.' });
                  }}>Save Footer</Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Header / Main Menu Control */}
            <AccordionItem value="header" className="border-b-0 mb-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors border border-zinc-800/50 overflow-hidden px-2">
              <AccordionTrigger className="hover:no-underline px-4 hover:text-emerald-400 [&[data-state=open]]:text-emerald-500 font-bold uppercase tracking-tight">
                <div className="flex items-center gap-2">
                  Main Menu / Header Control
                  <HelpCircle className="h-4 w-4 text-zinc-600 hover:text-emerald-500 transition-colors" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'main-menu-management', role: 'admin' }})); }} />
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Navigation Links</h4>
                  {headerLinks.map((link, i) => (
                    <div key={i} className="flex gap-4 items-end bg-zinc-950/50 p-3 rounded border border-zinc-900">
                      <div className="flex-1 space-y-2">
                        <Label className="text-[10px] text-zinc-600 uppercase font-bold">Label</Label>
                        <Input className="bg-zinc-900 border-zinc-800" value={link.label} onChange={(e) => {
                          const n = [...headerLinks]; n[i].label = e.target.value; setHeaderLinks(n);
                        }} />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label className="text-[10px] text-zinc-600 uppercase font-bold">URL Path</Label>
                        <Input className="bg-zinc-900 border-zinc-800" value={link.to} onChange={(e) => {
                          const n = [...headerLinks]; n[i].to = e.target.value; setHeaderLinks(n);
                        }} />
                      </div>
                      <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-red-500" onClick={() => {
                        const n = [...headerLinks]; n.splice(i, 1); setHeaderLinks(n);
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full border-dashed border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700" onClick={() => {
                    setHeaderLinks([...headerLinks, { to: "/", label: "New Link" }]);
                  }}>
                    Add Navigation Item
                  </Button>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900">
                  <Button variant="ghost" className="text-zinc-500" onClick={() => setHeaderLinks([
                    { to: "/", label: "Home" },
                    { to: "/services", label: "Services" },
                    { to: "/about", label: "About" },
                    { to: "/availability", label: "Availability" },
                    { to: "/faq", label: "FAQ" },
                    { to: "/contact", label: "Contact" },
                  ])}>Reset to Defaults</Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 px-6 font-bold uppercase tracking-tighter" onClick={async () => {
                    if (!ensureNotDemo("save")) return;
                    await contentService.upsertServiceMeta({ key: 'header_links', meta: { links: headerLinks }, description: 'Main Navigation Menu' });
                    notifyChange('header');
                    toast({ title: 'Menu Saved', description: 'Navigation links updated live.' });
                  }}>Save Main Menu</Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        {/* Testimonial Edit Modal */}
        <Dialog open={!!editTestimonial} onOpenChange={(o) => !o && setEditTestimonial(null)}>
          <DialogContent className="bg-black text-white">
            <DialogHeader>
              <DialogTitle>Edit Testimonial</DialogTitle>
            </DialogHeader>
            {editTestimonial && (
              <div className="space-y-3">
                <Input className="bg-zinc-800 border-zinc-700 text-white" value={editTestimonial.name} onChange={(e) => setEditTestimonial({ ...editTestimonial, name: e.target.value })} placeholder="Name" />
                <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-28" value={editTestimonial.quote} onChange={(e) => setEditTestimonial({ ...editTestimonial, quote: e.target.value })} placeholder="Quote" />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setEditTestimonial(null)}>Cancel</Button>
                  <Button className="bg-red-700 hover:bg-red-800" onClick={async () => {
                    if (!ensureNotDemo("save")) return;
                    await contentService.upsertTestimonial({ id: editTestimonial.id, name: editTestimonial.name, quote: editTestimonial.quote, role: 'Customer' });
                    const updated = await contentService.getTestimonials();
                    setTestimonials(Array.isArray(updated) ? updated : []);
                    setEditTestimonial(null);
                    toast({ title: 'Testimonial updated' });
                  }}>Save</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Testimonial Add Modal */}
        <Dialog open={newTestimonialOpen} onOpenChange={setNewTestimonialOpen}>
          <DialogContent className="bg-black text-white">
            <DialogHeader>
              <DialogTitle>Add Testimonial</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input className="bg-zinc-800 border-zinc-700 text-white" value={newTestimonialName} onChange={(e) => setNewTestimonialName(e.target.value)} placeholder="Name" />
              <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-28" value={newTestimonialQuote} onChange={(e) => setNewTestimonialQuote(e.target.value)} placeholder="Quote" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setNewTestimonialOpen(false)}>Cancel</Button>
                <Button className="bg-red-700 hover:bg-red-800" onClick={async () => {
                  if (!ensureNotDemo("add")) return;
                  const name = (newTestimonialName || '').trim();
                  const quote = (newTestimonialQuote || '').trim();
                  if (!name || !quote) { toast({ title: 'Name and Quote required' }); return; }
                  await contentService.upsertTestimonial({ name, quote, role: 'Customer' });
                  const updated = await contentService.getTestimonials();
                  setTestimonials(Array.isArray(updated) ? updated : []);
                  setNewTestimonialName('');
                  setNewTestimonialQuote('');
                  setNewTestimonialOpen(false);
                  toast({ title: 'Testimonial added' });
                }}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Vehicle Type Edit Modal */}
        <Dialog open={!!editVehicle} onOpenChange={(o) => !o && setEditVehicle(null)}>
          <DialogContent className="bg-black text-white">
            <DialogHeader>
              <DialogTitle>Edit Vehicle Type</DialogTitle>
            </DialogHeader>
            {editVehicle && (
              <div className="space-y-3">
                <Input className="bg-zinc-800 border-zinc-700 text-white" value={editVehicle.name} onChange={(e) => setEditVehicle({ ...editVehicle, name: e.target.value })} placeholder="Name" />
                <Input className="bg-zinc-800 border-zinc-700 text-white" value={editVehicle.description || ''} onChange={(e) => setEditVehicle({ ...editVehicle, description: e.target.value })} placeholder="Description" />
                <div>
                  <label className="text-sm text-zinc-400">$ Amount — Multiplier for packages/add-ons</label>
                  <Input
                    type="number"
                    step={1}
                    min={0}
                    max={10000}
                    className="bg-zinc-800 border-red-700 text-white placeholder:text-white"
                    value={(editVehicle as any)?.multiplier ?? ''}
                    onChange={(e) => setEditVehicle({ ...editVehicle, multiplier: e.target.value })}
                    placeholder="$150"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setEditVehicle(null)}>Cancel</Button>
                  <Button className="bg-red-700 hover:bg-red-800" onClick={async () => {
                    if (!ensureNotDemo("save")) return;
                    await contentService.upsertVehicleType({
                      id: editVehicle.id,
                      name: editVehicle.name,
                      description: editVehicle.description,
                      multiplier: Number((editVehicle as any)?.multiplier ?? 100) || 100,
                      has_pricing: true,
                      is_active: true
                    });
                    const updated = await contentService.getVehicleTypes();
                    setVehicleTypes(updated.map(st => ({ id: st.id, name: st.name, description: st.description, multiplier: st.multiplier, protected: ['compact', 'midsize', 'truck', 'luxury'].includes(st.id) })));
                    notifyChange('vehicle-types');
                    setEditVehicle(null);
                    toast({ title: 'Vehicle type updated' });
                  }}>Save</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Vehicle Type Add Modal */}
        <Dialog open={newVehicleOpen} onOpenChange={setNewVehicleOpen}>
          <DialogContent className="bg-black text-white">
            <DialogHeader>
              <DialogTitle>Add Vehicle Type</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input className="bg-zinc-800 border-zinc-700 text-white" value={newVehicleName} onChange={(e) => setNewVehicleName(e.target.value)} placeholder="Name" />
              <Input className="bg-zinc-800 border-zinc-700 text-white" value={newVehicleDesc} onChange={(e) => setNewVehicleDesc(e.target.value)} placeholder="Description" />
              <div>
                <label className="text-sm text-zinc-400">$ Amount — Multiplier for packages/add-ons (e.g. 100 for Compact, 150 for Luxury)</label>
                <Input
                  type="number"
                  step={1}
                  min={0}
                  max={10000}
                  className="bg-zinc-800 border-red-700 text-white placeholder:text-white"
                  value={newVehicleMultiplier}
                  onChange={(e) => setNewVehicleMultiplier(e.target.value)}
                  onBlur={() => {
                    const raw = Number(newVehicleMultiplier);
                    if (Number.isFinite(raw)) {
                      const rounded = Math.round(raw);
                      if (rounded !== raw) {
                        setNewVehicleMultiplier(String(rounded));
                        toast({ title: `Rounded to $${rounded}` });
                      }
                    }
                  }}
                  placeholder="$150"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setNewVehicleOpen(false)}>Cancel</Button>
                <Button className="bg-red-700 hover:bg-red-800" onClick={async () => {
                  if (!ensureNotDemo("add")) return;
                  const safeName = (newVehicleName || '').trim();
                  if (!safeName) { toast({ title: 'Name required' }); return; }
                  const slug = safeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `vt_${Date.now()}`;
                  const mult = Math.round(Number(newVehicleMultiplier || '100'));
                  await contentService.upsertVehicleType({
                    id: slug,
                    name: safeName,
                    description: newVehicleDesc,
                    multiplier: mult,
                    has_pricing: true,
                    is_active: true
                  });
                  const updated = await contentService.getVehicleTypes();
                  setVehicleTypes(updated.map(st => ({ id: st.id, name: st.name, description: st.description, multiplier: st.multiplier, protected: ['compact', 'midsize', 'truck', 'luxury'].includes(st.id) })));
                  setNewVehicleName('');
                  setNewVehicleDesc('');
                  setNewVehicleMultiplier('100');
                  setNewVehicleOpen(false);
                  toast({ title: 'Vehicle type added', description: 'Please set prices in Package Pricing page.' });
                }}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* FAQ Edit Modal */}
        <Dialog open={!!editFaq} onOpenChange={(o) => !o && setEditFaq(null)}>
          <DialogContent className="bg-black text-white">
            <DialogHeader>
              <DialogTitle>Edit FAQ</DialogTitle>
            </DialogHeader>
            {editFaq && (
              <div className="space-y-3">
                <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-24" value={editFaq.question} onChange={(e) => setEditFaq({ ...editFaq, question: e.target.value })} placeholder="Question" />
                <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-28" value={editFaq.answer} onChange={(e) => setEditFaq({ ...editFaq, answer: e.target.value })} placeholder="Answer" />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setEditFaq(null)}>Cancel</Button>
                  <Button className="bg-red-700 hover:bg-red-800" onClick={async () => {
                    if (!ensureNotDemo("save")) return;
                    await contentService.upsertFaq({ id: editFaq.id, question: editFaq.question, answer: editFaq.answer, sort_order: editFaq.sort_order });
                    const updated = await contentService.getFaqs();
                    setFaqs(updated);
                    setEditFaq(null);
                    toast({ title: 'FAQ updated' });
                  }}>Save</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* FAQ Add Modal */}
        <Dialog open={newFaqOpen} onOpenChange={setNewFaqOpen}>
          <DialogContent className="bg-black text-white">
            <DialogHeader>
              <DialogTitle>Add FAQ</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-24" value={newFaqQ} onChange={(e) => setNewFaqQ(e.target.value)} placeholder="Question" />
              <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-28" value={newFaqA} onChange={(e) => setNewFaqA(e.target.value)} placeholder="Answer" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setNewFaqOpen(false)}>Cancel</Button>
                <Button className="bg-red-700 hover:bg-red-800" onClick={async () => {
                  if (!ensureNotDemo("add")) return;
                  if (!newFaqQ.trim() || !newFaqA.trim()) { toast({ title: 'Required' }); return; }
                  await contentService.upsertFaq({ question: newFaqQ, answer: newFaqA, sort_order: faqs.length });
                  const updated = await contentService.getFaqs();
                  setFaqs(updated);
                  setNewFaqQ('');
                  setNewFaqA('');
                  setNewFaqOpen(false);
                  toast({ title: 'FAQ added' });
                }}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* About Edit Modal */}
        <Dialog open={!!editAbout} onOpenChange={(o) => !o && setEditAbout(null)}>
          <DialogContent className="bg-black text-white">
            <DialogHeader>
              <DialogTitle>Edit Section</DialogTitle>
            </DialogHeader>
            {editAbout && (
              <div className="space-y-3">
                <Input className="bg-zinc-800 border-zinc-700 text-white" value={editAbout.section} onChange={(e) => setEditAbout({ ...editAbout, section: e.target.value })} placeholder="Section name" />
                <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-28" value={editAbout.content} onChange={(e) => setEditAbout({ ...editAbout, content: e.target.value })} placeholder="Content" />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setEditAbout(null)}>Cancel</Button>
                  <Button className="bg-red-700 hover:bg-red-800" onClick={async () => {
                    if (!ensureNotDemo("save")) return;
                    await contentService.upsertAboutSection({ id: editAbout.id, section_title: editAbout.section, content: editAbout.content });
                    const updated = await contentService.getAboutSections();
                    setAboutSections(updated.map(s => ({ ...s, section: s.section_title })));
                    setEditAbout(null);
                    toast({ title: 'Section updated' });
                  }}>Save</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* About Add Modal */}
        <Dialog open={newAboutOpen} onOpenChange={setNewAboutOpen}>
          <DialogContent className="bg-black text-white">
            <DialogHeader>
              <DialogTitle>Add Section</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input className="bg-zinc-800 border-zinc-700 text-white" value={newAboutSection} onChange={(e) => setNewAboutSection(e.target.value)} placeholder="Section" />
              <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-28" value={newAboutContent} onChange={(e) => setNewAboutContent(e.target.value)} placeholder="Content" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setNewAboutOpen(false)}>Cancel</Button>
                <Button className="bg-red-700 hover:bg-red-800" onClick={async () => {
                  if (!ensureNotDemo("add")) return;
                  if (!newAboutSection.trim() || !newAboutContent.trim()) { toast({ title: 'Required' }); return; }
                  await contentService.upsertAboutSection({ section_title: newAboutSection, content: newAboutContent, sort_order: aboutSections.length });
                  const updated = await contentService.getAboutSections();
                  setAboutSections(updated.map(s => ({ ...s, section: s.section_title })));
                  setNewAboutSection('');
                  setNewAboutContent('');
                  setNewAboutOpen(false);
                  toast({ title: 'Section added' });
                }}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <HelpCircle className="hidden" /> {/* Placeholder for logic that might expect this icon */}
      </div>
    </div>
  );
}
