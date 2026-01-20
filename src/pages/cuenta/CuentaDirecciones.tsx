import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Trash2, Star, MapPin, Loader2 } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Address {
  id: string;
  label: string | null;
  address: string;
  floor_apt: string | null;
  instructions: string | null;
  is_default: boolean;
}

export default function CuentaDirecciones() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: '',
    address: '',
    floor_apt: '',
    instructions: '',
  });

  // Fetch user addresses
  const { data: addresses, isLoading } = useQuery({
    queryKey: ['user-addresses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Address[];
    },
    enabled: !!user,
  });

  // Add address mutation
  const addAddress = useMutation({
    mutationFn: async (data: typeof newAddress) => {
      if (!user) throw new Error('No user');
      const isFirst = (addresses?.length || 0) === 0;
      const { error } = await supabase
        .from('user_addresses')
        .insert({
          user_id: user.id,
          label: data.label || null,
          address: data.address,
          floor_apt: data.floor_apt || null,
          instructions: data.instructions || null,
          is_default: isFirst,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-addresses', user?.id] });
      setIsAddOpen(false);
      setNewAddress({ label: '', address: '', floor_apt: '', instructions: '' });
      toast.success('Dirección agregada');
    },
    onError: (error) => {
      toast.error('Error al agregar dirección');
      console.error(error);
    },
  });

  // Delete address mutation
  const deleteAddress = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-addresses', user?.id] });
      toast.success('Dirección eliminada');
    },
    onError: (error) => {
      toast.error('Error al eliminar dirección');
      console.error(error);
    },
  });

  // Set default mutation
  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('No user');
      // First, unset all defaults
      await supabase
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);
      // Then set the new default
      const { error } = await supabase
        .from('user_addresses')
        .update({ is_default: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-addresses', user?.id] });
      toast.success('Dirección predeterminada actualizada');
    },
    onError: (error) => {
      toast.error('Error al actualizar');
      console.error(error);
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.address.trim()) {
      toast.error('La dirección es obligatoria');
      return;
    }
    addAddress.mutate(newAddress);
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <PublicHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/cuenta">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">Mis Direcciones</h1>
            </div>
            
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleAddSubmit}>
                  <DialogHeader>
                    <DialogTitle>Nueva dirección</DialogTitle>
                    <DialogDescription>
                      Agregá una nueva dirección de entrega
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="label">Etiqueta (opcional)</Label>
                      <Input
                        id="label"
                        value={newAddress.label}
                        onChange={(e) => setNewAddress(prev => ({ ...prev, label: e.target.value }))}
                        placeholder="Ej: Casa, Trabajo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Dirección *</Label>
                      <Input
                        id="address"
                        value={newAddress.address}
                        onChange={(e) => setNewAddress(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Calle y número"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="floor_apt">Piso / Depto</Label>
                      <Input
                        id="floor_apt"
                        value={newAddress.floor_apt}
                        onChange={(e) => setNewAddress(prev => ({ ...prev, floor_apt: e.target.value }))}
                        placeholder="Ej: 3ro B"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instructions">Instrucciones</Label>
                      <Input
                        id="instructions"
                        value={newAddress.instructions}
                        onChange={(e) => setNewAddress(prev => ({ ...prev, instructions: e.target.value }))}
                        placeholder="Ej: Tocar timbre 2B"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={addAddress.isPending}>
                      {addAddress.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Guardar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Addresses List */}
          {isLoading ? (
            <Card>
              <CardContent className="p-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin" />
              </CardContent>
            </Card>
          ) : addresses?.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  No tenés direcciones guardadas
                </p>
                <Button onClick={() => setIsAddOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar dirección
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {addresses?.map(addr => (
                <Card key={addr.id} className={addr.is_default ? 'border-primary' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {addr.label && (
                            <span className="font-medium">{addr.label}</span>
                          )}
                          {addr.is_default && (
                            <span className="inline-flex items-center gap-1 text-xs text-primary">
                              <Star className="w-3 h-3 fill-current" />
                              Predeterminada
                            </span>
                          )}
                        </div>
                        <p className="text-sm">{addr.address}</p>
                        {addr.floor_apt && (
                          <p className="text-sm text-muted-foreground">{addr.floor_apt}</p>
                        )}
                        {addr.instructions && (
                          <p className="text-xs text-muted-foreground italic">{addr.instructions}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!addr.is_default && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDefault.mutate(addr.id)}
                            disabled={setDefault.isPending}
                          >
                            <Star className="w-4 h-4" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar dirección?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteAddress.mutate(addr.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      
      <PublicFooter />
    </div>
  );
}
