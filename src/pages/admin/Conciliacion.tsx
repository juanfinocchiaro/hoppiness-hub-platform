import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
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
  const { isAdmin, loading: roleLoading } = useUserRole();
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

    if (user && isAdmin) {
      fetchBranches();
    }
  }, [user, isAdmin]);

  // Redirect if not authorized
  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate('/ingresar');
        return;
      }
      if (!isAdmin) {
        navigate('/admin');
      }
    }
  }, [user, authLoading, roleLoading, isAdmin, navigate]);

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

  if (!isAdmin) {
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

  const localUrl = selectedBranchId ? `/local/${selectedBranchId}` : '';
  const marcaUrl = '/admin';

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold">Panel Conciliación</h1>
          
          {branches.length > 0 && (
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger className="w-[200px] bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground">
                <SelectValue placeholder="Seleccionar sucursal" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRefresh}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={signOut}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

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
