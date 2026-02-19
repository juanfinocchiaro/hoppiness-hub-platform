/**
 * PrintConfigPage - Configuración de salidas de impresión (ticket, delivery, backup)
 */
import { useParams } from 'react-router-dom';
import { Settings, Printer } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrintConfig } from '@/hooks/usePrintConfig';
import { useBranchPrinters } from '@/hooks/useBranchPrinters';
import { useState, useEffect } from 'react';

export default function PrintConfigPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: config, isLoading: configLoading, upsert } = usePrintConfig(branchId!);
  const { data: printers, isLoading: printersLoading } = useBranchPrinters(branchId!);

  const [form, setForm] = useState({
    ticket_printer_id: null as string | null,
    ticket_enabled: false,
    ticket_trigger: 'on_payment',
    delivery_printer_id: null as string | null,
    delivery_enabled: false,
    backup_printer_id: null as string | null,
    backup_enabled: false,
    reprint_requires_pin: true,
  });

  useEffect(() => {
    if (config) {
      setForm({
        ticket_printer_id: config.ticket_printer_id,
        ticket_enabled: config.ticket_enabled,
        ticket_trigger: config.ticket_trigger,
        delivery_printer_id: config.delivery_printer_id,
        delivery_enabled: config.delivery_enabled,
        backup_printer_id: config.backup_printer_id,
        backup_enabled: config.backup_enabled,
        reprint_requires_pin: config.reprint_requires_pin,
      });
    }
  }, [config]);

  const handleSave = () => {
    upsert.mutate(form);
  };

  if (configLoading || printersLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const printerOptions = printers?.filter((p) => p.is_active) || [];
  const noPrinters = printerOptions.length === 0;

  const PrinterSelect = ({ value, onChange, disabled }: { value: string | null; onChange: (v: string | null) => void; disabled?: boolean }) => (
    <Select
      value={value || 'none'}
      onValueChange={(v) => onChange(v === 'none' ? null : v)}
      disabled={disabled || noPrinters}
    >
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Sin impresora</SelectItem>
        {printerOptions.map((p) => (
          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración de Impresión"
        subtitle="Configurá qué se imprime y cuándo"
        icon={<Settings className="w-5 h-5" />}
      />

      {noPrinters && (
        <Card className="border-border bg-muted">
          <CardContent className="p-4 flex items-center gap-3">
            <Printer className="w-5 h-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No hay impresoras configuradas. Agregá una en la sección de Impresoras primero.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Ticket Cliente */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              🧾 Ticket Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.ticket_enabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, ticket_enabled: v }))}
                disabled={noPrinters}
              />
              <Label>Imprimir ticket al cliente</Label>
            </div>
            {form.ticket_enabled && (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground">Impresora</Label>
                  <PrinterSelect
                    value={form.ticket_printer_id}
                    onChange={(v) => setForm((f) => ({ ...f, ticket_printer_id: v }))}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Imprimir cuando...</Label>
                  <Select
                    value={form.ticket_trigger}
                    onValueChange={(v) => setForm((f) => ({ ...f, ticket_trigger: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on_payment">Al cobrar</SelectItem>
                      <SelectItem value="on_confirm">Al confirmar pedido</SelectItem>
                      <SelectItem value="on_ready">Al marcar listo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Delivery */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              🛵 Comanda Delivery
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.delivery_enabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, delivery_enabled: v }))}
                disabled={noPrinters}
              />
              <Label>Imprimir comanda de delivery</Label>
            </div>
            {form.delivery_enabled && (
              <div>
                <Label className="text-xs text-muted-foreground">Impresora</Label>
                <PrinterSelect
                  value={form.delivery_printer_id}
                  onChange={(v) => setForm((f) => ({ ...f, delivery_printer_id: v }))}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Backup */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              📋 Comanda Backup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.backup_enabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, backup_enabled: v }))}
                disabled={noPrinters}
              />
              <Label>Imprimir comanda completa como respaldo</Label>
            </div>
            {form.backup_enabled && (
              <div>
                <Label className="text-xs text-muted-foreground">Impresora</Label>
                <PrinterSelect
                  value={form.backup_printer_id}
                  onChange={(v) => setForm((f) => ({ ...f, backup_printer_id: v }))}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seguridad */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              🔒 Seguridad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.reprint_requires_pin}
                onCheckedChange={(v) => setForm((f) => ({ ...f, reprint_requires_pin: v }))}
              />
              <Label>Reimpresión requiere PIN de encargado</Label>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={upsert.isPending}>
          Guardar configuración
        </Button>
      </div>
    </div>
  );
}
