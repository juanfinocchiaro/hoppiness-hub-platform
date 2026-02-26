import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useAfipConfig,
  useAfipConfigMutations,
  type ReglasFacturacion,
  DEFAULT_REGLAS_FACTURACION,
} from '@/hooks/useAfipConfig';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { StatusBadge } from '@/components/ui/status-badge';
import { FormLayout } from '@/components/ui/forms-pro/FormLayout';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { DangerConfirmDialog } from '@/components/ui/danger-confirm-dialog';
import { ArcaCertificateWizard } from '@/components/local/arca/ArcaCertificateWizard';
import { CopyArcaConfigDialog } from '@/components/local/arca/CopyArcaConfigDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getArcaErrorMessage } from '@/lib/arca-error-messages';
import {
  Wifi,
  Shield,
  Copy,
  RotateCcw,
  ShieldAlert,
  Pencil,
  X,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  Lock,
  Info,
  ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';

function formatComprobante(n: number | null | undefined): string {
  return `#${String(n || 0).padStart(8, '0')}`;
}

/** Sub-component: Reglas de facturación configurables */
function ReglasFacturacionSection({
  config,
  branchId,
  save,
}: {
  config: import('@/hooks/useAfipConfig').AfipConfig | null | undefined;
  branchId: string;
  save: ReturnType<typeof useAfipConfigMutations>['save'];
}) {
  const [reglas, setReglas] = useState<ReglasFacturacion>(DEFAULT_REGLAS_FACTURACION);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (config?.reglas_facturacion) {
      setReglas({
        ...DEFAULT_REGLAS_FACTURACION,
        ...config.reglas_facturacion,
        canales_internos: {
          ...DEFAULT_REGLAS_FACTURACION.canales_internos,
          ...config.reglas_facturacion.canales_internos,
        },
        canales_externos: {
          ...DEFAULT_REGLAS_FACTURACION.canales_externos,
          ...config.reglas_facturacion.canales_externos,
        },
      });
    }
  }, [config?.reglas_facturacion]);

  const toggleInterno = (key: keyof ReglasFacturacion['canales_internos'], value: boolean) => {
    setReglas((prev) => ({
      ...prev,
      canales_internos: { ...prev.canales_internos, [key]: value },
    }));
    setDirty(true);
  };

  const toggleExterno = (key: keyof ReglasFacturacion['canales_externos'], value: boolean) => {
    setReglas((prev) => ({
      ...prev,
      canales_externos: { ...prev.canales_externos, [key]: value },
    }));
    setDirty(true);
  };

  const handleSave = () => {
    save.mutate({ branch_id: branchId, reglas_facturacion: reglas } as any, {
      onSuccess: () => {
        setDirty(false);
        toast.success('Reglas de facturación guardadas');
      },
      onError: (err: any) => {
        toast.error('Error al guardar reglas', { description: err?.message });
      },
    });
  };

  if (!config) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Reglas de facturación
        </p>
        <p className="text-xs text-muted-foreground">
          Primero configurá los datos fiscales arriba para habilitar las reglas de facturación.
        </p>
      </div>
    );
  }

  const internosRows: {
    key: keyof ReglasFacturacion['canales_internos'];
    icon: string;
    label: string;
  }[] = [
    { key: 'efectivo', icon: '💵', label: 'Efectivo' },
    { key: 'debito', icon: '💳', label: 'Débito' },
    { key: 'credito', icon: '💳', label: 'Crédito' },
    { key: 'qr', icon: '📱', label: 'QR / MercadoPago' },
    { key: 'transferencia', icon: '🏦', label: 'Transferencia' },
  ];

  const externosRows: {
    key: keyof ReglasFacturacion['canales_externos'];
    icon: string;
    label: string;
  }[] = [
    { key: 'rappi', icon: '🟡', label: 'Rappi' },
    { key: 'pedidosya', icon: '🔴', label: 'PedidosYa' },
    { key: 'mas_delivery_efectivo', icon: '🟢', label: 'MásDelivery efectivo' },
    { key: 'mas_delivery_digital', icon: '🟢', label: 'MásDelivery digital' },
    { key: 'mp_delivery', icon: '🔵', label: 'MP Delivery' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Reglas de facturación
        </p>
        <p className="text-xs text-muted-foreground">
          Configurá qué ventas se incluyen en la facturación esperada del cierre de turno.
        </p>
      </div>

      {/* Canales internos */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Canales internos (salón, takeaway, delivery propio)
        </p>
        <div className="space-y-2">
          {internosRows.map(({ key, icon, label }) => (
            <div
              key={key}
              className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50"
            >
              <span className="text-sm flex items-center gap-2">
                <span>{icon}</span> {label}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {reglas.canales_internos[key] ? 'Sí' : 'No'}
                </span>
                <Switch
                  checked={reglas.canales_internos[key]}
                  onCheckedChange={(v) => toggleInterno(key, v)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Canales externos */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Canales externos (apps de terceros)
        </p>
        <div className="space-y-2">
          {externosRows.map(({ key, icon, label }) => (
            <div
              key={key}
              className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50"
            >
              <span className="text-sm flex items-center gap-2">
                <span>{icon}</span> {label}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {reglas.canales_externos[key] ? 'Sí' : 'No'}
                </span>
                <Switch
                  checked={reglas.canales_externos[key]}
                  onCheckedChange={(v) => toggleExterno(key, v)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <p>
          Estas reglas determinan qué medios de pago generan factura electrónica automática desde el
          POS y cómo se calcula la facturación esperada en el cierre de turno.
        </p>
      </div>

      {/* Guardar */}
      <Button size="sm" onClick={handleSave} disabled={!dirty || save.isPending}>
        {save.isPending ? 'Guardando...' : 'Guardar reglas'}
      </Button>
    </div>
  );
}

export default function AfipConfigPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const { data: config, isLoading } = useAfipConfig(branchId);
  const { save, saveKeyAndCSR, saveCertificate, testConnection } = useAfipConfigMutations(branchId);
  const { isSuperadmin, localRole, loading: permLoading } = usePermissions(branchId);

  const [form, setForm] = useState({
    cuit: '',
    razon_social: '',
    direccion_fiscal: '',
    inicio_actividades: '',
    punto_venta: '',
  });

  const [showHomologacionConfirm, setShowHomologacionConfirm] = useState(false);
  const [showProduccionConfirm, setShowProduccionConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [isEditingFiscal, setIsEditingFiscal] = useState(false);
  const [restrictedOpen, setRestrictedOpen] = useState(false);

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
  const hasError = config?.estado_conexion === 'error' || !!config?.ultimo_error;
  const isConnected = config?.estado_conexion === 'conectado' && !hasError;
  const hasFiscalData = !!(config?.cuit || config?.razon_social);
  const fiscalReadOnly = !isEditingFiscal && hasFiscalData;

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
    save.mutate(payload as any, {
      onSuccess: () => setIsEditingFiscal(false),
      onError: (err: any) => {
        toast.error('Error al guardar datos fiscales', { description: err?.message });
      },
    });
  };

  const handleSwitchToHomologacion = () => {
    if (!branchId) return;
    save.mutate({ branch_id: branchId, es_produccion: false } as any, {
      onError: (err: any) => {
        toast.error('Error al cambiar a homologación', { description: err?.message });
      },
    });
    setShowHomologacionConfirm(false);
  };

  const handleSwitchToProduccion = () => {
    if (!branchId) return;
    save.mutate({ branch_id: branchId, es_produccion: true } as any, {
      onError: (err: any) => {
        toast.error('Error al cambiar a producción', { description: err?.message });
      },
    });
    setShowProduccionConfirm(false);
  };

  const handleReset = () => {
    if (!branchId) return;
    save.mutate(
      {
        branch_id: branchId,
        certificado_crt: null,
        clave_privada_enc: null,
        csr_pem: null,
        estado_certificado: 'sin_configurar',
        estado_conexion: 'sin_configurar',
        ultimo_error: null,
        es_produccion: false,
      } as any,
      {
        onSuccess: () => {
          toast.success('Configuración ARCA reseteada.');
        },
        onError: (err: any) => {
          toast.error('Error al resetear configuración', { description: err?.message });
        },
      },
    );
    setShowResetConfirm(false);
  };

  if (isLoading || permLoading) return <HoppinessLoader fullScreen size="lg" />;

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <ShieldAlert className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acceso restringido</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Solo el dueño de la franquicia o un superadmin pueden acceder a la configuración de
          facturación electrónica.
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Volver
        </Button>
      </div>
    );
  }

  const estadoBadge = () => {
    if (hasError) return <StatusBadge variant="blocked">Error</StatusBadge>;
    if (isConnected) return <StatusBadge variant="active">Conectado</StatusBadge>;
    return <StatusBadge variant="inactive">Sin configurar</StatusBadge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Facturación ARCA</h1>
          <p className="text-muted-foreground">
            Configuración de facturación electrónica para esta sucursal
          </p>
        </div>
        <div className="flex items-center gap-2">{estadoBadge()}</div>
      </div>

      {/* Banner Homologación */}
      {config && !config.es_produccion && config.estado_certificado !== 'sin_configurar' && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-orange-300 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                MODO HOMOLOGACIÓN ACTIVO
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-400">
                Las facturas emitidas en este modo NO son válidas fiscalmente. Si ya terminaste de
                probar, cambiá a Producción.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-orange-400 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/50"
            onClick={() => setShowProduccionConfirm(true)}
          >
            Cambiar a Producción
          </Button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ZONA 1: Estado Operativo                               */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Estado Operativo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Cards de Modo y Conexión */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Modo */}
            <div className="rounded-lg border p-4 space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Modo
              </p>
              <div className="flex items-center gap-2">
                {config?.es_produccion ? (
                  <>
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                    <span className="text-sm font-semibold">PRODUCCIÓN</span>
                  </>
                ) : (
                  <>
                    <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                    <span className="text-sm font-semibold">HOMOLOGACIÓN</span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {config?.es_produccion
                  ? 'Facturas válidas ante ARCA'
                  : 'Las facturas NO son válidas fiscalmente'}
              </p>
            </div>

            {/* Conexión */}
            <div className="rounded-lg border p-4 space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Conexión
              </p>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                      Verificada
                    </span>
                  </>
                ) : hasError ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-semibold text-destructive">Error</span>
                  </>
                ) : (
                  <>
                    <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
                    <span className="text-sm font-semibold text-muted-foreground">
                      Sin configurar
                    </span>
                  </>
                )}
              </div>
              {hasError && config?.ultimo_error && (
                <p className="text-xs text-destructive/80">
                  {getArcaErrorMessage(config.ultimo_error)}
                </p>
              )}
              {config?.ultima_verificacion && (
                <p className="text-xs text-muted-foreground">
                  Última: {new Date(config.ultima_verificacion).toLocaleString('es-AR')}
                </p>
              )}
            </div>
          </div>

          {/* Referencia rápida */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Punto de Venta</p>
              <p className="text-sm font-semibold">{config?.punto_venta ?? '—'}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">CUIT</p>
              <p className="text-sm font-semibold">{config?.cuit ?? '—'}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Razón Social</p>
              <p className="text-sm font-semibold">{config?.razon_social ?? '—'}</p>
            </div>
          </div>

          {/* Últimos comprobantes */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Últimos Comprobantes Emitidos</h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Factura A</p>
                <p className="text-lg font-bold font-mono">
                  {formatComprobante(config?.ultimo_nro_factura_a)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Factura B</p>
                <p className="text-lg font-bold font-mono">
                  {formatComprobante(config?.ultimo_nro_factura_b)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <p>
                Se sincronizan con ARCA al emitir facturas y al verificar la conexión. Si recién
                configuraste, es normal que estén en 0.
              </p>
            </div>
          </div>

          {/* Verificar conexión */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => testConnection.mutate()}
            disabled={testConnection.isPending}
          >
            {testConnection.isPending ? (
              'Verificando...'
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Verificar conexión ahora
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ZONA 2: Configuración                                   */}
      {/* ═══════════════════════════════════════════════════════ */}

      {/* Datos Fiscales */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Datos Fiscales
              </CardTitle>
              <CardDescription>
                Información fiscal de la sucursal para emitir comprobantes
              </CardDescription>
            </div>
            {hasFiscalData && (
              <Button
                variant={isEditingFiscal ? 'ghost' : 'outline'}
                size="sm"
                onClick={() => setIsEditingFiscal(!isEditingFiscal)}
              >
                {isEditingFiscal ? (
                  <>
                    <X className="mr-1.5 h-4 w-4" /> Cancelar
                  </>
                ) : (
                  <>
                    <Pencil className="mr-1.5 h-4 w-4" /> Editar
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {fiscalReadOnly ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">CUIT</Label>
                <p className="text-sm font-medium">{form.cuit || '—'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Razón Social</Label>
                <p className="text-sm font-medium">{form.razon_social || '—'}</p>
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs text-muted-foreground">Dirección Fiscal</Label>
                <p className="text-sm font-medium">{form.direccion_fiscal || '—'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Inicio de Actividades</Label>
                <p className="text-sm font-medium">{form.inicio_actividades || '—'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Punto de Venta (N°)</Label>
                <p className="text-sm font-medium">{form.punto_venta || '—'}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
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
              <Button onClick={handleSave} disabled={save.isPending}>
                {save.isPending ? 'Guardando...' : 'Guardar Datos Fiscales'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certificado ARCA */}
      {branchId && (
        <ArcaCertificateWizard
          config={config ?? null}
          branchId={branchId}
          cuit={form.cuit}
          razonSocial={form.razon_social}
          onSaveKeyAndCSR={async (data) => {
            if (
              form.cuit ||
              form.razon_social ||
              form.direccion_fiscal ||
              form.inicio_actividades ||
              form.punto_venta
            ) {
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

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ZONA 3: Zona Restringida                                */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Card className="border-destructive/20">
        <Collapsible open={restrictedOpen} onOpenChange={setRestrictedOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex w-full items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors rounded-[inherit]">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-destructive" />
                <span className="text-sm font-semibold">Zona restringida</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Acciones que pueden afectar la facturación
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${restrictedOpen ? 'rotate-180' : ''}`}
                />
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t px-5 pb-5 pt-4 space-y-5">
              {/* Reglas de facturación */}
              <ReglasFacturacionSection config={config} branchId={branchId!} save={save} />

              <div className="border-t" />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Cambiar modo de operación</p>
                    <p className="text-xs text-muted-foreground">
                      Modo actual: {config?.es_produccion ? '🟢 Producción' : '🟡 Homologación'}
                    </p>
                  </div>
                </div>
                {config?.es_produccion ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Cambiar a homologación significa que las facturas emitidas NO serán válidas
                      fiscalmente. Solo usá homologación para probar la configuración inicial.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/30 hover:bg-destructive/5"
                      onClick={() => setShowHomologacionConfirm(true)}
                    >
                      Cambiar a Homologación...
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Activar producción para que las facturas se emitan contra ARCA de forma real.
                      Asegurate de haber probado en homologación primero.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowProduccionConfirm(true)}
                    >
                      Activar Producción...
                    </Button>
                  </div>
                )}
              </div>

              <div className="border-t" />

              {/* Resetear */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Resetear configuración</p>
                <p className="text-xs text-muted-foreground">
                  Borra TODA la configuración de ARCA de esta sucursal: certificados y conexión. Los
                  datos fiscales se mantienen. Las facturas no se podrán emitir hasta reconfigurar
                  todo.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/5"
                  onClick={() => setShowResetConfirm(true)}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Resetear todo...
                </Button>
              </div>

              {/* Copiar datos fiscales (solo superadmin) */}
              {isSuperadmin && (
                <>
                  <div className="border-t" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Copiar datos fiscales de otra sucursal</p>
                    <p className="text-xs text-muted-foreground">
                      Copia CUIT, razón social, dirección e inicio de actividades de otra sucursal.
                      No copia certificados ni punto de venta.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setShowCopyDialog(true)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar datos fiscales...
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* Diálogos de confirmación                                */}
      {/* ═══════════════════════════════════════════════════════ */}

      {/* Cambiar a Homologación */}
      <DangerConfirmDialog
        open={showHomologacionConfirm}
        onOpenChange={setShowHomologacionConfirm}
        title="¿Cambiar a modo Homologación?"
        description="Solo usá homologación para probar la configuración por primera vez."
        consequences={[
          'Las facturas emitidas NO serán válidas ante ARCA',
          'Los clientes NO podrán usar las facturas como comprobante fiscal',
          'Podés tener problemas con ARCA si facturás en modo prueba',
        ]}
        confirmWord="HOMOLOGACION"
        confirmLabel="Cambiar a Homologación"
        onConfirm={handleSwitchToHomologacion}
      />

      {/* Activar Producción */}
      <DangerConfirmDialog
        open={showProduccionConfirm}
        onOpenChange={setShowProduccionConfirm}
        title="¿Activar modo Producción?"
        description="Las facturas se emitirán contra ARCA de forma real. Asegurate de que el certificado esté correctamente configurado."
        consequences={[
          'Las facturas emitidas serán válidas fiscalmente',
          'Los comprobantes se registran en ARCA y no se pueden anular fácilmente',
        ]}
        confirmWord="PRODUCCION"
        confirmLabel="Activar Producción"
        onConfirm={handleSwitchToProduccion}
      />

      {/* Resetear ARCA */}
      <DangerConfirmDialog
        open={showResetConfirm}
        onOpenChange={setShowResetConfirm}
        title="🚨 ¿Resetear TODA la configuración de ARCA?"
        description="Vas a tener que reconfigurar TODO desde cero. Las facturas no se van a poder emitir. Esta acción es IRREVERSIBLE."
        consequences={[
          'Certificado digital eliminado',
          'Clave privada eliminada',
          'Conexión con ARCA eliminada',
          'Se vuelve a modo Homologación',
        ]}
        confirmWord="RESETEAR ARCA"
        confirmLabel="Resetear todo"
        onConfirm={handleReset}
      />

      {/* Copiar datos fiscales */}
      {branchId && (
        <CopyArcaConfigDialog
          open={showCopyDialog}
          onOpenChange={setShowCopyDialog}
          targetBranchId={branchId}
          onCopied={() => {
            toast.success('Datos fiscales copiados correctamente.');
          }}
        />
      )}
    </div>
  );
}
