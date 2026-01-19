import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Settings,
  LogOut,
  Menu,
  ChevronRight,
  ChevronDown,
  Store,
  Home,
  RefreshCw,
  ShoppingCart,
  ChefHat,
  Monitor,
  Receipt
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { Tables } from '@/integrations/supabase/types';
import POSView from '@/components/pos/POSView';
import KDSView from '@/components/pos/KDSView';
import LocalDashboard from '@/pages/local/LocalDashboard';

type Branch = Tables<'branches'>;

type ActivePOSView = 'none' | 'pos' | 'kds';

export default function LocalLayout() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { isAdmin, isGerente, accessibleBranches, branchPermissions, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  const { branchId } = useParams();
  
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [posOpen, setPosOpen] = useState(false);
  const [activePOSView, setActivePOSView] = useState<ActivePOSView>('none');

  // Redirect if not authenticated or no access
  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate('/auth');
        return;
      }
      // Must be admin, gerente, or have branch permissions
      if (!isAdmin && !isGerente && accessibleBranches.length === 0) {
        navigate('/');
        return;
      }
    }
  }, [user, authLoading, roleLoading, isAdmin, isGerente, accessibleBranches, navigate]);

  // Set selected branch from URL or default
  useEffect(() => {
    if (branchId && accessibleBranches.length > 0) {
      const branch = accessibleBranches.find(b => b.id === branchId);
      if (branch) {
        setSelectedBranch(branch);
      } else if (!isAdmin) {
        // User doesn't have access to this branch
        navigate('/local');
      }
    } else if (!branchId && accessibleBranches.length > 0) {
      // No branch in URL, redirect to first accessible with dashboard
      navigate(`/local/${accessibleBranches[0].id}`);
    }
  }, [branchId, accessibleBranches, isAdmin, navigate]);

  // Reset POS view when changing branch
  useEffect(() => {
    setActivePOSView('none');
  }, [branchId]);

  const handleBranchChange = (newBranchId: string) => {
    const currentPath = location.pathname.split('/').slice(-1)[0];
    setActivePOSView('none');
    navigate(`/local/${newBranchId}/${currentPath}`);
  };

  const handlePOSItemClick = (view: 'pos' | 'kds') => {
    setActivePOSView(view);
  };

  // Get permissions for current branch
  const currentPermissions = branchPermissions.find(p => p.branch_id === branchId);
  const canManageProducts = isAdmin || isGerente || currentPermissions?.can_manage_products;
  const canManageConfig = isAdmin || isGerente || currentPermissions?.can_manage_staff;

  const navItems = [
    { to: '', icon: LayoutDashboard, label: 'Dashboard', show: true, exact: true },
    { to: 'pedidos', icon: ClipboardList, label: 'Pedidos', show: true, exact: false },
    { to: 'transacciones', icon: Receipt, label: 'Transacciones', show: canManageConfig, exact: false },
    { to: 'productos', icon: Package, label: 'Productos', show: canManageProducts, exact: false },
    { to: 'config', icon: Settings, label: 'Configuración', show: canManageConfig, exact: false },
  ].filter(item => item.show);

  const posItems = [
    { id: 'pos' as const, icon: Monitor, label: 'Tomar Pedidos' },
    { id: 'kds' as const, icon: ChefHat, label: 'Cocina (KDS)' },
  ];

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Branch selection screen if no branch selected
  if (!branchId) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Panel de Sucursal</h1>
            <p className="text-muted-foreground">Seleccioná tu sucursal para comenzar</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accessibleBranches.map(branch => (
              <div
                key={branch.id}
                className="bg-card border rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow hover:border-primary"
                onClick={() => navigate(`/local/${branch.id}`)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Store className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-lg">{branch.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{branch.address}, {branch.city}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleNavItemClick = () => {
    setActivePOSView('none');
  };

  const NavContent = () => (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const fullPath = item.to ? `/local/${branchId}/${item.to}` : `/local/${branchId}`;
        const isActive = item.exact 
          ? location.pathname === `/local/${branchId}` && activePOSView === 'none'
          : location.pathname.includes(item.to) && activePOSView === 'none';
        return (
          <Link key={item.to || 'dashboard'} to={fullPath} onClick={handleNavItemClick}>
            <Button
              variant={isActive ? 'secondary' : 'ghost'}
              className={`w-full justify-start ${isActive ? 'bg-primary/10 text-primary' : ''}`}
            >
              <item.icon className="w-4 h-4 mr-3" />
              {item.label}
              {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
            </Button>
          </Link>
        );
      })}
      
      {/* POS Submenu */}
      <Collapsible open={posOpen} onOpenChange={setPosOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className={`w-full justify-start ${activePOSView !== 'none' ? 'bg-primary/10 text-primary' : ''}`}
          >
            <ShoppingCart className="w-4 h-4 mr-3" />
            Punto de Venta
            {posOpen ? (
              <ChevronDown className="w-4 h-4 ml-auto" />
            ) : (
              <ChevronRight className="w-4 h-4 ml-auto" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-4 space-y-1 mt-1">
          {posItems.map((item) => {
            const isActive = activePOSView === item.id;
            return (
              <Button
                key={item.id}
                variant={isActive ? 'secondary' : 'ghost'}
                size="sm"
                className={`w-full justify-start ${isActive ? 'bg-primary/10 text-primary' : ''}`}
                onClick={() => handlePOSItemClick(item.id)}
              >
                <item.icon className="w-4 h-4 mr-3" />
                {item.label}
              </Button>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    </nav>
  );

  // Render content based on active view
  const renderContent = () => {
    if (!selectedBranch) return null;

    if (activePOSView === 'pos') {
      return <POSView branch={selectedBranch} />;
    }
    
    if (activePOSView === 'kds') {
      return <KDSView branch={selectedBranch} />;
    }

    // Show dashboard on index route
    const isDashboard = location.pathname === `/local/${branchId}`;
    if (isDashboard) {
      return <LocalDashboard branch={selectedBranch} />;
    }

    return <Outlet context={{ branch: selectedBranch, permissions: currentPermissions }} />;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between p-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-4">
              <div className="mb-6">
                <h2 className="text-lg font-bold">Panel Mi Local</h2>
                <p className="text-sm text-muted-foreground">{selectedBranch?.name}</p>
              </div>
              <NavContent />
              <div className="absolute bottom-4 left-4 right-4 space-y-2">
                <Link to="/admin">
                  <Button variant="outline" className="w-full" size="sm">
                    <Home className="w-4 h-4 mr-2" />
                    Ir a Admin
                  </Button>
                </Link>
                <Button variant="outline" className="w-full" onClick={signOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar Sesión
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <h1 className="font-bold">{selectedBranch?.name || 'Mi Local'}</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-card border-r">
          <div className="p-6 border-b">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Store className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">Panel Mi Local</span>
            </Link>
          </div>
          
          {/* Branch Selector */}
          <div className="p-4 border-b">
            <Select value={branchId} onValueChange={handleBranchChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar sucursal" />
              </SelectTrigger>
              <SelectContent>
                {accessibleBranches.map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBranch && (
              <Badge 
                variant={selectedBranch.is_active ? 'default' : 'secondary'} 
                className="mt-2"
              >
                {selectedBranch.is_active ? 'Abierto' : 'Cerrado'}
              </Badge>
            )}
          </div>
          
          <div className="flex-1 p-4">
            <NavContent />
          </div>
          
          <div className="p-4 border-t space-y-2">
            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" className="w-full justify-start" size="sm">
                  <Home className="w-4 h-4 mr-3" />
                  Ir a Admin
                </Button>
              </Link>
            )}
            <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-3" />
              Cerrar Sesión
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64">
          <div className="p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
