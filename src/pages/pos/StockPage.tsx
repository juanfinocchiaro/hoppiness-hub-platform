/**
 * StockPage - Stock en tiempo real con alertas, carga inicial y ajuste
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Package, AlertTriangle, PlusCircle, Edit3, CalendarCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useStock } from '@/hooks/pos/useStock';
import { Button } from '@/components/ui/button';
import { CierreStockModal } from '@/components/pos/CierreStockModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StockInicialModal } from '@/components/pos/StockInicialModal';
import { AjusteStockModal } from '@/components/pos/AjusteStockModal';

export default function StockPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: stock, isLoading, error } = useStock(branchId!);
  const [stockInicialOpen, setStockInicialOpen] = useState(false);
  const [ajusteOpen, setAjusteOpen] = useState(false);
  const [cierreOpen, setCierreOpen] = useState(false);

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Stock" subtitle="Stock en tiempo real" icon={Package} />
        <Alert variant="destructive">
          <AlertDescription>
            No se pudo cargar el stock. Ejecutá RUN_POS_MIGRATIONS_PART2.sql si aún no lo hiciste.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock"
        subtitle="Stock en tiempo real"
        icon={Package}
        actions={
          branchId ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setStockInicialOpen(true)}>
                <PlusCircle className="h-4 w-4 mr-1" />
                Cargar stock inicial
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAjusteOpen(true)}>
                <Edit3 className="h-4 w-4 mr-1" />
                Ajustar stock
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCierreOpen(true)}>
                <CalendarCheck className="h-4 w-4 mr-1" />
                Cierre mensual
              </Button>
            </div>
          ) : undefined
        }
      />

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !stock || stock.length === 0 ? (
        <Alert>
          <AlertDescription>
            Sin registros de stock. Los movimientos se crean automáticamente desde compras y ventas POS.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Insumo</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead className="text-right">Crítico</TableHead>
                <TableHead className="w-20">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stock.map((row: any) => {
                const insumo = row.insumos;
                const nombre = insumo?.nombre ?? row.insumo_id;
                const cantidad = Number(row.cantidad ?? 0);
                const minimo = row.stock_minimo != null ? Number(row.stock_minimo) : null;
                const critico = row.stock_critico != null ? Number(row.stock_critico) : null;
                const bajo = minimo != null && cantidad <= minimo;
                const criticoAlerta = critico != null && cantidad <= critico;

                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{nombre}</TableCell>
                    <TableCell className="text-right tabular-nums">{cantidad}</TableCell>
                    <TableCell>{row.unidad}</TableCell>
                    <TableCell className="text-right tabular-nums">{minimo ?? '-'}</TableCell>
                    <TableCell className="text-right tabular-nums">{critico ?? '-'}</TableCell>
                    <TableCell>
                      {criticoAlerta && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" /> Crítico
                        </Badge>
                      )}
                      {!criticoAlerta && bajo && (
                        <Badge variant="secondary">Bajo</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {branchId && (
        <>
          <StockInicialModal
            open={stockInicialOpen}
            onOpenChange={setStockInicialOpen}
            branchId={branchId}
          />
          <AjusteStockModal
            open={ajusteOpen}
            onOpenChange={setAjusteOpen}
            branchId={branchId}
          />
          <CierreStockModal
            open={cierreOpen}
            onOpenChange={setCierreOpen}
            branchId={branchId}
          />
        </>
      )}
    </div>
  );
}
