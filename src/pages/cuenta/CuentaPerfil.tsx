import { useAuth } from '@/hooks/useAuth';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Loader2, Key, Lock, Eye, EyeOff, Fingerprint, Camera, User, Calendar as CalendarIcon } from 'lucide-react';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function CuentaPerfil() {
  const { user } = useAuth();
  const { localRole } = usePermissionsV2();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
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
      setAvatarUrl(profile.avatar_url || null);
      if (profile.birth_date) {
        setBirthDate(new Date(profile.birth_date));
      }
    }
  }, [profile]);

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (data: { full_name: string; phone: string; birth_date?: string | null }) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          phone: data.phone,
          birth_date: data.birth_date,
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

  // Upload avatar
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede superar 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success('Foto actualizada');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Error al subir la foto');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

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
    updateProfile.mutate({ 
      full_name: fullName, 
      phone,
      birth_date: birthDate ? format(birthDate, 'yyyy-MM-dd') : null,
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
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
                    {/* Avatar Section */}
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="w-20 h-20">
                          <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                          <AvatarFallback className="text-lg bg-primary/10 text-primary">
                            {fullName ? getInitials(fullName) : <User className="w-8 h-8" />}
                          </AvatarFallback>
                        </Avatar>
                        {isUploadingAvatar && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingAvatar}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Cambiar foto
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">
                          JPG, PNG. Máximo 5MB.
                        </p>
                      </div>
                    </div>

                    <Separator />

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

                    {/* Birth Date */}
                    <div className="space-y-2">
                      <Label>Fecha de nacimiento</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !birthDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {birthDate ? (
                              format(birthDate, "d 'de' MMMM, yyyy", { locale: es })
                            ) : (
                              "Seleccionar fecha..."
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={birthDate}
                            onSelect={setBirthDate}
                            disabled={(date) => date > new Date() || date < new Date("1920-01-01")}
                            initialFocus
                            captionLayout="dropdown-buttons"
                            fromYear={1920}
                            toYear={new Date().getFullYear()}
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <p className="text-xs text-muted-foreground">
                        Tu cumpleaños aparecerá en el calendario de horarios
                      </p>
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

            </>
          )}
        </div>
      </main>
      
      <PublicFooter />
    </div>
  );
}
