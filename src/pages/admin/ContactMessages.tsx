/**
 * ContactMessages - Gestión de mensajes de contacto del sitio web
 * Panel Mi Marca
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageSquare, Mail, Phone, Calendar, User, Briefcase, 
  Building, ShoppingBag, CheckCircle, Clock, Eye, Reply, 
  Download, ExternalLink 
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string | null;
  employment_branch_id: string | null;
  employment_position: string | null;
  employment_cv_link: string | null;
  employment_motivation: string | null;
  order_branch_id: string | null;
  order_number: string | null;
  order_date: string | null;
  order_issue: string | null;
  franchise_has_zone: string | null;
  franchise_has_location: string | null;
  franchise_investment_capital: string | null;
  status: string | null;
  priority: string | null;
  notes: string | null;
  created_at: string;
  read_at: string | null;
  replied_at: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
}

type MessageCategory = 'all' | 'general' | 'empleo' | 'franquicias' | 'pedidos';

export default function ContactMessages() {
  const queryClient = useQueryClient();
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [replyNotes, setReplyNotes] = useState('');
  const [category, setCategory] = useState<MessageCategory>('all');

  // Fetch messages
  const { data: messages, isLoading } = useQuery({
    queryKey: ['contact-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ContactMessage[];
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contact_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-contact-messages'] });
    },
  });

  // Mark as replied mutation
  const markAsRepliedMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from('contact_messages')
        .update({ 
          replied_at: new Date().toISOString(),
          notes,
          status: 'replied'
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
      toast.success('Mensaje marcado como respondido');
      setSelectedMessage(null);
      setReplyNotes('');
    },
  });

  // Determine message category
  const getMessageCategory = (msg: ContactMessage): MessageCategory => {
    if (msg.employment_position) return 'empleo';
    if (msg.franchise_investment_capital !== null) return 'franquicias';
    if (msg.order_issue) return 'pedidos';
    return 'general';
  };

  // Filter messages
  const filteredMessages = messages?.filter(msg => {
    if (category === 'all') return true;
    return getMessageCategory(msg) === category;
  });

  // Count by category
  const counts = {
    all: messages?.length || 0,
    general: messages?.filter(m => getMessageCategory(m) === 'general').length || 0,
    empleo: messages?.filter(m => getMessageCategory(m) === 'empleo').length || 0,
    franquicias: messages?.filter(m => getMessageCategory(m) === 'franquicias').length || 0,
    pedidos: messages?.filter(m => getMessageCategory(m) === 'pedidos').length || 0,
  };

  const unreadCount = messages?.filter(m => !m.read_at).length || 0;

  const getCategoryIcon = (cat: MessageCategory) => {
    switch (cat) {
      case 'empleo': return <Briefcase className="w-4 h-4" />;
      case 'franquicias': return <Building className="w-4 h-4" />;
      case 'pedidos': return <ShoppingBag className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getCategoryLabel = (cat: MessageCategory) => {
    switch (cat) {
      case 'empleo': return 'Empleo';
      case 'franquicias': return 'Franquicias';
      case 'pedidos': return 'Pedidos';
      case 'general': return 'General';
      default: return 'Todos';
    }
  };

  const handleOpenMessage = (msg: ContactMessage) => {
    setSelectedMessage(msg);
    if (!msg.read_at) {
      markAsReadMutation.mutate(msg.id);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6" />
          Mensajes de Contacto
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} sin leer</Badge>
          )}
        </h1>
        <p className="text-muted-foreground">
          Consultas recibidas desde el formulario de contacto del sitio web
        </p>
      </div>

      <Tabs value={category} onValueChange={(v) => setCategory(v as MessageCategory)}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Todos ({counts.all})
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2">
            General ({counts.general})
          </TabsTrigger>
          <TabsTrigger value="empleo" className="gap-2">
            <Briefcase className="w-4 h-4" />
            Empleo ({counts.empleo})
          </TabsTrigger>
          <TabsTrigger value="franquicias" className="gap-2">
            <Building className="w-4 h-4" />
            Franquicias ({counts.franquicias})
          </TabsTrigger>
          <TabsTrigger value="pedidos" className="gap-2">
            <ShoppingBag className="w-4 h-4" />
            Pedidos ({counts.pedidos})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={category} className="mt-4">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredMessages?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay mensajes en esta categoría</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estado</TableHead>
                      <TableHead>Remitente</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Asunto</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMessages?.map((msg) => (
                      <TableRow 
                        key={msg.id} 
                        className={!msg.read_at ? 'bg-primary/5 font-medium' : ''}
                      >
                        <TableCell>
                          {msg.replied_at ? (
                            <Badge variant="outline" className="gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Respondido
                            </Badge>
                          ) : msg.read_at ? (
                            <Badge variant="secondary" className="gap-1">
                              <Eye className="w-3 h-3" />
                              Leído
                            </Badge>
                          ) : (
                            <Badge variant="default" className="gap-1">
                              <Clock className="w-3 h-3" />
                              Nuevo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{msg.name}</p>
                            <p className="text-xs text-muted-foreground">{msg.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(getMessageCategory(msg))}
                            {getCategoryLabel(getMessageCategory(msg))}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {msg.subject || msg.employment_position || msg.order_issue || 'Sin asunto'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(msg.created_at), 'd MMM yyyy HH:mm', { locale: es })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleOpenMessage(msg)}
                          >
                            Ver detalle
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Message Detail Sheet */}
      <Sheet open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedMessage && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {getCategoryIcon(getMessageCategory(selectedMessage))}
                  {getCategoryLabel(getMessageCategory(selectedMessage))}
                </SheetTitle>
                <SheetDescription>
                  Recibido el {format(new Date(selectedMessage.created_at), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Contact Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Datos de contacto</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedMessage.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <a href={`mailto:${selectedMessage.email}`} className="text-primary hover:underline">
                        {selectedMessage.email}
                      </a>
                    </div>
                    {selectedMessage.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <a href={`tel:${selectedMessage.phone}`} className="text-primary hover:underline">
                          {selectedMessage.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Employment Details */}
                {getMessageCategory(selectedMessage) === 'empleo' && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">Postulación</h4>
                    <div className="p-3 bg-muted rounded-lg space-y-2">
                      <p><strong>Puesto:</strong> {selectedMessage.employment_position}</p>
                      {selectedMessage.employment_motivation && (
                        <p><strong>Motivación:</strong> {selectedMessage.employment_motivation}</p>
                      )}
                      {selectedMessage.employment_cv_link && (
                        <a 
                          href={selectedMessage.employment_cv_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-primary hover:underline"
                        >
                          <Download className="w-4 h-4" />
                          Descargar CV
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Franchise Details */}
                {getMessageCategory(selectedMessage) === 'franquicias' && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">Consulta de Franquicia</h4>
                    <div className="p-3 bg-muted rounded-lg space-y-2">
                      <p>
                        <strong>¿Tiene zona?:</strong> {selectedMessage.franchise_has_zone === 'si' ? 'Sí' : 'No'}
                      </p>
                      <p>
                        <strong>¿Tiene local?:</strong> {selectedMessage.franchise_has_location === 'si' ? 'Sí' : 'No'}
                      </p>
                      <p>
                        <strong>Capital:</strong> {selectedMessage.franchise_investment_capital}
                      </p>
                    </div>
                  </div>
                )}

                {/* Order Details */}
                {getMessageCategory(selectedMessage) === 'pedidos' && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">Problema con Pedido</h4>
                    <div className="p-3 bg-muted rounded-lg space-y-2">
                      {selectedMessage.order_number && (
                        <p><strong>N° Pedido:</strong> {selectedMessage.order_number}</p>
                      )}
                      {selectedMessage.order_date && (
                        <p><strong>Fecha:</strong> {selectedMessage.order_date}</p>
                      )}
                      <p><strong>Problema:</strong> {selectedMessage.order_issue}</p>
                    </div>
                  </div>
                )}

                {/* Message */}
                {selectedMessage.message && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">Mensaje</h4>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="whitespace-pre-wrap">{selectedMessage.message}</p>
                    </div>
                  </div>
                )}

                {/* Attachment */}
                {selectedMessage.attachment_url && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">Adjunto</h4>
                    <a 
                      href={selectedMessage.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                      <Download className="w-4 h-4" />
                      {selectedMessage.attachment_name || 'Descargar adjunto'}
                    </a>
                  </div>
                )}

                {/* Reply Section */}
                {!selectedMessage.replied_at && (
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="text-sm font-medium">Marcar como respondido</h4>
                    <Textarea
                      placeholder="Notas internas sobre la respuesta..."
                      value={replyNotes}
                      onChange={(e) => setReplyNotes(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => markAsRepliedMutation.mutate({ 
                          id: selectedMessage.id, 
                          notes: replyNotes 
                        })}
                        disabled={markAsRepliedMutation.isPending}
                      >
                        <Reply className="w-4 h-4 mr-2" />
                        Marcar Respondido
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.open(`mailto:${selectedMessage.email}`, '_blank')}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Responder por Email
                      </Button>
                    </div>
                  </div>
                )}

                {/* Internal Notes */}
                {selectedMessage.notes && (
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="text-sm font-medium text-muted-foreground">Notas internas</h4>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="whitespace-pre-wrap">{selectedMessage.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
