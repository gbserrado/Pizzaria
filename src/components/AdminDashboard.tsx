import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  Clock, 
  Truck, 
  CheckCircle2, 
  MessageCircle, 
  Power, 
  Settings, 
  Pizza as PizzaIcon,
  Search,
  ChevronRight,
  LogOut,
  Bell,
  MoreVertical,
  Phone,
  MapPin,
  CreditCard,
  QrCode,
  Wallet,
  Utensils,
  ExternalLink,
  History,
  TrendingUp,
  DollarSign,
  Calendar
} from 'lucide-react';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  doc, 
  updateDoc, 
  setDoc, 
  getDoc,
  increment
} from 'firebase/firestore';
import { Order, OrderStatus, PIZZAS, Pizza, StoreConfig } from '../types';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ADMIN_PASSWORD = 'ouropreto123'; // Simple password as requested

  const OrderCard: React.FC<{ order: Order, onUpdateStatus: (id: string, status: OrderStatus, phone?: string) => void | Promise<void> }> = ({ order, onUpdateStatus }) => {
    const [isPanic, setIsPanic] = useState(false);

    useEffect(() => {
      if (order.status !== 'received' || !order.createdAt) {
        setIsPanic(false);
        return;
      }

      const checkPanic = () => {
        let orderTime = 0;
        try {
          if (typeof order.createdAt?.toDate === 'function') {
            orderTime = order.createdAt.toDate().getTime();
          } else if (order.createdAt?.seconds) {
            orderTime = order.createdAt.seconds * 1000;
          } else {
            orderTime = new Date(order.createdAt).getTime();
          }
        } catch (e) {
          orderTime = Date.now();
        }
        orderTime = orderTime || Date.now();
        
        const diffMinutes = (Date.now() - orderTime) / (1000 * 60);
        setIsPanic(diffMinutes > 3);
      };

      checkPanic();
      const interval = setInterval(checkPanic, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }, [order.status, order.createdAt]);

    return (
      <Card className={cn(
        "bg-white/5 border-white/10 text-white hover:border-gold/30 transition-all group overflow-hidden",
        isPanic && "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse"
      )}>
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className={cn("text-[10px] font-black uppercase tracking-widest", isPanic ? "text-red-400" : "text-gold")}>
                #{order.id?.slice(-6)} {isPanic && "⚠️ ATRASADO"}
              </p>
              <h3 className="font-black uppercase italic text-lg">{order.customerName}</h3>
            </div>
            <Badge variant="ghost" className="bg-gold/10 text-gold border border-gold/20 uppercase text-[10px] font-black">
              {order.paymentMethod === 'pix_now' ? 'PIX' : order.paymentMethod === 'card_delivery' ? 'CARTÃO' : 'DINHEIRO'}
            </Badge>
        </div>

        <div className="space-y-2">
          {order.address && (
            <div className="flex items-center gap-2 text-white/60 text-xs">
              <MapPin className="h-3 w-3" />
              <span>{order.address.neighborhood}, {order.address.street} {order.address.number}</span>
            </div>
          )}
          {!order.address && (
            <div className="flex items-center gap-2 text-white/60 text-xs">
              <MapPin className="h-3 w-3" />
              <span>Retirada no Local</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-white/60 text-xs">
            <Phone className="h-3 w-3" />
            <span>{order.phone || 'Sem telefone'}</span>
          </div>
        </div>

        <div className="bg-black/20 rounded-xl p-3 space-y-2">
          {(order.items || []).map((item: any, idx) => {
            if (!item) return null;
            const itemPrice = item.price || item.totalPrice || 0;
            const quantity = item.quantity || 1;
            const unitPrice = itemPrice / quantity;
            
            return (
              <div key={idx} className="flex justify-between items-start text-xs py-2 first:pt-0 last:pb-0 border-b border-white/5 last:border-0">
                <div className="flex flex-col gap-1 w-full mr-4">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center bg-gold text-deep-black font-black w-5 h-5 rounded-md shrink-0 text-[10px]">
                      {quantity}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-black text-white uppercase tracking-tight leading-tight">
                        {item.name2 ? (
                          <span className="flex flex-col">
                            <span className="text-gold tracking-wide text-[9px]">MEIA A MEIA:</span>
                            <span>{item.name} + {item.name2}</span>
                          </span>
                        ) : (
                          item.name || item.pizza?.name || 'Pizza'
                        )}
                      </span>
                      {item.size && (
                        <span className="text-[10px] font-bold text-white/50 uppercase italic group-hover:text-gold transition-colors">
                          Tamanho: {item.size}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pl-7 space-y-1">
                    {item.extras && item.extras.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.extras.map((extra: string, eIdx: number) => (
                          <span key={eIdx} className="bg-white/10 text-white/60 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
                            + {extra}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div className="text-[9px] text-white/30 font-medium flex items-center gap-2">
                      <span className="bg-white/5 px-1 rounded uppercase tracking-tighter">Unitário: R$ {unitPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0 pt-0.5">
                  <span className="text-gold font-black text-sm">R$ {itemPrice.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
          
          <div className="space-y-1 pt-2 border-t border-white/5">
            {order.deliveryFee > 0 && (
              <div className="flex justify-between text-[11px]">
                <span className="text-white/60">Taxa de Entrega</span>
                <span className="text-white/80 font-bold">R$ {order.deliveryFee.toFixed(2)}</span>
              </div>
            )}

            {order.discount > 0 && (
              <div className="flex justify-between text-[11px] text-red-400">
                <span>Desconto ({order.couponCode})</span>
                <span className="font-bold">- R$ {order.discount.toFixed(2)}</span>
              </div>
            )}

            <div className="pt-1 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase text-white/40">Total</span>
              <span className="text-lg font-black text-gold">R$ {(order.total || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            className={cn(
              "flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] font-black uppercase h-10 transition-all",
              (order.status === 'completed' || order.status === 'cancelled') ? "w-full" : ""
            )}
            onClick={() => {
              const msg = `Olá ${order.customerName || ''}, aqui é da Pizzaria Ouro Preto! Recebemos seu pedido #${order.id?.slice(-6)} pelo site, mas ainda não confirmamos o pagamento. Como você prefere pagar para seguirmos com o preparo?`;
              window.open(`https://wa.me/55${(order.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
            }}
          >
            <MessageCircle className="h-4 w-4 mr-2 text-green-500" />
            WhatsApp
          </Button>
          
          {order.status === 'received' && (
            <Button 
              size="sm"
              className={cn("flex-1 text-[10px] font-black uppercase h-10", isPanic ? "bg-red-600 hover:bg-red-700 text-white" : "bg-gold hover:bg-gold-dark text-deep-black")}
              onClick={() => onUpdateStatus(order.id!, 'cooking')}
            >
              Produzir
            </Button>
          )}
          
          {order.status === 'cooking' && (
            <Button 
              size="sm"
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-black uppercase h-10"
              onClick={() => onUpdateStatus(order.id!, 'delivery')}
            >
              Entregar
            </Button>
          )}

          {order.status === 'delivery' && (
            <Button 
              size="sm"
              className="flex-1 bg-green-500 hover:bg-green-600 text-white text-[10px] font-black uppercase h-10"
              onClick={() => onUpdateStatus(order.id!, 'completed', order.phone)}
            >
              Concluir
            </Button>
          ) /* Fixed structure */}
        </div>
      </div>
    </Card>
  );
};

export default function AdminDashboard({ storeConfig, menuStatus }: { storeConfig: StoreConfig, menuStatus: Record<string, boolean> }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);
  const previousOrdersCount = useRef<number>(0);

  useEffect(() => {
    // Only play alarm if it's an actual increase in active orders
    const activeOrders = orders.filter(o => o.status === 'received');
    if (activeOrders.length > previousOrdersCount.current) {
      if (alarmAudioRef.current) {
        alarmAudioRef.current.play().catch(e => console.log('Audio play blocked:', e));
      }
    }
    previousOrdersCount.current = activeOrders.length;
  }, [orders]);
  const [activeTab, setActiveTab] = useState<'orders' | 'kitchen' | 'history' | 'finance' | 'menu' | 'settings'>('orders');
  const audioRef = useRef<HTMLAudioElement>(null);
  const ordersRef = useRef<Order[]>([]);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    if (isAuthenticated) {
      const initConfig = async () => {
        try {
          const configDoc = await getDoc(doc(db, 'config', 'store'));
          if (!configDoc.exists()) {
            await setDoc(doc(db, 'config', 'store'), { lojaAberta: true });
          }
        } catch (e) {
          console.error("Initialization error:", e);
        }
      };
      initConfig();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user && user.email === 'Gabriel06nf@gmail.com') {
        // If Gabriel is logged in, we still want the password for the local session
        // but we don't need to sign in into another account.
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Listen to orders
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(q, (snapshot) => {
      const newOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      
      // Check for new 'received' orders to play sound
      const hasNewReceived = newOrders.some(order => 
        order.status === 'received' && 
        !ordersRef.current.find(o => o.id === order.id)
      );

      if (hasNewReceived && audioRef.current) {
        audioRef.current.play().catch(e => console.log('Audio play failed:', e));
      }

      setOrders(newOrders);
    }, (error) => {
      console.error('Admin Orders Error:', error);
      toast.error('Erro ao carregar pedidos. Verifique suas permissões.');
    });

    return () => {
      unsubscribeOrders();
    };
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      // Check if current user is already an admin
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.email === 'Gabriel06nf@gmail.com') {
        setIsAuthenticated(true);
        toast.success('Acesso concedido (Admin Gabriel)!');
        return;
      }

      try {
        await signInWithEmailAndPassword(auth, "admin@ouropreto.com", ADMIN_PASSWORD);
        setIsAuthenticated(true);
        toast.success('Acesso concedido!');
      } catch (error: any) {
        console.error('Firebase Auth Error:', error.code, error.message);
        
        if (error.code === 'auth/operation-not-allowed') {
          toast.error('Erro: Provedor de E-mail/Senha desativado no Firebase. Ative-o no console.');
          // As a fallback for development, if password is correct, we might allow it
          // BUT Firestore calls will fail if not authenticated as admin in rules
          setIsAuthenticated(true);
          return;
        }

        if (error.code === 'auth/user-not-found' || error.message.includes('user-not-found') || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
          try {
            await createUserWithEmailAndPassword(auth, "admin@ouropreto.com", ADMIN_PASSWORD);
            setIsAuthenticated(true);
            toast.success('Acesso concedido (Novo Admin)!');
          } catch (createError: any) {
            console.error('Firebase Create Error:', createError.code, createError.message);
            if (createError.code === 'auth/email-already-in-use') {
               toast.error('Senha incorreta para o usuário admin do banco de dados.');
            } else {
               toast.error(`Erro de permissão: ${createError.message}`);
            }
          }
        } else {
          toast.error(`Erro de banco de dados: ${error.code || 'Desconhecido'}`);
        }
      }
    } else {
      toast.error('Senha incorreta!');
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus, customerPhone?: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      
      // If completed, increment loyalty points
      if (newStatus === 'completed' && customerPhone) {
        const loyaltyRef = doc(db, 'loyalty', customerPhone);
        const loyaltyDoc = await getDoc(loyaltyRef);
        if (loyaltyDoc.exists()) {
          await updateDoc(loyaltyRef, { points: increment(1) });
        } else {
          await setDoc(loyaltyRef, { phone: customerPhone, points: 1 });
        }
      }
      
      toast.success(`Status atualizado para: ${newStatus}`);
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const togglePizzaAvailability = async (pizzaId: string, currentStatus: boolean) => {
    try {
      await setDoc(doc(db, 'menu', pizzaId), { available: !currentStatus }, { merge: true });
      toast.success('Disponibilidade atualizada!');
    } catch (error) {
      toast.error('Erro ao atualizar cardápio');
    }
  };

  const toggleStore = async () => {
    try {
      await updateDoc(doc(db, 'config', 'store'), { lojaAberta: !storeConfig.lojaAberta });
      toast.success(storeConfig.lojaAberta ? 'Loja Fechada' : 'Loja Aberta');
    } catch (error) {
      toast.error('Erro ao atualizar status da loja');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-deep-black flex items-center justify-center p-4">
        <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" />
        <Card className="w-full max-w-md bg-graphite border-white/10 text-white">
          <CardHeader className="text-center space-y-1">
            <div className="mx-auto bg-gold/20 p-3 rounded-2xl w-fit mb-4">
              <Settings className="h-8 w-8 text-gold animate-spin-slow" />
            </div>
            <CardTitle className="text-2xl font-black uppercase italic">Painel Admin</CardTitle>
            <CardDescription className="text-white/40">Acesso restrito à gerência</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Senha de Acesso</Label>
                <Input 
                  id="password"
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-zinc-900 border-white/20 text-white placeholder:text-zinc-500 h-12 placeholder:opacity-100"
                  placeholder="Digite a senha..."
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full bg-gold hover:bg-gold-dark text-deep-black font-black h-12 uppercase tracking-widest">
                Entrar no Sistema
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => window.location.href = '/'}
                className="w-full border border-white/10 hover:bg-white/5 text-white/60 hover:text-white h-12 font-bold transition-all"
              >
                Voltar ao Site
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // const OrderCard = ({ order }: { order: Order }) => (
  //   <Card className="bg-white/5 border-white/10 text-white hover:border-gold/30 transition-all group overflow-hidden">
  //     <div className="p-4 space-y-4">
  //       <div className="flex justify-between items-start">
  //         <div className="space-y-1">
  //           <p className="text-[10px] font-black text-gold uppercase tracking-widest">#{order.id?.slice(-6)}</p>
  //           <h3 className="font-black uppercase italic text-lg">{order.customerName}</h3>
  //         </div>
  //         <Badge variant="outline" className="bg-gold/10 text-gold border-gold/20 uppercase text-[10px] font-black">
  //           {order.paymentMethod === 'pix_now' ? 'PIX' : order.paymentMethod === 'card_delivery' ? 'CARTÃO' : 'DINHEIRO'}
  //         </Badge>
  //       </div>

  //       <div className="space-y-2">
  //         <div className="flex items-center gap-2 text-white/60 text-xs">
  //           <MapPin className="h-3 w-3" />
  //           <span>{order.address.neighborhood}, {order.address.street} {order.address.number}</span>
  //         </div>
  //         <div className="flex items-center gap-2 text-white/60 text-xs">
  //           <Phone className="h-3 w-3" />
  //           <span>{order.phone}</span>
  //         </div>
  //       </div>

  //       <div className="bg-black/20 rounded-xl p-3 space-y-2">
  //         {order.items.map((item, idx) => (
  //           <div key={idx} className="flex justify-between text-xs">
  //             <span className="font-bold text-white/80">{item.quantity}x {item.pizza.name} {item.size && `(${item.size})`}</span>
  //             <span className="text-gold font-black">R$ {item.totalPrice.toFixed(2)}</span>
  //           </div>
  //         ))}
  //         <div className="pt-2 border-t border-white/5 flex justify-between items-center">
  //           <span className="text-[10px] font-black uppercase text-white/40">Total</span>
  //           <span className="text-lg font-black text-gold">R$ {order.total.toFixed(2)}</span>
  //         </div>
  //       </div>

  //       <div className="grid grid-cols-2 gap-2">
  //         <Button 
  //           variant="outline" 
  //           size="sm"
  //           className="border-white/10 hover:bg-white/10 text-white text-[10px] font-black uppercase"
  //           onClick={() => {
  //             const msg = `Olá ${order.customerName}, aqui é da Pizzaria Ouro Preto! Recebemos seu pedido #${order.id?.slice(-6)} pelo site, mas ainda não confirmamos o pagamento. Como você prefere pagar para seguirmos com o preparo?`;
  //             window.open(`https://wa.me/55${order.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  //           }}
  //         >
  //           <MessageCircle className="h-3 w-3 mr-2 text-green-500" />
  //           WhatsApp
  //         </Button>
          
  //         {order.status === 'received' && (
  //           <Button 
  //             size="sm"
  //             className="bg-gold hover:bg-gold-dark text-deep-black text-[10px] font-black uppercase"
  //             onClick={() => updateOrderStatus(order.id!, 'cooking')}
  //           >
  //             Produzir
  //           </Button>
  //         )}
          
  //         {order.status === 'cooking' && (
  //           <Button 
  //             size="sm"
  //             className="bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-black uppercase"
  //             onClick={() => updateOrderStatus(order.id!, 'delivery')}
  //           >
  //             Entregar
  //           </Button>
  //         )}

  //         {order.status === 'delivery' && (
  //           <Button 
  //             size="sm"
  //             className="bg-green-500 hover:bg-green-600 text-white text-[10px] font-black uppercase"
  //             onClick={() => updateOrderStatus(order.id!, 'completed', order.phone)}
  //           >
  //             Concluir
  //           </Button>
  //         )}
  //       </div>
  //     </div>
  //   </Card>
  // );

  return (
    <div className="min-h-screen bg-deep-black text-white font-sans">
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" />
      
      {/* Sidebar / Nav */}
      <div className="fixed left-0 top-0 bottom-0 w-20 bg-graphite border-r border-white/10 flex flex-col items-center py-8 gap-8 z-50">
        <div className="bg-gold p-3 rounded-2xl shadow-lg shadow-gold/20">
          <PizzaIcon className="h-6 w-6 text-deep-black" />
        </div>
        
        <nav className="flex flex-col gap-4">
          <button 
            onClick={() => setActiveTab('orders')}
            className={cn("p-3 rounded-xl transition-all", activeTab === 'orders' ? "bg-gold text-deep-black" : "text-white/40 hover:text-white hover:bg-white/5")}
          >
            <ShoppingBag className="h-6 w-6" />
          </button>
          <button 
            onClick={() => setActiveTab('kitchen')}
            className={cn("p-3 rounded-xl transition-all", activeTab === 'kitchen' ? "bg-gold text-deep-black" : "text-white/40 hover:text-white hover:bg-white/5")}
            title="Cozinha"
          >
            <Utensils className="h-6 w-6" />
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn("p-3 rounded-xl transition-all", activeTab === 'history' ? "bg-gold text-deep-black" : "text-white/40 hover:text-white hover:bg-white/5")}
            title="Histórico de Pedidos"
          >
            <History className="h-6 w-6" />
          </button>
          <button 
            onClick={() => setActiveTab('finance')}
            className={cn("p-3 rounded-xl transition-all", activeTab === 'finance' ? "bg-gold text-deep-black" : "text-white/40 hover:text-white hover:bg-white/5")}
            title="Financeiro"
          >
            <DollarSign className="h-6 w-6" />
          </button>
          <button 
            onClick={() => setActiveTab('menu')}
            className={cn("p-3 rounded-xl transition-all", activeTab === 'menu' ? "bg-gold text-deep-black" : "text-white/40 hover:text-white hover:bg-white/5")}
          >
            <PizzaIcon className="h-6 w-6" />
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn("p-3 rounded-xl transition-all", activeTab === 'settings' ? "bg-gold text-deep-black" : "text-white/40 hover:text-white hover:bg-white/5")}
          >
            <Settings className="h-6 w-6" />
          </button>
        </nav>

        <div className="mt-auto flex flex-col gap-4">
          <button 
            onClick={() => window.location.href = '/'}
            className="p-3 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all"
            title="Voltar ao Site"
          >
            <ExternalLink className="h-6 w-6" />
          </button>
          <button 
            onClick={() => setIsAuthenticated(false)}
            className="p-3 rounded-xl text-white/40 hover:text-red-500 hover:bg-red-500/10 transition-all"
            title="Sair"
          >
            <LogOut className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="pl-20 min-h-screen">
        <header className="h-20 border-b border-white/10 bg-graphite/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">
              {activeTab === 'orders' ? 'Gestão de Pedidos' : 
               activeTab === 'kitchen' ? 'Visão da Cozinha' : 
               activeTab === 'history' ? 'Histórico de Pedidos' :
               activeTab === 'finance' ? 'Informações Financeiras' :
               activeTab === 'menu' ? 'Cardápio' : 'Configurações'}
            </h1>
            <Badge variant="ghost" className={cn("uppercase text-[10px] font-black border", storeConfig.lojaAberta ? "text-green-500 border-green-500/20 bg-green-500/10" : "text-red-500 border-red-500/20 bg-red-500/10")}>
              {storeConfig.lojaAberta ? 'Loja Aberta' : 'Loja Fechada'}
            </Badge>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <span className="text-[10px] font-black uppercase text-white/40">Status da Loja</span>
              <Switch checked={storeConfig.lojaAberta} onCheckedChange={toggleStore} />
            </div>
            <div className="h-10 w-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
              <Bell className="h-5 w-5 text-gold" />
            </div>
          </div>
        </header>

        <div className="p-8">
          {activeTab === 'orders' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Column: Received */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-gold animate-pulse" />
                    Novos ({orders.filter(o => o.status === 'received').length})
                  </h2>
                </div>
                <div className="space-y-4">
                  {orders.filter(o => o.status === 'received').map((order: Order) => (
                    <OrderCard key={order.id} order={order} onUpdateStatus={updateOrderStatus} />
                  ))}
                  {orders.filter(o => o.status === 'received').length === 0 && (
                    <div className="h-40 border-2 border-dashed border-white/5 rounded-3xl flex items-center justify-center text-white/20 font-bold uppercase text-xs">
                      Nenhum pedido novo
                    </div>
                  )}
                </div>
              </div>

              {/* Column: Cooking */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    Preparando ({orders.filter(o => o.status === 'cooking').length})
                  </h2>
                </div>
                <div className="space-y-4">
                  {orders.filter(o => o.status === 'cooking').map((order: Order) => (
                    <OrderCard key={order.id} order={order} onUpdateStatus={updateOrderStatus} />
                  ))}
                </div>
              </div>

              {/* Column: Delivery */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    Entregando ({orders.filter(o => o.status === 'delivery').length})
                  </h2>
                </div>
                <div className="space-y-4">
                  {orders.filter(o => o.status === 'delivery').map((order: Order) => (
                    <OrderCard key={order.id} order={order} onUpdateStatus={updateOrderStatus} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'kitchen' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {orders.filter(o => o.status === 'cooking').map(order => (
                <Card key={order.id} className="bg-white/5 border-white/10 text-white overflow-hidden">
                  <div className="bg-gold text-deep-black p-4 text-center">
                    <h2 className="text-4xl font-black uppercase tracking-tighter">#{order.id?.slice(-6)}</h2>
                    <p className="text-sm font-bold uppercase">{order.customerName}</p>
                  </div>
                  <div className="p-6 space-y-6">
                    {(order.items || []).map((item, idx) => {
                      if (!item) return null;
                      return (
                      <div key={idx} className="space-y-2 border-b border-white/10 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-start gap-4">
                          <span className="text-4xl font-black text-gold">{item.quantity || 1}x</span>
                          <div>
                            <h3 className="text-2xl font-black uppercase leading-tight">
                              {item.name2 ? (
                                <span className="flex flex-col">
                                  <span className="text-deep-black bg-deep-black/10 px-1 rounded w-fit text-[12px] mb-1">MEIA A MEIA</span>
                                  <span>{item.name} + {item.name2}</span>
                                </span>
                              ) : (item.name || item.pizza?.name || 'Pizza')}
                            </h3>
                            {item.size && <p className="text-xl text-white/60 font-bold uppercase mt-1">Tamanho: {item.size}</p>}
                          </div>
                        </div>
                        {(item.extras || []).length > 0 && (
                          <div className="bg-red-500/20 border border-red-500/50 p-3 rounded-xl mt-4">
                            <p className="text-sm font-black text-red-400 uppercase mb-1">Adicionais:</p>
                            <ul className="list-disc list-inside text-lg font-bold text-white">
                              {(item.extras || []).map((extra, i) => <li key={i}>{extra}</li>)}
                            </ul>
                          </div>
                        )}
                        {order.observations && (
                          <div className="bg-blue-500/20 border border-blue-500/50 p-3 rounded-xl mt-4">
                            <p className="text-sm font-black text-blue-400 uppercase mb-1">OBSERVAÇÃO:</p>
                            <p className="text-lg font-bold text-white uppercase">{order.observations}</p>
                          </div>
                        )}
                      </div>
                    )})}
                  </div>
                  <div className="p-4 bg-black/40 border-t border-white/10">
                    <Button 
                      className="w-full h-16 text-xl bg-blue-500 hover:bg-blue-600 text-white font-black uppercase tracking-widest"
                      onClick={() => updateOrderStatus(order.id!, 'delivery')}
                    >
                      PRONTO PARA ENTREGA
                    </Button>
                  </div>
                </Card>
              ))}
              {orders.filter(o => o.status === 'cooking').length === 0 && (
                <div className="col-span-full py-20 text-center text-white/40">
                  <Utensils className="h-24 w-24 mx-auto mb-6 opacity-20" />
                  <h2 className="text-3xl font-black uppercase tracking-widest">Nenhum pedido na cozinha</h2>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black uppercase italic tracking-tight">Pedidos Recentes</h2>
                <div className="flex gap-2">
                  <Badge variant="ghost" className="bg-green-500/10 text-green-500 border border-green-500/20">
                    {orders.filter(o => o.status === 'completed').length} Concluídos
                  </Badge>
                  <Badge variant="ghost" className="bg-red-500/10 text-red-500 border border-red-500/20">
                    {orders.filter(o => o.status === 'cancelled').length} Cancelados
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {orders.filter(o => o.status === 'completed' || o.status === 'cancelled').map((order: Order) => (
                  <OrderCard key={order.id} order={order} onUpdateStatus={updateOrderStatus} />
                ))}
                {orders.filter(o => o.status === 'completed' || o.status === 'cancelled').length === 0 && (
                  <div className="col-span-full py-20 text-center text-white/40">
                    <History className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-xs">Nenhum pedido no histórico ainda</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-8">
              {/* Financial Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-white/5 border-white/10 text-white overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <TrendingUp className="h-12 w-12 text-gold" />
                  </div>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-white/40 font-black uppercase text-[10px] tracking-widest">Faturamento Total</CardDescription>
                    <CardTitle className="text-3xl font-black text-gold">
                      R$ {orders.filter(o => o.status === 'completed').reduce((acc, o) => acc + (o.total || 0), 0).toFixed(2)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[10px] text-white/40 font-bold uppercase">{orders.filter(o => o.status === 'completed').length} pedidos finalizados</p>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 text-white overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-white/40 font-black uppercase text-[10px] tracking-widest">Ticket Médio</CardDescription>
                    <CardTitle className="text-3xl font-black text-white">
                      R$ {orders.filter(o => o.status === 'completed').length > 0 
                        ? (orders.filter(o => o.status === 'completed').reduce((acc, o) => acc + (o.total || 0), 0) / orders.filter(o => o.status === 'completed').length).toFixed(2)
                        : '0.00'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[10px] text-white/40 font-bold uppercase">Média por pedido</p>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 text-white overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-white/40 font-black uppercase text-[10px] tracking-widest">Pedidos Hoje</CardDescription>
                    <CardTitle className="text-3xl font-black text-white">
                      {orders.filter(o => {
                        const today = new Date().setHours(0,0,0,0);
                        const orderDate = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000).setHours(0,0,0,0) : new Date(o.createdAt).setHours(0,0,0,0);
                        return orderDate === today;
                      }).length}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <span className="text-[9px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded font-black">
                        {orders.filter(o => {
                          const today = new Date().setHours(0,0,0,0);
                          const orderDate = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000).setHours(0,0,0,0) : new Date(o.createdAt).setHours(0,0,0,0);
                          return orderDate === today && o.status === 'completed';
                        }).length} OK
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 text-white overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-white/40 font-black uppercase text-[10px] tracking-widest">Cancelamentos</CardDescription>
                    <CardTitle className="text-3xl font-black text-red-400">
                      {orders.filter(o => o.status === 'cancelled').length}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[10px] text-white/40 font-bold uppercase">Pedidos não finalizados</p>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-white/5 border-white/10 text-white">
                  <CardHeader>
                    <CardTitle className="text-lg font-black uppercase italic tracking-tight">Métodos de Pagamento</CardTitle>
                    <CardDescription>Distribuição do faturamento por forma de pagamento</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { label: 'PIX', key: 'pix_now', color: 'bg-gold', icon: QrCode },
                      { label: 'Cartão', key: 'card_delivery', color: 'bg-blue-500', icon: CreditCard },
                      { label: 'Dinheiro', key: 'cash_delivery', color: 'bg-green-500', icon: Wallet }
                    ].map((method) => {
                      const methodOrders = orders.filter(o => o.status === 'completed' && o.paymentMethod === method.key);
                      const methodTotal = methodOrders.reduce((acc, o) => acc + (o.total || 0), 0);
                      const totalRevenue = orders.filter(o => o.status === 'completed').reduce((acc, o) => acc + (o.total || 0), 0);
                      const percentage = totalRevenue > 0 ? (methodTotal / totalRevenue) * 100 : 0;
                      
                      return (
                        <div key={method.key} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className={cn("p-1.5 rounded-lg", method.color + "/20")}>
                                <method.icon className={cn("h-4 w-4", "text-" + method.color.split('-')[1] + "-500")} />
                              </div>
                              <span className="text-sm font-black uppercase tracking-tight">{method.label}</span>
                            </div>
                            <span className="text-sm font-black text-white">R$ {methodTotal.toFixed(2)}</span>
                          </div>
                          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              className={cn("h-full", method.color)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 text-white">
                  <CardHeader>
                    <CardTitle className="text-lg font-black uppercase italic tracking-tight">Delivery vs Balcão</CardTitle>
                    <CardDescription>Origem dos pedidos concluídos</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { label: 'Entrega (Delivery)', key: 'delivery', color: 'bg-gold', icon: Truck },
                      { label: 'Retirada (Pickup)', key: 'pickup', color: 'bg-white', icon: ShoppingBag }
                    ].map((type) => {
                      const typeOrders = orders.filter(o => o.status === 'completed' && o.deliveryType === type.key);
                      const typeTotal = typeOrders.reduce((acc, o) => acc + (o.total || 0), 0);
                      const totalRevenue = orders.filter(o => o.status === 'completed').reduce((acc, o) => acc + (o.total || 0), 0);
                      const percentage = totalRevenue > 0 ? (typeTotal / totalRevenue) * 100 : 0;
                      
                      return (
                        <div key={type.key} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className={cn("p-1.5 rounded-lg", type.color + "/20")}>
                                <type.icon className={cn("h-4 w-4", type.color === 'bg-white' ? "text-white" : "text-gold")} />
                              </div>
                              <span className="text-sm font-black uppercase tracking-tight">{type.label}</span>
                            </div>
                            <span className="text-sm font-black text-white">{typeOrders.length} pedidos</span>
                          </div>
                          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              className={cn("h-full", type.color)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {PIZZAS.map(pizza => (
                <Card key={pizza.id} className="bg-white/5 border-white/10 text-white overflow-hidden">
                  <div className="aspect-video relative">
                    <img src={pizza.image} alt={pizza.name} className="w-full h-full object-cover opacity-60" />
                    <div className="absolute top-2 right-2">
                      <Switch 
                        checked={menuStatus[pizza.id] !== false} 
                        onCheckedChange={() => togglePizzaAvailability(pizza.id, menuStatus[pizza.id] !== false)} 
                      />
                    </div>
                  </div>
                  <CardHeader className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-sm font-black uppercase italic leading-none">{pizza.name}</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-white/40">{pizza.category}</CardDescription>
                      </div>
                      <Badge variant="ghost" className={cn("text-[9px] font-black tracking-tighter border", menuStatus[pizza.id] !== false ? "text-green-500 border-green-500/30 bg-green-500/5" : "text-red-500 border-red-500/30 bg-red-500/5")}>
                        {menuStatus[pizza.id] !== false ? 'DISPONÍVEL' : 'ESGOTADO'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-[10px] text-white/60 line-clamp-2 leading-tight">
                        {pizza.description}
                      </p>
                      <p className="text-gold font-black text-sm">
                        R$ {pizza.basePrice.toFixed(2)}
                      </p>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-8">
              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="uppercase italic font-black">Configurações Gerais</CardTitle>
                  <CardDescription>Gerencie o funcionamento da sua pizzaria</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="space-y-1">
                      <p className="font-bold uppercase text-sm">Status da Loja</p>
                      <p className="text-xs text-white/40">Ative ou desative o recebimento de pedidos no site</p>
                    </div>
                    <Switch checked={storeConfig.lojaAberta} onCheckedChange={toggleStore} />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="space-y-1">
                      <p className="font-bold uppercase text-sm">Notificações Sonoras</p>
                      <p className="text-xs text-white/40">Tocar alerta quando chegar novo pedido</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
