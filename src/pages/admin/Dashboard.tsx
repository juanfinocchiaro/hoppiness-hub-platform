import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
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
  ShieldCheck
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

const navItems: NavItem[] = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/admin/sucursales', icon: Store, label: 'Sucursales' },
  { to: '/admin/proveedores', icon: Truck, label: 'Proveedores' },
  { to: '/admin/control-proveedores', icon: ShieldCheck, label: 'Control Proveedores' },
  { to: '/admin/usuarios', icon: Users, label: 'Equipo' },
  { to: '/admin/permisos', icon: Shield, label: 'Accesos' },
];

const menuSection: NavSection = {
  id: 'menu-marca',
  label: 'Menú Marca',
  icon: UtensilsCrossed,
  items: [
    { to: '/admin/productos', icon: Package, label: 'Productos' },
    { to: '/admin/modificadores', icon: ChefHat, label: 'Extras / Modificadores' },
  ]
};

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

export default function AdminDashboard() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasAssignedBranch, setHasAssignedBranch] = useState(false);
  const [menuExpanded, setMenuExpanded] = useState(true);
  const [reportsExpanded, setReportsExpanded] = useState(true);

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

  const isMenuSectionActive = menuSection.items.some(item => location.pathname.startsWith(item.to));
  const isReportsSectionActive = reportsSection.items.some(item => location.pathname.startsWith(item.to));

  const NavContent = () => (
    <nav className="space-y-1">
      {/* Regular nav items */}
      {navItems.slice(0, 4).map((item) => {
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

      {/* Menú Marca collapsible section */}
      <Collapsible open={menuExpanded || isMenuSectionActive} onOpenChange={setMenuExpanded}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className={`w-full justify-start ${isMenuSectionActive ? 'bg-primary/5 text-primary' : ''}`}
          >
            <menuSection.icon className="w-4 h-4 mr-3" />
            {menuSection.label}
            {menuExpanded || isMenuSectionActive ? (
              <ChevronDown className="w-4 h-4 ml-auto" />
            ) : (
              <ChevronRight className="w-4 h-4 ml-auto" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-4 space-y-0.5 mt-1">
          {menuSection.items.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to}>
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

      {/* Reportes collapsible section */}
      <Collapsible open={reportsExpanded || isReportsSectionActive} onOpenChange={setReportsExpanded}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className={`w-full justify-start ${isReportsSectionActive ? 'bg-primary/5 text-primary' : ''}`}
          >
            <reportsSection.icon className="w-4 h-4 mr-3" />
            {reportsSection.label}
            {reportsExpanded || isReportsSectionActive ? (
              <ChevronDown className="w-4 h-4 ml-auto" />
            ) : (
              <ChevronRight className="w-4 h-4 ml-auto" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-4 space-y-0.5 mt-1">
          {reportsSection.items.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to}>
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
      {navItems.slice(4).map((item) => {
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
              {hasAssignedBranch && (
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

          {hasAssignedBranch && (
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
