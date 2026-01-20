import { useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Search, Building2, Store, ChevronDown, ChevronRight, AlertTriangle, DollarSign, CreditCard, FileText } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface SupplierWithBalance {
  id: string;
  name: string;
  scope: string;
  balance: number;
  overdue: number;
}

interface Movement {
  id: string;
  date: string;
  concept: string;
  debit: number | null;
  credit: number | null;
  type: 'invoice' | 'payment';
}

export default function LocalComprasCuentas() {
  const { branchId } = useParams();
  const { branch } = useOutletContext<{ branch: Branch }>();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'with_balance'>('all');
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);

  // Fetch suppliers with balances
  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['supplier-accounts', branchId],
    queryFn: async () => {
      // Get suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('id, name, scope')
        .or(`scope.eq.brand,and(scope.eq.local,branch_id.eq.${branchId})`)
        .eq('is_active', true)
        .order('name');
      
      if (suppliersError) throw suppliersError;
      
      // Get invoices to calculate balances
      const { data: invoicesData } = await supabase
        .from('supplier_invoices')
        .select('supplier_id, total')
        .eq('branch_id', branchId);
      
      // Calculate balance per supplier
      const balanceMap = new Map<string, number>();
      const overdueMap = new Map<string, number>();
      
      invoicesData?.forEach((inv: any) => {
        const current = balanceMap.get(inv.supplier_id) || 0;
        balanceMap.set(inv.supplier_id, current + (inv.total || 0));
      });
      
      return (suppliersData || []).map(s => ({
        ...s,
        balance: balanceMap.get(s.id) || 0,
        overdue: overdueMap.get(s.id) || 0,
      })) as SupplierWithBalance[];
    },
    enabled: !!branchId,
  });

  // Fetch movements for expanded supplier
  const { data: movements } = useQuery({
    queryKey: ['supplier-movements', branchId, expandedSupplier],
    queryFn: async () => {
      if (!expandedSupplier) return [];
      
      // Get invoices
      const { data: invoices } = await supabase
        .from('supplier_invoices')
        .select('id, invoice_date, invoice_number, total')
        .eq('branch_id', branchId)
        .eq('supplier_id', expandedSupplier)
        .order('invoice_date', { ascending: false })
        .limit(20);
      
      // Get payments (from transactions)
      const { data: payments } = await supabase
        .from('transactions')
        .select('id, transaction_date, concept, amount')
        .eq('branch_id', branchId)
        .eq('type', 'expense')
        .ilike('concept', `%${expandedSupplier}%`)
        .order('transaction_date', { ascending: false })
        .limit(20);
      
      const allMovements: Movement[] = [
        ...(invoices || []).map(inv => ({
          id: inv.id,
          date: inv.invoice_date,
          concept: `Factura ${inv.invoice_number}`,
          debit: inv.total,
          credit: null,
          type: 'invoice' as const,
        })),
        ...(payments || []).map(pay => ({
          id: pay.id,
          date: pay.transaction_date,
          concept: pay.concept,
          debit: null,
          credit: Math.abs(pay.amount),
          type: 'payment' as const,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      return allMovements;
    },
    enabled: !!expandedSupplier,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Filter suppliers
  const filteredSuppliers = suppliers?.filter(s => {
    if (filter === 'with_balance' && s.balance === 0) return false;
    if (searchQuery) {
      return s.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  }) || [];

  const totalBalance = suppliers?.reduce((sum, s) => sum + s.balance, 0) || 0;
  const totalOverdue = suppliers?.reduce((sum, s) => sum + s.overdue, 0) || 0;
  const supplierCount = suppliers?.filter(s => s.balance > 0).length || 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Cuentas Corrientes - Proveedores</h1>
        <p className="text-muted-foreground">{branch?.name}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <DollarSign className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total a pagar</p>
                <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vencido</p>
                <p className="text-2xl font-bold">{formatCurrency(totalOverdue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Proveedores</p>
                <p className="text-2xl font-bold">{supplierCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filter} onValueChange={(v: 'all' | 'with_balance') => setFilter(v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="with_balance">Con saldo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Suppliers List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Proveedores</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredSuppliers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No hay proveedores que coincidan con los filtros
            </div>
          ) : (
            <div className="divide-y">
              {filteredSuppliers.map(supplier => (
                <Collapsible
                  key={supplier.id}
                  open={expandedSupplier === supplier.id}
                  onOpenChange={(open) => setExpandedSupplier(open ? supplier.id : null)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        {supplier.scope === 'brand' ? (
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Store className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">{supplier.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {supplier.scope === 'brand' ? 'Marca' : 'Local'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(supplier.balance)}</p>
                          {supplier.overdue > 0 && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {formatCurrency(supplier.overdue)} vencido
                            </p>
                          )}
                        </div>
                        {expandedSupplier === supplier.id ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-4 pb-4 bg-muted/30">
                      <div className="rounded-lg border bg-card">
                        <div className="p-3 border-b">
                          <h4 className="font-medium text-sm">Movimientos</h4>
                        </div>
                        <div className="divide-y max-h-64 overflow-y-auto">
                          {!movements || movements.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              Sin movimientos recientes
                            </div>
                          ) : (
                            movements.map(mov => (
                              <div key={mov.id} className="flex items-center justify-between p-3 text-sm">
                                <div className="flex items-center gap-3">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium">{mov.concept}</p>
                                    <p className="text-xs text-muted-foreground">{formatDate(mov.date)}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  {mov.debit && (
                                    <span className="text-destructive">{formatCurrency(mov.debit)}</span>
                                  )}
                                  {mov.credit && (
                                    <span className="text-primary">-{formatCurrency(mov.credit)}</span>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="p-3 border-t">
                          <Button variant="outline" size="sm" className="w-full">
                            Registrar Pago
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
