import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Rocket,
  DollarSign,
  Package,
  GraduationCap,
  Smartphone,
  Handshake,
  Beef,
  Check,
  ArrowRight,
  Quote,
  MessageCircle,
  Users,
  TrendingUp,
  Clock
} from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import heroBurger from '@/assets/hero-burger.jpg';
import local1 from '@/assets/local-1.jpg';
import logoHoppiness from '@/assets/logo-hoppiness.png';

export default function Franquicias() {
  const stats = [
    { value: '5', label: 'Sucursales activas' },
    { value: '600+', label: 'Burgers/día' },
    { value: '2018', label: 'Desde' },
    { value: '95%', label: 'Clientes felices' },
  ];

  const benefits = [
    {
      icon: DollarSign,
      title: 'Alta Rentabilidad',
      description: 'ROI promedio en 18-24 meses. Márgenes superiores al 25%.'
    },
    {
      icon: Package,
      title: 'Modelo Llave en Mano',
      description: 'Te entregamos el local funcionando con todo listo para operar.'
    },
    {
      icon: GraduationCap,
      title: 'Capacitación Completa',
      description: '4 semanas de entrenamiento intensivo para vos y tu equipo.'
    },
    {
      icon: Smartphone,
      title: 'Sistema Propio',
      description: 'Tecnología de gestión incluida sin costo extra. POS, KDS, reportes.'
    },
    {
      icon: Handshake,
      title: 'Soporte Permanente',
      description: 'Acompañamiento constante del equipo central en cada etapa.'
    },
    {
      icon: Beef,
      title: 'Producto Probado',
      description: 'Recetas únicas que ya enamoran a miles de clientes.'
    }
  ];

  const investmentIncludes = [
    'Canon de entrada',
    'Equipamiento completo de cocina',
    'Capacitación del equipo (4 semanas)',
    'Stock inicial de insumos',
    'Campaña de marketing de lanzamiento',
    'Diseño y brandeo del local',
    'Sistema de gestión (POS, KDS, reportes)',
    'Manuales operativos completos'
  ];

  const steps = [
    { number: '1', title: 'Contacto', description: 'Completás el formulario y te contactamos' },
    { number: '2', title: 'Reunión', description: 'Nos juntamos a conocernos y evaluamos la zona' },
    { number: '3', title: 'Aprobación', description: 'Firmamos contrato y arrancamos obras' },
    { number: '4', title: '¡Apertura!', description: 'Tu local abre en aproximadamente 90 días' }
  ];

  const faqs = [
    {
      question: '¿Necesito experiencia en gastronomía?',
      answer: 'No. Te capacitamos completamente durante 4 semanas. Lo que buscamos es gente con ganas, actitud comercial y capacidad de gestión.'
    },
    {
      question: '¿Puedo tener el local en cualquier ciudad?',
      answer: 'Por ahora operamos en Córdoba capital y alrededores (Villa Allende, Mendiolaza, etc.). Estamos evaluando expansión a otras provincias.'
    },
    {
      question: '¿Cuánto tiempo tarda la apertura?',
      answer: 'Aproximadamente 90 días desde la firma del contrato, dependiendo de las obras necesarias en el local.'
    },
    {
      question: '¿Puedo tener más de un local?',
      answer: '¡Sí! Muchos de nuestros franquiciados tienen 2 o más locales. Es más, premiamos el crecimiento con mejores condiciones.'
    },
    {
      question: '¿Qué pasa si no funciona?',
      answer: 'Tenemos un track record del 100% de locales exitosos. Nuestro modelo está probado y te acompañamos en cada paso para asegurar tu éxito.'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBurger})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/90 to-primary/80" />
        
        <div className="relative container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-6 font-brand leading-tight">
              Sé dueño de tu propio<br />
              <span className="text-accent">Hoppiness</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-4">
              Sumate a la red de hamburgueserías más exitosa de Córdoba.
            </p>
            <p className="text-lg text-white/80 mb-8">
              {/* TODO: Actualizar con datos reales */}
              Facturación promedio de $XX millones/mes por local.
            </p>
            <Link to="/contacto?asunto=franquicia">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8 py-6 h-auto">
                <Rocket className="w-5 h-5 mr-2" />
                Quiero mi Franquicia
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-accent text-accent-foreground py-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((stat, i) => (
              <div key={i}>
                <p className="text-4xl md:text-5xl font-black font-brand">{stat.value}</p>
                <p className="text-sm opacity-90">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Por qué Hoppiness */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-black mb-4 font-brand text-center text-primary">
            ¿POR QUÉ HOPPINESS?
          </h2>
          <p className="text-center text-muted-foreground mb-12 text-lg max-w-2xl mx-auto">
            Un modelo de negocio probado, rentable y con todo el soporte que necesitás
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, i) => (
              <Card key={i} className="shadow-card hover:shadow-elevated transition-all hover:-translate-y-1">
                <CardContent className="pt-6">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <benefit.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Inversión */}
      <section className="py-20 px-4 bg-secondary/50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-4xl font-black mb-4 font-brand text-center text-primary">
            INVERTÍ EN TU FUTURO
          </h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">
            Una inversión con retorno probado
          </p>

          <Card className="shadow-elevated">
            <CardContent className="p-8 md:p-12">
              <div className="text-center mb-8">
                <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">Inversión inicial desde</p>
                {/* TODO: Actualizar con monto real */}
                <p className="text-5xl md:text-6xl font-black text-primary font-brand">$XX.XXX USD</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h4 className="font-bold mb-4 text-lg">La inversión incluye:</h4>
                  <ul className="space-y-3">
                    {investmentIncludes.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-accent" />
                        </div>
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-6">
                  <div className="p-4 bg-primary/5 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <span className="font-semibold">Royalty mensual</span>
                    </div>
                    {/* TODO: Actualizar con % real */}
                    <p className="text-2xl font-bold text-primary">X% sobre ventas</p>
                  </div>
                  <div className="p-4 bg-primary/5 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="w-5 h-5 text-primary" />
                      <span className="font-semibold">Fondo de marketing</span>
                    </div>
                    {/* TODO: Actualizar con % real */}
                    <p className="text-2xl font-bold text-primary">X% sobre ventas</p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                * Los montos son referenciales. Contactanos para una propuesta personalizada según tu zona.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Proceso */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-4xl font-black mb-4 font-brand text-center text-primary">
            4 PASOS PARA SER PARTE
          </h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">
            Un proceso simple y transparente
          </p>

          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="text-center relative">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-2xl font-black font-brand">
                  {step.number}
                </div>
                <h4 className="font-bold text-lg mb-2">{step.title}</h4>
                <p className="text-muted-foreground text-sm">{step.description}</p>
                
                {i < steps.length - 1 && (
                  <ArrowRight className="hidden md:block absolute top-8 -right-3 w-6 h-6 text-muted-foreground/30" />
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full mb-4">
              <Clock className="w-4 h-4" />
              <span className="font-medium">Tiempo estimado: 90 días hasta apertura</span>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <Quote className="w-12 h-12 mx-auto mb-6 opacity-50" />
          <blockquote className="text-2xl md:text-3xl font-medium mb-6 italic">
            "Mejor decisión de mi vida. En 18 meses recuperé la inversión y hoy tengo 2 locales. 
            El equipo de Hoppiness te acompaña en todo momento."
          </blockquote>
          <p className="text-primary-foreground/70">
            — Carlos M., Franquiciado Nueva Córdoba
          </p>
        </div>
      </section>

      {/* Image break */}
      <section className="relative h-64 md:h-80">
        <img 
          src={local1} 
          alt="Interior Hoppiness" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* FAQ */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-4xl font-black mb-4 font-brand text-center text-primary">
            PREGUNTAS FRECUENTES
          </h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">
            Todo lo que necesitás saber antes de dar el paso
          </p>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, i) => (
              <AccordionItem 
                key={i} 
                value={`faq-${i}`}
                className="border rounded-xl px-6 shadow-sm"
              >
                <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary via-primary to-primary/90">
        <div className="container mx-auto max-w-3xl text-center">
          <img 
            src={logoHoppiness} 
            alt="Hoppiness Club" 
            className="w-20 h-20 mx-auto mb-6 invert"
          />
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 font-brand">
            ¿Listo para ser parte del<br />
            <span className="text-accent">Culto al Sabor</span>?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Completá el formulario y un asesor se contactará en menos de 48 horas.
          </p>
          <Link to="/contacto?asunto=franquicia">
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-xl px-10 py-7 h-auto shadow-lg">
              <Rocket className="w-6 h-6 mr-2" />
              ¡QUIERO MI FRANQUICIA!
            </Button>
          </Link>
          <p className="text-white/60 text-sm mt-6">
            <MessageCircle className="w-4 h-4 inline mr-1" />
            Sin compromiso. Solo queremos conocerte.
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}