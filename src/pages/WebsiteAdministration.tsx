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
import { contentService } from "@/lib/content";
import { Switch } from "@/components/ui/switch";
import { Facebook, Pencil, Trash2, HelpCircle } from "lucide-react";
import HelpModal from "@/components/help/HelpModal";

const notifyChange = (kind: string) => {
  try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind } })); } catch { }
};

export default function WebsiteAdministration() {
  const { toast } = useToast();
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
  const [showBookNow, setShowBookNow] = useState(false);
  const [helpId, setHelpId] = useState<string | null>(null);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [contactInfo, setContactInfo] = useState<{ hours: string; phone: string; address: string; email: string }>({ hours: '', phone: '', address: '', email: '' });
  const [aboutSections, setAboutSections] = useState<any[]>([]);
  const [aboutFeatures, setAboutFeatures] = useState<{ expertTeam: string; ecoFriendly: string; satisfactionGuarantee: string }>({ expertTeam: '', ecoFriendly: '', satisfactionGuarantee: '' });
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [servicesDisclaimer, setServicesDisclaimer] = useState<string>('');
  const [homeData, setHomeData] = useState<any>({
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
  });
  const [aboutData, setAboutData] = useState<any>({
    heroBadge: 'Premium Craftsmanship',
    heroTitle: 'About Prime Auto Detail',
    heroSubtitle: 'Elevating automotive care through precision, passion, and a commitment to perfection. We don\'t just clean cars—we preserve investments.',
    moreThanWashTitle: 'More Than a Car Wash',
    moreThanWashSubtitle: 'Understanding the difference between cleaning and detailing.',
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
  });
  const [footerData, setFooterData] = useState<any>({
    brandName: 'Prime Auto Detail',
    marqueeText: 'Precision. Protection. Perfection.',
    copyrightText: `© ${new Date().getFullYear()} Prime Auto Detail. All Rights Reserved.`,
    facebookUrl: 'https://www.facebook.com/PrimeAutoDetail.net'
  });
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
  const [newFaqA, setNewFaqA] = useState('');

  const [editAbout, setEditAbout] = useState<any | null>(null);
  const [newAboutOpen, setNewAboutOpen] = useState(false);
  const [newAboutSection, setNewAboutSection] = useState('');
  const [newAboutContent, setNewAboutContent] = useState('');

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
      // Find disclaimer
      const d = allMeta.find(m => m.key === 'disclaimer');
      if (d) setServicesDisclaimer(d.description || '');
      
      // Global Settings
      const gs = allMeta.find(m => m.key === 'global_settings');
      if (gs && gs.meta) {
        setShowBookNow(gs.meta.showBookNow !== false);
      }

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
          </div>
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        </div>

        <Card className="p-1 bg-zinc-950/50 border-zinc-800 shadow-xl rounded-xl overflow-hidden">
          <Accordion type="single" collapsible className="w-full space-y-1">

            {/* Home Page Sections */}
            <AccordionItem value="home" className="border-b-0 mb-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors border border-zinc-800/50 overflow-hidden px-2">
              <AccordionTrigger className="hover:no-underline px-4 hover:text-red-400 [&[data-state=open]]:text-red-500 font-bold uppercase tracking-tight">Home Page Content Control</AccordionTrigger>
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
                  {homeData.precisionProcessSteps?.map((step: any, i: number) => (
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

                <div className="flex justify-end pt-4">
                  <Button className="bg-red-700 hover:bg-red-800 px-8 font-black uppercase italic tracking-tighter" onClick={async () => {
                    await contentService.upsertServiceMeta({ key: 'home_content', meta: homeData, description: 'Complete Home Content' });
                    notifyChange('home');
                    toast({ title: 'Home settings saved!', description: 'All sections updated live.' });
                  }}>Save Home Content</Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* About Page Sections */}
            <AccordionItem value="about-page" className="border-b-0 mb-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors border border-zinc-800/50 overflow-hidden px-2">
              <AccordionTrigger className="hover:no-underline px-4 hover:text-blue-400 [&[data-state=open]]:text-blue-500 font-bold uppercase tracking-tight">About Page Content Control</AccordionTrigger>
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

                <div className="flex justify-end pt-4">
                  <Button className="bg-blue-700 hover:bg-blue-800 px-8 font-black uppercase italic tracking-tighter" onClick={async () => {
                    await contentService.upsertServiceMeta({ key: 'about_content', meta: aboutData, description: 'Complete About Content' });
                    notifyChange('about');
                    toast({ title: 'About settings saved!', description: 'Page sections updated.' });
                  }}>Save About Content</Button>
                </div>

                <div className="h-px bg-zinc-800 my-8" />

                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold uppercase text-zinc-400 tracking-widest text-xs">About Sections Table (Legacy)</h4>
                  <Button className="bg-zinc-800 hover:bg-zinc-700 h-8 text-xs" onClick={() => setNewAboutOpen(true)}>Add Row</Button>
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
                      {aboutSections.map((s: any) => (
                        <TableRow key={s.id} className="border-zinc-800">
                          <TableCell className="text-white font-medium">{s.section}</TableCell>
                          <TableCell className="text-zinc-400 text-sm max-w-xs truncate">{s.content}</TableCell>
                          <TableCell className="flex gap-2">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => setEditAbout(s)}><Pencil className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-red-500" onClick={async () => {
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
              <AccordionTrigger className="hover:no-underline px-4 hover:text-red-400 [&[data-state=open]]:text-red-500">FAQs</AccordionTrigger>
              <AccordionContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-sm uppercase tracking-widest text-zinc-500">Manage FAQs</h4>
                  <Button className="bg-red-700 hover:bg-red-800 h-8 text-xs font-bold" onClick={() => setNewFaqOpen(true)}>Add FAQ</Button>
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

            {/* Vehicle Types */}
            <AccordionItem value="vehicle-types" className="border-b-0 mb-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors border border-zinc-800/50 overflow-hidden px-2">
              <AccordionTrigger className="hover:no-underline px-4 hover:text-red-400 [&[data-state=open]]:text-red-500">Vehicle Types</AccordionTrigger>
              <AccordionContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-sm uppercase tracking-widest text-zinc-500">Register Vehicle Types</h4>
                  <Button className="bg-red-700 hover:bg-red-800 h-8 text-xs font-bold" onClick={() => setNewVehicleOpen(true)}>Add Type</Button>
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
            
            {/* Business Launch Manager - Global Toggle */}
            <AccordionItem value="launch-status" className="border-b-0 mb-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors border border-zinc-800/50 overflow-hidden px-2 shadow-lg shadow-red-900/5">
              <AccordionTrigger className="hover:no-underline px-4 hover:text-red-400 [&[data-state=open]]:text-red-500 font-bold uppercase tracking-tight">Business Launch Manager</AccordionTrigger>
              <AccordionContent className="p-4 space-y-6">
                <div className="flex items-center justify-between p-5 bg-gradient-to-r from-zinc-900/80 to-zinc-950 border border-red-900/20 rounded-xl">
                  <div className="space-y-1.5 flex-1 pr-6">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-black text-lg uppercase tracking-tighter">Live Booking & Active Launch Status</h4>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 text-zinc-600 hover:text-emerald-500 transition-colors"
                        onClick={() => setHelpId('business-launch-manager')}
                      >
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed max-w-lg">
                      {showBookNow 
                        ? "Currently: LIVE MODE - Pre-launch banners are hidden, and customers can book services directly." 
                        : "Currently: PRE-LAUNCH MODE - 'Book Now' buttons are hidden, and customers are guided to the inquiry portal."}
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-3 bg-zinc-950 px-5 py-2.5 rounded-full border border-zinc-800 shadow-inner">
                      <Label className={`text-[10px] uppercase font-black tracking-widest ${showBookNow ? 'text-emerald-500' : 'text-red-500'}`}>
                        {showBookNow ? 'Website Live' : 'Pre-Launch'}
                      </Label>
                      <Switch
                        checked={showBookNow}
                        onCheckedChange={async (checked) => {
                          setShowBookNow(checked);
                          await contentService.upsertServiceMeta({
                            key: 'global_settings',
                            meta: { showBookNow: checked },
                            description: 'Website Global Settings'
                          });
                          notifyChange('settings');
                          toast({ 
                            title: checked ? 'Business Launched!' : 'Pre-Launch Active', 
                            description: checked ? 'Public booking is now enabled.' : 'Inquiry mode re-activated.',
                            className: checked ? "bg-emerald-950 border-emerald-500 text-white" : "bg-red-950 border-red-500 text-white"
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Contact Information */}
            <AccordionItem value="contact" className="border-b-0 mb-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors border border-zinc-800/50 overflow-hidden px-2">
              <AccordionTrigger className="hover:no-underline px-4 hover:text-red-400 [&[data-state=open]]:text-red-500">Contact Control</AccordionTrigger>
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
                    await contentService.upsertContact(contactInfo);
                    notifyChange('contact');
                    toast({ title: 'Contact Sync', description: 'Business details updated.' });
                  }}>Save Contact Profile</Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Services */}
            <AccordionItem value="package-details" className="border-b-0 mb-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors border border-zinc-800/50 overflow-hidden px-2">
              <AccordionTrigger className="hover:no-underline px-4 hover:text-red-400 [&[data-state=open]]:text-red-500 font-bold uppercase tracking-tight">Learn More & Disclaimer</AccordionTrigger>
              <AccordionContent className="p-4 space-y-8">
                <div className="space-y-2">
                  <Label className="text-zinc-400 text-xs uppercase font-bold">Services Section Disclaimer</Label>
                  <textarea
                    className="w-full rounded-md bg-zinc-950 border-zinc-800 text-white p-3 h-32 text-sm leading-relaxed"
                    value={servicesDisclaimer}
                    onChange={(e) => setServicesDisclaimer(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button className="bg-red-700 hover:bg-red-800 h-8 text-xs uppercase font-bold" onClick={async () => {
                      await contentService.upsertServiceMeta({ key: 'disclaimer', description: servicesDisclaimer });
                      toast({ title: 'Disclaimer Updated' });
                    }}>Save Disclaimer</Button>
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
              <AccordionTrigger className="hover:no-underline px-4 hover:text-amber-400 [&[data-state=open]]:text-amber-500 font-bold uppercase tracking-tight">Footer Content Control</AccordionTrigger>
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
                <div className="flex justify-end">
                  <Button className="bg-amber-600 hover:bg-amber-700 px-6 font-bold uppercase tracking-tighter" onClick={async () => {
                    await contentService.upsertServiceMeta({ key: 'footer_content', meta: footerData, description: 'Website Footer Content' });
                    notifyChange('footer');
                    toast({ title: 'Footer Updated', description: 'Changes reflect live on the website.' });
                  }}>Save Footer</Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Header / Main Menu Control */}
            <AccordionItem value="header" className="border-b-0 mb-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors border border-zinc-800/50 overflow-hidden px-2">
              <AccordionTrigger className="hover:no-underline px-4 hover:text-emerald-400 [&[data-state=open]]:text-emerald-500 font-bold uppercase tracking-tight">Main Menu / Header Control</AccordionTrigger>
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
        <HelpModal 
          open={helpId !== null} 
          onOpenChange={(open) => !open && setHelpId(null)} 
          role="admin" 
          initialTopicId={helpId || undefined} 
        />
      </div>
    </div>
  );
}
