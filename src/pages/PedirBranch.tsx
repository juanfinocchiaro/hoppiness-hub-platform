import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2,
  Clock,
  MapPin,
  Truck,
  ShoppingBag,
  Loader2,
  Star,
  Zap,
  Gift,
  ChevronRight,
  X,
  Banknote,
  CreditCard,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import type { Tables, Enums } from '@/integrations/supabase/types';
import logoOriginal from '@/assets/logo-hoppiness-original.jpg';
import heroBurger from '@/assets/hero-burger.jpg';
import { useProductModifiers, calculateModifiersTotal, validateSelections } from '@/hooks/useProductModifiers';
import { ProductModifierSelector } from '@/components/store/ProductModifierSelector';

type Branch = Tables<'branches'>;
type Product = Tables<'products'>;
type Category = Tables<'product_categories'>;
type PaymentMethod = Enums<'payment_method'>;

interface ProductWithPrice extends Product {
  finalPrice: number;
  category?: Category | null;
}

interface SelectedModifiers {
  [groupId: string]: string[];
}

interface CartItem {
  product: ProductWithPrice;
  quantity: number;
  modifiers?: SelectedModifiers;
  modifiersTotal?: number;
  notes?: string;
}

type OrderType = Enums<'order_type'>;

// Loyalty points simulation
const LOYALTY_POINTS = 350;
const POINTS_FOR_FREE_BURGER = 500;

