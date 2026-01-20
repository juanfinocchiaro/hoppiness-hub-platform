import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Shield, RefreshCw, Save, Building2, Landmark,
  ShoppingCart, Utensils, DollarSign, Truck, Package, Users, 
  Settings, BarChart3, CheckCircle2, Search, Plus
} from 'lucide-react';
import { toast } from 'sonner';

interface PermissionDefinition {
  id: string;
  key: string;
  name: string;
  description: string | null;
  module: string;
  scope: 'local' | 'brand';
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface TemplatePermission {
  template_id: string;
  permission_key: string;
}

const moduleIcons: Record<string, React.ReactNode> = {
  orders: <ShoppingCart className="h-4 w-4" />,
  pos: <DollarSign className="h-4 w-4" />,
  kds: <Utensils className="h-4 w-4" />,
  cash: <DollarSign className="h-4 w-4" />,
  finance: <BarChart3 className="h-4 w-4" />,
  suppliers: <Truck className="h-4 w-4" />,
  inventory: <Package className="h-4 w-4" />,
  hr: <Users className="h-4 w-4" />,
  config: <Settings className="h-4 w-4" />,
  reports: <BarChart3 className="h-4 w-4" />,
  users: <Users className="h-4 w-4" />,
};

const moduleLabels: Record<string, string> = {
  orders: 'Pedidos',
  pos: 'Punto de Venta',
  kds: 'Cocina (KDS)',
  cash: 'Caja',
  finance: 'Finanzas',
  suppliers: 'Proveedores',
  inventory: 'Inventario & Menú',
  hr: 'Recursos Humanos',
  config: 'Configuración',
  reports: 'Reportes',
  users: 'Usuarios',
};

const moduleOrder = ['pos', 'orders', 'kds', 'cash', 'inventory', 'finance', 'hr', 'suppliers', 'config', 'reports', 'users'];

export default function RoleTemplates() {
  const { isAdmin } = useUserRole();
  
  const [permissionDefinitions, setPermissionDefinitions] = useState<PermissionDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeScope, setActiveScope] = useState<'local' | 'brand'>('local');
  const [permissionSearch, setPermissionSearch] = useState('');
  const [showKeys, setShowKeys] = useState(false);
  
  // Local templates
  const [localTemplates, setLocalTemplates] = useState<Template[]>([]);
  const [localTemplatePerms, setLocalTemplatePerms] = useState<TemplatePermission[]>([]);
  const [selectedLocalTemplate, setSelectedLocalTemplate] = useState<string>('');
  const [workingLocalPerms, setWorkingLocalPerms] = useState<Set<string>>(new Set());
  const [originalLocalPerms, setOriginalLocalPerms] = useState<Set<string>>(new Set());
  
