import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type CreateWebOrderBody = {
  order: {
    branch_id: string;
    customer_id?: string | null;
    customer_name: string;
    customer_phone: string;
    customer_email?: string | null;
    order_type: string;
    delivery_address?: string | null;
    notes?: string | null;
    subtotal: number;
    delivery_fee?: number | null;
    total: number;
    payment_method?: string | null;
    invoice_type: string;
    customer_cuit?: string | null;
    customer_business_name?: string | null;
  };
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    product_name_snapshot: string;
    notes?: string | null;
  }>;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = (await req.json()) as CreateWebOrderBody;

    if (!body?.order?.branch_id) return json(400, { error: "branch_id is required" });
    if (!body?.order?.customer_name?.trim()) return json(400, { error: "customer_name is required" });
    if (!body?.order?.customer_phone?.trim()) return json(400, { error: "customer_phone is required" });
    if (!Array.isArray(body?.items) || body.items.length === 0) return json(400, { error: "items are required" });

    const orderId = crypto.randomUUID();
    const trackingToken = crypto.randomUUID();

    // Enforce web constraints server-side
    const orderPayload = {
      id: orderId,
      tracking_token: trackingToken,
      branch_id: body.order.branch_id,
      customer_id: body.order.customer_id ?? null,
      customer_name: body.order.customer_name.trim(),
      customer_phone: body.order.customer_phone.trim(),
      customer_email: body.order.customer_email ?? null,
      order_type: body.order.order_type,
      delivery_address: body.order.delivery_address ?? null,
      notes: body.order.notes ?? null,
      subtotal: body.order.subtotal,
      delivery_fee: body.order.delivery_fee ?? 0,
      total: body.order.total,
      status: "pending",
      sales_channel: "web_app",
      order_area: body.order.order_type === "delivery" ? "delivery" : "mostrador",
      payment_method: body.order.payment_method ?? null,
      invoice_type: body.order.invoice_type,
      customer_cuit: body.order.customer_cuit ?? null,
      customer_business_name: body.order.customer_business_name ?? null,
    };

    const { error: orderError } = await supabaseAdmin.from("orders").insert(orderPayload as any);
    if (orderError) return json(400, { error: orderError.message, code: (orderError as any)?.code });

    const orderItems = body.items.map((it) => ({
      order_id: orderId,
      product_id: it.product_id,
      quantity: it.quantity,
      unit_price: it.unit_price,
      product_name_snapshot: it.product_name_snapshot,
      notes: it.notes ?? null,
    }));

    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(orderItems as any);
    if (itemsError) {
      // Best-effort rollback
      await supabaseAdmin.from("orders").delete().eq("id", orderId);
      return json(400, { error: itemsError.message, code: (itemsError as any)?.code });
    }

    return json(200, { orderId, trackingToken });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json(500, { error: "Failed to create order", details: message });
  }
});
