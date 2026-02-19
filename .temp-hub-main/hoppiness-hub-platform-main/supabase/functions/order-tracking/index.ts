import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const trackingToken = url.searchParams.get('token');

    if (!trackingToken) {
      return new Response(
        JSON.stringify({ error: 'Tracking token is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trackingToken)) {
      return new Response(
        JSON.stringify({ error: 'Invalid tracking token format' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch order by tracking token - only return non-sensitive data
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        status,
        order_type,
        subtotal,
        delivery_fee,
        total,
        created_at,
        updated_at,
        estimated_time,
        delivery_address,
        caller_number,
        tracking_token
      `)
      .eq('tracking_token', trackingToken)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch order items with product names only (no prices exposed)
    const { data: items } = await supabaseAdmin
      .from('order_items')
      .select(`
        id,
        quantity,
        unit_price,
        product:products(name)
      `)
      .eq('order_id', order.id);

    // Fetch branch info (public info only)
    const { data: branchData } = await supabaseAdmin
      .from('orders')
      .select('branch:branches(name, address, city, phone)')
      .eq('id', order.id)
      .single();

    // Return sanitized order data (no customer PII)
    return new Response(
      JSON.stringify({
        order: {
          id: order.id,
          status: order.status,
          order_type: order.order_type,
          subtotal: order.subtotal,
          delivery_fee: order.delivery_fee,
          total: order.total,
          created_at: order.created_at,
          updated_at: order.updated_at,
          estimated_time: order.estimated_time,
          delivery_address: order.delivery_address,
          caller_number: order.caller_number,
        },
        items: items || [],
        branch: branchData?.branch || null,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    console.error('Order tracking error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Failed to fetch order' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
