import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Generic Webhook for receiving orders from external platforms
 * Supports: Rappi, PedidosYa, MercadoPago Delivery
 * 
 * Each platform sends orders in their own format, this webhook normalizes them.
 * 
 * URL format: /webhook-orders?platform=rappi&branch_id=xxx&api_key=yyy
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Platform-specific order normalizers
interface NormalizedOrder {
  external_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  order_type: "delivery" | "takeaway";
  notes: string | null;
  items: Array<{
    product_id?: string;
    external_product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    notes?: string;
  }>;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  payment_status: "pending" | "paid";
}

function normalizeRappiOrder(payload: any): NormalizedOrder {
  // Rappi format normalization
  return {
    external_id: payload.order_id || payload.id,
    customer_name: payload.client?.name || "Cliente Rappi",
    customer_phone: payload.client?.phone || "",
    customer_address: payload.delivery?.address || null,
    order_type: "delivery",
    notes: payload.special_instructions || null,
    items: (payload.items || payload.products || []).map((item: any) => ({
      external_product_id: item.product_id || item.sku,
      product_name: item.name || item.product_name,
      quantity: item.quantity || 1,
      unit_price: item.price || item.unit_price,
      notes: item.comments || item.notes,
    })),
    subtotal: payload.subtotal || payload.order_value,
    delivery_fee: payload.delivery_fee || 0,
    total: payload.total || payload.order_value,
    payment_method: "rappi",
    payment_status: "paid", // Rappi always pre-paid
  };
}

function normalizePedidosYaOrder(payload: any): NormalizedOrder {
  // PedidosYa format normalization
  return {
    external_id: payload.code || payload.id,
    customer_name: payload.user?.name || "Cliente PedidosYa",
    customer_phone: payload.user?.phone || "",
    customer_address: payload.address?.description || payload.address?.street || null,
    order_type: payload.pickup ? "takeaway" : "delivery",
    notes: payload.notes || payload.user_comments || null,
    items: (payload.details || payload.products || []).map((item: any) => ({
      external_product_id: item.product?.integrationCode || item.id,
      product_name: item.product?.name || item.name,
      quantity: item.quantity || 1,
      unit_price: item.unitPrice || item.price,
      notes: item.optionGroups?.map((og: any) => og.name).join(", ") || null,
    })),
    subtotal: payload.subTotal || payload.subtotal,
    delivery_fee: payload.deliveryCost || payload.shipping || 0,
    total: payload.total || payload.totalAmount,
    payment_method: payload.payment?.online ? "pedidosya" : "efectivo",
    payment_status: payload.payment?.online ? "paid" : "pending",
  };
}

function normalizeMPDeliveryOrder(payload: any): NormalizedOrder {
  // MercadoPago Delivery format normalization
  return {
    external_id: payload.id || payload.order_id,
    customer_name: payload.buyer?.nickname || payload.buyer?.first_name || "Cliente MP",
    customer_phone: payload.buyer?.phone?.number || "",
    customer_address: payload.shipping?.receiver_address?.street_name || null,
    order_type: "delivery",
    notes: payload.order_request?.comments || null,
    items: (payload.order_items || []).map((item: any) => ({
      external_product_id: item.item?.id || item.sku,
      product_name: item.item?.title || item.title,
      quantity: item.quantity || 1,
      unit_price: item.unit_price || item.price,
    })),
    subtotal: payload.total_amount - (payload.shipping?.cost || 0),
    delivery_fee: payload.shipping?.cost || 0,
    total: payload.total_amount,
    payment_method: "mp_delivery",
    payment_status: payload.status === "paid" ? "paid" : "pending",
  };
}

