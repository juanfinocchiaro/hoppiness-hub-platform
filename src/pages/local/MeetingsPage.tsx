/**
 * MeetingsPage - Página principal de reuniones v2.0
 */
import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { PageHelp } from '@/components/ui/PageHelp';
import { Calendar } from 'lucide-react';
import { MeetingsList, MeetingDetail, MeetingConveneModal } from '@/components/meetings';
import { useBranchMeetings, useMeetingDetail } from '@/hooks/useMeetings';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import type { Tables } from '@/integrations/supabase/types';
import type { Meeting } from '@/types/meeting';

type Branch = Tables<'branches'>;

interface OutletContext {
  branch: Branch;
}

export default function MeetingsPage() {
  const { branch } = useOutletContext<OutletContext>();
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [showConveneModal, setShowConveneModal] = useState(false);

  const effectiveUser = useEffectiveUser();
  const { isEncargado, isSuperadmin, isFranquiciado } = usePermissionsWithImpersonation(branch.id);
  const canCreate = isEncargado || isSuperadmin || isFranquiciado;
  const canManage = isEncargado || isSuperadmin || isFranquiciado;
  const canTrackReads = isEncargado || isSuperadmin || isFranquiciado;

  const { data: meetings = [], isLoading } = useBranchMeetings(branch.id);
  const { data: selectedMeeting } = useMeetingDetail(selectedMeetingId || undefined);

  const handleSelectMeeting = (meeting: Meeting) => {
    setSelectedMeetingId(meeting.id);
  };

  const handleBack = () => {
    setSelectedMeetingId(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reuniones"
        subtitle="Registro y seguimiento de reuniones del equipo"
      />
      <PageHelp pageId="meetings" />

      {selectedMeeting ? (
        <MeetingDetail
          meeting={selectedMeeting}
          onBack={handleBack}
          canTrackReads={canTrackReads}
          canManage={canManage}
        />
      ) : (
        <MeetingsList
          meetings={meetings}
          isLoading={isLoading}
          onSelectMeeting={handleSelectMeeting}
          onCreateMeeting={() => setShowConveneModal(true)}
          showReadStatus={canTrackReads}
          canCreate={canCreate}
          currentUserId={effectiveUser.id}
        />
      )}

      <MeetingConveneModal
        open={showConveneModal}
        onOpenChange={setShowConveneModal}
        branchId={branch.id}
      />
    </div>
  );
}
