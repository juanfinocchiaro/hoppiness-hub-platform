import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Fingerprint, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MissingPinBannerProps {
  missingCount?: number;
  totalCount?: number;
}

export default function MissingPinBanner({ missingCount = 1, totalCount = 1 }: MissingPinBannerProps) {
  const navigate = useNavigate();
  
  const handleClick = () => {
    navigate('/cuenta/perfil#pin');
  };

  const getMessage = () => {
    if (totalCount === 1) {
      return 'Para poder fichar entrada y salida en tu sucursal, necesitás crear un PIN de 4 dígitos.';
    }
    if (missingCount === totalCount) {
      return `Necesitás configurar tu PIN de fichaje en ${missingCount} ${missingCount === 1 ? 'sucursal' : 'sucursales'}.`;
    }
    return `Te falta configurar el PIN en ${missingCount} de ${totalCount} sucursales.`;
  };
  
  return (
    <Alert className="border-warning bg-warning/10">
      <Fingerprint className="h-5 w-5 text-warning" />
      <AlertTitle className="text-warning-foreground font-semibold">
        ¡Configurá tu PIN de fichaje!
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="text-muted-foreground mb-3">
          {getMessage()}
        </p>
        <Button size="sm" className="gap-2" onClick={handleClick}>
          Crear mi PIN
          <ArrowRight className="w-4 h-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}
