import Stripe from "https://esm.sh/stripe@13.5.0?target=deno";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");

const stripe = stripeSecret ? new Stripe(stripeSecret, {
  apiVersion: "2023-10-16",
}) : null;

serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!stripe) {
      throw new Error("STRIPE_SECRET_KEY is not configured.");
    }

    const { session_id } = await req.json();

    if (!session_id) {
      throw new Error("session_id is required");
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Provide default metadata in case we mapped it over
    const metadata = session.metadata || {};
    
    // Total amount in cents
    const amount_total = session.amount_total || 0;
    
    // Either parse the amounts from metadata or wait to fetch line items
    const base_amount = metadata.base_amount ? parseInt(metadata.base_amount) : 0;
    const tip_amount = metadata.tip_amount ? parseInt(metadata.tip_amount) : 0;
    const job_id = metadata.job_id || "Unknown";

    return new Response(JSON.stringify({ 
      status: session.payment_status, // "paid", "unpaid", "no_payment_required"
      job_id,
      base_amount,
      tip_amount,
      amount_total
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
