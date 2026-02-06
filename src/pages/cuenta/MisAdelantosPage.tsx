/**
 * MisAdelantosPage - Adelantos de sueldo del usuario
 */
import MySalaryAdvancesCard from '@/components/cuenta/MySalaryAdvancesCard';

export default function MisAdelantosPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Mis Adelantos</h1>
        <p className="text-sm text-muted-foreground">
          Historial de adelantos de sueldo
        </p>
      </div>
      
      <MySalaryAdvancesCard />
    </div>
  );
}
