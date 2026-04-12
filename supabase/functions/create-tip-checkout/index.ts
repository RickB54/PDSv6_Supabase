import Stripe from "https://esm.sh/stripe@13.5.0?target=deno";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Load Stripe secret from Supabase environment variables
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

    const body = await req.json().catch(() => ({}));
    const { job_id, remaining_balance_in_cents, tip, clientUrl, customer_id } = body;

    if (!job_id || typeof remaining_balance_in_cents !== 'number') {
      throw new Error("Missing required fields: job_id, remaining_balance_in_cents");
    }

    const siteUrl = clientUrl || Deno.env.get("SITE_URL") || "https://primeautodetail.net";
    
    // Line Item 1: Remaining service balance
    const line_items: any[] = [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: `Detailing Service - Job #${job_id}` },
          unit_amount: remaining_balance_in_cents,
        },
        quantity: 1,
      }
    ];

    // Calculate Tip
    let tipAmount = 0;
    if (tip && typeof tip === 'number' && tip > 0) {
      // Calculate tip based on remaining balance
      tipAmount = Math.round(remaining_balance_in_cents * (tip / 100));
      
      // Line Item 2: Tip
      line_items.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Tip / Gratuity' },
          unit_amount: tipAmount,
        },
        quantity: 1,
      });
    }

    // Success URL must include the CHECKOUT_SESSION_ID so the FE can fetch results
    const success_url = `${siteUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = siteUrl; // can be configured specifically if needed

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      metadata: {
        job_id,
        base_amount: remaining_balance_in_cents.toString(),
        tip_amount: tipAmount.toString(),
        ...(customer_id ? { customer_id } : {})
      },
      success_url,
      cancel_url,
    });

    console.log("✅ Tip checkout session created successfully!");
    
    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Checkout error:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
