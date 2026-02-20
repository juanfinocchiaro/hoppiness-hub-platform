import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ShoppingBag,
  Trophy,
  ArrowRight,
  Music } from
'lucide-react';
import { SEO } from '@/components/SEO';
import { PublicHeader, MobileOrderFAB } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import ImpersonationBanner from '@/components/admin/ImpersonationBanner';
import {
  SumateSection,
  AwardsSection,
  MediaSection,
  FranchiseHero,
  WhyHoppinessSection,
  TimelineSection,
  LocationsSection,
  ReviewsSection } from
'@/components/landing';
import heroWall from '@/assets/hero-wall.webp';
import logoHoppiness from '@/assets/logo-hoppiness-blue.png';
import burger43 from '@/assets/hoppiness-43.webp';
import burger64 from '@/assets/hoppiness-64.webp';
import process125 from '@/assets/hoppiness-125.webp';

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SEO path="/" />
      <ImpersonationBanner />
      <PublicHeader />

      {/* Hero Section - Producto primero */}
      <section className="relative h-[90vh] min-h-[600px] flex items-center justify-end">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroWall})` }} />

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
              Más de 15 creaciones de autor. Recetas propias. Culto al sabor desde 2018.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/pedir">
                <Button
                  size="lg"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8">

                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Pedí tu Hamburguesa
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
              <p className="text-4xl font-black font-brand">15+</p>
              <p className="text-sm opacity-90">Creaciones de autor</p>
            </div>
            <div>
              <p className="text-4xl font-black font-brand">2018</p>
              <p className="text-sm opacity-90">Año del primer club</p>
            </div>
          </div>
        </div>
      </section>

      {/* Culto al Sabor */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-black mb-6 font-brand text-primary">
                CULTO AL SABOR
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Más de 15 hamburguesas de autor donde cada ingrediente está elegido a propósito. 
                Combinaciones de sabores que cuentan una historia, con recetas propias que no vas a encontrar en otro lado.
              </p>
              <p className="text-lg text-muted-foreground mb-8">
                Nuestros clubes están diseñados con mucha onda: un estilo descontracturado donde venís a pasarla bien, 
                ya sea solo, con amigos o con la familia.
              </p>
              <Link to="/pedir">
                <Button
                  size="lg"
                  className="group">

                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Pedí Ahora
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 grid grid-rows-2 gap-4">
                <div className="aspect-[16/10] overflow-hidden rounded-2xl shadow-elevated">
                  <img src={burger64} alt="Hamburguesa Hoppiness" className="w-full h-full object-cover" />
                </div>
                <div className="aspect-[16/10] overflow-hidden rounded-2xl shadow-elevated">
                  <img src={process125} alt="Proceso de elaboración" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl shadow-elevated">
                <img src={burger43} alt="Hamburguesa artesanal" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Premios */}
      <AwardsSection />

      {/* Medios */}
      <MediaSection />

      {/* Nuestros Clubes */}
      <section id="clubes">
        <LocationsSection />
      </section>

      {/* Spotify - Modo Hoppi */}
      <section className="py-16 px-4 bg-foreground text-background">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Music className="w-8 h-8 text-accent" />
            <h2 className="text-3xl font-black font-brand">Modo Hoppi</h2>
          </div>
          <p className="text-background/70 mb-6 text-lg">
            La música que suena en nuestros clubes
          </p>
          <a
            href="https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-accent hover:text-accent/80 font-bold transition-colors">

            Escuchá en Spotify
            <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </section>

      {/* Reviews Section */}
      <ReviewsSection />

      {/* Separador B2C → B2B */}
      <section className="py-16 px-4 bg-primary text-primary-foreground text-center">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-black font-brand mb-4">
            Crecé con Hoppiness
          </h2>
          <p className="text-primary-foreground/80 text-lg">
            Si te apasiona la gastronomía y querés ser parte de una marca premiada, conocé nuestro modelo de franquicias.
          </p>
        </div>
      </section>

      {/* Sumate Section */}
      <SumateSection />

      {/* Propuesta de Franquicia */}
      <FranchiseHero />

      {/* Por qué Hoppiness */}
      <WhyHoppinessSection />

      {/* Timeline */}
      <TimelineSection />

      <PublicFooter />
      <MobileOrderFAB />
    </div>);

}