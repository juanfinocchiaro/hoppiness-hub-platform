import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Link } from 'react-router-dom';
import { MapPin, Clock, ExternalLink, CalendarClock, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';

type PublicStatus = 'active' | 'coming_soon';

interface DayHours {
  opens: string;
  closes: string;
  closed?: boolean;
}

type PublicHours = Record<string, DayHours>;

interface BranchPublic {
  id: string;
  name: string;
  address: string;
  city: string;
  opening_time: string | null;
  closing_time: string | null;
  public_status: PublicStatus;
  public_hours: PublicHours | null;
}

const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAYS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function LocationsSection() {
  const { data: branches, isLoading } = useQuery({
    queryKey: ['public-branches-landing'],
    queryFn: async () => {
      // Usar la vista branches_public que ahora tiene public_status y public_hours
      const { data, error } = await supabase
        .from('branches_public')
        .select('id, name, address, city, opening_time, closing_time, public_status, public_hours')
        .order('name');
      
      if (error) throw error;
      return (data || []) as unknown as BranchPublic[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Separar locales activos y próximamente
  const activeBranches = branches?.filter(b => b.public_status === 'active') || [];
  const comingSoonBranches = branches?.filter(b => b.public_status === 'coming_soon') || [];

  const formatTime = (time: string) => {
    // "19:30" -> "19:30" o "00:00" -> "00:00"
    return time;
  };

  const getTodayHours = (publicHours: PublicHours | null, openingTime?: string | null, closingTime?: string | null) => {
    const today = new Date().getDay().toString();
    
    if (publicHours && publicHours[today]) {
      const dayHours = publicHours[today];
      if (dayHours.closed) return 'Cerrado';
      return `${formatTime(dayHours.opens)}-${formatTime(dayHours.closes)}`;
    }
    
    // Fallback al horario simple
    if (openingTime && closingTime) {
      const formatSimple = (t: string) => {
        const [h, m] = t.split(':');
        return m === '00' ? h : `${h}:${m}`;
      };
      return `${formatSimple(openingTime)}-${formatSimple(closingTime)}`;
    }
    
    return '19:30-00:00';
  };

  const getGoogleMapsUrl = (name: string, city: string) => {
    return `https://maps.google.com/?q=Hoppiness+${encodeURIComponent(name)}+${encodeURIComponent(city)}`;
  };

  const totalCount = (activeBranches?.length || 0) + (comingSoonBranches?.length || 0);

  const HoursPopover = ({ branch }: { branch: BranchPublic }) => {
    const publicHours = branch.public_hours;
    
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
            <Clock className="w-4 h-4" />
            <span>Hoy: {getTodayHours(publicHours, branch.opening_time, branch.closing_time)}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="end">
          <div className="text-sm font-medium mb-2">Horarios de atención</div>
          <div className="space-y-1 text-sm">
            {[1, 2, 3, 4, 5, 6, 0].map((day) => {
              const dayKey = day.toString();
              const dayHours = publicHours?.[dayKey];
              const isToday = new Date().getDay() === day;
              
              return (
                <div 
                  key={day} 
                  className={`flex justify-between py-1 ${isToday ? 'font-medium text-primary' : 'text-muted-foreground'}`}
                >
                  <span>{DAYS_FULL[day]}</span>
                  <span>
                    {dayHours?.closed 
                      ? 'Cerrado' 
                      : dayHours 
                        ? `${formatTime(dayHours.opens)}-${formatTime(dayHours.closes)}`
                        : getTodayHours(null, branch.opening_time, branch.closing_time)
                    }
                  </span>
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-4xl font-black mb-4 font-brand text-center text-primary">
          NUESTROS CLUBES
        </h2>
        <p className="text-center text-muted-foreground mb-12 text-lg">
          {isLoading ? 'Cargando...' : `${totalCount} locales en Córdoba`}
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-3" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-4 w-1/3" />
                </CardContent>
              </Card>
            ))
          ) : totalCount === 0 ? (
            <div className="col-span-full text-center py-12">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-muted-foreground">No hay locales disponibles en este momento.</p>
            </div>
          ) : (
            <>
              {/* Locales Activos */}
              {activeBranches.map((branch) => (
                <Card key={branch.id} className="hover:border-primary/50 transition-colors group">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                        {branch.name}
                      </h3>
                      <HoursPopover branch={branch} />
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-4">
                      <MapPin className="w-4 h-4 shrink-0" />
                      {branch.address}
                    </p>
                    <div className="flex items-center gap-3">
                      <a 
                        href={getGoogleMapsUrl(branch.name, branch.city)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Ver en Google Maps
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <Link to="/pedir" className="ml-auto">
                        <Button
                          size="sm"
                          className="bg-accent hover:bg-accent/90 text-accent-foreground"
                        >
                          <ShoppingBag className="w-3 h-3 mr-1" />
                          Pedir
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Locales Próximamente */}
              {comingSoonBranches.map((branch) => (
                <Card key={branch.id} className="border-dashed border-accent/50 bg-accent/5 relative overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-lg">
                        {branch.name}
                      </h3>
                      <Badge variant="secondary" className="bg-accent/20 text-accent-foreground border-accent/30 gap-1">
                        <CalendarClock className="w-3 h-3" />
                        Próximamente
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-4">
                      <MapPin className="w-4 h-4 shrink-0" />
                      {branch.address || branch.city}
                    </p>
                    <p className="text-sm text-accent font-medium">
                      🚀 Muy pronto en {branch.city}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
