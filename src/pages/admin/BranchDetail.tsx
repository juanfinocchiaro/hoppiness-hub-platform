import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin } from 'lucide-react';
import BranchEditPanel from '@/components/admin/BranchEditPanel';

export default function BranchDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: branch, isLoading, refetch } = useQuery({
    queryKey: ['branch-detail', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('slug', slug)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/mimarca')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold">Sucursal no encontrada</h2>
          <p className="text-muted-foreground">No existe una sucursal con ese identificador</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/mimarca')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver
            </Button>
          </div>
          <h1 className="text-3xl font-bold">{branch.name}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{branch.address}, {branch.city}</span>
          </div>
        </div>
        <Badge variant={branch.is_active ? 'default' : 'secondary'}>
          {branch.is_active ? 'Activa' : 'Inactiva'}
        </Badge>
      </div>

      {/* Panel de edición con tabs */}
      <BranchEditPanel 
        branch={branch} 
        onSaved={refetch} 
        onCancel={() => navigate('/mimarca')}
      />
    </div>
  );
}
