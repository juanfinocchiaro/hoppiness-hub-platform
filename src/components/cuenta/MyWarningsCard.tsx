import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Calendar, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface Warning {
  id: string;
  warning_type: string;
  description: string;
  warning_date: string;
  acknowledged_at: string | null;
  issuer?: { full_name: string };
}

const WARNING_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  verbal: { label: 'Verbal', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  written: { label: 'Escrito', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  late_arrival: { label: 'Llegada tarde', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  absence: { label: 'Inasistencia', color: 'bg-red-100 text-red-800 border-red-300' },
  suspension: { label: 'Suspensión', color: 'bg-red-200 text-red-900 border-red-400' },
  other: { label: 'Otro', color: 'bg-gray-100 text-gray-800 border-gray-300' },
};

export default function MyWarningsCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Get warnings for current user - try user_id first, then match by employee
  const { data: warnings, isLoading } = useQuery({
    queryKey: ['my-warnings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // First get warnings directly by user_id
      const { data, error } = await supabase
        .from('warnings')
        .select(`
          id,
          warning_type,
          description,
          warning_date,
          acknowledged_at,
          issued_by
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('warning_date', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      // Fetch issuer names separately if needed
      const issuerIds = [...new Set(data?.map(w => w.issued_by).filter(Boolean))];
      let issuerMap: Record<string, string> = {};
      
      if (issuerIds.length > 0) {
        const { data: issuers } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', issuerIds);
        
        issuers?.forEach(i => {
          if (i.user_id) issuerMap[i.user_id] = i.full_name || '';
        });
      }
      
      return (data || []).map(w => ({
        ...w,
        issuer: w.issued_by ? { full_name: issuerMap[w.issued_by] || 'Desconocido' } : undefined
      })) as Warning[];
    },
    enabled: !!user,
  });

  // Mutation to mark as seen
  const acknowledgeMutation = useMutation({
    mutationFn: async (warningId: string) => {
      const { error } = await supabase
        .from('warnings')
        .update({ acknowledged_at: new Date().toISOString() })
        .eq('id', warningId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-warnings'] });
      toast.success('Apercibimiento marcado como visto');
    },
    onError: () => {
      toast.error('Error al marcar como visto');
    },
  });

  const getTypeBadge = (type: string) => {
    const config = WARNING_TYPE_LABELS[type] || WARNING_TYPE_LABELS.other;
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const unreadCount = warnings?.filter(w => !w.acknowledged_at).length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Don't show if no warnings
  if (!warnings || warnings.length === 0) {
    return null;
  }

  return (
    <Card className={unreadCount > 0 ? 'border-yellow-300 bg-yellow-50/30' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${unreadCount > 0 ? 'text-yellow-600' : 'text-muted-foreground'}`} />
            <CardTitle className="text-lg">Mis Apercibimientos</CardTitle>
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive">
              {unreadCount} sin ver
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {warnings.map((warning) => (
          <div 
            key={warning.id} 
            className={`p-3 rounded-lg border ${
              !warning.acknowledged_at 
                ? 'bg-yellow-50 border-yellow-200' 
                : 'bg-muted/50 border-muted'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {getTypeBadge(warning.warning_type)}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(warning.warning_date), "d 'de' MMMM yyyy", { locale: es })}
                  </span>
                </div>
                <p className="text-sm">{warning.description}</p>
                {warning.issuer && (
                  <p className="text-xs text-muted-foreground">
                    Por: {(warning.issuer as any).full_name}
                  </p>
                )}
              </div>
              
              <div className="flex-shrink-0">
                {warning.acknowledged_at ? (
                  <Badge variant="secondary" className="gap-1">
                    <Eye className="w-3 h-3" />
                    Visto
                  </Badge>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => acknowledgeMutation.mutate(warning.id)}
                    disabled={acknowledgeMutation.isPending}
                    className="gap-1"
                  >
                    <EyeOff className="w-3 h-3" />
                    Marcar visto
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
