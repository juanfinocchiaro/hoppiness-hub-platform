/**
 * WebappHeader — Unified header for ALL webapp/public pages.
 * Same structure everywhere: [←] [Logo] [Context] ... [🔍] [🛒] [Avatar/Menu]
 */
import { ArrowLeft, Search, ShoppingBag, Menu as MenuIcon, Home, Phone, Users2, Store as StoreIcon, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { UserMenuDropdown } from './UserMenuDropdown';
import logoHoppiness from '@/assets/logo-hoppiness-blue.png';

interface WebappHeaderProps {
  /** Show ← back button */
  showBack?: boolean;
  /** Back action (default: navigate(-1)) */
  onBack?: () => void;

  /** Main title text */
  title: string;
  /** Subtitle below title (e.g. "Retiro ~15 min") */
  subtitle?: string;

  /** Show search icon (menu page only) */
  showSearch?: boolean;
  onSearchToggle?: () => void;

  /** Show cart icon with badge */
  showCart?: boolean;
  cartCount?: number;
  onCartClick?: () => void;

  /** Show hamburger nav menu (landing/institutional pages) */
  showNavMenu?: boolean;

  /** Mis pedidos callback (passed to UserMenuDropdown) */
  onMisPedidos?: () => void;

  /** Extra action buttons rendered before UserMenuDropdown */
  extraActions?: React.ReactNode;

  /** Children rendered below the header row (e.g. category tabs, banners) */
  children?: React.ReactNode;
}

export function WebappHeader({
  showBack,
  onBack,
  title,
  subtitle,
  showSearch,
  onSearchToggle,
  showCart,
  cartCount = 0,
  onCartClick,
  showNavMenu,
  onMisPedidos,
  extraActions,
  children,
}: WebappHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  return (
    <header className="sticky top-0 z-50 bg-background border-b shadow-sm">
      {/* Gradient accent line */}
      <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-warning" />

      <div className="max-w-6xl mx-auto">
        <div className="flex items-center h-14 px-4 gap-3">
          {/* Left zone: Back + Logo + Context */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {showBack && (
              <button
                onClick={handleBack}
                className="p-1.5 -ml-1 hover:bg-muted rounded-lg transition-colors text-muted-foreground shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            {/* Logo — always visible, always links to landing */}
            <Link to="/" className="shrink-0">
              <img
                src={logoHoppiness}
                alt="Hoppiness"
                className="w-8 h-8 rounded-full object-contain"
              />
            </Link>

            {/* Context text */}
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-foreground truncate leading-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-[11px] text-muted-foreground truncate leading-tight">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right zone: Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {showSearch && (
              <button
                onClick={onSearchToggle}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
              >
                <Search className="w-5 h-5" />
              </button>
            )}

            {showCart && (
              <button
                onClick={onCartClick}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground relative"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-accent text-accent-foreground text-[9px] font-black rounded-full h-4 min-w-[16px] flex items-center justify-center px-0.5">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>
            )}

            {/* Extra actions (e.g. view toggle) */}
            {extraActions}

            {/* User avatar / dropdown — always show */}
            <UserMenuDropdown onMisPedidos={onMisPedidos} />

            {/* Nav hamburger menu for landing/institutional pages */}
            {showNavMenu && <NavMenuSheet />}
          </div>
        </div>

        {/* Extra content below header (search bar, category tabs, banners, etc.) */}
        {children}
      </div>
    </header>
  );
}

/** Hamburger nav menu for landing page — institutional links */
function NavMenuSheet() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
          <MenuIcon className="w-5 h-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <nav className="flex flex-col gap-1 mt-6">
          <Link to="/" onClick={() => setOpen(false)}>
            <Button variant="ghost" className="w-full justify-start">
              <Home className="w-4 h-4 mr-2" />
              Inicio
            </Button>
          </Link>
          <Link to="/pedir" onClick={() => setOpen(false)}>
            <Button variant="ghost" className="w-full justify-start">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Pedí Online
            </Button>
          </Link>
          <Link to="/nosotros" onClick={() => setOpen(false)}>
            <Button variant="ghost" className="w-full justify-start">
              <Users2 className="w-4 h-4 mr-2" />
              Nosotros
            </Button>
          </Link>
          <Link to="/franquicias" onClick={() => setOpen(false)}>
            <Button variant="ghost" className="w-full justify-start">
              <StoreIcon className="w-4 h-4 mr-2" />
              Franquicias
            </Button>
          </Link>
          <Link to="/contacto" onClick={() => setOpen(false)}>
            <Button variant="ghost" className="w-full justify-start">
              <Phone className="w-4 h-4 mr-2" />
              Contacto
            </Button>
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
