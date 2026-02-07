/**
 * MisSolicitudesPage - Solicitudes de días libres del usuario
 */
import MyRequestsCard from '@/components/cuenta/MyRequestsCard';
import { PageHeader } from '@/components/ui/page-header';

export default function MisSolicitudesPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader 
        title="Mis Solicitudes" 
        subtitle="Solicitudes de días libres y ausencias"
      />
      
      <MyRequestsCard />
    </div>
  );
}
