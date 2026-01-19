import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Store, MapPin, Clock, ArrowLeft, Truck, ShoppingBag, Users, Bike, Settings } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

type SalesChannel = {
  key: keyof Branch;
  label: string;
  icon: React.ReactNode;
};

const salesChannels: SalesChannel[] = [
  { key: 'delivery_enabled', label: 'Delivery', icon: <Truck className="w-4 h-4" /> },
  { key: 'takeaway_enabled', label: 'TakeAway', icon: <ShoppingBag className="w-4 h-4" /> },
  { key: 'dine_in_enabled', label: 'Atención Presencial', icon: <Users className="w-4 h-4" /> },
  { key: 'rappi_enabled', label: 'Rappi', icon: <Bike className="w-4 h-4" /> },
  { key: 'pedidosya_enabled', label: 'PedidosYa', icon: <Bike className="w-4 h-4" /> },
  { key: 'mercadopago_delivery_enabled', label: 'MP Delivery', icon: <Truck className="w-4 h-4" /> },
];

export default function BranchStatus() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingBranch, setUpdatingBranch] = useState<string | null>(null);
  const [updatingChannel, setUpdatingChannel] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase.from('branches').select('*').order('name');
      setBranches(data || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const toggleBranchActive = async (branch: Branch) => {
    setUpdatingBranch(branch.id);
    try {
      const { error } = await supabase
        .from('branches')
        .update({ is_active: !branch.is_active })
        .eq('id', branch.id);

      if (error) throw error;

      setBranches(branches.map(b => 
        b.id === branch.id ? { ...b, is_active: !b.is_active } : b
      ));
      toast.success(`${branch.name} ${!branch.is_active ? 'activada' : 'desactivada'}`);
    } catch (error) {
      toast.error('Error al actualizar sucursal');
    } finally {
      setUpdatingBranch(null);
    }
  };

  const toggleSalesChannel = async (branch: Branch, channelKey: keyof Branch) => {
    const updateKey = `${branch.id}-${channelKey}`;
    setUpdatingChannel(updateKey);
    try {
      const currentValue = branch[channelKey] as boolean;
      const { error } = await supabase
        .from('branches')
        .update({ [channelKey]: !currentValue })
        .eq('id', branch.id);

      if (error) throw error;

      setBranches(branches.map(b => 
        b.id === branch.id ? { ...b, [channelKey]: !currentValue } : b
      ));
      toast.success(`Canal actualizado para ${branch.name}`);
    } catch (error) {
      toast.error('Error al actualizar canal');
    } finally {
      setUpdatingChannel(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Modificar Estado</h1>
          <p className="text-muted-foreground">Controla el estado y canales de venta de cada sucursal</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {branches.map(branch => {
            const hasAnyChannelEnabled = salesChannels.some(ch => branch[ch.key] as boolean);
            
            return (
              <Card key={branch.id} className={!branch.is_active ? 'opacity-60' : ''}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        branch.is_active && hasAnyChannelEnabled 
                          ? 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        <Store className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-xl">{branch.name}</CardTitle>
                          {!branch.is_active && (
                            <Badge variant="destructive">Desactivada</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {branch.city}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {branch.opening_time?.slice(0, 5)} - {branch.closing_time?.slice(0, 5)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Sucursal Activa</span>
                      <Switch
                        checked={branch.is_active}
                        onCheckedChange={() => toggleBranchActive(branch)}
                        disabled={updatingBranch === branch.id}
                      />
                    </div>
                  </div>
                </CardHeader>
                
                {branch.is_active && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">Canales de venta habilitados:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {salesChannels.map(channel => {
                        const isEnabled = branch[channel.key] as boolean ?? false;
                        const updateKey = `${branch.id}-${channel.key}`;
                        const isUpdating = updatingChannel === updateKey;
                        
                        return (
                          <div 
                            key={channel.key}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                              isEnabled 
                                ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                                : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`${isEnabled ? 'text-green-600' : 'text-red-500'}`}>
                                {channel.icon}
                              </div>
                              <span className="text-xs font-medium">{channel.label}</span>
                            </div>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={() => toggleSalesChannel(branch, channel.key)}
                              disabled={isUpdating}
                              className="scale-75"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
