// Deno Deploy Edge Function: create employee via Supabase Admin API
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Payload = { name?: string; email?: string; password?: string };

function genPassword(len = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  let out = "";
  const a = new Uint32Array(len);
  crypto.getRandomValues(a);
  for (let i = 0; i < len; i++) out += chars[a[i] % chars.length];
  return out;
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return Response.json({ ok: false, error: "missing_supabase_env" }, { status: 500 });
  }

  let payload: Payload;
  try { payload = await req.json(); } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const email = String(payload?.email || '').trim().toLowerCase();
  const name = String(payload?.name || '').trim();
  const password = String(payload?.password || '') || genPassword(14);
  if (!email) return Response.json({ ok: false, error: "missing_email" }, { status: 400 });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Create auth user with role metadata
  let createdUserId = '';
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'employee', name },
    });
    if (error) throw error;
    createdUserId = data.user?.id || '';
    if (!createdUserId) throw new Error('createUser_missing_id');
  } catch (e) {
    return Response.json({ ok: false, error: String((e as any)?.message || e) }, { status: 500 });
  }

  // Upsert into app_users
  try {
    const { error } = await supabase
      .from('app_users')
      .upsert({ id: createdUserId, email, role: 'employee', name, is_active: true, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    if (error) throw error;
  } catch (e) {
    return Response.json({ ok: false, error: `app_users_upsert_failed:${String((e as any)?.message || e)}` }, { status: 500 });
  }

  return Response.json({ ok: true, user: { id: createdUserId, email, name, role: 'employee' } });
});

