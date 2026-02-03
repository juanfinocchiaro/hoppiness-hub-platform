/**
 * ImpersonationContext - Sistema "Ver como..." para Superadmin
 * 
 * Permite a superadmins visualizar la aplicación desde la perspectiva de otro usuario
 * SIN afectar operaciones reales de base de datos (RLS sigue usando auth.uid() real).
 */
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/types';
import type { BrandRole, LocalRole, UserBranchRole } from '@/hooks/usePermissionsV2';

type Branch = Tables<'branches'>;

// Datos del usuario impersonado
export interface ImpersonatedUser {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  brandRole: BrandRole;
  branchRoles: UserBranchRole[];
  accessibleBranches: Branch[];
}

interface ImpersonationContextType {
  // Estado
  isImpersonating: boolean;
  targetUser: ImpersonatedUser | null;
  loading: boolean;
  
  // Acciones
  startImpersonating: (userId: string) => Promise<void>;
  stopImpersonating: () => void;
  
  // Helper
  canImpersonate: boolean;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

const STORAGE_KEY = 'hoppiness_impersonation';

function readStoredImpersonation(): ImpersonatedUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ImpersonatedUser;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // Restore synchronously to avoid layout shifts (banner/offset toggling after first render)
  const [targetUser, setTargetUser] = useState<ImpersonatedUser | null>(() => readStoredImpersonation());
  const [isImpersonating, setIsImpersonating] = useState<boolean>(() => !!readStoredImpersonation());
  const [loading, setLoading] = useState(false);
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  // Check if current user is superadmin
  useEffect(() => {
    const checkSuperadmin = async () => {
      if (!user?.id) {
        setIsSuperadmin(false);
        return;
      }

      const { data } = await supabase
        .from('user_roles_v2')
        .select('brand_role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      setIsSuperadmin(data?.brand_role === 'superadmin');
    };

    checkSuperadmin();
  }, [user?.id]);

  // Validate restored impersonation once we know if the current user is superadmin
  useEffect(() => {
    if (!isSuperadmin) {
      // If user isn't superadmin, never keep impersonation state
      if (sessionStorage.getItem(STORAGE_KEY)) {
        sessionStorage.removeItem(STORAGE_KEY);
      }
      setIsImpersonating(false);
      setTargetUser(null);
      return;
    }

    // If superadmin and we have stored target, keep it (already set synchronously)
    const stored = readStoredImpersonation();
    if (stored) {
      setTargetUser(stored);
      setIsImpersonating(true);
    }
  }, [isSuperadmin]);

  const startImpersonating = useCallback(async (userId: string) => {
    if (!isSuperadmin) return;
    
    setLoading(true);
    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('id', userId)
        .single();

      if (profileError || !profile) throw new Error('Usuario no encontrado');

      // Fetch brand role
      const { data: brandRoleData } = await supabase
        .from('user_roles_v2')
        .select('brand_role')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      // Fetch branch roles
      const { data: branchRolesData } = await supabase
        .from('user_branch_roles')
        .select('branch_id, local_role, authorization_pin_hash')
        .eq('user_id', userId)
        .eq('is_active', true);

      const branchRoles: UserBranchRole[] = (branchRolesData || []).map(r => ({
        branch_id: r.branch_id,
        local_role: r.local_role as LocalRole,
        authorization_pin_hash: r.authorization_pin_hash,
      }));

      // Fetch accessible branches
      let branches: Branch[] = [];
      
      if (brandRoleData?.brand_role === 'superadmin') {
        const { data } = await supabase
          .from('branches')
          .select('*')
          .eq('is_active', true)
          .order('name');
        branches = data || [];
      } else if (branchRoles.length > 0) {
        const branchIds = branchRoles.map(r => r.branch_id);
        const { data } = await supabase
          .from('branches')
          .select('*')
          .in('id', branchIds)
          .eq('is_active', true)
          .order('name');
        branches = data || [];
      }

      const impersonatedUser: ImpersonatedUser = {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        avatar_url: profile.avatar_url,
        brandRole: (brandRoleData?.brand_role as BrandRole) || null,
        branchRoles,
        accessibleBranches: branches,
      };

      setTargetUser(impersonatedUser);
      setIsImpersonating(true);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(impersonatedUser));
    } catch (error) {
      console.error('Error starting impersonation:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isSuperadmin]);

  const stopImpersonating = useCallback(() => {
    setIsImpersonating(false);
    setTargetUser(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <ImpersonationContext.Provider
      value={{
        isImpersonating,
        targetUser,
        loading,
        startImpersonating,
        stopImpersonating,
        canImpersonate: isSuperadmin,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (!context) {
    throw new Error('useImpersonation must be used within ImpersonationProvider');
  }
  return context;
}
