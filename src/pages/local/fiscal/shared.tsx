import type { Tables } from '@/integrations/supabase/types';
import type { FiscalReportBranchData } from '@/lib/escpos';

export type FiscalBranchData = FiscalReportBranchData & {
  razon_social: string;
  iibb: string;
  condicion_iva: string;
  inicio_actividades: string;
  direccion_fiscal: string;
};

export type FacturaEmitidaWithPedido = Tables<'facturas_emitidas'> & {
  pedidos: Pick<Tables<'pedidos'>, 'numero_pedido' | 'total' | 'cliente_nombre'>;
};

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Error desconocido');

export const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(v);

export function Row({ label, value, bold }: { label: string; value: string | number; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
