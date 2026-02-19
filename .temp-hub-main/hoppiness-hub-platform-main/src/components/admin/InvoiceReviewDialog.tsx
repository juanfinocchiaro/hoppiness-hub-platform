import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, Save, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface InvoiceReviewDialogProps {
  documentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceReviewDialog({
  documentId,
  open,
  onOpenChange,
}: InvoiceReviewDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<any>(null);

  // Fetch document and invoice data
  const { data, isLoading } = useQuery({
    queryKey: ['invoice-review', documentId],
    queryFn: async () => {
      const { data: doc, error: docError } = await supabase
        .from('scanned_documents')
        .select(`
          *,
          extracted_invoices (
            *,
            extracted_invoice_items (*)
          )
        `)
        .eq('id', documentId)
        .single();

      if (docError) throw docError;
      return doc;
    },
    enabled: open && !!documentId,
  });

  // Initialize form data when data loads
  useEffect(() => {
    if (data?.extracted_invoices?.[0]) {
      setFormData(data.extracted_invoices[0]);
    }
  }, [data]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (reviewed: boolean) => {
      if (!formData) return;

      const { error } = await supabase
        .from('extracted_invoices')
        .update({
          supplier_name: formData.supplier_name,
          supplier_cuit: formData.supplier_cuit,
          supplier_address: formData.supplier_address,
          supplier_iva_condition: formData.supplier_iva_condition,
          invoice_type: formData.invoice_type,
          invoice_number: formData.invoice_number,
          invoice_date: formData.invoice_date,
          due_date: formData.due_date,
          payment_method: formData.payment_method,
          payment_condition: formData.payment_condition,
          subtotal: formData.subtotal,
          iva_amount: formData.iva_amount,
          other_taxes: formData.other_taxes,
          total: formData.total,
          notes: formData.notes,
          is_reviewed: reviewed,
          reviewed_at: reviewed ? new Date().toISOString() : null,
        })
        .eq('id', formData.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scanned-documents'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-review', documentId] });
      toast.success('Comprobante guardado');
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleSave = () => saveMutation.mutate(false);
  const handleApprove = () => {
    saveMutation.mutate(true);
    onOpenChange(false);
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const invoice = formData;
  const items = data?.extracted_invoices?.[0]?.extracted_invoice_items || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center justify-between">
            <span>Revisar Comprobante</span>
            {invoice?.confidence_score && (
              <Badge variant="outline">
                Confianza: {Math.round(invoice.confidence_score * 100)}%
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="flex h-[calc(90vh-120px)]">
            {/* Image Preview */}
            <div className="w-1/2 border-r bg-muted/50 p-4">
              <div className="h-full rounded-lg overflow-hidden bg-white shadow-inner">
                {data?.file_url && (
                  <img
                    src={data.file_url}
                    alt="Comprobante"
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
              <Button
                variant="link"
                size="sm"
                className="mt-2"
                onClick={() => window.open(data?.file_url, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Abrir en nueva pestaña
              </Button>
            </div>

            {/* Form */}
            <ScrollArea className="w-1/2">
              <div className="p-6 space-y-6">
                {/* Supplier Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Datos del Proveedor
                  </h3>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label>Razón Social</Label>
                      <Input
                        value={invoice?.supplier_name || ''}
                        onChange={(e) => updateField('supplier_name', e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>CUIT</Label>
                        <Input
                          value={invoice?.supplier_cuit || ''}
                          onChange={(e) => updateField('supplier_cuit', e.target.value)}
                          placeholder="XX-XXXXXXXX-X"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Condición IVA</Label>
                        <Select
                          value={invoice?.supplier_iva_condition || ''}
                          onValueChange={(v) => updateField('supplier_iva_condition', v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Responsable Inscripto">Responsable Inscripto</SelectItem>
                            <SelectItem value="Monotributo">Monotributo</SelectItem>
                            <SelectItem value="Exento">Exento</SelectItem>
                            <SelectItem value="Consumidor Final">Consumidor Final</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Dirección</Label>
                      <Input
                        value={invoice?.supplier_address || ''}
                        onChange={(e) => updateField('supplier_address', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Invoice Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Datos del Comprobante
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select
                        value={invoice?.invoice_type || ''}
                        onValueChange={(v) => updateField('invoice_type', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">Factura A</SelectItem>
                          <SelectItem value="B">Factura B</SelectItem>
                          <SelectItem value="C">Factura C</SelectItem>
                          <SelectItem value="X">Factura X</SelectItem>
                          <SelectItem value="Ticket">Ticket</SelectItem>
                          <SelectItem value="Remito">Remito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Número</Label>
                      <Input
                        value={invoice?.invoice_number || ''}
                        onChange={(e) => updateField('invoice_number', e.target.value)}
                        placeholder="0001-00012345"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fecha Emisión</Label>
                      <Input
                        type="date"
                        value={invoice?.invoice_date || ''}
                        onChange={(e) => updateField('invoice_date', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha Vencimiento</Label>
                      <Input
                        type="date"
                        value={invoice?.due_date || ''}
                        onChange={(e) => updateField('due_date', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Forma de Pago</Label>
                      <Select
                        value={invoice?.payment_method || ''}
                        onValueChange={(v) => updateField('payment_method', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="efectivo">Efectivo</SelectItem>
                          <SelectItem value="transferencia">Transferencia</SelectItem>
                          <SelectItem value="tarjeta">Tarjeta</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                          <SelectItem value="cuenta_corriente">Cuenta Corriente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Condición</Label>
                      <Select
                        value={invoice?.payment_condition || ''}
                        onValueChange={(v) => updateField('payment_condition', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Contado">Contado</SelectItem>
                          <SelectItem value="Cuenta Corriente">Cuenta Corriente</SelectItem>
                          <SelectItem value="30 días">30 días</SelectItem>
                          <SelectItem value="60 días">60 días</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Amounts */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Importes
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Subtotal</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={invoice?.subtotal || ''}
                        onChange={(e) => updateField('subtotal', parseFloat(e.target.value) || null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>IVA</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={invoice?.iva_amount || ''}
                        onChange={(e) => updateField('iva_amount', parseFloat(e.target.value) || null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Otros Impuestos</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={invoice?.other_taxes || ''}
                        onChange={(e) => updateField('other_taxes', parseFloat(e.target.value) || null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Total</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={invoice?.total || ''}
                        onChange={(e) => updateField('total', parseFloat(e.target.value) || null)}
                        className="font-bold text-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Items */}
                {items.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                        Detalle de Items ({items.length})
                      </h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Descripción</TableHead>
                              <TableHead className="text-right">Cant.</TableHead>
                              <TableHead className="text-right">Precio</TableHead>
                              <TableHead className="text-right">Subtotal</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((item: any) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.description}</TableCell>
                                <TableCell className="text-right">
                                  {item.quantity} {item.unit}
                                </TableCell>
                                <TableCell className="text-right">
                                  {item.unit_price ? `$${item.unit_price.toLocaleString('es-AR')}` : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                  {item.subtotal ? `$${item.subtotal.toLocaleString('es-AR')}` : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea
                    value={invoice?.notes || ''}
                    onChange={(e) => updateField('notes', e.target.value)}
                    rows={2}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-background">
                  <Button
                    variant="outline"
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={saveMutation.isPending}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aprobar y Cerrar
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
