import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck, Download, Printer, AlertTriangle, CheckCircle2, Info, Lightbulb, Droplets, Wrench, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import { useToast } from '@/hooks/use-toast';

interface PaintProtectionGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PaintProtectionGuideModal: React.FC<PaintProtectionGuideModalProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<number>(0); // 0 = All Sections, 1-12 = Section N

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      let currentY = 15;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138); // Deep Blue
      doc.text('PRIME AUTO DETAIL', pageWidth / 2, currentY, { align: 'center' });
      currentY += 7;

      doc.setFontSize(18);
      doc.text('Paint Protection & Hydrophobicity Training Guide', pageWidth / 2, currentY, { align: 'center' });
      currentY += 6;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Employee Training • Customer Education • Professional Detailing Standards', pageWidth / 2, currentY, { align: 'center' });
      currentY += 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(185, 28, 28);
      doc.text('CORE PRINCIPLE: "Clean the surface before you judge the protection."', 14, currentY);

      doc.save('Prime_Paint_Protection_Training_Guide.pdf');
      toast({ title: 'PDF Exported', description: 'Paint Protection & Hydrophobicity Training Guide downloaded.' });
    } catch (e: any) {
      toast({ title: 'Export Failed', description: 'Could not generate PDF.', variant: 'destructive' });
    }
  };

  const sectionsList = [
    '1. Ceramic vs Sealant',
    '2. Hydrophobicity',
    '3. Hose Test',
    '4. Pressure Washer',
    '5. Customer Demo',
    '6. Diagnosing Repellency',
    '7. What Coating Does/Doesn\'t Do',
    '8. Pre-Application Steps',
    '9. Cure & Maintenance',
    '10. Water Spots',
    '11. Employee Quick Ref',
    '12. Customer Scripts'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] bg-zinc-950 border-cyan-500/30 text-white shadow-2xl rounded-2xl p-0 overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <DialogHeader className="p-4 md:p-6 bg-zinc-900/90 border-b border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/30">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg md:text-xl font-black text-white tracking-tight">
                Paint Protection & Hydrophobicity Training Guide
              </DialogTitle>
              <Badge variant="outline" className="border-cyan-500/40 text-cyan-300 bg-cyan-950/40 text-[10px] font-bold">
                14-Page Comprehensive Manual
              </Badge>
            </div>
            <DialogDescription className="text-xs text-zinc-400 mt-1">
              Employee Training • Customer Education • Professional Detailing Standards
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadPDF}
              className="h-8 text-xs bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 font-semibold"
            >
              <Download className="h-3.5 w-3.5 mr-1 text-cyan-400" /> Save PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
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
                  ? 'bg-cyan-600 text-white shadow-md' 
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
                      ? 'bg-cyan-600 text-white shadow-md' 
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
            <span className="text-cyan-400 font-bold">
              {activeSection === 0 ? 'Full 14-Page Manual' : sectionsList[activeSection - 1] || `Section ${activeSection}`}
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
                  <span className="text-xs font-black tracking-widest text-red-500 uppercase block">PRIME AUTO DETAIL</span>
                  <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">Paint Protection & Hydrophobicity Training Guide</h1>
                  <p className="text-xs text-zinc-400">Employee Training • Customer Education • Professional Detailing Standards</p>
                </div>

                <div className="bg-blue-950/40 border border-blue-500/30 p-4 rounded-xl space-y-2 text-xs">
                  <strong className="text-blue-300 font-bold block text-sm">Purpose of this guide</strong>
                  <p className="text-zinc-300 leading-relaxed">
                    This guide gives Prime Auto Detail employees a consistent, professional way to explain paint sealants, ceramic coatings, hydrophobic water behavior, water beading, water sheeting, testing methods, surface preparation, maintenance, and customer expectations.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-red-950/50 to-zinc-950 p-4 rounded-xl border border-red-500/30 text-center space-y-1">
                  <span className="text-xs font-black text-red-400 uppercase tracking-widest">CORE PRINCIPLE</span>
                  <p className="text-lg font-black text-white italic">"Clean the surface before you judge the protection."</p>
                </div>
              </div>
            )}

            {/* SECTION 1 */}
            {(activeSection === 0 || activeSection === 1) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-xl font-black text-cyan-400">1. Ceramic Coating vs. Paint Sealant</h2>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-xs font-mono">SECTION 1</Badge>
                </div>

                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2 text-xs">
                  <strong className="text-white block text-sm">Simple customer explanation:</strong>
                  <p className="text-zinc-300 leading-relaxed">
                    A paint sealant is generally a shorter-term synthetic protective layer, while a true ceramic coating is designed to create a more durable, longer-term protective surface. Both can provide gloss, slickness, water repellency, and easier maintenance.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-zinc-950 p-4 rounded-xl border border-blue-500/30 space-y-2">
                    <strong className="text-blue-400 text-sm block">Paint Sealant</strong>
                    <ul className="space-y-1 text-zinc-300 list-disc pl-4 leading-relaxed">
                      <li>Synthetic polymers/resins protective layer.</li>
                      <li>Easier to apply, provides protection for months.</li>
                      <li>Adds protective layer over paint, increases gloss & slickness.</li>
                      <li>Strong water repellency & beading.</li>
                      <li>Shorter service life than long-term ceramic coating.</li>
                    </ul>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-purple-500/30 space-y-2">
                    <strong className="text-purple-400 text-sm block">Ceramic Coating</strong>
                    <ul className="space-y-1 text-zinc-300 list-disc pl-4 leading-relaxed">
                      <li>Chemically engineered SiO2-based chemistry.</li>
                      <li>Designed for longer-term, durable protection.</li>
                      <li>Increased chemical resistance & easier routine washing.</li>
                      <li>Requires careful surface preparation & application.</li>
                      <li>Does NOT make paint scratch-proof or rock-chip-proof.</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-xs text-amber-200">
                  <strong className="text-amber-400 uppercase block mb-1">Employee Rule:</strong>
                  Do not teach customers that ceramic coatings bead water while sealants do not. A quality sealant can be highly hydrophobic. The meaningful differences include chemistry, bonding characteristics, durability, chemical resistance, application requirements, and expected service life.
                </div>
              </div>
            )}

            {/* SECTION 2 */}
            {(activeSection === 0 || activeSection === 2) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-xl font-black text-cyan-400">2. Understanding Hydrophobicity</h2>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-xs font-mono">SECTION 2</Badge>
                </div>

                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2 text-xs">
                  <strong className="text-cyan-300 text-sm block">Definition:</strong>
                  <p className="text-zinc-300 leading-relaxed">
                    <strong>Hydrophobic</strong> means water-repelling. A hydrophobic automotive surface reduces the tendency of water to spread across the surface, so water tends to form droplets and can move away more easily.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-zinc-950 p-4 rounded-xl border border-emerald-500/30 space-y-2">
                    <strong className="text-emerald-400 text-sm block">Water Beading</strong>
                    <p className="text-zinc-300 leading-relaxed">
                      Water separates into individual rounded droplets instead of forming a continuous film. Contact angle is used to quantify this behavior.
                    </p>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-blue-500/30 space-y-2">
                    <strong className="text-blue-400 text-sm block">Water Sheeting</strong>
                    <p className="text-zinc-300 leading-relaxed">
                      Water moves across a panel as a continuous layer and drains away, leaving less standing water behind during rinsing.
                    </p>
                  </div>
                </div>

                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-xs text-red-200">
                  <strong className="text-red-400 uppercase block mb-1">Most Important Warning:</strong>
                  Water beading is NOT a direct measurement of coating thickness, coating age, or remaining coating life. A maintenance topper can temporarily increase beading, while contamination can temporarily reduce it.
                </div>
              </div>
            )}

            {/* SECTION 3 & 4 */}
            {(activeSection === 0 || activeSection === 3 || activeSection === 4) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-xl font-black text-cyan-400">3 & 4. Testing Hydrophobicity (Hose vs Pressure Washer)</h2>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-xs font-mono">SECTIONS 3 & 4</Badge>
                </div>

                <div className="space-y-4 text-xs">
                  <strong className="text-white text-sm block">Step-by-step garden hose test (Best demonstration):</strong>
                  <ol className="text-zinc-300 space-y-1.5 list-decimal pl-5 leading-relaxed">
                    <li><strong>Clean the vehicle first.</strong> Do not diagnose coating performance on a dirty vehicle.</li>
                    <li>Use a gentle/full-flow hose setting. Avoid aggressive concentrated jets.</li>
                    <li>Hold hose roughly 1–2 feet from panel.</li>
                    <li>Flood the panel. Move water across the surface rather than concentrating on one spot.</li>
                    <li>Watch whether water breaks into droplets, sheets rapidly, or remains attached.</li>
                  </ol>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                    <strong className="text-amber-400 block font-bold">Pressure Washer Test Caution:</strong>
                    <p className="text-zinc-300 leading-relaxed">
                      High pressure can mechanically force water off paint regardless of coating condition. Never tell a customer <em>"The pressure washer blew the water off, so the ceramic coating is good."</em> That is not a valid conclusion.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 5 & 6 */}
            {(activeSection === 0 || activeSection === 5 || activeSection === 6) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-xl font-black text-cyan-400">5 & 6. Customer Demos & Diagnosing Reduced Repellency</h2>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-xs font-mono">SECTIONS 5 & 6</Badge>
                </div>

                <div className="space-y-3 text-xs">
                  <strong className="text-white text-sm block">What to say during a customer demo:</strong>
                  <div className="bg-zinc-950 p-4 rounded-xl border border-blue-500/30 text-blue-200 italic">
                    "Notice how the water breaks into droplets and moves more easily across this protected area. That's the hydrophobic behavior we are demonstrating. It helps make the vehicle easier to maintain, but it doesn't mean the paint is scratch-proof or that the coating never needs maintenance."
                  </div>

                  <strong className="text-white text-sm block pt-3">Diagnosing reduced beading (If customer says coating failed):</strong>
                  <ul className="text-zinc-300 space-y-1 list-disc pl-5">
                    <li><strong>Dirt / Road Film:</strong> Surface simply needs a proper wash.</li>
                    <li><strong>Mineral Deposits:</strong> Hard-water residue interfering with water release.</li>
                    <li><strong>Iron/Bonded Contamination:</strong> Requires chemical decontamination.</li>
                    <li><strong>Diagnosis Rule:</strong> Clean and decontaminate BEFORE diagnosing coating failure!</li>
                  </ul>
                </div>
              </div>
            )}

            {/* SECTION 7 & 8 */}
            {(activeSection === 0 || activeSection === 7 || activeSection === 8) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-xl font-black text-cyan-400">7 & 8. What Ceramic Coating Does vs Does NOT Do & Pre-Prep</h2>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-xs font-mono">SECTIONS 7 & 8</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-zinc-950 p-4 rounded-xl border border-emerald-500/30 space-y-2">
                    <strong className="text-emerald-400 text-sm block">What It CAN Do:</strong>
                    <ul className="space-y-1 text-zinc-300 list-disc pl-4">
                      <li>Create durable protective surface.</li>
                      <li>Increase water repellency.</li>
                      <li>Make routine washing easier.</li>
                      <li>Provide gloss & slickness.</li>
                      <li>Provide chemical resistance.</li>
                    </ul>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-red-500/30 space-y-2">
                    <strong className="text-red-400 text-sm block">What It DOES NOT Do:</strong>
                    <ul className="space-y-1 text-zinc-300 list-disc pl-4">
                      <li>Does NOT make paint scratch-proof.</li>
                      <li>Does NOT prevent rock chips or dents.</li>
                      <li>Does NOT make paint immune to every chemical.</li>
                      <li>Does NOT eliminate water spots.</li>
                      <li>Does NOT eliminate need for washing.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 9 to 12 */}
            {(activeSection === 0 || activeSection >= 9) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-xl font-black text-cyan-400">9-12. Cure Time, Water Spots, Quick Ref & Scripts</h2>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-xs font-mono">SECTIONS 9-12</Badge>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="bg-zinc-950 p-4 rounded-xl border border-amber-500/30 space-y-2">
                    <strong className="text-amber-400 text-sm block">Prime Auto Detail Rule:</strong>
                    <p className="text-zinc-300">
                      Never invent or substitute cure times, dilution ratios, or application methods. The exact product manufacturer's current instructions and Prime Auto Detail SOPs control.
                    </p>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                    <strong className="text-cyan-300 font-bold block">Water Spots Explanation:</strong>
                    <p className="text-zinc-300">
                      Hydrophobic does NOT mean water-spot-proof. Water contains minerals. When water evaporates on hot paint, minerals stay behind. Always advise customers to dry standing water.
                    </p>
                  </div>

                  <div className="bg-indigo-950/40 border border-indigo-500/30 p-4 rounded-xl text-center space-y-1">
                    <strong className="text-indigo-300 font-mono text-sm block">Prime Auto Detail • Precision. Protection. Perfection.</strong>
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