function normalizeGenericOrder(payload: any): NormalizedOrder {
  // Generic/manual format
  return {
    external_id: payload.external_id || payload.id || crypto.randomUUID(),
    customer_name: payload.customer_name || payload.customer?.name || "Cliente",
    customer_phone: payload.customer_phone || payload.customer?.phone || "",
    customer_address: payload.customer_address || payload.address || null,
    order_type: payload.order_type || "delivery",
    notes: payload.notes || null,
    items: (payload.items || []).map((item: any) => ({
      external_product_id: item.external_id || item.sku || item.id,
      product_name: item.name || item.product_name,
      quantity: item.quantity || 1,
      unit_price: item.price || item.unit_price,
      notes: item.notes,
    })),
    subtotal: payload.subtotal || 0,
    delivery_fee: payload.delivery_fee || 0,
    total: payload.total || 0,
    payment_method: payload.payment_method || "efectivo",
    payment_status: payload.payment_status || "pending",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const platform = url.searchParams.get("platform") || "generic";
    const branchId = url.searchParams.get("branch_id");
    const apiKey = url.searchParams.get("api_key");

    if (!branchId) {
      return json(400, { error: "branch_id is required as query parameter" });
    }

    // Validate API key (simple validation - should be stored in branch settings)
    const { data: branchConfig } = await supabaseAdmin
      .from("branches")
      .select("id, name, webhook_api_key")
      .eq("id", branchId)
      .single();

    if (!branchConfig) {
      return json(404, { error: "Branch not found" });
    }

    // If branch has a webhook key configured, validate it
    if (branchConfig.webhook_api_key && branchConfig.webhook_api_key !== apiKey) {
      return json(401, { error: "Invalid API key" });
    }

    const payload = await req.json();

    // Normalize order based on platform
    let normalizedOrder: NormalizedOrder;
    let salesChannel: string;

    switch (platform.toLowerCase()) {
      case "rappi":
        normalizedOrder = normalizeRappiOrder(payload);
        salesChannel = "rappi";
        break;
      case "pedidosya":
      case "pya":
        normalizedOrder = normalizePedidosYaOrder(payload);
        salesChannel = "pedidosya";
        break;
      case "mp_delivery":
      case "mercadopago":
        normalizedOrder = normalizeMPDeliveryOrder(payload);
        salesChannel = "mp_delivery";
        break;
      default:
        normalizedOrder = normalizeGenericOrder(payload);
        salesChannel = platform;
    }

    // Check integrator settings for auto-accept
    const { data: integratorSettings } = await supabaseAdmin
      .from("branch_integrator_settings")
      .select("auto_accept_channels")
      .eq("branch_id", branchId)
      .single();

    const autoAcceptChannels = integratorSettings?.auto_accept_channels as Record<string, boolean> | null;
    const shouldAutoAccept = autoAcceptChannels?.[salesChannel] === true;

    // Create order
    const orderId = crypto.randomUUID();
    const trackingToken = crypto.randomUUID();

    const orderPayload = {
      id: orderId,
      tracking_token: trackingToken,
      branch_id: branchId,
      external_order_id: normalizedOrder.external_id,
      customer_name: normalizedOrder.customer_name,
      customer_phone: normalizedOrder.customer_phone,
      customer_address: normalizedOrder.customer_address,
      order_type: normalizedOrder.order_type,
      notes: normalizedOrder.notes,
      subtotal: normalizedOrder.subtotal,
      delivery_fee: normalizedOrder.delivery_fee,
      total: normalizedOrder.total,
      status: shouldAutoAccept ? "confirmed" : "pending",
      sales_channel: salesChannel,
      order_area: normalizedOrder.order_type === "delivery" ? "delivery" : "mostrador",
      payment_method: normalizedOrder.payment_method,
      payment_status: normalizedOrder.payment_status,
      integration_status: shouldAutoAccept ? "auto_accepted" : "pending",
      integration_accepted_at: shouldAutoAccept ? new Date().toISOString() : null,
    };

    const { error: orderError } = await supabaseAdmin.from("orders").insert(orderPayload as any);
    if (orderError) {
      console.error("Order insert error:", orderError);
      return json(400, { error: orderError.message });
    }

    // Insert order items (try to match products by external_id or name)
    const orderItems = await Promise.all(
      normalizedOrder.items.map(async (item) => {
        // Try to find matching product
        const { data: product } = await supabaseAdmin
          .from("products")
          .select("id, name")
          .or(`external_id.eq.${item.external_product_id},name.ilike.%${item.product_name}%`)
          .limit(1)
          .single();

        return {
          order_id: orderId,
          product_id: product?.id || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.quantity * item.unit_price,
          product_name_snapshot: item.product_name,
          notes: item.notes || null,
        };
      })
    );

    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(orderItems as any);
    if (itemsError) {
      console.error("Items insert error:", itemsError);
      // Don't fail the whole request, order is already created
    }

    return json(200, {
      success: true,
      order_id: orderId,
      tracking_token: trackingToken,
      status: shouldAutoAccept ? "auto_accepted" : "pending",
      message: shouldAutoAccept 
        ? "Order auto-accepted and sent to kitchen" 
        : "Order received and pending acceptance",
    });

  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json(500, { error: "Failed to process order", details: message });
  }
});
