import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getCurrentPeriodo, CATEGORIA_GASTO_OPTIONS } from '@/types/compra';
import { CATEGORIA_PL_OPTIONS } from '@/hooks/useConsumosManuales';

function usePLData(branchId: string, periodo: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pl-dashboard', branchId, periodo],
    queryFn: async () => {
      const [ventasRes, facturasRes, gastosRes, consumosRes] = await Promise.all([
        supabase.from('ventas_mensuales_local').select('*').eq('branch_id', branchId).eq('periodo', periodo).maybeSingle(),
        supabase.from('facturas_proveedores').select('*, items_factura(subtotal)').eq('branch_id', branchId).eq('periodo', periodo).is('deleted_at', null),
        supabase.from('gastos').select('*').eq('branch_id', branchId).eq('periodo', periodo).is('deleted_at', null),
        supabase.from('consumos_manuales').select('*').eq('branch_id', branchId).eq('periodo', periodo).is('deleted_at', null),
      ]);

      const ventas = ventasRes.data;
      const facturas = facturasRes.data || [];
      const gastos = gastosRes.data || [];
      const consumos = consumosRes.data || [];

      const totalVentas = ventas ? Number(ventas.fc_total) + Number(ventas.ft_total) : 0;
      const totalCompras = facturas.reduce((s, f) => s + Number(f.total), 0);
      const totalGastos = gastos.reduce((s, g) => s + Number(g.monto), 0);
      const totalConsumos = consumos.reduce((s, c) => s + Number(c.monto_consumido), 0);

      const costoTotal = totalCompras + totalConsumos;
      const resultadoBruto = totalVentas - costoTotal;
      const resultadoNeto = resultadoBruto - totalGastos;
      const margenBruto = totalVentas > 0 ? (resultadoBruto / totalVentas) * 100 : 0;
      const margenNeto = totalVentas > 0 ? (resultadoNeto / totalVentas) * 100 : 0;

      const gastosPorCategoria = gastos.reduce<Record<string, number>>((acc, g) => {
        acc[g.categoria_principal] = (acc[g.categoria_principal] || 0) + Number(g.monto);
        return acc;
      }, {});

      const consumosPorCategoria = consumos.reduce<Record<string, number>>((acc, c) => {
        acc[c.categoria_pl] = (acc[c.categoria_pl] || 0) + Number(c.monto_consumido);
        return acc;
      }, {});

      return { ventas, totalVentas, totalCompras, totalGastos, totalConsumos, costoTotal, resultadoBruto, resultadoNeto, margenBruto, margenNeto, gastosPorCategoria, consumosPorCategoria };
    },
    enabled: !!user && !!branchId,
  });
}

function PLLine({ label, value, indent = false, bold = false, negative = false }: { label: string; value: number; indent?: boolean; bold?: boolean; negative?: boolean }) {
  const formatted = `${negative ? '-' : ''} $ ${Math.abs(value).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
  return (
    <div className={`flex justify-between py-1.5 ${indent ? 'pl-6' : ''} ${bold ? 'font-semibold text-base' : 'text-sm'}`}>
      <span className={bold ? '' : 'text-muted-foreground'}>{label}</span>
      <span className={`font-mono ${value < 0 ? 'text-destructive' : ''}`}>{formatted}</span>
    </div>
  );
}

export default function PLDashboardPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const [periodo, setPeriodo] = useState(getCurrentPeriodo());
  const { data: pl, isLoading } = usePLData(branchId!, periodo);

  const periodos = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const getCatGastoLabel = (k: string) => CATEGORIA_GASTO_OPTIONS.find(c => c.value === k)?.label || k;
  const getCatConsumoLabel = (k: string) => CATEGORIA_PL_OPTIONS.find(c => c.value === k)?.label || k;

  return (
    <div className="p-6">
      <PageHeader
        title="Estado de Resultados"
        subtitle="P&L mensual del local"
        actions={
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {periodos.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : pl ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><DollarSign className="w-4 h-4" /> Ventas</div>
                <div className="text-2xl font-bold font-mono mt-1">$ {pl.totalVentas.toLocaleString('es-AR')}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><ShoppingCart className="w-4 h-4" /> Costo</div>
                <div className="text-2xl font-bold font-mono mt-1">$ {pl.costoTotal.toLocaleString('es-AR')}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {pl.resultadoNeto >= 0 ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
                  Resultado Neto
                </div>
                <div className={`text-2xl font-bold font-mono mt-1 ${pl.resultadoNeto < 0 ? 'text-destructive' : ''}`}>
                  $ {pl.resultadoNeto.toLocaleString('es-AR')}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">Margen Neto</div>
                <div className={`text-2xl font-bold mt-1 ${pl.margenNeto < 0 ? 'text-destructive' : ''}`}>{pl.margenNeto.toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estado de Resultados — {periodo}</CardTitle>
            </CardHeader>
            <CardContent>
              <PLLine label="Ventas Totales" value={pl.totalVentas} bold />
              {pl.ventas && (
                <>
                  <PLLine label="Facturación Contable (FC)" value={Number(pl.ventas.fc_total)} indent />
                  <PLLine label="Facturación Total (FT)" value={Number(pl.ventas.ft_total)} indent />
                </>
              )}
              <Separator className="my-3" />
              <PLLine label="Costo de Ventas" value={pl.costoTotal} negative bold />
              <PLLine label="Compras (Facturas)" value={pl.totalCompras} indent negative />
              {Object.entries(pl.consumosPorCategoria).map(([cat, monto]) => (
                <PLLine key={cat} label={`Consumo: ${getCatConsumoLabel(cat)}`} value={monto} indent negative />
              ))}
              <Separator className="my-3" />
              <div className="flex justify-between py-2">
                <span className="font-bold text-base">Resultado Bruto</span>
                <div className="flex items-center gap-2">
                  <Badge variant={pl.resultadoBruto >= 0 ? 'default' : 'destructive'}>{pl.margenBruto.toFixed(1)}%</Badge>
                  <span className={`font-mono font-bold text-base ${pl.resultadoBruto < 0 ? 'text-destructive' : ''}`}>$ {pl.resultadoBruto.toLocaleString('es-AR')}</span>
                </div>
              </div>
              <Separator className="my-3" />
              <PLLine label="Gastos Operativos" value={pl.totalGastos} negative bold />
              {Object.entries(pl.gastosPorCategoria).map(([cat, monto]) => (
                <PLLine key={cat} label={getCatGastoLabel(cat)} value={monto} indent negative />
              ))}
              <Separator className="my-3" />
              <div className="flex justify-between py-2 bg-muted/30 px-3 rounded-md">
                <span className="font-bold text-lg">Resultado Neto</span>
                <div className="flex items-center gap-2">
                  <Badge variant={pl.resultadoNeto >= 0 ? 'default' : 'destructive'}>{pl.margenNeto.toFixed(1)}%</Badge>
                  <span className={`font-mono font-bold text-lg ${pl.resultadoNeto < 0 ? 'text-destructive' : ''}`}>$ {pl.resultadoNeto.toLocaleString('es-AR')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
