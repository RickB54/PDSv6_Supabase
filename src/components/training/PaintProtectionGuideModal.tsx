import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck, Download, Printer, AlertTriangle, CheckCircle2, Info, Lightbulb, Droplets, Wrench, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaintProtectionGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PaintProtectionGuideModal: React.FC<PaintProtectionGuideModalProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<number>(0); // 0 = All Sections, 1-12 = Section N

  const handleDownloadPDF = () => {
    const link = document.createElement('a');
    link.href = '/sop-guides/Prime_Auto_Detail_Paint_Protection_Hydrophobicity_Training_Guide.pdf';
    link.download = 'Prime_Auto_Detail_Paint_Protection_Hydrophobicity_Training_Guide.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'PDF Downloaded', description: 'Paint Protection & Hydrophobicity Training Guide PDF downloaded successfully.' });
  };

  const sectionsList = [
    '1. Ceramic Coating vs. Paint Sealant',
    '2. Understanding Hydrophobicity',
    '3. Testing Hydrophobicity With a Garden Hose',
    '4. Testing With a Pressure Washer',
    '5. Customer Demonstration: Make the Difference Visible',
    '6. Diagnosing Reduced Water Repellency',
    '7. What Ceramic Coating Does — and Does Not — Do',
    '8. What a Detailer Should Explain Before Applying Protection',
    '9. Protection, Cure Time & Maintenance',
    '10. Water Spots & Hydrophobic Protection',
    '11. Prime Auto Detail — Employee Quick Reference',
    '12. Customer Conversation — Ready-to-Use Script'
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
                Official PDF Document
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
              onClick={() => window.open('/sop-guides/Prime_Auto_Detail_Paint_Protection_Hydrophobicity_Training_Guide.pdf', '_blank')}
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
              Full Manual (All 12 Sections)
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

          <div className="flex items-center gap-1.5 shrink-0 text-xs bg-zinc-950/80 px-2.5 py-1 rounded-md border border-zinc-800 text-zinc-300 font-semibold whitespace-nowrap self-end sm:self-center">
            <span className="text-zinc-500 font-medium">Viewing:</span>
            <span className="text-cyan-400 font-bold">
              {activeSection === 0 ? 'Full Guide (12 Sections)' : `Sec ${activeSection}: ${sectionsList[activeSection - 1]}`}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <ScrollArea className="flex-1 p-4 md:p-8 bg-zinc-950">
          <div className="max-w-4xl mx-auto space-y-8 text-zinc-300 text-sm leading-relaxed pb-12">
            
            {/* Banner & Core Principle */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 text-center space-y-3">
              <h1 className="text-2xl font-black text-white tracking-tight">PRIME AUTO DETAIL</h1>
              <h2 className="text-xl font-bold text-cyan-400">Paint Protection & Hydrophobicity Training Guide</h2>
              <p className="text-xs text-zinc-400">Employee Training • Customer Education • Professional Detailing Standards</p>
              
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-400 text-left space-y-1">
                <strong className="text-zinc-200 block">Purpose of this guide:</strong>
                <p>This guide gives Prime Auto Detail employees a consistent, professional way to explain paint sealants, ceramic coatings, hydrophobic water behavior, water beading, water sheeting, testing methods, surface preparation, maintenance, and customer expectations.</p>
              </div>

              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mt-2">
                <p className="text-red-400 font-bold text-xs uppercase tracking-wider mb-1">Core Principle</p>
                <p className="text-red-300 font-bold text-base italic">
                  "Clean the surface before you judge the protection."
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">Origination: Generated by Claude (Anthropic) for Prime Auto Detail, September 19, 2026</p>
              </div>
            </div>

            {/* SECTION 1 */}
            {(activeSection === 0 || activeSection === 1) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-xl font-black text-cyan-400">1. Ceramic Coating vs. Paint Sealant</h2>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-xs font-mono">SECTION 1</Badge>
                </div>

                <div className="space-y-3 text-xs">
                  <strong className="text-white text-sm block">Simple customer explanation</strong>
                  <p className="text-zinc-300 leading-relaxed">
                    A paint sealant is generally a shorter-term synthetic protective layer, while a true ceramic coating is designed to create a more durable, longer-term protective surface. Both can provide gloss, slickness, water repellency, and easier maintenance.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-zinc-950 p-4 rounded-xl border border-blue-500/30 space-y-2">
                    <strong className="text-blue-400 text-sm block">Paint Sealant</strong>
                    <p className="text-zinc-400 text-[11px]">
                      A traditional synthetic paint sealant uses polymers/resins to create a protective layer over the paint. Sealants are generally easier to apply and are commonly intended to provide protection for months.
                    </p>
                    <ul className="space-y-1 text-zinc-300 list-disc pl-4 leading-relaxed pt-1">
                      <li>Adds a protective layer over the paint.</li>
                      <li>Can increase gloss and slickness.</li>
                      <li>Can provide strong water repellency and beading.</li>
                      <li>Generally has a shorter service life than a true long-term ceramic coating.</li>
                      <li>Usually has less demanding application requirements.</li>
                    </ul>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-purple-500/30 space-y-2">
                    <strong className="text-purple-400 text-sm block">Ceramic Coating</strong>
                    <p className="text-zinc-400 text-[11px]">
                      A true ceramic coating is a chemically engineered coating designed to form a more durable protective layer on a properly prepared surface using SiO2-based chemistry.
                    </p>
                    <ul className="space-y-1 text-zinc-300 list-disc pl-4 leading-relaxed pt-1">
                      <li>Designed for longer-term protection.</li>
                      <li>Can provide strong hydrophobic behavior.</li>
                      <li>Can provide increased chemical resistance.</li>
                      <li>Can make routine washing and maintenance easier.</li>
                      <li>Requires careful surface preparation and correct application.</li>
                      <li>Does not make paint scratch-proof, rock-chip-proof, or dent-proof.</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-xs text-amber-200">
                  <strong className="text-amber-400 uppercase block mb-1">Employee rule:</strong>
                  Do not teach customers that ceramic coatings bead water while sealants do not. A quality sealant can be highly hydrophobic. The meaningful differences include chemistry, bonding characteristics, durability, chemical resistance, application requirements, and expected service life.
                </div>

                <div className="overflow-x-auto rounded-xl border border-zinc-800">
                  <table className="w-full text-xs text-left text-zinc-300">
                    <thead className="bg-zinc-950 text-cyan-400 font-bold border-b border-zinc-800">
                      <tr>
                        <th className="p-2.5">Characteristic</th>
                        <th className="p-2.5">Paint Sealant</th>
                        <th className="p-2.5">Ceramic Coating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/50">
                      <tr><td className="p-2 font-semibold text-white">Protection</td><td className="p-2">Yes</td><td className="p-2">Yes</td></tr>
                      <tr><td className="p-2 font-semibold text-white">Gloss / slickness</td><td className="p-2">Usually</td><td className="p-2">Usually</td></tr>
                      <tr><td className="p-2 font-semibold text-white">Water repellency</td><td className="p-2">Yes</td><td className="p-2">Yes</td></tr>
                      <tr><td className="p-2 font-semibold text-white">Typical durability</td><td className="p-2">Generally months</td><td className="p-2">Generally longer-term</td></tr>
                      <tr><td className="p-2 font-semibold text-white">Chemical resistance</td><td className="p-2">Good</td><td className="p-2">Generally higher</td></tr>
                      <tr><td className="p-2 font-semibold text-white">Surface preparation</td><td className="p-2">Important</td><td className="p-2">Very important</td></tr>
                      <tr><td className="p-2 font-semibold text-white">Scratch-proof</td><td className="p-2 text-red-400 font-bold">No</td><td className="p-2 text-red-400 font-bold">No</td></tr>
                      <tr><td className="p-2 font-semibold text-white">Rock-chip protection</td><td className="p-2 text-red-400 font-bold">No</td><td className="p-2 text-red-400 font-bold">No</td></tr>
                      <tr><td className="p-2 font-semibold text-white">Maintenance required</td><td className="p-2">Yes</td><td className="p-2">Yes</td></tr>
                    </tbody>
                  </table>
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

                <div className="space-y-2 text-xs">
                  <strong className="text-white text-sm block">What you may see on the vehicle:</strong>
                  <ul className="text-zinc-300 space-y-1.5 list-disc pl-5 leading-relaxed">
                    <li><strong>Hydrophobic surface:</strong> water forms individual droplets, often with a rounded appearance, and may move or roll away readily.</li>
                    <li><strong>Less hydrophobic surface:</strong> water spreads more readily, forms flatter droplets, or remains attached to the panel.</li>
                    <li><strong>Important:</strong> water behavior is affected by cleanliness, contamination, product chemistry, temperature, surface angle, water quality, and previous maintenance products.</li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-zinc-950 p-4 rounded-xl border border-emerald-500/30 space-y-2">
                    <strong className="text-emerald-400 text-sm block">Water Beading</strong>
                    <p className="text-zinc-300 leading-relaxed">
                      Water beading occurs when water separates into individual droplets instead of forming a continuous film. A rounded droplet generally indicates lower wetting of the surface. Contact angle is one scientific method used to quantify this behavior.
                    </p>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-blue-500/30 space-y-2">
                    <strong className="text-blue-400 text-sm block">Water Sheeting</strong>
                    <p className="text-zinc-300 leading-relaxed">
                      Water sheeting occurs when water moves across a panel as a relatively continuous layer and then drains away. Sheeting can be particularly useful during rinsing because it may leave less standing water behind.
                    </p>
                  </div>
                </div>

                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-1 text-xs">
                  <strong className="text-amber-400 block font-bold">Beading and sheeting are different:</strong>
                  <p className="text-zinc-300 leading-relaxed">
                    A surface can show excellent beading without being the fastest sheeting surface. Likewise, a surface can sheet water very effectively without producing dramatic round beads. Neither behavior by itself proves how much coating remains.
                  </p>
                </div>

                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-xs text-red-200">
                  <strong className="text-red-400 uppercase block mb-1">The most important warning:</strong>
                  Water beading is not a direct measurement of coating thickness, coating age, or remaining coating life. A maintenance product can temporarily increase water repellency, while contamination can temporarily reduce it.
                </div>
              </div>
            )}

            {/* SECTION 3 */}
            {(activeSection === 0 || activeSection === 3) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-xl font-black text-cyan-400">3. Testing Hydrophobicity With a Garden Hose</h2>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-xs font-mono">SECTION 3</Badge>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  A normal garden hose is an excellent simple demonstration for employees and customers because it allows the observer to see the water behavior without relying on a high-pressure stream.
                </p>

                <div className="space-y-3 text-xs">
                  <strong className="text-white text-sm block">Step-by-step hose test:</strong>
                  <ol className="text-zinc-300 space-y-1.5 list-decimal pl-5 leading-relaxed">
                    <li><strong>Clean the vehicle.</strong> Do not diagnose coating performance on a dirty vehicle. Wash the surface and remove obvious contamination first.</li>
                    <li><strong>Use a gentle/full-flow hose setting.</strong> Avoid an aggressive concentrated jet.</li>
                    <li><strong>Hold the hose roughly 1–2 feet from the panel.</strong> The exact distance is not a laboratory standard; the objective is to create a consistent visual test.</li>
                    <li><strong>Flood the panel.</strong> Move the water across the surface rather than concentrating on one small area.</li>
                    <li><strong>Watch the water.</strong> Observe whether it spreads into a film, breaks into droplets, moves rapidly, or remains attached.</li>
                    <li><strong>Compare sections.</strong> If appropriate, compare the hood, roof, doors, or a known protected/unprotected section.</li>
                  </ol>
                </div>

                <div className="space-y-2 text-xs">
                  <strong className="text-white text-sm block">What employees should observe:</strong>
                  <div className="overflow-x-auto rounded-xl border border-zinc-800">
                    <table className="w-full text-xs text-left text-zinc-300">
                      <thead className="bg-zinc-950 text-cyan-400 font-bold border-b border-zinc-800">
                        <tr>
                          <th className="p-2.5">Observation</th>
                          <th className="p-2.5">What it may indicate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/50">
                        <tr><td className="p-2 font-semibold text-white">Water immediately forms many rounded droplets</td><td className="p-2 text-emerald-400 font-semibold">Strong water-repellent behavior</td></tr>
                        <tr><td className="p-2 font-semibold text-white">Some droplets form but water also remains on the panel</td><td className="p-2 text-amber-400 font-semibold">Moderate water repellency or mixed surface conditions</td></tr>
                        <tr><td className="p-2 font-semibold text-white">Water spreads broadly and remains as a film</td><td className="p-2 text-red-400 font-semibold">Lower visible water repellency, contamination, or reduced surface performance</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-cyan-950/60 border border-cyan-500/30 p-4 rounded-xl text-xs text-cyan-200 italic text-center">
                  "The water behavior is an indicator of how the surface is performing right now. It is not, by itself, a precise measurement of how much coating remains."
                </div>
              </div>
            )}

            {/* SECTION 4 */}
            {(activeSection === 0 || activeSection === 4) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-xl font-black text-cyan-400">4. Testing With a Pressure Washer</h2>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-xs font-mono">SECTION 4</Badge>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  A pressure washer can demonstrate water behavior, but it must be used carefully. High pressure can mechanically force water away from a surface, so pressure alone is not a reliable measure of hydrophobicity.
                </p>

                <div className="space-y-3 text-xs">
                  <strong className="text-white text-sm block">Recommended pressure-washer procedure:</strong>
                  <ul className="text-zinc-300 space-y-1.5 list-disc pl-5 leading-relaxed">
                    <li><strong>Start with a clean surface.</strong> Wash the vehicle first.</li>
                    <li><strong>Use a wide spray pattern.</strong> Avoid a concentrated zero-degree/pencil jet on automotive paint.</li>
                    <li><strong>Keep the nozzle moving.</strong> Do not hold a concentrated stream stationary on the paint.</li>
                    <li><strong>Maintain a safe working distance.</strong> Follow the pressure washer and nozzle manufacturer's guidance.</li>
                    <li><strong>Observe the area behind the stream.</strong> Look for droplet formation, water movement, and sheeting.</li>
                    <li><strong>Compare panels or sections.</strong> Differences can reveal contamination, uneven product performance, or other surface-condition differences.</li>
                  </ul>
                </div>

                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-xs text-red-200 space-y-1">
                  <strong className="text-red-400 uppercase block font-bold">Never use this as the test:</strong>
                  <p className="italic">"The pressure washer blew the water off, so the ceramic coating is good."</p>
                  <p className="text-zinc-300 pt-1">This is not a valid conclusion. Pressure can remove water from many smooth surfaces regardless of their coating condition.</p>
                </div>

                <div className="space-y-2 text-xs">
                  <strong className="text-white text-sm block">What a pressure-washer test is useful for:</strong>
                  <ul className="text-zinc-300 space-y-1 list-disc pl-5">
                    <li>Demonstrating water movement to a customer.</li>
                    <li>Comparing different areas of the same vehicle.</li>
                    <li>Observing sheeting and water release after washing.</li>
                    <li>Identifying areas that behave differently and may need further inspection.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* SECTION 5 */}
            {(activeSection === 0 || activeSection === 5) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-xl font-black text-cyan-400">5. Customer Demonstration: Make the Difference Visible</h2>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-xs font-mono">SECTION 5</Badge>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  For customer education, a visual demonstration is often more effective than a technical explanation.
                </p>

                <div className="space-y-2 text-xs">
                  <strong className="text-cyan-300 text-sm block">Simple two-section demonstration:</strong>
                  <ul className="text-zinc-300 space-y-1 list-disc pl-5 leading-relaxed">
                    <li>Choose two clean areas of paint.</li>
                    <li>Use a protected area and an appropriate control/unprotected area when available.</li>
                    <li>Gently flood both areas with water.</li>
                    <li>Let the customer watch how the water behaves.</li>
                    <li>Explain that the visible difference demonstrates surface water behavior, not a measurement of coating thickness.</li>
                  </ul>
                </div>

                <div className="space-y-2 text-xs">
                  <strong className="text-cyan-300 text-sm block">Optional split-panel training demonstration:</strong>
                  <p className="text-zinc-300 leading-relaxed">
                    For employee training, a hood can be divided into sections with painter's tape. Different protection systems can be placed on different sections, following each product's instructions. After curing as required, rinse the hood consistently and observe the differences.
                  </p>
                </div>

                <div className="bg-blue-950/60 border border-blue-500/30 p-4 rounded-xl text-xs text-blue-200 italic text-center">
                  "Notice how the water breaks into droplets and moves more easily across this protected area. That's the hydrophobic behavior we are demonstrating. It helps make the vehicle easier to maintain, but it doesn't mean the paint is scratch-proof or that the coating never needs maintenance."
                </div>

                <div className="bg-zinc-950 p-4 rounded-xl border border-amber-500/30 space-y-2 text-xs">
                  <strong className="text-amber-400 uppercase block font-bold">Avoid exaggerated claims:</strong>
                  <ul className="text-zinc-300 space-y-1 list-disc pl-5">
                    <li>Do not say the vehicle will never get dirty.</li>
                    <li>Do not say water can never create spots.</li>
                    <li>Do not say the coating is scratch-proof.</li>
                    <li>Do not promise a specific lifespan unless the exact product and its warranty/conditions support that statement.</li>
                    <li>Do not claim that beading alone proves a coating is still fully intact.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* SECTION 6 */}
            {(activeSection === 0 || activeSection === 6) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-xl font-black text-cyan-400">6. Diagnosing Reduced Water Repellency</h2>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-xs font-mono">SECTION 6</Badge>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  If a customer says, "My coating isn't beading like it used to," employees should investigate before declaring the coating failed.
                </p>

                <div className="space-y-2 text-xs">
                  <strong className="text-white text-sm block">Possible causes:</strong>
                  <ul className="text-zinc-300 space-y-1.5 list-disc pl-5 leading-relaxed">
                    <li><strong>Dirt:</strong> The surface may simply need a proper wash.</li>
                    <li><strong>Road film:</strong> Traffic contamination can alter surface behavior.</li>
                    <li><strong>Mineral deposits:</strong> Hard-water residue can interfere with water behavior.</li>
                    <li><strong>Iron or bonded contamination:</strong> Embedded contamination can change how the surface behaves.</li>
                    <li><strong>Oils/grease:</strong> Surface residue can alter wetting behavior.</li>
                    <li><strong>Improper washing:</strong> Some washing products or techniques can temporarily change the surface.</li>
                    <li><strong>Maintenance products:</strong> A topper can increase hydrophobic behavior, making beading alone misleading.</li>
                    <li><strong>Actual coating degradation:</strong> Protection can eventually lose performance.</li>
                  </ul>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-xs text-amber-200">
                  <strong className="text-amber-400 uppercase block font-bold mb-1">Diagnosis rule:</strong>
                  Clean and decontaminate before diagnosing coating condition. Reduced beading does not automatically mean the coating is gone.
                </div>

                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2 text-xs">
                  <strong className="text-cyan-300 font-bold block">A useful inspection sequence:</strong>
                  <p className="text-zinc-300 font-mono text-[11px] leading-relaxed">
                    Inspect → Wash → Rinse → Reassess water behavior → Decontaminate if appropriate → Reassess → Document condition → Recommend the appropriate next step.
                  </p>
                  <p className="text-zinc-400 text-[11px] pt-1">
                    If the exact product is known, consult its manufacturer instructions for approved maintenance and testing methods.
                  </p>
                </div>
              </div>
            )}

            {/* SECTION 7 */}
            {(activeSection === 0 || activeSection === 7) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-xl font-black text-cyan-400">7. What Ceramic Coating Does — and Does Not — Do</h2>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-xs font-mono">SECTION 7</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-zinc-950 p-4 rounded-xl border border-emerald-500/30 space-y-2">
                    <strong className="text-emerald-400 text-sm block">What it CAN do:</strong>
                    <ul className="space-y-1 text-zinc-300 list-disc pl-4 leading-relaxed">
                      <li>Create a durable protective surface.</li>
                      <li>Increase water repellency.</li>
                      <li>Make routine washing easier.</li>
                      <li>Provide gloss and slickness.</li>
                      <li>Provide chemical resistance appropriate to the product.</li>
                      <li>Reduce the effort required to maintain the paint.</li>
                    </ul>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-red-500/30 space-y-2">
                    <strong className="text-red-400 text-sm block">What it does NOT do:</strong>
                    <ul className="space-y-1 text-zinc-300 list-disc pl-4 leading-relaxed">
                      <li>It does not make paint scratch-proof.</li>
                      <li>It does not prevent rock chips.</li>
                      <li>It does not prevent dents or door dings.</li>
                      <li>It does not make paint immune to every chemical.</li>
                      <li>It does not eliminate water spots.</li>
                      <li>It does not eliminate the need for washing.</li>
                      <li>It does not guarantee that contamination will never stick.</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-purple-950/60 border border-purple-500/30 p-4 rounded-xl text-xs text-purple-200 italic text-center">
                  "Ceramic coating is a paint-protection and maintenance system, not armor. Its purpose is to provide a durable protective surface and make the vehicle easier to maintain."
                </div>
              </div>
            )}

            {/* SECTION 8 */}
            {(activeSection === 0 || activeSection === 8) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-xl font-black text-cyan-400">8. What a Detailer Should Explain Before Applying Protection</h2>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-xs font-mono">SECTION 8</Badge>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  Professional detailing is more than applying the final protection product. The condition and preparation of the paint have a major effect on the finished result.
                </p>

                <div className="space-y-3 text-xs">
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                    <strong className="text-cyan-300 text-sm block">A. Inspect the vehicle</strong>
                    <ul className="text-zinc-300 space-y-1 list-disc pl-5">
                      <li>Existing scratches and swirls.</li>
                      <li>Oxidation or clear-coat problems.</li>
                      <li>Water spots and etching.</li>
                      <li>Previous repairs or repainted areas.</li>
                      <li>Embedded contamination.</li>
                      <li>Existing waxes, sealants, or coatings.</li>
                      <li>Overall paint condition and customer expectations.</li>
                    </ul>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-1">
                    <strong className="text-cyan-300 text-sm block">B. Wash</strong>
                    <p className="text-zinc-300">Remove loose dirt, road grime, mud, and other surface contamination.</p>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-1">
                    <strong className="text-cyan-300 text-sm block">C. Decontaminate</strong>
                    <p className="text-zinc-300">When required, chemical and/or mechanical decontamination can remove bonded contamination that normal washing does not remove.</p>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-1">
                    <strong className="text-cyan-300 text-sm block">D. Paint correction when appropriate</strong>
                    <p className="text-zinc-300">If the customer wants maximum visual improvement beneath the protection, paint correction should be considered before the final protective product. Do not use a coating to hide defects that should have been corrected first.</p>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-1">
                    <strong className="text-cyan-300 text-sm block">E. Panel preparation</strong>
                    <p className="text-zinc-300">The final surface must be prepared according to the protection product's instructions. Oils, residue, contamination, or incompatible products can interfere with performance.</p>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-xs text-amber-300 italic text-center font-bold">
                  Core detailing principle: "The protection is only as good as the surface it is being applied to."
                </div>
              </div>
            )}

            {/* SECTION 9 */}
            {(activeSection === 0 || activeSection === 9) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-xl font-black text-cyan-400">9. Protection, Cure Time & Maintenance</h2>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-xs font-mono">SECTION 9</Badge>
                </div>

                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2 text-xs">
                  <strong className="text-white text-sm block">Protection should be the final major paint step:</strong>
                  <p className="text-cyan-300 font-mono text-[11px] leading-relaxed">
                    A simplified workflow is: Inspect → Wash → Decontaminate → Correct if needed → Polish/refine → Panel prep → Apply protection → Cure → Final inspection
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <strong className="text-white text-sm block">Cure requirements:</strong>
                  <p className="text-zinc-300 leading-relaxed">
                    Different coatings and protection products have different application and curing requirements. Employees must use the exact instructions for the product being installed.
                  </p>
                  <ul className="text-zinc-300 space-y-1 list-disc pl-5">
                    <li>Rain/water exposure requirements.</li>
                    <li>Temperature and humidity requirements.</li>
                    <li>Storage/garage requirements.</li>
                    <li>When the vehicle may be washed.</li>
                    <li>When the surface may be touched or wiped.</li>
                    <li>Approved maintenance products.</li>
                  </ul>
                </div>

                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-xs text-red-200">
                  <strong className="text-red-400 uppercase block font-bold mb-1">Prime Auto Detail rule:</strong>
                  Never invent or substitute cure times, dilution ratios, or application methods. The exact product manufacturer's current instructions and the Prime Auto Detail SOPs control.
                </div>

                <div className="space-y-2 text-xs">
                  <strong className="text-white text-sm block">Maintenance:</strong>
                  <p className="text-zinc-300 leading-relaxed">
                    A ceramic coating is not a "pay once and never maintain it" system. The coating is intended to make maintenance easier, not unnecessary.
                  </p>
                  <ul className="text-zinc-300 space-y-1 list-disc pl-5">
                    <li>Wash the vehicle appropriately.</li>
                    <li>Avoid aggressive automatic brushes where possible.</li>
                    <li>Remove bird droppings promptly.</li>
                    <li>Remove bug contamination promptly.</li>
                    <li>Address tree sap and other contamination.</li>
                    <li>Follow the coating manufacturer's maintenance recommendations.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* SECTION 10 */}
            {(activeSection === 0 || activeSection === 10) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-xl font-black text-cyan-400">10. Water Spots & Hydrophobic Protection</h2>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-xs font-mono">SECTION 10</Badge>
                </div>

                <p className="text-xs text-zinc-400 italic">
                  This topic should always be included when discussing water repellency with customers.
                </p>

                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2 text-xs">
                  <strong className="text-cyan-300 text-sm block">Hydrophobic does not mean water-spot-proof:</strong>
                  <p className="text-zinc-300 leading-relaxed">
                    Water contains minerals. When water evaporates, minerals can remain behind. Repeated drying on a hot surface can make deposits increasingly difficult to remove.
                  </p>
                </div>

                <div className="bg-cyan-950/60 border border-cyan-500/30 p-4 rounded-xl text-xs text-cyan-200 italic text-center">
                  "The coating helps water release from the surface, but water should still be removed appropriately. If mineral-rich water is allowed to dry repeatedly on the vehicle, deposits can form."
                </div>

                <div className="space-y-2 text-xs">
                  <strong className="text-white text-sm block">When a vehicle has water spots:</strong>
                  <ul className="text-zinc-300 space-y-1.5 list-disc pl-5 leading-relaxed">
                    <li>Inspect the severity before choosing a treatment.</li>
                    <li>Determine whether the issue is surface residue or actual etching.</li>
                    <li>Use the appropriate approved process for the condition.</li>
                    <li>Do not assume that a ceramic coating prevents all mineral deposits.</li>
                    <li>Do not use an aggressive chemical or correction process without confirming that it is appropriate for the surface and product.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* SECTION 11 */}
            {(activeSection === 0 || activeSection === 11) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-xl font-black text-cyan-400">11. Prime Auto Detail — Employee Quick Reference</h2>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-xs font-mono">SECTION 11</Badge>
                </div>

                <div className="space-y-2 text-xs">
                  <strong className="text-amber-400 text-sm block">Key Operational Rules:</strong>
                  <ul className="text-zinc-300 space-y-2 list-none">
                    <li className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                      <strong className="text-cyan-400 font-bold">RULE 1 — CLEAN BEFORE YOU JUDGE:</strong> Do not diagnose coating performance on a dirty or contaminated vehicle.
                    </li>
                    <li className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                      <strong className="text-cyan-400 font-bold">RULE 2 — BEADING DOES NOT EQUAL COATING LIFE:</strong> Water behavior is an indicator of current surface performance, not a precise measurement of remaining coating.
                    </li>
                    <li className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                      <strong className="text-cyan-400 font-bold">RULE 3 — HYDROPHOBIC DOES NOT MEAN SCRATCH-PROOF:</strong> Ceramic coating is not the same thing as paint-protection film.
                    </li>
                    <li className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                      <strong className="text-cyan-400 font-bold">RULE 4 — PROTECTION DOES NOT ELIMINATE MAINTENANCE:</strong> The purpose is to make maintenance easier and provide protection.
                    </li>
                    <li className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                      <strong className="text-cyan-400 font-bold">RULE 5 — PRODUCT INSTRUCTIONS ALWAYS WIN:</strong> Never substitute another product's ratio, cure time, application method, or maintenance instructions.
                    </li>
                  </ul>
                </div>

                <div className="space-y-2 text-xs">
                  <strong className="text-white text-sm block">Five terms every employee should understand:</strong>
                  <div className="overflow-x-auto rounded-xl border border-zinc-800">
                    <table className="w-full text-xs text-left text-zinc-300">
                      <thead className="bg-zinc-950 text-cyan-400 font-bold border-b border-zinc-800">
                        <tr>
                          <th className="p-2.5">Term</th>
                          <th className="p-2.5">Meaning</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/50">
                        <tr><td className="p-2 font-bold text-white">Hydrophobic</td><td className="p-2">Water-repelling behavior; water tends to form droplets and release more readily.</td></tr>
                        <tr><td className="p-2 font-bold text-white">Beading</td><td className="p-2">Water separates into individual droplets on the surface.</td></tr>
                        <tr><td className="p-2 font-bold text-white">Sheeting</td><td className="p-2">Water moves across the surface as a relatively continuous layer and drains away.</td></tr>
                        <tr><td className="p-2 font-bold text-white">Sealant</td><td className="p-2">A protective synthetic film generally intended for shorter-term paint protection.</td></tr>
                        <tr><td className="p-2 font-bold text-white">Ceramic coating</td><td className="p-2">A durable coating system designed to protect a properly prepared surface for a longer period than typical sealants.</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 12 */}
            {(activeSection === 0 || activeSection === 12) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-xl font-black text-cyan-400">12. Customer Conversation — Ready-to-Use Script</h2>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-xs font-mono">SECTION 12</Badge>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                    <strong className="text-cyan-300 text-sm block">Ceramic coating vs. sealant:</strong>
                    <p className="text-zinc-200 italic leading-relaxed">
                      "Both a paint sealant and ceramic coating can protect your paint and provide water-repelling behavior. The main difference is the type of protective layer, durability, chemical resistance, and application process. A ceramic coating is designed as a longer-term protection system, while a sealant is generally a shorter-term option."
                    </p>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                    <strong className="text-cyan-300 text-sm block">Hydrophobicity:</strong>
                    <p className="text-zinc-200 italic leading-relaxed">
                      "Hydrophobic simply means the surface repels water. Instead of water spreading across the paint, it tends to form droplets and move away more easily. That can make the vehicle easier to wash and maintain."
                    </p>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                    <strong className="text-cyan-300 text-sm block">Water-beading demonstration:</strong>
                    <p className="text-zinc-200 italic leading-relaxed">
                      "We're going to rinse the surface and watch how the water behaves. The beading or sheeting shows us the surface's current water-repelling behavior. It is not a precise measurement of how much coating remains."
                    </p>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                    <strong className="text-cyan-300 text-sm block">Managing expectations:</strong>
                    <p className="text-zinc-200 italic leading-relaxed">
                      "Ceramic coating is not scratch-proof and it doesn't make the vehicle maintenance-free. It is designed to provide durable surface protection and make routine maintenance easier."
                    </p>
                  </div>

                  <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-xs text-amber-200">
                    <strong className="text-amber-400 uppercase block font-bold mb-1">TRAINING NOTE:</strong>
                    Employees should use clear, accurate language and avoid promising performance that the specific product or manufacturer's documentation does not support.
                  </div>
                </div>
              </div>
            )}

            {/* Footer Tagline */}
            <div className="text-center pt-6 border-t border-zinc-800 text-xs text-zinc-500 space-y-1">
              <p className="font-semibold text-zinc-400">Prime Auto Detail • Precision. Protection. Perfection. | September 19, 2026</p>
              <p className="text-[10px]">Origination: Generated by Claude (Anthropic) for Prime Auto Detail</p>
            </div>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
