import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceRequest {
  orderId: string;
  branchId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { orderId, branchId } = (await req.json()) as InvoiceRequest;

    if (!orderId || !branchId) {
      return new Response(
        JSON.stringify({ error: "orderId and branchId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order with items and their modifiers
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items(
          id,
          quantity,
          unit_price,
          notes,
          products(name),
          order_item_modifiers(
            option_name,
            price_adjustment
          )
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch branch
    const { data: branch } = await supabase
      .from("branches")
      .select("name, address, phone")
      .eq("id", branchId)
      .single();

    // Generate HTML receipt
    const receiptHtml = generateReceiptHtml(order, branch);

    // Store in dedicated invoices bucket
    const fileName = `invoice_${orderId}_${Date.now()}.html`;
    const filePath = `${branchId}/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(filePath, new Blob([receiptHtml], { type: "text/html" }), {
        contentType: "text/html",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to save invoice" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("invoices")
      .getPublicUrl(filePath);

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: urlData.publicUrl,
        path: filePath 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateReceiptHtml(order: any, branch: any): string {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(amount);
  
  const formatDate = (date: string) => 
    new Date(date).toLocaleString("es-AR", { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric", 
      hour: "2-digit", 
      minute: "2-digit" 
    });

  const items = order.order_items || [];
  
  const itemsHtml = items.map((item: any) => {
    const modifiers = item.order_item_modifiers || [];
    const modifiersHtml = modifiers.length > 0 
      ? `<div style="font-size: 10px; color: #666; padding-left: 12px;">
          ${modifiers.map((m: any) => `+ ${m.option_name}${m.price_adjustment > 0 ? ` (${formatCurrency(m.price_adjustment)})` : ''}`).join('<br/>')}
        </div>`
      : '';
    
    // Calculate item total including modifiers
    const modifiersTotal = modifiers.reduce((sum: number, m: any) => sum + (m.price_adjustment || 0), 0);
    const itemTotal = (item.unit_price + modifiersTotal) * item.quantity;
    
    return `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee; vertical-align: top;">
        ${item.quantity}x ${item.products?.name || "Producto"}
        ${modifiersHtml}
        ${item.notes ? `<div style="font-size: 10px; color: #888; font-style: italic;">📝 ${item.notes}</div>` : ''}
      </td>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; vertical-align: top;">${formatCurrency(itemTotal)}</td>
    </tr>
  `;
  }).join("");

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comprobante - ${order.id.slice(-6).toUpperCase()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Courier New', monospace; 
      max-width: 300px; 
      margin: 0 auto; 
      padding: 20px;
      background: white;
    }
    .header { text-align: center; margin-bottom: 20px; }
    .header h1 { font-size: 18px; margin-bottom: 5px; }
    .header p { font-size: 12px; color: #666; }
    .divider { border-top: 1px dashed #333; margin: 15px 0; }
    .info { font-size: 12px; margin-bottom: 10px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
    .items { width: 100%; font-size: 12px; }
    .items th { text-align: left; padding-bottom: 10px; border-bottom: 2px solid #333; }
    .totals { margin-top: 15px; }
    .total-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 5px; }
    .total-row.final { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; }
    .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #666; }
    @media print {
      body { max-width: 80mm; padding: 5mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🍔 HOPPINESS CLUB</h1>
    <p>${branch?.name || "Sucursal"}</p>
    <p>${branch?.address || ""}</p>
    ${branch?.phone ? `<p>Tel: ${branch.phone}</p>` : ""}
  </div>

  <div class="divider"></div>

  <div class="info">
    <div class="info-row">
      <span>Fecha:</span>
      <span>${formatDate(order.created_at)}</span>
    </div>
    <div class="info-row">
      <span>Orden:</span>
      <span>#${order.caller_number || order.id.slice(-6).toUpperCase()}</span>
    </div>
    <div class="info-row">
      <span>Cliente:</span>
      <span>${order.customer_name}</span>
    </div>
    ${order.customer_phone ? `
    <div class="info-row">
      <span>Teléfono:</span>
      <span>${order.customer_phone}</span>
    </div>
    ` : ""}
    ${order.invoice_type === "factura_a" && order.customer_cuit ? `
    <div class="info-row">
      <span>CUIT:</span>
      <span>${order.customer_cuit}</span>
    </div>
    <div class="info-row">
      <span>Razón Social:</span>
      <span>${order.customer_business_name || "-"}</span>
    </div>
    ` : ""}
    ${order.delivery_address ? `
    <div class="info-row">
      <span>Dirección:</span>
      <span style="max-width: 150px; text-align: right;">${order.delivery_address}</span>
    </div>
    ` : ""}
  </div>

  <div class="divider"></div>

  <table class="items">
    <thead>
      <tr>
        <th>Descripción</th>
        <th style="text-align: right;">Importe</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="divider"></div>

  <div class="totals">
    <div class="total-row">
      <span>Subtotal:</span>
      <span>${formatCurrency(order.subtotal)}</span>
    </div>
    ${order.delivery_fee ? `
    <div class="total-row">
      <span>Envío:</span>
      <span>${formatCurrency(order.delivery_fee)}</span>
    </div>
    ` : ""}
    ${order.tax ? `
    <div class="total-row">
      <span>IVA:</span>
      <span>${formatCurrency(order.tax)}</span>
    </div>
    ` : ""}
    <div class="total-row final">
      <span>TOTAL:</span>
      <span>${formatCurrency(order.total)}</span>
    </div>
  </div>

  <div class="footer">
    <p>¡Gracias por tu compra!</p>
    <p>www.hoppinessclub.com</p>
    <p style="margin-top: 10px;">Documento no válido como factura</p>
  </div>
</body>
</html>
  `;
}
