import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { User, Plus, Search, Phone, Mail, CreditCard, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Customer {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  dni: string | null;
  cuit: string | null;
  notes: string | null;
}

interface CustomerPreference {
  avg_ticket: number | null;
  visit_count: number | null;
  last_order_at: string | null;
}

interface CustomerSelectorProps {
  branchId: string;
  selectedCustomer: Customer | null;
  onSelect: (customer: Customer | null) => void;
  onCustomerInfoChange?: (name: string, phone: string, email: string) => void;
}

export default function CustomerSelector({
  branchId,
  selectedCustomer,
  onSelect,
  onCustomerInfoChange,
}: CustomerSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [customerPreference, setCustomerPreference] = useState<CustomerPreference | null>(null);

  // New customer form
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDni, setNewDni] = useState('');
  const [newCuit, setNewCuit] = useState('');
  const [creating, setCreating] = useState(false);

  // Debounced search
  const searchCustomers = useCallback(async (term: string) => {
    if (!term || term.length < 2) {
      setCustomers([]);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%,dni.ilike.%${term}%`)
      .eq('is_active', true)
      .limit(10);

    if (error) {
      console.error('Error searching customers:', error);
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchCustomers(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, searchCustomers]);

  // Fetch customer preferences when selected
  useEffect(() => {
    if (!selectedCustomer) {
      setCustomerPreference(null);
      return;
    }

    async function fetchPreference() {
      const { data } = await supabase
        .from('customer_preferences')
        .select('avg_ticket, visit_count, last_order_at')
        .eq('customer_id', selectedCustomer!.id)
        .eq('branch_id', branchId)
        .single();

      setCustomerPreference(data);
    }

    fetchPreference();
  }, [selectedCustomer, branchId]);

  const handleSelectCustomer = (customer: Customer) => {
    onSelect(customer);
    if (onCustomerInfoChange) {
      onCustomerInfoChange(customer.full_name, customer.phone || '', customer.email || '');
    }
    setOpen(false);
    setSearch('');
  };

  const handleClearCustomer = () => {
    onSelect(null);
    if (onCustomerInfoChange) {
      onCustomerInfoChange('', '', '');
    }
  };

  const handleCreateCustomer = async () => {
    if (!newName.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          full_name: newName.trim(),
          phone: newPhone.trim() || null,
          email: newEmail.trim() || null,
          dni: newDni.trim() || null,
          cuit: newCuit.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Cliente creado exitosamente');
      handleSelectCustomer(data);
      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('Error al crear el cliente');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setNewDni('');
    setNewCuit('');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-2">
        <User className="w-4 h-4" />
        Cliente
      </Label>

      {selectedCustomer ? (
        <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{selectedCustomer.full_name}</p>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {selectedCustomer.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {selectedCustomer.phone}
                </span>
              )}
              {customerPreference?.visit_count && (
                <Badge variant="secondary" className="text-xs">
                  {customerPreference.visit_count} visitas
                </Badge>
              )}
              {customerPreference?.avg_ticket && (
                <Badge variant="outline" className="text-xs">
                  Ticket: {formatPrice(customerPreference.avg_ticket)}
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearCustomer}
            className="text-muted-foreground hover:text-destructive"
          >
            Cambiar
          </Button>
        </div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-start text-muted-foreground"
            >
              <Search className="mr-2 h-4 w-4 shrink-0" />
              Buscar o crear cliente...
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[350px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Nombre, teléfono, email o DNI..."
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                <CommandEmpty className="py-4 text-center">
                  {loading ? (
                    <span className="text-muted-foreground">Buscando...</span>
                  ) : search.length < 2 ? (
                    <span className="text-muted-foreground">
                      Escribí al menos 2 caracteres
                    </span>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-muted-foreground">No se encontraron clientes</p>
                      <Button
                        size="sm"
                        onClick={() => {
                          setNewName(search);
                          setShowCreateDialog(true);
                          setOpen(false);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Crear "{search}"
                      </Button>
                    </div>
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {customers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={customer.id}
                      onSelect={() => handleSelectCustomer(customer)}
                      className="cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{customer.full_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {customer.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {customer.phone}
                            </span>
                          )}
                          {customer.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {customer.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <Check
                        className={cn(
                          'ml-auto h-4 w-4',
                          selectedCustomer?.id === customer.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
              <div className="border-t p-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    setShowCreateDialog(true);
                    setOpen(false);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear nuevo cliente
                </Button>
              </div>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {/* Create Customer Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Cliente</DialogTitle>
            <DialogDescription>
              Ingresá los datos del nuevo cliente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo *</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Juan Pérez"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="11 1234 5678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="juan@email.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dni">DNI</Label>
                <Input
                  id="dni"
                  value={newDni}
                  onChange={(e) => setNewDni(e.target.value)}
                  placeholder="12345678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cuit">CUIT</Label>
                <Input
                  id="cuit"
                  value={newCuit}
                  onChange={(e) => setNewCuit(e.target.value)}
                  placeholder="20-12345678-9"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateCustomer} disabled={creating}>
              {creating ? 'Creando...' : 'Crear Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
