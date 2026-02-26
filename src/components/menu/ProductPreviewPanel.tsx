import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useItemRemovibles } from '@/hooks/useItemRemovibles';
import { useGruposOpcionales } from '@/hooks/useGruposOpcionales';
import { AlertTriangle, Camera, Upload } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (v: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(v);

interface Props {
  item: {
    id: string;
    nombre: string;
    descripcion?: string | null;
    precio_base: number;
    imagen_url?: string | null;
  };
}

export function ProductPreviewPanel({ item }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Extras assigned to this item
  const { data: asignaciones } = useQuery({
    queryKey: ['item-extra-asignaciones', item.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_extra_asignaciones' as any)
        .select('*, extra:extra_id(id, nombre, precio_base, activo)')
        .eq('item_carta_id', item.id);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Removibles
  const { data: removibles } = useItemRemovibles(item.id);

  // Grupos opcionales
  const { data: grupos } = useGruposOpcionales(item.id);

  // Active extras with name and price
  const activeExtras = (asignaciones || [])
    .filter((a: any) => a.extra?.activo !== false)
    .map((a: any) => ({
      id: a.extra?.id,
      nombre: a.extra?.nombre || 'Extra',
      precio: Number(a.extra?.precio_base) || 0,
    }));

  const extrasSinPrecio = activeExtras.filter((e) => e.precio <= 0);
  const hasPersonalization =
    activeExtras.length > 0 || (removibles || []).length > 0 || (grupos || []).length > 0;

  // Alerts
  const alerts: string[] = [];
  if (extrasSinPrecio.length > 0)
    alerts.push(`${extrasSinPrecio.length} extras sin precio — configurar en Control de Costos`);
  if (!item.imagen_url) alerts.push('Sin foto');
  if (!item.descripcion) alerts.push('Sin descripción');

  // Upload handler
  const handleUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede superar 5MB');
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Solo JPG, PNG o WebP');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `items/${item.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('product-images')
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
      // Add cache buster
      const url = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error: dbErr } = await supabase
        .from('items_carta')
        .update({ imagen_url: url } as any)
        .eq('id', item.id);
      if (dbErr) throw dbErr;
      qc.invalidateQueries({ queryKey: ['items-carta'] });
      toast.success('Foto actualizada');
    } catch (e: any) {
      toast.error(`Error al subir: ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="px-4 py-5 bg-card border-t space-y-5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Vista previa
      </p>

      <div className="flex gap-6">
        {/* Photo */}
        <div className="shrink-0">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = '';
            }}
          />
          {item.imagen_url ? (
            <div className="relative group w-40 h-32 rounded-lg overflow-hidden border">
              <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium gap-1.5"
              >
                <Camera className="w-4 h-4" /> {uploading ? 'Subiendo...' : 'Cambiar'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-40 h-32 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
            >
              {uploading ? (
                <span className="text-xs">Subiendo...</span>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span className="text-xs font-medium">Subir foto</span>
                  <span className="text-[10px]">JPG, PNG o WebP</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Name, desc, price */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-4">
            <h3 className="font-semibold text-base">{item.nombre}</h3>
            <span className="font-mono font-bold text-base shrink-0">{fmt(item.precio_base)}</span>
          </div>
          {item.descripcion ? (
            <p className="text-sm text-muted-foreground leading-relaxed">{item.descripcion}</p>
          ) : (
            <p className="text-sm text-muted-foreground/50 italic">Sin descripción</p>
          )}
        </div>
      </div>

      {/* Personalization preview */}
      {hasPersonalization ? (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
          <p className="font-semibold text-sm">Personalizá tu {item.nombre.split(' ')[0]}</p>

          {/* Extras */}
          {activeExtras.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Extras · Agregá hasta 10</p>
              {activeExtras.map((e, i) => (
                <div key={e.id || i} className="flex items-center justify-between text-sm pl-2">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs w-5 text-center border rounded px-0.5">
                      0
                    </span>
                    <span>{e.nombre}</span>
                  </div>
                  {e.precio > 0 ? (
                    <span className="text-xs font-mono text-muted-foreground">
                      +{fmt(e.precio)}
                    </span>
                  ) : (
                    <span className="text-xs text-yellow-600">⚠ Sin precio</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Removibles */}
          {(removibles || []).length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">¿Sacar algo?</p>
              {(removibles || []).map((r: any) => {
                const nombre =
                  r.nombre_display || `Sin ${r.insumos?.nombre || r.preparaciones?.nombre || '?'}`;
                return (
                  <div key={r.id} className="flex items-center justify-between text-sm pl-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded border border-muted-foreground/40" />
                      <span>{nombre}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Grupos opcionales */}
          {(grupos || []).map((g: any) => (
            <div key={g.id} className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{g.nombre} · Elegí 1</p>
              {(g.items || []).map((opt: any) => {
                const nombre = opt.insumos?.nombre || opt.preparaciones?.nombre || '?';
                const delta = opt.costo_unitario || 0;
                return (
                  <div key={opt.id} className="flex items-center justify-between text-sm pl-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full border border-muted-foreground/40" />
                      <span>{nombre}</span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {delta > 0 ? `+${fmt(delta)}` : '+$0'}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          Este producto no tiene personalización configurada.
        </p>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-1">
          {alerts.map((a, i) => (
            <p key={i} className="text-xs text-yellow-600 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {a}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
