/**
 * MisAdelantosPage - Adelantos de sueldo del usuario
 */
import MySalaryAdvancesCard from '@/components/cuenta/MySalaryAdvancesCard';
import { PageHeader } from '@/components/ui/page-header';

export default function MisAdelantosPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Mis Adelantos" subtitle="Historial de adelantos de sueldo" />

      <MySalaryAdvancesCard />
    </div>
  );
}
