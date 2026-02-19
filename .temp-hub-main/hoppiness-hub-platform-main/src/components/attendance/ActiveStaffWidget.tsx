import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/lib/errorHandler';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, Clock } from 'lucide-react';

interface ActiveEmployee {
  id: string;
  full_name: string;
  position: string | null;
}

interface ActiveStaffWidgetProps {
  branchId: string;
  compact?: boolean;
}

export default function ActiveStaffWidget({ branchId, compact = false }: ActiveStaffWidgetProps) {
  const [activeStaff, setActiveStaff] = useState<ActiveEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActiveStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, position')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .eq('current_status', 'WORKING')
        .order('full_name');

      if (error) throw error;
      setActiveStaff(data || []);
    } catch (error) {
      handleError(error, { showToast: false, context: 'ActiveStaffWidget.fetchActiveStaff' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!branchId) return;
    
    fetchActiveStaff();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`employees-status-${branchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'employees',
          filter: `branch_id=eq.${branchId}`,
        },
        () => {
          fetchActiveStaff();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="gap-1">
          <Users className="h-3 w-3" />
          {activeStaff.length}
        </Badge>
        <div className="flex -space-x-2">
          {activeStaff.slice(0, 4).map((emp) => (
            <Avatar key={emp.id} className="h-6 w-6 border-2 border-background">
              <AvatarFallback className="text-[10px] bg-primary/10">
                {getInitials(emp.full_name)}
              </AvatarFallback>
            </Avatar>
          ))}
          {activeStaff.length > 4 && (
            <Avatar className="h-6 w-6 border-2 border-background">
              <AvatarFallback className="text-[10px] bg-muted">
                +{activeStaff.length - 4}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Staff en Turno
        </h3>
        <Badge variant="secondary">{activeStaff.length}</Badge>
      </div>

      {loading ? (
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          ))}
        </div>
      ) : activeStaff.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin personal registrado actualmente
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {activeStaff.map((emp) => (
            <div
              key={emp.id}
              className="flex items-center gap-2 px-2 py-1 bg-primary/5 rounded-full"
            >
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                  {getInitials(emp.full_name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{emp.full_name.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}