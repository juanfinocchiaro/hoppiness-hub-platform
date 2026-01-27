import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Factory, TrendingUp, Trophy, Quote, ArrowRight } from 'lucide-react';

const benefits = [
  {
    icon: Factory,
    title: 'Producto llave en mano',
    description: 'Centro de producción propio. Recibís todo estandarizado y listo para vender.',
  },
  {
    icon: TrendingUp,
    title: 'Recupero en 12 meses',
    description: 'Modelo de negocio probado con retorno de inversión demostrado.',
  },
  {
    icon: Trophy,
    title: 'Marca premiada',
    description: '4 veces campeones. 50K seguidores. Reconocimiento en medios nacionales e internacionales.',
  },
];

export function FranchiseHero() {
  return (
    <section className="py-20 px-4 bg-gradient-to-br from-primary via-primary to-accent/80">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center text-white mb-12">
          <h2 className="text-4xl md:text-5xl font-black mb-4 font-brand">
            LLEVÁ LA MEJOR HAMBURGUESA<br className="hidden md:block" /> A TU CIUDAD
          </h2>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Hoppiness busca socios en todo el país para seguir creciendo
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {benefits.map((benefit, i) => (
            <div 
              key={i} 
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-white hover:bg-white/15 transition-colors"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                <benefit.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
              <p className="text-white/80">{benefit.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mb-12">
          <Link to="/franquicias">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 text-lg px-8 shadow-lg">
              Quiero información de franquicias
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>

        {/* Quote */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-3xl mx-auto">
          <Quote className="w-10 h-10 text-white/30 mb-4" />
          <blockquote className="text-xl text-white italic mb-4">
            "Nuestra franquicia le va a dar al franquiciado la posibilidad de entrar al rubro gastronómico vendiendo un producto de extrema calidad."
          </blockquote>
          <p className="text-white/70">
            — Ismael Sánchez, Socio Fundador
          </p>
        </div>
      </div>
    </section>
  );
}
