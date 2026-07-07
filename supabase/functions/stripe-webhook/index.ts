// supabase/functions/stripe-webhook/index.ts
// Handles checkout.session.completed for invoice/estimate payments.
// Fixes applied (2026-07-06):
//   1. config.toml: verify_jwt = false  (Stripe has no JWT; done in config)
//   2. Idempotency guard — early-exit if session already processed
//   3. paid_date stamped on EVERY invoice in batch (loop, not just ids[0])
//   4. Dual notifications (owner + customer) fire ONCE per session, not per invoice
//   5. Structured success/failure logging for post-audit review

import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// ---------------------------
// ENV VARS (set in Supabase Dashboard → Project Settings → Edge Functions → Secrets)
//   STRIPE_WEBHOOK_SECRET  whsec_...
//   STRIPE_SECRET_KEY      sk_live_... or sk_test_...
//   SUPABASE_URL           injected automatically by Supabase
//   SUPABASE_SERVICE_ROLE_KEY  injected automatically by Supabase
//   SUPABASE_ANON_KEY      injected automatically by Supabase
//   RESEND_API_KEY         used by send-booking-email
// ---------------------------
const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const stripeSecret   = Deno.env.get("STRIPE_SECRET_KEY")!;
const supabaseUrl    = Deno.env.get("SUPABASE_URL")!;
const serviceKey     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey        = Deno.env.get("SUPABASE_ANON_KEY")!;

if (!endpointSecret) {
  console.error("❌ Missing STRIPE_WEBHOOK_SECRET — webhook signature verification will fail.");
}

const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

// Shared headers for all Supabase REST calls (uses service-role key to bypass RLS)
const dbHeaders = {
  "Content-Type": "application/json",
  "apikey": anonKey,
  "Authorization": `Bearer ${serviceKey}`,
  "Prefer": "return=representation",
};

// ---------------------------
// MAIN HANDLER
// ---------------------------
serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body      = await req.text();

  // --- Verify Stripe signature ---
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature!, endpointSecret!);
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // --- Only process the event type we care about ---
  if (event.type !== "checkout.session.completed") {
    console.log(`ℹ️ Ignored event type: ${event.type}`);
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  console.log(`📨 Processing checkout.session.completed — session: ${session.id}`);

  try {
    await handleCheckoutCompleted(session);
  } catch (err) {
    // Log failure but still return 200 so Stripe doesn't retry indefinitely.
    // Investigate via Supabase Dashboard → Edge Functions → Logs.
    console.error("❌ WEBHOOK PROCESSING FAILED", JSON.stringify({
      event_id:   event.id,
      session_id: session.id,
      error:      err.message,
      stack:      err.stack,
      timestamp:  new Date().toISOString(),
    }));
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});

