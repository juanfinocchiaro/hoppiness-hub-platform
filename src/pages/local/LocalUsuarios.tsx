import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Plus, Shield, Mail } from 'lucide-react';

export default function LocalUsuarios() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground">Permisos para cajeros y encargados</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Invitar Usuario
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Equipo del Local
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No hay usuarios asignados a este local. Invitá a tu equipo para que puedan operar el sistema.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">Roles disponibles</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li><strong>Cajero:</strong> Puede tomar pedidos y operar la caja</li>
                <li><strong>Cocinero:</strong> Solo acceso al KDS</li>
                <li><strong>Encargado:</strong> Acceso completo al local</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
