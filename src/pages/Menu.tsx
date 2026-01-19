import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Menu as MenuIcon,
  Truck, 
  ShoppingBag,
  Clock,
  MapPin,
  CreditCard
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

type OrderType = 'delivery' | 'takeaway';

export default function MenuPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [orderType, setOrderType] = useState<OrderType>('delivery');
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

  const getEstimatedTime = (branch: Branch) => {
    // Mock estimated times based on order type
    if (orderType === 'delivery') {
      return "30' y 45'";
    }
    return "15' y 30'";
  };

  const filteredBranches = branches.filter(branch => {
    // Carlos Paz only has takeaway
    if (branch.name.toLowerCase().includes('carlos paz') && orderType === 'delivery') {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold tracking-wide">HOPPINESS</h1>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
            <MenuIcon className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-primary to-primary/90 text-primary-foreground overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&q=80")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative container mx-auto px-4 py-12 text-center">
          {/* Logo */}
          <div className="w-24 h-24 mx-auto mb-6 rounded-full border-4 border-primary-foreground/30 bg-primary flex items-center justify-center">
            <span className="text-2xl font-black">HC</span>
          </div>
          
          <h2 className="text-xl mb-6">Ingresá tu dirección</h2>
          
          {/* Branch Selector */}
          <div className="max-w-md mx-auto">
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="bg-white text-foreground h-12 text-left">
                <SelectValue placeholder="Seleccionar sucursal..." />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name} - {branch.address}, {branch.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Order Type Toggle */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center gap-2">
          <Button
            variant={orderType === 'delivery' ? 'default' : 'outline'}
            onClick={() => setOrderType('delivery')}
            className={`px-8 ${orderType === 'delivery' ? '' : 'bg-white'}`}
          >
            <Truck className="w-4 h-4 mr-2" />
            Delivery
          </Button>
          <Button
            variant={orderType === 'takeaway' ? 'default' : 'outline'}
            onClick={() => setOrderType('takeaway')}
            className={`px-8 ${orderType === 'takeaway' ? '' : 'bg-white'}`}
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Retiro
          </Button>
        </div>
      </div>

      {/* Branch Cards */}
      <section className="container mx-auto px-4 pb-12">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded w-3/4 mb-3" />
                  <div className="h-4 bg-muted rounded w-full mb-4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No hay sucursales disponibles para {orderType === 'delivery' ? 'delivery' : 'retiro'}.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBranches.map((branch) => (
              <BranchCard 
                key={branch.id} 
                branch={branch} 
                orderType={orderType}
                estimatedTime={getEstimatedTime(branch)}
                onSelect={() => setSelectedBranch(branch.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

interface BranchCardProps {
  branch: Branch;
  orderType: OrderType;
  estimatedTime: string;
  onSelect: () => void;
}

function BranchCard({ branch, orderType, estimatedTime, onSelect }: BranchCardProps) {
  // @ts-ignore - new columns
  const hasDelivery = branch.delivery_enabled !== false;
  // @ts-ignore
  const slug = branch.slug || branch.id;
  
  return (
    <Link to={`/pedir/${slug}`}>
      <Card 
        className="cursor-pointer hover:shadow-elevated transition-shadow border-2 hover:border-primary/20"
      >
        <CardContent className="p-5">
          <h3 className="text-lg font-bold text-primary mb-1">
            Hoppiness - {branch.name}
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            <MapPin className="w-3 h-3 inline mr-1" />
            {branch.address}, {branch.city}
          </p>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Clock className="w-4 h-4" />
            <span>Entre {estimatedTime}</span>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {hasDelivery && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Truck className="w-3 h-3" />
                <span>Delivery</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ShoppingBag className="w-3 h-3" />
              <span>Retiro en el local</span>
            </div>
            <Badge className="bg-accent text-accent-foreground text-xs ml-auto">
              <CreditCard className="w-3 h-3 mr-1" />
              Pago Online
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
