import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { HelpCircle, Info } from 'lucide-react';

interface EmployeeHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTopicId?: string;
}

const EMPLOYEE_TOPICS = [...employeeDashboardTopics, ...employeeMenuTopics].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

const ALIAS_MAP: Record<string, string> = {
  // SOPs
  'sops': 'sops-process',
  'sops-process': 'sops-process',
  'standard-operating-procedures': 'sops-process',
  'sop': 'sops-process',
  'procedures': 'sops-process',
  'procedures-manual': 'sops-process',
  'sops-manual': 'sops-process',
  'training-manual': 'sops-process',

  // Gallery
  'gallery': 'vehicle-gallery',
  'vehicle-gallery': 'vehicle-gallery',
  'media-library': 'vehicle-gallery',
  'vehicle-gallery-help': 'vehicle-gallery',

  // Pre-Vehicle Walkaround / Client Evaluation
  'pre-vehicle-walkaround': 'client-evaluation',
  'pre-vehicle-checklist': 'client-evaluation',
  'pre-vehicle': 'client-evaluation',
  'walkaround': 'client-evaluation',
  'client-evaluation': 'client-evaluation',

  // Notify Admin
  'notify-admin': 'dashboard-notify-admin',
  'dashboard-notify-admin': 'dashboard-notify-admin',
  'notify': 'dashboard-notify-admin',

  // Sticky Notes
  'sticky-notes': 'dashboard-sticky-notes',
  'dashboard-sticky-notes': 'dashboard-sticky-notes',
  'sticky': 'dashboard-sticky-notes',
  'notes': 'dashboard-sticky-notes',

  // Dashboard Overview
  'dashboard-overview': 'dashboard-overview',
  'employee-dashboard': 'dashboard-overview',
  'dashboard': 'dashboard-overview',
  'ee-dashboard': 'dashboard-overview',

  // Training Center & Cert
  'employee-certification': 'dashboard-prime-training-center',
  'cert-prog': 'dashboard-prime-training-center',
  'training-center': 'dashboard-prime-training-center',
  'prime-training-center': 'dashboard-prime-training-center',

  // Learning Library
  'learning-library': 'dashboard-learning-library',
  'learn-lib': 'dashboard-learning-library',

  // Orientation / Exam
  'orientation': 'dashboard-orientation',
  'exam': 'dashboard-orientation',

  // Rick's Tips
  'pro-tips': 'dashboard-pro-tips',
  'ricks-tips': 'dashboard-pro-tips',

  // Team Chat
  'team-chat': 'dashboard-team-chat',
  'app-team-chat': 'dashboard-team-chat',

  // Tasks / Todo List
  'todo': 'dashboard-todo-list',
  'todo-list': 'dashboard-todo-list',
  'tasks': 'dashboard-todo-list',

  // Quick Pay
  'quick-pay': 'dashboard-quick-pay',

  // Schedule
  'work-schedule': 'dashboard-work-schedule',
  'staff-schedule': 'dashboard-work-schedule',
  'schedule': 'dashboard-work-schedule',

  // Bookings / New Booking
  'new-booking': 'dashboard-new-booking',
  'booking-flow': 'dashboard-new-booking',
  'bookings': 'dashboard-new-booking',

  // Service Checklist
  'service-checklist': 'dashboard-service-checklist',
  'checklist': 'dashboard-service-checklist',

  // Chemical Cards
  'chemical-cards': 'dashboard-chemical-cards',
  'chemicals': 'dashboard-chemical-cards',

  // View Website
  'view-website': 'dashboard-view-website',
  'website': 'dashboard-view-website',

  // Help
  'show-help': 'dashboard-show-help',
  'employee-help': 'dashboard-show-help',
};

function findMatchingTopicId(topicId: string): string | undefined {
  if (!topicId) return undefined;
  const lower = topicId.toLowerCase().trim();

  // 1. Direct alias match
  if (ALIAS_MAP[lower]) {
    const target = ALIAS_MAP[lower];
    const foundByAlias = EMPLOYEE_TOPICS.find(t => t.id.toLowerCase() === target.toLowerCase());
    if (foundByAlias) return foundByAlias.id;
  }

  // 2. Exact ID match
  const exact = EMPLOYEE_TOPICS.find(t => t.id.toLowerCase() === lower);
  if (exact) return exact.id;

  // 3. Substring match on ID
  const idMatch = EMPLOYEE_TOPICS.find(t => 
    t.id.toLowerCase().includes(lower) || 
    lower.includes(t.id.toLowerCase())
  );
  if (idMatch) return idMatch.id;

  // 4. Substring match on title
  const titleMatch = EMPLOYEE_TOPICS.find(t => 
    t.title.toLowerCase().includes(lower) || 
    lower.includes(t.title.toLowerCase())
  );
  if (titleMatch) return titleMatch.id;

  return undefined;
}

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
        const foundId = findMatchingTopicId(topicId);
        if (foundId) {
          setActiveAccordion(foundId);
        }
      }
      onOpenChange(true);
    };
    window.addEventListener('open-help', handleOpenHelp);
    return () => window.removeEventListener('open-help', handleOpenHelp);
  }, [onOpenChange]);

  useEffect(() => {
    if (open && initialTopicId) {
      const foundId = findMatchingTopicId(initialTopicId);
      if (foundId) {
        setActiveAccordion(foundId);
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
