import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { 
  Crown, 
  Users, 
  Store, 
  Monitor, 
  ChefHat, 
  BarChart3,
  Package,
  DollarSign,
  Clock,
  ClipboardList,
  Calculator
} from 'lucide-react';
import { AvatarType } from '@/hooks/useRoleLandingV2';

interface QuickAction {
  label: string;
  to?: string;
  action?: () => void;
  icon: React.ElementType;
}

interface RoleConfig {
  icon: React.ElementType;
  color: string;
  quickActions: QuickAction[];
}

// Updated to match new AvatarType from useRoleLandingV2
const roleConfigs: Record<AvatarType, RoleConfig> = {
  superadmin: {
    icon: Crown,
    color: 'bg-amber-500',
    quickActions: [
      { label: 'Ver Reportes', to: '/admin/reportes', icon: BarChart3 },
      { label: 'Estado Sucursales', to: '/admin/estado-sucursales', icon: Store },
      { label: 'Finanzas Marca', to: '/admin/finanzas-marca', icon: DollarSign },
    ],
  },
  coordinador: {
    icon: Package,
    color: 'bg-blue-500',
    quickActions: [
      { label: 'Productos', to: '/admin/catalogo/productos', icon: Package },
      { label: 'Modificadores', to: '/admin/catalogo/modificadores', icon: Package },
      { label: 'Ingredientes', to: '/admin/catalogo/ingredientes', icon: Package },
    ],
  },
  informes: {
    icon: BarChart3,
    color: 'bg-purple-500',
    quickActions: [
      { label: 'Reportes', to: '/admin/resultados', icon: BarChart3 },
      { label: 'Performance', to: '/admin/comparativa', icon: BarChart3 },
    ],
  },
  contador_marca: {
    icon: Calculator,
    color: 'bg-teal-500',
    quickActions: [
      { label: 'Resultados', to: '/admin/resultados', icon: DollarSign },
      { label: 'Finanzas', to: '/admin/reportes/finanzas', icon: DollarSign },
    ],
  },
  franquiciado: {
    icon: Store,
    color: 'bg-green-500',
    quickActions: [
      { label: 'Ver P&L', to: 'reportes/resultados', icon: DollarSign },
      { label: 'Proveedores', to: 'compras/proveedores', icon: ClipboardList },
      { label: 'Mi Equipo', to: 'equipo/mi-equipo', icon: Users },
    ],
  },
  encargado: {
    icon: ClipboardList,
    color: 'bg-orange-500',
    quickActions: [
      { label: 'Fichajes', to: 'equipo/fichar', icon: Clock },
      { label: 'Horarios', to: 'equipo/horarios', icon: Clock },
      { label: 'Cargar Gasto', to: 'caja', icon: DollarSign },
    ],
  },
  contador_local: {
    icon: Calculator,
    color: 'bg-teal-500',
    quickActions: [
      { label: 'Movimientos', to: 'finanzas/movimientos', icon: DollarSign },
      { label: 'Facturas', to: 'finanzas/facturas', icon: DollarSign },
    ],
  },
  cajero: {
    icon: Monitor,
    color: 'bg-primary',
    quickActions: [],
  },
  empleado: {
    icon: ChefHat,
    color: 'bg-rose-500',
    quickActions: [],
  },
  guest: {
    icon: Users,
    color: 'bg-gray-500',
    quickActions: [],
  },
};

// Variante para panel de marca (admin)
const brandRoleConfigs: Partial<Record<AvatarType, RoleConfig>> = {
  informes: {
    icon: BarChart3,
    color: 'bg-purple-500',
    quickActions: [
      { label: 'Ventas', to: '/admin/resultados', icon: BarChart3 },
      { label: 'Performance', to: '/admin/comparativa', icon: BarChart3 },
      { label: 'Finanzas Marca', to: '/admin/reportes/finanzas', icon: DollarSign },
    ],
  },
};

interface RoleWelcomeCardProps {
  avatarType: AvatarType;
  avatarLabel: string;
  branchId?: string;
  userName?: string;
  variant?: 'local' | 'brand';
}

export function RoleWelcomeCard({ 
  avatarType, 
  avatarLabel, 
  branchId,
  userName,
  variant = 'local'
}: RoleWelcomeCardProps) {
  // Usar configuración de marca si corresponde
  const config = variant === 'brand' && brandRoleConfigs[avatarType] 
    ? brandRoleConfigs[avatarType]! 
    : roleConfigs[avatarType];
  const Icon = config.icon;

  // Para roles operativos (cajero/empleado) no mostramos tarjeta de bienvenida
  if (avatarType === 'cajero' || avatarType === 'empleado') {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {userName ? `Hola, ${userName}` : 'Bienvenido'}
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {avatarLabel}
                </Badge>
              </div>
            </div>
          </div>
          
          {config.quickActions.length > 0 && (
            <div className="hidden md:flex items-center gap-2">
              {config.quickActions.slice(0, 3).map((action, idx) => {
                const ActionIcon = action.icon;
                const path = action.to?.startsWith('/') 
                  ? action.to 
                  : branchId 
                    ? `/local/${branchId}/${action.to}` 
                    : action.to;
                
                return (
                  <Link key={idx} to={path || '#'}>
                    <Button variant="outline" size="sm">
                      <ActionIcon className="w-4 h-4 mr-1" />
                      {action.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
