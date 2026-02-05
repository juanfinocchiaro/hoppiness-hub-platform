import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFICATION_EMAIL = Deno.env.get("CONTACT_NOTIFICATION_EMAIL") || "admin@hoppinessclub.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const subjectLabels: Record<string, string> = {
  franquicia: "Franquicia",
  empleo: "Empleo",
  pedidos: "Pedidos",
  consulta: "Consulta",
  otro: "Otro"
};

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message?: string;
  franchise_has_zone?: string;
  franchise_has_location?: string;
  franchise_investment_capital?: string;
  employment_branch_id?: string;
  employment_position?: string;
  employment_cv_link?: string;
  employment_motivation?: string;
  order_branch_id?: string;
  order_number?: string;
  order_date?: string;
  order_issue?: string;
  attachment_url?: string;
  attachment_name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const message: ContactMessage = await req.json();
    
    const subjectLabel = subjectLabels[message.subject] || message.subject;
    const emailSubject = `[Hoppiness] Nueva consulta de ${subjectLabel}: ${message.name}`;
    
    let detailsHtml = "";
    
    switch (message.subject) {
      case "franquicia":
        detailsHtml = `
          <p><strong>Zona en mente:</strong> ${message.franchise_has_zone || 'No especificado'}</p>
          <p><strong>Local disponible:</strong> ${message.franchise_has_location || 'No especificado'}</p>
          <p><strong>Capital disponible:</strong> ${message.franchise_investment_capital || 'No especificado'}</p>
          ${message.message ? `<p><strong>Comentarios:</strong> ${message.message}</p>` : ''}
        `;
        break;
      case "empleo":
        detailsHtml = `
          <p><strong>Puesto de interés:</strong> ${message.employment_position || 'No especificado'}</p>
          ${message.employment_cv_link ? `<p><strong>CV/LinkedIn:</strong> <a href="${message.employment_cv_link}">${message.employment_cv_link}</a></p>` : ''}
          ${message.attachment_url ? `<p><strong>CV Adjunto:</strong> <a href="${message.attachment_url}">${message.attachment_name || 'Descargar'}</a></p>` : ''}
          ${message.employment_motivation ? `<p><strong>Motivación:</strong> ${message.employment_motivation}</p>` : ''}
        `;
        break;
      case "pedidos":
        detailsHtml = `
          ${message.order_number ? `<p><strong>Número de pedido:</strong> #${message.order_number}</p>` : ''}
          ${message.order_date ? `<p><strong>Fecha del pedido:</strong> ${message.order_date}</p>` : ''}
          <p><strong>Problema:</strong> ${message.order_issue || 'No especificado'}</p>
        `;
        break;
      default:
        detailsHtml = message.message ? `<p><strong>Mensaje:</strong> ${message.message}</p>` : '';
    }

    const adminUrl = `https://hoppiness-hub-platform.lovable.app/mimarca/mensajes`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .cta { text-align: center; margin: 20px 0; }
          .cta a { background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
          .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🍔 Nuevo mensaje de contacto</h1>
            <p>Tipo: ${subjectLabel}</p>
          </div>
          
          <div class="content">
            <div class="details">
              <h2>Datos del contacto</h2>
              <p><strong>Nombre:</strong> ${message.name}</p>
              <p><strong>Email:</strong> <a href="mailto:${message.email}">${message.email}</a></p>
              <p><strong>Teléfono:</strong> <a href="https://wa.me/54${message.phone.replace(/\D/g, '')}">${message.phone}</a></p>
            </div>
            
            <div class="details">
              <h2>Detalles de la consulta</h2>
              ${detailsHtml}
            </div>
            
            <div class="cta">
              <a href="${adminUrl}">Ver mensaje completo en el panel</a>
            </div>
          </div>
          
          <div class="footer">
            <p>Este email fue enviado automáticamente desde el formulario de contacto de Hoppiness Club.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email using Resend API directly
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Hoppiness Club <onboarding@resend.dev>",
        to: [NOTIFICATION_EMAIL],
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    const emailResponse = await res.json();
    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error in contact-notification function:", error);
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
