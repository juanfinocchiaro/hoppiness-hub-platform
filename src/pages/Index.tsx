import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ShoppingBag, 
  Star,
  Users,
  Trophy,
  ArrowRight
} from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { 
  SumateSection, 
  AwardsSection, 
  MediaSection, 
  FranchiseHero, 
  WhyHoppinessSection,
  TimelineSection,
  FranchiseFormSection,
  LocationsSection,
  ReviewsSection
} from '@/components/landing';
import heroBurger from '@/assets/hero-burger.jpg';
import logoHoppiness from '@/assets/logo-hoppiness-blue.png';
import burgerCheese from '@/assets/burger-cheese-drip.png';
import burgerSmash from '@/assets/burger-smash-hand.png';
import burgerProvoleta from '@/assets/burger-provoleta.png';

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      {/* Hero Section - Nueva orientación a franquicias */}
      <section className="relative h-[90vh] min-h-[600px] flex items-center">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBurger})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/80 to-transparent" />
        
        <div className="relative container mx-auto px-4">
          <div className="max-w-2xl">
            {/* Logo */}
            <div className="mb-8">
              <img src={logoHoppiness} alt="Hoppiness Club" className="w-28 h-28 object-contain rounded-full shadow-2xl" />
            </div>
            
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-6 h-6 text-accent" />
              <span className="text-accent font-bold">4 VECES CAMPEONES</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-6 font-brand tracking-tight leading-tight">
              LA HAMBURGUESA<br />
              MÁS PREMIADA<br />
              <span className="text-accent">DE CÓRDOBA</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-lg">
              De un pequeño club en Cofico a la hamburguesería más reconocida de la provincia.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/franquicias">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8">
                  <Users className="w-5 h-5 mr-2" />
                  Abrí tu Franquicia
                </Button>
              </Link>
              <a href="#clubes">
                <Button size="lg" variant="outline" className="border-2 border-white/80 text-white bg-white/5 hover:bg-white/15 backdrop-blur-sm text-lg px-8">
                  Conocé nuestros Clubes
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="bg-accent text-accent-foreground py-6">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-4xl font-black font-brand">1000+</p>
              <p className="text-sm opacity-90">Hamburguesas / día</p>
            </div>
            <div>
              <p className="text-4xl font-black font-brand">6</p>
              <p className="text-sm opacity-90">Clubes</p>
            </div>
            <div>
              <p className="text-4xl font-black font-brand">16+</p>
              <p className="text-sm opacity-90">Variedades</p>
            </div>
            <div>
              <p className="text-4xl font-black font-brand">2018</p>
              <p className="text-sm opacity-90">Desde</p>
            </div>
          </div>
        </div>
      </section>

      {/* Premios */}
      <AwardsSection />

      {/* Medios */}
      <MediaSection />

      {/* Propuesta de Franquicia */}
      <FranchiseHero />

      {/* Por qué Hoppiness */}
      <WhyHoppinessSection />

      {/* Timeline */}
      <TimelineSection />

      {/* Nuestros Clubes */}
      <section id="clubes">
        <LocationsSection />
      </section>

      {/* Sumate Section */}
      <SumateSection />

      {/* Formulario de Franquicias */}
      <FranchiseFormSection />

      {/* Reviews Section */}
      <ReviewsSection />

      {/* About Section - Simplificado */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-black mb-6 font-brand text-primary">
                CULTO AL SABOR
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Seleccionamos las mejores materias primas del mercado, priorizando la calidad antes que el costo. 
                La obsesión que tenemos por el producto nos empujó a perfeccionar nuestros procesos de elaboración y recetas.
              </p>
              <p className="text-lg text-muted-foreground mb-8">
                Nuestros espacios están diseñados con muchísima onda, creando un estilo de servicio club descontracturado.
              </p>
              <a href="https://pedidos.masdelivery.com/hoppiness" target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="group">
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Pedir Ahora
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 grid grid-rows-2 gap-4">
                <div className="aspect-[16/10] overflow-hidden rounded-2xl shadow-elevated">
                  <img src={burgerCheese} alt="Hamburguesa con queso derretido" className="w-full h-full object-cover" />
                </div>
                <div className="aspect-[16/10] overflow-hidden rounded-2xl shadow-elevated">
                  <img src={burgerSmash} alt="Smash burger artesanal" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl shadow-elevated">
                <img src={burgerProvoleta} alt="Hamburguesa con provoleta" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
