import { useState } from 'react';
import { useAllProductChannelPermissions, useToggleProductChannel, useUpdateProductChannelPrice } from '@/hooks/useProductChannels';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Globe, Monitor, Bike, MessageCircle, CreditCard, Utensils, Phone, ShoppingBag, Truck, Store, Check, X, DollarSign } from 'lucide-react';

// Icon mapping
const CHANNEL_ICONS: Record<string, React.ElementType> = {
  Globe,
  Monitor,
  Bike,
  MessageCircle,
  CreditCard,
  Utensils,
  Phone,
  ShoppingBag,
  Truck,
  Store,
};

interface ProductChannelTabProps {
  productId: string;
  basePrice: number;
}

export function ProductChannelTab({ productId, basePrice }: ProductChannelTabProps) {
  const { data: channelPermissions, isLoading } = useAllProductChannelPermissions(productId);
  const toggleChannel = useToggleProductChannel();
  const updatePrice = useUpdateProductChannelPrice();
  
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceValue, setPriceValue] = useState<string>('');

  const handleToggle = async (channelId: string, currentlyAllowed: boolean) => {
    await toggleChannel.mutateAsync({
      productId,
      channelId,
      isAllowed: !currentlyAllowed,
    });
  };

  const handleStartEditPrice = (channelId: string, currentPrice: number | null) => {
    setEditingPrice(channelId);
    setPriceValue(currentPrice?.toString() || '');
  };

  const handleSavePrice = async (channelId: string) => {
    const numValue = priceValue ? parseFloat(priceValue) : null;
    await updatePrice.mutateAsync({
      productId,
      channelId,
      priceOverride: numValue,
    });
    setEditingPrice(null);
  };

  const handleCancelPrice = () => {
    setEditingPrice(null);
    setPriceValue('');
  };

  const getChannelIcon = (iconName: string | null) => {
    const Icon = CHANNEL_ICONS[iconName || 'Globe'] || Globe;
    return Icon;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const calculateDifference = (overridePrice: number | null) => {
    if (!overridePrice || !basePrice) return null;
    const diff = ((overridePrice - basePrice) / basePrice) * 100;
    return diff.toFixed(0);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        Selecciona en qué canales puede venderse este producto. Los canales deshabilitados 
        no estarán disponibles en ninguna sucursal.
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Canal</TableHead>
            <TableHead className="text-center w-[100px]">Permitido</TableHead>
            <TableHead className="w-[200px]">Precio Override</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {channelPermissions?.map(({ channel, is_allowed, price_override }) => {
            const Icon = getChannelIcon(channel.icon);
            const difference = calculateDifference(price_override);
            
            return (
              <TableRow key={channel.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${channel.color}15` }}
                    >
                      <Icon 
                        className="w-4 h-4" 
                        style={{ color: channel.color || undefined }}
                      />
                    </div>
                    <div>
                      <div className="font-medium">{channel.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {channel.channel_type === 'aggregator' && 'Agregador'}
                        {channel.channel_type === 'pos' && 'Punto de Venta'}
                        {channel.channel_type === 'direct' && 'Venta Directa'}
                        {channel.channel_type === 'messaging' && 'Mensajería'}
                        {channel.channel_type === 'marketplace' && 'Marketplace'}
                      </div>
                    </div>
                  </div>
                </TableCell>
                
                <TableCell className="text-center">
                  <Switch 
                    checked={is_allowed}
                    onCheckedChange={() => handleToggle(channel.id, is_allowed)}
                    disabled={toggleChannel.isPending}
                  />
                </TableCell>
                
                <TableCell>
                  {is_allowed ? (
                    editingPrice === channel.id ? (
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number"
                          value={priceValue}
                          onChange={(e) => setPriceValue(e.target.value)}
                          placeholder={basePrice.toString()}
                          className="w-24 h-8"
                        />
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleSavePrice(channel.id)}
                          disabled={updatePrice.isPending}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={handleCancelPrice}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                        onClick={() => handleStartEditPrice(channel.id, price_override)}
                      >
                        {price_override ? (
                          <>
                            <span className="font-medium">{formatPrice(price_override)}</span>
                            {difference && (
                              <Badge 
                                variant="secondary" 
                                className={parseInt(difference) > 0 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'}
                              >
                                {parseInt(difference) > 0 ? '+' : ''}{difference}%
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            {formatPrice(basePrice)} (base)
                          </span>
                        )}
                        <DollarSign className="w-3 h-3 text-muted-foreground ml-auto" />
                      </div>
                    )
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted/30 rounded-lg">
        💡 <strong>Precio Override:</strong> Define un precio diferente para este canal. 
        Útil para agregadores donde se cobra comisión (ej: +15% en Rappi).
      </div>
    </div>
  );
}
