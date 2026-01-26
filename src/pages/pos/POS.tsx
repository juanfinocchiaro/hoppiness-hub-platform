import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  ArrowLeft,
  Store,
  Utensils,
  Bike,
  Search,
  ChefHat
} from 'lucide-react';
import { toast } from 'sonner';
import type { Tables, Enums } from '@/integrations/supabase/types';

type Product = Tables<'products'>;
type Category = Tables<'product_categories'>;
type Branch = Tables<'branches'>;
type BranchProduct = Tables<'branch_products'>;

type SalesChannel = 'atencion_presencial' | 'whatsapp' | 'mas_delivery' | 'pedidos_ya' | 'rappi' | 'mercadopago_delivery';
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

const SALES_CHANNELS: { value: SalesChannel; label: string; icon: React.ElementType }[] = [
  { value: 'atencion_presencial', label: 'Atención Presencial', icon: Store },
  { value: 'whatsapp', label: 'WhatsApp', icon: Phone },
  { value: 'mas_delivery', label: 'MásDelivery', icon: Bike },
  { value: 'pedidos_ya', label: 'PedidosYa', icon: Bike },
  { value: 'rappi', label: 'Rappi', icon: Bike },
  { value: 'mercadopago_delivery', label: 'MP Delivery', icon: Bike },
];

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

export default function POS() {
  const navigate = useNavigate();
  const { isSuperadmin, accessibleBranches, loading: roleLoading } = usePermissionsV2();
  
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [products, setProducts] = useState<ProductWithAvailability[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Order configuration
  const [salesChannel, setSalesChannel] = useState<SalesChannel>('atencion_presencial');
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

  // Auto-select branch if user only has access to one
  useEffect(() => {
    if (!roleLoading && accessibleBranches.length === 1) {
      setSelectedBranch(accessibleBranches[0]);
    }
  }, [roleLoading, accessibleBranches]);

  // Fetch products when branch is selected
  useEffect(() => {
    if (!selectedBranch) {
      setLoading(false);
      return;
    }

    async function fetchProducts() {
      setLoading(true);
      const [productsRes, categoriesRes, branchProductsRes] = await Promise.all([
        supabase.from('products').select('*').eq('is_active', true).order('name'),
        supabase.from('product_categories').select('*').eq('is_active', true).order('display_order'),
        supabase.from('branch_products').select('*').eq('branch_id', selectedBranch!.id),
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);

      if (productsRes.data) {
        const branchProductsMap = new Map(
          (branchProductsRes.data || []).map(bp => [bp.product_id, bp])
        );

        // Only show products available in this branch
        const availableProducts = productsRes.data
          .map(p => ({
            ...p,
            branchProduct: branchProductsMap.get(p.id) || null,
          }))
          .filter(p => p.branchProduct?.is_available !== false);

        setProducts(availableProducts);
      }

      setLoading(false);
    }

    fetchProducts();
  }, [selectedBranch]);

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
  const deliveryFee = orderArea === 'delivery' ? 500 : 0; // Placeholder delivery fee
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
    if (!selectedBranch || cart.length === 0) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error('Nombre y teléfono son requeridos');
      return;
    }

    setIsProcessing(true);

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          branch_id: selectedBranch.id,
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

      // Create order items
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
      
      // Reset form
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

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-32 w-32" />
      </div>
    );
  }

  // Branch selection screen
  if (!selectedBranch) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            className="mb-4"
            onClick={() => navigate('/local')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al panel
          </Button>
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Punto de Venta</h1>
            <p className="text-muted-foreground">Seleccioná la sucursal para comenzar</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accessibleBranches.map(branch => (
              <Card 
                key={branch.id}
                className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary"
                onClick={() => setSelectedBranch(branch)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="w-5 h-5 text-primary" />
                    {branch.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {branch.city}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{branch.address}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {accessibleBranches.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No tenés acceso a ninguna sucursal. Contactá al administrador.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col lg:flex-row">
      {/* Products Section */}
      <div className="flex-1 p-4 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/local')}
              className="text-muted-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSelectedBranch(null)}
              className="text-muted-foreground"
            >
              Cambiar sucursal
            </Button>
            <div>
              <h1 className="text-xl font-bold">{selectedBranch.name}</h1>
              <p className="text-sm text-muted-foreground">POS - Punto de Venta</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* KDS Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/pos/${selectedBranch.id}/kds`)}
              className="gap-1 bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
            >
              <ChefHat className="w-4 h-4" />
              <span className="hidden sm:inline">Cocina</span>
            </Button>
            
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
              Pedido
            </h2>
            <Badge variant="outline">{cart.length} items</Badge>
          </div>
          
          {/* Sales Channel */}
          <div className="mt-3">
            <Label className="text-xs text-muted-foreground">Canal de Venta</Label>
            <Select value={salesChannel} onValueChange={(v) => setSalesChannel(v as SalesChannel)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SALES_CHANNELS.map(channel => (
                  <SelectItem key={channel.value} value={channel.value}>
                    {channel.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Caller Number for Salon */}
          {orderArea === 'salon' && (
            <div className="mt-3">
              <Label className="text-xs text-muted-foreground">Nº Llamador</Label>
              <Input
                type="number"
                placeholder="Ej: 15"
                value={callerNumber}
                onChange={(e) => setCallerNumber(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </div>

        {/* Cart Items */}
        <ScrollArea className="flex-1 p-4">
          {cart.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>Carrito vacío</p>
              <p className="text-sm">Seleccioná productos para agregar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-3 bg-muted/50 rounded-lg p-2">
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {item.product.image_url ? (
                      <img src={item.product.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>🍔</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.product.name}</p>
                    <p className="text-sm text-primary font-bold">
                      {formatPrice(getItemPrice(item) * item.quantity)}
                    </p>
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
                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.product.id, 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => removeFromCart(item.product.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Totals and Checkout */}
        <div className="p-4 border-t bg-muted/30">
          <div className="space-y-1 text-sm mb-4">
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
            <Separator className="my-2" />
            <div className="flex justify-between text-lg font-bold">
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
            Procesar Pedido
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar Pedido</DialogTitle>
            <DialogDescription>
              Completá los datos del cliente y seleccioná el método de pago
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Customer Info */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="customerName">Nombre del Cliente *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="customerName"
                    placeholder="Nombre"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Teléfono *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="customerPhone"
                    placeholder="351 123 4567"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {orderArea === 'delivery' && (
                <div className="space-y-2">
                  <Label htmlFor="deliveryAddress">Dirección de Entrega *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="deliveryAddress"
                      placeholder="Dirección completa"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.slice(0, 6).map(method => (
                  <Button
                    key={method.value}
                    variant={paymentMethod === method.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPaymentMethod(method.value)}
                    className="flex-col h-auto py-2 gap-1"
                  >
                    <method.icon className="w-4 h-4" />
                    <span className="text-xs">{method.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total a Cobrar</span>
                <span className="text-primary">{formatPrice(total)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCheckout} disabled={isProcessing}>
              {isProcessing ? 'Procesando...' : 'Confirmar Pedido'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
