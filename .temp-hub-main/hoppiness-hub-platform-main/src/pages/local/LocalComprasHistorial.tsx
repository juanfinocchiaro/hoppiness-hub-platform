import { useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Download, FileText, Calendar, DollarSign, Receipt } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface Invoice {
  id: string;
  invoice_date: string;
  supplier_id: string;
  supplier_name: string;
  invoice_number: string | null;
  invoice_type: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number;
  is_paid: boolean;
}

export default function LocalComprasHistorial() {
  const { branchId } = useParams();
  const { branch } = useOutletContext<{ branch: Branch }>();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierId, setSupplierId] = useState<string>('all');
  const [period, setPeriod] = useState<string>('this_month');

  // Get date range based on period
  const getDateRange = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    switch (period) {
      case 'this_month':
        return { start: startOfMonth.toISOString(), end: now.toISOString() };
      case 'last_month':
        return { start: startOfLastMonth.toISOString(), end: endOfLastMonth.toISOString() };
      case 'last_3_months':
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        return { start: threeMonthsAgo.toISOString(), end: now.toISOString() };
      default:
        return { start: startOfMonth.toISOString(), end: now.toISOString() };
    }
  };

  // Fetch suppliers for filter
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-list', branchId],
    queryFn: async () => {
      const { data } = await supabase
        .from('suppliers')
        .select('id, name')
        .or(`scope.eq.brand,and(scope.eq.local,branch_id.eq.${branchId})`)
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
    enabled: !!branchId,
  });

  // Fetch invoices
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['purchase-history', branchId, supplierId, period],
    queryFn: async () => {
      const dateRange = getDateRange();
      
      let query = supabase
        .from('supplier_invoices')
        .select(`
          id,
          invoice_date,
          supplier_id,
          invoice_number,
          invoice_type,
          subtotal,
          total,
          is_paid,
          suppliers!inner(name)
        `)
        .eq('branch_id', branchId)
        .gte('invoice_date', dateRange.start.split('T')[0])
        .lte('invoice_date', dateRange.end.split('T')[0])
        .order('invoice_date', { ascending: false });
      
      if (supplierId !== 'all') {
        query = query.eq('supplier_id', supplierId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map((inv: any) => ({
        id: inv.id,
        invoice_date: inv.invoice_date,
        supplier_id: inv.supplier_id,
        supplier_name: inv.suppliers?.name || 'Desconocido',
        invoice_number: inv.invoice_number,
        invoice_type: inv.invoice_type,
        subtotal: inv.subtotal,
        tax: null,
        total: inv.total,
        is_paid: inv.is_paid,
      })) as Invoice[];
    },
    enabled: !!branchId,
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

  // Filter by search
  const filteredInvoices = invoices?.filter(inv => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.supplier_name.toLowerCase().includes(q) ||
      inv.invoice_number?.toLowerCase().includes(q)
    );
  }) || [];

  // Stats
  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const invoiceCount = filteredInvoices.length;
  const avgAmount = invoiceCount > 0 ? totalAmount / invoiceCount : 0;

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Historial de Compras</h1>
          <p className="text-muted-foreground">{branch?.name}</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this_month">Este mes</SelectItem>
            <SelectItem value="last_month">Mes anterior</SelectItem>
            <SelectItem value="last_3_months">Últimos 3 meses</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={supplierId} onValueChange={setSupplierId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos los proveedores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {suppliers?.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Facturas</p>
                <p className="text-2xl font-bold">{invoiceCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Promedio</p>
                <p className="text-2xl font-bold">{formatCurrency(avgAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Facturas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Factura</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No hay facturas en este período
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map(invoice => (
                    <TableRow key={invoice.id}>
                      <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                      <TableCell className="font-medium">{invoice.supplier_name}</TableCell>
                      <TableCell>
                        {invoice.invoice_type} {invoice.invoice_number}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(invoice.total)}
                      </TableCell>
                      <TableCell className="text-center">
                        {invoice.is_paid ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                            Pagada
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-warning/10 text-warning">
                            Pendiente
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
