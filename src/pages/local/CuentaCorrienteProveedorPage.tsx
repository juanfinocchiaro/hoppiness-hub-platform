import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Building2, Phone, Mail, CreditCard, AlertTriangle,
  TrendingUp, Calendar, ArrowLeft, Pencil, Trash2
} from 'lucide-react';
import { useSaldoProveedor, useMovimientosProveedor } from '@/hooks/useCuentaCorrienteProveedor';
import { useProveedores } from '@/hooks/useProveedores';
import { usePagoProveedorMutations, useFacturaById } from '@/hooks/useCompras';
import { PagoProveedorModal } from '@/components/finanzas/PagoProveedorModal';
import { ProveedorFormModal } from '@/components/finanzas/ProveedorFormModal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/states';

/** Parse YYYY-MM-DD as local date to avoid UTC→local shift */
function formatLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-AR');
}

function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function CuentaCorrienteProveedorPage() {
  const { branchId, proveedorId } = useParams<{ branchId: string; proveedorId: string }>();
  const navigate = useNavigate();
  const { data: proveedores } = useProveedores(branchId);
  const proveedor = proveedores?.find(p => p.id === proveedorId);
  const { data: saldo, isLoading: loadingSaldo } = useSaldoProveedor(branchId, proveedorId);
  const { data: movimientos, isLoading: loadingMov } = useMovimientosProveedor(branchId, proveedorId);
  const { softDeletePago } = usePagoProveedorMutations();
  const [payingFacturaId, setPayingFacturaId] = useState<string | null>(null);
  const [editingProveedor, setEditingProveedor] = useState(false);
  const [deletingPagoId, setDeletingPagoId] = useState<string | null>(null);
  const { data: facturaData } = useFacturaById(payingFacturaId);

  const payingFactura = payingFacturaId && facturaData ? {
    ...facturaData,
    proveedor_id: proveedorId!,
    branch_id: branchId!,
  } : null;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={proveedor?.razon_social || 'Proveedor'}
        subtitle={proveedor?.cuit ? `CUIT: ${proveedor.cuit}` : undefined}
        actions={
          <Button variant="outline" onClick={() => navigate(`/milocal/${branchId}/finanzas/proveedores`)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
          </Button>
        }
      />

      {/* Alerta de facturas vencidas */}
      {saldo && Number(saldo.facturas_vencidas) > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Tenés {saldo.facturas_vencidas} factura(s) vencida(s) por $ {Number(saldo.monto_vencido).toLocaleString('es-AR')}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {loadingSaldo ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-12 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Pendiente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">
                  $ {Number(saldo?.total_pendiente || 0).toLocaleString('es-AR')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {saldo?.facturas_pendientes || 0} factura(s) pendiente(s)
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Próximo Vencimiento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold">
                  {saldo?.proximo_vencimiento
                    ? new Date(saldo.proximo_vencimiento).toLocaleDateString('es-AR')
                    : '-'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Total Facturado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold font-mono">
                  $ {Number(saldo?.total_facturado || 0).toLocaleString('es-AR')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{saldo?.cantidad_facturas || 0} factura(s)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Total Pagado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold font-mono">
                  $ {Number(saldo?.total_pagado || 0).toLocaleString('es-AR')}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Datos del Proveedor */}
      {proveedor && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Datos del Proveedor</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setEditingProveedor(true)}>
              <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span><strong>Razón Social:</strong> {proveedor.razon_social}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span><strong>Teléfono:</strong> {proveedor.telefono || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span><strong>Email:</strong> {proveedor.email || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <span><strong>Cuenta Corriente:</strong> {proveedor.permite_cuenta_corriente ? `Sí (${proveedor.dias_pago_habitual || '-'} días)` : 'No'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial de Movimientos */}
      <Card>
        <CardHeader><CardTitle className="text-base">Historial de Cuenta Corriente</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead className="text-right">Debe</TableHead>
                <TableHead className="text-right">Haber</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingMov ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !movimientos?.length ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32">
                    <EmptyState icon={CreditCard} title="Sin movimientos" description="No hay facturas ni pagos registrados" />
                  </TableCell>
                </TableRow>
              ) : (
                movimientos.map((mov) => (
                  <TableRow key={`${mov.tipo}-${mov.id}`}>
                    <TableCell className="text-sm">{formatLocalDate(mov.fecha)}</TableCell>
                    <TableCell>
                      {mov.tipo === 'factura' ? (
                        <Badge variant="destructive">Factura</Badge>
                      ) : (
                        <Badge variant="default">Pago</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {mov.tipo === 'factura' ? (
                        <div>
                          <p className="font-medium text-sm">{mov.factura_numero}</p>
                          <p className="text-xs text-muted-foreground">{mov.items_count} item(s)</p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium text-sm capitalize">{mov.medio_pago}</p>
                          {mov.referencia && <p className="text-xs text-muted-foreground">Ref: {mov.referencia}</p>}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {mov.tipo === 'factura' && (
                        <span className="text-destructive">$ {mov.monto.toLocaleString('es-AR')}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {mov.tipo === 'pago' && (
                        <span className="text-green-600">$ {mov.monto.toLocaleString('es-AR')}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      $ {mov.saldo_acumulado.toLocaleString('es-AR')}
                    </TableCell>
                    <TableCell>
                      {mov.tipo === 'factura' && mov.estado && (
                        mov.estado === 'pagado' ? <Badge variant="default">Pagado</Badge> :
                        mov.estado === 'vencido' || (mov.fecha_vencimiento && parseLocalDate(mov.fecha_vencimiento) < new Date()) ?
                          <Badge variant="destructive">Vencido</Badge> :
                          <Badge variant="secondary">Pendiente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {mov.tipo === 'factura' && mov.fecha_vencimiento && (
                        <span className={parseLocalDate(mov.fecha_vencimiento) < new Date() ? 'text-destructive font-medium' : ''}>
                          {formatLocalDate(mov.fecha_vencimiento)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end items-center">
                        {mov.tipo === 'factura' && mov.estado !== 'pagado' && (
                          <Button size="sm" variant="outline" onClick={() => setPayingFacturaId(mov.id)}>
                            Pagar
                          </Button>
                        )}
                        {mov.tipo === 'pago' && mov.verificado === false && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                            Pend. verificación
                          </Badge>
                        )}
                        {mov.tipo === 'pago' && mov.verificado === true && (
                          <Badge variant="default" className="text-xs gap-1">
                            ✓ Verificado
                          </Badge>
                        )}
                        {mov.tipo === 'pago' && !mov.verificado && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDeletingPagoId(mov.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PagoProveedorModal
        open={!!payingFacturaId}
        onOpenChange={() => setPayingFacturaId(null)}
        factura={payingFactura as any}
        proveedorNombre={proveedor?.razon_social}
      />

      <ConfirmDialog
        open={!!deletingPagoId}
        onOpenChange={() => setDeletingPagoId(null)}
        title="Eliminar pago"
        description="¿Estás seguro de eliminar este pago? El saldo de la factura se actualizará automáticamente."
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={async () => {
          if (deletingPagoId) await softDeletePago.mutateAsync(deletingPagoId);
          setDeletingPagoId(null);
        }}
      />

      {proveedor && (
        <ProveedorFormModal
          open={editingProveedor}
          onOpenChange={setEditingProveedor}
          proveedor={proveedor}
        />
      )}
    </div>
  );
}
