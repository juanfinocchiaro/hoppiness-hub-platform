/**
 * PanelSwitcher - Navegación directa entre paneles (Mi Cuenta, Mi Local, Mi Marca)
 * 
 * Renderiza links a los paneles disponibles excepto el actual.
 * Se usa en el footer de todos los sidebars para navegación de 1 click.
 */
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useRoleLandingV2 } from '@/hooks/useRoleLandingV2';
import { User, Store, Building2 } from 'lucide-react';

export type PanelType = 'cuenta' | 'local' | 'marca';

interface PanelSwitcherProps {
  currentPanel: PanelType;
  /** Branch ID to use when switching to local panel */
  localBranchId?: string;
}

export function PanelSwitcher({ currentPanel, localBranchId }: PanelSwitcherProps) {
  const { canAccessLocal, canAccessAdmin, accessibleBranches } = useRoleLandingV2();
  
  // Determine target branch for local panel
  const targetBranchId = localBranchId || accessibleBranches[0]?.id;
  
  const showCuenta = currentPanel !== 'cuenta';
  const showLocal = currentPanel !== 'local' && canAccessLocal && targetBranchId;
  const showMarca = currentPanel !== 'marca' && canAccessAdmin;
  
  // Don't render anything if no other panels available
  if (!showCuenta && !showLocal && !showMarca) {
    return null;
  }

  return (
    <div className="space-y-1">
      <div className="text-xs uppercase text-muted-foreground font-medium px-3 py-2">
        Cambiar a
      </div>
      
      {showCuenta && (
        <Link to="/cuenta">
          <Button variant="ghost" className="w-full justify-start">
            <User className="w-4 h-4 mr-3" />
            Mi Cuenta
          </Button>
        </Link>
      )}
      
      {showLocal && (
        <Link to={`/milocal/${targetBranchId}`}>
          <Button variant="ghost" className="w-full justify-start">
            <Store className="w-4 h-4 mr-3" />
            Mi Local
          </Button>
        </Link>
      )}
      
      {showMarca && (
        <Link to="/mimarca">
          <Button variant="ghost" className="w-full justify-start">
            <Building2 className="w-4 h-4 mr-3" />
            Mi Marca
          </Button>
        </Link>
      )}
    </div>
  );
}

export default PanelSwitcher;
