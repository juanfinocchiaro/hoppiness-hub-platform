/**
 * PrintersConfigPage - CRUD de impresoras por local
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Printer, Plus, Trash2, TestTube, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/states/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useBranchPrinters, type BranchPrinter } from '@/hooks/useBranchPrinters';
import { usePrinting } from '@/hooks/usePrinting';

const DEFAULT_PRINTER = {
  name: '',
  connection_type: 'network',
  ip_address: '',
  port: 9100,
  paper_width: 80,
  is_active: true,
};

export default function PrintersConfigPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: printers, isLoading, create, update, remove } = useBranchPrinters(branchId!);
  const { printTest } = usePrinting(branchId!);
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
      create.mutate({ branch_id: branchId!, ...form } as any, { onSuccess: () => setModalOpen(false) });
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
    <div className="space-y-6">
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
