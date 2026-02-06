/**
 * MeetingsPage - Página principal de reuniones
 */
import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { PageHelp } from '@/components/ui/PageHelp';
import { Calendar } from 'lucide-react';
import { MeetingsList, MeetingDetail, MeetingWizard } from '@/components/meetings';
import { useBranchMeetings, useMeetingDetail } from '@/hooks/useMeetings';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import type { Tables } from '@/integrations/supabase/types';
import type { Meeting } from '@/types/meeting';

type Branch = Tables<'branches'>;

interface OutletContext {
  branch: Branch;
}

export default function MeetingsPage() {
  const { branch } = useOutletContext<OutletContext>();
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  const { isEncargado, isSuperadmin } = usePermissionsWithImpersonation(branch.id);
  const canCreate = isEncargado || isSuperadmin;
  const canTrackReads = isEncargado || isSuperadmin;

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
        subtitle="Registro de reuniones del equipo"
      />
      <PageHelp pageId="meetings" />

      {selectedMeeting ? (
        <MeetingDetail
          meeting={selectedMeeting}
          onBack={handleBack}
          canTrackReads={canTrackReads}
        />
      ) : (
        <MeetingsList
          meetings={meetings}
          isLoading={isLoading}
          onSelectMeeting={handleSelectMeeting}
          onCreateMeeting={() => setShowWizard(true)}
          showReadStatus={canTrackReads}
          canCreate={canCreate}
        />
      )}

      <MeetingWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        branchId={branch.id}
      />
    </div>
  );
}
