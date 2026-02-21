import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CheckoutItem {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
}

interface CheckoutRequest {
  branch_id: string;
  items: CheckoutItem[];
  payer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  external_reference?: string;
  /** URL the buyer returns to after paying */
  back_url?: string;
  /** When true, skips auth — used by the public webapp checkout flow */
  webapp_order?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body: CheckoutRequest = await req.json();

    // Webapp orders skip auth but require a valid pedido_id as external_reference
    if (body.webapp_order) {
      if (!body.external_reference) {
        return new Response(
          JSON.stringify({ error: "external_reference (pedido_id) required for webapp orders" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const { data: pedido } = await supabase
        .from("pedidos")
        .select("id")
        .eq("id", body.external_reference)
        .eq("tipo", "webapp")
        .single();
      if (!pedido) {
        return new Response(
          JSON.stringify({ error: "Pedido webapp no encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } else {
      // Authenticated flow (POS, backoffice)
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
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { branch_id, items, payer, external_reference, back_url } = body;

    if (!branch_id || !items?.length) {
      return new Response(
        JSON.stringify({ error: "branch_id and items required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: config, error: cfgError } = await supabase
      .from("mercadopago_config")
      .select("access_token")
      .eq("branch_id", branch_id)
      .single();

    if (cfgError || !config?.access_token) {
      return new Response(
        JSON.stringify({ error: "MercadoPago not configured for this branch" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const preference = {
      items: items.map((i) => ({
        title: i.title,
        quantity: i.quantity,
        unit_price: i.unit_price,
        currency_id: i.currency_id || "ARS",
      })),
      payer: payer
        ? {
            name: payer.name,
            email: payer.email,
            phone: payer.phone ? { number: payer.phone } : undefined,
          }
        : undefined,
      external_reference: external_reference || undefined,
      back_urls: back_url
        ? {
            success: back_url,
            failure: back_url,
            pending: back_url,
          }
        : undefined,
      auto_return: back_url ? "approved" : undefined,
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mp-webhook`,
    };

    const mpRes = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preference),
      },
    );

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to create preference", detail: mpData }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        preference_id: mpData.id,
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
