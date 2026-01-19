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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
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
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import type { Tables, Enums } from '@/integrations/supabase/types';
import logoHoppiness from '@/assets/logo-hoppiness.png';
import heroBurger from '@/assets/hero-burger.jpg';

type Branch = Tables<'branches'>;
type Product = Tables<'products'>;
type Category = Tables<'product_categories'>;

interface ProductWithPrice extends Product {
  finalPrice: number;
  category?: Category | null;
}

interface CartItem {
  product: ProductWithPrice;
  quantity: number;
  extras?: string[];
  notes?: string;
}

type OrderType = Enums<'order_type'>;

// Upsell options for products
const UPSELL_OPTIONS = [
  { id: 'double', label: '¿La hacemos doble?', price: 2500, emoji: '🍔' },
  { id: 'bacon', label: 'Extra bacon', price: 800, emoji: '🥓' },
  { id: 'cheese', label: 'Extra cheddar', price: 500, emoji: '🧀' },
  { id: 'egg', label: 'Agregale huevo', price: 600, emoji: '🍳' },
];

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
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [productNotes, setProductNotes] = useState('');
  
  // Checkout
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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
    setSelectedExtras([]);
    setProductNotes('');
  };

  const addToCartWithExtras = () => {
    if (!selectedProduct) return;
    
    const extrasTotal = selectedExtras.reduce((sum, extraId) => {
      const extra = UPSELL_OPTIONS.find(o => o.id === extraId);
      return sum + (extra?.price || 0);
    }, 0);

    const existingIndex = cart.findIndex(
      item => item.product.id === selectedProduct.id && 
              JSON.stringify(item.extras) === JSON.stringify(selectedExtras)
    );

    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, { 
        product: { ...selectedProduct, finalPrice: selectedProduct.finalPrice + extrasTotal },
        quantity: 1,
        extras: selectedExtras,
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

  const subtotal = cart.reduce((sum, item) => sum + item.product.finalPrice * item.quantity, 0);
  const deliveryFee = orderType === 'delivery' ? 500 : 0;
  const total = subtotal + deliveryFee;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(price);

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
          notes: notes || null,
          sales_channel: 'web_app',
          order_area: orderType === 'delivery' ? 'delivery' : 'mostrador',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.finalPrice,
        notes: item.extras?.length ? `Extras: ${item.extras.join(', ')}. ${item.notes || ''}` : item.notes || null,
      }));

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
        <div className="h-64 bg-muted animate-pulse" />
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!branch) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Header */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBurger})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
        
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 z-20">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/pedir">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <img src={logoHoppiness} alt="Hoppiness" className="h-10 w-10" />
            <div className="w-10" />
          </div>
        </div>

        {/* Branch Info */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <div className="container mx-auto px-4 pb-6">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-primary/90 text-primary-foreground">
                <MapPin className="w-3 h-3 mr-1" />
                {userAddress || 'Tu ubicación'}
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white font-brand">
              Hoppiness {branch.name}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-white/80 text-sm">
              <span className="flex items-center gap-1">
                <Zap className="w-4 h-4" />
                ~{branch.estimated_prep_time_min || 25} min
              </span>
              {branch.is_open ? (
                <Badge className="bg-green-500 text-white">Abierto</Badge>
              ) : (
                <Badge variant="destructive">Cerrado</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Order Type Toggle */}
      <div className="sticky top-0 z-30 bg-background border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex gap-2">
            <Button
              variant={orderType === 'delivery' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setOrderType('delivery')}
              className={orderType === 'delivery' ? 'bg-primary' : ''}
            >
              <Truck className="w-4 h-4 mr-2" />
              Delivery
            </Button>
            <Button
              variant={orderType === 'takeaway' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setOrderType('takeaway')}
              className={orderType === 'takeaway' ? 'bg-primary' : ''}
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Pick-up
            </Button>
          </div>
        </div>
      </div>

      {/* Category Navigation */}
      {categories.length > 0 && (
        <div className="sticky top-[60px] z-20 bg-background border-b">
          <div className="container mx-auto px-4">
            <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
              {featuredProducts.length > 0 && (
                <Button
                  variant={activeCategory === 'featured' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setActiveCategory('featured');
                    window.scrollTo({ top: 400, behavior: 'smooth' });
                  }}
                  className="shrink-0"
                >
                  <Star className="w-4 h-4 mr-1" />
                  Best Sellers
                </Button>
              )}
              {categories.map(cat => (
                <Button
                  key={cat.id}
                  variant={activeCategory === cat.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => scrollToCategory(cat.id)}
                  className="shrink-0"
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loyalty Banner */}
      <div className="container mx-auto px-4 py-4">
        <Card className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-sm">Club Hoppiness 🍺 Gold</p>
                  <p className="text-xs text-muted-foreground">
                    {LOYALTY_POINTS} puntos • Te faltan {POINTS_FOR_FREE_BURGER - LOYALTY_POINTS} para tu burger gratis
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
            <Progress 
              value={(LOYALTY_POINTS / POINTS_FOR_FREE_BURGER) * 100} 
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Products by Category */}
      <div className="container mx-auto px-4 space-y-8 pb-8">
        {/* Best Sellers */}
        {featuredProducts.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              Best Sellers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <h2 className="text-xl font-bold mb-4">{category.name}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Product Customization Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedProduct?.name}</DialogTitle>
            <DialogDescription>{selectedProduct?.description}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Product Image */}
            <div className="aspect-video rounded-lg bg-muted overflow-hidden">
              {selectedProduct?.image_url ? (
                <img 
                  src={selectedProduct.image_url} 
                  alt={selectedProduct.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">🍔</div>
              )}
            </div>

            {/* Upsell Options */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm">¿Querés hacerla más épica?</h4>
              {UPSELL_OPTIONS.map(option => (
                <div 
                  key={option.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => {
                    setSelectedExtras(prev => 
                      prev.includes(option.id) 
                        ? prev.filter(id => id !== option.id)
                        : [...prev, option.id]
                    );
                  }}
                >
                  <Checkbox 
                    checked={selectedExtras.includes(option.id)}
                    onCheckedChange={() => {}}
                  />
                  <span className="text-xl">{option.emoji}</span>
                  <span className="flex-1 font-medium">{option.label}</span>
                  <span className="text-sm text-primary font-bold">+{formatPrice(option.price)}</span>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">¿Alguna indicación especial?</Label>
              <Textarea
                id="notes"
                placeholder="Ej: Sin cebolla, punto de la carne..."
                value={productNotes}
                onChange={(e) => setProductNotes(e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              className="w-full h-12"
              onClick={addToCartWithExtras}
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar {formatPrice(
                (selectedProduct?.finalPrice || 0) + 
                selectedExtras.reduce((sum, id) => sum + (UPSELL_OPTIONS.find(o => o.id === id)?.price || 0), 0)
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            {cart.map((item, index) => (
              <div key={index} className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {item.product.image_url ? (
                    <img src={item.product.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">🍔</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.product.name}</p>
                  {item.extras && item.extras.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      +{item.extras.map(id => UPSELL_OPTIONS.find(o => o.id === id)?.label).join(', ')}
                    </p>
                  )}
                  <p className="text-sm text-primary font-bold mt-1">
                    {formatPrice(item.product.finalPrice * item.quantity)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(index, -1)}>
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(index, 1)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(index)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
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

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Completá tu pedido</DialogTitle>
            <DialogDescription>Hoppiness {branch.name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
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

            {/* Customer Info */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <Label htmlFor="phone">Teléfono *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="3512345678"
                />
              </div>
              <div>
                <Label htmlFor="email">Email (opcional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="tu@email.com"
                />
              </div>
              {orderType === 'delivery' && (
                <div>
                  <Label htmlFor="address">Dirección de entrega *</Label>
                  <Input
                    id="address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Calle y número, barrio"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="orderNotes">Notas (opcional)</Label>
                <Textarea
                  id="orderNotes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Indicaciones especiales..."
                  rows={2}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="border-t pt-4 space-y-1 text-sm">
              <div className="flex justify-between font-bold text-lg">
                <span>Total a pagar</span>
                <span className="text-primary">{formatPrice(total)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              className="w-full h-12"
              onClick={handleCheckout}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ShoppingCart className="w-4 h-4 mr-2" />
              )}
              Confirmar Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Product Card Component
interface ProductCardProps {
  product: ProductWithPrice;
  onAdd: () => void;
  cartQuantity: number;
  formatPrice: (price: number) => string;
}

function ProductCard({ product, onAdd, cartQuantity, formatPrice }: ProductCardProps) {
  return (
    <Card 
      className={`overflow-hidden cursor-pointer hover:shadow-lg transition-all ${
        cartQuantity > 0 ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onAdd}
    >
      <CardContent className="p-0">
        <div className="flex">
          {/* Text Content */}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-bold text-base line-clamp-2">{product.name}</h3>
              {product.is_featured && (
                <Badge variant="secondary" className="shrink-0 ml-2">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  Top
                </Badge>
              )}
            </div>
            {product.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {product.description}
              </p>
            )}
            <div className="flex items-center justify-between mt-auto">
              <span className="text-lg font-bold text-primary">
                {formatPrice(product.finalPrice)}
              </span>
              <Button 
                size="sm" 
                className="rounded-full w-8 h-8 p-0"
                onClick={(e) => { e.stopPropagation(); onAdd(); }}
              >
                {cartQuantity > 0 ? cartQuantity : <Plus className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          
          {/* Image */}
          <div className="w-28 h-28 md:w-32 md:h-32 shrink-0 bg-muted overflow-hidden">
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl bg-muted">
                🍔
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
