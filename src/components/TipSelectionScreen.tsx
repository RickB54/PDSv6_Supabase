import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, DollarSign, ChevronRight, X, ArrowRight, Clock, QrCode, Smartphone, HelpCircle, Info } from 'lucide-react';

interface TipSelectionScreenProps {
  jobId: string;
  remainingBalanceInCents: number;
  onCancel: () => void;
  // Allows the developer to set where the customer returns after the checkout.
  // Defaults to the window's origin when not provided.
  clientUrl?: string; 
  customerId?: string | null;
  finalTime?: string;
  onCashPayment?: (tipAmount: number) => void;
}

export default function TipSelectionScreen({ 
  jobId, 
  remainingBalanceInCents,
  onCancel,
  clientUrl,
  customerId,
  finalTime,
  onCashPayment
}: TipSelectionScreenProps) {
  const [loading, setLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  
  const [selectedTip, setSelectedTip] = useState<number | null | 'custom' | undefined>(undefined);
  const [customTip, setCustomTip] = useState<string>('');
  
  // The base price in dollars
  const basePriceFormatted = (remainingBalanceInCents / 100).toFixed(2);

  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  // Calls the Supabase Edge Function to configure and launch Stripe Checkout.
  const handleProceedToPay = async (mode: 'redirect' | 'qrcode' = 'redirect') => {
    if (selectedTip === undefined) return;
    
    let finalTip: number | null = null;
    if (selectedTip === 'custom') {
      const parsed = parseFloat(customTip);
      if (isNaN(parsed) || parsed < 0) return;
      finalTip = parsed;
    } else {
      finalTip = selectedTip;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-tip-checkout', {
        body: {
          job_id: jobId,
          remaining_balance_in_cents: remainingBalanceInCents,
          tip: finalTip,
          clientUrl: clientUrl || window.location.origin,
          customer_id: customerId || undefined
        }
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      // Successfully returned a session URL
      if (data.url) {
        if (mode === 'qrcode') {
          setQrCodeUrl(data.url);
          setLoading(false);
        } else {
          window.location.href = data.url;
        }
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to create tip checkout session:', err);
      alert("Failed to initialize payment. Please check your network and try again.");
      setLoading(false);
    }
  };

  const getTipAmountDisplay = () => {
    if (selectedTip === null) return "$0.00";
    if (selectedTip === undefined) return "$0.00";
    
    let percent = 0;
    if (selectedTip === 'custom') {
      const parsed = parseFloat(customTip);
      if (!isNaN(parsed)) percent = parsed;
    } else {
      percent = selectedTip;
    }
    
    return "$" + ((remainingBalanceInCents * (percent / 100)) / 100).toFixed(2);
  };

  const getTotalAmountDisplay = () => {
    if (selectedTip === null || selectedTip === undefined) {
      return basePriceFormatted;
    }
    
    let percent = 0;
    if (selectedTip === 'custom') {
      const parsed = parseFloat(customTip);
      if (!isNaN(parsed)) percent = parsed;
    } else {
      percent = selectedTip;
    }
    
    const tipAmountCents = remainingBalanceInCents * (percent / 100);
    return ((remainingBalanceInCents + tipAmountCents) / 100).toFixed(2);
  };

  const canProceed = selectedTip !== undefined && (selectedTip !== 'custom' || (!isNaN(parseFloat(customTip)) && parseFloat(customTip) >= 0));

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900 flex flex-col items-center justify-center animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-white h-full sm:h-auto sm:rounded-3xl flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* Top Header - Condensed for Mobile */}
        <div className="bg-gray-50 px-6 py-4 text-center border-b border-gray-100 flex-shrink-0 relative">
          {!loading && (
            <>
              <button 
                onClick={() => setShowInfo(!showInfo)} 
                className="absolute top-6 right-16 p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
                title="What does this do?"
              >
                <HelpCircle size={24} />
              </button>
              <button 
                onClick={onCancel} 
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={24} />
              </button>
            </>
          )}
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1 tracking-tight">Final Details</h2>
          <div className="flex flex-col items-center gap-1">
            <p className="text-gray-500 font-medium">Service Balance: ${basePriceFormatted}</p>
            {finalTime && (
              <p className="text-[10px] uppercase tracking-widest text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Job Time: {finalTime}
              </p>
            )}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-8 flex-1 overflow-y-auto w-full pb-8">
          {showInfo && (
            <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-xl text-xs flex flex-col gap-1 mx-auto max-w-md animate-in fade-in zoom-in-95 duration-200">
              <span className="font-bold flex items-center gap-1"><Info size={14} /> Standalone Invoice Process</span>
              <span className="opacity-90">Quick Pay instantly creates a <b>new, standalone invoice</b> for walk-ins or quick tips.</span>
              <span className="opacity-90 mt-1 border-t border-blue-200 pt-1">
                If you want to record a payment for an <b>Active Checklist</b> or an <b>Existing Booking</b>, you must do so from the <a href="#" onClick={(e) => { e.preventDefault(); onCancel(); window.location.href='/invoicing'; }} className="font-bold underline text-blue-900">Invoices page</a>.
              </span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-accent gap-6 h-full">
              <Loader2 size={64} className="animate-spin" />
              <p className="text-xl text-gray-700 font-semibold">Preparing payment...</p>
              <p className="text-sm text-gray-400">Please do not close this window</p>
            </div>
          ) : qrCodeUrl ? (
            <div className="flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300 space-y-4 py-4">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Scan to Pay</h3>
              <div className="p-4 bg-white border-2 border-gray-100 rounded-2xl shadow-sm inline-block">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCodeUrl)}`} 
                  alt="Payment QR Code"
                  className="w-[200px] h-[200px] object-contain"
                />
              </div>
              <p className="text-sm text-gray-500 font-medium max-w-[250px] mx-auto mt-4">
                Customer can scan this code with their phone camera to pay securely.
              </p>
              <button
                onClick={() => setQrCodeUrl(null)}
                className="mt-6 text-emerald-600 font-bold text-sm hover:text-emerald-700"
              >
                Go Back
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-w-md mx-auto">
              <p className="text-center text-base text-gray-800 font-bold mb-2">
                Add a tip for the service?
              </p>

              {/* Exact Order Requested: No Tip, 10%, 15%, 20%, Other % */}
              
              <button
                onClick={() => setSelectedTip(null)}
                className={`w-full relative group py-3 px-6 border-2 rounded-2xl font-bold text-lg transition-all active:scale-[0.98] ${
                  selectedTip === null 
                    ? 'border-gray-900 bg-gray-900 text-white shadow-lg shadow-gray-900/20' 
                    : 'border-gray-200 text-gray-600 bg-white hover:border-gray-400 hover:text-gray-900'
                }`}
              >
                No Tip
              </button>

              {[10, 15, 20].map((percent) => {
                const tipAmount = ((remainingBalanceInCents * (percent / 100)) / 100).toFixed(2);
                const isSelected = selectedTip === percent;
                return (
                  <button
                    key={percent}
                    onClick={() => setSelectedTip(percent)}
                    className={`w-full group py-3 px-6 rounded-2xl font-bold text-xl transition-all active:scale-[0.98] flex justify-between items-center overflow-hidden border-2 space-y-0 ${
                      isSelected
                        ? 'bg-accent border-accent text-white shadow-xl shadow-accent/30 scale-[1.02]'
                        : 'bg-white border-gray-200 text-gray-800 hover:border-accent hover:text-accent shadow-sm'
                    }`}
                  >
                    <span>{percent}%</span>
                    <span className={`text-lg font-medium opacity-90 ${isSelected ? 'text-white' : 'text-gray-500'}`}>
                      +${tipAmount}
                    </span>
                  </button>
                );
              })}

              <div 
                className={`w-full rounded-2xl overflow-hidden transition-all border-2 ${
                  selectedTip === 'custom' 
                    ? 'border-accent bg-accent/5' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <button
                  onClick={() => setSelectedTip('custom')}
                  className={`w-full py-3 px-6 text-lg font-semibold transition-all flex justify-between items-center ${
                    selectedTip === 'custom' ? 'text-accent' : 'text-gray-600'
                  }`}
                >
                  <span>Other %</span>
                </button>
                
                {selectedTip === 'custom' && (
                  <div className="px-6 pb-6 pt-2 animate-in slide-in-from-top-2 duration-200 space-y-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        autoFocus
                        value={customTip}
                        onChange={(e) => setCustomTip(e.target.value)}
                        placeholder="Enter percentage"
                        className="w-full py-3 px-4 pr-10 border-2 border-accent rounded-xl text-lg font-bold focus:ring-0 focus:outline-none shadow-inner bg-white text-gray-900"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-extrabold text-lg">%</span>
                    </div>
                    {customTip && !isNaN(parseFloat(customTip)) && (
                      <div className="flex justify-between items-center px-1">
                        <span className="text-sm text-gray-400 font-medium italic">Calculated Tip:</span>
                        <span className="text-xl font-bold text-accent">+{getTipAmountDisplay()}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Part of flex to prevent overlap */}
        {!loading && !qrCodeUrl && (
          <div className="mt-auto bg-white border-t border-gray-100 p-4 sm:p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] space-y-3">
            <div className="flex justify-between items-center mb-1 px-2">
              <span className="text-gray-500 font-semibold">Total to Pay</span>
              <span className="text-2xl font-black text-gray-900">${getTotalAmountDisplay()}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleProceedToPay('qrcode')}
                disabled={!canProceed}
                className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-blue-700 shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <QrCode size={18} />
                Show QR Code
              </button>
              <button
                onClick={() => handleProceedToPay('redirect')}
                disabled={!canProceed}
                className="w-full py-3.5 bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-emerald-600 shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Smartphone size={18} />
                Pay on Device
              </button>
            </div>

            {onCashPayment && (
              <button
                onClick={() => {
                  let percent = 0;
                  if (selectedTip === 'custom') {
                    const parsed = parseFloat(customTip);
                    if (!isNaN(parsed)) percent = parsed;
                  } else if (selectedTip !== null && selectedTip !== undefined) {
                    percent = selectedTip;
                  }
                  const tipAmount = (remainingBalanceInCents * (percent / 100)) / 100;
                  onCashPayment(tipAmount);
                }}
                disabled={!canProceed}
                className="w-full py-2 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                Pay with Cash (Local)
              </button>
            )}

            <button
              onClick={onCancel}
              className="w-full py-2 text-gray-400 hover:text-gray-600 font-bold text-xs transition-colors"
            >
              Cancel / Go Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
