/**
 * MonthlyHoursSummary Component
 * 
 * Muestra resumen de horas trabajadas por empleado en el mes.
 * Incluye exportación a CSV.
 */
import { useState } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Clock, 
  AlertTriangle,
  User,
  CalendarDays
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { 
  useMonthlyHours, 
  formatMinutesToHours, 
  generateHoursCSV,
  type EmployeeHoursSummary 
} from '@/hooks/useMonthlyHours';
import { LOCAL_ROLE_LABELS } from '@/hooks/usePermissionsV2';

interface MonthlyHoursSummaryProps {
  branchId: string;
}

function EmployeeCard({ summary }: { summary: EmployeeHoursSummary }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const initials = summary.userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={summary.hasUnpairedEntries ? 'border-amber-300' : ''}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={summary.avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{summary.userName}</span>
                    {summary.hasUnpairedEntries && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {summary.unpairedCount} sin par
                      </Badge>
                    )}
                  </div>
                  {summary.localRole && (
                    <span className="text-xs text-muted-foreground">
                      {LOCAL_ROLE_LABELS[summary.localRole] || summary.localRole}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-right">
                <div>
                  <div className="font-bold text-lg">
                    {formatMinutesToHours(summary.totalMinutes)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {summary.daysWorked} días
                  </div>
                </div>
                <div className="hidden sm:block text-sm text-muted-foreground">
                  ~{formatMinutesToHours(summary.averageMinutesPerDay)}/día
                </div>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-3 px-4">
            <div className="border-t pt-3">
              <h4 className="text-sm font-medium mb-2">Detalle por día</h4>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {summary.entries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin fichajes</p>
                ) : (
                  summary.entries.map((entry, idx) => (
                    <div 
                      key={idx}
                      className={`flex items-center justify-between text-sm p-2 rounded ${
                        !entry.checkOut ? 'bg-amber-50 border border-amber-200' : 'bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-muted-foreground" />
                        <span>{format(new Date(entry.date), 'EEE d MMM', { locale: es })}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-green-600">
                          {format(new Date(entry.checkIn), 'HH:mm')}
                        </span>
                        {entry.checkOut ? (
                          <>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-red-600">
                              {format(new Date(entry.checkOut), 'HH:mm')}
                            </span>
                            <Badge variant="secondary" className="ml-2">
                              {formatMinutesToHours(entry.minutesWorked)}
                            </Badge>
                          </>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            Sin salida
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function MonthlyHoursSummary({ branchId }: MonthlyHoursSummaryProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const { 
    summaries, 
    totalTeamMinutes, 
    totalTeamDays, 
    employeesWithUnpaired,
    loading 
  } = useMonthlyHours({ branchId, year, month });
  
  const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));
  
  const monthLabel = format(currentDate, 'MMMM yyyy', { locale: es });
  const monthLabelCapitalized = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  
  const handleExportCSV = () => {
    const csv = generateHoursCSV(summaries, monthLabelCapitalized);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `horas-${format(currentDate, 'yyyy-MM')}.csv`;
    link.click();
  };
  
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader className="py-3 px-4">
              <Skeleton className="h-12 w-full" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Header con navegación de mes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[160px] text-center">
            {monthLabelCapitalized}
          </h2>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleNextMonth}
            disabled={month === new Date().getMonth() && year === new Date().getFullYear()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <Button variant="outline" onClick={handleExportCSV} disabled={summaries.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>
      
      {/* Resumen general */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">
                {formatMinutesToHours(totalTeamMinutes)}
              </div>
              <div className="text-xs text-muted-foreground">Total horas</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{totalTeamDays}</div>
              <div className="text-xs text-muted-foreground">Días-persona</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{summaries.length}</div>
              <div className="text-xs text-muted-foreground">Empleados</div>
            </div>
            <div>
              {employeesWithUnpaired > 0 ? (
                <>
                  <div className="text-2xl font-bold text-amber-600">
                    {employeesWithUnpaired}
                  </div>
                  <div className="text-xs text-amber-600">Con fichajes sin par</div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-green-600">✓</div>
                  <div className="text-xs text-muted-foreground">Todo completo</div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Lista de empleados */}
      {summaries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium">Sin fichajes este mes</h3>
            <p className="text-sm text-muted-foreground mt-1">
              No hay registros de fichaje para {monthLabelCapitalized.toLowerCase()}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {summaries.map(summary => (
            <EmployeeCard key={summary.userId} summary={summary} />
          ))}
        </div>
      )}
    </div>
  );
}
