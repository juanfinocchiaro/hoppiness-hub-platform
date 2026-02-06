/**
 * MisReunionesPage - Reuniones del usuario
 */
import { MyMeetingsCard } from '@/components/cuenta/MyMeetingsCard';

export default function MisReunionesPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Mis Reuniones</h1>
        <p className="text-sm text-muted-foreground">
          Reuniones programadas y pendientes
        </p>
      </div>
      
      <MyMeetingsCard />
    </div>
  );
}
