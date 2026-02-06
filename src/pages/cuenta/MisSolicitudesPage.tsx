/**
 * MisSolicitudesPage - Solicitudes de días libres del usuario
 */
import MyRequestsCard from '@/components/cuenta/MyRequestsCard';

export default function MisSolicitudesPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Mis Solicitudes</h1>
        <p className="text-sm text-muted-foreground">
          Solicitudes de días libres y ausencias
        </p>
      </div>
      
      <MyRequestsCard />
    </div>
  );
}
