import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Loader2, MapPin, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import logoHoppiness from '@/assets/logo-hoppiness-blue.png';
import { SEO } from '@/components/SEO';

const MAS_DELIVERY_URL = 'https://pedidos.masdelivery.com/hoppiness';

interface BranchWithWebapp {
  id: string;
  name: string;
  address: string;
  city: string;
  slug: string | null;
  public_status: string | null;
  webapp_activa: boolean;
}

function useBranchesForPedir() {
  return useQuery({
    queryKey: ['branches-pedir'],
    queryFn: async () => {
      // Get active branches
      const { data: branches, error: bErr } = await supabase
        .from('branches_public')
        .select('id, name, address, city, slug, public_status')
        .in('public_status', ['active', 'coming_soon'])
        .order('name');
      if (bErr) throw bErr;

      // Get webapp_config for all branches
      const branchIds = (branches || []).map((b: any) => b.id);
      let configMap: Record<string, boolean> = {};
      if (branchIds.length > 0) {
        const { data: configs } = await supabase
          .from('webapp_config' as any)
          .select('branch_id, webapp_activa')
          .in('branch_id', branchIds);
        if (configs) {
          (configs as any[]).forEach((c) => {
            configMap[c.branch_id] = c.webapp_activa === true;
          });
        }
      }

      return (branches || [])
        .filter((b: any) => b.public_status === 'active' && b.name !== 'Muy Pronto')
        .map((b: any): BranchWithWebapp => ({
          ...b,
          webapp_activa: configMap[b.id] || false,
        }));
    },
  });
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
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shrink-0">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoHoppiness} alt="Hoppiness Club" className="w-8 h-8 rounded-full" />
          <span className="font-bold font-brand text-sm hidden sm:inline">HOPPINESS CLUB</span>
        </Link>
        <Link to="/">
          <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver
          </Button>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-black font-brand text-foreground mb-2">
            ¿DÓNDE QUERÉS PEDIR?
          </h1>
          <p className="text-muted-foreground">
            Elegí tu local más cercano para hacer tu pedido
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {branches?.map((branch) => (
              <BranchCard key={branch.id} branch={branch} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function BranchCard({ branch }: { branch: BranchWithWebapp }) {
  const isWebapp = branch.webapp_activa && branch.slug;

  return (
    <div className="border border-border rounded-xl p-5 bg-card flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-bold text-foreground text-lg leading-tight">{branch.name}</h2>
          <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {branch.address}, {branch.city}
          </p>
        </div>
        {isWebapp ? (
          <Badge className="bg-accent text-accent-foreground shrink-0 text-[10px]">
            <Sparkles className="w-3 h-3 mr-1" />
            Nuevo
          </Badge>
        ) : (
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            MasDelivery
          </Badge>
        )}
      </div>

      {isWebapp ? (
        <Link to={`/pedir/${branch.slug}`} className="mt-auto">
          <Button className="w-full">
            Pedir acá
          </Button>
        </Link>
      ) : (
        <a href={MAS_DELIVERY_URL} target="_blank" rel="noopener noreferrer" className="mt-auto">
          <Button variant="outline" className="w-full">
            Ir a MasDelivery
            <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </a>
      )}
    </div>
  );
}
