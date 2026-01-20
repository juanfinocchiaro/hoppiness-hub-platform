import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Menu as MenuIcon, LogOut, LayoutDashboard, Store, User } from 'lucide-react';
import logoOriginal from '@/assets/logo-hoppiness-original.jpg';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useState } from 'react';

export function PublicHeader() {
  const { user, signOut } = useAuth();
  const { canUseLocalPanel, canUseBrandPanel, canUseMiCuenta, loading: roleLoading } = useUserRoles();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const isActive = (path: string) => location.pathname.startsWith(path);

  const navLinks = [
    { href: '/pedir', label: 'Pedir', icon: ShoppingBag },
    { href: '/menu', label: 'Menú', icon: MenuIcon },
  ];

  return (
    <header className="bg-primary text-primary-foreground sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={logoOriginal} alt="Hoppiness Club" className="w-10 h-10 object-contain rounded-full" />
          <span className="text-lg font-bold tracking-wide font-brand hidden sm:inline">HOPPINESS CLUB</span>
        </Link>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-2">
          {navLinks.map((link) => (
            <Link key={link.href} to={link.href}>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`text-primary-foreground hover:bg-primary-foreground/10 ${
                  isActive(link.href) ? 'bg-primary-foreground/20' : ''
                }`}
              >
                <link.icon className="w-4 h-4 mr-2" />
                {link.label}
              </Button>
            </Link>
          ))}
          <Link to="/franquicias">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`text-primary-foreground hover:bg-primary-foreground/10 ${
                isActive('/franquicias') ? 'bg-primary-foreground/20' : ''
              }`}
            >
              Franquicias
            </Button>
          </Link>
          
          {user ? (
            <>
              {/* Mi Cuenta - visible para todos los logueados */}
              {canUseMiCuenta && (
                <Link to="/cuenta">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`text-primary-foreground hover:bg-primary-foreground/10 ${
                      isActive('/cuenta') ? 'bg-primary-foreground/20' : ''
                    }`}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Mi Cuenta
                  </Button>
                </Link>
              )}
              
              {/* Mi Local - visible si tiene rol de sucursal */}
              {canUseLocalPanel && (
                <Link to="/local">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`text-primary-foreground hover:bg-primary-foreground/10 ${
                      isActive('/local') ? 'bg-primary-foreground/20' : ''
                    }`}
                  >
                    <Store className="w-4 h-4 mr-2" />
                    Mi Local
                  </Button>
                </Link>
              )}
              
              {/* Mi Marca - visible si tiene rol de marca */}
              {canUseBrandPanel && (
                <Link to="/admin">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`text-primary-foreground hover:bg-primary-foreground/10 ${
                      isActive('/admin') ? 'bg-primary-foreground/20' : ''
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Mi Marca
                  </Button>
                </Link>
              )}
              
              <Button variant="ghost" size="sm" onClick={signOut} className="text-primary-foreground hover:bg-primary-foreground/10">
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Link to="/ingresar">
              <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Ingresar
              </Button>
            </Link>
          )}
        </nav>

        {/* Mobile Nav */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="text-primary-foreground">
              <MenuIcon className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-primary text-primary-foreground border-primary-foreground/20">
            <nav className="flex flex-col gap-4 mt-8">
              {navLinks.map((link) => (
                <Link key={link.href} to={link.href} onClick={() => setOpen(false)}>
                  <Button 
                    variant="ghost" 
                    className={`w-full justify-start text-primary-foreground hover:bg-primary-foreground/10 ${
                      isActive(link.href) ? 'bg-primary-foreground/20' : ''
                    }`}
                  >
                    <link.icon className="w-4 h-4 mr-2" />
                    {link.label}
                  </Button>
                </Link>
              ))}
              <Link to="/franquicias" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full justify-start text-primary-foreground hover:bg-primary-foreground/10">
                  Franquicias
                </Button>
              </Link>
              
              {user ? (
                <>
                  {/* Mi Cuenta - visible para todos */}
                  {canUseMiCuenta && (
                    <Link to="/cuenta" onClick={() => setOpen(false)}>
                      <Button 
                        variant="ghost" 
                        className={`w-full justify-start text-primary-foreground hover:bg-primary-foreground/10 ${
                          isActive('/cuenta') ? 'bg-primary-foreground/20' : ''
                        }`}
                      >
                        <User className="w-4 h-4 mr-2" />
                        Mi Cuenta
                      </Button>
                    </Link>
                  )}
                  
                  {canUseLocalPanel && (
                    <Link to="/local" onClick={() => setOpen(false)}>
                      <Button 
                        variant="ghost" 
                        className={`w-full justify-start text-primary-foreground hover:bg-primary-foreground/10 ${
                          isActive('/local') ? 'bg-primary-foreground/20' : ''
                        }`}
                      >
                        <Store className="w-4 h-4 mr-2" />
                        Mi Local
                      </Button>
                    </Link>
                  )}
                  
                  {canUseBrandPanel && (
                    <Link to="/admin" onClick={() => setOpen(false)}>
                      <Button 
                        variant="ghost" 
                        className={`w-full justify-start text-primary-foreground hover:bg-primary-foreground/10 ${
                          isActive('/admin') ? 'bg-primary-foreground/20' : ''
                        }`}
                      >
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Mi Marca
                      </Button>
                    </Link>
                  )}
                  
                  <Button variant="ghost" onClick={() => { signOut(); setOpen(false); }} className="w-full justify-start text-primary-foreground hover:bg-primary-foreground/10">
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar sesión
                  </Button>
                </>
              ) : (
                <Link to="/ingresar" onClick={() => setOpen(false)}>
                  <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    Ingresar
                  </Button>
                </Link>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
