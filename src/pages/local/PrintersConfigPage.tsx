/**
 * PrintersConfigPage - Configuración de impresoras con detección automática de QZ Tray
 *
 * Estado 1: Sistema no detectado → muestra instalador
 * Estado 2: Sistema listo → CRUD de impresoras con test directo
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Printer, Plus, Trash2, TestTube, Pencil, Download, CheckCircle2,
  Loader2, AlertCircle, HelpCircle, ChevronDown,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EmptyState } from '@/components/ui/states/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useBranchPrinters, type BranchPrinter } from '@/hooks/useBranchPrinters';
import { usePrinting } from '@/hooks/usePrinting';
import { detectQZ } from '@/lib/qz-print';

type SystemState = 'checking' | 'not_available' | 'blocked' | 'just_detected' | 'ready';

const DEFAULT_PRINTER = {
  name: '',
  connection_type: 'network',
  ip_address: '',
  port: 9100,
  paper_width: 80,
  is_active: true,
};

/* ─────────── Setup Screen (State 1) ─────────── */
function SetupScreen({ state }: { state: 'checking' | 'not_available' | 'blocked' }) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/instalar-impresoras.bat';
    link.download = 'instalar-impresoras.bat';
    link.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Impresoras"
        subtitle="Configurá las impresoras térmicas de tu local"
        icon={<Printer className="w-5 h-5" />}
      />

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Printer className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">Configuración de impresoras</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Para imprimir tickets desde esta computadora necesitás instalar un pequeño programa. Solo se hace una vez.
            </p>
          </div>

          <div className="space-y-3 max-w-md mx-auto">
            {[
              'Descargá el instalador',
              'Abrí el archivo descargado (doble clic)',
              'Esperá a que termine — esta pantalla se actualiza sola',
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </span>
                <p className="text-sm pt-1">{text}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-4">
            <Button size="lg" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" /> Descargar instalador
            </Button>

            {state === 'checking' && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Verificando...
              </div>
            )}

            {state === 'not_available' && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Esperando instalación...
              </div>
            )}

            {state === 'blocked' && (
              <Card className="border-destructive/50 bg-destructive/5 max-w-md">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium text-sm">Se detectó el sistema, pero necesita tu permiso</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Buscá una ventana emergente en la barra de tareas y hacé clic en <strong>"Permitir"</strong> o <strong>"Allow"</strong>.
                    Marcá la casilla "Recordar esta decisión" para no tener que hacerlo de nuevo.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between text-muted-foreground">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" /> Solución de problemas
            </span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">Windows muestra advertencia de seguridad</p>
              <p>Hacé clic en "Más información" y luego "Ejecutar de todos modos". Es seguro.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">El antivirus lo bloquea</p>
              <p>Agregá una excepción para "QZ Tray" en tu antivirus.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Ya lo instalé pero sigue sin detectar</p>
              <p>Buscá "QZ Tray" en el menú inicio y abrilo manualmente.</p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/* ─────────── Just Detected Transition ─────────── */
function JustDetectedScreen() {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-300">
      <CheckCircle2 className="w-16 h-16 text-primary mb-4" />
      <h2 className="text-xl font-semibold">¡Instalación detectada!</h2>
      <p className="text-muted-foreground mt-1">Preparando configuración de impresoras...</p>
    </div>
  );
}

/* ─────────── Ready Screen (State 2) ─────────── */
function ReadyScreen({
  branchId,
  printers,
  isLoading,
  printTest,
  create,
  update,
  remove,
}: {
  branchId: string;
  printers: BranchPrinter[] | undefined;
  isLoading: boolean;
  printTest: (p: BranchPrinter) => void;
  create: any;
  update: any;
  remove: any;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BranchPrinter | null>(null);
  const [form, setForm] = useState(DEFAULT_PRINTER);

  const openCreate = () => {
    setEditing(null);
    setForm(DEFAULT_PRINTER);
    setModalOpen(true);
  };

  const openEdit = (p: BranchPrinter) => {
    setEditing(p);
    setForm({
      name: p.name,
      connection_type: p.connection_type,
      ip_address: p.ip_address || '',
      port: p.port,
      paper_width: p.paper_width,
      is_active: p.is_active,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.ip_address) return;
    if (editing) {
      update.mutate({ id: editing.id, ...form }, { onSuccess: () => setModalOpen(false) });
    } else {
      create.mutate({ branch_id: branchId, ...form } as any, { onSuccess: () => setModalOpen(false) });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Impresoras"
        subtitle="Configurá las impresoras térmicas de tu local"
        icon={<Printer className="w-5 h-5" />}
        actions={
          <Button onClick={openCreate} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Nueva impresora
          </Button>
        }
      />

      {/* Status badge */}
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-primary" />
        <span className="text-sm font-medium text-primary">
          Sistema de impresión listo
        </span>
      </div>

      {!printers?.length ? (
        <EmptyState
          icon={Printer}
          title="Sin impresoras"
          description="Agregá una impresora para empezar a imprimir comandas y tickets."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {printers.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Printer className="w-5 h-5 text-muted-foreground" />
                    <span className="font-semibold">{p.name}</span>
                  </div>
                  <Badge variant={p.is_active ? 'default' : 'secondary'}>
                    {p.is_active ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>IP: {p.ip_address}:{p.port}</p>
                  <p>Papel: {p.paper_width}mm</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => printTest(p)}>
                    <TestTube className="w-3.5 h-3.5 mr-1" /> Test
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => remove.mutate(p.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Help Section */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between text-muted-foreground">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" /> Ayuda
            </span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">¿Cómo encuentro la IP de mi impresora?</p>
              <p>Imprimí la página de configuración de red de tu impresora (generalmente manteniendo un botón al encenderla). Ahí aparece la IP actual.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">¿Qué puerto uso?</p>
              <p>El puerto estándar es 9100. Si no funciona, probá 9101 o 9102.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">La impresora no imprime</p>
              <p>La impresora debe estar conectada por cable de red al mismo router que esta computadora. Verificá que esté encendida y en la misma subred.</p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Printer Form Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar impresora' : 'Nueva impresora'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Impresora Cocina"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>IP</Label>
                <Input
                  value={form.ip_address}
                  onChange={(e) => setForm((f) => ({ ...f, ip_address: e.target.value }))}
                  placeholder="192.168.1.100"
                />
              </div>
              <div>
                <Label>Puerto</Label>
                <Input
                  type="number"
                  value={form.port}
                  onChange={(e) => setForm((f) => ({ ...f, port: parseInt(e.target.value) || 9100 }))}
                />
              </div>
            </div>
            <div>
              <Label>Ancho de papel</Label>
              <Select
                value={String(form.paper_width)}
                onValueChange={(v) => setForm((f) => ({ ...f, paper_width: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="80">80mm</SelectItem>
                  <SelectItem value="58">58mm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
              <Label>Activa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.ip_address}>
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────── Main Page ─────────── */
export default function PrintersConfigPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: printers, isLoading, create, update, remove } = useBranchPrinters(branchId!);
  const { printTest } = usePrinting(branchId!);
  const [systemState, setSystemState] = useState<SystemState>('checking');

  const checkSystem = useCallback(async () => {
    const result = await detectQZ();
    if (result.available) {
      if (systemState === 'not_available' || systemState === 'blocked') {
        // Transition: just detected after waiting
        setSystemState('just_detected');
        setTimeout(() => setSystemState('ready'), 1500);
      } else if (systemState === 'checking') {
        setSystemState('ready');
      }
    } else {
      if (systemState === 'checking' || systemState === 'not_available' || systemState === 'blocked') {
        setSystemState(result.error === 'blocked' ? 'blocked' : 'not_available');
      }
    }
  }, [systemState]);

  useEffect(() => {
    checkSystem();

    // Poll every 3s while not ready
    const interval = setInterval(() => {
      if (systemState !== 'ready' && systemState !== 'just_detected') {
        checkSystem();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [systemState, checkSystem]);

  if (systemState === 'checking' || systemState === 'not_available' || systemState === 'blocked') {
    return <SetupScreen state={systemState} />;
  }

  if (systemState === 'just_detected') {
    return <JustDetectedScreen />;
  }

  return (
    <ReadyScreen
      branchId={branchId!}
      printers={printers}
      isLoading={isLoading}
      printTest={printTest}
      create={create}
      update={update}
      remove={remove}
    />
  );
}
