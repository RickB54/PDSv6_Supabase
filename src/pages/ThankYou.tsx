import { Button } from "@/components/ui/button";
import { useLocation, Link } from "react-router-dom";
import { CheckCircle2, Home, Calendar, CreditCard, Sparkles } from "lucide-react";

export default function ThankYou() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const name = params.get("name") || "Valued Customer";
  const total = params.get("total") || "0";
  const time = params.get("time") || "";
  const date = params.get("date") || "";
  const technician = "Prime Detail Solutions Team";

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
      </div>

      <div className="max-w-3xl w-full relative z-10">
        <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-red-600 rounded-full blur-2xl opacity-20 animate-ping" />
              <div className="relative bg-gradient-to-br from-red-600 to-red-800 p-6 rounded-full shadow-2xl shadow-red-600/50">
                <CheckCircle2 className="w-16 h-16 text-white" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter italic">
              Confirmation <span className="text-red-600 font-extrabold">Received</span>
            </h1>
            <p className="text-xl md:text-2xl text-zinc-400 font-medium italic">
              {name}, we've locked in your royal treatment.
            </p>
          </div>

          {/* Booking Summary Card */}
          <div className="bg-zinc-900/50 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-3xl text-left space-y-6 relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles className="w-12 h-12 text-white" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-red-600 text-xs font-black uppercase tracking-widest">
                  <Calendar className="w-3 h-3" />
                  Scheduled Date
                </div>
                <p className="text-2xl font-bold text-white tracking-tight">{date || "TBD"}</p>
                <p className="text-sm text-zinc-500 font-medium">{time || "Morning Arrival"}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-blue-600 text-xs font-black uppercase tracking-widest">
                  <CreditCard className="w-3 h-3" />
                  Total Value
                </div>
                <p className="text-2xl font-bold text-white tracking-tight">${total}</p>
                <p className="text-sm text-zinc-500 font-medium italic">Pending Confirmation</p>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 space-y-4">
              <div className="flex items-start gap-4">
                <div className="bg-red-600/10 p-2 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">What Follows Next?</h4>
                  <p className="text-sm text-zinc-500 leading-relaxed mt-1">
                    Our dispatch team will review your booking and contact you via phone or email within 24 hours to confirm the logistics.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto bg-white text-black hover:bg-zinc-200 h-14 px-10 text-lg font-black uppercase italic tracking-tighter rounded-xl transition-all hover:scale-[1.03]"
            >
              <Link to="/">
                <Home className="w-5 h-5 mr-2" />
                Return Home
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-2 border-white/10 bg-transparent text-zinc-400 hover:text-white hover:bg-white/5 h-14 px-10 text-lg font-black uppercase italic tracking-tighter rounded-xl"
              onClick={() => window.print()}
            >
              Print Details
            </Button>
          </div>

          <div className="pt-8">
            <p className="text-[10px] text-zinc-600 uppercase font-black tracking-[0.3em] italic">
              Prime Auto Detail — Beyond The Surface
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
