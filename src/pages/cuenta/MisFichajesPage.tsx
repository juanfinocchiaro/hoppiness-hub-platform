/**
 * MisFichajesPage - Historial de fichajes del usuario
 */
import MyClockInsCard from '@/components/cuenta/MyClockInsCard';

export default function MisFichajesPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Mis Fichajes</h1>
        <p className="text-sm text-muted-foreground">
          Historial de entradas y salidas
        </p>
      </div>
      
      <MyClockInsCard />
    </div>
  );
}
