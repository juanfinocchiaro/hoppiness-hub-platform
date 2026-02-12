import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { supabase } from '@/integrations/supabase/client';
import { DataToolbar } from '@/components/ui/data-table-pro';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingButton } from '@/components/ui/loading-button';
import { FormRow, FormSection, StickyActions } from '@/components/ui/forms-pro';
import { EmptyState } from '@/components/ui/states';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  AlertTriangle, CheckCircle, Plus, Trash2, Package, Save, DollarSign, Tag,
  Layers, Settings2, BarChart3, Calculator, ArrowRight, ChevronDown, ChevronRight,
  Target, RefreshCw,
} from 'lucide-react';
import { ItemExpandedPanel } from '@/components/centro-costos/ItemExpandedPanel';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useItemsCarta, useItemCartaComposicion, useItemCartaHistorial, useItemCartaMutations } from '@/hooks/useItemsCarta';
import { useGruposOpcionales, useGruposOpcionalesMutations } from '@/hooks/useGruposOpcionales';
import { usePreparaciones } from '@/hooks/usePreparaciones';
import { useInsumos } from '@/hooks/useInsumos';
import { useMenuCategorias } from '@/hooks/useMenu';
import { useRdoCategories } from '@/hooks/useRdoCategories';
import { useAuth } from '@/hooks/useAuth';

// ─── Helpers ───
const IVA = 1.21;
const fmt = (v: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);
const fmtPct = (v: number) => `${v.toFixed(1)}%`;
const neto = (p: number) => p / IVA;
const calcFC = (costo: number, precio: number) => precio > 0 ? (costo / neto(precio)) * 100 : 0;
const calcMargen = (costo: number, precio: number) => neto(precio) - costo;
const calcSugerido = (costo: number, fcObj: number) => fcObj > 0 ? (costo / (fcObj / 100)) * IVA : 0;

function fcColor(real: number, obj: number): 'ok' | 'warn' | 'danger' {
  const d = real - obj;
  return d <= 2 ? 'ok' : d <= 8 ? 'warn' : 'danger';
}
const badgeVar = { ok: 'default' as const, warn: 'secondary' as const, danger: 'destructive' as const };
const txtColor = { ok: 'text-green-600', warn: 'text-yellow-600', danger: 'text-red-600' };

// ─── Enrichment ───
interface EI {
  id: string; nombre: string; cat: string; catId: string;
  costo: number; precio: number; pNeto: number; fc: number; fcObj: number;
  margen: number; pSug: number; color: 'ok'|'warn'|'danger';
  hasComp: boolean; hasPrice: boolean; raw: any;
}

function enrich(items: any[]): EI[] {
  return items.map(it => {
    const c = Number(it.costo_total) || 0, p = Number(it.precio_base) || 0;
    const obj = Number(it.fc_objetivo) || 32;
    const n = neto(p), fc = p > 0 ? calcFC(c, p) : 0;
    return {
      id: it.id, nombre: it.nombre,
      cat: it.menu_categorias?.nombre || 'Sin categoría',
      catId: it.categoria_carta_id || '_none',
      costo: c, precio: p, pNeto: n, fc, fcObj: obj,
      margen: p > 0 ? calcMargen(c, p) : 0,
      pSug: c > 0 ? calcSugerido(c, obj) : 0,
      color: p > 0 && c > 0 ? fcColor(fc, obj) : 'warn',
      hasComp: c > 0, hasPrice: p > 0, raw: it,
    };
  });
}

interface CG { nombre: string; id: string; items: EI[]; cmv: number; obj: number; margen: number; color: 'ok'|'warn'|'danger'; }

function groupByCat(items: EI[]): CG[] {
  const m = new Map<string, EI[]>();
  items.forEach(i => { if (!m.has(i.catId)) m.set(i.catId, []); m.get(i.catId)!.push(i); });
  return Array.from(m.entries()).map(([id, ci]) => {
    const w = ci.filter(i => i.hasComp && i.hasPrice);
    const n = w.length || 1;
    const cmv = w.reduce((s, i) => s + i.fc, 0) / n;
    const obj = w.reduce((s, i) => s + i.fcObj, 0) / n;
    const mg = w.reduce((s, i) => s + i.margen, 0) / n;
    return { nombre: ci[0]?.cat, id, items: ci, cmv, obj, margen: mg, color: fcColor(cmv, obj) };
  });
}

type Tab = 'analisis' | 'simulador' | 'actualizar';

