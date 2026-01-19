import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tag,
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Percent,
  DollarSign,
  Calendar,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Discount {
  id: string;
  name: string;
  code: string | null;
  type: 'fixed' | 'percentage';
  value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  valid_from: string | null;
  valid_until: string | null;
  usage_limit: number | null;
  usage_count: number;
  is_active: boolean;
  created_at: string;
}

export default function Discounts() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<'fixed' | 'percentage'>('percentage');
  const [formValue, setFormValue] = useState('');
  const [formMinAmount, setFormMinAmount] = useState('');
  const [formMaxDiscount, setFormMaxDiscount] = useState('');
  const [formValidFrom, setFormValidFrom] = useState('');
  const [formValidUntil, setFormValidUntil] = useState('');
  const [formUsageLimit, setFormUsageLimit] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('discounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Error al cargar descuentos');
      console.error(error);
    } else {
      setDiscounts((data || []) as Discount[]);
    }
    setLoading(false);
  };

  const filteredDiscounts = discounts.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.code?.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setFormName('');
    setFormCode('');
    setFormType('percentage');
    setFormValue('');
    setFormMinAmount('');
    setFormMaxDiscount('');
    setFormValidFrom('');
    setFormValidUntil('');
    setFormUsageLimit('');
  };

  const openEditDialog = (discount: Discount) => {
    setEditing(discount);
    setFormName(discount.name);
    setFormCode(discount.code || '');
    setFormType(discount.type);
    setFormValue(discount.value.toString());
    setFormMinAmount(discount.min_order_amount?.toString() || '');
    setFormMaxDiscount(discount.max_discount_amount?.toString() || '');
    setFormValidFrom(discount.valid_from?.split('T')[0] || '');
    setFormValidUntil(discount.valid_until?.split('T')[0] || '');
    setFormUsageLimit(discount.usage_limit?.toString() || '');
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formValue) {
      toast.error('Nombre y valor son requeridos');
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: formName.trim(),
        code: formCode.trim().toUpperCase() || null,
        type: formType,
        value: parseFloat(formValue),
        min_order_amount: formMinAmount ? parseFloat(formMinAmount) : null,
        max_discount_amount: formMaxDiscount ? parseFloat(formMaxDiscount) : null,
        valid_from: formValidFrom || null,
        valid_until: formValidUntil || null,
        usage_limit: formUsageLimit ? parseInt(formUsageLimit) : null,
      };

      if (editing) {
        const { error } = await supabase
          .from('discounts')
          .update(data)
          .eq('id', editing.id);
        if (error) throw error;
        toast.success('Descuento actualizado');
      } else {
        const { error } = await supabase
          .from('discounts')
          .insert(data);
        if (error) throw error;
        toast.success('Descuento creado');
      }

      setShowDialog(false);
      setEditing(null);
      resetForm();
      fetchDiscounts();
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (discount: Discount) => {
    const { error } = await supabase
      .from('discounts')
      .update({ is_active: !discount.is_active })
      .eq('id', discount.id);

    if (error) {
      toast.error('Error al actualizar');
    } else {
      fetchDiscounts();
    }
  };

  const handleDelete = async (discount: Discount) => {
    if (!confirm(`¿Eliminar "${discount.name}"?`)) return;

    const { error } = await supabase
      .from('discounts')
      .delete()
      .eq('id', discount.id);

    if (error) {
      toast.error('Error al eliminar');
    } else {
      toast.success('Descuento eliminado');
      fetchDiscounts();
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const isExpired = (discount: Discount) => {
    if (!discount.valid_until) return false;
    return new Date(discount.valid_until) < new Date();
  };

  const activeDiscounts = discounts.filter(d => d.is_active && !isExpired(d));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Descuentos</h1>
          <p className="text-muted-foreground">Gestión de promociones y descuentos</p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Descuento
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{discounts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Tag className="w-4 h-4 text-green-600" />
              Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeDiscounts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Porcentuales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {discounts.filter(d => d.type === 'percentage').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Monto Fijo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {discounts.filter(d => d.type === 'fixed').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descuento</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Condiciones</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead></TableHead>
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
              ) : filteredDiscounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No se encontraron descuentos
                  </TableCell>
                </TableRow>
              ) : (
                filteredDiscounts.map((discount) => (
                  <TableRow key={discount.id} className={isExpired(discount) ? 'opacity-50' : ''}>
                    <TableCell>
                      <p className="font-medium">{discount.name}</p>
                    </TableCell>
                    <TableCell>
                      {discount.code ? (
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="font-mono">
                            {discount.code}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyCode(discount.code!)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={discount.type === 'percentage' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}>
                        {discount.type === 'percentage' 
                          ? `${discount.value}%` 
                          : formatPrice(discount.value)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {discount.min_order_amount && (
                          <p>Mín: {formatPrice(discount.min_order_amount)}</p>
                        )}
                        {discount.max_discount_amount && (
                          <p>Máx: {formatPrice(discount.max_discount_amount)}</p>
                        )}
                        {!discount.min_order_amount && !discount.max_discount_amount && (
                          <p>Sin restricciones</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        {discount.valid_from && (
                          <p className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Desde: {format(new Date(discount.valid_from), 'dd/MM/yy')}
                          </p>
                        )}
                        {discount.valid_until && (
                          <p className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Hasta: {format(new Date(discount.valid_until), 'dd/MM/yy')}
                          </p>
                        )}
                        {!discount.valid_from && !discount.valid_until && (
                          <p className="text-muted-foreground">Siempre</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {discount.usage_count}
                        {discount.usage_limit && (
                          <span className="text-muted-foreground"> / {discount.usage_limit}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={discount.is_active}
                        onCheckedChange={() => toggleActive(discount)}
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(discount)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(discount)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar Descuento' : 'Nuevo Descuento'}
            </DialogTitle>
            <DialogDescription>
              Configurá las condiciones del descuento
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
                  placeholder="10% cumpleaños"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Código (opcional)</Label>
                <Input
                  id="code"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="CUMPLE10"
                  className="uppercase"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de descuento</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formType === 'percentage' ? 'default' : 'outline'}
                  onClick={() => setFormType('percentage')}
                  className="flex-1"
                >
                  <Percent className="w-4 h-4 mr-1" />
                  Porcentaje
                </Button>
                <Button
                  type="button"
                  variant={formType === 'fixed' ? 'default' : 'outline'}
                  onClick={() => setFormType('fixed')}
                  className="flex-1"
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  Monto Fijo
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">
                {formType === 'percentage' ? 'Porcentaje *' : 'Monto *'}
              </Label>
              <div className="flex items-center gap-2">
                {formType === 'fixed' && <span>$</span>}
                <Input
                  id="value"
                  type="number"
                  min="0"
                  max={formType === 'percentage' ? 100 : undefined}
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  placeholder={formType === 'percentage' ? '10' : '500'}
                />
                {formType === 'percentage' && <span>%</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minAmount">Monto mínimo pedido</Label>
                <div className="flex items-center gap-2">
                  <span>$</span>
                  <Input
                    id="minAmount"
                    type="number"
                    min="0"
                    value={formMinAmount}
                    onChange={(e) => setFormMinAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDiscount">Descuento máximo</Label>
                <div className="flex items-center gap-2">
                  <span>$</span>
                  <Input
                    id="maxDiscount"
                    type="number"
                    min="0"
                    value={formMaxDiscount}
                    onChange={(e) => setFormMaxDiscount(e.target.value)}
                    placeholder="Sin límite"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="validFrom">Válido desde</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={formValidFrom}
                  onChange={(e) => setFormValidFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validUntil">Válido hasta</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={formValidUntil}
                  onChange={(e) => setFormValidUntil(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="usageLimit">Límite de usos (opcional)</Label>
              <Input
                id="usageLimit"
                type="number"
                min="1"
                value={formUsageLimit}
                onChange={(e) => setFormUsageLimit(e.target.value)}
                placeholder="Sin límite"
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
    </div>
  );
}
