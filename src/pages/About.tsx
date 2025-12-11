import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import AboutDialog from "@/components/AboutDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, Users, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo-3inch.png";
import api from "@/lib/api";

const About = () => {
  const [sections, setSections] = useState<{ id: string; section: string; content: string }[]>([]);
  const [testimonials, setTestimonials] = useState<{ id: string; name: string; quote: string }[]>([]);
  const [features, setFeatures] = useState<{ expertTeam: string; ecoFriendly: string; satisfactionGuarantee: string }>({ expertTeam: '', ecoFriendly: '', satisfactionGuarantee: '' });
  const [showAbout, setShowAbout] = useState(false);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const list = await api('/api/about', { method: 'GET' });
      if (mounted && Array.isArray(list)) setSections(list);
    };
    const loadTestimonials = async () => {
      const t = await api('/api/testimonials', { method: 'GET' });
      if (mounted && Array.isArray(t)) setTestimonials(t);
    };
    const loadFeatures = async () => {
      const f = await api('/api/about/features', { method: 'GET' });
      if (mounted && f && typeof f === 'object') setFeatures({
        expertTeam: (f as any).expertTeam || '',
        ecoFriendly: (f as any).ecoFriendly || '',
        satisfactionGuarantee: (f as any).satisfactionGuarantee || '',
      });
    };
    load();
    loadTestimonials();
    loadFeatures();
    const onChanged = (e: any) => {
      const type = e?.detail?.type || e?.detail?.kind;
      if (type === 'about') load();
      if (type === 'testimonials') loadTestimonials();
      if (type === 'aboutFeatures') loadFeatures();
    };
    window.addEventListener('content-changed', onChanged as any);
    window.addEventListener('storage', load);
    window.addEventListener('storage', loadTestimonials);
    window.addEventListener('storage', loadFeatures);
    return () => { mounted = false; window.removeEventListener('content-changed', onChanged as any); window.removeEventListener('storage', load); window.removeEventListener('storage', loadTestimonials); window.removeEventListener('storage', loadFeatures); };
  }, []);
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section with Video Background (click to open About dialog) */}
      <section
        className="relative h-[60vh] flex items-center justify-center overflow-hidden cursor-pointer"
        onClick={() => setShowAbout(true)}
        aria-label="Open About dialog"
      >
        <div className="absolute inset-0 bg-black/60 z-10" />
        <video
          preload="none"
          muted
          playsInline
          poster={logo}
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="https://cdn.pixabay.com/video/2019/10/08/27833-365006009_large.mp4" type="video/mp4" />
        </video>
        {/* No overlay text or logo to avoid hero overlap */}
      </section>

      {/* Title moved below hero to prevent overlap */}
      <section className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">About Prime Detail Solutions</h1>
        <p className="text-xl text-muted-foreground">Your trusted partner in premium auto care</p>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16 max-w-6xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Link>
        </Button>

        <div className="space-y-16">
          {/* Mission Statement */}
          <Card className="p-8 md:p-12 bg-gradient-card border-border">
            <h2 className="text-3xl font-bold text-center mb-6 text-foreground">Welcome to Prime Detail Solutions</h2>
            <p className="text-lg text-muted-foreground text-center max-w-4xl mx-auto leading-relaxed mb-8">
              Your trusted partner in premium auto care in Methuen, MA. We specialize in high-quality
              interior and exterior detailing, paint correction, ceramic coatings, and mobile services.
              With transparent pricing and expert craftsmanship, we deliver showroom results at our optimized detailing facility or onsite for your convenience.
            </p>
          </Card>

          {/* Dynamic About Sections */}
          {sections.length > 0 && (
            <Card className="p-6 bg-gradient-card border-border">
              <h3 className="text-2xl font-bold text-foreground mb-4">About Sections</h3>
              <div className="space-y-4">
                {sections.map((s) => (
                  <div key={s.id}>
                    <h4 className="text-xl font-semibold text-foreground">{s.section}</h4>
                    <p className="text-muted-foreground whitespace-pre-line">{s.content}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Features Grid (dynamic) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-6 bg-gradient-card border-border hover:shadow-glow transition-all">
              <div className="flex flex-col items-center text-center">
                <div className="p-4 bg-primary/20 rounded-full mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Expert Team</h3>
                <p className="text-muted-foreground">{features.expertTeam || 'Highly trained professionals with years of experience in premium auto detailing'}</p>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-card border-border hover:shadow-glow transition-all">
              <div className="flex flex-col items-center text-center">
                <div className="p-4 bg-primary/20 rounded-full mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Eco-Friendly Products</h3>
                <p className="text-muted-foreground">{features.ecoFriendly || 'We use only premium, environmentally safe products that protect your vehicle and our planet'}</p>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-card border-border hover:shadow-glow transition-all">
              <div className="flex flex-col items-center text-center">
                <div className="p-4 bg-primary/20 rounded-full mb-4">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">100% Satisfaction Guarantee</h3>
                <p className="text-muted-foreground">{features.satisfactionGuarantee || 'Your satisfaction is our priority. We stand behind every service we provide'}</p>
              </div>
            </Card>
          </div>

          {/* Testimonials (dynamic, same styling) */}
          <section>
            <h2 className="text-3xl font-bold text-center mb-8 text-foreground">What Our Customers Say</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {testimonials.length > 0 ? (
                testimonials.map((t) => (
                  <Card key={t.id} className="p-6 bg-gradient-card border-border">
                    <p className="text-muted-foreground italic mb-4">{`"${t.quote}"`}</p>
                    <p className="font-semibold text-foreground">— {t.name}</p>
                  </Card>
                ))
              ) : (
                <Card className="p-6 bg-gradient-card border-border">
                  <p className="text-muted-foreground italic mb-2">No testimonials yet.</p>
                  <p className="text-sm text-muted-foreground">Add testimonials from Website Administration.</p>
                </Card>
              )}
            </div>
          </section>

          {/* CTA */}
          <Card className="p-12 bg-gradient-hero border-border text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Vehicle?</h2>
            <p className="text-white/90 mb-6 text-lg">
              Book your detailing service today and experience the Prime Detail difference
            </p>
            <Link to="/">
              <Button size="lg" variant="secondary" className="group">
                Book Now
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </Card>

          {/* Footer */}
          <div className="text-center text-muted-foreground text-sm">
            <p>© {new Date().getFullYear()} Prime Detail Solutions. All rights reserved.</p>
          </div>
        </div>
      </main>
      <AboutDialog open={showAbout} onOpenChange={setShowAbout} />
    </div>
  );
};

export default About;
