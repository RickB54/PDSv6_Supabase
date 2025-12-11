// supabase/functions/stripe-webhook/index.ts
// Handles checkout payments (no subscriptions)

// ---------------------------
// 1. IMPORTS
// ---------------------------
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// ---------------------------
// 2. LOAD STRIPE WEBHOOK SECRET
// ---------------------------
// ⚠️ MUST be added in Supabase Dashboard → Project Settings → Functions → Environment Variables
// Name: STRIPE_WEBHOOK_SECRET
// Value: whsec_XXXXXXXXXXXXXXXXXXXXXXXXXXXX
const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

if (!endpointSecret) {
  console.error("❌ Missing STRIPE_WEBHOOK_SECRET environment variable.");
}

// ---------------------------
// 3. STRIPE INSTANCE (SECRET KEY)
// ---------------------------
// Supabase automatically injects all environment variables into Deno functions
const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY")!;
const stripe = new Stripe(stripeSecret, {
  apiVersion: "2023-10-16",
});

// ---------------------------
// 4. START SERVER
// ---------------------------
serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature!, endpointSecret);
  } catch (err) {
    console.error("❌ Webhook signature verification failed.", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle specific event types
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      console.log("💰 Checkout completed:", session.id);

      // Extract the line items → many products supported
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);

      console.log("📦 Line items:", lineItems);

      // Save to Supabase DB
      await savePaymentToDB({ session, lineItems });
      break;
    }

    default:
      console.log(`Unhandled event: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});

// ---------------------------
// 5. SAVE PAYMENT TO DATABASE
// ---------------------------
async function savePaymentToDB({ session, lineItems }) {
  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": Deno.env.get("SUPABASE_ANON_KEY")!,
      "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
    },
    body: JSON.stringify({
      stripe_session_id: session.id,
      customer_email: session.customer_details.email,
      amount_total: session.amount_total,
      currency: session.currency,
      payment_status: session.payment_status,
      items: lineItems.data.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        price_id: item.price.id,
        product_id: item.price.product,
        amount_subtotal: item.amount_subtotal,
        amount_total: item.amount_total,
      })),
    }),
  });

  if (!res.ok) {
    console.error("❌ Error saving payment to DB", await res.text());
  } else {
    console.log("✅ Payment saved to Supabase DB");
  }
}

// No subscription handlers — subscription logic removed per app requirements
