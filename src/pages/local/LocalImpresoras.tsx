import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, Plus, Wifi, WifiOff } from 'lucide-react';

export default function LocalImpresoras() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Impresoras</h1>
          <p className="text-muted-foreground">Configuración de comanderas</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Agregar Impresora
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Impresoras Configuradas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No hay impresoras configuradas. Agregá una impresora para imprimir comandas automáticamente.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">Próximamente</h3>
          <p className="text-sm text-muted-foreground">
            La configuración de impresoras térmicas estará disponible en próximas versiones.
            Podrás configurar múltiples impresoras para cocina, barra y caja.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
