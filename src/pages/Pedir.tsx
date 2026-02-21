import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, MapPin, Clock, Truck, ShoppingBag, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import logoHoppiness from '@/assets/logo-hoppiness-blue.png';
import { SEO } from '@/components/SEO';

interface BranchWithWebapp {
  id: string;
  name: string;
  address: string;
  city: string;
  slug: string | null;
  public_status: string | null;
  cover_image_url: string | null;
  webapp_activa: boolean;
  estado: string;
  delivery_habilitado: boolean;
  retiro_habilitado: boolean;
  delivery_costo: number | null;
  tiempo_retiro: number | null;
  tiempo_delivery: number | null;
}

function useBranchesForPedir() {
  return useQuery({
    queryKey: ['branches-pedir'],
    queryFn: async () => {
      const { data: branches, error: bErr } = await supabase
        .from('branches_public')
        .select('id, name, address, city, slug, public_status, cover_image_url')
        .in('public_status', ['active', 'coming_soon'])
        .order('name');
      if (bErr) throw bErr;

      const branchIds = (branches || []).map((b: any) => b.id);
      let configMap: Record<string, any> = {};
      if (branchIds.length > 0) {
        const { data: configs } = await supabase
          .from('webapp_config' as any)
          .select('branch_id, webapp_activa, estado, delivery_habilitado, retiro_habilitado, delivery_costo, tiempo_estimado_retiro_min, tiempo_estimado_delivery_min')
          .in('branch_id', branchIds);
        if (configs) {
          (configs as any[]).forEach((c) => { configMap[c.branch_id] = c; });
        }
      }

      return (branches || [])
        .filter((b: any) => b.public_status === 'active' && b.name !== 'Muy Pronto')
        .map((b: any): BranchWithWebapp => {
          const cfg = configMap[b.id];
          return {
            ...b,
            cover_image_url: b.cover_image_url ?? null,
            webapp_activa: cfg?.webapp_activa === true,
            estado: cfg?.estado ?? 'cerrado',
            delivery_habilitado: cfg?.delivery_habilitado ?? false,
            retiro_habilitado: cfg?.retiro_habilitado ?? false,
            delivery_costo: cfg?.delivery_costo ?? null,
            tiempo_retiro: cfg?.tiempo_estimado_retiro_min ?? null,
            tiempo_delivery: cfg?.tiempo_estimado_delivery_min ?? null,
          };
        })
        .sort((a, b) => {
          if (a.estado === 'abierto' && b.estado !== 'abierto') return -1;
          if (a.estado !== 'abierto' && b.estado === 'abierto') return 1;
          return a.name.localeCompare(b.name);
        });
    },
  });
}

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-AR')}`;
}

export default function Pedir() {
  const { data: branches, isLoading } = useBranchesForPedir();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Pedí Online | Hoppiness Club"
        description="Hacé tu pedido de hamburguesas smash en tu Hoppiness más cercano."
        path="/pedir"
      />

      {/* Header */}
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Volver
            </Button>
          </Link>
          <Link to="/" className="flex items-center gap-2.5 ml-auto">
            <img src={logoHoppiness} alt="Hoppiness Club" className="w-9 h-9 rounded-full object-contain" />
            <span className="font-black font-brand text-base hidden sm:inline tracking-tight">HOPPINESS CLUB</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-primary text-primary-foreground pb-10 pt-4">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-3xl sm:text-4xl font-black font-brand tracking-tight">
            PEDÍ ONLINE
          </h1>
          <p className="text-primary-foreground/70 mt-2 text-sm sm:text-base">
            Elegí tu local y hacé tu pedido en minutos
          </p>
        </div>
      </div>

      {/* Branch cards */}
      <main className="flex-1 -mt-6">
        <div className="max-w-5xl mx-auto px-4 pb-12">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !branches?.length ? (
            <div className="text-center py-16 text-muted-foreground">
              No hay locales disponibles en este momento.
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {branches.map((branch) => (
                <BranchCard key={branch.id} branch={branch} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function BranchCard({ branch }: { branch: BranchWithWebapp }) {
  const hasWebapp = branch.webapp_activa && branch.slug;
  const isOpen = branch.estado === 'abierto';
  const isPaused = branch.estado === 'pausado';
  const isClosed = !isOpen && !isPaused;

  return (
    <div className="rounded-2xl bg-card border shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      {/* Cover image */}
      {branch.cover_image_url ? (
        <div className="aspect-[16/7] w-full overflow-hidden bg-muted">
          <img
            src={branch.cover_image_url}
            alt={branch.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="aspect-[16/7] w-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <span className="text-4xl">🍔</span>
        </div>
      )}
      <div className="p-5 space-y-3">
        {/* Name + status */}
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-black text-lg text-foreground leading-tight">{branch.name}</h2>
          {isOpen && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Abierto
            </span>
          )}
          {isPaused && (
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full shrink-0">
              <Pause className="w-3 h-3" />
              Pausado
            </span>
          )}
          {isClosed && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
              Cerrado
            </span>
          )}
        </div>

        {/* Address */}
        <p className="text-muted-foreground text-sm flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          {branch.address}, {branch.city}
        </p>

        {/* Service info pills */}
        {hasWebapp && isOpen && (
          <div className="flex flex-wrap gap-2">
            {branch.retiro_habilitado && branch.tiempo_retiro && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
                <ShoppingBag className="w-3 h-3" />
                Retiro ~{branch.tiempo_retiro} min
              </span>
            )}
            {branch.delivery_habilitado && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
                <Truck className="w-3 h-3" />
                Delivery ~{branch.tiempo_delivery ?? '?'} min
                {branch.delivery_costo != null && branch.delivery_costo > 0 && (
                  <> · {formatPrice(branch.delivery_costo)}</>
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="px-5 pb-5">
        {hasWebapp ? (
          <Link to={`/pedir/${branch.slug}`}>
            <Button
              className="w-full font-bold"
              size="lg"
              disabled={isClosed}
            >
              {isOpen ? 'Pedir acá' : isPaused ? 'Ver menú' : 'Cerrado'}
            </Button>
          </Link>
        ) : (
          <a href="https://pedidos.masdelivery.com/hoppiness" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full" size="lg">
              Pedir por MasDelivery
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
