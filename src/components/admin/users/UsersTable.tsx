import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { UserExpandedRow } from './UserExpandedRow';
import type { UserWithStats, Branch } from './types';
import { getHighestRole, formatShortDate, ROLE_LABELS } from './types';

interface UsersTableProps {
  users: UserWithStats[];
  branches: Branch[];
  onUserUpdated: () => void;
}

export function UsersTable({ users, branches, onUserUpdated }: UsersTableProps) {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const handleRowClick = (userId: string) => {
    setExpandedUserId(prev => prev === userId ? null : userId);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-auto max-h-[calc(100vh-280px)]">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[90px]">Registro</TableHead>
              <TableHead className="min-w-[150px]">Nombre</TableHead>
              <TableHead className="min-w-[180px]">Email</TableHead>
              <TableHead className="w-[110px]">Rol</TableHead>
              <TableHead className="w-[80px] text-center">Mi Marca</TableHead>
              <TableHead className="w-[100px] text-center">Sucursales</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isExpanded = expandedUserId === user.id;
              const highestRole = getHighestRole(user.brand_role, user.branch_roles);
              const roleLabel = ROLE_LABELS[highestRole] || 'Sin rol';
              const branchCount = user.branch_roles.length;
              
              return (
                <>
                  <TableRow 
                    key={user.id}
                    onClick={() => handleRowClick(user.id)}
                    className={cn(
                      "cursor-pointer transition-colors",
                      isExpanded && "bg-muted/50"
                    )}
                  >
                    <TableCell className="text-muted-foreground text-sm">
                      {formatShortDate(user.created_at)}
                    </TableCell>
                    <TableCell className="font-medium truncate max-w-[200px]">
                      {user.full_name || 'Sin nombre'}
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate block max-w-[200px] text-muted-foreground">
                            {user.email}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{user.email}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-sm font-medium",
                        highestRole === 'superadmin' && "text-purple-600",
                        highestRole === 'coordinador' && "text-blue-600",
                        highestRole === 'franquiciado' && "text-amber-600",
                        highestRole === 'encargado' && "text-green-600",
                        (highestRole === 'cajero' || highestRole === 'empleado') && "text-slate-600",
                        highestRole === 'staff' && "text-muted-foreground"
                      )}>
                        {roleLabel}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <AccessIndicator hasAccess={!!user.brand_role} />
                    </TableCell>
                    <TableCell className="text-center">
                      {branchCount > 0 ? (
                        <span className="text-sm font-medium text-green-600">
                          {branchCount} local{branchCount > 1 ? 'es' : ''}
                        </span>
                      ) : (
                        <AccessIndicator hasAccess={false} />
                      )}
                    </TableCell>
                  </TableRow>
                  
                  {isExpanded && (
                    <TableRow key={`${user.id}-expanded`}>
                      <TableCell colSpan={6} className="p-0 bg-muted/30">
                        <UserExpandedRow 
                          user={user} 
                          branches={branches}
                          onClose={() => setExpandedUserId(null)}
                          onUserUpdated={onUserUpdated}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AccessIndicator({ hasAccess }: { hasAccess: boolean }) {
  return (
    <span 
      className={cn(
        "inline-block w-2.5 h-2.5 rounded-full",
        hasAccess ? "bg-green-500" : "bg-gray-300"
      )}
      title={hasAccess ? "Con acceso" : "Sin acceso"}
    />
  );
}
