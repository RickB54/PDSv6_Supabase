import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { makeToc, HelpTopic } from './helpData';
import { Search, ChevronRight } from 'lucide-react';

type HelpModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: 'admin' | 'employee';
};

export default function HelpModal({ open, onOpenChange, role }: HelpModalProps) {
  const [query, setQuery] = useState('');
  const toc = useMemo(() => makeToc(role), [role]);
  const [index, setIndex] = useState(0);
  const [accordionValue, setAccordionValue] = useState<string>(""); // Default closed

  const filteredToc = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return toc;
    return toc.filter(t => (t.title + ' ' + t.summary + ' ' + t.content.join(' ')).toLowerCase().includes(q));
  }, [query, toc]);

  useEffect(() => {
    if (index >= filteredToc.length) setIndex(0);
  }, [filteredToc, index]);

  const topic: HelpTopic | undefined = filteredToc[index];

  const goPrev = () => setIndex(i => Math.max(0, i - 1));
  const goNext = () => setIndex(i => Math.min(filteredToc.length - 1, i + 1));

  const handleTopicClick = (i: number) => {
    setIndex(i);
    // Auto-close accordion after selection
    setAccordionValue("");
  };

  // Determine Groups for List
  const groups = useMemo(() => {
    if (role !== 'employee') return { 'All Topics': filteredToc };
    return {
      'Menu Items': filteredToc.filter(t => t.section === 'menu'),
      'Dashboard': filteredToc.filter(t => t.section === 'dashboard')
    };
  }, [filteredToc, role]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] h-[85vh] bg-[#0c1220] border-slate-800 text-white shadow-2xl flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-slate-800/60 shrink-0 bg-[#0f1629]">
          <DialogTitle className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-300 to-sky-400 text-2xl font-bold tracking-tight mb-4">
            Prime Detail Solutions — Help Guide
          </DialogTitle>

          <div className="flex flex-col gap-3">
            {/* Accordion Navigation */}
            <Accordion type="single" collapsible value={accordionValue} onValueChange={setAccordionValue} className="w-full bg-[#1a2035] border border-slate-700 rounded-lg overflow-hidden relative z-50">
              <AccordionItem value="toc" className="border-none">
                <AccordionTrigger className="px-4 py-3 hover:bg-slate-800/50 hover:no-underline data-[state=open]:bg-slate-800 text-white font-medium">
                  <span className="flex items-center gap-2 text-lg">
                    <span className="text-emerald-400 font-bold">MENU:</span>
                    <span className="text-white/90">{topic ? topic.title : "Select a Topic..."}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="bg-[#13182a] max-h-[50vh] overflow-y-auto border-t border-slate-700">
                  <div className="p-2 space-y-4">
                    {/* Search inside Accordion */}
                    <div className="px-2 pt-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                          placeholder="Filter topics..."
                          value={query}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setQuery(e.target.value)}
                          className="pl-9 h-9 bg-[#0c1220] border-slate-700 text-white focus-visible:ring-emerald-500 w-full"
                        />
                      </div>
                    </div>

                    {Object.entries(groups).map(([label, topics]) => (
                      topics.length > 0 && (
                        <div key={label}>
                          <div className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold mb-1 pl-4 opacity-80">{label}</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 px-2">
                            {topics.map((t) => (
                              <button
                                key={t.id}
                                onClick={() => handleTopicClick(filteredToc.indexOf(t))}
                                className={`text-left text-sm px-3 py-2 rounded-md transition-colors flex items-center justify-between group ${filteredToc.indexOf(t) === index ? 'bg-emerald-900/30 text-emerald-100 border border-emerald-500/20' : 'hover:bg-slate-800 text-slate-300 hover:text-white'}`}
                              >
                                {t.title}
                                {filteredToc.indexOf(t) === index && <ChevronRight className="w-3 h-3 text-emerald-500" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </DialogHeader>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden p-6 bg-[#0f1629]/50 relative flex flex-col">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -z-10" />

          {topic ? (
            <div className="flex flex-col h-full max-w-4xl mx-auto w-full pt-2">
              <div className="flex items-start justify-between mb-6 pb-4 border-b border-slate-800/60 shrink-0">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">{topic.title}</h2>
                  {topic.route && (<div className="text-xs font-mono text-cyan-400/70 bg-cyan-950/30 px-2 py-1 rounded inline-block border border-cyan-900/30 tracking-wide">Route: {topic.route}</div>)}
                </div>
                <div className="flex items-center gap-1 bg-slate-900/80 rounded-lg p-1 border border-slate-800 shrink-0 self-start">
                  <Button variant="ghost" size="icon" onClick={goPrev} disabled={index === 0} className="h-9 w-9 text-slate-400 hover:text-emerald-400 hover:bg-slate-800" title="Previous Topic">
                    <span className="text-xl">←</span>
                  </Button>
                  <div className="w-[1px] h-5 bg-slate-700 mx-1" />
                  <Button variant="ghost" size="icon" onClick={goNext} disabled={index === filteredToc.length - 1} className="h-9 w-9 text-slate-400 hover:text-sky-400 hover:bg-slate-800" title="Next Topic">
                    <span className="text-xl">→</span>
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-4 space-y-5 custom-scrollbar text-lg leading-relaxed text-slate-300 pb-8">
                {topic.content.map((p, i) => (
                  <p key={i} className="">{p}</p>
                ))}
                {topic.summary && (
                  <div className="mt-8 p-5 bg-slate-900/50 border-l-4 border-emerald-500 rounded-r-xl">
                    <p className="text-base text-emerald-200/90 italic font-medium">✨ Summary: {topic.summary}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <p className="text-lg">Select a topic from the MENU above.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
