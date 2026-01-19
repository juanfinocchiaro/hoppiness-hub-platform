import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import TipInput from './TipInput';
import CheckoutDialog from './CheckoutDialog';
import CancelOrderDialog from './CancelOrderDialog';
import OrderConfirmationDialog from './OrderConfirmationDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  Hash,
  Receipt,
  FileText,
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
  quantity: number; // Support for multiple of same modifier
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

type OrderArea = 'mostrador' | 'delivery' | 'apps';
type AppsChannel = 'rappi' | 'pedidos_ya' | 'mercadopago_delivery';
type PaymentMethod = 'efectivo' | 'tarjeta_debito' | 'tarjeta_credito' | 'mercadopago_qr' | 'mercadopago_link' | 'transferencia' | 'vales';
type OrderType = Enums<'order_type'>;
type CounterSubType = 'takeaway' | 'dine_here';

// Order flow dialog type
type OrderFlowDialogType = 'delivery_info' | 'counter_type' | 'apps_channel' | null;

interface BranchTable {
  id: string;
  table_number: string;
  area: string;
  is_occupied: boolean;
}

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
  { value: 'mostrador', label: 'Mostrador', icon: Store },
  { value: 'delivery', label: 'Delivery Propio', icon: Bike },
  { value: 'apps', label: 'Apps de Delivery', icon: Bike },
];

const APPS_CHANNELS: { value: AppsChannel; label: string }[] = [
  { value: 'rappi', label: 'Rappi' },
  { value: 'pedidos_ya', label: 'Pedidos Ya' },
  { value: 'mercadopago_delivery', label: 'MercadoPago Delivery' },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: 'efectivo', label: 'Efectivo', icon: Banknote },
  { value: 'tarjeta_debito', label: 'Débito', icon: CreditCard },
  { value: 'tarjeta_credito', label: 'Crédito', icon: CreditCard },
  { value: 'mercadopago_qr', label: 'MP QR', icon: QrCode },
  { value: 'mercadopago_link', label: 'MP Link', icon: CreditCard },
  { value: 'transferencia', label: 'Transferencia', icon: CreditCard },
];

// Métodos de pago específicos para apps de delivery
type AppPaymentMethod = 'rappi' | 'pedidos_ya' | 'mercadopago_delivery' | 'efectivo';

const getAppPaymentInfo = (channel: AppsChannel): { fixed: boolean; method?: AppPaymentMethod; options?: AppPaymentMethod[] } => {
  switch (channel) {
    case 'rappi':
      return { fixed: true, method: 'rappi' };
    case 'mercadopago_delivery':
      return { fixed: true, method: 'mercadopago_delivery' };
    case 'pedidos_ya':
      return { fixed: false, options: ['pedidos_ya', 'efectivo'] };
    default:
      return { fixed: false, options: ['efectivo'] };
  }
};

