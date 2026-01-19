import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { 
  ArrowLeft, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2,
  Clock,
  MapPin,
  Phone,
  User,
  CreditCard,
  Truck,
  ShoppingBag
} from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import logoHoppiness from '@/assets/logo-hoppiness.png';

type Branch = Tables<'branches'>;
type Product = Tables<'products'>;
type Category = Tables<'product_categories'>;

interface ProductWithPrice extends Product {
  finalPrice: number;
  category?: { name: string } | null;
}

interface CartItem {
  product: ProductWithPrice;
  quantity: number;
}

export default function MenuBranch() {
  const { branchSlug } = useParams();
  
  const [branch, setBranch] = useState<Branch | null>(null);
  const [products, setProducts] = useState<ProductWithPrice[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orderType, setOrderType] = useState<'delivery' | 'takeaway'>('takeaway');
  
  // Customer form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!branchSlug) return;
      
      setLoading(true);
      try {
        // Fetch branch by slug
        const { data: branchData, error: branchError } = await supabase
          .from('branches')
          .select('*')
          .eq('slug', branchSlug)
          .eq('is_active', true)
          .maybeSingle();

        if (branchError) throw branchError;
        if (!branchData) {
          toast.error('Sucursal no encontrada');
          return;
        }

        setBranch(branchData);

        // Fetch products available in this branch
        // Logic: active_global (is_available) AND active_in_branch (branch_products.is_available)
        const { data: branchProducts, error: bpError } = await supabase
          .from('branch_products')
          .select(`
            is_available,
            custom_price,
            product:products(
              *,
              category:product_categories(name)
            )
          `)
          .eq('branch_id', branchData.id)
          .eq('is_available', true);

        if (bpError) throw bpError;

        // Filter only globally active products and map prices
        const availableProducts: ProductWithPrice[] = (branchProducts || [])
          .filter(bp => bp.product && (bp.product as any).is_available)
          .map(bp => {
            const prod = bp.product as Product & { category?: { name: string } };
            return {
              ...prod,
              finalPrice: bp.custom_price || prod.price,
              category: prod.category,
            };
          });

        setProducts(availableProducts);

        // Get unique categories from products
        const categoryMap = new Map<string, Category>();
        availableProducts.forEach(p => {
          if (p.category_id && p.category) {
            categoryMap.set(p.category_id, { 
              id: p.category_id, 
              name: p.category.name,
              is_active: true,
              created_at: '',
              description: null,
              display_order: null,
              image_url: null
            });
          }
        });
        setCategories(Array.from(categoryMap.values()));

      } catch (error: any) {
        toast.error('Error al cargar menú: ' + error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [branchSlug]);

  const filteredProducts = products.filter(p => 
    selectedCategory === 'all' || p.category_id === selectedCategory
  );

  const addToCart = (product: ProductWithPrice) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
    toast.success(`${product.name} agregado`);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
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
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          branch_id: branch.id,
          customer_name: customerName,
          customer_phone: customerPhone,
          delivery_address: orderType === 'delivery' ? deliveryAddress : null,
          order_type: orderType,
          subtotal,
          delivery_fee: deliveryFee,
          total,
          status: 'pending',
          notes: notes || null,
          sales_channel: 'atencion_presencial',
          order_area: orderType === 'delivery' ? 'delivery' : 'mostrador',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items with snapshot of price
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.finalPrice,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast.success('¡Pedido realizado con éxito!');
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setDeliveryAddress('');
      setNotes('');
      setIsCheckoutOpen(false);

    } catch (error: any) {
      toast.error('Error al crear pedido: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-primary text-primary-foreground p-4">
          <Skeleton className="h-8 w-48 bg-primary-foreground/20" />
        </div>
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Sucursal no encontrada</h1>
          <Link to="/menu">
            <Button>Ver todas las sucursales</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/menu">
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-bold">{branch.name}</h1>
              <p className="text-xs text-primary-foreground/70 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {branch.city}
              </p>
            </div>
          </div>
          <img src={logoHoppiness} alt="Hoppiness" className="h-10 w-10" />
        </div>
      </header>

      {/* Branch Info Banner */}
      <div className="bg-muted border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-muted-foreground" />
            {/* @ts-ignore */}
            <span>~{branch.estimated_prep_time_min || 20} min</span>
          </div>
          {/* @ts-ignore */}
          {branch.status_message && (
            <Badge variant="secondary" className="text-xs">
              {/* @ts-ignore */}
              {branch.status_message}
            </Badge>
          )}
        </div>
      </div>

      {/* Order Type Toggle */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex gap-2">
          <Button
            variant={orderType === 'takeaway' ? 'default' : 'outline'}
            onClick={() => setOrderType('takeaway')}
            className="flex-1"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Retiro
          </Button>
          {/* @ts-ignore */}
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
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="container mx-auto px-4 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              Todos
            </Button>
            {categories.map(cat => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="container mx-auto px-4">
        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No hay productos disponibles
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map(product => {
              const cartItem = cart.find(i => i.product.id === product.id);
              
              return (
                <Card 
                  key={product.id}
                  className={`cursor-pointer hover:shadow-lg transition-all relative ${cartItem ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => addToCart(product)}
                >
                  {cartItem && (
                    <Badge className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 flex items-center justify-center z-10">
                      {cartItem.quantity}
                    </Badge>
                  )}
                  <CardContent className="p-3">
                    <div className="aspect-square rounded-lg bg-muted flex items-center justify-center mb-3 overflow-hidden">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl">🍔</span>
                      )}
                    </div>
                    <p className="font-medium text-sm line-clamp-2 mb-1">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{product.description}</p>
                    )}
                    <p className="text-primary font-bold">{formatPrice(product.finalPrice)}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Fixed Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg p-4">
          <div className="container mx-auto flex items-center justify-between">
            <div>
              <p className="font-bold text-lg">{formatPrice(total)}</p>
              <p className="text-sm text-muted-foreground">{cartCount} productos</p>
            </div>
            <Button size="lg" onClick={() => setIsCheckoutOpen(true)}>
              <ShoppingCart className="w-5 h-5 mr-2" />
              Ver Pedido
            </Button>
          </div>
        </div>
      )}

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tu Pedido</DialogTitle>
            <DialogDescription>{branch.name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Cart Items */}
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {item.product.image_url ? (
                      <img src={item.product.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>🍔</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.product.name}</p>
                    <p className="text-sm text-primary font-bold">
                      {formatPrice(item.product.finalPrice * item.quantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product.id, -1)}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product.id, 1)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.product.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t pt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Envío</span>
                  <span>{formatPrice(deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-primary">{formatPrice(total)}</span>
              </div>
            </div>

            {/* Customer Form */}
            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium">Tus Datos</h4>
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Tu nombre"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="351 123 4567"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              {orderType === 'delivery' && (
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección de Entrega *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="address"
                      placeholder="Calle, número, piso..."
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Instrucciones especiales..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>
              Seguir Comprando
            </Button>
            <Button onClick={handleCheckout} disabled={isProcessing}>
              {isProcessing ? 'Procesando...' : `Confirmar ${formatPrice(total)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
