import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  MessageSquare,
  Mail,
  Phone,
  Search,
  ArrowLeft,
  Copy,
  ExternalLink,
  Paperclip,
  Building,
  MapPin,
  DollarSign,
  Briefcase,
  AlertCircle,
  Check,
  FileText,
  RefreshCw
} from 'lucide-react';

type SubjectType = 'franquicia' | 'empleo' | 'pedidos' | 'consulta' | 'otro';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: SubjectType;
  message: string | null;
  franchise_has_zone: string | null;
  franchise_has_location: string | null;
  franchise_investment_capital: string | null;
  employment_branch_id: string | null;
  employment_position: string | null;
  employment_cv_link: string | null;
  employment_motivation: string | null;
  order_branch_id: string | null;
  order_number: string | null;
  order_date: string | null;
  order_issue: string | null;
  status: string;
  priority: string;
  notes: string | null;
  created_at: string;
  read_at: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  employment_branch?: { name: string } | null;
  order_branch?: { name: string } | null;
}

const subjectLabels: Record<SubjectType, string> = {
  franquicia: 'Franquicia',
  empleo: 'Empleo',
  pedidos: 'Pedidos',
  consulta: 'Consulta',
  otro: 'Otro'
};

const subjectColors: Record<SubjectType, string> = {
  franquicia: 'bg-amber-500',
  empleo: 'bg-blue-500',
  pedidos: 'bg-red-500',
  consulta: 'bg-green-500',
  otro: 'bg-gray-500'
};

const zoneLabels: Record<string, string> = {
  'tengo_ubicacion': 'Sí, ya tengo ubicación',
  'algunas_opciones': 'Tengo algunas opciones',
  'buscando': 'No, estoy buscando',
  'asesoren': 'Prefiero que me asesoren'
};

const locationLabels: Record<string, string> = {
  'local_propio': 'Sí, tengo local propio',
  'local_alquilado': 'Sí, tengo local alquilado',
  'buscando': 'No, pero estoy buscando',
  'necesito_ayuda': 'No, necesito ayuda para encontrar'
};

const capitalLabels: Record<string, string> = {
  'menos_30k': 'Menos de $30.000 USD',
  '30k_50k': '$30.000 - $50.000 USD',
  '50k_80k': '$50.000 - $80.000 USD',
  'mas_80k': 'Más de $80.000 USD',
  'no_decir': 'Prefiero no decir'
};

const positionLabels: Record<string, string> = {
  'cocina': 'Cocina',
  'caja': 'Caja / Atención',
  'delivery': 'Delivery',
  'encargado': 'Encargado',
  'otro': 'Otro'
};

