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
    id: "admin-core",
    title: "01: The Administrative Core",
    icon: LayoutDashboard,
    color: "from-blue-600 to-indigo-700",
    summary: "Managing the nerve center of Prime Auto Detail. From the Central Hub to Website Administration and global settings.",
    sections: [
      {
        title: "Prime Central Hub & Alerts",
        content: "The Central Hub is the first screen every administrator should review upon start-of-day. It aggregates real-time metrics from active jobs, pending bookings, and financial performance. Administrators use this view to monitor the 'Shop Pulse' and respond to system-wide alerts. Every morning should begin here to assess resource allocation and identify urgent follow-ups.",
        subsections: [
          {
            title: "Real-time Sync",
            content: "The Hub utilizes a bidirectional bridge to ensure that a checkmark on a mobile technician's phone reflects instantly on the Admin's desktop.",
            icon: Zap
          }
        ]
      },
      {
        title: "Website Administration",
        content: "This portal manages the 'Public Face' of your business. It allows you to toggle service availability, update pricing packages, and manage your 'Elite Transformations' gallery. Ensuring your Website Admin settings match your shop's actual capacity is critical to prevent over-booking and maintaining customer trust.",
        subsections: [
          {
            title: "Live Booking Control",
            content: "Enable or disable specific slots and set SUV/Truck premiums that apply instantly to the online booking portal.",
            icon: Settings
          }
        ]
      },
      {
        title: "Personal Notes & System Settings",
        content: "Operational efficiency relies on tracking the small details. Personal Notes are tied to your admin profile and persist across devices—perfect for internal 'To-Dos'. System Settings control your shop identity: tax rates, labor costs, and currency. Accuracy here ensures every invoice and report is legally compliant.",
        subsections: [
          {
            title: "Internal Audits",
            content: "Use the 'Private' toggle on notes to document employee performance or strategy ideas.",
            icon: Clock
          }
        ]
      }
    ],
    proTips: [
      "Check the 'Alerts' panel in the Hub every 2 hours to stay ahead of new lead inquiries.",
      "Use 'Website Admin' to push seasonal specials (e.g. 'Winter Salt Neutralizer') to the front page."
    ],
    warnings: [
      "Public-facing website changes take effect immediately; always verify in a 'Customer View' tab.",
      "Incorrect Tax rates in Settings can lead to significant accounting errors; verify these with your CPA."
    ]
  },
  {
    id: "financial-intelligence",
    title: "02: Financial Intelligence",
    icon: BarChart3,
    color: "from-indigo-600 to-violet-800",
    summary: "Transforming revenue into strategy. Mastering Finance, Sales Reports, and Business Goals.",
    sections: [
      {
        title: "Finance & Sales Ledger",
        content: "Professionalism is measured in numbers. The Finance module provides a complete ledger of Income vs. Expenses. We use a 'Net Valuation' model: your profit accounts for both cash on hand and the value of your shelf inventory. This provides a true 'Break-Even' point for your initial capital investment.",
        subsections: [
          {
            title: "Invoicing & Payments",
            content: "Manage the complete billing lifecycle. Mark jobs as 'Paid' to instantly move revenue into your accounting ledger.",
            icon: DollarSign
          }
        ]
      },
      {
        title: "Analytics & Reports Center",
        content: "The Reports Center is your business intelligence hub. It aggregates live data from every corner of the shop. Use 'Temporal Scanning' (Date Filters) to analyze performance by day, week, month, or custom range. This allows you to identify seasonal trends and high-margin services.",
        subsections: [
          {
            title: "Sales Tax Audits",
            content: "Generate PDF reports for Sales Tax and Deductible Expenses with one click to simplify your quarterly filings.",
            icon: FileText
          }
        ]
      },
      {
        title: "Business Goals & Milestones",
        content: "Turning targets into reality. Use the Goals module to set monthly revenue quotas or job-count milestones. The system provides a visual progress gauge that motivates the entire team. Goals are automatically updated as jobs are marked 'Paid', ensuring 100% accuracy.",
        subsections: [
          {
            title: "Progress Tracking",
            content: "Set revenue targets, booking counts, or CSAT scores to gamify shop performance.",
            icon: Target
          }
        ]
      }
    ],
    proTips: [
      "Aim for a 20% Net Profit margin after factoring in all chemical and labor costs.",
      "Compare this month's analytics to the same month last year to identify seasonal growth trends."
    ],
    warnings: [
      "Incomplete expense logging will result in 'False Positive' profit reports; be meticulous.",
      "Never mix Personal and Business expenses in the ledger to maintain IRS compliance."
    ]
  },
  {
    id: "asset-management",
    title: "03: Asset & Media Management",
    icon: Database,
    color: "from-emerald-600 to-teal-800",
    summary: "Organizing the physical and digital artifacts of the business. Vehicle Gallery, File Manager, and Inventory (2).",
    sections: [
      {
        title: "The Vehicle Gallery",
        content: "Your work is your best advertisement. The Vehicle Gallery stores every 'Before' and 'After' transformation. Images are automatically tagged by vehicle type and customer name. This gallery feeds into the 'Elite Stories' blog and provides a legal condition archive for every vehicle that enters the shop.",
        subsections: [
          {
            title: "High-Res Evidence",
            content: "Photos uploaded here serve as a legal record of the vehicle's condition upon entry and exit.",
            icon: ShieldCheck
          }
        ]
      },
      {
        title: "File Manager & Asset Pool",
        content: "Hardware and Documentation are the foundation of your shop. The **File Manager** stores insurance, leases, and SDS sheets. The **Asset Pool** (Inventory & Assets 2) tracks physical hardware: buffers, pressure washers, and extractors. Every asset has a 'Maintenance Schedule' alert.",
        subsections: [
          {
            title: "Asset Depletion",
            content: "The system calculates the depreciation of your hardware to provide accurate tax deductions.",
            icon: BarChart3
          }
        ]
      },
      {
        title: "Inventory Control (Consumables)",
        content: "Never run out of product during a job. Inventory Control tracks your 'consumables' (Chemicals, Towels, Pads). Set 'Low Threshold' alerts to trigger restock notifications. The system integrates directly with the 'Prep Summary' to ensure your mobile rigs are always fully loaded.",
        subsections: [
          {
            title: "Smart Sync Engine",
            content: "Audits your entire shop for unlinked items and links them to the Chemical Knowledge Base.",
            icon: Zap
          }
        ]
      }
    ],
    proTips: [
      "Tag photos in the gallery with keywords like 'Ceramic' or 'Pet Hair' for faster marketing searches.",
      "Set your 'Low Stock' alert to trigger when you have 1 gallon of chemical left."
    ],
    warnings: [
      "Large video files can slow down the sync; use the 'Optimize for Web' button when uploading.",
      "Missing asset maintenance (e.g. polisher brushes) can lead to equipment failure during a job."
    ]
  },
  {
    id: "operational-logistics",
    title: "04: Operational Logistics",
    icon: Cpu,
    color: "from-rose-600 to-red-800",
    summary: "The master workflow of Prime Auto Detail. Mastering the Bookings lifecycle and the high-precision Service Checklist.",
    sections: [
      {
        title: "Bookings & Appointment Lifecycle",
        content: "The Booking system is the engine of our revenue. The lifecycle begins when a customer submits a request via the 'Book Now' portal. 1. **Initial Lead**: The request appears in the Central Hub for review. 2. **Verification**: Admins check for vehicle size accuracy and service availability. 3. **Confirmation**: Once approved, an automated confirmation email is sent with a calendar invite. 4. **Pre-Arrival**: The system sends a reminder 24 hours prior. This end-to-end automation ensures a zero-friction experience for the client while protecting the shop's schedule.",
        subsections: [
          {
            title: "Lead Management",
            content: "Leads must be converted to 'Confirmed' within 4 hours to maintain a high customer acquisition rate.",
            icon: Search
          },
          {
            title: "Calendar Sync",
            content: "The system bi-directionally syncs with the shop's Google Calendar to prevent double-booking mobile rigs.",
            icon: History
          }
        ]
      },
      {
        title: "The Master Service Checklist (Detailed)",
        content: "The Service Checklist is our technical 'Source of Truth'. It dictates exactly how a vehicle is transformed. **Step 1: Arrival & Intake**: The tech performs a walk-around, noting pre-existing damage. **Step 2: Execution**: The tech follows the categorical steps (Exterior, Interior, Protection). Each step is timestamped for efficiency tracking. **Step 3: Verification**: High-resolution 'After' photos are mandatory for every package. **Step 4: Final Sign-off**: The tech presents the results to the client, who provides a digital signature directly on the mobile device. This process guarantees 100% consistency and eliminates liability.",
        subsections: [
          {
            title: "Step-by-Step Precision",
            content: "Every item in the checklist must be green-lit or skipped with a valid technical reason.",
            icon: CheckCircle2
          },
          {
            title: "Digital Sign-Off",
            content: "The client's signature is automatically embedded into the final PDF invoice as a permanent record.",
            icon: ShieldCheck
          }
        ]
      },
      {
        title: "Active Jobs & Job History",
        content: "The **Active Jobs** view is the live dashboard for technicians in the field. It shows their current timer, assigned rig, and client contact info. Once a job is finished and the signature is captured, it moves to **Job History**. The History module is a permanent archive used for returning customer research and revenue audits. Never delete a history record; use it to identify 'Legacy Add-ons' the client previously purchased.",
        subsections: [
          {
            title: "Timer Accuracy",
            content: "Technicians must start the timer the moment they arrive to ensure accurate 'Labor per Hour' reporting.",
            icon: Clock
          },
          {
            title: "Historical Audits",
            content: "Access previous condition reports to ensure we are not held liable for old damages.",
            icon: History
          }
        ]
      },
      {
        title: "View As (Role Simulation)",
        content: "The 'View As' tool is a powerful administrative feature that allows you to see the app exactly as an Employee or a Customer would. This is essential for: 1. **Staff Training**: Verifying that a new technician only sees their assigned checklists. 2. **UI Testing**: Ensuring that a new service package displays correctly in the customer's booking portal. 3. **Troubleshooting**: Diagnosing what a user is seeing in real-time without needing their credentials. It is the ultimate tool for verifying the 'User Experience' at every level.",
        subsections: [
          {
            title: "Safe Simulation",
            content: "Simulating a role does not affect your administrative permissions; it simply filters the UI view.",
            icon: Users
          }
        ]
      }
    ],
    proTips: [
      "Use the 'Active Job' timer to compare real-world performance against estimated labor hours.",
      "Review the 'Job History' before arriving at a repeat client's house to wow them with your memory."
    ],
    warnings: [
      "Skipping checklist steps without a note is a violation of shop protocol and voids service warranties.",
      "A job cannot be moved to 'Paid' until a digital signature has been captured and verified."
    ]
  },
  {
    id: "chemical-science",
    title: "05: Chemical Science",
    icon: Beaker,
    color: "from-cyan-500 to-blue-700",
    summary: "The technical advantage. Chemicals Library, Label System, and Ph Diagnostics.",
    sections: [
      {
        title: "Chemicals Library & AI Assistant",
        content: "Professional detailing is chemistry. The Chemicals Library stores the 'Ph-Profile' and SDS sheets for every product. Use the AI Assistant to cross-reference your inventory with specific contaminants (like Tree Sap or Concrete Dust) for the safest and most effective chemical response.",
        subsections: [
          {
            title: "Master Ratio Sync",
            content: "Updating a ratio on a chemical card instantly propagates that change to every checklist.",
            icon: Zap
          }
        ]
      },
      {
        title: "OSHA Label System (QR Codes)",
        content: "Safety and compliance are non-negotiable. The app generates OSHA-compliant labels for every secondary bottle. Each label includes a QR code that, when scanned by a technician's phone, opens the exact dilution instructions and safety warnings for that chemical.",
        subsections: [
          {
            title: "Visual Standardization",
            content: "Color-coded labels ensure that 'Acidic' chemicals are never confused with 'Alkaline' ones.",
            icon: AlertTriangle
          }
        ]
      },
      {
        title: "Dilution Engine & Diagnostics",
        content: "We never 'eyeball' our mixes. The Dilution Calculator provides precise measurements based on target ratios (e.g. 10:1). The Ph Diagnostic tool helps you choose the right chemical for the substrate—Acidic for mineral spots, Alkaline for organic grime, and Ph-Neutral for preservation.",
        subsections: [
          {
            title: "Cost per Ounce",
            content: "The engine calculates the 'Ready-to-Use' cost to help you refine your package pricing.",
            icon: DollarSign
          }
        ]
      }
    ],
    proTips: [
      "Print fresh labels every quarter to ensure all safety QR codes remain scannable.",
      "Use Ph-Neutral chemicals for 90% of maintenance washes to preserve existing coatings."
    ],
    warnings: [
      "Never mix incompatible chemicals; use the AI compatibility checker before experimenting.",
      "Unlabeled secondary bottles are a safety violation and can lead to expensive surface damage."
    ]
  },
  {
    id: "staff-education",
    title: "06: Staff & Education",
    icon: Book,
    color: "from-purple-600 to-fuchsia-800",
    summary: "Managing the team. Staff Management, Learning Center, and Commission Logic.",
    sections: [
      {
        title: "Staff Management & Schedules",
        content: "Control who sees what. The system utilizes Role-Based Access Control (RBAC). **Admins** see the financials; **Employees** see the checklists. Use the Management page to set these roles and track technician performance through 'Checklist Audit Scores' and schedule assignments.",
        subsections: [
          {
            title: "Technician Tracking",
            content: "Monitor job completion times and quality scores to identify top-performing staff.",
            icon: Users
          }
        ]
      },
      {
        title: "Prime Learning Center",
        content: "Continuous education is our secret weapon. The Learning Center contains video tutorials, safety quizzes, and these very procedures. Every new hire must complete the 'Prime Foundation' course and pass the exam before they are assigned their first client vehicle.",
        subsections: [
          {
            title: "Digital Handbooks",
            content: "Access this Procedures Manual directly from the Learning Center for on-the-job reference.",
            icon: Book
          }
        ]
      },
      {
        title: "Commissions & Payroll",
        content: "Pay your team accurately. The Payroll module automatically calculates technician commissions based on their Tier (Level 1-5) and the jobs they have marked as 'Paid'. This eliminates manual accounting errors and provides technicians with a clear view of their earnings.",
        subsections: [
          {
            title: "Tiered Growth",
            content: "Technicians earn higher commissions as their 'Quality Score' increases in the system.",
            icon: Trophy
          }
        ]
      }
    ],
    proTips: [
      "Review the 'Staff Leaderboard' during weekly meetings to reward the highest quality scores.",
      "Assign 'Self-Study' modules in the Learning Center during rain delays or shop downtime."
    ],
    warnings: [
      "Unauthorized access to Payroll can lead to data privacy breaches; restrict Admin roles strictly.",
      "Never allow a technician to perform a service they haven't completed the Learning module for."
    ]
  },
  {
    id: "marketing-retention",
    title: "07: Marketing & Retention",
    icon: Mail,
    color: "from-amber-600 to-orange-800",
    summary: "Closing the loop. Retention Engine, Follow-up Center, and AI Blog.",
    sections: [
      {
        title: "Marketing & Retention Engine",
        content: "Acquisition is expensive; retention is profitable. The Retention Engine monitors every client's 'Maintenance Cycle'. It identifies who is due for a wash or ceramic refresh (Monthly, Quarterly, etc.) and provides personalized outreach templates and SMS/Email reminders.",
        subsections: [
          {
            title: "Personalized Outreach",
            content: "Embed loyalty coupons directly into retention emails to reward repeat business.",
            icon: Sparkles
          }
        ]
      },
      {
        title: "Email Campaigns & Sender Domain Setup",
        content: "Operationalizing outreach campaigns and configuring the delivery infrastructure. To prevent marketing emails from being marked as spam or blocked by email sandboxes, a verified business domain is required. Administrators utilize Supabase Secrets to control sender emails dynamically, while utilizing the BCC toggle to verify delivery.",
        subsections: [
          {
            title: "Outreach Campaigns",
            content: "Choose from 6 customer and 4 prospect campaigns (e.g., Seasonal Refresh, Ceramic Coating Booster, VIP Invites) to instantly load targeted drafts.",
            icon: Sparkles
          },
          {
            title: "Resend Custom Domains",
            content: "Verify your domain on Resend and run 'supabase secrets set SENDER_EMAIL' to send from your custom email to all clients.",
            icon: Settings
          }
        ]
      },
      {
        title: "The AI Blog (Elite Stories)",
        content: "Turn your gallery photos into marketing content. The AI Blog assistant analyzes your 'Before & After' shots to write professional, SEO-optimized blog posts about the transformations. These stories are published to your website, driving organic search traffic to your booking portal.",
        subsections: [
          {
            title: "Social Blast",
            content: "Push your best 'Transformations' directly to social media from the marketing hub.",
            icon: Share2
          }
        ]
      }
    ],
    proTips: [
      "Set a 'Quarterly' maintenance cycle for every Ceramic Coating client for warranty compliance.",
      "Use the 'Engagement History' tab to see exactly when and how you last contacted a client.",
      "Use outreach campaigns like 'Ceramic Coating Booster Care' to drive high-margin repeat booking volume."
    ],
    warnings: [
      "Over-marketing to the retention list can lead to high unsubscribe rates; limit automated emails.",
      "Ensure all AI-generated blog content is reviewed for technical accuracy before publishing.",
      "When in testing mode, Resend restricts sending to the verified developer account owner only. Update the SENDER_EMAIL secret once your domain is live."
    ]
  },
  {
    id: "data-security",
    title: "08: Data & Security",
    icon: ShieldCheck,
    color: "from-slate-600 to-zinc-900",
    summary: "The bedrock of the app. Privacy, Database Integrity, and System Backups.",
    sections: [
      {
        title: "Privacy & Data Protection",
        content: "Customer trust is built on privacy. The system follows strict 'Privacy First' protocols. This means personal calendar details are never exposed, and customer contact info is only visible to authorized personnel. All data is encrypted during transit to the Supabase cloud.",
        subsections: [
          {
            title: "Secure Access",
            content: "Uses industry-standard OAuth 2.0 and session management to prevent unauthorized access.",
            icon: ShieldCheck
          }
        ]
      },
      {
        title: "Database Integrity & Backups",
        content: "Your business data is your most valuable asset. The system performs automated 'Point-in-Time' backups to the cloud. Deleting a record is a 3-step process to prevent accidental loss. Always 'Archive' inactive records instead of deleting to maintain your service history for tax purposes.",
        subsections: [
          {
            title: "Audit Trail",
            content: "Every modification to a job or financial record is timestamped and tied to a specific user.",
            icon: History
          }
        ]
      }
    ],
    proTips: [
      "Perform a monthly 'Data Audit' to ensure all customer records have valid phone numbers and emails.",
      "Set your 'Session Timeout' to 1 hour on shared shop tablets."
    ],
    warnings: [
      "A deletion is permanent and cannot be undone; use 'Archive' as your first course of action.",
      "Sharing Admin credentials is a violation of shop security policy and voids technical support."
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
                  Manual Chapter
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
                <div key={idx} className="space-y-6 break-inside-avoid-page">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 font-black text-sm border border-zinc-800">
                      {idx + 1}
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
                        <Card key={sIdx} className="bg-zinc-900/40 border-zinc-800/50 backdrop-blur-sm hover:border-zinc-700 transition-colors break-inside-avoid">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-20 pt-12 border-t border-zinc-900 break-inside-avoid-page">
              
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
            {!isPrinting && (
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
            )}
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
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .min-h-screen {
            min-height: auto !important;
            background: white !important;
          }
          @page {
            margin: 1.5cm;
            size: auto;
          }
          .break-inside-avoid {
            break-inside: avoid;
          }
          .break-inside-avoid-page {
            break-inside: avoid-page;
          }
          .break-before-page {
            break-before: page;
          }
          h1, h2, h3 {
            color: black !important;
          }
          p, span {
            color: #111 !important;
          }
          .bg-gradient-to-br {
             border-bottom: 4px solid #333 !important;
             background-color: #f8f9fa !important;
             border-radius: 0 !important;
          }
          .bg-zinc-900, .bg-zinc-900\/50, .bg-black {
            background: transparent !important;
            border-color: #ccc !important;
          }
          .text-white, .text-zinc-100 {
            color: black !important;
          }
          .Card, .CardContent {
             border: 1px solid #ddd !important;
             background: #fff !important;
          }
        }
      `}</style>
    </div>
  );
}
