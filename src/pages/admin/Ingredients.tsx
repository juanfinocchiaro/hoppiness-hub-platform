import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Package,
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  DollarSign,
  AlertTriangle,
  ArrowRightLeft,
  Check,
  X,
  AlertCircle,
  PackageX,
  Settings,
  CircleDashed,
} from 'lucide-react';
import { toast } from 'sonner';
import { handleError } from '@/lib/errorHandler';

interface Ingredient {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  purchase_unit: string | null;
  purchase_unit_qty: number;
  usage_unit: string | null;
  cost_per_unit: number;
  cost_updated_at: string | null;
  min_stock: number;
  lead_time_days: number;
  safety_stock_days: number;
  avg_daily_consumption: number;
  category: string | null; // deprecated, use category_id
  category_id: string | null;
  is_active: boolean;
  notes: string | null;
}

interface UnitConversion {
  id: string;
  ingredient_id: string;
  from_unit: string;
  to_unit: string;
  conversion_factor: number;
  is_purchase_to_usage: boolean;
}

interface IngredientCategory {
  id: string;
  name: string;
  cost_category: string;
  display_order: number;
}

// Calculated dynamic min stock
const calculateDynamicMinStock = (ingredient: Ingredient): number => {
  const avgDaily = ingredient.avg_daily_consumption || 0;
  const leadTime = ingredient.lead_time_days || 2;
  const safetyDays = ingredient.safety_stock_days || 1;
  return avgDaily * (leadTime + safetyDays);
};

const UNITS = [
  { value: 'u', label: 'Unidad' },
  { value: 'kg', label: 'Kilogramo' },
  { value: 'g', label: 'Gramo' },
  { value: 'l', label: 'Litro' },
  { value: 'ml', label: 'Mililitro' },
  { value: 'docena', label: 'Docena' },
  { value: 'pack', label: 'Pack' },
  { value: 'caja', label: 'Caja' },
  { value: 'bolsa', label: 'Bolsa' },
  { value: 'feta', label: 'Feta' },
];

const getUnitLabel = (value: string) => UNITS.find(u => u.value === value)?.label || value;