// ═══════════════════════════════════════
// ═══ MAIN PAGE ═══
// ═══════════════════════════════════════
export default function CentroCostosPage() {
  const { data: items, isLoading, refetch, isFetching } = useItemsCarta();
  const { data: preparaciones } = usePreparaciones();
  const { data: insumos } = useInsumos();
  const { data: categorias } = useMenuCategorias();
  const { data: rdoCategories } = useRdoCategories();
  const { user } = useAuth();
  const mutations = useItemCartaMutations();
  const [recalculating, setRecalculating] = useState(false);

  const handleRecalculate = useCallback(async () => {
    setRecalculating(true);
    try {
      await supabase.rpc('recalcular_todos_los_costos' as any);
      await refetch();
    } finally {
      setRecalculating(false);
    }
  }, [refetch]);

  const [tab, setTab] = useState<Tab>('analisis');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [compItem, setCompItem] = useState<any>(null);
  const [histItem, setHistItem] = useState<any>(null);
  const [delItem, setDelItem] = useState<any>(null);
  const [simPrices, setSimPrices] = useState<Record<string, number>>({});
  const [pending, setPending] = useState<Record<string, number>>({});

  const cmvCats = useMemo(() => rdoCategories?.filter((c: any) => c.level === 3 && (c.parent_code?.startsWith('cmv') || c.code?.startsWith('cmv'))) || [], [rdoCategories]);
  const ei = useMemo(() => enrich(items || []), [items]);
  const cats = useMemo(() => groupByCat(ei), [ei]);

  // Global stats
  const gs = useMemo(() => {
    const w = ei.filter(i => i.hasComp && i.hasPrice);
    const n = w.length || 1;
    const cmv = w.reduce((s, i) => s + i.fc, 0) / n;
    const obj = w.reduce((s, i) => s + i.fcObj, 0) / n;
    const mg = w.reduce((s, i) => s + i.margen, 0) / n;
    return {
      cmv, obj, mg, total: ei.length,
      sinP: ei.filter(i => !i.hasPrice).length,
      sinC: ei.filter(i => !i.hasComp).length,
      ok: w.filter(i => i.color === 'ok').length,
      warn: w.filter(i => i.color === 'warn').length,
      danger: w.filter(i => i.color === 'danger').length,
      gColor: fcColor(cmv, obj),
    };
  }, [ei]);

  const applySim = () => { setPending(p => ({ ...p, ...simPrices })); setTab('actualizar'); };

  const tabs: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: 'analisis', label: 'Análisis', icon: BarChart3 },
    { id: 'simulador', label: 'Simulador', icon: Calculator },
    { id: 'actualizar', label: 'Actualizar Precios', icon: DollarSign, count: Object.keys(pending).length || undefined },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Control de Costos" subtitle="Análisis de márgenes, simulación y ajuste de precios" />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={recalculating || isFetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${recalculating || isFetching ? 'animate-spin' : ''}`} /> {recalculating ? 'Recalculando...' : 'Actualizar Costos'}
          </Button>
          <Button onClick={() => { setEditingItem(null); setCreateOpen(true); }}><Plus className="w-4 h-4 mr-2" /> Nuevo Item</Button>
        </div>
      </div>

      {/* TAB BAR */}
      <div className="border-b"><div className="flex gap-1">
        {tabs.map(t => { const I = t.icon; return (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}>
            <I className="w-4 h-4" />{t.label}
            {t.count ? <Badge variant="default" className="ml-1 h-5 px-1.5 text-xs">{t.count}</Badge> : null}
          </button>
        ); })}
      </div></div>

      {tab === 'analisis' && <AnalisisTab items={ei} cats={cats} gs={gs} loading={isLoading} />}
      {tab === 'simulador' && <SimuladorTab items={ei} gs={gs} sim={simPrices} setSim={setSimPrices} onApply={applySim} />}
      {tab === 'actualizar' && <ActualizarTab items={ei} pending={pending} setPending={setPending} mutations={mutations} userId={user?.id} />}

      {/* MODALS */}
      <ItemFormModal open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) setEditingItem(null); }} item={editingItem} categorias={categorias} cmvCats={cmvCats} mutations={mutations} />
      {compItem && <ComposicionModal open={!!compItem} onOpenChange={() => setCompItem(null)} item={compItem} preparaciones={preparaciones || []} insumos={insumos || []} mutations={mutations} />}
      {histItem && <HistorialModal open={!!histItem} onOpenChange={() => setHistItem(null)} item={histItem} />}
      <ConfirmDialog open={!!delItem} onOpenChange={() => setDelItem(null)} title="Eliminar item" description={`¿Eliminar "${delItem?.nombre}"?`} confirmLabel="Eliminar" variant="destructive" onConfirm={async () => { await mutations.softDelete.mutateAsync(delItem.id); setDelItem(null); }} />
    </div>
  );
}

