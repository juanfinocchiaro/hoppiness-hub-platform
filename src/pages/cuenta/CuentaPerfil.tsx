import { useAuth } from '@/hooks/useAuth';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Loader2, Key, Lock, Eye, EyeOff, Fingerprint } from 'lucide-react';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

export default function CuentaPerfil() {
  const { user } = useAuth();
  const { localRole } = usePermissionsV2();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  // PIN de fichaje state
  const [clockPin, setClockPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  
  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const isEmployee = !!localRole;

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
      setClockPin(profile.clock_pin || '');
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

  // Update clock PIN mutation
  const updateClockPin = useMutation({
    mutationFn: async (pin: string) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase
        .from('profiles')
        .update({
          clock_pin: pin || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success('PIN de fichaje actualizado');
    },
    onError: (error) => {
      toast.error('Error al actualizar el PIN');
      console.error(error);
    },
  });

  // Change password mutation
  const changePassword = useMutation({
    mutationFn: async ({ newPassword }: { newPassword: string }) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Contraseña actualizada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al cambiar la contraseña');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({ full_name: fullName, phone });
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (clockPin && clockPin.length !== 4) {
      toast.error('El PIN debe tener 4 dígitos');
      return;
    }
    if (clockPin && !/^\d{4}$/.test(clockPin)) {
      toast.error('El PIN debe contener solo números');
      return;
    }
    updateClockPin.mutate(clockPin);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    changePassword.mutate({ newPassword });
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
            <>
              {/* Datos personales */}
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

              {/* PIN de fichaje - Solo para empleados */}
              {isEmployee && (
                <form onSubmit={handlePinSubmit}>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Fingerprint className="w-5 h-5 text-primary" />
                        <CardTitle>PIN de Fichaje</CardTitle>
                      </div>
                      <CardDescription>
                        Este PIN de 4 dígitos te permite fichar entrada y salida en tu sucursal
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="clockPin">PIN (4 dígitos)</Label>
                        <div className="relative">
                          <Input
                            id="clockPin"
                            type={showPin ? 'text' : 'password'}
                            value={clockPin}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                              setClockPin(value);
                            }}
                            placeholder="••••"
                            maxLength={4}
                            className="pr-10 text-center text-2xl tracking-[0.5em] font-mono"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPin(!showPin)}
                          >
                            {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {profile?.clock_pin ? 'Ya tienes un PIN configurado' : 'Aún no tienes PIN configurado'}
                        </p>
                      </div>

                      <Button 
                        type="submit" 
                        variant="outline"
                        className="w-full"
                        disabled={updateClockPin.isPending || clockPin.length !== 4}
                      >
                        {updateClockPin.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Key className="w-4 h-4 mr-2" />
                        )}
                        {profile?.clock_pin ? 'Actualizar PIN' : 'Crear PIN'}
                      </Button>
                    </CardContent>
                  </Card>
                </form>
              )}

              {/* Cambiar contraseña */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-5 h-5 text-muted-foreground" />
                      <CardTitle>Seguridad</CardTitle>
                    </div>
                    {!showPasswordSection && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowPasswordSection(true)}
                      >
                        Cambiar contraseña
                      </Button>
                    )}
                  </div>
                </CardHeader>
                
                {showPasswordSection && (
                  <CardContent>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">Nueva contraseña</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showPasswords ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPasswords(!showPasswords)}
                          >
                            {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                        <Input
                          id="confirmPassword"
                          type={showPasswords ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repetir contraseña"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant="ghost"
                          className="flex-1"
                          onClick={() => {
                            setShowPasswordSection(false);
                            setNewPassword('');
                            setConfirmPassword('');
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          type="submit" 
                          className="flex-1"
                          disabled={changePassword.isPending || !newPassword || !confirmPassword}
                        >
                          {changePassword.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Lock className="w-4 h-4 mr-2" />
                          )}
                          Guardar
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                )}
              </Card>

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
            </>
          )}
        </div>
      </main>
      
      <PublicFooter />
    </div>
  );
}
