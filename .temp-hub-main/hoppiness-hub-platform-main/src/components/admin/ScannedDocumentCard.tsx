import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  RefreshCw,
  Eye,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ScannedDocumentCardProps {
  document: any;
  isProcessing: boolean;
  onReview: () => void;
  onRetry: () => void;
  onDelete: () => void;
}

export function ScannedDocumentCard({
  document,
  isProcessing,
  onReview,
  onRetry,
  onDelete
}: ScannedDocumentCardProps) {
  const invoice = document.extracted_invoices?.[0];
  const status = document.status;

  const getStatusBadge = () => {
    if (isProcessing || status === 'processing') {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Procesando
      </Badge>;
    }
    if (status === 'error') {
      return <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" /> Error
      </Badge>;
    }
    if (status === 'completed' && invoice?.is_reviewed) {
      return <Badge variant="default" className="bg-green-500">
        <CheckCircle className="h-3 w-3 mr-1" /> Revisado
      </Badge>;
    }
    if (status === 'completed') {
      return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
        <Eye className="h-3 w-3 mr-1" /> Para revisar
      </Badge>;
    }
    return <Badge variant="outline">Pendiente</Badge>;
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {/* Image Preview */}
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        {document.file_url && (
          <img
            src={document.file_url}
            alt={document.file_name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          {getStatusBadge()}
          {invoice?.confidence_score && (
            <span className={`text-xs font-medium ${getConfidenceColor(invoice.confidence_score)}`}>
              {Math.round(invoice.confidence_score * 100)}% conf.
            </span>
          )}
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* File info */}
        <div className="flex items-start gap-2">
          <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{document.file_name}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(document.created_at), "d MMM yyyy, HH:mm", { locale: es })}
            </p>
          </div>
        </div>

        {/* Extracted data preview */}
        {invoice && (
          <div className="space-y-1 text-sm border-t pt-3">
            {invoice.supplier_name && (
              <p className="font-medium truncate">{invoice.supplier_name}</p>
            )}
            <div className="flex justify-between text-muted-foreground">
              {invoice.invoice_number && (
                <span className="truncate">{invoice.invoice_number}</span>
              )}
              {invoice.total && (
                <span className="font-medium text-foreground">
                  ${invoice.total.toLocaleString('es-AR')}
                </span>
              )}
            </div>
            {invoice.invoice_date && (
              <p className="text-xs text-muted-foreground">
                Fecha: {format(new Date(invoice.invoice_date), "d/MM/yyyy")}
              </p>
            )}
          </div>
        )}

        {/* Error message */}
        {status === 'error' && document.error_message && (
          <p className="text-xs text-destructive border-t pt-2">
            {document.error_message}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          {status === 'completed' && (
            <Button size="sm" className="flex-1" onClick={onReview}>
              <Eye className="h-4 w-4 mr-1" />
              Revisar
            </Button>
          )}
          {status === 'error' && (
            <Button size="sm" variant="outline" className="flex-1" onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Reintentar
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
