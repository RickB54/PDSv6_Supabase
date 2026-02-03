# 💳 Stripe Live Mode Setup Guide

I have updated your local `.env` and prepared the Edge Functions for live mode. However, since your application uses **Supabase Edge Functions** for processing payments, there are a few critical steps you must take in the Supabase Dashboard and Stripe Dashboard to finalize the transition.

---

## 1. Set Supabase Secrets (CRITICAL)
Environment variables in `.env` only work for local development. For your live site, you must set these secrets in Supabase via the CLI:

```bash
# Set Stripe Secret Key
supabase secrets set STRIPE_SECRET_KEY=sk_live_your_secret_key_here

# Set your Production Site URL
supabase secrets set SITE_URL=https://primeautodetail.net
```

---

## 2. Configure Webhooks
To record payments in your database, you need to tell Stripe where to send "Payment Successful" events.

1.  Go to the **Stripe Dashboard** (Live Mode).
2.  Navigate to **Developers -> Webhooks**.
3.  Click **Add Endpoint**.
4.  **Endpoint URL:** `https://kqhaoyaermsqrilhsfxj.supabase.co/functions/v1/stripe-webhook`
5.  **Select Events:** `checkout.session.completed`
6.  Once created, reveal the **Signing Secret** (starts with `whsec_...`).
7.  Add this secret to your Supabase project:
    ```bash
    supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_actual_secret
    ```

---

## 3. Deploy Edge Functions
After setting the secrets, you must re-deploy the Stripe functions:

```bash
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
```

---

## 4. Summary of Changes I Made
1.  **`.env`**: Replaced test keys with the live keys you provided.
2.  **`supabase/functions/create-checkout/index.ts`**: 
    - Added **CORS handling** to allow your live website to call the function.
    - Added **OPTIONS method support** (pre-flight checks).
    - Ensured redirection uses the `SITE_URL` from your Supabase environment.

---

## What else is needed?
*   **SITE_URL**: As mentioned above, I need to know your live production URL (e.g., Netlify or Vercel URL) if you want me to set it for you, or you can set it yourself via the CLI.
*   **Webhook Secret**: You are missing the `STRIPE_WEBHOOK_SECRET`. Payments will process fine without it, but they won't show up in your application's "Payments" history until this is configured.
