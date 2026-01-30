import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  role: string;
  branch_id: string;
  full_name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const userToken = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { email, role, branch_id, full_name }: InvitationRequest = await req.json();

    if (!email || !role || !branch_id) {
      throw new Error("Missing required fields: email, role, branch_id");
    }

    // Check permissions using V2 functions
    const { data: isSuperadmin } = await supabase.rpc('is_superadmin', {
      _user_id: user.id
    });

    const { data: isHrRole } = await supabase.rpc('is_hr_role', {
      _user_id: user.id,
      _branch_id: branch_id
    });

    if (!isSuperadmin && !isHrRole) {
      throw new Error("No tienes permiso para invitar colaboradores a esta sucursal");
    }

    // Get branch info
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('name')
      .eq('id', branch_id)
      .single();

    if (branchError || !branch) {
      throw new Error("Sucursal no encontrada");
    }

    // Get inviter name
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    // Check for existing pending invitation in staff_invitations
    const { data: existingInvitation } = await supabase
      .from('staff_invitations')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .eq('branch_id', branch_id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existingInvitation) {
      throw new Error("Ya existe una invitación pendiente para este email");
    }

    // Generate unique token
    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Create invitation in staff_invitations table
    const { data: invitation, error: inviteError } = await supabase
      .from('staff_invitations')
      .insert({
        email: email.toLowerCase().trim(),
        full_name: full_name || null,
        role,
        branch_id,
        invited_by: user.id,
        token: inviteToken,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
      throw new Error("Error al crear la invitación");
    }

    const appUrl = Deno.env.get("APP_URL") || "https://hoppiness-hub-platform.lovable.app";
    const registrationUrl = `${appUrl}/registro-staff?token=${inviteToken}`;

    const roleLabels: Record<string, string> = {
      'encargado': 'Encargado',
      'cajero': 'Cajero',
      'empleado': 'Empleado',
      'franquiciado': 'Franquiciado',
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #f97316; margin: 0; font-size: 28px;">🍔 Hoppiness Club</h1>
            </div>
            
            <h2 style="color: #18181b; margin: 0 0 20px;">¡Te invitaron al equipo!</h2>
            
            <p style="color: #52525b; font-size: 16px; line-height: 1.6;">
              <strong>${inviterProfile?.full_name || 'Un administrador'}</strong> te ha invitado a unirte al equipo de 
              <strong>${branch.name}</strong> como <strong>${roleLabels[role] || role}</strong>.
            </p>
            
            <p style="color: #52525b; font-size: 16px; line-height: 1.6;">
              Hacé clic en el siguiente botón para completar tu registro:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${registrationUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Completar Registro
              </a>
            </div>
            
            <p style="color: #71717a; font-size: 14px; line-height: 1.6;">
              Esta invitación expira en 7 días. Si no solicitaste esto, podés ignorar este email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 30px 0;">
            
            <p style="color: #a1a1aa; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} Hoppiness Club. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "Hoppiness Club <no-reply@hoppiness.club>",
        to: [email],
        subject: `¡Te invitaron a unirte al equipo de ${branch.name}!`,
        html: htmlContent,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Email sent:", emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Invitación enviada a ${email}`,
        invitation_id: invitation.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-staff-invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === "Unauthorized" ? 401 : 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
