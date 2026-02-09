import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, TrendingUp } from 'lucide-react';
import { useVentasMensuales } from '@/hooks/useVentasMensuales';
import { VentaMensualFormModal } from '@/components/finanzas/VentaMensualFormModal';
import { EmptyState } from '@/components/ui/states';
import type { VentaMensual } from '@/types/ventas';

export default function VentasMensualesPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: ventas, isLoading } = useVentasMensuales(branchId!);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VentaMensual | null>(null);

  const formatPeriodo = (p: string) => {
    const [y, m] = p.split('-');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${meses[parseInt(m) - 1]} ${y}`;
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Ventas Mensuales"
        subtitle="Registro de facturación contable y total por período"
        actions={
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Cargar Período
          </Button>
        }
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Período</TableHead>
              <TableHead className="text-right">FC (Contable)</TableHead>
              <TableHead className="text-right">FT (Total)</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">% FT</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !ventas?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40">
                  <EmptyState icon={TrendingUp} title="Sin ventas cargadas" description="Cargá las ventas del primer período" />
                </TableCell>
              </TableRow>
            ) : (
              ventas.map((row) => {
                const total = Number(row.fc_total) + Number(row.ft_total);
                const pctFt = total > 0 ? ((Number(row.ft_total) / total) * 100).toFixed(1) : '0.0';
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{formatPeriodo(row.periodo)}</TableCell>
                    <TableCell className="text-right font-mono">$ {Number(row.fc_total).toLocaleString('es-AR')}</TableCell>
                    <TableCell className="text-right font-mono">$ {Number(row.ft_total).toLocaleString('es-AR')}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">$ {total.toLocaleString('es-AR')}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={parseFloat(pctFt) > 30 ? 'destructive' : 'secondary'}>{pctFt}%</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(row); setModalOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <VentaMensualFormModal
        open={modalOpen}
        onOpenChange={(open) => { setModalOpen(open); if (!open) setEditing(null); }}
        branchId={branchId!}
        venta={editing}
      />
    </div>
  );
}
