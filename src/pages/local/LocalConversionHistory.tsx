/**
 * Historial de conversiones de ingredientes alternativos del local
 */
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { RefreshCw, ArrowRight, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { useConversionHistory } from '@/hooks/useIngredientConversions';
import { PageHelp } from '@/components/shared/PageHelp';

const formatCurrency = (value: number | null) => {
  if (value === null) return '-';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(value);
};

export default function LocalConversionHistory() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: conversions, isLoading } = useConversionHistory(branchId);

  // Estadísticas del mes
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthConversions = conversions?.filter(c => {
    const d = new Date(c.created_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }) || [];

  const totalQuantityMonth = monthConversions.reduce((sum, c) => sum + c.quantity, 0);
  const totalCostDiffMonth = monthConversions.reduce((sum, c) => sum + (c.cost_difference || 0) * c.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RefreshCw className="h-6 w-6" />
            Historial de Conversiones
          </h1>
          <p className="text-muted-foreground">
            Registro de ingredientes alternativos utilizados
          </p>
        </div>
      </div>

      <PageHelp
        id="local-conversion-history"
        title="Historial de Conversiones"
        description="Registro de todas las conversiones de ingredientes alternativos realizadas en el local."
        tips={[
          "Cada vez que se usa un ingrediente alternativo, queda registrado aquí",
          "La diferencia de costo te ayuda a entender el impacto económico",
          "La marca puede ver estas conversiones en sus alertas"
        ]}
      />

      {/* Stats del mes */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Conversiones del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{monthConversions.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Unidades Convertidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalQuantityMonth.toLocaleString('es-AR')}</p>
          </CardContent>
        </Card>

        <Card className={totalCostDiffMonth > 0 ? 'border-destructive/30' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {totalCostDiffMonth > 0 ? (
                <TrendingUp className="h-4 w-4 text-destructive" />
              ) : (
                <TrendingDown className="h-4 w-4 text-primary" />
              )}
              Diferencia de Costo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalCostDiffMonth > 0 ? 'text-destructive' : 'text-primary'}`}>
              {totalCostDiffMonth > 0 ? '+' : ''}{formatCurrency(totalCostDiffMonth)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de historial */}
      <Card>
        <CardHeader>
          <CardTitle>Historial Completo</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !conversions?.length ? (
            <div className="py-12 text-center text-muted-foreground">
              <RefreshCw className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No hay conversiones registradas</p>
              <p className="text-sm mt-1">
                Las conversiones aparecerán aquí cuando uses ingredientes alternativos
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Conversión</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Dif. Costo</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Realizado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversions.map((conv) => {
                  const costDiff = (conv.cost_difference || 0) * conv.quantity;
                  
                  return (
                    <TableRow key={conv.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">
                            {format(new Date(conv.created_at), 'dd/MM/yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(conv.created_at), 'HH:mm')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{conv.from_ingredient?.name || 'Desconocido'}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-medium">{conv.to_ingredient?.name || 'Desconocido'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {conv.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {costDiff !== 0 ? (
                          <Badge variant={costDiff > 0 ? 'destructive' : 'default'} className="font-mono">
                            {costDiff > 0 ? '+' : ''}{formatCurrency(costDiff)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {conv.product ? (
                          <Badge variant="outline" className="text-xs">
                            {conv.product.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {conv.performer?.full_name || 'Sistema'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
