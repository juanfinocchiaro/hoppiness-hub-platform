import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useProductChannelMatrix, useToggleChannelAvailability, useBulkToggleAvailability } from '@/hooks/useChannelAvailability';
import { useBranchChannels } from '@/hooks/useBranchChannels';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Search, Check, X, AlertCircle, Minus, Power, PowerOff } from 'lucide-react';
import { cn } from '@/lib/utils';

// Status icons for the matrix
const StatusIcon = ({ isAllowed, isAvailable }: { isAllowed: boolean; isAvailable: boolean }) => {
  if (!isAllowed) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <Minus className="w-4 h-4 text-muted-foreground/40" />
        </TooltipTrigger>
        <TooltipContent>No permitido por Mi Marca</TooltipContent>
      </Tooltip>
    );
  }
  
  if (isAvailable) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <Check className="w-4 h-4 text-emerald-500" />
        </TooltipTrigger>
        <TooltipContent>Disponible</TooltipContent>
      </Tooltip>
    );
  }
  
  return (
    <Tooltip>
      <TooltipTrigger>
        <X className="w-4 h-4 text-destructive" />
      </TooltipTrigger>
      <TooltipContent>No disponible</TooltipContent>
    </Tooltip>
  );
};

export default function LocalChannelAvailability() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: matrixData, isLoading } = useProductChannelMatrix(branchId);
  const { data: channels } = useBranchChannels(branchId);
  const toggleAvailability = useToggleChannelAvailability();
  const bulkToggle = useBulkToggleAvailability();
  
  const [search, setSearch] = useState('');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'unavailable'>('all');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  
  // Get branch info
  const { data: branch } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: async () => {
      if (!branchId) return null;
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('id', branchId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!branchId,
  });

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!matrixData?.products) return [];
    
    return matrixData.products.filter(product => {
      // Text search
      const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      
      // Channel filter
      if (filterChannel !== 'all') {
        const channelStatus = matrixData.matrix[product.id]?.[filterChannel];
        if (!channelStatus?.isAllowed) return false;
      }
      
      // Status filter
      if (filterStatus !== 'all') {
        const hasMatchingStatus = matrixData.channels.some(channel => {
          const status = matrixData.matrix[product.id]?.[channel.id];
          if (!status?.isAllowed) return false;
          return filterStatus === 'available' ? status.isAvailable : !status.isAvailable;
        });
        if (!hasMatchingStatus) return false;
      }
      
      return true;
    });
  }, [matrixData, search, filterChannel, filterStatus]);

  // Active channels only
  const activeChannels = channels?.filter(c => c.is_enabled) || [];

  const handleCellClick = (productId: string, channelId: string) => {
    if (!branchId || !matrixData) return;
    
    const status = matrixData.matrix[productId]?.[channelId];
    if (!status?.isAllowed) return; // Can't toggle if not allowed by brand
    
    toggleAvailability.mutate({
      branchId,
      productId,
      channelId,
      isAvailable: !status.isAvailable,
    });
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleSelectProduct = (productId: string) => {
    const next = new Set(selectedProducts);
    if (next.has(productId)) {
      next.delete(productId);
    } else {
      next.add(productId);
    }
    setSelectedProducts(next);
  };

  const handleBulkEnable = (channelId: string) => {
    if (!branchId || selectedProducts.size === 0) return;
    
    const updates = Array.from(selectedProducts).map(productId => ({
      productId,
      channelId,
      isAvailable: true,
    }));
    
    bulkToggle.mutate({ branchId, updates });
    setSelectedProducts(new Set());
  };

  const handleBulkDisable = (channelId: string) => {
    if (!branchId || selectedProducts.size === 0) return;
    
    const updates = Array.from(selectedProducts).map(productId => ({
      productId,
      channelId,
      isAvailable: false,
    }));
    
    bulkToggle.mutate({ branchId, updates });
    setSelectedProducts(new Set());
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Disponibilidad por Canal</h1>
          <p className="text-muted-foreground">
            Controla qué productos están disponibles en cada canal - {branch?.name}
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar productos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={filterChannel} onValueChange={setFilterChannel}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los canales</SelectItem>
                  {activeChannels.map(channel => (
                    <SelectItem key={channel.channel_id} value={channel.channel_id}>
                      {channel.channel_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="available">
                    <span className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-emerald-500" />
                      Disponibles
                    </span>
                  </SelectItem>
                  <SelectItem value="unavailable">
                    <span className="flex items-center gap-2">
                      <X className="w-3 h-3 text-destructive" />
                      No disponibles
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {selectedProducts.size > 0 && (
                <div className="flex items-center gap-2 ml-auto">
                  <Badge variant="secondary">
                    {selectedProducts.size} seleccionados
                  </Badge>
                  {activeChannels.length > 0 && (
                    <Select onValueChange={(channelId) => handleBulkEnable(channelId)}>
                      <SelectTrigger className="w-auto">
                        <Power className="w-4 h-4 mr-1 text-emerald-500" />
                        Activar en...
                      </SelectTrigger>
                      <SelectContent>
                        {activeChannels.map(channel => (
                          <SelectItem key={channel.channel_id} value={channel.channel_id}>
                            {channel.channel_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {activeChannels.length > 0 && (
                    <Select onValueChange={(channelId) => handleBulkDisable(channelId)}>
                      <SelectTrigger className="w-auto">
                        <PowerOff className="w-4 h-4 mr-1 text-destructive" />
                        Desactivar en...
                      </SelectTrigger>
                      <SelectContent>
                        {activeChannels.map(channel => (
                          <SelectItem key={channel.channel_id} value={channel.channel_id}>
                            {channel.channel_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Matrix Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 sticky left-0 bg-background z-10">
                      <Checkbox 
                        checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="min-w-[200px] sticky left-10 bg-background z-10">
                      Producto
                    </TableHead>
                    {activeChannels.map(channel => (
                      <TableHead 
                        key={channel.channel_id} 
                        className="text-center min-w-[100px]"
                      >
                        <div 
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md"
                          style={{ backgroundColor: `${channel.color}15` }}
                        >
                          <span style={{ color: channel.color || undefined }}>
                            {channel.channel_name}
                          </span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell 
                        colSpan={activeChannels.length + 2} 
                        className="text-center py-8 text-muted-foreground"
                      >
                        No se encontraron productos
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map(product => (
                      <TableRow key={product.id}>
                        <TableCell className="sticky left-0 bg-background">
                          <Checkbox 
                            checked={selectedProducts.has(product.id)}
                            onCheckedChange={() => handleSelectProduct(product.id)}
                          />
                        </TableCell>
                        <TableCell className="sticky left-10 bg-background">
                          <div className="flex items-center gap-3">
                            {product.imageUrl && (
                              <img 
                                src={product.imageUrl} 
                                alt={product.name}
                                className="w-10 h-10 rounded-md object-cover"
                              />
                            )}
                            <div>
                              <div className="font-medium">{product.name}</div>
                              {product.categoryName && (
                                <div className="text-xs text-muted-foreground">
                                  {product.categoryName}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        {activeChannels.map(channel => {
                          const status = matrixData?.matrix[product.id]?.[channel.channel_id];
                          const isAllowed = status?.isAllowed ?? false;
                          const isAvailable = status?.isAvailable ?? false;
                          
                          return (
                            <TableCell 
                              key={channel.channel_id}
                              className={cn(
                                "text-center",
                                isAllowed && "cursor-pointer hover:bg-muted/50 transition-colors"
                              )}
                              onClick={() => handleCellClick(product.id, channel.channel_id)}
                            >
                              <StatusIcon isAllowed={isAllowed} isAvailable={isAvailable} />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <X className="w-4 h-4 text-destructive" />
                <span>No disponible (click para cambiar)</span>
              </div>
              <div className="flex items-center gap-2">
                <Minus className="w-4 h-4 text-muted-foreground/40" />
                <span>No permitido por Mi Marca</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
