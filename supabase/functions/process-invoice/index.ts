import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXTRACTION_PROMPT = `Eres un experto en extracción de datos de comprobantes fiscales argentinos. 
Analiza la imagen del comprobante y extrae TODA la información disponible.

Responde ÚNICAMENTE con un JSON válido con la siguiente estructura exacta:

{
  "document_type": "factura_a" | "factura_b" | "factura_c" | "ticket" | "remito" | "recibo" | "otro",
  "supplier": {
    "name": "string o null",
    "cuit": "string formato XX-XXXXXXXX-X o null",
    "address": "string o null",
    "iva_condition": "Responsable Inscripto" | "Monotributo" | "Exento" | "Consumidor Final" | null
  },
  "invoice": {
    "type": "A" | "B" | "C" | "X" | "Ticket" | "Remito" | null,
    "number": "string con formato completo ej: 0001-00012345 o null",
    "date": "YYYY-MM-DD o null",
    "due_date": "YYYY-MM-DD o null"
  },
  "payment": {
    "method": "efectivo" | "transferencia" | "tarjeta" | "cheque" | "cuenta_corriente" | null,
    "condition": "Contado" | "Cuenta Corriente" | "30 días" | "60 días" | null
  },
  "amounts": {
    "subtotal": number o null,
    "iva_amount": number o null,
    "other_taxes": number o null,
    "total": number (REQUERIDO),
    "currency": "ARS" | "USD"
  },
  "items": [
    {
      "description": "string (REQUERIDO)",
      "quantity": number o null,
      "unit": "kg" | "u" | "l" | "pack" | null,
      "unit_price": number o null,
      "discount_percent": number o null,
      "subtotal": number o null,
      "iva_rate": 21 | 10.5 | 0 | null
    }
  ],
  "notes": "cualquier información adicional relevante o null",
  "confidence": 0.0 a 1.0
}

REGLAS:
- Si no puedes leer un campo, usa null
- Los montos deben ser números decimales (ej: 1500.50)
- Las fechas deben estar en formato YYYY-MM-DD
- El campo "total" es OBLIGATORIO, estimalo si es necesario
- Incluye TODOS los items/líneas del comprobante que puedas identificar
- El campo "confidence" indica qué tan seguro estás de la extracción (0.0 a 1.0)`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { document_id, file_path } = await req.json();

    if (!document_id || !file_path) {
      return new Response(
        JSON.stringify({ success: false, error: 'document_id and file_path are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate a signed URL that the AI can access
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('scanned-documents')
      .createSignedUrl(file_path, 600); // 10 minutes expiry

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('Error generating signed URL:', signedUrlError);
      throw new Error('Failed to generate signed URL for image');
    }

    const imageUrl = signedUrlData.signedUrl;
    console.log('Generated signed URL for file:', file_path);

    // Update status to processing
    await supabase
      .from('scanned_documents')
      .update({ status: 'processing' })
      .eq('id', document_id);

    console.log('Processing document:', document_id);

    // Call Lovable AI with vision capabilities
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro', // Best for vision + complex extraction
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: EXTRACTION_PROMPT },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.1, // Low temperature for consistent extraction
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        await supabase
          .from('scanned_documents')
          .update({ status: 'error', error_message: 'Rate limit exceeded. Please try again later.' })
          .eq('id', document_id);
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('AI Response:', content);

    // Parse JSON from response (handle markdown code blocks)
    let extractedData;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonString = jsonMatch[1]?.trim() || content.trim();
      extractedData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      await supabase
        .from('scanned_documents')
        .update({ 
          status: 'error', 
          error_message: 'Failed to parse extraction results' 
        })
        .eq('id', document_id);
      throw new Error('Failed to parse extraction results');
    }

    // Insert extracted invoice data
    const { data: invoice, error: invoiceError } = await supabase
      .from('extracted_invoices')
      .insert({
        document_id,
        supplier_name: extractedData.supplier?.name,
        supplier_cuit: extractedData.supplier?.cuit,
        supplier_address: extractedData.supplier?.address,
        supplier_iva_condition: extractedData.supplier?.iva_condition,
        invoice_type: extractedData.invoice?.type,
        invoice_number: extractedData.invoice?.number,
        invoice_date: extractedData.invoice?.date,
        due_date: extractedData.invoice?.due_date,
        payment_method: extractedData.payment?.method,
        payment_condition: extractedData.payment?.condition,
        subtotal: extractedData.amounts?.subtotal,
        iva_amount: extractedData.amounts?.iva_amount,
        other_taxes: extractedData.amounts?.other_taxes,
        total: extractedData.amounts?.total,
        currency: extractedData.amounts?.currency || 'ARS',
        notes: extractedData.notes,
        raw_extracted_data: extractedData,
        confidence_score: extractedData.confidence,
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('Error inserting invoice:', invoiceError);
      throw invoiceError;
    }

    // Insert line items
    if (extractedData.items && extractedData.items.length > 0) {
      const itemsToInsert = extractedData.items.map((item: any, index: number) => ({
        invoice_id: invoice.id,
        description: item.description || 'Item sin descripción',
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent,
        subtotal: item.subtotal,
        iva_rate: item.iva_rate,
        display_order: index,
      }));

      const { error: itemsError } = await supabase
        .from('extracted_invoice_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error inserting items:', itemsError);
      }
    }

    // Update document status to completed
    await supabase
      .from('scanned_documents')
      .update({ 
        status: 'completed',
        document_type: extractedData.document_type,
        processed_at: new Date().toISOString()
      })
      .eq('id', document_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        invoice_id: invoice.id,
        extracted_data: extractedData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing invoice:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
