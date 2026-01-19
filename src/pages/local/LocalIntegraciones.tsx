import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ExternalLink, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  CreditCard,
  Truck,
  Bike
} from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface IntegrationConfig {
  key: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  docsUrl: string;
  fields: Array<{
    key: keyof Branch;
    label: string;
    type: 'text' | 'password';
    placeholder: string;
    required: boolean;
  }>;
  enabledKey: keyof Branch;
}

const INTEGRATIONS: IntegrationConfig[] = [
  {
    key: 'mercadopago',
    name: 'MercadoPago',
    description: 'Pagos online con tarjetas, QR y billetera virtual',
    icon: <CreditCard className="h-6 w-6" />,
    docsUrl: 'https://www.mercadopago.com.ar/developers/es/docs',
    enabledKey: 'mercadopago_access_token' as keyof Branch,
    fields: [
      { key: 'mercadopago_public_key', label: 'Public Key', type: 'text', placeholder: 'APP_USR-...', required: true },
      { key: 'mercadopago_access_token', label: 'Access Token', type: 'password', placeholder: 'APP_USR-...', required: true },
    ],
  },
  {
    key: 'mp_delivery',
    name: 'MercadoPago Delivery',
    description: 'Envíos con la flota de MercadoPago',
    icon: <Truck className="h-6 w-6" />,
    docsUrl: 'https://www.mercadopago.com.ar/developers/es/docs/mp-delivery',
    enabledKey: 'mercadopago_delivery_enabled',
    fields: [
      { key: 'mp_delivery_store_id', label: 'Store ID', type: 'text', placeholder: 'ID de tu tienda', required: true },
    ],
  },
  {
    key: 'rappi',
    name: 'Rappi',
    description: 'Recibí pedidos de Rappi directamente en tu sistema',
    icon: <Bike className="h-6 w-6 text-orange-500" />,
    docsUrl: 'https://www.rappi.com.ar/aliados',
    enabledKey: 'rappi_enabled',
    fields: [
      { key: 'rappi_store_id', label: 'Store ID', type: 'text', placeholder: 'ID de tienda Rappi', required: true },
      { key: 'rappi_api_key', label: 'API Key', type: 'password', placeholder: 'Tu API Key de Rappi', required: true },
    ],
  },
  {
    key: 'pedidosya',
    name: 'PedidosYa',
    description: 'Integración con PedidosYa para recibir pedidos',
    icon: <Bike className="h-6 w-6 text-red-500" />,
    docsUrl: 'https://www.pedidosya.com.ar/restaurantes',
    enabledKey: 'pedidosya_enabled',
    fields: [
      { key: 'pedidosya_restaurant_id', label: 'Restaurant ID', type: 'text', placeholder: 'ID de restaurante', required: true },
      { key: 'pedidosya_api_key', label: 'API Key', type: 'password', placeholder: 'Tu API Key de PedidosYa', required: true },
    ],
  },
];

export default function LocalIntegraciones() {
  const { branchId } = useParams();
  const { branch: contextBranch } = useOutletContext<{ branch: Branch | null }>();
  const { isAdmin, isGerente, branchPermissions } = useUserRole();
  
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<Record<string, string>>({});

  const currentPermissions = branchPermissions.find(p => p.branch_id === branchId);
  const canEdit = isAdmin || isGerente || currentPermissions?.can_manage_staff;

  const fetchBranch = async () => {
    if (!branchId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('id', branchId)
        .single();

      if (error) throw error;
      
      setBranch(data);
      
      // Initialize form data
      const initialData: Record<string, string> = {};
      INTEGRATIONS.forEach(integration => {
        integration.fields.forEach(field => {
          initialData[field.key as string] = (data[field.key] as string) || '';
        });
      });
      setFormData(initialData);
    } catch (error: any) {
      toast.error('Error al cargar sucursal: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranch();
  }, [branchId]);

  const handleFieldChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const togglePassword = (fieldKey: string) => {
    setShowPasswords(prev => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  const saveIntegration = async (integration: IntegrationConfig) => {
    if (!canEdit || !branchId) {
      toast.error('No tenés permisos para modificar integraciones');
      return;
    }

    setSaving(integration.key);
    try {
      const updateData: Record<string, any> = {};
      
      integration.fields.forEach(field => {
        updateData[field.key as string] = formData[field.key as string] || null;
      });

      // Check if should enable/disable the integration
      const hasRequiredFields = integration.fields
        .filter(f => f.required)
        .every(f => formData[f.key as string]?.trim());
      
      if (integration.enabledKey !== 'mercadopago_access_token') {
        updateData[integration.enabledKey as string] = hasRequiredFields;
      }

      const { error } = await supabase
        .from('branches')
        .update(updateData)
        .eq('id', branchId);

      if (error) throw error;
      
      toast.success(`${integration.name} configurado correctamente`);
      fetchBranch();
    } catch (error: any) {
      toast.error('Error al guardar: ' + error.message);
    } finally {
      setSaving(null);
    }
  };

  const isIntegrationConfigured = (integration: IntegrationConfig): boolean => {
    return integration.fields
      .filter(f => f.required)
      .every(f => {
        const value = branch?.[f.key];
        return value && String(value).trim().length > 0;
      });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integraciones</h1>
        <p className="text-muted-foreground">{branch?.name} · Conectá servicios externos</p>
      </div>

      {!canEdit && (
        <Card className="bg-muted">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              Modo lectura: no tenés permisos para modificar integraciones.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="mercadopago" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          {INTEGRATIONS.map(integration => (
            <TabsTrigger key={integration.key} value={integration.key} className="gap-2">
              {integration.icon}
              <span className="hidden sm:inline">{integration.name}</span>
              {isIntegrationConfigured(integration) && (
                <CheckCircle className="h-3 w-3 text-green-500" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {INTEGRATIONS.map(integration => (
          <TabsContent key={integration.key} value={integration.key}>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      {integration.icon}
                    </div>
                    <div>
                      <CardTitle>{integration.name}</CardTitle>
                      <CardDescription>{integration.description}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={isIntegrationConfigured(integration) ? 'default' : 'secondary'}>
                    {isIntegrationConfigured(integration) ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Configurado
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Pendiente
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Documentation Link */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">¿Necesitás ayuda?</p>
                    <p className="text-sm text-muted-foreground">
                      Consultá la documentación oficial para obtener tus credenciales
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver Docs
                    </a>
                  </Button>
                </div>

                {/* Fields */}
                <div className="space-y-4">
                  {integration.fields.map(field => (
                    <div key={field.key as string} className="space-y-2">
                      <Label htmlFor={field.key as string}>
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      <div className="relative">
                        <Input
                          id={field.key as string}
                          type={field.type === 'password' && !showPasswords[field.key as string] ? 'password' : 'text'}
                          placeholder={field.placeholder}
                          value={formData[field.key as string] || ''}
                          onChange={(e) => handleFieldChange(field.key as string, e.target.value)}
                          disabled={!canEdit}
                          className="pr-10"
                        />
                        {field.type === 'password' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => togglePassword(field.key as string)}
                          >
                            {showPasswords[field.key as string] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Save Button */}
                {canEdit && (
                  <Button 
                    onClick={() => saveIntegration(integration)}
                    disabled={saving === integration.key}
                    className="w-full"
                  >
                    {saving === integration.key ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      'Guardar Configuración'
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
