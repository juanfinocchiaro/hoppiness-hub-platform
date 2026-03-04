import { fromUntyped } from '@/lib/supabase-helpers';

export interface ClienteAddress {
  id: string;
  label: string;
  address: string;
  floor: string | null;
  reference: string | null;
  city: string | null;
  is_primary: boolean;
}

export async function listAddresses(userId: string) {
  const { data, error } = await fromUntyped('customer_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_primary', { ascending: false });
  if (error) throw error;
  return (data || []) as ClienteAddress[];
}

export async function saveAddress(
  userId: string,
  payload: {
    label: string;
    address: string;
    floor: string | null;
    reference: string | null;
    city: string | null;
  },
  editId?: string | null,
) {
  if (editId) {
    const { error } = await fromUntyped('customer_addresses')
      .update({ ...payload, user_id: userId })
      .eq('id', editId);
    if (error) throw error;
  } else {
    const { error } = await fromUntyped('customer_addresses')
      .insert({ ...payload, user_id: userId });
    if (error) throw error;
  }
}

export async function deleteAddress(id: string) {
  const { error } = await fromUntyped('customer_addresses').delete().eq('id', id);
  if (error) throw error;
}
