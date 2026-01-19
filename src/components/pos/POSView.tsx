import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
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
  Wallet,
  X,
  ChefHat,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import type { Tables, Enums } from '@/integrations/supabase/types';

type Product = Tables<'products'>;
type Category = Tables<'product_categories'>;
type Branch = Tables<'branches'>;
type BranchProduct = Tables<'branch_products'>;

interface ModifierGroup {
  id: string;
  name: string;
  description: string | null;
  selection_type: 'single' | 'multiple';
  min_selections: number;
  max_selections: number | null;
  display_order: number;
  options: ModifierOption[];
}

interface ModifierOption {
  id: string;
  group_id: string;
  name: string;
  price_adjustment: number;
  display_order: number;
}

interface SelectedModifier {
  optionId: string;
  optionName: string;
  groupName: string;
  priceAdjustment: number;
}

interface CashRegister {
  id: string;
  name: string;
  display_order: number;
}

interface CashRegisterShift {
  id: string;
  cash_register_id: string;
  status: string;
}

type OrderArea = 'salon' | 'mostrador' | 'delivery';
type PaymentMethod = 'efectivo' | 'tarjeta_debito' | 'tarjeta_credito' | 'mercadopago_qr' | 'mercadopago_link' | 'transferencia' | 'vales';
type OrderType = Enums<'order_type'>;

interface CartItem {
  id: string; // Unique cart item ID
  product: Product;
  quantity: number;
  notes?: string;
  customPrice?: number;
  modifiers: SelectedModifier[];
  modifiersTotal: number;
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
  const { user } = useAuth();
  
  const [products, setProducts] = useState<ProductWithAvailability[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modifierGroups, setModifierGroups] = useState<Record<string, ModifierGroup[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Cash register state
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [selectedCashRegister, setSelectedCashRegister] = useState<string>('');
  const [activeShift, setActiveShift] = useState<CashRegisterShift | null>(null);
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Order configuration
  const [orderArea, setOrderArea] = useState<OrderArea>('mostrador');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  
  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  
  // Checkout dialog
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Product modifier dialog
  const [selectedProduct, setSelectedProduct] = useState<ProductWithAvailability | null>(null);
  const [productModifiers, setProductModifiers] = useState<ModifierGroup[]>([]);
  const [tempSelectedModifiers, setTempSelectedModifiers] = useState<Record<string, string[]>>({});
  const [tempNotes, setTempNotes] = useState('');
  const [loadingModifiers, setLoadingModifiers] = useState(false);

  // Fetch cash registers
  useEffect(() => {
    async function fetchCashRegisters() {
      const { data } = await supabase
        .from('cash_registers')
        .select('id, name, display_order')
        .eq('branch_id', branch.id)
        .eq('is_active', true)
        .order('display_order');
      
      if (data && data.length > 0) {
        setCashRegisters(data);
        setSelectedCashRegister(data[0].id);
      }
    }
    
    fetchCashRegisters();
  }, [branch.id]);

  // Check for active shift
  useEffect(() => {
    async function checkActiveShift() {
      if (!selectedCashRegister) return;
      
      const { data } = await supabase
        .from('cash_register_shifts')
        .select('id, cash_register_id, status')
        .eq('cash_register_id', selectedCashRegister)
        .eq('status', 'open')
        .limit(1)
        .single();
      
      setActiveShift(data as CashRegisterShift | null);
    }
    
    checkActiveShift();
  }, [selectedCashRegister]);

  // Fetch products and categories
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

        const categoryOrderMap = new Map(
          categoriesRes.data.map(c => [c.id, c.display_order ?? 999])
        );

        const availableProducts = productsRes.data
          .map(p => ({
            ...p,
            branchProduct: branchProductsMap.get(p.id) || null,
          }))
          .filter(p => p.branchProduct?.is_available !== false)
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

  // Handle product click - fetch modifiers and show dialog
  const handleProductClick = async (product: ProductWithAvailability) => {
    setSelectedProduct(product);
    setTempNotes('');
    setTempSelectedModifiers({});
    setLoadingModifiers(true);

    // Fetch modifier group assignments for this product
    const { data: assignments } = await supabase
      .from('product_modifier_assignments')
      .select(`
        modifier_group_id,
        display_order,
        modifier_groups (
          id,
          name,
          description,
          selection_type,
          min_selections,
          max_selections,
          is_active
        )
      `)
      .eq('product_id', product.id)
      .eq('is_enabled', true);

    if (assignments && assignments.length > 0) {
      // Get active groups
      const activeGroups = assignments
        .filter(a => a.modifier_groups && (a.modifier_groups as any).is_active)
        .map(a => ({
          ...(a.modifier_groups as any),
          display_order: a.display_order
        }));

      if (activeGroups.length > 0) {
        // Fetch options for all groups
        const groupIds = activeGroups.map(g => g.id);
        const { data: options } = await supabase
          .from('modifier_options')
          .select('*')
          .in('group_id', groupIds)
          .eq('is_active', true)
          .order('display_order');

        const groupsWithOptions: ModifierGroup[] = activeGroups.map(g => ({
          ...g,
          selection_type: g.selection_type as 'single' | 'multiple',
          options: (options || []).filter(o => o.group_id === g.id),
        }));

        setProductModifiers(groupsWithOptions);

        // Set default selections (first option for required groups)
        const defaults: Record<string, string[]> = {};
        groupsWithOptions.forEach(group => {
          if (group.min_selections && group.min_selections > 0 && group.options.length > 0) {
            defaults[group.id] = [group.options[0].id];
          } else {
            defaults[group.id] = [];
          }
        });
        setTempSelectedModifiers(defaults);
      } else {
        setProductModifiers([]);
        addToCartDirect(product);
        setSelectedProduct(null);
      }
    } else {
      setProductModifiers([]);
      // No modifiers - add directly to cart
      addToCartDirect(product);
      setSelectedProduct(null);
    }

    setLoadingModifiers(false);
  };

  const addToCartDirect = (product: ProductWithAvailability) => {
    const price = product.branchProduct?.custom_price || product.price;
    const newItem: CartItem = {
      id: crypto.randomUUID(),
      product,
      quantity: 1,
      customPrice: price !== product.price ? price : undefined,
      modifiers: [],
      modifiersTotal: 0,
    };
    setCart([...cart, newItem]);
    toast.success(`${product.name} agregado`);
  };

  const handleModifierToggle = (groupId: string, optionId: string, selectionType: string) => {
    setTempSelectedModifiers(prev => {
      const current = prev[groupId] || [];
      
      if (selectionType === 'single') {
        return { ...prev, [groupId]: [optionId] };
      } else {
        // Multiple selection
        if (current.includes(optionId)) {
          return { ...prev, [groupId]: current.filter(id => id !== optionId) };
        } else {
          return { ...prev, [groupId]: [...current, optionId] };
        }
      }
    });
  };

  const addToCartWithModifiers = () => {
    if (!selectedProduct) return;

    const selectedModifiers: SelectedModifier[] = [];
    let modifiersTotal = 0;

    productModifiers.forEach(group => {
      const selectedOptionIds = tempSelectedModifiers[group.id] || [];
      selectedOptionIds.forEach(optionId => {
        const option = group.options.find(o => o.id === optionId);
        if (option) {
          selectedModifiers.push({
            optionId: option.id,
            optionName: option.name,
            groupName: group.name,
            priceAdjustment: Number(option.price_adjustment),
          });
          modifiersTotal += Number(option.price_adjustment);
        }
      });
    });

    const price = selectedProduct.branchProduct?.custom_price || selectedProduct.price;
    const newItem: CartItem = {
      id: crypto.randomUUID(),
      product: selectedProduct,
      quantity: 1,
      notes: tempNotes || undefined,
      customPrice: price !== selectedProduct.price ? price : undefined,
      modifiers: selectedModifiers,
      modifiersTotal,
    };

    setCart([...cart, newItem]);
    toast.success(`${selectedProduct.name} agregado`);
    setSelectedProduct(null);
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === cartItemId) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(cart.filter(item => item.id !== cartItemId));
  };

