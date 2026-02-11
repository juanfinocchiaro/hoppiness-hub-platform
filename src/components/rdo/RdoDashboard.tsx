import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, ArrowDown, ArrowUp, ChevronRight, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRdoReport } from '@/hooks/useRdoReport';
import { getCurrentPeriodo } from '@/types/compra';
import { RDO_SECTIONS } from '@/types/rdo';
import type { RdoReportLine } from '@/types/rdo';
import { CmvDrillDown } from './CmvDrillDown';

function useVentasData(branchId: string, periodo: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['rdo-ventas', branchId, periodo],
    queryFn: async () => {
      const { data } = await supabase
        .from('ventas_mensuales_local')
        .select('fc_total, ft_total')
        .eq('branch_id', branchId)
        .eq('periodo', periodo)
        .maybeSingle();
      const total = data ? Number(data.fc_total) + Number(data.ft_total) : 0;
      return { fc: data ? Number(data.fc_total) : 0, ft: data ? Number(data.ft_total) : 0, total };
    },
    enabled: !!user && !!branchId,
  });
}

function RdoLine({ label, value, pct, indent = 0, bold = false }: {
  label: string; value: number; pct?: number; indent?: number; bold?: boolean;
}) {
  const formatted = `$ ${Math.abs(value).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
  const pl = indent === 1 ? 'pl-5' : indent === 2 ? 'pl-10' : indent === 3 ? 'pl-14' : '';
  return (
    <div className={`flex justify-between items-center py-1.5 ${pl} ${bold ? 'font-semibold text-base' : 'text-sm'}`}>
      <span className={bold ? '' : 'text-muted-foreground'}>{label}</span>
      <div className="flex items-center gap-3">
        {pct !== undefined && (
          <span className="text-xs text-muted-foreground font-mono w-14 text-right">{pct.toFixed(1)}%</span>
        )}
        <span className={`font-mono min-w-[100px] text-right ${value < 0 ? 'text-destructive' : ''}`}>{formatted}</span>
      </div>
    </div>
  );
}

function CollapsibleRow({ label, value, pct, indent = 0, bold = false, expanded, onToggle, children }: {
  label: string; value: number; pct?: number; indent?: number; bold?: boolean;
  expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  const formatted = `$ ${Math.abs(value).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
  const pl = indent === 1 ? 'pl-4' : indent === 2 ? 'pl-8' : '';
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`flex justify-between items-center py-1.5 w-full text-left hover:bg-muted/40 rounded-sm transition-colors ${pl} ${bold ? 'font-semibold text-base' : 'text-sm font-medium'}`}
      >
        <span className="flex items-center gap-1">
          {expanded
            ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
          {label}
        </span>
        <div className="flex items-center gap-3">
          {pct !== undefined && (
            <span className="text-xs text-muted-foreground font-mono w-14 text-right">{pct.toFixed(1)}%</span>
          )}
          <span className={`font-mono min-w-[100px] text-right ${bold ? 'font-bold' : ''}`}>{formatted}</span>
        </div>
      </button>
      {expanded && children}
    </div>
  );
}

function SectionBlock({ title, lines, ventas }: { title: string; lines: RdoReportLine[]; ventas: number }) {
  const level2 = lines.filter(l => l.level === 2);
  const level3 = lines.filter(l => l.level === 3);

  const sectionTotal = level2.reduce((s, l) => {
    const children = level3.filter(c => c.parent_code === l.category_code);
    return s + children.reduce((cs, c) => cs + c.total, 0);
  }, 0);
  const sectionPct = ventas > 0 ? (sectionTotal / ventas) * 100 : 0;

  const [sectionExpanded, setSectionExpanded] = useState(true);
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(level2.map(p => [p.category_code, true]))
  );

  const toggleParent = (code: string) =>
    setExpandedParents(prev => ({ ...prev, [code]: !prev[code] }));

  return (
    <CollapsibleRow
      label={title}
      value={sectionTotal}
      pct={sectionPct}
      bold
      expanded={sectionExpanded}
      onToggle={() => setSectionExpanded(e => !e)}
    >
      {level2.map(parent => {
        const children = level3.filter(c => c.parent_code === parent.category_code);
        const parentTotal = children.reduce((s, c) => s + c.total, 0);
        const parentPct = ventas > 0 ? (parentTotal / ventas) * 100 : 0;

        return (
          <CollapsibleRow
            key={parent.category_code}
            label={parent.category_name}
            value={parentTotal}
            pct={parentPct}
            indent={1}
            bold
            expanded={!!expandedParents[parent.category_code]}
            onToggle={() => toggleParent(parent.category_code)}
          >
            {children.map(child => {
              const isCmv = child.category_code.startsWith('cmv');
              return (
                <div key={child.category_code}>
                  <RdoLine
                    label={child.category_name}
                    value={child.total}
                    pct={child.percentage}
                    indent={2}
                  />
                  {isCmv && expandedParents[parent.category_code] && (
                    <CmvDrillDown rdoCategoryCode={child.category_code} />
                  )}
                </div>
              );
            })}
          </CollapsibleRow>
        );
      })}
    </CollapsibleRow>
  );
}

interface RdoDashboardProps {
  branchId: string;
}

