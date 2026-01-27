import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DollarSign, 
  Plus,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTodaySales, useDailySales, getShiftLabel, getMissingShifts } from '@/hooks/useDailySales';
import { SalesEntryModal } from '@/components/local/SalesEntryModal';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface LocalDashboardProps {
  branch: Branch;
}

/**
 * LocalDashboard - Dashboard simplificado con carga manual de ventas
 * 
 * Funcionalidades:
 * - Ver ventas de hoy por turno
 * - Cargar ventas de un turno
 * - Ver resumen semanal
 * - Ver últimas cargas
 */
export default function LocalDashboard({ branch }: LocalDashboardProps) {
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<string>('night');
  
  const { data: todaySales, isLoading: loadingToday } = useTodaySales(branch.id);
  const { data: weekSales, isLoading: loadingWeek } = useDailySales(branch.id);
  
  const missingShifts = todaySales ? getMissingShifts(todaySales) : ['morning', 'afternoon', 'night'];
  const todayTotal = todaySales?.reduce((sum, s) => sum + Number(s.sales_total || 0), 0) || 0;
  
  // Calculate week totals by day
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  const weekTotalsByDay = weekDays.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const daySales = weekSales?.filter(s => s.sale_date === dateStr) || [];
    return {
      date: day,
      dateStr,
      total: daySales.reduce((sum, s) => sum + Number(s.sales_total || 0), 0),
      shifts: daySales.map(s => s.shift),
    };
  });
  
  const weekTotal = weekTotalsByDay.reduce((sum, d) => sum + d.total, 0);
  const maxDayTotal = Math.max(...weekTotalsByDay.map(d => d.total), 1);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value);

  const handleOpenEntry = (shift?: string) => {
    if (shift) setSelectedShift(shift);
    setShowEntryModal(true);
  };

  const isLoading = loadingToday || loadingWeek;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{branch.name}</h1>
          <p className="text-muted-foreground">{branch.address}, {branch.city}</p>
        </div>
        <Button onClick={() => handleOpenEntry()} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Cargar Ventas
        </Button>
      </div>

      {/* Today's Sales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Ventas de Hoy
          </CardTitle>
          <CardDescription>
            {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {['morning', 'afternoon', 'night'].map(shift => {
                  const shiftSale = todaySales?.find(s => s.shift === shift);
                  const isLoaded = !!shiftSale;
                  
                  return (
                    <div 
                      key={shift}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        isLoaded 
                          ? 'border-success/30 bg-success/5' 
                          : 'border-dashed border-muted-foreground/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{getShiftLabel(shift)}</span>
                        {isLoaded ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <Clock className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      
                      {isLoaded ? (
                        <div className="text-2xl font-bold text-success">
                          {formatCurrency(Number(shiftSale.sales_total || 0))}
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-2"
                          onClick={() => handleOpenEntry(shift)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Cargar
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Today Total */}
              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-lg font-semibold">Total del día</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(todayTotal)}
                </span>
              </div>
              
              {/* Pending shifts warning */}
              {missingShifts.length > 0 && (
                <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-warning/10 text-warning-foreground">
                  <AlertCircle className="w-4 h-4 text-warning" />
                  <span className="text-sm">
                    {missingShifts.length === 3 
                      ? 'Ningún turno cargado aún' 
                      : `Faltan cargar: ${missingShifts.map(s => getShiftLabel(s)).join(', ')}`}
                  </span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Week Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Ventas de la Semana
          </CardTitle>
          <CardDescription>
            {format(weekStart, "'Semana del' d", { locale: es })} al {format(addDays(weekStart, 6), "d 'de' MMMM", { locale: es })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-8" />
              ))}
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {weekTotalsByDay.map((day, idx) => {
                  const isToday = format(day.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  const barWidth = maxDayTotal > 0 ? (day.total / maxDayTotal) * 100 : 0;
                  
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-12 text-sm font-medium text-muted-foreground">
                        {format(day.date, 'EEE', { locale: es })}
                      </div>
                      <div className="flex-1 relative">
                        <div 
                          className={`h-7 rounded transition-all ${
                            isToday ? 'bg-primary' : 'bg-primary/60'
                          }`}
                          style={{ width: `${barWidth}%`, minWidth: day.total > 0 ? '4px' : '0' }}
                        />
                        {day.total === 0 && (
                          <div className="absolute inset-0 flex items-center">
                            <span className="text-xs text-muted-foreground ml-1">
                              {isToday ? 'Hoy' : 'Sin datos'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="w-24 text-right text-sm font-semibold">
                        {day.total > 0 ? formatCurrency(day.total) : '-'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Week Total */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t">
                <span className="text-lg font-semibold">Total semanal</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(weekTotal)}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Últimas Cargas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : weekSales && weekSales.length > 0 ? (
            <div className="space-y-2">
              {weekSales.slice(0, 5).map((sale) => (
                <div 
                  key={sale.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm">
                      <span className="font-medium">
                        {format(new Date(sale.sale_date), 'dd/MM', { locale: es })}
                      </span>
                      <Badge variant="secondary" className="ml-2">
                        {getShiftLabel(sale.shift)}
                      </Badge>
                    </div>
                  </div>
                  <span className="font-semibold">
                    {formatCurrency(Number(sale.sales_total || 0))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No hay cargas de ventas aún
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sales Entry Modal */}
      <SalesEntryModal
        open={showEntryModal}
        onOpenChange={setShowEntryModal}
        branchId={branch.id}
        defaultShift={selectedShift}
      />
    </div>
  );
}
