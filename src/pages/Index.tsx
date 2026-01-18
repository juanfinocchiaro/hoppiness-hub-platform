import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { 
  UtensilsCrossed, 
  ShoppingBag, 
  Clock, 
  MapPin, 
  ChefHat,
  Sparkles,
  LogOut,
  LayoutDashboard
} from 'lucide-react';

export default function Index() {
  const { user, signOut, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl gradient-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Hoppiness Club</span>
          </div>
          
          <nav className="flex items-center gap-4">
            {user ? (
              <>
                <Link to="/admin">
                  <Button variant="ghost" size="sm">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={signOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Salir
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button>Iniciar Sesión</Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-background to-secondary/30">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Comida para ser feliz</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-balance">
            Sabores que alegran{' '}
            <span className="text-primary">tu día</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Ordena tus platos favoritos para llevar o delivery. 
            Comida artesanal preparada con amor y los mejores ingredientes.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/menu">
              <Button size="lg" className="w-full sm:w-auto">
                <ShoppingBag className="w-5 h-5 mr-2" />
                Ver Menú
              </Button>
            </Link>
            <Link to="/locations">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                <MapPin className="w-5 h-5 mr-2" />
                Nuestras Sucursales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="shadow-card hover:shadow-elevated transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <ChefHat className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Cocina Artesanal</CardTitle>
                <CardDescription>
                  Cada plato es preparado con técnicas tradicionales y los ingredientes más frescos.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="shadow-card hover:shadow-elevated transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Rápido y Fácil</CardTitle>
                <CardDescription>
                  Ordena online y recoge tu pedido o recíbelo en la puerta de tu casa.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="shadow-card hover:shadow-elevated transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Múltiples Sucursales</CardTitle>
                <CardDescription>
                  Encuentra la sucursal más cercana a ti y disfruta de nuestros sabores.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            ¿Listo para ordenar?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Explora nuestro menú y encuentra tu próximo plato favorito.
          </p>
          <Link to="/menu">
            <Button size="lg">
              <ShoppingBag className="w-5 h-5 mr-2" />
              Ordenar Ahora
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>© 2024 Hoppiness Club. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
