/**
 * Helper for querying tables that exist in the database but aren't yet
 * reflected in the auto-generated Supabase types file.
 *
 * Usage:
 *   import { fromUntyped } from '@/lib/supabase-helpers';
 *   const { data } = await fromUntyped('my_table').select('*');
 */
import { supabase } from '@/integrations/supabase/client';

export function fromUntyped(table: string) {
  return (supabase as any).from(table);
}
