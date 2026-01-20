import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save, Loader2, MapPin, X, CheckCircle2 } from 'lucide-react';
import BranchLocationMap from '@/components/maps/BranchLocationMap';

interface BranchCreatePanelProps {
  onCreated: () => void;
  onCancel: () => void;
}

export default function BranchCreatePanel({ onCreated, onCancel }: BranchCreatePanelProps) {
  const [saving, setSaving] = useState(false);
  
  // Datos básicos
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  // Mapa (on-demand)
  const [showMap, setShowMap] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    if (!address.trim()) {
      toast.error('La dirección es requerida');
      return;
    }
    if (!city.trim()) {
      toast.error('La ciudad es requerida');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('branches')
        .insert({
          name: name.trim(),
          address: address.trim(),
          city: city.trim(),
          phone: phone || null,
          email: email || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          is_active: isActive,
        } as any);

      if (error) throw error;

      toast.success('Sucursal creada');
      onCreated();
    } catch (error) {
      console.error('Error creating branch:', error);
      toast.error('Error al crear la sucursal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="new-name">Nombre *</Label>
          <Input
            id="new-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Villa Allende"
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-phone">Teléfono</Label>
          <Input
            id="new-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="351-1234567"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="new-address">Dirección *</Label>
            {latitude && longitude && (
              <span className="flex items-center gap-1 text-xs text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Ubicado en el mapa
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
              Ubicar en el mapa
            </Button>
          )}
        </div>
        <Input
          id="new-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Av. Principal 1234, Local 1"
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
          <Label htmlFor="new-city">Ciudad / Zona *</Label>
          <Input
            id="new-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Córdoba"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-email">Email</Label>
          <Input
            id="new-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="local@hoppiness.com"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 py-2">
        <Switch checked={isActive} onCheckedChange={setIsActive} />
        <Label>Sucursal activa</Label>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Crear Sucursal
        </Button>
      </div>
    </div>
  );
}
