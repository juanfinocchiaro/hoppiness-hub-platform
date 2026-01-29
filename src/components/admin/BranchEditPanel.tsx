import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save, Loader2, MapPin, X, CheckCircle2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import BranchLocationMap from '@/components/maps/BranchLocationMap';

type Branch = Tables<'branches'>;

interface BranchEditPanelProps {
  branch: Branch;
  onSaved: () => void;
  onCancel: () => void;
}

export default function BranchEditPanel({ branch, onSaved, onCancel }: BranchEditPanelProps) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  
  // Datos básicos
  const [name, setName] = useState(branch.name || '');
  const [address, setAddress] = useState(branch.address || '');
  const [city, setCity] = useState(branch.city || '');
  const [phone, setPhone] = useState(branch.phone || '');
  const [email, setEmail] = useState(branch.email || '');
  const [latitude, setLatitude] = useState((branch as any).latitude?.toString() || '');
  const [longitude, setLongitude] = useState((branch as any).longitude?.toString() || '');
  
  // Mapa (on-demand)
  const [showMap, setShowMap] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('branches')
        .update({
          name,
          address,
          city,
          phone: phone || null,
          email: email || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
        } as any)
        .eq('id', branch.id);

      if (error) throw error;

      // Invalidar TODAS las queries de branches para sincronizar cache
      queryClient.invalidateQueries({ queryKey: ['admin-sidebar-branches'] });
      queryClient.invalidateQueries({ queryKey: ['accessible-branches-v2'] });
      queryClient.invalidateQueries({ queryKey: ['branch-detail'] });

      toast.success('Sucursal actualizada');
      onSaved();
    } catch (error) {
      console.error('Error saving branch:', error);
      toast.error('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Manantiales"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="351-1234567"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="address">Dirección *</Label>
              {latitude && longitude && (
                <span className="flex items-center gap-1 text-xs text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Ubicado
                </span>
              )}
            </div>
            {!showMap && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowMap(true)}
                className="gap-1.5"
              >
                <MapPin className="h-3.5 w-3.5" />
                Ubicar en mapa
              </Button>
            )}
          </div>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Dirección completa"
          />
          {showMap && (
            <div className="space-y-2 mt-2">
              <BranchLocationMap
                address={address}
                city={city}
                latitude={latitude}
                longitude={longitude}
                onLocationChange={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowMap(false)}
                className="gap-1.5"
              >
                <X className="h-3 w-3" />
                Cerrar mapa
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">Ciudad / Zona</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Córdoba"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="local@hoppiness.com"
            />
          </div>
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
