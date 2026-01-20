import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Home, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';
import { BranchCard, DeliveryModeToggle, AddressInput } from '@/components/store/BranchSelector';
import { BranchChangeModal } from '@/components/store/common';
import logoOriginal from '@/assets/logo-hoppiness-original.jpg';
import heroBurger from '@/assets/hero-burger.jpg';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

// Simulated branch coordinates (in production, these would come from DB)
const BRANCH_COORDS: Record<string, { lat: number; lng: number; radius: number }> = {
  'general-paz': { lat: -31.4167, lng: -64.1833, radius: 5 },
  'manantiales': { lat: -31.3667, lng: -64.2333, radius: 6 },
  'nueva-cordoba': { lat: -31.4300, lng: -64.1850, radius: 4 },
  'villa-allende': { lat: -31.2933, lng: -64.2950, radius: 7 },
  'villa-carlos-paz': { lat: -31.4167, lng: -64.4833, radius: 8 },
};

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
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
  const { 
    orderMode, 
    setOrderMode, 
    deliveryAddress, 
    setDeliveryAddress,
    showBranchChangeModal,
    pendingBranchChange,
    confirmBranchChange,
    cancelBranchChange,
    branch: currentBranch,
  } = useCart();
  
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchedBranch, setMatchedBranch] = useState<Branch | null>(null);
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

  const handleGeolocation = (coords: { lat: number; lng: number }) => {
    const nearest = findNearestBranch(coords.lat, coords.lng);
    if (nearest) {
      setMatchedBranch(nearest);
      setDeliveryAddress(`${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
      toast.success(`¡Encontramos tu sucursal más cercana!`);
    } else {
      toast.info('Estás fuera de nuestra zona de delivery. Podés retirar en local.');
      setOrderMode('takeaway');
      setShowBranchList(true);
    }
  };

  const handleAddressSubmit = () => {
    if (!deliveryAddress.trim()) {
      toast.error('Ingresá una dirección');
      return;
    }

    const addressLower = deliveryAddress.toLowerCase();
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
      sessionStorage.setItem('orderAddress', deliveryAddress);
      sessionStorage.setItem('orderType', orderMode);
      navigate(`/pedir/${slug}`);
    }
  };

  const handleSelectBranch = (branch: Branch) => {
    setMatchedBranch(branch);
    setShowBranchList(false);
  };

  const openBranches = branches.filter(b => b.is_open);
  const closedBranches = branches.filter(b => !b.is_open);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary to-primary/95">
        <div className="relative min-h-[45vh] flex items-center justify-center">
          <div className="container mx-auto px-4 py-12 text-center">
            <Skeleton className="w-24 h-24 mx-auto rounded-full" />
            <Skeleton className="h-12 w-3/4 mx-auto mt-6" />
            <Skeleton className="h-6 w-1/2 mx-auto mt-4" />
          </div>
        </div>
        <div className="container mx-auto px-4 -mt-12 relative z-20 pb-12">
          <Skeleton className="max-w-xl mx-auto h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-primary/95">
      {/* Branch Change Modal */}
      <BranchChangeModal
        open={showBranchChangeModal}
        currentBranch={currentBranch}
        newBranch={pendingBranchChange}
        onConfirm={() => pendingBranchChange && confirmBranchChange(pendingBranchChange)}
        onCancel={cancelBranchChange}
      />

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
            {orderMode === 'delivery' 
              ? '¿Dónde te llevamos tu Hoppiness?' 
              : '¿En qué local retirás?'}
          </h1>
          <p className="text-xl text-white/70 max-w-lg mx-auto">
            {orderMode === 'delivery'
              ? 'Ingresá tu dirección y te asignamos la sucursal más cercana'
              : 'Elegí la sucursal donde querés retirar tu pedido'}
          </p>
        </div>
      </div>

      {/* Address Input Section */}
      <div className="container mx-auto px-4 -mt-12 relative z-20 pb-12">
        <Card className="max-w-xl mx-auto shadow-2xl border-0 bg-card/95 backdrop-blur-sm">
          <CardContent className="p-6 space-y-6">
            {/* Order Type Toggle */}
            <DeliveryModeToggle
              mode={orderMode}
              onChange={(mode) => {
                setOrderMode(mode);
                if (mode === 'takeaway') {
                  setShowBranchList(true);
                } else {
                  setShowBranchList(false);
                }
              }}
            />

            {/* Address Input for Delivery */}
            {orderMode === 'delivery' && !showBranchList && (
              <AddressInput
                value={deliveryAddress}
                onChange={setDeliveryAddress}
                onSubmit={handleAddressSubmit}
                onGeolocation={handleGeolocation}
              />
            )}

            {/* Matched Branch Result */}
            {matchedBranch && !showBranchList && (
              <div className="border-t pt-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Tu pedido será preparado en:
                </p>
                
                <BranchCard
                  branch={matchedBranch}
                  isRecommended
                  onSelect={() => {}}
                />

                <Button 
                  size="lg" 
                  className="w-full h-14 text-lg"
                  onClick={handleContinue}
                  disabled={!matchedBranch.is_open}
                >
                  {matchedBranch.is_open ? (
                    <>
                      Ver Menú y Pedir
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  ) : (
                    'Sucursal cerrada'
                  )}
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

            {/* Branch List */}
            {showBranchList && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">Elegí una sucursal</h3>
                  {orderMode === 'delivery' && (
                    <Button variant="ghost" size="sm" onClick={() => setShowBranchList(false)}>
                      Volver
                    </Button>
                  )}
                </div>
                
                <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                  {openBranches.map(branch => (
                    <BranchCard
                      key={branch.id}
                      branch={branch}
                      isRecommended={matchedBranch?.id === branch.id}
                      onSelect={() => handleSelectBranch(branch)}
                    />
                  ))}
                </div>

                {closedBranches.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-2">Cerradas ahora:</p>
                    <div className="space-y-2 opacity-60">
                      {closedBranches.map(branch => (
                        <BranchCard
                          key={branch.id}
                          branch={branch}
                          onSelect={() => {}}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {matchedBranch && matchedBranch.is_open && (
                  <Button 
                    size="lg" 
                    className="w-full h-14 text-lg"
                    onClick={handleContinue}
                  >
                    Continuar con {matchedBranch.name}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
