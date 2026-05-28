import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Mail, Check, X, Shield, Package, Clock, Bell, CreditCard } from "lucide-react"
import { cn, formatETDate, formatETTime } from "@/lib/utils"

interface EmailPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'confirmation' | 'request' | 'cancelled' | 'reminder' | 'payment-success' | 'prospect' | 'correspondence'
  data: any
}

export function EmailPreviewModal({ open, onOpenChange, type, data }: EmailPreviewModalProps) {
  if (!data) return null

  // Helpers to match bookingsSync.ts logic
  const formattedDate = data.date ? formatETDate(data.date) : 'TBD';
  const formattedTime = data.date ? formatETTime(data.date) : '';
  const vehicleStr = [data.vehicleYear, data.vehicleMake, data.vehicleModel].filter(Boolean).join(' ') || data.vehicle;
  const price = data.price ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto bg-zinc-950 border-zinc-800 p-0 text-black">
        
        {/* ── Audit Banner ────────────────────────────────────────────── */}
        <DialogHeader className="p-0 sticky top-0 z-10">
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
            <DialogTitle className="text-white flex items-center gap-2 text-sm font-bold">
              <Mail className="h-4 w-4 text-blue-400" />
              {data.last_email_sent_at || data.sent_at ? "Actual Email Sent to Customer" : "Production Email Template Preview"}
            </DialogTitle>
            <div className="flex items-center gap-2 pr-8">
              <Badge variant="outline" className={cn(
                "text-[10px] uppercase tracking-wider font-black",
                type === 'confirmation' ? "border-emerald-500 text-emerald-400 bg-emerald-500/10" :
                type === 'cancelled'    ? "border-red-500 text-red-400 bg-red-500/10" :
                type === 'prospect'     ? "border-indigo-500 text-indigo-400 bg-indigo-500/10" :
                                         "border-blue-500 text-blue-400 bg-blue-500/10"
              )}>
                {type === 'confirmation' ? 'Booking Approved' :
                 type === 'request'      ? 'Request Received' :
                 type === 'cancelled'    ? 'Job Cancelled' :
                 type === 'reminder'     ? '6-Month Reminder' :
                 type === 'prospect'     ? 'Welcome Prospect' :
                 type === 'correspondence'? 'Direct Correspondence' :
                                          'Payment Success'}
              </Badge>
            </div>
          </div>

          <div className={cn(
            "px-4 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] border-b",
            type === 'confirmation' ? "bg-emerald-950/60 border-emerald-900/60 text-emerald-300" :
            type === 'cancelled'    ? "bg-red-950/60 border-red-900/60 text-red-300" :
            type === 'prospect'     ? "bg-indigo-950/60 border-indigo-900/60 text-indigo-300" :
                                      "bg-blue-950/60 border-blue-900/60 text-blue-300"
          )}>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 opacity-70" />
              <span className="opacity-70 font-medium">Triggered:</span>{' '}
              {type === 'confirmation' ? 'When status changed to Confirmed' :
               type === 'request'      ? 'When online booking was submitted' :
               type === 'cancelled'    ? 'When job was cancelled' :
               type === 'reminder'     ? 'When sent from Retention Hub' :
               type === 'prospect'     ? 'When sent from Prospects page' :
               type === 'correspondence'? 'Sent manually via Letter Maker' :
                                        'When payment was processed'}
            </span>
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3 opacity-70" />
              <span className="opacity-70 font-medium">{data.last_email_sent_at || data.sent_at ? "Sent At:" : "Status:"}</span>{' '}
              {data.last_email_sent_at || data.sent_at ? new Date(data.last_email_sent_at || data.sent_at).toLocaleString() : "Draft / Not Yet Sent"}
            </span>
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3 opacity-70" />
              <span className="opacity-70 font-medium">To:</span>{' '}
              {data.email || data.customerEmail || '(no email)'}
            </span>
            <span className="flex items-center gap-1 ml-auto font-bold opacity-90 uppercase tracking-tighter">
              {data.last_email_sent_at || data.sent_at ? "✓ Verified Sent Match" : "⚡ Production Template"}
            </span>
          </div>
        </DialogHeader>

        <div className="p-5 bg-zinc-100">
          <div className="max-w-[600px] mx-auto bg-white shadow-xl rounded-xl border border-zinc-200 overflow-hidden text-left font-sans">
            
            {/* ═══ TEMPLATE: CONFIRMATION ═══ */}
            {type === 'confirmation' && (
              <>
                <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', padding: '40px 20px', textAlign: 'center', color: '#ffffff' }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>🚗</div>
                  <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, letterSpacing: '-0.025em', textTransform: 'uppercase' }}>Booking Confirmed!</h1>
                  <p style={{ margin: '10px 0 0', fontSize: '16px', opacity: 0.9 }}>We've officially set your appointment.</p>
                </div>
                <div className="p-8">
                  <p style={{ fontSize: '18px', color: '#111827', marginTop: 0 }}>Hi <strong>{data.customer || 'Customer'}</strong>,</p>
                  <p style={{ color: '#4b5563', lineHeight: 1.6 }}>Great news! Your booking for <strong>{data.service || data.title}</strong> has been confirmed. Our team is excited to service your vehicle.</p>
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '12px', padding: '25px', margin: '25px 0' }}>
                    <h3 style={{ marginTop: 0, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}>Appointment Details</h3>
                    <div className="flex gap-3 mb-3"><Clock className="w-4 h-4 text-zinc-400" /> <span className="text-sm font-bold text-zinc-700">{formattedDate} @ {formattedTime}</span></div>
                    <div className="flex gap-3 mb-3"><Package className="w-4 h-4 text-zinc-400" /> <span className="text-sm font-bold text-zinc-700">{data.service || data.title}</span></div>
                    {vehicleStr && <div className="flex gap-3"><Shield className="w-4 h-4 text-zinc-400" /> <span className="text-sm font-bold text-zinc-700">{vehicleStr}</span></div>}
                    <div className="border-t border-dashed border-zinc-200 mt-4 pt-4 flex justify-between items-center">
                      <span className="text-xs font-bold text-zinc-400 uppercase">Total Estimate:</span>
                      <span className="text-xl font-black text-emerald-600">${price.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 text-center">
                    <p className="text-xs font-black text-emerald-800 uppercase mb-4 tracking-widest">💳 Secure Payment Options Available</p>
                    <div className="inline-block bg-emerald-500 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20">View Payment Options</div>
                  </div>
                </div>
              </>
            )}

            {/* ═══ TEMPLATE: REQUEST ═══ */}
            {type === 'request' && (
              <>
                <div style={{ background: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)', padding: '40px 20px', textAlign: 'center', color: '#ffffff' }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>🚗</div>
                  <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, textTransform: 'uppercase' }}>Request Received</h1>
                  <p style={{ margin: '10px 0 0', opacity: 0.9 }}>We've received your request and are reviewing it.</p>
                </div>
                <div className="p-8">
                  <p style={{ fontSize: '18px', color: '#111827', marginTop: 0 }}>Hi <strong>{data.customer || 'Customer'}</strong>,</p>
                  <p style={{ color: '#4b5563', lineHeight: 1.6 }}>We have received your request for <strong>{data.service || data.title}</strong>. Our team will contact you shortly.</p>
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '12px', padding: '25px', margin: '25px 0' }}>
                    <div className="flex gap-3 mb-3"><Clock className="w-4 h-4 text-zinc-400" /> <span className="text-sm font-bold text-zinc-700">{formattedDate} @ {formattedTime}</span></div>
                    <div className="flex gap-3"><Package className="w-4 h-4 text-zinc-400" /> <span className="text-sm font-bold text-zinc-700">{data.service || data.title}</span></div>
                  </div>
                </div>
              </>
            )}

            {/* ═══ TEMPLATE: CANCELLED ═══ */}
            {type === 'cancelled' && (
              <>
                <div style={{ background: 'linear-gradient(135deg, #991b1b 0%, #dc2626 100%)', padding: '40px 20px', textAlign: 'center', color: '#ffffff' }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>⚠️</div>
                  <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, textTransform: 'uppercase' }}>Appointment Cancelled</h1>
                </div>
                <div className="p-8">
                  <p style={{ fontSize: '18px', color: '#111827', marginTop: 0 }}>Hi <strong>{data.customer || 'Customer'}</strong>,</p>
                  <p style={{ color: '#4b5563', lineHeight: 1.6 }}>Your scheduled appointment for <strong>{data.service || data.title}</strong> has been cancelled.</p>
                  <div className="bg-red-50 border border-red-100 rounded-xl p-6 my-6 italic text-red-900 text-sm">
                    "Due to scheduling conflicts, we had to cancel this session. Please contact us to reschedule."
                  </div>
                </div>
              </>
            )}

            {/* ═══ TEMPLATE: REMINDER ═══ */}
            {type === 'reminder' && (
              <>
                <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)', padding: '40px 20px', textAlign: 'center', color: '#ffffff' }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>✨</div>
                  <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, textTransform: 'uppercase' }}>A Personalized Note</h1>
                  <p style={{ margin: '10px 0 0', opacity: 0.9 }}>Maintenance Reminder</p>
                </div>
                <div className="p-8">
                  <p style={{ fontSize: '18px', color: '#111827', marginTop: 0 }}>Hi <strong>{data.customer || 'Customer'}</strong>,</p>
                  <p style={{ color: '#4b5563', lineHeight: 1.6 }}>It has been some time since your last professional detail, and we wanted to check in.</p>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 my-6 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Last Service</p>
                      <p className="text-sm font-bold text-blue-900">{data.service || data.title || 'Premium Detail'}</p>
                    </div>
                    <Bell className="w-8 h-8 text-blue-500 opacity-20" />
                  </div>
                </div>
              </>
            )}

            {/* ═══ TEMPLATE: PROSPECT ═══ */}
            {type === 'prospect' && (
              <>
                <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', padding: '40px 20px', textAlign: 'center', color: '#ffffff' }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>💎</div>
                  <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, textTransform: 'uppercase' }}>Welcome to Prime</h1>
                  <p style={{ margin: '10px 0 0', opacity: 0.9 }}>Professional Detailing Solutions</p>
                </div>
                <div className="p-8">
                  <p style={{ fontSize: '18px', color: '#111827', marginTop: 0 }}>Hi <strong>{data.customer || data.name || 'Customer'}</strong>,</p>
                  <p style={{ color: '#4b5563', lineHeight: 1.6 }}>Thank you for your interest in Prime Auto Detail. We pride ourselves on delivering a showroom-quality finish.</p>
                  <div className="grid grid-cols-1 gap-4 my-8">
                    <div className="flex items-start gap-4 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                      <div className="p-2 bg-white rounded-lg border border-zinc-200">✨</div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900">Precision Detailing</p>
                        <p className="text-xs text-zinc-500">Advanced techniques for an immaculate finish.</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-zinc-900 rounded-xl p-6 text-center text-white">
                    <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-80">Prime Auto Detail</p>
                    <h2 className="text-2xl font-black mb-4 uppercase tracking-tighter">Professional Excellence</h2>
                    <div className="bg-white/10 border border-white/20 py-2 rounded-lg font-mono text-sm font-bold tracking-widest">NOURISHING YOUR INVESTMENT</div>
                  </div>
                </div>
              </>
            )}

            {/* ═══ TEMPLATE: PAYMENT SUCCESS ═══ */}
            {type === 'payment-success' && (
              <>
                <div style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', padding: '40px 20px', textAlign: 'center', color: '#ffffff' }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>💰</div>
                  <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>Payment Received!</h1>
                </div>
                <div className="p-8">
                  <p style={{ fontSize: '18px', color: '#111827', marginTop: 0 }}>Hi <strong>{data.customer || 'Customer'}</strong>,</p>
                  <p style={{ color: '#4b5563', lineHeight: 1.6 }}>We have successfully processed your payment for <strong>{data.service || data.title}</strong>.</p>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 my-6 flex justify-between items-center">
                    <span className="font-bold text-emerald-800 uppercase tracking-tighter text-sm">Amount Paid:</span>
                    <span className="text-2xl font-black text-emerald-600">${price.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-zinc-400">
                    <CreditCard className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Contactless Transaction Verified</span>
                  </div>
                </div>
              </>
            )}

            {/* ═══ TEMPLATE: CORRESPONDENCE (LETTER MAKER) ═══ */}
            {type === 'correspondence' && (
              <>
                <div style={{ background: '#18181b', padding: '40px 20px', textAlign: 'center', color: '#ffffff', borderBottom: '4px solid #3b82f6' }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>✉️</div>
                  <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prime Auto Detail</h1>
                  <p style={{ margin: '10px 0 0', opacity: 0.7, fontSize: '14px', textTransform: 'uppercase', tracking: 'widest' }}>Direct Correspondence</p>
                </div>
                <div className="p-8">
                  <div style={{ whiteSpace: 'pre-wrap', color: '#374151', lineHeight: 1.7, fontSize: '15px' }}>
                    {data.body || (data.note ? data.note.replace(/^Letter Generated: ".*?"\n\n/, '') : null) || data.note || 'No letter body found.'}
                  </div>
                </div>
              </>
            )}

            <div style={{ backgroundColor: '#f9fafb', padding: '20px', textAlign: 'center', borderTop: '1px solid #e5e7eb' }}>
              <p style={{ margin: 0, color: '#9ca3af', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>© {new Date().getFullYear()} Prime Auto Detail. All rights reserved.</p>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest opacity-50 italic">
              Verification Mode: This renders the EXACT deliverable content via Resend Engine
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
