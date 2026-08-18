import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/HeroSection";
import { ExternalLink, Car, Calendar, Phone, ArrowRight, ShieldCheck, Zap, Droplets, CheckCircle2, ChevronRight, Star, ArrowUpRight, MessageSquare, CalendarRange, Info, Sparkles, Clock, MapPin } from "lucide-react";

const ExpandableTestimonial = ({ t }: { t: any }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = t.quote.length > 120;
  
  return (
    <Card className="bg-white border-zinc-100 p-8 hover:shadow-xl transition-shadow text-left flex flex-col h-full">
      <div className="flex items-center justify-between border-b pb-6 border-zinc-100 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-700 text-white flex items-center justify-center font-black text-xl shrink-0 shadow-inner">
            {t.name.charAt(0)}
          </div>
          <div>
            <h4 className="font-black text-zinc-900 uppercase tracking-wide text-sm">{t.name}</h4>
            <div className="flex items-center gap-1 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              Verified Client
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star key={s} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
        ))}
      </div>
      <div className="flex-grow">
        <p className="text-zinc-600 italic font-serif text-lg leading-relaxed transition-all duration-300">
          "{expanded ? t.quote : (isLong ? t.quote.substring(0, 120) + '...' : t.quote)}"
        </p>
        {isLong && (
          <button onClick={() => setExpanded(!expanded)} className="text-blue-600 hover:text-blue-800 text-xs font-bold mt-3 uppercase tracking-widest transition-colors">
            {expanded ? "Show Less" : "Read More"}
          </button>
        )}
      </div>
    </Card>
  );
};
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

// Import local assets copied earlier
import paintBefore from "@/assets/paint_before.png";
import paintAfter from "@/assets/paint_after.png";
import interiorDetail from "@/assets/home/interior_detail.png";
import ceramicBeading from "@/assets/home/ceramic_beading.png";
import fordF150 from "@/assets/home/ford_f150.png";
import proTools from "@/assets/home/pro_tools.png";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import mobileRigPremium from "@/assets/about/mobile_rig_premium.png";
import dailyDriver from "@/assets/home/daily_driver.png";
import familySuv from "@/assets/home/family_suv.png";
import luxurySport from "@/assets/home/luxury_sport.png";
import workTruck from "@/assets/home/work_truck.png";
import enthusiastCar from "@/assets/home/enthusiast_car.png";
import motorcycle from "@/assets/home/motorcycle_harley.png";
import { contentService } from "@/lib/content";

