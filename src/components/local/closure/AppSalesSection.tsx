/**
 * AppSalesSection - App delivery sales
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChevronDown, Smartphone, HelpCircle } from 'lucide-react';
import type { VentasAppsData } from '@/types/shiftClosure';
import { useBranchClosureConfig } from '@/hooks/useClosureConfig';

interface AppSalesSectionProps {
  branchId: string;
  data: VentasAppsData;
  onChange: (data: VentasAppsData) => void;
  subtotal: number;
}

export function AppSalesSection({ branchId, data, onChange, subtotal }: AppSalesSectionProps) {
  const { data: config } = useBranchClosureConfig(branchId);
  
  const handleChange = (app: keyof VentasAppsData, method: string, value: number) => {
    onChange({
      ...data,
      [app]: {
        ...data[app],
        [method]: value,
      },
    });
  };
  
  const parseNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0;
    return Math.max(0, val);
  };
  
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value);
  
  // Check which apps are enabled
  const isAppEnabled = (appKey: string) => {
    if (!config?.enabledApps) return true;
    return config.enabledApps.get(appKey) !== false;
  };

  return (
    <Collapsible defaultOpen>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Ventas por Apps
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-normal text-muted-foreground">
                  Subtotal: <span className="font-bold text-foreground">{formatCurrency(subtotal)}</span>
                </span>
                <ChevronDown className="w-4 h-4" />
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Help button */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  ¿Cómo verificar con cada app?
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Verificar ventas por app</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                  <div>
                    <strong>Más Delivery:</strong>
                    <p className="text-muted-foreground">Ingresá a la app y revisá el historial del turno.</p>
                  </div>
                  <div>
                    <strong>Rappi:</strong>
                    <p className="text-muted-foreground">Portal Partners → Historial de pedidos.</p>
                  </div>
                  <div>
                    <strong>PedidosYa:</strong>
                    <p className="text-muted-foreground">App de restaurante → Pedidos entregados.</p>
                  </div>
                  <div>
                    <strong>MP Delivery:</strong>
                    <p className="text-muted-foreground">MercadoPago → Actividad → Filtrar por delivery.</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            {/* Apps grid */}
            <div className="space-y-3">
              {/* Más Delivery */}
              {isAppEnabled('mas_delivery') && (
                <div className="p-3 rounded-lg border bg-muted/30">
                  <Label className="font-semibold mb-2 block">Más Delivery</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Efectivo</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={data.mas_delivery.efectivo || ''}
                        onChange={(e) => handleChange('mas_delivery', 'efectivo', parseNumber(e))}
                        className="h-9"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">MercadoPago</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={data.mas_delivery.mercadopago || ''}
                        onChange={(e) => handleChange('mas_delivery', 'mercadopago', parseNumber(e))}
                        className="h-9"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Rappi */}
              {isAppEnabled('rappi') && (
                <div className="p-3 rounded-lg border bg-muted/30">
                  <Label className="font-semibold mb-2 block">Rappi</Label>
                  <div>
                    <Label className="text-xs text-muted-foreground">App (todo es digital)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={data.rappi.app || ''}
                      onChange={(e) => handleChange('rappi', 'app', parseNumber(e))}
                      className="h-9"
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
              
              {/* PedidosYa */}
              {isAppEnabled('pedidosya') && (
                <div className="p-3 rounded-lg border bg-muted/30">
                  <Label className="font-semibold mb-2 block">PedidosYa</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Efectivo</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={data.pedidosya.efectivo || ''}
                        onChange={(e) => handleChange('pedidosya', 'efectivo', parseNumber(e))}
                        className="h-9"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">App</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={data.pedidosya.app || ''}
                        onChange={(e) => handleChange('pedidosya', 'app', parseNumber(e))}
                        className="h-9"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* MP Delivery */}
              {isAppEnabled('mp_delivery') && (
                <div className="p-3 rounded-lg border bg-muted/30">
                  <Label className="font-semibold mb-2 block">MP Delivery</Label>
                  <div>
                    <Label className="text-xs text-muted-foreground">App (todo es digital)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={data.mp_delivery.app || ''}
                      onChange={(e) => handleChange('mp_delivery', 'app', parseNumber(e))}
                      className="h-9"
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
