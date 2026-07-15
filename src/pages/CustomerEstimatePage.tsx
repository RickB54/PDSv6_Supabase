import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Estimate } from '@/lib/supa-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { CheckCircle2, XCircle, ShieldAlert, Loader2, ChevronRight, Car, Calendar, DollarSign, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { getCurrentUser } from '@/lib/auth';
import { PaymentWorkflowHelp } from "@/components/help/PaymentWorkflowHelp";
import servicesQrCode from "@/assets/services-qr.png";

export default function CustomerEstimatePage() {
    const { id } = useParams<{ id: string }>();
    const { toast } = useToast();
    const [estimate, setEstimate] = useState<Estimate | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);

    const [isAccepted, setIsAccepted] = useState(false);
    const [isDeclined, setIsDeclined] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showPreCheck, setShowPreCheck] = useState(false);

    // Pre-check form state
    const [formData, setFormData] = useState({
        petHair: false,
        stains: false,
        stainDesc: '',
        odors: false,
        odorDesc: '',
        specialRequests: '',
        exteriorPaint: '',
        paintScratches: false,
        scratchDesc: '',
        interiorCondition: '',
        tireCondition: '',
        knownDamage: false,
        damageDesc: '',
        lastDetail: ''
    });

    useEffect(() => {
        setUser(getCurrentUser());
        if (id) {
            fetchEstimate(id);
        }
    }, [id]);

    const fetchEstimate = async (estimateId: string) => {
        try {
            // First try to fetch the estimate
            const { data, error: fetchError } = await supabase
                .from('estimates')
                .select('*, customers(full_name, email, phone)')
                .eq('id', estimateId)
                .maybeSingle();

            if (fetchError || !data) {
                setError("Estimate not found or expired.");
                setLoading(false);
                return;
            }

            // Ensure services is parsed if it's a string from Supabase
            let parsedServices = data.services || [];
            if (typeof parsedServices === 'string') {
                try {
                    parsedServices = JSON.parse(parsedServices);
                } catch (e) {
                    parsedServices = [];
                }
            }

            let virtualVehicle = null;
            let virtualCustomer = null;
            
            const finalServices = parsedServices.filter((s: any) => {
                if (s.name?.startsWith("VIRTUAL_SENT:")) return false;
                if (s.name?.startsWith("VIRTUAL_SENT_DATE:")) return false;
                if (s.name?.startsWith("VIRTUAL_VEHICLE:")) {
                    virtualVehicle = s.name.replace("VIRTUAL_VEHICLE:", "").trim();
                    return false;
                }
                if (s.name?.startsWith("VIRTUAL_CUSTOMER:")) {
                    virtualCustomer = s.name.replace("VIRTUAL_CUSTOMER:", "").trim();
                    return false;
                }
                return true;
            });

            const est: Estimate = {
                id: data.id,
                estimateNumber: data.estimate_number,
                customerId: data.customer_id,
                customerName: data.customers?.full_name || virtualCustomer || data.customer_name || 'Unknown',
                vehicleId: data.vehicle_id,
                vehicle: virtualVehicle || data.vehicle_type || 'Unknown',
                services: finalServices,
                total: data.total || 0,
                date: data.date,
                estimateDate: data.estimate_date,
                status: data.status || 'open',
                created_at: data.created_at,
                notes: data.notes || '',
                discount: data.discount || 0,
                discountType: data.discount_type
            };

            setEstimate(est);
            
            if (est.status === 'accepted') setIsAccepted(true);
            if (est.status === 'declined') setIsDeclined(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = () => {
        setShowPreCheck(true);
    };

    const handleDecline = async () => {
        if (!estimate || !id) return;
        setSubmitting(true);
        try {
            // Update estimate status
            const { error: updateError } = await supabase
                .from('estimates')
                .update({ status: 'declined' })
                .eq('id', id);

            if (updateError) throw updateError;

            // Log engagement
            await supabase.from('engagements').insert({
                customer_id: estimate.customerId,
                customer_name: estimate.customerName,
                type: 'Estimate Response',
                note: `[DECLINED_BY_CUSTOMER] Estimate #${estimate.estimateNumber || ''} DECLINED online.`
            });

            // Send Email Notification to Admin
            try {
                await supabase.functions.invoke('send-booking-email', {
                    body: {
                        to: 'rick.primeautodetail@gmail.com',
                        subject: `❌ ESTIMATE DECLINED: ${estimate.customerName} - #${estimate.estimateNumber || 'N/A'}`,
                        customerName: estimate.customerName,
                        customerEmail: '', // Not strictly needed
                        date: new Date().toLocaleDateString(),
                        time: 'N/A',
                        service: 'Estimate Response',
                        price: estimate.total,
                        status: 'DECLINED',
                        notes: `Customer has declined the estimate.`
                    }
                });
            } catch (e) { console.error('Failed to send email notification:', e); }

            setIsDeclined(true);
            toast({ title: "Response Recorded", description: "Thank you for letting us know." });
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    const submitAcceptance = async () => {
        if (!estimate || !id) return;
        setSubmitting(true);
        try {
            // Validate dropdowns
            if (!formData.exteriorPaint || !formData.interiorCondition || !formData.tireCondition || !formData.lastDetail) {
                throw new Error("Please complete all dropdown selections in the form.");
            }

            const preCheckString = JSON.stringify(formData);
            
            // Append hidden meta to notes
            const newNotes = `${estimate.notes || ''}\n\n[ACCEPTED_BY_CUSTOMER]\n[PRE_CHECK_DATA]: ${preCheckString}`;

            // Update estimate
            const { error: updateError } = await supabase
                .from('estimates')
                .update({ 
                    status: 'accepted',
                    notes: newNotes
                })
                .eq('id', id);

            if (updateError) throw updateError;

            // Log engagement
            await supabase.from('engagements').insert({
                customer_id: estimate.customerId,
                customer_name: estimate.customerName,
                type: 'Estimate Pre-Check',
                note: `[ACCEPTED_BY_CUSTOMER] Estimate #${estimate.estimateNumber || ''} ACCEPTED online. Customer completed the Pre-Check Form.`
            });

            // Send Email Notification to Admin
            try {
                // Create a readable HTML summary for the email
                let formSummaryHtml = `
                    <h3>Pre-Check Information:</h3>
                    <ul>
                        <li><strong>Pet Hair:</strong> ${formData.petHair ? 'Yes' : 'No'}</li>
                        <li><strong>Stains:</strong> ${formData.stains ? 'Yes (' + formData.stainDesc + ')' : 'No'}</li>
                        <li><strong>Odors:</strong> ${formData.odors ? 'Yes (' + formData.odorDesc + ')' : 'No'}</li>
                        <li><strong>Exterior Paint:</strong> ${formData.exteriorPaint}</li>
                        <li><strong>Scratches/Swirls:</strong> ${formData.paintScratches ? 'Yes (' + formData.scratchDesc + ')' : 'No'}</li>
                        <li><strong>Interior Condition:</strong> ${formData.interiorCondition}</li>
                        <li><strong>Tires/Wheels:</strong> ${formData.tireCondition}</li>
                        <li><strong>Known Damage:</strong> ${formData.knownDamage ? 'Yes (' + formData.damageDesc + ')' : 'No'}</li>
                        <li><strong>Last Detail:</strong> ${formData.lastDetail}</li>
                        <li><strong>Special Requests:</strong> ${formData.specialRequests || 'None'}</li>
                    </ul>
                `;

                await supabase.functions.invoke('send-booking-email', {
                    body: {
                        to: 'rick.primeautodetail@gmail.com',
                        subject: `✅ ESTIMATE ACCEPTED: ${estimate.customerName} - #${estimate.estimateNumber || 'N/A'}`,
                        customerName: estimate.customerName,
                        date: new Date().toLocaleDateString(),
                        time: 'N/A',
                        service: 'Estimate Acceptance',
                        price: estimate.total,
                        status: 'CONFIRMED',
                        notes: formSummaryHtml
                    }
                });
            } catch (e) { console.error('Failed to send email notification:', e); }

            setIsAccepted(true);
            setShowPreCheck(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e: any) {
            toast({ title: "Could not submit", description: e.message, variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        </div>;
    }

    if (error || !estimate) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
                <Card className="max-w-md w-full bg-zinc-900 border-zinc-800 text-center py-8">
                    <ShieldAlert className="w-16 h-16 text-zinc-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Estimate Unavailable</h2>
                    <p className="text-zinc-400 mb-6 px-4">{error || "This estimate has expired or cannot be found."}</p>
                    <Button onClick={() => window.location.href = 'https://primeautodetail.net'} variant="outline" className="border-blue-500 text-blue-400 hover:bg-blue-500/10">
                        Visit PrimeAutoDetail.net
                    </Button>
                </Card>
            </div>
        );
    }

    // Calculate actual total applying any discount
    let finalTotal = estimate.total;
    let discountAmount = 0;
    if (estimate.discount && estimate.discount > 0) {
        if (estimate.discountType === 'percent') {
            discountAmount = estimate.total * (estimate.discount / 100);
        } else {
            discountAmount = estimate.discount;
        }
        finalTotal = Math.max(0, estimate.total - discountAmount);
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
                    <div className="mt-4 text-xs text-zinc-500 flex items-center gap-2 bg-zinc-900/50 py-1.5 px-3 rounded-full border border-zinc-800/50">
                        <span>Have a Prime Auto Detail account?</span>
                        <Link to="/login" className="text-blue-400 hover:text-blue-300 font-bold underline underline-offset-2">Sign in</Link>
                    </div>
                )}
            </div>

            <main className="container mx-auto px-4 py-8 max-w-2xl">
                
                {(isAccepted && !showPreCheck) && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-2xl mb-8 text-center animate-in fade-in slide-in-from-top-4 duration-500">
                        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-black text-emerald-400 uppercase tracking-tight mb-2">Estimate Accepted!</h2>
                        <p className="text-emerald-100 mb-4">
                            Thank you, {estimate.customerName.split(' ')[0]}! Your estimate has been accepted and your vehicle information has been received. Rick will follow up shortly to confirm your appointment.
                        </p>
                        <p className="text-emerald-200/70 text-sm italic border-t border-emerald-500/20 pt-4 mt-2">
                            * Please note: While this estimate provides a comprehensive baseline, a final assessment of the vehicle in person is required to confirm the exact scope of work and final price.
                        </p>
                    </div>
                )}

                {(isDeclined && !showPreCheck) && (
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl mb-8 text-center animate-in fade-in slide-in-from-top-4 duration-500">
                        <h2 className="text-xl font-bold text-zinc-300 mb-2">Estimate Declined</h2>
                        <p className="text-zinc-500">
                            Thank you for letting us know. If you change your mind or have any questions, feel free to reach out through our Contact page at PrimeAutoDetail.net. We hope to hear from you soon!
                        </p>
                    </div>
                )}

                <Card className="bg-zinc-900 border-zinc-800 overflow-hidden shadow-2xl">
                    <div className="bg-zinc-950 p-6 border-b border-zinc-800 flex justify-between items-start">
                        <div>
                            <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1 flex items-center gap-2">
                                Service Estimate
                                {user && <PaymentWorkflowHelp variant="customer-estimate-page" />}
                            </h2>
                            <p className="text-3xl font-black text-white">#{estimate.estimateNumber || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-zinc-400 mb-1">Date: {estimate.estimateDate ? new Date(estimate.estimateDate).toLocaleDateString() : 'N/A'}</p>
                            <p className="text-xs text-zinc-500 font-medium bg-zinc-900 px-2 py-1 rounded border border-zinc-800 inline-block">
                                Valid until: {estimate.estimateDate ? new Date(new Date(estimate.estimateDate).getTime() + 30*24*60*60*1000).toLocaleDateString() : '30 days'}
                            </p>
                        </div>
                    </div>

                    <CardContent className="p-0">
                        <div className="p-6 grid gap-6 border-b border-zinc-800">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
                                    <Car className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Customer & Vehicle</p>
                                    <p className="font-medium text-white">{estimate.customerName}</p>
                                    <p className="text-zinc-400 text-sm mt-0.5">{estimate.vehicle}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-4">Proposed Services</p>
                            <div className="space-y-3">
                                {estimate.services.map((svc, i) => {
                                    // Skip virtual internal services
                                    if (svc.name.startsWith('VIRTUAL_')) return null;
                                    const isHeader = svc.name.startsWith('---') && svc.price === 0;
                                    if (isHeader) {
                                        return (
                                            <div key={i} className="pt-4 pb-1">
                                                <span className="text-emerald-400 font-bold uppercase tracking-wider text-xs">{svc.name.replace(/-/g, '').trim()}</span>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={i} className="flex justify-between items-center text-sm">
                                            <span className="text-zinc-300 font-medium">{svc.name}</span>
                                            <span className="text-zinc-100 font-mono">${Number(svc.price).toFixed(2)}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {(() => {
                                if (!(estimate.notes || '').includes('[SHOW_CATEGORY_SUBTOTALS]')) return null;
                                
                                const nameMap: Record<string, number> = {};
                                let duplicateFound = false;
                                estimate.services.forEach(s => {
                                    if (s.price > 0 && s.name && !s.name.startsWith('VIRTUAL_') && !s.name.startsWith('---')) {
                                        if (nameMap[s.name] !== undefined) {
                                            nameMap[s.name] += s.price;
                                            duplicateFound = true;
                                        } else {
                                            nameMap[s.name] = s.price;
                                        }
                                    }
                                });

                                if (!duplicateFound) return null;

                                return (
                                    <div className="mt-8 pt-6 border-t border-zinc-800 border-dashed">
                                        <p className="text-xs text-amber-500 font-bold uppercase tracking-wider mb-4">Fleet / Category Subtotals (All Vehicles)</p>
                                        <div className="space-y-3">
                                            {Object.keys(nameMap).map((key, i) => (
                                                <div key={i} className="flex justify-between items-center text-sm text-amber-200/80">
                                                    <span>Total for all {key}</span>
                                                    <span className="font-mono">${nameMap[key].toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            {!(estimate.notes || '').includes('[MENU_MODE]') && (
                                <div className="mt-8 pt-4 border-t border-zinc-800 space-y-2">
                                    <div className="flex justify-between items-center text-sm text-zinc-400">
                                        <span>Subtotal</span>
                                        <span className="font-mono">${estimate.total.toFixed(2)}</span>
                                    </div>
                                    {discountAmount > 0 && (
                                        <div className="flex justify-between items-center text-sm text-emerald-400">
                                            <span>Discount {estimate.discountType === 'percent' ? `(${estimate.discount}%)` : ''}</span>
                                            <span className="font-mono">-${discountAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-end pt-4">
                                        <span className="text-lg font-bold text-white uppercase tracking-wider">Estimated Total</span>
                                        <span className="text-3xl font-black text-amber-400 font-mono">${finalTotal.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                    </CardContent>

                    <CardFooter className="flex-col items-start bg-zinc-950 p-6 border-t border-zinc-800 space-y-4">
                        {(() => {
                            const rawNotes = (estimate.notes || '');
                            const publicNotes = rawNotes
                                .replace('[MENU_MODE]\n', '').replace('[MENU_MODE]', '')
                                .replace('[HIDE_VEHICLE_SUBTOTALS]\n', '').replace('[HIDE_VEHICLE_SUBTOTALS]', '')
                                .replace('[SHOW_CATEGORY_SUBTOTALS]\n', '').replace('[SHOW_CATEGORY_SUBTOTALS]', '')
                                .split('[ACCEPTED_BY_CUSTOMER]')[0]
                                .split('[PRE_CHECK_DATA]:')[0]
                                .split('=== INTERNAL HISTORY LOG ===')[0]
                                .trim();
                            if (!publicNotes) return null;
                            return (
                                <div className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-amber-500 mb-2">📝 Notes from Prime Auto Detail</p>
                                    <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{publicNotes}</p>
                                </div>
                            );
                        })()}
                        <p className="text-[11px] text-zinc-500 italic leading-relaxed w-full text-center">
                            This is an estimate for detailing services. Prices may vary based on actual vehicle condition upon arrival.
                        </p>
                    </CardFooter>
                </Card>

                {(!isAccepted && !isDeclined && !showPreCheck) && (
                    <div className="mt-8 grid md:grid-cols-2 gap-4">
                        <Button 
                            onClick={handleAccept} 
                            disabled={submitting}
                            className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg shadow-xl shadow-emerald-900/20"
                        >
                            <CheckCircle2 className="w-5 h-5 mr-2" /> ACCEPT THIS ESTIMATE
                        </Button>
                        <Button 
                            onClick={handleDecline} 
                            disabled={submitting}
                            variant="outline"
                            className="w-full h-14 border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-red-950 hover:text-red-400 hover:border-red-900 font-bold text-lg transition-colors"
                        >
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><XCircle className="w-5 h-5 mr-2" /> DECLINE ESTIMATE</>}
                        </Button>
                    </div>
                )}
                
                <div className="mt-8 bg-zinc-900/50 border border-zinc-800 p-8 rounded-2xl text-center shadow-2xl flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                    <h3 className="text-xl font-black text-white uppercase tracking-wider mb-3">View Our Services</h3>
                    <p className="text-sm text-zinc-400 mb-6 max-w-sm leading-relaxed">
                        Want to check out our full list of detailing packages or adjust your requested services? Scan the code below!
                    </p>
                    
                    <div className="bg-white p-3 rounded-2xl mb-5 shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)] border border-blue-500/20">
                        <img src={servicesQrCode} alt="Services QR Code" className="w-32 h-32" />
                    </div>
                    
                    <p className="text-[11px] font-bold text-zinc-300 uppercase tracking-widest mb-1.5">
                        Scan with your phone to view options
                    </p>
                    <a href="https://primeautodetail.net" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 text-xs font-mono break-all mb-6 transition-colors">
                        primeautodetail.net
                    </a>
                    
                    <div className="w-12 h-1 bg-zinc-800 rounded-full mb-6"></div>
                    
                    <p className="text-sm text-zinc-300 italic font-medium max-w-md">
                        Thank you for considering Prime Auto Detail for your vehicle!<br/>
                        We truly appreciate your business and look forward to serving you.
                    </p>
                </div>

                {showPreCheck && (
                    <div className="mt-8 animate-in slide-in-from-bottom-8 duration-500">
                        <Card className="bg-zinc-900 border-emerald-500/30 shadow-2xl shadow-emerald-900/10">
                            <CardHeader className="border-b border-zinc-800 bg-zinc-900/50">
                                <CardTitle className="text-xl text-emerald-400 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5" />
                                    Vehicle Condition Pre-Check
                                </CardTitle>
                                <p className="text-sm text-zinc-400 mt-1">Please help us prepare by answering a few quick questions about your vehicle's condition.</p>
                            </CardHeader>
                            <CardContent className="p-6 space-y-8">
                                
                                {/* BASIC CONDITION */}
                                <div className="space-y-6">
                                    <h3 className="text-xs font-black tracking-widest text-zinc-500 uppercase">Basic Condition</h3>
                                    
                                    <div className="flex items-center justify-between">
                                        <Label className="text-base text-zinc-200 cursor-pointer">Pet Hair Present?</Label>
                                        <Switch checked={formData.petHair} onCheckedChange={(c) => setFormData({...formData, petHair: c})} />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-base text-zinc-200 cursor-pointer">Stains Present?</Label>
                                            <Switch checked={formData.stains} onCheckedChange={(c) => setFormData({...formData, stains: c})} />
                                        </div>
                                        {formData.stains && (
                                            <div className="pl-4 border-l-2 border-zinc-800">
                                                <Input 
                                                    placeholder="Please describe location and type of stains..." 
                                                    value={formData.stainDesc} 
                                                    onChange={e => setFormData({...formData, stainDesc: e.target.value})}
                                                    className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-base text-zinc-200 cursor-pointer">Odors Present?</Label>
                                            <Switch checked={formData.odors} onCheckedChange={(c) => setFormData({...formData, odors: c})} />
                                        </div>
                                        {formData.odors && (
                                            <div className="pl-4 border-l-2 border-zinc-800">
                                                <Input 
                                                    placeholder="Please describe the odor (e.g. smoke, pet)..." 
                                                    value={formData.odorDesc} 
                                                    onChange={e => setFormData({...formData, odorDesc: e.target.value})}
                                                    className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* DETAILED CONDITION */}
                                <div className="space-y-6 pt-6 border-t border-zinc-800">
                                    <h3 className="text-xs font-black tracking-widest text-zinc-500 uppercase">Detailed Condition</h3>
                                    
                                    <div className="space-y-3">
                                        <Label className="text-sm text-zinc-300">Exterior Paint Condition *</Label>
                                        <Select value={formData.exteriorPaint} onValueChange={(v) => setFormData({...formData, exteriorPaint: v})}>
                                            <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12">
                                                <SelectValue placeholder="Select condition..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                                <SelectItem value="Excellent">Excellent</SelectItem>
                                                <SelectItem value="Good">Good</SelectItem>
                                                <SelectItem value="Fair">Fair (some wear)</SelectItem>
                                                <SelectItem value="Poor">Poor (heavy wear)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-base text-zinc-200 cursor-pointer">Paint Scratches or Swirl Marks?</Label>
                                            <Switch checked={formData.paintScratches} onCheckedChange={(c) => setFormData({...formData, paintScratches: c})} />
                                        </div>
                                        {formData.paintScratches && (
                                            <div className="pl-4 border-l-2 border-zinc-800">
                                                <Input 
                                                    placeholder="Please describe..." 
                                                    value={formData.scratchDesc} 
                                                    onChange={e => setFormData({...formData, scratchDesc: e.target.value})}
                                                    className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-sm text-zinc-300">Interior Condition *</Label>
                                        <Select value={formData.interiorCondition} onValueChange={(v) => setFormData({...formData, interiorCondition: v})}>
                                            <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12">
                                                <SelectValue placeholder="Select condition..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                                <SelectItem value="Excellent">Excellent</SelectItem>
                                                <SelectItem value="Good">Good</SelectItem>
                                                <SelectItem value="Fair">Fair (some wear)</SelectItem>
                                                <SelectItem value="Poor">Poor (heavy wear)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-sm text-zinc-300">Tire and Wheel Condition *</Label>
                                        <Select value={formData.tireCondition} onValueChange={(v) => setFormData({...formData, tireCondition: v})}>
                                            <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12">
                                                <SelectValue placeholder="Select condition..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                                <SelectItem value="Excellent">Excellent</SelectItem>
                                                <SelectItem value="Good">Good</SelectItem>
                                                <SelectItem value="Fair">Fair (some wear)</SelectItem>
                                                <SelectItem value="Poor">Poor (heavy wear)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-base text-zinc-200 cursor-pointer">Any Known Damage to Report?</Label>
                                            <Switch checked={formData.knownDamage} onCheckedChange={(c) => setFormData({...formData, knownDamage: c})} />
                                        </div>
                                        {formData.knownDamage && (
                                            <div className="pl-4 border-l-2 border-zinc-800">
                                                <Input 
                                                    placeholder="Please describe..." 
                                                    value={formData.damageDesc} 
                                                    onChange={e => setFormData({...formData, damageDesc: e.target.value})}
                                                    className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-sm text-zinc-300">How long since last professional detail? *</Label>
                                        <Select value={formData.lastDetail} onValueChange={(v) => setFormData({...formData, lastDetail: v})}>
                                            <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12">
                                                <SelectValue placeholder="Select duration..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                                <SelectItem value="Never">Never</SelectItem>
                                                <SelectItem value="Less than 6 months">Less than 6 months</SelectItem>
                                                <SelectItem value="6-12 months">6-12 months</SelectItem>
                                                <SelectItem value="Over 1 year">Over 1 year</SelectItem>
                                                <SelectItem value="Over 2 years">Over 2 years</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    
                                    <div className="space-y-3 pt-4">
                                        <Label className="text-sm font-bold text-amber-400">📝 Special Requests or Notes</Label>
                                        <p className="text-[11px] text-zinc-500">For multi-vehicle estimates: please specify which service (Exterior Only, Interior Only, or Full Detail) you'd like for each vehicle.</p>
                                        <Textarea 
                                            placeholder="e.g. Ford Bronco → Full Detail, Mini Cooper → Exterior Only, Audi Q7 → Interior Only... or any other requests!" 
                                            value={formData.specialRequests}
                                            onChange={(e) => setFormData({...formData, specialRequests: e.target.value})}
                                            className="bg-zinc-950 border-zinc-800 min-h-[120px] text-zinc-100 placeholder:text-zinc-600"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-zinc-950 border-t border-zinc-800 p-6">
                                <Button 
                                    onClick={submitAcceptance} 
                                    disabled={submitting}
                                    className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg"
                                >
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                                    SUBMIT PRE-CHECK & ACCEPT
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    );
}
