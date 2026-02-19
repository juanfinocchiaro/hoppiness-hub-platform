import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Store, Clock, DollarSign, Utensils, BarChart3, MapPin } from 'lucide-react';
import { BrandDailySalesTable } from '@/components/admin/BrandDailySalesTable';
import { PageHelp } from '@/components/ui/PageHelp';
import { PageHeader } from '@/components/ui/page-header';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface Stats {
  globalRevenue: number;
  globalHamburguesas: number;
  globalHours: number;
  globalProductivity: number;
}

export default function BrandHome() {
  const [stats, setStats] = useState<Stats>({ 
    globalRevenue: 0, 
    globalHamburguesas: 0, 
    globalHours: 0, 
    globalProductivity: 0 
  });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const [branchesRes, closuresRes, clockRes] = await Promise.all([
        supabase.from('branches').select('*').order('name'),
        // Get shift closures for the month (actual sales data)
        supabase
          .from('shift_closures')
          .select('branch_id, total_facturado, total_hamburguesas')
          .gte('fecha', firstDayOfMonth)
          .lte('fecha', lastDayOfMonth),
        // Get clock entries for calculating hours
        supabase
          .from('clock_entries')
          .select('user_id, branch_id, entry_type, created_at')
          .gte('created_at', `${firstDayOfMonth}T00:00:00`)
          .lte('created_at', `${lastDayOfMonth}T23:59:59`)
          .order('created_at', { ascending: true }),
      ]);

      const branchesData = branchesRes.data || [];
      setBranches(branchesData);

      // Calculate totals from shift_closures
      const closures = closuresRes.data || [];
      let globalRevenue = 0;
      let globalHamburguesas = 0;
      
      closures.forEach(closure => {
        globalRevenue += Number(closure.total_facturado || 0);
        globalHamburguesas += Number(closure.total_hamburguesas || 0);
      });

      // Calculate hours from clock_entries
      const clockEntries = clockRes.data || [];
      const userSessions = new Map<string, Date | null>();
      let globalTotalMinutes = 0;
      
      clockEntries.forEach(entry => {
        const key = `${entry.user_id}-${entry.branch_id}`;
        const timestamp = new Date(entry.created_at);
        
        if (entry.entry_type === 'entrada') {
          userSessions.set(key, timestamp);
        } else if (entry.entry_type === 'salida') {
          const inTime = userSessions.get(key);
          if (inTime) {
            const minutes = (timestamp.getTime() - inTime.getTime()) / (1000 * 60);
            // Reasonable shift: between 0 and 16 hours
            if (minutes > 0 && minutes < 960) {
              globalTotalMinutes += minutes;
            }
            userSessions.set(key, null);
          }
        }
      });
      
      const globalHours = Math.round(globalTotalMinutes / 60 * 10) / 10;
      const globalProductivity = globalHours > 0 ? Math.round(globalHamburguesas / globalHours * 10) / 10 : 0;

      setStats({
        globalRevenue,
        globalHamburguesas,
        globalHours,
        globalProductivity,
      });
      setLoading(false);
    }
    fetchData();
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value);

  return (
    <div className="space-y-6">
      <PageHelp pageId="brand-dashboard" />
      
      <PageHeader title="Panel Mi Marca" subtitle="Gestión centralizada de todas las sucursales" />

      {/* Daily Sales Table */}
      <BrandDailySalesTable />

      {/* Global Monthly Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Resumen del Mes</CardTitle>
          <CardDescription>Totales de todas las sucursales</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                <DollarSign className="w-4 h-4" />
                Facturación Total
              </div>
              <div className="text-2xl font-bold text-primary">
                {loading ? <Skeleton className="h-8 w-24 mx-auto" /> : formatCurrency(stats.globalRevenue)}
              </div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                <Utensils className="w-4 h-4" />
                Hamburguesas
              </div>
              <div className="text-2xl font-bold text-primary">
                {loading ? <Skeleton className="h-8 w-16 mx-auto" /> : stats.globalHamburguesas.toLocaleString('es-AR')}
              </div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                <Clock className="w-4 h-4" />
                Horas Registradas
              </div>
              <div className="text-2xl font-bold text-primary">
                {loading ? <Skeleton className="h-8 w-16 mx-auto" /> : `${stats.globalHours}h`}
              </div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                <BarChart3 className="w-4 h-4" />
                Productividad
              </div>
              <div className="text-2xl font-bold text-accent">
                {loading ? <Skeleton className="h-8 w-16 mx-auto" /> : stats.globalProductivity}
              </div>
              <p className="text-xs text-muted-foreground mt-1">hamburguesas/hora</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branches Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Mis Sucursales
          </CardTitle>
          <CardDescription>
            Hacé clic en una sucursal para ver más detalles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {branches.map(branch => (
                <Link key={branch.id} to={`/mimarca/locales/${branch.slug}`}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold">{branch.name}</h3>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <MapPin className="w-3 h-3" />
                            {branch.city}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
