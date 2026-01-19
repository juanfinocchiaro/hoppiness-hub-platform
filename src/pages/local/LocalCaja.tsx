import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, Clock, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function LocalCaja() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Caja</h1>
        <p className="text-muted-foreground">Arqueos y cierres de turno</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-green-500/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Efectivo en Caja</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">$0</div>
            <p className="text-xs text-muted-foreground">Turno actual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0</div>
            <p className="text-xs text-muted-foreground">Ventas + Otros</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Egresos</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0</div>
            <p className="text-xs text-muted-foreground">Gastos + Pagos</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Turno Actual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-center py-8">
            No hay un turno abierto. Iniciá un nuevo turno para comenzar a registrar movimientos.
          </p>
          <div className="flex justify-center gap-4">
            <Button>
              <Clock className="h-4 w-4 mr-2" />
              Iniciar Turno
            </Button>
            <Button variant="outline">
              <Calculator className="h-4 w-4 mr-2" />
              Ver Historial
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
