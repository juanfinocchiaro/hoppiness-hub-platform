import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PointPaymentRequest {
  branch_id: string;
  pedido_id: string;
  amount: number;
  ticket_number?: string;
}

/**
 * Creates a payment intent on the MercadoPago Point Smart device.
 * The device automatically shows the amount and the customer can pay
 * with card (debit/credit/prepaid), QR, or contactless.
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

    const body: PointPaymentRequest = await req.json();
    const { branch_id, pedido_id, amount, ticket_number } = body;

    if (!branch_id || !pedido_id || !amount) {
      return new Response(
        JSON.stringify({
          error: "branch_id, pedido_id, and amount are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: config } = await supabase
      .from("mercadopago_config")
      .select("access_token, device_id, estado_conexion")
      .eq("branch_id", branch_id)
      .single();

    if (!config?.access_token || config.estado_conexion !== "conectado") {
      return new Response(
        JSON.stringify({ error: "MercadoPago not connected for this branch" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!config.device_id) {
      return new Response(
        JSON.stringify({
          error: "No Point Smart device configured. Go to Configuration > MercadoPago to link a device.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Point API uses integer amounts (cents): $15.00 -> 1500
    const amountCents = Math.round(amount * 100);

    const paymentIntent = {
      amount: amountCents,
      additional_info: {
        external_reference: pedido_id,
        print_on_terminal: true,
        ticket_number: ticket_number || pedido_id.slice(0, 8).toUpperCase(),
      },
    };

    const mpRes = await fetch(
      `https://api.mercadopago.com/point/integration-api/devices/${config.device_id}/payment-intents`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentIntent),
      },
    );

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      const errorMsg =
        mpRes.status === 409
          ? "El Point Smart tiene un cobro pendiente. Cancelalo desde el dispositivo e intentá de nuevo."
          : "Error al enviar cobro al Point Smart";
      return new Response(
        JSON.stringify({ error: errorMsg, detail: mpData }),
        {
          status: mpRes.status === 409 ? 409 : 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Save payment intent ID on the order
    await supabase
      .from("pedidos")
      .update({ mp_payment_intent_id: mpData.id })
      .eq("id", pedido_id)
      .eq("branch_id", branch_id);

    return new Response(
      JSON.stringify({
        payment_intent_id: mpData.id,
        device_id: mpData.device_id,
        amount: mpData.amount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
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
