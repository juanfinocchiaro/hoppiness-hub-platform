import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { handleError } from '@/lib/errorHandler';
import {
  Printer, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  Star,
  RefreshCw,
  Info,
  FileText,
  ChefHat,
  Wine,
  Receipt
} from 'lucide-react';

interface PrinterConfig {
  id: string;
  branch_id: string;
  name: string;
  type: 'browser' | 'escpos_network' | 'cloud';
  purpose: 'ticket' | 'kitchen' | 'bar' | 'receipt';
  ip_address: string | null;
  port: number;
  paper_width: number;
  is_active: boolean;
  is_default: boolean;
  print_copies: number;
  auto_cut: boolean;
  display_order: number;
}

const PURPOSE_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  ticket: { label: 'Ticket/Comanda', icon: FileText },
  kitchen: { label: 'Cocina', icon: ChefHat },
  bar: { label: 'Barra', icon: Wine },
  receipt: { label: 'Factura/Recibo', icon: Receipt },
};

const TYPE_LABELS: Record<string, string> = {
  browser: 'Navegador',
  escpos_network: 'ESC/POS Red',
  cloud: 'Cloud',
};

export default function PrintersPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { isSuperadmin, isEncargado, isFranquiciado, local } = usePermissionsV2(branchId);
  
  const [loading, setLoading] = useState(true);
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<PrinterConfig | null>(null);
  const [printerToDelete, setPrinterToDelete] = useState<PrinterConfig | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'browser' as 'browser' | 'escpos_network' | 'cloud',
    purpose: 'ticket' as 'ticket' | 'kitchen' | 'bar' | 'receipt',
    ip_address: '',
    port: 9100,
    paper_width: 80,
    is_active: true,
    is_default: false,
    print_copies: 1,
    auto_cut: true,
  });

  // Fetch printers
  useEffect(() => {
    if (!branchId) return;
    
    async function fetchPrinters() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('printers')
          .select('*')
          .eq('branch_id', branchId)
          .order('display_order', { ascending: true });

        if (error) throw error;
        setPrinters((data || []) as PrinterConfig[]);
      } catch (error) {
        handleError(error, { userMessage: 'Error al cargar impresoras', context: 'PrintersPage.fetchPrinters' });
      } finally {
        setLoading(false);
      }
    }

    fetchPrinters();
  }, [branchId]);

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'browser',
      purpose: 'ticket',
      ip_address: '',
      port: 9100,
      paper_width: 80,
      is_active: true,
      is_default: false,
      print_copies: 1,
      auto_cut: true,
    });
    setEditingPrinter(null);
  };

  const handleOpenDialog = (printer?: PrinterConfig) => {
    if (printer) {
      setEditingPrinter(printer);
      setFormData({
        name: printer.name,
        type: printer.type,
        purpose: printer.purpose,
        ip_address: printer.ip_address || '',
        port: printer.port,
        paper_width: printer.paper_width,
        is_active: printer.is_active,
        is_default: printer.is_default,
        print_copies: printer.print_copies,
        auto_cut: printer.auto_cut,
      });
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!branchId || !formData.name) {
      toast.error('Ingresá un nombre para la impresora');
      return;
    }

    try {
      const printerData = {
        branch_id: branchId,
        name: formData.name,
        type: formData.type,
        purpose: formData.purpose,
        ip_address: formData.type === 'escpos_network' ? formData.ip_address : null,
        port: formData.port,
        paper_width: formData.paper_width,
        is_active: formData.is_active,
        is_default: formData.is_default,
        print_copies: formData.print_copies,
        auto_cut: formData.auto_cut,
        display_order: editingPrinter?.display_order ?? printers.length,
      };

      // If setting as default, unset others of same purpose
      if (formData.is_default) {
        await supabase
          .from('printers')
          .update({ is_default: false })
          .eq('branch_id', branchId)
          .eq('purpose', formData.purpose);
      }

      if (editingPrinter) {
        const { error } = await supabase
          .from('printers')
          .update(printerData)
          .eq('id', editingPrinter.id);

        if (error) throw error;

        setPrinters(prev => prev.map(p => 
          p.id === editingPrinter.id ? { ...p, ...printerData } as PrinterConfig : p
        ));
        toast.success('Impresora actualizada');
      } else {
        const { data, error } = await supabase
          .from('printers')
          .insert(printerData)
          .select()
          .single();

        if (error) throw error;
        setPrinters(prev => [...prev, data as PrinterConfig]);
        toast.success('Impresora agregada');
      }

      setShowDialog(false);
      resetForm();
    } catch (error) {
      handleError(error, { userMessage: 'Error al guardar impresora', context: 'PrintersPage.handleSave' });
    }
  };

  const handleDelete = async () => {
    if (!printerToDelete) return;

    try {
      const { error } = await supabase
        .from('printers')
        .delete()
        .eq('id', printerToDelete.id);

      if (error) throw error;

      setPrinters(prev => prev.filter(p => p.id !== printerToDelete.id));
      toast.success('Impresora eliminada');
      setShowDeleteDialog(false);
      setPrinterToDelete(null);
    } catch (error) {
      handleError(error, { userMessage: 'Error al eliminar impresora', context: 'PrintersPage.handleDelete' });
    }
  };

  const handleToggleActive = async (printer: PrinterConfig) => {
    try {
      const { error } = await supabase
        .from('printers')
        .update({ is_active: !printer.is_active })
        .eq('id', printer.id);

      if (error) throw error;

      setPrinters(prev => prev.map(p => 
        p.id === printer.id ? { ...p, is_active: !printer.is_active } : p
      ));
    } catch (error) {
      handleError(error, { userMessage: 'Error al cambiar estado', context: 'PrintersPage.handleToggleActive' });
    }
  };

  const handleTestPrint = (printer: PrinterConfig) => {
    if (printer.type === 'browser') {
      // Open print dialog with test content
      const printWindow = window.open('', '_blank', 'width=300,height=400');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Prueba de Impresión</title>
              <style>
                body {
                  font-family: 'Courier New', monospace;
                  font-size: 12px;
                  width: ${printer.paper_width}mm;
                  margin: 0;
                  padding: 10px;
                }
                .center { text-align: center; }
                .line { border-top: 1px dashed #000; margin: 10px 0; }
                h2 { margin: 0 0 10px 0; font-size: 16px; }
              </style>
            </head>
            <body>
              <div class="center">
                <h2>HOPPINESS CLUB</h2>
                <p>Prueba de Impresión</p>
              </div>
              <div class="line"></div>
              <p><strong>Impresora:</strong> ${printer.name}</p>
              <p><strong>Propósito:</strong> ${PURPOSE_LABELS[printer.purpose]?.label}</p>
              <p><strong>Ancho:</strong> ${printer.paper_width}mm</p>
              <p><strong>Copias:</strong> ${printer.print_copies}</p>
              <div class="line"></div>
              <p class="center">Si ves esto, ¡funciona! ✓</p>
              <div class="line"></div>
              <p class="center" style="font-size: 10px;">${new Date().toLocaleString()}</p>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
        toast.success('Prueba enviada a impresión');
      }
    } else {
      toast.info('La prueba de impresoras de red no está disponible aún');
    }
  };

  const canManage = isSuperadmin || isFranquiciado || isEncargado || local.canConfigPrinters;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Impresoras</h1>
          <p className="text-muted-foreground">Configuración de comanderas y tickets</p>
        </div>
        {canManage && (
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Impresora
          </Button>
        )}
      </div>

      {printers.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Printer className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay impresoras configuradas</p>
              <p className="text-sm">Agregá una impresora para imprimir comandas y tickets</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Impresoras Configuradas
            </CardTitle>
            <CardDescription>{printers.length} impresora(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Uso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {printers.map((printer) => {
                  const PurposeIcon = PURPOSE_LABELS[printer.purpose]?.icon || FileText;
                  return (
                    <TableRow key={printer.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{printer.name}</span>
                          {printer.is_default && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                        {printer.type === 'escpos_network' && printer.ip_address && (
                          <p className="text-sm text-muted-foreground">
                            {printer.ip_address}:{printer.port}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {TYPE_LABELS[printer.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <PurposeIcon className="h-4 w-4 text-muted-foreground" />
                          {PURPOSE_LABELS[printer.purpose]?.label}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={printer.is_active}
                          onCheckedChange={() => handleToggleActive(printer)}
                          disabled={!canManage}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestPrint(printer)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          {canManage && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenDialog(printer)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setPrinterToDelete(printer);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold mb-2">Tipos de Impresión</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li><strong>Navegador:</strong> Usa el diálogo de impresión del navegador. Funciona con cualquier impresora instalada en la PC.</li>
                <li><strong>ESC/POS Red:</strong> Impresoras térmicas conectadas a la red local (próximamente).</li>
                <li><strong>Cloud:</strong> Impresoras con servicio cloud como Star CloudPRNT (próximamente).</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPrinter ? 'Editar Impresora' : 'Nueva Impresora'}
            </DialogTitle>
            <DialogDescription>
              Configurá los parámetros de la impresora
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                placeholder="Ej: Impresora Cocina"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v as 'browser' | 'escpos_network' | 'cloud' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="browser">Navegador</SelectItem>
                    <SelectItem value="escpos_network">ESC/POS Red</SelectItem>
                    <SelectItem value="cloud">Cloud</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Uso</Label>
                <Select
                  value={formData.purpose}
                  onValueChange={(v) => setFormData({ ...formData, purpose: v as 'ticket' | 'kitchen' | 'bar' | 'receipt' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ticket">Ticket/Comanda</SelectItem>
                    <SelectItem value="kitchen">Cocina</SelectItem>
                    <SelectItem value="bar">Barra</SelectItem>
                    <SelectItem value="receipt">Factura/Recibo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.type === 'escpos_network' && (
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>IP Address</Label>
                  <Input
                    placeholder="192.168.1.100"
                    value={formData.ip_address}
                    onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Puerto</Label>
                  <Input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 9100 })}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ancho Papel</Label>
                <Select
                  value={formData.paper_width.toString()}
                  onValueChange={(v) => setFormData({ ...formData, paper_width: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58">58mm</SelectItem>
                    <SelectItem value="80">80mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Copias</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={formData.print_copies}
                  onChange={(e) => setFormData({ ...formData, print_copies: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Impresora Predeterminada</Label>
                <p className="text-sm text-muted-foreground">Para este tipo de uso</p>
              </div>
              <Switch
                checked={formData.is_default}
                onCheckedChange={(v) => setFormData({ ...formData, is_default: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Corte Automático</Label>
                <p className="text-sm text-muted-foreground">Cortar papel al terminar</p>
              </div>
              <Switch
                checked={formData.auto_cut}
                onCheckedChange={(v) => setFormData({ ...formData, auto_cut: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingPrinter ? 'Guardar Cambios' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar impresora?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la configuración de "{printerToDelete?.name}". 
              No se podrá deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
