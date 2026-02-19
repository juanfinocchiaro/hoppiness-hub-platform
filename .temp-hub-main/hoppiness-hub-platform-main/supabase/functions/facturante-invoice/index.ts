import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceRequest {
  orderId: string;
  invoiceType: 'A' | 'B' | 'C';
  customerCuit?: string;
  customerName?: string;
  customerAddress?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { orderId, invoiceType, customerCuit, customerName, customerAddress }: InvoiceRequest = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "orderId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order with branch info (including Facturante credentials)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        branches:branch_id (
          id, name, address, city, phone, email,
          facturante_api_key, facturante_cuit, facturante_punto_venta, facturante_enabled
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found", details: orderError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const branch = order.branches as any;
    
    // Check if Facturante is configured for this branch
    if (!branch?.facturante_enabled || !branch?.facturante_api_key || !branch?.facturante_cuit) {
      return new Response(
        JSON.stringify({ error: "Facturante no está configurado para esta sucursal. Configuralo en Integraciones." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order items
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select(`
        *,
        products:product_id (name, sku)
      `)
      .eq("order_id", orderId);

    if (itemsError) {
      return new Response(
        JSON.stringify({ error: "Error fetching order items", details: itemsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build invoice items
    const invoiceItems = items.map((item: any) => ({
      descripcion: item.products?.name || "Producto",
      cantidad: item.quantity,
      precio_unitario: item.unit_price,
      iva: 21, // 21% IVA standard
    }));

    // Add delivery fee if exists
    if (order.delivery_fee && order.delivery_fee > 0) {
      invoiceItems.push({
        descripcion: "Envío",
        cantidad: 1,
        precio_unitario: order.delivery_fee,
        iva: 21,
      });
    }

    // Add tip if exists
    if (order.tip_amount && order.tip_amount > 0) {
      invoiceItems.push({
        descripcion: "Propina",
        cantidad: 1,
        precio_unitario: order.tip_amount,
        iva: 0, // Tips are not taxable
      });
    }

    // Build Facturante payload
    const facturantePayload: any = {
      tipo_comprobante: invoiceType === 'A' ? 1 : invoiceType === 'B' ? 6 : 11,
      punto_venta: branch.facturante_punto_venta || 1,
      concepto: 1, // Productos
      items: invoiceItems,
      moneda: 'PES',
    };

    // Add customer data based on invoice type
    if (invoiceType === 'A' && customerCuit) {
      facturantePayload.documento_tipo = 80; // CUIT
      facturantePayload.documento_numero = customerCuit.replace(/-/g, '');
      facturantePayload.razon_social = customerName || order.customer_name;
      facturantePayload.domicilio = customerAddress || "";
      facturantePayload.condicion_iva = 1; // Responsable Inscripto
    } else if (invoiceType === 'B') {
      facturantePayload.documento_tipo = customerCuit ? 80 : 96; // CUIT or DNI
      facturantePayload.documento_numero = customerCuit?.replace(/-/g, '') || order.customer_phone || "0";
      facturantePayload.razon_social = customerName || order.customer_name;
      facturantePayload.domicilio = customerAddress || "";
      facturantePayload.condicion_iva = customerCuit ? 1 : 5; // RI or CF
    } else {
      // Factura C - Consumidor Final
      facturantePayload.documento_tipo = 99; // Sin identificar
      facturantePayload.documento_numero = "0";
      facturantePayload.razon_social = customerName || order.customer_name || "Consumidor Final";
      facturantePayload.domicilio = customerAddress || "";
      facturantePayload.condicion_iva = 5; // Consumidor Final
    }

    // Call Facturante API with branch credentials
    const facturanteResponse = await fetch("https://api.facturante.com/v1/comprobantes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${branch.facturante_api_key}`,
        "X-CUIT": branch.facturante_cuit.replace(/-/g, ''),
      },
      body: JSON.stringify(facturantePayload),
    });

    if (!facturanteResponse.ok) {
      const errorData = await facturanteResponse.text();
      console.error("Facturante error:", errorData);
      return new Response(
        JSON.stringify({ 
          error: "Error al generar factura en Facturante", 
          details: errorData 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const facturanteData = await facturanteResponse.json();

    // Update order with invoice info
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        invoice_type: invoiceType === 'A' ? 'factura_a' : invoiceType === 'B' ? 'factura_b' : 'factura_c',
        invoice_number: facturanteData.numero?.toString(),
        invoice_cae: facturanteData.cae,
        invoice_cae_expiry: facturanteData.cae_vencimiento,
        invoiced_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Error updating order:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoice: {
          numero: facturanteData.numero,
          cae: facturanteData.cae,
          caeVencimiento: facturanteData.cae_vencimiento,
          tipo: invoiceType,
          pdfUrl: facturanteData.pdf_url,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
