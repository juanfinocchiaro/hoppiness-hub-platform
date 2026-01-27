import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileSpreadsheet, 
  Check, 
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  useNucleoProductMappings,
  useBranchKitchenType,
  useSalesImports,
  useSaveSalesImport,
  useDeleteSalesImport,
  processNucleoCheckData,
  type ParsedExcelRow,
  type ProcessedSalesResult,
} from '@/hooks/useSalesImports';
import { SalesImportPreview } from '@/components/local/SalesImportPreview';

export default function LocalSalesImport() {
  const { branchId } = useParams<{ branchId: string }>();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedResult, setProcessedResult] = useState<ProcessedSalesResult | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const { data: mappings, isLoading: loadingMappings } = useNucleoProductMappings();
  const { data: kitchenType, isLoading: loadingKitchen } = useBranchKitchenType(branchId);
  const { data: imports, isLoading: loadingImports } = useSalesImports(branchId);
  const saveMutation = useSaveSalesImport();
  const deleteMutation = useDeleteSalesImport();

  const isLoading = loadingMappings || loadingKitchen || loadingImports;

  const parseExcelFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Parse with header row skip (4 rows as per Núcleo Check format)
      const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { range: 4 });

      // Map to our structure
      const rows: ParsedExcelRow[] = rawData.map((row: Record<string, unknown>) => ({
        fecha: row['Fecha'] instanceof Date ? row['Fecha'] : null,
        n_pedido: String(row['N° Pedido'] || ''),
        codigo: String(row['Código'] || row['Codigo'] || ''),
        nombre: String(row['Nombre'] || ''),
        cantidad: Number(row['Cantidad'] || 0),
        total: Number(row['Total $'] || row['Total'] || 0),
        rubro: String(row['Rubro'] || ''),
        subrubro: String(row['SubRubro'] || row['Subrubro'] || ''),
        tipo_pedido: String(row['Tipo de pedido'] || row['Tipo pedido'] || ''),
        sector: String(row['Sector'] || ''),
      }));

      if (rows.length === 0) {
        throw new Error('El archivo no contiene datos válidos');
      }

      // Process data
      if (!mappings) throw new Error('No se cargaron los mapeos de productos');
      
      const result = processNucleoCheckData(rows, mappings, kitchenType || 'smash');
      setProcessedResult(result);

    } catch (error) {
      console.error('Error parsing Excel:', error);
      toast.error(error instanceof Error ? error.message : 'Error al procesar el archivo');
      setProcessedResult(null);
    } finally {
      setIsProcessing(false);
    }
  }, [mappings, kitchenType]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      parseExcelFile(file);
    } else {
      toast.error('Solo se aceptan archivos Excel (.xlsx, .xls)');
    }
  }, [parseExcelFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseExcelFile(file);
    }
  }, [parseExcelFile]);

  const handleConfirmImport = async () => {
    if (!branchId || !processedResult) return;

    try {
      await saveMutation.mutateAsync({
        branchId,
        fileName,
        result: processedResult,
      });
      toast.success('Importación guardada correctamente');
      setProcessedResult(null);
      setFileName('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar la importación');
    }
  };

  const handleCancelImport = () => {
    setProcessedResult(null);
    setFileName('');
  };

  const handleDeleteImport = async (importId: string) => {
    if (!branchId) return;
    if (!confirm('¿Estás seguro de eliminar esta importación?')) return;

    try {
      await deleteMutation.mutateAsync({ importId, branchId });
      toast.success('Importación eliminada');
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // If we have a processed result, show preview
  if (processedResult) {
    return (
      <SalesImportPreview
        result={processedResult}
        fileName={fileName}
        kitchenType={kitchenType || 'smash'}
        onConfirm={handleConfirmImport}
        onCancel={handleCancelImport}
        isLoading={saveMutation.isPending}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Cargar Ventas</h1>
        <p className="text-muted-foreground">
          Importá el archivo Excel de Núcleo Check para calcular el consumo de ingredientes
        </p>
      </div>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Importar desde Núcleo Check
          </CardTitle>
          <CardDescription>
            Subí el archivo "Detalle de productos vendidos por pedido" exportado de Núcleo Check
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'}
              ${isProcessing ? 'pointer-events-none opacity-50' : ''}
            `}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileSelect}
            />
            
            {isProcessing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-muted-foreground">Procesando archivo...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <FileSpreadsheet className="w-12 h-12 text-muted-foreground" />
                <div>
                  <p className="font-medium">Arrastrá tu archivo aquí</p>
                  <p className="text-sm text-muted-foreground">o hacé clic para seleccionar</p>
                </div>
                <p className="text-xs text-muted-foreground">Formatos: .xlsx, .xls</p>
              </div>
            )}
          </div>

          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Este local usa cocina tipo <strong>{kitchenType === 'smash' ? 'SMASH' : 'PARRILLA'}</strong>. 
              Los ingredientes se calcularán según las recetas correspondientes.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Importaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {imports && imports.length > 0 ? (
            <div className="space-y-3">
              {imports.map((imp) => (
                <div 
                  key={imp.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-success/10">
                      <Check className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {format(new Date(imp.date_from), 'dd/MM/yyyy', { locale: es })} - {format(new Date(imp.date_to), 'dd/MM/yyyy', { locale: es })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {imp.records_count} registros • {formatCurrency(imp.total_sales)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm">
                        🥖 {imp.consumed_panes} • 🥩 {imp.consumed_carne_kg.toFixed(1)}kg • 🍟 {imp.consumed_papas}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(imp.created_at), "dd/MM 'a las' HH:mm", { locale: es })}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteImport(imp.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No hay importaciones aún. Subí tu primer archivo de Núcleo Check.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
