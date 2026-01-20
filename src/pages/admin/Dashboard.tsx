import { useEffect, useState, useMemo } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoleLanding } from '@/hooks/useRoleLanding';
import { usePanelAccess } from '@/hooks/usePanelAccess';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Store,
  Package,
  Users,
  Truck,
  LogOut,
  Menu,
  ChevronRight,
  ChevronDown,
  ClipboardList,
  BarChart3,
  Building2,
  ChefHat,
  Shield,
  UtensilsCrossed,
  TrendingUp,
  Landmark,
  ShieldCheck,
  Boxes,
  ShoppingCart,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  exact?: boolean;
}

interface NavSection {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

// Solo items fijos sin sección
const fixedItems: NavItem[] = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
];

// Sección Atención
const atencionSection: NavSection = {
  id: 'atencion',
  label: 'Atención',
  icon: MessageSquare,
  items: [
    { to: '/admin/mensajes', icon: MessageSquare, label: 'Mensajes' },
    { to: '/admin/clientes', icon: Users, label: 'Clientes' },
  ]
};

// Sección Sucursales
const sucursalesSection: NavSection = {
  id: 'sucursales',
  label: 'Sucursales',
  icon: Store,
  items: [
    { to: '/admin/sucursales', icon: Store, label: 'Mis Sucursales' },
    { to: '/admin/canales', icon: ShoppingCart, label: 'Canales de Venta' },
  ]
};

// Sección Catálogo (lo que se vende)
const catalogoSection: NavSection = {
  id: 'catalogo',
  label: 'Catálogo',
  icon: UtensilsCrossed,
  items: [
    { to: '/admin/catalogo/productos', icon: Package, label: 'Productos' },
    { to: '/admin/catalogo/modificadores', icon: ChefHat, label: 'Modificadores' },
    { to: '/admin/catalogo/ingredientes', icon: Boxes, label: 'Ingredientes' },
    { to: '/admin/catalogo/descuentos', icon: ShieldCheck, label: 'Descuentos' },
  ]
};

// Sección Proveedores
const proveedoresSection: NavSection = {
  id: 'proveedores',
  label: 'Proveedores',
  icon: Truck,
  items: [
    { to: '/admin/proveedores', icon: Truck, label: 'Proveedores' },
    { to: '/admin/proveedores/ingredientes', icon: ShieldCheck, label: 'Control por Ingrediente' },
  ]
};

// Sección Equipo & Accesos
const equipoSection: NavSection = {
  id: 'equipo',
  label: 'Equipo',
  icon: Users,
  items: [
    { to: '/admin/equipo/usuarios', icon: Users, label: 'Usuarios' },
    { to: '/admin/equipo/plantillas', icon: Shield, label: 'Plantillas de Roles' },
  ]
};

// Sección Reportes
const reportsSection: NavSection = {
  id: 'reportes',
  label: 'Reportes',
  icon: BarChart3,
  items: [
    { to: '/admin/reportes/performance', icon: TrendingUp, label: 'Performance Locales' },
    { to: '/admin/reportes/ventas', icon: BarChart3, label: 'Ventas' },
    { to: '/admin/reportes/pyl', icon: ClipboardList, label: 'P&L por Local' },
    { to: '/admin/reportes/finanzas', icon: Landmark, label: 'Finanzas Marca' },
  ]
};

// Todas las secciones colapsables en orden
const allSections: NavSection[] = [atencionSection, sucursalesSection, catalogoSection, proveedoresSection, equipoSection, reportsSection];

