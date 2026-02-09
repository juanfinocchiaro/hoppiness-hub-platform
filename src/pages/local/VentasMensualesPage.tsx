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
        subtitle="Venta total y efectivo por período"
      />

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
        <Button onClick={handleCargarNuevo} disabled={periodoYaCargado}>
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Período</TableHead>
              <TableHead className="text-right">Venta Total</TableHead>
              <TableHead className="text-right">Efectivo</TableHead>
              <TableHead className="text-right">Online</TableHead>
              <TableHead className="text-right">% Ef.</TableHead>
              <TableHead className="text-right">Canon</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !ventas?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40">
                  <EmptyState 
                    icon={TrendingUp} 
                    title="Sin ventas cargadas" 
                    description="Seleccioná un período arriba y hacé click en Cargar" 
                  />
                </TableCell>
              </TableRow>
            ) : (
              ventas.map((row) => {
                const vt = Number(row.venta_total ?? 0);
                const ef = Number(row.efectivo ?? 0);
                const online = vt - ef;
                const pctEf = vt > 0 ? ((ef / vt) * 100).toFixed(1) : '0.0';
                const canon = vt * 0.05;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{formatPeriodo(row.periodo)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">$ {vt.toLocaleString('es-AR')}</TableCell>
                    <TableCell className="text-right font-mono">$ {ef.toLocaleString('es-AR')}</TableCell>
                    <TableCell className="text-right font-mono">$ {online.toLocaleString('es-AR')}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={parseFloat(pctEf) > 30 ? 'destructive' : 'secondary'}>{pctEf}%</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">$ {canon.toLocaleString('es-AR')}</TableCell>
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
