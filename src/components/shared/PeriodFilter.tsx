import { Calendar } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type Period = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';

interface PeriodFilterProps {
  value: Period;
  onChange: (value: Period) => void;
  showCustom?: boolean;
}

const periodLabels: Record<Period, string> = {
  today: 'Hoy',
  yesterday: 'Ayer',
  week: 'Esta semana',
  month: 'Este mes',
  year: 'Este año',
  custom: 'Personalizado',
};

/**
 * Unified period filter component for dashboard filtering.
 */
export function PeriodFilter({ value, onChange, showCustom = false }: PeriodFilterProps) {
  const periods: Period[] = showCustom 
    ? ['today', 'yesterday', 'week', 'month', 'year', 'custom']
    : ['today', 'yesterday', 'week', 'month', 'year'];

  return (
    <Select value={value} onValueChange={(v) => onChange(v as Period)}>
      <SelectTrigger className="w-[140px]">
        <Calendar className="w-4 h-4 mr-2" />
        <SelectValue placeholder="Período" />
      </SelectTrigger>
      <SelectContent>
        {periods.map((period) => (
          <SelectItem key={period} value={period}>
            {periodLabels[period]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