export default function PedirBranch() {
  const { branchSlug } = useParams();
  const navigate = useNavigate();
  const categoryRefs = useRef<Map<string, HTMLElement>>(new Map());
  
  const [branch, setBranch] = useState<Branch | null>(null);
  const [products, setProducts] = useState<ProductWithPrice[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'delivery' | 'takeaway'>('delivery');
  const [userAddress, setUserAddress] = useState('');
  
  // Product customization
  const [selectedProduct, setSelectedProduct] = useState<ProductWithPrice | null>(null);
  const [modifierSelections, setModifierSelections] = useState<SelectedModifiers>({});
  const [productNotes, setProductNotes] = useState('');
  
  // Branch change confirmation
  const [pendingBranchChange, setPendingBranchChange] = useState<string | null>(null);
  
  // Dynamic modifiers hook
  const { modifiers: productModifiers, loading: modifiersLoading } = useProductModifiers(
    selectedProduct?.id || null,
    branch?.id || null
  );
  
  // Checkout
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'mercadopago'>('efectivo');
  const [cashAmount, setCashAmount] = useState('');

  useEffect(() => {
    const savedAddress = sessionStorage.getItem('orderAddress');
    const savedType = sessionStorage.getItem('orderType') as 'delivery' | 'takeaway';
    if (savedAddress) {
      setUserAddress(savedAddress);
      setDeliveryAddress(savedAddress);
    }
    if (savedType) setOrderType(savedType);
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (!branchSlug) return;
      
      setLoading(true);
      try {
        const { data: branchData } = await supabase
          .from('branches')
          .select('*')
          .eq('slug', branchSlug)
          .eq('is_active', true)
          .maybeSingle();

        if (!branchData) {
          toast.error('Sucursal no encontrada');
          navigate('/pedir');
          return;
        }

        setBranch(branchData);

        const { data: branchProducts } = await supabase
          .from('branch_products')
          .select(`
            is_available,
            custom_price,
            product:products(
              *,
              category:product_categories(*)
            )
          `)
          .eq('branch_id', branchData.id)
          .eq('is_available', true);

        const availableProducts: ProductWithPrice[] = (branchProducts || [])
          .filter(bp => bp.product && (bp.product as any).is_available)
          .map(bp => {
            const prod = bp.product as Product & { category?: Category };
            return {
              ...prod,
              finalPrice: bp.custom_price || prod.price,
              category: prod.category || null,
            };
          });

        // Sort by featured first, then by name
        availableProducts.sort((a, b) => {
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          return a.name.localeCompare(b.name);
        });

        setProducts(availableProducts);

        // Get unique categories
        const catMap = new Map<string, Category>();
        availableProducts.forEach(p => {
          if (p.category) {
            catMap.set(p.category.id, p.category);
          }
        });
        const sortedCategories = Array.from(catMap.values())
          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        setCategories(sortedCategories);
        
        if (sortedCategories.length > 0) {
          setActiveCategory(sortedCategories[0].id);
        }

      } catch (error: any) {
        toast.error('Error al cargar menú');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [branchSlug, navigate]);

  const scrollToCategory = (categoryId: string) => {
    setActiveCategory(categoryId);
    const ref = categoryRefs.current.get(categoryId);
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const openProductCustomization = (product: ProductWithPrice) => {
    setSelectedProduct(product);
    setModifierSelections({});
    setProductNotes('');
  };

  const addToCartWithExtras = () => {
    if (!selectedProduct) return;
    
    // Validate required selections
    const validation = validateSelections(productModifiers, modifierSelections);
    if (!validation.valid) {
      validation.errors.forEach(err => toast.error(err));
      return;
    }
    
    const modifiersTotal = calculateModifiersTotal(productModifiers, modifierSelections);

    const existingIndex = cart.findIndex(
      item => item.product.id === selectedProduct.id && 
              JSON.stringify(item.modifiers) === JSON.stringify(modifierSelections)
    );

    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, { 
        product: selectedProduct,
        quantity: 1,
        modifiers: modifierSelections,
        modifiersTotal,
        notes: productNotes
      }]);
    }
    
    toast.success(`${selectedProduct.name} agregado`);
    setSelectedProduct(null);
  };

  const updateQuantity = (index: number, delta: number) => {
    const newCart = [...cart];
    newCart[index].quantity += delta;
    if (newCart[index].quantity <= 0) {
      newCart.splice(index, 1);
    }
    setCart(newCart);
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.product.finalPrice + (item.modifiersTotal || 0)) * item.quantity, 0);
  const deliveryFee = orderType === 'delivery' ? 500 : 0;
  const total = subtotal + deliveryFee;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(price);

  const currentModifiersTotal = calculateModifiersTotal(productModifiers, modifierSelections);
  
  // Helper to get modifier names for cart display
  const getModifierNames = (item: CartItem): string[] => {
    const names: string[] = [];
    if (!item.modifiers) return names;
    
    productModifiers.forEach(group => {
      const selectedIds = item.modifiers?.[group.id] || [];
      selectedIds.forEach(optId => {
        const opt = group.options.find(o => o.id === optId);
        if (opt) names.push(opt.name);
      });
    });
    return names;
  };

  const handleCheckout = async () => {
    if (!branch || cart.length === 0) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error('Nombre y teléfono son requeridos');
      return;
    }
    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      toast.error('Dirección de entrega es requerida');
      return;
    }

    // For MercadoPago, we'd redirect to payment gateway
    // For now, we just create the order
    if (paymentMethod === 'mercadopago') {
      toast.info('Integración con MercadoPago próximamente');
      // In production: create preference and redirect
    }

    setIsProcessing(true);
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          branch_id: branch.id,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail || null,
          delivery_address: orderType === 'delivery' ? deliveryAddress : null,
          order_type: orderType as OrderType,
          subtotal,
          delivery_fee: deliveryFee,
          total,
          status: 'pending',
          notes: paymentMethod === 'efectivo' && cashAmount ? 
            `${notes || ''} | Paga con: $${cashAmount}`.trim() : notes || null,
          sales_channel: 'web_app',
          order_area: orderType === 'delivery' ? 'delivery' : 'mostrador',
          payment_method: paymentMethod as PaymentMethod,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map(item => {
        const modifierNames = getModifierNames(item);
        return {
          order_id: order.id,
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.finalPrice + (item.modifiersTotal || 0),
          notes: modifierNames.length > 0 
            ? `${modifierNames.join(', ')}${item.notes ? `. ${item.notes}` : ''}`
            : item.notes || null,
        };
      });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast.success('¡Pedido realizado con éxito!');
      navigate(`/pedido/${order.id}`);

    } catch (error: any) {
      toast.error('Error al crear pedido: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const featuredProducts = products.filter(p => p.is_featured);

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

  if (!branch) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Compact Header */}
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

        {/* Branch Info - Compact */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <div className="container mx-auto px-4 pb-4">
            <div className="flex items-center gap-2 text-xs mb-1">
              <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs py-0">
                <MapPin className="w-3 h-3 mr-1" />
                {userAddress ? userAddress.substring(0, 25) + '...' : 'Tu ubicación'}
              </Badge>
              {branch.is_open ? (
                <Badge className="bg-green-500/90 text-white text-xs py-0">Abierto</Badge>
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

      {/* Order Type Toggle - More Compact */}
      <div className="sticky top-0 z-30 bg-background border-b">
        <div className="container mx-auto px-4 py-2">
          <div className="flex gap-2">
            <Button
              variant={orderType === 'delivery' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setOrderType('delivery')}
              className="h-8 text-xs"
            >
              <Truck className="w-3 h-3 mr-1" />
              Delivery
            </Button>
            <Button
              variant={orderType === 'takeaway' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setOrderType('takeaway')}
              className="h-8 text-xs"
            >
              <ShoppingBag className="w-3 h-3 mr-1" />
              Pick-up
            </Button>
          </div>
        </div>
      </div>

      {/* Category Navigation */}
      {categories.length > 0 && (
        <div className="sticky top-[48px] z-20 bg-background border-b">
          <div className="container mx-auto px-4">
            <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
              {featuredProducts.length > 0 && (
                <Button
                  variant={activeCategory === 'featured' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setActiveCategory('featured');
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                  }}
                  className="shrink-0 h-7 text-xs"
                >
                  <Star className="w-3 h-3 mr-1" />
                  Best Sellers
                </Button>
              )}
              {categories.map(cat => (
                <Button
                  key={cat.id}
                  variant={activeCategory === cat.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => scrollToCategory(cat.id)}
                  className="shrink-0 h-7 text-xs"
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loyalty Banner */}
      <div className="container mx-auto px-4 py-3">
        <Card className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border-amber-500/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
                  <Gift className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-bold text-xs">Club Hoppiness 🍺 Gold</p>
                  <p className="text-[10px] text-muted-foreground">
                    {LOYALTY_POINTS} pts • Faltan {POINTS_FOR_FREE_BURGER - LOYALTY_POINTS} para burger gratis
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
            <Progress 
              value={(LOYALTY_POINTS / POINTS_FOR_FREE_BURGER) * 100} 
              className="mt-2 h-1.5"
            />
          </CardContent>
        </Card>
      </div>

      {/* Products by Category */}
      <div className="container mx-auto px-4 space-y-6 pb-8">
        {/* Best Sellers */}
        {featuredProducts.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              Best Sellers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {featuredProducts.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onAdd={() => openProductCustomization(product)}
                  cartQuantity={cart.filter(i => i.product.id === product.id).reduce((s, i) => s + i.quantity, 0)}
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
                    onAdd={() => openProductCustomization(product)}
                    cartQuantity={cart.filter(i => i.product.id === product.id).reduce((s, i) => s + i.quantity, 0)}
                    formatPrice={formatPrice}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
          <Button 
            size="lg" 
            className="w-full h-14 text-lg bg-primary hover:bg-primary/90 shadow-lg"
            onClick={() => setIsCartOpen(true)}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                <span>Ver Pedido ({cartCount})</span>
              </div>
              <span className="font-bold">{formatPrice(total)}</span>
            </div>
          </Button>
        </div>
      )}

      {/* Product Customization Sheet - Clean Modal Design */}
      <Sheet open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl p-0 flex flex-col bg-background">
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          
          {/* Close Button */}
          <Button 
            variant="ghost" 
            size="icon"
            className="absolute top-3 right-3 bg-muted hover:bg-muted/80 text-foreground rounded-full h-8 w-8 z-10"
            onClick={() => setSelectedProduct(null)}
          >
            <X className="w-4 h-4" />
          </Button>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 pb-4">
            {/* Product Image - Compact & Centered */}
            <div className="flex justify-center mb-4">
              <div className="relative w-40 h-40 rounded-2xl overflow-hidden shadow-lg">
                {selectedProduct?.image_url ? (
                  <img 
                    src={selectedProduct.image_url} 
                    alt={selectedProduct.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                    <span className="text-5xl">🍔</span>
                  </div>
                )}
              </div>
            </div>

            {/* Title and Price */}
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold">{selectedProduct?.name}</h2>
              <p className="text-2xl font-bold text-primary mt-1">
                {formatPrice(selectedProduct?.finalPrice || 0)}
              </p>
              {selectedProduct?.description && (
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-md mx-auto">
                  {selectedProduct.description}
                </p>
              )}
            </div>

            {/* Dynamic Modifiers */}
            {modifiersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : productModifiers.length > 0 ? (
              <ProductModifierSelector
                groups={productModifiers}
                selections={modifierSelections}
                onSelectionsChange={setModifierSelections}
                formatPrice={formatPrice}
              />
            ) : null}

            {/* Notes */}
            <div className="rounded-xl border p-3 mt-4">
              <Label htmlFor="notes" className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">¿Alguna indicación especial?</Label>
              <Textarea
                id="notes"
                placeholder="Ej: Sin cebolla, punto de la carne..."
                value={productNotes}
                onChange={(e) => setProductNotes(e.target.value)}
                className="mt-2 bg-transparent border-0 p-0 focus-visible:ring-0 resize-none"
                rows={2}
              />
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="shrink-0 p-4 border-t bg-background">
            <Button 
              className="w-full h-12 text-base font-semibold"
              onClick={addToCartWithExtras}
              disabled={modifiersLoading}
            >
              <Plus className="w-5 h-5 mr-2" />
              Agregar {formatPrice((selectedProduct?.finalPrice || 0) + currentModifiersTotal)}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Cart Sheet */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Tu Pedido
            </SheetTitle>
            <SheetDescription>Hoppiness {branch.name}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {cart.map((item, index) => {
              const itemModifierNames: string[] = [];
              if (item.modifiers) {
                productModifiers.forEach(group => {
                  const selectedIds = item.modifiers?.[group.id] || [];
                  selectedIds.forEach(optId => {
                    const opt = group.options.find(o => o.id === optId);
                    if (opt) itemModifierNames.push(opt.name);
                  });
                });
              }
              
              return (
                <div key={index} className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                  <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {item.product.image_url ? (
                      <img src={item.product.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl">🍔</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.product.name}</p>
                    {itemModifierNames.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        +{itemModifierNames.join(', ')}
                      </p>
                    )}
                    {item.modifiersTotal && item.modifiersTotal > 0 && (
                      <p className="text-xs text-primary">+{formatPrice(item.modifiersTotal)}</p>
                    )}
                    <p className="text-sm text-primary font-bold mt-1">
                      {formatPrice((item.product.finalPrice + (item.modifiersTotal || 0)) * item.quantity)}
                    </p>
                  </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(index, -1)}>
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-5 text-center text-sm font-medium">{item.quantity}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(index, 1)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(index)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {deliveryFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Envío</span>
                <span>{formatPrice(deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total</span>
              <span className="text-primary">{formatPrice(total)}</span>
            </div>
          </div>

          <SheetFooter className="mt-4">
            <Button 
              className="w-full h-12"
              onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }}
            >
              Continuar al checkout
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Checkout Sheet - Redesigned */}
      <Sheet open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl flex flex-col">
          <SheetHeader className="pb-4">
            <SheetTitle>Completá tu pedido</SheetTitle>
            <SheetDescription>Hoppiness {branch.name}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Order Type */}
            <div className="flex gap-2">
              <Button
                variant={orderType === 'takeaway' ? 'default' : 'outline'}
                onClick={() => setOrderType('takeaway')}
                className="flex-1"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Retiro
              </Button>
              {branch.delivery_enabled && (
                <Button
                  variant={orderType === 'delivery' ? 'default' : 'outline'}
                  onClick={() => setOrderType('delivery')}
                  className="flex-1"
                >
                  <Truck className="w-4 h-4 mr-2" />
                  Delivery
                </Button>
              )}
            </div>

            {/* Customer Info Card */}
            <Card className="shadow-sm">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  📍 Datos de entrega
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="name" className="text-xs">Nombre *</Label>
                    <Input
                      id="name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Tu nombre"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-xs">Teléfono *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="3512345678"
                      className="mt-1"
                    />
                  </div>
                  {orderType === 'delivery' && (
                    <div>
                      <Label htmlFor="address" className="text-xs">Dirección de entrega *</Label>
                      <Input
                        id="address"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Calle y número, barrio"
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Method Card */}
            <Card className="shadow-sm">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  💳 ¿Cómo vas a pagar?
                </h3>
                <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'efectivo' | 'mercadopago')}>
                  <div 
                    className={`flex items-center space-x-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                      paymentMethod === 'mercadopago' ? 'border-primary bg-primary/5' : 'border-muted hover:bg-muted/50'
                    }`}
                    onClick={() => setPaymentMethod('mercadopago')}
                  >
                    <RadioGroupItem value="mercadopago" id="mp" />
                    <CreditCard className="w-5 h-5 text-blue-500" />
                    <div className="flex-1">
                      <Label htmlFor="mp" className="font-medium cursor-pointer">Mercado Pago</Label>
                      <p className="text-xs text-muted-foreground">Tarjeta, QR o dinero en cuenta</p>
                    </div>
                    <img src="https://http2.mlstatic.com/frontend-assets/mp-web-navigation/ui-navigation/5.21.22/mercadopago/logo__small@2x.png" alt="MP" className="h-6" />
                  </div>
                  
                  <div 
                    className={`flex items-center space-x-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                      paymentMethod === 'efectivo' ? 'border-primary bg-primary/5' : 'border-muted hover:bg-muted/50'
                    }`}
                    onClick={() => setPaymentMethod('efectivo')}
                  >
                    <RadioGroupItem value="efectivo" id="cash" />
                    <Banknote className="w-5 h-5 text-green-600" />
                    <div className="flex-1">
                      <Label htmlFor="cash" className="font-medium cursor-pointer">Efectivo</Label>
                      <p className="text-xs text-muted-foreground">Pagás cuando recibís</p>
                    </div>
                  </div>
                </RadioGroup>

                {/* Cash Change Calculator */}
                {paymentMethod === 'efectivo' && (
                  <div className="bg-muted/50 rounded-xl p-4 mt-3">
                    <Label htmlFor="cashAmount" className="text-xs">¿Con cuánto abonás?</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        id="cashAmount"
                        type="number"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        placeholder={total.toString()}
                        className="bg-background"
                      />
                    </div>
                    {cashAmount && Number(cashAmount) >= total && (
                      <p className="text-xs text-green-600 mt-2">
                        Tu vuelto: {formatPrice(Number(cashAmount) - total)}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <Label htmlFor="orderNotes" className="text-xs">Notas adicionales (opcional)</Label>
                <Textarea
                  id="orderNotes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Indicaciones especiales, timbre, piso..."
                  rows={2}
                  className="mt-1"
                />
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card className="shadow-sm bg-muted/30">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal ({cartCount} items)</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Costo de envío</span>
                    <span>{formatPrice(deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(total)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sticky Footer CTA */}
          <div className="shrink-0 pt-4 border-t">
            <Button 
              className="w-full h-14 text-lg"
              onClick={handleCheckout}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : paymentMethod === 'mercadopago' ? (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Pagar con Mercado Pago
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Confirmar Pedido
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Product Card Component - Cleaner Design
interface ProductCardProps {
  product: ProductWithPrice;
  onAdd: () => void;
  cartQuantity: number;
  formatPrice: (price: number) => string;
}

function ProductCard({ product, onAdd, cartQuantity, formatPrice }: ProductCardProps) {
  return (
    <Card 
      className={`overflow-hidden cursor-pointer hover:shadow-md transition-all group ${
        cartQuantity > 0 ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onAdd}
    >
      <CardContent className="p-0">
        <div className="flex">
          {/* Text Content */}
          <div className="flex-1 p-3">
            <div className="flex items-start justify-between mb-0.5">
              <h3 className="font-bold text-sm line-clamp-2">{product.name}</h3>
              {product.is_featured && (
                <Badge variant="secondary" className="shrink-0 ml-2 text-[10px] py-0 px-1">
                  <Star className="w-2.5 h-2.5 mr-0.5 fill-current" />
                  Top
                </Badge>
              )}
            </div>
            {product.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {product.description}
              </p>
            )}
            <div className="flex items-center justify-between mt-auto">
              <span className="text-base font-bold text-primary">
                {formatPrice(product.finalPrice)}
              </span>
              <Button 
                variant={cartQuantity > 0 ? "default" : "outline"}
                size="sm" 
                className="rounded-full h-7 w-7 p-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                onClick={(e) => { e.stopPropagation(); onAdd(); }}
              >
                {cartQuantity > 0 ? cartQuantity : <Plus className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
          
          {/* Image */}
          <div className="w-24 h-24 md:w-28 md:h-28 shrink-0 bg-muted overflow-hidden rounded-lg m-2">
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-amber-100 to-orange-100">
                🍔
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
