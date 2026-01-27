import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { TeamTable, useTeamData } from '@/components/local/team';
import { InviteStaffDialog } from '@/components/hr/InviteStaffDialog';
import type { Tables } from '@/integrations/supabase/types';

interface OutletContext {
  branch: Tables<'branches'>;
}

export default function TeamPage() {
  const { branch } = useOutletContext<OutletContext>();
  const { team, loading, refetch } = useTeamData(branch?.id);
  
  const [search, setSearch] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const filteredTeam = search
    ? team.filter(m => 
        m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        m.email?.toLowerCase().includes(search.toLowerCase())
      )
    : team;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <HoppinessLoader />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mi Equipo</h1>
          <p className="text-muted-foreground">Gestión de empleados</p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invitar empleado
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="text-sm text-muted-foreground">
        {filteredTeam.length} empleado{filteredTeam.length !== 1 ? 's' : ''}
      </div>

      <TeamTable 
        team={filteredTeam} 
        branchId={branch?.id}
        onMemberUpdated={refetch}
      />

      <InviteStaffDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        branchId={branch?.id}
        branchName={branch?.name}
        onSuccess={refetch}
      />
    </div>
  );
}
