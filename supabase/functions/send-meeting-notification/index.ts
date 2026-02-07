/**
 * send-meeting-notification - Edge Function para notificar participantes de reuniones
 * 
 * Se dispara cuando:
 * 1. Se convoca una reunión (status = 'convocada')
 * 2. Se envía un recordatorio manual
 * 
 * Envía email a todos los participantes con fecha/hora/lugar
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

interface MeetingNotificationRequest {
  meeting_id: string;
  is_reminder?: boolean;
}

const AREA_LABELS: Record<string, string> = {
  general: 'General',
  operaciones: 'Operaciones',
  rrhh: 'RRHH',
  finanzas: 'Finanzas',
  marketing: 'Marketing',
  capacitacion: 'Capacitación',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
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

    const { meeting_id, is_reminder = false }: MeetingNotificationRequest = await req.json();

    if (!meeting_id) {
      throw new Error("meeting_id is required");
    }

    // Fetch meeting with branch info
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select(`
        *,
        branches(id, name, address)
      `)
      .eq("id", meeting_id)
      .single();

    if (meetingError || !meeting) {
      throw new Error(`Meeting not found: ${meetingError?.message}`);
    }

    // Fetch participants with profiles
    const { data: participants, error: participantsError } = await supabase
      .from("meeting_participants")
      .select("user_id")
      .eq("meeting_id", meeting_id);

    if (participantsError) {
      throw new Error(`Error fetching participants: ${participantsError.message}`);
    }

    if (!participants || participants.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No participants to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get emails from profiles
    const userIds = participants.map((p) => p.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);

    if (profilesError) {
      throw new Error(`Error fetching profiles: ${profilesError.message}`);
    }

    // Get creator name
    const { data: creator } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", meeting.created_by)
      .single();

    const creatorName = creator?.full_name || "El equipo";
    const branchName = meeting.branches?.name || "Hoppiness Club";
    const branchAddress = meeting.branches?.address || "";
    const areaLabel = AREA_LABELS[meeting.area] || meeting.area;
    const meetingDate = formatDate(meeting.scheduled_at || meeting.date);
    const meetingTime = formatTime(meeting.scheduled_at || meeting.date);

    const subject = is_reminder
      ? `📅 Recordatorio: ${meeting.title} - ${meetingDate}`
      : `📅 Nueva reunión: ${meeting.title}`;

    const emailPromises = (profiles || []).map(async (profile) => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">
                ${is_reminder ? "📅 Recordatorio de Reunión" : "📅 Nueva Reunión Convocada"}
              </h1>
            </div>
            
            <div style="padding: 30px;">
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                Hola <strong>${profile.full_name}</strong>,
              </p>
              
              <p style="font-size: 16px; color: #333; margin-bottom: 25px;">
                ${is_reminder 
                  ? `Te recordamos que tenés una reunión programada:`
                  : `<strong>${creatorName}</strong> te convocó a una reunión:`
                }
              </p>
              
              <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                <h2 style="margin: 0 0 15px 0; color: #1a1a2e; font-size: 20px;">
                  ${meeting.title}
                </h2>
                
                <div style="display: grid; gap: 10px;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 18px;">📆</span>
                    <span style="color: #555;"><strong>Fecha:</strong> ${meetingDate}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 18px;">🕐</span>
                    <span style="color: #555;"><strong>Hora:</strong> ${meetingTime}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 18px;">📍</span>
                    <span style="color: #555;"><strong>Lugar:</strong> ${branchName}${branchAddress ? ` - ${branchAddress}` : ''}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 18px;">🏷️</span>
                    <span style="color: #555;"><strong>Área:</strong> ${areaLabel}</span>
                  </div>
                </div>
              </div>
              
              <p style="font-size: 14px; color: #666; text-align: center;">
                Ingresá a tu cuenta para ver más detalles de la reunión.
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

      try {
        await resend.emails.send({
          from: "Hoppiness Hub <notificaciones@hoppiness.club>",
          to: [profile.email],
          subject,
          html,
        });
        return { success: true, email: profile.email };
      } catch (emailError: any) {
        console.error(`Error sending email to ${profile.email}:`, emailError);
        return { success: false, email: profile.email, error: emailError.message };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter((r) => r.success).length;

    // Update notified_at for participants
    await supabase
      .from("meeting_participants")
      .update({ notified_at: new Date().toISOString() })
      .eq("meeting_id", meeting_id);

    console.log(`Meeting notification sent: ${successCount}/${results.length} emails`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: results.length,
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-meeting-notification:", error);
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
