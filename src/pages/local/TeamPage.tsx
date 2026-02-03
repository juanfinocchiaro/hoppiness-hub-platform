import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeamTable, TeamCardList, useTeamData } from '@/components/local/team';
import { InviteStaffDialog } from '@/components/hr/InviteStaffDialog';
import MonthlyHoursSummary from '@/components/local/MonthlyHoursSummary';
import { useIsMobile } from '@/hooks/use-mobile';
import { PageHelp } from '@/components/ui/PageHelp';
import type { Tables } from '@/integrations/supabase/types';

interface OutletContext {
  branch: Tables<'branches'>;
}

export default function TeamPage() {
  const { branch } = useOutletContext<OutletContext>();
  const { team, loading, refetch } = useTeamData(branch?.id);
  const isMobile = useIsMobile();
  
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
    <div className="p-4 md:p-6 space-y-4">
      <PageHelp pageId="local-team" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Mi Equipo</h1>
          <p className="text-sm text-muted-foreground">
            {filteredTeam.length} empleado{filteredTeam.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button 
          onClick={() => setShowInviteDialog(true)}
          className="w-full sm:w-auto min-h-[44px]"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Invitar empleado
        </Button>
      </div>

      {/* Tabs: Personal / Horas del Mes */}
      <Tabs defaultValue="team" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="team">Personal</TabsTrigger>
          <TabsTrigger value="hours">Horas del Mes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="team" className="space-y-4 mt-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 min-h-[44px]"
            />
          </div>

          {/* Team list */}
          {isMobile ? (
            <TeamCardList 
              team={filteredTeam} 
              branchId={branch?.id}
              onMemberUpdated={refetch}
            />
          ) : (
            <TeamTable 
              team={filteredTeam} 
              branchId={branch?.id}
              onMemberUpdated={refetch}
            />
          )}
        </TabsContent>
        
        <TabsContent value="hours" className="mt-4">
          <MonthlyHoursSummary branchId={branch?.id} />
        </TabsContent>
      </Tabs>

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