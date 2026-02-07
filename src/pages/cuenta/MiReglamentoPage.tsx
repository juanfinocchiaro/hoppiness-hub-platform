/**
 * MiReglamentoPage - Estado de firma del reglamento
 */
import MyRegulationsCard from '@/components/cuenta/MyRegulationsCard';
import { PageHeader } from '@/components/ui/page-header';

export default function MiReglamentoPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader 
        title="Reglamento" 
        subtitle="Estado de firma del reglamento interno"
      />
      
      <MyRegulationsCard />
    </div>
  );
}
