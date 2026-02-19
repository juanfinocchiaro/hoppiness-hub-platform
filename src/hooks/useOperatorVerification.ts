/**
 * useOperatorVerification - Verificación y cambio de operador (Fase 5)
 */
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

  const logConfirmIdentity = useMutation({
    mutationFn: async (triggeredBy: string) => {
      if (!branchId || !user) return;
      // Log opcional - si existe la tabla operator_session_logs
      try {
        await supabase.from('operator_session_logs').insert({
          branch_id: branchId,
          current_user_id: user.id,
          previous_user_id: null,
          action_type: 'confirm_identity',
          triggered_by: triggeredBy,
        });
      } catch (e) {
        // Tabla puede no existir, ignorar
        console.debug('operator_session_logs no disponible');
      }
    },
  });

  const logOperatorChange = useMutation({
    mutationFn: async ({
      previousUserId,
      newUserId,
      triggeredBy,
    }: {
      previousUserId: string;
      newUserId: string;
      triggeredBy: string;
    }) => {
      if (!branchId) return;
      try {
        await supabase.from('operator_session_logs').insert({
          branch_id: branchId,
          previous_user_id: previousUserId,
          current_user_id: newUserId,
          action_type: 'operator_change',
          triggered_by: triggeredBy,
        });
      } catch (e) {
        console.debug('operator_session_logs no disponible');
      }
    },
  });

  const validateSupervisorPin = useCallback(
    async (pin: string): Promise<OperatorInfo | null> => {
      if (!branchId) return null;

      try {
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
      } catch (e) {
        // Función puede no existir, usar verificación alternativa
        console.debug('validate_supervisor_pin no disponible, usando verificación alternativa');
        // Verificar si el usuario actual tiene rol de supervisor
        if (!user) return null;
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .in('role', ['encargado', 'franquiciado', 'admin', 'coordinador'])
          .limit(1);
        if (roles && roles.length > 0) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', user.id)
            .single();
          return {
            userId: user.id,
            fullName: profile?.full_name || user.email || 'Usuario',
            role: roles[0].role,
          };
        }
      }

      return null;
    },
    [branchId, user]
  );

  const changeOperator = useCallback(
    async (
      email: string,
      password: string,
      triggeredBy: string
    ): Promise<OperatorInfo | null> => {
      const previousUserId = user?.id;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error('Credenciales incorrectas');
        return null;
      }

      if (data.user && previousUserId) {
        const { data: newProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', data.user.id)
          .single();

        await logOperatorChange.mutateAsync({
          previousUserId,
          newUserId: data.user.id,
          triggeredBy,
        });

        queryClient.invalidateQueries();
        toast.success(`Sesión cambiada a ${newProfile?.full_name || email}`);

        return {
          userId: data.user.id,
          fullName: newProfile?.full_name || email,
        };
      }

      return null;
    },
    [user, logOperatorChange, queryClient]
  );

  const currentOperator: OperatorInfo | null = user
    ? {
        userId: user.id,
        fullName: user.email || 'Usuario',
      }
    : null;

  return {
    currentOperator,
    validateSupervisorPin,
    changeOperator,
    logConfirmIdentity: (triggeredBy: string) => logConfirmIdentity.mutate(triggeredBy),
    isLoading: logConfirmIdentity.isPending || logOperatorChange.isPending,
  };
}
