import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticateWSAA, requestCAE } from "../_shared/wsaa.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    // 0. Validar que el pedido no esté ya facturado (protección contra doble facturación)
    if (pedido_id) {
      const { data: existingInvoice } = await supabase
        .from("facturas_emitidas")
        .select("id, cae, tipo_comprobante, numero_comprobante")
        .eq("pedido_id", pedido_id)
        .maybeSingle();

      if (existingInvoice) {
        return new Response(
          JSON.stringify({
            error: "Este pedido ya fue facturado",
            factura_existente: {
              id: existingInvoice.id,
              tipo: existingInvoice.tipo_comprobante,
              numero: existingInvoice.numero_comprobante,
              cae: existingInvoice.cae,
            },
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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

    // 3. Determinar número de comprobante y tipo (atómico para concurrencia)
    const tipoMap: Record<string, number> = { A: 1, B: 6, C: 11 };
    const cbteTipo = tipoMap[tipo_factura] || 11;

    // Usar RPC atómico para obtener el próximo número (evita colisiones entre PCs)
    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: nuevoNumero, error: rpcError } = await adminSupabase.rpc(
      "obtener_proximo_numero_factura",
      { _branch_id: branch_id, _tipo: tipo_factura }
    );

    if (rpcError || nuevoNumero == null) {
      return new Response(
        JSON.stringify({ error: "Error al obtener número de factura", details: rpcError?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Calcular montos según tipo
    const esProduccion = !!config.es_produccion;
    let neto = total;
    let iva = 0;

    if (tipo_factura === "A") {
      neto = Math.round((total / 1.21) * 100) / 100;
      iva = Math.round((total - neto) * 100) / 100;
    }

    // 5. Fecha del comprobante
    const cbteFch = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    // 6. Determinar condición IVA del receptor (obligatorio desde RG 5616)
    const condicionIvaMap: Record<string, number> = {
      "IVA Responsable Inscripto": 1,
      "Responsable Monotributo": 6,
      "Monotributista Social": 13,
      "IVA Sujeto Exento": 4,
      "Consumidor Final": 5,
    };
    let condicionIvaId = 5; // default: Consumidor Final
    if (tipo_factura === "A") {
      condicionIvaId = condicionIvaMap[receptor_condicion_iva || ""] || 1;
    } else if (tipo_factura === "B") {
      condicionIvaId = condicionIvaMap[receptor_condicion_iva || ""] || 5;
    }

    // 7. Armar request ARCA
    const afipRequest = {
      CbteTipo: cbteTipo,
      PtoVta: config.punto_venta,
      Concepto: 1,
      DocTipo: receptor_cuit ? 80 : 99,
      DocNro: receptor_cuit ? parseInt(receptor_cuit.replace(/-/g, "")) : 0,
      CbteDesde: nuevoNumero,
      CbteHasta: nuevoNumero,
      CbteFch: cbteFch,
      ImpTotal: total,
      ImpTotConc: 0,
      ImpNeto: neto,
      ImpOpEx: 0,
      ImpIVA: iva,
      ImpTrib: 0,
      MonId: "PES",
      MonCotiz: 1,
      CondicionIVAReceptorId: condicionIvaId,
      ...(tipo_factura === "A"
        ? { Iva: [{ Id: 5, BaseImp: neto, Importe: iva }] }
        : {}),
    };

    let cae: string;
    let caeVencimiento: string;
    let afipResponse: Record<string, unknown>;

    if (!esProduccion) {
      // === HOMOLOGACIÓN: Simulación ===
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
      // === PRODUCCIÓN: Conexión real con ARCA ===
      console.log("Emitiendo factura en modo PRODUCCIÓN...");

      try {
        // Autenticar contra WSAA
        const credentials = await authenticateWSAA(
          config.certificado_crt,
          clavePrivada,
          "wsfe",
          esProduccion
        );

        // Solicitar CAE
        const result = await requestCAE(
          credentials,
          config.cuit,
          {
            puntoVenta: config.punto_venta,
            cbteTipo,
            concepto: 1,
            docTipo: receptor_cuit ? 80 : 99,
            docNro: receptor_cuit ? parseInt(receptor_cuit.replace(/-/g, "")) : 0,
            cbteDesde: nuevoNumero,
            cbteHasta: nuevoNumero,
            cbteFch,
            impTotal: total,
            impTotConc: 0,
            impNeto: neto,
            impOpEx: 0,
            impIVA: iva,
            impTrib: 0,
            monId: "PES",
            monCotiz: 1,
            condicionIVAReceptorId: condicionIvaId,
            iva: tipo_factura === "A"
              ? [{ id: 5, baseImp: neto, importe: iva }]
              : undefined,
          },
          esProduccion
        );

        cae = result.cae;
        caeVencimiento = result.caeVto;
        afipResponse = {
          CAE: result.cae,
          CAEFchVto: result.caeVto,
          CbteDesde: result.cbteDesde,
          CbteHasta: result.cbteHasta,
          Resultado: result.resultado,
          Observaciones: result.observaciones,
        };

        console.log(`Factura emitida: CAE=${cae}, Vto=${caeVencimiento}`);
      } catch (arcaError) {
        const errorMsg = arcaError instanceof Error ? arcaError.message : String(arcaError);
        console.error("Error ARCA al emitir factura:", errorMsg);

        // Loguear error
        await supabase.from("afip_errores_log").insert({
          branch_id,
          tipo_error: "emision_factura",
          mensaje: errorMsg.substring(0, 500),
          request_data: afipRequest,
        });

        return new Response(
          JSON.stringify({
            error: `Error al emitir factura con ARCA: ${errorMsg}`,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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

    // 8. Número ya actualizado por RPC atómico (obtener_proximo_numero_factura)

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
    console.error("Error interno:", err);
    return new Response(
      JSON.stringify({ error: "Error interno", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
