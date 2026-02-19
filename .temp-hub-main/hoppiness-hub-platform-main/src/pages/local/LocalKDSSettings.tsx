import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { handleError } from '@/lib/errorHandler';
import { ChefHat, Volume2, Bell, Palette, Save, Clock } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;
type KDSSettings = Tables<'kds_settings'>;

interface ContextType {
  branch: Branch;
}

const THEMES = [
  { value: 'dark', label: 'Oscuro' },
  { value: 'light', label: 'Claro' },
  { value: 'high-contrast', label: 'Alto Contraste' },
];

const FONT_SIZES = [
  { value: 'small', label: 'Pequeño' },
  { value: 'medium', label: 'Mediano' },
  { value: 'large', label: 'Grande' },
];

const COLORS = [
  { value: '#f97316', label: 'Naranja' },
  { value: '#22c55e', label: 'Verde' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#8b5cf6', label: 'Violeta' },
  { value: '#ef4444', label: 'Rojo' },
];

export default function LocalKDSSettings() {
  const { branch } = useOutletContext<ContextType>();
  const [settings, setSettings] = useState<Partial<KDSSettings>>({
    theme: 'dark',
    font_size: 'medium',
    primary_color: '#f97316',
    sound_enabled: true,
    sound_volume: 70,
    show_timer: true,
    alert_threshold_minutes: 10,
    auto_bump_enabled: false,
    auto_bump_minutes: 15,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [branch.id]);

  async function fetchSettings() {
    setLoading(true);
    const { data, error } = await supabase
      .from('kds_settings')
      .select('*')
      .eq('branch_id', branch.id)
      .single();

    if (data) {
      setSettings(data);
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('kds_settings')
        .upsert({
          branch_id: branch.id,
          ...settings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      toast.success('Configuración guardada');
    } catch (error) {
      handleError(error, { userMessage: 'Error al guardar', context: 'LocalKDSSettings.handleSave' });
    } finally {
      setSaving(false);
    }
  }

  const updateSetting = <K extends keyof KDSSettings>(key: K, value: KDSSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ChefHat className="w-6 h-6" />
            Configuración KDS
          </h1>
          <p className="text-muted-foreground">Personaliza el monitor de cocina</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Apariencia */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Apariencia
            </CardTitle>
            <CardDescription>Tema, colores y tipografía</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tema</Label>
              <Select
                value={settings.theme || 'dark'}
                onValueChange={(v) => updateSetting('theme', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THEMES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tamaño de Fuente</Label>
              <Select
                value={settings.font_size || 'medium'}
                onValueChange={(v) => updateSetting('font_size', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_SIZES.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Color Principal</Label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button
                    key={c.value}
                    className={`w-10 h-10 rounded-lg border-2 transition-transform ${
                      settings.primary_color === c.value 
                        ? 'border-foreground scale-110' 
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.value }}
                    onClick={() => updateSetting('primary_color', c.value)}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sonido */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="w-5 h-5" />
              Sonido
            </CardTitle>
            <CardDescription>Alertas sonoras para nuevos pedidos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Sonido Habilitado</Label>
              <Switch
                checked={settings.sound_enabled || false}
                onCheckedChange={(v) => updateSetting('sound_enabled', v)}
              />
            </div>

            {settings.sound_enabled && (
              <div className="space-y-2">
                <Label>Volumen: {settings.sound_volume}%</Label>
                <Slider
                  value={[settings.sound_volume || 70]}
                  onValueChange={([v]) => updateSetting('sound_volume', v)}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Temporizador
            </CardTitle>
            <CardDescription>Alertas de tiempo de preparación</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Mostrar Timer</Label>
              <Switch
                checked={settings.show_timer || false}
                onCheckedChange={(v) => updateSetting('show_timer', v)}
              />
            </div>

            <div className="space-y-2">
              <Label>Alerta después de (minutos)</Label>
              <Input
                type="number"
                min="1"
                max="60"
                value={settings.alert_threshold_minutes || 10}
                onChange={(e) => updateSetting('alert_threshold_minutes', parseInt(e.target.value) || 10)}
              />
              <p className="text-xs text-muted-foreground">
                El pedido se marcará en rojo después de este tiempo
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Auto-bump */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Auto-completar
            </CardTitle>
            <CardDescription>Completar pedidos automáticamente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Auto-completar Habilitado</Label>
              <Switch
                checked={settings.auto_bump_enabled || false}
                onCheckedChange={(v) => updateSetting('auto_bump_enabled', v)}
              />
            </div>

            {settings.auto_bump_enabled && (
              <div className="space-y-2">
                <Label>Completar después de (minutos)</Label>
                <Input
                  type="number"
                  min="5"
                  max="60"
                  value={settings.auto_bump_minutes || 15}
                  onChange={(e) => updateSetting('auto_bump_minutes', parseInt(e.target.value) || 15)}
                />
                <p className="text-xs text-muted-foreground">
                  Los pedidos se marcarán como listos automáticamente
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
