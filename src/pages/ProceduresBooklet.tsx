import React, { useState, useRef, useEffect } from "react";
import { 
  Book, 
  ChevronRight, 
  Printer, 
  Download, 
  Search, 
  Info, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Clock, 
  DollarSign, 
  Users, 
  ShieldCheck, 
  Cpu, 
  Truck, 
  Beaker, 
  LayoutDashboard, 
  History, 
  Settings,
  Mail,
  Camera,
  Layers,
  FileText,
  Star,
  Target,
  Trophy,
  Workflow,
  Share2,
  Sparkles,
  BarChart3,
  Database,
  ArrowRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Define the structure for a Procedure Page
interface ProcedurePage {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  summary: string;
  sections: {
    title: string;
    content: string;
    subsections?: {
      title: string;
      content: string;
      icon?: React.ElementType;
    }[];
  }[];
  proTips: string[];
  warnings: string[];
}

const procedures: ProcedurePage[] = [
  {
    id: "introduction",
    title: "The Prime Directive",
    icon: Star,
    color: "from-amber-400 to-orange-600",
    summary: "The foundational philosophy and operating standards of Prime Auto Detail. This chapter outlines the 'Why' behind our 'How'.",
    sections: [
      {
        title: "Mission & Brand Philosophy",
        content: "Prime Auto Detail isn't just a cleaning service; it's a precision engineering firm for vehicle preservation. Our methodology is built on three pillars: Absolute Transparency, Chemical Accuracy, and Digital Verification. We believe that every job is an audit of our skills, and the app is the medium through which we prove our excellence to the client."
      },
      {
        title: "Standard of Excellence",
        content: "Every vehicle must pass the 'Prime Inspection' before it leaves the shop. This means no loose change left in cup holders, no streaks on the glass, and a tire dressing that is dry to the touch. We use the Digital Inspection tool in the checklist to prove this to our clients with high-resolution evidence.",
        subsections: [
          {
            title: "The 100% Rule",
            content: "If a step is in the checklist, it must be performed or explicitly marked as 'Skipped' with a reasoning note. There are no shortcuts at Prime.",
            icon: CheckCircle2
          },
          {
            title: "Client First Communication",
            content: "We never surprise a client with a higher price. We use the Estimate system to lock in costs and the Email Preview modal to ensure they see exactly what we're sending.",
            icon: Mail
          }
        ]
      }
    ],
    proTips: [
      "Always start your day by checking the 'Real-time Alerts' on the dashboard.",
      "The 'Golden Rule': If it's not in the app, it didn't happen."
    ],
    warnings: [
      "Never delete a customer record unless it is a confirmed duplicate.",
      "Unauthorized discounts are a violation of shop protocol."
    ]
  },
  {
    id: "lifecycle",
    title: "The 6-Phase Lifecycle",
    icon: Workflow,
    color: "from-blue-400 to-indigo-600",
    summary: "A comprehensive walkthrough of the standard operating procedure for every job, from the first lead to the final retention outreach.",
    sections: [
      {
        title: "Phase 1: Lead Capture (The Prospect)",
        content: "All potential work begins as a **Lead**. When an inquiry comes in via the website, a phone call, or a walk-in, it MUST be recorded in the **Prospects** page. This allows us to track conversion rates and ensure no client is left behind.",
        subsections: [
          {
            title: "Identity Verification",
            content: "The system uses 'Smart Dedup' logic. Always search for an email or phone number before creating a new profile to prevent duplicate history.",
            icon: Search
          }
        ]
      },
      {
        title: "Phase 2: The Commitment (The Booking)",
        content: "Once a lead is ready to move forward, we create a **Booking**. This locks in the slot on the calendar and triggers the automated pricing engine.",
        subsections: [
          {
            title: "Vehicle Sizing",
            content: "Pricing is calculated based on Vehicle Type (SUV, Truck, Compact). Ensure the sizing is correct in the profile to prevent billing errors.",
            icon: Truck
          }
        ]
      },
      {
        title: "Phase 3: Preparation (The Setup)",
        content: "Preparation is the key to speed. We use the **Prep Summary PDF** generated from the checklist to gather 100% of the tools and chemicals needed for the specific job before we ever touch the paint.",
        subsections: [
          {
            title: "Chemical Audit",
            content: "Check your shelf inventory against the prep list. If you're low, the system will show a red warning.",
            icon: Beaker
          }
        ]
      },
      {
        title: "Phase 4: Execution (The Service)",
        content: "During the service, the **Job Timer** is active. This isn't just for payroll; it's for performance analytics. Every step checked creates a timestamped audit trail.",
        subsections: [
          {
            title: "Digital Inspection",
            content: "Document pre-existing damage BEFORE starting. Upload 'Before' photos directly to the checklist gallery.",
            icon: Camera
          },
          {
            title: "Chemical Dilution",
            content: "Use the built-in Dilution Calculator to ensure chemical safety on sensitive surfaces.",
            icon: Beaker
          }
        ]
      },
      {
        title: "Phase 5: Completion & Billing",
        content: "Finishing the job stops the timer and automatically generates the **Pending Invoice**. Review the subtotal, add any add-ons or discounts, and finalize.",
        subsections: [
          {
            title: "Verified Sent Emails",
            content: "When sending the invoice, use the Preview modal to verify the client's information and the audit timestamp.",
            icon: Mail
          }
        ]
      },
      {
        title: "Phase 6: Retention (The Loop)",
        content: "Our business survives on repeat clients. The **Retention Hub** alerts us when a client is due for their maintenance refresh (Monthly, Quarterly, etc.).",
        subsections: [
          {
            title: "Personalized Outreach",
            content: "Use the custom notes in the follow-up center to mention details from their last visit to increase conversion.",
            icon: Zap
          }
        ]
      }
    ],
    proTips: [
      "The 'Prep Summary' saves an average of 15 minutes per job by eliminating trips to the chemical room.",
      "Always mark a job 'Paid' immediately upon receiving funds to keep accounting accurate."
    ],
    warnings: [
      "Never 'Finish' a job without double-checking the checklist for uncompleted items.",
      "The Job Timer must be accurate; do not leave it running after the job is finished."
    ]
  },
  {
    id: "crm",
    title: "CRM: The Relationship Master",
    icon: Users,
    color: "from-purple-400 to-fuchsia-600",
    summary: "How to manage the core asset of the business: the customer database. Understanding profiles, garages, and communication history.",
    sections: [
      {
        title: "Prospects vs. Customers",
        content: "The system makes a hard distinction between 'Potential' and 'Active'. **Prospects** are leads. **Customers** are those with at least one confirmed booking. Moving someone between these types is a manual or automated promotion based on their first confirmed appointment."
      },
      {
        title: "The Virtual Garage",
        content: "Each client has a 'Garage' that persists between visits. This stores their vehicle specifications (Year, Make, Model, VIN, Color) so we never have to ask twice.",
        subsections: [
          {
            title: "Vehicle Deduplication",
            content: "The system automatically merges duplicate vehicles. If you see two of the same car, the 'Smart Sync' tool will combine them on save.",
            icon: Layers
          }
        ]
      },
      {
        title: "Communication Overview",
        content: "The CRM tracks every interaction. This includes email logs, manual notes, and the 'Last Contact' date. We use this to ensure we aren't over-communicating or neglecting our clients.",
        subsections: [
          {
            title: "Verified Sent Tracking",
            content: "We only display 'Verified Sent' timestamps for emails that actually left the server. If it says 'Draft', it hasn't been sent.",
            icon: ShieldCheck
          }
        ]
      }
    ],
    proTips: [
      "Search by the last 4 digits of a phone number for the fastest customer lookup.",
      "Add personal notes (e.g., 'Dog owner', 'Loves gloss') to the client profile to build rapport."
    ],
    warnings: [
      "NEVER use the 'Generic Customer' for real business transactions. It is for testing only.",
      "Ensure the email address is 100% correct before saving, as this is our primary identity key."
    ]
  },
  {
    id: "logistics",
    title: "Logistics: The Mobile Rig",
    icon: Truck,
    color: "from-emerald-400 to-teal-600",
    summary: "Operating procedures for mobile detailing units and the F150 Command Center integration.",
    sections: [
      {
        title: "Mobile Command Center",
        content: "The **Mobile Setup** page is the hub for rig operations. It allows technicians to perform rig audits, check equipment status, and sync with the main shop database in real-time."
      },
      {
        title: "Visual Rig Audits",
        content: "Every morning, the rig lead must perform a visual walk-around. We use the 'Add View' button to record videos or photos of the equipment layout. This ensures that every tool is in its place and the rig is 'Job Ready'.",
        subsections: [
          {
            title: "Direct Camera Sync",
            content: "On mobile devices, you can upload photos directly from the camera to the cloud storage.",
            icon: Camera
          }
        ]
      },
      {
        title: "Equipment Inventory",
        content: "Mobile units carry a specific subset of the shop's inventory. Use the 'Equipment Pool' to track what's currently on the truck.",
        subsections: [
          {
            title: "Low Stock Sync",
            content: "When a chemical runs low on the truck, mark it immediately so the shop manager can prepare a refill for your return.",
            icon: AlertTriangle
          }
        ]
      }
    ],
    proTips: [
      "Use the 'Rig Layout' photos as a training guide for new mobile technicians.",
      "Check your water tank level and pump pressure before leaving the shop."
    ],
    warnings: [
      "Equipment not marked as 'Rig Assigned' will not appear in the mobile view.",
      "Always verify sync status (green light) before leaving a job site to ensure the customer's invoice is ready."
    ]
  },
  {
    id: "chemistry",
    title: "Chemistry: The Dilution Engine",
    icon: Beaker,
    color: "from-cyan-400 to-blue-500",
    summary: "Standard operating procedures for chemical management, Ph-scale diagnostics, and AI-driven consultations.",
    sections: [
      {
        title: "Ph-Scale Diagnostics",
        content: "Detailing is chemistry. Our SOP requires a 'Severity Assessment' before chemical selection. Light contamination gets Ph-Neutral solutions; severe contamination (Bugs, Tar, Water Spots) requires Acidic or Alkaline responses based on the substrate."
      },
      {
        title: "The Dilution Calculator",
        content: "We NEVER 'eyeball' our mixes. The Dilution Calculator ensures that we hit the professional target (e.g., 10:1 or 4:1) perfectly to maximize cleaning power while minimizing chemical waste.",
        subsections: [
          {
            title: "Smart Inventory Sync",
            content: "Changes made in the calculator or on a chemical card sync across the entire shop instantly.",
            icon: Zap
          }
        ]
      },
      {
        title: "AI Chemical Consultant",
        content: "For complex problems like paint transfer or heavy industrial fallout, use the AI Assistant. It cross-references your current shelf inventory to recommend the best product you ALREADY OWN to solve the problem.",
        subsections: [
          {
            title: "Substrate Safety",
            content: "Always mention the surface type (Leather, Raw Aluminum, Clear Coat) to the AI for safe reasoning.",
            icon: ShieldCheck
          }
        ]
      }
    ],
    proTips: [
      "Label every bottle with the dilution ratio and its current Ph-level.",
      "Use the 'Auto-Suggest' button in the checklist to get chemical recommendations based on the step name."
    ],
    warnings: [
      "Never mix chemicals without consulting the SDS (Safety Data Sheet) in the app.",
      "High-alkaline cleaners can stain raw aluminum; always test a small area first."
    ]
  },
  {
    id: "finance",
    title: "Finance: The Profit Lab",
    icon: DollarSign,
    color: "from-green-400 to-emerald-600",
    summary: "Procedures for invoicing, estimates, accounting, and financial reporting accuracy.",
    sections: [
      {
        title: "Invoicing & Estimates",
        content: "Every job must have an invoice. **Estimates** are for the sales phase; **Invoices** are for the billing phase. We use the 'Convert to Invoice' feature to ensure pricing stays consistent from quote to completion."
      },
      {
        title: "Accounting & Profitability",
        content: "We track **Gross Revenue**, **Operating Expenses**, and **Net Profit**. Our 'Net Valuation Model' includes the value of our on-shelf inventory to give us a true 'Break-Even' point.",
        subsections: [
          {
            title: "Revenue Isolation",
            content: "Testing revenue from the 'Generic Customer' is automatically excluded from all professional financial reports.",
            icon: ShieldCheck
          }
        ]
      },
      {
        title: "Payroll & Commissions",
        content: "Technicians are paid based on their tier and job performance. The system calculates these commissions automatically based on completed and paid jobs.",
        subsections: [
          {
            title: "Disbursement Log",
            content: "Always log every paycheck in the 'Payroll History' to maintain a clean tax trail.",
            icon: History
          }
        ]
      }
    ],
    proTips: [
      "Categorize all expenses (Rent, Chemicals, Marketing) for easier tax preparation.",
      "The 'Financial Summary' should balance to zero on day one, representing your initial capital investment."
    ],
    warnings: [
      "Never delete an invoice; if a mistake is made, 'Void' it instead to preserve the sequence.",
      "Payments must be logged against an invoice to count as revenue."
    ]
  },
  {
    id: "content",
    title: "Content: Elite Story Master",
    icon: Share2,
    color: "from-rose-400 to-red-600",
    summary: "Managing the brand's digital presence through the Blog AI Content Strategist and Social Blast Engine.",
    sections: [
      {
        title: "Storytelling & The Blog",
        content: "We don't just 'post photos'; we tell stories. Each entry in the Elite Story Master should highlight a specific problem we solved and the transformation we achieved."
      },
      {
        title: "AI Content Strategist",
        content: "Stuck on a caption? Use the ✨ AI button inside the blog editor. It generates viral titles, engaging story drafts, and social media hooks tailored to the specific car and service.",
        subsections: [
          {
            title: "Apply & Save",
            content: "Review the AI suggestion and click 'Apply to Post' to instantly fill your editor.",
            icon: Sparkles
          }
        ]
      },
      {
        title: "Social Blast Engine",
        content: "Don't copy-paste. Use the 🚀 Rocket button to push your content directly to Facebook, Instagram, and TikTok. For Facebook, we always send as a 'Draft' first for final review.",
        subsections: [
          {
            title: "Platform Integration",
            content: "Ensure your Page ID and Access Tokens are correctly configured in the settings tab for seamless posting.",
            icon: LayoutDashboard
          }
        ]
      }
    ],
    proTips: [
      "Use 'Before & After' sliders in your blog posts to maximize engagement.",
      "Pin your best work to the top of the feed to greet new visitors."
    ],
    warnings: [
      "Ensure all customer privacy (License Plates) is respected or blurred before publishing.",
      "Never publish AI content without a quick human proofread for accuracy."
    ]
  }
];

export default function ProceduresBooklet() {
  const [activeTab, setActiveTab] = useState(procedures[0].id);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const filteredProcedures = procedures.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeProcedure = procedures.find(p => p.id === activeTab) || procedures[0];

  const handlePrint = () => {
    setIsPrinting(true);
    // Give state time to update before printing
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  return (
    <div className={`min-h-screen ${isPrinting ? 'bg-white text-black p-0' : 'bg-[#0a0a0b] text-zinc-100 pb-20'}`}>
      
      {/* Header - Hidden on Print */}
      {!isPrinting && (
        <div className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/5 bg-black/60 px-6 py-4">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                <Book className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tighter uppercase">Prime Procedures Manual</h1>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Version 6.0 • Operational Excellence</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative group flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
                <input 
                  type="text"
                  placeholder="Search procedures..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900/50 border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs focus:ring-1 focus:ring-blue-500/50 outline-none transition-all"
                />
              </div>
              <Button onClick={handlePrint} size="sm" className="bg-blue-600 hover:bg-blue-500 text-xs font-bold gap-2">
                <Printer className="w-3.5 h-3.5" /> PDF / PRINT
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className={`max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 ${isPrinting ? 'block px-0 py-0' : ''}`}>
        
        {/* Sidebar Navigation - Hidden on Print */}
        {!isPrinting && (
          <div className="lg:col-span-3 space-y-6">
            <div className="sticky top-24 space-y-2">
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-3 mb-4">Table of Contents</h3>
              {filteredProcedures.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActiveTab(p.id)}
                  className={`w-full flex items-center gap-3 group px-4 py-3 rounded-xl transition-all ${
                    activeTab === p.id 
                      ? 'bg-blue-600/10 border border-blue-500/20 text-white' 
                      : 'hover:bg-white/5 border border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <p.icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${activeTab === p.id ? 'text-blue-400' : ''}`} />
                  <span className="text-xs font-bold uppercase tracking-tight text-left">{p.title}</span>
                  {activeTab === p.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className={`${isPrinting ? 'col-span-12' : 'lg:col-span-9'} space-y-12`} ref={contentRef}>
          
          {/* Active Page Rendering */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Page Hero */}
            <div className={`relative rounded-3xl overflow-hidden p-8 md:p-12 mb-12 bg-gradient-to-br ${activeProcedure.color} ${isPrinting ? 'bg-none text-black p-4 border-b-2 mb-8' : ''}`}>
              {!isPrinting && (
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[100px] -mr-32 -mt-32 rounded-full" />
              )}
              <div className="relative z-10 space-y-4">
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-none text-[10px] uppercase font-black tracking-widest px-3 py-1">
                  Manual Section
                </Badge>
                <div className="flex items-center gap-6">
                  <div className={`w-16 h-16 rounded-2xl ${isPrinting ? 'hidden' : 'bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-2xl'}`}>
                    <activeProcedure.icon className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase italic">
                    {activeProcedure.title}
                  </h1>
                </div>
                <p className="text-lg md:text-xl text-white/80 max-w-2xl font-medium leading-relaxed">
                  {activeProcedure.summary}
                </p>
              </div>
            </div>

            {/* Main Content Sections */}
            <div className="space-y-16">
              {activeProcedure.sections.map((section, idx) => (
                <div key={idx} className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 font-black text-sm border border-zinc-800">
                      0{idx + 1}
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-white border-b-2 border-zinc-800 pb-2 flex-1">
                      {section.title}
                    </h2>
                  </div>
                  
                  <p className="text-zinc-400 text-lg leading-relaxed font-medium pl-14">
                    {section.content}
                  </p>

                  {section.subsections && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-14 mt-8">
                      {section.subsections.map((sub, sIdx) => (
                        <Card key={sIdx} className="bg-zinc-900/40 border-zinc-800/50 backdrop-blur-sm hover:border-zinc-700 transition-colors">
                          <CardContent className="p-6 space-y-3">
                            <div className="flex items-center gap-3">
                              {sub.icon && (
                                <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                                  <sub.icon className="w-4 h-4 text-zinc-400" />
                                </div>
                              )}
                              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-200">
                                {sub.title}
                              </h3>
                            </div>
                            <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                              {sub.content}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pros & Cons / Tips & Warnings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-20 pt-12 border-t border-zinc-900">
              
              {/* Pro Tips */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full w-fit">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Procedural Pro-Tips</span>
                </div>
                <div className="space-y-4">
                  {activeProcedure.proTips.map((tip, i) => (
                    <div key={i} className="flex gap-4 group">
                      <div className="w-6 h-6 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-800 text-emerald-400 font-bold text-xs group-hover:scale-110 transition-transform">
                        {i + 1}
                      </div>
                      <p className="text-sm text-zinc-400 leading-relaxed font-medium italic">
                        "{tip}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warnings */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-full w-fit">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Critical Warnings</span>
                </div>
                <div className="space-y-4">
                  {activeProcedure.warnings.map((warning, i) => (
                    <div key={i} className="flex gap-4 group">
                      <div className="w-6 h-6 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-800 text-rose-400 font-bold text-xs group-hover:scale-110 transition-transform">
                        !
                      </div>
                      <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                        {warning}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Page Footer */}
            <div className="mt-32 p-12 rounded-[40px] bg-zinc-900/30 border border-zinc-800 text-center space-y-6 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
               <Info className="w-12 h-12 text-zinc-700 mx-auto" />
               <div className="space-y-2">
                 <h3 className="text-xl font-black uppercase tracking-tighter text-zinc-300">Need more technical detail?</h3>
                 <p className="text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
                   The technical reference guide contains 50+ additional topics on specific chemical ratios and software configurations.
                 </p>
               </div>
               <Button variant="outline" className="border-zinc-800 text-zinc-400 hover:bg-zinc-800 uppercase text-[10px] font-black tracking-widest px-8">
                 Jump to Technical Guide
               </Button>
            </div>
          </div>

          {/* Print Version - Extra Pages */}
          {isPrinting && (
            <div className="break-before-page pt-20">
              <h1 className="text-4xl font-black mb-10 border-b-4 border-black pb-4 uppercase italic">End of Document</h1>
              <div className="p-10 border-4 border-black rounded-3xl">
                <p className="text-sm leading-relaxed mb-6">
                  This document is a serialized export from the Prime Auto Detail master operational database. All procedures outlined herein are binding for all staff members.
                </p>
                <div className="grid grid-cols-2 gap-10 mt-20">
                  <div className="border-t-2 border-black pt-2">
                    <p className="text-[10px] font-black uppercase">Administrator Signature</p>
                  </div>
                  <div className="border-t-2 border-black pt-2">
                    <p className="text-[10px] font-black uppercase">Date of Review</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button for Next/Prev - Hidden on Print */}
      {!isPrinting && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 rounded-full bg-zinc-900/80 backdrop-blur-xl border border-white/5 shadow-2xl z-50">
          <Button 
            variant="ghost" 
            size="sm" 
            disabled={activeTab === procedures[0].id}
            onClick={() => {
              const idx = procedures.findIndex(p => p.id === activeTab);
              setActiveTab(procedures[idx - 1].id);
            }}
            className="text-zinc-400 hover:text-white"
          >
            <ChevronRight className="w-4 h-4 rotate-180 mr-2" /> Prev
          </Button>
          <div className="h-4 w-px bg-zinc-800" />
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest min-w-[80px] text-center">
            {procedures.findIndex(p => p.id === activeTab) + 1} / {procedures.length}
          </p>
          <div className="h-4 w-px bg-zinc-800" />
          <Button 
            variant="ghost" 
            size="sm"
            disabled={activeTab === procedures[procedures.length - 1].id}
            onClick={() => {
              const idx = procedures.findIndex(p => p.id === activeTab);
              setActiveTab(procedures[idx + 1].id);
            }}
            className="text-blue-400 hover:text-blue-300"
          >
            Next <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* CSS for Print Optimization */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
          }
          .min-h-screen {
            min-height: auto !important;
            background: white !important;
          }
          @page {
            margin: 2cm;
          }
          .break-before-page {
            break-before: page;
          }
          h1, h2, h3 {
            color: black !important;
          }
          p, span {
            color: #333 !important;
          }
          .bg-gradient-to-br {
            background: none !important;
            border-bottom: 2px solid black !important;
          }
          .bg-zinc-900, .bg-zinc-900\/50, .bg-black {
            background: transparent !important;
            border-color: #eee !important;
          }
          .text-white, .text-zinc-100 {
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
}
