import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Beef, 
  Heart, 
  Users, 
  Rocket,
  ShoppingBag,
  Users2
} from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import heroBurger from '@/assets/hero-burger.jpg';
import juanHoppiness from '@/assets/juan-hoppiness.jpg';
import aperturaLocal from '@/assets/apertura-local.jpg';
import teamPhoto from '@/assets/team-photo.jpg';
import logoHoppiness from '@/assets/logo-hoppiness.png';

export default function Nosotros() {
  const valores = [
    {
      icon: Beef,
      title: 'Calidad Premium',
      description: 'Seleccionamos las mejores materias primas del mercado. La calidad es nuestra prioridad absoluta.'
    },
    {
      icon: Heart,
      title: 'Pasión',
      description: 'Amamos lo que hacemos. Cada hamburguesa es preparada con dedicación y amor por nuestro oficio.'
    },
    {
      icon: Users,
      title: 'Comunidad',
      description: 'Más que clientes, somos una familia. El Club Hoppiness es un lugar de encuentro y pertenencia.'
    },
    {
      icon: Rocket,
      title: 'Innovación',
      description: 'Siempre buscando mejorar. Nuevas recetas, mejores procesos, experiencias únicas.'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      
      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[400px] flex items-center">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBurger})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/85 to-primary/70" />
        
        <div className="relative container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 font-brand">
            NUESTRA HISTORIA
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Desde 2018 creando el culto al sabor
          </p>
        </div>
      </section>

      {/* Quiénes Somos */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-black mb-6 font-brand text-primary">
                QUIÉNES SOMOS
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Hoppiness Club nació en 2018 en la ciudad de Córdoba con un sueño simple pero ambicioso: 
                crear las mejores hamburguesas de la ciudad. Un grupo de amigos apasionados por la buena 
                comida decidió revolucionar el concepto de hamburgueserías tradicionales.
              </p>
              <p className="text-lg text-muted-foreground mb-6">
                Lo que empezó como un pequeño local en Nueva Córdoba, hoy se ha convertido en un referente 
                gastronómico con múltiples sucursales en toda la provincia. Nuestro secreto: nunca 
                comprometer la calidad por el costo.
              </p>
              <p className="text-lg text-muted-foreground">
                Seleccionamos personalmente cada ingrediente, desarrollamos nuestras propias recetas de 
                salsas y panes, y capacitamos a nuestro equipo para que cada hamburguesa que sale de 
                nuestra cocina sea perfecta.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <img 
                src={juanHoppiness} 
                alt="Juan, socio de Hoppiness" 
                className="rounded-2xl shadow-elevated w-full h-64 object-cover object-top"
              />
              <img 
                src={aperturaLocal} 
                alt="Apertura de nuevo local Hoppiness" 
                className="rounded-2xl shadow-elevated w-full h-64 object-cover mt-8"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Nuestros Valores */}
      <section className="py-20 px-4 bg-secondary/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-black mb-4 font-brand text-center text-primary">
            NUESTROS VALORES
          </h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">
            Lo que nos define y nos mueve cada día
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {valores.map((valor, i) => (
              <Card key={i} className="shadow-card hover:shadow-elevated transition-all hover:-translate-y-1 text-center">
                <CardContent className="pt-8 pb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <valor.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{valor.title}</h3>
                  <p className="text-muted-foreground text-sm">{valor.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* El Equipo */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <img 
                src={teamPhoto} 
                alt="Equipo Hoppiness" 
                className="rounded-2xl shadow-elevated w-full"
              />
            </div>
            <div>
              <h2 className="text-4xl font-black mb-6 font-brand text-primary">
                NUESTRO EQUIPO
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Detrás de cada hamburguesa hay un equipo apasionado. Desde los fundadores hasta 
                cada uno de nuestros colaboradores, todos compartimos la misma visión: ofrecer 
                la mejor experiencia gastronómica.
              </p>
              <p className="text-lg text-muted-foreground mb-6">
                Creemos en el trabajo en equipo, la capacitación constante y en crear un ambiente 
                laboral donde todos puedan crecer. Nuestro equipo es nuestra familia, y eso se 
                nota en cada detalle.
              </p>
              <div className="flex items-center gap-4 p-4 bg-accent/10 rounded-xl">
                <Users2 className="w-12 h-12 text-accent" />
                <div>
                  <p className="font-bold text-lg">+50 colaboradores</p>
                  <p className="text-sm text-muted-foreground">En todas nuestras sucursales</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <img 
            src={logoHoppiness} 
            alt="Hoppiness Club" 
            className="w-20 h-20 mx-auto mb-6 invert"
          />
          <h2 className="text-4xl font-black mb-4 font-brand">
            ¿QUERÉS SER PARTE?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8">
            Sumate al culto al sabor como cliente o como franquiciado
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/pedir">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <ShoppingBag className="w-5 h-5 mr-2" />
                Pedir Ahora
              </Button>
            </Link>
            <Link to="/franquicias">
              <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10">
                <Users className="w-5 h-5 mr-2" />
                Franquicias
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}