export function RdoDashboard({ branchId }: RdoDashboardProps) {
  const [periodo, setPeriodo] = useState(getCurrentPeriodo());
  const { data: ventas, isLoading: loadingVentas } = useVentasData(branchId, periodo);
  const { data: rdoLines, isLoading: loadingRdo } = useRdoReport(branchId, periodo);

  const isLoading = loadingVentas || loadingRdo;

  const periodos = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const totalVentas = ventas?.total ?? 0;
  const variables = (rdoLines || []).filter(l => l.rdo_section === 'costos_variables');
  const fijos = (rdoLines || []).filter(l => l.rdo_section === 'costos_fijos');

  const totalVariables = variables.filter(l => l.level === 3).reduce((s, l) => s + l.total, 0);
  const totalFijos = fijos.filter(l => l.level === 3).reduce((s, l) => s + l.total, 0);
  const totalCostos = totalVariables + totalFijos;
  const resultadoOperativo = totalVentas - totalCostos;
  const margenOperativo = totalVentas > 0 ? (resultadoOperativo / totalVentas) * 100 : 0;

  const [ventasExpanded, setVentasExpanded] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">RDO — Resultado de Operaciones</h2>
          <p className="text-sm text-muted-foreground">Estado de resultados mensual del local</p>
        </div>
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {periodos.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><DollarSign className="w-4 h-4" /> Ventas</div>
                <div className="text-2xl font-bold font-mono mt-1">$ {totalVentas.toLocaleString('es-AR')}</div>
                {ventas && ventas.fc > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">FC: ${ventas.fc.toLocaleString('es-AR')} | FT: ${ventas.ft.toLocaleString('es-AR')}</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><ArrowDown className="w-4 h-4" /> C. Variables</div>
                <div className="text-2xl font-bold font-mono mt-1">$ {totalVariables.toLocaleString('es-AR')}</div>
                <div className="text-xs text-muted-foreground mt-1">{totalVentas > 0 ? ((totalVariables / totalVentas) * 100).toFixed(1) : 0}% s/ventas</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><ArrowUp className="w-4 h-4" /> C. Fijos</div>
                <div className="text-2xl font-bold font-mono mt-1">$ {totalFijos.toLocaleString('es-AR')}</div>
                <div className="text-xs text-muted-foreground mt-1">{totalVentas > 0 ? ((totalFijos / totalVentas) * 100).toFixed(1) : 0}% s/ventas</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {resultadoOperativo >= 0 ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
                  Resultado
                </div>
                <div className={`text-2xl font-bold font-mono mt-1 ${resultadoOperativo < 0 ? 'text-destructive' : ''}`}>
                  $ {resultadoOperativo.toLocaleString('es-AR')}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{margenOperativo.toFixed(1)}% margen</div>
              </CardContent>
            </Card>
          </div>

          {/* RDO Detail */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5" />
                RDO Detallado — {periodo}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {/* Ventas */}
              {ventas && ventas.fc > 0 ? (
                <CollapsibleRow
                  label="Ventas Totales"
                  value={totalVentas}
                  pct={100}
                  bold
                  expanded={ventasExpanded}
                  onToggle={() => setVentasExpanded(e => !e)}
                >
                  <RdoLine label="Facturación Contable (FC)" value={ventas.fc} indent={1} />
                  <RdoLine label="Facturación Total (FT)" value={ventas.ft} indent={1} />
                </CollapsibleRow>
              ) : (
                <RdoLine label="Ventas Totales" value={totalVentas} pct={100} bold />
              )}

              <Separator className="my-3" />

              {/* Costos Variables */}
              <SectionBlock title={RDO_SECTIONS.costos_variables} lines={variables} ventas={totalVentas} />

              <Separator className="my-3" />

              {/* Contribución Marginal */}
              <div className="flex justify-between items-center py-2 bg-muted/30 px-3 rounded-md">
                <span className="font-bold">Contribución Marginal</span>
                <div className="flex items-center gap-3">
                  <Badge variant={(totalVentas - totalVariables) >= 0 ? 'default' : 'destructive'}>
                    {totalVentas > 0 ? (((totalVentas - totalVariables) / totalVentas) * 100).toFixed(1) : 0}%
                  </Badge>
                  <span className={`font-mono font-bold ${(totalVentas - totalVariables) < 0 ? 'text-destructive' : ''}`}>
                    $ {(totalVentas - totalVariables).toLocaleString('es-AR')}
                  </span>
                </div>
              </div>

              <Separator className="my-3" />

              {/* Costos Fijos */}
              <SectionBlock title={RDO_SECTIONS.costos_fijos} lines={fijos} ventas={totalVentas} />

              <Separator className="my-3" />

              {/* Resultado Operativo */}
              <div className="flex justify-between items-center py-3 bg-muted/30 px-3 rounded-md">
                <span className="font-bold text-lg">Resultado Operativo</span>
                <div className="flex items-center gap-3">
                  <Badge variant={resultadoOperativo >= 0 ? 'default' : 'destructive'} className="text-sm">
                    {margenOperativo.toFixed(1)}%
                  </Badge>
                  <span className={`font-mono font-bold text-lg ${resultadoOperativo < 0 ? 'text-destructive' : ''}`}>
                    $ {resultadoOperativo.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
