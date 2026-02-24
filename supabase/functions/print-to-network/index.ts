/**
 * print-to-network - Edge Function para impresión TCP a impresoras de red
 * 
 * Recibe IP, puerto y datos ESC/POS en base64.
 * Abre conexión TCP directa y envía los bytes.
 * 
 * NOTA: Las impresoras deben ser accesibles desde internet,
 * o usar un relay local para redes privadas.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { printer_ip, printer_port = 9100, data_base64 } = body;

    if (!printer_ip || !data_base64) {
      return new Response(
        JSON.stringify({ error: 'Missing printer_ip or data_base64' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SSRF protection: reject private/reserved IP ranges
    const ipParts = printer_ip.split('.').map(Number);
    const isPrivateIp =
      printer_ip === 'localhost' ||
      printer_ip === '127.0.0.1' ||
      printer_ip.startsWith('0.') ||
      (ipParts[0] === 10) ||
      (ipParts[0] === 172 && ipParts[1] >= 16 && ipParts[1] <= 31) ||
      (ipParts[0] === 192 && ipParts[1] === 168) ||
      (ipParts[0] === 169 && ipParts[1] === 254);

    if (isPrivateIp) {
      // Verify printer is registered in DB for this user's branches
      const { data: registeredPrinter } = await supabase
        .from('branch_printers')
        .select('id')
        .eq('ip_address', printer_ip)
        .limit(1)
        .maybeSingle();

      if (!registeredPrinter) {
        return new Response(
          JSON.stringify({ error: 'Printer IP not registered. Add it in Configuration > Printers.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Decode base64 to bytes
    const binaryStr = atob(data_base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Open TCP connection to printer
    let conn: Deno.TcpConn | null = null;
    try {
      conn = await Deno.connect({
        hostname: printer_ip,
        port: printer_port,
        transport: 'tcp',
      });

      await conn.write(bytes);

      return new Response(
        JSON.stringify({ success: true, bytes_sent: bytes.length }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (tcpError) {
      const message = tcpError instanceof Error ? tcpError.message : 'TCP connection failed';
      return new Response(
        JSON.stringify({ error: `Print failed: ${message}`, printer_ip, printer_port }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } finally {
      try { conn?.close(); } catch { /* ignore close errors */ }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
