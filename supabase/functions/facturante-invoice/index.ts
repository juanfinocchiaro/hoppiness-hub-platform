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
  customerBusinessName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const facturanteApiKey = Deno.env.get("FACTURANTE_API_KEY");
    const facturanteCuit = Deno.env.get("FACTURANTE_CUIT");

    if (!facturanteApiKey || !facturanteCuit) {
      return new Response(
        JSON.stringify({ error: "Facturante API no configurada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { orderId, invoiceType, customerCuit, customerBusinessName }: InvoiceRequest = await req.json();

    // Fetch order with items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*, products(name)),
        branches(name, address, city)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Pedido no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build invoice items
    const items = order.order_items.map((item: any) => ({
      descripcion: item.products?.name || 'Producto',
      cantidad: item.quantity,
      precio_unitario: item.unit_price,
      iva: 21, // 21% IVA standard
    }));

    // Add delivery fee if applicable
    if (order.delivery_fee && order.delivery_fee > 0) {
      items.push({
        descripcion: 'Envío',
        cantidad: 1,
        precio_unitario: order.delivery_fee,
        iva: 21,
      });
    }

    // Add tip if applicable
    if (order.tip_amount && order.tip_amount > 0) {
      items.push({
        descripcion: 'Propina',
        cantidad: 1,
        precio_unitario: order.tip_amount,
        iva: 0, // Tips are not taxable
      });
    }

    // Prepare Facturante request
    const facturantePayload = {
      tipo_comprobante: invoiceType === 'A' ? 1 : invoiceType === 'B' ? 6 : 11,
      punto_venta: 1,
      concepto: 1, // Productos
      documento_tipo: invoiceType === 'A' ? 80 : 96, // CUIT for A, DNI for B/C
      documento_numero: customerCuit || order.customer_cuit || '0',
      razon_social: customerBusinessName || order.customer_business_name || order.customer_name,
      items,
      moneda: 'PES',
      condicion_iva: invoiceType === 'A' ? 1 : 5, // Responsable Inscripto or Consumidor Final
    };

    // Call Facturante API
    const facturanteResponse = await fetch('https://api.facturante.com/v1/comprobantes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${facturanteApiKey}`,
        'Content-Type': 'application/json',
        'X-CUIT': facturanteCuit,
      },
      body: JSON.stringify(facturantePayload),
    });

    if (!facturanteResponse.ok) {
      const errorData = await facturanteResponse.text();
      console.error('Facturante error:', errorData);
      return new Response(
        JSON.stringify({ error: "Error al generar factura", details: errorData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const invoiceData = await facturanteResponse.json();

    // Update order with invoice info
    await supabase
      .from('orders')
      .update({
        invoice_type: invoiceType,
        customer_cuit: customerCuit || order.customer_cuit,
        customer_business_name: customerBusinessName || order.customer_business_name,
      })
      .eq('id', orderId);

    return new Response(
      JSON.stringify({
        success: true,
        invoice: {
          cae: invoiceData.cae,
          caeVencimiento: invoiceData.cae_vencimiento,
          numero: invoiceData.numero,
          tipo: invoiceType,
          pdfUrl: invoiceData.pdf_url,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
