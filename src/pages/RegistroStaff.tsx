import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Loader2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  CreditCard, 
  FileText,
  Upload,
  Shield,
  Building2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface InvitationData {
  id: string;
  email: string;
  role: string;
  branch_id: string;
  status: string;
  expires_at: string;
  branch?: {
    name: string;
  };
}

const roleLabels: Record<string, string> = {
  encargado: 'Encargado',
  cajero: 'Cajero',
  kds: 'KDS',
};

export default function RegistroStaff() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    password: '',
    confirmPassword: '',
    phone: '',
    dni: '',
    address: '',
    birth_date: '',
    cuit: '',
    cbu: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });

  const [dniFront, setDniFront] = useState<File | null>(null);
  const [dniBack, setDniBack] = useState<File | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    async function verifyInvitation() {
      if (!token) {
        setError('Token de invitación no proporcionado');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('staff_invitations')
          .select(`
            id,
            email,
            role,
            branch_id,
            status,
            expires_at,
            branches:branch_id (name)
          `)
          .eq('token', token)
          .single();

        if (fetchError || !data) {
          setError('Invitación no encontrada o inválida');
          setLoading(false);
          return;
        }

        // Check if expired
        if (new Date(data.expires_at) < new Date()) {
          setError('Esta invitación ha expirado');
          setLoading(false);
          return;
        }

        // Check if already used
        if (data.status !== 'pending') {
          setError('Esta invitación ya fue utilizada');
          setLoading(false);
          return;
        }

        setInvitation({
          ...data,
          branch: data.branches as any,
        });
      } catch (err) {
        setError('Error al verificar la invitación');
      } finally {
        setLoading(false);
      }
    }

    verifyInvitation();
  }, [token]);

  const handleFileChange = (type: 'front' | 'back', file: File | null) => {
    if (type === 'front') {
      setDniFront(file);
    } else {
      setDniBack(file);
    }
  };

  const uploadFile = async (file: File, userId: string, type: 'front' | 'back') => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/dni-${type}.${fileExt}`;
    
    const { error: uploadError, data } = await supabase.storage
      .from('staff-documents')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('staff-documents')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invitation) return;

    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!acceptedTerms) {
      toast.error('Debés aceptar los términos y condiciones');
      return;
    }

    if (!dniFront || !dniBack) {
      toast.error('Debés subir las fotos del DNI (frente y dorso)');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: formData.full_name,
            invitation_token: token,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          toast.error('Este email ya está registrado. Intentá iniciar sesión.');
        } else {
          throw signUpError;
        }
        return;
      }

      if (!authData.user) {
        throw new Error('Error al crear usuario');
      }

      const userId = authData.user.id;

      // 2. Upload DNI photos
      let dniFrontUrl = '';
      let dniBackUrl = '';
      
      try {
        dniFrontUrl = await uploadFile(dniFront, userId, 'front');
        dniBackUrl = await uploadFile(dniBack, userId, 'back');
      } catch (uploadError) {
        console.error('Error uploading files:', uploadError);
        // Continue anyway, files can be uploaded later
      }

      // 3. Update profile with all data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          dni: formData.dni,
          address: formData.address,
          birth_date: formData.birth_date || null,
          cuit: formData.cuit,
          cbu: formData.cbu,
          emergency_contact_name: formData.emergency_contact_name,
          emergency_contact_phone: formData.emergency_contact_phone,
          dni_front_url: dniFrontUrl,
          dni_back_url: dniBackUrl,
          accepted_terms_at: new Date().toISOString(),
          invitation_token: token,
        })
        .eq('user_id', userId);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      // 4. Assign role - delete existing and insert new
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: invitation.role as 'encargado' | 'cajero' | 'kds',
        });

      if (roleError) {
        console.error('Role assignment error:', roleError);
      }

      // 5. Assign branch permissions
      const { error: permError } = await supabase
        .from('branch_permissions')
        .insert({
          user_id: userId,
          branch_id: invitation.branch_id,
          can_manage_orders: true,
          can_manage_products: invitation.role === 'encargado',
          can_manage_inventory: invitation.role === 'encargado',
          can_view_reports: invitation.role === 'encargado',
          can_manage_staff: false,
        });

      if (permError) {
        console.error('Permission assignment error:', permError);
      }

      // 6. Grant role defaults
      await supabase.rpc('grant_role_defaults', {
        _user_id: userId,
        _branch_id: invitation.branch_id,
        _role: invitation.role as 'encargado' | 'cajero' | 'kds',
      });

      // 7. Mark invitation as accepted
      await supabase
        .from('staff_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by: userId,
        })
        .eq('id', invitation.id);

      toast.success('¡Registro completado! Revisá tu email para confirmar la cuenta.');
      navigate('/auth?registered=true');

    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Error al completar el registro');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Invitación Inválida</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => navigate('/')}>Volver al inicio</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-primary/10 p-4 rounded-full">
                <User className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Completá tu Registro</CardTitle>
            <CardDescription>
              Te invitaron a unirte al equipo de{' '}
              <span className="font-semibold text-foreground">
                {invitation?.branch?.name}
              </span>{' '}
              como{' '}
              <Badge variant="secondary">
                {roleLabels[invitation?.role || ''] || invitation?.role}
              </Badge>
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Account Info */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Datos de Cuenta
                </h3>
                
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={invitation?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="password">Contraseña *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      required
                      minLength={6}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Personal Info */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Datos Personales
                </h3>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="full_name">Nombre Completo *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="dni">DNI *</Label>
                    <Input
                      id="dni"
                      value={formData.dni}
                      onChange={(e) => setFormData(prev => ({ ...prev, dni: e.target.value }))}
                      required
                      placeholder="12345678"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="birth_date">Fecha de Nacimiento *</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Teléfono *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      required
                      placeholder="+54 11 1234-5678"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="cuit">CUIL/CUIT *</Label>
                    <Input
                      id="cuit"
                      value={formData.cuit}
                      onChange={(e) => setFormData(prev => ({ ...prev, cuit: e.target.value }))}
                      required
                      placeholder="20-12345678-9"
                    />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <Label htmlFor="address">Dirección Completa *</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      required
                      placeholder="Calle 123, Ciudad, Provincia"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Financial Info */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Datos Bancarios
                </h3>
                
                <div>
                  <Label htmlFor="cbu">CBU o Alias *</Label>
                  <Input
                    id="cbu"
                    value={formData.cbu}
                    onChange={(e) => setFormData(prev => ({ ...prev, cbu: e.target.value }))}
                    required
                    placeholder="CBU o alias de cuenta bancaria"
                  />
                </div>
              </div>

              <Separator />

              {/* Emergency Contact */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Contacto de Emergencia
                </h3>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="emergency_contact_name">Nombre *</Label>
                    <Input
                      id="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="emergency_contact_phone">Teléfono *</Label>
                    <Input
                      id="emergency_contact_phone"
                      type="tel"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* DNI Photos */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Fotos del DNI
                </h3>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>DNI Frente *</Label>
                    <div className="mt-2">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        {dniFront ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="text-sm">{dniFront.name}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center text-muted-foreground">
                            <Upload className="h-8 w-8 mb-2" />
                            <span className="text-sm">Subir foto frente</span>
                          </div>
                        )}
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => handleFileChange('front', e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                  </div>
                  
                  <div>
                    <Label>DNI Dorso *</Label>
                    <div className="mt-2">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        {dniBack ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="text-sm">{dniBack.name}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center text-muted-foreground">
                            <Upload className="h-8 w-8 mb-2" />
                            <span className="text-sm">Subir foto dorso</span>
                          </div>
                        )}
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => handleFileChange('back', e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Terms */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                />
                <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                  Acepto el{' '}
                  <a href="/reglamento-interno" target="_blank" className="text-primary underline">
                    Reglamento Interno
                  </a>{' '}
                  y los{' '}
                  <a href="/terminos" target="_blank" className="text-primary underline">
                    Términos y Condiciones
                  </a>{' '}
                  de trabajo.
                </Label>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  'Completar Registro'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
