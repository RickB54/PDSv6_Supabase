import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wrench, Download, Printer, AlertTriangle, CheckCircle2, Info, Lightbulb, Sparkles, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import { useToast } from '@/hooks/use-toast';

interface HeadlightRestorationGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HeadlightRestorationGuideModal: React.FC<HeadlightRestorationGuideModalProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<number>(0);

  const handleDownloadPDF = () => {
    const link = document.createElement('a');
    link.href = '/sop-guides/Prime_Auto_Detail_Headlight_Restoration_Employee_Training_Guide.pdf';
    link.download = 'Prime_Auto_Detail_Headlight_Restoration_Employee_Training_Guide.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'PDF Downloaded', description: 'Headlight Restoration Employee Training Guide PDF downloaded successfully.' });
  };

  const sectionsList = [
    '1. Why Headlights Oxidize',
    '2. Assessing Condition',
    '3. Tools & Materials',
    '4. Step-by-Step Process',
    '5. Scenario Guidance',
    '6. Common Mistakes',
    '7. Customer Expectations & Script'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] bg-zinc-950 border-amber-500/30 text-white shadow-2xl rounded-2xl p-0 overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <DialogHeader className="p-4 md:p-6 bg-zinc-900/90 border-b border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
                <Wrench className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg md:text-xl font-black text-white tracking-tight">
                Headlight Restoration Employee Training Guide
              </DialogTitle>
              <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-950/40 text-[10px] font-bold">
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
              <Download className="h-3.5 w-3.5 mr-1 text-amber-400" /> Save PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open('/sop-guides/Prime_Auto_Detail_Headlight_Restoration_Employee_Training_Guide.pdf', '_blank')}
              className="h-8 text-xs bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 font-semibold"
            >
              <Printer className="h-3.5 w-3.5 mr-1 text-purple-400" /> Print
            </Button>
          </div>
        </DialogHeader>

        {/* Section Navigation Tabs */}
        <div className="bg-zinc-900/70 border-b border-zinc-800 px-3 py-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
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

          <div className="flex items-center gap-1.5 shrink-0 text-xs bg-zinc-950/80 px-2.5 py-1 rounded-md border border-zinc-800 text-zinc-300 font-semibold whitespace-nowrap self-end sm:self-center">
            <span className="text-zinc-500 font-medium">Viewing:</span>
            <span className="text-amber-400 font-bold">
              {activeSection === 0 ? 'Full Guide' : sectionsList[activeSection - 1] || `Section ${activeSection}`}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <ScrollArea className="flex-1 p-4 md:p-8 bg-zinc-950">
          <div className="max-w-4xl mx-auto space-y-8 text-zinc-300 text-sm leading-relaxed pb-12">
            
            {/* Banner & Core Principle */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 text-center space-y-3">
              <h1 className="text-2xl font-black text-white tracking-tight">PRIME AUTO DETAIL</h1>
              <h2 className="text-xl font-bold text-amber-400">Headlight Restoration Employee Training Guide</h2>
              <p className="text-xs text-zinc-400">Employee Training • Customer Education • Professional Detailing Standards</p>
              
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mt-4">
                <p className="text-amber-300 font-bold text-base italic">
                  "Restoration renews the surface. It doesn't fix what's happening inside the housing."
                </p>
                <p className="text-[11px] text-amber-400/80 mt-1">Origination: Generated by Claude (Anthropic) for Prime Auto Detail, September 17, 2026</p>
              </div>
            </div>

            {/* 1. Why Headlights Oxidize */}
            {(activeSection === 0 || activeSection === 1) && (
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-6 space-y-3">
                <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                  <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded font-black">1</span>
                  Why Headlights Oxidize
                </h3>
                <p className="text-zinc-300">
                  Most modern headlight lenses are polycarbonate plastic with a factory UV-protective clear coat. Over time, sun exposure breaks down that clear coat, allowing the polycarbonate underneath to oxidize — causing the hazy, yellowed appearance customers ask about.
                </p>
              </div>
            )}

            {/* 2. Assessing Headlight Condition */}
            {(activeSection === 0 || activeSection === 2) && (
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                  <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded font-black">2</span>
                  Assessing Headlight Condition
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-zinc-800 text-xs">
                    <thead>
                      <tr className="bg-amber-950/40 text-amber-300 border-b border-zinc-800">
                        <th className="p-3 border-r border-zinc-800">Condition</th>
                        <th className="p-3">Restoration Candidate?</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      <tr>
                        <td className="p-3 border-r border-zinc-800 font-semibold text-zinc-200">Light surface haze</td>
                        <td className="p-3 text-emerald-400 font-medium">Yes — often polish-only, no sanding needed</td>
                      </tr>
                      <tr>
                        <td className="p-3 border-r border-zinc-800 font-semibold text-zinc-200">Moderate-to-deep yellowing</td>
                        <td className="p-3 text-emerald-400 font-medium">Yes — full wet-sand progression needed</td>
                      </tr>
                      <tr>
                        <td className="p-3 border-r border-zinc-800 font-semibold text-zinc-200">Cracked lens</td>
                        <td className="p-3 text-rose-400 font-medium">No — restoration won't fix structural damage; recommend replacement</td>
                      </tr>
                      <tr>
                        <td className="p-3 border-r border-zinc-800 font-semibold text-zinc-200">Foggy/moisture inside the housing</td>
                        <td className="p-3 text-rose-400 font-medium">No — indicates a seal failure; polishing the outside won't help; recommend replacement or seal repair</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-rose-950/30 border border-rose-500/30 rounded-lg p-3 text-xs text-rose-200 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-rose-400">Employee rule:</strong> Always assess before quoting. Selling restoration on a lens that's cracked or fogged internally sets the customer up for disappointment and reflects badly on the shop.
                  </div>
                </div>
              </div>
            )}

            {/* 3. Tools & Materials */}
            {(activeSection === 0 || activeSection === 3) && (
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-6 space-y-3">
                <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                  <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded font-black">3</span>
                  Tools & Materials
                </h3>
                <ul className="space-y-2 text-zinc-300 list-disc pl-5">
                  <li><strong>Progressive wet-sand grits:</strong> Example progression: coarse → medium → fine, commonly in the 800–3000 range.</li>
                  <li><strong>Buffing/polishing compound:</strong> For post-sand optical clarity.</li>
                  <li><strong>UV-protective sealant or coating:</strong> This step is NOT optional; skipping it means oxidation returns within weeks.</li>
                  <li><strong>Painter's tape/masking:</strong> To protect surrounding paint and trim from sanding debris and compound.</li>
                </ul>
              </div>
            )}

            {/* 4. Step-by-Step Restoration Process */}
            {(activeSection === 0 || activeSection === 4) && (
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-6 space-y-3">
                <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                  <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded font-black">4</span>
                  Step-by-Step Restoration Process
                </h3>
                <ol className="space-y-2 text-zinc-300 list-decimal pl-5">
                  <li><strong>Mask off surrounding area:</strong> Mask off all surrounding paint, trim, and badges to protect adjacent paint.</li>
                  <li><strong>Progressive wet sanding:</strong> Wet sand progressively through each grit, coarsest to finest, keeping surface wet throughout.</li>
                  <li><strong>Compound & Polish:</strong> Compound and polish the lens to restore maximum clarity.</li>
                  <li><strong>Clean & Dry:</strong> Clean and fully dry the lens.</li>
                  <li><strong>Apply UV Coating:</strong> Apply UV-protective coating per product's exact cure instructions.</li>
                </ol>
              </div>
            )}

            {/* 5. Scenario Guidance & 6. Common Mistakes */}
            {(activeSection === 0 || activeSection === 5 || activeSection === 6) && (
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                  <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded font-black">5 & 6</span>
                  Scenario Guidance & Common Mistakes
                </h3>
                <ul className="space-y-2 text-zinc-300 list-disc pl-5">
                  <li><strong>Mild Haze Only:</strong> May not need full sanding progression — polish-only pass can work.</li>
                  <li><strong>Deep Yellowing:</strong> Requires full grit progression; never skip early grits.</li>
                  <li><strong>Mistake to Avoid:</strong> Skipping a grit step leaves visible scratch patterns under headlights at night.</li>
                  <li><strong>Mistake to Avoid:</strong> Rushing UV coating application — primary cause of premature fogging.</li>
                </ul>
              </div>
            )}

            {/* 7. Customer Expectations & Script */}
            {(activeSection === 0 || activeSection === 7) && (
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                  <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded font-black">7</span>
                  Customer Expectations & Script
                </h3>
                <div className="bg-zinc-950 border border-amber-500/30 rounded-lg p-4 italic text-amber-200">
                  "Headlight restoration removes the oxidation and haze and restores clarity, then we seal it with a UV-protective coating to slow that oxidation from coming back. It's not a one-time-forever fix — direct sun exposure will start the process again over time, so we'd recommend a maintenance re-coat down the road to keep them clear."
                </div>
              </div>
            )}

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
