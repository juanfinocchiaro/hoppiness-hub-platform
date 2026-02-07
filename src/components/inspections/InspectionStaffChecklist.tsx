/**
 * InspectionStaffChecklist - Checklist de personal presente durante la inspección
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Users, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StaffMember {
  id: string;
  full_name: string;
  local_role: string;
}

interface StaffPresent {
  user_id: string;
  was_present: boolean;
  observations: string | null;
}

interface InspectionStaffChecklistProps {
  inspectionId: string;
  branchId: string;
  readOnly?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  encargado: 'Encargado',
  cajero: 'Cajero',
  empleado: 'Empleado',
};

export function InspectionStaffChecklist({
  inspectionId,
  branchId,
  readOnly = false,
}: InspectionStaffChecklistProps) {
  const queryClient = useQueryClient();
  const [editingObservation, setEditingObservation] = useState<string | null>(null);
  const [observationText, setObservationText] = useState('');

  // Fetch staff members for this branch (excluding franquiciados)
  const { data: staffMembers = [] } = useQuery({
    queryKey: ['inspection-staff-members', branchId],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from('user_branch_roles')
        .select('user_id, local_role')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .neq('local_role', 'franquiciado');

      if (!roles?.length) return [];

      const userIds = [...new Set(roles.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)
        .order('full_name');

      // Merge profile with role
      return (profiles || []).map(p => {
        const role = roles.find(r => r.user_id === p.id);
        return {
          id: p.id,
          full_name: p.full_name,
          local_role: role?.local_role || 'empleado',
        };
      }) as StaffMember[];
    },
    enabled: !!branchId,
  });

  // Fetch existing staff present records
  const { data: staffPresent = [] } = useQuery({
    queryKey: ['inspection-staff-present', inspectionId],
    queryFn: async () => {
      const { data } = await supabase
        .from('inspection_staff_present')
        .select('user_id, was_present, observations')
        .eq('inspection_id', inspectionId);
      return (data || []) as StaffPresent[];
    },
    enabled: !!inspectionId,
  });

  // Toggle presence mutation
  const togglePresence = useMutation({
    mutationFn: async ({ userId, wasPresent }: { userId: string; wasPresent: boolean }) => {
      const existing = staffPresent.find(s => s.user_id === userId);
      
      if (existing) {
        const { error } = await supabase
          .from('inspection_staff_present')
          .update({ was_present: wasPresent })
          .eq('inspection_id', inspectionId)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('inspection_staff_present')
          .insert({
            inspection_id: inspectionId,
            user_id: userId,
            was_present: wasPresent,
          });
        if (error) throw error;
      }
    },
    onMutate: async ({ userId, wasPresent }) => {
      await queryClient.cancelQueries({ queryKey: ['inspection-staff-present', inspectionId] });
      const previous = queryClient.getQueryData<StaffPresent[]>(['inspection-staff-present', inspectionId]);
      
      queryClient.setQueryData<StaffPresent[]>(['inspection-staff-present', inspectionId], old => {
        const existing = old?.find(s => s.user_id === userId);
        if (existing) {
          return old?.map(s => s.user_id === userId ? { ...s, was_present: wasPresent } : s);
        }
        return [...(old || []), { user_id: userId, was_present: wasPresent, observations: null }];
      });
      
      return { previous };
    },
    onError: (err, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['inspection-staff-present', inspectionId], context.previous);
      }
      toast.error('Error al guardar');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection-staff-present', inspectionId] });
    },
  });

  // Save observation mutation
  const saveObservation = useMutation({
    mutationFn: async ({ userId, observations }: { userId: string; observations: string }) => {
      const existing = staffPresent.find(s => s.user_id === userId);
      
      if (existing) {
        const { error } = await supabase
          .from('inspection_staff_present')
          .update({ observations: observations || null })
          .eq('inspection_id', inspectionId)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('inspection_staff_present')
          .insert({
            inspection_id: inspectionId,
            user_id: userId,
            was_present: true,
            observations: observations || null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection-staff-present', inspectionId] });
      setEditingObservation(null);
      setObservationText('');
    },
    onError: () => {
      toast.error('Error al guardar observación');
    },
  });

  const handleToggle = (userId: string, newValue: boolean) => {
    if (readOnly) return;
    togglePresence.mutate({ userId, wasPresent: newValue });
  };

  const handleStartEditObservation = (userId: string) => {
    if (readOnly) return;
    const existing = staffPresent.find(s => s.user_id === userId);
    setEditingObservation(userId);
    setObservationText(existing?.observations || '');
  };

  const handleSaveObservation = (userId: string) => {
    saveObservation.mutate({ userId, observations: observationText });
  };

  const getStaffStatus = (userId: string) => {
    const record = staffPresent.find(s => s.user_id === userId);
    return {
      wasPresent: record?.was_present ?? null,
      observations: record?.observations || null,
    };
  };

  if (staffMembers.length === 0) {
    return null;
  }

  // Group by role
  const encargados = staffMembers.filter(s => s.local_role === 'encargado');
  const others = staffMembers.filter(s => s.local_role !== 'encargado');

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4" />
          Personal Presente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Encargados first */}
        {encargados.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Encargados
            </div>
            {encargados.map(member => (
              <StaffRow
                key={member.id}
                member={member}
                status={getStaffStatus(member.id)}
                readOnly={readOnly}
                isEditing={editingObservation === member.id}
                observationText={observationText}
                onToggle={handleToggle}
                onStartEdit={handleStartEditObservation}
                onObservationChange={setObservationText}
                onSaveObservation={handleSaveObservation}
                onCancelEdit={() => setEditingObservation(null)}
              />
            ))}
          </div>
        )}

        {/* Other staff */}
        {others.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Equipo
            </div>
            {others.map(member => (
              <StaffRow
                key={member.id}
                member={member}
                status={getStaffStatus(member.id)}
                readOnly={readOnly}
                isEditing={editingObservation === member.id}
                observationText={observationText}
                onToggle={handleToggle}
                onStartEdit={handleStartEditObservation}
                onObservationChange={setObservationText}
                onSaveObservation={handleSaveObservation}
                onCancelEdit={() => setEditingObservation(null)}
              />
            ))}
          </div>
        )}

        {/* Summary */}
        <div className="pt-2 border-t text-sm text-muted-foreground">
          {staffPresent.filter(s => s.was_present).length} de {staffMembers.length} presentes
        </div>
      </CardContent>
    </Card>
  );
}

