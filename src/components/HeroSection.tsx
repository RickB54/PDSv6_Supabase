import { Button } from "@/components/ui/button";
import heroCar from "@/assets/hero-car.jpg";

export const HeroSection = () => {
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
            <span>PRIME AUTO</span>
            <span>DETAIL</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-zinc-200 italic font-normal tracking-wide drop-shadow-lg pb-4">
            Premium auto detailing services that exceed expectations
          </p>

          {/* Call to Action Buttons - Balanced Sizing */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
            <Button
              onClick={scrollToServices}
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

      {/* Bottom Marquee - Faster and Spaced */}
      <div className="relative z-30 w-full bg-black/90 border-t border-white/10 py-6 overflow-hidden">
        <div className="scrolling-tagline">
          <div className="flex items-center gap-24 text-4xl md:text-5xl font-bold uppercase italic px-12">
            <span className="flex items-center">
              <span className="text-zinc-600">★</span>
              <span className="ml-10 text-[#ff3b30]">PRECISION.</span>
              <span className="ml-10 text-white">PROTECTION.</span>
              <span className="ml-10 text-[#007aff]">PERFECTION.</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
