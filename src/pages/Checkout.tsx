import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, CreditCard } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useToast } from "@/hooks/use-toast";
import { getInvoices, upsertInvoice } from "@/lib/db";
import { upsertReceivable } from "@/lib/receivables";
import { getCurrentUser } from "@/lib/auth";

interface Invoice {
  id?: string;
  invoiceNumber?: number;
  customerId?: string;
  customerName?: string;
  total: number;
  date?: string;
  paymentStatus?: "unpaid" | "partially-paid" | "paid";
  paidAmount?: number;
}

const Checkout = () => {
  const { toast } = useToast();
  const { items, removeItem, clear, subtotal } = useCartStore();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [prepayAmount, setPrepayAmount] = useState<string>("");
  const user = getCurrentUser();

  useEffect(() => {
    (async () => {
      const invs = await getInvoices<Invoice>();
      setInvoices(invs.filter(i => (i.paymentStatus || "unpaid") !== "paid"));
    })();
  }, []);

  const toggleInvoice = (id: string) => {
    setSelectedInvoiceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const invoicesTotal = invoices.filter(i => selectedInvoiceIds.includes(String(i.id))).reduce((sum, i) => sum + (i.total || 0), 0);
  const cartSubtotal = subtotal();
  const prepay = parseFloat(prepayAmount) || 0;
  const grandTotal = cartSubtotal + invoicesTotal + prepay;

  const handleRemove = (id: string) => removeItem(id);

  const handleCheckout = async () => {
    if (grandTotal <= 0) {
      toast({ title: "Nothing to pay", description: "Add items, select invoices, or enter prepayment.", variant: "destructive" });
      return;
    }
    try {
      // Build dynamic Stripe line items from cart, selected invoices, and optional prepayment
      const lineItems: Array<{ name?: string; amount?: number; quantity?: number }> = [];
      // Cart items
      for (const i of items) {
        const name = i.vehicleType ? `${i.name} · ${i.vehicleType}` : i.name;
        lineItems.push({ name, amount: i.price, quantity: i.quantity });
      }
      // Selected invoices
      for (const inv of invoices.filter((i) => selectedInvoiceIds.includes(String(i.id)))) {
        const label = inv.invoiceNumber ? `Invoice #${inv.invoiceNumber}` : `Invoice ${String(inv.id)}`;
        lineItems.push({ name: label, amount: inv.total, quantity: 1 });
      }
      // Prepayment
      if (prepay > 0) {
        lineItems.push({ name: "Prepayment", amount: prepay, quantity: 1 });
      }

      const res = await fetch("/functions/v1/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "payment", lineItems, customerEmail: user?.email })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data.url) {
        // Redirect to Stripe-hosted checkout
        window.location.href = data.url;
      } else {
        throw new Error("Missing checkout URL");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast({ title: "Stripe Checkout Error", description: "Unable to initialize Stripe session.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Checkout" />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          <Card className="p-6 bg-gradient-card border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4">Cart</h2>
            {items.length === 0 ? (
              <p className="text-muted-foreground">Your cart is empty.</p>
            ) : (
              <div className="space-y-3">
                {items.map(i => (
                  <div key={i.id} className="flex items-center justify-between p-3 bg-background/50 rounded border border-border">
                    <div>
                      <p className="font-semibold text-foreground">{i.name}</p>
                      <p className="text-sm text-muted-foreground">Qty: {i.quantity} {i.vehicleType ? `· ${i.vehicleType}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-primary">${(i.price * i.quantity).toFixed(2)}</p>
                      <Button variant="ghost" size="icon" onClick={() => handleRemove(i.id)} aria-label="Remove">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3">
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <span className="text-lg font-bold text-foreground">${cartSubtotal.toFixed(2)}</span>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6 bg-gradient-card border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4">Unpaid Invoices</h2>
            {invoices.length === 0 ? (
              <p className="text-muted-foreground">No unpaid invoices.</p>
            ) : (
              <div className="space-y-2">
                {invoices.map(inv => (
                  <label key={String(inv.id)} className="flex items-center justify-between p-3 bg-background/50 rounded border border-border cursor-pointer">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={selectedInvoiceIds.includes(String(inv.id))} onChange={() => toggleInvoice(String(inv.id))} />
                      <div>
                        <p className="font-semibold text-foreground">Invoice #{inv.invoiceNumber || "N/A"}</p>
                        <p className="text-sm text-muted-foreground">${inv.total.toFixed(2)}</p>
                      </div>
                    </div>
                  </label>
                ))}
                <div className="flex items-center justify-between p-3">
                  <span className="text-sm text-muted-foreground">Selected Invoices Total</span>
                  <span className="text-lg font-bold text-foreground">${invoicesTotal.toFixed(2)}</span>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6 bg-gradient-card border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4">Make a Prepayment</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <Label>Amount</Label>
                <Input type="number" value={prepayAmount} onChange={(e)=>setPrepayAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="flex items-end">
                <Button className="w-full" variant="outline" onClick={() => setPrepayAmount("")}>Clear</Button>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">Grand Total</p>
                <p className="text-2xl font-bold text-foreground">${grandTotal.toFixed(2)}</p>
              </div>
              <Button className="bg-gradient-hero" onClick={handleCheckout}>
                <CreditCard className="h-4 w-4 mr-2" />
                Proceed to Stripe Checkout
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Checkout;
