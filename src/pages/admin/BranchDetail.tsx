import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Building2, Clock, Users, Receipt, BarChart3 } from 'lucide-react';
import BranchEditPanel from '@/components/admin/BranchEditPanel';
import BranchSalesTab from '@/components/admin/BranchSalesTab';

export default function BranchDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('datos');

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
        <Button variant="ghost" onClick={() => navigate('/admin')}>
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
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
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

      {/* Tabs - Simplificado */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="datos" className="gap-1.5">
            <Building2 className="h-4 w-4" />
            <span className="hidden lg:inline">Datos</span>
          </TabsTrigger>
          <TabsTrigger value="horarios" className="gap-1.5">
            <Clock className="h-4 w-4" />
            <span className="hidden lg:inline">Horarios</span>
          </TabsTrigger>
          <TabsTrigger value="equipo" className="gap-1.5">
            <Users className="h-4 w-4" />
            <span className="hidden lg:inline">Equipo</span>
          </TabsTrigger>
          <TabsTrigger value="ventas" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden lg:inline">Ventas</span>
          </TabsTrigger>
          <TabsTrigger value="fiscal" className="gap-1.5">
            <Receipt className="h-4 w-4" />
            <span className="hidden lg:inline">Fiscal</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="datos" className="mt-4">
          <BranchEditPanel 
            branch={branch} 
            onSaved={refetch} 
            onCancel={() => navigate('/admin')}
            initialTab="datos"
          />
        </TabsContent>
        
        <TabsContent value="horarios" className="mt-4">
          <BranchEditPanel 
            branch={branch} 
            onSaved={refetch} 
            onCancel={() => navigate('/admin')}
            initialTab="horarios"
          />
        </TabsContent>
        
        <TabsContent value="equipo" className="mt-4">
          <BranchEditPanel 
            branch={branch} 
            onSaved={refetch} 
            onCancel={() => navigate('/admin')}
            initialTab="equipo"
          />
        </TabsContent>
        
        <TabsContent value="ventas" className="mt-4">
          <BranchSalesTab branchId={branch.id} branchName={branch.name} />
        </TabsContent>
        
        <TabsContent value="fiscal" className="mt-4">
          <BranchEditPanel 
            branch={branch} 
            onSaved={refetch} 
            onCancel={() => navigate('/admin')}
            initialTab="fiscal"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
