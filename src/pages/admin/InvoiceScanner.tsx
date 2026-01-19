import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  RefreshCw,
  Eye,
  Trash2,
  Download,
  ScanLine
} from "lucide-react";
import { toast } from "sonner";
import { InvoiceReviewDialog } from "@/components/admin/InvoiceReviewDialog";
import { ScannedDocumentCard } from "@/components/admin/ScannedDocumentCard";

export default function InvoiceScanner() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Fetch all scanned documents
  const { data: documents, isLoading } = useQuery({
    queryKey: ['scanned-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scanned_documents')
        .select(`
          *,
          extracted_invoices (
            id,
            supplier_name,
            invoice_number,
            invoice_date,
            total,
            is_reviewed,
            confidence_score
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Process invoice mutation
  const processInvoice = useMutation({
    mutationFn: async ({ documentId, filePath }: { documentId: string; filePath: string }) => {
      const { data, error } = await supabase.functions.invoke('process-invoice', {
        body: { document_id: documentId, file_path: filePath }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scanned-documents'] });
    },
    onError: (error) => {
      toast.error(`Error procesando: ${error.message}`);
    }
  });

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    const totalFiles = files.length;
    let uploadedCount = 0;
    const uploadedDocs: { id: string; filePath: string }[] = [];

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
          toast.error(`${file.name}: Tipo de archivo no soportado`);
          continue;
        }

        // Upload to storage
        const fileName = `${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('scanned-documents')
          .upload(fileName, file);

        if (uploadError) {
          toast.error(`Error subiendo ${file.name}: ${uploadError.message}`);
          continue;
        }

        // Get public URL for display purposes only
        const { data: urlData } = supabase.storage
          .from('scanned-documents')
          .getPublicUrl(fileName);

        // Create document record - store both the display URL and file path
        const { data: docData, error: docError } = await supabase
          .from('scanned_documents')
          .insert({
            file_url: urlData.publicUrl,
            file_path: fileName,
            file_name: file.name,
            status: 'pending'
          })
          .select()
          .single();

        if (docError) {
          toast.error(`Error registrando ${file.name}`);
          continue;
        }

        // Store file path (not URL) for processing
        uploadedDocs.push({ id: docData.id, filePath: fileName });
        uploadedCount++;
        setUploadProgress((uploadedCount / totalFiles) * 100);
      }

      toast.success(`${uploadedCount} de ${totalFiles} archivos subidos`);

      // Invalidate query to show new documents
      queryClient.invalidateQueries({ queryKey: ['scanned-documents'] });

      // Start processing uploaded documents
      for (const doc of uploadedDocs) {
        setProcessingIds(prev => new Set(prev).add(doc.id));
        processInvoice.mutate(
          { documentId: doc.id, filePath: doc.filePath },
          {
            onSettled: () => {
              setProcessingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(doc.id);
                return newSet;
              });
            }
          }
        );
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error durante la carga');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [queryClient, processInvoice]);

  // Delete document mutation
  const deleteDocument = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from('scanned_documents')
        .delete()
        .eq('id', documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scanned-documents'] });
      toast.success('Documento eliminado');
    }
  });

  // Retry processing mutation
  const retryProcessing = useCallback(async (doc: any) => {
    if (!doc.file_path) {
      toast.error('No se puede reintentar: falta la ruta del archivo');
      return;
    }
    
    setProcessingIds(prev => new Set(prev).add(doc.id));
    
    await supabase
      .from('scanned_documents')
      .update({ status: 'pending', error_message: null })
      .eq('id', doc.id);

    processInvoice.mutate(
      { documentId: doc.id, filePath: doc.file_path },
      {
        onSettled: () => {
          setProcessingIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(doc.id);
            return newSet;
          });
        }
      }
    );
  }, [processInvoice]);

  // Group documents by status
  const pendingDocs = documents?.filter(d => d.status === 'pending' || d.status === 'processing') || [];
  const completedDocs = documents?.filter(d => d.status === 'completed') || [];
  const errorDocs = documents?.filter(d => d.status === 'error') || [];
  const reviewedDocs = completedDocs.filter(d => d.extracted_invoices?.[0]?.is_reviewed);
  const pendingReviewDocs = completedDocs.filter(d => !d.extracted_invoices?.[0]?.is_reviewed);

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Escáner de Comprobantes</h1>
          <p className="text-muted-foreground">
            Cargá facturas, tickets y remitos para extraer datos automáticamente con IA
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['scanned-documents'] })}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Upload Area */}
      <Card className="border-2 border-dashed border-primary/50 hover:border-primary transition-colors">
        <CardContent className="p-8">
          <label className="cursor-pointer block">
            <input
              type="file"
              multiple
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
              disabled={uploading}
            />
            <div className="flex flex-col items-center gap-4 text-center">
              {uploading ? (
                <>
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <div className="w-full max-w-xs">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-sm text-muted-foreground mt-2">
                      Subiendo archivos... {Math.round(uploadProgress)}%
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 rounded-full bg-primary/10">
                    <Upload className="h-12 w-12 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-medium">
                      Arrastrá archivos o hacé click para seleccionar
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Soporta JPG, PNG, WebP y PDF • Máximo 20MB por archivo
                    </p>
                  </div>
                </>
              )}
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Loader2 className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingDocs.length}</p>
              <p className="text-xs text-muted-foreground">En proceso</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Eye className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingReviewDocs.length}</p>
              <p className="text-xs text-muted-foreground">Para revisar</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{reviewedDocs.length}</p>
              <p className="text-xs text-muted-foreground">Completados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{errorDocs.length}</p>
              <p className="text-xs text-muted-foreground">Con errores</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents Tabs */}
      <Tabs defaultValue="pending-review" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending-review" className="gap-2">
            <Eye className="h-4 w-4" />
            Para Revisar ({pendingReviewDocs.length})
          </TabsTrigger>
          <TabsTrigger value="processing" className="gap-2">
            <Loader2 className="h-4 w-4" />
            Procesando ({pendingDocs.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Completados ({reviewedDocs.length})
          </TabsTrigger>
          <TabsTrigger value="errors" className="gap-2">
            <XCircle className="h-4 w-4" />
            Errores ({errorDocs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending-review">
          {pendingReviewDocs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <ScanLine className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay comprobantes pendientes de revisión</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingReviewDocs.map((doc) => (
                <ScannedDocumentCard
                  key={doc.id}
                  document={doc}
                  isProcessing={processingIds.has(doc.id)}
                  onReview={() => setSelectedDocument(doc.id)}
                  onRetry={() => retryProcessing(doc)}
                  onDelete={() => deleteDocument.mutate(doc.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="processing">
          {pendingDocs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Loader2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay comprobantes en proceso</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingDocs.map((doc) => (
                <ScannedDocumentCard
                  key={doc.id}
                  document={doc}
                  isProcessing={true}
                  onReview={() => {}}
                  onRetry={() => {}}
                  onDelete={() => deleteDocument.mutate(doc.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {reviewedDocs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay comprobantes completados</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reviewedDocs.map((doc) => (
                <ScannedDocumentCard
                  key={doc.id}
                  document={doc}
                  isProcessing={false}
                  onReview={() => setSelectedDocument(doc.id)}
                  onRetry={() => {}}
                  onDelete={() => deleteDocument.mutate(doc.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="errors">
          {errorDocs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay errores</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {errorDocs.map((doc) => (
                <ScannedDocumentCard
                  key={doc.id}
                  document={doc}
                  isProcessing={processingIds.has(doc.id)}
                  onReview={() => {}}
                  onRetry={() => retryProcessing(doc)}
                  onDelete={() => deleteDocument.mutate(doc.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      {selectedDocument && (
        <InvoiceReviewDialog
          documentId={selectedDocument}
          open={!!selectedDocument}
          onOpenChange={(open) => !open && setSelectedDocument(null)}
        />
      )}
    </div>
  );
}
