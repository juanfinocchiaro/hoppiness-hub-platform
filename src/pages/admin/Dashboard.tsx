import { useEffect, useState, useMemo } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoleLanding } from '@/hooks/useRoleLanding';
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
  ShoppingCart
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
  { to: '/admin/sucursales', icon: Store, label: 'Sucursales' },
];

// Sección Catálogo (lo que se vende)
const catalogoSection: NavSection = {
  id: 'catalogo',
  label: 'Catálogo',
  icon: UtensilsCrossed,
  items: [
    { to: '/admin/productos', icon: Package, label: 'Productos' },
    { to: '/admin/modificadores', icon: ChefHat, label: 'Modificadores' },
  ]
};

// Sección Insumos & Compras (lo que se compra)
const insumosSection: NavSection = {
  id: 'insumos',
  label: 'Insumos & Compras',
  icon: ShoppingCart,
  items: [
    { to: '/admin/ingredientes', icon: Boxes, label: 'Ingredientes' },
    { to: '/admin/proveedores', icon: Truck, label: 'Proveedores' },
    { to: '/admin/control-proveedores', icon: ShieldCheck, label: 'Control por Ingrediente' },
  ]
};

// Sección Equipo & Accesos (reestructurada)
const equipoSection: NavSection = {
  id: 'equipo',
  label: 'Equipo & Accesos',
  icon: Users,
  items: [
    { to: '/admin/equipo', icon: Users, label: 'Equipo' },
    { to: '/admin/accesos', icon: Shield, label: 'Accesos' },
  ]
};

// Sección Reportes
const reportsSection: NavSection = {
  id: 'reportes',
  label: 'Reportes',
  icon: BarChart3,
  items: [
    { to: '/admin/performance', icon: TrendingUp, label: 'Performance Locales' },
    { to: '/admin/reportes', icon: BarChart3, label: 'Ventas' },
    { to: '/admin/estado-resultados', icon: ClipboardList, label: 'P&L Locales' },
    { to: '/admin/finanzas-marca', icon: Landmark, label: 'Finanzas Marca' },
  ]
};

// Todas las secciones colapsables en orden
const allSections: NavSection[] = [catalogoSection, insumosSection, equipoSection, reportsSection];

export default function AdminDashboard() {
  const { user, signOut, loading } = useAuth();
  const { avatarInfo, canOperate, canAccessLocal } = useRoleLanding();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasAssignedBranch, setHasAssignedBranch] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    catalogo: true,
    insumos: true,
    equipo: true,
    reportes: true,
  });

  // Filtrar secciones según el scope del usuario
  const visibleSections = useMemo(() => {
    // Socios solo ven reportes
    if (avatarInfo.type === 'partner') {
      return [reportsSection];
    }
    // Coordinadores ven catálogo e insumos (sin equipo)
    if (avatarInfo.type === 'coordinator') {
      return [catalogoSection, insumosSection, reportsSection];
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
    if (!loading && !user) {
      navigate('/ingresar');
    }
  }, [user, loading, navigate]);

  // Check if admin has any branch to access (either explicitly assigned or any branch exists for admin)
  useEffect(() => {
    async function checkBranchAccess() {
      if (!user) return;
      
      // First check if user has explicit branch permissions
      const { data: permissions, error: permError } = await supabase
        .from('branch_permissions')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      
      if (!permError && permissions && permissions.length > 0) {
        setHasAssignedBranch(true);
        return;
      }
      
      // If admin, check if any branches exist (admins have access to all)
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .limit(1);
      
      if (roleData && roleData.length > 0) {
        const { data: branches } = await supabase
          .from('branches')
          .select('id')
          .limit(1);
        
        if (branches && branches.length > 0) {
          setHasAssignedBranch(true);
        }
      }
    }
    
    checkBranchAccess();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl gradient-primary" />
          <p className="text-muted-foreground">Cargando...</p>
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
              {hasAssignedBranch && canAccessLocal && (
                <div className="mt-4 pt-4 border-t">
                  <Link to="/local">
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

          {hasAssignedBranch && canAccessLocal && (
            <div className="px-4 pb-2">
              <Link to="/local">
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
