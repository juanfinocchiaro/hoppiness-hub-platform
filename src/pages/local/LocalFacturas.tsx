import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileText, Download, Printer, Search, RefreshCw, ExternalLink } from 'lucide-react';
import { handleError } from '@/lib/errorHandler';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface InvoiceFile {
  name: string;
  created_at: string;
  id: string;
  metadata: Record<string, any> | null;
}

export default function LocalFacturas() {
  const { branchId } = useParams();
  const { branch } = useOutletContext<{ branch: Branch | null }>();
  
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceFile[]>([]);
  const [search, setSearch] = useState('');

  const fetchInvoices = async () => {
    if (!branchId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('invoices')
        .list(branchId, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      handleError(error, { showToast: false, context: 'LocalFacturas.fetchInvoices' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [branchId]);

  const getPublicUrl = (fileName: string) => {
    const { data } = supabase.storage
      .from('invoices')
      .getPublicUrl(`${branchId}/${fileName}`);
    return data.publicUrl;
  };

  const handlePrint = (fileName: string) => {
    const url = getPublicUrl(fileName);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const extractOrderInfo = (fileName: string) => {
    // Format: invoice_{orderId}_{timestamp}.html
    const match = fileName.match(/invoice_([a-f0-9-]+)_(\d+)\.html/);
    if (match) {
      return {
        orderId: match[1],
        shortId: match[1].slice(-6).toUpperCase(),
      };
    }
    return { orderId: '', shortId: fileName };
  };

  const filteredInvoices = invoices.filter(inv => {
    if (!search) return true;
    const { shortId } = extractOrderInfo(inv.name);
    return shortId.toLowerCase().includes(search.toLowerCase());
  });

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: es });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Facturas y Recibos</h1>
          <p className="text-muted-foreground">{branch?.name}</p>
        </div>
        <Button variant="outline" onClick={fetchInvoices} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Stats Card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{invoices.length}</p>
                <p className="text-sm text-muted-foreground">Comprobantes generados</p>
              </div>
            </div>
            <Badge variant="outline">
              Bucket: invoices
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por número de orden..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historial de Comprobantes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay comprobantes generados</p>
              <p className="text-sm">Los comprobantes aparecerán aquí cuando se generen desde el POS</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Orden</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => {
                  const { shortId } = extractOrderInfo(invoice.name);
                  return (
                    <TableRow key={invoice.name}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          #{shortId}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(invoice.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(getPublicUrl(invoice.name), '_blank')}
                            title="Ver"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePrint(invoice.name)}
                            title="Imprimir"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            title="Descargar"
                          >
                            <a href={getPublicUrl(invoice.name)} download>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
