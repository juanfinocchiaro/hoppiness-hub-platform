import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Pencil, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useVentaMensualMutations } from '@/hooks/useVentasMensuales';
import { VentaMensualFormModal } from '@/components/finanzas/VentaMensualFormModal';
import { EmptyState } from '@/components/ui/states';
import { getCurrentPeriodo } from '@/types/compra';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatPeriodo(p: string) {
  const [y, m] = p.split('-');
  return `${MESES[parseInt(m) - 1]} ${y}`;
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

export default function VentasMensualesMarcaPage() {
  const { user } = useAuth();
  const [periodo, setPeriodo] = useState(getCurrentPeriodo());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editingVenta, setEditingVenta] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // All branches
  const { data: branches, isLoading: loadingBranches } = useQuery({
    queryKey: ['branches-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // All ventas for selected period
  const { data: ventas, isLoading: loadingVentas } = useQuery({
    queryKey: ['ventas-mensuales-marca', periodo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ventas_mensuales_local')
        .select('*')
        .eq('periodo', periodo)
        .is('deleted_at', null);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!periodo,
  });

  // Match ventas to branches
  const rows = branches?.map(branch => {
    const venta = ventas?.find(v => v.branch_id === branch.id);
    const fc = Number(venta?.fc_total || 0);
    const ft = Number(venta?.ft_total || 0);
    const total = fc + ft;
    const pctFt = total > 0 ? ((ft / total) * 100).toFixed(1) : '-';
    const canon = fc * 0.05; // 4.5% + 0.5%
    return { branch, venta, fc, ft, total, pctFt, canon };
  }) || [];

  const totalFC = rows.reduce((s, r) => s + r.fc, 0);
  const totalFT = rows.reduce((s, r) => s + r.ft, 0);
  const totalCanon = rows.reduce((s, r) => s + (r.venta ? r.canon : 0), 0);
  const cargados = rows.filter(r => r.venta).length;

  const openModal = (branchId: string, venta?: any) => {
    setEditingBranchId(branchId);
    setEditingVenta(venta || null);
    setModalOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Ventas Mensuales por Local"
        subtitle="Registro de facturación contable y total por período — Solo cargable desde Marca"
      />

      {/* Period selector + summary */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="w-48">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {getPeriodoOptions().map(p => (
                <SelectItem key={p} value={p}>{formatPeriodo(p)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-muted-foreground">Cargados: <strong>{cargados}/{rows.length}</strong></span>
          <span className="text-muted-foreground">FC: <strong className="font-mono">$ {totalFC.toLocaleString('es-AR')}</strong></span>
          <span className="text-muted-foreground">FT: <strong className="font-mono">$ {totalFT.toLocaleString('es-AR')}</strong></span>
          <span className="text-muted-foreground">Canon: <strong className="font-mono">$ {totalCanon.toLocaleString('es-AR')}</strong></span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Local</TableHead>
              <TableHead className="text-right">FC (Contable)</TableHead>
              <TableHead className="text-right">FT (Total)</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">% FT</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(loadingBranches || loadingVentas) ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !rows.length ? (
              <TableRow>
                <TableCell colSpan={8} className="h-40">
                  <EmptyState icon={TrendingUp} title="Sin locales" description="No hay sucursales activas" />
                </TableCell>
              </TableRow>
            ) : (
              rows.map(({ branch, venta, fc, ft, total, pctFt, canon }) => (
                <>
                  <TableRow key={branch.id}>
                    <TableCell>
                      {venta && (
                        <button onClick={() => setExpanded(expanded === branch.id ? null : branch.id)}>
                          {expanded === branch.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{branch.name}</TableCell>
                    <TableCell className="text-right font-mono">
                      {venta ? `$ ${fc.toLocaleString('es-AR')}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {venta ? `$ ${ft.toLocaleString('es-AR')}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {venta ? `$ ${total.toLocaleString('es-AR')}` : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {venta ? (
                        <Badge variant={parseFloat(pctFt) > 30 ? 'destructive' : 'secondary'}>{pctFt}%</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {venta ? (
                        <Badge variant="default">Cargado</Badge>
                      ) : (
                        <Badge variant="outline">Sin cargar</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {venta ? (
                        <Button variant="ghost" size="icon" onClick={() => openModal(branch.id, venta)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => openModal(branch.id)}>
                          <Plus className="w-3.5 h-3.5 mr-1" /> Cargar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {expanded === branch.id && venta && (
                    <TableRow key={`${branch.id}-detail`}>
                      <TableCell colSpan={8} className="bg-muted/30">
                        <div className="p-3 space-y-1 text-sm">
                          <p>Canon (4.5%): <strong className="font-mono">$ {(fc * 0.045).toLocaleString('es-AR')}</strong></p>
                          <p>Marketing (0.5%): <strong className="font-mono">$ {(fc * 0.005).toLocaleString('es-AR')}</strong></p>
                          <p>Total Canon: <strong className="font-mono">$ {canon.toLocaleString('es-AR')}</strong></p>
                          {venta.observaciones && <p className="text-muted-foreground">Obs: {venta.observaciones}</p>}
                          <p className="text-xs text-muted-foreground">
                            Cargado: {new Date(venta.created_at).toLocaleDateString('es-AR')}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Totals card */}
      {rows.some(r => r.venta) && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">FC Total</p>
                <p className="text-lg font-bold font-mono">$ {totalFC.toLocaleString('es-AR')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">FT Total</p>
                <p className="text-lg font-bold font-mono">$ {totalFT.toLocaleString('es-AR')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ventas Total</p>
                <p className="text-lg font-bold font-mono">$ {(totalFC + totalFT).toLocaleString('es-AR')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Canon Total</p>
                <p className="text-lg font-bold font-mono">$ {totalCanon.toLocaleString('es-AR')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {editingBranchId && (
        <VentaMensualFormModal
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) { setEditingBranchId(null); setEditingVenta(null); }
          }}
          branchId={editingBranchId}
          periodo={periodo}
          venta={editingVenta}
        />
      )}
    </div>
  );
}