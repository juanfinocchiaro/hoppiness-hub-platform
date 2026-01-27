import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, ExternalLink } from 'lucide-react';

const branches = [
  { 
    name: 'Nueva Córdoba', 
    address: 'Independencia 849',
    hours: '12-23:30',
    mapUrl: 'https://maps.google.com/?q=Hoppiness+Nueva+Cordoba',
    isNew: false,
  },
  { 
    name: 'General Paz', 
    address: '25 de Mayo 971',
    hours: '12-23:30',
    mapUrl: 'https://maps.google.com/?q=Hoppiness+General+Paz+Cordoba',
    isNew: false,
  },
  { 
    name: 'Manantiales', 
    address: 'Wilfredo Meloni 3778, Local 6',
    hours: '12-23:30',
    mapUrl: 'https://maps.google.com/?q=Hoppiness+Manantiales',
    isNew: false,
  },
  { 
    name: 'Villa Allende', 
    address: 'Río de Janeiro 191',
    hours: '12-23:30',
    mapUrl: 'https://maps.google.com/?q=Hoppiness+Villa+Allende',
    isNew: false,
  },
  { 
    name: 'Villa Carlos Paz', 
    address: '9 de Julio, Shopping WO, Nivel 1',
    hours: '12-23:30',
    mapUrl: 'https://maps.google.com/?q=Hoppiness+Villa+Carlos+Paz',
    isNew: false,
  },
];

const upcomingBranches = [
  { 
    name: 'Shopping Pocito', 
    address: 'Córdoba',
    year: '2026',
  },
];

export function LocationsSection() {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-4xl font-black mb-4 font-brand text-center text-primary">
          NUESTROS CLUBES
        </h2>
        <p className="text-center text-muted-foreground mb-12 text-lg">
          5 locales operativos + 1 próximamente
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {branches.map((branch, i) => (
            <Card key={i} className="shadow-card hover:shadow-elevated transition-all group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                    Hoppiness {branch.name}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {branch.hours}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mb-4">
                  <MapPin className="w-4 h-4 shrink-0" />
                  {branch.address}
                </p>
                <a 
                  href={branch.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  Ver en Google Maps
                  <ExternalLink className="w-3 h-3" />
                </a>
              </CardContent>
            </Card>
          ))}

          {/* Próximamente */}
          {upcomingBranches.map((branch, i) => (
            <Card key={`upcoming-${i}`} className="shadow-card border-dashed border-2 border-accent/50 bg-accent/5">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Badge variant="secondary" className="bg-accent/20 text-accent mb-2">
                      🆕 Próximamente
                    </Badge>
                    <h3 className="font-bold text-lg">
                      Hoppiness {branch.name}
                    </h3>
                  </div>
                  <span className="text-2xl font-black font-brand text-accent">{branch.year}</span>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-4 h-4 shrink-0" />
                  {branch.address}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
