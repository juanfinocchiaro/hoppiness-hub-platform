import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoleLandingV2 } from '@/hooks/useRoleLandingV2';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2, LogIn, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import logoHoppiness from '@/assets/logo-hoppiness-blue.png';
import { z } from 'zod';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'Mínimo 6 caracteres');

export default function Ingresar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, signIn, signUp } = useAuth();
  const { avatarInfo, loading: roleLoading } = useRoleLandingV2();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirigir usuarios autenticados a su landing ideal según su rol
  useEffect(() => {
    if (!loading && !roleLoading && user) {
      // Si venían de alguna página específica, respetar ese destino
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      if (from && from !== '/ingresar') {
        navigate(from, { replace: true });
        return;
      }
      
      // Ir a la landing ideal según el avatar/rol
      navigate(avatarInfo.landingPath, { replace: true });
    }
  }, [user, loading, roleLoading, avatarInfo.landingPath, navigate, location.state]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email o contraseña incorrectos');
      } else {
        toast.error(error.message);
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      if (!fullName.trim()) throw new Error('Nombre requerido');
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else if (err instanceof Error) {
        toast.error(err.message);
      }
      return;
    }

    setIsSubmitting(true);
    const { error } = await signUp(email, password, fullName);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Este email ya está registrado');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Cuenta creada exitosamente');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-accent">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <img src={logoHoppiness} alt="Hoppiness Club" className="w-24 h-24 object-contain rounded-full" />
          <p className="text-white/80 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/95 to-accent flex flex-col relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-accent/10 rounded-full blur-2xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6">
        <Link to="/">
          <Button variant="ghost" className="text-white/90 hover:text-white hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al inicio
          </Button>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md">
          {/* Logo Section */}
          <div className="text-center mb-8">
            <img src={logoHoppiness} alt="Hoppiness Club" className="w-24 h-24 mx-auto rounded-full shadow-2xl" />
          </div>

          {/* Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50">
            <div className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-foreground">Bienvenido</h2>
                <p className="text-muted-foreground mt-1">Acceso para el equipo Hoppiness</p>
              </div>

              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 p-1 rounded-xl">
                  <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
                    Iniciar Sesión
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
                    Registrarse
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="login" className="mt-0">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12 rounded-xl border-muted-foreground/20 focus:border-primary transition-colors"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-sm font-medium">Contraseña</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 rounded-xl border-muted-foreground/20 focus:border-primary transition-colors"
                        required
                      />
                    </div>
                    <div className="flex justify-end">
                      <Link 
                        to="/olvide-password" 
                        className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
                      >
                        ¿Olvidaste tu contraseña?
                      </Link>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-12 rounded-xl text-base font-semibold bg-primary hover:bg-primary/90 transition-all shadow-lg shadow-primary/25" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <LogIn className="w-5 h-5 mr-2" />
                      )}
                      Ingresar
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup" className="mt-0">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-sm font-medium">Nombre completo</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Juan Pérez"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-12 rounded-xl border-muted-foreground/20 focus:border-primary transition-colors"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12 rounded-xl border-muted-foreground/20 focus:border-primary transition-colors"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-sm font-medium">Contraseña</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 rounded-xl border-muted-foreground/20 focus:border-primary transition-colors"
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-12 rounded-xl text-base font-semibold bg-primary hover:bg-primary/90 transition-all shadow-lg shadow-primary/25" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <UserPlus className="w-5 h-5 mr-2" />
                      )}
                      Crear cuenta
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Footer text */}
          <p className="text-center text-white/40 text-xs mt-6">
            © 2024 Hoppiness Club. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
