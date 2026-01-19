import { Link } from 'react-router-dom';
import { Instagram } from 'lucide-react';
import logoHoppiness from '@/assets/logo-hoppiness.png';

export function PublicFooter() {
  return (
    <footer className="bg-foreground text-background py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <img src={logoHoppiness} alt="Hoppiness Club" className="w-16 h-16 mb-4 invert" />
            <p className="text-background/70">
              Club de hamburguesas 100% cordobés. Culto al sabor desde 2018.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4 font-brand">ENLACES</h4>
            <div className="space-y-2">
              <Link to="/pedir" className="block text-background/70 hover:text-background">Pedir</Link>
              <Link to="/menu" className="block text-background/70 hover:text-background">Nuestro Menú</Link>
              <Link to="/franquicias" className="block text-background/70 hover:text-background">Franquicias</Link>
              <Link to="/ingresar" className="block text-background/70 hover:text-background">Ingresar</Link>
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-4 font-brand">SEGUINOS</h4>
            <a 
              href="https://instagram.com/hoppinessclub" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-background/70 hover:text-background"
            >
              <Instagram className="w-5 h-5" />
              @hoppinessclub
            </a>
          </div>
        </div>
        <div className="border-t border-background/20 pt-8 text-center text-background/50 text-sm">
          <p>© {new Date().getFullYear()} Hoppiness Club. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
