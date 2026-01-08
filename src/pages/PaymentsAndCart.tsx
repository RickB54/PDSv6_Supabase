import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSupabaseInvoices } from "@/lib/supa-data";
import { Link } from "react-router-dom";
import { ShoppingCart, Trash2, CreditCard } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { toast } from "@/components/ui/use-toast";

interface Invoice {
    id?: string;
    invoiceNumber?: number;
    customerId: string;
    customerName: string;
    vehicle: string;
    services: { name: string; price: number }[];
    total: number;
    date: string;
    paymentStatus?: "unpaid" | "partially-paid" | "paid";
}

const PaymentsAndCart = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const { items, subtotal, removeItem } = useCartStore();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const userInvoices = await getSupabaseInvoices(true);
            setInvoices(userInvoices);
        } catch (error) {
            console.error('Error loading payments:', error);
            toast({
                title: "Error loading data",
                description: "Problem loading payments.",
                variant: "destructive"
            });
        }
    };

    const unpaidInvoices = invoices.filter(inv => (inv.paymentStatus || "unpaid") !== "paid");
    const paidInvoices = invoices.filter(inv => (inv.paymentStatus || "unpaid") === "paid");

    return (
        <div className="min-h-screen bg-background">
            <PageHeader title="Payments & Cart" />
            <main className="container mx-auto px-4 py-8 max-w-5xl animate-fade-in">
                <Card className="p-6 border-border relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-purple-600/10 pointer-events-none" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-full bg-primary/10">
                                <ShoppingCart className="h-6 w-6 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold text-foreground">Shopping Cart & Payments</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* My Cart */}
                            <div>
                                <h3 className="text-lg font-semibold text-foreground mb-2">My Cart</h3>
                                {items.length === 0 ? (
                                    <p className="text-muted-foreground border border-dashed rounded p-4 text-center">Your cart is empty.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {items.map(i => (
                                            <div key={i.id} className="flex items-center justify-between p-3 bg-background/50 rounded border border-border">
                                                <div>
                                                    <p className="font-semibold text-foreground">{i.name}</p>
                                                    <p className="text-sm text-muted-foreground">Qty: {i.quantity} {i.vehicleType ? `· ${i.vehicleType}` : ""}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <p className="font-bold text-primary">${(i.price * i.quantity).toFixed(2)}</p>
                                                    <Button variant="ghost" size="icon" onClick={() => removeItem(i.id)} aria-label="Remove">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="flex items-center justify-between p-2">
                                            <span className="text-sm text-muted-foreground">Subtotal</span>
                                            <span className="text-lg font-bold text-foreground">${subtotal().toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}
                                {items.length > 0 && (
                                    <div className="mt-3 flex items-center justify-end">
                                        <Link to="/checkout">
                                            <Button variant="default" className="bg-primary text-primary-foreground">
                                                <ShoppingCart className="h-4 w-4 mr-2" />
                                                Make a Payment
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* Unpaid Invoices */}
                            <div>
                                <h3 className="text-lg font-semibold text-foreground mb-2">Unpaid Invoices</h3>
                                {unpaidInvoices.length === 0 ? (
                                    <p className="text-muted-foreground border border-dashed rounded p-4 text-center">No unpaid invoices.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {unpaidInvoices.map(inv => (
                                            <div key={inv.id} className="p-3 bg-background/50 rounded border border-border flex items-center justify-between">
                                                <div>
                                                    <p className="font-semibold text-foreground">Invoice #{inv.invoiceNumber}</p>
                                                    <p className="text-sm text-muted-foreground">${inv.total.toFixed(2)}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Link to={`/checkout?invoice=${inv.id}`}>
                                                        <Button variant="default" className="bg-primary text-primary-foreground">
                                                            <CreditCard className="h-4 w-4 mr-2" />
                                                            Pay Invoice
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Payment History */}
                        <div className="mt-8 border-t pt-6">
                            <h3 className="text-lg font-semibold text-foreground mb-2">Payment History</h3>
                            {paidInvoices.length === 0 ? (
                                <p className="text-muted-foreground">No payments yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {paidInvoices.map(inv => (
                                        <div key={inv.id} className="p-3 bg-background/50 rounded border border-border">
                                            <div className="flex justify-between">
                                                <span>Invoice #{inv.invoiceNumber} — {inv.date}</span>
                                                <span className="font-semibold text-success">${inv.total.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </main>
        </div>
    );
};

export default PaymentsAndCart;
