import { useState } from 'react';
import { useChannels, useChannelStats, useCreateChannel, useUpdateChannel, useDeleteChannel } from '@/hooks/useChannels';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Settings2, Trash2, Globe, Monitor, Bike, MessageCircle, CreditCard, Utensils, Phone, ShoppingBag, Truck, Store } from 'lucide-react';
import type { Channel, ChannelType, ChannelFormData } from '@/types/channels';

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

const CHANNEL_TYPES: { value: ChannelType; label: string }[] = [
  { value: 'pos', label: 'Punto de Venta' },
  { value: 'direct', label: 'Directo (Web/App)' },
  { value: 'aggregator', label: 'Agregador (Rappi, PedidosYa)' },
  { value: 'messaging', label: 'Mensajería (WhatsApp)' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'other', label: 'Otro' },
];

const INTEGRATION_TYPES = [
  { value: 'rappi', label: 'Rappi' },
  { value: 'pedidosya', label: 'PedidosYa' },
  { value: 'mercadopago', label: 'MercadoPago' },
  { value: 'whatsapp', label: 'WhatsApp Business' },
];

const DEFAULT_FORM: ChannelFormData = {
  name: '',
  slug: '',
  description: '',
  channel_type: 'direct',
  allows_delivery: false,
  allows_takeaway: false,
  allows_dine_in: false,
  requires_integration: false,
  integration_type: '',
  icon: 'Globe',
  color: '#3b82f6',
  is_active: true,
  display_order: 0,
};

