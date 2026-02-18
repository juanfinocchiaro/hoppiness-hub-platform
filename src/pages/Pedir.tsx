import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ExternalLink, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoHoppiness from '@/assets/logo-hoppiness-blue.png';

const MAS_DELIVERY_URL = 'https://pedidos.masdelivery.com/hoppiness';
const IFRAME_TIMEOUT_MS = 4000;

type LoadState = 'loading' | 'success' | 'fallback';

function IframeView() {
  const [state, setState] = useState<LoadState>('loading');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleLoad = useCallback(() => {
    clearTimeout(timerRef.current);
    setState('success');
  }, []);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setState(prev => (prev === 'loading' ? 'fallback' : prev));
    }, IFRAME_TIMEOUT_MS);
    return () => clearTimeout(timerRef.current);
  }, []);

  if (state === 'fallback') {
    return <Fallback />;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Minimal header */}
      <header className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between shrink-0">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoHoppiness} alt="Hoppiness Club" className="w-8 h-8 rounded-full" />
          <span className="font-bold font-brand text-sm hidden sm:inline">HOPPINESS CLUB</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Volver
            </Button>
          </Link>
          <a href={MAS_DELIVERY_URL} target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <ExternalLink className="w-3 h-3 mr-1" />
              Abrir en nueva pestaña
            </Button>
          </a>
        </div>
      </header>

      {/* Loading overlay */}
      {state === 'loading' && (
        <div className="flex-1 bg-background flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Cargando tienda...</p>
          </div>
        </div>
      )}

      {/* Iframe */}
      <iframe
        ref={iframeRef}
        src={MAS_DELIVERY_URL}
        onLoad={handleLoad}
        title="Hoppiness - Pedí Online"
        className={`flex-1 w-full border-0 ${state === 'loading' ? 'h-0 overflow-hidden' : ''}`}
        allow="payment; geolocation"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
}

function Fallback() {
  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-4">
      <div className="text-center text-white max-w-md">
        <img src={logoHoppiness} alt="Hoppiness Club" className="w-20 h-20 mx-auto mb-6 rounded-full" />
        <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-accent" />
        <h1 className="text-2xl font-black font-brand mb-2">PEDÍ TU HAMBURGUESA</h1>
        <p className="text-white/80 mb-6">
          Hacé tu pedido en nuestra tienda de Mas Delivery
        </p>
        <a href={MAS_DELIVERY_URL} target="_blank" rel="noopener noreferrer">
          <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
            Ir a Mas Delivery
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </a>
        <Link to="/" className="block mt-6">
          <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver al inicio
          </Button>
        </Link>
        <p className="text-white/50 text-xs mt-6">
          Pronto vas a poder pedir directamente desde nuestra app.
        </p>
      </div>
    </div>
  );
}

export default function Pedir() {
  return <IframeView />;
}
