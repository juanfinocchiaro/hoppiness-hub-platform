import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Phone, MapPin, Star, Plus, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { UserRoleModal } from './UserRoleModal';
import type { UserWithStats, Branch, UserAddress, RecentOrder, NoteEntry } from './types';
import { formatMoney, formatShortDate, ROLE_LABELS } from './types';

interface UserExpandedRowProps {
  user: UserWithStats;
  branches: Branch[];
  onClose: () => void;
  onUserUpdated: () => void;
}

export function UserExpandedRow({ user, branches, onClose, onUserUpdated }: UserExpandedRowProps) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Fetch user addresses
  const { data: addresses = [] } = useQuery({
    queryKey: ['user-addresses', user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_addresses')
        .select('id, label, address_line1, city, postal_code')
        .eq('user_id', user.id)
        .limit(3);
      return (data || []).map(d => ({
        id: d.id,
        label: d.label,
        street: d.address_line1 || '',
        city: d.city || '',
        postal_code: d.postal_code,
      })) as UserAddress[];
    },
    staleTime: 60 * 1000,
  });

  // Fetch recent orders
  const { data: recentOrders = [] } = useQuery({
    queryKey: ['user-recent-orders', user.id],
    queryFn: async () => {
      const { data: orders } = await supabase
        .from('orders')
        .select('id, total, created_at')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (!orders?.length) return [];

      // Fetch items for these orders
      const orderIds = orders.map(o => o.id);
      const { data: items } = await supabase
        .from('order_items')
        .select('order_id, name, quantity')
        .in('order_id', orderIds);

      return orders.map((o, idx) => ({
        id: o.id,
        order_number: idx + 1,
        total: o.total,
        created_at: o.created_at,
        items: items?.filter(i => i.order_id === o.id).map(i => ({
          name: i.name || 'Producto',
          quantity: i.quantity,
        })) || [],
      })) as RecentOrder[];
    },
    staleTime: 30 * 1000,
  });

  // Mutation to add note
  const addNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      const newNoteEntry = {
        date: new Date().toISOString(),
        note,
        by: currentUser?.id || '',
      };
      
      const updatedNotes = [...(user.internal_notes || []), newNoteEntry];
      
      const { error } = await supabase
        .from('profiles')
        .update({ internal_notes: updatedNotes as unknown as Record<string, unknown>[] })
        .eq('id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Nota agregada');
      setNewNote('');
      queryClient.invalidateQueries({ queryKey: ['admin-users-full'] });
      onUserUpdated();
    },
    onError: () => toast.error('Error al agregar nota'),
  });

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate(newNote.trim());
  };

  const getBranchNames = (branchIds: string[]) => {
    return branchIds
      .map(id => branches.find(b => b.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Column 1: Information */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm uppercase text-muted-foreground">Información</h4>
        
        <div className="space-y-2 text-sm">
          {user.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{user.phone}</span>
            </div>
          )}
          
          {addresses.map((addr) => (
            <div key={addr.id} className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <span>{addr.street}</span>
                {addr.label && <span className="text-muted-foreground ml-1">({addr.label})</span>}
                <br />
                <span className="text-muted-foreground">{addr.city}{addr.postal_code && `, ${addr.postal_code}`}</span>
              </div>
            </div>
          ))}
          
          {user.loyalty_points > 0 && (
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              <span>{user.loyalty_points} puntos Hoppiness</span>
            </div>
          )}
        </div>

        {/* Internal Notes */}
        <div className="pt-2 border-t">
          <h5 className="font-medium text-sm mb-2">Notas internas</h5>
          <div className="space-y-1 text-sm mb-2">
            {user.internal_notes?.slice(-3).map((note, i) => (
              <p key={i} className="text-muted-foreground italic">"{note.note}"</p>
            ))}
            {(!user.internal_notes || user.internal_notes.length === 0) && (
              <p className="text-muted-foreground text-xs">Sin notas</p>
            )}
          </div>
          <div className="flex gap-2">
            <Input 
              placeholder="Agregar nota..." 
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
            />
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleAddNote}
              disabled={!newNote.trim() || addNoteMutation.isPending}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Column 2: Recent Orders */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm uppercase text-muted-foreground">Últimos pedidos</h4>
        
        <div className="space-y-3">
          {recentOrders.map((order) => (
            <div key={order.id} className="text-sm border-b pb-2 last:border-0">
              <div className="font-medium">
                #{order.order_number} · {formatMoney(order.total)} · {formatShortDate(order.created_at)}
              </div>
              <div className="text-muted-foreground text-xs mt-1">
                {order.items.slice(0, 2).map((item, i) => (
                  <span key={i}>
                    {i > 0 && ', '}
                    {item.quantity}x {item.name}
                  </span>
                ))}
                {order.items.length > 2 && <span> +{order.items.length - 2} más</span>}
              </div>
            </div>
          ))}
          
          {recentOrders.length === 0 && (
            <p className="text-sm text-muted-foreground">Sin pedidos</p>
          )}
        </div>
        
        {user.total_orders > 3 && (
          <Button variant="link" size="sm" className="p-0 h-auto">
            Ver todos los pedidos <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>

      {/* Column 3: Access & Roles */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm uppercase text-muted-foreground">Accesos y rol</h4>
        
        <div className="space-y-3 text-sm">
          {/* Brand Access */}
          <div className="flex items-start gap-2">
            <span className={`w-2.5 h-2.5 rounded-full mt-1 ${user.brand_role ? 'bg-green-500' : 'bg-gray-300'}`} />
            <div className="flex-1">
              <span className="font-medium">Mi Marca: </span>
              <span className="text-muted-foreground">
                {user.brand_role ? ROLE_LABELS[user.brand_role] : 'Sin acceso'}
              </span>
            </div>
          </div>

          {/* Local Access */}
          <div className="flex items-start gap-2">
            <span className={`w-2.5 h-2.5 rounded-full mt-1 ${user.local_role ? 'bg-green-500' : 'bg-gray-300'}`} />
            <div className="flex-1">
              <span className="font-medium">Mi Local: </span>
              <span className="text-muted-foreground">
                {user.local_role ? (
                  <>
                    {ROLE_LABELS[user.local_role]}
                    {user.branch_ids.length > 0 && (
                      <span className="block text-xs mt-0.5">
                        en {getBranchNames(user.branch_ids)}
                      </span>
                    )}
                  </>
                ) : 'Sin acceso'}
              </span>
            </div>
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowRoleModal(true)}
          className="w-full"
        >
          {user.brand_role || user.local_role ? 'Editar roles' : 'Asignar roles'}
        </Button>
      </div>

      {showRoleModal && (
        <UserRoleModal
          user={user}
          branches={branches}
          open={showRoleModal}
          onOpenChange={setShowRoleModal}
          onSuccess={() => {
            onUserUpdated();
            setShowRoleModal(false);
          }}
        />
      )}
    </div>
  );
}
