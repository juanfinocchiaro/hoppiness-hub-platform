import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Secure token generation using crypto
async function generateSecureToken(branchId: string, timestamp: number): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  
  const payload = {
    b: branchId,
    t: timestamp,
    s: saltHex
  };
  
  // Create a signature using HMAC
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const keyData = encoder.encode(secret);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 16); // Take first 16 chars for shorter token
  
  // Create compact token: base64(payload) + signature
  const payloadBase64 = btoa(JSON.stringify(payload));
  return `${payloadBase64}.${signatureHex}`;
}

async function verifyToken(token: string): Promise<{ valid: boolean; branchId?: string; error?: string }> {
  try {
    const [payloadBase64, signature] = token.split('.');
    if (!payloadBase64 || !signature) {
      return { valid: false, error: 'Formato de token inválido' };
    }
    
    const payload = JSON.parse(atob(payloadBase64));
    const { b: branchId, t: timestamp, s: salt } = payload;
    
    // Check timestamp (allow 30 second buffer)
    const now = Date.now();
    const tokenAge = now - timestamp;
    if (tokenAge > 30000) { // 30 seconds
      return { valid: false, error: 'Código vencido, escanea nuevamente' };
    }
    
    if (tokenAge < -5000) { // 5 seconds buffer for clock skew
      return { valid: false, error: 'Token del futuro, verifica la hora del dispositivo' };
    }
    
    // Verify signature
    const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(payload));
    const keyData = encoder.encode(secret);
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const expectedSignature = await crypto.subtle.sign('HMAC', key, data);
    const expectedSignatureHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 16);
    
    if (signature !== expectedSignatureHex) {
      return { valid: false, error: 'Firma inválida' };
    }
    
    return { valid: true, branchId };
  } catch (e) {
    console.error('Token verification error:', e);
    return { valid: false, error: 'Error al verificar token' };
  }
}

// Simple hash function for PIN (in production, use bcrypt or argon2)
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { action, ...params } = await req.json();
    console.log(`Attendance token action: ${action}`, params);

    switch (action) {
      case 'generate': {
        // Generate a new token for a branch
        const { branchId } = params;
        if (!branchId) {
          return new Response(
            JSON.stringify({ error: 'branchId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const timestamp = Date.now();
        const token = await generateSecureToken(branchId, timestamp);
        
        // Store token in database for audit trail
        const expiresAt = new Date(timestamp + 30000); // 30 seconds
        await supabase.from('attendance_tokens').insert({
          branch_id: branchId,
          token: token,
          expires_at: expiresAt.toISOString()
        });

        return new Response(
          JSON.stringify({ 
            token, 
            expiresAt: expiresAt.toISOString(),
            serverTime: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'validate': {
        // Validate a token
        const { token } = params;
        if (!token) {
          return new Response(
            JSON.stringify({ valid: false, error: 'token is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const result = await verifyToken(token);
        
        if (result.valid) {
          // Check if token was already used
          const { data: tokenRecord } = await supabase
            .from('attendance_tokens')
            .select('used_at')
            .eq('token', token)
            .single();
          
          if (tokenRecord?.used_at) {
            return new Response(
              JSON.stringify({ valid: false, error: 'Este código ya fue utilizado' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'clock-in': {
        // Register attendance
        const { token, pin, photoUrl } = params;
        
        // Validate token first
        const tokenResult = await verifyToken(token);
        if (!tokenResult.valid) {
          return new Response(
            JSON.stringify({ success: false, error: tokenResult.error }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Find user by PIN
        const pinHash = await hashPin(pin);
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .eq('pin_hash', pinHash)
          .single();

        if (profileError || !profile) {
          console.log('PIN lookup failed:', profileError);
          return new Response(
            JSON.stringify({ success: false, error: 'PIN incorrecto' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const now = new Date();
        const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || '0.0.0.0';

        // Check if user has an open check-in today
        const today = now.toISOString().split('T')[0];
        const { data: existingRecord } = await supabase
          .from('attendance_records')
          .select('id, check_in, check_out')
          .eq('user_id', profile.user_id)
          .eq('branch_id', tokenResult.branchId)
          .gte('check_in', `${today}T00:00:00`)
          .is('check_out', null)
          .order('check_in', { ascending: false })
          .limit(1)
          .single();

        let action: 'check_in' | 'check_out';
        let recordId: string;

        if (existingRecord) {
          // Check out
          action = 'check_out';
          const { error: updateError } = await supabase
            .from('attendance_records')
            .update({
              check_out: now.toISOString(),
              check_out_ip: clientIp,
              notes: photoUrl ? `Selfie: ${photoUrl}` : null
            })
            .eq('id', existingRecord.id);

          if (updateError) throw updateError;
          recordId = existingRecord.id;
        } else {
          // Check in
          action = 'check_in';
          const { data: newRecord, error: insertError } = await supabase
            .from('attendance_records')
            .insert({
              user_id: profile.user_id,
              branch_id: tokenResult.branchId,
              check_in: now.toISOString(),
              check_in_ip: clientIp,
              notes: photoUrl ? `Selfie: ${photoUrl}` : null
            })
            .select('id')
            .single();

          if (insertError) throw insertError;
          recordId = newRecord.id;
        }

        // Mark token as used
        await supabase
          .from('attendance_tokens')
          .update({ used_at: now.toISOString(), used_by: profile.user_id })
          .eq('token', token);

        return new Response(
          JSON.stringify({
            success: true,
            action,
            userName: profile.full_name,
            time: now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
            recordId
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'set-pin': {
        // Set PIN for a user (called by admin/manager)
        // SECURITY: Must verify caller has permission to manage this user
        const { userId, pin, branchId } = params;
        
        // Validate authorization header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
          return new Response(
            JSON.stringify({ success: false, error: 'No autorizado' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create authenticated client to verify caller permissions
        const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
        const authClient = createClient(supabaseUrl, supabaseAnon, {
          global: { headers: { Authorization: authHeader } }
        });

        // Get the calling user
        const { data: { user: caller }, error: authError } = await authClient.auth.getUser();
        if (authError || !caller) {
          return new Response(
            JSON.stringify({ success: false, error: 'Sesión inválida' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if caller is admin or has can_manage_staff permission for the branch
        const { data: callerRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', caller.id);
        
        const isAdmin = callerRoles?.some(r => r.role === 'admin');
        
        if (!isAdmin) {
          // Check branch permission
          if (!branchId) {
            return new Response(
              JSON.stringify({ success: false, error: 'branchId requerido para verificar permisos' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const { data: permission } = await supabase
            .from('branch_permissions')
            .select('can_manage_staff')
            .eq('user_id', caller.id)
            .eq('branch_id', branchId)
            .single();
          
          if (!permission?.can_manage_staff) {
            return new Response(
              JSON.stringify({ success: false, error: 'No tenés permisos para gestionar personal' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // Additionally verify the target user belongs to this branch
          const { data: targetProfile } = await supabase
            .from('profiles')
            .select('branch_id')
            .eq('user_id', userId)
            .single();
          
          if (targetProfile?.branch_id !== branchId) {
            return new Response(
              JSON.stringify({ success: false, error: 'El usuario no pertenece a tu sucursal' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Validate PIN format
        if (!pin || pin.length !== 4 || !/^\d+$/.test(pin)) {
          return new Response(
            JSON.stringify({ success: false, error: 'PIN debe ser de 4 dígitos' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const pinHash = await hashPin(pin);
        
        const { error } = await supabase
          .from('profiles')
          .update({ pin_hash: pinHash })
          .eq('user_id', userId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in attendance-token function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});