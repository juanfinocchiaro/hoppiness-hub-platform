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
  ClipboardList
} from 'lucide-react';
import { AvatarType } from '@/hooks/useRoleLanding';

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

const roleConfigs: Record<AvatarType, RoleConfig> = {
  brand_owner: {
    icon: Crown,
    color: 'bg-amber-500',
    quickActions: [
      { label: 'Ver Reportes', to: '/admin/reportes', icon: BarChart3 },
      { label: 'Estado Sucursales', to: '/admin/estado-sucursales', icon: Store },
      { label: 'Finanzas Marca', to: '/admin/finanzas-marca', icon: DollarSign },
    ],
  },
  partner: {
    icon: Users,
    color: 'bg-purple-500',
    quickActions: [
      { label: 'Reportes', to: '/admin/reportes', icon: BarChart3 },
      { label: 'Performance', to: '/admin/performance', icon: BarChart3 },
    ],
  },
  coordinator: {
    icon: Package,
    color: 'bg-blue-500',
    quickActions: [
      { label: 'Productos', to: '/admin/productos', icon: Package },
      { label: 'Modificadores', to: '/admin/modificadores', icon: Package },
      { label: 'Ingredientes', to: '/admin/ingredientes', icon: Package },
    ],
  },
  franchise_owner: {
    icon: Store,
    color: 'bg-green-500',
    quickActions: [
      { label: 'Ver P&L', to: 'reportes', icon: DollarSign },
      { label: 'Proveedores', to: 'proveedores', icon: ClipboardList },
      { label: 'Colaboradores', to: 'rrhh/colaboradores', icon: Users },
    ],
  },
  manager: {
    icon: ClipboardList,
    color: 'bg-orange-500',
    quickActions: [
      { label: 'Fichajes', to: 'rrhh/fichajes', icon: Clock },
      { label: 'Horarios', to: 'rrhh/horarios', icon: Clock },
      { label: 'Cargar Gasto', to: 'transacciones', icon: DollarSign },
    ],
  },
  cashier: {
    icon: Monitor,
    color: 'bg-primary',
    quickActions: [],
  },
  kds: {
    icon: ChefHat,
    color: 'bg-rose-500',
    quickActions: [],
  },
  employee: {
    icon: Users,
    color: 'bg-gray-500',
    quickActions: [],
  },
};

interface RoleWelcomeCardProps {
  avatarType: AvatarType;
  avatarLabel: string;
  branchId?: string;
  userName?: string;
}

export function RoleWelcomeCard({ 
  avatarType, 
  avatarLabel, 
  branchId,
  userName 
}: RoleWelcomeCardProps) {
  const config = roleConfigs[avatarType];
  const Icon = config.icon;

  // Para roles operativos (cajero/kds) no mostramos tarjeta de bienvenida
  if (avatarType === 'cashier' || avatarType === 'kds') {
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
