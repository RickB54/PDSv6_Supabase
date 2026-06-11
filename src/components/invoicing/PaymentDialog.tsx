import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: { customerName: string; total: number; paidAmount?: number; tipAmount?: number } | null;
  paymentAmount: string;
  setPaymentAmount: (value: string) => void;
  tipAmount: string;
  setTipAmount: (value: string) => void;
  onConfirm: () => void;
}

export const PaymentDialog = ({ open, onOpenChange, invoice, paymentAmount, setPaymentAmount, tipAmount, setTipAmount, onConfirm }: PaymentDialogProps) => {
  if (!invoice) return null;

  const remaining = Math.max(0, invoice.total - (invoice.paidAmount || 0));
  const isAlreadyPaid = remaining <= 0;

  const payAmt = parseFloat(paymentAmount) || 0;
  const tipAmt = parseFloat(tipAmount) || 0;
  const totalReceived = payAmt + tipAmt;
  const canConfirm = payAmt > 0 || tipAmt > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-zinc-950 border-zinc-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-zinc-100">
            {isAlreadyPaid ? "Record Additional Payment / Tip" : "Record Payment"}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-1 text-zinc-400 text-sm">
              <div className="flex justify-between"><span>Customer:</span><span className="text-zinc-200 font-medium">{invoice.customerName}</span></div>
              <div className="flex justify-between"><span>Invoice Total:</span><span className="text-zinc-200">${invoice.total.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Previously Paid:</span><span className="text-zinc-200">${(invoice.paidAmount || 0).toFixed(2)}</span></div>
              {!isAlreadyPaid && (
                <div className="flex justify-between font-semibold text-amber-400">
                  <span>Balance Due:</span><span>${remaining.toFixed(2)}</span>
                </div>
              )}
              {isAlreadyPaid && (
                <div className="flex justify-between font-semibold text-emerald-400">
                  <span>Status:</span><span>PAID IN FULL</span>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-2 space-y-4">
          {/* Payment Amount */}
          <div>
            <Label htmlFor="payment" className="text-zinc-300 font-semibold">
              {isAlreadyPaid ? "Additional Payment ($0 if tip only)" : "Payment Amount"}
            </Label>
            <p className="text-[11px] text-zinc-500 mb-2">
              {isAlreadyPaid
                ? "Enter $0 if you only received a tip, not an additional service payment."
                : "Amount the customer is paying toward the invoice balance."}
            </p>
            <Input
              id="payment"
              type="number"
              step="0.01"
              min="0"
              placeholder={isAlreadyPaid ? "0.00" : remaining.toFixed(2)}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="bg-zinc-900 border-zinc-700 text-zinc-100"
            />
          </div>

          {/* Tip Amount — clearly separate */}
          <div>
            <Label htmlFor="tip" className="text-emerald-400 font-semibold">
              Tip Amount (Not Printed on Customer Invoice)
            </Label>
            <p className="text-[11px] text-zinc-500 mb-2">
              Tips <strong className="text-zinc-300">ARE counted</strong> in your income, budget (Tips category), and accounting totals. They just do not print on the customer&apos;s PDF invoice.
            </p>
            <Input
              id="tip"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={tipAmount}
              onChange={(e) => setTipAmount(e.target.value)}
              className="bg-zinc-900 border-emerald-900/60 text-zinc-100 focus-visible:ring-emerald-500/50"
            />
          </div>

          {/* Live preview */}
          {totalReceived > 0 && (
            <div className="rounded-lg bg-zinc-900 border border-zinc-700 p-3 space-y-1 text-sm">
              <p className="text-zinc-400 text-xs uppercase tracking-wider font-bold mb-2">Total Being Recorded</p>
              {payAmt > 0 && <div className="flex justify-between text-zinc-300"><span>Invoice Payment:</span><span>${payAmt.toFixed(2)}</span></div>}
              {tipAmt > 0 && <div className="flex justify-between text-emerald-400"><span>Tip (internal):</span><span>+${tipAmt.toFixed(2)}</span></div>}
              <div className="flex justify-between font-bold text-white border-t border-zinc-700 pt-1 mt-1">
                <span>Total Received from Customer:</span>
                <span>${totalReceived.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel className="text-zinc-400 hover:text-white">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={!canConfirm}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-40"
          >
            Record Payment
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
