import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Clock, ExternalLink } from 'lucide-react';

export function LocationsSection() {
  const { data: branches, isLoading } = useQuery({
    queryKey: ['public-branches-landing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, address, city, opening_time, closing_time, is_active')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const formatHours = (opening?: string | null, closing?: string | null) => {
    if (!opening || !closing) return '12-23:30';
    // Formatear "12:00:00" -> "12" y "23:30:00" -> "23:30"
    const formatTime = (time: string) => {
      const [h, m] = time.split(':');
      return m === '00' ? h : `${h}:${m}`;
    };
    return `${formatTime(opening)}-${formatTime(closing)}`;
  };

  const getGoogleMapsUrl = (name: string, city: string) => {
    return `https://maps.google.com/?q=Hoppiness+${encodeURIComponent(name)}+${encodeURIComponent(city)}`;
  };

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-4xl font-black mb-4 font-brand text-center text-primary">
          NUESTROS CLUBES
        </h2>
        <p className="text-center text-muted-foreground mb-12 text-lg">
          {isLoading ? 'Cargando...' : `${branches?.length || 0} locales en Córdoba`}
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {isLoading ? (
            // Skeletons while loading
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="shadow-card">
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-3" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-4 w-1/3" />
                </CardContent>
              </Card>
            ))
          ) : (
            branches?.map((branch) => (
              <Card key={branch.id} className="shadow-card hover:shadow-elevated transition-all group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                      Hoppiness {branch.name}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {formatHours(branch.opening_time, branch.closing_time)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mb-4">
                    <MapPin className="w-4 h-4 shrink-0" />
                    {branch.address}
                  </p>
                  <a 
                    href={getGoogleMapsUrl(branch.name, branch.city)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Ver en Google Maps
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </CardContent>
              </Card>
            ))
          )}

        </div>
      </div>
    </section>
  );
}
