import { useState, useEffect, useRef, useCallback } from 'react';
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
  AlertCircle,
  Star,
  Pencil,
  PlusCircle,
  Coffee,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { handleError } from '@/lib/errorHandler';
import { CashStatusIndicator } from '@/components/local/CashStatusIndicator';
import { CashClosedBlock } from '@/components/local/CashClosedBlock';
import { useShiftStatus } from '@/hooks/useShiftStatus';
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

// Service Type = How the order is delivered (separate from channel)
type ServiceType = 'delivery' | 'takeaway' | 'dine_in';

// OrderArea is now mainly for apps integration, POS always uses 'mostrador' channel
type OrderArea = 'mostrador' | 'apps';
type AppsChannel = 'rappi' | 'pedidos_ya' | 'mp_delivery';
type PaymentMethod = 'efectivo' | 'tarjeta_debito' | 'tarjeta_credito' | 'mercadopago_qr' | 'mercadopago_link' | 'transferencia' | 'vales';
type OrderType = Enums<'order_type'>;

// Order flow dialog type
type OrderFlowDialogType = 'delivery_info' | 'counter_type' | 'apps_channel' | null;

// BranchTable removed - tables feature not used

interface CartItem {
  id: string; // Unique cart item ID
  product: ProductWithAvailability; // Use extended type to include hasModifiers
  quantity: number;
  notes?: string;
  customPrice?: number;
  modifiers: SelectedModifier[];
  modifiersTotal: number;
}

interface ProductWithAvailability extends Product {
  branchProduct: BranchProduct | null;
  hasModifiers?: boolean; // Pre-computed flag for direct add vs modal
}

interface POSViewProps {
  branch: Branch;
}

// Beverages category slugs for compact mode
const BEVERAGE_CATEGORY_NAMES = ['bebidas', 'drinks', 'beverages'];

// Service types for POS (replaces old ORDER_AREAS for mostrador)
const SERVICE_TYPES: { value: ServiceType; label: string; icon: React.ElementType }[] = [
  { value: 'takeaway', label: 'Take Away', icon: ShoppingCart },
  { value: 'dine_in', label: 'Comer Acá', icon: Utensils },
  { value: 'delivery', label: 'Delivery', icon: Bike },
];

// Order areas (source of the order in POS)
const ORDER_AREAS: { value: OrderArea; label: string; icon: React.ElementType }[] = [
  { value: 'mostrador', label: 'Mostrador', icon: Store },
  { value: 'apps', label: 'Apps de Delivery', icon: Bike },
];

