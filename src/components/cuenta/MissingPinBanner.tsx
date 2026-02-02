import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Fingerprint, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface MissingPinBannerProps {
  employeeName?: string;
}

export default function MissingPinBanner({ employeeName }: MissingPinBannerProps) {
  const navigate = useNavigate();
  
  const handleClick = () => {
    // Navigate to profile page with hash to scroll to PIN section
    navigate('/cuenta/perfil#pin');
  };
  
  return (
    <Alert className="border-warning bg-warning/10">
      <Fingerprint className="h-5 w-5 text-warning" />
      <AlertTitle className="text-warning-foreground font-semibold">
        ¡Configurá tu PIN de fichaje!
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="text-muted-foreground mb-3">
          Para poder fichar entrada y salida en tu sucursal, necesitás crear un PIN de 4 dígitos.
        </p>
        <Button size="sm" className="gap-2" onClick={handleClick}>
          Crear mi PIN
          <ArrowRight className="w-4 h-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}
