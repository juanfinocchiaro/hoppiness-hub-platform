import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;
type Branch = Tables<'branches'>;

interface ProductWithPrice extends Product {
  finalPrice: number;
  category?: { id: string; name: string } | null;
  isAvailable?: boolean;
  stockQuantity?: number | null;
}

interface SelectedModifiers {
  [groupId: string]: string[];
}

export interface CartItem {
  id: string; // Unique cart item ID
  product: ProductWithPrice;
  quantity: number;
  modifiers?: SelectedModifiers;
  modifiersTotal?: number;
  modifierNames?: string[];
  notes?: string;
}

export type OrderMode = 'delivery' | 'takeaway';

interface CartContextValue {
  // Branch
  branch: Branch | null;
  setBranch: (branch: Branch | null) => void;
  
  // Order mode
  orderMode: OrderMode;
  setOrderMode: (mode: OrderMode) => void;
  
  // Address
  deliveryAddress: string;
  setDeliveryAddress: (address: string) => void;
  
  // Cart items
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  
  // Computed values
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  
  // Helpers
  formatPrice: (price: number) => string;
  
  // Branch change handling
  confirmBranchChange: (newBranch: Branch) => void;
  pendingBranchChange: Branch | null;
  showBranchChangeModal: boolean;
  cancelBranchChange: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [branch, setBranchState] = useState<Branch | null>(null);
  const [orderMode, setOrderMode] = useState<OrderMode>('delivery');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [items, setItems] = useState<CartItem[]>([]);
  
  // Branch change modal state
  const [pendingBranchChange, setPendingBranchChange] = useState<Branch | null>(null);
  const [showBranchChangeModal, setShowBranchChangeModal] = useState(false);
  
  // Generate unique cart item ID
  const generateItemId = () => `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Format price helper
  const formatPrice = useCallback((price: number) => 
    new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: 'ARS', 
      minimumFractionDigits: 0 
    }).format(price), []);
  
  // Set branch with cart clearing logic
  const setBranch = useCallback((newBranch: Branch | null) => {
    if (items.length > 0 && newBranch && branch && newBranch.id !== branch.id) {
      setPendingBranchChange(newBranch);
      setShowBranchChangeModal(true);
      return;
    }
    setBranchState(newBranch);
  }, [items.length, branch]);
  
  // Confirm branch change (clears cart)
  const confirmBranchChange = useCallback((newBranch: Branch) => {
    setItems([]);
    setBranchState(newBranch);
    setPendingBranchChange(null);
    setShowBranchChangeModal(false);
    toast.info('Carrito vaciado al cambiar de sucursal');
  }, []);
  
  // Cancel branch change
  const cancelBranchChange = useCallback(() => {
    setPendingBranchChange(null);
    setShowBranchChangeModal(false);
  }, []);
  
  // Add item to cart
  const addItem = useCallback((item: Omit<CartItem, 'id'>) => {
    const itemWithId: CartItem = { ...item, id: generateItemId() };
    
    // Check for existing item with same product and modifiers
    const existingIndex = items.findIndex(
      existing => 
        existing.product.id === item.product.id && 
        JSON.stringify(existing.modifiers) === JSON.stringify(item.modifiers)
    );
    
    if (existingIndex >= 0) {
      setItems(prev => prev.map((existing, idx) => 
        idx === existingIndex 
          ? { ...existing, quantity: existing.quantity + item.quantity }
          : existing
      ));
    } else {
      setItems(prev => [...prev, itemWithId]);
    }
    
    toast.success(`${item.product.name} agregado al pedido`);
  }, [items]);
  
  // Update item quantity
  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(item => item.id !== itemId));
    } else {
      setItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, quantity } : item
      ));
    }
  }, []);
  
  // Remove item
  const removeItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  }, []);
  
  // Clear cart
  const clearCart = useCallback(() => {
    setItems([]);
  }, []);
  
  // Computed values
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  
  const subtotal = items.reduce((sum, item) => 
    sum + (item.product.finalPrice + (item.modifiersTotal || 0)) * item.quantity, 0);
  
  // Delivery fee based on mode
  const deliveryFee = orderMode === 'delivery' ? 500 : 0; // TODO: Calculate from branch/zone
  
  const total = subtotal + deliveryFee;
  
  const value: CartContextValue = {
    branch,
    setBranch,
    orderMode,
    setOrderMode,
    deliveryAddress,
    setDeliveryAddress,
    items,
    addItem,
    updateItemQuantity,
    removeItem,
    clearCart,
    itemCount,
    subtotal,
    deliveryFee,
    total,
    formatPrice,
    confirmBranchChange,
    pendingBranchChange,
    showBranchChangeModal,
    cancelBranchChange,
  };
  
  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
