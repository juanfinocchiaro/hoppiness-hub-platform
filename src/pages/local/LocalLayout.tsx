import { useEffect, useState, useCallback } from 'react';
import { Link, Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useRoleLanding } from '@/hooks/useRoleLanding';
import { usePanelAccess } from '@/hooks/usePanelAccess';
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
  DollarSign,
  History,
  QrCode,
  ToggleLeft,
  Plus,
  Calculator,
  FileText,
  Clock,
  Link2,
  MapPin,
  Printer,
  Timer,
  Boxes,
  ClipboardCheck,
  UserCircle,
  AlertCircle
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { Tables } from '@/integrations/supabase/types';
import LocalDashboard from '@/pages/local/LocalDashboard';
import ClockInModal from '@/components/attendance/ClockInModal';
import ActiveStaffWidget from '@/components/attendance/ActiveStaffWidget';

type Branch = Tables<'branches'>;

interface NavSection {
  id: string;
  label: string;
  icon: React.ElementType;
  show: boolean;
  items: NavItem[];
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  show: boolean;
}

export default function LocalLayout() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { isAdmin, isGerente, branchPermissions, roles, loading: roleLoading } = useUserRole();
  const { avatarInfo } = useRoleLanding();
  const { canUseLocalPanel, canUseBrandPanel, branchAccess, loading: panelLoading } = usePanelAccess();
  const navigate = useNavigate();
  const location = useLocation();
  const { branchId } = useParams();
  
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['operacion']));
  const [showClockInModal, setShowClockInModal] = useState(false);

  // Use branchAccess from usePanelAccess instead of accessibleBranches from useUserRole
  const accessibleBranches = branchAccess;

  // Redirect if not authenticated or no access
  useEffect(() => {
    if (!authLoading && !roleLoading && !panelLoading) {
      if (!user) {
        navigate('/ingresar');
        return;
      }
      // Check panel access
      if (!canUseLocalPanel) {
        if (canUseBrandPanel) {
          navigate('/admin');
        } else {
          navigate('/');
        }
        return;
      }
      if (accessibleBranches.length === 0) {
        navigate('/');
        return;
      }
    }
  }, [user, authLoading, roleLoading, panelLoading, canUseLocalPanel, canUseBrandPanel, accessibleBranches, navigate]);

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

  // Realtime subscription for branch status updates
  useEffect(() => {
    if (!branchId) return;

    const channel = supabase
      .channel(`branch-status-${branchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'branches',
          filter: `id=eq.${branchId}`,
        },
        (payload) => {
          const updated = payload.new as Branch;
          setSelectedBranch(prev => prev ? { ...prev, ...updated } : updated);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId]);

  // Auto-redirect to POS or KDS for specific roles on first load
  useEffect(() => {
    if (!selectedBranch || !branchId) return;
    
    // Solo redirigir automáticamente si estamos en el dashboard (sin sub-ruta)
    const isDashboard = location.pathname === `/local/${branchId}`;
    if (!isDashboard) return;

    if (avatarInfo.directToPOS) {
      navigate(`/local/${branchId}/pos`);
    } else if (avatarInfo.directToKDS) {
      navigate(`/local/${branchId}/kds`);
    }
  }, [selectedBranch, branchId, avatarInfo.directToPOS, avatarInfo.directToKDS, location.pathname, navigate]);

  const handleBranchChange = (newBranchId: string) => {
    // Extract the sub-path after /local/:branchId/
    const pathParts = location.pathname.split('/');
    const subPath = pathParts.slice(3).join('/');
    
    if (subPath) {
      navigate(`/local/${newBranchId}/${subPath}`);
    } else {
      navigate(`/local/${newBranchId}`);
    }
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
  const isFranquiciado = roles.includes('franquiciado');
  const canViewPL = isAdmin || isFranquiciado; // Solo admin o franquiciado pueden ver P&L

  // Navigation structure - Nueva estructura reorganizada
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
      label: 'Operación Diaria',
      icon: Zap,
      show: true,
      items: [
        { to: 'pos', label: 'Punto de Venta', icon: Monitor, show: true },
        { to: 'kds', label: 'Cocina (KDS)', icon: ChefHat, show: true },
        { to: 'pedidos', label: 'Pedidos Activos', icon: ClipboardList, show: true },
        { to: 'historial', label: 'Historial', icon: History, show: true },
      ]
    },
    {
      id: 'caja',
      label: 'Caja y Pagos',
      icon: Wallet,
      show: canManageConfig,
      items: [
        { to: 'caja', label: 'Caja del Día', icon: Calculator, show: true },
        { to: 'cuenta-corriente', label: 'Cuenta Corriente', icon: UserCircle, show: true },
        { to: 'cierre', label: 'Cierre del Día', icon: ClipboardCheck, show: true },
      ]
    },
    {
      id: 'stock',
      label: 'Stock y Compras',
      icon: Boxes,
      show: canManageProducts,
      items: [
        { to: 'stock', label: 'Stock Actual', icon: Boxes, show: true },
        { to: 'stock/conteo', label: 'Conteo Inventario', icon: ClipboardCheck, show: true },
        { to: 'stock/cmv', label: 'Reporte CMV', icon: Calculator, show: canViewReports },
      ]
    },
    {
      id: 'menu',
      label: 'Menú del Local',
      icon: Package,
      show: canManageProducts,
      items: [
        { to: 'menu/productos', label: 'Productos', icon: Package, show: true },
        { to: 'menu/extras', label: 'Extras', icon: Plus, show: true },
      ]
    },
    {
      id: 'equipo',
      label: 'Equipo',
      icon: Users,
      show: canManageConfig,
      items: [
        { to: 'equipo', label: 'Mi Equipo', icon: Users, show: true },
        { to: 'equipo/fichar', label: 'Fichar', icon: Timer, show: true },
        { to: 'equipo/horarios', label: 'Horarios', icon: Clock, show: true },
        { to: 'equipo/horas', label: 'Horas del Mes', icon: Calculator, show: canViewReports },
        { to: 'equipo/liquidacion', label: 'Liquidación', icon: Wallet, show: canViewReports },
      ]
    },
    {
      id: 'finanzas',
      label: 'Finanzas',
      icon: DollarSign,
      show: canManageConfig,
      items: [
        { to: 'finanzas/movimientos', label: 'Movimientos', icon: Receipt, show: true },
        { to: 'finanzas/proveedores', label: 'Proveedores', icon: Truck, show: true },
        { to: 'finanzas/facturas', label: 'Facturas Emitidas', icon: FileText, show: true },
        { to: 'finanzas/obligaciones', label: 'Obligaciones', icon: DollarSign, show: canViewReports },
        { to: 'finanzas/reportes', label: 'Reportes', icon: FileText, show: canViewReports },
      ]
    },
    {
      id: 'config',
      label: 'Configuración',
      icon: Settings,
      show: canManageConfig,
      items: [
        { to: 'config/local', label: 'Datos del Local', icon: Store, show: true },
        { to: 'config/zonas', label: 'Zonas Delivery', icon: MapPin, show: true },
        { to: 'config/integraciones', label: 'Integraciones', icon: Link2, show: true },
        { to: 'config/impresoras', label: 'Impresoras', icon: Printer, show: true },
        { to: 'config/kds', label: 'Config KDS', icon: ChefHat, show: true },
      ]
    }
  ].filter(section => section.show);

  if (authLoading || roleLoading || panelLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show access denied if no local panel access
  if (!canUseLocalPanel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold">Sin acceso al Panel Local</h1>
          <p className="text-muted-foreground">No tenés permisos para acceder a esta sección.</p>
          {canUseBrandPanel && (
            <Link to="/admin">
              <Button>
                <Home className="w-4 h-4 mr-2" />
                Ir a Panel Marca
              </Button>
            </Link>
          )}
        </div>
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

  const isItemActive = (item: NavItem): boolean => {
    if (item.to === '') {
      return location.pathname === `/local/${branchId}`;
    }
    // Match exact path or path that starts with the item's path
    const itemPath = `/local/${branchId}/${item.to}`;
    return location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);
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
            <Link key={section.id} to={`/local/${branchId}`}>
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

                return (
                  <Link 
                    key={item.to || idx} 
                    to={item.to ? `/local/${branchId}/${item.to}` : `/local/${branchId}`}
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

  // Render content based on route
  const renderContent = () => {
    if (!selectedBranch) return null;

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
                {canUseBrandPanel && (
                  <Link to="/admin">
                    <Button variant="outline" className="w-full" size="sm">
                      <Home className="w-4 h-4 mr-2" />
                      Ir a Panel Marca
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
              <div className="mt-2 space-y-2">
                <Badge 
                  variant={selectedBranch.is_open ? 'default' : 'secondary'} 
                >
                  {selectedBranch.is_open ? '🟢 Abierto' : '🔴 Cerrado'}
                </Badge>
                <ActiveStaffWidget branchId={selectedBranch.id} compact />
              </div>
            )}
          </div>
          
          {/* Clock In Button */}
          <div className="px-3 py-2 border-b">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={() => setShowClockInModal(true)}
            >
              <Timer className="h-4 w-4" />
              Fichar Asistencia
            </Button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto">
            <NavContent />
          </div>
          
          <div className="p-3 border-t space-y-1">
            {canUseBrandPanel && (
              <Link to="/admin">
                <Button variant="ghost" className="w-full justify-start" size="sm">
                  <Home className="w-4 h-4 mr-3" />
                  Panel Marca
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

      {/* Clock In Modal */}
      {branchId && (
        <ClockInModal
          open={showClockInModal}
          onOpenChange={setShowClockInModal}
          branchId={branchId}
        />
      )}
    </div>
  );
}
