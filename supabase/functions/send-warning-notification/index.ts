/**
 * send-warning-notification - Edge Function para notificar apercibimientos
 * 
 * Se dispara cuando se crea un nuevo apercibimiento (warning)
 * Notifica al empleado por email
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WarningNotificationRequest {
  warning_id: string;
  employee_id: string;
  branch_id: string;
  warning_type: string;
  description: string;
  issued_by_name?: string;
}

const WARNING_TYPE_LABELS: Record<string, string> = {
  verbal: 'Apercibimiento Verbal',
  written: 'Apercibimiento Escrito',
  suspension: 'Suspensión',
  final: 'Apercibimiento Final',
};

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      warning_id,
      employee_id,
      branch_id,
      warning_type,
      description,
      issued_by_name,
    }: WarningNotificationRequest = await req.json();

    if (!warning_id || !employee_id) {
      throw new Error("warning_id and employee_id are required");
    }

    // Get employee profile
    const { data: employee, error: employeeError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", employee_id)
      .single();

    if (employeeError || !employee) {
      throw new Error(`Employee not found: ${employeeError?.message}`);
    }

    // Get branch info
    const { data: branch } = await supabase
      .from("branches")
      .select("name")
      .eq("id", branch_id)
      .single();

    const branchName = branch?.name || "Hoppiness Club";
    const warningTypeLabel = WARNING_TYPE_LABELS[warning_type] || warning_type;
    const issuerName = issued_by_name || "Tu encargado";
    const currentDate = formatDate(new Date());

    const subject = `⚠️ ${warningTypeLabel} - Acción requerida`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">
              ⚠️ Notificación Importante
            </h1>
          </div>
          
          <div style="padding: 30px;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Hola <strong>${employee.full_name}</strong>,
            </p>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 25px;">
              Se ha registrado un apercibimiento en tu legajo en <strong>${branchName}</strong>.
            </p>
            
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
              <div style="margin-bottom: 15px;">
                <span style="font-weight: bold; color: #991b1b;">Tipo:</span>
                <span style="color: #333;">${warningTypeLabel}</span>
              </div>
              <div style="margin-bottom: 15px;">
                <span style="font-weight: bold; color: #991b1b;">Fecha:</span>
                <span style="color: #333;">${currentDate}</span>
              </div>
              <div style="margin-bottom: 15px;">
                <span style="font-weight: bold; color: #991b1b;">Emitido por:</span>
                <span style="color: #333;">${issuerName}</span>
              </div>
              <div>
                <span style="font-weight: bold; color: #991b1b;">Motivo:</span>
                <p style="color: #333; margin: 5px 0 0 0;">${description}</p>
              </div>
            </div>
            
            <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
              <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px;">
                📝 Acción Requerida
              </h3>
              <p style="margin: 0; color: #78350f; font-size: 14px;">
                Deberás firmar el acuse de recibo de este apercibimiento. 
                Tu encargado te presentará el documento para tu firma.
              </p>
            </div>
            
            <p style="font-size: 14px; color: #666; text-align: center;">
              Ingresá a tu cuenta para ver el detalle completo.
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="margin: 0; color: #888; font-size: 12px;">
              Este mensaje fue enviado automáticamente por Hoppiness Hub
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResult = await resend.emails.send({
      from: "Hoppiness Hub <notificaciones@hoppiness.club>",
      to: [employee.email],
      subject,
      html,
    });

    console.log(`Warning notification sent to ${employee.email}:`, emailResult);

    return new Response(
      JSON.stringify({
        success: true,
        email: employee.email,
        result: emailResult,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-warning-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
