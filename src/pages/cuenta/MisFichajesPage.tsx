/**
 * MisFichajesPage - Historial de fichajes del usuario
 */
import MyClockInsCard from '@/components/cuenta/MyClockInsCard';
import { PageHeader } from '@/components/ui/page-header';

export default function MisFichajesPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader 
        title="Mis Fichajes" 
        subtitle="Historial de entradas y salidas"
      />
      
      <MyClockInsCard />
    </div>
  );
}
