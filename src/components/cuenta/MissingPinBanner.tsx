import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Fingerprint, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MissingPinBannerProps {
  employeeName?: string;
}

export default function MissingPinBanner({ employeeName }: MissingPinBannerProps) {
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
        <Link to="/cuenta/perfil">
          <Button size="sm" className="gap-2">
            Crear mi PIN
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
}
