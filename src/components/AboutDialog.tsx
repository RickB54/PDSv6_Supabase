import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-primary.png";

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden bg-zinc-900 border border-zinc-800 p-0 shadow-2xl">
        <div className="relative p-6 sm:p-8">
          {/* Large Watermark Background */}
          <div
            className="absolute inset-0 z-0 opacity-[0.08] pointer-events-none flex items-center justify-center p-4"
            aria-hidden="true"
          >
            <img
              src={logo}
              alt=""
              className="w-full h-full object-contain scale-110 transform"
            />
          </div>

          <DialogHeader className="relative z-10 flex flex-col items-center gap-3 mb-6">
            <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50 backdrop-blur-sm shadow-xl">
              <img src={logo} alt="Prime Auto Detail" className="h-20 w-20 aspect-square object-contain" />
            </div>
            <DialogTitle className="text-2xl font-bold text-white tracking-tight">About Prime Auto Detail</DialogTitle>
          </DialogHeader>

          <div className="relative z-10 space-y-5 text-center">
            <p className="text-zinc-200 text-sm md:text-base font-semibold leading-relaxed">
              Welcome to Prime Auto Detail — your trusted partner in premium auto care.
            </p>
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
              We specialize in high-quality interior and exterior detailing, paint correction,
              ceramic coatings, and mobile-ready services. With transparent pricing and expert
              craftsmanship, we deliver showroom results at our optimized detailing facility or onsite at your location!
            </p>
            <div className="pt-6 border-t border-zinc-800 mt-2">
              <p className="text-sm text-zinc-400 flex flex-col gap-2">
                <span>Direct Inquiry:</span>
                <a
                  href={`https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent('Rick.PrimeAutoDetail@gmail.com')}&su=Website%20Inquiry`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 hover:underline font-bold text-lg transition-colors"
                >
                  Rick.PrimeAutoDetail@gmail.com
                </a>
              </p>
              <p className="text-[10px] text-zinc-600 mt-6 tracking-widest uppercase font-medium">
                © Prime Auto Detail. All rights reserved.
              </p>
            </div>
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full mt-2 bg-zinc-100 hover:bg-white text-zinc-950 border-none h-12 font-bold transition-all shadow-lg active:scale-[0.98]"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog >
  );
}

