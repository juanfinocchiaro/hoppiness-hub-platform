/**
 * LocalLayout - Panel "Mi Local" SIMPLIFICADO
 * 
 * Solo contiene:
 * - Dashboard (con carga de ventas por turno)
 * - Equipo (Mi equipo, Horarios, Fichajes)
 * - Configuración (solo Impresoras)
 */
import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import { useRoleLandingV2 } from '@/hooks/useRoleLandingV2';
import { useEmbedMode } from '@/hooks/useEmbedMode';
import { ExternalLink } from '@/components/ui/ExternalLink';
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
  Settings,
  LogOut,
  Menu,
  ChevronRight,
  ChevronDown,
  Store,
  Home,
  Users,
  Clock,
  Printer,
  AlertCircle,
  Building2,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { Tables } from '@/integrations/supabase/types';
import LocalDashboard from '@/pages/local/LocalDashboard';
import logoHoppinessBlue from '@/assets/logo-hoppiness-blue.png';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';

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
  const { branchId } = useParams();
  
  const permissions = usePermissionsV2(branchId);
  const { avatarInfo, canAccessLocal, canAccessAdmin } = useRoleLandingV2();
  const { isEmbedded } = useEmbedMode();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['equipo']));

  const { accessibleBranches, loading: permLoading, local: lp } = permissions;

  // Redirect if not authenticated or no access
  useEffect(() => {
    if (!authLoading && !permLoading) {
      if (!user) {
        navigate('/ingresar');
        return;
      }
      if (!canAccessLocal) {
        navigate(avatarInfo.landingPath);
        return;
      }
      if (accessibleBranches.length === 0 && !permissions.isSuperadmin) {
        navigate('/cuenta');
        return;
      }
    }
  }, [user, authLoading, permLoading, canAccessLocal, accessibleBranches, permissions.isSuperadmin, navigate, avatarInfo.landingPath]);

  // Set selected branch from URL or default
  useEffect(() => {
    if (branchId && accessibleBranches.length > 0) {
      const branch = accessibleBranches.find(b => b.id === branchId);
      if (branch) {
        setSelectedBranch(branch);
      } else if (!permissions.isSuperadmin) {
        navigate('/milocal');
      }
    } else if (!branchId && accessibleBranches.length > 0) {
      navigate(`/milocal/${accessibleBranches[0].id}`);
    }
  }, [branchId, accessibleBranches, permissions.isSuperadmin, navigate]);

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

  // Redirect cajeros/empleados a Mi Cuenta
  useEffect(() => {
    if (!selectedBranch || !branchId) return;
    
    if (permissions.isCajero || permissions.isEmpleado) {
      navigate('/cuenta');
    }
  }, [selectedBranch, branchId, permissions.isCajero, permissions.isEmpleado, navigate]);

  const handleBranchChange = (newBranchId: string) => {
    const pathParts = location.pathname.split('/');
    const subPath = pathParts.slice(3).join('/');
    
    if (subPath) {
      navigate(`/milocal/${newBranchId}/${subPath}`);
    } else {
      navigate(`/milocal/${newBranchId}`);
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

  // ===== NAVEGACIÓN ULTRA SIMPLIFICADA =====
  const navSections: NavSection[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      show: lp.canViewDashboard,
      items: [
        { to: '', label: 'Dashboard', icon: LayoutDashboard, show: lp.canViewDashboard },
      ]
    },
    {
      id: 'equipo',
      label: 'Equipo',
      icon: Users,
      show: lp.canViewTeam || lp.canViewAllClockIns,
      items: [
        { to: 'equipo', label: 'Mi Equipo', icon: Users, show: lp.canViewTeam },
        { to: 'equipo/horarios', label: 'Horarios', icon: Clock, show: lp.canEditSchedules },
        { to: 'equipo/fichajes', label: 'Fichajes', icon: Clock, show: lp.canViewAllClockIns },
      ]
    },
    {
      id: 'config',
      label: 'Configuración',
      icon: Settings,
      show: lp.canConfigPrinters,
      items: [
        { to: 'config/impresoras', label: 'Impresoras', icon: Printer, show: lp.canConfigPrinters },
      ]
    }
  ].filter(section => section.show);

  if (authLoading || permLoading) {
    return <HoppinessLoader fullScreen size="lg" />;
  }

  if (!canAccessLocal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold">Sin acceso al Panel Local</h1>
          <p className="text-muted-foreground">No tenés permisos para acceder a esta sección.</p>
          {canAccessAdmin && (
            <Link to="/mimarca">
              <Button>
                <Home className="w-4 h-4 mr-2" />
                Ir a Mi Marca
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Branch selection screen
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
                onClick={() => navigate(`/milocal/${branch.id}`)}
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
      return location.pathname === `/milocal/${branchId}`;
    }
    const itemPath = `/milocal/${branchId}/${item.to}`;
    return location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);
  };

  const NavContent = () => (
    <nav className="space-y-1">
      {navSections.map((section) => {
        const isExpanded = expandedSections.has(section.id);
        const hasActiveItem = section.items.some(item => item.show && isItemActive(item));
        
        // Single dashboard item
        if (section.items.length === 1 && section.items[0].to === '') {
          const item = section.items[0];
          const isActive = isItemActive(item);
          return (
            <Link key={section.id} to={`/milocal/${branchId}`}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className={`w-full justify-start ${isActive ? 'bg-primary/10 text-primary' : ''}`}
              >
                <section.icon className="w-4 h-4 mr-3" />
                {section.label}
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
                    to={item.to ? `/milocal/${branchId}/${item.to}` : `/milocal/${branchId}`}
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

  const renderContent = () => {
    if (!selectedBranch) return null;

    const isDashboard = location.pathname === `/milocal/${branchId}`;
    if (isDashboard) {
      return <LocalDashboard branch={selectedBranch} />;
    }

    return <Outlet context={{ branch: selectedBranch, permissions: lp }} />;
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
            <SheetContent side="left" className="w-72 p-4">
              <div className="mb-4 flex items-center gap-3">
                <img 
                  src={logoHoppinessBlue} 
                  alt="Hoppiness" 
                  className="w-14 h-14 rounded-xl object-contain bg-white p-1"
                />
                <div>
                  <h2 className="text-lg font-bold">Mi Local</h2>
                  <p className="text-sm text-muted-foreground">{selectedBranch?.name}</p>
                  <Badge variant="outline" className="text-xs">
                    {avatarInfo.label}
                  </Badge>
                </div>
              </div>
              
              <NavContent />
              
              <div className="absolute bottom-4 left-4 right-4 space-y-1">
                {canAccessAdmin && !isEmbedded && (
                  <ExternalLink to="/mimarca">
                    <Button variant="ghost" className="w-full justify-start">
                      <Building2 className="w-4 h-4 mr-3" />
                      Cambiar a Mi Marca
                    </Button>
                  </ExternalLink>
                )}
                <ExternalLink to="/">
                  <Button variant="ghost" className="w-full justify-start">
                    <Home className="w-4 h-4 mr-3" />
                    Volver al Inicio
                  </Button>
                </ExternalLink>
                <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={signOut}>
                  <LogOut className="w-4 h-4 mr-3" />
                  Salir
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
        <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 bg-card border-r">
          <div className="p-6 border-b flex items-center gap-3">
            <img 
              src={logoHoppinessBlue} 
              alt="Hoppiness" 
              className="w-14 h-14 rounded-xl object-contain bg-white p-1"
            />
            <div>
              <h2 className="text-lg font-bold">Mi Local</h2>
              <Badge variant="outline" className="text-xs">
                {avatarInfo.label}
              </Badge>
            </div>
          </div>

          {/* Branch Selector */}
          {accessibleBranches.length > 1 && (
            <div className="p-4 border-b">
              <Select value={branchId} onValueChange={handleBranchChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar local" />
                </SelectTrigger>
                <SelectContent>
                  {accessibleBranches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Single branch display */}
          {accessibleBranches.length === 1 && selectedBranch && (
            <div className="p-4 border-b">
              <div className="flex items-center gap-2 text-sm">
                <Store className="w-4 h-4 text-primary" />
                <span className="font-medium">{selectedBranch.name}</span>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto p-4">
            <NavContent />
          </div>

          {/* Footer */}
          <div className="p-4 border-t space-y-1">
            {canAccessAdmin && !isEmbedded && (
              <ExternalLink to="/mimarca">
                <Button variant="ghost" className="w-full justify-start">
                  <Building2 className="w-4 h-4 mr-3" />
                  Cambiar a Mi Marca
                </Button>
              </ExternalLink>
            )}
            <ExternalLink to="/">
              <Button variant="ghost" className="w-full justify-start">
                <Home className="w-4 h-4 mr-3" />
                Volver al Inicio
              </Button>
            </ExternalLink>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-muted-foreground" 
              onClick={signOut}
            >
              <LogOut className="w-4 h-4 mr-3" />
              Salir
            </Button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:ml-72">
          <div className="p-4 md:p-6 lg:p-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
