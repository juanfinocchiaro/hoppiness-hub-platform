import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface UsersFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  accessFilter: string;
  onAccessFilterChange: (value: string) => void;
  activityFilter: string;
  onActivityFilterChange: (value: string) => void;
  hideInactiveClients: boolean;
  onHideInactiveClientsChange: (value: boolean) => void;
}

export function UsersFilters({
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  accessFilter,
  onAccessFilterChange,
  activityFilter,
  onActivityFilterChange,
  hideInactiveClients,
  onHideInactiveClientsChange,
}: UsersFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <div className="flex flex-wrap items-center gap-3">
        <Select value={roleFilter} onValueChange={onRoleFilterChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            <SelectItem value="superadmin">Superadmin</SelectItem>
            <SelectItem value="coordinador">Coordinador</SelectItem>
            <SelectItem value="franquiciado">Franquiciado</SelectItem>
            <SelectItem value="encargado">Encargado</SelectItem>
            <SelectItem value="cajero">Cajero</SelectItem>
            <SelectItem value="empleado">Empleado</SelectItem>
            <SelectItem value="cliente">Solo clientes</SelectItem>
          </SelectContent>
        </Select>

        <Select value={accessFilter} onValueChange={onAccessFilterChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Acceso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="brand">Con acceso Mi Marca</SelectItem>
            <SelectItem value="local">Con acceso Mi Local</SelectItem>
            <SelectItem value="none">Sin accesos</SelectItem>
          </SelectContent>
        </Select>

        <Select value={activityFilter} onValueChange={onActivityFilterChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Actividad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="with_orders">Con pedidos</SelectItem>
            <SelectItem value="no_orders">Sin pedidos</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto">
          <Checkbox 
            id="hide-inactive"
            checked={hideInactiveClients}
            onCheckedChange={(checked) => onHideInactiveClientsChange(!!checked)}
          />
          <Label htmlFor="hide-inactive" className="text-sm cursor-pointer">
            Ocultar clientes sin pedidos
          </Label>
        </div>
      </div>
    </div>
  );
}
