import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { CheckCircle2, ShieldAlert, Loader2, Car, DollarSign, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser } from '@/lib/auth';
import { PaymentWorkflowHelp } from "@/components/help/PaymentWorkflowHelp";

interface Invoice {
  id?: string;
  invoiceNumber?: number;
  customerId: string;
  customerName: string;
  vehicle: string;
  services: { name: string; price: number }[];
  total: number;
  date: string;
  serviceDate?: string;
  paymentStatus?: "unpaid" | "partially-paid" | "paid";
  paidAmount?: number;
  paidDate?: string;
  discount?: { type: "fixed" | "percent"; value: number; } | null;
  notes?: string;
}

export default function CustomerInvoicePage() {
    const { id } = useParams<{ id: string }>();
    const { toast } = useToast();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [processingPayment, setProcessingPayment] = useState(false);
    
    // Check if we are on the success or canceled paths
    const isSuccess = window.location.pathname.includes('/payment-success');
    const isCanceled = window.location.pathname.includes('/payment-canceled');
    const hasProcessedSuccess = useRef(false);

    useEffect(() => {
        setUser(getCurrentUser());
        if (id) {
            fetchInvoice(id);
        }
    }, [id]);

    const fetchInvoice = async (invoiceId: string) => {
        try {
            const { data, error: fetchError } = await supabase
                .from('invoices')
                .select('*, customers(full_name, email, phone)')
                .eq('id', invoiceId)
                .maybeSingle();

            if (fetchError || !data) {
                setError("Invoice not found or expired.");
                setLoading(false);
                return;
            }

            let parsedServices = data.services || [];
            if (typeof parsedServices === 'string') {
                try { parsedServices = JSON.parse(parsedServices); } catch (e) { parsedServices = []; }
            }

            // Extract virtuals
            let vehicle = data.vehicle || "Unknown";
            let notes = data.notes || "";
            let discount = data.discount || null;
            let serviceDate = data.service_date || "";

            const cleanServices = parsedServices.filter((s: any) => {
                if (!s.name) return false;
                if (s.name.startsWith("VIRTUAL_VEHICLE:")) { vehicle = s.name.split(":")[1]; return false; }
                if (s.name.startsWith("VIRTUAL_NOTES:")) { notes = s.name.substring("VIRTUAL_NOTES:".length); return false; }
                if (s.name.startsWith("VIRTUAL_DISCOUNT:")) { try { discount = JSON.parse(s.name.substring("VIRTUAL_DISCOUNT:".length)); } catch(e){} return false; }
                if (s.name.startsWith("VIRTUAL_SERVICE_DATE:")) { serviceDate = s.name.split(":")[1]; return false; }
                if (s.name.startsWith("VIRTUAL_")) return false;
                return true;
            });

            const inv: Invoice = {
                id: data.id,
                invoiceNumber: data.invoice_number,
                customerId: data.customer_id,
                customerName: data.customers?.full_name || data.customer_name || 'Unknown',
                vehicle,
                services: cleanServices,
                total: data.total || 0,
                date: data.date,
                serviceDate,
                paymentStatus: data.status || 'unpaid',
                paidAmount: data.paid_amount || 0,
                paidDate: data.paid_date,
                discount,
                notes
            };

            setInvoice(inv);
            
            if (isSuccess && !hasProcessedSuccess.current) {
                handleSuccess(inv);
            } else {
                setLoading(false);
            }

        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleSuccess = async (inv: Invoice) => {
        hasProcessedSuccess.current = true;
        try {
            // Only update and notify if it wasn't already marked paid via frontend
            if (!inv.notes?.includes('[PAID_VIA_STRIPE]')) {
                const newNotes = `${inv.notes || ''}\n\n[PAID_VIA_STRIPE]`.trim();
                
                await supabase.from('invoices').update({ 
                    status: 'paid',
                    paid_amount: inv.total,
                    paid_date: new Date().toISOString().split('T')[0],
                    notes: newNotes
                }).eq('id', inv.id);

                await supabase.from('engagements').insert({
                    customer_id: inv.customerId,
                    customer_name: inv.customerName,
                    type: 'Invoice Payment',
                    message: `Invoice #${inv.invoiceNumber || ''} PAID via Stripe online.`,
                    note: `Amount Paid: $${inv.total.toFixed(2)}`
                });

                try {
                    await supabase.functions.invoke('send-booking-email', {
                        body: {
                            to: 'Rick.PrimeAutoDetail@gmail.com',
                            subject: `💰 INVOICE PAID: ${inv.customerName} - #${inv.invoiceNumber || 'N/A'}`,
                            customerName: inv.customerName,
                            date: new Date().toLocaleDateString(),
                            time: 'N/A',
                            service: 'Stripe Invoice Payment',
                            price: inv.total,
                            status: 'PAID',
                            notes: `Customer has successfully paid their invoice online via Stripe.`
                        }
                    });
                } catch (e) { console.error('Email notification failed:', e); }

                // Update local state so UI reflects paid
                setInvoice(prev => prev ? { ...prev, paymentStatus: 'paid', notes: newNotes } : null);
            }
        } catch (error) {
            console.error("Error finalizing success:", error);
        }
        setLoading(false);
    };

    const handlePayNow = async () => {
        if (!invoice) return;
        setProcessingPayment(true);
        try {
            const lineItems = invoice.services.map(s => ({
                name: s.name,
                amount: s.price,
                quantity: 1
            }));

            // Handle discounts securely by passing negative amount line item or subtracting from total
            // Since create-checkout takes lineItems, we'll append the discount if applicable
            let discountAmount = 0;
            if (invoice.discount && invoice.discount.value > 0) {
                if (invoice.discount.type === 'percent') {
                    discountAmount = (invoice.total + discountAmount) * (invoice.discount.value / 100);
                } else {
                    discountAmount = invoice.discount.value;
                }
                if (discountAmount > 0) {
                    lineItems.push({
                        name: `Discount (${invoice.discount.type === 'percent' ? invoice.discount.value + '%' : 'Fixed'})`,
                        amount: -discountAmount,
                        quantity: 1
                    });
                }
            }

            // clientUrl will be used to generate success_url and cancel_url in edge function
            // We pass /invoice-success/:id so success_url becomes /invoice-success/:id/payment-success
            const baseOrigin = window.location.origin;
            const checkoutClientUrl = `${baseOrigin}/invoice-success/${invoice.id}`;

            const { data, error } = await supabase.functions.invoke("create-checkout", {
                body: { 
                    mode: "payment", 
                    lineItems, 
                    customerEmail: undefined,
                    clientUrl: checkoutClientUrl,
                    metadata: {
                        invoiceIds: invoice.id,
                        total: invoice.total.toFixed(2),
                        isInvoicePayment: 'true'
                    }
                }
            });

            if (error) throw new Error(error.message || "Checkout initialization failed");
            if (data?.url) {
                window.location.href = data.url;
            } else {
                throw new Error("No checkout URL returned.");
            }
        } catch (e: any) {
            toast({ title: "Checkout Error", description: e.message, variant: "destructive" });
            setProcessingPayment(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        </div>;
    }

    if (error || !invoice) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
                <Card className="max-w-md w-full bg-zinc-900 border-zinc-800 text-center py-8 shadow-2xl">
                    <ShieldAlert className="w-16 h-16 text-zinc-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Invoice Unavailable</h2>
                    <p className="text-zinc-400 mb-6 px-4">{error || "This invoice has expired or cannot be found."}</p>
                    <Button onClick={() => window.location.href = 'https://primeautodetail.net'} variant="outline" className="border-blue-500 text-blue-400 hover:bg-blue-500/10">
                        Visit PrimeAutoDetail.net
                    </Button>
                </Card>
            </div>
        );
    }

    const isPaid = invoice.paymentStatus === 'paid';

    // Calculate actual total
    let finalTotal = invoice.services.reduce((sum, s) => sum + Number(s.price), 0);
    let discountAmount = 0;
    if (invoice.discount && invoice.discount.value > 0) {
        if (invoice.discount.type === 'percent') {
            discountAmount = finalTotal * (invoice.discount.value / 100);
        } else {
            discountAmount = invoice.discount.value;
        }
        finalTotal = Math.max(0, finalTotal - discountAmount);
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-20 font-sans">
            {/* Header branding */}
            <div className="w-full bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800 p-6 flex flex-col items-center justify-center">
                <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
                    PRIME AUTO DETAIL
                </h1>
                <p className="text-sm text-zinc-400 font-semibold tracking-widest uppercase mt-1">Professional Detailing Solutions</p>
                
                {/* Optional Login Prompt */}
                {!user && (
                    <div className="mt-4 text-xs text-zinc-500 flex items-center gap-2 bg-zinc-900/50 py-1.5 px-3 rounded-full border border-zinc-800/50 transition-all hover:bg-zinc-800">
                        <span>Have a Prime Auto Detail account?</span>
                        <Link to="/login" className="text-blue-400 hover:text-blue-300 font-bold underline underline-offset-2">Sign in to view history</Link>
                    </div>
                )}
            </div>

            <main className="container mx-auto px-4 py-8 max-w-2xl">
                
                {isSuccess && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-2xl mb-8 text-center animate-in fade-in slide-in-from-top-4 duration-500 shadow-lg shadow-emerald-900/20">
                        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-black text-emerald-400 uppercase tracking-tight mb-2">Payment Successful!</h2>
                        <p className="text-emerald-100 font-medium">
                            Thank you {invoice.customerName.split(' ')[0]}! Your payment has been received. A receipt has been sent to your email. We look forward to seeing you again!
                        </p>
                    </div>
                )}

                {isCanceled && (
                    <div className="bg-zinc-900 border border-red-500/30 p-6 rounded-2xl mb-8 text-center animate-in fade-in slide-in-from-top-4 duration-500">
                        <h2 className="text-xl font-bold text-zinc-300 mb-2 flex items-center justify-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-red-400" />
                            Payment Incomplete
                        </h2>
                        <p className="text-zinc-500">
                            It looks like your payment was not completed. Please try again or contact Rick at PrimeAutoDetail.net for assistance.
                        </p>
                    </div>
                )}

                <Card className="bg-zinc-900 border-zinc-800 overflow-hidden shadow-2xl relative">
                    {/* PAID WATERMARK */}
                    {isPaid && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 pointer-events-none opacity-10">
                            <span className="text-[120px] font-black text-emerald-500 uppercase tracking-tighter">PAID</span>
                        </div>
                    )}

                    <div className="bg-zinc-950 p-6 border-b border-zinc-800 flex justify-between items-start">
                        <div>
                            <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1 flex items-center gap-2">
                                Tax Invoice
                                {user && <PaymentWorkflowHelp variant="customer-invoice-page" />}
                            </h2>
                            <p className="text-3xl font-black text-white">#{invoice.invoiceNumber || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-zinc-400 mb-1">Issued: {invoice.date ? new Date(invoice.date).toLocaleDateString() : 'N/A'}</p>
                            {isPaid ? (
                                <p className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 inline-block uppercase tracking-wider">
                                    Paid in Full
                                </p>
                            ) : (
                                <p className="text-xs text-amber-500 font-bold bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 inline-block uppercase tracking-wider">
                                    Payment Pending
                                </p>
                            )}
                        </div>
                    </div>

                    <CardContent className="p-0 z-10 relative">
                        <div className="p-6 grid gap-6 border-b border-zinc-800">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
                                    <Car className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Billed To</p>
                                    <p className="font-medium text-white text-lg">{invoice.customerName}</p>
                                    <p className="text-zinc-400 text-sm mt-0.5 font-medium">{invoice.vehicle}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-4">Services Rendered</p>
                            <div className="space-y-4">
                                {invoice.services.map((svc, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm">
                                        <span className="text-zinc-200 font-medium">{svc.name}</span>
                                        <span className="text-zinc-100 font-mono">${Number(svc.price).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 pt-4 border-t border-zinc-800 space-y-2">
                                <div className="flex justify-between items-center text-sm text-zinc-400">
                                    <span>Subtotal</span>
                                    <span className="font-mono">${invoice.services.reduce((a,b)=>a+Number(b.price),0).toFixed(2)}</span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className="flex justify-between items-center text-sm text-emerald-400">
                                        <span>Discount {invoice.discount?.type === 'percent' ? `(${invoice.discount.value}%)` : ''}</span>
                                        <span className="font-mono">-${discountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-end pt-4">
                                    <span className="text-lg font-bold text-white uppercase tracking-wider">Total Due</span>
                                    <span className="text-3xl font-black text-blue-400 font-mono">${finalTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="flex-col items-center bg-zinc-950 p-6 border-t border-zinc-800">
                        <p className="text-xs text-zinc-500 italic text-center font-medium max-w-sm">
                            Thank you for trusting Prime Auto Detail with your vehicle. We truly appreciate your business!
                        </p>
                    </CardFooter>
                </Card>

                {/* ACTION BUTTON */}
                <div className="mt-8">
                    {isPaid ? (
                        <div className="w-full h-14 bg-emerald-950 border border-emerald-900 text-emerald-400 font-bold text-lg rounded-lg flex items-center justify-center shadow-inner">
                            <CheckCircle2 className="w-5 h-5 mr-2" /> PAID IN FULL
                        </div>
                    ) : (
                        <Button 
                            onClick={handlePayNow} 
                            disabled={processingPayment}
                            className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg shadow-xl shadow-blue-900/20 transition-all hover:scale-[1.01]"
                        >
                            {processingPayment ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CreditCard className="w-5 h-5 mr-2" />}
                            PAY NOW VIA STRIPE
                        </Button>
                    )}
                </div>

            </main>
        </div>
    );
}
