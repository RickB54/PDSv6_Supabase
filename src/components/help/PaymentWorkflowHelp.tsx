import React from "react";
import { HelpCircle, CheckCircle2, FileText, MonitorPlay, FileCheck, ArrowRightLeft, ShoppingCart, Activity, ShieldCheck } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type HelpVariant = 
  | 'invoicing-dashboard'
  | 'customer-invoice-page'
  | 'estimates-dashboard'
  | 'customer-estimate-page'
  | 'service-checklist'
  | 'checkout'
  | 'payments-dashboard'
  | 'payment-success'
  | 'compensation-calculator'
  | 'payroll-engine';

interface Props {
  variant?: HelpVariant;
}

export function PaymentWorkflowHelp({ variant = 'invoicing-dashboard' }: Props) {
  
  const content = {
    'invoicing-dashboard': {
      title: 'Invoicing Dashboard Workflow',
      icon: <FileText className="w-5 h-5 text-blue-600" />,
      steps: [
        {
          title: "1. Create & Review",
          desc: "Generate the invoice, add your notes and services, and preview it. Nothing is sent automatically."
        },
        {
          title: "2. Add Notes & Discounts",
          desc: "Ensure all manual adjustments, discounts, and internal notes are finalized before showing the customer."
        },
        {
          title: "3. Choose Sending Method",
          desc: "Remote: Copy the link and text/email it for them to pay from home. In-Shop: Open Quick Pay or the Customer Invoice page on your iPad and hand it to them."
        },
        {
          title: "4. Verify Payment",
          desc: "Check this dashboard later. If they paid via Stripe, the webhook will automatically flip the status to 'Paid'. For cash/Zelle, you must manually log the payment here."
        }
      ]
    },
    'customer-invoice-page': {
      title: 'Customer Invoice View',
      icon: <MonitorPlay className="w-5 h-5 text-blue-600" />,
      steps: [
        {
          title: "1. What the Customer Sees",
          desc: "This is the exact page the customer interacts with. They can review the services, subtotal, and any discounts applied."
        },
        {
          title: "2. Pre-Flight Check (In-Shop)",
          desc: "Before handing the iPad to the customer, double-check the total. If anything looks off, DO NOT let them pay. Go back to your dashboard to edit."
        },
        {
          title: "3. The Stripe Handoff",
          desc: "When they click 'PAY NOW VIA STRIPE', they are redirected to Stripe's secure checkout. Once they complete it, they are sent to the Success page."
        },
        {
          title: "4. Status Sync",
          desc: "If this page shows a 'PAID IN FULL' banner, the webhook has successfully fired and locked the invoice from further payments."
        }
      ]
    },
    'estimates-dashboard': {
      title: 'Estimates Dashboard Workflow',
      icon: <FileCheck className="w-5 h-5 text-blue-600" />,
      steps: [
        {
          title: "1. Generic Section Headers (Multi-Vehicle/Packages)",
          desc: "You can click 'Add Section Header' to group line items by Vehicle (e.g. '--- F150 ---') or by Package (e.g. '--- Exterior ---'). Subtotals calculate automatically for whatever is underneath it!"
        },
        {
          title: "2. Section Controls & Discounts",
          desc: "Use the Up/Down arrows to reorder entire sections, the Blue Copy icon to duplicate them, and the Orange + icon to insert a negative line item (e.g. -50) for a discount."
        },
        {
          title: "3. Options & Menus (Menu Mode)",
          desc: "To quote multiple vehicles or show options, check 'Hide Grand Total (Menu Mode)'. This turns the PDF into a clean pricing menu without scaring the customer with a massive total."
        },
        {
          title: "4. Custom Vehicle Titles",
          desc: "Select 'Custom / Write-in Vehicle' from the garage dropdown to type in custom titles like 'Lina's Fleet (6 Vehicles)' without cluttering your CRM."
        },
        {
          title: "3. Sending the Estimate",
          desc: "Click the 'Copy Hosted Link' icon on the estimate row to copy its secure URL. You can then paste and send this link directly to the customer via text or email."
        },
        {
          title: "4. Customer Acceptance",
          desc: "Track which estimates are 'Open', 'Accepted', or 'Declined'. When a customer accepts via the link, they will fill out a Pre-Check form with vehicle condition details."
        },
        {
          title: "5. Conversion to Invoice",
          desc: "Once an estimate is accepted and the job is scheduled, you must manually create an Invoice or Job based on the agreed terms to actually collect money."
        }
      ]
    },
    'customer-estimate-page': {
      title: 'Customer Estimate View',
      icon: <MonitorPlay className="w-5 h-5 text-blue-600" />,
      steps: [
        {
          title: "1. What the Customer Sees",
          desc: "The customer reviews the proposed services, estimated total, and validity date (usually 30 days)."
        },
        {
          title: "2. The Acceptance Flow",
          desc: "If they click Accept, a Pre-Check form appears asking about pet hair, stains, and paint condition. They must fill this out to complete acceptance."
        },
        {
          title: "3. Post-Acceptance",
          desc: "Once submitted, you receive a notification. The customer does NOT pay here. You will contact them to schedule the actual detailing appointment."
        },
        {
          title: "4. Declining",
          desc: "If they click Decline, the status updates immediately and you are notified. The estimate is closed."
        }
      ]
    },
    'service-checklist': {
      title: 'Job Lifecycle & Quick Pay',
      icon: <ArrowRightLeft className="w-5 h-5 text-blue-600" />,
      steps: [
        {
          title: "1. Auto-Saving Drafts",
          desc: "Your progress is saved automatically. If you leave the page, you can restore your active job from the 'Service Checklist History' accordion at the bottom of the page."
        },
        {
          title: "2. Finish & Complete Job",
          desc: "When the detailing job is completely finished, click 'Finish & Complete Job'. This generates a PDF report, posts materials used, auto-generates an invoice (if needed), and locks the checklist to prevent accidental edits."
        },
        {
          title: "3. Reopen & Edit",
          desc: "If you made a mistake and need to adjust the checklist after finishing, click 'Reopen & Edit' on the green completion banner at the top. This unlocks the form without affecting any financial records."
        },
        {
          title: "4. Tool Shortcuts",
          desc: "Use 'Uncheck All' to reset the checklist boxes. Use 'Prefill Avg Times' to instantly load standard estimated durations for all line items."
        },
        {
          title: "5. Materials & Mileage",
          desc: "Log 'Materials Used' accurately as they impact profit calculations. 'Job Mileage Tracking' is automatically logged to Finance upon finishing the job."
        },
        {
          title: "6. The Tip Screen",
          desc: "After completing a job, hand the device to the customer. They can privately select a tip percentage or custom amount before final payment."
        },
        {
          title: "7. Final Checkout & Payment",
          desc: "For cards or Apple Pay, proceed to Stripe Checkout. The webhook will automatically mark the job as Paid. For cash/Zelle, DO NOT use Stripe; manually log the payment on the Invoice."
        }
      ]
    },
    'checkout': {
      title: 'Unified Checkout Flow',
      icon: <ShoppingCart className="w-5 h-5 text-blue-600" />,
      steps: [
        {
          title: "1. What This Page Does",
          desc: "This is a unified cart. It combines pending invoices, current checklist services, and added tips into one single Stripe transaction."
        },
        {
          title: "2. When to Use It",
          desc: "Use this when the customer is standing in front of you, ready to pay with a card or tap-to-pay (Apple/Google Pay)."
        },
        {
          title: "3. Review the Grand Total",
          desc: "Verify that the subtotal, tip, and any unpaid invoices selected match exactly what the customer expects to pay."
        },
        {
          title: "4. Proceeding to Stripe",
          desc: "Clicking checkout builds a dynamic line-item list and sends the customer to a secure Stripe session to enter their card."
        }
      ]
    },
    'payments-dashboard': {
      title: 'Master Ledger Workflow',
      icon: <Activity className="w-5 h-5 text-blue-600" />,
      steps: [
        {
          title: "1. The Source of Truth",
          desc: "This dashboard is your master ledger. Every successful transaction (Stripe, Cash, Check, Zelle) will appear here."
        },
        {
          title: "2. Confirming a Cleared Payment",
          desc: "If you need to verify a webhook fired correctly or a customer successfully paid, search for their name here. If it says 'PAID', you're good to go."
        },
        {
          title: "3. Logging Cash or Check",
          desc: "This dashboard displays data, but you don't enter it here. To log a cash payment, go to the specific Invoice and click 'Add a Payment'."
        },
        {
          title: "4. Bookkeeping",
          desc: "Use the date and source filters to reconcile your daily or weekly revenue against your bank account."
        },
        {
          title: "5. Employee Payouts",
          desc: "Employee payments are tracked here as 'Payroll' expenses. To actually pay an employee, go to the 'Company Employees' page and click 'Pay' on their card, or go to the 'Payroll Engine'."
        }
      ]
    },
    'payment-success': {
      title: 'Payment Verification & Next Steps',
      icon: <ShieldCheck className="w-5 h-5 text-blue-600" />,
      steps: [
        {
          title: "1. Webhook Confirmation",
          desc: "If you see the 'Payment Successful' screen, the Stripe webhook successfully fired, the invoice is Paid, and an email receipt was sent."
        },
        {
          title: "2. What if it fails?",
          desc: "If this page shows an error but the customer's bank was charged, check your Stripe Dashboard. The webhook may have been delayed."
        },
        {
          title: "3. The Golden Opportunity",
          desc: "The transaction is complete and the customer is happy. This is the exact moment to pull out the QR code and ask for a 5-star Google Review!"
        },
        {
          title: "4. Handing Back the Keys",
          desc: "Once verified and the review is requested, you are clear to hand the keys back to the customer."
        }
      ]
    },
    'compensation-calculator': {
      title: 'Compensation Calculator',
      icon: <FileText className="w-5 h-5 text-blue-600" />,
      steps: [
        {
          title: "1. Total Customer Price",
          desc: "This is the full amount the customer paid, before any deductions."
        },
        {
          title: "2. Materials & Direct Costs",
          desc: "These are real per-job hard costs deducted before labor revenue is calculated. Accurate entries here directly affect what's fair to pay the employee."
        },
        {
          title: "3. Stripe Processing Fee",
          desc: "The actual Stripe fee on the transaction. It's split between company and employee based on the slider below it."
        },
        {
          title: "4. Employee Stripe Fee Share",
          desc: "This percentage of the Stripe fee is deducted from the employee's earnings, not yours. At 0%, you absorb the full fee. At 100%, the employee absorbs it entirely."
        },
        {
          title: "5. Employee Type",
          desc: "Each type has a recommended commission range based on skill level. Ranges are guidance, not hard limits."
        },
        {
          title: "6. Commission Percentage",
          desc: "This percentage applies ONLY to Labor Revenue (after deductions), never to the full Customer Price — this is the core philosophy."
        },
        {
          title: "7. Labor Revenue",
          desc: "What's left after real business costs are removed, and it's the true base for calculating fair employee pay."
        },
        {
          title: "8. Employee Earnings",
          desc: "Commission % of Labor Revenue, minus the employee's Stripe fee share if applicable."
        },
        {
          title: "9. Company Gross Profit",
          desc: "What remains to cover overhead (rent, insurance, marketing, equipment) — it is NOT take-home profit."
        }
      ]
    },
    'payroll-engine': {
      title: 'How to Pay Employees',
      icon: <Activity className="w-5 h-5 text-purple-600" />,
      steps: [
        {
          title: "Method A: Unified Payroll Engine (Recommended)",
          desc: "Select completed jobs on the Payroll tab and click 'Process Pay Run'. This clears them from the pending queue and automatically logs a unified business expense."
        },
        {
          title: "Method B: Employee Card Quick-Pay",
          desc: "Go to Company Employees and click 'Pay' on a specific card. The amount defaults to what they are owed. Confirming it logs the expense and clears their pending queue."
        },
        {
          title: "Method C: Manual Ledger Entry",
          desc: "Go to Accounting and click 'Add Manual Expense'. Set Category to Payroll. This logs the financial expense for bookkeeping but does not affect the pending job queue."
        }
      ]
    }
  };

  const pageContent = content[variant] || content['invoicing-dashboard'];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center justify-center rounded-full w-6 h-6 bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 shrink-0"
          aria-label="Payment Workflow Help"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[95vw] max-w-[500px] p-0 shadow-2xl border-blue-200 overflow-hidden" align="end">
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            {pageContent.icon}
          </div>
          <div>
            <h4 className="font-bold text-lg text-slate-900 leading-tight">
              {pageContent.title}
            </h4>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Cheat Sheet</p>
          </div>
        </div>
        
        <div className="p-5 space-y-5 bg-white max-h-[60vh] overflow-y-auto">
          {pageContent.steps.map((step, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm mb-1">{step.title}</p>
                <p className="text-slate-600 text-sm leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
