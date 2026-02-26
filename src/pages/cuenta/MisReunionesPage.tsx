/**
 * MisReunionesPage - Reuniones del usuario
 */
import { MyMeetingsCard } from '@/components/cuenta/MyMeetingsCard';
import { PageHeader } from '@/components/ui/page-header';

export default function MisReunionesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Mis Reuniones" subtitle="Reuniones programadas y pendientes" />

      <MyMeetingsCard />
    </div>
  );
}
