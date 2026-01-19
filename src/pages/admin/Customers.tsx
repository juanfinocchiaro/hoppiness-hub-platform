import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Users,
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Phone,
  Mail,
  CreditCard,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Customer {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  dni: string | null;
  cuit: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

interface CustomerStats {
  total_spent: number;
  visit_count: number;
  avg_ticket: number;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerStats, setCustomerStats] = useState<Record<string, CustomerStats>>({});

  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDni, setFormDni] = useState('');
  const [formCuit, setFormCuit] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('full_name');

    if (error) {
      toast.error('Error al cargar clientes');
      console.error(error);
    } else {
      setCustomers(data || []);

      // Fetch stats for all customers
      if (data && data.length > 0) {
        const { data: prefs } = await supabase
          .from('customer_preferences')
          .select('customer_id, total_spent, visit_count, avg_ticket')
          .in('customer_id', data.map(c => c.id));

        if (prefs) {
          const statsMap: Record<string, CustomerStats> = {};
          prefs.forEach(p => {
            if (!statsMap[p.customer_id]) {
              statsMap[p.customer_id] = { total_spent: 0, visit_count: 0, avg_ticket: 0 };
            }
            statsMap[p.customer_id].total_spent += p.total_spent || 0;
            statsMap[p.customer_id].visit_count += p.visit_count || 0;
          });
          // Calculate avg ticket
          Object.keys(statsMap).forEach(id => {
            if (statsMap[id].visit_count > 0) {
              statsMap[id].avg_ticket = statsMap[id].total_spent / statsMap[id].visit_count;
            }
          });
          setCustomerStats(statsMap);
        }
      }
    }
    setLoading(false);
  };

  const filteredCustomers = customers.filter(c => {
    const term = search.toLowerCase();
    return (
      c.full_name.toLowerCase().includes(term) ||
      c.phone?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.dni?.toLowerCase().includes(term)
    );
  });

  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormDni('');
    setFormCuit('');
    setFormNotes('');
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormName(customer.full_name);
    setFormPhone(customer.phone || '');
    setFormEmail(customer.email || '');
    setFormDni(customer.dni || '');
    setFormCuit(customer.cuit || '');
    setFormNotes(customer.notes || '');
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    setSaving(true);
    try {
      const customerData = {
        full_name: formName.trim(),
        phone: formPhone.trim() || null,
        email: formEmail.trim() || null,
        dni: formDni.trim() || null,
        cuit: formCuit.trim() || null,
        notes: formNotes.trim() || null,
      };

      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', editingCustomer.id);

        if (error) throw error;
        toast.success('Cliente actualizado');
      } else {
        const { error } = await supabase
          .from('customers')
          .insert(customerData);

        if (error) throw error;
        toast.success('Cliente creado');
      }

      setShowCreateDialog(false);
      setEditingCustomer(null);
      resetForm();
      fetchCustomers();
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`¿Eliminar a ${customer.full_name}?`)) return;

    const { error } = await supabase
      .from('customers')
      .update({ is_active: false })
      .eq('id', customer.id);

    if (error) {
      toast.error('Error al eliminar');
    } else {
      toast.success('Cliente desactivado');
      fetchCustomers();
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const activeCustomers = customers.filter(c => c.is_active);
  const totalSpent = Object.values(customerStats).reduce((sum, s) => sum + s.total_spent, 0);
  const avgTicket = activeCustomers.length > 0
    ? totalSpent / Object.values(customerStats).reduce((sum, s) => sum + s.visit_count, 0) || 0
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Base de clientes de la marca</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeCustomers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Facturación Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPrice(totalSpent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Ticket Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPrice(avgTicket)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Con Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {activeCustomers.filter(c => c.email).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, teléfono, email o DNI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Documentos</TableHead>
                <TableHead className="text-right">Visitas</TableHead>
                <TableHead className="text-right">Total Gastado</TableHead>
                <TableHead className="text-right">Ticket Prom.</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-12 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No se encontraron clientes
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => {
                  const stats = customerStats[customer.id];
                  return (
                    <TableRow key={customer.id} className={!customer.is_active ? 'opacity-50' : ''}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{customer.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Desde {format(new Date(customer.created_at), 'MMM yyyy', { locale: es })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {customer.phone && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              {customer.phone}
                            </div>
                          )}
                          {customer.email && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              {customer.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {customer.dni && <Badge variant="outline">DNI</Badge>}
                          {customer.cuit && <Badge variant="outline">CUIT</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {stats?.visit_count || 0}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(stats?.total_spent || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(stats?.avg_ticket || 0)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(customer)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(customer)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Desactivar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={showCreateDialog || !!editingCustomer}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingCustomer(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer
                ? 'Modificá los datos del cliente'
                : 'Ingresá los datos del nuevo cliente'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo *</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Juan Pérez"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="11 1234 5678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="juan@email.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dni">DNI</Label>
                <Input
                  id="dni"
                  value={formDni}
                  onChange={(e) => setFormDni(e.target.value)}
                  placeholder="12345678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cuit">CUIT</Label>
                <Input
                  id="cuit"
                  value={formCuit}
                  onChange={(e) => setFormCuit(e.target.value)}
                  placeholder="20-12345678-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Input
                id="notes"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Observaciones..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setEditingCustomer(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
