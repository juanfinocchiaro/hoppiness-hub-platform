import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Plus, Pencil, GripVertical, Trash2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Category = Tables<'product_categories'>;

interface CategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onCategoriesUpdated: () => void;
}

export function CategoryManager({ open, onOpenChange, categories, onCategoriesUpdated }: CategoryManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [localCategories, setLocalCategories] = useState<Category[]>([]);
  const dragOverIndexRef = useRef<number | null>(null);

  // Sync local categories with props
  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const handleStartEdit = (category: Category) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('product_categories')
        .update({ name: editingName.trim() })
        .eq('id', editingId);
      
      if (error) throw error;
      
      toast.success('Categoría actualizada');
      onCategoriesUpdated();
      handleCancelEdit();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar categoría');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    setSaving(true);
    try {
      const maxOrder = Math.max(...localCategories.map(c => c.display_order || 0), 0);
      
      const { error } = await supabase
        .from('product_categories')
        .insert({
          name: newCategoryName.trim(),
          display_order: maxOrder + 1,
          is_active: true,
        });
      
      if (error) throw error;
      
      toast.success('Categoría creada');
      onCategoriesUpdated();
      setNewCategoryName('');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al crear categoría');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    // Check if category has products
    const { data: products } = await supabase
      .from('products')
      .select('id')
      .eq('category_id', categoryId)
      .limit(1);
    
    if (products && products.length > 0) {
      toast.error('No se puede eliminar una categoría con productos. Mueve los productos primero.');
      return;
    }
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', categoryId);
      
      if (error) throw error;
      
      toast.success('Categoría eliminada');
      onCategoriesUpdated();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar categoría');
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    
    // Make the drag image slightly transparent
    const element = e.currentTarget as HTMLElement;
    setTimeout(() => {
      element.style.opacity = '0.4';
    }, 0);
  };

  const handleDragEnd = async (e: React.DragEvent) => {
    const element = e.currentTarget as HTMLElement;
    element.style.opacity = '1';
    
    // Save the new order if it changed
    if (draggedIndex !== null && dragOverIndexRef.current !== null && draggedIndex !== dragOverIndexRef.current) {
      await saveNewOrder();
    }
    
    setDraggedIndex(null);
    dragOverIndexRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex === null || index === draggedIndex) return;
    
    // Only update if the target index changed
    if (dragOverIndexRef.current !== index) {
      dragOverIndexRef.current = index;
      
      // Reorder the local categories for visual preview
      const newCategories = [...localCategories];
      const [draggedItem] = newCategories.splice(draggedIndex, 1);
      newCategories.splice(index, 0, draggedItem);
      setLocalCategories(newCategories);
      setDraggedIndex(index);
    }
  };

  const saveNewOrder = async () => {
    setSaving(true);
    try {
      const updates = localCategories.map((cat, index) => ({
        id: cat.id,
        display_order: index + 1,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('product_categories')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
        
        if (error) throw error;
      }

      toast.success('Orden actualizado');
      onCategoriesUpdated();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al reordenar categorías');
      // Revert to original order on error
      setLocalCategories(categories);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Categorías de Productos</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Nueva categoría */}
          <div className="flex gap-2">
            <Input
              placeholder="Nombre de nueva categoría..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
            />
            <Button 
              onClick={handleCreateCategory} 
              disabled={!newCategoryName.trim() || saving}
              size="icon"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Lista de categorías */}
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {localCategories.map((category, index) => (
              <div 
                key={category.id}
                draggable={editingId !== category.id}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                className={`flex items-center gap-2 p-3 bg-muted/50 rounded-lg transition-all duration-200 ${
                  draggedIndex === index ? 'shadow-lg ring-2 ring-primary/50 scale-[1.02]' : ''
                }`}
                style={{
                  transform: draggedIndex === index ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                <GripVertical 
                  className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0 hover:text-foreground transition-colors" 
                />
                
                {editingId === category.id ? (
                  <div className="flex-1 flex gap-2">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      autoFocus
                      className="h-8"
                    />
                    <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                      Guardar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 font-medium">{category.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleStartEdit(category)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>

          {localCategories.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay categorías. Crea una nueva arriba.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
