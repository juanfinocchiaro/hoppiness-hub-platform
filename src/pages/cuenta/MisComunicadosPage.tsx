/**
 * MisComunicadosPage - Comunicados recibidos por el usuario
 */
import MyCommunicationsCard from '@/components/cuenta/MyCommunicationsCard';

export default function MisComunicadosPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Comunicados</h1>
        <p className="text-sm text-muted-foreground">
          Mensajes y novedades de la marca
        </p>
      </div>
      
      <MyCommunicationsCard />
    </div>
  );
}
