import { MapPinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeliveryUnavailableProps {
  onSwitchToPickup: () => void;
  onChangeAddress: () => void;
}

export function DeliveryUnavailable({ onSwitchToPickup, onChangeAddress }: DeliveryUnavailableProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-4 space-y-3 text-center">
      <div className="flex justify-center">
        <MapPinOff className="h-8 w-8 text-red-400" />
      </div>
      <p className="text-sm font-medium text-red-700 dark:text-red-400">
        Por el momento no tenemos cobertura en tu zona.
      </p>
      <div className="flex flex-col gap-2">
        <Button variant="default" size="sm" onClick={onSwitchToPickup}>
          Elegir Retiro en local
        </Button>
        <Button variant="outline" size="sm" onClick={onChangeAddress}>
          Cambiar dirección
        </Button>
      </div>
    </div>
  );
}
