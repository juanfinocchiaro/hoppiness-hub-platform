import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Phone } from 'lucide-react';
import { UserRoleModal } from './UserRoleModal';
import type { UserWithStats, Branch } from './types';
import { ROLE_LABELS } from './types';

interface UserExpandedRowProps {
  user: UserWithStats;
  branches: Branch[];
  onClose: () => void;
  onUserUpdated: () => void;
}

export function UserExpandedRow({ user, branches, onClose, onUserUpdated }: UserExpandedRowProps) {
  const [showRoleModal, setShowRoleModal] = useState(false);

  const getBranchNames = (branchIds: string[]) => {
    return branchIds
      .map(id => branches.find(b => b.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
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
          
          {user.email && (
            <div className="text-muted-foreground">
              {user.email}
            </div>
          )}
        </div>
      </div>

      {/* Column 2: Access & Roles */}
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
