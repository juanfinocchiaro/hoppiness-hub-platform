/**
 * SalesHistoryPage - Historial de cierres de turno
 * 
 * Muestra los cierres de ventas de los últimos días con:
 * - Selector de rango de fechas
 * - Tabla con fecha, turno, hamburguesas, vendido, alertas
 */
import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format, subDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, AlertCircle, CheckCircle, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useClosuresByDateRange, getShiftLabel } from '@/hooks/useShiftClosures';
import { PageHeader } from '@/components/ui/page-header';

const RANGE_OPTIONS = [
  { value: '7', label: 'Últimos 7 días' },
  { value: '15', label: 'Últimos 15 días' },
  { value: '30', label: 'Últimos 30 días' },
];

export default function SalesHistoryPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const [daysBack, setDaysBack] = useState('7');

  const today = startOfDay(new Date());
  const fromDate = subDays(today, parseInt(daysBack));

  const { data: closures, isLoading } = useClosuresByDateRange(
    branchId || '',
    fromDate,
    today
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(value);

  // Agrupar por fecha para mostrar mejor
  const closuresByDate = useMemo(() => {
    if (!closures) return [];
    
    const grouped = new Map<string, typeof closures>();
    closures.forEach(c => {
      const existing = grouped.get(c.fecha) || [];
      existing.push(c);
      grouped.set(c.fecha, existing);
    });
    
    return Array.from(grouped.entries())
      .sort((a, b) => b[0].localeCompare(a[0])); // Más reciente primero
  }, [closures]);

  // Totales
  const totals = useMemo(() => {
    if (!closures) return { vendido: 0, hamburguesas: 0, alertas: 0 };
    return closures.reduce((acc, c) => ({
      vendido: acc.vendido + Number(c.total_vendido || 0),
      hamburguesas: acc.hamburguesas + Number(c.total_hamburguesas || 0),
      alertas: acc.alertas + (c.tiene_alerta_facturacion || c.tiene_alerta_posnet || c.tiene_alerta_apps || c.tiene_alerta_caja ? 1 : 0),
    }), { vendido: 0, hamburguesas: 0, alertas: 0 });
  }, [closures]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <PageHeader
        title="Historial de Ventas"
        subtitle="Cierres de turno registrados"
        breadcrumb={[
          { label: 'Dashboard', href: `/milocal/${branchId}` },
          { label: 'Historial de Ventas' },
        ]}
      />

      {/* Filtro + Resumen */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Select value={daysBack} onValueChange={setDaysBack}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!isLoading && closures && (
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="font-medium">{formatCurrency(totals.vendido)}</span>
            </div>
            <div className="text-muted-foreground">
              {totals.hamburguesas} hamburguesas
            </div>
            {totals.alertas > 0 && (
              <Badge variant="destructive" className="text-xs">
                {totals.alertas} alertas
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : !closures || closures.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No hay cierres registrados en este período</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead className="text-right">Hamburguesas</TableHead>
                  <TableHead className="text-right">Vendido</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closuresByDate.map(([fecha, dayClosures]) => (
                  dayClosures.map((closure, idx) => {
                    const hasAlerts = closure.tiene_alerta_facturacion || 
                                      closure.tiene_alerta_posnet || 
                                      closure.tiene_alerta_apps || 
                                      closure.tiene_alerta_caja;
                    
                    return (
                      <TableRow key={closure.id}>
                        <TableCell className="font-medium">
                          {idx === 0 ? (
                            <span>
                              {format(new Date(fecha + 'T12:00:00'), 'EEE d MMM', { locale: es })}
                            </span>
                          ) : (
                            <span className="text-transparent">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getShiftLabel(closure.turno)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {closure.total_hamburguesas}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {formatCurrency(Number(closure.total_vendido || 0))}
                        </TableCell>
                        <TableCell className="text-center">
                          {hasAlerts ? (
                            <AlertCircle className="w-4 h-4 text-warning mx-auto" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-success mx-auto" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
