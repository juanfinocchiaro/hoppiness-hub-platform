import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmitirFacturaRequest {
  branch_id: string;
  pedido_id?: string;
  tipo_factura: "A" | "B" | "C";
  receptor_cuit?: string;
  receptor_razon_social?: string;
  receptor_condicion_iva?: string;
  items: { descripcion: string; cantidad: number; precio_unitario: number }[];
  total: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const body: EmitirFacturaRequest = await req.json();
    const { branch_id, pedido_id, tipo_factura, receptor_cuit, receptor_razon_social, receptor_condicion_iva, items, total } = body;

    if (!branch_id || !tipo_factura || !items?.length || total == null) {
      return new Response(
        JSON.stringify({ error: "Faltan campos obligatorios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Leer config ARCA del local
    const { data: config, error: configError } = await supabase
      .from("afip_config")
      .select("*")
      .eq("branch_id", branch_id)
      .single();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: "No hay configuración ARCA para esta sucursal" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!config.certificado_crt || !config.clave_privada_enc || !config.punto_venta) {
      return new Response(
        JSON.stringify({ error: "Configuración ARCA incompleta. Falta certificado o punto de venta." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Decodificar clave privada (almacenada en base64)
    let clavePrivada: string;
    try {
      clavePrivada = atob(config.clave_privada_enc);
    } catch {
      clavePrivada = config.clave_privada_enc;
    }

    // 3. Determinar número de comprobante
    const tipoMap: Record<string, number> = { A: 1, B: 6, C: 11 };
    const cbteTipo = tipoMap[tipo_factura] || 11;

    const ultimoNroField = `ultimo_nro_factura_${tipo_factura.toLowerCase()}` as
      | "ultimo_nro_factura_a"
      | "ultimo_nro_factura_b"
      | "ultimo_nro_factura_c";
    const nuevoNumero = (config[ultimoNroField] || 0) + 1;

    // 4. Calcular montos según tipo
    const esProduccion = !!config.es_produccion;
    let neto = total;
    let iva = 0;

    if (tipo_factura === "A") {
      neto = Math.round((total / 1.21) * 100) / 100;
      iva = Math.round((total - neto) * 100) / 100;
    }
    // B y C: IVA incluido en total, neto = total, iva informativo = 0

    // 5. Armar request ARCA (estructura WSFEV1)
    const afipRequest = {
      CbteTipo: cbteTipo,
      PtoVta: config.punto_venta,
      Concepto: 1, // Productos
      DocTipo: receptor_cuit ? 80 : 99, // CUIT o Consumidor Final
      DocNro: receptor_cuit ? parseInt(receptor_cuit.replace(/-/g, "")) : 0,
      CbteDesde: nuevoNumero,
      CbteHasta: nuevoNumero,
      CbteFch: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
      ImpTotal: total,
      ImpTotConc: 0,
      ImpNeto: neto,
      ImpOpEx: 0,
      ImpIVA: iva,
      ImpTrib: 0,
      MonId: "PES",
      MonCotiz: 1,
      ...(tipo_factura === "A"
        ? {
            Iva: [{ Id: 5, BaseImp: neto, Importe: iva }], // 21%
          }
        : {}),
    };

    // 6. En homologación simulamos respuesta ARCA
    let afipResponse: Record<string, unknown>;
    let cae: string;
    let caeVencimiento: string;

    if (!esProduccion) {
      // Simulación homologación
      cae = `${Date.now()}`.slice(0, 14);
      caeVencimiento = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      afipResponse = {
        simulado: true,
        CAE: cae,
        CAEFchVto: caeVencimiento,
        CbteDesde: nuevoNumero,
        CbteHasta: nuevoNumero,
        Resultado: "A",
      };
    } else {
      // TODO: Integrar con SDK ARCA cuando haya certificados reales
      // Por ahora devolvemos error si intentan producción
      return new Response(
        JSON.stringify({
          error: "Modo producción aún no implementado. Se requiere integración con SDK ARCA.",
        }),
        { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Guardar factura emitida
    const { data: factura, error: insertError } = await supabase
      .from("facturas_emitidas")
      .insert({
        branch_id,
        pedido_id: pedido_id || null,
        tipo_comprobante: tipo_factura,
        punto_venta: config.punto_venta,
        numero_comprobante: nuevoNumero,
        cae,
        cae_vencimiento: caeVencimiento,
        receptor_cuit,
        receptor_razon_social,
        receptor_condicion_iva,
        neto,
        iva,
        total,
        afip_request: afipRequest,
        afip_response: afipResponse,
        emitido_por: userId,
      })
      .select()
      .single();

    if (insertError) {
      // Loguear error
      await supabase.from("afip_errores_log").insert({
        branch_id,
        tipo_error: "insert_factura",
        mensaje: insertError.message,
        request_data: afipRequest,
        response_data: afipResponse,
      });

      return new Response(
        JSON.stringify({ error: "Error al guardar factura", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. Actualizar último número
    await supabase
      .from("afip_config")
      .update({ [ultimoNroField]: nuevoNumero })
      .eq("branch_id", branch_id);

    // 9. Actualizar pedido con datos fiscales (si aplica)
    if (pedido_id) {
      await supabase
        .from("pedidos")
        .update({
          factura_tipo: tipo_factura,
          factura_numero: `${String(config.punto_venta).padStart(5, "0")}-${String(nuevoNumero).padStart(8, "0")}`,
          factura_cae: cae,
        })
        .eq("id", pedido_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        factura_id: factura.id,
        tipo: tipo_factura,
        punto_venta: config.punto_venta,
        numero: nuevoNumero,
        cae,
        cae_vencimiento: caeVencimiento,
        total,
        simulado: !esProduccion,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Error interno", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
