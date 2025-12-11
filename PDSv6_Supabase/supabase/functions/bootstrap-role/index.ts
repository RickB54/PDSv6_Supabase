// Deno Deploy Edge Function: seed app_users with real auth.users.id
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Payload = { email?: string; userId?: string; role: "admin" | "employee" | "customer" };

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
  if (!payload?.role || (!payload.email && !payload.userId)) {
    return Response.json({ ok: false, error: "missing_params" }, { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  let userId = payload.userId || "";
  try {
    if (!userId && payload.email) {
      const { data, error } = await supabase.auth.admin.listUsers();
      if (error) throw error;
      const match = data.users.find((u: any) => (u.email ?? "").toLowerCase() === payload.email!.toLowerCase());
      if (!match) return Response.json({ ok: false, error: "user_not_found" }, { status: 404 });
      userId = match.id as string;
    }
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }

  // Upsert into app_users
  try {
    const { error } = await supabase
      .from("app_users")
      .upsert({ id: userId, role: payload.role }, { onConflict: "id" });
    if (error) throw error;
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }

  return Response.json({ ok: true, id: userId, role: payload.role });
});

