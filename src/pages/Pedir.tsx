import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Truck, 
  ShoppingBag,
  Clock,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

export default function Pedir() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBranches() {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (!error && data) {
        setBranches(data);
      }
      setLoading(false);
    }
    fetchBranches();
  }, []);

  const openBranches = branches.filter(b => b.is_open);
  const closedBranches = branches.filter(b => !b.is_open);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />

      {/* Hero */}
      <section className="bg-gradient-to-b from-primary to-primary/90 text-primary-foreground py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-4 font-brand">
            ¿Dónde querés pedir?
          </h1>
          <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            Elegí tu sucursal más cercana y disfrutá de las mejores hamburguesas de Córdoba
          </p>
        </div>
      </section>

      {/* Branch List */}
      <section className="container mx-auto px-4 py-12 flex-1">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : branches.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No hay sucursales disponibles</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Sucursales abiertas */}
            {openBranches.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                  Abiertas ahora
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {openBranches.map((branch) => (
                    <BranchCard key={branch.id} branch={branch} />
                  ))}
                </div>
              </div>
            )}

            {/* Sucursales cerradas */}
            {closedBranches.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4 text-muted-foreground">
                  Cerradas
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
                  {closedBranches.map((branch) => (
                    <BranchCard key={branch.id} branch={branch} disabled />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <PublicFooter />
    </div>
  );
}

interface BranchCardProps {
  branch: Branch;
  disabled?: boolean;
}

function BranchCard({ branch, disabled }: BranchCardProps) {
  const slug = branch.slug || branch.id;
  const hasDelivery = branch.delivery_enabled !== false;
  const prepTime = branch.estimated_prep_time_min || 20;
  
  const content = (
    <Card className={`hover:shadow-elevated transition-all border-2 ${
      disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:border-primary/20'
    }`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-xl font-bold text-primary">
              Hoppiness {branch.name}
            </h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" />
              {branch.address}, {branch.city}
            </p>
          </div>
          {branch.is_open ? (
            <Badge className="bg-green-500">Abierto</Badge>
          ) : (
            <Badge variant="secondary">Cerrado</Badge>
          )}
        </div>

        {branch.status_message && (
          <p className="text-sm text-warning mb-3 bg-warning/10 px-2 py-1 rounded">
            {branch.status_message}
          </p>
        )}
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>~{prepTime} min</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {hasDelivery && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              <Truck className="w-3 h-3" />
              <span>Delivery</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            <ShoppingBag className="w-3 h-3" />
            <span>Take away</span>
          </div>
        </div>

        {!disabled && (
          <Button className="w-full mt-4">
            Pedir acá
          </Button>
        )}
      </CardContent>
    </Card>
  );

  if (disabled) {
    return content;
  }

  return (
    <Link to={`/pedir/${slug}`}>
      {content}
    </Link>
  );
}
