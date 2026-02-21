import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Public edge function — returns order status by tracking code.
 * No auth required. Sanitised output (no customer PII).
 *
 * GET ?code=<uuid>
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

  try {
    const url = new URL(req.url);
    const trackingCode = url.searchParams.get("code");

    if (!trackingCode) return json(400, { error: "code es requerido" });

    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(trackingCode))
      return json(400, { error: "Formato de código inválido" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch order (non-sensitive fields only)
    const { data: pedido, error: pedErr } = await supabase
      .from("pedidos")
      .select(
        `id, numero_pedido, estado, tipo, tipo_servicio,
         subtotal, costo_delivery, descuento, total,
         tiempo_prometido, tiempo_inicio_prep, tiempo_listo, tiempo_entregado,
         pago_estado, created_at,
         branch_id`,
      )
      .eq("webapp_tracking_code", trackingCode)
      .single();

    if (pedErr || !pedido)
      return json(404, { error: "Pedido no encontrado" });

    // Fetch items + modifiers
    const { data: items } = await supabase
      .from("pedido_items")
      .select(
        `id, nombre, cantidad, precio_unitario, subtotal, notas,
         pedido_item_modificadores(tipo, descripcion, precio_extra)`,
      )
      .eq("pedido_id", pedido.id)
      .order("created_at", { ascending: true });

    // Fetch branch public info
    const { data: branch } = await supabase
      .from("branches")
      .select("name, address, city, phone")
      .eq("id", pedido.branch_id)
      .single();

    // Build timeline from timestamps
    const timeline: Array<{ estado: string; timestamp: string | null }> = [
      { estado: "pendiente", timestamp: pedido.created_at },
    ];
    if (
      pedido.estado !== "pendiente" &&
      pedido.estado !== "cancelado"
    ) {
      timeline.push({
        estado: "en_preparacion",
        timestamp: pedido.tiempo_inicio_prep,
      });
    }
    if (
      ["listo", "entregado"].includes(pedido.estado)
    ) {
      timeline.push({ estado: "listo", timestamp: pedido.tiempo_listo });
    }
    if (pedido.estado === "entregado") {
      timeline.push({
        estado: "entregado",
        timestamp: pedido.tiempo_entregado,
      });
    }
    if (pedido.estado === "cancelado") {
      timeline.push({ estado: "cancelado", timestamp: null });
    }

    return json(200, {
      pedido: {
        numero_pedido: pedido.numero_pedido,
        estado: pedido.estado,
        tipo_servicio: pedido.tipo_servicio,
        subtotal: pedido.subtotal,
        costo_delivery: pedido.costo_delivery,
        descuento: pedido.descuento,
        total: pedido.total,
        pago_estado: pedido.pago_estado,
        tiempo_prometido: pedido.tiempo_prometido,
        created_at: pedido.created_at,
      },
      items: (items ?? []).map((it: any) => ({
        nombre: it.nombre,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
        subtotal: it.subtotal,
        notas: it.notas,
        modificadores: (it.pedido_item_modificadores ?? []).map((m: any) => ({
          tipo: m.tipo,
          descripcion: m.descripcion,
          precio_extra: m.precio_extra,
        })),
      })),
      branch: branch ?? null,
      timeline,
    });
  } catch (err: unknown) {
    console.error("webapp-order-tracking error:", err);
    return json(500, { error: "Error interno" });
  }
});
