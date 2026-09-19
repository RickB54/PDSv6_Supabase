import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Download, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import { useToast } from '@/hooks/use-toast';

interface PaintCorrectionGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PaintCorrectionGuideModal: React.FC<PaintCorrectionGuideModalProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<number>(0); // 0 = All Sections, 1-8 = Section N

  const handleDownloadPDF = () => {
    const link = document.createElement('a');
    link.href = '/sop-guides/Prime_Auto_Detail_Paint_Correction_Employee_Training_Guide.pdf';
    link.download = 'Prime_Auto_Detail_Paint_Correction_Employee_Training_Guide.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'PDF Downloaded', description: 'Paint Correction Employee Training Guide PDF downloaded successfully.' });
  };

  const sectionsList = [
    '1. What PC Is & Isn\'t (PC-01)',
    '2. Clear Coat Limits (PC-01, PC-02)',
    '3. Compounding vs Polishing (PC-04, PC-06)',
    '4. Tools & Pad System (PC-03, PC-04)',
    '5. Step-by-Step Process (PC-01 to PC-10)',
    '6. Scenario Guidance (PC-05)',
    '7. Common Mistakes',
    '8. Customer Script & Handoff (PC-09, PC-10)'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] bg-zinc-950 border-amber-500/30 text-white shadow-2xl rounded-2xl p-0 overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <DialogHeader className="p-4 md:p-6 bg-zinc-900/90 border-b border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
                <Sparkles className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg md:text-xl font-black text-white tracking-tight">
                Paint Correction Employee Training Guide
              </DialogTitle>
              <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-950/40 text-[10px] font-bold">
                10-Step Operational Standard (PC-01 to PC-10)
              </Badge>
            </div>
            <DialogDescription className="text-xs text-zinc-400 mt-1">
              Employee Training • Paint Inspection • Correction Process • Quality Control
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadPDF}
              className="h-8 text-xs bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 font-semibold"
            >
              <Download className="h-3.5 w-3.5 mr-1 text-amber-400" /> Save PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open('/sop-guides/Prime_Auto_Detail_Paint_Correction_Employee_Training_Guide.pdf', '_blank')}
              className="h-8 text-xs bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 font-semibold"
            >
              <Printer className="h-3.5 w-3.5 mr-1 text-purple-400" /> Print
            </Button>
          </div>
        </DialogHeader>

        {/* Section Navigation Tabs */}
        <div className="bg-zinc-900/70 border-b border-zinc-800 px-3 py-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          {/* Scrollable Tab Track */}
          <div className="flex-1 min-w-0 overflow-x-auto flex items-center gap-1.5 py-0.5 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
            <button
              onClick={() => setActiveSection(0)}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
                activeSection === 0 
                  ? 'bg-amber-600 text-white shadow-md' 
                  : 'bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800/80'
              }`}
            >
              Full Manual (All Sections)
            </button>
            {sectionsList.map((secLabel, idx) => {
              const num = idx + 1;
              return (
                <button
                  key={num}
                  onClick={() => setActiveSection(num)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
                    activeSection === num 
                      ? 'bg-amber-600 text-white shadow-md' 
                      : 'bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800/80'
                  }`}
                >
                  Sec {num}
                </button>
              );
            })}
          </div>

          {/* Viewing Status Badge */}
          <div className="flex items-center gap-1.5 shrink-0 text-xs bg-zinc-950/80 px-2.5 py-1 rounded-md border border-zinc-800 text-zinc-300 font-semibold whitespace-nowrap self-end sm:self-center">
            <span className="text-zinc-500 font-medium">Viewing:</span>
            <span className="text-amber-400 font-bold">
              {activeSection === 0 ? 'Full Guide (All Sections)' : sectionsList[activeSection - 1] || `Section ${activeSection}`}
            </span>
          </div>
        </div>

        {/* Document Content Scroll View */}
        <ScrollArea className="flex-1 p-4 md:p-8 bg-zinc-950 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-8 pb-8">

            {/* COVER & CORE PRINCIPLE */}
            {(activeSection === 0 || activeSection === 1) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl relative">
                <div className="text-center border-b border-zinc-800 pb-6 space-y-2">
                  <span className="text-xs font-black tracking-widest text-amber-500 uppercase block">PRIME AUTO DETAIL</span>
                  <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">Paint Correction Employee Training Guide</h1>
                  <p className="text-xs text-zinc-400">Employee Training • Paint Inspection • Correction Process • Quality Control</p>
                </div>

                <div className="bg-amber-950/40 border border-amber-500/30 p-4 rounded-xl space-y-2 text-xs">
                  <strong className="text-amber-300 font-bold block text-sm">Purpose of this guide</strong>
                  <p className="text-zinc-300 leading-relaxed">
                    This guide gives employees a consistent, professional way to assess paint defects, perform safe machine correction, and set accurate customer expectations. Paint correction is the highest-skill, highest-risk service Prime Auto Detail offers — done wrong, it can permanently damage a customer's vehicle.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-red-950/60 to-amber-950/40 p-4 rounded-xl border border-red-500/40 text-center space-y-1">
                  <span className="text-xs font-black text-red-400 uppercase tracking-widest">CORE PRINCIPLE</span>
                  <p className="text-lg font-black text-white italic">"Correction removes material to level a defect. Every pass costs clear coat you cannot put back."</p>
                </div>
              </div>
            )}

            {/* SECTION 1: What Paint Correction Is & Isn't */}
            {(activeSection === 0 || activeSection === 1) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-xl font-black text-amber-400">1. What Paint Correction Is — and Isn't</h2>
                  <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs font-mono">SOP LINK: PC-01</Badge>
                </div>

                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2 text-xs">
                  <strong className="text-white block text-sm">Operational Definition:</strong>
                  <p className="text-zinc-300 leading-relaxed">
                    Paint correction levels the clear coat to reduce or remove swirl marks, holograms, light scratches, water etching, and oxidation. It works by <strong>removing a microscopically thin layer of clear coat</strong> until the surrounding area is level with the bottom of the defect.
                  </p>
                </div>

                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-xs text-red-200 space-y-1">
                  <strong className="text-red-400 uppercase block font-bold">Employee Rule:</strong>
                  <p className="text-zinc-300">
                    Correction does not add anything to the paint — it removes material. There is a finite amount of clear coat on every vehicle, and it does not grow back.
                  </p>
                </div>
              </div>
            )}

            {/* SECTION 2: Clear Coat & Safe Removal Limits */}
            {(activeSection === 0 || activeSection === 2) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-xl font-black text-amber-400">2. Clear Coat & Safe Removal Limits</h2>
                  <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs font-mono">SOP LINKS: PC-02, PC-08</Badge>
                </div>

                <div className="space-y-3 text-xs">
                  <ul className="space-y-2 text-zinc-300 list-disc pl-5 leading-relaxed">
                    <li>
                      <strong>Clear coat thickness:</strong> Varies by manufacturer, typically averaging 1.5–2 mils (thousandths of an inch) — but factory variance, prior repaints, and edges/high points can be significantly thinner.
                    </li>
                    <li>
                      <strong>Edges & Body Lines (PC-08):</strong> Edges, body lines, and high points always have thinner clear coat than flat panel centers — extra caution and minimal pressure are required in these areas on every vehicle.
                    </li>
                    <li>
                      <strong>Repainted Panels:</strong> Repainted panels (mismatched color, overspray on trim/rubber, thicker or thinner readings than surrounding panels) may have unknown or reduced clear coat — treat with extra caution or decline correction until verified.
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* SECTION 3: Compounding vs. Polishing vs. Finishing */}
            {(activeSection === 0 || activeSection === 3) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-xl font-black text-amber-400">3. Compounding vs. Polishing vs. Finishing</h2>
                  <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs font-mono">SOP LINKS: PC-03, PC-06</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-zinc-950 p-4 rounded-xl border border-red-500/30 space-y-2">
                    <strong className="text-red-400 text-sm block">Compounding (Cutting)</strong>
                    <p className="text-zinc-300">Removes heavier defects — deeper swirls, oxidation, moderate scratches.</p>
                    <Badge variant="outline" className="border-red-500 text-red-400 text-[10px]">Most Aggressive</Badge>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-amber-500/30 space-y-2">
                    <strong className="text-amber-400 text-sm block">Polishing</strong>
                    <p className="text-zinc-300">Refines the surface after compounding, removes lighter marring.</p>
                    <Badge variant="outline" className="border-amber-500 text-amber-400 text-[10px]">Medium Aggressive</Badge>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-emerald-500/30 space-y-2">
                    <strong className="text-emerald-400 text-sm block">Finishing</strong>
                    <p className="text-zinc-300">Final refinement pass for maximum gloss and optical clarity.</p>
                    <Badge variant="outline" className="border-emerald-500 text-emerald-400 text-[10px]">Least Aggressive</Badge>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-xs text-amber-200">
                  <strong className="text-amber-400 uppercase block mb-1">Employee Rule:</strong>
                  Always work from most aggressive to least aggressive. Never skip straight to a finishing product on a heavily defected panel — it won't correct the defect, and you'll waste time and product.
                </div>
              </div>
            )}

            {/* SECTION 4: Tools & Pad/Compound System */}
            {(activeSection === 0 || activeSection === 4) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-xl font-black text-amber-400">4. Tools & Pad/Compound System</h2>
                  <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs font-mono">SOP LINKS: PC-04, PC-07</Badge>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                    <strong className="text-white text-sm block">Machine Polishers:</strong>
                    <p className="text-zinc-300 leading-relaxed">
                      Dual-action (DA) polishers for most jobs — lower risk of burn-through; rotary polishers reserved for experienced technicians on heavier correction only.
                    </p>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                    <strong className="text-white text-sm block">Pad Tiers:</strong>
                    <p className="text-zinc-300 leading-relaxed">
                      Heavy cutting pad (wool or firm foam), medium polishing pad (foam), soft finishing pad (foam).
                    </p>
                  </div>

                  <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-xs text-red-200">
                    <strong className="text-red-400 uppercase block mb-1">Pad Discipline Rule (PC-07):</strong>
                    Never use the same pad across compound tiers — a pad that touched heavy-cut compound must be washed/dried before use with a lighter product, or use a dedicated pad per tier.
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 5: Step-by-Step Correction Process */}
            {(activeSection === 0 || activeSection === 5) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-xl font-black text-amber-400">5. Step-by-Step Correction Process</h2>
                  <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs font-mono">SOP LINKS: PC-01 TO PC-09</Badge>
                </div>

                <div className="space-y-3 text-xs">
                  <ol className="text-zinc-300 space-y-3 list-decimal pl-5 leading-relaxed">
                    <li>
                      <strong className="text-white">Wash, Decontaminate & Clay (PC-01):</strong> Fully wash, decontaminate (iron removal), and clay bar the vehicle before any machine work — correcting over contamination grinds debris into the paint.
                    </li>
                    <li>
                      <strong className="text-white">Tape Off Trim (PC-02):</strong> Tape off trim, rubber seals, badges, and plastic body cladding to protect them from compound sling and pad contact.
                    </li>
                    <li>
                      <strong className="text-white">Test Spot (PC-03):</strong> Perform a test spot on a small, inconspicuous area first — confirm the pad/compound combination actually corrects the defect before committing to the full panel.
                    </li>
                    <li>
                      <strong className="text-white">Section Work (PC-04):</strong> Work in sections roughly 2x2 feet. Apply compound, work in overlapping crosshatch passes (horizontal, then vertical) at the machine manufacturer's recommended speed.
                    </li>
                    <li>
                      <strong className="text-white">Inspection Light Wipe (PC-05):</strong> Wipe the section clean and inspect under a dedicated inspection light (not ambient shop lighting) — direct light at an angle reveals swirls and holograms that overhead lighting hides.
                    </li>
                    <li>
                      <strong className="text-white">Polishing Refinement Pass (PC-06):</strong> Follow with a polishing/finishing pass on the same section for maximum clarity.
                    </li>
                    <li>
                      <strong className="text-white">IPA Panel Wipe (PC-09):</strong> Once the full vehicle is corrected, wipe every panel down with an isopropyl alcohol (IPA) panel wipe to remove all compound/polish oils before applying any sealant, wax, or ceramic coating — residue left behind will prevent proper bonding.
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {/* SECTION 6: Scenario Guidance */}
            {(activeSection === 0 || activeSection === 6) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-xl font-black text-amber-400">6. Scenario Guidance</h2>
                  <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs font-mono">SECTION 6</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-1">
                    <strong className="text-amber-300 block text-sm">Dark Paint (Black, Navy, Dark Gray):</strong>
                    <p className="text-zinc-300 leading-relaxed">Swirls and holograms are far more visible. Inspect more frequently under light during the process, not just at the end.</p>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-1">
                    <strong className="text-amber-300 block text-sm">Soft OEM Clear Coats:</strong>
                    <p className="text-zinc-300 leading-relaxed">Common on newer vehicles and import brands. Correct with lighter pressure and a less aggressive compound first — soft clear coat corrects quickly and over-correcting is easy.</p>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-1">
                    <strong className="text-amber-300 block text-sm">Single-Stage Paint:</strong>
                    <p className="text-zinc-300 leading-relaxed">Older vehicles with no separate clear coat layer. Compound/polish works directly on the pigmented paint layer. Confirm before treating like a clear-coat vehicle.</p>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-1">
                    <strong className="text-amber-300 block text-sm">Heavily Oxidized Paint:</strong>
                    <p className="text-zinc-300 leading-relaxed">May require a dedicated oxidation-removal compound pass before standard correction — do not attempt to correct through heavy oxidation with a finishing-tier product.</p>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 7: Common Mistakes to Call Out */}
            {(activeSection === 0 || activeSection === 7) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-xl font-black text-amber-400">7. Common Mistakes to Call Out</h2>
                  <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs font-mono">SECTION 7</Badge>
                </div>

                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl space-y-2 text-xs text-red-200">
                  <ul className="space-y-1.5 list-disc pl-5 text-zinc-300">
                    <li>Skipping the test spot and committing the whole vehicle to an unproven approach.</li>
                    <li>Too much pressure or dwell time in one spot — heat buildup from friction can burn through clear coat, especially on edges and high points.</li>
                    <li>Cross-contaminating pads between compound tiers.</li>
                    <li>Working in direct sun or on a hot panel — product dries too fast, reducing working time and correction quality.</li>
                    <li>Skipping the IPA wipe-down before applying protection, causing poor bonding.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* SECTION 8: Customer Expectations & Quick Reference Rules */}
            {(activeSection === 0 || activeSection === 8) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-xl font-black text-amber-400">8. Customer Expectations & Quick Reference Rules</h2>
                  <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs font-mono">SOP LINK: PC-10</Badge>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="bg-zinc-950 p-4 rounded-xl border border-amber-500/30 space-y-2">
                    <strong className="text-amber-400 text-sm block">Employee Script:</strong>
                    <p className="text-zinc-200 italic leading-relaxed">
                      "Paint correction improves the paint's clarity and reduces swirls and light scratches by carefully leveling the clear coat. It's not a magic eraser — very deep scratches that go down to the primer or base coat may lighten but won't fully disappear, since removing that much clear coat isn't safe for your paint. We'll assess your vehicle first and let you know realistically what level of correction will get you."
                    </p>
                  </div>

                  <div className="bg-amber-950/40 border border-amber-500/30 p-4 rounded-xl space-y-2">
                    <strong className="text-amber-300 font-bold block text-sm uppercase tracking-wider">Quick Reference Rules:</strong>
                    <ul className="space-y-1 text-zinc-300 list-disc pl-5">
                      <li>Always wash, decon, and clay before machine work.</li>
                      <li>Always test spot before committing to a full panel.</li>
                      <li>Always work most-aggressive to least-aggressive.</li>
                      <li>Never cross-contaminate pads between compound tiers.</li>
                      <li>Always inspect under a dedicated light, not ambient shop lighting.</li>
                      <li>Always IPA wipe-down before applying any protection product.</li>
                    </ul>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-center space-y-1">
                    <strong className="text-amber-400 font-mono text-xs block">Prime Auto Detail • Precision. Protection. Perfection.</strong>
                  </div>
                </div>
              </div>
            )}

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
