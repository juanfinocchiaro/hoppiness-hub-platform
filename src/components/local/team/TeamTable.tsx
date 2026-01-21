import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { EmployeeExpandedRow } from './EmployeeExpandedRow';
import type { TeamMember } from './types';
import { LOCAL_ROLE_LABELS, formatHours, formatClockIn } from './types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TeamTableProps {
  team: TeamMember[];
  branchId: string;
  onMemberUpdated: () => void;
}

export function TeamTable({ team, branchId, onMemberUpdated }: TeamTableProps) {
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  const handleRowClick = (memberId: string) => {
    setExpandedMemberId(prev => prev === memberId ? null : memberId);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-auto max-h-[calc(100vh-280px)]">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[90px]">Ingreso</TableHead>
              <TableHead className="min-w-[150px]">Nombre</TableHead>
              <TableHead className="min-w-[180px]">Email</TableHead>
              <TableHead className="w-[100px]">Rol</TableHead>
              <TableHead className="w-[100px] text-right">Horas/mes</TableHead>
              <TableHead className="w-[120px]">Últ. fichaje</TableHead>
              <TableHead className="w-[120px]">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {team.map((member) => {
              const isExpanded = expandedMemberId === member.id;
              const roleLabel = LOCAL_ROLE_LABELS[member.local_role || ''] || 'Empleado';
              
              return (
                <>
                  <TableRow 
                    key={member.id}
                    onClick={() => handleRowClick(member.id)}
                    className={cn(
                      "cursor-pointer transition-colors",
                      isExpanded && "bg-muted/50"
                    )}
                  >
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(member.hire_date), 'dd/MM/yy', { locale: es })}
                    </TableCell>
                    <TableCell className="font-medium truncate max-w-[200px]">
                      {member.full_name || 'Sin nombre'}
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate block max-w-[200px] text-muted-foreground">
                            {member.email}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{member.email}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-sm font-medium",
                        member.local_role === 'franquiciado' && "text-amber-600",
                        member.local_role === 'encargado' && "text-green-600",
                        (member.local_role === 'cajero' || member.local_role === 'empleado') && "text-slate-600"
                      )}>
                        {roleLabel}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      <span className={cn(
                        member.hours_this_month < member.monthly_hours_target * 0.5 && "text-amber-600"
                      )}>
                        {formatHours(member.hours_this_month)} / {formatHours(member.monthly_hours_target)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatClockIn(member.last_clock_in)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge member={member} />
                    </TableCell>
                  </TableRow>
                  
                  {isExpanded && (
                    <TableRow key={`${member.id}-expanded`}>
                      <TableCell colSpan={7} className="p-0 bg-muted/30">
                        <EmployeeExpandedRow 
                          member={member}
                          branchId={branchId}
                          onClose={() => setExpandedMemberId(null)}
                          onMemberUpdated={onMemberUpdated}
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

function StatusBadge({ member }: { member: TeamMember }) {
  if (member.active_warnings > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-amber-600">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        {member.active_warnings} aperc.
      </span>
    );
  }
  
  if (member.is_working) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-green-600">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        Trabajando
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      <span className="w-2 h-2 rounded-full bg-gray-300" />
      Fuera
    </span>
  );
}
