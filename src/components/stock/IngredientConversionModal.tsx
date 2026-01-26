/**
 * Modal para ejecutar una conversión de ingrediente alternativo
 * Guía paso a paso al usuario para convertir stock
 */
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowDown,
  ArrowRight,
  RefreshCw, 
  AlertTriangle,
  CheckCircle2,
  Package,
  Loader2,
} from 'lucide-react';
import { ProductMissingIngredient, useExecuteConversion } from '@/hooks/useIngredientConversions';
import { supabase } from '@/integrations/supabase/client';

interface IngredientConversionModalProps {
  open: boolean;
  onClose: () => void;
  productInfo: ProductMissingIngredient | null;
  branchId: string;
  onSuccess?: () => void;
}

export default function IngredientConversionModal({
  open,
  onClose,
  productInfo,
  branchId,
  onSuccess,
}: IngredientConversionModalProps) {
  const [quantity, setQuantity] = useState('');
  const [notifyBrand, setNotifyBrand] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const executeConversion = useExecuteConversion();

  useEffect(() => {
    if (open && productInfo?.alternativeIngredient) {
      // Sugerir cantidad inicial basada en stock disponible
      setQuantity(productInfo.alternativeIngredient.currentStock.toString());
      setNotifyBrand(true);
      setShowConfirmation(false);
    }
  }, [open, productInfo]);

  if (!productInfo || !productInfo.alternativeIngredient) return null;

  const { missingIngredient, alternativeIngredient, productName } = productInfo;
  const quantityNum = parseFloat(quantity) || 0;
  const maxQuantity = alternativeIngredient.currentStock;
  const isValid = quantityNum > 0 && quantityNum <= maxQuantity;

  // Calcular cuántos productos se pueden hacer
  const productsToMake = Math.floor(quantityNum / missingIngredient.requiredPerUnit);

  // Calcular diferencia de costo
  const costDifference = (alternativeIngredient.cost - (missingIngredient.currentStock > 0 ? 0 : alternativeIngredient.cost)) * quantityNum;

  const handleConfirm = async () => {
    if (!isValid) return;

    try {
      await executeConversion.mutateAsync({
        branchId,
        fromIngredientId: alternativeIngredient.id,
        toIngredientId: missingIngredient.id,
        quantity: quantityNum,
        triggeredByProductId: productInfo.productId,
        reason: `Sin stock del principal. Producto: ${productName}`,
      });

      setShowConfirmation(true);
    } catch {
      // Error handled in mutation
    }
  };

  const handleClose = () => {
    if (showConfirmation) {
      onSuccess?.();
    }
    onClose();
    setQuantity('');
    setShowConfirmation(false);
  };

  // Vista de confirmación exitosa
  if (showConfirmation) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">¡Conversión realizada!</h2>
              <p className="text-muted-foreground mt-2">
                Se convirtieron {quantityNum} {alternativeIngredient.unit}:
              </p>
            </div>
            
            <div className="text-sm space-y-2 bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span>{alternativeIngredient.name}</span>
                <span className="font-mono text-destructive">
                  -{quantityNum}
                </span>
              </div>
              <div className="flex items-center justify-center">
                <ArrowDown className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between">
                <span>{missingIngredient.name}</span>
                <span className="font-mono text-primary">
                  +{quantityNum}
                </span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              <strong>{productName}</strong> ahora está disponible para vender.
              {notifyBrand && <span className="block mt-1">La marca fue notificada.</span>}
            </p>

            <Button onClick={handleClose} className="w-full">
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Convertir Ingrediente
          </DialogTitle>
          <DialogDescription>
            Vas a usar un ingrediente alternativo para poder seguir vendiendo este producto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Ingrediente que falta */}
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-3 pb-2 px-4">
              <p className="text-xs font-medium text-destructive mb-1">INGREDIENTE QUE FALTA</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  <span className="font-medium">{missingIngredient.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  Stock: <strong className="text-destructive">{missingIngredient.currentStock}</strong> {missingIngredient.unit}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <ArrowDown className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Ingrediente alternativo */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-3 pb-2 px-4">
              <p className="text-xs font-medium text-primary mb-1">INGREDIENTE ALTERNATIVO</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="font-medium">{alternativeIngredient.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  Disponible: <strong className="text-primary">{alternativeIngredient.currentStock}</strong> {alternativeIngredient.unit}
                </span>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Cantidad a convertir */}
          <div className="space-y-2">
            <Label>¿Cuántas unidades convertir?</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min={0}
                max={maxQuantity}
                className="text-lg font-medium"
              />
              <span className="text-muted-foreground">{alternativeIngredient.unit}</span>
            </div>
            {quantityNum > maxQuantity && (
              <p className="text-xs text-destructive">
                Máximo disponible: {maxQuantity} {alternativeIngredient.unit}
              </p>
            )}
            {isValid && (
              <p className="text-sm text-muted-foreground">
                Esto permite hacer: <strong>~{productsToMake}</strong> {productName}
              </p>
            )}
          </div>

          {/* Resumen de la operación */}
          {isValid && (
            <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm">
                <strong>Esto va a:</strong>
                <ul className="mt-1 space-y-1 text-xs">
                  <li>• Restar {quantityNum} de "{alternativeIngredient.name}"</li>
                  <li>• Sumar {quantityNum} a "{missingIngredient.name}"</li>
                  <li>• Registrar el ajuste como "Conversión de alternativo"</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Checkbox de notificar */}
          <div className="flex items-start space-x-3">
            <Checkbox 
              id="notify" 
              checked={notifyBrand} 
              onCheckedChange={(checked) => setNotifyBrand(checked === true)}
            />
            <div className="space-y-1 leading-none">
              <Label htmlFor="notify" className="text-sm cursor-pointer">
                Notificar a la marca sobre esta conversión
              </Label>
              <p className="text-xs text-muted-foreground">
                Recomendado para mantener el control de calidad
              </p>
            </div>
          </div>

          {/* Nota sobre costos */}
          <p className="text-xs text-muted-foreground">
            El costo de la receta seguirá calculándose con el precio de{' '}
            <strong>{missingIngredient.name}</strong>. La diferencia de costo con{' '}
            {alternativeIngredient.name} se registra para análisis.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!isValid || executeConversion.isPending}
          >
            {executeConversion.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Convirtiendo...
              </>
            ) : (
              'Confirmar conversión'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
