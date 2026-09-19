import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Droplets, Download, Printer, AlertTriangle, CheckCircle2, Info, Lightbulb, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import { useToast } from '@/hooks/use-toast';

interface WaterSpotRemovalGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WaterSpotRemovalGuideModal: React.FC<WaterSpotRemovalGuideModalProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<number>(0);

  const handleDownloadPDF = () => {
    const link = document.createElement('a');
    link.href = '/sop-guides/Prime_Auto_Detail_Water_Spot_Removal_Employee_Training_Guide.pdf';
    link.download = 'Prime_Auto_Detail_Water_Spot_Removal_Employee_Training_Guide.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'PDF Downloaded', description: 'Water Spot Removal Employee Training Guide PDF downloaded successfully.' });
  };

  const sectionsList = [
    '1. What Causes Water Spots',
    '2. Assessing Severity',
    '3. Chemical Safety & Handling',
    '4. Step-by-Step Process',
    '5. Scenario Guidance',
    '6. Common Mistakes',
    '7. Customer Expectations & Script'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] bg-zinc-950 border-cyan-500/30 text-white shadow-2xl rounded-2xl p-0 overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <DialogHeader className="p-4 md:p-6 bg-zinc-900/90 border-b border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/30">
                <Droplets className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg md:text-xl font-black text-white tracking-tight">
                Water Spot Removal Employee Training Guide
              </DialogTitle>
              <Badge variant="outline" className="border-cyan-500/40 text-cyan-300 bg-cyan-950/40 text-[10px] font-bold">
                Official PDF Document
              </Badge>
            </div>
            <DialogDescription className="text-xs text-zinc-400 mt-1">
              Employee Training • Chemical Safety • Customer Education
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
              onClick={() => window.open('/sop-guides/Prime_Auto_Detail_Water_Spot_Removal_Employee_Training_Guide.pdf', '_blank')}
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

          <div className="flex items-center gap-1.5 shrink-0 text-xs bg-zinc-950/80 px-2.5 py-1 rounded-md border border-zinc-800 text-zinc-300 font-semibold whitespace-nowrap self-end sm:self-center">
            <span className="text-zinc-500 font-medium">Viewing:</span>
            <span className="text-cyan-400 font-bold">
              {activeSection === 0 ? 'Full Guide' : sectionsList[activeSection - 1] || `Section ${activeSection}`}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-zinc-950 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
          <div className="max-w-4xl mx-auto space-y-8 text-zinc-300 text-sm leading-relaxed pb-12">
            
            {/* Banner & Core Principle */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 text-center space-y-3">
              <h1 className="text-2xl font-black text-white tracking-tight">PRIME AUTO DETAIL</h1>
              <h2 className="text-xl font-bold text-cyan-400">Water Spot Removal Employee Training Guide</h2>
              <p className="text-xs text-zinc-400">Employee Training • Chemical Safety • Customer Education</p>
              
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mt-4">
                <p className="text-cyan-300 font-bold text-base italic">
                  "Know what you're looking at before you reach for the descaler — not every water spot needs it."
                </p>
                <p className="text-[11px] text-cyan-400/80 mt-1">Origination: Generated by Claude (Anthropic) for Prime Auto Detail, September 17, 2026</p>
              </div>
            </div>

            {/* 1. What Causes Water Spots */}
            {(activeSection === 0 || activeSection === 1) && (
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-6 space-y-3">
                <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
                  <span className="bg-cyan-500/20 text-cyan-400 text-xs px-2 py-0.5 rounded font-black">1</span>
                  What Causes Water Spots
                </h3>
                <p className="text-zinc-300">
                  Water contains dissolved minerals. When water evaporates on a surface — especially in sun or heat — those minerals can be left behind as deposits. Left long enough, or with repeated drying cycles, mineral deposits can bond to and even etch into clear coat.
                </p>
              </div>
            )}

            {/* 2. Assessing Severity */}
            {(activeSection === 0 || activeSection === 2) && (
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
                  <span className="bg-cyan-500/20 text-cyan-400 text-xs px-2 py-0.5 rounded font-black">2</span>
                  Assessing Severity — Know Which One You're Looking At
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-zinc-800 text-xs">
                    <thead>
                      <tr className="bg-cyan-950/40 text-cyan-300 border-b border-zinc-800">
                        <th className="p-3 border-r border-zinc-800">Condition</th>
                        <th className="p-3">Treatment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      <tr>
                        <td className="p-3 border-r border-zinc-800 font-semibold text-zinc-200">Surface mineral film (wipes off easily)</td>
                        <td className="p-3 text-emerald-400 font-medium">Standard wash/detail spray — no descaler needed</td>
                      </tr>
                      <tr>
                        <td className="p-3 border-r border-zinc-800 font-semibold text-zinc-200">Bonded mineral deposits (doesn't wash off)</td>
                        <td className="p-3 text-cyan-400 font-medium">Acid-safe mineral descaler required</td>
                      </tr>
                      <tr>
                        <td className="p-3 border-r border-zinc-800 font-semibold text-zinc-200">Actual etching into clear coat (deposit gone but mark remains)</td>
                        <td className="p-3 text-amber-400 font-medium">Descaler won't fix this — needs paint correction</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-rose-950/30 border border-rose-500/30 rounded-lg p-3 text-xs text-rose-200 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-rose-400">Employee rule:</strong> Always determine which of these three you're dealing with before reaching for the descaler. Treating true etching with descaler alone wastes chemical and won't produce the result the customer expects.
                  </div>
                </div>
              </div>
            )}

            {/* 3. Chemical Safety & Handling */}
            {(activeSection === 0 || activeSection === 3) && (
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-6 space-y-3">
                <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
                  <span className="bg-cyan-500/20 text-cyan-400 text-xs px-2 py-0.5 rounded font-black">3</span>
                  Chemical Safety & Handling
                </h3>
                <ul className="space-y-2 text-zinc-300 list-disc pl-5">
                  <li><strong>Wear protection:</strong> Wear gloves and eye protection when applying — sprayed at eye level on vertical panels.</li>
                  <li><strong>Panel by panel:</strong> Work panel by panel, never the whole vehicle at once.</li>
                  <li><strong>Rinse immediately:</strong> Neutralize/rinse each panel immediately after required dwell — never let it dry on the surface.</li>
                  <li><strong>Sensitive surfaces:</strong> Keep off rubber trim, unpainted plastic, and wheels unless product is explicitly labeled safe.</li>
                </ul>
              </div>
            )}

            {/* 4. Step-by-Step Process */}
            {(activeSection === 0 || activeSection === 4) && (
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-6 space-y-3">
                <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
                  <span className="bg-cyan-500/20 text-cyan-400 text-xs px-2 py-0.5 rounded font-black">4</span>
                  Step-by-Step Process
                </h3>
                <ol className="space-y-2 text-zinc-300 list-decimal pl-5">
                  <li><strong>Wash vehicle first:</strong> Never diagnose or treat water spots on a dirty panel.</li>
                  <li><strong>Test spot:</strong> Test on a small, inconspicuous area first.</li>
                  <li><strong>Apply descaler:</strong> Apply descaler to one panel at a time and agitate lightly if required.</li>
                  <li><strong>Rinse & Neutralize:</strong> Rinse and neutralize immediately.</li>
                  <li><strong>Dry & Inspect:</strong> Dry and inspect panel under good light. Stop if etching remains and recommend Paint Correction.</li>
                </ol>
              </div>
            )}

            {/* 7. Customer Expectations & Script */}
            {(activeSection === 0 || activeSection === 7) && (
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
                  <span className="bg-cyan-500/20 text-cyan-400 text-xs px-2 py-0.5 rounded font-black">7</span>
                  Customer Expectations & Script
                </h3>
                <div className="bg-zinc-950 border border-cyan-500/30 rounded-lg p-4 italic text-cyan-200">
                  "Most water spots are mineral deposits sitting on top of the clear coat, and we can safely dissolve and remove those. Sometimes, if water's been left to dry repeatedly over a long time, it can actually etch into the clear coat — that's a different issue, and it needs paint correction rather than a chemical treatment. We'll check yours and let you know exactly which one we're dealing with before we start."
                </div>
              </div>
            )}

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