const APPS_CHANNELS: { value: AppsChannel; label: string }[] = [
  { value: 'rappi', label: 'Rappi' },
  { value: 'pedidos_ya', label: 'Pedidos Ya' },
  { value: 'mp_delivery', label: 'MercadoPago Delivery' },
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
    case 'mp_delivery':
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
  
  // Shift and cash status
  const shiftStatus = useShiftStatus(branch.id);
  const [showOpenCashModal, setShowOpenCashModal] = useState(false);
  
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
  
  // Helper: check if cash is required for a payment method
  const isCashPayment = (method: PaymentMethod) => method === 'efectivo';
  const hasCashOpen = shiftStatus.hasCashOpen;
  
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
  
  // Service type state - how the order is delivered
  const [serviceType, setServiceType] = useState<ServiceType>('takeaway');
  const [callerNumber, setCallerNumber] = useState('');
  // Tables feature removed - not used in any branch
  
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
  const [tempQuantity, setTempQuantity] = useState(1); // Quantity control in modal
  const [loadingModifiers, setLoadingModifiers] = useState(false);
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null);
  const [branchModifierAvailability, setBranchModifierAvailability] = useState<Set<string>>(new Set());
  
  // UI optimization state
  const [recentlyAddedProduct, setRecentlyAddedProduct] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cartScrollRef = useRef<HTMLDivElement>(null);
  const lastAddedItemRef = useRef<string | null>(null);

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

  // Sync activeShift from shiftStatus hook
  useEffect(() => {
    if (shiftStatus.activeCashShift) {
      setActiveShift({
        id: shiftStatus.activeCashShift.id,
        cash_register_id: shiftStatus.activeCashShift.cash_register_id,
        status: shiftStatus.activeCashShift.status,
      });
    } else {
      setActiveShift(null);
    }
  }, [shiftStatus.activeCashShift]);

  // Tables feature removed - not used in any branch

  // Fetch products and categories with modifier info pre-computed
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      const [productsRes, categoriesRes, branchProductsRes, modifierAssignmentsRes] = await Promise.all([
        supabase.from('products').select('*').eq('is_available', true),
        supabase.from('product_categories').select('*').eq('is_active', true).order('display_order'),
        supabase.from('branch_products').select('*').eq('branch_id', branch.id),
        // Pre-fetch which products have modifiers
        supabase.from('product_modifier_assignments').select('product_id').eq('is_enabled', true),
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);

      // Build set of products that have modifiers
      const productsWithModifiers = new Set(
        (modifierAssignmentsRes.data || []).map(a => a.product_id)
      );

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
            hasModifiers: productsWithModifiers.has(p.id), // Pre-computed flag
          }))
          .filter(p => p.branchProduct?.is_available !== false)
          .sort((a, b) => {
            // Favorites first within same category
            const aFav = a.branchProduct?.is_favorite ? 0 : 1;
            const bFav = b.branchProduct?.is_favorite ? 0 : 1;
            if (aFav !== bFav) return aFav - bFav;
            
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

  // Validate product availability in real-time before adding to cart
  const checkProductAvailability = async (productId: string): Promise<{ available: boolean; reason?: string }> => {
    try {
      // Check product global availability
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, is_available')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        return { available: false, reason: 'Producto no encontrado' };
      }

      if (!product.is_available) {
        return { available: false, reason: 'Producto deshabilitado por la marca' };
      }

      // Check branch-specific availability
      const { data: branchProduct } = await supabase
        .from('branch_products')
        .select('is_available, is_enabled_by_brand')
        .eq('branch_id', branch.id)
        .eq('product_id', productId)
        .single();

      if (branchProduct) {
        if (!branchProduct.is_enabled_by_brand) {
          return { available: false, reason: 'Producto no habilitado para esta sucursal' };
        }
        if (!branchProduct.is_available) {
          return { available: false, reason: 'Producto pausado temporalmente' };
        }
      }

      return { available: true };
    } catch {
      // On network error, allow the operation (will be validated by DB trigger)
      return { available: true };
    }
  };

  // Handle product click - optimized: direct add for products without modifiers
  const handleProductClick = async (product: ProductWithAvailability) => {
    if (!orderStarted) {
      setShowNewOrderDialog(true);
      return;
    }

    // OPTIMIZATION: If product has NO modifiers, add directly without DB query
    if (!product.hasModifiers) {
      addToCartDirect(product);
      return;
    }

    // Product has modifiers - proceed with modal
    await proceedToAddProduct(product);
  };

  // Start new order - called after configuring order type and info
  const handleStartOrder = () => {
    setOrderStarted(true);
    setShowNewOrderDialog(false);
    // Autofocus search after a short delay to allow render
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
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
    setServiceType('takeaway');
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
    setTempQuantity(1); // Reset quantity
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

  const addToCartDirect = (product: ProductWithAvailability, qty: number = 1) => {
    const price = product.branchProduct?.custom_price || product.price;
    const newItemId = crypto.randomUUID();
    const newItem: CartItem = {
      id: newItemId,
      product,
      quantity: qty,
      customPrice: price !== product.price ? price : undefined,
      modifiers: [],
      modifiersTotal: 0,
    };
    setCart(prev => [...prev, newItem]);
    
    // Flash animation for the product card
    setRecentlyAddedProduct(product.id);
    setTimeout(() => setRecentlyAddedProduct(null), 600);
    
    // Track for cart scroll
    lastAddedItemRef.current = newItemId;
    
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
      // Add new item with quantity from modal
      const newItemId = crypto.randomUUID();
      const newItem: CartItem = {
        id: newItemId,
        product: selectedProduct,
        quantity: tempQuantity, // Use quantity from modal
        notes: tempNotes || undefined,
        customPrice: price !== selectedProduct.price ? price : undefined,
        modifiers: selectedModifiers,
        modifiersTotal,
      };
      setCart(prev => [...prev, newItem]);
      
      // Flash animation for the product card
      setRecentlyAddedProduct(selectedProduct.id);
      setTimeout(() => setRecentlyAddedProduct(null), 600);
      
      // Track for cart scroll
      lastAddedItemRef.current = newItemId;
      
      toast.success(`${selectedProduct.name} agregado`);
    }
    
    setSelectedProduct(null);
    setEditingCartItemId(null);
    setTempQuantity(1); // Reset quantity
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
  const deliveryFee = (serviceType === 'delivery' || orderArea === 'apps') && customDeliveryFee 
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
    // serviceType directly maps to order_type
    return serviceType;
  };

  // Get the channel slug for database
  const getChannelSlug = (): string => {
    if (orderArea === 'apps') {
      return appsChannel; // 'rappi', 'pedidos_ya', 'mp_delivery'
    }
    return 'mostrador'; // POS always uses 'mostrador' channel
  };

  const getSalesChannel = (): Enums<'sales_channel'> => {
    // Map to legacy sales_channel enum for backwards compatibility
    if (orderArea === 'apps') {
      if (appsChannel === 'mp_delivery') return 'mercadopago_delivery';
      return appsChannel === 'rappi' ? 'rappi' : 'pedidos_ya';
    }
    return 'pos_local';
  };

  // All order areas are always available in POS
  const availableOrderAreas = ORDER_AREAS;


  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    // Validation based on order area and service type
    if (orderArea === 'mostrador') {
      if (serviceType === 'dine_in' && !callerNumber.trim()) {
        toast.error('Ingresá el número de llamador');
        return;
      }
      if (serviceType === 'takeaway' && !customerName.trim()) {
        toast.error('Ingresá el nombre o número de llamador');
        return;
      }
      if (serviceType === 'delivery') {
        if (!customerName.trim() || !customerPhone.trim()) {
          toast.error('Nombre y teléfono son requeridos');
          return;
        }
        if (!deliveryAddress.trim()) {
          toast.error('Ingresá la dirección de entrega');
          return;
        }
      }
    } else if (orderArea === 'apps') {
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
        .insert([{
          branch_id: branch.id,
          customer_name: customerName || `Llamador #${callerNumber}`,
          customer_phone: customerPhone || '',
          customer_email: customerEmail || null,
          delivery_address: (serviceType === 'delivery' || orderArea === 'apps') ? deliveryAddress : null,
          table_number: null,
          caller_number: callerNumber ? parseInt(callerNumber) : null,
          order_type: mapOrderType(),
          service_type: orderArea === 'apps' ? 'delivery' : serviceType,
          order_area: orderArea === 'apps' ? 'delivery' : (serviceType === 'dine_in' ? 'salon' : orderArea),
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
        }])
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
      // selectedTableId removed - tables feature not used
      setExternalOrderId('');
      setCustomDeliveryFee('');
      setInvoiceType('consumidor_final');
      setCustomerCuit('');
      setCustomerBusinessName('');
      setIsCheckoutOpen(false);

    } catch (error) {
      handleError(error, { userMessage: 'Error al crear el pedido', context: 'POSView.handleCheckout' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] -m-6">
      
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
      {/* Products Section */}
      <div className="flex-1 p-4 overflow-hidden flex flex-col bg-muted/30">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">{branch.name}</h1>
            <p className="text-sm text-muted-foreground">Punto de Venta</p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Cash status indicator - only shows when open */}
            <CashStatusIndicator branchId={branch.id} />
            
            {/* Show order info badge when order started */}
            {orderStarted && (
              <Badge variant="outline" className="gap-1 py-1.5 px-3">
                {orderArea === 'mostrador' && <Store className="w-4 h-4" />}
                {orderArea === 'apps' && <Bike className="w-4 h-4" />}
                <span className="ml-1">
                  {orderArea === 'apps' 
                    ? APPS_CHANNELS.find(c => c.value === appsChannel)?.label 
                    : ORDER_AREAS.find(a => a.value === orderArea)?.label
                  }
                  {orderArea === 'mostrador' && ` - ${SERVICE_TYPES.find(s => s.value === serviceType)?.label}`}
                </span>
              </Badge>
            )}
          </div>
        </div>
        
        {/* CASH CLOSED BLOCK - shown when no cash register is open (only after we've checked) */}
        {shiftStatus.hasChecked && !hasCashOpen && (
          <CashClosedBlock branchId={branch.id} onCashOpened={() => shiftStatus.refetch()} />
        )}

        {/* NEW ORDER SCREEN - shown when cash is open but no order started */}
        {shiftStatus.hasChecked && hasCashOpen && !orderStarted && (
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
              ref={searchInputRef}
              placeholder="Buscar productos... (escribe para filtrar)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon" onClick={handleCancelOrderClick} title="Cancelar pedido">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* FAVORITES STICKY BAR - Top sellers for quick access */}
        {(() => {
          const favoriteProducts = products.filter(p => p.branchProduct?.is_favorite && p.branchProduct?.is_available !== false);
          if (favoriteProducts.length === 0) return null;
          
          return (
            <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-primary fill-primary" />
                <span className="text-sm font-semibold text-primary">Favoritos</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {favoriteProducts.slice(0, 12).map(product => {
                  const price = product.branchProduct?.custom_price || product.price;
                  const cartCount = cart.filter(item => item.product.id === product.id)
                    .reduce((sum, item) => sum + item.quantity, 0);
                  
                  return (
                    <button
                      key={product.id}
                      onClick={() => activeShift && handleProductClick(product)}
                      disabled={!activeShift}
                      className={`
                        shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
                        ${cartCount > 0 ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-muted'}
                        ${recentlyAddedProduct === product.id ? 'animate-pulse bg-success/20 border-success' : ''}
                        ${!activeShift ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      {cartCount > 0 && (
                        <Badge className="w-5 h-5 rounded-full p-0 flex items-center justify-center text-xs">
                          {cartCount}
                        </Badge>
                      )}
                      <span className="text-sm font-medium truncate max-w-24">{product.name}</span>
                      <span className="text-sm font-bold text-primary">{formatPrice(price)}</span>
                      {product.hasModifiers && (
                        <PlusCircle className="w-3.5 h-3.5 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

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
                
                // Check stock status for visual indicator
                const stockQty = product.branchProduct?.stock_quantity;
                const hasLowStock = stockQty !== null && stockQty !== undefined && stockQty > 0 && stockQty <= 5;
                const isOutOfStock = stockQty !== null && stockQty !== undefined && stockQty <= 0;
                const isFavorite = product.branchProduct?.is_favorite;
                
                // Check if this is a beverage for compact mode
                const productCategory = categories.find(c => c.id === product.category_id);
                const isBeverage = productCategory && BEVERAGE_CATEGORY_NAMES.some(
                  name => productCategory.name.toLowerCase().includes(name)
                );
                
                // Flash animation when recently added
                const isRecentlyAdded = recentlyAddedProduct === product.id;
                
                // COMPACT MODE for beverages
                if (isBeverage) {
                  return (
                    <div
                      key={product.id}
                      onClick={() => activeShift && !isOutOfStock && handleProductClick(product)}
                      className={`
                        relative flex items-center gap-2 p-2 rounded-lg border transition-all
                        ${!activeShift || isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-muted'}
                        ${cartCount > 0 ? 'border-primary bg-primary/5' : 'border-border'}
                        ${isRecentlyAdded ? 'animate-pulse bg-success/20 border-success' : ''}
                      `}
                    >
                      {/* Compact beverage icon */}
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                        {product.image_url ? (
                          <img src={product.image_url} alt="" className="w-full h-full object-cover rounded" />
                        ) : (
                          <Coffee className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      
                      {/* Name and price - PRICE FIRST (bigger) */}
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-bold text-primary">{formatPrice(price)}</p>
                        <p className={`text-xs truncate ${isOutOfStock ? 'line-through text-muted-foreground' : 'text-muted-foreground'}`}>
                          {product.name}
                        </p>
                      </div>
                      
                      {/* Cart count */}
                      {cartCount > 0 && (
                        <Badge className="w-5 h-5 rounded-full p-0 flex items-center justify-center text-xs">
                          {cartCount}
                        </Badge>
                      )}
                      
                      {/* Modifier indicator */}
                      {product.hasModifiers && !isOutOfStock && (
                        <PlusCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                    </div>
                  );
                }
                
                // STANDARD CARD for non-beverages
                return (
                  <Card 
                    key={product.id}
                    className={`relative transition-all ${
                      !activeShift || isOutOfStock
                        ? 'opacity-50 cursor-not-allowed' 
                        : `cursor-pointer hover:shadow-md ${cartCount > 0 ? 'ring-2 ring-primary' : ''}`
                    } ${isRecentlyAdded ? 'animate-pulse ring-2 ring-success' : ''}`}
                    onClick={() => activeShift && !isOutOfStock && handleProductClick(product)}
                  >
                    {/* Cart count badge */}
                    {cartCount > 0 && (
                      <Badge className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 flex items-center justify-center z-10">
                        {cartCount}
                      </Badge>
                    )}
                    
                    {/* Status indicators - TOP LEFT */}
                    <div className="absolute top-1 left-1 flex gap-1 z-10">
                      {isOutOfStock && (
                        <Badge variant="destructive" className="text-xs">
                          Agotado
                        </Badge>
                      )}
                      {hasLowStock && !isOutOfStock && (
                        <Badge variant="outline" className="text-xs bg-destructive/80 text-destructive-foreground">
                          Últimos {stockQty}
                        </Badge>
                      )}
                      {isFavorite && !isOutOfStock && !hasLowStock && (
                        <Badge variant="secondary" className="text-xs px-1">
                          <Star className="w-3 h-3 fill-current" />
                        </Badge>
                      )}
                    </div>
                    
                    {/* Modifier indicator - TOP RIGHT */}
                    {product.hasModifiers && !isOutOfStock && (
                      <Badge variant="outline" className="absolute top-1 right-1 text-xs z-10 bg-background/80 border-primary/50">
                        <PlusCircle className="w-3.5 h-3.5 text-primary" />
                      </Badge>
                    )}
                    
                    <CardContent className="p-2">
                      {/* POS optimized image - 4:3 with padding */}
                      <div className={`w-full aspect-[4/3] rounded bg-muted flex items-center justify-center mb-1 overflow-hidden ${isOutOfStock ? 'grayscale' : ''}`}>
                        {(product.pos_thumb_url || product.image_url) ? (
                          <img 
                            src={product.pos_thumb_url || product.image_url?.replace('/products/', '/products/pos/').replace(/\.(png|PNG)$/, '.jpg') || ''} 
                            alt={product.name} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to original image if POS thumb doesn't exist
                              if (product.image_url && e.currentTarget.src !== product.image_url) {
                                e.currentTarget.src = product.image_url;
                              }
                            }}
                          />
                        ) : (
                          <span className="text-xl">🍔</span>
                        )}
                      </div>
                      {/* PRICE FIRST (bigger), then name (smaller) */}
                      <p className="text-lg font-bold text-primary">{formatPrice(price)}</p>
                      <p className={`text-xs line-clamp-2 ${isOutOfStock ? 'line-through text-muted-foreground' : 'text-muted-foreground'}`}>
                        {product.name}
                      </p>
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
                  {callerNumber && !customerName?.startsWith('Llamador #') && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Hash className="w-4 h-4" />
                      <span>Llamador #{callerNumber}</span>
                    </div>
                  )}
                  {serviceType === 'delivery' && deliveryAddress && (
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
            <div className="space-y-3" ref={cartScrollRef}>
              {cart.map(item => (
                <div 
                  key={item.id}
                  data-cart-item-id={item.id}
                  className={`
                    bg-muted/50 rounded-lg p-3 transition-colors group
                    ${item.product.hasModifiers ? 'cursor-pointer hover:bg-muted/70' : ''}
                  `}
                  onClick={() => item.product.hasModifiers && handleEditCartItem(item)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{item.product.name}</p>
                        {/* Edit icon - only for products with modifiers */}
                        {item.product.hasModifiers && (
                          <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
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
                    ? 'Caja cerrada' 
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
      </div> {/* End flex wrapper for Products + Cart */}

      {/* Product Modifier Dialog - with keyboard shortcuts */}
      <Dialog 
        open={!!selectedProduct && productModifiers.length > 0} 
        onOpenChange={() => {
          setSelectedProduct(null);
          setTempQuantity(1);
        }}
      >
        <DialogContent 
          className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
          onKeyDown={(e) => {
            // Keyboard shortcuts: Enter confirms, Esc cancels (Esc is default)
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              addToCartWithModifiers();
            }
          }}
        >
          <DialogHeader>
            <div className="flex items-start gap-3">
              {/* Product image thumbnail */}
              {selectedProduct?.image_url && (
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                  <img 
                    src={selectedProduct.image_url} 
                    alt={selectedProduct.name} 
                    className="w-full h-full object-cover" 
                  />
                </div>
              )}
              <div className="flex-1">
                <DialogTitle className="flex items-center gap-2">
                  <ChefHat className="w-5 h-5" />
                  {selectedProduct?.name}
                </DialogTitle>
                <DialogDescription>
                  {editingCartItemId ? 'Modificá los extras de tu pedido' : 'Personalizá tu pedido'}
                </DialogDescription>
                {/* Price display */}
                {selectedProduct && (
                  <p className="text-lg font-bold text-primary mt-1">
                    {formatPrice(selectedProduct.branchProduct?.custom_price || selectedProduct.price)}
                  </p>
                )}
              </div>
            </div>
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

          {/* STICKY FOOTER with quantity control */}
          <div className="sticky bottom-0 bg-background border-t pt-4 space-y-3">
            {/* Quantity control - only when adding new (not editing) */}
            {!editingCartItemId && (
              <div className="flex items-center justify-center gap-4 py-2">
                <span className="text-sm text-muted-foreground">Cantidad:</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setTempQuantity(Math.max(1, tempQuantity - 1))}
                    disabled={tempQuantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-8 text-center text-lg font-bold">{tempQuantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setTempQuantity(tempQuantity + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setSelectedProduct(null);
                  setEditingCartItemId(null);
                  setTempQuantity(1);
                }}
              >
                Cancelar
              </Button>
              <Button className="flex-1" onClick={addToCartWithModifiers}>
                {editingCartItemId ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Guardar cambios
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar al pedido {tempQuantity > 1 ? `(${tempQuantity})` : ''}
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Enter para confirmar • Esc para cancelar
            </p>
          </div>
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
            {/* Service Type selector - 3 options now */}
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant={serviceType === 'takeaway' ? 'default' : 'outline'}
                onClick={() => setServiceType('takeaway')}
                className="flex-col h-auto py-6"
              >
                <ShoppingCart className="w-8 h-8 mb-2" />
                <span className="text-base font-medium">Take Away</span>
              </Button>
              <Button
                variant={serviceType === 'dine_in' ? 'default' : 'outline'}
                onClick={() => setServiceType('dine_in')}
                className="flex-col h-auto py-6"
              >
                <Utensils className="w-8 h-8 mb-2" />
                <span className="text-base font-medium">Comer Acá</span>
              </Button>
              <Button
                variant={serviceType === 'delivery' ? 'default' : 'outline'}
                onClick={() => setServiceType('delivery')}
                className="flex-col h-auto py-6"
              >
                <Bike className="w-8 h-8 mb-2" />
                <span className="text-base font-medium">Delivery</span>
              </Button>
            </div>

            {serviceType === 'dine_in' && (
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

            {serviceType === 'takeaway' && (
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

            {serviceType === 'delivery' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre del cliente *</Label>
                  <Input
                    placeholder="Nombre"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono *</Label>
                  <Input
                    placeholder="Teléfono"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dirección *</Label>
                  <Input
                    placeholder="Dirección de entrega"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                  />
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
              disabled={(serviceType === 'dine_in' && !callerNumber) || (serviceType === 'delivery' && (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()))}
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
          serviceType,
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
                  <Label>Tipo de servicio</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant={serviceType === 'takeaway' ? 'default' : 'outline'}
                      onClick={() => setServiceType('takeaway')}
                      className="flex-col h-auto py-4"
                    >
                      <Store className="w-6 h-6 mb-2" />
                      <span className="font-medium">Para llevar</span>
                    </Button>
                    <Button
                      variant={serviceType === 'dine_in' ? 'default' : 'outline'}
                      onClick={() => setServiceType('dine_in')}
                      className="flex-col h-auto py-4"
                    >
                      <Utensils className="w-6 h-6 mb-2" />
                      <span className="font-medium">Comer acá</span>
                    </Button>
                    <Button
                      variant={serviceType === 'delivery' ? 'default' : 'outline'}
                      onClick={() => setServiceType('delivery')}
                      className="flex-col h-auto py-4"
                    >
                      <Bike className="w-6 h-6 mb-2" />
                      <span className="font-medium">Delivery</span>
                    </Button>
                  </div>
                </div>

                {/* Caller Number Grid - for takeaway and dine_in */}
                {(serviceType === 'takeaway' || serviceType === 'dine_in') && (
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
                )}

                {/* Delivery info for mostrador delivery */}
                {serviceType === 'delivery' && (
                  <div className="space-y-3">
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
                )}

                {/* Optional Name for takeaway/dine_in */}
                {(serviceType === 'takeaway' || serviceType === 'dine_in') && (
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
                )}

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

            {/* Apps Options - delivery via third party apps */}

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
                (orderArea === 'mostrador' && serviceType === 'dine_in' && !callerNumber) ||
                (orderArea === 'mostrador' && serviceType === 'takeaway' && !callerNumber && !customerName.trim()) ||
                (orderArea === 'mostrador' && serviceType === 'delivery' && (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim())) ||
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
