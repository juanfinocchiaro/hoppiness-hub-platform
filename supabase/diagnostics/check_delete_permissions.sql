-- DIAGNÓSTICO: Ejecutá esto en SQL Editor de Supabase
-- Te va a decir exactamente qué está mal

-- 1. ¿Existe la función is_superadmin?
SELECT proname, proargtypes::regtype[] 
FROM pg_proc 
WHERE proname = 'is_superadmin';

-- 2. ¿Sos superadmin?
SELECT is_superadmin(auth.uid()) AS soy_superadmin;

-- 3. ¿Existe la función admin_delete_clock_entry?
SELECT proname, proargtypes::regtype[] 
FROM pg_proc 
WHERE proname = 'admin_delete_clock_entry';

-- 4. ¿Existe la función admin_update_clock_entry?
SELECT proname, proargtypes::regtype[] 
FROM pg_proc 
WHERE proname = 'admin_update_clock_entry';

-- 5. ¿Qué policies existen en clock_entries?
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'clock_entries'
ORDER BY policyname;

-- 6. ¿Hay un fichaje de prueba? (poné un ID real)
-- SELECT id, user_id, branch_id, entry_type, created_at
-- FROM clock_entries WHERE id = 'PONER_ID_AQUI';
