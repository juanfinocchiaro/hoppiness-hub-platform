/**
 * MisCoachingsPage - Coachings recibidos por el usuario
 */
import { MyCoachingsCardEnhanced } from '@/components/cuenta/MyCoachingsCardEnhanced';
import { PageHeader } from '@/components/ui/page-header';

export default function MisCoachingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Mis Coachings" subtitle="Evaluaciones de desempeño recibidas" />

      <MyCoachingsCardEnhanced />
    </div>
  );
}
