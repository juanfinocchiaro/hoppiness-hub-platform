import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ShoppingBag, 
  MapPin, 
  Star,
  Users,
  Award,
  Clock,
  ArrowRight
} from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import heroBurger from '@/assets/hero-burger.jpg';
import logoOriginal from '@/assets/logo-hoppiness-original.jpg';
import local1 from '@/assets/local-1.jpg';
import local2 from '@/assets/local-2.jpg';
import designAmbiente from '@/assets/design-ambiente.jpg';

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      {/* Hero Section */}
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
              <img src={logoOriginal} alt="Hoppiness Club" className="w-28 h-28 object-contain rounded-full shadow-2xl" />
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 font-brand tracking-tight">
              CULTO AL<br />SABOR
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-lg">
              Un club de hamburguesas que se distingue por un producto de sabor y calidad inigualable.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/pedir">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8">
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Pedir Ahora
                </Button>
              </Link>
              <Link to="/franquicias">
                <Button size="lg" variant="outline" className="border-2 border-white/80 text-white bg-white/5 hover:bg-white/15 backdrop-blur-sm text-lg px-8">
                  <Users className="w-5 h-5 mr-2" />
                  Franquicias
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="bg-accent text-accent-foreground py-6">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-4xl font-black font-brand">600+</p>
              <p className="text-sm opacity-90">Hamburguesas / día</p>
            </div>
            <div>
              <p className="text-4xl font-black font-brand">5</p>
              <p className="text-sm opacity-90">Sucursales</p>
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

      {/* About Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-black mb-6 font-brand text-primary">
                LA MEJOR HAMBURGUESA DE CÓRDOBA
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Seleccionamos las mejores materias primas del mercado, priorizando la calidad antes que el costo. 
                La obsesión que tenemos por el producto nos empujó a perfeccionar nuestros procesos de elaboración y recetas.
              </p>
              <div className="flex flex-wrap gap-4 mb-8">
                <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
                  <Award className="w-5 h-5 text-primary" />
                  <span className="font-medium">Receta RMA Registrada</span>
                </div>
                <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
                  <Star className="w-5 h-5 text-primary" />
                  <span className="font-medium">Código Alimentario</span>
                </div>
              </div>
              <Link to="/menu">
                <Button size="lg" className="group">
                  Ver Menú Completo
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <img src={local1} alt="Interior Hoppiness" className="rounded-2xl shadow-elevated w-full h-48 object-cover" />
              <img src={local2} alt="Ambiente Hoppiness" className="rounded-2xl shadow-elevated w-full h-48 object-cover mt-8" />
            </div>
          </div>
        </div>
      </section>

      {/* Design Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <img src={designAmbiente} alt="Diseño Hoppiness" className="rounded-2xl shadow-elevated w-full" />
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-4xl font-black mb-6 font-brand">
                DISEÑO & PERSONALIDAD DE MARCA
              </h2>
              <p className="text-lg text-primary-foreground/80 mb-6">
                Somos una marca de diseño, desde la concepción del menú, hasta el más mínimo detalle de nuestra comunicación. 
                Esto nos otorga una fuerte personalidad de marca.
              </p>
              <p className="text-lg text-primary-foreground/80">
                Nuestros espacios están diseñados con muchísima onda, creando un estilo de servicio club descontracturado.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-20 px-4 bg-secondary/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-black mb-4 font-brand text-center text-primary">
            EN BOCA DE NUESTROS FANS
          </h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">
            Lo que dicen nuestros clientes fanáticos
          </p>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Oriana Massaro",
                rating: 5,
                text: "10/10. Inmejorable. La atención super eficiente y amable, la rapidez y lo más importante: el sabor. Muy ricas hamburguesas!"
              },
              {
                name: "Java Pez",
                rating: 5,
                text: "Sin lugar a dudas de las mejores hamburguesas de Córdoba. El sabor es increíble y los productos son de primer nivel."
              },
              {
                name: "Lautaro Dominguez",
                rating: 5,
                text: "Las mejores burgers de Córdoba. Perfecta desde donde se la mire, tiene un sabor especial. Te saca una sonrisa."
              }
            ].map((review, i) => (
              <Card key={i} className="shadow-card hover:shadow-elevated transition-shadow">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {Array(review.rating).fill(0).map((_, j) => (
                      <Star key={j} className="w-5 h-5 fill-warning text-warning" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">"{review.text}"</p>
                  <p className="font-bold">{review.name}</p>
                  <p className="text-sm text-muted-foreground">Google Review</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Locations Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-black mb-4 font-brand text-center text-primary">
            NUESTROS CLUBES
          </h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">
            5 sucursales para disfrutar
          </p>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: "General Paz", address: "25 de mayo 971, 475" },
              { name: "Manantiales", address: "Wilfredo Meloni 3778, Local 6" },
              { name: "Nueva Córdoba", address: "Estrada 97" },
              { name: "Villa Allende", address: "Río de Janeiro 191" },
              { name: "Villa Carlos Paz", address: "9 de julio 0, Nivel 1" },
            ].map((branch, i) => (
              <Card key={i} className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">
                        Hoppiness {branch.name}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {branch.address}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      12-23:30
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/pedir">
              <Button size="lg">
                <ShoppingBag className="w-5 h-5 mr-2" />
                Pedir Ahora
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Franchise */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary via-primary to-accent">
        <div className="container mx-auto max-w-4xl text-center text-white">
          <h2 className="text-4xl md:text-5xl font-black mb-6 font-brand">
            NUNCA FUE TAN SIMPLE TENER TU PROPIO NEGOCIO GASTRONÓMICO
          </h2>
          <p className="text-xl mb-8 text-white/90">
            Sumate a la familia Hoppiness y formá parte de nuestro club.
          </p>
          <Link to="/franquicias">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 text-lg px-8">
              <Users className="w-5 h-5 mr-2" />
              Conocé las Franquicias
            </Button>
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
