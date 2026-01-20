import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Gift, 
  History, 
  Repeat, 
  Sparkles, 
  X,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const BENEFITS = [
  { icon: History, text: 'Historial de pedidos' },
  { icon: Repeat, text: 'Repetir pedidos anteriores' },
  { icon: Gift, text: 'Promociones exclusivas' },
];

export function RegisterBanner() {
  const [isDismissed, setIsDismissed] = useState(false);
  
  // Check localStorage for dismissed state
  const storageKey = 'register_banner_dismissed';
  const wasDismissed = typeof window !== 'undefined' && localStorage.getItem(storageKey) === 'true';
  
  if (isDismissed || wasDismissed) {
    return null;
  }
  
  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(storageKey, 'true');
  };

  return (
    <Card className="rounded-2xl border-0 shadow-md overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <CardContent className="p-5 relative">
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
        
        {/* Header */}
        <div className="flex items-start gap-3 mb-4 pr-6">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">¿Querés seguir tu pedido desde cualquier lugar?</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Creá tu cuenta gratis y accedé a beneficios exclusivos
            </p>
          </div>
        </div>
        
        {/* Benefits list */}
        <div className="space-y-2 mb-4 ml-1">
          {BENEFITS.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                <benefit.icon className="w-3 h-3 text-primary" />
              </div>
              <span className="text-muted-foreground">{benefit.text}</span>
            </div>
          ))}
        </div>
        
        {/* CTA Button */}
        <Link to="/mi-cuenta/registro" className="block">
          <Button className="w-full rounded-xl group">
            Crear cuenta gratis
            <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </Link>
        
        {/* Already have account */}
        <p className="text-center text-xs text-muted-foreground mt-3">
          ¿Ya tenés cuenta?{' '}
          <Link to="/mi-cuenta" className="text-primary hover:underline font-medium">
            Iniciá sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}