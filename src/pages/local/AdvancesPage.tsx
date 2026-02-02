/**
 * AdvancesPage - Gestión de adelantos de sueldo
 * Fase 7: Migrado a user_id, sin PIN, auto-aprobación por encargados
 */
import { useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSalaryAdvances, useCreateAdvance, useMarkAdvanceTransferred, useCancelAdvance } from '@/hooks/useSalaryAdvances';
import { useAuth } from '@/hooks/useAuth';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Plus, 
  DollarSign, 
  Banknote, 
  CreditCard, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Send,
  User
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

export default function AdvancesPage() {
  const { branchId } = useParams();
  const { branch } = useOutletContext<{ branch: Branch }>();
  const { user } = useAuth();
  
  const [showNewAdvance, setShowNewAdvance] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');

  const { data: advances, isLoading } = useSalaryAdvances(branchId);
  const createAdvance = useCreateAdvance();
  const markTransferred = useMarkAdvanceTransferred();
  const cancelAdvance = useCancelAdvance();

  // Fetch team members using user_branch_roles + profiles
  const { data: teamMembers } = useQuery({
    queryKey: ['branch-team-members', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_branch_roles')
        .select('user_id')
        .eq('branch_id', branchId!)
        .eq('is_active', true);
      
      if (error) throw error;
      
      const userIds = data?.map(r => r.user_id) || [];
      if (userIds.length === 0) return [];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds)
        .order('full_name');
      
      if (profilesError) throw profilesError;
      return profiles || [];
    },
    enabled: !!branchId,
  });

  const formatCurrency = (n: number) => 
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);

  const handleCreateAdvance = async () => {
    if (!selectedUser || !amount || parseFloat(amount) <= 0 || !branchId) {
      toast.error('Completá los campos requeridos');
      return;
    }
    
    try {
      await createAdvance.mutateAsync({
        branchId,
        userId: selectedUser,
        amount: parseFloat(amount),
        reason,
        paymentMethod,
      });
      
      setShowNewAdvance(false);
      resetForm();
    } catch (error) {
      console.error(error);
    }
  };

  const resetForm = () => {
    setSelectedUser('');
    setAmount('');
    setReason('');
    setPaymentMethod('cash');
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
      pending: { label: 'Pendiente', variant: 'outline', icon: Clock },
      paid: { label: 'Pagado (Efectivo)', variant: 'default', icon: CheckCircle },
      pending_transfer: { label: 'Pendiente Transf.', variant: 'secondary', icon: AlertCircle },
      transferred: { label: 'Transferido', variant: 'default', icon: Send },
      deducted: { label: 'Descontado', variant: 'secondary', icon: DollarSign },
      cancelled: { label: 'Cancelado', variant: 'destructive', icon: XCircle },
    };
    
    const { label, variant, icon: Icon } = config[status] || config.pending;
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  // Stats
  const pendingTransfers = advances?.filter(a => a.status === 'pending_transfer') || [];
  const thisMonthTotal = advances?.filter(a => {
    const date = new Date(a.created_at);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear() && a.status !== 'cancelled';
  }).reduce((sum, a) => sum + a.amount, 0) || 0;

  if (isLoading) {
    return <HoppinessLoader fullScreen size="md" text="Cargando adelantos" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Adelantos de Sueldo</h1>
          <p className="text-muted-foreground">{branch?.name}</p>
        </div>
        
        <Dialog open={showNewAdvance} onOpenChange={setShowNewAdvance}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Adelanto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Adelanto</DialogTitle>
              <DialogDescription>
                Registrá un adelanto ya entregado al empleado (post-pago)
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Empleado *</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers?.map(member => (
                      <SelectItem key={member.user_id} value={member.user_id!}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {member.full_name || 'Sin nombre'}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Monto *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Forma de pago</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('cash')}
                    className="justify-start"
                  >
                    <Banknote className="h-4 w-4 mr-2" />
                    Efectivo
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === 'transfer' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('transfer')}
                    className="justify-start"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Transferencia
                  </Button>
                </div>
                {paymentMethod === 'transfer' && (
                  <p className="text-xs text-muted-foreground">
                    Quedará pendiente hasta que marques la transferencia como realizada
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Motivo (opcional)</Label>
                <Textarea
                  placeholder="Motivo del adelanto..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewAdvance(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateAdvance}
                disabled={!selectedUser || !amount || createAdvance.isPending}
              >
                Registrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Este mes</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(thisMonthTotal)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendientes de transferir</CardDescription>
            <CardTitle className="text-2xl">{pendingTransfers.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total adelantos</CardDescription>
            <CardTitle className="text-2xl">{advances?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="pending" className="gap-1">
            Pend. Transf.
            {pendingTransfers.length > 0 && (
              <Badge variant="secondary" className="ml-1">{pendingTransfers.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advances?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No hay adelantos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  advances?.map(advance => (
                    <TableRow key={advance.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(advance.created_at), "dd/MM/yy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {advance.user_name || 'N/A'}
                      </TableCell>
                      <TableCell>{formatCurrency(advance.amount)}</TableCell>
                      <TableCell>
                        {advance.payment_method === 'cash' ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Banknote className="h-4 w-4" /> Efectivo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-sm">
                            <CreditCard className="h-4 w-4" /> Transf.
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(advance.status)}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {advance.reason || '-'}
                      </TableCell>
                      <TableCell>
                        {advance.status === 'pending_transfer' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markTransferred.mutate({ advanceId: advance.id })}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Marcar Transferido
                          </Button>
                        )}
                        {advance.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => cancelAdvance.mutate(advance.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        
        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transferencias Pendientes</CardTitle>
              <CardDescription>
                Adelantos que deben ser transferidos desde administración
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingTransfers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay transferencias pendientes
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingTransfers.map(advance => (
                    <div key={advance.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{advance.user_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(advance.created_at), "dd 'de' MMMM", { locale: es })}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-bold">{formatCurrency(advance.amount)}</span>
                        <Button
                          size="sm"
                          onClick={() => markTransferred.mutate({ advanceId: advance.id })}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Marcar como Transferido
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
