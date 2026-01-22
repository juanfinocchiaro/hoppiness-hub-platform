import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestUser {
  email: string;
  password: string;
  full_name: string;
  brand_role: string | null;
  local_role: string | null;
}

const TEST_USERS: TestUser[] = [
  // Brand roles
  { email: 'superadmin@test.com', password: 'testtest', full_name: 'Super Admin Test', brand_role: 'superadmin', local_role: null },
  { email: 'coordinador@test.com', password: 'testtest', full_name: 'Coordinador Test', brand_role: 'coordinador', local_role: null },
  { email: 'informes@test.com', password: 'testtest', full_name: 'Informes Test', brand_role: 'informes', local_role: null },
  { email: 'contador.marca@test.com', password: 'testtest', full_name: 'Contador Marca Test', brand_role: 'contador_marca', local_role: null },
  
  // Local roles
  { email: 'franquiciado@test.com', password: 'testtest', full_name: 'Franquiciado Test', brand_role: null, local_role: 'franquiciado' },
  { email: 'encargado@test.com', password: 'testtest', full_name: 'Encargado Test', brand_role: null, local_role: 'encargado' },
  { email: 'contador.local@test.com', password: 'testtest', full_name: 'Contador Local Test', brand_role: null, local_role: 'contador_local' },
  { email: 'cajero@test.com', password: 'testtest', full_name: 'Cajero Test', brand_role: null, local_role: 'cajero' },
  { email: 'empleado@test.com', password: 'testtest', full_name: 'Empleado Test', brand_role: null, local_role: 'empleado' },
  
  // Mixed role (brand + local)
  { email: 'mixto@test.com', password: 'testtest', full_name: 'Usuario Mixto Test', brand_role: 'coordinador', local_role: 'encargado' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get first active branch for local roles
    const { data: branches } = await supabaseAdmin
      .from('branches')
      .select('id')
      .eq('is_active', true)
      .limit(1);

    const branchId = branches?.[0]?.id;
    
    if (!branchId) {
      return new Response(
        JSON.stringify({ error: 'No active branch found. Create a branch first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: { email: string; status: string; error?: string }[] = [];

    for (const testUser of TEST_USERS) {
      try {
        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === testUser.email);

        let userId: string;

        if (existingUser) {
          userId = existingUser.id;
          // Update password for existing user
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: testUser.password
          });
          results.push({ email: testUser.email, status: 'password_updated' });
        } else {
          // Create user
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: testUser.email,
            password: testUser.password,
            email_confirm: true,
            user_metadata: { full_name: testUser.full_name }
          });

          if (authError) throw authError;
          userId = authData.user.id;

          // Create profile
          await supabaseAdmin.from('profiles').upsert({
            id: userId,
            full_name: testUser.full_name,
            email: testUser.email
          });

          results.push({ email: testUser.email, status: 'created' });
        }

        // Upsert role
        const roleData: Record<string, unknown> = {
          user_id: userId,
          brand_role: testUser.brand_role,
          local_role: testUser.local_role,
          is_active: true,
        };

        // Add branch_ids for local roles
        if (testUser.local_role) {
          roleData.branch_ids = [branchId];
        }

        await supabaseAdmin.from('user_roles_v2').upsert(roleData, { onConflict: 'user_id' });

      } catch (error) {
        results.push({ 
          email: testUser.email, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        branchId,
        credentials: TEST_USERS.map(u => ({ email: u.email, password: u.password, roles: { brand: u.brand_role, local: u.local_role } }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
