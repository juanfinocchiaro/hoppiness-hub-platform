import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * webapp-pedido-chat — Public edge function for order chat.
 *
 * GET  ?code=<tracking_code>           → returns messages for order
 * POST { code, mensaje, sender_nombre } → sends a message from the client
 *
 * Clients use tracking_code (no auth required) to read/write.
 * Staff uses RLS policies directly via the Supabase client.
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

// States where chat is active
const ACTIVE_STATES = [
  "pendiente",
  "confirmado",
  "en_preparacion",
  "listo",
  "en_camino",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const url = new URL(req.url);

    if (req.method === "GET") {
      const code = url.searchParams.get("code");
      if (!code) return json(400, { error: "code es requerido" });

      // Verify order exists
      const { data: pedido, error: pedidoErr } = await supabase
        .from("pedidos")
        .select("id, estado, branch_id")
        .eq("webapp_tracking_code", code)
        .single();

      if (pedidoErr || !pedido)
        return json(404, { error: "Pedido no encontrado" });

      // Fetch messages
      const { data: messages, error: msgErr } = await supabase
        .from("webapp_pedido_mensajes")
        .select("id, sender_type, sender_nombre, mensaje, leido, created_at")
        .eq("pedido_id", pedido.id)
        .order("created_at", { ascending: true });

      if (msgErr) return json(500, { error: "Error al cargar mensajes" });

      return json(200, {
        pedido_id: pedido.id,
        estado: pedido.estado,
        chat_active: ACTIVE_STATES.includes(pedido.estado),
        messages: messages ?? [],
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { code, mensaje, sender_nombre } = body;

      if (!code) return json(400, { error: "code es requerido" });
      if (!mensaje?.trim())
        return json(400, { error: "mensaje es requerido" });
      if (mensaje.length > 500)
        return json(400, { error: "Mensaje demasiado largo (máx 500)" });
      if (!sender_nombre?.trim())
        return json(400, { error: "sender_nombre es requerido" });

      // Verify order is active
      const { data: pedido, error: pedidoErr } = await supabase
        .from("pedidos")
        .select("id, estado, branch_id, cliente_user_id")
        .eq("webapp_tracking_code", code)
        .single();

      if (pedidoErr || !pedido)
        return json(404, { error: "Pedido no encontrado" });

      if (!ACTIVE_STATES.includes(pedido.estado))
        return json(400, {
          error: "El chat de este pedido ya no está activo",
        });

      // Extract sender_id from auth if available
      let senderId: string | null = null;
      const authHeader = req.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "");
        const {
          data: { user },
        } = await supabase.auth.getUser(token);
        if (user) senderId = user.id;
      }

      // Insert message
      const { data: inserted, error: insertErr } = await supabase
        .from("webapp_pedido_mensajes")
        .insert({
          pedido_id: pedido.id,
          branch_id: pedido.branch_id,
          sender_type: "cliente",
          sender_id: senderId,
          sender_nombre: sender_nombre.trim(),
          mensaje: mensaje.trim(),
        })
        .select("id, created_at")
        .single();

      if (insertErr) {
        console.error("Chat insert error:", insertErr);
        return json(500, { error: "Error al enviar mensaje" });
      }

      return json(200, {
        id: inserted!.id,
        created_at: inserted!.created_at,
      });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    console.error("webapp-pedido-chat error:", err);
    return json(500, { error: "Error interno" });
  }
});
