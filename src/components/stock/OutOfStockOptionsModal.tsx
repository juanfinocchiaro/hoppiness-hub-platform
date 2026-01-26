/**
 * Modal que muestra opciones cuando un producto está sin stock
 * Opciones: Esperar, Convertir ingrediente alternativo, Pedir de emergencia
 */
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  Clock, 
  RefreshCw, 
  Phone, 
  MessageCircle,
  AlertCircle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ProductMissingIngredient } from '@/hooks/useIngredientConversions';

interface OutOfStockOptionsModalProps {
  open: boolean;
  onClose: () => void;
  productInfo: ProductMissingIngredient | null;
  branchId: string;
  onConvert: () => void;
}

export default function OutOfStockOptionsModal({
  open,
  onClose,
  productInfo,
  branchId,
  onConvert,
}: OutOfStockOptionsModalProps) {
  const [supplierInfo, setSupplierInfo] = useState<{
    name: string;
    phone: string | null;
    nextDelivery?: string;
  } | null>(null);

  useEffect(() => {
    if (open && productInfo) {
      fetchSupplierInfo();
    }
  }, [open, productInfo]);

  const fetchSupplierInfo = async () => {
    if (!productInfo) return;

    // Buscar proveedor del ingrediente principal
    const { data } = await supabase
      .from('ingredient_suppliers')
      .select(`
        supplier:suppliers(id, name, phone)
      `)
      .eq('ingredient_id', productInfo.missingIngredient.id)
      .eq('is_primary', true)
      .maybeSingle();

    if (data?.supplier) {
      setSupplierInfo({
        name: data.supplier.name,
        phone: data.supplier.phone,
      });
    }
  };

  if (!productInfo) return null;

  const { missingIngredient, alternativeIngredient, productName } = productInfo;

  const handleWhatsApp = () => {
    if (!supplierInfo?.phone) return;
    const phone = supplierInfo.phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Hola! Necesitamos pedido urgente de ${missingIngredient.name}. ¿Tenés disponibilidad para hoy?`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handleCall = () => {
    if (!supplierInfo?.phone) return;
    window.open(`tel:${supplierInfo.phone}`, '_self');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-destructive" />
            {productName} - Sin Stock
          </DialogTitle>
          <DialogDescription>
            Este producto no está disponible por falta de ingredientes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Ingrediente faltante */}
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">Ingrediente Faltante</p>
                  <p className="text-sm font-semibold mt-1">{missingIngredient.name}</p>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <span>Stock actual: <strong className="text-destructive">{missingIngredient.currentStock}</strong> {missingIngredient.unit}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Necesario por unidad: {missingIngredient.requiredPerUnit} {missingIngredient.unit}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          <div className="space-y-3">
            <p className="font-medium text-sm">¿Qué querés hacer?</p>

            {/* Opción 1: Esperar */}
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={onClose}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-muted">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Esperar el próximo pedido</p>
                    <p className="text-xs text-muted-foreground">
                      Dejar el producto sin stock hasta recibir mercadería
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Opción 2: Convertir (si hay alternativo) */}
            {alternativeIngredient && (
              <Card 
                className="cursor-pointer hover:bg-primary/5 border-primary/30 transition-colors"
                onClick={onConvert}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <RefreshCw className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-primary">Usar ingrediente alternativo</p>
                      <p className="text-xs text-muted-foreground">
                        Tenés <strong>{alternativeIngredient.currentStock} {alternativeIngredient.unit}</strong> de{' '}
                        <strong>{alternativeIngredient.name}</strong>
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-primary" />
                  </div>
                </CardContent>
              </Card>
            )}

            {!alternativeIngredient && (
              <Card className="bg-muted/30">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-muted">
                      <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-muted-foreground">Sin alternativo configurado</p>
                      <p className="text-xs text-muted-foreground">
                        La marca puede configurar un ingrediente alternativo
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Opción 3: Pedir de emergencia */}
            {supplierInfo && (
              <Card className="border-amber-500/30">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-muted">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Pedir de emergencia</p>
                        <p className="text-xs text-muted-foreground">
                          Contactar a {supplierInfo.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {supplierInfo.phone && (
                        <>
                          <Button variant="outline" size="sm" onClick={handleCall}>
                            <Phone className="h-3 w-3 mr-1" />
                            Llamar
                          </Button>
                          <Button variant="outline" size="sm" onClick={handleWhatsApp}>
                            <MessageCircle className="h-3 w-3 mr-1" />
                            WhatsApp
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
