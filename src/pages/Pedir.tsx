import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Navigation, 
  Loader2, 
  Store, 
  Clock,
  AlertTriangle,
  Truck,
  ShoppingBag,
  Home
} from 'lucide-react';
import { toast } from 'sonner';
import logoOriginal from '@/assets/logo-hoppiness-original.jpg';
import heroBurger from '@/assets/hero-burger.jpg';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

// Córdoba center coordinates
const CORDOBA_CENTER = { lat: -31.4201, lng: -64.1888 };

// Simulated branch coordinates (in production, these would come from DB)
const BRANCH_COORDS: Record<string, { lat: number; lng: number; radius: number }> = {
  'general-paz': { lat: -31.4167, lng: -64.1833, radius: 5 },
  'manantiales': { lat: -31.3667, lng: -64.2333, radius: 6 },
  'nueva-cordoba': { lat: -31.4300, lng: -64.1850, radius: 4 },
  'villa-allende': { lat: -31.2933, lng: -64.2950, radius: 7 },
  'villa-carlos-paz': { lat: -31.4167, lng: -64.4833, radius: 8 },
};

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function Pedir() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [matchedBranch, setMatchedBranch] = useState<Branch | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showBranchList, setShowBranchList] = useState(false);

  useEffect(() => {
    async function fetchBranches() {
      const { data } = await supabase
        .from('branches')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (data) setBranches(data);
      setLoading(false);
    }
    fetchBranches();
  }, []);

  const findNearestBranch = (lat: number, lng: number): Branch | null => {
    let nearestBranch: Branch | null = null;
    let minDistance = Infinity;

    branches.forEach(branch => {
      const slug = branch.slug || branch.id;
      const coords = BRANCH_COORDS[slug];
      if (coords) {
        const distance = calculateDistance(lat, lng, coords.lat, coords.lng);
        if (distance < coords.radius && distance < minDistance) {
          minDistance = distance;
          nearestBranch = branch;
        }
      }
    });

    return nearestBranch;
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        
        const nearest = findNearestBranch(latitude, longitude);
        if (nearest) {
          setMatchedBranch(nearest);
          setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          toast.success(`¡Encontramos tu sucursal más cercana!`);
        } else {
          toast.info('Estás fuera de nuestra zona de delivery. Podés retirar en local.');
          setOrderType('pickup');
          setShowBranchList(true);
        }
        setIsLocating(false);
      },
      () => {
        toast.error('No pudimos obtener tu ubicación');
        setIsLocating(false);
      }
    );
  };

  const handleAddressSubmit = () => {
    if (!address.trim()) {
      toast.error('Ingresá una dirección');
      return;
    }

    // Simulate geocoding - in production, use a geocoding API
    // For demo, we'll match by keywords
    const addressLower = address.toLowerCase();
    let matched: Branch | null = null;

    if (addressLower.includes('manantiales') || addressLower.includes('circunvalación')) {
      matched = branches.find(b => b.slug === 'manantiales') || null;
    } else if (addressLower.includes('nueva córdoba') || addressLower.includes('nueva cordoba') || addressLower.includes('güemes')) {
      matched = branches.find(b => b.slug === 'nueva-cordoba') || null;
    } else if (addressLower.includes('general paz') || addressLower.includes('centro')) {
      matched = branches.find(b => b.slug === 'general-paz') || null;
    } else if (addressLower.includes('villa allende') || addressLower.includes('allende')) {
      matched = branches.find(b => b.slug === 'villa-allende') || null;
    } else if (addressLower.includes('carlos paz') || addressLower.includes('villa carlos')) {
      matched = branches.find(b => b.slug === 'villa-carlos-paz') || null;
    } else {
      // Default to nearest open branch or show list
      matched = branches.find(b => b.is_open) || branches[0] || null;
    }

    if (matched) {
      setMatchedBranch(matched);
    } else {
      setShowBranchList(true);
    }
  };

  const handleContinue = () => {
    if (matchedBranch) {
      const slug = matchedBranch.slug || matchedBranch.id;
      // Store address and order type in sessionStorage for the menu page
      sessionStorage.setItem('orderAddress', address);
      sessionStorage.setItem('orderType', orderType);
      navigate(`/pedir/${slug}`);
    }
  };

  const openBranches = branches.filter(b => b.is_open);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-primary/95">
      {/* Hero Section */}
      <div className="relative min-h-[45vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${heroBurger})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/60 via-primary/80 to-primary" />
        
        {/* Home Button */}
        <Link 
          to="/" 
          className="absolute top-4 left-4 z-20 bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors rounded-full p-3"
        >
          <Home className="w-5 h-5 text-white" />
        </Link>
        
        <div className="relative z-10 container mx-auto px-4 py-12 text-center">
          <img 
            src={logoOriginal} 
            alt="Hoppiness Club" 
            className="w-24 h-24 mx-auto mb-6 rounded-full shadow-2xl ring-4 ring-white/20" 
          />
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 font-brand">
            ¿Dónde te llevamos tu Hoppiness?
          </h1>
          <p className="text-xl text-white/70 max-w-lg mx-auto">
            Ingresá tu dirección y te asignamos la sucursal más cercana
          </p>
        </div>
      </div>

      {/* Address Input Section */}
      <div className="container mx-auto px-4 -mt-12 relative z-20 pb-12">
        <Card className="max-w-xl mx-auto shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardContent className="p-6 space-y-6">
            {/* Order Type Toggle */}
            <div className="flex bg-muted rounded-lg p-1">
              <Button
                variant={orderType === 'delivery' ? 'default' : 'ghost'}
                className="flex-1"
                onClick={() => setOrderType('delivery')}
              >
                <Truck className="w-4 h-4 mr-2" />
                Delivery
              </Button>
              <Button
                variant={orderType === 'pickup' ? 'default' : 'ghost'}
                className="flex-1"
                onClick={() => { setOrderType('pickup'); setShowBranchList(true); }}
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Retiro en local
              </Button>
            </div>

            {orderType === 'delivery' && !showBranchList && (
              <>
                {/* Address Input */}
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Ingresá tu dirección..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddressSubmit()}
                    className="pl-11 h-12 text-lg"
                  />
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleGeolocation}
                    disabled={isLocating}
                  >
                    {isLocating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Navigation className="w-4 h-4 mr-2" />
                    )}
                    Usar mi ubicación
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={handleAddressSubmit}
                    disabled={!address.trim()}
                  >
                    Buscar
                  </Button>
                </div>
              </>
            )}

            {/* Matched Branch Result */}
            {matchedBranch && !showBranchList && (
              <div className="border-t pt-6 space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Store className="w-4 h-4" />
                  <span>Tu pedido será preparado en:</span>
                </div>
                
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-primary">
                        Hoppiness {matchedBranch.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {matchedBranch.address}, {matchedBranch.city}
                      </p>
                    </div>
                    {matchedBranch.is_open ? (
                      <Badge className="bg-green-500">
                        <span className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></span>
                        Abierto
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Cerrado
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      ~{matchedBranch.estimated_prep_time_min || 25} min
                    </span>
                  </div>
                </div>

                <Button 
                  size="lg" 
                  className="w-full h-14 text-lg"
                  onClick={handleContinue}
                  disabled={!matchedBranch.is_open}
                >
                  {matchedBranch.is_open ? 'Ver Menú y Pedir' : 'Sucursal cerrada'}
                </Button>

                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => setShowBranchList(true)}
                >
                  Elegir otra sucursal
                </Button>
              </div>
            )}

            {/* Branch List (for pickup or manual selection) */}
            {showBranchList && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">Elegí una sucursal</h3>
                  {orderType === 'delivery' && (
                    <Button variant="ghost" size="sm" onClick={() => setShowBranchList(false)}>
                      Volver
                    </Button>
                  )}
                </div>
                
                <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                  {openBranches.map(branch => (
                    <Card 
                      key={branch.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        matchedBranch?.id === branch.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => {
                        setMatchedBranch(branch);
                        setShowBranchList(false);
                      }}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Hoppiness {branch.name}</h4>
                          <p className="text-sm text-muted-foreground">{branch.city}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            ~{branch.estimated_prep_time_min || 25}'
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {branches.filter(b => !b.is_open).length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-2">Cerradas ahora:</p>
                    {branches.filter(b => !b.is_open).map(branch => (
                      <div key={branch.id} className="opacity-50 p-3 text-sm">
                        Hoppiness {branch.name} - Cerrado
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
