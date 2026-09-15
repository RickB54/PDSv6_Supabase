// Deno Deploy Edge Function: create-booking with server-side IP rate-limiting
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Rate Limiting State (Sliding Window per IP in memory) ──
const ipRequestHistory = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5; // Max 5 bookings per IP per minute

function isRateLimited(ip: string): { limited: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = ipRequestHistory.get(ip) || [];
  
  // Prune timestamps older than 60 seconds
  const validTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    ipRequestHistory.set(ip, validTimestamps);
    return { limited: true, remaining: 0 };
  }
  
  validTimestamps.push(now);
  ipRequestHistory.set(ip, validTimestamps);
  return { limited: false, remaining: MAX_REQUESTS_PER_WINDOW - validTimestamps.length };
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Extract client IP
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                   req.headers.get('cf-connecting-ip') ||
                   req.headers.get('x-real-ip') ||
                   'unknown-client';

  // Enforce server-side rate limit
  const { limited, remaining } = isRateLimited(clientIp);
  if (limited) {
    console.warn(`⚠️ Rate limit exceeded on booking creation for IP: ${clientIp}`);
    return new Response(
      JSON.stringify({ 
        error: 'Rate limit exceeded: Max 5 booking submissions per minute per IP. Please wait before trying again.' 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': '60',
          'X-RateLimit-Limit': String(MAX_REQUESTS_PER_WINDOW),
          'X-RateLimit-Remaining': '0'
        }, 
        status: 429 
      }
    );
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "missing_supabase_env" }), { status: 500, headers: corsHeaders });
  }

  let input: any;
  try {
    input = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    let customerId: string | null = null;

    // 1. Match or create Customer
    if (input.email) {
      const { data: byEmail } = await supabase
        .from('customers')
        .select('id')
        .eq('email', input.email)
        .maybeSingle();
      if (byEmail) customerId = byEmail.id;
    }

    if (!customerId && input.customer_name) {
      const { data: byName } = await supabase
        .from('customers')
        .select('id')
        .ilike('full_name', input.customer_name.trim())
        .maybeSingle();
      if (byName) customerId = byName.id;
    }

    if (!customerId && input.phone) {
      const normalizedPhone = input.phone.replace(/\D/g, '');
      if (normalizedPhone.length >= 7) {
        const { data: byPhone } = await supabase
          .from('customers')
          .select('id')
          .ilike('phone', `%${normalizedPhone}%`)
          .maybeSingle();
        if (byPhone) customerId = byPhone.id;
      }
    }

    if (!customerId) {
      const insertPayload: any = {
        full_name: input.customer_name,
        phone: input.phone || null,
        type: 'prospect',
        notes: input.email ? 'Created via Book Now' : 'Created via Book Now (Staff Entry)'
      };
      if (input.email) insertPayload.email = input.email;

      const { data: newCust, error: cErr } = await supabase
        .from('customers')
        .insert(insertPayload)
        .select('id');

      if (!cErr && newCust && newCust[0]) {
        customerId = newCust[0].id;
      }
    }

    // 2. Insert Vehicle
    let vehicleId: string | null = null;
    if (customerId) {
      const { data: newVeh } = await supabase.from('vehicles').insert({
        customer_id: customerId,
        make: input.make || 'Unknown',
        model: input.model || 'Unknown',
        year: parseInt(input.year || '0') || null,
        type: input.vehicle_type,
        color: input.color || null,
        condition_outside: input.condition || null
      }).select('id').single();
      if (newVeh) vehicleId = newVeh.id;
    }

    // 3. Create Booking
    const bookedByInfo = input.booked_by || 'Public Website';
    const fullNotes = input.add_ons && input.add_ons.length > 0
      ? (input.notes ? `${input.notes}\n\nAdd-Ons: ${input.add_ons.join(', ')}\nBooked by: ${bookedByInfo}` : `Add-Ons: ${input.add_ons.join(', ')}\nBooked by: ${bookedByInfo}`)
      : (input.notes ? `${input.notes}\nBooked by: ${bookedByInfo}` : `Booked by: ${bookedByInfo}`);

    const bookingPayload = {
      customer_id: customerId,
      vehicle_id: vehicleId,
      service_package: input.package,
      service_price: input.price_total,
      scheduled_at: input.date,
      status: input.status || 'tentative',
      notes: fullNotes,
      add_ons: input.add_ons,
      end_time: input.end_time || null,
      source_origin: bookedByInfo,
      booking_vehicle: {
        customer_name: input.customer_name,
        email: input.email,
        phone: input.phone,
        address: input.address,
        year: input.year || '',
        make: input.make || '',
        model: input.model || '',
        type: input.vehicle_type || '',
        color: input.color || '',
        condition: input.condition || '',
        placeOfService: input.place_of_service || ''
      }
    };

    const { data: bookingData, error: bErr } = await supabase
      .from('bookings')
      .insert(bookingPayload)
      .select('*')
      .single();

    if (bErr) throw bErr;

    return new Response(
      JSON.stringify({ success: true, booking: bookingData, remaining }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err: any) {
    console.error("Server Booking Create Failed:", err);
    return new Response(
      JSON.stringify({ error: err.message || String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
