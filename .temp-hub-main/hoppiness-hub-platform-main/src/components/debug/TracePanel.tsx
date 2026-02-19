import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { traceClear, traceRead } from '@/lib/trace';
import { useMemo, useState } from 'react';
import { Copy, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function TracePanel({ title = 'Logs de Checkout' }: { title?: string }) {
  const [nonce, setNonce] = useState(0);
  const events = useMemo(() => {
    void nonce;
    return traceRead();
  }, [nonce]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(events, null, 2));
      toast.success('Logs copiados');
    } catch {
      toast.error('No se pudieron copiar los logs');
    }
  };

  const clear = () => {
    traceClear();
    setNonce(n => n + 1);
    toast.message('Logs limpiados');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setNonce(n => n + 1)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button variant="outline" size="sm" onClick={copy}>
              <Copy className="w-4 h-4 mr-2" />
              Copiar
            </Button>
            <Button variant="outline" size="sm" onClick={clear}>
              <Trash2 className="w-4 h-4 mr-2" />
              Limpiar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64 rounded-md border bg-background">
          <pre className="p-3 text-xs leading-relaxed whitespace-pre-wrap break-words">
            {events.length ? JSON.stringify(events, null, 2) : 'Sin logs todavía. Probá tocar Confirmar Pedido.'}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
