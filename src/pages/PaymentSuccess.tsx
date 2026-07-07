import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PaymentWorkflowHelp } from "@/components/help/PaymentWorkflowHelp";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<{
    status: string;
    job_id: string;
    base_amount: number;
    tip_amount: number;
    amount_total: number;
  } | null>(null);

  useEffect(() => {
    async function verifyPayment() {
      if (!sessionId) {
        setError('No session ID found.');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-checkout-session', {
          body: { session_id: sessionId },
        });

        if (error) throw new Error(error.message);
        if (data.error) throw new Error(data.error);

        setPaymentData(data);
      } catch (err) {
        console.error('Payment verification failed:', err);
        setError('Failed to verify payment or session expired.');
      } finally {
        setLoading(false);
      }
    }

    verifyPayment();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="flex flex-col items-center gap-4 text-accent">
          <Loader2 size={64} className="animate-spin" />
          <p className="text-xl font-semibold text-gray-700">Verifying payment...</p>
        </div>
      </div>
    );
  }

  if (error || !paymentData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center border-t-4 border-red-500">
          <AlertCircle className="mx-auto text-red-500 mb-6" size={64} />
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Verification Failed</h1>
          <p className="text-gray-600 mb-8">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-2xl w-full max-w-lg text-center border-t-8 border-green-500 transform transition-all">
        <CheckCircle className="mx-auto text-green-500 mb-6" size={88} strokeWidth={1.5} />
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight flex items-center justify-center gap-3">
          Payment Successful
          <PaymentWorkflowHelp variant="payment-success" />
        </h1>
        <p className="text-gray-500 font-medium text-lg mb-8">Job #{paymentData.job_id}</p>

        <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-left border border-gray-100 shadow-inner">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-600 text-lg">Service Amount</span>
            <span className="font-semibold text-lg text-gray-800">
              ${(paymentData.base_amount / 100).toFixed(2)}
            </span>
          </div>
          
          {paymentData.tip_amount > 0 && (
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-600 text-lg">Tip / Gratuity</span>
              <span className="font-semibold text-lg text-gray-800">
                ${(paymentData.tip_amount / 100).toFixed(2)}
              </span>
            </div>
          )}
          
          <div className="border-t-2 border-gray-200 mt-4 pt-4 flex justify-between items-center">
            <span className="font-extrabold text-gray-900 text-xl">Total Paid</span>
            <span className="font-extrabold text-green-600 text-2xl">
              ${(paymentData.amount_total / 100).toFixed(2)}
            </span>
          </div>
        </div>

        <p className="text-lg text-gray-700 italic mb-6 leading-relaxed">
          "Thank you for choosing Prime Auto Detail! Your car is looking great and we really appreciate your business."
        </p>

        <p className="text-sm text-gray-400 mb-10 font-medium">
          We’ll send you a receipt via email shortly.
        </p>

        <button
          onClick={() => navigate('/')}
          className="w-full py-4 px-6 bg-accent text-white rounded-xl font-bold text-xl shadow-lg hover:bg-accent-dark hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <CheckCircle size={24} />
          Done
        </button>
      </div>
    </div>
  );
}
