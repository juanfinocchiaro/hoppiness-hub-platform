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
  Calculator,
  Coffee
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

const roleConfigs: Record<AvatarType, RoleConfig> = {
  superadmin: {
    icon: Crown,
    color: 'bg-amber-500',
    quickActions: [
      { label: 'Mis Locales', to: '/mimarca', icon: Store },
      { label: 'Usuarios', to: '/mimarca/usuarios', icon: Users },
    ],
  },
  coordinador: {
    icon: Package,
    color: 'bg-blue-500',
    quickActions: [
      { label: 'Dashboard', to: '/mimarca', icon: BarChart3 },
    ],
  },
  informes: {
    icon: BarChart3,
    color: 'bg-purple-500',
    quickActions: [
      { label: 'Dashboard', to: '/mimarca', icon: BarChart3 },
    ],
  },
  contador_marca: {
    icon: Calculator,
    color: 'bg-teal-500',
    quickActions: [
      { label: 'Dashboard', to: '/mimarca', icon: DollarSign },
    ],
  },
  franquiciado: {
    icon: Store,
    color: 'bg-green-500',
    quickActions: [
      { label: 'Mi Equipo', to: 'equipo', icon: Users },
      { label: 'Horarios', to: 'equipo/horarios', icon: Clock },
    ],
  },
  encargado: {
    icon: ClipboardList,
    color: 'bg-orange-500',
    quickActions: [
      { label: 'Fichajes', to: 'equipo/fichajes', icon: Clock },
      { label: 'Horarios', to: 'equipo/horarios', icon: Clock },
    ],
  },
  cocinero: {
    icon: ChefHat,
    color: 'bg-rose-500',
    quickActions: [],
  },
  cajero: {
    icon: Monitor,
    color: 'bg-primary',
    quickActions: [],
  },
  barista: {
    icon: Coffee,
    color: 'bg-amber-600',
    quickActions: [],
  },
  guest: {
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
  variant?: 'local' | 'brand';
}

export function RoleWelcomeCard({ 
  avatarType, 
  avatarLabel, 
  branchId,
  userName,
  variant = 'local'
}: RoleWelcomeCardProps) {
  const config = roleConfigs[avatarType];
  const Icon = config.icon;

  // Para roles operativos no mostramos tarjeta de bienvenida
  if (['cajero', 'cocinero', 'barista'].includes(avatarType)) {
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
                    ? `/milocal/${branchId}/${action.to}` 
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
