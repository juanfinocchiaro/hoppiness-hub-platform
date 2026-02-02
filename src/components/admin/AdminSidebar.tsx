import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  LayoutDashboard,
  Store,
  Users,
  ChevronRight,
  ChevronDown,
  MapPin,
  Plus,
  Building2,
  Search,
  Megaphone,
  Settings,
  FileText,
  MessageSquare,
  Eye,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import NewBranchModal from './NewBranchModal';
import ImpersonationSelector from './ImpersonationSelector';
import { useUnreadMessagesCount } from '@/hooks/useContactMessages';

interface NavItem {
  type: 'navigation' | 'action';
  to?: string;
  icon: React.ElementType;
  label: string;
  exact?: boolean;
  onClick?: () => void;
}

interface NavSection {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

interface AdminSidebarProps {
  avatarInfo: { type: string; label: string };
}

/**
 * AdminSidebar - Panel "Mi Marca" ULTRA SIMPLIFICADO
 * 
 * Solo contiene:
 * - Dashboard (ventas consolidadas por local)
 * - Mis Locales (lista dinámica + crear)
 * - Usuarios (gestión de usuarios y permisos)
 */
export default function AdminSidebar({ avatarInfo }: AdminSidebarProps) {
  const location = useLocation();
  const { canImpersonate, isImpersonating } = useImpersonation();
  const [showNewBranchModal, setShowNewBranchModal] = useState(false);
  const [showImpersonationSelector, setShowImpersonationSelector] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    locales: true,
    personas: true,
  });
  
  const { data: unreadCount } = useUnreadMessagesCount();

  // Fetch branches for dynamic menu
  const { data: branches, refetch: refetchBranches } = useQuery({
    queryKey: ['admin-sidebar-branches'],
    queryFn: async () => {
      const { data } = await supabase
        .from('branches')
        .select('id, name, slug')
        .order('name');
      return data || [];
    },
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // Build sections - SIMPLIFICADO
  const buildSections = (): NavSection[] => {
    const sections: NavSection[] = [];

    // Mis Locales (with dynamic branches)
    const localesItems: NavItem[] = [
      {
        type: 'action',
        icon: Plus,
        label: 'Nueva Sucursal',
        onClick: () => setShowNewBranchModal(true),
      },
      ...(branches?.map((branch) => ({
        type: 'navigation' as const,
        icon: MapPin,
        label: branch.name,
        to: `/mimarca/locales/${branch.slug}`,
      })) || []),
    ];
    sections.push({
      id: 'locales',
      label: 'Mis Locales',
      icon: Store,
      items: localesItems,
    });

    // Personas/Usuarios
    sections.push({
      id: 'personas',
      label: 'Usuarios',
      icon: Users,
      items: [
        { type: 'navigation', to: '/mimarca/equipo-central', icon: Building2, label: 'Equipo Central' },
        { type: 'navigation', to: '/mimarca/usuarios', icon: Search, label: 'Todos los Usuarios' },
      ],
    });

    // Comunicación
    sections.push({
      id: 'comunicacion',
      label: 'Comunicación',
      icon: Megaphone,
      items: [
        { type: 'navigation', to: '/mimarca/mensajes', icon: MessageSquare, label: 'Mensajes de Contacto' },
        { type: 'navigation', to: '/mimarca/comunicados', icon: Megaphone, label: 'Comunicados' },
      ],
    });

    // Configuración
    sections.push({
      id: 'config',
      label: 'Configuración',
      icon: Settings,
      items: [
        { type: 'navigation', to: '/mimarca/reglamentos', icon: FileText, label: 'Reglamentos' },
        { type: 'navigation', to: '/mimarca/configuracion/cierres', icon: FileText, label: 'Cierre de Turno' },
      ],
    });

    return sections;
  };

  const sections = buildSections();

  const isSectionActive = (section: NavSection) =>
    section.items.some(
      (item) => item.type === 'navigation' && item.to && location.pathname.startsWith(item.to)
    );

  const isItemActive = (item: NavItem) => {
    if (item.type !== 'navigation' || !item.to) return false;
    return item.exact
      ? location.pathname === item.to
      : location.pathname.startsWith(item.to);
  };

  const isDashboardActive = location.pathname === '/mimarca';

  return (
    <>
      <nav className="space-y-1">
        {/* Dashboard - Link directo */}
        <Link to="/mimarca">
          <Button
            variant={isDashboardActive ? 'secondary' : 'ghost'}
            className={`w-full justify-start ${isDashboardActive ? 'bg-primary/10 text-primary' : ''}`}
          >
            <LayoutDashboard className="w-4 h-4 mr-3" />
            Dashboard
          </Button>
        </Link>

        {/* Impersonation button - Only for superadmins */}
        {canImpersonate && (
          <Button
            variant={isImpersonating ? 'secondary' : 'ghost'}
            className={`w-full justify-start ${isImpersonating ? 'bg-amber-100 text-amber-900 hover:bg-amber-200' : ''}`}
            onClick={() => setShowImpersonationSelector(true)}
          >
            <Eye className="w-4 h-4 mr-3" />
            Ver como...
          </Button>
        )}

        {/* Collapsible sections */}
        {sections.map((section) => {
          const isActive = isSectionActive(section);
          const isExpanded = expandedSections[section.id] || isActive;

          return (
            <Collapsible
              key={section.id}
              open={isExpanded}
              onOpenChange={() => toggleSection(section.id)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className={`w-full justify-start ${isActive ? 'bg-primary/5 text-primary' : ''}`}
                >
                  <section.icon className="w-4 h-4 mr-3" />
                  {section.label}
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 ml-auto" />
                  ) : (
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4 space-y-0.5 mt-1">
                {section.items.map((item, idx) => {
                  if (item.type === 'action') {
                    return (
                      <Button
                        key={idx}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-primary hover:bg-primary/10"
                        onClick={item.onClick}
                      >
                        <item.icon className="w-4 h-4 mr-3" />
                        {item.label}
                      </Button>
                    );
                  }

                  const itemActive = isItemActive(item);
                  const showBadge = item.to === '/mimarca/mensajes' && unreadCount && unreadCount > 0;
                  
                  return (
                    <Link key={item.to} to={item.to!}>
                      <Button
                        variant={itemActive ? 'secondary' : 'ghost'}
                        size="sm"
                        className={`w-full justify-start ${itemActive ? 'bg-primary/10 text-primary' : ''}`}
                      >
                        <item.icon className="w-4 h-4 mr-3" />
                        {item.label}
                        {showBadge && (
                          <Badge className="ml-auto bg-orange-500 text-white text-xs px-1.5 py-0.5">
                            {unreadCount}
                          </Badge>
                        )}
                      </Button>
                    </Link>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </nav>

      <NewBranchModal
        open={showNewBranchModal}
        onOpenChange={setShowNewBranchModal}
        onCreated={refetchBranches}
      />

      <ImpersonationSelector
        open={showImpersonationSelector}
        onOpenChange={setShowImpersonationSelector}
      />
    </>
  );
}
