import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { FileText, Upload, CheckCircle, AlertCircle, Clock, Camera, User } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface RegulationSignaturesPanelProps {
  branchId: string;
}

interface TeamMemberSignature {
  user_id: string;
  full_name: string;
  local_role: string;
  signature: {
    id: string;
    signed_at: string;
    signed_document_url: string | null;
  } | null;
}

export default function RegulationSignaturesPanel({ branchId }: RegulationSignaturesPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploadingFor, setUploadingFor] = useState<TeamMemberSignature | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch latest regulation
  const { data: latestRegulation } = useQuery({
    queryKey: ['latest-regulation'],
    queryFn: async () => {
      const { data } = await supabase
        .from('regulations')
        .select('*')
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Fetch team members with their signature status
  const { data: teamSignatures = [], isLoading } = useQuery({
    queryKey: ['team-regulation-signatures', branchId, latestRegulation?.version],
    queryFn: async () => {
      if (!latestRegulation) return [];

      // Get team members for this branch
      const { data: roles } = await supabase
        .from('user_roles_v2')
        .select('user_id, local_role')
        .contains('branch_ids', [branchId])
        .eq('is_active', true)
        .not('local_role', 'is', null);

      if (!roles?.length) return [];

      const userIds = roles.map(r => r.user_id);

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      // Get signatures for latest regulation
      const { data: signatures } = await supabase
        .from('regulation_signatures')
        .select('*')
        .eq('regulation_id', latestRegulation.id)
        .in('user_id', userIds);

      // Merge data
      const signaturesMap = new Map(signatures?.map(s => [s.user_id, s]));
      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]));

      return roles.map(role => ({
        user_id: role.user_id,
        full_name: profilesMap.get(role.user_id)?.full_name || 'Sin nombre',
        local_role: role.local_role,
        signature: signaturesMap.get(role.user_id) || null,
      })) as TeamMemberSignature[];
    },
    enabled: !!latestRegulation,
  });

  const handleUploadSignature = async () => {
    if (!uploadingFor || !selectedFile || !user || !latestRegulation) return;
    
    setUploading(true);
    try {
      // Upload file
      const filePath = `${uploadingFor.user_id}/${latestRegulation.version}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('regulation-signatures')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Create signature record
      const { error: insertError } = await supabase
        .from('regulation_signatures')
        .insert([{
          user_id: uploadingFor.user_id,
          regulation_id: latestRegulation.id,
          regulation_version: latestRegulation.version,
          signed_document_url: filePath,
          signed_at: new Date().toISOString(),
          uploaded_by: user.id,
          branch_id: branchId,
        }]);

      if (insertError) throw insertError;

      toast.success(`Firma de ${uploadingFor.full_name} registrada correctamente`);
      queryClient.invalidateQueries({ queryKey: ['team-regulation-signatures'] });
      setUploadingFor(null);
      setSelectedFile(null);
    } catch (error: any) {
      toast.error('Error al subir la firma: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  if (!latestRegulation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Firmas de Reglamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No hay reglamento activo. El superadmin debe subir uno desde Mi Marca.
          </p>
        </CardContent>
      </Card>
    );
  }

  const daysSincePublished = latestRegulation.published_at 
    ? differenceInDays(new Date(), new Date(latestRegulation.published_at))
    : 0;

  const pendingSignatures = teamSignatures.filter(m => !m.signature);
  const signedCount = teamSignatures.length - pendingSignatures.length;

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      franquiciado: 'Franquiciado',
      encargado: 'Encargado',
      contador_local: 'Contador',
      cajero: 'Cajero',
      empleado: 'Empleado',
    };
    return labels[role] || role;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Firmas de Reglamento
              </CardTitle>
              <CardDescription>
                Versión {latestRegulation.version}: {latestRegulation.title}
              </CardDescription>
            </div>
            <Badge variant={pendingSignatures.length > 0 ? 'secondary' : 'outline'}>
              {signedCount}/{teamSignatures.length} firmados
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Alert for pending signatures */}
          {pendingSignatures.length > 0 && (
            <div className={`p-3 rounded-lg flex items-start gap-2 ${daysSincePublished > 5 ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">
                  {pendingSignatures.length} empleado{pendingSignatures.length !== 1 ? 's' : ''} sin firmar
                </p>
                <p className="text-sm">
                  {daysSincePublished > 5 
                    ? 'El plazo de 5 días ha vencido. Los empleados sin firma no podrán fichar.'
                    : `Quedan ${5 - daysSincePublished} día${5 - daysSincePublished !== 1 ? 's' : ''} de plazo.`
                  }
                </p>
              </div>
            </div>
          )}

          {/* Team list */}
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {teamSignatures.map((member) => (
                <div 
                  key={member.user_id} 
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    member.signature ? 'bg-green-50/50 border-green-200' : 'bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      member.signature ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'
                    }`}>
                      {member.signature ? <CheckCircle className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{member.full_name}</p>
                      <p className="text-xs text-muted-foreground">{getRoleLabel(member.local_role)}</p>
                    </div>
                  </div>

                  {member.signature ? (
                    <div className="text-right">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Firmado
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(member.signature.signed_at), 'd/MM/yyyy')}
                      </p>
                    </div>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setUploadingFor(member)}
                    >
                      <Camera className="w-4 h-4 mr-1" />
                      Subir firma
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={!!uploadingFor} onOpenChange={(open) => !open && setUploadingFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir firma de {uploadingFor?.full_name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Subí una foto del reglamento firmado físicamente por el empleado.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="signature-file">Foto del documento firmado</Label>
              <Input
                id="signature-file"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>

            {selectedFile && (
              <div className="p-2 bg-muted rounded text-sm">
                📎 {selectedFile.name}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadingFor(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUploadSignature} 
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Confirmar firma
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