export default function Messages() {
  const [selectedTab, setSelectedTab] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [internalNotes, setInternalNotes] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages, isLoading, refetch } = useQuery({
    queryKey: ['contact-messages', selectedTab, statusFilter, searchQuery],
    queryFn: async () => {
      // First get messages
      let query = supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedTab !== 'all') {
        query = query.eq('subject', selectedTab);
      }

      if (statusFilter === 'unread') {
        query = query.is('read_at', null);
      } else if (statusFilter === 'read') {
        query = query.not('read_at', 'is', null);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch branch names separately
      const branchIds = new Set<string>();
      data?.forEach(m => {
        if (m.employment_branch_id) branchIds.add(m.employment_branch_id);
        if (m.order_branch_id) branchIds.add(m.order_branch_id);
      });

      let branchMap = new Map<string, string>();
      if (branchIds.size > 0) {
        const { data: branches } = await supabase
          .from('branches')
          .select('id, name')
          .in('id', Array.from(branchIds));
        branches?.forEach(b => branchMap.set(b.id, b.name));
      }

      // Map messages with branch names
      const messagesWithBranches = data?.map(m => ({
        ...m,
        employment_branch: m.employment_branch_id ? { name: branchMap.get(m.employment_branch_id) || 'Desconocido' } : null,
        order_branch: m.order_branch_id ? { name: branchMap.get(m.order_branch_id) || 'Desconocido' } : null,
      })) as ContactMessage[];

      // Filter by search query client-side
      if (searchQuery) {
        const lowerSearch = searchQuery.toLowerCase();
        return messagesWithBranches.filter(m => 
          m.name.toLowerCase().includes(lowerSearch) ||
          m.email.toLowerCase().includes(lowerSearch) ||
          m.phone?.toLowerCase().includes(lowerSearch)
        );
      }

      return messagesWithBranches;
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('contact_messages')
        .update({ read_at: new Date().toISOString(), status: 'read' })
        .eq('id', messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
    }
  });

  const markAsUnreadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('contact_messages')
        .update({ read_at: null, status: 'pending' })
        .eq('id', messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
      setSelectedMessage(null);
      toast({ title: 'Marcado como no leído' });
    }
  });

  const saveNotesMutation = useMutation({
    mutationFn: async ({ messageId, notes }: { messageId: string; notes: string }) => {
      const { error } = await supabase
        .from('contact_messages')
        .update({ notes })
        .eq('id', messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
      toast({ title: 'Nota guardada' });
    }
  });

  const handleSelectMessage = (message: ContactMessage) => {
    setSelectedMessage(message);
    setInternalNotes(message.notes || '');
    if (!message.read_at) {
      markAsReadMutation.mutate(message.id);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado al portapapeles' });
  };

  const formatPhoneForWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.startsWith('54') ? cleaned : `54${cleaned}`;
  };

  const getSubjectCounts = () => {
    if (!messages) return {};
    return messages.reduce((acc, m) => {
      acc[m.subject] = (acc[m.subject] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  const subjectCounts = getSubjectCounts();
  const unreadCount = messages?.filter(m => !m.read_at).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="w-8 h-8" />
            Mensajes de Contacto
          </h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} mensaje(s) sin leer` : 'Todos los mensajes leídos'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">
                  Todos ({messages?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="franquicia">
                  Franquicias ({subjectCounts['franquicia'] || 0})
                </TabsTrigger>
                <TabsTrigger value="empleo">
                  Empleo ({subjectCounts['empleo'] || 0})
                </TabsTrigger>
                <TabsTrigger value="pedidos">
                  Pedidos ({subjectCounts['pedidos'] || 0})
                </TabsTrigger>
                <TabsTrigger value="consulta">
                  General ({(subjectCounts['consulta'] || 0) + (subjectCounts['otro'] || 0)})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="unread">No leídos</SelectItem>
                  <SelectItem value="read">Leídos</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : messages?.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay mensajes</p>
            </div>
          ) : (
            <div className="divide-y">
              {messages?.map(message => (
                <div
                  key={message.id}
                  onClick={() => handleSelectMessage(message)}
                  className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                    !message.read_at ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <div className={`w-3 h-3 rounded-full ${subjectColors[message.subject]}`} />
                      {!message.read_at && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {subjectLabels[message.subject]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: es })}
                        </span>
                        {message.attachment_url && (
                          <Paperclip className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                      
                      <div className="font-medium">{message.name}</div>
                      <div className="text-sm text-muted-foreground">{message.email}</div>
                      
                      {message.subject === 'franquicia' && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Zona: {message.franchise_has_zone ? 'Sí' : 'No definido'} · 
                          Local: {message.franchise_has_location ? 'Sí' : 'No definido'} · 
                          Capital: {capitalLabels[message.franchise_investment_capital || ''] || 'No definido'}
                        </div>
                      )}
                      
                      {message.subject === 'empleo' && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Local: {message.employment_branch?.name || 'Cualquiera'} · 
                          Puesto: {positionLabels[message.employment_position || ''] || 'No especificado'}
                        </div>
                      )}
                      
                      {message.subject === 'pedidos' && (
                        <div className="text-sm text-muted-foreground mt-1 truncate">
                          {message.order_branch?.name} · #{message.order_number || 'Sin número'} · 
                          "{message.order_issue?.substring(0, 50)}..."
                        </div>
                      )}
                      
                      {(message.subject === 'consulta' || message.subject === 'otro') && message.message && (
                        <div className="text-sm text-muted-foreground mt-1 truncate">
                          "{message.message.substring(0, 80)}..."
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Detail Sheet */}
      <Sheet open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedMessage && (
            <>
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedMessage(null)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => markAsUnreadMutation.mutate(selectedMessage.id)}
                  >
                    Marcar no leído
                  </Button>
                </div>
                <SheetTitle className="flex items-center gap-2 mt-4">
                  <div className={`w-3 h-3 rounded-full ${subjectColors[selectedMessage.subject]}`} />
                  {subjectLabels[selectedMessage.subject]}
                  <span className="text-sm font-normal text-muted-foreground">
                    · Recibido {formatDistanceToNow(new Date(selectedMessage.created_at), { addSuffix: true, locale: es })}
                  </span>
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Contact Info */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">
                          {selectedMessage.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-semibold text-lg">{selectedMessage.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedMessage.email}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(selectedMessage.email)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                    <a href={`mailto:${selectedMessage.email}`}>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </a>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedMessage.phone}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(selectedMessage.phone)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                    <a href={`https://wa.me/${formatPhoneForWhatsApp(selectedMessage.phone)}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="h-6 text-xs text-green-600">
                        WhatsApp
                      </Button>
                    </a>
                  </div>
                </div>

                <hr />

                {/* Subject-specific details */}
                {selectedMessage.subject === 'franquicia' && (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">¿Tiene zona en mente?</p>
                        <p className="font-medium">{zoneLabels[selectedMessage.franchise_has_zone || ''] || 'No especificado'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Building className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">¿Tiene local disponible?</p>
                        <p className="font-medium">{locationLabels[selectedMessage.franchise_has_location || ''] || 'No especificado'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <DollarSign className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Capital disponible</p>
                        <p className="font-medium">{capitalLabels[selectedMessage.franchise_investment_capital || ''] || 'No especificado'}</p>
                      </div>
                    </div>

                    {selectedMessage.message && (
                      <div className="flex items-start gap-3">
                        <MessageSquare className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Comentarios</p>
                          <p className="mt-1">{selectedMessage.message}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedMessage.subject === 'empleo' && (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Building className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Local de interés</p>
                        <p className="font-medium">{selectedMessage.employment_branch?.name || 'Cualquiera'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Briefcase className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Puesto de interés</p>
                        <p className="font-medium">{positionLabels[selectedMessage.employment_position || ''] || 'No especificado'}</p>
                      </div>
                    </div>

                    {selectedMessage.attachment_url && (
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">CV Adjunto</p>
                          <a 
                            href={selectedMessage.attachment_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-primary hover:underline"
                          >
                            <Paperclip className="w-4 h-4" />
                            {selectedMessage.attachment_name || 'Descargar CV'}
                          </a>
                        </div>
                      </div>
                    )}

                    {selectedMessage.employment_cv_link && (
                      <div className="flex items-start gap-3">
                        <ExternalLink className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">LinkedIn / CV Online</p>
                          <a 
                            href={selectedMessage.employment_cv_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {selectedMessage.employment_cv_link}
                          </a>
                        </div>
                      </div>
                    )}

                    {selectedMessage.employment_motivation && (
                      <div className="flex items-start gap-3">
                        <MessageSquare className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Motivación</p>
                          <p className="mt-1">{selectedMessage.employment_motivation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedMessage.subject === 'pedidos' && (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Building className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Local del pedido</p>
                        <p className="font-medium">{selectedMessage.order_branch?.name || 'No especificado'}</p>
                      </div>
                    </div>

                    {selectedMessage.order_number && (
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Número de pedido</p>
                          <p className="font-medium">#{selectedMessage.order_number}</p>
                        </div>
                      </div>
                    )}

                    {selectedMessage.order_date && (
                      <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Fecha del pedido</p>
                          <p className="font-medium">{new Date(selectedMessage.order_date).toLocaleDateString('es-AR')}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Descripción del problema</p>
                        <p className="mt-1">{selectedMessage.order_issue}</p>
                      </div>
                    </div>
                  </div>
                )}

                {(selectedMessage.subject === 'consulta' || selectedMessage.subject === 'otro') && (
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Mensaje</p>
                      <p className="mt-1">{selectedMessage.message}</p>
                    </div>
                  </div>
                )}

                <hr />

                {/* Internal Notes */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Notas internas</p>
                  </div>
                  <Textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Agregar notas internas sobre este contacto..."
                    rows={4}
                  />
                  <Button 
                    onClick={() => saveNotesMutation.mutate({ messageId: selectedMessage.id, notes: internalNotes })}
                    disabled={saveNotesMutation.isPending}
                    size="sm"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Guardar nota
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
