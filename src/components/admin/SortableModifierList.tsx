import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Check, X, Loader2 } from 'lucide-react';
import { ModifierOptionCard, ModifierOption, ModifierOptionSkeleton, ModifierEmptyState } from './ModifierOptionCard';

interface SortableModifierListProps {
  options: ModifierOption[];
  type: 'adicional' | 'personalizacion';
  loading?: boolean;
  onToggle: (optionId: string, isActive: boolean) => Promise<void>;
  onEdit: (option: ModifierOption) => void;
  onDelete: (optionId: string) => void;
  onAssign: (option: ModifierOption) => void;
  onAssignAllBurgers?: (optionId: string) => void;
  onReorder: (reorderedOptions: ModifierOption[]) => Promise<void>;
  onAddNew: () => void;
}

export function SortableModifierList({
  options,
  type,
  loading = false,
  onToggle,
  onEdit,
  onDelete,
  onAssign,
  onAssignAllBurgers,
  onReorder,
  onAddNew,
}: SortableModifierListProps) {
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localOptions, setLocalOptions] = useState<ModifierOption[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleEnterReorderMode = () => {
    setLocalOptions([...options]);
    setIsReorderMode(true);
    setHasChanges(false);
  };

  const handleCancelReorder = () => {
    setIsReorderMode(false);
    setLocalOptions([]);
    setHasChanges(false);
  };

  const handleSaveReorder = async () => {
    if (!hasChanges) {
      setIsReorderMode(false);
      return;
    }

    setIsSaving(true);
    try {
      // Update display_order based on new positions
      const reorderedWithNewOrder = localOptions.map((opt, index) => ({
        ...opt,
        display_order: index,
      }));
      await onReorder(reorderedWithNewOrder);
      setIsReorderMode(false);
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLocalOptions((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newArray = arrayMove(items, oldIndex, newIndex);
        setHasChanges(true);
        return newArray;
      });
    }
  };

  const displayOptions = isReorderMode ? localOptions : options;

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <ModifierOptionSkeleton key={i} />)}
      </div>
    );
  }

  if (options.length === 0) {
    return <ModifierEmptyState type={type} onAdd={onAddNew} />;
  }

  return (
    <div className="space-y-3">
      {/* Reorder Mode Controls */}
      <div className="flex items-center justify-end gap-2">
        {isReorderMode ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelReorder}
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveReorder}
              disabled={isSaving || !hasChanges}
              className="min-w-[100px]"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Guardar orden
                </>
              )}
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleEnterReorderMode}
          >
            <ArrowUpDown className="h-4 w-4 mr-1" />
            Editar orden
          </Button>
        )}
      </div>

      {/* List */}
      {isReorderMode ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        >
          <SortableContext
            items={displayOptions.map(o => o.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {displayOptions.map((option) => (
                <ModifierOptionCard
                  key={option.id}
                  option={option}
                  type={type}
                  isReorderMode={true}
                  onToggle={onToggle}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onAssign={onAssign}
                  onAssignAllBurgers={onAssignAllBurgers}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="space-y-2">
          {displayOptions.map((option) => (
            <ModifierOptionCard
              key={option.id}
              option={option}
              type={type}
              isReorderMode={false}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onAssign={onAssign}
              onAssignAllBurgers={onAssignAllBurgers}
            />
          ))}
        </div>
      )}

      {isReorderMode && (
        <p className="text-xs text-muted-foreground text-center pt-2">
          Arrastrá las opciones para reordenarlas
        </p>
      )}
    </div>
  );
}
