import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, Store, Calendar, ChevronDown, ChevronRight,
  TrendingUp, TrendingDown, DollarSign, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

// P&L Category Structure
const PL_STRUCTURE = {
  INGRESOS: {
    label: 'INGRESOS',
    type: 'income',
    subcategories: [
      'Ventas Salón',
      'Ventas Mostrador',
      'Ventas Delivery',
      'Ventas PedidosYa',
      'Ventas Rappi',
      'Ventas MercadoPago Delivery',
      'Otros Ingresos',
    ]
  },
  CMV: {
    label: 'COSTOS VARIABLES (CMV)',
    type: 'expense',
    subcategories: [
      'Carne Vacuna',
      'Carne Cerdo',
      'Pollo',
      'Pan y Panificados',
      'Papas',
      'Vegetales y Verduras',
      'Quesos',
      'Aderezos y Salsas',
      'Bebidas Alcohólicas',
      'Bebidas Sin Alcohol',
      'Packaging Comida',
    ]
  },
  GASTOS_OPERATIVOS: {
    label: 'GASTOS OPERATIVOS',
    type: 'expense',
    subcategories: [
      'Descartables',
      'Productos de Limpieza',
      'Mantenimiento y Reparaciones',
      'Herramientas y Equipamiento',
      'Insumos de Cocina',
      'Uniformes',
      'Marketing y Publicidad',
    ]
  },
  RRHH: {
    label: 'RECURSOS HUMANOS',
    type: 'expense',
    subcategories: [
      'Sueldos',
      'Jornales',
      'Cargas Sociales',
      'Comida Personal',
      'Premios y Bonos',
    ]
  },
  ESTRUCTURA: {
    label: 'ESTRUCTURA & LOGÍSTICA',
    type: 'expense',
    subcategories: [
      'Alquiler',
      'Expensas',
      'Electricidad',
      'Gas',
      'Agua',
      'Internet y Telefonía',
      'Seguros',
      'Comisiones Apps Delivery',
      'Comisiones MercadoPago',
      'Logística y Fletes',
      'Alquiler de Equipos',
    ]
  },
  IMPUESTOS: {
    label: 'IMPUESTOS & FINANCIERO',
    type: 'expense',
    subcategories: [
      'IIBB',
      'Monotributo',
      'IVA (Saldo a Pagar)',
      'Tasas Municipales',
      'Intereses Bancarios',
      'Comisiones Bancarias',
      'Otros Impuestos',
    ]
  }
};

type PeriodType = 'current' | 'previous' | 'custom';

interface CategoryTotal {
  name: string;
  fiscal: number;
  internal: number;
  total: number;
}

interface GroupTotal {
  key: string;
  label: string;
  type: string;
  fiscal: number;
  internal: number;
  total: number;
  categories: CategoryTotal[];
}

