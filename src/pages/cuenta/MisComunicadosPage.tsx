/**
 * MisComunicadosPage - Comunicados recibidos por el usuario
 */
import MyCommunicationsCard from '@/components/cuenta/MyCommunicationsCard';
import { PageHeader } from '@/components/ui/page-header';

export default function MisComunicadosPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Comunicados" subtitle="Mensajes y novedades de la marca" />

      <MyCommunicationsCard />
    </div>
  );
}
