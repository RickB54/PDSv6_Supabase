import { Button } from "@/components/ui/button";
import heroCar from "@/assets/hero-car.jpg";
import { useEffect, useState } from "react";
import { contentService } from "@/lib/content";

export const HeroSection = () => {
  const [data, setData] = useState({
    heroTitle: 'PRIME AUTO DETAIL',
    heroSubtitle: 'Premium auto detailing services that exceed expectations'
  });

  useEffect(() => {
    const load = async () => {
      try {
        const meta = await contentService.getServiceMeta('home_content');
        if (meta && meta.meta) {
          setData({
            heroTitle: meta.meta.heroTitle || 'PRIME AUTO DETAIL',
            heroSubtitle: meta.meta.heroSubtitle || 'Premium auto detailing services that exceed expectations'
          });
        }
      } catch { }
    };
    load();
    const refresh = () => load();
    window.addEventListener('content-changed', refresh);
    return () => window.removeEventListener('content-changed', refresh);
  }, []);
  const scrollToServices = () => {
    const el = document.getElementById('services');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative w-full h-screen min-h-[700px] flex flex-col overflow-hidden bg-black select-none font-sans">
      {/* Inline styles for guaranteed scrolling behavior and elegant font styling */}
      <style>{`
        @keyframes hero-marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .scrolling-tagline {
          animation: hero-marquee 12s linear infinite;
          display: inline-block;
          white-space: nowrap;
        }
        .hero-title {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          line-height: 1.1;
          letter-spacing: 0.05em;
        }
      `}</style>

      {/* Background Image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${heroCar})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.4) contrast(1.05)'
        }}
      />

      {/* Main Content Area */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Main Title - Elegant, Thinner, and Half Size */}
          <h1 className="hero-title flex flex-col font-medium text-white uppercase" style={{ fontSize: 'clamp(2.5rem, 8vw, 6rem)' }}>
            {data.heroTitle.includes('<br />') ? (
              data.heroTitle.split('<br />').map((line, i) => <span key={i}>{line}</span>)
            ) : (
              <span>{data.heroTitle}</span>
            )}
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-zinc-200 italic font-normal tracking-wide drop-shadow-lg pb-4">
            {data.heroSubtitle}
          </p>

          {/* Call to Action Buttons - Balanced Sizing */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
            <Button
              onClick={() => window.location.href = '/services'}
              className="h-14 px-10 text-lg font-semibold uppercase tracking-widest bg-black/40 border-2 border-red-600/80 text-white hover:bg-red-600/20 transition-all duration-300 rounded-lg min-w-[240px]"
            >
              VIEW SERVICES
            </Button>

            <Button
              onClick={() => window.location.href = '/contact'}
              className="h-14 px-10 text-lg font-semibold uppercase tracking-widest bg-black/40 border-2 border-blue-600/80 text-white hover:bg-blue-600/20 transition-all duration-300 rounded-lg min-w-[240px]"
            >
              SCHEDULE A CONSULT
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Marquee - Continuous Loop */}
      <div className="relative z-30 w-full bg-black/95 border-t border-white/10 py-8 overflow-hidden">
        <style>{`
          @keyframes hero-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .hero-scroll-container {
            display: flex;
            width: max-content;
            animation: hero-scroll 25s linear infinite;
          }
        `}</style>
        <div className="hero-scroll-container">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-4 text-3xl md:text-5xl font-black uppercase italic tracking-tighter">
              <span className="text-[#ff3b30]">Precision.</span>
              <span className="text-white">Protection.</span>
              <span className="text-[#007aff]">Perfection.</span>
              <span className="ml-4 text-zinc-800">★</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
