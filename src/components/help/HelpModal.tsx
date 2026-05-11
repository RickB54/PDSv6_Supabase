import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { makeToc, HelpTopic } from './helpData';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Zap, Printer } from 'lucide-react';
import { exportHelpTopicPDF } from '@/lib/help-pdf';

type HelpModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: 'admin' | 'employee' | 'customer';
  initialTopicId?: string;
};

export default function HelpModal({ open, onOpenChange, role, initialTopicId }: HelpModalProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const toc = useMemo(() => {
    const rawToc = makeToc(role);
    const seenIds = new Set<string>();
    const seenTitles = new Set<string>();
    return rawToc.filter(t => {
      // Deduplicate by both ID and Title to catch all varieties of duplicates in helpData.ts
      if (seenIds.has(t.id) || seenTitles.has(t.title)) return false;
      seenIds.add(t.id);
      seenTitles.add(t.title);
      return true;
    });
  }, [role]);
  
  // Use ID instead of index for robustness
  const [currentTopicId, setCurrentTopicId] = useState<string | undefined>(initialTopicId);
  const [accordionValue, setAccordionValue] = useState<string>(""); 

  // Handle direct navigation to topic via event
  useEffect(() => {
    const handleOpenHelp = (e: any) => {
      let topicId: string | undefined = undefined;
      if (typeof e.detail === 'string') {
        topicId = e.detail;
      } else if (e.detail && typeof e.detail === 'object') {
        topicId = e.detail.topicId;
      }

      if (topicId) {
        const found = toc.find(t => t.id === topicId);
        if (found) {
          setCurrentTopicId(topicId);
          setAccordionValue(""); 
          setQuery(''); 
          onOpenChange(true); // Ensure modal opens if a button calls it
          // Reset scroll of content area
          const contentArea = document.getElementById('help-content-scroll');
          if (contentArea) contentArea.scrollTop = 0;
        }
      }
    };

    window.addEventListener('open-help', handleOpenHelp);
    return () => window.removeEventListener('open-help', handleOpenHelp);
  }, [toc, onOpenChange]);

  // Handle prop changes (initial mount or forced update from parent)
  useEffect(() => {
    if (open) {
      if (initialTopicId) {
        setCurrentTopicId(initialTopicId);
      }
      setAccordionValue("");
    }
  }, [open, initialTopicId]);



  const filteredToc = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return toc;
    
    // Strict filtering: Only show if Title or Summary matches the query
    // This addresses the user requirement: "if i put in vehicle i should not see anything but vehicle"
    return toc.filter(t => {
      const title = t.title.toLowerCase();
      const summary = t.summary.toLowerCase();
      return title.includes(q) || summary.includes(q);
    }).sort((a, b) => {
      // Still prioritize Title matches over Summary matches
      const aTitle = a.title.toLowerCase().includes(q);
      const bTitle = b.title.toLowerCase().includes(q);
      if (aTitle && !bTitle) return -1;
      if (!aTitle && bTitle) return 1;
      return 0;
    });
  }, [query, toc]);

  // Auto-switch to first result during search
  useEffect(() => {
    if (query.trim() && filteredToc.length > 0) {
      const isCurrentInResults = filteredToc.some(t => t.id === currentTopicId);
      if (!isCurrentInResults) {
        setCurrentTopicId(filteredToc[0].id);
      }
    }
  }, [filteredToc, query, currentTopicId]);

  // Derive active topic from ID
  const topic: HelpTopic | undefined = useMemo(() => {
    const active = toc.find(t => t.id === currentTopicId);
    if (active) return active;
    // Only fallback if no query, else let No Results show
    if (!query) return toc[0];
    return undefined;
  }, [currentTopicId, toc, query]);

  const currentIndex = useMemo(() => {
    if (!topic) return 0;
    return filteredToc.findIndex(t => t.id === topic.id);
  }, [topic, filteredToc]);

  const goPrev = () => {
    const prev = filteredToc[Math.max(0, currentIndex - 1)];
    if (prev) setCurrentTopicId(prev.id);
  };
  
  const goNext = () => {
    const next = filteredToc[Math.min(filteredToc.length - 1, currentIndex + 1)];
    if (next) setCurrentTopicId(next.id);
  };

  const handleTopicClick = (tId: string) => {
    setCurrentTopicId(tId);
    setAccordionValue("");
    const contentArea = document.getElementById('help-content-scroll');
    if (contentArea) contentArea.scrollTop = 0;
  };

  // Determine Groups for List
  const groups = useMemo(() => {
    if (role !== 'employee') return { 'All Topics': filteredToc };
    return {
      'Chemical Management': filteredToc.filter(t => t.section === 'chemicals'),
      'Menu Items': filteredToc.filter(t => t.section === 'menu'),
      'Dashboard': filteredToc.filter(t => t.section === 'dashboard')
    };
  }, [filteredToc, role]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[950px] h-[90vh] bg-[#0c1220] border-slate-800 text-white shadow-2xl flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 sm:px-6 sm:py-5 border-b border-slate-800/60 shrink-0 bg-[#0f1629]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-1 sm:mb-2">
            <DialogTitle className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-300 to-sky-400 text-lg sm:text-2xl font-bold tracking-tight">
              Help Center (Strict Search Mode)
            </DialogTitle>
            
            {/* Global Search - Always Visible and prominent */}
            <div className="w-full sm:w-72 relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
               <Input
                 placeholder="Search all documentation..."
                 value={query}
                 onChange={(e) => {
                   setQuery(e.target.value);
                   setAccordionValue("toc"); // Keep menu open while searching
                 }}
                 className="pl-9 h-9 bg-slate-900/50 border-slate-700 text-white focus-visible:ring-emerald-500 rounded-full text-sm"
               />
               {query && (
                 <button 
                  onClick={() => {
                    setQuery('');
                    // Set to first topic when clearing search
                    if (toc.length > 0) setCurrentTopicId(toc[0].id);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-[10px] font-bold"
                 >
                   Clear
                 </button>
               )}
            </div>
         </div>



          <div className="flex flex-col gap-3">
            {/* Navigation Selector */}
            <Accordion type="single" collapsible value={accordionValue} onValueChange={setAccordionValue} className="w-full bg-[#1a2035] border border-slate-700 rounded-lg overflow-hidden relative z-50">
              <AccordionItem value="toc" className="border-none">
                <AccordionTrigger className="px-4 py-2 hover:bg-slate-800/50 hover:no-underline data-[state=open]:bg-slate-800 text-white font-medium">
                  <span className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold text-xs uppercase tracking-widest">MENU:</span>
                    <span className="text-white/90 truncate max-w-[500px]">
                      {topic ? topic.title : (filteredToc.length > 0 ? "Browse Relevant Topics..." : "No Topics Matching Search")}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="bg-[#13182a] max-h-[50vh] overflow-y-auto border-t border-slate-700">
                  <div className="p-3 space-y-5">
                    {filteredToc.length === 0 ? (
                      <div className="py-12 text-center">
                        <Search className="w-12 h-12 text-slate-700 mx-auto mb-3 opacity-20" />
                        <p className="text-slate-500">No help topics found for "<span className="text-emerald-400">{query}</span>"</p>
                        <Button variant="link" onClick={() => setQuery('')} className="text-emerald-500 font-bold mt-2">
                          Show all topics
                        </Button>
                      </div>
                    ) : (
                      Object.entries(groups).map(([label, topics]) => (
                        topics.length > 0 && (
                          <div key={label}>
                            <div className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold mb-2 pl-4 opacity-80">{label}</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 px-2">
                              {topics.map((t) => (
                                <button
                                  key={t.id}
                                  onClick={() => handleTopicClick(t.id)}
                                  className={`text-left text-sm px-3 py-2.5 rounded-md transition-all flex items-center justify-between group ${t.id === currentTopicId ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'hover:bg-slate-800 text-slate-300 hover:text-white border border-transparent'}`}
                                >
                                  <span className="truncate">{t.title}</span>
                                  {t.id === currentTopicId && <ChevronRight className="w-4 h-4 text-white" />}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      ))
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </DialogHeader>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden p-4 sm:p-8 bg-[#0f1629]/50 relative flex flex-col">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -z-10" />

          {topic ? (
            <div className="flex flex-col h-full max-w-4xl mx-auto w-full pt-0 sm:pt-2">
              <div className="flex flex-col sm:flex-row items-start justify-between mb-4 sm:mb-8 pb-4 sm:pb-6 border-b border-slate-800/60 shrink-0 gap-4">
                <div className="space-y-3 sm:space-y-4 w-full">
                  <h2 className="text-xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight sm:leading-none">{topic.title}</h2>
                  <div className="flex items-center gap-3">
                    {topic.route && (<div className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-3 py-1.5 rounded-full border border-cyan-800/50 uppercase tracking-[0.1em]">Section: {topic.route.replace('/', '') || 'Home'}</div>)}
                    {topic.route && (
                      <Button 
                        size="sm" 
                        variant="default" 
                        onClick={() => {
                          onOpenChange(false);
                          navigate(topic.route!);
                        }}
                        className="h-8 px-4 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-500/20 uppercase tracking-wider"
                      >
                         <Zap className="w-3.5 h-3.5 mr-2" /> Launch Tool
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => exportHelpTopicPDF(topic)}
                      className="h-8 px-4 text-xs font-bold border-slate-700 hover:bg-slate-800 text-slate-300 rounded-full uppercase tracking-wider"
                    >
                       <Printer className="w-3.5 h-3.5 mr-2" /> Save as PDF
                    </Button>
                  </div>
                </div>
                
                {/* Navigation Arrows */}
                <div className="flex items-center gap-2 bg-slate-900/60 rounded-full p-1 sm:p-1.5 border border-slate-800 shrink-0 self-start">
                  <Button variant="ghost" size="icon" onClick={goPrev} disabled={currentIndex <= 0} className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-full transition-all" title="Previous Topic">
                    <span className="text-xl sm:text-2xl leading-none">←</span>
                  </Button>
                  <div className="w-[1px] h-4 sm:h-6 bg-slate-700/50 mx-1" />
                  <Button variant="ghost" size="icon" onClick={goNext} disabled={currentIndex === filteredToc.length - 1} className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-full transition-all" title="Next Topic">
                    <span className="text-xl sm:text-2xl leading-none">→</span>
                  </Button>
                </div>
              </div>

              <div id="help-content-scroll" className="flex-1 overflow-y-auto pr-2 sm:pr-6 space-y-4 sm:space-y-6 custom-scrollbar text-lg sm:text-xl leading-relaxed text-slate-300 pb-12">
                {(topic.content || []).map((p, i) => (
                  <p key={i} className={p.startsWith('**') ? 'text-white font-bold' : ''}>
                    {p.split(/(\*\*.*?\*\*)/g).map((chunk, j) => 
                      chunk.startsWith('**') ? <strong key={j} className="text-emerald-400">{chunk.replace(/\*\*/g, '')}</strong> : chunk
                    )}
                  </p>
                ))}
                
                {topic.summary && (
                  <div className="mt-8 p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                    <p className="text-lg text-emerald-200/90 italic font-medium leading-relaxed">✨ Summary: {topic.summary}</p>
                  </div>
                )}

                {/* Related Topics Section */}
                <div className="mt-12 pt-8 border-t border-slate-800/60">
                  <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Related Topics & Next Steps
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(() => {
                      const keyTopicIds = ['prospects', 'estimates', 'users-roles', 'customers', 'bookings', 'service-checklist'];
                      
                      let related = (topic.relatedTopicIds || [])
                        .map(id => toc.find(t => t.id === id))
                        .filter(Boolean) as HelpTopic[];
                      
                      // Fallback: If fewer than 4 related topics, add from keyTopicIds
                      if (related.length < 4) {
                        const keyTopics = keyTopicIds
                          .map(id => toc.find(t => t.id === id))
                          .filter(t => t && t.id !== topic.id && !related.some(r => r.id === t.id)) as HelpTopic[];
                        
                        related = [...related, ...keyTopics];
                      }

                      // If still fewer than 4, add from same section
                      if (related.length < 4) {
                        const others = toc.filter(t => 
                          t.section === topic.section && 
                          t.id !== topic.id && 
                          !related.some(r => r.id === t.id)
                        );
                        related = [...related, ...others];
                      }

                      return related.slice(0, 4).map((rt) => (
                        <button
                          key={rt.id}
                          onClick={() => handleTopicClick(rt.id)}
                          className="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-800 rounded-xl hover:bg-slate-800/60 hover:border-emerald-500/50 transition-all group text-left"
                        >
                          <div className="space-y-1">
                            <div className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{rt.title}</div>
                            <div className="text-[10px] text-slate-500 line-clamp-1">{rt.summary}</div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center border border-slate-800 shadow-xl">
                 <Search className="w-10 h-10 text-slate-700" />
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-slate-400">Knowledge Base Offline</p>
                <p className="text-slate-500 max-w-sm mx-auto">Please refine your search or select a topic from the MENU above to begin your masterclass.</p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => { setQuery(''); setAccordionValue('toc'); }}
                className="rounded-full border-slate-700 hover:bg-slate-800 text-slate-400"
              >
                Reset Help Center
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
