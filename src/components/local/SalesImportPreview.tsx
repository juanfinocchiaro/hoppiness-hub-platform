import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileSpreadsheet, 
  Check, 
  X,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ProcessedSalesResult } from '@/hooks/useSalesImports';

interface SalesImportPreviewProps {
  result: ProcessedSalesResult;
  fileName: string;
  kitchenType: 'smash' | 'parrilla';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function SalesImportPreview({
  result,
  fileName,
  kitchenType,
  onConfirm,
  onCancel,
  isLoading,
}: SalesImportPreviewProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value);

  const formatPercent = (value: number, total: number) => {
    if (total === 0) return '0%';
    return `${Math.round((value / total) * 100)}%`;
  };

  const { summary, unknownProducts, dateFrom, dateTo, recordsCount } = result;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Preview de Importación</h1>
          <p className="text-muted-foreground">Revisá los datos antes de confirmar</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Confirmar Importación
          </Button>
        </div>
      </div>

      {/* File Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <FileSpreadsheet className="w-8 h-8 text-primary" />
            <div>
              <p className="font-medium">{fileName}</p>
              <p className="text-sm text-muted-foreground">
                {dateFrom && dateTo ? (
                  <>
                    Período: {format(dateFrom, 'dd/MM/yyyy', { locale: es })} - {format(dateTo, 'dd/MM/yyyy', { locale: es })}
                  </>
                ) : 'Período no detectado'}
                {' • '}
                {recordsCount} registros
                {' • '}
                Cocina: <Badge variant="secondary">{kitchenType.toUpperCase()}</Badge>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Ventas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-primary/5">
              <div className="text-2xl font-bold text-primary">{formatCurrency(summary.totalSales)}</div>
              <div className="text-sm text-muted-foreground">Ventas Totales</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <div className="text-2xl font-bold">{summary.totalOrders}</div>
              <div className="text-sm text-muted-foreground">Pedidos</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <div className="text-2xl font-bold">
                {summary.totalOrders > 0 ? formatCurrency(summary.totalSales / summary.totalOrders) : '$0'}
              </div>
              <div className="text-sm text-muted-foreground">Ticket Promedio</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Salón</span>
              <span className="font-medium">{formatCurrency(summary.salesSalon)} ({formatPercent(summary.salesSalon, summary.totalSales)})</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full bg-blue-500" 
                style={{ width: `${(summary.salesSalon / summary.totalSales) * 100}%` }}
              />
            </div>
            
            <div className="flex justify-between text-sm mt-3">
              <span>Mostrador</span>
              <span className="font-medium">{formatCurrency(summary.salesMostrador)} ({formatPercent(summary.salesMostrador, summary.totalSales)})</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full bg-green-500" 
                style={{ width: `${(summary.salesMostrador / summary.totalSales) * 100}%` }}
              />
            </div>
            
            <div className="flex justify-between text-sm mt-3">
              <span>Delivery</span>
              <span className="font-medium">{formatCurrency(summary.salesDelivery)} ({formatPercent(summary.salesDelivery, summary.totalSales)})</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full bg-orange-500" 
                style={{ width: `${(summary.salesDelivery / summary.totalSales) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ingredient Consumption */}
      <Card>
        <CardHeader>
          <CardTitle>Consumo de Ingredientes Calculado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 rounded-lg border">
              <div className="text-3xl mb-1">🥖</div>
              <div className="text-xl font-bold">{summary.consumedPanes}</div>
              <div className="text-sm text-muted-foreground">Panes</div>
            </div>

            {kitchenType === 'smash' ? (
              <>
                <div className="text-center p-4 rounded-lg border">
                  <div className="text-3xl mb-1">🥩</div>
                  <div className="text-xl font-bold">{summary.consumedBolitas90}</div>
                  <div className="text-sm text-muted-foreground">Bolitas 90g</div>
                </div>
                <div className="text-center p-4 rounded-lg border">
                  <div className="text-3xl mb-1">🥩</div>
                  <div className="text-xl font-bold">{summary.consumedBolitas45}</div>
                  <div className="text-sm text-muted-foreground">Bolitas 45g</div>
                </div>
              </>
            ) : (
              <div className="text-center p-4 rounded-lg border">
                <div className="text-3xl mb-1">🥩</div>
                <div className="text-xl font-bold">{summary.consumedMedallones110}</div>
                <div className="text-sm text-muted-foreground">Medallones 110g</div>
              </div>
            )}

            <div className="text-center p-4 rounded-lg border bg-red-50 dark:bg-red-950/20">
              <div className="text-3xl mb-1">🥩</div>
              <div className="text-xl font-bold text-red-600">{summary.consumedCarneKg.toFixed(1)} kg</div>
              <div className="text-sm text-muted-foreground">Carne Total</div>
            </div>

            <div className="text-center p-4 rounded-lg border">
              <div className="text-3xl mb-1">🍟</div>
              <div className="text-xl font-bold">{summary.consumedPapas}</div>
              <div className="text-sm text-muted-foreground">Papas</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unknown Products */}
      {unknownProducts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">
              {unknownProducts.length} producto(s) no reconocido(s)
            </div>
            <div className="text-sm space-y-1">
              {unknownProducts.slice(0, 5).map((p, i) => (
                <div key={i}>
                  • <code>{p.codigo}</code> - {p.nombre} ({p.cantidad} uds)
                </div>
              ))}
              {unknownProducts.length > 5 && (
                <div className="text-muted-foreground">
                  y {unknownProducts.length - 5} más...
                </div>
              )}
            </div>
            <p className="text-xs mt-2 text-muted-foreground">
              Estos productos no tienen receta configurada y no se calcularon sus ingredientes.
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
