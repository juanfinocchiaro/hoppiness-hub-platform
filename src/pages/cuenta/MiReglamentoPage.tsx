/**
 * MiReglamentoPage - Estado de firma del reglamento
 */
import MyRegulationsCard from '@/components/cuenta/MyRegulationsCard';

export default function MiReglamentoPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Reglamento</h1>
        <p className="text-sm text-muted-foreground">
          Estado de firma del reglamento interno
        </p>
      </div>
      
      <MyRegulationsCard />
    </div>
  );
}
