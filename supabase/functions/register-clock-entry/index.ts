import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ClockEntryRequest {
  branch_code: string
  pin: string
  entry_type: 'clock_in' | 'clock_out'
  user_agent?: string
  gps_lat?: number
  gps_lng?: number
  gps_status?: string
  gps_message?: string
}

interface ValidatedUser {
  user_id: string
  full_name: string
  branch_id: string
  branch_name: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Create admin client that bypasses RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const body: ClockEntryRequest = await req.json()
    const { branch_code, pin, entry_type, user_agent, gps_lat, gps_lng, gps_status, gps_message } = body

    // Validate required fields
    if (!branch_code || !pin || !entry_type) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos: branch_code, pin, entry_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['clock_in', 'clock_out'].includes(entry_type)) {
      return new Response(
        JSON.stringify({ error: 'entry_type debe ser clock_in o clock_out' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate PIN using existing RPC function
    const { data: validatedUsers, error: pinError } = await supabaseAdmin
      .rpc('validate_clock_pin_v2', {
        _branch_code: branch_code,
        _pin: pin
      })

    if (pinError) {
      console.error('PIN validation error:', pinError)
      return new Response(
        JSON.stringify({ error: 'Error al validar PIN' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!validatedUsers || validatedUsers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'PIN incorrecto. Verificá que hayas configurado tu PIN para esta sucursal.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const user: ValidatedUser = validatedUsers[0]

    // Check regulation status (optional - we'll just log a warning, not block here since the frontend handles this)
    // The frontend already checks this before calling this endpoint

    // Insert clock entry using admin client (bypasses RLS)
    const { data: clockEntry, error: insertError } = await supabaseAdmin
      .from('clock_entries')
      .insert({
        branch_id: user.branch_id,
        user_id: user.user_id,
        entry_type: entry_type,
        user_agent: user_agent || null,
        latitude: gps_lat || null,
        longitude: gps_lng || null,
        gps_status: gps_status || null,
        gps_message: gps_message || null,
        photo_url: null // Selfie not stored as per requirement
      })
      .select('id, created_at')
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return new Response(
        JSON.stringify({ error: `Error al registrar fichaje: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Return success with user info
    return new Response(
      JSON.stringify({
        success: true,
        user_id: user.user_id,
        full_name: user.full_name,
        branch_id: user.branch_id,
        branch_name: user.branch_name,
        entry_type: entry_type,
        timestamp: clockEntry.created_at,
        clock_entry_id: clockEntry.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
