import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock,
  Send,
  Instagram,
  Facebook
} from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';

export default function Contacto() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('contact_messages')
        .insert({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          subject: formData.subject,
          message: formData.message
        });

      if (error) throw error;

      toast({
        title: '¡Mensaje enviado!',
        description: 'Te responderemos pronto. Gracias por contactarnos.',
      });
      
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
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

  const subjects = [
    { value: 'general', label: 'Consulta general' },
    { value: 'pedidos', label: 'Pedidos' },
    { value: 'franquicias', label: 'Franquicias' },
    { value: 'trabajo', label: 'Trabajo' },
    { value: 'otro', label: 'Otro' }
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      
      {/* Hero pequeño */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-4 font-brand">
            CONTACTANOS
          </h1>
          <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
            Estamos para ayudarte. Escribinos y te respondemos lo antes posible.
          </p>
        </div>
      </section>

      {/* Contenido principal */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Columna izquierda - Info */}
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
                    className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white hover:scale-105 transition-transform"
                  >
                    <Facebook className="w-6 h-6" />
                  </a>
                </div>
              </div>
            </div>

            {/* Columna derecha - Formulario */}
            <div>
              <Card className="shadow-elevated">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold mb-6">Envianos un mensaje</h2>
                  
                  <form onSubmit={handleSubmit} className="space-y-5">
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
                        <Label htmlFor="phone">Teléfono (opcional)</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+54 351..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Asunto *</Label>
                        <Select 
                          value={formData.subject} 
                          onValueChange={(value) => setFormData({ ...formData, subject: value })}
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

                    <Button type="submit" size="lg" className="w-full" disabled={loading}>
                      {loading ? (
                        'Enviando...'
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Enviar mensaje
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