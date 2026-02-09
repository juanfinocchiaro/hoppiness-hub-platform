import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, TrendingUp, AlertCircle } from 'lucide-react';
import { useVentasMensuales } from '@/hooks/useVentasMensuales';
import { VentaMensualFormModal } from '@/components/finanzas/VentaMensualFormModal';
import { EmptyState } from '@/components/ui/states';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { VentaMensual } from '@/types/ventas';
import { getCurrentPeriodo } from '@/types/compra';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_LARGO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function formatPeriodo(p: string) {
  const [y, m] = p.split('-');
  return `${MESES[parseInt(m) - 1]} ${y}`;
}

function formatPeriodoLargo(p: string) {
  const [y, m] = p.split('-');
  return `${MESES_LARGO[parseInt(m) - 1]} ${y}`;
}

function getPeriodoOptions() {
  const options: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return options;
}

export default function VentasMensualesPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: ventas, isLoading } = useVentasMensuales(branchId!);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VentaMensual | null>(null);
  const [periodoParaCargar, setPeriodoParaCargar] = useState(getCurrentPeriodo());

  // Verificar si el período seleccionado ya está cargado
  const periodoYaCargado = ventas?.some(v => v.periodo === periodoParaCargar);

  const handleCargarNuevo = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEditar = (venta: VentaMensual) => {
    setEditing(venta);
    setPeriodoParaCargar(venta.periodo);
    setModalOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Ventas Mensuales"
        subtitle="Registro de facturación contable y total por período"
      />

      {/* Selector de período para cargar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div className="space-y-1">
          <label className="text-sm font-medium">Período a cargar</label>
          <Select value={periodoParaCargar} onValueChange={setPeriodoParaCargar}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getPeriodoOptions().map(p => (
                <SelectItem key={p} value={p}>
                  {formatPeriodoLargo(p)}
                  {ventas?.some(v => v.periodo === p) && ' ✓'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button 
          onClick={handleCargarNuevo}
          disabled={periodoYaCargado}
        >
          <Plus className="w-4 h-4 mr-2" /> 
          Cargar {formatPeriodo(periodoParaCargar)}
        </Button>
      </div>

      {periodoYaCargado && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Ya hay ventas cargadas para <strong>{formatPeriodoLargo(periodoParaCargar)}</strong>. 
            Podés editar el registro existente haciendo click en el ícono de lápiz.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabla de historial */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Período</TableHead>
              <TableHead className="text-right">Venta Total (FC)</TableHead>
              <TableHead className="text-right">Efectivo</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">% Efectivo</TableHead>
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
                  <EmptyState 
                    icon={TrendingUp} 
                    title="Sin ventas cargadas" 
                    description="Seleccioná un período arriba y hacé click en Cargar" 
                  />
                </TableCell>
              </TableRow>
            ) : (
              ventas.map((row) => {
                const fc = Number(row.fc_total);
                const ft = Number(row.ft_total);
                const total = fc + ft;
                const pctFt = total > 0 ? ((ft / total) * 100).toFixed(1) : '0.0';
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{formatPeriodo(row.periodo)}</TableCell>
                    <TableCell className="text-right font-mono">$ {fc.toLocaleString('es-AR')}</TableCell>
                    <TableCell className="text-right font-mono">$ {ft.toLocaleString('es-AR')}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">$ {total.toLocaleString('es-AR')}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={parseFloat(pctFt) > 30 ? 'destructive' : 'secondary'}>{pctFt}%</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleEditar(row)}>
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
        periodo={periodoParaCargar}
        venta={editing}
      />
    </div>
  );
}
