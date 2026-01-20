import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Instagram, Facebook, Twitter, Building2 } from 'lucide-react';

interface BrandSettingsData {
  id: string;
  name: string;
  slogan: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  twitter: string | null;
}

export default function BrandSettings() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<BrandSettingsData>>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ['brand-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_settings')
        .select('*')
        .single();
      if (error) throw error;
      return data as BrandSettingsData;
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<BrandSettingsData>) => {
      const { error } = await supabase
        .from('brand_settings')
        .update(data)
        .eq('id', settings?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-settings'] });
      toast.success('Datos de la marca actualizados');
    },
    onError: () => {
      toast.error('Error al guardar los cambios');
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleChange = (field: keyof BrandSettingsData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value || null }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Datos de la Marca</h1>
        <p className="text-muted-foreground">Configuración general de tu marca</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Información General
          </CardTitle>
          <CardDescription>Datos principales de la marca</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la marca *</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slogan">Slogan</Label>
              <Input
                id="slogan"
                value={formData.slogan || ''}
                onChange={(e) => handleChange('slogan', e.target.value)}
                placeholder="Ej: Culto al sabor"
              />
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-medium mb-4">Contacto</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email general</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="hola@hoppinessclub.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="351-1234567"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-medium mb-4">Redes Sociales</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="instagram" className="flex items-center gap-2">
                  <Instagram className="h-4 w-4" />
                  Instagram
                </Label>
                <Input
                  id="instagram"
                  value={formData.instagram || ''}
                  onChange={(e) => handleChange('instagram', e.target.value)}
                  placeholder="@hoppinessclub"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook" className="flex items-center gap-2">
                  <Facebook className="h-4 w-4" />
                  Facebook
                </Label>
                <Input
                  id="facebook"
                  value={formData.facebook || ''}
                  onChange={(e) => handleChange('facebook', e.target.value)}
                  placeholder="/hoppinessclub"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tiktok">TikTok</Label>
                <Input
                  id="tiktok"
                  value={formData.tiktok || ''}
                  onChange={(e) => handleChange('tiktok', e.target.value)}
                  placeholder="@hoppinessclub"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter" className="flex items-center gap-2">
                  <Twitter className="h-4 w-4" />
                  Twitter/X
                </Label>
                <Input
                  id="twitter"
                  value={formData.twitter || ''}
                  onChange={(e) => handleChange('twitter', e.target.value)}
                  placeholder="@hoppinessclub"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setFormData(settings || {})}
              disabled={updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
