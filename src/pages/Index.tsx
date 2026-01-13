import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import {
  ArrowRight,
  ShieldCheck,
  Clock,
  MapPin,
  Car,
  Sparkles,
  CheckCircle2,
  Droplets,
  Zap,
  Star
} from "lucide-react";

// Import local assets copied earlier
import paintBefore from "@/assets/paint_before.png";
import paintAfter from "@/assets/paint_after.png";
import interiorDetail from "@/assets/home/interior_detail.png";
import ceramicBeading from "@/assets/home/ceramic_beading.png";
import mobileVan from "@/assets/home/mobile_van.png";
import proTools from "@/assets/home/pro_tools.png";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import dailyDriver from "@/assets/home/daily_driver.png";
import familySuv from "@/assets/home/family_suv.png";
import luxurySport from "@/assets/home/luxury_sport.png";
import workTruck from "@/assets/home/work_truck.png";
import enthusiastCar from "@/assets/home/enthusiast_car.png";
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
    perfectedSubtitle: 'Whether it\'s your daily commute or your weekend pride, we have a solution.'
  });

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
      <section className="py-24 bg-zinc-50 overflow-hidden" id="services">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none">
                {homeData.whyMattersTitle}<br />
                <span className="text-red-600">{homeData.whyMattersAccent}</span>
              </h2>
              <div className="space-y-6 text-lg text-zinc-600 leading-relaxed">
                {homeData.whyMatters.split('\n\n').map((para, i) => (
                  <p key={i}>
                    {para.includes('quality over quantity') ? (
                      <span dangerouslySetInnerHTML={{ __html: para.replace('quality over quantity', '<strong>quality over quantity</strong>') }} />
                    ) : (
                      para
                    )}
                  </p>
                ))}
              </div>
              <ul className="space-y-4">
                {homeData.whyMattersList?.map((item: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-900 font-bold uppercase tracking-tight italic">
                    <CheckCircle2 className="w-5 h-5 text-red-600" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl skew-x-1 border-8 border-white">
                <BeforeAfterSlider beforeImage={paintBefore} afterImage={paintAfter} />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-red-600 text-white p-8 rounded-xl shadow-xl hidden md:block">
                <p className="text-4xl font-black italic tracking-tighter">100%</p>
                <p className="text-xs uppercase font-black tracking-widest opacity-80">Restoration Guarantee</p>
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

            <Card className="p-0 overflow-hidden border-none bg-zinc-50 group">
              <div className="h-64 overflow-hidden border-8 border-red-600">
                <div className="bg-red-600 h-full flex flex-col items-center justify-center p-8 text-white text-center">
                  <Droplets className="w-16 h-16 mb-4" />
                  <h3 className="text-3xl font-black uppercase tracking-tighter mb-2 italic">Pure Water</h3>
                  <p className="text-xs uppercase font-black tracking-widest leading-loose">De-ionized water systems for a spot-free finish every single time.</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* SECTION 3: Our Precision Process */}
      <section className="py-24 bg-zinc-900 text-white overflow-hidden">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative order-2 lg:order-1">
              <img src={mobileVan} alt="Mobile Unit" className="rounded-2xl shadow-2xl" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-red-600/10 animate-pulse rounded-2xl" />
            </div>
            <div className="space-y-12 order-1 lg:order-2">
              <div className="space-y-4 text-center lg:text-left">
                <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none italic">{homeData.precisionProcessTitle.split(' ').slice(0, 2).join(' ')}<br />{homeData.precisionProcessTitle.split(' ').slice(2).join(' ')}</h2>
                <div className="w-24 h-2 bg-red-600 mx-auto lg:mx-0" />
              </div>

              <div className="space-y-8">
                {homeData.precisionProcessSteps?.map((item: any, i: number) => (
                  <div key={i} className="flex gap-6 group hover:translate-x-2 transition-transform duration-300">
                    <span className="text-4xl font-black text-red-600 italic tracking-tighter opacity-50">{item.step}</span>
                    <div className="space-y-1">
                      <h4 className="text-xl font-black uppercase italic tracking-tight">{item.name}</h4>
                      <p className="text-zinc-400 text-sm leading-relaxed max-w-md">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
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
                  <span className="text-3xl font-black italic tracking-tighter">500+</span>
                  <span className="text-[10px] text-zinc-400 uppercase font-black tracking-widest">Vehicles Protected</span>
                </div>
                <div className="w-px h-12 bg-zinc-200" />
                <div className="flex flex-col">
                  <span className="text-3xl font-black italic tracking-tighter">100%</span>
                  <span className="text-[10px] text-zinc-400 uppercase font-black tracking-widest">Client Satisfaction</span>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { name: "Daily Drivers", img: dailyDriver, desc: "Maintain cleanliness and comfort for the daily grind." },
              { name: "Families", img: familySuv, desc: "Deep cleaning for SUVs and vans that handle messy routines." },
              { name: "Luxury Vehicles", img: luxurySport, desc: "Elite-level care for high-performance and luxury marques." },
              { name: "Work Trucks", img: workTruck, desc: "Tough cleaning for the hardest-working vehicles on the road." },
              { name: "Enthusiasts", img: enthusiastCar, desc: "Show-quality results for your classic or custom project." }
            ].map((veh, i) => (
              <div key={i} className="group relative h-[400px] overflow-hidden rounded-2xl shadow-lg border border-zinc-200 bg-black">
                <img src={veh.img} alt={veh.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-80 group-hover:opacity-100" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 p-6 space-y-2">
                  <h4 className="text-xl font-bold text-white uppercase tracking-tight">{veh.name}</h4>
                  <p className="text-zinc-300 text-xs leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {veh.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: What Our Customers Say (Testimonials) */}
      {testimonials.length > 0 && (
        <section className="py-24 bg-white border-t border-zinc-100">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">What Our Customers Say</h2>
              <p className="text-zinc-500 text-lg italic">Real stories from local vehicle owners.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {testimonials.map((t, i) => (
                <Card key={i} className="p-8 bg-zinc-50 border-none shadow-sm flex flex-col justify-between transition-all hover:shadow-lg">
                  <div className="space-y-4">
                    <div className="flex text-yellow-500 gap-1">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
                    </div>
                    <p className="text-zinc-600 italic leading-relaxed">"{t.quote}"</p>
                  </div>
                  <div className="mt-8 flex items-center gap-4 border-t border-zinc-200 pt-6">
                    <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-white font-black text-xl shadow-lg">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-zinc-900 uppercase tracking-tighter text-lg">{t.name}</h4>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-black">Verified Client</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SECTION 6: Call to Action */}
      <section className="py-32 bg-white flex justify-center">
        <div className="container mx-auto px-4 max-w-4xl text-center space-y-12">
          <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none italic">Experience Pure<br /><span className="text-red-600">Perfection</span></h2>
          <p className="text-zinc-500 text-xl font-medium max-w-2xl mx-auto italic">Your vehicle is one of your largest investments. Treat it with the respect it deserves.</p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
            <Button size="lg" onClick={() => navigate("/services")} className="bg-red-600 hover:bg-zinc-900 text-white px-12 h-20 text-xl font-black uppercase italic tracking-tighter rounded-sm">Book Service Now</Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/contact")} className="border-4 border-zinc-900 px-12 h-20 text-xl font-black uppercase italic tracking-tighter rounded-sm group hover:bg-zinc-900 hover:text-white transition-all">Get a Quote <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-2 transition-transform" /></Button>
          </div>
        </div>
      </section>

      {/* Footer Branding */}
      <footer className="py-12 bg-zinc-950 text-white border-t border-zinc-900">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-2">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Prime Auto Detail</h2>
            <p className="text-[10px] text-zinc-600 uppercase font-black tracking-[0.3em]">Precision. Protection. Perfection.</p>
          </div>
          <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-zinc-400">
            <Link to="/about" className="hover:text-red-600 transition-colors">Our Story</Link>
            <Link to="/portal" className="hover:text-red-600 transition-colors">Client Portal</Link>
            <Link to="/services" className="hover:text-red-600 transition-colors">Maintenance</Link>
          </div>
          <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">© 2026 Prime Auto Detail. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
