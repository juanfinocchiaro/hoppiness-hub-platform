import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * link-guest-orders — Links guest webapp orders to an authenticated user.
 * 
 * When a user signs up/in (e.g. via Google after PostPurchaseSignup),
 * this function finds orders matching their email or phone and links them.
 * 
 * Optionally accepts a specific tracking_code to link a single order.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { error: "Not authenticated" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return json(401, { error: "Invalid token" });

    const body = await req.json().catch(() => ({}));
    const trackingCode = body.tracking_code as string | undefined;

    let linkedCount = 0;

    if (trackingCode) {
      // Link a specific order by tracking code
      const { data, error } = await supabase
        .from("pedidos")
        .update({ cliente_user_id: user.id })
        .eq("webapp_tracking_code", trackingCode)
        .is("cliente_user_id", null)
        .select("id");

      if (!error && data) linkedCount = data.length;
    }

    // Also link by email (if user has email)
    if (user.email) {
      const { data, error } = await supabase
        .from("pedidos")
        .update({ cliente_user_id: user.id })
        .eq("cliente_email", user.email)
        .is("cliente_user_id", null)
        .select("id");

      if (!error && data) linkedCount += data.length;
    }

    // Link by phone from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .single();

    if (profile?.phone) {
      const { data, error } = await supabase
        .from("pedidos")
        .update({ cliente_user_id: user.id })
        .eq("cliente_telefono", profile.phone)
        .is("cliente_user_id", null)
        .select("id");

      if (!error && data) linkedCount += data.length;
    }

    return json(200, { linked: linkedCount });
  } catch (err: unknown) {
    console.error("link-guest-orders error:", err);
    return json(500, { error: "Internal error" });
  }
});