  const getItemPrice = (item: CartItem) => {
    const basePrice = item.customPrice || item.product.price;
    return basePrice + item.modifiersTotal;
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
      // Build notes with modifiers info
      const orderNotes = cart.map(item => {
        if (item.modifiers.length === 0 && !item.notes) return null;
        let note = `${item.product.name}:`;
        if (item.modifiers.length > 0) {
          note += ` ${item.modifiers.map(m => m.optionName).join(', ')}`;
        }
        if (item.notes) {
          note += ` [${item.notes}]`;
        }
        return note;
      }).filter(Boolean).join(' | ');

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          branch_id: branch.id,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail || null,
          delivery_address: orderArea === 'delivery' ? deliveryAddress : null,
          order_type: mapOrderType(),
          order_area: orderArea,
          payment_method: paymentMethod,
          sales_channel: 'pos_local',
          subtotal,
          delivery_fee: deliveryFee,
          total,
          status: 'pending',
          notes: orderNotes || null,
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
        notes: item.modifiers.length > 0 
          ? item.modifiers.map(m => m.optionName).join(', ') + (item.notes ? ` | ${item.notes}` : '')
          : item.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Insert order item modifiers
      for (const item of cart) {
        if (item.modifiers.length > 0) {
          const orderItem = orderItems.find(oi => oi.product_id === item.product.id);
          // Note: We'd need to get the actual order_item id here
          // For now, modifiers are stored in notes
        }
      }

      // Register cash movement if there's an active shift
      if (activeShift) {
        await supabase
          .from('cash_register_movements')
          .insert({
            shift_id: activeShift.id,
            branch_id: branch.id,
            type: 'income',
            payment_method: paymentMethod,
            amount: total,
            concept: `Pedido #${order.id.slice(0, 8)} - ${customerName}`,
            order_id: order.id,
            recorded_by: user?.id || null,
          });
      }

      toast.success('Pedido creado exitosamente');
      
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setDeliveryAddress('');
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
          
          <div className="flex items-center gap-2 flex-wrap">
            {cashRegisters.length > 0 && (
              <Select value={selectedCashRegister} onValueChange={setSelectedCashRegister}>
                <SelectTrigger className="w-36">
                  <Wallet className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Caja" />
                </SelectTrigger>
                <SelectContent>
                  {cashRegisters.map(register => (
                    <SelectItem key={register.id} value={register.id}>
                      {register.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
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
        
        {selectedCashRegister && !activeShift && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="font-semibold text-destructive">⚠️ Sin turno abierto</p>
            <p className="text-sm text-destructive/80">
              Debés abrir un turno en Caja antes de poder tomar pedidos.
            </p>
          </div>
        )}

        {/* Search and Category Filter */}
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
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
            className="shrink-0"
          >
            Todos
          </Button>
          {categories.map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className="shrink-0"
            >
              {cat.name}
            </Button>
          ))}
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
                const cartCount = cart.filter(item => item.product.id === product.id)
                  .reduce((sum, item) => sum + item.quantity, 0);
                
                return (
                  <Card 
                    key={product.id}
                    className={`relative transition-all ${
                      !activeShift 
                        ? 'opacity-50 cursor-not-allowed' 
                        : `cursor-pointer hover:shadow-md ${cartCount > 0 ? 'ring-2 ring-primary' : ''}`
                    }`}
                    onClick={() => activeShift && handleProductClick(product)}
                  >
                    {cartCount > 0 && (
                      <Badge className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 flex items-center justify-center">
                        {cartCount}
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
                <div key={item.id} className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.product.name}</p>
                      {item.modifiers.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.modifiers.map(m => m.optionName).join(', ')}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-primary mt-1">Nota: {item.notes}</p>
                      )}
                      <p className="text-primary font-semibold text-sm mt-1">
                        {formatPrice(getItemPrice(item))}
                        {item.modifiersTotal > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            (+{formatPrice(item.modifiersTotal)})
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-6 text-center font-medium text-sm">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
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
            disabled={cart.length === 0 || !activeShift}
            onClick={() => setIsCheckoutOpen(true)}
          >
            {!activeShift ? 'Abrí un turno para tomar pedidos' : 'Confirmar Pedido'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Product Modifier Dialog */}
      <Dialog open={!!selectedProduct && productModifiers.length > 0} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="w-5 h-5" />
              {selectedProduct?.name}
            </DialogTitle>
            <DialogDescription>
              Personalizá tu pedido
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            {loadingModifiers ? (
              <div className="space-y-4">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            ) : (
              <div className="space-y-6 py-2">
                {productModifiers.map(group => {
                  const isRequired = group.min_selections && group.min_selections > 0;
                  const isSingle = group.selection_type === 'single';
                  
                  return (
                    <div key={group.id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold">{group.name}</Label>
                        <Badge variant={isRequired ? 'destructive' : 'secondary'}>
                          {isRequired ? 'Requerido' : isSingle ? 'Elegir uno' : 'Múltiple'}
                        </Badge>
                      </div>
                      {group.description && (
                        <p className="text-xs text-muted-foreground">{group.description}</p>
                      )}

                      {isSingle ? (
                        <RadioGroup
                          value={tempSelectedModifiers[group.id]?.[0] || ''}
                          onValueChange={(value) => handleModifierToggle(group.id, value, group.selection_type)}
                        >
                          {group.options.map(option => (
                            <div key={option.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <RadioGroupItem value={option.id} id={option.id} />
                                <Label htmlFor={option.id} className="cursor-pointer font-normal">
                                  {option.name}
                                </Label>
                              </div>
                              {Number(option.price_adjustment) !== 0 && (
                                <span className={Number(option.price_adjustment) > 0 ? 'text-primary font-medium' : 'text-green-600'}>
                                  {Number(option.price_adjustment) > 0 ? '+' : ''}{formatPrice(Number(option.price_adjustment))}
                                </span>
                              )}
                            </div>
                          ))}
                        </RadioGroup>
                      ) : (
                        <div className="space-y-2">
                          {group.options.map(option => (
                            <div key={option.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  id={option.id}
                                  checked={(tempSelectedModifiers[group.id] || []).includes(option.id)}
                                  onCheckedChange={() => handleModifierToggle(group.id, option.id, group.selection_type)}
                                />
                                <Label htmlFor={option.id} className="cursor-pointer font-normal">
                                  {option.name}
                                </Label>
                              </div>
                              {Number(option.price_adjustment) !== 0 && (
                                <span className={Number(option.price_adjustment) > 0 ? 'text-primary font-medium' : 'text-green-600'}>
                                  {Number(option.price_adjustment) > 0 ? '+' : ''}{formatPrice(Number(option.price_adjustment))}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notas adicionales</Label>
                  <Textarea
                    placeholder="Ej: Sin cebolla, bien cocido..."
                    value={tempNotes}
                    onChange={(e) => setTempNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setSelectedProduct(null)}>
              Cancelar
            </Button>
            <Button onClick={addToCartWithModifiers}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar al Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
