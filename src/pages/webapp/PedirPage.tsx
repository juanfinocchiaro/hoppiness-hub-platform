import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWebappConfig, useWebappMenuItems } from '@/hooks/useWebappMenu';
import { useWebappCart } from '@/hooks/useWebappCart';
import { useMercadoPagoStatus } from '@/hooks/useMercadoPagoConfig';
import { BranchLanding } from '@/components/webapp/BranchLanding';
import { WebappMenuView } from '@/components/webapp/WebappMenuView';
import { CartBar } from '@/components/webapp/CartBar';
import { CartSheet } from '@/components/webapp/CartSheet';
import { CartSidePanel } from '@/components/webapp/CartSidePanel';
import { ProductCustomizeSheet } from '@/components/webapp/ProductCustomizeSheet';
import { SEO } from '@/components/SEO';
import { Loader2 } from 'lucide-react';
import type { TipoServicioWebapp, WebappMenuItem } from '@/types/webapp';

export default function PedirPage() {
  const { branchSlug } = useParams<{ branchSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading, error } = useWebappConfig(branchSlug);
  const { data: menuItems, isLoading: menuLoading } = useWebappMenuItems(data?.branch?.id);
  const { data: mpStatus } = useMercadoPagoStatus(data?.branch?.id);
  const cart = useWebappCart();
  const navigate = useNavigate();
  const mpEnabled = mpStatus?.estado_conexion === 'conectado';

  // Skip landing when store is open — go straight to menu
  const storeIsOpen = data?.config?.estado === 'abierto';
  const hasOnlyOneService = data?.config
    ? [data.config.retiro_habilitado, data.config.delivery_habilitado, data.config.comer_aca_habilitado].filter(Boolean).length === 1
    : false;
  const [step, setStep] = useState<'landing' | 'menu'>('landing');
  const [cartOpen, setCartOpen] = useState(false);
  const [cartInitialStep, setCartInitialStep] = useState<'cart' | 'checkout'>('cart');

  // Auto-skip landing when store is open
  useEffect(() => {
    if (!data?.config) return;
    if (storeIsOpen && step === 'landing') {
      const config = data.config;
      if (config.retiro_habilitado) {
        cart.setTipoServicio('retiro');
      } else if (config.delivery_habilitado) {
        cart.setTipoServicio('delivery');
      } else if (config.comer_aca_habilitado) {
        cart.setTipoServicio('comer_aca');
      }
      setStep('menu');
    }
  }, [data?.config, storeIsOpen]);
  const [customizeItem, setCustomizeItem] = useState<WebappMenuItem | null>(null);

  // Deep linking: auto-open product from ?item= query param
  useEffect(() => {
    const itemId = searchParams.get('item');
    if (itemId && menuItems && menuItems.length > 0 && !customizeItem) {
      const found = menuItems.find(i => i.id === itemId);
      if (found) {
        setCustomizeItem(found);
        // Clear the param so it doesn't re-open on navigation
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, menuItems, customizeItem]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Local no encontrado</h1>
          <p className="text-muted-foreground">Verificá el link y volvé a intentar.</p>
        </div>
      </div>
    );
  }

  if (!data.config.webapp_activa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary p-6">
        <div className="text-center text-white max-w-sm space-y-4">
          <h1 className="text-2xl font-black font-brand">{data.branch.name}</h1>
          <p className="text-white/80">
            Este local todavía no tiene pedidos online directos. Podés pedir por MasDelivery.
          </p>
          <a href="https://pedidos.masdelivery.com/hoppiness" target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              Ir a MasDelivery
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </a>
          <Link to="/pedir" className="block mt-4">
            <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Ver otros locales
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { branch, config } = data;

  const handleSelectService = (tipo: TipoServicioWebapp) => {
    cart.setTipoServicio(tipo);
    setStep('menu');
  };

  const handleProductClick = (item: WebappMenuItem) => {
    // Update URL for deep linking (shareable product link)
    setSearchParams({ item: item.id }, { replace: true });
    setCustomizeItem(item);
  };

  const handleOpenCartMobile = () => {
    setCartInitialStep('cart');
    setCartOpen(true);
  };

  const handleContinueFromSidePanel = () => {
    setCartInitialStep('checkout');
    setCartOpen(true);
  };

  const isDelivery = cart.tipoServicio === 'delivery';
  const costoEnvio = isDelivery ? (config.delivery_costo ?? 0) : 0;
  const showSidePanel = step === 'menu' && cart.totalItems > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={`Pedí en ${branch.name} | Hoppiness`}
        description={`Hacé tu pedido online en Hoppiness ${branch.name}. Hamburguesas smash premiadas.`}
        path={`/pedir/${branchSlug}`}
      />

      {step === 'landing' ? (
        <BranchLanding
          branch={branch}
          config={config}
          onSelectService={handleSelectService}
          onViewMenu={() => setStep('menu')}
          onBack={() => navigate('/pedir')}
        />
      ) : (
        <>
          <WebappMenuView
            branch={branch}
            config={config}
            items={menuItems || []}
            loading={menuLoading}
            tipoServicio={cart.tipoServicio}
            cart={cart}
            onProductClick={handleProductClick}
            onBack={() => setStep('landing')}
            onServiceChange={(tipo) => cart.setTipoServicio(tipo)}
            cartPanelVisible={showSidePanel}
          />

          {/* Desktop side cart panel */}
          {showSidePanel && (
            <CartSidePanel
              cart={cart}
              costoEnvio={costoEnvio}
              onContinue={handleContinueFromSidePanel}
              suggestedItems={menuItems || []}
              onAddSuggested={(item) => cart.quickAdd(item.id, item.nombre, item.precio_base, item.imagen_url)}
            />
          )}

          {/* Mobile cart bar */}
          {cart.totalItems > 0 && (
            <CartBar
              totalItems={cart.totalItems}
              totalPrecio={cart.totalPrecio}
              onOpen={handleOpenCartMobile}
            />
          )}

          <CartSheet
            open={cartOpen}
            onOpenChange={setCartOpen}
            cart={cart}
            branchName={branch.name}
            branchId={branch.id}
            mpEnabled={mpEnabled}
            deliveryCosto={costoEnvio}
            initialStep={cartInitialStep}
          />

          <ProductCustomizeSheet
            item={customizeItem}
            onClose={() => {
              setCustomizeItem(null);
              // Clear deep link param
              if (searchParams.has('item')) setSearchParams({}, { replace: true });
            }}
            onAdd={(cartItem) => {
              cart.addItem(cartItem);
              setCustomizeItem(null);
              if (searchParams.has('item')) setSearchParams({}, { replace: true });
            }}
          />
        </>
      )}
    </div>
  );
}