export default function Channels() {
  const { data: channels, isLoading } = useChannels();
  const { data: stats } = useChannelStats();
  const createChannel = useCreateChannel();
  const updateChannel = useUpdateChannel();
  const deleteChannel = useDeleteChannel();
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [formData, setFormData] = useState<ChannelFormData>(DEFAULT_FORM);
  const [deleteDialog, setDeleteDialog] = useState<Channel | null>(null);

  const handleOpenCreate = () => {
    setEditingChannel(null);
    setFormData(DEFAULT_FORM);
    setFormOpen(true);
  };

  const handleOpenEdit = (channel: Channel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      slug: channel.slug,
      description: channel.description || '',
      channel_type: channel.channel_type,
      allows_delivery: channel.allows_delivery,
      allows_takeaway: channel.allows_takeaway,
      allows_dine_in: channel.allows_dine_in,
      requires_integration: channel.requires_integration,
      integration_type: channel.integration_type || '',
      icon: channel.icon || 'Globe',
      color: channel.color || '#3b82f6',
      is_active: channel.is_active,
      display_order: channel.display_order,
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (editingChannel) {
      await updateChannel.mutateAsync({ id: editingChannel.id, ...formData });
    } else {
      await createChannel.mutateAsync(formData);
    }
    setFormOpen(false);
  };

  const handleDelete = async () => {
    if (deleteDialog) {
      await deleteChannel.mutateAsync(deleteDialog.id);
      setDeleteDialog(null);
    }
  };

  const handleToggleActive = async (channel: Channel) => {
    await updateChannel.mutateAsync({ 
      id: channel.id, 
      is_active: !channel.is_active 
    });
  };

  const getChannelIcon = (iconName: string | null) => {
    const Icon = CHANNEL_ICONS[iconName || 'Globe'] || Globe;
    return Icon;
  };

  const getTypeLabel = (type: ChannelType) => {
    return CHANNEL_TYPES.find(t => t.value === type)?.label || type;
  };

  const getDeliveryModes = (channel: Channel) => {
    const modes: string[] = [];
    if (channel.allows_delivery) modes.push('Delivery');
    if (channel.allows_takeaway) modes.push('Take Away');
    if (channel.allows_dine_in) modes.push('Salón');
    return modes.length > 0 ? modes.join(', ') : 'Ninguno';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Canales de Venta</h1>
          <p className="text-muted-foreground text-sm">
            Configura los canales por donde se reciben pedidos
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Canal
        </Button>
      </div>

      {/* Channel List */}
      <div className="grid gap-4">
        {channels?.map(channel => {
          const Icon = getChannelIcon(channel.icon);
          const channelStats = stats?.[channel.id];
          
          return (
            <Card key={channel.id} className={!channel.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${channel.color}20` }}
                  >
                    <Icon 
                      className="w-6 h-6" 
                      style={{ color: channel.color || undefined }}
                    />
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{channel.name}</h3>
                      {channel.requires_integration && (
                        <Badge variant="outline" className="text-xs">
                          <Settings2 className="w-3 h-3 mr-1" />
                          Requiere integración
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Tipo: {getTypeLabel(channel.channel_type)} • {getDeliveryModes(channel)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {channelStats?.enabled || 0} sucursales usando
                    </p>
                  </div>
                  
                  {/* Status & Actions */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {channel.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                      <Switch 
                        checked={channel.is_active}
                        onCheckedChange={() => handleToggleActive(channel)}
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleOpenEdit(channel)}
                    >
                      Editar
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteDialog(channel)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingChannel ? 'Editar Canal' : 'Nuevo Canal'}
            </DialogTitle>
            <DialogDescription>
              Configura los datos del canal de venta
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre del Canal</Label>
              <Input 
                id="name"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: WhatsApp"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="slug">Slug (identificador único)</Label>
              <Input 
                id="slug"
                value={formData.slug}
                onChange={e => setFormData(prev => ({ 
                  ...prev, 
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') 
                }))}
                placeholder="Ej: whatsapp"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea 
                id="description"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción opcional..."
                rows={2}
              />
            </div>
            
            <div className="grid gap-2">
              <Label>Tipo de Canal</Label>
              <Select 
                value={formData.channel_type} 
                onValueChange={(v: ChannelType) => setFormData(prev => ({ ...prev, channel_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label>Modos de Entrega Permitidos</Label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={formData.allows_delivery}
                    onChange={e => setFormData(prev => ({ ...prev, allows_delivery: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Delivery</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={formData.allows_takeaway}
                    onChange={e => setFormData(prev => ({ ...prev, allows_takeaway: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Take Away</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={formData.allows_dine_in}
                    onChange={e => setFormData(prev => ({ ...prev, allows_dine_in: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Comer en Local</span>
                </label>
              </div>
            </div>
            
            <div className="grid gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={formData.requires_integration}
                  onChange={e => setFormData(prev => ({ ...prev, requires_integration: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm font-medium">Requiere integración técnica</span>
              </label>
              
              {formData.requires_integration && (
                <Select 
                  value={formData.integration_type} 
                  onValueChange={v => setFormData(prev => ({ ...prev, integration_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de integración" />
                  </SelectTrigger>
                  <SelectContent>
                    {INTEGRATION_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Icono</Label>
                <Select 
                  value={formData.icon} 
                  onValueChange={v => setFormData(prev => ({ ...prev, icon: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(CHANNEL_ICONS).map(iconName => {
                      const Icon = CHANNEL_ICONS[iconName];
                      return (
                        <SelectItem key={iconName} value={iconName}>
                          <span className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {iconName}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex gap-2">
                  <Input 
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-12 h-9 p-1"
                  />
                  <Input 
                    value={formData.color}
                    onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="flex-1"
                    placeholder="#3b82f6"
                  />
                </div>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="display_order">Orden de visualización</Label>
              <Input 
                id="display_order"
                type="number"
                value={formData.display_order}
                onChange={e => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                min={0}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.name || !formData.slug || createChannel.isPending || updateChannel.isPending}
            >
              {editingChannel ? 'Guardar Cambios' : 'Crear Canal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar canal "{deleteDialog?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el canal y todas sus configuraciones por sucursal. 
              Los productos asociados perderán este canal. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
