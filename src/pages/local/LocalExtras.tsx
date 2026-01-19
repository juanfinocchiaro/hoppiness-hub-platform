import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, ChefHat, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const AVAILABILITY_REASONS = [
  { value: 'sin_stock', label: 'Sin stock' },
  { value: 'rotura', label: 'Rotura de equipo' },
  { value: 'falta_insumo', label: 'Falta de insumo' },
  { value: 'decision_comercial', label: 'Decisión comercial' },
  { value: 'otro', label: 'Otro' },
];

const getReasonLabel = (reason: string | null) => {
  return AVAILABILITY_REASONS.find(r => r.value === reason)?.label || reason || 'Desconocido';
};

interface AvailabilityLog {
  id: string;
  item_type: 'product' | 'modifier';
  item_id: string;
  new_state: boolean;
  reason: string | null;
  notes: string | null;
  until_date: string | null;
  created_at: string;
}

interface ModifierGroup {
  id: string;
  name: string;
  description: string | null;
}

interface ModifierOptionAvailability {
  id: string;
  modifier_option_id: string;
  is_available: boolean;
  is_enabled_by_brand: boolean;
  option: {
    id: string;
    name: string;
    price_adjustment: number;
    group_id: string;
    is_enabled_by_brand: boolean;
  };
  lastLog?: AvailabilityLog;
}

