/**
 * MisApercibimientosPage - Apercibimientos del usuario
 */
import MyWarningsCard from '@/components/cuenta/MyWarningsCard';
import { PageHeader } from '@/components/ui/page-header';

export default function MisApercibimientosPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Mis Apercibimientos" 
        subtitle="Historial de apercibimientos recibidos"
      />
      
      <MyWarningsCard />
    </div>
  );
}
