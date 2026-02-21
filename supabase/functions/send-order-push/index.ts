import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * send-order-push — Sends web push notifications to a customer when their
 * order status changes. Called via database webhook or direct invocation.
 *
 * Expects body: { pedido_id, estado, numero_pedido, cliente_user_id }
 *
 * Requires secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
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

const estadoMessages: Record<string, string> = {
  confirmado: "Tu pedido fue aceptado 🎉",
  en_preparacion: "¡Ya estamos preparando tu pedido! 🔥",
  listo: "Tu pedido está listo ✅",
  en_camino: "Tu pedido está en camino 🚀",
  entregado: "Pedido entregado. ¡Buen provecho! 🍔",
  cancelado: "Tu pedido fue cancelado ❌",
};

async function sendWebPush(
  subscription: { endpoint: string; keys: Record<string, string> },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  // Use web-push compatible approach with Deno
  // For simplicity, we use a direct fetch to the push endpoint
  // with the required VAPID headers
  try {
    // Import web-push compatible VAPID signing
    const { default: webpush } = await import("https://esm.sh/web-push@3.6.7");
    
    webpush.setVapidDetails(
      "mailto:hola@hoppiness.club",
      vapidPublicKey,
      vapidPrivateKey,
    );

    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys as any,
      },
      payload,
    );
    return true;
  } catch (err) {
    console.error("Push send failed:", err);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn("VAPID keys not configured, skipping push notification");
      return json(200, { sent: 0, reason: "vapid_not_configured" });
    }

    const body = await req.json();
    const { cliente_user_id, estado, numero_pedido } = body;

    if (!cliente_user_id || !estado) {
      return json(200, { sent: 0, reason: "missing_fields" });
    }

    const message = estadoMessages[estado];
    if (!message) {
      return json(200, { sent: 0, reason: "no_message_for_estado" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get user's push subscriptions
    const { data: subscriptions, error: subErr } = await supabase
      .from("push_subscriptions")
      .select("endpoint, keys")
      .eq("user_id", cliente_user_id);

    if (subErr || !subscriptions?.length) {
      return json(200, { sent: 0, reason: "no_subscriptions" });
    }

    const payload = JSON.stringify({
      title: `Pedido #${numero_pedido || ''}`,
      body: message,
      icon: "/icons/icon-192x192.png",
      data: { url: "/" },
    });

    let sent = 0;
    const staleEndpoints: string[] = [];

    for (const sub of subscriptions) {
      const success = await sendWebPush(
        sub as any,
        payload,
        vapidPublicKey,
        vapidPrivateKey,
      );
      if (success) {
        sent++;
      } else {
        staleEndpoints.push(sub.endpoint);
      }
    }

    // Clean up stale subscriptions
    if (staleEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", staleEndpoints);
    }

    return json(200, { sent, cleaned: staleEndpoints.length });
  } catch (err: unknown) {
    console.error("send-order-push error:", err);
    return json(500, { error: "Internal error" });
  }
});
