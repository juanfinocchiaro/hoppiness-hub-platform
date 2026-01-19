import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  User, 
  MapPin, 
  Phone,
  CreditCard,
  Banknote,
  QrCode,
  ArrowRight,
  Store,
  Utensils,
  Bike,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Tables, Enums } from '@/integrations/supabase/types';

type Product = Tables<'products'>;
type Category = Tables<'product_categories'>;
type Branch = Tables<'branches'>;
type BranchProduct = Tables<'branch_products'>;

type OrderArea = 'salon' | 'mostrador' | 'delivery';
type PaymentMethod = 'efectivo' | 'tarjeta_debito' | 'tarjeta_credito' | 'mercadopago_qr' | 'mercadopago_link' | 'transferencia' | 'vales';
type OrderType = Enums<'order_type'>;

interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
  customPrice?: number;
}

interface ProductWithAvailability extends Product {
  branchProduct: BranchProduct | null;
}

interface POSViewProps {
  branch: Branch;
}

const ORDER_AREAS: { value: OrderArea; label: string; icon: React.ElementType }[] = [
  { value: 'salon', label: 'Salón', icon: Utensils },
  { value: 'mostrador', label: 'Mostrador', icon: Store },
  { value: 'delivery', label: 'Delivery', icon: Bike },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: 'efectivo', label: 'Efectivo', icon: Banknote },
  { value: 'tarjeta_debito', label: 'Débito', icon: CreditCard },
  { value: 'tarjeta_credito', label: 'Crédito', icon: CreditCard },
  { value: 'mercadopago_qr', label: 'MP QR', icon: QrCode },
  { value: 'mercadopago_link', label: 'MP Link', icon: CreditCard },
  { value: 'transferencia', label: 'Transferencia', icon: CreditCard },
  { value: 'vales', label: 'Vales', icon: CreditCard },
];

