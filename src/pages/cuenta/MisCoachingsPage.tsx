/**
 * MisCoachingsPage - Coachings recibidos por el usuario
 */
import { MyCoachingsCardEnhanced } from '@/components/cuenta/MyCoachingsCardEnhanced';

export default function MisCoachingsPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Mis Coachings</h1>
        <p className="text-sm text-muted-foreground">
          Evaluaciones de desempeño recibidas
        </p>
      </div>
      
      <MyCoachingsCardEnhanced />
    </div>
  );
}
