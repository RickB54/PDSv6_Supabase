import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { HelpCircle, Info } from 'lucide-react';

import { employeeMenuTopics, employeeDashboardTopics } from './helpData';

interface EmployeeHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTopicId?: string;
}

const EMPLOYEE_TOPICS = [...employeeDashboardTopics, ...employeeMenuTopics].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);


export const EmployeeHelpModal: React.FC<EmployeeHelpModalProps> = ({ open, onOpenChange, initialTopicId }) => {
  const [activeAccordion, setActiveAccordion] = useState<string>("dashboard-overview");

  // Listen for open-help event to handle tile clicks
  useEffect(() => {
    const handleOpenHelp = (e: any) => {
      let topicId: string | undefined = undefined;
      if (typeof e.detail === 'string') {
        topicId = e.detail;
      } else if (e.detail && typeof e.detail === 'object') {
        topicId = e.detail.topicId;
      }
      
      if (topicId) {
        const found = EMPLOYEE_TOPICS.find(t => t.id === topicId || topicId?.includes(t.id) || t.id.includes(topicId!));
        if (found) {
          setActiveAccordion(found.id);
          onOpenChange(true);
        }
      }
    };
    window.addEventListener('open-help', handleOpenHelp);
    return () => window.removeEventListener('open-help', handleOpenHelp);
  }, [onOpenChange]);

  useEffect(() => {
    if (open) {
      if (initialTopicId) {
        const found = EMPLOYEE_TOPICS.find(t => t.id === initialTopicId || initialTopicId.includes(t.id) || t.id.includes(initialTopicId));
        if (found) {
          setActiveAccordion(found.id);
        }
      }
    }
  }, [open, initialTopicId]);

  // Scroll active item into view
  useEffect(() => {
    if (open && activeAccordion) {
      setTimeout(() => {
        const el = document.getElementById(`employee-help-${activeAccordion}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [open, activeAccordion]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-3xl h-[90dvh] md:h-auto md:max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-zinc-800/50 bg-zinc-900/50">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-indigo-400" />
            Employee Help Center
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Complete documentation for all Employee Dashboard features.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col relative">
          <div className="h-full overflow-y-auto overscroll-contain">
            <div className="p-6">
              <Accordion 
                type="single" 
                collapsible 
                value={activeAccordion} 
                onValueChange={setActiveAccordion}
                className="w-full space-y-3"
              >
                {EMPLOYEE_TOPICS.map((topic) => (
                  <AccordionItem 
                    key={topic.id} 
                    value={topic.id} 
                    id={`employee-help-${topic.id}`}
                    className="border border-zinc-800/60 rounded-lg bg-zinc-900/30 overflow-hidden data-[state=open]:bg-zinc-900 data-[state=open]:border-indigo-500/30 transition-colors scroll-m-4"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-zinc-800/50">
                      <div className="flex items-center gap-3 text-left">
                        <div className="bg-zinc-800 p-1.5 rounded-md text-zinc-400">
                          <Info className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-zinc-200">{topic.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-1 text-zinc-400 leading-relaxed border-t border-zinc-800/50 mt-1">
                      <div className="pl-11 pr-4 whitespace-pre-wrap">
                        {Array.isArray(topic.content) ? topic.content.join('\n') : topic.content}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeHelpModal;
