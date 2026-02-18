/**
 * Hook para el Sistema de Supervisiones de Sucursales
 * CRUD de inspecciones y sus ítems
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  BranchInspection,
  InspectionItem,
  InspectionTemplate,
  CreateInspectionInput,
  UpdateInspectionItemInput,
  CompleteInspectionInput,
  InspectionType,
  InspectionActionItem,
} from '@/types/inspection';
import type { Json } from '@/integrations/supabase/types';

// ============================================================================
// TEMPLATES
// ============================================================================

export function useInspectionTemplates(type?: InspectionType) {
  return useQuery({
    queryKey: ['inspection-templates', type],
    queryFn: async () => {
      let query = supabase
        .from('inspection_templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (type) {
        query = query.eq('inspection_type', type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as InspectionTemplate[];
    },
  });
}

// ============================================================================
// INSPECTIONS LIST
// ============================================================================

interface UseInspectionsOptions {
  branchId?: string;
  status?: string;
  inspectorId?: string;
  limit?: number;
}

export function useInspections(options: UseInspectionsOptions = {}) {
  const { branchId, status, inspectorId, limit = 50 } = options;

  return useQuery({
    queryKey: ['inspections', options],
    queryFn: async () => {
      let query = supabase
        .from('branch_inspections')
        .select(`
          *,
          branch:branches(id, name, slug)
        `)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (inspectorId) {
        query = query.eq('inspector_id', inspectorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch profiles separately
      const inspectorIds = [...new Set((data || []).map(d => d.inspector_id).filter(Boolean))];
      const managerIds = [...new Set((data || []).map(d => d.present_manager_id).filter(Boolean))];
      const allUserIds = [...new Set([...inspectorIds, ...managerIds])];

      let profiles: Record<string, { id: string; full_name: string }> = {};
      if (allUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', allUserIds);
        
        if (profilesData) {
          profiles = Object.fromEntries(profilesData.map(p => [p.id, p]));
        }
      }

      return (data || []).map(row => ({
        ...row,
        inspection_type: row.inspection_type as InspectionType,
        action_items: (Array.isArray(row.action_items) ? row.action_items : []) as unknown as InspectionActionItem[],
        inspector: profiles[row.inspector_id] || undefined,
        present_manager: row.present_manager_id ? profiles[row.present_manager_id] : undefined,
      })) as BranchInspection[];
    },
  });
}

// ============================================================================
// SINGLE INSPECTION WITH ITEMS
// ============================================================================

export function useInspection(inspectionId: string | undefined) {
  return useQuery({
    queryKey: ['inspection', inspectionId],
    queryFn: async () => {
      if (!inspectionId) return null;

      const { data: inspection, error: inspError } = await supabase
        .from('branch_inspections')
        .select(`
          *,
          branch:branches(id, name, slug)
        `)
        .eq('id', inspectionId)
        .single();

      if (inspError) throw inspError;

      // Fetch profiles separately
      const userIds = [inspection.inspector_id, inspection.present_manager_id].filter(Boolean);
      let profiles: Record<string, { id: string; full_name: string }> = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        
        if (profilesData) {
          profiles = Object.fromEntries(profilesData.map(p => [p.id, p]));
        }
      }

      const { data: items, error: itemsError } = await supabase
        .from('inspection_items')
        .select('*')
        .eq('inspection_id', inspectionId)
        .order('sort_order');

      if (itemsError) throw itemsError;

      return {
        ...inspection,
        inspection_type: inspection.inspection_type as InspectionType,
        action_items: (Array.isArray(inspection.action_items) ? inspection.action_items : []) as unknown as InspectionActionItem[],
        inspector: profiles[inspection.inspector_id] || undefined,
        present_manager: inspection.present_manager_id ? profiles[inspection.present_manager_id] : undefined,
        items: items as InspectionItem[],
      } as BranchInspection;
    },
    enabled: !!inspectionId,
  });
}

// ============================================================================
// CREATE INSPECTION
// ============================================================================

export function useCreateInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateInspectionInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      // Atomic RPC: creates inspection + items from templates in a single transaction.
      // If items fail, the inspection is rolled back too.
      const { data: inspectionId, error } = await supabase.rpc(
        'create_inspection_with_items',
        {
          p_branch_id: input.branch_id,
          p_inspection_type: input.inspection_type,
          p_inspector_id: user.id,
          p_present_manager_id: input.present_manager_id || null,
        }
      );

      if (error) throw error;

      return { id: inspectionId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      toast.success('Visita iniciada');
    },
    onError: (error) => {
      console.error('Error creating inspection:', error);
      toast.error('Error al iniciar la visita');
    },
  });
}

// ============================================================================
// UPDATE INSPECTION ITEM (with optimistic updates for instant UI feedback)
// ============================================================================

export function useUpdateInspectionItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      inspectionId,
      data,
    }: {
      itemId: string;
      inspectionId: string;
      data: UpdateInspectionItemInput;
    }) => {
      const updateData: Record<string, unknown> = {
        complies: data.complies,
        observations: data.observations || null,
      };
      if (data.photo_urls !== undefined) {
        updateData.photo_urls = data.photo_urls;
      }
      const { error } = await supabase
        .from('inspection_items')
        .update(updateData)
        .eq('id', itemId);

      if (error) throw error;
      return { itemId, inspectionId, data };
    },
    // Optimistic update: update UI immediately before server responds
    onMutate: async ({ itemId, inspectionId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['inspection', inspectionId] });

      // Snapshot previous value
      const previousInspection = queryClient.getQueryData<BranchInspection>(['inspection', inspectionId]);

      // Optimistically update the cache
      if (previousInspection?.items) {
        queryClient.setQueryData<BranchInspection>(['inspection', inspectionId], {
          ...previousInspection,
          items: previousInspection.items.map(item =>
            item.id === itemId
              ? { ...item, complies: data.complies, observations: data.observations ?? item.observations, photo_urls: data.photo_urls ?? item.photo_urls }
              : item
          ),
        });
      }

      // Return context for rollback
      return { previousInspection };
    },
    onError: (error, { inspectionId }, context) => {
      // Rollback on error
      if (context?.previousInspection) {
        queryClient.setQueryData(['inspection', inspectionId], context.previousInspection);
      }
      console.error('Error updating item:', error);
      toast.error('Error al guardar');
    },
    onSettled: (_, __, { inspectionId }) => {
      // Refetch to ensure server state is synced (but UI already updated)
      queryClient.invalidateQueries({ queryKey: ['inspection', inspectionId] });
    },
  });
}

// ============================================================================
// UPDATE INSPECTION (Manager, Notes, etc.)
// ============================================================================

export function useUpdateInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      inspectionId,
      data,
    }: {
      inspectionId: string;
      data: Partial<Pick<BranchInspection, 'present_manager_id' | 'general_notes' | 'critical_findings'>>;
    }) => {
      const { error } = await supabase
        .from('branch_inspections')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', inspectionId);

      if (error) throw error;
      return inspectionId;
    },
    onSuccess: (inspectionId) => {
      queryClient.invalidateQueries({ queryKey: ['inspection', inspectionId] });
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
    },
    onError: (error) => {
      console.error('Error updating inspection:', error);
      toast.error('Error al actualizar');
    },
  });
}

// ============================================================================
// COMPLETE INSPECTION
// ============================================================================

export function useCompleteInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      inspectionId,
      data,
    }: {
      inspectionId: string;
      data: CompleteInspectionInput;
    }) => {
      // Get items to calculate score
      const { data: items, error: itemsError } = await supabase
        .from('inspection_items')
        .select('complies')
        .eq('inspection_id', inspectionId);

      if (itemsError) throw itemsError;

      // Calculate score: only count items with a boolean value (not null/N/A)
      const applicableItems = items.filter(i => i.complies !== null);
      const compliantItems = applicableItems.filter(i => i.complies === true);
      const score = applicableItems.length > 0
        ? Math.round((compliantItems.length / applicableItems.length) * 100)
        : 0;

      // Update inspection
      const { error } = await supabase
        .from('branch_inspections')
        .update({
          status: 'completada',
          completed_at: new Date().toISOString(),
          score_total: score,
          general_notes: data.general_notes || null,
          critical_findings: data.critical_findings || null,
          action_items: (data.action_items || []) as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq('id', inspectionId);

      if (error) throw error;
      return { inspectionId, score };
    },
    onSuccess: ({ inspectionId, score }) => {
      queryClient.invalidateQueries({ queryKey: ['inspection', inspectionId] });
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      toast.success(`Visita completada con puntaje ${score}/100`);
    },
    onError: (error) => {
      console.error('Error completing inspection:', error);
      toast.error('Error al completar la visita');
    },
  });
}

// ============================================================================
// CANCEL INSPECTION
// ============================================================================

export function useCancelInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inspectionId: string) => {
      const { error } = await supabase
        .from('branch_inspections')
        .update({
          status: 'cancelada',
          updated_at: new Date().toISOString(),
        })
        .eq('id', inspectionId);

      if (error) throw error;
      return inspectionId;
    },
    onSuccess: (inspectionId) => {
      queryClient.invalidateQueries({ queryKey: ['inspection', inspectionId] });
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      toast.success('Visita cancelada');
    },
    onError: (error) => {
      console.error('Error canceling inspection:', error);
      toast.error('Error al cancelar');
    },
  });
}

// ============================================================================
// DELETE INSPECTION
// ============================================================================

export function useDeleteInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inspectionId: string) => {
      // First delete items
      const { error: itemsError } = await supabase
        .from('inspection_items')
        .delete()
        .eq('inspection_id', inspectionId);

      if (itemsError) throw itemsError;

      // Then delete inspection
      const { error } = await supabase
        .from('branch_inspections')
        .delete()
        .eq('id', inspectionId);

      if (error) throw error;
      return inspectionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      toast.success('Visita eliminada');
    },
    onError: (error) => {
      console.error('Error deleting inspection:', error);
      toast.error('Error al eliminar la visita');
    },
  });
}

// ============================================================================
// UPLOAD PHOTO
// ============================================================================

export function useUploadInspectionPhoto() {
  return useMutation({
    mutationFn: async ({
      inspectionId,
      itemKey,
      file,
    }: {
      inspectionId: string;
      itemKey: string;
      file: File;
    }) => {
      const ext = file.name.split('.').pop();
      const fileName = `${inspectionId}/${itemKey}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('inspection-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('inspection-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    },
    onError: (error) => {
      console.error('Error uploading photo:', error);
      toast.error('Error al subir la foto');
    },
  });
}
