import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface OperatorInfo {
  userId: string;
  fullName: string;
  role?: string;
}

export function useOperatorVerification(branchId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Log de confirmación de identidad
  const logConfirmIdentity = useMutation({
    mutationFn: async (triggeredBy: string) => {
      if (!branchId || !user) return;
      
      await supabase.from('operator_session_logs').insert({
        branch_id: branchId,
        current_user_id: user.id,
        previous_user_id: null,
        action_type: 'confirm_identity',
        triggered_by: triggeredBy,
      });
    },
  });
  
  // Log de cambio de operador
  const logOperatorChange = useMutation({
    mutationFn: async ({ 
      previousUserId, 
      newUserId, 
      triggeredBy 
    }: { 
      previousUserId: string; 
      newUserId: string; 
      triggeredBy: string;
    }) => {
      if (!branchId) return;
      
      await supabase.from('operator_session_logs').insert({
        branch_id: branchId,
        previous_user_id: previousUserId,
        current_user_id: newUserId,
        action_type: 'operator_change',
        triggered_by: triggeredBy,
      });
    },
  });
  
  // Validar PIN de supervisor
  const validateSupervisorPin = useCallback(async (pin: string): Promise<OperatorInfo | null> => {
    if (!branchId) return null;
    
    const { data, error } = await supabase.rpc('validate_supervisor_pin', {
      _branch_id: branchId,
      _pin: pin,
    });
    
    if (error) {
      console.error('Error validating PIN:', error);
      return null;
    }
    
    if (data && data.length > 0) {
      const supervisor = data[0];
      return {
        userId: supervisor.user_id,
        fullName: supervisor.full_name,
        role: supervisor.role,
      };
    }
    
    return null;
  }, [branchId]);
  
  // Cambiar usuario (login nuevo, logout anterior)
  const changeOperator = useCallback(async (
    email: string, 
    password: string,
    triggeredBy: string
  ): Promise<OperatorInfo | null> => {
    const previousUserId = user?.id;
    
    // Intentar login con nuevas credenciales
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      toast.error('Credenciales incorrectas');
      return null;
    }
    
    if (data.user && previousUserId) {
      // Obtener perfil del nuevo usuario
      const { data: newProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', data.user.id)
        .single();
      
      // Registrar el cambio
      await logOperatorChange.mutateAsync({
        previousUserId,
        newUserId: data.user.id,
        triggeredBy,
      });
      
      // Invalidar queries para refrescar datos
      queryClient.invalidateQueries();
      
      toast.success(`Sesión cambiada a ${newProfile?.full_name || email}`);
      
      return {
        userId: data.user.id,
        fullName: newProfile?.full_name || email,
      };
    }
    
    return null;
  }, [user, logOperatorChange, queryClient]);
  
  // Info del operador actual
  const currentOperator: OperatorInfo | null = user ? {
    userId: user.id,
    fullName: user.email || 'Usuario',
  } : null;
  
  return {
    currentOperator,
    validateSupervisorPin,
    changeOperator,
    logConfirmIdentity: (triggeredBy: string) => logConfirmIdentity.mutate(triggeredBy),
    isLoading: logConfirmIdentity.isPending || logOperatorChange.isPending,
  };
}
    mutationFn: async () => {
      if (!user || !branchId) return false;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .in('role', ['encargado', 'franquiciado', 'admin', 'coordinador'])
        .limit(1);
      
      return (data?.length || 0) > 0;
    },
  });
  
  return { isSupervisor, isLoading };
}
