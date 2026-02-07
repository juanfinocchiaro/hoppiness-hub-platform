/**
 * send-meeting-minutes-notification - Edge Function para notificar cierre de reunión
 * 
 * Se dispara cuando una reunión cambia a estado 'cerrada'
 * Envía la minuta y acuerdos a todos los participantes
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

interface MeetingMinutesRequest {
  meeting_id: string;
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { meeting_id }: MeetingMinutesRequest = await req.json();

    if (!meeting_id) {
      throw new Error("meeting_id is required");
    }

    // Fetch meeting with branch info
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select(`
        *,
        branches(id, name)
      `)
      .eq("id", meeting_id)
      .single();

    if (meetingError || !meeting) {
      throw new Error(`Meeting not found: ${meetingError?.message}`);
    }

    // Fetch participants with profiles
    const { data: participants, error: participantsError } = await supabase
      .from("meeting_participants")
      .select("user_id, was_present")
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

    // Get emails and names from profiles
    const userIds = participants.map((p) => p.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);

    if (profilesError) {
      throw new Error(`Error fetching profiles: ${profilesError.message}`);
    }

    // Fetch agreements
    const { data: agreements } = await supabase
      .from("meeting_agreements")
      .select(`
        id,
        description,
        sort_order,
        assignees:meeting_agreement_assignees(user_id)
      `)
      .eq("meeting_id", meeting_id)
      .order("sort_order");

    // Get creator name
    const { data: creator } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", meeting.created_by)
      .single();

    const creatorName = creator?.full_name || "El equipo";
    const branchName = meeting.branches?.name || "Hoppiness Club";
    const areaLabel = AREA_LABELS[meeting.area] || meeting.area;
    const meetingDate = formatDate(meeting.scheduled_at || meeting.date);

    // Build profile map for assignee names
    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    // Build attendees list
    const presentParticipants = participants
      .filter((p) => p.was_present)
      .map((p) => profileMap.get(p.user_id)?.full_name || "Participante")
      .join(", ");

    const absentParticipants = participants
      .filter((p) => p.was_present === false)
      .map((p) => profileMap.get(p.user_id)?.full_name || "Participante")
      .join(", ");

    // Build agreements HTML
    let agreementsHtml = "";
    if (agreements && agreements.length > 0) {
      agreementsHtml = agreements
        .map((a, idx) => {
          const assigneeNames = (a.assignees || [])
            .map((as: any) => profileMap.get(as.user_id)?.full_name || "Asignado")
            .join(", ");
          return `
            <div style="padding: 12px; background: #f8f9fa; border-radius: 6px; margin-bottom: 8px;">
              <div style="font-weight: bold; color: #1a1a2e; margin-bottom: 4px;">
                ${idx + 1}. ${a.description}
              </div>
              ${assigneeNames ? `<div style="font-size: 13px; color: #666;">👤 Responsable(s): ${assigneeNames}</div>` : ""}
            </div>
          `;
        })
        .join("");
    } else {
      agreementsHtml = '<p style="color: #666; font-style: italic;">No se registraron acuerdos en esta reunión.</p>';
    }

    const subject = `📋 Minuta: ${meeting.title} - ${meetingDate}`;

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
            <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">
                📋 Minuta de Reunión
              </h1>
            </div>
            
            <div style="padding: 30px;">
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                Hola <strong>${profile.full_name}</strong>,
              </p>
              
              <p style="font-size: 16px; color: #333; margin-bottom: 25px;">
                La reunión <strong>"${meeting.title}"</strong> ha finalizado. 
                A continuación encontrarás el resumen y los acuerdos.
              </p>
              
              <!-- Meeting Info -->
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 15px 0; color: #166534; font-size: 16px;">
                  Información de la Reunión
                </h3>
                <div style="display: grid; gap: 8px; font-size: 14px;">
                  <div><strong>📆 Fecha:</strong> ${meetingDate}</div>
                  <div><strong>📍 Lugar:</strong> ${branchName}</div>
                  <div><strong>🏷️ Área:</strong> ${areaLabel}</div>
                  <div><strong>👤 Convocada por:</strong> ${creatorName}</div>
                </div>
              </div>
              
              <!-- Attendance -->
              <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 15px 0; color: #1a1a2e; font-size: 16px;">
                  Asistencia
                </h3>
                ${presentParticipants ? `<div style="margin-bottom: 8px;"><strong style="color: #166534;">✅ Presentes:</strong> ${presentParticipants}</div>` : ""}
                ${absentParticipants ? `<div><strong style="color: #dc2626;">❌ Ausentes:</strong> ${absentParticipants}</div>` : ""}
              </div>
              
              ${meeting.notes ? `
              <!-- Notes -->
              <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px;">
                  📝 Notas
                </h3>
                <p style="margin: 0; color: #78350f; font-size: 14px; white-space: pre-wrap;">${meeting.notes}</p>
              </div>
              ` : ""}
              
              <!-- Agreements -->
              <div style="margin-bottom: 25px;">
                <h3 style="margin: 0 0 15px 0; color: #1a1a2e; font-size: 16px;">
                  ✅ Acuerdos
                </h3>
                ${agreementsHtml}
              </div>
              
              <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; text-align: center;">
                <p style="margin: 0; color: #1e40af; font-size: 14px;">
                  Por favor confirmá la lectura de esta minuta ingresando a tu cuenta.
                </p>
              </div>
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

    console.log(`Meeting minutes sent: ${successCount}/${results.length} emails`);

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
    console.error("Error in send-meeting-minutes-notification:", error);
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