const APP_PAYMENT_LABELS: Record<AppPaymentMethod, string> = {
  rappi: 'Rappi',
  pedidos_ya: 'Pedidos Ya',
  mercadopago_delivery: 'MP Delivery',
  efectivo: 'Efectivo',
};

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
  
  // Persist draft checkout state across dialog closes to avoid double-charging
  interface PaymentRecord {
    id: string;
    payment_method: string;
    amount: number;
    created_at: string;
  }
  const [draftOrderId, setDraftOrderId] = useState<string | null>(null);
  const [draftPayments, setDraftPayments] = useState<PaymentRecord[]>([]);
  
  // Order configuration
  const [orderArea, setOrderArea] = useState<OrderArea>('mostrador');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  
  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  
  // Additional POS state
  const [counterSubType, setCounterSubType] = useState<CounterSubType>('takeaway');
  const [callerNumber, setCallerNumber] = useState('');
  const [selectedTableId, setSelectedTableId] = useState('');
  const [tables, setTables] = useState<BranchTable[]>([]);
  
  // Apps delivery state
  const [appsChannel, setAppsChannel] = useState<AppsChannel>('pedidos_ya');
  const [appPaymentMethod, setAppPaymentMethod] = useState<AppPaymentMethod>('pedidos_ya');
  const [externalOrderId, setExternalOrderId] = useState('');
  const [customDeliveryFee, setCustomDeliveryFee] = useState('');
  
  // Invoice type state
  type InvoiceType = 'consumidor_final' | 'factura_a';
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('consumidor_final');
  const [customerCuit, setCustomerCuit] = useState('');
  const [customerBusinessName, setCustomerBusinessName] = useState('');
  
  // Tip state
  const [tipAmount, setTipAmount] = useState(0);
  
  // Checkout dialog
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // NEW: Order flow state - order must be configured before adding products
  const [orderStarted, setOrderStarted] = useState(false);
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [confirmingOrder, setConfirmingOrder] = useState(false);

  // Order flow dialog (shown before adding first product) - DEPRECATED, keeping for compatibility
  const [orderFlowDialog, setOrderFlowDialog] = useState<OrderFlowDialogType>(null);
  const [pendingProduct, setPendingProduct] = useState<ProductWithAvailability | null>(null);

  // Product modifier dialog
  const [selectedProduct, setSelectedProduct] = useState<ProductWithAvailability | null>(null);
  const [productModifiers, setProductModifiers] = useState<ModifierGroup[]>([]);
  const [tempSelectedModifiers, setTempSelectedModifiers] = useState<Record<string, Record<string, number>>>({});
  const [tempNotes, setTempNotes] = useState('');
  const [loadingModifiers, setLoadingModifiers] = useState(false);
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null);
  const [branchModifierAvailability, setBranchModifierAvailability] = useState<Set<string>>(new Set());

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

  // Fetch tables for salon
  useEffect(() => {
    async function fetchTables() {
      if (!branch.dine_in_enabled) return;
      
      const { data } = await supabase
        .from('tables')
        .select('id, table_number, area, is_occupied')
        .eq('branch_id', branch.id)
        .order('table_number');
      
      if (data) setTables(data);
    }
    
    fetchTables();
  }, [branch.id, branch.dine_in_enabled]);

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

  // Handle product click - now order must be started first
  const handleProductClick = async (product: ProductWithAvailability) => {
    if (!orderStarted) {
      // Order not started - should not happen with new UI, but just in case
      setShowNewOrderDialog(true);
      return;
    }
    
    await proceedToAddProduct(product);
  };

  // Start new order - called after configuring order type and info
  const handleStartOrder = () => {
    setOrderStarted(true);
    setShowNewOrderDialog(false);
  };

  // Cancel/Reset order - if there are payments, show cancel dialog
  const handleCancelOrderClick = () => {
    if (draftPayments.length > 0) {
      // Order has payments - show cancel dialog for refund management
      setShowCancelDialog(true);
    } else {
      // No payments - just reset
      handleResetOrder();
    }
  };

  // Full reset of order state
  const handleResetOrder = () => {
    setCart([]);
    setOrderStarted(false);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setDeliveryAddress('');
    setCallerNumber('');
    setExternalOrderId('');
    setCustomDeliveryFee('');
    setOrderArea('mostrador');
    setCounterSubType('takeaway');
    setAppsChannel('pedidos_ya');
    setAppPaymentMethod('pedidos_ya');
    setDraftOrderId(null);
    setDraftPayments([]);
    setShowCancelDialog(false);
  };

  // Proceed to add product after order flow dialog is complete
  const proceedToAddProduct = async (product: ProductWithAvailability) => {
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
        const defaults: Record<string, Record<string, number>> = {};
        groupsWithOptions.forEach(group => {
          if (group.min_selections && group.min_selections > 0 && group.options.length > 0) {
            defaults[group.id] = { [group.options[0].id]: 1 };
          } else {
            defaults[group.id] = {};
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

  // Continue after order flow dialog selection
  const handleOrderFlowComplete = () => {
    setOrderFlowDialog(null);
    if (pendingProduct) {
      proceedToAddProduct(pendingProduct);
      setPendingProduct(null);
    }
  };

  // Caller numbers for selection (1-20)
  const CALLER_NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1);

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

  const handleModifierToggle = (groupId: string, optionId: string, selectionType: string, delta: number = 1) => {
    setTempSelectedModifiers(prev => {
      const current = prev[groupId] || {};
      
      if (selectionType === 'single') {
        // Single selection - only one option, quantity = 1
        return { ...prev, [groupId]: { [optionId]: 1 } };
      } else {
        // Multiple selection - support quantity
        const currentQty = current[optionId] || 0;
        const newQty = currentQty + delta;
        
        if (newQty <= 0) {
          // Remove the option
          const { [optionId]: _, ...rest } = current;
          return { ...prev, [groupId]: rest };
        } else {
          return { ...prev, [groupId]: { ...current, [optionId]: newQty } };
        }
      }
    });
  };
  
  const getModifierQuantity = (groupId: string, optionId: string): number => {
    return tempSelectedModifiers[groupId]?.[optionId] || 0;
  };

  const addToCartWithModifiers = () => {
    if (!selectedProduct) return;

    const selectedModifiers: SelectedModifier[] = [];
    let modifiersTotal = 0;

    productModifiers.forEach(group => {
      const selectedOptions = tempSelectedModifiers[group.id] || {};
      Object.entries(selectedOptions).forEach(([optionId, quantity]) => {
        const option = group.options.find(o => o.id === optionId);
        if (option && quantity > 0) {
          selectedModifiers.push({
            optionId: option.id,
            optionName: option.name,
            groupName: group.name,
            priceAdjustment: Number(option.price_adjustment),
            quantity,
          });
          modifiersTotal += Number(option.price_adjustment) * quantity;
        }
      });
    });

    const price = selectedProduct.branchProduct?.custom_price || selectedProduct.price;
    
    if (editingCartItemId) {
      // Update existing cart item
      setCart(cart.map(item => 
        item.id === editingCartItemId 
          ? {
              ...item,
              modifiers: selectedModifiers,
              modifiersTotal,
              notes: tempNotes || undefined,
            }
          : item
      ));
      toast.success(`${selectedProduct.name} actualizado`);
      setEditingCartItemId(null);
    } else {
      // Add new item
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
    }
    
    setSelectedProduct(null);
    setEditingCartItemId(null);
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

  // Edit cart item - open modifier dialog with existing selections
  const handleEditCartItem = async (cartItem: CartItem) => {
    const product = products.find(p => p.id === cartItem.product.id);
    if (!product) return;
    
    setEditingCartItemId(cartItem.id);
    setSelectedProduct(product);
    setTempNotes(cartItem.notes || '');
    setLoadingModifiers(true);

    // Fetch modifier groups for this product
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
      const activeGroups = assignments
        .filter(a => a.modifier_groups && (a.modifier_groups as any).is_active)
        .map(a => ({
          ...(a.modifier_groups as any),
          display_order: a.display_order
        }));

      if (activeGroups.length > 0) {
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

        // Populate with existing cart item selections
        const existingSelections: Record<string, Record<string, number>> = {};
        groupsWithOptions.forEach(group => {
          existingSelections[group.id] = {};
        });
        
        cartItem.modifiers.forEach(mod => {
          const group = groupsWithOptions.find(g => g.options.some(o => o.id === mod.optionId));
          if (group) {
            existingSelections[group.id][mod.optionId] = mod.quantity;
          }
        });
        
        setTempSelectedModifiers(existingSelections);
      }
    }

    setLoadingModifiers(false);
  };

  const getItemPrice = (item: CartItem) => {
    const basePrice = item.customPrice || item.product.price;
    return basePrice + item.modifiersTotal;
  };

  const subtotal = cart.reduce((sum, item) => sum + getItemPrice(item) * item.quantity, 0);
  const deliveryFee = (orderArea === 'delivery' || orderArea === 'apps') && customDeliveryFee 
    ? parseFloat(customDeliveryFee) 
    : 0;
  const total = subtotal + deliveryFee + tipAmount;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const mapOrderType = (): OrderType => {
    switch (orderArea) {
      case 'delivery': return 'delivery';
      case 'apps': return 'delivery';
      case 'mostrador': 
        return counterSubType === 'dine_here' ? 'dine_in' : 'takeaway';
      default: return 'takeaway';
    }
  };

  const getSalesChannel = (): Enums<'sales_channel'> => {
    if (orderArea === 'apps') return appsChannel;
    return 'pos_local';
  };

  // All order areas are always available in POS
  const availableOrderAreas = ORDER_AREAS;


  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    // Validation based on order area
    if (orderArea === 'mostrador') {
      if (counterSubType === 'dine_here' && !callerNumber.trim()) {
        toast.error('Ingresá el número de llamador');
        return;
      }
      if (counterSubType === 'takeaway' && !customerName.trim()) {
        toast.error('Ingresá el nombre o número de llamador');
        return;
      }
    } else if (orderArea === 'delivery' || orderArea === 'apps') {
      if (!customerName.trim() || !customerPhone.trim()) {
        toast.error('Nombre y teléfono son requeridos');
        return;
      }
      if (!deliveryAddress.trim()) {
        toast.error('Ingresá la dirección de entrega');
        return;
      }
    }

    // Validate Factura A requirements
    if (invoiceType === 'factura_a') {
      if (!customerCuit.trim()) {
        toast.error('CUIT es requerido para Factura A');
        return;
      }
      if (!customerBusinessName.trim()) {
        toast.error('Razón Social es requerida para Factura A');
        return;
      }
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

      // Determine actual payment method for apps
      const actualPaymentMethod = orderArea === 'apps' 
        ? (appPaymentMethod === 'efectivo' ? 'efectivo' : paymentMethod) 
        : paymentMethod;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          branch_id: branch.id,
          customer_name: customerName || `Llamador #${callerNumber}`,
          customer_phone: customerPhone || '',
          customer_email: customerEmail || null,
          delivery_address: (orderArea === 'delivery' || orderArea === 'apps') ? deliveryAddress : null,
          table_number: null,
          caller_number: callerNumber ? parseInt(callerNumber) : null,
          order_type: mapOrderType(),
          order_area: orderArea === 'apps' ? 'delivery' : orderArea,
          payment_method: orderArea === 'apps' && appPaymentMethod !== 'efectivo' ? null : actualPaymentMethod,
          sales_channel: getSalesChannel(),
          external_order_id: orderArea === 'apps' ? externalOrderId : null,
          subtotal,
          delivery_fee: deliveryFee,
          tip_amount: tipAmount > 0 ? tipAmount : null,
          total,
          status: 'pending',
          notes: orderNotes || null,
          invoice_type: invoiceType,
          customer_cuit: invoiceType === 'factura_a' ? customerCuit : null,
          customer_business_name: invoiceType === 'factura_a' ? customerBusinessName : null,
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

      // Register cash movement only if:
      // - There's an active shift AND
      // - Payment affects the cash register (efectivo always, or non-app orders with cash payment)
      const shouldRegisterCashMovement = activeShift && (
        // Mostrador o Delivery propio con cualquier método afecta caja
        (orderArea !== 'apps') ||
        // Apps solo afecta caja si es PedidosYa con efectivo
        (orderArea === 'apps' && appsChannel === 'pedidos_ya' && appPaymentMethod === 'efectivo')
      );

      if (shouldRegisterCashMovement) {
        await supabase
          .from('cash_register_movements')
          .insert({
            shift_id: activeShift.id,
            branch_id: branch.id,
            type: 'income',
            payment_method: orderArea === 'apps' ? 'efectivo' : paymentMethod,
            amount: total,
            concept: `Pedido #${order.id.slice(0, 8)} - ${customerName}`,
            order_id: order.id,
            recorded_by: user?.id || null,
          });
      }

      toast.success('Pedido creado exitosamente');
      
      // Reset all order state
      setCart([]);
      setOrderStarted(false);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setDeliveryAddress('');
      setCallerNumber('');
      setSelectedTableId('');
      setExternalOrderId('');
      setCustomDeliveryFee('');
      setInvoiceType('consumidor_final');
      setCustomerCuit('');
      setCustomerBusinessName('');
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
            
            {/* Show order info badge when order started */}
            {orderStarted && (
              <Badge variant="outline" className="gap-1 py-1.5 px-3">
                {orderArea === 'mostrador' && <Store className="w-4 h-4" />}
                {orderArea === 'delivery' && <Bike className="w-4 h-4" />}
                {orderArea === 'apps' && <Bike className="w-4 h-4" />}
                <span className="ml-1">
                  {orderArea === 'apps' 
                    ? APPS_CHANNELS.find(c => c.value === appsChannel)?.label 
                    : ORDER_AREAS.find(a => a.value === orderArea)?.label
                  }
                  {orderArea === 'mostrador' && ` - ${counterSubType === 'takeaway' ? 'Para llevar' : 'Comer acá'}`}
                </span>
              </Badge>
            )}
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

        {/* NEW ORDER SCREEN - shown when no order started */}
        {!orderStarted && activeShift && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-center space-y-6 max-w-md">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <ShoppingCart className="w-12 h-12 text-primary" />
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-2">NUEVO PEDIDO</h2>
                <p className="text-muted-foreground">
                  Presioná el botón para iniciar un nuevo pedido y seleccionar el canal de venta
                </p>
              </div>
              <Button 
                size="lg" 
                className="w-full h-14 text-lg gap-2"
                onClick={() => setShowNewOrderDialog(true)}
              >
                <Plus className="w-6 h-6" />
                Iniciar Pedido
              </Button>
            </div>
          </div>
        )}

        {/* PRODUCTS SECTION - shown only when order started */}
        {orderStarted && (
          <>
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
          <Button variant="outline" size="icon" onClick={handleCancelOrderClick} title="Cancelar pedido">
            <X className="w-4 h-4" />
          </Button>
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
        </>
        )}
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
          
          {/* Customer/Caller Info */}
          {orderStarted && (
            <div className="mt-3 bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {customerName || (callerNumber ? `Llamador #${callerNumber}` : 'Sin nombre')}
                    </span>
                  </div>
                  {callerNumber && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Hash className="w-4 h-4" />
                      <span>Llamador #{callerNumber}</span>
                    </div>
                  )}
                  {orderArea === 'delivery' && deliveryAddress && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{deliveryAddress}</span>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelOrderClick}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancelar
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant={invoiceType === 'factura_a' ? 'default' : 'outline'} className="text-xs">
                  {invoiceType === 'factura_a' ? 'Factura A' : 'Consumidor Final'}
                </Badge>
                {invoiceType === 'factura_a' && customerCuit && (
                  <span className="text-muted-foreground">CUIT: {customerCuit}</span>
                )}
              </div>
            </div>
          )}
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
                <div 
                  key={item.id} 
                  className="bg-muted/50 rounded-lg p-3 cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleEditCartItem(item)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.product.name}</p>
                      {item.modifiers.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.modifiers.map(m => 
                            m.quantity > 1 ? `${m.quantity}x ${m.optionName}` : m.optionName
                          ).join(', ')}
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
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
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
            {/* Always show Saldo */}
            {(() => {
              const totalPaid = draftPayments.reduce((s, p) => s + p.amount, 0);
              const remaining = total - totalPaid;
              const isFullyPaid = remaining <= 0.01;
              return (
                <div className={`flex justify-between font-bold ${isFullyPaid ? 'text-success' : 'text-warning'}`}>
                  <span>Saldo</span>
                  <span>{formatPrice(Math.max(0, remaining))}</span>
                </div>
              );
            })()}
          </div>

          {/* Show registered payments if any */}
          {draftPayments.length > 0 && (
            <div className="bg-success/10 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-success">Pagos registrados</p>
              {draftPayments.map(p => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span className="capitalize">{p.payment_method.replace('_', ' ')}</span>
                  <span className="font-medium text-success">{formatPrice(p.amount)}</span>
                </div>
              ))}
              <Separator className="bg-success/20" />
              <div className="flex justify-between text-sm font-bold">
                <span>Total pagado</span>
                <span className="text-success">{formatPrice(draftPayments.reduce((s, p) => s + p.amount, 0))}</span>
              </div>
            </div>
          )}

          {(() => {
            const totalPaid = draftPayments.reduce((s, p) => s + p.amount, 0);
            const remaining = total - totalPaid;
            const isFullyPaid = remaining <= 0.01 && draftPayments.length > 0;
            
            return (
              <div className="space-y-2">
                {/* "Cargar pago" - disabled when fully paid */}
                <Button
                  className="w-full"
                  size="lg"
                  variant="outline"
                  disabled={cart.length === 0 || !activeShift || isFullyPaid}
                  onClick={() => setIsCheckoutOpen(true)}
                >
                  {!activeShift 
                    ? 'Abrí un turno para tomar pedidos' 
                    : isFullyPaid
                      ? 'Pedido pagado'
                      : 'Cargar pago'
                  }
                  <CreditCard className="w-4 h-4 ml-2" />
                </Button>

                {/* "Confirmar Pedido" - only enabled when fully paid */}
                <Button
                  className="w-full"
                  size="lg"
                  disabled={cart.length === 0 || !activeShift || !isFullyPaid}
                  onClick={() => setShowOrderConfirmation(true)}
                >
                  Confirmar Pedido
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            );
          })()}
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
              {editingCartItemId ? 'Modificá los extras de tu pedido' : 'Personalizá tu pedido'}
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
                          value={Object.keys(tempSelectedModifiers[group.id] || {})[0] || ''}
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
                          {group.options.map(option => {
                            const qty = getModifierQuantity(group.id, option.id);
                            const maxAllowed = group.max_selections || 10;
                            const totalSelected = Object.values(tempSelectedModifiers[group.id] || {}).reduce((a, b) => a + b, 0);
                            const canAddMore = totalSelected < maxAllowed;
                            
                            return (
                              <div key={option.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleModifierToggle(group.id, option.id, group.selection_type, -1)}
                                      disabled={qty === 0}
                                    >
                                      <Minus className="w-3 h-3" />
                                    </Button>
                                    <span className="w-6 text-center text-sm font-medium">{qty}</span>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleModifierToggle(group.id, option.id, group.selection_type, 1)}
                                      disabled={!canAddMore}
                                    >
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                  </div>
                                  <Label className="cursor-pointer font-normal">
                                    {option.name}
                                  </Label>
                                </div>
                                {Number(option.price_adjustment) !== 0 && (
                                  <span className={Number(option.price_adjustment) > 0 ? 'text-primary font-medium' : 'text-green-600'}>
                                    {Number(option.price_adjustment) > 0 ? '+' : ''}{formatPrice(Number(option.price_adjustment))}
                                  </span>
                                )}
                              </div>
                            );
                          })}
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
            <Button variant="outline" onClick={() => {
              setSelectedProduct(null);
              setEditingCartItemId(null);
            }}>
              Cancelar
            </Button>
            <Button onClick={addToCartWithModifiers}>
              {editingCartItemId ? (
                <>Guardar Cambios</>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar al Pedido
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Flow Dialog - Counter Type */}
      <Dialog open={orderFlowDialog === 'counter_type'} onOpenChange={(open) => !open && setOrderFlowDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              Tipo de Pedido
            </DialogTitle>
            <DialogDescription>
              ¿El cliente va a comer acá o se lo lleva?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={counterSubType === 'takeaway' ? 'default' : 'outline'}
                onClick={() => setCounterSubType('takeaway')}
                className="flex-col h-auto py-6"
              >
                <Store className="w-8 h-8 mb-2" />
                <span className="text-base font-medium">Para llevar</span>
              </Button>
              <Button
                variant={counterSubType === 'dine_here' ? 'default' : 'outline'}
                onClick={() => setCounterSubType('dine_here')}
                className="flex-col h-auto py-6"
              >
                <Utensils className="w-8 h-8 mb-2" />
                <span className="text-base font-medium">Comer acá</span>
              </Button>
            </div>

            {counterSubType === 'dine_here' && (
              <div className="space-y-3">
                <Label>Número de Llamador *</Label>
                <div className="grid grid-cols-5 gap-2">
                  {CALLER_NUMBERS.map(num => (
                    <Button
                      key={num}
                      variant={callerNumber === String(num) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setCallerNumber(String(num));
                        setCustomerName(`Llamador #${num}`);
                      }}
                      className="h-10 text-lg font-bold"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {counterSubType === 'takeaway' && (
              <div className="space-y-3">
                <Label>Nombre del cliente o Número de Llamador</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Nombre del cliente"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">O elegí un número de llamador:</p>
                <div className="grid grid-cols-5 gap-2">
                  {CALLER_NUMBERS.map(num => (
                    <Button
                      key={num}
                      variant={callerNumber === String(num) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setCallerNumber(String(num));
                        if (!customerName.trim()) {
                          setCustomerName(`Llamador #${num}`);
                        }
                      }}
                      className="h-8 text-sm font-medium"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setOrderFlowDialog(null);
              setPendingProduct(null);
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleOrderFlowComplete}
              disabled={counterSubType === 'dine_here' && !callerNumber}
            >
              Continuar
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Flow Dialog - Delivery Info */}
      <Dialog open={orderFlowDialog === 'delivery_info'} onOpenChange={(open) => !open && setOrderFlowDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bike className="w-5 h-5" />
              Datos de Delivery
            </DialogTitle>
            <DialogDescription>
              Ingresá los datos del cliente para el envío
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

            <div className="space-y-2">
              <Label>Dirección de entrega *</Label>
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

            <div className="space-y-2">
              <Label>Costo de envío</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                <Input
                  type="number"
                  placeholder="0"
                  value={customDeliveryFee}
                  onChange={(e) => setCustomDeliveryFee(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setOrderFlowDialog(null);
              setPendingProduct(null);
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleOrderFlowComplete}
              disabled={!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()}
            >
              Continuar
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Flow Dialog - Apps Channel */}
      <Dialog open={orderFlowDialog === 'apps_channel'} onOpenChange={(open) => !open && setOrderFlowDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bike className="w-5 h-5" />
              App de Delivery
            </DialogTitle>
            <DialogDescription>
              ¿Por qué plataforma ingresó el pedido?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>Plataforma *</Label>
              <div className="grid grid-cols-1 gap-2">
                {APPS_CHANNELS.map(channel => (
                  <Button
                    key={channel.value}
                    variant={appsChannel === channel.value ? 'default' : 'outline'}
                    onClick={() => {
                      setAppsChannel(channel.value);
                      // Auto-set payment method based on channel
                      const paymentInfo = getAppPaymentInfo(channel.value);
                      if (paymentInfo.fixed && paymentInfo.method) {
                        setAppPaymentMethod(paymentInfo.method);
                      } else if (paymentInfo.options && paymentInfo.options.length > 0) {
                        setAppPaymentMethod(paymentInfo.options[0]);
                      }
                    }}
                    className="justify-start h-12 text-base"
                  >
                    <Bike className="w-5 h-5 mr-3" />
                    {channel.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>ID de pedido externo</Label>
              <Input
                placeholder="Ej: #12345"
                value={externalOrderId}
                onChange={(e) => setExternalOrderId(e.target.value)}
              />
            </div>

            <Separator />

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
              <Label>Teléfono</Label>
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

            <div className="space-y-2">
              <Label>Dirección de entrega *</Label>
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

            <div className="space-y-2">
              <Label>Costo de envío</Label>
              <p className="text-xs text-muted-foreground">
                {appsChannel === 'pedidos_ya' 
                  ? 'En Pedidos Ya este dinero nos entra a nosotros'
                  : 'Lo que se le cobra al cliente por el envío'
                }
              </p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                <Input
                  type="number"
                  placeholder="0"
                  value={customDeliveryFee}
                  onChange={(e) => setCustomDeliveryFee(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setOrderFlowDialog(null);
              setPendingProduct(null);
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleOrderFlowComplete}
              disabled={!customerName.trim() || !deliveryAddress.trim()}
            >
              Continuar
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NEW Checkout Dialog - Read-only info + Split Payment */}
      <CheckoutDialog
        open={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        cart={cart}
        branch={branch}
        orderConfig={{
          orderArea,
          counterSubType,
          appsChannel,
          callerNumber,
          customerName,
          customerPhone,
          customerEmail,
          deliveryAddress,
          externalOrderId,
          customDeliveryFee,
          invoiceType,
          customerCuit,
          customerBusinessName,
        }}
        activeShiftId={activeShift?.id || null}
        userId={user?.id || null}
        existingOrderId={draftOrderId}
        existingPayments={draftPayments}
        onDraftUpdated={({ orderId, payments }) => {
          setDraftOrderId(orderId);
          setDraftPayments(payments);
        }}
        onOrderComplete={handleResetOrder}
        onEditOrder={() => {
          // Just close the checkout dialog to return to products - don't open new order dialog
          setIsCheckoutOpen(false);
        }}
      />

      {/* NEW ORDER DIALOG - Configure order before adding products */}
      <Dialog open={showNewOrderDialog} onOpenChange={setShowNewOrderDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl">Nuevo Pedido</DialogTitle>
            <DialogDescription>
              Seleccioná el canal de venta e ingresá los datos del cliente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Order Area Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Canal de Venta</Label>
              <div className="grid grid-cols-3 gap-3">
                {availableOrderAreas.map(area => (
                  <Button
                    key={area.value}
                    variant={orderArea === area.value ? 'default' : 'outline'}
                    onClick={() => {
                      setOrderArea(area.value);
                      // Auto-set payment for apps
                      if (area.value === 'apps') {
                        const paymentInfo = getAppPaymentInfo(appsChannel);
                        if (paymentInfo.fixed && paymentInfo.method) {
                          setAppPaymentMethod(paymentInfo.method);
                        }
                      }
                    }}
                    className="flex-col h-auto py-4"
                  >
                    <area.icon className="w-6 h-6 mb-2" />
                    <span className="text-sm font-medium">{area.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Mostrador Options */}
            {orderArea === 'mostrador' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Tipo de pedido</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant={counterSubType === 'takeaway' ? 'default' : 'outline'}
                      onClick={() => setCounterSubType('takeaway')}
                      className="flex-col h-auto py-4"
                    >
                      <Store className="w-6 h-6 mb-2" />
                      <span className="font-medium">Para llevar</span>
                    </Button>
                    <Button
                      variant={counterSubType === 'dine_here' ? 'default' : 'outline'}
                      onClick={() => setCounterSubType('dine_here')}
                      className="flex-col h-auto py-4"
                    >
                      <Utensils className="w-6 h-6 mb-2" />
                      <span className="font-medium">Comer acá</span>
                    </Button>
                  </div>
                </div>

                {/* Caller Number Grid - for both takeaway and dine_here */}
                <div className="space-y-3">
                  <Label className="text-base">Número de llamador</Label>
                  <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
                    {Array.from({ length: 30 }, (_, i) => i + 1).map(num => (
                      <Button
                        key={num}
                        variant={callerNumber === String(num) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setCallerNumber(String(num));
                          if (!customerName || customerName.startsWith('Llamador #')) {
                            setCustomerName(`Llamador #${num}`);
                          }
                        }}
                        className="h-10 text-lg font-bold"
                      >
                        {num}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Optional Name */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Nombre (opcional)</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Nombre del cliente"
                      value={customerName.startsWith('Llamador #') ? '' : customerName}
                      onChange={(e) => setCustomerName(e.target.value || (callerNumber ? `Llamador #${callerNumber}` : ''))}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Separator />

                {/* Invoice Type Selection */}
                <div className="space-y-3">
                  <Label className="text-base">Tipo de Factura</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant={invoiceType === 'consumidor_final' ? 'default' : 'outline'}
                      onClick={() => setInvoiceType('consumidor_final')}
                      className="flex-col h-auto py-3"
                    >
                      <Receipt className="w-5 h-5 mb-1" />
                      <span className="text-sm font-medium">Consumidor Final</span>
                    </Button>
                    <Button
                      variant={invoiceType === 'factura_a' ? 'default' : 'outline'}
                      onClick={() => setInvoiceType('factura_a')}
                      className="flex-col h-auto py-3"
                    >
                      <FileText className="w-5 h-5 mb-1" />
                      <span className="text-sm font-medium">Factura A</span>
                    </Button>
                  </div>
                </div>

                {/* Factura A Fields */}
                {invoiceType === 'factura_a' && (
                  <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                    <div className="space-y-2">
                      <Label>CUIT *</Label>
                      <Input
                        placeholder="XX-XXXXXXXX-X"
                        value={customerCuit}
                        onChange={(e) => setCustomerCuit(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Razón Social *</Label>
                      <Input
                        placeholder="Nombre de la empresa"
                        value={customerBusinessName}
                        onChange={(e) => setCustomerBusinessName(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Delivery Options */}
            {orderArea === 'delivery' && (
              <div className="space-y-4">
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

                <div className="space-y-2">
                  <Label>Dirección de entrega *</Label>
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

                <div className="space-y-2">
                  <Label>Costo de envío</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                    <Input
                      type="number"
                      placeholder="0"
                      value={customDeliveryFee}
                      onChange={(e) => setCustomDeliveryFee(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                <Separator />

                {/* Invoice Type Selection for Delivery */}
                <div className="space-y-3">
                  <Label className="text-base">Tipo de Factura</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant={invoiceType === 'consumidor_final' ? 'default' : 'outline'}
                      onClick={() => setInvoiceType('consumidor_final')}
                      className="flex-col h-auto py-3"
                    >
                      <Receipt className="w-5 h-5 mb-1" />
                      <span className="text-sm font-medium">Consumidor Final</span>
                    </Button>
                    <Button
                      variant={invoiceType === 'factura_a' ? 'default' : 'outline'}
                      onClick={() => setInvoiceType('factura_a')}
                      className="flex-col h-auto py-3"
                    >
                      <FileText className="w-5 h-5 mb-1" />
                      <span className="text-sm font-medium">Factura A</span>
                    </Button>
                  </div>
                </div>

                {/* Factura A Fields */}
                {invoiceType === 'factura_a' && (
                  <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                    <div className="space-y-2">
                      <Label>CUIT *</Label>
                      <Input
                        placeholder="XX-XXXXXXXX-X"
                        value={customerCuit}
                        onChange={(e) => setCustomerCuit(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Razón Social *</Label>
                      <Input
                        placeholder="Nombre de la empresa"
                        value={customerBusinessName}
                        onChange={(e) => setCustomerBusinessName(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Apps Options */}
            {orderArea === 'apps' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Plataforma *</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {APPS_CHANNELS.map(channel => (
                      <Button
                        key={channel.value}
                        variant={appsChannel === channel.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setAppsChannel(channel.value);
                          const paymentInfo = getAppPaymentInfo(channel.value);
                          if (paymentInfo.fixed && paymentInfo.method) {
                            setAppPaymentMethod(paymentInfo.method);
                          } else if (paymentInfo.options && paymentInfo.options.length > 0) {
                            setAppPaymentMethod(paymentInfo.options[0]);
                          }
                        }}
                      >
                        {channel.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>ID de pedido externo</Label>
                  <Input
                    placeholder="Ej: #12345"
                    value={externalOrderId}
                    onChange={(e) => setExternalOrderId(e.target.value)}
                  />
                </div>

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
                  <Label>Teléfono</Label>
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

                <div className="space-y-2">
                  <Label>Dirección de entrega *</Label>
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

                <div className="space-y-2">
                  <Label>Costo de envío</Label>
                  <p className="text-xs text-muted-foreground">
                    {appsChannel === 'pedidos_ya' 
                      ? 'En Pedidos Ya este dinero nos entra a nosotros'
                      : 'Lo que se le cobra al cliente por el envío'
                    }
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                    <Input
                      type="number"
                      placeholder="0"
                      value={customDeliveryFee}
                      onChange={(e) => setCustomDeliveryFee(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                {/* Payment method for PedidosYa */}
                {appsChannel === 'pedidos_ya' && (
                  <div className="space-y-3">
                    <Label>Método de pago</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={appPaymentMethod === 'pedidos_ya' ? 'default' : 'outline'}
                        onClick={() => setAppPaymentMethod('pedidos_ya')}
                        className="flex-col h-auto py-3"
                      >
                        <Bike className="w-5 h-5 mb-1" />
                        <span className="text-sm">Pedidos Ya</span>
                      </Button>
                      <Button
                        variant={appPaymentMethod === 'efectivo' ? 'default' : 'outline'}
                        onClick={() => setAppPaymentMethod('efectivo')}
                        className="flex-col h-auto py-3"
                      >
                        <Banknote className="w-5 h-5 mb-1" />
                        <span className="text-sm">Efectivo</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewOrderDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleStartOrder}
              disabled={
                (orderArea === 'mostrador' && counterSubType === 'dine_here' && !callerNumber) ||
                (orderArea === 'delivery' && (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim())) ||
                (orderArea === 'apps' && (!customerName.trim() || !deliveryAddress.trim()))
              }
            >
              Continuar a Productos
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Dialog - for orders with payments */}
      <CancelOrderDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        draftOrderId={draftOrderId}
        draftPayments={draftPayments}
        branchId={branch.id}
        activeShiftId={activeShift?.id || null}
        onCancelComplete={handleResetOrder}
        total={total}
      />

      {/* Order Confirmation Dialog - summary before sending to kitchen */}
      <OrderConfirmationDialog
        open={showOrderConfirmation}
        onOpenChange={setShowOrderConfirmation}
        cart={cart}
        draftOrderId={draftOrderId}
        draftPayments={draftPayments}
        customerName={customerName}
        customerPhone={customerPhone}
        callerNumber={callerNumber}
        orderArea={orderArea}
        deliveryAddress={deliveryAddress}
        total={total}
        subtotal={subtotal}
        deliveryFee={deliveryFee}
        onOrderConfirmed={handleResetOrder}
        branchId={branch.id}
        activeShiftId={activeShift?.id || null}
      />
    </div>
  );
}
