import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PreVehicleChecklistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PreVehicleChecklistModal({ open, onOpenChange }: PreVehicleChecklistModalProps) {
  const initialChecks = {
    // Exterior (11)
    paint: false, frontBumper: false, headlightsFoglights: false, windshield: false,
    doorPanelsMirrors: false, wheels: false, tires: false, wheelWells: false,
    rearBumper: false, taillights: false, trunkTailgate: false,
    // Interior (7)
    frontSeats: false, frontCarpetMats: false, dashboardConsole: false, odorCheck: false,
    rearSeats: false, rearCarpetFloor: false, trunkCargoArea: false,
    // Cost-Impact Flags (6)
    excessivePetHair: false, heavyMudDirt: false, smokeOdor: false,
    stainsExtraction: false, biohazard: false, excessiveTrash: false,
  };
  type PreVehicleChecks = typeof initialChecks;
  const [checks, setChecks] = useState<PreVehicleChecks>(initialChecks);
  
  // Header Fields
  const [customer, setCustomer] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [service, setService] = useState("");
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");

  // Notes & Sigs
  const [notes, setNotes] = useState("");
  const [customerSig, setCustomerSig] = useState("");
  const [detailerSig, setDetailerSig] = useState("");
  const [sigDate, setSigDate] = useState("");

  const toggleCheck = (key: keyof PreVehicleChecks) =>
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[90vh] bg-zinc-950 border-zinc-800 p-0 flex flex-col overflow-hidden sm:rounded-2xl">
        <DialogHeader className="p-4 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xl font-bold">
              <AlertCircle className="w-6 h-6 text-red-500" />
              Pre-Vehicle Inspection Walkaround
            </span>
          </DialogTitle>
          <div className="text-sm text-zinc-400 mt-2">
            <strong>Instructions:</strong> Check off items that <strong className="text-red-400">NEED WORK</strong> or have <strong className="text-red-400">PRE-EXISTING DAMAGE</strong>.
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Header Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Customer', value: customer, setter: setCustomer },
              { label: 'Date', value: date, setter: setDate, type: "date" },
              { label: 'Service', value: service, setter: setService },
              { label: 'Year', value: year, setter: setYear },
              { label: 'Make', value: make, setter: setMake },
              { label: 'Model', value: model, setter: setModel },
            ].map((f) => (
              <div key={f.label} className="bg-zinc-950/50 border border-zinc-800 rounded-lg px-3 py-2">
                <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">{f.label}</div>
                <input
                  type={f.type || "text"}
                  className="bg-transparent text-zinc-200 text-sm font-semibold w-full outline-none placeholder:text-zinc-700"
                  placeholder={`Enter ${f.label}`}
                  value={f.value}
                  onChange={(e) => f.setter(e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* EXTERIOR */}
            <div className="border-2 border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/20">
              <div className="bg-zinc-800/50 py-3 px-4 border-b border-zinc-800">
                <div className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Exterior</div>
              </div>
              <div className="p-4 space-y-3">
                {([
                  ['paint', 'Paint / Clear Coat'],
                  ['frontBumper', 'Front Bumper'],
                  ['headlightsFoglights', 'Headlights / Foglights'],
                  ['windshield', 'Windshield'],
                  ['doorPanelsMirrors', 'Door Panels / Mirrors'],
                  ['wheels', 'Wheels'],
                  ['tires', 'Tires'],
                  ['wheelWells', 'Wheel Wells'],
                  ['rearBumper', 'Rear Bumper'],
                  ['taillights', 'Taillights'],
                  ['trunkTailgate', 'Trunk / Tailgate'],
                ] as [keyof PreVehicleChecks, string][]).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-3 cursor-pointer group p-1 rounded hover:bg-zinc-800/50 transition-colors" onClick={() => toggleCheck(key)}>
                    <div className={cn(
                      "w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                      checks[key]
                        ? 'bg-red-500/20 border-red-500'
                        : 'border-zinc-600 group-hover:border-red-500/50'
                    )}>
                      {checks[key] && <Check className="w-4 h-4 text-red-500" />}
                    </div>
                    <span className={cn(
                      "text-sm font-medium transition-colors",
                      checks[key] ? 'text-red-400' : 'text-zinc-300 group-hover:text-white'
                    )}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* INTERIOR */}
            <div className="border-2 border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/20">
              <div className="bg-zinc-800/50 py-3 px-4 border-b border-zinc-800">
                <div className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Interior</div>
              </div>
              <div className="p-4 space-y-3">
                {([
                  ['frontSeats', 'Front Seats'],
                  ['frontCarpetMats', 'Front Carpet / Mats'],
                  ['dashboardConsole', 'Dashboard / Center Console'],
                  ['odorCheck', 'Odor Check'],
                  ['rearSeats', 'Rear Seats'],
                  ['rearCarpetFloor', 'Rear Carpet / Floor'],
                  ['trunkCargoArea', 'Trunk / Cargo Area'],
                ] as [keyof PreVehicleChecks, string][]).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-3 cursor-pointer group p-1 rounded hover:bg-zinc-800/50 transition-colors" onClick={() => toggleCheck(key)}>
                    <div className={cn(
                      "w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                      checks[key]
                        ? 'bg-red-500/20 border-red-500'
                        : 'border-zinc-600 group-hover:border-red-500/50'
                    )}>
                      {checks[key] && <Check className="w-4 h-4 text-red-500" />}
                    </div>
                    <span className={cn(
                      "text-sm font-medium transition-colors",
                      checks[key] ? 'text-red-400' : 'text-zinc-300 group-hover:text-white'
                    )}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* COST-IMPACT */}
            <div className="border-2 border-amber-900/30 rounded-xl overflow-hidden bg-zinc-900/20">
              <div className="bg-amber-950/30 py-3 px-4 border-b border-amber-900/30 flex items-center gap-2">
                <div className="text-[11px] font-black uppercase tracking-widest text-amber-500">Cost-Impact Flags</div>
              </div>
              <div className="p-4 space-y-3">
                {([
                  ['excessivePetHair', 'Excessive Pet Hair'],
                  ['heavyMudDirt', 'Heavy Mud / Dirt'],
                  ['smokeOdor', 'Smoke Odor'],
                  ['stainsExtraction', 'Severe Stains (Extraction)'],
                  ['biohazard', 'Biohazard (Mold/Vomit)'],
                  ['excessiveTrash', 'Excessive Trash'],
                ] as [keyof PreVehicleChecks, string][]).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-3 cursor-pointer group p-1 rounded hover:bg-amber-950/20 transition-colors" onClick={() => toggleCheck(key)}>
                    <div className={cn(
                      "w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                      checks[key]
                        ? 'bg-amber-500/20 border-amber-500'
                        : 'border-zinc-600 group-hover:border-amber-500/50'
                    )}>
                      {checks[key] && <Check className="w-4 h-4 text-amber-500" />}
                    </div>
                    <span className={cn(
                      "text-sm font-medium transition-colors",
                      checks[key] ? 'text-amber-400' : 'text-zinc-300 group-hover:text-white'
                    )}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ASK THE CUSTOMER */}
            <div className="border-2 border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/20 lg:col-span-2">
              <div className="bg-zinc-800/50 py-3 px-4 border-b border-zinc-800">
                <div className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Ask The Customer</div>
              </div>
              <div className="p-4 space-y-3">
                {[
                  'When was the last time the vehicle was professionally detailed?',
                  'Are there any specific problem areas you’d like us to focus on?',
                  'Are there pets or smokers that regularly use this vehicle?',
                  'Are there any fragile or valuable items in the vehicle we should know about?',
                ].map((q, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[9px] font-black text-blue-400">{i + 1}</span>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed">{q}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* NOTES */}
          <div className="border-2 border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/20">
            <div className="bg-zinc-800/50 py-3 px-4 border-b border-zinc-800">
              <div className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Pre-Existing Damage Notes / Walkaround Details</div>
            </div>
            <div className="p-4">
              <textarea
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 min-h-[100px] outline-none focus:border-zinc-700 placeholder:text-zinc-700"
                placeholder="Document any pre-existing scratches, dents, tears, or notable damage found during the walkaround..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* SIGNATURES */}
          <div className="border-2 border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/20">
            <div className="bg-zinc-800/50 py-3 px-4 border-b border-zinc-800">
              <div className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Signatures & Acknowledgement</div>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Customer Signature (Type Name)</label>
                <input
                  type="text"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 outline-none focus:border-zinc-700"
                  placeholder="Customer Name"
                  value={customerSig}
                  onChange={e => setCustomerSig(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Detailer Signature (Type Name)</label>
                <input
                  type="text"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 outline-none focus:border-zinc-700"
                  placeholder="Detailer Name"
                  value={detailerSig}
                  onChange={e => setDetailerSig(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Date</label>
                <input
                  type="date"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 outline-none focus:border-zinc-700"
                  value={sigDate}
                  onChange={e => setSigDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div className="pt-8 flex justify-center pb-8">
            <button
              onClick={() => {
                setChecks(initialChecks);
                setCustomer("");
                setService("");
                setYear("");
                setMake("");
                setModel("");
                setNotes("");
                setCustomerSig("");
                setDetailerSig("");
                setSigDate("");
              }}
              className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
            >
              Clear Checklist
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