interface StaffRowProps {
  member: StaffMember;
  status: { wasPresent: boolean | null; observations: string | null };
  readOnly: boolean;
  isEditing: boolean;
  observationText: string;
  onToggle: (userId: string, value: boolean) => void;
  onStartEdit: (userId: string) => void;
  onObservationChange: (text: string) => void;
  onSaveObservation: (userId: string) => void;
  onCancelEdit: () => void;
}

function StaffRow({
  member,
  status,
  readOnly,
  isEditing,
  observationText,
  onToggle,
  onStartEdit,
  onObservationChange,
  onSaveObservation,
  onCancelEdit,
}: StaffRowProps) {
  const { wasPresent, observations } = status;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
        {/* Toggle buttons */}
        <div className="flex gap-1">
          <Button
            type="button"
            variant={wasPresent === true ? 'default' : 'outline'}
            size="icon"
            className={cn(
              'h-9 w-9 transition-all',
              wasPresent === true && 'bg-green-600 hover:bg-green-700'
            )}
            onClick={() => onToggle(member.id, wasPresent === true ? false : true)}
            disabled={readOnly}
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant={wasPresent === false ? 'default' : 'outline'}
            size="icon"
            className={cn(
              'h-9 w-9 transition-all',
              wasPresent === false && 'bg-destructive hover:bg-destructive/90'
            )}
            onClick={() => onToggle(member.id, wasPresent === false ? true : false)}
            disabled={readOnly}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Name and role */}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{member.full_name}</div>
          <div className="text-xs text-muted-foreground">
            {ROLE_LABELS[member.local_role] || member.local_role}
          </div>
        </div>

        {/* Observation button */}
        {!readOnly && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', observations && 'text-primary')}
            onClick={() => onStartEdit(member.id)}
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Observation display (read-only) */}
      {readOnly && observations && (
        <div className="ml-[4.5rem] text-sm text-muted-foreground bg-muted/30 p-2 rounded">
          {observations}
        </div>
      )}

      {/* Observation input (editing) */}
      {isEditing && (
        <div className="ml-[4.5rem] flex gap-2">
          <Input
            value={observationText}
            onChange={(e) => onObservationChange(e.target.value)}
            placeholder="Observación sobre este empleado..."
            className="flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveObservation(member.id);
              if (e.key === 'Escape') onCancelEdit();
            }}
          />
          <Button size="sm" onClick={() => onSaveObservation(member.id)}>
            Guardar
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancelEdit}>
            Cancelar
          </Button>
        </div>
      )}

      {/* Show saved observation (not editing) */}
      {!readOnly && !isEditing && observations && (
        <div 
          className="ml-[4.5rem] text-sm text-muted-foreground bg-muted/30 p-2 rounded cursor-pointer hover:bg-muted/50"
          onClick={() => onStartEdit(member.id)}
        >
          {observations}
        </div>
      )}
    </div>
  );
}

