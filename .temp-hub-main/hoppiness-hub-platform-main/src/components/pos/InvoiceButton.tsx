import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Loader2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { handleError } from '@/lib/errorHandler';

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_cuit?: string | null;
  customer_business_name?: string | null;
  invoice_type: string;
  total: number;
  subtotal: number;
  delivery_fee?: number | null;
  tax?: number | null;
  created_at: string;
  order_items?: {
    quantity: number;
    unit_price: number;
    products?: { name: string } | null;
  }[];
}

interface Branch {
  id: string;
  name: string;
  address: string;
  phone?: string | null;
}

interface InvoiceButtonProps {
  order: Order;
  branch: Branch;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'icon';
}

export default function InvoiceButton({ order, branch, variant = 'outline', size = 'sm' }: InvoiceButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const generateInvoice = async () => {
    setIsGenerating(true);
    
    try {
      // Call the edge function to generate the PDF
      const { data, error } = await supabase.functions.invoke('generate-invoice', {
        body: {
          orderId: order.id,
          branchId: branch.id,
        },
      });

      if (error) throw error;

      if (data?.url) {
        setInvoiceUrl(data.url);
        setShowDialog(true);
        toast.success('Comprobante generado');
      } else {
        throw new Error('No se recibió la URL del comprobante');
      }
    } catch (error: any) {
      handleError(error, { userMessage: 'Error al generar comprobante: ' + (error.message || 'Error desconocido'), context: 'InvoiceButton.handleGenerate' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (invoiceUrl) {
      window.open(invoiceUrl, '_blank');
    }
  };

  const handlePrint = () => {
    if (invoiceUrl) {
      const printWindow = window.open(invoiceUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={generateInvoice}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        {size !== 'icon' && (
          <span className="ml-2">Facturar</span>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Comprobante Generado
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Orden</span>
                <Badge variant="outline">#{order.id.slice(-6).toUpperCase()}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Cliente</span>
                <span className="font-medium">{order.customer_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="font-bold text-lg">
                  {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(order.total)}
                </span>
              </div>
              {order.invoice_type === 'factura_a' && order.customer_cuit && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">CUIT</span>
                  <span className="font-medium">{order.customer_cuit}</span>
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground text-center">
              El comprobante fue guardado y está disponible para reimpresión
            </p>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={handlePrint} className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button onClick={handleDownload} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
