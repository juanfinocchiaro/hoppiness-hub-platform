import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAfipConfig, useAfipConfigMutations } from '@/hooks/useAfipConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/status-badge';
import { FormLayout } from '@/components/ui/forms-pro/FormLayout';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { ArcaCertificateWizard } from '@/components/local/arca/ArcaCertificateWizard';
import { Wifi, Shield, FileText } from 'lucide-react';

export default function AfipConfigPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: config, isLoading } = useAfipConfig(branchId);
  const { save, saveKeyAndCSR, saveCertificate, testConnection } = useAfipConfigMutations(branchId);

  const [form, setForm] = useState({
    cuit: '',
    razon_social: '',
    direccion_fiscal: '',
    inicio_actividades: '',
    punto_venta: '',
  });

  useEffect(() => {
    if (config) {
      setForm({
        cuit: config.cuit || '',
        razon_social: config.razon_social || '',
        direccion_fiscal: config.direccion_fiscal || '',
        inicio_actividades: config.inicio_actividades || '',
        punto_venta: config.punto_venta?.toString() || '',
      });
    }
  }, [config]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!branchId) return;
    const payload: Record<string, unknown> = {
      branch_id: branchId,
      cuit: form.cuit || null,
      razon_social: form.razon_social || null,
      direccion_fiscal: form.direccion_fiscal || null,
      inicio_actividades: form.inicio_actividades || null,
      punto_venta: form.punto_venta ? parseInt(form.punto_venta) : null,
    };
    save.mutate(payload as any);
  };

  if (isLoading) return <HoppinessLoader fullScreen size="lg" />;

  const estadoBadge = () => {
    switch (config?.estado_conexion) {
      case 'conectado':
        return <StatusBadge variant="active">Conectado</StatusBadge>;
      case 'error':
        return <StatusBadge variant="blocked">Error</StatusBadge>;
      default:
        return <StatusBadge variant="inactive">Sin configurar</StatusBadge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Facturación ARCA</h1>
          <p className="text-muted-foreground">
            Configuración de facturación electrónica para esta sucursal
          </p>
        </div>
        {estadoBadge()}
      </div>

      {config?.estado_conexion === 'error' && config?.ultimo_error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4">
            <p className="text-sm text-destructive">{config.ultimo_error}</p>
            {config.ultima_verificacion && (
              <p className="text-xs text-muted-foreground mt-1">
                Última verificación: {new Date(config.ultima_verificacion).toLocaleString('es-AR')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Datos fiscales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Datos Fiscales
          </CardTitle>
          <CardDescription>
            Información fiscal de la sucursal para emitir comprobantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormLayout columns={2}>
            <div className="space-y-2">
              <Label htmlFor="cuit">CUIT</Label>
              <Input
                id="cuit"
                placeholder="20-12345678-9"
                value={form.cuit}
                onChange={(e) => handleChange('cuit', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="razon_social">Razón Social</Label>
              <Input
                id="razon_social"
                placeholder="Empresa S.R.L."
                value={form.razon_social}
                onChange={(e) => handleChange('razon_social', e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="direccion_fiscal">Dirección Fiscal</Label>
              <Input
                id="direccion_fiscal"
                placeholder="Av. Siempre Viva 742, Córdoba"
                value={form.direccion_fiscal}
                onChange={(e) => handleChange('direccion_fiscal', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inicio_actividades">Inicio de Actividades</Label>
              <Input
                id="inicio_actividades"
                type="date"
                value={form.inicio_actividades}
                onChange={(e) => handleChange('inicio_actividades', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="punto_venta">Punto de Venta (N°)</Label>
              <Input
                id="punto_venta"
                type="number"
                min={1}
                placeholder="1"
                value={form.punto_venta}
                onChange={(e) => handleChange('punto_venta', e.target.value)}
              />
            </div>
          </FormLayout>
        </CardContent>
      </Card>

      {/* Asistente de certificados ARCA */}
      {branchId && (
        <ArcaCertificateWizard
          config={config ?? null}
          branchId={branchId}
          cuit={form.cuit}
          razonSocial={form.razon_social}
          onSaveKeyAndCSR={async (data) => {
            await saveKeyAndCSR.mutateAsync(data);
          }}
          onSaveCertificate={async (data) => {
            await saveCertificate.mutateAsync(data);
          }}
          onTestConnection={() => testConnection.mutate()}
          isSavingKey={saveKeyAndCSR.isPending}
          isSavingCert={saveCertificate.isPending}
          isTestingConnection={testConnection.isPending}
        />
      )}

      {/* Modo de operación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Modo de Operación
          </CardTitle>
          <CardDescription>
            Homologación es para pruebas, Producción es para facturar en serio con ARCA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium">
                {config?.es_produccion ? 'Producción' : 'Homologación (testing)'}
              </p>
              <p className="text-xs text-muted-foreground">
                {config?.es_produccion
                  ? 'Las facturas se emiten contra ARCA real'
                  : 'Las facturas se simulan, no se envían a ARCA'}
              </p>
            </div>
            <Button
              variant={config?.es_produccion ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => {
                if (!branchId) return;
                save.mutate({
                  branch_id: branchId,
                  es_produccion: !config?.es_produccion,
                } as any);
              }}
            >
              {config?.es_produccion ? 'Cambiar a Homologación' : 'Activar Producción'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Últimos números */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Últimos Comprobantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Factura A</p>
                <p className="text-2xl font-bold">{config.ultimo_nro_factura_a || 0}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Factura B</p>
                <p className="text-2xl font-bold">{config.ultimo_nro_factura_b || 0}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Factura C</p>
                <p className="text-2xl font-bold">{config.ultimo_nro_factura_c || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Acciones */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>
    </div>
  );
}
