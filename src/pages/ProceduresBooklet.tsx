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
  ArrowRight,
  ListChecks,
  MessageSquare,
  PhoneCall,
  Sliders,
  Calendar,
  Lock,
  Grid
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
    summary: "Managing the nerve center of Prime Auto Detail. From the Central Hub and Website Administration to dynamic role-based sidebars and security settings.",
    sections: [
      {
        title: "Prime Central Hub & Real-Time Sync",
        content: "The Central Hub is the primary operational dashboard for shop leadership. It provides instant visibility into active workload metrics, pending bookings, chemical stock alerts, and daily revenue pulse. The system utilizes a bidirectional real-time bridge so that a technician marking a checklist item complete on a mobile device instantly updates the desktop view in the office.",
        subsections: [
          {
            title: "Real-time Sync",
            content: "Bidirectional state bridge ensures mobile field detailer actions reflect instantly on admin desktop monitors.",
            icon: Zap
          },
          {
            title: "Shop Pulse Monitoring",
            content: "Aggregates active jobs, unassigned bookings, low inventory thresholds, and unread team messages into one screen.",
            icon: LayoutDashboard
          }
        ]
      },
      {
        title: "Website Administration & Operational Modes",
        content: "Controls the public-facing storefront at primeautodetail.net. Administrators manage service availability, package rates, facility disclaimers, and 5 distinct Operational Status Modes: Live Mode (full public bookings), Pre-Launch Mode (coming soon state), Winter Pause (seasonal off-season mode), Marketing Specials (sales campaigns with growing dropdown catalog & custom presets), and Custom Mode (full custom outage banner text). Testimonials can be toggled on or off on the home page and have been streamlined out of the About page to avoid redundancy. The Methuen facility notice displays 'We are serving customers exclusively at our state-of-the-art Methuen facility. Come visit us (By Appointment Only) for a premium experience!' without exposing private street addresses.",
        subsections: [
          {
            title: "Operational Status Modes",
            content: "Select from 5 presets (Live, Pre-Launch, Winter Pause, Marketing Specials catalog, Custom) to control booking access and public banners.",
            icon: Sparkles
          },
          {
            title: "Facility Banner & Privacy",
            content: "Default Methuen facility banner promotes appointment-only service without revealing private residential address details.",
            icon: ShieldCheck
          },
          {
            title: "Testimonials Control",
            content: "Toggle public home-page testimonials on/off. Streamlined out of About page to maintain clean visual presentation.",
            icon: Star
          }
        ]
      },
      {
        title: "Role-Based Navigation & Dynamic Sidebar",
        content: "The right-side icon bar dynamically mirrors the active user role (Admin, Employee, or Customer). Admin mode exposes instant shortcuts to Financials, Quick Pay, SOPs, Customers, Bookings, Inventory, and Settings. Employee mode presents Employee Dashboard, Active Jobs, Checklist, SOPs, Sticky Notes, Tasks, and Gallery. Customer mode displays Customer Dashboard, Vehicle Garage, Service History, Invoices, and Booking portal.",
        subsections: [
          {
            title: "Dynamic Icon Sidebar",
            content: "Right-side icon navigation bar automatically adapts to Admin, Employee, or Customer access rights.",
            icon: Sliders
          },
          {
            title: "SOPs Icon Placement",
            content: "Positioned directly under Checklist in Employee sidebar and under Quick Pay in Admin sidebar using the cyan ListChecks icon.",
            icon: ListChecks
          }
        ]
      },
      {
        title: "Application Settings & Security Kill-Switch",
        content: "Application Master Settings controls tax rates, labor targets, currency, and public URL security. Administrators can toggle the public /demo URL Security Kill-Switch to instantly block external public access, select custom outage reasons (Maintenance, Security Audit, Private Training), while retaining internal Admin Preview Mode for safe staff onboarding.",
        subsections: [
          {
            title: "Demo URL Security Kill-Switch",
            content: "Instantly disable public /demo URL access with custom outage status messages while preserving internal Admin Preview Mode.",
            icon: Lock
          }
        ]
      }
    ],
    proTips: [
      "Check the Central Hub alerts every morning to address unassigned appointments and low-inventory warnings.",
      "Use Marketing Specials mode during slow mid-week periods to push targeted seasonal package discounts to primeautodetail.net."
    ],
    warnings: [
      "Public website admin updates take effect immediately on primeautodetail.net; always verify changes in an incognito Customer View tab.",
      "Flipping the Demo Security Kill-Switch to OFF revokes public demo access immediately; keep Admin Preview Mode enabled for internal training."
    ]
  },
  {
    id: "customer-intake",
    title: "02: Customer Intake & Sales",
    icon: Users,
    color: "from-sky-600 to-cyan-800",
    summary: "Master customer relationships, multi-vehicle bookings, interactive quotes, and sales tools.",
    sections: [
      {
        title: "Customer Intelligence 360",
        content: "Customer Intelligence 360 is the centralized CRM research hub. It aggregates total customer lifetime value, full vehicle garage history, transaction ledgers, photo archives, and engagement audit logs. The system maintains strict separation between customer CRM records and employee accounts: employee credentials (e.g. Paul Dickerson) sign into the Employee Dashboard, while their vehicle service records as a customer can be managed in Customer Intelligence 360.",
        subsections: [
          {
            title: "360-Degree Profile",
            content: "Review lifetime spend, past invoices, vehicle specs, and preferred chemical scents in one place.",
            icon: Users
          },
          {
            title: "Account Isolation",
            content: "Employees logging into the app access their Employee Dashboard; vehicle service customer records are accessed via CI 360.",
            icon: ShieldCheck
          }
        ]
      },
      {
        title: "Prospect vs. Customer Smart Logic",
        content: "When entering new leads, the system enforces a 4-step smart deduplication check: 1. Email Lookup $\rightarrow$ 2. Name Match $\rightarrow$ 3. Phone Verification $\rightarrow$ 4. New Prospect Creation. Leads who have not booked are stored as Prospects to keep customer metrics clean. One-click conversion moves a prospect to Customer status as soon as their first booking or estimate is approved.",
        subsections: [
          {
            title: "4-Step Smart Dedup",
            content: "Checks email, name, and phone before creating records to prevent duplicate profiles and lost history.",
            icon: Search
          },
          {
            title: "1-Click Conversion",
            content: "Convert leads to full Customer status with a single click upon appointment confirmation.",
            icon: CheckCircle2
          }
        ]
      },
      {
        title: "Multi-Vehicle Bookings & Interactive Estimates",
        content: "The booking engine supports appending multiple vehicles to a single appointment slot, applying vehicle-specific package multipliers and add-ons per car. The Estimates module generates professional PDF quotes with flat-rate or percentage-based discounts. Toggling an estimate to 'Sent' automatically injects an engagement log into the client's CRM history.",
        subsections: [
          {
            title: "Multi-Vehicle Support",
            content: "Attach multiple cars to one client booking with size-based pricing for each vehicle.",
            icon: Truck
          },
          {
            title: "CRM Engagement Sync",
            content: "Marking an estimate as 'Sent' automatically logs an audit entry in the client's Customer 360 timeline.",
            icon: History
          }
        ]
      },
      {
        title: "Phone Assistant Utility & Promo Codes",
        content: "The floating Phone Assistant utility provides quick-access call scripts, pricing packages, and direct lead capture tools for handling incoming sales calls without leaving the active screen. The Promo Code manager enables setting flat or percentage discounts with vehicle-type and expiration date restrictions.",
        subsections: [
          {
            title: "Floating Call Assistant",
            content: "Inquiry scripts and direct lead capture modal accessible from any page via the phone icon.",
            icon: PhoneCall
          },
          {
            title: "Promo Code Rules",
            content: "Configure discount codes with start/end dates, usage limits, and vehicle classification rules.",
            icon: Sparkles
          }
        ]
      }
    ],
    proTips: [
      "Always search by phone number or email before creating a new customer to maintain flawless service history.",
      "Use the Phone Assistant's objection-handling scripts when clients compare professional detailing to standard car washes."
    ],
    warnings: [
      "Creating duplicate customer records fragments vehicle inspection archives and revenue reports.",
      "Estimates must be converted to Active Bookings before technician checklists can be initiated."
    ]
  },
  {
    id: "operations-scheduling",
    title: "03: Operations & Scheduling",
    icon: Cpu,
    color: "from-rose-600 to-red-800",
    summary: "The operational heartbeat. Bookings lifecycle, active job timer, SOPs navigation, and the Master Service Checklist.",
    sections: [
      {
        title: "Bookings & Appointment Lifecycle",
        content: "The Booking Manager coordinates daily shop capacity. Appointments progress through 6 stages: Lead Inquiry $\rightarrow$ Vehicle Assessment $\rightarrow$ Confirmed Schedule $\rightarrow$ Service Execution $\rightarrow$ Completed Invoice $\rightarrow$ Retention Cycle. The calendar offers Day, Week, and Month views, while the sidebar displays a live blue badge indicating active pending workload.",
        subsections: [
          {
            title: "Workload Count Badge",
            content: "Sidebar badge displays active jobs (Tentative, Confirmed, In Progress) and decrements when jobs reach Done.",
            icon: Calendar
          },
          {
            title: "Hybrid Availability Sync",
            content: "Google Calendar sync prevents double-booking mobile units while allowing manual shop overrides.",
            icon: History
          }
        ]
      },
      {
        title: "The Master Service Checklist (Local-First Architecture)",
        content: "Engineered with a 'Local-First' architecture using browser localStorage. Technicians can check off steps in low-cell service areas without losing data. 'Save Progress' saves the current active state locally on that specific device. 'FINISH & COMPLETE JOB' stops the master timer, archives the work to a PDF, creates the official invoice, and clears the queue. 'Discard & Leave' completely wipes local state, while the orange 'Reset' button clears the current form back to template defaults without deleting history logs.",
        subsections: [
          {
            title: "Save Progress vs Finish",
            content: "Save Progress retains active local state; Finish & Complete Job finalizes timer, generates invoice, and archives session.",
            icon: CheckCircle2
          },
          {
            title: "Discard vs Reset Logic",
            content: "Discard & Leave wipes localStorage state; Reset resets active checklist items without deleting log entries.",
            icon: AlertTriangle
          }
        ]
      },
      {
        title: "Active Jobs & Admin Duration Editing",
        content: "Active Jobs displays live technician timers and client info. If a technician forgets to check off a step on time, Administrators can click directly on the yellow duration badge to manually edit recorded time in mm:ss format without disrupting the master job clock.",
        subsections: [
          {
            title: "Yellow Badge Time Edit",
            content: "Admins can click the yellow duration badge on any checklist item to enter manual mm:ss time adjustments.",
            icon: Clock
          }
        ]
      },
      {
        title: "SOPs Navigation & Precision Scroll Clearance",
        content: "Standard Operating Procedures (SOPs) are accessible via the cyan ListChecks icon in the right-side menu (located under Checklist in Employee mode and under Quick Pay in Admin mode). Navigating to /training-manual?tab=process includes an automated 100px top scroll clearance so the SOPs title lands cleanly below the sticky app bar without being obscured.",
        subsections: [
          {
            title: "Cyan ListChecks Icon",
            content: "Standardized SOPs icon across Global Sidebar, Training Center, and SOPs page headers.",
            icon: ListChecks
          },
          {
            title: "100px Top Clearance",
            content: "Scroll landing offset guarantees the SOPs header title remains fully visible below top sticky navigation.",
            icon: ArrowRight
          }
        ]
      }
    ],
    proTips: [
      "Use 'Save Progress' when taking lunch breaks to keep active timer states intact on your mobile device.",
      "Admins should review yellow badge time edits weekly to audit technician efficiency calculations."
    ],
    warnings: [
      "Hitting 'FINISH & COMPLETE JOB' permanently closes the active checklist session and creates an invoice.",
      "Local-first checklist data is browser-specific; complete active jobs on the same device used to start them."
    ]
  },
  {
    id: "financial-intelligence",
    title: "04: Financial Intelligence",
    icon: BarChart3,
    color: "from-indigo-600 to-violet-800",
    summary: "Master billing, Quick Pay logic, net valuation accounting, break-even analysis, and company budgeting.",
    sections: [
      {
        title: "Quick Pay Modal & Verified Payment Notifications",
        content: "Quick Pay enables instant payment collection on desktop or mobile. Users select between Cash (Local) or Pay with Stripe / QR Code. Critical Rule: PC notifications and alerts fire ONLY when payment is ACTUALLY RECEIVED and confirmed by Stripe/cash entry—NOT when the QR code or payment link is generated. The 'Go To Invoices' link is strictly Admin-only and is REMOVED from the Employee Quick Pay modal. A 4-step process guide tooltip is integrated directly into the modal header.",
        subsections: [
          {
            title: "Verified Payment Alerts",
            content: "Notifications fire only upon confirmed payment receipt, preventing premature revenue alerts during link generation.",
            icon: Zap
          },
          {
            title: "Role-Specific Quick Pay",
            content: "Go To Invoices link is retained for Admins but hidden for Employees who lack Invoicing page access.",
            icon: ShieldCheck
          },
          {
            title: "4-Step Guidance Tooltip",
            content: "Header tooltip outlines exact payment selection, QR presentation, payment confirmation, and receipt issuing.",
            icon: Info
          }
        ]
      },
      {
        title: "Invoicing & Payment Lifecycle",
        content: "Completed jobs generate pending invoices automatically. Marking an invoice as 'Sent' injects a permanent CRM audit trail record into the client's history. Multiple payment methods (Cash, Card, Check) can be split, and digital receipts with embedded client signatures can be exported to PDF or emailed.",
        subsections: [
          {
            title: "CRM Invoicing Log",
            content: "Sending or marking invoices paid writes automated timeline events to Customer 360 audit history.",
            icon: FileText
          }
        ]
      },
      {
        title: "Net Valuation Accounting Model",
        content: "Accounting operates on a Net Valuation Model: Net Profit = Total Revenue - (Operating Expenses + Shelf Inventory Value). Capital spent on chemicals and equipment is categorized as Inventory Assets rather than immediate loss, balancing initial net worth to $0.00 until revenue surplus is achieved. Revenue streams are strictly deduplicated to prevent invoice double-counting.",
        subsections: [
          {
            title: "Net Valuation Formula",
            content: "Factors tied-up chemical and tool assets into net worth calculations for true fiscal reporting.",
            icon: DollarSign
          },
          {
            title: "Ledger Deduplication",
            content: "Revenue aggregation logic prevents double-counting between paid invoices and direct cash entries.",
            icon: ShieldCheck
          }
        ]
      },
      {
        title: "Break-Even Analysis & Company Budget",
        content: "Break-Even Analysis calculates remaining capital payback: Remaining to Break-Even = (Inventory Assets + Operating Expenses) - Total Service Revenue. Company Budget allows setting monthly spending limits for Supplies, Marketing, and Equipment with visual Income vs Expense category breakdown charts.",
        subsections: [
          {
            title: "Break-Even Tracker",
            content: "Tracks exact dollar threshold remaining before business initial capital investment is fully paid off.",
            icon: Target
          },
          {
            title: "Departmental Budgets",
            content: "Set spending targets per category and monitor actual vs planned expenditure in real time.",
            icon: BarChart3
          }
        ]
      }
    ],
    proTips: [
      "Use Quick Pay with Cash (Local) for immediate in-person checkouts to generate instant digital receipts.",
      "Check Break-Even Analysis monthly to track how high-margin ceramic add-ons accelerate capital payback."
    ],
    warnings: [
      "Initiating a QR code generates a payment link but does NOT constitute payment; wait for the confirmed payment alert.",
      "Erasing an invoice removes it from active views; void or cancel invoices to preserve tax audit trails."
    ]
  },
  {
    id: "reporting-analytics",
    title: "05: Reporting & Analytics",
    icon: FileText,
    color: "from-purple-600 to-indigo-900",
    summary: "Data-driven business intelligence. Temporal scanning, sales tax audits, Time & Profitability analytics, and labor split compensation.",
    sections: [
      {
        title: "Reports Center & Temporal Scanning",
        content: "The Reports Center provides 360-degree analytics across accounting, inventory, estimates, invoices, and service packages. Temporal Scanning enables filtering all reports by Today, This Week, Monthly, All-Time, or Custom Range. One-click PDF exports generate tax-ready summaries for Sales Tax collectables and Deductible Business Expenses.",
        subsections: [
          {
            title: "Temporal Date Filters",
            content: "Filter every report across daily, weekly, monthly, all-time, or custom date ranges.",
            icon: Clock
          },
          {
            title: "Tax-Ready PDF Exports",
            content: "Export categorized expense and sales tax reports formatted specifically for quarterly CPA filings.",
            icon: FileText
          }
        ]
      },
      {
        title: "Time & Profitability Dashboard",
        content: "Analyzes shop efficiency by calculating Revenue per Hour, Net Payout per Hour, and Net Profit per Hour for every completed job. Includes Stripe fee deduction badges, a 'Backfill Historical Data' bulk editor for updating older records, and a Drag List identifying lowest $/Hr performing jobs for SOP optimization.",
        subsections: [
          {
            title: "Backfill Bulk Editor",
            content: "Recalculate historical time and profitability metrics across previous job records with one click.",
            icon: History
          },
          {
            title: "Lowest $/Hr Drag List",
            content: "Highlights underperforming services to target package price adjustments or procedural retraining.",
            icon: AlertTriangle
          }
        ]
      },
      {
        title: "Compensation Calculator & Labor Split",
        content: "Calculates technician pay based strictly on remaining Labor Revenue (Gross Price minus Chemical Costs, Shop Overhead, and Stripe Fee Split) across technician Tiers (Level 1-5). Protects shop profitability by enforcing that employee commissions are never paid from gross customer pricing.",
        subsections: [
          {
            title: "Labor Split Protection",
            content: "Deducts chemical and shop expenses before calculating employee commission percentages.",
            icon: DollarSign
          },
          {
            title: "Stripe Fee Share",
            content: "Configurable percentage split for absorbing credit card processing fees prior to commission payout.",
            icon: Sliders
          }
        ]
      }
    ],
    proTips: [
      "Run the Time & Profitability report monthly to identify which add-on services yield over $100/hour.",
      "Use Custom Range date filtering when preparing end-of-year tax documentation."
    ],
    warnings: [
      "Calculating technician commissions on gross pricing without deducting chemical overhead erodes net profit margins.",
      "Unpaid pending invoices are excluded from revenue reports until marked Paid."
    ]
  },
  {
    id: "chemical-science",
    title: "06: Chemical Science & Lab",
    icon: Beaker,
    color: "from-cyan-500 to-blue-700",
    summary: "The chemical advantage. Ph diagnostics, Master Ratio sync, OSHA label system, Dilution Engine math, and batch PDF exports.",
    sections: [
      {
        title: "Chemicals Library & AI Consultant",
        content: "Stores safety profiles, Ph-levels, and SDS sheets for all shop chemicals. The Chemical AI Consultant uses specific technical prompts (e.g. 'Can I use Product A on Substrate B?') to provide chemistry-based surface safety and contamination removal guidance. Includes a searchable chemical dropdown index for fast product selection.",
        subsections: [
          {
            title: "AI Chemical Consultant",
            content: "Inputs substrate condition and contaminant type to recommend Ph-matched chemical solutions.",
            icon: Sparkles
          },
          {
            title: "Searchable Index",
            content: "Searchable text input built into chemical selection dropdowns for instant product lookup.",
            icon: Search
          }
        ]
      },
      {
        title: "Master Ratio Universal Sync",
        content: "Updating a chemical ratio anywhere—in the Dilution Reference Chart, Chemical Card, or Inventory Table—instantly propagates across the entire application via Universal Bidirectional Sync. Knowledge Base cards auto-link to matching physical shelf stock upon creation.",
        subsections: [
          {
            title: "Universal Sync",
            content: "Ratio edits in any view automatically update cards, charts, and inventory tables globally.",
            icon: Zap
          }
        ]
      },
      {
        title: "OSHA Label Maker & Multi-Chemical Sticker Sheet",
        content: "Creates OSHA-compliant bottle labels with GHS hazard symbols, AI FIX description condensing, and task ratios. The Multi-Chemical Sticker Sheet features a 10-label (2x5 grid) free-form layout where users can assign DIFFERENT chemicals to each slot, with 'FILL ENTIRE SHEET' and 'CLEAR SHEET' bulk controls.",
        subsections: [
          {
            title: "10-Label Free-Form Sheet",
            content: "Assign individual chemical designs to each slot on a 2x5 sticker sheet for multi-bottle printing.",
            icon: Grid
          },
          {
            title: "AI FIX Description Condenser",
            content: "Condenses detailed chemical instructions into high-contrast text optimized for bottle labels.",
            icon: Sparkles
          }
        ]
      },
      {
        title: "Dilution Calculator (DRC) & Selective Batch PDF",
        content: "The Prime Dilution Ratio Calculator (DRC) features Ratio Mode (X:1), Percent Mode (%), Swap (⇄) tool for product-first math, Reverse (®) logic, and Oz/Ml conversion. Rick's Tips provides a 75/25 split screen layout (75% description, 25% dilution notes). The Selective Batch PDF Print Modal enables printing custom chemical subsets with stable page-break formatting.",
        subsections: [
          {
            title: "DRC Swap & Reverse Tools",
            content: "Swap tool calculates required water for remaining chemical volume; Reverse tool audits pre-mixed bottles.",
            icon: Sliders
          },
          {
            title: "Selective Batch PDF Export",
            content: "Print custom chemical card selections with automated page-break alignment for physical shop binders.",
            icon: Printer
          }
        ]
      }
    ],
    proTips: [
      "Use the DRC Swap tool when you have 4oz of chemical left and need to mix an exact 10:1 ratio.",
      "Always add water to secondary spray bottles before adding chemical concentrate to prevent excessive foaming."
    ],
    warnings: [
      "Never mix acidic iron removers with bleach or alkaline degreasers; verify compatibility with the AI Consultant.",
      "Unlabeled secondary spray bottles violate OSHA standards and create hazardous chemical mix-ups."
    ]
  },
  {
    id: "inventory-asset",
    title: "07: Inventory & Asset Management",
    icon: Database,
    color: "from-emerald-600 to-teal-800",
    summary: "Physical and digital asset control. Consumables inventory, Smart Sync, Unified Chemical Modal, Asset Pool, File Manager, and Mobile Units.",
    sections: [
      {
        title: "Master Inventory Control & Stock Thresholds",
        content: "Tracks consumable items (Chemicals, Towels, Pads) with current stock counts, unit costs, and low-threshold alerts. Calculates real-time total liquid inventory value for net business valuation.",
        subsections: [
          {
            title: "Low Stock Alerts",
            content: "Triggers visual notifications when inventory falls below minimum threshold quantities.",
            icon: AlertTriangle
          }
        ]
      },
      {
        title: "Smart Sync Engine & Unified Chemical Modal",
        content: "Smart Sync audits inventory for duplicates (matching Name + Brand while preserving master records) and auto-links unlinked items to Knowledge Base cards with 'Last Updated' timestamps. The Unified Chemical Modal consolidates basic info, bottle sizes, custom costs, and stock thresholds into one screen.",
        subsections: [
          {
            title: "Smart Sync Deduplication",
            content: "Merges duplicate product entries and auto-links inventory to master chemical cards.",
            icon: Zap
          },
          {
            title: "Unified Bottle Manager",
            content: "Manage 16oz, 24oz, 32oz, and gallon costs and stock counts inside a single modal.",
            icon: Layers
          }
        ]
      },
      {
        title: "Asset Pool, File Manager & Mobile Setup",
        content: "The Asset Pool tracks hardware (buffers, extractors) with depreciation schedules and maintenance alerts. The File Manager Business Drive features visual green folder indicators for folders containing active files. Mobile Unit Setup configures mobile rigs (e.g. F150 Command Center) with direct mobile camera photo capture and Supabase live sync indicators.",
        subsections: [
          {
            title: "Green Visual Folder Indicators",
            content: "Folders in the File Manager Business Drive light up green when containing active documents.",
            icon: CheckCircle2
          },
          {
            title: "Mobile Direct Camera Capture",
            content: "Take photos directly inside mobile rig setup galleries for instant cloud inventory sync.",
            icon: Camera
          }
        ]
      }
    ],
    proTips: [
      "Run Smart Sync monthly to ensure new chemical purchases are correctly linked to SDS safety cards.",
      "Check green folder indicators in the File Manager to verify all mobile unit insurance documents are uploaded."
    ],
    warnings: [
      "Deleting a master chemical product removes all associated bottle size variants; archive unused items instead.",
      "Failing to log asset maintenance (e.g., extractor pump flushes) leads to equipment failure during mobile jobs."
    ]
  },
  {
    id: "staff-learning",
    title: "08: Staff & Learning Center",
    icon: Trophy,
    color: "from-fuchsia-600 to-purple-900",
    summary: "Team development and communication. Employee onboarding pre-authorization, RBAC security, Prime Learning Center, and Team Chat lifecycle.",
    sections: [
      {
        title: "Role-Based Access Control & Employee Pre-Authorization",
        content: "Enforces strict RBAC boundaries (Admin, Employee, Customer). Official Employee Onboarding Workflow: Admin opens Users & Roles $\rightarrow$ clicks 'Add Employee' $\rightarrow$ enters employee details $\rightarrow$ clicks 'Authorize Access'. This pre-authorizes the email address so when the employee registers, they automatically inherit correct Employee permissions and access to their dashboard.",
        subsections: [
          {
            title: "Pre-Authorization Onboarding",
            content: "Pre-authorize employee email addresses in Users & Roles to ensure automatic role assignment upon sign-up.",
            icon: ShieldCheck
          },
          {
            title: "Role Boundaries",
            content: "Employees access active checklists, SOPs, and learning modules; financial ledgers remain Admin-restricted.",
            icon: Lock
          }
        ]
      },
      {
        title: "Prime Learning Center & SOPs Integration",
        content: "Houses video masterclasses, safety quizzes, exam administration, digital certification badges, and SOP guides. SOPs are directly accessible via cyan ListChecks icons positioned in both left app navigation and right-side icon menus.",
        subsections: [
          {
            title: "Certification Badges",
            content: "Award technicians digital badges upon passing paint correction and ceramic coating exams.",
            icon: Trophy
          }
        ]
      },
      {
        title: "Team Chat Lifecycle & Session Termination",
        content: "Provides internal messaging between shop and field detailers. Features 'End Conversation' session termination: clicking End Conversation sets a chat_ended flag, clears local chat state, and completely silences all audio alerts, visual banners, and unread badges until a new conversation starts. 'Clear Chat' invokes deleteAllTeamMessages to purge historical records.",
        subsections: [
          {
            title: "End Conversation Alert Silencing",
            content: "Terminating a chat session silences audio alerts and unread badges until a new session is initiated.",
            icon: MessageSquare
          },
          {
            title: "Clear Chat Purge",
            content: "Purges chat history from local and database storage for clean session restarts.",
            icon: Zap
          }
        ]
      }
    ],
    proTips: [
      "Use Pre-Authorization before inviting new technicians to register so they immediately land on the Employee Dashboard.",
      "Click 'End Conversation' at the end of the shift to silence after-hours chat alerts on shop tablets."
    ],
    warnings: [
      "Never share Admin credentials; assign individual Employee accounts via Pre-Authorization for full audit logging.",
      "Clearing chat history purges team messages permanently; confirm before executing."
    ]
  },
  {
    id: "marketing-retention",
    title: "09: Marketing & Retention",
    icon: Mail,
    color: "from-amber-600 to-orange-800",
    summary: "Closing the retention loop. Retention Hub outreach, email campaigns with domain setup, Elite Story Master blog reordering, and QR stickers.",
    sections: [
      {
        title: "Retention Hub & Customer Outreach Engine",
        content: "Tracks client service recency with a customizable inactivity threshold (default 90 days). Organized into 3 collapsible sections: Overdue (paying clients past threshold), Due Soon (approaching threshold), and Prospects (unbooked leads). Actions include 1-click email outreach, Apply Coupon & Send, Send Estimate, AI Letter Maker (10 templates with AI Professional Refine), Snooze (7/14/30 days), and Mark as Contacted. Includes a BCC toggle to copy Rick.PrimeAutoDetail@gmail.com on outreach emails.",
        subsections: [
          {
            title: "Snooze & Mark Contacted",
            content: "Snooze temporarily hides clients for 7/14/30 days; Mark as Contacted logs offline calls and resets inactivity clocks.",
            icon: Clock
          },
          {
            title: "AI Letter Maker",
            content: "Select from 10 professional letter templates and polish copy with AI Professional Refine.",
            icon: Sparkles
          },
          {
            title: "Admin BCC Backup",
            content: "BCC toggle sends backup copies of all outreach emails directly to Rick.PrimeAutoDetail@gmail.com.",
            icon: Mail
          }
        ]
      },
      {
        title: "Email Campaigns & Resend Custom Domain Setup",
        content: "Features 6 customer and 4 prospect email campaigns. To send emails from custom domain addresses (e.g. Rick.PrimeAutoDetail@gmail.com or primeautodetail.net), administrators verify the domain on Resend and configure the SENDER_EMAIL secret via Supabase CLI (`supabase secrets set SENDER_EMAIL`).",
        subsections: [
          {
            title: "Resend Domain Verification",
            content: "Configure SENDER_EMAIL secrets in Supabase CLI to enable custom business domain email delivery.",
            icon: Settings
          }
        ]
      },
      {
        title: "Elite Story Master (Blog Reordering) & QR Generator",
        content: "The Elite Story Master features accordion-style collapsible post rows, drag-and-drop reordering with grip handles, position badges, and a 'SAVE SEQUENCE' cloud commit button. Includes AI Strategist, Social Media Blast, and public/private toggles. The Sticker & QR Generator produces business cards and custom QR codes linking to Google reviews or booking portals.",
        subsections: [
          {
            title: "Drag & Drop Sequence Saving",
            content: "Reorder blog post accordions using grip handles and click SAVE SEQUENCE to commit live website order.",
            icon: Sliders
          },
          {
            title: "QR Code Generator",
            content: "Generate printable QR codes directing customers to review pages or the online booking portal.",
            icon: Share2
          }
        ]
      }
    ],
    proTips: [
      "Review the Retention Hub every Monday, sorting Overdue clients by 'Highest Value' to contact top clients first.",
      "Use the BCC toggle during marketing campaigns to keep a copy of all outgoing client offers in your Gmail."
    ],
    warnings: [
      "Dragging blog posts changes screen order only; you MUST click 'SAVE SEQUENCE' to update primeautodetail.net.",
      "Ensure Resend custom domain records are verified before setting SENDER_EMAIL to prevent email delivery failure."
    ]
  },
  {
    id: "system-security",
    title: "10: System Settings & Security",
    icon: ShieldCheck,
    color: "from-slate-600 to-zinc-900",
    summary: "Application security, data privacy, database integrity, audit trails, and role simulation safeguards.",
    sections: [
      {
        title: "Privacy & Data Protection",
        content: "Enforces strict data privacy. Personal calendar event titles are masked during Google Calendar sync, and customer contact info is restricted to authorized roles. Communication with the Supabase backend is encrypted via HTTPS/TLS with OAuth 2.0 session handling.",
        subsections: [
          {
            title: "Calendar Privacy Masking",
            content: "Google Calendar sync blocks off busy time slots without exposing private event details on public sites.",
            icon: ShieldCheck
          }
        ]
      },
      {
        title: "Database Integrity & Deletion Protocols",
        content: "Database actions maintain full audit trails with timestamped user IDs. Deleting customer or invoice records requires 3-step confirmation. The 1-click Wipeout protocol surgically deletes test data while leaving live customer records untouched.",
        subsections: [
          {
            title: "Cascading Audit Logs",
            content: "Modification events write timestamped user audit entries to prevent unrecorded data edits.",
            icon: History
          }
        ]
      },
      {
        title: "Role Simulation ('View As') Safeguards",
        content: "The 'View As' tool allows Administrators to safely preview the application from an Employee or Customer perspective. Role simulation filters UI navigation without altering underlying administrative credentials or permissions.",
        subsections: [
          {
            title: "Safe Role Simulation",
            content: "Preview Employee or Customer user interfaces safely without elevating or revoking actual admin rights.",
            icon: Users
          }
        ]
      }
    ],
    proTips: [
      "Use 'View As Customer' after updating pricing packages to verify how rates render in public booking flows.",
      "Perform a quarterly audit of user roles in Users & Roles to remove access for inactive staff."
    ],
    warnings: [
      "Permanent record deletion cannot be reversed; use status archiving whenever possible.",
      "Sharing admin login credentials violates security policy and compromises user audit logging."
    ]
  },
  {
    id: "technical-sops",
    title: "11: Technical Reference SOPs",
    icon: Workflow,
    color: "from-teal-600 to-emerald-800",
    summary: "Master shop-floor reference protocols. Printable Dilution Reference Chart, Chemical Decision Matrix, and Emergency Safety Standards.",
    sections: [
      {
        title: "Printable Dilution Reference Chart",
        content: "High-visibility shop reference chart optimized for mobile portrait view. Features pinned sticky headers/sidebars, color-coded 16oz (emerald), 24oz (blue), and 32oz (purple) bottle size columns, 4px vertical scenario separator lines between Standard, Heavy Duty, and Maintenance ratios, brand-first sorting, and accidental edit confirmation dialogs.",
        subsections: [
          {
            title: "Sticky Navigation & Mobile Fit",
            content: "Product names and oz columns stay pinned while scrolling for effortless shop-floor mixing.",
            icon: Grid
          },
          {
            title: "Vertical Scenario Separators",
            content: "4px vertical lines visually separate Standard, Heavy Duty, and Maintenance dilution columns.",
            icon: Sliders
          }
        ]
      },
      {
        title: "Chemical Decision Matrix & Substrate Diagnostics",
        content: "Guides technicians through vehicle assessment: 1. Grade condition severity (Light, Moderate, Heavy, Severe) $\rightarrow$ 2. Identify contamination type (Bugs, Tar, Water Spots, Tree Sap, Iron Fallout) $\rightarrow$ 3. Match required chemistry (Alkaline, Acidic, Solvent, Ph-Neutral) $\rightarrow$ 4. Select matching shelf inventory with task dilution ratios.",
        subsections: [
          {
            title: "Contamination ID Engine",
            content: "Matches surface contaminants to specific chemical profiles to emulsify grime without clear-coat damage.",
            icon: Beaker
          },
          {
            title: "Severity Grading",
            content: "Adjusts recommended Ph-strength and dilution ratios based on Light-to-Severe vehicle scoring.",
            icon: Target
          }
        ]
      },
      {
        title: "Emergency Safety & SDS Protocols",
        content: "Safety standards for chemical handling. Access digital Safety Data Sheets (SDS) from Chemical Cards. Secondary spray bottles must display OSHA GHS safety warnings and scannable QR codes. Personal Protective Equipment (PPE)—eye protection and chemical-resistant gloves—is mandatory during chemical dilution.",
        subsections: [
          {
            title: "OSHA Secondary Bottle Safety",
            content: "Secondary bottles must display GHS hazard warnings and scannable SDS QR codes.",
            icon: AlertTriangle
          }
        ]
      }
    ],
    proTips: [
      "Keep a printed high-contrast copy of the Dilution Reference Chart posted in the chemical mixing room.",
      "Consult the Chemical Decision Matrix before attempting aggressive solvent spot cleaning on delicate clear coats."
    ],
    warnings: [
      "Never mix acidic chemical solutions in sprayers previously containing bleach or strong oxidizers.",
      "Failure to wear required PPE during bulk chemical concentrate transfers is a violation of shop safety SOPs."
    ]
  },
  {
    id: "intake-workflows",
    title: "12: Intake & Interaction Workflows",
    icon: Layers,
    color: "from-amber-500 to-orange-700",
    summary: "End-to-end operational workflows. The 6-phase booking lifecycle, direct phone intake, digital vehicle inspection, garage vehicle multipliers, and the Sandbox workflow.",
    sections: [
      {
        title: "The 6-Phase End-to-End Booking Lifecycle",
        content: "The standardized workflow for client interactions: Phase 1: Lead Capture (Prospect) $\rightarrow$ Phase 2: Booking Commitment $\rightarrow$ Phase 3: Prep & Rig Loading $\rightarrow$ Phase 4: Execution & Checklist $\rightarrow$ Phase 5: Billing & Sign-Off $\rightarrow$ Phase 6: Retention Outreach. Customer logins land on the Customer Dashboard with right-side customer navigation; Employee logins route to the Employee Dashboard.",
        subsections: [
          {
            title: "6-Phase Lifecycle",
            content: "Standardized workflow guiding customer progression from initial lead inquiry to long-term retention.",
            icon: Workflow
          },
          {
            title: "Role Routing",
            content: "Customer credentials land on Customer Dashboard; employee credentials route to Employee Dashboard.",
            icon: Users
          }
        ]
      },
      {
        title: "Direct Phone Intake & Garage Vehicle Multipliers",
        content: "When clients call to book directly: 1. Open Bookings $\rightarrow$ 2. Search CRM $\rightarrow$ 3. Add Customer if new (capturing Phone/Email) $\rightarrow$ 4. Add Vehicle Year/Make/Model and select Vehicle Classification (Sedan, Compact, Midsize, SUV, Truck, Luxury) $\rightarrow$ 5. Select Package (pricing auto-calculates based on vehicle multiplier) $\rightarrow$ 6. Save & Sync.",
        subsections: [
          {
            title: "Vehicle Class Pricing",
            content: "Vehicle classification (Compact, Midsize, Truck, Luxury) automatically calculates starting package prices.",
            icon: Truck
          }
        ]
      },
      {
        title: "Digital Vehicle Inspection & Damage Photo Capture",
        content: "Prior to starting service, technicians perform a digital inspection inside the active checklist. Capture high-resolution photos of pre-existing scratches, dents, or wheel rash. The customer signs the digital inspection on the mobile screen, embedding the signature into the final invoice PDF to protect the shop from liability.",
        subsections: [
          {
            title: "Pre-Service Condition Proof",
            content: "Document pre-existing vehicle damage with timestamped photos before starting cleaning or polishing.",
            icon: Camera
          },
          {
            title: "Embedded Digital Signature",
            content: "Customer digital signature is embedded permanently into the final PDF receipt and audit trail.",
            icon: CheckCircle2
          }
        ]
      },
      {
        title: "Test Customer Sandbox & 1-Click Wipeout Protocol",
        content: "The Sandbox environment allows testing pricing, booking flows, and invoices using the Rick Berube Test profile (rberube54+test@gmail.com). Test entries display a red 'Test Data Active' banner and temporarily reflect in live accounting to verify formula accuracy. Hitting 'Wipe Test Data Now' executes a cascading deletion that removes all test invoices, estimates, bookings, vehicles, and test customer profiles, instantly restoring true live financial figures.",
        subsections: [
          {
            title: "Red Test Warning Banner",
            content: "Displays persistent warning banner when test data is active in local database state.",
            icon: AlertTriangle
          },
          {
            title: "1-Click Cascading Wipeout",
            content: "Surgically deletes test invoices, bookings, and customer records to restore true accounting totals.",
            icon: Zap
          }
        ]
      }
    ],
    proTips: [
      "Perform digital walkaround photo capture on every vehicle before water or chemicals touch the paint.",
      "Use the 1-Click Wipeout button immediately after finishing live test sessions to clean accounting ledgers."
    ],
    warnings: [
      "Skipping pre-service damage documentation leaves the shop liable for pre-existing scratches or curb rash.",
      "Test data temporarily increases accounting totals until the Wipe Test Data protocol is executed."
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
