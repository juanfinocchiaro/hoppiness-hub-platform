/**
 * send-schedule-notification
 * 
 * Edge function to send email notifications when schedules are published or modified.
 * Uses Resend for email delivery.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  user_id: string;
  month: number;
  year: number;
  is_modification: boolean;
  modification_reason?: string;
}

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, month, year, is_modification, modification_reason }: NotificationRequest = await req.json();

    if (!user_id || !month || !year) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's email and name
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user_id)
      .single();

    if (profileError || !profile?.email) {
      console.error("Failed to get user profile:", profileError);
      return new Response(
        JSON.stringify({ error: "User not found or no email" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const monthName = monthNames[month - 1];
    const subject = is_modification
      ? `Tu horario de ${monthName} fue modificado`
      : `Tu horario de ${monthName} ya está disponible`;

    const modificationText = modification_reason
      ? `<p><strong>Motivo del cambio:</strong> ${modification_reason}</p>`
      : '';

    const htmlContent = is_modification
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">📅 Modificación de Horario</h2>
          <p>Hola ${profile.full_name || 'equipo'},</p>
          <p>Tu encargado realizó cambios en tu horario de <strong>${monthName} ${year}</strong>.</p>
          ${modificationText}
          <p>Por favor, revisá tu horario actualizado en la aplicación.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">Este es un mensaje automático de Hoppiness Hub.</p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">📅 Nuevo Horario Publicado</h2>
          <p>Hola ${profile.full_name || 'equipo'},</p>
          <p>Tu encargado publicó tu horario para <strong>${monthName} ${year}</strong>.</p>
          <p>Ingresá a la aplicación para ver los detalles de tus turnos.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">Este es un mensaje automático de Hoppiness Hub.</p>
        </div>
      `;

    // Check if RESEND_API_KEY is configured
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email");
      return new Response(
        JSON.stringify({ success: true, message: "Email skipped - no API key configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Hoppiness Hub <noreply@hoppiness.com.ar>",
        to: [profile.email],
        subject: subject,
        html: htmlContent,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error("Resend API error:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: errorData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailResult = await resendResponse.json();
    console.log("Email sent successfully:", emailResult);

    // Update notification_sent_at in schedule entries
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    await supabase
      .from("employee_schedules")
      .update({ notification_sent_at: new Date().toISOString() })
      .eq("user_id", user_id)
      .gte("schedule_date", startDate)
      .lte("schedule_date", endDate);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-schedule-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
