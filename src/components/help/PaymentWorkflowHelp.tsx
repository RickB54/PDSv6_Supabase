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
  | 'payment-success';

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
      title: 'In-Shop Quick Pay Workflow',
      icon: <ArrowRightLeft className="w-5 h-5 text-blue-600" />,
      steps: [
        {
          title: "1. Job Completion",
          desc: "Once the detailing job is done and the checklist is complete, click 'Checkout' to initiate the in-shop payment flow."
        },
        {
          title: "2. The Tip Screen",
          desc: "Hand the device to the customer so they can privately select a tip percentage or custom amount before final payment."
        },
        {
          title: "3. Stripe vs. Cash",
          desc: "For cards or Apple Pay, proceed to Stripe Checkout. For cash/Zelle, DO NOT use Stripe; manually log the payment on the Invoice instead."
        },
        {
          title: "4. Webhook Automation",
          desc: "If they pay via Stripe, the webhook will automatically handle marking the job/invoice as Paid and emailing the receipt."
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
