import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
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
  Zap
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

const Index = () => {
  const navigate = useNavigate();

  // Redirect "VIEW SERVICES" button in the reused HeroSection to the /services page
  useEffect(() => {
    const handleHeroClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' && target.innerText.includes('VIEW SERVICES')) {
        e.preventDefault();
        e.stopPropagation();
        navigate('/services');
      }
    };
    window.addEventListener('click', handleHeroClick, true);
    return () => window.removeEventListener('click', handleHeroClick, true);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-red-600 selection:text-white">
      <Navbar />

      {/* Hero Section (Reused As-Is) */}
      <HeroSection />

      {/* SECTION 1: Why Professional Detailing Matters */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-8">
              <div className="w-20 h-1.5 bg-red-600 mb-8" />
              <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">
                Why Professional Auto <br />
                <span className="text-red-600">Detailing Matters</span>
              </h2>
              <div className="space-y-6 text-lg text-zinc-600 leading-relaxed">
                <p>
                  Most people mistake a quick car wash for detailing. While automated washes often leave behind micro-scratches and strip protective layers, professional detailing is a <strong>restorative process</strong>.
                </p>
                <p>
                  We don't just "clean" your car; we decontaminate surfaces, correct paint imperfections, and apply long-lasting protection that a spray-on wax simply cannot match. Professional detailing preserves your vehicle's value and ensures it looks show-room ready every single day.
                </p>
              </div>
              <ul className="space-y-4">
                {[
                  "Eliminate microscopic surface contaminants",
                  "Remove paint swirls and light oxidation",
                  "Preserve interior materials from UV damage",
                  "Significantly increase resale value"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 font-bold uppercase text-sm tracking-widest text-zinc-800">
                    <CheckCircle2 className="w-5 h-5 text-red-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1 relative">
              <BeforeAfterSlider
                beforeImage={paintBefore}
                afterImage={paintAfter}
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: What Auto Detailing Really Includes */}
      <section className="py-24 bg-zinc-50">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter italic">Beyond the Surface</h2>
            <p className="text-zinc-500 max-w-2xl mx-auto text-lg">Meticulous care for every inch of your vehicle.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <Card className="group overflow-hidden border-none shadow-xl bg-white transition-all hover:-translate-y-2">
              <div className="h-64 overflow-hidden">
                <img src={proTools} alt="Exterior Detailing" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              </div>
              <div className="p-8 space-y-4">
                <div className="bg-red-600 w-12 h-12 rounded-lg flex items-center justify-center -mt-14 relative z-10 shadow-lg shadow-red-600/20">
                  <Sparkles className="text-white w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold uppercase tracking-tight">Exterior Detailing</h3>
                <p className="text-zinc-600 leading-relaxed text-sm">
                  Deep foam bath, iron decontamination, clay bar treatment, and machine polishing to restore depth and clarity to your paint.
                </p>
              </div>
            </Card>

            {/* Card 2 */}
            <Card className="group overflow-hidden border-none shadow-xl bg-white transition-all hover:-translate-y-2">
              <div className="h-64 overflow-hidden">
                <img src={interiorDetail} alt="Interior Detailing" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              </div>
              <div className="p-8 space-y-4">
                <div className="bg-blue-600 w-12 h-12 rounded-lg flex items-center justify-center -mt-14 relative z-10 shadow-lg shadow-blue-600/20">
                  <Car className="text-white w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold uppercase tracking-tight">Interior Detailing</h3>
                <p className="text-zinc-600 leading-relaxed text-sm">
                  Steam cleaning, leather conditioning, stain extraction, and deep vacuuming. We return your cabin to its original factory feel.
                </p>
              </div>
            </Card>

            {/* Card 3 */}
            <Card className="group overflow-hidden border-none shadow-xl bg-white transition-all hover:-translate-y-2">
              <div className="h-64 overflow-hidden">
                <img src={ceramicBeading} alt="Protection" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              </div>
              <div className="p-8 space-y-4">
                <div className="bg-zinc-900 w-12 h-12 rounded-lg flex items-center justify-center -mt-14 relative z-10 shadow-lg shadow-black/20">
                  <ShieldCheck className="text-white w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold uppercase tracking-tight">Protection & Preservation</h3>
                <p className="text-zinc-600 leading-relaxed text-sm">
                  Ceramic sealants, wax coatings, and UV inhibitors for plastics and leather to ensure your detail lasts for months, not days.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* SECTION 3: Our Professional Detailing Process */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="lg:w-1/2 relative order-2 lg:order-1">
              <img src={proTools} alt="Detailing Process" className="rounded-2xl shadow-2xl relative z-10" />
              <div className="absolute -bottom-8 -right-8 w-64 h-64 bg-red-50 -z-10 rounded-full blur-3xl opacity-60"></div>
            </div>
            <div className="lg:w-1/2 order-1 lg:order-2 space-y-12">
              <div className="space-y-4">
                <span className="text-red-600 font-black uppercase tracking-widest text-sm">The Method</span>
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Our Precision Process</h2>
              </div>

              <div className="space-y-10">
                {[
                  {
                    title: "01. Vehicle Evaluation",
                    desc: "We perform a thorough inspection of your vehicle's condition, identifying areas that need extra attention.",
                    icon: <Clock className="w-6 h-6" />
                  },
                  {
                    title: "02. Decontamination",
                    desc: "Safe chemical and physical removal of iron particles, road tar, and embedded grime using pH-neutral soaps.",
                    icon: <Droplets className="w-6 h-6" />
                  },
                  {
                    title: "03. Precision Detailing",
                    desc: "Painstaking care applied to every crack, crevice, and surface using high-end tools and professional techniques.",
                    icon: <Zap className="w-6 h-6" />
                  },
                  {
                    title: "04. Final Inspection",
                    desc: "A meticulous multi-point check ensures everything meets our elite standards before we hand back the keys.",
                    icon: <ShieldCheck className="w-6 h-6" />
                  }
                ].map((step, i) => (
                  <div key={i} className="flex gap-6 group">
                    <div className="flex-shrink-0 w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors duration-300">
                      {step.icon}
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xl font-bold uppercase tracking-tight">{step.title}</h4>
                      <p className="text-zinc-500 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Mobile Detailing At Your Location */}
      <section className="relative py-32 bg-zinc-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img src={mobileVan} alt="Mobile Background" className="w-full h-full object-cover blur-sm" />
        </div>
        <div className="container mx-auto px-4 max-w-7xl relative z-10">
          <div className="max-w-3xl space-y-8">
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none italic">
              Elite Results. <br />
              <span className="text-red-600">Delivered.</span>
            </h2>
            <div className="p-8 bg-black/40 backdrop-blur-md border-l-4 border-red-600 rounded-r-xl space-y-4">
              <h3 className="text-2xl font-bold flex items-center gap-3">
                <MapPin className="text-red-600 w-8 h-8" />
                Mobile Service at Your Doorstep
              </h3>
              <p className="text-lg text-zinc-300 leading-relaxed">
                Why waste your Saturday at a car wash? We bring our fully equipped mobile studio directly to your home or office. All we need is access to your vehicle—we handle the rest.
              </p>
              <div className="pt-4">
                <Link to="/services">
                  <Button size="lg" className="bg-red-600 hover:bg-red-700 font-bold uppercase tracking-widest px-10 h-14 rounded-full">
                    Check Availability
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: Who Our Services Are Designed For */}
      <section className="py-24 bg-zinc-50">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Perfected for Every Driver</h2>
            <p className="text-zinc-500 text-lg">Whether it's your daily commute or your weekend pride, we have a solution.</p>
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

      {/* SECTION 6: Call to Action */}
      <section className="py-32 bg-white flex justify-center">
        <div className="container mx-auto px-4 max-w-4xl text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
              Protect, Restore, and <br />
              <span className="text-red-600">Maintain Your Vehicle</span>
            </h2>
            <p className="text-xl text-zinc-500 max-w-2xl mx-auto">
              Ready to experience the ultimate in automotive care? Choose your package and schedule your detail in seconds.
            </p>
            <div className="flex justify-center">
              <Link to="/services">
                <Button size="lg" className="group bg-zinc-900 hover:bg-red-600 text-white text-xl font-black uppercase tracking-tighter px-16 py-10 rounded-2xl transition-all duration-500 shadow-2xl hover:scale-[1.05]">
                  View Our Detailing Services
                  <ArrowRight className="ml-4 w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer / Copyright */}
      <footer className="py-12 border-t border-zinc-100 bg-white">
        <div className="container mx-auto px-4 text-center text-zinc-400 text-xs uppercase tracking-widest font-bold">
          © {new Date().getFullYear()} Prime Auto Detail • All Rights Reserved
        </div>
      </footer>
    </div>
  );
};

export default Index;
