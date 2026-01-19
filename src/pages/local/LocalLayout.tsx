import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
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
  Package,
  Settings,
  LogOut,
  Menu,
  ChevronRight,
  ChevronDown,
  Store,
  Home,
  RefreshCw,
  ChefHat,
  Monitor,
  Receipt,
  Zap,
  Wallet,
  Users,
  Truck,
  ClipboardList,
  History,
  QrCode,
  ToggleLeft,
  Plus,
  Calculator,
  FileText,
  Clock,
  MapPin,
  Printer
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

interface NavSection {
  id: string;
  label: string;
  icon: React.ElementType;
  show: boolean;
  items: NavItem[];
}

interface NavItem {
  to?: string;
  label: string;
  icon: React.ElementType;
  action?: 'pos' | 'kds';
  show: boolean;
}

export default function LocalLayout() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { isAdmin, isGerente, accessibleBranches, branchPermissions, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  const { branchId } = useParams();
  
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [activePOSView, setActivePOSView] = useState<ActivePOSView>('none');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['operacion']));

  // Redirect if not authenticated or no access
  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate('/auth');
        return;
      }
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
        navigate('/local');
      }
    } else if (!branchId && accessibleBranches.length > 0) {
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

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Get permissions for current branch
  const currentPermissions = branchPermissions.find(p => p.branch_id === branchId);
  const canManageProducts = isAdmin || isGerente || currentPermissions?.can_manage_products;
  const canManageConfig = isAdmin || isGerente || currentPermissions?.can_manage_staff;
  const canViewReports = isAdmin || isGerente || currentPermissions?.can_view_reports;

  // Navigation structure
  const navSections: NavSection[] = [
    {
      id: 'dashboard',
      label: 'Escritorio',
      icon: LayoutDashboard,
      show: true,
      items: [
        { to: '', label: 'Resumen del Día', icon: LayoutDashboard, show: true },
      ]
    },
    {
      id: 'operacion',
      label: 'Operación',
      icon: Zap,
      show: true,
      items: [
        { label: 'Tomar Pedidos', icon: Monitor, action: 'pos' as const, show: true },
        { label: 'Cocina (KDS)', icon: ChefHat, action: 'kds' as const, show: true },
        { to: 'pedidos', label: 'Gestor de Pedidos', icon: ClipboardList, show: true },
        { to: 'historial', label: 'Historial', icon: History, show: true },
      ]
    },
    {
      id: 'menu',
      label: 'Menú & Stock',
      icon: Package,
      show: canManageProducts,
      items: [
        { to: 'disponibilidad', label: 'Disponibilidad (86)', icon: ToggleLeft, show: true },
        { to: 'productos', label: 'Productos', icon: Package, show: true },
      ]
    },
    {
      id: 'finanzas',
      label: 'Finanzas',
      icon: Wallet,
      show: canManageConfig,
      items: [
        { to: 'transacciones', label: 'Movimientos', icon: Receipt, show: true },
        { to: 'caja', label: 'Caja', icon: Calculator, show: true },
        { to: 'proveedores', label: 'Proveedores', icon: Truck, show: true },
        { to: 'rrhh', label: 'RRHH', icon: Users, show: true },
        { to: 'estado-resultados', label: 'Reporte P&L', icon: FileText, show: canViewReports },
      ]
    },
    {
      id: 'config',
      label: 'Configuración',
      icon: Settings,
      show: canManageConfig,
      items: [
        { to: 'config', label: 'Mi Sucursal', icon: Store, show: true },
        { to: 'usuarios', label: 'Usuarios', icon: Users, show: isAdmin || isGerente },
        { to: 'impresoras', label: 'Impresoras', icon: Printer, show: true },
      ]
    }
  ].filter(section => section.show);

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
            <h1 className="text-3xl font-bold mb-2">Panel Mi Local</h1>
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

  const isItemActive = (item: NavItem): boolean => {
    if (item.action) {
      return activePOSView === item.action;
    }
    if (item.to === '') {
      return location.pathname === `/local/${branchId}` && activePOSView === 'none';
    }
    return location.pathname.includes(`/${item.to}`) && activePOSView === 'none';
  };

  const NavContent = () => (
    <nav className="space-y-1">
      {navSections.map((section) => {
        const isExpanded = expandedSections.has(section.id);
        const hasActiveItem = section.items.some(item => item.show && isItemActive(item));
        
        // Single item sections (like Dashboard) - render as direct link
        if (section.items.length === 1 && section.items[0].to === '') {
          const item = section.items[0];
          const isActive = isItemActive(item);
          return (
            <Link key={section.id} to={`/local/${branchId}`} onClick={handleNavItemClick}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className={`w-full justify-start ${isActive ? 'bg-primary/10 text-primary' : ''}`}
              >
                <section.icon className="w-4 h-4 mr-3" />
                {section.label}
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Button>
            </Link>
          );
        }

        return (
          <Collapsible 
            key={section.id} 
            open={isExpanded} 
            onOpenChange={() => toggleSection(section.id)}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className={`w-full justify-start ${hasActiveItem ? 'bg-primary/5 text-primary' : ''}`}
              >
                <section.icon className="w-4 h-4 mr-3" />
                {section.label}
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 ml-auto" />
                ) : (
                  <ChevronRight className="w-4 h-4 ml-auto" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 space-y-0.5 mt-1">
              {section.items.filter(item => item.show).map((item, idx) => {
                const isActive = isItemActive(item);
                
                if (item.action) {
                  return (
                    <Button
                      key={item.action}
                      variant={isActive ? 'secondary' : 'ghost'}
                      size="sm"
                      className={`w-full justify-start ${isActive ? 'bg-primary/10 text-primary' : ''}`}
                      onClick={() => handlePOSItemClick(item.action!)}
                    >
                      <item.icon className="w-4 h-4 mr-3" />
                      {item.label}
                    </Button>
                  );
                }

                return (
                  <Link 
                    key={item.to || idx} 
                    to={item.to ? `/local/${branchId}/${item.to}` : `/local/${branchId}`}
                    onClick={handleNavItemClick}
                  >
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      size="sm"
                      className={`w-full justify-start ${isActive ? 'bg-primary/10 text-primary' : ''}`}
                    >
                      <item.icon className="w-4 h-4 mr-3" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
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
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="outline" className="w-full" size="sm">
                      <Home className="w-4 h-4 mr-2" />
                      Ir a Admin
                    </Button>
                  </Link>
                )}
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
              <span className="text-lg font-bold">Mi Local</span>
            </Link>
          </div>
          
          {/* Branch Selector */}
          <div className="p-4 border-b">
            <Select value={branchId} onValueChange={handleBranchChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Sucursal" />
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
                variant={selectedBranch.is_open ? 'default' : 'secondary'} 
                className="mt-2"
              >
                {selectedBranch.is_open ? '🟢 Abierto' : '🔴 Cerrado'}
              </Badge>
            )}
          </div>
          
          <div className="flex-1 p-3 overflow-y-auto">
            <NavContent />
          </div>
          
          <div className="p-3 border-t space-y-1">
            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" className="w-full justify-start" size="sm">
                  <Home className="w-4 h-4 mr-3" />
                  Panel Admin
                </Button>
              </Link>
            )}
            <Button variant="ghost" className="w-full justify-start text-muted-foreground" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-3" />
              Salir
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
