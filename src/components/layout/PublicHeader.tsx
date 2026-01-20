import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Menu as MenuIcon, LogOut, LayoutDashboard, Store, User, ChevronDown, Package, Phone, Users2, Columns } from 'lucide-react';
import logoOriginal from '@/assets/logo-hoppiness-original.jpg';
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
import { useState, useMemo } from 'react';

export function PublicHeader() {
  const { user, signOut } = useAuth();
  const { canUseLocalPanel, canUseBrandPanel, canUseMiCuenta, loading: roleLoading } = useUserRoles();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // When running inside the Conciliación iframes we mark the URL with ?embed=conciliacion
  // so we can ensure navigation happens in the parent (not only inside the iframe).
  const isConciliacionEmbed = useMemo(() => {
    return new URLSearchParams(location.search).get('embed') === 'conciliacion';
  }, [location.search]);

  const isActive = (path: string) => location.pathname.startsWith(path);

  // Obtener nombre del usuario
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const userEmail = user?.email || '';

  return (
    <header className="bg-primary text-primary-foreground sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <img src={logoOriginal} alt="Hoppiness Club" className="w-10 h-10 object-contain rounded-full" />
          <span className="text-lg font-bold tracking-wide font-brand hidden sm:inline">HOPPINESS CLUB</span>
          <span className="text-lg font-bold tracking-wide font-brand sm:hidden">HOPPINESS</span>
        </Link>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          <Link to="/pedir">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`text-primary-foreground hover:bg-primary-foreground/10 ${
                isActive('/pedir') ? 'bg-primary-foreground/20' : ''
              }`}
            >
              Pedir
            </Button>
          </Link>
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
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-primary-foreground hover:bg-primary-foreground/10 gap-1"
                >
                  <User className="w-4 h-4" />
                  <span className="max-w-[100px] truncate">{userName.split(' ')[0]}</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
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
                
                {canUseLocalPanel && (
                  <DropdownMenuItem asChild>
                    <Link to="/local" className="cursor-pointer">
                      <Store className="w-4 h-4 mr-2" />
                      Mi Local
                    </Link>
                  </DropdownMenuItem>
                )}
                
                {canUseBrandPanel && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="cursor-pointer">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Mi Marca
                    </Link>
                  </DropdownMenuItem>
                )}
                
                {canUseBrandPanel && canUseLocalPanel && (
                  <DropdownMenuItem asChild>
                    {isConciliacionEmbed ? (
                      <a href="/conciliacion" target="_parent" className="cursor-pointer">
                        <Columns className="w-4 h-4 mr-2" />
                        Conciliación
                      </a>
                    ) : (
                      <Link to="/conciliacion" className="cursor-pointer">
                        <Columns className="w-4 h-4 mr-2" />
                        Conciliación
                      </Link>
                    )}
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
              <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Ingresar
              </Button>
            </Link>
          )}
        </nav>

        {/* Mobile Nav */}
        <div className="flex md:hidden items-center gap-2">
          {/* Botón rápido a Pedir */}
          <Link to="/pedir">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
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
                <Link to="/pedir" onClick={() => setOpen(false)}>
                  <Button 
                    variant="ghost" 
                    className={`w-full justify-start text-primary-foreground hover:bg-primary-foreground/10 ${
                      isActive('/pedir') ? 'bg-primary-foreground/20' : ''
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Pedir
                  </Button>
                </Link>
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
                    {/* Info usuario */}
                    <div className="px-4 py-2">
                      <p className="text-sm font-medium">{userName}</p>
                      <p className="text-xs text-primary-foreground/70">{userEmail}</p>
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
                    
                    {canUseBrandPanel && canUseLocalPanel && (
                      <Button
                        asChild
                        variant="ghost"
                        className={`w-full justify-start text-primary-foreground hover:bg-primary-foreground/10 ${
                          isActive('/conciliacion') ? 'bg-primary-foreground/20' : ''
                        }`}
                      >
                        {isConciliacionEmbed ? (
                          <a href="/conciliacion" target="_parent" onClick={() => setOpen(false)}>
                            <Columns className="w-4 h-4 mr-2" />
                            Conciliación
                          </a>
                        ) : (
                          <Link to="/conciliacion" onClick={() => setOpen(false)}>
                            <Columns className="w-4 h-4 mr-2" />
                            Conciliación
                          </Link>
                        )}
                      </Button>
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