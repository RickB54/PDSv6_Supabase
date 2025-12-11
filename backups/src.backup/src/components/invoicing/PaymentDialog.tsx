import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: { customerName: string; total: number; paidAmount?: number } | null;
  paymentAmount: string;
  setPaymentAmount: (value: string) => void;
  onConfirm: () => void;
}

export const PaymentDialog = ({ open, onOpenChange, invoice, paymentAmount, setPaymentAmount, onConfirm }: PaymentDialogProps) => {
  if (!invoice) return null;
  const remaining = invoice.total - (invoice.paidAmount || 0);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Record Payment</AlertDialogTitle>
          <AlertDialogDescription>
            Customer: {invoice.customerName}<br />
            Total Amount: ${invoice.total.toFixed(2)}<br />
            Paid: ${(invoice.paidAmount || 0).toFixed(2)}<br />
            Remaining: ${remaining.toFixed(2)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label htmlFor="payment">Payment Amount</Label>
          <Input
            id="payment"
            type="number"
            step="0.01"
            placeholder="Enter amount"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            className="mt-2"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}>
            Record Payment
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
