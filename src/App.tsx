/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Minus,
  Clock, 
  MapPin, 
  Instagram, 
  Phone,
  Pizza as PizzaIcon,
  Truck,
  Star,
  MessageCircle,
  ChevronRight,
  ChevronDown,
  Info,
  ShoppingCart,
  X,
  CreditCard,
  QrCode,
  Wallet,
  ExternalLink,
  Search,
  User,
  LogOut,
  History,
  Ticket,
  Beer,
  AlertCircle,
  CheckCircle2,
  Utensils,
  Lock
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerFooter,
  DrawerDescription
} from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Toaster, toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PIZZAS, SIZES, EXTRA_INGREDIENTS, NEIGHBORHOODS, DELIVERY_FEES, type Pizza, type PizzaSize, type Order, type CartItem, type OrderStatus, type StoreConfig, type PaymentMethod } from './types';
import { auth, db } from './firebase';
import AdminDashboardComponent from './components/AdminDashboard';
import DeliveryDashboardComponent from './components/DeliveryDashboard';
import { 
  onAuthStateChanged, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  serverTimestamp,
  getDocs,
  doc
} from 'firebase/firestore';




const ImageWithSkeleton = ({ src, alt, className, ...props }: any) => {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current?.complete) {
      setLoaded(true);
    }
  }, []);

  return (
    <div className={cn("relative overflow-hidden bg-white/5", className)}>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-white/10" />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={cn(
          "transition-all duration-700 w-full h-full object-cover",
          loaded ? "opacity-100 scale-100" : "opacity-0 scale-110",
          className
        )}
        {...props}
      />
    </div>
  );
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return new Error(JSON.stringify(errInfo));
};

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminView = location.pathname.startsWith('/admin');
  const isDeliveryView = location.pathname.startsWith('/entregas');

  const [user, setUser] = useState<any>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      // Removed automatic setIsLoginOpen(true) to allow guest browsing
    });
    return () => unsub();
  }, []);
  
  useEffect(() => {
    if (isAdminView && !user) {
      setIsLoginOpen(true);
    }
  }, [isAdminView, user]);
  
  const [selectedPizza, setSelectedPizza] = useState<Pizza | null>(null);
  const [isHalfAndHalf, setIsHalfAndHalf] = useState(false);
  const [secondPizza, setSecondPizza] = useState<Pizza | null>(null);
  const [isCartBouncing, setIsCartBouncing] = useState(false);
  const [customization, setCustomization] = useState<{
    size: PizzaSize;
    extras: string[];
  }>({ size: 'Média', extras: [] });
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'address' | 'payment' | 'summary' | 'confirmation'>('cart');
  const [isNeighborhoodOpen, setIsNeighborhoodOpen] = useState(false);
  const [isTemporarilyOpen, setIsTemporarilyOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [whatsappLink, setWhatsappLink] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState('Destaques');
  
  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  // Checkout State
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    street: '',
    number: '',
    neighborhood: '',
    complement: '',
    observations: '',
    needChange: false,
    changeFor: '',
    paymentMethod: 'cash_delivery' as PaymentMethod
  });

  const [storeConfig, setStoreConfig] = useState<StoreConfig>({ lojaAberta: true });
  const [menuStatus, setMenuStatus] = useState<Record<string, boolean>>({});
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [currentOrderStatus, setCurrentOrderStatus] = useState<OrderStatus>('received');
  const successAudioRef = useRef<HTMLAudioElement | null>(null);

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);

  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [deliveryFee, setDeliveryFee] = useState(0);

  const displayPizzas = useMemo(() => {
    return PIZZAS.map(p => ({
      ...p,
      available: menuStatus[p.id] !== false
    }));
  }, [menuStatus]);

  // Listen to store config and menu - Shared
  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'config', 'store'), (snapshot) => {
      if (snapshot.exists()) setStoreConfig(snapshot.data() as StoreConfig);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'config/store'));

    const unsubMenu = onSnapshot(collection(db, 'menu'), (snapshot) => {
      const status: Record<string, boolean> = {};
      snapshot.docs.forEach(doc => {
        status[doc.id] = doc.data().available;
      });
      setMenuStatus(status);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'menu'));

    return () => {
      unsubConfig();
      unsubMenu();
    };
  }, []);

  // Auth and Personal Orders listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        setOrders([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user || isAdminView) return;

    const q = query(
      collection(db, 'orders'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    
    const unsubOrders = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(ordersData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));

    return () => unsubOrders();
  }, [user, isAdminView]);

  useEffect(() => {
    if (deliveryType === 'delivery' && customerInfo.neighborhood) {
      const fee = DELIVERY_FEES.find(f => f.name === customerInfo.neighborhood)?.fee || 0;
      setDeliveryFee(fee);
    } else {
      setDeliveryFee(0);
    }
  }, [deliveryType, customerInfo.neighborhood]);

  // Listen to current order status when confirmed
  useEffect(() => {
    if (checkoutStep === 'confirmation' && lastOrderId) {
      // Play success sound
      if (successAudioRef.current) {
        successAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
      }

      const unsubOrder = onSnapshot(doc(db, 'orders', lastOrderId), (snapshot) => {
        if (snapshot.exists()) {
          setCurrentOrderStatus(snapshot.data().status as OrderStatus);
        }
      }, (error) => handleFirestoreError(error, OperationType.GET, `orders/${lastOrderId}`));
      return () => unsubOrder();
    }
  }, [checkoutStep, lastOrderId]);

  // Listen to loyalty points when phone is provided
  useEffect(() => {
    if (customerInfo.phone && customerInfo.phone.length >= 10) {
      const unsubLoyalty = onSnapshot(doc(db, 'loyalty', customerInfo.phone), (snapshot) => {
        if (snapshot.exists()) {
          setLoyaltyPoints(snapshot.data().points || 0);
        }
      }, (error) => handleFirestoreError(error, OperationType.GET, `loyalty/${customerInfo.phone}`));
      return () => unsubLoyalty();
    }
  }, [customerInfo.phone]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const activeOrder = useMemo(() => {
    return orders.find(o => ['received', 'cooking', 'delivery'].includes(o.status));
  }, [orders]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((total, item) => total + item.totalPrice, 0);
  }, [cart]);

  const cartTotal = useMemo(() => {
    let total = cartSubtotal;
    if (appliedCoupon) {
      total = cartSubtotal * (1 - appliedCoupon.discount / 100);
    }
    return total + deliveryFee;
  }, [cartSubtotal, appliedCoupon, deliveryFee]);

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    try {
      const q = query(collection(db, 'coupons'), where('code', '==', couponCode.toUpperCase()), where('active', '==', true));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const coupon = querySnapshot.docs[0].data();
        setAppliedCoupon({ code: coupon.code, discount: coupon.discountPercent });
        toast.success(`Cupom ${coupon.code} aplicado! ${coupon.discountPercent}% de desconto.`);
      } else {
        toast.error('Cupom inválido ou expirado.');
      }
    } catch (error) {
      toast.error('Erro ao aplicar cupom.');
    }
  };

  const addToCart = () => {
    if (!selectedPizza) return;

    if (isHalfAndHalf && !secondPizza) {
      toast.error('Por favor, selecione o segundo sabor para a pizza meia a meia.');
      return;
    }

    let itemPrice = selectedPizza?.basePrice || 0;
    
    if (selectedPizza?.category !== 'Bebidas') {
      const sizeMultiplier = SIZES.find(s => s.label === customization.size)?.multiplier || 1;
      
      // Half and half logic: price of the more expensive one
      const basePrice = isHalfAndHalf && secondPizza 
        ? Math.max(selectedPizza?.basePrice || 0, secondPizza?.basePrice || 0)
        : selectedPizza?.basePrice || 0;

      const extrasPrice = customization.extras.reduce((total, extraName) => {
        const extra = EXTRA_INGREDIENTS.find(e => e.name === extraName);
        return total + (extra?.price || 0);
      }, 0);
      
      itemPrice = (basePrice * sizeMultiplier) + extrasPrice;
    }

    const newItem: CartItem = {
      id: Math.random().toString(36).substr(2, 9),
      pizza: selectedPizza,
      pizza2: isHalfAndHalf ? (secondPizza || undefined) : undefined,
      size: selectedPizza.category !== 'Bebidas' ? customization.size : undefined,
      extras: [...customization.extras],
      quantity: 1,
      totalPrice: itemPrice
    };

    setCart(prev => [...prev, newItem]);
    
    // Redirect to drinks if a pizza was added
    if (selectedPizza.category !== 'Bebidas') {
      setActiveCategory('Bebidas');
      // Scroll to menu section to show drinks
      const menuSection = document.getElementById('menu');
      if (menuSection) {
        menuSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    setSelectedPizza(null);
    setIsHalfAndHalf(false);
    setSecondPizza(null);
    setCustomization({ size: 'Média', extras: [] });
    
    // Trigger cart bounce
    setIsCartBouncing(true);
    setTimeout(() => setIsCartBouncing(false), 500);
    
    toast.success(
      <div className="flex flex-col">
        <span className="font-bold">
          {isHalfAndHalf && secondPizza ? `Meia ${selectedPizza.name} / Meia ${secondPizza.name}` : selectedPizza.name}
        </span>
        <span className="text-xs opacity-70">Adicionado ao carrinho - R$ {itemPrice.toFixed(2)}</span>
      </div>,
      { icon: '🍕' }
    );
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(1, item.quantity + delta);
        const unitPrice = item.totalPrice / item.quantity;
        return {
          ...item,
          quantity: newQuantity,
          totalPrice: unitPrice * newQuantity
        };
      }
      return item;
    }));
  };

  const handleFinalizeOrder = async () => {
    setIsSubmitting(true);
    try {
      const orderData = {
        userId: user?.uid || `guest_${customerInfo.phone}`,
        customerName: customerInfo.name,
        phone: customerInfo.phone,
        items: cart.map(item => ({
          name: item.pizza.name,
          name2: item.pizza2?.name || null,
          size: item.size || null,
          extras: item.extras || [],
          quantity: Number(item.quantity) || 1,
          price: Number(item.totalPrice) || 0
        })),
        total: Number(cartTotal) || 0,
        status: 'received',
        deliveryType,
        paymentMethod: customerInfo.paymentMethod,
        deliveryFee: Number(deliveryFee) || 0,
        address: {
          ...customerInfo,
          complement: customerInfo.complement || null,
          observations: customerInfo.observations || null,
          changeFor: customerInfo.changeFor || null
        },
        createdAt: serverTimestamp(),
        couponCode: appliedCoupon?.code || null,
        discount: Number(appliedCoupon?.discount) || 0
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      setLastOrderId(docRef.id);
      
      // Generate the WhatsApp link BEFORE clearing the cart
      const link = generateWhatsAppLink(docRef.id, 'pizzaria');
      setWhatsappLink(link);

      setCheckoutStep('confirmation');
      setCart([]);
      setAppliedCoupon(null);
    } catch (error) {
      const firestoreError = handleFirestoreError(error, OperationType.CREATE, 'orders');
      console.error('Erro ao finalizar pedido:', firestoreError);
      toast.error('Erro ao processar pedido. Verifique os dados e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin Sound Notification removed - handled in AdminDashboard component

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { status: newStatus });
      toast.success(`Status atualizado para ${newStatus}`);
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };
  const handleReorder = (order: Order) => {
    const newItems = order.items.map((item: any) => {
      const pizza = PIZZAS.find(p => p.name === item.name);
      return {
        id: Math.random().toString(36).substr(2, 9),
        pizza: pizza || { name: item.name, basePrice: item.price / item.quantity, category: 'Tradicional' } as Pizza,
        size: item.size,
        extras: item.extras || [],
        quantity: item.quantity,
        totalPrice: item.price
      } as CartItem;
    });
    setCart(prev => [...prev, ...newItems]);
    setIsOrdersOpen(false);
    setIsCartOpen(true);
    toast.success('Itens adicionados ao carrinho!');
  };

  const generatePixPayload = (amount: number) => {
    const key = "22998487785";
    const merchantName = "OURO PRETO";
    const merchantCity = "NOVA FRIBURGO";
    const amountStr = amount.toFixed(2);
    const amountPart = `54${amountStr.length.toString().padStart(2, '0')}${amountStr}`;
    
    // Basic Pix structure (Static)
    // 000201 (Payload Format)
    // 26 (Merchant Account Info) -> 0014BR.GOV.BCB.PIX + 01 (Key Length + Key)
    // 52040000 (Merchant Category Code)
    // 5303986 (Currency BRL)
    // 54 (Amount)
    // 5802BR (Country)
    // 59 (Merchant Name)
    // 60 (Merchant City)
    // 62070503*** (Additional Data)
    // 6304 (CRC16 - simplified placeholder for this demo)
    
    const payload = `00020126330014BR.GOV.BCB.PIX0111${key}520400005303986${amountPart}5802BR59${merchantName.length.toString().padStart(2, '0')}${merchantName}60${merchantCity.length.toString().padStart(2, '0')}${merchantCity}62070503***6304`;
    
    // Note: A real CRC16 should be calculated here. 
    // For the sake of this UI demo, we'll use a fixed CRC or a placeholder.
    return payload + "1234"; 
  };

  const PIZZARIA_PHONE = "5522998487785";
  const COZINHA_PHONE = "5522998017088";

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      let formatted = numbers;
      if (numbers.length > 2) {
        formatted = `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
      }
      if (numbers.length > 7) {
        formatted = `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
      }
      return formatted;
    }
    return value.slice(0, 15);
  };

  const generateWhatsAppLink = (orderId?: string, target: 'pizzaria' | 'cozinha' = 'pizzaria') => {
    const id = orderId || lastOrderId || '---';
    const shortId = id.slice(-6).toUpperCase();

    if (target === 'cozinha') {
      let kitchenMsg = `*👨‍🍳 NOVO PEDIDO PARA COZINHA - #${shortId}*\n\n`;
      cart.forEach((item, index) => {
        kitchenMsg += `${index + 1}. ${item.quantity}x *${item.pizza.name}* ${item.size ? `(${item.size})` : ''}\n`;
        if (item.extras && item.extras.length > 0) {
          kitchenMsg += `   + Adicionais: ${item.extras.join(', ')}\n`;
        }
      });
      return `https://wa.me/${COZINHA_PHONE}?text=${encodeURIComponent(kitchenMsg)}`;
    }

    let message = `*🍕 NOVO PEDIDO - #${shortId}*\n\n` +
      `*👤 Nome:* ${customerInfo.name}\n` +
      `*📱 Tel:* ${customerInfo.phone}\n\n` +
      `*🛒 ITENS:*\n`;

    cart.forEach((item) => {
      const pizzaName = item.pizza2 
        ? `Meia ${item.pizza.name} / Meia ${item.pizza2.name}`
        : `${item.pizza.name}`;
        
      message += `${item.quantity}x *${pizzaName}* ${item.size ? `(${item.size})` : ''}\n`;
      if (item.extras && item.extras.length > 0) {
        message += `   + ${item.extras.join(', ')}\n`;
      }
    });

      message += `\n*📦 SUBTOTAL:* R$ ${cartSubtotal.toFixed(2)}\n`;
      if (deliveryFee > 0) {
        message += `*🛵 TAXA DE ENTREGA:* R$ ${deliveryFee.toFixed(2)}\n`;
      }
      if (appliedCoupon) {
        const discountAmount = cartSubtotal * (appliedCoupon.discount / 100);
        message += `*🏷️ DESCONTO:* - R$ ${discountAmount.toFixed(2)}\n`;
      }
      message += `*💰 VALOR TOTAL:* R$ ${cartTotal.toFixed(2)}\n`;
    message += `*💳 PAGAMENTO:* ${customerInfo.paymentMethod === 'pix_now' ? 'PIX (Comprovante abaixo)' : customerInfo.paymentMethod === 'card_delivery' ? 'CARTÃO (Levar maquininha)' : 'DINHEIRO'}\n`;

    if (customerInfo.needChange) {
      const changeValue = parseFloat(customerInfo.changeFor) - cartTotal;
      message += `*💵 TROCO PARA:* R$ ${parseFloat(customerInfo.changeFor).toFixed(2)} (Troco: R$ ${changeValue.toFixed(2)})\n`;
    }

    if (deliveryType === 'delivery') {
      message += `\n*📍 ENDEREÇO:* ${customerInfo.street}, ${customerInfo.number} - ${customerInfo.neighborhood}\n`;
      if (customerInfo.complement) {
        message += `*Ref:* ${customerInfo.complement}\n`;
      }
      const mapsQuery = encodeURIComponent(`${customerInfo.street}, ${customerInfo.number}, ${customerInfo.neighborhood}, Nova Friburgo`);
      message += `*🗺️ GPS:* https://www.google.com/maps/search/?api=1&query=${mapsQuery}\n`;
    } else {
      message += `\n*🚶 RETIRADA NO BALCÃO*\n`;
    }

    if (customerInfo.observations) {
      message += `\n*📝 OBS:* ${customerInfo.observations}\n`;
    }

    if (customerInfo.paymentMethod === 'pix_now') {
      message += `\n*✅ PAGAMENTO VIA PIX:*\nEstou enviando o comprovante abaixo para agilizar e confirmar meu pedido!`;
    } else {
      message += `\n*💳 PAGAMENTO:* ${customerInfo.paymentMethod === 'card_delivery' ? 'Cartão na Entrega' : 'Dinheiro'}\nFavor confirmar o valor total e o tempo de espera para eu acertar o pagamento.`;
    }

    return `https://wa.me/${PIZZARIA_PHONE}?text=${encodeURIComponent(message)}`;
  };

  // Local AdminDashboard removed to use the one from components/AdminDashboard.tsx
  const CustomizationContent = () => {
    const [secondPizzaCategory, setSecondPizzaCategory] = useState<string>('Tradicional');
    const availableSecondPizzas = displayPizzas.filter(p => p.category !== 'Bebidas' && p.available);

    return (
      <div className="space-y-8 py-6 md:py-4">
        {/* Half and Half Toggle */}
        {selectedPizza?.category !== 'Bebidas' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-black uppercase tracking-widest text-white">Fazer Meia a Meia?</Label>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Escolha dois sabores em uma única pizza</p>
              </div>
              <button 
                onClick={() => {
                  const currentSize = SIZES.find(s => s.label === customization.size);
                  if (currentSize?.maxFlavors === 1) {
                    toast.error(`O tamanho ${currentSize.label} não permite meio a meio.`);
                    return;
                  }
                  setIsHalfAndHalf(!isHalfAndHalf);
                  if (!isHalfAndHalf) setSecondPizza(null);
                }}
                className={`h-6 w-12 rounded-full transition-all relative ${isHalfAndHalf ? 'bg-gold' : 'bg-white/10'}`}
              >
                <motion.div 
                  animate={{ x: isHalfAndHalf ? 24 : 4 }}
                  className={`h-4 w-4 rounded-full absolute top-1 ${isHalfAndHalf ? 'bg-deep-black' : 'bg-white/40'}`}
                />
              </button>
            </div>

            {isHalfAndHalf && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 pt-4 border-t border-white/5"
              >
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {['Tradicional', 'Especial', 'Premium', 'Doce'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSecondPizzaCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        secondPizzaCategory === cat ? 'bg-gold text-deep-black' : 'bg-white/5 text-white/40 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-[240px] overflow-y-auto pr-2 scrollbar-hide">
                  {availableSecondPizzas.filter(p => p.category === secondPizzaCategory).map((pizza) => (
                    <button
                      key={pizza.id}
                      onClick={() => setSecondPizza(pizza)}
                      className={`flex items-center gap-3 p-2 rounded-xl border transition-all ${
                        secondPizza?.id === pizza.id 
                          ? 'bg-gold/20 border-gold text-gold' 
                          : 'bg-white/5 border-white/5 text-white/60 hover:border-white/20'
                      }`}
                    >
                      <ImageWithSkeleton src={pizza.image} className="h-10 w-10 rounded-lg object-cover" alt={pizza.name} />
                      <div className="flex-1 text-left">
                        <p className="text-xs font-black uppercase italic">{pizza.name}</p>
                        <p className="text-[10px] opacity-60">R$ {pizza.basePrice.toFixed(2)}</p>
                      </div>
                      {secondPizza?.id === pizza.id && <Star className="h-3 w-3 fill-gold" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Size Selection */}
        {selectedPizza?.category !== 'Bebidas' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Tamanho</Label>
              <Badge variant="ghost" className="text-[10px] border border-gold/20 text-gold/60">Obrigatório</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {SIZES.map((size) => {
                const basePrice = isHalfAndHalf && secondPizza 
                  ? Math.max(selectedPizza?.basePrice || 0, secondPizza?.basePrice || 0)
                  : (selectedPizza?.basePrice || 0);

                return (
                  <button
                    key={size.label}
                    onClick={() => {
                      setCustomization(prev => ({ ...prev, size: size.label }));
                      if (size.maxFlavors === 1) {
                        setIsHalfAndHalf(false);
                        setSecondPizza(null);
                      }
                    }}
                    className={`p-4 rounded-xl border text-sm font-bold transition-all flex flex-col items-start gap-1 relative overflow-hidden group ${
                      customization.size === size.label 
                        ? 'bg-gold border-gold text-deep-black' 
                        : 'bg-white/5 border-white/10 hover:border-white/30 text-white/70 hover:text-white'
                    }`}
                  >
                    <span className="uppercase tracking-tighter z-10">{size.label}</span>
                    <span className={`text-xs z-10 ${customization.size === size.label ? 'text-deep-black/80' : 'text-white/40'}`}>
                      R$ {(basePrice * size.multiplier).toFixed(2)}
                    </span>
                    {customization.size === size.label && (
                      <motion.div 
                        layoutId="activeSize"
                        className="absolute inset-0 bg-gold z-0"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

      {/* Extras */}
      {selectedPizza?.category !== 'Bebidas' && (
        <div className="space-y-4">
          <Label className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Adicionais (Opcional)</Label>
          <div className="grid grid-cols-2 gap-3">
            {EXTRA_INGREDIENTS.map((extra) => (
              <button
                key={extra.name}
                onClick={() => {
                  setCustomization(prev => ({
                    ...prev,
                    extras: prev.extras.includes(extra.name) 
                      ? prev.extras.filter(e => e !== extra.name)
                      : [...prev.extras, extra.name]
                  }));
                }}
                className={`p-4 rounded-xl border text-sm font-bold transition-all flex flex-col items-start gap-1 relative overflow-hidden ${
                  customization.extras.includes(extra.name) 
                    ? 'bg-pizza-red border-pizza-red text-white' 
                    : 'bg-white/5 border-white/10 hover:border-white/30 text-white/70 hover:text-white'
                }`}
              >
                <span className="uppercase tracking-tighter z-10">{extra.name}</span>
                <span className={`text-xs z-10 ${customization.extras.includes(extra.name) ? 'text-white/90' : 'text-white/40'}`}>
                  + R$ {extra.price.toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedPizza?.category === 'Bebidas' && (
        <div className="py-12 text-center space-y-4">
          <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mx-auto">
            <Beer className="h-10 w-10 text-gold" />
          </div>
          <p className="text-white/60 font-medium">Bebida gelada pronta para acompanhar sua pizza!</p>
        </div>
      )}
    </div>
    );
  };

  const CustomizationFooter = () => (
    <div className="p-6 border-t border-white/5 bg-graphite/95 backdrop-blur-md">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-1 text-center md:text-left">
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Subtotal</p>
          <p className="text-4xl md:text-3xl font-black text-gold">
            R$ {(
              (isHalfAndHalf && secondPizza ? Math.max(selectedPizza?.basePrice || 0, secondPizza?.basePrice || 0) : (selectedPizza?.basePrice || 0)) * 
              (selectedPizza?.category !== 'Bebidas' ? (SIZES.find(s => s.label === customization.size)?.multiplier || 1) : 1) +
              (selectedPizza?.category !== 'Bebidas' ? customization.extras.reduce((acc, name) => acc + (EXTRA_INGREDIENTS.find(e => e.name === name)?.price || 0), 0) : 0)
            ).toFixed(2)}
          </p>
        </div>
        <Button 
          onClick={addToCart}
          disabled={isHalfAndHalf && !secondPizza}
          className="w-full md:w-auto bg-gold hover:bg-gold-dark text-deep-black font-black uppercase tracking-widest h-16 md:h-14 px-12 md:px-8 rounded-full shadow-lg shadow-gold/20 group text-lg md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isHalfAndHalf && !secondPizza ? 'ESCOLHA O 2º SABOR' : 'ADICIONAR'} <Plus className="ml-2 h-6 w-6 md:h-5 md:w-5 group-hover:scale-110 transition-transform" />
        </Button>
      </div>
    </div>
  );

  const [serverTime, setServerTime] = useState<Date | null>(null);

  useEffect(() => {
    // Fetch reliable server time to prevent local clock manipulation issues for display
    fetch('https://timeapi.io/api/Time/current/zone?timeZone=America/Sao_Paulo')
      .then(res => res.json())
      .then(data => setServerTime(new Date(data.dateTime)))
      .catch(err => {
        console.error("Failed to fetch server time, falling back to local time", err);
        setServerTime(new Date());
      });
  }, []);

  const getNextOpeningTime = () => {
    const now = serverTime || new Date();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentTime = hour + minute / 60;

    // Schedule definition
    // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
    const schedule = {
      0: { open: 18, close: 23.5, name: 'Domingo' },
      1: null, // Closed
      2: { open: 18, close: 23.5, name: 'Terça-feira' },
      3: { open: 18, close: 23.5, name: 'Quarta-feira' },
      4: { open: 18, close: 23.5, name: 'Quinta-feira' },
      5: { open: 18, close: 24, name: 'Sexta-feira' },
      6: { open: 18, close: 24, name: 'Sábado' }
    };

    const todaySchedule = schedule[day as keyof typeof schedule];

    if (todaySchedule && currentTime < todaySchedule.open) {
      return `Hoje às 18:00`;
    }

    // Find next open day
    for (let i = 1; i <= 7; i++) {
      const nextDay = (day + i) % 7;
      const nextSchedule = schedule[nextDay as keyof typeof schedule];
      if (nextSchedule) {
        if (i === 1) {
          return `Amanhã às 18:00`;
        }
        return `${nextSchedule.name} às 18:00`;
      }
    }
    return 'Em breve';
  };

  return (
    <div className="min-h-screen pb-32 bg-deep-black text-white font-sans selection:bg-gold selection:text-deep-black">
      <audio ref={successAudioRef} src="https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3" />
      <Toaster position="top-center" richColors />

      {!storeConfig.lojaAberta && !isAdminView && !isTemporarilyOpen && (
        <div className="fixed inset-0 z-[100] bg-deep-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-gold/10 p-6 rounded-full mb-6 border border-gold/20">
            <Clock className="h-16 w-16 text-gold animate-pulse" />
          </div>
          <h2 className="text-4xl font-black uppercase italic text-white mb-2">Loja Fechada</h2>
          <p className="text-white/60 font-medium uppercase tracking-widest max-w-xs mb-4">
            No momento não estamos aceitando pedidos pelo site.
          </p>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 max-w-sm w-full">
            <p className="text-[10px] font-black text-gold uppercase tracking-widest mb-1">Próxima Abertura</p>
            <p className="text-xl font-bold text-white">{getNextOpeningTime()}</p>
          </div>
          <div className="mt-8 flex flex-col gap-4 w-full max-w-sm">
            <Button variant="ghost" className="border border-white/10 text-white bg-white/5 hover:bg-white/10 h-12 rounded-xl" onClick={() => window.location.href = 'tel:22998487785'}>
              <Phone className="mr-2 h-4 w-4" /> Ligar para Loja
            </Button>
            
            <Button 
              variant="outline" 
              className="border-gold/30 text-gold hover:bg-gold/10 h-12 rounded-xl font-black uppercase tracking-widest"
              onClick={() => setIsTemporarilyOpen(true)}
            >
              Abrir Provisoriamente (Modo Teste)
            </Button>
          </div>
        </div>
      )}

      {isAdminView ? (
        user ? (
          (['gabriel06nf@gmail.com', 'admin@ouropreto.com'].includes(user.email?.toLowerCase() || '')) ? (
            <AdminDashboardComponent 
              storeConfig={storeConfig} 
              menuStatus={menuStatus} 
            />
          ) : (
            <div className="min-h-screen bg-deep-black flex flex-col items-center justify-center p-6 text-center text-white">
              <div className="bg-red-500/10 p-4 rounded-2xl border border-red-500/20 mb-6">
                <Lock className="h-12 w-12 text-red-500 mx-auto mb-2" />
                <h2 className="text-2xl font-black uppercase text-red-500">Acesso negado</h2>
                <p className="text-white/60 mt-2">O e-mail <span className="text-white font-bold">{user.email}</span> não tem permissão de administrador.</p>
              </div>
              <Button onClick={() => window.location.href = '/'} className="bg-gold text-deep-black font-black uppercase">Voltar ao site</Button>
            </div>
          )
        ) : (
          <div className="min-h-screen bg-deep-black flex items-center justify-center p-6 text-white text-center">
            <p className="text-white/60">Redirecionando para login...</p>
          </div>
        )
      ) : isDeliveryView ? (
        <DeliveryDashboardComponent />
      ) : (
        <>
          {/* Header */}
          <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-deep-black/80 backdrop-blur-md">
        <div className="container flex h-16 md:h-20 items-center justify-between px-4 md:px-8">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => {
              document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
              setIsCartOpen(false);
              setIsOrdersOpen(false);
              setSelectedPizza(null);
            }}
          >
            <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-pizza-red text-white group-hover:scale-110 transition-transform">
              <PizzaIcon className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tighter text-gold">
              OURO <span className="text-white">PRETO</span>
            </h1>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-widest text-white/70">
            <a href="/" className="hover:text-gold transition-colors" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Início</a>
            <a href="https://wa.me/5522998487785" target="_blank" rel="noreferrer" className="hover:text-gold transition-colors">Contato</a>
          </div>

          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              className="border border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-full h-10 w-10 p-0 transition-all"
              onClick={() => {
                if (user) {
                  setIsOrdersOpen(true);
                } else {
                  setIsLoginOpen(true);
                }
              }}
            >
              <User className="h-5 w-5" />
            </Button>

            <motion.div
              animate={isCartBouncing ? { scale: [1, 1.3, 1], rotate: [0, -10, 10, 0] } : {}}
              transition={{ duration: 0.4 }}
            >
              <Button 
                variant="ghost" 
                className={cn(
                  "relative border border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-full h-10 w-10 p-0 transition-all",
                  isCartBouncing && "border-gold shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                )}
                onClick={() => setIsCartOpen(true)}
              >
                <ShoppingCart className="h-5 w-5" />
                {cart.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-pizza-red text-white border-none h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold">
                    {cart.length}
                  </Badge>
                )}
              </Button>
            </motion.div>
            <a 
              href="https://wa.me/5522998487785" 
              target="_blank" 
              rel="noreferrer"
              className={cn(
                buttonVariants({ variant: "default" }),
                "bg-green-600 hover:bg-green-700 text-white font-bold rounded-full h-10 px-4 md:px-6 text-xs md:text-sm gap-2"
              )}
            >
              <MessageCircle className="h-4 w-4" /> <span className="hidden xs:inline">WhatsApp</span>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-deep-black">
        {/* Active Order Tracker - Only visible to non-admins with an active order */}
        {!isAdminView && activeOrder && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-gold border-b border-gold-dark/20 overflow-hidden relative z-[45]"
          >
            <div className="container px-4 py-2 flex items-center justify-between text-deep-black">
              <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                <div className="h-6 w-6 rounded-full bg-deep-black/10 flex items-center justify-center animate-bounce shrink-0">
                  {activeOrder.status === 'received' ? <Clock className="h-3 w-3" /> : 
                   activeOrder.status === 'cooking' ? <Utensils className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-[9px] font-black uppercase tracking-tighter opacity-70">Acompanhar Pedido #{activeOrder.id?.slice(-6).toUpperCase()}</span>
                  <span className="text-xs font-black uppercase italic leading-none truncate">
                    {activeOrder.status === 'received' ? '🔥 Pedido recebido!' : 
                     activeOrder.status === 'cooking' ? '👨‍🍳 No forno!' : '🚀 Saiu para entrega!'}
                  </span>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-7 px-3 rounded-full bg-deep-black/10 hover:bg-deep-black/20 text-deep-black text-[9px] font-black uppercase tracking-widest gap-1 shrink-0 ml-2"
                onClick={() => setIsOrdersOpen(true)}
              >
                Detalhes <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </motion.div>
        )}
        {/* Hero Section */}
        <section className="relative h-[60vh] md:h-[70vh] flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1920&auto=format&fit=crop" 
              alt="Pizza Hero" 
              className="h-full w-full object-cover opacity-30 md:opacity-40"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-deep-black via-deep-black/60 to-transparent" />
          </div>

          <div className="container relative z-10 text-center max-w-4xl mx-auto px-4">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-4 md:space-y-6"
            >
              <Badge className="bg-pizza-red text-white border-none px-3 py-0.5 md:px-4 md:py-1 text-[10px] md:text-sm font-bold uppercase tracking-widest">
                Conselheiro Paulino • Nova Friburgo
              </Badge>
              <h2 className="text-4xl md:text-7xl font-black tracking-tight leading-none uppercase italic">
                A MELHOR PIZZA <br className="hidden md:block" /> DIRETO NO SEU <span className="text-gold">SOFÁ</span>.
              </h2>
              <p className="text-sm md:text-xl text-white/70 font-medium max-w-2xl mx-auto">
                Massa artesanal, ingredientes selecionados e o sabor que você já conhece. Peça agora pelo WhatsApp.
              </p>
              <div className="pt-4 md:pt-6">
                <a 
                  href="#menu"
                  className={cn(
                    buttonVariants({ variant: "default", size: "lg" }),
                    "bg-gold text-deep-black hover:bg-gold-dark font-black px-8 md:px-12 h-14 md:h-16 text-lg md:text-xl rounded-full shadow-2xl shadow-gold/20"
                  )}
                >
                  VER CARDÁPIO
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features - Compact on Mobile */}
        <section className="py-12 md:py-16 bg-graphite/30 border-y border-white/5">
          <div className="container px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {[
                { icon: Truck, title: 'Entrega Rápida', desc: 'Chega quentinha em sua casa.' },
                { icon: Star, title: 'Preço Justo', desc: 'Qualidade que cabe no bolso.' },
                { icon: PizzaIcon, title: 'Tradição', desc: 'A favorita dos Friburguenses.' }
              ].map((feature, i) => (
                <div key={i} className="flex items-center md:items-start gap-4 p-4 md:p-6 rounded-2xl bg-white/5 border border-white/5">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                    <feature.icon className="h-5 w-5 md:h-6 md:w-6 text-gold" />
                  </div>
                  <div>
                    <h3 className="text-sm md:text-lg font-bold text-gold uppercase tracking-tighter">{feature.title}</h3>
                    <p className="text-white/40 text-xs md:text-sm">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Menu Section */}
        <section id="menu" className="py-16 md:py-24 bg-zinc-900/40 border-y border-white/5">
          <div className="container px-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 md:mb-16">
              <div className="space-y-2">
                <h2 className="text-3xl md:text-6xl font-black tracking-tight uppercase italic">Nosso <span className="text-gold">Cardápio</span></h2>
                <p className="text-white/50 text-sm md:text-base">Toque no sabor desejado para personalizar seu pedido.</p>
              </div>
              
              <div className="relative w-full md:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                <Input 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar sabor..."
                  className="bg-zinc-900 border-white/20 text-white placeholder:text-zinc-500 h-12 pl-12 rounded-full focus:border-gold/50 text-sm placeholder:opacity-100"
                />
              </div>
            </div>

            <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full flex flex-col pb-24 md:pb-0">
              <div className="hidden md:block sticky top-20 z-40 bg-deep-black/95 backdrop-blur-md py-4 mb-12 border-b border-white/5">
                <TabsList className="w-full bg-white/5 border border-white/10 p-1 h-auto flex-nowrap overflow-x-auto justify-center scrollbar-hide snap-x snap-mandatory">
                  {[
                    { id: 'Destaques', label: 'Destaques', icon: Star },
                    { id: 'Tradicional', label: 'Tradicional', icon: PizzaIcon },
                    { id: 'Especial', label: 'Especial', icon: Star },
                    { id: 'Premium', label: 'Premium', icon: Ticket },
                    { id: 'Doce', label: 'Doces', icon: Star },
                    { id: 'Sanduíches', label: 'Sanduíches', icon: Utensils },
                    { id: 'Bebidas', label: 'Bebidas', icon: Beer }
                  ].map((cat) => (
                    <TabsTrigger 
                      key={cat.id} 
                      value={cat.id}
                      className="px-8 py-3 rounded-md data-[state=active]:bg-gold data-[state=active]:text-deep-black font-black uppercase tracking-tighter transition-all text-sm whitespace-nowrap snap-start text-white/50 hover:text-white flex items-center gap-2"
                    >
                      <cat.icon className="h-4 w-4" />
                      {cat.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {/* Mobile Bottom Navigation Bar */}
              <div className="md:hidden fixed bottom-0 left-0 right-0 z-[45] bg-deep-black border-t border-white/10 pb-safe shadow-2xl">
                <div className="flex w-full overflow-x-auto px-2 py-2 gap-1 scrollbar-hide snap-x">
                  {[
                    { id: 'Destaques', label: 'Destaques', icon: Star },
                    { id: 'Tradicional', label: 'Tradicional', icon: PizzaIcon },
                    { id: 'Especial', label: 'Especial', icon: Star },
                    { id: 'Premium', label: 'Premium', icon: Ticket },
                    { id: 'Doce', label: 'Doces', icon: Star },
                    { id: 'Sanduíches', label: 'Lanches', icon: Utensils },
                    { id: 'Bebidas', label: 'Bebidas', icon: Beer }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`flex flex-col items-center justify-center gap-1 min-w-[76px] p-2 rounded-xl transition-all snap-start
                        ${activeCategory === cat.id 
                          ? 'bg-gold/10 text-gold' 
                          : 'bg-transparent text-white/40 hover:text-white hover:bg-white/5'
                        }
                      `}
                    >
                      <cat.icon className={`h-5 w-5 ${activeCategory === cat.id ? 'fill-gold/20' : ''}`} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {['Destaques', 'Tradicional', 'Especial', 'Premium', 'Doce', 'Sanduíches', 'Bebidas'].map((category) => (
                <TabsContent key={category} value={category} className="mt-0 focus-visible:outline-none">
                  <div className="mb-8 space-y-1">
                    <h3 className="text-xl md:text-2xl font-black uppercase italic text-gold tracking-tight">
                      {category === 'Destaques' ? '🔥 Mais Pedidas' : 
                       category === 'Tradicional' ? '🍕 Sabores Tradicionais' :
                       category === 'Especial' ? '✨ Sabores Especiais' :
                       category === 'Premium' ? '🏆 Linha Premium' :
                       category === 'Doce' ? '🍫 Pizzas Doces' : 
                       category === 'Sanduíches' ? '🍔 Sanduíches Artesanais' : '🥤 Bebidas Geladas'}
                    </h3>
                    <p className="text-white/40 text-xs md:text-sm font-medium">
                      {category === 'Destaques' ? 'Os sabores favoritos da nossa galera.' : 
                       category === 'Tradicional' ? 'As clássicas que nunca saem de moda.' :
                       category === 'Especial' ? 'Combinações únicas para paladares exigentes.' :
                       category === 'Premium' ? 'Ingredientes selecionados e sabores sofisticados.' :
                       category === 'Doce' ? 'A sobremesa perfeita em forma de pizza.' : 
                       category === 'Sanduíches' ? 'Lanches preparados com carinho e ingredientes frescos.' : 'Para acompanhar sua pizza favorita.'}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {(() => {
                      const filtered = displayPizzas
                        .filter(p => category === 'Destaques' ? p.popular : p.category === category)
                        .filter(p => 
                          p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase())
                        );

                      if (filtered.length === 0) {
                        return (
                          <div className="col-span-full py-20 text-center space-y-4">
                            <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                              <Search className="h-8 w-8 text-white/10" />
                            </div>
                            <p className="text-white/40 font-bold uppercase tracking-widest text-sm">Nenhum sabor encontrado</p>
                            <Button 
                              variant="link" 
                              className="text-gold font-black uppercase tracking-widest text-[10px]"
                              onClick={() => setSearchQuery('')}
                            >
                              Limpar Busca
                            </Button>
                          </div>
                        );
                      }

                      return filtered.map((pizza, idx) => (
                        <motion.div
                          key={pizza.id}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          viewport={{ once: true }}
                        >
                          <Card 
                            className={`
                              bg-white/[0.05] border-white/10 overflow-hidden hover:border-gold/30 transition-all duration-500 group cursor-pointer relative
                              ${isMobile ? 'flex flex-row min-h-[130px]' : 'flex flex-col h-full'}
                              ${!pizza.available ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                            `}
                            onClick={() => pizza.available && setSelectedPizza(pizza)}
                          >
                            {/* Image Container */}
                            <div className={`
                              relative overflow-hidden
                              ${isMobile ? 'w-24 shrink-0 h-24 rounded-l-lg' : 'h-64'}
                            `}>
                              <ImageWithSkeleton 
                                src={pizza.image} 
                                alt={pizza.name} 
                                className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
                              {pizza.popular && pizza.available && (
                                <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                                  <Badge className="bg-gold text-deep-black border-none text-[8px] font-black uppercase tracking-tighter px-1.5 py-0">
                                    Popular
                                  </Badge>
                                  {activeCategory === 'Destaques' && (
                                    <Badge className="bg-white/20 text-white backdrop-blur-md border-none text-[7px] font-black uppercase tracking-tighter px-1.5 py-0">
                                      {pizza.category}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              {!pizza.available && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
                                  <Badge className="bg-pizza-red text-white border-none text-[10px] font-black uppercase tracking-widest px-3 py-1">
                                    Esgotado
                                  </Badge>
                                </div>
                              )}
                            </div>

                            {/* Content */}
                            <div className={`flex flex-col flex-1 min-w-0 ${isMobile ? 'p-4 justify-center gap-1' : 'p-6'}`}>
                              <div className="space-y-1">
                                <div className="flex justify-between items-start gap-2">
                                  <CardTitle className={`
                                    font-black group-hover:text-gold transition-colors uppercase italic tracking-tight truncate
                                    ${isMobile ? 'text-base leading-tight w-full pr-6' : 'text-xl'}
                                  `}>
                                    {pizza.name}
                                  </CardTitle>
                                  {!isMobile && (
                                    <span className="text-gold font-black text-base whitespace-nowrap">
                                      R$ {pizza.basePrice.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                
                                <CardDescription className={`
                                  text-white/60 leading-snug font-medium
                                  ${isMobile ? 'text-[10px] line-clamp-2' : 'text-xs mt-2'}
                                `}>
                                  {pizza.description}
                                </CardDescription>
                              </div>

                              <div className="flex items-center justify-between mt-auto pt-2">
                                {isMobile ? (
                                  <span className="text-gold font-black text-base">
                                    R$ {pizza.basePrice.toFixed(2)}
                                  </span>
                                ) : (
                                  <div className="pt-4 flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-white/20 group-hover:text-gold transition-colors">
                                    Personalizar <ChevronRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                                  </div>
                                )}
                              </div>
                            </div>

                            {isMobile && (
                              <div className="absolute right-3 top-3">
                                <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center border border-white/20 group-hover:bg-gold group-hover:border-gold group-hover:text-deep-black transition-all">
                                  <Plus className="h-4 w-4 text-white group-hover:text-deep-black" />
                                </div>
                              </div>
                            )}
                          </Card>
                        </motion.div>
                      ));
                    })()}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </section>
      </main>

      {/* Customization - Drawer for Mobile, Dialog for Desktop */}
      {isMobile ? (
        <Drawer open={!!selectedPizza} onOpenChange={(open) => !open && setSelectedPizza(null)}>
          <DrawerContent className="bg-graphite border-white/10 text-white">
            <DrawerHeader className="text-left border-b border-white/5 pb-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-lg overflow-hidden shrink-0 border border-white/10">
                  <img 
                    src={selectedPizza?.image} 
                    alt="" 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <DrawerTitle className="text-2xl font-black text-gold uppercase italic leading-none">{selectedPizza?.name}</DrawerTitle>
                  <DrawerDescription className="text-white/40 text-xs mt-1">Personalize sua pizza</DrawerDescription>
                </div>
              </div>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <CustomizationContent />
            </div>
            <DrawerFooter className="p-0">
              <CustomizationFooter />
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={!!selectedPizza} onOpenChange={(open) => !open && setSelectedPizza(null)}>
          <DialogContent className="bg-graphite border-white/10 text-white sm:max-w-[500px] p-0 overflow-hidden max-h-[95vh] flex flex-col">
            <div className="relative h-48 shrink-0">
              <ImageWithSkeleton 
                src={selectedPizza?.image} 
                alt={selectedPizza?.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-graphite to-transparent" />
              <div className="absolute bottom-4 left-6">
                <DialogTitle className="text-3xl font-black text-gold uppercase italic">{selectedPizza?.name}</DialogTitle>
              </div>
            </div>
            <div className="p-8 pt-0 overflow-y-auto flex-1 scrollbar-hide">
              <CustomizationContent />
            </div>
            <div className="shrink-0">
              <CustomizationFooter />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Floating Cart Button for Mobile */}
      {isMobile && cart.length > 0 && !isCartOpen && (
        <motion.div 
          initial={{ scale: 0, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="fixed bottom-24 right-4 z-[40]"
        >
          <Button 
            onClick={() => setIsCartOpen(true)}
            className="h-16 w-16 rounded-full bg-gold text-deep-black shadow-2xl shadow-gold/40 flex items-center justify-center p-0 relative"
          >
            <ShoppingCart className="h-7 w-7" />
            <Badge className="absolute -top-1 -right-1 bg-pizza-red text-white border-none h-6 w-6 flex items-center justify-center p-0 text-xs font-bold">
              {cart.length}
            </Badge>
          </Button>
        </motion.div>
      )}

      {/* My Orders Modal */}
      <Dialog open={isOrdersOpen} onOpenChange={setIsOrdersOpen}>
        <DialogContent className="bg-graphite border-white/10 text-white sm:max-w-[500px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-gold uppercase italic">Meus Pedidos</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {orders.length === 0 ? (
              <div className="py-12 text-center text-white/40">
                <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Você ainda não fez nenhum pedido.</p>
              </div>
            ) : (
              orders.map((order) => (
                <Card key={order.id} className="bg-white/5 border-white/10 p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Pedido #{order.id?.slice(-6).toUpperCase()}</p>
                      <p className="text-xs text-white/60">
                        {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Badge className={cn(
                      "uppercase text-[10px] font-black",
                      order.status === 'completed' ? "bg-green-500" : "bg-gold text-deep-black"
                    )}>
                      {order.status === 'received' ? 'Pendente' : 
                       order.status === 'cooking' ? 'Preparando' :
                       order.status === 'delivery' ? 'Em Entrega' :
                       order.status === 'completed' ? 'Concluído' : 'Cancelado'}
                    </Badge>
                  </div>

                  {/* Tracking Progress */}
                  {order.status !== 'completed' && order.status !== 'cancelled' && (
                    <div className="mb-6 space-y-4">
                      <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ 
                            width: order.status === 'received' ? '25%' : 
                                   order.status === 'cooking' ? '50%' : 
                                   order.status === 'delivery' ? '75%' : '100%' 
                          }}
                          className="absolute inset-y-0 left-0 bg-gold"
                        />
                      </div>
                      
                      {order.status === 'delivery' && (
                        <motion.div 
                          animate={{ x: [0, 20, 0] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="flex items-center gap-2 text-gold"
                        >
                          <Truck className="h-4 w-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest italic">O motoboy já saiu com sua pizza!</span>
                        </motion.div>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-2 mb-4">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-white/80">{item.quantity}x {item.name} {item.size && `(${item.size})`}</span>
                        <span className="text-gold font-bold">R$ {item.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Separator className="bg-white/5 mb-4" />
                  
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-black text-white">Total: <span className="text-gold">R$ {order.total.toFixed(2)}</span></p>
                    <Button 
                      size="sm" 
                      onClick={() => handleReorder(order)}
                      className="bg-white/10 hover:bg-gold hover:text-deep-black text-white text-[10px] font-black uppercase tracking-widest h-8"
                    >
                      PEDIR NOVAMENTE
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Optional Login Modal */}
      <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
        <DialogContent className="bg-graphite border-gold/20 text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-gold uppercase italic text-center">
              {authMode === 'login' ? '🔐 Bem-vindo à Ouro Preto' : '📝 Crie sua conta'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4 text-center">
            <Input 
              placeholder="E-mail" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/5 border-white/10"
            />
            <Input 
              placeholder="Senha" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/5 border-white/10"
            />
            <Button 
              className="w-full bg-gold hover:bg-gold-dark text-deep-black font-black uppercase tracking-widest h-12"
              onClick={async () => {
                try {
                  if (authMode === 'login') {
                    await signInWithEmailAndPassword(auth, email, password);
                  } else {
                    await createUserWithEmailAndPassword(auth, email, password);
                  }
                  setIsLoginOpen(false);
                } catch (e) {
                  console.error(e);
                  toast.error("Erro na autenticação. Verifique os dados.");
                }
              }}
            >
              {authMode === 'login' ? 'Entrar' : 'Cadastrar'}
            </Button>
            <Button 
              variant="ghost" 
              className="w-full text-white/50 hover:text-white"
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
            >
              {authMode === 'login' ? 'Criar uma conta' : 'Já tenho conta'}
            </Button>
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink mx-4 text-white/20 text-xs">ou</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>
            <Button 
              className="w-full bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest h-12"
              onClick={async () => {
                const provider = new GoogleAuthProvider();
                try {
                  await signInWithPopup(auth, provider);
                  setIsLoginOpen(false);
                } catch (e) {
                  console.error(e);
                  toast.error("Erro ao fazer login com Google");
                }
              }}
            >
              Entrar com Google
            </Button>
            
            <button 
              onClick={() => setIsLoginOpen(false)}
              className="text-[10px] text-white/30 hover:text-gold uppercase font-black transition-colors"
            >
              Continuar como visitante
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-end md:justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={isMobile ? { y: "100%" } : { x: "100%" }}
              animate={isMobile ? { y: 0 } : { x: 0 }}
              exit={isMobile ? { y: "100%" } : { x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={`
                relative bg-graphite text-white flex flex-col shadow-2xl border-white/10
                ${isMobile ? 'w-full h-[90vh] rounded-t-3xl' : 'w-[450px] h-full border-l'}
              `}
            >
              {/* Cart Header */}
              <div className="p-6 border-b border-white/5 bg-deep-black/40 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gold/10 flex items-center justify-center">
                      <ShoppingCart className="h-5 w-5 text-gold" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase italic tracking-tight">Seu <span className="text-gold">Pedido</span></h3>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{cart.length} {cart.length === 1 ? 'Item' : 'Itens'}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(false)} className="rounded-full hover:bg-white/5">
                    <X className="h-6 w-6" />
                  </Button>
                </div>

                {/* Step Indicator */}
                {cart.length > 0 && (
                  <div className="flex items-center justify-between px-2">
                    {[
                      { id: 'cart', label: 'Carrinho' },
                      { id: 'details', label: 'Entrega' },
                      { id: 'confirmation', label: 'Confirmação' }
                    ].map((step, idx, arr) => (
                      <React.Fragment key={step.id}>
                        <div className="flex flex-col items-center gap-2">
                          <div className={`h-2 w-2 rounded-full transition-all duration-500 ${
                            checkoutStep === step.id ? 'bg-gold scale-150 shadow-[0_0_10px_rgba(212,175,55,0.5)]' : 
                            (arr.findIndex(s => s.id === checkoutStep) > idx ? 'bg-gold/40' : 'bg-white/10')
                          }`} />
                          <span className={`text-[8px] font-black uppercase tracking-widest transition-colors ${
                            checkoutStep === step.id ? 'text-gold' : 'text-white/20'
                          }`}>{step.label}</span>
                        </div>
                        {idx < arr.length - 1 && (
                          <div className={`flex-1 h-[1px] mb-6 mx-2 transition-colors duration-500 ${
                            arr.findIndex(s => s.id === checkoutStep) > idx ? 'bg-gold/20' : 'bg-white/5'
                          }`} />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {checkoutStep === 'cart' && (
                  <div className="space-y-6">
                    {cart.length === 0 ? (
                      <div className="h-[50vh] flex flex-col items-center justify-center text-center space-y-6">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gold/20 blur-3xl rounded-full" />
                          <div className="relative h-24 w-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                            <PizzaIcon className="h-12 w-12 text-white/20" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-white/60 font-black uppercase tracking-[0.2em] text-sm">Opa! Carrinho Vazio</p>
                          <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest max-w-[200px]">
                            Parece que você ainda não escolheu sua pizza favorita hoje.
                          </p>
                        </div>
                        <div className="flex flex-col gap-3">
                          <Button 
                            onClick={() => setIsCartOpen(false)} 
                            variant="outline" 
                            className="border-gold/20 text-gold hover:bg-gold hover:text-deep-black font-black uppercase tracking-widest h-12 px-8 rounded-full"
                          >
                            VER CARDÁPIO
                          </Button>
                          {user && (
                            <Button 
                              onClick={() => {
                                setIsCartOpen(false);
                                setIsOrdersOpen(true);
                              }} 
                              variant="ghost" 
                              className="text-white/40 hover:text-gold font-black uppercase tracking-widest h-10 px-8 rounded-full gap-2 text-[10px]"
                            >
                              <History className="h-4 w-4" />
                              VER MEUS PEDIDOS
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Itens Selecionados</Label>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setCart([])}
                            className="text-[10px] font-black uppercase tracking-widest text-pizza-red hover:bg-pizza-red/10 h-6"
                          >
                            Limpar Tudo
                          </Button>
                        </div>
                        {cart.map((item) => (
                          <motion.div 
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key={item.id} 
                            className="group relative p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-gold/20 transition-all"
                          >
                            <div className="flex gap-4">
                              <div className="relative h-20 w-20 shrink-0">
                                <img 
                                  src={item.pizza.image} 
                                  alt="" 
                                  className="h-full w-full rounded-xl object-cover shadow-lg" 
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute -top-2 -left-2 h-6 w-6 rounded-full bg-gold text-deep-black flex items-center justify-center text-[10px] font-black shadow-lg">
                                  {item.quantity}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                  <h4 className="font-black uppercase italic text-gold truncate">
                                    {item.pizza2 ? `Meia ${item.pizza.name} / Meia ${item.pizza2.name}` : item.pizza.name}
                                  </h4>
                                  <button 
                                    onClick={() => removeFromCart(item.id)} 
                                    className="h-8 w-8 rounded-full flex items-center justify-center text-white/20 hover:text-pizza-red hover:bg-pizza-red/10 transition-all"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {item.size && (
                                    <Badge variant="ghost" className="text-[8px] border border-white/10 text-white/40 uppercase font-black tracking-widest py-0">
                                      {item.size}
                                    </Badge>
                                  )}
                                  {item.extras.map(extra => (
                                    <Badge key={extra} variant="ghost" className="text-[8px] border border-gold/10 text-gold/60 uppercase font-black tracking-widest py-0">
                                      + {extra}
                                    </Badge>
                                  ))}
                                </div>
                                <div className="flex justify-between items-center mt-4">
                                  <div className="flex items-center gap-1 bg-deep-black/50 rounded-full p-0.5 border border-white/5">
                                    <button 
                                      onClick={() => updateQuantity(item.id, -1)}
                                      className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-white/40"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </button>
                                    <span className="text-xs font-black w-6 text-center">{item.quantity}</span>
                                    <button 
                                      onClick={() => updateQuantity(item.id, 1)}
                                      className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-gold"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </button>
                                  </div>
                                  <span className="font-black text-white text-sm">R$ {item.totalPrice.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {checkoutStep === 'address' && (
                  <div className="space-y-8">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-8 w-8 rounded-full bg-gold/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-gold" />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-white">Identificação</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Seu Nome</Label>
                          <Input 
                            value={customerInfo.name}
                            onChange={e => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Ex: João Silva"
                            className="bg-zinc-900 border-white/20 text-white placeholder:text-zinc-500 h-12 rounded-xl focus:border-gold/50 transition-all placeholder:opacity-100"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">WhatsApp</Label>
                          <Input 
                            value={customerInfo.phone}
                            onChange={e => setCustomerInfo(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                            placeholder="(22) 99999-9999"
                            className="bg-zinc-900 border-white/20 text-white placeholder:text-zinc-500 h-12 rounded-xl focus:border-gold/50 transition-all placeholder:opacity-100"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-8 mb-2">
                        <div className="h-8 w-8 rounded-full bg-gold/10 flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-gold" />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-white">Entrega</h4>
                      </div>

                      <Tabs value={deliveryType} onValueChange={(v) => setDeliveryType(v as 'delivery' | 'pickup')} className="w-full mb-6">
                        <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10 p-1 h-12 rounded-xl">
                          <TabsTrigger value="delivery" className="font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-gold data-[state=active]:text-deep-black rounded-lg transition-all">Receber em Casa</TabsTrigger>
                          <TabsTrigger value="pickup" className="font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-gold data-[state=active]:text-deep-black rounded-lg transition-all">Retirar na Loja</TabsTrigger>
                        </TabsList>
                      </Tabs>

                      {deliveryType === 'delivery' && (
                        <div className="grid grid-cols-12 gap-4">
                          <div className="col-span-12 space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Bairro</Label>
                            <div className="relative">
                              <Button 
                                type="button"
                                variant="ghost"
                                onClick={() => setIsNeighborhoodOpen(!isNeighborhoodOpen)}
                                className="w-full bg-zinc-900 border border-white/20 text-white h-12 rounded-xl focus:border-gold/50 transition-all text-sm px-4 flex justify-between items-center hover:bg-zinc-800"
                              >
                                <span className={cn(!customerInfo.neighborhood && "text-zinc-500")}>
                                  {customerInfo.neighborhood || "Selecione seu bairro..."}
                                </span>
                                <ChevronDown className={cn("h-4 w-4 text-gold transition-transform", isNeighborhoodOpen && "rotate-180")} />
                              </Button>
                              
                              <AnimatePresence>
                                {isNeighborhoodOpen && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-40" 
                                      onClick={() => setIsNeighborhoodOpen(false)} 
                                    />
                                    <motion.div 
                                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                      className="absolute z-50 w-full mt-2 bg-zinc-900 border border-white/20 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-h-64 overflow-y-auto backdrop-blur-xl"
                                    >
                                      {DELIVERY_FEES.map(n => (
                                        <button
                                          key={n.name}
                                          type="button"
                                          className={cn(
                                            "w-full px-4 py-4 text-left text-xs font-bold uppercase tracking-widest transition-all border-b border-white/5 last:border-0 flex justify-between items-center",
                                            customerInfo.neighborhood === n.name ? "bg-gold text-deep-black" : "text-white/70 hover:bg-white/5 hover:text-white"
                                          )}
                                          onClick={() => {
                                            setCustomerInfo(prev => ({ ...prev, neighborhood: n.name }));
                                            setIsNeighborhoodOpen(false);
                                          }}
                                        >
                                          {n.name}
                                          {customerInfo.neighborhood === n.name && <CheckCircle2 className="h-4 w-4" />}
                                        </button>
                                      ))}
                                    </motion.div>
                                  </>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                          <div className="col-span-8 space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Rua</Label>
                            <Input 
                              value={customerInfo.street}
                              onChange={e => setCustomerInfo(prev => ({ ...prev, street: e.target.value }))}
                              placeholder="Nome da rua"
                              className="bg-zinc-900 border-white/20 text-white placeholder:text-zinc-500 h-12 rounded-xl focus:border-gold/50 transition-all placeholder:opacity-100"
                            />
                          </div>
                          <div className="col-span-4 space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Nº</Label>
                            <Input 
                              value={customerInfo.number}
                              onChange={e => setCustomerInfo(prev => ({ ...prev, number: e.target.value }))}
                              placeholder="123A"
                              className="bg-zinc-900 border-white/20 text-white placeholder:text-zinc-500 h-12 rounded-xl focus:border-gold/50 transition-all placeholder:opacity-100"
                            />
                          </div>
                          <div className="col-span-12 space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Referência / Complemento</Label>
                            <Input 
                              value={customerInfo.complement}
                              onChange={e => setCustomerInfo(prev => ({ ...prev, complement: e.target.value }))}
                              placeholder="Ex: Próximo ao mercado..."
                              className="bg-zinc-900 border-white/20 text-white placeholder:text-zinc-500 h-12 rounded-xl focus:border-gold/50 transition-all placeholder:opacity-100"
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Observações</Label>
                        <Input 
                          value={customerInfo.observations}
                          onChange={e => setCustomerInfo(prev => ({ ...prev, observations: e.target.value }))}
                          placeholder="Ex: Sem cebola, portão verde..."
                          className="bg-zinc-900 border-white/20 text-white placeholder:text-zinc-500 h-12 rounded-xl focus:border-gold/50 transition-all placeholder:opacity-100"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {checkoutStep === 'payment' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Concise Summary Checklist */}
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                        <CheckCircle2 className="h-4 w-4 text-gold" />
                        <span className="text-[10px] font-black uppercase text-gold tracking-widest">Resumo da Compra</span>
                      </div>
                      
                      <div className="space-y-2">
                        {cart.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-white">
                            <span className="truncate max-w-[180px]">
                              {item.quantity}x {item.pizza.name} {item.pizza2 ? `/ ${item.pizza2.name}` : ''}
                            </span>
                            <span className="text-white/60">R$ {item.totalPrice.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 mt-2 border-t border-white/5 space-y-2">
                        <div className="flex justify-between items-center text-[10px] text-white/50 font-bold uppercase">
                          <span>Subtotal</span>
                          <span>R$ {cartSubtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-white/50 font-bold uppercase">
                          <span>Taxa de Entrega</span>
                          <span>{deliveryFee > 0 ? `R$ ${deliveryFee.toFixed(2)}` : 'Grátis'}</span>
                        </div>
                        {appliedCoupon && (
                          <div className="flex justify-between items-center text-[10px] text-green-500 font-bold uppercase">
                            <span>Desconto</span>
                            <span>- R$ {(cartSubtotal * (appliedCoupon.discount / 100)).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-xs text-gold font-black uppercase tracking-widest pt-1">
                          <span>Total Final</span>
                          <span>R$ {cartTotal.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="pt-2 mt-2 border-t border-white/5">
                        <div className="flex items-center gap-2 text-[10px] text-white/40 font-bold uppercase">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{deliveryType === 'delivery' ? `${customerInfo.neighborhood}, ${customerInfo.street}` : 'Retirada na Loja'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-8 w-8 rounded-full bg-gold/10 flex items-center justify-center">
                          <CreditCard className="h-4 w-4 text-gold" />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-white">Forma de Pagamento</h4>
                      </div>

                      <RadioGroup 
                        value={customerInfo.paymentMethod} 
                        onValueChange={(v) => setCustomerInfo(prev => ({ ...prev, paymentMethod: v as PaymentMethod }))}
                        className="grid grid-cols-1 gap-3"
                      >
                        <div className="relative">
                          <RadioGroupItem value="cash_delivery" id="cash" className="peer sr-only" />
                          <Label htmlFor="cash" className="flex items-center justify-between p-4 rounded-2xl border border-white/10 bg-white/5 peer-data-[state=checked]:border-gold peer-data-[state=checked]:bg-gold/10 cursor-pointer transition-all">
                            <div className="flex items-center gap-3">
                              <motion.div
                                animate={customerInfo.paymentMethod === 'cash_delivery' ? {
                                  y: [0, -4, 0],
                                  scale: [1, 1.2, 1]
                                } : {}}
                                transition={{ duration: 0.5 }}
                              >
                                <Wallet className="h-5 w-5 text-gold" />
                              </motion.div>
                              <span className="text-sm font-bold uppercase tracking-widest">Dinheiro na Entrega</span>
                            </div>
                            <div className="h-2 w-2 rounded-full bg-white/10 peer-data-[state=checked]:bg-gold" />
                          </Label>
                        </div>

                        {customerInfo.paymentMethod === 'cash_delivery' && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="px-4 pb-2 space-y-4"
                          >
                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                              <span className="text-[10px] font-black uppercase text-white/40">Precisa de troco?</span>
                              <button 
                                onClick={() => setCustomerInfo(prev => ({ ...prev, needChange: !prev.needChange }))}
                                className={`h-5 w-10 rounded-full transition-all relative ${customerInfo.needChange ? 'bg-gold' : 'bg-white/10'}`}
                              >
                                <motion.div 
                                  animate={{ x: customerInfo.needChange ? 20 : 4 }}
                                  className={`h-3 w-3 rounded-full absolute top-1 ${customerInfo.needChange ? 'bg-deep-black' : 'bg-white/40'}`}
                                />
                              </button>
                            </div>

                            {customerInfo.needChange && (
                              <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Troco para quanto?</Label>
                                <Input 
                                  value={customerInfo.changeFor}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9.]/g, '');
                                    setCustomerInfo(prev => ({ ...prev, changeFor: val }));
                                  }}
                                  placeholder={`Mínimo R$ ${cartTotal.toFixed(2)}`}
                                  className={cn(
                                    "bg-zinc-900 border-white/20 text-white placeholder:text-zinc-500 h-12 rounded-xl focus:border-gold/50 transition-all",
                                    parseFloat(customerInfo.changeFor) < cartTotal && "border-pizza-red focus:border-pizza-red"
                                  )}
                                />
                                {parseFloat(customerInfo.changeFor) < cartTotal && (
                                  <p className="text-[9px] text-pizza-red font-bold uppercase tracking-widest">Valor insuficiente para o total</p>
                                )}
                              </div>
                            )}
                          </motion.div>
                        )}

                        <div className="relative">
                          <RadioGroupItem value="card_delivery" id="card" className="peer sr-only" />
                          <Label htmlFor="card" className="flex items-center justify-between p-4 rounded-2xl border border-white/10 bg-white/5 peer-data-[state=checked]:border-gold peer-data-[state=checked]:bg-gold/10 cursor-pointer transition-all">
                            <div className="flex items-center gap-3">
                              <motion.div
                                animate={customerInfo.paymentMethod === 'card_delivery' ? {
                                  rotate: [0, -10, 10, -10, 10, 0],
                                  scale: [1, 1.1, 1]
                                } : {}}
                                transition={{ duration: 0.5 }}
                              >
                                <CreditCard className="h-5 w-5 text-gold" />
                              </motion.div>
                              <span className="text-sm font-bold uppercase tracking-widest">Cartão na Entrega</span>
                            </div>
                            <div className="h-2 w-2 rounded-full bg-white/10 peer-data-[state=checked]:bg-gold" />
                          </Label>
                        </div>

                        <div className="relative">
                          <RadioGroupItem value="pix_now" id="pix" className="peer sr-only" />
                          <Label htmlFor="pix" className="flex items-center justify-between p-4 rounded-2xl border border-white/10 bg-white/5 peer-data-[state=checked]:border-gold peer-data-[state=checked]:bg-gold/10 cursor-pointer transition-all">
                            <div className="flex items-center gap-3">
                              <motion.div
                                animate={customerInfo.paymentMethod === 'pix_now' ? {
                                  scale: [1, 1.3, 1],
                                  rotate: [0, 90, 0]
                                } : {}}
                                transition={{ duration: 0.5 }}
                              >
                                <QrCode className="h-5 w-5 text-gold" />
                              </motion.div>
                              <span className="text-sm font-bold uppercase tracking-widest">PIX</span>
                            </div>
                            <div className="h-2 w-2 rounded-full bg-white/10 peer-data-[state=checked]:bg-gold" />
                          </Label>
                        </div>
                      </RadioGroup>

                      {customerInfo.paymentMethod === 'pix_now' && (
                        <div className="p-4 bg-gold/5 rounded-2xl border border-gold/20 space-y-3">
                          <div className="flex items-center gap-2 text-gold">
                            <Info className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Pagamento via PIX</span>
                          </div>
                          <p className="text-xs text-white/60 leading-relaxed italic">
                            A chave PIX será exibida no próximo passo e também após a finalização do pedido.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {checkoutStep === 'summary' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-8 w-8 rounded-full bg-gold/10 flex items-center justify-center">
                          <History className="h-4 w-4 text-gold" />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-white">Resumo do Pedido</h4>
                      </div>

                      <div className="space-y-4 p-6 bg-white/5 rounded-3xl border border-white/10">
                        <div className="flex justify-between items-center text-white/40 font-bold uppercase text-[10px] tracking-widest">
                          <span>Subtotal</span>
                          <span>R$ {cartSubtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-white/40 font-bold uppercase text-[10px] tracking-widest">
                          <span>Taxa de Entrega</span>
                          <span>{deliveryFee > 0 ? `R$ ${deliveryFee.toFixed(2)}` : 'Grátis'}</span>
                        </div>
                        {appliedCoupon && (
                          <div className="flex justify-between items-center text-green-500 font-bold uppercase text-[10px] tracking-widest">
                            <span>Desconto</span>
                            <span>- R$ {(cartSubtotal * (appliedCoupon.discount / 100)).toFixed(2)}</span>
                          </div>
                        )}
                        
                        <div className="pt-4 mt-4 border-t border-white/10">
                          <div className="flex flex-col items-center justify-center gap-2 py-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Total Final</span>
                            <span className="text-6xl font-black text-gold tracking-tighter">
                              R$ {cartTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                          <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">Entrega em</span>
                          <p className="text-[10px] font-bold text-white uppercase truncate">
                            {deliveryType === 'delivery' ? `${customerInfo.neighborhood}, ${customerInfo.number}` : 'Retirada na Loja'}
                          </p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                          <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">Pagamento</span>
                          <p className="text-[10px] font-bold text-white uppercase">
                            {customerInfo.paymentMethod === 'cash_delivery' ? 'Dinheiro' : 
                             customerInfo.paymentMethod === 'card_delivery' ? 'Cartão' : 'PIX'}
                          </p>
                        </div>
                      </div>

                      {customerInfo.paymentMethod === 'pix_now' && (
                        <div className="p-4 bg-zinc-900 rounded-2xl border border-white/10 space-y-4">
                          <div className="flex items-start gap-4">
                            <div className="bg-white p-2 rounded-xl h-24 w-24 flex items-center justify-center shrink-0">
                              <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(generatePixPayload(cartTotal))}`}
                                alt="QR Code Pix"
                                className="h-full w-full object-contain"
                              />
                            </div>
                            <div className="space-y-1 flex-1">
                              <span className="text-[8px] font-black uppercase text-gold tracking-widest leading-none">Chave PIX (CNPJ)</span>
                              <p className="text-sm font-mono font-bold text-white break-all">45.890.123/0001-45</p>
                              <p className="text-[10px] font-bold text-white/40 uppercase">Pizzaria Ouro Preto</p>
                            </div>
                          </div>
                          
                          <div className="pt-3 border-t border-white/5 space-y-3">
                            <div className="flex items-center gap-2 bg-gold/5 p-2 rounded-lg border border-gold/20">
                              <AlertCircle className="h-4 w-4 text-gold shrink-0" />
                              <p className="text-[9px] font-black text-gold uppercase leading-tight tracking-wider">
                                Confirme se o recebedor é PIZZARIA OURO PRETO antes de pagar.
                              </p>
                            </div>

                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full text-white/40 hover:text-white border border-white/5 h-10 font-black uppercase text-[10px] tracking-widest"
                              onClick={() => {
                                navigator.clipboard.writeText('45890123000145');
                                toast.success('Chave PIX copiada!');
                              }}
                            >
                              Copiar Chave CNPJ
                              </Button>
                              <Button 
                                onClick={() => {
                                  const now = new Date();
                                  const timeString = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
                                  const orderId = (lastOrderId && lastOrderId !== '---') ? `#${lastOrderId}` : `de ${timeString}`;
                                  const total = cartTotal.toFixed(2);
                                  const customerName = customerInfo.name || 'Cliente';
                                  
                                  const msg = `✅ COMPROVANTE DE PAGAMENTO
Pedido: ${orderId}
Cliente: ${customerName}
Total: R$ ${total}
Pagamento: PIX
Estou enviando o print do comprovante em anexo. Por favor, confirmem o recebimento para iniciar a produção!`;
                                  window.open(`https://wa.me/5522998487785?text=${encodeURIComponent(msg)}`, '_blank');
                                }}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[10px] tracking-widest h-10 mt-2"
                              >
                                Enviar Comprovante via WhatsApp
                              </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {checkoutStep === 'confirmation' && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-10">
                    <div className="h-24 w-24 rounded-full bg-green-500/20 flex items-center justify-center mb-4 relative">
                      <CheckCircle2 className="h-12 w-12 text-green-500" />
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute inset-0 rounded-full border-4 border-green-500/20"
                      />
                    </div>
                    <div className="space-y-4 w-full">
                      <h4 className="text-2xl font-black uppercase italic text-white leading-none">
                        {currentOrderStatus === 'received' ? 'Pedido Recebido!' : 
                         currentOrderStatus === 'cooking' ? '🍕 Sendo Preparado!' :
                         currentOrderStatus === 'delivery' ? '🚀 Saiu para Entrega!' :
                         currentOrderStatus === 'completed' ? '✅ Pedido Finalizado!' : 'Pedido Cancelado'}
                      </h4>
                      
                       {customerInfo.paymentMethod === 'pix_now' && (
                        <Button 
                          onClick={() => {
                            const now = new Date();
                            const timeString = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
                            const orderId = (lastOrderId && lastOrderId !== '---') ? `#${lastOrderId}` : `de ${timeString}`;
                            const total = cartTotal.toFixed(2);
                            const customerName = customerInfo.name || 'Cliente';
                            
                            const msg = `✅ COMPROVANTE DE PAGAMENTO
Pedido: ${orderId}
Cliente: ${customerName}
Total: R$ ${total}
Pagamento: PIX
Estou enviando o print do comprovante em anexo. Por favor, confirmem o recebimento para iniciar a produção!`;
                            window.open(`https://wa.me/5522998487785?text=${encodeURIComponent(msg)}`, '_blank');
                          }}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[10px] tracking-widest h-10 mb-6"
                        >
                          Enviar Comprovante via WhatsApp
                        </Button>
                      )}
                      
                      {/* Tracking Progress In Confirmation */}
                      <div className="space-y-2 mt-4 px-6">
                        <div className="relative h-1 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ 
                              width: currentOrderStatus === 'received' ? '25%' : 
                                     currentOrderStatus === 'cooking' ? '50%' : 
                                     currentOrderStatus === 'delivery' ? '75%' : '100%' 
                            }}
                            className="absolute inset-y-0 left-0 bg-gold"
                          />
                        </div>
                        <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-white/30">
                          <span className={cn(currentOrderStatus === 'received' && "text-gold")}>Recebido</span>
                          <span className={cn(currentOrderStatus === 'cooking' && "text-gold")}>Na Cozinha</span>
                          <span className={cn(currentOrderStatus === 'delivery' && "text-gold")}>Entrega</span>
                          <span className={cn(currentOrderStatus === 'completed' && "text-gold")}>Finalizado</span>
                        </div>
                      </div>

                      <p className="text-sm text-white/80 max-w-xs mx-auto">
                        Obrigado, <span className="text-gold font-bold">{customerInfo.name}</span>! Seu pedido <span className="font-mono bg-white/10 px-2 py-1 rounded">#{lastOrderId?.slice(-6).toUpperCase() || '---'}</span> foi recebido.
                      </p>
                    </div>

                    {/* Loyalty Progress */}
                    <div className="w-full max-w-sm p-6 bg-white/5 rounded-3xl border border-white/10 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Programa de Fidelidade</span>
                        <span className="text-xs font-black text-gold">{loyaltyPoints}/10 Pontos</span>
                      </div>
                      <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(loyaltyPoints / 10) * 100}%` }}
                          className="h-full bg-gold shadow-[0_0_15px_rgba(212,175,55,0.5)]"
                        />
                      </div>
                      <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">
                        {loyaltyPoints >= 10 ? 'PARABÉNS! VOCÊ GANHOU UMA PIZZA GRÁTIS!' : `FALTAM ${10 - loyaltyPoints} PEDIDOS PARA SUA PIZZA GRÁTIS!`}
                      </p>
                    </div>
                    
                    <div className="w-full max-w-sm p-6 bg-white/5 rounded-2xl border border-white/10 text-sm text-white/80 space-y-3">
                      {customerInfo.paymentMethod === 'pix_now' && (
                        <div className="mb-6 p-6 bg-zinc-900 rounded-2xl border border-gold/30 space-y-5 text-center">
                          <p className="text-[10px] font-black uppercase text-gold tracking-widest leading-none">Escaneie o QR Code abaixo</p>
                          
                          <div className="flex justify-center">
                            <div className="bg-white p-3 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                               <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(generatePixPayload(cartTotal))}`}
                                alt="QR Code Pix"
                                className="h-48 w-48 object-contain"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="py-2 border-y border-white/10">
                              <p className="text-xl font-mono font-black text-white">45.890.123/0001-45</p>
                              <p className="text-[10px] font-bold text-white/40 uppercase mt-1">Beneficiário: Pizzaria Ouro Preto</p>
                            </div>
                            
                            <div className="flex items-center gap-2 justify-center bg-gold/5 p-3 rounded-xl border border-gold/20">
                              <AlertCircle className="h-4 w-4 text-gold shrink-0" />
                              <p className="text-[10px] font-black text-gold uppercase leading-tight tracking-wider text-left">
                                Confirme se o recebedor é PIZZARIA OURO PRETO antes de digitar sua senha.
                              </p>
                            </div>
                          </div>

                          <Button 
                            className="bg-gold text-deep-black w-full font-black uppercase tracking-widest h-12"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText('45890123000145');
                              toast.success('Chave PIX copiada!');
                            }}
                          >
                            Copiar Chave CNPJ
                          </Button>
                        </div>
                      )}
                      
                      <p className="font-bold text-gold uppercase text-[10px] tracking-widest text-center">Próximo Passo:</p>
                      <p className="text-center">
                        Para finalizar seu pedido, clique no botão abaixo para nos enviar os detalhes e <span className="text-white font-black underline decoration-gold/50">acertar o pagamento via WhatsApp</span>. 
                      </p>
                      {customerInfo.paymentMethod === 'pix_now' && (
                        <p className="text-[11px] text-white/60 bg-white/5 p-2 rounded-lg text-center italic">
                          💡 Não esqueça de anexar o comprovante do PIX!
                        </p>
                      )}
                    </div>
                    
                    <Button 
                      className="w-full max-w-sm bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest h-16 rounded-2xl shadow-lg shadow-green-600/20 group mt-6"
                      onClick={() => {
                        window.open(whatsappLink || generateWhatsAppLink(lastOrderId || undefined, 'pizzaria'), '_blank');
                      }}
                    >
                      ENVIAR PEDIDO PARA O WHATSAPP <MessageCircle className="ml-2 h-6 w-6 group-hover:scale-110 transition-transform" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Cart Footer */}
              <div className="p-6 border-t border-white/5 bg-deep-black/80 backdrop-blur-xl space-y-4">
                {cart.length > 0 && checkoutStep !== 'confirmation' && (
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        {deliveryFee > 0 && (
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">
                            Entrega: R$ {deliveryFee.toFixed(2)}
                          </p>
                        )}
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Total do Pedido</p>
                        <p className="text-4xl font-black text-gold tracking-tighter">R$ {cartTotal.toFixed(2)}</p>
                      </div>
                      
                      {checkoutStep === 'cart' && (
                        <Button 
                          onClick={() => setCheckoutStep('address')}
                          className="bg-gold hover:bg-gold-dark text-deep-black font-black uppercase tracking-widest h-14 px-8 rounded-full shadow-lg shadow-gold/20 group"
                        >
                          ENTREGA <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      )}

                      {checkoutStep === 'address' && (
                        <Button 
                          disabled={
                            !customerInfo.name || 
                            customerInfo.name.length < 3 ||
                            !customerInfo.phone || 
                            customerInfo.phone.replace(/\D/g, '').length !== 11 ||
                            (deliveryType === 'delivery' && (!customerInfo.street || !customerInfo.number || !customerInfo.neighborhood))
                          }
                          onClick={() => setCheckoutStep('payment')}
                          className="bg-gold hover:bg-gold-dark text-deep-black font-black uppercase tracking-widest h-14 px-8 rounded-full shadow-lg shadow-gold/20 group disabled:opacity-50"
                        >
                          PAGAMENTO <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      )}

                      {checkoutStep === 'payment' && (
                        <Button 
                          disabled={
                            (customerInfo.paymentMethod === 'cash_delivery' && customerInfo.needChange && (!customerInfo.changeFor || parseFloat(customerInfo.changeFor) < cartTotal))
                          }
                          onClick={() => setCheckoutStep('summary')}
                          className="bg-gold hover:bg-gold-dark text-deep-black font-black uppercase tracking-widest h-14 px-8 rounded-full shadow-lg shadow-gold/20 group disabled:opacity-50"
                        >
                          RESUMO <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      )}

                      {checkoutStep === 'summary' && (
                        <Button 
                          disabled={isSubmitting}
                          onClick={handleFinalizeOrder}
                          className="bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest h-14 px-8 rounded-full shadow-lg shadow-green-600/20 group disabled:opacity-50"
                        >
                          {isSubmitting ? 'PROCESSANDO...' : (
                            <>
                              FINALIZAR PEDIDO <MessageCircle className="ml-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {checkoutStep !== 'cart' && (
                      <Button 
                        variant="ghost" 
                        className="w-full text-white/20 hover:text-white text-[10px] font-black uppercase tracking-widest h-8"
                        onClick={() => {
                          if (checkoutStep === 'address') setCheckoutStep('cart');
                          if (checkoutStep === 'payment') setCheckoutStep('address');
                          if (checkoutStep === 'summary') setCheckoutStep('payment');
                        }}
                      >
                        ← VOLTAR
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer id="contact" className="bg-deep-black border-t border-white/10 pt-16 md:pt-20 pb-10">
        <div className="container px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16 mb-16">
            <div className="space-y-6 md:space-y-8">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pizza-red text-white">
                  <PizzaIcon className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-extrabold tracking-tighter text-gold">
                  OURO <span className="text-white">PRETO</span>
                </h2>
              </div>
              <p className="text-white/50 text-sm leading-relaxed max-w-xs">
                A melhor pizzaria de Conselheiro Paulino. Ingredientes selecionados e massa artesanal feita com amor.
              </p>
              <div className="space-y-3">
                <a 
                  href="https://wa.me/5522998487785" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-3 text-sm text-white/70 hover:text-gold transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  (22) 99848-7785
                </a>
                <a 
                  href="tel:22998487785" 
                  className="flex items-center gap-3 text-sm text-white/70 hover:text-gold transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                    <Phone className="h-4 w-4" />
                  </div>
                  (22) 99848-7785
                </a>
                <a 
                  href="https://www.instagram.com/pizzariaelanchoneteouropreto/" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-3 text-sm text-white/70 hover:text-gold transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                    <Instagram className="h-4 w-4" />
                  </div>
                  @pizzariaelanchoneteouropreto
                </a>
              </div>
            </div>

            <div className="space-y-6 md:space-y-8">
              <h4 className="text-xs font-black uppercase tracking-[0.3em] text-gold">Horários</h4>
              <ul className="space-y-4 text-sm font-medium">
                <li className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/40">Segunda</span>
                  <span className="text-pizza-red font-bold uppercase">Fechado</span>
                </li>
                <li className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/40">Terça - Quinta</span>
                  <span>18:00 - 23:30</span>
                </li>
                <li className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/40">Sexta - Sábado</span>
                  <span>18:00 - 00:00</span>
                </li>
                <li className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/40">Domingo</span>
                  <span>18:00 - 23:30</span>
                </li>
              </ul>
            </div>

            <div className="space-y-6 md:space-y-8">
              <h4 className="text-xs font-black uppercase tracking-[0.3em] text-gold">Localização</h4>
              <div className="space-y-6 text-sm">
                <div className="flex gap-4">
                  <MapPin className="h-6 w-6 text-gold shrink-0" />
                  <div className="space-y-3">
                    <span className="text-white/60 leading-relaxed block">Av. dos Ferroviários, 1517 - Conselheiro Paulino, Nova Friburgo - RJ, 28633-010</span>
                    <a 
                      href="https://www.google.com/maps/search/?api=1&query=Av.+dos+Ferroviários,+1517+-+Conselheiro+Paulino,+Nova+Friburgo+-+RJ,+28633-010" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gold hover:text-white transition-colors"
                    >
                      Abrir no Google Maps <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Clock className="h-6 w-6 text-gold shrink-0" />
                  <span className="text-white/60">Entrega rápida em toda a região.</span>
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-white/10 mb-8" />
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-white/20">
            <p>© 2024 Pizzaria Ouro Preto. Sabor que vem do forno.</p>
            <div className="flex gap-8 items-center">
              <button onClick={() => navigate('/admin')} className="hover:text-gold transition-colors">Admin</button>
              <a href="#" className="hover:text-white transition-colors">Privacidade</a>
              <a href="#" className="hover:text-white transition-colors">Termos</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  )}
</div>
  );
}