import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Lists Point Smart devices linked to the MercadoPago account for a branch.
 * Requires authentication.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { branch_id } = await req.json();
    if (!branch_id) {
      return new Response(
        JSON.stringify({ error: "branch_id required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: config } = await supabase
      .from("mercadopago_config")
      .select("access_token, estado_conexion")
      .eq("branch_id", branch_id)
      .single();

    if (!config?.access_token || config.estado_conexion !== "conectado") {
      return new Response(
        JSON.stringify({ error: "MercadoPago not connected", devices: [] }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const mpRes = await fetch(
      "https://api.mercadopago.com/point/integration-api/devices",
      {
        headers: { Authorization: `Bearer ${config.access_token}` },
      },
    );

    if (!mpRes.ok) {
      const detail = await mpRes.text();
      return new Response(
        JSON.stringify({ error: "Failed to fetch devices", detail }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const mpData = await mpRes.json();

    const devices = (mpData.devices ?? mpData ?? []).map(
      (d: Record<string, unknown>) => ({
        id: d.id,
        pos_id: d.pos_id,
        operating_mode: d.operating_mode,
        external_pos_id: d.external_pos_id,
      }),
    );

    return new Response(JSON.stringify({ devices }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
