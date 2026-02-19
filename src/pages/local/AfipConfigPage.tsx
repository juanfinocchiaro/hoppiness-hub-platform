import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAfipConfig, useAfipConfigMutations } from '@/hooks/useAfipConfig';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/status-badge';
import { FormLayout } from '@/components/ui/forms-pro/FormLayout';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ArcaCertificateWizard } from '@/components/local/arca/ArcaCertificateWizard';
import { CopyArcaConfigDialog } from '@/components/local/arca/CopyArcaConfigDialog';
import { Wifi, Shield, FileText, Copy, RotateCcw, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export default function AfipConfigPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const { data: config, isLoading } = useAfipConfig(branchId);
  const { save, saveKeyAndCSR, saveCertificate, testConnection } = useAfipConfigMutations(branchId);
  const { isSuperadmin, localRole, loading: permLoading } = usePermissionsV2(branchId);

  const [form, setForm] = useState({
    cuit: '',
    razon_social: '',
    direccion_fiscal: '',
    inicio_actividades: '',
    punto_venta: '',
  });

  const [showProductionConfirm, setShowProductionConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);

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

  const canAccess = isSuperadmin || localRole === 'franquiciado';
  const isConnected = config?.estado_conexion === 'conectado';
  const fieldsLocked = isConnected;

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

  const handleToggleProduction = () => {
    if (!config?.es_produccion) {
      setShowProductionConfirm(true);
    } else {
      if (!branchId) return;
      save.mutate({ branch_id: branchId, es_produccion: false } as any);
    }
  };

  const confirmProduction = () => {
    if (!branchId) return;
    save.mutate({ branch_id: branchId, es_produccion: true } as any);
    setShowProductionConfirm(false);
  };

  const handleReset = async () => {
    if (!branchId) return;
    save.mutate({
      branch_id: branchId,
      certificado_crt: null,
      clave_privada_enc: null,
      csr_pem: null,
      estado_certificado: 'sin_configurar',
      estado_conexion: 'sin_configurar',
      ultimo_error: null,
      es_produccion: false,
    } as any);
    setShowResetConfirm(false);
    toast.success('Configuración ARCA reseteada. Los datos fiscales se mantienen.');
  };

  if (isLoading || permLoading) return <HoppinessLoader fullScreen size="lg" />;

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <ShieldAlert className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acceso restringido</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Solo el dueño de la franquicia o un superadmin pueden acceder a la configuración de facturación electrónica.
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>Volver</Button>
      </div>
    );
  }

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
        <div className="flex items-center gap-2">
          {estadoBadge()}
        </div>
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
                disabled={fieldsLocked}
              />
              {fieldsLocked && (
                <p className="text-xs text-muted-foreground">Bloqueado mientras hay conexión activa</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="razon_social">Razón Social</Label>
              <Input
                id="razon_social"
                placeholder="Empresa S.R.L."
                value={form.razon_social}
                onChange={(e) => handleChange('razon_social', e.target.value)}
                disabled={fieldsLocked}
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
                disabled={fieldsLocked}
              />
              {fieldsLocked && (
                <p className="text-xs text-muted-foreground">Bloqueado mientras hay conexión activa</p>
              )}
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
            if (form.cuit || form.razon_social || form.direccion_fiscal || form.inicio_actividades || form.punto_venta) {
              await save.mutateAsync({
                branch_id: branchId,
                cuit: form.cuit || null,
                razon_social: form.razon_social || null,
                direccion_fiscal: form.direccion_fiscal || null,
                inicio_actividades: form.inicio_actividades || null,
                punto_venta: form.punto_venta ? parseInt(form.punto_venta) : null,
              } as any);
            }
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
              onClick={handleToggleProduction}
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
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? 'Guardando...' : 'Guardar Configuración'}
        </Button>

        {isSuperadmin && (
          <>
            <Button variant="outline" onClick={() => setShowCopyDialog(true)}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar de otra sucursal
            </Button>
            <Button variant="ghost" className="text-destructive" onClick={() => setShowResetConfirm(true)}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Resetear configuración
            </Button>
          </>
        )}
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        open={showProductionConfirm}
        onOpenChange={setShowProductionConfirm}
        title="¿Activar modo Producción?"
        description="Las facturas se emitirán contra ARCA de forma real. Asegurate de que el certificado esté correctamente configurado y que hayas probado en homologación primero."
        confirmLabel="Sí, activar producción"
        cancelLabel="Cancelar"
        onConfirm={confirmProduction}
        variant="destructive"
      />

      <ConfirmDialog
        open={showResetConfirm}
        onOpenChange={setShowResetConfirm}
        title="¿Resetear configuración ARCA?"
        description="Esto eliminará el certificado, la clave privada y el estado de conexión. Los datos fiscales (CUIT, razón social, dirección) se mantendrán. Vas a tener que volver a generar el certificado y subirlo a ARCA."
        confirmLabel="Sí, resetear"
        cancelLabel="Cancelar"
        onConfirm={handleReset}
        variant="destructive"
      />

      {branchId && (
        <CopyArcaConfigDialog
          open={showCopyDialog}
          onOpenChange={setShowCopyDialog}
          targetBranchId={branchId}
          onCopied={() => {
            toast.success('Configuración copiada. Probando conexión...');
            setTimeout(() => testConnection.mutate(), 500);
          }}
        />
      )}
    </div>
  );
}
