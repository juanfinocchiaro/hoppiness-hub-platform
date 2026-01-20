import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ArrowLeft, 
  ChevronDown,
  Store,
  MapPin,
  Zap,
  X,
  Trash2,
  Plus,
  Minus
} from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';
import { useBranchMenu, type MenuProduct } from '@/hooks/store/useBranchMenu';
import { CategoryTabs, ProductCard } from '@/components/store/Menu';
import { FloatingCartButton, CartSummary } from '@/components/store/Cart';
import { ProductSheet } from '@/components/store/Product';
import { DeliveryModeToggle } from '@/components/store/BranchSelector';
import { BranchChangeModal } from '@/components/store/common';
import logoOriginal from '@/assets/logo-hoppiness-original.jpg';
import heroBurger from '@/assets/hero-burger.jpg';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

export default function PedirBranch() {
  const { branchSlug } = useParams();
  const navigate = useNavigate();
  const categoryRefs = useRef<Map<string, HTMLElement>>(new Map());
  
  const {
    branch,
    setBranch,
    orderMode,
    setOrderMode,
    deliveryAddress,
    items,
    addItem,
    updateItemQuantity,
    removeItem,
    itemCount,
    subtotal,
    deliveryFee,
    total,
    formatPrice,
    showBranchChangeModal,
    pendingBranchChange,
    confirmBranchChange,
    cancelBranchChange,
  } = useCart();
  
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MenuProduct | null>(null);

  // Fetch branch and menu data using the hook
  const { data: menuData, isLoading: loading, error } = useBranchMenu(branchSlug);

  // Sync branch from menu data to cart context
  useEffect(() => {
    if (menuData?.branch && (!branch || branch.id !== menuData.branch.id)) {
      // Use internal state setter to avoid triggering cart clear modal
      setBranch(menuData.branch);
    }
  }, [menuData?.branch]);

  // Fetch all branches for selector
  useEffect(() => {
    async function fetchAllBranches() {
      const { data } = await supabase
        .from('branches')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (data) setAllBranches(data);
    }
    fetchAllBranches();
  }, []);

  // Set first category as active when loaded
  useEffect(() => {
    if (menuData?.categories.length && !activeCategory) {
      setActiveCategory(menuData.categories[0].id);
    }
  }, [menuData?.categories, activeCategory]);

  // Load saved order type from session
  useEffect(() => {
    const savedType = sessionStorage.getItem('orderType') as 'delivery' | 'takeaway';
    if (savedType) setOrderMode(savedType);
  }, []);

  const scrollToCategory = (categoryId: string) => {
    setActiveCategory(categoryId);
    const ref = categoryRefs.current.get(categoryId);
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleBranchChange = (newBranch: Branch) => {
    if (newBranch.id === branch?.id) return;
    
    if (items.length > 0) {
      // Cart context will handle showing the modal
      setBranch(newBranch);
    } else {
      navigate(`/pedir/${newBranch.slug || newBranch.id}`);
    }
  };

  const handleAddToCart = (data: {
    product: MenuProduct;
    modifiers: Record<string, string[]>;
    modifiersTotal: number;
    modifierNames: string[];
    notes: string;
  }) => {
    addItem({
      product: data.product,
      quantity: 1,
      modifiers: data.modifiers,
      modifiersTotal: data.modifiersTotal,
      modifierNames: data.modifierNames,
      notes: data.notes,
    });
    setSelectedProduct(null);
  };

  // Data from the hook
  const categories = menuData?.categories || [];
  const products = menuData?.allProducts || [];
  const featuredProducts = menuData?.featuredProducts || [];
  const currentBranch = menuData?.branch || branch;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-48 bg-muted animate-pulse" />
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!currentBranch) {
    toast.error('Sucursal no encontrada');
    navigate('/pedir');
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-24 overflow-x-hidden">
      {/* Branch Change Confirmation Modal */}
      <BranchChangeModal
        open={showBranchChangeModal}
        currentBranch={branch}
        newBranch={pendingBranchChange}
        onConfirm={() => {
          if (pendingBranchChange) {
            confirmBranchChange(pendingBranchChange);
            navigate(`/pedir/${pendingBranchChange.slug || pendingBranchChange.id}`);
          }
        }}
        onCancel={cancelBranchChange}
      />

      {/* Compact Header with Hero */}
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
              <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs py-0">
                <MapPin className="w-3 h-3 mr-1" />
                {deliveryAddress ? deliveryAddress.substring(0, 25) + '...' : 'Tu ubicación'}
              </Badge>
              {currentBranch.is_open ? (
                <Badge className="bg-emerald-500/90 text-white text-xs py-0">Abierto</Badge>
              ) : (
                <Badge variant="destructive" className="text-xs py-0">Cerrado</Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white font-brand">
              Hoppiness {currentBranch.name}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-white/80 text-xs">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                ~{currentBranch.estimated_prep_time_min || 25} min
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Header: Branch Selector + Order Type Toggle */}
      <div className="sticky top-0 z-30 bg-background border-b">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            {/* Branch Selector Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                  <Store className="w-3 h-3" />
                  <span className="font-medium">{currentBranch.name}</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {allBranches.map((b) => (
                  <DropdownMenuItem
                    key={b.id}
                    onClick={() => handleBranchChange(b)}
                    className={b.id === currentBranch.id ? 'bg-accent' : ''}
                    disabled={!b.is_open}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>Hoppiness {b.name}</span>
                      {b.is_open ? (
                        <Badge variant="secondary" className="text-[10px] py-0 px-1 bg-emerald-100 text-emerald-700">
                          Abierto
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] py-0 px-1 text-muted-foreground">
                          Cerrado
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Compact Order Type Toggle */}
            <DeliveryModeToggle
              mode={orderMode}
              onChange={setOrderMode}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Category Navigation */}
      {categories.length > 0 && (
        <div className="sticky top-[48px] z-20 bg-background border-b">
          <div className="container mx-auto px-4">
            <CategoryTabs
              categories={categories}
              activeCategory={activeCategory}
              onCategoryChange={scrollToCategory}
              showFeatured={featuredProducts.length > 0}
            />
          </div>
        </div>
      )}

      {/* Products by Category */}
      <div className="container mx-auto px-4 space-y-6 py-6">
        {/* Best Sellers */}
        {featuredProducts.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              ⭐ Best Sellers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {featuredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={() => setSelectedProduct(product)}
                  cartQuantity={items.filter(i => i.product.id === product.id).reduce((s, i) => s + i.quantity, 0)}
                  formatPrice={formatPrice}
                />
              ))}
            </div>
          </section>
        )}

        {/* Categories */}
        {categories.map(category => {
          const categoryProducts = products.filter(p => p.category_id === category.id);
          if (categoryProducts.length === 0) return null;

          return (
            <section 
              key={category.id}
              ref={(el) => { if (el) categoryRefs.current.set(category.id, el); }}
            >
              <h2 className="text-lg font-bold mb-3">{category.name}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categoryProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAdd={() => setSelectedProduct(product)}
                    cartQuantity={items.filter(i => i.product.id === product.id).reduce((s, i) => s + i.quantity, 0)}
                    formatPrice={formatPrice}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Floating Cart Button */}
      {itemCount > 0 && (
        <FloatingCartButton
          itemCount={itemCount}
          total={total}
          onClick={() => setIsCartOpen(true)}
          formatPrice={formatPrice}
        />
      )}

      {/* Product Detail Sheet */}
      <ProductSheet
        product={selectedProduct}
        branchId={currentBranch.id}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        formatPrice={formatPrice}
      />

      {/* Cart Sheet */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b shrink-0">
            <h2 className="text-lg font-bold">Tu Pedido</h2>
            <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Cart Items */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 p-3 bg-muted/50 rounded-xl">
                  {/* Image */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                    {item.product.image_url ? (
                      <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🍔</div>
                    )}
                  </div>
                  
                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{item.product.name}</h4>
                    {item.modifierNames && item.modifierNames.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.modifierNames.join(', ')}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-muted-foreground italic truncate">"{item.notes}"</p>
                    )}
                    <p className="text-sm font-bold text-primary mt-1">
                      {formatPrice((item.product.finalPrice + (item.modifiersTotal || 0)) * item.quantity)}
                    </p>
                  </div>
                  
                  {/* Quantity Controls */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-6 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          {/* Summary & Checkout */}
          <div className="shrink-0 p-4 border-t space-y-4">
            <CartSummary
              subtotal={subtotal}
              deliveryFee={deliveryFee}
              total={total}
              itemCount={itemCount}
              formatPrice={formatPrice}
              showDelivery={orderMode === 'delivery'}
            />
            
            <Button
              size="lg"
              className="w-full h-14 text-lg"
              onClick={() => {
                setIsCartOpen(false);
                navigate('/checkout');
              }}
            >
              Ir a Pagar • {formatPrice(total)}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
