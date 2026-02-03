/**
 * useEffectiveUser - Retorna el usuario efectivo para visualización y operaciones
 * 
 * En modo normal: retorna datos de useAuth
 * En modo impersonación: retorna datos del targetUser
 * 
 * IMPORTANTE: Este hook debe usarse para TODO lo relacionado con el usuario actual:
 * - Queries (lecturas)
 * - Mutations (escrituras)
 * - Visualización de nombre/email
 */
import { useAuth } from './useAuth';
import { useImpersonation } from '@/contexts/ImpersonationContext';

export interface EffectiveUser {
  id: string | null;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  isImpersonated: boolean;
}

export function useEffectiveUser(): EffectiveUser {
  const { user } = useAuth();
  const { isImpersonating, targetUser } = useImpersonation();

  if (isImpersonating && targetUser) {
    return {
      id: targetUser.id,
      email: targetUser.email,
      full_name: targetUser.full_name,
      avatar_url: targetUser.avatar_url,
      isImpersonated: true,
    };
  }

  return {
    id: user?.id || null,
    email: user?.email || null,
    full_name: user?.user_metadata?.full_name || null,
    avatar_url: null,
    isImpersonated: false,
  };
}

export default useEffectiveUser;
