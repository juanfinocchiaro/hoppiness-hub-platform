import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock,
  Send,
  Instagram,
  Facebook,
  CalendarIcon,
  Rocket
} from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { cn } from '@/lib/utils';

type SubjectType = 'consulta' | 'franquicia' | 'empleo' | 'pedidos' | 'otro';

interface FormData {
  name: string;
  email: string;
  phone: string;
  subject: SubjectType | '';
  message: string;
  // Franchise fields
  franchise_has_zone: string;
  franchise_has_location: string;
  franchise_investment_capital: string;
  // Employment fields
  employment_branch_id: string;
  employment_position: string;
  employment_cv_link: string;
  employment_motivation: string;
  // Order issue fields
  order_branch_id: string;
  order_number: string;
  order_date: Date | undefined;
  order_issue: string;
}

const initialFormData: FormData = {
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
  franchise_has_zone: '',
  franchise_has_location: '',
  franchise_investment_capital: '',
  employment_branch_id: '',
  employment_position: '',
  employment_cv_link: '',
  employment_motivation: '',
  order_branch_id: '',
  order_number: '',
  order_date: undefined,
  order_issue: '',
};

export default function Contacto() {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  // Fetch branches for dropdowns
  const { data: branches } = useQuery({
    queryKey: ['branches-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Detect URL params
  useEffect(() => {
    const asuntoParam = searchParams.get('asunto');
    if (asuntoParam === 'franquicia') {
      setFormData(prev => ({ ...prev, subject: 'franquicia' }));
    }
  }, [searchParams]);

  const subjects = [
    { value: 'consulta', label: 'Consulta general' },
    { value: 'franquicia', label: 'Franquicias' },
    { value: 'empleo', label: 'Empleo' },
    { value: 'pedidos', label: 'Pedidos' },
    { value: 'otro', label: 'Otro' }
  ];

  const franchiseZoneOptions = [
    { value: 'tengo_ubicacion', label: 'Sí, ya tengo ubicación' },
    { value: 'algunas_opciones', label: 'Tengo algunas opciones' },
    { value: 'buscando', label: 'No, estoy buscando' },
    { value: 'asesoren', label: 'Prefiero que me asesoren' }
  ];

  const franchiseLocationOptions = [
    { value: 'local_propio', label: 'Sí, tengo local propio' },
    { value: 'local_alquilado', label: 'Sí, tengo local alquilado' },
    { value: 'buscando', label: 'No, pero estoy buscando' },
    { value: 'necesito_ayuda', label: 'No, necesito ayuda para encontrar' }
  ];

  const franchiseCapitalOptions = [
    { value: 'menos_30k', label: 'Menos de $30.000 USD' },
    { value: '30k_50k', label: '$30.000 - $50.000 USD' },
    { value: '50k_80k', label: '$50.000 - $80.000 USD' },
    { value: 'mas_80k', label: 'Más de $80.000 USD' },
    { value: 'no_decir', label: 'Prefiero no decir' }
  ];

  const employmentPositionOptions = [
    { value: 'cocina', label: 'Cocina' },
    { value: 'caja', label: 'Caja / Atención' },
    { value: 'delivery', label: 'Delivery' },
    { value: 'encargado', label: 'Encargado' },
    { value: 'otro', label: 'Otro' }
  ];

  const getSuccessMessage = (subject: SubjectType) => {
    switch (subject) {
      case 'franquicia':
        return {
          title: '¡Excelente decisión!',
          description: 'Un asesor comercial te contactará en menos de 48 horas para coordinar una reunión.'
        };
      case 'empleo':
        return {
          title: '¡Gracias por querer ser parte del equipo!',
          description: 'Revisaremos tu postulación y te contactaremos si hay una vacante que coincida con tu perfil.'
        };
      case 'pedidos':
        return {
          title: 'Lamentamos el inconveniente',
          description: 'Nuestro equipo revisará tu caso y te contactará a la brevedad para solucionarlo.'
        };
      default:
        return {
          title: '¡Mensaje enviado!',
          description: 'Te responderemos en menos de 24 horas.'
        };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject) return;
    
    setLoading(true);

    try {
      const insertData: Record<string, unknown> = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        subject: formData.subject,
      };

      // Add subject-specific fields
      switch (formData.subject) {
        case 'consulta':
        case 'otro':
          insertData.message = formData.message;
          break;
        case 'franquicia':
          insertData.franchise_has_zone = formData.franchise_has_zone || null;
          insertData.franchise_has_location = formData.franchise_has_location || null;
          insertData.franchise_investment_capital = formData.franchise_investment_capital || null;
          insertData.message = formData.message || null;
          break;
        case 'empleo':
          insertData.employment_branch_id = formData.employment_branch_id || null;
          insertData.employment_position = formData.employment_position || null;
          insertData.employment_cv_link = formData.employment_cv_link || null;
          insertData.employment_motivation = formData.employment_motivation || null;
          break;
        case 'pedidos':
          insertData.order_branch_id = formData.order_branch_id || null;
          insertData.order_number = formData.order_number || null;
          insertData.order_date = formData.order_date ? format(formData.order_date, 'yyyy-MM-dd') : null;
          insertData.order_issue = formData.order_issue;
          break;
      }

      const { error } = await supabase
        .from('contact_messages')
        .insert([insertData as never]);

      if (error) throw error;

      const successMsg = getSuccessMessage(formData.subject);
      toast({
        title: successMsg.title,
        description: successMsg.description,
      });
      
      setSubmitted(true);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error al enviar',
        description: 'Hubo un problema. Por favor intentá de nuevo.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const isFranchiseMode = formData.subject === 'franquicia';

  // TODO: Estos son datos placeholder - actualizar con datos reales
  const contactInfo = [
    {
      icon: MapPin,
      title: 'Ubicación',
      content: 'Múltiples sucursales en Córdoba',
      subtext: 'Nueva Córdoba, Cerro, General Paz y más'
    },
    {
      icon: Phone,
      title: 'Teléfono',
      content: '+54 351 000-0000', // PLACEHOLDER
      subtext: 'Lunes a Domingo'
    },
    {
      icon: Mail,
      title: 'Email',
      content: 'hola@hoppinessclub.com', // PLACEHOLDER
      subtext: 'Respondemos en 24hs'
    },
    {
      icon: Clock,
      title: 'Horario',
      content: '12:00 - 00:00', // PLACEHOLDER
      subtext: 'Todos los días'
    }
  ];

  if (submitted) {
    const successMsg = getSuccessMessage(formData.subject as SubjectType);
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-lg text-center">
            <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
              <Send className="w-10 h-10 text-accent" />
            </div>
            <h1 className="text-3xl font-black mb-4 font-brand text-primary">
              {successMsg.title}
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              {successMsg.description}
            </p>
            <Button onClick={() => { setFormData(initialFormData); setSubmitted(false); }}>
              Enviar otro mensaje
            </Button>
          </div>
        </section>

        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      
      {/* Hero */}
      <section className={cn(
        "py-16",
        isFranchiseMode ? "bg-gradient-to-br from-primary via-primary to-primary/90" : "bg-primary"
      )}>
        <div className="container mx-auto px-4 text-center">
          {isFranchiseMode ? (
            <>
              <div className="inline-flex items-center gap-2 bg-accent/20 text-white px-4 py-2 rounded-full mb-4">
                <Rocket className="w-4 h-4" />
                <span className="text-sm font-medium">Franquicias</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-4 font-brand">
                ¡Genial! Querés tu franquicia
              </h1>
              <p className="text-xl text-white/90 max-w-2xl mx-auto">
                Completá tus datos y te contactamos en 48hs
              </p>
            </>
          ) : (
            <>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-4 font-brand">
                CONTACTANOS
              </h1>
              <p className="text-xl text-white/90 max-w-2xl mx-auto">
                Estamos para ayudarte. Escribinos y te respondemos lo antes posible.
              </p>
            </>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Info Column */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Información de contacto</h2>
              
              <div className="space-y-6 mb-8">
                {contactInfo.map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-foreground">{item.content}</p>
                      <p className="text-sm text-muted-foreground">{item.subtext}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Redes sociales */}
              <div>
                <h3 className="font-semibold mb-4">Seguinos en redes</h3>
                <div className="flex gap-3">
                  <a 
                    href="https://instagram.com/hoppinessclub" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center text-white hover:scale-105 transition-transform"
                  >
                    <Instagram className="w-6 h-6" />
                  </a>
                  <a 
                    href="https://facebook.com/hoppinessclub" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-xl bg-[#1877F2] flex items-center justify-center text-white hover:scale-105 transition-transform"
                  >
                    <Facebook className="w-6 h-6" />
                  </a>
                </div>
              </div>
            </div>

            {/* Form Column */}
            <div>
              <Card className="shadow-elevated">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold mb-6">
                    {isFranchiseMode ? 'Contanos sobre vos' : 'Envianos un mensaje'}
                  </h2>
                  
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Base fields */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nombre *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Tu nombre"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="tu@email.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Teléfono *</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+54 351..."
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Asunto *</Label>
                        <Select 
                          value={formData.subject} 
                          onValueChange={(value: SubjectType) => setFormData({ ...formData, subject: value })}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccioná un asunto" />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Conditional fields based on subject */}
                    {(formData.subject === 'consulta' || formData.subject === 'otro') && (
                      <div className="space-y-2">
                        <Label htmlFor="message">Mensaje *</Label>
                        <Textarea
                          id="message"
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          placeholder="Contanos en qué podemos ayudarte..."
                          rows={5}
                          required
                        />
                      </div>
                    )}

                    {formData.subject === 'franquicia' && (
                      <>
                        <div className="space-y-2">
                          <Label>¿Ya tenés una zona en mente?</Label>
                          <Select 
                            value={formData.franchise_has_zone} 
                            onValueChange={(value) => setFormData({ ...formData, franchise_has_zone: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccioná una opción" />
                            </SelectTrigger>
                            <SelectContent>
                              {franchiseZoneOptions.map((o) => (
                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>¿Ya tenés un local disponible?</Label>
                          <Select 
                            value={formData.franchise_has_location} 
                            onValueChange={(value) => setFormData({ ...formData, franchise_has_location: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccioná una opción" />
                            </SelectTrigger>
                            <SelectContent>
                              {franchiseLocationOptions.map((o) => (
                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>¿Qué capital tenés disponible para invertir?</Label>
                          <Select 
                            value={formData.franchise_investment_capital} 
                            onValueChange={(value) => setFormData({ ...formData, franchise_investment_capital: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccioná una opción" />
                            </SelectTrigger>
                            <SelectContent>
                              {franchiseCapitalOptions.map((o) => (
                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="franchise_message">¿Algo más que quieras contarnos? (opcional)</Label>
                          <Textarea
                            id="franchise_message"
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            placeholder="Experiencia previa, motivación, dudas..."
                            rows={4}
                          />
                        </div>
                      </>
                    )}

                    {formData.subject === 'empleo' && (
                      <>
                        <div className="space-y-2">
                          <Label>¿En qué local te gustaría trabajar? *</Label>
                          <Select 
                            value={formData.employment_branch_id} 
                            onValueChange={(value) => setFormData({ ...formData, employment_branch_id: value })}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccioná un local" />
                            </SelectTrigger>
                            <SelectContent>
                              {branches?.map((b) => (
                                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                              ))}
                              <SelectItem value="cualquiera">Me da igual / Cualquiera</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>¿Qué puesto te interesa?</Label>
                          <Select 
                            value={formData.employment_position} 
                            onValueChange={(value) => setFormData({ ...formData, employment_position: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccioná un puesto" />
                            </SelectTrigger>
                            <SelectContent>
                              {employmentPositionOptions.map((o) => (
                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="cv_link">Link a CV o LinkedIn (opcional)</Label>
                          <Input
                            id="cv_link"
                            type="url"
                            value={formData.employment_cv_link}
                            onChange={(e) => setFormData({ ...formData, employment_cv_link: e.target.value })}
                            placeholder="https://..."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="motivation">¿Por qué querés trabajar en Hoppiness?</Label>
                          <Textarea
                            id="motivation"
                            value={formData.employment_motivation}
                            onChange={(e) => setFormData({ ...formData, employment_motivation: e.target.value })}
                            placeholder="Contanos sobre tu experiencia y motivación..."
                            rows={4}
                          />
                        </div>
                      </>
                    )}

                    {formData.subject === 'pedidos' && (
                      <>
                        <div className="space-y-2">
                          <Label>¿En qué local hiciste el pedido? *</Label>
                          <Select 
                            value={formData.order_branch_id} 
                            onValueChange={(value) => setFormData({ ...formData, order_branch_id: value })}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccioná el local" />
                            </SelectTrigger>
                            <SelectContent>
                              {branches?.map((b) => (
                                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="order_number">Número de pedido (si lo tenés)</Label>
                            <Input
                              id="order_number"
                              value={formData.order_number}
                              onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                              placeholder="#12345"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Fecha aproximada del pedido</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !formData.order_date && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {formData.order_date ? format(formData.order_date, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={formData.order_date}
                                  onSelect={(date) => setFormData({ ...formData, order_date: date })}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="order_issue">Descripción del problema *</Label>
                          <Textarea
                            id="order_issue"
                            value={formData.order_issue}
                            onChange={(e) => setFormData({ ...formData, order_issue: e.target.value })}
                            placeholder="Contanos qué pasó con tu pedido..."
                            rows={4}
                            required
                          />
                        </div>
                      </>
                    )}

                    <Button 
                      type="submit" 
                      size="lg" 
                      className="w-full" 
                      disabled={loading || !formData.subject}
                    >
                      {loading ? (
                        'Enviando...'
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          {isFranchiseMode ? '¡Quiero mi franquicia!' : 'Enviar mensaje'}
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}