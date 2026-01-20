import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowRight,
  Check,
  Users,
  Award,
  TrendingUp,
  Palette,
  Package,
  HeadphonesIcon,
  Store,
  MapPin
} from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import logoHoppiness from '@/assets/logo-hoppiness.png';
import heroBurger from '@/assets/hero-burger.jpg';
import local1 from '@/assets/local-1.jpg';
import designAmbiente from '@/assets/design-ambiente.jpg';

export default function Franquicias() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    message: ''
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: '¡Solicitud enviada!',
      description: 'Nos pondremos en contacto contigo pronto.',
    });
    setFormData({ name: '', email: '', phone: '', city: '', message: '' });
  };

  const benefits = [
    {
      icon: Award,
      title: 'Marca Posicionada',
      description: 'Referente de calidad en Córdoba con concepto de éxito probado.'
    },
    {
      icon: Package,
      title: 'Productos Premium',
      description: 'Calidad sostenida por años y de enorme aceptación.'
    },
    {
      icon: Palette,
      title: 'Diseño de Marca',
      description: 'Proyecto de arquitectura que garantiza nuestra fuerte identidad.'
    },
    {
      icon: HeadphonesIcon,
      title: 'Apoyo Continuo',
      description: 'Capacitación, entrenamiento y comunicación para tu club.'
    },
    {
      icon: TrendingUp,
      title: 'Negocio No Esclavizante',
      description: 'Alta eficiencia operativa con menor personal.'
    },
    {
      icon: Store,
      title: 'Provisión Centralizada',
      description: 'Insumos críticos: carne, panes, salsas, packaging.'
    }
  ];

  const requirements = [
    'Respeto absoluto por nuestro producto, recetas, insumos y gramajes.',
    'Perfil comercial y experiencia en comercio.',
    'Disponibilidad de tiempo y ganas de involucrarse en el gerenciamiento.',
    'Capacidad de administración del negocio y manejo de RR.HH.',
    'Buena predisposición para seguir los lineamientos de nuestra franquicia.'
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      {/* Hero */}
      <section className="relative h-[60vh] min-h-[400px] flex items-center">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBurger})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/85 to-primary/70" />
        
        <div className="relative container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-accent/20 text-white px-4 py-2 rounded-full mb-6">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">Programa de Franquicias</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 font-brand">
            NUNCA FUE TAN SIMPLE<br />
            <span className="text-accent">TENER TU PROPIO NEGOCIO</span>
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Te presentamos un negocio gastronómico de excelente facturación y extrema simplicidad.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-accent text-accent-foreground py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-4xl font-black font-brand">600+</p>
              <p className="text-sm opacity-90">Hamburguesas/día</p>
            </div>
            <div>
              <p className="text-4xl font-black font-brand">5</p>
              <p className="text-sm opacity-90">Sucursales activas</p>
            </div>
            <div>
              <p className="text-4xl font-black font-brand">100%</p>
              <p className="text-sm opacity-90">Cordobesa</p>
            </div>
            <div>
              <p className="text-4xl font-black font-brand">2018</p>
              <p className="text-sm opacity-90">Año de fundación</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Concept */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-black mb-6 font-brand text-primary">
                SOMOS UN CLUB DE HAMBURGUESAS
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Nos distinguimos por un producto de sabor y calidad inigualable, con un estilo de servicio club 
                descontracturado en espacios diseñados con muchísima onda.
              </p>
              <p className="text-lg text-muted-foreground mb-6">
                El pilar de nuestro éxito está en la calidad y el sabor inigualable de nuestras hamburguesas. 
                Seleccionamos las mejores materias primas del mercado, priorizando la calidad antes que el costo.
              </p>
              <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl">
                <Award className="w-12 h-12 text-primary" />
                <div>
                  <p className="font-bold">Receta Registrada RMA</p>
                  <p className="text-sm text-muted-foreground">Cumplimiento del Código Alimentario Argentino</p>
                </div>
              </div>
            </div>
            <div>
              <img 
                src={local1} 
                alt="Interior Hoppiness" 
                className="rounded-2xl shadow-elevated w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-20 px-4 bg-secondary/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-black mb-4 font-brand text-center text-primary">
            ¿POR QUÉ ELEGIRNOS?
          </h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">
            10 razones para sumarte al club
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, i) => (
              <Card key={i} className="shadow-card hover:shadow-elevated transition-all hover:-translate-y-1">
                <CardHeader className="pb-2">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <benefit.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Ideal Profile */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <img 
                src={designAmbiente} 
                alt="Diseño Hoppiness" 
                className="rounded-2xl shadow-elevated w-full"
              />
            </div>
            <div>
              <h2 className="text-4xl font-black mb-6 font-brand text-primary">
                PERFIL DEL FRANQUICIADO
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Buscamos personas jóvenes y apasionadas por nuestro concepto. 
                Fanáticos de nuestras hamburguesas que tengan intenciones de crecer junto a nuestra marca.
              </p>
              
              <div className="space-y-4">
                {requirements.map((req, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-accent" />
                    </div>
                    <p className="text-muted-foreground">{req}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Expansion Vision */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-black mb-6 font-brand">
            VISIÓN DE EXPANSIÓN
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8">
            Buscamos cubrir los barrios de Córdoba donde aún no tenemos presencia. 
            No buscamos una expansión masiva. Preferimos crecer sostenidamente, 
            siendo extremadamente cuidadosos en la selección de los franquiciados que nos acompañen.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {['Zona Norte', 'General Paz', 'Arguello', 'Cerro de las Rosas'].map((zone) => (
              <div key={zone} className="flex items-center gap-2 bg-primary-foreground/10 px-4 py-2 rounded-full">
                <MapPin className="w-4 h-4" />
                <span>{zone}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-20 px-4" id="contacto">
        <div className="container mx-auto max-w-2xl">
          <h2 className="text-4xl font-black mb-4 font-brand text-center text-primary">
            SUMATE AL CLUB
          </h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">
            Completá el formulario y nos pondremos en contacto
          </p>

          <Card className="shadow-elevated">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre completo</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Ciudad de interés</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Ej: Córdoba, Villa Allende..."
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Mensaje (opcional)</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Contanos sobre tu experiencia y motivación..."
                    rows={4}
                  />
                </div>
                <Button type="submit" size="lg" className="w-full">
                  Enviar Solicitud
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-8 px-4">
        <div className="container mx-auto text-center">
          <img src={logoHoppiness} alt="Hoppiness Club" className="w-12 h-12 mx-auto mb-4 invert" />
          <p className="text-background/70 mb-4">
            Club de hamburguesas 100% cordobés. Culto al sabor desde 2018.
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/" className="text-background/70 hover:text-background">Inicio</Link>
            <Link to="/menu" className="text-background/70 hover:text-background">Menú</Link>
            <Link to="/ingresar" className="text-background/70 hover:text-background">Ingresar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
