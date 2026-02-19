import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowLeft, MapPin, Store, ChevronDown, Zap } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { DeliveryModeToggle } from '../BranchSelector/DeliveryModeToggle';
import type { OrderMode } from '@/contexts/CartContext';
import logoOriginal from '@/assets/logo-hoppiness-original.jpg';
import heroBurger from '@/assets/hero-burger.jpg';

interface MenuHeaderProps {
  branch: Tables<'branches'>;
  allBranches: Tables<'branches'>[];
  orderMode: OrderMode;
  userAddress?: string;
  onOrderModeChange: (mode: OrderMode) => void;
  onBranchChange: (branch: Tables<'branches'>) => void;
}

export function MenuHeader({
  branch,
  allBranches,
  orderMode,
  userAddress,
  onOrderModeChange,
  onBranchChange,
}: MenuHeaderProps) {
  return (
    <>
      {/* Hero with Background */}
      <div className="relative h-48 md:h-56 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBurger})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
        
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 z-20">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/pedir">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-9 w-9">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <img src={logoOriginal} alt="Hoppiness" className="h-8 w-8 rounded-full" />
            <div className="w-9" />
          </div>
        </div>
        
        {/* Branch Info */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <div className="container mx-auto px-4 pb-4">
            <div className="flex items-center gap-2 text-xs mb-1">
              {userAddress && (
                <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs py-0">
                  <MapPin className="w-3 h-3 mr-1" />
                  {userAddress.substring(0, 25)}...
                </Badge>
              )}
              {branch.is_open ? (
                <Badge className="bg-emerald-500/90 text-white text-xs py-0">Abierto</Badge>
              ) : (
                <Badge variant="destructive" className="text-xs py-0">Cerrado</Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white font-brand">
              Hoppiness {branch.name}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-white/80 text-xs">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                ~{branch.estimated_prep_time_min || 25} min
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sticky Controls */}
      <div className="sticky top-0 z-30 bg-background border-b">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            {/* Branch Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                  <Store className="w-3 h-3" />
                  <span className="font-medium">{branch.name}</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {allBranches.map((b) => (
                  <DropdownMenuItem
                    key={b.id}
                    onClick={() => onBranchChange(b)}
                    className={b.id === branch.id ? 'bg-accent' : ''}
                    disabled={!b.is_open}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>Hoppiness {b.name}</span>
                      <Badge 
                        variant="secondary" 
                        className={`text-[10px] py-0 px-1 ${
                          b.is_open 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'text-muted-foreground'
                        }`}
                      >
                        {b.is_open ? 'Abierto' : 'Cerrado'}
                      </Badge>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Order Mode Toggle */}
            <DeliveryModeToggle
              mode={orderMode}
              onChange={onOrderModeChange}
              size="sm"
              className="flex-shrink-0"
            />
          </div>
        </div>
      </div>
    </>
  );
}
