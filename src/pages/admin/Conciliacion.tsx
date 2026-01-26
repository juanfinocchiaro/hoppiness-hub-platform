import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Maximize2, Minimize2, RefreshCw, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Branch {
  id: string;
  name: string;
}

export default function Conciliacion() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { isSuperadmin, loading: roleLoading } = usePermissionsV2();
  const navigate = useNavigate();
  
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [expandedPanel, setExpandedPanel] = useState<'local' | 'marca' | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch branches for super admin
  useEffect(() => {
    const fetchBranches = async () => {
      const { data } = await supabase
        .from('branches')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (data && data.length > 0) {
        setBranches(data);
        setSelectedBranchId(data[0].id);
      }
    };

    if (user && isSuperadmin) {
      fetchBranches();
    }
  }, [user, isSuperadmin]);

  // Redirect if not authorized
  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate('/ingresar');
        return;
      }
      if (!isSuperadmin) {
        navigate('/admin');
      }
    }
  }, [user, authLoading, roleLoading, isSuperadmin, navigate]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl gradient-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isSuperadmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold">Acceso Restringido</h1>
          <p className="text-muted-foreground">Solo administradores pueden acceder a esta vista.</p>
          <Button onClick={() => navigate('/admin')}>Volver al Panel</Button>
        </div>
      </div>
    );
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const toggleExpand = (panel: 'local' | 'marca') => {
    setExpandedPanel(expandedPanel === panel ? null : panel);
  };

  // Mark iframe navigations so the header can avoid navigating only the iframe
  const embedQuery = '?embed=conciliacion';
  const localUrl = selectedBranchId ? `/local/${selectedBranchId}${embedQuery}` : '';
  const marcaUrl = `/admin${embedQuery}`;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Split panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panel Mi Local */}
        {expandedPanel !== 'marca' && (
          <div className={`flex flex-col border-r ${expandedPanel === 'local' ? 'flex-1' : 'w-1/2'}`}>
            <div className="bg-muted px-3 py-2 flex items-center justify-between shrink-0">
              <span className="text-sm font-medium">Panel Mi Local</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => toggleExpand('local')}
              >
                {expandedPanel === 'local' ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>
            </div>
            {selectedBranchId && (
              <iframe
                key={`local-${refreshKey}-${selectedBranchId}`}
                src={localUrl}
                className="flex-1 w-full border-0"
                title="Panel Mi Local"
              />
            )}
          </div>
        )}

        {/* Panel Mi Marca */}
        {expandedPanel !== 'local' && (
          <div className={`flex flex-col ${expandedPanel === 'marca' ? 'flex-1' : 'w-1/2'}`}>
            <div className="bg-muted px-3 py-2 flex items-center justify-between shrink-0">
              <span className="text-sm font-medium">Panel Mi Marca</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => toggleExpand('marca')}
              >
                {expandedPanel === 'marca' ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>
            </div>
            <iframe
              key={`marca-${refreshKey}`}
              src={marcaUrl}
              className="flex-1 w-full border-0"
              title="Panel Mi Marca"
            />
          </div>
        )}
      </div>
    </div>
  );
}
