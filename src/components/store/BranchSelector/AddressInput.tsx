import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onGeolocation?: (coords: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
}

export function AddressInput({
  value,
  onChange,
  onSubmit,
  onGeolocation,
  placeholder = 'Ingresá tu dirección...',
  className = '',
}: AddressInputProps) {
  const [isLocating, setIsLocating] = useState(false);
  
  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización');
      return;
    }
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        onGeolocation?.(coords);
        setIsLocating(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('No pudimos obtener tu ubicación');
        setIsLocating(false);
      },
      { timeout: 10000 }
    );
  };
  
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Input */}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && value.trim() && onSubmit()}
          className="pl-11 h-12 text-base rounded-xl"
        />
      </div>
      
      {/* Actions */}
      <div className="flex gap-2">
        {onGeolocation && (
          <Button 
            variant="outline" 
            className="flex-1 h-11 rounded-xl"
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
        )}
        <Button 
          className="flex-1 h-11 rounded-xl"
          onClick={onSubmit}
          disabled={!value.trim()}
        >
          Buscar
        </Button>
      </div>
    </div>
  );
}
