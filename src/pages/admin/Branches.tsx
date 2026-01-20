import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { Plus, Edit, MapPin, Clock, Users, Trash2, Circle } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import BranchEditDrawer from '@/components/admin/BranchEditDrawer';

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
  
  // Drawer state
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

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

  const handleEditClick = (branch: BranchWithStats) => {
    setSelectedBranch(branch);
    setEditDrawerOpen(true);
  };

  const handleDeleteClick = (branch: BranchWithStats) => {
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
      fetchData();
    }

    setDeleting(false);
    setDeleteDialogOpen(false);
    setBranchToDelete(null);
  };

  const formatTime = (time: string | null) => {
    if (!time) return '-';
    return time.substring(0, 5);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sucursales</h1>
          <p className="text-muted-foreground">Gestión de sucursales Hoppiness Club</p>
        </div>
        <Link to="/admin/sucursales/nueva">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Sucursal
          </Button>
        </Link>
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
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell>
                      <p className="font-medium">{branch.name}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <div>
                          <p>{branch.address}</p>
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
                            {branch.workingCount} activos
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={branch.is_active ? 'default' : 'secondary'}>
                        {branch.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEditClick(branch)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteClick(branch)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {branches.length === 0 && (
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

      {/* Edit Drawer */}
      <BranchEditDrawer
        branch={selectedBranch}
        open={editDrawerOpen}
        onOpenChange={setEditDrawerOpen}
        onSaved={fetchData}
      />

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