export default function POSView({ branch }: POSViewProps) {
  const navigate = useNavigate();
  
  const [products, setProducts] = useState<ProductWithAvailability[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Order configuration
  const [orderArea, setOrderArea] = useState<OrderArea>('mostrador');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [callerNumber, setCallerNumber] = useState<string>('');
  
  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  
  // Checkout dialog
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch products when branch changes
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      const [productsRes, categoriesRes, branchProductsRes] = await Promise.all([
        supabase.from('products').select('*').eq('is_available', true),
        supabase.from('product_categories').select('*').eq('is_active', true).order('display_order'),
        supabase.from('branch_products').select('*').eq('branch_id', branch.id),
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);

      if (productsRes.data && categoriesRes.data) {
        const branchProductsMap = new Map(
          (branchProductsRes.data || []).map(bp => [bp.product_id, bp])
        );

        // Create a map of category display_order for sorting
        const categoryOrderMap = new Map(
          categoriesRes.data.map(c => [c.id, c.display_order ?? 999])
        );

        const availableProducts = productsRes.data
          .map(p => ({
            ...p,
            branchProduct: branchProductsMap.get(p.id) || null,
          }))
          .filter(p => p.branchProduct?.is_available !== false)
          // Sort by category display_order first, then by product name
          .sort((a, b) => {
            const catOrderA = categoryOrderMap.get(a.category_id || '') ?? 999;
            const catOrderB = categoryOrderMap.get(b.category_id || '') ?? 999;
            if (catOrderA !== catOrderB) return catOrderA - catOrderB;
            return a.name.localeCompare(b.name);
          });

        setProducts(availableProducts);
      }

      setLoading(false);
    }

    fetchProducts();
  }, [branch.id]);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product, branchProduct: BranchProduct | null) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    const price = branchProduct?.custom_price || product.price;
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1, customPrice: price !== product.price ? price : undefined }]);
    }
    toast.success(`${product.name} agregado`);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const getItemPrice = (item: CartItem) => {
    return item.customPrice || item.product.price;
  };

  const subtotal = cart.reduce((sum, item) => sum + getItemPrice(item) * item.quantity, 0);
  const deliveryFee = orderArea === 'delivery' ? 500 : 0;
  const total = subtotal + deliveryFee;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const mapOrderType = (): OrderType => {
    switch (orderArea) {
      case 'salon': return 'dine_in';
      case 'delivery': return 'delivery';
      default: return 'takeaway';
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error('Nombre y teléfono son requeridos');
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
          delivery_address: orderArea === 'delivery' ? deliveryAddress : null,
          order_type: mapOrderType(),
          subtotal,
          delivery_fee: deliveryFee,
          total,
          status: 'pending',
          notes: callerNumber ? `Llamador: ${callerNumber}` : null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: getItemPrice(item),
        notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast.success('Pedido creado exitosamente');
      
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setDeliveryAddress('');
      setCallerNumber('');
      setIsCheckoutOpen(false);

    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Error al crear el pedido');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)] -m-6">
      {/* Products Section */}
      <div className="flex-1 p-4 overflow-hidden flex flex-col bg-muted/30">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">{branch.name}</h1>
            <p className="text-sm text-muted-foreground">Punto de Venta</p>
          </div>
          
          {/* Order Area Selector */}
          <div className="flex bg-card rounded-lg p-1 border">
            {ORDER_AREAS.map(area => (
              <Button
                key={area.value}
                variant={orderArea === area.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setOrderArea(area.value)}
                className="gap-1"
              >
                <area.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{area.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Products Grid */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pb-4">
              {filteredProducts.map(product => {
                const price = product.branchProduct?.custom_price || product.price;
                const cartItem = cart.find(item => item.product.id === product.id);
                
                return (
                  <Card 
                    key={product.id}
                    className={`cursor-pointer hover:shadow-md transition-all relative ${cartItem ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => addToCart(product, product.branchProduct)}
                  >
                    {cartItem && (
                      <Badge className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 flex items-center justify-center">
                        {cartItem.quantity}
                      </Badge>
                    )}
                    <CardContent className="p-3">
                      <div className="w-full h-16 rounded bg-muted flex items-center justify-center mb-2 overflow-hidden">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">🍔</span>
                        )}
                      </div>
                      <p className="font-medium text-sm line-clamp-2">{product.name}</p>
                      <p className="text-primary font-bold">{formatPrice(price)}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Cart Section */}
      <div className="w-full lg:w-96 bg-card border-t lg:border-t-0 lg:border-l flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Pedido Actual
            </h2>
            {cart.length > 0 && (
              <Badge variant="secondary">{cart.reduce((sum, item) => sum + item.quantity, 0)} items</Badge>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          {cart.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>El carrito está vacío</p>
              <p className="text-sm">Tocá productos para agregar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.product.name}</p>
                    <p className="text-primary font-semibold text-sm">{formatPrice(getItemPrice(item))}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.product.id, -1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-6 text-center font-medium text-sm">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.product.id, 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Cart Footer */}
        <div className="border-t p-4 space-y-3">
          <div className="space-y-1 text-sm">
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
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">{formatPrice(total)}</span>
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
          >
            Confirmar Pedido
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Pedido</DialogTitle>
            <DialogDescription>
              Ingresá los datos del cliente para completar el pedido
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre del cliente *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nombre"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Teléfono *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Teléfono"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {orderArea === 'delivery' && (
              <div className="space-y-2">
                <Label>Dirección de entrega</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Dirección"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Método de pago</Label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.slice(0, 6).map(method => (
                  <Button
                    key={method.value}
                    variant={paymentMethod === method.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPaymentMethod(method.value)}
                    className="flex-col h-auto py-2"
                  >
                    <method.icon className="w-4 h-4 mb-1" />
                    <span className="text-xs">{method.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="bg-muted rounded-lg p-3">
              <div className="flex justify-between font-bold">
                <span>Total a cobrar</span>
                <span className="text-primary">{formatPrice(total)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCheckout} disabled={isProcessing}>
              {isProcessing ? 'Procesando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
