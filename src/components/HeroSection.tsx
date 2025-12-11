import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-car.jpg";

export const HeroSection = () => {
  const [bookingOpen, setBookingOpen] = useState(false);
  const navigate = useNavigate();

  const handleBookNow = () => {
    navigate("/book");
  };

  return (
    <>
      <section className="relative h-[600px] md:h-[700px] w-full overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-black/40" />
        </div>
        
        <div className="relative z-10 h-full flex items-center justify-center px-4">
          <div className="text-center text-white space-y-6 max-w-4xl">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Precision. Protection. Perfection.
            </h1>
            <p className="text-xl md:text-2xl text-white/90">
              Premium auto detailing services that exceed expectations
            </p>
            <Button 
              onClick={handleBookNow}
              size="lg"
              className="bg-gradient-hero text-white px-8 py-6 text-lg font-semibold shadow-glow hover:shadow-[0_0_40px_rgba(210,100,50,0.4)] min-h-[56px]"
            >
              Book Your Shine
            </Button>
          </div>
        </div>
      </section>
    </>
  );
};
