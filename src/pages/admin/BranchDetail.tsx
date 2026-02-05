import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, MapPin, Settings, Users } from 'lucide-react';
import BranchEditPanel from '@/components/admin/BranchEditPanel';
import BranchTeamTab from '@/components/admin/BranchTeamTab';

type PublicStatus = 'active' | 'coming_soon' | 'hidden';

const statusConfig: Record<PublicStatus, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  active: { label: 'Activo', variant: 'default' },
  coming_soon: { label: 'Próximamente', variant: 'secondary' },
  hidden: { label: 'Oculto', variant: 'outline' },
};

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const publicStatus = ((branch as any).public_status as PublicStatus) || 'active';
  const config = statusConfig[publicStatus] || statusConfig.active;

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
        <Badge variant={config.variant}>
          {config.label}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList>
          <TabsTrigger value="info" className="gap-2">
            <Settings className="h-4 w-4" />
            Información
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            Equipo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <BranchEditPanel 
            key={branch.id}
            branch={branch} 
            onSaved={refetch} 
            onCancel={() => navigate('/mimarca')}
          />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <BranchTeamTab branchId={branch.id} branchName={branch.name} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