const Index = () => {
  const [testimonials, setTestimonials] = useState<any[]>([]);
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

  const serviceDescriptions: Record<string, string> = {
    "Decontamination of all surfaces": "We initiate every detail with a chemical and mechanical decontamination process. Iron removers dissolve embedded brake dust, while clay bar treatment pulls out microscopic contaminants that washing misses, leaving paint glass-smooth.",
    "Paint correction to remove swirl marks": "Swirl marks, scratches, and oxidation dull your vehicle's shine. Our machine polishing process carefully levels the clear coat, permanently removing defects rather than hiding them, revealing true reflection and depth.",
    "Ceramic coatings for long-term protection": "Wax is temporary; Ceramic is permanent. We apply a semi-permanent layer of liquid quartz that bonds to your paint, creating a sacrificial barrier against UV rays, bird droppings, and chemicals, while making washing effortless.",
    "Deep interior restoration and conditioning": "We go beyond vacuuming. Using hot water extraction and steam, we sanitize surfaces, lift deep-set stains, and condition leather with pH-balanced formulas that restore the matte, factory finish without greasy residue."
  };

  const DEFAULT_TESTIMONIALS = [
    { name: "LISA M.", quote: "The interior cleaning was amazing. They removed pet hair and odors I thought were permanent. My SUV smells and looks fantastic!", rating: 5 },
    { name: "JAMES D.", quote: "I love their mobile service! They came to my office and detailed my truck while I worked. Convenient and exceptional results.", rating: 5 },
    { name: "SARAH K.", quote: "Professional, friendly, and affordable. The ceramic coating has kept my BMW looking pristine for months. Best detailing service in Methuen!", rating: 5 },
    { name: "MICHAEL R.", quote: "Prime Auto Detail transformed my car! The attention to detail is incredible. My Tesla looks brand new again. Highly recommend!", rating: 5 }
  ];

  const displayTestimonials = testimonials.length > 0 ? testimonials : DEFAULT_TESTIMONIALS;

  useEffect(() => {
    const load = async () => {
      try {
        const [t, meta] = await Promise.all([
          contentService.getTestimonials(),
          contentService.getServiceMeta('home_content')
        ]);
        setTestimonials(t);
        if (meta && meta.meta) {
          setHomeData((prev: any) => ({ ...prev, ...meta.meta }));
        }
      } catch { }
    };
    load();
    const refresh = () => load();
    window.addEventListener('content-changed', refresh);
    return () => window.removeEventListener('content-changed', refresh);
  }, []);
  const navigate = useNavigate();

  // Redirect "VIEW SERVICES" button in the reused HeroSection to the /services page
  const handleViewServices = () => {
    navigate("/services");
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-red-600 selection:text-white">
      <Navbar />
      <HeroSection />

      {/* SECTION 1: Why Professional Detailing Matters */}
      <section className="py-32 bg-zinc-50 overflow-hidden" id="services">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Main Title - Spanning Top */}
          <div className="mb-12">
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter uppercase leading-[0.9] text-zinc-900">
              More Than Just <br />
              <span className="text-blue-700">Detailing Matters</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
            {/* Left Content - Typography & List */}
            <div className="flex flex-col space-y-10">
              <p className="text-xl text-zinc-600 font-medium max-w-xl leading-relaxed">
                Most people mistake a quick car wash for detailing. While automated washes often leave behind micro-scratches and strip protective layers, professional detailing is a restorative process.
              </p>

              {/* Enhanced Interactive List */}
              <ul className="space-y-5">
                {homeData.whyMattersList?.map((item: string, i: number) => {
                  const desc = serviceDescriptions[item] || "Experience our premium tiered service focusing on this specific aspect of vehicle care.";
                  return (
                    <li key={i} className="group">
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <div className="flex items-center gap-4 text-zinc-900 font-bold uppercase tracking-tight italic cursor-pointer transition-all duration-300 hover:translate-x-4 hover:text-blue-700">
                            <div className="p-2 bg-zinc-100 rounded-full group-hover:bg-blue-100 transition-colors">
                              <CheckCircle2 className="w-5 h-5 text-blue-700 group-hover:scale-110 transition-transform" />
                            </div>
                            <span className="underline decoration-dotted underline-offset-4 decoration-zinc-300 hover:decoration-blue-400 text-lg">{item}</span>
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-96 bg-zinc-900 text-white border-zinc-800 shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                          <div className="space-y-3">
                            <h4 className="font-black text-blue-500 uppercase text-sm tracking-widest border-b border-zinc-800 pb-2 flex items-center gap-2">
                              <Sparkles className="w-4 h-4" />
                              {item.split(' ')[0]} Focus
                            </h4>
                            <p className="text-zinc-300 text-sm leading-relaxed">
                              {desc}
                            </p>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Right Content - Visuals */}
            <div className="relative">
              <div className="w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-white">
                <BeforeAfterSlider beforeImage={paintBefore} afterImage={paintAfter} />
              </div>
              <div className="absolute -bottom-20 -right-4 lg:-right-8 hidden md:block z-20">
                <HoverCard openDelay={0} closeDelay={200}>
                  <HoverCardTrigger asChild>
                    <div className="bg-blue-700 text-white p-6 rounded-xl shadow-xl cursor-pointer hover:bg-zinc-900 transition-colors duration-300 group relative">
                      <p className="text-4xl font-black italic tracking-tighter group-hover:text-blue-500 transition-colors leading-none">ZERO</p>
                      <p className="text-[10px] uppercase font-black tracking-widest opacity-80 group-hover:text-white transition-colors mt-1 text-center">Compromise</p>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent side="left" className="w-[450px] bg-zinc-950 border-zinc-800 text-white p-8 shadow-2xl mr-4 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=left]:slide-in-from-right-2">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 border-b border-zinc-800 pb-4 mb-4">
                        <div className="bg-blue-600/20 p-2 rounded-full text-blue-500">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-xl font-black uppercase italic tracking-tighter text-white">The Prime Standard</h4>
                          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Client-First Philosophy</p>
                        </div>
                      </div>
                      <div className="space-y-4 text-zinc-300 text-sm leading-relaxed">
                        <p>
                          We believe in perfection. That is why we rigorously follow a <strong>comprehensive multi-point quality checklist</strong> for every vehicle. Our process leaves nothing to chance.
                        </p>
                        <p>
                          Our job isn't done when we put down the polisher; it's done when you are smiling. We perform a <span className="text-white font-bold">comprehensive final walkthrough</span> with every client.
                        </p>
                        <p>
                          We invite you to inspect our work critically. If any aspect—from a rim reflection to a seat crease—doesn't meet your vision, we make it right immediately, on-site, with zero hesitation. Your whim is our command.
                        </p>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Beyond the Surface */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">{homeData.beyondSurfaceTitle}</h2>
            <p className="text-zinc-500 text-lg">{homeData.beyondSurfaceSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-0 overflow-hidden border-none bg-zinc-50 group">
              <div className="h-64 overflow-hidden">
                <img src={interiorDetail} alt="Interior" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              </div>
              <div className="p-8 space-y-4">
                <h3 className="text-2xl font-black uppercase tracking-tighter">Interior Refresh</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">Deep extraction, steam cleaning, and leather conditioning for a factory-new environment.</p>
              </div>
            </Card>

            <Card className="p-0 overflow-hidden border-none bg-zinc-50 group">
              <div className="h-64 overflow-hidden">
                <img src={ceramicBeading} alt="Protection" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              </div>
              <div className="p-8 space-y-4">
                <h3 className="text-2xl font-black uppercase tracking-tighter">Paint Protection</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">Advanced ceramic technology and premium sealants for a deep gloss and permanent shield.</p>
              </div>
            </Card>

            <Card className="p-0 border-none bg-zinc-50 group transition-all duration-500 hover:scale-140 z-10 hover:z-50 shadow-none hover:shadow-2xl ring-0 hover:ring-2 hover:ring-blue-400">
              <div className="h-64 border-8 border-blue-600 overflow-hidden group-hover:overflow-visible group-hover:h-auto group-hover:min-h-[16rem] transition-all duration-500">
                <div className="bg-blue-600 h-full flex flex-col items-center justify-center p-8 text-white text-center transition-all">
                  <Droplets className="w-16 h-16 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-3xl font-black uppercase tracking-tighter mb-2 italic">Pure Water</h3>
                  <p className="text-[11px] leading-relaxed font-bold uppercase tracking-tight group-hover:text-[12px] group-hover:font-black transition-all">
                    Our detailing process includes measures to manage water quality and reduce mineral and contaminant exposure, helping deliver consistent, high-quality results and significantly reduce the likelihood of water spots.
                  </p>
                </div>
              </div>
              <div className="p-8 space-y-4">
                <h3 className="text-2xl font-black uppercase tracking-tighter">Spot-Free Finish</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">De-ionized water filtration for a crystal-clear, mineral-free results on every surface.</p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* SECTION 3: Our Precision Process */}
      <section className="py-32 bg-zinc-900 text-white overflow-hidden">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 items-center">
            {/* Left Side: Title and Step Grid */}
            <div className="lg:col-span-2 space-y-16 order-2 lg:order-1">
              <h3 className="text-5xl md:text-7xl font-black italic text-white uppercase tracking-tighter">
                Our Precision Process
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
                {[
                  { id: "01", title: "Booking", desc: "Easily schedule through our portal with transparent upfront pricing." },
                  { id: "02", title: "Evaluation", desc: "On-site condition assessment to tailor our plan to your vehicle." },
                  { id: "03", title: "The Detail", desc: "Clock-out service where we don't leave until the job is perfect." }
                ].map((step) => (
                  <div key={step.id} className="space-y-4 group">
                    <span className="text-4xl font-black text-zinc-800 group-hover:text-blue-700 transition-colors italic">{step.id}</span>
                    <h4 className="text-2xl font-black uppercase italic tracking-tighter leading-tight">{step.title}</h4>
                    <p className="text-zinc-400 font-medium leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side: Image */}
            <div className="lg:col-span-1 relative order-1 lg:order-2">
              <img src={fordF150} alt="Mobile Detailing Unit" className="rounded-2xl shadow-2xl w-full" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-600/5 animate-pulse rounded-2xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Elite Results. Delivered. */}
      <section className="py-24 bg-white relative">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="bg-zinc-100 p-12 flex flex-col justify-center space-y-6">
              <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic">{homeData.eliteResultsTitle.split(' ').slice(0, 2).join(' ')}<br />{homeData.eliteResultsTitle.split(' ').slice(2).join(' ')}</h2>
              <p className="text-zinc-500 leading-relaxed text-lg">{homeData.eliteResultsText}</p>
              <div className="flex gap-4 pt-4">
                <div className="flex flex-col">
                  <span className="text-3xl font-black italic tracking-tighter">PRIME</span>
                  <span className="text-[10px] text-zinc-400 uppercase font-black tracking-widest">Precision Focused</span>
                </div>
                <div className="w-px h-12 bg-zinc-200" />
                <div className="flex flex-col">
                  <span className="text-3xl font-black italic tracking-tighter">ELITE</span>
                  <span className="text-[10px] text-zinc-400 uppercase font-black tracking-widest">Satisfaction Guaranteed</span>
                </div>
              </div>
            </div>
            <div className="h-[500px]">
              <img src={proTools} alt="Professional Tools" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: Who Our Services Are Designed For */}
      <section className="py-24 bg-zinc-50">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">{homeData.perfectedTitle}</h2>
            <p className="text-zinc-500 text-lg">{homeData.perfectedSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: "Daily Drivers", img: dailyDriver, desc: "Maintain cleanliness and comfort for the daily grind." },
              { name: "Families", img: familySuv, desc: "Deep cleaning for SUVs and vans that handle messy routines." },
              { name: "Luxury Vehicles", img: luxurySport, desc: "Elite-level care for high-performance and luxury marques." },
              { name: "Work Trucks", img: workTruck, desc: "Tough cleaning for the hardest-working vehicles on the road." },
              { name: "Enthusiasts", img: enthusiastCar, desc: "Show-quality results for your classic or custom project." },
              { name: "Motorcycles", img: motorcycle, desc: "Precision detailing for bikes, from cruisers to sport bikes." }
            ].map((veh, i) => (
              <div key={i} className="group relative h-[400px] overflow-hidden rounded-2xl shadow-lg border border-zinc-200 bg-black">
                <img src={veh.img} alt={veh.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-80 group-hover:opacity-100" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 p-6 space-y-2">
                  <h4 className="text-xl font-bold text-white uppercase tracking-tight group-hover:text-blue-400 transition-colors">{veh.name}</h4>
                  <p className="text-zinc-300 text-xs leading-relaxed opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                    {veh.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: What Our Customers Say (Testimonials) */}
      {homeData.showTestimonials !== false && (
        <section className="py-24 bg-white border-t border-zinc-100">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="text-center space-y-8">
              <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter text-zinc-900">
                The Standard of Excellence
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                {displayTestimonials.map((t, i) => (
                  <ExpandableTestimonial key={i} t={t} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 6: Call to Action */}
      <section className="py-32 bg-white flex justify-center">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none">
              Experience Pure <br /> Perfection
            </h2>
            <p className="text-xl opacity-90 font-medium">
              Your vehicle is one of your largest investments. <br className="hidden md:block" />
              Treat it with the respect it deserves.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 pt-4">
              <Button onClick={() => window.location.href = '/book'} className="h-14 w-full sm:w-64 px-10 bg-blue-700 hover:bg-blue-600 text-white uppercase font-black tracking-widest text-lg rounded-xl shadow-2xl shadow-blue-900/50 hover:shadow-blue-500/50 transition-all hover:scale-105">
                Book Service Now
              </Button>
              <Button onClick={() => window.location.href = '/contact'} variant="outline" className="h-14 w-full sm:w-64 px-10 border-2 border-zinc-900 bg-transparent hover:bg-zinc-50 text-zinc-900 uppercase font-black tracking-widest text-lg rounded-xl transition-all">
                Get A Quote <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Branding */}
      <Footer />
    </div>
  );
};

export default Index;
