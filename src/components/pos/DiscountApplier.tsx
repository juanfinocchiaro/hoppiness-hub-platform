import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Percent, Tag, Trash2, Plus, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Discount {
  id: string;
  name: string;
  code: string | null;
  type: 'fixed' | 'percentage';
  value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
}

interface AppliedDiscount {
  discountId: string | null;
  discountName: string;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  amountApplied: number;
}

interface DiscountApplierProps {
  subtotal: number;
  customerId?: string | null;
  appliedDiscounts: AppliedDiscount[];
  onDiscountsChange: (discounts: AppliedDiscount[]) => void;
}

export default function DiscountApplier({
  subtotal,
  customerId,
  appliedDiscounts,
  onDiscountsChange,
}: DiscountApplierProps) {
  const [availableDiscounts, setAvailableDiscounts] = useState<Discount[]>([]);
  const [customerDiscounts, setCustomerDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [validatingCode, setValidatingCode] = useState(false);

  // Manual discount
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [manualType, setManualType] = useState<'fixed' | 'percentage'>('percentage');
  const [manualValue, setManualValue] = useState('');
  const [manualReason, setManualReason] = useState('');

  // Fetch available discounts
  useEffect(() => {
    async function fetchDiscounts() {
      setLoading(true);
      const now = new Date().toISOString();
      
      // Get active discounts
      const { data: discounts } = await supabase
        .from('discounts')
        .select('*')
        .eq('is_active', true)
        .or(`valid_from.is.null,valid_from.lte.${now}`)
        .or(`valid_until.is.null,valid_until.gte.${now}`);

      if (discounts) {
        setAvailableDiscounts(discounts as Discount[]);
      }

      // Get customer-specific discounts if customer is selected
      if (customerId) {
        const { data: custDiscounts } = await supabase
          .from('customer_discounts')
          .select(`
            discount_id,
            auto_apply,
            discounts (*)
          `)
          .eq('customer_id', customerId)
          .or(`valid_from.is.null,valid_from.lte.${now}`)
          .or(`valid_until.is.null,valid_until.gte.${now}`);

        if (custDiscounts) {
          const autoApply = custDiscounts
            .filter((cd: any) => cd.auto_apply && cd.discounts)
            .map((cd: any) => cd.discounts as Discount);
          
          setCustomerDiscounts(autoApply);

          // Auto-apply customer discounts
          autoApply.forEach((discount: Discount) => {
            if (!appliedDiscounts.some(ad => ad.discountId === discount.id)) {
              const amount = calculateDiscountAmount(discount, subtotal);
              if (amount > 0) {
                onDiscountsChange([
                  ...appliedDiscounts,
                  {
                    discountId: discount.id,
                    discountName: discount.name,
                    discountType: discount.type,
                    discountValue: discount.value,
                    amountApplied: amount,
                  },
                ]);
              }
            }
          });
        }
      }

      setLoading(false);
    }

    fetchDiscounts();
  }, [customerId]);

  // Recalculate amounts when subtotal changes
  useEffect(() => {
    if (appliedDiscounts.length > 0) {
      const updated = appliedDiscounts.map((ad) => ({
        ...ad,
        amountApplied: ad.discountType === 'percentage'
          ? Math.min(subtotal * (ad.discountValue / 100), ad.discountValue)
          : ad.discountValue,
      }));
      
      // Only update if amounts actually changed
      const changed = updated.some((u, i) => u.amountApplied !== appliedDiscounts[i].amountApplied);
      if (changed) {
        onDiscountsChange(updated);
      }
    }
  }, [subtotal]);

  const calculateDiscountAmount = (discount: Discount, baseAmount: number): number => {
    if (discount.min_order_amount && baseAmount < discount.min_order_amount) {
      return 0;
    }

    let amount = discount.type === 'percentage'
      ? baseAmount * (discount.value / 100)
      : discount.value;

    if (discount.max_discount_amount) {
      amount = Math.min(amount, discount.max_discount_amount);
    }

    return Math.round(amount * 100) / 100;
  };

  const applyDiscount = (discount: Discount) => {
    if (appliedDiscounts.some((ad) => ad.discountId === discount.id)) {
      toast.error('Este descuento ya está aplicado');
      return;
    }

    const amount = calculateDiscountAmount(discount, subtotal);
    if (amount <= 0) {
      toast.error(`Monto mínimo: $${discount.min_order_amount}`);
      return;
    }

    onDiscountsChange([
      ...appliedDiscounts,
      {
        discountId: discount.id,
        discountName: discount.name,
        discountType: discount.type,
        discountValue: discount.value,
        amountApplied: amount,
      },
    ]);

    setOpen(false);
    toast.success(`Descuento "${discount.name}" aplicado`);
  };

  const removeDiscount = (index: number) => {
    onDiscountsChange(appliedDiscounts.filter((_, i) => i !== index));
  };

  const validateCode = async () => {
    if (!codeInput.trim()) return;

    setValidatingCode(true);
    const discount = availableDiscounts.find(
      (d) => d.code?.toLowerCase() === codeInput.toLowerCase()
    );

    if (discount) {
      applyDiscount(discount);
      setCodeInput('');
    } else {
      toast.error('Código de descuento inválido');
    }
    setValidatingCode(false);
  };

  const applyManualDiscount = () => {
    const value = parseFloat(manualValue);
    if (!value || value <= 0) {
      toast.error('Ingresá un valor válido');
      return;
    }

    const amount = manualType === 'percentage'
      ? Math.round(subtotal * (value / 100) * 100) / 100
      : value;

    onDiscountsChange([
      ...appliedDiscounts,
      {
        discountId: null,
        discountName: manualReason || `Descuento ${manualType === 'percentage' ? `${value}%` : `$${value}`}`,
        discountType: manualType,
        discountValue: value,
        amountApplied: amount,
      },
    ]);

    setShowManualDialog(false);
    setManualValue('');
    setManualReason('');
    toast.success('Descuento manual aplicado');
  };

  const totalDiscount = appliedDiscounts.reduce((sum, d) => sum + d.amountApplied, 0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Tag className="w-4 h-4 text-green-600" />
          Descuentos
        </Label>
        {totalDiscount > 0 && (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            -{formatPrice(totalDiscount)}
          </Badge>
        )}
      </div>

      {/* Applied Discounts */}
      {appliedDiscounts.length > 0 && (
        <div className="space-y-1">
          {appliedDiscounts.map((discount, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-1 px-2 bg-green-50 rounded text-sm"
            >
              <div className="flex items-center gap-2">
                <Check className="w-3 h-3 text-green-600" />
                <span>{discount.discountName}</span>
                <Badge variant="outline" className="text-xs">
                  {discount.discountType === 'percentage'
                    ? `${discount.discountValue}%`
                    : formatPrice(discount.discountValue)}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-700 font-medium">
                  -{formatPrice(discount.amountApplied)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => removeDiscount(index)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Discount Buttons */}
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1">
              <Tag className="w-4 h-4 mr-1" />
              Agregar
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              {/* Code input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Código de descuento"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && validateCode()}
                />
                <Button
                  size="sm"
                  onClick={validateCode}
                  disabled={validatingCode || !codeInput.trim()}
                >
                  Aplicar
                </Button>
              </div>

              {/* Available discounts */}
              {availableDiscounts.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Descuentos disponibles
                  </Label>
                  <ScrollArea className="max-h-[200px]">
                    <div className="space-y-1">
                      {availableDiscounts
                        .filter((d) => !d.code) // Only show discounts without codes
                        .map((discount) => (
                          <Button
                            key={discount.id}
                            variant="ghost"
                            className="w-full justify-between h-auto py-2"
                            onClick={() => applyDiscount(discount)}
                            disabled={appliedDiscounts.some((ad) => ad.discountId === discount.id)}
                          >
                            <span>{discount.name}</span>
                            <Badge>
                              {discount.type === 'percentage'
                                ? `${discount.value}%`
                                : formatPrice(discount.value)}
                            </Badge>
                          </Button>
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Percent className="w-4 h-4 mr-1" />
              Manual
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Descuento Manual</DialogTitle>
              <DialogDescription>
                Aplicar un descuento personalizado
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={manualType === 'percentage' ? 'default' : 'outline'}
                  onClick={() => setManualType('percentage')}
                  className="flex-1"
                >
                  <Percent className="w-4 h-4 mr-1" />
                  Porcentaje
                </Button>
                <Button
                  variant={manualType === 'fixed' ? 'default' : 'outline'}
                  onClick={() => setManualType('fixed')}
                  className="flex-1"
                >
                  $ Fijo
                </Button>
              </div>

              <div className="space-y-2">
                <Label>
                  {manualType === 'percentage' ? 'Porcentaje' : 'Monto'}
                </Label>
                <div className="flex items-center gap-2">
                  {manualType === 'fixed' && <span>$</span>}
                  <Input
                    type="number"
                    min="0"
                    max={manualType === 'percentage' ? 100 : undefined}
                    value={manualValue}
                    onChange={(e) => setManualValue(e.target.value)}
                    placeholder={manualType === 'percentage' ? '10' : '500'}
                  />
                  {manualType === 'percentage' && <span>%</span>}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Motivo (opcional)</Label>
                <Input
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="Ej: Cliente frecuente"
                />
              </div>

              {manualValue && (
                <div className="text-center p-2 bg-green-50 rounded">
                  <span className="text-green-700 font-medium">
                    Descuento: {formatPrice(
                      manualType === 'percentage'
                        ? subtotal * (parseFloat(manualValue) / 100)
                        : parseFloat(manualValue) || 0
                    )}
                  </span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowManualDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={applyManualDiscount}>
                Aplicar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