export default function AdminDashboard() {
  const { user, signOut, loading } = useAuth();
  const { avatarInfo, canAccessLocal } = useRoleLanding();
  const { canUseBrandPanel, canUseLocalPanel, branchAccess, loading: panelLoading } = usePanelAccess();
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    atencion: true,
    sucursales: true,
    catalogo: true,
    proveedores: true,
    equipo: true,
    reportes: true,
  });

  // Filtrar secciones según el scope del usuario
  const visibleSections = useMemo(() => {
    // Socios solo ven reportes
    if (avatarInfo.type === 'partner') {
      return [reportsSection];
    }
    // Coordinadores ven catálogo y proveedores (sin equipo)
    if (avatarInfo.type === 'coordinator') {
      return [catalogoSection, proveedoresSection, reportsSection];
    }
    // Admin ve todo
    return allSections;
  }, [avatarInfo.type]);

  // Filtrar items fijos según el scope
  const visibleFixedItems = useMemo(() => {
    // Socios solo ven reportes, no dashboard ni sucursales
    if (avatarInfo.type === 'partner') {
      return [];
    }
    return fixedItems;
  }, [avatarInfo.type]);

  useEffect(() => {
    if (!loading && !panelLoading && !user) {
      navigate('/ingresar');
      return;
    }
    
    // Redirect if user doesn't have brand panel access
    if (!loading && !panelLoading && user && !canUseBrandPanel) {
      // If they have local panel access, redirect there
      if (canUseLocalPanel && branchAccess.length > 0) {
        navigate(`/local/${branchAccess[0].id}`);
      } else {
        navigate('/');
      }
    }
  }, [user, loading, panelLoading, canUseBrandPanel, canUseLocalPanel, branchAccess, navigate]);

  // Check if user can access local panel (from new panel access system)
  const hasLocalPanelAccess = canUseLocalPanel && branchAccess.length > 0;

  if (loading || panelLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl gradient-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // Show access denied if no brand panel access
  if (!canUseBrandPanel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold">Sin acceso al Panel Marca</h1>
          <p className="text-muted-foreground">No tenés permisos para acceder a esta sección.</p>
          {canUseLocalPanel && branchAccess.length > 0 && (
            <Link to={`/local/${branchAccess[0].id}`}>
              <Button>
                <Building2 className="w-4 h-4 mr-2" />
                Ir a Mi Local
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  const isSectionActive = (section: NavSection) => 
    section.items.some(item => location.pathname.startsWith(item.to));

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const NavContent = () => (
    <nav className="space-y-1">
      {/* Role badge */}
      {avatarInfo.type !== 'brand_owner' && (
        <div className="px-3 py-2 mb-2">
          <Badge variant="secondary" className="text-xs">
            {avatarInfo.label}
          </Badge>
        </div>
      )}

      {/* Fixed items (Dashboard, Sucursales) - filtered by scope */}
      {visibleFixedItems.map((item) => {
        const isActive = item.exact 
          ? location.pathname === item.to
          : location.pathname.startsWith(item.to);
        return (
          <Link key={item.to} to={item.to}>
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

      {/* Collapsible sections - filtered by scope */}
      {visibleSections.map((section) => {
        const isActive = isSectionActive(section);
        const isExpanded = expandedSections[section.id] || isActive;
        
        return (
          <Collapsible 
            key={section.id} 
            open={isExpanded} 
            onOpenChange={() => toggleSection(section.id)}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className={`w-full justify-start ${isActive ? 'bg-primary/5 text-primary' : ''}`}
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
              {section.items.map((item) => {
                const itemActive = location.pathname.startsWith(item.to);
                return (
                  <Link key={item.to} to={item.to}>
                    <Button
                      variant={itemActive ? 'secondary' : 'ghost'}
                      size="sm"
                      className={`w-full justify-start ${itemActive ? 'bg-primary/10 text-primary' : ''}`}
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
                <h2 className="text-lg font-bold">Panel Marca</h2>
              </div>
              <NavContent />
              {hasLocalPanelAccess && (
                <div className="mt-4 pt-4 border-t">
                  <Link to={`/local/${branchAccess[0].id}`}>
                    <Button variant="outline" className="w-full justify-start">
                      <Building2 className="w-4 h-4 mr-3" />
                      Panel Mi Local
                    </Button>
                  </Link>
                </div>
              )}
              <div className="absolute bottom-4 left-4 right-4">
                <Button variant="outline" className="w-full" onClick={signOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar Sesión
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <h1 className="font-bold">Panel Marca</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-card border-r">
          <div className="p-6 border-b">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold">HC</span>
              </div>
              <span className="text-lg font-bold">Panel Marca</span>
            </Link>
          </div>
          
          <div className="flex-1 p-4">
            <NavContent />
          </div>

          {hasLocalPanelAccess && (
            <div className="px-4 pb-2">
              <Link to={`/local/${branchAccess[0].id}`}>
                <Button variant="outline" className="w-full justify-start">
                  <Building2 className="w-4 h-4 mr-3" />
                  Panel Mi Local
                </Button>
              </Link>
            </div>
          )}
          
          <div className="p-4 border-t">
            <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-3" />
              Cerrar Sesión
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
