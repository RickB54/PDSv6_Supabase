import React, { useState, useEffect } from 'react';
import { X, DollarSign, ArrowRight, Wallet, User as UserIcon, HelpCircle } from 'lucide-react';
import TipSelectionScreen from './TipSelectionScreen';
import { getUnifiedCustomers } from '@/lib/customers';

/**
 * QuickPayModal
 * Accessible from anywhere in the app (e.g. sidebar).
 * Allows the user to enter a free-form amount to charge,
 * or optionally use the recently generated total from Service Checklist.
 */
export default function QuickPayModal() {
  const [open, setOpen] = useState(false);
  
  // Phase 1: Enter Amount, Phase 2: Tip Selection
  const [phase, setPhase] = useState<1 | 2>(1);
  
  const [amountStr, setAmountStr] = useState('');
  
  const [suggestedAmount, setSuggestedAmount] = useState<number | null>(null);
  const [suggestedJobId, setSuggestedJobId] = useState<string | null>(null);

  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Read the suggestion when the modal opens
  useEffect(() => {
    const handleOpen = () => {
      // 1. Check local storage for recent generated amount
      try {
        const storedAmt = localStorage.getItem('recent_service_amount');
        const storedId = localStorage.getItem('recent_service_job_id');
        
        if (storedAmt && !isNaN(parseFloat(storedAmt)) && parseFloat(storedAmt) > 0) {
          setSuggestedAmount(parseFloat(storedAmt));
        } else {
          setSuggestedAmount(null);
        }
        
        setSuggestedJobId(storedId || null);
      } catch (e) {
        setSuggestedAmount(null);
        setSuggestedJobId(null);
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
      />
    );
  }

  // Phase 1: Free-form Amount Entry
  return (
    <div className="fixed inset-0 z-[100] bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300 p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl flex flex-col shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gray-50 px-6 py-6 text-center border-b border-gray-100 flex-shrink-0 relative">
          <button 
            onClick={handleClose} 
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="mx-auto w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
            <Wallet size={24} />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Quick Pay</h2>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'quick-pay-in-person' } }))}
              className="p-1 text-gray-400 hover:text-emerald-500 transition-colors"
              title="Quick Pay Help"
            >
              <HelpCircle size={18} />
            </button>
          </div>
          <p className="text-gray-500 text-sm mt-1">Receive an in-person payment</p>
        </div>

        {/* Content */}
        <div className="p-6">
          
          {suggestedAmount !== null && suggestedAmount > 0 && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 cursor-pointer hover:bg-emerald-100 transition-colors" onClick={useSuggested}>
              <div className="flex justify-between items-center text-sm font-semibold text-emerald-800 mb-1">
                <span>Active Service Total:</span>
                <span className="bg-emerald-200 px-2 py-0.5 rounded text-emerald-900 text-xs">Tap to use</span>
              </div>
              <div className="text-2xl font-black text-emerald-600">${suggestedAmount.toFixed(2)}</div>
            </div>
          )}

          <div className="mb-2 text-sm font-bold text-gray-700">Enter Payment Amount</div>
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
              className="w-full pl-10 pr-4 py-4 bg-gray-50 border-2 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-2xl text-4xl font-black text-gray-900 transition-colors"
            />
          </div>

          <div className="mt-6">
            <div className="mb-2 text-sm font-bold text-gray-700 flex items-center justify-between">
              <span>Attach Customer (Optional)</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl text-sm font-semibold text-gray-800 appearance-none cursor-pointer"
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
            className="w-full mt-6 py-4 bg-gray-900 text-white rounded-2xl font-bold text-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            Continue
            <ArrowRight size={20} />
          </button>

        </div>
      </div>
    </div>
  );
}