  // Brand templates
  const [brandTemplates, setBrandTemplates] = useState<Template[]>([]);
  const [brandTemplatePerms, setBrandTemplatePerms] = useState<TemplatePermission[]>([]);
  const [selectedBrandTemplate, setSelectedBrandTemplate] = useState<string>('');
  const [workingBrandPerms, setWorkingBrandPerms] = useState<Set<string>>(new Set());
  const [originalBrandPerms, setOriginalBrandPerms] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: definitions },
        { data: localTemps },
        { data: localPerms },
        { data: brandTemps },
        { data: brandPerms },
      ] = await Promise.all([
        supabase.from('permission_definitions').select('id, key, name, description, module, scope').order('module, key'),
        supabase.from('local_templates').select('*').eq('is_active', true).order('name'),
        supabase.from('local_template_permissions').select('template_id, permission_key'),
        supabase.from('brand_templates').select('*').eq('is_active', true).order('name'),
        supabase.from('brand_template_permissions').select('template_id, permission_key'),
      ]);
      
      setPermissionDefinitions((definitions || []) as PermissionDefinition[]);
      setLocalTemplates(localTemps || []);
      setLocalTemplatePerms(localPerms || []);
      setBrandTemplates(brandTemps || []);
      setBrandTemplatePerms(brandPerms || []);
      
      // Select first template
      if (localTemps && localTemps.length > 0) {
        setSelectedLocalTemplate(localTemps[0].id);
      }
      if (brandTemps && brandTemps.length > 0) {
        setSelectedBrandTemplate(brandTemps[0].id);
      }
    } catch (error: any) {
      toast.error('Error al cargar datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update working permissions when local template changes
  useEffect(() => {
    if (selectedLocalTemplate) {
      const perms = localTemplatePerms
        .filter(p => p.template_id === selectedLocalTemplate)
        .map(p => p.permission_key);
      const permSet = new Set(perms);
      setWorkingLocalPerms(permSet);
      setOriginalLocalPerms(new Set(permSet));
    }
  }, [selectedLocalTemplate, localTemplatePerms]);

  // Update working permissions when brand template changes
  useEffect(() => {
    if (selectedBrandTemplate) {
      const perms = brandTemplatePerms
        .filter(p => p.template_id === selectedBrandTemplate)
        .map(p => p.permission_key);
      const permSet = new Set(perms);
      setWorkingBrandPerms(permSet);
      setOriginalBrandPerms(new Set(permSet));
    }
  }, [selectedBrandTemplate, brandTemplatePerms]);

  // Filtered permissions by scope
  const localPermissions = useMemo(() => {
    return permissionDefinitions.filter(p => p.scope === 'local');
  }, [permissionDefinitions]);

  const brandPermissions = useMemo(() => {
    return permissionDefinitions.filter(p => p.scope === 'brand');
  }, [permissionDefinitions]);

  // Group permissions by module with search filter
  const getPermissionsByModule = (permissions: PermissionDefinition[], searchTerm: string) => {
    const grouped: Record<string, PermissionDefinition[]> = {};
    const searchLower = searchTerm.toLowerCase();
    
    permissions.forEach(perm => {
      if (searchTerm) {
        const matchesSearch = 
          perm.name.toLowerCase().includes(searchLower) ||
          perm.key.toLowerCase().includes(searchLower) ||
          (perm.description?.toLowerCase().includes(searchLower));
        if (!matchesSearch) return;
      }
      
      if (!grouped[perm.module]) {
        grouped[perm.module] = [];
      }
      grouped[perm.module].push(perm);
    });
    
    const sorted: Record<string, PermissionDefinition[]> = {};
    moduleOrder.forEach(mod => {
      if (grouped[mod]) sorted[mod] = grouped[mod];
    });
    Object.keys(grouped).forEach(mod => {
      if (!sorted[mod]) sorted[mod] = grouped[mod];
    });
    
    return sorted;
  };

  const localPermsByModule = useMemo(() => 
    getPermissionsByModule(localPermissions, permissionSearch),
    [localPermissions, permissionSearch]
  );

  const brandPermsByModule = useMemo(() => 
    getPermissionsByModule(brandPermissions, permissionSearch),
    [brandPermissions, permissionSearch]
  );

  const hasLocalChanges = useMemo(() => {
    if (workingLocalPerms.size !== originalLocalPerms.size) return true;
    for (const perm of workingLocalPerms) {
      if (!originalLocalPerms.has(perm)) return true;
    }
    return false;
  }, [workingLocalPerms, originalLocalPerms]);

  const hasBrandChanges = useMemo(() => {
    if (workingBrandPerms.size !== originalBrandPerms.size) return true;
    for (const perm of workingBrandPerms) {
      if (!originalBrandPerms.has(perm)) return true;
    }
    return false;
  }, [workingBrandPerms, originalBrandPerms]);

  const toggleLocalPermission = (key: string) => {
    setWorkingLocalPerms(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleBrandPermission = (key: string) => {
    setWorkingBrandPerms(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleModuleAll = (module: string, enable: boolean, scope: 'local' | 'brand') => {
    const permsByModule = scope === 'local' ? localPermsByModule : brandPermsByModule;
    const modulePerms = permsByModule[module] || [];
    const setFn = scope === 'local' ? setWorkingLocalPerms : setWorkingBrandPerms;
    
    setFn(prev => {
      const next = new Set(prev);
      modulePerms.forEach(p => {
        if (enable) next.add(p.key);
        else next.delete(p.key);
      });
      return next;
    });
  };

  const saveLocalTemplate = async () => {
    if (!isAdmin || !selectedLocalTemplate) return;
    
    setSaving(true);
    try {
      await supabase
        .from('local_template_permissions')
        .delete()
        .eq('template_id', selectedLocalTemplate);

      if (workingLocalPerms.size > 0) {
        const inserts = Array.from(workingLocalPerms).map(key => ({
          template_id: selectedLocalTemplate,
          permission_key: key,
        }));

        const { error } = await supabase
          .from('local_template_permissions')
          .insert(inserts);

        if (error) throw error;
      }

      setOriginalLocalPerms(new Set(workingLocalPerms));
      toast.success('Plantilla local guardada');
      
      const { data } = await supabase.from('local_template_permissions').select('template_id, permission_key');
      setLocalTemplatePerms(data || []);
    } catch (error: any) {
      toast.error('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const saveBrandTemplate = async () => {
    if (!isAdmin || !selectedBrandTemplate) return;
    
    setSaving(true);
    try {
      await supabase
        .from('brand_template_permissions')
        .delete()
        .eq('template_id', selectedBrandTemplate);

      if (workingBrandPerms.size > 0) {
        const inserts = Array.from(workingBrandPerms).map(key => ({
          template_id: selectedBrandTemplate,
          permission_key: key,
        }));

        const { error } = await supabase
          .from('brand_template_permissions')
          .insert(inserts);

        if (error) throw error;
      }

      setOriginalBrandPerms(new Set(workingBrandPerms));
      toast.success('Plantilla marca guardada');
      
      const { data } = await supabase.from('brand_template_permissions').select('template_id, permission_key');
      setBrandTemplatePerms(data || []);
    } catch (error: any) {
      toast.error('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getModuleStats = (module: string, scope: 'local' | 'brand') => {
    const permsByModule = scope === 'local' ? localPermsByModule : brandPermsByModule;
    const workingPerms = scope === 'local' ? workingLocalPerms : workingBrandPerms;
    const modulePerms = permsByModule[module] || [];
    const granted = modulePerms.filter(p => workingPerms.has(p.key)).length;
    return { granted, total: modulePerms.length };
  };

  const selectedLocalTemplateName = localTemplates.find(t => t.id === selectedLocalTemplate)?.name || '';
  const selectedBrandTemplateName = brandTemplates.find(t => t.id === selectedBrandTemplate)?.name || '';

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold">Acceso restringido</h1>
          <p className="text-muted-foreground">Solo administradores pueden editar plantillas.</p>
        </div>
      </div>
    );
  }

  const renderPermissionList = (
    permsByModule: Record<string, PermissionDefinition[]>,
    workingPerms: Set<string>,
    togglePermission: (key: string) => void,
    scope: 'local' | 'brand'
  ) => (
    <ScrollArea className="h-[500px]">
      <Accordion type="multiple" defaultValue={moduleOrder} className="space-y-2">
        {Object.entries(permsByModule).map(([module, permissions]) => {
          const { granted, total } = getModuleStats(module, scope);
          const allGranted = granted === total && total > 0;

          return (
            <AccordionItem key={module} value={module} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 rounded-md bg-muted">
                    {moduleIcons[module] || <Package className="h-4 w-4" />}
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-medium">{moduleLabels[module] || module}</p>
                    <p className="text-xs text-muted-foreground">
                      {granted} de {total} permisos
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mr-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={allGranted}
                      onCheckedChange={(checked) => toggleModuleAll(module, !!checked, scope)}
                    />
                    <span className="text-xs text-muted-foreground">Todo</span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-4">
                  {permissions.map(perm => {
                    const isGranted = workingPerms.has(perm.key);
                    return (
                      <label
                        key={perm.key}
                        className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                          isGranted
                            ? 'bg-primary/5 border-primary/30'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <Checkbox
                          checked={isGranted}
                          onCheckedChange={() => togglePermission(perm.key)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{perm.name}</p>
                          {perm.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {perm.description}
                            </p>
                          )}
                          {showKeys && (
                            <code className="text-[10px] text-muted-foreground/70 font-mono">
                              {perm.key}
                            </code>
                          )}
                        </div>
                        {isGranted && (
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </label>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </ScrollArea>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Plantillas de Permisos
          </h1>
          <p className="text-muted-foreground">Define los permisos base que hereda cada plantilla</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Scope Tabs: Local vs Brand */}
      <Tabs value={activeScope} onValueChange={(v) => setActiveScope(v as 'local' | 'brand')}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="local" className="gap-2">
            <Building2 className="h-4 w-4" />
            Plantillas Local
            <Badge variant="secondary">{localTemplates.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="brand" className="gap-2">
            <Landmark className="h-4 w-4" />
            Plantillas Marca
            <Badge variant="secondary">{brandTemplates.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* LOCAL TEMPLATES */}
        <TabsContent value="local" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Plantillas de Panel Local
                  </CardTitle>
                  <CardDescription>
                    Permisos para operación de sucursal (scope = local)
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <Select value={selectedLocalTemplate} onValueChange={setSelectedLocalTemplate}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Seleccionar plantilla" />
                    </SelectTrigger>
                    <SelectContent>
                      {localTemplates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {hasLocalChanges && (
                    <Button onClick={saveLocalTemplate} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Controls */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar permisos..."
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="show-keys-local" checked={showKeys} onCheckedChange={setShowKeys} />
                  <Label htmlFor="show-keys-local" className="text-sm">Mostrar keys</Label>
                </div>
                <Badge variant="outline">{workingLocalPerms.size} permisos</Badge>
              </div>

              {renderPermissionList(localPermsByModule, workingLocalPerms, toggleLocalPermission, 'local')}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BRAND TEMPLATES */}
        <TabsContent value="brand" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Landmark className="h-5 w-5" />
                    Plantillas de Panel Marca
                  </CardTitle>
                  <CardDescription>
                    Permisos para gestión a nivel marca (scope = brand)
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <Select value={selectedBrandTemplate} onValueChange={setSelectedBrandTemplate}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Seleccionar plantilla" />
                    </SelectTrigger>
                    <SelectContent>
                      {brandTemplates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {hasBrandChanges && (
                    <Button onClick={saveBrandTemplate} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Controls */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar permisos..."
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="show-keys-brand" checked={showKeys} onCheckedChange={setShowKeys} />
                  <Label htmlFor="show-keys-brand" className="text-sm">Mostrar keys</Label>
                </div>
                <Badge variant="outline">{workingBrandPerms.size} permisos</Badge>
              </div>

              {renderPermissionList(brandPermsByModule, workingBrandPerms, toggleBrandPermission, 'brand')}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
