import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWebappConfig, useWebappMenuItems } from '@/hooks/useWebappMenu';
import { useWebappCart } from '@/hooks/useWebappCart';
import { BranchLanding } from '@/components/webapp/BranchLanding';
import { WebappMenuView } from '@/components/webapp/WebappMenuView';
import { CartBar } from '@/components/webapp/CartBar';
import { CartSheet } from '@/components/webapp/CartSheet';
import { ProductCustomizeSheet } from '@/components/webapp/ProductCustomizeSheet';
import { SEO } from '@/components/SEO';
import { Loader2 } from 'lucide-react';
import type { TipoServicioWebapp, WebappMenuItem } from '@/types/webapp';

export default function PedirPage() {
  const { branchSlug } = useParams<{ branchSlug: string }>();
  const { data, isLoading, error } = useWebappConfig(branchSlug);
  const { data: menuItems, isLoading: menuLoading } = useWebappMenuItems(data?.branch?.id);
  const cart = useWebappCart();

  const [step, setStep] = useState<'landing' | 'menu'>('landing');
  const [cartOpen, setCartOpen] = useState(false);
  const [customizeItem, setCustomizeItem] = useState<WebappMenuItem | null>(null);

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

  // Fallback: si el local no tiene webapp activa, redirigir a MasDelivery
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
    // For simple items, quick add. For complex, open customize.
    // For now, all open customize to let user see the product
    setCustomizeItem(item);
  };

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
          />

          {cart.totalItems > 0 && (
            <CartBar
              totalItems={cart.totalItems}
              totalPrecio={cart.totalPrecio}
              onOpen={() => setCartOpen(true)}
            />
          )}

          <CartSheet
            open={cartOpen}
            onOpenChange={setCartOpen}
            cart={cart}
            branchName={branch.name}
          />

          <ProductCustomizeSheet
            item={customizeItem}
            onClose={() => setCustomizeItem(null)}
            onAdd={(cartItem) => {
              cart.addItem(cartItem);
              setCustomizeItem(null);
            }}
          />
        </>
      )}
    </div>
  );
}
