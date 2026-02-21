import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();

    // MercadoPago sends different notification types
    // We care about "payment" type notifications
    if (body.type !== "payment" && body.action !== "payment.created" && body.action !== "payment.updated") {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return new Response(JSON.stringify({ error: "No payment ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // We need to find which branch this payment belongs to.
    // Look up all connected MP configs and try each access token until we find the payment.
    const { data: configs } = await supabase
      .from("mercadopago_config")
      .select("branch_id, access_token")
      .eq("estado_conexion", "conectado");

    if (!configs?.length) {
      return new Response(JSON.stringify({ error: "No connected branches" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let paymentData: Record<string, unknown> | null = null;
    let matchedBranchId: string | null = null;

    for (const cfg of configs) {
      const res = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        { headers: { Authorization: `Bearer ${cfg.access_token}` } },
      );
      if (res.ok) {
        paymentData = await res.json();
        matchedBranchId = cfg.branch_id;
        break;
      }
    }

    if (!paymentData || !matchedBranchId) {
      return new Response(
        JSON.stringify({ error: "Payment not found in any branch" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const status = paymentData.status as string;
    const externalReference = paymentData.external_reference as string | null;

    if (externalReference && status === "approved") {
      // Idempotency: check if this payment was already processed
      const { data: existing } = await supabase
        .from("pedido_pagos")
        .select("id")
        .eq("pedido_id", externalReference)
        .eq("metodo", "mercadopago_qr")
        .eq("monto", Number(paymentData.transaction_amount))
        .limit(1)
        .maybeSingle();

      if (!existing) {
        // Only set mp_payment_id, don't regress estado
        await supabase
          .from("pedidos")
          .update({ mp_payment_id: String(paymentId) })
          .eq("id", externalReference)
          .eq("branch_id", matchedBranchId)
          .is("mp_payment_id", null);

        await supabase.from("pedido_pagos").insert({
          pedido_id: externalReference,
          metodo: "mercadopago_qr",
          monto: Number(paymentData.transaction_amount),
        });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        payment_id: paymentId,
        status,
        branch_id: matchedBranchId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("MP webhook error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
