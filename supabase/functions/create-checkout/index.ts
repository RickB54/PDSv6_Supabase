// supabase/functions/create-checkout/index.ts

import Stripe from "https://esm.sh/stripe@13.5.0?target=deno";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Load Stripe secret from Supabase environment variables
const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");

const stripe = stripeSecret ? new Stripe(stripeSecret, {
  apiVersion: "2023-10-16",
}) : null;

// Use SITE_URL env (if provided) otherwise default to production domain
const siteUrl = Deno.env.get("SITE_URL") || "https://primeautodetail.net";

serve(async (req: Request) => {
  console.log(`🚀 [create-checkout] Function called! Method: ${req.method}`);
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let body: any = {};
  try {
    if (!stripeSecret) {
      console.error("❌ Missing STRIPE_SECRET_KEY in environment!");
    }
    if (!stripe) {
      throw new Error("STRIPE_SECRET_KEY is not configured in Supabase. Please set it using 'supabase secrets set STRIPE_SECRET_KEY=sk_test_...'");
    }

    body = await req.json().catch(() => ({}));
    console.log("📦 Request body:", JSON.stringify(body));
    const customerEmail: string | undefined = body.customerEmail || undefined;
    const clientUrl: string | undefined = body.clientUrl || siteUrl;
    const priceId: string | undefined = body.priceId || undefined;
    const mode: "payment" = "payment";

    // Support dynamic line items from Checkout.tsx;
    // Fallback to a priceId if one is passed but not lineItems.
    const rawItems: Array<{ name?: string; amount?: number; quantity?: number }> = Array.isArray(body.lineItems)
      ? body.lineItems
      : [];

    const line_items = rawItems.length > 0
      ? rawItems
        .filter((i) => typeof i.amount === 'number' && i.amount! > 0)
        .map((i) => ({
          price_data: {
            currency: 'usd',
            product_data: { name: i.name || 'Item' },
            unit_amount: Math.round((i.amount || 0) * 100),
          },
          quantity: i.quantity && i.quantity > 0 ? i.quantity : 1,
        }))
      : priceId 
        ? [
            {
              price: priceId,
              quantity: 1,
            },
          ]
        : [];

    if (line_items.length === 0) {
      throw new Error("No cart items or price information provided. Checkout session cannot be created.");
    }

    const session = await stripe.checkout.sessions.create({
      mode,
      customer_email: customerEmail,
      line_items,
      metadata: body.metadata || {},
      success_url: `${clientUrl}/payment-success`,
      cancel_url: `${clientUrl}/payment-canceled`,
    });

    console.log("✅ Checkout session created successfully!");
    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Checkout error:", err.message);
    const errorResponse = {
      error: (err as Error).message,
      stack: (err as Error).stack,
      context: {
        hasStripe: !!stripe,
        hasSecret: !!stripeSecret,
        secretPrefix: stripeSecret ? stripeSecret.substring(0, 7) : 'none',
        bodyType: typeof body,
        hasLineItems: !!body?.lineItems
      }
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
