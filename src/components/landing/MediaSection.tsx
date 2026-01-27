import { Card, CardContent } from '@/components/ui/card';
import { Quote, Newspaper, Building2, Star } from 'lucide-react';

const mediaQuotes = [
  {
    icon: Newspaper,
    source: 'La Voz del Interior',
    quote: 'La hamburguesa que rompe todos los estándares',
    type: 'Prensa local',
  },
  {
    icon: Newspaper,
    source: 'InfoNegocios',
    quote: 'Es 100% cordobesa, vende 600 hamburguesas por día',
    type: 'Medio de negocios',
  },
  {
    icon: Building2,
    source: 'e-architect',
    quote: 'Vibrant colors and eccentric geometries',
    type: 'Medio internacional de arquitectura',
  },
  {
    icon: Star,
    source: 'Rappi',
    quote: 'Uno de los restaurantes más importantes de Córdoba',
    type: 'Rating 4/5',
  },
];

export function MediaSection() {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-4xl font-black mb-4 font-brand text-center text-primary">
          HOPPINESS EN LOS MEDIOS
        </h2>
        <p className="text-center text-muted-foreground mb-12 text-lg">
          Lo que dicen de nosotros
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mediaQuotes.map((item, i) => (
            <Card key={i} className="shadow-card hover:shadow-elevated transition-all hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{item.source}</p>
                    <p className="text-xs text-muted-foreground">{item.type}</p>
                  </div>
                </div>
                <div className="relative">
                  <Quote className="w-6 h-6 text-accent/30 absolute -top-1 -left-1" />
                  <p className="text-muted-foreground italic pl-4">
                    "{item.quote}"
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
