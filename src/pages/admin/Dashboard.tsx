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
  ClipboardList,
  BarChart3,
  Building2
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/admin/reportes', icon: BarChart3, label: 'Ventas' },
  { to: '/admin/estado-resultados', icon: ClipboardList, label: 'Estado de Resultados' },
  { to: '/admin/sucursales', icon: Store, label: 'Sucursales' },
  { to: '/admin/productos', icon: Package, label: 'Productos' },
  { to: '/admin/proveedores', icon: Truck, label: 'Proveedores' },
  { to: '/admin/usuarios', icon: Users, label: 'Usuarios' },
];

export default function AdminDashboard() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasAssignedBranch, setHasAssignedBranch] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Check if admin has any branch assigned
  useEffect(() => {
    async function checkBranchAccess() {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('branch_permissions')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      
      if (!error && data && data.length > 0) {
        setHasAssignedBranch(true);
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

  const NavContent = () => (
    <nav className="space-y-1">
      {navItems.map((item) => {
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
                <h2 className="text-lg font-bold">Panel Admin</h2>
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
          <h1 className="font-bold">Panel Admin</h1>
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
              <span className="text-lg font-bold">Panel Admin</span>
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
