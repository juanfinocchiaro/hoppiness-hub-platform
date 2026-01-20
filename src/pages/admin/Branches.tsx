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
import { Plus, Edit, MapPin, Clock, Package, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface BranchWithStats extends Branch {
  productCount: number;
  supplierCount: number;
}

export default function Branches() {
  const [branches, setBranches] = useState<BranchWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<BranchWithStats | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    const { data: branchesData } = await supabase
      .from('branches')
      .select('*')
      .order('name');

    if (branchesData) {
      const branchesWithStats = await Promise.all(
        branchesData.map(async (branch) => {
          const [productsRes, suppliersRes] = await Promise.all([
            supabase
              .from('branch_products')
              .select('id', { count: 'exact', head: true })
              .eq('branch_id', branch.id)
              .eq('is_available', true),
            supabase
              .from('branch_suppliers')
              .select('id', { count: 'exact', head: true })
              .eq('branch_id', branch.id),
          ]);

          return {
            ...branch,
            productCount: productsRes.count || 0,
            supplierCount: suppliersRes.count || 0,
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

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Auto-configuración habilitada</p>
              <p className="text-sm text-muted-foreground">
                Al crear una sucursal nueva, automáticamente se le asignan todos los productos del catálogo maestro.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  <TableHead>Horario</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Proveedores</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{branch.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {branch.address}, {branch.city}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatTime(branch.opening_time)} - {formatTime(branch.closing_time)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{branch.productCount} productos</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{branch.supplierCount} proveedores</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={branch.is_active ? 'default' : 'secondary'}>
                        {branch.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Link to={`/admin/sucursales/${branch.id}`}>
                          <Button variant="ghost" size="icon">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
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
              (productos, proveedores, pedidos, etc).
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