export default function ProfitLossReport() {
  const { isAdmin, isFranquiciado, accessibleBranches, loading: roleLoading } = useUserRole();
  
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [period, setPeriod] = useState<PeriodType>('current');
  const [loading, setLoading] = useState(true);
  const [managerialMode, setManagerialMode] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['INGRESOS', 'CMV']));
  const [plData, setPlData] = useState<GroupTotal[]>([]);

  // Admins and Franchisees can toggle between modes
  const canToggleMode = isAdmin || isFranquiciado;

  const getPeriodDates = (p: PeriodType): { start: Date; end: Date } => {
    const now = new Date();
    switch (p) {
      case 'current':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'previous':
        const prevMonth = subMonths(now, 1);
        return { start: startOfMonth(prevMonth), end: endOfMonth(prevMonth) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const fetchPLData = async () => {
    setLoading(true);
    try {
      const { start, end } = getPeriodDates(period);
      
      // Fetch transactions with category info
      let query = supabase
        .from('transactions')
        .select(`
          id,
          amount,
          type,
          receipt_type,
          category_id,
          transaction_date,
          category:transaction_categories(name, category_group)
        `)
        .gte('transaction_date', format(start, 'yyyy-MM-dd'))
        .lte('transaction_date', format(end, 'yyyy-MM-dd'));

      if (selectedBranch !== 'all') {
        query = query.eq('branch_id', selectedBranch);
      }

      const { data: transactions, error } = await query;
      if (error) throw error;

      // Process transactions into P&L structure
      const groupTotals: GroupTotal[] = Object.entries(PL_STRUCTURE).map(([key, group]) => {
        const categoryTotals: CategoryTotal[] = group.subcategories.map(catName => {
          const matchingTxs = (transactions || []).filter(tx => 
            tx.category?.name === catName
          );
          
          const fiscal = matchingTxs
            .filter(tx => tx.receipt_type === 'OFFICIAL')
            .reduce((sum, tx) => sum + Number(tx.amount), 0);
          
          const internal = matchingTxs
            .filter(tx => tx.receipt_type === 'INTERNAL')
            .reduce((sum, tx) => sum + Number(tx.amount), 0);

          return {
            name: catName,
            fiscal,
            internal,
            total: fiscal + internal
          };
        });

        return {
          key,
          label: group.label,
          type: group.type,
          fiscal: categoryTotals.reduce((sum, c) => sum + c.fiscal, 0),
          internal: categoryTotals.reduce((sum, c) => sum + c.internal, 0),
          total: categoryTotals.reduce((sum, c) => sum + c.total, 0),
          categories: categoryTotals
        };
      });

      setPlData(groupTotals);
    } catch (error: any) {
      console.error('Error fetching P&L:', error);
      toast.error('Error al cargar el estado de resultados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!roleLoading) {
      fetchPLData();
    }
  }, [selectedBranch, period, roleLoading]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value);

  const getValue = (item: { fiscal: number; internal: number; total: number }) => {
    return managerialMode ? item.total : item.fiscal;
  };

  // Calculate totals
  const ingresos = plData.find(g => g.key === 'INGRESOS');
  const cmv = plData.find(g => g.key === 'CMV');
  const gastosOp = plData.find(g => g.key === 'GASTOS_OPERATIVOS');
  const rrhh = plData.find(g => g.key === 'RRHH');
  const estructura = plData.find(g => g.key === 'ESTRUCTURA');
  const impuestos = plData.find(g => g.key === 'IMPUESTOS');

  const totalIngresos = ingresos ? getValue(ingresos) : 0;
  const totalCMV = cmv ? getValue(cmv) : 0;
  const margenBruto = totalIngresos - totalCMV;
  
  const totalGastosOp = gastosOp ? getValue(gastosOp) : 0;
  const totalRRHH = rrhh ? getValue(rrhh) : 0;
  const totalEstructura = estructura ? getValue(estructura) : 0;
  const totalImpuestos = impuestos ? getValue(impuestos) : 0;
  
  const resultadoNeto = margenBruto - totalGastosOp - totalRRHH - totalEstructura - totalImpuestos;
  const margenBrutoPercent = totalIngresos > 0 ? (margenBruto / totalIngresos) * 100 : 0;
  const resultadoNetoPercent = totalIngresos > 0 ? (resultadoNeto / totalIngresos) * 100 : 0;

  if (roleLoading) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { start, end } = getPeriodDates(period);
  const periodLabel = `${format(start, "d 'de' MMMM", { locale: es })} - ${format(end, "d 'de' MMMM, yyyy", { locale: es })}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Estado de Resultados</h1>
          <p className="text-muted-foreground">{periodLabel}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Fiscal/Managerial Toggle - Only for Owners/Admins */}
          {canToggleMode && (
            <div className="flex items-center gap-3 p-3 bg-sidebar rounded-lg border border-sidebar-border">
              <div className="flex items-center gap-2">
                {managerialMode ? (
                  <Eye className="h-4 w-4 text-primary" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
                <Label htmlFor="mode-switch" className="text-sm font-medium cursor-pointer">
                  {managerialMode ? 'Realidad Gerencial' : 'Contabilidad Fiscal'}
                </Label>
              </div>
              <Switch
                id="mode-switch"
                checked={managerialMode}
                onCheckedChange={setManagerialMode}
              />
            </div>
          )}

          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-[180px]">
              <Store className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sucursal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las sucursales</SelectItem>
              {accessibleBranches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Este mes</SelectItem>
              <SelectItem value="previous">Mes anterior</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={fetchPLData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Mode Indicator */}
      <div className="flex items-center gap-2">
        <Badge variant={managerialMode ? 'default' : 'secondary'} className="text-xs">
          {managerialMode ? 'Incluye movimientos internos (no fiscales)' : 'Solo movimientos fiscales'}
        </Badge>
        {managerialMode && (
          <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
            Vista confidencial
          </Badge>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-green-500/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Ingresos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIngresos)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Margen Bruto</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(margenBruto)}</div>
            <p className="text-xs text-muted-foreground">
              {margenBrutoPercent.toFixed(1)}% del ingreso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(totalCMV + totalGastosOp + totalRRHH + totalEstructura + totalImpuestos)}
            </div>
          </CardContent>
        </Card>

        <Card className={resultadoNeto >= 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-destructive/5 border-destructive/20'}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resultado Neto</CardTitle>
            <DollarSign className={`h-4 w-4 ${resultadoNeto >= 0 ? 'text-green-500' : 'text-destructive'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${resultadoNeto >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {formatCurrency(resultadoNeto)}
            </div>
            <p className="text-xs text-muted-foreground">
              {resultadoNetoPercent.toFixed(1)}% del ingreso
            </p>
          </CardContent>
        </Card>
      </div>

      {/* P&L Detail */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle por Categoría</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Income Groups */}
              {plData.filter(g => g.type === 'income').map((group) => (
                <PLGroup
                  key={group.key}
                  group={group}
                  expanded={expandedGroups.has(group.key)}
                  onToggle={() => toggleGroup(group.key)}
                  getValue={getValue}
                  formatCurrency={formatCurrency}
                  isIncome={true}
                  managerialMode={managerialMode}
                />
              ))}

              {/* Gross Margin */}
              <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg font-semibold">
                <span>= MARGEN BRUTO</span>
                <span className={margenBruto >= 0 ? 'text-green-600' : 'text-destructive'}>
                  {formatCurrency(margenBruto)}
                </span>
              </div>

              <Separator className="my-4" />

              {/* Expense Groups */}
              {plData.filter(g => g.type === 'expense').map((group) => (
                <PLGroup
                  key={group.key}
                  group={group}
                  expanded={expandedGroups.has(group.key)}
                  onToggle={() => toggleGroup(group.key)}
                  getValue={getValue}
                  formatCurrency={formatCurrency}
                  isIncome={false}
                  managerialMode={managerialMode}
                />
              ))}

              <Separator className="my-4" />

              {/* Net Result */}
              <div className={`flex items-center justify-between py-4 px-4 rounded-lg font-bold text-lg ${
                resultadoNeto >= 0 ? 'bg-green-500/10' : 'bg-destructive/10'
              }`}>
                <span>= RESULTADO NETO (EBITDA)</span>
                <span className={resultadoNeto >= 0 ? 'text-green-600' : 'text-destructive'}>
                  {formatCurrency(resultadoNeto)}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// P&L Group Component
interface PLGroupProps {
  group: GroupTotal;
  expanded: boolean;
  onToggle: () => void;
  getValue: (item: { fiscal: number; internal: number; total: number }) => number;
  formatCurrency: (value: number) => string;
  isIncome: boolean;
  managerialMode: boolean;
}

function PLGroup({ group, expanded, onToggle, getValue, formatCurrency, isIncome, managerialMode }: PLGroupProps) {
  const value = getValue(group);
  const hasInternalAmount = group.internal > 0;

  return (
    <Collapsible open={expanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <div className={`flex items-center justify-between py-3 px-4 rounded-lg cursor-pointer transition-colors ${
          isIncome ? 'bg-green-500/5 hover:bg-green-500/10' : 'bg-destructive/5 hover:bg-destructive/10'
        }`}>
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="font-semibold">{isIncome ? '(+)' : '(-)'} {group.label}</span>
            {managerialMode && hasInternalAmount && (
              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                Incluye INT
              </Badge>
            )}
          </div>
          <span className={`font-semibold ${isIncome ? 'text-green-600' : 'text-destructive'}`}>
            {formatCurrency(value)}
          </span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-6 mt-1 space-y-1">
          {group.categories.filter(c => getValue(c) > 0).map((cat) => (
            <div key={cat.name} className="flex items-center justify-between py-2 px-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{cat.name}</span>
                {managerialMode && cat.internal > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    INT: {formatCurrency(cat.internal)}
                  </Badge>
                )}
              </div>
              <span>{formatCurrency(getValue(cat))}</span>
            </div>
          ))}
          {group.categories.filter(c => getValue(c) > 0).length === 0 && (
            <p className="py-2 px-4 text-sm text-muted-foreground italic">
              Sin movimientos en este período
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
