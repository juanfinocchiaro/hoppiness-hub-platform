import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Loader2, 
  Mail, 
  Lock, 
  User, 
  CheckCircle, 
  XCircle,
  Store,
  Briefcase,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import logoWhite from '@/assets/logo-hoppiness-white.png';

interface Invitation {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  branch_id: string;
  branch_name?: string;
  inviter_name?: string;
  expires_at: string;
  accepted_at: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  empleado: 'Colaborador',
  cajero: 'Cajero',
  encargado: 'Encargado',
  franquiciado: 'Franquiciado',
  contador_local: 'Contador',
};

export default function AceptarInvitacion() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'check' | 'login' | 'register'>('check');
  const [processing, setProcessing] = useState(false);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Fetch invitation on mount
  useEffect(() => {
    if (token) {
      fetchInvitation();
    }
  }, [token]);

  // Auto-accept if user is already logged in
  useEffect(() => {
    if (user && invitation && !invitation.accepted_at) {
      acceptInvitation(user.id);
    }
  }, [user, invitation]);

  const fetchInvitation = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('user_invitations')
        .select(`
          id,
          email,
          full_name,
          role,
          branch_id,
          expires_at,
          accepted_at,
          invited_by
        `)
        .eq('token', token)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setError('Invitación no encontrada o expirada');
        setLoading(false);
        return;
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        setError('Esta invitación ha expirado');
        setLoading(false);
        return;
      }

      // Check if already accepted
      if (data.accepted_at) {
        setError('Esta invitación ya fue aceptada');
        setLoading(false);
        return;
      }

      // Get branch name
      const { data: branch } = await supabase
        .from('branches')
        .select('name')
        .eq('id', data.branch_id)
        .single();

      // Get inviter name
      const { data: inviter } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', data.invited_by)
        .single();

      setInvitation({
        ...data,
        branch_name: branch?.name || 'Sucursal',
        inviter_name: inviter?.full_name || 'Un administrador',
      });
      setEmail(data.email);
      setFullName(data.full_name || '');
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching invitation:', err);
      setError('Error al cargar la invitación');
      setLoading(false);
    }
  };

  const acceptInvitation = async (userId: string) => {
    if (!invitation) return;

    setProcessing(true);
    try {
      // Check if user already has a role
      const { data: existingRole } = await supabase
        .from('user_roles_v2')
        .select('id, branch_ids')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        // User already has role, add branch to their branch_ids
        const currentBranches = existingRole.branch_ids || [];
        if (!currentBranches.includes(invitation.branch_id)) {
          const { error: updateError } = await supabase
            .from('user_roles_v2')
            .update({
              branch_ids: [...currentBranches, invitation.branch_id],
              local_role: invitation.role as any,
            })
            .eq('id', existingRole.id);

          if (updateError) {
            console.error('Error updating role:', updateError);
          }
        }
      } else {
        // Create new role
        const { error: roleError } = await supabase
          .from('user_roles_v2')
          .insert({
            user_id: userId,
            local_role: invitation.role as any,
            branch_ids: [invitation.branch_id],
            is_active: true,
          });

        if (roleError) {
          console.error('Error creating role:', roleError);
        }
      }

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('user_invitations')
        .update({
          accepted_at: new Date().toISOString(),
          accepted_by: userId,
        })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      toast.success(`¡Bienvenido al equipo de ${invitation.branch_name}!`);
      
      // Redirect to local panel
      navigate(`/milocal/${invitation.branch_id}`);
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      toast.error('Error al aceptar la invitación');
    } finally {
      setProcessing(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      // useEffect will handle the rest
    } catch (err: any) {
      console.error('Login error:', err);
      toast.error(err.message || 'Error al iniciar sesión');
      setProcessing(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast.error('Ingresá tu nombre completo');
      return;
    }

    setProcessing(true);

    try {
      const { error } = await signUp(email, password, fullName.trim());

      if (error) throw error;

      // Auto-confirm should log user in automatically
      // If not, show message
      toast.success('Cuenta creada. Procesando tu acceso...');
      // useEffect will handle the rest when user is set
    } catch (err: any) {
      console.error('Register error:', err);
      toast.error(err.message || 'Error al crear la cuenta');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-background flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Invitación inválida</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link to="/">
              <Button>Ir al inicio</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (processing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-bold mb-2">Procesando...</h2>
            <p className="text-muted-foreground">Estamos configurando tu acceso</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <img src={logoWhite} alt="Hoppiness" className="w-10 h-10 object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl">¡Te invitaron al equipo!</CardTitle>
            <CardDescription className="mt-2">
              {invitation.inviter_name} te invitó a unirte
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Store className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Sucursal</div>
                <div className="font-medium">{invitation.branch_name}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Briefcase className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Rol</div>
                <Badge variant="secondary">{ROLE_LABELS[invitation.role] || invitation.role}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Expira</div>
                <div className="text-sm">{format(new Date(invitation.expires_at), "d 'de' MMMM, yyyy", { locale: es })}</div>
              </div>
            </div>
          </div>

          {mode === 'check' && (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">
                ¿Ya tenés una cuenta en Hoppiness?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => setMode('login')}>
                  Sí, iniciar sesión
                </Button>
                <Button onClick={() => setMode('register')}>
                  No, crear cuenta
                </Button>
              </div>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Iniciar sesión y aceptar
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setMode('check')}>
                Volver
              </Button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    placeholder="Juan Pérez"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Crear cuenta y aceptar
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setMode('check')}>
                Volver
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
