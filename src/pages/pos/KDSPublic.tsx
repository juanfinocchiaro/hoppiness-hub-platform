/**
 * KDSPublic - Pantalla KDS accesible por token sin login
 * 
 * Ruta: /kds/:branchId?token=XXXXX
 * 
 * No requiere autenticación. El token se valida contra la tabla kds_tokens.
 */
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import KDSView from '@/components/pos/KDSView';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, QrCode } from 'lucide-react';

export default function KDSPublic() {
  const { branchId } = useParams<{ branchId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  // Validate token
  const { data: validationResult, isLoading, error } = useQuery({
    queryKey: ['kds-token-validation', token],
    queryFn: async () => {
      if (!token) {
        throw new Error('Token no proporcionado');
      }
      
      const { data, error } = await supabase
        .rpc('validate_kds_token', { _token: token });
      
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Token inválido o expirado');
      }
      
      const result = data[0];
      
      // Verify branch matches if provided
      if (branchId && result.branch_id !== branchId) {
        throw new Error('Token no válido para esta sucursal');
      }
      
      return result as { branch_id: string; branch_name: string };
    },
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <QrCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>Acceso KDS</CardTitle>
            <CardDescription>
              Escanea el código QR o usa el link proporcionado por tu encargado para acceder a la pantalla de cocina.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  if (isLoading) {
    return <HoppinessLoader fullScreen size="lg" text="Validando acceso..." />;
  }
  
  if (error || !validationResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : 'Token inválido o expirado'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Contacta a tu encargado para obtener un nuevo link de acceso.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Create a minimal branch object for KDSView
  const branchForKDS = {
    id: validationResult.branch_id,
    name: validationResult.branch_name,
  } as any;
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header with branch name */}
      <div className="bg-primary text-primary-foreground px-4 py-2 text-center">
        <h1 className="text-lg font-semibold">
          🍳 KDS - {validationResult.branch_name}
        </h1>
      </div>
      
      {/* KDS View */}
      <KDSView branch={branchForKDS} />
    </div>
  );
}
