import React, { useState, useEffect } from 'react';
import { X, DollarSign, ArrowRight, Wallet, User as UserIcon, HelpCircle, Info } from 'lucide-react';
import TipSelectionScreen from './TipSelectionScreen';
import { getUnifiedCustomers } from '@/lib/customers';
import { upsertSupabaseCustomer, upsertSupabaseInvoice, sendTeamMessage } from '@/lib/supa-data';
import { getCurrentUser } from '@/lib/auth';
import { pushAdminAlert } from '@/lib/adminAlerts';
import { upsertReceivable } from '@/lib/receivables';
import { generateInvoiceNumber } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

/**
 * QuickPayModal
 * Accessible from anywhere in the app (e.g. sidebar).
 * Allows the user to enter a free-form amount to charge,
 * or optionally use the recently generated total from Service Checklist.
 */
export default function QuickPayModal() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  // Phase 1: Enter Amount, Phase 2: Tip Selection
  const [phase, setPhase] = useState<1 | 2>(1);
  const [showInfo, setShowInfo] = useState(false);
  
  const [amountStr, setAmountStr] = useState('');
  
  const [suggestedAmount, setSuggestedAmount] = useState<number | null>(null);
  const [suggestedJobId, setSuggestedJobId] = useState<string | null>(null);

  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [suggestedTime, setSuggestedTime] = useState<string | null>(null);

  // Read the suggestion when the modal opens
  useEffect(() => {
    const handleOpen = () => {
      // 1. Check local storage for recent generated amount
      try {
        const storedAmt = localStorage.getItem('recent_service_amount');
        const storedId = localStorage.getItem('recent_service_job_id');
        const storedTimestamp = localStorage.getItem('recent_service_timestamp');
        
        let isRecent = false;
        if (storedTimestamp) {
          const age = Date.now() - parseInt(storedTimestamp, 10);
          if (age < 60 * 60 * 1000) { // 60 minutes
            isRecent = true;
          }
        }
        
        if (isRecent && storedAmt && !isNaN(parseFloat(storedAmt)) && parseFloat(storedAmt) > 0) {
          setSuggestedAmount(parseFloat(storedAmt));
        } else {
          setSuggestedAmount(null);
        }
        
        setSuggestedJobId(storedId || null);
        setSuggestedTime(localStorage.getItem('recent_service_time') || null);
      } catch (e) {
        setSuggestedAmount(null);
        setSuggestedJobId(null);
        setSuggestedTime(null);
      }
      
      setAmountStr('');
      setSelectedCustomerId('');
      setPhase(1);
      setOpen(true);
      
      // Fetch customers
      getUnifiedCustomers().then(results => {
        setCustomers(results || []);
      }).catch(() => setCustomers([]));
    };

    window.addEventListener('open-quick-pay', handleOpen);
    return () => window.removeEventListener('open-quick-pay', handleOpen);
  }, []);

  if (!open) return null;

  const handleClose = () => {
    setOpen(false);
    setPhase(1);
  };

  const currentEnteredAmount = parseFloat(amountStr);
  const isValidAmount = !isNaN(currentEnteredAmount) && currentEnteredAmount >= 0.50; // Minimum 50 cents

  const useSuggested = () => {
    if (suggestedAmount) {
      setAmountStr(suggestedAmount.toString());
    }
  };

  if (phase === 2) {
    // Determine the job ID to pass
    // If they strictly used the suggested amount, we might reuse suggestedJobId if it exists.
    // Otherwise, generate a generic ID.
    const isExactSuggested = suggestedAmount !== null && parseFloat(amountStr) === suggestedAmount;
    const finalJobId = (isExactSuggested && suggestedJobId) 
      ? suggestedJobId 
      : `MANUAL-${Date.now().toString().slice(-6)}`;
      
    const remainingBalanceInCents = Math.round(parseFloat(amountStr) * 100);

    return (
      <TipSelectionScreen 
        jobId={finalJobId}
        remainingBalanceInCents={remainingBalanceInCents}
        clientUrl={window.location.origin}
        customerId={selectedCustomerId || null}
        onCancel={handleClose}
        finalTime={(isExactSuggested && suggestedTime) ? suggestedTime : undefined}
        onCashPayment={async (tip) => {
          const baseAmount = parseFloat(amountStr) || 0;
          const totalPaid = baseAmount + tip;
          const targetCustomer = customers.find(c => c.id === selectedCustomerId);
          const customerName = targetCustomer?.name || "Walk-In Customer";
          const customerEmail = targetCustomer?.email || "No Email Provided";
          const customerPhone = targetCustomer?.phone || "No Phone Provided";

          const invNum = generateInvoiceNumber();

          // Generate Invoice
          const invoiceData = {
            invoiceNumber: invNum,
            customerId: selectedCustomerId || null,
            customerName: customerName,
            vehicle: "Various/Quick Pay",
            services: [{ name: 'Quick Pay Service', price: baseAmount }],
            total: baseAmount,
            tipAmount: tip,
            date: new Date().toLocaleDateString(),
            createdAt: new Date().toISOString(),
            paymentStatus: 'paid',
            paidAmount: totalPaid
          };

          let invoiceCreated = false;
          try {
            await upsertSupabaseInvoice(invoiceData);
            invoiceCreated = true;
            toast({ 
              title: 'Standalone Invoice Generated', 
              description: 'A Quick Pay invoice was created. NOTE: To pay an existing Checklist/Booking, please visit the Invoices page directly.',
              duration: 8000
            });
          } catch (e) {
            console.error("Failed to record cash payment:", e);
            toast({ title: 'Error', description: 'Failed to record payment in accounting.', variant: 'destructive' });
          }

          // IMMEDIATELY NOTIFY ADMIN OF QUICK PAY TRANSACTION
          try {
            const currentUser = getCurrentUser();
            const actorName = currentUser?.name || currentUser?.email || 'Employee';
            const actorEmail = currentUser?.email || 'employee@primeautodetail.net';

            const alertContent = `🚨 QUICK PAY CASH PAYMENT RECEIVED 💵
• Processed By: ${actorName} (${actorEmail})
• Total Amount Collected: $${totalPaid.toFixed(2)} (Base: $${baseAmount.toFixed(2)} + Tip: $${tip.toFixed(2)})
• Customer Name: ${customerName}
• Customer Email: ${customerEmail}
• Customer Phone: ${customerPhone}
• Invoice Status: ${invoiceCreated ? `Invoice #${invNum} Created & Paid` : '⚠️ Invoice Creation Failed'}`;

            // 1. Send Team Chat message (triggers audio & live alerts for Admin)
            await sendTeamMessage(alertContent, actorEmail, actorName, null);

            // 2. Push System Admin Alert (bell icon notification drawer)
            pushAdminAlert(
              'invoice_created',
              `Quick Pay CASH payment of $${totalPaid.toFixed(2)} received by ${actorName} for ${customerName}. Invoice #${invNum} ${invoiceCreated ? 'Created' : 'FAILED'}.`,
              actorName,
              {
                recordType: 'Invoice',
                invoiceNumber: invNum,
                amount: totalPaid,
                customerName: customerName,
                customerEmail: customerEmail,
                customerPhone: customerPhone,
                invoiceCreated,
                paymentMethod: 'Cash'
              }
            );

            // 3. Trigger global notification event
            window.dispatchEvent(new CustomEvent('quick-pay-completed', {
              detail: { invoiceNumber: invNum, totalPaid, customerName, paymentMethod: 'Cash' }
            }));
          } catch (notifyErr) {
            console.error("Failed to send Quick Pay admin notification:", notifyErr);
          }

          handleClose();
          if (selectedCustomerId) {
            try {
              await upsertSupabaseCustomer({
                id: selectedCustomerId,
                updated_at: new Date().toISOString()
              });
              window.dispatchEvent(new Event('bookings-updated'));
            } catch(e) {}
          }
        }}
      />
    );
  }

  // Phase 1: Free-form Amount Entry
  return (
    <div className="fixed inset-0 z-[100] bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300 p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-sm bg-white rounded-3xl flex flex-col shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] my-auto">
        
        {/* Header */}
        <div className="bg-gray-50 px-5 py-3.5 text-center border-b border-gray-100 flex-shrink-0 relative sticky top-0 z-20">
          <button 
            onClick={() => setShowInfo(!showInfo)} 
            className="absolute top-3 right-12 p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
            title="What does this do?"
          >
            <HelpCircle size={20} />
          </button>
          <button 
            onClick={handleClose} 
            className="absolute top-3 right-3 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="mx-auto w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-1">
            <Wallet size={20} />
          </div>
          <div className="flex items-center justify-center gap-2 mb-0.5">
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Quick Pay</h2>
          </div>
          <p className="text-gray-500 text-xs">Receive an in-person payment</p>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 styled-scrollbar">
          
          {showInfo && (
            <div className="mb-4 rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50 to-indigo-50 text-blue-900 overflow-hidden animate-in fade-in zoom-in-95 duration-200 shadow-sm max-h-56 overflow-y-auto styled-scrollbar">
              <div className="px-4 pt-3 pb-2 border-b border-blue-200/60 sticky top-0 bg-blue-50/90 backdrop-blur-xs z-10">
                <div className="font-extrabold text-xs flex items-center gap-2">
                  <Info size={14} className="text-blue-600 shrink-0" />
                  Payment Process Guide
                </div>
                <p className="text-[11px] text-blue-700/80 mt-0.5">Quick Pay creates a <b>standalone</b> invoice only.{isAdmin ? ' For booking-linked payments, use the Invoices page.' : ''}</p>
              </div>
              <div className="px-4 py-2.5 flex flex-col gap-2.5">
                {isAdmin && (
                  <div className="flex gap-2.5 items-start">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-black flex items-center justify-center">1</span>
                    <div>
                      <p className="font-bold text-xs text-gray-900">💵 Pay with Cash (via Invoices page)</p>
                      <p className="text-[11px] text-gray-600 mt-0.5">Go to <b>Invoices</b> → open invoice → tap <b>Record Payment</b> → <b>Pay with Cash</b>.</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-2.5 items-start">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] font-black flex items-center justify-center">{isAdmin ? '2' : '1'}</span>
                  <div>
                    <p className="font-bold text-xs text-gray-900">📱 Pay with Stripe</p>
                    <p className="text-[11px] text-gray-600 mt-0.5">Tap <b>Pay with Stripe</b> below — hand phone to customer to enter card.</p>
                  </div>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-black flex items-center justify-center">{isAdmin ? '3' : '2'}</span>
                  <div>
                    <p className="font-bold text-xs text-gray-900">📷 Show QR Code (Remote)</p>
                    <p className="text-[11px] text-gray-600 mt-0.5">Tap <b>Show QR Code</b> — customer scans code to pay.</p>
                  </div>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">{isAdmin ? '4' : '3'}</span>
                  <div>
                    <p className="font-bold text-xs text-gray-900">⚡ Quick Pay Cash (Walk-in only)</p>
                    <p className="text-[11px] text-gray-600 mt-0.5">Enter amount → Continue → tip → <b>Pay with Cash</b>.</p>
                  </div>
                </div>
                {isAdmin && (
                  <a href="#" onClick={(e) => { e.preventDefault(); handleClose(); window.location.href='/invoicing'; }} className="mt-0.5 text-center text-xs font-bold text-blue-800 underline hover:text-blue-600">
                    → Go to Invoices page now
                  </a>
                )}
              </div>
            </div>
          )}
          
          {suggestedAmount !== null && suggestedAmount > 0 && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-100 cursor-pointer hover:bg-emerald-100 transition-colors" onClick={useSuggested}>
              <div className="flex justify-between items-center text-xs font-semibold text-emerald-800 mb-1">
                <span>Active Service Total:</span>
                <span className="bg-emerald-200 px-2 py-0.5 rounded text-emerald-900 text-[10px] font-bold">Tap to use</span>
              </div>
              <div className="text-xl font-black text-emerald-600">${suggestedAmount.toFixed(2)}</div>
            </div>
          )}

          <div className="mb-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">Enter Payment Amount</div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-gray-500 text-2xl font-bold">$</span>
            </div>
            <input
              type="number"
              step="0.01"
              min="0.50"
              autoFocus
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0.00"
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-2xl text-3xl font-black text-gray-900 transition-colors"
            />
          </div>

          <div className="mt-4">
            <div className="mb-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
              <span>Attach Customer (Optional)</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon className="h-4 w-4 text-gray-400" />
              </div>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border-2 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl text-xs font-semibold text-gray-800 appearance-none cursor-pointer"
              >
                <option value="">No Customer Associated</option>
                {customers.map((c: any) => (
                  <option key={c.id || c.auth_id || c.name} value={c.id || c.auth_id}>
                    {c.first_name || c.name || `User ${c.id?.slice(0,4)}`} {c.last_name || ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={() => {
              if (isValidAmount) setPhase(2);
            }}
            disabled={!isValidAmount}
            className="w-full mt-5 py-3.5 bg-gray-900 text-white rounded-2xl font-bold text-lg hover:bg-black transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-lg"
          >
            Continue
            <ArrowRight size={18} />
          </button>

        </div>
      </div>
    </div>
  );
}
