// Deno Edge Function: upsert-booking-draft
// Handles both INSERT (new draft) and UPDATE (patch existing, or mark converted).
// Uses service-role key — no anon RLS policy needed on booking_drafts.
// Rate limiting applies ONLY to new draft creation (INSERT), not to updates.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Rate-limit config ──────────────────────────────────────────────────────────
// A single visitor should only ever create 1 draft per session. 
// 10 new drafts per IP per 10 minutes is very generous for legitimate use,
// and very restrictive for scripted flooding.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_NEW_DRAFTS_PER_WINDOW = 10;

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "missing_supabase_env" }),
      { status: 500, headers: corsHeaders }
    );
  }

  // Extract client IP for rate limiting
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown-client";

  let input: any;
  try {
    input = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "invalid_json" }),
      { status: 400, headers: corsHeaders }
    );
  }

  const { session_id } = input;
  if (!session_id || typeof session_id !== "string" || session_id.length > 120) {
    return new Response(
      JSON.stringify({ error: "session_id is required and must be a valid string" }),
      { status: 400, headers: corsHeaders }
    );
  }

  // Use service-role client — bypasses RLS for all writes
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // ── 1. Check if this is an INSERT (new session) or UPDATE (existing session) ──
  const { data: existing, error: lookupErr } = await supabase
    .from("booking_drafts")
    .select("id, client_ip")
    .eq("session_id", session_id)
    .maybeSingle();

  if (lookupErr) {
    console.error("Draft lookup error:", lookupErr);
    return new Response(
      JSON.stringify({ error: "lookup_failed" }),
      { status: 500, headers: corsHeaders }
    );
  }

  const isNewDraft = !existing;

  // ── 2. Rate-limit only applies to new draft creation (INSERT) ──────────────
  if (isNewDraft) {
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

    const { count: ipCount } = await supabase
      .from("booking_drafts")
      .select("id", { count: "exact", head: true })
      .eq("client_ip", clientIp)
      .gte("created_at", windowStart);

    if (ipCount !== null && ipCount >= MAX_NEW_DRAFTS_PER_WINDOW) {
      console.warn(
        `⚠️ Draft rate limit exceeded for IP: ${clientIp} (${ipCount} in last 10 min)`
      );
      return new Response(
        JSON.stringify({
          error: `Rate limit exceeded: Max ${MAX_NEW_DRAFTS_PER_WINDOW} draft submissions per 10 minutes per IP.`,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": "600",
            "X-RateLimit-Limit": String(MAX_NEW_DRAFTS_PER_WINDOW),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
  }

  // ── 3. Build the payload ───────────────────────────────────────────────────
  const now = new Date().toISOString();

  if (isNewDraft) {
    // INSERT — fresh draft
    const insertPayload: any = {
      session_id,
      name: input.name || null,
      email: input.email || null,
      phone: input.phone || null,
      address: input.address || null,
      vehicle_make: input.vehicle_make || null,
      vehicle_model: input.vehicle_model || null,
      vehicle_year: input.vehicle_year || null,
      vehicle_type: input.vehicle_type || null,
      vehicle_color: input.vehicle_color || null,
      service_package: input.service_package || null,
      add_ons: input.add_ons || null,
      preferred_date: input.preferred_date || null,
      status: "draft",
      client_ip: clientIp,
      // expires_at uses table default (now + 48h)
    };

    const { data, error } = await supabase
      .from("booking_drafts")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error) {
      console.error("Draft insert error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`✅ Draft created: ${data.id} for session ${session_id} from IP ${clientIp}`);
    return new Response(
      JSON.stringify({ id: data.id, created: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } else {
    // UPDATE — patch existing draft (or mark converted)
    const patchPayload: any = { updated_at: now };

    // Bump expires_at on each update (reset 48h window from last activity)
    // But NOT if we're converting — don't extend a converted draft
    const isConverting = input.status === "converted" || input.status === "dismissed";

    if (!isConverting) {
      patchPayload.expires_at = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    }

    // Patch any provided fields
    if (input.name !== undefined) patchPayload.name = input.name || null;
    if (input.email !== undefined) patchPayload.email = input.email || null;
    if (input.phone !== undefined) patchPayload.phone = input.phone || null;
    if (input.address !== undefined) patchPayload.address = input.address || null;
    if (input.vehicle_make !== undefined) patchPayload.vehicle_make = input.vehicle_make || null;
    if (input.vehicle_model !== undefined) patchPayload.vehicle_model = input.vehicle_model || null;
    if (input.vehicle_year !== undefined) patchPayload.vehicle_year = input.vehicle_year || null;
    if (input.vehicle_type !== undefined) patchPayload.vehicle_type = input.vehicle_type || null;
    if (input.vehicle_color !== undefined) patchPayload.vehicle_color = input.vehicle_color || null;
    if (input.service_package !== undefined) patchPayload.service_package = input.service_package || null;
    if (input.add_ons !== undefined) patchPayload.add_ons = input.add_ons || null;
    if (input.preferred_date !== undefined) patchPayload.preferred_date = input.preferred_date || null;
    if (input.status !== undefined) patchPayload.status = input.status;
    if (input.booking_id !== undefined) patchPayload.booking_id = input.booking_id || null;

    const { data, error } = await supabase
      .from("booking_drafts")
      .update(patchPayload)
      .eq("session_id", session_id)
      .select("id")
      .single();

    if (error) {
      console.error("Draft update error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    const action = isConverting ? `converted → booking ${input.booking_id}` : "updated";
    console.log(`✅ Draft ${action}: ${data.id} for session ${session_id}`);

    return new Response(
      JSON.stringify({ id: data.id, updated: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
