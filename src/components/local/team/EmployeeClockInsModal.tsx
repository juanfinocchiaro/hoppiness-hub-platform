/**
 * EmployeeClockInsModal - Modal para ver fichajes de un empleado específico
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { LogIn, LogOut, Clock } from 'lucide-react';

interface EmployeeClockInsModalProps {
  userId: string;
  userName: string;
  branchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeClockInsModal({ 
  userId, 
  userName, 
  branchId, 
  open, 
  onOpenChange 
}: EmployeeClockInsModalProps) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const { data: clockIns, isLoading } = useQuery({
    queryKey: ['employee-clock-ins', userId, branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clock_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('branch_id', branchId)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Calculate total hours
  const calculateHours = () => {
    if (!clockIns?.length) return 0;
    
    let totalMinutes = 0;
    let lastClockIn: Date | null = null;
    
    const sorted = [...clockIns].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    for (const entry of sorted) {
      if (entry.entry_type === 'clock_in') {
        lastClockIn = new Date(entry.created_at);
      } else if (entry.entry_type === 'clock_out' && lastClockIn) {
        totalMinutes += (new Date(entry.created_at).getTime() - lastClockIn.getTime()) / 60000;
        lastClockIn = null;
      }
    }

    return Math.round(totalMinutes / 60 * 10) / 10;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Fichajes de {userName}
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4 p-3 bg-muted rounded-lg">
          <div className="text-sm text-muted-foreground">
            {format(monthStart, "MMMM yyyy", { locale: es })}
          </div>
          <div className="text-2xl font-bold">
            {calculateHours()}h trabajadas
          </div>
        </div>

        {isLoading ? (
          <HoppinessLoader size="sm" text="Cargando fichajes..." />
        ) : clockIns?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Sin fichajes este mes
          </p>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {clockIns?.map((entry) => (
                <div 
                  key={entry.id} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {entry.entry_type === 'clock_in' ? (
                      <div className="p-2 rounded-full bg-green-100 text-green-600">
                        <LogIn className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="p-2 rounded-full bg-red-100 text-red-600">
                        <LogOut className="h-4 w-4" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium">
                        {entry.entry_type === 'clock_in' ? 'Entrada' : 'Salida'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(entry.created_at), "EEEE dd/MM", { locale: es })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg">
                      {format(new Date(entry.created_at), "HH:mm")}
                    </div>
                    {entry.gps_status && (
                      <Badge variant={entry.gps_status === 'ok' ? 'secondary' : 'outline'} className="text-xs">
                        {entry.gps_status === 'ok' ? 'GPS ✓' : 'Sin GPS'}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
