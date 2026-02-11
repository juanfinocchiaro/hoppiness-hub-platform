import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Pencil, Trash2, GripVertical, Check, X } from 'lucide-react';
import { useMenuCategorias, useMenuCategoriaMutations } from '@/hooks/useMenu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';

export default function CategoriasCartaPage() {
  const { data: categorias, isLoading } = useMenuCategorias();
  const { create, update, softDelete } = useMenuCategoriaMutations();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNombre, setEditingNombre] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [deleting, setDeleting] = useState<any>(null);

  const handleCreate = async () => {
    if (!newNombre.trim()) return;
    await create.mutateAsync({ nombre: newNombre.trim(), orden: (categorias?.length || 0) + 1 });
    setNewNombre('');
    setShowNew(false);
  };

  const handleUpdate = async () => {
    if (!editingId || !editingNombre.trim()) return;
    await update.mutateAsync({ id: editingId, data: { nombre: editingNombre.trim() } });
    setEditingId(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Categorías de la Carta" subtitle="Organización del menú para los clientes" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Categorías de la Carta" subtitle="Organización del menú para los clientes" />

      <div className="flex justify-end">
        <Button onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nueva Categoría
        </Button>
      </div>

      {showNew && (
        <Card className="border-dashed border-primary/40">
          <CardContent className="p-4 flex items-center gap-3">
            <Input
              value={newNombre}
              onChange={(e) => setNewNombre(e.target.value)}
              placeholder="Nombre de la categoría..."
              className="max-w-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') { setShowNew(false); setNewNombre(''); }
              }}
            />
            <Button size="sm" onClick={handleCreate} disabled={!newNombre.trim() || create.isPending}>
              <Check className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowNew(false); setNewNombre(''); }}>
              <X className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {(!categorias || categorias.length === 0) && !showNew ? (
        <Card>
          <CardContent className="py-16">
            <EmptyState icon={GripVertical} title="Sin categorías" description="Creá categorías para organizar la carta" />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {categorias?.map((cat: any) => (
            <Card key={cat.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  {editingId === cat.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingNombre}
                        onChange={(e) => setEditingNombre(e.target.value)}
                        className="w-48"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdate();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <Button size="sm" variant="ghost" onClick={handleUpdate}>
                        <Check className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <span className="font-medium">{cat.nombre}</span>
                  )}
                </div>
                {editingId !== cat.id && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingId(cat.id); setEditingNombre(cat.nombre); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(cat)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={() => setDeleting(null)}
        title="Eliminar categoría"
        description={`¿Eliminar "${deleting?.nombre}"? Los items de esta categoría quedarán sin categoría.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={async () => {
          await softDelete.mutateAsync(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}
