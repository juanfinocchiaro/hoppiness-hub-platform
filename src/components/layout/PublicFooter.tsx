import { Link } from 'react-router-dom';
import { Instagram } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import logoHoppiness from '@/assets/logo-hoppiness-blue.png';

// TikTok icon (not available in lucide-react)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );
}

export function PublicFooter() {
  const { user } = useAuth();

  return (
    <footer className="bg-foreground text-background py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Logo y descripción */}
          <div>
            <img src={logoHoppiness} alt="Hoppiness Club" className="w-16 h-16 mb-4" />
            <p className="text-background/70 text-sm">
              Club de hamburguesas 100% cordobés. Culto al sabor desde 2018.
            </p>
          </div>

          {/* Enlaces principales */}
          <div>
            <h4 className="font-bold mb-4 font-brand">ENLACES</h4>
            <div className="space-y-2 text-sm">
              <a 
                href="https://pedidos.masdelivery.com/hoppiness" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block text-background/70 hover:text-background"
              >
                Pedir
              </a>
              <Link to="/nosotros" className="block text-background/70 hover:text-background">Nosotros</Link>
              <Link to="/franquicias" className="block text-background/70 hover:text-background">Franquicias</Link>
              <a href="/#clubes" className="block text-background/70 hover:text-background">Nuestros Clubes</a>
              <Link to="/contacto" className="block text-background/70 hover:text-background">Contacto</Link>
            </div>
          </div>
          {/* Sumate */}
          <div>
            <h4 className="font-bold mb-4 font-brand">SUMATE</h4>
            <div className="space-y-2 text-sm">
              <Link to="/franquicias" className="block text-background/70 hover:text-background">Abrí tu Franquicia</Link>
              <Link to="/contacto?tab=empleo" className="block text-background/70 hover:text-background">Trabajá con nosotros</Link>
              <Link to="/contacto?tab=proveedores" className="block text-background/70 hover:text-background">Proveedores</Link>
              {user ? (
                <Link to="/cuenta" className="block text-background/70 hover:text-background">Mi Cuenta</Link>
              ) : (
                <Link to="/ingresar" className="block text-background/70 hover:text-background">Ingresar</Link>
              )}
            </div>
          </div>

          {/* Redes sociales */}
          <div>
            <h4 className="font-bold mb-4 font-brand">SEGUINOS</h4>
            <div className="space-y-3">
              <a 
                href="https://instagram.com/hoppinessclub" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-background/70 hover:text-background text-sm"
              >
                <Instagram className="w-5 h-5" />
                @hoppinessclub
              </a>
              <a 
                href="https://tiktok.com/@hoppinessclub" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-background/70 hover:text-background text-sm"
              >
                <TikTokIcon className="w-5 h-5" />
                @hoppinessclub
              </a>
            </div>
            <p className="text-background/50 text-sm mt-4">
              50.000+ seguidores
            </p>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-background/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-background/50 text-sm">
          <p>© {new Date().getFullYear()} Hoppiness Club. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <Link to="/terminos" className="hover:text-background">Términos y condiciones</Link>
            <Link to="/privacidad" className="hover:text-background">Política de privacidad</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
