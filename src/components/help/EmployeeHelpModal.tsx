import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { HelpCircle, Info } from 'lucide-react';

interface EmployeeHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTopicId?: string;
}

const EMPLOYEE_TOPICS = [
  {
    id: 'dashboard-overview',
    title: 'Employee Dashboard Overview',
    content: 'Welcome to your Employee Dashboard! This is your central hub for everything you need to do your job at Prime Auto Detail. Click any of the topics below to learn more about a specific feature.'
  },
  {
    id: 'new-booking',
    title: 'New Booking',
    content: 'The New Booking tile allows you to book a service on behalf of a customer. It opens an info panel that directs you to the public Services page. When you complete a booking while logged in, that customer is automatically assigned to you in the system so you can access their details later.'
  },
  {
    id: 'service-checklist',
    title: 'Service Checklist',
    content: 'The Service Checklist is used when you are actively working on a vehicle. It provides step-by-step Standard Operating Procedures (SOPs) for the job to ensure nothing is missed before returning the vehicle to the customer.'
  },
  {
    id: 'work-schedule',
    title: 'Work Schedule',
    content: 'View your upcoming assigned shifts and scheduled times. You can check your hours for the week and see when you are expected to be on the floor.'
  },
  {
    id: 'prime-training-center',
    title: 'Prime Training Center',
    content: 'Access all required instructional videos, quizzes, and standard operating procedures (SOPs). Completing these modules earns you certifications and badges necessary for advancement.'
  },
  {
    id: 'learning-library',
    title: 'Learning Library',
    content: 'An archive of optional resources, past training materials, and company best-practices. This is your go-to place for continuous improvement outside of required certifications.'
  },
  {
    id: 'orientation-exam',
    title: 'Orientation (Exam)',
    content: 'The Orientation Exam is required for all new hires. It covers company overview, basic safety protocols, and general policies. Click this tile to take or review your onboarding exam.'
  },
  {
    id: 'view-website',
    title: 'View Website',
    content: 'Opens the live public Prime Auto Detail website exactly as a customer sees it. Use this to quickly check our current public package descriptions and pricing if a customer asks.'
  },
  {
    id: 'ricks-tips',
    title: 'Rick\'s Tips',
    content: 'A collection of expert detailing advice directly from Rick. Read these quick reminders to avoid common mistakes, improve your efficiency, and reduce rework on vehicles.'
  },
  {
    id: 'app-team-chat',
    title: 'App Team Chat',
    content: 'The internal messaging system for Prime Auto Detail. Send and receive real-time messages with other employees and management to coordinate tasks or ask for help.'
  },
  {
    id: 'sticky-notes',
    title: 'Sticky Notes',
    content: 'Your personal, private digital workspace. Create checklists, write down reminders, or keep track of personal to-do items that only you can see.'
  },
  {
    id: 'chemical-cards',
    title: 'Chemical Cards',
    content: 'The master reference for our chemical inventory. Look up any product to see its correct dilution ratio, intended use-case, and safety warnings before mixing or applying it.'
  },
  {
    id: 'quick-pay',
    title: 'Quick Pay',
    content: 'Process an immediate credit card payment in person. Ideal for walk-in customers or taking quick payments for ad-hoc service additions.'
  },
  {
    id: 'todo-list',
    title: 'Todo List',
    content: 'View tasks explicitly assigned to you by the management team. This includes a calendar and list view so you know exactly what needs to be accomplished each day.'
  },
  {
    id: 'app-manual',
    title: 'App Manual',
    content: 'The comprehensive guide on how to use this internal software application. If you aren\'t sure how a software feature works, you will find the answer here.'
  },
  {
    id: 'notify-admin',
    title: 'Notify Admin',
    content: 'Send an immediate alert directly to management regarding an urgent issue, a customer request, or any other matter that needs administrative attention.'
  }
];

export const EmployeeHelpModal: React.FC<EmployeeHelpModalProps> = ({ open, onOpenChange, initialTopicId }) => {
  const [activeAccordion, setActiveAccordion] = useState<string>("dashboard-overview");

  // When opened, try to match the topic, otherwise default to overview
  useEffect(() => {
    if (open) {
      if (initialTopicId) {
        // Try to map the incoming generic topic ID to our specific ones if needed, 
        // or directly use it if it matches our list.
        const found = EMPLOYEE_TOPICS.find(t => t.id === initialTopicId || initialTopicId.includes(t.id) || t.id.includes(initialTopicId));
        if (found) {
          setActiveAccordion(found.id);
        } else {
          setActiveAccordion("dashboard-overview");
        }
      } else {
        setActiveAccordion("dashboard-overview");
      }
    }
  }, [open, initialTopicId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
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
          <ScrollArea className="h-full">
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
                    className="border border-zinc-800/60 rounded-lg bg-zinc-900/30 overflow-hidden data-[state=open]:bg-zinc-900 data-[state=open]:border-indigo-500/30 transition-colors"
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
                      <div className="pl-11 pr-4">
                        {topic.content}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeHelpModal;
