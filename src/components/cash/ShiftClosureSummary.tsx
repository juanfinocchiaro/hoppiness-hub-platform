import { useShiftAdvances } from '@/hooks/useSalaryAdvances';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Banknote, Receipt, ArrowLeftRight, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ShiftClosureSummaryProps {
  shiftId: string;
  branchId: string;
}

export function ShiftClosureSummary({ shiftId, branchId }: ShiftClosureSummaryProps) {
  // Adelantos del turno
  const { data: advances = [], isLoading: loadingAdvances } = useShiftAdvances(shiftId);
  
  // Gastos del turno (excluyendo adelantos)
  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['shift-expenses', shiftId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_shift_expenses', {
        _shift_id: shiftId
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!shiftId,
  });
  
  // Alivios del turno
  const { data: alivios = [], isLoading: loadingAlivios } = useQuery({
    queryKey: ['shift-alivios', shiftId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_register_movements')
        .select(`
          id, amount, concept, created_at,
          recorder:profiles!cash_register_movements_recorded_by_fkey(full_name)
        `)
        .eq('shift_id', shiftId)
        .eq('type', 'egreso')
        .ilike('concept', '%alivio%')
        .order('created_at');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!shiftId,
  });
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };
  
  const formatTime = (dateStr: string) => {
    return format(new Date(dateStr), 'HH:mm', { locale: es });
  };
  
  const totalAdvances = advances.reduce((sum, a) => sum + (a.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalAlivios = alivios.reduce((sum, a) => sum + (a.amount || 0), 0);
  
  const isLoading = loadingAdvances || loadingExpenses || loadingAlivios;
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }
  
  const hasContent = advances.length > 0 || expenses.length > 0 || alivios.length > 0;
  
  if (!hasContent) return null;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">📤 Egresos del Turno</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Adelantos */}
        {advances.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Banknote className="h-4 w-4" />
              Adelantos de Sueldo
            </div>
            <div className="space-y-1 pl-6">
              {advances.map((adv) => (
                <div key={adv.id} className="flex justify-between text-sm">
                  <div>
                    <span className="font-medium">{adv.employee_name}</span>
                    <span className="text-muted-foreground ml-2">
                      (Aut: {adv.authorized_by_name} {formatTime(adv.paid_at)})
                    </span>
                  </div>
                  <span className="font-mono">{formatCurrency(adv.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-medium pt-1 border-t">
                <span>Subtotal Adelantos</span>
                <span>{formatCurrency(totalAdvances)}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Gastos */}
        {expenses.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Receipt className="h-4 w-4" />
              Gastos Operativos
            </div>
            <div className="space-y-1 pl-6">
              {expenses.map((exp) => (
                <div key={exp.id} className="flex justify-between text-sm">
                  <div>
                    <span className="font-medium">{exp.concept}</span>
                    {exp.category_name && (
                      <span className="text-muted-foreground ml-2">
                        ({exp.category_name})
                      </span>
                    )}
                    {exp.authorized_by_name && (
                      <span className="text-muted-foreground ml-1">
                        Aut: {exp.authorized_by_name}
                      </span>
                    )}
                  </div>
                  <span className="font-mono">{formatCurrency(exp.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-medium pt-1 border-t">
                <span>Subtotal Gastos</span>
                <span>{formatCurrency(totalExpenses)}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Alivios */}
        {alivios.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ArrowLeftRight className="h-4 w-4" />
              Alivios de Caja
            </div>
            <div className="space-y-1 pl-6">
              {alivios.map((alv: any) => (
                <div key={alv.id} className="flex justify-between text-sm">
                  <div>
                    <span className="font-medium">{alv.concept}</span>
                    {alv.recorder?.full_name && (
                      <span className="text-muted-foreground ml-2">
                        ({alv.recorder.full_name} {formatTime(alv.created_at)})
                      </span>
                    )}
                  </div>
                  <span className="font-mono">{formatCurrency(alv.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-medium pt-1 border-t">
                <span>Subtotal Alivios</span>
                <span>{formatCurrency(totalAlivios)}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Total Egresos */}
        <div className="flex justify-between font-semibold pt-2 border-t-2">
          <span>Total Egresos</span>
          <span className="text-lg">{formatCurrency(totalAdvances + totalExpenses + totalAlivios)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
