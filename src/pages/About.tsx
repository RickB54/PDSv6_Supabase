import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Car,
  Droplets,
  CheckCircle2,
  Award,
  Star
} from "lucide-react";
import { Link } from "react-router-dom";

// Local Assets
import interiorLux1 from "@/assets/about/interior_lux_1.png";
import interiorLux2 from "@/assets/about/interior_lux_2.png";
import interiorDashboard from "@/assets/about/interior_dashboard.png";
import exteriorGloss from "@/assets/about/exterior_gloss.png";
import exteriorWheels from "@/assets/about/exterior_wheels.png";
import { contentService } from "@/lib/content";
import { useEffect, useState } from "react";

const About = () => {
  const [sections, setSections] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
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
    approachText: 'Our philosophy is simple: Education first, upsell never. We evaluate your vehicle\'s specific condition and tailor our techniques to provide the best possible results without unnecessary additives.'
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [s, t, meta] = await Promise.all([
          contentService.getAboutSections(),
          contentService.getTestimonials(),
          contentService.getServiceMeta('about_content')
        ]);
        setSections(s);
        setTestimonials(t);
        if (meta) setAboutData((prev: any) => ({ ...prev, ...meta }));
      } catch { }
    };
    load();

    const refresh = () => load();
    window.addEventListener('content-changed', refresh);
    return () => window.removeEventListener('content-changed', refresh);
  }, []);
  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-blue-600 selection:text-white">
      <Navbar />

      {/* Hero Header */}
      <section className="relative pt-32 pb-24 bg-zinc-900 text-white overflow-hidden">
        <div className="container mx-auto px-4 max-w-7xl relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 text-sm font-bold uppercase tracking-widest mb-8 animate-fade-in">
            <Award className="w-4 h-4" />
            {aboutData.heroBadge}
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-6">
            {aboutData.heroTitle.split('<br />').map((text: string, i: number) => (
              <span key={i}>
                {text}
                {i < aboutData.heroTitle.split('<br />').length - 1 && <br />}
              </span>
            ))}
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            {aboutData.heroSubtitle}
          </p>
        </div>
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-900" />
          <img src={exteriorGloss} alt="Background" className="w-full h-full object-cover grayscale" />
        </div>
      </section>

      {/* SECTION 1: Who We Are */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 space-y-8">
              <div className="w-20 h-1.5 bg-blue-600 mb-8" />
              <h2 className="text-4xl md:text-5xl font-black text-blue-900 uppercase tracking-tighter leading-none">
                Who We Are
              </h2>
              <div className="space-y-6 text-lg text-zinc-600 leading-relaxed">
                {sections.length > 0 ? (
                  sections.map((s, i) => (
                    <div key={i} className="space-y-4">
                      {s.section_title && <h3 className="text-xl font-bold text-blue-800">{s.section_title}</h3>}
                      <p>{s.content}</p>
                    </div>
                  ))
                ) : (
                  <>
                    <p>
                      Prime Auto Detail is a locally owned, dedicated professional mobile auto detailing service designed for vehicle owners who demand more than a "quick wash."
                    </p>
                    <p>
                      Our focus is on <strong>quality over quantity</strong>. Every vehicle that enters our care is treated with the same meticulous attention to detail as if it were our own. We aren't in the business of hurried automated services; we are in the business of precision detailing and long-term vehicle preservation.
                    </p>
                  </>
                )}
              </div>
              <div className="grid grid-cols-2 gap-8 pt-4">
                <div className="space-y-2">
                  <h4 className="text-3xl font-black text-blue-900">100%</h4>
                  <p className="text-sm font-bold uppercase tracking-widest text-zinc-400">Mobile Service</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-3xl font-black text-blue-900">Elite</h4>
                  <p className="text-sm font-bold uppercase tracking-widest text-zinc-400">Products Only</p>
                </div>
              </div>
            </div>
            <div className="lg:w-1/2 relative">
              <img src={interiorDashboard} alt="Dashboard Clean" className="rounded-2xl shadow-2xl relative z-10" />
              <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-blue-50 -z-0 rounded-full blur-3xl opacity-60" />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Why Professional Detailing Matters */}
      <section className="py-24 bg-blue-50/50">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black text-blue-900 uppercase tracking-tighter">{aboutData.moreThanWashTitle}</h2>
            <p className="text-zinc-500 max-w-2xl mx-auto text-lg">{aboutData.moreThanWashSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                title: "Paint Preservation",
                desc: "Automated washes use abrasive brushes that create micro-scratches. We use pH-neutral chemicals and hand-washing techniques to protect your clear coat.",
                icon: <ShieldCheck className="w-8 h-8 text-blue-600" />
              },
              {
                title: "Value Retention",
                desc: "A professionally detailed car maintains a much higher resale value. We remove contaminants that cause long-term corrosion and oxidation.",
                icon: <Star className="w-8 h-8 text-blue-600" />
              },
              {
                title: "Internal Health",
                desc: "We don't just vacuum. We steam-clean, extract, and condition surfaces to remove bacteria and allergens, creating a healthier environment for you.",
                icon: <Sparkles className="w-8 h-8 text-blue-600" />
              }
            ].map((item, i) => (
              <div key={i} className="space-y-4">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-blue-100">
                  {item.icon}
                </div>
                <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tight">{item.title}</h3>
                <p className="text-zinc-600 leading-relaxed italic">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: Interior Refresh & Restoration */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="lg:w-1/2 relative lg:order-2">
              <div className="grid grid-cols-2 gap-4">
                <img src={interiorLux1} alt="Luxury Interior Detail" className="rounded-xl shadow-lg mt-8" />
                <img src={interiorLux2} alt="Premium Interior Detail" className="rounded-xl shadow-lg" />
              </div>
            </div>
            <div className="lg:w-1/2 lg:order-1 space-y-8 text-left">
              <h2 className="text-4xl md:text-5xl font-black text-blue-900 uppercase tracking-tighter leading-none">
                {aboutData.interiorRefreshTitle}
              </h2>
              <p className="text-lg text-zinc-600 leading-relaxed">
                {aboutData.interiorRefreshText}
              </p>
              <ul className="space-y-4">
                {aboutData.interiorRefreshList?.map((item: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 font-bold uppercase text-xs tracking-widest text-blue-900">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Exterior Care & Protection */}
      <section className="py-24 bg-zinc-50 overflow-hidden">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="lg:w-1/2">
              <div className="grid grid-cols-2 gap-4">
                <img src={exteriorWheels} alt="Wheel Detailing" className="rounded-xl shadow-lg" />
                <img src={exteriorGloss} alt="Paint Correction" className="rounded-xl shadow-lg mt-8" />
              </div>
            </div>
            <div className="lg:w-1/2 space-y-8">
              <h2 className="text-4xl md:text-5xl font-black text-blue-900 uppercase tracking-tighter leading-none">
                {aboutData.exteriorCareTitle}
              </h2>
              <p className="text-lg text-zinc-600 leading-relaxed">
                {aboutData.exteriorCareText}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { title: "Mirror Clarity", icon: <Car className="w-5 h-5" /> },
                  { title: "Iron Decon", icon: <Droplets className="w-5 h-5" /> },
                  { title: "Trim Restoration", icon: <Sparkles className="w-5 h-5" /> },
                  { title: "Wheels & Tires", icon: <Car className="w-5 h-5" /> }
                ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-blue-50 shadow-sm">
                    <div className="text-blue-600">{feat.icon}</div>
                    <span className="font-bold text-sm uppercase tracking-tight text-blue-900">{feat.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: Our Approach */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <div className="space-y-6 mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-blue-900 uppercase tracking-tighter">{aboutData.approachTitle}</h2>
            <div className="w-24 h-1.5 bg-red-600 mx-auto" />
            <p className="text-lg text-zinc-500 leading-relaxed italic max-w-3xl mx-auto">
              {aboutData.approachText}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <Card className="p-8 border-none bg-blue-50 shadow-sm">
              <h4 className="text-xl font-bold text-blue-900 mb-2 uppercase italic tracking-tighter">Premium Products</h4>
              <p className="text-sm text-zinc-600 leading-relaxed">
                We select only the highest-tier pH-neutral soaps, non-acidic wheel cleaners, and breathable leather conditioners.
              </p>
            </Card>
            <Card className="p-8 border-none bg-blue-50 shadow-sm">
              <h4 className="text-xl font-bold text-blue-900 mb-2 uppercase italic tracking-tighter">Elite Techniques</h4>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Our methods are derived from professional detailing standards, ensuring 100% safety for every surface of your car.
              </p>
            </Card>
            <Card className="p-8 border-none bg-blue-50 shadow-sm">
              <h4 className="text-xl font-bold text-blue-900 mb-2 uppercase italic tracking-tighter">Detail Focused</h4>
              <p className="text-sm text-zinc-600 leading-relaxed">
                We don't watch the clock; we watch the quality. We leave only when the vehicle meets our high standard.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* SECTION 6: What Our Customers Say (Testimonials) */}
      {testimonials.length > 0 && (
        <section className="py-24 bg-zinc-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black text-blue-900 uppercase tracking-tighter">What Our Customers Say</h2>
              <p className="text-zinc-500 mt-4 text-lg">Real feedback from satisfied clients.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {testimonials.map((t, i) => (
                <Card key={i} className="p-8 bg-white border-blue-50 shadow-sm flex flex-col justify-between">
                  <div className="space-y-4 text-left">
                    <div className="flex text-yellow-400 gap-1">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                    </div>
                    <p className="text-zinc-600 italic leading-relaxed">"{t.quote}"</p>
                  </div>
                  <div className="mt-8 flex items-center gap-4 border-t border-zinc-100 pt-6">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-blue-900 text-sm uppercase">{t.name}</h4>
                      <p className="text-xs text-zinc-400 uppercase tracking-widest font-black">Verified Customer</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-24 bg-blue-900 text-white text-center flex flex-col items-center">
        <div className="container mx-auto px-4 max-w-4xl space-y-8">
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-tight italic">
            Experience the <br />
            <span className="text-blue-400">Prime Standard</span>
          </h2>
          <p className="text-xl text-blue-200/70 max-w-2xl mx-auto">
            Ready to give your vehicle the care it deserves? Schedule your mobile detail today.
          </p>
          <div className="pt-4 flex justify-center">
            <Link to="/services">
              <Button size="lg" className="bg-white hover:bg-blue-50 text-blue-900 font-black uppercase tracking-widest px-12 py-8 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95">
                View Detailing Packages
                <ArrowRight className="ml-3 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-zinc-100">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em]">
            © {new Date().getFullYear()} Prime Auto Detail • Professional Craftsmanship
          </p>
        </div>
      </footer>
    </div>
  );
};

export default About;
