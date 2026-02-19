import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    const { branch_id } = await req.json();
    if (!branch_id) {
      return new Response(
        JSON.stringify({ error: "branch_id requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Leer config
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
      // Actualizar estado
      await supabase
        .from("afip_config")
        .update({
          estado_conexion: "sin_configurar",
          ultimo_error: "Falta certificado o punto de venta",
          ultima_verificacion: new Date().toISOString(),
        })
        .eq("branch_id", branch_id);

      return new Response(
        JSON.stringify({
          success: false,
          estado: "sin_configurar",
          mensaje: "Configuración incompleta. Cargá el certificado y la clave privada.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const esProduccion = !!config.es_produccion;

    if (!esProduccion) {
      // Simulación en homologación: siempre "conectado"
      await supabase
        .from("afip_config")
        .update({
          estado_conexion: "conectado",
          estado_certificado: "conectado",
          ultimo_error: null,
          ultima_verificacion: new Date().toISOString(),
        })
        .eq("branch_id", branch_id);

      return new Response(
        JSON.stringify({
          success: true,
          estado: "conectado",
          modo: "homologacion",
          mensaje: "Conexión simulada OK (modo homologación). Cuando cargues certificados de producción, se verificará contra ARCA.",
          ultimos_numeros: {
            factura_a: config.ultimo_nro_factura_a || 0,
            factura_b: config.ultimo_nro_factura_b || 0,
            factura_c: config.ultimo_nro_factura_c || 0,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TODO: Producción - conectar con SDK ARCA
    // 1. Decodificar clave privada
    // 2. Inicializar SDK con cert + key
    // 3. Llamar a FECompUltimoAutorizado para cada tipo
    // 4. Actualizar últimos números en afip_config

    await supabase
      .from("afip_config")
      .update({
        estado_conexion: "error",
        ultimo_error: "Modo producción aún no implementado",
        ultima_verificacion: new Date().toISOString(),
      })
      .eq("branch_id", branch_id);

    return new Response(
      JSON.stringify({
        success: false,
        estado: "error",
        mensaje: "Modo producción aún no implementado. Se requiere integración con SDK ARCA.",
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
