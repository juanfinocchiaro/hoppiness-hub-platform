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
import team1 from '@/assets/team-1.jpg';
import team2 from '@/assets/team-2.jpg';
import team3 from '@/assets/team-3.jpg';
import team4 from '@/assets/team-4.jpg';
import team5 from '@/assets/team-5.jpg';
import team6 from '@/assets/team-6.jpg';
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

      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-black mb-6 font-brand text-primary">
                QUIÉNES SOMOS
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Hoppiness Club nació en Córdoba en 2018, fundado por Juan Finocchiaro, como un club de cerveza y encuentro.
                Desde el inicio la idea fue crear una marca con identidad, producto cuidado y una experiencia simple, bien hecha.
              </p>
              <p className="text-lg text-muted-foreground mb-6">
                En 2019 dimos el primer salto con un nuevo punto en Nueva Córdoba. Y cuando llegó la pandemia, tomamos una decisión que marcó el rumbo: nos enfocamos 100% en hamburguesas y empezamos a construir un modelo basado en calidad, consistencia y operación.
              </p>
              <p className="text-lg text-muted-foreground mb-6">
                Ese cambio fue una evolución natural: pasamos de ser un lugar de encuentro a ser una hamburguesería especializada, con recetas estandarizadas, procesos claros y un equipo entrenado para sostener el mismo nivel en cada servicio.
              </p>
              <p className="text-lg text-muted-foreground mb-6">
                Hoy Hoppiness Club es una marca cordobesa en expansión, con múltiples sucursales y una comunidad fiel. Y seguimos sosteniendo lo de siempre: producto fuerte, identidad clara y una forma de trabajar que permite crecer sin perder calidad.
              </p>
              <div className="border-t pt-6 mt-6">
                <p className="text-lg font-medium text-foreground italic">
                  Una marca con historia real, producto probado y estándares listos para escalar.
                </p>
              </div>
            </div>
            <div className="flex justify-center">
              <img 
                src={juanHoppiness} 
                alt="Juan Finocchiaro, fundador de Hoppiness Club" 
                className="rounded-2xl shadow-elevated w-full max-w-sm aspect-[9/16] object-cover object-top"
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
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black mb-4 font-brand text-primary">
              NUESTRO EQUIPO
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Detrás de cada hamburguesa hay un equipo apasionado. Desde los fundadores hasta 
              cada uno de nuestros colaboradores, todos compartimos la misma visión: ofrecer 
              la mejor experiencia gastronómica.
            </p>
          </div>

          {/* Galería de fotos del equipo - Masonry style */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
            <img 
              src={team1} 
              alt="Equipo Hoppiness celebrando" 
              className="rounded-2xl shadow-card hover:shadow-elevated transition-all w-full h-64 object-cover"
            />
            <img 
              src={team2} 
              alt="Equipo en cocina" 
              className="rounded-2xl shadow-card hover:shadow-elevated transition-all w-full h-64 object-cover md:translate-y-8"
            />
            <img 
              src={team3} 
              alt="Celebración de cumpleaños del equipo" 
              className="rounded-2xl shadow-card hover:shadow-elevated transition-all w-full h-64 object-cover"
            />
            <img 
              src={team4} 
              alt="Equipo de cocina" 
              className="rounded-2xl shadow-card hover:shadow-elevated transition-all w-full h-64 object-cover md:-translate-y-4"
            />
            <img 
              src={team5} 
              alt="Equipo tomando selfie" 
              className="rounded-2xl shadow-card hover:shadow-elevated transition-all w-full h-64 object-cover md:translate-y-4"
            />
            <img 
              src={team6} 
              alt="Equipo en local" 
              className="rounded-2xl shadow-card hover:shadow-elevated transition-all w-full h-64 object-cover md:-translate-y-8"
            />
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <div className="flex items-center gap-4 p-4 bg-accent/10 rounded-xl">
              <Users2 className="w-12 h-12 text-accent" />
              <div>
                <p className="font-bold text-lg">+50 colaboradores</p>
                <p className="text-sm text-muted-foreground">En todas nuestras sucursales</p>
              </div>
            </div>
            <p className="text-muted-foreground text-center max-w-md">
              Creemos en el trabajo en equipo, la capacitación constante y en crear un ambiente 
              laboral donde todos puedan crecer. Nuestro equipo es nuestra familia.
            </p>
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
            <a href="https://hoppinessclub.masdelivery.com.ar" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <ShoppingBag className="w-5 h-5 mr-2" />
                Pedir Ahora
              </Button>
            </a>
            <Link to="/franquicias">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
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