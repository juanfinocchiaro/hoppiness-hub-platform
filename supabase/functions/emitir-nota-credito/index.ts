import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticateWSAA, requestCAEWithAssoc, getLastVoucher } from "../_shared/wsaa.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmitirNotaCreditoRequest {
  factura_id: string;
  branch_id?: string;
}

/**
 * Maps original invoice type to credit note type (ARCA)
 * Factura A (1) → NC A (3)
 * Factura B (6) → NC B (8)
 * Factura C (11) → NC C (13)
 */
const NC_TYPE_MAP: Record<string, { cbteTipo: number; tipoNC: string }> = {
  A: { cbteTipo: 3, tipoNC: "NC_A" },
  B: { cbteTipo: 8, tipoNC: "NC_B" },
  C: { cbteTipo: 13, tipoNC: "NC_C" },
};

const ORIGINAL_CBTE_TIPO: Record<string, number> = { A: 1, B: 6, C: 11 };

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

    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const body: EmitirNotaCreditoRequest = await req.json();
    const { factura_id } = body;

    if (!factura_id) {
      return new Response(
        JSON.stringify({ error: "factura_id es obligatorio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Read original invoice
    const { data: original, error: origError } = await supabase
      .from("facturas_emitidas")
      .select("*")
      .eq("id", factura_id)
      .single();

    if (origError || !original) {
      return new Response(
        JSON.stringify({ error: "Factura no encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (original.anulada) {
      return new Response(
        JSON.stringify({ error: "Esta factura ya fue anulada" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const branchId = original.branch_id;
    const tipoOriginal = original.tipo_comprobante; // "A", "B", "C"
    const ncInfo = NC_TYPE_MAP[tipoOriginal];

    if (!ncInfo) {
      return new Response(
        JSON.stringify({ error: `Tipo de comprobante no soportado: ${tipoOriginal}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!original.fecha_emision || !original.punto_venta || !original.numero_comprobante) {
      return new Response(
        JSON.stringify({ error: "La factura original tiene datos incompletos (fecha, punto de venta o número)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Read ARCA config
    const { data: config, error: configError } = await supabase
      .from("afip_config")
      .select("*")
      .eq("branch_id", branchId)
      .single();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: "No hay configuración ARCA para esta sucursal" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!config.certificado_crt || !config.clave_privada_enc || !config.punto_venta || !config.cuit) {
      return new Response(
        JSON.stringify({ error: "Configuración ARCA incompleta. Falta certificado, CUIT o punto de venta." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Decode private key
    let clavePrivada: string;
    try {
      clavePrivada = atob(config.clave_privada_enc);
    } catch {
      clavePrivada = config.clave_privada_enc;
    }

    // 4. Get next NC number from existing NCs in the DB (NOT from the invoice counter)
    const ncTipoComprobante = ncInfo.tipoNC; // "NC_A", "NC_B", "NC_C"
    const { data: lastNC, error: lastNCError } = await adminSupabase
      .from("facturas_emitidas")
      .select("numero_comprobante")
      .eq("branch_id", branchId)
      .eq("tipo_comprobante", ncTipoComprobante)
      .eq("punto_venta", config.punto_venta)
      .order("numero_comprobante", { ascending: false })
      .limit(1)
      .maybeSingle();

    let nuevoNumero: number = (lastNC?.numero_comprobante ?? 0) + 1;
    if (lastNCError) {
      console.error("Error querying last NC:", lastNCError.message);
    }

    // 5. Build ARCA request with CbtesAsoc
    const esProduccion = !!config.es_produccion;
    const cbteFch = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    const neto = original.neto;
    const iva = original.iva;
    const total = original.total;

    // Condition IVA from original
    const condicionIvaMap: Record<string, number> = {
      "IVA Responsable Inscripto": 1,
      "Responsable Monotributo": 6,
      "Monotributista Social": 13,
      "IVA Sujeto Exento": 4,
      "Consumidor Final": 5,
    };
    let condicionIvaId = 5;
    if (tipoOriginal === "A") {
      condicionIvaId = condicionIvaMap[original.receptor_condicion_iva || ""] || 1;
    } else if (tipoOriginal === "B") {
      condicionIvaId = condicionIvaMap[original.receptor_condicion_iva || ""] || 5;
    }

    const afipRequest = {
      CbteTipo: ncInfo.cbteTipo,
      PtoVta: config.punto_venta,
      Concepto: 1,
      DocTipo: original.receptor_cuit ? 80 : 99,
      DocNro: original.receptor_cuit ? parseInt(original.receptor_cuit.replace(/-/g, "")) : 0,
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
      // Associated voucher data
      CbtesAsoc: [{
        Tipo: ORIGINAL_CBTE_TIPO[tipoOriginal] || 11,
        PtoVta: original.punto_venta,
        Nro: original.numero_comprobante,
        Cuit: config.cuit?.replace(/-/g, "") || "",
        CbteFch: original.fecha_emision.replace(/-/g, ""),
      }],
      Iva: [{ Id: 5, BaseImp: neto, Importe: iva }],
    };

    let cae: string;
    let caeVencimiento: string;
    let afipResponse: Record<string, unknown>;

    if (!esProduccion) {
      // Simulation mode
      cae = `${Date.now()}`.slice(0, 14);
      caeVencimiento = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      afipResponse = {
        simulado: true,
        CAE: cae,
        CAEFchVto: caeVencimiento,
        CbteDesde: nuevoNumero,
        Resultado: "A",
      };
    } else {
      // Production mode
      try {
        const credentials = await authenticateWSAA(
          config.certificado_crt,
          clavePrivada,
          "wsfe",
          esProduccion
        );

        // Sync with ARCA's last authorized NC number
        const lastAuthorized = await getLastVoucher(
          credentials, config.cuit, config.punto_venta, ncInfo.cbteTipo, esProduccion
        );
        const cbteNumero = lastAuthorized + 1;
        console.log(`ARCA último NC autorizado tipo ${ncInfo.cbteTipo}: ${lastAuthorized}, usando: ${cbteNumero} (DB tenía: ${nuevoNumero})`);

        if (cbteNumero !== nuevoNumero) {
          console.log(`NC number adjusted: DB had ${nuevoNumero}, ARCA says next is ${cbteNumero}`);
        }

        // Update request with correct number
        afipRequest.CbteDesde = cbteNumero;
        afipRequest.CbteHasta = cbteNumero;

        const result = await requestCAEWithAssoc(
          credentials,
          config.cuit,
          {
            puntoVenta: config.punto_venta,
            cbteTipo: ncInfo.cbteTipo,
            concepto: 1,
            docTipo: original.receptor_cuit ? 80 : 99,
            docNro: original.receptor_cuit ? parseInt(original.receptor_cuit.replace(/-/g, "")) : 0,
            cbteDesde: cbteNumero,
            cbteHasta: cbteNumero,
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
            iva: neto > 0
              ? [{ id: 5, baseImp: Number(neto), importe: Number(iva) }]
              : undefined,
            cbtesAsoc: [{
              tipo: ORIGINAL_CBTE_TIPO[tipoOriginal] || 11,
              ptoVta: original.punto_venta,
              nro: original.numero_comprobante,
              cuit: config.cuit?.replace(/-/g, "") || "",
              cbteFch: original.fecha_emision.replace(/-/g, ""),
            }],
          },
          esProduccion
        );

        cae = result.cae;
        caeVencimiento = result.caeVto;
        afipResponse = {
          CAE: result.cae,
          CAEFchVto: result.caeVto,
          CbteDesde: result.cbteDesde,
          Resultado: result.resultado,
          Observaciones: result.observaciones,
        };

        nuevoNumero = cbteNumero;
        console.log(`NC emitida: CAE=${cae}, Vto=${caeVencimiento}, Nro=${cbteNumero}`);
      } catch (arcaError) {
        const errorMsg = arcaError instanceof Error ? arcaError.message : String(arcaError);
        console.error("Error ARCA al emitir NC:", errorMsg);

        await adminSupabase.from("afip_errores_log").insert({
          branch_id: branchId,
          tipo_error: "emision_nota_credito",
          mensaje: errorMsg.substring(0, 500),
          request_data: afipRequest,
        });

        return new Response(
          JSON.stringify({ error: `Error al emitir NC con ARCA: ${errorMsg}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 6. Save credit note (admin client bypasses RLS)
    const { data: notaCredito, error: insertError } = await adminSupabase
      .from("facturas_emitidas")
      .insert({
        branch_id: branchId,
        pedido_id: original.pedido_id,
        tipo_comprobante: ncInfo.tipoNC,
        punto_venta: config.punto_venta,
        numero_comprobante: nuevoNumero,
        fecha_emision: `${cbteFch.slice(0, 4)}-${cbteFch.slice(4, 6)}-${cbteFch.slice(6, 8)}`,
        cae,
        cae_vencimiento: caeVencimiento,
        receptor_cuit: original.receptor_cuit,
        receptor_razon_social: original.receptor_razon_social,
        receptor_condicion_iva: original.receptor_condicion_iva,
        neto,
        iva,
        total,
        afip_request: afipRequest,
        afip_response: afipResponse,
        emitido_por: userId,
        factura_asociada_id: factura_id,
      })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: "Error al guardar NC", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Mark original invoice as cancelled (admin client bypasses RLS)
    const { error: cancelError } = await adminSupabase
      .from("facturas_emitidas")
      .update({ anulada: true })
      .eq("id", factura_id);

    if (cancelError) {
      console.error("Failed to mark original invoice as cancelled:", cancelError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        nota_credito_id: notaCredito.id,
        tipo: ncInfo.tipoNC,
        punto_venta: config.punto_venta,
        numero: nuevoNumero,
        cae,
        cae_vencimiento: caeVencimiento,
        total,
        factura_original_id: factura_id,
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
