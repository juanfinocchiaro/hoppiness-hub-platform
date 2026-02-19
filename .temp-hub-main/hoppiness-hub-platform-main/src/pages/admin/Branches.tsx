import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Plus, MapPin, Clock, Users, Trash2, Circle, ChevronRight, ChevronDown, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import BranchEditPanel from '@/components/admin/BranchEditPanel';
import BranchCreatePanel from '@/components/admin/BranchCreatePanel';

type Branch = Tables<'branches'>;

interface BranchWithStats extends Branch {
  teamCount: number;
  workingCount: number;
}

export default function Branches() {
  const [branches, setBranches] = useState<BranchWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<BranchWithStats | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Expandable row state
  const [expandedBranchId, setExpandedBranchId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchData = async () => {
    const { data: branchesData } = await supabase
      .from('branches')
      .select('*')
      .order('name');

    if (branchesData) {
      const branchesWithStats = await Promise.all(
        branchesData.map(async (branch) => {
          const [teamRes, workingRes] = await Promise.all([
            supabase
              .from('user_roles')
              .select('id', { count: 'exact', head: true })
              .eq('branch_id', branch.id)
              .eq('is_active', true),
            supabase
              .from('employees')
              .select('id', { count: 'exact', head: true })
              .eq('branch_id', branch.id)
              .eq('current_status', 'WORKING'),
          ]);

          return {
            ...branch,
            teamCount: teamRes.count || 0,
            workingCount: workingRes.count || 0,
          };
        })
      );

      setBranches(branchesWithStats);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRowClick = (branchId: string) => {
    setExpandedBranchId(prev => prev === branchId ? null : branchId);
  };

  const handleDeleteClick = (e: React.MouseEvent, branch: BranchWithStats) => {
    e.stopPropagation(); // Prevent row expansion
    setBranchToDelete(branch);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!branchToDelete) return;

    setDeleting(true);
    const { error } = await supabase
      .from('branches')
      .delete()
      .eq('id', branchToDelete.id);

    if (error) {
      toast.error('No se pudo eliminar la sucursal. Puede tener datos asociados.');
    } else {
      toast.success(`Sucursal "${branchToDelete.name}" eliminada`);
      setExpandedBranchId(null);
      fetchData();
    }

    setDeleting(false);
    setDeleteDialogOpen(false);
    setBranchToDelete(null);
  };

  const handleSaved = () => {
    fetchData();
    // Keep expanded to show saved state
  };

  const handleCancel = () => {
    setExpandedBranchId(null);
  };

  const formatTime = (time: string | null) => {
    if (!time) return '-';
    return time.substring(0, 5);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sucursales</h1>
        <p className="text-muted-foreground">Gestión de sucursales Hoppiness Club</p>
      </div>

      {/* Branches Table */}
      <Card>
        <CardHeader>
          <CardTitle>{branches.length} sucursal{branches.length !== 1 ? 'es' : ''}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Equipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch) => {
                  const isExpanded = expandedBranchId === branch.id;
                  
                  return (
                    <>
                      <TableRow 
                        key={branch.id}
                        onClick={() => handleRowClick(branch.id)}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="font-medium">{branch.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                            {(branch as any).latitude && (branch as any).longitude ? (
                              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                            ) : (
                              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            )}
                            <div>
                              <p className="line-clamp-1">{branch.address}</p>
                              <p className="text-xs">{branch.city}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {formatTime(branch.opening_time)} - {formatTime(branch.closing_time)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="gap-1">
                              <Users className="w-3 h-3" />
                              {branch.teamCount}
                            </Badge>
                            {branch.workingCount > 0 && (
                              <Badge variant="secondary" className="gap-1 text-xs">
                                <Circle className="w-2 h-2 fill-primary text-primary" />
                                {branch.workingCount}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={branch.is_active ? 'default' : 'secondary'}>
                            {branch.is_active ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => handleDeleteClick(e, branch)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded Content Row */}
                      <TableRow key={`${branch.id}-expanded`} className="hover:bg-transparent">
                        <TableCell colSpan={6} className="p-0">
                          <Collapsible open={isExpanded}>
                            <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
                              <div className="p-6 bg-muted/30 border-t">
                                <BranchEditPanel 
                                  branch={branch} 
                                  onSaved={handleSaved}
                                  onCancel={handleCancel}
                                />
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </TableCell>
                      </TableRow>
                    </>
                  );
                })}

                {/* Add New Branch Row */}
                {!isCreating ? (
                  <TableRow 
                    onClick={() => {
                      setExpandedBranchId(null);
                      setIsCreating(true);
                    }}
                    className="cursor-pointer hover:bg-muted/50 transition-colors border-dashed"
                  >
                    <TableCell colSpan={6}>
                      <div className="flex items-center gap-2 py-2 text-muted-foreground">
                        <Plus className="h-4 w-4" />
                        <span>Nueva sucursal</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    <TableRow className="bg-muted/30 border-dashed">
                      <TableCell colSpan={6}>
                        <div className="flex items-center gap-2 py-2 font-medium">
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          <span>Nueva sucursal</span>
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={6} className="p-0">
                        <div className="p-6 bg-muted/30 border-t">
                          <BranchCreatePanel
                            onCreated={() => {
                              setIsCreating(false);
                              fetchData();
                            }}
                            onCancel={() => setIsCreating(false)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  </>
                )}

                {branches.length === 0 && !isCreating && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No hay sucursales creadas
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar sucursal?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás por eliminar <strong>{branchToDelete?.name}</strong>. 
              Esta acción no se puede deshacer y eliminará todos los datos asociados 
              (pedidos, cuentas, etc).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
