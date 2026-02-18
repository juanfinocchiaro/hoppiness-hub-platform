import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Menu as MenuIcon, LogOut, LayoutDashboard, Store, User, ChevronDown, Package, Phone, Users2, Home } from 'lucide-react';
import logoHoppiness from '@/assets/logo-hoppiness-blue.png';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';

export function PublicHeader() {
  const { user, signOut } = useAuth();
  const effectiveUser = useEffectiveUser();
  const { canAccessLocalPanel, canAccessBrandPanel, loading: roleLoading } = usePermissionsWithImpersonation();
  const canUseMiCuenta = !!user;
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const isActive = (path: string) => location.pathname.startsWith(path);
  const isHome = location.pathname === '/';

  const userName = effectiveUser.full_name || effectiveUser.email?.split('@')[0] || 'Usuario';
  const userEmail = effectiveUser.email || '';

  return (
    <header className="bg-primary text-primary-foreground sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <img src={logoHoppiness} alt="Hoppiness Club" className="w-10 h-10 object-contain rounded-full" />
          <span className="text-lg font-bold tracking-wide font-brand hidden sm:inline">HOPPINESS CLUB</span>
          <span className="text-lg font-bold tracking-wide font-brand sm:hidden">HOPPINESS</span>
        </Link>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          <Link to="/">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`text-primary-foreground hover:bg-primary-foreground/10 ${
                location.pathname === '/' ? 'bg-primary-foreground/20' : ''
              }`}
            >
              Inicio
            </Button>
          </Link>
          <Link to="/pedir">
            <Button 
              size="sm" 
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <ShoppingBag className="w-4 h-4 mr-1" />
              Pedí Online
            </Button>
          </Link>
          <a href={isHome ? '#clubes' : '/#clubes'}>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              Nuestros Clubes
            </Button>
          </a>
          <Link to="/nosotros">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`text-primary-foreground hover:bg-primary-foreground/10 ${
                isActive('/nosotros') ? 'bg-primary-foreground/20' : ''
              }`}
            >
              Nosotros
            </Button>
          </Link>
          <Link to="/contacto">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`text-primary-foreground hover:bg-primary-foreground/10 ${
                isActive('/contacto') ? 'bg-primary-foreground/20' : ''
              }`}
            >
              Contacto
            </Button>
          </Link>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`text-primary-foreground hover:bg-primary-foreground/10 gap-1 ${
                    effectiveUser.isImpersonated ? 'ring-2 ring-amber-400' : ''
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span className="max-w-[100px] truncate">{userName.split(' ')[0]}</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className={`text-sm font-medium leading-none ${effectiveUser.isImpersonated ? 'text-amber-600' : ''}`}>
                      {userName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
                    {effectiveUser.isImpersonated && (
                      <p className="text-xs text-amber-600 mt-1">👁 Modo impersonación</p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {canUseMiCuenta && (
                  <DropdownMenuItem asChild>
                    <Link to="/cuenta" className="cursor-pointer">
                      <Package className="w-4 h-4 mr-2" />
                      Mi Cuenta
                    </Link>
                  </DropdownMenuItem>
                )}
                
                {canAccessLocalPanel && (
                  <DropdownMenuItem asChild>
                    <Link to="/milocal" className="cursor-pointer">
                      <Store className="w-4 h-4 mr-2" />
                      Mi Local
                    </Link>
                  </DropdownMenuItem>
                )}
                
                {canAccessBrandPanel && (
                  <DropdownMenuItem asChild>
                    <Link to="/mimarca" className="cursor-pointer">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Mi Marca
                    </Link>
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/ingresar">
              <Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10">
                Ingresar
              </Button>
            </Link>
          )}
        </nav>

        {/* Mobile Nav */}
        <div className="flex md:hidden items-center gap-2">
          <Link to="/pedir">
            <Button 
              size="icon" 
              className="bg-accent hover:bg-accent/90 text-accent-foreground h-9 w-9"
            >
              <ShoppingBag className="w-5 h-5" />
            </Button>
          </Link>
          
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground">
                <MenuIcon className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-primary text-primary-foreground border-primary-foreground/20">
              <nav className="flex flex-col gap-2 mt-8">
                <Link to="/" onClick={() => setOpen(false)}>
                  <Button 
                    variant="ghost" 
                    className={`w-full justify-start text-primary-foreground hover:bg-primary-foreground/10 ${
                      location.pathname === '/' ? 'bg-primary-foreground/20' : ''
                    }`}
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Inicio
                  </Button>
                </Link>
                <Link to="/pedir" onClick={() => setOpen(false)}>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Pedí Online
                  </Button>
                </Link>
                <a href={isHome ? '#clubes' : '/#clubes'} onClick={() => setOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start text-primary-foreground hover:bg-primary-foreground/10">
                    <Store className="w-4 h-4 mr-2" />
                    Nuestros Clubes
                  </Button>
                </a>
                <Link to="/nosotros" onClick={() => setOpen(false)}>
                  <Button 
                    variant="ghost" 
                    className={`w-full justify-start text-primary-foreground hover:bg-primary-foreground/10 ${
                      isActive('/nosotros') ? 'bg-primary-foreground/20' : ''
                    }`}
                  >
                    <Users2 className="w-4 h-4 mr-2" />
                    Nosotros
                  </Button>
                </Link>
                <Link to="/franquicias" onClick={() => setOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start text-primary-foreground hover:bg-primary-foreground/10">
                    <Store className="w-4 h-4 mr-2" />
                    Franquicias
                  </Button>
                </Link>
                <Link to="/contacto" onClick={() => setOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start text-primary-foreground hover:bg-primary-foreground/10">
                    <Phone className="w-4 h-4 mr-2" />
                    Contacto
                  </Button>
                </Link>
                
                <div className="border-t border-primary-foreground/20 my-2" />
                
                {user ? (
                  <>
                    <div className="px-4 py-2">
                      <p className={`text-sm font-medium ${effectiveUser.isImpersonated ? 'text-amber-400' : ''}`}>
                        {userName}
                      </p>
                      <p className="text-xs text-primary-foreground/70">{userEmail}</p>
                      {effectiveUser.isImpersonated && (
                        <p className="text-xs text-amber-400 mt-1">👁 Modo impersonación</p>
                      )}
                    </div>
                    
                    {canUseMiCuenta && (
                      <Link to="/cuenta" onClick={() => setOpen(false)}>
                        <Button 
                          variant="ghost" 
                          className={`w-full justify-start text-primary-foreground hover:bg-primary-foreground/10 ${
                            isActive('/cuenta') ? 'bg-primary-foreground/20' : ''
                          }`}
                        >
                          <Package className="w-4 h-4 mr-2" />
                          Mi Cuenta
                        </Button>
                      </Link>
                    )}
                    
                    {canAccessLocalPanel && (
                      <Link to="/milocal" onClick={() => setOpen(false)}>
                        <Button 
                          variant="ghost" 
                          className={`w-full justify-start text-primary-foreground hover:bg-primary-foreground/10 ${
                            isActive('/milocal') ? 'bg-primary-foreground/20' : ''
                          }`}
                        >
                          <Store className="w-4 h-4 mr-2" />
                          Mi Local
                        </Button>
                      </Link>
                    )}
                    
                    {canAccessBrandPanel && (
                      <Link to="/mimarca" onClick={() => setOpen(false)}>
                        <Button 
                          variant="ghost" 
                          className={`w-full justify-start text-primary-foreground hover:bg-primary-foreground/10 ${
                            isActive('/mimarca') ? 'bg-primary-foreground/20' : ''
                          }`}
                        >
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          Mi Marca
                        </Button>
                      </Link>
                    )}
                    
                    <div className="border-t border-primary-foreground/20 my-2" />
                    
                    <Button 
                      variant="ghost" 
                      onClick={() => { signOut(); setOpen(false); }} 
                      className="w-full justify-start text-primary-foreground hover:bg-primary-foreground/10"
                    >
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
      </div>
    </header>
  );
}

export function MobileOrderFAB() {
  return (
    <Link
      to="/pedir"
      className="fixed bottom-6 right-6 z-50 md:hidden bg-accent hover:bg-accent/90 text-accent-foreground rounded-full p-4 shadow-elevated transition-transform active:scale-95"
      aria-label="Pedí Online"
    >
      <ShoppingBag className="w-6 h-6" />
    </Link>
  );
}