// ═══════════════════════════════════════
// ═══ TAB 1: ANÁLISIS (solo lectura) ═══
// ═══════════════════════════════════════
function AnalisisTab({ items, cats, gs, loading }: {
  items: EI[]; cats: CG[]; gs: any; loading: boolean;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all'|'ok'|'warn'|'danger'>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  useEffect(() => { setExpanded(new Set(cats.map(c => c.id))); }, [cats.length]);
  const toggle = (id: string) => setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const filtered = useMemo(() => cats.map(g => ({
    ...g, items: g.items.filter(i => {
      if (!i.nombre.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter !== 'all' && i.color !== filter) return false;
      return true;
    }),
  })).filter(g => g.items.length > 0), [cats, search, filter]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> CMV Promedio</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold ${txtColor[gs.gColor]}`}>{fmtPct(gs.cmv)}</p><p className="text-xs text-muted-foreground">Obj: {fmtPct(gs.obj)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Margen Prom.</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmt(gs.mg)}</p><p className="text-xs text-muted-foreground">por unidad</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Semáforo</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-3 text-sm"><span className="text-green-600 font-bold">{gs.ok} ✓</span><span className="text-yellow-600 font-bold">{gs.warn} ⚠</span><span className="text-red-600 font-bold">{gs.danger} ✕</span></div>
            <p className="text-xs text-muted-foreground">{gs.total} items</p>
          </CardContent>
        </Card>
        <Card className={gs.sinP > 0 ? 'border-yellow-300' : ''}>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Sin Precio</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold ${gs.sinP > 0 ? 'text-yellow-600' : 'text-green-600'}`}>{gs.sinP}</p></CardContent>
        </Card>
        <Card className={gs.sinC > 0 ? 'border-yellow-300' : ''}>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Sin Composición</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold ${gs.sinC > 0 ? 'text-yellow-600' : 'text-green-600'}`}>{gs.sinC}</p></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <DataToolbar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Buscar item..." />
        <div className="flex gap-2">
          {(['all','ok','warn','danger'] as const).map(f => (
            <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
              {f === 'all' ? 'Todos' : f === 'ok' ? '✓ OK' : f === 'warn' ? '⚠ Atención' : '✕ Críticos'}
            </Button>
          ))}
        </div>
      </div>

      {/* Table by category */}
      {loading ? <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div> :
       filtered.length === 0 ? <EmptyState icon={Package} title="Sin items" description="Creá un item de carta" /> : (
        <div className="space-y-2">
          {filtered.map(g => (
            <div key={g.id} className="border rounded-lg overflow-hidden">
              <button className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors" onClick={() => toggle(g.id)}>
                <div className="flex items-center gap-3">
                  {expanded.has(g.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span className="font-semibold text-sm">{g.nombre}</span>
                  <Badge variant="outline" className="text-xs">{g.items.length}</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-xs text-muted-foreground">CMV</span>
                  <Badge variant={badgeVar[g.color]}>{fmtPct(g.cmv)}</Badge>
                  <span className="text-xs text-muted-foreground">Obj {fmtPct(g.obj)}</span>
                  <span className="text-xs text-muted-foreground">Margen {fmt(g.margen)}</span>
                </div>
              </button>
              {expanded.has(g.id) && (
                <Table>
                  <TableHeader><TableRow className="text-xs">
                    <TableHead className="w-[220px]">Item</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead className="text-right"><span>P. Carta</span> <span className="text-muted-foreground font-normal">(c/IVA)</span></TableHead>
                    <TableHead className="text-right"><span>P. Neto</span> <span className="text-muted-foreground font-normal">(s/IVA)</span></TableHead>
                    <TableHead className="text-right">Obj.</TableHead>
                    <TableHead className="text-right">FC%</TableHead>
                    <TableHead className="text-right">Margen</TableHead>
                    <TableHead className="text-right">Sugerido</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {g.items.map(i => {
                      const gap = i.pSug - i.precio;
                      const isOpen = expandedItemId === i.id;
                      return (
                        <React.Fragment key={i.id}>
                          <TableRow className={`cursor-pointer transition-colors ${isOpen ? 'bg-primary/5' : ''} ${!i.hasComp ? 'opacity-50' : ''}`} onClick={() => setExpandedItemId(isOpen ? null : i.id)}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {isOpen ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                                <div>
                                  <p className="font-medium text-sm">{i.nombre}</p>
                                  {!i.hasComp && <p className="text-xs text-yellow-600">⚠ Sin composición</p>}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">{i.costo > 0 ? fmt(i.costo) : '—'}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{fmt(i.precio)}</TableCell>
                            <TableCell className="text-right font-mono text-sm text-muted-foreground">{i.hasPrice ? fmt(i.pNeto) : '—'}</TableCell>
                            <TableCell className="text-right font-mono text-sm text-muted-foreground">{fmtPct(i.fcObj)}</TableCell>
                            <TableCell className="text-right">{i.hasComp && i.hasPrice ? <Badge variant={badgeVar[i.color]}>{fmtPct(i.fc)}</Badge> : '—'}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{i.hasComp && i.hasPrice ? <span className={i.margen > 0 ? 'text-green-600' : 'text-red-600'}>{fmt(i.margen)}</span> : '—'}</TableCell>
                            <TableCell className="text-right">{i.hasComp && i.pSug > 0 ? <span className={`font-mono text-sm ${gap > 100 ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>{fmt(i.pSug)}</span> : '—'}</TableCell>
                          </TableRow>
                          {isOpen && (
                            <TableRow>
                              <TableCell colSpan={8} className="p-0">
                                <ItemExpandedPanel item={i.raw} onClose={() => setExpandedItemId(null)} onDeleted={() => setExpandedItemId(null)} />
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          ))}
          {/* Global footer */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
            <div><p className="text-sm font-medium">CMV Global</p><p className="text-xs text-muted-foreground">Objetivo: {fmtPct(gs.obj)}</p></div>
            <Badge variant={badgeVar[gs.gColor]} className="text-lg px-4 py-1.5">{fmtPct(gs.cmv)}</Badge>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// ═══ TAB 2: SIMULADOR ═══
// ═══════════════════════════════════════
function SimuladorTab({ items, gs, sim, setSim, onApply }: {
  items: EI[]; gs: any; sim: Record<string,number>; setSim: (v: Record<string,number>) => void; onApply: () => void;
}) {
  const [bulkPct, setBulkPct] = useState<number>(0);
  const workable = useMemo(() => items.filter(i => i.hasComp && i.hasPrice), [items]);

  const simItems = useMemo(() => workable.map(i => {
    const np = sim[i.id] ?? i.precio;
    const nn = neto(np); const nfc = np > 0 ? (i.costo / nn) * 100 : 0;
    const nm = nn - i.costo; const changed = Math.abs(np - i.precio) > 0.5;
    return { ...i, np, nfc, nm, changed, dm: nm - i.margen };
  }), [workable, sim]);

  const impact = useMemo(() => {
    const n = simItems.length || 1;
    const cmv = simItems.reduce((s, i) => s + i.nfc, 0) / n;
    return { cmv, count: simItems.filter(i => i.changed).length };
  }, [simItems]);

  const doBulk = () => { if (!bulkPct) return; const n: Record<string,number> = {}; workable.forEach(i => { n[i.id] = Math.round(i.precio * (1 + bulkPct / 100)); }); setSim(n); };
  const doTarget = () => { const n: Record<string,number> = {}; workable.forEach(i => { n[i.id] = Math.round(calcSugerido(i.costo, i.fcObj)); }); setSim(n); };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Simular ajuste de precios</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Input type="number" className="w-20 h-8" placeholder="%" value={bulkPct || ''} onChange={e => setBulkPct(parseFloat(e.target.value) || 0)} />
                <Button size="sm" variant="outline" onClick={doBulk} disabled={!bulkPct}>Subir todo {bulkPct > 0 ? `+${bulkPct}%` : ''}</Button>
              </div>
              <Button size="sm" variant="outline" onClick={doTarget}><Target className="w-3.5 h-3.5 mr-1.5" /> Ajustar a CMV objetivo</Button>
              <Button size="sm" variant="ghost" onClick={() => setSim({})}>Limpiar</Button>
            </div>
            <p className="text-xs text-muted-foreground">También podés editar precios individuales en la tabla.</p>
          </CardContent>
        </Card>
        <Card className={impact.count > 0 ? 'border-primary' : ''}>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Impacto simulado</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm"><span>CMV actual:</span><span className="font-mono font-medium">{fmtPct(gs.cmv)}</span></div>
            <div className="flex justify-between text-sm"><span>CMV simulado:</span><span className={`font-mono font-bold ${impact.cmv < gs.cmv ? 'text-green-600' : impact.cmv > gs.cmv ? 'text-red-600' : ''}`}>{fmtPct(impact.cmv)}</span></div>
            <div className="flex justify-between text-xs text-muted-foreground"><span>Modificados:</span><span>{impact.count}</span></div>
            {impact.count > 0 && <Button size="sm" className="w-full mt-2" onClick={onApply}><ArrowRight className="w-3.5 h-3.5 mr-1.5" /> Aplicar estos precios</Button>}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border"><Table><TableHeader><TableRow className="text-xs">
        <TableHead className="w-[220px]">Item</TableHead><TableHead>Categoría</TableHead>
        <TableHead className="text-right">Costo</TableHead><TableHead className="text-right">P. Actual</TableHead>
        <TableHead className="text-right">FC% Actual</TableHead><TableHead className="text-right w-[130px]">P. Nuevo</TableHead>
        <TableHead className="text-right">FC% Nuevo</TableHead><TableHead className="text-right">Δ Margen</TableHead>
      </TableRow></TableHeader><TableBody>
        {simItems.length === 0 ? <TableRow><TableCell colSpan={8} className="h-32"><EmptyState icon={Calculator} title="Sin items" description="Necesitás items con precio y composición" /></TableCell></TableRow> :
        simItems.map(i => (
          <TableRow key={i.id} className={i.changed ? 'bg-primary/5' : ''}>
            <TableCell className="font-medium text-sm">{i.nombre}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{i.cat}</TableCell>
            <TableCell className="text-right font-mono text-sm">{fmt(i.costo)}</TableCell>
            <TableCell className="text-right font-mono text-sm">{fmt(i.precio)}</TableCell>
            <TableCell className="text-right"><Badge variant={badgeVar[i.color]} className="text-xs">{fmtPct(i.fc)}</Badge></TableCell>
            <TableCell className="text-right"><Input type="number" className="h-7 w-[110px] text-right font-mono text-sm ml-auto" value={sim[i.id] ?? i.precio} onChange={e => setSim({ ...sim, [i.id]: parseFloat(e.target.value) || 0 })} /></TableCell>
            <TableCell className="text-right"><Badge variant={badgeVar[fcColor(i.nfc, i.fcObj)]} className="text-xs">{fmtPct(i.nfc)}</Badge></TableCell>
            <TableCell className="text-right font-mono text-sm">{i.changed ? <span className={i.dm > 0 ? 'text-green-600' : 'text-red-600'}>{i.dm > 0 ? '+' : ''}{fmt(i.dm)}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
          </TableRow>
        ))}
      </TableBody></Table></div>
    </div>
  );
}

// ═══════════════════════════════════════
// ═══ TAB 3: ACTUALIZAR PRECIOS ═══
// ═══════════════════════════════════════
function ActualizarTab({ items, pending, setPending, mutations, userId }: {
  items: EI[]; pending: Record<string,number>; setPending: (v: Record<string,number>) => void; mutations: any; userId?: string;
}) {
  const [applying, setApplying] = useState(false);
  const changes = useMemo(() => Object.entries(pending).map(([id, np]) => {
    const i = items.find(x => x.id === id);
    if (!i || Math.abs(np - i.precio) < 1) return null;
    const nn = neto(np), nfc = i.costo > 0 ? (i.costo / nn) * 100 : 0;
    return { ...i, np, nfc, nm: nn - i.costo, delta: np - i.precio, deltaPct: i.precio > 0 ? ((np - i.precio) / i.precio) * 100 : 0 };
  }).filter(Boolean) as any[], [pending, items]);

  const remove = (id: string) => { const n = { ...pending }; delete n[id]; setPending(n); };
  const applyAll = async () => {
    setApplying(true);
    try { for (const c of changes) { await mutations.cambiarPrecio.mutateAsync({ itemId: c.id, precioAnterior: c.precio, precioNuevo: c.np, motivo: 'Ajuste desde Control de Costos', userId }); } setPending({}); }
    finally { setApplying(false); }
  };

  if (changes.length === 0) return <div className="py-16"><EmptyState icon={DollarSign} title="Sin cambios pendientes" description="Usá el Simulador para probar precios y aplicalos acá." /></div>;

  return (
    <div className="space-y-6">
      <Card><CardContent className="pt-6"><div className="flex items-center justify-between">
        <div><p className="text-lg font-semibold">{changes.length} cambio{changes.length !== 1 ? 's' : ''} pendiente{changes.length !== 1 ? 's' : ''}</p><p className="text-sm text-muted-foreground">Cada cambio queda registrado en el historial.</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => setPending({})}>Descartar</Button><LoadingButton loading={applying} onClick={applyAll}><Save className="w-4 h-4 mr-2" /> Confirmar</LoadingButton></div>
      </div></CardContent></Card>

      <div className="rounded-md border"><Table><TableHeader><TableRow className="text-xs">
        <TableHead className="w-[220px]">Item</TableHead><TableHead>Categoría</TableHead>
        <TableHead className="text-right">P. Actual</TableHead><TableHead className="text-center" />
        <TableHead className="text-right">P. Nuevo</TableHead><TableHead className="text-right">Variación</TableHead>
        <TableHead className="text-right">FC% → Nuevo</TableHead><TableHead className="text-right">Margen</TableHead><TableHead className="w-[50px]" />
      </TableRow></TableHeader><TableBody>
        {changes.map((c: any) => (
          <TableRow key={c.id}>
            <TableCell className="font-medium text-sm">{c.nombre}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{c.cat}</TableCell>
            <TableCell className="text-right font-mono text-sm">{fmt(c.precio)}</TableCell>
            <TableCell className="text-center"><ArrowRight className="w-4 h-4 mx-auto text-muted-foreground" /></TableCell>
            <TableCell className="text-right font-mono text-sm font-bold">{fmt(c.np)}</TableCell>
            <TableCell className="text-right font-mono text-sm"><span className={c.delta > 0 ? 'text-green-600' : 'text-red-600'}>{c.delta > 0 ? '+' : ''}{fmt(c.delta)} ({c.deltaPct > 0 ? '+' : ''}{c.deltaPct.toFixed(1)}%)</span></TableCell>
            <TableCell className="text-right text-sm"><span className="text-muted-foreground">{fmtPct(c.fc)}</span> → <Badge variant={badgeVar[fcColor(c.nfc, c.fcObj)]} className="text-xs">{fmtPct(c.nfc)}</Badge></TableCell>
            <TableCell className="text-right font-mono text-sm text-green-600">{fmt(c.nm)}</TableCell>
            <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(c.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button></TableCell>
          </TableRow>
        ))}
      </TableBody></Table></div>
    </div>
  );
}

// ═══════════════════════════════════════
// ═══ MODALS ═══
// ═══════════════════════════════════════
function ItemFormModal({ open, onOpenChange, item, categorias, cmvCats, mutations }: any) {
  const [form, setForm] = useState({ nombre: '', nombre_corto: '', descripcion: '', categoria_carta_id: '', rdo_category_code: '', precio_base: 0, fc_objetivo: 32, disponible_delivery: true });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const isEdit = !!item;
  useEffect(() => {
    if (item) setForm({ nombre: item.nombre, nombre_corto: item.nombre_corto || '', descripcion: item.descripcion || '', categoria_carta_id: item.categoria_carta_id || '', rdo_category_code: item.rdo_category_code || '', precio_base: item.precio_base, fc_objetivo: item.fc_objetivo || 32, disponible_delivery: item.disponible_delivery ?? true });
    else setForm({ nombre: '', nombre_corto: '', descripcion: '', categoria_carta_id: '', rdo_category_code: '', precio_base: 0, fc_objetivo: 32, disponible_delivery: true });
  }, [item, open]);

  const submit = async () => {
    if (!form.nombre || !form.precio_base) return;
    const p = { ...form, categoria_carta_id: form.categoria_carta_id || null, rdo_category_code: form.rdo_category_code || null };
    if (isEdit) await mutations.update.mutateAsync({ id: item.id, data: p });
    else await mutations.create.mutateAsync(p);
    onOpenChange(false);
  };

  return (<Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{isEdit ? 'Editar' : 'Nuevo'} Item de Carta</DialogTitle></DialogHeader>
    <div className="space-y-4">
      <FormRow label="Nombre" required><Input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Argenta Burger" /></FormRow>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Nombre corto" hint="Para tickets"><Input value={form.nombre_corto} onChange={e => set('nombre_corto', e.target.value)} /></FormRow>
        <FormRow label="Categoría carta">
          <Select value={form.categoria_carta_id || 'none'} onValueChange={v => set('categoria_carta_id', v === 'none' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
            <SelectContent><SelectItem value="none">Sin categoría</SelectItem>{categorias?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
          </Select>
        </FormRow>
      </div>
      <FormRow label="Descripción"><Textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} rows={2} /></FormRow>
      <FormSection title="Precio y CMV" icon={DollarSign}>
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Precio carta (con IVA)" required><Input type="number" value={form.precio_base || ''} onChange={e => set('precio_base', Number(e.target.value))} /></FormRow>
          <FormRow label="CMV Objetivo (%)" hint="Meta de food cost"><Input type="number" value={form.fc_objetivo || ''} onChange={e => set('fc_objetivo', Number(e.target.value))} /></FormRow>
        </div>
        {form.precio_base > 0 && <p className="text-xs text-muted-foreground">Precio neto (sin IVA): {fmt(form.precio_base / IVA)}</p>}
      </FormSection>
      <StickyActions><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><LoadingButton loading={mutations.create.isPending || mutations.update.isPending} onClick={submit} disabled={!form.nombre || !form.precio_base}>{isEdit ? 'Guardar' : 'Crear Item'}</LoadingButton></StickyActions>
    </div>
  </DialogContent></Dialog>);
}

// ─── Composición Modal (simplified — no more extras system here) ───
function ComposicionModal({ open, onOpenChange, item, preparaciones, insumos, mutations }: any) {
  const { data: composicionActual } = useItemCartaComposicion(item?.id);
  const { data: grupos } = useGruposOpcionales(item?.id);
  const gruposMutations = useGruposOpcionalesMutations();
  const [rows, setRows] = useState<any[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [grupoNuevoNombre, setGrupoNuevoNombre] = useState('');
  const [showNewGrupo, setShowNewGrupo] = useState(false);

  useEffect(() => { if (composicionActual) { setRows(composicionActual.map((c: any) => ({ tipo: c.preparacion_id ? 'preparacion' : 'insumo', preparacion_id: c.preparacion_id || '', insumo_id: c.insumo_id || '', cantidad: c.cantidad, es_extra: c.es_extra || false, _label: c.preparaciones?.nombre || c.insumos?.nombre || '', _costo: c.preparaciones?.costo_calculado || c.insumos?.costo_por_unidad_base || 0 }))); setHasChanges(false); } }, [composicionActual]);

  const addRow = () => { setRows([...rows, { tipo: 'preparacion', preparacion_id: '', insumo_id: '', cantidad: 1, es_extra: false, _label: '', _costo: 0 }]); setHasChanges(true); };
  const removeRow = (i: number) => { setRows(rows.filter((_, idx) => idx !== i)); setHasChanges(true); };
  const updateRow = (i: number, field: string, value: any) => {
    const nr = [...rows]; nr[i] = { ...nr[i], [field]: value };
    if (field === 'tipo') { nr[i].preparacion_id = ''; nr[i].insumo_id = ''; nr[i]._costo = 0; nr[i]._label = ''; }
    if (field === 'preparacion_id') { const p = preparaciones.find((x: any) => x.id === value); nr[i]._label = p?.nombre || ''; nr[i]._costo = p?.costo_calculado || 0; }
    if (field === 'insumo_id') { const ins = insumos.find((x: any) => x.id === value); nr[i]._label = ins?.nombre || ''; nr[i]._costo = ins?.costo_por_unidad_base || 0; }
    setRows(nr); setHasChanges(true);
  };
  const costoFijo = rows.filter(r => r.cantidad > 0).reduce((t, r) => t + r.cantidad * r._costo, 0);
  const costoGrupos = (grupos || []).reduce((t: number, g: any) => t + (g.costo_promedio || 0), 0);
  const costoTotal = costoFijo + costoGrupos;
  const handleSave = async () => {
    await mutations.saveComposicion.mutateAsync({
      item_carta_id: item.id,
      items: rows.filter(r => r.preparacion_id || r.insumo_id).map(r => ({
        preparacion_id: r.tipo === 'preparacion' ? r.preparacion_id : undefined,
        insumo_id: r.tipo === 'insumo' ? r.insumo_id : undefined,
        cantidad: r.cantidad,
        es_extra: r.es_extra,
      })),
    });
    setHasChanges(false);
  };
  const handleCreateGrupo = async () => { if (!grupoNuevoNombre.trim()) return; await gruposMutations.createGrupo.mutateAsync({ item_carta_id: item.id, nombre: grupoNuevoNombre.trim(), orden: (grupos?.length || 0) }); setGrupoNuevoNombre(''); setShowNewGrupo(false); };

  const renderInsumoSelect = (row: any, i: number) => {
    const productos = insumos.filter((x: any) => x.tipo_item === 'producto');
    const ingredientes = insumos.filter((x: any) => x.tipo_item === 'ingrediente');
    const insumosItems = insumos.filter((x: any) => x.tipo_item === 'insumo' || !x.tipo_item);
    return (
      <Select value={row.insumo_id || 'none'} onValueChange={v => updateRow(i, 'insumo_id', v === 'none' ? '' : v)}>
        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Seleccionar...</SelectItem>
          {productos.length > 0 && <><SelectItem value="__h_prod" disabled className="text-xs font-semibold text-muted-foreground">── Productos ──</SelectItem>{productos.map((ins: any) => <SelectItem key={ins.id} value={ins.id}>{ins.nombre} ({fmt(ins.costo_por_unidad_base || 0)})</SelectItem>)}</>}
          {ingredientes.length > 0 && <><SelectItem value="__h_ing" disabled className="text-xs font-semibold text-muted-foreground">── Ingredientes ──</SelectItem>{ingredientes.map((ins: any) => <SelectItem key={ins.id} value={ins.id}>{ins.nombre} ({fmt(ins.costo_por_unidad_base || 0)})</SelectItem>)}</>}
          {insumosItems.length > 0 && <><SelectItem value="__h_ins" disabled className="text-xs font-semibold text-muted-foreground">── Insumos ──</SelectItem>{insumosItems.map((ins: any) => <SelectItem key={ins.id} value={ins.id}>{ins.nombre} ({fmt(ins.costo_por_unidad_base || 0)})</SelectItem>)}</>}
        </SelectContent>
      </Select>
    );
  };

  return (<Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Composición: {item.nombre}</DialogTitle></DialogHeader>
    <div className="space-y-4">
      <FormSection title="Composición" icon={Layers}>
        {rows.length === 0 ? <div className="py-4 text-center text-muted-foreground border rounded-lg text-sm">Sin componentes</div> : (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-3 py-1">
              <span className="w-[100px] shrink-0">Tipo</span>
              <span className="flex-1">Componente</span>
              <span className="w-16 shrink-0 text-right">Cant.</span>
              <span className="w-20 shrink-0 text-right">Subtotal</span>
              <span className="w-14 shrink-0 text-center">Extra</span>
              <span className="w-6 shrink-0" />
            </div>
            {rows.map((row, i) => (
              <div key={i} className="flex items-center gap-1.5 text-sm border rounded-lg px-3 py-2">
                <Select value={row.tipo} onValueChange={v => updateRow(i, 'tipo', v)}><SelectTrigger className="h-7 w-[100px] text-xs shrink-0"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="preparacion">Receta</SelectItem><SelectItem value="insumo">Catálogo</SelectItem></SelectContent></Select>
                <div className="flex-1 min-w-0">{row.tipo === 'preparacion' ? <Select value={row.preparacion_id || 'none'} onValueChange={v => updateRow(i, 'preparacion_id', v === 'none' ? '' : v)}><SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger><SelectContent><SelectItem value="none">Seleccionar...</SelectItem>{preparaciones.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre} ({fmt(p.costo_calculado || 0)})</SelectItem>)}</SelectContent></Select> : renderInsumoSelect(row, i)}</div>
                <Input type="number" className="h-7 w-16 text-xs shrink-0" value={row.cantidad} onChange={e => updateRow(i, 'cantidad', Number(e.target.value))} />
                <span className="font-mono text-xs font-semibold w-20 text-right shrink-0">{fmt(row.cantidad * row._costo)}</span>
                <div className="w-14 shrink-0 flex justify-center">
                  <Switch checked={row.es_extra} onCheckedChange={v => updateRow(i, 'es_extra', v)} className="scale-75" />
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeRow(i)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
              </div>
            ))}
          </div>
        )}
        <Button variant="outline" onClick={addRow} className="w-full mt-2"><Plus className="w-4 h-4 mr-2" /> Agregar Componente</Button>
      </FormSection>

      {/* ── GRUPOS OPCIONALES ── */}
      <FormSection title="Grupos Opcionales" icon={Tag}>
        <p className="text-xs text-muted-foreground mb-2">Para componentes variables (ej: bebida).</p>
        {(grupos || []).map((grupo: any) => <GrupoEditor key={grupo.id} grupo={grupo} itemId={item.id} insumos={insumos} preparaciones={preparaciones} mutations={gruposMutations} />)}
        {showNewGrupo ? <div className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg"><Input value={grupoNuevoNombre} onChange={e => setGrupoNuevoNombre(e.target.value)} placeholder="Nombre del grupo (ej: Bebida)" className="text-sm h-8" onKeyDown={e => e.key === 'Enter' && handleCreateGrupo()} /><Button size="sm" className="h-8" onClick={handleCreateGrupo} disabled={!grupoNuevoNombre.trim() || gruposMutations.createGrupo.isPending}>Crear</Button><Button variant="ghost" size="sm" className="h-8" onClick={() => { setShowNewGrupo(false); setGrupoNuevoNombre(''); }}>Cancelar</Button></div> : <Button variant="outline" onClick={() => setShowNewGrupo(true)} className="w-full"><Plus className="w-4 h-4 mr-2" /> Agregar Grupo Opcional</Button>}
      </FormSection>

      {/* Summary */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg"><div className="space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Comp. fija:</span><span className="font-mono">{fmt(costoFijo)}</span></div>
        {costoGrupos > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Grupos (prom.):</span><span className="font-mono">{fmt(costoGrupos)}</span></div>}
        <div className="flex justify-between items-center pt-2 border-t"><div><p className="text-sm text-muted-foreground">Costo Total</p><p className="text-2xl font-bold font-mono text-primary">{fmt(costoTotal)}</p></div>
        {item.precio_base > 0 && <div className="text-right"><p className="text-sm text-muted-foreground">FC% (s/neto)</p><Badge variant={badgeVar[fcColor(calcFC(costoTotal, item.precio_base), item.fc_objetivo || 32)]} className="text-lg px-3 py-1">{fmtPct(calcFC(costoTotal, item.precio_base))}</Badge></div>}
        </div></div></div>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => onOpenChange(false)}>{hasChanges ? 'Cancelar' : 'Cerrar'}</Button>
        {hasChanges && <LoadingButton loading={mutations.saveComposicion.isPending} onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Guardar Composición</LoadingButton>}
      </div>
    </div>
  </DialogContent></Dialog>);
}

// ─── Grupo Opcional Editor ───
function GrupoEditor({ grupo, itemId, insumos, preparaciones, mutations }: any) {
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [nombre, setNombre] = useState(grupo.nombre);
  useEffect(() => { if (grupo.items) setEditItems(grupo.items.map((gi: any) => ({ tipo: gi.preparacion_id ? 'preparacion' : 'insumo', insumo_id: gi.insumo_id || '', preparacion_id: gi.preparacion_id || '', cantidad: gi.cantidad, costo_unitario: gi.costo_unitario || gi.insumos?.costo_por_unidad_base || gi.preparaciones?.costo_calculado || 0, _nombre: gi.insumos?.nombre || gi.preparaciones?.nombre || '' }))); }, [grupo.items]);
  const addItem = () => { setEditItems([...editItems, { tipo: 'insumo', insumo_id: '', preparacion_id: '', cantidad: 1, costo_unitario: 0, _nombre: '' }]); setEditing(true); };
  const updateItem = (i: number, field: string, value: any) => {
    const next = [...editItems]; next[i] = { ...next[i], [field]: value };
    if (field === 'tipo') { next[i].insumo_id = ''; next[i].preparacion_id = ''; next[i].costo_unitario = 0; next[i]._nombre = ''; }
    if (field === 'insumo_id') { const ins = insumos.find((x: any) => x.id === value); next[i].costo_unitario = ins?.costo_por_unidad_base || 0; next[i]._nombre = ins?.nombre || ''; }
    if (field === 'preparacion_id') { const p = preparaciones.find((x: any) => x.id === value); next[i].costo_unitario = p?.costo_calculado || 0; next[i]._nombre = p?.nombre || ''; }
    setEditItems(next); setEditing(true);
  };
  const removeItem = (i: number) => { setEditItems(editItems.filter((_, idx) => idx !== i)); setEditing(true); };
  const promedio = editItems.length > 0 ? editItems.reduce((s, i) => s + i.cantidad * i.costo_unitario, 0) / editItems.length : 0;
  const handleSave = async () => { if (nombre !== grupo.nombre) await mutations.updateGrupo.mutateAsync({ id: grupo.id, item_carta_id: itemId, data: { nombre } }); await mutations.saveGrupoItems.mutateAsync({ grupo_id: grupo.id, item_carta_id: itemId, items: editItems.filter(i => i.insumo_id || i.preparacion_id).map(i => ({ insumo_id: i.tipo === 'insumo' ? i.insumo_id : null, preparacion_id: i.tipo === 'preparacion' ? i.preparacion_id : null, cantidad: i.cantidad, costo_unitario: i.costo_unitario })) }); setEditing(false); };

  return (<div className="border rounded-lg p-3 space-y-2 mb-2">
    <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Badge variant="outline" className="text-xs">Grupo</Badge><Input value={nombre} onChange={e => { setNombre(e.target.value); setEditing(true); }} className="h-7 text-sm font-medium w-40" /></div><div className="flex items-center gap-1"><span className="text-xs text-muted-foreground">Prom:</span><span className="font-mono text-sm font-semibold">{fmt(promedio)}</span><Button variant="ghost" size="icon" className="h-6 w-6 ml-2" onClick={() => mutations.deleteGrupo.mutate({ id: grupo.id, item_carta_id: itemId })}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button></div></div>
    {editItems.map((ei, i) => (<div key={i} className="flex items-center gap-1.5 text-xs pl-4">
      <Select value={ei.tipo} onValueChange={v => updateItem(i, 'tipo', v)}><SelectTrigger className="h-6 w-[80px] text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="insumo">Catálogo</SelectItem><SelectItem value="preparacion">Receta</SelectItem></SelectContent></Select>
      <div className="flex-1 min-w-0">{ei.tipo === 'insumo' ? (() => {
        const selectedIds = editItems.filter((_, idx) => idx !== i).map(x => x.insumo_id).filter(Boolean);
        const available = insumos.filter((x: any) => (x.tipo_item === 'insumo' || x.tipo_item === 'producto') && !selectedIds.includes(x.id));
        const productos = available.filter((x: any) => x.tipo_item === 'producto');
        const otros = available.filter((x: any) => x.tipo_item !== 'producto');
        return (<Select value={ei.insumo_id || 'none'} onValueChange={v => updateItem(i, 'insumo_id', v === 'none' ? '' : v)}><SelectTrigger className="h-6 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger><SelectContent><SelectItem value="none">Seleccionar...</SelectItem>
          {productos.length > 0 && <><SelectItem value="__h_prod" disabled className="text-xs font-semibold text-muted-foreground">── Productos ──</SelectItem>{productos.map((ins: any) => <SelectItem key={ins.id} value={ins.id}>{ins.nombre}</SelectItem>)}</>}
          {otros.length > 0 && <><SelectItem value="__h_ins" disabled className="text-xs font-semibold text-muted-foreground">── Insumos ──</SelectItem>{otros.map((ins: any) => <SelectItem key={ins.id} value={ins.id}>{ins.nombre}</SelectItem>)}</>}
        </SelectContent></Select>);
      })() : (() => {
        const selectedIds = editItems.filter((_, idx) => idx !== i).map(x => x.preparacion_id).filter(Boolean);
        return (<Select value={ei.preparacion_id || 'none'} onValueChange={v => updateItem(i, 'preparacion_id', v === 'none' ? '' : v)}><SelectTrigger className="h-6 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger><SelectContent><SelectItem value="none">Seleccionar...</SelectItem>{preparaciones.filter((p: any) => !selectedIds.includes(p.id)).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent></Select>);
      })()}</div>
      <Input type="number" className="h-6 w-14 text-xs" value={ei.cantidad} onChange={e => updateItem(i, 'cantidad', Number(e.target.value))} /><span className="font-mono text-xs w-16 text-right">{fmt(ei.cantidad * ei.costo_unitario)}</span><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeItem(i)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
    </div>))}
    <div className="flex items-center gap-2 pl-4">
      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addItem}><Plus className="w-3 h-3 mr-1" /> Agregar opción</Button>
      {editing && <Button size="sm" className="h-6 text-xs ml-auto" onClick={handleSave} disabled={mutations.saveGrupoItems.isPending}><Save className="w-3 h-3 mr-1" /> Guardar</Button>}
    </div>
  </div>);
}

// ─── Historial Modal ───
function HistorialModal({ open, onOpenChange, item }: any) {
  const { data: historial } = useItemCartaHistorial(item?.id);
  return (<Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Historial: {item.nombre}</DialogTitle></DialogHeader>
    <div className="space-y-2 max-h-[400px] overflow-y-auto">
      {historial?.length ? historial.map((h: any) => (
        <div key={h.id} className="flex justify-between items-center p-2 border rounded text-sm">
          <div>
            <span className="font-mono">{fmt(h.precio_anterior || 0)} → {fmt(h.precio_nuevo)}</span>
            {h.motivo && <p className="text-xs text-muted-foreground">{h.motivo}</p>}
          </div>
          <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString('es-AR')}</span>
        </div>
      )) : <p className="text-sm text-muted-foreground text-center py-4">Sin historial de precios</p>}
    </div>
  </DialogContent></Dialog>);
}
