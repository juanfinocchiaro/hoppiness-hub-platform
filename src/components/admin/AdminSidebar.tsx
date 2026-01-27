import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import NewBranchModal from './NewBranchModal';

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
  const [showNewBranchModal, setShowNewBranchModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    vision: true,
    locales: true,
    personas: true,
  });

  // Fetch branches for dynamic menu
  const { data: branches, refetch: refetchBranches } = useQuery({
    queryKey: ['admin-sidebar-branches'],
    queryFn: async () => {
      const { data } = await supabase
        .from('branches')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // Build sections - ULTRA SIMPLIFICADO
  const buildSections = (): NavSection[] => {
    const sections: NavSection[] = [];

    // Dashboard
    sections.push({
      id: 'vision',
      label: 'Visión General',
      icon: LayoutDashboard,
      items: [
        { type: 'navigation', to: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
      ],
    });

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
        to: `/admin/locales/${branch.slug}`,
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
        { type: 'navigation', to: '/admin/personas/equipo-central', icon: Building2, label: 'Equipo Central' },
        { type: 'navigation', to: '/admin/personas/usuarios', icon: Search, label: 'Todos los Usuarios' },
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

  return (
    <>
      <nav className="space-y-1">
        {/* Role badge */}
        {avatarInfo.type !== 'brand_owner' && (
          <div className="px-3 py-2 mb-2">
            <Badge variant="secondary" className="text-xs">
              {avatarInfo.label}
            </Badge>
          </div>
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
                  return (
                    <Link key={item.to} to={item.to!}>
                      <Button
                        variant={itemActive ? 'secondary' : 'ghost'}
                        size="sm"
                        className={`w-full justify-start ${itemActive ? 'bg-primary/10 text-primary' : ''}`}
                      >
                        <item.icon className="w-4 h-4 mr-3" />
                        {item.label}
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
    </>
  );
}
