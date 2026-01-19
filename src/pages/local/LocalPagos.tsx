import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Users, 
  DollarSign, 
  Plus, 
  Wallet,
  RefreshCw,
  Truck,
  Coffee
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface StaffMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
}

interface HRPayment {
  id: string;
  employee_name: string;
  amount: number;
  type: 'adelanto' | 'jornal' | 'comida';
  date: string;
  notes: string | null;
}

export default function LocalPagos() {
  const { branchId } = useParams<{ branchId: string }>();
  const { branch } = useOutletContext<{ branch: Branch | null }>();
  const { user } = useAuth();
  const { isAdmin, isFranquiciado, isGerente } = useUserRole();
  
  const [loading, setLoading] = useState(true);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [payments, setPayments] = useState<HRPayment[]>([]);
  const [monthTotals, setMonthTotals] = useState({ adelantos: 0, jornales: 0, comida: 0 });
  
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    employee_id: '',
    amount: '',
    type: 'adelanto' as 'adelanto' | 'jornal' | 'comida',
    notes: '',
  });

  // Fetch staff members
  useEffect(() => {
    if (!branchId) return;
    
    async function fetchStaff() {
      try {
        const { data: permissionsData, error: permError } = await supabase
          .from('branch_permissions')
          .select('user_id')
          .eq('branch_id', branchId);

        if (permError) throw permError;

        const userIds = permissionsData?.map(p => p.user_id) || [];
        
        if (userIds.length === 0) {
          setStaffMembers([]);
          return;
        }

        const { data: profilesData, error: profError } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, email')
          .in('user_id', userIds);

        if (profError) throw profError;

        setStaffMembers(profilesData || []);
      } catch (error) {
        console.error('Error fetching staff:', error);
      }
    }

    fetchStaff();
  }, [branchId]);

  // Fetch HR payments
  useEffect(() => {
    if (!branchId) return;
    
    async function fetchPayments() {
      setLoading(true);
      try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('branch_id', branchId)
          .eq('type', 'expense')
          .gte('transaction_date', startOfMonth.toISOString().split('T')[0])
          .ilike('concept', '%RRHH%')
          .order('transaction_date', { ascending: false });

        if (error) throw error;

        const hrPayments: HRPayment[] = (data || []).map(t => {
          const parts = t.concept.split(' - ');
          const type = parts[1]?.toLowerCase().includes('adelanto') ? 'adelanto' 
            : parts[1]?.toLowerCase().includes('jornal') ? 'jornal' : 'comida';
          
          return {
            id: t.id,
            employee_name: parts[2] || 'N/A',
            amount: t.amount,
            type,
            date: t.transaction_date,
            notes: t.notes,
          };
        });

        setPayments(hrPayments);

        const totals = hrPayments.reduce((acc, p) => {
          if (p.type === 'adelanto') acc.adelantos += p.amount;
          else if (p.type === 'jornal') acc.jornales += p.amount;
          else acc.comida += p.amount;
          return acc;
        }, { adelantos: 0, jornales: 0, comida: 0 });

        setMonthTotals(totals);
      } catch (error) {
        console.error('Error fetching payments:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPayments();
  }, [branchId]);

  const handleRegisterPayment = async () => {
    if (!branchId || !paymentForm.employee_id || !paymentForm.amount) {
      toast.error('Completá todos los campos requeridos');
      return;
    }

    const employee = staffMembers.find(s => s.user_id === paymentForm.employee_id);
    if (!employee) return;

    const typeLabel = paymentForm.type === 'adelanto' ? 'Adelanto' 
      : paymentForm.type === 'jornal' ? 'Jornal' : 'Comida Personal';

    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          branch_id: branchId,
          type: 'expense',
          amount: parseFloat(paymentForm.amount),
          concept: `RRHH - ${typeLabel} - ${employee.full_name}`,
          notes: paymentForm.notes || null,
          payment_origin: 'cash',
          receipt_type: 'INTERNAL',
          recorded_by: user?.id,
        });

      if (error) throw error;

      toast.success('Pago registrado correctamente');
      setShowPaymentDialog(false);
      setPaymentForm({ employee_id: '', amount: '', type: 'adelanto', notes: '' });
      
      const newPayment: HRPayment = {
        id: crypto.randomUUID(),
        employee_name: employee.full_name,
        amount: parseFloat(paymentForm.amount),
        type: paymentForm.type,
        date: new Date().toISOString().split('T')[0],
        notes: paymentForm.notes || null,
      };
      setPayments(prev => [newPayment, ...prev]);
      
      if (paymentForm.type === 'adelanto') {
        setMonthTotals(prev => ({ ...prev, adelantos: prev.adelantos + parseFloat(paymentForm.amount) }));
      } else if (paymentForm.type === 'jornal') {
        setMonthTotals(prev => ({ ...prev, jornales: prev.jornales + parseFloat(paymentForm.amount) }));
      } else {
        setMonthTotals(prev => ({ ...prev, comida: prev.comida + parseFloat(paymentForm.amount) }));
      }
    } catch (error) {
      console.error('Error registering payment:', error);
      toast.error('Error al registrar el pago');
    }
  };

  const canManage = isAdmin || isFranquiciado || isGerente;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Pagos</h1>
          <p className="text-muted-foreground">{branch?.name}</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowPaymentDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Registrar Pago
          </Button>
        )}
      </div>

      <Tabs defaultValue="rrhh" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rrhh" className="gap-2">
            <Users className="h-4 w-4" />
            RRHH
          </TabsTrigger>
          <TabsTrigger value="proveedores" className="gap-2">
            <Truck className="h-4 w-4" />
            Proveedores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rrhh" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                    <DollarSign className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Adelantos</p>
                    <p className="text-2xl font-bold">${monthTotals.adelantos.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <Wallet className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Jornales</p>
                    <p className="text-2xl font-bold">${monthTotals.jornales.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                    <Coffee className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Comida Personal</p>
                    <p className="text-2xl font-bold">${monthTotals.comida.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payments Table */}
          <Card>
            <CardHeader>
              <CardTitle>Pagos del Mes</CardTitle>
              <CardDescription>Adelantos, jornales y comida del personal</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay pagos registrados este mes
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(new Date(payment.date + 'T12:00:00'), 'dd/MM', { locale: es })}
                        </TableCell>
                        <TableCell className="font-medium">{payment.employee_name}</TableCell>
                        <TableCell>
                          <Badge variant={
                            payment.type === 'adelanto' ? 'outline' :
                            payment.type === 'jornal' ? 'secondary' : 'default'
                          }>
                            {payment.type === 'adelanto' ? 'Adelanto' :
                             payment.type === 'jornal' ? 'Jornal' : 'Comida'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${payment.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proveedores" className="space-y-4">
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Los pagos a proveedores se gestionan desde</p>
                <p className="font-medium">Finanzas → Proveedores</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago RRHH</DialogTitle>
            <DialogDescription>Adelanto, jornal o comida del personal</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Empleado</Label>
              <Select 
                value={paymentForm.employee_id} 
                onValueChange={(v) => setPaymentForm(prev => ({ ...prev, employee_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empleado" />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map((staff) => (
                    <SelectItem key={staff.user_id} value={staff.user_id}>
                      {staff.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Pago</Label>
              <Select 
                value={paymentForm.type} 
                onValueChange={(v) => setPaymentForm(prev => ({ ...prev, type: v as typeof paymentForm.type }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adelanto">Adelanto</SelectItem>
                  <SelectItem value="jornal">Jornal</SelectItem>
                  <SelectItem value="comida">Comida Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input
                type="number"
                placeholder="0"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                placeholder="Detalle adicional..."
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRegisterPayment}>
              Registrar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