const formatCurrency = (price: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

type FilterType = 'all' | 'no-equiv' | 'no-cost' | 'no-min' | 'alert';

export default function Ingredients() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [conversions, setConversions] = useState<UnitConversion[]>([]);
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  
  // Inline equivalence editing
  const [editingEquivId, setEditingEquivId] = useState<string | null>(null);
  const [equivFromUnit, setEquivFromUnit] = useState('');
  const [equivFactor, setEquivFactor] = useState('');
  const [equivToUnit, setEquivToUnit] = useState('');
  const [savingEquiv, setSavingEquiv] = useState(false);

  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; ingredient: Ingredient | null }>({ 
    open: false, 
    ingredient: null 
  });

  // Form state
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formUsageUnit, setFormUsageUnit] = useState('u');
  const [formPurchaseUnit, setFormPurchaseUnit] = useState('u');
  const [formPurchaseUnitQty, setFormPurchaseUnitQty] = useState('1');
  const [formCost, setFormCost] = useState('');
  const [formLeadTimeDays, setFormLeadTimeDays] = useState('2');
  const [formSafetyDays, setFormSafetyDays] = useState('1');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [ingredientsRes, categoriesRes, conversionsRes] = await Promise.all([
      supabase.from('ingredients').select('*').order('name'),
      supabase.from('ingredient_categories').select('*').eq('is_active', true).order('display_order'),
      supabase.from('ingredient_unit_conversions').select('*'),
    ]);

    if (ingredientsRes.data) setIngredients(ingredientsRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    if (conversionsRes.data) setConversions(conversionsRes.data);
    setLoading(false);
  };

  // Get conversion for an ingredient
  const getConversion = (ingredientId: string): UnitConversion | undefined => {
    return conversions.find(c => c.ingredient_id === ingredientId && c.is_purchase_to_usage);
  };

  // Calculate cost per usage unit using conversion
  const getCostPerUsageUnit = (ingredient: Ingredient): { costPurchase: number; costUsage: number; hasConversion: boolean } => {
    const conv = getConversion(ingredient.id);
    if (conv) {
      const costUsage = ingredient.cost_per_unit / conv.conversion_factor;
      return { costPurchase: ingredient.cost_per_unit, costUsage, hasConversion: true };
    }
    return { costPurchase: ingredient.cost_per_unit, costUsage: ingredient.cost_per_unit, hasConversion: false };
  };

  // KPI calculations
  const kpis = useMemo(() => {
    const active = ingredients.filter(i => i.is_active);
    const withConversion = active.filter(i => conversions.some(c => c.ingredient_id === i.id));
    const withCost = active.filter(i => i.cost_per_unit > 0);
    const withMinConfig = active.filter(i => i.avg_daily_consumption > 0);
    const inAlert = active.filter(i => {
      const minStock = calculateDynamicMinStock(i);
      return minStock > 0 && i.min_stock > 0 && i.min_stock < minStock;
    });
    
    const avgCost = active.length > 0 
      ? active.reduce((sum, i) => sum + (i.cost_per_unit || 0), 0) / active.length 
      : 0;

    return {
      total: active.length,
      avgCost,
      withConversion: withConversion.length,
      withoutConversion: active.length - withConversion.length,
      withCost: withCost.length,
      withoutCost: active.length - withCost.length,
      withMinConfig: withMinConfig.length,
      withoutMinConfig: active.length - withMinConfig.length,
      inAlert: inAlert.length,
      categories: categories.length,
    };
  }, [ingredients, conversions, categories]);

  // Filtered ingredients
  const filteredIngredients = useMemo(() => {
    return ingredients.filter(i => {
      if (!i.is_active) return false;
      
      const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.sku?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || i.category_id === categoryFilter;
      
      let matchesStatus = true;
      if (statusFilter === 'no-equiv') {
        matchesStatus = !conversions.some(c => c.ingredient_id === i.id);
      } else if (statusFilter === 'no-cost') {
        matchesStatus = !i.cost_per_unit || i.cost_per_unit === 0;
      } else if (statusFilter === 'no-min') {
        matchesStatus = !i.avg_daily_consumption || i.avg_daily_consumption === 0;
      } else if (statusFilter === 'alert') {
        const minStock = calculateDynamicMinStock(i);
        matchesStatus = minStock > 0 && i.min_stock > 0 && i.min_stock < minStock;
      }
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [ingredients, conversions, search, categoryFilter, statusFilter]);

  const resetForm = () => {
    setFormName('');
    setFormSku('');
    setFormUsageUnit('u');
    setFormPurchaseUnit('u');
    setFormPurchaseUnitQty('1');
    setFormCost('');
    setFormLeadTimeDays('2');
    setFormSafetyDays('1');
    setFormCategoryId('');
    setFormNotes('');
  };

  const openEditDialog = (ingredient: Ingredient) => {
    setEditing(ingredient);
    setFormName(ingredient.name);
    setFormSku(ingredient.sku || '');
    setFormUsageUnit(ingredient.usage_unit || ingredient.unit || 'u');
    setFormPurchaseUnit(ingredient.purchase_unit || ingredient.unit || 'u');
    setFormPurchaseUnitQty(ingredient.purchase_unit_qty?.toString() || '1');
    setFormCost(ingredient.cost_per_unit?.toString() || '');
    setFormLeadTimeDays(ingredient.lead_time_days?.toString() || '2');
    setFormSafetyDays(ingredient.safety_stock_days?.toString() || '1');
    setFormCategoryId(ingredient.category_id || '');
    setFormNotes(ingredient.notes || '');
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    setSaving(true);
    try {
      // Get category name for backward compat
      const selectedCategory = categories.find(c => c.id === formCategoryId);
      
      const data = {
        name: formName.trim(),
        sku: formSku.trim() || null,
        unit: formUsageUnit,
        usage_unit: formUsageUnit,
        purchase_unit: formPurchaseUnit,
        purchase_unit_qty: parseFloat(formPurchaseUnitQty) || 1,
        cost_per_unit: parseFloat(formCost) || 0,
        lead_time_days: parseInt(formLeadTimeDays) || 2,
        safety_stock_days: parseInt(formSafetyDays) || 1,
        category_id: formCategoryId || null,
        category: selectedCategory?.name || null, // keep in sync for compat
        notes: formNotes.trim() || null,
      };

      if (editing) {
        const { error } = await supabase
          .from('ingredients')
          .update(data)
          .eq('id', editing.id);
        if (error) throw error;
        toast.success('Ingrediente actualizado');
      } else {
        const { error } = await supabase
          .from('ingredients')
          .insert(data);
        if (error) throw error;
        toast.success('Ingrediente creado');
      }

      setShowDialog(false);
      setEditing(null);
      resetForm();
      fetchData();
    } catch (error) {
      handleError(error, { userMessage: 'Error al guardar', context: 'Ingredients.handleSave' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.ingredient) return;

    const { error } = await supabase
      .from('ingredients')
      .update({ is_active: false })
      .eq('id', deleteDialog.ingredient.id);

    if (error) {
      toast.error('Error al eliminar');
    } else {
      toast.success(`"${deleteDialog.ingredient.name}" desactivado`);
      fetchData();
    }
    setDeleteDialog({ open: false, ingredient: null });
  };

  // Inline equivalence handlers
  const startEditingEquiv = (ingredient: Ingredient) => {
    const conv = getConversion(ingredient.id);
    setEditingEquivId(ingredient.id);
    setEquivFromUnit(conv?.from_unit || ingredient.purchase_unit || 'pack');
    setEquivFactor(conv?.conversion_factor?.toString() || '');
    setEquivToUnit(conv?.to_unit || ingredient.usage_unit || 'u');
  };

  const cancelEditingEquiv = () => {
    setEditingEquivId(null);
    setEquivFromUnit('');
    setEquivFactor('');
    setEquivToUnit('');
  };

  const saveEquivalence = async (ingredientId: string) => {
    if (!equivFactor || parseFloat(equivFactor) <= 0) {
      toast.error('Ingresá un factor válido');
      return;
    }

    if (equivFromUnit === equivToUnit) {
      toast.error('Las unidades deben ser diferentes');
      return;
    }

    setSavingEquiv(true);
    try {
      const existingConv = getConversion(ingredientId);
      
      if (existingConv) {
        const { error } = await supabase
          .from('ingredient_unit_conversions')
          .update({
            from_unit: equivFromUnit,
            to_unit: equivToUnit,
            conversion_factor: parseFloat(equivFactor),
          })
          .eq('id', existingConv.id);
        if (error) throw error;
      } else {
        // First unset any existing primary
        await supabase
          .from('ingredient_unit_conversions')
          .update({ is_purchase_to_usage: false })
          .eq('ingredient_id', ingredientId);

        const { error } = await supabase
          .from('ingredient_unit_conversions')
          .insert({
            ingredient_id: ingredientId,
            from_unit: equivFromUnit,
            to_unit: equivToUnit,
            conversion_factor: parseFloat(equivFactor),
            is_purchase_to_usage: true,
          });
        if (error) throw error;
      }

      toast.success('Equivalencia guardada');
      cancelEditingEquiv();
      fetchData();
    } catch (error: any) {
      handleError(error, { userMessage: 'Error al guardar equivalencia', context: 'Ingredients.handleSaveEquivalence' });
    } finally {
      setSavingEquiv(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setStatusFilter('all');
  };

  const hasActiveFilters = search || categoryFilter !== 'all' || statusFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ingredientes</h1>
          <p className="text-muted-foreground">Gestión de insumos y materias primas</p>
        </div>
        <Button onClick={() => { resetForm(); setEditing(null); setShowDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Ingrediente
        </Button>
      </div>

      {/* Stats Cards - Improved KPIs */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="w-4 h-4" />
              Total Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kpis.total}</p>
          </CardContent>
        </Card>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Costo Promedio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatCurrency(kpis.avgCost)}</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Costo promedio por unidad de uso</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card 
                className={`cursor-pointer transition-colors ${statusFilter === 'alert' ? 'ring-2 ring-destructive' : ''}`}
                onClick={() => setStatusFilter(statusFilter === 'alert' ? 'all' : 'alert')}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    En Alerta
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-destructive">{kpis.inAlert}</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ingredientes con stock bajo el mínimo calculado</p>
              <p className="text-xs text-muted-foreground">Click para filtrar</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card 
                className={`cursor-pointer transition-colors ${statusFilter === 'no-equiv' ? 'ring-2 ring-amber-500' : ''}`}
                onClick={() => setStatusFilter(statusFilter === 'no-equiv' ? 'all' : 'no-equiv')}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4" />
                    Sin Equivalencia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-amber-600">{kpis.withoutConversion}</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ingredientes sin conversión compra → uso definida</p>
              <p className="text-xs text-muted-foreground">Click para filtrar</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card 
                className={`cursor-pointer transition-colors ${statusFilter === 'no-min' ? 'ring-2 ring-muted-foreground' : ''}`}
                onClick={() => setStatusFilter(statusFilter === 'no-min' ? 'all' : 'no-min')}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CircleDashed className="w-4 h-4" />
                    Sin Mínimo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{kpis.withoutMinConfig}</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Sin consumo diario configurado</p>
              <p className="text-xs text-muted-foreground">Click para filtrar</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48 h-9">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
            <X className="w-3 h-3 mr-1" />
            Limpiar filtros
          </Button>
        )}
        
        <span className="text-xs text-muted-foreground ml-auto">
          {filteredIngredients.length} de {kpis.total} ingredientes
        </span>
      </div>

      {/* Table */}
      <Card>
        <ScrollArea className="h-[calc(100vh-420px)] min-h-[300px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingrediente</TableHead>
                <TableHead className="w-20">SKU</TableHead>
                <TableHead className="w-28">Categoría</TableHead>
                <TableHead className="w-48">Equivalencia</TableHead>
                <TableHead className="text-right w-36">Costo Compra</TableHead>
                <TableHead className="text-right w-32">Costo Uso</TableHead>
                <TableHead className="text-right w-36">Mín. Dinámico</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-12 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredIngredients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-16">
                    <div className="flex flex-col items-center justify-center text-center">
                      <PackageX className="w-12 h-12 text-muted-foreground/40 mb-3" />
                      <p className="text-muted-foreground font-medium">
                        {hasActiveFilters ? 'No hay ingredientes que coincidan' : 'No hay ingredientes'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 mb-4">
                        {hasActiveFilters ? 'Probá con otros filtros' : 'Empezá creando tu primer ingrediente'}
                      </p>
                      {hasActiveFilters ? (
                        <Button variant="outline" size="sm" onClick={clearFilters}>
                          Limpiar filtros
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => { resetForm(); setShowDialog(true); }}>
                          <Plus className="w-4 h-4 mr-1" />
                          Crear ingrediente
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredIngredients.map((ingredient) => {
                  const conv = getConversion(ingredient.id);
                  const { costPurchase, costUsage, hasConversion } = getCostPerUsageUnit(ingredient);
                  const dynamicMinStock = calculateDynamicMinStock(ingredient);
                  const usageUnit = ingredient.usage_unit || ingredient.unit;
                  const purchaseUnit = ingredient.purchase_unit || ingredient.unit;
                  const isEditingThisEquiv = editingEquivId === ingredient.id;
                  
                  return (
                    <TableRow key={ingredient.id} className="group">
                      {/* Ingredient Name */}
                      <TableCell>
                        <div>
                          <p className="font-medium">{ingredient.name}</p>
                          {ingredient.notes && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {ingredient.notes}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      
                      {/* SKU */}
                      <TableCell>
                        {ingredient.sku ? (
                          <Badge variant="outline" className="text-[10px]">{ingredient.sku}</Badge>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      
                      {/* Category */}
                      <TableCell>
                        {ingredient.category ? (
                          <Badge variant="secondary" className="text-[10px]">{ingredient.category}</Badge>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      
                      {/* Equivalence - Inline Editable */}
                      <TableCell>
                        {isEditingThisEquiv ? (
                          <div className="flex items-center gap-1">
                            <Select value={equivFromUnit} onValueChange={setEquivFromUnit}>
                              <SelectTrigger className="h-7 w-16 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {UNITS.map(u => (
                                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-xs text-muted-foreground">=</span>
                            <Input
                              type="number"
                              value={equivFactor}
                              onChange={(e) => setEquivFactor(e.target.value)}
                              className="h-7 w-14 text-xs text-center"
                              placeholder="12"
                              autoFocus
                            />
                            <Select value={equivToUnit} onValueChange={setEquivToUnit}>
                              <SelectTrigger className="h-7 w-16 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {UNITS.map(u => (
                                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-6 w-6" 
                              onClick={() => saveEquivalence(ingredient.id)}
                              disabled={savingEquiv}
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-6 w-6" 
                              onClick={cancelEditingEquiv}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditingEquiv(ingredient)}
                            className="flex items-center gap-1.5 text-xs hover:bg-muted px-2 py-1 rounded transition-colors w-full"
                          >
                            {conv ? (
                              <>
                                <span className="font-mono">
                                  1 {getUnitLabel(conv.from_unit)} = {conv.conversion_factor} {getUnitLabel(conv.to_unit)}
                                </span>
                                <Edit className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                              </>
                            ) : (
                              <span className="text-amber-600 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Sin equivalencia · Configurar
                              </span>
                            )}
                          </button>
                        )}
                      </TableCell>
                      
                      {/* Cost Purchase */}
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-help">
                                <div className="font-mono text-sm">
                                  {formatCurrency(costPurchase)}/{purchaseUnit}
                                </div>
                                {ingredient.cost_updated_at && (
                                  <p className="text-[10px] text-muted-foreground">
                                    {new Date(ingredient.cost_updated_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                                  </p>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                {ingredient.cost_updated_at 
                                  ? `Actualizado: ${new Date(ingredient.cost_updated_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}`
                                  : 'Sin fecha de actualización'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      
                      {/* Cost Usage */}
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                {hasConversion ? (
                                  <div className="font-mono text-sm text-emerald-600 cursor-help">
                                    {formatCurrency(costUsage)}/{usageUnit}
                                  </div>
                                ) : ingredient.cost_per_unit > 0 ? (
                                  <button
                                    onClick={() => startEditingEquiv(ingredient)}
                                    className="text-xs text-amber-600 hover:underline"
                                  >
                                    Definir equiv.
                                  </button>
                                ) : (
                                  <span className="text-muted-foreground/40 text-xs">Sin costo</span>
                                )}
                              </div>
                            </TooltipTrigger>
                            {hasConversion && (
                              <TooltipContent>
                                <p className="text-xs">Calculado: {formatCurrency(costPurchase)} ÷ {conv?.conversion_factor}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      
                      {/* Dynamic Min Stock */}
                      <TableCell className="text-right">
                        {dynamicMinStock > 0 ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="cursor-help">
                                  <span className="font-medium text-sm">{dynamicMinStock.toFixed(0)} {usageUnit}</span>
                                  <p className="text-[10px] text-muted-foreground">
                                    {ingredient.avg_daily_consumption?.toFixed(1)}/día
                                  </p>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-medium">Stock mínimo calculado</p>
                                <p className="text-xs">Consumo diario: {ingredient.avg_daily_consumption?.toFixed(1)} {usageUnit}</p>
                                <p className="text-xs">Lead time: {ingredient.lead_time_days || 2} días</p>
                                <p className="text-xs">Seguridad: {ingredient.safety_stock_days || 1} días</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <button
                            onClick={() => openEditDialog(ingredient)}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 justify-end"
                          >
                            <Settings className="w-3 h-3" />
                            Configurar
                          </button>
                        )}
                      </TableCell>
                      
                      {/* Actions */}
                      <TableCell>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => openEditDialog(ingredient)}
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => startEditingEquiv(ingredient)}>
                                <ArrowRightLeft className="w-4 h-4 mr-2" />
                                Editar equivalencia
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteDialog({ open: true, ingredient })}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={showDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowDialog(false);
            setEditing(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
            </DialogTitle>
            <DialogDescription>
              {editing ? 'Modificá los datos del ingrediente' : 'Ingresá los datos del nuevo ingrediente'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Carne picada"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU / Código</Label>
                <Input
                  id="sku"
                  value={formSku}
                  onChange={(e) => setFormSku(e.target.value)}
                  placeholder="CAR-001"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="usageUnit">Unidad de Uso</Label>
                <Select value={formUsageUnit} onValueChange={setFormUsageUnit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchaseUnit">Unidad Compra</Label>
                <Select value={formPurchaseUnit} onValueChange={setFormPurchaseUnit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchaseQty">Equivale a</Label>
                <Input
                  id="purchaseQty"
                  type="number"
                  min="1"
                  step="0.01"
                  value={formPurchaseUnitQty}
                  onChange={(e) => setFormPurchaseUnitQty(e.target.value)}
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Costo/{formPurchaseUnit}</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    id="cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leadTime">Días de entrega</Label>
                <Input
                  id="leadTime"
                  type="number"
                  min="0"
                  value={formLeadTimeDays}
                  onChange={(e) => setFormLeadTimeDays(e.target.value)}
                  placeholder="2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="safetyDays">Días de seguridad</Label>
                <Input
                  id="safetyDays"
                  type="number"
                  min="0"
                  value={formSafetyDays}
                  onChange={(e) => setFormSafetyDays(e.target.value)}
                  placeholder="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Input
                id="notes"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Observaciones..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false);
                setEditing(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, ingredient: open ? deleteDialog.ingredient : null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar "{deleteDialog.ingredient?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              El ingrediente será desactivado y ya no aparecerá en las listas.
              <br />
              <span className="text-amber-600">
                ⚠️ Si está vinculado a recetas, los costos de esos productos podrían verse afectados.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
