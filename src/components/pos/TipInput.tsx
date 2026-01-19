import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TipInputProps {
  subtotal: number;
  tipAmount: number;
  onTipChange: (amount: number) => void;
  className?: string;
}

const TIP_PERCENTAGES = [0, 5, 10, 15, 20];

export default function TipInput({
  subtotal,
  tipAmount,
  onTipChange,
  className,
}: TipInputProps) {
  const [customMode, setCustomMode] = useState(false);

  const currentPercentage = subtotal > 0 ? Math.round((tipAmount / subtotal) * 100) : 0;

  const handlePercentageClick = (percentage: number) => {
    setCustomMode(false);
    onTipChange(Math.round(subtotal * (percentage / 100)));
  };

  const handleCustomChange = (value: string) => {
    const amount = parseFloat(value) || 0;
    onTipChange(amount);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium flex items-center gap-2">
        <Heart className="w-4 h-4 text-pink-500" />
        Propina
        {tipAmount > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {formatPrice(tipAmount)}
          </Badge>
        )}
      </Label>

      <div className="flex gap-1 flex-wrap">
        {TIP_PERCENTAGES.map((pct) => (
          <Button
            key={pct}
            variant={!customMode && currentPercentage === pct ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePercentageClick(pct)}
            className="min-w-[50px]"
          >
            {pct === 0 ? 'Sin' : `${pct}%`}
          </Button>
        ))}
        <Button
          variant={customMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setCustomMode(true);
          }}
        >
          Otro
        </Button>
      </div>

      {customMode && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-muted-foreground">$</span>
          <Input
            type="number"
            min="0"
            step="1"
            value={tipAmount || ''}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="Monto personalizado"
            className="max-w-[150px]"
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
