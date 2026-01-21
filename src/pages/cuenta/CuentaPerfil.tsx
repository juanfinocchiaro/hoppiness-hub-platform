import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function CuentaPerfil() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Fetch profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (data: { full_name: string; phone: string }) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          phone: data.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success('Perfil actualizado');
    },
    onError: (error) => {
      toast.error('Error al actualizar el perfil');
      console.error(error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({ full_name: fullName, phone });
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <PublicHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Link to="/cuenta">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Mi Perfil</h1>
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="p-8 flex justify-center">
                <HoppinessLoader size="md" />
              </CardContent>
            </Card>
          ) : (
            <form onSubmit={handleSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle>Datos personales</CardTitle>
                  <CardDescription>
                    Información de tu cuenta
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      El email no se puede modificar
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nombre completo</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Tu nombre"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="351-1234567"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={updateProfile.isPending}
                  >
                    {updateProfile.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Guardar cambios
                  </Button>
                </CardContent>
              </Card>
            </form>
          )}

          {/* Account Stats */}
          {profile && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estadísticas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{profile.total_orders || 0}</p>
                    <p className="text-sm text-muted-foreground">Pedidos</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {new Intl.NumberFormat('es-AR', {
                        style: 'currency',
                        currency: 'ARS',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(profile.total_spent || 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Total gastado</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      
      <PublicFooter />
    </div>
  );
}
