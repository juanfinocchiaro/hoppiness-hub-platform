/**
 * ClosureConfigPage - Configuración de Cierre de Turno desde Mi Marca
 * 
 * Permite gestionar:
 * - Categorías de hamburguesas
 * - Tipos individuales (veggies, ultrasmash)
 * - Extras
 * - Apps de delivery
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, GripVertical, Loader2 } from 'lucide-react';
import type { ClosureConfigItem, ConfigTipo } from '@/types/shiftClosure';

interface ConfigGroup {
  tipo: ConfigTipo;
  titulo: string;
  descripcion: string;
  items: ClosureConfigItem[];
}

import { RequireBrandPermission } from '@/components/guards';

function ClosureConfigPageContent() {
  const queryClient = useQueryClient();
  const [newItemLabel, setNewItemLabel] = useState<Record<string, string>>({});

  // Fetch all config
  const { data: configItems, isLoading } = useQuery({
    queryKey: ['brand-closure-config-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_closure_config')
        .select('*')
        .order('orden');
      
      if (error) throw error;
      return (data || []) as ClosureConfigItem[];
    },
  });

  // Toggle active status
  const toggleMutation = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase
        .from('brand_closure_config')
        .update({ activo, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-closure-config'] });
      toast({ title: 'Configuración actualizada' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    },
  });

  // Add new item
  const addMutation = useMutation({
    mutationFn: async ({ tipo, etiqueta, categoriaPadre }: { tipo: ConfigTipo; etiqueta: string; categoriaPadre?: string }) => {
      const clave = etiqueta.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      const maxOrden = configItems?.filter(i => i.tipo === tipo).reduce((max, i) => Math.max(max, i.orden), 0) || 0;
      
      const { error } = await supabase
        .from('brand_closure_config')
        .insert({
          tipo,
          clave,
          etiqueta,
          categoria_padre: categoriaPadre,
          orden: maxOrden + 1,
          activo: true,
        });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['brand-closure-config'] });
      setNewItemLabel(prev => ({ ...prev, [variables.tipo]: '' }));
      toast({ title: 'Elemento agregado' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    },
  });

  // Delete item
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('brand_closure_config')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-closure-config'] });
      toast({ title: 'Elemento eliminado' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    },
  });

  // Group items by type
  const groups: ConfigGroup[] = [
    {
      tipo: 'categoria_hamburguesa',
      titulo: 'Categorías de Hamburguesas',
      descripcion: 'Categorías principales que se muestran en el formulario de cierre (Clásicas, Originales, etc.)',
      items: configItems?.filter(i => i.tipo === 'categoria_hamburguesa') || [],
    },
    {
      tipo: 'tipo_hamburguesa',
      titulo: 'Tipos Específicos',
      descripcion: 'Hamburguesas individuales dentro de categorías (Veggies → Not American, Ultrasmash → Ultra Cheese)',
      items: configItems?.filter(i => i.tipo === 'tipo_hamburguesa') || [],
    },
    {
      tipo: 'extra',
      titulo: 'Extras',
      descripcion: 'Extras que se suman a la venta (Extra Carne, Extra Not Burger, etc.)',
      items: configItems?.filter(i => i.tipo === 'extra') || [],
    },
    {
      tipo: 'app_delivery',
      titulo: 'Apps de Delivery',
      descripcion: 'Aplicaciones de delivery disponibles para registrar ventas',
      items: configItems?.filter(i => i.tipo === 'app_delivery') || [],
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración de Cierre de Turno</h1>
        <p className="text-muted-foreground">
          Define las categorías de hamburguesas, extras y apps de delivery que aparecen en el formulario de cierre.
        </p>
      </div>

      {groups.map((group) => (
        <Card key={group.tipo}>
          <CardHeader>
            <CardTitle className="text-lg">{group.titulo}</CardTitle>
            <CardDescription>{group.descripcion}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing items */}
            <div className="space-y-2">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    <div>
                      <span className="font-medium">{item.etiqueta}</span>
                      {item.categoria_padre && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {item.categoria_padre}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${item.id}`} className="text-sm text-muted-foreground">
                        Activo
                      </Label>
                      <Switch
                        id={`active-${item.id}`}
                        checked={item.activo}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: item.id, activo: checked })}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(item.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {group.items.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay elementos configurados
                </p>
              )}
            </div>

            <Separator />

            {/* Add new item */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor={`new-${group.tipo}`}>Agregar nuevo</Label>
                <Input
                  id={`new-${group.tipo}`}
                  placeholder="Nombre del elemento..."
                  value={newItemLabel[group.tipo] || ''}
                  onChange={(e) => setNewItemLabel(prev => ({ ...prev, [group.tipo]: e.target.value }))}
                />
              </div>
              <Button
                onClick={() => {
                  if (newItemLabel[group.tipo]?.trim()) {
                    addMutation.mutate({
                      tipo: group.tipo,
                      etiqueta: newItemLabel[group.tipo].trim(),
                    });
                  }
                }}
                disabled={!newItemLabel[group.tipo]?.trim() || addMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function ClosureConfigPage() {
  return (
    <RequireBrandPermission
      permission="canEditBrandConfig"
      noAccessMessage="Solo el Superadmin puede modificar la configuración de cierre."
    >
      <ClosureConfigPageContent />
    </RequireBrandPermission>
  );
}

