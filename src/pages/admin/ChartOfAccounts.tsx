/**
 * ChartOfAccounts - Plan de Cuentas Contable (COA)
 * UI para gestionar el árbol jerárquico de cuentas
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { toast } from 'sonner';
import { 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  Pencil,
  Trash2,
  FolderTree,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank
} from 'lucide-react';

interface COAAccount {
  id: string;
  code: string;
  name: string;
  parent_id: string | null;
  account_type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  level: number;
  is_active: boolean;
  display_order: number;
  children?: COAAccount[];
}

const ACCOUNT_TYPES = [
  { value: 'asset', label: 'Activo', icon: Wallet, color: 'text-blue-600' },
  { value: 'liability', label: 'Pasivo', icon: TrendingDown, color: 'text-red-600' },
  { value: 'equity', label: 'Patrimonio', icon: PiggyBank, color: 'text-purple-600' },
  { value: 'income', label: 'Ingreso', icon: TrendingUp, color: 'text-green-600' },
  { value: 'expense', label: 'Gasto', icon: DollarSign, color: 'text-orange-600' },
];

export default function ChartOfAccounts() {
  const queryClient = useQueryClient();
  
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<COAAccount | null>(null);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<string>('expense');
  const [newParentId, setNewParentId] = useState<string>('');

  // Fetch all accounts
  const { data: accounts, isLoading } = useQuery({
    queryKey: ['coa-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coa_accounts')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      return data as COAAccount[];
    },
  });

  // Build tree structure
  const buildTree = (items: COAAccount[]): COAAccount[] => {
    const map = new Map<string, COAAccount>();
    const roots: COAAccount[] = [];
    
    items.forEach(item => {
      map.set(item.id, { ...item, children: [] });
    });
    
    items.forEach(item => {
      const node = map.get(item.id)!;
      if (item.parent_id && map.has(item.parent_id)) {
        map.get(item.parent_id)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });
    
    return roots;
  };

  const accountTree = accounts ? buildTree(accounts) : [];

  // Create account mutation
  const createAccount = useMutation({
    mutationFn: async () => {
      const level = newParentId ? (accounts?.find(a => a.id === newParentId)?.level || 0) + 1 : 1;
      
      const { error } = await supabase
        .from('coa_accounts')
        .insert({
          code: newCode,
          name: newName,
          account_type: newType,
          parent_id: newParentId || null,
          level,
          is_active: true,
          display_order: parseInt(newCode.replace(/\./g, '')) || 0,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coa-accounts'] });
      toast.success('Cuenta creada');
      resetForm();
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast.error('El código ya existe');
      } else {
        toast.error('Error al crear la cuenta');
      }
    },
  });

  // Update account mutation
  const updateAccount = useMutation({
    mutationFn: async () => {
      if (!editingAccount) return;
      
      const { error } = await supabase
        .from('coa_accounts')
        .update({
          code: newCode,
          name: newName,
          account_type: newType,
        })
        .eq('id', editingAccount.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coa-accounts'] });
      toast.success('Cuenta actualizada');
      resetForm();
    },
    onError: () => {
      toast.error('Error al actualizar');
    },
  });

  // Delete account mutation
  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('coa_accounts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coa-accounts'] });
      toast.success('Cuenta eliminada');
    },
    onError: () => {
      toast.error('No se puede eliminar (tiene subcuentas o transacciones)');
    },
  });

  const resetForm = () => {
    setShowNewAccount(false);
    setEditingAccount(null);
    setNewCode('');
    setNewName('');
    setNewType('expense');
    setNewParentId('');
  };

  const handleEdit = (account: COAAccount) => {
    setEditingAccount(account);
    setNewCode(account.code);
    setNewName(account.name);
    setNewType(account.account_type);
    setShowNewAccount(true);
  };

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (accounts) {
      setExpandedNodes(new Set(accounts.map(a => a.id)));
    }
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const getTypeConfig = (type: string) => {
    return ACCOUNT_TYPES.find(t => t.value === type) || ACCOUNT_TYPES[4];
  };

  // Render tree node
  const renderNode = (node: COAAccount, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const typeConfig = getTypeConfig(node.account_type);
    const TypeIcon = typeConfig.icon;

    return (
      <div key={node.id}>
        <div 
          className={`flex items-center gap-2 py-2 px-3 hover:bg-muted/50 rounded-lg group ${
            depth === 0 ? 'font-semibold' : ''
          }`}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          {hasChildren ? (
            <button 
              onClick={() => toggleExpand(node.id)}
              className="p-0.5 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}
          
          <TypeIcon className={`h-4 w-4 ${typeConfig.color}`} />
          
          <span className="font-mono text-sm text-muted-foreground w-16">
            {node.code}
          </span>
          
          <span className={`flex-1 ${!node.is_active ? 'text-muted-foreground line-through' : ''}`}>
            {node.name}
          </span>
          
          {depth === 0 && (
            <Badge variant="outline" className="text-xs">
              {typeConfig.label}
            </Badge>
          )}
          
          <div className="opacity-0 group-hover:opacity-100 flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => handleEdit(node)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            {!hasChildren && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive"
                onClick={() => deleteAccount.mutate(node.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Get parent accounts for select
  const parentAccounts = accounts?.filter(a => a.level < 3) || [];

  if (isLoading) {
    return <HoppinessLoader fullScreen size="md" text="Cargando plan de cuentas" />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderTree className="h-6 w-6" />
            Plan de Cuentas
          </h1>
          <p className="text-muted-foreground">
            Estructura contable jerárquica para clasificación de transacciones
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expandir todo
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Colapsar todo
          </Button>
          <Button onClick={() => setShowNewAccount(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Cuenta
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {ACCOUNT_TYPES.map(type => {
          const count = accounts?.filter(a => a.account_type === type.value).length || 0;
          const TypeIcon = type.icon;
          return (
            <Card key={type.value}>
              <CardContent className="p-4 flex items-center gap-3">
                <TypeIcon className={`h-5 w-5 ${type.color}`} />
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{type.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tree View */}
      <Card>
        <CardHeader>
          <CardTitle>Estructura de Cuentas</CardTitle>
          <CardDescription>
            Hacé clic en las flechas para expandir/colapsar las subcuentas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accountTree.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderTree className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay cuentas configuradas</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowNewAccount(true)}
              >
                Crear primera cuenta
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg divide-y">
              {accountTree.map(node => renderNode(node))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New/Edit Account Dialog */}
      <Dialog open={showNewAccount} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}
            </DialogTitle>
            <DialogDescription>
              {editingAccount 
                ? 'Modificá los datos de la cuenta' 
                : 'Agregá una nueva cuenta al plan contable'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input
                  placeholder="Ej: 5.3.4"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="font-mono"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className={`h-4 w-4 ${type.color}`} />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                placeholder="Nombre de la cuenta"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            
            {!editingAccount && (
              <div className="space-y-2">
                <Label>Cuenta padre (opcional)</Label>
                <Select value={newParentId} onValueChange={setNewParentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin padre (cuenta raíz)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin padre (cuenta raíz)</SelectItem>
                    {parentAccounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        <span className="font-mono text-muted-foreground mr-2">{acc.code}</span>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button 
              onClick={() => editingAccount ? updateAccount.mutate() : createAccount.mutate()}
              disabled={!newCode || !newName || createAccount.isPending || updateAccount.isPending}
            >
              {editingAccount ? 'Guardar Cambios' : 'Crear Cuenta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
