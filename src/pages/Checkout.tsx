import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import { ArrowLeft, Trash2, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCartStore } from "@/store/cart";
import { useToast } from "@/hooks/use-toast";
import { getInvoices } from "@/lib/db";
import { useCouponsStore } from "@/store/coupons";
import { Tag, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Invoice {
  id: string; // Required for getInvoices type safety
  invoiceNumber?: number;
  customerId?: string;
  customerName?: string;
  total: number;
  date?: string;
  paymentStatus?: "unpaid" | "partially-paid" | "paid";
  paidAmount?: number;
  services?: any[];
  tipAmount?: number;
}

const Checkout = () => {
  const { toast } = useToast();
  const { items, removeItem, clear, subtotal } = useCartStore();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [prepayAmount, setPrepayAmount] = useState<string>("");
  const user = getCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const amountParam = params.get("amount");

    if (amountParam && !prepayAmount) {
      setPrepayAmount(amountParam);
      toast({ 
        title: "Payment Information Found", 
        description: `Pre-filling the estimate amount of $${amountParam}.`,
      });
    }
  }, []);

  // Coupon states
  const { refresh: refreshCoupons } = useCouponsStore();
  const [couponCode, setCouponCode] = useState("");
  const [matchedCoupon, setMatchedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState("");
  const [showCouponField, setShowCouponField] = useState(false);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Tip states
  const [tipSelection, setTipSelection] = useState<number>(0); // percent or -1 for custom, 0 for none
  const [customTipValue, setCustomTipValue] = useState<string>("");

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

  const totalBeforeDiscount = cartSubtotal + invoicesTotal + prepay;
  const appliedDiscount = matchedCoupon
    ? (matchedCoupon.percent ? (totalBeforeDiscount * matchedCoupon.percent / 100) : (matchedCoupon.amount || 0))
    : 0;

  const totalBeforeTip = Math.max(0, totalBeforeDiscount - appliedDiscount);

  // Smart Tip Logic
  const hasExistingTip = invoices.filter(i => selectedInvoiceIds.includes(String(i.id))).some(inv => {
    if (inv.tipAmount && inv.tipAmount > 0) return true;
    if (Array.isArray(inv.services)) {
      return inv.services.some(s => 
        s.name && (
          s.name.includes("VIRTUAL_TIP") || 
          s.name.toLowerCase().includes("tip") || 
          s.name.toLowerCase().includes("gratuity")
        )
      );
    }
    return false;
  });

  const showTipSection = !hasExistingTip && (items.length > 0 || selectedInvoiceIds.length > 0);

  const tipAmount = tipSelection === -1 
    ? (parseFloat(customTipValue) || 0) 
    : (tipSelection > 0 ? (totalBeforeTip * tipSelection) / 100 : 0);

  const grandTotal = totalBeforeTip + tipAmount;

  const applyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    setIsApplyingCoupon(true);
    setCouponError('');

    try {
      await refreshCoupons();
      const freshItems = useCouponsStore.getState().items;
      const match = freshItems.find((c: any) => c.code === code);

      if (!match) {
        setMatchedCoupon(null);
        setCouponError('Invalid promo code');
        return;
      }

      if (!match.active) {
        setMatchedCoupon(null);
        setCouponError('This coupon is currently disabled');
        return;
      }

      setMatchedCoupon(match);
      toast({ title: "Success!", description: `Coupon ${match.code} applied.` });
    } catch (err) {
      setCouponError('Could not validate coupon');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

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
      
      // Gratuity
      if (tipAmount > 0) {
        lineItems.push({ name: "Gratuity", amount: tipAmount, quantity: 1 });
      }

      // Read search params for guest tracking
      const params = new URLSearchParams(window.location.search);
      const guestBookingId = params.get("bookingId");
      const guestEmail = params.get("email");

      // Use supabase.functions.invoke for standard auth and compatibility
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { 
          mode: "payment", 
          lineItems, 
          customerEmail: user?.email || guestEmail || undefined,
          clientUrl: window.location.origin,
          metadata: {
            invoiceIds: selectedInvoiceIds.join(','),
            userId: user?.id,
            total: grandTotal.toFixed(2),
            bookingId: guestBookingId || undefined
          }
        }
      });

      if (error) {
        console.error("Supabase Function Error:", error);
        throw new Error(error.message || "Function invocation failed");
      }

      if (data?.url) {
        // Redirect to Stripe-hosted checkout
        window.location.href = data.url;
      } else {
        throw new Error(data?.error || "Missing checkout URL from Stripe response");
      }
    } catch (err: any) {
      console.error("Detailed Checkout error:", err);
      toast({ 
        title: "Stripe Checkout Error", 
        description: err.message || "Unable to initialize Stripe session.", 
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-24 max-w-6xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8 hover:bg-zinc-100 text-zinc-500 hover:text-black font-bold uppercase tracking-widest text-[10px]">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
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
                <Input type="number" value={prepayAmount} onChange={(e) => setPrepayAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="flex items-end">
                <Button className="w-full" variant="outline" onClick={() => setPrepayAmount("")}>Clear</Button>
              </div>
            </div>
          </Card>

          {/* Promo Code */}
          <Card className="p-6 bg-gradient-to-br from-zinc-900/40 to-black border-zinc-800 shadow-xl">
            {!showCouponField ? (
              <button
                type="button"
                onClick={() => setShowCouponField(true)}
                className="text-sm text-primary hover:text-primary/80 font-bold transition-colors flex items-center gap-2 uppercase tracking-tight"
              >
                <Tag className="w-4 h-4" />
                Apply Promotional Code
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-tight">Promotional Code</h3>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Enter code"
                    className="h-11 bg-black border-zinc-800 text-white uppercase"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); } }}
                  />
                  <Button
                    className="h-11 px-6 bg-primary hover:bg-primary/90 text-white font-bold uppercase"
                    type="button"
                    disabled={isApplyingCoupon}
                    onClick={applyCoupon}
                  >
                    {isApplyingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                  </Button>
                </div>
                {matchedCoupon && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-md flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-emerald-500 font-bold text-sm">
                      {matchedCoupon.code} applied! Saving ${appliedDiscount.toFixed(2)}
                    </span>
                  </div>
                )}
                {couponError && (
                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-md flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-red-500 font-bold text-sm">{couponError}</span>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Gratuity Section */}
          {showTipSection && (
            <Card className="p-6 bg-gradient-card border-border animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-xl font-bold text-foreground mb-2">Add a Gratuity (Optional)</h2>
              <p className="text-sm text-muted-foreground mb-5">100% of tips go directly to your detailer. Thank you for your support!</p>
              <div className="flex flex-wrap gap-3 mb-4">
                {[15, 20, 25].map(pct => (
                  <Button
                    key={pct}
                    variant={tipSelection === pct ? "default" : "outline"}
                    onClick={() => setTipSelection(pct === tipSelection ? 0 : pct)}
                    className={tipSelection === pct ? "bg-primary text-primary-foreground font-bold" : ""}
                  >
                    {pct}% (${((totalBeforeTip * pct) / 100).toFixed(2)})
                  </Button>
                ))}
                <Button
                  variant={tipSelection === -1 ? "default" : "outline"}
                  onClick={() => setTipSelection(tipSelection === -1 ? 0 : -1)}
                  className={tipSelection === -1 ? "bg-primary text-primary-foreground font-bold" : ""}
                >
                  Custom
                </Button>
              </div>
              
              {tipSelection === -1 && (
                <div className="flex items-center gap-2 max-w-xs animate-in fade-in slide-in-from-top-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">$</span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="pl-7"
                      value={customTipValue}
                      onChange={(e) => setCustomTipValue(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </Card>
          )}

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
