import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fromUntyped } from '@/lib/supabase-helpers';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

const BUCKET = 'proveedores-docs';
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export interface ProveedorDocumento {
  id: string;
  proveedor_id: string;
  nombre_archivo: string;
  storage_path: string;
  public_url: string;
  tipo: string;
  file_size_bytes: number | null;
  created_at: string;
}

export function useProveedorDocumentos(proveedorId: string | undefined) {
  return useQuery({
    queryKey: ['proveedor-documentos', proveedorId],
    queryFn: async () => {
      const { data, error } = await fromUntyped('proveedor_documentos')
        .select('*')
        .eq('proveedor_id', proveedorId!)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ProveedorDocumento[];
    },
    enabled: !!proveedorId,
  });
}

export function useUploadProveedorDoc() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      proveedorId,
      file,
      tipo = 'general',
    }: {
      proveedorId: string;
      file: File;
      tipo?: string;
    }) => {
      if (file.type !== 'application/pdf') {
        throw new Error('Solo se permiten archivos PDF');
      }
      if (file.size > MAX_SIZE_BYTES) {
        throw new Error('El archivo no puede superar 10MB');
      }

      const ext = file.name.split('.').pop() || 'pdf';
      const storagePath = `${proveedorId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(storagePath);

      const { data: doc, error: dbError } = await fromUntyped('proveedor_documentos')
        .insert({
          proveedor_id: proveedorId,
          nombre_archivo: file.name,
          storage_path: storagePath,
          public_url: urlData.publicUrl,
          tipo,
          file_size_bytes: file.size,
          uploaded_by: user?.id,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return doc;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['proveedor-documentos', variables.proveedorId] });
      toast.success('Documento subido');
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useDeleteProveedorDoc() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ docId, proveedorId }: { docId: string; proveedorId: string }) => {
      const { error } = await fromUntyped('proveedor_documentos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', docId);
      if (error) throw error;
      return proveedorId;
    },
    onSuccess: (proveedorId) => {
      qc.invalidateQueries({ queryKey: ['proveedor-documentos', proveedorId] });
      toast.success('Documento eliminado');
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useUploadFacturaPdf() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      facturaId,
      file,
    }: {
      facturaId: string;
      file: File;
    }) => {
      if (file.type !== 'application/pdf') {
        throw new Error('Solo se permiten archivos PDF');
      }
      if (file.size > MAX_SIZE_BYTES) {
        throw new Error('El archivo no puede superar 10MB');
      }

      const storagePath = `facturas/${facturaId}/${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(storagePath);

      const { error: dbError } = await fromUntyped('facturas_proveedores')
        .update({ factura_pdf_url: urlData.publicUrl })
        .eq('id', facturaId);

      if (dbError) throw dbError;
      return urlData.publicUrl;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facturas'] });
      toast.success('PDF adjuntado a la factura');
    },
    onError: (e) => toast.error(e.message),
  });
}