export default function LocalExtras() {
  const { branchId } = useParams<{ branchId: string }>();
  
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [modifierOptions, setModifierOptions] = useState<ModifierOptionAvailability[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Availability dialog state
  const [availabilityDialog, setAvailabilityDialog] = useState<{
    open: boolean;
    itemId: string;
    currentValue: boolean;
    itemName: string;
  } | null>(null);
  const [availabilityReason, setAvailabilityReason] = useState('');
  const [availabilityNotes, setAvailabilityNotes] = useState('');
  const [availabilityUntil, setAvailabilityUntil] = useState('');

  useEffect(() => {
    if (branchId) {
      fetchData();
    }
  }, [branchId]);

  const fetchData = async () => {
    try {
      const [modifierGroupsRes, branchModifiersRes, logsRes] = await Promise.all([
        supabase
          .from('modifier_groups')
          .select('id, name, description')
          .eq('is_active', true)
          .order('display_order'),
        supabase
          .from('branch_modifier_options')
          .select(`
            id,
            modifier_option_id,
            is_available,
            is_enabled_by_brand,
            option:modifier_options(id, name, price_adjustment, group_id, is_enabled_by_brand)
          `)
          .eq('branch_id', branchId!),
        supabase
          .from('availability_logs')
          .select('*')
          .eq('branch_id', branchId!)
          .eq('item_type', 'modifier')
          .order('created_at', { ascending: false })
      ]);

      // Create a map of latest logs per item
      const logsMap = new Map<string, AvailabilityLog>();
      (logsRes.data || []).forEach(log => {
        const key = `modifier-${log.item_id}`;
        if (!logsMap.has(key)) {
          logsMap.set(key, log as AvailabilityLog);
        }
      });

      if (modifierGroupsRes.data) {
        setModifierGroups(modifierGroupsRes.data);
        setExpandedGroups(new Set(modifierGroupsRes.data.map(g => g.id)));
      }

      if (branchModifiersRes.data) {
        const validModifiers = branchModifiersRes.data
          .filter(m => m.option !== null && m.option.is_enabled_by_brand)
          .map(m => ({
            ...m,
            is_enabled_by_brand: m.is_enabled_by_brand,
            lastLog: logsMap.get(`modifier-${m.modifier_option_id}`)
          })) as ModifierOptionAvailability[];
        setModifierOptions(validModifiers);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleAvailabilityToggle = (itemId: string, currentValue: boolean, itemName: string) => {
    if (currentValue) {
      setAvailabilityDialog({ open: true, itemId, currentValue, itemName });
    } else {
      executeToggle(itemId, currentValue, null, null, null);
    }
  };

  const executeToggle = async (
    modifierId: string,
    currentValue: boolean,
    reason: string | null,
    notes: string | null,
    untilDate: string | null
  ) => {
    setUpdating(modifierId);
    try {
      const { error } = await supabase
        .from('branch_modifier_options')
        .update({ is_available: !currentValue })
        .eq('id', modifierId);

      if (error) throw error;

      if (reason) {
        const modifier = modifierOptions.find(m => m.id === modifierId);
        await supabase.from('availability_logs').insert({
          branch_id: branchId,
          item_type: 'modifier',
          item_id: modifier?.modifier_option_id,
          new_state: !currentValue,
          reason: reason,
          notes: notes,
          until_date: untilDate || null,
        });
      }

      setModifierOptions(prev =>
        prev.map(m =>
          m.id === modifierId ? { ...m, is_available: !currentValue } : m
        )
      );

      toast.success(!currentValue ? 'Extra activado' : 'Extra desactivado');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar');
    } finally {
      setUpdating(null);
    }
  };

  const handleConfirmAvailability = () => {
    if (!availabilityDialog || !availabilityReason) {
      toast.error('Seleccioná un motivo');
      return;
    }

    executeToggle(
      availabilityDialog.itemId,
      availabilityDialog.currentValue,
      availabilityReason,
      availabilityNotes || null,
      availabilityUntil || null
    );

    setAvailabilityDialog(null);
    setAvailabilityReason('');
    setAvailabilityNotes('');
    setAvailabilityUntil('');
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const filteredModifiers = modifierOptions.filter(m =>
    m.option.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const modifiersByGroup = modifierGroups.map(group => ({
    group,
    options: filteredModifiers.filter(m => m.option.group_id === group.id)
  })).filter(g => g.options.length > 0);

  const unavailableCount = modifierOptions.filter(m => !m.is_available).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Extras / Modificadores</h1>
          <p className="text-muted-foreground">Gestión de disponibilidad de extras</p>
        </div>
        {unavailableCount > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <ChefHat className="h-3 w-3" />
            {unavailableCount} sin stock
          </Badge>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar extra o modificador..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-4">
        {modifiersByGroup.map(({ group, options }) => (
          <Collapsible
            key={group.id}
            open={expandedGroups.has(group.id)}
            onOpenChange={() => toggleGroup(group.id)}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
              <div className="flex items-center gap-2">
                {expandedGroups.has(group.id) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <ChefHat className="h-4 w-4 text-primary" />
                <span className="font-semibold">{group.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {options.length}
                </Badge>
              </div>
              {options.some(o => !o.is_available) && (
                <Badge variant="destructive" className="text-xs">
                  {options.filter(o => !o.is_available).length} sin stock
                </Badge>
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {options.map((item) => (
                <Card 
                  key={item.id} 
                  className={`transition-colors ${!item.is_available ? 'bg-destructive/5 border-destructive/20' : ''}`}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-medium ${!item.is_available ? 'text-muted-foreground line-through' : ''}`}>
                          {item.option.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.option.price_adjustment > 0 
                            ? `+$${item.option.price_adjustment.toLocaleString('es-AR')}` 
                            : 'Sin cargo'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {!item.is_available && item.lastLog && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-xs cursor-help gap-1">
                                <Info className="h-3 w-3" />
                                {getReasonLabel(item.lastLog.reason)}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                {formatDistanceToNow(new Date(item.lastLog.created_at), { addSuffix: true, locale: es })}
                                {item.lastLog.until_date && (
                                  <> · Hasta {format(new Date(item.lastLog.until_date), 'dd/MM HH:mm')}</>
                                )}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {!item.is_available && !item.lastLog && (
                          <Badge variant="destructive" className="text-xs">Sin stock</Badge>
                        )}
                        <Switch
                          checked={item.is_available}
                          onCheckedChange={() => handleAvailabilityToggle(item.id, item.is_available, item.option.name)}
                          disabled={updating === item.id}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ))}

        {modifiersByGroup.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No se encontraron extras o modificadores
            </CardContent>
          </Card>
        )}
      </div>

      {/* Availability Reason Dialog */}
      <Dialog open={!!availabilityDialog?.open} onOpenChange={() => setAvailabilityDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desactivar extra</DialogTitle>
            <DialogDescription>
              ¿Por qué desactivás "{availabilityDialog?.itemName}"?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motivo *</Label>
              <Select value={availabilityReason} onValueChange={setAvailabilityReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar motivo" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABILITY_REASONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea 
                value={availabilityNotes}
                onChange={(e) => setAvailabilityNotes(e.target.value)}
                placeholder="Agregar detalles..."
              />
            </div>
            <div>
              <Label>Hasta cuándo (opcional)</Label>
              <Input 
                type="datetime-local"
                value={availabilityUntil}
                onChange={(e) => setAvailabilityUntil(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAvailabilityDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmAvailability} disabled={!availabilityReason}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
