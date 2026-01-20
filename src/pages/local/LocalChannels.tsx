import { useParams } from 'react-router-dom';
import { useBranchChannelsDetailed, useToggleBranchChannel } from '@/hooks/useBranchChannels';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings2, AlertCircle, CheckCircle2, Globe, Monitor, Bike, MessageCircle, CreditCard, Utensils, Phone, ShoppingBag, Truck, Store } from 'lucide-react';

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

export default function LocalChannels() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: branchChannels, isLoading } = useBranchChannelsDetailed(branchId);
  const toggleChannel = useToggleBranchChannel();
  
  // Get branch info
  const { data: branch } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: async () => {
      if (!branchId) return null;
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('id', branchId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!branchId,
  });
  
  // Count products per channel
  const { data: productCounts } = useQuery({
    queryKey: ['channel-product-counts', branchId],
    queryFn: async () => {
      if (!branchId) return {};
      
      const { data, error } = await supabase
        .from('branch_product_channel_availability')
        .select('channel_id, is_available')
        .eq('branch_id', branchId);
      
      if (error) throw error;
      
      // Count available products per channel
      const counts: Record<string, number> = {};
      data.forEach(item => {
        if (item.is_available) {
          counts[item.channel_id] = (counts[item.channel_id] || 0) + 1;
        }
      });
      
      return counts;
    },
    enabled: !!branchId,
  });

  const handleToggle = async (channelId: string, currentlyEnabled: boolean) => {
    if (!branchId) return;
    
    await toggleChannel.mutateAsync({
      branchId,
      channelId,
      isEnabled: !currentlyEnabled,
    });
  };

  const getChannelIcon = (iconName: string | null) => {
    const Icon = CHANNEL_ICONS[iconName || 'Globe'] || Globe;
    return Icon;
  };

  const getDeliveryModes = (channel: NonNullable<typeof branchChannels>[0]['channel']) => {
    const modes: string[] = [];
    if (channel.allows_delivery) modes.push('Delivery');
    if (channel.allows_takeaway) modes.push('Take Away');
    if (channel.allows_dine_in) modes.push('Salón');
    return modes;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Canales de Venta</h1>
        <p className="text-muted-foreground">
          Activa o desactiva los canales de venta para {branch?.name || 'esta sucursal'}
        </p>
      </div>

      {/* Channels Grid */}
      <div className="grid gap-4">
        {branchChannels?.map(bc => {
          const channel = bc.channel;
          const Icon = getChannelIcon(channel.icon);
          const modes = getDeliveryModes(channel);
          const productCount = productCounts?.[channel.id] || 0;
          const needsIntegration = channel.requires_integration && !bc.config?.configured;
          
          return (
            <Card 
              key={bc.id} 
              className={!bc.is_enabled ? 'opacity-60 bg-muted/30' : ''}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${channel.color}15` }}
                  >
                    <Icon 
                      className="w-7 h-7" 
                      style={{ color: channel.color || undefined }}
                    />
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{channel.name}</h3>
                      {bc.is_enabled && (
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-0">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Activo
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {modes.map(mode => (
                        <Badge key={mode} variant="outline" className="text-xs">
                          {mode}
                        </Badge>
                      ))}
                    </div>
                    
                    {bc.is_enabled ? (
                      <p className="text-sm text-muted-foreground">
                        {productCount} productos activos en este canal
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Canal desactivado
                      </p>
                    )}
                    
                    {channel.requires_integration && (
                      <div className="mt-2">
                        {needsIntegration ? (
                          <div className="flex items-center gap-2 text-amber-600">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm">Requiere configurar integración</span>
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <Settings2 className="w-3 h-3 mr-1" />
                            Integración configurada
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2">
                    <Switch 
                      checked={bc.is_enabled}
                      onCheckedChange={() => handleToggle(channel.id, bc.is_enabled)}
                      disabled={toggleChannel.isPending}
                    />
                    
                    {channel.requires_integration && bc.is_enabled && (
                      <Button variant="outline" size="sm">
                        <Settings2 className="w-4 h-4 mr-1.5" />
                        Configurar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Help Card */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">¿Qué son los canales?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Los canales representan las diferentes vías por las que recibes pedidos. 
            Puedes activar o desactivar cada canal según tus necesidades operativas.
          </p>
          <p className="mt-2">
            Los productos disponibles en cada canal se configuran desde la sección de 
            <strong> Disponibilidad</strong>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