// ---------------------------
// CORE LOGIC
// ---------------------------
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const sessionId = session.id;
  const paidDate  = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // -------------------------------------------------------
  // FIX 2: IDEMPOTENCY — check if this session was already processed.
  // The payments table has a UNIQUE constraint on stripe_session_id.
  // We query before inserting so we can exit cleanly instead of hitting
  // a DB error on retry.
  // -------------------------------------------------------
  const existsRes = await fetch(
    `${supabaseUrl}/rest/v1/payments?stripe_session_id=eq.${sessionId}&select=id`,
    { method: "GET", headers: dbHeaders }
  );
  const existingRows = await existsRes.json();

  if (Array.isArray(existingRows) && existingRows.length > 0) {
    console.log(`⚡ Idempotency: session ${sessionId} already processed — skipping.`);
    return; // Safe early exit; Stripe receives 200 and stops retrying
  }

  // -------------------------------------------------------
  // Insert payment record (captures the money side of the transaction)
  // -------------------------------------------------------
  const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);

  const paymentInsertRes = await fetch(`${supabaseUrl}/rest/v1/payments`, {
    method: "POST",
    headers: { ...dbHeaders, "Prefer": "return=minimal" },
    body: JSON.stringify({
      stripe_session_id:          sessionId,
      stripe_payment_intent_id:   session.payment_intent,
      customer_email:             session.customer_details?.email,
      amount_total:               (session.amount_total ?? 0) / 100,
      currency:                   session.currency,
      payment_status:             session.payment_status,
      metadata:                   session.metadata,
      items: lineItems.data.map((item) => ({
        description: item.description,
        quantity:    item.quantity,
        amount_total: item.amount_total / 100,
      })),
    }),
  });

  if (!paymentInsertRes.ok) {
    console.error("❌ Failed to insert payment record:", await paymentInsertRes.text());
    // Continue — we still want to update invoices and send notifications
    // even if the payments table insert fails (e.g. schema mismatch).
  } else {
    console.log("✅ Payment record inserted.");
  }

  // -------------------------------------------------------
  // FIX 3: Update invoices — loop over EVERY id in the batch.
  // metadata.invoiceIds is a comma-separated string for multi-invoice payments:
  //   single:  "uuid-1"
  //   batch:   "uuid-1,uuid-2,uuid-3"
  // paid_date is set on every invoice in the loop, not just the first.
  // -------------------------------------------------------
  const rawInvoiceIds: string = session.metadata?.invoiceIds ?? "";
  const invoiceIds = rawInvoiceIds
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  if (invoiceIds.length === 0) {
    console.log("ℹ️ No invoiceIds in session metadata — nothing to mark paid.");
    return;
  }

  console.log(`📑 Updating ${invoiceIds.length} invoice(s) to 'paid': [${invoiceIds.join(", ")}]`);

  const updatedInvoiceNumbers: number[] = [];
  let   customerEmail: string | null    = null;
  let   customerName:  string           = "Valued Customer";
  let   totalAmount:   number           = (session.amount_total ?? 0) / 100;

  for (const id of invoiceIds) {
    const patchRes = await fetch(
      `${supabaseUrl}/rest/v1/invoices?id=eq.${id}&select=invoice_number,customers(full_name,email)`,
      {
        method: "PATCH",
        headers: dbHeaders,
        body: JSON.stringify({
          status:       "paid",
          paid_amount:  totalAmount,   // total session amount; per-invoice split not available from Stripe
          paid_date:    paidDate,      // FIX 3: stamped for every invoice in the batch
        }),
      }
    );

    if (!patchRes.ok) {
      console.error(`❌ Failed to update invoice ${id}:`, await patchRes.text());
      continue;
    }

    // Supabase returns the updated rows when Prefer: return=representation is set
    const updated = await patchRes.json();
    if (Array.isArray(updated) && updated.length > 0) {
      const row = updated[0];
      if (row.invoice_number) updatedInvoiceNumbers.push(row.invoice_number);

      // Capture customer info from the first invoice that has it
      // (all invoices in a batch belong to the same customer)
      if (!customerEmail && row.customers?.email) {
        customerEmail = row.customers.email;
        customerName  = row.customers.full_name ?? "Valued Customer";
      }
    }

    console.log(`  ✅ Invoice ${id} marked paid (paid_date: ${paidDate})`);
  }

  // -------------------------------------------------------
  // FIX 4: DUAL EMAIL NOTIFICATIONS — fires ONCE per session,
  // regardless of how many invoices were in the batch.
  // Owner email: Rick.PrimeAutoDetail@gmail.com
  // Customer email: pulled from the invoices.customers join above
  // -------------------------------------------------------
  const invoiceLabel = updatedInvoiceNumbers.length > 0
    ? updatedInvoiceNumbers.map((n) => `#${n}`).join(", ")
    : `IDs: ${invoiceIds.join(", ")}`;

  const sharedEmailBody = {
    customerName,
    date:    paidDate,
    time:    "N/A",
    service: `Stripe Invoice Payment — Invoice(s) ${invoiceLabel}`,
    price:   totalAmount.toFixed(2),
    status:  "PAID",
    notes:   `Payment of $${totalAmount.toFixed(2)} received via Stripe Checkout. Session: ${sessionId}`,
  };

  // Owner notification
  await sendEmail({
    to:      "Rick.PrimeAutoDetail@gmail.com",
    subject: `💰 INVOICE PAID: ${customerName} — ${invoiceLabel}`,
    ...sharedEmailBody,
  });

  // Customer notification (only if we have their email)
  if (customerEmail) {
    await sendEmail({
      to:      customerEmail,
      subject: `Your Prime Auto Detail payment is confirmed — ${invoiceLabel}`,
      ...sharedEmailBody,
      notes: `Thank you! Your payment of $${totalAmount.toFixed(2)} has been received. Your invoice(s) ${invoiceLabel} are now marked paid.`,
    });
  } else {
    console.warn("⚠️ No customer email found — skipping customer notification.");
  }

  // -------------------------------------------------------
  // FIX 5: STRUCTURED SUCCESS LOG (visible in Supabase Edge Function Logs)
  // -------------------------------------------------------
  console.log("✅ WEBHOOK SUCCESS", JSON.stringify({
    session_id:      sessionId,
    invoices_paid:   invoiceIds,
    invoice_numbers: updatedInvoiceNumbers,
    amount:          totalAmount,
    customer_email:  customerEmail,
    paid_date:       paidDate,
    timestamp:       new Date().toISOString(),
  }));
}

// ---------------------------
// EMAIL HELPER
// ---------------------------
async function sendEmail(payload: {
  to:           string;
  subject:      string;
  customerName: string;
  date:         string;
  time:         string;
  service:      string;
  price:        string;
  status:       string;
  notes:        string;
}) {
  try {
    const res = await fetch(
      `${supabaseUrl}/functions/v1/send-booking-email`,
      {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${serviceKey}`,
          "apikey":        anonKey,
        },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      console.error(`❌ Email failed (to: ${payload.to}):`, await res.text());
    } else {
      console.log(`📧 Email sent to ${payload.to}`);
    }
  } catch (err) {
    // Email failure must never crash the webhook — Stripe would retry unnecessarily
    console.error(`❌ Email exception (to: ${payload.to}):`, err.message);
  }
}
