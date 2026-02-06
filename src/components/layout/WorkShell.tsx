/**
 * WorkShell - Layout unificado para paneles de trabajo (Mi Marca / Mi Local)
 * 
 * Características:
 * - Header mobile con Sheet drawer
 * - Sidebar desktop fijo de 288px (w-72)
 * - ImpersonationBanner integrado
 * - OfflineBanner integrado
 * - Soporte para modo embebido
 */
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import ImpersonationBanner from '@/components/admin/ImpersonationBanner';
import { OfflineBanner } from '@/components/ui/offline-banner';
import logoHoppinessBlue from '@/assets/logo-hoppiness-blue.png';

interface WorkShellProps {
  mode: 'brand' | 'local' | 'cuenta';
  title: string;
  mobileTitle?: string;
  sidebar: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function WorkShell({
  mode,
  title,
  mobileTitle,
  sidebar,
  footer,
  children,
  className,
}: WorkShellProps) {
  const panelLabel = 
    mode === 'brand' ? 'Mi Marca' : 
    mode === 'local' ? 'Mi Local' : 
    'Mi Cuenta';
  const displayMobileTitle = mobileTitle || title || panelLabel;

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      {/* Offline Banner */}
      <OfflineBanner />
      
      {/* Impersonation Banner */}
      <ImpersonationBanner />

      {/* Mobile Header */}
      <header 
        className={cn(
          'lg:hidden shrink-0 z-50 bg-primary text-primary-foreground'
        )}
      >
        <div className="flex items-center justify-between p-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4 flex flex-col">
              {/* Logo and title */}
              <div className="mb-6 flex items-center gap-3">
                <img
                  src={logoHoppinessBlue}
                  alt="Hoppiness"
                  className="w-14 h-14 rounded-xl object-contain bg-white p-1"
                />
                <span className="text-lg font-bold">{panelLabel}</span>
              </div>

              {/* Navigation */}
              <div className="flex-1 overflow-y-auto">{sidebar}</div>

              {/* Footer */}
              {footer && (
                <div className="pt-4 border-t space-y-3">{footer}</div>
              )}
            </SheetContent>
          </Sheet>
          <h1 className="font-bold">{displayMobileTitle}</h1>
          <div className="w-10" /> {/* Spacer for balance */}
        </div>
      </header>

      {/* Main Layout Container - flex-1 takes remaining height */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            'hidden lg:flex lg:flex-col lg:w-72 lg:shrink-0 bg-card border-r h-full overflow-hidden'
          )}
        >
          {/* Header - Logo and panel label */}
          <div className="p-6 border-b h-[88px] flex items-center shrink-0">
            <div className="flex items-center gap-3">
              <img
                src={logoHoppinessBlue}
                alt="Hoppiness"
                className="w-14 h-14 rounded-xl object-contain bg-white p-1 flex-shrink-0"
              />
              <span className="text-lg font-bold">{panelLabel}</span>
            </div>
          </div>

          {/* Navigation - scrollable */}
          <div className="flex-1 overflow-y-auto p-4">{sidebar}</div>

          {/* Footer */}
          {footer && (
            <div className="p-4 border-t space-y-3 shrink-0">{footer}</div>
          )}
        </aside>

        {/* Main Content - overflow-y-auto for page scroll */}
        <main className={cn('flex-1 overflow-y-auto', className)}>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default WorkShell;
